'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  adminGetCoupon,
  adminUpdateCoupon,
  adminDeactivateCoupon,
  type AdminCouponDetail,
} from '@/lib/admin-api';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const TYPE_LABEL: Record<string, string> = {
  AMOUNT_DISCOUNT: '금액 할인',
  PERCENT_DISCOUNT: '퍼센트 할인',
  FREE_TICKET: '무료 관람권',
};

const POLICY_LABEL: Record<string, string> = {
  WELCOME: '신규 가입',
  CODE: '코드 입력',
  MANUAL: '수동 발급',
  EVENT: '이벤트',
};

function CouponCard({ coupon }: { coupon: AdminCouponDetail }) {
  const isAmount = coupon.type === 'AMOUNT_DISCOUNT';
  const isPercent = coupon.type === 'PERCENT_DISCOUNT';
  return (
    <div
      className="relative rounded-2xl p-6 w-80 overflow-hidden shadow-2xl"
      style={{ background: coupon.bgColor ?? '#1e293b' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-white/60 text-xs font-medium uppercase tracking-widest mb-1">
            {TYPE_LABEL[coupon.type] ?? coupon.type}
          </div>
          <div className="text-white font-bold text-lg leading-tight">{coupon.name}</div>
        </div>
        {!coupon.isActive && (
          <Badge className="bg-white/20 text-white border-0 text-xs shrink-0">비활성</Badge>
        )}
      </div>
      <div className="text-white text-4xl font-black mb-4">
        {isAmount && `₩${coupon.value.toLocaleString()}`}
        {isPercent && `${coupon.value}%`}
        {!isAmount && !isPercent && `${coupon.value}석 무료`}
      </div>
      {coupon.description && (
        <div className="text-white/60 text-sm mb-4 line-clamp-2">{coupon.description}</div>
      )}
      <div className="flex items-center justify-between">
        <div className="text-white/40 text-xs font-mono">{coupon.code}</div>
        <div className="text-white/40 text-xs">{coupon.validDays}일 유효</div>
      </div>
      {coupon.minPurchase != null && (
        <div className="mt-2 text-white/40 text-xs">
          {coupon.minPurchase.toLocaleString()}원 이상 구매 시
        </div>
      )}
    </div>
  );
}

export default function CouponDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [coupon, setCoupon] = useState<AdminCouponDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    value: 0,
    minPurchase: '',
    maxDiscount: '',
    validDays: 90,
  });

  useEffect(() => {
    adminGetCoupon(id)
      .then((c) => {
        setCoupon(c);
        setForm({
          name: c.name,
          description: c.description ?? '',
          value: c.value,
          minPurchase: c.minPurchase != null ? String(c.minPurchase) : '',
          maxDiscount: c.maxDiscount != null ? String(c.maxDiscount) : '',
          validDays: c.validDays,
        });
      })
      .catch((e) => toast((e as Error).message, 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await adminUpdateCoupon(id, {
        name: form.name,
        description: form.description || undefined,
        value: form.value,
        minPurchase: form.minPurchase ? Number(form.minPurchase) : undefined,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        validDays: form.validDays,
      });
      setCoupon(updated);
      toast('저장했습니다.', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!confirm('비활성화하면 새 발급이 중단됩니다. 계속하시겠습니까?')) return;
    setSaving(true);
    try {
      const updated = await adminDeactivateCoupon(id);
      setCoupon(updated);
      toast('비활성화했습니다.', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-slate-400 text-sm py-12 text-center">불러오는 중...</div>;
  }
  if (!coupon) {
    return <div className="text-slate-400 text-sm py-12 text-center">쿠폰을 찾을 수 없습니다.</div>;
  }

  const stats = coupon.stats;
  const usageRate = stats.issued > 0 ? ((stats.used / stats.issued) * 100).toFixed(1) : '0';

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
        <h1 className="text-2xl font-bold text-white">쿠폰 상세</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 카드 + 통계 */}
        <div className="space-y-6">
          <CouponCard coupon={coupon} />

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '총 발급', value: stats.issued, color: 'text-white' },
              { label: '사용', value: stats.used, color: 'text-emerald-400' },
              { label: '보유', value: stats.available, color: 'text-blue-400' },
              { label: '만료', value: stats.expired, color: 'text-slate-500' },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
              >
                <div className="text-slate-400 text-xs mb-1">{s.label}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {stats.issued > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>사용률</span>
                <span className="text-white font-medium">{usageRate}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full">
                <div
                  className="h-2 bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(Number(usageRate), 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">코드</span>
              <span className="font-mono text-slate-300 bg-slate-700 px-2 py-0.5 rounded">
                {coupon.code}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">타입</span>
              <span className="text-slate-300">{TYPE_LABEL[coupon.type] ?? coupon.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">발급 정책</span>
              <span className="text-slate-300">
                {POLICY_LABEL[coupon.issuePolicy] ?? coupon.issuePolicy}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">상태</span>
              {coupon.isActive ? (
                <Badge className="bg-emerald-900/40 text-emerald-400 border-0 text-xs">활성</Badge>
              ) : (
                <Badge className="bg-slate-700 text-slate-400 border-0 text-xs">비활성</Badge>
              )}
            </div>
          </div>
        </div>

        {/* 편집 폼 */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-5">편집</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300 text-sm mb-1.5 block">이름</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm mb-1.5 block">설명</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="bg-slate-800 border-slate-700 text-white resize-none"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm mb-1.5 block">
                {coupon.type === 'AMOUNT_DISCOUNT'
                  ? '할인 금액(원)'
                  : coupon.type === 'PERCENT_DISCOUNT'
                    ? '할인율(%)'
                    : '무료 좌석 수'}
              </Label>
              <Input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300 text-sm mb-1.5 block">최소 구매 금액(원)</Label>
                <Input
                  type="number"
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
                  value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                  placeholder="없음"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300 text-sm mb-1.5 block">유효 기간(일)</Label>
              <Input
                type="number"
                value={form.validDays}
                onChange={(e) => setForm({ ...form, validDays: Number(e.target.value) })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white flex-1"
            >
              {saving ? '저장 중...' : '저장'}
            </Button>
            {coupon.isActive && (
              <Button
                onClick={handleDeactivate}
                disabled={saving}
                variant="outline"
                className="border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-red-400 hover:border-red-600"
              >
                비활성화
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
