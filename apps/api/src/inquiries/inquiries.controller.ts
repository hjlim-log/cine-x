import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { InquiriesService } from './inquiries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { CreateOneOnOneDto } from './dto/create-one-on-one.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateLostItemDto } from './dto/create-lost-item.dto';

@Controller('inquiries')
@UseGuards(JwtAuthGuard)
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  // GET /inquiries/me/unread-count — :id보다 먼저 정의
  @Get('me/unread-count')
  getUnreadCount(@GetUser('id') userId: number) {
    return this.inquiriesService.getUnreadCount(userId);
  }

  // GET /inquiries/me?type=ONE_ON_ONE&status=COMPLETED
  @Get('me')
  getMyInquiries(
    @GetUser('id') userId: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.inquiriesService.getMyInquiries(userId, type, status);
  }

  // POST /inquiries/one-on-one
  @Post('one-on-one')
  createOneOnOne(
    @GetUser('id') userId: number,
    @Body() dto: CreateOneOnOneDto,
  ) {
    return this.inquiriesService.createOneOnOne(userId, dto);
  }

  // POST /inquiries/group
  @Post('group')
  createGroup(
    @GetUser('id') userId: number,
    @Body() dto: CreateGroupDto,
  ) {
    return this.inquiriesService.createGroup(userId, dto);
  }

  // POST /inquiries/lost-item
  @Post('lost-item')
  createLostItem(
    @GetUser('id') userId: number,
    @Body() dto: CreateLostItemDto,
  ) {
    return this.inquiriesService.createLostItem(userId, dto);
  }

  // GET /inquiries/:id
  @Get(':id')
  getOne(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.inquiriesService.getOne(userId, id);
  }

  // PATCH /inquiries/:id/read
  @Patch(':id/read')
  markRead(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.inquiriesService.markRead(userId, id);
  }

  // DELETE /inquiries/:id
  @Delete(':id')
  delete(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.inquiriesService.delete(userId, id);
  }
}
