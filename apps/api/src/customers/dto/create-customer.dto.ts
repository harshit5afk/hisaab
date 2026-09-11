import { IsNotEmpty, IsString, IsOptional, Matches, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCustomerDto {
  @IsNotEmpty({ message: 'Customer name is required' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  phone?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  address?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed.toUpperCase();
  })
  @ValidateIf((o) => typeof o.gstin === 'string' && o.gstin.trim() !== '')
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'Invalid GSTIN format (must be 15 characters, e.g. 08AABCH1111H1Z1)',
  })
  gstin?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  state?: string;
}
