"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { useRegister } from "@/app/queries/auth";
import { dashboardRootForRole } from "@/app/lib/auth-helpers";

const ROLES = [
  { value: "resident", label: "Resident", desc: "Report floods, receive alerts, request help" },
  { value: "volunteer", label: "Volunteer Responder", desc: "Claim SOS requests, deliver relief" },
  { value: "admin", label: "Authority Admin", desc: "Manage alerts, regions, and coordination" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const register = useRegister();
  const rootRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("resident");
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
    register.mutate(
      { name, email, password, role },
      {
        onSuccess: (data) => {
          setRedirecting(true);
          router.push(dashboardRootForRole(data?.user?.role ?? role));
        },
      }
    );
  }

  const busy = register.isPending || redirecting;
  const errorMsg =
    (register.error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message;

  return (
    <div ref={rootRef}>
      <div className="af-item mb-8">
        <p className="text-[11px] font-semibold uppercase text-accent mb-3">Community access</p>
        <h1 className="text-[32px] font-[700] text-app leading-tight">
          Create an account
        </h1>
        <p className="text-app-muted text-[14px] mt-3 leading-relaxed">Join your community&apos;s flood early-warning network.</p>
      </div>

      {register.isError && (
        <div role="alert" className="mb-5 px-4 py-3 rounded-[10px] border border-[rgba(220,38,38,0.24)] bg-[rgba(220,38,38,0.08)]">
          <p className="text-[13px] text-[#dc2626] dark:text-[#fca5a5]">{errorMsg || "Registration failed. Try again."}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-busy={busy}>
        <div className="af-item">
          <label htmlFor="register-name" className="block text-[13px] text-app font-semibold mb-2">Full name</label>
          <input
            id="register-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            required
            autoComplete="name"
            className="auth-input form-control px-4 py-3 text-[15px]"
          />
        </div>

        <div className="af-item">
          <label htmlFor="register-email" className="block text-[13px] text-app font-semibold mb-2">Email</label>
          <input
            id="register-email"
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
          <label htmlFor="register-password" className="block text-[13px] text-app font-semibold mb-2">Password</label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
            className="auth-input form-control px-4 py-3 text-[15px]"
          />
        </div>

        {/* Role selection */}
        <div className="af-item">
          <label className="block text-[13px] text-app font-semibold mb-3">I am a…</label>
          <div className="grid gap-2.5">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-[10px] border text-left transition-all duration-200 ${
                  role === r.value
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_0_3px_rgba(3,105,161,0.12)]"
                    : "border-app bg-[var(--glass-bg-2)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                  role === r.value ? "border-[var(--accent)]" : "border-app"
                }`}>
                  {role === r.value && <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-app">{r.label}</p>
                  <p className="text-[12px] text-app-muted">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={busy} className="af-item btn-primary w-full px-5 py-3 mt-1 text-[15px]">
          <span>{busy ? "Creating account..." : "Create Account"}</span>
        </button>
      </form>
    </div>
  );
}
