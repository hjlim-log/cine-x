export type Event = {
  id: number;
  title: string;
  category: string;
  period: string;
  image: string;
  description: string;
};

export const events: Event[] = [
  {
    id: 1,
    title: '신규 가입 시 1,000원 할인쿠폰 증정',
    category: '회원',
    period: '2026.04.01 ~ 2026.05.31',
    image: 'https://placehold.co/600x400/dc2626/white.png?text=Welcome+Coupon',
    description: '신규 회원이 되시면 즉시 사용 가능한 영화 관람 1,000원 할인쿠폰을 드립니다.',
  },
  {
    id: 2,
    title: '슈퍼 마리오 갤럭시 한정판 굿즈 증정',
    category: '영화',
    period: '2026.04.29 ~ 2026.05.15',
    image: 'https://placehold.co/600x400/2563eb/white.png?text=Super+Mario+Goods',
    description: '슈퍼 마리오 갤럭시 예매 후 영화관 방문 시, 한정판 키링을 선착순 증정합니다.',
  },
  {
    id: 3,
    title: '커플 데이트 패키지 - 2인 22,000원',
    category: '제휴',
    period: '2026.05.01 ~ 2026.05.31',
    image: 'https://placehold.co/600x400/db2777/white.png?text=Couple+Package',
    description: '커플석 영화 2인 + 팝콘 콤보 1세트를 합리적인 가격에 만나보세요.',
  },
  {
    id: 4,
    title: '평일 조조 4,000원 할인',
    category: '제휴',
    period: '상시 진행',
    image: 'https://placehold.co/600x400/16a34a/white.png?text=Morning+Discount',
    description: '평일 오전 11시 이전 회차에 한해 모든 영화 4,000원 할인된 가격에 관람하실 수 있습니다.',
  },
  {
    id: 5,
    title: '5월 가정의 달 무비 페스타',
    category: '시즌',
    period: '2026.05.05 ~ 2026.05.31',
    image: 'https://placehold.co/600x400/f59e0b/white.png?text=Family+Festa',
    description: '온 가족이 즐기는 5월의 영화 한 편. 4인 가족 패키지 특가 진행 중.',
  },
  {
    id: 6,
    title: 'VIP 회원 전용 시사회 초청',
    category: '회원',
    period: '2026.05.10 ~ 2026.05.20',
    image: 'https://placehold.co/600x400/7c3aed/white.png?text=VIP+Preview',
    description: 'VIP 등급 이상 회원께 5월 신작 시사회를 초청합니다. 마이페이지에서 응모하세요.',
  },
];
