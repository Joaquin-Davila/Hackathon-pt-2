import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, HelpCircle, CheckCircle2, XCircle } from 'lucide-react';
import { XP_REWARDS } from '../academyState.js';

const COMPARATIVE_EXPERIMENTS = [
  {
    id: 'gravity',
    title: '1. GRAVITY CHALLENGE',
    shortDesc: 'Jump & Drop on Earth (9.81 m/s²) vs. Moon (1.62 m/s²)',
    checkQuestion: 'Why does the astronaut jump 6 times higher on the Moon with the same leg push?',
    options: [
      'Lunar surface gravity (1.62 m/s²) is 1/6th of Earth’s, slowing upward velocity 6x more gently',
      'The astronaut’s mass becomes 0 kg on the Moon',
      'Solar wind pushes the astronaut upward',
    ],
    correctIdx: 0,
    explanation: 'Your mass stays constant, but lunar gravity pulls downward with 1/6th the force—giving you 6x the jump apex!',
  },
  {
    id: 'atmosphere',
    title: '2. ATMOSPHERE EXPERIMENT',
    shortDesc: '1 Bar Air Drag & Blue Sky vs. Exosphere Vacuum',
    checkQuestion: 'When you drop a heavy hammer and a light feather inside the Moon’s vacuum, what happens?',
    options: [
      'Both hit the ground at the exact same instant because there is zero air drag',
      'The feather floats into orbit',
      'The hammer hits 10 seconds before the feather',
    ],
    correctIdx: 0,
    explanation: 'Without air molecules to create aerodynamic drag, gravity accelerates every mass at the exact same rate!',
  },
  {
    id: 'temperature',
    title: '3. TEMPERATURE COMPARISON',
    shortDesc: 'Earth Buffered Climate vs. +121°C / -246°C Lunar Swings',
    checkQuestion: 'Where are the coldest temperatures (-246°C) found on the Moon, and why do we go there?',
    options: [
      'Inside Permanently Shadowed Craters (PSRs), which preserve ancient water-ice (H₂O)',
      'On sunlit equatorial plains',
      'At the center of the nearside',
    ],
    correctIdx: 0,
    explanation: 'Polar crater floors never see the Sun, acting as cryogenic cold traps that store water-ice for astronauts!',
  },
  {
    id: 'dayCycle',
    title: '4. LUNAR DAY VS EARTH DAY',
    shortDesc: '24-Hour Earth Spin vs. 708.7-Hour (29.5-Day) Lunar Cycle',
    checkQuestion: 'How long does a single continuous lunar night last at the Moon’s equator?',
    options: [
      'About 14.7 Earth days (~354 hours) of freezing darkness',
      '12 hours just like Earth',
      'Only 45 minutes',
    ],
    correctIdx: 0,
    explanation: 'One lunar synodic day is 29.53 Earth days (~354h daylight + ~354h night), which is why polar sunlit ridges are so valuable!',
  },
  {
    id: 'tilt',
    title: '5. AXIAL TILT EXPLORER',
    shortDesc: 'Earth 23.44° Seasons vs. Moon 1.54° Grazing Polar Sun',
    checkQuestion: 'Why do high mountain peaks at the Lunar South Pole receive near-continuous sunlight all year?',
    options: [
      'The Moon’s axis is tilted by only 1.54°, so the Sun skims horizontally along the polar horizon year-round',
      'The Moon is tilted by 45° toward the Sun',
      'Giant mirrors in orbit light the South Pole',
    ],
    correctIdx: 0,
    explanation: 'At 1.54° axial obliquity, high polar ridges (+4,200 m) stand above surrounding crater walls to catch horizontal sunlight!',
  },
];

