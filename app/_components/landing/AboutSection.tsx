"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: sectionRef.current, start: "top 70%", once: true },
      });

      tl.fromTo(".ab-head", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.12 })
        .fromTo(".ab-card-left", { x: -60, y: 30, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.9, ease: "power3.out" }, "-=0.3")
        .fromTo(".ab-card-right", { x: 60, y: 30, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.9, ease: "power3.out" }, "<")
        .fromTo(".ab-card-mid", { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out" }, "-=0.6")
        .fromTo(".ab-connector", { strokeDashoffset: 400, opacity: 0 }, { strokeDashoffset: 0, opacity: 1, duration: 1.6, ease: "power2.inOut" }, "-=0.7")
        .fromTo(".ab-node", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2.5)", stagger: 0.05 }, "-=1");

      // animate the gauge arc — the path itself is the half-circle, fill 94% of it
      const gauge = sectionRef.current?.querySelector<SVGPathElement>(".ab-gauge-fill");
      if (gauge) {
        const len = gauge.getTotalLength();
        gsap.set(gauge, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(gauge, {
          strokeDashoffset: len * (1 - 0.94),
          duration: 1.6, ease: "power2.out",
          scrollTrigger: { trigger: gauge, start: "top 85%", once: true },
        });
      }

      // count up the gauge number
      const num = sectionRef.current?.querySelector<HTMLElement>(".ab-gauge-num");
      if (num) {
        ScrollTrigger.create({
          trigger: num, start: "top 88%", once: true,
          onEnter: () => {
            const obj = { v: 0 };
            gsap.to(obj, { v: 94, duration: 1.6, ease: "power2.out",
              onUpdate() { num.textContent = Math.round(obj.v) + "%"; } });
          },
        });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="about" className="relative py-28 md:py-36 px-[6%] lg:px-[8%] overflow-hidden">
      {/* dotted background + ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, var(--dot-color) 1px, transparent 1px)", backgroundSize: "40px 40px", opacity: 0.25 }} />
      <div className="absolute left-1/2 top-1/4 -translate-x-1/2 w-[760px] h-[460px] rounded-full blur-[150px] pointer-events-none"
        style={{ background: "radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-4">
          <div className="ab-head inline-flex items-center gap-2 px-4 py-1.5 rounded-[100px] glass-1 mb-7" style={{ opacity: 0 }}>
            <span className="text-[11px] text-accent tracking-[0.15em] uppercase font-medium">About FloodGuard</span>
          </div>
          <h2 className="ab-head text-[clamp(38px,6.5vw,84px)] font-[600] text-app leading-[0.98] uppercase" style={{ opacity: 0 }}>
            Stay Ahead<br />
            <span className="text-accent">Of The Flood</span>
          </h2>
          <p className="ab-head mt-7 text-[15px] md:text-[16px] text-app-muted leading-[1.7] max-w-xl mx-auto uppercase tracking-wide" style={{ opacity: 0 }}>
            Real-time monitoring, predictive risk modelling, and multi-channel alerts — all in one cloud-native early-warning platform.
          </p>
          <div className="ab-head mt-9 flex justify-center" style={{ opacity: 0 }}>
            <a href="#features" className="inline-flex items-center justify-center px-7 py-3.5 rounded-[12px] bg-[#0369a1] text-white font-medium text-[15px] tracking-wide uppercase hover:bg-[#075985] hover:shadow-[0_0_28px_6px_rgba(3,105,161,0.45)] active:scale-[0.97] transition-all duration-300">
              Explore Platform
            </a>
          </div>
        </div>

        {/* Connected cards */}
        <div className="relative mt-4 md:mt-0">
          {/* connector overlay (desktop) — viewBox 0..100 maps proportionally */}
          <svg className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-0"
            viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="ab-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.1" />
                <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.55" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {/* left card -> mid card */}
            <polyline className="ab-connector" points="25,46 32,46 40,64"
              fill="none" stroke="url(#ab-line)" strokeDasharray="1.4 1.6" strokeLinecap="round"
              vectorEffect="non-scaling-stroke" style={{ strokeWidth: 1.6 }} />
            {/* mid card -> right card */}
            <polyline className="ab-connector" points="60,64 68,46 75,46"
              fill="none" stroke="url(#ab-line)" strokeDasharray="1.4 1.6" strokeLinecap="round"
              vectorEffect="non-scaling-stroke" style={{ strokeWidth: 1.6 }} />
          </svg>
          {/* node dots — fixed-size HTML elements (round regardless of SVG scaling) */}
          {[["25%","46%"],["32%","46%"],["40%","64%"],["60%","64%"],["68%","46%"],["75%","46%"]].map(([x,y],i)=>(
            <span key={i} className="ab-node hidden md:block absolute w-2 h-2 rounded-full bg-[var(--accent)] -translate-x-1/2 -translate-y-1/2 z-[1]"
              style={{ left: x, top: y, opacity: 0, boxShadow: "0 0 8px 1px var(--accent)" }} />
          ))}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-start relative z-[1]">
            {/* LEFT — Detection Accuracy gauge */}
            <div className="ab-card-left glass-2 noise rounded-[18px] p-6 shadow-[0_24px_60px_-28px_rgba(12,12,46,0.5)]" style={{ opacity: 0 }}>
              <p className="text-[12px] tracking-[0.12em] uppercase text-app-muted">Detection Accuracy</p>
              <div className="relative mt-4 flex justify-center">
                <svg width="160" height="92" viewBox="0 0 160 92">
                  <path d="M14 86 A66 66 0 0 1 146 86" fill="none" stroke="var(--border)" strokeWidth="10" strokeLinecap="round" />
                  <path className="ab-gauge-fill" d="M14 86 A66 66 0 0 1 146 86" fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round" />
                </svg>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                  <div className="ab-gauge-num text-[34px] font-[600] text-app leading-none tabular-nums">94%</div>
                  <div className="text-[11px] tracking-[0.1em] uppercase text-app-muted mt-1">Verified</div>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-[var(--border-soft)]">
                <p className="text-[13px] font-medium text-app uppercase leading-snug">Faster detection<br />than legacy systems</p>
              </div>
            </div>

            {/* MIDDLE — Alert delivery breakdown (offset down) */}
            <div className="ab-card-mid glass-2 noise rounded-[18px] p-6 shadow-[0_24px_60px_-28px_rgba(12,12,46,0.5)] md:mt-20" style={{ opacity: 0 }}>
              <p className="text-[12px] tracking-[0.12em] uppercase text-app-muted">Alert Delivery Rate</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-[34px] font-[600] text-app leading-none tabular-nums">2,184</span>
                <span className="text-[12px] tracking-[0.1em] uppercase text-app-muted">sent</span>
              </div>
              <div className="mt-4 flex h-2.5 rounded-full overflow-hidden gap-0.5">
                <div className="rounded-l-full" style={{ width: "82%", background: "var(--accent)" }} />
                <div style={{ width: "12%", background: "#4caf50" }} />
                <div className="rounded-r-full" style={{ width: "6%", background: "#f5a623" }} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { v: "82%", l: "Delivered", c: "var(--accent-text)" },
                  { v: "12%", l: "Pending", c: "#4caf50" },
                  { v: "06%", l: "Retry", c: "#f5a623" },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="text-[15px] font-semibold tabular-nums" style={{ color: s.c }}>{s.v}</div>
                    <div className="text-[10px] tracking-[0.08em] uppercase text-app-muted mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-[var(--border-soft)]">
                <p className="text-[13px] font-medium text-app uppercase leading-snug">Auto-retry active<br />for failed alerts</p>
              </div>
            </div>

            {/* RIGHT — Regions protected */}
            <div className="ab-card-right glass-2 noise rounded-[18px] p-6 shadow-[0_24px_60px_-28px_rgba(12,12,46,0.5)]" style={{ opacity: 0 }}>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-4.5-7-10a7 7 0 0114 0c0 5.5-7 10-7 10z" stroke="var(--accent)" strokeWidth="1.6"/><circle cx="12" cy="11" r="2.4" stroke="var(--accent)" strokeWidth="1.6"/></svg>
                </span>
                <p className="text-[12px] tracking-[0.12em] uppercase text-app-muted">Regions Protected</p>
              </div>
              <div className="mt-4 text-[40px] font-[600] text-app leading-none tabular-nums">4</div>
              <div className="mt-3 flex items-center gap-2 text-[13px]">
                <span className="font-medium text-[#4caf50]">99.9% uptime</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 20L20 4M20 4h-7M20 4v7" stroke="#4caf50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="text-app-muted tracking-[0.08em] uppercase text-[11px]">last 90 days</span>
              </div>
              <div className="mt-5 pt-4 border-t border-[var(--border-soft)] flex flex-col gap-2">
                {["Klang Basin", "Kelantan Delta", "Pahang River", "Johor Coast"].map((r) => (
                  <div key={r} className="flex items-center justify-between text-[12px]">
                    <span className="text-app-muted uppercase tracking-wide">{r}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4caf50]" style={{ boxShadow: "0 0 6px 1px #4caf50" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mission line */}
        <p className="text-center text-[13px] text-app-muted max-w-xl mx-auto mt-16 leading-[1.8] uppercase tracking-wide">
          A cloud project for <span className="text-app">CT071-3-3-DDAC</span> — built on AWS compute, storage, database, and monitoring for a high-availability early-warning system.
        </p>
      </div>
    </section>
  );
}
