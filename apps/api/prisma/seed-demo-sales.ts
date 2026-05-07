import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 가격표 (ADULT 기준, 평일)
const SCREEN_PRICES: Record<string, Record<string, number>> = {
  '일반관':    { '2D': 13000, '3D': 16000 },
  '샤롯데':    { '2D': 35000, '3D': 38000 },
  '수퍼플렉스': { '2D': 18000, '3D': 21000 },
  '수퍼4D':   { '2D': 20000, '3D': 23000 },
};

const SURNAMES   = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권'];
const GIVEN_NAMES = ['민준', '서준', '도윤', '수아', '지아', '서연', '지유', '서윤', '지민', '하준', '지호', '예준', '현우', '선우', '건우', '채원', '수빈', '지현', '예은', '나은', '시우', '주원', '준서', '수호', '준우'];

function ri(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weighted<T>(opts: { w: number; v: T }[]): T {
  const total = opts.reduce((s, o) => s + o.w, 0);
  let r = Math.random() * total;
  for (const o of opts) { r -= o.w; if (r <= 0) return o.v; }
  return opts[opts.length - 1].v;
}

async function seedDemoSales() {
  // 멱등 체크 — 이미 실행된 경우 스킵
  const existing = await prisma.customer.count({ where: { email: { endsWith: '@cinex-demo.com' } } });
  if (existing > 0) {
    console.log('⚠️  데모 데이터가 이미 존재합니다. 중복 실행을 방지합니다.');
    console.log('    재생성하려면 demo*@cinex-demo.com 고객과 관련 예매를 먼저 삭제하세요.');
    return;
  }

  // 기반 데이터 확인
  const welcomeGrade = await prisma.membershipGrade.findFirst({ where: { name: 'WELCOME' } });
  if (!welcomeGrade) {
    console.error('❌ WELCOME 등급 없음. 먼저 pnpm db:seed 를 실행하세요.');
    process.exit(1);
  }

  const screenings = await prisma.screening.findMany({
    include: { screen: { include: { screenType: true } } },
  });
  if (screenings.length === 0) {
    console.error('❌ 상영 정보 없음. 먼저 pnpm db:seed 를 실행하세요.');
    process.exit(1);
  }

  // ── 1. 데모 고객 30명 ──────────────────────────────────────────────
  const password = await bcrypt.hash('demo1234!', 10);
  const customers: { id: number }[] = [];

  for (let i = 1; i <= 30; i++) {
    const email = `demo${String(i).padStart(2, '0')}@cinex-demo.com`;
    const joinedAt = new Date(Date.now() - ri(1, 90) * 86400_000);
    const customer = await prisma.customer.create({
      data: {
        email,
        password,
        name: `${pick(SURNAMES)}${pick(GIVEN_NAMES)}`,
        phone: `010-${String(ri(1000, 9999))}-${String(ri(1000, 9999))}`,
        gradeId: welcomeGrade.id,
        createdAt: joinedAt,
      },
    });
    customers.push({ id: customer.id });
  }
  console.log(`  데모 고객 ${customers.length}명 생성`);

  // ── 2. 90일치 예매 생성 ────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let orderSeq = 0;
  let reservationCount = 0;

  for (let day = 90; day >= 0; day--) {
    const date = new Date(today.getTime() - day * 86400_000);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const dailyCount = isWeekend ? ri(10, 25) : ri(5, 15);

    for (let i = 0; i < dailyCount; i++) {
      const customer = pick(customers);
      const screening = pick(screenings);
      const seatCount = weighted([
        { w: 50, v: 1 },
        { w: 35, v: 2 },
        { w: 10, v: 3 },
        { w:  5, v: 4 },
      ]);

      const screenTypeName = screening.screen.screenType.name;
      const format          = screening.screenType; // "2D" | "3D"
      const pricePerSeat    = SCREEN_PRICES[screenTypeName]?.[format] ?? 13000;
      // 주말 요금 1.15배 (매트릭스 단순화)
      const dayMultiplier   = isWeekend ? 1.15 : 1;
      const totalAmount     = Math.round(pricePerSeat * dayMultiplier / 1000) * 1000 * seatCount;

      const reservedAt = new Date(date.getTime() + (ri(9, 22) * 60 + ri(0, 59)) * 60_000);

      const status = weighted<'PAID' | 'CANCELLED' | 'FAILED'>([
        { w: 90, v: 'PAID'      },
        { w:  8, v: 'CANCELLED' },
        { w:  2, v: 'FAILED'    },
      ]);

      try {
        await prisma.reservation.create({
          data: {
            customerId:    customer.id,
            screeningId:   screening.id,
            totalAmount,
            audienceCounts: { ADULT: seatCount },
            status,
            orderId:  `demo_${date.toISOString().slice(0, 10)}_${String(++orderSeq).padStart(5, '0')}`,
            createdAt: reservedAt,
            paidAt:   status === 'PAID' ? reservedAt : null,
          },
        });
        reservationCount++;
      } catch {
        // orderId 충돌 등 예외 무시
      }
    }
  }
  console.log(`  예매 ${reservationCount}건 생성`);

  // ── 3. 고객 누적금액 / 등급 업데이트 ─────────────────────────────
  const [vipGrade, vvipGrade, lvipGrade] = await Promise.all([
    prisma.membershipGrade.findFirst({ where: { name: 'VIP'  } }),
    prisma.membershipGrade.findFirst({ where: { name: 'VVIP' } }),
    prisma.membershipGrade.findFirst({ where: { name: 'LVIP' } }),
  ]);

  for (const { id } of customers) {
    const agg = await prisma.reservation.aggregate({
      where: { customerId: id, status: 'PAID' },
      _sum: { totalAmount: true },
    });
    const total = agg._sum.totalAmount ?? 0;

    let gradeId = welcomeGrade.id;
    if (total >= 500000 && lvipGrade)  gradeId = lvipGrade.id;
    else if (total >= 200000 && vvipGrade) gradeId = vvipGrade.id;
    else if (total >= 50000  && vipGrade)  gradeId = vipGrade.id;

    await prisma.customer.update({
      where: { id },
      data: { totalAmount: total, gradeId },
    });
  }
  console.log('  고객 등급/누적금액 업데이트 완료');

  // ── 통계 출력 ─────────────────────────────────────────────────────
  const [totalRes, paidRes, revenueAgg] = await Promise.all([
    prisma.reservation.count({ where: { orderId: { startsWith: 'demo_' } } }),
    prisma.reservation.count({ where: { orderId: { startsWith: 'demo_' }, status: 'PAID' } }),
    prisma.reservation.aggregate({
      where: { orderId: { startsWith: 'demo_' }, status: 'PAID' },
      _sum: { totalAmount: true },
    }),
  ]);

  const revenue = (revenueAgg._sum.totalAmount ?? 0).toLocaleString('ko-KR');
  console.log('\n=== 데모 매출 시드 완료 ===');
  console.log(`  데모 고객     : 30명`);
  console.log(`  총 예매       : ${totalRes}건 (결제완료: ${paidRes}건)`);
  console.log(`  총 매출       : ₩${revenue}`);
  console.log('\n⚠️  멱등 X — 두 번 실행하면 데이터 두 배. 한 번만 실행할 것.');
}

seedDemoSales()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
