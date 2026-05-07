import { config } from 'dotenv';
import { resolve } from 'path';
import { execSync } from 'child_process';

// 테스트 환경 변수 로드 (다른 import보다 먼저 실행됨)
config({ path: resolve(__dirname, '../.env.test') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    cwd: resolve(__dirname, '..'),
    env: { ...process.env },
  });
});

afterEach(async () => {
  // FK 의존 순서 역순으로 삭제
  await prisma.couponUsage.deleteMany();
  await prisma.partnerDiscountUsage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.eventApplication.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.userCoupon.deleteMany();
  await prisma.membershipHistory.deleteMany();
  // 시드 admin 계정 제외, @test.local 이메일만 삭제
  await prisma.customer.deleteMany({
    where: { email: { contains: '@test.local' } },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
