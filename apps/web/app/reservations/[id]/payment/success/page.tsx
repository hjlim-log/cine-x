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
      .then(({ reservationId, membershipResult }) => {
        // 결제 후 등급이 바뀔 수 있으므로 Navbar 캐시 무효화
        sessionStorage.removeItem('membershipGrade');
        let url = `/reservations/complete?id=${reservationId}`;
        if (membershipResult?.upgraded) {
          url += `&upgraded=true&fromGrade=${encodeURIComponent(membershipResult.oldGrade)}&toGrade=${encodeURIComponent(membershipResult.newGrade)}`;
        }
        router.replace(url);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : '결제 확인에 실패했습니다.';
        // 백엔드 메시지에 "자동 취소" 포함 = 제휴할인 카드사 불일치로 환불된 케이스
        const reason = msg.includes('자동 취소') ? 'partner-mismatch' : 'other';
        router.replace(
          `/reservations/${params.id}/payment/fail?reason=${reason}&message=${encodeURIComponent(msg)}`,
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
