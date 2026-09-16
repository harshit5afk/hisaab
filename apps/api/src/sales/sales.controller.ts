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
  async downloadInvoice(
    @Param('id') id: string,
    @Query('disposition') disposition: string = 'inline',
    @Res() res: Response,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    let customer = null;
    if (invoice.customerId) {
      customer = await this.prisma.customer.findUnique({
        where: { id: invoice.customerId },
      });
    }

    if (!customer) {
      customer = {
        name: (invoice as any).customerName || 'Valued Customer',
        phone: (invoice as any).customerPhone || '-',
        address: (invoice as any).customerAddress || '-',
        gstin: (invoice as any).customerGstin || '-',
        state: (invoice as any).customerState || 'RAJASTHAN',
      };
    }

    const pdfBuffer = await this.invoicePdfService.generatePdf(invoice, customer);
    const buf = Buffer.from(pdfBuffer);

    const safeInvoiceNo = (invoice.invoiceNo || 'invoice').replace(/[/\\?%*:|"<>]/g, '-');
    const headerDisposition = disposition === 'attachment' ? 'attachment' : 'inline';

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${headerDisposition}; filename="${safeInvoiceNo}.pdf"`,
      'Content-Length': buf.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.end(buf);
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