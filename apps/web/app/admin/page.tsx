'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from '@/components/ui/card';
import './dashboard/dashboard.css';
import SalesTrendChart from './_components/SalesTrendChart';
import GradeDonutChart from './_components/GradeDonutChart';
import MoviesBarChart from './_components/MoviesBarChart';
import CinemasPieChart from './_components/CinemasPieChart';
import SeatOccupancyChart from './_components/SeatOccupancyChart';
import CouponUsageChart from './_components/CouponUsageChart';
import HourlyHeatmap from './_components/HourlyHeatmap';
import PartnerDiscountChart from './_components/PartnerDiscountChart';
import AvgOrderValueChart from './_components/AvgOrderValueChart';

// ── 타입 ─────────────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d';

type KPI = {
  totalRevenue: number;
  totalReservations: number;
  totalCustomers: number;
  activeUsers: number;
  avgOrderValue: number;
};

type SalesTrendItem = { date: string; revenue: number; count: number };

type GradeItem = {
  gradeId: number;
  gradeName: string;
  count: number;
  bgColor?: string | null;
};

type MovieRevenueItem = {
  movie: { id: number; title: string; posterUrl?: string | null };
  revenue: number;
  reservationCount: number;
};

type CinemaRevenueItem = {
  cinema: { id: number; name: string; region: string };
  revenue: number;
  reservationCount: number;
};

type SeatOccupancyItem = {
  cinemaId: number;
  cinemaName: string;
  occupancyRate: number;
  occupiedSeats: number;
  totalCapacity: number;
};

type CouponUsage = {
  total: number;
  used: number;
  available: number;
  expired: number;
  usageRate: number;
};

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

// ── API ───────────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function getToken() {
  return typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : '';
}

