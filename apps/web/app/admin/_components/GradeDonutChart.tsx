'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '@/lib/chart-colors';

type GradeItem = { gradeId: number; gradeName: string; count: number; bgColor?: string | null };

export default function GradeDonutChart({ data }: { data: GradeItem[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);

  const chartData = data.map((d, i) => ({
    name: d.gradeName,
    value: d.count,
    color: d.bgColor?.startsWith('#') ? d.bgColor : CHART_COLORS.palette[i % CHART_COLORS.palette.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          label={({ name, count }: { name: string; count: number }) =>
            total > 0 ? `${name}: ${count ?? 0}` : ''
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
          formatter={(v: number, name: string) => [`${v.toLocaleString()}명`, name]}
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
