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

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    MoviesModule,
    ScreeningsModule,
    ReservationsModule,
    CinemasModule,
    PaymentsModule,
  ],
})
export class AppModule {}
