import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CinemasService } from './cinemas.service';

@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  @Get()
  findAll() {
    return this.cinemasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cinemasService.findOne(id);
  }
}
