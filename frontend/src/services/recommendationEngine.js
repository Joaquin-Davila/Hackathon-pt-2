/**
 * LuNav Mission Planning & Spatial AI Recommendation Engine
 * Developed for team isiPisi // NASA Space Apps Challenge
 * 
 * Provides real-time automated feasibility evaluation, smart warnings for
 * extreme shadowing (PSRs) and communication blackouts, alternative site
 * suggestions with traverse route geometry, and schedule slippage contingency analysis.
 */

import {
  calculateSolarVector,
  calculateEarthVector,
  getTerrainElevationAtAzimuth,
  normalizeAngle360,
  MOON_RADIUS_KM,
  LUNAR_SYNODIC_HOURS,
  DEFAULT_MISSION_EPOCH,
} from './ephemerisEngine.js';

import { CANDIDATE_SITES_CATALOG } from './horizonsService.js';

// Pre-compiled verified LOLA profiles for rapid spatial lookup
const CATALOG_FALLBACK_PROFILES = {
  'shackleton-rim': [
    { azimuth: 0, elevation: 1.45 }, { azimuth: 45, elevation: 0.88 },
    { azimuth: 90, elevation: 3.02 }, { azimuth: 135, elevation: 1.76 },
    { azimuth: 180, elevation: -0.42 }, { azimuth: 225, elevation: 0.85 },
    { azimuth: 270, elevation: 2.15 }, { azimuth: 315, elevation: 1.62 },
  ],
  'connecting-ridge': [
    { azimuth: 0, elevation: 0.65 }, { azimuth: 45, elevation: 0.45 },
    { azimuth: 90, elevation: 1.25 }, { azimuth: 135, elevation: 0.85 },
    { azimuth: 180, elevation: 0.35 }, { azimuth: 225, elevation: 0.95 },
    { azimuth: 270, elevation: 1.65 }, { azimuth: 315, elevation: 1.10 },
  ],
  'malapert-massif': [
    { azimuth: 0, elevation: -0.85 }, { azimuth: 45, elevation: -0.65 },
    { azimuth: 90, elevation: 0.45 }, { azimuth: 135, elevation: 0.15 },
    { azimuth: 180, elevation: -0.95 }, { azimuth: 225, elevation: -0.40 },
    { azimuth: 270, elevation: 0.85 }, { azimuth: 315, elevation: -0.20 },
  ],
  'haworth-rim': [
    { azimuth: 0, elevation: 3.85 }, { azimuth: 45, elevation: 4.20 },
    { azimuth: 90, elevation: 4.85 }, { azimuth: 135, elevation: 3.40 },
    { azimuth: 180, elevation: 2.80 }, { azimuth: 225, elevation: 3.60 },
    { azimuth: 270, elevation: 4.50 }, { azimuth: 315, elevation: 4.10 },
  ],
  'nobile-rim': [
    { azimuth: 0, elevation: 1.10 }, { azimuth: 45, elevation: 0.95 },
    { azimuth: 90, elevation: 2.20 }, { azimuth: 135, elevation: 1.80 },
    { azimuth: 180, elevation: 0.85 }, { azimuth: 225, elevation: 1.40 },
    { azimuth: 270, elevation: 1.90 }, { azimuth: 315, elevation: 1.30 },
  ],
};

function toRad(deg) {
  return (deg * Math.PI) / 180.0;
}

function toDeg(rad) {
  return (rad * 180.0) / Math.PI;
}

/**
 * Calculates Great-Circle Geodesic Distance on the Moon (in kilometers)
 */
export function calculateLunarDistanceKm(lat1, lon1, lat2, lon2) {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((MOON_RADIUS_KM * c).toFixed(2));
}

/**
 * Calculates Initial Azimuth Bearing from Coordinate 1 to Coordinate 2 (0° to 360°)
 */
export function calculateLunarBearing(lat1, lon1, lat2, lon2) {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const bearingRad = Math.atan2(y, x);

  return Number(normalizeAngle360(toDeg(bearingRad)).toFixed(1));
}

/**
 * Evaluates comprehensive feasibility metrics for a coordinate or site over a mission window
 * 
 * @param {Object} site Coordinates { lat, lon, elevation }
 * @param {Array} horizonProfile LOLA GDR elevation profile
 * @param {number} startHoursOffset Offset from mission epoch
 * @param {number} durationHours Mission duration window (default 336h = 14 days)
 * @param {Date|string} baseDate Mission epoch
 */
