"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/queries/auth";
import { dashboardRootForRole } from "@/app/lib/auth-helpers";
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
  const auth = useAuth();

  const isLoggedIn = auth.isSuccess && auth.data;
  const dashboardPath = isLoggedIn ? dashboardRootForRole(auth.data?.role) : null;

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
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="shrink-0">
            <rect width="32" height="32" rx="8" fill="#7c7cff"/>
            <path d="M16 6C13 6 10 8 9 11C8 14 9 16 10 17.5C11 19 12.5 20 14 21C15 21.7 15.5 22.5 16 24C16.5 22.5 17 21.7 18 21C19.5 20 21 19 22 17.5C23 16 24 14 23 11C22 8 19 6 16 6Z" fill="white" opacity="0.95"/>
            <path d="M12 18C13 17 14.5 16.5 16 16.5C17.5 16.5 19 17 20 18" stroke="#7c7cff" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="16" cy="13" r="2.5" fill="#7c7cff" opacity="0.8"/>
          </svg>
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
          {isLoggedIn && dashboardPath ? (
            <Link href={dashboardPath}
              className="btn-primary relative px-5 py-2 text-[13.5px]">
              Dashboard
            </Link>
          ) : (
            <a href="/login"
              className="btn-primary relative px-5 py-2 text-[13.5px]">
              Sign in
            </a>
          )}
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
          {isLoggedIn && dashboardPath ? (
            <Link href={dashboardPath}
              className="btn-primary w-full py-2.5 text-[14px]">
              Dashboard
            </Link>
          ) : (
            <a href="/login"
              className="btn-primary w-full py-2.5 text-[14px]">
              Sign in
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
