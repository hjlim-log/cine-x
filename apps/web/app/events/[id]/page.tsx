'use client';

import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { events } from '@/lib/events';

const BADGE_COLOR: Record<string, string> = {
  회원: 'bg-red-900/60 text-red-300',
  영화: 'bg-blue-900/60 text-blue-300',
  제휴: 'bg-green-900/60 text-green-300',
  시즌: 'bg-amber-900/60 text-amber-300',
};

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const event = events.find((e) => e.id === Number(params.id));
  if (!event) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 뒤로가기 */}
      <Link href="/events" className="text-zinc-400 hover:text-white text-sm mb-6 inline-block">
        ← 이벤트 목록
      </Link>

      {/* 이미지 */}
      <div className="relative aspect-[3/2] rounded-xl overflow-hidden bg-zinc-800 mb-6">
        <Image src={event.image} alt={event.title} fill className="object-cover" priority />
      </div>

      {/* 내용 */}
      <div className="space-y-3 mb-8">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${BADGE_COLOR[event.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
          {event.category}
        </span>
        <h1 className="text-xl font-bold leading-snug">{event.title}</h1>
        <p className="text-zinc-400 text-sm">기간: {event.period}</p>
        <p className="text-zinc-300 text-sm leading-relaxed">{event.description}</p>
      </div>

      {/* 응모 버튼 */}
      <button
        onClick={() => alert('준비 중입니다.')}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors"
      >
        응모하기
      </button>
    </div>
  );
}
