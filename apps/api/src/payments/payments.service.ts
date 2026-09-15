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
    return this.prisma.$transaction(async (tx) => {
      // Verify customer exists
      const customer = await tx.customer.findFirst({
        where: { id: dto.customerId, deletedAt: null },
      });
      if (!customer) throw new BadRequestException('Customer not found');

      // Verify invoice exists if provided
      let invoice = null;
      if (dto.invoiceId) {
        invoice = await tx.invoice.findFirst({
          where: { id: dto.invoiceId, deletedAt: null },
        });
        if (!invoice) throw new BadRequestException('Invoice not found');
        if (invoice.customerId !== dto.customerId) {
          throw new BadRequestException('Invoice does not belong to this customer');
        }
      }

      const payment = await tx.payment.create({
        data: {
          customerId: dto.customerId,
          invoiceId: dto.invoiceId,
          date: new Date(dto.date),
          amount: dto.amount,
          mode: dto.mode,
          bankAccountName: dto.bankAccountName || null,
          note: dto.note,
        },
        include: {
          customer: { select: { id: true, name: true } },
          invoice: { select: { id: true, invoiceNo: true } },
        },
      });

      // Synchronize invoice status based on total payments
      if (dto.invoiceId && invoice) {
        const sumResult = await tx.payment.aggregate({
          where: { invoiceId: dto.invoiceId, deletedAt: null },
          _sum: { amount: true },
        });
        const totalPaid = sumResult._sum.amount || 0;
        const newStatus = totalPaid >= invoice.totalAmount ? 'PAID' : (totalPaid > 0 ? 'PARTIALLY_PAID' : invoice.status);

        await tx.invoice.update({
          where: { id: dto.invoiceId },
          data: { status: newStatus },
        });
      }

      return payment;
    });
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id, deletedAt: null },
      });
      if (!payment) throw new NotFoundException('Payment not found');

      const deleted = await tx.payment.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // Re-derive linked invoice status after payment removal
      if (payment.invoiceId) {
        const invoice = await tx.invoice.findFirst({
          where: { id: payment.invoiceId, deletedAt: null },
        });

        if (invoice) {
          const sumResult = await tx.payment.aggregate({
            where: { invoiceId: payment.invoiceId, deletedAt: null },
            _sum: { amount: true },
          });
          const totalPaid = sumResult._sum.amount || 0;
          const newStatus = totalPaid >= invoice.totalAmount ? 'PAID' : (totalPaid > 0 ? 'PARTIALLY_PAID' : 'SENT');

          await tx.invoice.update({
            where: { id: payment.invoiceId },
            data: { status: newStatus },
          });
        }
      }

      return deleted;
    });
  }
}
