"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  useUnclaimedFloodRequests,
  useClaimFloodRequest,
} from "@/app/queries/flood-requests";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  LoadingRows,
} from "@/app/(dashboard)/_components/DashboardUI";

const InteractiveDetailMap = dynamic(
  () => import("@/app/_components/ui/InteractiveDetailMap"),
  { ssr: false }
);

const RouteMap = dynamic(() => import("@/app/_components/ui/RouteMap"), {
  ssr: false,
});

export default function VolunteerRequestsBoard() {
  const unclaimedQuery = useUnclaimedFloodRequests();
  const claimMutation = useClaimFloodRequest();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showDirections, setShowDirections] = useState(false);

  const tasks = Array.isArray(unclaimedQuery.data) ? unclaimedQuery.data : [];

  // Filter Tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    return matchesSearch && matchesPriority && matchesType;
  });

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || filteredTasks[0] || null;

  const handleClaim = (id: string) => {
    if (confirm("Are you sure you want to claim this emergency response task?")) {
      claimMutation.mutate(id, {
        onSuccess: () => {
          alert("Task claimed successfully! It has been added to 'My Tasks'.");
          setSelectedTaskId(null);
        },
        onError: (err: any) => {
          alert(err.response?.data?.message || "Failed to claim task. It may have already been claimed by another responder.");
        },
      });
    }
  };

  const ic = (d: string) => (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
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
        title="Open Emergency Calls"
        subtitle="Review community SOS submissions and claim tasks. Operations are updated in real-time."
      />

      {/* Filter Toolbar */}
      <div className="surface-card rounded-[12px] p-4 mb-6 border border-app flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by keyword, street address..."
            className="form-control w-full pl-10 pr-4 py-2.5 bg-app/5 border-app rounded-[10px] text-[14px]"
          />
          <span className="absolute left-3.5 top-3.5 text-app-muted">
            {ic("M8 4a4 4 0 100 8 4 4 0 000-8zM2 2l4 4")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="form-control px-4 py-2.5 bg-app/5 border-app rounded-[10px] text-[14px] focus:outline-none focus:border-accent text-app"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="form-control px-4 py-2.5 bg-app/5 border-app rounded-[10px] text-[14px] focus:outline-none focus:border-accent text-app"
          >
            <option value="all">All Types</option>
            <option value="rescue">Rescue</option>
            <option value="evacuation">Evacuation</option>
            <option value="relief">Relief Supplies</option>
            <option value="medical">Medical Help</option>
            <option value="shelter">Shelter Request</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Tasks List (Takes 5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <h2 className="text-[14px] font-semibold uppercase text-app-muted tracking-wider">
            Unclaimed Tasks ({filteredTasks.length})
          </h2>

          <div className="flex flex-col gap-3 max-h-[620px] overflow-y-auto pr-1">
            {unclaimedQuery.isLoading ? (
              <LoadingRows count={4} />
            ) : filteredTasks.length === 0 ? (
              <EmptyState message="No pending emergency calls match your filters." />
            ) : (
              filteredTasks.map((t) => {
                const isSelected = selectedTask?.id === t.id;
                const pCol =
                  t.priority === "critical"
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : t.priority === "high"
                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    : t.priority === "medium"
                    ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTaskId(t.id);
                      setShowDirections(false);
                    }}
                    className={`p-4 rounded-[12px] border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[var(--accent-soft)] border-accent shadow-md"
                        : "surface-card border-app hover:border-[var(--accent-soft-2)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${pCol}`}>
                        {t.priority}
                      </span>
                      <span className="text-[11px] text-app-muted font-medium uppercase bg-app/20 px-2 py-0.5 rounded">
                        {t.type}
                      </span>
                    </div>
                    <h3 className="text-[14.5px] font-semibold text-app line-clamp-1">
                      {t.title}
                    </h3>
                    <p className="text-[12.5px] text-app-muted line-clamp-2 mt-1 leading-relaxed">
                      {t.description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-3 text-[12px] text-app-muted">
                      {ic("M10 2a6 6 0 00-6 6c0 4 6 10 6 10s6-6 6-10a6 6 0 00-6-6z")}
                      <span className="truncate">{t.location}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Detailed View + Map (Takes 7 cols) */}
        <div className="lg:col-span-7">
          {selectedTask ? (
            <div className="flex flex-col gap-6">
              <SectionCard
                title={`Request Detail: ${selectedTask.title}`}
                action={
                  <button
                    onClick={() => handleClaim(selectedTask.id)}
                    disabled={claimMutation.isPending}
                    className="btn-primary px-5 py-2 text-[13px] font-semibold shadow"
                  >
                    {claimMutation.isPending ? "Claiming..." : "Claim SOS Task"}
                  </button>
                }
              >
                <div className="space-y-5">
                  <div>
                    <span className="block text-[11px] text-app-muted uppercase font-bold tracking-wide">
                      Description
                    </span>
                    <p className="text-[14px] text-app leading-relaxed mt-1">
                      {selectedTask.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3 bg-app/10 rounded-[10px] border border-app">
                      <span className="block text-[11px] text-app-muted uppercase font-semibold">
                        Reported By
                      </span>
                      <span className="font-semibold text-app text-[13.5px]">
                        {selectedTask.user?.name || "Anonymous Resident"}
                      </span>
                    </div>
                    <div className="p-3 bg-app/10 rounded-[10px] border border-app">
                      <span className="block text-[11px] text-app-muted uppercase font-semibold">
                        Contact Number
                      </span>
                      <span className="font-semibold text-app text-[13.5px]">
                        {selectedTask.contactPhone || "None Provided"}
                      </span>
                    </div>
                    <div className="p-3 bg-app/10 rounded-[10px] border border-app">
                      <span className="block text-[11px] text-app-muted uppercase font-semibold">
                        Stranded Count
                      </span>
                      <span className="font-semibold text-app text-[13.5px]">
                        {selectedTask.peopleCount} {selectedTask.peopleCount === 1 ? "Person" : "People"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-500/5 rounded-[12px] border border-yellow-500/10 text-[13px] leading-relaxed text-app-muted flex items-start gap-2.5">
                    <span className="text-yellow-500 shrink-0 mt-0.5">
                      {ic("M10 3v10M10 17h.01")}
                    </span>
                    <span>
                      <strong>Responder Note:</strong> Ensure you pack appropriate gear for this task
                      type ({selectedTask.type}). Do not enter deep moving water without floatation equipment and a rescue partner.
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="block text-[11px] text-app-muted uppercase font-bold tracking-wide">
                        {showDirections ? "Live Navigation to Dispatch" : "Dispatch Location & Risk Map"}
                      </span>
                      <div className="flex items-center gap-1 p-0.5 rounded-[8px] bg-app/10 border border-app">
                        <button
                          onClick={() => setShowDirections(false)}
                          className={`px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-all ${
                            !showDirections ? "bg-accent text-white" : "text-app-muted hover:text-app"
                          }`}
                        >
                          Location
                        </button>
                        <button
                          onClick={() => setShowDirections(true)}
                          className={`px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-all flex items-center gap-1 ${
                            showDirections ? "bg-accent text-white" : "text-app-muted hover:text-app"
                          }`}
                        >
                          {ic("M10 2a6 6 0 00-6 6c0 4 6 10 6 10s6-6 6-10a6 6 0 00-6-6z")}
                          Directions
                        </button>
                      </div>
                    </div>
                    {showDirections ? (
                      <RouteMap
                        destination={{
                          lat: selectedTask.latitude ?? 27.7172,
                          lng: selectedTask.longitude ?? 85.324,
                        }}
                        destinationLabel={selectedTask.title}
                        color={
                          selectedTask.priority === "critical"
                            ? "#dc2626"
                            : selectedTask.priority === "high"
                            ? "#f97316"
                            : selectedTask.priority === "medium"
                            ? "#ca8a04"
                            : "#16a34a"
                        }
                      />
                    ) : (
                      <InteractiveDetailMap
                        latitude={selectedTask.latitude ?? 27.7172}
                        longitude={selectedTask.longitude ?? 85.324}
                        title={selectedTask.title}
                        color={
                          selectedTask.priority === "critical"
                            ? "#dc2626"
                            : selectedTask.priority === "high"
                            ? "#f97316"
                            : selectedTask.priority === "medium"
                            ? "#ca8a04"
                            : "#16a34a"
                        }
                      />
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 surface-card border border-app rounded-[12px] text-center px-6">
              <span className="w-16 h-16 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-accent mb-4">
                {ic("M12 9v4l3 3M12 3a9 9 0 100 18 9 9 0 000-18z")}
              </span>
              <h3 className="text-[16px] font-semibold text-app">No Active Requests</h3>
              <p className="text-[13px] text-app-muted mt-1 max-w-sm leading-relaxed">
                Choose an emergency call from the sidebar list to inspect its dispatch coordinates and operational details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
