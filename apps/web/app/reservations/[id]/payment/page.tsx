'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';
import { getReservation, calculatePrice } from '@/lib/api';
import Spinner from '@/components/Spinner';
import type { Reservation, AudienceCounts, PriceBreakdown } from '@/lib/types';

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
  const reservationId = params.id as string;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [remainingMs, setRemainingMs] = useState(PENDING_TTL_MS);
  const [widgetReady, setWidgetReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);

  const initialized = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const widgetsRef = useRef<any>(null);

  // 예매 조회
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace(`/login?redirect=/reservations/${reservationId}/payment`);
      return;
    }
    getReservation(Number(reservationId), token)
      .then((r) => {
        if (r.status === 'PAID') {
          router.replace(`/reservations/complete?id=${r.id}`);
          return;
        }
        if (r.status !== 'PENDING') {
          setPageState('invalid');
          return;
        }
        const age = Date.now() - new Date(r.createdAt).getTime();
        if (age >= PENDING_TTL_MS) {
          setReservation(r);
          setPageState('expired');
          return;
        }
        setReservation(r);
        setPageState('ready');
      })
      .catch(() => {
        setFetchError('예매 정보를 불러올 수 없습니다.');
        setPageState('error');
      });
  }, [reservationId, router]);

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

  // 가격 breakdown 조회 (쿠폰 포함)
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
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-3xl">
          ⏰
        </div>
        <div>
          <h1 className="text-xl font-bold">결제 시간이 만료되었습니다</h1>
          <p className="text-zinc-400 text-sm mt-2">
            좌석 선택 후 10분 이내에 결제해야 합니다.<br />
            좌석을 다시 선택해주세요.
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

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* 헤더 카드: 영화 정보 + 카운트다운 */}
      <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 mb-5 flex items-center justify-between gap-4 transition-colors">
        <div className="min-w-0">
          <p className="font-bold text-base truncate">{reservation.screening.movie.title}</p>
          <p className="text-zinc-400 text-sm mt-0.5 truncate">
            {reservation.screening.screen.cinema.name} · {reservation.screening.screen.name}
          </p>
          <p className="text-zinc-500 text-sm">
            {new Date(reservation.screening.startTime).toLocaleString('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* 카운트다운 */}
        <div className={`shrink-0 text-right transition-colors ${isUrgent ? 'text-red-400' : 'text-zinc-300'}`}>
          <div className={`text-3xl font-mono font-bold tabular-nums leading-none ${isUrgent ? 'animate-pulse' : ''}`}>
            {formatCountdown(remainingMs)}
          </div>
          <div className={`text-xs mt-1 ${isUrgent ? 'text-red-500' : 'text-zinc-500'}`}>
            {isUrgent ? '⚠️ 곧 만료!' : '⏰ 남음'}
          </div>
        </div>
      </div>

      {/* 결제 상세 */}
      <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 mb-5 transition-colors">
        <h2 className="font-semibold text-sm text-zinc-400 mb-3">결제 정보</h2>
        <div className="space-y-2 text-sm">
          <InfoRow label="좌석" value={seats} />
          {reservation.audienceCounts && (
            <InfoRow label="관람인원" value={formatAudience(reservation.audienceCounts)} />
          )}
          {breakdown && (
            <div className="space-y-1 pt-1 pb-1">
              {breakdown.details.map((d) => (
                <div key={d.audienceType} className="flex justify-between text-zinc-500 text-xs">
                  <span>{AUDIENCE_LABELS[d.audienceType] ?? d.audienceType} {d.count}명 × {d.unitPrice.toLocaleString()}원</span>
                  <span>{d.subtotal.toLocaleString()}원</span>
                </div>
              ))}
              {breakdown.seatBonus > 0 && (
                <div className="flex justify-between text-zinc-500 text-xs">
                  <span>좌석 추가요금</span>
                  <span>+{breakdown.seatBonus.toLocaleString()}원</span>
                </div>
              )}
              {breakdown.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-400 text-xs font-medium">
                  <span>쿠폰 할인 ({breakdown.appliedCoupon?.couponName})</span>
                  <span>-{breakdown.couponDiscount.toLocaleString()}원</span>
                </div>
              )}
            </div>
          )}
          <div className="border-t border-zinc-800 pt-2 flex justify-between font-bold text-base">
            <span>결제 금액</span>
            <span className="text-red-400">{reservation.totalAmount.toLocaleString()}원</span>
          </div>
        </div>
      </div>

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
        disabled={!widgetReady || paying}
        className="w-full mt-6 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-lg transition-colors"
      >
        {paying ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            처리 중...
          </span>
        ) : (
          `${reservation.totalAmount.toLocaleString()}원 결제하기`
        )}
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-400 shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
