'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getEvents } from '@/lib/api';
import {
  CATEGORY_LABEL,
  CATEGORY_BADGE,
  STATUS_BADGE,
  formatPeriod,
  type EventItem,
} from '@/lib/events';

const CATEGORIES = [
  { label: '전체', value: '' },
  { label: '영화', value: 'MOVIE' },
  { label: '멤버십', value: 'MEMBERSHIP' },
  { label: '제휴', value: 'PARTNER' },
  { label: '시즌', value: 'SEASONAL' },
  { label: '시사회', value: 'PREVIEW' },
];

export default function EventsPage() {
  const [category, setCategory] = useState('');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getEvents(category ? { category } : undefined)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">이벤트</h1>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat.value
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 로딩 스켈레톤 */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-zinc-900 rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-[3/2] bg-zinc-800" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-zinc-800 rounded w-16" />
                <div className="h-4 bg-zinc-800 rounded w-full" />
                <div className="h-3 bg-zinc-800 rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 이벤트 그리드 */}
      {!loading && events.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event) => {
            const statusBadge = STATUS_BADGE[event.status];
            return (
              <Link key={event.id} href={`/events/${event.id}`}>
                <div className="bg-zinc-900 border border-zinc-800 hover:border-red-600 rounded-xl overflow-hidden transition-colors group h-full">
                  <div className="relative aspect-[3/2] bg-zinc-800">
                    {event.imageUrl ? (
                      <Image
                        src={event.imageUrl}
                        alt={event.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: event.bgColor ?? '#27272a' }}
                      >
                        <span className="text-white/60 text-xs">{event.title}</span>
                      </div>
                    )}
                    {/* 상태 뱃지 */}
                    {statusBadge && (
                      <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded font-medium ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${CATEGORY_BADGE[event.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                      {CATEGORY_LABEL[event.category] ?? event.category}
                    </span>
                    <h2 className="font-semibold text-sm mt-2 mb-1 leading-snug group-hover:text-red-400 transition-colors line-clamp-2">
                      {event.title}
                    </h2>
                    <p className="text-zinc-500 text-xs">{formatPeriod(event.startDate, event.endDate)}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && events.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🎪</p>
          <p className="text-zinc-400 text-sm">해당 카테고리의 이벤트가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
