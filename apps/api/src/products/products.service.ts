import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, page = 1, limit = 50) {
    const where: any = { deletedAt: null };
    if (search && search.trim()) {
      const query = search.trim();
      where.OR = [
        { name: { contains: query } },
        { hsn: { contains: query } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name.trim(),
        hsn: dto.hsn?.trim() || null,
        unit: dto.unit?.trim() || 'NOS',
        rate: dto.rate,
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.hsn !== undefined && { hsn: dto.hsn?.trim() || null }),
        ...(dto.unit !== undefined && { unit: dto.unit?.trim() || 'NOS' }),
        ...(dto.rate !== undefined && { rate: dto.rate }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
