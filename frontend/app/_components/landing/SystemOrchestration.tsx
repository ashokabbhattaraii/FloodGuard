"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/* Premium, system-focused orchestration panel.
   Live 4-stage pipeline + animated data waveform + status rail. */

const layers = [
  {
    id: "detect", step: "01", title: "Detect",
    sub: "Live flood data streams every 30s",
    color: "#0369a1", metric: "4.2m", metricLabel: "peak level", load: 70,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.3" opacity="0.5" />
        <circle cx="10" cy="10" r="1.4" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "predict", step: "02", title: "Predict",
    sub: "ML risk model scores each region",
    color: "#f5a623", metric: "HIGH", metricLabel: "Klang Valley", load: 88,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 16l4-6 3.5 3L14 5l3 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "alert", step: "03", title: "Alert",
    sub: "Push, SMS & in-app within seconds",
    color: "#ff4c4c", metric: "2.3k", metricLabel: "notified", load: 95,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M15 7a5 5 0 0 0-10 0c0 5.5-2 7-2 7h14s-2-1.5-2-7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M11.5 16a1.7 1.7 0 0 1-3 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "respond", step: "04", title: "Respond",
    sub: "Authorities coordinate evacuation routes",
    color: "#4caf50", metric: "3", metricLabel: "shelters open", load: 100,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2.5l2 6h6l-5 3.6 2 6L10 14.5 5 18.1l2-6L2 8.5h6l2-6Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
];

// Generate a smooth, deterministic scrolling waveform path
function wavePath(seed: number, w: number, h: number, points = 32) {
  let d = `M 0 ${h / 2}`;
  for (let i = 1; i <= points; i++) {
    const x = (i / points) * w;
    // layered sines for an organic, smoothly-scrolling signal
    const y =
      h / 2 +
      Math.sin(i * 0.5 + seed) * (h * 0.22) +
      Math.sin(i * 1.3 + seed * 1.7) * (h * 0.1);
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

export default function SystemOrchestration() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [wave, setWave] = useState(() => wavePath(0, 300, 60));

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(wrapRef.current,
        { opacity: 0, y: 50, rotateY: -6 },
        { opacity: 1, y: 0, rotateY: 0, duration: 0.7, ease: "power3.out", delay: 0.2 });

      const rows = wrapRef.current?.querySelectorAll(".orch-row");
      if (rows) {
        gsap.fromTo(rows,
          { x: 30, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power3.out", delay: 0.4 });
      }
      gsap.to(wrapRef.current, { y: -7, duration: 4.5, ease: "sine.inOut", repeat: -1, yoyo: true, delay: 1 });
    }, wrapRef);
    return () => ctx.revert();
  }, []);

  // Sweep active stage
  useEffect(() => {
    const t = setInterval(() => setActive((v) => (v + 1) % layers.length), 2000);
    return () => clearInterval(t);
  }, []);

  // Animate waveform — single throttled RAF loop (~12fps for a calm scope feel)
  useEffect(() => {
    let raf = 0, t = 0, last = 0;
    const loop = (now: number) => {
      if (now - last > 80) {
        t += 0.18;
        setWave(wavePath(t, 300, 60));
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={wrapRef}
      style={{ opacity: 0, transformStyle: "preserve-3d", boxShadow: "0 30px 80px rgba(20,20,60,0.18), 0 0 50px rgba(3,105,161,0.12)" }}
      className="relative w-full max-w-xl mx-auto lg:mx-0 lg:ml-auto rounded-[22px] glass-2 noise overflow-hidden border-app">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-app">
        <div className="flex items-center gap-2.5">
          <span className="relative flex w-2.5 h-2.5">
            <span className="animate-ping absolute inset-0 rounded-full bg-[#4caf50] opacity-60" />
            <span className="relative rounded-full w-2.5 h-2.5 bg-[#4caf50]" />
          </span>
          <div>
            <div className="text-[13px] text-app font-semibold tracking-tight leading-none">System Orchestration</div>
          </div>
        </div>
        <span className="text-[10px] text-app-muted tracking-[0.14em] uppercase px-2.5 py-1 rounded-[100px] glass-1">live</span>
      </div>

      {/* Live data waveform */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-app-muted">Live stream · Region Alpha</span>
          <span className="text-[11px] font-medium text-accent">▲ rising</span>
        </div>
        <div className="relative h-[60px] rounded-[10px] overflow-hidden surface-card">
          <svg width="100%" height="60" viewBox="0 0 300 60" preserveAspectRatio="none" className="absolute inset-0">
            <defs>
              <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0369a1" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${wave} L 300 60 L 0 60 Z`} fill="url(#waveFill)" />
            <path d={wave} fill="none" stroke="#0369a1" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
          {/* threshold line */}
          <div className="absolute left-0 right-0 top-[30%] border-t border-dashed border-[rgba(255,76,76,0.4)]" />
          <span className="absolute right-2 top-[30%] -translate-y-1/2 text-[8px] text-[#ff4c4c] bg-[var(--bg)] px-1">threshold</span>
        </div>
      </div>

      {/* Pipeline rail */}
      <div className="relative px-6 pb-2">
        {/* vertical rail */}
        <div className="absolute left-[39px] top-[24px] bottom-[24px] w-[2px] rounded-full"
          style={{ background: "linear-gradient(to bottom, rgba(3,105,161,0.4), rgba(245,166,35,0.4), rgba(255,76,76,0.4), rgba(76,175,80,0.4))" }}>
          <span className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#0369a1]"
            style={{
              top: `${(active / (layers.length - 1)) * 100}%`,
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 14px 4px rgba(3,105,161,0.7)",
              transition: "top 0.8s cubic-bezier(0.4,0,0.2,1)",
            }} />
        </div>

        <div className="flex flex-col gap-2">
          {layers.map((l, i) => {
            const isActive = active === i;
            return (
              <div key={l.id}
                className="orch-row relative flex items-center gap-4 rounded-[14px] px-3.5 py-3.5 transition-all duration-500"
                style={{
                  opacity: 0,
                  background: isActive ? `${l.color}14` : "transparent",
                  border: `1px solid ${isActive ? l.color + "44" : "transparent"}`,
                }}>
                {/* node */}
                <div className="relative shrink-0 w-11 h-11 rounded-[13px] flex items-center justify-center z-10 transition-all duration-500"
                  style={{
                    color: l.color,
                    background: "var(--bg-elevated)",
                    border: `1px solid ${l.color}${isActive ? "" : "44"}`,
                    boxShadow: isActive ? `0 0 20px ${l.color}66` : "none",
                  }}>
                  {l.icon}
                  {isActive && (
                    <span className="absolute -inset-1 rounded-[15px] pointer-events-none"
                      style={{ border: `1px solid ${l.color}`, opacity: 0.4, animation: "pulse-ring 2s ease-out infinite" }} />
                  )}
                </div>

                {/* text + progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-[0.1em]" style={{ color: l.color }}>{l.step}</span>
                    <span className="text-[15px] font-medium text-app">{l.title}</span>
                  </div>
                  <p className="text-[11px] text-app-muted leading-tight mt-0.5 truncate">{l.sub}</p>
                  {/* load bar */}
                  <div className="h-[3px] w-full rounded-full mt-2" style={{ background: "rgba(3,105,161,0.1)" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: isActive ? `${l.load}%` : "0%", background: l.color, boxShadow: `0 0 6px 1px ${l.color}` }} />
                  </div>
                </div>

                {/* metric */}
                <div className="text-right shrink-0">
                  <div className="text-[16px] font-[600] leading-none tabular-nums" style={{ color: l.color }}>{l.metric}</div>
                  <div className="text-[9px] text-app-muted mt-1">{l.metricLabel}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer metrics */}
      <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-t border-app">
        {[
          { l: "latency", v: "412ms", c: "#4caf50" },
          { l: "throughput", v: "1.2k/s", c: "var(--text)" },
          { l: "uptime", v: "99.9%", c: "#0369a1" },
        ].map((m) => (
          <div key={m.l} className="px-4 py-3 text-center">
            <div className="text-[15px] font-[600] tabular-nums" style={{ color: m.c }}>{m.v}</div>
            <div className="text-[10px] text-app-muted mt-0.5 tracking-wide">{m.l}</div>
          </div>
        ))}
      </div>

      <div className="h-[2px] bg-gradient-to-r from-transparent via-[#0369a1] to-transparent opacity-50" />
    </div>
  );
}
