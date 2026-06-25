"use client";

import { useState } from "react";

const tips = [
  { id: "bag", label: "Emergency bag packed", detail: "Water, medicine, documents, flashlight, phone charger" },
  { id: "routes", label: "Know your evacuation route", detail: "Check shelters page for nearest safe point" },
  { id: "contacts", label: "Emergency contacts saved", detail: "Family, local authority, emergency hotline" },
  { id: "alerts", label: "Notifications enabled", detail: "SMS/push alerts for your registered region" },
  { id: "valuables", label: "Valuables elevated or secured", detail: "Move electronics and documents above ground floor" },
  { id: "neighbors", label: "Check on vulnerable neighbors", detail: "Elderly, disabled, or families with small children" },
];

const STORAGE_KEY = "fg_preparedness";

function getChecked(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function PreparednessTips() {
  const [checked, setChecked] = useState<string[]>(getChecked);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  const progress = Math.round((checked.length / tips.length) * 100);

  return (
    <div className="surface-card rounded-[12px] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-[650] text-app">Flood Preparedness</h3>
        <span className="text-[11px] font-semibold tabular-nums" style={{ color: progress === 100 ? "#16a34a" : "var(--accent-text)" }}>
          {checked.length}/{tips.length}
        </span>
      </div>

      <div className="mb-4">
        <div className="h-[5px] w-full rounded-full bg-[var(--accent-soft)] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: progress === 100 ? "#16a34a" : "var(--accent)" }} />
        </div>
        <p className="text-[10px] text-app-muted mt-1.5">
          {progress === 100 ? "You're fully prepared!" : "Complete all items to be flood-ready"}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        {tips.map((tip) => {
          const done = checked.includes(tip.id);
          return (
            <button
              key={tip.id}
              onClick={() => toggle(tip.id)}
              className={`flex items-start gap-3 text-left px-3 py-2.5 rounded-[8px] transition-all duration-200 ${done ? "bg-[rgba(22,163,74,0.06)]" : "hover:bg-[var(--accent-soft)]"}`}
            >
              <span className={`mt-0.5 w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-all ${done ? "bg-[#16a34a] border-[#16a34a]" : "border-app"}`}>
                {done && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <div className="min-w-0">
                <span className={`text-[12px] font-medium block ${done ? "text-app-muted line-through" : "text-app"}`}>{tip.label}</span>
                <span className="text-[10px] text-app-muted">{tip.detail}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
