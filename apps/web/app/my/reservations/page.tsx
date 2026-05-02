'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMyReservations, cancelReservation } from '@/lib/api';
import { toast } from '@/lib/toast';
import Spinner from '@/components/Spinner';
import type { Reservation, AudienceCounts } from '@/lib/types';

const AUDIENCE_LABELS: Record<string, string> = {
  ADULT: '성인', TEEN: '청소년', SENIOR: '경로', DISABLED: '장애인', CHILD: '어린이',
};

function formatAudience(counts: AudienceCounts): string {
  const parts = Object.entries(counts)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([k, n]) => `${AUDIENCE_LABELS[k] ?? k} ${n}`);
  const total = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);
  return parts.join(' · ') + ` (${total}명)`;
}

type BadgeInfo = { text: string; cls: string };

function getBadge(r: Reservation): BadgeInfo {
  if (r.status === 'PENDING' && !r.canResumePayment) {
    return { text: '만료됨', cls: 'bg-zinc-800 text-zinc-500 border border-zinc-700' };
  }
  const map: Record<string, BadgeInfo> = {
    PAID:      { text: '결제완료', cls: 'bg-green-900/50 text-green-400 border border-green-800' },
    PENDING:   { text: '대기중',  cls: 'bg-yellow-900/50 text-yellow-400 border border-yellow-800' },
    CANCELLED: { text: '취소됨',  cls: 'bg-zinc-800 text-zinc-500 border border-zinc-700' },
    EXPIRED:   { text: '만료됨',  cls: 'bg-zinc-800 text-zinc-500 border border-zinc-700' },
    FAILED:    { text: '결제실패', cls: 'bg-red-900/50 text-red-400 border border-red-800' },
  };
  return map[r.status] ?? { text: r.status, cls: 'bg-zinc-800 text-zinc-400 border border-zinc-700' };
}

export default function MyReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login?redirect=/my/reservations');
      return;
    }
    getMyReservations(token)
      .then(setReservations)
      .catch(() => {
        localStorage.removeItem('token');
        router.replace('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleCancel(id: number) {
    if (!window.confirm('정말 취소하시겠어요?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setCancellingId(id);
    try {
      await cancelReservation(id, token);
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'CANCELLED', canResumePayment: false } : r)),
      );
      toast('예매가 취소되었습니다.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : '취소에 실패했습니다.', 'error');
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="py-2">
      <h1 className="text-2xl font-bold mb-6">내 예매 내역</h1>

      {reservations.length === 0 ? (
        <div className="text-center py-24 space-y-5">
          <p className="text-zinc-300 text-lg font-medium">아직 예매한 영화가 없어요</p>
          <p className="text-zinc-500 text-sm">마음에 드는 영화를 찾아 예매해보세요.</p>
          <Link
            href="/"
            className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            영화 보러 가기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((r) => {
            const { screening } = r;
            const seats = r.tickets.map((t) => `${t.seat.row}${t.seat.number}`).join(', ');
            const badge = getBadge(r);
            const isCancelling = cancellingId === r.id;
            const effectivePending = r.status === 'PENDING' && r.canResumePayment;

            return (
              <div
                key={r.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
              >
                {/* 카드 헤더 */}
                <div className="flex items-start justify-between px-5 pt-5 pb-3">
                  <div>
                    <h2 className="font-bold text-base leading-tight">{screening.movie.title}</h2>
                    {effectivePending && (
                      <p className="text-xs text-yellow-500 mt-0.5">결제 미완료</p>
                    )}
                    {r.status === 'EXPIRED' && (
                      <p className="text-xs text-zinc-500 mt-0.5">10분 내 결제하지 않아 만료되었습니다</p>
                    )}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ml-3 ${badge.cls}`}>
                    {badge.text}
                  </span>
                </div>

                {/* 카드 내용 */}
                <div className="px-5 pb-4 space-y-1.5 text-sm text-zinc-400">
                  <p>{screening.screen.cinema.name} · {screening.screen.name} · {screening.screenType}</p>
                  <p>
                    {new Date(screening.startTime).toLocaleString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-zinc-300">좌석: {seats}</p>
                  {r.audienceCounts && (
                    <p className="text-zinc-400">관람인원: {formatAudience(r.audienceCounts)}</p>
                  )}
                  <p className="text-red-400 font-semibold text-base pt-0.5">
                    {r.totalAmount.toLocaleString()}원
                  </p>
                </div>

                {/* 액션 버튼 영역 */}
                {(effectivePending || r.status === 'PAID' || r.status === 'FAILED') && (
                  <div className="border-t border-zinc-800 px-5 py-3 flex gap-2 justify-end">
                    {effectivePending && (
                      <>
                        <Link
                          href={`/reservations/${r.id}/payment`}
                          className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                        >
                          결제 계속하기
                        </Link>
                        <button
                          onClick={() => handleCancel(r.id)}
                          disabled={isCancelling}
                          className="text-sm px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
                        >
                          {isCancelling
                            ? <span className="flex items-center gap-1.5"><span className="w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin" />취소 중</span>
                            : '예매 취소'}
                        </button>
                      </>
                    )}
                    {r.status === 'PAID' && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        disabled={isCancelling}
                        className="text-sm px-4 py-2 rounded-lg border border-zinc-700 hover:border-red-600 hover:text-red-400 text-zinc-400 transition-colors disabled:opacity-50"
                      >
                        {isCancelling
                          ? <span className="flex items-center gap-1.5"><span className="w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin" />취소 중</span>
                          : '예매 취소'}
                      </button>
                    )}
                    {r.status === 'FAILED' && (
                      <Link
                        href={`/movies/${r.screening.movieId}`}
                        className="text-sm px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        다시 예매
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
