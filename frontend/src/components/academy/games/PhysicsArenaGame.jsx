import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, HelpCircle, Play, RotateCcw } from 'lucide-react';

export default function PhysicsArenaGame({ onCompleteGame }) {
  const canvasRef = useRef(null);
  const [planet, setPlanet] = useState('moon'); // 'earth' | 'moon'
  const [gravity, setGravity] = useState(1.62);
  const [microCard, setMicroCard] = useState(null);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [experimentsDone, setExperimentsDone] = useState({ moonJump: false, earthJump: false, dropTest: false });
  const [score, setScore] = useState(0);

  const arenaRef = useRef({
    astroY: 320,
    astroVy: 0,
    jumping: false,
    peakHeightM: 0,
    earthPeakY: null,
    moonPeakY: null,
    trail: [],
    // Falling objects (Hammer & Feather)
    dropping: false,
    hammerY: 70,
    hammerVy: 0,
    featherY: 70,
    featherVy: 0,
    stars: [
      { x: 230, y: 245, collected: false },
      { x: 230, y: 175, collected: false },
      { x: 230, y: 105, collected: false },
    ],
  });

  const switchPlanet = (nextPlanet) => {
    setPlanet(nextPlanet);
    const nextG = nextPlanet === 'moon' ? 1.62 : 9.81;
    setGravity(nextG);
    arenaRef.current.astroY = 320;
    arenaRef.current.astroVy = 0;
    arenaRef.current.jumping = false;
    arenaRef.current.dropping = false;
    arenaRef.current.hammerY = 70;
    arenaRef.current.featherY = 70;
  };

  const triggerJump = () => {
    const s = arenaRef.current;
    if (s.jumping) return;
    s.astroY = 320;
    s.astroVy = -8.6; // Identical initial leg impulse on both worlds!
    s.jumping = true;
    s.trail = [];
    s.stars.forEach((st) => { st.collected = false; });
  };

  const triggerDrop = () => {
    const s = arenaRef.current;
    s.dropping = true;
    s.hammerY = 70;
    s.hammerVy = 0;
    s.featherY = 70;
    s.featherVy = 0;
  };

  // Keyboard Space to Jump
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

  // Check completion of Physics Arena milestone
  useEffect(() => {
    const doneCount = Object.values(experimentsDone).filter(Boolean).length;
    if (doneCount >= 2) {
      onCompleteGame?.({
        gameId: 'physics',
        score: score + 300,
        xpEarned: 140,
        coinsEarned: 100,
        badgeId: 'gravity-master',
        dailyId: 'daily-jump',
      });
    }
  }, [experimentsDone, score, onCompleteGame]);

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
      const groundY = 320;

      // Scaled gravitational acceleration per frame
      const gFrame = gravity * 0.042;

      // 1. Update Jumping Astronaut Physics
      if (s.jumping) {
        s.astroVy += gFrame;
        s.astroY += s.astroVy;
        s.trail.push({ x: 230, y: s.astroY });

        // Collect floating reward stars during jump
        s.stars.forEach((st) => {
          if (!st.collected && Math.abs(s.astroY - st.y) < 28) {
            st.collected = true;
            setScore((prev) => prev + 50);
          }
        });

        if (s.astroY >= groundY) {
          s.astroY = groundY;
          s.astroVy = 0;
          s.jumping = false;
          const minY = Math.min(...s.trail.map((p) => p.y), groundY);
          const jumpPixels = groundY - minY;
          const jumpMeters = ((jumpPixels / 42) * 0.5).toFixed(2);

          if (gravity < 3.0) {
            s.moonPeakY = minY;
            setExperimentsDone((d) => ({ ...d, moonJump: true }));
            setMicroCard({
              headline: `MOON GRAVITY: ${gravity.toFixed(2)} m/s²`,
              subline: `Your jump reached ${(9.81 / gravity).toFixed(1)}x higher (${jumpMeters} m apex)!`,
              detail:
                'Your leg muscles produce the exact same upward force on both worlds, but because lunar gravity is only 16.5% of Earth’s, you decelerate 6 times slower and soar 6 times higher!',
            });
          } else {
            s.earthPeakY = minY;
            setExperimentsDone((d) => ({ ...d, earthJump: true }));
            setMicroCard({
              headline: `EARTH GRAVITY: ${gravity.toFixed(2)} m/s²`,
              subline: `Strong gravitational pull limits your jump to ${jumpMeters} m!`,
              detail:
                'Now switch to MOON (1.62 m/s²) and jump again to compare your trajectory against the Earth marker!',
            });
          }
        }
      }

      // 2. Update Falling Objects (Hammer vs. Feather)
      if (s.dropping) {
        s.hammerVy += gFrame;
        s.hammerY = Math.min(groundY + 12, s.hammerY + s.hammerVy);

        // On Earth (air drag), feather falls slowly & flutters; on Moon (vacuum), feather accelerates identically to hammer!
        const hasAirDrag = planet === 'earth';
        if (hasAirDrag) {
          s.featherVy = Math.min(1.6, s.featherVy + gFrame * 0.25);
        } else {
          s.featherVy += gFrame;
        }
        s.featherY = Math.min(groundY + 12, s.featherY + s.featherVy);

        if (s.hammerY >= groundY + 12 && (!hasAirDrag || s.featherY >= groundY + 12)) {
          s.dropping = false;
          setExperimentsDone((d) => ({ ...d, dropTest: true }));
          setScore((prev) => prev + 100);
          setMicroCard({
            headline:
              planet === 'moon'
                ? 'APOLLO 15 VACUUM DROP: EQUAL ACCELERATION!'
                : 'EARTH ATMOSPHERE: AIR DRAG SLOWS THE FEATHER!',
            subline:
              planet === 'moon'
                ? 'With zero air resistance on the Moon, hammer and feather hit the ground together!'
                : 'Switch to MOON to see what happens when air resistance is removed!',
            detail:
              'Galileo proved that gravitational acceleration is independent of mass. Commander David Scott verified this live on the Moon during Apollo 15 in 1971 using a geologic hammer and a falcon feather.',
          });
        }
      }

      // 3. Render Background (Earth Blue Sky vs. Moon Deep Space Vacuum)
      if (planet === 'earth') {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#0284c7');
        sky.addColorStop(0.75, '#38bdf8');
        sky.addColorStop(1, '#bae6fd');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);

        // Ground
        ctx.fillStyle = '#15803d';
        ctx.fillRect(0, groundY + 26, W, H - groundY);
        ctx.fillStyle = '#21D69B';
        ctx.fillRect(0, groundY + 26, W, 5);
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#070B12');
        sky.addColorStop(1, '#151A1E');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);

        // Stars & Earth in Lunar Sky
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 45; i++) {
          ctx.fillRect((i * 97) % W, (i * 53) % 260, 2, 2);
        }
        ctx.beginPath();
        ctx.arc(460, 75, 22, 0, Math.PI * 2);
        ctx.fillStyle = '#25BFFF';
        ctx.fill();

        // Lunar Regolith Ground
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, groundY + 26, W, H - groundY);
        ctx.fillStyle = '#42E8E8';
        ctx.fillRect(0, groundY + 26, W, 4);
      }

      // 4. Draw Jump Trajectory Comparison Markers (Earth Peak vs Moon Peak)
      if (s.earthPeakY !== null) {
        ctx.strokeStyle = '#21D69B';
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(90, s.earthPeakY - 26);
        ctx.lineTo(360, s.earthPeakY - 26);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#21D69B';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('🌍 EARTH JUMP PEAK (1x)', 95, s.earthPeakY - 32);
      }

      if (s.moonPeakY !== null) {
        ctx.strokeStyle = '#FFC247';
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(90, s.moonPeakY - 26);
        ctx.lineTo(360, s.moonPeakY - 26);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#FFC247';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('🌕 MOON JUMP PEAK (6x HIGHER!)', 95, s.moonPeakY - 32);
      }

      // Draw Star Collectibles Above Astronaut
      s.stars.forEach((st) => {
        ctx.save();
        ctx.translate(st.x, st.y);
        ctx.fillStyle = st.collected ? 'rgba(255, 194, 71, 0.25)' : '#FFC247';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('⭐', -9, 6);
        ctx.restore();
      });

      // Draw Astronaut Character (Left Zone: X = 230)
      ctx.save();
      ctx.translate(230, s.astroY);
      // Jetpack thruster flame when jumping
      if (s.jumping && s.astroVy < 0) {
        ctx.fillStyle = '#FFC247';
        ctx.beginPath();
        ctx.moveTo(-8, 22);
        ctx.lineTo(8, 22);
        ctx.lineTo(0, 40 + Math.random() * 10);
        ctx.closePath();
        ctx.fill();
      }
      // Spacesuit Body
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#25BFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-16, -12, 32, 34, 8);
      ctx.fill();
      ctx.stroke();
      // Helmet & Gold Visor
      ctx.beginPath();
      ctx.arc(0, -24, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFC247';
      ctx.beginPath();
      ctx.roundRect(-10, -30, 20, 12, 5);
      ctx.fill();
      ctx.restore();

      // 5. Right Zone: Hammer vs. Feather Drop Tower (X = 620 .. 760)
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 2;
      ctx.strokeRect(560, 45, 280, 300);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(
        planet === 'moon' ? 'VACUUM DROP TOWER (0 BAR)' : 'ATMOSPHERIC DROP TOWER (1 BAR)',
        578,
        36
      );

      // Hammer (X = 640)
      ctx.save();
      ctx.translate(640, s.hammerY);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-14, -8, 28, 12);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-3, 4, 6, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('🔨 HAMMER (1.3 kg)', -48, -14);
      ctx.restore();

      // Feather (X = 760)
      const sway = planet === 'earth' && s.dropping ? Math.sin(performance.now() * 0.015) * 14 : 0;
      ctx.save();
      ctx.translate(760 + sway, s.featherY);
      ctx.fillStyle = '#42E8E8';
      ctx.beginPath();
      ctx.ellipse(0, 6, 6, 16, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('🪶 FEATHER (0.003 kg)', -52, -14);
      ctx.restore();
    };

    rafId = requestAnimationFrame(render);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [gravity, planet]);

  return (
    <div className="arcade-game-container">
      {/* Top Interactive Controls Bar */}
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
            🌍 EARTH (9.81 m/s² // AIR DRAG)
          </button>
        </div>

        <div className="gravity-slider-inline">
          <span>GRAVITY SLIDER: <b>{gravity.toFixed(2)} m/s²</b></span>
          <input
            type="range"
            min="0.8"
            max="20"
            step="0.1"
            value={gravity}
            onChange={(e) => setGravity(Number(e.target.value))}
            className="arcade-slider"
          />
        </div>

        <div className="agh-pill is-gold">
          <span>🏆 LAB SCORE:</span>
          <strong>{score}</strong>
        </div>
      </div>

      {/* Main Physics Sandbox Canvas */}
      <div className="arcade-canvas-stage">
        <canvas ref={canvasRef} width={920} height={385} className="arcade-canvas" />

        {/* Floating Micro-Science Card right after experiment */}
        {microCard && (
          <div className="floating-science-toast">
            <Sparkles size={18} className="smp-icon" />
            <div className="fst-text">
              <strong>{microCard.headline}</strong>
              <span>{microCard.subline}</span>
              {showLearnMore && <p className="fst-detail">{microCard.detail}</p>}
            </div>
            <button
              type="button"
              className="arcade-btn is-secondary is-sm"
              onClick={() => setShowLearnMore((v) => !v)}
            >
              <HelpCircle size={13} />
              <span>{showLearnMore ? 'LESS' : 'LEARN MORE'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Big Action Buttons to Experiment First! */}
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
    </div>
  );
}
