'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

type Point = { date: string; revenue: number; count: number };

export default function SalesTrendChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => format(new Date(d), 'MM/dd')}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          width={44}
        />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6 }}
          labelStyle={{ color: '#cbd5e1' }}
          itemStyle={{ color: '#e2e8f0' }}
          formatter={(v: number) => [`₩${v.toLocaleString()}`, '매출']}
          labelFormatter={(label) =>
            format(new Date(label), 'PPP', { locale: ko })
          }
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#dc2626"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#dc2626' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
