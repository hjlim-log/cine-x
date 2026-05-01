import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ScreeningsService } from './screenings.service';

@Controller('screenings')
export class ScreeningsController {
  constructor(private readonly screeningsService: ScreeningsService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.screeningsService.findOne(id);
  }
}
