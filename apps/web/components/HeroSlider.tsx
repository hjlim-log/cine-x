'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Movie } from '@/lib/types';

const PLACEHOLDER = (title: string) =>
  `https://placehold.co/300x450/27272a/ffffff.png?text=${encodeURIComponent(title)}`;

export default function HeroSlider({ movies }: { movies: Movie[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (movies.length <= 1) return;
    const id = setInterval(() => setCurrent((p) => (p + 1) % movies.length), 5000);
    return () => clearInterval(id);
  }, [movies.length]);

  if (movies.length === 0) return null;

  return (
    <section className="relative w-full h-[520px] md:h-[580px] overflow-hidden bg-zinc-950">
      {/* 블러 배경 — 슬라이드마다 교체 */}
      {movies.map((m, i) => (
        <div
          key={m.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === current ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        >
          <img
            src={m.posterUrl ?? PLACEHOLDER(m.title)}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'blur(48px) brightness(0.22)', transform: 'scale(1.15)' }}
          />
        </div>
      ))}

      {/* 좌→우 그라데이션 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/75 to-zinc-950/10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent pointer-events-none" />

      {/* 슬라이드 컨텐츠 */}
      {movies.map((m, i) => {
        const state =
          i === current
            ? 'opacity-100 translate-x-0'
            : i < current
            ? 'opacity-0 -translate-x-10 pointer-events-none'
            : 'opacity-0 translate-x-10 pointer-events-none';
        return (
          <div
            key={m.id}
            className={`absolute inset-0 flex items-center transition-all duration-700 ${state}`}
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full flex items-center gap-6 md:gap-10">
              {/* 포스터 */}
              <div className="relative w-28 sm:w-36 md:w-48 shrink-0 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <Image
                  src={m.posterUrl ?? PLACEHOLDER(m.title)}
                  alt={m.title}
                  fill
                  className="object-cover"
                  priority={i === 0}
                />
              </div>

              {/* 텍스트 */}
              <div className="flex-1 min-w-0">
                <span className="inline-block text-xs bg-red-600 text-white px-2.5 py-1 rounded font-bold tracking-wider mb-3">
                  예매율 TOP {i + 1}
                </span>
                <h2 className="text-xl sm:text-2xl md:text-4xl font-bold leading-tight mb-2 line-clamp-2">
                  {m.title}
                </h2>
                <div className="flex flex-wrap gap-1.5 text-xs sm:text-sm text-zinc-400 mb-3">
                  <span>{(m.genres ?? []).slice(0, 2).join(' · ') || m.genre}</span>
                  <span>·</span>
                  <span>{m.rating}</span>
                  <span>·</span>
                  <span>{m.runtime}분</span>
                  <span>·</span>
                  <span>{new Date(m.releaseDate).toLocaleDateString('ko-KR')} 개봉</span>
                </div>
                <p className="hidden sm:block text-zinc-300 text-sm leading-relaxed mb-6 max-w-lg line-clamp-3">
                  {m.synopsis}
                </p>
                <Link
                  href={`/movies/${m.id}`}
                  className="inline-block bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
                >
                  예매하기 →
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {/* 인디케이터 */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
        {movies.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`슬라이드 ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === current ? 'w-6 h-2 bg-red-500' : 'w-2 h-2 bg-white/30 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
