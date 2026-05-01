import { Module } from '@nestjs/common';
import { ScreeningsService } from './screenings.service';
import { ScreeningsController } from './screenings.controller';

@Module({
  providers: [ScreeningsService],
  controllers: [ScreeningsController],
})
export class ScreeningsModule {}
