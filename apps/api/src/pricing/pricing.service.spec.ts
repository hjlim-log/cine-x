import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { PricingService } from './pricing.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── 공통 날짜 상수 ────────────────────────────────────────────────────────────
const FUTURE = new Date('2099-01-01');
const PAST = new Date('2020-01-01');
const WEEKDAY_DATE = new Date('2026-05-06T14:00:00'); // 수요일
const WEEKEND_DATE = new Date('2026-05-09T14:00:00'); // 토요일

// ─── Mock 팩토리 ──────────────────────────────────────────────────────────────

const makeMockScreening = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  startTime: WEEKDAY_DATE,
  endTime: new Date('2026-05-06T16:00:00'),
  screenType: '2D',
  movieId: 1,
  screenId: 1,
  screen: {
    id: 1,
    name: '1관',
    totalSeats: 100,
    cinemaId: 1,
    screenTypeId: 1,
    screenType: { id: 1, name: '일반관', grade: '일반관', description: null },
    cinema: { id: 1, name: '롯데시네마 강남', address: '서울 강남구', region: '서울', createdAt: new Date() },
  },
  ...overrides,
});

const makePolicy = (
  audienceType: string,
  basePrice: number,
  cinemaId: number | null = null,
  overrides: Record<string, unknown> = {},
) => ({
  id: 1,
  cinemaId,
  screenTypeId: 1,
  format: '2D',
  dayType: 'WEEKDAY',
  audienceType,
  basePrice,
  validFrom: PAST,
  validTo: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeSeat = (id: number, additionalPrice = 0) => ({
  id,
  row: 'A',
  number: id,
  screenId: 1,
  seatTypeId: 1,
  seatType: { id: 1, name: '일반석', additionalPrice },
});

const makeSeats = (count: number, additionalPrice = 0) =>
  Array.from({ length: count }, (_, i) => makeSeat(i + 1, additionalPrice));

const makeUserCoupon = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  customerId: 100,
  couponId: 1,
  status: 'AVAILABLE',
  issuedAt: new Date(),
  expiresAt: FUTURE,
  usedAt: null,
  coupon: {
    id: 1,
    code: 'TEST',
    name: '테스트쿠폰',
    description: null,
    type: 'AMOUNT_DISCOUNT',
    value: 3000,
    minPurchase: 0,
    maxDiscount: null,
    validDays: 90,
    issuePolicy: 'CODE',
    imageUrl: null,
    bgColor: null,
    isActive: true,
    totalIssued: 1,
    createdAt: new Date(),
  },
  ...overrides,
});

const makeCustomer = (
  discountPercent: number,
  maxDiscount: number | null = null,
  displayName = 'VIP',
) => ({
  id: 100,
  email: 'user@test.local',
  password: 'hash',
  name: '홍길동',
  phone: null,
  role: 'USER',
  totalAmount: 0,
  gradeId: 2,
  isActive: true,
  deactivatedAt: null,
  deactivatedBy: null,
  deactivateReason: null,
  createdAt: new Date(),
  membershipGrade: {
    id: 2,
    name: 'VIP',
    displayName,
    description: null,
    minAmount: 100000,
    maxAmount: null,
    discountPercent,
    maxDiscount,
    bgColor: null,
    iconUrl: null,
  },
});

const makePartnerDiscount = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: '신한카드 2,000원 할인',
  partnerType: 'CARD',
  partnerName: '신한카드',
  description: null,
  discountMethod: 'AMOUNT',
  discountValue: 2000,
  maxDiscount: null,
  minPurchase: 0,
  validFrom: PAST,
  validTo: null,
  combinableWithCoupon: true,
  imageUrl: null,
  bgColor: null,
  isActive: true,
  createdAt: new Date(),
  ...overrides,
});

