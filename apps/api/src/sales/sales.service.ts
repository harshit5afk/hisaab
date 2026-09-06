import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    filters: {
      customerId?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
    page = 1,
    limit = 20,
  ) {
    const where: any = { deletedAt: null };
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.status) where.status = filters.status as any;
    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { customer: { select: { id: true, name: true, phone: true, state: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        payments: { where: { deletedAt: null } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async create(dto: CreateInvoiceDto, userId?: string) {
    let customerId = dto.customerId;

    if (!customerId && dto.customerName?.trim()) {
      if (!userId) {
        throw new UnauthorizedException('User authentication required to create customer');
      }

      const trimmedName = dto.customerName.trim();
      let customer = await this.prisma.customer.findFirst({
        where: {
          name: trimmedName,
          deletedAt: null,
        },
      });

      if (!customer) {
        customer = await this.prisma.customer.create({
          data: {
            name: trimmedName,
            phone: dto.customerPhone || null,
            address: dto.customerAddress || null,
            gstin: dto.customerGstin || null,
            state: dto.customerState || null,
            createdBy: userId,
          },
        });
      }
      customerId = customer.id;
    }

    if (!customerId) {
      throw new BadRequestException('Customer is required (please select or enter customer name)');
    }

    // Verify customer exists
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer) throw new BadRequestException('Customer not found');

    // Generate invoice number atomically
    const invoiceNo = await this.generateInvoiceNumber();

    // Sanitize items and force verified line totals (qty * rate)
    const sanitizedItems = dto.items.map((i) => {
      const qty = Number(i.qty);
      const rate = Number(i.rate);
      return {
        productId: i.productId?.trim() || undefined,
        name: i.name.trim(),
        hsn: i.hsn?.trim() || '',
        qty,
        rate,
        total: Math.round(qty * rate * 100) / 100,
      };
    });

    // Server-side subtotal calculation from items (in paise)
    const amount = sanitizedItems.reduce((sum, item) => {
      return sum + Math.round(item.qty * item.rate * 100);
    }, 0);

    // GST calculations
    const isGstInvoice = Boolean(dto.isGstInvoice);
    const taxRate = isGstInvoice ? (dto.taxRate !== undefined ? Number(dto.taxRate) : 18) : 0;
    const otherAmount = dto.otherAmount ? Math.max(0, Math.round(Number(dto.otherAmount))) : 0;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isGstInvoice && taxRate > 0) {
      const businessState = (process.env.BUSINESS_STATE || 'RAJASTHAN').trim().toUpperCase();
      const customerState = (customer.state || '').trim().toUpperCase();
      const isSameState = !customerState || customerState === businessState;
      const totalTax = Math.round((amount * taxRate) / 100);

      if (isSameState) {
        cgst = Math.round(totalTax / 2);
        sgst = totalTax - cgst; // exact reconciliation prevents 1-paisa rounding errors
      } else {
        igst = totalTax;
      }
    }

    const totalAmount = amount + cgst + sgst + igst + otherAmount;

    const description =
      dto.description ||
      (sanitizedItems.length > 0
        ? sanitizedItems.map((i) => i.name).filter(Boolean).join(', ')
        : null);

    return this.prisma.invoice.create({
      data: {
        invoiceNo,
        customerId,
        date: new Date(dto.date),
        amount,
        isGstInvoice,
        taxRate: isGstInvoice ? taxRate : null,
        cgst,
        sgst,
        igst,
        otherAmount,
        totalAmount,
        description,
        items: sanitizedItems as any,
      },
      include: { customer: { select: { id: true, name: true, phone: true, state: true } } },
    });
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findOne(id);

    // Prevent modifying core financial fields of a PAID invoice
    if (
      invoice.status === 'PAID' &&
      (dto.amount !== undefined ||
        dto.date ||
        dto.description !== undefined ||
        dto.items ||
        dto.isGstInvoice !== undefined ||
        dto.taxRate !== undefined ||
        dto.otherAmount !== undefined)
    ) {
      throw new BadRequestException(
        'Cannot edit financial details, date, description, items or taxes of a paid invoice',
      );
    }

    let updateAmount = invoice.amount;
    let sanitizedItems = undefined;

    if (dto.items && dto.items.length > 0) {
      sanitizedItems = dto.items.map((i) => {
        const qty = Number(i.qty);
        const rate = Number(i.rate);
        return {
          productId: i.productId?.trim() || undefined,
          name: i.name.trim(),
          hsn: i.hsn?.trim() || '',
          qty,
          rate,
          total: Math.round(qty * rate * 100) / 100,
        };
      });
      updateAmount = sanitizedItems.reduce(
        (sum, item) => sum + Math.round(item.qty * item.rate * 100),
        0,
      );
    } else if (dto.amount !== undefined) {
      updateAmount = dto.amount;
    }

    const isGstInvoice =
      dto.isGstInvoice !== undefined ? Boolean(dto.isGstInvoice) : invoice.isGstInvoice;
    const taxRate =
      dto.taxRate !== undefined
        ? Number(dto.taxRate)
        : (invoice.taxRate ?? (isGstInvoice ? 18 : 0));
    const otherAmount =
      dto.otherAmount !== undefined ? Math.round(Number(dto.otherAmount)) : invoice.otherAmount;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isGstInvoice && taxRate > 0) {
      const businessState = (process.env.BUSINESS_STATE || 'RAJASTHAN').trim().toUpperCase();
      const customerState = (invoice.customer?.state || '').trim().toUpperCase();
      const isSameState = !customerState || customerState === businessState;
      const totalTax = Math.round((updateAmount * taxRate) / 100);

      if (isSameState) {
        cgst = Math.round(totalTax / 2);
        sgst = totalTax - cgst;
      } else {
        igst = totalTax;
      }
    }

    const totalAmount = updateAmount + cgst + sgst + igst + otherAmount;

    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.date && { date: new Date(dto.date) }),
        amount: updateAmount,
        isGstInvoice,
        taxRate: isGstInvoice ? taxRate : null,
        cgst,
        sgst,
        igst,
        otherAmount,
        totalAmount,
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status && { status: dto.status }),
        ...(sanitizedItems && { items: sanitizedItems as any }),
      },
    });
  }

  async remove(id: string) {
    const invoice = await this.findOne(id);
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Can only delete draft invoices');
    }
    return this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Atomic invoice number generation using a sequence table.
   * Format: INV/YY-YY/0001
   */
  private async generateInvoiceNumber(): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const seq = await tx.sequence.upsert({
        where: { id: 'invoice_seq' },
        update: { current: { increment: 1 } },
        create: { id: 'invoice_seq', current: 1 },
      });

      const fy = this.getFiscalYear();
      return `INV/${fy}/${String(seq.current).padStart(4, '0')}`;
    });
  }

  /** Returns current Indian fiscal year, e.g. "26-27" */
  private getFiscalYear(): string {
    const now = new Date();
    const year = now.getFullYear() % 100; // 2026 → 26
    const month = now.getMonth(); // 0-indexed, April = 3
    if (month >= 3) {
      return `${year}-${year + 1}`;
    }
    return `${year - 1}-${year}`;
  }
}
