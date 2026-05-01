'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Spinner from '@/components/Spinner';

function FailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const message = searchParams.get('message') ?? '결제에 실패했습니다.';

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-red-400 mb-3">결제에 실패했습니다</h1>
      <p className="text-zinc-400 text-sm mb-8 break-words">{message}</p>
      <div className="flex gap-3 justify-center">
        <Link
          href={`/reservations/${params.id}/payment`}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
        >
          다시 시도하기
        </Link>
        <Link
          href="/movies"
          className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
        >
          취소하고 돌아가기
        </Link>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <FailContent />
    </Suspense>
  );
}
