import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PRICING_MATRIX: Record<string, Record<string, Record<string, Record<string, number>>>> = {
  '일반관': {
    '2D': {
      WEEKDAY: { ADULT: 13000, TEEN: 10000, SENIOR: 8000, DISABLED: 8000, CHILD: 8000 },
      WEEKEND: { ADULT: 15000, TEEN: 12000, SENIOR: 10000, DISABLED: 10000, CHILD: 10000 },
    },
    '3D': {
      WEEKDAY: { ADULT: 16000, TEEN: 13000, SENIOR: 11000, DISABLED: 11000, CHILD: 11000 },
      WEEKEND: { ADULT: 18000, TEEN: 15000, SENIOR: 13000, DISABLED: 13000, CHILD: 13000 },
    },
  },
  '샤롯데': {
    '2D': {
      WEEKDAY: { ADULT: 35000, TEEN: 35000, SENIOR: 35000, DISABLED: 30000, CHILD: 35000 },
      WEEKEND: { ADULT: 40000, TEEN: 40000, SENIOR: 40000, DISABLED: 35000, CHILD: 40000 },
    },
    '3D': {
      WEEKDAY: { ADULT: 38000, TEEN: 38000, SENIOR: 38000, DISABLED: 33000, CHILD: 38000 },
      WEEKEND: { ADULT: 43000, TEEN: 43000, SENIOR: 43000, DISABLED: 38000, CHILD: 43000 },
    },
  },
  '수퍼플렉스': {
    '2D': {
      WEEKDAY: { ADULT: 18000, TEEN: 15000, SENIOR: 13000, DISABLED: 13000, CHILD: 13000 },
      WEEKEND: { ADULT: 20000, TEEN: 17000, SENIOR: 15000, DISABLED: 15000, CHILD: 15000 },
    },
    '3D': {
      WEEKDAY: { ADULT: 21000, TEEN: 18000, SENIOR: 16000, DISABLED: 16000, CHILD: 16000 },
      WEEKEND: { ADULT: 23000, TEEN: 20000, SENIOR: 18000, DISABLED: 18000, CHILD: 18000 },
    },
  },
  '수퍼4D': {
    '2D': {
      WEEKDAY: { ADULT: 20000, TEEN: 17000, SENIOR: 15000, DISABLED: 15000, CHILD: 15000 },
      WEEKEND: { ADULT: 22000, TEEN: 19000, SENIOR: 17000, DISABLED: 17000, CHILD: 17000 },
    },
    '3D': {
      WEEKDAY: { ADULT: 23000, TEEN: 20000, SENIOR: 18000, DISABLED: 18000, CHILD: 18000 },
      WEEKEND: { ADULT: 25000, TEEN: 22000, SENIOR: 20000, DISABLED: 20000, CHILD: 20000 },
    },
  },
};

const MEMBERSHIP_GRADES = [
  {
    name: 'WELCOME',
    displayName: '웰컴',
    description: '환영합니다!',
    minAmount: 0,
    maxAmount: 49999,
    discountPercent: 0,
    bgColor: '#6b7280',
  },
  {
    name: 'VIP',
    displayName: 'VIP',
    description: '연 5만원 이상 결제 시',
    minAmount: 50000,
    maxAmount: 199999,
    discountPercent: 3,
    maxDiscount: 3000,
    bgColor: '#dc2626',
  },
  {
    name: 'VVIP',
    displayName: 'VVIP',
    description: '연 20만원 이상 결제 시',
    minAmount: 200000,
    maxAmount: 499999,
    discountPercent: 5,
    maxDiscount: 5000,
    bgColor: '#7c3aed',
  },
  {
    name: 'LVIP',
    displayName: 'LVIP',
    description: '연 50만원 이상 결제 시',
    minAmount: 500000,
    maxAmount: null,
    discountPercent: 7,
    maxDiscount: 8000,
    bgColor: '#fbbf24',
  },
];

const MEMBERSHIP_REWARD_LINKS = [
  { gradeName: 'VIP',  couponCode: 'WELCOME2026',   quantity: 1 },
  { gradeName: 'VVIP', couponCode: 'MAY-PROMO',     quantity: 1 },
  { gradeName: 'VVIP', couponCode: 'BIRTHDAY-GIFT', quantity: 1 },
  { gradeName: 'LVIP', couponCode: 'FREE-MOVIE',    quantity: 1 },
  { gradeName: 'LVIP', couponCode: 'TWO-FREE',      quantity: 1 },
];

