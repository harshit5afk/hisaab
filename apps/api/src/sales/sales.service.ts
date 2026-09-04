import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
    const where: any = {};
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.status) where.status = filters.status;
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
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        payments: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async create(dto: CreateInvoiceDto) {
    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) throw new BadRequestException('Customer not found');

    // Generate invoice number atomically
    const invoiceNo = await this.generateInvoiceNumber();

    return this.prisma.invoice.create({
      data: {
        invoiceNo,
        customerId: dto.customerId,
        date: new Date(dto.date),
        amount: dto.amount,
        description: dto.description,
      },
      include: { customer: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findOne(id);

    // Don't allow editing paid invoices (except status changes)
    if (
      invoice.status === 'PAID' &&
      dto.status !== 'PAID' &&
      (dto.amount || dto.date || dto.description)
    ) {
      throw new BadRequestException('Cannot edit a paid invoice');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.amount && { amount: dto.amount }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  async remove(id: string) {
    const invoice = await this.findOne(id);
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Can only delete draft invoices');
    }
    return this.prisma.invoice.delete({ where: { id } });
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
