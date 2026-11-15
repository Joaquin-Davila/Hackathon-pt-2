import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Thermometer,
  Radio,
  MapPin,
  Snowflake,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

const SURVIVAL_SCENARIOS = [
  {
    id: 'survive-1-habitat',
    step: '01 / 05',
    domain: 'HABITAT SITE SELECTION',
    icon: MapPin,
    title: 'Choosing a Location for the Artemis Lunar Habitat',
    situation:
      'Your lander approaches the Lunar South Pole (89.5°S). Because the Moon’s spin axis is tilted by only 1.54°, the Sun never rises high in the sky—it skims horizontally along the horizon. Where do you touch down to establish the crew habitat?',
    telemetryContext: 'REAL LRO LOLA DATUM: Shackleton Rim (+4,218 m) vs. Shackleton Basin Floor (-1,400 m)',
    options: [
      {
        id: 'opt-ridge',
        label: 'Touch down on an elevated ridge crest (Shackleton Rim / Connecting Ridge at +4,200 m)',
        isOptimal: true,
        powerDelta: +25,
        thermalDelta: +20,
        commsDelta: +20,
        consequenceTitle: 'OPTIMAL DECISION // PEAK OF ETERNAL LIGHT MARGIN',
        scientificFeedback:
          'Elevated polar ridges stand above surrounding crater walls, capturing grazing sunlight for 85%–92% of the 29.5-day lunar cycle while maintaining an unobstructed line-of-sight toward Earth.',
      },
      {
        id: 'opt-crater-floor',
        label: 'Land deep inside Shackleton Crater floor (-1,400 m) to be directly on top of water ice',
        isOptimal: false,
        powerDelta: -45,
        thermalDelta: -40,
        commsDelta: -35,
        consequenceTitle: 'CRITICAL HAZARD // PERMANENTLY SHADOWED REGION (PSR)',
        scientificFeedback:
          'Shackleton’s interior floor is a Permanently Shadowed Region (PSR). Surrounding 4.2 km crater walls block 100% of direct sunlight and Earth radio signals, plunging temperatures below -230°C (43 K).',
      },
      {
        id: 'opt-mid-latitude',
        label: 'Divert to an equatorial plain (0° latitude) for a flat landing pad',
        isOptimal: false,
        powerDelta: -20,
        thermalDelta: -15,
        commsDelta: +10,
        consequenceTitle: 'SUB-OPTIMAL // 354-HOUR EQUATORIAL LUNAR NIGHT',
        scientificFeedback:
          'Equatorial sites experience 14.7 Earth days of scorching +121°C sunlight followed by 14.7 Earth days (354 hours) of continuous freezing darkness, requiring massive battery mass and lacking polar water ice.',
      },
    ],
  },
  {
    id: 'survive-2-psr',
    step: '02 / 05',
    domain: 'PERMANENTLY SHADOWED REGIONS (PSRs)',
    icon: Snowflake,
    title: 'Harvesting Water Ice in a Cryogenic Cold Trap',
    situation:
      'Your science team needs to extract water ice (H₂O) from a nearby Permanently Shadowed Region (PSR) 1.8 km down-slope from your sunlit habitat ridge. How do you design the extraction excursion?',
    telemetryContext: 'LRO DIVINER RADIOMETER: PSR Floor Temperature ~ 35 K to 50 K (-238°C to -223°C)',
    options: [
      {
        id: 'opt-solar-rover',
        label: 'Send a solar-powered rover with horizontal panels into the crater floor for a 72-hour stay',
        isOptimal: false,
        powerDelta: -35,
        thermalDelta: -30,
        commsDelta: -15,
        consequenceTitle: 'MISSION LOSS // ZERO SOLAR IRRADIANCE IN PSR',
        scientificFeedback:
          'Direct solar irradiance inside a PSR is 0 W/m². A purely solar-powered rover will freeze and exhaust its batteries within hours unless recharged via rechargeable fuel cells, RTGs, or laser/tethered power beaming.',
      },
      {
        id: 'opt-tethered-sortie',
        label: 'Deploy a battery/fuel-cell rover on timed sorties with a rim-mounted optical/RF relay repeater',
        isOptimal: true,
        powerDelta: +20,
        thermalDelta: +20,
        commsDelta: +25,
        consequenceTitle: 'OPTIMAL ARCHITECTURE // COLD-TRAP SORTIE + RIM RELAY',
        scientificFeedback:
          'Because PSRs preserve water ice precisely due to the absence of sunlight (preventing sublimation in vacuum), rovers must bring stored energy/heaters and bounce telemetry off a crater-rim repeater to reach Earth.',
      },
      {
        id: 'opt-melt-open',
        label: 'Heat the open crater regolith to +100°C so liquid water pools on the surface',
        isOptimal: false,
        powerDelta: -30,
        thermalDelta: -15,
        commsDelta: 0,
        consequenceTitle: 'PHYSICS VIOLATION // TRIPLE POINT OF WATER IN VACUUM',
        scientificFeedback:
          'In the Moon’s ultra-high vacuum (~3 × 10⁻¹⁵ bar, well below water’s triple-point pressure of 6.11 mbar), liquid water cannot exist on the open surface—ice sublimates directly into gas and escapes into space unless captured inside a sealed dome.',
      },
    ],
  },
  {
    id: 'survive-3-solar',
    step: '03 / 05',
    domain: 'POLAR SOLAR ENERGY GEOMETRY',
    icon: Sun,
    title: 'Deploying the Habitat Solar Array Mast',
    situation:
      'At your South Pole ridge (89.54°S), JPL Horizons telemetry reports a solar elevation angle of +1.45° above the horizon, sweeping 360° around the compass over 29.53 days. How do you orient the habitat’s solar panels?',
    telemetryContext: 'SOLAR CONSTANT: 1,361 W/m² // INCIDENCE LAW: Flux = S₀ · sin(Elevation) for horizontal plates',
    options: [
      {
        id: 'opt-flat-roof',
        label: 'Mount solar panels flat (horizontal) on the habitat roof like a terrestrial house',
        isOptimal: false,
        powerDelta: -40,
        thermalDelta: -20,
        commsDelta: 0,
        consequenceTitle: 'SEVERE POWER DEFICIT // COSINE PROJECTION LOSS',
        scientificFeedback:
          'At +1.45° solar elevation, a flat horizontal panel receives only 1,361 × sin(1.45°) ≈ 34 W/m² (less than 2.5% of peak solar flux!), starving the habitat of electrical power.',
      },
      {
        id: 'opt-vertical-mast',
        label: 'Deploy a tall vertical solar array mast (10–15 m high) that rotates 360° to track solar azimuth',
        isOptimal: true,
        powerDelta: +30,
        thermalDelta: +15,
        commsDelta: +10,
        consequenceTitle: 'OPTIMAL ENGINEERING // PERPENDICULAR GRAZING CAPTURE',
        scientificFeedback:
          'A vertical array facing a +1.45° horizon sun intercepts nearly 100% of the 1,361 W/m² direct beam (~1,360 W/m²—nearly 40× more energy than a horizontal panel!) while elevating cells above local boulder shadows.',
      },
      {
        id: 'opt-fixed-south',
        label: 'Lock the solar panels facing due South (180° azimuth) without rotation',
        isOptimal: false,
        powerDelta: -25,
        thermalDelta: -10,
        commsDelta: 0,
        consequenceTitle: 'HALF-CYCLE BLACKOUT // 360° AZIMUTH SWEEP IGNORED',
        scientificFeedback:
          'Near the Lunar South Pole, the Sun circles all 360° of the horizon once every 29.53 days. A fixed single-sided panel is back-lit for half of every month (~354 hours).',
      },
    ],
  },
  {
    id: 'survive-4-thermal',
    step: '04 / 05',
    domain: 'VACUUM THERMAL EXTREMES',
    icon: Thermometer,
    title: 'Surviving a 26-Hour Topographic Shadow Transit',
    situation:
      'During day 11 of your mission, the Sun passes behind a distant 3.1° mountain peak (Malapert Massif), casting your habitat into shadow for 26 hours. With no atmosphere to retain heat, surface regolith temperature drops rapidly. What is your thermal protocol?',
    telemetryContext: 'SIMULATED SCENARIO // LRO LOLA OCCULTATION WINDOW: 26 HOURS',
    options: [
      {
        id: 'opt-convection-fans',
        label: 'Run external air-intake heat-pump fans to draw warmth from the surrounding lunar air',
        isOptimal: false,
        powerDelta: -30,
        thermalDelta: -45,
        commsDelta: 0,
        consequenceTitle: 'CRITICAL FAILURE // NO ATMOSPHERIC CONVECTION IN VACUUM',
        scientificFeedback:
          'The Moon has an exosphere (surface pressure ~10⁻¹⁵ bar), meaning external convective heat transfer is zero. Heat is lost or gained almost exclusively via thermal radiation (Stefan-Boltzmann law: P ∝ T⁴) and regolith conduction.',
      },
      {
        id: 'opt-mli-fuelcell',
        label: 'Close Multi-Layer Insulation (MLI) radiator louvers, throttle non-essential loads, and draw from regenerative fuel cells',
        isOptimal: true,
        powerDelta: +20,
        thermalDelta: +30,
        commsDelta: +10,
        consequenceTitle: 'OPTIMAL THERMAL CONTROL // RADIATIVE HEAT RETENTION',
        scientificFeedback:
          'Closing high-reflectivity MLI louvers minimizes radiative heat loss to deep space (3 K background), while regenerative fuel cells supply both electrical power and waste heat until sunlight returns.',
      },
      {
        id: 'opt-vent-cabin',
        label: 'Reduce cabin pressure to 0.1 atm to save oxygen fan power during the eclipse',
        isOptimal: false,
        powerDelta: +5,
        thermalDelta: -25,
        commsDelta: -10,
        consequenceTitle: 'LIFE SUPPORT HAZARD // HYPOXIA & INTERNAL COOLING LOSS',
        scientificFeedback:
          'Dropping cabin pressure to 0.1 atm risks crew hypoxia and impairs internal forced-air cooling of avionics inside the pressurized hull.',
      },
    ],
  },
  {
    id: 'survive-5-comms',
    step: '05 / 05',
    domain: 'DIRECT-TO-EARTH (DTE) COMMUNICATIONS',
    icon: Radio,
    title: 'Countering Optical Libration & Ridge Multipath',
    situation:
      'At the South Pole, Earth stays near 0° North azimuth, wobbling between -1.5° and +6.8° elevation over a 27.2-day draconic cycle due to lunar optical libration. A local ridge sits at +1.8° elevation to the North. How do you guarantee continuous telemetry?',
    telemetryContext: 'JPL HORIZONS TARGET 399 // OPTICAL LIBRATION IN LATITUDE: ±6.68°',
    options: [
      {
        id: 'opt-dual-dte-relay',
        label: 'Use high-gain X/Ka-Band DTE dish when Earth is above +1.8°, with automatic handoff to Lunar Gateway / polar relay orbiter during libration dips',
        isOptimal: true,
        powerDelta: +15,
        thermalDelta: +15,
        commsDelta: +35,
        consequenceTitle: 'OPTIMAL RF ARCHITECTURE // DTE + ORBITAL RELAY HANDOFF',
        scientificFeedback:
          'Because optical libration periodically dips Earth below local polar ridges, combining direct X/Ka-Band DTE with an orbital relay (such as Gateway in NRHO) ensures 100% communication continuity.',
      },
      {
        id: 'opt-ionosphere-bounce',
        label: 'Bounce shortwave HF radio waves off the Moon’s ionosphere to reach over the mountain ridge',
        isOptimal: false,
        powerDelta: -15,
        thermalDelta: 0,
        commsDelta: -45,
        consequenceTitle: 'COMMUNICATION BLACKOUT // NO USABLE LUNAR IONOSPHERE',
        scientificFeedback:
          'Unlike Earth, the Moon lacks a dense atmosphere and ionosphere capable of refracting HF skywaves over the horizon. High-frequency radio waves travel strictly by line-of-sight.',
      },
      {
        id: 'opt-point-zenith',
        label: 'Point the Direct-to-Earth dish straight up (90° zenith) at all times',
        isOptimal: false,
        powerDelta: -10,
        thermalDelta: 0,
        commsDelta: -40,
        consequenceTitle: 'LINK LOST // EARTH IS ON THE NORTHERN HORIZON AT 89°S',
        scientificFeedback:
          'Earth only appears at the zenith (90° overhead) near the center of the lunar nearside (0°N, 0°E). At 89.5°S, Earth always hovers low on the northern horizon (0° azimuth).',
      },
    ],
  },
];

