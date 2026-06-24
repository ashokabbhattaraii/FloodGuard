export interface KpiItem {
  value: number | null;
  trendPct: number | null;
}

export interface KpisResponse {
  activeHighSeverityAlerts: KpiItem;
  reportsPendingReview: KpiItem;
  avgResponseTimeMinutes: KpiItem;
  residentsNotified: KpiItem;
}

export interface AlertsByDaySeries {
  name: string;
  color: string;
  data: number[];
}

export interface AlertsByDayResponse {
  labels: string[];
  series: AlertsByDaySeries[];
}

export interface SeverityBreakdownItem {
  name: string;
  value: number;
  pct: number;
  color: string;
}

export interface SeverityBreakdownResponse {
  total: number;
  items: SeverityBreakdownItem[];
}

export interface TopRegionItem {
  regionId: string;
  name: string;
  count: number;
  riskLevel: string;
  deltaPct: number | null;
}

export interface TopRegionsResponse {
  items: TopRegionItem[];
}
