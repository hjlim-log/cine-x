import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: { category?: string; status?: string }) {
    return this.prisma.event.findMany({
      where: {
        ...(filter.category && { category: filter.category }),
        ...(filter.status && { status: filter.status }),
      },
      include: {
        prizes: { include: { coupon: true } },
        movie: { select: { id: true, title: true, posterUrl: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: number, customerId?: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        prizes: { include: { coupon: true } },
        movie: true,
        cinemas: { include: { cinema: true } },
      },
    });
    if (!event) throw new NotFoundException('이벤트를 찾을 수 없습니다.');

    const myApplication = customerId
      ? await this.prisma.eventApplication.findUnique({
          where: { eventId_customerId: { eventId: id, customerId } },
          include: { prize: true, userCoupon: { include: { coupon: true } } },
        })
      : null;

    return { ...event, myApplication };
  }

  async apply(customerId: number, eventId: number) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('이벤트를 찾을 수 없습니다.');
    if (event.status !== 'ONGOING') {
      throw new BadRequestException('현재 응모 가능한 이벤트가 아닙니다.');
    }
    if (!event.isApplicable) {
      throw new BadRequestException('응모할 수 없는 이벤트입니다.');
    }
    if (new Date() > event.endDate) {
      throw new BadRequestException('이벤트 응모 기간이 종료되었습니다.');
    }

    if (event.category === 'MEMBERSHIP' && event.title.includes('VIP')) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        include: { membershipGrade: true },
      });
      if (!['VIP', 'VVIP', 'LVIP'].includes(customer!.membershipGrade.name)) {
        throw new ForbiddenException('VIP 이상 등급만 응모 가능합니다.');
      }
    }

    try {
      return await this.prisma.eventApplication.create({
        data: { eventId, customerId },
        include: { event: { select: { id: true, title: true } } },
      });
    } catch (error: any) {
      if (error.code === 'P2002') throw new ConflictException('이미 응모한 이벤트입니다.');
      throw error;
    }
  }

  async getMyApplications(customerId: number) {
    return this.prisma.eventApplication.findMany({
      where: { customerId },
      include: {
        event: { select: { id: true, title: true, imageUrl: true, status: true } },
        prize: true,
        userCoupon: { include: { coupon: true } },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async markNotificationRead(customerId: number, applicationId: number) {
    const application = await this.prisma.eventApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application || application.customerId !== customerId) {
      throw new ForbiddenException();
    }
    return this.prisma.eventApplication.update({
      where: { id: applicationId },
      data: { notificationRead: true },
    });
  }

  async drawWinners(eventId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { prizes: true, applications: true },
    });
    if (!event) throw new NotFoundException('이벤트가 없습니다.');
    if (event.status === 'DRAWN') throw new BadRequestException('이미 추첨이 완료된 이벤트입니다.');

    return this.prisma.$transaction(async (tx) => {
      const applications = event.applications.filter((a) => a.status === 'PENDING');

      // Fisher-Yates 셔플 (Math.sort 편향 방지)
      const shuffled = [...applications];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      let cursor = 0;
      const winners: { applicationId: number; customerId: number; prizeName: string }[] = [];

      for (const prize of event.prizes) {
        if (cursor >= shuffled.length) break;
        const count = Math.min(prize.quantity, shuffled.length - cursor);
        const prizeWinners = shuffled.slice(cursor, cursor + count);
        cursor += count;

        for (const application of prizeWinners) {
          let userCouponId: number | null = null;

          if (prize.type === 'COUPON' && prize.couponId) {
            const coupon = await tx.coupon.findUnique({ where: { id: prize.couponId } });
            if (coupon) {
              const userCoupon = await tx.userCoupon.create({
                data: {
                  customerId: application.customerId,
                  couponId: prize.couponId,
                  expiresAt: new Date(Date.now() + coupon.validDays * 24 * 60 * 60 * 1000),
                },
              });
              userCouponId = userCoupon.id;
              await tx.coupon.update({
                where: { id: prize.couponId },
                data: { totalIssued: { increment: 1 } },
              });
            }
          }

          await tx.eventApplication.update({
            where: { id: application.id },
            data: {
              status: 'WON',
              prizeId: prize.id,
              userCouponId,
              drawnAt: new Date(),
            },
          });

          winners.push({
            applicationId: application.id,
            customerId: application.customerId,
            prizeName: prize.name,
          });
        }
      }

      // 나머지는 낙첨
      const winnerIds = new Set(winners.map((w) => w.applicationId));
      const losers = applications.filter((a) => !winnerIds.has(a.id));
      if (losers.length > 0) {
        await tx.eventApplication.updateMany({
          where: { id: { in: losers.map((l) => l.id) } },
          data: { status: 'LOST', drawnAt: new Date() },
        });
      }

      await tx.event.update({
        where: { id: eventId },
        data: { status: 'DRAWN', drawnAt: new Date() },
      });

      return {
        totalApplications: applications.length,
        winners: winners.length,
        losers: losers.length,
        winnersList: winners,
      };
    });
  }
}
