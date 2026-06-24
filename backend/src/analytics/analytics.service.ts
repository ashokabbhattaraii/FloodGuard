import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsByDayResponse, KpisResponse, SeverityBreakdownResponse, TopRegionsResponse } from './types';

function periodToDays(period: '7D' | '30D' | '90D'): number {
  switch (period) {
    case '7D':
      return 7;
    case '30D':
      return 30;
    case '90D':
      return 90;
    default:
      return 7;
  }
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private whereWindow(period: '7D' | '30D' | '90D', extra?: { regionId?: string }) {
    const days = periodToDays(period);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return {
      createdAt: { gte: from },
      ...(extra?.regionId ? { regionId: extra.regionId } : {}),
    };
  }

  async kpis(period: '7D' | '30D' | '90D'): Promise<KpisResponse> {
    const days = periodToDays(period);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const prevFrom = new Date(Date.now() - (days * 2) * 24 * 60 * 60 * 1000);
    const prevTo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Alerts: active counts + severity counts
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

    const curHighSev = curAlerts.filter((a) => a.severity === 'high' || a.severity === 'critical').length;
    const prevHighSev = prevAlerts.filter((a) => a.severity === 'high' || a.severity === 'critical').length;

    const curReportsPending = curReports.filter((r) => r.status === 'pending').length;
    const prevReportsPending = prevReports.filter((r) => r.status === 'pending').length;

    // Avg response time: (resolvedAt - createdAt) for resolved alerts
    const resolvedCur = await this.prisma.alert.findMany({
      where: { createdAt: { gte: from }, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    });
    const resolvedPrev = await this.prisma.alert.findMany({
      where: { createdAt: { gte: prevFrom, lt: prevTo }, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    });

    const avgMs = (rows: Array<{ createdAt: Date; resolvedAt: Date | null }>) => {
      const diffs = rows
        .map((r) => (r.resolvedAt ? r.resolvedAt.getTime() - r.createdAt.getTime() : null))
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
        trendPct: prevAvg == null || curAvg == null ? null : trendPct(curAvg, prevAvg),
      },
      // Stubs for “residents notified” until schema supports it: keep safe nulls
      residentsNotified: { value: null, trendPct: null },
    };
  }

  async alertsByDay(period: '7D' | '30D' | '90D', regionId?: string): Promise<AlertsByDayResponse> {
    const days = periodToDays(period);
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Build day buckets in JS, but aggregation is done via grouped queries using createdAt + severity.
    // We fetch counts per day+severity in SQL via Prisma groupBy if available; otherwise use findMany w/ select and bucket.
    // For simplicity and because dataset likely small, we bucket in memory but only using counts and severity.
    const rows = await this.prisma.alert.findMany({
      where: { createdAt: { gte: from }, ...(regionId ? { regionId } : {}) },
      select: { createdAt: true, severity: true },
    });

    const buckets: Record<string, { low: number; medium: number; high: number; critical: number }> = {};
    for (const r of rows) {
      const key = r.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!buckets[key]) buckets[key] = { low: 0, medium: 0, high: 0, critical: 0 };
      buckets[key][r.severity] += 1;
    }

    const keys = Object.keys(buckets).sort();
    return {
      labels: keys.map((k) => formatDayLabel(k)),
      series: [
        { name: 'Critical', color: '#ef4444', data: keys.map((k) => buckets[k]?.critical ?? 0) },
        { name: 'High', color: '#f97316', data: keys.map((k) => buckets[k]?.high ?? 0) },
        { name: 'Moderate', color: '#3b82f6', data: keys.map((k) => buckets[k]?.medium ?? 0) },
        { name: 'Low', color: '#22c55e', data: keys.map((k) => buckets[k]?.low ?? 0) },
      ],
    };
  }

  async severityBreakdown(period: '7D' | '30D' | '90D', regionId?: string): Promise<SeverityBreakdownResponse> {
    const from = new Date(Date.now() - periodToDays(period) * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.alert.findMany({
      where: { createdAt: { gte: from }, ...(regionId ? { regionId } : {}) },
      select: { severity: true },
    });
    const counts = { low: 0, medium: 0, high: 0, critical: 0 } as Record<string, number>;
    for (const r of rows) counts[r.severity] += 1;
    const total = rows.length || 1;

    return {
      total: rows.length,
      items: [
        { name: 'Critical', value: counts.critical, pct: Math.round((counts.critical / total) * 1000) / 10, color: '#ef4444' },
        { name: 'High', value: counts.high, pct: Math.round((counts.high / total) * 1000) / 10, color: '#f97316' },
        { name: 'Moderate', value: counts.medium, pct: Math.round((counts.medium / total) * 1000) / 10, color: '#3b82f6' },
        { name: 'Low', value: counts.low, pct: Math.round((counts.low / total) * 1000) / 10, color: '#22c55e' },
      ],
    };
  }

  async topRegions(period: '7D' | '30D' | '90D', limit = 8): Promise<TopRegionsResponse> {
    const from = new Date(Date.now() - periodToDays(period) * 24 * 60 * 60 * 1000);
    // Aggregate alerts by region by fetching ids; then count in JS.
    // If you add Prisma groupBy in the future, we can optimize further.
    const rows = await this.prisma.alert.findMany({
      where: { createdAt: { gte: from } },
      select: { regionId: true, region: { select: { name: true } }, severity: true },
      take: 5000,
    });

    const map: Record<string, { regionId: string; name: string; count: number; high: number; critical: number }> = {};
    for (const r of rows) {
      const regionId = r.regionId ?? 'unknown';
      if (!map[regionId]) {
        map[regionId] = { regionId, name: r.region?.name ?? 'Unknown', count: 0, high: 0, critical: 0 };
      }
      map[regionId].count += 1;
      if (r.severity === 'high') map[regionId].high += 1;
      if (r.severity === 'critical') map[regionId].critical += 1;
    }

    const items = Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((x) => ({
        regionId: x.regionId,
        name: x.name,
        count: x.count,
        riskLevel: x.critical > 0 ? 'critical' : x.high > 0 ? 'high' : 'medium',
        deltaPct: null,
      }));

    return { items };
  }
}

function trendPct(current: number, prev: number) {
  if (prev === 0) return current === 0 ? 0 : null;
  return Math.round(((current - prev) / prev) * 1000) / 10;
}

function formatDayLabel(isoDate: string) {
  const d = new Date(isoDate + 'T00:00:00.000Z');
  // e.g. Mon
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}
