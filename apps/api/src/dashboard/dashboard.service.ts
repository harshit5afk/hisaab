import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      invoiceSumsResult,
      totalPurchasesResult,
      totalPaymentsResult,
      paymentsTodayResult,
      customerCount,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        _sum: { amount: true, totalAmount: true },
        where: { deletedAt: null },
      }),
      this.prisma.purchase.aggregate({
        _sum: { amount: true },
        where: { deletedAt: null },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { deletedAt: null },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: today, lt: tomorrow }, deletedAt: null },
      }),
      this.prisma.customer.count({
        where: { deletedAt: null },
      }),
    ]);

    const totalSales = invoiceSumsResult._sum.amount ?? 0;
    const totalBilled = invoiceSumsResult._sum.totalAmount ?? totalSales;
    const totalPaid = totalPaymentsResult._sum.amount ?? 0;

    return {
      totalReceivable: totalBilled - totalPaid,
      totalSales, // net goods sales
      totalBilled, // grand total including GST & other charges
      totalPurchases: totalPurchasesResult._sum.amount ?? 0,
      paymentsToday: paymentsTodayResult._sum.amount ?? 0,
      customerCount,
    };
  }

  async getMonthlySummary(months = 6) {
    // Get last N months of data
    const results: Array<{
      month: string;
      sales: number;
      billed: number;
      purchases: number;
      payments: number;
    }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 1);

      const [sales, purchases, payments] = await Promise.all([
        this.prisma.invoice.aggregate({
          _sum: { amount: true, totalAmount: true },
          where: { date: { gte: start, lt: end }, deletedAt: null },
        }),
        this.prisma.purchase.aggregate({
          _sum: { amount: true },
          where: { date: { gte: start, lt: end }, deletedAt: null },
        }),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { date: { gte: start, lt: end }, deletedAt: null },
        }),
      ]);

      const subtotal = sales._sum.amount ?? 0;
      const billed = sales._sum.totalAmount ?? subtotal;

      results.push({
        month: `${year}-${String(month + 1).padStart(2, '0')}`,
        sales: subtotal,
        billed,
        purchases: purchases._sum.amount ?? 0,
        payments: payments._sum.amount ?? 0,
      });
    }

    return results;
  }
}
