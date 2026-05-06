'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  adminGetInquiry,
  adminAnswerInquiry,
  type AdminInquiry,
} from '@/lib/admin-api';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

const TYPE_LABEL: Record<string, string> = {
  ONE_ON_ONE: '1:1 문의',
  GROUP: '단체관람',
  LOST_ITEM: '분실물',
};

const CATEGORY_LABEL: Record<string, string> = {
  CINEMA: '영화관',
  MEMBERSHIP: '멤버십',
  RESERVATION: '예매',
  EVENT: '이벤트',
  OTHER: '기타',
};

const STATUS_COLOR: Record<string, string> = {
  RECEIVED: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
  PROCESSING: 'bg-blue-900/40 text-blue-400 border-blue-800',
  COMPLETED: 'bg-emerald-900/40 text-emerald-400 border-emerald-800',
};

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: '미답변',
  PROCESSING: '처리 중',
  COMPLETED: '답변 완료',
};

const GROUP_TYPE_LABEL: Record<string, string> = {
  GROUP_VIEWING: '단체 관람',
  VENUE_RENTAL: '대관',
};

const LOST_CATEGORY_LABEL: Record<string, string> = {
  PHONE: '휴대폰',
  WALLET: '지갑',
  BAG: '가방',
  GLASSES: '안경',
  CLOTHING: '의류',
  OTHER: '기타',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="text-slate-500 text-sm w-24 shrink-0">{label}</dt>
      <dd className="text-slate-200 text-sm flex-1">{value}</dd>
    </div>
  );
}

