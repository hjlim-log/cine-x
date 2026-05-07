import { Test } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Prisma, PrismaClient } from '@prisma/client';
import { MembershipService } from './membership.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── 등급 픽스처 (seed.ts 기준) ───────────────────────────────────────────────
const G = {
  WELCOME: { id: 1, name: 'WELCOME', displayName: '웰컴', description: null, minAmount: 0,      maxAmount: 49999,  discountPercent: 0, maxDiscount: null, bgColor: '#6b7280', iconUrl: null },
  VIP:     { id: 2, name: 'VIP',     displayName: 'VIP',  description: null, minAmount: 50000,  maxAmount: 199999, discountPercent: 3, maxDiscount: 3000, bgColor: '#dc2626', iconUrl: null },
  VVIP:    { id: 3, name: 'VVIP',    displayName: 'VVIP', description: null, minAmount: 200000, maxAmount: 499999, discountPercent: 5, maxDiscount: 5000, bgColor: '#7c3aed', iconUrl: null },
  LVIP:    { id: 4, name: 'LVIP',    displayName: 'LVIP', description: null, minAmount: 500000, maxAmount: null,   discountPercent: 7, maxDiscount: 8000, bgColor: '#fbbf24', iconUrl: null },
};

type GradeKey = keyof typeof G;

