"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const alerts = [
  { id: 1, sev: "high",     title: "Flash Flood Warning",    location: "Subang Jaya, Selangor", time: "2 min ago",  level: "4.2m", trend: 88 },
  { id: 2, sev: "moderate", title: "Water Level Rising",     location: "Petaling Jaya, Selangor", time: "8 min ago", level: "2.8m", trend: 62 },
  { id: 3, sev: "high",     title: "Evacuation Advised",     location: "Klang, Selangor",         time: "15 min ago", level: "5.1m", trend: 95 },
  { id: 4, sev: "low",      title: "Watch Advisory",         location: "Shah Alam, Selangor",     time: "32 min ago", level: "1.4m", trend: 28 },
];

const sev = {
  high:     { color: "#ff4c4c", bg: "rgba(255,76,76,0.08)",   border: "rgba(255,76,76,0.25)",   label: "HIGH" },
  moderate: { color: "#f5a623", bg: "rgba(245,166,35,0.08)",  border: "rgba(245,166,35,0.25)",  label: "MOD" },
  low:      { color: "#4caf50", bg: "rgba(76,175,80,0.08)",   border: "rgba(76,175,80,0.25)",   label: "WATCH" },
};

function Dot({ color }: { color: string }) {
  return (
    <span className="relative flex w-2.5 h-2.5 shrink-0">
      <span className="animate-ping absolute inset-0 rounded-full opacity-60" style={{ background: color }} />
      <span className="relative rounded-full w-2.5 h-2.5" style={{ background: color }} />
    </span>
  );
}

export default function AlertsPreview() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".ap-head", { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power3.out",
          scrollTrigger: { trigger: ".ap-head", start: "top 88%", once: true } });

      gsap.fromTo(".ap-alert", { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", stagger: 0.08,
          scrollTrigger: { trigger: ".ap-alert", start: "top 85%", once: true } });

      const mapEl = sectionRef.current?.querySelector(".ap-map");
      if (mapEl) {
        gsap.fromTo(mapEl, { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: "power3.out",
            scrollTrigger: { trigger: mapEl, start: "top 85%", once: true } });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="alerts" className="relative py-32 px-[10%] overflow-hidden">
      {/* Noise overlay */}
      <div className="w-full">
        <div className="ap-head text-center mb-16" style={{ opacity: 0 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[100px] glass-1 mb-6">
            <Dot color="#ff4c4c" />
            <span className="text-[11px] text-[#ff4c4c] tracking-[0.15em] uppercase font-medium">Live Alerts Feed</span>
          </div>
          <h2 className="text-[clamp(34px,5vw,68px)] font-[800] text-app leading-[1.08]">
            Real-time alerts with operational clarity.
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-5 items-start">
          {/* Alert list */}
          <div className="flex flex-col gap-3">
            {alerts.map((a, i) => {
              const s = sev[a.sev as keyof typeof sev];
              const isActive = active === i;
              return (
                <div key={a.id}
                  className={`ap-alert relative glass-1 rounded-[16px] p-5 border cursor-pointer transition-all duration-500 overflow-hidden noise ${isActive ? "shadow-[0_0_32px_rgba(3,105,161,0.1)]" : "opacity-55 hover:opacity-80"}`}
                  style={{ opacity: 0, borderColor: isActive ? s.border : "rgba(71,76,132,0.15)", background: isActive ? s.bg : undefined }}
                  onClick={() => setActive(i)}
                >
                  {/* Active line */}
                  {isActive && <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full" style={{ background: s.color, boxShadow: `0 0 8px 2px ${s.color}` }} />}

                  <div className="flex items-start justify-between gap-4 pl-2">
                    <div className="flex items-center gap-3">
                      <Dot color={s.color} />
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[14px] font-medium text-app">{a.title}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[100px] tracking-wider"
                            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                            {s.label}
                          </span>
                        </div>
                        <p className="text-[12px] text-app-muted">{a.location}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[22px] font-[700] text-app leading-tight">{a.level}</div>
                      <div className="text-[11px] text-app-muted">{a.time}</div>
                    </div>
                  </div>

                  {/* Trend bar */}
                  <div className="mt-3 mx-2 h-[2px] rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${a.trend}%`, background: s.color, boxShadow: `0 0 6px 1px ${s.color}` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Map panel */}
          <div className="ap-map glass-1 rounded-[16px] overflow-hidden relative noise" style={{ opacity: 0, minHeight: "400px", background: "rgba(8,8,30,0.7)" }}>
            <svg width="100%" height="100%" viewBox="0 0 480 400" className="absolute inset-0" preserveAspectRatio="xMidYMid slice">
              {/* Grid */}
              {Array.from({length:14}).map((_,i)=> <line key={`h${i}`} x1="0" y1={i*30} x2="480" y2={i*30} stroke="rgba(71,76,132,0.1)" strokeWidth="1"/>)}
              {Array.from({length:17}).map((_,i)=> <line key={`v${i}`} x1={i*30} y1="0" x2={i*30} y2="400" stroke="rgba(71,76,132,0.1)" strokeWidth="1"/>)}
              {/* Zone fills */}
              <ellipse cx="190" cy="155" rx="78" ry="55" fill="rgba(255,76,76,0.12)" stroke="rgba(255,76,76,0.35)" strokeWidth="1"/>
              <ellipse cx="305" cy="215" rx="56" ry="42" fill="rgba(245,166,35,0.10)" stroke="rgba(245,166,35,0.3)" strokeWidth="1"/>
              <ellipse cx="125" cy="265" rx="48" ry="36" fill="rgba(255,76,76,0.15)" stroke="rgba(255,76,76,0.4)" strokeWidth="1"/>
              <ellipse cx="370" cy="115" rx="42" ry="32" fill="rgba(76,175,80,0.10)" stroke="rgba(76,175,80,0.28)" strokeWidth="1"/>
              {/* Data source pins with pulse */}
              {[{x:190,y:155,c:"#ff4c4c"},{x:305,y:215,c:"#f5a623"},{x:125,y:265,c:"#ff4c4c"},{x:370,y:115,c:"#4caf50"}].map((p,i)=>(
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="5" fill={p.c}/>
                  <circle cx={p.x} cy={p.y} r="10" fill="none" stroke={p.c} strokeWidth="1" opacity="0.5">
                    <animate attributeName="r" from="5" to="20" dur={`${1.8+i*0.3}s`} repeatCount="indefinite"/>
                    <animate attributeName="opacity" from="0.6" to="0" dur={`${1.8+i*0.3}s`} repeatCount="indefinite"/>
                  </circle>
                </g>
              ))}
            </svg>
            {/* Legend */}
            <div className="absolute bottom-4 left-4 glass-2 rounded-[10px] px-3 py-2 flex flex-col gap-1.5">
              {[["#ff4c4c","High Risk"],["#f5a623","Moderate"],["#4caf50","Safe Zone"]].map(([c,l])=>(
                <div key={l} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{background:c}}/>
                  <span className="text-[11px] text-app-muted">{l}</span>
                </div>
              ))}
            </div>
            {/* Live badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-[100px] glass-2">
              <Dot color="#4caf50"/>
              <span className="text-[11px] text-app-muted tracking-wide">LIVE</span>
            </div>
            <div className="absolute top-4 left-4 text-[11px] text-[rgba(181,181,187,0.6)] tracking-widest uppercase">Klang Valley</div>
          </div>
        </div>
      </div>
    </section>
  );
}
