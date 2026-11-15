import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, RotateCcw, HelpCircle } from 'lucide-react';

const BUILDINGS = {
  solar: {
    id: 'solar',
    icon: '☀️',
    name: 'SOLAR ARRAY',
    cost: 30,
    energyDelta: +8,
    oxygenDelta: 0,
    crewDelta: 0,
    alloyPerSec: 4,
    color: '#FFC247',
    desc: '+8 Energy (Bonus on Ridge Tiles)',
  },
  habitat: {
    id: 'habitat',
    icon: '🏠',
    name: 'HABITAT DOME',
    cost: 45,
    energyDelta: -4,
    oxygenDelta: -3,
    crewDelta: +4,
    alloyPerSec: 6,
    color: '#25BFFF',
    desc: '+4 Astronaut Crew',
  },
  biodome: {
    id: 'biodome',
    icon: '🌱',
    name: 'LIFE SUPPORT',
    cost: 55,
    energyDelta: -4,
    oxygenDelta: +10,
    crewDelta: 0,
    alloyPerSec: 5,
    color: '#21D69B',
    desc: '+10 Oxygen & Water Recycling',
  },
  antenna: {
    id: 'antenna',
    icon: '📡',
    name: 'COMMS ANTENNA',
    cost: 65,
    energyDelta: -3,
    oxygenDelta: 0,
    crewDelta: 0,
    alloyPerSec: 12,
    color: '#42E8E8',
    desc: 'Earth DTE Link (+12 Alloy/s)',
  },
  lab: {
    id: 'lab',
    icon: '🔬',
    name: 'SCIENCE LAB',
    cost: 80,
    energyDelta: -5,
    oxygenDelta: -2,
    crewDelta: +2,
    alloyPerSec: 18,
    color: '#a855f7',
    desc: 'Ice Research (+18 Alloy/s & +2 Crew)',
  },
};

const INITIAL_TILES = Array.from({ length: 15 }, (_, idx) => {
  const terrainType =
    idx === 0 || idx === 4 || idx === 5 ? 'ridge' : idx === 7 || idx === 12 ? 'ice-crater' : 'regolith';
  return {
    id: `tile-${idx}`,
    terrainType,
    terrainLabel:
      terrainType === 'ridge' ? '⛰️ SUNLIT RIDGE' : terrainType === 'ice-crater' ? '❄️ ICE CRATER' : '🌑 REGOLITH PAD',
    building: idx === 0 ? 'solar' : idx === 6 ? 'habitat' : idx === 1 ? 'biodome' : null,
  };
});

