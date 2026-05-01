'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getScreening, createReservation } from '@/lib/api';
import { toast } from '@/lib/toast';
import Spinner from '@/components/Spinner';
import type { ScreeningDetail, Seat } from '@/lib/types';

const BASE_PRICE = 12_000;

// 연속된 커플석 두 자리를 묶어 한 그룹으로 처리
type Segment =
  | { kind: 'seat'; seat: Seat }
  | { kind: 'empty'; col: number }
  | { kind: 'couple-pair'; left: Seat; right: Seat };

function buildRowSegments(cols: number[], seatMap: Map<string, Seat>, row: string): Segment[] {
  const segs: Segment[] = [];
  let i = 0;
  while (i < cols.length) {
    const col = cols[i];
    const seat = seatMap.get(`${row}${col}`);
    const nextCol = cols[i + 1];
    const nextSeat = nextCol !== undefined ? seatMap.get(`${row}${nextCol}`) : undefined;
    if (seat?.type?.name === '커플석' && nextSeat?.type?.name === '커플석') {
      segs.push({ kind: 'couple-pair', left: seat, right: nextSeat });
      i += 2;
    } else if (seat) {
      segs.push({ kind: 'seat', seat });
      i++;
    } else {
      segs.push({ kind: 'empty', col });
      i++;
    }
  }
  return segs;
}

function getSeatClass(seat: Seat, isBooked: boolean, isSelected: boolean, roundClass = 'rounded'): string {
  const base = `w-8 h-8 text-xs transition-colors flex items-center justify-center ${roundClass}`;
  if (isBooked)   return `${base} bg-zinc-700 text-zinc-600 cursor-not-allowed`;
  if (isSelected) return `${base} bg-red-600 text-white`;
  const name = seat.type?.name;
  if (name === '커플석')     return `${base} border-2 border-pink-400 text-pink-300 bg-pink-950/30 hover:bg-pink-900/50`;
  if (name === '장애인석')   return `${base} border-2 border-blue-400 text-blue-300 bg-blue-950/30 hover:bg-blue-900/50`;
  if (name === '리클라이너석') return `${base} border-2 border-yellow-500 text-yellow-300 bg-yellow-950/30 hover:bg-yellow-900/50`;
  return `${base} border border-zinc-500 text-zinc-300 hover:border-white hover:text-white`;
}

