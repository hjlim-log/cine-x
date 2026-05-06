'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminListInquiries, type AdminInquiry } from '@/lib/admin-api';
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';

const TYPE_LABEL: Record<string, string> = {
  ONE_ON_ONE: '1:1 문의',
  GROUP: '단체관람',
  LOST_ITEM: '분실물',
};

const TYPE_COLOR: Record<string, string> = {
  ONE_ON_ONE: 'bg-slate-700 text-slate-300',
  GROUP: 'bg-blue-900/40 text-blue-300',
  LOST_ITEM: 'bg-amber-900/40 text-amber-300',
};

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: '미답변',
  PROCESSING: '처리 중',
  COMPLETED: '답변 완료',
};

const STATUS_COLOR: Record<string, string> = {
  RECEIVED: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
  PROCESSING: 'bg-blue-900/40 text-blue-400 border-blue-800',
  COMPLETED: 'bg-emerald-900/40 text-emerald-400 border-emerald-800',
};

type TabValue = 'all' | 'RECEIVED' | 'PROCESSING' | 'COMPLETED';

export default function AdminInquiriesPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<AdminInquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminListInquiries()
      .then(setInquiries)
      .catch((e) => toast((e as Error).message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  function getTabList(tab: TabValue) {
    if (tab === 'all') return inquiries;
    return inquiries.filter((i) => i.status === tab);
  }

  function count(status: string) {
    return inquiries.filter((i) => i.status === status).length;
  }

  const tabs: { value: TabValue; label: string; badge?: number }[] = [
    { value: 'all', label: '전체', badge: inquiries.length },
    { value: 'RECEIVED', label: '미답변', badge: count('RECEIVED') },
    { value: 'PROCESSING', label: '처리 중', badge: count('PROCESSING') },
    { value: 'COMPLETED', label: '답변 완료', badge: count('COMPLETED') },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">문의 답변</h1>
        <p className="text-slate-400 text-sm mt-0.5">고객 문의를 관리하고 답변을 등록합니다.</p>
      </div>

      <Tabs defaultValue="RECEIVED">
        <TabsList className="bg-slate-800/60 border border-slate-700 mb-4 h-auto p-1 gap-0.5">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 flex items-center gap-1.5 px-3 py-1.5 text-sm"
            >
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span
                  className={[
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none',
                    t.value === 'RECEIVED'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-slate-600 text-slate-300',
                  ].join(' ')}
                >
                  {t.badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <InquiryTable
              rows={getTabList(t.value)}
              loading={loading}
              onRowClick={(id) => router.push(`/admin/inquiries/${id}`)}
              onAnswer={(id) => router.push(`/admin/inquiries/${id}`)}
              typeLabel={TYPE_LABEL}
              typeColor={TYPE_COLOR}
              statusLabel={STATUS_LABEL}
              statusColor={STATUS_COLOR}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function InquiryTable({
  rows,
  loading,
  onRowClick,
  onAnswer,
  typeLabel,
  typeColor,
  statusLabel,
  statusColor,
}: {
  rows: AdminInquiry[];
  loading: boolean;
  onRowClick: (id: number) => void;
  onAnswer: (id: number) => void;
  typeLabel: Record<string, string>;
  typeColor: Record<string, string>;
  statusLabel: Record<string, string>;
  statusColor: Record<string, string>;
}) {
  return (
    <div className="rounded-lg border border-slate-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-400 w-14">ID</TableHead>
            <TableHead className="text-slate-400">타입</TableHead>
            <TableHead className="text-slate-400">제목</TableHead>
            <TableHead className="text-slate-400">작성자</TableHead>
            <TableHead className="text-slate-400">작성일</TableHead>
            <TableHead className="text-slate-400 text-center">상태</TableHead>
            <TableHead className="text-slate-400 text-right">답변</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-slate-500 py-12">
                <span className="inline-block w-4 h-4 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin mr-2 align-middle" />
                불러오는 중...
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-slate-500 py-12">
                문의가 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((inq) => (
              <TableRow
                key={inq.id}
                className="border-slate-800 cursor-pointer hover:bg-slate-800/40 transition-colors"
                onClick={() => onRowClick(inq.id)}
              >
                <TableCell className="text-slate-500 text-xs font-mono">
                  #{inq.id}
                </TableCell>
                <TableCell>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${typeColor[inq.type] ?? 'bg-slate-700 text-slate-300'}`}
                  >
                    {typeLabel[inq.type] ?? inq.type}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-white max-w-[280px] truncate">
                    {inq.title}
                  </div>
                  {inq.cinema && (
                    <div className="text-xs text-slate-500 mt-0.5">{inq.cinema.name}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-slate-300 text-sm">{inq.customer.name}</div>
                  <div className="text-slate-500 text-xs">{inq.customer.email}</div>
                </TableCell>
                <TableCell className="text-slate-500 text-xs whitespace-nowrap">
                  {new Date(inq.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    className={`border text-xs ${statusColor[inq.status] ?? 'bg-slate-700 text-slate-400'}`}
                  >
                    {statusLabel[inq.status] ?? inq.status}
                  </Badge>
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  {inq.status !== 'COMPLETED' ? (
                    <Button
                      size="sm"
                      onClick={() => onAnswer(inq.id)}
                      className="h-7 px-2.5 text-xs bg-red-600 hover:bg-red-700 text-white"
                    >
                      답변 작성
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAnswer(inq.id)}
                      className="h-7 px-2.5 text-xs border-slate-700 text-slate-400 hover:bg-slate-800"
                    >
                      보기
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
