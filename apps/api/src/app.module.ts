import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MoviesModule } from './movies/movies.module';
import { ScreeningsModule } from './screenings/screenings.module';
import { ReservationsModule } from './reservations/reservations.module';
import { CinemasModule } from './cinemas/cinemas.module';
import { PaymentsModule } from './payments/payments.module';
import { PricingModule } from './pricing/pricing.module';
import { CouponsModule } from './coupons/coupons.module';
import { MembershipModule } from './membership/membership.module';
import { EventsModule } from './events/events.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { CustomerServiceModule } from './customer-service/customer-service.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AdminModule,
    MoviesModule,
    ScreeningsModule,
    ReservationsModule,
    CinemasModule,
    PaymentsModule,
    PricingModule,
    CouponsModule,
    MembershipModule,
    EventsModule,
    InquiriesModule,
    CustomerServiceModule,
  ],
})
export class AppModule {}