export default function PhysicsArenaGame({
  completedLabs = {},
  onCompleteGame,
  onCompleteComparativeLab,
}) {
  const canvasRef = useRef(null);
  const [activeExpId, setActiveExpId] = useState('gravity');
  const [planet, setPlanet] = useState('moon'); // 'earth' | 'moon'
  const [gravity, setGravity] = useState(1.62);
  const [tempZone, setTempZone] = useState('ridge'); // 'equator' | 'ridge' | 'psr'
  const [synodicHour, setSynodicHour] = useState(180);
  const [tiltAngle, setTiltAngle] = useState(1.54);

  const [hasExperimented, setHasExperimented] = useState(false);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState(null);
  const [microCard, setMicroCard] = useState(null);
  const [showLearnMore, setShowLearnMore] = useState(false);

  const currentExp = COMPARATIVE_EXPERIMENTS.find((e) => e.id === activeExpId) || COMPARATIVE_EXPERIMENTS[0];

  const arenaRef = useRef({
    astroY: 300,
    astroVy: 0,
    jumping: false,
    earthPeakY: null,
    moonPeakY: null,
    trail: [],
    dropping: false,
    hammerY: 65,
    hammerVy: 0,
    featherY: 65,
    featherVy: 0,
  });

  const selectExperiment = (expId) => {
    setActiveExpId(expId);
    setSelectedQuizAnswer(null);
    setHasExperimented(false);
    setMicroCard(null);
    if (expId === 'tilt') setTiltAngle(planet === 'moon' ? 1.54 : 23.44);
  };

  const switchPlanet = (nextPlanet) => {
    setPlanet(nextPlanet);
    const nextG = nextPlanet === 'moon' ? 1.62 : 9.81;
    setGravity(nextG);
    setTiltAngle(nextPlanet === 'moon' ? 1.54 : 23.44);
    setHasExperimented(true);
    arenaRef.current.astroY = 300;
    arenaRef.current.astroVy = 0;
    arenaRef.current.jumping = false;
    arenaRef.current.dropping = false;
    arenaRef.current.hammerY = 65;
    arenaRef.current.featherY = 65;
  };

  const triggerJump = () => {
    const s = arenaRef.current;
    if (s.jumping) return;
    s.astroY = 300;
    s.astroVy = -8.4;
    s.jumping = true;
    s.trail = [];
    setHasExperimented(true);
  };

  const triggerDrop = () => {
    const s = arenaRef.current;
    s.dropping = true;
    s.hammerY = 65;
    s.hammerVy = 0;
    s.featherY = 65;
    s.featherVy = 0;
    setHasExperimented(true);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        triggerJump();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleQuizCheck = (idx) => {
    setSelectedQuizAnswer(idx);
    if (idx === currentExp.correctIdx) {
      onCompleteComparativeLab?.({
        labId: currentExp.id,
        xpEarned: XP_REWARDS.COMPARATIVE_EXPERIMENT,
        coinsEarned: 30,
      });
      onCompleteGame?.({
        gameId: 'physics',
        score: 400,
        xpEarned: XP_REWARDS.COMPARATIVE_EXPERIMENT,
        coinsEarned: 30,
        badgeId: 'gravity-master',
      });
    }
  };

  // 60 FPS Interactive Visual Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let rafId = null;

    const render = () => {
      rafId = requestAnimationFrame(render);
      const s = arenaRef.current;
      const W = canvas.width;
      const H = canvas.height;
      const groundY = 300;
      const gFrame = gravity * 0.042;

      // Update Jumping Astronaut
      if (s.jumping) {
        s.astroVy += gFrame;
        s.astroY += s.astroVy;
        s.trail.push({ x: 220, y: s.astroY });

        if (s.astroY >= groundY) {
          s.astroY = groundY;
          s.astroVy = 0;
          s.jumping = false;
          const minY = Math.min(...s.trail.map((p) => p.y), groundY);
          const jumpMeters = (((groundY - minY) / 40) * 0.5).toFixed(2);
          if (gravity < 3.0) {
            s.moonPeakY = minY;
            setMicroCard({
              headline: `MOON GRAVITY: ${gravity.toFixed(2)} m/s²`,
              subline: `Your jump reached ${(9.81 / gravity).toFixed(1)}x higher (${jumpMeters} m apex)!`,
            });
          } else {
            s.earthPeakY = minY;
            setMicroCard({
              headline: `EARTH GRAVITY: ${gravity.toFixed(2)} m/s²`,
              subline: `Jump apex reached ${jumpMeters} m. Switch to MOON to compare!`,
            });
          }
        }
      }

      // Update Falling Hammer & Feather
      if (s.dropping) {
        s.hammerVy += gFrame;
        s.hammerY = Math.min(groundY + 10, s.hammerY + s.hammerVy);
        const hasAir = planet === 'earth';
        if (hasAir) s.featherVy = Math.min(1.5, s.featherVy + gFrame * 0.24);
        else s.featherVy += gFrame;
        s.featherY = Math.min(groundY + 10, s.featherY + s.featherVy);

        if (s.hammerY >= groundY + 10 && (!hasAir || s.featherY >= groundY + 10)) {
          s.dropping = false;
          setMicroCard({
            headline: planet === 'moon' ? 'VACUUM DROP: IDENTICAL FALL TIME!' : 'AIR DRAG: FEATHER SLOWED BY AIR!',
            subline:
              planet === 'moon'
                ? 'Zero air molecules on the Moon means hammer and feather hit together!'
                : 'Earth’s 1 bar atmosphere slows the feather down.',
          });
        }
      }

      // Background
      if (planet === 'earth') {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#0284c7');
        sky.addColorStop(0.75, '#38bdf8');
        sky.addColorStop(1, '#bae6fd');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#15803d';
        ctx.fillRect(0, groundY + 24, W, H - groundY);
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#070B12');
        sky.addColorStop(1, '#151A1E');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % W, (i * 53) % 240, 2, 2);
        ctx.beginPath();
        ctx.arc(455, 65, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#25BFFF';
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, groundY + 24, W, H - groundY);
      }

      // Jump Peak Markers
      if (s.earthPeakY !== null) {
        ctx.strokeStyle = '#21D69B';
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(80, s.earthPeakY - 24);
        ctx.lineTo(350, s.earthPeakY - 24);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#21D69B';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('🌍 EARTH APEX (1x)', 85, s.earthPeakY - 30);
      }
      if (s.moonPeakY !== null) {
        ctx.strokeStyle = '#FFC247';
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(80, s.moonPeakY - 24);
        ctx.lineTo(350, s.moonPeakY - 24);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#FFC247';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('🌕 MOON APEX (6x HIGHER!)', 85, s.moonPeakY - 30);
      }

      // Left Zone: Astronaut Protagonist
      ctx.save();
      ctx.translate(220, s.astroY);
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#25BFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-15, -10, 30, 32, 7);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -22, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFC247';
      ctx.beginPath();
      ctx.roundRect(-9, -27, 18, 10, 4);
      ctx.fill();
      ctx.restore();

      // Right Zone: Visual Display Based on Active Comparative Experiment
      ctx.save();
      if (activeExpId === 'gravity' || activeExpId === 'atmosphere') {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(540, 38, 320, 284);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(
          planet === 'moon' ? 'VACUUM CHAMBER (0 BAR // NO AIR DRAG)' : 'EARTH ATMOSPHERE (1 BAR AIR DRAG)',
          560,
          28
        );

        // Hammer
        ctx.save();
        ctx.translate(635, s.hammerY);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-14, -8, 28, 12);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-3, 4, 6, 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('🔨 HAMMER', -32, -14);
        ctx.restore();

        // Feather
        const sway = planet === 'earth' && s.dropping ? Math.sin(performance.now() * 0.015) * 14 : 0;
        ctx.save();
        ctx.translate(765 + sway, s.featherY);
        ctx.fillStyle = '#42E8E8';
        ctx.beginPath();
        ctx.ellipse(0, 6, 6, 16, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('🪶 FEATHER', -34, -14);
        ctx.restore();
      } else if (activeExpId === 'temperature') {
        const tempVal =
          planet === 'earth'
            ? '+15°C (BUFFERED BY AIR & OCEANS)'
            : tempZone === 'equator'
            ? '+121°C (SCORCHING SUNLIT REGOLITH)'
            : tempZone === 'ridge'
            ? '-50°C (STABLE POLAR SUNLIT RIDGE)'
            : '-246°C (CRYOGENIC PSR ICE TRAP!)';
        const tempCol =
          planet === 'earth'
            ? '#21D69B'
            : tempZone === 'equator'
            ? '#f43f5e'
            : tempZone === 'ridge'
            ? '#FFC247'
            : '#42E8E8';
        ctx.fillStyle = 'rgba(9,13,22,0.88)';
        ctx.strokeStyle = tempCol;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(520, 65, 350, 210, 14);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = tempCol;
        ctx.font = 'bold 20px monospace';
        ctx.fillText(tempVal.split(' ')[0], 545, 130);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(tempVal, 545, 165);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Select Lunar Zone below to probe temperature!', 545, 210);
      } else if (activeExpId === 'dayCycle') {
        const isDay = synodicHour <= 354;
        ctx.fillStyle = 'rgba(9,13,22,0.88)';
        ctx.strokeStyle = '#FFC247';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(520, 65, 350, 210, 14);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFC247';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`SYNODIC HOUR: ${synodicHour}h / 708.7h`, 545, 115);
        ctx.fillStyle = isDay ? '#21D69B' : '#42E8E8';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(
          isDay ? '☀️ 14.7 EARTH DAYS OF DAYLIGHT' : '🌑 14.7 EARTH DAYS OF DARKNESS',
          545,
          155
        );
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '12px monospace';
        ctx.fillText('Earth rotates in 24h; the Moon takes 708.7h!', 545, 200);
      } else if (activeExpId === 'tilt') {
        ctx.fillStyle = 'rgba(9,13,22,0.88)';
        ctx.strokeStyle = '#42E8E8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(520, 55, 350, 225, 14);
        ctx.fill();
        ctx.stroke();

        // Draw Tilted Globe & Axis
        ctx.save();
        ctx.translate(695, 155);
        ctx.rotate((tiltAngle * Math.PI) / 180);
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -68);
        ctx.lineTo(0, 68);
        ctx.stroke();
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#42E8E8';
        ctx.beginPath();
        ctx.arc(0, 0, 42, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#FFC247';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`AXIAL TILT: ${tiltAngle.toFixed(2)}°`, 540, 85);
      }
      ctx.restore();
    };

    rafId = requestAnimationFrame(render);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [gravity, planet, activeExpId, tempZone, synodicHour, tiltAngle]);

  return (
    <div className="arcade-game-container">
      {/* 1. Comparative Science Lab Experiment Tabs */}
      <div className="csl-tabs-row" role="tablist" aria-label="Comparative Science Lab Experiments">
        {COMPARATIVE_EXPERIMENTS.map((exp) => {
          const isDone = Boolean(completedLabs[exp.id]);
          const isActive = exp.id === activeExpId;
          return (
            <button
              key={exp.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`csl-tab-btn ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
              onClick={() => selectExperiment(exp.id)}
            >
              <strong>{exp.title}</strong>
              {isDone && <CheckCircle2 size={13} className="csl-done-icon" />}
            </button>
          );
        })}
      </div>

      {/* 2. Top Interactive Controls Bar */}
      <div className="arcade-game-hud-bar">
        <div className="planet-switcher-pills">
          <button
            type="button"
            className={`planet-switch-btn ${planet === 'moon' ? 'is-active-moon' : ''}`}
            onClick={() => switchPlanet('moon')}
          >
            🌕 MOON (1.62 m/s² // VACUUM)
          </button>
          <button
            type="button"
            className={`planet-switch-btn ${planet === 'earth' ? 'is-active-earth' : ''}`}
            onClick={() => switchPlanet('earth')}
          >
            🌍 EARTH (9.81 m/s² // 1 BAR AIR)
          </button>
        </div>

        {activeExpId === 'gravity' && (
          <div className="gravity-slider-inline">
            <span>GRAVITY: <b>{gravity.toFixed(2)} m/s²</b></span>
            <input
              type="range"
              min="0.8"
              max="20"
              step="0.1"
              value={gravity}
              onChange={(e) => {
                setGravity(Number(e.target.value));
                setHasExperimented(true);
              }}
              className="arcade-slider"
            />
          </div>
        )}

        {activeExpId === 'temperature' && (
          <div className="planet-switcher-pills">
            {['equator', 'ridge', 'psr'].map((z) => (
              <button
                key={z}
                type="button"
                className={`stage-chip ${tempZone === z ? 'is-active' : ''}`}
                onClick={() => {
                  setPlanet('moon');
                  setTempZone(z);
                  setHasExperimented(true);
                }}
              >
                {z === 'equator' ? '☀️ EQUATOR (+121°C)' : z === 'ridge' ? '⛰️ POLAR RIDGE (-50°C)' : '❄️ PSR CRATER (-246°C)'}
              </button>
            ))}
          </div>
        )}

        {activeExpId === 'dayCycle' && (
          <div className="gravity-slider-inline">
            <span>SCRUB 29.5D LUNAR CYCLE: <b>{synodicHour}h</b></span>
            <input
              type="range"
              min="0"
              max="708"
              step="12"
              value={synodicHour}
              onChange={(e) => {
                setSynodicHour(Number(e.target.value));
                setHasExperimented(true);
              }}
              className="arcade-slider"
            />
          </div>
        )}

        {activeExpId === 'tilt' && (
          <div className="planet-switcher-pills">
            <button
              type="button"
              className={`stage-chip ${Math.abs(tiltAngle - 1.54) < 0.5 ? 'is-active' : ''}`}
              onClick={() => {
                setTiltAngle(1.54);
                setHasExperimented(true);
              }}
            >
              MOON TILT (1.54°)
            </button>
            <button
              type="button"
              className={`stage-chip ${Math.abs(tiltAngle - 23.44) < 0.5 ? 'is-active' : ''}`}
              onClick={() => {
                setTiltAngle(23.44);
                setHasExperimented(true);
              }}
            >
              EARTH TILT (23.44°)
            </button>
          </div>
        )}
      </div>

      {/* 3. Main Visual Physics Canvas */}
      <div className="arcade-canvas-stage">
        <canvas ref={canvasRef} width={920} height={340} className="arcade-canvas" />

        {microCard && (
          <div className="floating-science-toast">
            <Sparkles size={18} className="smp-icon" />
            <div className="fst-text">
              <strong>{microCard.headline}</strong>
              <span>{microCard.subline}</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Action Buttons */}
      <div className="arcade-controls-bar">
        <div className="touch-btn-group">
          <button type="button" className="arcade-touch-btn is-jump" onClick={triggerJump}>
            🚀 JUMP ASTRONAUT! (SPACE)
          </button>
          <button type="button" className="arcade-touch-btn is-gas" onClick={triggerDrop}>
            🔨 DROP HAMMER &amp; FEATHER!
          </button>
          <button
            type="button"
            className="arcade-touch-btn"
            onClick={() => switchPlanet(planet === 'moon' ? 'earth' : 'moon')}
          >
            🔄 SWITCH PLANET ({planet === 'moon' ? 'TO EARTH' : 'TO MOON'})
          </button>
        </div>
      </div>

      {/* 5. Quick Post-Experiment Verification Question (+35 XP) */}
      <div className="csl-quick-check-box">
        <div className="csl-qc-head">
          <Sparkles size={15} className="icon-gold" />
          <span>LAB VERIFICATION CHALLENGE (+{XP_REWARDS.COMPARATIVE_EXPERIMENT} XP):</span>
          <strong>{currentExp.checkQuestion}</strong>
        </div>

        <div className="csl-qc-options">
          {currentExp.options.map((opt, idx) => {
            const isChosen = selectedQuizAnswer === idx;
            const isRight = idx === currentExp.correctIdx;
            let cls = '';
            if (selectedQuizAnswer !== null) {
              if (isRight) cls = 'is-correct';
              else if (isChosen) cls = 'is-wrong';
            }
            return (
              <button
                key={opt}
                type="button"
                className={`csl-qc-btn ${cls}`}
                onClick={() => handleQuizCheck(idx)}
              >
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {selectedQuizAnswer !== null && (
          <div className="csl-qc-feedback">
            {selectedQuizAnswer === currentExp.correctIdx ? (
              <CheckCircle2 size={16} className="icon-cyan" />
            ) : (
              <XCircle size={16} className="icon-red" />
            )}
            <span>{currentExp.explanation}</span>
          </div>
        )}
      </div>
    </div>
  );
}
