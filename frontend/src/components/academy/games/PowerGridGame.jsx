import React, { useState, useEffect } from 'react';
import { Zap, Sun, Battery, AlertTriangle, RotateCcw, Trophy, Sparkles, HelpCircle } from 'lucide-react';

const LIGHT_MODES = [
  { id: 'peak', label: '☀️ PEAK SUN (100%)', mult: 1.0, skyColor: '#1e293b', sunColor: '#FFC247' },
  { id: 'grazing', label: '🌤️ RIDGE SHADOW (50%)', mult: 0.5, skyColor: '#0f172a', sunColor: '#f59e0b' },
  { id: 'eclipse', label: '🌑 CRATER ECLIPSE (0%)', mult: 0.0, skyColor: '#060911', sunColor: '#38bdf8' },
];

const INITIAL_PADS = [
  { id: 'pad-1', x: 110, y: 120, item: 'solar', label: 'RIDGE PAD 01' },
  { id: 'pad-2', x: 250, y: 95, item: 'solar', label: 'RIDGE PAD 02' },
  { id: 'pad-3', x: 110, y: 245, item: 'battery', label: 'STORAGE PAD 03' },
  { id: 'pad-4', x: 250, y: 245, item: null, label: 'EXPANSION PAD 04' },
  { id: 'pad-5', x: 390, y: 110, item: null, label: 'PEAK PAD 05' },
];

const INITIAL_MODULES = [
  { id: 'hab', name: '🏠 CREW HABITAT', drawKw: 4, active: true, critical: true, x: 640, y: 95, overloaded: false },
  { id: 'eclss', name: '💨 O₂ LIFE SUPPORT', drawKw: 4, active: true, critical: true, x: 640, y: 175, overloaded: false },
  { id: 'comms', name: '📡 EARTH DTE DISH', drawKw: 3, active: true, critical: false, x: 640, y: 255, overloaded: false },
  { id: 'drill', name: '⛏️ ICE CORE DRILL', drawKw: 5, active: true, critical: false, x: 640, y: 335, overloaded: false },
];

