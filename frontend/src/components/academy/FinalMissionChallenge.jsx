import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileText,
  Sun,
  Radio,
  Compass,
  ShieldCheck,
} from 'lucide-react';
import { CANDIDATE_SITES_CATALOG, getHorizonData } from '../../services/horizonsService.js';
import { evaluateMissionFeasibility, generateSmartWarnings } from '../../services/recommendationEngine.js';

const MISSION_SITES = [
  ...CANDIDATE_SITES_CATALOG,
  {
    id: 'shackleton-psr',
    siteId: 'shackleton-psr',
    name: 'Shackleton Interior Floor (PSR)',
    lat: -89.9,
    lon: 0.0,
    elevation: -1400,
  },
];

const ARRAY_ARCHITECTURES = [
  { id: 'vertical-360', label: '12m Vertical 360° Tracking Solar Mast (Optimal for ±1.5° Grazing Sun)', score: 25 },
  { id: 'flat-roof', label: 'Horizontal Flat Roof Array (High Cosine Loss at South Pole)', score: 5 },
];

const COMMS_ARCHITECTURES = [
  { id: 'dte-plus-relay', label: 'High-Gain X-Band DTE + NRHO Lunar Gateway Relay Backup', score: 25 },
  { id: 'uhf-omni', label: 'Low-Gain Omni Antenna Only (No Ridge Diffraction Backup)', score: 8 },
];

const DEFENSE_RATIONALES = [
  {
    id: 'rationale-polar-ridge',
    label: 'High elevation (>3,800 m) clears surrounding LOLA horizon rims, maximizing continuous grazing solar power (>80%) and Direct-to-Earth visibility while remaining within rover traverse range of PSR water ice.',
    bestForViableRidge: true,
  },
  {
    id: 'rationale-equatorial-heat',
    label: 'Selected because the Lunar South Pole has a thick 1 bar atmosphere that keeps temperatures at +22°C year-round.',
    bestForViableRidge: false,
  },
  {
    id: 'rationale-crater-floor',
    label: 'Landing inside a permanently shadowed crater floor maximizes direct solar panel output without needing batteries.',
    bestForViableRidge: false,
  },
];

