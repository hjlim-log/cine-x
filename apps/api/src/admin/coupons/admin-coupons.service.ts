import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { IssueCouponDto } from './dto/issue-coupon.dto';
import { BulkIssueCouponDto } from './dto/bulk-issue-coupon.dto';
import { BulkIssueExecuteDto } from './dto/bulk-issue-execute.dto';

@Injectable()
export class AdminCouponsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const coupons = await this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const couponIds = coupons.map((c) => c.id);
    const stats = await this.prisma.userCoupon.groupBy({
      by: ['couponId', 'status'],
      where: { couponId: { in: couponIds } },
      _count: true,
    });

    return coupons.map((c) => {
      const couponStats = stats.filter((s) => s.couponId === c.id);
      const issued = couponStats.reduce((sum, s) => sum + s._count, 0);
      const used = couponStats.find((s) => s.status === 'USED')?._count ?? 0;
      const available = couponStats.find((s) => s.status === 'AVAILABLE')?._count ?? 0;
      const expired = couponStats.find((s) => s.status === 'EXPIRED')?._count ?? 0;

      return { ...c, stats: { issued, used, available, expired } };
    });
  }

  async getOne(id: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { userCoupons: true } } },
    });
    if (!coupon) throw new NotFoundException();

    const statsRows = await this.prisma.userCoupon.groupBy({
      by: ['status'],
      where: { couponId: id },
      _count: true,
    });
    const issued = statsRows.reduce((sum, s) => sum + s._count, 0);
    const used = statsRows.find((s) => s.status === 'USED')?._count ?? 0;
    const available = statsRows.find((s) => s.status === 'AVAILABLE')?._count ?? 0;
    const expired = statsRows.find((s) => s.status === 'EXPIRED')?._count ?? 0;

    return { ...coupon, stats: { issued, used, available, expired } };
  }

  async create(dto: CreateCouponDto) {
    return this.prisma.coupon.create({
      data: { ...dto, validDays: dto.validDays ?? 90 },
    });
  }

  async update(id: number, dto: UpdateCouponDto) {
    await this.getOne(id);
    return this.prisma.coupon.update({ where: { id }, data: dto });
  }

  async deactivate(id: number) {
    await this.getOne(id);
    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async issueToOne(dto: IssueCouponDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });
    if (!customer) {
      throw new NotFoundException(`사용자(${dto.email})를 찾을 수 없습니다.`);
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: { id: dto.couponId },
    });
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('사용할 수 없는 쿠폰입니다.');
    }

    const alreadyHas = await this.prisma.userCoupon.findFirst({
      where: { customerId: customer.id, couponId: coupon.id, status: 'AVAILABLE' },
    });
    if (alreadyHas) {
      throw new BadRequestException(`${dto.email}은(는) 이미 해당 쿠폰을 보유하고 있습니다.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const userCoupon = await tx.userCoupon.create({
        data: {
          customerId: customer.id,
          couponId: coupon.id,
          expiresAt: new Date(Date.now() + coupon.validDays * 24 * 60 * 60 * 1000),
        },
        include: { coupon: true },
      });

      await tx.coupon.update({
        where: { id: coupon.id },
        data: { totalIssued: { increment: 1 } },
      });

      return userCoupon;
    });
  }

  async previewBulkIssue(dto: BulkIssueCouponDto) {
    const where: any = {};

    if (dto.gradeNames?.length) {
      where.membershipGrade = { name: { in: dto.gradeNames } };
    }
    if (dto.joinedAfter) {
      where.createdAt = { ...where.createdAt, gte: new Date(dto.joinedAfter) };
    }
    if (dto.joinedBefore) {
      where.createdAt = { ...where.createdAt, lte: new Date(dto.joinedBefore) };
    }

    const customers = await this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        totalAmount: true,
        membershipGrade: { select: { name: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const existing = await this.prisma.userCoupon.findMany({
      where: {
        couponId: dto.couponId,
        customerId: { in: customers.map((c) => c.id) },
        status: 'AVAILABLE',
      },
      select: { customerId: true },
    });
    const existingIds = new Set(existing.map((e) => e.customerId));

    return customers.map((c) => ({ ...c, alreadyHas: existingIds.has(c.id) }));
  }

  async executeBulkIssue(dto: BulkIssueExecuteDto) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: dto.couponId },
    });
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('사용할 수 없는 쿠폰입니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.userCoupon.findMany({
        where: {
          couponId: dto.couponId,
          customerId: { in: dto.customerIds },
          status: 'AVAILABLE',
        },
        select: { customerId: true },
      });
      const existingIds = new Set(existing.map((e) => e.customerId));

      const targetIds = dto.customerIds.filter((id) => !existingIds.has(id));

      if (targetIds.length === 0) {
        return {
          issued: 0,
          skipped: dto.customerIds.length,
          reason: 'all_have_already',
        };
      }

      const expiresAt = new Date(Date.now() + coupon.validDays * 24 * 60 * 60 * 1000);

      await tx.userCoupon.createMany({
        data: targetIds.map((customerId) => ({
          customerId,
          couponId: coupon.id,
          expiresAt,
        })),
      });

      await tx.coupon.update({
        where: { id: coupon.id },
        data: { totalIssued: { increment: targetIds.length } },
      });

      return {
        issued: targetIds.length,
        skipped: dto.customerIds.length - targetIds.length,
      };
    });
  }
}
