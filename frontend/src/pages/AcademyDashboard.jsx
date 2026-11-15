import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  ArrowLeft,
  Rocket,
  Zap,
  Trophy,
  Award,
  Sparkles,
  Compass,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import {
  GAME_WORLDS,
  ACADEMY_ACHIEVEMENTS,
  DAILY_MISSIONS,
  INITIAL_ACADEMY_STATE,
  loadAcademyState,
  saveAcademyState,
  getPlayerLevelInfo,
} from '../components/academy/academyState.js';
import MoonRoverGame from '../components/academy/games/MoonRoverGame.jsx';
import PowerGridGame from '../components/academy/games/PowerGridGame.jsx';
import LunarLanderGame from '../components/academy/games/LunarLanderGame.jsx';
import PhysicsArenaGame from '../components/academy/games/PhysicsArenaGame.jsx';
import MoonBaseBuilderGame from '../components/academy/games/MoonBaseBuilderGame.jsx';
import '../styles/academy.css';

export default function AcademyDashboard({
  onReturnLanding,
  onEnterMissionControl,
}) {
  const [state, setState] = useState(() => loadAcademyState());
  const [selectedWorldId, setSelectedWorldId] = useState(() => state.lastPlayedGame || 'rover');
  const [activeGameId, setActiveGameId] = useState(null); // null = Main Menu Hub | 'rover' | 'power' | 'lander' | 'physics' | 'builder'
  const [rewardBanner, setRewardBanner] = useState(null);

  useEffect(() => {
    saveAcademyState(state);
  }, [state]);

  const levelInfo = getPlayerLevelInfo(state.xp);
  const selectedWorld = GAME_WORLDS.find((w) => w.id === selectedWorldId) || GAME_WORLDS[0];
  const lastWorld = GAME_WORLDS.find((w) => w.id === state.lastPlayedGame) || GAME_WORLDS[0];

  const handleLaunchGame = (worldId) => {
    setSelectedWorldId(worldId);
    setActiveGameId(worldId);
    setState((prev) => ({
      ...prev,
      lastPlayedGame: worldId,
      energy: Math.max(10, prev.energy - 5),
    }));
  };

  // Central Game Completion & Reward Handler
  const handleCompleteGame = useCallback(
    ({ gameId, score = 0, xpEarned = 100, coinsEarned = 80, badgeId = null, dailyId = null }) => {
      setState((prev) => {
        const nextCompleted = { ...prev.completedGames, [gameId]: true };
        const prevBest = prev.highScores?.[gameId] || 0;
        const nextHighScores = {
          ...prev.highScores,
          [gameId]: Math.max(prevBest, score),
        };

        const nextBadges = [...prev.unlockedBadges];
        let bonusXp = 0;
        let bonusCoins = 0;
        const unlockedNames = [];

        const tryUnlock = (id) => {
          if (id && !nextBadges.includes(id)) {
            nextBadges.push(id);
            const bDef = ACADEMY_ACHIEVEMENTS.find((b) => b.id === id);
            if (bDef) {
              bonusXp += bDef.xpBonus;
              bonusCoins += bDef.coinBonus;
              unlockedNames.push(bDef.title);
            }
          }
        };

        tryUnlock(badgeId);

        const nextClaimedDaily = { ...prev.claimedDaily };
        if (dailyId && !nextClaimedDaily[dailyId]) {
          nextClaimedDaily[dailyId] = true;
          const dDef = DAILY_MISSIONS.find((d) => d.id === dailyId);
          if (dDef) {
            bonusXp += dDef.rewardXp;
            bonusCoins += dDef.rewardCoins;
            unlockedNames.push(`QUEST: ${dDef.title}`);
          }
        }

        const totalNewCoins = prev.coins + coinsEarned + bonusCoins;
        if (totalNewCoins >= 500) {
          tryUnlock('arcade-champion');
        }

        const totalXpGain = xpEarned + bonusXp;
        const totalCoinGain = coinsEarned + bonusCoins;

        setRewardBanner(
          unlockedNames.length > 0
            ? `🏆 UNLOCKED: ${unlockedNames.join(' + ')}! (+${totalXpGain} XP & +${totalCoinGain} 🪙)`
            : `⚡ MISSION COMPLETE! +${totalXpGain} XP & +${totalCoinGain} COINS!`
        );

        return {
          ...prev,
          xp: prev.xp + totalXpGain,
          coins: totalNewCoins,
          energy: Math.min(100, prev.energy + 15),
          completedGames: nextCompleted,
          highScores: nextHighScores,
          unlockedBadges: nextBadges,
          claimedDaily: nextClaimedDaily,
        };
      });
    },
    []
  );

  const handleResetSave = () => {
    setState(INITIAL_ACADEMY_STATE);
    saveAcademyState(INITIAL_ACADEMY_STATE);
    setRewardBanner('GAME SAVE RESET — READY FOR A NEW ADVENTURE!');
  };

  return (
    <div className="lunav-arcade-shell">
      {/* 1. TOP ARCADE HUD BAR (Level, XP Bar, Coins, Energy, Pro Mode Switch) */}
      <header className="arcade-top-hud">
        <div className="ath-left">
          <button
            type="button"
            className="ath-back-btn"
            onClick={() => (activeGameId ? setActiveGameId(null) : onReturnLanding?.())}
          >
            <ArrowLeft size={15} />
            <span>{activeGameId ? 'GAME MENU' : 'EXIT'}</span>
          </button>

          {/* Player Level & Animated XP Progress Bar */}
          <div className="ath-player-badge">
            <div className="ath-lvl-circle" style={{ borderColor: levelInfo.currentRank.badgeColor }}>
              <span>LVL</span>
              <strong>{levelInfo.numericLevel}</strong>
            </div>
            <div className="ath-xp-col">
              <div className="ath-rank-row">
                <strong style={{ color: levelInfo.currentRank.badgeColor }}>
                  {levelInfo.currentRank.title}
                </strong>
                <span>{state.xp} XP</span>
              </div>
              <div className="ath-xp-track">
                <div
                  className="ath-xp-fill"
                  style={{ width: `${levelInfo.levelProgressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center Currencies: Coins, Energy & Badges */}
        <div className="ath-currencies">
          <div className="currency-pill is-coins" title="Lunar Coins">
            <span className="curr-emoji">🪙</span>
            <strong>{state.coins}</strong>
            <small>COINS</small>
          </div>

          <div className="currency-pill is-energy" title="Suit Energy">
            <span className="curr-emoji">⚡</span>
            <strong>{state.energy}/100</strong>
            <small>ENERGY</small>
          </div>

          <div className="currency-pill is-badges" title="Unlocked Badges">
            <span className="curr-emoji">🏅</span>
            <strong>{state.unlockedBadges.length}/{ACADEMY_ACHIEVEMENTS.length}</strong>
            <small>BADGES</small>
          </div>
        </div>

        <div className="ath-right">
          <button
            type="button"
            className="ath-pro-btn"
            onClick={() => onEnterMissionControl?.()}
          >
            <Rocket size={14} />
            <span>PRO TELEMETRY HUD →</span>
          </button>
        </div>
      </header>

      {/* Floating Reward Notification Toast */}
      {rewardBanner && (
        <div className="arcade-reward-toast" role="status">
          <Sparkles size={16} />
          <span>{rewardBanner}</span>
          <button type="button" onClick={() => setRewardBanner(null)}>✕</button>
        </div>
      )}

      {/* 2. MAIN VIEW: VIDEO GAME MAIN MENU HUB OR ACTIVE PLAYABLE GAME */}
      {activeGameId === null ? (
        <div className="arcade-main-menu-grid">
          {/* LEFT / CENTER: ILLUSTRATED LUNAR STAGE WITH ASTRONAUT & ROVER + BIG PLAY BUTTONS */}
          <section className="arcade-hero-stage" aria-label="Lunar Game Stage">
            {/* Illustrated Animated SVG Lunar Scene with Astronaut & Rover Protagonists */}
            <svg viewBox="0 0 860 320" className="hero-lunar-illustration" aria-hidden="true">
              <defs>
                <linearGradient id="spaceBg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#090D16" />
                  <stop offset="65%" stopColor="#101827" />
                  <stop offset="100%" stopColor="#151A1E" />
                </linearGradient>
                <radialGradient id="earthGlow" cx="0.35" cy="0.35" r="0.7">
                  <stop offset="0%" stopColor="#42E8E8" />
                  <stop offset="55%" stopColor="#25BFFF" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </radialGradient>
              </defs>

              <rect width="860" height="320" fill="url(#spaceBg)" />

              {/* Twinkling Stars */}
              <g fill="#ffffff" opacity="0.8">
                <circle cx="70" cy="45" r="1.5" />
                <circle cx="165" cy="80" r="2" />
                <circle cx="290" cy="35" r="1.5" />
                <circle cx="440" cy="60" r="2.2" />
                <circle cx="580" cy="40" r="1.5" />
                <circle cx="790" cy="70" r="2" />
                <circle cx="660" cy="95" r="1.4" />
              </g>

              {/* Glowing Blue Earth in Sky */}
              <circle cx="715" cy="78" r="34" fill="url(#earthGlow)" />
              <circle cx="715" cy="78" r="42" fill="none" stroke="#42E8E8" strokeOpacity="0.3" strokeWidth="2" />

              {/* Distant Lunar Crater Mountains */}
              <path d="M 0 235 L 120 175 L 235 220 L 380 155 L 520 215 L 680 165 L 860 225 L 860 320 L 0 320 Z" fill="#172234" />

              {/* Foreground Illustrated Lunar Surface & Crater Rim */}
              <path d="M 0 245 Q 240 210 470 242 T 860 230 L 860 320 L 0 320 Z" fill="#1e293b" stroke="#25BFFF" strokeWidth="2.5" />
              <ellipse cx="640" cy="275" rx="95" ry="22" fill="#0f172a" stroke="#42E8E8" strokeWidth="2" />

              {/* Animated Lunar Rover Protagonist (Center-Right) */}
              <g transform="translate(475, 212)" className="hero-rover-float">
                {/* Headlight cone */}
                <polygon points="48,-4 170,-28 170,24" fill="#42E8E8" opacity="0.22" />
                {/* Rover Body */}
                <rect x="-42" y="-20" width="88" height="30" rx="8" fill="#f8fafc" stroke="#25BFFF" strokeWidth="3" />
                {/* Canopy */}
                <path d="M -8 -20 A 20 18 0 0 1 32 -20 Z" fill="#42E8E8" />
                {/* Solar Mast */}
                <line x1="-24" y1="-20" x2="-24" y2="-42" stroke="#cbd5e1" strokeWidth="3" />
                <rect x="-42" y="-48" width="36" height="8" rx="2" fill="#FFC247" />
                {/* Wheels */}
                <circle cx="-26" cy="16" r="13" fill="#0f172a" stroke="#FFC247" strokeWidth="3.5" />
                <circle cx="2" cy="16" r="13" fill="#0f172a" stroke="#FFC247" strokeWidth="3.5" />
                <circle cx="30" cy="16" r="13" fill="#0f172a" stroke="#FFC247" strokeWidth="3.5" />
              </g>

              {/* Animated Astronaut Protagonist (Center-Left) */}
              <g transform="translate(295, 198)" className="hero-astronaut-bounce">
                {/* Jetpack */}
                <rect x="-24" y="-14" width="12" height="34" rx="4" fill="#94a3b8" />
                {/* Suit Torso & Legs */}
                <rect x="-16" y="-16" width="32" height="38" rx="9" fill="#ffffff" stroke="#25BFFF" strokeWidth="3" />
                <rect x="-13" y="20" width="10" height="18" rx="4" fill="#ffffff" stroke="#25BFFF" strokeWidth="2.5" />
                <rect x="3" y="20" width="10" height="18" rx="4" fill="#ffffff" stroke="#25BFFF" strokeWidth="2.5" />
                {/* Helmet & Golden Visor */}
                <circle cx="0" cy="-32" r="20" fill="#ffffff" stroke="#25BFFF" strokeWidth="3" />
                <rect x="-13" y="-40" width="26" height="15" rx="6" fill="#FFC247" />
                {/* Flag Beacon */}
                <line x1="28" y1="-48" x2="28" y2="36" stroke="#21D69B" strokeWidth="3" />
                <polygon points="28,-48 68,-38 28,-26" fill="#21D69B" />
              </g>
            </svg>

            {/* Hero Overlay: Selected World Title & Big PLAY / CONTINUE MISSION Buttons */}
            <div className="hero-stage-overlay">
              <div className="hso-selected-badge">
                <span className="hso-code">{selectedWorld.code} // {selectedWorld.location.toUpperCase()}</span>
                <h1 className="hso-title">{selectedWorld.title}</h1>
                <p className="hso-objective">{selectedWorld.shortObjective}</p>
              </div>

              <div className="hso-cta-row">
                <button
                  type="button"
                  className="big-arcade-play-btn"
                  onClick={() => handleLaunchGame(selectedWorld.id)}
                >
                  <Play size={22} fill="currentColor" />
                  <span>PLAY NOW</span>
                </button>

                <button
                  type="button"
                  className="big-continue-mission-btn"
                  onClick={() => handleLaunchGame(lastWorld.id)}
                >
                  <Zap size={18} />
                  <div className="bcm-text">
                    <strong>CONTINUE MISSION</strong>
                    <small>{lastWorld.title}</small>
                  </div>
                </button>
              </div>
            </div>
          </section>

          {/* 3. VISUAL WORLD / LUNAR REGION SELECTOR (5 Playable Arcade Worlds) */}
          <section className="worlds-selector-section" aria-label="Select Lunar World">
            <div className="wss-header">
              <h2>SELECT LUNAR MISSION WORLD</h2>
              <span>{Object.keys(state.completedGames).length} / 5 WORLDS CONQUERED</span>
            </div>

            <div className="worlds-cards-row">
              {GAME_WORLDS.map((w) => {
                const isSelected = w.id === selectedWorldId;
                const isDone = Boolean(state.completedGames[w.id]);
                const highScore = state.highScores?.[w.id] || 0;
                return (
                  <div
                    key={w.id}
                    className={`world-arcade-card ${isSelected ? 'is-selected' : ''} ${isDone ? 'is-completed' : ''}`}
                    style={{ '--w-color': w.color }}
                    onClick={() => setSelectedWorldId(w.id)}
                  >
                    <div className="wac-top">
                      <span className="wac-code" style={{ color: w.color }}>{w.code}</span>
                      {isDone ? (
                        <span className="wac-done-badge">
                          <CheckCircle2 size={13} /> CLEARED
                        </span>
                      ) : (
                        <span className="wac-reward-tag">+{w.xpReward} XP</span>
                      )}
                    </div>

                    <h3 className="wac-title">{w.title}</h3>
                    <span className="wac-tag">{w.tag}</span>
                    <p className="wac-obj">{w.shortObjective}</p>

                    <div className="wac-bottom">
                      <span className="wac-best">🏆 BEST: {highScore}</span>
                      <button
                        type="button"
                        className="wac-play-btn"
                        style={{ background: w.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchGame(w.id);
                        }}
                      >
                        <Play size={13} fill="currentColor" /> PLAY
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. BOTTOM ROW: DAILY MISSIONS & UNLOCKED BADGES SHOWCASE */}
          <div className="arcade-bottom-panels">
            {/* Daily & Special Quests */}
            <section className="arcade-quests-box">
              <div className="aqb-head">
                <Zap size={16} className="icon-gold" />
                <h3>ACTIVE LUNAR QUESTS</h3>
              </div>

              <div className="quests-list">
                {DAILY_MISSIONS.map((q) => {
                  const done = Boolean(state.claimedDaily?.[q.id]);
                  return (
                    <div key={q.id} className={`quest-row-card ${done ? 'is-done' : ''}`}>
                      <div>
                        <strong>{q.title}</strong>
                        <p>{q.task}</p>
                      </div>
                      <button
                        type="button"
                        className="quest-go-btn"
                        onClick={() => handleLaunchGame(q.targetGame)}
                      >
                        {done ? '✓ CLAIMED' : `+${q.rewardCoins} 🪙 GO`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Unlocked Achievement Badges */}
            <section className="arcade-badges-box">
              <div className="aqb-head">
                <Award size={16} className="icon-cyan" />
                <h3>PLAYER TROPHY BADGES ({state.unlockedBadges.length}/{ACADEMY_ACHIEVEMENTS.length})</h3>
                {state.xp > 0 && (
                  <button type="button" className="reset-save-link" onClick={handleResetSave}>
                    <RotateCcw size={12} /> RESET SAVE
                  </button>
                )}
              </div>

              <div className="trophy-badges-grid">
                {ACADEMY_ACHIEVEMENTS.map((b) => {
                  const unlocked = state.unlockedBadges.includes(b.id);
                  return (
                    <div
                      key={b.id}
                      className={`trophy-badge-pill ${unlocked ? 'is-unlocked' : 'is-locked'}`}
                      style={{ '--b-col': b.color }}
                      title={b.description}
                    >
                      <Trophy size={16} style={{ color: unlocked ? b.color : '#475569' }} />
                      <div>
                        <strong>{b.title}</strong>
                        <small>{unlocked ? 'UNLOCKED!' : b.description}</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      ) : (
        /* ACTIVE GAME STAGE WITH INSTANT WORLD SWITCHER TABS */
        <div className="active-game-stage-wrapper">
          <div className="game-quick-switcher">
            {GAME_WORLDS.map((w) => (
              <button
                key={w.id}
                type="button"
                className={`gqs-tab ${activeGameId === w.id ? 'is-active' : ''}`}
                style={{ '--w-color': w.color }}
                onClick={() => handleLaunchGame(w.id)}
              >
                <span>{w.code}:</span>
                <strong>{w.title}</strong>
              </button>
            ))}
          </div>

          {activeGameId === 'rover' && (
            <MoonRoverGame
              bestScore={state.highScores?.rover || 0}
              onCompleteGame={handleCompleteGame}
            />
          )}
          {activeGameId === 'power' && (
            <PowerGridGame onCompleteGame={handleCompleteGame} />
          )}
          {activeGameId === 'lander' && (
            <LunarLanderGame onCompleteGame={handleCompleteGame} />
          )}
          {activeGameId === 'physics' && (
            <PhysicsArenaGame onCompleteGame={handleCompleteGame} />
          )}
          {activeGameId === 'builder' && (
            <MoonBaseBuilderGame onCompleteGame={handleCompleteGame} />
          )}
        </div>
      )}
    </div>
  );
}
