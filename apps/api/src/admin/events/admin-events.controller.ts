import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsService } from '../../events/events.service';

@Controller('admin/events')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminEventsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  @Get()
  list() {
    return this.prisma.event.findMany({
      include: {
        prizes: true,
        _count: { select: { applications: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  @Get(':id/applications')
  getApplications(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.eventApplication.findMany({
      where: { eventId: id },
      include: {
        customer: { select: { id: true, email: true, name: true } },
        prize: { select: { id: true, name: true } },
      },
      orderBy: { appliedAt: 'asc' },
    });
  }

  @Post(':id/draw')
  draw(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.drawWinners(id);
  }
}
