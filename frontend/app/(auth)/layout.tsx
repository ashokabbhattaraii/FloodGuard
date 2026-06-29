"use client";

import { useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { gsap } from "gsap";
import { ThemeProvider } from "@/app/_components/theme/ThemeProvider";
import ThemeToggle from "@/app/_components/theme/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/login";

  // First-load entrance + continuous floating on the visual panel
  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      gsap.fromTo(".auth-card-shell",
        { opacity: 0, y: 20, scale: 0.99 },
        { opacity: 1, y: 0, scale: 1, duration: reduceMotion ? 0.01 : 0.42, ease: "power3.out" });

      gsap.fromTo(".auth-visual",
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: reduceMotion ? 0.01 : 0.46, ease: "power3.out", delay: reduceMotion ? 0 : 0.08 });

      if (reduceMotion) return;

      gsap.utils.toArray<HTMLElement>(".float-card").forEach((el, i) => {
        gsap.to(el, {
          y: i % 2 === 0 ? -5 : -3,
          duration: 4.5 + i * 0.35,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: i * 0.2,
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  // Reset the form container to visible whenever the route changes.
  // login/register share this layout, so the formRef div persists across
  // navigation — without this it stays at opacity:0 from switchTo and hides
  // the incoming page's form entirely.
  useEffect(() => {
    if (formRef.current) gsap.set(formRef.current, { opacity: 1, y: 0 });
  }, [pathname]);

  const switchTo = useCallback((path: string) => {
    if (!formRef.current) return router.push(path);
    gsap.to(formRef.current, {
      opacity: 0, y: 10, duration: 0.16, ease: "power2.in",
      onComplete: () => router.push(path),
    });
  }, [router]);

  return (
    <ThemeProvider>
      <div ref={rootRef} className="min-h-dvh flex items-center justify-center p-4 sm:p-8" style={{ background: "var(--bg)" }}>
        {/* Main card container */}
        <div className="auth-card-shell w-full max-w-[1080px] min-h-[660px] rounded-[18px] overflow-hidden flex border border-[var(--glass-border)] shadow-[var(--shadow-soft)]" style={{ background: "var(--bg-elevated)" }}>

          {/* LEFT — Form side */}
          <div className="flex-1 flex flex-col px-6 sm:px-12 py-6 sm:py-10 relative">
            {/* Logo top + Theme toggle for mobile */}
            <div className="flex items-center justify-between mb-8 sm:mb-12">
              <Link href="/" className="flex items-center gap-2.5">
                <svg width="36" height="36" viewBox="0 0 32 32" fill="none" className="shrink-0">
                  <rect width="32" height="32" rx="8" fill="#7c7cff"/>
                  <path d="M16 6C13 6 10 8 9 11C8 14 9 16 10 17.5C11 19 12.5 20 14 21C15 21.7 15.5 22.5 16 24C16.5 22.5 17 21.7 18 21C19.5 20 21 19 22 17.5C23 16 24 14 23 11C22 8 19 6 16 6Z" fill="white" opacity="0.95"/>
                  <path d="M12 18C13 17 14.5 16.5 16 16.5C17.5 16.5 19 17 20 18" stroke="#7c7cff" strokeWidth="1.8" strokeLinecap="round"/>
                  <circle cx="16" cy="13" r="2.5" fill="#7c7cff" opacity="0.8"/>
                </svg>
                <div>
                  <span className="block text-app font-[700] text-[16px]">FloodGuard</span>
                  <span className="block text-[11px] text-app-muted">Flood response network</span>
                </div>
              </Link>
              <div className="lg:hidden">
                <ThemeToggle />
              </div>
            </div>

            {/* Form content with animation ref */}
            <div ref={formRef} className="flex-1 flex flex-col justify-center max-w-[380px]">
              {children}
            </div>

            {/* Bottom footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 text-[13px] text-app-muted">
              <span className="text-center sm:text-left">
                {isLogin ? "No account? " : "Have an account? "}
                <button
                  onClick={() => switchTo(isLogin ? "/register" : "/login")}
                  className="text-accent hover:underline font-medium"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </span>
              <span className="text-center sm:text-right">Terms & Privacy</span>
            </div>
          </div>

          {/* RIGHT — Visual panel */}
          <div className="auth-visual hidden lg:flex w-[48%] relative overflow-hidden rounded-[14px] m-3 border border-app" style={{ background: "linear-gradient(180deg, var(--bg-mid), var(--bg))" }}>
            {/* Ambient effects */}
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(var(--border-soft) 1px, transparent 1px), linear-gradient(90deg, var(--border-soft) 1px, transparent 1px)", backgroundSize: "44px 44px", opacity: 0.38 }} />
            <div className="absolute inset-x-0 top-0 h-28 pointer-events-none bg-gradient-to-b from-white/20 to-transparent dark:from-white/5" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center w-full px-10 text-center">
              {/* Floating cards mockup */}
              <div className="relative w-full max-w-[320px]">
                {/* Alert card */}
                <div className="float-card surface-card rounded-[12px] p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-[10px] bg-[rgba(220,38,38,0.12)] flex items-center justify-center">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg>
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] font-semibold text-app">Flood Alert Active</p>
                      <p className="text-[11px] text-app-muted">Kathmandu Valley · Critical</p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-[rgba(220,38,38,0.14)] overflow-hidden">
                    <div className="h-full w-[85%] rounded-full bg-[#dc2626]" />
                  </div>
                </div>

                {/* Stats card */}
                <div className="float-card surface-card rounded-[12px] p-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[{ v: "4", l: "Regions" }, { v: "99.9%", l: "Uptime" }, { v: "<30s", l: "Alerts" }].map((s) => (
                      <div key={s.l} className="text-center">
                        <div className="text-[18px] font-[700] text-accent">{s.v}</div>
                        <div className="text-[10px] text-app-muted mt-0.5">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -top-3 -right-3 surface-card rounded-[10px] px-3 py-2 flex items-center gap-2">
                  <span className="relative flex w-2 h-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16a34a] opacity-70" />
                    <span className="relative inline-flex rounded-full w-2 h-2 bg-[#16a34a]" />
                  </span>
                  <span className="text-[11px] text-app font-semibold">Live</span>
                </div>
              </div>

              <p className="mt-8 text-[15px] text-app-muted leading-relaxed max-w-[280px]">
                Verified alerts, resident reports, and regional response tools in one secure workspace.
              </p>
            </div>

            {/* Theme toggle */}
            <div className="absolute top-5 right-5 z-20">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
