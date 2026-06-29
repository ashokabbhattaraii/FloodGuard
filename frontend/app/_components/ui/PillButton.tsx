"use client";
import { forwardRef } from "react";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const PillButton = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", children, className = "", ...props }, ref) => {
    const base =
      "relative inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] font-semibold transition-all duration-200 cursor-pointer select-none whitespace-nowrap overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100";

    const sizes = {
      sm: "px-5 py-2 text-[14px]",
      md: "px-6 py-[11px] text-[15px]",
      lg: "px-8 py-4 text-[17px]",
    };

    const variants = {
      primary:
        "bg-[var(--accent)] text-white shadow-[0_14px_28px_-20px_rgba(3,105,161,0.9)] hover:bg-[#075985] active:scale-[0.98] disabled:hover:bg-[var(--accent)]",
      ghost:
        "border border-app bg-[var(--glass-bg-2)] text-app hover:bg-[var(--accent-soft)] hover:text-accent active:scale-[0.98] disabled:hover:bg-[var(--glass-bg-2)] disabled:hover:text-app",
    };

    return (
      <button ref={ref} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
        {children}
      </button>
    );
  }
);

PillButton.displayName = "PillButton";
export default PillButton;
