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
  Brain,
  Scale,
  Hammer,
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
import LunarKnowledgeArena from '../components/academy/games/LunarKnowledgeArena.jsx';
import LuNavFieldTraining from '../components/academy/games/LuNavFieldTraining.jsx';
import '../styles/academy.css';

export default function AcademyDashboard({
  onReturnLanding,
  onEnterMissionControl,
}) {
  const [state, setState] = useState(() => loadAcademyState());
  const [selectedWorldId, setSelectedWorldId] = useState(() => state.lastPlayedGame || 'rover');
  // null = Main Menu Hub | 'rover' | 'power' | 'lander' | 'physics' | 'builder' | 'knowledge' | 'field-training'
  const [activeGameId, setActiveGameId] = useState(null);
  const [rewardBanner, setRewardBanner] = useState(null);

  useEffect(() => {
    saveAcademyState(state);
  }, [state]);

  const levelInfo = getPlayerLevelInfo(state.xp);
  const selectedWorld = GAME_WORLDS.find((w) => w.id === selectedWorldId) || GAME_WORLDS[0];
  const lastWorld = GAME_WORLDS.find((w) => w.id === state.lastPlayedGame) || GAME_WORLDS[0];

  const handleLaunchGame = (modeId) => {
    if (GAME_WORLDS.some((w) => w.id === modeId)) {
      setSelectedWorldId(modeId);
      setState((prev) => ({
        ...prev,
        lastPlayedGame: modeId,
      }));
    }
    setActiveGameId(modeId);
  };

  // Central Anti-Farming XP & Badge Engine
  const awardProgress = useCallback(
    ({
      activityKey,
      gameId = null,
      score = 0,
      xpEarned = 0,
      coinsEarned = 0,
      badgeIds = [],
      dailyId = null,
      fieldMissionId = null,
      comparativeLabId = null,
      quizCategoryId = null,
    }) => {
      setState((prev) => {
        const alreadyClaimedActivity = activityKey
          ? Boolean(prev.completedActivities?.[activityKey])
          : false;

        const nextCompletedActivities = { ...prev.completedActivities };
        if (activityKey) {
          nextCompletedActivities[activityKey] = true;
        }

        const nextCompletedGames = { ...prev.completedGames };
        if (gameId) {
          nextCompletedGames[gameId] = true;
        }

        const nextFieldMissions = { ...prev.fieldMissionsDone };
        if (fieldMissionId) {
          nextFieldMissions[fieldMissionId] = true;
        }

        const nextComparativeLabs = { ...prev.comparativeLabsDone };
        if (comparativeLabId) {
          nextComparativeLabs[comparativeLabId] = true;
        }

        const nextQuizCategories = { ...prev.quizCategoriesDone };
        if (quizCategoryId) {
          nextQuizCategories[quizCategoryId] = true;
        }

        const nextHighScores = { ...prev.highScores };
        if (gameId && score > (nextHighScores[gameId] || 0)) {
          nextHighScores[gameId] = score;
        }

        // Only award XP & Coins if this specific activity Key wasn't already farmed
        const effectiveXp = alreadyClaimedActivity ? 0 : xpEarned;
        const effectiveCoins = alreadyClaimedActivity ? 0 : coinsEarned;

        const nextBadges = [...prev.unlockedBadges];
        let bonusXp = 0;
        let bonusCoins = 0;
        const unlockedTitles = [];

        const tryUnlockBadge = (bId) => {
          if (bId && !nextBadges.includes(bId)) {
            nextBadges.push(bId);
            const bDef = ACADEMY_ACHIEVEMENTS.find((b) => b.id === bId);
            if (bDef) {
              bonusXp += bDef.xpBonus;
              bonusCoins += bDef.coinBonus;
              unlockedTitles.push(bDef.title);
            }
          }
        };

        badgeIds.filter(Boolean).forEach(tryUnlockBadge);

        // Auto-unlock Physics Explorer when 3+ Comparative Labs are completed
        if (Object.keys(nextComparativeLabs).length >= 3) {
          tryUnlockBadge('physics-explorer');
        }

        // Auto-unlock Map Navigator when 3+ Field Training Missions are completed
        if (Object.keys(nextFieldMissions).length >= 3) {
          tryUnlockBadge('map-navigator');
        }

        const nextClaimedDaily = { ...prev.claimedDaily };
        if (dailyId && !nextClaimedDaily[dailyId]) {
          nextClaimedDaily[dailyId] = true;
          const dDef = DAILY_MISSIONS.find((d) => d.id === dailyId);
          if (dDef) {
            bonusXp += dDef.rewardXp;
            bonusCoins += dDef.rewardCoins;
            unlockedTitles.push(`QUEST: ${dDef.title}`);
          }
        }

        const totalXpGain = effectiveXp + bonusXp;
        const totalCoinGain = effectiveCoins + bonusCoins;

        if (unlockedTitles.length > 0) {
          setRewardBanner(
            `🏆 BADGE UNLOCKED: ${unlockedTitles.join(' + ')}! (+${totalXpGain} XP & +${totalCoinGain} 🪙)`
          );
        } else if (totalXpGain > 0) {
          setRewardBanner(`⚡ +${totalXpGain} XP & +${totalCoinGain} COINS EARNED!`);
        } else {
          setRewardBanner(`✓ CHALLENGE COMPLETED! (XP ALREADY CLAIMED FOR THIS MISSION)`);
        }

        return {
          ...prev,
          xp: prev.xp + totalXpGain,
          coins: prev.coins + totalCoinGain,
          energy: Math.min(100, prev.energy + 10),
          completedGames: nextCompletedGames,
          completedActivities: nextCompletedActivities,
          fieldMissionsDone: nextFieldMissions,
          comparativeLabsDone: nextComparativeLabs,
          quizCategoriesDone: nextQuizCategories,
          highScores: nextHighScores,
          unlockedBadges: nextBadges,
          claimedDaily: nextClaimedDaily,
        };
      });
    },
    []
  );

  // Handlers for each mode
  const handleCompleteArcadeWorld = useCallback(
    ({ gameId, score = 0, xpEarned = 120, coinsEarned = 80, badgeId = null, secondaryBadgeId = null, dailyId = null }) => {
      awardProgress({
        activityKey: `world-${gameId}`,
        gameId,
        score,
        xpEarned,
        coinsEarned,
        badgeIds: [badgeId, secondaryBadgeId],
        dailyId,
      });
    },
    [awardProgress]
  );

  const handleCompleteQuizRound = useCallback(
    ({ categoryId, score, isPerfect, xpEarned, coinsEarned }) => {
      const key = isPerfect ? `quiz-${categoryId}-perfect` : `quiz-${categoryId}`;
      awardProgress({
        activityKey: key,
        gameId: 'knowledge',
        score,
        xpEarned,
        coinsEarned,
        badgeIds: ['lunar-knowledge'],
        dailyId: 'daily-quiz',
        quizCategoryId: categoryId,
      });
    },
    [awardProgress]
  );

  const handleCompleteFieldMission = useCallback(
    ({ missionId, xpEarned, coinsEarned, badgeId }) => {
      awardProgress({
        activityKey: `field-${missionId}`,
        xpEarned,
        coinsEarned,
        badgeIds: [badgeId],
        dailyId: 'daily-field',
        fieldMissionId: missionId,
      });
    },
    [awardProgress]
  );

  const handleCompleteComparativeLab = useCallback(
    ({ labId, xpEarned, coinsEarned }) => {
      awardProgress({
        activityKey: `complab-${labId}`,
        xpEarned,
        coinsEarned,
        comparativeLabId: labId,
      });
    },
    [awardProgress]
  );

  const handleResetSave = () => {
    setState(INITIAL_ACADEMY_STATE);
    saveAcademyState(INITIAL_ACADEMY_STATE);
    setRewardBanner('GAME SAVE RESET — READY FOR A NEW ADVENTURE!');
  };

  const fieldCount = Object.keys(state.fieldMissionsDone || {}).length;
  const quizCount = Object.keys(state.quizCategoriesDone || {}).length;
  const labCount = Object.keys(state.comparativeLabsDone || {}).length;

  return (
    <div className="lunav-arcade-shell">
      {/* 1. TOP ARCADE HUD BAR */}
      <header className="arcade-top-hud">
        <div className="ath-left">
          <button
            type="button"
            className="ath-back-btn"
            onClick={() => (activeGameId ? setActiveGameId(null) : onReturnLanding?.())}
          >
            <ArrowLeft size={15} />
            <span>{activeGameId ? 'ACADEMY HUB' : 'EXIT'}</span>
          </button>

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
                <div className="ath-xp-fill" style={{ width: `${levelInfo.levelProgressPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="ath-currencies">
          <div className="currency-pill is-coins">
            <span>🪙</span>
            <strong>{state.coins}</strong>
            <small>COINS</small>
          </div>
          <div className="currency-pill is-energy">
            <span>⚡</span>
            <strong>{state.energy}/100</strong>
            <small>ENERGY</small>
          </div>
          <div className="currency-pill is-badges">
            <span>🏅</span>
            <strong>{state.unlockedBadges.length}/{ACADEMY_ACHIEVEMENTS.length}</strong>
            <small>BADGES</small>
          </div>
        </div>

        <div className="ath-right">
          <button type="button" className="ath-pro-btn" onClick={() => onEnterMissionControl?.()}>
            <Rocket size={14} />
            <span>PRO TELEMETRY HUD →</span>
          </button>
        </div>
      </header>

      {rewardBanner && (
        <div className="arcade-reward-toast" role="status">
          <Sparkles size={16} />
          <span>{rewardBanner}</span>
          <button type="button" onClick={() => setRewardBanner(null)}>✕</button>
        </div>
      )}

      {/* 2. MAIN VIEW: HUB OR ACTIVE EXPERIENCE */}
      {activeGameId === null ? (
        <div className="arcade-main-menu-grid">
          {/* HERO STAGE WITH ASTRONAUT & ROVER PROTAGONISTS */}
          <section className="arcade-hero-stage" aria-label="Lunar Game Stage">
            <svg viewBox="0 0 860 300" className="hero-lunar-illustration" aria-hidden="true">
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
              <rect width="860" height="300" fill="url(#spaceBg)" />
              <g fill="#ffffff" opacity="0.8">
                <circle cx="70" cy="45" r="1.5" />
                <circle cx="165" cy="80" r="2" />
                <circle cx="290" cy="35" r="1.5" />
                <circle cx="440" cy="60" r="2.2" />
                <circle cx="580" cy="40" r="1.5" />
                <circle cx="790" cy="70" r="2" />
              </g>
              <circle cx="715" cy="72" r="32" fill="url(#earthGlow)" />
              <path d="M 0 225 L 120 165 L 235 210 L 380 145 L 520 205 L 680 155 L 860 215 L 860 300 L 0 300 Z" fill="#172234" />
              <path d="M 0 235 Q 240 200 470 232 T 860 220 L 860 300 L 0 300 Z" fill="#1e293b" stroke="#25BFFF" strokeWidth="2.5" />

              {/* Animated Rover */}
              <g transform="translate(475, 202)" className="hero-rover-float">
                <polygon points="48,-4 170,-28 170,24" fill="#42E8E8" opacity="0.22" />
                <rect x="-42" y="-20" width="88" height="30" rx="8" fill="#f8fafc" stroke="#25BFFF" strokeWidth="3" />
                <path d="M -8 -20 A 20 18 0 0 1 32 -20 Z" fill="#42E8E8" />
                <line x1="-24" y1="-20" x2="-24" y2="-42" stroke="#cbd5e1" strokeWidth="3" />
                <rect x="-42" y="-48" width="36" height="8" rx="2" fill="#FFC247" />
                <circle cx="-26" cy="16" r="13" fill="#0f172a" stroke="#FFC247" strokeWidth="3.5" />
                <circle cx="2" cy="16" r="13" fill="#0f172a" stroke="#FFC247" strokeWidth="3.5" />
                <circle cx="30" cy="16" r="13" fill="#0f172a" stroke="#FFC247" strokeWidth="3.5" />
              </g>

              {/* Animated Astronaut */}
              <g transform="translate(295, 188)" className="hero-astronaut-bounce">
                <rect x="-24" y="-14" width="12" height="34" rx="4" fill="#94a3b8" />
                <rect x="-16" y="-16" width="32" height="38" rx="9" fill="#ffffff" stroke="#25BFFF" strokeWidth="3" />
                <rect x="-13" y="20" width="10" height="18" rx="4" fill="#ffffff" stroke="#25BFFF" strokeWidth="2.5" />
                <rect x="3" y="20" width="10" height="18" rx="4" fill="#ffffff" stroke="#25BFFF" strokeWidth="2.5" />
                <circle cx="0" cy="-32" r="20" fill="#ffffff" stroke="#25BFFF" strokeWidth="3" />
                <rect x="-13" y="-40" width="26" height="15" rx="6" fill="#FFC247" />
                <line x1="28" y1="-48" x2="28" y2="36" stroke="#21D69B" strokeWidth="3" />
                <polygon points="28,-48 68,-38 28,-26" fill="#21D69B" />
              </g>
            </svg>

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

          {/* 3. PRIMARY PLAY ZONE: THE FIVE LUNAR WORLDS */}
          <section className="worlds-selector-section" aria-label="Select Lunar World">
            <div className="wss-header">
              <h2>PLAY // SELECT LUNAR MISSION WORLD</h2>
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

          {/* 4. SECONDARY COMMAND DECK: DISCOVER & LEARN | TRAIN WITH LUNAV | MISSION PROJECT */}
          <section className="secondary-command-deck" aria-label="Discover, Train with LuNav & Mission Project">
            {/* Group 1: DISCOVER & LEARN */}
            <div className="scd-group-box">
              <div className="scd-group-header">
                <span className="scd-pill is-blue">DISCOVER &amp; LEARN</span>
                <small>Interactive Science Labs &amp; Arcade Trivia</small>
              </div>
              <div className="scd-buttons-stack">
                <button
                  type="button"
                  className="scd-action-card is-blue"
                  onClick={() => handleLaunchGame('knowledge')}
                >
                  <Brain size={22} className="scd-icon" />
                  <div className="scd-meta">
                    <strong>LUNAR KNOWLEDGE ARENA</strong>
                    <span>5 Arcade Quiz Categories · {quizCount}/5 Cleared (+25 XP/round)</span>
                  </div>
                  <span className="scd-go-chip">ENTER →</span>
                </button>

                <button
                  type="button"
                  className="scd-action-card is-cyan"
                  onClick={() => handleLaunchGame('physics')}
                >
                  <Scale size={22} className="scd-icon" />
                  <div className="scd-meta">
                    <strong>EARTH VS MOON LAB</strong>
                    <span>5 Comparative Experiments · {labCount}/5 Verified (+35 XP/lab)</span>
                  </div>
                  <span className="scd-go-chip">EXPERIMENT →</span>
                </button>
              </div>
            </div>

            {/* Group 2: TRAIN WITH LUNAV */}
            <div className="scd-group-box">
              <div className="scd-group-header">
                <span className="scd-pill is-green">TRAIN WITH LUNAV</span>
                <small>Master Real NASA South Pole Maps &amp; Tools</small>
              </div>
              <div className="scd-buttons-stack">
                <button
                  type="button"
                  className="scd-action-card is-green is-featured"
                  onClick={() => handleLaunchGame('field-training')}
                >
                  <Compass size={26} className="scd-icon" />
                  <div className="scd-meta">
                    <strong>LUNAV FIELD TRAINING</strong>
                    <span>
                      5 Guided Missions on Real LROC Polar Map, LOLA DEM &amp; Ephemeris Timeline · {fieldCount}/5 Done (+50 XP each)
                    </span>
                  </div>
                  <span className="scd-go-chip">TRAIN →</span>
                </button>
              </div>
            </div>

            {/* Group 3: MISSION PROJECT */}
            <div className="scd-group-box">
              <div className="scd-group-header">
                <span className="scd-pill is-gold">MISSION PROJECT</span>
                <small>Capstone Lunar Colony &amp; Readiness Report</small>
              </div>
              <div className="scd-buttons-stack">
                <button
                  type="button"
                  className="scd-action-card is-gold is-featured"
                  onClick={() => handleLaunchGame('builder')}
                >
                  <Hammer size={26} className="scd-icon" />
                  <div className="scd-meta">
                    <strong>BUILD YOUR MOON BASE</strong>
                    <span>
                      Place 6 Modules (Habitat, Solar, Comms, Lab, Rover, Storage) &amp; Generate Mission Report (+150 XP)
                    </span>
                  </div>
                  <span className="scd-go-chip">BUILD →</span>
                </button>
              </div>
            </div>
          </section>

          {/* 5. BOTTOM ROW: DAILY QUESTS & TROPHY BADGES */}
          <div className="arcade-bottom-panels">
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
                        {done ? '✓ CLAIMED' : `+${q.rewardXp} XP GO`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

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
                      <Trophy size={15} style={{ color: unlocked ? b.color : '#475569', flexShrink: 0 }} />
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
        /* ACTIVE EXPERIENCE STAGE WITH QUICK SWITCHER */
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
            <button
              type="button"
              className={`gqs-tab ${activeGameId === 'knowledge' ? 'is-active' : ''}`}
              style={{ '--w-color': '#25BFFF' }}
              onClick={() => handleLaunchGame('knowledge')}
            >
              <span>QUIZ:</span>
              <strong>KNOWLEDGE ARENA</strong>
            </button>
            <button
              type="button"
              className={`gqs-tab ${activeGameId === 'field-training' ? 'is-active' : ''}`}
              style={{ '--w-color': '#21D69B' }}
              onClick={() => handleLaunchGame('field-training')}
            >
              <span>OPERATE:</span>
              <strong>LUNAV FIELD TRAINING</strong>
            </button>
          </div>

          {activeGameId === 'rover' && (
            <MoonRoverGame
              bestScore={state.highScores?.rover || 0}
              onCompleteGame={handleCompleteArcadeWorld}
            />
          )}
          {activeGameId === 'power' && (
            <PowerGridGame onCompleteGame={handleCompleteArcadeWorld} />
          )}
          {activeGameId === 'lander' && (
            <LunarLanderGame onCompleteGame={handleCompleteArcadeWorld} />
          )}
          {activeGameId === 'physics' && (
            <PhysicsArenaGame
              completedLabs={state.comparativeLabsDone}
              onCompleteGame={handleCompleteArcadeWorld}
              onCompleteComparativeLab={handleCompleteComparativeLab}
            />
          )}
          {activeGameId === 'builder' && (
            <MoonBaseBuilderGame onCompleteGame={handleCompleteArcadeWorld} />
          )}
          {activeGameId === 'knowledge' && (
            <LunarKnowledgeArena
              completedCategories={state.quizCategoriesDone}
              onCompleteQuizRound={handleCompleteQuizRound}
            />
          )}
          {activeGameId === 'field-training' && (
            <LuNavFieldTraining
              completedMissions={state.fieldMissionsDone}
              onCompleteFieldMission={handleCompleteFieldMission}
              onOpenFullExplorer={() => onEnterMissionControl?.()}
            />
          )}
        </div>
      )}
    </div>
  );
}
