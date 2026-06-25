"use client";

import { useRegions } from "@/app/queries/regions";

type Sensor = {
  id: string;
  type: string;
  currentValue: number;
  threshold: number;
  regionId: string;
};

type Region = {
  id: string;
  name: string;
  riskLevel: string;
  sensors: Sensor[];
};

const riskColors: Record<string, string> = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#0369a1",
  low: "#16a34a",
};

function GaugeBar({ sensor, regionName }: { sensor: Sensor; regionName: string }) {
  const pct = Math.min((sensor.currentValue / sensor.threshold) * 100, 100);
  const overflow = sensor.currentValue > sensor.threshold;
  const color = overflow ? "#dc2626" : pct > 75 ? "#f97316" : pct > 50 ? "#ca8a04" : "#16a34a";
  const label = sensor.type === "water_level" ? "Water Level" : "Rainfall";
  const unit = sensor.type === "water_level" ? "m" : "mm";

  return (
    <div className="flex flex-col gap-2 p-3.5 rounded-[10px] border border-app bg-[var(--glass-bg-2)] hover:bg-[var(--accent-soft)] transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="shrink-0" style={{ color }}>
            {sensor.type === "water_level" ? (
              <path d="M3 14c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0M3 10c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            ) : (
              <path d="M10 3v10M7 10l3 3 3-3M5 16h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
          <span className="text-[12px] font-medium text-app truncate">{regionName}</span>
        </div>
        <span className="text-[10px] text-app-muted shrink-0">{label}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-[6px] rounded-full bg-[var(--accent-soft)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <span className="text-[12px] font-semibold tabular-nums shrink-0" style={{ color }}>
          {sensor.currentValue.toFixed(1)}{unit}
        </span>
      </div>

      <div className="flex items-center justify-between text-[10px] text-app-muted">
        <span>0</span>
        <span className="flex items-center gap-1">
          Threshold: <span className="font-medium text-app">{sensor.threshold}{unit}</span>
        </span>
      </div>

      {overflow && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)]">
          <span className="relative flex w-1.5 h-1.5">
            <span className="animate-ping absolute inset-0 rounded-full bg-[#dc2626] opacity-60" />
            <span className="relative rounded-full w-1.5 h-1.5 bg-[#dc2626]" />
          </span>
          <span className="text-[10px] font-medium text-[#dc2626]">THRESHOLD EXCEEDED</span>
        </div>
      )}
    </div>
  );
}

export default function SensorGauges() {
  const { data, isLoading } = useRegions();
  const regions: Region[] = Array.isArray(data) ? (data as Region[]) : [];

  const allSensors = regions.flatMap((r) =>
    (r.sensors || []).map((s) => ({ ...s, regionName: r.name }))
  );

  const waterLevelSensors = allSensors.filter((s) => s.type === "water_level");
  const rainfallSensors = allSensors.filter((s) => s.type === "rainfall");

  if (isLoading) {
    return (
      <div className="surface-card rounded-[12px] p-5">
        <div className="h-5 w-40 rounded bg-[var(--accent-soft)] animate-pulse mb-4" />
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-[10px] bg-[var(--accent-soft)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (allSensors.length === 0) return null;

  const breachedCount = allSensors.filter((s) => s.currentValue > s.threshold).length;

  return (
    <div className="surface-card rounded-[12px] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-[650] text-app">Sensor Readings</h3>
          {breachedCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px] bg-[rgba(220,38,38,0.1)] text-[#dc2626]">
              {breachedCount} alert{breachedCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="text-[10px] text-app-muted">{allSensors.length} sensors active</span>
      </div>

      {waterLevelSensors.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] font-semibold text-app-muted uppercase mb-2">Water Level</p>
          <div className="grid gap-2">
            {waterLevelSensors.map((s) => (
              <GaugeBar key={s.id} sensor={s} regionName={s.regionName} />
            ))}
          </div>
        </div>
      )}

      {rainfallSensors.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-app-muted uppercase mb-2">Rainfall</p>
          <div className="grid gap-2">
            {rainfallSensors.map((s) => (
              <GaugeBar key={s.id} sensor={s} regionName={s.regionName} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
