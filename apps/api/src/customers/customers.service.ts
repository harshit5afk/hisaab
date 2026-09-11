import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, page = 1, limit = 20) {
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { gstin: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(dto: CreateCustomerDto, userId: string) {
    const data: any = {
      name: dto.name.trim(),
      phone: dto.phone?.trim() || null,
      address: dto.address?.trim() || null,
      gstin: dto.gstin?.trim() ? dto.gstin.trim().toUpperCase() : null,
      state: dto.state?.trim() || null,
      createdBy: userId,
    };
    return this.prisma.customer.create({ data });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id); // throws if not found
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
    if (dto.address !== undefined) data.address = dto.address?.trim() || null;
    if (dto.gstin !== undefined) data.gstin = dto.gstin?.trim() ? dto.gstin.trim().toUpperCase() : null;
    if (dto.state !== undefined) data.state = dto.state?.trim() || null;
    return this.prisma.customer.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
