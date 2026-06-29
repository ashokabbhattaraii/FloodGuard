"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function Dot({ color }: { color: string }) {
  return (
    <span className="relative flex w-1.5 h-1.5 shrink-0">
      <span className="animate-ping absolute inset-0 rounded-full opacity-50" style={{ background: color }} />
      <span className="relative rounded-full w-1.5 h-1.5" style={{ background: color }} />
    </span>
  );
}

const sidebar = [
  { label: "Overview", active: true },
  { label: "Alerts", badge: "7", badgeColor: "#ff4c4c" },
  { label: "Flood Map" },
  { label: "Reports", badge: "41", badgeColor: "#f5a623" },
  { label: "Coverage" },
  { label: "Evacuate" },
];

const stats = [
  { label: "Active Alerts", value: "7", color: "#ff4c4c", w: "70%" },
  { label: "Systems Active", value: "6/6", color: "#0369a1", w: "100%" },
  { label: "Reports", value: "41", color: "#f5a623", w: "60%" },
  { label: "Evac Sites", value: "3", color: "#4caf50", w: "100%" },
];

const feed = [
  { title: "Flash Flood Warning", loc: "Subang Jaya · 2m", sev: "#ff4c4c", tag: "LIVE" },
  { title: "Water Level Rising", loc: "Petaling Jaya · 8m", sev: "#f5a623", tag: "ACTIVE" },
  { title: "Evacuation Advised", loc: "Klang · 15m", sev: "#ff4c4c", tag: "LIVE" },
];

