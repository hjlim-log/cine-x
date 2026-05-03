'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';
import {
  getReservation,
  calculatePrice,
  getApplicablePartnerDiscounts,
  applyReservationPartnerDiscount,
} from '@/lib/api';
import Spinner from '@/components/Spinner';
import type { Reservation, AudienceCounts, PriceBreakdown, PartnerDiscount } from '@/lib/types';

const AUDIENCE_LABELS: Record<string, string> = {
  ADULT: '성인', TEEN: '청소년', SENIOR: '경로', DISABLED: '장애인', CHILD: '어린이',
};

function formatAudience(counts: AudienceCounts): string {
  return Object.entries(counts)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([k, n]) => `${AUDIENCE_LABELS[k] ?? k} ${n}`)
    .join(' · ');
}

const PENDING_TTL_MS = 10 * 60 * 1000;

type PageState = 'loading' | 'ready' | 'expired' | 'invalid' | 'error';

function formatCountdown(ms: number): string {
  const totalSecs = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = params.id as string;
  const clearPartnerDiscount = searchParams.get('clearPartnerDiscount') === 'true';

  const [pageState, setPageState] = useState<PageState>('loading');
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [remainingMs, setRemainingMs] = useState(PENDING_TTL_MS);
  const [widgetReady, setWidgetReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
  const [partnerDiscounts, setPartnerDiscounts] = useState<PartnerDiscount[]>([]);
  const [selectedPartnerDiscountId, setSelectedPartnerDiscountId] = useState<number | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState('');

  const initialized = useRef(false);
  const partnerDiscountsFetched = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const widgetsRef = useRef<any>(null);

  // 예매 조회
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace(`/login?redirect=/reservations/${reservationId}/payment`);
      return;
    }
    (async () => {
      try {
        let r = await getReservation(Number(reservationId), token);
        if (r.status === 'PAID') {
          router.replace(`/reservations/complete?id=${r.id}`);
          return;
        }
        if (r.status !== 'PENDING') {
          setPageState('invalid');
          return;
        }
        // clearPartnerDiscount=true: 제휴할인 해제 후 totalAmount 갱신
        if (clearPartnerDiscount) {
          try {
            const newBreakdown = await applyReservationPartnerDiscount(Number(reservationId), undefined, token);
            r = { ...r, totalAmount: newBreakdown.totalAmount };
            setBreakdown(newBreakdown);
            setSelectedPartnerDiscountId(null);
          } catch {}
        }
        const age = Date.now() - new Date(r.createdAt).getTime();
        if (age >= PENDING_TTL_MS) {
          setReservation(r);
          setPageState('expired');
          return;
        }
        setReservation(r);
        setPageState('ready');
      } catch {
        setFetchError('예매 정보를 불러올 수 없습니다.');
        setPageState('error');
      }
    })();
  }, [reservationId, router, clearPartnerDiscount]);

  // 카운트다운 인터벌
  useEffect(() => {
    if (pageState !== 'ready' || !reservation) return;
    const expireAt = new Date(reservation.createdAt).getTime() + PENDING_TTL_MS;
    setRemainingMs(Math.max(0, expireAt - Date.now()));
    const id = setInterval(() => {
      const rem = expireAt - Date.now();
      if (rem <= 0) {
        clearInterval(id);
        setRemainingMs(0);
        setPageState('expired');
      } else {
        setRemainingMs(rem);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [pageState, reservation]);

  // 초기 가격 breakdown 계산 (쿠폰 포함, 제휴할인 제외)
  useEffect(() => {
    if (!reservation?.audienceCounts || !reservation.tickets.length) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    calculatePrice(
      {
        screeningId: reservation.screeningId,
        seatIds: reservation.tickets.map((t) => t.seatId),
        audienceCounts: reservation.audienceCounts,
        ...(reservation.couponUsage?.userCoupon?.id
          ? { userCouponId: reservation.couponUsage.userCoupon.id }
          : {}),
      },
      token,
    )
      .then(setBreakdown)
      .catch(() => {});
  }, [reservation]);

  // breakdown 최초 로드 후 제휴할인 목록 조회 (1회만)
  useEffect(() => {
    if (!breakdown || partnerDiscountsFetched.current) return;
    partnerDiscountsFetched.current = true;
    const token = localStorage.getItem('token');
    if (!token) return;
    getApplicablePartnerDiscounts(breakdown.afterMembershipAmount ?? breakdown.afterCouponAmount, token)
      .then(setPartnerDiscounts)
      .catch(() => {});
  }, [breakdown]);

  // 토스 위젯 초기화
  useEffect(() => {
    if (pageState !== 'ready' || !reservation || initialized.current) return;
    initialized.current = true;
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;
    (async () => {
      try {
        const tossPayments = await loadTossPayments(clientKey);
        const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });
        widgetsRef.current = widgets;
        await widgets.setAmount({ currency: 'KRW', value: reservation.totalAmount });
        await widgets.renderPaymentMethods({ selector: '#payment-method', variantKey: 'DEFAULT' });
        await widgets.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' });
        setWidgetReady(true);
      } catch {
        setFetchError('결제 위젯을 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.');
        setPageState('error');
      }
    })();
  }, [pageState, reservation]);

  async function handlePartnerDiscountSelect(discountId: number | null) {
    if (!reservation || applyingDiscount) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setApplyingDiscount(true);
    setDiscountError('');
    try {
      const newBreakdown = await applyReservationPartnerDiscount(
        Number(reservationId),
        discountId ?? undefined,
        token,
      );
      setBreakdown(newBreakdown);
      setSelectedPartnerDiscountId(discountId);
      if (widgetsRef.current) {
        await widgetsRef.current.setAmount({ currency: 'KRW', value: newBreakdown.totalAmount });
      }
    } catch (e) {
      setDiscountError(e instanceof Error ? e.message : '제휴할인 적용에 실패했습니다.');
    } finally {
      setApplyingDiscount(false);
    }
  }

  async function handlePay() {
    if (!widgetsRef.current || !reservation) return;
    setPaying(true);
    const seatCount = reservation.tickets.length;
    const movieTitle = reservation.screening.movie.title;
    const orderName = seatCount === 1 ? movieTitle : `${movieTitle} 외 ${seatCount - 1}매`;
    try {
      await widgetsRef.current.requestPayment({
        orderId: reservation.orderId,
        orderName,
        successUrl: `${window.location.origin}/reservations/${reservationId}/payment/success`,
        failUrl: `${window.location.origin}/reservations/${reservationId}/payment/fail`,
        customerEmail: reservation.customer?.email ?? '',
        customerName: reservation.customer?.name ?? '',
      });
    } catch {
      setPaying(false);
    }
  }

  if (pageState === 'loading') return <Spinner />;

  if (pageState === 'expired') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-3xl">⏰</div>
        <div>
          <h1 className="text-xl font-bold">결제 시간이 만료되었습니다</h1>
          <p className="text-zinc-400 text-sm mt-2">
            좌석 선택 후 10분 이내에 결제해야 합니다.<br />좌석을 다시 선택해주세요.
          </p>
        </div>
        {reservation && (
          <Link
            href={`/movies/${reservation.screening.movieId}`}
            className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            다시 예매하기
          </Link>
        )}
      </div>
    );
  }

  if (pageState === 'invalid') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-zinc-300 font-medium">결제할 수 없는 예매입니다</p>
        <p className="text-zinc-500 text-sm">이미 처리되었거나 취소된 예매입니다.</p>
        <Link href="/my/reservations" className="inline-block text-red-400 hover:text-red-300 text-sm underline">
          내 예매 내역 보기
        </Link>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-red-400">{fetchError}</p>
        <button
          onClick={() => router.back()}
          className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
        >
          ← 돌아가기
        </button>
      </div>
    );
  }

  if (!reservation) return null;

  const seats = reservation.tickets.map((t) => `${t.seat.row}${t.seat.number}`).join(', ');
  const isUrgent = remainingMs <= 60_000;
  const finalAmount = breakdown?.totalAmount ?? reservation.totalAmount;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* 헤더 카드 */}
      <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 mb-5 flex items-center justify-between gap-4 transition-colors">
        <div className="min-w-0">
          <p className="font-bold text-base truncate">{reservation.screening.movie.title}</p>
          <p className="text-zinc-400 text-sm mt-0.5 truncate">
            {reservation.screening.screen.cinema.name} · {reservation.screening.screen.name}
          </p>
          <p className="text-zinc-500 text-sm">
            {new Date(reservation.screening.startTime).toLocaleString('ko-KR', {
              month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <div className={`shrink-0 text-right transition-colors ${isUrgent ? 'text-red-400' : 'text-zinc-300'}`}>
          <div className={`text-3xl font-mono font-bold tabular-nums leading-none ${isUrgent ? 'animate-pulse' : ''}`}>
            {formatCountdown(remainingMs)}
          </div>
          <div className={`text-xs mt-1 ${isUrgent ? 'text-red-500' : 'text-zinc-500'}`}>
            {isUrgent ? '⚠️ 곧 만료!' : '⏰ 남음'}
          </div>
        </div>
      </div>

      {/* 영수증 형태 가격 상세 */}
      <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 mb-5 transition-colors">
        <h2 className="font-semibold text-sm text-zinc-400 mb-3">결제 정보</h2>
        <div className="text-sm space-y-0.5">
          <ReceiptRow label="좌석" value={seats} />
          {reservation.audienceCounts && (
            <ReceiptRow label="관람인원" value={formatAudience(reservation.audienceCounts)} />
          )}

          {breakdown ? (
            <div className="pt-2 space-y-0.5">
              {/* 인원별 기본료 */}
              {breakdown.details.map((d) => (
                <div key={d.audienceType} className="flex justify-between text-zinc-500 text-xs py-0.5">
                  <span>{AUDIENCE_LABELS[d.audienceType] ?? d.audienceType} {d.count}명 × {d.unitPrice.toLocaleString()}원</span>
                  <span>{d.subtotal.toLocaleString()}원</span>
                </div>
              ))}
              {breakdown.seatBonus > 0 && (
                <div className="flex justify-between text-zinc-500 text-xs py-0.5">
                  <span>좌석 추가요금</span>
                  <span>+{breakdown.seatBonus.toLocaleString()}원</span>
                </div>
              )}

              <Divider />
              <ReceiptRow label="소계" value={`${breakdown.subtotal.toLocaleString()}원`} bold />

              {/* 쿠폰 할인 */}
              {breakdown.couponDiscount > 0 && (
                <ReceiptRow
                  label={`쿠폰 (${breakdown.appliedCoupon?.couponName ?? '쿠폰'})`}
                  value={`-${breakdown.couponDiscount.toLocaleString()}원`}
                  color="emerald"
                />
              )}

              {/* 쿠폰 + (멤버십 or 제휴) 둘 다 있을 때 중간 소계 */}
              {breakdown.couponDiscount > 0 && (breakdown.membershipDiscount > 0 || breakdown.partnerDiscount > 0) && (
                <>
                  <Divider />
                  <ReceiptRow label="쿠폰 적용 후" value={`${breakdown.afterCouponAmount.toLocaleString()}원`} />
                </>
              )}

              {/* 멤버십 할인 */}
              {breakdown.membershipDiscount > 0 && (
                <ReceiptRow
                  label={`멤버십 (${breakdown.appliedMembership?.gradeName ?? ''}) ${breakdown.appliedMembership?.discountPercent ?? 0}%`}
                  value={`-${breakdown.membershipDiscount.toLocaleString()}원`}
                  color="violet"
                />
              )}

              {/* 멤버십 + 제휴할인 둘 다 있을 때 중간 소계 */}
              {breakdown.membershipDiscount > 0 && breakdown.partnerDiscount > 0 && (
                <>
                  <Divider />
                  <ReceiptRow label="멤버십 적용 후" value={`${breakdown.afterMembershipAmount.toLocaleString()}원`} />
                </>
              )}

              {/* 제휴할인 */}
              {breakdown.partnerDiscount > 0 && (
                <ReceiptRow
                  label={`${breakdown.appliedPartnerDiscount?.partnerName ?? '제휴'} 할인`}
                  value={`-${breakdown.partnerDiscount.toLocaleString()}원`}
                  color="blue"
                />
              )}

              <Divider />
              <ReceiptRow label="최종 결제 금액" value={`${breakdown.totalAmount.toLocaleString()}원`} bold color="red" />
            </div>
          ) : (
            <div className="pt-2">
              <Divider />
              <ReceiptRow label="결제 금액" value={`${reservation.totalAmount.toLocaleString()}원`} bold color="red" />
            </div>
          )}
        </div>
      </div>

      {/* 제휴할인 선택 */}
      {partnerDiscounts.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 mb-5 transition-colors">
          <h2 className="font-semibold text-sm text-zinc-400 mb-1">💳 제휴 할인</h2>
          <p className="text-xs text-zinc-600 mb-4">결제할 카드를 선택하시면 추가 할인이 적용됩니다.</p>

          <div className="grid grid-cols-3 gap-2">
            {/* 사용 안함 */}
            <button
              onClick={() => selectedPartnerDiscountId !== null && handlePartnerDiscountSelect(null)}
              disabled={applyingDiscount || selectedPartnerDiscountId === null}
              className={`relative p-3 rounded-lg border text-left transition-all ${
                selectedPartnerDiscountId === null
                  ? 'border-zinc-400 bg-zinc-800 cursor-default'
                  : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-500 cursor-pointer'
              }`}
            >
              <div className="text-xs font-medium text-zinc-300">사용 안함</div>
              {selectedPartnerDiscountId === null && <SelectedMark />}
            </button>

            {partnerDiscounts.map((pd) => (
              <button
                key={pd.id}
                onClick={() => selectedPartnerDiscountId !== pd.id && handlePartnerDiscountSelect(pd.id)}
                disabled={applyingDiscount || selectedPartnerDiscountId === pd.id}
                style={{ backgroundColor: pd.bgColor ?? '#374151' }}
                className={`relative p-3 rounded-lg text-left transition-all ${
                  selectedPartnerDiscountId === pd.id
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 cursor-default'
                    : 'opacity-80 hover:opacity-100 cursor-pointer'
                }`}
              >
                <div className="text-xs font-bold text-white truncate">{pd.partnerName}</div>
                <div className="text-[11px] text-white/80 mt-0.5">
                  {pd.discountMethod === 'AMOUNT'
                    ? `-${pd.discountValue.toLocaleString()}원`
                    : `-${pd.discountValue}%`}
                </div>
                {selectedPartnerDiscountId === pd.id && <SelectedMark />}
              </button>
            ))}
          </div>

          {/* 적용된 할인 정보 */}
          {selectedPartnerDiscountId !== null && breakdown?.appliedPartnerDiscount && (
            <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300 truncate mr-2">
                  {breakdown.appliedPartnerDiscount.name}
                </span>
                <span className="text-sm font-semibold text-blue-400 shrink-0">
                  -{breakdown.appliedPartnerDiscount.discountAmount.toLocaleString()}원
                </span>
              </div>
              <p className="text-xs text-amber-500/90 leading-relaxed">
                선택하신 카드로 결제하지 않으면 할인이 적용되지 않을 수 있습니다.
              </p>
            </div>
          )}

          {applyingDiscount && (
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
              <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              할인 적용 중...
            </div>
          )}
          {discountError && (
            <p className="mt-2 text-xs text-red-400">{discountError}</p>
          )}
        </div>
      )}

      {/* 토스 위젯 */}
      {!widgetReady && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div id="payment-method" />
      <div id="agreement" className="mt-2" />

      <button
        onClick={handlePay}
        disabled={!widgetReady || paying || applyingDiscount}
        className="w-full mt-6 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-lg transition-colors"
      >
        {paying ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            처리 중...
          </span>
        ) : (
          `${finalAmount.toLocaleString()}원 결제하기`
        )}
      </button>
    </div>
  );
}

function SelectedMark() {
  return (
    <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
      <span className="text-[9px] font-bold text-zinc-900">✓</span>
    </div>
  );
}

function ReceiptRow({
  label,
  value,
  bold = false,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: 'emerald' | 'blue' | 'red' | 'violet';
}) {
  const colorClass =
    color === 'emerald' ? 'text-emerald-400' :
    color === 'blue' ? 'text-blue-400' :
    color === 'red' ? 'text-red-400' :
    color === 'violet' ? 'text-violet-400' : '';
  return (
    <div className={`flex justify-between gap-4 py-0.5 ${bold ? 'font-semibold' : ''} ${colorClass || ''}`}>
      <span className={!color && !bold ? 'text-zinc-400' : ''}>{label}</span>
      <span className="shrink-0">{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-zinc-800 my-2" />;
}
