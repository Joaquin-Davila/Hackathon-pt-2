import React, { useState } from 'react';
import {
  Scale,
  Compass,
  Thermometer,
  Wind,
  Eye,
  Play,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

// Verified Planetary Constants (NASA NSSDC Lunar & Terrestrial Fact Sheets)
const PLANETARY_METRICS = [
  {
    id: 'gravity',
    parameter: 'SURFACE GRAVITY (g)',
    earthVal: '9.807 m/s² (1.00 g)',
    moonVal: '1.622 m/s² (0.165 g)',
    ratio: '16.5% of Earth',
    explanation:
      'Because the Moon has only 1.23% of Earth’s mass and 27.3% of its radius, surface gravitational acceleration is roughly 1/6th of Earth’s. Your MASS (kg of matter) never changes, but your WEIGHT (gravitational force F = m·g) drops by 83.5%.',
  },
  {
    id: 'atmosphere',
    parameter: 'SURFACE ATMOSPHERIC PRESSURE',
    earthVal: '1.013 bar (N₂ / O₂)',
    moonVal: '3 × 10⁻¹⁵ bar (Exosphere)',
    ratio: 'Ultra-High Vacuum',
    explanation:
      'Earth’s thick atmosphere scatters sunlight into a blue sky, moderates day/night temperatures, and carries sound waves. The Moon’s surface is a collisionless exosphere—the sky is pitch black even at noon, sound cannot travel through open space, and liquid water sublimates instantly.',
  },
  {
    id: 'tilt',
    parameter: 'AXIAL INCLINATION (OBLIQUITY)',
    earthVal: '23.44° (Strong Seasons)',
    moonVal: '1.54° (Nearly Upright)',
    ratio: 'Δ 21.9° Less Tilt',
    explanation:
      'Earth’s 23.44° tilt causes dramatic summer/winter seasons and 6-month polar nights. The Moon’s axis is tilted by just 1.54° relative to the ecliptic—so at the Lunar South Pole, the Sun skims perpetually along the horizon within ±1.54° all year round!',
  },
  {
    id: 'day-cycle',
    parameter: 'SOLAR DAY / NIGHT CYCLE (SYNODIC)',
    earthVal: '24.00 Hours (12h Day / 12h Night)',
    moonVal: '708.7 Hours (29.53 Earth Days)',
    ratio: '14.77 Earth Days per Lunar Night',
    explanation:
      'The Moon is tidally locked to Earth. Away from the poles, a single lunar daytime lasts ~354 hours (14.77 Earth days) followed by ~354 hours of freezing darkness. Only high South Polar mountain ridges escape this two-week night.',
  },
  {
    id: 'temperature',
    parameter: 'SURFACE TEMPERATURE EXTREMES',
    earthVal: '-89°C to +56°C (Mean +15°C)',
    moonVal: '-246°C (PSR) to +121°C (Equator)',
    ratio: '367°C Thermal Swing',
    explanation:
      'Without air or oceans to distribute thermal energy, sunlit lunar regolith heats to +121°C at the equator (~ -50°C to +10°C on polar ridges), while Permanently Shadowed Regions (PSRs) plunge to -246°C (27 K)—among the coldest places in the Solar System.',
  },
  {
    id: 'sky-earth',
    parameter: 'VISIBILITY OF EARTH & SKY',
    earthVal: 'Moon rises & sets every 24h 50m',
    moonVal: 'Earth hangs stationary (±6.7° libration)',
    ratio: 'Tidally Locked Sky Position',
    explanation:
      'From the Moon’s nearside and South Pole, Earth never rises or sets across the sky—it stays in nearly the same spot near the northern horizon (at 89.5°S), slowly nodding by ±6.7° over 27.2 days due to orbital optical libration.',
  },
];

export default function EarthMoonComparison({
  completedActivities = {},
  onCompleteExperiment,
}) {
  // Experiment 1: Interactive Mass vs. Weight & Jump/Drop Physics Lab
  const [massKg, setMassKg] = useState(70);
  const [jumpSimActive, setJumpSimActive] = useState(false);

  // Experiment 2: Axial Tilt & Polar Sun Elevation Interactive Slider
  const [simulatedTiltDeg, setSimulatedTiltDeg] = useState(1.54);

  // Experiment 3: Synodic Day/Night Thermal Scrubber (0 to 708.7 hours)
  const [synodicHour, setSynodicHour] = useState(177); // Noon = 177h

  const earthGravity = 9.807;
  const moonGravity = 1.622;

  const earthWeightN = (massKg * earthGravity).toFixed(1);
  const moonWeightN = (massKg * moonGravity).toFixed(1);
  const apparentMoonKg = (massKg * (moonGravity / earthGravity)).toFixed(1);

  // Vertical jump height assuming 0.45m jump on Earth (v0 = sqrt(2 * g_earth * 0.45) = 2.97 m/s)
  const earthJumpMeters = 0.45;
  const moonJumpMeters = (earthJumpMeters * (earthGravity / moonGravity)).toFixed(2);
  // Time to fall from 10m height in vacuum: t = sqrt(2*h/g)
  const earthFallSec = Math.sqrt((2 * 10) / earthGravity).toFixed(2);
  const moonFallSec = Math.sqrt((2 * 10) / moonGravity).toFixed(2);

  // Synodic temperature calculation for Equator vs South Pole Ridge vs PSR Floor
  const sunPhaseRad = (synodicHour / 708.7) * Math.PI * 2;
  const isLunarDaytime = synodicHour <= 354.35;
  const equatorTempC = isLunarDaytime
    ? Math.round(-100 + Math.sin((synodicHour / 354.35) * Math.PI) * 221)
    : Math.round(-110 - Math.sin(((synodicHour - 354.35) / 354.35) * Math.PI) * 73);
  const polarRidgeTempC = Math.round(-58 + Math.cos(sunPhaseRad) * 14);
  const psrFloorTempC = -238;

  const handleVerifyLab = (expId, xp) => {
    onCompleteExperiment?.(expId, xp);
  };

  return (
    <div className="academy-module-workspace" aria-label="Module B: Earth vs. Moon Comparative Laboratory">
      {/* Header */}
      <div className="amw-header-bar">
        <div>
          <span className="amw-kicker">MODULE B // INTERACTIVE COMPARATIVE PLANETOLOGY LAB</span>
          <h2 className="amw-title">Earth vs. Moon Telemetry &amp; Physics Laboratory</h2>
        </div>
        <div className="amw-telemetry-badge-group">
          <span className="sim-type-tag">REAL ASTROPHYSICAL CONSTANTS (NASA NSSDC / JPL DE440)</span>
        </div>
      </div>

      {/* LAB EXPERIMENT 1: MASS VS. WEIGHT & FREE-FALL GRAVITY SIMULATOR */}
      <section className="lab-experiment-card">
        <div className="lec-header">
          <div className="lec-title-group">
            <Scale size={17} className="lec-icon is-cyan" />
            <div>
              <span className="lec-code">EXPERIMENT B-01 // GRAVITATIONAL DYNAMICS</span>
              <h3 className="lec-title">Mass vs. Weight &amp; 1/6g Kinematics Calculator</h3>
            </div>
          </div>
          {completedActivities['exp-gravity'] ? (
            <span className="lec-done-pill">
              <CheckCircle2 size={12} />
              <span>EXPERIMENT LOGGED (+45 XP)</span>
            </span>
          ) : (
            <button
              type="button"
              className="lec-verify-btn"
              onClick={() => {
                setJumpSimActive(true);
                handleVerifyLab('exp-gravity', 45);
              }}
            >
              <Play size={12} />
              <span>RUN 1/6g KINEMATICS TEST (+45 XP)</span>
            </button>
          )}
        </div>

        <div className="gravity-lab-grid">
          {/* Interactive Mass Input & Slider */}
          <div className="gravity-input-col">
            <label className="gravity-slider-label" htmlFor="cadet-mass-input">
              <span>ENTER TERRESTRIAL MASS (KG):</span>
              <strong className="mass-highlight">{massKg} kg</strong>
            </label>
            <input
              id="cadet-mass-input"
              type="range"
              min="25"
              max="200"
              step="1"
              value={massKg}
              onChange={(e) => {
                setMassKg(Number(e.target.value));
                handleVerifyLab('exp-gravity', 45);
              }}
              className="academy-range-slider"
            />
            <div className="mass-number-input-row">
              <span>PRECISE MASS INPUT (KG):</span>
              <input
                type="number"
                min="1"
                max="500"
                value={massKg}
                onChange={(e) => setMassKg(Math.max(1, Math.min(500, Number(e.target.value) || 70)))}
                className="academy-num-input"
              />
            </div>

            <div className="physics-distinction-note">
              <strong>SCIENTIFIC PRINCIPLE: MASS vs. WEIGHT</strong>
              <p>
                <b>Mass ({massKg} kg)</b> measures the quantity of matter and inertia in your body—it stays <b>{massKg} kg</b> on both Earth and the Moon. <b>Weight (F = m · g)</b> is the gravitational force pulling that mass downward. On the Moon (g = 1.622 m/s²), your weight force is <b>{moonWeightN} N</b> (feeling like <b>{apparentMoonKg} kg</b> on Earth scales).
              </p>
            </div>
          </div>

          {/* Side-by-Side Earth vs Moon Output Cards */}
          <div className="gravity-comparison-col">
            <div className="planet-stat-box is-earth">
              <span className="psb-planet">EARTH (g = 9.81 m/s²)</span>
              <div className="psb-row">
                <span>INVARIANT MASS:</span>
                <b>{massKg} kg</b>
              </div>
              <div className="psb-row">
                <span>WEIGHT FORCE:</span>
                <b>{earthWeightN} N ({massKg}.0 kgf)</b>
              </div>
              <div className="psb-row">
                <span>VERTICAL JUMP APEX:</span>
                <b>{earthJumpMeters} m</b>
              </div>
              <div className="psb-row">
                <span>10m VACUUM DROP TIME:</span>
                <b>{earthFallSec} sec</b>
              </div>
            </div>

            <div className="planet-stat-box is-moon">
              <span className="psb-planet">MOON (g = 1.62 m/s²)</span>
              <div className="psb-row">
                <span>INVARIANT MASS:</span>
                <b>{massKg} kg (UNCHANGED)</b>
              </div>
              <div className="psb-row">
                <span>WEIGHT FORCE:</span>
                <b className="is-cyan">{moonWeightN} N ({apparentMoonKg} kgf)</b>
              </div>
              <div className="psb-row">
                <span>VERTICAL JUMP APEX:</span>
                <b className="is-amber">{moonJumpMeters} m (6.0× HIGHER)</b>
              </div>
              <div className="psb-row">
                <span>10m VACUUM DROP TIME:</span>
                <b className="is-cyan">{moonFallSec} sec (2.46× SLOWER)</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LAB EXPERIMENT 2: AXIAL TILT & SYNODIC THERMAL CYCLE */}
      <div className="lab-dual-experiments-row">
        {/* Axial Inclination Simulator */}
        <section className="lab-experiment-card">
          <div className="lec-header">
            <div className="lec-title-group">
              <Compass size={16} className="lec-icon is-amber" />
              <div>
                <span className="lec-code">EXPERIMENT B-02 // AXIAL OBLIQUITY</span>
                <h3 className="lec-title">Why the South Pole Has “Peaks of Eternal Light”</h3>
              </div>
            </div>
            {completedActivities['exp-tilt'] && (
              <span className="lec-done-pill">
                <CheckCircle2 size={12} />
                <span>+40 XP</span>
              </span>
            )}
          </div>

          <div className="tilt-preset-btns">
            <button
              type="button"
              className={`tilt-preset-btn ${Math.abs(simulatedTiltDeg - 1.54) < 0.2 ? 'is-active' : ''}`}
              onClick={() => {
                setSimulatedTiltDeg(1.54);
                handleVerifyLab('exp-tilt', 40);
              }}
            >
              MOON ACTUAL TILT (1.54°)
            </button>
            <button
              type="button"
              className={`tilt-preset-btn ${Math.abs(simulatedTiltDeg - 23.44) < 0.2 ? 'is-active' : ''}`}
              onClick={() => {
                setSimulatedTiltDeg(23.44);
                handleVerifyLab('exp-tilt', 40);
              }}
            >
              EARTH ACTUAL TILT (23.44°)
            </button>
          </div>

          <div className="tilt-readout-box">
            <div className="tilt-stat">
              <span>SPIN AXIS OBLIQUITY</span>
              <strong>{simulatedTiltDeg.toFixed(2)}°</strong>
            </div>
            <div className="tilt-stat">
              <span>POLAR SUN ELEVATION RANGE</span>
              <strong style={{ color: '#ffb14a' }}>±{simulatedTiltDeg.toFixed(2)}° FROM HORIZON</strong>
            </div>
          </div>

          <p className="lec-note-text">
            {simulatedTiltDeg < 5
              ? 'At the Moon’s 1.54° axial tilt, the Sun stays within ±1.54° of the South Polar horizon all year. High crater rims (+4,200 m) catch sunlight nearly 90% of the time while deep crater basins (-1,400 m) remain in permanent shadow!'
              : 'At Earth’s 23.44° axial tilt, the South Pole experiences 6 months of continuous summer sunlight (up to +23.44° elevation) followed by 6 months of total winter darkness.'}
          </p>
        </section>

        {/* Synodic Day/Night & Thermal Cycle Scrubber */}
        <section className="lab-experiment-card">
          <div className="lec-header">
            <div className="lec-title-group">
              <Thermometer size={16} className="lec-icon is-cyan" />
              <div>
                <span className="lec-code">EXPERIMENT B-03 // 708.7-HOUR SYNODIC THERMAL LAB</span>
                <h3 className="lec-title">Day/Night Cycle &amp; Surface Temperature</h3>
              </div>
            </div>
            {completedActivities['exp-thermal'] && (
              <span className="lec-done-pill">
                <CheckCircle2 size={12} />
                <span>+40 XP</span>
              </span>
            )}
          </div>

          <label className="gravity-slider-label" htmlFor="synodic-hour-slider">
            <span>SCRUB 29.53-DAY LUNAR SYNODIC CYCLE:</span>
            <strong>HOUR {synodicHour} / 708.7h ({isLunarDaytime ? 'LUNAR DAY' : 'LUNAR NIGHT'})</strong>
          </label>
          <input
            id="synodic-hour-slider"
            type="range"
            min="0"
            max="708"
            step="4"
            value={synodicHour}
            onChange={(e) => {
              setSynodicHour(Number(e.target.value));
              handleVerifyLab('exp-thermal', 40);
            }}
            className="academy-range-slider"
          />

          <div className="thermal-zones-grid">
            <div className="tz-box">
              <span>LUNAR EQUATOR (0°)</span>
              <strong style={{ color: equatorTempC > 0 ? '#ef4444' : '#60a5fa' }}>
                {equatorTempC > 0 ? `+${equatorTempC}°C` : `${equatorTempC}°C`}
              </strong>
              <small>Extreme 354h day / 354h night</small>
            </div>
            <div className="tz-box">
              <span>SOUTH POLE RIDGE (89.5°S)</span>
              <strong style={{ color: '#10b981' }}>{polarRidgeTempC}°C</strong>
              <small>Grazing sun (~ -50°C stable)</small>
            </div>
            <div className="tz-box">
              <span>SHACKLETON PSR FLOOR</span>
              <strong style={{ color: '#8f9cff' }}>{psrFloorTempC}°C (35 K)</strong>
              <small>Permanent cryogenic shadow</small>
            </div>
          </div>
        </section>
      </div>

      {/* Reference Matrix of All 6 Comparative Parameters */}
      <section className="comparative-matrix-section" aria-label="Earth vs. Moon Scientific Reference Matrix">
        <div className="cms-head">
          <span>COMPARATIVE PLANETARY TELEMETRY MATRIX // EARTH [399] VS. MOON [301]</span>
        </div>
        <div className="cms-cards-grid">
          {PLANETARY_METRICS.map((item) => (
            <div key={item.id} className="cms-metric-card">
              <div className="cms-card-top">
                <span className="cms-param-name">{item.parameter}</span>
                <span className="cms-ratio-tag">{item.ratio}</span>
              </div>
              <div className="cms-compare-strip">
                <div className="cms-val-col">
                  <span>EARTH</span>
                  <b>{item.earthVal}</b>
                </div>
                <div className="cms-val-col is-moon">
                  <span>MOON</span>
                  <b>{item.moonVal}</b>
                </div>
              </div>
              <p className="cms-explanation">{item.explanation}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