const COUPONS = [
  {
    code: 'WELCOME2026',
    name: '신규 가입 환영 쿠폰',
    description: '신규 가입 회원에게 드리는 3,000원 할인 쿠폰',
    type: 'AMOUNT_DISCOUNT',
    value: 3000,
    minPurchase: 10000,
    validDays: 90,
    issuePolicy: 'WELCOME',
    bgColor: '#dc2626',
  },
  {
    code: 'MAY-PROMO',
    name: '5월 가정의 달 10% 할인',
    description: '5월 한정 모든 영화 10% 할인',
    type: 'PERCENT_DISCOUNT',
    value: 10,
    minPurchase: 20000,
    maxDiscount: 5000,
    validDays: 30,
    issuePolicy: 'CODE',
    bgColor: '#f59e0b',
  },
  {
    code: 'FREE-MOVIE',
    name: '영화 무료 관람권',
    description: '가장 비싼 좌석 1자리 무료 관람권',
    type: 'FREE_TICKET',
    value: 1,
    validDays: 60,
    issuePolicy: 'CODE',
    bgColor: '#7c3aed',
  },
  {
    code: 'STUDENT-30',
    name: '학생 응원 쿠폰',
    description: '학생 인증 회원에게 드리는 30% 할인 (최대 8,000원)',
    type: 'PERCENT_DISCOUNT',
    value: 30,
    minPurchase: 15000,
    maxDiscount: 8000,
    validDays: 365,
    issuePolicy: 'CODE',
    bgColor: '#2563eb',
  },
  {
    code: 'BIRTHDAY-GIFT',
    name: '생일 축하 쿠폰',
    description: '생일 달의 회원에게 드리는 5,000원 할인',
    type: 'AMOUNT_DISCOUNT',
    value: 5000,
    minPurchase: 10000,
    validDays: 30,
    issuePolicy: 'CODE',
    bgColor: '#db2777',
  },
  {
    code: 'TWO-FREE',
    name: '커플 무료 관람권',
    description: '가장 비싼 좌석 2자리 무료 (커플석 추천!)',
    type: 'FREE_TICKET',
    value: 2,
    validDays: 90,
    issuePolicy: 'CODE',
    bgColor: '#16a34a',
  },
];

const PARTNER_DISCOUNTS = [
  {
    name: '신한카드 영화 2,000원 할인',
    partnerType: 'CARD',
    partnerName: '신한카드',
    description: '1만원 이상 결제 시 자동 적용',
    discountMethod: 'AMOUNT',
    discountValue: 2000,
    minPurchase: 10000,
    combinableWithCoupon: true,
    bgColor: '#0046ff',
    imageUrl: 'https://placehold.co/200x130/0046ff/white?text=Shinhan',
  },
  {
    name: '현대카드 영화 3,000원 할인',
    partnerType: 'CARD',
    partnerName: '현대카드',
    description: '1.5만원 이상 결제 시 적용',
    discountMethod: 'AMOUNT',
    discountValue: 3000,
    minPurchase: 15000,
    combinableWithCoupon: true,
    bgColor: '#000000',
    imageUrl: 'https://placehold.co/200x130/000000/white?text=Hyundai',
  },
  {
    name: 'KB국민카드 5% 청구할인',
    partnerType: 'CARD',
    partnerName: 'KB국민카드',
    description: '주말 영화 관람 시 5% 할인 (최대 5,000원)',
    discountMethod: 'PERCENT',
    discountValue: 5,
    maxDiscount: 5000,
    minPurchase: 20000,
    combinableWithCoupon: true,
    bgColor: '#ffb600',
    imageUrl: 'https://placehold.co/200x130/ffb600/black?text=KB',
  },
  {
    name: '삼성카드 10% 즉시할인',
    partnerType: 'CARD',
    partnerName: '삼성카드',
    description: '평일 한정 10% 할인 (최대 8,000원)',
    discountMethod: 'PERCENT',
    discountValue: 10,
    maxDiscount: 8000,
    minPurchase: 25000,
    combinableWithCoupon: true,
    bgColor: '#1428a0',
    imageUrl: 'https://placehold.co/200x130/1428a0/white?text=Samsung',
  },
  {
    name: '롯데카드 영화 1,500원 할인',
    partnerType: 'CARD',
    partnerName: '롯데카드',
    description: '한도 무제한, 매일 사용 가능',
    discountMethod: 'AMOUNT',
    discountValue: 1500,
    minPurchase: 8000,
    combinableWithCoupon: true,
    bgColor: '#ed1c24',
    imageUrl: 'https://placehold.co/200x130/ed1c24/white?text=Lotte',
  },
];

async function seedMembershipGrades() {
  for (const grade of MEMBERSHIP_GRADES) {
    await prisma.membershipGrade.upsert({
      where: { name: grade.name },
      create: grade,
      update: grade,
    });
  }
  console.log(`  MembershipGrade ${MEMBERSHIP_GRADES.length}개`);
}

async function seedMembershipRewards() {
  for (const link of MEMBERSHIP_REWARD_LINKS) {
    const grade = await prisma.membershipGrade.findUnique({ where: { name: link.gradeName } });
    const coupon = await prisma.coupon.findUnique({ where: { code: link.couponCode } });
    if (!grade || !coupon) continue;
    await prisma.membershipReward.upsert({
      where: { gradeId_couponId: { gradeId: grade.id, couponId: coupon.id } },
      create: { gradeId: grade.id, couponId: coupon.id, quantity: link.quantity },
      update: { quantity: link.quantity },
    });
  }
  console.log(`  MembershipReward ${MEMBERSHIP_REWARD_LINKS.length}개`);
}

async function seedPartnerDiscounts() {
  for (const pd of PARTNER_DISCOUNTS) {
    const exists = await prisma.partnerDiscount.findFirst({ where: { name: pd.name } });
    if (!exists) await prisma.partnerDiscount.create({ data: pd });
  }
  console.log(`  PartnerDiscount ${PARTNER_DISCOUNTS.length}개`);
}

