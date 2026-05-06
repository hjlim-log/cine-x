'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminCreateCoupon, type CouponCreateData } from '@/lib/admin-api';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const COUPON_TYPES = [
  { value: 'AMOUNT_DISCOUNT', label: '금액 할인', valueLabel: '할인 금액(원)' },
  { value: 'PERCENT_DISCOUNT', label: '퍼센트 할인', valueLabel: '할인율(%)' },
  { value: 'FREE_TICKET', label: '무료 관람권', valueLabel: '무료 좌석 수' },
];

const ISSUE_POLICIES = [
  { value: 'WELCOME', label: '신규 가입' },
  { value: 'CODE', label: '코드 입력' },
  { value: 'MANUAL', label: '수동 발급' },
  { value: 'EVENT', label: '이벤트' },
];

const BG_PRESETS = [
  '#1e293b', '#7f1d1d', '#1e3a5f', '#14532d', '#4a1d96', '#7c2d12', '#134e4a',
];

export default function NewCouponPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    type: 'AMOUNT_DISCOUNT',
    value: '',
    minPurchase: '',
    maxDiscount: '',
    validDays: '90',
    issuePolicy: 'MANUAL',
    bgColor: '#1e293b',
  });

  const valueLabel =
    COUPON_TYPES.find((t) => t.value === form.type)?.valueLabel ?? '값';
  const isAmount = form.type === 'AMOUNT_DISCOUNT';
  const isPercent = form.type === 'PERCENT_DISCOUNT';
  const displayValue = form.value
    ? isAmount
      ? `₩${Number(form.value).toLocaleString()}`
      : isPercent
        ? `${form.value}%`
        : `${form.value}석 무료`
    : '—';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data: CouponCreateData = {
        code: form.code.trim().toUpperCase(),
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        value: Number(form.value),
        minPurchase: form.minPurchase ? Number(form.minPurchase) : undefined,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        validDays: form.validDays ? Number(form.validDays) : undefined,
        issuePolicy: form.issuePolicy,
        bgColor: form.bgColor,
      };
      const created = await adminCreateCoupon(data);
      toast('쿠폰이 생성됐습니다.', 'success');
      router.push(`/admin/coupons/${created.id}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/admin/coupons')}
          className="border-slate-700 text-slate-400 hover:bg-slate-800"
        >
          ← 목록
        </Button>
        <h1 className="text-2xl font-bold text-white">새 쿠폰</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 폼 */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300 text-sm mb-1.5 block">코드 *</Label>
              <Input
                required
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                placeholder="WELCOME2024"
                maxLength={50}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 font-mono"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm mb-1.5 block">이름 *</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="신규 가입 쿠폰"
                maxLength={100}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300 text-sm mb-1.5 block">설명</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="쿠폰 사용 조건이나 안내 메시지"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 resize-none"
            />
          </div>

          {/* 타입 */}
          <div>
            <Label className="text-slate-300 text-sm mb-2 block">타입 *</Label>
            <div className="grid grid-cols-3 gap-2">
              {COUPON_TYPES.map((t) => (
                <label
                  key={t.value}
                  className={[
                    'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors',
                    form.type === t.value
                      ? 'border-red-500 bg-red-900/20 text-white'
                      : 'border-slate-700 text-slate-400 hover:border-slate-600',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t.value}
                    checked={form.type === t.value}
                    onChange={() => setForm({ ...form, type: t.value })}
                    className="accent-red-500"
                  />
                  <span className="text-sm font-medium">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 할인값 */}
          <div>
            <Label className="text-slate-300 text-sm mb-1.5 block">{valueLabel} *</Label>
            <Input
              required
              type="number"
              min={1}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          {/* 조건 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300 text-sm mb-1.5 block">최소 구매 금액(원)</Label>
              <Input
                type="number"
                min={0}
                value={form.minPurchase}
                onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
                placeholder="없음"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm mb-1.5 block">최대 할인(원)</Label>
              <Input
                type="number"
                min={0}
                value={form.maxDiscount}
                onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                placeholder="없음"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* 유효기간 + 발급 정책 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300 text-sm mb-1.5 block">유효 기간(일) *</Label>
              <Input
                required
                type="number"
                min={1}
                value={form.validDays}
                onChange={(e) => setForm({ ...form, validDays: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm mb-2 block">발급 정책 *</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {ISSUE_POLICIES.map((p) => (
                  <label
                    key={p.value}
                    className={[
                      'flex items-center gap-1.5 p-2 rounded border cursor-pointer text-xs transition-colors',
                      form.issuePolicy === p.value
                        ? 'border-red-500 bg-red-900/20 text-white'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="issuePolicy"
                      value={p.value}
                      checked={form.issuePolicy === p.value}
                      onChange={() => setForm({ ...form, issuePolicy: p.value })}
                      className="accent-red-500"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 카드 컬러 */}
          <div>
            <Label className="text-slate-300 text-sm mb-2 block">카드 컬러</Label>
            <div className="flex gap-2 flex-wrap items-center">
              {BG_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, bgColor: c })}
                  className={[
                    'w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110',
                    form.bgColor === c ? 'border-white scale-110' : 'border-transparent',
                  ].join(' ')}
                  style={{ background: c }}
                />
              ))}
              <div className="flex items-center gap-2 ml-1">
                <input
                  type="color"
                  value={form.bgColor}
                  onChange={(e) => setForm({ ...form, bgColor: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border border-slate-700 bg-transparent"
                />
                <span className="text-slate-500 text-xs font-mono">{form.bgColor}</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white w-full"
            >
              {submitting ? '생성 중...' : '쿠폰 생성'}
            </Button>
          </div>
        </form>

        {/* 미리보기 */}
        <div className="space-y-3">
          <div className="text-slate-400 text-sm font-medium">미리보기</div>
          <div
            className="relative rounded-2xl p-6 overflow-hidden shadow-2xl"
            style={{ background: form.bgColor }}
          >
            <div className="text-white/60 text-xs font-medium uppercase tracking-widest mb-1">
              {COUPON_TYPES.find((t) => t.value === form.type)?.label ?? '쿠폰'}
            </div>
            <div className="text-white font-bold text-lg leading-tight mb-3">
              {form.name || '쿠폰 이름'}
            </div>
            <div className="text-white text-4xl font-black mb-4">{displayValue}</div>
            {form.description && (
              <div className="text-white/60 text-sm mb-4 line-clamp-2">{form.description}</div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-white/40 text-xs font-mono">{form.code || 'CODE'}</div>
              <div className="text-white/40 text-xs">{form.validDays || 90}일 유효</div>
            </div>
            {form.minPurchase && (
              <div className="mt-2 text-white/40 text-xs">
                {Number(form.minPurchase).toLocaleString()}원 이상 구매 시
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
