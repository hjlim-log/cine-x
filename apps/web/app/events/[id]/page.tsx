'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getEvent, applyEvent } from '@/lib/api';
import { toast } from '@/lib/toast';
import {
  CATEGORY_LABEL,
  CATEGORY_BADGE,
  STATUS_BADGE,
  type EventDetail,
  type EventApplication,
  type EventPrize,
} from '@/lib/events';

function formatDate(d: string) {
  return d.slice(0, 10).replace(/-/g, '.');
}

function PrizeCard({ prize }: { prize: EventPrize }) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 flex gap-4 items-start">
      {prize.imageUrl && (
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-zinc-700 flex-shrink-0">
          <Image src={prize.imageUrl} alt={prize.name} fill className="object-cover" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
            prize.type === 'COUPON' ? 'bg-amber-900/60 text-amber-300' : 'bg-zinc-700 text-zinc-300'
          }`}>
            {prize.type === 'COUPON' ? '쿠폰' : '실물'}
          </span>
          <span className="text-zinc-400 text-xs">{prize.quantity.toLocaleString()}명 추첨</span>
        </div>
        <p className="text-sm font-medium text-white leading-snug">{prize.name}</p>
        {prize.coupon?.description && (
          <p className="text-zinc-400 text-xs mt-1">{prize.coupon.description}</p>
        )}
      </div>
    </div>
  );
}

function ApplySection({
  event,
  myApplication,
  token,
  onApplied,
}: {
  event: EventDetail;
  myApplication: EventApplication | null | undefined;
  token: string | null;
  onApplied: (app: EventApplication) => void;
}) {
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!token) return;
    setApplying(true);
    setApplyError(null);
    try {
      const app = await applyEvent(event.id, token);
      onApplied(app);
      toast(`응모 완료! 추첨은 ${formatDate(event.endDate)} 이후 진행됩니다.`, 'success');
    } catch (e: any) {
      const msg = e.message ?? '응모 중 오류가 발생했습니다.';
      setApplyError(msg);
    } finally {
      setApplying(false);
    }
  };

  // 미로그인
  if (!token) {
    return (
      <Link
        href={`/login?redirect=/events/${event.id}`}
        className="block w-full text-center bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors"
      >
        로그인하고 응모하기
      </Link>
    );
  }

  // 안내용 이벤트
  if (!event.isApplicable) {
    return (
      <div className="bg-zinc-800/50 rounded-xl p-4 text-center text-zinc-400 text-sm">
        자동 발급 이벤트로 별도 응모가 필요 없습니다.
      </div>
    );
  }

  // 당첨
  if (myApplication?.status === 'WON') {
    const prize = myApplication.prize;
    return (
      <div className="bg-gradient-to-br from-amber-900/40 to-yellow-900/20 border border-amber-600/40 rounded-xl p-5 space-y-2">
        <p className="text-amber-400 font-bold text-base">🎉 축하합니다! 당첨되셨어요!</p>
        {prize?.type === 'COUPON' ? (
          <p className="text-zinc-300 text-sm leading-relaxed">
            <span className="font-semibold text-white">{prize.name}</span>이 마이쿠폰에 발급되었어요.{' '}
            <Link href="/my/coupons" className="text-amber-400 underline hover:text-amber-300">
              쿠폰 확인하기 →
            </Link>
          </p>
        ) : (
          <p className="text-zinc-300 text-sm leading-relaxed">
            <span className="font-semibold text-white">{prize?.name ?? '경품'}</span>을 영화관 방문 시 수령하실 수 있습니다.
          </p>
        )}
      </div>
    );
  }

  // 낙첨
  if (myApplication?.status === 'LOST') {
    return (
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 space-y-1">
        <p className="text-zinc-300 text-sm font-medium">이번 추첨에서는 당첨되지 못했어요.</p>
        <p className="text-zinc-500 text-sm">다른 이벤트에 도전해보세요!</p>
        <Link href="/events" className="inline-block mt-2 text-red-400 text-sm hover:text-red-300">
          이벤트 목록 보기 →
        </Link>
      </div>
    );
  }

  // 응모 완료 (PENDING)
  if (myApplication?.status === 'PENDING') {
    return (
      <div className="space-y-2">
        <button disabled className="w-full bg-zinc-700 text-zinc-400 font-semibold py-3 rounded-lg cursor-not-allowed">
          응모 완료 ✓
        </button>
        <p className="text-zinc-500 text-xs text-center">
          추첨은 {formatDate(event.endDate)} 이후 진행됩니다.
        </p>
      </div>
    );
  }

  // 이벤트가 진행 중이 아님 (ENDED / DRAWN / UPCOMING)
  if (event.status !== 'ONGOING') {
    return (
      <div className="bg-zinc-800/50 rounded-xl p-4 text-center text-zinc-400 text-sm">
        {event.status === 'DRAWN' ? '추첨이 완료된 이벤트입니다.' : '응모 기간이 아닙니다.'}
      </div>
    );
  }

  // 응모 가능
  return (
    <div className="space-y-2">
      {applyError && (
        <p className="text-red-400 text-sm bg-red-900/20 rounded-lg px-3 py-2">{applyError}</p>
      )}
      <button
        onClick={handleApply}
        disabled={applying}
        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
      >
        {applying ? '응모 중...' : '응모하기'}
      </button>
      <p className="text-zinc-500 text-xs text-center">
        추첨은 {formatDate(event.endDate)} 이후 진행됩니다.
      </p>
    </div>
  );
}

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const [token, setToken] = useState<string | null>(null);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [myApplication, setMyApplication] = useState<EventApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const reload = (t: string | null) => {
    getEvent(Number(params.id), t)
      .then((data) => {
        setEvent(data);
        setMyApplication(data.myApplication ?? null);
      })
      .catch(() => setNotFound(true));
  };

  useEffect(() => {
    const t = localStorage.getItem('token');
    setToken(t);
    getEvent(Number(params.id), t)
      .then((data) => {
        setEvent(data);
        setMyApplication(data.myApplication ?? null);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-4 bg-zinc-800 rounded w-24" />
        <div className="aspect-[3/2] bg-zinc-800 rounded-xl" />
        <div className="h-6 bg-zinc-800 rounded w-2/3" />
        <div className="h-4 bg-zinc-800 rounded w-full" />
        <div className="h-4 bg-zinc-800 rounded w-5/6" />
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-zinc-400 mb-4">이벤트를 찾을 수 없습니다.</p>
        <Link href="/events" className="text-red-400 hover:text-red-300 text-sm">
          ← 이벤트 목록으로
        </Link>
      </div>
    );
  }

  const statusBadge = STATUS_BADGE[event.status];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/events" className="text-zinc-400 hover:text-white text-sm mb-6 inline-block">
        ← 이벤트 목록
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-2">
        {/* 좌측: 이벤트 정보 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 이미지 */}
          <div className="relative aspect-[3/2] rounded-xl overflow-hidden bg-zinc-800">
            {event.imageUrl ? (
              <Image src={event.imageUrl} alt={event.title} fill className="object-cover" priority />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: event.bgColor ?? '#27272a' }}
              >
                <span className="text-white/40 text-sm">{event.title}</span>
              </div>
            )}
          </div>

          {/* 제목 / 메타 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${CATEGORY_BADGE[event.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                {CATEGORY_LABEL[event.category] ?? event.category}
              </span>
              {statusBadge && (
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusBadge.className}`}>
                  {statusBadge.label}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold leading-snug">{event.title}</h1>
            <p className="text-zinc-400 text-sm">
              {formatDate(event.startDate)} ~ {formatDate(event.endDate)}
            </p>
          </div>

          {/* 설명 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>

          {/* 연결된 영화 */}
          {event.movie && (
            <div>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">관련 영화</h2>
              <Link
                href={`/movies/${event.movie.id}`}
                className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-3 transition-colors group"
              >
                {event.movie.posterUrl && (
                  <div className="relative w-10 h-14 rounded overflow-hidden bg-zinc-800 flex-shrink-0">
                    <Image src={event.movie.posterUrl} alt={event.movie.title} fill className="object-cover" />
                  </div>
                )}
                <span className="text-sm font-medium group-hover:text-red-400 transition-colors">
                  {event.movie.title}
                </span>
              </Link>
            </div>
          )}

          {/* 경품 목록 */}
          {event.prizes.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">경품</h2>
              <div className="space-y-3">
                {event.prizes.map((prize) => (
                  <PrizeCard key={prize.id} prize={prize} />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* 우측: 응모 사이드바 */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-sm">응모 정보</h2>
            <div className="text-xs text-zinc-400 space-y-1.5">
              <p>기간: {formatDate(event.startDate)} ~ {formatDate(event.endDate)}</p>
              {event.cinemas.length > 0 && (
                <p>참여 영화관: {event.cinemas.map((c) => `시네엑스 ${c.cinema.name}`).join(', ')}</p>
              )}
            </div>
            <hr className="border-zinc-800" />
            <ApplySection
              event={event}
              myApplication={myApplication}
              token={token}
              onApplied={(app) => setMyApplication(app)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
