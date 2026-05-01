import { IsString, IsNumber, IsPositive } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  paymentKey: string;

  @IsString()
  orderId: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
