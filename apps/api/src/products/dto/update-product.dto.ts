import { IsOptional, IsString, IsInt, Min } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  hsn?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  rate?: number; // in paise
}
