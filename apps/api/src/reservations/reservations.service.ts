import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { MembershipService } from '../membership/membership.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

const PENDING_TTL_MS = 10 * 60 * 1000; // 10분

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly membershipService: MembershipService,
  ) {}

  async create(customerId: number, dto: CreateReservationDto) {
    const { screeningId, seatIds } = dto;

    try {
      return await this.prisma.$transaction(
        async (tx) => {
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

          const breakdown = await this.pricingService.calculate({
            screeningId,
            seatIds,
            audienceCounts: dto.audienceCounts,
            userCouponId: dto.userCouponId,
            customerId,
            partnerDiscountId: dto.partnerDiscountId,
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

          // 쿠폰 RESERVED 처리 (tx 안에서 AVAILABLE 재확인으로 동시 사용 방지)
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

          if (dto.partnerDiscountId && breakdown.partnerDiscount > 0) {
            await tx.partnerDiscountUsage.create({
              data: {
                partnerDiscountId: dto.partnerDiscountId,
                reservationId: reservation.id,
                discountAmount: breakdown.partnerDiscount,
              },
            });
          }

          return reservation;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (e: unknown) {
      // 직렬화 충돌(P2034): 동시 예매가 Serializable SSI에서 감지된 경우
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') {
        throw new ConflictException('이미 예매된 좌석이 포함되어 있습니다.');
      }
      throw e;
    }
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
        partnerDiscountUsage: {
          select: {
            discountAmount: true,
            partnerDiscount: { select: { name: true, partnerName: true } },
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
        partnerDiscountUsage: {
          select: {
            discountAmount: true,
            partnerDiscount: { select: { name: true, partnerName: true } },
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

  async applyPartnerDiscount(id: number, customerId: number, partnerDiscountId?: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { couponUsage: true, tickets: true },
    });
    if (!reservation) throw new NotFoundException('예매 내역을 찾을 수 없습니다.');
    if (reservation.customerId !== customerId) throw new ForbiddenException('권한이 없습니다.');
    if (reservation.status !== 'PENDING') {
      throw new BadRequestException('결제 대기 상태의 예매만 변경 가능합니다.');
    }

    const breakdown = await this.pricingService.calculate({
      screeningId: reservation.screeningId,
      seatIds: reservation.tickets.map((t) => t.seatId),
      audienceCounts: (reservation.audienceCounts as Record<string, number>) ?? {},
      userCouponId: reservation.couponUsage?.userCouponId ?? undefined,
      customerId,
      partnerDiscountId,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.reservation.update({ where: { id }, data: { totalAmount: breakdown.totalAmount } });
      await tx.partnerDiscountUsage.deleteMany({ where: { reservationId: id } });
      if (partnerDiscountId && breakdown.partnerDiscount > 0) {
        await tx.partnerDiscountUsage.create({
          data: { partnerDiscountId, reservationId: id, discountAmount: breakdown.partnerDiscount },
        });
      }
    });

    return breakdown;
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
      if (reservation.status === 'PAID') {
        await this.membershipService.subtractFromTotalAmount(tx, reservation.customerId, reservation.totalAmount);
      }
      return tx.reservation.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    });
  }
}
