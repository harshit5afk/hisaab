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
        include: { customer: { select: { id: true, name: true, phone: true } } },
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
        name: i.name.trim(),
        hsn: i.hsn?.trim() || '',
        qty,
        rate,
        total: Math.round(qty * rate * 100) / 100,
      };
    });

    // Server-side amount calculation from items — avoids client/server mismatch
    const amount = sanitizedItems.reduce((sum, item) => {
      return sum + Math.round(item.qty * item.rate * 100); // convert to paise
    }, 0);

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
        description,
        items: sanitizedItems as any,
      },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findOne(id);

    // Prevent modifying core financial fields of a PAID invoice
    if (
      invoice.status === 'PAID' &&
      (dto.amount !== undefined || dto.date || dto.description !== undefined || dto.items)
    ) {
      throw new BadRequestException(
        'Cannot edit amount, date, description, or items of a paid invoice',
      );
    }

    let updateAmount = dto.amount;
    let sanitizedItems = undefined;
    if (dto.items && dto.items.length > 0) {
      sanitizedItems = dto.items.map((i) => {
        const qty = Number(i.qty);
        const rate = Number(i.rate);
        return {
          name: i.name.trim(),
          hsn: i.hsn?.trim() || '',
          qty,
          rate,
          total: Math.round(qty * rate * 100) / 100,
        };
      });
      // Always recalculate amount from updated items to maintain consistency
      updateAmount = sanitizedItems.reduce(
        (sum, item) => sum + Math.round(item.qty * item.rate * 100),
        0,
      );
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.date && { date: new Date(dto.date) }),
        ...(updateAmount !== undefined && { amount: updateAmount }),
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
      // Upsert sequence (create on first use)
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
