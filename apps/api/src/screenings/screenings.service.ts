import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScreeningsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: number) {
    const screening = await this.prisma.screening.findUnique({
      where: { id },
      include: {
        movie: true,
        screen: {
          include: {
            cinema: true,
            screenType: true,
            seats: {
              include: { seatType: true },
              orderBy: [{ row: 'asc' }, { number: 'asc' }],
            },
          },
        },
      },
    });
    if (!screening)
      throw new NotFoundException('상영 정보를 찾을 수 없습니다.');

    // PAID 또는 만료되지 않은 PENDING이 점유한 좌석만 잠금
    // EXPIRED·CANCELLED·10분 초과 PENDING 좌석은 다시 예약 가능
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const activeReservations = await this.prisma.reservation.findMany({
      where: {
        screeningId: id,
        OR: [
          { status: 'PAID' },
          { status: 'PENDING', createdAt: { gte: tenMinutesAgo } },
        ],
      },
      include: { tickets: { select: { seatId: true } } },
    });
    const bookedSeatIds = activeReservations.flatMap((r) =>
      r.tickets.map((t) => t.seatId),
    );

    // screenType → type, seatType → type 으로 rename (Prisma 관계명 정리)
    const {
      screenType: screenTypeObj,
      seats: rawSeats,
      ...screenFields
    } = screening.screen;
    const seats = rawSeats.map(({ seatType, ...seatFields }) => ({
      ...seatFields,
      type: seatType,
    }));

    return {
      ...screening,
      screen: { ...screenFields, type: screenTypeObj, seats },
      bookedSeatIds,
    };
  }
}
