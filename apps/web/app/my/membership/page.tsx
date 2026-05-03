'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyMembership, getMembershipGrades } from '@/lib/api';
import type { MembershipInfo, MembershipGrade } from '@/lib/types';

const GRADE_STYLE: Record<string, { gradient: string; bar: string; text: string }> = {
  WELCOME: { gradient: 'from-zinc-500 to-zinc-700',     bar: 'bg-zinc-300', text: 'text-zinc-100' },
  VIP:     { gradient: 'from-red-500 to-red-800',       bar: 'bg-red-200',  text: 'text-red-50' },
  VVIP:    { gradient: 'from-violet-500 to-violet-800', bar: 'bg-violet-200', text: 'text-violet-50' },
  LVIP:    { gradient: 'from-amber-400 to-amber-600',   bar: 'bg-amber-100', text: 'text-amber-950' },
};

function getProgress(total: number, current: MembershipGrade, next: MembershipGrade | null) {
  if (!next) return 100;
  const range = next.minAmount - current.minAmount;
  if (range <= 0) return 100;
  return Math.min(100, Math.max(0, Math.floor(((total - current.minAmount) / range) * 100)));
}

function formatRewards(grade: MembershipGrade): string {
  if (!grade.rewards?.length) return '-';
  return grade.rewards
    .map((r) => {
      if (r.coupon.type === 'FREE_TICKET') return `무료관람권 ${r.quantity}장`;
      if (r.coupon.type === 'AMOUNT_DISCOUNT') return `${r.coupon.value.toLocaleString()}원 쿠폰 ${r.quantity}장`;
      if (r.coupon.type === 'PERCENT_DISCOUNT') return `${r.coupon.value}% 할인쿠폰 ${r.quantity}장`;
      return `쿠폰 ${r.quantity}장`;
    })
    .join(', ');
}

