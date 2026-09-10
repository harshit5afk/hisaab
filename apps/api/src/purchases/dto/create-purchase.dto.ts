import { IsNotEmpty, IsString, IsInt, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';

export class CreatePurchaseDto {
  @IsOptional()
  @IsString()
  billNo?: string;

  @IsNotEmpty()
  @IsString()
  vendor: string;

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
  description?: string;
}
