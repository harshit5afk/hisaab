import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get()
  findAll(
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.findAll(
      { customerId, dateFrom, dateTo },
      page ? +page : 1,
      limit ? +limit : 20,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }
}
