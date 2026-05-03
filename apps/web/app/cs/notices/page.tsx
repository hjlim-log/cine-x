'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCsNotices, fetchCinemas, type CsNotice } from '@/lib/api';
import type { CinemaListItem } from '@/lib/types';

export default function NoticesPage() {
  const [cinemas, setCinemas] = useState<CinemaListItem[]>([]);
  const [cinemaId, setCinemaId] = useState<number | undefined>(undefined);
  const [notices, setNotices] = useState<CsNotice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCinemas().then(setCinemas).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getCsNotices(cinemaId)
      .then(setNotices)
      .catch(() => setNotices([]))
      .finally(() => setLoading(false));
  }, [cinemaId]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/cs" className="text-zinc-400 hover:text-white transition-colors text-sm">
          ← 고객센터
        </Link>
        <h1 className="text-xl font-bold">공지사항</h1>
      </div>

      {/* 영화관 필터 */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setCinemaId(undefined)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            cinemaId === undefined
              ? 'bg-red-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
          }`}
        >
          전체
        </button>
        {cinemas.map((c) => (
          <button
            key={c.id}
            onClick={() => setCinemaId(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              cinemaId === c.id
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-zinc-900 rounded-lg h-16 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && notices.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-zinc-400 text-sm">공지사항이 없습니다.</p>
        </div>
      )}

      {!loading && notices.length > 0 && (
        <div className="space-y-2">
          {notices.map((n) => (
            <Link key={n.id} href={`/cs/notices/${n.id}`} className="block">
              <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-4 py-3.5 flex items-center gap-3 transition-colors group">
                {n.isImportant && (
                  <span className="shrink-0 text-xs bg-red-600 text-white px-1.5 py-0.5 rounded font-medium">
                    중요
                  </span>
                )}
                {n.cinema && (
                  <span className="shrink-0 text-xs bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">
                    {n.cinema.name}
                  </span>
                )}
                <span className="text-sm text-zinc-200 group-hover:text-white transition-colors truncate flex-1">
                  {n.title}
                </span>
                <span className="shrink-0 text-xs text-zinc-600">
                  {new Date(n.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric', month: 'numeric', day: 'numeric',
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
