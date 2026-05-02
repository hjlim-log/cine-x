'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getMyCoupons, redeemCoupon } from '@/lib/api';
import { toast } from '@/lib/toast';
import type { UserCoupon } from '@/lib/types';

type TabStatus = 'AVAILABLE' | 'USED' | 'EXPIRED';

const TABS: { status: TabStatus; label: string }[] = [
  { status: 'AVAILABLE', label: '사용 가능' },
  { status: 'USED', label: '사용 완료' },
  { status: 'EXPIRED', label: '만료' },
];

// 쿠폰 타입별 색상 테마
const THEME = {
  AMOUNT_DISCOUNT: {
    accent: 'bg-gradient-to-b from-blue-600 to-blue-800',
    right: 'bg-gradient-to-br from-blue-950/30 to-zinc-900',
    dash: 'border-blue-600/30',
    badge: 'text-blue-400',
  },
  PERCENT_DISCOUNT: {
    accent: 'bg-gradient-to-b from-violet-600 to-violet-800',
    right: 'bg-gradient-to-br from-violet-950/30 to-zinc-900',
    dash: 'border-violet-600/30',
    badge: 'text-violet-400',
  },
  FREE_TICKET: {
    accent: 'bg-gradient-to-b from-amber-600 to-amber-800',
    right: 'bg-gradient-to-br from-amber-950/30 to-zinc-900',
    dash: 'border-amber-600/30',
    badge: 'text-amber-400',
  },
} as const;

