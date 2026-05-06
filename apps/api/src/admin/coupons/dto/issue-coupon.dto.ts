import { IsInt, IsEmail, IsString } from 'class-validator';

export class IssueCouponDto {
  @IsInt()
  couponId: number;

  @IsString()
  @IsEmail()
  email: string;
}
