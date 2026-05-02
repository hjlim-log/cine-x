'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getScreening,
  createReservation,
  calculatePrice,
  getApplicableCoupons,
} from '@/lib/api';
import { toast } from '@/lib/toast';
import Spinner from '@/components/Spinner';
import type {
  ScreeningDetail,
  Seat,
  AudienceCounts,
  PriceBreakdown,
  UserCoupon,
  Coupon,
} from '@/lib/types';

// ── 상수 & 타입 ───────────────────────────────────────────────────────────────
type Step = 'audience' | 'seats' | 'coupon';
const AUDIENCE_KEYS = ['ADULT', 'TEEN', 'SENIOR', 'DISABLED', 'CHILD'] as const;
type AudienceKey = (typeof AUDIENCE_KEYS)[number];

const AUDIENCE_LABELS: Record<AudienceKey, string> = {
  ADULT: '성인', TEEN: '청소년', SENIOR: '경로', DISABLED: '장애인', CHILD: '어린이',
};
const MAX_PEOPLE = 8;

// ── 좌석 그리드 헬퍼 ──────────────────────────────────────────────────────────
type Segment =
  | { kind: 'seat'; seat: Seat }
  | { kind: 'empty'; col: number }
  | { kind: 'couple-pair'; left: Seat; right: Seat };

function buildRowSegments(cols: number[], seatMap: Map<string, Seat>, row: string): Segment[] {
  const segs: Segment[] = [];
  let i = 0;
  while (i < cols.length) {
    const col = cols[i];
    const seat = seatMap.get(`${row}${col}`);
    const nextCol = cols[i + 1];
    const nextSeat = nextCol !== undefined ? seatMap.get(`${row}${nextCol}`) : undefined;
    if (seat?.type?.name === '커플석' && nextSeat?.type?.name === '커플석') {
      segs.push({ kind: 'couple-pair', left: seat, right: nextSeat });
      i += 2;
    } else if (seat) {
      segs.push({ kind: 'seat', seat });
      i++;
    } else {
      segs.push({ kind: 'empty', col });
      i++;
    }
  }
  return segs;
}

function getSeatClass(
  seat: Seat,
  isBooked: boolean,
  isSelected: boolean,
  isAtMax = false,
  roundClass = 'rounded',
): string {
  const base = `w-8 h-8 text-xs transition-colors flex items-center justify-center ${roundClass}`;
  if (isBooked)   return `${base} bg-zinc-700 text-zinc-600 cursor-not-allowed`;
  if (isSelected) return `${base} bg-red-600 text-white`;
  if (isAtMax)    return `${base} border border-zinc-600 text-zinc-600 opacity-40 cursor-not-allowed`;
  const name = seat.type?.name;
  if (name === '커플석')       return `${base} border-2 border-pink-400 text-pink-300 bg-pink-950/30 hover:bg-pink-900/50`;
  if (name === '장애인석')     return `${base} border-2 border-blue-400 text-blue-300 bg-blue-950/30 hover:bg-blue-900/50`;
  if (name === '리클라이너석') return `${base} border-2 border-yellow-500 text-yellow-300 bg-yellow-950/30 hover:bg-yellow-900/50`;
  return `${base} border border-zinc-500 text-zinc-300 hover:border-white hover:text-white`;
}

// ── 쿠폰 헬퍼 ─────────────────────────────────────────────────────────────────
function getDiscountLabel(coupon: Coupon): string {
  if (coupon.type === 'AMOUNT_DISCOUNT') return `-${coupon.value.toLocaleString()}원`;
  if (coupon.type === 'PERCENT_DISCOUNT') return `-${coupon.value}%`;
  return `${coupon.value}석 무료`;
}

function buildCouponSubtitle(uc: UserCoupon): string {
  const { coupon } = uc;
  const parts: string[] = [];
  if (coupon.description) parts.push(coupon.description);
  if (coupon.minPurchase > 0) parts.push(`${coupon.minPurchase.toLocaleString()}원 이상`);
  if (coupon.type === 'PERCENT_DISCOUNT' && coupon.maxDiscount) {
    parts.push(`최대 ${coupon.maxDiscount.toLocaleString()}원`);
  }
  return parts.join(' · ') || '할인 쿠폰';
}

