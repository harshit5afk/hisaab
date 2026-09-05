import { IsNotEmpty, IsString, IsInt, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateInvoiceDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  customerGstin?: string;

  @IsDateString()
  date: string;

  @IsInt()
  @Min(1)
  amount: number; // in paise

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  items?: any[];
}
