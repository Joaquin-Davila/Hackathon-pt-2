import React from 'react';
import { ArrowRight, CheckCircle2, Lock, Sparkles } from 'lucide-react';

export default function MissionCard({
  code,
  title,
  subtitle,
  description,
  xpReward,
  domainTags = [],
  isCompleted = false,
  isLocked = false,
  lockReason = '',
  accentColor = '#5ce1e6',
  icon: Icon,
  onSelect,
}) {
  return (
    <article
      className={`academy-mission-card ${isCompleted ? 'is-completed' : ''} ${isLocked ? 'is-locked' : ''}`}
      style={{ '--card-accent': accentColor }}
    >
      <div className="amc-top-row">
        <div className="amc-code-group">
          {Icon && (
            <span className="amc-icon-box" style={{ color: accentColor, borderColor: `${accentColor}40` }}>
              <Icon size={16} />
            </span>
          )}
          <div>
            <span className="amc-code">{code}</span>
            <h3 className="amc-title">{title}</h3>
          </div>
        </div>

        <span
          className={`amc-status-badge ${isCompleted ? 'is-done' : isLocked ? 'is-locked' : 'is-ready'}`}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 size={12} />
              <span>COMPLETED</span>
            </>
          ) : isLocked ? (
            <>
              <Lock size={11} />
              <span>LOCKED</span>
            </>
          ) : (
            <>
              <Sparkles size={11} />
              <span>+{xpReward} XP</span>
            </>
          )}
        </span>
      </div>

      <p className="amc-subtitle">{subtitle}</p>
      <p className="amc-description">{description}</p>

      <div className="amc-tags-row">
        {domainTags.map((tag) => (
          <span key={tag} className="amc-domain-tag">
            {tag}
          </span>
        ))}
      </div>

      <div className="amc-footer-row">
        {isLocked ? (
          <span className="amc-lock-note">{lockReason}</span>
        ) : (
          <button
            type="button"
            className="amc-launch-btn"
            onClick={onSelect}
          >
            <span>{isCompleted ? 'REPLAY SIMULATION' : 'START TRAINING MODULE'}</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </article>
  );
}
