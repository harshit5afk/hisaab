import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { InvoicePdfService } from './invoice-pdf.service';

@Module({
  controllers: [SalesController],
  providers: [SalesService, InvoicePdfService],
  exports: [SalesService],
})
export class SalesModule {}