function makeCustomer(totalAmount: number, gradeKey: GradeKey) {
  const grade = G[gradeKey];
  return {
    id: 1, email: 'u@test.local', password: 'h', name: 'T',
    phone: null, role: 'USER', totalAmount,
    gradeId: grade.id, isActive: true,
    deactivatedAt: null, deactivatedBy: null, deactivateReason: null,
    createdAt: new Date(),
    membershipGrade: grade,
  };
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('MembershipService', () => {
  let service: MembershipService;
  let tx: DeepMockProxy<Prisma.TransactionClient>;

  beforeEach(async () => {
    const prisma = mockDeep<PrismaClient>();
    tx = mockDeep<Prisma.TransactionClient>();

    const module = await Test.createTestingModule({
      providers: [
        MembershipService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(MembershipService);
  });

  // ─── 공통 mock 헬퍼 ─────────────────────────────────────────────────────────
  function setupBasicTx(currentGradeKey: GradeKey, currentTotal: number, nextGrade: typeof G[GradeKey]) {
    tx.customer.findUniqueOrThrow.mockResolvedValue(makeCustomer(currentTotal, currentGradeKey) as any);
    tx.membershipGrade.findFirstOrThrow.mockResolvedValue(nextGrade as any);
    tx.customer.update.mockResolvedValue({} as any);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  describe('등급 자동 산정 — findGradeByAmount 쿼리 검증', () => {
    it('누적 0원 → findFirstOrThrow를 amount=0으로 호출', async () => {
      setupBasicTx('WELCOME', 0, G.WELCOME);

      const result = await service.addToTotalAmount(tx, 1, 0);

      expect(tx.membershipGrade.findFirstOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ minAmount: { lte: 0 } }) }),
      );
      expect(result.newGrade).toBe('WELCOME');
      expect(result.totalAmount).toBe(0);
    });

    it('누적 49,999원 → WELCOME 경계 직전: amount=49999로 쿼리', async () => {
      setupBasicTx('WELCOME', 0, G.WELCOME);

      await service.addToTotalAmount(tx, 1, 49999);

      expect(tx.membershipGrade.findFirstOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ minAmount: { lte: 49999 } }) }),
      );
    });

    it('누적 50,000원 → VIP 경계 정확히: amount=50000으로 쿼리', async () => {
      tx.customer.findUniqueOrThrow.mockResolvedValue(makeCustomer(0, 'WELCOME') as any);
      tx.membershipGrade.findFirstOrThrow.mockResolvedValue(G.VIP as any);
      tx.customer.update.mockResolvedValue({} as any);
      tx.membershipHistory.create.mockResolvedValue({} as any);
      tx.membershipReward.findMany.mockResolvedValue([] as any);

      await service.addToTotalAmount(tx, 1, 50000);

      expect(tx.membershipGrade.findFirstOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ minAmount: { lte: 50000 } }) }),
      );
    });

    it('누적 200,000원 → VVIP 경계: amount=200000으로 쿼리', async () => {
      tx.customer.findUniqueOrThrow.mockResolvedValue(makeCustomer(0, 'WELCOME') as any);
      tx.membershipGrade.findFirstOrThrow.mockResolvedValue(G.VVIP as any);
      tx.customer.update.mockResolvedValue({} as any);
      tx.membershipHistory.create.mockResolvedValue({} as any);
      tx.membershipReward.findMany.mockResolvedValue([] as any);

      await service.addToTotalAmount(tx, 1, 200000);

      expect(tx.membershipGrade.findFirstOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ minAmount: { lte: 200000 } }) }),
      );
    });

    it('누적 1,000,000원 → LVIP(최상위): amount=1000000으로 쿼리', async () => {
      tx.customer.findUniqueOrThrow.mockResolvedValue(makeCustomer(0, 'WELCOME') as any);
      tx.membershipGrade.findFirstOrThrow.mockResolvedValue(G.LVIP as any);
      tx.customer.update.mockResolvedValue({} as any);
      tx.membershipHistory.create.mockResolvedValue({} as any);
      tx.membershipReward.findMany.mockResolvedValue([] as any);

      await service.addToTotalAmount(tx, 1, 1000000);

      expect(tx.membershipGrade.findFirstOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ minAmount: { lte: 1000000 } }) }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('addToTotalAmount', () => {
    it('WELCOME → VIP 승급: upgraded=true, 등급 변경 반환', async () => {
      tx.customer.findUniqueOrThrow.mockResolvedValue(makeCustomer(0, 'WELCOME') as any);
      tx.membershipGrade.findFirstOrThrow.mockResolvedValue(G.VIP as any);
      tx.customer.update.mockResolvedValue({} as any);
      tx.membershipHistory.create.mockResolvedValue({} as any);
      tx.membershipReward.findMany.mockResolvedValue([] as any);

      const result = await service.addToTotalAmount(tx, 1, 50000);

      expect(result.upgraded).toBe(true);
      expect(result.oldGrade).toBe('WELCOME');
      expect(result.newGrade).toBe('VIP');
      expect(result.totalAmount).toBe(50000);
    });

    it('VIP 범위 내 추가 결제 → 등급 변동 없음(upgraded=false)', async () => {
      // 75000 + 50000 = 125000 → 여전히 VIP
      setupBasicTx('VIP', 75000, G.VIP);

      const result = await service.addToTotalAmount(tx, 1, 50000);

      expect(result.upgraded).toBe(false);
      expect(result.newGrade).toBe('VIP');
      expect(result.totalAmount).toBe(125000);
      // 등급 변동 없으므로 history 미기록
      expect(tx.membershipHistory.create).not.toHaveBeenCalled();
    });

    it('승급 시 MembershipHistory changeType=UPGRADE로 기록', async () => {
      tx.customer.findUniqueOrThrow.mockResolvedValue(makeCustomer(0, 'WELCOME') as any);
      tx.membershipGrade.findFirstOrThrow.mockResolvedValue(G.VIP as any);
      tx.customer.update.mockResolvedValue({} as any);
      tx.membershipHistory.create.mockResolvedValue({} as any);
      tx.membershipReward.findMany.mockResolvedValue([] as any);

      await service.addToTotalAmount(tx, 1, 50000);

      expect(tx.membershipHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: 1,
            fromGrade: 'WELCOME',
            toGrade: 'VIP',
            changeType: 'UPGRADE',
            totalAmount: 50000,
          }),
        }),
      );
    });

    it('승급 시 보상 쿠폰 자동 발급 (quantity=1 → userCoupon 1개 생성)', async () => {
      tx.customer.findUniqueOrThrow.mockResolvedValue(makeCustomer(0, 'WELCOME') as any);
      tx.membershipGrade.findFirstOrThrow.mockResolvedValue(G.VIP as any);
      tx.customer.update.mockResolvedValue({} as any);
      tx.membershipHistory.create.mockResolvedValue({} as any);
      tx.membershipReward.findMany.mockResolvedValue([
        {
          id: 1, gradeId: G.VIP.id, couponId: 10, quantity: 1,
          coupon: { id: 10, code: 'WELCOME2026', name: '환영쿠폰', validDays: 90 },
        },
      ] as any);
      tx.userCoupon.create.mockResolvedValue({} as any);
      tx.coupon.update.mockResolvedValue({} as any);

      await service.addToTotalAmount(tx, 1, 50000);

      expect(tx.userCoupon.create).toHaveBeenCalledTimes(1);
      expect(tx.userCoupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ customerId: 1, couponId: 10 }),
        }),
      );
      expect(tx.coupon.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: { totalIssued: { increment: 1 } },
        }),
      );
    });

    it('quantity=2인 보상 → userCoupon 2개 생성', async () => {
      tx.customer.findUniqueOrThrow.mockResolvedValue(makeCustomer(0, 'WELCOME') as any);
      tx.membershipGrade.findFirstOrThrow.mockResolvedValue(G.VVIP as any);
      tx.customer.update.mockResolvedValue({} as any);
      tx.membershipHistory.create.mockResolvedValue({} as any);
      tx.membershipReward.findMany.mockResolvedValue([
        {
          id: 1, gradeId: G.VVIP.id, couponId: 20, quantity: 2,
          coupon: { id: 20, code: 'VVIP-BONUS', name: 'VVIP보너스', validDays: 60 },
        },
      ] as any);
      tx.userCoupon.create.mockResolvedValue({} as any);
      tx.coupon.update.mockResolvedValue({} as any);

      await service.addToTotalAmount(tx, 1, 200000);

      expect(tx.userCoupon.create).toHaveBeenCalledTimes(2);
      expect(tx.coupon.update).toHaveBeenCalledTimes(2);
    });

    it('음수 방지: 0원 미만으로 내려가지 않음', async () => {
      setupBasicTx('WELCOME', 0, G.WELCOME);

      const result = await service.addToTotalAmount(tx, 1, -99999);

      // Math.max(0, 0 - 99999) = 0
      expect(tx.membershipGrade.findFirstOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ minAmount: { lte: 0 } }) }),
      );
      expect(result.totalAmount).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('subtractFromTotalAmount', () => {
    it('VIP(60,000) → 50,000원 차감 → WELCOME 강등, changeType=DOWNGRADE', async () => {
      // 60000 - 50000 = 10000 → WELCOME 범위
      tx.customer.findUniqueOrThrow.mockResolvedValue(makeCustomer(60000, 'VIP') as any);
      tx.membershipGrade.findFirstOrThrow.mockResolvedValue(G.WELCOME as any);
      tx.customer.update.mockResolvedValue({} as any);
      tx.membershipHistory.create.mockResolvedValue({} as any);

      const result = await service.subtractFromTotalAmount(tx, 1, 50000);

      expect(result.upgraded).toBe(false);
      expect(result.oldGrade).toBe('VIP');
      expect(result.newGrade).toBe('WELCOME');
      expect(result.totalAmount).toBe(10000);

      expect(tx.membershipHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromGrade: 'VIP',
            toGrade: 'WELCOME',
            changeType: 'DOWNGRADE',
          }),
        }),
      );
    });

    it('강등 시 보상 쿠폰 발급 없음 (DOWN이면 issueGradeRewards 미호출)', async () => {
      tx.customer.findUniqueOrThrow.mockResolvedValue(makeCustomer(60000, 'VIP') as any);
      tx.membershipGrade.findFirstOrThrow.mockResolvedValue(G.WELCOME as any);
      tx.customer.update.mockResolvedValue({} as any);
      tx.membershipHistory.create.mockResolvedValue({} as any);

      await service.subtractFromTotalAmount(tx, 1, 50000);

      expect(tx.membershipReward.findMany).not.toHaveBeenCalled();
      expect(tx.userCoupon.create).not.toHaveBeenCalled();
    });
  });
});
