// frontend/src/components/lunar/LandingSiteSelector.jsx
import { useMemo } from 'react';
import { projectLunarCoordinateToGlobe, formatLat, formatLon } from '../../lunarHelpers.js';

export default function LandingSiteSelector({
  site = null,
  lat = null,
  lon = null,
  markers = [],
  isCustom = false,
  onSelect,
}) {
  const activeLat = Number.isFinite(Number(lat)) ? Number(lat) : Number(site?.lat ?? -89.54);
  const activeLon = Number.isFinite(Number(lon)) ? Number(lon) : Number(site?.lon ?? 0.0);

  // Dynamically project the real (lat, lon) onto the lunar sphere so the cyan marker
  // always moves to the exact selenographic coordinate selected by the user.
  const computedMarkers = useMemo(() => {
    const primaryProj = projectLunarCoordinateToGlobe(activeLat, activeLon);
    const coordTag = `${formatLat(activeLat)}, ${formatLon(activeLon)}`;
    const primaryLabel = isCustom
      ? `CUSTOM TARGET · ${coordTag}`
      : (markers[0]?.label || markers[0]?.name || site?.name || coordTag);

    return [
      {
        x: primaryProj.x,
        y: primaryProj.y,
        lx: primaryProj.lx,
        ly: primaryProj.ly,
        align: primaryProj.align,
        label: primaryLabel,
        lat: activeLat,
        lon: activeLon,
      },
    ];
  }, [activeLat, activeLon, isCustom, markers, site?.name]);

  if (!computedMarkers.length) return null;

  return (
    <div className="markers">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {computedMarkers.map((m, i) => (
          <line
            key={i}
            x1={m.x * 100}
            y1={m.y * 100}
            x2={m.lx * 100}
            y2={m.ly * 100}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {computedMarkers.map((m, i) => (
        <button
          key={i}
          type="button"
          className="marker-dot"
          style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
          aria-label={m.label}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(m);
          }}
        />
      ))}
      {computedMarkers.map((m, i) => (
        <span
          key={`l${i}`}
          className={`marker-label ${m.align === 'end' ? 'is-end' : ''}`}
          style={{ left: `${m.lx * 100}%`, top: `${m.ly * 100}%` }}
        >
          {m.label}
        </span>
      ))}
    </div>
  );
}