export default function ScreeningPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<ScreeningDetail | null>(null);
  const [seatMap, setSeatMap] = useState<Map<string, Seat>>(new Map());
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    getScreening(Number(params.id))
      .then((d) => {
        setData(d);
        const map = new Map<string, Seat>();
        for (const seat of d.screen.seats) {
          map.set(`${seat.row}${seat.number}`, seat);
        }
        setSeatMap(map);
      })
      .catch(() => setFetchError('상영 정보를 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, [params.id]);

  function toggleSeat(seatId: number) {
    setSelected((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId],
    );
  }

  async function handleBooking() {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/login?redirect=/screenings/${params.id}`);
      return;
    }
    if (selected.length === 0) {
      toast('좌석을 선택해주세요.', 'error');
      return;
    }
    setBooking(true);
    try {
      const reservation = await createReservation(
        { screeningId: Number(params.id), seatIds: selected },
        token,
      );
      router.push(`/reservations/${reservation.id}/payment`);
    } catch (e) {
      toast(e instanceof Error ? e.message : '예매에 실패했습니다.', 'error');
    } finally {
      setBooking(false);
    }
  }

  if (loading) return <Spinner />;

  if (fetchError) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{fetchError}</p>
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white text-sm">
          ← 돌아가기
        </button>
      </div>
    );
  }

  if (!data) return null;

  const bookedSet    = new Set(data.bookedSeatIds);
  const selectedSeats = data.screen.seats.filter((s) => selected.includes(s.id));

  // 실제 좌석 데이터에서 행·열 동적 계산
  const rows = Array.from(new Set(data.screen.seats.map((s) => s.row))).sort();
  const cols = Array.from(new Set(data.screen.seats.map((s) => s.number))).sort((a, b) => a - b);

  // 좌석 유형별 가격 합산
  const totalAmount = selectedSeats.reduce(
    (sum, s) => sum + BASE_PRICE + (s.type?.additionalPrice ?? 0),
    0,
  );
  const breakdown = selectedSeats.reduce((acc, s) => {
    const name = s.type?.name ?? '일반석';
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const breakdownText = Object.entries(breakdown)
    .map(([name, cnt]) => `${name} ${cnt}석`)
    .join(' + ');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 상단 정보 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold">{data.movie.title}</h1>
        <p className="text-zinc-400 text-sm mt-1 flex items-center flex-wrap gap-1">
          <span>{data.screen.cinema.name} · {data.screen.name}</span>
          {data.screen.type && (
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              data.screen.type.grade === '스페셜관'
                ? 'bg-yellow-900/60 text-yellow-400 border border-yellow-700'
                : 'bg-zinc-800 text-zinc-400'
            }`}>
              {data.screen.type.name}
            </span>
          )}
          <span>· {data.screenType}</span>
        </p>
        <p className="text-zinc-400 text-sm">
          {new Date(data.startTime).toLocaleString('ko-KR', {
            month: 'long', day: 'numeric', weekday: 'short',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>

      {/* 좌석 그리드 */}
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        {/* 스크린 */}
        <div className="mb-5">
          <div className="bg-zinc-500 h-1.5 rounded-full mx-auto w-3/4" />
          <p className="text-center text-zinc-500 text-xs mt-1.5 tracking-widest">SCREEN</p>
        </div>

        {/* 좌석 범례 */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-5 text-xs text-zinc-400 justify-center">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 border border-zinc-500 rounded inline-block" />일반
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 border-2 border-pink-400 rounded-lg bg-pink-950/30 inline-flex items-center justify-center text-[9px]">💕</span>커플
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 border-2 border-blue-400 rounded bg-blue-950/30 inline-flex items-center justify-center text-[9px]">♿</span>장애인
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 border-2 border-yellow-500 rounded bg-yellow-950/30 inline-flex items-center justify-center text-[9px]">👑</span>리클라이너
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 bg-red-600 rounded inline-block" />선택됨
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 bg-zinc-700 rounded inline-block" />예매됨
          </span>
        </div>

        {/* 좌석 그리드 */}
        <div className="space-y-2 overflow-x-auto pb-1">
          {rows.map((row) => (
            <div key={row} className="flex items-center gap-1.5 min-w-max mx-auto">
              <span className="text-xs text-zinc-500 w-4 shrink-0">{row}</span>
              {buildRowSegments(cols, seatMap, row).map((seg, gi) => {
                if (seg.kind === 'empty') {
                  return <div key={`e-${seg.col}`} className="w-8 h-8" />;
                }

                if (seg.kind === 'couple-pair') {
                  return (
                    <div key={`p-${gi}`} className="flex">
                      {[seg.left, seg.right].map((seat, ci) => {
                        const isBooked   = bookedSet.has(seat.id);
                        const isSelected = selected.includes(seat.id);
                        const roundClass = ci === 0
                          ? 'rounded-l-xl rounded-r-none'
                          : 'rounded-r-xl rounded-l-none';
                        return (
                          <button
                            key={seat.id}
                            disabled={isBooked}
                            onClick={() => toggleSeat(seat.id)}
                            title={`${seat.row}${seat.number} (커플석)`}
                            className={getSeatClass(seat, isBooked, isSelected, roundClass)}
                          >
                            {seat.number}
                          </button>
                        );
                      })}
                    </div>
                  );
                }

                // 단일 좌석
                const { seat } = seg;
                const isBooked   = bookedSet.has(seat.id);
                const isSelected = selected.includes(seat.id);
                return (
                  <button
                    key={seat.id}
                    disabled={isBooked}
                    onClick={() => toggleSeat(seat.id)}
                    title={`${seat.row}${seat.number}${seat.type ? ` (${seat.type.name})` : ''}`}
                    className={getSeatClass(seat, isBooked, isSelected)}
                  >
                    {seat.type?.name === '장애인석' ? '♿' : seat.number}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 선택 요약 + 예매 버튼 */}
      <div className="mt-6 bg-zinc-900 rounded-xl p-5 border border-zinc-800">
        <div className="flex justify-between items-center mb-3">
          <span className="text-zinc-400 text-sm">선택한 좌석</span>
          <span className="text-sm font-medium">
            {selectedSeats.length === 0
              ? '없음'
              : selectedSeats.map((s) => `${s.row}${s.number}`).join(', ')}
          </span>
        </div>
        <div className="flex justify-between items-start mb-5">
          <span className="text-zinc-400 text-sm">총 금액</span>
          <div className="text-right">
            <div className="text-lg font-bold text-red-400">
              {totalAmount.toLocaleString()}원
            </div>
            {breakdownText && (
              <div className="text-xs text-zinc-500 mt-0.5">{breakdownText}</div>
            )}
          </div>
        </div>
        <button
          onClick={handleBooking}
          disabled={booking || selected.length === 0}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {booking ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              처리 중...
            </span>
          ) : '예매하기'}
        </button>
      </div>
    </div>
  );
}
