import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// ─── 전역 상태 ────────────────────────────────────────────────────────────────

let app: INestApplication;
let prisma: PrismaService;
let adminToken: string;
let userToken: string;

const infraIds = {
  testGradeId: 0, // E2E_ADMIN_VIP (bulk issue 대상 고객용)
  testCustomerIds: [] as number[],
  couponId: 0,
  cinemaId: 0,
  screenId: 0,
  screenTypeId: 0,
  seatTypeId: 0,
  genreName: 'E2E_ADMIN_장르',
  createdMovieIds: [] as number[],
  createdScreeningIds: [] as number[],
};

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

async function login(email: string, password: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password });
  return res.body.token as string;
}

// ─── 생명주기 ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.init();
  prisma = app.get(PrismaService);

  const ts = Date.now();

  // 1. WELCOME 등급 (admin·일반유저 FK용 — 시드값 우선, 없으면 생성)
  const welcomeGrade = await prisma.membershipGrade.upsert({
    where: { name: 'WELCOME' },
    update: {},
    create: {
      name: 'WELCOME',
      displayName: '웰컴',
      minAmount: 0,
      maxAmount: 49999,
      discountPercent: 0,
      bgColor: '#6b7280',
    },
  });

  // 2. 일괄 발급 대상 고객용 등급
  const testGrade = await prisma.membershipGrade.upsert({
    where: { name: 'E2E_ADMIN_VIP' },
    update: {},
    create: {
      name: 'E2E_ADMIN_VIP',
      displayName: 'E2E VIP',
      minAmount: 50000,
      maxAmount: null,
      discountPercent: 0,
      bgColor: '#dc2626',
    },
  });
  infraIds.testGradeId = testGrade.id;

  // 3. 관리자 계정 (시드가 적용된 DB면 비밀번호·역할 보존, 없으면 생성)
  const adminHash = await bcrypt.hash('admin1234!', 10);
  await prisma.customer.upsert({
    where: { email: 'admin@cinex.com' },
    update: { role: 'ADMIN' },
    create: {
      email: 'admin@cinex.com',
      password: adminHash,
      name: '관리자',
      role: 'ADMIN',
      gradeId: welcomeGrade.id,
    },
  });
  adminToken = await login('admin@cinex.com', 'admin1234!');

  // 4. 일반 사용자
  const userHash = await bcrypt.hash('user1234!', 10);
  await prisma.customer.upsert({
    where: { email: 'user@admin-e2e.local' },
    update: {},
    create: {
      email: 'user@admin-e2e.local',
      password: userHash,
      name: 'E2E 일반유저',
      role: 'USER',
      gradeId: welcomeGrade.id,
    },
  });
  userToken = await login('user@admin-e2e.local', 'user1234!');

  // 5. 일괄 발급 테스트용 고객 2명
  for (const email of ['bulk1@admin-e2e.local', 'bulk2@admin-e2e.local']) {
    const hash = await bcrypt.hash('test1234!', 10);
    const c = await prisma.customer.upsert({
      where: { email },
      update: { gradeId: testGrade.id },
      create: {
        email,
        password: hash,
        name: email.split('@')[0],
        gradeId: testGrade.id,
      },
    });
    infraIds.testCustomerIds.push(c.id);
  }

  // 6. 영화 등록 테스트용 장르
  await prisma.genre.upsert({
    where: { name: infraIds.genreName },
    update: {},
    create: { name: infraIds.genreName },
  });

  // 7. 일괄 발급 테스트용 쿠폰
  const coupon = await prisma.coupon.create({
    data: {
      code: `E2E_ADMIN_BULK_${ts}`,
      name: 'E2E 어드민 테스트 쿠폰',
      type: 'AMOUNT_DISCOUNT',
      value: 1000,
      issuePolicy: 'CODE',
    },
  });
  infraIds.couponId = coupon.id;

  // 8. 영화 삭제 차단 테스트용 최소 상영관 인프라
  const seatType = await prisma.seatType.upsert({
    where: { name: 'E2E_ADMIN_일반석' },
    update: {},
    create: { name: 'E2E_ADMIN_일반석', additionalPrice: 0 },
  });
  infraIds.seatTypeId = seatType.id;

  const screenType = await prisma.screenType.upsert({
    where: { name: 'E2E_ADMIN_일반관' },
    update: {},
    create: { name: 'E2E_ADMIN_일반관', grade: '일반관' },
  });
  infraIds.screenTypeId = screenType.id;

  const cinema = await prisma.cinema.create({
    data: {
      name: `E2E_ADMIN_시네마_${ts}`,
      address: '서울 강남구',
      region: '서울',
    },
  });
  infraIds.cinemaId = cinema.id;

  const screen = await prisma.screen.create({
    data: {
      name: 'E2E_ADMIN_1관',
      totalSeats: 10,
      cinemaId: cinema.id,
      screenTypeId: screenType.id,
    },
  });
  infraIds.screenId = screen.id;
}, 30000);

