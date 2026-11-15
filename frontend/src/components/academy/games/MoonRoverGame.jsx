import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Trophy, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';

const STAGES = [
  { id: 1, name: 'STAGE 1 // SHACKLETON RIDGE', distance: 1200, boulderCount: 9, speedMult: 1.0 },
  { id: 2, name: 'STAGE 2 // HAWORTH SHADOW RUN', distance: 1600, boulderCount: 14, speedMult: 1.15 },
  { id: 3, name: 'STAGE 3 // MALAPERT EXTREME', distance: 2000, boulderCount: 19, speedMult: 1.3 },
];

// Elevation function modeling ridges (+4200m sunlit) and PSR crater bowls (-1400m shadowed)
function getTerrainY(worldX, stageId = 1) {
  const base = 315;
  const ridge1 = Math.sin(worldX * 0.0045) * 42;
  const craterBowl = Math.cos(worldX * 0.011 + stageId) * 28;
  const micro = Math.sin(worldX * 0.026) * 8;
  return base + ridge1 + craterBowl + micro;
}

function getTerrainSlope(worldX, stageId = 1) {
  const y1 = getTerrainY(worldX - 4, stageId);
  const y2 = getTerrainY(worldX + 4, stageId);
  return Math.atan2(y2 - y1, 8);
}

