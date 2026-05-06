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
  getUnreadCount(@GetUser() user: { id: number }) {
    return this.inquiriesService.getUnreadCount(user.id);
  }

  // GET /inquiries/me?type=ONE_ON_ONE&status=COMPLETED
  @Get('me')
  getMyInquiries(
    @GetUser() user: { id: number },
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.inquiriesService.getMyInquiries(user.id, type, status);
  }

  // POST /inquiries/one-on-one
  @Post('one-on-one')
  createOneOnOne(
    @GetUser() user: { id: number },
    @Body() dto: CreateOneOnOneDto,
  ) {
    return this.inquiriesService.createOneOnOne(user.id, dto);
  }

  // POST /inquiries/group
  @Post('group')
  createGroup(
    @GetUser() user: { id: number },
    @Body() dto: CreateGroupDto,
  ) {
    return this.inquiriesService.createGroup(user.id, dto);
  }

  // POST /inquiries/lost-item
  @Post('lost-item')
  createLostItem(
    @GetUser() user: { id: number },
    @Body() dto: CreateLostItemDto,
  ) {
    return this.inquiriesService.createLostItem(user.id, dto);
  }

  // GET /inquiries/:id
  @Get(':id')
  getOne(
    @GetUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.inquiriesService.getOne(user.id, id);
  }

  // PATCH /inquiries/:id/read
  @Patch(':id/read')
  markRead(
    @GetUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.inquiriesService.markRead(user.id, id);
  }

  // DELETE /inquiries/:id
  @Delete(':id')
  delete(
    @GetUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.inquiriesService.delete(user.id, id);
  }
}
