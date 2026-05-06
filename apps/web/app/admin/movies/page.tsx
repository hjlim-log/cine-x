'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminListMovies, adminDeleteMovie, type AdminMovie } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminMoviesPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<AdminMovie[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (s?: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminListMovies(s ? { search: s } : undefined);
      setMovies(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search.trim() || undefined);
  };

  const handleDelete = async (movie: AdminMovie) => {
    if (movie._count.screenings > 0) {
      alert(`"${movie.title}"에 상영 스케줄 ${movie._count.screenings}건이 있어 삭제할 수 없습니다.`);
      return;
    }
    if (!confirm(`"${movie.title}"을(를) 삭제하시겠습니까?`)) return;
    try {
      await adminDeleteMovie(movie.id);
      load(search.trim() || undefined);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">영화 관리</h1>
          <p className="text-slate-400 text-sm mt-0.5">총 {movies.length}편</p>
        </div>
        <Button
          onClick={() => router.push('/admin/movies/new')}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          + 영화 추가
        </Button>
      </div>

      {/* 검색 */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="제목 검색..."
          className="max-w-xs bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
        />
        <Button type="submit" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
          검색
        </Button>
        {search && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => { setSearch(''); load(); }}
            className="text-slate-500 hover:text-slate-300"
          >
            초기화
          </Button>
        )}
      </form>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-900/30 text-red-400 text-sm">{error}</div>
      )}

      {/* 테이블 */}
      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 w-16">포스터</TableHead>
              <TableHead className="text-slate-400">제목</TableHead>
              <TableHead className="text-slate-400">장르</TableHead>
              <TableHead className="text-slate-400 text-center">러닝타임</TableHead>
              <TableHead className="text-slate-400 text-center">등급</TableHead>
              <TableHead className="text-slate-400 text-center">개봉일</TableHead>
              <TableHead className="text-slate-400 text-center">상영</TableHead>
              <TableHead className="text-slate-400 text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-12">
                  불러오는 중...
                </TableCell>
              </TableRow>
            ) : movies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-12">
                  영화가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              movies.map((m) => (
                <TableRow
                  key={m.id}
                  className="border-slate-800 hover:bg-slate-800/40 cursor-pointer"
                  onClick={() => router.push(`/admin/movies/${m.id}`)}
                >
                  {/* 포스터 */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Link href={`/admin/movies/${m.id}`}>
                      {m.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.posterUrl}
                          alt={m.title}
                          className="w-10 h-14 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-14 rounded bg-slate-700 flex items-center justify-center text-slate-500 text-xs">
                          없음
                        </div>
                      )}
                    </Link>
                  </TableCell>

                  {/* 제목 */}
                  <TableCell className="font-medium text-white max-w-[200px] truncate">
                    {m.title}
                  </TableCell>

                  {/* 장르 */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {m.genres.slice(0, 2).map((g) => (
                        <Badge
                          key={g.id}
                          variant="secondary"
                          className="text-xs bg-slate-700 text-slate-300 border-0"
                        >
                          {g.genre.name}
                        </Badge>
                      ))}
                      {m.genres.length > 2 && (
                        <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-500 border-0">
                          +{m.genres.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* 러닝타임 */}
                  <TableCell className="text-center text-slate-300 text-sm">
                    {m.runtime}분
                  </TableCell>

                  {/* 등급 */}
                  <TableCell className="text-center">
                    <span className="text-xs text-slate-400">{m.rating}</span>
                  </TableCell>

                  {/* 개봉일 */}
                  <TableCell className="text-center text-slate-400 text-sm">
                    {new Date(m.releaseDate).toLocaleDateString('ko-KR')}
                  </TableCell>

                  {/* 상영 수 */}
                  <TableCell className="text-center">
                    <Badge
                      variant={m._count.screenings > 0 ? 'default' : 'secondary'}
                      className={
                        m._count.screenings > 0
                          ? 'bg-emerald-900/50 text-emerald-400 border-0'
                          : 'bg-slate-700 text-slate-500 border-0'
                      }
                    >
                      {m._count.screenings}건
                    </Badge>
                  </TableCell>

                  {/* 관리 버튼 */}
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex gap-1.5 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/admin/movies/${m.id}`)}
                        className="h-7 px-2 text-xs border-slate-700 text-slate-300 hover:bg-slate-700"
                      >
                        편집
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(m)}
                        className="h-7 px-2 text-xs border-red-900 text-red-400 hover:bg-red-900/30"
                      >
                        삭제
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
