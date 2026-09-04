import { IsOptional, IsString, IsInt, IsDateString, IsEnum, Min } from 'class-validator';
import { InvoiceStatus } from '../../common/enums';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}
