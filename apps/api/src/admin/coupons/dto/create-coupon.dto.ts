import {
  IsString,
  IsInt,
  IsOptional,
  IsIn,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['AMOUNT_DISCOUNT', 'PERCENT_DISCOUNT', 'FREE_TICKET'])
  type: string;

  @IsInt()
  @Min(1)
  value: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minPurchase?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  validDays?: number;

  @IsIn(['WELCOME', 'CODE', 'MANUAL', 'EVENT'])
  issuePolicy: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  bgColor?: string;
}
