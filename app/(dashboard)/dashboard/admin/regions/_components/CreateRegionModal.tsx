import { useState } from 'react';
import { useCreateRegion, useRegions } from '@/app/queries/regions';
import dynamic from 'next/dynamic';

// Dynamically import map to avoid SSR issues
const RegionMapSelector = dynamic(
  () => import('./RegionMapSelector'),
  { ssr: false, loading: () => <div className="h-[400px] rounded-[12px] bg-[var(--border)] animate-pulse" /> }
);

interface CreateRegionModalProps {
  onClose: () => void;
}

export default function CreateRegionModal({ onClose }: CreateRegionModalProps) {
  const createRegion = useCreateRegion();
  const { data: regions } = useRegions();
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

    // Add GeoJSON polygon if bounds drawn
    if (bounds.length > 0) {
      data.coordinates = {
        type: 'Polygon',
        coordinates: [bounds],
      };
    }

    await createRegion.mutateAsync(data);
    onClose();
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

  const handleManualLatChange = (value: string) => {
    setFormData({ ...formData, centerLat: value });
  };

  const handleManualLngChange = (value: string) => {
    setFormData({ ...formData, centerLng: value });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="surface-card rounded-[14px] p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-app">Add New Region</h2>
          <button
            onClick={onClose}
            className="text-app-muted hover:text-app text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Form Fields */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-app mb-1">
                  Region Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-[8px] border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-app focus:outline-none focus:ring-2 focus:ring-accent/40"
                  placeholder="e.g., Klang River Valley"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-app mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-[8px] border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-app focus:outline-none focus:ring-2 focus:ring-accent/40"
                  placeholder="Brief description of the region and flood risk factors"
                  rows={3}
                />
              </div>

              {/* Coordinates - Manual Input */}
              <div>
                <label className="block text-sm font-medium text-app mb-2">
                  Center Coordinates
                  <span className="ml-2 text-xs text-app-muted font-normal">
                    (Type manually or click map)
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="any"
                    value={formData.centerLat}
                    onChange={(e) => handleManualLatChange(e.target.value)}
                    className="w-full rounded-[8px] border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-app focus:outline-none focus:ring-2 focus:ring-accent/40"
                    placeholder="Latitude (e.g., 3.1390)"
                  />
                  <input
                    type="number"
                    step="any"
                    value={formData.centerLng}
                    onChange={(e) => handleManualLngChange(e.target.value)}
                    className="w-full rounded-[8px] border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-app focus:outline-none focus:ring-2 focus:ring-accent/40"
                    placeholder="Longitude (e.g., 101.6869)"
                  />
                </div>
                {bounds.length > 0 && (
                  <div className="mt-2 text-xs text-app-muted bg-[var(--accent)]/5 p-2 rounded">
                    🗺️ Boundary drawn: {bounds.length} points
                  </div>
                )}
              </div>

              {/* Population & Area */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-app mb-1">
                    Population
                  </label>
                  <input
                    type="number"
                    value={formData.population}
                    onChange={(e) => setFormData({ ...formData, population: e.target.value })}
                    className="w-full rounded-[8px] border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-app focus:outline-none focus:ring-2 focus:ring-accent/40"
                    placeholder="e.g., 150000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app mb-1">
                    Area (km²)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full rounded-[8px] border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-app focus:outline-none focus:ring-2 focus:ring-accent/40"
                    placeholder="e.g., 25.5"
                  />
                </div>
              </div>

              {/* Risk Level */}
              <div>
                <label className="block text-sm font-medium text-app mb-2">
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

            {/* Right Column: Interactive Map */}
            <div>
              <label className="block text-sm font-medium text-app mb-2">
                Map Selection
                <span className="ml-2 text-xs text-app-muted font-normal">
                  (Click to place marker, draw boundaries)
                </span>
              </label>
              <RegionMapSelector
                initialCenter={
                  formData.centerLat && formData.centerLng
                    ? {
                        lat: parseFloat(formData.centerLat),
                        lng: parseFloat(formData.centerLng),
                      }
                    : undefined
                }
                initialBounds={bounds.length > 0 ? bounds : undefined}
                onCenterChange={handleCenterChange}
                onBoundsChange={handleBoundsChange}
                existingRegions={Array.isArray(regions) ? regions : []}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-[8px] border border-[var(--border)] text-app text-sm font-medium hover:bg-[var(--border)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createRegion.isPending || !formData.name.trim()}
              className="flex-1 btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {createRegion.isPending ? 'Creating...' : 'Create Region'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
