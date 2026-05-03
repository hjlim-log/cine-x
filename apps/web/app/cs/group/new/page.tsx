'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCinemas, createGroupInquiry } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { CinemaListItem } from '@/lib/types';

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function GroupNewPage() {
  const router = useRouter();
  const [cinemas, setCinemas] = useState<CinemaListItem[]>([]);
  const [form, setForm] = useState({
    groupType: 'GROUP_VIEWING',
    cinemaId: '',
    expectedCount: '',
    preferredDate: '',
    preferredTime: '',
    contactPhone: '',
    content: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login?redirect=/cs/group/new'); return; }
    fetchCinemas().then(setCinemas).catch(() => {});
  }, [router]);

  function update(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.cinemaId) e.cinemaId = '영화관을 선택해주세요.';
    const count = Number(form.expectedCount);
    if (!form.expectedCount || isNaN(count) || count < 10) e.expectedCount = '10명 이상 입력해주세요.';
    if (!form.preferredDate) e.preferredDate = '희망 일자를 선택해주세요.';
    if (!form.preferredTime) e.preferredTime = '희망 시간을 선택해주세요.';
    if (!form.contactPhone.trim()) e.contactPhone = '연락처를 입력해주세요.';
    else if (!/^[\d\-+\s()]{9,}$/.test(form.contactPhone.trim())) e.contactPhone = '올바른 전화번호 형식을 입력해주세요.';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login?redirect=/cs/group/new'); return; }
    const typeLabel = form.groupType === 'GROUP_VIEWING' ? '단체 관람' : '대관';
    setLoading(true);
    try {
      await createGroupInquiry(
        {
          title: `${typeLabel} 신청 - ${form.expectedCount}명`,
          content: form.content.trim() || `${typeLabel} 신청합니다.`,
          cinemaId: Number(form.cinemaId),
          groupType: form.groupType,
          expectedCount: Number(form.expectedCount),
          preferredDate: form.preferredDate,
          preferredTime: form.preferredTime,
          contactPhone: form.contactPhone.trim(),
        },
        token,
      );
      toast('신청이 접수되었습니다. 영업일 기준 1~2일 내 연락드릴 예정입니다.', 'success');
      router.push('/my/inquiries');
    } catch (err) {
      toast(err instanceof Error ? err.message : '신청에 실패했습니다.', 'error');
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
        <h1 className="text-xl font-bold">단체관람 신청</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
        {/* 신청 종류 */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">
            신청 종류 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-6">
            {[
              { value: 'GROUP_VIEWING', label: '단체 관람' },
              { value: 'VENUE_RENTAL',  label: '대관' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="groupType"
                  value={opt.value}
                  checked={form.groupType === opt.value}
                  onChange={(e) => update('groupType', e.target.value)}
                  className="accent-red-500"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

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

        {/* 예상 인원 */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">
            예상 인원 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.expectedCount}
            onChange={(e) => update('expectedCount', e.target.value)}
            min={10}
            placeholder="10명 이상"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
          />
          {errors.expectedCount && <p className="text-red-400 text-xs mt-1">{errors.expectedCount}</p>}
        </div>

        {/* 희망 일자 / 시간 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              희망 일자 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.preferredDate}
              onChange={(e) => update('preferredDate', e.target.value)}
              min={offsetDate(7)}
              max={offsetDate(90)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
            />
            {errors.preferredDate && <p className="text-red-400 text-xs mt-1">{errors.preferredDate}</p>}
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              희망 시간 <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={form.preferredTime}
              onChange={(e) => update('preferredTime', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
            />
            {errors.preferredTime && <p className="text-red-400 text-xs mt-1">{errors.preferredTime}</p>}
          </div>
        </div>

        {/* 연락처 */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">
            연락처 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={form.contactPhone}
            onChange={(e) => update('contactPhone', e.target.value)}
            placeholder="010-0000-0000"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
          />
          {errors.contactPhone && <p className="text-red-400 text-xs mt-1">{errors.contactPhone}</p>}
        </div>

        {/* 추가 문의사항 */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">추가 문의사항 (선택)</label>
          <textarea
            value={form.content}
            onChange={(e) => update('content', e.target.value)}
            rows={4}
            placeholder="기타 요청사항이나 궁금한 점을 입력해주세요"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {loading ? '처리 중...' : '신청하기'}
        </button>
      </form>
    </div>
  );
}
