import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  Activity,
  Sun,
  Radio,
  MapPin,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Crosshair,
  Award,
} from 'lucide-react';
import QuickmapTerrainView from '../../lunar/QuickmapTerrainView.jsx';
import HorizonProfileChart from '../../lunar/HorizonProfileChart.jsx';
import SiteOverlaySelector from '../../lunar/SiteOverlaySelector.jsx';
import EphemerisTimeline from '../../lunar/EphemerisTimeline.jsx';
import { CANDIDATE_SITES_CATALOG, getHorizonData } from '../../../services/horizonsService.js';
import { evaluateSiteTelemetry, DEFAULT_MISSION_EPOCH } from '../../../services/ephemerisEngine.js';
import { evaluateMissionFeasibility } from '../../../services/recommendationEngine.js';
import { XP_REWARDS } from '../academyState.js';

// Include Shackleton PSR Interior Floor so trainees can contrast sunlit ridges (+4218m) vs dark crater traps (-1400m)
const FIELD_SITES = [
  ...CANDIDATE_SITES_CATALOG.map((s, idx) => ({
    ...s,
    slopeDeg: [4.2, 3.6, 8.4, 7.1, 5.2][idx] || 4.8,
  })),
  {
    id: 'shackleton-psr-floor',
    siteId: 'shackleton-psr',
    name: 'Shackleton Crater Floor (PSR Trap)',
    lat: -89.9,
    lon: 0.0,
    elevation: -1400,
    slopeDeg: 15.2,
  },
];

const MISSIONS = [
  {
    id: 'm1',
    code: 'MISSION 01',
    title: 'MAP EXPLORER',
    icon: Compass,
    color: '#25BFFF',
    instruction:
      'Click on the LROC WAC 2D Polar Map or site buttons below to explore at least 2 different South Pole locations and inspect their coordinates.',
    pointerText: '👆 INTERACT HERE: Click any crater on the 2D Polar Map or switch candidate sites!',
    explanation:
      'You mastered the LROC WAC Polar Map! The center is 90°S, concentric rings measure latitude, and 0° Longitude points North toward Earth.',
  },
  {
    id: 'm2',
    code: 'MISSION 02',
    title: 'TERRAIN ANALYSIS',
    icon: Activity,
    color: '#42E8E8',
    instruction:
      'Activate the [ 360° LOLA DEM ELEVATION ] layer and select an Overlay Comparison Site to compare elevated ridges (+4,218 m) against steep depressions.',
    pointerText: '👆 INTERACT HERE: Click [ 360° LOLA DEM ELEVATION ] and choose a Comparison Site!',
    explanation:
      'LRO LOLA laser altimetry reveals why elevated ridges with gentle slopes (< 6°) are safe for touchdown while deep basins block the horizon.',
  },
  {
    id: 'm3',
    code: 'MISSION 03',
    title: 'SUNLIGHT DETECTIVE',
    icon: Sun,
    color: '#FFC247',
    instruction:
      'Drag the Ephemeris Timeline slider (or press Play ▶) to move the Sun through time, then verify whether your selected site is ILLUMINATED or in PSR SHADOW.',
    pointerText: '👆 INTERACT HERE: Scrub the Ephemeris Timeline below to propagate solar position!',
    explanation:
      'At 89.5°S, the Sun circles the horizon at ±1.54°. Peaks stand in near-continuous sunlight while deep PSR crater floors stay dark forever!',
  },
  {
    id: 'm4',
    code: 'MISSION 04',
    title: 'COMMUNICATION CHECK',
    icon: Radio,
    color: '#21D69B',
    instruction:
      'Check the EARTH VECTOR (DTE 399) telemetry panel and select a ridge site where Earth stays above the local terrain horizon (DTE LOCKED).',
    pointerText: '👆 INTERACT HERE: Inspect EARTH VECTOR status and confirm an active DTE radio link!',
    explanation:
      'Direct-to-Earth (DTE) requires Earth’s elevation angle to clear local mountain ridges along the 0° North sub-Earth azimuth.',
  },
  {
    id: 'm5',
    code: 'MISSION 05',
    title: 'FIND THE LANDING SITE',
    icon: Crosshair,
    color: '#a855f7',
    instruction:
      'Final Field Test: Use all LuNav tools (Polar Map, LOLA Chart & Timeline) to choose an optimal landing site and click [ DEPLOY ARTEMIS LANDER HERE ].',
    pointerText: '👆 FINAL ACTION: Select your best landing site and click DEPLOY ARTEMIS LANDER!',
    explanation:
      'Congratulations, certified LuNav Operator! You evaluated real NASA illumination, elevation, slope, and DTE telemetry to select a safe Artemis site.',
  },
];

