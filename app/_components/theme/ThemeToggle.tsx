"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <span className="theme-toggle__thumb">
        {theme === "dark" ? (
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path
              d="M9 6.2A3.6 3.6 0 0 1 4.8 2 3.6 3.6 0 1 0 9 6.2Z"
              fill="white"
            />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <circle cx="5.5" cy="5.5" r="2.2" fill="white" />
            <path
              d="M5.5 1v1M5.5 9v1M1 5.5h1M9 5.5h1M2.3 2.3l.7.7M8 8l.7.7M8.7 2.3l-.7.7M3 8l-.7.7"
              stroke="white"
              strokeWidth="0.9"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
