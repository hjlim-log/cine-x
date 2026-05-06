'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  adminGetCustomer,
  adminChangeCustomerGrade,
  adminDeactivateCustomer,
  adminReactivateCustomer,
  adminListCoupons,
  adminIssueCoupon,
  type AdminCustomerDetail,
  type AdminCoupon,
} from '@/lib/admin-api';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const GRADE_COLOR: Record<string, string> = {
  WELCOME: 'bg-slate-700 text-slate-300',
  VIP: 'bg-blue-900/40 text-blue-300',
  VVIP: 'bg-purple-900/40 text-purple-300',
  LVIP: 'bg-amber-900/40 text-amber-300',
};

const GRADE_BIG_COLOR: Record<string, string> = {
  WELCOME: 'bg-slate-700/60 text-slate-200 border border-slate-600',
  VIP: 'bg-blue-900/50 text-blue-200 border border-blue-700',
  VVIP: 'bg-purple-900/50 text-purple-200 border border-purple-700',
  LVIP: 'bg-amber-900/50 text-amber-200 border border-amber-700',
};

const ALL_GRADES = [
  { id: 1, name: 'WELCOME', displayName: '웰컴' },
  { id: 2, name: 'VIP', displayName: 'VIP' },
  { id: 3, name: 'VVIP', displayName: 'VVIP' },
  { id: 4, name: 'LVIP', displayName: 'LVIP' },
];

const RESERVATION_STATUS: Record<string, { label: string; cls: string }> = {
  PAID: { label: '결제완료', cls: 'bg-emerald-900/40 text-emerald-400' },
  PENDING: { label: '결제대기', cls: 'bg-amber-900/40 text-amber-400' },
  CANCELLED: { label: '취소', cls: 'bg-slate-700 text-slate-400' },
  FAILED: { label: '실패', cls: 'bg-red-900/40 text-red-400' },
};

const COUPON_STATUS: Record<string, { label: string; cls: string }> = {
  AVAILABLE: { label: '사용가능', cls: 'bg-emerald-900/40 text-emerald-400' },
  USED: { label: '사용완료', cls: 'bg-slate-700 text-slate-400' },
  EXPIRED: { label: '만료', cls: 'bg-red-900/30 text-red-400' },
  RESERVED: { label: '예약중', cls: 'bg-blue-900/40 text-blue-400' },
};

const EVENT_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: '추첨대기', cls: 'bg-amber-900/40 text-amber-400' },
  WON: { label: '당첨', cls: 'bg-emerald-900/40 text-emerald-400' },
  LOST: { label: '낙첨', cls: 'bg-slate-700 text-slate-400' },
};

const INQUIRY_STATUS: Record<string, { label: string; cls: string }> = {
  RECEIVED: { label: '접수', cls: 'bg-amber-900/40 text-amber-400' },
  PROCESSING: { label: '처리중', cls: 'bg-blue-900/40 text-blue-400' },
  COMPLETED: { label: '완료', cls: 'bg-emerald-900/40 text-emerald-400' },
};

const COUPON_TYPE_LABEL: Record<string, string> = {
  AMOUNT_DISCOUNT: '금액할인',
  PERCENT_DISCOUNT: '퍼센트할인',
  FREE_TICKET: '무료관람권',
};

