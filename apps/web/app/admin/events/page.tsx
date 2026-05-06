'use client';

import { useEffect, useState } from 'react';
import {
  adminListEvents,
  adminGetEventApplications,
  adminDrawEvent,
  type AdminEvent,
  type AdminEventApplication,
  type AdminDrawResult,
} from '@/lib/admin-api';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const CATEGORY_LABEL: Record<string, string> = {
  MOVIE: '영화',
  GENERAL: '일반',
  MEMBERSHIP: '멤버십',
  DISCOUNT: '할인',
};

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: '예정',
  ONGOING: '진행중',
  ENDED: '종료',
  DRAWN: '추첨완료',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  UPCOMING: 'secondary',
  ONGOING: 'default',
  ENDED: 'outline',
  DRAWN: 'secondary',
};

function formatDate(d: string) {
  return d.slice(0, 10).replace(/-/g, '.');
}

function DrawResultModal({
  result,
  onClose,
}: {
  result: AdminDrawResult;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-center">추첨 완료!</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 text-center mt-2">
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-2xl font-bold text-white">{result.totalApplications}</p>
            <p className="text-slate-400 text-xs mt-0.5">총 응모</p>
          </div>
          <div className="bg-amber-900/40 rounded-xl p-3">
            <p className="text-2xl font-bold text-amber-300">{result.winners}</p>
            <p className="text-slate-400 text-xs mt-0.5">당첨</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-2xl font-bold text-slate-400">{result.losers}</p>
            <p className="text-slate-400 text-xs mt-0.5">낙첨</p>
          </div>
        </div>
        {result.winnersList.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-3 space-y-1.5 max-h-48 overflow-y-auto mt-2">
            <p className="text-xs font-semibold text-slate-400 mb-2">당첨자 목록</p>
            {result.winnersList.map((w) => (
              <div key={w.applicationId} className="flex justify-between text-xs">
                <span className="text-slate-300">고객 #{w.customerId}</span>
                <span className="text-amber-300">{w.prizeName}</span>
              </div>
            ))}
          </div>
        )}
        <Button
          onClick={onClose}
          className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white"
        >
          확인
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function ApplicationsModal({
  event,
  applications,
  onClose,
}: {
  event: AdminEvent;
  applications: AdminEventApplication[];
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-white">{event.title} — 응모자 목록</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-slate-400 mb-3">총 {applications.length}명</div>
        <div className="max-h-96 overflow-y-auto space-y-1">
          {applications.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">응모자가 없습니다.</p>
          ) : (
            applications.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/50 text-sm"
              >
                <div>
                  <span className="text-slate-200 font-medium">{app.customer.name}</span>
                  <span className="text-slate-500 ml-2 text-xs">{app.customer.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  {app.prize && (
                    <span className="text-xs text-amber-300">{app.prize.name}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    app.status === 'WON'
                      ? 'bg-amber-900/50 text-amber-300'
                      : app.status === 'LOST'
                      ? 'bg-slate-700 text-slate-400'
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {app.status === 'WON' ? '당첨' : app.status === 'LOST' ? '낙첨' : '응모중'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState<number | null>(null);
  const [drawResult, setDrawResult] = useState<AdminDrawResult | null>(null);
  const [appsModal, setAppsModal] = useState<{
    event: AdminEvent;
    applications: AdminEventApplication[];
  } | null>(null);

  const load = () => {
    adminListEvents()
      .then(setEvents)
      .catch((e) => toast((e as Error).message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDraw = async (event: AdminEvent) => {
    if (!confirm(`"${event.title}" 이벤트를 추첨하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setDrawing(event.id);
    try {
      const result = await adminDrawEvent(event.id);
      setDrawResult(result);
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setDrawing(null);
    }
  };

  const handleViewApplications = async (event: AdminEvent) => {
    try {
      const apps = await adminGetEventApplications(event.id);
      setAppsModal({ event, applications: apps });
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
        불러오는 중...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">이벤트 관리</h1>
      </div>

      {drawResult && (
        <DrawResultModal result={drawResult} onClose={() => setDrawResult(null)} />
      )}
      {appsModal && (
        <ApplicationsModal
          event={appsModal.event}
          applications={appsModal.applications}
          onClose={() => setAppsModal(null)}
        />
      )}

      {events.length === 0 ? (
        <div className="text-slate-500 text-sm py-20 text-center">이벤트가 없습니다.</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">제목</th>
                <th className="text-left px-4 py-3 font-medium">카테고리</th>
                <th className="text-left px-4 py-3 font-medium">기간</th>
                <th className="text-center px-4 py-3 font-medium">응모자</th>
                <th className="text-center px-4 py-3 font-medium">상태</th>
                <th className="text-center px-4 py-3 font-medium">추첨</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, i) => (
                <tr
                  key={event.id}
                  className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                    i === events.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <p className="text-slate-200 font-medium leading-snug">{event.title}</p>
                    {event.prizes.length > 0 && (
                      <p className="text-slate-500 text-xs mt-0.5">
                        경품 {event.prizes.length}종
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {CATEGORY_LABEL[event.category] ?? event.category}
                  </td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                    {formatDate(event.startDate)} ~ {formatDate(event.endDate)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleViewApplications(event)}
                      className="text-slate-200 font-semibold hover:text-red-400 transition-colors"
                    >
                      {event._count.applications.toLocaleString()}명
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={STATUS_VARIANT[event.status] ?? 'outline'}>
                      {STATUS_LABEL[event.status] ?? event.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(event.status === 'ONGOING' || event.status === 'ENDED') ? (
                      <Button
                        size="sm"
                        onClick={() => handleDraw(event)}
                        disabled={drawing === event.id}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs h-7 px-3"
                      >
                        {drawing === event.id ? '추첨 중...' : '추첨 실행'}
                      </Button>
                    ) : event.status === 'DRAWN' ? (
                      <span className="text-slate-500 text-xs">완료</span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
