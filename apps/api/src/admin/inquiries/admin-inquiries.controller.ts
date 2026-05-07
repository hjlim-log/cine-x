import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { AdminInquiriesService } from './admin-inquiries.service';
import { AnswerInquiryDto } from './dto/answer-inquiry.dto';

@Controller('admin/inquiries')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminInquiriesController {
  constructor(private readonly service: AdminInquiriesService) {}

  @Get()
  list(@Query('status') status?: string, @Query('type') type?: string) {
    return this.service.list({ status, type });
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOne(id);
  }

  @Patch(':id/answer')
  answer(@Param('id', ParseIntPipe) id: number, @Body() dto: AnswerInquiryDto) {
    return this.service.answer(id, dto);
  }
}
