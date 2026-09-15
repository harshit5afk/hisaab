import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { SalesService } from './sales.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BulkDeleteDto } from '../common/dto/bulk-delete.dto';

@Controller('sales')
export class SalesController {
  constructor(
    private salesService: SalesService,
    private invoicePdfService: InvoicePdfService,
    private prisma: PrismaService,
  ) {}

  @Get()
  findAll(
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.salesService.findAll(
      { customerId, status, dateFrom, dateTo },
      page ? +page : 1,
      limit ? +limit : 20,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Get(':id/invoice/pdf')
  async downloadInvoice(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const customer = await this.prisma.customer.findUnique({
      where: { id: invoice.customerId },
    });

    const pdfBuffer = await this.invoicePdfService.generatePdf(invoice, customer);

    const safeInvoiceNo = (invoice.invoiceNo || 'invoice').replace(/[/\\?%*:|"<>]/g, '-');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeInvoiceNo}.pdf"`,
    });
    res.send(pdfBuffer);
  }

  @Post()
  create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.salesService.create(dto, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.salesService.update(id, dto);
  }

  @Post('bulk-delete')
  @Roles('OWNER')
  bulkDelete(@Body() dto: BulkDeleteDto) {
    return this.salesService.removeMany(dto.ids);
  }

  @Delete(':id')
  @Roles('OWNER')
  remove(@Param('id') id: string) {
    return this.salesService.remove(id);
  }
}

