"use client";

import { useEffect, useState } from "react";
import { useAssignedToMeFloodRequests } from "@/app/queries/flood-requests";
import {
  PageHeader,
  StatCard,
  SectionCard,
  EmptyState,
} from "@/app/(dashboard)/_components/DashboardUI";

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

export default function VolunteerActivity() {
  const myTasksQuery = useAssignedToMeFloodRequests();
  const [reliefLogs, setReliefLogs] = useState<ReliefLog[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("fg_volunteer_relief_logs") || "[]";
    try {
      setReliefLogs(JSON.parse(saved));
    } catch (e) {
      setReliefLogs([]);
    }
  }, []);

  const tasks = Array.isArray(myTasksQuery.data) ? myTasksQuery.data : [];
  const completedTasks = tasks.filter((t) => t.status === "completed");

  // Summing Stats
  const totalCompleted = completedTasks.length;
  const totalPeopleRescued = completedTasks.reduce((sum, t) => sum + (t.peopleCount || 0), 0);
  const totalPeopleSupplied = reliefLogs.reduce((sum, l) => sum + (l.headcount || 0), 0);
  const totalSuppliesLogged = reliefLogs.reduce((sum, l) => sum + (l.quantity || 0), 0);

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
    <div>
      <PageHeader
        title="My Activity Profile"
        subtitle="Monitor your personal contribution metrics, view completed rescue operations, and review your logged field dispatches."
      />

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Rescues Completed"
          value={totalCompleted}
          accent="var(--accent)"
          loading={myTasksQuery.isLoading}
          icon={ic("M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z")}
        />
        <StatCard
          label="People Rescued"
          value={totalPeopleRescued}
          accent="#f97316"
          loading={myTasksQuery.isLoading}
          icon={ic("M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197")}
        />
        <StatCard
          label="Headcount Supplied"
          value={totalPeopleSupplied}
          accent="#10b981"
          icon={ic("M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z")}
        />
        <StatCard
          label="Asset Items Logged"
          value={totalSuppliesLogged}
          accent="#8b5cf6"
          icon={ic("M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Rescue Operations Timeline */}
        <SectionCard title="Rescue Operations Log">
          {myTasksQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-app/5 rounded-[10px] animate-pulse" />
              ))}
            </div>
          ) : completedTasks.length === 0 ? (
            <EmptyState message="You haven't completed any SOS requests yet." />
          ) : (
            <div className="relative pl-5 border-l-2 border-app space-y-6 py-2">
              {completedTasks.map((task) => {
                const dateStr = new Date(task.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div key={task.id} className="relative">
                    {/* Circle Node */}
                    <span className="absolute -left-[27px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-accent ring-4 ring-[var(--accent-soft)]" />

                    <div>
                      <span className="text-[11px] font-semibold text-app-muted uppercase">
                        Completed on {dateStr}
                      </span>
                      <h4 className="text-[15px] font-bold text-app mt-0.5">{task.title}</h4>
                      <p className="text-[12.5px] text-app-muted mt-1 leading-relaxed">
                        {task.description}
                      </p>

                      <div className="mt-2.5 p-3 rounded-[8px] bg-app/10 border border-app text-[12px] text-app">
                        <strong>Operational Notes: </strong>
                        <span className="italic text-app-muted">
                          {task.notes || "No notes submitted."}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-[12px] text-app-muted font-medium">
                        <span>📍 {task.location}</span>
                        <span>👥 Stranded: {task.peopleCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Right Side: Relief Supplies Logged */}
        <SectionCard title="Relief Supply Logs">
          {reliefLogs.length === 0 ? (
            <EmptyState message="No relief supplies logged yet." />
          ) : (
            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
              {reliefLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-[12px] border border-app bg-app/5 hover:border-[var(--accent-soft-2)] transition-all flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-app-muted font-medium uppercase">
                      {log.timestamp}
                    </span>
                    <span className="text-[11.5px] font-semibold text-accent uppercase bg-[var(--accent-soft)] px-2.5 py-0.5 rounded border border-accent/10">
                      {log.supplyType}
                    </span>
                  </div>

                  <h4 className="text-[14px] font-semibold text-app">{log.taskTitle}</h4>
                  <p className="text-[12.5px] text-app-muted leading-relaxed">
                    Distributed <strong className="text-app">{log.quantity} items</strong> serving approximately{" "}
                    <strong className="text-app">{log.headcount} people</strong>.
                  </p>

                  {log.notes && (
                    <p className="text-[12px] text-app-muted italic border-t border-app/5 pt-2 mt-1">
                      Field Note: "{log.notes}"
                    </p>
                  )}

                  <div className="text-[12px] text-app-muted mt-1.5 flex items-center gap-1.5">
                    📍 <span className="truncate">{log.location}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
