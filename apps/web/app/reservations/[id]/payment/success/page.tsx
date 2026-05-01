'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { confirmPayment } from '@/lib/api';
import Spinner from '@/components/Spinner';

function SuccessContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const paymentKey = searchParams.get('paymentKey') ?? '';
    const orderId = searchParams.get('orderId') ?? '';
    const amount = Number(searchParams.get('amount') ?? '0');
    const token = localStorage.getItem('token') ?? '';

    confirmPayment({ paymentKey, orderId, amount }, token)
      .then(({ reservationId }) => {
        router.replace(`/reservations/complete?id=${reservationId}`);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : '결제 확인에 실패했습니다.';
        router.replace(
          `/reservations/${params.id}/payment/fail?message=${encodeURIComponent(msg)}`,
        );
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-zinc-400">결제 처리 중...</p>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SuccessContent />
    </Suspense>
  );
}
