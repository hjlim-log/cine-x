'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

type CouponUsage = {
  total: number;
  used: number;
  available: number;
  expired: number;
  usageRate: number;
};

const SLICES = [
  { key: 'used',      label: '사용',  color: '#16a34a' },
  { key: 'available', label: '가용',  color: '#2563eb' },
  { key: 'expired',   label: '만료',  color: '#475569' },
] as const;

export default function CouponUsageChart({ data }: { data: CouponUsage }) {
  const chartData = SLICES.map((s) => ({
    name: s.label,
    value: data[s.key],
    color: s.color,
  })).filter((d) => d.value > 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
            startAngle={90}
            endAngle={-270}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6 }}
            itemStyle={{ color: '#e2e8f0' }}
            formatter={(v: number, name: string) => [`${v.toLocaleString()}장`, name]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* 중앙 텍스트 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-3xl font-bold text-white">{data.usageRate}%</div>
        <div className="text-xs text-slate-400 mt-0.5">사용률</div>
      </div>

      {/* 범례 */}
      <div className="flex justify-center gap-4 mt-1">
        {SLICES.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-slate-400">
              {s.label} {data[s.key].toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
