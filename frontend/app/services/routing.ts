/**
 * Routing service — turn-by-turn directions powered by OSRM
 * (the free, public OpenStreetMap routing engine, no API key required).
 *
 * Used by volunteers to navigate from their live GPS location to an SOS
 * request or evacuation center. Falls back gracefully when offline.
 */

export type RouteProfile = 'driving' | 'walking' | 'cycling';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteStep {
  /** Human-readable instruction, e.g. "Turn right onto Ring Road" */
  instruction: string;
  /** Segment distance in metres */
  distance: number;
  /** Segment duration in seconds */
  duration: number;
  /** Maneuver type (turn, depart, arrive, roundabout, ...) */
  type: string;
  /** The street/way name for this step, if known */
  name: string;
}

export interface RouteResult {
  /** Decoded [lat, lng] coordinates for drawing the route polyline */
  coordinates: [number, number][];
  /** Total distance in metres */
  distance: number;
  /** Total estimated duration in seconds */
  duration: number;
  /** Turn-by-turn steps */
  steps: RouteStep[];
  profile: RouteProfile;
}

const OSRM_BASE = 'https://router.project-osrm.org';

/** Build a "turn right onto X" style sentence from an OSRM maneuver. */
function describeManeuver(step: any): string {
  const m = step.maneuver ?? {};
  const road = step.name ? ` onto ${step.name}` : '';
  const modifier = m.modifier ? ` ${m.modifier}` : '';
  switch (m.type) {
    case 'depart':
      return `Head${m.modifier ? ` ${m.modifier}` : ''}${step.name ? ` on ${step.name}` : ''}`;
    case 'arrive':
      return 'Arrive at your destination';
    case 'turn':
      return `Turn${modifier}${road}`;
    case 'new name':
      return `Continue${road}`;
    case 'merge':
      return `Merge${modifier}${road}`;
    case 'on ramp':
      return `Take the ramp${modifier}${road}`;
    case 'off ramp':
      return `Take the exit${modifier}${road}`;
    case 'fork':
      return `Keep${modifier} at the fork${road}`;
    case 'roundabout':
    case 'rotary':
      return `Enter the roundabout${m.exit ? `, take exit ${m.exit}` : ''}${road}`;
    case 'continue':
      return `Continue${modifier}${road}`;
    default:
      return `${(m.type || 'Continue').replace(/_/g, ' ')}${modifier}${road}`;
  }
}

export const routingService = {
  /**
   * Fetch a route between two points using OSRM.
   * @throws if the routing service is unreachable or no route is found.
   */
  async getRoute(
    from: LatLng,
    to: LatLng,
    profile: RouteProfile = 'driving',
  ): Promise<RouteResult> {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `${OSRM_BASE}/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Routing service returned ${res.status}`);
    }

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) {
      throw new Error(data.message || 'No route could be found to this location.');
    }

    const route = data.routes[0];
    const coordinates: [number, number][] = (route.geometry?.coordinates ?? []).map(
      ([lng, lat]: [number, number]) => [lat, lng],
    );

    const steps: RouteStep[] = [];
    for (const leg of route.legs ?? []) {
      for (const step of leg.steps ?? []) {
        steps.push({
          instruction: describeManeuver(step),
          distance: step.distance ?? 0,
          duration: step.duration ?? 0,
          type: step.maneuver?.type ?? 'continue',
          name: step.name ?? '',
        });
      }
    }

    return {
      coordinates,
      distance: route.distance ?? 0,
      duration: route.duration ?? 0,
      steps,
      profile,
    };
  },

  /** External deep-link to Google Maps directions (opens native app on mobile). */
  googleMapsLink(from: LatLng | null, to: LatLng): string {
    const dest = `${to.lat},${to.lng}`;
    if (from) {
      return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${dest}&travelmode=driving`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  },

  /** External link to OpenStreetMap directions. */
  osmLink(from: LatLng | null, to: LatLng): string {
    const dest = `${to.lat}%2C${to.lng}`;
    if (from) {
      return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.lat}%2C${from.lng}%3B${dest}`;
    }
    return `https://www.openstreetmap.org/?mlat=${to.lat}&mlon=${to.lng}#map=16/${to.lat}/${to.lng}`;
  },
};

/** Format metres as a friendly distance string. */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

/** Format seconds as a friendly duration string. */
export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

/**
 * Resolve an evacuation shelter's coordinates as accurately as possible:
 * explicit routeData.coordinates → the shelter's region centroid (+ a small
 * deterministic offset so co-located shelters don't overlap) → Kathmandu.
 */
export function resolveShelterCoords(shelter: any): LatLng {
  const rd =
    typeof shelter?.routeData === 'string'
      ? safeJsonParse(shelter.routeData)
      : shelter?.routeData;
  const explicit = rd?.coordinates;
  if (explicit?.lat && explicit?.lng) {
    return { lat: Number(explicit.lat), lng: Number(explicit.lng) };
  }
  const region = shelter?.regionCoordinates;
  const base =
    region?.lat && region?.lng
      ? { lat: Number(region.lat), lng: Number(region.lng) }
      : { lat: 27.7172, lng: 85.324 };
  const seed = String(shelter?.id || shelter?.shelterName || '')
    .split('')
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    lat: base.lat + ((seed % 13) - 6) * 0.0009,
    lng: base.lng + (((seed >> 2) % 13) - 6) * 0.0009,
  };
}

function safeJsonParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** Straight-line (Haversine) distance in metres — used as a quick fallback. */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
