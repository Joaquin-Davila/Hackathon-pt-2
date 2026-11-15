import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, RotateCcw, FileCheck2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { XP_REWARDS } from '../academyState.js';

const BUILDINGS = {
  habitat: {
    id: 'habitat',
    icon: '🏠',
    name: 'HABITAT MODULE',
    cost: 40,
    energyDelta: -4,
    crewDelta: +4,
    dteBonus: 0,
    storageBonus: 0,
    alloyPerSec: 6,
    color: '#25BFFF',
    bestTerrain: 'regolith',
    desc: '+4 Crew (Best on Flat Regolith)',
  },
  solar: {
    id: 'solar',
    icon: '☀️',
    name: 'SOLAR PANELS',
    cost: 30,
    energyDelta: +10,
    crewDelta: 0,
    dteBonus: 0,
    storageBonus: 0,
    alloyPerSec: 4,
    color: '#FFC247',
    bestTerrain: 'ridge',
    desc: '+10 kW on Ridge (0 kW in Dark PSR!)',
  },
  antenna: {
    id: 'antenna',
    icon: '📡',
    name: 'COMMS ANTENNA',
    cost: 55,
    energyDelta: -3,
    crewDelta: 0,
    dteBonus: +45,
    storageBonus: 0,
    alloyPerSec: 10,
    color: '#42E8E8',
    bestTerrain: 'ridge',
    desc: '+45% Earth DTE Link (Best on High Ridge)',
  },
  lab: {
    id: 'lab',
    icon: '🔬',
    name: 'LABORATORY',
    cost: 70,
    energyDelta: -5,
    crewDelta: +2,
    dteBonus: 0,
    storageBonus: 0,
    alloyPerSec: 16,
    color: '#a855f7',
    bestTerrain: 'ice-crater',
    desc: 'Analyzes PSR Water-Ice (+16 Alloy/s)',
  },
  rover: {
    id: 'rover',
    icon: '🚙',
    name: 'LUNAR ROVER',
    cost: 50,
    energyDelta: -2,
    crewDelta: +2,
    dteBonus: +10,
    storageBonus: 0,
    alloyPerSec: 12,
    color: '#21D69B',
    bestTerrain: 'ice-crater',
    desc: 'Explores Craters & Hauls Ice Cores',
  },
  storage: {
    id: 'storage',
    icon: '🔋',
    name: 'ENERGY STORAGE',
    cost: 45,
    energyDelta: +3,
    crewDelta: 0,
    dteBonus: 0,
    storageBonus: +50,
    alloyPerSec: 5,
    color: '#10b981',
    bestTerrain: 'regolith',
    desc: '+50 kWh Eclipse Battery Reserve',
  },
};

const INITIAL_TILES = Array.from({ length: 15 }, (_, idx) => {
  const terrainType =
    idx === 0 || idx === 1 || idx === 5
      ? 'ridge'
      : idx === 7 || idx === 12 || idx === 13
      ? 'ice-crater'
      : idx === 4 || idx === 9
      ? 'steep-slope'
      : 'regolith';

  const terrainLabel =
    terrainType === 'ridge'
      ? '⛰️ SUNLIT RIDGE (+4,200m)'
      : terrainType === 'ice-crater'
      ? '❄️ SHADOWED PSR CRATER'
      : terrainType === 'steep-slope'
      ? '⚠️ STEEP BOULDER SLOPE (18°)'
      : '🌑 FLAT REGOLITH PAD';

  return {
    id: `tile-${idx}`,
    terrainType,
    terrainLabel,
    building: idx === 0 ? 'solar' : idx === 2 ? 'habitat' : idx === 6 ? 'storage' : null,
  };
});

