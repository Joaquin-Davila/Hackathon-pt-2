/**
 * LuNav Academy — Arcade Video Game Progression, Currencies, High Scores & Persistence Engine
 * "Don't just learn about the Moon. Play to explore it."
 */

const STORAGE_KEY = 'lunav_academy_arcade_v2';

export const GAME_WORLDS = [
  {
    id: 'rover',
    code: 'WORLD 01',
    title: 'MOON ROVER: CRATER RUN',
    tag: 'ARCADE RACING & SAMPLES',
    location: 'Shackleton South Ridge',
    color: '#25BFFF',
    accent: '#42E8E8',
    xpReward: 150,
    coinReward: 100,
    shortObjective: 'Drive across craters, collect ice cores & reach the beacon!',
  },
  {
    id: 'power',
    code: 'WORLD 02',
    title: 'POWER GRID: LUNAR BASE',
    tag: 'ENERGY PUZZLE & SURVIVAL',
    location: 'Peak of Eternal Light',
    color: '#FFC247',
    accent: '#21D69B',
    xpReward: 160,
    coinReward: 120,
    shortObjective: 'Place solar panels, wire batteries & survive the lunar eclipse!',
  },
  {
    id: 'lander',
    code: 'WORLD 03',
    title: 'LUNAR LANDER: TOUCHDOWN',
    tag: '1.62 m/s² THRUSTER ARCADE',
    location: 'Malapert Descent Zone',
    color: '#21D69B',
    accent: '#25BFFF',
    xpReward: 180,
    coinReward: 140,
    shortObjective: 'Fire thrusters & land softly on the target pad without crashing!',
  },
  {
    id: 'physics',
    code: 'WORLD 04',
    title: 'EARTH VS MOON: PHYSICS ARENA',
    tag: 'INTERACTIVE GRAVITY SANDBOX',
    location: 'Apollo 15 Vacuum Lab',
    color: '#42E8E8',
    accent: '#FFC247',
    xpReward: 140,
    coinReward: 100,
    shortObjective: 'Jump 6x higher, switch planets & drop hammer vs. feather!',
  },
  {
    id: 'builder',
    code: 'WORLD 05',
    title: 'BUILD YOUR MOON BASE',
    tag: 'COLONY STRATEGY SANDBOX',
    location: 'Artemis Base Camp Alpha',
    color: '#a855f7',
    accent: '#21D69B',
    xpReward: 200,
    coinReward: 180,
    shortObjective: 'Construct habitats, solar towers, labs & expand your lunar colony!',
  },
];

export const ACADEMY_RANKS = [
  { id: 'rookie', level: 1, title: 'ROOKIE CADET', minXp: 0, badgeColor: '#42E8E8' },
  { id: 'pilot', level: 2, title: 'ROVER PILOT', minXp: 250, badgeColor: '#25BFFF' },
  { id: 'specialist', level: 3, title: 'LUNAR SPECIALIST', minXp: 550, badgeColor: '#21D69B' },
  { id: 'commander', level: 4, title: 'ARTEMIS COMMANDER', minXp: 950, badgeColor: '#FFC247' },
  { id: 'legend', level: 5, title: 'MOON BASE LEGEND', minXp: 1500, badgeColor: '#f43f5e' },
];

