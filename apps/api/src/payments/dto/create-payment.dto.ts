import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsOptional,
  IsDateString,
  IsEnum,
  Min,
} from 'class-validator';
import { PaymentMode } from '../../common/enums';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsDateString()
  date: string;

  @IsInt()
  @Min(1)
  amount: number; // in paise

  @IsEnum(PaymentMode)
  mode: PaymentMode;

  @IsOptional()
  @IsString()
  bankAccountName?: string; // e.g. "Axis Bank", "SBI"

  @IsOptional()
  @IsString()
  note?: string;
}
