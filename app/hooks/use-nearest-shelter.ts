'use client';

import { useCallback, useEffect, useState } from 'react';
import { useEvacuationRoutes } from '@/app/queries/evacuation';
import { haversineDistance, resolveShelterCoords, type LatLng } from '@/app/services/routing';

export interface NearestShelter {
  id: string;
  name: string;
  regionName?: string;
  capacity: number;
  currentCount: number;
  available: number;
  occupancyPct: number;
  distance: number; // metres, straight-line
  coords: LatLng;
}

type Status = 'idle' | 'locating' | 'ready' | 'denied' | 'unsupported' | 'no-shelters';

/**
 * Finds the resident's nearest evacuation shelter using their device GPS and
 * the live evacuation-routes data. Geolocation is requested only when locate()
 * is called (or on mount if autoLocate is true).
 */
export function useNearestShelter(autoLocate = false) {
  const routesQuery = useEvacuationRoutes();
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  const locate = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('ready');
      },
      () => setStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    if (autoLocate) locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocate]);

  const shelters = Array.isArray(routesQuery.data) ? routesQuery.data : [];

  let nearest: NearestShelter | null = null;
  if (userPos && shelters.length) {
    let bestDist = Infinity;
    for (const s of shelters as any[]) {
      const coords = resolveShelterCoords(s);
      const distance = haversineDistance(userPos, coords);
      if (distance < bestDist) {
        bestDist = distance;
        const rd = typeof s.routeData === 'string' ? safeParse(s.routeData) : s.routeData;
        const capacity = s.capacity || 0;
        const currentCount = rd?.currentCount ?? 0;
        nearest = {
          id: s.id,
          name: s.shelterName,
          regionName: s.regionName,
          capacity,
          currentCount,
          available: Math.max(capacity - currentCount, 0),
          occupancyPct: capacity ? Math.min(Math.round((currentCount / capacity) * 100), 100) : 0,
          distance,
          coords,
        };
      }
    }
  }

  return {
    status: shelters.length === 0 && routesQuery.isFetched ? ('no-shelters' as Status) : status,
    nearest,
    userPos,
    locate,
    isLoadingShelters: routesQuery.isLoading,
  };
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
