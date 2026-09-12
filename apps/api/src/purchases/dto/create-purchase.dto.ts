import { IsNotEmpty, IsString, IsInt, IsOptional, IsDateString, IsNumber, IsUUID, Min } from 'class-validator';

export class CreatePurchaseDto {
  @IsOptional()
  @IsString()
  billNo?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  productName?: string; // if no productId, auto-create product with this name

  @IsDateString()
  date: string;

  @IsInt()
  @Min(1)
  amount: number; // in paise

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
