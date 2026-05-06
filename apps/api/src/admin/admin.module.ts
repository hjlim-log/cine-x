import { Module } from '@nestjs/common';
import { AdminMoviesController } from './movies/admin-movies.controller';
import { AdminMoviesService } from './movies/admin-movies.service';
import { AdminScreeningsController } from './screenings/admin-screenings.controller';
import { AdminScreeningsService } from './screenings/admin-screenings.service';
import { AdminEventsController } from './events/admin-events.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [AdminMoviesController, AdminScreeningsController, AdminEventsController],
  providers: [AdminMoviesService, AdminScreeningsService],
})
export class AdminModule {}
