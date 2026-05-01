import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchCinema } from '@/lib/api';
import type { CinemaDetail, CinemaScreening, Movie } from '@/lib/types';

export default async function CinemaDetailPage({ params }: { params: { id: string } }) {
  const cinema: CinemaDetail | null = await fetchCinema(Number(params.id)).catch(() => null);
  if (!cinema) notFound();

  // 영화별로 상영 묶기
  const movieMap = new Map<number, { movie: Movie; screenings: CinemaScreening[] }>();
  for (const screening of cinema.screenings) {
    const entry = movieMap.get(screening.movie.id);
    if (entry) {
      entry.screenings.push(screening);
    } else {
      movieMap.set(screening.movie.id, { movie: screening.movie, screenings: [screening] });
    }
  }
  const movieEntries = Array.from(movieMap.values());

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* 상단 헤더 */}
      <div className="mb-8">
        <p className="text-red-500 text-sm mb-1">영화관</p>
        <h1 className="text-2xl font-bold mb-1">시네엑스 {cinema.name}</h1>
        <p className="text-zinc-400 text-sm">{cinema.address}</p>
        <div className="flex gap-2 mt-3">
          {cinema.screens.map((s) => (
            <span key={s.id} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
              {s.name} ({s.totalSeats}석)
            </span>
          ))}
        </div>
      </div>

      {/* 상영 시간표 */}
      <h2 className="text-lg font-semibold mb-5">상영 시간표</h2>
      {movieEntries.length === 0 ? (
        <p className="text-zinc-400 text-center py-16">현재 상영 중인 영화가 없습니다.</p>
      ) : (
        <div className="space-y-6">
          {movieEntries.map(({ movie, screenings }) => (
            <div key={movie.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex gap-4">
                {/* 포스터 */}
                <div className="relative w-16 shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800">
                  <Image
                    src={
                      movie.posterUrl ??
                      `https://placehold.co/300x450/27272a/ffffff.png?text=${encodeURIComponent(movie.title)}`
                    }
                    alt={movie.title}
                    fill
                    className="object-cover"
                  />
                </div>
                {/* 영화 정보 + 시간 버튼 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-sm leading-snug">{movie.title}</h3>
                    <span className="text-xs text-zinc-500">{(movie.genres ?? []).slice(0, 2).join(' · ') || movie.genre}</span>
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                      {movie.rating}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-xs mb-3">{movie.runtime}분</p>
                  <div className="flex flex-wrap gap-2">
                    {screenings.map((s) => (
                      <Link key={s.id} href={`/screenings/${s.id}`}>
                        <div className="border border-zinc-700 hover:border-red-500 rounded-lg px-3 py-2 text-center transition-colors group">
                          <p className="text-sm font-medium group-hover:text-red-400 transition-colors">
                            {new Date(s.startTime).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">{s.screen.name} · {s.screenType}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
