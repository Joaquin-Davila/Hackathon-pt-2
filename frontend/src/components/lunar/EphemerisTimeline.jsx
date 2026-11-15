import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { LUNAR_SYNODIC_HOURS, DEFAULT_MISSION_EPOCH } from '../../services/ephemerisEngine.js';

const SLIPPAGE_PRESETS = [
  { label: '+0d NOMINAL', hours: 0, tag: 'T-0' },
  { label: '+3d SLIP', hours: 72, tag: '+72h' },
  { label: '+7d SLIP', hours: 168, tag: '+168h' },
  { label: '+14d SLIP', hours: 336, tag: 'HALF CYCLE' },
];

const EphemerisTimeline = React.memo(function EphemerisTimeline({
  hoursOffset = 0,
  onChangeHoursOffset,
  baseDate = DEFAULT_MISSION_EPOCH,
}) {
  // Isolated local timeOffset state for 60 FPS slider & clock UI without re-rendering heavy parent charts on every micro-tick
  const [localHours, setLocalHours] = useState(hoursOffset);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(6); // Default 6 HR / SEC (1, 6, 24)

  // Refs for leak-free 60 FPS requestAnimationFrame & debounced parent commits
  const hoursRef = useRef(hoursOffset);
  const speedRef = useRef(playbackSpeed);
  const isPlayingRef = useRef(isPlaying);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const lastCommitTimeRef = useRef(0);
  const onChangeRef = useRef(onChangeHoursOffset);

  useEffect(() => {
    onChangeRef.current = onChangeHoursOffset;
  }, [onChangeHoursOffset]);

  useEffect(() => {
    speedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Sync external hoursOffset prop when not actively playing
  useEffect(() => {
    if (!isPlayingRef.current && Math.abs(hoursRef.current - hoursOffset) > 0.05) {
      hoursRef.current = hoursOffset;
      setLocalHours(hoursOffset);
    }
  }, [hoursOffset]);

  // Debounced / throttled parent state updater to prevent heavy chart/telemetry re-renders on micro-changes
  const scheduleParentCommit = useCallback((nextHours, immediate = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (immediate) {
      lastCommitTimeRef.current = performance.now();
      onChangeRef.current?.(nextHours);
      return;
    }

    const now = performance.now();
    if (isPlayingRef.current && now - lastCommitTimeRef.current >= 180) {
      lastCommitTimeRef.current = now;
      onChangeRef.current?.(nextHours);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      lastCommitTimeRef.current = performance.now();
      onChangeRef.current?.(nextHours);
      debounceTimerRef.current = null;
    }, 110);
  }, []);

  // 60 FPS Animation playback loop controlled strictly via useRef
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    lastTimeRef.current = performance.now();

    const animate = (time) => {
      const deltaSeconds = Math.min(0.1, Math.max(0, (time - (lastTimeRef.current ?? time)) / 1000.0));
      lastTimeRef.current = time;

      const nextHours = (hoursRef.current + deltaSeconds * speedRef.current) % LUNAR_SYNODIC_HOURS;
      const roundedHours = Number(nextHours.toFixed(2));
      hoursRef.current = nextHours;

      setLocalHours(roundedHours);
      scheduleParentCommit(roundedHours, false);

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, scheduleParentCommit]);

  // Unmount cleanup for both requestAnimationFrame and debounce timers
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (!next) {
        scheduleParentCommit(Number(hoursRef.current.toFixed(2)), true);
      }
      return next;
    });
  };

  const handleJumpToHours = (targetHours, immediate = true) => {
    setIsPlaying(false);
    hoursRef.current = targetHours;
    setLocalHours(targetHours);
    scheduleParentCommit(targetHours, immediate);
  };

  const baseEpochMs = useMemo(() => new Date(baseDate).getTime(), [baseDate]);
  const currentEpochMs = baseEpochMs + localHours * 3600 * 1000;
  const formattedUtc = new Date(currentEpochMs).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const daysElapsed = (localHours / 24.0).toFixed(1);
  const cyclePercent = ((localHours / LUNAR_SYNODIC_HOURS) * 100).toFixed(1);

  return (
    <div className="ephemeris-timeline-container" aria-label="Mission Ephemeris Timeline & Slippage Simulator">
      {/* Top row: Current Ephemeris UTC & Slippage Presets */}
      <div className="timeline-header-row">
        <div className="timeline-clock-display">
          <div className="timeline-clock-kicker">
            <Clock size={11} className="clock-icon" />
            <span>MISSION TEMPORAL VECTOR // HORIZONS EPOCH</span>
          </div>
          <div className="timeline-utc-time">
            <span className="utc-timestamp">{formattedUtc}</span>
            <span className="utc-offset-badge">
              +{daysElapsed}d ({localHours.toFixed(1)}h) · {cyclePercent}% LUNAR CYCLE
            </span>
          </div>
        </div>

        {/* Schedule Slippage Quick Presets */}
        <div className="slippage-presets-group" role="group" aria-label="Schedule Slippage Presets">
          <span className="presets-label">SCHEDULE CONTINGENCY:</span>
          {SLIPPAGE_PRESETS.map((p) => {
            const isActive = Math.abs(localHours - p.hours) < 0.5;
            return (
              <button
                key={p.label}
                type="button"
                className={`slippage-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => handleJumpToHours(p.hours, true)}
              >
                <b>{p.label}</b>
                <span className="slippage-btn-tag">{p.tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Time Slider (60 FPS local scrub + debounced parent commit) */}
      <div className="timeline-slider-wrapper">
        <div className="timeline-slider-track-container">
          <input
            type="range"
            min="0"
            max={LUNAR_SYNODIC_HOURS}
            step="0.25"
            value={localHours}
            onChange={(e) => handleJumpToHours(Number(e.target.value), false)}
            onPointerUp={() => scheduleParentCommit(Number(hoursRef.current.toFixed(2)), true)}
            onKeyUp={() => scheduleParentCommit(Number(hoursRef.current.toFixed(2)), true)}
            className="timeline-scrubber-input"
            aria-label="Scrub temporal vector across lunar synodic day"
          />

          {/* Major tick markers across track */}
          <div className="timeline-ticks-bar" aria-hidden="true">
            <div className="timeline-tick" style={{ left: '0%' }}>
              <span className="tick-pip" />
              <span className="tick-text">0d (NEW)</span>
            </div>
            <div className="timeline-tick" style={{ left: '25%' }}>
              <span className="tick-pip" />
              <span className="tick-text">+7.4d (1ST QTR)</span>
            </div>
            <div className="timeline-tick" style={{ left: '50%' }}>
              <span className="tick-pip is-highlight" />
              <span className="tick-text">+14.7d (FULL)</span>
            </div>
            <div className="timeline-tick" style={{ left: '75%' }}>
              <span className="tick-pip" />
              <span className="tick-text">+22.1d (3RD QTR)</span>
            </div>
            <div className="timeline-tick" style={{ left: '100%' }}>
              <span className="tick-pip" />
              <span className="tick-text">+29.5d (CYCLE END)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom controls row: Play/Pause, Speed multipliers, Reset */}
      <div className="timeline-actions-row">
        <div className="timeline-playback-controls">
          <button
            type="button"
            className="playback-btn is-icon-only"
            onClick={handleTogglePlay}
            title={isPlaying ? 'Pause Orbit Simulation' : 'Simulate Orbit'}
            aria-label={isPlaying ? 'Pause Orbit Simulation' : 'Simulate Orbit'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>

          <button
            type="button"
            className="playback-btn is-secondary is-icon-only"
            onClick={() => handleJumpToHours(0, true)}
            title="Reset to Nominal T-0"
            aria-label="Reset to Nominal T-0"
          >
            <RotateCcw size={14} />
          </button>

          {/* Speed multipliers */}
          <div className="speed-toggle-group">
            <span className="speed-label">SPEED:</span>
            {[1, 6, 24].map((speed) => (
              <button
                key={speed}
                type="button"
                className={`speed-pill ${playbackSpeed === speed ? 'is-active' : ''}`}
                onClick={() => setPlaybackSpeed(speed)}
              >
                {speed === 1 ? '1 HR / SEC' : speed === 6 ? '6 HR / SEC' : '24 HR / SEC'}
              </button>
            ))}
          </div>
        </div>

        <div className="timeline-contingency-hint">
          <span>DRAG TIMELINE TO TEST CONTINGENCY WINDOWS & SUNSET THRESHOLDS</span>
        </div>
      </div>
    </div>
  );
});

export default EphemerisTimeline;
