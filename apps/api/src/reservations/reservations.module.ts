import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [PassportModule, PricingModule],
  providers: [ReservationsService],
  controllers: [ReservationsController],
})
export class ReservationsModule {}
