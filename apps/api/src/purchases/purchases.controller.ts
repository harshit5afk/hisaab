import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BulkDeleteDto } from '../common/dto/bulk-delete.dto';

@Controller('purchases')
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Get()
  findAll(
    @Query('vendor') vendor?: string,
    @Query('productId') productId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchasesService.findAll(
      { vendor, productId, dateFrom, dateTo },
      page ? +page : 1,
      limit ? +limit : 20,
    );
  }

  @Post('bulk-delete')
  @Roles('OWNER')
  bulkDelete(@Body() dto: BulkDeleteDto) {
    return this.purchasesService.removeMany(dto.ids);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreatePurchaseDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.purchasesService.create(dto, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseDto) {
    return this.purchasesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('OWNER')
  remove(@Param('id') id: string) {
    return this.purchasesService.remove(id);
  }
}