export const ACADEMY_ACHIEVEMENTS = [
  {
    id: 'first-landing',
    title: 'FIRST LANDING',
    description: 'Land the Lunar Module safely on a target pad in Lunar Lander: Touchdown.',
    icon: 'Rocket',
    color: '#21D69B',
    xpBonus: 75,
    coinBonus: 50,
  },
  {
    id: 'crater-explorer',
    title: 'CRATER EXPLORER',
    description: 'Drive the Lunar Rover across craters & reach the finish beacon in Crater Run.',
    icon: 'Compass',
    color: '#25BFFF',
    xpBonus: 75,
    coinBonus: 50,
  },
  {
    id: 'energy-engineer',
    title: 'ENERGY ENGINEER',
    description: 'Keep the lunar habitat powered through a solar eclipse in Power Grid.',
    icon: 'Zap',
    color: '#FFC247',
    xpBonus: 75,
    coinBonus: 50,
  },
  {
    id: 'gravity-master',
    title: 'GRAVITY MASTER',
    description: 'Test Moon jumps and the Vacuum Hammer & Feather drop in Physics Arena.',
    icon: 'Sparkles',
    color: '#42E8E8',
    xpBonus: 75,
    coinBonus: 50,
  },
  {
    id: 'lunar-architect',
    title: 'LUNAR ARCHITECT',
    description: 'Build a thriving self-sustaining lunar colony in Build Your Moon Base.',
    icon: 'Award',
    color: '#a855f7',
    xpBonus: 100,
    coinBonus: 80,
  },
  {
    id: 'arcade-champion',
    title: 'ARCADE CHAMPION',
    description: 'Accumulate 500+ Lunar Coins across all 5 space missions.',
    icon: 'Trophy',
    color: '#f59e0b',
    xpBonus: 120,
    coinBonus: 100,
  },
];

export const DAILY_MISSIONS = [
  {
    id: 'daily-samples',
    title: 'ICE HUNTER',
    task: 'Collect 5 lunar ice samples in Moon Rover',
    targetGame: 'rover',
    rewardXp: 60,
    rewardCoins: 40,
  },
  {
    id: 'daily-touchdown',
    title: 'SOFT TOUCHDOWN',
    task: 'Land with < 1.8 m/s vertical speed in Lunar Lander',
    targetGame: 'lander',
    rewardXp: 70,
    rewardCoins: 50,
  },
  {
    id: 'daily-jump',
    title: 'LOW-G ACROBAT',
    task: 'Perform a 6x Moon Jump & Vacuum Drop in Physics Arena',
    targetGame: 'physics',
    rewardXp: 50,
    rewardCoins: 35,
  },
];

export const INITIAL_ACADEMY_STATE = {
  xp: 0,
  coins: 120,
  energy: 100,
  maxEnergy: 100,
  lastPlayedGame: 'rover',
  completedGames: {}, // { rover: true, power: true, lander: true, physics: true, builder: true }
  highScores: {
    rover: 0,
    power: 0,
    lander: 0,
    physics: 0,
    builder: 0,
  },
  unlockedBadges: [], // ['first-landing', ...]
  claimedDaily: {}, // { 'daily-samples': true }
};

export function loadAcademyState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_ACADEMY_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_ACADEMY_STATE,
      ...parsed,
      completedGames: parsed.completedGames || {},
      highScores: {
        ...INITIAL_ACADEMY_STATE.highScores,
        ...(parsed.highScores || {}),
      },
      unlockedBadges: Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges : [],
      claimedDaily: parsed.claimedDaily || {},
    };
  } catch {
    return INITIAL_ACADEMY_STATE;
  }
}

export function saveAcademyState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

export function getPlayerLevelInfo(xp = 0) {
  // Smooth RPG level curve: every 200 XP is a player level, plus rank titles
  const numericLevel = Math.floor(xp / 200) + 1;
  const xpIntoLevel = xp % 200;
  const levelProgressPct = Math.min(100, Math.round((xpIntoLevel / 200) * 100));

  let currentRank = ACADEMY_RANKS[0];
  for (let i = 0; i < ACADEMY_RANKS.length; i++) {
    if (xp >= ACADEMY_RANKS[i].minXp) {
      currentRank = ACADEMY_RANKS[i];
    }
  }
  const nextRankIdx = ACADEMY_RANKS.findIndex((r) => r.id === currentRank.id) + 1;
  const nextRank = nextRankIdx < ACADEMY_RANKS.length ? ACADEMY_RANKS[nextRankIdx] : null;

  return {
    numericLevel,
    xpIntoLevel,
    xpPerLevel: 200,
    levelProgressPct,
    currentRank,
    nextRank,
  };
}
