import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  IsArray,
  IsInt,
  IsOptional,
  ArrayMinSize,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { PricingService } from './pricing.service';

class AudienceCountsDto {
  @IsOptional() @IsInt() @Min(0) ADULT?: number;
  @IsOptional() @IsInt() @Min(0) TEEN?: number;
  @IsOptional() @IsInt() @Min(0) SENIOR?: number;
  @IsOptional() @IsInt() @Min(0) DISABLED?: number;
  @IsOptional() @IsInt() @Min(0) CHILD?: number;
}

class CalculatePriceDto {
  @IsInt() screeningId: number;
  @IsArray() @ArrayMinSize(1) @IsInt({ each: true }) seatIds: number[];
  @ValidateNested() @Type(() => AudienceCountsDto) audienceCounts: AudienceCountsDto;
  @IsOptional() @IsInt() userCouponId?: number;
}

@Controller('pricing')
@UseGuards(JwtAuthGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('calculate')
  calculate(
    @GetUser() user: { id: number },
    @Body() dto: CalculatePriceDto,
  ) {
    return this.pricingService.calculate({ ...dto, customerId: user.id });
  }
}