export default function ProductShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Scroll-scrubbed perspective reveal: tilts up as you scroll into it
      gsap.fromTo(frameRef.current,
        { rotateX: 20, scale: 0.9, y: 60, opacity: 0.4 },
        {
          rotateX: 0, scale: 1, y: 0, opacity: 1, ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 90%",
            end: "top 35%",
            scrub: 1,
          },
        }
      );

      // Inner content stagger when in view
      const items = frameRef.current?.querySelectorAll(".pop");
      if (items) {
        gsap.fromTo(items,
          { y: 14, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: "power2.out",
            scrollTrigger: { trigger: sectionRef.current, start: "top 60%", once: true },
          }
        );
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative px-4 pb-24 -mt-4" style={{ perspective: "1400px" }}>
      {/* Glow */}
      <div className="absolute inset-x-0 top-10 flex justify-center pointer-events-none">
        <div className="w-[800px] h-[160px]"
          style={{ background: "radial-gradient(ellipse, rgba(3,105,161,0.16) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Caption */}
        <p className="text-center text-[12px] text-app-muted tracking-[0.18em] uppercase mb-5">
          One dashboard · Three roles · Real-time
        </p>

        <div ref={frameRef} className="rounded-[16px] overflow-hidden surface-card noise relative"
          style={{
            boxShadow: "0 30px 90px rgba(0,0,0,0.45), 0 0 50px rgba(3,105,161,0.12)",
            transformStyle: "preserve-3d",
            borderColor: "rgba(3,105,161,0.22)",
          }}>

          {/* Chrome bar */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-app"
            style={{ background: "var(--chrome-bg)" }}>
            <div className="flex gap-[6px]">
              <span className="w-[11px] h-[11px] rounded-full bg-[#ff5f57]" />
              <span className="w-[11px] h-[11px] rounded-full bg-[#febc2e]" />
              <span className="w-[11px] h-[11px] rounded-full bg-[#28c840]" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 glass-1 rounded-[6px] px-3 py-1 w-60">
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="#4caf50" strokeWidth="1.2"/>
                  <path d="M3.5 6l1.5 1.5 3-3" stroke="#4caf50" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[11px] text-app-muted">floodguard.app/dashboard</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5"><Dot color="#4caf50" /><span className="text-[10px] text-app-muted">Live</span></div>
          </div>

          {/* Body */}
          <div className="flex" style={{ minHeight: "340px", background: "var(--bg)" }}>
            {/* Sidebar */}
            <div className="w-[150px] shrink-0 border-r border-app py-3 px-2.5 flex-col gap-0.5 hidden sm:flex">
              <div className="flex items-center gap-2 px-2 py-1.5 mb-3">
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none" className="shrink-0">
                  <rect width="32" height="32" rx="8" fill="#7c7cff"/>
                  <path d="M16 6C13 6 10 8 9 11C8 14 9 16 10 17.5C11 19 12.5 20 14 21C15 21.7 15.5 22.5 16 24C16.5 22.5 17 21.7 18 21C19.5 20 21 19 22 17.5C23 16 24 14 23 11C22 8 19 6 16 6Z" fill="white" opacity="0.95"/>
                  <path d="M12 18C13 17 14.5 16.5 16 16.5C17.5 16.5 19 17 20 18" stroke="#7c7cff" strokeWidth="1.8" strokeLinecap="round"/>
                  <circle cx="16" cy="13" r="2.5" fill="#7c7cff" opacity="0.8"/>
                </svg>
                <span className="text-[12px] font-semibold text-app">FloodGuard</span>
              </div>
              {sidebar.map((s) => (
                <div key={s.label} className="pop flex items-center justify-between px-2.5 py-2 rounded-[7px]"
                  style={{ background: s.active ? "var(--accent-soft)" : "transparent", borderLeft: s.active ? "2px solid #0369a1" : "2px solid transparent" }}>
                  <span className="text-[11px]" style={{ color: s.active ? "#0369a1" : "var(--text-muted)" }}>{s.label}</span>
                  {s.badge && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-[3px]" style={{ background: `${s.badgeColor}22`, color: s.badgeColor }}>{s.badge}</span>}
                </div>
              ))}
            </div>

            {/* Main */}
            <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
              <div className="flex items-center justify-between pop">
                <div>
                  <p className="text-[10px] text-app-muted">Mon, 23 Jun 2025 · 15:42</p>
                  <h3 className="text-[14px] font-medium text-app">Authority Overview</h3>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-[7px]" style={{ background: "rgba(255,76,76,0.08)", border: "1px solid rgba(255,76,76,0.25)" }}>
                  <Dot color="#ff4c4c" /><span className="text-[10px] font-semibold text-[#ff4c4c]">HIGH RISK</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                {stats.map((s) => (
                  <div key={s.label} className="pop rounded-[9px] p-2.5 surface-card">
                    <p className="text-[9px] text-app-muted mb-1">{s.label}</p>
                    <p className="text-[17px] font-[700] leading-none tabular-nums" style={{ color: s.color }}>{s.value}</p>
                    <div className="h-[2px] w-full rounded-full mt-2" style={{ background: "rgba(3,105,161,0.1)" }}>
                      <div className="h-full rounded-full" style={{ width: s.w, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Feed + map */}
              <div className="grid grid-cols-5 gap-2 flex-1 min-h-0">
                <div className="col-span-3 rounded-[9px] surface-card flex flex-col overflow-hidden pop">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-app">
                    <span className="text-[11px] font-medium text-app">Alert Feed</span>
                    <span className="text-[9px] text-accent">+ Issue</span>
                  </div>
                  {feed.map((f) => (
                    <div key={f.title} className="flex items-center justify-between px-3 py-2 border-b border-app last:border-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: f.sev, boxShadow: `0 0 4px 1px ${f.sev}` }} />
                        <div>
                          <p className="text-[11px] text-app font-medium leading-tight">{f.title}</p>
                          <p className="text-[9px] text-app-muted">{f.loc}</p>
                        </div>
                      </div>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-[4px]" style={{ color: f.sev, background: `${f.sev}18`, border: `1px solid ${f.sev}30` }}>{f.tag}</span>
                    </div>
                  ))}
                </div>

                {/* Map */}
                <div className="col-span-2 rounded-[9px] overflow-hidden relative surface-card pop">
                  <svg width="100%" height="100%" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
                    {Array.from({length:9}).map((_,i)=><line key={`h${i}`} x1="0" y1={i*24} x2="200" y2={i*24} stroke="rgba(3,105,161,0.08)" strokeWidth="1"/>)}
                    {Array.from({length:9}).map((_,i)=><line key={`v${i}`} x1={i*24} y1="0" x2={i*24} y2="200" stroke="rgba(3,105,161,0.08)" strokeWidth="1"/>)}
                    <path d="M30 60 Q80 80 110 110 Q130 125 170 120" stroke="rgba(3,105,161,0.18)" strokeWidth="1.5" fill="none"/>
                    <ellipse cx="90" cy="95" rx="48" ry="34" fill="rgba(255,76,76,0.12)" stroke="rgba(255,76,76,0.35)" strokeWidth="1"/>
                    <ellipse cx="150" cy="130" rx="30" ry="22" fill="rgba(245,166,35,0.1)" stroke="rgba(245,166,35,0.3)" strokeWidth="1"/>
                    {[{x:90,y:95,c:"#ff4c4c"},{x:150,y:130,c:"#f5a623"},{x:55,y:140,c:"#ff4c4c"}].map((p,i)=>(
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="4" fill={p.c}/>
                        <circle cx={p.x} cy={p.y} r="4" fill="none" stroke={p.c} strokeWidth="1" opacity="0.5">
                          <animate attributeName="r" from="4" to="16" dur={`${1.8+i*0.3}s`} repeatCount="indefinite"/>
                          <animate attributeName="opacity" from="0.6" to="0" dur={`${1.8+i*0.3}s`} repeatCount="indefinite"/>
                        </circle>
                      </g>
                    ))}
                  </svg>
                  <div className="absolute top-2 left-2.5 text-[8px] text-app-muted tracking-widest uppercase">Klang Valley</div>
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 glass-2 rounded-[4px] px-1.5 py-0.5"><Dot color="#4caf50"/><span className="text-[8px] text-app-muted">LIVE</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-[2px] bg-gradient-to-r from-transparent via-[#0369a1] to-transparent opacity-50" />
        </div>
      </div>
    </section>
  );
}
