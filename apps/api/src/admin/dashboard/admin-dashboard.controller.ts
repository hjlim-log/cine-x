import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { AdminDashboardService } from './admin-dashboard.service';

type Period = '7d' | '30d' | '90d';

function parsePeriod(p?: string): Period {
  if (p === '7d' || p === '90d') return p;
  return '30d';
}

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  @Get('kpi')
  kpi(@Query('period') period?: string) {
    return this.service.getKpi(parsePeriod(period));
  }

  @Get('sales-trend')
  salesTrend(@Query('period') period?: string) {
    return this.service.getSalesTrend(parsePeriod(period));
  }

  @Get('grade-distribution')
  gradeDistribution() {
    return this.service.getGradeDistribution();
  }

  @Get('movies-revenue')
  moviesRevenue(
    @Query('period') period?: string,
    @Query('top') top?: string,
  ) {
    const topN = top ? Math.max(1, Math.min(50, parseInt(top, 10) || 10)) : 10;
    return this.service.getMoviesRevenue(parsePeriod(period), topN);
  }

  @Get('cinemas-revenue')
  cinemasRevenue(@Query('period') period?: string) {
    return this.service.getCinemasRevenue(parsePeriod(period));
  }

  @Get('seat-occupancy')
  seatOccupancy(@Query('period') period?: string) {
    return this.service.getSeatOccupancy(parsePeriod(period));
  }

  @Get('coupon-usage')
  couponUsage(@Query('period') period?: string) {
    return this.service.getCouponUsage(parsePeriod(period));
  }

  @Get('hourly-heatmap')
  hourlyHeatmap(@Query('period') period?: string) {
    return this.service.getHourlyHeatmap(parsePeriod(period));
  }

  @Get('partner-stats')
  partnerStats(@Query('period') period?: string) {
    return this.service.getPartnerStats(parsePeriod(period));
  }
}
