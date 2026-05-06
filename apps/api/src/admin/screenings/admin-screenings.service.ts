import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateScreeningDto } from './dto/create-screening.dto';
import { BulkCreateScreeningDto } from './dto/bulk-create-screening.dto';

@Injectable()
export class AdminScreeningsService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkConflict(
    screenId: number,
    startTime: Date,
    endTime: Date,
    excludeId?: number,
  ): Promise<boolean> {
    const conflict = await this.prisma.screening.findFirst({
      where: {
        screenId,
        ...(excludeId && { id: { not: excludeId } }),
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    return !!conflict;
  }

  async create(dto: CreateScreeningDto) {
    const movie = await this.prisma.movie.findUnique({ where: { id: dto.movieId } });
    if (!movie) throw new NotFoundException('영화가 없습니다.');

    const screen = await this.prisma.screen.findUnique({ where: { id: dto.screenId } });
    if (!screen) throw new NotFoundException('상영관이 없습니다.');

    const startTime = new Date(dto.startTime);
    const endTime = new Date(startTime.getTime() + movie.runtime * 60 * 1000);

    if (startTime < new Date()) {
      throw new BadRequestException('과거 시간으로 등록할 수 없습니다.');
    }

    if (await this.checkConflict(dto.screenId, startTime, endTime)) {
      throw new ConflictException('해당 상영관에 시간이 겹치는 상영이 있습니다.');
    }

    return this.prisma.screening.create({
      data: {
        movieId: dto.movieId,
        screenId: dto.screenId,
        startTime,
        endTime,
        screenType: dto.screenType,
      },
      include: {
        movie: { select: { id: true, title: true, runtime: true } },
        screen: { include: { cinema: true, screenType: true } },
      },
    });
  }

  async bulkCreate(dto: BulkCreateScreeningDto) {
    const movie = await this.prisma.movie.findUnique({ where: { id: dto.movieId } });
    if (!movie) throw new NotFoundException('영화가 없습니다.');

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestException('종료일이 시작일보다 빠릅니다.');
    }

    const candidates: Array<{ startTime: Date; endTime: Date }> = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isWeekday = !isWeekend;

      const matchPattern =
        dto.repeatPattern === 'DAILY' ||
        (dto.repeatPattern === 'WEEKDAY' && isWeekday) ||
        (dto.repeatPattern === 'WEEKEND' && isWeekend);

      if (matchPattern) {
        for (const slot of dto.timeSlots) {
          const [h, m] = slot.split(':').map(Number);
          const startTime = new Date(current);
          startTime.setHours(h, m, 0, 0);

          if (startTime < new Date()) continue;

          const endTime = new Date(startTime.getTime() + movie.runtime * 60 * 1000);
          candidates.push({ startTime, endTime });
        }
      }

      current.setDate(current.getDate() + 1);
    }

    if (candidates.length === 0) {
      throw new BadRequestException('생성할 상영이 없습니다. 날짜와 시간을 확인해주세요.');
    }

    const created: any[] = [];
    const skipped: Array<{ startTime: Date; reason: string }> = [];

    for (const candidate of candidates) {
      if (await this.checkConflict(dto.screenId, candidate.startTime, candidate.endTime)) {
        skipped.push({ startTime: candidate.startTime, reason: '시간 충돌' });
        continue;
      }

      const createdOne = await this.prisma.screening.create({
        data: {
          movieId: dto.movieId,
          screenId: dto.screenId,
          startTime: candidate.startTime,
          endTime: candidate.endTime,
          screenType: dto.screenType,
        },
      });
      created.push(createdOne);
    }

    return {
      total: candidates.length,
      created: created.length,
      skipped: skipped.length,
      skippedDetails: skipped,
    };
  }

  async list(filter: {
    cinemaId?: string;
    screenId?: string;
    movieId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const cinemaId = filter.cinemaId ? parseInt(filter.cinemaId) : undefined;
    const screenId = filter.screenId ? parseInt(filter.screenId) : undefined;
    const movieId = filter.movieId ? parseInt(filter.movieId) : undefined;

    return this.prisma.screening.findMany({
      where: {
        ...(cinemaId && { screen: { cinemaId } }),
        ...(screenId && { screenId }),
        ...(movieId && { movieId }),
        ...(filter.startDate && filter.endDate && {
          startTime: {
            gte: new Date(filter.startDate),
            lte: new Date(filter.endDate),
          },
        }),
      },
      include: {
        movie: { select: { id: true, title: true, runtime: true, posterUrl: true } },
        screen: { include: { cinema: true, screenType: true } },
        _count: { select: { reservations: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async getOne(id: number) {
    return this.prisma.screening.findUnique({
      where: { id },
      include: {
        movie: true,
        screen: { include: { cinema: true, screenType: true } },
        reservations: {
          where: { status: { in: ['PENDING', 'PAID'] } },
          include: { customer: { select: { email: true, name: true } } },
        },
      },
    });
  }

  async delete(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const activeReservations = await tx.reservation.count({
        where: {
          screeningId: id,
          status: { in: ['PENDING', 'PAID'] },
        },
      });

      if (activeReservations > 0) {
        throw new BadRequestException(
          `진행 중인 예매가 ${activeReservations}건 있어 삭제할 수 없습니다.`,
        );
      }

      const reservationIds = await tx.reservation.findMany({
        where: { screeningId: id },
        select: { id: true },
      });
      const ids = reservationIds.map((r) => r.id);

      if (ids.length > 0) {
        await tx.couponUsage.deleteMany({
          where: { reservationId: { in: ids } },
        });
        await tx.partnerDiscountUsage.deleteMany({
          where: { reservationId: { in: ids } },
        });
        await tx.ticket.deleteMany({
          where: { reservationId: { in: ids } },
        });
        await tx.reservation.deleteMany({
          where: { screeningId: id },
        });
      }

      return tx.screening.delete({ where: { id } });
    });
  }

  async getCinemasWithScreens() {
    return this.prisma.cinema.findMany({
      include: {
        screens: { include: { screenType: true } },
      },
      orderBy: { name: 'asc' },
    });
  }
}
