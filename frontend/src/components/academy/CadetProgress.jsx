import React from 'react';
import { Award, Flame, CheckCircle2, Sparkles, RotateCcw, TrendingUp } from 'lucide-react';
import { ACADEMY_RANKS, getRankForXp } from './academyState.js';

export default function CadetProgress({
  academyState,
  onResetProgress,
}) {
  const { xp, streak, bestStreak, completedModules, stats } = academyState;
  const rankInfo = getRankForXp(xp);
  const completedCount = Object.values(completedModules || {}).filter(Boolean).length;
  const totalModules = 5;
  const overallCompletionPct = Math.round((completedCount / totalModules) * 100);

  return (
    <section className="cadet-progress-panel" aria-label="Cadet Progression and Training Telemetry">
      {/* Left: Welcome Cadet & Current Rank Identity */}
      <div className="cadet-identity-block">
        <div className="cadet-kicker-row">
          <span className="cadet-live-dot" />
          <span>LUNAV ACADEMY // ASTRONAUT TRAINING TELEMETRY</span>
        </div>

        <h1 className="cadet-welcome-headline">
          WELCOME, <span style={{ color: rankInfo.current.badgeColor }}>{rankInfo.current.title}.</span>
        </h1>

        <p className="cadet-motto-text">
          “Don’t just learn about the Moon. Train to explore it.” — Complete scientific simulations, comparative lab experiments, and LOLA terrain challenges to advance your mission certification.
        </p>

        {/* 4-Rank Progression Stepper */}
        <div className="cadet-rank-ladder" role="list" aria-label="Progression Ranks">
          {ACADEMY_RANKS.map((r) => {
            const isUnlocked = xp >= r.minXp;
            const isCurrent = r.id === rankInfo.current.id;
            return (
              <div
                key={r.id}
                role="listitem"
                className={`rank-step-pill ${isCurrent ? 'is-current' : ''} ${isUnlocked ? 'is-unlocked' : 'is-locked'}`}
                style={isCurrent ? { borderColor: r.badgeColor, color: r.badgeColor } : undefined}
              >
                <span className="rank-lvl-num">0{r.level}</span>
                <span className="rank-lvl-title">{r.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: XP Bar, Streak & Personal Learning Statistics */}
      <div className="cadet-telemetry-stats-col">
        <div className="cadet-xp-header">
          <div className="xp-primary-readout">
            <span className="xp-label">EXPERIENCE POINTS (XP)</span>
            <strong className="xp-value" style={{ color: rankInfo.current.badgeColor }}>
              {xp.toLocaleString()} XP
            </strong>
          </div>

          <div className="xp-next-rank-info">
            {rankInfo.nextRank ? (
              <span>
                NEXT RANK: <b>{rankInfo.nextRank.title}</b> ({rankInfo.xpNeededForNext} XP REMAINING)
              </span>
            ) : (
              <span className="max-rank-tag">MAX RANK ACHIEVED // MISSION COMMANDER</span>
            )}
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="cadet-xp-bar-track" role="progressbar" aria-valuenow={rankInfo.progressPct} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="cadet-xp-bar-fill"
            style={{
              width: `${rankInfo.progressPct}%`,
              background: `linear-gradient(90deg, ${rankInfo.current.badgeColor}, #5ce1e6)`,
            }}
          />
        </div>

        {/* 4 Key Cadet Metrics */}
        <div className="cadet-mini-metrics-grid">
          <div className="cadet-mini-stat">
            <span className="cms-label">TRAINING PROGRESS</span>
            <strong className="cms-val">{completedCount} / {totalModules} MODULES ({overallCompletionPct}%)</strong>
          </div>

          <div className="cadet-mini-stat">
            <span className="cms-label">DECISION STREAK</span>
            <strong className="cms-val is-amber">
              <Flame size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
              {streak} ACTIVE (BEST: {bestStreak})
            </strong>
          </div>

          <div className="cadet-mini-stat">
            <span className="cms-label">EXPERIMENTS &amp; SCENARIOS</span>
            <strong className="cms-val">
              {(stats?.scenariosSolved || 0) + (stats?.experimentsRun || 0)} COMPLETED
            </strong>
          </div>

          <div className="cadet-mini-stat">
            <span className="cms-label">SITES &amp; GRIDS ANALYZED</span>
            <strong className="cms-val is-cyan">
              {(stats?.sitesInvestigated || 0) + (stats?.gridPhasesStabilized || 0)} VERIFIED
            </strong>
          </div>
        </div>

        {xp > 0 && onResetProgress && (
          <div className="cadet-reset-row">
            <button
              type="button"
              className="cadet-reset-btn"
              onClick={onResetProgress}
              title="Reset Cadet Training Log"
            >
              <RotateCcw size={11} />
              <span>RESET TRAINING LOG</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
