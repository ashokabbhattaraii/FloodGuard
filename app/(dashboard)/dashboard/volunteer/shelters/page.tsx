"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useEvacuationRoutes } from "@/app/queries/evacuation";
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

const contacts = [
  { service: "Nepal Police (Emergency)", number: "100" },
  { service: "Fire & Rescue Brigade", number: "101" },
  { service: "Red Cross Ambulance", number: "102" },
  { service: "National Disaster Hotline", number: "1155" },
];

export default function VolunteerShelters() {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [showDirections, setShowDirections] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const routesQuery = useEvacuationRoutes();

  if (!mounted) {
    return (
      <div>
        <PageHeader
          title="Evacuation Center Registry"
          subtitle="Check shelter status, occupancy levels, routing instructions, and direct stranded residents."
        />
        <LoadingRows count={3} />
      </div>
    );
  }

  const routes = routesQuery.data || [];

  const filteredShelters = routes.filter((s: any) =>
    s.shelterName.toLowerCase().includes(search.toLowerCase())
  );

  const selectedRoute =
    routes.find((s: any) => s.id === selectedRouteId) || filteredShelters[0] || null;
  const selectedRouteData: any = selectedRoute?.routeData || {};
  const selectedRegionCoords: any = (selectedRoute as any)?.regionCoordinates || {};
  const selectedLat =
    selectedRouteData.coordinates?.lat ?? selectedRegionCoords.lat ?? 27.7007;
  const selectedLng =
    selectedRouteData.coordinates?.lng ?? selectedRegionCoords.lng ?? 85.324;

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
        title="Evacuation Center Registry"
        subtitle="Check shelter status, occupancy levels, routing instructions, and direct stranded residents to empty facilities."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Search & Shelters List (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shelters by name..."
              className="form-control w-full pl-10 pr-4 py-2.5 bg-app/5 border-app rounded-[10px] text-[14px]"
            />
            <span className="absolute left-3.5 top-3.5 text-app-muted">
              {ic("M8 4a4 4 0 100 8 4 4 0 000-8zM2 2l4 4")}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {routesQuery.isLoading ? (
              <LoadingRows count={4} />
            ) : filteredShelters.length === 0 ? (
              <EmptyState message="No shelters found." />
            ) : (
              filteredShelters.map((s: any) => {
                const sData: any = s.routeData || {};
                const cur = sData.currentCount ?? 0;
                const cap = s.capacity || 1;
                const occupancy = Math.min(Math.round((cur / cap) * 100), 100);
                const isSelected = selectedRoute?.id === s.id;
                const isFull = occupancy >= 100;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedRouteId(s.id);
                      setShowDirections(false);
                    }}
                    className={`p-4 rounded-[12px] border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[var(--accent-soft)] border-accent shadow-md"
                        : "surface-card border-app hover:border-[var(--accent-soft-2)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[14.5px] font-semibold text-app truncate max-w-[200px]">{s.shelterName}</h3>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          isFull
                            ? "bg-red-500/10 text-red-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {isFull ? "Full" : "Open"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[12.5px] text-app-muted mb-2">
                      <span>Region: {s.regionName}</span>
                      <span>
                        {cur} / {cap} occupied
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-app/20 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          occupancy >= 90
                            ? "bg-red-500"
                            : occupancy >= 60
                            ? "bg-orange-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${occupancy}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Contact Cards */}
          <SectionCard title="Emergency Dispatch Desk">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
              {contacts.map((c) => (
                <div
                  key={c.service}
                  className="p-3 rounded-[10px] border border-app bg-app/5 flex flex-col"
                >
                  <span className="text-app-muted text-[11px] font-medium uppercase">
                    {c.service}
                  </span>
                  <span className="font-bold text-accent text-[14px] mt-0.5">{c.number}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Right: Shelter Map & Routing Info (7 cols) */}
        <div className="lg:col-span-7">
          {selectedRoute ? (
            <div className="flex flex-col gap-6">
              <SectionCard title={`Shelter Inspection: ${selectedRoute.shelterName}`}>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-app/10 rounded-[10px] border border-app">
                      <span className="block text-[11px] text-app-muted uppercase">Occupancy</span>
                      <span className="text-[16px] font-bold text-app">
                        {Math.min(Math.round(((selectedRouteData.currentCount ?? 0) / (selectedRoute.capacity || 1)) * 100), 100)}%
                      </span>
                    </div>
                    <div className="p-3 bg-app/10 rounded-[10px] border border-app">
                      <span className="block text-[11px] text-app-muted uppercase">Total Capacity</span>
                      <span className="text-[16px] font-bold text-app">
                        {selectedRoute.capacity}
                      </span>
                    </div>
                    <div className="p-3 bg-app/10 rounded-[10px] border border-app">
                      <span className="block text-[11px] text-app-muted uppercase">Available Spaces</span>
                      <span className="text-[16px] font-bold text-emerald-400">
                        {Math.max((selectedRoute.capacity || 0) - (selectedRouteData.currentCount ?? 0), 0)}
                      </span>
                    </div>
                    <div className="p-3 bg-app/10 rounded-[10px] border border-app">
                      <span className="block text-[11px] text-app-muted uppercase">Status</span>
                      <span
                        className={`text-[15px] font-bold ${
                          (selectedRouteData.currentCount ?? 0) >= selectedRoute.capacity ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        {(selectedRouteData.currentCount ?? 0) >= selectedRoute.capacity ? "Full" : "Open"}
                      </span>
                    </div>
                  </div>

                  {/* Route alert banner */}
                  <div className="p-4 bg-orange-500/5 rounded-[12px] border border-orange-500/15 flex items-start gap-3">
                    <span className="text-orange-400 shrink-0 mt-0.5">
                      {ic("M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z")}
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-orange-400">
                        Routing Advisory / Obstacles
                      </p>
                      <p className="text-[12.5px] text-app-muted mt-0.5 leading-relaxed">
                        {selectedRouteData.instructions || 'No routing advisory has been recorded. The paths are clear.'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="block text-[11px] text-app-muted uppercase font-bold tracking-wide">
                        {showDirections ? "Directions to Shelter" : "Shelter Location & Safety Perimeter Map"}
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
                        destination={{ lat: selectedLat, lng: selectedLng }}
                        destinationLabel={selectedRoute.shelterName}
                        color="#0369a1"
                      />
                    ) : (
                      <InteractiveDetailMap
                        latitude={selectedLat}
                        longitude={selectedLng}
                        title={selectedRoute.shelterName}
                        color="#0369a1"
                      />
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
          ) : (
            <div className="flex items-center justify-center py-24 surface-card border border-app rounded-[12px] text-app-muted">
              Select a shelter to view map locations and routing safety info.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

