import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentsService } from './payments.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaMock: any;
  let txMock: any;

  beforeEach(() => {
    txMock = {
      customer: {
        findFirst: vi.fn(),
      },
      invoice: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      payment: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        aggregate: vi.fn(),
      },
    };

    prismaMock = {
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(txMock)),
      payment: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
      },
    };

    service = new PaymentsService(prismaMock);
  });

  describe('create', () => {
    it('creates a payment and updates invoice status to PAID when fully settled', async () => {
      txMock.customer.findFirst.mockResolvedValue({ id: 'cust-1' });
      txMock.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        customerId: 'cust-1',
        totalAmount: 10000,
        status: 'SENT',
      });
      txMock.payment.create.mockResolvedValue({
        id: 'pay-1',
        customerId: 'cust-1',
        invoiceId: 'inv-1',
        amount: 10000,
      });
      txMock.payment.aggregate.mockResolvedValue({
        _sum: { amount: 10000 },
      });

      const result = await service.create({
        customerId: 'cust-1',
        invoiceId: 'inv-1',
        date: '2026-03-15',
        amount: 10000,
        mode: 'UPI',
      });

      expect(txMock.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'PAID' },
      });
      expect(result.id).toBe('pay-1');
    });

    it('updates invoice status to PARTIALLY_PAID when payment is partial', async () => {
      txMock.customer.findFirst.mockResolvedValue({ id: 'cust-1' });
      txMock.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        customerId: 'cust-1',
        totalAmount: 10000,
        status: 'SENT',
      });
      txMock.payment.create.mockResolvedValue({
        id: 'pay-1',
        customerId: 'cust-1',
        invoiceId: 'inv-1',
        amount: 4000,
      });
      txMock.payment.aggregate.mockResolvedValue({
        _sum: { amount: 4000 },
      });

      await service.create({
        customerId: 'cust-1',
        invoiceId: 'inv-1',
        date: '2026-03-15',
        amount: 4000,
        mode: 'CASH',
      });

      expect(txMock.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'PARTIALLY_PAID' },
      });
    });

    it('rejects payment if customer does not exist', async () => {
      txMock.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.create({
          customerId: 'non-existent',
          date: '2026-03-15',
          amount: 500,
          mode: 'CASH',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('soft-deletes payment and reverts invoice status to SENT if no payments remain', async () => {
      txMock.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        invoiceId: 'inv-1',
        amount: 5000,
      });
      txMock.payment.update.mockResolvedValue({ id: 'pay-1', deletedAt: new Date() });
      txMock.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        totalAmount: 5000,
        status: 'PAID',
      });
      txMock.payment.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });

      await service.remove('pay-1');

      expect(txMock.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'SENT' },
      });
    });
  });
});