export default function MoonBaseBuilderGame({ onCompleteGame }) {
  const [tiles, setTiles] = useState(INITIAL_TILES);
  const [selectedBuild, setSelectedBuild] = useState('solar');
  const [alloy, setAlloy] = useState(180);
  const [consequenceAlert, setConsequenceAlert] = useState(null);
  const [missionReport, setMissionReport] = useState(null);

  // Evaluate colony telemetry & placement consequences in real time
  const evalColony = tiles.reduce(
    (acc, t) => {
      if (!t.building) return acc;
      const b = BUILDINGS[t.building];
      if (!b) return acc;

      acc.types.add(b.id);
      acc.crew += b.crewDelta;
      acc.storageKwh += b.storageBonus;
      acc.income += b.alloyPerSec;

      // 1. Illumination consequence for Solar Panels
      if (b.id === 'solar') {
        if (t.terrainType === 'ice-crater') {
          acc.warnings.push('Solar Panel inside dark PSR Crater generates 0 kW! Place Solar on Sunlit Ridges.');
        } else if (t.terrainType === 'ridge') {
          acc.energy += 14; // +40% Peak of Eternal Light bonus!
        } else {
          acc.energy += 8;
        }
      } else {
        acc.energy += b.energyDelta;
      }

      // 2. Terrain Slope Hazard consequence
      if (t.terrainType === 'steep-slope') {
        acc.riskScore += 28;
        acc.warnings.push(`${b.name} placed on a 18° Steep Boulder Slope—high structural tip-over risk!`);
      }

      // 3. Earth DTE Communication consequence
      if (b.id === 'antenna') {
        if (t.terrainType === 'ridge') {
          acc.dteLink += 55;
        } else if (t.terrainType === 'ice-crater') {
          acc.dteLink += 5;
          acc.warnings.push('Comms Antenna inside deep crater is blocked by crater walls! Move it to a Sunlit Ridge.');
        } else {
          acc.dteLink += 35;
        }
      } else {
        acc.dteLink += b.dteBonus;
      }

      return acc;
    },
    {
      energy: 0,
      crew: 0,
      dteLink: 35,
      storageKwh: 20,
      income: 10,
      riskScore: 5,
      types: new Set(),
      warnings: [],
    }
  );

  const dtePct = Math.min(100, evalColony.dteLink);
  const safetyPct = Math.max(10, 100 - evalColony.riskScore);

  useEffect(() => {
    const timer = setInterval(() => {
      setAlloy((a) => a + evalColony.income);
    }, 1000);
    return () => clearInterval(timer);
  }, [evalColony.income]);

  const handleTileClick = (tileIdx) => {
    const target = tiles[tileIdx];
    const bDef = BUILDINGS[selectedBuild];
    if (!bDef) return;

    if (target.building === selectedBuild) {
      setTiles((prev) => prev.map((t, i) => (i === tileIdx ? { ...t, building: null } : t)));
      setAlloy((a) => a + Math.floor(bDef.cost * 0.5));
      setConsequenceAlert(null);
      return;
    }

    if (alloy < bDef.cost) return;
    setAlloy((a) => a - bDef.cost);
    setTiles((prev) => prev.map((t, i) => (i === tileIdx ? { ...t, building: selectedBuild } : t)));

    // Immediate scientific consequence feedback on placement!
    if (selectedBuild === 'solar' && target.terrainType === 'ice-crater') {
      setConsequenceAlert({
        type: 'bad',
        msg: '⚠️ POOR ILLUMINATION: Permanently Shadowed Craters receive 0% sunlight! Your Solar Panel produces 0 kW here.',
      });
    } else if (selectedBuild === 'solar' && target.terrainType === 'ridge') {
      setConsequenceAlert({
        type: 'good',
        msg: '☀️ PEAK ILLUMINATION BONUS: Sunlit Ridge (+4,200 m) gives your Solar Array +14 kW continuous power!',
      });
    } else if (target.terrainType === 'steep-slope') {
      setConsequenceAlert({
        type: 'bad',
        msg: '⚠️ TERRAIN HAZARD: Building on an 18° boulder slope increases structural landslide risk!',
      });
    } else if (selectedBuild === 'antenna' && target.terrainType === 'ridge') {
      setConsequenceAlert({
        type: 'good',
        msg: '📡 CLEAR EARTH LINE-OF-SIGHT: High ridge placement maximizes Direct-to-Earth (DTE) telemetry!',
      });
    } else if ((selectedBuild === 'lab' || selectedBuild === 'rover') && target.terrainType === 'ice-crater') {
      setConsequenceAlert({
        type: 'good',
        msg: '❄️ WATER-ICE ACCESS: Placing Labs & Rovers inside PSR craters unlocks direct H₂O ice harvesting!',
      });
    } else {
      setConsequenceAlert({
        type: 'good',
        msg: `✓ ${bDef.name} deployed on ${target.terrainLabel}.`,
      });
    }
  };

  const handleGenerateReport = () => {
    const viabilityScore = Math.min(
      100,
      Math.max(
        20,
        Math.round(
          (evalColony.energy >= 10 ? 25 : 10) +
            dtePct * 0.25 +
            safetyPct * 0.25 +
            Math.min(25, evalColony.types.size * 4.5)
        )
      )
    );

    setMissionReport({
      score: viabilityScore,
      verdict:
        viabilityScore >= 80
          ? 'VIABLE ARTEMIS BASE CAMP // CERTIFIED FOR CREW'
          : 'CONDITIONAL OUTPOST // MITIGATE TERRAIN & POWER RISKS',
      energy: evalColony.energy,
      storageKwh: evalColony.storageKwh,
      dtePct,
      safetyPct,
      crew: evalColony.crew,
      modulesBuilt: evalColony.types.size,
      warnings: evalColony.warnings.slice(0, 3),
    });

    onCompleteGame?.({
      gameId: 'builder',
      score: viabilityScore * 12,
      xpEarned: XP_REWARDS.BASE_DESIGN_FINAL, // +150 XP
      coinsEarned: 150,
      badgeId: 'mission-planner',
      secondaryBadgeId: 'lunar-architect',
    });
  };

  const resetColony = () => {
    setTiles(INITIAL_TILES);
    setAlloy(180);
    setConsequenceAlert(null);
    setMissionReport(null);
  };

  return (
    <div className="arcade-game-container">
      {/* Top Colony Telemetry Bar */}
      <div className="arcade-game-hud-bar">
        <div className="agh-pill is-gold">
          <span>🧱 ALLOY:</span>
          <strong>{alloy} (+{evalColony.income}/s)</strong>
        </div>

        <div className="agh-pill" style={{ borderColor: evalColony.energy >= 0 ? '#FFC247' : '#f43f5e' }}>
          <span>⚡ NET ENERGY:</span>
          <strong style={{ color: evalColony.energy >= 0 ? '#FFC247' : '#f43f5e' }}>
            {evalColony.energy >= 0 ? `+${evalColony.energy} kW` : `${evalColony.energy} kW`}
          </strong>
        </div>

        <div className="agh-pill is-cyan">
          <span>📡 EARTH DTE:</span>
          <strong>{dtePct}%</strong>
        </div>

        <div className="agh-pill" style={{ borderColor: safetyPct >= 75 ? '#21D69B' : '#f43f5e' }}>
          <span>🛡️ TERRAIN SAFETY:</span>
          <strong>{safetyPct}%</strong>
        </div>

        <div className="agh-pill is-purple">
          <span>🏗️ MODULES:</span>
          <strong>{evalColony.types.size} / 6 TYPES</strong>
        </div>
      </div>

      {/* 6-Module Selection Palette */}
      <div className="colony-build-palette is-six-cols">
        {Object.values(BUILDINGS).map((b) => {
          const canAfford = alloy >= b.cost;
          const isSelected = selectedBuild === b.id;
          return (
            <button
              key={b.id}
              type="button"
              className={`colony-build-btn ${isSelected ? 'is-selected' : ''} ${!canAfford ? 'is-poor' : ''}`}
              style={{ '--b-color': b.color }}
              onClick={() => setSelectedBuild(b.id)}
            >
              <span className="cbb-icon">{b.icon}</span>
              <div className="cbb-info">
                <strong>{b.name}</strong>
                <span className="cbb-cost">COST: {b.cost}</span>
                <small>{b.desc}</small>
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Consequence Alert Strip */}
      {consequenceAlert && (
        <div className={`colony-consequence-banner ${consequenceAlert.type === 'bad' ? 'is-bad' : 'is-good'}`}>
          <span>{consequenceAlert.msg}</span>
        </div>
      )}

      {/* Isometric / 2D Visual Lunar Base Grid */}
      <div className="arcade-canvas-stage colony-terrain-stage">
        <div className="colony-sky-banner">
          <span>🌕 SHACKLETON BASE ARCHITECT — PLACE ALL 6 MODULE TYPES ON OPTIMAL TERRAIN!</span>
          <button type="button" className="arcade-btn is-gold" onClick={handleGenerateReport}>
            <FileCheck2 size={15} />
            <span>COMPLETE BASE &amp; GENERATE MISSION REPORT (+{XP_REWARDS.BASE_DESIGN_FINAL} XP)</span>
          </button>
        </div>

        <div className="colony-tiles-grid">
          {tiles.map((t, idx) => {
            const b = t.building ? BUILDINGS[t.building] : null;
            const isBadPlacement =
              (b?.id === 'solar' && t.terrainType === 'ice-crater') ||
              t.terrainType === 'steep-slope' ||
              (b?.id === 'antenna' && t.terrainType === 'ice-crater');

            return (
              <button
                key={t.id}
                type="button"
                className={`colony-tile-card is-${t.terrainType} ${b ? 'has-building' : ''} ${isBadPlacement ? 'is-hazard-tile' : ''}`}
                style={b ? { borderColor: isBadPlacement ? '#f43f5e' : b.color } : undefined}
                onClick={() => handleTileClick(idx)}
              >
                <span className="tile-terrain-tag">{t.terrainLabel}</span>
                {b ? (
                  <div className="tile-building-view">
                    <span className="tbv-emoji">{b.icon}</span>
                    <strong>{b.name}</strong>
                    <span className="tbv-online-dot" style={{ color: isBadPlacement ? '#f43f5e' : '#21D69B' }}>
                      {isBadPlacement ? '⚠️ SUB-OPTIMAL SITE' : '● OPTIMAL LINK'}
                    </span>
                  </div>
                ) : (
                  <div className="tile-empty-prompt">
                    <span>➕ PLACE MODULE</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Visual Mission Report Modal */}
        {missionReport && (
          <div className="arcade-result-overlay">
            <div className="arcade-result-card is-wide-report">
              <Trophy size={40} className="icon-gold" />
              <h2>VISUAL LUNAR MISSION REPORT</h2>
              <p className="result-score-line">{missionReport.verdict}</p>

              <div className="report-visual-bars">
                <div className="rvb-item">
                  <span>VIABILITY SCORE</span>
                  <strong style={{ color: '#FFC247' }}>{missionReport.score} / 100</strong>
                </div>
                <div className="rvb-item">
                  <span>SOLAR &amp; BATTERY</span>
                  <strong style={{ color: '#21D69B' }}>
                    {missionReport.energy >= 0 ? `+${missionReport.energy} kW` : `${missionReport.energy} kW`} ({missionReport.storageKwh} kWh)
                  </strong>
                </div>
                <div className="rvb-item">
                  <span>EARTH DTE COMMS</span>
                  <strong style={{ color: '#42E8E8' }}>{missionReport.dtePct}%</strong>
                </div>
                <div className="rvb-item">
                  <span>TERRAIN SAFETY</span>
                  <strong style={{ color: missionReport.safetyPct >= 75 ? '#21D69B' : '#f43f5e' }}>
                    {missionReport.safetyPct}%
                  </strong>
                </div>
              </div>

              {missionReport.warnings.length > 0 ? (
                <div className="science-learn-more-box">
                  <strong>⚠️ ENGINEERING FEEDBACK:</strong>
                  {missionReport.warnings.map((w, i) => (
                    <div key={i}>• {w}</div>
                  ))}
                </div>
              ) : (
                <div className="science-micro-popup">
                  <CheckCircle2 size={18} className="icon-cyan" />
                  <div>
                    <strong>FLAWLESS POLAR BASE ARCHITECTURE! (+150 XP &amp; MISSION PLANNER BADGE)</strong>
                    <p>
                      Solar Arrays and Antennas sit on sunlit ridges (+4,200 m), Labs &amp; Rovers harvest PSR water-ice, and Habitats rest on safe flat regolith!
                    </p>
                  </div>
                </div>
              )}

              <div className="arcade-result-actions">
                <button type="button" className="arcade-btn is-primary" onClick={() => setMissionReport(null)}>
                  <span>MODIFY BASE DESIGN</span>
                </button>
                <button type="button" className="arcade-btn is-gold" onClick={resetColony}>
                  <RotateCcw size={15} />
                  <span>START NEW COLONY</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
