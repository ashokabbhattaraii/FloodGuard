"use client";

import { useState } from "react";
import { useAssignedToMeFloodRequests } from "@/app/queries/flood-requests";
import { PageHeader, SectionCard } from "@/app/(dashboard)/_components/DashboardUI";

interface ReliefLog {
  id: string;
  taskTitle: string;
  supplyType: string;
  quantity: number;
  headcount: number;
  location: string;
  timestamp: string;
  notes: string;
}

export default function VolunteerReliefLog() {
  const activeTasksQuery = useAssignedToMeFloodRequests();
  const activeTasks = Array.isArray(activeTasksQuery.data) ? activeTasksQuery.data : [];

  // Form states
  const [associatedTaskId, setAssociatedTaskId] = useState("");
  const [supplyType, setSupplyType] = useState("food");
  const [quantity, setQuantity] = useState(1);
  const [headcount, setHeadcount] = useState(1);
  const [customLocation, setCustomLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [successMsg, setSuccessMsg] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedTask = activeTasks.find((t) => t.id === associatedTaskId);
    const locationStr = selectedTask ? selectedTask.location : customLocation || "General Area";
    const titleStr = selectedTask ? selectedTask.title : "General Dispatch";

    const newLog: ReliefLog = {
      id: Math.random().toString(36).substring(7),
      taskTitle: titleStr,
      supplyType,
      quantity,
      headcount,
      location: locationStr,
      timestamp: new Date().toLocaleString(),
      notes,
    };

    // Save to local storage to persist in My Activity page
    const existingLogsStr = localStorage.getItem("fg_volunteer_relief_logs") || "[]";
    const existingLogs: ReliefLog[] = JSON.parse(existingLogsStr);
    existingLogs.unshift(newLog);
    localStorage.setItem("fg_volunteer_relief_logs", JSON.stringify(existingLogs));

    // Clear form
    setAssociatedTaskId("");
    setSupplyType("food");
    setQuantity(1);
    setHeadcount(1);
    setCustomLocation("");
    setNotes("");

    // Show feedback
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 4000);
  };

  const ic = (d: string) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Relief Dispatch Logger"
        subtitle="Log the distribution of survival assets, food rations, clean water, and headcounts to verify community aid metrics."
      />

      {successMsg && (
        <div className="mb-6 p-4 rounded-[12px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-3 animate-pulse">
          <span className="shrink-0 text-emerald-400">
            {ic("M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z")}
          </span>
          <div>
            <p className="font-semibold text-[14px]">Log entry submitted successfully!</p>
            <p className="text-[12px] opacity-90 mt-0.5">
              The supplies and headcount metrics have been added to your historical activity profile.
            </p>
          </div>
        </div>
      )}

      <SectionCard title="Submit Relief Log Form">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Associated SOS Task */}
          <div>
            <label className="block text-[12px] font-semibold uppercase text-app-muted mb-2">
              Associated Emergency Call (Optional)
            </label>
            <select
              value={associatedTaskId}
              onChange={(e) => {
                setAssociatedTaskId(e.target.value);
                const task = activeTasks.find((t) => t.id === e.target.value);
                if (task) setCustomLocation(task.location);
              }}
              className="form-control w-full px-4 py-3 bg-app/5 border-app rounded-[10px] text-[14px] focus:outline-none focus:border-accent text-app"
            >
              <option value="">-- No Active Task / General Area Relief --</option>
              {activeTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.priority.toUpperCase()}] {t.title} ({t.location})
                </option>
              ))}
            </select>
            <span className="block text-[11px] text-app-muted mt-1.5 leading-normal">
              Linking a log to an active task helps update dispatcher coordination files.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Supply category */}
            <div>
              <label className="block text-[12px] font-semibold uppercase text-app-muted mb-2">
                Relief Asset Type
              </label>
              <select
                value={supplyType}
                onChange={(e) => setSupplyType(e.target.value)}
                className="form-control w-full px-4 py-3 bg-app/5 border-app rounded-[10px] text-[14px] focus:outline-none focus:border-accent text-app"
              >
                <option value="food">Food Packs / MREs</option>
                <option value="water">Bottled Water (Cases)</option>
                <option value="hygiene">Hygiene & Sanitation Kits</option>
                <option value="medical">Medical / First Aid Kits</option>
                <option value="shelter">Blankets & Tarpaulins</option>
                <option value="other">Rescue Gear / Tools</option>
              </select>
            </div>

            {/* Location (if no task selected) */}
            <div>
              <label className="block text-[12px] font-semibold uppercase text-app-muted mb-2">
                Distribution Spot / Shelter
              </label>
              <input
                type="text"
                required
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="e.g. Tundikhel Main Gate"
                disabled={associatedTaskId !== ""}
                className="form-control w-full px-4 py-3 bg-app/5 border-app rounded-[10px] text-[14px] focus:outline-none focus:border-accent text-app disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quantity */}
            <div>
              <label className="block text-[12px] font-semibold uppercase text-app-muted mb-2">
                Quantity Distributed
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="form-control w-full px-4 py-3 bg-app/5 border-app rounded-[10px] text-[14px] focus:outline-none focus:border-accent text-app"
              />
            </div>

            {/* Headcount */}
            <div>
              <label className="block text-[12px] font-semibold uppercase text-app-muted mb-2">
                Estimated People Served (Headcount)
              </label>
              <input
                type="number"
                min="1"
                required
                value={headcount}
                onChange={(e) => setHeadcount(parseInt(e.target.value) || 1)}
                className="form-control w-full px-4 py-3 bg-app/5 border-app rounded-[10px] text-[14px] focus:outline-none focus:border-accent text-app"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[12px] font-semibold uppercase text-app-muted mb-2">
              Field observations / Missing assets
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. High demand for baby diapers and infant formulas. Water pressure at public tap is dead."
              className="form-control w-full min-h-[100px] bg-app/5 border-app rounded-[10px] p-3 text-[14px] focus:outline-none focus:border-accent text-app"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 border-t border-app flex justify-end">
            <button
              type="submit"
              className="btn-primary px-8 py-3 text-[14px] font-semibold shadow-md flex items-center gap-2"
            >
              {ic("M5 13l4 4L19 7")} Submit Log Entry
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
