import {
  IsInt,
  IsOptional,
  IsArray,
  IsString,
  IsDateString,
} from 'class-validator';

export class BulkIssueCouponDto {
  @IsInt()
  couponId: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gradeNames?: string[];

  @IsOptional()
  @IsDateString()
  joinedAfter?: string;

  @IsOptional()
  @IsDateString()
  joinedBefore?: string;
}
