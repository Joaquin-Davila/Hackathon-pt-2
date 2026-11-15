import React, { useState, useMemo } from 'react';
import {
  Zap,
  Sun,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  BatteryCharging,
  Radio,
  Cpu,
  Lightbulb,
  Truck,
  HeartPulse,
} from 'lucide-react';

// 3 Realistic Polar Illumination Scenarios (Clearly labeled as engineering simulation models grounded in 1,361 W/m² solar physics)
const POWER_SCENARIOS = [
  {
    id: 'power-phase-1',
    name: 'PHASE 01 // PEAK GRAZING SUNLIGHT (+1.5° EL)',
    solarElevationDeg: 1.5,
    availableSolarKw: 10.5, // 28 m² vertical tracking GaAs array @ 29% eff (~10.5 kW)
    batteryCapacityKwh: 42.0,
    durationHours: 12,
    requiredScienceKw: 2.0,
    requiredRoverKw: 1.5,
    description:
      'Unobstructed grazing sunlight on Shackleton Rim. Your vertical tracking solar mast generates 10.5 kW. Allocate power to sustain crew life support, DTE telemetry, active core drilling (≥2.0 kW), and rover charging (≥1.5 kW) without overloading the 10.5 kW bus.',
  },
  {
    id: 'power-phase-2',
    name: 'PHASE 02 // PARTIAL RIDGE DIFFRACTION (+0.3° EL)',
    solarElevationDeg: 0.3,
    availableSolarKw: 6.5, // Partial horizon masking reduces array output to 6.5 kW
    batteryCapacityKwh: 42.0,
    durationHours: 18,
    requiredScienceKw: 1.0,
    requiredRoverKw: 0.0,
    description:
      'The solar disc skims across a distant massif shoulder, reducing array generation to 6.5 kW for 18 hours. Keep Life Support (≥3.2 kW) and DTE Comms (≥1.2 kW) online while throttling rover charging and high-draw drills so the battery stays above 60% SoC.',
  },
  {
    id: 'power-phase-3',
    name: 'PHASE 03 // 24-HOUR CRATER RIM ECLIPSE (SHADOW TRANSIT)',
    solarElevationDeg: -1.2,
    availableSolarKw: 0.0, // Total topographic occultation (0.0 kW solar input)
    batteryCapacityKwh: 42.0,
    durationHours: 10,
    requiredScienceKw: 0.4,
    requiredRoverKw: 0.0,
    description:
      'The Sun passes behind a crater rim (-1.2° elevation), dropping solar generation to 0.0 kW for a 10-hour shadow window! Switch the base to survival keep-alive mode so total load stays ≤ 4.2 kW (preserving ≥15% emergency battery reserve over 10 hours).',
  },
];

const SUBSYSTEMS = [
  {
    id: 'lifeSupport',
    name: 'LIFE SUPPORT & ECLSS THERMAL',
    icon: HeartPulse,
    minSafeKw: 3.0,
    maxKw: 4.5,
    step: 0.1,
    criticalNote: 'Minimum 3.0 kW required for O₂ regeneration, CO₂ scrubbing, and cabin heating.',
  },
  {
    id: 'comms',
    name: 'DIRECT-TO-EARTH (DTE) RF LINK',
    icon: Radio,
    minSafeKw: 0.8,
    maxKw: 2.5,
    step: 0.1,
    criticalNote: 'Minimum 0.8 kW required for S-Band telemetry lock (1.5+ kW for HD X-Band video).',
  },
  {
    id: 'science',
    name: 'SCIENTIFIC INSTRUMENTS & DRILL',
    icon: Cpu,
    minSafeKw: 0.2,
    maxKw: 3.5,
    step: 0.1,
    criticalNote: '0.2 kW standby keep-alive; 2.0+ kW for active volatile mass spectrometry & drilling.',
  },
  {
    id: 'lighting',
    name: 'HABITAT & EVA FLOOD LIGHTING',
    icon: Lightbulb,
    minSafeKw: 0.3,
    maxKw: 1.5,
    step: 0.1,
    criticalNote: 'Minimum 0.3 kW required for internal cabin & airlock safety illumination.',
  },
  {
    id: 'rovers',
    name: 'EXPLORATION VEHICLES (LTV CHARGING)',
    icon: Truck,
    minSafeKw: 0.0,
    maxKw: 3.0,
    step: 0.1,
    criticalNote: 'Can be throttled to 0.0 kW during shadow transits; 1.5+ kW for rapid EVA sortie recharge.',
  },
];

