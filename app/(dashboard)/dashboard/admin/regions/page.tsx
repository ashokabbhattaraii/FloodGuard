'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { regionsService } from '@/app/services/regions';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import {
  PageHeader,
  SectionCard,
  LoadingRows,
  EmptyState,
} from '@/app/(dashboard)/_components/DashboardUI';

const RegionMapSelector = dynamic(
  () => import('./_components/RegionMapSelector'),
  { ssr: false, loading: () => <div className="h-[400px] rounded-[12px] bg-[var(--border)] animate-pulse" /> }
);

const InteractiveDetailMap = dynamic(
  () => import("@/app/_components/ui/InteractiveDetailMap"),
  { ssr: false }
);

const DEFAULT_LAT = 27.7172;
const DEFAULT_LNG = 85.3240;

export default function RegionManagement() {
  const [mounted, setMounted] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    centerLat: '',
    centerLng: '',
    population: '',
    area: '',
    riskLevel: 'low' as 'low' | 'medium' | 'high' | 'critical',
  });
  const [bounds, setBounds] = useState<number[][]>([]);

  const queryClient = useQueryClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: regions, isLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: regionsService.getAll,
    refetchInterval: 120000,
  });

  const { data: selectedRegion } = useQuery({
    queryKey: ['regions', selectedRegionId],
    queryFn: () => regionsService.getOne(selectedRegionId!),
    enabled: !!selectedRegionId && !isFormOpen,
  });

  const { data: selectedStatus } = useQuery({
    queryKey: ['regions', selectedRegionId, 'status'],
    queryFn: () => regionsService.getStatus(selectedRegionId!),
    refetchInterval: 30000,
    enabled: !!selectedRegionId && !isFormOpen,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => regionsService.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast.success('Region created successfully', {
        description: `${data.name} has been added to the monitoring system.`,
      });
      setIsFormOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Failed to create region', {
        description: error?.message || 'An unexpected error occurred.',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => regionsService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      queryClient.invalidateQueries({ queryKey: ['regions', editingId] });
      toast.success('Region updated successfully', {
        description: `${data.name} has been updated.`,
      });
      setIsFormOpen(false);
      setEditingId(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Failed to update region', {
        description: error?.message || 'An unexpected error occurred.',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      centerLat: '',
      centerLng: '',
      population: '',
      area: '',
      riskLevel: 'low',
    });
    setBounds([]);
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingId(null);
    setIsFormOpen(true);
  };

  const handleEdit = (region: any) => {
    setEditingId(region.id);
    setFormData({
      name: region.name || '',
      description: region.description || '',
      centerLat: region.centerLat?.toString() || '',
      centerLng: region.centerLng?.toString() || '',
      population: region.population?.toString() || '',
      area: region.area?.toString() || '',
      riskLevel: region.riskLevel || 'low',
    });
    setBounds(region.coordinates?.coordinates?.[0] || []);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      riskLevel: formData.riskLevel,
    };

    if (formData.centerLat) data.centerLat = parseFloat(formData.centerLat);
    if (formData.centerLng) data.centerLng = parseFloat(formData.centerLng);
    if (formData.population) data.population = parseInt(formData.population);
    if (formData.area) data.area = parseFloat(formData.area);

    if (bounds.length > 0) {
      data.coordinates = {
        type: 'Polygon',
        coordinates: [bounds],
      };
    }

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleCenterChange = (lat: number, lng: number) => {
    setFormData({
      ...formData,
      centerLat: lat.toFixed(6),
      centerLng: lng.toFixed(6),
    });
  };

  const handleBoundsChange = (newBounds: number[][]) => {
    setBounds(newBounds);
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <PageHeader title="Region Management" />
        <LoadingRows count={3} />
      </div>
    );
  }

  const regionsList = (regions as any) || [];
  const currentRegion = selectedRegion || regionsList.find((r: any) => r.id === selectedRegionId) || regionsList[0];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'text-red-500 bg-red-500/10';
      case 'high': return 'text-orange-500 bg-orange-500/10';
      case 'medium': return 'text-sky-600 bg-sky-500/10';
      case 'low': return 'text-green-500 bg-green-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Region Management"
        subtitle="Monitor flood-prone regions, sensors, and volunteer assignments"
        action={
          <button onClick={handleOpenCreate} className="btn-primary px-5 py-2.5 text-[14px]">
            + Add Region
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List - Region Registry (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <SectionCard title="Region Registry">
            {isLoading ? (
              <LoadingRows count={4} />
            ) : regionsList.length === 0 ? (
              <EmptyState message="No regions configured yet. Click 'Add Region' to create your first flood monitoring zone." />
            ) : (
              <div className="flex flex-col gap-3">
                {regionsList.map((region: any) => {
                  const isSelected = currentRegion?.id === region.id;

                  return (
                    <div
                      key={region.id}
                      onClick={() => {
                        setSelectedRegionId(region.id);
                        setIsFormOpen(false);
                      }}
                      className={`p-4 rounded-[12px] border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[var(--accent-soft)] border-accent shadow-sm'
                          : 'surface-card border-app hover:border-[var(--accent-soft-2)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[14.5px] font-semibold text-app truncate max-w-[200px]">
                          {region.name}
                        </h3>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${getRiskColor(region.riskLevel)}`}>
                          {region.riskLevel}
                        </span>
                      </div>

                      {region.description && (
                        <p className="text-[12px] text-app-muted mb-2 line-clamp-2">
                          {region.description}
                        </p>
                      )}

                      <div className="grid grid-cols-3 gap-2 text-[11px] text-app-muted mb-3">
                        <div>
                          <span className="block text-app font-semibold">{region.sensorCount || 0}</span>
                          Sensors
                        </div>
                        <div>
                          <span className="block text-app font-semibold">{region.volunteerCount || 0}</span>
                          Volunteers
                        </div>
                        <div>
                          <span className="block text-app font-semibold">{region.shelterCount || 0}</span>
                          Shelters
                        </div>
                      </div>

                      {region.population && (
                        <div className="text-[11px] text-app-muted mb-3">
                          Population: <span className="text-app font-medium">{region.population.toLocaleString()}</span>
                          {region.area && <span className="ml-2">• {region.area} km²</span>}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-1 border-t border-app/5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(region);
                          }}
                          className="px-2.5 py-1 rounded bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-white transition-all text-xs text-app"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Detail Pane (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {isFormOpen ? (
            <SectionCard title={editingId ? 'Edit Region' : 'Create New Region'}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Form Fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-app-muted uppercase mb-1.5">
                        Region Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="form-control w-full py-2 px-3 bg-app/5 border-app rounded-[8px] text-[14px]"
                        placeholder="e.g. Kathmandu Valley - Bagmati River"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-app-muted uppercase mb-1.5">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="form-control w-full py-2 px-3 bg-app/5 border-app rounded-[8px] text-[14px] h-20 resize-none"
                        placeholder="Describe the region and flood risk..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-app-muted uppercase mb-1.5">
                        Center Coordinates
                        <span className="ml-2 text-[10px] font-normal normal-case text-app-muted">
                          (Type manually or click map)
                        </span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          step="any"
                          value={formData.centerLat}
                          onChange={(e) => setFormData({ ...formData, centerLat: e.target.value })}
                          className="form-control w-full py-2 px-3 bg-app/5 border-app rounded-[8px] text-[14px]"
                          placeholder="Latitude"
                        />
                        <input
                          type="number"
                          step="any"
                          value={formData.centerLng}
                          onChange={(e) => setFormData({ ...formData, centerLng: e.target.value })}
                          className="form-control w-full py-2 px-3 bg-app/5 border-app rounded-[8px] text-[14px]"
                          placeholder="Longitude"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-app-muted uppercase mb-1.5">
                          Population
                        </label>
                        <input
                          type="number"
                          value={formData.population}
                          onChange={(e) => setFormData({ ...formData, population: e.target.value })}
                          className="form-control w-full py-2 px-3 bg-app/5 border-app rounded-[8px] text-[14px]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-app-muted uppercase mb-1.5">
                          Area (km²)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.area}
                          onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                          className="form-control w-full py-2 px-3 bg-app/5 border-app rounded-[8px] text-[14px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-app-muted uppercase mb-1.5">
                        Risk Level <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setFormData({ ...formData, riskLevel: level })}
                            className={`px-3 py-2 rounded-[8px] text-sm font-medium capitalize transition-all ${
                              formData.riskLevel === level
                                ? 'bg-accent text-white'
                                : 'bg-[var(--border)] text-app-muted hover:text-app'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Map */}
                  <div>
                    <label className="block text-xs font-semibold text-app-muted uppercase mb-1.5">
                      Map Selection
                    </label>
                    <RegionMapSelector
                      initialCenter={
                        formData.centerLat && formData.centerLng
                          ? {
                              lat: parseFloat(formData.centerLat),
                              lng: parseFloat(formData.centerLng),
                            }
                          : { lat: DEFAULT_LAT, lng: DEFAULT_LNG }
                      }
                      initialBounds={bounds.length > 0 ? bounds : undefined}
                      onCenterChange={handleCenterChange}
                      onBoundsChange={handleBoundsChange}
                      existingRegions={[]}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-app">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingId(null);
                      resetForm();
                    }}
                    className="px-4 py-2 rounded bg-app/10 hover:bg-app/20 text-app text-xs transition-all border-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-5 py-2 text-xs"
                    disabled={createMutation.isPending || updateMutation.isPending || !formData.name.trim()}
                  >
                    {editingId ? 'Save Changes' : 'Create Region'}
                  </button>
                </div>
              </form>
            </SectionCard>
          ) : currentRegion ? (
            <RegionDetailView
              region={currentRegion}
              status={selectedStatus}
              onEdit={() => handleEdit(currentRegion)}
            />
          ) : (
            <div className="flex items-center justify-center py-24 surface-card border border-app rounded-[12px] text-app-muted">
              Select or create a region to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RegionDetailView({ region, status, onEdit }: { region: any; status: any; onEdit: () => void }) {
  const [activeTab, setActiveTab] = useState<'sensors' | 'volunteers' | 'shelters' | 'info'>('sensors');

  const sensors = status?.sensorStatus || [];
  const volunteers = region?.volunteers || [];
  const shelters = region?.evacuationRoutes || [];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-sky-600';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title={`Region: ${region.name}`}>
        <div className="space-y-5">
          {/* Header with Edit Button */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {region.description && (
                <p className="text-sm text-app-muted">{region.description}</p>
              )}
            </div>
            <button
              onClick={onEdit}
              className="px-4 py-1.5 rounded-[8px] bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Edit Region
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-app/10 rounded-[10px] border border-app">
              <span className="block text-[11px] text-app-muted uppercase">Risk Level</span>
              <span className={`text-[16px] font-bold capitalize ${getRiskColor(region.riskLevel)}`}>
                {region.riskLevel}
              </span>
            </div>
            <div className="p-3 bg-app/10 rounded-[10px] border border-app">
              <span className="block text-[11px] text-app-muted uppercase">Population</span>
              <span className="text-[16px] font-bold text-app">
                {region.population?.toLocaleString() || '—'}
              </span>
            </div>
            <div className="p-3 bg-app/10 rounded-[10px] border border-app">
              <span className="block text-[11px] text-app-muted uppercase">Area</span>
              <span className="text-[16px] font-bold text-app">
                {region.area ? `${region.area} km²` : '—'}
              </span>
            </div>
            <div className="p-3 bg-app/10 rounded-[10px] border border-app">
              <span className="block text-[11px] text-app-muted uppercase">Calculated Risk</span>
              <span className={`text-[16px] font-bold capitalize ${getRiskColor(status?.calculatedRisk || 'low')}`}>
                {status?.calculatedRisk || '—'}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--border)]">
            {[
              { key: 'sensors' as const, label: 'Sensors', count: sensors.length },
              { key: 'volunteers' as const, label: 'Volunteers', count: volunteers.length },
              { key: 'shelters' as const, label: 'Evacuation Centers', count: shelters.length },
              { key: 'info' as const, label: 'Details' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                  activeTab === tab.key ? 'text-accent' : 'text-app-muted hover:text-app'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
                )}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"></div>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-3">
            {activeTab === 'sensors' && (
              <>
                {sensors.length === 0 ? (
                  <p className="text-sm text-app-muted text-center py-8">
                    No sensors deployed in this region yet.
                  </p>
                ) : (
                  sensors.map((sensor: any) => (
                    <div
                      key={sensor.id}
                      className="surface-bg rounded-[8px] p-4 flex items-start justify-between"
                    >
                      <div>
                        <h4 className="font-semibold text-app text-sm">{sensor.name}</h4>
                        <p className="text-xs text-app-muted mt-1 capitalize">
                          {sensor.type.replace('_', ' ')}
                          {sensor.latitude && sensor.longitude && (
                            <span className="ml-2 font-mono">
                              📍 {sensor.latitude.toFixed(4)}°, {sensor.longitude.toFixed(4)}°
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-app">
                          {sensor.currentValue} {sensor.unit}
                        </div>
                        <div className="text-xs text-app-muted">
                          Threshold: {sensor.threshold} {sensor.unit}
                        </div>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                            sensor.status === 'critical'
                              ? 'bg-red-500/20 text-red-500'
                              : sensor.status === 'warning'
                                ? 'bg-orange-500/20 text-orange-500'
                                : 'bg-green-500/20 text-green-500'
                          }`}
                        >
                          {sensor.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === 'volunteers' && (
              <>
                {volunteers.length === 0 ? (
                  <p className="text-sm text-app-muted text-center py-8">
                    No volunteers assigned to this region.
                  </p>
                ) : (
                  volunteers.map((v: any) => (
                    <div key={v.id} className="surface-bg rounded-[8px] p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-app text-sm">
                            Volunteer #{v.userId.slice(0, 8)}
                          </h4>
                          <p className="text-xs text-app-muted mt-1">
                            Assigned {new Date(v.assignedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-500">
                          Active
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === 'shelters' && (
              <>
                {shelters.length === 0 ? (
                  <p className="text-sm text-app-muted text-center py-8">
                    No evacuation centers registered for this region.
                  </p>
                ) : (
                  shelters.map((shelter: any) => (
                    <div key={shelter.id} className="surface-bg rounded-[8px] p-4">
                      <h4 className="font-semibold text-app">{shelter.shelterName}</h4>
                      {shelter.address && (
                        <p className="text-xs text-app-muted mt-1">{shelter.address}</p>
                      )}
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <div className="text-xs text-app-muted">Capacity</div>
                          <div className="text-sm font-semibold text-app">
                            {shelter.currentCount || 0} / {shelter.capacity}
                          </div>
                        </div>
                        {shelter.contactPhone && (
                          <div>
                            <div className="text-xs text-app-muted">Contact</div>
                            <div className="text-sm font-semibold text-app">
                              {shelter.contactPhone}
                            </div>
                          </div>
                        )}
                      </div>
                      {shelter.latitude && shelter.longitude && (
                        <p className="text-xs text-app-muted mt-2 font-mono">
                          📍 {shelter.latitude.toFixed(4)}°, {shelter.longitude.toFixed(4)}°
                        </p>
                      )}
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === 'info' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-medium text-app-muted uppercase">Region ID</h4>
                  <p className="text-sm text-app mt-1 font-mono">{region.id}</p>
                </div>
                {region.centerLat && region.centerLng && (
                  <>
                    <div>
                      <h4 className="text-xs font-medium text-app-muted uppercase">
                        Center Coordinates
                      </h4>
                      <p className="text-sm text-app mt-1 font-mono">
                        {region.centerLat.toFixed(6)}°, {region.centerLng.toFixed(6)}°
                      </p>
                    </div>
                    <div>
                      <span className="block text-[11px] text-app-muted uppercase font-bold tracking-wide mb-2">
                        Region Map Location (OSM)
                      </span>
                      <InteractiveDetailMap
                        latitude={region.centerLat}
                        longitude={region.centerLng}
                        title={region.name}
                        color="#7c7cff"
                      />
                    </div>
                  </>
                )}
                {region.coordinates && (
                  <div>
                    <h4 className="text-xs font-medium text-app-muted uppercase">Boundary Data</h4>
                    <pre className="text-xs text-app mt-1 bg-[var(--bg)] p-3 rounded overflow-auto max-h-32">
                      {JSON.stringify(region.coordinates, null, 2)}
                    </pre>
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-medium text-app-muted uppercase">Created</h4>
                  <p className="text-sm text-app mt-1">
                    {new Date(region.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-app-muted uppercase">Last Updated</h4>
                  <p className="text-sm text-app mt-1">
                    {new Date(region.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
