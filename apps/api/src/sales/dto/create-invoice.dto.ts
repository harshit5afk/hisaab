import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsOptional,
  IsDateString,
  IsArray,
  ArrayMinSize,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceLineItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  hsn?: string;

  @IsNumber()
  @Min(0.01)
  qty: number;

  @IsNumber()
  @Min(0)
  rate: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number; // optional — server auto-computes qty * rate
}

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

  @IsOptional()
  @IsString()
  customerState?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number; // optional — server auto-calculates from items

  @IsOptional()
  @IsBoolean()
  isGstInvoice?: boolean; // toggle: true = GST Tax Invoice, false = regular

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number; // default 18% when isGstInvoice is true

  @IsOptional()
  @IsInt()
  @Min(0)
  otherAmount?: number; // extra charges in paise (default 0)

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Invoice must contain at least 1 line item' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  items: InvoiceLineItemDto[];
}
