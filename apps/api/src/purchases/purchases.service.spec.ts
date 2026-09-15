import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PurchasesService } from './purchases.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PurchasesService', () => {
  let service: PurchasesService;
  let prismaMock: any;
  let txMock: any;

  beforeEach(() => {
    txMock = {
      purchase: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      product: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      stockMovement: {
        create: vi.fn(),
      },
    };

    prismaMock = {
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(txMock)),
      purchase: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'user-1' }),
      },
    };

    service = new PurchasesService(prismaMock);
  });

  describe('create', () => {
    it('creates a purchase, increments stock, and writes a PURCHASE stock movement', async () => {
      const dto = {
        amount: 5000,
        date: '2026-03-15',
        quantity: 10,
        productId: 'prod-1',
        vendor: 'Steel Co',
      };

      const createdPurchase = {
        id: 'purch-1',
        amount: 5000,
        quantity: 10,
        productId: 'prod-1',
        vendor: 'Steel Co',
      };

      txMock.purchase.create.mockResolvedValue(createdPurchase);
      txMock.product.update.mockResolvedValue({ id: 'prod-1', stock: 25 });
      txMock.stockMovement.create.mockResolvedValue({ id: 'sm-1' });

      const result = await service.create(dto as any, 'user-1');

      expect(result).toEqual(createdPurchase);
      expect(txMock.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { increment: 10 } },
      });
      expect(txMock.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId: 'prod-1',
          type: 'PURCHASE',
          quantity: 10,
          balanceAfter: 25,
          referenceId: 'purch-1',
        }),
      });
    });
  });

  describe('update', () => {
    it('adjusts stock difference when purchase quantity increases', async () => {
      txMock.purchase.findFirst.mockResolvedValue({
        id: 'purch-1',
        quantity: 10,
        productId: 'prod-1',
      });
      txMock.product.findUnique.mockResolvedValue({ id: 'prod-1', stock: 15 });
      txMock.product.update.mockResolvedValue({ id: 'prod-1', stock: 20 });
      txMock.stockMovement.create.mockResolvedValue({ id: 'sm-2' });
      txMock.purchase.update.mockResolvedValue({ id: 'purch-1', quantity: 15 });

      const result = await service.update('purch-1', { quantity: 15 });

      expect(txMock.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { increment: 5 } },
      });
      expect(txMock.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'PURCHASE_UPDATE',
          quantity: 5,
          balanceAfter: 20,
        }),
      });
      expect(result).toEqual({ id: 'purch-1', quantity: 15 });
    });

    it('throws BadRequestException if reducing quantity exceeds available stock', async () => {
      txMock.purchase.findFirst.mockResolvedValue({
        id: 'purch-1',
        quantity: 10,
        productId: 'prod-1',
      });
      // Product stock is only 2, but we try to reduce purchase quantity by 5 (10 -> 5)
      txMock.product.findUnique.mockResolvedValue({ id: 'prod-1', stock: 2 });

      await expect(service.update('purch-1', { quantity: 5 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('throws BadRequestException if deleting purchase causes negative inventory', async () => {
      txMock.purchase.findFirst.mockResolvedValue({
        id: 'purch-1',
        quantity: 10,
        productId: 'prod-1',
      });
      // Only 5 in stock, but purchase was for 10 (goods already sold)
      txMock.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Widget', stock: 5 });

      await expect(service.remove('purch-1')).rejects.toThrow(BadRequestException);
    });

    it('soft deletes purchase, decrements stock, and logs stock movement if stock is available', async () => {
      txMock.purchase.findFirst.mockResolvedValue({
        id: 'purch-1',
        quantity: 5,
        productId: 'prod-1',
      });
      txMock.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Widget', stock: 10 });
      txMock.product.update.mockResolvedValue({ id: 'prod-1', stock: 5 });
      txMock.purchase.update.mockResolvedValue({ id: 'purch-1', deletedAt: new Date() });
      txMock.stockMovement.create.mockResolvedValue({ id: 'sm-3' });

      await service.remove('purch-1');

      expect(txMock.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { decrement: 5 } },
      });
      expect(txMock.stockMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'PURCHASE_CANCEL',
          quantity: -5,
          balanceAfter: 5,
        }),
      });
    });
  });
});
