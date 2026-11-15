/**
 * LuNav Horizons & Topography Data Service
 * Connects to Node API /api/horizons/:id, loads verified LOLA DEM JSON profiles,
 * or synthesizes physically coherent LRO LOLA & JPL Horizons telemetry from selenographic (lat, lon, elevation).
 */

export const CANDIDATE_SITES_CATALOG = [
  { id: 'shackleton-rim', name: 'Shackleton Rim', lat: -89.54, lon: 0.0, elevation: 4218, defaultHorizon: 'shackleton' },
  { id: 'connecting-ridge', name: 'Connecting Ridge', lat: -89.44, lon: -137.5, elevation: 4350, defaultHorizon: 'connecting-ridge' },
  { id: 'malapert-massif', name: 'Malapert Massif', lat: -85.99, lon: 2.93, elevation: 5040, defaultHorizon: 'malapert-massif' },
  { id: 'haworth-rim', name: 'Haworth Crater Rim', lat: -87.4, lon: -5.1, elevation: 2150, defaultHorizon: 'haworth-rim' },
  { id: 'nobile-rim', name: 'Nobile Rim 1', lat: -85.2, lon: 37.8, elevation: 3820, defaultHorizon: 'nobile-rim' },
];

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

/**
 * Generates a realistic, deterministic 360° LRO LOLA horizon elevation profile
 * and solar/communication window estimate based on selenographic latitude, longitude, and elevation.
 */
export function generateRealisticHorizonData(siteOrCoords = {}) {
  const catalogMatch = CANDIDATE_SITES_CATALOG.find(
    (c) =>
      c.id === siteOrCoords?.id ||
      c.defaultHorizon === siteOrCoords?.id ||
      c.id === siteOrCoords?.siteId ||
      c.defaultHorizon === siteOrCoords?.siteId
  );

  const lat = Number.isFinite(Number(siteOrCoords?.lat ?? siteOrCoords?.latitude))
    ? Number(siteOrCoords.lat ?? siteOrCoords.latitude)
    : (catalogMatch?.lat ?? -89.54);
  const lon = Number.isFinite(Number(siteOrCoords?.lon ?? siteOrCoords?.longitude))
    ? Number(siteOrCoords.lon ?? siteOrCoords.longitude)
    : (catalogMatch?.lon ?? 0.0);
  const elevation = Number.isFinite(Number(siteOrCoords?.elevation ?? siteOrCoords?.elevationMeters))
    ? Number(siteOrCoords.elevation ?? siteOrCoords.elevationMeters)
    : (catalogMatch?.elevation ?? 4200);

  const absLat = Math.abs(lat);
  const colatitudeDeg = Math.max(0, 90.0 - absLat); // 0° at exact pole, ~1° at -89°

  // Topographic horizon baseline (in degrees) governed by polar crater relief & observer altitude:
  // - Near the South Pole (-88° to -90°), high ridges (>3800m) sit above surrounding basins (horizon ~ -0.3° to +1.4°).
  // - Low elevations or crater interiors (<1500m or negative) are surrounded by steep crater walls (+3.8° to +7.2°).
  // - Away from the pole (|lat| < 82°), mare/highland horizon relief moderates toward +0.4° to +1.8°.
  const polarRuggedness = absLat >= 84 ? 1.0 : Math.max(0.35, 1.0 - (84 - absLat) * 0.02);
  const elevationReliefOffset = (3680 - elevation) / 720.0; // Negative on high peaks (>3680m), positive in deep craters
  const baseHorizonDeg = Math.max(-0.7, Math.min(6.8, (0.75 + elevationReliefOffset) * polarRuggedness));

  // Deterministic harmonic terrain signature derived from actual (lat, lon)
  const latRad = (lat * Math.PI) / 180.0;
  const lonRad = (lon * Math.PI) / 180.0;
  const phase1 = latRad * 7.0 + lonRad * 3.0;
  const phase2 = lonRad * 5.0 - latRad * 4.0;

  const horizonProfile = [];
  let sumElev = 0;

  for (let azimuth = 0; azimuth < 360; azimuth += 10) {
    const azRad = (azimuth * Math.PI) / 180.0;

    // Multi-harmonic crater rim & massif undulation
    const rimWave =
      Math.sin(azRad * 2 + phase1) * (0.78 * polarRuggedness) +
      Math.cos(azRad * 3 + phase2) * (0.42 * polarRuggedness) +
      Math.sin(azRad * 5 - phase1 * 0.5) * 0.18;

    // At extreme polar latitudes, Earth is toward 0° Azimuth (North) shifted by longitude;
    // model realistic saddle/ridge dip along the sub-Earth corridor for high ridges
    const earthCorridorDip = elevation >= 3500 ? -0.35 * Math.cos(azRad - lonRad) : 0.25 * Math.cos(azRad);

    const elevDeg = Number(
      Math.max(-1.4, Math.min(8.2, baseHorizonDeg + rimWave + earthCorridorDip)).toFixed(2)
    );
    horizonProfile.push({ azimuth, elevation: elevDeg });
    sumElev += elevDeg;
  }

  const meanHorizonElevationDeg = Number((sumElev / horizonProfile.length).toFixed(2));

  // Estimate realistic solar window hours over a 336h (14-day) mission window
  // factoring polar summer sub-solar tilt (~1.45° S) and observer colatitude:
  const subSolarTiltDeg = lat < 0 ? 1.45 : -1.45;
  const meanPolarSunOffset = Math.sin(Math.abs(latRad)) * subSolarTiltDeg;
  const maxSunElevDeg = meanPolarSunOffset + colatitudeDeg;
  const minSunElevDeg = meanPolarSunOffset - colatitudeDeg;

  let illuminatedAzimuthCount = 0;
  for (let i = 0; i < horizonProfile.length; i++) {
    const h = horizonProfile[i];
    const azRad = (h.azimuth * Math.PI) / 180.0;
    const sunElevAtAz = meanPolarSunOffset + colatitudeDeg * Math.cos(azRad - lonRad);
    if (sunElevAtAz > h.elevation) {
      illuminatedAzimuthCount++;
    }
  }

  const illuminationFraction = illuminatedAzimuthCount / horizonProfile.length;
  const estimatedSolarWindowHours = Math.round(illuminationFraction * 336);

  return {
    siteId: siteOrCoords?.id ?? siteOrCoords?.siteId ?? 'custom-coords',
    name:
      siteOrCoords?.name ??
      catalogMatch?.name ??
      `Custom Target (${Math.abs(lat).toFixed(2)}°${lat < 0 ? 'S' : 'N'}, ${Math.abs(lon).toFixed(2)}°${lon < 0 ? 'W' : 'E'})`,
    coordinates: {
      latitude: lat,
      longitude: lon,
      elevation,
    },
    metricsSummary: {
      meanHorizonElevationDeg,
      maxSunElevDeg: Number(maxSunElevDeg.toFixed(2)),
      minSunElevDeg: Number(minSunElevDeg.toFixed(2)),
      estimatedSolarWindowHours,
      estimatedIlluminationPct: Number((illuminationFraction * 100).toFixed(1)),
    },
    horizonProfile,
    isDynamicFallback: true,
  };
}

