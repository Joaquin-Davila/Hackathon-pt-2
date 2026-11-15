import React from 'react';
import {
  Award,
  ShieldCheck,
  Sparkles,
  Scale,
  Compass,
  Zap,
  Flame,
  Lock,
} from 'lucide-react';
import { ACADEMY_ACHIEVEMENTS } from './academyState.js';

const ICON_MAP = {
  Sparkles,
  ShieldCheck,
  Scale,
  Compass,
  Zap,
  Flame,
  Award,
};

export default function AchievementSystem({ unlockedBadges = [], recentNotification = null }) {
  return (
    <section className="academy-achievements-section" aria-label="Cadet Achievement Badges">
      <div className="achievements-header-row">
        <div className="achievements-title-group">
          <Award size={15} className="ach-header-icon" />
          <span>ACADEMY CERTIFICATION BADGES // MILESTONE TELEMETRY</span>
        </div>
        <span className="achievements-count-pill">
          {unlockedBadges.length} / {ACADEMY_ACHIEVEMENTS.length} UNLOCKED
        </span>
      </div>

      {recentNotification && (
        <div className="achievement-toast-banner" role="status" aria-live="polite">
          <Sparkles size={15} className="toast-sparkle" />
          <span>{recentNotification}</span>
        </div>
      )}

      <div className="achievements-badges-grid">
        {ACADEMY_ACHIEVEMENTS.map((badge) => {
          const isUnlocked = unlockedBadges.includes(badge.id);
          const IconComponent = ICON_MAP[badge.icon] || Award;
          return (
            <div
              key={badge.id}
              className={`achievement-badge-card ${isUnlocked ? 'is-unlocked' : 'is-locked'}`}
            >
              <div className="ach-icon-wrap">
                {isUnlocked ? <IconComponent size={16} /> : <Lock size={14} />}
              </div>
              <div className="ach-meta">
                <div className="ach-name-row">
                  <strong className="ach-name">{badge.title}</strong>
                  <span className="ach-xp-tag">+{badge.xpBonus} XP</span>
                </div>
                <p className="ach-desc">{badge.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
