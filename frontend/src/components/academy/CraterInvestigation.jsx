import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Mountain,
  Sun,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import QuickmapTerrainView from '../lunar/QuickmapTerrainView.jsx';
import { CANDIDATE_SITES_CATALOG, getHorizonData } from '../../services/horizonsService.js';
import { evaluateMissionFeasibility } from '../../services/recommendationEngine.js';
import { evaluateSiteTelemetry } from '../../services/ephemerisEngine.js';

// Additional extreme investigation site (Shackleton PSR Floor) so cadets can investigate both ridges & crater traps
const INVESTIGATION_SITES = [
  ...CANDIDATE_SITES_CATALOG.map((s, idx) => ({
    ...s,
    slopeDeg: [4.2, 3.6, 8.4, 7.1, 5.2][idx] || 4.8,
    craterProximity: [
      '0.4 km from Shackleton PSR Rim (High Ice Access)',
      '1.2 km Saddle between Shackleton & De Gerlache',
      'Elevated Massif Peak (42 km from Pole)',
      'Margin of Haworth Cryogenic Cold Trap',
      'Nobile Rim Highland Terrace',
    ][idx] || 'Polar Ridge Zone',
    obstacleRisk: ['LOW ( Smooth Ridge Crest )', 'LOW ( Wide Saddle )', 'MODERATE ( Steep Flanks )', 'HIGH ( Rim Boulders & Shadow )', 'MODERATE ( Ejecta Blocks )'][idx] || 'MODERATE',
  })),
  {
    id: 'shackleton-psr',
    siteId: 'shackleton-psr',
    name: 'Shackleton Crater Floor (PSR Interior)',
    lat: -89.9,
    lon: 0.0,
    elevation: -1400,
    slopeDeg: 14.5,
    craterProximity: 'Inside 4.2 km Deep Cryogenic Crater Bowl',
    obstacleRisk: 'CRITICAL (14.5° Wall Slope + Permanent Darkness)',
  },
];

