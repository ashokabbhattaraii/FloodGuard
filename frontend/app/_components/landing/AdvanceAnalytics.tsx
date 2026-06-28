"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const tags = ["Live Dashboard", "Risk Insights", "Forecast Models"];

export default function AdvanceAnalytics() {
  const sectionRef = useRef<HTMLElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".aa-head", { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.12,
          scrollTrigger: { trigger: ".aa-head", start: "top 85%", once: true } });

      gsap.fromTo(".aa-left", { x: -40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.1,
          scrollTrigger: { trigger: ".aa-left", start: "top 82%", once: true } });

      [card1Ref, card2Ref, card3Ref].forEach((ref, i) => {
        gsap.fromTo(ref.current,
          { y: 60, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 1, ease: "power3.out", delay: i * 0.12,
            scrollTrigger: { trigger: ref.current, start: "top 85%", once: true } });
      });

      // Animate the line chart path drawing
      const path = sectionRef.current?.querySelector<SVGPathElement>(".aa-line");
      if (path) {
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(path, { strokeDashoffset: 0, duration: 1.8, ease: "power2.out", delay: 0.5,
          scrollTrigger: { trigger: path, start: "top 88%", once: true } });
      }

      // Gentle float on cards
      gsap.to(card2Ref.current, { y: "-=10", duration: 3.5, ease: "sine.inOut", repeat: -1, yoyo: true });
      gsap.to(card3Ref.current, { y: "+=8", duration: 4, ease: "sine.inOut", repeat: -1, yoyo: true, delay: 0.6 });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 px-[10%] overflow-hidden">
      {/* ambient glow */}
      <div className="absolute right-[6%] top-[42%] w-[520px] h-[420px] rounded-full pointer-events-none opacity-50"
        style={{ background: "radial-gradient(ellipse, rgba(3,105,161,0.16) 0%, transparent 70%)", filter: "blur(70px)" }} />

      {/* Heading */}
      <div className="relative max-w-3xl mx-auto text-center mb-24">
        <div className="aa-head inline-flex items-center gap-2 mb-6" style={{ opacity: 0 }}>
          <span className="w-2 h-2 rounded-full bg-[#0369a1] shadow-[0_0_8px_2px_rgba(3,105,161,0.6)]" />
          <span className="text-[12px] text-[#b5b5bb] tracking-[0.18em] uppercase font-medium">Platform Intelligence</span>
        </div>
        <h2 className="aa-head text-[clamp(40px,6.5vw,84px)] font-[800] text-[#f6f6f6] leading-[1.02]" style={{ opacity: 0 }}>
          Explore flood<br />intelligence
        </h2>
        <p className="aa-head mt-6 text-[clamp(15px,1.7vw,19px)] text-[#b5b5bb]" style={{ opacity: 0 }}>
          Built for communities that act before the water rises.
        </p>
      </div>

      {/* Two-column body */}
      <div className="relative w-full grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        {/* Left copy */}
        <div className="flex flex-col">
          <h3 className="aa-left text-[clamp(32px,4.5vw,52px)] font-[800] text-[#f6f6f6] leading-[1.05] mb-5" style={{ opacity: 0 }}>
            Predictive analytics
          </h3>
          <p className="aa-left text-[16px] text-[#b5b5bb] leading-[1.7] max-w-md mb-8" style={{ opacity: 0 }}>
            Stay organized, coordinate seamlessly, and reach vulnerable residents before flood
            conditions arrive — powered by continuous monitoring and ML forecasting.
          </p>
          <div className="aa-left flex flex-wrap gap-3" style={{ opacity: 0 }}>
            {tags.map((t) => (
              <span key={t} className="px-4 py-2.5 rounded-[12px] text-[13px] text-[#f6f6f6] glass-1 hover:border-[rgba(3,105,161,0.4)] hover:bg-[rgba(3,105,161,0.08)] transition-all duration-300 cursor-default">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Right floating cards */}
        <div className="relative min-h-[440px]" style={{ perspective: "1400px" }}>
          {/* Main line-chart card */}
          <div ref={card1Ref} style={{ opacity: 0 }}
            className="absolute top-0 right-0 w-full sm:w-[92%] glass-2 rounded-[16px] p-5 border border-[rgba(3,105,161,0.18)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="text-[12px] text-[#b5b5bb] mb-1">Stream Activity</div>
                <div className="text-[36px] font-[700] text-[#f6f6f6] leading-none">5.65k</div>
              </div>
              <div className="flex gap-1.5">
                <span className="text-[10px] px-2.5 py-1 rounded-[100px] bg-[rgba(255,255,255,0.05)] text-[#b5b5bb] border border-[rgba(71,76,132,0.3)]">Daily ▾</span>
                <span className="text-[10px] px-2.5 py-1 rounded-[100px] bg-[rgba(255,255,255,0.05)] text-[#b5b5bb] border border-[rgba(71,76,132,0.3)]">7D ▾</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mb-3">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 9l3-3 2 2 3-5" stroke="#4caf50" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="text-[11px] text-[#4caf50]">+1.5% readings since last week</span>
            </div>
            {/* line chart */}
            <div className="relative">
              <svg viewBox="0 0 320 130" className="w-full h-[130px]" preserveAspectRatio="none">
                {[0, 1, 2, 3].map((i) => (
                  <line key={i} x1="0" y1={10 + i * 36} x2="320" y2={10 + i * 36} stroke="rgba(71,76,132,0.2)" strokeWidth="1" />
                ))}
                <defs>
                  <linearGradient id="aa-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(3,105,161,0.35)" />
                    <stop offset="100%" stopColor="rgba(3,105,161,0)" />
                  </linearGradient>
                </defs>
                <path d="M0 95 C40 80 60 50 95 55 C130 60 150 90 185 78 C220 66 250 28 290 38 L320 32 L320 130 L0 130 Z" fill="url(#aa-fill)" />
                <path className="aa-line" d="M0 95 C40 80 60 50 95 55 C130 60 150 90 185 78 C220 66 250 28 290 38 L320 32"
                  fill="none" stroke="#075985" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="185" cy="78" r="4" fill="#fff" stroke="#0369a1" strokeWidth="2" />
              </svg>
              {/* tooltip */}
              <div className="absolute left-[52%] top-[34%] -translate-x-1/2 px-2 py-1 rounded-[8px] bg-[#0369a1] text-[10px] text-white whitespace-nowrap shadow-[0_4px_12px_rgba(3,105,161,0.5)]">
                4.2m peak
              </div>
            </div>
          </div>

          {/* Pie / risk distribution card */}
          <div ref={card2Ref} style={{ opacity: 0 }}
            className="absolute bottom-0 right-0 w-[230px] glass-2 rounded-[16px] p-4 border border-[rgba(3,105,161,0.18)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
            <div className="text-[12px] text-[#f6f6f6] font-medium mb-3">Risk Distribution</div>
            <div className="flex items-center gap-4">
              <svg width="78" height="78" viewBox="0 0 42 42" className="-rotate-90">
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#4caf50" strokeWidth="6" strokeDasharray="55 100" />
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f5a623" strokeWidth="6" strokeDasharray="27 100" strokeDashoffset="-55" />
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#ff4c4c" strokeWidth="6" strokeDasharray="18 100" strokeDashoffset="-82" />
              </svg>
              <div className="flex flex-col gap-1.5">
                {[["#4caf50", "Safe", "55%"], ["#f5a623", "Watch", "27%"], ["#ff4c4c", "High", "18%"]].map(([c, l, v]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                    <span className="text-[10px] text-[#b5b5bb]">{l}</span>
                    <span className="text-[10px] text-[#f6f6f6] ml-auto">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Small promo card */}
          <div ref={card3Ref}
            className="absolute bottom-[14%] left-0 w-[210px] rounded-[16px] p-4 border border-[rgba(3,105,161,0.3)] shadow-[0_20px_60px_-15px_rgba(3,105,161,0.4)]"
            style={{
              opacity: 0,
              background: "linear-gradient(135deg, rgba(3,105,161,0.9), rgba(3,105,161,0.75))",
            }}
          >
            <div className="w-8 h-8 rounded-[8px] bg-[rgba(255,255,255,0.2)] flex items-center justify-center mb-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 13V7M7 13V3M11 13V9" stroke="white" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </div>
            <div className="text-[13px] font-semibold text-white mb-1">Live forecasting</div>
            <p className="text-[10px] text-[rgba(255,255,255,0.8)] leading-[1.5] mb-3">Risk predictions delivered straight to your alert feed.</p>
            <span className="inline-block text-[10px] px-3 py-1.5 rounded-[100px] bg-white text-[#4a4aff] font-medium">Learn more</span>
          </div>
        </div>
      </div>
    </section>
  );
}
