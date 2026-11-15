import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Route,
  ShieldAlert,
  AlertTriangle,
  Radio,
  WifiOff,
  Sun,
  Globe,
  Compass,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Sliders,
  MapPin,
  Eye,
  RefreshCw,
  Activity,
} from 'lucide-react';

import {
  evaluateMissionFeasibility,
  generateSmartWarnings,
  recommendOptimalAlternative,
  evaluateScheduleSlippageMatrix,
} from '../services/recommendationEngine.js';

import { getHorizonData, CANDIDATE_SITES_CATALOG } from '../services/horizonsService.js';
import '../styles/planner.css';

const DEFAULT_SITE = {
  id: 'haworth-rim',
  siteId: 'haworth',
  name: 'Haworth Crater Rim (PSR Margin)',
  lat: -87.4,
  lon: -5.1,
  elevation: 2150,
};

const PSR_HAZARD_SITE = {
  id: 'shackleton-psr',
  siteId: 'shackleton-psr',
  name: 'Shackleton Interior PSR (Shadow Floor)',
  lat: -89.9,
  lon: 0.0,
  elevation: -1400,
};

export default function PlannerMode({
  site = null,
  onBack,
  onNavigateToStreetView,
}) {
  const [activeSite, setActiveSite] = useState(site || DEFAULT_SITE);
  const [customOpen, setCustomOpen] = useState(false);
  const [horizonProfile, setHorizonProfile] = useState([]);
  const [hoursOffset, setHoursOffset] = useState(0); // Launch delay / schedule offset in hours
  const [durationHours] = useState(336); // 14-day exploration window

  // Form inputs for custom coordinates
  const [customLat, setCustomLat] = useState(activeSite.lat ?? -87.4);
  const [customLon, setCustomLon] = useState(activeSite.lon ?? -5.1);
  const [customElev, setCustomElev] = useState(activeSite.elevation ?? 2150);

  useEffect(() => {
    if (site) {
      setActiveSite(site);
    }
  }, [site]);

  // Fetch LOLA profile whenever active site changes (including dynamic latitude-based profile for custom coordinates)
  useEffect(() => {
    let cancelled = false;
    const lookupId = activeSite.horizonId ?? activeSite.siteId ?? String(activeSite.id ?? '').replace(/-rim$/, '');

    getHorizonData(lookupId, activeSite).then((data) => {
      if (!cancelled) {
        setHorizonProfile(data?.horizonProfile ?? []);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeSite]);

  // Run Real-Time Feasibility Evaluation (incorporating launch delay hoursOffset)
  const evaluation = useMemo(() => {
    return evaluateMissionFeasibility(activeSite, horizonProfile, hoursOffset, durationHours);
  }, [activeSite, horizonProfile, hoursOffset, durationHours]);

  // Generate Automated Smart Warnings (consolidated at the bottom)
  const smartWarnings = useMemo(() => {
    return generateSmartWarnings(evaluation);
  }, [evaluation]);

  // Generate Spatial AI Ridge & Route Recommendation
  const recommendation = useMemo(() => {
    return recommendOptimalAlternative(activeSite, horizonProfile, hoursOffset, durationHours);
  }, [activeSite, horizonProfile, hoursOffset, durationHours]);

  // Evaluate Schedule Slippage Contingency Matrix (+0d, +3d, +7d, +14d)
  const slippageMatrix = useMemo(() => {
    return evaluateScheduleSlippageMatrix(activeSite, horizonProfile, durationHours);
  }, [activeSite, horizonProfile, durationHours]);

  const handleApplyCustomCoords = (e) => {
    e.preventDefault();
    const lat = Number(customLat);
    const lon = Number(customLon);
    const elev = Number(customElev);

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      setActiveSite({
        id: 'custom-coords',
        siteId: 'custom',
        name: `Custom Target`,
        lat,
        lon,
        elevation: elev || 2000,
      });
      setCustomOpen(false);
    }
  };

  const handleAdoptRecommendation = () => {
    if (recommendation?.recommendedSite) {
      setActiveSite(recommendation.recommendedSite);
    }
  };

  return (
    <div className="planner-command-shell" aria-labelledby="planner-main-title">
      {/* 1. Top Navigation & Mission Heading */}
      <header className="planner-editorial-header">
        <div className="planner-top-nav">
          <button className="minimal-back-btn" type="button" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>MISSION CONTROL // RETURN</span>
          </button>

          <div className="profile-indicator-tag">
            <span className="tag-pulse" />
            <span>AI MISSION PLANNER · SPATIAL FEASIBILITY & HAZARD MITIGATION</span>
          </div>
        </div>

        <div className="planner-editorial-title-row">
          <div className="planner-kicker">
            <span>NASA ARTEMIS SOUTH POLE // INTELLIGENT SITE & ROUTE RECOMMENDATION</span>
          </div>
          <h1 id="planner-main-title" className="planner-headline">
            Mission Feasibility & Route Optimization
          </h1>
        </div>
      </header>

      {/* 2. Interactive Site & Coordinate Selector Strip */}
      <div className="planner-site-selector-strip">
        <div className="planner-site-tabs" role="group" aria-label="Select Target Location">
          {CANDIDATE_SITES_CATALOG.map((catSite) => {
            const isSelected =
              activeSite.id === catSite.id ||
              (Boolean(activeSite.siteId) && (activeSite.siteId === catSite.id || activeSite.siteId === catSite.defaultHorizon));
            return (
              <button
                key={catSite.id}
                type="button"
                className={`site-tab-pill ${isSelected ? 'is-active' : ''}`}
                onClick={() => setActiveSite(catSite)}
              >
                {catSite.name}
              </button>
            );
          })}
          <button
            type="button"
            className={`site-tab-pill is-psr-test ${activeSite.id === PSR_HAZARD_SITE.id ? 'is-active' : ''}`}
            onClick={() => setActiveSite(PSR_HAZARD_SITE)}
            title="Test deep Permanently Shadowed Region (0% Solar Window)"
          >
            Shackleton Floor (PSR)
          </button>
        </div>

        <button
          type="button"
          className="custom-coord-toggle"
          onClick={() => setCustomOpen(!customOpen)}
        >
          <MapPin size={13} />
          <span>{customOpen ? 'CLOSE COORDINATES' : '+ CUSTOM LAT/LON'}</span>
        </button>
      </div>

      {/* Custom Coordinates Drawer */}
      {customOpen && (
        <form className="custom-coords-drawer" onSubmit={handleApplyCustomCoords}>
          <label className="coord-input-label">
            <span>LATITUDE (-90° to 90°)</span>
            <input
              type="number"
              step="any"
              min="-90"
              max="90"
              value={customLat}
              onChange={(e) => setCustomLat(e.target.value)}
              required
            />
          </label>
          <label className="coord-input-label">
            <span>LONGITUDE (-180° to 180°)</span>
            <input
              type="number"
              step="any"
              min="-180"
              max="180"
              value={customLon}
              onChange={(e) => setCustomLon(e.target.value)}
              required
            />
          </label>
          <label className="coord-input-label">
            <span>ELEVATION (METERS)</span>
            <input
              type="number"
              step="any"
              value={customElev}
              onChange={(e) => setCustomElev(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="coord-apply-btn">
            RUN ASSESSMENT
          </button>
        </form>
      )}

      {/* 3. Operational Feasibility Assessment Gauge (Each Core Metric Shown Once) */}
      <section className="feasibility-evaluation-strip" aria-label="Target Feasibility Metrics">
        <div className="feasibility-metric-col">
          <span className="feasibility-metric-label">FEASIBILITY VERDICT</span>
          <span
            className="feasibility-metric-value"
            style={{ color: evaluation.verdictColor }}
          >
            {evaluation.verdict}
          </span>
          <span className="feasibility-metric-subtext">
            RISK INDEX: {evaluation.riskScore}/100
          </span>
        </div>

        <div className="feasibility-metric-col">
          <span className="feasibility-metric-label">CUMULATIVE SOLAR ILLUMINATION</span>
          <span className={`feasibility-metric-value ${evaluation.metrics.solarIlluminationPct >= 70 ? 'green' : evaluation.metrics.solarIlluminationPct >= 40 ? 'amber' : 'red'}`}>
            {evaluation.metrics.solarIlluminationPct}%
          </span>
          <span className="feasibility-metric-subtext">
            MAX CONTINUOUS WINDOW: <b>{evaluation.metrics.maxContinuousSunHours}H</b>
          </span>
        </div>

        <div className="feasibility-metric-col">
          <span className="feasibility-metric-label">DIRECT-TO-EARTH (DTE) UPTIME</span>
          <span className={`feasibility-metric-value ${evaluation.metrics.dteUptimePct >= 75 ? 'cyan' : evaluation.metrics.dteUptimePct >= 40 ? 'amber' : 'red'}`}>
            {evaluation.metrics.dteUptimePct}%
          </span>
          <span className="feasibility-metric-subtext">
            MAX CONTINUOUS LINK: <b>{evaluation.metrics.maxContinuousDteHours}H</b>
          </span>
        </div>

        <div className="feasibility-metric-col">
          <span className="feasibility-metric-label">SOLAR CLEARANCE MARGIN</span>
          <span className={`feasibility-metric-value ${evaluation.metrics.currentSunClearance > 0 ? 'green' : 'red'}`}>
            {evaluation.metrics.currentSunClearance >= 0 ? `+${evaluation.metrics.currentSunClearance}°` : `${evaluation.metrics.currentSunClearance}°`}
          </span>
          <span className="feasibility-metric-subtext">
            TARGET COORDS: {Math.abs(evaluation.coordinates.lat).toFixed(2)}°S, {Math.abs(evaluation.coordinates.lon).toFixed(2)}°{evaluation.coordinates.lon < 0 ? 'W' : 'E'} ({evaluation.coordinates.elevation >= 0 ? `+${evaluation.coordinates.elevation}M` : `${evaluation.coordinates.elevation}M`})
          </span>
        </div>
      </section>

      {/* 4. Spatial AI Route & Alternative Site Recommendation */}
      {recommendation && (
        <section className="recommendation-callout-hero" aria-label="AI Recommended Ridge & Route">
          <div className="rec-kicker-row">
            <span className="rec-badge-tag">
              <Sparkles size={13} />
              <span>SPATIAL AI RECOMMENDATION // OPTIMAL RIDGE RELOCATION</span>
            </span>
            <span className="rec-utility-score">
              UTILITY SCORE: <b>{recommendation.utilityScore} / 100</b>
            </span>
          </div>

          <div className="rec-headline-row">
            <div className="rec-title-col">
              <h2 className="rec-target-name">
                Recommended Backup Ridge: {recommendation.recommendedSite.name}
              </h2>
            </div>
          </div>

          {/* Operational Delta Gains */}
          <div className="rec-delta-metrics-grid">
            <div className="delta-metric-item">
              <span className="delta-label">TRAVERSE DISTANCE:</span>
              <span className="delta-val">{recommendation.distKm} KM</span>
            </div>
            <div className="delta-metric-item">
              <span className="delta-label">INITIAL BEARING:</span>
              <span className="delta-val">{recommendation.bearing}° AZ</span>
            </div>
            <div className="delta-metric-item">
              <span className="delta-label">SOLAR ILLUMINATION GAIN:</span>
              <span className="delta-val positive">
                {recommendation.deltaSunPct >= 0 ? `+${recommendation.deltaSunPct}%` : `${recommendation.deltaSunPct}%`}
              </span>
            </div>
            <div className="delta-metric-item">
              <span className="delta-label">ELEVATION DELTA:</span>
              <span className="delta-val">
                {recommendation.deltaElev >= 0 ? `+${recommendation.deltaElev.toLocaleString()} M` : `${recommendation.deltaElev.toLocaleString()} M`}
              </span>
            </div>
          </div>

          {/* 3-Waypoint Traverse Route with Minimalist Callout Lines */}
          <div className="waypoints-route-block">
            <span className="waypoints-header">
              3-WAYPOINT SURFACE TRAVERSE VECTOR (LOLA DEM):
            </span>
            <svg className="waypoints-callout-line-svg" viewBox="0 0 900 22" preserveAspectRatio="none" aria-hidden="true">
              <line x1="12" y1="11" x2="888" y2="11" stroke="rgba(92, 225, 230, 0.35)" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="12" cy="11" r="4" fill="#ff3b30" />
              <circle cx="450" cy="11" r="4" fill="#ffb14a" />
              <circle cx="888" cy="11" r="5" fill="#5ce1e6" />
            </svg>
            <div className="waypoint-steps-row">
              {recommendation.waypoints.map((wp) => (
                <div key={wp.id} className="waypoint-card">
                  <div className="waypoint-id-row">
                    <span className="waypoint-id">{wp.id}</span>
                    <span className="waypoint-role">{wp.role}</span>
                  </div>
                  <span className="waypoint-name">{wp.label}</span>
                  <div className="waypoint-details">
                    <span>SLOPE {wp.slopeDeg}°</span>
                    <span>DIST +{wp.cumulativeKm} KM</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="rec-actions-row">
            <button
              type="button"
              className="apply-recommendation-btn"
              onClick={handleAdoptRecommendation}
            >
              <CheckCircle2 size={14} />
              <span>ADOPT RECOMMENDED RIDGE</span>
            </button>
            <button
              type="button"
              className="view-in-streetview-btn"
              onClick={() => onNavigateToStreetView?.(recommendation.recommendedSite)}
            >
              <Eye size={14} />
              <span>EXPLORE IN 3D STREET VIEW</span>
            </button>
          </div>
        </section>
      )}

      {/* 5. Schedule Slippage & Launch Delay Contingency Selector (+0d, +3d, +7d, +14d) */}
      <section className="slippage-matrix-section" aria-label="Schedule Slippage Contingency Analysis">
        <span className="slippage-section-title">
          LAUNCH DELAY CONTINGENCY SIMULATOR — CLICK SCENARIO TO RECALCULATE (+0D, +3D, +7D, +14D):
        </span>
        <div className="slippage-cards-grid">
          {slippageMatrix.map((slip) => {
            const illum = slip.evaluation.metrics.solarIlluminationPct;
            const dte = slip.evaluation.metrics.dteUptimePct;
            const isViable = slip.isViable;
            const isSelectedDelay = Math.abs(hoursOffset - slip.hours) < 1;

            return (
              <div
                key={slip.label}
                className={`slippage-card ${isViable ? 'is-viable' : 'is-hazard'} ${isSelectedDelay ? 'is-selected-delay' : ''}`}
                onClick={() => setHoursOffset(slip.hours)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setHoursOffset(slip.hours); }}
              >
                <div className="slip-header-row">
                  <span className="slip-label">{slip.label}</span>
                  {isSelectedDelay && <span className="slip-tag viable">ACTIVE</span>}
                </div>

                <div className="slip-stats-row">
                  <span className="slip-stat-label">SOLAR ILLUM:</span>
                  <span className={`slip-stat-val ${illum >= 55 ? 'positive' : 'negative'}`}>
                    {illum}%
                  </span>
                </div>
                <div className="slip-stats-row">
                  <span className="slip-stat-label">MAX SUN WINDOW:</span>
                  <span className="slip-stat-val">
                    {slip.evaluation.metrics.maxContinuousSunHours}H
                  </span>
                </div>
                <div className="slip-stats-row">
                  <span className="slip-stat-label">DTE UPTIME:</span>
                  <span className={`slip-stat-val ${dte >= 55 ? 'positive' : 'negative'}`}>
                    {dte}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Single Consolidated Operational Alerts Section at the End */}
      <section className="smart-warnings-stack" aria-label="Consolidated Operational Alerts">
        <span className="slippage-section-title">
          CONSOLIDATED OPERATIONAL ALERTS & FLIGHT RULES:
        </span>
        {smartWarnings.length > 0 ? (
          smartWarnings.map((warn) => {
            const isCritical = warn.level === 'CRITICAL';
            const statusEmoji = isCritical ? '🛑' : '⚠️';
            return (
              <div
                key={warn.id}
                className={`smart-warning-banner level-${warn.level.toLowerCase()}`}
                role="alert"
              >
                <div className="warning-icon-box">
                  <span className="warning-emoji" aria-hidden="true">
                    {statusEmoji}
                  </span>
                  {isCritical ? (
                    <ShieldAlert size={18} />
                  ) : warn.id === 'DTE_RF_BLACKOUT' ? (
                    <WifiOff size={18} />
                  ) : (
                    <AlertTriangle size={18} />
                  )}
                </div>
                <div className="warning-content">
                  <div className="warning-header-badges">
                    <span className={`warning-level-pill level-${warn.level.toLowerCase()}`}>
                      {statusEmoji} {warn.level}
                    </span>
                    <span className="warning-title">{warn.title}</span>
                  </div>
                  <span className="warning-message">{warn.message}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="smart-warning-banner level-nominal" role="status">
            <div className="warning-icon-box">
              <span className="warning-emoji" aria-hidden="true">✅</span>
              <CheckCircle2 size={18} />
            </div>
            <div className="warning-content">
              <div className="warning-header-badges">
                <span className="warning-level-pill level-nominal">✅ NOMINAL</span>
                <span className="warning-title">
                  All Mission Illumination & Direct-to-Earth (DTE) Flight Rules Satisfied
                </span>
              </div>
              <span className="warning-message">
                Selected coordinates maintain safe solar generation and continuous Earth RF link margins across the 14-day surface window.
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
