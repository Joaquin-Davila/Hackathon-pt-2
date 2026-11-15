import React, { useState, useRef, useMemo } from 'react';
import { Sun, Globe, Radio, Eye, AlertTriangle, ShieldCheck } from 'lucide-react';
import { normalizeAngle360, getTerrainElevationAtAzimuth } from '../../services/ephemerisEngine.js';

const HorizonProfileChart = React.memo(function HorizonProfileChart({
  primarySite,
  primaryProfile = [],
  primaryTelemetry,
  overlaySite = null,
  overlayProfile = [],
  overlayTelemetry = null,
  onAzimuthClick = null,
}) {
  const [hoverAzimuth, setHoverAzimuth] = useState(null);
  const svgRef = useRef(null);

  // Clean and sort samples for primary profile
  const primarySamples = useMemo(() => {
    return primaryProfile
      .map((p) => ({
        azimuth: normalizeAngle360(Number(p.azimuth)),
        elevation: Number(p.elevation),
      }))
      .filter((p) => Number.isFinite(p.azimuth) && Number.isFinite(p.elevation))
      .sort((a, b) => a.azimuth - b.azimuth);
  }, [primaryProfile]);

  // Clean and sort samples for overlay profile
  const overlaySamples = useMemo(() => {
    if (!overlayProfile || !overlayProfile.length) return [];
    return overlayProfile
      .map((p) => ({
        azimuth: normalizeAngle360(Number(p.azimuth)),
        elevation: Number(p.elevation),
      }))
      .filter((p) => Number.isFinite(p.azimuth) && Number.isFinite(p.elevation))
      .sort((a, b) => a.azimuth - b.azimuth);
  }, [overlayProfile]);

  const sun = primaryTelemetry?.sun ?? { azimuth: 74.8, elevation: 1.35, clearance: 0.2, isIlluminated: true };
  const earth = primaryTelemetry?.earth ?? { azimuth: 3.2, elevation: 4.12, clearance: 2.6, isVisible: true };

  // Calculate elevation range with proper margin
  const allElevations = [
    ...primarySamples.map((p) => p.elevation),
    ...overlaySamples.map((p) => p.elevation),
    sun.elevation,
    earth.elevation,
    0, // Always include 0° horizon line
  ].filter((v) => Number.isFinite(v));

  const rawMin = allElevations.length ? Math.min(...allElevations) : -2.0;
  const rawMax = allElevations.length ? Math.max(...allElevations) : 5.0;
  const minElevation = Math.floor(rawMin - 1.2);
  const maxElevation = Math.ceil(rawMax + 1.6);

  // SVG coordinate dimensions
  const width = 1000;
  const height = 400;
  const padding = { top: 38, right: 30, bottom: 55, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const xFor = (azimuth) => padding.left + (azimuth / 360.0) * plotWidth;
  const yFor = (elevation) => padding.top + ((maxElevation - elevation) / (maxElevation - minElevation)) * plotHeight;

  // Path generators
  const buildSvgPath = (samples) => {
    if (samples.length < 2) return { line: '', area: '' };

    // Build smooth SVG curve
    let line = `M ${xFor(samples[0].azimuth).toFixed(1)} ${yFor(samples[0].elevation).toFixed(1)}`;
    for (let i = 1; i < samples.length; i++) {
      line += ` L ${xFor(samples[i].azimuth).toFixed(1)} ${yFor(samples[i].elevation).toFixed(1)}`;
    }

    const baselineY = yFor(minElevation);
    const area = `${line} L ${xFor(samples[samples.length - 1].azimuth).toFixed(1)} ${baselineY.toFixed(1)} L ${xFor(samples[0].azimuth).toFixed(1)} ${baselineY.toFixed(1)} Z`;

    return { line, area };
  };

  const primaryPath = useMemo(() => buildSvgPath(primarySamples), [primarySamples, minElevation, maxElevation]);
  const overlayPath = useMemo(() => buildSvgPath(overlaySamples), [overlaySamples, minElevation, maxElevation]);

  // Elevation horizontal gridlines
  const yTicks = useMemo(() => {
    const ticks = [];
    const step = (maxElevation - minElevation) > 10 ? 2 : 1;
    for (let el = minElevation; el <= maxElevation; el += step) {
      ticks.push(el);
    }
    return ticks;
  }, [minElevation, maxElevation]);

  // Azimuth vertical gridlines with cardinal points
  const xTicks = [
    { deg: 0, label: '0° N' },
    { deg: 45, label: '45° NE' },
    { deg: 90, label: '90° E' },
    { deg: 135, label: '135° SE' },
    { deg: 180, label: '180° S' },
    { deg: 225, label: '225° SW' },
    { deg: 270, label: '270° W' },
    { deg: 315, label: '315° NW' },
    { deg: 360, label: '360° N' },
  ];

  const zeroLineY = yFor(0);
  const sunX = xFor(sun.azimuth);
  const sunY = yFor(sun.elevation);
  const earthX = xFor(earth.azimuth);
  const earthY = yFor(earth.elevation);

  // Mouse interaction handler
  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scaleX = width / rect.width;
    const svgX = mouseX * scaleX;

    if (svgX >= padding.left && svgX <= padding.left + plotWidth) {
      const az = ((svgX - padding.left) / plotWidth) * 360.0;
      setHoverAzimuth(Number(az.toFixed(1)));
    } else {
      setHoverAzimuth(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverAzimuth(null);
  };

  const handleClick = (e) => {
    if (hoverAzimuth !== null && onAzimuthClick) {
      onAzimuthClick(hoverAzimuth);
    }
  };

  const hoverTerrainElevation = hoverAzimuth !== null
    ? getTerrainElevationAtAzimuth(primaryProfile, hoverAzimuth).toFixed(2)
    : null;

  const hoverOverlayElevation = hoverAzimuth !== null && overlayProfile.length
    ? getTerrainElevationAtAzimuth(overlayProfile, hoverAzimuth).toFixed(2)
    : null;

  return (
    <div className="horizon-viewport-container">
      {/* Editorial Header bar above chart with unboxed live indicators */}
      <div className="horizon-hud-header">
        <div className="hud-header-left">
          <div className="hud-pulse-status">
            <span className={`pulse-beacon ${sun.isIlluminated ? 'is-nominal' : 'is-warning'}`} />
            <span className="hud-kicker">360° TOPOGRAPHIC ELEVATION PROFILE // LRO LOLA DEM ANALYSIS</span>
          </div>
          {overlaySite && (
            <div className="hud-overlay-subhead">
              <span className="overlay-accent">OVERLAY COMPARISON: {overlaySite.name}</span>
            </div>
          )}
        </div>

        <div className="hud-header-right">
          <div className="hud-pill-tag">
            <span>AZIMUTH SWEEP</span>
            <b>0° → 360° CW</b>
          </div>
          <div className="hud-pill-tag">
            <span>LRO LOLA DEM</span>
            <b>128 PPD POLAR</b>
          </div>
          <div className="hud-pill-tag">
            <span>RESOLUTION</span>
            <b>{primarySamples.length} AZIMUTH PTS</b>
          </div>
        </div>
      </div>

      {/* Main SVG 360° Panorama Viewport */}
      <div className="horizon-svg-wrapper">
        <svg
          ref={svgRef}
          className="horizon-vector-chart"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          role="img"
          aria-label="360° Lunar horizon profile and ephemeris vectors"
        >
          <defs>
            {/* Primary Terrain Gradient */}
            <linearGradient id="primary-terrain-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5CE1E6" stopOpacity="0.32" />
              <stop offset="35%" stopColor="#2563EB" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#0B132B" stopOpacity="0.02" />
            </linearGradient>

            {/* Overlay Terrain Gradient */}
            <linearGradient id="overlay-terrain-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.01" />
            </linearGradient>

            {/* Sun Glow Filter */}
            <filter id="sun-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Earth Glow Filter */}
            <filter id="earth-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background subtle pitch grid */}
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth}
            height={plotHeight}
            fill="#090A0D"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1"
          />

          {/* Elevation Horizontal Gridlines */}
          {yTicks.map((tick) => {
            const y = yFor(tick);
            const isZero = tick === 0;
            return (
              <g key={`y-${tick}`}>
                <line
                  x1={padding.left}
                  x2={padding.left + plotWidth}
                  y1={y}
                  y2={y}
                  stroke={isZero ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.07)'}
                  strokeWidth={isZero ? '1.2' : '1'}
                  strokeDasharray={isZero ? '5 5' : '2 6'}
                />
                <text
                  x={padding.left - 12}
                  y={y + 3.5}
                  textAnchor="end"
                  className={`axis-mono-label ${isZero ? 'is-datum' : ''}`}
                >
                  {tick > 0 ? `+${tick.toFixed(1)}°` : `${tick.toFixed(1)}°`}
                </text>
              </g>
            );
          })}

          {/* Azimuth Vertical Gridlines */}
          {xTicks.map((tick) => {
            const x = xFor(tick.deg);
            const isCardinal = tick.deg % 90 === 0;
            return (
              <g key={`x-${tick.deg}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={padding.top}
                  y2={padding.top + plotHeight}
                  stroke={isCardinal ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.06)'}
                  strokeWidth={isCardinal ? '1' : '0.8'}
                  strokeDasharray={isCardinal ? 'none' : '2 5'}
                />
                <text
                  x={x}
                  y={padding.top + plotHeight + 22}
                  textAnchor="middle"
                  className={`axis-mono-label ${isCardinal ? 'is-cardinal' : ''}`}
                >
                  {tick.label}
                </text>
              </g>
            );
          })}

          {/* Datum Callout (0.0° Spherical Tangent Horizon) */}
          <text
            x={padding.left + plotWidth - 8}
            y={zeroLineY - 6}
            textAnchor="end"
            className="horizon-datum-callout"
          >
            0.0° LUNAR HORIZON DATUM (NO ATMOSPHERE)
          </text>

          {/* Overlay Site Terrain Profile (Dashed Amber Outline) */}
          {overlayPath.area && (
            <path
              d={overlayPath.area}
              fill="url(#overlay-terrain-grad)"
              className="overlay-terrain-poly"
            />
          )}
          {overlayPath.line && (
            <path
              d={overlayPath.line}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="1.8"
              strokeDasharray="4 4"
              className="overlay-terrain-contour"
            />
          )}

          {/* Primary Site Terrain Profile (Crisp Glowing Cyan Outline) */}
          {primaryPath.area && (
            <path
              d={primaryPath.area}
              fill="url(#primary-terrain-grad)"
              className="primary-terrain-poly"
            />
          )}
          {primaryPath.line && (
            <path
              d={primaryPath.line}
              fill="none"
              stroke="#5CE1E6"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="primary-terrain-contour"
            />
          )}

          {/* Sun Vector Elements */}
          <g className="ephemeris-sun-vector">
            {/* Azimuth Vertical Guide */}
            <line
              x1={sunX}
              x2={sunX}
              y1={padding.top}
              y2={padding.top + plotHeight}
              stroke="rgba(255, 177, 74, 0.45)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {/* Elevation Horizontal Guide */}
            <line
              x1={padding.left}
              x2={padding.left + plotWidth}
              y1={sunY}
              y2={sunY}
              stroke="rgba(255, 177, 74, 0.3)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {/* Ray Vector line from bottom datum to Sun Disc */}
            <line
              x1={sunX}
              x2={sunX}
              y1={zeroLineY}
              y2={sunY}
              stroke="#FFB14A"
              strokeWidth="1.5"
              strokeOpacity="0.85"
            />

            {/* Sun Disc Outer Corona Glow */}
            <circle
              cx={sunX}
              cy={sunY}
              r={sun.isIlluminated ? '16' : '10'}
              fill={sun.isIlluminated ? 'rgba(255, 177, 74, 0.22)' : 'rgba(239, 68, 68, 0.15)'}
              filter="url(#sun-glow)"
            />
            {/* Sun Core Disc */}
            <circle
              cx={sunX}
              cy={sunY}
              r={sun.isIlluminated ? '7' : '5'}
              fill={sun.isIlluminated ? '#FFD700' : '#EF4444'}
              stroke="#090A0D"
              strokeWidth="2"
            />

            {/* Sun Callout Tag */}
            <g transform={`translate(${sunX > padding.left + plotWidth - 90 ? sunX - 85 : sunX + 12}, ${sunY - 8})`}>
              <rect
                x="0"
                y="-10"
                width="76"
                height="18"
                fill="rgba(9, 10, 13, 0.88)"
                stroke={sun.isIlluminated ? 'rgba(255, 177, 74, 0.6)' : 'rgba(239, 68, 68, 0.7)'}
                strokeWidth="1"
                rx="2"
              />
              <text x="7" y="2" fill="#FFB14A" className="hud-badge-mono">
                SUN [10]
              </text>
            </g>
          </g>

          {/* Earth Vector Elements */}
          <g className="ephemeris-earth-vector">
            {/* Azimuth Vertical Guide */}
            <line
              x1={earthX}
              x2={earthX}
              y1={padding.top}
              y2={padding.top + plotHeight}
              stroke="rgba(143, 156, 255, 0.45)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {/* Elevation Horizontal Guide */}
            <line
              x1={padding.left}
              x2={padding.left + plotWidth}
              y1={earthY}
              y2={earthY}
              stroke="rgba(143, 156, 255, 0.3)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {/* RF Beam Vector line from baseline to Earth Disc */}
            <line
              x1={earthX}
              x2={earthX}
              y1={zeroLineY}
              y2={earthY}
              stroke={earth.isVisible ? '#8F9CFF' : '#EF4444'}
              strokeWidth="1.5"
              strokeDasharray={earth.isVisible ? 'none' : '2 3'}
              strokeOpacity="0.85"
            />

            {/* Earth Disc Outer Atmosphere Glow */}
            <circle
              cx={earthX}
              cy={earthY}
              r={earth.isVisible ? '14' : '9'}
              fill={earth.isVisible ? 'rgba(143, 156, 255, 0.28)' : 'rgba(239, 68, 68, 0.15)'}
              filter="url(#earth-glow)"
            />
            {/* Earth Core Disc */}
            <circle
              cx={earthX}
              cy={earthY}
              r={earth.isVisible ? '6.5' : '4.5'}
              fill={earth.isVisible ? '#60A5FA' : '#9CA3AF'}
              stroke="#090A0D"
              strokeWidth="2"
            />

            {/* Earth Callout Tag */}
            <g transform={`translate(${earthX > padding.left + plotWidth - 95 ? earthX - 90 : earthX + 12}, ${earthY - 8})`}>
              <rect
                x="0"
                y="-10"
                width="82"
                height="18"
                fill="rgba(9, 10, 13, 0.88)"
                stroke={earth.isVisible ? 'rgba(143, 156, 255, 0.6)' : 'rgba(239, 68, 68, 0.7)'}
                strokeWidth="1"
                rx="2"
              />
              <text x="7" y="2" fill="#8F9CFF" className="hud-badge-mono">
                EARTH [399]
              </text>
            </g>
          </g>

          {/* Interactive Mouse Crosshair Cursor */}
          {hoverAzimuth !== null && (
            <g className="horizon-hover-cursor">
              <line
                x1={xFor(hoverAzimuth)}
                x2={xFor(hoverAzimuth)}
                y1={padding.top}
                y2={padding.top + plotHeight}
                stroke="#5CE1E6"
                strokeWidth="1"
                strokeDasharray="2 3"
              />
              <circle
                cx={xFor(hoverAzimuth)}
                y={yFor(hoverTerrainElevation)}
                r="4.5"
                fill="#5CE1E6"
                stroke="#090A0D"
                strokeWidth="1.5"
              />

              {/* Hover Tooltip Box */}
              <g
                transform={`translate(${
                  xFor(hoverAzimuth) > padding.left + plotWidth - 140
                    ? xFor(hoverAzimuth) - 135
                    : xFor(hoverAzimuth) + 12
                }, ${padding.top + 16})`}
              >
                <rect
                  x="0"
                  y="0"
                  width="130"
                  height={overlayProfile.length ? '56' : '44'}
                  fill="rgba(9, 10, 13, 0.94)"
                  stroke="rgba(92, 225, 230, 0.5)"
                  strokeWidth="1"
                  rx="3"
                />
                <text x="8" y="16" fill="#78869B" className="hud-cursor-text">
                  AZIMUTH: <tspan fill="#FFFFFF">{hoverAzimuth}°</tspan>
                </text>
                <text x="8" y="32" fill="#78869B" className="hud-cursor-text">
                  TERRAIN: <tspan fill="#5CE1E6">{hoverTerrainElevation}°</tspan>
                </text>
                {overlayProfile.length > 0 && (
                  <text x="8" y="48" fill="#78869B" className="hud-cursor-text">
                    OVERLAY: <tspan fill="#F59E0B">{hoverOverlayElevation}°</tspan>
                  </text>
                )}
              </g>
            </g>
          )}

          {/* Axis Titles */}
          <text x={padding.left} y={padding.top - 14} className="hud-axis-title">
            ELEVATION (DEG)
          </text>
          <text x={padding.left + plotWidth / 2} y={height - 12} textAnchor="middle" className="hud-axis-title">
            LUNAR AZIMUTH 0° (NORTH) → 360°
          </text>
        </svg>
      </div>

      {/* Horizon HUD Legend Strip with Hairline Dividers */}
      <div className="horizon-hud-legend">
        <div className="legend-chip">
          <span className="legend-indicator legend-cyan-line" />
          <span className="legend-label">PRIMARY HORIZON CONTOUR</span>
        </div>

        {overlaySite && (
          <div className="legend-chip">
            <span className="legend-indicator legend-amber-dashed" />
            <span className="legend-label">BACKUP OVERLAY CONTOUR</span>
          </div>
        )}

        <div className="legend-chip">
          <span className="legend-indicator legend-sun-disc" />
          <span className="legend-label">SOLAR VECTOR [10]</span>
        </div>

        <div className="legend-chip">
          <span className="legend-indicator legend-earth-disc" />
          <span className="legend-label">EARTH DTE VECTOR [399]</span>
        </div>

        <div className="legend-chip legend-click-hint">
          <span>HOVER OR CLICK AZIMUTH TO INSPECT TERRAIN CLEARANCE</span>
        </div>
      </div>
    </div>
  );
});

export default HorizonProfileChart;
