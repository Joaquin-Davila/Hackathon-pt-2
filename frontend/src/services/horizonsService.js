/**
 * LuNav Horizons & Topography Data Service
 * Connects to Node API /api/horizons/:id or loads verified LOLA DEM JSON profiles.
 */

const normalizeSiteLookupId = (siteId) => {
  if (!siteId) return 'shackleton';
  const str = String(siteId).toLowerCase().trim();
  if (str === 'shackleton-rim' || str === 'shackleton') return 'shackleton';
  if (str === 'connecting-ridge') return 'connecting-ridge';
  if (str === 'malapert-massif' || str === 'malapert') return 'malapert-massif';
  if (str === 'haworth-rim' || str === 'haworth') return 'haworth-rim';
  if (str === 'nobile-rim' || str === 'nobile') return 'nobile-rim';
  return str;
};

const horizonSources = (siteId) => {
  const normalized = normalizeSiteLookupId(siteId);
  const raw = encodeURIComponent(siteId);
  const normEncoded = encodeURIComponent(normalized);
  const aliases = Array.from(new Set([
    normEncoded,
    raw,
    raw.replace(/-rim$/, ''),
    raw.endsWith('-rim') ? raw : `${raw}-rim`,
  ]));

  const urls = [];
  for (const alias of aliases) {
    urls.push(`/api/horizons/${alias}`);
    urls.push(`/data/horizons/${alias}.json`);
    urls.push(`/data/${alias}.json`);
  }
  return urls;
};

export async function getHorizonData(siteId = 'shackleton') {
  const sources = horizonSources(siteId);
  for (const source of sources) {
    try {
      const response = await fetch(source);
      if (!response.ok) continue;

      const data = await response.json();
      if (data && typeof data === 'object' && !Array.isArray(data) && data.horizonProfile) {
        return data;
      }
    } catch {
      // Continue to next source
    }
  }

  return null;
}

export const CANDIDATE_SITES_CATALOG = [
  { id: 'shackleton-rim', name: 'Shackleton Rim', lat: -89.54, lon: 0.0, elevation: 4218, defaultHorizon: 'shackleton' },
  { id: 'connecting-ridge', name: 'Connecting Ridge', lat: -89.44, lon: -137.5, elevation: 4350, defaultHorizon: 'connecting-ridge' },
  { id: 'malapert-massif', name: 'Malapert Massif', lat: -85.99, lon: 2.93, elevation: 5040, defaultHorizon: 'malapert-massif' },
  { id: 'haworth-rim', name: 'Haworth Crater Rim', lat: -87.4, lon: -5.1, elevation: 2150, defaultHorizon: 'haworth-rim' },
  { id: 'nobile-rim', name: 'Nobile Rim 1', lat: -85.2, lon: 37.8, elevation: 3820, defaultHorizon: 'nobile-rim' },
];
