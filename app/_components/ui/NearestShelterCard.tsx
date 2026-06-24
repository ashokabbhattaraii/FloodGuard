'use client';

import Link from 'next/link';
import { useNearestShelter } from '@/app/hooks/use-nearest-shelter';
import { formatDistance, routingService } from '@/app/services/routing';

const ic = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function NearestShelterCard() {
  const { status, nearest, userPos, locate, isLoadingShelters } = useNearestShelter(true);

  return (
    <div className="surface-card rounded-[12px] p-5 border border-app">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-emerald-500">{ic('M3 10l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z')}</span>
          <h2 className="text-[14px] font-semibold text-app">Nearest Evacuation Shelter</h2>
        </div>
        <button
          onClick={locate}
          className="text-[12px] text-accent hover:underline flex items-center gap-1"
          title="Refresh from your current location"
        >
          {ic('M21 12a9 9 0 11-3-6.7M21 4v4h-4')}
          Refresh
        </button>
      </div>

      {/* Loading / permission states */}
      {(status === 'locating' || isLoadingShelters) && (
        <div className="flex items-center gap-3 py-6 justify-center text-app-muted text-[13px]">
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          Finding the shelter closest to you…
        </div>
      )}

      {status === 'denied' && (
        <div className="py-5 text-center">
          <p className="text-[13px] text-app-muted mb-3">
            Location access is needed to find your nearest shelter.
          </p>
          <button onClick={locate} className="btn-primary px-4 py-2 text-[13px]">
            Enable location
          </button>
        </div>
      )}

      {status === 'unsupported' && (
        <p className="py-5 text-center text-[13px] text-app-muted">
          Geolocation isn’t supported on this device.{' '}
          <Link href="/dashboard/resident/evacuation" className="text-accent hover:underline">
            Browse all shelters →
          </Link>
        </p>
      )}

      {status === 'no-shelters' && (
        <p className="py-5 text-center text-[13px] text-app-muted">
          No evacuation shelters have been registered yet.
        </p>
      )}

      {/* Result */}
      {status === 'ready' && nearest && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[16px] font-bold text-app">{nearest.name}</h3>
              {nearest.regionName && (
                <p className="text-[12px] text-app-muted mt-0.5">{nearest.regionName}</p>
              )}
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 bg-emerald-500/10 text-emerald-500">
              {formatDistance(nearest.distance)} away
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-2.5 bg-app/10 rounded-[10px] border border-app text-center">
              <span className="block text-[11px] text-app-muted uppercase">Available</span>
              <span className="text-[16px] font-bold text-emerald-500">{nearest.available}</span>
            </div>
            <div className="p-2.5 bg-app/10 rounded-[10px] border border-app text-center">
              <span className="block text-[11px] text-app-muted uppercase">Capacity</span>
              <span className="text-[16px] font-bold text-app">{nearest.capacity}</span>
            </div>
            <div className="p-2.5 bg-app/10 rounded-[10px] border border-app text-center">
              <span className="block text-[11px] text-app-muted uppercase">Occupancy</span>
              <span className="text-[16px] font-bold text-app">{nearest.occupancyPct}%</span>
            </div>
          </div>

          {/* Occupancy bar */}
          <div className="w-full h-1.5 rounded-full bg-app/20 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                nearest.occupancyPct >= 90 ? 'bg-red-500' : nearest.occupancyPct >= 60 ? 'bg-orange-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${nearest.occupancyPct}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <a
              href={routingService.googleMapsLink(userPos, nearest.coords)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-[13px]"
            >
              {ic('M12 21s-7-6-7-11a7 7 0 1114 0c0 5-7 11-7 11z')}
              Get Directions
            </a>
            <Link
              href="/dashboard/resident/map"
              className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] border border-app text-app text-[13px] font-semibold hover:bg-[var(--accent-soft)] transition-all"
            >
              View on Map
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
