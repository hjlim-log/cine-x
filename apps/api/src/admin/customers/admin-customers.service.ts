import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangeGradeDto } from './dto/change-grade.dto';
import { DeactivateDto } from './dto/deactivate.dto';

@Injectable()
export class AdminCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: {
    search?: string;
    gradeNames?: string[];
    includeInactive?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;

    const where: any = {};

    if (filter.search) {
      where.OR = [
        { email: { contains: filter.search, mode: 'insensitive' } },
        { name: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.gradeNames?.length) {
      where.membershipGrade = { name: { in: filter.gradeNames } };
    }

    if (!filter.includeInactive) {
      where.isActive = true;
    }

    const [customers, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        include: {
          membershipGrade: { select: { name: true, displayName: true, bgColor: true } },
          _count: {
            select: {
              reservations: true,
              coupons: true,
              inquiries: true,
              eventApplications: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      customers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        membershipGrade: true,
        membershipHistory: {
          orderBy: { changedAt: 'desc' },
          take: 5,
        },
        reservations: {
          include: {
            screening: {
              include: {
                movie: { select: { title: true, posterUrl: true } },
                screen: { include: { cinema: { select: { name: true } } } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        coupons: {
          include: { coupon: true },
          orderBy: { issuedAt: 'desc' },
          take: 10,
        },
        eventApplications: {
          include: {
            event: { select: { title: true } },
            prize: { select: { name: true } },
          },
          orderBy: { appliedAt: 'desc' },
          take: 5,
        },
        inquiries: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!customer) throw new NotFoundException('회원을 찾을 수 없습니다.');

    const [totalReservations, paidReservations, totalCoupons, availableCoupons] =
      await this.prisma.$transaction([
        this.prisma.reservation.count({ where: { customerId: id } }),
        this.prisma.reservation.count({ where: { customerId: id, status: 'PAID' } }),
        this.prisma.userCoupon.count({ where: { customerId: id } }),
        this.prisma.userCoupon.count({ where: { customerId: id, status: 'AVAILABLE' } }),
      ]);

    return {
      ...customer,
      stats: { totalReservations, paidReservations, totalCoupons, availableCoupons },
    };
  }

  async changeGrade(id: number, dto: ChangeGradeDto) {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id },
        include: { membershipGrade: true },
      });
      if (!customer) throw new NotFoundException('회원을 찾을 수 없습니다.');

      const newGrade = await tx.membershipGrade.findUnique({
        where: { id: dto.gradeId },
      });
      if (!newGrade) throw new BadRequestException('존재하지 않는 등급입니다.');

      if (customer.gradeId === dto.gradeId) {
        throw new BadRequestException('현재 등급과 동일합니다.');
      }

      const oldGradeName = customer.membershipGrade.name;
      const newGradeName = newGrade.name;

      await tx.customer.update({
        where: { id },
        data: { gradeId: dto.gradeId },
      });

      const order = ['WELCOME', 'VIP', 'VVIP', 'LVIP'];
      const oldIdx = order.indexOf(oldGradeName);
      const newIdx = order.indexOf(newGradeName);
      const changeType = newIdx > oldIdx ? 'UPGRADE' : 'DOWNGRADE';

      await tx.membershipHistory.create({
        data: {
          customerId: id,
          fromGrade: oldGradeName,
          toGrade: newGradeName,
          changeType: `MANUAL_${changeType}`,
          totalAmount: customer.totalAmount,
        },
      });

      return {
        message: `${customer.email} 등급을 ${oldGradeName} → ${newGradeName}로 변경했습니다.`,
        reason: dto.reason,
      };
    });
  }

  async deactivate(id: number, dto: DeactivateDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('회원을 찾을 수 없습니다.');
    if (!customer.isActive) throw new BadRequestException('이미 비활성화된 회원입니다.');
    if (customer.role === 'ADMIN') throw new ForbiddenException('관리자 계정은 비활성화할 수 없습니다.');

    return this.prisma.customer.update({
      where: { id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: 'ADMIN',
        deactivateReason: dto.reason ?? '운영자 처리',
      },
    });
  }

  async reactivate(id: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('회원을 찾을 수 없습니다.');
    if (customer.isActive) throw new BadRequestException('이미 활성화된 회원입니다.');

    return this.prisma.customer.update({
      where: { id },
      data: {
        isActive: true,
        deactivatedAt: null,
        deactivatedBy: null,
        deactivateReason: null,
      },
    });
  }
}
