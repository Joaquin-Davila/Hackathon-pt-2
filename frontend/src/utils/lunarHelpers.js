// frontend/src/utils/lunarHelpers.js
export const DEFAULT_SITE_ID = 'shackleton-rim';

export function formatCoordinate(value, axis) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const direction = axis === 'latitude' || axis === 'lat' ? (value < 0 ? 'S' : 'N') : (value < 0 ? 'W' : 'E');
  return `${Math.abs(value).toFixed(3)}° ${direction}`;
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

export function normalizeSite(site, index = 0) {
  const name = site.name ?? site.siteName ?? site.label ?? `Candidate site ${index + 1}`;
  const lat = site.lat ?? site.latitude ?? null;
  const lon = site.lon ?? site.longitude ?? site.lng ?? null;
  const elevation = site.elevation ?? site.altitude ?? null;
  return {
    id: String(site.id ?? site.slug ?? `site-${index + 1}`),
    name,
    lat: lat == null ? null : Number(lat),
    lon: lon == null ? null : Number(lon),
    latitude: lat == null ? null : Number(lat),
    longitude: lon == null ? null : Number(lon),
    elevation: elevation == null ? null : Number(elevation),
    markers: Array.isArray(site.markers) ? site.markers : [],
    description: site.description ?? '',
  };
}
