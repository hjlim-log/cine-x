import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchMovie } from '@/lib/api';
import type { MovieDetail, Person } from '@/lib/types';
import TrailerSection from '@/components/TrailerSection';

export default async function MoviePage({ params }: { params: { id: string } }) {
  const movie: MovieDetail | null = await fetchMovie(Number(params.id)).catch(() => null);
  if (!movie) notFound();

  const byDate: Record<string, typeof movie.screenings> = {};
  for (const s of movie.screenings) {
    const dateKey = new Date(s.startTime).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
    (byDate[dateKey] ??= []).push(s);
  }

  const castPreview = movie.cast.slice(0, 3).map((c) => c.name).join(' · ');
  const castExtra = movie.cast.length > 3 ? ` 외 ${movie.cast.length - 3}명` : '';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* 영화 헤더 */}
      <div className="flex gap-6 mb-10">
        <div className="relative w-40 md:w-52 shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800">
          <Image
            src={
              movie.posterUrl ??
              `https://placehold.co/300x450/27272a/ffffff.png?text=${encodeURIComponent(movie.title)}`
            }
            alt={movie.title}
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="flex-1">
          {/* 장르 태그 */}
          {movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {movie.genres.map((g) => (
                <span key={g} className="text-xs bg-red-950/60 text-red-400 border border-red-900/50 px-2 py-0.5 rounded">
                  {g}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-2xl md:text-3xl font-bold mb-3">{movie.title}</h1>
          <div className="flex flex-wrap gap-2 text-sm text-zinc-400 mb-4">
            <span className="bg-zinc-800 px-2 py-0.5 rounded">{movie.rating}</span>
            <span className="bg-zinc-800 px-2 py-0.5 rounded">{movie.runtime}분</span>
            <span className="bg-zinc-800 px-2 py-0.5 rounded">
              {new Date(movie.releaseDate).toLocaleDateString('ko-KR')} 개봉
            </span>
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed mb-4">{movie.synopsis}</p>
          {/* 감독 */}
          {movie.director && (
            <p className="text-sm text-zinc-400 mb-1">
              <span className="text-zinc-500">감독</span>
              {' '}
              <span className="text-zinc-200">{movie.director.name}</span>
              {movie.director.originalName && (
                <span className="text-zinc-500 ml-1.5 text-xs">{movie.director.originalName}</span>
              )}
            </p>
          )}
          {/* 출연 */}
          {movie.cast.length > 0 && (
            <p className="text-sm text-zinc-400">
              <span className="text-zinc-500">출연</span>
              {' '}
              <span className="text-zinc-200">{castPreview}</span>
              {castExtra && <span className="text-zinc-500">{castExtra}</span>}
            </p>
          )}
        </div>
      </div>

      {/* 예고편 */}
      {movie.trailer && <TrailerSection url={movie.trailer.url} />}

      {/* 출연진 */}
      {movie.cast.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 border-b border-zinc-800 pb-2">출연진</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {movie.cast.map((person) => (
              <CastCard key={person.id} person={person} />
            ))}
          </div>
        </section>
      )}

      {/* 스틸컷 */}
      {movie.stills.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 border-b border-zinc-800 pb-2">스틸컷</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {movie.stills.map((s, i) => (
              <div key={i} className="relative shrink-0 w-60 aspect-video rounded-lg overflow-hidden bg-zinc-800">
                <Image src={s.url} alt={`스틸컷 ${i + 1}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 상영 시간표 */}
      <h2 className="text-xl font-bold mb-4 border-b border-zinc-800 pb-2">상영 시간표</h2>
      {Object.keys(byDate).length === 0 ? (
        <p className="text-zinc-400">예정된 상영이 없습니다.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(byDate).map(([date, screenings]) => (
            <div key={date}>
              <h3 className="text-sm text-zinc-400 font-medium mb-2">{date}</h3>
              <div className="flex flex-wrap gap-2">
                {screenings.map((s) => (
                  <Link
                    key={s.id}
                    href={`/screenings/${s.id}`}
                    className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-red-600 rounded-lg px-4 py-3 text-sm transition-colors"
                  >
                    <div className="font-semibold">
                      {new Date(s.startTime).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="text-zinc-400 text-xs mt-1 flex items-center gap-1 flex-wrap">
                      <span>{s.screen.cinema.name} · {s.screen.name}</span>
                      {s.screen.type && (
                        <span className={`px-1.5 py-0.5 rounded ${
                          s.screen.type.grade === '스페셜관'
                            ? 'bg-yellow-900/60 text-yellow-400 border border-yellow-700'
                            : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {s.screen.type.name}
                        </span>
                      )}
                      <span>· {s.screenType}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CastCard({ person }: { person: Person & { order: number } }) {
  return (
    <div className="shrink-0 w-24 text-center group cursor-default">
      <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden bg-zinc-800 mb-2 ring-2 ring-zinc-700 group-hover:ring-red-600 group-hover:scale-105 transition-all duration-200">
        <Image
          src={person.profileUrl ?? 'https://placehold.co/100x100/27272a/71717a?text=No+Image'}
          alt={person.name}
          fill
          className="object-cover"
        />
      </div>
      <p className="text-xs font-medium text-zinc-200 leading-tight">{person.name}</p>
      {person.originalName && (
        <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{person.originalName}</p>
      )}
    </div>
  );
}
