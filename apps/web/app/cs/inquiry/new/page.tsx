'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCinemas, createOneOnOneInquiry } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { CinemaListItem } from '@/lib/types';

const CATEGORIES = [
  { value: 'CINEMA',      label: '영화관 이용' },
  { value: 'MEMBERSHIP',  label: '멤버십/회원정보' },
  { value: 'RESERVATION', label: '예매/결제' },
  { value: 'EVENT',       label: '이벤트' },
  { value: 'OTHER',       label: '기타' },
];

export default function OneOnOneNewPage() {
  const router = useRouter();
  const [cinemas, setCinemas] = useState<CinemaListItem[]>([]);
  const [form, setForm] = useState({ category: '', cinemaId: '', title: '', content: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login?redirect=/cs/inquiry/new'); return; }
    fetchCinemas().then(setCinemas).catch(() => {});
  }, [router]);

  function update(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.category) e.category = '분류를 선택해주세요.';
    if (!form.title.trim()) e.title = '제목을 입력해주세요.';
    else if (form.title.length > 50) e.title = '제목은 50자 이내로 입력해주세요.';
    if (!form.content.trim()) e.content = '내용을 입력해주세요.';
    else if (form.content.length > 1000) e.content = '내용은 1000자 이내로 입력해주세요.';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login?redirect=/cs/inquiry/new'); return; }
    setLoading(true);
    try {
      await createOneOnOneInquiry(
        {
          category: form.category,
          title: form.title.trim(),
          content: form.content.trim(),
          ...(form.cinemaId ? { cinemaId: Number(form.cinemaId) } : {}),
        },
        token,
      );
      toast('문의가 접수되었습니다.', 'success');
      router.push('/my/inquiries');
    } catch (err) {
      toast(err instanceof Error ? err.message : '문의 접수에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white transition-colors text-sm">
          ← 뒤로
        </button>
        <h1 className="text-xl font-bold">1:1 문의</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">
            분류 <span className="text-red-500">*</span>
          </label>
          <select
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
          >
            <option value="">선택해주세요</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">영화관 (선택)</label>
          <select
            value={form.cinemaId}
            onChange={(e) => update('cinemaId', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
          >
            <option value="">전체 (영화관 무관)</option>
            {cinemas.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            maxLength={50}
            placeholder="문의 제목을 입력해주세요"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
          />
          <div className="flex justify-between mt-1">
            {errors.title ? <p className="text-red-400 text-xs">{errors.title}</p> : <span />}
            <span className="text-xs text-zinc-600">{form.title.length}/50</span>
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">
            내용 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.content}
            onChange={(e) => update('content', e.target.value)}
            maxLength={1000}
            rows={6}
            placeholder="문의 내용을 자세히 입력해주세요"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 resize-none"
          />
          <div className="flex justify-between mt-1">
            {errors.content ? <p className="text-red-400 text-xs">{errors.content}</p> : <span />}
            <span className="text-xs text-zinc-600">{form.content.length}/1000</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {loading ? '처리 중...' : '문의 등록'}
        </button>
      </form>
    </div>
  );
}
