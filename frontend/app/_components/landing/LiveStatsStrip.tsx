"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface PublicStats {
  totalRegions: number;
  activeAlerts: number;
  criticalAlerts: number;
  totalReports: number;
  totalShelters: number;
  totalVolunteers: number;
  systemUptime: number;
  regionsAtRisk: number;
}

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

export default function LiveStatsStrip() {
  const ref = useRef<HTMLElement>(null);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";
        const res = await fetch(`${apiUrl}/public/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        // Use fallback data
        setStats({
          totalRegions: 4,
          activeAlerts: 2,
          criticalAlerts: 0,
          totalReports: 156,
          totalShelters: 12,
          totalVolunteers: 8,
          systemUptime: 99.9,
          regionsAtRisk: 1,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading) {
      gsap.fromTo(ref.current,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 90%", once: true } }
      );
    }
  }, [loading]);

  if (loading || !stats) {
    return (
      <section className="relative py-2 px-[10%]">
        <div className="w-full">
          <div className="glass-1 rounded-[20px] noise relative overflow-hidden p-8">
            <div className="animate-pulse text-center text-app-muted text-[14px]">
              Loading live statistics...
            </div>
          </div>
        </div>
      </section>
    );
  }

  const displayStats = [
    { value: stats.totalRegions, suffix: "", label: "Regions Covered", color: "#0369a1" },
    { value: stats.activeAlerts, suffix: "", label: "Active Alerts", color: stats.activeAlerts > 0 ? "#dc2626" : "#16a34a" },
    { value: stats.criticalAlerts, suffix: "", label: "Critical Alerts", color: "#dc2626" },
    { value: stats.totalReports, suffix: "+", label: "Reports Filed", color: "#7c7cff" },
    { value: stats.totalShelters, suffix: "", label: "Safe Shelters", color: "#16a34a" },
    { value: stats.totalVolunteers, suffix: "+", label: "Volunteers", color: "#ca8a04" },
    { value: Math.round(stats.systemUptime * 10) / 10, suffix: "%", label: "Uptime SLA", color: "#16a34a" },
  ];

  return (
    <section ref={ref} className="relative py-2 px-[10%]" style={{ opacity: 0 }}>
      <div className="w-full">
        <div className="glass-1 rounded-[20px] noise relative overflow-hidden
          divide-y md:divide-y-0 md:divide-x divide-[rgba(71,76,132,0.2)]
          flex flex-col md:flex-row items-stretch md:items-center md:justify-around">
          {displayStats.map((s) => <StatItem key={s.label} {...s} />)}
        </div>
      </div>
    </section>
  );
}
