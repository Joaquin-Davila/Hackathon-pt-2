import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCcw, Trophy, Sparkles, HelpCircle } from 'lucide-react';

// Lunar terrain vertices with 3 flat landing pads (1x, 2x, 3x multipliers)
const TERRAIN_POINTS = [
  { x: 0, y: 230 },
  { x: 75, y: 295 },
  { x: 140, y: 345, pad: true, mult: 1, label: 'PAD ALPHA (1x)' },
  { x: 255, y: 345 },
  { x: 310, y: 250 },
  { x: 375, y: 195 },
  { x: 430, y: 270, pad: true, mult: 2, label: 'RIDGE PAD (2x)' },
  { x: 525, y: 270 },
  { x: 590, y: 360 },
  { x: 660, y: 382 },
  { x: 715, y: 325, pad: true, mult: 3, label: 'PRO CRATER PAD (3x)' },
  { x: 795, y: 325 },
  { x: 860, y: 240 },
  { x: 920, y: 280 },
];

function getSurfaceInfoAt(x) {
  for (let i = 0; i < TERRAIN_POINTS.length - 1; i++) {
    const p1 = TERRAIN_POINTS[i];
    const p2 = TERRAIN_POINTS[i + 1];
    if (x >= p1.x && x <= p2.x) {
      const t = (x - p1.x) / (p2.x - p1.x);
      const y = p1.y + t * (p2.y - p1.y);
      return {
        y,
        isPad: Boolean(p1.pad),
        mult: p1.mult || 1,
        label: p1.label || '',
      };
    }
  }
  return { y: 350, isPad: false, mult: 1, label: '' };
}