async function seedCoupons() {
  for (const c of COUPONS) {
    await prisma.coupon.upsert({ where: { code: c.code }, create: c, update: c });
  }
  console.log(`  Coupon ${COUPONS.length}개 생성`);

  const testUser = await prisma.customer.findUnique({ where: { email: 'test@test.com' } });
  if (!testUser) return;

  const issueCodes = ['WELCOME2026', 'MAY-PROMO', 'FREE-MOVIE'];
  for (const code of issueCodes) {
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) continue;
    await prisma.userCoupon.create({
      data: {
        customerId: testUser.id,
        couponId: coupon.id,
        expiresAt: new Date(Date.now() + coupon.validDays * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`  테스트 사용자에게 UserCoupon ${issueCodes.length}개 발급`);
}

async function seedPricingPolicies() {
  const screenTypes = await prisma.screenType.findMany();
  const policies: {
    cinemaId: null;
    screenTypeId: number;
    format: string;
    dayType: string;
    audienceType: string;
    basePrice: number;
  }[] = [];

  for (const screenType of screenTypes) {
    const matrix = PRICING_MATRIX[screenType.name];
    if (!matrix) continue;

    for (const format of ['2D', '3D']) {
      for (const dayType of ['WEEKDAY', 'WEEKEND']) {
        for (const audienceType of ['ADULT', 'TEEN', 'SENIOR', 'DISABLED', 'CHILD']) {
          const price = matrix[format][dayType][audienceType];
          policies.push({
            cinemaId: null,
            screenTypeId: screenType.id,
            format,
            dayType,
            audienceType,
            basePrice: price,
          });
        }
      }
    }
  }

  await prisma.pricingPolicy.createMany({ data: policies });
  console.log(`  PricingPolicy ${policies.length}개 생성`);
}

function dateAt(dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const MOVIES = [
  {
    title: '슈퍼 마리오 갤럭시',
    genre: '애니메이션',
    rating: '전체관람가',
    runtime: 90,
    releaseDate: new Date('2026-04-29'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20259773&source=https://admin.moviechart.co.kr/assets/upload/movie/260401003359_5361.jpg',
    synopsis: '마리오와 루이지가 우주 너머의 새로운 은하를 모험하며 쿠파의 음모를 막아내는 대모험 애니메이션.',
  },
  {
    title: '악마는 프라다를 입는다 2',
    genre: '드라마',
    rating: '12세이상관람가',
    runtime: 119,
    releaseDate: new Date('2026-04-29'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20259791&source=https://admin.moviechart.co.kr/assets/upload/movie/260423052300_5235.jpg',
    synopsis: '메릴 스트립과 앤 해서웨이가 다시 한번 패션계로 돌아온다. 미란다와 앤디의 새로운 이야기.',
  },
  {
    title: '살목지',
    genre: '공포',
    rating: '15세이상관람가',
    runtime: 95,
    releaseDate: new Date('2026-04-08'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20254121&source=https://admin.moviechart.co.kr/assets/upload/movie/260408021533_4331.jpg',
    synopsis: '기이한 소문이 끊이지 않는 폐가에서 벌어지는 미스터리. 마을 주민들이 하나둘 사라지기 시작한다.',
  },
  {
    title: '프로젝트 헤일메리',
    genre: 'SF',
    rating: '12세이상관람가',
    runtime: 156,
    releaseDate: new Date('2026-03-18'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20261782&source=https://admin.moviechart.co.kr/assets/upload/movie/260310052501_8723.jpg',
    synopsis: '죽어가는 태양, 종말 위기에 놓인 지구를 구하기 위한 마지막 임무. 한 과학자의 우주 사투.',
  },
  {
    title: '짱구',
    genre: '드라마',
    rating: '15세이상관람가',
    runtime: 95,
    releaseDate: new Date('2026-04-22'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20240532&source=https://admin.moviechart.co.kr/assets/upload/movie/260403001227_1319.jpg',
    synopsis: '배우가 되고 싶어 서울로 상경한 청년의 좌충우돌 성장기.',
  },
  {
    title: '마이클',
    genre: '드라마',
    rating: '12세이상관람가',
    runtime: 130,
    releaseDate: new Date('2026-05-13'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20259626&source=https://admin.moviechart.co.kr/assets/upload/movie/260417005447_7410.jpg',
    synopsis: '팝의 황제 마이클 잭슨의 삶과 음악을 다룬 전기 영화.',
  },
  {
    title: '란 12.3',
    genre: '다큐멘터리',
    rating: '12세이상관람가',
    runtime: 105,
    releaseDate: new Date('2026-04-22'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20262685&source=https://admin.moviechart.co.kr/assets/upload/movie/260415002246_8245.jpg',
    synopsis: '2024년 비상계엄 선포 당시의 혼란과 긴박함을 시민들의 영상으로 담아낸 시네마틱 다큐멘터리.',
  },
  {
    title: '왕과 사는 남자',
    genre: '드라마',
    rating: '15세이상관람가',
    runtime: 120,
    releaseDate: new Date('2026-02-04'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20242837&source=https://admin.moviechart.co.kr/assets/upload/movie/260108003526_8322.jpg',
    synopsis: '조선 시대 왕과 함께 사는 한 남자의 비밀스러운 이야기.',
  },
  {
    title: '기동전사 건담: 섬광의 하사웨이 키르케의 마녀',
    genre: '애니메이션',
    rating: '12세이상관람가',
    runtime: 125,
    releaseDate: new Date('2026-04-22'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20262775&source=https://admin.moviechart.co.kr/assets/upload/movie/260416001449_3077.jpg',
    synopsis: '하사웨이 노아가 마침내 마주하게 된 운명. 건담 시리즈의 새로운 챕터.',
  },
  {
    title: '내 이름은',
    genre: '드라마',
    rating: '12세이상관람가',
    runtime: 110,
    releaseDate: new Date('2026-04-15'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20247648&source=https://admin.moviechart.co.kr/assets/upload/movie/260401002734_8977.jpg',
    synopsis: '자신의 이름조차 잃어버린 한 여인이 다시 자신을 찾아가는 여정.',
  },
  {
    title: '르누아르',
    genre: '드라마',
    rating: '12세이상관람가',
    runtime: 115,
    releaseDate: new Date('2026-04-22'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20262776&source=https://admin.moviechart.co.kr/assets/upload/movie/260410001936_1517.jpg',
    synopsis: '인상주의 화가 르누아르의 아들이 들려주는 가족과 예술에 관한 이야기.',
  },
  {
    title: '사랑의 하츄핑 특별판',
    genre: '애니메이션',
    rating: '전체관람가',
    runtime: 80,
    releaseDate: new Date('2026-05-01'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20263327&source=https://admin.moviechart.co.kr/assets/upload/movie/260427004015_4381.jpg',
    synopsis: '캐치! 티니핑 시리즈의 인기 캐릭터 하츄핑이 펼치는 사랑 가득 모험 특별판.',
  },
  {
    title: '극장판 반짝반짝 달님이: 싱어롱 파티',
    genre: '애니메이션',
    rating: '전체관람가',
    runtime: 75,
    releaseDate: new Date('2026-05-01'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20262906&source=https://admin.moviechart.co.kr/assets/upload/movie/260417004356_5862.jpg',
    synopsis: '달님이와 친구들이 함께하는 신나는 노래 파티. 관객 모두 함께 부르는 싱어롱 버전.',
  },
  {
    title: '극장판 총집편 걸즈 밴드 크라이 있잖아, 미래',
    genre: '애니메이션',
    rating: '12세이상관람가',
    runtime: 130,
    releaseDate: new Date('2026-04-16'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20262811&source=https://admin.moviechart.co.kr/assets/upload/movie/260413012135_1967.jpg',
    synopsis: '5명의 소녀들이 밴드를 통해 서로의 상처를 보듬고 미래를 향해 나아가는 청춘 이야기.',
  },
  {
    title: '비발디와 나',
    genre: '드라마',
    rating: '12세이상관람가',
    runtime: 100,
    releaseDate: new Date('2026-04-29'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20262154&source=https://admin.moviechart.co.kr/assets/upload/movie/260417012219_8895.jpg',
    synopsis: '비발디의 사계를 매개로 펼쳐지는 한 음악가의 인생 이야기.',
  },
  {
    title: '노멀',
    genre: '드라마',
    rating: '15세이상관람가',
    runtime: 105,
    releaseDate: new Date('2026-04-17'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20262639&source=https://admin.moviechart.co.kr/assets/upload/movie/260408001717_3683.jpg',
    synopsis: '평범하다고 믿었던 일상이 무너지는 순간을 그린 미스터리 스릴러.',
  },
  {
    title: '모탈 컴뱃 2',
    genre: '액션',
    rating: '청소년관람불가',
    runtime: 110,
    releaseDate: new Date('2026-05-06'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20262947&source=https://admin.moviechart.co.kr/assets/upload/movie/260428001428_5007.jpg',
    synopsis: '전설의 격투 토너먼트가 다시 시작된다. 더욱 잔혹하고 강렬해진 액션의 향연.',
  },
  {
    title: '줄무늬 파자마를 입은 소년',
    genre: '드라마',
    rating: '12세이상관람가',
    runtime: 95,
    releaseDate: new Date('2026-04-23'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20088147&source=https://admin.moviechart.co.kr/assets/upload/movie/260408002729_4224.jpg',
    synopsis: '2차 대전 당시 독일 장교의 아들과 수용소 소년의 우정을 담은 가슴 아픈 이야기. 재개봉.',
  },
  {
    title: '침묵의 친구',
    genre: '드라마',
    rating: '12세이상관람가',
    runtime: 100,
    releaseDate: new Date('2026-04-15'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20262202&source=https://admin.moviechart.co.kr/assets/upload/movie/260325002035_7643.jpg',
    synopsis: '말없이 곁을 지켜주는 친구의 의미를 되짚는 따뜻한 드라마.',
  },
  {
    title: '누룩',
    genre: '다큐멘터리',
    rating: '전체관람가',
    runtime: 90,
    releaseDate: new Date('2026-04-15'),
    posterUrl: 'https://admin.moviechart.co.kr/thumb?width=300&height=450&m_code=20247490&source=https://admin.moviechart.co.kr/assets/upload/movie/260403000846_8613.jpg',
    synopsis: '사라져가는 전통주 누룩의 가치를 지켜내려는 장인들의 기록.',
  },
];

interface PersonMeta { name: string; original?: string; nationality?: string }
interface MovieMeta {
  title: string;
  genres: string[];
  director: PersonMeta;
  cast: PersonMeta[];
  trailer: string;
}

const movieMetadata: MovieMeta[] = [
  {
    title: '슈퍼 마리오 갤럭시',
    genres: ['애니메이션', '가족', '판타지'],
    director: { name: '아론 호바스', original: 'Aaron Horvath', nationality: '미국' },
    cast: [
      { name: '크리스 프랫', original: 'Chris Pratt', nationality: '미국' },
      { name: '안야 테일러조이', original: 'Anya Taylor-Joy', nationality: '미국' },
      { name: '잭 블랙', original: 'Jack Black', nationality: '미국' },
    ],
    trailer: 'https://www.youtube.com/embed/TnGl01FkMMo',
  },
  {
    title: '악마는 프라다를 입는다 2',
    genres: ['드라마', '코미디'],
    director: { name: '데이비드 프랭클', original: 'David Frankel', nationality: '미국' },
    cast: [
      { name: '메릴 스트립', original: 'Meryl Streep', nationality: '미국' },
      { name: '앤 해서웨이', original: 'Anne Hathaway', nationality: '미국' },
      { name: '에밀리 블런트', original: 'Emily Blunt', nationality: '미국' },
    ],
    trailer: 'https://www.youtube.com/embed/wBu23-Bs-_Y',
  },
  {
    title: '살목지',
    genres: ['공포', '미스터리', '스릴러'],
    director: { name: '정용기', nationality: '한국' },
    cast: [
      { name: '김혜윤', nationality: '한국' },
      { name: '이재인', nationality: '한국' },
      { name: '김민재', nationality: '한국' },
    ],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '프로젝트 헤일메리',
    genres: ['SF', '드라마'],
    director: { name: '필 로드', original: 'Phil Lord', nationality: '미국' },
    cast: [
      { name: '라이언 고슬링', original: 'Ryan Gosling', nationality: '캐나다' },
      { name: '산드라 휠러', original: 'Sandra Hüller', nationality: '독일' },
    ],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '짱구',
    genres: ['드라마', '코미디'],
    director: { name: '한지원', nationality: '한국' },
    cast: [
      { name: '정우', nationality: '한국' },
      { name: '강혜원', nationality: '한국' },
    ],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '마이클',
    genres: ['드라마', '음악'],
    director: { name: '안톤 후쿠아', original: 'Antoine Fuqua', nationality: '미국' },
    cast: [
      { name: '자파리 잭슨', original: 'Jaafar Jackson', nationality: '미국' },
      { name: '콜먼 도밍고', original: 'Colman Domingo', nationality: '미국' },
    ],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '란 12.3',
    genres: ['다큐멘터리'],
    director: { name: '김성수', nationality: '한국' },
    cast: [],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '왕과 사는 남자',
    genres: ['드라마'],
    director: { name: '박상현', nationality: '한국' },
    cast: [
      { name: '조정석', nationality: '한국' },
      { name: '김혜수', nationality: '한국' },
    ],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '기동전사 건담: 섬광의 하사웨이 키르케의 마녀',
    genres: ['애니메이션', 'SF', '액션'],
    director: { name: '무라세 슈코', original: 'Shukō Murase', nationality: '일본' },
    cast: [
      { name: '코바야시 치아키', original: 'Chiaki Kobayashi', nationality: '일본' },
    ],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '내 이름은',
    genres: ['드라마'],
    director: { name: '이상근', nationality: '한국' },
    cast: [
      { name: '한예리', nationality: '한국' },
      { name: '박해일', nationality: '한국' },
    ],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '르누아르',
    genres: ['드라마'],
    director: { name: '질 부르도스', original: 'Gilles Bourdos', nationality: '프랑스' },
    cast: [
      { name: '미셸 부케', original: 'Michel Bouquet', nationality: '프랑스' },
    ],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '사랑의 하츄핑 특별판',
    genres: ['애니메이션', '가족'],
    director: { name: '김수훈', nationality: '한국' },
    cast: [],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '극장판 반짝반짝 달님이: 싱어롱 파티',
    genres: ['애니메이션', '음악', '가족'],
    director: { name: '김도윤', nationality: '한국' },
    cast: [],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '극장판 총집편 걸즈 밴드 크라이 있잖아, 미래',
    genres: ['애니메이션', '음악', '드라마'],
    director: { name: '하나기야 시노부', original: 'Shinobu Hanagaya', nationality: '일본' },
    cast: [],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '비발디와 나',
    genres: ['드라마', '음악'],
    director: { name: '강석필', nationality: '한국' },
    cast: [
      { name: '이정현', nationality: '한국' },
    ],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '노멀',
    genres: ['스릴러', '미스터리'],
    director: { name: '최재훈', nationality: '한국' },
    cast: [
      { name: '김다미', nationality: '한국' },
      { name: '이제훈', nationality: '한국' },
    ],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '모탈 컴뱃 2',
    genres: ['액션', '판타지'],
    director: { name: '사이먼 매쿼이드', original: 'Simon McQuoid', nationality: '호주' },
    cast: [
      { name: '카를 우반', original: 'Karl Urban', nationality: '뉴질랜드' },
      { name: '루이스 탄', original: 'Lewis Tan', nationality: '영국' },
    ],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '줄무늬 파자마를 입은 소년',
    genres: ['드라마', '전쟁'],
    director: { name: '마크 허만', original: 'Mark Herman', nationality: '영국' },
    cast: [
      { name: '아사 버터필드', original: 'Asa Butterfield', nationality: '영국' },
      { name: '베라 파미가', original: 'Vera Farmiga', nationality: '미국' },
    ],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '침묵의 친구',
    genres: ['드라마'],
    director: { name: '이수진', nationality: '한국' },
    cast: [
      { name: '천우희', nationality: '한국' },
    ],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    title: '누룩',
    genres: ['다큐멘터리'],
    director: { name: '신한솔', nationality: '한국' },
    cast: [],
    trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
];

// 장르별 3D 상영 여부
function is3DCapable(genre: string): boolean {
  return genre === '애니메이션' || genre === 'SF' || genre === '액션';
}

// 시간대 풀 (09:00 ~ 21:30)
const TIME_SLOTS: [number, number][] = [
  [9, 0], [11, 30], [14, 0], [16, 30], [19, 0], [21, 30],
];

async function main() {
  console.log('시드 데이터 초기화 시작...');

  // FK 순서에 맞게 삭제
  await prisma.movieMedia.deleteMany();
  await prisma.moviePerson.deleteMany();
  await prisma.movieGenre.deleteMany();
  await prisma.partnerDiscountUsage.deleteMany();
  await prisma.couponUsage.deleteMany();
  await prisma.userCoupon.deleteMany();
  await prisma.membershipHistory.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.screening.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.screen.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.pricingPolicy.deleteMany();
  await prisma.cinema.deleteMany();
  await prisma.seatType.deleteMany();
  await prisma.screenType.deleteMany();
  await prisma.person.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.membershipReward.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.partnerDiscount.deleteMany();
  // membershipGrade는 customer FK 때문에 삭제하지 않고 upsert 사용
  // customer는 삭제하지 않음 — ID 유지로 기존 JWT 토큰 호환

  // ── 0. 멤버십 등급 (Customer FK 때문에 가장 먼저) ─────────────────
  await seedMembershipGrades();

  // ── 1. 상영관 유형 / 좌석 유형 ────────────────────────────────────
  const [stNormal, stCharlotte, stSuperflex, stSuper4D] = await Promise.all([
    prisma.screenType.create({ data: { name: '일반관',    grade: '일반관',  description: '표준 디지털 상영 환경' } }),
    prisma.screenType.create({ data: { name: '샤롯데',    grade: '스페셜관', description: '프리미엄 라운지와 풀-플랫 리클라이너' } }),
    prisma.screenType.create({ data: { name: '수퍼플렉스', grade: '스페셜관', description: '3면 스크린 270도 몰입감' } }),
    prisma.screenType.create({ data: { name: '수퍼4D',    grade: '스페셜관', description: '모션체어 + 환경효과 4D' } }),
  ]);

  const [seatNormal, seatCouple, seatDisabled, seatRecliner] = await Promise.all([
    prisma.seatType.create({ data: { name: '일반석',     additionalPrice: 0 } }),
    prisma.seatType.create({ data: { name: '커플석',     additionalPrice: 5000 } }),
    prisma.seatType.create({ data: { name: '장애인석',   additionalPrice: 0 } }),
    prisma.seatType.create({ data: { name: '리클라이너석', additionalPrice: 8000 } }),
  ]);
  console.log('  상영관 유형 4개, 좌석 유형 4개 생성');

  // ── 1-b. 요금 정책 (공통, cinemaId=null) ─────────────────────────
  await seedPricingPolicies();

  // ── 2. 영화관 4개 ─────────────────────────────────────────────────
  const cinemas = await Promise.all([
    prisma.cinema.create({ data: { name: '가산디지털', address: '서울 금천구 가산동 60-24', region: '서울' } }),
    prisma.cinema.create({ data: { name: '가양',       address: '서울 강서구 가양동 1472',  region: '서울' } }),
    prisma.cinema.create({ data: { name: '광교',       address: '경기 수원시 영통구 광교로 107', region: '경기/인천' } }),
    prisma.cinema.create({ data: { name: '광명',       address: '경기 광명시 철산동 295',    region: '경기/인천' } }),
  ]);
  console.log(`  영화관 ${cinemas.length}개 생성`);

  // ── 3. 상영관 3개씩 (총 12개) ────────────────────────────────────
  // 3관 스페셜 유형: 가산디지털=샤롯데, 가양=수퍼플렉스, 광교=수퍼4D, 광명=샤롯데
  const special3rdTypes = [stCharlotte, stSuperflex, stSuper4D, stCharlotte];
  const normalRows = ['A', 'B', 'C', 'D', 'E'];
  const specialRows = ['A', 'B', 'C'];
  const cols = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const allScreens: { id: number; cinemaId: number }[] = [];
  let totalSeatsCreated = 0;

  for (let ci = 0; ci < cinemas.length; ci++) {
    const cinema = cinemas[ci];
    const screenDefs = [
      { name: '1관', screenTypeId: stNormal.id,           rows: normalRows, totalSeats: 50, isSpecial: false },
      { name: '2관', screenTypeId: stNormal.id,           rows: normalRows, totalSeats: 50, isSpecial: false },
      { name: '3관', screenTypeId: special3rdTypes[ci].id, rows: specialRows, totalSeats: 30, isSpecial: true },
    ];

    for (const def of screenDefs) {
      const screen = await prisma.screen.create({
        data: {
          name: def.name,
          totalSeats: def.totalSeats,
          cinemaId: cinema.id,
          screenTypeId: def.screenTypeId,
          seats: {
            create: def.rows.flatMap((row) =>
              cols.map((number) => {
                if (def.isSpecial) {
                  // 스페셜관: 전석 리클라이너석
                  return { row, number, seatTypeId: seatRecliner.id };
                }
                // 일반관: 커플석 — C·D열 4~7번 (가운데 구역)
                if ((row === 'C' || row === 'D') && number >= 4 && number <= 7)
                  return { row, number, seatTypeId: seatCouple.id };
                // 일반관: 장애인석 — E열 1번·10번 (맨 뒷줄 양끝)
                if (row === 'E' && (number === 1 || number === 10))
                  return { row, number, seatTypeId: seatDisabled.id };
                return { row, number, seatTypeId: seatNormal.id };
              }),
            ),
          },
        },
      });
      allScreens.push({ id: screen.id, cinemaId: cinema.id });
      totalSeatsCreated += def.totalSeats;
    }
  }
  console.log(`  상영관 ${allScreens.length}개, 좌석 ${totalSeatsCreated}석 생성`);

  // ── 4. 영화 20편 ──────────────────────────────────────────────────
  const movies = await Promise.all(
    MOVIES.map((m) => prisma.movie.create({ data: m })),
  );
  console.log(`  영화 ${movies.length}편 생성`);

  // ── 5. 상영 스케줄 ────────────────────────────────────────────────
  // 영화당 6~9개, 오늘~+5일, 12개 상영관 분산 (스페셜관 포함)
  // 슬롯 충돌 방지: screenId+dayOffset+시간대 조합을 추적
  const usedSlots = new Set<string>();
  let totalScreenings = 0;

  for (let mi = 0; mi < movies.length; mi++) {
    const movie = movies[mi];
    const use3D = is3DCapable(movie.genre);

    // 상영관 12개로 늘어난 만큼 편당 배정 수 증가
    const targetCount = use3D ? 9 : mi % 2 === 0 ? 8 : 6;
    let created = 0;
    let attempts = 0;

    // 날짜(0~5) × 시간대(6개) = 36가지 조합을 순서 섞어서 시도
    const slots: [number, number, number][] = [];
    for (let day = 0; day <= 5; day++) {
      for (const [hour, min] of TIME_SLOTS) {
        slots.push([day, hour, min]);
      }
    }
    // 영화마다 다른 오프셋으로 시작 (분산 배치)
    const offset = (mi * 7) % slots.length;
    const orderedSlots = [...slots.slice(offset), ...slots.slice(0, offset)];

    for (const [day, hour, min] of orderedSlots) {
      if (created >= targetCount) break;
      attempts++;

      // 해당 시간대에서 빈 상영관을 순차 탐색 — 여러 상영관 시도로 분산
      let placed = false;
      for (let t = 0; t < allScreens.length && !placed; t++) {
        const screenIdx = (mi + attempts + t) % allScreens.length;
        const screen = allScreens[screenIdx];
        const slotKey = `${screen.id}-${day}-${hour}-${min}`;

        if (usedSlots.has(slotKey)) continue;
        usedSlots.add(slotKey);

        const startTime = dateAt(day, hour, min);
        const endTime = new Date(startTime.getTime() + movie.runtime * 60 * 1000);

        // 2D/3D 결정: 3D 가능한 장르는 3개 중 1개를 3D로
        const screenType = use3D && created % 3 === 1 ? '3D' : '2D';

        await prisma.screening.create({
          data: { startTime, endTime, screenType, movieId: movie.id, screenId: screen.id },
        });
        created++;
        totalScreenings++;
        placed = true;
      }
    }
  }
  console.log(`  상영 스케줄 ${totalScreenings}개 생성`);

  // ── 6. 테스트 계정 ────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('password123', 10);
  const [welcomeGrade, vipGrade, vvipGrade] = await Promise.all([
    prisma.membershipGrade.findUnique({ where: { name: 'WELCOME' } }),
    prisma.membershipGrade.findUnique({ where: { name: 'VIP' } }),
    prisma.membershipGrade.findUnique({ where: { name: 'VVIP' } }),
  ]);

  await prisma.customer.upsert({
    where: { email: 'test@test.com' },
    create: { email: 'test@test.com', password: hashedPassword, name: '테스트유저', phone: '010-1234-5678', gradeId: welcomeGrade!.id, totalAmount: 0 },
    update: { gradeId: welcomeGrade!.id, totalAmount: 0 },
  });
  await prisma.customer.upsert({
    where: { email: 'vip@test.com' },
    create: { email: 'vip@test.com', password: hashedPassword, name: 'VIP유저', gradeId: vipGrade!.id, totalAmount: 75000 },
    update: { gradeId: vipGrade!.id, totalAmount: 75000 },
  });
  await prisma.customer.upsert({
    where: { email: 'vvip@test.com' },
    create: { email: 'vvip@test.com', password: hashedPassword, name: 'VVIP유저', gradeId: vvipGrade!.id, totalAmount: 250000 },
    update: { gradeId: vvipGrade!.id, totalAmount: 250000 },
  });
  console.log('  테스트 계정: test@test.com / vip@test.com / vvip@test.com (password123)');

  // ── 6-b. 쿠폰 마스터 + 테스트 사용자 발급 ────────────────────────
  await seedCoupons();

  // ── 6-c. 멤버십 리워드 (쿠폰 생성 후에) ──────────────────────────
  await seedMembershipRewards();

  // ── 6-d. 제휴할인 마스터 데이터 ──────────────────────────────────
  await seedPartnerDiscounts();

  // ── 7. 영화 메타데이터 (장르/감독/배우/트레일러) ──────────────────
  const genreNames = ['액션', '드라마', '코미디', 'SF', '공포', '로맨스', '애니메이션', '다큐멘터리', '스릴러', '판타지', '미스터리', '가족', '음악', '전쟁'];
  await prisma.genre.createMany({ data: genreNames.map((name) => ({ name })), skipDuplicates: true });

  const genreMap = new Map<string, number>();
  for (const g of await prisma.genre.findMany()) genreMap.set(g.name, g.id);

  const personCache = new Map<string, number>(); // name -> personId
  let countMovieGenre = 0, countPerson = 0, countMoviePerson = 0, countMovieMedia = 0;

  for (const meta of movieMetadata) {
    const movie = await prisma.movie.findFirst({ where: { title: meta.title } });
    if (!movie) { console.warn(`  [warn] 영화 못 찾음: ${meta.title}`); continue; }

    for (const genreName of meta.genres) {
      const genreId = genreMap.get(genreName);
      if (!genreId) continue;
      await prisma.movieGenre.create({ data: { movieId: movie.id, genreId } });
      countMovieGenre++;
    }

    const getOrCreatePerson = async (p: PersonMeta): Promise<number> => {
      if (personCache.has(p.name)) return personCache.get(p.name)!;
      const created = await prisma.person.create({
        data: { name: p.name, originalName: p.original, nationality: p.nationality },
      });
      personCache.set(p.name, created.id);
      countPerson++;
      return created.id;
    };

    const directorId = await getOrCreatePerson(meta.director);
    await prisma.moviePerson.create({ data: { movieId: movie.id, personId: directorId, role: '감독', order: 0 } });
    countMoviePerson++;

    for (let i = 0; i < meta.cast.length; i++) {
      const actorId = await getOrCreatePerson(meta.cast[i]);
      await prisma.moviePerson.create({ data: { movieId: movie.id, personId: actorId, role: '출연', order: i } });
      countMoviePerson++;
    }

    await prisma.movieMedia.create({ data: { movieId: movie.id, type: 'trailer', url: meta.trailer, order: 0 } });
    countMovieMedia++;
  }
  console.log(`  Genre ${genreNames.length}개`);
  console.log(`  Person ${countPerson}명`);
  console.log(`  MovieGenre ${countMovieGenre}건`);
  console.log(`  MoviePerson ${countMoviePerson}건`);
  console.log(`  MovieMedia ${countMovieMedia}건`);

  // ── 집계 ─────────────────────────────────────────────────────────
  const [cScreenType, cSeatType, cCinema, cScreen, cSeat, cMovie, cScreening, cCustomer, cGenre, cPerson, cMovieGenre, cMoviePerson, cMovieMedia, cPricingPolicy, cCoupon, cUserCoupon, cPartnerDiscount, cMembershipGrade, cMembershipReward] = await Promise.all([
    prisma.screenType.count(),
    prisma.seatType.count(),
    prisma.cinema.count(),
    prisma.screen.count(),
    prisma.seat.count(),
    prisma.movie.count(),
    prisma.screening.count(),
    prisma.customer.count(),
    prisma.genre.count(),
    prisma.person.count(),
    prisma.movieGenre.count(),
    prisma.moviePerson.count(),
    prisma.movieMedia.count(),
    prisma.pricingPolicy.count(),
    prisma.coupon.count(),
    prisma.userCoupon.count(),
    prisma.partnerDiscount.count(),
    prisma.membershipGrade.count(),
    prisma.membershipReward.count(),
  ]);

  console.log('\n=== 삽입 완료 ===');
  console.log(`  ScreenType      : ${cScreenType}개`);
  console.log(`  SeatType        : ${cSeatType}개`);
  console.log(`  Cinema          : ${cCinema}개`);
  console.log(`  Screen          : ${cScreen}개`);
  console.log(`  Seat            : ${cSeat}석`);
  console.log(`  Movie           : ${cMovie}편`);
  console.log(`  Screening       : ${cScreening}개`);
  console.log(`  Customer        : ${cCustomer}명`);
  console.log(`  Genre           : ${cGenre}개`);
  console.log(`  Person          : ${cPerson}명`);
  console.log(`  MovieGenre      : ${cMovieGenre}건`);
  console.log(`  MoviePerson     : ${cMoviePerson}건`);
  console.log(`  MovieMedia      : ${cMovieMedia}건`);
  console.log(`  PricingPolicy   : ${cPricingPolicy}개`);
  console.log(`  Coupon          : ${cCoupon}개`);
  console.log(`  UserCoupon      : ${cUserCoupon}개`);
  console.log(`  PartnerDiscount : ${cPartnerDiscount}개`);
  console.log(`  MembershipGrade : ${cMembershipGrade}개`);
  console.log(`  MembershipReward: ${cMembershipReward}개`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
