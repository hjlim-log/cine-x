import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // GET /events?category=MOVIE&status=ONGOING
  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.eventsService.findAll({ category, status });
  }

  // GET /events/me/applications — :id보다 먼저 정의해야 충돌 방지
  @Get('me/applications')
  @UseGuards(JwtAuthGuard)
  getMyApplications(@GetUser() user: { id: number }) {
    return this.eventsService.getMyApplications(user.id);
  }

  // PATCH /events/applications/:id/read
  @Patch('applications/:id/read')
  @UseGuards(JwtAuthGuard)
  markRead(
    @GetUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.eventsService.markNotificationRead(user.id, id);
  }

  // GET /events/:id (JWT 선택: 있으면 myApplication 포함)
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: { id: number } | null,
  ) {
    return this.eventsService.findOne(id, user?.id);
  }

  // POST /events/:id/apply
  @Post(':id/apply')
  @UseGuards(JwtAuthGuard)
  apply(
    @GetUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.eventsService.apply(user.id, id);
  }
}
