import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

const PENDING_TTL_MS = 10 * 60 * 1000; // 10분

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: number, dto: CreateReservationDto) {
    const { screeningId, seatIds } = dto;

    return this.prisma.$transaction(async (tx) => {
      // 유효한 예매(PAID 또는 만료되지 않은 PENDING)가 점유한 좌석만 차단
      const tenMinutesAgo = new Date(Date.now() - PENDING_TTL_MS);
      const conflicts = await tx.ticket.findMany({
        where: {
          seatId: { in: seatIds },
          reservation: {
            screeningId,
            OR: [
              { status: 'PAID' },
              { status: 'PENDING', createdAt: { gte: tenMinutesAgo } },
            ],
          },
        },
      });
      if (conflicts.length > 0) {
        throw new ConflictException('이미 예매된 좌석이 포함되어 있습니다.');
      }

      // 좌석 유형별 가격 계산 (기본가 + additionalPrice) — 클라이언트 금액 일절 신뢰 안 함
      const BASE_PRICE = 12_000;
      const seats = await tx.seat.findMany({
        where: { id: { in: seatIds } },
        include: { seatType: true },
      });
      if (seats.length !== seatIds.length) {
        throw new BadRequestException('유효하지 않은 좌석 ID가 포함되어 있습니다.');
      }
      const priceMap = new Map(seats.map((s) => [s.id, BASE_PRICE + s.seatType.additionalPrice]));
      const totalAmount = seatIds.reduce((sum, id) => sum + priceMap.get(id)!, 0);

      return tx.reservation.create({
        data: {
          orderId: randomUUID(),
          totalAmount,
          status: 'PENDING',
          customerId,
          screeningId,
          tickets: {
            create: seatIds.map((seatId) => ({ seatId, price: priceMap.get(seatId) ?? BASE_PRICE })),
          },
        },
        include: {
          customer: { select: { email: true, name: true } },
          tickets: { include: { seat: true } },
          screening: {
            include: {
              movie: true,
              screen: { include: { cinema: true } },
            },
          },
        },
      });
    });
  }

  async findOne(id: number, customerId: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        customer: { select: { email: true, name: true } },
        tickets: {
          include: { seat: { include: { seatType: true } } },
        },
        screening: {
          include: {
            movie: true,
            screen: { include: { cinema: true } },
          },
        },
      },
    });
    if (!reservation) throw new NotFoundException('예매 내역을 찾을 수 없습니다.');
    if (reservation.customerId !== customerId) {
      throw new ForbiddenException('조회 권한이 없습니다.');
    }
    return reservation;
  }

  async findMyReservations(customerId: number) {
    const tenMinutesAgo = new Date(Date.now() - PENDING_TTL_MS);
    const reservations = await this.prisma.reservation.findMany({
      where: { customerId },
      include: {
        tickets: {
          include: { seat: { include: { seatType: true } } },
        },
        screening: {
          include: {
            movie: true,
            screen: { include: { cinema: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return reservations.map((r) => ({
      ...r,
      canResumePayment: r.status === 'PENDING' && r.createdAt >= tenMinutesAgo,
    }));
  }

  // 매분 실행: 10분 초과 PENDING → EXPIRED 일괄 전환
  @Cron('0 * * * * *')
  async expirePendingReservations() {
    const tenMinutesAgo = new Date(Date.now() - PENDING_TTL_MS);
    await this.prisma.reservation.updateMany({
      where: { status: 'PENDING', createdAt: { lt: tenMinutesAgo } },
      data: { status: 'EXPIRED' },
    });
  }

  async cancel(id: number, customerId: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });
    if (!reservation) throw new NotFoundException('예매 내역을 찾을 수 없습니다.');
    if (reservation.customerId !== customerId) {
      throw new ForbiddenException('취소 권한이 없습니다.');
    }
    if (!['PENDING', 'PAID'].includes(reservation.status)) {
      throw new BadRequestException(`${reservation.status} 상태는 취소할 수 없습니다.`);
    }

    return this.prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
