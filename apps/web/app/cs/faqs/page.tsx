'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getCsFaqs, type CsFaq } from '@/lib/api';

const TABS = [
  { label: '전체',       value: '' },
  { label: '영화관 이용', value: 'CINEMA_USAGE' },
  { label: '스페셜관',   value: 'SPECIAL_HALL' },
  { label: '예매·결제',  value: 'RESERVATION' },
  { label: '멤버십',     value: 'MEMBERSHIP' },
  { label: '기타',       value: 'ETC' },
];

export default function FaqsPage() {
  const [category, setCategory] = useState('');
  const [faqs, setFaqs] = useState<CsFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    setOpenId(null);
    getCsFaqs(category || undefined)
      .then(setFaqs)
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false));
  }, [category]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) => f.title.toLowerCase().includes(q) || f.content.toLowerCase().includes(q),
    );
  }, [faqs, query]);

  function toggle(id: number) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/cs" className="text-zinc-400 hover:text-white transition-colors text-sm">
          ← 고객센터
        </Link>
        <h1 className="text-xl font-bold">자주 묻는 질문</h1>
      </div>

      {/* 검색 */}
      <div className="relative mb-5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="질문 검색..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-2 flex-wrap mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setCategory(tab.value); setQuery(''); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              category === tab.value
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* FAQ 목록 */}
      {loading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-zinc-900 rounded-lg h-14 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-zinc-400 text-sm">
            {query ? `"${query}"에 해당하는 FAQ가 없습니다.` : '해당 카테고리의 FAQ가 없습니다.'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggle(faq.id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="flex items-start gap-3 min-w-0">
                    <span className="shrink-0 text-red-500 font-bold text-sm mt-0.5">Q.</span>
                    <span className="text-sm font-medium leading-relaxed">{faq.title}</span>
                  </span>
                  <svg
                    className={`w-4 h-4 shrink-0 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <div
                  className={`transition-all duration-200 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-4 flex gap-3">
                    <span className="shrink-0 text-zinc-400 font-bold text-sm mt-0.5">A.</span>
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{faq.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
