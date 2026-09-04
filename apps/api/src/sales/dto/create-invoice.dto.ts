import { IsNotEmpty, IsString, IsInt, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateInvoiceDto {
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @IsDateString()
  date: string;

  @IsInt()
  @Min(1)
  amount: number; // in paise

  @IsOptional()
  @IsString()
  description?: string;
}
