import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async issueWelcomeCoupons(customerId: number) {
    const welcomeCoupons = await this.prisma.coupon.findMany({
      where: { issuePolicy: 'WELCOME', isActive: true },
    });

    for (const coupon of welcomeCoupons) {
      await this.prisma.userCoupon.create({
        data: {
          customerId,
          couponId: coupon.id,
          expiresAt: new Date(
            Date.now() + coupon.validDays * 24 * 60 * 60 * 1000,
          ),
        },
      });
      await this.prisma.coupon.update({
        where: { id: coupon.id },
        data: { totalIssued: { increment: 1 } },
      });
    }
  }

  async redeemByCode(customerId: number, code: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon) throw new NotFoundException('존재하지 않는 쿠폰 코드입니다.');
    if (!coupon.isActive)
      throw new BadRequestException('비활성화된 쿠폰입니다.');
    if (coupon.issuePolicy !== 'CODE') {
      throw new BadRequestException('코드로 발급할 수 없는 쿠폰입니다.');
    }

    const existing = await this.prisma.userCoupon.findFirst({
      where: { customerId, couponId: coupon.id, status: 'AVAILABLE' },
    });
    if (existing) throw new ConflictException('이미 보유한 쿠폰입니다.');

    const userCoupon = await this.prisma.userCoupon.create({
      data: {
        customerId,
        couponId: coupon.id,
        expiresAt: new Date(
          Date.now() + coupon.validDays * 24 * 60 * 60 * 1000,
        ),
      },
      include: { coupon: true },
    });

    await this.prisma.coupon.update({
      where: { id: coupon.id },
      data: { totalIssued: { increment: 1 } },
    });

    return userCoupon;
  }

  async getMyCoupons(
    customerId: number,
    status: 'AVAILABLE' | 'USED' | 'EXPIRED' = 'AVAILABLE',
  ) {
    if (status === 'AVAILABLE') {
      await this.prisma.userCoupon.updateMany({
        where: {
          customerId,
          status: 'AVAILABLE',
          expiresAt: { lt: new Date() },
        },
        data: { status: 'EXPIRED' },
      });
    }

    return this.prisma.userCoupon.findMany({
      where: { customerId, status },
      include: { coupon: true, usage: true },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async getApplicableCoupons(customerId: number, totalAmount: number) {
    const myCoupons = await this.getMyCoupons(customerId, 'AVAILABLE');
    return myCoupons.filter((uc) => totalAmount >= uc.coupon.minPurchase);
  }
}
