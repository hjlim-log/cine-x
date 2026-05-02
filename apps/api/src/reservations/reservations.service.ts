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
import { PricingService } from '../pricing/pricing.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

const PENDING_TTL_MS = 10 * 60 * 1000; // 10분

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

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

      // 가격 계산 + 쿠폰 검증 (클라이언트 금액 일절 신뢰 안 함)
      const breakdown = await this.pricingService.calculate({
        screeningId,
        seatIds,
        audienceCounts: dto.audienceCounts,
        userCouponId: dto.userCouponId,
        customerId,
      });

      const reservation = await tx.reservation.create({
        data: {
          orderId: randomUUID(),
          totalAmount: breakdown.totalAmount,
          audienceCounts: dto.audienceCounts as Record<string, number>,
          status: 'PENDING',
          customerId,
          screeningId,
          tickets: {
            create: seatIds.map((seatId) => ({ seatId, price: 0 })),
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

      // 쿠폰 RESERVED 처리 (동시성 방지: tx 안에서 AVAILABLE 재확인)
      if (dto.userCouponId) {
        const uc = await tx.userCoupon.findUnique({ where: { id: dto.userCouponId } });
        if (!uc || uc.status !== 'AVAILABLE') {
          throw new ConflictException('이미 사용 중인 쿠폰입니다.');
        }
        await tx.userCoupon.update({
          where: { id: dto.userCouponId },
          data: { status: 'RESERVED' },
        });
        await tx.couponUsage.create({
          data: {
            userCouponId: dto.userCouponId,
            reservationId: reservation.id,
            discountAmount: breakdown.couponDiscount,
          },
        });
      }

      return reservation;
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
        couponUsage: {
          select: {
            discountAmount: true,
            userCoupon: {
              select: {
                id: true,
                coupon: { select: { name: true, type: true } },
              },
            },
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
        couponUsage: {
          select: {
            discountAmount: true,
            userCoupon: {
              select: {
                id: true,
                coupon: { select: { name: true, type: true } },
              },
            },
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

  // 매분 실행: 10분 초과 PENDING → EXPIRED 일괄 전환, 묶인 쿠폰 복구
  @Cron('0 * * * * *')
  async expirePendingReservations() {
    const tenMinutesAgo = new Date(Date.now() - PENDING_TTL_MS);

    const expiring = await this.prisma.reservation.findMany({
      where: { status: 'PENDING', createdAt: { lt: tenMinutesAgo } },
      include: { couponUsage: true },
    });

    for (const r of expiring) {
      if (r.couponUsage) {
        await this.prisma.userCoupon.update({
          where: { id: r.couponUsage.userCouponId },
          data: { status: 'AVAILABLE' },
        });
        await this.prisma.couponUsage.delete({ where: { id: r.couponUsage.id } });
      }
    }

    await this.prisma.reservation.updateMany({
      where: { status: 'PENDING', createdAt: { lt: tenMinutesAgo } },
      data: { status: 'EXPIRED' },
    });
  }

  async cancel(id: number, customerId: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { couponUsage: true },
    });
    if (!reservation) throw new NotFoundException('예매 내역을 찾을 수 없습니다.');
    if (reservation.customerId !== customerId) {
      throw new ForbiddenException('취소 권한이 없습니다.');
    }
    if (!['PENDING', 'PAID'].includes(reservation.status)) {
      throw new BadRequestException(`${reservation.status} 상태는 취소할 수 없습니다.`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (reservation.couponUsage) {
        await tx.userCoupon.update({
          where: { id: reservation.couponUsage.userCouponId },
          data: { status: 'AVAILABLE' },
        });
        await tx.couponUsage.delete({ where: { id: reservation.couponUsage.id } });
      }
      return tx.reservation.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    });
  }
}
