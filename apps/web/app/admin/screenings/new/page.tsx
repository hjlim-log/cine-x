'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  adminListMovies,
  adminGetCinemasWithScreens,
  adminCreateScreening,
  type AdminMovie,
  type CinemaWithScreens,
} from '@/lib/admin-api';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminScreeningNewPage() {
  const router = useRouter();

  const [movies, setMovies] = useState<AdminMovie[]>([]);
  const [cinemas, setCinemas] = useState<CinemaWithScreens[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [movieId, setMovieId] = useState('');
  const [cinemaId, setCinemaId] = useState('');
  const [screenId, setScreenId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [screenType, setScreenType] = useState<'2D' | '3D'>('2D');

  const selectedMovie = movies.find((m) => m.id === Number(movieId));
  const selectedCinema = cinemas.find((c) => c.id === Number(cinemaId));
  const screens = selectedCinema?.screens ?? [];

  // 종료 시간 자동 계산
  const endTimePreview = (() => {
    if (!selectedMovie || !startTime) return null;
    const start = new Date(startTime);
    if (isNaN(start.getTime())) return null;
    const end = new Date(start.getTime() + selectedMovie.runtime * 60 * 1000);
    return { time: format(end, 'HH:mm'), runtime: selectedMovie.runtime };
  })();

  useEffect(() => {
    Promise.all([adminListMovies(), adminGetCinemasWithScreens()])
      .then(([m, c]) => { setMovies(m); setCinemas(c); })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const handleCinemaChange = (val: string) => {
    setCinemaId(val);
    setScreenId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieId || !screenId || !startTime) {
      setError('영화, 상영관, 시작 일시를 모두 입력해주세요.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await adminCreateScreening({
        movieId: Number(movieId),
        screenId: Number(screenId),
        startTime: new Date(startTime).toISOString(),
        screenType,
      });
      toast('상영이 등록되었습니다.', 'success');
      router.push('/admin/screenings');
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('409') || msg.toLowerCase().includes('conflict') || msg.includes('겹치')) {
        setError('선택한 시간에 다른 상영이 있습니다. (시간 충돌)');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/screenings">
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-400 hover:bg-slate-800">
            ← 돌아가기
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">단건 등록</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 영화 */}
        <div className="space-y-1.5">
          <Label className="text-slate-300">영화</Label>
          <Select value={movieId} onValueChange={setMovieId}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
              <SelectValue placeholder="영화를 선택하세요" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 max-h-64">
              {movies.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.title} ({m.runtime}분)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 영화관 */}
        <div className="space-y-1.5">
          <Label className="text-slate-300">영화관</Label>
          <Select value={cinemaId} onValueChange={handleCinemaChange}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
              <SelectValue placeholder="영화관을 선택하세요" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 max-h-64">
              {cinemas.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 상영관 */}
        <div className="space-y-1.5">
          <Label className="text-slate-300">상영관</Label>
          <Select
            value={screenId}
            onValueChange={setScreenId}
            disabled={!cinemaId}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 disabled:opacity-40">
              <SelectValue placeholder={cinemaId ? '상영관을 선택하세요' : '영화관을 먼저 선택하세요'} />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
              {screens.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name} ({s.screenType.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 상영 일시 */}
        <div className="space-y-1.5">
          <Label className="text-slate-300">상영 일시</Label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-slate-700 bg-slate-800 text-slate-200 text-sm
                       focus:outline-none focus:ring-2 focus:ring-slate-500
                       [color-scheme:dark]"
          />
          {endTimePreview && (
            <p className="text-sm text-slate-400">
              종료 시간:{' '}
              <span className="text-slate-200 font-medium">{endTimePreview.time}</span>
              {' '}(러닝타임 {endTimePreview.runtime}분)
            </p>
          )}
        </div>

        {/* 포맷 */}
        <div className="space-y-1.5">
          <Label className="text-slate-300">포맷</Label>
          <div className="flex gap-4">
            {(['2D', '3D'] as const).map((fmt) => (
              <label key={fmt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="screenType"
                  value={fmt}
                  checked={screenType === fmt}
                  onChange={() => setScreenType(fmt)}
                  className="accent-red-600 w-4 h-4"
                />
                <span className="text-slate-200 text-sm">{fmt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="p-3 rounded-md bg-red-900/30 border border-red-800 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 제출 */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={submitting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {submitting ? '등록 중...' : '저장'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/screenings')}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}