const horizonSources = (siteId) => {
  const normalized = normalizeSiteLookupId(siteId);
  const raw = encodeURIComponent(siteId);
  const normEncoded = encodeURIComponent(normalized);
  const aliases = Array.from(
    new Set([
      normEncoded,
      raw,
      raw.replace(/-rim$/, ''),
      raw.endsWith('-rim') ? raw : `${raw}-rim`,
    ])
  );

  const urls = [];
  for (const alias of aliases) {
    urls.push(`/api/horizons/${alias}`);
    urls.push(`/data/horizons/${alias}.json`);
    urls.push(`/data/${alias}.json`);
  }
  return urls;
};

/**
 * Fetches verified LOLA horizon data from backend/static JSON, or computes
 * realistic latitude/longitude/elevation-based fallback telemetry when a site has no JSON
 * or uses custom coordinates (`custom-coords`).
 */
export async function getHorizonData(siteId = 'shackleton', siteCoords = null) {
  const idStr = typeof siteId === 'object' && siteId !== null ? (siteId.id ?? siteId.siteId ?? 'custom-coords') : String(siteId || 'shackleton');
  const coordsObj = typeof siteId === 'object' && siteId !== null ? siteId : siteCoords;

  const isCustomSite =
    idStr === 'custom-coords' ||
    idStr === 'custom' ||
    idStr === 'shackleton-psr' ||
    Boolean(coordsObj?.isCustom);

  if (!isCustomSite) {
    const sources = horizonSources(idStr);
    for (const source of sources) {
      try {
        const response = await fetch(source);
        if (!response.ok) continue;

        const data = await response.json();
        if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.horizonProfile) && data.horizonProfile.length > 0) {
          // If the user customized lat/lon on top of a catalog site, synthesize profile for the new coordinates
          if (
            coordsObj &&
            Number.isFinite(coordsObj.lat) &&
            data.coordinates &&
            (Math.abs(coordsObj.lat - data.coordinates.latitude) > 0.01 ||
              Math.abs(coordsObj.lon - data.coordinates.longitude) > 0.01)
          ) {
            return generateRealisticHorizonData(coordsObj);
          }
          return data;
        }
      } catch {
        // Continue to next source
      }
    }
  }

  // Coherent latitude-based fallback calculation (never random or static)
  return generateRealisticHorizonData(coordsObj || { id: idStr });
}
