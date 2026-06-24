import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import type {
  AlertsByDayResponse,
  KpisResponse,
  SeverityBreakdownResponse,
  TopRegionsResponse,
} from './types';

function periodToDays(period: '7D' | '30D' | '90D'): number {
  switch (period) {
    case '7D':
      return 7;
    case '30D':
      return 30;
    case '90D':
      return 90;
  }
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async kpis(period: '7D' | '30D' | '90D'): Promise<KpisResponse> {
    const days = periodToDays(period);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const prevFrom = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);
    const prevTo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [curAlerts, prevAlerts, curReports, prevReports] = await Promise.all([
      this.prisma.alert.findMany({
        where: { createdAt: { gte: from }, status: 'active' },
        select: { severity: true },
      }),
      this.prisma.alert.findMany({
        where: { createdAt: { gte: prevFrom, lt: prevTo }, status: 'active' },
        select: { severity: true },
      }),
      this.prisma.report.findMany({
        where: { updatedAt: { gte: from } },
        select: { status: true },
      }),
      this.prisma.report.findMany({
        where: { updatedAt: { gte: prevFrom, lt: prevTo } },
        select: { status: true },
      }),
    ]);

    const curHighSev = curAlerts.filter(
      (a) => a.severity === 'high' || a.severity === 'critical',
    ).length;
    const prevHighSev = prevAlerts.filter(
      (a) => a.severity === 'high' || a.severity === 'critical',
    ).length;

    const curReportsPending = curReports.filter((r) => r.status === 'pending').length;
    const prevReportsPending = prevReports.filter((r) => r.status === 'pending').length;

    const resolvedCur = await this.prisma.alert.findMany({
      where: { createdAt: { gte: from }, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    });

    const resolvedPrev = await this.prisma.alert.findMany({
      where: {
        createdAt: { gte: prevFrom, lt: prevTo },
        resolvedAt: { not: null },
      },
      select: { createdAt: true, resolvedAt: true },
    });

    const avgMs = (rows: Array<{ createdAt: Date; resolvedAt: Date | null }>) => {
      const diffs = rows
        .map((r) =>
          r.resolvedAt
            ? r.resolvedAt.getTime() - r.createdAt.getTime()
            : null,
        )
        .filter((v): v is number => typeof v === 'number');

      if (!diffs.length) return null;

      return diffs.reduce((a, b) => a + b, 0) / diffs.length;
    };

    const curAvg = avgMs(resolvedCur);
    const prevAvg = avgMs(resolvedPrev);

    const toMinutes = (ms: number) => ms / (60 * 1000);

    return {
      activeHighSeverityAlerts: {
        value: curHighSev,
        trendPct: trendPct(curHighSev, prevHighSev),
      },
      reportsPendingReview: {
        value: curReportsPending,
        trendPct: trendPct(curReportsPending, prevReportsPending),
      },
      avgResponseTimeMinutes: {
        value: curAvg == null ? null : Math.round(toMinutes(curAvg) * 10) / 10,
        trendPct:
          prevAvg == null || curAvg == null
            ? null
            : trendPct(curAvg, prevAvg),
      },
      residentsNotified: { value: null, trendPct: null },
    };
  }

  async alertsByDay(
    period: '7D' | '30D' | '90D',
    regionId?: string,
  ): Promise<AlertsByDayResponse> {
    const days = periodToDays(period);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.alert.findMany({
      where: { createdAt: { gte: from }, ...(regionId ? { regionId } : {}) },
      select: { createdAt: true, severity: true },
    });

    const buckets: Record<
      string,
      { low: number; medium: number; high: number; critical: number }
    > = {};

    for (const r of rows) {
      const key = r.createdAt.toISOString().slice(0, 10);
      if (!buckets[key]) {
        buckets[key] = { low: 0, medium: 0, high: 0, critical: 0 };
      }
      buckets[key][r.severity] += 1;
    }

    const keys = Object.keys(buckets).sort();

    return {
      labels: keys.map((k) => formatDayLabel(k)),
      series: [
        {
          name: 'Critical',
          color: '#ef4444',
          data: keys.map((k) => buckets[k]?.critical ?? 0),
        },
        {
          name: 'High',
          color: '#f97316',
          data: keys.map((k) => buckets[k]?.high ?? 0),
        },