async function dashReq<T>(path: string): Promise<T> {
  const res = await fetch(`${API}/admin/dashboard/${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`오류 (${res.status})`);
  return res.json();
}

// ── 공통 UI ──────────────────────────────────────────────────────────────────

const PERIOD_LABEL: Record<Period, string> = {
  '7d': '7일',
  '30d': '30일',
  '90d': '90일',
};

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-lg bg-slate-800"
      style={{ height }}
    />
  );
}

function Empty({ height = 280 }: { height?: number }) {
  return (
    <div
      className="flex items-center justify-center text-slate-600 text-sm rounded-lg border border-dashed border-slate-800"
      style={{ height }}
    >
      데이터 없음
    </div>
  );
}

function ChartCard({
  title,
  loading,
  skeletonHeight,
  children,
  className = '',
}: {
  title: string;
  loading: boolean;
  skeletonHeight?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`bg-slate-900 border-slate-800 ${className}`}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardDescription className="text-slate-300 font-medium text-sm">
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? <ChartSkeleton height={skeletonHeight ?? 300} /> : children}
      </CardContent>
    </Card>
  );
}

// ── 대시보드 ──────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(true);

  const [kpi, setKpi] = useState<KPI | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendItem[]>([]);
  const [gradeDistrib, setGradeDistrib] = useState<GradeItem[]>([]);
  const [moviesRevenue, setMoviesRevenue] = useState<MovieRevenueItem[]>([]);
  const [cinemasRevenue, setCinemasRevenue] = useState<CinemaRevenueItem[]>([]);
  const [seatOccupancy, setSeatOccupancy] = useState<SeatOccupancyItem[]>([]);
  const [couponUsage, setCouponUsage] = useState<CouponUsage | null>(null);
  const [heatmap, setHeatmap] = useState<number[][]>([]);
  const [partnerStats, setPartnerStats] = useState<PartnerItem[]>([]);

  const load = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const [k, st, gd, mr, cr, so, cu, hh, ps] = await Promise.all([
        dashReq<KPI>(`kpi?period=${p}`),
        dashReq<SalesTrendItem[]>(`sales-trend?period=${p}`),
        dashReq<GradeItem[]>('grade-distribution'),
        dashReq<MovieRevenueItem[]>(`movies-revenue?period=${p}&top=10`),
        dashReq<CinemaRevenueItem[]>(`cinemas-revenue?period=${p}`),
        dashReq<SeatOccupancyItem[]>(`seat-occupancy?period=${p}`),
        dashReq<CouponUsage>(`coupon-usage?period=${p}`),
        dashReq<number[][]>(`hourly-heatmap?period=${p}`),
        dashReq<PartnerItem[]>(`partner-stats?period=${p}`),
      ]);
      setKpi(k);
      setSalesTrend(st);
      setGradeDistrib(gd);
      setMoviesRevenue(mr);
      setCinemasRevenue(cr);
      setSeatOccupancy(so);
      setCouponUsage(cu);
      setHeatmap(hh);
      setPartnerStats(ps);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period);
  }, [period, load]);

  // 매출 추이에서 일별 평균 객단가 계산
  const avgValueData = salesTrend.map((d) => ({
    date: d.date,
    avgOrderValue: d.count > 0 ? Math.round(d.revenue / d.count) : 0,
  }));

  const kpiCards = [
    {
      label: '총 매출',
      value: kpi ? `₩${kpi.totalRevenue.toLocaleString()}` : '—',
      sub: `${PERIOD_LABEL[period]} 기간`,
    },
    {
      label: '총 예매수',
      value: kpi ? `${kpi.totalReservations.toLocaleString()}건` : '—',
      sub: '결제 완료 기준',
    },
    {
      label: '총 회원수',
      value: kpi ? `${kpi.totalCustomers.toLocaleString()}명` : '—',
      sub: kpi ? `활성 ${kpi.activeUsers.toLocaleString()}명` : '활성 —',
    },
    {
      label: '평균 객단가',
      value: kpi ? `₩${kpi.avgOrderValue.toLocaleString()}` : '—',
      sub: '예매 1건 평균',
    },
  ];

  return (
    <div>
      {/* ── 헤더 + 기간 토글 ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">대시보드</h1>
          <p className="text-slate-400 text-sm mt-0.5">매출 및 운영 현황</p>
        </div>
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={[
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                period === p
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200',
              ].join(' ')}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI 카드 4개 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((card) => (
          <Card key={card.label} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400">{card.label}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-32 animate-pulse rounded bg-slate-800 mb-1" />
              ) : (
                <div className="text-2xl font-bold text-white">{card.value}</div>
              )}
              <div className="text-xs text-slate-500 mt-1">{card.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── 차트 그리드 ── */}
      <div className="space-y-4">

        {/* Row 1: 매출 추이 (2/3) + 등급 분포 Donut (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="매출 추이" loading={loading} skeletonHeight={300} className="lg:col-span-2">
            {salesTrend.length > 0
              ? <SalesTrendChart data={salesTrend} />
              : <Empty height={300} />}
          </ChartCard>

          <ChartCard title="멤버십 등급 분포" loading={loading} skeletonHeight={300}>
            {gradeDistrib.length > 0
              ? <GradeDonutChart data={gradeDistrib} />
              : <Empty height={300} />}
          </ChartCard>
        </div>

        {/* Row 2: 영화별 매출 TOP10 (full width) */}
        <ChartCard title="영화별 매출 TOP10" loading={loading} skeletonHeight={400}>
          {moviesRevenue.length > 0
            ? <MoviesBarChart data={moviesRevenue} />
            : <Empty height={400} />}
        </ChartCard>

        {/* Row 3: 영화관별 매출 Pie (1/2) + 좌석 점유율 Bar (1/2) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="영화관별 매출" loading={loading} skeletonHeight={300}>
            {cinemasRevenue.length > 0
              ? <CinemasPieChart data={cinemasRevenue} />
              : <Empty height={300} />}
          </ChartCard>

          <ChartCard title="좌석 점유율" loading={loading} skeletonHeight={280}>
            {seatOccupancy.length > 0
              ? <SeatOccupancyChart data={seatOccupancy} />
              : <Empty height={280} />}
          </ChartCard>
        </div>

        {/* Row 4: 쿠폰 사용률 Donut (1/2) + 제휴 할인 Bar (1/2) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="쿠폰 사용률" loading={loading} skeletonHeight={280}>
            {couponUsage
              ? <CouponUsageChart data={couponUsage} />
              : <Empty height={280} />}
          </ChartCard>

          <ChartCard title="제휴 할인 사용 현황" loading={loading} skeletonHeight={280}>
            {partnerStats.length > 0
              ? <PartnerDiscountChart data={partnerStats} />
              : <Empty height={280} />}
          </ChartCard>
        </div>

        {/* Row 5: 시간대 히트맵 (2/3) + 평균 객단가 추이 (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="시간대별 예매 히트맵" loading={loading} skeletonHeight={160} className="lg:col-span-2">
            {heatmap.length > 0
              ? <HourlyHeatmap data={heatmap} />
              : <Empty height={160} />}
          </ChartCard>

          <ChartCard title="평균 객단가 추이" loading={loading} skeletonHeight={300}>
            {avgValueData.length > 0
              ? <AvgOrderValueChart data={avgValueData} />
              : <Empty height={300} />}
          </ChartCard>
        </div>

      </div>
    </div>
  );
}
