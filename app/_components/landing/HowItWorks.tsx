"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    n: "01",
    title: "Collect",
    body: "Continuously gather flood-relevant information from multiple trusted channels across monitored regions.",
  },
  {
    n: "02",
    title: "Analyse",
    body: "Intelligent models process incoming information to calculate accurate, per-region flood risk levels in real time.",
  },
  {
    n: "03",
    title: "Alert the Community",
    body: "Automated SMS, email, and push alerts reach residents and authorities the moment danger is detected.",
  },
  {
    n: "04",
    title: "Respond & Recover",
    body: "Live maps, resident reports, and dashboards guide a faster, coordinated emergency response.",
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: sectionRef.current, start: "top 75%", once: true },
      });

      tl.fromTo(".hiw-head", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" })
        .fromTo(
          ".hiw-h-line",
          { scaleX: 0 },
          { scaleX: 1, duration: 1, ease: "power2.inOut" },
          "-=0.25"
        )
        .fromTo(
          ".hiw-v-line",
          { scaleY: 0 },
          { scaleY: 1, duration: 1, ease: "power2.inOut" },
          "<"
        )
        .fromTo(
          ".hiw-diag",
          { scaleX: 0 },
          { scaleX: 1, duration: 0.9, ease: "power2.inOut", stagger: 0.08 },
          "-=0.65"
        )
        .fromTo(
          ".hiw-core",
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(2)" },
          "-=0.4"
        )
        .fromTo(
          ".hiw-cell",
          { y: 28, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", stagger: 0.12 },
          "-=0.55"
        );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="how-it-works" className="relative py-32 px-[8%] overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)" }}
      />

      <div className="relative w-full max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="hiw-head text-center mb-20" style={{ opacity: 0 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[100px] glass-1 mb-6">
            <span className="text-[11px] text-accent tracking-[0.15em] uppercase font-medium">
              How It Works
            </span>
          </div>
          <h2 className="text-[clamp(34px,5vw,60px)] font-[800] text-app leading-[1.1]">
            Data to safety
            <br />
            in minutes.
          </h2>
          <p className="mt-3 text-[16px] text-app-muted tracking-wide">
            From early warning to coordinated response — fully automated.
          </p>
        </div>

        {/* Grid container */}
        <div className="relative">
          {/* Straight crosshair */}
          <div
            className="hiw-h-line absolute left-0 top-1/2 w-full h-px origin-center"
            style={{
              background:
                "linear-gradient(to right, transparent, var(--border) 20%, var(--border) 80%, transparent)",
              transform: "translateY(-50%) scaleX(0)",
            }}
          />
          <div
            className="hiw-v-line absolute top-0 left-1/2 w-px h-full origin-center"
            style={{
              background:
                "linear-gradient(to bottom, transparent, var(--border) 20%, var(--border) 80%, transparent)",
              transform: "translateX(-50%) scaleY(0)",
            }}
          />

          {/* Diagonal X — two rotated lines crossing exactly at center */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
            <div
              className="hiw-diag absolute w-[150%] h-px origin-center"
              style={{
                background:
                  "linear-gradient(to right, transparent, var(--border-soft) 35%, var(--accent-soft) 50%, var(--border-soft) 65%, transparent)",
                transform: "rotate(32deg) scaleX(0)",
              }}
            />
            <div
              className="hiw-diag absolute w-[150%] h-px origin-center"
              style={{
                background:
                  "linear-gradient(to right, transparent, var(--border-soft) 35%, var(--accent-soft) 50%, var(--border-soft) 65%, transparent)",
                transform: "rotate(-32deg) scaleX(0)",
              }}
            />
          </div>

          {/* Glowing core where lines cross */}
          <div
            className="hiw-core absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full z-[3]"
            style={{
              opacity: 0,
              background: "var(--accent)",
              boxShadow: "0 0 12px 3px var(--accent), 0 0 30px 8px var(--accent-soft)",
            }}
          />

          {/* 2x2 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 relative z-[2]">
            {steps.map((s) => (
              <div
                key={s.n}
                className="hiw-cell group flex flex-col items-center text-center px-8 py-16 md:py-24"
                style={{ opacity: 0 }}
              >
                {/* Number badge */}
                <div className="relative">
                  <div
                    className="pointer-events-none absolute inset-0 rounded-[13px] blur-md opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: "var(--accent)" }}
                  />
                  <div className="relative w-[54px] h-[54px] rounded-[13px] glass-2 flex items-center justify-center transition-transform duration-500 group-hover:-translate-y-1">
                    <span className="text-[20px] font-[500] text-app">{s.n}</span>
                  </div>
                </div>
                <h3 className="mt-5 text-[clamp(24px,2.5vw,32px)] font-[500] text-app">{s.title}</h3>
                <p className="mt-3 text-[14px] text-app-muted leading-[1.65] max-w-[280px]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
