import { IsString, IsNotEmpty } from 'class-validator';

export class RedeemCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