export default function SurvivalSimulator({
  completedActivities = {},
  onCompleteScenario,
  onCompleteModule,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [habitatStats, setHabitatStats] = useState({
    power: 75,
    thermal: 75,
    comms: 75,
  });

  const scenario = SURVIVAL_SCENARIOS[currentIndex];
  const selectedOption = scenario.options.find((o) => o.id === selectedOptionId) || null;
  const ScenarioIcon = scenario.icon;

  const solvedCount = SURVIVAL_SCENARIOS.filter((s) => Boolean(completedActivities[s.id])).length;

  const handleChooseOption = (opt) => {
    setSelectedOptionId(opt.id);

    const clamp = (v) => Math.max(10, Math.min(100, v));
    setHabitatStats((prev) => ({
      power: clamp(prev.power + opt.powerDelta),
      thermal: clamp(prev.thermal + opt.thermalDelta),
      comms: clamp(prev.comms + opt.commsDelta),
    }));

    if (opt.isOptimal) {
      onCompleteScenario?.(scenario.id, 45, true);
      // Check if all 5 scenarios are now completed
      const nextSolved = SURVIVAL_SCENARIOS.every(
        (s) => s.id === scenario.id || Boolean(completedActivities[s.id])
      );
      if (nextSolved) {
        onCompleteModule?.('survive', 60);
      }
    } else {
      onCompleteScenario?.(scenario.id, 0, false);
    }
  };

  const handleNextScenario = () => {
    setSelectedOptionId(null);
    if (currentIndex < SURVIVAL_SCENARIOS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  return (
    <div className="academy-module-workspace" aria-label="Module A: Survive the Moon Simulator">
      {/* Module Top Header */}
      <div className="amw-header-bar">
        <div>
          <span className="amw-kicker">MODULE A // SCENARIO-BASED SURVIVAL SIMULATOR</span>
          <h2 className="amw-title">Survive the Lunar South Pole</h2>
        </div>

        <div className="amw-telemetry-badge-group">
          <span className="sim-type-tag">SIMULATED SURVIVAL SCENARIO + REAL LOLA / HORIZONS PHYSICS</span>
          <span className="sim-progress-pill">{solvedCount} / 5 SCENARIOS MASTERED</span>
        </div>
      </div>

      {/* Live Habitat Survival Telemetry Meters */}
      <div className="survival-vitals-strip">
        <div className="vital-meter-card">
          <div className="vital-head">
            <span>SOLAR POWER RESERVES</span>
            <strong style={{ color: habitatStats.power >= 65 ? '#ffb14a' : '#ef4444' }}>{habitatStats.power}%</strong>
          </div>
          <div className="vital-track">
            <div className="vital-fill" style={{ width: `${habitatStats.power}%`, background: '#ffb14a' }} />
          </div>
        </div>

        <div className="vital-meter-card">
          <div className="vital-head">
            <span>THERMAL INTEGRITY</span>
            <strong style={{ color: habitatStats.thermal >= 65 ? '#10b981' : '#ef4444' }}>{habitatStats.thermal}%</strong>
          </div>
          <div className="vital-track">
            <div className="vital-fill" style={{ width: `${habitatStats.thermal}%`, background: '#10b981' }} />
          </div>
        </div>

        <div className="vital-meter-card">
          <div className="vital-head">
            <span>EARTH DTE LINK MARGIN</span>
            <strong style={{ color: habitatStats.comms >= 65 ? '#5ce1e6' : '#ef4444' }}>{habitatStats.comms}%</strong>
          </div>
          <div className="vital-track">
            <div className="vital-fill" style={{ width: `${habitatStats.comms}%`, background: '#5ce1e6' }} />
          </div>
        </div>
      </div>

      {/* Scenario Step Selector Pills */}
      <div className="survival-step-tabs" role="tablist" aria-label="Survival Scenarios">
        {SURVIVAL_SCENARIOS.map((s, idx) => {
          const isDone = Boolean(completedActivities[s.id]);
          const isActive = idx === currentIndex;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`survival-step-pill ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
              onClick={() => {
                setCurrentIndex(idx);
                setSelectedOptionId(null);
              }}
            >
              <span>{s.step}</span>
              <b>{s.domain}</b>
              {isDone && <CheckCircle2 size={12} className="done-icon" />}
            </button>
          );
        })}
      </div>

      {/* Active Scenario Decision Card */}
      <div className="survival-scenario-card">
        <div className="ssc-header">
          <span className="ssc-icon-box">
            <ScenarioIcon size={18} />
          </span>
          <div>
            <span className="ssc-step-label">SCENARIO {scenario.step} // {scenario.domain}</span>
            <h3 className="ssc-title">{scenario.title}</h3>
          </div>
        </div>

        <p className="ssc-situation">{scenario.situation}</p>

        <div className="ssc-telemetry-ref">
          <span>SCIENTIFIC REFERENCE:</span>
          <b>{scenario.telemetryContext}</b>
        </div>

        {/* Decision Options */}
        <div className="ssc-options-list" role="group" aria-label="Survival Decision Options">
          {scenario.options.map((opt) => {
            const isChosen = selectedOptionId === opt.id;
            let stateClass = '';
            if (isChosen) {
              stateClass = opt.isOptimal ? 'is-correct' : 'is-wrong';
            }
            return (
              <button
                key={opt.id}
                type="button"
                className={`ssc-option-btn ${stateClass}`}
                onClick={() => handleChooseOption(opt)}
              >
                <div className="ssc-opt-main">
                  <span className="ssc-opt-bullet">{isChosen ? (opt.isOptimal ? '✓' : '✕') : '→'}</span>
                  <span className="ssc-opt-text">{opt.label}</span>
                </div>
                <span className="ssc-opt-action">SELECT DECISION</span>
              </button>
            );
          })}
        </div>

        {/* Scientific Consequence Feedback Box */}
        {selectedOption && (
          <div
            className={`ssc-feedback-box ${selectedOption.isOptimal ? 'is-optimal' : 'is-hazard'}`}
            role="status"
          >
            <div className="ssc-fb-header">
              {selectedOption.isOptimal ? (
                <CheckCircle2 size={18} className="fb-icon is-ok" />
              ) : (
                <AlertTriangle size={18} className="fb-icon is-err" />
              )}
              <strong>{selectedOption.consequenceTitle}</strong>
              {selectedOption.isOptimal && <span className="fb-xp-pill">+45 XP EARNED</span>}
            </div>
            <p className="ssc-fb-body">{selectedOption.scientificFeedback}</p>

            <div className="ssc-fb-actions">
              {selectedOption.isOptimal ? (
                <button type="button" className="ssc-next-btn" onClick={handleNextScenario}>
                  <span>{currentIndex < SURVIVAL_SCENARIOS.length - 1 ? 'NEXT SURVIVAL SCENARIO' : 'REVIEW SCENARIOS'}</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  className="ssc-retry-btn"
                  onClick={() => setSelectedOptionId(null)}
                >
                  <RotateCcw size={13} />
                  <span>TRY ANOTHER SCIENTIFIC DECISION</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
