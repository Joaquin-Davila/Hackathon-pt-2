// frontend/src/lunarHelpers.js

function toRad(deg) {
  return (deg * Math.PI) / 180.0;
}

/**
 * Projects selenographic (lat, lon) onto normalized [0..1] globe container coordinates (x, y)
 * and callout label coordinates (lx, ly).
 * Uses a hybrid polar-stereographic / orthographic mapping so both South Polar micro-displacements
 * (-89.9° to -84°) and global custom coordinates (-90° to +90°, -180° to +180°) position the
 * cyan marker accurately on the visible lunar disk.
 */
export function projectLunarCoordinateToGlobe(lat, lon) {
  const safeLat = Number.isFinite(Number(lat)) ? Math.max(-90, Math.min(90, Number(lat))) : -89.54;
  const safeLon = Number.isFinite(Number(lon)) ? Math.max(-180, Math.min(180, Number(lon))) : 0.0;

  const lonRad = toRad(safeLon);

  let dx = 0;
  let dy = 0;

  if (safeLat <= -80) {
    // South Polar stereographic expansion so polar sites (-90° to -80°) spread clearly across the polar cap
    // Colatitude from South Pole: 0° (at -90°) to 10° (at -80°)
    const colat = 90 + safeLat; // 0..10
    // Nonlinear radial expansion so even 0.5° from pole is clearly offset
    const polarRadius = 0.04 + Math.pow(colat / 10.0, 0.65) * 0.22;
    dx = polarRadius * Math.sin(lonRad);
    // Center the South Pole slightly below disk center (y = 0.54) with 0° Lon pointing up toward Earth (North)
    dy = 0.04 - polarRadius * Math.cos(lonRad) * 0.75;
  } else {
    // Global selenographic projection for latitudes from -80° to +90°
    const latNorm = (safeLat + 80) / 170.0; // 0 at -80°, 1 at +90°
    const latRad = toRad(safeLat);
    const parallelRadius = Math.max(0.08, Math.cos(latRad) * 0.33);
    dx = parallelRadius * Math.sin(lonRad * 0.85);
    dy = 0.22 - latNorm * 0.52;
  }

  // Clamp strictly within the visible lunar sphere disk (radius <= 0.34 from center 0.5, 0.5)
  const dist = Math.hypot(dx, dy);
  const maxR = 0.33;
  if (dist > maxR) {
    dx = (dx / dist) * maxR;
    dy = (dy / dist) * maxR;
  }

  const x = Number((0.5 + dx).toFixed(4));
  const y = Number((0.5 + dy).toFixed(4));

  // Place callout label line outward toward the nearer horizontal side
  const align = dx < -0.02 ? 'end' : 'start';
  const lx = Number(Math.max(0.08, Math.min(0.92, x + (align === 'end' ? -0.14 : 0.14))).toFixed(4));
  const ly = Number(Math.max(0.14, Math.min(0.86, y - 0.06)).toFixed(4));

  return { x, y, lx, ly, align };
}

export function normalizeSite(raw, index = 0) {
  const lat = raw.lat ?? raw.latitude ?? null;
  const lon = raw.lon ?? raw.longitude ?? null;
  const elevation = raw.elevation ?? raw.altitude ?? null;
  const numLat = lat == null ? null : Number(lat);
  const numLon = lon == null ? null : Number(lon);
  const numElev = elevation == null ? null : Number(elevation);

  return {
    id: raw.id ?? `site${String(index + 1).padStart(2, '0')}`,
    name: raw.name ?? `Landing Site ${index + 1}`,
    lat: numLat,
    lon: numLon,
    elevation: numElev,
    markers: Array.isArray(raw.markers) ? raw.markers : [],
  };
}

export function formatLat(lat) {
  if (!Number.isFinite(lat)) return '—';
  return `${Math.abs(lat).toFixed(2)}°${lat < 0 ? 'S' : 'N'}`;
}

export function formatLon(lon) {
  if (!Number.isFinite(lon)) return '—';
  return `${Math.abs(lon).toFixed(1)}°${lon < 0 ? 'W' : 'E'}`;
}

export function formatCoords(site) {
  if (!site || !Number.isFinite(site.lat) || !Number.isFinite(site.lon)) return '(COORDINATES PENDING)';
  return `(${formatLat(site.lat)}, ${formatLon(site.lon)})`;
}
