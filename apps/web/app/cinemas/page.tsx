import Link from 'next/link';
import { fetchCinemas } from '@/lib/api';
import type { CinemaListItem } from '@/lib/types';

export default async function CinemasPage() {
  let cinemas: CinemaListItem[] = [];
  try {
    cinemas = await fetchCinemas();
  } catch {
    // API 서버 오류 시 빈 목록
  }

  // 지역별 그룹핑
  const grouped: Record<string, CinemaListItem[]> = {};
  for (const cinema of cinemas) {
    (grouped[cinema.region] ??= []).push(cinema);
  }
  const regions = Object.keys(grouped).sort();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-8">영화관 안내</h1>
      {regions.length === 0 ? (
        <p className="text-zinc-400 text-center py-20">영화관 정보를 불러올 수 없습니다.</p>
      ) : (
        <div className="space-y-10">
          {regions.map((region) => (
            <section key={region}>
              <h2 className="text-lg font-semibold text-red-500 mb-4 pb-2 border-b border-zinc-800">
                {region}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped[region].map((cinema) => (
                  <Link key={cinema.id} href={`/cinemas/${cinema.id}`}>
                    <div className="bg-zinc-900 border border-zinc-800 hover:border-red-600 rounded-xl p-5 transition-colors group">
                      <h3 className="font-bold text-base mb-1 group-hover:text-red-400 transition-colors">
                        시네엑스 {cinema.name}
                      </h3>
                      <p className="text-zinc-400 text-sm mb-3">{cinema.address}</p>
                      <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
                        상영관 {cinema.screenCount}개
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
