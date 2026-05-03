'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMyApplications, markApplicationRead } from '@/lib/api';
import type { EventApplication } from '@/lib/events';

const TABS = [
  { label: '전체', value: '' },
  { label: '추첨 대기', value: 'PENDING' },
  { label: '당첨', value: 'WON' },
  { label: '낙첨', value: 'LOST' },
];

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  PENDING: { label: '대기 중', className: 'bg-zinc-700 text-zinc-300' },
  WON:     { label: '당첨',    className: 'bg-amber-900/60 text-amber-300' },
  LOST:    { label: '낙첨',    className: 'bg-zinc-800 text-zinc-500' },
};

function ApplicationCard({
  app,
  onRead,
}: {
  app: EventApplication;
  onRead: (id: number) => void;
}) {
  const statusStyle = STATUS_STYLE[app.status];
  const isUnread = app.status === 'WON' && !app.notificationRead;

  return (
    <div
      onClick={() => { if (isUnread) onRead(app.id); }}
      className={`bg-zinc-900 border rounded-xl overflow-hidden transition-colors ${
        isUnread
          ? 'border-amber-700/50 cursor-pointer hover:border-amber-600'
          : 'border-zinc-800'
      }`}
    >
      <div className="flex gap-4 p-4">
        {/* 이벤트 이미지 */}
        <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
          {app.event?.imageUrl ? (
            <Image src={app.event.imageUrl} alt={app.event.title ?? ''} fill className="object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-700" />
          )}
        </div>

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/events/${app.eventId}`}
              className="font-medium text-sm leading-snug hover:text-red-400 transition-colors line-clamp-2"
              onClick={(e) => e.stopPropagation()}
            >
              {app.event?.title ?? '이벤트'}
            </Link>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isUnread && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="새 알림" />
              )}
              {statusStyle && (
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusStyle.className}`}>
                  {statusStyle.label}
                </span>
              )}
            </div>
          </div>
          <p className="text-zinc-500 text-xs mt-1">
            응모일: {app.appliedAt.slice(0, 10).replace(/-/g, '.')}
          </p>
          {app.drawnAt && (
            <p className="text-zinc-600 text-xs">
              추첨일: {app.drawnAt.slice(0, 10).replace(/-/g, '.')}
            </p>
          )}
        </div>
      </div>

      {/* 당첨 경품 정보 */}
      {app.status === 'WON' && app.prize && (
        <div className="px-4 pb-4 pt-3 border-t border-zinc-800">
          <p className="text-amber-400 text-xs font-semibold mb-1.5">🎉 당첨 경품</p>
          <div className="flex items-center justify-between">
            <p className="text-sm text-white font-medium">{app.prize.name}</p>
            {app.prize.type === 'COUPON' ? (
              <Link
                href="/my/coupons"
                className="text-xs bg-amber-900/40 hover:bg-amber-900/70 text-amber-300 px-3 py-1.5 rounded-lg transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                마이쿠폰 확인 →
              </Link>
            ) : (
              <span className="text-xs text-zinc-400 bg-zinc-800 px-3 py-1.5 rounded-lg">
                영화관 방문 수령
              </span>
            )}
          </div>
        </div>
      )}

      {/* 낙첨 안내 */}
      {app.status === 'LOST' && (
        <div className="px-4 pb-3 pt-2 border-t border-zinc-800/50">
          <p className="text-zinc-600 text-xs">이번에는 아쉽게도 낙첨됐습니다. 다른 이벤트를 확인해보세요.</p>
        </div>
      )}
    </div>
  );
}

export default function MyEventsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<EventApplication[]>([]);
  const [tab, setTab] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login?redirect=/my/events'); return; }

    getMyApplications(token)
      .then(setApplications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleRead = async (appId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await markApplicationRead(appId, token);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, notificationRead: true } : a)),
      );
    } catch {}
  };

  const filtered = tab ? applications.filter((a) => a.status === tab) : applications;
  const unreadCount = applications.filter((a) => a.status === 'WON' && !a.notificationRead).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">
          내 응모 내역
          {unreadCount > 0 && (
            <span className="ml-2 text-xs bg-red-600 text-white px-2 py-0.5 rounded-full align-middle">
              {unreadCount}
            </span>
          )}
        </h1>
        <Link href="/events" className="text-sm text-zinc-400 hover:text-red-400 transition-colors">
          이벤트 보기 →
        </Link>
      </div>

      {/* 탭 필터 */}
      <div className="flex gap-1.5 flex-wrap mb-6">
        {TABS.map((t) => {
          const count = t.value
            ? applications.filter((a) => a.status === t.value).length
            : applications.length;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tab === t.value
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {t.label}
              {count > 0 && (
                <span className={`ml-1.5 text-xs ${tab === t.value ? 'text-red-200' : 'text-zinc-500'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-4 animate-pulse">
              <div className="w-20 h-14 bg-zinc-800 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 응모 카드 목록 */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((app) => (
            <ApplicationCard key={app.id} app={app} onRead={handleRead} />
          ))}
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">🎪</p>
          <p className="text-zinc-400 text-sm mb-4">
            {tab ? '해당 상태의 응모 내역이 없습니다.' : '아직 응모한 이벤트가 없습니다.'}
          </p>
          <Link href="/events" className="text-red-400 hover:text-red-300 text-sm transition-colors">
            이벤트 보러 가기 →
          </Link>
        </div>
      )}
    </div>
  );
}