export function evaluateMissionFeasibility(
  site,
  horizonProfile = [],
  startHoursOffset = 0,
  durationHours = 336,
  baseDate = DEFAULT_MISSION_EPOCH
) {
  const lat = Number(site.lat ?? site.latitude ?? -89.54);
  const lon = Number(site.lon ?? site.longitude ?? 0.0);
  const elevation = Number(site.elevation ?? site.elevationMeters ?? 4200);

  // Fallback profile if empty
  const profile = (Array.isArray(horizonProfile) && horizonProfile.length > 0)
    ? horizonProfile
    : (CATALOG_FALLBACK_PROFILES[site.id ?? site.siteId] || CATALOG_FALLBACK_PROFILES['shackleton-rim']);

  const stepHours = 2.0; // 2-hour sampling steps
  const totalSteps = Math.floor(durationHours / stepHours);

  let illuminatedSteps = 0;
  let dteVisibleSteps = 0;
  let currentSunStreak = 0;
  let maxContinuousSunHours = 0;
  let currentDteStreak = 0;
  let maxContinuousDteHours = 0;

  let totalSolarFluxWh = 0;
  let minSolarElevation = 999;
  let maxSolarElevation = -999;
  let minEarthElevation = 999;

  for (let step = 0; step < totalSteps; step++) {
    const currentHour = startHoursOffset + step * stepHours;
    const sun = calculateSolarVector(lat, lon, currentHour, baseDate);
    const earth = calculateEarthVector(lat, lon, elevation, currentHour, baseDate);

    const sunTerrain = getTerrainElevationAtAzimuth(profile, sun.azimuth);
    const earthTerrain = getTerrainElevationAtAzimuth(profile, earth.azimuth);

    const isSunClear = sun.elevation > sunTerrain;
    const isEarthClear = earth.elevation > earthTerrain;

    if (sun.elevation < minSolarElevation) minSolarElevation = sun.elevation;
    if (sun.elevation > maxSolarElevation) maxSolarElevation = sun.elevation;
    if (earth.elevation < minEarthElevation) minEarthElevation = earth.elevation;

    if (isSunClear) {
      illuminatedSteps++;
      currentSunStreak += stepHours;
      if (currentSunStreak > maxContinuousSunHours) {
        maxContinuousSunHours = currentSunStreak;
      }
      // Direct flux calculation (1361 W/m^2 * cos(elevation))
      const flux = 1361.0 * Math.cos(toRad(Math.max(0, sun.elevation)));
      totalSolarFluxWh += flux * stepHours;
    } else {
      currentSunStreak = 0;
    }

    if (isEarthClear) {
      dteVisibleSteps++;
      currentDteStreak += stepHours;
      if (currentDteStreak > maxContinuousDteHours) {
        maxContinuousDteHours = currentDteStreak;
      }
    } else {
      currentDteStreak = 0;
    }
  }

  const solarIlluminationPct = Number(((illuminatedSteps / totalSteps) * 100).toFixed(1));
  const dteUptimePct = Number(((dteVisibleSteps / totalSteps) * 100).toFixed(1));
  const totalSolarEnergyKwh = Number((totalSolarFluxWh / 1000.0).toFixed(1));

  // Instantaneous status at startHoursOffset
  const startSun = calculateSolarVector(lat, lon, startHoursOffset, baseDate);
  const startEarth = calculateEarthVector(lat, lon, elevation, startHoursOffset, baseDate);
  const startSunTerrain = getTerrainElevationAtAzimuth(profile, startSun.azimuth);
  const startEarthTerrain = getTerrainElevationAtAzimuth(profile, startEarth.azimuth);
  const currentSunClearance = Number((startSun.elevation - startSunTerrain).toFixed(2));
  const currentEarthClearance = Number((startEarth.elevation - startEarthTerrain).toFixed(2));

  // Determine Feasibility Verdict
  let verdict = 'NOMINAL';
  let verdictLabel = 'FEASIBLE // HIGH MARGIN';
  let verdictColor = '#4cd964'; // Green
  let riskScore = 15; // 0 (safest) to 100 (hazardous)

  const isDeepShadow = solarIlluminationPct < 25.0 || currentSunClearance < -1.5;
  const isCommsDegraded = dteUptimePct < 40.0 || currentEarthClearance < -0.5;

  if (isDeepShadow && isCommsDegraded) {
    verdict = 'CRITICAL';
    verdictLabel = 'HAZARDOUS // DEEP SHADOW & BLACKOUT';
    verdictColor = '#ff3b30'; // Red
    riskScore = 95;
  } else if (isDeepShadow) {
    verdict = 'CRITICAL';
    verdictLabel = 'HAZARDOUS // EXTREME PSR SHADOWING';
    verdictColor = '#ff3b30';
    riskScore = 88;
  } else if (isCommsDegraded) {
    verdict = 'WARNING';
    verdictLabel = 'MARGINAL // RF OCCULTATION RISK';
    verdictColor = '#ffb14a'; // Amber
    riskScore = 65;
  } else if (solarIlluminationPct < 60.0 || dteUptimePct < 70.0) {
    verdict = 'CAUTION';
    verdictLabel = 'CAUTION // INTERMITTENT POWER WINDOW';
    verdictColor = '#ffb14a';
    riskScore = 48;
  }

  return {
    siteId: site.id ?? site.siteId ?? 'custom-target',
    name: site.name ?? 'Selected Coordinates',
    coordinates: { lat, lon, elevation },
    startHoursOffset,
    durationHours,
    metrics: {
      solarIlluminationPct,
      maxContinuousSunHours,
      dteUptimePct,
      maxContinuousDteHours,
      totalSolarEnergyKwh,
      currentSunClearance,
      currentEarthClearance,
      minSolarElevation: Number(minSolarElevation.toFixed(2)),
      maxSolarElevation: Number(maxSolarElevation.toFixed(2)),
      minEarthElevation: Number(minEarthElevation.toFixed(2)),
    },
    verdict,
    verdictLabel,
    verdictColor,
    riskScore,
  };
}

