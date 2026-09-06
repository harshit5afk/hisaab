import { IsNotEmpty, IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  hsn?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsInt()
  @Min(0)
  rate: number; // in paise
}
