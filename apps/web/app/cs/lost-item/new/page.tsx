'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCinemas, createLostItemInquiry } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { CinemaListItem } from '@/lib/types';

const ITEM_CATEGORIES = [
  { value: 'PHONE',    label: '휴대폰' },
  { value: 'WALLET',   label: '지갑' },
  { value: 'BAG',      label: '가방' },
  { value: 'GLASSES',  label: '안경' },
  { value: 'CLOTHING', label: '의류' },
  { value: 'OTHER',    label: '기타' },
];

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function LostItemNewPage() {
  const router = useRouter();
  const [cinemas, setCinemas] = useState<CinemaListItem[]>([]);
  const [form, setForm] = useState({
    cinemaId: '',
    lostDate: '',
    lostTime: '',
    itemCategory: '',
    lostPlace: '',
    itemDescription: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login?redirect=/cs/lost-item/new'); return; }
    fetchCinemas().then(setCinemas).catch(() => {});
  }, [router]);

  function update(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.cinemaId) e.cinemaId = '영화관을 선택해주세요.';
    if (!form.lostDate) e.lostDate = '분실 날짜를 선택해주세요.';
    if (!form.itemCategory) e.itemCategory = '분실물 종류를 선택해주세요.';
    if (!form.lostPlace.trim()) e.lostPlace = '분실 장소를 입력해주세요.';
    if (!form.itemDescription.trim()) e.itemDescription = '물품 설명을 입력해주세요.';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login?redirect=/cs/lost-item/new'); return; }
    const categoryLabel = ITEM_CATEGORIES.find((c) => c.value === form.itemCategory)?.label ?? '물품';
    setLoading(true);
    try {
      await createLostItemInquiry(
        {
          title: `${categoryLabel} 분실물 신고`,
          content: form.itemDescription.trim(),
          cinemaId: Number(form.cinemaId),
          lostDate: form.lostDate,
          ...(form.lostTime ? { lostTime: form.lostTime } : {}),
          itemCategory: form.itemCategory,
          itemDescription: form.itemDescription.trim(),
          lostPlace: form.lostPlace.trim(),
        },
        token,
      );
      toast('신고가 접수되었습니다. 발견 시 연락드리겠습니다.', 'success');
      router.push('/my/inquiries');
    } catch (err) {
      toast(err instanceof Error ? err.message : '신고 접수에 실패했습니다.', 'error');
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
        <h1 className="text-xl font-bold">분실물 신고</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
        {/* 영화관 */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">
            영화관 <span className="text-red-500">*</span>
          </label>
          <select
            value={form.cinemaId}
            onChange={(e) => update('cinemaId', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
          >
            <option value="">선택해주세요</option>
            {cinemas.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.cinemaId && <p className="text-red-400 text-xs mt-1">{errors.cinemaId}</p>}
        </div>

        {/* 분실 날짜 / 시간 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              분실 날짜 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.lostDate}
              onChange={(e) => update('lostDate', e.target.value)}
              min={offsetDate(-30)}
              max={offsetDate(0)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
            />
            {errors.lostDate && <p className="text-red-400 text-xs mt-1">{errors.lostDate}</p>}
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">분실 시간 (선택)</label>
            <input
              type="time"
              value={form.lostTime}
              onChange={(e) => update('lostTime', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* 분실물 종류 */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">
            분실물 종류 <span className="text-red-500">*</span>
          </label>
          <select
            value={form.itemCategory}
            onChange={(e) => update('itemCategory', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
          >
            <option value="">선택해주세요</option>
            {ITEM_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {errors.itemCategory && <p className="text-red-400 text-xs mt-1">{errors.itemCategory}</p>}
        </div>

        {/* 분실 장소 */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">
            분실 장소 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.lostPlace}
            onChange={(e) => update('lostPlace', e.target.value)}
            placeholder="예: 3관 좌석, 매점 앞"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
          />
          {errors.lostPlace && <p className="text-red-400 text-xs mt-1">{errors.lostPlace}</p>}
        </div>

        {/* 자세한 설명 */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">
            자세한 설명 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.itemDescription}
            onChange={(e) => update('itemDescription', e.target.value)}
            rows={4}
            placeholder="색상, 브랜드, 특징 등 자세히 설명해주세요"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 resize-none"
          />
          {errors.itemDescription && <p className="text-red-400 text-xs mt-1">{errors.itemDescription}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {loading ? '처리 중...' : '신고하기'}
        </button>
      </form>
    </div>
  );
}
