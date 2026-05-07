import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type Period = '7d' | '30d' | '90d';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private getPeriodRange(period: Period) {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const end = new Date();
    const start = new Date(end.getTime() - days * 86_400_000);
    return { start, end, days };
  }

  async getKpi(period: Period) {
    const { start, end } = this.getPeriodRange(period);

    const [revenueAgg, reservationCount, totalCustomers, activeUsers] =
      await Promise.all([
        this.prisma.reservation.aggregate({
          where: { status: 'PAID', paidAt: { gte: start, lte: end } },
          _sum: { totalAmount: true },
        }),
        this.prisma.reservation.count({
          where: { status: 'PAID', paidAt: { gte: start, lte: end } },
        }),
        this.prisma.customer.count({ where: { isActive: true } }),
        this.prisma.customer.count({
          where: {
            isActive: true,
            reservations: { some: { paidAt: { gte: start, lte: end } } },
          },
        }),
      ]);

    const totalRevenue = revenueAgg._sum.totalAmount ?? 0;
    return {
      totalRevenue,
      totalReservations: reservationCount,
      totalCustomers,
      activeUsers,
      avgOrderValue:
        reservationCount > 0 ? Math.floor(totalRevenue / reservationCount) : 0,
    };
  }

  async getSalesTrend(period: Period) {
    const { start, end, days } = this.getPeriodRange(period);

    const rows = await this.prisma.$queryRaw<
      { date: string; revenue: bigint; count: bigint }[]
    >`
      SELECT
        TO_CHAR("paidAt", 'YYYY-MM-DD') AS date,
        SUM("totalAmount")::bigint       AS revenue,
        COUNT(*)::bigint                 AS count
      FROM "Reservation"
      WHERE status = 'PAID'
        AND "paidAt" >= ${start}
        AND "paidAt" <= ${end}
      GROUP BY date
      ORDER BY date ASC
    `;

    const rowMap = new Map(rows.map((r) => [r.date, r]));

    // 빈 날짜 채워서 차트용 연속 배열 반환 (오래된 날짜 → 오늘)
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(end.getTime() - (days - 1 - i) * 86_400_000);
      const dateStr = d.toISOString().slice(0, 10);
      const row = rowMap.get(dateStr);
      return {
        date: dateStr,
        revenue: Number(row?.revenue ?? 0),
        count: Number(row?.count ?? 0),
      };
    });
  }

  async getGradeDistribution() {
    const [grades, grouped] = await Promise.all([
      this.prisma.membershipGrade.findMany({ orderBy: { minAmount: 'asc' } }),
      this.prisma.customer.groupBy({
        by: ['gradeId'],
        where: { isActive: true },
        _count: { _all: true },
      }),
    ]);

    const countMap = new Map(grouped.map((g) => [g.gradeId, g._count._all]));
    return grades.map((g) => ({
      gradeId: g.id,
      gradeName: g.displayName,
      count: countMap.get(g.id) ?? 0,
      bgColor: g.bgColor,
    }));
  }

  async getMoviesRevenue(period: Period, top: number) {
    const { start, end } = this.getPeriodRange(period);

    const reservations = await this.prisma.reservation.findMany({
      where: { status: 'PAID', paidAt: { gte: start, lte: end } },
      select: {
        totalAmount: true,
        screening: {
          select: {
            movie: { select: { id: true, title: true, posterUrl: true } },
          },
        },
      },
    });

    const map = new Map<
      number,
      { movie: any; revenue: number; count: number }
    >();
    for (const r of reservations) {
      const movie = r.screening.movie;
      const entry = map.get(movie.id) ?? { movie, revenue: 0, count: 0 };
      entry.revenue += r.totalAmount;
      entry.count += 1;
      map.set(movie.id, entry);
    }

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, top)
      .map(({ movie, revenue, count }) => ({
        movie,
        revenue,
        reservationCount: count,
      }));
  }

  async getCinemasRevenue(period: Period) {
    const { start, end } = this.getPeriodRange(period);

    const reservations = await this.prisma.reservation.findMany({
      where: { status: 'PAID', paidAt: { gte: start, lte: end } },
      select: {
        totalAmount: true,
        screening: {
          select: {
            screen: {
              select: {
                cinema: { select: { id: true, name: true, region: true } },
              },
            },
          },
        },
      },
    });

    const map = new Map<
      number,
      { cinema: any; revenue: number; count: number }
    >();
    for (const r of reservations) {
      const cinema = r.screening.screen.cinema;
      const entry = map.get(cinema.id) ?? { cinema, revenue: 0, count: 0 };
      entry.revenue += r.totalAmount;
      entry.count += 1;
      map.set(cinema.id, entry);
    }

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map(({ cinema, revenue, count }) => ({
        cinema,
        revenue,
        reservationCount: count,
      }));
  }

  async getSeatOccupancy(period: Period) {
    const { start, end } = this.getPeriodRange(period);

    // audienceCounts JSON 합산 + 영화관별 점유율 산출
    const rows = await this.prisma.$queryRaw<
      {
        cinema_id: number;
        cinema_name: string;
        screening_count: bigint;
        avg_capacity: number;
        occupied_seats: bigint;
      }[]
    >`
      SELECT
        c.id::int                                                    AS cinema_id,
        c.name                                                       AS cinema_name,
        COUNT(DISTINCT r."screeningId")::bigint                      AS screening_count,
        AVG(s."totalSeats")::float                                   AS avg_capacity,
        COALESCE(SUM(
          (SELECT SUM(val::int) FROM jsonb_each_text(r."audienceCounts") AS t(key, val))
        ), 0)::bigint                                                AS occupied_seats
      FROM "Reservation" r
      JOIN "Screening" sc ON r."screeningId" = sc.id
      JOIN "Screen"    s  ON sc."screenId"   = s.id
      JOIN "Cinema"    c  ON s."cinemaId"    = c.id
      WHERE r.status = 'PAID'
        AND r."paidAt" >= ${start}
        AND r."paidAt" <= ${end}
      GROUP BY c.id, c.name
      ORDER BY occupied_seats DESC
    `;

    return rows.map((r) => {
      const screeningCount = Number(r.screening_count);
      const occupiedSeats = Number(r.occupied_seats);
      const totalCapacity = Math.round(screeningCount * r.avg_capacity);
      return {
        cinemaId: r.cinema_id,
        cinemaName: r.cinema_name,
        screeningCount,
        avgCapacity: Math.round(r.avg_capacity),
        occupiedSeats,
        totalCapacity,
        occupancyRate:
          totalCapacity > 0
            ? Math.min(100, Math.round((occupiedSeats / totalCapacity) * 100))
            : 0,
      };
    });
  }

  async getCouponUsage(period: Period) {
    const { start, end } = this.getPeriodRange(period);

    const grouped = await this.prisma.userCoupon.groupBy({
      by: ['status'],
      where: { issuedAt: { gte: start, lte: end } },
      _count: { _all: true },
    });

    const total = grouped.reduce((s, g) => s + g._count._all, 0);
    const getCount = (status: string) =>
      grouped.find((g) => g.status === status)?._count._all ?? 0;

    return {
      total,
      used: getCount('USED'),
      available: getCount('AVAILABLE'),
      expired: getCount('EXPIRED'),
      usageRate: total > 0 ? Math.round((getCount('USED') / total) * 100) : 0,
    };
  }

  async getHourlyHeatmap(period: Period) {
    const { start, end } = this.getPeriodRange(period);

    const rows = await this.prisma.$queryRaw<
      { dow: number; hour: number; count: bigint }[]
    >`
      SELECT
        EXTRACT(DOW  FROM "paidAt")::int AS dow,
        EXTRACT(HOUR FROM "paidAt")::int AS hour,
        COUNT(*)::bigint                 AS count
      FROM "Reservation"
      WHERE status = 'PAID'
        AND "paidAt" >= ${start}
        AND "paidAt" <= ${end}
      GROUP BY dow, hour
    `;

    // grid[dow][hour] = count  (0=일, 1=월, ..., 6=토)
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const r of rows) {
      grid[r.dow][r.hour] = Number(r.count);
    }
    return grid;
  }

  async getPartnerStats(period: Period) {
    const { start, end } = this.getPeriodRange(period);

    const usages = await this.prisma.partnerDiscountUsage.findMany({
      where: { usedAt: { gte: start, lte: end } },
      select: {
        discountAmount: true,
        partnerDiscount: {
          select: {
            id: true,
            name: true,
            partnerName: true,
            partnerType: true,
            bgColor: true,
          },
        },
      },
    });

    const map = new Map<
      number,
      { partner: any; count: number; totalDiscount: number }
    >();
    for (const u of usages) {
      const pd = u.partnerDiscount;
      const entry = map.get(pd.id) ?? {
        partner: pd,
        count: 0,
        totalDiscount: 0,
      };
      entry.count += 1;
      entry.totalDiscount += u.discountAmount;
      map.set(pd.id, entry);
    }

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .map(({ partner, count, totalDiscount }) => ({
        partner,
        count,
        totalDiscount,
      }));
  }
}
