export type EventPrize = {
  id: number;
  name: string;
  description?: string | null;
  type: string; // PHYSICAL | COUPON
  quantity: number;
  couponId?: number | null;
  imageUrl?: string | null;
  coupon?: {
    id: number;
    name: string;
    description?: string | null;
    type: string;
    value: number;
    bgColor?: string | null;
  } | null;
};

export type EventApplication = {
  id: number;
  eventId: number;
  customerId: number;
  status: string; // PENDING | WON | LOST
  prizeId?: number | null;
  prize?: EventPrize | null;
  userCouponId?: number | null;
  userCoupon?: { id: number; coupon: { id: number; name: string } } | null;
  appliedAt: string;
  drawnAt?: string | null;
  notificationRead: boolean;
  // getMyApplications에서 include되는 이벤트 요약
  event?: { id: number; title: string; imageUrl?: string | null; status: string } | null;
};

export type DrawResult = {
  totalApplications: number;
  winners: number;
  losers: number;
  winnersList: { applicationId: number; customerId: number; prizeName: string }[];
};

export type EventItem = {
  id: number;
  title: string;
  category: string;
  description: string;
  imageUrl?: string | null;
  bgColor?: string | null;
  startDate: string;
  endDate: string;
  status: string;
  isApplicable: boolean;
  movieId?: number | null;
  movie?: { id: number; title: string; posterUrl?: string | null } | null;
  prizes: EventPrize[];
};

export type EventDetail = EventItem & {
  cinemas: { cinema: { id: number; name: string } }[];
  myApplication?: EventApplication | null;
};

export const CATEGORY_LABEL: Record<string, string> = {
  MOVIE: '영화',
  MEMBERSHIP: '멤버십',
  PARTNER: '제휴',
  SEASONAL: '시즌',
  PREVIEW: '시사회',
};

export const CATEGORY_BADGE: Record<string, string> = {
  MOVIE: 'bg-blue-900/60 text-blue-300',
  MEMBERSHIP: 'bg-red-900/60 text-red-300',
  PARTNER: 'bg-green-900/60 text-green-300',
  SEASONAL: 'bg-amber-900/60 text-amber-300',
  PREVIEW: 'bg-purple-900/60 text-purple-300',
};

export const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ONGOING: { label: '진행 중', className: 'bg-green-900/60 text-green-300' },
  ENDED: { label: '마감', className: 'bg-zinc-700 text-zinc-400' },
  DRAWN: { label: '추첨 완료', className: 'bg-blue-900/60 text-blue-300' },
  UPCOMING: { label: '예정', className: 'bg-amber-900/60 text-amber-300' },
  CANCELLED: { label: '취소', className: 'bg-red-900/60 text-red-400' },
};

export function formatPeriod(startDate: string, endDate: string) {
  return `${startDate.slice(0, 10).replace(/-/g, '.')} ~ ${endDate.slice(0, 10).replace(/-/g, '.')}`;
}
