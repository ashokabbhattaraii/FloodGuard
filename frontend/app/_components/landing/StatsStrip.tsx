"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { value: 12, suffix: "", label: "Active Alerts", color: "#dc2626" },
  { value: 4, suffix: "", label: "Regions Covered", color: "#0369a1" },
  { value: 6, suffix: "+", label: "Integrations", color: "#0369a1" },
  { value: 2300, suffix: "+", label: "Reports Filed", color: "#16a34a" },
  { value: 99, suffix: ".9%", label: "Uptime SLA", color: "#ca8a04" },
];

function StatItem({ value, suffix, label, color }: { value: number; suffix: string; label: string; color: string }) {
  const numRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = numRef.current;
    if (!el) return;
    const trigger = ScrollTrigger.create({
      trigger: el, start: "top 88%", once: true,
      onEnter: () => {
        const obj = { val: 0 };
        gsap.to(obj, {
          val: value, duration: 2, ease: "power2.out",
          onUpdate() { el.textContent = Math.round(obj.val).toLocaleString(); },
        });
      },
    });
    return () => trigger.kill();
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-1.5 px-8 py-5">
      <div className="text-[clamp(28px,3.5vw,48px)] font-[800] leading-none tabular-nums" style={{ color }}>
        <span ref={numRef}>0</span><span>{suffix}</span>
      </div>
      <div className="text-[12px] text-app-muted tracking-[0.06em] uppercase text-center">{label}</div>
    </div>
  );
}

export default function StatsStrip() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.fromTo(ref.current,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 90%", once: true } }
    );
  }, []);

  return (
    <section ref={ref} className="relative py-2 px-[10%]" style={{ opacity: 0 }}>
      <div className="w-full">
        <div className="glass-1 rounded-[20px] noise relative overflow-hidden
          divide-y md:divide-y-0 md:divide-x divide-[rgba(71,76,132,0.2)]
          flex flex-col md:flex-row items-stretch md:items-center md:justify-around">
          {stats.map((s) => <StatItem key={s.label} {...s} />)}
        </div>
      </div>
    </section>
  );
}
