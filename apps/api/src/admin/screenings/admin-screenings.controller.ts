import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { AdminScreeningsService } from './admin-screenings.service';
import { CreateScreeningDto } from './dto/create-screening.dto';
import { BulkCreateScreeningDto } from './dto/bulk-create-screening.dto';

@Controller('admin/screenings')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminScreeningsController {
  constructor(private readonly service: AdminScreeningsService) {}

  @Get()
  list(@Query() query: any) {
    return this.service.list(query);
  }

  @Get('cinemas')
  cinemas() {
    return this.service.getCinemasWithScreens();
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOne(id);
  }

  @Post()
  create(@Body() dto: CreateScreeningDto) {
    return this.service.create(dto);
  }

  @Post('bulk')
  bulkCreate(@Body() dto: BulkCreateScreeningDto) {
    return this.service.bulkCreate(dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
