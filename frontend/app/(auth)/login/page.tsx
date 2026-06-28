"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { toast } from "sonner";
import { useLogin } from "@/app/queries/auth";
import { authService } from "@/app/services/auth";
import { dashboardRootForRole } from "@/app/lib/auth-helpers";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const rootRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.fromTo(
        ".af-item",
        { y: reduceMotion ? 0 : 12, opacity: 0 },
        { y: 0, opacity: 1, duration: reduceMotion ? 0.01 : 0.36, ease: "power3.out", stagger: reduceMotion ? 0 : 0.045, delay: reduceMotion ? 0 : 0.05 }
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: async (data) => {
          setRedirecting(true);
          const role = data?.user?.role ?? (await authService.getMe().catch(() => null))?.role;
          toast.success('Welcome back!', {
            description: `Signed in as ${data?.user?.name || email}`,
          });
          router.push(dashboardRootForRole(role));
        },
        onError: (error: any) => {
          toast.error('Authentication failed', {
            description: error?.response?.data?.message || 'Invalid email or password.',
          });
        },
      }
    );
  }

  const busy = login.isPending || redirecting;
  const errorMsg =
    (login.error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message;

  return (
    <div ref={rootRef}>
      <div className="af-item mb-8">
        <p className="text-[11px] font-semibold uppercase text-accent mb-3">Secure access</p>
        <h1 className="text-[32px] font-[700] text-app leading-tight">
          Welcome back
        </h1>
        <p className="text-app-muted text-[14px] mt-3 leading-relaxed">Sign in to manage alerts, reports, and regional flood response.</p>
      </div>

      {login.isError && (
        <div role="alert" className="mb-5 px-4 py-3 rounded-[10px] border border-[rgba(220,38,38,0.24)] bg-[rgba(220,38,38,0.08)]">
          <p className="text-[13px] text-[#dc2626] dark:text-[#fca5a5]">{errorMsg || "Invalid email or password."}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={busy}>
        <div className="af-item">
          <label htmlFor="login-email" className="block text-[13px] text-app font-semibold mb-2">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            autoComplete="email"
            className="auth-input form-control px-4 py-3 text-[15px]"
          />
        </div>

        <div className="af-item">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="login-password" className="text-[13px] text-app font-semibold">Password</label>
            <a href="#" className="text-[12px] text-accent hover:underline">Forgot?</a>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="auth-input form-control px-4 py-3 pr-12 text-[15px]"
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 min-w-11 min-h-11 rounded-[8px] text-app-muted hover:text-app hover:bg-[var(--accent-soft)] transition-colors flex items-center justify-center" aria-label={showPassword ? "Hide password" : "Show password"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                {showPassword
                  ? <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" />
                  : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                }
              </svg>
            </button>
          </div>
        </div>

        <button type="submit" disabled={busy} className="af-item btn-primary w-full px-5 py-3 mt-1 text-[15px]">
          <span>{busy ? "Signing in..." : "Continue"}</span>
        </button>
      </form>
    </div>
  );
}
