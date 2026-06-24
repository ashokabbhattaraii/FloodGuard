"use client";

import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
      <div>
        <p className="text-[11px] font-semibold uppercase text-accent mb-2">Operations Console</p>
        <h1 className="text-[clamp(24px,3vw,34px)] font-[650] text-app leading-tight">{title}</h1>
        {subtitle && <p className="text-app-muted text-[14px] mt-2 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label, value, accent = "var(--accent)", trend, icon, loading,
}: {
  label: string; value: ReactNode; accent?: string; trend?: string; icon?: ReactNode; loading?: boolean;
}) {
  return (
    <div className="surface-card rounded-[12px] p-5 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]">
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-[10px] flex items-center justify-center bg-[var(--accent-soft)]" style={{ color: accent, border: `1px solid ${accent}28` }}>
          {icon}
        </div>
        {trend && (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-[6px]" style={{ color: accent, background: `${accent}18` }}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-[12px] font-semibold uppercase text-app-muted">{label}</p>
      <p className="text-[30px] font-[650] leading-tight mt-2 tabular-nums text-app">
        {loading ? <span className="inline-block w-14 h-8 rounded bg-[var(--accent-soft)] animate-pulse" /> : value}
      </p>
    </div>
  );
}

export function SectionCard({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`surface-card rounded-[12px] overflow-hidden ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-app">
        <h2 className="text-[15px] font-[650] text-app">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

const sevColor: Record<string, string> = {
  critical: "#dc2626", high: "#f97316", medium: "#0369a1", low: "#16a34a",
};

export function AlertRow({ title, region, severity, time }: { title: string; region?: string; severity?: string; time?: string }) {
  const c = sevColor[severity ?? "medium"] ?? "#a855f7";
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-3 rounded-[10px] hover:bg-[var(--accent-soft)] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c, boxShadow: `0 0 6px 1px ${c}` }} />
        <div className="min-w-0">
          <p className="text-[14px] text-app font-medium truncate">{title}</p>
          {region && <p className="text-[12px] text-app-muted truncate">{region}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {severity && (
          <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-[6px]" style={{ color: c, background: `${c}18` }}>
            {severity}
          </span>
        )}
        {time && <span className="text-[12px] text-app-muted">{time}</span>}
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="text-app-muted text-[14px] text-center py-10 rounded-[10px] bg-[var(--accent-soft)]">{message}</p>;
}

export function LoadingRows({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-12 rounded-[10px] bg-[var(--accent-soft)] animate-pulse" />
      ))}
    </div>
  );
}
