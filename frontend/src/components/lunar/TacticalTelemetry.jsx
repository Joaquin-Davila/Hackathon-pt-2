import React, { useMemo } from 'react';
import { Sun, Radio, Activity, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatMissionHours } from '../../services/ephemerisEngine.js';
import {
  evaluateMissionFeasibility,
  generateSmartWarnings,
} from '../../services/recommendationEngine.js';

const TacticalTelemetry = React.memo(function TacticalTelemetry({
  site,
  horizonProfile = [],
  hoursOffset = 0,
  telemetry,
  profile = 'astronaut',
  hideVectorAngles = false,
}) {
  if (!telemetry) return null;

  const { sun, earth } = telemetry;
  const isAstronaut = profile.toLowerCase() === 'astronaut';

  // Solar array power estimation for 2.0 m^2 29% triple-junction cells
  const solarPanelArea = 2.0; // m^2
  const cellEfficiency = 0.29; // 29% efficiency
  const estimatedPowerWatts = (sun.directFluxW * solarPanelArea * cellEfficiency).toFixed(1);

  // Compute consolidated smart warnings for the bottom of ExplorerMode
  const smartWarnings = useMemo(() => {
    if (!site) return [];
    const assessment = evaluateMissionFeasibility(site, horizonProfile, hoursOffset);
    return generateSmartWarnings(assessment);
  }, [site, horizonProfile, hoursOffset]);

  return (
    <div className="tactical-hud-panel" aria-label="Tactical Ephemeris Telemetry Stream">
      {/* SECTION 1: SOLAR VECTOR & IRRADIANCE */}
      <div className="telemetry-unboxed-section">
        <div className="telemetry-section-kicker">
          <Sun size={12} className="kicker-icon is-amber" />
          <span>CHANNEL 01 // SOLAR IRRADIANCE & POWER GENERATION (TARGET 10)</span>
        </div>

        <div className="telemetry-metrics-grid">
          {!hideVectorAngles && (
            <>
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
            </>
          )}

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

      {/* SECTION 2: DIRECT-TO-EARTH (DTE) TELEMETRY */}
      <div className="telemetry-unboxed-section">
        <div className="telemetry-section-kicker">
          <Radio size={12} className="kicker-icon is-periwinkle" />
          <span>CHANNEL 02 // DIRECT-TO-EARTH RF LINK BUDGET (TARGET 399)</span>
        </div>

        <div className="telemetry-metrics-grid">
          {!hideVectorAngles && (
            <>
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
            </>
          )}

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

      {/* SECTION 3: SINGLE CONSOLIDATED ALERTS & FLIGHT RULES SECTION AT THE END */}
      <div className="telemetry-unboxed-section telemetry-footnote-section">
        <div className="telemetry-section-kicker">
          <ShieldAlert size={13} className="kicker-icon" />
          <span>CHANNEL 03 // CONSOLIDATED OPERATIONAL ALERTS & FLIGHT RULES</span>
        </div>

        <div className="smart-warnings-stack">
          {smartWarnings.length > 0 ? (
            smartWarnings.map((warn) => {
              const isCritical = warn.level === 'CRITICAL';
              const statusEmoji = isCritical ? '🛑' : '⚠️';
              return (
                <div
                  key={warn.id}
                  className={`smart-warning-callout is-${warn.level.toLowerCase()}`}
                  role="alert"
                >
                  <div className="warning-icon-col">
                    <span className="warning-emoji" aria-hidden="true">
                      {statusEmoji}
                    </span>
                    {isCritical ? (
                      <ShieldAlert size={18} className="warn-icon is-critical" />
                    ) : (
                      <AlertTriangle size={18} className={`warn-icon is-${warn.level.toLowerCase()}`} />
                    )}
                  </div>
                  <div className="warning-body-col">
                    <div className="warning-head-row">
                      <span className={`warning-level-tag is-${warn.level.toLowerCase()}`}>
                        {statusEmoji} {warn.level}
                      </span>
                      <strong className="warning-title-text">{warn.title}</strong>
                    </div>
                    <p className="warning-detail-text">{warn.message || warn.detail}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="smart-warning-callout is-nominal" role="status">
              <div className="warning-icon-col">
                <span className="warning-emoji" aria-hidden="true">✅</span>
                <CheckCircle2 size={18} className="warn-icon is-nominal" />
              </div>
              <div className="warning-body-col">
                <div className="warning-head-row">
                  <span className="warning-level-tag is-nominal">✅ NOMINAL</span>
                  <strong className="warning-title-text">
                    All Solar & Direct-to-Earth (DTE) Flight Rules Satisfied
                  </strong>
                </div>
                <p className="warning-detail-text">
                  Unobstructed solar array illumination and continuous Earth RF line-of-sight confirmed for the active selenographic epoch.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="telemetry-note-box">
          <Activity size={15} className="note-icon" />
          <div className="note-content">
            <span className="note-title">
              {isAstronaut ? 'POLAR ORBITAL GEOMETRY // REFERENCE NOTE' : 'EXPLORER INSIGHT // SOUTH POLE GEOMETRY'}
            </span>
            <p className="note-text">
              {isAstronaut
                ? 'Lunar obliquity is 1.54°: solar elevation remains within ±1.5° of the horizon over each 29.53-day synodic cycle. Vertical solar arrays provide 40x higher collection than horizontal panels.'
                : 'At the Moon’s South Pole, the Sun skims slowly around the horizon like an endless sunrise while mountain peaks stay bathed in near-constant sunlight.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default TacticalTelemetry;
