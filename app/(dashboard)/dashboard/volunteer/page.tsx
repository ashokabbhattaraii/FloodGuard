"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuth } from "@/app/queries/auth";

const RouteMap = dynamic(() => import("@/app/_components/ui/RouteMap"), {
  ssr: false,
});
import {
  useAssignedToMeFloodRequests,
  useUnclaimedFloodRequests,
  useUpdateFloodRequestStatus,
} from "@/app/queries/flood-requests";
import {
  PageHeader,
  StatCard,
  SectionCard,
  EmptyState,
  LoadingRows,
} from "@/app/(dashboard)/_components/DashboardUI";

export default function VolunteerOverview() {
  const auth = useAuth();
  const assignedQuery = useAssignedToMeFloodRequests();
  const unclaimedQuery = useUnclaimedFloodRequests();
  const updateStatus = useUpdateFloodRequestStatus();

  // Availability State stored in localStorage
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [showNotesModal, setShowNotesModal] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [directionsTaskId, setDirectionsTaskId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("fg_volunteer_available");
    if (saved !== null) {
      setIsAvailable(saved === "true");
    }
  }, []);

  const toggleAvailability = () => {
    const newVal = !isAvailable;
    setIsAvailable(newVal);
    localStorage.setItem("fg_volunteer_available", String(newVal));
  };

  const myTasks = Array.isArray(assignedQuery.data) ? assignedQuery.data : [];
  const openSOS = Array.isArray(unclaimedQuery.data) ? unclaimedQuery.data : [];

  const activeTasks = myTasks.filter(
    (t) => t.status === "assigned" || t.status === "in_progress"
  );
  const completedCount = myTasks.filter((t) => t.status === "completed").length;

  const handleUpdateStatus = (id: string, status: string, notes?: string) => {
    updateStatus.mutate(
      { id, data: { status, ...(notes ? { notes } : {}) } },
      {
        onSuccess: () => {
          setShowNotesModal(null);
          setNotesText("");
        },
      }
    );
  };

  const handleReleaseTask = (id: string) => {
    updateStatus.mutate({
      id,
      data: { status: "pending", assignedTo: null },
    });
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
    <div className="relative">
      {/* Top Banner Alert depending on availability */}
      <div
        className={`mb-6 p-4 rounded-[12px] border transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isAvailable
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            : "bg-amber-500/10 border-amber-500/20 text-amber-300"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isAvailable ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                isAvailable ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </span>
          <div>
            <p className="font-semibold text-[14px]">
              {isAvailable ? "Status: Active & Dispatchable" : "Status: Off Duty / Resting"}
            </p>
            <p className="text-[12px] opacity-80 mt-0.5">
              {isAvailable
                ? "You will appear as active for emergency dispatchers. Check Open Requests to claim tasks."
                : "Toggle back to active when you are ready to respond to community SOS tasks."}
            </p>
          </div>
        </div>
        <button
          onClick={toggleAvailability}
          className={`px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all shadow-sm shrink-0 border ${
            isAvailable
              ? "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 border-emerald-500/30"
              : "bg-amber-600/20 hover:bg-amber-600/30 text-amber-200 border-amber-500/30"
          }`}
        >
          {isAvailable ? "Go Off Duty" : "Go Active"}
        </button>
      </div>

      <PageHeader
        title="Volunteer Dashboard"
        subtitle="Manage your disaster relief tasks, report actions, and browse community emergency calls."
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/volunteer/requests"
              className="btn-primary inline-flex px-5 py-2.5 text-[14px]"
            >
              Browse Open SOS
            </Link>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="My Active Tasks"
          value={activeTasks.length}
          accent="var(--accent)"
          loading={assignedQuery.isLoading}
          icon={ic("M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2")}
        />
        <StatCard
          label="Open SOS Reports"
          value={openSOS.length}
          accent="#f97316"
          loading={unclaimedQuery.isLoading}
          icon={ic("M15 7a5 5 0 00-10 0c0 5.5-2 7-2 7h14s-2-1.5-2-7")}
        />
        <StatCard
          label="Completed Reliefs"
          value={completedCount}
          accent="#16a34a"
          loading={assignedQuery.isLoading}
          icon={ic("M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z")}
        />
        <StatCard
          label="Activity Status"
          value={isAvailable ? "Active" : "Offline"}
          accent={isAvailable ? "#10b981" : "#f59e0b"}
          icon={ic("M13 10V3L4 14h7v7l9-11h-7z")}
        />
      </div>

      {/* Tasks Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Tasks Column (Takes 2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <SectionCard title="My Active Assignments">
            {assignedQuery.isLoading ? (
              <LoadingRows count={3} />
            ) : activeTasks.length === 0 ? (
              <div className="text-center py-12 rounded-[12px] border border-dashed border-app bg-app/5">
                <p className="text-app-muted text-[14px]">No active assignments.</p>
                <p className="text-[12px] text-app-muted mt-1">
                  Claim pending reports on the{" "}
                  <Link href="/dashboard/volunteer/requests" className="text-accent hover:underline">
                    Claim Board
                  </Link>{" "}
                  to begin.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {activeTasks.map((task) => {
                  const isPendingRoute = task.status === "assigned";
                  const isCurrentRoute = task.status === "in_progress";
                  const pCol =
                    task.priority === "critical"
                      ? "text-red-400 border-red-500/20 bg-red-500/10"
                      : task.priority === "high"
                      ? "text-orange-400 border-orange-500/20 bg-orange-500/10"
                      : task.priority === "medium"
                      ? "text-sky-400 border-sky-500/20 bg-sky-500/10"
                      : "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";

                  return (
                    <div
                      key={task.id}
                      className="surface-card rounded-[12px] p-5 border border-app hover:border-[var(--accent)] transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span
                              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-[6px] border ${pCol}`}
                            >
                              {task.priority} Priority
                            </span>
                            <span className="text-[11px] font-medium text-app-muted uppercase bg-app/20 px-2 py-0.5 rounded border border-app">
                              {task.type}
                            </span>
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                isCurrentRoute
                                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {isCurrentRoute ? "In Progress" : "Claimed - Awaiting Route"}
                            </span>
                          </div>
                          <h3 className="text-[16px] font-[600] text-app">{task.title}</h3>
                          <p className="text-[13px] text-app-muted mt-1 leading-relaxed">
                            {task.description}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-app/10 rounded-[10px] border border-app text-[13px]">
                        <div>
                          <span className="block text-[11px] text-app-muted uppercase font-medium">
                            Location
                          </span>
                          <span className="font-medium text-app">{task.location}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] text-app-muted uppercase font-medium">
                            Contact / People Count
                          </span>
                          <span className="font-medium text-app">
                            {task.contactPhone || "No Phone"} ({task.peopleCount} {task.peopleCount === 1 ? "Person" : "People"})
                          </span>
                        </div>
                      </div>

                      {/* Operations buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-app">
                        <button
                          onClick={() => handleReleaseTask(task.id)}
                          className="px-3.5 py-2 rounded-[10px] text-[13px] font-medium text-red-400 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 transition-all"
                        >
                          Release Assignment
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDirectionsTaskId(task.id)}
                            className="px-3.5 py-2 rounded-[10px] text-[13px] font-medium text-accent hover:bg-[var(--accent-soft)] border border-[var(--accent-soft-2)] hover:border-[var(--accent)] transition-all flex items-center gap-1.5"
                          >
                            {ic("M10 2a6 6 0 00-6 6c0 4 6 10 6 10s6-6 6-10a6 6 0 00-6-6zM10 10.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z")}
                            Get Directions
                          </button>
                          {isPendingRoute && (
                            <button
                              onClick={() => handleUpdateStatus(task.id, "in_progress")}
                              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-semibold rounded-[10px] shadow transition-all flex items-center gap-1.5"
                            >
                              {ic("M13 5l7 7-7 7M5 5l7 7-7 7")} Start Route
                            </button>
                          )}
                          {isCurrentRoute && (
                            <>
                              <button
                                onClick={() => {
                                  setShowNotesModal(task.id);
                                  setNotesText(task.notes || "");
                                }}
                                className="px-3.5 py-2 text-[13px] font-medium text-accent hover:bg-[var(--accent-soft)] rounded-[10px] transition-all border border-transparent hover:border-[var(--accent)]"
                              >
                                Edit Notes
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(task.id, "completed")}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-[10px] shadow transition-all"
                              >
                                Complete Request
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Quick Operations Sidebar */}
        <div className="flex flex-col gap-6">
          <SectionCard title="Volunteer Resources">
            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard/volunteer/relief"
                className="flex items-center justify-between p-3.5 rounded-[10px] border border-app hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-accent group-hover:scale-105 transition-all">
                    {ic("M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8")}
                  </div>
                  <div>
                    <span className="block text-[13px] font-semibold text-app">Log Relief Work</span>
                    <span className="block text-[11px] text-app-muted mt-0.5">Submit supply logs</span>
                  </div>
                </div>
                {ic("M9 5l7 7-7 7")}
              </Link>

              <Link
                href="/dashboard/volunteer/shelters"
                className="flex items-center justify-between p-3.5 rounded-[10px] border border-app hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-accent group-hover:scale-105 transition-all">
                    {ic("M10 3l7 6v8H3V9l7-6zM8 17v-5h4v5")}
                  </div>
                  <div>
                    <span className="block text-[13px] font-semibold text-app">Evacuation Centers</span>
                    <span className="block text-[11px] text-app-muted mt-0.5">Check occupancy rates</span>
                  </div>
                </div>
                {ic("M9 5l7 7-7 7")}
              </Link>

              <Link
                href="/dashboard/volunteer/activity"
                className="flex items-center justify-between p-3.5 rounded-[10px] border border-app hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-accent group-hover:scale-105 transition-all">
                    {ic("M12 8v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0")}
                  </div>
                  <div>
                    <span className="block text-[13px] font-semibold text-app">My Activity Logs</span>
                    <span className="block text-[11px] text-app-muted mt-0.5">View historical data</span>
                  </div>
                </div>
                {ic("M9 5l7 7-7 7")}
              </Link>
            </div>
          </SectionCard>

          <SectionCard title="Nearby Open SOS Queue">
            {unclaimedQuery.isLoading ? (
              <LoadingRows count={2} />
            ) : openSOS.length === 0 ? (
              <EmptyState message="All emergency requests are claimed!" />
            ) : (
              <div className="flex flex-col gap-3">
                {openSOS.slice(0, 4).map((task) => {
                  const pCol =
                    task.priority === "critical"
                      ? "bg-red-500/10 text-red-400"
                      : task.priority === "high"
                      ? "bg-orange-500/10 text-orange-400"
                      : "bg-sky-500/10 text-sky-400";
                  return (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-[10px] border border-app hover:border-[var(--accent)] transition-all flex flex-col gap-2 bg-app/5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${pCol}`}>
                          {task.priority}
                        </span>
                        <span className="text-[11px] text-app-muted font-medium uppercase">
                          {task.type}
                        </span>
                      </div>
                      <h4 className="text-[13.5px] font-semibold text-app line-clamp-1">{task.title}</h4>
                      <p className="text-[12px] text-app-muted line-clamp-2">{task.description}</p>
                      <div className="flex items-center justify-between gap-2 mt-1.5 pt-2 border-t border-app/5">
                        <span className="text-[11.5px] text-app-muted truncate max-w-[120px]">
                          {task.location}
                        </span>
                        <Link
                          href="/dashboard/volunteer/requests"
                          className="text-[11.5px] font-semibold text-accent hover:underline"
                        >
                          View Details & Claim →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Directions Modal */}
      {directionsTaskId && (() => {
        const task = myTasks.find((t) => t.id === directionsTaskId);
        if (!task) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="surface-card w-full max-w-3xl rounded-[14px] p-5 shadow-xl border border-app animate-[scaleIn_0.2s_ease-out] max-h-[92vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-[18px] font-semibold text-app">Navigate to Dispatch</h3>
                  <p className="text-[13px] text-app-muted mt-0.5">
                    {task.title} — {task.location}
                  </p>
                </div>
                <button
                  onClick={() => setDirectionsTaskId(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-app-muted hover:bg-app/10 transition-all shrink-0"
                  aria-label="Close"
                >
                  {ic("M6 6l8 8M14 6l-8 8")}
                </button>
              </div>
              <RouteMap
                destination={{
                  lat: task.latitude ?? 27.7172,
                  lng: task.longitude ?? 85.324,
                }}
                destinationLabel={task.title}
                color={
                  task.priority === "critical"
                    ? "#dc2626"
                    : task.priority === "high"
                    ? "#f97316"
                    : task.priority === "medium"
                    ? "#ca8a04"
                    : "#16a34a"
                }
              />
            </div>
          </div>
        );
      })()}

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="surface-card w-full max-w-lg rounded-[14px] p-6 shadow-xl border border-app animate-[scaleIn_0.2s_ease-out]">
            <h3 className="text-[18px] font-semibold text-app mb-2">Update Operational Notes</h3>
            <p className="text-[13px] text-app-muted mb-4">
              Add details about road blockages, missing rescue gear, or resident condition.
            </p>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="e.g. Water is deep, team needs inflatable raft to proceed. Residents are stable."
              className="form-control w-full min-h-[120px] mb-4 bg-app/5 border-app rounded-[10px] p-3 text-[14px] focus:outline-none focus:border-accent text-app"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowNotesModal(null)}
                className="px-4 py-2.5 rounded-[10px] text-[13px] font-medium text-app-muted hover:bg-app/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(showNotesModal, "in_progress", notesText)}
                className="btn-primary px-5 py-2.5 text-[13px]"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
