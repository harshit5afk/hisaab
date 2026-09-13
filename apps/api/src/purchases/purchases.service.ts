import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    filters: { vendor?: string; productId?: string; dateFrom?: string; dateTo?: string } = {},
    page = 1,
    limit = 20,
  ) {
    const where: any = { deletedAt: null };
    if (filters.vendor) {
      where.vendor = { contains: filters.vendor };
    }
    if (filters.productId) {
      where.productId = filters.productId;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        include: {
          creator: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, unit: true, hsn: true, stock: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, deletedAt: null },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, unit: true, hsn: true, stock: true } },
      },
    });
    if (!purchase) throw new NotFoundException('Purchase not found');
    return purchase;
  }

  private async resolveUserId(userId?: string): Promise<string> {
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (user) return user.id;
    }
    const defaultUser = await this.prisma.user.findFirst({
      select: { id: true },
    });
    if (defaultUser) return defaultUser.id;
    throw new NotFoundException('No active user account found to associate with purchase');
  }

  async create(dto: CreatePurchaseDto, userId: string) {
    const qty = dto.quantity ?? 1;
    const creatorId = await this.resolveUserId(userId);

    return this.prisma.$transaction(async (tx) => {
      let productId = dto.productId;

      // ✅ Auto-create or find product by name if productName is given
      if (!productId && dto.productName?.trim()) {
        const name = dto.productName.trim();

        // Check if product already exists (exact or case-insensitive)
        let existingProduct = await tx.product.findFirst({
          where: { name, deletedAt: null },
        });

        if (!existingProduct) {
          const allActive = await tx.product.findMany({
            where: { deletedAt: null },
          });
          existingProduct = allActive.find(
            (p) => p.name.trim().toLowerCase() === name.toLowerCase()
          ) || null;
        }

        if (existingProduct) {
          productId = existingProduct.id;
        } else {
          // Auto-create new product with purchase price per unit as rate
          const ratePerUnit = dto.rate ?? (qty > 0 ? Math.round(dto.amount / qty) : dto.amount);
          const newProduct = await tx.product.create({
            data: {
              name,
              unit: dto.unit?.trim() || 'NOS',
              rate: ratePerUnit,
              stock: 0,
            },
          });
          productId = newProduct.id;
        }
      }

      // If rate is not explicitly provided in DTO, calculate from amount / quantity
      const ratePerUnit = dto.rate ?? (qty > 0 ? Math.round(dto.amount / qty) : dto.amount);

      // Create the purchase record linked to product
      const purchase = await tx.purchase.create({
        data: {
          billNo: dto.billNo,
          vendor: dto.vendor,
          productId,
          date: new Date(dto.date),
          amount: dto.amount,
          quantity: qty,
          rate: ratePerUnit,
          description: dto.description,
          createdBy: creatorId,
        },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, unit: true, hsn: true, stock: true } },
        },
      });

      // ✅ Increment product stock by purchased quantity
      if (productId) {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: qty } },
        });
      }

      return purchase;
    });
  }

  async update(id: string, dto: UpdatePurchaseDto) {
    await this.findOne(id);
    return this.prisma.purchase.update({
      where: { id },
      data: {
        ...(dto.billNo !== undefined && { billNo: dto.billNo }),
        ...(dto.vendor !== undefined && { vendor: dto.vendor }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.amount && { amount: dto.amount }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.rate !== undefined && { rate: dto.rate }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  async remove(id: string) {
    const purchase = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Soft-delete the purchase
      const deleted = await tx.purchase.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // ✅ Decrement product stock by the quantity that was purchased
      if (purchase.productId) {
        const qty = purchase.quantity ?? 1;
        await tx.product.update({
          where: { id: purchase.productId },
          data: { stock: { decrement: qty } },
        });
      }

      return deleted;
    });
  }

  async removeMany(ids: string[]) {
    if (!ids || ids.length === 0) return { count: 0 };

    return this.prisma.$transaction(async (tx) => {
      const purchases = await tx.purchase.findMany({
        where: { id: { in: ids }, deletedAt: null },
      });

      for (const p of purchases) {
        if (p.productId) {
          const qty = p.quantity ?? 1;
          await tx.product.update({
            where: { id: p.productId },
            data: { stock: { decrement: qty } },
          }).catch(() => {});
        }
      }

      return tx.purchase.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    });
  }
}