// ─── Helper: 기본 mock 세팅 ───────────────────────────────────────────────────
function setupBase(
  prisma: DeepMockProxy<PrismaClient>,
  policies: ReturnType<typeof makePolicy>[],
  seats: ReturnType<typeof makeSeat>[],
  screeningOverrides: Record<string, unknown> = {},
) {
  prisma.screening.findUnique.mockResolvedValue(makeMockScreening(screeningOverrides) as any);
  prisma.pricingPolicy.findMany.mockResolvedValue(policies as any);
  prisma.seat.findMany.mockResolvedValue(seats as any);
}

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe('PricingService', () => {
  let service: PricingService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaClient>();

    const module = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PricingService);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('1단계 - 정책 가격 + 좌석 추가금', () => {
    it('성인 2명 + 일반석 → 정책 가격 그대로', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(2));

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1, 2],
        audienceCounts: { ADULT: 2 },
      });

      expect(result.baseTotal).toBe(26000);
      expect(result.seatBonus).toBe(0);
      expect(result.subtotal).toBe(26000);
      expect(result.details).toEqual([
        { audienceType: 'ADULT', count: 2, unitPrice: 13000, subtotal: 26000 },
      ]);
    });

    it('커플석 추가금 5,000원 × 2석 적용', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(2, 5000));

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1, 2],
        audienceCounts: { ADULT: 2 },
      });

      expect(result.baseTotal).toBe(26000);
      expect(result.seatBonus).toBe(10000);
      expect(result.subtotal).toBe(36000);
      expect(result.seatDetails).toEqual([
        { seatId: 1, additionalPrice: 5000 },
        { seatId: 2, additionalPrice: 5000 },
      ]);
    });

    it('인원 수 != 좌석 수 → BadRequestException', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(3));

      await expect(
        service.calculate({
          screeningId: 1,
          seatIds: [1, 2, 3],
          audienceCounts: { ADULT: 2 }, // 2명인데 3좌석
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('관람 인원 0명 → BadRequestException', async () => {
      setupBase(prisma, [], []);

      await expect(
        service.calculate({
          screeningId: 1,
          seatIds: [],
          audienceCounts: { ADULT: 0 },
        }),
      ).rejects.toThrow('1명 이상');
    });

    it('상영 없음 → NotFoundException', async () => {
      prisma.screening.findUnique.mockResolvedValue(null);

      await expect(
        service.calculate({ screeningId: 999, seatIds: [1], audienceCounts: { ADULT: 1 } }),
      ).rejects.toThrow(NotFoundException);
    });

    it('요금 정책 없음 → BadRequestException', async () => {
      setupBase(prisma, [], [makeSeat(1)]);

      await expect(
        service.calculate({ screeningId: 1, seatIds: [1], audienceCounts: { ADULT: 1 } }),
      ).rejects.toThrow('ADULT 요금 정책이 없습니다');
    });

    it('영화관별 정책이 공통(cinemaId=null) 정책보다 우선 적용', async () => {
      const globalPolicy = makePolicy('ADULT', 12000, null);
      const cinemaPolicy = makePolicy('ADULT', 14000, 1); // 영화관 전용
      setupBase(prisma, [globalPolicy, cinemaPolicy], makeSeats(1));

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1],
        audienceCounts: { ADULT: 1 },
      });

      expect(result.baseTotal).toBe(14000); // 영화관별 정책 적용
    });

    it('토요일 상영 → WEEKEND dayType으로 정책 조회', async () => {
      setupBase(
        prisma,
        [makePolicy('ADULT', 14000)],
        makeSeats(1),
        { startTime: WEEKEND_DATE },
      );

      await service.calculate({
        screeningId: 1,
        seatIds: [1],
        audienceCounts: { ADULT: 1 },
      });

      expect(prisma.pricingPolicy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ dayType: 'WEEKEND' }),
        }),
      );
    });

    it('validTo 만료된 정책은 무시 → 정책 없음 에러', async () => {
      const expiredPolicy = makePolicy('ADULT', 13000, null, { validTo: PAST });
      setupBase(prisma, [expiredPolicy], makeSeats(1));

      await expect(
        service.calculate({ screeningId: 1, seatIds: [1], audienceCounts: { ADULT: 1 } }),
      ).rejects.toThrow('ADULT 요금 정책이 없습니다');
    });

    it('성인 2명 + 청소년 1명 복합 인원 계산', async () => {
      setupBase(
        prisma,
        [makePolicy('ADULT', 13000), makePolicy('TEEN', 10000)],
        makeSeats(3),
      );

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1, 2, 3],
        audienceCounts: { ADULT: 2, TEEN: 1 },
      });

      expect(result.baseTotal).toBe(36000); // 13000×2 + 10000×1
      expect(result.details).toHaveLength(2);
    });

    it('요청한 좌석 중 유효하지 않은 좌석 포함 → BadRequestException', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], [makeSeat(1)]); // 1개만 반환

      await expect(
        service.calculate({
          screeningId: 1,
          seatIds: [1, 999], // 2개 요청했지만 1개만 DB에 존재
          audienceCounts: { ADULT: 2 },
        }),
      ).rejects.toThrow('유효하지 않은 좌석');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('2단계 - 쿠폰 할인', () => {
    it('AMOUNT_DISCOUNT 3,000원 할인', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(2));
      prisma.userCoupon.findUnique.mockResolvedValue(makeUserCoupon() as any);
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(0) as any);

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1, 2],
        audienceCounts: { ADULT: 2 },
        userCouponId: 1,
        customerId: 100,
      });

      expect(result.couponDiscount).toBe(3000);
      expect(result.afterCouponAmount).toBe(23000); // 26000 - 3000
      expect(result.appliedCoupon?.type).toBe('AMOUNT_DISCOUNT');
      expect(result.appliedCoupon?.discountAmount).toBe(3000);
    });

    it('PERCENT_DISCOUNT 10% (maxDiscount 없음)', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(2));
      prisma.userCoupon.findUnique.mockResolvedValue(
        makeUserCoupon({ coupon: { ...makeUserCoupon().coupon, type: 'PERCENT_DISCOUNT', value: 10 } }) as any,
      );
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(0) as any);

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1, 2],
        audienceCounts: { ADULT: 2 },
        userCouponId: 1,
        customerId: 100,
      });

      // Math.floor(26000 * 10 / 100) = 2600
      expect(result.couponDiscount).toBe(2600);
    });

    it('PERCENT_DISCOUNT 10% + maxDiscount 1,000원으로 제한', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(2));
      prisma.userCoupon.findUnique.mockResolvedValue(
        makeUserCoupon({
          coupon: {
            ...makeUserCoupon().coupon,
            type: 'PERCENT_DISCOUNT',
            value: 10,
            maxDiscount: 1000,
          },
        }) as any,
      );
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(0) as any);

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1, 2],
        audienceCounts: { ADULT: 2 },
        userCouponId: 1,
        customerId: 100,
      });

      expect(result.couponDiscount).toBe(1000); // 2600이지만 max 1000
    });

    it('FREE_TICKET 1석 → 가장 비싼 관람객 가격 무료', async () => {
      // ADULT 20000, TEEN 15000, CHILD 10000 → FREE_TICKET 1석 = 20000 무료
      setupBase(
        prisma,
        [
          makePolicy('ADULT', 20000),
          makePolicy('TEEN', 15000),
          makePolicy('CHILD', 10000),
        ],
        makeSeats(3),
      );
      prisma.userCoupon.findUnique.mockResolvedValue(
        makeUserCoupon({
          coupon: { ...makeUserCoupon().coupon, type: 'FREE_TICKET', value: 1 },
        }) as any,
      );
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(0) as any);

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1, 2, 3],
        audienceCounts: { ADULT: 1, TEEN: 1, CHILD: 1 },
        userCouponId: 1,
        customerId: 100,
      });

      expect(result.couponDiscount).toBe(20000); // 가장 비싼 ADULT 무료
    });

    it('FREE_TICKET + 커플석 좌석 추가금도 무료에 포함', async () => {
      // ADULT 2명 × 10000, 좌석 추가금 [5000, 0] → FREE_TICKET 1석 = 10000+5000 = 15000
      setupBase(prisma, [makePolicy('ADULT', 10000)], [makeSeat(1, 5000), makeSeat(2, 0)]);
      prisma.userCoupon.findUnique.mockResolvedValue(
        makeUserCoupon({
          coupon: { ...makeUserCoupon().coupon, type: 'FREE_TICKET', value: 1 },
        }) as any,
      );
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(0) as any);

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1, 2],
        audienceCounts: { ADULT: 2 },
        userCouponId: 1,
        customerId: 100,
      });

      expect(result.couponDiscount).toBe(15000); // 10000(기본) + 5000(추가금)
    });

    it('FREE_TICKET value가 좌석 수보다 크면 좌석 수로 제한', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(2));
      prisma.userCoupon.findUnique.mockResolvedValue(
        makeUserCoupon({
          coupon: { ...makeUserCoupon().coupon, type: 'FREE_TICKET', value: 99 },
        }) as any,
      );
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(0) as any);

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1, 2],
        audienceCounts: { ADULT: 2 },
        userCouponId: 1,
        customerId: 100,
      });

      // 좌석 2개만 있으므로 최대 26000
      expect(result.couponDiscount).toBe(26000);
      expect(result.afterCouponAmount).toBe(0);
    });

    it('minPurchase 미달 → BadRequestException', async () => {
      setupBase(prisma, [makePolicy('ADULT', 5000)], makeSeats(1)); // subtotal 5000
      prisma.userCoupon.findUnique.mockResolvedValue(
        makeUserCoupon({
          coupon: { ...makeUserCoupon().coupon, minPurchase: 10000 },
        }) as any,
      );

      await expect(
        service.calculate({
          screeningId: 1,
          seatIds: [1],
          audienceCounts: { ADULT: 1 },
          userCouponId: 1,
          customerId: 100,
        }),
      ).rejects.toThrow('10,000원 이상');
    });

    it('만료된 쿠폰 → BadRequestException', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(1));
      prisma.userCoupon.findUnique.mockResolvedValue(
        makeUserCoupon({ expiresAt: PAST }) as any,
      );

      await expect(
        service.calculate({
          screeningId: 1,
          seatIds: [1],
          audienceCounts: { ADULT: 1 },
          userCouponId: 1,
          customerId: 100,
        }),
      ).rejects.toThrow('만료된 쿠폰');
    });

    it('타인의 쿠폰 → ForbiddenException', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(1));
      prisma.userCoupon.findUnique.mockResolvedValue(
        makeUserCoupon({ customerId: 999 }) as any, // 다른 고객 소유
      );

      await expect(
        service.calculate({
          screeningId: 1,
          seatIds: [1],
          audienceCounts: { ADULT: 1 },
          userCouponId: 1,
          customerId: 100, // 100번 고객이 999번 소유 쿠폰 사용 시도
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('USED 상태 쿠폰 → BadRequestException', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(1));
      prisma.userCoupon.findUnique.mockResolvedValue(
        makeUserCoupon({ status: 'USED' }) as any,
      );

      await expect(
        service.calculate({
          screeningId: 1,
          seatIds: [1],
          audienceCounts: { ADULT: 1 },
          userCouponId: 1,
          customerId: 100,
        }),
      ).rejects.toThrow('사용할 수 없는 쿠폰');
    });

    it('RESERVED 상태 쿠폰 → 정상 처리 (예매 중 선점 가능)', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(1));
      prisma.userCoupon.findUnique.mockResolvedValue(
        makeUserCoupon({ status: 'RESERVED' }) as any,
      );
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(0) as any);

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1],
        audienceCounts: { ADULT: 1 },
        userCouponId: 1,
        customerId: 100,
      });

      expect(result.couponDiscount).toBe(3000);
    });

    it('쿠폰 미사용 → couponDiscount 0, appliedCoupon undefined', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(1));

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1],
        audienceCounts: { ADULT: 1 },
        // userCouponId 없음
      });

      expect(result.couponDiscount).toBe(0);
      expect(result.appliedCoupon).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('3단계 - 멤버십 할인 (자동)', () => {
    it('VIP 3% 쿠폰 차감 후 금액(afterCouponAmount)에 적용', async () => {
      // subtotal 50000, 쿠폰 3000 → afterCoupon 47000
      // VIP 3% → Math.floor(47000 * 3 / 100) = 1410
      setupBase(prisma, [makePolicy('ADULT', 10000)], makeSeats(5));
      prisma.userCoupon.findUnique.mockResolvedValue(makeUserCoupon() as any);
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(3) as any);

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1, 2, 3, 4, 5],
        audienceCounts: { ADULT: 5 },
        userCouponId: 1,
        customerId: 100,
      });

      expect(result.subtotal).toBe(50000);
      expect(result.afterCouponAmount).toBe(47000);
      expect(result.membershipDiscount).toBe(1410);
      expect(result.afterMembershipAmount).toBe(45590);
      expect(result.appliedMembership?.discountPercent).toBe(3);
    });

    it('WELCOME 0% → 멤버십 할인 0, appliedMembership undefined', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(1));
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(0, null, '웰컴') as any);

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1],
        audienceCounts: { ADULT: 1 },
        customerId: 100,
      });

      expect(result.membershipDiscount).toBe(0);
      expect(result.appliedMembership).toBeUndefined();
    });

    it('VVIP 5% + maxDiscount 5,000원 제한', async () => {
      // subtotal 200000, VVIP 5% = 10000 → maxDiscount 5000으로 제한
      setupBase(prisma, [makePolicy('ADULT', 20000)], makeSeats(10));
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(5, 5000, 'VVIP') as any);

      const result = await service.calculate({
        screeningId: 1,
        seatIds: Array.from({ length: 10 }, (_, i) => i + 1),
        audienceCounts: { ADULT: 10 },
        customerId: 100,
      });

      expect(result.subtotal).toBe(200000);
      expect(result.membershipDiscount).toBe(5000); // 10000이지만 max 5000
    });

    it('customerId 없음 → 멤버십 할인 미적용', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(1));

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1],
        audienceCounts: { ADULT: 1 },
        // customerId 없음
      });

      expect(result.membershipDiscount).toBe(0);
      expect(result.appliedMembership).toBeUndefined();
    });

    it('customer DB에 없어도 에러 없이 멤버십 할인 0 처리', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(1));
      prisma.customer.findUnique.mockResolvedValue(null);

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1],
        audienceCounts: { ADULT: 1 },
        customerId: 100,
      });

      expect(result.membershipDiscount).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('4단계 - 제휴할인', () => {
    it('AMOUNT 2,000원 할인', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(2));
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(0) as any);
      prisma.partnerDiscount.findUnique.mockResolvedValue(makePartnerDiscount() as any);

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1, 2],
        audienceCounts: { ADULT: 2 },
        customerId: 100,
        partnerDiscountId: 1,
      });

      expect(result.partnerDiscount).toBe(2000);
      expect(result.totalAmount).toBe(24000); // 26000 - 2000
      expect(result.appliedPartnerDiscount?.discountAmount).toBe(2000);
    });

    it('PERCENT 5% + maxDiscount 3,000원 제한', async () => {
      // afterMembership = 26000, 5% = 1300 → maxDiscount 없으면 1300
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(2));
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(0) as any);
      prisma.partnerDiscount.findUnique.mockResolvedValue(
        makePartnerDiscount({ discountMethod: 'PERCENT', discountValue: 20, maxDiscount: 3000 }) as any,
      );

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1, 2],
        audienceCounts: { ADULT: 2 },
        customerId: 100,
        partnerDiscountId: 1,
      });

      // Math.floor(26000 * 20 / 100) = 5200 → max 3000
      expect(result.partnerDiscount).toBe(3000);
    });

    it('combinableWithCoupon false + 쿠폰 동시 사용 → BadRequestException', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(1));
      prisma.userCoupon.findUnique.mockResolvedValue(makeUserCoupon() as any);
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(0) as any);
      prisma.partnerDiscount.findUnique.mockResolvedValue(
        makePartnerDiscount({ combinableWithCoupon: false }) as any,
      );

      await expect(
        service.calculate({
          screeningId: 1,
          seatIds: [1],
          audienceCounts: { ADULT: 1 },
          userCouponId: 1,
          customerId: 100,
          partnerDiscountId: 1,
        }),
      ).rejects.toThrow('쿠폰과 함께 사용할 수 없는');
    });

    it('비활성(isActive=false) 제휴할인 → BadRequestException', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(1));
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(0) as any);
      prisma.partnerDiscount.findUnique.mockResolvedValue(
        makePartnerDiscount({ isActive: false }) as any,
      );

      await expect(
        service.calculate({
          screeningId: 1,
          seatIds: [1],
          audienceCounts: { ADULT: 1 },
          customerId: 100,
          partnerDiscountId: 1,
        }),
      ).rejects.toThrow('사용할 수 없는 제휴할인');
    });

    it('validTo 만료된 제휴할인 → BadRequestException', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(1));
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(0) as any);
      prisma.partnerDiscount.findUnique.mockResolvedValue(
        makePartnerDiscount({ validTo: PAST }) as any,
      );

      await expect(
        service.calculate({
          screeningId: 1,
          seatIds: [1],
          audienceCounts: { ADULT: 1 },
          customerId: 100,
          partnerDiscountId: 1,
        }),
      ).rejects.toThrow('유효 기간이 아닌');
    });

    it('제휴할인 minPurchase 미달 → BadRequestException (멤버십 차감 후 금액 기준)', async () => {
      // afterMembershipAmount = 13000, pd.minPurchase = 20000 → 에러
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(1));
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(0) as any);
      prisma.partnerDiscount.findUnique.mockResolvedValue(
        makePartnerDiscount({ discountValue: 2000, minPurchase: 20000 }) as any,
      );

      await expect(
        service.calculate({
          screeningId: 1,
          seatIds: [1],
          audienceCounts: { ADULT: 1 },
          customerId: 100,
          partnerDiscountId: 1,
        }),
      ).rejects.toThrow('20,000원 이상');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('5단계 통합 - 모든 할인 적용', () => {
    it('쿠폰 + 멤버십 + 제휴할인 동시 적용 (순서 보장)', async () => {
      // ADULT 5명 × 10,000 = 50,000
      // 쿠폰 AMOUNT -3,000 → 47,000
      // VIP 3% (no max): Math.floor(47000*3/100) = 1,410 → 45,590
      // 제휴 AMOUNT -2,000 → 43,590
      setupBase(prisma, [makePolicy('ADULT', 10000)], makeSeats(5));
      prisma.userCoupon.findUnique.mockResolvedValue(makeUserCoupon() as any);
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(3) as any);
      prisma.partnerDiscount.findUnique.mockResolvedValue(makePartnerDiscount() as any);

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1, 2, 3, 4, 5],
        audienceCounts: { ADULT: 5 },
        userCouponId: 1,
        customerId: 100,
        partnerDiscountId: 1,
      });

      expect(result.baseTotal).toBe(50000);
      expect(result.seatBonus).toBe(0);
      expect(result.subtotal).toBe(50000);
      expect(result.couponDiscount).toBe(3000);
      expect(result.afterCouponAmount).toBe(47000);
      expect(result.membershipDiscount).toBe(1410);
      expect(result.afterMembershipAmount).toBe(45590);
      expect(result.partnerDiscount).toBe(2000);
      expect(result.totalAmount).toBe(43590);
    });

    it('쿠폰 할인이 subtotal 초과 → 각 단계 0원으로 내려앉음', async () => {
      // subtotal 5000, 쿠폰 AMOUNT 10000 → couponDiscount Math.min(10000, 5000) = 5000
      // afterCoupon = 0 → 멤버십·제휴 모두 0
      setupBase(prisma, [makePolicy('ADULT', 5000)], makeSeats(1));
      prisma.userCoupon.findUnique.mockResolvedValue(
        makeUserCoupon({ coupon: { ...makeUserCoupon().coupon, value: 10000 } }) as any,
      );
      prisma.customer.findUnique.mockResolvedValue(makeCustomer(3) as any);
      prisma.partnerDiscount.findUnique.mockResolvedValue(makePartnerDiscount() as any);

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1],
        audienceCounts: { ADULT: 1 },
        userCouponId: 1,
        customerId: 100,
        partnerDiscountId: 1,
      });

      expect(result.couponDiscount).toBe(5000);  // subtotal에 캡
      expect(result.afterCouponAmount).toBe(0);
      expect(result.membershipDiscount).toBe(0);
      expect(result.afterMembershipAmount).toBe(0);
      expect(result.partnerDiscount).toBe(0);    // afterMembership이 0이므로
      expect(result.totalAmount).toBe(0);        // 음수 없음
    });

    it('결과 구조 검증 - 모든 필드 존재', async () => {
      setupBase(prisma, [makePolicy('ADULT', 13000)], makeSeats(1));

      const result = await service.calculate({
        screeningId: 1,
        seatIds: [1],
        audienceCounts: { ADULT: 1 },
      });

      expect(result).toMatchObject({
        baseTotal: expect.any(Number),
        seatBonus: expect.any(Number),
        subtotal: expect.any(Number),
        couponDiscount: expect.any(Number),
        afterCouponAmount: expect.any(Number),
        membershipDiscount: expect.any(Number),
        afterMembershipAmount: expect.any(Number),
        partnerDiscount: expect.any(Number),
        totalAmount: expect.any(Number),
        details: expect.any(Array),
        seatDetails: expect.any(Array),
      });
      // 선택적 필드: 미사용 시 undefined
      expect(result.appliedCoupon).toBeUndefined();
      expect(result.appliedMembership).toBeUndefined();
      expect(result.appliedPartnerDiscount).toBeUndefined();
    });
  });
});
