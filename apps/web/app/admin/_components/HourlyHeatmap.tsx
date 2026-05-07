'use client';

import React from 'react';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function HourlyHeatmap({ data }: { data: number[][] }) {
  const max = Math.max(...data.flatMap((row) => row), 1);

  return (
    <div className="overflow-x-auto">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto repeat(24, minmax(0, 1fr))',
          gap: 3,
        }}
      >
        {/* 헤더: 시간 레이블 */}
        <div />
        {HOURS.map((h) => (
          <div key={h} className="text-center text-[9px] text-slate-600 leading-none pb-0.5">
            {h % 6 === 0 ? String(h) : ''}
          </div>
        ))}

        {/* 요일별 행 */}
        {DAYS.map((day, dow) => (
          <React.Fragment key={dow}>
            <div className="text-[10px] text-slate-400 flex items-center justify-end pr-1.5 leading-none">
              {day}
            </div>
            {HOURS.map((h) => {
              const count = data[dow]?.[h] ?? 0;
              const intensity = Math.min(1, count / max);
              return (
                <div
                  key={h}
                  className="aspect-square rounded-[2px] cursor-default"
                  style={{ backgroundColor: `rgba(220, 38, 38, ${intensity || 0.05})` }}
                  title={`${day}요일 ${h}시: ${count}건`}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px] text-slate-600">적음</span>
        {[0.1, 0.3, 0.5, 0.7, 1.0].map((t, i) => (
          <div
            key={i}
            className="w-4 h-3 rounded-[2px]"
            style={{ backgroundColor: `rgba(220, 38, 38, ${t})` }}
          />
        ))}
        <span className="text-[10px] text-slate-600">많음</span>
      </div>
    </div>
  );
}
