"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import PillButton from "@/app/_components/ui/PillButton";
import SystemOrchestration from "@/app/_components/landing/SystemOrchestration";
import { useAuth } from "@/app/hooks/use-auth";

export default function HeroSection() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const sectionRef = useRef<HTMLElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const statRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleViewAlerts = () => {
    if (loading) return;
    if (isAuthenticated) {
      router.push('/dashboard/resident');
    } else {
      router.push('/login');
    }
  };

  const handleReportIncident = () => {
    if (loading) return;
    if (isAuthenticated) {
      router.push('/dashboard/resident/reports');
    } else {
      router.push('/login');
    }
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduceMotion) {
        gsap.to(orb1Ref.current, { opacity: 0.55, duration: 4, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(orb2Ref.current, { opacity: 0.45, duration: 5.5, ease: "sine.inOut", repeat: -1, yoyo: true, delay: 1 });
      }

      const tl = gsap.timeline({ delay: reduceMotion ? 0 : 0.28 });

      tl.fromTo(tagRef.current,
        { opacity: 0, y: reduceMotion ? 0 : 10 },
        { opacity: 1, y: 0, duration: reduceMotion ? 0.01 : 0.42, ease: "power3.out" });

      const lines = headRef.current?.querySelectorAll(".h-line");
      if (lines) {
        tl.fromTo(lines,
          { yPercent: reduceMotion ? 0 : 110, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: reduceMotion ? 0.01 : 0.72, ease: "power4.out", stagger: reduceMotion ? 0 : 0.08 },
          "-=0.2");
      }

      tl.fromTo(subRef.current,
        { opacity: 0, y: reduceMotion ? 0 : 18 },
        { opacity: 1, y: 0, duration: reduceMotion ? 0.01 : 0.52, ease: "power2.out" }, "-=0.28");

      tl.fromTo(ctaRef.current,
        { opacity: 0, y: reduceMotion ? 0 : 14 },
        { opacity: 1, y: 0, duration: reduceMotion ? 0.01 : 0.46, ease: "power2.out" }, "-=0.26");

      tl.fromTo(statRef.current,
        { opacity: 0, y: reduceMotion ? 0 : 14 },
        { opacity: 1, y: 0, duration: reduceMotion ? 0.01 : 0.46, ease: "power2.out" }, "-=0.22");
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMouse = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      gsap.to(gridRef.current, { x: x * 8, y: y * 6, duration: 1, ease: "power2.out" });
    };
    window.addEventListener("mousemove", onMouse);
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  useEffect(() => {
    const btns = ctaRef.current?.querySelectorAll<HTMLElement>("button");
    if (!btns || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(btns, { scale: 0.98 }, { scale: 1, duration: 0.24, ease: "power2.out", stagger: 0.04, delay: 0.8 });
  }, []);

  return (
    <section ref={sectionRef}
      className="relative flex items-center overflow-hidden px-6 md:px-[6%] pt-32 pb-16 min-h-[92dvh] hero-bg">
      <div ref={orb1Ref} className="absolute inset-x-0 top-0 h-48 pointer-events-none bg-gradient-to-b from-[var(--accent-soft)] to-transparent opacity-40" />
      <div ref={orb2Ref} className="absolute inset-y-0 right-0 w-1/3 pointer-events-none bg-gradient-to-l from-[var(--accent-soft)] to-transparent opacity-30" />

      {/* Dot grid */}
      <div ref={gridRef} className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, var(--dot-color) 0.8px, transparent 0.8px)", backgroundSize: "32px 32px", opacity: 0.25 }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-12 w-full max-w-[1320px] mx-auto">

        {/* LEFT — text */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-5 w-full lg:w-[48%] shrink-0">
          <div ref={tagRef} style={{ opacity: 0 }} className="flex items-center gap-2.5 px-4 py-2 rounded-[10px] border border-app bg-[var(--glass-bg-2)] shadow-[var(--shadow-card)]">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16a34a] opacity-70" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-[#16a34a]" />
            </span>
            <span className="text-[12.5px] text-app-muted font-semibold">
              Flood response operations platform
            </span>
          </div>

          <h1 ref={headRef} className="text-[clamp(42px,5.2vw,76px)] font-[800] leading-[1.05] text-app">
            <span className="block overflow-hidden"><span className="h-line inline-block">Flood intelligence</span></span>
            <span className="block overflow-hidden"><span className="h-line inline-block">for coordinated</span></span>
            <span className="block overflow-hidden"><span className="h-line inline-block text-accent">community response.</span></span>
          </h1>

          <p ref={subRef} style={{ opacity: 0 }} className="text-[clamp(15px,1.3vw,17px)] text-app-muted max-w-md leading-[1.75]">
            Real-time flood monitoring, community reporting, and evacuation coordination in one secure operations workspace.
          </p>

          <div ref={ctaRef} style={{ opacity: 0 }} className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
            <PillButton size="lg" variant="primary" onClick={handleViewAlerts} disabled={loading}>
              View Live Alerts
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M3 7.5h9M8 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </PillButton>
            <PillButton size="lg" variant="ghost" onClick={handleReportIncident} disabled={loading}>Report an Incident</PillButton>
          </div>

          {/* Trust metrics */}
          <div ref={statRef} style={{ opacity: 0 }} className="flex items-center gap-5 pt-4 mt-1 border-t border-[var(--border-soft)]">
            {[
              { v: "2.3k+", l: "Reports filed" },
              { v: "<30s", l: "Alert latency" },
              { v: "99.9%", l: "Uptime" },
            ].map((s, i) => (
              <div key={s.l} className="flex items-center gap-5">
                {i > 0 && <span className="w-px h-7 bg-[var(--border)]" />}
                <div className="text-center lg:text-left">
                  <div className="text-[20px] font-medium text-app leading-none">{s.v}</div>
                  <div className="text-[11px] text-app-muted mt-1 tracking-wide uppercase">{s.l}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — system orchestration */}
        <div className="w-full lg:flex-1">
          <SystemOrchestration />
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-28 pointer-events-none" style={{ background: "linear-gradient(to top, var(--bg), transparent)" }} />
    </section>
  );
}
