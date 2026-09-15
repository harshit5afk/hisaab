import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
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
    const where: any = { deletedAt: null };
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.status) where.status = filters.status as any;
    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { customer: { select: { id: true, name: true, phone: true, state: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        payments: { where: { deletedAt: null } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  private async resolveUserId(userId?: string): Promise<string> {
    if (!userId) {
      throw new UnauthorizedException('Authenticated user is required to create a customer');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new UnauthorizedException('Authenticated user was not found');
    return user.id;
  }

  async create(dto: CreateInvoiceDto, userId?: string) {
    let customerId = dto.customerId;

    if (!customerId && dto.customerName?.trim()) {
      const creatorId = await this.resolveUserId(userId);
      const trimmedName = dto.customerName.trim();
      let customer = await this.prisma.customer.findFirst({
        where: {
          name: trimmedName,
          deletedAt: null,
        },
      });

      if (!customer) {
        customer = await this.prisma.customer.create({
          data: {
            name: trimmedName,
            phone: dto.customerPhone || null,
            address: dto.customerAddress || null,
            gstin: dto.customerGstin || null,
            state: dto.customerState || null,
            createdBy: creatorId,
          },
        });
      }
      customerId = customer.id;
    }

    if (!customerId) {
      throw new BadRequestException('Customer is required (please select or enter customer name)');
    }

    // Verify customer exists
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer) throw new BadRequestException('Customer not found');

    return this.prisma.$transaction(async (tx) => {
      // Generate invoice number atomically
      const invoiceNo = await this.generateInvoiceNumber(tx);

      // Fetch active products for name-based fallback matching
      const allActiveProducts = await tx.product.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
      });

      // Sanitize items and decrement stock for products sold
      const sanitizedItems = [];
      for (const i of dto.items) {
        const qty = Number(i.qty);
        const rate = Number(i.rate);
        const trimmedName = i.name.trim();

        let resolvedProductId = i.productId?.trim() || undefined;

        if (!resolvedProductId && trimmedName) {
          const matched = allActiveProducts.find(
            (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase(),
          );
          if (matched) {
            resolvedProductId = matched.id;
          }
        }

        // ✅ Verify stock availability and reduce stock for sold product
        if (resolvedProductId && qty > 0) {
          const product = await tx.product.findUnique({ where: { id: resolvedProductId } });
          if (product && product.stock < qty) {
            throw new BadRequestException(
              `Insufficient stock for product "${product.name}". Available stock is ${product.stock}, but requested quantity is ${qty}.`,
            );
          }

          const updatedProd = await tx.product.update({
            where: { id: resolvedProductId },
            data: { stock: { decrement: qty } },
          });

          await tx.stockMovement.create({
            data: {
              productId: resolvedProductId,
              type: 'SALE',
              quantity: -qty,
              balanceAfter: updatedProd.stock,
              referenceId: invoiceNo,
              note: `Sale on invoice ${invoiceNo} to ${customer.name}`,
            },
          });
        }

        sanitizedItems.push({
          productId: resolvedProductId,
          name: trimmedName,
          hsn: i.hsn?.trim() || '',
          qty,
          rate,
          total: Math.round(qty * rate * 100) / 100,
        });
      }

      // Server-side subtotal calculation from items (in paise)
      const amount = sanitizedItems.reduce((sum, item) => {
        return sum + Math.round(item.qty * item.rate * 100);
      }, 0);

      // GST calculations
      const isGstInvoice = Boolean(dto.isGstInvoice);
      const taxRate = isGstInvoice ? (dto.taxRate !== undefined ? Number(dto.taxRate) : 18) : 0;
      const otherAmount = dto.otherAmount ? Math.max(0, Math.round(Number(dto.otherAmount))) : 0;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isGstInvoice && taxRate > 0) {
        const businessState = (process.env.BUSINESS_STATE || 'RAJASTHAN').trim().toUpperCase();
        const customerState = (customer.state || '').trim().toUpperCase();
        const isSameState = !customerState || customerState === businessState;
        const totalTax = Math.round((amount * taxRate) / 100);

        if (isSameState) {
          cgst = Math.round(totalTax / 2);
          sgst = totalTax - cgst; // exact reconciliation prevents 1-paisa rounding errors
        } else {
          igst = totalTax;
        }
      }

      const totalAmount = amount + cgst + sgst + igst + otherAmount;

      const description =
        dto.description ||
        (sanitizedItems.length > 0
          ? sanitizedItems.map((i) => i.name).filter(Boolean).join(', ')
          : null);

      return tx.invoice.create({
        data: {
          invoiceNo,
          customerId,
          date: new Date(dto.date),
          amount,
          isGstInvoice,
          taxRate: isGstInvoice ? taxRate : null,
          cgst,
          sgst,
          igst,
          otherAmount,
          totalAmount,
          description,
          items: sanitizedItems as any,
        },
        include: { customer: { select: { id: true, name: true, phone: true, state: true } } },
      });
    });
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findOne(id);

    // Prevent modifying core financial fields of a PAID invoice
    if (
      invoice.status === 'PAID' &&
      (dto.amount !== undefined ||
        dto.date ||
        dto.description !== undefined ||
        dto.items ||
        dto.isGstInvoice !== undefined ||
        dto.taxRate !== undefined ||
        dto.otherAmount !== undefined)
    ) {
      throw new BadRequestException(
        'Cannot edit financial details, date, description, items or taxes of a paid invoice',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let updateAmount = invoice.amount;
      let sanitizedItems = undefined;

      if (dto.items && dto.items.length > 0) {
        // 1. Revert previous stock deduction from old items
        if (Array.isArray(invoice.items)) {
          for (const oldItem of invoice.items as any[]) {
            const oldQty = Number(oldItem.qty) || 0;
            if (oldQty > 0 && oldItem.productId) {
              const reverted = await tx.product.update({
                where: { id: oldItem.productId },
                data: { stock: { increment: oldQty } },
              });

              await tx.stockMovement.create({
                data: {
                  productId: oldItem.productId,
                  type: 'SALE_UPDATE',
                  quantity: oldQty,
                  balanceAfter: reverted.stock,
                  referenceId: invoice.invoiceNo,
                  note: `Invoice ${invoice.invoiceNo} edit (reverted previous item)`,
                },
              });
            }
          }
        }

        const allActiveProducts = await tx.product.findMany({
          where: { deletedAt: null },
          select: { id: true, name: true },
        });

        // 2. Apply new stock deduction for new items with availability check
        sanitizedItems = [];
        for (const i of dto.items) {
          const qty = Number(i.qty);
          const rate = Number(i.rate);
          const trimmedName = i.name.trim();

          let resolvedProductId = i.productId?.trim() || undefined;
          if (!resolvedProductId && trimmedName) {
            const matched = allActiveProducts.find(
              (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase(),
            );
            if (matched) resolvedProductId = matched.id;
          }

          if (resolvedProductId && qty > 0) {
            const product = await tx.product.findUnique({ where: { id: resolvedProductId } });
            if (product && product.stock < qty) {
              throw new BadRequestException(
                `Insufficient stock for product "${product.name}". Available stock is ${product.stock}, but requested quantity is ${qty}.`,
              );
            }

            const updatedProd = await tx.product.update({
              where: { id: resolvedProductId },
              data: { stock: { decrement: qty } },
            });

            await tx.stockMovement.create({
              data: {
                productId: resolvedProductId,
                type: 'SALE_UPDATE',
                quantity: -qty,
                balanceAfter: updatedProd.stock,
                referenceId: invoice.invoiceNo,
                note: `Invoice ${invoice.invoiceNo} edit (deducted updated item)`,
              },
            });
          }

          sanitizedItems.push({
            productId: resolvedProductId,
            name: trimmedName,
            hsn: i.hsn?.trim() || '',
            qty,
            rate,
            total: Math.round(qty * rate * 100) / 100,
          });
        }

        updateAmount = sanitizedItems.reduce(
          (sum, item) => sum + Math.round(item.qty * item.rate * 100),
          0,
        );
      } else if (dto.amount !== undefined) {
        updateAmount = dto.amount;
      }

      const isGstInvoice =
        dto.isGstInvoice !== undefined ? Boolean(dto.isGstInvoice) : invoice.isGstInvoice;
      const taxRate =
        dto.taxRate !== undefined
          ? Number(dto.taxRate)
          : (invoice.taxRate ?? (isGstInvoice ? 18 : 0));
      const otherAmount =
        dto.otherAmount !== undefined ? Math.round(Number(dto.otherAmount)) : invoice.otherAmount;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isGstInvoice && taxRate > 0) {
        const businessState = (process.env.BUSINESS_STATE || 'RAJASTHAN').trim().toUpperCase();
        const customerState = (invoice.customer?.state || '').trim().toUpperCase();
        const isSameState = !customerState || customerState === businessState;
        const totalTax = Math.round((updateAmount * taxRate) / 100);

        if (isSameState) {
          cgst = Math.round(totalTax / 2);
          sgst = totalTax - cgst;
        } else {
          igst = totalTax;
        }
      }

      const totalAmount = updateAmount + cgst + sgst + igst + otherAmount;

      return tx.invoice.update({
        where: { id },
        data: {
          ...(dto.date && { date: new Date(dto.date) }),
          amount: updateAmount,
          isGstInvoice,
          taxRate: isGstInvoice ? taxRate : null,
          cgst,
          sgst,
          igst,
          otherAmount,
          totalAmount,
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.status && { status: dto.status }),
          ...(sanitizedItems && { items: sanitizedItems as any }),
        },
      });
    });
  }

  async remove(id: string) {
    const invoice = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // ✅ Revert stock for all items and log stock movements
      if (Array.isArray(invoice.items)) {
        for (const item of invoice.items as any[]) {
          const qty = Number(item.qty) || 0;
          if (qty > 0 && item.productId) {
            const reverted = await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: qty } },
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: 'SALE_CANCEL',
                quantity: qty,
                balanceAfter: reverted.stock,
                referenceId: invoice.invoiceNo,
                note: `Invoice ${invoice.invoiceNo} cancelled / deleted`,
              },
            });
          }
        }
      }

      return tx.invoice.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }

  async removeMany(ids: string[]) {
    if (!ids || ids.length === 0) return { count: 0 };

    return this.prisma.$transaction(async (tx) => {
      const invoices = await tx.invoice.findMany({
        where: { id: { in: ids }, deletedAt: null },
      });

      for (const inv of invoices) {
        if (Array.isArray(inv.items)) {
          for (const item of inv.items as any[]) {
            const qty = Number(item.qty) || 0;
            if (qty > 0 && item.productId) {
              const reverted = await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: qty } },
              });

              await tx.stockMovement.create({
                data: {
                  productId: item.productId,
                  type: 'SALE_CANCEL',
                  quantity: qty,
                  balanceAfter: reverted.stock,
                  referenceId: inv.invoiceNo,
                  note: `Invoice ${inv.invoiceNo} bulk cancelled / deleted`,
                },
              });
            }
          }
        }
      }

      return tx.invoice.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    });
  }

  /**
   * Atomic invoice number generation using a sequence table.
   * Format: INV/YY-YY/0001
   */
  private async generateInvoiceNumber(tx?: any): Promise<string> {
    const client = tx || this.prisma;
    const seq = await client.sequence.upsert({
      where: { id: 'invoice_seq' },
      update: { current: { increment: 1 } },
      create: { id: 'invoice_seq', current: 1 },
    });

    const fy = this.getFiscalYear();
    return `INV/${fy}/${String(seq.current).padStart(4, '0')}`;
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