export default function SolarEnergySimulator({
  completedActivities = {},
  onCompletePhase,
  onCompleteModule,
}) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [allocations, setAllocations] = useState({
    lifeSupport: 3.4,
    comms: 1.4,
    science: 2.2,
    lighting: 0.6,
    rovers: 1.8,
  });
  const [statusFeedback, setStatusFeedback] = useState(null);

  const phase = POWER_SCENARIOS[phaseIdx];

  const handleSliderChange = (key, val) => {
    setAllocations((prev) => ({
      ...prev,
      [key]: Number(val),
    }));
    setStatusFeedback(null);
  };

  // Real-time microgrid physics calculation
  const gridTelemetry = useMemo(() => {
    const totalLoadKw = Number(
      Object.values(allocations).reduce((acc, v) => acc + v, 0).toFixed(2)
    );
    const netPowerKw = Number((phase.availableSolarKw - totalLoadKw).toFixed(2));
    const energyDeltaKwh = netPowerKw * phase.durationHours;
    const endBatteryKwh = Math.max(
      0,
      Math.min(phase.batteryCapacityKwh, phase.batteryCapacityKwh + energyDeltaKwh)
    );
    const endBatterySocPct = Math.round((endBatteryKwh / phase.batteryCapacityKwh) * 100);

    const lifeSupportOk = allocations.lifeSupport >= 3.0;
    const commsOk = allocations.comms >= 0.8;
    const lightingOk = allocations.lighting >= 0.3;
    const scienceTargetOk = allocations.science >= phase.requiredScienceKw;
    const roverTargetOk = allocations.rovers >= phase.requiredRoverKw;
    const batterySafe = endBatterySocPct >= 15;

    const isStabilized =
      lifeSupportOk &&
      commsOk &&
      lightingOk &&
      scienceTargetOk &&
      roverTargetOk &&
      batterySafe;

    return {
      totalLoadKw,
      netPowerKw,
      endBatterySocPct,
      lifeSupportOk,
      commsOk,
      lightingOk,
      scienceTargetOk,
      roverTargetOk,
      batterySafe,
      isStabilized,
    };
  }, [allocations, phase]);

  const handleCommitGrid = () => {
    if (gridTelemetry.isStabilized) {
      onCompletePhase?.(phase.id, 50, true);
      const allDone = POWER_SCENARIOS.every(
        (p) => p.id === phase.id || Boolean(completedActivities[p.id])
      );
      if (allDone) {
        onCompleteModule?.('power', 60);
      }
      setStatusFeedback({
        ok: true,
        title: `MICROGRID STABILIZED // ${phase.name}`,
        msg: `Bus load (${gridTelemetry.totalLoadKw} kW) vs. solar supply (${phase.availableSolarKw} kW) maintains ${gridTelemetry.endBatterySocPct}% battery reserve after ${phase.durationHours}h with all crew & mission requirements satisfied!`,
      });
    } else {
      onCompletePhase?.(phase.id, 0, false);
      const issues = [];
      if (!gridTelemetry.lifeSupportOk) issues.push('Life Support is below 3.0 kW minimum safety floor');
      if (!gridTelemetry.commsOk) issues.push('DTE Communications is below 0.8 kW minimum lock');
      if (!gridTelemetry.lightingOk) issues.push('Habitat Lighting is below 0.3 kW minimum');
      if (!gridTelemetry.scienceTargetOk) issues.push(`Science payload needs at least ${phase.requiredScienceKw} kW in this phase`);
      if (!gridTelemetry.roverTargetOk) issues.push(`Rover charging needs at least ${phase.requiredRoverKw} kW in this phase`);
      if (!gridTelemetry.batterySafe) issues.push(`Battery depletes to ${gridTelemetry.endBatterySocPct}% (<15% emergency floor) over ${phase.durationHours}h`);

      setStatusFeedback({
        ok: false,
        title: 'MICROGRID INSTABILITY DETECTED // ADJUST ALLOCATIONS',
        msg: issues.join(' · '),
      });
    }
  };

  const stabilizedCount = POWER_SCENARIOS.filter((p) => Boolean(completedActivities[p.id])).length;

  return (
    <div className="academy-module-workspace" aria-label="Module D: Solar Power Master Energy Simulator">
      {/* Header */}
      <div className="amw-header-bar">
        <div>
          <span className="amw-kicker">MODULE D // LUNAR BASE MICROGRID &amp; ENERGY SIMULATOR</span>
          <h2 className="amw-title">Solar Power Master — Habitat Energy Budget</h2>
        </div>
        <div className="amw-telemetry-badge-group">
          <span className="sim-type-tag">ILLUSTRATIVE BASE MODEL + 1,361 W/m² SOLAR CONSTANT</span>
          <span className="sim-progress-pill">{stabilizedCount} / 3 PHASES STABILIZED</span>
        </div>
      </div>

      {/* Phase Selector Tabs */}
      <div className="survival-step-tabs" role="tablist" aria-label="Illumination Phases">
        {POWER_SCENARIOS.map((p, idx) => {
          const isDone = Boolean(completedActivities[p.id]);
          const isActive = idx === phaseIdx;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`survival-step-pill ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
              onClick={() => {
                setPhaseIdx(idx);
                setStatusFeedback(null);
              }}
            >
              <b>{p.name}</b>
              {isDone && <CheckCircle2 size={12} className="done-icon" />}
            </button>
          );
        })}
      </div>

      {/* Live Microgrid Telemetry Banner */}
      <div className="power-grid-telemetry-strip">
        <div className="pgt-card">
          <span>SOLAR ARRAY INPUT</span>
          <strong style={{ color: '#ffb14a' }}>{phase.availableSolarKw.toFixed(1)} kW</strong>
          <small>Sun Elevation: {phase.solarElevationDeg >= 0 ? `+${phase.solarElevationDeg}°` : `${phase.solarElevationDeg}°`}</small>
        </div>

        <div className="pgt-card">
          <span>TOTAL HABITAT LOAD</span>
          <strong style={{ color: '#f8fafc' }}>{gridTelemetry.totalLoadKw.toFixed(1)} kW</strong>
          <small>Phase Duration: {phase.durationHours} Hours</small>
        </div>

        <div className="pgt-card">
          <span>NET BUS BALANCE</span>
          <strong style={{ color: gridTelemetry.netPowerKw >= 0 ? '#10b981' : '#f59e0b' }}>
            {gridTelemetry.netPowerKw >= 0 ? `+${gridTelemetry.netPowerKw.toFixed(1)} kW` : `${gridTelemetry.netPowerKw.toFixed(1)} kW`}
          </strong>
          <small>{gridTelemetry.netPowerKw >= 0 ? 'Surplus charging batteries' : 'Drawing from 42 kWh RFC battery'}</small>
        </div>

        <div className="pgt-card">
          <span>END-OF-PHASE BATTERY SoC</span>
          <strong style={{ color: gridTelemetry.batterySafe ? '#5ce1e6' : '#ef4444' }}>
            {gridTelemetry.endBatterySocPct}%
          </strong>
          <small>Min Emergency Floor: 15% SoC</small>
        </div>
      </div>

      {/* Phase Instructions & Sliders */}
      <div className="power-simulator-body">
        <p className="power-phase-brief">{phase.description}</p>

        <div className="power-sliders-list">
          {SUBSYSTEMS.map((sub) => {
            const SubIcon = sub.icon;
            const val = allocations[sub.id];
            let minReq = sub.minSafeKw;
            if (sub.id === 'science') minReq = Math.max(sub.minSafeKw, phase.requiredScienceKw);
            if (sub.id === 'rovers') minReq = Math.max(sub.minSafeKw, phase.requiredRoverKw);
            const isSubOk = val >= minReq;

            return (
              <div key={sub.id} className={`power-subsystem-row ${isSubOk ? 'is-ok' : 'is-deficit'}`}>
                <div className="psr-top">
                  <div className="psr-title-group">
                    <SubIcon size={15} className="psr-icon" />
                    <strong>{sub.name}</strong>
                    <span className="psr-req-tag">MIN REQUIRED: {minReq.toFixed(1)} kW</span>
                  </div>
                  <strong className="psr-kw-readout">{val.toFixed(1)} kW</strong>
                </div>

                <input
                  type="range"
                  min="0"
                  max={sub.maxKw}
                  step={sub.step}
                  value={val}
                  onChange={(e) => handleSliderChange(sub.id, e.target.value)}
                  className="academy-range-slider"
                  aria-label={sub.name}
                />

                <span className="psr-caption">{sub.criticalNote}</span>
              </div>
            );
          })}
        </div>

        <div className="power-commit-row">
          <button type="button" className="power-commit-btn" onClick={handleCommitGrid}>
            <Zap size={15} />
            <span>VERIFY &amp; LOCK MICROGRID CONFIGURATION (+50 XP)</span>
          </button>
        </div>

        {statusFeedback && (
          <div className={`ssc-feedback-box ${statusFeedback.ok ? 'is-optimal' : 'is-hazard'}`} role="status">
            <div className="ssc-fb-header">
              {statusFeedback.ok ? (
                <CheckCircle2 size={18} className="fb-icon is-ok" />
              ) : (
                <AlertTriangle size={18} className="fb-icon is-err" />
              )}
              <strong>{statusFeedback.title}</strong>
              {statusFeedback.ok && <span className="fb-xp-pill">+50 XP EARNED</span>}
            </div>
            <p className="ssc-fb-body">{statusFeedback.msg}</p>
          </div>
        )}
      </div>
    </div>
  );
}
