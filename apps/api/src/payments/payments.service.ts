import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    filters: { customerId?: string; dateFrom?: string; dateTo?: string } = {},
    page = 1,
    limit = 20,
  ) {
    const where: any = { deletedAt: null };
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          invoice: { select: { id: true, invoiceNo: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        invoice: true,
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async create(dto: CreatePaymentDto) {
    // Verify customer exists
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, deletedAt: null },
    });
    if (!customer) throw new BadRequestException('Customer not found');

    // Verify invoice exists if provided
    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: dto.invoiceId, deletedAt: null },
      });
      if (!invoice) throw new BadRequestException('Invoice not found');
      if (invoice.customerId !== dto.customerId) {
        throw new BadRequestException('Invoice does not belong to this customer');
      }
    }

    return this.prisma.payment.create({
      data: {
        customerId: dto.customerId,
        invoiceId: dto.invoiceId,
        date: new Date(dto.date),
        amount: dto.amount,
        mode: dto.mode,
        note: dto.note,
      },
      include: {
        customer: { select: { id: true, name: true } },
        invoice: { select: { id: true, invoiceNo: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.payment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