export default function MoonBaseBuilderGame({ onCompleteGame }) {
  const [tiles, setTiles] = useState(INITIAL_TILES);
  const [selectedBuild, setSelectedBuild] = useState('solar');
  const [alloy, setAlloy] = useState(140);
  const [colonyGoalMet, setColonyGoalMet] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(false);

  // Compute live colony stats from placed buildings
  const stats = tiles.reduce(
    (acc, t) => {
      if (!t.building) return acc;
      const b = BUILDINGS[t.building];
      if (!b) return acc;
      const ridgeBonus = t.terrainType === 'ridge' && b.id === 'solar' ? 4 : 0;
      const craterBonus = t.terrainType === 'ice-crater' && b.id === 'lab' ? 8 : 0;
      acc.energy += b.energyDelta + ridgeBonus;
      acc.oxygen += b.oxygenDelta;
      acc.crew += b.crewDelta;
      acc.income += b.alloyPerSec + craterBonus;
      acc.count += 1;
      acc.types.add(b.id);
      return acc;
    },
    { energy: 6, oxygen: 6, crew: 0, income: 8, count: 0, types: new Set() }
  );

  // Colony Level (1 to 3)
  const colonyLevel =
    stats.crew >= 12 && stats.types.size >= 5 && stats.energy >= 0 && stats.oxygen >= 0
      ? 3
      : stats.crew >= 6 && stats.count >= 5
      ? 2
      : 1;

  // Resource generation ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setAlloy((prev) => prev + Math.max(4, stats.income));
    }, 1000);
    return () => clearInterval(timer);
  }, [stats.income]);

  // Trigger Victory when Colony reaches Level 3 (12+ Crew & all 5 building types online!)
  useEffect(() => {
    if (colonyLevel === 3 && !colonyGoalMet) {
      setColonyGoalMet(true);
      onCompleteGame?.({
        gameId: 'builder',
        score: stats.crew * 120 + alloy * 2,
        xpEarned: 200,
        coinsEarned: 180,
        badgeId: 'lunar-architect',
      });
    }
  }, [colonyLevel, colonyGoalMet, stats.crew, alloy, onCompleteGame]);

  const handleTileClick = (tileIdx) => {
    const target = tiles[tileIdx];
    const bDef = BUILDINGS[selectedBuild];
    if (!bDef) return;

    // If clicking an occupied tile with the same building, demolish & refund 50%
    if (target.building === selectedBuild) {
      setTiles((prev) => prev.map((t, i) => (i === tileIdx ? { ...t, building: null } : t)));
      setAlloy((a) => a + Math.floor(bDef.cost * 0.5));
      return;
    }

    if (alloy < bDef.cost) return;

    setAlloy((a) => a - bDef.cost);
    setTiles((prev) => prev.map((t, i) => (i === tileIdx ? { ...t, building: selectedBuild } : t)));
  };

  const resetColony = () => {
    setTiles(INITIAL_TILES);
    setAlloy(140);
    setColonyGoalMet(false);
    setShowLearnMore(false);
  };

  return (
    <div className="arcade-game-container">
      {/* Top Colony Telemetry & Resource Bar */}
      <div className="arcade-game-hud-bar">
        <div className="agh-pill is-gold">
          <span>🧱 REGOLITH ALLOY:</span>
          <strong>{alloy} (+{stats.income}/s)</strong>
        </div>

        <div className="agh-pill" style={{ borderColor: stats.energy >= 0 ? '#FFC247' : '#f43f5e' }}>
          <span>⚡ NET POWER:</span>
          <strong style={{ color: stats.energy >= 0 ? '#FFC247' : '#f43f5e' }}>
            {stats.energy >= 0 ? `+${stats.energy}` : stats.energy} kW
          </strong>
        </div>

        <div className="agh-pill" style={{ borderColor: stats.oxygen >= 0 ? '#21D69B' : '#f43f5e' }}>
          <span>💨 OXYGEN:</span>
          <strong style={{ color: stats.oxygen >= 0 ? '#21D69B' : '#f43f5e' }}>
            {stats.oxygen >= 0 ? `+${stats.oxygen}` : stats.oxygen}
          </strong>
        </div>

        <div className="agh-pill is-cyan">
          <span>👨‍🚀 CREW:</span>
          <strong>{stats.crew} / 12 GOAL</strong>
        </div>

        <div className="agh-pill is-purple">
          <span>🏙️ COLONY LVL {colonyLevel}:</span>
          <strong>{stats.types.size} / 5 MODULE TYPES</strong>
        </div>
      </div>

      {/* Building Selection Palette */}
      <div className="colony-build-palette">
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
                <span className="cbb-cost">COST: {b.cost} ALLOY</span>
                <small>{b.desc}</small>
              </div>
            </button>
          );
        })}
      </div>

      {/* Visual Lunar Surface Construction Grid */}
      <div className="arcade-canvas-stage colony-terrain-stage">
        <div className="colony-sky-banner">
          <span>🌕 SHACKLETON BASE SECTOR — CLICK ANY LUNAR TILE TO BUILD!</span>
          <span>GOAL: REACH 12 CREW + BUILD ALL 5 MODULE TYPES WITH POSITIVE POWER &amp; O₂</span>
        </div>

        <div className="colony-tiles-grid">
          {tiles.map((t, idx) => {
            const b = t.building ? BUILDINGS[t.building] : null;
            return (
              <button
                key={t.id}
                type="button"
                className={`colony-tile-card is-${t.terrainType} ${b ? 'has-building' : ''}`}
                style={b ? { borderColor: b.color } : undefined}
                onClick={() => handleTileClick(idx)}
              >
                <span className="tile-terrain-tag">{t.terrainLabel}</span>
                {b ? (
                  <div className="tile-building-view">
                    <span className="tbv-emoji">{b.icon}</span>
                    <strong>{b.name}</strong>
                    <span className="tbv-online-dot">● ONLINE</span>
                  </div>
                ) : (
                  <div className="tile-empty-prompt">
                    <span>➕ BUILD HERE</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Victory Overlay when Colony reaches Metropolis Tier 3 */}
        {colonyGoalMet && (
          <div className="arcade-result-overlay">
            <div className="arcade-result-card">
              <Trophy size={40} className="icon-gold" />
              <h2>ARTEMIS LUNAR COLONY ESTABLISHED!</h2>
              <p className="result-score-line">
                COLONY CREW: <strong>{stats.crew} ASTRONAUTS</strong> · POWER: <strong>+{stats.energy} kW</strong> · O₂: <strong>+{stats.oxygen}</strong>
              </p>

              <div className="science-micro-popup">
                <Sparkles size={16} className="smp-icon" />
                <div>
                  <strong>IN-SITU RESOURCE UTILIZATION (ISRU)</strong>
                  <p>
                    By placing Solar Arrays on sunlit peaks and Science Labs near ice craters, your colony produces its own oxygen, water, and power on the Moon!
                  </p>
                </div>
              </div>

              {showLearnMore && (
                <div className="science-learn-more-box">
                  Launching 1 kg of water from Earth costs tens of thousands of dollars. Harvesting lunar polar water-ice (H₂O) lets astronauts split water into breathable O₂ and hydrogen/oxygen rocket fuel right on the Moon!
                </div>
              )}

              <div className="arcade-result-actions">
                <button type="button" className="arcade-btn is-secondary" onClick={() => setShowLearnMore((v) => !v)}>
                  <HelpCircle size={15} />
                  <span>{showLearnMore ? 'HIDE SCIENCE' : 'LEARN MORE'}</span>
                </button>
                <button type="button" className="arcade-btn is-primary" onClick={() => setColonyGoalMet(false)}>
                  <span>KEEP EXPANDING BASE</span>
                </button>
                <button type="button" className="arcade-btn is-gold" onClick={resetColony}>
                  <RotateCcw size={15} />
                  <span>NEW COLONY</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
