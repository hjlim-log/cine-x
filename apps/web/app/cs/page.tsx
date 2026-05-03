'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCsNotices, type CsNotice } from '@/lib/api';

const NAV_CARDS = [
  { emoji: '📞', label: '1:1 문의', desc: '궁금한 점을 직접 문의하세요', href: '/cs/inquiry/new' },
  { emoji: '👥', label: '단체관람 신청', desc: '10인 이상 단체 예약·대관', href: '/cs/group/new' },
  { emoji: '🎒', label: '분실물 신고', desc: '영화관에서 잃어버린 물건 신고', href: '/cs/lost-item/new' },
  { emoji: '❓', label: '자주 묻는 질문', desc: '자주 찾는 질문 모음', href: '/cs/faqs' },
];

export default function CsHubPage() {
  const [notices, setNotices] = useState<CsNotice[]>([]);

  useEffect(() => {
    getCsNotices()
      .then((data) => setNotices(data.slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold mb-2">고객센터</h1>
        <p className="text-zinc-400 text-sm">어떤 도움이 필요하신가요?</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-10">
        {NAV_CARDS.map((card) => (
          <Link key={card.href} href={card.href}>
            <div className="bg-zinc-900 border border-zinc-800 hover:border-red-600 rounded-xl p-5 h-full transition-colors group cursor-pointer">
              <div className="text-3xl mb-3">{card.emoji}</div>
              <div className="font-semibold text-sm group-hover:text-red-400 transition-colors">{card.label}</div>
              <div className="text-zinc-500 text-xs mt-1 leading-relaxed">{card.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {notices.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-zinc-300">공지사항</h2>
            <Link href="/cs/notices" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              전체보기 →
            </Link>
          </div>
          <div className="space-y-2">
            {notices.map((n) => (
              <Link key={n.id} href={`/cs/notices/${n.id}`} className="block">
                <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-4 py-3 flex items-center gap-3 transition-colors">
                  {n.isImportant && (
                    <span className="shrink-0 text-xs bg-red-600 text-white px-1.5 py-0.5 rounded font-medium">중요</span>
                  )}
                  <span className="text-sm text-zinc-200 truncate flex-1">{n.title}</span>
                  <span className="shrink-0 text-xs text-zinc-600">
                    {new Date(n.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
