import React from 'react';
import { Layers, Check, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { CANDIDATE_SITES_CATALOG } from '../../services/horizonsService.js';
import { formatMissionHours } from '../../services/ephemerisEngine.js';

export default function SiteOverlaySelector({
  primarySite,
  overlaySiteId,
  onSelectOverlaySite,
  primaryTelemetry,
  overlayTelemetry,
}) {
  const currentPrimaryId = primarySite?.id ?? primarySite?.siteId ?? 'shackleton-rim';

  // Alternative candidate sites excluding the current primary
  const availableAlternatives = CANDIDATE_SITES_CATALOG.filter(
    (site) => site.id !== currentPrimaryId && site.defaultHorizon !== currentPrimaryId
  );

  // Compute comparative deltas if overlay is active
  let deltaSunClearance = null;
  let deltaSunElevation = null;
  let deltaEarthClearance = null;
  let deltaSunsetHours = null;

  if (primaryTelemetry && overlayTelemetry) {
    deltaSunClearance = (overlayTelemetry.sun.clearance - primaryTelemetry.sun.clearance).toFixed(2);
    deltaSunElevation = (overlayTelemetry.sun.elevation - primaryTelemetry.sun.elevation).toFixed(2);
    deltaEarthClearance = (overlayTelemetry.earth.clearance - primaryTelemetry.earth.clearance).toFixed(2);
    deltaSunsetHours = (overlayTelemetry.sun.hoursToSunset - primaryTelemetry.sun.hoursToSunset).toFixed(1);
  }

  return (
    <div className="site-overlay-toolbar" aria-label="Rapid Landing Site Overlay & Comparison">
      <div className="overlay-toolbar-header">
        <div className="overlay-kicker">
          <Layers size={12} className="overlay-icon" />
          <span>RAPID SITE OVERLAY COMPARISON // CONTINGENCY BACKUP ZONES</span>
        </div>

        {/* Candidate Site Selector Pills */}
        <div className="overlay-candidates-list" role="group" aria-label="Select Alternative Site Overlay">
          <button
            type="button"
            className={`overlay-pill-btn ${!overlaySiteId ? 'is-active' : ''}`}
            onClick={() => onSelectOverlaySite(null)}
          >
            NONE (SOLO)
          </button>

          {availableAlternatives.map((site) => {
            const isSelected = overlaySiteId === site.id;
            return (
              <button
                key={site.id}
                type="button"
                className={`overlay-pill-btn ${isSelected ? 'is-active is-overlay-selected' : ''}`}
                onClick={() => onSelectOverlaySite(isSelected ? null : site.id)}
              >
                {isSelected && <Check size={11} className="pill-check" />}
                <span>{site.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparative Delta Strip when an overlay site is active */}
      {overlayTelemetry && (
        <div className="overlay-comparison-strip">
          <div className="comparison-metric">
            <span className="comp-label">Δ SOLAR CLEARANCE</span>
            <span className={`comp-val ${Number(deltaSunClearance) >= 0 ? 'is-positive' : 'is-negative'}`}>
              {Number(deltaSunClearance) >= 0 ? `+${deltaSunClearance}°` : `${deltaSunClearance}°`}
            </span>
            <span className="comp-caption">VS {primarySite.name}</span>
          </div>

          <div className="comparison-metric">
            <span className="comp-label">Δ DTE RF CLEARANCE</span>
            <span className={`comp-val ${Number(deltaEarthClearance) >= 0 ? 'is-positive' : 'is-negative'}`}>
              {Number(deltaEarthClearance) >= 0 ? `+${deltaEarthClearance}°` : `${deltaEarthClearance}°`}
            </span>
            <span className="comp-caption">EARTH LINE-OF-SIGHT</span>
          </div>

          <div className="comparison-metric">
            <span className="comp-label">Δ DAYLIGHT WINDOW</span>
            <span className={`comp-val ${Number(deltaSunsetHours) >= 0 ? 'is-positive' : 'is-negative'}`}>
              {Number(deltaSunsetHours) >= 0 ? `+${deltaSunsetHours}h` : `${deltaSunsetHours}h`}
            </span>
            <span className="comp-caption">HOURS TO NEXT SUNSET</span>
          </div>

          <div className="comparison-metric is-verdict">
            <span className="comp-label">BACKUP SITE VERDICT</span>
            <span className="comp-val is-highlight">
              {overlayTelemetry.sun.isIlluminated && overlayTelemetry.earth.isVisible
                ? 'VIABLE CONTINGENCY'
                : 'MARGINAL CONSTRAINTS'}
            </span>
            <span className="comp-caption">
              {overlayTelemetry.earth.isVisible ? 'DIRECT DTE COMM LOCKED' : 'OCCASIONAL DTE DIP'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
