import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReceivablesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get balance for all customers.
   * Balance = SUM(invoices.amount) - SUM(payments.amount)
   * Always computed, never stored.
   */
  async getBalances() {
    const customers = await this.prisma.customer.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        phone: true,
        invoices: {
          where: { deletedAt: null },
          select: { amount: true },
        },
        payments: {
          where: { deletedAt: null },
          select: { amount: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return customers
      .map((c) => {
        const totalInvoiced = c.invoices.reduce((sum, inv) => sum + inv.amount, 0);
        const totalPaid = c.payments.reduce((sum, pay) => sum + pay.amount, 0);
        return {
          customerId: c.id,
          customerName: c.name,
          phone: c.phone,
          totalInvoiced,
          totalPaid,
          balance: totalInvoiced - totalPaid,
        };
      })
      .sort((a, b) => b.balance - a.balance); // highest balance first
  }

  /**
   * Get transaction ledger for a single customer.
   * Merges invoices + payments into a chronological list with running balance.
   */
  async getLedger(customerId: string) {
    // Verify customer exists
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { customerId, deletedAt: null },
        orderBy: { date: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { customerId, deletedAt: null },
        orderBy: { date: 'asc' },
      }),
    ]);

    // Merge into a single sorted list
    const entries: Array<{
      id: string;
      date: Date;
      type: 'INVOICE' | 'PAYMENT';
      reference: string;
      description?: string | null;
      debit: number;
      credit: number;
    }> = [];

    for (const inv of invoices) {
      entries.push({
        id: inv.id,
        date: inv.date,
        type: 'INVOICE',
        reference: inv.invoiceNo,
        description: inv.description,
        debit: inv.amount,
        credit: 0,
      });
    }

    for (const pay of payments) {
      entries.push({
        id: pay.id,
        date: pay.date,
        type: 'PAYMENT',
        reference: pay.mode,
        description: pay.note,
        debit: 0,
        credit: pay.amount,
      });
    }

    // Sort by date, then invoices before payments on same day
    entries.sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.type === 'INVOICE' ? -1 : 1;
    });

    // Compute running balance
    let runningBalance = 0;
    const ledger = entries.map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return {
        ...entry,
        date: entry.date.toISOString(),
        runningBalance,
      };
    });

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
      },
      ledger,
      finalBalance: runningBalance,
    };
  }
}
