import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, Clock, Calendar, AlertOctagon } from 'lucide-react';
import { LUNAR_SYNODIC_HOURS, DEFAULT_MISSION_EPOCH } from '../../services/ephemerisEngine.js';

export default function EphemerisTimeline({
  hoursOffset = 0,
  onChangeHoursOffset,
  baseDate = DEFAULT_MISSION_EPOCH,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1 = 1 hr/sec, 6 = 6 hr/sec, 24 = 24 hr/sec
  const requestRef = useRef(null);
  const lastTimeRef = useRef(null);

  // Quick preset launch slippage delays (in days)
  const presets = [
    { label: '+0d NOMINAL', hours: 0, tag: 'T-0' },
    { label: '+3d SLIP', hours: 72, tag: '+72h' },
    { label: '+7d SLIP', hours: 168, tag: '+168h' },
    { label: '+14d SLIP', hours: 336, tag: 'HALF CYCLE' },
  ];

  // Animation playback loop
  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    const animate = (time) => {
      if (lastTimeRef.current != null) {
        const deltaSeconds = (time - lastTimeRef.current) / 1000.0;
        const hourIncrement = deltaSeconds * playbackSpeed * 2.5; // Smooth progression
        const nextHours = (hoursOffset + hourIncrement) % LUNAR_SYNODIC_HOURS;
        onChangeHoursOffset(Number(nextHours.toFixed(2)));
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, playbackSpeed, hoursOffset, onChangeHoursOffset]);

  const baseEpochMs = new Date(baseDate).getTime();
  const currentEpochMs = baseEpochMs + hoursOffset * 3600 * 1000;
  const currentDateObj = new Date(currentEpochMs);
  const formattedUtc = currentDateObj.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const daysElapsed = (hoursOffset / 24.0).toFixed(1);
  const cyclePercent = ((hoursOffset / LUNAR_SYNODIC_HOURS) * 100).toFixed(1);

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
              +{daysElapsed}d ({hoursOffset.toFixed(1)}h) · {cyclePercent}% LUNAR CYCLE
            </span>
          </div>
        </div>

        {/* Schedule Slippage Quick Presets */}
        <div className="slippage-presets-group" role="group" aria-label="Schedule Slippage Presets">
          <span className="presets-label">SCHEDULE CONTINGENCY:</span>
          {presets.map((p) => {
            const isActive = Math.abs(hoursOffset - p.hours) < 0.5;
            return (
              <button
                key={p.label}
                type="button"
                className={`slippage-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => {
                  setIsPlaying(false);
                  onChangeHoursOffset(p.hours);
                }}
              >
                <b>{p.label}</b>
                <span className="slippage-btn-tag">{p.tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Time Slider */}
      <div className="timeline-slider-wrapper">
        <div className="timeline-slider-track-container">
          <input
            type="range"
            min="0"
            max={LUNAR_SYNODIC_HOURS}
            step="0.25"
            value={hoursOffset}
            onChange={(e) => {
              setIsPlaying(false);
              onChangeHoursOffset(Number(e.target.value));
            }}
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
            className="playback-btn"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? 'Pause simulation' : 'Play ephemeris simulation'}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{isPlaying ? 'PAUSE CLOCK' : 'SIMULATE ORBIT'}</span>
          </button>

          <button
            type="button"
            className="playback-btn is-secondary"
            onClick={() => {
              setIsPlaying(false);
              onChangeHoursOffset(0);
            }}
            aria-label="Reset to Nominal T-0"
          >
            <RotateCcw size={12} />
            <span>RESET T-0</span>
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
                {speed === 1 ? '1h/s' : speed === 6 ? '6h/s' : '24h/s'}
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
}
