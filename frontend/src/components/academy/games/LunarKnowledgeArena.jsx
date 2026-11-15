import React, { useState, useEffect } from 'react';
import {
  Heart,
  Flame,
  Timer,
  Trophy,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { XP_REWARDS } from '../academyState.js';

const ARENA_CATEGORIES = [
  {
    id: 'science',
    code: 'CAT A',
    title: 'LUNAR SCIENCE',
    subtitle: 'Gravity, Vacuum & Moon Physics',
    color: '#25BFFF',
    questions: [
      {
        id: 'sci-1',
        difficulty: 'LVL 1 // EASY',
        visualType: 'gravity',
        question: 'How strong is surface gravity on the Moon compared to Earth?',
        options: [
          'About 1/6th of Earth (1.62 m/s²)',
          'Exactly the same as Earth (9.81 m/s²)',
          'Zero gravity—astronauts float away',
          'Twice as strong as Earth (19.6 m/s²)',
        ],
        correctIdx: 0,
        explanation:
          'Lunar surface gravity is 1.622 m/s²—roughly 16.5% (1/6th) of Earth’s 9.81 m/s². You weigh 6 times less, so you can jump 6 times higher!',
      },
      {
        id: 'sci-2',
        difficulty: 'LVL 1 // EASY',
        visualType: 'atmosphere',
        question: 'Why is the lunar sky pitch black even at midday when the Sun is shining?',
        options: [
          'The Moon has a collisionless exosphere with no air molecules to scatter light',
          'Thick black clouds block the blue sky',
          'The Sun is too far away from the Moon',
          'Lunar dust absorbs all blue wavelengths',
        ],
        correctIdx: 0,
        explanation:
          'Without a dense atmosphere to scatter sunlight (Rayleigh scattering), the lunar sky remains completely black even when the surface is brightly lit.',
      },
      {
        id: 'sci-3',
        difficulty: 'LVL 2 // MEDIUM',
        visualType: 'atmosphere',
        question: 'If a meteor strikes 1 km away from you on the Moon, what do you hear through the outside space?',
        options: [
          'Complete silence—sound waves cannot travel through vacuum',
          'A loud sonic boom echoing off craters',
          'A high-pitched whistle',
          'A delayed thunderclap 3 seconds later',
        ],
        correctIdx: 0,
        explanation:
          'Sound requires a medium (like air) to vibrate molecules. In the Moon’s ultra-high vacuum, external sound waves cannot propagate at all.',
      },
      {
        id: 'sci-4',
        difficulty: 'LVL 2 // MEDIUM',
        visualType: 'temperature',
        question: 'Why do temperatures swing wildly from +121°C at the lunar equator down to -246°C in polar craters?',
        options: [
          'There is no atmosphere or ocean to trap and distribute heat',
          'Active volcanoes heat the equator every afternoon',
          'The Moon moves closer to the Sun every 14 days',
          'Strong polar winds blow cold air into craters',
        ],
        correctIdx: 0,
        explanation:
          'With no air or oceans to buffer thermal energy, sunlit regolith bakes at +121°C while shadowed craters radiate heat directly into deep space.',
      },
      {
        id: 'sci-5',
        difficulty: 'LVL 3 // PRO',
        visualType: 'gravity',
        question: 'In Apollo 15’s vacuum drop experiment, a 1.3 kg hammer and a 0.003 kg feather were dropped together. What happened?',
        options: [
          'Both hit the lunar ground at the exact same instant',
          'The heavy hammer hit 5 seconds before the feather',
          'The feather floated upward in low gravity',
          'Both hovered mid-air above the crater',
        ],
        correctIdx: 0,
        explanation:
          'In a vacuum with zero air drag, gravity accelerates all objects equally (1.62 m/s²) regardless of their mass.',
      },
    ],
  },
  {
    id: 'comparison',
    code: 'CAT B',
    title: 'EARTH VS MOON',
    subtitle: 'Planetary Contrasts & Cycles',
    color: '#42E8E8',
    questions: [
      {
        id: 'cmp-1',
        difficulty: 'LVL 1 // EASY',
        visualType: 'gravity',
        question: 'If an astronaut has a MASS of 72 kg on Earth, what is their MASS on the Moon?',
        options: [
          'Still 72 kg—mass never changes, only weight force drops!',
          '12 kg of mass',
          '0 kg of mass',
          '432 kg of mass',
        ],
        correctIdx: 0,
        explanation:
          'Mass measures the amount of matter in your body (72 kg everywhere). Weight (F = m·g) is gravitational force, which drops to 1/6th on the Moon.',
      },
      {
        id: 'cmp-2',
        difficulty: 'LVL 1 // EASY',
        visualType: 'dayCycle',
        question: 'Earth’s solar day/night cycle lasts 24 hours. How long is one complete lunar day/night cycle (synodic month)?',
        options: [
          'About 29.5 Earth days (708.7 hours)',
          'Exactly 24 hours like Earth',
          'Only 6 hours total',
          '365 Earth days',
        ],
        correctIdx: 0,
        explanation:
          'Because the Moon is tidally locked to Earth, one full cycle of lunar daytime and nighttime lasts 29.53 Earth days (~14.7 days of sun, ~14.7 days of night).',
      },
      {
        id: 'cmp-3',
        difficulty: 'LVL 2 // MEDIUM',
        visualType: 'tilt',
        question: 'Earth’s spin axis is tilted by 23.44° (causing strong seasons). What is the Moon’s axial tilt?',
        options: [
          'Only 1.54°—nearly upright relative to the Sun!',
          '45.0°—extreme seasonal swings',
          '23.44°—identical to Earth',
          '90.0°—spinning on its side',
        ],
        correctIdx: 0,
        explanation:
          'The Moon’s tiny 1.54° axial tilt means the Sun always skims horizontally along the South Polar horizon all year round.',
      },
      {
        id: 'cmp-4',
        difficulty: 'LVL 2 // MEDIUM',
        visualType: 'dte',
        question: 'From the Lunar South Pole, where does Earth appear in the sky?',
        options: [
          'Hovering low near the northern horizon (0° azimuth), wobbling slightly',
          'Rising in the east and setting in the west every 12 hours',
          'Directly overhead at the 90° zenith',
          'Earth is never visible from the South Pole',
        ],
        correctIdx: 0,
        explanation:
          'Because the Moon is tidally locked, Earth stays near the same spot low on the northern horizon at the South Pole, bobbing ±6.7° due to optical libration.',
      },
      {
        id: 'cmp-5',
        difficulty: 'LVL 3 // PRO',
        visualType: 'atmosphere',
        question: 'How does the Moon’s surface pressure (3 × 10⁻¹⁵ bar) compare to Earth’s sea-level air pressure (1 bar)?',
        options: [
          'It is an ultra-high vacuum—trillions of times thinner than Earth’s air',
          'It is about half of Earth’s air pressure',
          'It is denser than Earth’s atmosphere',
          'It is breathable for short 10-minute walks',
        ],
        correctIdx: 0,
        explanation:
          'The lunar exosphere is virtually a hard vacuum, requiring pressurized EVA spacesuits and habitats with closed-loop life support.',
      },
    ],
  },
  {
    id: 'survival',
    code: 'CAT C',
    title: 'LUNAR SURVIVAL',
    subtitle: 'PSRs, Thermal & Radiation Hazards',
    color: '#f43f5e',
    questions: [
      {
        id: 'srv-1',
        difficulty: 'LVL 1 // EASY',
        visualType: 'psr',
        question: 'What is a “PSR” at the Lunar South Pole?',
        options: [
          'Permanently Shadowed Region—a deep crater floor that never receives sunlight',
          'Polar Solar Reflector—a bright mountain peak',
          'Pressurized Spacesuit Regulator',
          'Planetary Seismic Radar',
        ],
        correctIdx: 0,
        explanation:
          'Because the Sun stays within ±1.54° of the polar horizon, deep crater floors like Shackleton stay in permanent shadow for billions of years.',
      },
      {
        id: 'srv-2',
        difficulty: 'LVL 1 // EASY',
        visualType: 'psr',
        question: 'Why do NASA Artemis astronauts want to explore Permanently Shadowed Craters despite their -246°C cold?',
        options: [
          'They trap ancient water-ice (H₂O) for drinking water, oxygen, and rocket fuel',
          'They are the warmest places on the Moon',
          'They have breathable oxygen pools',
          'They shield rovers from low gravity',
        ],
        correctIdx: 0,
        explanation:
          'Cryogenic PSR cold traps preserve millions of tons of water-ice that can be split into breathable O₂ and hydrogen/oxygen propellant!',
      },
      {
        id: 'srv-3',
        difficulty: 'LVL 2 // MEDIUM',
        visualType: 'temperature',
        question: 'In the vacuum of the Moon, how does a habitat lose heat during a dark crater eclipse?',
        options: [
          'By thermal infrared radiation into deep space (and conduction into regolith)',
          'By cold wind gusts blowing across the hull',
          'By rain and snowstorms',
          'Heat cannot be lost in a vacuum',
        ],
        correctIdx: 0,
        explanation:
          'With zero air for convection, thermal energy escapes primarily via infrared radiation, which engineers counter using Multi-Layer Insulation (MLI).',
      },
      {
        id: 'srv-4',
        difficulty: 'LVL 2 // MEDIUM',
        visualType: 'psr',
        question: 'What happens if you land a solar-powered rover directly at the bottom of Shackleton Crater (-1,400 m)?',
        options: [
          'Its solar panels generate 0 W and both sunlight and Earth radio signals are blocked by crater walls',
          'It receives 24/7 peak sunlight',
          'It floats back out of the crater automatically',
          'Its batteries charge from cosmic rays',
        ],
        correctIdx: 0,
        explanation:
          'Shackleton’s 4.2 km deep bowl is a permanent shadow and radio trap—landing on the elevated rim (+4,200 m) is essential for solar power and comms.',
      },
      {
        id: 'srv-5',
        difficulty: 'LVL 3 // PRO',
        visualType: 'atmosphere',
        question: 'Why is lunar regolith dust a major engineering hazard for spacesuits and rovers?',
        options: [
          'With no wind or water erosion, microscopic glass-like dust grains remain razor-sharp and electrostatically sticky',
          'The dust is wet and muddy',
          'The dust dissolves metal on contact',
          'Lunar dust is heavier than lead',
        ],
        correctIdx: 0,
        explanation:
          'Micrometeorite impacts shatter rock into jagged, abrasive dust that clings to visors, seals, and solar panels via static electricity.',
      },
    ],
  },
  {
    id: 'solar',
    code: 'CAT D',
    title: 'SOLAR ENERGY',
    subtitle: 'Grazing Sunlight & Base Microgrids',
    color: '#FFC247',
    questions: [
      {
        id: 'sol-1',
        difficulty: 'LVL 1 // EASY',
        visualType: 'solar',
        question: 'At the Lunar South Pole, the Sun circles the horizon at ~1.5° elevation. How should solar panels be mounted?',
        options: [
          'Vertically on tall 360° rotating masts to face the low horizon Sun directly',
          'Flat on the ground facing straight up at the sky',
          'Angled downward into the crater floor',
          'Buried under 2 meters of lunar soil',
        ],
        correctIdx: 0,
        explanation:
          'Because polar sunlight arrives nearly horizontally, vertical tracking solar towers capture maximum solar flux (~1,361 W/m²) while flat panels miss the light.',
      },
      {
        id: 'sol-2',
        difficulty: 'LVL 1 // EASY',
        visualType: 'solar',
        question: 'Why are elevated ridges like Shackleton Rim and Connecting Ridge called “Peaks of Eternal Light”?',
        options: [
          'They stand above surrounding crater shadows and receive sunlight for 85%–92% of the lunar cycle',
          'They glow in the dark using radioactive minerals',
          'They reflect light from Jupiter',
          'They never experience any shadow even for 1 minute',
        ],
        correctIdx: 0,
        explanation:
          'High South Polar peaks (+4,200 m) clear neighboring horizon obstacles, enjoying near-continuous grazing sunlight across the 29.5-day cycle.',
      },
      {
        id: 'sol-3',
        difficulty: 'LVL 2 // MEDIUM',
        visualType: 'solar',
        question: 'When a distant mountain peak briefly blocks the Sun (an eclipse transit), what must the lunar base do?',
        options: [
          'Draw stored energy from batteries/fuel cells and throttle non-critical loads like heavy drills',
          'Shut off crew oxygen and cabin heating immediately',
          'Launch the habitat into orbit',
          'Burn lunar rocks for coal power',
        ],
        correctIdx: 0,
        explanation:
          'During shadow transits, Life Support (ECLSS) and Comms are prioritized on battery backup while high-draw science drills pause.',
      },
      {
        id: 'sol-4',
        difficulty: 'LVL 2 // MEDIUM',
        visualType: 'solar',
        question: 'In space at 1 AU, how much solar power hits each square meter of a perpendicular solar array (Solar Constant)?',
        options: [
          '~1,361 Watts per square meter (W/m²)',
          '10 Watts per square meter',
          '1,000,000 Watts per square meter',
          '0 Watts per square meter',
        ],
        correctIdx: 0,
        explanation:
          'Unfiltered by clouds or atmosphere, space solar irradiance at the Earth-Moon distance is approximately 1,361 W/m².',
      },
      {
        id: 'sol-5',
        difficulty: 'LVL 3 // PRO',
        visualType: 'solar',
        question: 'In LuNav’s 360° Horizon Chart, how can you tell if the Sun is currently illuminating your landing site?',
        options: [
          'The yellow Sun icon’s elevation angle is ABOVE the LOLA terrain horizon ridge line at that azimuth',
          'The Sun icon is below the terrain ridge line',
          'The azimuth is exactly 180°',
          'The elevation is negative (-15°)',
        ],
        correctIdx: 0,
        explanation:
          'Whenever Solar Elevation exceeds the local LOLA Terrain Horizon angle at the Sun’s azimuth (Clearance > 0°), direct sunlight reaches the site!',
      },
    ],
  },
  {
    id: 'navigation',
    code: 'CAT E',
    title: 'LUNAR NAVIGATION',
    subtitle: 'LOLA Altimetry, Slopes & DTE Links',
    color: '#21D69B',
    questions: [
      {
        id: 'nav-1',
        difficulty: 'LVL 1 // EASY',
        visualType: 'slope',
        question: 'Why is terrain slope (< 8°–10°) a critical safety rule when selecting an Artemis lunar landing site?',
        options: [
          'Tall lunar landers can tip over on steep crater walls during touchdown',
          'Steep slopes have stronger gravity',
          'Slopes block spacesuit helmets from opening',
          'Solar panels only work on 45° cliffs',
        ],
        correctIdx: 0,
        explanation:
          'In 1/6g with a high center of mass, landing on a slope steeper than ~10° risks spacecraft tip-over or footpad sliding.',
      },
      {
        id: 'nav-2',
        difficulty: 'LVL 1 // EASY',
        visualType: 'dte',
        question: 'What does “DTE” stand for in LuNav’s communication vector telemetry?',
        options: [
          'Direct-to-Earth—a clear line-of-sight radio link between the lunar surface and Earth stations',
          'Deep Terrain Excavation',
          'Dynamic Thermal Engine',
          'Digital Telescope Elevation',
        ],
        correctIdx: 0,
        explanation:
          'Direct-to-Earth (DTE) means your antenna has an unobstructed line-of-sight to Earth (Target 399) without a mountain ridge blocking the signal.',
      },
      {
        id: 'nav-3',
        difficulty: 'LVL 2 // MEDIUM',
        visualType: 'dte',
        question: 'In LuNav’s 2D Polar Map, 0° Longitude points straight UP toward the top of the map. What is located in that direction?',
        options: [
          'The sub-Earth direction (nearside Prime Meridian pointing toward Earth)',
          'The lunar farside',
          'The planet Mars',
          'The North Pole',
        ],
        correctIdx: 0,
        explanation:
          '0° selenographic longitude defines the nearside Prime Meridian facing Earth—so Earth Vector arrows always point near 0° North on the polar map!',
      },
      {
        id: 'nav-4',
        difficulty: 'LVL 2 // MEDIUM',
        visualType: 'slope',
        question: 'Which NASA instrument measured the high-precision laser elevation profiles used in LuNav?',
        options: [
          'LOLA (Lunar Orbiter Laser Altimeter) aboard the Lunar Reconnaissance Orbiter',
          'The James Webb Space Telescope',
          'Voyager 1',
          'Curiosity Mars Rover',
        ],
        correctIdx: 0,
        explanation:
          'NASA’s LRO LOLA fires laser pulses at the Moon to build the 3D digital elevation models (DEMs) of South Polar ridges and craters.',
      },
      {
        id: 'nav-5',
        difficulty: 'LVL 3 // PRO',
        visualType: 'slope',
        question: 'Which combination makes the ideal Artemis South Pole landing site in LuNav?',
        options: [
          'High elevation ridge (+4,200 m), gentle slope (< 6°), >85% solar illumination, unobstructed Earth DTE, and proximity to PSR ice',
          'Deep crater floor (-1,400 m), 25° steep wall, 0% sunlight, and blocked Earth link',
          'Far-side basin with no Earth visibility and 14 days of darkness',
          'Steep boulder cliff far from any water ice',
        ],
        correctIdx: 0,
        explanation:
          'Elevated polar ridges next to shadowed ice craters give astronauts continuous solar power, direct Earth comms, safe flat touchdown, and nearby H₂O!',
      },
    ],
  },
];

// Compact Animated SVG Visual Helper for Question & Answer Cards
function QuestionVisualIllustration({ type }) {
  return (
    <svg viewBox="0 0 280 96" className="q-visual-svg" aria-hidden="true">
      <rect width="280" height="96" rx="10" fill="#090D16" stroke="rgba(66, 232, 232, 0.3)" />
      {type === 'gravity' && (
        <g>
          {/* Earth 1x Jump vs Moon 6x Jump */}
          <line x1="20" y1="80" x2="260" y2="80" stroke="#334155" strokeWidth="2" />
          <path d="M 45 80 Q 75 55 105 80" fill="none" stroke="#25BFFF" strokeWidth="2.5" strokeDasharray="4 3" />
          <circle cx="75" cy="66" r="7" fill="#25BFFF" />
          <text x="75" y="54" textAnchor="middle" fill="#25BFFF" fontSize="9" fontFamily="monospace">EARTH 1x</text>

          <path d="M 145 80 Q 195 2 245 80" fill="none" stroke="#FFC247" strokeWidth="3" />
          <circle cx="195" cy="28" r="8" fill="#FFC247" />
          <text x="195" y="16" textAnchor="middle" fill="#FFC247" fontSize="9.5" fontFamily="monospace" fontWeight="bold">MOON 6x HIGHER!</text>
        </g>
      )}
      {type === 'atmosphere' && (
        <g>
          <circle cx="75" cy="48" r="24" fill="#0284c7" stroke="#38bdf8" strokeWidth="5" strokeOpacity="0.45" />
          <text x="75" y="86" textAnchor="middle" fill="#38bdf8" fontSize="8.5" fontFamily="monospace">EARTH: 1 BAR AIR</text>
          <circle cx="205" cy="48" r="20" fill="#64748b" />
          <text x="205" y="86" textAnchor="middle" fill="#42E8E8" fontSize="8.5" fontFamily="monospace">MOON: VACUUM (0 BAR)</text>
        </g>
      )}
      {type === 'temperature' && (
        <g>
          <rect x="28" y="24" width="95" height="46" rx="6" fill="rgba(244,63,94,0.18)" stroke="#f43f5e" />
          <text x="75" y="45" textAnchor="middle" fill="#f43f5e" fontSize="12" fontFamily="monospace" fontWeight="bold">+121°C</text>
          <text x="75" y="60" textAnchor="middle" fill="#fda4af" fontSize="8" fontFamily="monospace">SUNLIT EQUATOR</text>

          <rect x="155" y="24" width="98" height="46" rx="6" fill="rgba(37,191,255,0.18)" stroke="#25BFFF" />
          <text x="204" y="45" textAnchor="middle" fill="#42E8E8" fontSize="12" fontFamily="monospace" fontWeight="bold">-246°C</text>
          <text x="204" y="60" textAnchor="middle" fill="#bae6fd" fontSize="8" fontFamily="monospace">SHADOWED PSR</text>
        </g>
      )}
      {type === 'psr' && (
        <g>
          <circle cx="28" cy="24" r="11" fill="#FFC247" />
          <line x1="42" y1="26" x2="255" y2="38" stroke="#FFC247" strokeWidth="2" strokeDasharray="5 3" />
          <path d="M 15 78 L 85 32 L 145 78 L 195 78 L 245 36 L 268 78 Z" fill="#1e293b" stroke="#42E8E8" strokeWidth="2" />
          <text x="168" y="68" textAnchor="middle" fill="#42E8E8" fontSize="8.5" fontFamily="monospace" fontWeight="bold">❄️ PSR ICE (-246°C)</text>
        </g>
      )}
      {type === 'solar' && (
        <g>
          <circle cx="34" cy="48" r="13" fill="#FFC247" />
          <line x1="52" y1="48" x2="185" y2="48" stroke="#FFC247" strokeWidth="2.5" strokeDasharray="4 4" />
          <rect x="192" y="20" width="8" height="54" fill="#42E8E8" />
          <line x1="160" y1="74" x2="235" y2="74" stroke="#21D69B" strokeWidth="3" />
          <text x="140" y="20" textAnchor="middle" fill="#FFC247" fontSize="8.5" fontFamily="monospace" fontWeight="bold">±1.5° GRAZING SUN → VERTICAL MAST</text>
        </g>
      )}
      {(type === 'tilt' || type === 'dayCycle') && (
        <g>
          <circle cx="80" cy="48" r="20" fill="#1e293b" stroke="#25BFFF" strokeWidth="2" />
          <line x1="68" y1="18" x2="92" y2="78" stroke="#f43f5e" strokeWidth="2.5" />
          <text x="80" y="90" textAnchor="middle" fill="#cbd5e1" fontSize="8" fontFamily="monospace">EARTH 23.4° (24H)</text>

          <circle cx="200" cy="48" r="18" fill="#334155" stroke="#FFC247" strokeWidth="2" />
          <line x1="199" y1="16" x2="201" y2="80" stroke="#21D69B" strokeWidth="2.5" />
          <text x="200" y="90" textAnchor="middle" fill="#FFC247" fontSize="8" fontFamily="monospace">MOON 1.54° (708H)</text>
        </g>
      )}
      {(type === 'dte' || type === 'slope') && (
        <g>
          <path d="M 15 80 L 95 28 L 155 75 L 265 75" fill="none" stroke="#21D69B" strokeWidth="3" />
          <circle cx="95" cy="22" r="5" fill="#FFC247" />
          <circle cx="245" cy="26" r="12" fill="#25BFFF" />
          <line x1="102" y1="22" x2="230" y2="26" stroke="#42E8E8" strokeWidth="2" strokeDasharray="4 3" />
          <text x="165" y="16" textAnchor="middle" fill="#42E8E8" fontSize="8.5" fontFamily="monospace" fontWeight="bold">CLEAR DTE LINE-OF-SIGHT</text>
        </g>
      )}
    </svg>
  );
}

export default function LunarKnowledgeArena({
  completedCategories = {},
  onCompleteQuizRound,
}) {
  const [selectedCatId, setSelectedCatId] = useState('science');
  const [qIdx, setQIdx] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [roundDone, setRoundDone] = useState(false);

  const category = ARENA_CATEGORIES.find((c) => c.id === selectedCatId) || ARENA_CATEGORIES[0];
  const currentQ = category.questions[qIdx];

  const startCategory = (catId) => {
    setSelectedCatId(catId);
    setQIdx(0);
    setLives(3);
    setStreak(0);
    setScore(0);
    setCorrectCount(0);
    setSelectedOpt(null);
    setTimeLeft(15);
    setRoundDone(false);
  };

  // Optional 15s countdown timer
  useEffect(() => {
    if (!timerEnabled || selectedOpt !== null || roundDone) return undefined;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setSelectedOpt(-1); // Timeout wrong answer
          setLives((l) => Math.max(0, l - 1));
          setStreak(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timerEnabled, selectedOpt, roundDone]);

  const handleAnswer = (optIndex) => {
    if (selectedOpt !== null || roundDone) return;
    setSelectedOpt(optIndex);
    const isCorrect = optIndex === currentQ.correctIdx;

    if (isCorrect) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setCorrectCount((c) => c + 1);
      setScore((s) => s + 100 + nextStreak * 25);
    } else {
      setStreak(0);
      setLives((l) => Math.max(0, l - 1));
    }
  };

  const handleNext = () => {
    if (qIdx + 1 >= category.questions.length || lives <= 0) {
      setRoundDone(true);
      const isPerfect = correctCount === category.questions.length;
      const baseXp = XP_REWARDS.QUIZ_COMPLETE; // +25 XP
      const perfectBonus = isPerfect ? XP_REWARDS.QUIZ_PERFECT_BONUS : 0; // +50 XP
      onCompleteQuizRound?.({
        categoryId: category.id,
        score,
        correctCount,
        totalQuestions: category.questions.length,
        isPerfect,
        xpEarned: baseXp + perfectBonus,
        coinsEarned: 35 + (isPerfect ? 40 : 0),
      });
    } else {
      setQIdx((i) => i + 1);
      setSelectedOpt(null);
      setTimeLeft(15);
    }
  };

  return (
    <div className="arcade-game-container knowledge-arena-shell">
      {/* Category Selector Pills */}
      <div className="ka-category-bar" role="tablist" aria-label="Knowledge Arena Categories">
        {ARENA_CATEGORIES.map((cat) => {
          const isCleared = Boolean(completedCategories[cat.id]);
          const isActive = cat.id === selectedCatId;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`ka-cat-btn ${isActive ? 'is-active' : ''} ${isCleared ? 'is-cleared' : ''}`}
              style={{ '--cat-col': cat.color }}
              onClick={() => startCategory(cat.id)}
            >
              <span className="ka-cat-code">{cat.code}</span>
              <strong>{cat.title}</strong>
              {isCleared && <CheckCircle2 size={13} className="ka-done-icon" />}
            </button>
          );
        })}
      </div>

      {/* Top Arcade Quiz HUD (Hearts, Streak, Timer Toggle, Score) */}
      <div className="arcade-game-hud-bar">
        <div className="ka-hearts-row" aria-label={`Suit Lives: ${lives}`}>
          <span>SUIT SHIELD:</span>
          {[1, 2, 3].map((h) => (
            <Heart
              key={h}
              size={18}
              fill={h <= lives ? '#f43f5e' : 'transparent'}
              color={h <= lives ? '#f43f5e' : '#475569'}
            />
          ))}
        </div>

        <div className="agh-pill is-gold">
          <Flame size={15} />
          <span>STREAK:</span>
          <strong>{streak}x</strong>
        </div>

        <button
          type="button"
          className={`ka-timer-toggle ${timerEnabled ? 'is-on' : ''}`}
          onClick={() => {
            setTimerEnabled((v) => !v);
            setTimeLeft(15);
          }}
        >
          <Timer size={14} />
          <span>{timerEnabled ? `TIMER: ${timeLeft}s` : 'TIMER: OFF (CLICK TO ENABLE)'}</span>
        </button>

        <div className="agh-pill is-cyan">
          <span>ROUND:</span>
          <strong>{qIdx + 1} / {category.questions.length}</strong>
        </div>

        <div className="agh-pill is-gold">
          <span>SCORE:</span>
          <strong>{score}</strong>
        </div>
      </div>

      {/* Active Question Stage OR Round Summary */}
      {!roundDone ? (
        <div className="ka-question-stage">
          <div className="ka-question-top">
            <div className="ka-q-meta">
              <span className="ka-diff-pill" style={{ color: category.color }}>
                {category.title} // {currentQ.difficulty}
              </span>
              <h2 className="ka-q-headline">{currentQ.question}</h2>
            </div>

            <QuestionVisualIllustration type={currentQ.visualType} />
          </div>

          {/* 4 Big Arcade Answer Buttons */}
          <div className="ka-options-grid">
            {currentQ.options.map((opt, idx) => {
              const letters = ['A', 'B', 'C', 'D'];
              const isAnswered = selectedOpt !== null;
              const isCorrect = idx === currentQ.correctIdx;
              const isChosen = idx === selectedOpt;

              let btnState = '';
              if (isAnswered) {
                if (isCorrect) btnState = 'is-correct';
                else if (isChosen) btnState = 'is-wrong';
                else btnState = 'is-dimmed';
              }

              return (
                <button
                  key={opt}
                  type="button"
                  disabled={isAnswered}
                  className={`ka-option-btn ${btnState}`}
                  onClick={() => handleAnswer(idx)}
                >
                  <span className="ka-opt-letter">{letters[idx]}</span>
                  <span className="ka-opt-text">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Immediate Feedback Banner + Max 2-Sentence Explanation + Continue Button */}
          {selectedOpt !== null && (
            <div
              className={`ka-feedback-card ${selectedOpt === currentQ.correctIdx ? 'is-ok' : 'is-bad'}`}
              role="status"
            >
              <div className="kafc-left">
                {selectedOpt === currentQ.correctIdx ? (
                  <CheckCircle2 size={24} className="kafc-icon-ok" />
                ) : (
                  <XCircle size={24} className="kafc-icon-bad" />
                )}
                <div>
                  <strong>
                    {selectedOpt === currentQ.correctIdx
                      ? 'CORRECT TELEMETRY! +100 PTS'
                      : selectedOpt === -1
                      ? 'TIME EXPIRED!'
                      : 'INCORRECT — SHIELD HIT!'}
                  </strong>
                  <p>{currentQ.explanation}</p>
                </div>
              </div>

              <button type="button" className="arcade-btn is-primary" onClick={handleNext}>
                <span>{qIdx + 1 >= category.questions.length || lives <= 0 ? 'FINISH ROUND' : 'CONTINUE'}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="ka-round-summary-card">
          <Trophy size={44} className="icon-gold" />
          <h2>
            {correctCount === category.questions.length
              ? 'PERFECT 5/5 KNOWLEDGE ROUND!'
              : `${category.title} ROUND COMPLETE!`}
          </h2>
          <p className="result-score-line">
            ACCURACY: <strong>{correctCount} / {category.questions.length}</strong> · SCORE: <strong>{score}</strong>
          </p>

          <div className="ka-xp-breakdown">
            <span>ROUND COMPLETED: <b>+{XP_REWARDS.QUIZ_COMPLETE} XP</b></span>
            {correctCount === category.questions.length && (
              <span className="perfect-tag">🌟 PERFECT ROUND BONUS: <b>+{XP_REWARDS.QUIZ_PERFECT_BONUS} XP</b></span>
            )}
          </div>

          <div className="arcade-result-actions">
            <button type="button" className="arcade-btn is-primary" onClick={() => startCategory(selectedCatId)}>
              <RotateCcw size={15} />
              <span>REPLAY CATEGORY</span>
            </button>
            {ARENA_CATEGORIES.map((c) => c.id).indexOf(selectedCatId) < ARENA_CATEGORIES.length - 1 && (
              <button
                type="button"
                className="arcade-btn is-gold"
                onClick={() => {
                  const nextIdx = ARENA_CATEGORIES.findIndex((c) => c.id === selectedCatId) + 1;
                  startCategory(ARENA_CATEGORIES[nextIdx].id);
                }}
              >
                <span>NEXT CATEGORY</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