export default function FinalMissionChallenge({
  lastReport = null,
  onCompleteFinalChallenge,
}) {
  const [selectedSite, setSelectedSite] = useState(MISSION_SITES[0]);
  const [horizonProfile, setHorizonProfile] = useState([]);
  const [arrayChoice, setArrayChoice] = useState(ARRAY_ARCHITECTURES[0].id);
  const [commsChoice, setCommsChoice] = useState(COMMS_ARCHITECTURES[0].id);
  const [rationaleChoice, setRationaleChoice] = useState(DEFENSE_RATIONALES[0].id);
  const [generatedReport, setGeneratedReport] = useState(lastReport);

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

  const evaluation = useMemo(() => {
    return evaluateMissionFeasibility(selectedSite, horizonProfile, 0, 336);
  }, [selectedSite, horizonProfile]);

  const warnings = useMemo(() => {
    return generateSmartWarnings(evaluation);
  }, [evaluation]);

  const handleGenerateMissionReport = () => {
    const { solarIlluminationPct, dteUptimePct, maxContinuousSunHours } = evaluation.metrics;

    // Score calculation (out of 100)
    const siteScore = Math.round((solarIlluminationPct * 0.25) + (dteUptimePct * 0.15)); // Up to 40 pts
    const arrayObj = ARRAY_ARCHITECTURES.find((a) => a.id === arrayChoice);
    const commsObj = COMMS_ARCHITECTURES.find((c) => c.id === commsChoice);
    const rationaleObj = DEFENSE_RATIONALES.find((r) => r.id === rationaleChoice);
    const rationaleScore = rationaleObj?.bestForViableRidge ? 20 : 4;

    const totalScore = Math.min(100, siteScore + (arrayObj?.score || 0) + (commsObj?.score || 0) + rationaleScore);

    const strengths = [];
    const risks = [];
    const recommendations = [];

    if (solarIlluminationPct >= 75) {
      strengths.push(`High cumulative solar illumination (${solarIlluminationPct}%, ${maxContinuousSunHours}h max continuous window) verified by LRO LOLA horizon profile.`);
    } else {
      risks.push(`Low solar illumination (${solarIlluminationPct}%) exposes the base to prolonged cryogenic shadow periods.`);
      recommendations.push('Relocate touchdown target to Shackleton Rim (+4,218 m) or Connecting Ridge (+4,350 m) to exceed 85% solar availability.');
    }

    if (dteUptimePct >= 75) {
      strengths.push(`Strong Direct-to-Earth (DTE) visibility (${dteUptimePct}% uptime) along the northern sub-Earth azimuth corridor.`);
    } else {
      risks.push(`Restricted DTE visibility (${dteUptimePct}%) due to local crater rim occultation.`);
    }

    if (arrayChoice === 'vertical-360') {
      strengths.push('12m vertical 360° tracking solar mast captures perpendicular grazing sunlight (~1,360 W/m²).');
    } else {
      risks.push('Horizontal flat solar array suffers >97% cosine projection loss at ±1.5° polar solar elevation.');
      recommendations.push('Switch to a vertical 360° tracking solar array mast.');
    }

    if (commsChoice === 'dte-plus-relay') {
      strengths.push('Dual X-Band DTE + NRHO Gateway relay architecture eliminates optical libration communication blackouts.');
    } else {
      risks.push('Single omni-directional antenna lacks gain and orbital relay backup during libration dips.');
      recommendations.push('Add high-gain X/Ka-Band DTE dish with NRHO orbital relay handoff.');
    }

    if (!rationaleObj?.bestForViableRidge) {
      risks.push('Scientific justification contains physical inaccuracies regarding the Moon’s vacuum environment or polar geometry.');
      recommendations.push('Review Module A & B: the Moon has a collisionless exosphere and PSRs receive 0 W/m² of direct sunlight.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Mission architecture satisfies all NASA Artemis South Pole illumination, thermal, and DTE flight rules. Cleared for surface deployment.');
    }

    const report = {
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC',
      site: selectedSite,
      metrics: evaluation.metrics,
      verdict: totalScore >= 80 ? 'CERTIFIED // GO FOR ARTEMIS SURFACE OPS' : totalScore >= 60 ? 'CONDITIONAL // REQUIRES MITIGATION' : 'NO-GO // CRITICAL DESIGN RISKS',
      totalScore,
      arrayLabel: arrayObj?.label,
      commsLabel: commsObj?.label,
      rationaleLabel: rationaleObj?.label,
      strengths,
      risks,
      recommendations,
      warningsCount: warnings.length,
    };

    setGeneratedReport(report);
    onCompleteFinalChallenge?.(report, totalScore >= 80 ? 120 : 60, totalScore >= 80);
  };

  return (
    <div className="academy-module-workspace" aria-label="Final Challenge: Plan Your Lunar Mission">
      {/* Header */}
      <div className="amw-header-bar">
        <div>
          <span className="amw-kicker">FINAL CAPSTONE CHALLENGE // ARTEMIS MISSION ARCHITECTURE</span>
          <h2 className="amw-title">Plan &amp; Defend Your Lunar South Pole Mission</h2>
        </div>
        <div className="amw-telemetry-badge-group">
          <span className="sim-type-tag">REAL LRO LOLA + JPL HORIZONS TELEMETRY SYNTHESIS</span>
        </div>
      </div>

      <div className="final-challenge-grid">
        {/* Left: Configuration Steps */}
        <div className="fc-config-col">
          {/* Step 1: Select Landing Site */}
          <div className="fc-step-box">
            <span className="fc-step-kicker">STEP 01 // SELECT CANDIDATE LANDING SITE</span>
            <div className="fc-site-buttons">
              {MISSION_SITES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`fc-site-btn ${selectedSite.id === s.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedSite(s)}
                >
                  <strong>{s.name}</strong>
                  <span>{Math.abs(s.lat).toFixed(2)}°S · {s.elevation >= 0 ? `+${s.elevation}m` : `${s.elevation}m`}</span>
                </button>
              ))}
            </div>

            {/* Live Site Telemetry Preview */}
            <div className="fc-live-telemetry-preview">
              <div>
                <span>SOLAR ILLUMINATION:</span>
                <b style={{ color: '#ffb14a' }}>{evaluation.metrics.solarIlluminationPct}% ({evaluation.metrics.maxContinuousSunHours}H MAX)</b>
              </div>
              <div>
                <span>EARTH DTE UPTIME:</span>
                <b style={{ color: '#5ce1e6' }}>{evaluation.metrics.dteUptimePct}%</b>
              </div>
              <div>
                <span>FEASIBILITY:</span>
                <b style={{ color: evaluation.verdictColor }}>{evaluation.verdict}</b>
              </div>
            </div>
          </div>

          {/* Step 2: Select Solar & Comms Engineering */}
          <div className="fc-step-box">
            <span className="fc-step-kicker">STEP 02 // CONFIGURE SOLAR &amp; DTE ARCHITECTURE</span>
            <label className="fc-select-label">
              <span>SOLAR ARRAY GEOMETRY:</span>
              <select
                value={arrayChoice}
                onChange={(e) => setArrayChoice(e.target.value)}
                className="fc-select-input"
              >
                {ARRAY_ARCHITECTURES.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </label>

            <label className="fc-select-label">
              <span>EARTH COMMUNICATION LINK:</span>
              <select
                value={commsChoice}
                onChange={(e) => setCommsChoice(e.target.value)}
                className="fc-select-input"
              >
                {COMMS_ARCHITECTURES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Step 3: Defend Your Location Selection */}
          <div className="fc-step-box">
            <span className="fc-step-kicker">STEP 03 // DEFEND YOUR SCIENTIFIC SITE SELECTION</span>
            <div className="fc-rationale-list">
              {DEFENSE_RATIONALES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`fc-rationale-btn ${rationaleChoice === r.id ? 'is-active' : ''}`}
                  onClick={() => setRationaleChoice(r.id)}
                >
                  <span>{rationaleChoice === r.id ? '●' : '○'}</span>
                  <p>{r.label}</p>
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="fc-generate-btn" onClick={handleGenerateMissionReport}>
            <FileText size={16} />
            <span>GENERATE OFFICIAL MISSION READINESS REPORT</span>
          </button>
        </div>

        {/* Right: Generated Mission Report */}
        <div className="fc-report-col">
          {generatedReport ? (
            <div className="mission-report-dossier" role="region" aria-label="Generated Mission Readiness Report">
              <div className="mrd-top-bar">
                <div>
                  <span className="mrd-stamp">LUNAV ACADEMY // MISSION CERTIFICATION DOSSIER</span>
                  <h3 className="mrd-site-title">{generatedReport.site.name}</h3>
                </div>
                <div className="mrd-score-badge">
                  <span>READINESS SCORE</span>
                  <strong style={{ color: generatedReport.totalScore >= 80 ? '#10b981' : '#f59e0b' }}>
                    {generatedReport.totalScore} / 100
                  </strong>
                </div>
              </div>

              <div className="mrd-verdict-banner" style={{ borderColor: generatedReport.totalScore >= 80 ? '#10b981' : '#f59e0b' }}>
                <strong>{generatedReport.verdict}</strong>
                <span>GENERATED: {generatedReport.timestamp}</span>
              </div>

              <div className="mrd-telemetry-grid">
                <div>
                  <span>COORDINATES</span>
                  <b>{Math.abs(generatedReport.site.lat).toFixed(2)}°S, {Math.abs(generatedReport.site.lon).toFixed(2)}°{generatedReport.site.lon < 0 ? 'W' : 'E'}</b>
                </div>
                <div>
                  <span>ELEVATION</span>
                  <b>{generatedReport.site.elevation >= 0 ? `+${generatedReport.site.elevation} m` : `${generatedReport.site.elevation} m`}</b>
                </div>
                <div>
                  <span>SOLAR WINDOW</span>
                  <b>{generatedReport.metrics.solarIlluminationPct}% ({generatedReport.metrics.maxContinuousSunHours}h)</b>
                </div>
                <div>
                  <span>EARTH DTE LINK</span>
                  <b>{generatedReport.metrics.dteUptimePct}% Uptime</b>
                </div>
              </div>

              <div className="mrd-section">
                <h4>ARCHITECTURAL STRENGTHS</h4>
                <ul>
                  {generatedReport.strengths.map((s, i) => (
                    <li key={i} className="is-strength">✓ {s}</li>
                  ))}
                </ul>
              </div>

              {generatedReport.risks.length > 0 && (
                <div className="mrd-section">
                  <h4>IDENTIFIED OPERATIONAL RISKS</h4>
                  <ul>
                    {generatedReport.risks.map((r, i) => (
                      <li key={i} className="is-risk">⚠️ {r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mrd-section">
                <h4>FLIGHT DIRECTOR RECOMMENDATIONS</h4>
                <ul>
                  {generatedReport.recommendations.map((rec, i) => (
                    <li key={i} className="is-rec">→ {rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="mrd-empty-placeholder">
              <Award size={36} className="mrd-empty-icon" />
              <h3>AWAITING MISSION ARCHITECTURE SUBMISSION</h3>
              <p>
                Select your target landing site on the left, configure your solar and Direct-to-Earth communication subsystems, defend your scientific rationale, and click <b>Generate Official Mission Readiness Report</b>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
