'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMyInquiry, markInquiryRead, deleteInquiry, type InquiryDetail } from '@/lib/api';
import Spinner from '@/components/Spinner';

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

const GROUP_TYPE_LABEL: Record<string, string> = {
  SCHOOL: '학교 단체',
  COMPANY: '기업 단체',
  SOCIAL: '소셜 모임',
  OTHER: '기타',
};

const ITEM_CATEGORY_LABEL: Record<string, string> = {
  PHONE: '휴대폰',
  WALLET: '지갑',
  BAG: '가방',
  CLOTHES: '의류',
  OTHER: '기타',
};

export default function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const readMarked = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login?redirect=/my/inquiries'); return; }
    getMyInquiry(Number(id), token)
      .then((data) => {
        setInquiry(data);
        if (data.status === 'COMPLETED' && !data.notificationRead && !readMarked.current) {
          readMarked.current = true;
          markInquiryRead(Number(id), token).catch(() => {});
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleDelete() {
    if (!confirm('문의를 삭제하시겠습니까?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setDeleting(true);
    try {
      await deleteInquiry(Number(id), token);
      router.replace('/my/inquiries');
    } catch {
      alert('삭제에 실패했습니다.');
      setDeleting(false);
    }
  }

  if (loading) return <Spinner />;

  if (error || !inquiry) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-zinc-400">문의를 찾을 수 없습니다.</p>
        <Link href="/my/inquiries" className="text-red-400 hover:text-red-300 text-sm underline">
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLOR[inquiry.type]}`}>
              {TYPE_LABEL[inquiry.type]}
            </span>
            <span className="text-xs bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">
              {STATUS_LABEL[inquiry.status] ?? inquiry.status}
            </span>
            {inquiry.cinema && (
              <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                {inquiry.cinema.name}
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold leading-snug">{inquiry.title}</h2>
          <p className="text-xs text-zinc-500">
            {new Date(inquiry.createdAt).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        {inquiry.status !== 'COMPLETED' && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="shrink-0 text-xs text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-700 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
          >
            {deleting ? '삭제중...' : '삭제'}
          </button>
        )}
      </div>

      {/* 문의 내용 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4">
        <p className="text-xs font-medium text-zinc-500 mb-2">문의 내용</p>
        <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">{inquiry.content}</p>
      </div>

      {/* 단체관람 상세 */}
      {inquiry.groupDetail && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4">
          <p className="text-xs font-medium text-zinc-500 mb-3">단체관람 정보</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-zinc-500">구분</dt>
            <dd className="text-zinc-200">{GROUP_TYPE_LABEL[inquiry.groupDetail.groupType] ?? inquiry.groupDetail.groupType}</dd>
            <dt className="text-zinc-500">인원</dt>
            <dd className="text-zinc-200">{inquiry.groupDetail.expectedCount}명</dd>
            <dt className="text-zinc-500">희망 날짜</dt>
            <dd className="text-zinc-200">{new Date(inquiry.groupDetail.preferredDate).toLocaleDateString('ko-KR')}</dd>
            <dt className="text-zinc-500">희망 시간</dt>
            <dd className="text-zinc-200">{inquiry.groupDetail.preferredTime}</dd>
            <dt className="text-zinc-500">연락처</dt>
            <dd className="text-zinc-200">{inquiry.groupDetail.contactPhone}</dd>
          </dl>
        </div>
      )}

      {/* 분실물 상세 */}
      {inquiry.lostItemDetail && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4">
          <p className="text-xs font-medium text-zinc-500 mb-3">분실물 정보</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-zinc-500">분실 날짜</dt>
            <dd className="text-zinc-200">{new Date(inquiry.lostItemDetail.lostDate).toLocaleDateString('ko-KR')}</dd>
            {inquiry.lostItemDetail.lostTime && (
              <>
                <dt className="text-zinc-500">분실 시간</dt>
                <dd className="text-zinc-200">{inquiry.lostItemDetail.lostTime}</dd>
              </>
            )}
            <dt className="text-zinc-500">물품 종류</dt>
            <dd className="text-zinc-200">{ITEM_CATEGORY_LABEL[inquiry.lostItemDetail.itemCategory] ?? inquiry.lostItemDetail.itemCategory}</dd>
            <dt className="text-zinc-500">분실 장소</dt>
            <dd className="text-zinc-200">{inquiry.lostItemDetail.lostPlace}</dd>
            <dt className="text-zinc-500">물품 설명</dt>
            <dd className="text-zinc-200 col-span-1">{inquiry.lostItemDetail.itemDescription}</dd>
          </dl>
        </div>
      )}

      {/* 답변 */}
      {inquiry.answer && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-green-400">답변</span>
            {inquiry.answeredAt && (
              <span className="text-xs text-zinc-500">
                {new Date(inquiry.answeredAt).toLocaleDateString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">{inquiry.answer}</p>
        </div>
      )}

      {!inquiry.answer && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4 text-center">
          <p className="text-sm text-zinc-500">아직 답변이 등록되지 않았습니다.</p>
        </div>
      )}

      <div className="mt-4">
        <Link
          href="/my/inquiries"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          ← 목록으로
        </Link>
      </div>
    </div>
  );
}
