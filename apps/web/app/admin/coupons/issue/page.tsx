'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminListCoupons,
  adminIssueCoupon,
  adminBulkIssuePreview,
  adminBulkIssueExecute,
  type AdminCoupon,
  type BulkIssuePreviewItem,
  type BulkIssueResult,
} from '@/lib/admin-api';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const GRADES = [
  { value: 'WELCOME', label: 'WELCOME' },
  { value: 'VIP', label: 'VIP' },
  { value: 'VVIP', label: 'VVIP' },
  { value: 'LVIP', label: 'LVIP' },
];

// ─── 루트 ─────────────────────────────────────────────────────────────────────

export default function IssueCouponPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);

  useEffect(() => {
    adminListCoupons()
      .then((list) => setCoupons(list.filter((c) => c.isActive)))
      .catch((e) => toast((e as Error).message, 'error'))
      .finally(() => setLoadingCoupons(false));
  }, []);

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/admin/coupons')}
          className="border-slate-700 text-slate-400 hover:bg-slate-800"
        >
          ← 목록
        </Button>
        <h1 className="text-2xl font-bold text-white">쿠폰 발급</h1>
      </div>

      {loadingCoupons ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-12">
          <span className="inline-block w-4 h-4 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
          쿠폰 불러오는 중...
        </div>
      ) : (
        <Tabs defaultValue="single">
          <TabsList className="bg-slate-800/60 border border-slate-700 mb-6">
            <TabsTrigger
              value="single"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400"
            >
              단일 발급
            </TabsTrigger>
            <TabsTrigger
              value="bulk"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400"
            >
              일괄 발급
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <SingleIssue coupons={coupons} />
          </TabsContent>
          <TabsContent value="bulk">
            <BulkIssue coupons={coupons} onDone={() => router.push('/admin/coupons')} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ─── 단일 발급 ────────────────────────────────────────────────────────────────

function SingleIssue({ coupons }: { coupons: AdminCoupon[] }) {
  const [couponId, setCouponId] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminIssueCoupon({ couponId: Number(couponId), email: email.trim() });
      toast(`쿠폰 발급 완료: ${email.trim()}`, 'success');
      setEmail('');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
      <div>
        <Label className="text-slate-300 text-sm mb-1.5 block">쿠폰 선택 *</Label>
        <select
          required
          value={couponId}
          onChange={(e) => setCouponId(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">-- 쿠폰을 선택하세요 --</option>
          {coupons.map((c) => (
            <option key={c.id} value={c.id}>
              [{c.code}] {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label className="text-slate-300 text-sm mb-1.5 block">회원 이메일 *</Label>
        <Input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600"
        />
      </div>

      <Button
        type="submit"
        disabled={submitting || !couponId}
        className="bg-red-600 hover:bg-red-700 text-white w-full"
      >
        {submitting ? (
          <span className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            발급 중...
          </span>
        ) : (
          '발급'
        )}
      </Button>
    </form>
  );
}

// ─── 일괄 발급 ────────────────────────────────────────────────────────────────

type BulkStage = 'filter' | 'preview';

function BulkIssue({
  coupons,
  onDone,
}: {
  coupons: AdminCoupon[];
  onDone: () => void;
}) {
  const [stage, setStage] = useState<BulkStage>('filter');

  // 필터 상태
  const [couponId, setCouponId] = useState('');
  const [grades, setGrades] = useState<Set<string>>(new Set());
  const [joinedAfter, setJoinedAfter] = useState('');
  const [joinedBefore, setJoinedBefore] = useState('');

  // 미리보기 상태
  const [previewing, setPreviewing] = useState(false);
  const [previewList, setPreviewList] = useState<BulkIssuePreviewItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // 결과 모달
  const [result, setResult] = useState<BulkIssueResult | null>(null);
  const [executing, setExecuting] = useState(false);

  const eligible = previewList.filter((r) => !r.alreadyHas);
  const alreadyHasCount = previewList.length - eligible.length;

  function toggleGrade(grade: string) {
    setGrades((prev) => {
      const next = new Set(prev);
      if (next.has(grade)) { next.delete(grade); } else { next.add(grade); }
      return next;
    });
  }

  const handlePreview = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!couponId) { toast('쿠폰을 선택하세요.', 'error'); return; }
      setPreviewing(true);
      try {
        const list = await adminBulkIssuePreview({
          couponId: Number(couponId),
          gradeNames: grades.size > 0 ? Array.from(grades) : undefined,
          joinedAfter: joinedAfter || undefined,
          joinedBefore: joinedBefore || undefined,
        });
        setPreviewList(list);
        setSelected(new Set(list.filter((r) => !r.alreadyHas).map((r) => r.id)));
        setStage('preview');
      } catch (e) {
        toast((e as Error).message, 'error');
      } finally {
        setPreviewing(false);
      }
    },
    [couponId, grades, joinedAfter, joinedBefore],
  );

  async function handleExecute() {
    if (selected.size === 0) { toast('발급 대상이 없습니다.', 'error'); return; }
    setExecuting(true);
    try {
      const res = await adminBulkIssueExecute({
        couponId: Number(couponId),
        customerIds: Array.from(selected),
      });
      setResult(res);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setExecuting(false);
    }
  }

  function toggleAll() {
    if (selected.size === eligible.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligible.map((r) => r.id)));
    }
  }

  function toggleRow(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  // ── 단계 1: 조건 설정 ───────────────────────────────────────────────────────

  if (stage === 'filter') {
    return (
      <form onSubmit={handlePreview} className="max-w-lg space-y-5">
        {/* 쿠폰 선택 */}
        <div>
          <Label className="text-slate-300 text-sm mb-1.5 block">쿠폰 선택 *</Label>
          <select
            required
            value={couponId}
            onChange={(e) => setCouponId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">-- 쿠폰을 선택하세요 --</option>
            {coupons.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.code}] {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* 등급 필터 */}
        <div>
          <Label className="text-slate-300 text-sm mb-2 block">
            등급 필터{' '}
            <span className="text-slate-500 font-normal">(미선택 시 전체)</span>
          </Label>
          <div className="flex gap-2 flex-wrap">
            {GRADES.map((g) => (
              <label
                key={g.value}
                className={[
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors select-none',
                  grades.has(g.value)
                    ? 'border-red-500 bg-red-900/20 text-white'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={grades.has(g.value)}
                  onChange={() => toggleGrade(g.value)}
                  className="accent-red-500"
                />
                {g.label}
              </label>
            ))}
          </div>
        </div>

        {/* 가입일 필터 */}
        <div>
          <Label className="text-slate-300 text-sm mb-2 block">
            가입일 범위{' '}
            <span className="text-slate-500 font-normal">(선택)</span>
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">시작일</div>
              <Input
                type="date"
                value={joinedAfter}
                onChange={(e) => setJoinedAfter(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">종료일</div>
              <Input
                type="date"
                value={joinedBefore}
                onChange={(e) => setJoinedBefore(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={previewing || !couponId}
          variant="outline"
          className="border-slate-600 text-slate-200 hover:bg-slate-800 w-full"
        >
          {previewing ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3.5 h-3.5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
              조회 중...
            </span>
          ) : (
            '미리보기 조회'
          )}
        </Button>
      </form>
    );
  }

  // ── 단계 2: 미리보기 + 확인 ─────────────────────────────────────────────────

  const allEligibleSelected = eligible.length > 0 && selected.size === eligible.length;
  const indeterminate = selected.size > 0 && selected.size < eligible.length;

  return (
    <div className="space-y-4">
      {/* 요약 바 */}
      <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3">
        <div className="text-sm text-slate-300">
          총{' '}
          <span className="text-white font-semibold">{previewList.length}</span>명 조회
          {alreadyHasCount > 0 && (
            <>
              {' / '}
              <span className="text-amber-400 font-semibold">{alreadyHasCount}</span>명 이미 보유
            </>
          )}
          {' / '}발급 가능{' '}
          <span className="text-emerald-400 font-semibold">{eligible.length}</span>명
        </div>
        <div className="text-xs text-slate-500">
          현재 선택:{' '}
          <span className="text-white font-medium">{selected.size}</span>명
        </div>
      </div>

      {/* 테이블 */}
      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <div className="max-h-[480px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-900 z-10">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="w-10 pl-4">
                  <input
                    type="checkbox"
                    checked={allEligibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = indeterminate;
                    }}
                    onChange={toggleAll}
                    disabled={eligible.length === 0}
                    className="accent-red-500 cursor-pointer"
                  />
                </TableHead>
                <TableHead className="text-slate-400">이메일</TableHead>
                <TableHead className="text-slate-400">이름</TableHead>
                <TableHead className="text-slate-400">등급</TableHead>
                <TableHead className="text-slate-400">가입일</TableHead>
                <TableHead className="text-slate-400 text-right">누적 결제</TableHead>
                <TableHead className="text-slate-400 text-center">보유 여부</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewList.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-slate-500 py-12"
                  >
                    조건에 해당하는 회원이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                previewList.map((item) => (
                  <TableRow
                    key={item.id}
                    className={[
                      'border-slate-800 transition-colors',
                      item.alreadyHas
                        ? 'opacity-40'
                        : selected.has(item.id)
                          ? 'bg-red-900/10 hover:bg-red-900/15'
                          : 'hover:bg-slate-800/30',
                    ].join(' ')}
                    onClick={() => !item.alreadyHas && toggleRow(item.id)}
                    style={{ cursor: item.alreadyHas ? 'default' : 'pointer' }}
                  >
                    <TableCell className="pl-4">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        disabled={item.alreadyHas}
                        onChange={() => toggleRow(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="accent-red-500"
                      />
                    </TableCell>
                    <TableCell className="text-slate-300 font-mono text-xs">
                      {item.email}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">{item.name}</TableCell>
                    <TableCell>
                      {item.membershipGrade ? (
                        <span className="text-xs text-slate-300 bg-slate-700 px-2 py-0.5 rounded">
                          {item.membershipGrade.displayName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">없음</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell className="text-right text-slate-300 text-sm">
                      ₩{(item.totalAmount ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.alreadyHas ? (
                        <Badge className="bg-amber-900/30 text-amber-500 border-0 text-xs">
                          보유 중
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-900/30 text-emerald-400 border-0 text-xs">
                          발급 가능
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 하단 액션 */}
      <div className="flex items-center justify-between pt-1">
        <Button
          variant="outline"
          onClick={() => setStage('filter')}
          className="border-slate-700 text-slate-400 hover:bg-slate-800"
        >
          ← 조건 다시 설정
        </Button>
        <Button
          onClick={handleExecute}
          disabled={executing || selected.size === 0}
          className="bg-red-600 hover:bg-red-700 text-white min-w-[140px]"
        >
          {executing ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              발급 중...
            </span>
          ) : (
            `확인 발급 (${selected.size}명)`
          )}
        </Button>
      </div>

      {/* 결과 모달 */}
      <Dialog open={result !== null} onOpenChange={(open) => !open && setResult(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">발급 완료</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 bg-emerald-900/20 border border-emerald-800 rounded-lg p-4">
              <span className="text-2xl">✓</span>
              <div>
                <div className="text-emerald-400 font-semibold">
                  {result?.issued ?? 0}명에게 쿠폰 발급 완료
                </div>
                <div className="text-emerald-700 text-xs mt-0.5">성공적으로 처리됐습니다.</div>
              </div>
            </div>
            {(result?.skipped ?? 0) > 0 && (
              <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-800 rounded-lg p-4">
                <span className="text-xl">⚠</span>
                <div>
                  <div className="text-amber-400 font-semibold">
                    {result?.skipped}명 스킵
                  </div>
                  <div className="text-amber-700 text-xs mt-0.5">이미 보유 중인 쿠폰</div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setResult(null);
                onDone();
              }}
              className="bg-red-600 hover:bg-red-700 text-white w-full"
            >
              쿠폰 목록으로
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