export default function InquiryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [inquiry, setInquiry] = useState<AdminInquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<'PROCESSING' | 'COMPLETED'>('COMPLETED');
  const [submitting, setSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    adminGetInquiry(id)
      .then((inq) => {
        setInquiry(inq);
        if (inq.answer) setAnswer(inq.answer);
        if (inq.status === 'PROCESSING') setStatus('PROCESSING');
      })
      .catch((e) => toast((e as Error).message, 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (answer.trim().length < 10) {
      toast('답변은 최소 10자 이상 입력하세요.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await adminAnswerInquiry(id, {
        answer: answer.trim(),
        status,
      });
      setInquiry(updated);
      setEditMode(false);
      toast('답변이 등록되었습니다.', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-12 justify-center">
        <span className="inline-block w-4 h-4 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
        불러오는 중...
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="text-slate-400 text-sm py-12 text-center">
        문의를 찾을 수 없습니다.
      </div>
    );
  }

  const isAnswered = inquiry.status === 'COMPLETED';
  const showForm = !isAnswered || editMode;

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/admin/inquiries')}
          className="border-slate-700 text-slate-400 hover:bg-slate-800"
        >
          ← 목록
        </Button>
        <h1 className="text-2xl font-bold text-white">문의 #{inquiry.id}</h1>
        <Badge className={`border text-xs ${STATUS_COLOR[inquiry.status]}`}>
          {STATUS_LABEL[inquiry.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 왼쪽: 문의 상세 (3/5) */}
        <div className="lg:col-span-3 space-y-4">

          {/* 작성자 + 메타 */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              작성자 정보
            </h2>
            <dl className="space-y-2.5">
              <InfoRow label="이름" value={inquiry.customer.name} />
              <InfoRow label="이메일" value={inquiry.customer.email} />
              <InfoRow
                label="문의 유형"
                value={
                  <span className="text-xs bg-slate-700 text-slate-200 px-2 py-0.5 rounded">
                    {TYPE_LABEL[inquiry.type] ?? inquiry.type}
                  </span>
                }
              />
              {inquiry.category && (
                <InfoRow
                  label="카테고리"
                  value={CATEGORY_LABEL[inquiry.category] ?? inquiry.category}
                />
              )}
              {inquiry.cinema && (
                <InfoRow label="영화관" value={inquiry.cinema.name} />
              )}
              <InfoRow
                label="작성일"
                value={new Date(inquiry.createdAt).toLocaleString('ko-KR')}
              />
            </dl>
          </div>

          {/* 문의 본문 */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              문의 내용
            </h2>
            <div className="text-white font-semibold text-base mb-3">{inquiry.title}</div>
            <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed bg-slate-800/40 rounded-lg p-4">
              {inquiry.content}
            </div>
          </div>

          {/* 단체관람 상세 */}
          {inquiry.groupDetail && (
            <div className="bg-slate-900 rounded-xl border border-blue-900/40 p-5">
              <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
                단체관람 정보
              </h2>
              <dl className="space-y-2.5">
                <InfoRow
                  label="유형"
                  value={GROUP_TYPE_LABEL[inquiry.groupDetail.groupType] ?? inquiry.groupDetail.groupType}
                />
                <InfoRow label="예상 인원" value={`${inquiry.groupDetail.expectedCount}명`} />
                <InfoRow
                  label="희망 날짜"
                  value={new Date(inquiry.groupDetail.preferredDate).toLocaleDateString('ko-KR')}
                />
                <InfoRow label="희망 시간" value={inquiry.groupDetail.preferredTime} />
                <InfoRow label="연락처" value={inquiry.groupDetail.contactPhone} />
              </dl>
            </div>
          )}

          {/* 분실물 상세 */}
          {inquiry.lostItemDetail && (
            <div className="bg-slate-900 rounded-xl border border-amber-900/40 p-5">
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">
                분실물 정보
              </h2>
              <dl className="space-y-2.5">
                <InfoRow
                  label="분실 날짜"
                  value={new Date(inquiry.lostItemDetail.lostDate).toLocaleDateString('ko-KR')}
                />
                {inquiry.lostItemDetail.lostTime && (
                  <InfoRow label="분실 시간" value={inquiry.lostItemDetail.lostTime} />
                )}
                <InfoRow
                  label="물품 종류"
                  value={LOST_CATEGORY_LABEL[inquiry.lostItemDetail.itemCategory] ?? inquiry.lostItemDetail.itemCategory}
                />
                <InfoRow label="분실 장소" value={inquiry.lostItemDetail.lostPlace} />
                <InfoRow
                  label="물품 설명"
                  value={
                    <span className="whitespace-pre-wrap">
                      {inquiry.lostItemDetail.itemDescription}
                    </span>
                  }
                />
              </dl>
            </div>
          )}
        </div>

        {/* 오른쪽: 답변 영역 (2/5) */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                답변
              </h2>
              {isAnswered && !editMode && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditMode(true)}
                  className="h-6 px-2 text-xs border-slate-700 text-slate-400 hover:bg-slate-800"
                >
                  수정
                </Button>
              )}
            </div>

            {/* 기존 답변 표시 (완료 + 편집 모드 아닐 때) */}
            {isAnswered && !editMode ? (
              <div className="space-y-3">
                <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed bg-slate-800/40 rounded-lg p-4">
                  {inquiry.answer}
                </div>
                {inquiry.answeredAt && (
                  <div className="text-xs text-slate-500 text-right">
                    답변일: {new Date(inquiry.answeredAt).toLocaleString('ko-KR')}
                  </div>
                )}
              </div>
            ) : (
              /* 답변 작성 폼 */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-slate-300 text-sm mb-1.5 block">
                    답변 내용{' '}
                    <span className="text-slate-500 font-normal">(최소 10자)</span>
                  </Label>
                  <Textarea
                    required
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    minLength={10}
                    rows={8}
                    placeholder="고객의 문의에 대한 답변을 작성하세요."
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 resize-none text-sm leading-relaxed"
                  />
                  <div
                    className={[
                      'text-xs text-right mt-1',
                      answer.trim().length < 10 ? 'text-slate-600' : 'text-emerald-600',
                    ].join(' ')}
                  >
                    {answer.trim().length}자
                  </div>
                </div>

                <Separator className="bg-slate-800" />

                <div>
                  <Label className="text-slate-300 text-sm mb-2 block">처리 상태</Label>
                  <div className="space-y-2">
                    {[
                      {
                        value: 'COMPLETED' as const,
                        label: '답변 완료',
                        desc: '문의가 해결됐습니다.',
                        color: 'border-emerald-500 bg-emerald-900/20',
                      },
                      {
                        value: 'PROCESSING' as const,
                        label: '처리 중',
                        desc: '추가 확인이 필요합니다.',
                        color: 'border-blue-500 bg-blue-900/20',
                      },
                    ].map((s) => (
                      <label
                        key={s.value}
                        className={[
                          'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                          status === s.value
                            ? s.color
                            : 'border-slate-700 hover:border-slate-600',
                        ].join(' ')}
                      >
                        <input
                          type="radio"
                          name="status"
                          value={s.value}
                          checked={status === s.value}
                          onChange={() => setStatus(s.value)}
                          className="accent-red-500 mt-0.5"
                        />
                        <div>
                          <div className="text-sm font-medium text-white">{s.label}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{s.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  {editMode && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditMode(false);
                        setAnswer(inquiry.answer ?? '');
                      }}
                      className="border-slate-700 text-slate-400 hover:bg-slate-800 flex-1"
                    >
                      취소
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={submitting || answer.trim().length < 10}
                    className="bg-red-600 hover:bg-red-700 text-white flex-1"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        등록 중...
                      </span>
                    ) : editMode ? (
                      '답변 수정'
                    ) : (
                      '답변 등록'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
