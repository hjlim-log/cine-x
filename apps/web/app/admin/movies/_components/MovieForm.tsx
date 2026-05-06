'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MovieFormData } from '@/lib/admin-api';

const RATINGS = ['전체관람가', '12세이상관람가', '15세이상관람가', '청소년관람불가'];

const ALL_GENRES = [
  '액션', '드라마', '코미디', 'SF', '공포', '로맨스',
  '애니메이션', '다큐멘터리', '스릴러', '판타지', '미스터리',
  '가족', '음악', '전쟁',
];

type Props = {
  initialData?: Partial<MovieFormData>;
  onSubmit: (data: MovieFormData) => Promise<void>;
  submitLabel: string;
  title: string;
};

export default function MovieForm({ initialData, onSubmit, submitLabel, title }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<MovieFormData>({
    title: initialData?.title ?? '',
    runtime: initialData?.runtime ?? 90,
    rating: initialData?.rating ?? '전체관람가',
    synopsis: initialData?.synopsis ?? '',
    posterUrl: initialData?.posterUrl ?? '',
    releaseDate: initialData?.releaseDate
      ? initialData.releaseDate.slice(0, 10)
      : '',
    genres: initialData?.genres ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleGenre = (genre: string) => {
    setForm((f) => ({
      ...f,
      genres: f.genres.includes(genre)
        ? f.genres.filter((g) => g !== genre)
        : [...f.genres, genre],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.genres.length === 0) { setError('장르를 1개 이상 선택하세요.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        ...form,
        posterUrl: form.posterUrl?.trim() || undefined,
      });
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/movies')}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {saving ? '저장 중...' : submitLabel}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded bg-red-900/30 text-red-400 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽 열 */}
        <div className="space-y-5">
          <div>
            <Label className="text-slate-300 mb-1.5 block">제목 *</Label>
            <Input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="영화 제목"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300 mb-1.5 block">러닝타임(분) *</Label>
              <Input
                required
                type="number"
                min={1}
                max={500}
                value={form.runtime}
                onChange={(e) => setForm((f) => ({ ...f, runtime: Number(e.target.value) }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300 mb-1.5 block">관람등급 *</Label>
              <Select
                value={form.rating}
                onValueChange={(v) => setForm((f) => ({ ...f, rating: v }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {RATINGS.map((r) => (
                    <SelectItem key={r} value={r} className="text-white hover:bg-slate-700">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-slate-300 mb-1.5 block">개봉일 *</Label>
            <Input
              required
              type="date"
              value={form.releaseDate}
              onChange={(e) => setForm((f) => ({ ...f, releaseDate: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div>
            <Label className="text-slate-300 mb-1.5 block">포스터 URL</Label>
            <Input
              value={form.posterUrl}
              onChange={(e) => setForm((f) => ({ ...f, posterUrl: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="https://..."
            />
            {form.posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.posterUrl}
                alt="preview"
                className="mt-2 h-32 object-contain rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
          </div>
        </div>

        {/* 오른쪽 열 */}
        <div className="space-y-5">
          <div>
            <Label className="text-slate-300 mb-1.5 block">
              장르 * <span className="text-slate-500 text-xs ml-1">({form.genres.length}개 선택됨)</span>
            </Label>
            <div className="flex flex-wrap gap-2 p-3 rounded-md bg-slate-800 border border-slate-700 min-h-[80px]">
              {ALL_GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGenre(g)}
                  className={[
                    'px-3 py-1 rounded-full text-sm transition-colors',
                    form.genres.includes(g)
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
                  ].join(' ')}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-slate-300 mb-1.5 block">줄거리 *</Label>
            <Textarea
              required
              value={form.synopsis}
              onChange={(e) => setForm((f) => ({ ...f, synopsis: e.target.value }))}
              className="bg-slate-800 border-slate-700 text-white min-h-[180px] resize-none"
              placeholder="영화 줄거리를 입력하세요..."
            />
          </div>
        </div>
      </div>
    </form>
  );
}
