'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Spinner from '@/components/Spinner';
import { getReservation } from '@/lib/api';
import type { Reservation, AudienceCounts } from '@/lib/types';

const AUDIENCE_LABELS: Record<string, string> = {
  ADULT: '성인', TEEN: '청소년', SENIOR: '경로', DISABLED: '장애인', CHILD: '어린이',
};

function formatAudience(counts: AudienceCounts): string {
  const parts = Object.entries(counts)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([k, n]) => `${AUDIENCE_LABELS[k] ?? k} ${n}명`);
  const total = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);
  return parts.join(', ') + ` (총 ${total}명)`;
}

const GRADE_STYLE: Record<string, { gradient: string }> = {
  VIP:  { gradient: 'from-red-500 to-red-800' },
  VVIP: { gradient: 'from-violet-500 to-violet-800' },
  LVIP: { gradient: 'from-amber-400 to-amber-600' },
};

function UpgradeModal({ fromGrade, toGrade, onClose }: { fromGrade: string; toGrade: string; onClose: () => void }) {
  const style = GRADE_STYLE[toGrade] ?? { gradient: 'from-zinc-500 to-zinc-700' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-7 max-w-sm w-full text-center shadow-2xl">
        <div className={`w-20 h-20 bg-gradient-to-br ${style.gradient} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}>
          <span className="text-3xl">🎉</span>
        </div>
        <h2 className="text-xl font-black mb-1">등급 승급!</h2>
        <p className="text-zinc-400 text-sm mb-5">축하합니다! 멤버십 등급이 올라갔어요.</p>
        <div className="flex items-center justify-center gap-3 mb-6 text-lg font-bold">
          <span className="text-zinc-400">{fromGrade}</span>
          <span className="text-zinc-600">→</span>
          <span className="text-white">{toGrade}</span>
        </div>
        <div className="flex gap-2">
          <Link
            href="/my/coupons"
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            쿠폰 확인
          </Link>
          <button
            onClick={onClose}
            className={`flex-1 bg-gradient-to-r ${style.gradient} text-white text-sm font-semibold py-2.5 rounded-lg transition-opacity hover:opacity-90`}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

function CompleteContent() {
  const searchParams = useSearchParams();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const upgraded = searchParams.get('upgraded') === 'true';
  const fromGrade = searchParams.get('fromGrade') ?? '';
  const toGrade = searchParams.get('toGrade') ?? '';

  useEffect(() => {
    const id = Number(searchParams.get('id'));
    const token = localStorage.getItem('token') ?? '';
    if (!id || !token) {
      setError('예매 정보를 찾을 수 없습니다.');
      return;
    }
    getReservation(id, token)
      .then((r) => {
        setReservation(r);
        if (upgraded && fromGrade && toGrade) setShowUpgradeModal(true);
      })
      .catch(() => setError('예매 정보를 불러오는 데 실패했습니다.'));
  }, []);

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400 mb-4">{error}</p>
        <Link href="/" className="text-red-400 hover:text-red-300 underline text-sm">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  if (!reservation) return <Spinner />;

  const { screening } = reservation;
  const seats = reservation.tickets.map((t) => `${t.seat.row}${t.seat.number}`).join(', ');

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {showUpgradeModal && (
        <UpgradeModal
          fromGrade={fromGrade}
          toGrade={toGrade}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">결제 완료!</h1>
        <p className="text-zinc-400 text-sm mt-2">예매가 성공적으로 완료되었습니다.</p>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="bg-red-600 px-5 py-3 flex justify-between items-center">
          <span className="text-sm font-medium">예매번호</span>
          <span className="font-bold tracking-wider">#{String(reservation.id).padStart(6, '0')}</span>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <Row label="영화" value={screening.movie.title} />
          <Row
            label="영화관"
            value={`${screening.screen.cinema.name} · ${screening.screen.name}`}
          />
          <Row
            label="일시"
            value={new Date(screening.startTime).toLocaleString('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
          <Row label="상영 유형" value={screening.screenType} />
          <Row label="좌석" value={seats} />
          {reservation.audienceCounts && (
            <Row label="관람인원" value={formatAudience(reservation.audienceCounts)} />
          )}
          {reservation.couponUsage && reservation.couponUsage.discountAmount > 0 && (
            <Row
              label="쿠폰 할인"
              value={`-${reservation.couponUsage.discountAmount.toLocaleString()}원 (${reservation.couponUsage.userCoupon?.coupon.name ?? '쿠폰'})`}
            />
          )}
          {reservation.partnerDiscountUsage && reservation.partnerDiscountUsage.discountAmount > 0 && (
            <Row
              label="제휴 할인"
              value={`-${reservation.partnerDiscountUsage.discountAmount.toLocaleString()}원 (${
                reservation.partnerDiscountUsage.partnerDiscount?.partnerName ?? '제휴'
              })`}
            />
          )}
          {reservation.paidAt && (
            <Row
              label="결제 시각"
              value={new Date(reservation.paidAt).toLocaleString('ko-KR', {
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            />
          )}
          <div className="border-t border-zinc-800 pt-3 flex justify-between font-bold">
            <span>결제 금액</span>
            <span className="text-red-400">{reservation.totalAmount.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Link
          href="/my/reservations"
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-center py-3 rounded-lg text-sm font-medium transition-colors"
        >
          내 예매 내역
        </Link>
        <Link
          href="/"
          className="flex-1 bg-red-600 hover:bg-red-700 text-white text-center py-3 rounded-lg text-sm font-medium transition-colors"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}

export default function CompletePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CompleteContent />
    </Suspense>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-400 shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
