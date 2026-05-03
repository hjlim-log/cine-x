import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { PricingModule } from '../pricing/pricing.module';
import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [PassportModule, PricingModule, MembershipModule],
  providers: [ReservationsService],
  controllers: [ReservationsController],
})
export class ReservationsModule {}
