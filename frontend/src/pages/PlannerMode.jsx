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
import { DEFAULT_MISSION_EPOCH } from '../services/ephemerisEngine.js';
import '../styles/planner.css';

const DEFAULT_SITE = {
  id: 'haworth-rim',
  siteId: 'haworth',
  name: 'Haworth Crater Rim (PSR Margin)',
  lat: -87.4,
  lon: -5.1,
  elevation: 2150,
};

export default function PlannerMode({
  site = null,
  onBack,
  onNavigateToStreetView,
}) {
  const [activeSite, setActiveSite] = useState(site || DEFAULT_SITE);
  const [customOpen, setCustomOpen] = useState(false);
  const [horizonProfile, setHorizonProfile] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [durationHours, setDurationHours] = useState(336); // 14-day exploration window

  // Form inputs for custom coordinates
  const [customLat, setCustomLat] = useState(activeSite.lat ?? -87.4);
  const [customLon, setCustomLon] = useState(activeSite.lon ?? -5.1);
  const [customElev, setCustomElev] = useState(activeSite.elevation ?? 2150);

  // Fetch LOLA profile whenever active site changes
  useEffect(() => {
    let cancelled = false;
    const lookupId = activeSite.horizonId ?? activeSite.siteId ?? String(activeSite.id ?? '').replace(/-rim$/, '');
    setLoadingProfile(true);

    getHorizonData(lookupId).then((data) => {
      if (!cancelled) {
        setHorizonProfile(data?.horizonProfile ?? []);
        setLoadingProfile(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeSite]);

  // Run Real-Time Feasibility Evaluation
  const evaluation = useMemo(() => {
    return evaluateMissionFeasibility(activeSite, horizonProfile, 0, durationHours);
  }, [activeSite, horizonProfile, durationHours]);

  // Generate Automated Smart Warnings
  const smartWarnings = useMemo(() => {
    return generateSmartWarnings(evaluation);
  }, [evaluation]);

  // Generate Spatial AI Ridge & Route Recommendation
  const recommendation = useMemo(() => {
    return recommendOptimalAlternative(activeSite, horizonProfile, 0, durationHours);
  }, [activeSite, horizonProfile, durationHours]);

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
        name: `Target (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
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
          <p className="planner-subhead">
            Real-time multi-day surface assessment combining NASA LOLA GDR 128PPD elevation profiles and JPL Horizons orbital vectors (Sun 10, Earth 399). Evaluates continuous illumination windows, DTE link margins, and generates automated ridge bypass recommendations.
          </p>
        </div>
      </header>

      {/* 2. Interactive Site & Coordinate Selector Strip */}
      <div className="planner-site-selector-strip">
        <div className="planner-site-tabs" role="group" aria-label="Select Target Location">
          {CANDIDATE_SITES_CATALOG.map((catSite) => {
            const isSelected = activeSite.id === catSite.id || activeSite.siteId === catSite.siteId;
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

      {/* 3. Operational Feasibility Assessment Gauge (Unboxed Monospace) */}
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
            {evaluation.verdictLabel} · RISK {evaluation.riskScore}/100
          </span>
        </div>

        <div className="feasibility-metric-col">
          <span className="feasibility-metric-label">CUMULATIVE SOLAR ILLUMINATION</span>
          <span className={`feasibility-metric-value ${evaluation.metrics.solarIlluminationPct >= 70 ? 'green' : evaluation.metrics.solarIlluminationPct >= 40 ? 'amber' : 'red'}`}>
            {evaluation.metrics.solarIlluminationPct}%
          </span>
          <span className="feasibility-metric-subtext">
            MAX CONTINUOUS WINDOW: <b>{evaluation.metrics.maxContinuousSunHours}H</b> ({Math.round(evaluation.metrics.maxContinuousSunHours / 24)}d)
          </span>
        </div>

        <div className="feasibility-metric-col">
          <span className="feasibility-metric-label">DIRECT-TO-EARTH (DTE) UPTIME</span>
          <span className={`feasibility-metric-value ${evaluation.metrics.dteUptimePct >= 75 ? 'cyan' : evaluation.metrics.dteUptimePct >= 40 ? 'amber' : 'red'}`}>
            {evaluation.metrics.dteUptimePct}%
          </span>
          <span className="feasibility-metric-subtext">
            MAX CONTINUOUS LINK: <b>{evaluation.metrics.maxContinuousDteHours}H</b> · S-BAND LOS
          </span>
        </div>

        <div className="feasibility-metric-col">
          <span className="feasibility-metric-label">SOLAR CLEARANCE MARGIN</span>
          <span className={`feasibility-metric-value ${evaluation.metrics.currentSunClearance > 0 ? 'green' : 'red'}`}>
            {evaluation.metrics.currentSunClearance >= 0 ? `+${evaluation.metrics.currentSunClearance}°` : `${evaluation.metrics.currentSunClearance}°`}
          </span>
          <span className="feasibility-metric-subtext">
            LOLA CREST ELEV: {evaluation.metrics.minSolarElevation}° MIN / {evaluation.metrics.maxSolarElevation}° MAX
          </span>
        </div>
      </section>

      {/* 4. Smart Warnings & Obstruction Alerts */}
      {smartWarnings.length > 0 && (
        <section className="smart-warnings-stack" aria-label="Operational Hazard Warnings">
          {smartWarnings.map((warn) => (
            <div
              key={warn.id}
              className={`smart-warning-banner level-${warn.level.toLowerCase()}`}
              role="alert"
            >
              <div className="warning-icon-box">
                {warn.level === 'CRITICAL' ? (
                  <ShieldAlert size={20} />
                ) : warn.id === 'DTE_RF_BLACKOUT' ? (
                  <WifiOff size={20} />
                ) : (
                  <AlertTriangle size={20} />
                )}
              </div>
              <div className="warning-content">
                <span className="warning-title">{warn.title}</span>
                <span className="warning-message">{warn.message}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 5. Spatial AI Route & Alternative Site Recommendation (Hero Callout) */}
      {recommendation && (
        <section className="recommendation-callout-hero" aria-label="AI Recommended Ridge & Route">
          <div className="rec-kicker-row">
            <span className="rec-badge-tag">
              <Sparkles size={13} />
              <span>SPATIAL AI RECOMMENDATION // OPTIMAL RIDGE RELOCATION</span>
            </span>
            <span className="rec-utility-score">
              SPATIAL UTILITY: <b>{recommendation.utilityScore} / 100</b>
            </span>
          </div>

          <div className="rec-headline-row">
            <div className="rec-title-col">
              <h2 className="rec-target-name">
                Recommended Target: {recommendation.recommendedSite.name}
              </h2>
              <p className="rec-rationale">
                {recommendation.rationale}
              </p>
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
              <span className="delta-val">{recommendation.bearing}° AZIMUTH</span>
            </div>
            <div className="delta-metric-item">
              <span className="delta-label">SOLAR ILLUMINATION GAIN:</span>
              <span className="delta-val positive">+{recommendation.deltaSunPct}%</span>
            </div>
            <div className="delta-metric-item">
              <span className="delta-label">CONTINUOUS POWER WINDOW GAIN:</span>
              <span className="delta-val positive">+{recommendation.deltaSunHours} HOURS</span>
            </div>
            <div className="delta-metric-item">
              <span className="delta-label">ELEVATION GAIN:</span>
              <span className="delta-val">
                {recommendation.deltaElev >= 0 ? `+${recommendation.deltaElev.toLocaleString()} M` : `${recommendation.deltaElev.toLocaleString()} M`}
              </span>
            </div>
          </div>

          {/* 3-Waypoint Traverse Route */}
          <div className="waypoints-route-block">
            <span className="waypoints-header">
              PROPOSED 3-WAYPOINT SURFACE TRAVERSE ROUTE (LOLA DIGITAL ELEVATION MODEL):
            </span>
            <div className="waypoint-steps-row">
              {recommendation.waypoints.map((wp) => (
                <div key={wp.id} className="waypoint-card">
                  <div className="waypoint-id-row">
                    <span className="waypoint-id">{wp.id}</span>
                    <span className="waypoint-role">{wp.role}</span>
                  </div>
                  <span className="waypoint-name">{wp.label}</span>
                  <div className="waypoint-details">
                    <span>{Math.abs(wp.lat).toFixed(3)}°S, {Math.abs(wp.lon).toFixed(3)}°{wp.lon < 0 ? 'W' : 'E'}</span>
                    <span>+{wp.elevation.toLocaleString()}M</span>
                    <span>+{wp.cumulativeKm} km</span>
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
              <span>EXPLORE TRAVERSE IN 3D STREET VIEW</span>
            </button>
          </div>
        </section>
      )}

      {/* 6. Schedule Slippage & Launch Delay Matrix */}
      <section className="slippage-matrix-section" aria-label="Schedule Slippage Contingency Analysis">
        <span className="slippage-section-title">
          SCHEDULE SLIPPAGE CONTINGENCY MATRIX (+0D, +3D, +7D, +14D LAUNCH DELAY PROPAGATION):
        </span>
        <div className="slippage-cards-grid">
          {slippageMatrix.map((slip) => {
            const illum = slip.evaluation.metrics.solarIlluminationPct;
            const dte = slip.evaluation.metrics.dteUptimePct;
            const isViable = slip.isViable;

            return (
              <div
                key={slip.label}
                className={`slippage-card ${isViable ? 'is-viable' : 'is-hazard'}`}
              >
                <div className="slip-header-row">
                  <span className="slip-label">{slip.label}</span>
                  <span className={`slip-tag ${isViable ? 'viable' : 'hazard'}`}>
                    {isViable ? 'VIABLE' : 'HAZARD'}
                  </span>
                </div>

                <div className="slip-stats-row">
                  <span className="slip-stat-label">SOLAR ILLUM:</span>
                  <span className={`slip-stat-val ${illum >= 50 ? 'positive' : 'negative'}`}>
                    {illum}%
                  </span>
                </div>
                <div className="slip-stats-row">
                  <span className="slip-stat-label">SUN WINDOW:</span>
                  <span className="slip-stat-val">
                    {slip.evaluation.metrics.maxContinuousSunHours}H
                  </span>
                </div>
                <div className="slip-stats-row">
                  <span className="slip-stat-label">DTE UPTIME:</span>
                  <span className={`slip-stat-val ${dte >= 50 ? 'positive' : 'negative'}`}>
                    {dte}%
                  </span>
                </div>
                <div className="slip-stats-row">
                  <span className="slip-stat-label">STATUS:</span>
                  <span className="slip-stat-val">
                    {slip.evaluation.verdict}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
