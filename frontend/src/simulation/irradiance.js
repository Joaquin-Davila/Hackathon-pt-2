/**
 * LuNav Irradiance & Solar Flux Simulation Engine
 * Calculates direct, horizontal, and vertical array solar power on the lunar surface.
 */

import { SOLAR_CONSTANT, calculateSolarVector, getTerrainElevationAtAzimuth } from '../services/ephemerisEngine.js';

export function calculateInstantaneousIrradiance(lat, lon, horizonProfile, hoursOffset = 0, baseDate) {
  const sun = calculateSolarVector(lat, lon, hoursOffset, baseDate);
  const terrainElev = getTerrainElevationAtAzimuth(horizonProfile, sun.azimuth);
  const clearance = sun.elevation - terrainElev;
  const isIlluminated = clearance > 0;

  if (!isIlluminated) {
    return {
      directFluxW: 0.0,
      verticalArrayW: 0.0,
      horizontalFluxW: 0.0,
      sunClearance: Number(clearance.toFixed(2)),
      isIlluminated: false,
    };
  }

  const elRad = (Math.max(0, sun.elevation) * Math.PI) / 180.0;
  const directFlux = SOLAR_CONSTANT;
  const verticalArrayFlux = SOLAR_CONSTANT * Math.cos(elRad);
  const horizontalFlux = SOLAR_CONSTANT * Math.sin(elRad);

  return {
    directFluxW: Number(directFlux.toFixed(1)),
    verticalArrayW: Number(verticalArrayFlux.toFixed(1)),
    horizontalFluxW: Number(horizontalFlux.toFixed(1)),
    sunClearance: Number(clearance.toFixed(2)),
    isIlluminated: true,
  };
}

export function integrateSolarFluxOverWindow(lat, lon, horizonProfile, startHours, durationHours, stepHours = 2, baseDate) {
  let totalWh = 0;
  const steps = Math.floor(durationHours / stepHours);

  for (let i = 0; i < steps; i++) {
    const t = startHours + i * stepHours;
    const { verticalArrayW, isIlluminated } = calculateInstantaneousIrradiance(lat, lon, horizonProfile, t, baseDate);
    if (isIlluminated) {
      totalWh += verticalArrayW * stepHours;
    }
  }

  return {
    totalEnergyKwh: Number((totalWh / 1000.0).toFixed(2)),
    averageFluxW: Number((totalWh / durationHours).toFixed(1)),
  };
}