function CouponCard({ uc, tabStatus }: { uc: UserCoupon; tabStatus: TabStatus }) {
  const { coupon } = uc;
  const theme = THEME[coupon.type] ?? THEME.AMOUNT_DISCOUNT;
  const isInactive = tabStatus !== 'AVAILABLE';

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(uc.expiresAt).getTime() - Date.now()) / 86_400_000),
  );

  let bigLabel: string;
  let subLabel: string;
  if (coupon.type === 'AMOUNT_DISCOUNT') {
    bigLabel = coupon.value.toLocaleString() + '원';
    subLabel = '할인';
  } else if (coupon.type === 'PERCENT_DISCOUNT') {
    bigLabel = `${coupon.value}%`;
    subLabel = coupon.maxDiscount
      ? `최대 ${coupon.maxDiscount.toLocaleString()}원`
      : '할인';
  } else {
    bigLabel = `${coupon.value}석`;
    subLabel = '무료';
  }

  return (
    <div className={`relative mx-3 ${isInactive ? 'grayscale opacity-55' : ''}`}>
      {/* 티켓 cut-out: 페이지 배경색(zinc-950)으로 카드 양쪽에 원형 홈 구현 */}
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-950 rounded-full z-10 shadow-inner" />
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-950 rounded-full z-10" />

      <div className="flex rounded-2xl overflow-hidden border border-zinc-700/20 shadow-lg">
        {/* 좌측 액센트: 할인 정보 */}
        <div
          className={`${theme.accent} w-[110px] shrink-0 flex flex-col items-center justify-center py-6 text-white`}
        >
          {coupon.type === 'FREE_TICKET' && (
            <svg className="w-5 h-5 mb-1.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          )}
          <span className="text-[22px] font-black leading-none tracking-tight">{bigLabel}</span>
          <span className="text-[11px] mt-1 opacity-75 font-medium">{subLabel}</span>
        </div>

        {/* 우측: 쿠폰 상세 (점선 좌측 경계) */}
        <div className={`${theme.right} flex-1 px-4 py-4 border-l-2 border-dashed ${theme.dash} flex flex-col justify-between min-h-[90px]`}>
          <div>
            <p className="font-semibold text-sm text-white leading-tight">{coupon.name}</p>
            {coupon.description && (
              <p className="text-xs text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                {coupon.description}
              </p>
            )}
          </div>

          <div className="mt-2.5 flex items-end justify-between gap-2">
            <div className="space-y-0.5 text-[11px]">
              {coupon.minPurchase > 0 && (
                <p className="text-zinc-500">
                  {coupon.minPurchase.toLocaleString()}원 이상 구매 시
                </p>
              )}

              {tabStatus === 'AVAILABLE' && (
                <p className={daysLeft <= 7 ? 'text-red-400 font-semibold' : 'text-zinc-400'}>
                  {daysLeft === 0 ? '오늘 자정 만료' : `D-${daysLeft}`}
                </p>
              )}
              {tabStatus === 'USED' && uc.usedAt && (
                <p className="text-zinc-500">
                  {new Date(uc.usedAt).toLocaleDateString('ko-KR')} 사용
                </p>
              )}
              {tabStatus === 'EXPIRED' && (
                <p className="text-zinc-500">
                  {new Date(uc.expiresAt).toLocaleDateString('ko-KR')} 만료
                </p>
              )}
            </div>

            {tabStatus === 'AVAILABLE' && (
              <span className={`${theme.badge} text-[11px] font-bold shrink-0`}>
                사용 가능
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 사용완료/만료 도장 */}
      {isInactive && (
        <div className="absolute inset-0 flex items-center justify-end pr-6 pointer-events-none">
          <span className="border-[2.5px] border-zinc-500 text-zinc-500 font-black text-[11px] px-2 py-1 rounded rotate-[-18deg] tracking-widest opacity-75 select-none">
            {tabStatus === 'USED' ? '사용완료' : '만료됨'}
          </span>
        </div>
      )}
    </div>
  );
}

export default function MyCouponsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabStatus>('AVAILABLE');
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login?redirect=/my/coupons');
      return;
    }
    getMyCoupons('AVAILABLE', token)
      .then(setCoupons)
      .catch(() => {
        localStorage.removeItem('token');
        router.replace('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleTabChange(status: TabStatus) {
    if (status === tab) return;
    setTab(status);
    const token = localStorage.getItem('token');
    if (!token) return;
    setTabLoading(true);
    try {
      setCoupons(await getMyCoupons(status, token));
    } finally {
      setTabLoading(false);
    }
  }

  async function handleRedeem() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      toast('쿠폰 코드를 입력해주세요.', 'error');
      inputRef.current?.focus();
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    setRedeeming(true);
    try {
      await redeemCoupon(trimmed, token);
      setCode('');
      toast('쿠폰이 발급되었습니다!', 'success');
      // AVAILABLE 탭으로 전환 후 새로고침
      setTab('AVAILABLE');
      setCoupons(await getMyCoupons('AVAILABLE', token));
    } catch (e) {
      toast(e instanceof Error ? e.message : '쿠폰 등록에 실패했습니다.', 'error');
    } finally {
      setRedeeming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-2">
      <h1 className="text-2xl font-bold mb-6">내 쿠폰</h1>

      {/* 쿠폰 코드 등록 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          쿠폰 코드 등록
        </p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && !redeeming && handleRedeem()}
            placeholder="예: BIRTHDAY-GIFT"
            maxLength={32}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors font-mono tracking-widest uppercase"
          />
          <button
            onClick={handleRedeem}
            disabled={redeeming}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shrink-0"
          >
            {redeeming ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                등록 중
              </span>
            ) : (
              '등록하기'
            )}
          </button>
        </div>
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-0 border border-zinc-800 rounded-xl overflow-hidden mb-6">
        {TABS.map(({ status, label }) => (
          <button
            key={status}
            onClick={() => handleTabChange(status)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === status
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 쿠폰 목록 */}
      {tabLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <div className="text-5xl">🎟</div>
          <p className="text-zinc-300 font-medium text-base">
            {tab === 'AVAILABLE'
              ? '사용 가능한 쿠폰이 없습니다'
              : tab === 'USED'
              ? '사용한 쿠폰이 없습니다'
              : '만료된 쿠폰이 없습니다'}
          </p>
          {tab === 'AVAILABLE' && (
            <p className="text-zinc-500 text-sm">
              위 입력란에 쿠폰 코드를 입력해서 할인을 받아보세요!
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 py-1 pb-6">
          {coupons.map((uc) => (
            <CouponCard key={uc.id} uc={uc} tabStatus={tab} />
          ))}
        </div>
      )}
    </div>
  );
}
