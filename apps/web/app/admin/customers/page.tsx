'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminListCustomers,
  type AdminCustomer,
  type AdminCustomerListResponse,
} from '@/lib/admin-api';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const GRADE_COLOR: Record<string, string> = {
  WELCOME: 'bg-slate-700 text-slate-300',
  VIP: 'bg-blue-900/40 text-blue-300',
  VVIP: 'bg-purple-900/40 text-purple-300',
  LVIP: 'bg-amber-900/40 text-amber-300',
};

const GRADES = ['WELCOME', 'VIP', 'VVIP', 'LVIP'];

export default function AdminCustomersPage() {
  const router = useRouter();

  const [data, setData] = useState<AdminCustomerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 검색 debounce 300ms
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  // 필터 변경 시 페이지 리셋
  useEffect(() => { setPage(1); }, [selectedGrades, includeInactive]);

  // 상단 통계 (마운트 시 1회)
  useEffect(() => {
    Promise.all([
      adminListCustomers({ page: 1, pageSize: 1 }),
      adminListCustomers({ page: 1, pageSize: 1, includeInactive: true }),
    ]).then(([activeRes, allRes]) => {
      const active = activeRes.pagination.total;
      const total = allRes.pagination.total;
      setStats({ total, active, inactive: total - active });
    }).catch(() => {});
  }, []);

  // 목록 조회
  useEffect(() => {
    setLoading(true);
    adminListCustomers({
      search: debouncedSearch || undefined,
      gradeNames: selectedGrades.length > 0 ? selectedGrades : undefined,
      includeInactive,
      page,
      pageSize: 20,
    })
      .then((res) => {
        // 페이지 범위 초과 시 첫 페이지로
        if (page > 1 && res.customers.length === 0 && res.pagination.total > 0) {
          setPage(1);
          return;
        }
        setData(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedSearch, selectedGrades, includeInactive, page]);

  const toggleGrade = (grade: string) =>
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade],
    );

  const totalPages = data?.pagination.totalPages ?? 1;
  // 5페이지 단위 윈도우
  const windowStart = Math.floor((page - 1) / 5) * 5 + 1;
  const windowEnd = Math.min(windowStart + 4, totalPages);

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">회원 관리</h1>
        <div className="flex gap-5 mt-2 text-sm">
          <span className="text-slate-400">
            전체{' '}
            <span className="text-white font-semibold">{stats.total.toLocaleString()}</span>명
          </span>
          <span className="text-slate-400">
            활성{' '}
            <span className="text-emerald-400 font-semibold">{stats.active.toLocaleString()}</span>명
          </span>
          <span className="text-slate-400">
            비활성{' '}
            <span className="text-red-400 font-semibold">{stats.inactive.toLocaleString()}</span>명
          </span>
        </div>
      </div>

      {/* 검색 + 필터 */}
      <div className="mb-5 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이메일 또는 이름으로 검색..."
          className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-md px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
        />

        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs text-slate-500 font-medium shrink-0">등급 필터</span>
          {GRADES.map((g) => (
            <label key={g} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedGrades.includes(g)}
                onChange={() => toggleGrade(g)}
                className="accent-red-500"
              />
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${GRADE_COLOR[g]}`}>
                {g}
              </span>
            </label>
          ))}

          <div className="w-px h-4 bg-slate-700 shrink-0" />

          {/* 비활성 포함 토글 */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={includeInactive}
              onClick={() => setIncludeInactive((v) => !v)}
              className={[
                'relative w-9 h-5 rounded-full transition-colors shrink-0',
                includeInactive ? 'bg-red-600' : 'bg-slate-700',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                  includeInactive ? 'translate-x-4' : 'translate-x-0.5',
                ].join(' ')}
              />
            </button>
            <span className="text-xs text-slate-400">비활성 회원 포함</span>
          </label>
        </div>
      </div>

      {/* 테이블 */}
      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">이메일</TableHead>
              <TableHead className="text-slate-400">이름</TableHead>
              <TableHead className="text-slate-400">등급</TableHead>
              <TableHead className="text-slate-400 text-right">누적 결제</TableHead>
              <TableHead className="text-slate-400 text-center">예매</TableHead>
              <TableHead className="text-slate-400 text-center">쿠폰</TableHead>
              <TableHead className="text-slate-400">가입일</TableHead>
              <TableHead className="text-slate-400 text-center">상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-12">
                  불러오는 중...
                </TableCell>
              </TableRow>
            ) : !data || data.customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-12">
                  검색 결과가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.customers.map((c) => (
                <CustomerRow
                  key={c.id}
                  customer={c}
                  onClick={() => router.push(`/admin/customers/${c.id}`)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-5">
          {windowStart > 1 && (
            <PagBtn label="‹" onClick={() => setPage(windowStart - 1)} />
          )}
          {Array.from({ length: windowEnd - windowStart + 1 }, (_, i) => windowStart + i).map(
            (p) => (
              <PagBtn
                key={p}
                label={String(p)}
                onClick={() => setPage(p)}
                active={p === page}
              />
            ),
          )}
          {windowEnd < totalPages && (
            <PagBtn label="›" onClick={() => setPage(windowEnd + 1)} />
          )}
        </div>
      )}
    </div>
  );
}

function CustomerRow({
  customer: c,
  onClick,
}: {
  customer: AdminCustomer;
  onClick: () => void;
}) {
  return (
    <TableRow
      className={[
        'border-slate-800 cursor-pointer transition-colors',
        c.isActive
          ? 'hover:bg-slate-800/40'
          : 'opacity-50 grayscale hover:bg-slate-800/20',
      ].join(' ')}
      onClick={onClick}
    >
      <TableCell className="font-mono text-xs text-slate-300">{c.email}</TableCell>
      <TableCell className="font-medium text-white">{c.name}</TableCell>
      <TableCell>
        <span
          className={`text-xs px-2 py-0.5 rounded font-medium ${GRADE_COLOR[c.membershipGrade.name] ?? 'bg-slate-700 text-slate-300'}`}
        >
          {c.membershipGrade.displayName}
        </span>
      </TableCell>
      <TableCell className="text-right text-slate-300">
        ₩{c.totalAmount.toLocaleString()}
      </TableCell>
      <TableCell className="text-center text-slate-400">{c._count.reservations}</TableCell>
      <TableCell className="text-center text-slate-400">{c._count.coupons}</TableCell>
      <TableCell className="text-xs text-slate-500">
        {new Date(c.createdAt).toLocaleDateString('ko-KR')}
      </TableCell>
      <TableCell className="text-center">
        {c.isActive ? (
          <Badge className="bg-emerald-900/40 text-emerald-400 border-0 text-xs">활성</Badge>
        ) : (
          <Badge className="bg-slate-700 text-slate-400 border-0 text-xs">탈퇴</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

function PagBtn({
  label,
  onClick,
  active = false,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-8 h-8 text-xs rounded transition-colors',
        active ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-800',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
