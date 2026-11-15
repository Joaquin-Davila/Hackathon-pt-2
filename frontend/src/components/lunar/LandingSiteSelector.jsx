// frontend/src/components/lunar/LandingSiteSelector.jsx
// Puntos de selección con línea guía y etiqueta, en coordenadas relativas (0–1) al globo.
export default function LandingSiteSelector({ markers = [], onSelect }) {
  if (!markers.length) return null;
  return (
    <div className="markers">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {markers.map((m, i) => (
          <line key={i} x1={m.x * 100} y1={m.y * 100} x2={m.lx * 100} y2={m.ly * 100} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {markers.map((m, i) => (
        <button
          key={i}
          type="button"
          className="marker-dot"
          style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
          aria-label={m.label}
          onClick={(e) => { e.stopPropagation(); onSelect?.(m); }}
        />
      ))}
      {markers.map((m, i) => (
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
