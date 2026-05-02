import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { PartnerDiscountsController } from './partner-discounts.controller';

@Module({
  imports: [PassportModule],
  controllers: [PricingController, PartnerDiscountsController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
