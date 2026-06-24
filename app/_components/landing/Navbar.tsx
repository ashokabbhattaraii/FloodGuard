"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import ThemeToggle from "@/app/_components/theme/ThemeToggle";

const navLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Live Alerts", href: "#alerts" },
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
];

export default function Navbar() {
  const navRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.fromTo(navRef.current,
      { y: reduceMotion ? 0 : -24, opacity: 0 },
      { y: 0, opacity: 1, duration: reduceMotion ? 0.01 : 0.42, ease: "power3.out", delay: reduceMotion ? 0 : 0.08 });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const links = navRef.current?.querySelectorAll<HTMLAnchorElement>(".nav-link");
    if (!links) return;
    gsap.fromTo(links, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.24, stagger: 0.035, ease: "power2.out", delay: 0.18 });
  }, []);

  return (
    <header ref={navRef} className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-5" style={{ opacity: 0 }}>
      <div className={`flex items-center justify-between w-full max-w-5xl rounded-[14px] px-4 py-2.5 transition-all duration-300 border border-app backdrop-blur-2xl bg-[var(--nav-bg)] ${scrolled ? "shadow-[var(--shadow-soft)]" : "shadow-[0_8px_28px_-24px_rgba(15,23,42,0.6)]"}`}>
        <a href="#" className="flex items-center gap-2.5 shrink-0 pl-2">
          <div className="relative w-8 h-8 rounded-[9px] bg-[var(--accent)] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1.5C4 1.5 1.5 4 1.5 7C1.5 9.5 3.8 11.5 6.5 11.5C9.2 11.5 11.5 9.5 11.5 7C11.5 4 9 1.5 6.5 1.5Z" fill="white" opacity="0.9"/>
              <path d="M3.5 8C4 6.8 5 6 6.5 6C8 6 9 6.8 9.5 8" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-app font-bold text-[17px]">FloodGuard</span>
        </a>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href}
              className="nav-link px-4 py-2 text-[13.5px] font-medium text-app-muted hover:text-app transition-all duration-200 rounded-[10px] hover:bg-[var(--accent-soft)] inline-block">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3 pr-1">
          <ThemeToggle />
          <a href="/login"
            className="btn-primary relative px-5 py-2 text-[13.5px]">
            Sign in
          </a>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button className="flex flex-col gap-[5px] p-3" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
            {[0,1,2].map((i) => (
              <span key={i} className="block w-5 h-[1.5px] bg-current text-app transition-all duration-300 origin-center"
                style={{ transform: menuOpen && i===0 ? "rotate(45deg) translate(4.5px,4.5px)" : menuOpen && i===2 ? "rotate(-45deg) translate(4.5px,-4.5px)" : "none", opacity: menuOpen && i===1 ? 0 : 1 }} />
            ))}
          </button>
        </div>
      </div>

      <div className={`absolute top-full left-4 right-4 mt-2 rounded-[14px] border border-app backdrop-blur-2xl bg-[var(--nav-bg)] p-4 flex flex-col gap-1 md:hidden transition-all duration-300 ${menuOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        {navLinks.map((link) => (
          <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}
            className="px-4 py-3 text-[15px] text-app-muted hover:text-app hover:bg-[var(--accent-soft)] rounded-[10px] transition-all">
            {link.label}
          </a>
        ))}
        <div className="mt-2 pt-3 border-t border-app">
          <a href="/login"
            className="btn-primary w-full py-2.5 text-[14px]">
            Sign in
          </a>
        </div>
      </div>
    </header>
  );
}
