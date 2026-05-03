'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCsNotice, type CsNotice } from '@/lib/api';
import Spinner from '@/components/Spinner';

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [notice, setNotice] = useState<CsNotice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getCsNotice(Number(id))
      .then((data) => {
        if (!data) { setError(true); return; }
        setNotice(data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;

  if (error || !notice) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-zinc-400">공지사항을 찾을 수 없습니다.</p>
        <Link href="/cs/notices" className="text-red-400 hover:text-red-300 text-sm underline">
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 상단 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {notice.isImportant && (
            <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-medium">중요</span>
          )}
          {notice.cinema && (
            <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
              {notice.cinema.name}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold leading-snug mb-2">{notice.title}</h1>
        <p className="text-zinc-500 text-sm">
          {new Date(notice.createdAt).toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      <div className="border-t border-zinc-800 pt-6">
        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{notice.content}</p>
      </div>

      <div className="mt-10 pt-6 border-t border-zinc-800">
        <button
          onClick={() => router.back()}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          ← 목록으로 돌아가기
        </button>
      </div>
    </div>
  );
}