type Tab = 'membership' | 'reservations' | 'coupons' | 'events' | 'inquiries';

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function AdminCustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [data, setData] = useState<AdminCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('membership');

  // 등급 변경
  const [newGradeId, setNewGradeId] = useState<number>(0);
  const [gradeReason, setGradeReason] = useState('');
  const [gradeLoading, setGradeLoading] = useState(false);

  // 쿠폰 발급
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<number>(0);
  const [couponLoading, setCouponLoading] = useState(false);

  // 비활성화 모달
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminGetCustomer(id)
      .then(setData)
      .catch((e) => toast((e as Error).message, 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
    adminListCoupons()
      .then((list) => setCoupons(list.filter((c) => c.isActive)))
      .catch(() => {});
  }, [load]);

  // ─ 등급 변경 ────────────────────────────────────────────────────────────────

  const handleGradeChange = async () => {
    if (!data) return;
    if (!newGradeId) { toast('등급을 선택해주세요.', 'error'); return; }
    if (gradeReason.trim().length < 5) { toast('사유를 5자 이상 입력해주세요.', 'error'); return; }

    const oldGrade = data.membershipGrade.name;
    const newGrade = ALL_GRADES.find((g) => g.id === newGradeId)?.displayName ?? '';

    if (!confirm(`${data.email}의 등급을 ${oldGrade} → ${newGrade}로 변경하시겠습니까?`)) return;

    setGradeLoading(true);
    try {
      await adminChangeCustomerGrade(id, { gradeId: newGradeId, reason: gradeReason.trim() });
      toast('등급이 변경되었습니다.', 'success');
      setGradeReason('');
      setNewGradeId(0);
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setGradeLoading(false);
    }
  };

  // ─ 쿠폰 발급 ────────────────────────────────────────────────────────────────

  const handleIssueCoupon = async () => {
    if (!data) return;
    if (!selectedCouponId) { toast('쿠폰을 선택해주세요.', 'error'); return; }

    setCouponLoading(true);
    try {
      await adminIssueCoupon({ couponId: selectedCouponId, email: data.email });
      toast('쿠폰이 발급되었습니다.', 'success');
      setSelectedCouponId(0);
      setActiveTab('coupons');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setCouponLoading(false);
    }
  };

  // ─ 비활성화 ─────────────────────────────────────────────────────────────────

  const handleDeactivate = async () => {
    if (deactivateReason.trim().length < 2) { toast('사유를 입력해주세요.', 'error'); return; }
    setDeactivateLoading(true);
    try {
      await adminDeactivateCustomer(id, { reason: deactivateReason.trim() });
      toast('비활성화 완료.', 'success');
      setShowDeactivateModal(false);
      setDeactivateReason('');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setDeactivateLoading(false);
    }
  };

  // ─ 재활성화 ─────────────────────────────────────────────────────────────────

  const handleReactivate = async () => {
    if (!data) return;
    if (!confirm(`${data.email} 회원을 재활성화하시겠습니까?`)) return;
    try {
      await adminReactivateCustomer(id);
      toast('재활성화 완료.', 'success');
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  // ─── 렌더 ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-slate-500 text-sm">불러오는 중...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-slate-500 text-sm">회원을 찾을 수 없습니다.</span>
      </div>
    );
  }

  const currentGradeId = ALL_GRADES.find((g) => g.name === data.membershipGrade.name)?.id ?? 0;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'membership', label: '멤버십' },
    { key: 'reservations', label: '예매', count: data.stats.totalReservations },
    { key: 'coupons', label: '쿠폰', count: data.stats.totalCoupons },
    { key: 'events', label: '이벤트 응모', count: data.eventApplications.length },
    { key: 'inquiries', label: '문의', count: data.inquiries.length },
  ];

  return (
    <div>
      {/* 뒤로가기 */}
      <button
        onClick={() => router.push('/admin/customers')}
        className="text-sm text-slate-500 hover:text-slate-300 transition-colors mb-5 flex items-center gap-1"
      >
        ← 회원 목록
      </button>

      <div className="grid grid-cols-3 gap-6 items-start">
        {/* ── 좌측 (프로필 + 탭) ── */}
        <div className="col-span-2 space-y-5">
          {/* 헤더 카드 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-start gap-5">
              {/* 등급 뱃지 */}
              <div
                className={`shrink-0 w-16 h-16 rounded-xl flex items-center justify-center text-sm font-bold ${GRADE_BIG_COLOR[data.membershipGrade.name] ?? 'bg-slate-800 text-slate-300'}`}
              >
                {data.membershipGrade.displayName}
              </div>

              {/* 기본 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-white">{data.name}</h1>
                  {!data.isActive && (
                    <Badge className="bg-slate-700 text-slate-400 border-0 text-xs">탈퇴</Badge>
                  )}
                </div>
                <div className="text-slate-400 text-sm mt-0.5 font-mono">{data.email}</div>
                {data.phone && (
                  <div className="text-slate-500 text-xs mt-0.5">{data.phone}</div>
                )}
                {!data.isActive && data.deactivateReason && (
                  <div className="mt-2 text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded px-3 py-1.5">
                    탈퇴 사유: {data.deactivateReason}
                    {data.deactivatedAt &&
                      ` (${new Date(data.deactivatedAt).toLocaleDateString('ko-KR')})`}
                  </div>
                )}
              </div>
            </div>

            {/* 통계 바 */}
            <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800">
              <StatItem label="누적 결제" value={`₩${data.totalAmount.toLocaleString()}`} />
              <StatItem label="총 예매" value={`${data.stats.totalReservations}건`} />
              <StatItem
                label="결제완료"
                value={`${data.stats.paidReservations}건`}
                sub={
                  data.stats.totalReservations > 0
                    ? `${Math.round((data.stats.paidReservations / data.stats.totalReservations) * 100)}%`
                    : undefined
                }
              />
              <StatItem
                label="보유 쿠폰"
                value={`${data.stats.availableCoupons}장`}
                sub={`전체 ${data.stats.totalCoupons}장`}
              />
            </div>
            <div className="mt-3 text-xs text-slate-600">
              가입일: {new Date(data.createdAt).toLocaleDateString('ko-KR')}
            </div>
          </div>

          {/* 탭 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="flex border-b border-slate-800">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={[
                    'flex-1 py-3 text-xs font-medium transition-colors',
                    activeTab === t.key
                      ? 'text-white border-b-2 border-red-500 bg-slate-800/50'
                      : 'text-slate-500 hover:text-slate-300',
                  ].join(' ')}
                >
                  {t.label}
                  {t.count !== undefined && (
                    <span className="ml-1 text-slate-600">({t.count})</span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-5">
              {activeTab === 'membership' && <MembershipTab data={data} />}
              {activeTab === 'reservations' && <ReservationsTab data={data} />}
              {activeTab === 'coupons' && <CouponsTab data={data} />}
              {activeTab === 'events' && <EventsTab data={data} />}
              {activeTab === 'inquiries' && <InquiriesTab data={data} />}
            </div>
          </div>
        </div>

        {/* ── 우측 (운영자 액션) ── */}
        <div className="sticky top-6 space-y-0 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-white">운영자 액션</h2>
          </div>

          <div className="p-5 space-y-6">
            {/* 등급 변경 */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">등급 변경</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${GRADE_COLOR[data.membershipGrade.name] ?? 'bg-slate-700 text-slate-400'}`}
                >
                  현재: {data.membershipGrade.name}
                </span>
              </div>
              <select
                value={newGradeId}
                onChange={(e) => setNewGradeId(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500"
              >
                <option value={0}>등급 선택</option>
                {ALL_GRADES.filter((g) => g.id !== currentGradeId).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.displayName})
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={gradeReason}
                onChange={(e) => setGradeReason(e.target.value)}
                placeholder="변경 사유 (최소 5자)"
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-500"
              />
              <Button
                onClick={handleGradeChange}
                disabled={gradeLoading || !newGradeId || gradeReason.trim().length < 5}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs h-8 disabled:opacity-40"
              >
                {gradeLoading ? '처리 중...' : '변경하기'}
              </Button>
            </section>

            <div className="border-t border-slate-800" />

            {/* 쿠폰 발급 */}
            <section className="space-y-3">
              <span className="text-xs font-medium text-slate-300">쿠폰 발급</span>
              <select
                value={selectedCouponId}
                onChange={(e) => setSelectedCouponId(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500"
              >
                <option value={0}>쿠폰 선택</option>
                {coupons.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              <Button
                onClick={handleIssueCoupon}
                disabled={couponLoading || !selectedCouponId}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs h-8 disabled:opacity-40"
              >
                {couponLoading ? '처리 중...' : '발급하기'}
              </Button>
            </section>

            <div className="border-t border-slate-800" />

            {/* 회원 상태 */}
            <section className="space-y-2">
              <span className="text-xs font-medium text-slate-300">회원 상태</span>
              {data.isActive ? (
                <Button
                  onClick={() => setShowDeactivateModal(true)}
                  className="w-full bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-900/60 text-xs h-8"
                  variant="outline"
                >
                  비활성화 (탈퇴 처리)
                </Button>
              ) : (
                <Button
                  onClick={handleReactivate}
                  className="w-full bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-900/50 text-xs h-8"
                  variant="outline"
                >
                  재활성화
                </Button>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* 비활성화 모달 */}
      {showDeactivateModal && (
        <DeactivateModal
          email={data.email}
          reason={deactivateReason}
          loading={deactivateLoading}
          onReasonChange={setDeactivateReason}
          onConfirm={handleDeactivate}
          onCancel={() => { setShowDeactivateModal(false); setDeactivateReason(''); }}
        />
      )}
    </div>
  );
}

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function StatItem({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className="text-base font-semibold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-600">{sub}</div>}
    </div>
  );
}

function EmptyRow({ cols, msg = '데이터가 없습니다.' }: { cols: number; msg?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="text-center text-slate-600 py-8 text-sm">
        {msg}
      </TableCell>
    </TableRow>
  );
}

function StatusBadge({ map, value }: { map: Record<string, { label: string; cls: string }>; value: string }) {
  const s = map[value] ?? { label: value, cls: 'bg-slate-700 text-slate-400' };
  return <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.cls}`}>{s.label}</span>;
}

// ─ 탭: 멤버십 ────────────────────────────────────────────────────────────────

function MembershipTab({ data }: { data: AdminCustomerDetail }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/60 rounded-lg p-3">
          <div className="text-xs text-slate-500">현재 등급</div>
          <div className={`mt-1 text-sm font-bold px-2 py-0.5 rounded inline-block ${GRADE_COLOR[data.membershipGrade.name]}`}>
            {data.membershipGrade.name}
          </div>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3">
          <div className="text-xs text-slate-500">할인율</div>
          <div className="text-lg font-bold text-white mt-1">{data.membershipGrade.discountPercent}%</div>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3">
          <div className="text-xs text-slate-500">누적 결제</div>
          <div className="text-sm font-bold text-white mt-1">₩{data.totalAmount.toLocaleString()}</div>
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-500 mb-2 font-medium">등급 변경 이력 (최근 5건)</div>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-transparent">
              <TableHead className="text-slate-500 text-xs">변경</TableHead>
              <TableHead className="text-slate-500 text-xs">타입</TableHead>
              <TableHead className="text-slate-500 text-xs text-right">누적금액</TableHead>
              <TableHead className="text-slate-500 text-xs">일시</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.membershipHistory.length === 0 ? (
              <EmptyRow cols={4} msg="등급 변경 이력이 없습니다." />
            ) : (
              data.membershipHistory.map((h) => (
                <TableRow key={h.id} className="border-slate-800">
                  <TableCell className="text-sm text-slate-300">
                    {h.fromGrade ? `${h.fromGrade} → ` : ''}
                    <span className="font-medium text-white">{h.toGrade}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${h.changeType.startsWith('MANUAL') ? 'bg-amber-900/30 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                      {h.changeType.replace('MANUAL_', '수동 ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-slate-400 text-xs">
                    ₩{h.totalAmount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">
                    {new Date(h.changedAt).toLocaleDateString('ko-KR')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─ 탭: 예매 ─────────────────────────────────────────────────────────────────

function ReservationsTab({ data }: { data: AdminCustomerDetail }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-3">
        총 {data.stats.totalReservations}건 · 결제완료 {data.stats.paidReservations}건 (최근 10건 표시)
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700 hover:bg-transparent">
            <TableHead className="text-slate-500 text-xs">영화</TableHead>
            <TableHead className="text-slate-500 text-xs">영화관</TableHead>
            <TableHead className="text-slate-500 text-xs">상영일시</TableHead>
            <TableHead className="text-slate-500 text-xs text-right">금액</TableHead>
            <TableHead className="text-slate-500 text-xs text-center">상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.reservations.length === 0 ? (
            <EmptyRow cols={5} msg="예매 내역이 없습니다." />
          ) : (
            data.reservations.map((r) => (
              <TableRow key={r.id} className="border-slate-800">
                <TableCell className="text-sm text-white font-medium max-w-[140px] truncate">
                  {r.screening.movie.title}
                </TableCell>
                <TableCell className="text-xs text-slate-400">
                  {r.screening.screen.cinema.name}
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {new Date(r.screening.startTime).toLocaleString('ko-KR', {
                    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </TableCell>
                <TableCell className="text-right text-slate-300 text-xs">
                  ₩{r.totalAmount.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  <StatusBadge map={RESERVATION_STATUS} value={r.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─ 탭: 쿠폰 ─────────────────────────────────────────────────────────────────

function CouponsTab({ data }: { data: AdminCustomerDetail }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-3">
        전체 {data.stats.totalCoupons}장 · 사용가능 {data.stats.availableCoupons}장 (최근 10장 표시)
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700 hover:bg-transparent">
            <TableHead className="text-slate-500 text-xs">쿠폰명</TableHead>
            <TableHead className="text-slate-500 text-xs">타입</TableHead>
            <TableHead className="text-slate-500 text-xs text-center">상태</TableHead>
            <TableHead className="text-slate-500 text-xs">만료일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.coupons.length === 0 ? (
            <EmptyRow cols={4} msg="쿠폰이 없습니다." />
          ) : (
            data.coupons.map((uc) => (
              <TableRow key={uc.id} className="border-slate-800">
                <TableCell>
                  <div className="text-sm text-white font-medium">{uc.coupon.name}</div>
                  <div className="text-xs text-slate-600 font-mono">{uc.coupon.code}</div>
                </TableCell>
                <TableCell className="text-xs text-slate-400">
                  {COUPON_TYPE_LABEL[uc.coupon.type] ?? uc.coupon.type}
                </TableCell>
                <TableCell className="text-center">
                  <StatusBadge map={COUPON_STATUS} value={uc.status} />
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {new Date(uc.expiresAt).toLocaleDateString('ko-KR')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─ 탭: 이벤트 응모 ──────────────────────────────────────────────────────────

function EventsTab({ data }: { data: AdminCustomerDetail }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-3">최근 5건</div>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700 hover:bg-transparent">
            <TableHead className="text-slate-500 text-xs">이벤트</TableHead>
            <TableHead className="text-slate-500 text-xs text-center">결과</TableHead>
            <TableHead className="text-slate-500 text-xs">경품</TableHead>
            <TableHead className="text-slate-500 text-xs">응모일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.eventApplications.length === 0 ? (
            <EmptyRow cols={4} msg="이벤트 응모 내역이 없습니다." />
          ) : (
            data.eventApplications.map((ea) => (
              <TableRow key={ea.id} className="border-slate-800">
                <TableCell className="text-sm text-white max-w-[160px] truncate">
                  {ea.event.title}
                </TableCell>
                <TableCell className="text-center">
                  <StatusBadge map={EVENT_STATUS} value={ea.status} />
                </TableCell>
                <TableCell className="text-xs text-slate-400">
                  {ea.prize?.name ?? '—'}
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {new Date(ea.appliedAt).toLocaleDateString('ko-KR')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─ 탭: 문의 ─────────────────────────────────────────────────────────────────

const INQUIRY_TYPE_LABEL: Record<string, string> = {
  ONE_ON_ONE: '1:1 문의',
  GROUP: '단체 관람',
  LOST_ITEM: '분실물',
};

function InquiriesTab({ data }: { data: AdminCustomerDetail }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-3">최근 5건</div>
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700 hover:bg-transparent">
            <TableHead className="text-slate-500 text-xs">타입</TableHead>
            <TableHead className="text-slate-500 text-xs">제목</TableHead>
            <TableHead className="text-slate-500 text-xs text-center">상태</TableHead>
            <TableHead className="text-slate-500 text-xs">등록일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.inquiries.length === 0 ? (
            <EmptyRow cols={4} msg="문의 내역이 없습니다." />
          ) : (
            data.inquiries.map((q) => (
              <TableRow key={q.id} className="border-slate-800">
                <TableCell className="text-xs text-slate-400">
                  {INQUIRY_TYPE_LABEL[q.type] ?? q.type}
                </TableCell>
                <TableCell className="text-sm text-white max-w-[200px] truncate">
                  {q.title}
                </TableCell>
                <TableCell className="text-center">
                  <StatusBadge map={INQUIRY_STATUS} value={q.status} />
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {new Date(q.createdAt).toLocaleDateString('ko-KR')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─ 비활성화 모달 ─────────────────────────────────────────────────────────────

function DeactivateModal({
  email,
  reason,
  loading,
  onReasonChange,
  onConfirm,
  onCancel,
}: {
  email: string;
  reason: string;
  loading: boolean;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />

      {/* 모달 */}
      <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl mx-4">
        <h3 className="text-base font-semibold text-white mb-1">회원 비활성화</h3>
        <p className="text-sm text-slate-400 mb-4">
          정말{' '}
          <span className="font-mono text-slate-200">{email}</span> 회원을 비활성화하시겠습니까?
          <br />
          <span className="text-xs text-red-400">비활성화 후 사용자는 로그인할 수 없습니다.</span>
        </p>

        <div className="space-y-2 mb-5">
          <label className="text-xs text-slate-400 font-medium">사유 (필수)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="비활성화 사유를 입력하세요"
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-500"
            autoFocus
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-sm"
          >
            취소
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading || reason.trim().length < 2}
            className="bg-red-700 hover:bg-red-800 text-white text-sm disabled:opacity-40"
          >
            {loading ? '처리 중...' : '비활성화'}
          </Button>
        </div>
      </div>
    </div>
  );
}
