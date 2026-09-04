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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.findAll(
      search,
      page ? +page : 1,
      limit ? +limit : 20,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.customersService.create(dto, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