afterAll(async () => {
  // 상영 → 영화 (FK 역순)
  if (infraIds.createdScreeningIds.length > 0) {
    await prisma.screening.deleteMany({
      where: { id: { in: infraIds.createdScreeningIds } },
    });
  }
  if (infraIds.createdMovieIds.length > 0) {
    await prisma.movieGenre.deleteMany({
      where: { movieId: { in: infraIds.createdMovieIds } },
    });
    await prisma.movie.deleteMany({
      where: { id: { in: infraIds.createdMovieIds } },
    });
  }

  // 쿠폰
  await prisma.coupon.deleteMany({ where: { id: infraIds.couponId } });

  // 장르
  await prisma.genre.deleteMany({ where: { name: infraIds.genreName } });

  // @admin-e2e.local 고객 → E2E_ADMIN_VIP 등급 순
  await prisma.customer.deleteMany({
    where: { email: { contains: '@admin-e2e.local' } },
  });
  await prisma.membershipGrade.deleteMany({ where: { name: 'E2E_ADMIN_VIP' } });

  // 상영관 인프라 (Screen → Cinema → ScreenType → SeatType)
  await prisma.screen.deleteMany({ where: { id: infraIds.screenId } });
  await prisma.cinema.deleteMany({ where: { id: infraIds.cinemaId } });
  await prisma.screenType.deleteMany({ where: { name: 'E2E_ADMIN_일반관' } });
  await prisma.seatType.deleteMany({ where: { name: 'E2E_ADMIN_일반석' } });

  await app.close();
}, 30000);

// ═══════════════════════════════════════════════════════════════════════════════
describe('AdminGuard 권한 검증', () => {
  it('일반 사용자 → GET /admin/movies → 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/movies')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('admin 토큰 → GET /admin/movies → 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/movies')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  it('인증 없이 → GET /admin/movies → 401', async () => {
    const res = await request(app.getHttpServer()).get('/admin/movies');

    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('어드민 영화 CRUD', () => {
  it('POST /admin/movies → 201, 등록된 영화 반환', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/movies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `E2E_테스트영화_${Date.now()}`,
        runtime: 120,
        rating: '전체관람가',
        synopsis: 'E2E 어드민 테스트용 영화',
        releaseDate: '2026-05-07',
        genres: [infraIds.genreName],
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.genres).toHaveLength(1);
    expect(res.body.genres[0].genre.name).toBe(infraIds.genreName);

    infraIds.createdMovieIds.push(res.body.id as number);
  });

  it('상영 있는 영화 DELETE → 400 (삭제 불가)', async () => {
    // 영화 생성
    const movieRes = await request(app.getHttpServer())
      .post('/admin/movies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `E2E_삭제불가_${Date.now()}`,
        runtime: 90,
        rating: '전체관람가',
        synopsis: '삭제 차단 테스트용',
        releaseDate: '2026-05-07',
        genres: [infraIds.genreName],
      });
    expect(movieRes.status).toBe(201);
    const movieId = movieRes.body.id as number;
    infraIds.createdMovieIds.push(movieId);

    // 해당 영화로 상영 생성 (서비스 우회 — 상영 존재 여부만 테스트)
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const screening = await prisma.screening.create({
      data: {
        startTime,
        endTime: new Date(startTime.getTime() + 2 * 60 * 60 * 1000),
        screenType: '2D',
        movieId,
        screenId: infraIds.screenId,
      },
    });
    infraIds.createdScreeningIds.push(screening.id);

    // 삭제 시도 → 400
    const deleteRes = await request(app.getHttpServer())
      .delete(`/admin/movies/${movieId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body.message).toContain(
      '상영 스케줄이 있는 영화는 삭제할 수 없습니다',
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('어드민 쿠폰 일괄 발급', () => {
  it('POST /admin/coupons/bulk-issue/preview → 대상 명단 + alreadyHas 플래그', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/coupons/bulk-issue/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ couponId: infraIds.couponId, gradeNames: ['E2E_ADMIN_VIP'] });

    expect(res.status).toBe(201);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThanOrEqual(2);

    const bulk1 = res.body.find(
      (c: { email: string }) => c.email === 'bulk1@admin-e2e.local',
    );
    expect(bulk1).toBeDefined();
    expect(bulk1).toHaveProperty('alreadyHas', false); // 아직 발급 전
    expect(bulk1).toHaveProperty('email');
    expect(bulk1).toHaveProperty('membershipGrade');
  });

  it('POST /admin/coupons/bulk-issue/execute → 이미 보유 1명 스킵, 나머지 발급', async () => {
    const [cust1Id, cust2Id] = infraIds.testCustomerIds;

    // 고객 1에게 미리 쿠폰 보유 상태 세팅
    await prisma.userCoupon.create({
      data: {
        customerId: cust1Id,
        couponId: infraIds.couponId,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    // 두 명 모두 대상으로 일괄 발급 실행
    const res = await request(app.getHttpServer())
      .post('/admin/coupons/bulk-issue/execute')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ couponId: infraIds.couponId, customerIds: [cust1Id, cust2Id] });

    expect(res.status).toBe(201);
    expect(res.body.issued).toBe(1); // cust2만 신규 발급
    expect(res.body.skipped).toBe(1); // cust1은 이미 보유 → 스킵
  });
});
