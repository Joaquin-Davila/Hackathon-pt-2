import React from 'react';
import { Sun, Radio, Activity, Clock, Compass, Zap, Satellite, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatMissionHours } from '../../services/ephemerisEngine.js';

function formatCoordinate(val, axis) {
  if (val == null || !Number.isFinite(Number(val))) return '—';
  const num = Number(val);
  const dir = axis === 'lat' ? (num < 0 ? 'S' : 'N') : (num < 0 ? 'W' : 'E');
  return `${Math.abs(num).toFixed(4)}° ${dir}`;
}

export default function TacticalTelemetry({ telemetry, profile = 'astronaut' }) {
  if (!telemetry) return null;

  const { coordinates, sun, earth } = telemetry;
  const isAstronaut = profile.toLowerCase() === 'astronaut';

  // Solar array power estimation for 2.0 m^2 29% triple-junction cells
  const solarPanelArea = 2.0; // m^2
  const cellEfficiency = 0.29; // 29% efficiency
  const estimatedPowerWatts = (sun.directFluxW * solarPanelArea * cellEfficiency).toFixed(1);

  return (
    <div className="tactical-hud-panel" aria-label="Tactical Ephemeris Telemetry Stream">
      {/* SECTION 1: SELENOGRAPHIC POSITION */}
      <div className="telemetry-unboxed-section">
        <div className="telemetry-section-kicker">
          <Compass size={12} className="kicker-icon" />
          <span>CHANNEL 01 // SELENOGRAPHIC POSITIONING (LOLA 128PPD)</span>
        </div>
        <div className="telemetry-metrics-grid">
          <div className="telemetry-metric-item">
            <span className="mono-label">LATITUDE</span>
            <span className="mono-value is-highlight">{formatCoordinate(coordinates.latitude, 'lat')}</span>
            <span className="mono-caption">SOUTH POLAR CIRCLE</span>
          </div>

          <div className="telemetry-metric-item">
            <span className="mono-label">LONGITUDE</span>
            <span className="mono-value is-highlight">{formatCoordinate(coordinates.longitude, 'lon')}</span>
            <span className="mono-caption">PRIME MERIDIAN REF</span>
          </div>

          <div className="telemetry-metric-item">
            <span className="mono-label">ELEVATION (LOLA)</span>
            <span className="mono-value">+{coordinates.elevationMeters?.toLocaleString() ?? 4200} M</span>
            <span className="mono-caption">ABOVE LUNAR DATUM</span>
          </div>

          <div className="telemetry-metric-item">
            <span className="mono-label">EPHEMERIS OBS</span>
            <span className="mono-value">#301 (MOON REF)</span>
            <span className="mono-caption">JPL HORIZONS SYSTEM</span>
          </div>
        </div>
      </div>

      <div className="hairline-divider" />

      {/* SECTION 2: SOLAR VECTOR & IRRADIANCE */}
      <div className="telemetry-unboxed-section">
        <div className="telemetry-section-kicker">
          <Sun size={12} className="kicker-icon is-amber" />
          <span>CHANNEL 02 // SOLAR VECTOR & DIRECT IRRADIANCE (TARGET 10)</span>
          <span className={`status-pill ${sun.isIlluminated ? 'is-nominal' : 'is-warning'}`}>
            {sun.isIlluminated ? 'SURFACE ILLUMINATED' : 'TERRAIN OCCULTATION'}
          </span>
        </div>

        <div className="telemetry-metrics-grid">
          <div className="telemetry-metric-item">
            <span className="mono-label">SOLAR ELEVATION</span>
            <span className={`mono-value ${sun.elevation > 0 ? 'is-amber' : 'is-negative'}`}>
              {sun.elevation > 0 ? `+${sun.elevation}°` : `${sun.elevation}°`}
            </span>
            <span className="mono-caption">LOCAL HORIZON ANGLE</span>
          </div>

          <div className="telemetry-metric-item">
            <span className="mono-label">SOLAR AZIMUTH</span>
            <span className="mono-value">{sun.azimuth}°</span>
            <span className="mono-caption">CLOCKWISE FROM NORTH</span>
          </div>

          <div className="telemetry-metric-item">
            <span className="mono-label">TERRAIN CLEARANCE</span>
            <span className={`mono-value ${sun.clearance > 0 ? 'is-success' : 'is-danger'}`}>
              {sun.clearance > 0 ? `+${sun.clearance}°` : `${sun.clearance}°`}
            </span>
            <span className="mono-caption">
              {sun.clearance > 0 ? 'CLEAR OF CRATER RIM' : 'SHADOWED BY RIDGE'}
            </span>
          </div>

          <div className="telemetry-metric-item">
            <span className="mono-label">DIRECT SOLAR FLUX</span>
            <span className="mono-value is-highlight">{sun.directFluxW} W/m²</span>
            <span className="mono-caption">PERPENDICULAR 1 AU</span>
          </div>

          <div className="telemetry-metric-item">
            <span className="mono-label">EST. POWER (2M² ARRAY)</span>
            <span className="mono-value is-amber">{estimatedPowerWatts} W</span>
            <span className="mono-caption">29% TRIPLE-JUNCTION GaAs</span>
          </div>

          <div className="telemetry-metric-item">
            <span className="mono-label">TIME TO NEXT SUNSET</span>
            <span className="mono-value is-highlight">{formatMissionHours(sun.hoursToSunset)}</span>
            <span className="mono-caption">
              {sun.hoursToSunset > 0 ? 'REMAINING DAYLIGHT' : 'CURRENTLY OCCULTED'}
            </span>
          </div>
        </div>
      </div>

      <div className="hairline-divider" />

      {/* SECTION 3: DIRECT-TO-EARTH (DTE) TELEMETRY */}
      <div className="telemetry-unboxed-section">
        <div className="telemetry-section-kicker">
          <Radio size={12} className="kicker-icon is-periwinkle" />
          <span>CHANNEL 03 // DIRECT-TO-EARTH RF TELEMETRY (TARGET 399)</span>
          <span className={`status-pill ${earth.isVisible ? 'is-periwinkle' : 'is-danger'}`}>
            {earth.isVisible ? 'CARRIER LOCK ACTIVE' : 'NO RF LINE-OF-SIGHT'}
          </span>
        </div>

        <div className="telemetry-metrics-grid">
          <div className="telemetry-metric-item">
            <span className="mono-label">EARTH ELEVATION</span>
            <span className={`mono-value ${earth.elevation > 0 ? 'is-periwinkle' : 'is-negative'}`}>
              {earth.elevation > 0 ? `+${earth.elevation}°` : `${earth.elevation}°`}
            </span>
            <span className="mono-caption">LIBRATION WOBBLE INCLUDED</span>
          </div>

          <div className="telemetry-metric-item">
            <span className="mono-label">EARTH AZIMUTH</span>
            <span className="mono-value">{earth.azimuth}°</span>
            <span className="mono-caption">ANTENNA POINTING AZ</span>
          </div>

          <div className="telemetry-metric-item">
            <span className="mono-label">TERRAIN CLEARANCE</span>
            <span className={`mono-value ${earth.clearance > 0 ? 'is-success' : 'is-danger'}`}>
              {earth.clearance > 0 ? `+${earth.clearance}°` : `${earth.clearance}°`}
            </span>
            <span className="mono-caption">
              {earth.clearance > 0 ? 'RF BEAM UNIMPEDED' : 'OCCLUDED BY PEAK'}
            </span>
          </div>

          <div className="telemetry-metric-item">
            <span className="mono-label">CARRIER SNR (DSN)</span>
            <span className="mono-value is-highlight">{earth.carrierSnr}</span>
            <span className="mono-caption">DSN 34M/70M BEAM LOCK</span>
          </div>

          <div className="telemetry-metric-item">
            <span className="mono-label">SUB-EARTH LIBRATION</span>
            <span className="mono-value">
              {earth.librationLat > 0 ? `+${earth.librationLat}°` : `${earth.librationLat}°`} / {earth.librationLon > 0 ? `+${earth.librationLon}°` : `${earth.librationLon}°`}
            </span>
            <span className="mono-caption">LAT (DRACONIC) / LON (ANOM)</span>
          </div>

          <div className="telemetry-metric-item">
            <span className="mono-label">TIME TO EARTHSET</span>
            <span className="mono-value is-periwinkle">{formatMissionHours(earth.hoursToEarthset)}</span>
            <span className="mono-caption">
              {earth.hoursToEarthset > 200 ? 'STABLE DTE WINDOW' : 'EXPIRING WINDOW'}
            </span>
          </div>
        </div>
      </div>

      <div className="hairline-divider" />

      {/* SECTION 4: ASTRONAUT VS STUDENT CONTEXTUAL NOTES */}
      <div className="telemetry-unboxed-section telemetry-footnote-section">
        <div className="telemetry-note-box">
          <Activity size={13} className="note-icon" />
          <div className="note-content">
            <span className="note-title">
              {isAstronaut ? 'MISSION FLIGHT RULE ALERT // POLAR CRITICAL CONSTRAINTS' : 'EXPLORER INSIGHT // SOUTH POLE GEOMETRY'}
            </span>
            <p className="note-text">
              {isAstronaut
                ? 'Because lunar obliquity is only 1.54°, solar elevation remains within ±1.5° of the horizon, circling 360° every 29.53 days. Vertical solar arrays provide 40x higher collection than flat horizontal panels. Maintain minimum +0.25° terrain clearance to prevent rover cold-trap thermal collapse.'
                : 'At the Moon’s South Pole, the Sun never rises high in the sky. It slowly skims around the horizon like an endless sunrise. High crater rims can cast shadows over 50 kilometers long, while mountain peaks remain bathed in near-constant sunlight.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
