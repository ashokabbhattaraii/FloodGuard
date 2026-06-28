import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { regionsService } from '@/app/services/regions';
import dynamic from 'next/dynamic';

const RegionMapSelector = dynamic(
  () => import('./RegionMapSelector'),
  { ssr: false, loading: () => <div className="h-[400px] rounded-[12px] bg-[var(--border)] animate-pulse" /> }
);

interface EditRegionModalProps {
  region: any;
  onClose: () => void;
  onBack?: () => void;
}

export default function EditRegionModal({ region, onClose, onBack }: EditRegionModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: region.name || '',
    description: region.description || '',
    centerLat: region.centerLat?.toString() || '',
    centerLng: region.centerLng?.toString() || '',
    population: region.population?.toString() || '',
    area: region.area?.toString() || '',
    riskLevel: (region.riskLevel || 'low') as 'low' | 'medium' | 'high' | 'critical',
  });
  const [bounds, setBounds] = useState<number[][]>(
    region.coordinates?.coordinates?.[0] || []
  );

  const updateMutation = useMutation({
    mutationFn: (data: any) => regionsService.update(region.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      queryClient.invalidateQueries({ queryKey: ['regions', region.id] });
      if (onBack) {
        onBack();
      } else {
        onClose();
      }
    },
  });

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

    await updateMutation.mutateAsync(data);
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
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="text-app-muted hover:text-app transition-colors"
                title="Back to details"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M12 16L6 10L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <h2 className="text-2xl font-bold text-app">Edit Region</h2>
          </div>
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
                  rows={3}
                />
              </div>

              {/* Coordinates */}
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
                    onChange={(e) => setFormData({ ...formData, centerLat: e.target.value })}
                    className="w-full rounded-[8px] border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-app focus:outline-none focus:ring-2 focus:ring-accent/40"
                    placeholder="Latitude"
                  />
                  <input
                    type="number"
                    step="any"
                    value={formData.centerLng}
                    onChange={(e) => setFormData({ ...formData, centerLng: e.target.value })}
                    className="w-full rounded-[8px] border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-app focus:outline-none focus:ring-2 focus:ring-accent/40"
                    placeholder="Longitude"
                  />
                </div>
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

            {/* Right Column: Map */}
            <div>
              <label className="block text-sm font-medium text-app mb-2">
                Map Selection
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
                existingRegions={[]}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onBack || onClose}
              className="flex-1 px-4 py-2 rounded-[8px] border border-[var(--border)] text-app text-sm font-medium hover:bg-[var(--border)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending || !formData.name.trim()}
              className="flex-1 btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
