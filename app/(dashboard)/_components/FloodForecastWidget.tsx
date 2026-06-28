"use client";

import { useRegionForecast } from "@/app/queries/flood-forecast";

const RISK_CONFIG: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  critical: {
    bg: "rgba(220,38,38,0.08)",
    border: "rgba(220,38,38,0.3)",
    text: "#dc2626",
    icon: "M10 2l1.5 5H16l-3.5 3 1.5 5L10 12.5 6 15l1.5-5L4 7h4.5L10 2z",
  },
  high: {
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.3)",
    text: "#f97316",
    icon: "M10 3v8M10 14v1",
  },
  medium: {
    bg: "rgba(202,138,4,0.08)",
    border: "rgba(202,138,4,0.3)",
    text: "#ca8a04",
    icon: "M10 3v8M10 14v1",
  },
  low: {
    bg: "rgba(22,163,74,0.08)",
    border: "rgba(22,163,74,0.3)",
    text: "#16a34a",
    icon: "M5 12l3 3 7-7",
  },
};

const TREND_ICONS: Record<string, string> = {
  rising: "M4 16l6-6 4 4 6-8",
  stable: "M4 12h16",
  falling: "M16 16l-6-6-4 4-6-8",
};

export default function FloodForecastWidget({ regionId }: { regionId?: string }) {
  const forecast = useRegionForecast(regionId || "00000000-0000-0000-0000-000000000001");

  if (!forecast.data) {
    return (
      <div className="surface-card rounded-[14px] p-6 border border-app">
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-app-muted text-[13px]">Loading forecast...</p>
        </div>
      </div>
    );
  }

  const { data } = forecast;
  const config = RISK_CONFIG[data.riskLevel];

  return (
    <div
      className="surface-card rounded-[14px] p-6 border relative overflow-hidden"
      style={{ borderColor: config.border }}
    >
      {/* Background pattern for critical/high */}
      {(data.riskLevel === "critical" || data.riskLevel === "high") && (
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, ${config.text} 0, ${config.text} 1px, transparent 0, transparent 10px)`,
          }}
        />
      )}

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2a6 6 0 016 6c0 4-6 10-6 10S4 12 4 8a6 6 0 016-6z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
              />
            </svg>
            <h3 className="text-[15px] font-[650] text-app">Flood Forecast</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-app-muted">Confidence</span>
            <span className="text-[14px] font-bold text-app">{data.confidence}%</span>
          </div>
        </div>

        {/* Risk Level */}
        <div className="flex items-center gap-4 mb-5 p-4 rounded-[12px]" style={{ background: config.bg }}>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{ background: `${config.text}15` }}
          >
            {data.riskLevel === "critical" || data.riskLevel === "high" ? (
              <span className="relative flex w-4 h-4">
                <span
                  className="animate-ping absolute inset-0 rounded-full opacity-60"
                  style={{ background: config.text }}
                />
                <span className="relative rounded-full w-4 h-4" style={{ background: config.text }} />
              </span>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d={config.icon} stroke={config.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-bold uppercase tracking-wide" style={{ color: config.text }}>
              {data.riskLevel} Risk
            </p>
            {data.predictedFloodTime && (
              <p className="text-[13px] text-app mt-1 font-semibold">{data.predictedFloodTime}</p>
            )}
            <p className="text-[11px] text-app-muted mt-0.5">{data.regionName}</p>
          </div>
        </div>

        {/* Factors Grid */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {/* Weather */}
          <div className="p-3 rounded-[10px] border border-app bg-[var(--glass-bg)]">
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-[#0369a1]">
                <path
                  d="M6 16a4 4 0 01-1-7.9A5 5 0 0116 7a3.5 3.5 0 013 5.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[11px] font-semibold text-app-muted uppercase">Weather</span>
            </div>
            <p className="text-[18px] font-bold text-app">{data.factors.weather.rainfall24h}mm</p>
            <p className="text-[10px] text-app-muted mt-0.5">{data.factors.weather.intensity}</p>
          </div>

          {/* Sensors */}
          <div className="p-3 rounded-[10px] border border-app bg-[var(--glass-bg)]">
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-[#0369a1]">
                <path
                  d="M10 3v14M4 10h12"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[11px] font-semibold text-app-muted uppercase">Water</span>
            </div>
            <p className="text-[18px] font-bold text-app">{Math.round(data.factors.sensors.avgWaterLevel * 100)}%</p>
            <div className="flex items-center gap-1 mt-0.5">
              <svg width="10" height="10" viewBox="0 0 20 20" fill="none" style={{
                color: data.factors.sensors.trend === 'rising' ? '#dc2626' : data.factors.sensors.trend === 'falling' ? '#16a34a' : '#ca8a04'
              }}>
                <path d={TREND_ICONS[data.factors.sensors.trend]} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-[10px] text-app-muted capitalize">{data.factors.sensors.trend}</span>
            </div>
          </div>

          {/* Geographic */}
          <div className="p-3 rounded-[10px] border border-app bg-[var(--glass-bg)]">
            <div className="flex items-center gap-2 mb-2">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-[#0369a1]">
                <path
                  d="M7 3L3 5v12l4-2 6 2 4-2V3l-4 2-6-2z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[11px] font-semibold text-app-muted uppercase">Area</span>
            </div>
            <p className="text-[18px] font-bold text-app">{data.factors.geographic.score}</p>
            <p className="text-[10px] text-app-muted mt-0.5 line-clamp-1">{data.factors.geographic.drainageCapacity}</p>
          </div>
        </div>

        {/* Top Recommendations */}
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-app-muted uppercase tracking-wide mb-2">Recommended Actions</p>
          {data.recommendations.slice(0, 3).map((rec, i) => (
            <div key={i} className="flex items-start gap-2 text-[13px] text-app">
              <span className="text-accent mt-0.5">•</span>
              <span className="flex-1 leading-snug">{rec}</span>
            </div>
          ))}
        </div>

        {/* Auto-alert indicator */}
        {data.alertThresholdReached && (
          <div className="mt-4 p-3 rounded-[10px] bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.3)]">
            <p className="text-[12px] font-semibold text-[#dc2626] flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 7a5 5 0 00-10 0c0 5.5-2 7-2 7h14s-2-1.5-2-7"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Alert threshold reached - Notifications sent
            </p>
          </div>
        )}

        {/* Last updated */}
        <p className="text-[10px] text-app-muted mt-4 text-center">
          Auto-updates every 5 minutes • Next check: {new Date(Date.now() + 300000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
