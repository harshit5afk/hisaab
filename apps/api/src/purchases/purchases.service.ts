import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
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
    if (!userId) {
      throw new UnauthorizedException('Authenticated user is required to create a purchase');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new UnauthorizedException('Authenticated user was not found');
    return user.id;
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

      // ✅ Increment product stock by purchased quantity & record stock movement
      if (productId) {
        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: qty } },
        });

        await tx.stockMovement.create({
          data: {
            productId,
            type: 'PURCHASE',
            quantity: qty,
            balanceAfter: updatedProduct.stock,
            referenceId: purchase.id,
            note: `Purchase from ${dto.vendor || 'Vendor'} (Bill: ${dto.billNo || 'N/A'})`,
          },
        });
      }

      return purchase;
    });
  }

  async update(id: string, dto: UpdatePurchaseDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.purchase.findFirst({
        where: { id, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Purchase not found');

      const oldQty = existing.quantity ?? 1;
      const newQty = dto.quantity !== undefined ? dto.quantity : oldQty;
      const oldProductId = existing.productId;
      const newProductId = dto.productId !== undefined ? dto.productId : oldProductId;

      // 1. Handle stock adjustment when product or quantity changes
      if (oldProductId === newProductId && oldProductId) {
        const qtyDiff = newQty - oldQty;
        if (qtyDiff !== 0) {
          const product = await tx.product.findUnique({ where: { id: oldProductId } });
          if (product && qtyDiff < 0 && product.stock + qtyDiff < 0) {
            throw new BadRequestException(
              `Cannot reduce purchase quantity by ${Math.abs(qtyDiff)}. Available product stock is ${product.stock}, which would result in negative inventory.`,
            );
          }

          const updatedProduct = await tx.product.update({
            where: { id: oldProductId },
            data: { stock: { increment: qtyDiff } },
          });

          await tx.stockMovement.create({
            data: {
              productId: oldProductId,
              type: 'PURCHASE_UPDATE',
              quantity: qtyDiff,
              balanceAfter: updatedProduct.stock,
              referenceId: id,
              note: `Purchase updated (quantity changed from ${oldQty} to ${newQty})`,
            },
          });
        }
      } else if (oldProductId !== newProductId) {
        // Revert old product stock
        if (oldProductId) {
          const oldProduct = await tx.product.findUnique({ where: { id: oldProductId } });
          if (oldProduct && oldProduct.stock - oldQty < 0) {
            throw new BadRequestException(
              `Cannot reassign product: "${oldProduct.name}" has already been sold (available stock: ${oldProduct.stock}, purchase had: ${oldQty}).`,
            );
          }

          const updatedOld = await tx.product.update({
            where: { id: oldProductId },
            data: { stock: { decrement: oldQty } },
          });

          await tx.stockMovement.create({
            data: {
              productId: oldProductId,
              type: 'PURCHASE_UPDATE',
              quantity: -oldQty,
              balanceAfter: updatedOld.stock,
              referenceId: id,
              note: `Purchase reassigned away from product`,
            },
          });
        }

        // Add new product stock
        if (newProductId) {
          const updatedNew = await tx.product.update({
            where: { id: newProductId },
            data: { stock: { increment: newQty } },
          });

          await tx.stockMovement.create({
            data: {
              productId: newProductId,
              type: 'PURCHASE_UPDATE',
              quantity: newQty,
              balanceAfter: updatedNew.stock,
              referenceId: id,
              note: `Purchase reassigned to product`,
            },
          });
        }
      }

      return tx.purchase.update({
        where: { id },
        data: {
          ...(dto.billNo !== undefined && { billNo: dto.billNo }),
          ...(dto.vendor !== undefined && { vendor: dto.vendor }),
          ...(dto.date && { date: new Date(dto.date) }),
          ...(dto.amount && { amount: dto.amount }),
          ...(dto.quantity !== undefined && { quantity: dto.quantity }),
          ...(dto.rate !== undefined && { rate: dto.rate }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.productId !== undefined && { productId: dto.productId }),
        },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, unit: true, hsn: true, stock: true } },
        },
      });
    });
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id, deletedAt: null },
      });
      if (!purchase) throw new NotFoundException('Purchase not found');

      // Verify goods haven't already been sold before decrementing stock
      if (purchase.productId) {
        const qty = purchase.quantity ?? 1;
        const product = await tx.product.findUnique({ where: { id: purchase.productId } });

        if (product && product.stock - qty < 0) {
          throw new BadRequestException(
            `Cannot delete purchase: items from this purchase have already been sold. Current stock of "${product.name}" is ${product.stock}, but deleting requires reverting ${qty}.`,
          );
        }

        const updatedProduct = await tx.product.update({
          where: { id: purchase.productId },
          data: { stock: { decrement: qty } },
        });

        await tx.stockMovement.create({
          data: {
            productId: purchase.productId,
            type: 'PURCHASE_CANCEL',
            quantity: -qty,
            balanceAfter: updatedProduct.stock,
            referenceId: id,
            note: `Purchase deleted (Bill: ${purchase.billNo || 'N/A'})`,
          },
        });
      }

      return tx.purchase.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
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
          const product = await tx.product.findUnique({ where: { id: p.productId } });

          if (product && product.stock - qty < 0) {
            throw new BadRequestException(
              `Cannot bulk delete: items from purchase (Bill: ${p.billNo || 'N/A'}) have already been sold. Available stock for "${product.name}" is ${product.stock}, but ${qty} is required to revert.`,
            );
          }

          const updatedProduct = await tx.product.update({
            where: { id: p.productId },
            data: { stock: { decrement: qty } },
          });

          await tx.stockMovement.create({
            data: {
              productId: p.productId,
              type: 'PURCHASE_CANCEL',
              quantity: -qty,
              balanceAfter: updatedProduct.stock,
              referenceId: p.id,
              note: `Bulk purchase delete`,
            },
          });
        }
      }

      return tx.purchase.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    });
  }
}
