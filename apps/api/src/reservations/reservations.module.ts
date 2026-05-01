import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [PassportModule],
  providers: [ReservationsService],
  controllers: [ReservationsController],
})
export class ReservationsModule {}