export default function LuNavFieldTraining({
  completedMissions = {},
  onCompleteFieldMission,
  onOpenFullExplorer,
}) {
  const [activeMissionIdx, setActiveMissionIdx] = useState(0);
  const [selectedSite, setSelectedSite] = useState(FIELD_SITES[0]);
  const [toolView, setToolView] = useState('quickmap'); // 'quickmap' | 'chart'
  const [overlaySiteId, setOverlaySiteId] = useState(null);
  const [hoursOffset, setHoursOffset] = useState(0);

  const [primaryProfile, setPrimaryProfile] = useState([]);
  const [overlayProfile, setOverlayProfile] = useState([]);

  // Interactive mission tracking states
  const [visitedSiteIds, setVisitedSiteIds] = useState(() => new Set([FIELD_SITES[0].id]));
  const [timelineMoved, setTimelineMoved] = useState(false);
  const [missionFeedback, setMissionFeedback] = useState(null);
  const [finalEvaluation, setFinalEvaluation] = useState(null);

  const currentMission = MISSIONS[activeMissionIdx];

  // Load real LOLA horizon data for primary site
  useEffect(() => {
    let cancelled = false;
    const lookupId = selectedSite.horizonId ?? selectedSite.siteId ?? selectedSite.id;
    getHorizonData(lookupId, selectedSite).then((data) => {
      if (!cancelled) setPrimaryProfile(data?.horizonProfile ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedSite]);

  // Load real LOLA horizon data for comparison overlay site
  useEffect(() => {
    if (!overlaySiteId) {
      setOverlayProfile([]);
      return undefined;
    }
    let cancelled = false;
    getHorizonData(overlaySiteId).then((data) => {
      if (!cancelled) setOverlayProfile(data?.horizonProfile ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [overlaySiteId]);

  const overlaySiteObj = useMemo(() => {
    if (!overlaySiteId) return null;
    return FIELD_SITES.find((s) => s.id === overlaySiteId || s.siteId === overlaySiteId) || null;
  }, [overlaySiteId]);

  const primaryTelemetry = useMemo(() => {
    return evaluateSiteTelemetry(selectedSite, primaryProfile, hoursOffset);
  }, [selectedSite, primaryProfile, hoursOffset]);

  const overlayTelemetry = useMemo(() => {
    if (!overlaySiteObj || !overlayProfile.length) return null;
    return evaluateSiteTelemetry(overlaySiteObj, overlayProfile, hoursOffset);
  }, [overlaySiteObj, overlayProfile, hoursOffset]);

  const feasibility = useMemo(() => {
    return evaluateMissionFeasibility(selectedSite, primaryProfile, 0, 336);
  }, [selectedSite, primaryProfile]);

  // Handle user selecting a site on the real Quickmap or Site Selector
  const handleSelectSite = (nextSite) => {
    const match = FIELD_SITES.find((s) => s.id === nextSite.id || s.siteId === nextSite.id);
    const resolved = match || {
      ...nextSite,
      slopeDeg: (nextSite.elevation ?? 3500) >= 3500 ? 4.5 : 9.2,
    };
    setSelectedSite(resolved);
    setFinalEvaluation(null);

    setVisitedSiteIds((prev) => {
      const next = new Set(prev);
      next.add(resolved.id || `${resolved.lat},${resolved.lon}`);
      // Auto-complete Mission 01 when user has explored at least 2 locations on the map!
      if (activeMissionIdx === 0 && next.size >= 2 && !missionFeedback) {
        triggerMissionSuccess('m1');
      }
      return next;
    });
  };

  const handleSelectOverlay = (nextOverlayId) => {
    setOverlaySiteId(nextOverlayId);
    if (activeMissionIdx === 1 && nextOverlayId) {
      triggerMissionSuccess('m2');
    }
  };

  const handleTimelineChange = (nextHours) => {
    const val = typeof nextHours === 'function' ? nextHours(hoursOffset) : nextHours;
    setHoursOffset(val);
    setTimelineMoved(true);
    if (activeMissionIdx === 2 && !missionFeedback) {
      triggerMissionSuccess('m3', 'solar-analyst');
    }
  };

  const triggerMissionSuccess = (missionId, extraBadgeId = null) => {
    const mDef = MISSIONS.find((m) => m.id === missionId);
    setMissionFeedback({
      missionId,
      title: `${mDef.code} COMPLETE! +${XP_REWARDS.FIELD_MISSION} XP`,
      explanation: mDef.explanation,
    });
    onCompleteFieldMission?.({
      missionId,
      xpEarned: XP_REWARDS.FIELD_MISSION,
      coinsEarned: 45,
      badgeId: extraBadgeId,
    });
  };

  const handleVerifyMission4 = () => {
    if (primaryTelemetry?.earth?.isVisible) {
      triggerMissionSuccess('m4');
    } else {
      setMissionFeedback({
        missionId: null,
        isWarning: true,
        title: 'EARTH LINK OCCLUDED AT THIS SITE!',
        explanation:
          'A mountain ridge is blocking Earth at this coordinate. Click Shackleton Rim or Connecting Ridge on the map to establish DTE LOCK!',
      });
    }
  };

  const handleDeployFinalLander = () => {
    const { solarIlluminationPct, dteUptimePct } = feasibility.metrics;
    const slope = selectedSite.slopeDeg ?? 4.8;
    const elev = selectedSite.elevation ?? 4000;
    const isViable = solarIlluminationPct >= 70 && dteUptimePct >= 75 && slope <= 8.5 && elev > 0;

    setFinalEvaluation({
      siteName: selectedSite.name,
      isViable,
      solarIlluminationPct,
      dteUptimePct,
      slope,
      elev,
    });

    if (isViable) {
      triggerMissionSuccess('m5', 'map-navigator');
    } else {
      setMissionFeedback({
        missionId: null,
        isWarning: true,
        title: `SITE HAZARD DETECTED AT ${selectedSite.name.toUpperCase()}`,
        explanation: `Solar (${solarIlluminationPct}%), DTE (${dteUptimePct}%), or Slope (${slope}°) is unsafe! Select a high sunlit ridge (like Shackleton Rim or Connecting Ridge) and deploy again.`,
      });
    }
  };

  const switchMission = (idx) => {
    setActiveMissionIdx(idx);
    setMissionFeedback(null);
    setFinalEvaluation(null);
    if (idx === 1) setToolView('chart');
    else if (idx === 0) setToolView('quickmap');
  };

  return (
    <div className="arcade-game-container field-training-shell">
      {/* 1. Mission Stepper Header */}
      <div className="ft-missions-bar" role="tablist" aria-label="LuNav Field Training Missions">
        {MISSIONS.map((m, idx) => {
          const MIcon = m.icon;
          const isDone = Boolean(completedMissions[m.id]);
          const isActive = idx === activeMissionIdx;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`ft-mission-tab ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
              style={{ '--m-col': m.color }}
              onClick={() => switchMission(idx)}
            >
              <MIcon size={15} />
              <div className="ft-tab-text">
                <span>{m.code}</span>
                <strong>{m.title}</strong>
              </div>
              {isDone && <CheckCircle2 size={14} className="ft-done-check" />}
            </button>
          );
        })}
      </div>

      {/* 2. Guided Mission Instruction HUD Banner (Short instruction + Visual Indicator + Action Trigger) */}
      <div className="ft-guided-banner" style={{ borderColor: currentMission.color }}>
        <div className="ftgb-left">
          <span className="ftgb-code" style={{ background: currentMission.color }}>
            {currentMission.code}: {currentMission.title}
          </span>
          <p className="ftgb-instruction">{currentMission.instruction}</p>
          <div className="ftgb-pointer-pill">
            <Sparkles size={14} />
            <span>{currentMission.pointerText}</span>
          </div>
        </div>

        {/* Mission-Specific Action Verification Button */}
        <div className="ftgb-right">
          {activeMissionIdx === 0 && (
            <div className="ft-progress-chip">
              SITES EXPLORED: <b>{visitedSiteIds.size} / 2</b>
            </div>
          )}

          {activeMissionIdx === 1 && (
            <button
              type="button"
              className="arcade-btn is-gold"
              onClick={() => {
                setToolView('chart');
                if (!overlaySiteId) handleSelectOverlay('haworth');
                else triggerMissionSuccess('m2');
              }}
            >
              <span>COMPARE RIDGES &amp; SLOPES</span>
            </button>
          )}

          {activeMissionIdx === 2 && (
            <button
              type="button"
              className="arcade-btn is-gold"
              onClick={() => triggerMissionSuccess('m3', 'solar-analyst')}
            >
              <Sun size={15} />
              <span>VERIFY SOLAR POSITION ({primaryTelemetry?.sun?.isIlluminated ? 'ILLUMINATED' : 'SHADOWED'})</span>
            </button>
          )}

          {activeMissionIdx === 3 && (
            <button type="button" className="arcade-btn is-primary" onClick={handleVerifyMission4}>
              <Radio size={15} />
              <span>CONFIRM DTE LINK LOCK</span>
            </button>
          )}

          {activeMissionIdx === 4 && (
            <button type="button" className="arcade-btn is-gold" onClick={handleDeployFinalLander}>
              <Crosshair size={15} />
              <span>DEPLOY ARTEMIS LANDER HERE</span>
            </button>
          )}
        </div>
      </div>

      {/* Completion / Feedback Toast */}
      {missionFeedback && (
        <div className={`ft-completion-toast ${missionFeedback.isWarning ? 'is-warn' : 'is-ok'}`} role="status">
          <div className="ftct-body">
            <CheckCircle2 size={20} />
            <div>
              <strong>{missionFeedback.title}</strong>
              <p>{missionFeedback.explanation}</p>
            </div>
          </div>
          {!missionFeedback.isWarning && activeMissionIdx < MISSIONS.length - 1 && (
            <button
              type="button"
              className="arcade-btn is-primary"
              onClick={() => switchMission(activeMissionIdx + 1)}
            >
              <span>NEXT MISSION</span>
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}

      {/* Mission 05 Final Landing Evaluation Scorecard */}
      {finalEvaluation && (
        <div className={`ft-final-scorecard ${finalEvaluation.isViable ? 'is-go' : 'is-nogo'}`}>
          <div className="ftfs-head">
            <Award size={20} />
            <strong>
              LANDING EVALUATION FOR {finalEvaluation.siteName.toUpperCase()}:{' '}
              {finalEvaluation.isViable ? 'GO FOR TOUCHDOWN (+50 XP)' : 'NO-GO (UNSAFE TERRAIN)'}
            </strong>
          </div>
          <div className="ftfs-metrics">
            <span>☀️ ILLUMINATION: <b>{finalEvaluation.solarIlluminationPct}%</b></span>
            <span>⛰️ ELEVATION: <b>{finalEvaluation.elev} m</b></span>
            <span>📐 SLOPE: <b>{finalEvaluation.slope}°</b></span>
            <span>📡 EARTH DTE: <b>{finalEvaluation.dteUptimePct}%</b></span>
          </div>
        </div>
      )}

      {/* 3. Real LuNav Interactive Tool Bar (Candidate Sites + Layer Switcher) */}
      <div className="ft-real-tools-bar">
        <div className="ft-sites-pills">
          {FIELD_SITES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`crater-zone-btn ${selectedSite.id === s.id ? 'is-active' : ''}`}
              onClick={() => handleSelectSite(s)}
            >
              <MapPin size={12} />
              <span>{s.name}</span>
              <small>({s.elevation >= 0 ? `+${s.elevation}m` : `${s.elevation}m`} · {s.slopeDeg}°)</small>
            </button>
          ))}
        </div>

        <div className="ft-layer-Minimal-tabs">
          <button
            type="button"
            className={`ft-layer-btn ${toolView === 'quickmap' ? 'is-active' : ''}`}
            onClick={() => setToolView('quickmap')}
          >
            <Compass size={13} />
            <span>LROC WAC 2D POLAR MAP</span>
          </button>
          <button
            type="button"
            className={`ft-layer-btn ${toolView === 'chart' ? 'is-active' : ''}`}
            onClick={() => {
              setToolView('chart');
              if (activeMissionIdx === 1 && !missionFeedback) {
                triggerMissionSuccess('m2');
              }
            }}
          >
            <Activity size={13} />
            <span>360° LOLA DEM ELEVATION</span>
          </button>
        </div>
      </div>

      {/* 4. REAL LUNAV INTERACTIVE MAP / CHART + EPHEMERIS TIMELINE */}
      <div className="ft-live-tool-stage">
        {toolView === 'quickmap' ? (
          <QuickmapTerrainView
            site={selectedSite}
            horizonProfile={primaryProfile}
            telemetry={primaryTelemetry}
            onSelectSite={handleSelectSite}
          />
        ) : (
          <div className="ft-chart-wrapper">
            <SiteOverlaySelector
              primarySite={selectedSite}
              overlaySiteId={overlaySiteId}
              onSelectOverlaySite={handleSelectOverlay}
              primaryTelemetry={primaryTelemetry}
              overlayTelemetry={overlayTelemetry}
            />
            <HorizonProfileChart
              primarySite={selectedSite}
              primaryProfile={primaryProfile}
              primaryTelemetry={primaryTelemetry}
              overlaySite={overlaySiteObj}
              overlayProfile={overlayProfile}
              overlayTelemetry={overlayTelemetry}
            />
          </div>
        )}

        <EphemerisTimeline
          hoursOffset={hoursOffset}
          onChangeHoursOffset={handleTimelineChange}
          baseDate={DEFAULT_MISSION_EPOCH}
        />
      </div>
    </div>
  );
}
