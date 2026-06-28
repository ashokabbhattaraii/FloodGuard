/**
 * Shared Leaflet map configuration so every map across the app behaves the
 * same way: confined to Nepal, no world view, and smooth/controllable zoom.
 */

/** Geographic centre of Nepal. */
export const NEPAL_CENTER: [number, number] = [28.3949, 84.124];

/** Default view used by city-level maps. */
export const KATHMANDU_CENTER: [number, number] = [27.7172, 85.324];

/**
 * Bounding box around Nepal (a little padding on each side). Panning is
 * clamped to this box so the world map is never reachable.
 * [[southWestLat, southWestLng], [northEastLat, northEastLng]]
 */
export const NEPAL_BOUNDS: [[number, number], [number, number]] = [
  [26.0, 79.8],
  [30.7, 88.4],
];

/** Can't zoom out past the whole-of-Nepal view. */
export const MAP_MIN_ZOOM = 7;
export const MAP_MAX_ZOOM = 19;

/**
 * Base options applied to every `L.map(...)` call.
 * - maxBounds + maxBoundsViscosity: solid, smooth edge — you can't drag out of Nepal.
 * - zoomSnap/zoomDelta: finer, smoother zoom steps.
 * - wheelPxPerZoomLevel: higher = gentler, more controllable scroll-wheel zoom.
 */
export const NEPAL_MAP_OPTIONS = {
  minZoom: MAP_MIN_ZOOM,
  maxZoom: MAP_MAX_ZOOM,
  maxBounds: NEPAL_BOUNDS,
  maxBoundsViscosity: 1.0,
  zoomSnap: 0.5,
  zoomDelta: 0.5,
  wheelPxPerZoomLevel: 140,
  wheelDebounceTime: 60,
  inertia: true,
  worldCopyJump: false,
  bounceAtZoomLimits: false,
} as const;
