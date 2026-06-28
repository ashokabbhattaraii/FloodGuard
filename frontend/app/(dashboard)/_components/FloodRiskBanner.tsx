"use client";

import { useRainfall } from "@/app/queries/weather";

const riskConfig: Record<string, { bg: string; border: string; text: string; label: string; icon: string }> = {
  critical: {
    bg: "rgba(220,38,38,0.08)",
    border: "rgba(220,38,38,0.3)",
    text: "#dc2626",
    label: "CRITICAL FLOOD RISK",
    icon: "M10 2l1.5 5H16l-3.5 3 1.5 5L10 12.5 6 15l1.5-5L4 7h4.5L10 2z",
  },
  high: {
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.3)",
    text: "#f97316",
    label: "HIGH FLOOD RISK",
    icon: "M10 3v8M10 14v1",
  },
  medium: {
    bg: "rgba(202,138,4,0.08)",
    border: "rgba(202,138,4,0.3)",
    text: "#ca8a04",
    label: "MODERATE FLOOD RISK",
    icon: "M10 3v8M10 14v1",
  },
  low: {
    bg: "rgba(22,163,74,0.08)",
    border: "rgba(22,163,74,0.3)",
    text: "#16a34a",
    label: "LOW FLOOD RISK",
    icon: "M5 12l3 3 7-7",
  },
};

export default function FloodRiskBanner({ city = "Kathmandu" }: { city?: string }) {
  const { data, isLoading } = useRainfall(city);

  if (isLoading) {
    return (
      <div className="rounded-[14px] p-5 mb-6 animate-pulse bg-[var(--accent-soft)] h-[120px]" />
    );
  }

  if (!data) return null;

  const { floodRisk, accumulation, peakRainfall, maxProbability } = data;
  const config = riskConfig[floodRisk.level] || riskConfig.low;

  return (
    <div
      className="rounded-[14px] p-5 mb-6 border relative overflow-hidden"
      style={{ background: config.bg, borderColor: config.border }}
    >
      {(floodRisk.level === "critical" || floodRisk.level === "high") && (
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(45deg, ${config.text} 0, ${config.text} 1px, transparent 0, transparent 10px)`,
        }} />
      )}

      <div className="relative flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Risk level indicator */}
        <div className="flex items-center gap-3 lg:min-w-[220px]">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${config.text}15` }}>
            {floodRisk.level === "critical" || floodRisk.level === "high" ? (
              <span className="relative flex w-3 h-3">
                <span className="animate-ping absolute inset-0 rounded-full opacity-60" style={{ background: config.text }} />
                <span className="relative rounded-full w-3 h-3" style={{ background: config.text }} />
              </span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d={config.icon} stroke={config.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: config.text }}>{config.label}</p>
            <p className="text-[13px] font-semibold text-app mt-0.5">Score: {floodRisk.score}/100</p>
          </div>
        </div>

        {/* Rainfall accumulation stats */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AccumStat label="Next 6h" value={`${accumulation.next6h}mm`} highlight={accumulation.next6h > 10} color={config.text} />
          <AccumStat label="Next 12h" value={`${accumulation.next12h}mm`} highlight={accumulation.next12h > 20} color={config.text} />
          <AccumStat label="Next 24h" value={`${accumulation.next24h}mm`} highlight={accumulation.next24h > 30} color={config.text} />
          <AccumStat label="Rain Probability" value={`${maxProbability}%`} highlight={maxProbability > 80} color={config.text} />
        </div>
      </div>

      {/* Risk factors */}
      {floodRisk.factors.length > 0 && floodRisk.level !== "low" && (
        <div className="relative mt-3 flex flex-wrap gap-2">
          {floodRisk.factors.map((f, i) => (
            <span key={i} className="text-[11px] px-2.5 py-1 rounded-[100px] font-medium" style={{ color: config.text, background: `${config.text}10`, border: `1px solid ${config.text}20` }}>
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Peak rainfall info */}
      {peakRainfall.amount > 2 && peakRainfall.time && (
        <div className="relative mt-3 text-[11px] text-app-muted">
          Peak rainfall: <span className="font-semibold text-app">{peakRainfall.amount.toFixed(1)}mm</span> expected at{" "}
          <span className="font-semibold text-app">
            {new Date(peakRainfall.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
          </span>
        </div>
      )}
    </div>
  );
}

function AccumStat({ label, value, highlight, color }: { label: string; value: string; highlight: boolean; color: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-app-muted font-medium">{label}</p>
      <p className="text-[18px] font-[700] tabular-nums mt-0.5" style={{ color: highlight ? color : "var(--text)" }}>{value}</p>
    </div>
  );
}
