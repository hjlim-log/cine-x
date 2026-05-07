import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// ─── 테스트 전역 상태 ───────────────────────────────────────────────────────────

let app: INestApplication;
let prisma: PrismaService;

let tokenA: string;
let tokenB: string;

let seedData: {
  screeningId: number;
  seatIds: number[];
};

const infraIds: {
  gradeId: number;
  cinemaId: number;
  screenId: number;
  screenTypeId: number;
  seatTypeId: number;
  movieId: number;
  screeningId: number;
  pricingIds: number[];
} = {
  gradeId: 0,
  cinemaId: 0,
  screenId: 0,
  screenTypeId: 0,
  seatTypeId: 0,
  movieId: 0,
  screeningId: 0,
  pricingIds: [],
};

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────────

/** 다음 평일(월~금) 오후 2시를 반환 — pricing dayType을 WEEKDAY로 고정 */
function nextWeekdayAt14(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(14, 0, 0, 0);
  return d;
}

/** prisma로 고객 생성 후 login API로 실제 JWT 발급 */
async function createUserAndGetToken(
  email: string,
  password: string,
  name: string,
): Promise<string> {
  const hashed = await bcrypt.hash(password, 10);
  await prisma.customer.create({
    data: { email, password: hashed, name, gradeId: infraIds.gradeId },
  });
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password });
  return res.body.token;
}

// ─── Suite 생명주기 ─────────────────────────────────────────────────────────────

beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  await app.init();

  prisma = app.get(PrismaService);

  // 1. 멤버십 등급 (고객 생성 시 gradeId FK 필요)
  const grade = await prisma.membershipGrade.upsert({
    where: { name: 'E2E_WELCOME' },
    update: {},
    create: {
      name: 'E2E_WELCOME',
      displayName: '웰컴',
      minAmount: 0,
      maxAmount: null,
      discountPercent: 0,
      bgColor: '#6b7280',
    },
  });
  infraIds.gradeId = grade.id;

  // 2. 좌석 타입
  const seatType = await prisma.seatType.upsert({
    where: { name: 'E2E_일반석' },
    update: {},
    create: { name: 'E2E_일반석', additionalPrice: 0 },
  });
  infraIds.seatTypeId = seatType.id;

  // 3. 상영관 타입
  const screenType = await prisma.screenType.upsert({
    where: { name: 'E2E_일반관' },
    update: {},
    create: { name: 'E2E_일반관', grade: '일반관' },
  });
  infraIds.screenTypeId = screenType.id;

  // 4. 영화관 + 상영관 (타임스탬프로 매 실행마다 유일)
  const cinema = await prisma.cinema.create({
    data: { name: `E2E_시네마_${Date.now()}`, address: '서울 강남구', region: '서울' },
  });
  infraIds.cinemaId = cinema.id;

  const screen = await prisma.screen.create({
    data: {
      name: 'E2E_1관',
      totalSeats: 5,
      cinemaId: cinema.id,
      screenTypeId: screenType.id,
    },
  });
  infraIds.screenId = screen.id;

  // 5. 좌석 5석
  const seats = await Promise.all(
    [1, 2, 3, 4, 5].map((num) =>
      prisma.seat.create({
        data: { row: 'A', number: num, screenId: screen.id, seatTypeId: seatType.id },
      }),
    ),
  );

  // 6. 영화 + 상영 (평일 WEEKDAY 고정)
  const movie = await prisma.movie.create({
    data: {
      title: 'E2E_테스트영화',
      runtime: 120,
      rating: '전체관람가',
      genre: '액션',
      synopsis: 'E2E 테스트용',
      releaseDate: new Date(),
    },
  });
  infraIds.movieId = movie.id;

  const startTime = nextWeekdayAt14();
  const screening = await prisma.screening.create({
    data: {
      startTime,
      endTime: new Date(startTime.getTime() + 2 * 60 * 60 * 1000),
      screenType: '2D',
      movieId: movie.id,
      screenId: screen.id,
    },
  });
  infraIds.screeningId = screening.id;

  // 7. 요금 정책 (WEEKDAY + WEEKEND 공통, ADULT 13,000원)
  const pricingIds: number[] = [];
  for (const dayType of ['WEEKDAY', 'WEEKEND']) {
    const policy = await prisma.pricingPolicy.create({
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
    pricingIds.push(policy.id);
  }
  infraIds.pricingIds = pricingIds;

  seedData = {
    screeningId: screening.id,
    seatIds: seats.map((s) => s.id),
  };

  // 8. 테스트 사용자 2명 (prisma 직접 생성 → login API로 JWT)
  tokenA = await createUserAndGetToken('user-a@e2e.local', 'test1234!', 'User A');
  tokenB = await createUserAndGetToken('user-b@e2e.local', 'test1234!', 'User B');
}, 30000);

