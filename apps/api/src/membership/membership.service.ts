import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

const GRADE_ORDER = ['WELCOME', 'VIP', 'VVIP', 'LVIP'];

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async addToTotalAmount(tx: Tx, customerId: number, amount: number) {
    const customer = await tx.customer.findUniqueOrThrow({
      where: { id: customerId },
      include: { membershipGrade: true },
    });

    const newTotal = Math.max(0, customer.totalAmount + amount);
    const oldGradeName = customer.membershipGrade.name;
    const newGrade = await this.findGradeByAmount(tx, newTotal);

    await tx.customer.update({
      where: { id: customerId },
      data: { totalAmount: newTotal, gradeId: newGrade.id },
    });

    if (newGrade.name !== oldGradeName) {
      const direction = this.compareGrades(oldGradeName, newGrade.name);

      await tx.membershipHistory.create({
        data: {
          customerId,
          fromGrade: oldGradeName,
          toGrade: newGrade.name,
          changeType: direction === 'UP' ? 'UPGRADE' : 'DOWNGRADE',
          totalAmount: newTotal,
        },
      });

      if (direction === 'UP') {
        await this.issueGradeRewards(tx, customerId, newGrade.id);
      }

      return { oldGrade: oldGradeName, newGrade: newGrade.name, upgraded: direction === 'UP', totalAmount: newTotal };
    }

    return { oldGrade: oldGradeName, newGrade: oldGradeName, upgraded: false, totalAmount: newTotal };
  }

  async subtractFromTotalAmount(tx: Tx, customerId: number, amount: number) {
    return this.addToTotalAmount(tx, customerId, -amount);
  }

  async getMyMembership(customerId: number) {
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      include: {
        membershipGrade: { include: { rewards: { include: { coupon: true } } } },
        membershipHistory: { orderBy: { changedAt: 'desc' }, take: 10 },
      },
    });

    const nextGrade = await this.prisma.membershipGrade.findFirst({
      where: { minAmount: { gt: customer.totalAmount } },
      orderBy: { minAmount: 'asc' },
    });

    return {
      currentGrade: customer.membershipGrade,
      totalAmount: customer.totalAmount,
      nextGrade,
      amountToNext: nextGrade ? nextGrade.minAmount - customer.totalAmount : null,
      history: customer.membershipHistory,
    };
  }

  async getAllGrades() {
    return this.prisma.membershipGrade.findMany({
      include: { rewards: { include: { coupon: true } } },
      orderBy: { minAmount: 'asc' },
    });
  }

  private async findGradeByAmount(tx: Tx, amount: number) {
    return tx.membershipGrade.findFirstOrThrow({
      where: {
        minAmount: { lte: amount },
        OR: [{ maxAmount: null }, { maxAmount: { gte: amount } }],
      },
      orderBy: { minAmount: 'desc' },
    });
  }

  private compareGrades(oldName: string, newName: string): 'UP' | 'SAME' | 'DOWN' {
    const oldIdx = GRADE_ORDER.indexOf(oldName);
    const newIdx = GRADE_ORDER.indexOf(newName);
    if (newIdx > oldIdx) return 'UP';
    if (newIdx < oldIdx) return 'DOWN';
    return 'SAME';
  }

  private async issueGradeRewards(tx: Tx, customerId: number, gradeId: number) {
    const rewards = await tx.membershipReward.findMany({
      where: { gradeId },
      include: { coupon: true },
    });

    for (const reward of rewards) {
      for (let i = 0; i < reward.quantity; i++) {
        await tx.userCoupon.create({
          data: {
            customerId,
            couponId: reward.couponId,
            expiresAt: new Date(Date.now() + reward.coupon.validDays * 24 * 60 * 60 * 1000),
          },
        });
        await tx.coupon.update({
          where: { id: reward.couponId },
          data: { totalIssued: { increment: 1 } },
        });
      }
    }
  }
}
