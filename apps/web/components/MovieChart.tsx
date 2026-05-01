'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Movie } from '@/lib/types';

const BOOKING_RATES = [32.5, 18.2, 15.8, 12.4, 9.7, 6.3, 4.1, 3.2, 2.8, 1.4];
const PLACEHOLDER = (t: string) =>
  `https://placehold.co/300x450/27272a/ffffff.png?text=${encodeURIComponent(t)}`;

export default function MovieChart({ movies }: { movies: Movie[] }) {
  const [page, setPage] = useState(0);
  const [ipp, setIpp] = useState(5); // items per page

  useEffect(() => {
    function update() {
      const next = window.innerWidth < 640 ? 2 : 5;
      setIpp((prev) => {
        if (prev !== next) setPage(0); // 화면 크기 바뀌면 첫 페이지로
        return next;
      });
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const totalPages = Math.ceil(movies.length / ipp);
  // 총 너비 = totalPages * 100%, 각 페이지 슬롯 = 100/totalPages %
  // translateX offset: page * (100/totalPages) %
  const translatePct = page * (100 / totalPages);

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className="relative">
      {/* 좌측 화살표 */}
      <button
        onClick={() => setPage((p) => p - 1)}
        disabled={!canPrev}
        aria-label="이전"
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800/80 backdrop-blur-sm border border-zinc-700 transition-all duration-200 -translate-x-4
          ${canPrev ? 'text-white hover:bg-red-600 hover:border-red-600 cursor-pointer' : 'text-zinc-600 cursor-default opacity-0 pointer-events-none'}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* 우측 화살표 */}
      <button
        onClick={() => setPage((p) => p + 1)}
        disabled={!canNext}
        aria-label="다음"
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800/80 backdrop-blur-sm border border-zinc-700 transition-all duration-200 translate-x-4
          ${canNext ? 'text-white hover:bg-red-600 hover:border-red-600 cursor-pointer' : 'text-zinc-600 cursor-default opacity-0 pointer-events-none'}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* 슬라이드 뷰포트 */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            width: `${totalPages * 100}%`,
            transform: `translateX(-${translatePct}%)`,
          }}
        >
          {Array.from({ length: totalPages }).map((_, pi) => (
            <div
              key={pi}
              className="grid gap-3 sm:gap-4"
              style={{
                width: `${100 / totalPages}%`,
                gridTemplateColumns: `repeat(${ipp}, 1fr)`,
              }}
            >
              {movies.slice(pi * ipp, (pi + 1) * ipp).map((movie, i) => {
                const rank = pi * ipp + i + 1;
                return (
                  <Link key={movie.id} href={`/movies/${movie.id}`} className="group">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-2 group-hover:-translate-y-1 transition-transform duration-200">
                      <Image
                        src={movie.posterUrl ?? PLACEHOLDER(movie.title)}
                        alt={movie.title}
                        fill
                        className="object-cover"
                      />
                      {/* 순위 뱃지 */}
                      <div
                        className={`absolute top-0 left-0 px-2 pt-1 pb-1.5 ${
                          rank <= 3 ? 'bg-red-600' : 'bg-zinc-900/80'
                        }`}
                      >
                        <span className="text-xl font-black text-white leading-none">{rank}</span>
                      </div>
                    </div>
                    <h3 className="text-xs sm:text-sm font-medium leading-snug line-clamp-2 group-hover:text-red-400 transition-colors">
                      {movie.title}
                    </h3>
                    <p className="text-xs text-red-500 font-medium mt-0.5">
                      {BOOKING_RATES[rank - 1] ?? 0}%
                    </p>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 페이지 인디케이터 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1.5 mt-5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              aria-label={`${i + 1}페이지`}
              className={`rounded-full transition-all duration-300 ${
                i === page ? 'w-5 h-2 bg-red-500' : 'w-2 h-2 bg-zinc-600 hover:bg-zinc-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
