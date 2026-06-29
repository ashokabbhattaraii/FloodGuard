"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const links: Record<string, string[]> = {
  Platform: ["Live Alerts", "Flood Map", "Report Incident", "Shelters"],
  Authority: ["Admin Login", "Alert Management", "Integrations", "Docs"],
  Company:   ["About", "Contact", "Privacy Policy", "Terms"],
};

export default function Footer() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.fromTo(ref.current, { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 95%", once: true } });
  }, []);

  return (
    <footer ref={ref} className="relative border-t border-[rgba(71,76,132,0.2)] py-16 px-[10%]" style={{ opacity: 0 }}>
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <a href="#" className="flex items-center gap-2.5 mb-4">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="shrink-0">
                <rect width="32" height="32" rx="8" fill="#7c7cff"/>
                <path d="M16 6C13 6 10 8 9 11C8 14 9 16 10 17.5C11 19 12.5 20 14 21C15 21.7 15.5 22.5 16 24C16.5 22.5 17 21.7 18 21C19.5 20 21 19 22 17.5C23 16 24 14 23 11C22 8 19 6 16 6Z" fill="white" opacity="0.95"/>
                <path d="M12 18C13 17 14.5 16.5 16 16.5C17.5 16.5 19 17 20 18" stroke="#7c7cff" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="16" cy="13" r="2.5" fill="#7c7cff" opacity="0.8"/>
              </svg>
              <span className="text-app font-semibold text-[16px]">FloodGuard</span>
            </a>
            <p className="text-[13px] text-app-muted leading-[1.75] mb-5 max-w-[200px]">
              Real-time flood monitoring and community alert system for vulnerable communities.
            </p>
            <div className="flex items-center gap-2">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inset-0 rounded-full bg-[#4caf50] opacity-60"/>
                <span className="relative rounded-full w-2 h-2 bg-[#4caf50]"/>
              </span>
              <span className="text-[12px] text-app-muted">All systems operational</span>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <h4 className="text-[11px] font-semibold tracking-[0.14em] text-accent uppercase mb-5">{group}</h4>
              <ul className="flex flex-col gap-3">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[13px] text-app-muted hover:text-app transition-colors duration-200">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Emergency strip */}
        <div className="glass-1 rounded-[12px] p-4 mb-10 flex flex-wrap items-center justify-between gap-4 border border-[rgba(255,76,76,0.2)]">
          <div className="flex items-center gap-2.5">
            <span className="relative flex w-2.5 h-2.5">
              <span className="animate-ping absolute inset-0 rounded-full bg-[#ff4c4c] opacity-60"/>
              <span className="relative rounded-full w-2.5 h-2.5 bg-[#ff4c4c]"/>
            </span>
            <span className="text-[13px] text-app font-medium">Emergency Flood Hotline</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[13px] text-app-muted">JPBD: <span className="text-app font-medium">1-800-88-2999</span></span>
            <span className="text-[13px] text-app-muted">Civil Defence: <span className="text-app font-medium">03-8064 2400</span></span>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[rgba(71,76,132,0.15)]">
          <p className="text-[12px] text-app-muted">© 2025 FloodGuard · CT071-3-3-DDAC Group Project · Asia Pacific University</p>
          <div className="flex items-center gap-1.5 text-[12px] text-app-muted">
            <span>Deployed on</span>
            <span className="text-[#f5a623] font-semibold">AWS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
