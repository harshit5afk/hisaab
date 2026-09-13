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

  private readonly gstStateMap: Record<string, string> = {
    '01': 'JAMMU AND KASHMIR',
    '02': 'HIMACHAL PRADESH',
    '03': 'PUNJAB',
    '04': 'CHANDIGARH',
    '05': 'UTTARAKHAND',
    '06': 'HARYANA',
    '07': 'DELHI',
    '08': 'RAJASTHAN',
    '09': 'UTTAR PRADESH',
    '10': 'BIHAR',
    '11': 'SIKKIM',
    '12': 'ARUNACHAL PRADESH',
    '13': 'NAGALAND',
    '14': 'MANIPUR',
    '15': 'MIZORAM',
    '16': 'TRIPURA',
    '17': 'MEGHALAYA',
    '18': 'ASSAM',
    '19': 'WEST BENGAL',
    '20': 'JHARKHAND',
    '21': 'ODISHA',
    '22': 'CHHATTISGARH',
    '23': 'MADHYA PRADESH',
    '24': 'GUJARAT',
    '26': 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
    '27': 'MAHARASHTRA',
    '29': 'KARNATAKA',
    '30': 'GOA',
    '31': 'LAKSHADWEEP',
    '32': 'KERALA',
    '33': 'TAMIL NADU',
    '34': 'PUDUCHERRY',
    '35': 'ANDAMAN AND NICOBAR ISLANDS',
    '36': 'TELANGANA',
    '37': 'ANDHRA PRADESH',
    '38': 'LADAKH',
  };

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
    throw new NotFoundException('No active user account found to associate with customer');
  }

  async create(dto: CreateCustomerDto, userId: string) {
    const effectiveUserId = await this.resolveUserId(userId);
    const gstin = dto.gstin?.trim() ? dto.gstin.trim().toUpperCase() : null;
    let state = dto.state?.trim() || null;

    // Auto-derive state from GSTIN first 2 digits if state is not explicitly given
    if (!state && gstin && gstin.length >= 2) {
      const code = gstin.substring(0, 2);
      state = this.gstStateMap[code] || null;
    }

    const data: any = {
      name: dto.name.trim(),
      phone: dto.phone?.trim() || null,
      address: dto.address?.trim() || null,
      gstin,
      state,
      createdBy: effectiveUserId,
    };
    return this.prisma.customer.create({ data });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id); // throws if not found
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null;
    if (dto.address !== undefined) data.address = dto.address?.trim() || null;
    if (dto.gstin !== undefined) {
      const gstin = dto.gstin?.trim() ? dto.gstin.trim().toUpperCase() : null;
      data.gstin = gstin;
      if (!dto.state && gstin && gstin.length >= 2) {
        const code = gstin.substring(0, 2);
        if (this.gstStateMap[code]) {
          data.state = this.gstStateMap[code];
        }
      }
    }
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
