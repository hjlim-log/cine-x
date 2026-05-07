'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS } from '@/lib/chart-colors';

type MovieItem = {
  movie: { id: number; title: string };
  revenue: number;
  reservationCount: number;
};

export default function MoviesBarChart({ data }: { data: MovieItem[] }) {
  const chartData = data.map((d, i) => ({
    title: d.movie.title.length > 14 ? d.movie.title.slice(0, 14) + '…' : d.movie.title,
    revenue: d.revenue,
    count: d.reservationCount,
    color: CHART_COLORS.palette[i % CHART_COLORS.palette.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 4, right: 80, bottom: 4, left: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="title"
          width={110}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6 }}
          itemStyle={{ color: '#e2e8f0' }}
          formatter={(v: number) => [`₩${v.toLocaleString()}`, '매출']}
        />
        <Bar
          dataKey="revenue"
          radius={[0, 4, 4, 0]}
          label={{
            position: 'right',
            fill: '#64748b',
            fontSize: 10,
            formatter: (v: number) => `₩${Math.round(v / 10000)}만`,
          }}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
