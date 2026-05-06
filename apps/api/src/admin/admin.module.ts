import { Module } from '@nestjs/common';
import { AdminMoviesController } from './movies/admin-movies.controller';
import { AdminMoviesService } from './movies/admin-movies.service';
import { AdminScreeningsController } from './screenings/admin-screenings.controller';
import { AdminScreeningsService } from './screenings/admin-screenings.service';
import { AdminEventsController } from './events/admin-events.controller';
import { AdminCouponsController } from './coupons/admin-coupons.controller';
import { AdminCouponsService } from './coupons/admin-coupons.service';
import { AdminInquiriesController } from './inquiries/admin-inquiries.controller';
import { AdminInquiriesService } from './inquiries/admin-inquiries.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [
    AdminMoviesController,
    AdminScreeningsController,
    AdminEventsController,
    AdminCouponsController,
    AdminInquiriesController,
  ],
  providers: [
    AdminMoviesService,
    AdminScreeningsService,
    AdminCouponsService,
    AdminInquiriesService,
  ],
})
export class AdminModule {}
