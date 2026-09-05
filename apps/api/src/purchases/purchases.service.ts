import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    filters: { vendor?: string; dateFrom?: string; dateTo?: string } = {},
    page = 1,
    limit = 20,
  ) {
    const where: any = { deletedAt: null };
    if (filters.vendor) {
      where.vendor = { contains: filters.vendor };
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
      },
    });
    if (!purchase) throw new NotFoundException('Purchase not found');
    return purchase;
  }

  async create(dto: CreatePurchaseDto, userId: string) {
    return this.prisma.purchase.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        createdBy: userId,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(id: string, dto: UpdatePurchaseDto) {
    await this.findOne(id);
    return this.prisma.purchase.update({
      where: { id },
      data: {
        ...(dto.billNo !== undefined && { billNo: dto.billNo }),
        ...(dto.vendor && { vendor: dto.vendor }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.amount && { amount: dto.amount }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.purchase.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
