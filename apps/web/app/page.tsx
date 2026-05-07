import Image from 'next/image';
import Link from 'next/link';
import HeroSlider from '@/components/HeroSlider';
import MovieChart from '@/components/MovieChart';
import { fetchMovies, fetchCinemas, fetchEvents } from '@/lib/api';
import { CATEGORY_LABEL, formatPeriod, type EventItem } from '@/lib/events';
import type { Movie, CinemaListItem } from '@/lib/types';

export default async function HomePage() {
  const [movies, cinemas, ongoingEvents] = await Promise.all([
    fetchMovies().catch((): Movie[] => []),
    fetchCinemas().catch((): CinemaListItem[] => []),
    fetchEvents({ status: 'ONGOING' }).catch((): EventItem[] => []),
  ]);

  const heroMovies = movies.slice(0, 3);
  const chartMovies = movies.slice(0, 10);

  return (
    <>
      {/* ── 1. Hero 슬라이더 ───────────────────────── */}
      <HeroSlider movies={heroMovies} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-16">
        {/* ── 2. 무비차트 TOP 10 ───────────────────── */}
        <section>
          <SectionHeader title="🎬 예매율 TOP 10" href="/movies" />
          <MovieChart movies={chartMovies} />
        </section>

        {/* ── 3. 이벤트 ────────────────────────────── */}
        <section>
          <SectionHeader title="🎉 진행 중인 이벤트" href="/events" />
          {ongoingEvents.length === 0 ? (
            <p className="text-zinc-500 text-sm">진행 중인 이벤트가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ongoingEvents.slice(0, 3).map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} className="group">
                  <div className="bg-zinc-900 border border-zinc-800 hover:border-red-600 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1">
                    <div className="relative aspect-[3/2] bg-zinc-800">
                      {event.imageUrl ? (
                        <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{ backgroundColor: event.bgColor ?? '#27272a' }}
                        />
                      )}
                      <div className="absolute inset-0 bg-zinc-950/0 group-hover:bg-zinc-950/10 transition-colors" />
                    </div>
                    <div className="p-4">
                      <span className="text-xs text-red-400 font-medium">
                        {CATEGORY_LABEL[event.category] ?? event.category}
                      </span>
                      <h3 className="font-semibold text-sm mt-1 mb-1 leading-snug line-clamp-2 group-hover:text-red-400 transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-xs text-zinc-500">{formatPeriod(event.startDate, event.endDate)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── 4. 영화관 찾기 ───────────────────────── */}
        <section>
          <SectionHeader title="📍 영화관 찾기" href="/cinemas" />
          <CinemaFinder cinemas={cinemas} />
        </section>
      </div>

      {/* ── 5. Footer ────────────────────────────── */}
      <footer className="bg-zinc-900 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-10 text-center space-y-2">
          <p className="text-zinc-300 font-semibold text-sm">© 2026 CINE-X Demo</p>
          <p className="text-zinc-600 text-xs">
            이 사이트는 학습용 데모이며 실제 영화관 서비스와 무관합니다.
          </p>
        </div>
      </footer>
    </>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-lg sm:text-xl font-bold">{title}</h2>
      <Link href={href} className="text-sm text-zinc-400 hover:text-red-400 transition-colors">
        전체보기 →
      </Link>
    </div>
  );
}

function CinemaFinder({ cinemas }: { cinemas: CinemaListItem[] }) {
  const grouped: Record<string, CinemaListItem[]> = {};
  for (const c of cinemas) {
    (grouped[c.region] ??= []).push(c);
  }
  const regions = Object.keys(grouped).sort();

  if (regions.length === 0) {
    return <p className="text-zinc-500 text-sm">영화관 정보를 불러올 수 없습니다.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {regions.map((region) => (
        <div key={region} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-red-400 text-xs font-bold mb-3 uppercase tracking-wider">{region}</h3>
          <ul className="space-y-2.5">
            {grouped[region].map((cinema) => (
              <li key={cinema.id}>
                <Link
                  href={`/cinemas/${cinema.id}`}
                  className="flex items-center justify-between text-sm hover:text-red-400 transition-colors group"
                >
                  <span>시네엑스 {cinema.name}</span>
                  <span className="text-zinc-600 text-xs group-hover:text-red-500 transition-colors">
                    {cinema.screenCount}관 →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
