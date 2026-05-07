'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '@/lib/chart-colors';

type CinemaItem = {
  cinema: { id: number; name: string; region: string };
  revenue: number;
  reservationCount: number;
};

export default function CinemasPieChart({ data }: { data: CinemaItem[] }) {
  const chartData = data.map((d, i) => ({
    name: d.cinema.name,
    value: d.revenue,
    count: d.reservationCount,
    color: CHART_COLORS.palette[i % CHART_COLORS.palette.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={0}
          outerRadius={90}
          paddingAngle={2}
          label={({ name, percent }) =>
            percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
          }
          labelLine={{ stroke: '#475569', strokeWidth: 1 }}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6 }}
          itemStyle={{ color: '#e2e8f0' }}
          formatter={(v: number, _name, props) => [
            `₩${v.toLocaleString()} · ${props.payload.count}건`,
            '매출',
          ]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
