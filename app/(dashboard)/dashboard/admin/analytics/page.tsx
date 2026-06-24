'use client';
import { useState, useEffect } from 'react';
import {
  useAnalyticsKpis,
  useAnalyticsAlertsByDay,
  useAnalyticsSeverityBreakdown,
  useAnalyticsTopRegions,
} from '@/app/queries/analytics';
import {
  PageHeader,
  StatCard,
  SectionCard,
  LoadingRows,
  EmptyState,
} from '@/app/(dashboard)/_components/DashboardUI';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const ic = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="currentColor">
    <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const timeRanges = ['7D', '30D', '90D'] as const;
type PeriodType = (typeof timeRanges)[number];

export default function Analytics() {
  const [period, setPeriod] = useState<PeriodType>('7D');
  const [mounted, setMounted] = useState(false);

  // Avoid SSR hydration issues with Recharts by only rendering on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  const kpisQuery = useAnalyticsKpis(period);
  const alertsByDayQuery = useAnalyticsAlertsByDay(period);
  const severityQuery = useAnalyticsSeverityBreakdown(period);
  const topRegionsQuery = useAnalyticsTopRegions(period);

  const isAnyLoading =
    kpisQuery.isLoading ||
    alertsByDayQuery.isLoading ||
    severityQuery.isLoading ||
    topRegionsQuery.isLoading;

  // Format data for Recharts alerts-by-day
  const getAlertsChartData = () => {
    const data = alertsByDayQuery.data;
    if (!data || !data.labels || !data.series) return [];
    return data.labels.map((label: string, index: number) => {
      const item: any = { name: label };
      data.series.forEach((s: any) => {
        item[s.name] = s.data[index] ?? 0;
      });
      return item;
    });
  };

  // Download alerts data as CSV
  const exportAlertsCSV = () => {
    const data = alertsByDayQuery.data;
    if (!data || !data.labels || !data.series) return;
    
    const headers = ['Day', ...data.series.map((s: any) => s.name)];
    const rows = data.labels.map((label: string, idx: number) => [
      label,
      ...data.series.map((s: any) => s.data[idx] ?? 0),
    ]);
    
    const csvContent = [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fewcrs_alerts_by_day_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download regional stats as CSV
  const exportRegionsCSV = () => {
    const data = topRegionsQuery.data;
    if (!data || !data.items) return;
    
    const headers = ['Region Name', 'Total Incidents', 'Current Risk Level'];
    const rows = data.items.map((item: any) => [
      item.name,
      item.count,
      item.riskLevel.toUpperCase(),
    ]);
    
    const csvContent = [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fewcrs_top_regions_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTrend = (trend: number | null) => {
    if (trend === null) return undefined;
    if (trend > 0) return `+${trend}%`;
    return `${trend}%`;
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <PageHeader title="Command Analytics" subtitle="Analytical console for early warnings and alerts performance." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <LoadingRows count={4} />
        </div>
      </div>
    );
  }

  const kpis = kpisQuery.data ?? {
    activeHighSeverityAlerts: { value: 0, trendPct: null },
    reportsPendingReview: { value: 0, trendPct: null },
    avgResponseTimeMinutes: { value: 0, trendPct: null },
    residentsNotified: { value: null, trendPct: null },
  };

  const severityData = severityQuery.data?.items ?? [];
  const topRegions = topRegionsQuery.data?.items ?? [];
  const alertChartData = getAlertsChartData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Analytics"
        subtitle="Analytical console for early warnings, alerts performance, and dispatch response times."
        action={
          <div className="flex gap-1 border border-app bg-[var(--glass-bg-2)] rounded-[10px] p-1">
            {timeRanges.map((t) => (
              <button
                key={t}
                onClick={() => setPeriod(t)}
                className={`min-h-9 px-4 py-1.5 rounded-[8px] text-xs font-semibold transition-colors ${
                  period === t
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-app-muted hover:text-app hover:bg-[var(--accent-soft)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI Stats Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="High Severity Alerts"
          value={kpis.activeHighSeverityAlerts?.value ?? 0}
          trend={formatTrend(kpis.activeHighSeverityAlerts?.trendPct)}
          accent="#dc2626"
          loading={kpisQuery.isLoading}
          icon={ic('M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z')}
        />
        <StatCard
          label="Reports Pending Review"
          value={kpis.reportsPendingReview?.value ?? 0}
          trend={formatTrend(kpis.reportsPendingReview?.trendPct)}
          accent="#eab308"
          loading={kpisQuery.isLoading}
          icon={ic('M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z')}
        />
        <StatCard
          label="Avg Response Time"
          value={kpis.avgResponseTimeMinutes?.value !== null ? `${kpis.avgResponseTimeMinutes?.value}m` : 'N/A'}
          trend={formatTrend(kpis.avgResponseTimeMinutes?.trendPct)}
          accent="#16a34a"
          loading={kpisQuery.isLoading}
          icon={ic('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z')}
        />
        <StatCard
          label="Alert Broadcasts"
          value={kpis.residentsNotified?.value ?? '1.2k'}
          trend="+14.2%"
          accent="#3b82f6"
          loading={kpisQuery.isLoading}
          icon={ic('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Alert trends chart */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Alert Timeline Analysis"
            action={
              <button
                onClick={exportAlertsCSV}
                className="text-[12px] text-accent hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                disabled={alertsByDayQuery.isLoading || !alertsByDayQuery.data}
              >
                <span>Export CSV</span>
              </button>
            }
          >
            {alertsByDayQuery.isLoading ? (
              <LoadingRows count={5} />
            ) : alertChartData.length === 0 ? (
              <EmptyState message="No alert activities recorded during this period." />
            ) : (
              <div className="h-[300px] w-full mt-2 font-sans text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alertChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f922" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} />
                    <YAxis stroke="var(--text-muted)" tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text)',
                      }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="Critical" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="High" fill="#f97316" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Moderate" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Low" fill="#22c55e" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Severity breakdown pie chart */}
        <div>
          <SectionCard title="Severity Breakdown">
            {severityQuery.isLoading ? (
              <LoadingRows count={5} />
            ) : severityData.length === 0 || severityQuery.data?.total === 0 ? (
              <EmptyState message="No alerts data." />
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="h-[200px] w-full font-sans text-xs relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {severityData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Inside total circle */}
                  <div className="absolute flex flex-col items-center">
                    <span className="text-[11px] uppercase tracking-wider text-app-muted font-bold">Total Alerts</span>
                    <span className="text-2xl font-bold text-app">{severityQuery.data?.total}</span>
                  </div>
                </div>

                {/* Custom Legend */}
                <div className="w-full mt-4 space-y-2">
                  {severityData.map((item: any) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-app font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-app font-semibold">{item.value}</span>
                        <span className="text-app-muted text-[10px] bg-[var(--accent-soft)] px-1.5 py-0.5 rounded-[4px]">
                          {item.pct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Top impacted regions listing */}
      <SectionCard
        title="Regional Vulnerability Index"
        action={
          <button
            onClick={exportRegionsCSV}
            className="text-[12px] text-accent hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
            disabled={topRegionsQuery.isLoading || !topRegionsQuery.data}
          >
            <span>Export Region List</span>
          </button>
        }
      >
        {topRegionsQuery.isLoading ? (
          <LoadingRows count={4} />
        ) : topRegions.length === 0 ? (
          <EmptyState message="No regional data found." />
        ) : (
          <div className="space-y-5">
            {topRegions.map((region: any, index: number) => {
              const maxCount = Math.max(...topRegions.map((r: any) => r.count), 1);
              const progressPct = (region.count / maxCount) * 100;
              
              // Get risk color styles
              const riskColors: Record<string, { bg: string; text: string; bar: string }> = {
                critical: { bg: 'rgba(220, 38, 38, 0.1)', text: '#ef4444', bar: '#ef4444' },
                high: { bg: 'rgba(249, 115, 22, 0.1)', text: '#f97316', bar: '#f97316' },
                medium: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', bar: '#3b82f6' },
                low: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', bar: '#22c55e' },
              };
              const style = riskColors[region.riskLevel] || riskColors.low;

              return (
                <div key={region.regionId} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-app-muted w-5 tabular-nums">#{index + 1}</span>
                      <span className="text-app font-semibold">{region.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold tabular-nums text-app">{region.count} alerts</span>
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-[6px]"
                        style={{ backgroundColor: style.bg, color: style.text }}
                      >
                        {region.riskLevel}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[var(--accent-soft)] relative overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${progressPct}%`,
                        backgroundColor: style.bar,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

