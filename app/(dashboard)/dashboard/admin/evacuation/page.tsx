'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRegions } from '@/app/queries/regions';
import {
  useEvacuationRoutes,
  useCreateEvacuationRoute,
  useUpdateEvacuationRoute,
  useDeleteEvacuationRoute,
} from '@/app/queries/evacuation';
import {
  PageHeader,
  SectionCard,
  LoadingRows,
  EmptyState,
} from '@/app/(dashboard)/_components/DashboardUI';

const InteractiveDetailMap = dynamic(
  () => import("@/app/_components/ui/InteractiveDetailMap"),
  { ssr: false }
);

const LocationPicker = dynamic(
  () => import("@/app/_components/ui/LocationPicker"),
  { ssr: false }
);

const DEFAULT_LAT = 27.7007;
const DEFAULT_LNG = 85.3240;

interface RouteData {
  instructions?: string;
  currentCount?: number;
  coordinates?: { lat: number; lng: number };
}

export default function AdminEvacuation() {
  const [mounted, setMounted] = useState(false);
  
  // Active edit/create modes
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form fields
  const [shelterName, setShelterName] = useState('');
  const [regionId, setRegionId] = useState('');
  const [capacity, setCapacity] = useState<number>(300);
  const [currentCount, setCurrentCount] = useState<number>(0);
  const [instructions, setInstructions] = useState('');
  const [latitude, setLatitude] = useState<number>(DEFAULT_LAT);
  const [longitude, setLongitude] = useState<number>(DEFAULT_LNG);
  
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const regionsQuery = useRegions();
  const routesQuery = useEvacuationRoutes();
  
  const createMutation = useCreateEvacuationRoute();
  const updateMutation = useUpdateEvacuationRoute();
  const deleteMutation = useDeleteEvacuationRoute();

  const handleEdit = (route: any) => {
    const routeData: RouteData = route.routeData || {};
    setEditingId(route.id);
    setShelterName(route.shelterName);
    setRegionId(route.regionId);
    setCapacity(route.capacity);
    setCurrentCount(routeData.currentCount ?? 0);
    setInstructions(routeData.instructions ?? '');
    setLatitude(routeData.coordinates?.lat ?? DEFAULT_LAT);
    setLongitude(routeData.coordinates?.lng ?? DEFAULT_LNG);
    setIsFormOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setShelterName('');
    setRegionId((regionsQuery.data as any)?.[0]?.id || '');
    setCapacity(300);
    setCurrentCount(0);
    setInstructions('');
    setLatitude(DEFAULT_LAT);
    setLongitude(DEFAULT_LNG);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shelterName.trim() || !regionId) return;

    const payloadRouteData: RouteData = {
      instructions,
      currentCount,
      coordinates: { lat: latitude, lng: longitude },
    };

    const payload = {
      regionId,
      shelterName,
      capacity,
      routeData: payloadRouteData,
    };

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this evacuation center?')) {
      await deleteMutation.mutateAsync(id);
      if (selectedRouteId === id) setSelectedRouteId(null);
    }
  };

  const ic = (d: string) => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="currentColor">
      <path d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (!mounted) {
    return (
      <div className="space-y-6">
        <PageHeader title="Shelters & Evacuation Manager" />
        <LoadingRows count={3} />
      </div>
    );
  }

  const routes = routesQuery.data || [];
  const regions = (regionsQuery.data as any) || [];

  const selectedRoute = routes.find((r: any) => r.id === selectedRouteId) || routes[0] || null;
  const selectedRouteData: RouteData = selectedRoute?.routeData || {};
  const selectedLat = selectedRouteData.coordinates?.lat ?? DEFAULT_LAT;
  const selectedLng = selectedRouteData.coordinates?.lng ?? DEFAULT_LNG;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shelters & Evacuation Manager"
        subtitle="Manage community shelters, monitor safe routes, and track capacities in real time."
        action={
          <button onClick={handleOpenCreate} className="btn-primary px-5 py-2.5 text-[14px]">
            Add Shelter
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List of Shelters (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <SectionCard title="Shelter Registry">
            {routesQuery.isLoading ? (
              <LoadingRows count={4} />
            ) : routes.length === 0 ? (
              <EmptyState message="No shelters registered yet. Click 'Add Shelter' to register." />
            ) : (
              <div className="flex flex-col gap-3">
                {routes.map((s: any) => {
                  const sData: RouteData = s.routeData || {};
                  const cur = sData.currentCount ?? 0;
                  const cap = s.capacity || 1;
                  const occupancyPct = Math.min(Math.round((cur / cap) * 100), 100);
                  const isFull = occupancyPct >= 100;
                  const isSelected = selectedRoute?.id === s.id;

                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedRouteId(s.id)}
                      className={`p-4 rounded-[12px] border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[var(--accent-soft)] border-accent shadow-sm'
                          : 'surface-card border-app hover:border-[var(--accent-soft-2)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[14.5px] font-semibold text-app truncate max-w-[200px]">
                          {s.shelterName}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                              isFull
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}
                          >
                            {isFull ? 'Full' : 'Open'}
                          </span>
                        </div>
                      </div>

                      <div className="text-[12px] text-app-muted mb-1">
                        Region: <span className="text-app font-medium">{s.regionName}</span>
                      </div>

                      <div className="flex items-center justify-between text-[12.5px] text-app-muted mb-2">
                        <span>{occupancyPct}% full</span>
                        <span>{cur} / {cap} spaces</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-app/20 overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            occupancyPct >= 90
                              ? 'bg-red-500'
                              : occupancyPct >= 60
                              ? 'bg-orange-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${occupancyPct}%` }}
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-end gap-2 pt-1 border-t border-app/5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(s);
                          }}
                          className="px-2.5 py-1 rounded bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-white transition-all text-xs text-app"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(s.id);
                          }}
                          className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 transition-all text-xs border-0"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Detail Pane and Map (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {isFormOpen ? (
            <SectionCard title={editingId ? 'Edit Shelter Details' : 'Register New Shelter'}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-app-muted uppercase mb-1.5">
                      Shelter Name
                    </label>
                    <input
                      type="text"
                      required
                      value={shelterName}
                      onChange={(e) => setShelterName(e.target.value)}
                      placeholder="e.g. Community Center Annex"
                      className="form-control w-full py-2 px-3 bg-app/5 border-app rounded-[8px] text-[14px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-app-muted uppercase mb-1.5">
                      Assigned Region
                    </label>
                    <select
                      value={regionId}
                      onChange={(e) => setRegionId(e.target.value)}
                      className="form-control w-full py-2 px-3 bg-app/5 border-app rounded-[8px] text-[14px]"
                    >
                      {regions.map((r: any) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-app-muted uppercase mb-1.5">
                      Max Capacity
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                      className="form-control w-full py-2 px-3 bg-app/5 border-app rounded-[8px] text-[14px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-app-muted uppercase mb-1.5">
                      Current Occupancy
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={currentCount}
                      onChange={(e) => setCurrentCount(Number(e.target.value))}
                      className="form-control w-full py-2 px-3 bg-app/5 border-app rounded-[8px] text-[14px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-app-muted uppercase mb-1.5">
                    Shelter Location
                  </label>
                  <LocationPicker
                    latitude={latitude}
                    longitude={longitude}
                    onChange={(lat, lng) => {
                      setLatitude(lat);
                      setLongitude(lng);
                    }}
                    height="280px"
                  />
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-app-muted uppercase mb-1">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={latitude}
                        onChange={(e) => setLatitude(Number(e.target.value))}
                        className="form-control w-full py-2 px-3 bg-app/5 border-app rounded-[8px] text-[14px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-app-muted uppercase mb-1">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={longitude}
                        onChange={(e) => setLongitude(Number(e.target.value))}
                        className="form-control w-full py-2 px-3 bg-app/5 border-app rounded-[8px] text-[14px]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-app-muted uppercase mb-1.5">
                    Evacuation Routes & Routing Instructions
                  </label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Provide routing advisories, safety instructions, or landmark details..."
                    className="form-control w-full py-2 px-3 bg-app/5 border-app rounded-[8px] text-[14px] h-20 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 rounded bg-app/10 hover:bg-app/20 text-app text-xs transition-all border-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-5 py-2 text-xs"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingId ? 'Save Changes' : 'Create Shelter'}
                  </button>
                </div>
              </form>
            </SectionCard>
          ) : selectedRoute ? (
            <div className="flex flex-col gap-6">
              <SectionCard title={`Shelter Summary: ${selectedRoute.shelterName}`}>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-app/10 rounded-[10px] border border-app">
                      <span className="block text-[11px] text-app-muted uppercase">Occupancy</span>
                      <span className="text-[16px] font-bold text-app">
                        {Math.min(Math.round(((selectedRouteData.currentCount ?? 0) / (selectedRoute.capacity || 1)) * 100), 100)}%
                      </span>
                    </div>
                    <div className="p-3 bg-app/10 rounded-[10px] border border-app">
                      <span className="block text-[11px] text-app-muted uppercase">Capacity</span>
                      <span className="text-[16px] font-bold text-app">
                        {selectedRoute.capacity}
                      </span>
                    </div>
                    <div className="p-3 bg-app/10 rounded-[10px] border border-app">
                      <span className="block text-[11px] text-app-muted uppercase">Occupied Spaces</span>
                      <span className="text-[16px] font-bold text-app">
                        {selectedRouteData.currentCount ?? 0}
                      </span>
                    </div>
                    <div className="p-3 bg-app/10 rounded-[10px] border border-app">
                      <span className="block text-[11px] text-app-muted uppercase">Available Spaces</span>
                      <span className="text-[16px] font-bold text-emerald-400">
                        {Math.max((selectedRoute.capacity || 0) - (selectedRouteData.currentCount ?? 0), 0)}
                      </span>
                    </div>
                  </div>

                  {/* Route instructions banner */}
                  <div className="p-4 bg-orange-500/5 rounded-[12px] border border-orange-500/15 flex items-start gap-3">
                    <span className="text-orange-400 shrink-0 mt-0.5">
                      {ic('M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z')}
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-orange-400">
                        Official Safety & Routing Advisory
                      </p>
                      <p className="text-[12.5px] text-app-muted mt-0.5 leading-relaxed">
                        {selectedRouteData.instructions || 'No special instructions recorded. Route is clear by default.'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] text-app-muted uppercase font-bold tracking-wide mb-2">
                      Evacuation Center Map Location (OSM)
                    </span>
                    <InteractiveDetailMap
                      latitude={selectedLat}
                      longitude={selectedLng}
                      title={selectedRoute.shelterName}
                      color="#0369a1"
                    />
                  </div>
                </div>
              </SectionCard>
            </div>
          ) : (
            <div className="flex items-center justify-center py-24 surface-card border border-app rounded-[12px] text-app-muted">
              Select or register a shelter center to visualize safety and routing details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