// ── AudienceSelector ──────────────────────────────────────────────────────────
function AudienceSelector({
  counts, totalAudience, onChange, onNext,
}: {
  counts: AudienceCounts;
  totalAudience: number;
  onChange: (key: AudienceKey, delta: number) => void;
  onNext: () => void;
}) {
  return (
    <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
      <h2 className="text-base font-semibold text-zinc-300 mb-5">인원 선택</h2>
      <div className="divide-y divide-zinc-800">
        {AUDIENCE_KEYS.map((key) => (
          <div key={key} className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium">{AUDIENCE_LABELS[key]}</p>
              {key === 'DISABLED' && (
                <p className="text-xs text-zinc-500 mt-0.5">장애인 등록증 지참 필수 (현장 확인)</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => onChange(key, -1)}
                disabled={(counts[key] ?? 0) === 0}
                className="w-8 h-8 rounded-full border border-zinc-600 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:border-white hover:text-white transition-colors flex items-center justify-center text-base leading-none"
              >−</button>
              <span className="w-5 text-center font-semibold tabular-nums text-sm">
                {counts[key] ?? 0}
              </span>
              <button
                onClick={() => onChange(key, 1)}
                disabled={totalAudience >= MAX_PEOPLE}
                className="w-8 h-8 rounded-full border border-zinc-600 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:border-white hover:text-white transition-colors flex items-center justify-center text-base leading-none"
              >+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          총 <span className="text-white font-semibold">{totalAudience}</span>명
          <span className="text-zinc-600"> / 최대 {MAX_PEOPLE}명</span>
        </p>
        <button
          onClick={onNext}
          disabled={totalAudience === 0}
          className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          좌석 선택 →
        </button>
      </div>
    </div>
  );
}

// ── CouponOption ──────────────────────────────────────────────────────────────
function CouponOption({
  selected, onClick, title, subtitle, discountLabel, daysLeft,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  discountLabel?: string;
  daysLeft?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
        selected
          ? 'border-red-500 bg-red-950/25 ring-1 ring-red-500/20'
          : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/30 hover:bg-zinc-800/50'
      }`}
    >
      {/* 라디오 dot */}
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
        selected ? 'border-red-500 bg-red-500' : 'border-zinc-600'
      }`}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white leading-tight">{title}</p>
        <p className="text-xs text-zinc-500 mt-0.5 truncate">{subtitle}</p>
      </div>

      {discountLabel && (
        <div className="shrink-0 text-right">
          <p className={`text-sm font-bold tabular-nums ${selected ? 'text-red-400' : 'text-zinc-300'}`}>
            {discountLabel}
          </p>
          {daysLeft !== undefined && (
            <p className={`text-[10px] mt-0.5 ${daysLeft <= 7 ? 'text-red-400' : 'text-zinc-600'}`}>
              D-{daysLeft}
            </p>
          )}
        </div>
      )}
    </button>
  );
}

// ── CouponStep ────────────────────────────────────────────────────────────────
function CouponStep({
  screeningId,
  seatIds,
  audienceCounts,
  breakdown,
  onBack,
  onBook,
  booking,
}: {
  screeningId: number;
  seatIds: number[];
  audienceCounts: AudienceCounts;
  breakdown: PriceBreakdown;
  onBack: () => void;
  onBook: (couponId?: number) => void;
  booking: boolean;
}) {
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const [couponBreakdown, setCouponBreakdown] = useState<PriceBreakdown | null>(null);
  const [calculating, setCalculating] = useState(false);

  // 적용 가능 쿠폰 조회
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoadingCoupons(false); return; }
    getApplicableCoupons(breakdown.subtotal, token)
      .then(setCoupons)
      .catch(() => {})
      .finally(() => setLoadingCoupons(false));
  }, [breakdown.subtotal]);

  // 쿠폰 선택 시 할인 미리보기
  useEffect(() => {
    if (!selectedId) { setCouponBreakdown(null); return; }
    const token = localStorage.getItem('token');
    if (!token) return;
    setCalculating(true);
    calculatePrice(
      { screeningId, seatIds, audienceCounts, userCouponId: selectedId },
      token,
    )
      .then(setCouponBreakdown)
      .catch(() => setCouponBreakdown(null))
      .finally(() => setCalculating(false));
  }, [selectedId, screeningId, seatIds, audienceCounts]);

  const finalTotal = couponBreakdown?.totalAmount ?? breakdown.totalAmount;
  const discount = couponBreakdown?.couponDiscount ?? 0;

  return (
    <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
      <h2 className="text-base font-semibold text-zinc-300 mb-4">쿠폰 선택</h2>

      {loadingCoupons ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2 mb-5">
          <CouponOption
            selected={selectedId === undefined}
            onClick={() => setSelectedId(undefined)}
            title="쿠폰 사용 안함"
            subtitle="정가로 결제합니다"
          />

          {coupons.length === 0 ? (
            <p className="text-center text-zinc-500 text-sm py-4">
              이 금액에 적용 가능한 쿠폰이 없습니다.
            </p>
          ) : (
            coupons.map((uc) => (
              <CouponOption
                key={uc.id}
                selected={selectedId === uc.id}
                onClick={() => setSelectedId(uc.id)}
                title={uc.coupon.name}
                subtitle={buildCouponSubtitle(uc)}
                discountLabel={getDiscountLabel(uc.coupon)}
                daysLeft={Math.max(0, Math.ceil(
                  (new Date(uc.expiresAt).getTime() - Date.now()) / 86_400_000,
                ))}
              />
            ))
          )}
        </div>
      )}

      {/* 가격 요약 */}
      <div className="border-t border-zinc-700 pt-4 pb-4">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>기본 요금</span>
            <span>{breakdown.totalAmount.toLocaleString()}원</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-400 font-medium">
              <span>쿠폰 할인</span>
              <span>-{discount.toLocaleString()}원</span>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center mt-3">
          <span className="text-zinc-300 text-sm font-medium">최종 결제금액</span>
          {calculating ? (
            <span className="text-zinc-400 text-sm">계산 중...</span>
          ) : (
            <span className={`text-xl font-bold ${discount > 0 ? 'text-red-400' : 'text-white'}`}>
              {finalTotal.toLocaleString()}원
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onBack}
          disabled={booking}
          className="px-4 py-3 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-sm transition-colors disabled:opacity-50 shrink-0"
        >
          ← 좌석 변경
        </button>
        <button
          onClick={() => onBook(selectedId)}
          disabled={booking || calculating}
          className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-sm"
        >
          {booking ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              처리 중...
            </span>
          ) : `${finalTotal.toLocaleString()}원 예매하기`}
        </button>
      </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function ScreeningPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<ScreeningDetail | null>(null);
  const [seatMap, setSeatMap] = useState<Map<string, Seat>>(new Map());
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [step, setStep] = useState<Step>('audience');
  const [counts, setCounts] = useState<AudienceCounts>({
    ADULT: 0, TEEN: 0, SENIOR: 0, DISABLED: 0, CHILD: 0,
  });
  const [selected, setSelected] = useState<number[]>([]);
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);

  const totalAudience = AUDIENCE_KEYS.reduce((s, k) => s + (counts[k] ?? 0), 0);

  useEffect(() => {
    getScreening(Number(params.id))
      .then((d) => {
        setData(d);
        const map = new Map<string, Seat>();
        for (const seat of d.screen.seats) map.set(`${seat.row}${seat.number}`, seat);
        setSeatMap(map);
      })
      .catch(() => setFetchError('상영 정보를 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, [params.id]);

  // 좌석 수 = 인원 수일 때 가격 계산 (debounce 200ms)
  useEffect(() => {
    // 쿠폰 단계로 이동 후에도 breakdown을 유지해야 하므로 조기 리턴
    if (step === 'coupon') return;
    if (step !== 'seats' || selected.length !== totalAudience || totalAudience === 0) {
      setBreakdown(null);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;

    const timer = setTimeout(async () => {
      try {
        const result = await calculatePrice(
          { screeningId: Number(params.id), seatIds: selected, audienceCounts: counts },
          token,
        );
        setBreakdown(result);
      } catch {
        setBreakdown(null);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [selected, step, totalAudience, counts, params.id]);

  function adjustCount(key: AudienceKey, delta: number) {
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) + delta) }));
  }

  function handleProceedToSeats() {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/login?redirect=/screenings/${params.id}`);
      return;
    }
    setSelected([]);
    setBreakdown(null);
    setStep('seats');
  }

  function handleBackToAudience() {
    setSelected([]);
    setBreakdown(null);
    setStep('audience');
  }

  function handleProceedToCoupon() {
    if (!breakdown) return;
    setStep('coupon');
  }

  function handleBackToSeats() {
    setStep('seats');
  }

  function toggleSeat(seatId: number) {
    setSelected((prev) => {
      if (prev.includes(seatId)) return prev.filter((id) => id !== seatId);
      if (prev.length >= totalAudience) return prev;
      return [...prev, seatId];
    });
  }

  async function handleBooking(userCouponId?: number) {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/login?redirect=/screenings/${params.id}`);
      return;
    }
    setBooking(true);
    try {
      const reservation = await createReservation(
        {
          screeningId: Number(params.id),
          seatIds: selected,
          audienceCounts: counts,
          ...(userCouponId ? { userCouponId } : {}),
        },
        token,
      );
      router.push(`/reservations/${reservation.id}/payment`);
    } catch (e) {
      toast(e instanceof Error ? e.message : '예매에 실패했습니다.', 'error');
    } finally {
      setBooking(false);
    }
  }

  if (loading) return <Spinner />;
  if (fetchError) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{fetchError}</p>
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white text-sm">
          ← 돌아가기
        </button>
      </div>
    );
  }
  if (!data) return null;

  const bookedSet = new Set(data.bookedSeatIds);
  const rows = Array.from(new Set(data.screen.seats.map((s) => s.row))).sort();
  const cols = Array.from(new Set(data.screen.seats.map((s) => s.number))).sort((a, b) => a - b);
  const selectedSeats = data.screen.seats.filter((s) => selected.includes(s.id));
  const audienceSummary = AUDIENCE_KEYS
    .filter((k) => (counts[k] ?? 0) > 0)
    .map((k) => `${AUDIENCE_LABELS[k]} ${counts[k]}`)
    .join(' · ');

  const seatsReady = selected.length === totalAudience && !!breakdown;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 상단 영화 정보 */}
      <div className="mb-5">
        <h1 className="text-xl font-bold">{data.movie.title}</h1>
        <p className="text-zinc-400 text-sm mt-1 flex items-center flex-wrap gap-1">
          <span>{data.screen.cinema.name} · {data.screen.name}</span>
          {data.screen.type && (
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              data.screen.type.grade === '스페셜관'
                ? 'bg-yellow-900/60 text-yellow-400 border border-yellow-700'
                : 'bg-zinc-800 text-zinc-400'
            }`}>
              {data.screen.type.name}
            </span>
          )}
          <span>· {data.screenType}</span>
        </p>
        <p className="text-zinc-400 text-sm">
          {new Date(data.startTime).toLocaleString('ko-KR', {
            month: 'long', day: 'numeric', weekday: 'short',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        {(['audience', 'seats', 'coupon'] as Step[]).map((s, i) => {
          const labels = ['① 인원', '② 좌석', '③ 쿠폰'];
          const active = step === s;
          const done = (
            (s === 'audience' && (step === 'seats' || step === 'coupon')) ||
            (s === 'seats' && step === 'coupon')
          );
          return (
            <span key={s} className="flex items-center gap-2">
              {i > 0 && <span className="text-zinc-700">›</span>}
              <span className={
                active ? 'text-white font-semibold'
                : done ? 'text-zinc-400'
                : 'text-zinc-600'
              }>
                {labels[i]}
              </span>
            </span>
          );
        })}
      </div>

      {/* ── Step 1: 인원 선택 ───────────────────────────────────────── */}
      {step === 'audience' && (
        <AudienceSelector
          counts={counts}
          totalAudience={totalAudience}
          onChange={adjustCount}
          onNext={handleProceedToSeats}
        />
      )}

      {/* ── Step 2: 좌석 선택 ───────────────────────────────────────── */}
      {step === 'seats' && (
        <>
          {/* sticky 인원 정보 바 */}
          <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-sm -mx-4 px-4 py-3 mb-4 flex items-center justify-between border-b border-zinc-800">
            <div className="text-sm">
              <span className="text-white font-medium">{audienceSummary}</span>
              <span className="text-zinc-400 ml-1">(총 {totalAudience}명)</span>
            </div>
            <button
              onClick={handleBackToAudience}
              className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded transition-colors"
            >
              인원 변경
            </button>
          </div>

          {/* 좌석 그리드 */}
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <div className="mb-5">
              <div className="bg-zinc-500 h-1.5 rounded-full mx-auto w-3/4" />
              <p className="text-center text-zinc-500 text-xs mt-1.5 tracking-widest">SCREEN</p>
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-5 text-xs text-zinc-400 justify-center">
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 border border-zinc-500 rounded inline-block" />일반
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 border-2 border-pink-400 rounded-lg bg-pink-950/30 inline-flex items-center justify-center text-[9px]">💕</span>커플
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 border-2 border-blue-400 rounded bg-blue-950/30 inline-flex items-center justify-center text-[9px]">♿</span>장애인
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 border-2 border-yellow-500 rounded bg-yellow-950/30 inline-flex items-center justify-center text-[9px]">👑</span>리클라이너
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 bg-red-600 rounded inline-block" />선택됨
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 bg-zinc-700 rounded inline-block" />예매됨
              </span>
            </div>

            <div className="space-y-2 overflow-x-auto pb-1">
              {rows.map((row) => (
                <div key={row} className="flex items-center gap-1.5 min-w-max mx-auto">
                  <span className="text-xs text-zinc-500 w-4 shrink-0">{row}</span>
                  {buildRowSegments(cols, seatMap, row).map((seg, gi) => {
                    if (seg.kind === 'empty') {
                      return <div key={`e-${seg.col}`} className="w-8 h-8" />;
                    }
                    if (seg.kind === 'couple-pair') {
                      return (
                        <div key={`p-${gi}`} className="flex">
                          {[seg.left, seg.right].map((seat, ci) => {
                            const isBooked   = bookedSet.has(seat.id);
                            const isSelected = selected.includes(seat.id);
                            const isAtMax    = !isSelected && !isBooked && selected.length >= totalAudience;
                            const roundClass = ci === 0 ? 'rounded-l-xl rounded-r-none' : 'rounded-r-xl rounded-l-none';
                            return (
                              <button
                                key={seat.id}
                                disabled={isBooked || isAtMax}
                                onClick={() => toggleSeat(seat.id)}
                                title={`${seat.row}${seat.number} (커플석)`}
                                className={getSeatClass(seat, isBooked, isSelected, isAtMax, roundClass)}
                              >
                                {seat.number}
                              </button>
                            );
                          })}
                        </div>
                      );
                    }
                    const { seat } = seg;
                    const isBooked   = bookedSet.has(seat.id);
                    const isSelected = selected.includes(seat.id);
                    const isAtMax    = !isSelected && !isBooked && selected.length >= totalAudience;
                    return (
                      <button
                        key={seat.id}
                        disabled={isBooked || isAtMax}
                        onClick={() => toggleSeat(seat.id)}
                        title={`${seat.row}${seat.number}${seat.type ? ` (${seat.type.name})` : ''}`}
                        className={getSeatClass(seat, isBooked, isSelected, isAtMax)}
                      >
                        {seat.type?.name === '장애인석' ? '♿' : seat.number}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 선택 요약 + 다음 버튼 */}
          <div className="mt-6 bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <div className="flex justify-between items-center mb-4">
              <span className="text-zinc-400 text-sm">선택한 좌석</span>
              <span className="text-sm font-medium">
                {selectedSeats.length === 0
                  ? '없음'
                  : `${selectedSeats.map((s) => `${s.row}${s.number}`).join(', ')} (${selected.length}/${totalAudience})`}
              </span>
            </div>

            {/* 가격 브레이크다운 */}
            {breakdown ? (
              <div className="mb-5">
                <div className="space-y-1.5 text-sm mb-3">
                  {breakdown.details.map((d) => (
                    <div key={d.audienceType} className="flex justify-between text-zinc-400">
                      <span>{AUDIENCE_LABELS[d.audienceType as AudienceKey]} {d.count}명 × {d.unitPrice.toLocaleString()}원</span>
                      <span>{d.subtotal.toLocaleString()}원</span>
                    </div>
                  ))}
                  {breakdown.seatBonus > 0 && (
                    <div className="flex justify-between text-zinc-400">
                      <span>좌석 추가요금</span>
                      <span>+{breakdown.seatBonus.toLocaleString()}원</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center border-t border-zinc-700 pt-3">
                  <span className="text-zinc-400 text-sm">합계</span>
                  <span className="text-xl font-bold text-white">
                    {breakdown.totalAmount.toLocaleString()}원
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 text-sm mb-5">
                {selected.length === 0
                  ? '좌석을 선택하면 가격이 표시됩니다'
                  : selected.length < totalAudience
                  ? `좌석을 ${totalAudience - selected.length}개 더 선택하세요`
                  : '요금 계산 중...'}
              </p>
            )}

            <button
              onClick={handleProceedToCoupon}
              disabled={!seatsReady}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {seatsReady
                ? `쿠폰 선택 → (${breakdown!.totalAmount.toLocaleString()}원)`
                : `${totalAudience - selected.length > 0 ? `좌석 ${totalAudience - selected.length}개 더 선택하세요` : '요금 계산 중...'}`
              }
            </button>
          </div>
        </>
      )}

      {/* ── Step 3: 쿠폰 선택 ───────────────────────────────────────── */}
      {step === 'coupon' && breakdown && (
        <>
          {/* 선택 요약 (읽기 전용) */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 mb-4 text-sm flex flex-wrap gap-x-4 gap-y-1 text-zinc-400">
            <span>{audienceSummary} (총 {totalAudience}명)</span>
            <span>
              좌석: {selectedSeats.map((s) => `${s.row}${s.number}`).join(', ')}
            </span>
          </div>

          <CouponStep
            screeningId={Number(params.id)}
            seatIds={selected}
            audienceCounts={counts}
            breakdown={breakdown}
            onBack={handleBackToSeats}
            onBook={handleBooking}
            booking={booking}
          />
        </>
      )}
    </div>
  );
}