export default function MoonRoverGame({ onCompleteGame, bestScore = 0 }) {
  const canvasRef = useRef(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [gameState, setGameState] = useState('playing'); // 'playing' | 'won' | 'lost'
  const [hud, setHud] = useState({
    hp: 100,
    battery: 100,
    samples: 0,
    score: 0,
    progressPct: 0,
    inSunlight: true,
    elevationM: 4120,
  });
  const [showLearnMore, setShowLearnMore] = useState(false);

  const keysRef = useRef({ left: false, right: false, jump: false });
  const simRef = useRef(null);

  const stage = STAGES[stageIdx];

  const initSim = useCallback((stg) => {
    const items = [];
    const obstacles = [];

    // Populate ice cores & battery cells along the lunar terrain
    for (let x = 220; x < stg.distance * 4 - 250; x += 170) {
      const isBattery = x % 510 === 0;
      const ty = getTerrainY(x, stg.id);
      items.push({
        x,
        y: ty - (isBattery ? 46 : 38),
        type: isBattery ? 'battery' : 'sample',
        collected: false,
      });
    }

    // Populate crater boulders
    const step = Math.floor((stg.distance * 4 - 450) / stg.boulderCount);
    for (let i = 0; i < stg.boulderCount; i++) {
      const bx = 360 + i * step + ((i * 73) % 90);
      const by = getTerrainY(bx, stg.id);
      obstacles.push({
        x: bx,
        y: by - 14,
        radius: 16 + (i % 3) * 4,
        hit: false,
      });
    }

    simRef.current = {
      x: 80,
      y: getTerrainY(80, stg.id) - 24,
      vx: 0,
      vy: 0,
      angle: 0,
      grounded: true,
      hp: 100,
      battery: 100,
      samples: 0,
      score: 0,
      targetX: stg.distance * 4,
      items,
      obstacles,
      particles: [],
      popups: [],
      shake: 0,
      wheelPhase: 0,
    };
    setGameState('playing');
    setShowLearnMore(false);
  }, []);

  useEffect(() => {
    initSim(stage);
  }, [stage, initSim]);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = true;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = true;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (['Space', 'ArrowUp'].includes(e.code)) e.preventDefault();
        keysRef.current.jump = true;
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = false;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = false;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keysRef.current.jump = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // 60 FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let rafId = null;
    let hudTick = 0;

    const stars = Array.from({ length: 75 }, (_, i) => ({
      x: (i * 137) % 920,
      y: (i * 61) % 210,
      r: (i % 3) * 0.7 + 0.7,
    }));

    const render = () => {
      rafId = requestAnimationFrame(render);
      const s = simRef.current;
      if (!s) return;

      const W = canvas.width;
      const H = canvas.height;

      if (gameState === 'playing') {
        const accel = 0.26 * stage.speedMult;
        const maxSpeed = 6.8 * stage.speedMult;

        if (keysRef.current.right && s.battery > 0) {
          s.vx = Math.min(maxSpeed, s.vx + accel);
          s.battery = Math.max(0, s.battery - 0.042);
        } else if (keysRef.current.left && s.battery > 0) {
          s.vx = Math.max(-3.5, s.vx - accel * 0.9);
          s.battery = Math.max(0, s.battery - 0.03);
        } else {
          s.vx *= 0.975;
        }

        const groundY = getTerrainY(s.x, stage.id) - 22;
        const slope = getTerrainSlope(s.x, stage.id);

        // Low lunar gravity (1.62 m/s² scaled for crisp 60fps arcade feel)
        const lunarGravity = 0.19;
        if (keysRef.current.jump && s.grounded && s.battery > 3) {
          s.vy = -6.9;
          s.grounded = false;
          s.battery = Math.max(0, s.battery - 2.5);
          // Thruster burst particles
          for (let i = 0; i < 12; i++) {
            s.particles.push({
              x: s.x - 10 + Math.random() * 20,
              y: s.y + 16,
              vx: (Math.random() - 0.5) * 3 - s.vx * 0.3,
              vy: Math.random() * 2.8 + 1,
              life: 24,
              color: i % 2 === 0 ? '#FFC247' : '#42E8E8',
            });
          }
        }

        s.vy += lunarGravity;
        s.x = Math.max(40, s.x + s.vx);
        s.y += s.vy;

        if (s.y >= groundY) {
          s.y = groundY;
          s.vy = 0;
          s.grounded = true;
          s.angle += (slope - s.angle) * 0.25;
          // Regolith dust kickup when driving fast
          if (Math.abs(s.vx) > 2.2 && Math.random() < 0.45) {
            s.particles.push({
              x: s.x - 18,
              y: s.y + 20,
              vx: -s.vx * 0.4 + (Math.random() - 0.5),
              vy: -Math.random() * 1.5,
              life: 18,
              color: '#94a3b8',
            });
          }
        } else {
          s.grounded = false;
          s.angle *= 0.95;
        }

        s.wheelPhase += s.vx * 0.16;

        // Solar charging on high sunlit ridges vs PSR shadow drain in deep craters
        const currentGroundRaw = getTerrainY(s.x, stage.id);
        const inSunlight = currentGroundRaw < 322; // Elevated ridge is sunlit!
        if (inSunlight) {
          s.battery = Math.min(100, s.battery + 0.055);
        } else {
          // Deep PSR crater shadow drains thermal/battery power
          s.battery = Math.max(0, s.battery - 0.045);
        }

        // Collectibles check
        for (const item of s.items) {
          if (!item.collected && Math.hypot(s.x - item.x, s.y - item.y) < 34) {
            item.collected = true;
            if (item.type === 'sample') {
              s.samples += 1;
              s.score += 150;
              s.popups.push({ x: item.x, y: item.y, text: '+150 ICE SAMPLE!', color: '#42E8E8', life: 42 });
            } else {
              s.battery = Math.min(100, s.battery + 35);
              s.score += 100;
              s.popups.push({ x: item.x, y: item.y, text: '+35% SOLAR CELL!', color: '#FFC247', life: 42 });
            }
          }
        }

        // Boulders collision check
        for (const obs of s.obstacles) {
          if (!obs.hit && Math.hypot(s.x - obs.x, s.y - obs.y) < obs.radius + 18) {
            obs.hit = true;
            s.hp = Math.max(0, s.hp - 24);
            s.vx = -2.2;
            s.vy = -3.2;
            s.shake = 12;
            s.popups.push({ x: obs.x, y: obs.y - 16, text: '-24 HP CRATER ROCK!', color: '#f43f5e', life: 40 });
            for (let i = 0; i < 14; i++) {
              s.particles.push({
                x: obs.x,
                y: obs.y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.8) * 5,
                life: 25,
                color: '#f43f5e',
              });
            }
          }
        }

        // Win / Lose checks
        if (s.x >= s.targetX) {
          const finalBonus = Math.round(s.hp * 3 + s.battery * 2 + s.samples * 150);
          s.score += finalBonus;
          setGameState('won');
          onCompleteGame?.({
            gameId: 'rover',
            score: s.score,
            xpEarned: 150 + stageIdx * 40,
            coinsEarned: 80 + s.samples * 15,
            badgeId: 'crater-explorer',
            dailyId: s.samples >= 5 ? 'daily-samples' : null,
          });
        } else if (s.hp <= 0 || (s.battery <= 0.1 && Math.abs(s.vx) < 0.15)) {
          setGameState('lost');
        }

        hudTick++;
        if (hudTick % 4 === 0) {
          const elevM = Math.round(4200 - (currentGroundRaw - 260) * 45);
          setHud({
            hp: Math.round(s.hp),
            battery: Math.round(s.battery),
            samples: s.samples,
            score: Math.round(s.score),
            progressPct: Math.min(100, Math.round((s.x / s.targetX) * 100)),
            inSunlight,
            elevationM: elevM,
          });
        }
      }

      // Draw Scene
      ctx.save();
      if (s.shake > 0) {
        ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
        s.shake *= 0.85;
      }

      // 1. Deep Space Sky Background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, '#090D16');
      skyGrad.addColorStop(0.65, '#101827');
      skyGrad.addColorStop(1, '#151A1E');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      ctx.fillStyle = '#ffffff';
      stars.forEach((st) => {
        ctx.globalAlpha = 0.55 + Math.sin(performance.now() * 0.003 + st.x) * 0.3;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Distant Earth on the Lunar Horizon + Low Grazing Polar Sun
      ctx.save();
      ctx.beginPath();
      ctx.arc(W - 130, 82, 26, 0, Math.PI * 2);
      const earthGrad = ctx.createRadialGradient(W - 136, 76, 4, W - 130, 82, 26);
      earthGrad.addColorStop(0, '#42E8E8');
      earthGrad.addColorStop(0.6, '#25BFFF');
      earthGrad.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = earthGrad;
      ctx.shadowColor = '#25BFFF';
      ctx.shadowBlur = 22;
      ctx.fill();
      ctx.restore();

      // Grazing Polar Sun on the left horizon
      ctx.save();
      ctx.beginPath();
      ctx.arc(140, 195, 22, 0, Math.PI * 2);
      ctx.fillStyle = '#FFC247';
      ctx.shadowColor = '#FFC247';
      ctx.shadowBlur = 35;
      ctx.fill();
      ctx.restore();

      const camX = s.x - 190;

      // 2. Distant Parallax Lunar Mountains
      ctx.fillStyle = '#162032';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let sx = 0; sx <= W; sx += 24) {
        const wx = sx + camX * 0.35;
        const my = 235 + Math.sin(wx * 0.003) * 35 + Math.cos(wx * 0.008) * 20;
        ctx.lineTo(sx, my);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();

      // 3. Foreground Interactive Lunar Terrain (Sunlit Ridges vs Shadowed PSR Bowls)
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let sx = 0; sx <= W; sx += 8) {
        const wx = sx + camX;
        ctx.lineTo(sx, getTerrainY(wx, stage.id));
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      const terrainGrad = ctx.createLinearGradient(0, 240, 0, H);
      terrainGrad.addColorStop(0, '#334155');
      terrainGrad.addColorStop(0.5, '#1e293b');
      terrainGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = terrainGrad;
      ctx.fill();

      // Glowing Terrain Top Rim (Golden on sunlit peaks, Cyan/Blue in deep cold PSR craters)
      for (let sx = 0; sx < W; sx += 12) {
        const wx1 = sx + camX;
        const wx2 = sx + 12 + camX;
        const y1 = getTerrainY(wx1, stage.id);
        const y2 = getTerrainY(wx2, stage.id);
        ctx.beginPath();
        ctx.moveTo(sx, y1);
        ctx.lineTo(sx + 12, y2);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = y1 < 322 ? '#FFC247' : '#25BFFF';
        ctx.stroke();
      }

      // 4. Draw Collectibles (Ice Samples & Battery Cells)
      s.items.forEach((item) => {
        if (item.collected) return;
        const ix = item.x - camX;
        if (ix < -40 || ix > W + 40) return;
        const bob = Math.sin(performance.now() * 0.005 + item.x) * 4;
        ctx.save();
        ctx.translate(ix, item.y + bob);
        if (item.type === 'sample') {
          // Glowing Cyan Ice Crystal
          ctx.fillStyle = '#42E8E8';
          ctx.shadowColor = '#42E8E8';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(0, -13);
          ctx.lineTo(10, 0);
          ctx.lineTo(0, 13);
          ctx.lineTo(-10, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          // Golden Solar Battery Cell
          ctx.fillStyle = '#FFC247';
          ctx.shadowColor = '#FFC247';
          ctx.shadowBlur = 14;
          ctx.fillRect(-9, -11, 18, 22);
          ctx.fillStyle = '#101827';
          ctx.font = 'bold 12px monospace';
          ctx.fillText('⚡', -5, 5);
        }
        ctx.restore();
      });

      // 5. Draw Crater Boulders
      s.obstacles.forEach((obs) => {
        const ox = obs.x - camX;
        if (ox < -50 || ox > W + 50) return;
        ctx.save();
        ctx.translate(ox, obs.y);
        ctx.fillStyle = obs.hit ? '#475569' : '#f43f5e';
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // 6. Draw Artemis Finish Beacon
      const goalScreenX = s.targetX - camX;
      if (goalScreenX > -60 && goalScreenX < W + 100) {
        const gy = getTerrainY(s.targetX, stage.id);
        ctx.save();
        ctx.translate(goalScreenX, gy);
        // Laser beacon beam into sky
        const beamGrad = ctx.createLinearGradient(0, 0, 0, -240);
        beamGrad.addColorStop(0, 'rgba(33, 214, 155, 0.65)');
        beamGrad.addColorStop(1, 'rgba(33, 214, 155, 0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(-16, -240, 32, 240);

        ctx.fillStyle = '#21D69B';
        ctx.fillRect(-4, -75, 8, 75);
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#FFC247';
        ctx.fillText('🏁 ARTEMIS BASE', -46, -85);
        ctx.restore();
      }

      // 7. Draw Player Lunar Rover
      const rx = s.x - camX;
      const ry = s.y;
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(s.angle);

      // Headlight beam
      const beam = ctx.createLinearGradient(20, -4, 135, 18);
      beam.addColorStop(0, 'rgba(66, 232, 232, 0.38)');
      beam.addColorStop(1, 'rgba(66, 232, 232, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(22, -6);
      ctx.lineTo(135, -24);
      ctx.lineTo(135, 22);
      ctx.closePath();
      ctx.fill();

      // Rover Chassis
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#25BFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-28, -14, 56, 22, 6);
      ctx.fill();
      ctx.stroke();

      // Astronaut Cockpit Dome
      ctx.fillStyle = '#42E8E8';
      ctx.beginPath();
      ctx.arc(4, -15, 11, Math.PI, 0);
      ctx.fill();

      // Solar Panel Mast on Rover Roof
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-14, -14);
      ctx.lineTo(-14, -29);
      ctx.stroke();
      ctx.fillStyle = hud.inSunlight ? '#FFC247' : '#3b82f6';
      ctx.fillRect(-26, -33, 24, 6);

      // 3 Articulated Rover Wheels
      [-19, 0, 19].forEach((wx) => {
        ctx.save();
        ctx.translate(wx, 12);
        ctx.rotate(s.wheelPhase);
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#FFC247';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(6, 0);
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();

      // 8. Particles & Floating Score Popups
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
        ctx.globalAlpha = p.life / 25;
        ctx.beginPath();
        ctx.arc(p.x - camX, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (let i = s.popups.length - 1; i >= 0; i--) {
        const pop = s.popups[i];
        pop.y -= 0.9;
        pop.life -= 1;
        if (pop.life <= 0) {
          s.popups.splice(i, 1);
          continue;
        }
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, pop.x - camX - 30, pop.y);
      }

      ctx.restore();
    };

    rafId = requestAnimationFrame(render);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [gameState, stage, stageIdx, onCompleteGame, hud.inSunlight]);

  return (
    <div className="arcade-game-container">
      {/* Top Game HUD */}
      <div className="arcade-game-hud-bar">
        <div className="agh-stat">
          <span>ROVER HULL</span>
          <div className="agh-bar-track">
            <div className="agh-bar-fill" style={{ width: `${hud.hp}%`, background: '#21D69B' }} />
          </div>
          <strong>{hud.hp}%</strong>
        </div>

        <div className="agh-stat">
          <span>SOLAR BATTERY {hud.inSunlight ? '☀️ CHARGING' : '❄️ PSR SHADOW'}</span>
          <div className="agh-bar-track">
            <div className="agh-bar-fill" style={{ width: `${hud.battery}%`, background: '#FFC247' }} />
          </div>
          <strong>{hud.battery}%</strong>
        </div>

        <div className="agh-pill is-cyan">
          <span>💎 ICE CORES:</span>
          <strong>{hud.samples}</strong>
        </div>

        <div className="agh-pill is-gold">
          <span>🏆 SCORE:</span>
          <strong>{hud.score}</strong>
        </div>

        <div className="agh-stage-pills">
          {STAGES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              className={`stage-chip ${stageIdx === idx ? 'is-active' : ''}`}
              onClick={() => setStageIdx(idx)}
            >
              LVL {s.id}
            </button>
          ))}
        </div>
      </div>

      {/* Main Playable 2D Canvas */}
      <div className="arcade-canvas-stage">
        <canvas ref={canvasRef} width={920} height={410} className="arcade-canvas" />

        {/* Live Route Progress Overlay */}
        <div className="canvas-top-overlay">
          <span className="cto-badge">
            ALTITUDE: <b>{hud.elevationM} m</b> ({hud.inSunlight ? 'SUNLIT RIDGE' : 'COLD CRATER BOWL'})
          </span>
          <span className="cto-badge">
            BEACON DISTANCE: <b>{hud.progressPct}%</b>
          </span>
        </div>

        {/* Victory / Defeat Arcade Modal Overlay */}
        {gameState !== 'playing' && (
          <div className="arcade-result-overlay">
            <div className="arcade-result-card">
              <Trophy size={40} className={gameState === 'won' ? 'icon-gold' : 'icon-red'} />
              <h2>{gameState === 'won' ? 'MISSION ACCOMPLISHED!' : 'ROVER IMMOBILIZED!'}</h2>
              <p className="result-score-line">
                FINAL SCORE: <strong>{hud.score}</strong> · ICE SAMPLES: <strong>{hud.samples}</strong>
              </p>

              {/* Micro 1-2 sentence Science Insight integrated into gameplay */}
              <div className="science-micro-popup">
                <Sparkles size={16} className="smp-icon" />
                <div>
                  <strong>LUNAR SOUTH POLE ELEVATION: +4,200 m vs. -1,400 m</strong>
                  <p>
                    Sunlit mountain ridges recharge your solar panels continuously, while deep Permanently Shadowed Craters (-238°C) block sunlight and drain batteries!
                  </p>
                </div>
              </div>

              {showLearnMore && (
                <div className="science-learn-more-box">
                  NASA’s LRO LOLA laser altimeter mapped these exact elevation swings at Shackleton Crater. Rovers harvest water-ice inside shadowed craters, then climb back onto sunlit ridges to warm up and recharge!
                </div>
              )}

              <div className="arcade-result-actions">
                <button type="button" className="arcade-btn is-secondary" onClick={() => setShowLearnMore((v) => !v)}>
                  <HelpCircle size={15} />
                  <span>{showLearnMore ? 'HIDE SCIENCE' : 'LEARN MORE'}</span>
                </button>
                <button type="button" className="arcade-btn is-primary" onClick={() => initSim(stage)}>
                  <RotateCcw size={15} />
                  <span>PLAY AGAIN</span>
                </button>
                {gameState === 'won' && stageIdx < STAGES.length - 1 && (
                  <button
                    type="button"
                    className="arcade-btn is-gold"
                    onClick={() => setStageIdx((i) => i + 1)}
                  >
                    <span>NEXT STAGE</span>
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tactile Touch / Mouse & Keyboard Arcade Controls Bar */}
      <div className="arcade-controls-bar">
        <div className="touch-btn-group">
          <button
            type="button"
            className="arcade-touch-btn"
            onPointerDown={() => { keysRef.current.left = true; }}
            onPointerUp={() => { keysRef.current.left = false; }}
            onPointerLeave={() => { keysRef.current.left = false; }}
          >
            ◀ BRAKE / REV (A / ←)
          </button>

          <button
            type="button"
            className="arcade-touch-btn is-jump"
            onPointerDown={() => { keysRef.current.jump = true; }}
            onPointerUp={() => { keysRef.current.jump = false; }}
            onPointerLeave={() => { keysRef.current.jump = false; }}
          >
            🚀 1/6G THRUSTER JUMP (SPACE)
          </button>

          <button
            type="button"
            className="arcade-touch-btn is-gas"
            onPointerDown={() => { keysRef.current.right = true; }}
            onPointerUp={() => { keysRef.current.right = false; }}
            onPointerLeave={() => { keysRef.current.right = false; }}
          >
            ACCELERATE ▶ (D / →)
          </button>
        </div>

        <button type="button" className="arcade-mini-reset" onClick={() => initSim(stage)}>
          <RotateCcw size={14} /> RESTART RUN
        </button>
      </div>
    </div>
  );
}
