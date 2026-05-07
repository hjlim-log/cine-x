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

type OccupancyItem = {
  cinemaId: number;
  cinemaName: string;
  occupancyRate: number;
  occupiedSeats: number;
  totalCapacity: number;
};

function rateColor(rate: number) {
  if (rate >= 80) return '#dc2626';
  if (rate >= 50) return '#f59e0b';
  return '#16a34a';
}

export default function SeatOccupancyChart({ data }: { data: OccupancyItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="cinemaName"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6 }}
          itemStyle={{ color: '#e2e8f0' }}
          formatter={(_v, _name, props) => {
            const d = props.payload as OccupancyItem;
            return [
              `${d.occupancyRate}% (${d.occupiedSeats.toLocaleString()} / ${d.totalCapacity.toLocaleString()}석)`,
              '점유율',
            ];
          }}
        />
        <Bar dataKey="occupancyRate" radius={[4, 4, 0, 0]}>
          <LabelList
            dataKey="occupancyRate"
            position="top"
            formatter={(v: number) => `${v}%`}
            style={{ fill: '#94a3b8', fontSize: 11 }}
          />
          {data.map((entry, i) => (
            <Cell key={i} fill={rateColor(entry.occupancyRate)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
