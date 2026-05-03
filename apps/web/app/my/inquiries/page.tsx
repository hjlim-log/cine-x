'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMyInquiries, type InquiryItem } from '@/lib/api';
import Spinner from '@/components/Spinner';

const TYPE_TABS = [
  { label: '전체', value: '' },
  { label: '1:1 문의', value: 'ONE_ON_ONE' },
  { label: '단체관람', value: 'GROUP' },
  { label: '분실물', value: 'LOST_ITEM' },
];

const TYPE_LABEL: Record<string, string> = {
  ONE_ON_ONE: '1:1 문의',
  GROUP: '단체관람',
  LOST_ITEM: '분실물',
};

const TYPE_COLOR: Record<string, string> = {
  ONE_ON_ONE: 'bg-blue-900 text-blue-300',
  GROUP: 'bg-violet-900 text-violet-300',
  LOST_ITEM: 'bg-amber-900 text-amber-300',
};

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: '접수됨',
  IN_PROGRESS: '처리중',
  COMPLETED: '답변완료',
};

const STATUS_COLOR: Record<string, string> = {
  RECEIVED: 'bg-zinc-700 text-zinc-300',
  IN_PROGRESS: 'bg-blue-900 text-blue-300',
  COMPLETED: 'bg-green-900 text-green-300',
};

export default function MyInquiriesPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login?redirect=/my/inquiries'); return; }
    getMyInquiries(token)
      .then(setInquiries)
      .catch(() => setInquiries([]))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = tab ? inquiries.filter((i) => i.type === tab) : inquiries;

  if (loading) return <Spinner />;

  return (
    <div>
      <h2 className="text-lg font-bold mb-5">내 문의</h2>

      {/* 탭 */}
      <div className="flex gap-2 flex-wrap mb-5">
        {TYPE_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              tab === t.value
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-zinc-400 text-sm">문의 내역이 없습니다.</p>
          <Link href="/cs" className="mt-4 inline-block text-sm text-red-400 hover:text-red-300 underline">
            고객센터 바로가기
          </Link>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((inq) => (
            <Link key={inq.id} href={`/my/inquiries/${inq.id}`} className="block">
              <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-4 py-3.5 flex items-center gap-3 transition-colors group">
                <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLOR[inq.type]}`}>
                  {TYPE_LABEL[inq.type]}
                </span>
                <span className="flex-1 text-sm text-zinc-200 group-hover:text-white transition-colors truncate">
                  {inq.title}
                </span>
                {inq.status === 'COMPLETED' && !inq.notificationRead && (
                  <span className="shrink-0 w-2 h-2 bg-red-500 rounded-full" title="새 답변" />
                )}
                <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded ${STATUS_COLOR[inq.status] ?? 'bg-zinc-700 text-zinc-300'}`}>
                  {STATUS_LABEL[inq.status] ?? inq.status}
                </span>
                <span className="shrink-0 text-xs text-zinc-600">
                  {new Date(inq.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric', month: 'numeric', day: 'numeric',
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
