import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { regionsService } from '@/app/services/regions';
import dynamic from 'next/dynamic';

const EditRegionModal = dynamic(() => import('./EditRegionModal'), { ssr: false });

interface RegionDetailsModalProps {
  regionId: string;
  onClose: () => void;
}

export default function RegionDetailsModal({
  regionId,
  onClose,
}: RegionDetailsModalProps) {
  const [editMode, setEditMode] = useState(false);

  const { data: region, isLoading, error } = useQuery({
    queryKey: ['regions', regionId],
    queryFn: () => regionsService.getOne(regionId),
  });

  const { data: status } = useQuery({
    queryKey: ['regions', regionId, 'status'],
    queryFn: () => regionsService.getStatus(regionId),
    refetchInterval: 30000,
    enabled: !!region,
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (region) {
      console.log('Region data loaded:', region);
    }
    if (error) {
      console.error('Region fetch error:', error);
    }
  }, [region, error]);

  if (error) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="surface-card rounded-[14px] p-6 max-w-4xl w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <p className="text-red-500 font-semibold mb-2">Error loading region</p>
            <p className="text-sm text-app-muted">{(error as any)?.message || 'Unknown error'}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-[8px] bg-accent text-white text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="surface-card rounded-[14px] p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-4">
            <div className="h-8 bg-[var(--border)] rounded-[8px] w-1/3 animate-pulse"></div>
            <div className="h-4 bg-[var(--border)] rounded-[8px] w-2/3 animate-pulse"></div>
            <div className="grid grid-cols-4 gap-3 mt-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-[var(--border)] rounded-[8px] animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sensors = (status as any)?.sensorStatus || [];
  const volunteers = (region as any)?.volunteers || [];
  const shelters = (region as any)?.evacuationRoutes || [];

  if (editMode) {
    return (
      <EditRegionModal
        region={region}
        onClose={onClose}
        onBack={() => setEditMode(false)}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="surface-card rounded-[14px] p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-app">{(region as any).name}</h2>
            {(region as any).description && (
              <p className="text-sm text-app-muted mt-1">{(region as any).description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditMode(true)}
              className="px-3 py-1.5 rounded-[8px] bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className="text-app-muted hover:text-app text-2xl leading-none ml-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="surface-bg rounded-[8px] p-3">
            <div className="text-[10px] text-app-muted uppercase">Risk Level</div>
            <div className="text-lg font-bold text-app capitalize mt-1">
              {(region as any).riskLevel}
            </div>
          </div>
          <div className="surface-bg rounded-[8px] p-3">
            <div className="text-[10px] text-app-muted uppercase">Population</div>
            <div className="text-lg font-bold text-app mt-1">
              {(region as any).population?.toLocaleString() || '—'}
            </div>
          </div>
          <div className="surface-bg rounded-[8px] p-3">
            <div className="text-[10px] text-app-muted uppercase">Area</div>
            <div className="text-lg font-bold text-app mt-1">
              {(region as any).area ? `${(region as any).area} km²` : '—'}
            </div>
          </div>
          <div className="surface-bg rounded-[8px] p-3">
            <div className="text-[10px] text-app-muted uppercase">Calculated Risk</div>
            <div className="text-lg font-bold text-app capitalize mt-1">
              {(status as any)?.calculatedRisk || '—'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs region={region} sensors={sensors} volunteers={volunteers} shelters={shelters} />
      </div>
    </div>
  );
}

function Tabs({
  region,
  sensors,
  volunteers,
  shelters,
}: {
  region: any;
  sensors: any[];
  volunteers: any[];
  shelters: any[];
}) {
  const [activeTab, setActiveTab] = useState<'sensors' | 'volunteers' | 'shelters' | 'info'>(
    'sensors'
  );

  const tabs = [
    { key: 'sensors' as const, label: 'Sensors', count: sensors.length },
    { key: 'volunteers' as const, label: 'Volunteers', count: volunteers.length },
    { key: 'shelters' as const, label: 'Evacuation Centers', count: shelters.length },
    { key: 'info' as const, label: 'Details' },
  ];

  return (
    <>
      {/* Tab Headers */}
      <div className="flex border-b border-[var(--border)] mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-accent'
                : 'text-app-muted hover:text-app'
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
              sensors.map((sensor) => (
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
                      <h4 className="font-semibold text-app text-sm">Volunteer #{v.userId.slice(0, 8)}</h4>
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
              <p className="text-sm text-app mt-1 font-mono">{(region as any).id}</p>
            </div>
            {(region as any).centerLat && (region as any).centerLng && (
              <div>
                <h4 className="text-xs font-medium text-app-muted uppercase">Center Coordinates</h4>
                <p className="text-sm text-app mt-1 font-mono">
                  {(region as any).centerLat.toFixed(6)}°, {(region as any).centerLng.toFixed(6)}°
                </p>
              </div>
            )}
            {(region as any).coordinates && (
              <div>
                <h4 className="text-xs font-medium text-app-muted uppercase">Boundary Data</h4>
                <pre className="text-xs text-app mt-1 bg-[var(--bg)] p-3 rounded overflow-auto max-h-32">
                  {JSON.stringify((region as any).coordinates, null, 2)}
                </pre>
              </div>
            )}
            <div>
              <h4 className="text-xs font-medium text-app-muted uppercase">Created</h4>
              <p className="text-sm text-app mt-1">
                {new Date((region as any).createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-app-muted uppercase">Last Updated</h4>
              <p className="text-sm text-app mt-1">
                {new Date((region as any).updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