export default function CraterInvestigation({
  completedActivities = {},
  onCompleteSiteInvestigation,
}) {
  const [selectedSite, setSelectedSite] = useState(INVESTIGATION_SITES[0]);
  const [horizonProfile, setHorizonProfile] = useState([]);
  const [userClassification, setUserClassification] = useState(null);
  const [evaluationFeedback, setEvaluationFeedback] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const lookupId = selectedSite.horizonId ?? selectedSite.siteId ?? selectedSite.id;
    getHorizonData(lookupId, selectedSite).then((data) => {
      if (!cancelled) {
        setHorizonProfile(data?.horizonProfile ?? []);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedSite]);

  const feasibility = useMemo(() => {
    return evaluateMissionFeasibility(selectedSite, horizonProfile, 0, 336);
  }, [selectedSite, horizonProfile]);

  const liveTelemetry = useMemo(() => {
    return evaluateSiteTelemetry(selectedSite, horizonProfile, 0);
  }, [selectedSite, horizonProfile]);

  const handleSelectFromMapOrList = (nextSite) => {
    const match = INVESTIGATION_SITES.find((s) => s.id === nextSite.id || s.siteId === nextSite.id);
    if (match) {
      setSelectedSite(match);
    } else {
      setSelectedSite({
        ...nextSite,
        slopeDeg: Math.abs(nextSite.lat) > 88.5 ? 4.9 : 6.4,
        craterProximity: `Custom Polar Coordinate (${Math.abs(nextSite.lat).toFixed(2)}°S)`,
        obstacleRisk: (nextSite.elevation ?? 3500) >= 3500 ? 'LOW (Elevated Highland)' : 'MODERATE (Basin Margin)',
      });
    }
    setUserClassification(null);
    setEvaluationFeedback(null);
  };

  // Determine the scientifically accurate classification based on real LOLA/Horizons feasibility metrics
  const expectedClass = useMemo(() => {
    const { solarIlluminationPct, dteUptimePct } = feasibility.metrics;
    const slope = selectedSite.slopeDeg ?? 5.0;
    if (solarIlluminationPct >= 70 && dteUptimePct >= 75 && slope <= 9.0) {
      return 'PRIME_LANDING_ZONE';
    }
    if (solarIlluminationPct < 35 || (selectedSite.elevation ?? 0) < 0) {
      return 'HAZARDOUS_PSR_TRAP';
    }
    return 'CAUTION_MARGINAL_RIDGE';
  }, [feasibility, selectedSite]);

  const handleSubmitAssessment = (chosenClass) => {
    setUserClassification(chosenClass);
    const isCorrect = chosenClass === expectedClass;
    const { solarIlluminationPct, dteUptimePct, maxContinuousSunHours } = feasibility.metrics;

    if (isCorrect) {
      const activityKey = `crater-${selectedSite.id}`;
      onCompleteSiteInvestigation?.(activityKey, 55, true);
      setEvaluationFeedback({
        isCorrect: true,
        headline: `ACCURATE TOPOGRAPHIC VERDICT // ${selectedSite.name.toUpperCase()}`,
        detail: `Your classification matches LRO LOLA & JPL Horizons telemetry: ${selectedSite.name} at ${selectedSite.elevation >= 0 ? `+${selectedSite.elevation} m` : `${selectedSite.elevation} m`} elevation (${selectedSite.slopeDeg}° slope) achieves ${solarIlluminationPct}% solar illumination (${maxContinuousSunHours}h max continuous window) and ${dteUptimePct}% Direct-to-Earth visibility.`,
      });
    } else {
      onCompleteSiteInvestigation?.(`crater-${selectedSite.id}`, 0, false);
      setEvaluationFeedback({
        isCorrect: false,
        headline: `RE-EVALUATE LOLA TELEMETRY FOR ${selectedSite.name.toUpperCase()}`,
        detail: `Check the scientific criteria: ${selectedSite.name} has ${solarIlluminationPct}% solar illumination, ${dteUptimePct}% DTE visibility, ${selectedSite.elevation} m elevation, and ${selectedSite.slopeDeg}° slope. A Prime Landing Zone requires >=70% Sun, >=75% DTE, and slope <=9°, whereas <35% Sun or negative basin elevation indicates a Hazardous PSR Trap.`,
      });
    }
  };

  const investigatedCount = Object.keys(completedActivities).filter((k) => k.startsWith('crater-')).length;

  return (
    <div className="academy-module-workspace" aria-label="Module C: Crater Detective Terrain Investigation">
      {/* Header */}
      <div className="amw-header-bar">
        <div>
          <span className="amw-kicker">MODULE C // LRO LOLA TOPOGRAPHIC RECONNAISSANCE</span>
          <h2 className="amw-title">Crater Detective — Lunar Landing Zone Investigation</h2>
        </div>
        <div className="amw-telemetry-badge-group">
          <span className="sim-type-tag">REAL LRO LOLA DEM + JPL HORIZONS TELEMETRY</span>
          <span className="sim-progress-pill">{investigatedCount} ZONES CERTIFIED</span>
        </div>
      </div>

      {/* Candidate Zone Selector Bar */}
      <div className="crater-sites-selector-bar" role="group" aria-label="Select Lunar Zone to Investigate">
        {INVESTIGATION_SITES.map((s) => {
          const isSelected = s.id === selectedSite.id;
          const isCertified = Boolean(completedActivities[`crater-${s.id}`]);
          return (
            <button
              key={s.id}
              type="button"
              className={`crater-zone-btn ${isSelected ? 'is-active' : ''} ${isCertified ? 'is-certified' : ''}`}
              onClick={() => handleSelectFromMapOrList(s)}
            >
              <span>{s.name}</span>
              {isCertified && <CheckCircle2 size={12} className="cert-icon" />}
            </button>
          );
        })}
      </div>

      {/* Reuse LuNav's Interactive 2D LROC WAC Polar Map */}
      <QuickmapTerrainView
        site={selectedSite}
        horizonProfile={horizonProfile}
        telemetry={liveTelemetry}
        onSelectSite={handleSelectFromMapOrList}
      />

      {/* Scientific Landing Criteria Evaluation Matrix */}
      <section className="crater-criteria-panel">
        <div className="ccp-header">
          <div>
            <span className="ccp-kicker">SCIENTIFIC TERRAIN CRITERIA // {selectedSite.name.toUpperCase()}</span>
            <h3 className="ccp-title">Inspect the 5 Landing Certification Parameters &amp; Submit Your Verdict</h3>
          </div>
          <span className="ccp-coords-tag">
            {Math.abs(selectedSite.lat).toFixed(3)}°S, {Math.abs(selectedSite.lon).toFixed(3)}°{selectedSite.lon < 0 ? 'W' : 'E'}
          </span>
        </div>

        <div className="ccp-metrics-grid">
          <div className="ccp-metric-box">
            <span className="ccp-m-label">1. TERRAIN SLOPE (SAFE &lt; 10°)</span>
            <strong className="ccp-m-val" style={{ color: (selectedSite.slopeDeg ?? 5) < 10 ? '#10b981' : '#ef4444' }}>
              {selectedSite.slopeDeg ?? 5.0}°
            </strong>
            <small>{(selectedSite.slopeDeg ?? 5) < 10 ? 'Safe lander touchdown stability' : 'Tip-over hazard (>10°)'}</small>
          </div>

          <div className="ccp-metric-box">
            <span className="ccp-m-label">2. LOLA ELEVATION DATUM</span>
            <strong className="ccp-m-val" style={{ color: selectedSite.elevation >= 3000 ? '#5ce1e6' : '#f59e0b' }}>
              {selectedSite.elevation >= 0 ? `+${selectedSite.elevation.toLocaleString()} m` : `${selectedSite.elevation.toLocaleString()} m`}
            </strong>
            <small>{selectedSite.elevation >= 3000 ? 'High ridge above shadow horizon' : 'Depressed basin / rim shadow'}</small>
          </div>

          <div className="ccp-metric-box">
            <span className="ccp-m-label">3. SOLAR ILLUMINATION (14D)</span>
            <strong className="ccp-m-val" style={{ color: feasibility.metrics.solarIlluminationPct >= 70 ? '#ffb14a' : '#ef4444' }}>
              {feasibility.metrics.solarIlluminationPct}% ({feasibility.metrics.maxContinuousSunHours}h max)
            </strong>
            <small>{feasibility.metrics.solarIlluminationPct >= 70 ? 'Exceeds 70% Artemis power rule' : 'High battery / shadow deficit'}</small>
          </div>

          <div className="ccp-metric-box">
            <span className="ccp-m-label">4. EARTH DTE VISIBILITY</span>
            <strong className="ccp-m-val" style={{ color: feasibility.metrics.dteUptimePct >= 75 ? '#8f9cff' : '#ef4444' }}>
              {feasibility.metrics.dteUptimePct}% DTE Uptime
            </strong>
            <small>{feasibility.metrics.dteUptimePct >= 75 ? 'Direct RF link to Earth unobstructed' : 'Requires polar relay satellite'}</small>
          </div>

          <div className="ccp-metric-box">
            <span className="ccp-m-label">5. CRATER &amp; OBSTACLE PROXIMITY</span>
            <strong className="ccp-m-val is-text">{selectedSite.obstacleRisk}</strong>
            <small>{selectedSite.craterProximity}</small>
          </div>
        </div>

        {/* Cadet Decision Buttons */}
        <div className="ccp-verdict-decision-block">
          <span className="ccp-decision-prompt">
            CADET CERTIFICATION DECISION — Classify <b>{selectedSite.name}</b> based on the 5 scientific parameters above:
          </span>

          <div className="ccp-verdict-buttons">
            <button
              type="button"
              className={`ccp-verdict-btn is-prime ${userClassification === 'PRIME_LANDING_ZONE' ? 'is-selected' : ''}`}
              onClick={() => handleSubmitAssessment('PRIME_LANDING_ZONE')}
            >
              <strong>PRIME ARTEMIS LANDING ZONE</strong>
              <span>High Illumination (≥70%), Strong DTE (≥75%) &amp; Safe Slope (&lt;9°)</span>
            </button>

            <button
              type="button"
              className={`ccp-verdict-btn is-caution ${userClassification === 'CAUTION_MARGINAL_RIDGE' ? 'is-selected' : ''}`}
              onClick={() => handleSubmitAssessment('CAUTION_MARGINAL_RIDGE')}
            >
              <strong>MARGINAL / CONTINGENCY ZONE</strong>
              <span>Moderate Slope or Intermittent Shadow / Comms Window</span>
            </button>

            <button
              type="button"
              className={`ccp-verdict-btn is-hazard ${userClassification === 'HAZARDOUS_PSR_TRAP' ? 'is-selected' : ''}`}
              onClick={() => handleSubmitAssessment('HAZARDOUS_PSR_TRAP')}
            >
              <strong>HAZARDOUS PSR / CRATER TRAP</strong>
              <span>Severe Shadowing (&lt;35% Sun), Steep Slope or Blocked DTE</span>
            </button>
          </div>

          {evaluationFeedback && (
            <div className={`ssc-feedback-box ${evaluationFeedback.isCorrect ? 'is-optimal' : 'is-hazard'}`} role="status">
              <div className="ssc-fb-header">
                {evaluationFeedback.isCorrect ? (
                  <CheckCircle2 size={18} className="fb-icon is-ok" />
                ) : (
                  <AlertTriangle size={18} className="fb-icon is-err" />
                )}
                <strong>{evaluationFeedback.headline}</strong>
                {evaluationFeedback.isCorrect && <span className="fb-xp-pill">+55 XP EARNED</span>}
              </div>
              <p className="ssc-fb-body">{evaluationFeedback.detail}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
