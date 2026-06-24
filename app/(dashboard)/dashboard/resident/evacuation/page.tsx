'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useEvacuationRoutes } from '@/app/queries/evacuation';
import { resolveShelterCoords } from '@/app/services/routing';
import { LoadingRows, EmptyState } from '@/app/(dashboard)/_components/DashboardUI';

const InteractiveDetailMap = dynamic(() => import('@/app/_components/ui/InteractiveDetailMap'), { ssr: false });

const contacts = [
  { service: 'Nepal Police', number: '100', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
  { service: 'Fire Brigade', number: '101', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 2c1 3 4 5 4 9a4 4 0 11-8 0c0-4 3-6 4-9z"/></svg> },
  { service: 'Ambulance', number: '102', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 15h18v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm2-5V7a1 1 0 011-1h4l2-2h2l2 2h4a1 1 0 011 1v3M9 20a2 2 0 100-4 2 2 0 000 4zm8 0a2 2 0 100-4 2 2 0 000 4z"/></svg> },
];

export default function EvacuationPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const routesQuery = useEvacuationRoutes();

  if (!mounted) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-app">Evacuation &amp; Shelters</h1>
        <LoadingRows count={3} />
      </div>
    );
  }

  const routes = routesQuery.data || [];
  const selectedRoute = routes.find((r: any) => r.id === selectedRouteId) || routes[0] || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-app">Evacuation &amp; Shelters</h1>
          <p className="text-app-muted text-sm mt-1">Locate active community shelters, track capacities, and read route instructions.</p>
        </div>
      </div>

      {routesQuery.isLoading ? (
        <LoadingRows count={3} />
      ) : routes.length === 0 ? (
        <EmptyState message="No evacuation shelters registered at this time." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.map((s: any) => {
            const sData: any = s.routeData || {};
            const cur = sData.currentCount ?? 0;
            const cap = s.capacity || 1;
            const occupancyPct = Math.min(Math.round((cur / cap) * 100), 100);
            const isFull = occupancyPct >= 100;
            const isSelected = selectedRoute?.id === s.id;

            return (
              <div 
                key={s.id} 
                onClick={() => setSelectedRouteId(s.id)}
                className={`surface-card rounded-[12px] p-5 cursor-pointer border transition-all duration-200 hover:-translate-y-0.5 ${
                  isSelected ? 'border-accent bg-[var(--accent-soft)] shadow-sm' : 'border-app hover:border-[var(--accent-soft-2)]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-app text-sm font-semibold truncate max-w-[180px]">{s.shelterName}</h3>
                  <span className="px-2.5 py-0.5 rounded-[6px] text-[10px] font-bold uppercase" style={{ background: !isFull ? '#16a34a26' : '#dc262626', color: !isFull ? '#16a34a' : '#dc2626' }}>
                    {!isFull ? 'Open' : 'Full'}
                  </span>
                </div>
                
                <p className="text-app-muted text-xs mb-3">Region: <span className="text-app font-medium">{s.regionName}</span></p>
                
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-app-muted">{cur} / {cap} Occupied</span>
                    <span className="text-app font-semibold">{occupancyPct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-app/20 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${occupancyPct}%`, 
                        background: occupancyPct >= 90 ? '#dc2626' : occupancyPct >= 60 ? '#f97316' : '#16a34a' 
                      }} 
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedRoute && (
        <div className="surface-card rounded-[12px] p-5">
          <div className="flex items-start gap-3">
            <svg width="20" height="20" fill="none" stroke="#f97316" strokeWidth="1.5" viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5">
              <path d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/>
            </svg>
            <div>
              <h3 className="text-app text-sm font-semibold mb-1">
                Evacuation Route & Instructions: {selectedRoute.shelterName}
              </h3>
              <p className="text-app-muted text-sm leading-relaxed">
                {selectedRoute.routeData?.instructions || 'Follow signs towards higher ground. Avoid low-lying river bank paths and bridges. Secure property and carry essential medications.'}
              </p>
              <div className="mt-4 max-w-lg">
                {(() => {
                  const c = resolveShelterCoords(selectedRoute);
                  return (
                    <InteractiveDetailMap
                      latitude={c.lat}
                      longitude={c.lng}
                      title={selectedRoute.shelterName}
                      color="#0369a1"
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="surface-card rounded-[12px] p-5">
        <h2 className="text-app font-semibold mb-4">Emergency Contacts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {contacts.map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-[10px] bg-[var(--accent-soft)]">
              <div className="text-app-muted">{c.icon}</div>
              <div>
                <p className="text-app text-sm font-medium">{c.service}</p>
                <p className="text-app-muted text-xs">{c.number}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

