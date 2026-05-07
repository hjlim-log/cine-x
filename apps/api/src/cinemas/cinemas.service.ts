import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CinemasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const cinemas = await this.prisma.cinema.findMany({
      include: { _count: { select: { screens: true } } },
      orderBy: [{ region: 'asc' }, { name: 'asc' }],
    });
    return cinemas.map(({ _count, ...c }) => ({
      ...c,
      screenCount: _count.screens,
    }));
  }

  async findOne(id: number) {
    const cinema = await this.prisma.cinema.findUnique({
      where: { id },
      include: { screens: true },
    });
    if (!cinema) throw new NotFoundException('영화관을 찾을 수 없습니다.');

    const now = new Date();
    const until = new Date();
    until.setDate(until.getDate() + 5);
    until.setHours(23, 59, 59, 999);

    const screenIds = cinema.screens.map((s) => s.id);
    const screenings = await this.prisma.screening.findMany({
      where: {
        screenId: { in: screenIds },
        startTime: { gte: now, lte: until },
      },
      include: {
        movie: true,
        screen: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return { ...cinema, screenings };
  }
}
