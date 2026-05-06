'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminListCoupons,
  type AdminCoupon,
  type CouponStats,
} from '@/lib/admin-api';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const TYPE_LABEL: Record<string, string> = {
  AMOUNT_DISCOUNT: '금액 할인',
  PERCENT_DISCOUNT: '퍼센트 할인',
  FREE_TICKET: '무료 관람권',
};

const TYPE_COLOR: Record<string, string> = {
  AMOUNT_DISCOUNT: 'bg-amber-900/40 text-amber-300',
  PERCENT_DISCOUNT: 'bg-blue-900/40 text-blue-300',
  FREE_TICKET: 'bg-emerald-900/40 text-emerald-300',
};

const POLICY_LABEL: Record<string, string> = {
  WELCOME: '신규 가입',
  CODE: '코드 입력',
  MANUAL: '수동 발급',
  EVENT: '이벤트',
};

function formatValue(type: string, value: number) {
  if (type === 'AMOUNT_DISCOUNT') return `₩${value.toLocaleString()}`;
  if (type === 'PERCENT_DISCOUNT') return `${value}%`;
  return `${value}석`;
}

function StatBar({ stats }: { stats: CouponStats }) {
  const usageRate = stats.issued > 0 ? (stats.used / stats.issued) * 100 : 0;
  return (
    <div className="space-y-1.5 min-w-[160px]">
      <div className="flex gap-2 text-[11px] text-slate-500 flex-wrap">
        <span>발급 <span className="text-slate-300 font-medium">{stats.issued}</span></span>
        <span>사용 <span className="text-emerald-400 font-medium">{stats.used}</span></span>
        <span>잔여 <span className="text-slate-300 font-medium">{stats.available}</span></span>
        <span>만료 <span className="text-slate-600 font-medium">{stats.expired}</span></span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full w-32">
        <div
          className="h-1.5 bg-emerald-500 rounded-full transition-all"
          style={{ width: `${Math.min(usageRate, 100)}%` }}
        />
      </div>
      {stats.issued > 0 && (
        <div className="text-[10px] text-slate-600">
          사용률 {usageRate.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

export default function AdminCouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminListCoupons()
      .then(setCoupons)
      .catch((e) => toast((e as Error).message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">쿠폰 관리</h1>
          <p className="text-slate-400 text-sm mt-0.5">총 {coupons.length}개</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/coupons/issue')}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            수동 발급
          </Button>
          <Button
            onClick={() => router.push('/admin/coupons/new')}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            + 새 쿠폰
          </Button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">이름</TableHead>
              <TableHead className="text-slate-400">코드</TableHead>
              <TableHead className="text-slate-400">타입</TableHead>
              <TableHead className="text-slate-400 text-center">할인값</TableHead>
              <TableHead className="text-slate-400">발급 정책</TableHead>
              <TableHead className="text-slate-400">발급 통계</TableHead>
              <TableHead className="text-slate-400 text-center">상태</TableHead>
              <TableHead className="text-slate-400 text-right">편집</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-12">
                  불러오는 중...
                </TableCell>
              </TableRow>
            ) : coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-12">
                  쿠폰이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((c) => (
                <TableRow
                  key={c.id}
                  className={[
                    'border-slate-800 cursor-pointer transition-colors',
                    c.isActive
                      ? 'hover:bg-slate-800/40'
                      : 'opacity-50 hover:bg-slate-800/20',
                  ].join(' ')}
                  onClick={() => router.push(`/admin/coupons/${c.id}`)}
                >
                  {/* 이름 */}
                  <TableCell>
                    <div className="font-medium text-white max-w-[180px] truncate">
                      {c.name}
                    </div>
                    {c.description && (
                      <div className="text-xs text-slate-500 truncate max-w-[180px] mt-0.5">
                        {c.description}
                      </div>
                    )}
                  </TableCell>

                  {/* 코드 */}
                  <TableCell>
                    <span className="font-mono text-sm text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                  </TableCell>

                  {/* 타입 */}
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLOR[c.type] ?? 'bg-slate-700 text-slate-300'}`}>
                      {TYPE_LABEL[c.type] ?? c.type}
                    </span>
                  </TableCell>

                  {/* 할인값 */}
                  <TableCell className="text-center font-semibold text-white">
                    {formatValue(c.type, c.value)}
                  </TableCell>

                  {/* 발급 정책 */}
                  <TableCell>
                    <span className="text-sm text-slate-400">
                      {POLICY_LABEL[c.issuePolicy] ?? c.issuePolicy}
                    </span>
                  </TableCell>

                  {/* 발급 통계 */}
                  <TableCell>
                    <StatBar stats={c.stats} />
                  </TableCell>

                  {/* 상태 */}
                  <TableCell className="text-center">
                    {c.isActive ? (
                      <Badge className="bg-emerald-900/40 text-emerald-400 border-0 text-xs">
                        활성
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-700 text-slate-400 border-0 text-xs">
                        비활성
                      </Badge>
                    )}
                  </TableCell>

                  {/* 편집 */}
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/admin/coupons/${c.id}`)}
                      className="h-7 px-2 text-xs border-slate-700 text-slate-300 hover:bg-slate-700"
                    >
                      편집
                    </Button>
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