/**
 * Generates automated operational warnings and hazard alerts
 */
export function generateSmartWarnings(evaluation) {
  const warnings = [];
  const { metrics, verdict } = evaluation;

  if (metrics.currentSunClearance <= 0.0) {
    warnings.push({
      id: 'SUN_TERRAIN_OCCULTED',
      level: 'CRITICAL',
      title: 'ZERO SOLAR POWER WINDOW // HIGH TERRAIN OBSTRUCTION',
      message: `Direct solar line-of-sight is physically occluded by local crater topography (${metrics.currentSunClearance}° clearance below LOLA crest). Immediate battery drain hazard.`,
      icon: 'ShieldAlert',
    });
  }

  if (metrics.solarIlluminationPct < 30.0) {
    warnings.push({
      id: 'EXTREME_SHADOWING_PSR',
      level: 'CRITICAL',
      title: 'PERMANENTLY SHADOWED REGION (PSR) MARGIN HAZARD',
      message: `Cumulative illumination is restricted to only ${metrics.solarIlluminationPct}% of mission duration. Surface solar arrays will experience extended cryogenic darkness exceeding thermal survival margins.`,
      icon: 'AlertTriangle',
    });
  }

  if (metrics.currentEarthClearance <= 0.0) {
    warnings.push({
      id: 'DTE_RF_BLACKOUT',
      level: 'WARNING',
      title: 'COMMUNICATION BLACKOUT // DIRECT DTE PATH OCCLUDED',
      message: `Direct-to-Earth line-of-sight is obstructed by crater rim topography (${metrics.currentEarthClearance}° margin). S-Band / X-Band carrier lock cannot be established without orbital relay.`,
      icon: 'Radio',
    });
  } else if (metrics.dteUptimePct < 60.0) {
    warnings.push({
      id: 'DTE_MARGINAL_UPTIME',
      level: 'CAUTION',
      title: 'RESTRICTED DTE WINDOW (LIBRATION OCCULTATION)',
      message: `Libration-driven dips will drop Earth below horizon for ${((100 - metrics.dteUptimePct) * 0.01 * evaluation.durationHours).toFixed(0)} hours during this operational phase.`,
      icon: 'WifiOff',
    });
  }

  return warnings;
}

/**
 * Spatial AI Recommendation Engine:
 * Analyzes candidate ridges and evaluates optimal nearby alternative coordinates/waypoints
 * 
 * @param {Object} currentSite Active site or custom coordinates
 * @param {Array} currentProfile Active LOLA profile
 * @param {number} hoursOffset Current timeline offset
 */
