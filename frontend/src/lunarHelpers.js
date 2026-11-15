// frontend/src/lunarHelpers.js
export function normalizeSite(raw, index = 0) {
  const lat = raw.lat ?? raw.latitude ?? null;
  const lon = raw.lon ?? raw.longitude ?? null;
  const elevation = raw.elevation ?? raw.altitude ?? null;
  return {
    id: raw.id ?? `site${String(index + 1).padStart(2, '0')}`,
    name: raw.name ?? `Sitio ${index + 1}`,
    lat: lat == null ? null : Number(lat),
    lon: lon == null ? null : Number(lon),
    elevation: elevation == null ? null : Number(elevation),
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
