'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { events } from '@/lib/events';

const CATEGORIES = ['전체', '회원', '영화', '제휴', '시즌'];

const BADGE_COLOR: Record<string, string> = {
  회원: 'bg-red-900/60 text-red-300',
  영화: 'bg-blue-900/60 text-blue-300',
  제휴: 'bg-green-900/60 text-green-300',
  시즌: 'bg-amber-900/60 text-amber-300',
};

export default function EventsPage() {
  const [selected, setSelected] = useState('전체');

  const filtered = selected === '전체' ? events : events.filter((e) => e.category === selected);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">이벤트</h1>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelected(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selected === cat
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 이벤트 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((event) => (
          <Link key={event.id} href={`/events/${event.id}`}>
            <div className="bg-zinc-900 border border-zinc-800 hover:border-red-600 rounded-xl overflow-hidden transition-colors group">
              <div className="relative aspect-[3/2] bg-zinc-800">
                <Image
                  src={event.image}
                  alt={event.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${BADGE_COLOR[event.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                  {event.category}
                </span>
                <h2 className="font-semibold text-sm mt-2 mb-1 leading-snug group-hover:text-red-400 transition-colors line-clamp-2">
                  {event.title}
                </h2>
                <p className="text-zinc-500 text-xs">{event.period}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-zinc-400 py-16">해당 카테고리의 이벤트가 없습니다.</p>
      )}
    </div>
  );
}
