'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS } from '@/lib/chart-colors';

type PartnerItem = {
  partner: {
    id: number;
    name: string;
    partnerName: string;
    partnerType: string;
    bgColor?: string | null;
  };
  count: number;
  totalDiscount: number;
};

export default function PartnerDiscountChart({ data }: { data: PartnerItem[] }) {
  const chartData = data.slice(0, 8).map((d, i) => ({
    name: d.partner.partnerName,
    count: d.count,
    totalDiscount: d.totalDiscount,
    color: d.partner.bgColor?.startsWith('#')
      ? d.partner.bgColor
      : CHART_COLORS.palette[i % CHART_COLORS.palette.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 4, right: 72, bottom: 4, left: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={72}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6 }}
          itemStyle={{ color: '#e2e8f0' }}
          formatter={(v: number, _name, props) => [
            `${v}건 · ₩${props.payload.totalDiscount.toLocaleString()} 할인`,
            '사용 횟수',
          ]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="count"
            position="right"
            formatter={(v: number) => `${v}건`}
            style={{ fill: '#64748b', fontSize: 10 }}
          />
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
