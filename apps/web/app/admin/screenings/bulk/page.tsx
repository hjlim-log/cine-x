'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  adminListMovies,
  adminGetCinemasWithScreens,
  adminBulkCreateScreenings,
  type AdminMovie,
  type CinemaWithScreens,
  type BulkCreateResult,
} from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PRESET_SLOTS = ['09:00', '11:30', '14:00', '16:30', '19:00', '21:30'];
const PATTERN_LABELS = { DAILY: '매일', WEEKDAY: '평일만', WEEKEND: '주말만' } as const;

function countDays(startDate: string, endDate: string, pattern: 'DAILY' | 'WEEKDAY' | 'WEEKEND') {
  if (!startDate || !endDate) return { matching: 0, weekdays: 0, weekends: 0 };
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return { matching: 0, weekdays: 0, weekends: 0 };
  let weekdays = 0, weekends = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const d = cur.getDay();
    if (d === 0 || d === 6) weekends++; else weekdays++;
    cur.setDate(cur.getDate() + 1);
  }
  const matching = pattern === 'DAILY' ? weekdays + weekends : pattern === 'WEEKDAY' ? weekdays : weekends;
  return { matching, weekdays, weekends };
}

export default function AdminScreeningBulkPage() {
  const router = useRouter();

  const [movies, setMovies] = useState<AdminMovie[]>([]);
  const [cinemas, setCinemas] = useState<CinemaWithScreens[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BulkCreateResult | null>(null);

  const [movieId, setMovieId] = useState('');
  const [cinemaId, setCinemaId] = useState('');
  const [screenId, setScreenId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pattern, setPattern] = useState<'DAILY' | 'WEEKDAY' | 'WEEKEND'>('DAILY');
  const [checkedSlots, setCheckedSlots] = useState<Set<string>>(new Set());
  const [customSlot, setCustomSlot] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [screenType, setScreenType] = useState<'2D' | '3D'>('2D');

  const selectedMovie = movies.find((m) => m.id === Number(movieId));
  const selectedCinema = cinemas.find((c) => c.id === Number(cinemaId));
  const screens = selectedCinema?.screens ?? [];

  const activeSlots = useMemo(() => {
    const slots = new Set(checkedSlots);
    if (useCustom && customSlot.match(/^\d{2}:\d{2}$/)) slots.add(customSlot);
    return Array.from(slots).sort();
  }, [checkedSlots, useCustom, customSlot]);

  const preview = useMemo(() => {
    if (!startDate || !endDate || activeSlots.length === 0) return null;
    const { matching, weekdays, weekends } = countDays(startDate, endDate, pattern);
    const total = matching * activeSlots.length;
    return { total, matching, weekdays, weekends };
  }, [startDate, endDate, pattern, activeSlots]);

  const previewText = useMemo(() => {
    if (!preview || !startDate || !endDate) return null;
    const sd = format(new Date(startDate), 'M월 d일', { locale: ko });
    const ed = format(new Date(endDate), 'M월 d일', { locale: ko });
    const detail =
      pattern === 'DAILY'
        ? `매일 ${preview.matching}일 × ${activeSlots.length}개`
        : pattern === 'WEEKDAY'
        ? `평일 ${preview.weekdays}일 × ${activeSlots.length}개`
        : `주말 ${preview.weekends}일 × ${activeSlots.length}개`;
    return `등록 예정: ${preview.total}건 (${sd} ~ ${ed}, ${detail})`;
  }, [preview, startDate, endDate, pattern, activeSlots.length]);

  useEffect(() => {
    Promise.all([adminListMovies(), adminGetCinemasWithScreens()])
      .then(([m, c]) => { setMovies(m); setCinemas(c); })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const toggleSlot = (slot: string) => {
    setCheckedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot); else next.add(slot);
      return next;
    });
  };

  const handleCinemaChange = (val: string) => {
    setCinemaId(val);
    setScreenId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieId || !screenId || !startDate || !endDate || activeSlots.length === 0) {
      setError('영화, 상영관, 날짜, 시간대를 모두 입력해주세요.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('종료일이 시작일보다 빠릅니다.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await adminBulkCreateScreenings({
        movieId: Number(movieId),
        screenId: Number(screenId),
        screenType,
        startDate,
        endDate,
        repeatPattern: pattern,
        timeSlots: activeSlots,
      });
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
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
    <div className="max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/screenings">
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-400 hover:bg-slate-800">
            ← 돌아가기
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">일괄 등록</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 영화 / 영화관 / 상영관 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-slate-300">영화</Label>
            <Select value={movieId} onValueChange={setMovieId}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                <SelectValue placeholder="영화 선택" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 max-h-60">
                {movies.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.title} ({m.runtime}분)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">영화관</Label>
            <Select value={cinemaId} onValueChange={handleCinemaChange}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                <SelectValue placeholder="영화관 선택" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 max-h-60">
                {cinemas.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">상영관</Label>
            <Select value={screenId} onValueChange={setScreenId} disabled={!cinemaId}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 disabled:opacity-40">
                <SelectValue placeholder={cinemaId ? '상영관 선택' : '영화관 먼저'} />
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
        </div>

        {/* 날짜 범위 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-slate-300">시작일</Label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-700 bg-slate-800 text-slate-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-slate-500 [color-scheme:dark]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300">종료일</Label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-700 bg-slate-800 text-slate-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-slate-500 [color-scheme:dark]"
            />
          </div>
        </div>

        {/* 반복 패턴 */}
        <div className="space-y-1.5">
          <Label className="text-slate-300">반복 패턴</Label>
          <div className="flex gap-5">
            {(['DAILY', 'WEEKDAY', 'WEEKEND'] as const).map((p) => (
              <label key={p} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="pattern"
                  value={p}
                  checked={pattern === p}
                  onChange={() => setPattern(p)}
                  className="accent-red-600 w-4 h-4"
                />
                <span className="text-slate-200 text-sm">{PATTERN_LABELS[p]}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 시간대 */}
        <div className="space-y-2">
          <Label className="text-slate-300">시간대</Label>
          <div className="p-4 rounded-lg border border-slate-700 bg-slate-800/50 space-y-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {PRESET_SLOTS.map((slot) => (
                <label
                  key={slot}
                  className={[
                    'flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm cursor-pointer border transition-colors',
                    checkedSlots.has(slot)
                      ? 'border-red-600 bg-red-600/20 text-red-400'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={checkedSlots.has(slot)}
                    onChange={() => toggleSlot(slot)}
                    className="sr-only"
                  />
                  {slot}
                </label>
              ))}
            </div>

            {/* 직접 입력 */}
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustom}
                  onChange={(e) => setUseCustom(e.target.checked)}
                  className="accent-red-600 w-4 h-4"
                />
                <span className="text-slate-400 text-sm">직접 입력</span>
              </label>
              {useCustom && (
                <input
                  type="time"
                  value={customSlot}
                  onChange={(e) => setCustomSlot(e.target.value)}
                  className="h-8 px-2 rounded border border-slate-700 bg-slate-800 text-slate-200 text-sm
                             focus:outline-none focus:ring-1 focus:ring-slate-500 [color-scheme:dark]"
                />
              )}
            </div>

            {activeSlots.length > 0 && (
              <p className="text-xs text-slate-500">
                선택된 시간대: {activeSlots.join(', ')}
              </p>
            )}
          </div>
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

        {/* 실시간 미리보기 */}
        {previewText && (
          <div className="p-3 rounded-lg border border-slate-600 bg-slate-800/60 text-slate-300 text-sm">
            📅 {previewText}
          </div>
        )}

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
            disabled={submitting || activeSlots.length === 0}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {submitting ? '등록 중...' : '등록'}
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

      {/* 결과 모달 */}
      <Dialog open={!!result} onOpenChange={(open) => { if (!open) setResult(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">등록 완료</DialogTitle>
          </DialogHeader>
          {result && (
            <div className="space-y-4">
              {/* 요약 */}
              <div className="p-4 rounded-lg border border-slate-700 bg-slate-800 space-y-2">
                {result.created > 0 ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <span>✓</span>
                    <span>{result.total}건 중 {result.created}건 등록 완료</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-400 font-medium">
                    <span>⚠</span>
                    <span>등록된 상영이 없습니다 — 전체 {result.total}건 충돌</span>
                  </div>
                )}
                {result.skipped > 0 && result.created > 0 && (
                  <div className="flex items-center gap-2 text-yellow-400 text-sm">
                    <span>⚠</span>
                    <span>{result.skipped}건 스킵 (시간 충돌)</span>
                  </div>
                )}
              </div>

              {/* 스킵 상세 */}
              {result.skippedDetails.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 font-medium">스킵된 시간:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {result.skippedDetails.map((d, i) => (
                      <div key={i} className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="text-yellow-600">-</span>
                        <span>
                          {format(new Date(d.startTime), 'M월 d일 HH:mm', { locale: ko })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => router.push('/admin/screenings')}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                캘린더로 돌아가기
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