export default function PowerGridGame({ onCompleteGame }) {
  const [pads, setPads] = useState(INITIAL_PADS);
  const [modules, setModules] = useState(INITIAL_MODULES);
  const [selectedTool, setSelectedTool] = useState('solar'); // 'solar' | 'battery' | 'clear'
  const [dragTool, setDragTool] = useState(null);
  const [lightIdx, setLightIdx] = useState(0);
  const [batteryCharge, setBatteryCharge] = useState(80);
  const [baseIntegrity, setBaseIntegrity] = useState(100);
  const [timeLeft, setTimeLeft] = useState(35);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('playing'); // 'playing' | 'won' | 'lost'
  const [showLearnMore, setShowLearnMore] = useState(false);

  const lightMode = LIGHT_MODES[lightIdx];
  const solarCount = pads.filter((p) => p.item === 'solar').length;
  const batteryCount = pads.filter((p) => p.item === 'battery').length;

  const maxBatteryCap = 40 + batteryCount * 30;
  const solarOutputKw = Math.round(solarCount * 6 * lightMode.mult);
  const totalDemandKw = modules.reduce(
    (sum, m) => sum + (m.active ? m.drawKw + (m.overloaded ? 4 : 0) : 0),
    0
  );
  const netPowerKw = solarOutputKw - totalDemandKw;

  const resetGame = () => {
    setPads(INITIAL_PADS);
    setModules(INITIAL_MODULES);
    setLightIdx(0);
    setBatteryCharge(80);
    setBaseIntegrity(100);
    setTimeLeft(35);
    setScore(0);
    setGameState('playing');
    setShowLearnMore(false);
  };

  // Place item via Drag-and-Drop or Click
  const handlePlaceOnPad = (padId, toolToPlace = selectedTool) => {
    if (gameState !== 'playing') return;
    setPads((prev) =>
      prev.map((p) =>
        p.id === padId
          ? { ...p, item: toolToPlace === 'clear' ? null : toolToPlace }
          : p
      )
    );
    setScore((s) => s + 25);
  };

  const handleToggleModule = (modId) => {
    if (gameState !== 'playing') return;
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== modId) return m;
        // If overloaded, clicking repairs the overload!
        if (m.overloaded) {
          setScore((s) => s + 80);
          return { ...m, overloaded: false };
        }
        return { ...m, active: !m.active };
      })
    );
  };

  // Real-time 1-second simulation tick
  useEffect(() => {
    if (gameState !== 'playing') return undefined;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          return 0;
        }
        // Automatically cycle illumination at t=24 (grazing) and t=14 (eclipse) and t=5 (peak)
        if (t === 24) setLightIdx(1);
        if (t === 14) setLightIdx(2);
        if (t === 5) setLightIdx(0);
        return t - 1;
      });

      // Random overload event
      setModules((prev) =>
        prev.map((m) => {
          if (m.active && !m.overloaded && Math.random() < 0.06) {
            return { ...m, overloaded: true };
          }
          return m;
        })
      );

      setBatteryCharge((prevBat) => {
        const nextBat = Math.max(0, Math.min(100, prevBat + netPowerKw * 1.8));
        const criticalOff = modules.some((m) => m.critical && !m.active);

        setBaseIntegrity((prevInt) => {
          let nextInt = prevInt;
          if (nextBat <= 0 && netPowerKw < 0) nextInt -= 14;
          if (criticalOff) nextInt -= 12;
          return Math.max(0, nextInt);
        });

        return nextBat;
      });

      setScore((s) => s + (modules.filter((m) => m.active).length * 12));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, netPowerKw, modules]);

  // Check Win / Lose transitions
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (baseIntegrity <= 0) {
      setGameState('lost');
    } else if (timeLeft === 0 && baseIntegrity > 0) {
      const finalScore = score + Math.round(baseIntegrity * 4 + batteryCharge * 2);
      setScore(finalScore);
      setGameState('won');
      onCompleteGame?.({
        gameId: 'power',
        score: finalScore,
        xpEarned: 160,
        coinsEarned: 120,
        badgeId: 'energy-engineer',
      });
    }
  }, [baseIntegrity, timeLeft, gameState, score, batteryCharge, onCompleteGame]);

  return (
    <div className="arcade-game-container">
      {/* Top Game HUD */}
      <div className="arcade-game-hud-bar">
        <div className="agh-stat">
          <span>BASE STABILITY</span>
          <div className="agh-bar-track">
            <div className="agh-bar-fill" style={{ width: `${baseIntegrity}%`, background: '#21D69B' }} />
          </div>
          <strong>{baseIntegrity}%</strong>
        </div>

        <div className="agh-stat">
          <span>BATTERY STORAGE ({maxBatteryCap} kWh)</span>
          <div className="agh-bar-track">
            <div className="agh-bar-fill" style={{ width: `${batteryCharge}%`, background: '#FFC247' }} />
          </div>
          <strong>{Math.round(batteryCharge)}%</strong>
        </div>

        <div className="agh-pill is-cyan">
          <span>⚡ NET GRID:</span>
          <strong style={{ color: netPowerKw >= 0 ? '#21D69B' : '#f43f5e' }}>
            {netPowerKw >= 0 ? `+${netPowerKw} kW` : `${netPowerKw} kW`}
          </strong>
        </div>

        <div className="agh-pill is-gold">
          <span>⏱️ SURVIVAL TIMER:</span>
          <strong>{timeLeft}s</strong>
        </div>
      </div>

      {/* Drag & Drop / Click Build Palette + Illumination Switcher */}
      <div className="power-toolbar-row">
        <div className="power-tools-group">
          <span className="toolbar-label">DRAG OR CLICK TO PLACE:</span>
          <button
            type="button"
            draggable
            onDragStart={() => setDragTool('solar')}
            className={`power-tool-btn ${selectedTool === 'solar' ? 'is-selected' : ''}`}
            onClick={() => setSelectedTool('solar')}
          >
            ☀️ SOLAR TOWER (+6 kW)
          </button>

          <button
            type="button"
            draggable
            onDragStart={() => setDragTool('battery')}
            className={`power-tool-btn ${selectedTool === 'battery' ? 'is-selected' : ''}`}
            onClick={() => setSelectedTool('battery')}
          >
            🔋 BATTERY BANK (+30 kWh)
          </button>
        </div>

        <div className="power-tools-group">
          <span className="toolbar-label">SOLAR PHASE:</span>
          {LIGHT_MODES.map((m, idx) => (
            <button
              key={m.id}
              type="button"
              className={`light-mode-chip ${lightIdx === idx ? 'is-active' : ''}`}
              onClick={() => setLightIdx(idx)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Interactive Power Grid SVG Board */}
      <div className="arcade-canvas-stage power-grid-board" style={{ background: lightMode.skyColor }}>
        <svg viewBox="0 0 880 410" className="power-grid-svg">
          {/* Lunar Horizon Surface */}
          <path d="M 0 380 Q 220 340 450 365 T 880 355 L 880 410 L 0 410 Z" fill="#1e293b" />

          {/* Sun / Eclipse Orb in Sky */}
          <circle
            cx="440"
            cy="52"
            r="26"
            fill={lightMode.sunColor}
            opacity={lightMode.mult === 0 ? 0.25 : 0.95}
          />
          <text x="440" y="94" textAnchor="middle" fill="#f8fafc" fontSize="11" fontFamily="monospace" fontWeight="bold">
            {lightMode.label} — GENERATION: {solarOutputKw} kW / LOAD: {totalDemandKw} kW
          </text>

          {/* Animated Power Lines from Pads to Central Hub (440, 215) */}
          {pads.map((pad) => {
            const active = Boolean(pad.item);
            return (
              <line
                key={`wire-${pad.id}`}
                x1={pad.x}
                y1={pad.y}
                x2={440}
                y2={215}
                stroke={active ? (pad.item === 'solar' ? '#FFC247' : '#21D69B') : '#334155'}
                strokeWidth={active ? 4 : 2}
                strokeDasharray={active ? '8 5' : 'none'}
                className={active ? 'wire-flow-anim' : ''}
              />
            );
          })}

          {/* Animated Power Lines from Central Hub (440, 215) to Habitat Modules */}
          {modules.map((mod) => (
            <line
              key={`modwire-${mod.id}`}
              x1={440}
              y1={215}
              x2={mod.x}
              y2={mod.y}
              stroke={mod.overloaded ? '#f43f5e' : mod.active ? '#42E8E8' : '#334155'}
              strokeWidth={mod.active ? 4 : 2}
              strokeDasharray={mod.active ? '8 5' : 'none'}
              className={mod.active ? 'wire-flow-anim' : ''}
            />
          ))}

          {/* Central Microgrid Hub Core */}
          <g transform="translate(440, 215)">
            <circle r="38" fill="#101827" stroke="#42E8E8" strokeWidth="3.5" />
            <text y="-4" textAnchor="middle" fill="#42E8E8" fontSize="11" fontFamily="monospace" fontWeight="bold">
              GRID CORE
            </text>
            <text y="14" textAnchor="middle" fill="#FFC247" fontSize="12" fontFamily="monospace" fontWeight="bold">
              {netPowerKw >= 0 ? `+${netPowerKw}kW` : `${netPowerKw}kW`}
            </text>
          </g>

          {/* Interactive Left Pads (Drop or Click to build Solar / Battery) */}
          {pads.map((pad) => (
            <g
              key={pad.id}
              transform={`translate(${pad.x}, ${pad.y})`}
              className="interactive-svg-node"
              onClick={() => handlePlaceOnPad(pad.id, selectedTool)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handlePlaceOnPad(pad.id, dragTool || selectedTool)}
            >
              <rect
                x="-62"
                y="-34"
                width="124"
                height="68"
                rx="10"
                fill={pad.item ? '#152238' : '#0f172a'}
                stroke={pad.item === 'solar' ? '#FFC247' : pad.item === 'battery' ? '#21D69B' : '#475569'}
                strokeWidth="2.5"
                strokeDasharray={pad.item ? 'none' : '5 4'}
              />
              <text y="-10" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="bold">
                {pad.item === 'solar' ? '☀️ SOLAR +6kW' : pad.item === 'battery' ? '🔋 BATTERY' : '➕ EMPTY PAD'}
              </text>
              <text y="14" textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontFamily="monospace">
                {pad.item ? 'CLICK TO SWAP' : 'DROP / CLICK HERE'}
              </text>
            </g>
          ))}

          {/* Interactive Right Base Modules (Click to Toggle ON/OFF or Clear Overload!) */}
          {modules.map((mod) => (
            <g
              key={mod.id}
              transform={`translate(${mod.x}, ${mod.y})`}
              className="interactive-svg-node"
              onClick={() => handleToggleModule(mod.id)}
            >
              <rect
                x="-95"
                y="-28"
                width="210"
                height="56"
                rx="10"
                fill={mod.overloaded ? '#450a0a' : mod.active ? '#152238' : '#0f172a'}
                stroke={mod.overloaded ? '#f43f5e' : mod.active ? '#25BFFF' : '#475569'}
                strokeWidth="2.5"
              />
              <text x="10" y="-4" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">
                {mod.name} ({mod.drawKw}kW)
              </text>
              <text
                x="10"
                y="15"
                textAnchor="middle"
                fill={mod.overloaded ? '#fca5a5' : mod.active ? '#21D69B' : '#94a3b8'}
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {mod.overloaded
                  ? '⚠️ OVERLOAD! CLICK TO FIX'
                  : mod.active
                  ? '● ONLINE (CLICK TO SHUTOFF)'
                  : '○ STANDBY (CLICK TO POWER)'}
              </text>
            </g>
          ))}
        </svg>

        {/* Victory / Defeat Overlay */}
        {gameState !== 'playing' && (
          <div className="arcade-result-overlay">
            <div className="arcade-result-card">
              <Trophy size={40} className={gameState === 'won' ? 'icon-gold' : 'icon-red'} />
              <h2>{gameState === 'won' ? 'LUNAR BASE POWERED!' : 'BLACKOUT — LIFE SUPPORT LOST!'}</h2>
              <p className="result-score-line">
                GRID SCORE: <strong>{score}</strong> · BASE STABILITY: <strong>{baseIntegrity}%</strong>
              </p>

              <div className="science-micro-popup">
                <Sparkles size={16} className="smp-icon" />
                <div>
                  <strong>SOLAR CONSTANT: 1,361 W/m² &amp; ECLIPSE SURVIVAL</strong>
                  <p>
                    During polar crater eclipses, solar generation drops to 0 kW—astronauts survive by drawing stored battery power and throttling non-essential drills!
                  </p>
                </div>
              </div>

              {showLearnMore && (
                <div className="science-learn-more-box">
                  At the Lunar South Pole, vertical tracking solar arrays capture low-angle sunlight (~1.5° elevation). Regenerative fuel cells and lithium-ion banks keep habitats warm and oxygenated whenever mountain ridges cast temporary shadows.
                </div>
              )}

              <div className="arcade-result-actions">
                <button type="button" className="arcade-btn is-secondary" onClick={() => setShowLearnMore((v) => !v)}>
                  <HelpCircle size={15} />
                  <span>{showLearnMore ? 'HIDE SCIENCE' : 'LEARN MORE'}</span>
                </button>
                <button type="button" className="arcade-btn is-primary" onClick={resetGame}>
                  <RotateCcw size={15} />
                  <span>PLAY AGAIN</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
