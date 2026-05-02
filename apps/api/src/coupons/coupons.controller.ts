import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { RedeemCouponDto } from './dto/redeem-coupon.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('redeem')
  redeem(
    @GetUser() user: { id: number },
    @Body() dto: RedeemCouponDto,
  ) {
    return this.couponsService.redeemByCode(user.id, dto.code);
  }

  @Get('me')
  getMy(
    @GetUser() user: { id: number },
    @Query('status') status: 'AVAILABLE' | 'USED' | 'EXPIRED' = 'AVAILABLE',
  ) {
    return this.couponsService.getMyCoupons(user.id, status);
  }

  @Get('applicable')
  getApplicable(
    @GetUser() user: { id: number },
    @Query('amount') amount: string,
  ) {
    return this.couponsService.getApplicableCoupons(user.id, Number(amount) || 0);
  }
}
