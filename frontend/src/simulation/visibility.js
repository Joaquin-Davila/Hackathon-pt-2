/**
 * LuNav Line-of-Sight & RF Direct-to-Earth Visibility Engine
 */

import { calculateEarthVector, getTerrainElevationAtAzimuth } from '../services/ephemerisEngine.js';

export function evaluateDirectToEarthVisibility(lat, lon, elevationMeters, horizonProfile, hoursOffset = 0, baseDate) {
  const earth = calculateEarthVector(lat, lon, elevationMeters, hoursOffset, baseDate);
  const terrainElev = getTerrainElevationAtAzimuth(horizonProfile, earth.azimuth);
  const clearance = earth.elevation - terrainElev;
  const isVisible = clearance > 0;

  let rfSnr = '0.0 dB-Hz';
  let signalDbm = -128.0;
  let linkStatus = 'OCCLUDED';

  if (isVisible) {
    const marginDb = Math.min(10.0, Math.max(1.0, clearance * 2.5));
    rfSnr = `${(38.0 + marginDb).toFixed(1)} dB-Hz`;
    signalDbm = Number((-105.0 + marginDb * 1.5).toFixed(1));
    linkStatus = clearance > 2.0 ? 'OPTIMAL' : 'MARGINAL';
  }

  return {
    earthAzimuth: earth.azimuth,
    earthElevation: earth.elevation,
    terrainElevation: Number(terrainElev.toFixed(2)),
    clearance: Number(clearance.toFixed(2)),
    isVisible,
    rfSnr,
    signalDbm,
    linkStatus,
  };
}