export default function MembershipPage() {
  const router = useRouter();
  const [info, setInfo] = useState<MembershipInfo | null>(null);
  const [grades, setGrades] = useState<MembershipGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login?redirect=/my/membership'); return; }

    Promise.all([getMyMembership(token), getMembershipGrades()])
      .then(([mi, gl]) => { setInfo(mi); setGrades(gl); })
      .catch(() => { localStorage.removeItem('token'); router.replace('/login'); })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!info) return null;

  const { currentGrade, totalAmount, nextGrade, amountToNext, history } = info;
  const style = GRADE_STYLE[currentGrade.name] ?? GRADE_STYLE.WELCOME;
  const progress = getProgress(totalAmount, currentGrade, nextGrade);

  return (
    <div className="py-2 space-y-6">
      <h1 className="text-2xl font-bold">내 멤버십</h1>

      {/* 멤버십 카드 */}
      <div className={`bg-gradient-to-br ${style.gradient} rounded-2xl p-6 relative overflow-hidden shadow-xl`}>
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-4 -bottom-10 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative">
          <div className="flex justify-between items-start mb-6">
            <span className={`text-3xl font-black tracking-widest ${style.text}`}>
              {currentGrade.displayName}
            </span>
            <span className="text-white/40 text-sm font-bold tracking-[0.3em]">CINE-X</span>
          </div>

          <p className="text-white/60 text-xs mb-0.5 uppercase tracking-wider">누적 결제 금액</p>
          <p className={`text-2xl font-bold ${style.text} mb-5`}>
            {totalAmount.toLocaleString()}원
          </p>

          {/* 진행바 */}
          <div className="mb-4">
            <div className="h-1.5 bg-black/25 rounded-full overflow-hidden">
              <div
                className={`h-full ${style.bar} rounded-full transition-all duration-700 ease-out`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] text-white/50">
              <span>{currentGrade.displayName}</span>
              {nextGrade && <span>{nextGrade.displayName}</span>}
            </div>
          </div>

          <p className={`text-sm font-semibold ${style.text}`}>
            {nextGrade
              ? `✨ ${nextGrade.displayName}까지 ${amountToNext!.toLocaleString()}원 남았어요!`
              : '🏆 최상위 등급입니다!'}
          </p>
        </div>
      </div>

      {/* 현재 등급 혜택 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          {currentGrade.displayName} 혜택
        </h2>
        <ul className="space-y-2.5">
          {currentGrade.discountPercent > 0 ? (
            <li className="flex items-start gap-2.5 text-sm">
              <span className="text-red-400 font-bold mt-0.5 shrink-0">•</span>
              <span>
                결제 시 자동{' '}
                <span className="font-semibold text-white">{currentGrade.discountPercent}% 할인</span>
                {currentGrade.maxDiscount != null && (
                  <span className="text-zinc-500"> (최대 {currentGrade.maxDiscount.toLocaleString()}원)</span>
                )}
              </span>
            </li>
          ) : (
            <li className="flex items-start gap-2.5 text-sm text-zinc-500">
              <span className="mt-0.5 shrink-0">•</span>
              <span>할인 혜택 없음 — VIP 승급 시 자동 할인 적용</span>
            </li>
          )}
          {currentGrade.rewards?.length > 0 && (
            <li className="flex items-start gap-2.5 text-sm">
              <span className="text-amber-400 font-bold mt-0.5 shrink-0">•</span>
              <span>
                등급 달성 쿠폰:{' '}
                <span className="font-semibold text-white">{formatRewards(currentGrade)}</span>
              </span>
            </li>
          )}
        </ul>
      </div>

      {/* 등급별 혜택 비교 */}
      {grades.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">등급별 혜택 비교</h2>
          </div>
          {/* 헤더 */}
          <div className="grid grid-cols-[96px_80px_1fr_1fr] px-4 py-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider border-b border-zinc-800/60">
            <span>등급</span>
            <span>조건</span>
            <span>할인</span>
            <span>달성 혜택</span>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {grades.map((g) => {
              const isCurrent = g.name === currentGrade.name;
              return (
                <div
                  key={g.id}
                  className={`grid grid-cols-[96px_80px_1fr_1fr] px-4 py-3 items-center gap-1 transition-colors ${
                    isCurrent ? 'bg-zinc-800' : 'hover:bg-zinc-800/30'
                  }`}
                >
                  {/* 등급명 */}
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: g.bgColor ?? '#6b7280' }}
                    />
                    <span className={`text-sm font-bold ${isCurrent ? 'text-white' : 'text-zinc-400'}`}>
                      {g.displayName}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] bg-white/15 text-white px-1 py-0.5 rounded font-bold leading-none">
                        현재
                      </span>
                    )}
                  </div>
                  {/* 조건 */}
                  <span className="text-xs text-zinc-500">
                    {g.minAmount === 0 ? '기본' : `${Math.floor(g.minAmount / 10000)}만원~`}
                  </span>
                  {/* 할인 */}
                  <span className={`text-xs ${g.discountPercent > 0 ? 'text-red-400' : 'text-zinc-600'}`}>
                    {g.discountPercent > 0
                      ? `${g.discountPercent}% (최대 ${g.maxDiscount ? Math.floor(g.maxDiscount / 1000) + 'K' : '∞'})`
                      : '-'}
                  </span>
                  {/* 리워드 */}
                  <span className="text-xs text-zinc-500 leading-snug">
                    {formatRewards(g)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 등급 변동 이력 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">등급 변동 이력</h2>
        </div>
        {history.length === 0 ? (
          <p className="text-center py-8 text-zinc-600 text-sm">등급 변동 이력이 없습니다.</p>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {history.map((h) => (
              <div key={h.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm">
                    {h.fromGrade ? (
                      <>
                        <span className="text-zinc-400">{h.fromGrade}</span>
                        <span className="text-zinc-600 mx-1.5">→</span>
                        <span className={h.changeType === 'UPGRADE' ? 'text-red-400 font-semibold' : 'text-blue-400 font-semibold'}>
                          {h.toGrade}
                        </span>
                        <span className={`ml-1.5 text-[11px] ${h.changeType === 'UPGRADE' ? 'text-red-600' : 'text-blue-600'}`}>
                          {h.changeType === 'UPGRADE' ? '▲ 승급' : '▼ 강등'}
                        </span>
                      </>
                    ) : (
                      <span className="text-zinc-300 font-medium">{h.toGrade} 시작</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    누적 {h.totalAmount.toLocaleString()}원 도달
                  </p>
                </div>
                <span className="text-xs text-zinc-600 shrink-0">
                  {new Date(h.changedAt).toLocaleDateString('ko-KR', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
