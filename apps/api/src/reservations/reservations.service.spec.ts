import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReservationsService } from './reservations.service';
import { PricingService } from '../pricing/pricing.service';
import { MembershipService } from '../membership/membership.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── 시드 데이터 (beforeAll에서 한 번 생성) ────────────────────────────────
let seedData: {
  gradeId: number;
  screeningId: number;
  seatIds: number[]; // 5석 [A1, A2, A3, A4, A5]
};

// afterAll에서 정리할 coupon id 목록
const tempCouponIds: number[] = [];

// ─── 모듈 인스턴스 ────────────────────────────────────────────────────────────
let service: ReservationsService;
let prisma: PrismaService;

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

async function createTestCustomer(email: string, totalAmount = 0) {
  return prisma.customer.create({
    data: {
      email,
      password: '$2b$10$testhashtesthashhh',
      name: 'Test User',
      gradeId: seedData.gradeId,
      totalAmount,
    },
  });
}

async function createTestCoupon() {
  const coupon = await prisma.coupon.create({
    data: {
      code: `TEST_SPEC_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
      name: '테스트 쿠폰',
      type: 'AMOUNT_DISCOUNT',
      value: 3000,
      issuePolicy: 'CODE',
    },
  });
  tempCouponIds.push(coupon.id);
  return coupon;
}

// DB에 직접 예매 생성 (서비스 우회 — 상태 조작용)
async function createRawReservation(
  customerId: number,
  seatIds: number[],
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' = 'PENDING',
  totalAmount = 26000,
) {
  return prisma.reservation.create({
    data: {
      orderId: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      totalAmount,
      status,
      paidAt: status === 'PAID' ? new Date() : null,
      customerId,
      screeningId: seedData.screeningId,
      tickets: { create: seatIds.map((seatId) => ({ seatId, price: 0 })) },
    },
  });
}

// ─── 전체 suite 설정 ─────────────────────────────────────────────────────────

beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [ScheduleModule.forRoot()],
    providers: [ReservationsService, PricingService, MembershipService, PrismaService],
  }).compile();

  service = module.get(ReservationsService);
  prisma = module.get(PrismaService);

  // ── 시드: 멤버십 등급 ──────────────────────────────────────────────────────
  const grade = await prisma.membershipGrade.upsert({
    where: { name: 'TEST_WELCOME' },
    update: {},
    create: {
      name: 'TEST_WELCOME',
      displayName: '웰컴',
      minAmount: 0,
      maxAmount: null,
      discountPercent: 0,
    },
  });

  // ── 시드: 좌석 타입 ───────────────────────────────────────────────────────
  const seatType = await prisma.seatType.upsert({
    where: { name: 'TEST_일반석' },
    update: {},
    create: { name: 'TEST_일반석', additionalPrice: 0 },
  });

  // ── 시드: 상영관 구조 ─────────────────────────────────────────────────────
  const screenType = await prisma.screenType.upsert({
    where: { name: 'TEST_일반관' },
    update: {},
    create: { name: 'TEST_일반관', grade: '일반관' },
  });

  const cinema = await prisma.cinema.create({
    data: { name: `테스트시네마_${Date.now()}`, address: '서울 강남구', region: '서울' },
  });

  const screen = await prisma.screen.create({
    data: { name: 'TEST_1관', totalSeats: 5, cinemaId: cinema.id, screenTypeId: screenType.id },
  });

  const seats = await Promise.all(
    [1, 2, 3, 4, 5].map((num) =>
      prisma.seat.create({
        data: { row: 'A', number: num, screenId: screen.id, seatTypeId: seatType.id },
      }),
    ),
  );

  // ── 시드: 영화 + 상영 ─────────────────────────────────────────────────────
  const movie = await prisma.movie.create({
    data: {
      title: 'TEST_영화',
      runtime: 120,
      rating: '12세이상관람가',
      genre: '액션',
      synopsis: '테스트용',
      releaseDate: new Date(),
    },
  });

  const screening = await prisma.screening.create({
    data: {
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 26 * 60 * 60 * 1000),
      screenType: '2D',
      movieId: movie.id,
      screenId: screen.id,
    },
  });

  // ── 시드: 요금 정책 (주중 + 주말 모두 생성해 요일 무관하게 동작) ──────────
  for (const dayType of ['WEEKDAY', 'WEEKEND']) {
    await prisma.pricingPolicy.create({
      data: {
        cinemaId: null,
        screenTypeId: screenType.id,
        format: '2D',
        dayType,
        audienceType: 'ADULT',
        basePrice: 13000,
        validFrom: new Date('2020-01-01'),
      },
    });
  }

  seedData = {
    gradeId: grade.id,
    screeningId: screening.id,
    seatIds: seats.map((s) => s.id),
  };
}, 30000);

afterEach(async () => {
  // @test.local 고객 관련 데이터 FK 역순 삭제
  const testCustomers = await prisma.customer.findMany({
    where: { email: { contains: '@test.local' } },
    select: { id: true },
  });
  const ids = testCustomers.map((c) => c.id);
  if (ids.length === 0) return;

  await prisma.couponUsage.deleteMany({ where: { reservation: { customerId: { in: ids } } } });
  await prisma.partnerDiscountUsage.deleteMany({ where: { reservation: { customerId: { in: ids } } } });
  await prisma.ticket.deleteMany({ where: { reservation: { customerId: { in: ids } } } });
  await prisma.reservation.deleteMany({ where: { customerId: { in: ids } } });
  await prisma.userCoupon.deleteMany({ where: { customerId: { in: ids } } });
  await prisma.membershipHistory.deleteMany({ where: { customerId: { in: ids } } });
  await prisma.customer.deleteMany({ where: { email: { contains: '@test.local' } } });
});

afterAll(async () => {
  // 임시 쿠폰 정리
  if (tempCouponIds.length > 0) {
    await prisma.coupon.deleteMany({ where: { id: { in: tempCouponIds } } });
  }

  // 시드 데이터 역순 정리
  await prisma.pricingPolicy.deleteMany({
    where: { screenType: { name: 'TEST_일반관' } },
  });
  await prisma.ticket.deleteMany({ where: { seat: { screen: { name: 'TEST_1관' } } } });
  await prisma.reservation.deleteMany({ where: { screening: { screen: { name: 'TEST_1관' } } } });
  await prisma.screening.deleteMany({ where: { screen: { name: 'TEST_1관' } } });
  await prisma.seat.deleteMany({ where: { screen: { name: 'TEST_1관' } } });
  await prisma.movie.deleteMany({ where: { title: 'TEST_영화' } });
  await prisma.screen.deleteMany({ where: { name: 'TEST_1관' } });
  await prisma.cinema.deleteMany({ where: { name: { startsWith: '테스트시네마_' } } });
  await prisma.screenType.deleteMany({ where: { name: 'TEST_일반관' } });
  await prisma.seatType.deleteMany({ where: { name: 'TEST_일반석' } });
  await prisma.membershipGrade.deleteMany({ where: { name: 'TEST_WELCOME' } });

  await prisma.$disconnect();
}, 30000);

// ═══════════════════════════════════════════════════════════════════════════════
describe('좌석 충돌 방지 (Serializable 트랜잭션)', () => {
  it('같은 좌석 동시 예매 → 한 명만 성공', async () => {
    const [user1, user2] = await Promise.all([
      createTestCustomer('user1@test.local'),
      createTestCustomer('user2@test.local'),
    ]);

    const dto = {
      screeningId: seedData.screeningId,
      seatIds: [seedData.seatIds[0], seedData.seatIds[1]],
      audienceCounts: { ADULT: 2 },
    };

    const results = await Promise.allSettled([
      service.create(user1.id, dto),
      service.create(user2.id, dto),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const reason = (rejected[0] as PromiseRejectedResult).reason;
    expect(reason).toBeInstanceOf(ConflictException);
    expect(reason.message).toContain('이미 예매된 좌석');
  }, 15000);

  it('만료된 PENDING(11분 경과)은 좌석 해제 → 재예매 가능', async () => {
    const user1 = await createTestCustomer('expired-holder@test.local');
    const user2 = await createTestCustomer('new-buyer@test.local');

    const seatIds = [seedData.seatIds[2], seedData.seatIds[3]];

    // user1이 먼저 예매하고 → 11분 전으로 시간 조작
    const oldReservation = await createRawReservation(user1.id, seatIds);
    await prisma.reservation.update({
      where: { id: oldReservation.id },
      data: { createdAt: new Date(Date.now() - 11 * 60 * 1000) },
    });

    // user2가 같은 좌석 예매 시도 → 만료된 PENDING이므로 성공해야 함
    const result = await service.create(user2.id, {
      screeningId: seedData.screeningId,
      seatIds,
      audienceCounts: { ADULT: 2 },
    });

    expect(result.id).toBeDefined();
    expect(result.status).toBe('PENDING');
  }, 15000);

  it('PAID 예매가 있는 좌석은 항상 차단', async () => {
    const user1 = await createTestCustomer('paid-holder@test.local');
    const user2 = await createTestCustomer('newcomer@test.local');

    const seatIds = [seedData.seatIds[4]];

    // user1이 PAID 상태 예매 보유
    await createRawReservation(user1.id, seatIds, 'PAID', 13000);

    await expect(
      service.create(user2.id, {
        screeningId: seedData.screeningId,
        seatIds,
        audienceCounts: { ADULT: 1 },
      }),
    ).rejects.toThrow(ConflictException);
  }, 15000);
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('PENDING 만료 처리 (expirePendingReservations)', () => {
  it('10분 초과 PENDING → EXPIRED', async () => {
    const user = await createTestCustomer('expire-test@test.local');
    const reservation = await createRawReservation(user.id, [seedData.seatIds[0]]);

    // 11분 전으로 강제 조작
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { createdAt: new Date(Date.now() - 11 * 60 * 1000) },
    });

    await service.expirePendingReservations();

    const updated = await prisma.reservation.findUnique({ where: { id: reservation.id } });
    expect(updated?.status).toBe('EXPIRED');
  });

  it('10분 미만 PENDING은 만료 대상 아님', async () => {
    const user = await createTestCustomer('fresh-pending@test.local');
    const reservation = await createRawReservation(user.id, [seedData.seatIds[0]]);

    await service.expirePendingReservations();

    const unchanged = await prisma.reservation.findUnique({ where: { id: reservation.id } });
    expect(unchanged?.status).toBe('PENDING');
  });

  it('만료 시 RESERVED 쿠폰 → AVAILABLE 복구 + CouponUsage 삭제', async () => {
    const user = await createTestCustomer('coupon-expire@test.local');
    const coupon = await createTestCoupon();

    const userCoupon = await prisma.userCoupon.create({
      data: {
        customerId: user.id,
        couponId: coupon.id,
        status: 'RESERVED',
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    const reservation = await createRawReservation(user.id, [seedData.seatIds[0]]);
    await prisma.couponUsage.create({
      data: {
        userCouponId: userCoupon.id,
        reservationId: reservation.id,
        discountAmount: 3000,
      },
    });

    // 11분 전으로 조작
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { createdAt: new Date(Date.now() - 11 * 60 * 1000) },
    });

    await service.expirePendingReservations();

    const refreshedCoupon = await prisma.userCoupon.findUnique({ where: { id: userCoupon.id } });
    expect(refreshedCoupon?.status).toBe('AVAILABLE');

    const usage = await prisma.couponUsage.findFirst({ where: { userCouponId: userCoupon.id } });
    expect(usage).toBeNull();

    const expiredRes = await prisma.reservation.findUnique({ where: { id: reservation.id } });
    expect(expiredRes?.status).toBe('EXPIRED');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('취소 처리 (cancel)', () => {
  it('PAID 취소 → 멤버십 누적금액 차감', async () => {
    // 125,000원 누적 + 50,000원 결제 예매를 취소하면 → 75,000원 남아야 함
    const user = await createTestCustomer('cancel-membership@test.local', 125000);
    const reservation = await createRawReservation(
      user.id,
      [seedData.seatIds[0]],
      'PAID',
      50000,
    );

    await service.cancel(reservation.id, user.id);

    const updated = await prisma.customer.findUnique({ where: { id: user.id } });
    expect(updated?.totalAmount).toBe(75000);

    const cancelled = await prisma.reservation.findUnique({ where: { id: reservation.id } });
    expect(cancelled?.status).toBe('CANCELLED');
  });

  it('PAID 취소 + 쿠폰 → AVAILABLE 복구 + CouponUsage 삭제', async () => {
    const user = await createTestCustomer('cancel-coupon@test.local');
    const coupon = await createTestCoupon();

    const userCoupon = await prisma.userCoupon.create({
      data: {
        customerId: user.id,
        couponId: coupon.id,
        status: 'RESERVED',
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    const reservation = await createRawReservation(user.id, [seedData.seatIds[0]], 'PAID', 10000);
    await prisma.couponUsage.create({
      data: {
        userCouponId: userCoupon.id,
        reservationId: reservation.id,
        discountAmount: 3000,
      },
    });

    await service.cancel(reservation.id, user.id);

    const refreshed = await prisma.userCoupon.findUnique({ where: { id: userCoupon.id } });
    expect(refreshed?.status).toBe('AVAILABLE');

    const usage = await prisma.couponUsage.findFirst({ where: { userCouponId: userCoupon.id } });
    expect(usage).toBeNull();
  });

  it('PENDING 취소 → 멤버십 차감 없이 CANCELLED', async () => {
    const user = await createTestCustomer('cancel-pending@test.local', 50000);
    const reservation = await createRawReservation(user.id, [seedData.seatIds[0]], 'PENDING');

    await service.cancel(reservation.id, user.id);

    const updatedUser = await prisma.customer.findUnique({ where: { id: user.id } });
    expect(updatedUser?.totalAmount).toBe(50000); // 변동 없음

    const cancelled = await prisma.reservation.findUnique({ where: { id: reservation.id } });
    expect(cancelled?.status).toBe('CANCELLED');
  });

  it('타인의 예매 취소 시도 → ForbiddenException', async () => {
    const owner = await createTestCustomer('owner@test.local');
    const attacker = await createTestCustomer('attacker@test.local');
    const reservation = await createRawReservation(owner.id, [seedData.seatIds[0]], 'PAID');

    await expect(service.cancel(reservation.id, attacker.id)).rejects.toThrow(ForbiddenException);
  });

  it('EXPIRED 예매 취소 시도 → BadRequestException', async () => {
    const user = await createTestCustomer('expired-cancel@test.local');
    const reservation = await createRawReservation(user.id, [seedData.seatIds[0]], 'EXPIRED');

    await expect(service.cancel(reservation.id, user.id)).rejects.toThrow(BadRequestException);
  });
});
