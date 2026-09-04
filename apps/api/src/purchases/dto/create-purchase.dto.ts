import { IsNotEmpty, IsString, IsInt, IsOptional, IsDateString, Min } from 'class-validator';

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
  @IsString()
  description?: string;
}
