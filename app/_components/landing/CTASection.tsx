"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import PillButton from "@/app/_components/ui/PillButton";

gsap.registerPlugin(ScrollTrigger);

export default function CTASection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef    = useRef<HTMLDivElement>(null);
  const glowRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(cardRef.current,
        { y: 80, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: "power3.out",
          scrollTrigger: { trigger: cardRef.current, start: "top 85%", once: true } }
      );
      gsap.to(glowRef.current, { scale: 1.22, opacity: 0.75, duration: 4, ease: "sine.inOut", repeat: -1, yoyo: true });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-32 px-[10%] overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div ref={cardRef} style={{ opacity: 0, transformStyle: "preserve-3d" }}
          className="relative rounded-[24px] p-16 text-center overflow-hidden noise glass-1 border border-[rgba(3,105,161,0.18)] shadow-[0_0_60px_rgba(3,105,161,0.06)]">

          {/* Animated glow */}
          <div ref={glowRef}
            className="absolute top-[-25%] left-1/2 -translate-x-1/2 w-[560px] h-[280px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(3,105,161,0.28) 0%, transparent 70%)", filter: "blur(40px)" }}
          />

          {/* Corner border accents */}
          <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-[rgba(3,105,161,0.35)] rounded-tl-[24px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-[rgba(3,105,161,0.35)] rounded-br-[24px] pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[100px] glass-2 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0369a1] shadow-[0_0_6px_2px_rgba(3,105,161,0.5)]" />
              <span className="text-[11px] text-accent tracking-[0.15em] uppercase font-medium">Free for Communities</span>
            </div>

            <h2 className="text-[clamp(38px,6vw,76px)] font-[800] text-app leading-[1.06] mb-6">
              Protect your community<br/>before flooding escalates.
            </h2>

            <p className="text-[16px] text-app-muted max-w-sm mx-auto leading-relaxed mb-10">
              Join thousands of residents already receiving real-time alerts. Setup takes under 2 minutes.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <PillButton size="lg" variant="primary">
                Get Early Access
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M3 7.5h9M8 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </PillButton>
              <PillButton size="lg" variant="ghost">View Live Dashboard</PillButton>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-[12px] text-app-muted">
              {["AWS Powered", "99.9% Uptime", "Free for residents", "GDPR Compliant"].map((badge) => (
                <div key={badge} className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" stroke="#0369a1" strokeWidth="1"/>
                    <path d="M3.5 6l1.5 1.5 3-3" stroke="#0369a1" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {badge}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