export default function LunarLanderGame({ onCompleteGame }) {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('playing'); // 'playing' | 'won' | 'lost'
  const [outcomeReason, setOutcomeReason] = useState('');
  const [hud, setHud] = useState({
    fuel: 100,
    vSpeed: 0,
    hSpeed: 0,
    angleDeg: 0,
    altitude: 250,
    score: 0,
  });
  const [showLearnMore, setShowLearnMore] = useState(false);

  const keysRef = useRef({ thrust: false, left: false, right: false });
  const landerRef = useRef(null);

  const initLander = useCallback(() => {
    landerRef.current = {
      x: 195 + Math.random() * 420,
      y: 54,
      vx: (Math.random() - 0.5) * 1.1,
      vy: 0.2,
      angle: 0, // 0 = upright
      fuel: 100,
      particles: [],
      score: 0,
    };
    setGameState('playing');
    setOutcomeReason('');
    setShowLearnMore(false);
  }, []);

  useEffect(() => {
    initLander();
  }, [initLander]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        if (['ArrowUp', 'Space'].includes(e.code)) e.preventDefault();
        keysRef.current.thrust = true;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = true;
    };
    const onKeyUp = (e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keysRef.current.thrust = false;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let rafId = null;
    let tick = 0;

    const stars = Array.from({ length: 80 }, (_, i) => ({
      x: (i * 119) % 920,
      y: (i * 71) % 340,
      r: (i % 2) * 0.8 + 0.7,
    }));

    const loop = () => {
      rafId = requestAnimationFrame(loop);
      const s = landerRef.current;
      if (!s) return;

      const W = canvas.width;
      const H = canvas.height;

      if (gameState === 'playing') {
        // Lunar gravity (1.622 m/s² scaled to 60fps arcade units)
        const gravity = 0.024;
        const thrustPower = 0.068;

        if (keysRef.current.left) s.angle = Math.max(-0.85, s.angle - 0.032);
        if (keysRef.current.right) s.angle = Math.min(0.85, s.angle + 0.032);

        if (keysRef.current.thrust && s.fuel > 0) {
          s.vx += Math.sin(s.angle) * thrustPower;
          s.vy -= Math.cos(s.angle) * thrustPower;
          s.fuel = Math.max(0, s.fuel - 0.19);

          // Exhaust flame particles
          for (let i = 0; i < 3; i++) {
            s.particles.push({
              x: s.x - Math.sin(s.angle) * 18,
              y: s.y + Math.cos(s.angle) * 18,
              vx: s.vx - Math.sin(s.angle) * (2.5 + Math.random() * 2) + (Math.random() - 0.5),
              vy: s.vy + Math.cos(s.angle) * (2.5 + Math.random() * 2) + (Math.random() - 0.5),
              life: 20,
              color: Math.random() > 0.4 ? '#FFC247' : '#42E8E8',
            });
          }
        }

        s.vy += gravity;
        s.x = Math.max(25, Math.min(W - 25, s.x + s.vx));
        s.y += s.vy;

        const surf = getSurfaceInfoAt(s.x);
        const altitude = Math.max(0, Math.round(surf.y - (s.y + 18)));

        // Check surface contact
        if (s.y + 18 >= surf.y) {
          s.y = surf.y - 18;
          const vSpd = Math.abs(s.vy * 1.8);
          const hSpd = Math.abs(s.vx * 1.8);
          const tiltDeg = Math.abs((s.angle * 180) / Math.PI);

          const safeLanding = surf.isPad && vSpd <= 2.4 && hSpd <= 1.8 && tiltDeg <= 14;

          if (safeLanding) {
            const precisionBonus = Math.round((2.5 - vSpd) * 250 + s.fuel * 6);
            const finalScore = (400 + precisionBonus) * surf.mult;
            s.score = finalScore;
            setOutcomeReason(`PERFECT TOUCHDOWN ON ${surf.label}! (${vSpd.toFixed(1)} m/s)`);
            setGameState('won');
            // Celebration sparks
            for (let i = 0; i < 32; i++) {
              s.particles.push({
                x: s.x,
                y: s.y,
                vx: (Math.random() - 0.5) * 7,
                vy: -Math.random() * 6,
                life: 40,
                color: i % 2 === 0 ? '#21D69B' : '#FFC247',
              });
            }
            onCompleteGame?.({
              gameId: 'lander',
              score: finalScore,
              xpEarned: 180,
              coinsEarned: 100 * surf.mult,
              badgeId: 'first-landing',
              dailyId: vSpd < 1.8 ? 'daily-touchdown' : null,
            });
          } else {
            let reason = 'CRASHED ON JAGGED CRATER SLOPE!';
            if (surf.isPad && vSpd > 2.4) reason = `HARD IMPACT! VERTICAL SPEED ${vSpd.toFixed(1)} m/s (MAX SAFE: 2.4 m/s)`;
            else if (surf.isPad && tiltDeg > 14) reason = `LANDER TIPPED OVER! TILT ANGLE ${Math.round(tiltDeg)}°`;
            setOutcomeReason(reason);
            setGameState('lost');
            for (let i = 0; i < 36; i++) {
              s.particles.push({
                x: s.x,
                y: s.y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.8) * 7,
                life: 38,
                color: '#f43f5e',
              });
            }
          }
        }

        tick++;
        if (tick % 3 === 0) {
          setHud({
            fuel: Math.round(s.fuel),
            vSpeed: Number((s.vy * 1.8).toFixed(1)),
            hSpeed: Number((s.vx * 1.8).toFixed(1)),
            angleDeg: Math.round((s.angle * 180) / Math.PI),
            altitude,
            score: s.score,
          });
        }
      }

      // Render Scene
      ctx.fillStyle = '#090D16';
      ctx.fillRect(0, 0, W, H);

      // Stars
      ctx.fillStyle = '#ffffff';
      stars.forEach((st) => {
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Lunar Crater Terrain
      ctx.beginPath();
      ctx.moveTo(0, H);
      TERRAIN_POINTS.forEach((pt) => ctx.lineTo(pt.x, pt.y));
      ctx.lineTo(W, H);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 190, 0, H);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fill();

      // Draw Terrain Outline & Glowing Green Landing Pads
      for (let i = 0; i < TERRAIN_POINTS.length - 1; i++) {
        const p1 = TERRAIN_POINTS[i];
        const p2 = TERRAIN_POINTS[i + 1];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineWidth = p1.pad ? 5 : 2.5;
        ctx.strokeStyle = p1.pad ? '#21D69B' : '#42E8E8';
        ctx.stroke();

        if (p1.pad) {
          ctx.fillStyle = '#FFC247';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(p1.label, (p1.x + p2.x) / 2, p1.y + 18);
        }
      }

      // Draw Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        if (p.life <= 0) {
          s.particles.splice(i, 1);
          continue;
        }
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Lunar Lander Spacecraft
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);

      // Landing Legs
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-11, 8);
      ctx.lineTo(-19, 18);
      ctx.moveTo(-23, 18);
      ctx.lineTo(-15, 18);
      ctx.moveTo(11, 8);
      ctx.lineTo(19, 18);
      ctx.moveTo(15, 18);
      ctx.lineTo(23, 18);
      ctx.stroke();

      // Descent Stage Gold Foil Box
      ctx.fillStyle = '#FFC247';
      ctx.fillRect(-13, 0, 26, 10);

      // Ascent Crew Cabin
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#25BFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -6, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cockpit Window
      ctx.fillStyle = '#42E8E8';
      ctx.beginPath();
      ctx.arc(0, -7, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [gameState, onCompleteGame]);

  const vSafe = Math.abs(hud.vSpeed) <= 2.4;

  return (
    <div className="arcade-game-container">
      {/* Top Flight Telemetry HUD */}
      <div className="arcade-game-hud-bar">
        <div className="agh-stat">
          <span>PROPELLANT FUEL</span>
          <div className="agh-bar-track">
            <div className="agh-bar-fill" style={{ width: `${hud.fuel}%`, background: '#FFC247' }} />
          </div>
          <strong>{hud.fuel}%</strong>
        </div>

        <div className="agh-pill" style={{ borderColor: vSafe ? '#21D69B' : '#f43f5e' }}>
          <span>V-SPEED (SAFE ≤ 2.4):</span>
          <strong style={{ color: vSafe ? '#21D69B' : '#f43f5e' }}>{hud.vSpeed} m/s</strong>
        </div>

        <div className="agh-pill is-cyan">
          <span>TILT ANGLE:</span>
          <strong>{hud.angleDeg}°</strong>
        </div>

        <div className="agh-pill is-gold">
          <span>ALTITUDE:</span>
          <strong>{hud.altitude} m</strong>
        </div>
      </div>

      {/* Main Playable Lander Canvas */}
      <div className="arcade-canvas-stage">
        <canvas ref={canvasRef} width={920} height={410} className="arcade-canvas" />

        {gameState !== 'playing' && (
          <div className="arcade-result-overlay">
            <div className="arcade-result-card">
              <Trophy size={40} className={gameState === 'won' ? 'icon-gold' : 'icon-red'} />
              <h2>{gameState === 'won' ? 'THE EAGLE HAS LANDED!' : 'LUNAR MODULE CRASHED!'}</h2>
              <p className="result-score-line">{outcomeReason}</p>
              {gameState === 'won' && (
                <p className="result-score-line">
                  PRECISION SCORE: <strong>{hud.score}</strong>
                </p>
              )}

              <div className="science-micro-popup">
                <Sparkles size={16} className="smp-icon" />
                <div>
                  <strong>VACUUM DESCENT (g = 1.62 m/s² // NO AIR DRAG)</strong>
                  <p>
                    Because the Moon has no atmosphere, parachutes cannot open—100% of your braking must come from rocket thrust!
                  </p>
                </div>
              </div>

              {showLearnMore && (
                <div className="science-learn-more-box">
                  In a vacuum, Newton’s Third Law (rocket exhaust pushing downward to accelerate the craft upward) is the only way to counter lunar gravity (1.622 m/s²) and touch down at less than 2.4 m/s.
                </div>
              )}

              <div className="arcade-result-actions">
                <button type="button" className="arcade-btn is-secondary" onClick={() => setShowLearnMore((v) => !v)}>
                  <HelpCircle size={15} />
                  <span>{showLearnMore ? 'HIDE SCIENCE' : 'LEARN MORE'}</span>
                </button>
                <button type="button" className="arcade-btn is-primary" onClick={initLander}>
                  <RotateCcw size={15} />
                  <span>FLY AGAIN</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tactile Arcade Thruster Controls */}
      <div className="arcade-controls-bar">
        <div className="touch-btn-group">
          <button
            type="button"
            className="arcade-touch-btn"
            onPointerDown={() => { keysRef.current.left = true; }}
            onPointerUp={() => { keysRef.current.left = false; }}
            onPointerLeave={() => { keysRef.current.left = false; }}
          >
            ↺ TILT LEFT (A / ←)
          </button>

          <button
            type="button"
            className="arcade-touch-btn is-jump"
            onPointerDown={() => { keysRef.current.thrust = true; }}
            onPointerUp={() => { keysRef.current.thrust = false; }}
            onPointerLeave={() => { keysRef.current.thrust = false; }}
          >
            🔥 MAIN DESCENT ENGINE (W / ↑ / SPACE)
          </button>

          <button
            type="button"
            className="arcade-touch-btn"
            onPointerDown={() => { keysRef.current.right = true; }}
            onPointerUp={() => { keysRef.current.right = false; }}
            onPointerLeave={() => { keysRef.current.right = false; }}
          >
            TILT RIGHT ↻ (D / →)
          </button>
        </div>

        <button type="button" className="arcade-mini-reset" onClick={initLander}>
          <RotateCcw size={14} /> NEW DESCENT
        </button>
      </div>
    </div>
  );
}
