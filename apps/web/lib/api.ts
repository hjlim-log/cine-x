import type {
  Movie,
  MovieDetail,
  ScreeningDetail,
  Reservation,
  CinemaListItem,
  CinemaDetail,
  AudienceCounts,
  PriceBreakdown,
  UserCoupon,
  PartnerDiscount,
  MembershipInfo,
  MembershipGrade,
  MembershipResult,
} from './types';
import type { EventItem, EventDetail, EventApplication, DrawResult } from './events';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `오류 (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ── 서버 컴포넌트용 (직접 fetch + revalidate) ─────────────────────
export function fetchMovies(): Promise<Movie[]> {
  return fetch(`${API}/movies`, { next: { revalidate: 60 } } as RequestInit)
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
}

export function fetchMovie(id: number): Promise<MovieDetail> {
  return fetch(`${API}/movies/${id}`, { next: { revalidate: 60 } } as RequestInit)
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
}

// ── 클라이언트 컴포넌트용 ─────────────────────────────────────────
export const getScreening = (id: number): Promise<ScreeningDetail> =>
  req<ScreeningDetail>(`/screenings/${id}`);

export const login = (email: string, password: string) =>
  req<{ token: string; user: { id: number; name: string; email: string } }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  );

export const signup = (data: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}) => req<{ token: string }>('/auth/signup', { method: 'POST', body: JSON.stringify(data) });

export const createReservation = (
  data: {
    screeningId: number;
    seatIds: number[];
    audienceCounts: AudienceCounts;
    userCouponId?: number;
  },
  token: string,
): Promise<Reservation> =>
  req<Reservation>('/reservations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });

export const calculatePrice = (
  data: {
    screeningId: number;
    seatIds: number[];
    audienceCounts: AudienceCounts;
    userCouponId?: number;
  },
  token: string,
): Promise<PriceBreakdown> =>
  req<PriceBreakdown>('/pricing/calculate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });

export const getMyReservations = (token: string): Promise<Reservation[]> =>
  req<Reservation[]>('/reservations/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

export const cancelReservation = (id: number, token: string): Promise<Reservation> =>
  req<Reservation>(`/reservations/${id}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });

export const getReservation = (id: number, token: string): Promise<Reservation> =>
  req<Reservation>(`/reservations/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const confirmPayment = (
  data: { paymentKey: string; orderId: string; amount: number },
  token: string,
): Promise<{ reservationId: number; status: string; membershipResult?: MembershipResult }> =>
  req<{ reservationId: number; status: string; membershipResult?: MembershipResult }>('/payments/confirm', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });

export function fetchCinemas(): Promise<CinemaListItem[]> {
  return fetch(`${API}/cinemas`, { next: { revalidate: 60 } } as RequestInit)
    .then((r) => r.json());
}

export function fetchCinema(id: number): Promise<CinemaDetail> {
  return fetch(`${API}/cinemas/${id}`, { next: { revalidate: 30 } } as RequestInit)
    .then((r) => r.json());
}

// ── 쿠폰 ──────────────────────────────────────────────────────────
export const getMyCoupons = (
  status: 'AVAILABLE' | 'USED' | 'EXPIRED',
  token: string,
): Promise<UserCoupon[]> =>
  req<UserCoupon[]>(`/coupons/me?status=${status}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const redeemCoupon = (code: string, token: string): Promise<UserCoupon> =>
  req<UserCoupon>('/coupons/redeem', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code }),
  });

export const getApplicableCoupons = (
  amount: number,
  token: string,
): Promise<UserCoupon[]> =>
  req<UserCoupon[]>(`/coupons/applicable?amount=${amount}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getApplicablePartnerDiscounts = (
  amount: number,
  token: string,
): Promise<PartnerDiscount[]> =>
  req<PartnerDiscount[]>(`/partner-discounts/applicable?amount=${amount}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// ── 멤버십 ────────────────────────────────────────────────────────
export const getMyMembership = (token: string): Promise<MembershipInfo> =>
  req<MembershipInfo>('/membership/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getMembershipGrades = (): Promise<MembershipGrade[]> =>
  req<MembershipGrade[]>('/membership/grades');

export const applyReservationPartnerDiscount = (
  reservationId: number,
  partnerDiscountId: number | undefined,
  token: string,
): Promise<PriceBreakdown> =>
  req<PriceBreakdown>(`/reservations/${reservationId}/partner-discount`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(partnerDiscountId ? { partnerDiscountId } : {}),
  });

// ── 이벤트 (서버 컴포넌트용) ──────────────────────────────────────
export function fetchEvents(filter?: { category?: string; status?: string }): Promise<EventItem[]> {
  const params = new URLSearchParams();
  if (filter?.category) params.set('category', filter.category);
  if (filter?.status) params.set('status', filter.status);
  const q = params.toString();
  return fetch(`${API}/events${q ? `?${q}` : ''}`, { next: { revalidate: 30 } } as RequestInit)
    .then((r) => { if (!r.ok) throw new Error(); return r.json(); });
}

// ── 이벤트 (클라이언트 컴포넌트용) ───────────────────────────────
export const getEvents = (filter?: { category?: string; status?: string }): Promise<EventItem[]> => {
  const params = new URLSearchParams();
  if (filter?.category) params.set('category', filter.category);
  if (filter?.status) params.set('status', filter.status);
  const q = params.toString();
  return req<EventItem[]>(`/events${q ? `?${q}` : ''}`);
};

export const getEvent = (id: number, token?: string | null): Promise<EventDetail> =>
  req<EventDetail>(`/events/${id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);

export const applyEvent = (id: number, token: string): Promise<EventApplication> =>
  req<EventApplication>(`/events/${id}/apply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

export const getMyApplications = (token: string): Promise<EventApplication[]> =>
  req<EventApplication[]>('/events/me/applications', {
    headers: { Authorization: `Bearer ${token}` },
  });

export const markApplicationRead = (id: number, token: string): Promise<EventApplication> =>
  req<EventApplication>(`/events/applications/${id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });

export const drawEvent = (id: number, token: string): Promise<DrawResult> =>
  req<DrawResult>(`/events/${id}/draw`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