afterAll(async () => {
  // e2e 고객 + 연관 데이터 정리
  const e2eCustomers = await prisma.customer.findMany({
    where: { email: { contains: '@e2e.local' } },
    select: { id: true },
  });
  const ids = e2eCustomers.map((c) => c.id);
  if (ids.length > 0) {
    await prisma.couponUsage.deleteMany({ where: { reservation: { customerId: { in: ids } } } });
    await prisma.partnerDiscountUsage.deleteMany({ where: { reservation: { customerId: { in: ids } } } });
    await prisma.ticket.deleteMany({ where: { reservation: { customerId: { in: ids } } } });
    await prisma.reservation.deleteMany({ where: { customerId: { in: ids } } });
    await prisma.userCoupon.deleteMany({ where: { customerId: { in: ids } } });
    await prisma.membershipHistory.deleteMany({ where: { customerId: { in: ids } } });
    await prisma.customer.deleteMany({ where: { email: { contains: '@e2e.local' } } });
  }

  // 인프라 역순 정리
  if (infraIds.pricingIds.length > 0) {
    await prisma.pricingPolicy.deleteMany({ where: { id: { in: infraIds.pricingIds } } });
  }
  await prisma.ticket.deleteMany({ where: { seat: { screenId: infraIds.screenId } } });
  await prisma.reservation.deleteMany({ where: { screeningId: infraIds.screeningId } });
  await prisma.screening.deleteMany({ where: { id: infraIds.screeningId } });
  await prisma.seat.deleteMany({ where: { screenId: infraIds.screenId } });
  await prisma.movie.deleteMany({ where: { id: infraIds.movieId } });
  await prisma.screen.deleteMany({ where: { id: infraIds.screenId } });
  await prisma.cinema.deleteMany({ where: { id: infraIds.cinemaId } });
  await prisma.screenType.deleteMany({ where: { name: 'E2E_일반관' } });
  await prisma.seatType.deleteMany({ where: { name: 'E2E_일반석' } });
  await prisma.membershipGrade.deleteMany({ where: { name: 'E2E_WELCOME' } });

  await app.close();
}, 30000);

// ═══════════════════════════════════════════════════════════════════════════════
describe('정상 예매 흐름', () => {
  it('POST /reservations → 201, status=PENDING, orderId와 totalAmount 포함', async () => {
    const res = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        screeningId: seedData.screeningId,
        seatIds: [seedData.seatIds[0], seedData.seatIds[1]],
        audienceCounts: { ADULT: 2 },
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(typeof res.body.orderId).toBe('string');
    expect(res.body.orderId.length).toBeGreaterThan(0);
    // ADULT 13,000원 × 2석 = 26,000원 (좌석 추가금·멤버십 없음)
    expect(res.body.totalAmount).toBe(26000);
  });

  it('totalAmount 위변조 시도 → 400 (forbidNonWhitelisted)', async () => {
    const res = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        screeningId: seedData.screeningId,
        seatIds: [seedData.seatIds[2], seedData.seatIds[3]],
        audienceCounts: { ADULT: 2 },
        totalAmount: 1, // DTO에 없는 필드
      });

    expect(res.status).toBe(400);
    const msg = Array.isArray(res.body.message)
      ? res.body.message.join(' ')
      : String(res.body.message);
    expect(msg).toContain('totalAmount');
  });

  it('미인증 요청 → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/reservations')
      .send({
        screeningId: seedData.screeningId,
        seatIds: [seedData.seatIds[0]],
        audienceCounts: { ADULT: 1 },
      });

    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('결제 보안', () => {
  it('amount 불일치 시 confirm 차단 → 400', async () => {
    // 예매 생성 (totalAmount = 13,000)
    const createRes = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        screeningId: seedData.screeningId,
        seatIds: [seedData.seatIds[0]],
        audienceCounts: { ADULT: 1 },
      });
    expect(createRes.status).toBe(201);
    const { orderId } = createRes.body;

    // 위변조 금액으로 confirm 시도
    const confirmRes = await request(app.getHttpServer())
      .post('/payments/confirm')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        paymentKey: 'fake-payment-key',
        orderId,
        amount: 1, // 실제 totalAmount(13,000)와 불일치
      });

    expect(confirmRes.status).toBe(400);
    expect(confirmRes.body.message).toContain('결제 금액이 일치하지 않습니다');
  });

  it('타인의 reservation confirm 시도 → 403', async () => {
    // User A가 예매 생성
    const createRes = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        screeningId: seedData.screeningId,
        seatIds: [seedData.seatIds[0]],
        audienceCounts: { ADULT: 1 },
      });
    expect(createRes.status).toBe(201);
    const { orderId, totalAmount } = createRes.body;

    // User B가 User A의 orderId로 confirm 시도
    const confirmRes = await request(app.getHttpServer())
      .post('/payments/confirm')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        paymentKey: 'fake-payment-key',
        orderId,
        amount: totalAmount,
      });

    expect(confirmRes.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('동시 좌석 예매', () => {
  it('Promise.all 동시 예매 → 한 명만 성공(201), 나머지 충돌(409)', async () => {
    const dto = {
      screeningId: seedData.screeningId,
      seatIds: [seedData.seatIds[0], seedData.seatIds[1]],
      audienceCounts: { ADULT: 2 },
    };

    const [resA, resB] = await Promise.all([
      request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${tokenA}`)
        .send(dto),
      request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', `Bearer ${tokenB}`)
        .send(dto),
    ]);

    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);

    const failedRes = resA.status === 409 ? resA : resB;
    expect(failedRes.body.message).toContain('이미 예매된 좌석');
  }, 15000);
});
