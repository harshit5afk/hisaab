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
      totalSalesResult,
      totalPurchasesResult,
      totalPaymentsResult,
      paymentsTodayResult,
      customerCount,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({ _sum: { amount: true } }),
      this.prisma.purchase.aggregate({ _sum: { amount: true } }),
      this.prisma.payment.aggregate({ _sum: { amount: true } }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: today, lt: tomorrow } },
      }),
      this.prisma.customer.count(),
    ]);

    const totalSales = totalSalesResult._sum.amount ?? 0;
    const totalPaid = totalPaymentsResult._sum.amount ?? 0;

    return {
      totalReceivable: totalSales - totalPaid,
      totalSales,
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
          _sum: { amount: true },
          where: { date: { gte: start, lt: end } },
        }),
        this.prisma.purchase.aggregate({
          _sum: { amount: true },
          where: { date: { gte: start, lt: end } },
        }),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { date: { gte: start, lt: end } },
        }),
      ]);

      results.push({
        month: `${year}-${String(month + 1).padStart(2, '0')}`,
        sales: sales._sum.amount ?? 0,
        purchases: purchases._sum.amount ?? 0,
        payments: payments._sum.amount ?? 0,
      });
    }

    return results;
  }
}