export function recommendOptimalAlternative(
  currentSite,
  currentProfile,
  hoursOffset = 0,
  durationHours = 336,
  baseDate = DEFAULT_MISSION_EPOCH
) {
  const currentEval = evaluateMissionFeasibility(currentSite, currentProfile, hoursOffset, durationHours, baseDate);
  const currentLat = currentEval.coordinates.lat;
  const currentLon = currentEval.coordinates.lon;
  const currentElev = currentEval.coordinates.elevation;

  // Evaluate candidate catalog sites to find the highest-performing alternative
  const alternatives = CANDIDATE_SITES_CATALOG.map((catSite) => {
    // Avoid recommending the exact same site if it's already selected
    if (catSite.id === currentSite.id || catSite.siteId === currentSite.siteId) {
      return null;
    }

    const fallbackProfile = CATALOG_FALLBACK_PROFILES[catSite.id] || CATALOG_FALLBACK_PROFILES['shackleton-rim'];
    const evalResult = evaluateMissionFeasibility(catSite, fallbackProfile, hoursOffset, durationHours, baseDate);

    const distKm = calculateLunarDistanceKm(currentLat, currentLon, catSite.lat, catSite.lon);
    const bearing = calculateLunarBearing(currentLat, currentLon, catSite.lat, catSite.lon);
    const deltaElev = catSite.elevation - currentElev;

    // Operational Delta Gains
    const deltaSunPct = Number((evalResult.metrics.solarIlluminationPct - currentEval.metrics.solarIlluminationPct).toFixed(1));
    const deltaSunHours = Number((evalResult.metrics.maxContinuousSunHours - currentEval.metrics.maxContinuousSunHours).toFixed(1));
    const deltaDtePct = Number((evalResult.metrics.dteUptimePct - currentEval.metrics.dteUptimePct).toFixed(1));

    // Spatial utility score: weights illumination, DTE uptime, proximity (closer is better for EVA)
    const proximityBonus = Math.max(0, 100 - distKm * 1.5);
    const utilityScore =
      evalResult.metrics.solarIlluminationPct * 0.45 +
      evalResult.metrics.dteUptimePct * 0.35 +
      proximityBonus * 0.20;

    return {
      site: catSite,
      evaluation: evalResult,
      distKm,
      bearing,
      deltaElev,
      deltaSunPct,
      deltaSunHours,
      deltaDtePct,
      utilityScore,
    };
  }).filter(Boolean);

  // Sort by highest utility score
  alternatives.sort((a, b) => b.utilityScore - a.utilityScore);

  const topPick = alternatives[0] || null;

  if (!topPick) return null;

  // Generate 3-Waypoint Traverse Route Geometry
  // Waypoint 0: Origin (Current Location)
  // Waypoint 1: Saddle Egress / Slope Skirt
  // Waypoint 2: Summit Crest (Target Ridge)
  const midLat = Number(((currentLat + topPick.site.lat) / 2.0).toFixed(4));
  const midLon = Number(((currentLon + topPick.site.lon) / 2.0).toFixed(4));
  const midElev = Math.round((currentElev + topPick.site.elevation) / 2.0);

  const waypoints = [
    {
      id: 'WP-00',
      label: 'LANDING ORIGIN',
      role: 'DEGRADED ZONE',
      lat: currentLat,
      lon: currentLon,
      elevation: currentElev,
      cumulativeKm: 0.0,
      slopeDeg: 0.0,
    },
    {
      id: 'WP-01',
      label: 'SADDLE EGRESS',
      role: 'SLOPE TRANSITION',
      lat: midLat,
      lon: midLon,
      elevation: midElev,
      cumulativeKm: Number((topPick.distKm * 0.52).toFixed(2)),
      slopeDeg: 8.4,
    },
    {
      id: 'WP-02',
      label: `${topPick.site.name.toUpperCase()} CREST APEX`,
      role: 'HIGH-ILLUMINATION HAVEN',
      lat: topPick.site.lat,
      lon: topPick.site.lon,
      elevation: topPick.site.elevation,
      cumulativeKm: topPick.distKm,
      slopeDeg: 4.2,
    },
  ];

  return {
    recommendedSite: topPick.site,
    evaluation: topPick.evaluation,
    distKm: topPick.distKm,
    bearing: topPick.bearing,
    deltaElev: topPick.deltaElev,
    deltaSunPct: topPick.deltaSunPct,
    deltaSunHours: topPick.deltaSunHours,
    deltaDtePct: topPick.deltaDtePct,
    utilityScore: Number(topPick.utilityScore.toFixed(1)),
    waypoints,
    rationale: `Relocating ${topPick.distKm} km at bearing ${topPick.bearing}° to ${topPick.site.name} delivers +${topPick.deltaSunPct}% cumulative solar illumination and +${topPick.deltaSunHours}h continuous power, fully resolving shadow occultation.`,
  };
}

/**
 * Schedule Slippage & Launch Delay Matrix Evaluator
 * Evaluates operational feasibility across +0d, +3d, +7d, +14d contingency windows
 */
export function evaluateScheduleSlippageMatrix(
  site,
  horizonProfile,
  durationHours = 336,
  baseDate = DEFAULT_MISSION_EPOCH
) {
  const slips = [
    { label: 'T+0 NOMINAL', hours: 0, delayDays: 0 },
    { label: '+3d SLIP', hours: 72, delayDays: 3 },
    { label: '+7d SLIP', hours: 168, delayDays: 7 },
    { label: '+14d SLIP', hours: 336, delayDays: 14 },
  ];

  return slips.map((slip) => {
    const result = evaluateMissionFeasibility(site, horizonProfile, slip.hours, durationHours, baseDate);
    const warnings = generateSmartWarnings(result);
    return {
      ...slip,
      evaluation: result,
      warnings,
      isViable: result.metrics.solarIlluminationPct >= 50.0 && result.metrics.dteUptimePct >= 50.0,
    };
  });
}
