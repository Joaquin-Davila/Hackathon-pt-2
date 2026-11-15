// frontend/src/components/lunar/LunarScene.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import LunarGlobe from './LunarGlobe';
import LandingSiteSelector from './LandingSiteSelector';
import SiteCoordinates from './SiteCoordinates';
import { getHorizonData } from '../../services/horizonsService.js';

function slotOf(i, active, n) {
  if (i === active) return 'active';
  if (n === 2) return 'next';
  if ((i - active + n) % n === 1) return 'next';
  if ((active - i + n) % n === 1) return 'prev';
  return 'hidden';
}

const Tri = ({ flip }) => (
  <svg viewBox="0 0 12 14" width="12" height="14" style={{ transform: flip ? 'scaleX(-1)' : undefined }} aria-hidden="true">
    <path d="M1 1l10 6-10 6z" fill="currentColor" />
  </svg>
);

function toHorizonSiteId(site) {
  return site?.horizonId ?? site?.siteId ?? String(site?.id ?? '').replace(/-rim$/, '');
}

export default function LunarScene({ sites, activeIndex, onChange, onExplore, onExploreHorizon }) {
  const n = sites.length;
  const [customCoordinates, setCustomCoordinates] = useState({});
  const [coordinatesOpen, setCoordinatesOpen] = useState(false);
  const [coordinateError, setCoordinateError] = useState('');
  const active = n ? Math.min(Math.max(activeIndex, 0), n - 1) : 0;
  const activeSiteId = n ? toHorizonSiteId(sites[active]) : null;
  const [horizonData, setHorizonData] = useState(null);
  const go = useCallback((d) => {
    if (n) onChange((active + d + n) % n);
  }, [active, n, onChange]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea, [contenteditable="true"]')) return;
      if (coordinatesOpen) {
        if (e.key === 'Escape') setCoordinatesOpen(false);
        return;
      }
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [coordinatesOpen, go]);

  useEffect(() => {
    if (!activeSiteId) {
      setHorizonData(null);
      return undefined;
    }

    let cancelled = false;
    setHorizonData(null);
    getHorizonData(activeSiteId)
      .then((data) => { if (!cancelled) setHorizonData(data); })
      .catch((error) => { if (!cancelled) console.error('No se pudieron cargar los datos de horizonte', error); });

    return () => { cancelled = true; };
  }, [activeSiteId]);

  const displaySites = useMemo(() => sites.map((item) => ({ ...item, ...customCoordinates[item.id] })), [sites, customCoordinates]);
  if (!n) return null;
  const baseSite = sites[active];
  const selectedCustomCoordinates = customCoordinates[baseSite.id];
  const serviceCoordinates = horizonData?.siteId === activeSiteId ? horizonData.coordinates : null;
  const site = {
    ...displaySites[active],
    lat: selectedCustomCoordinates?.lat ?? (Number.isFinite(baseSite.lat) ? baseSite.lat : serviceCoordinates?.latitude ?? displaySites[active].lat),
    lon: selectedCustomCoordinates?.lon ?? (Number.isFinite(baseSite.lon) ? baseSite.lon : serviceCoordinates?.longitude ?? displaySites[active].lon),
  };
  const effectiveSites = displaySites.map((item, index) => index === active ? site : item);
  const prev = n > 2 ? effectiveSites[(active - 1 + n) % n] : null;
  const next = n > 1 ? effectiveSites[(active + 1) % n] : null;

  const submitCoordinates = (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const lat = Number(values.get('latitude'));
    const lon = Number(values.get('longitude'));
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      setCoordinateError('Latitud: −90 a 90. Longitud: −180 a 180.');
      return;
    }
    setCustomCoordinates((current) => ({ ...current, [site.id]: { lat, lon } }));
    setCoordinateError('');
    setCoordinatesOpen(false);
  };

  return (
    <section className="scene" aria-label="Selector de sitios de aterrizaje">
      <div className="stage">
        <button className="custom-coordinates-button" type="button" onClick={() => { setCoordinateError(''); setCoordinatesOpen(true); }}>
          + COORDENADAS PERSONALIZADAS
        </button>
        <svg className="orbit" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
          <ellipse cx="500" cy="200" rx="540" ry="78" vectorEffect="non-scaling-stroke" />
        </svg>

        {effectiveSites.map((s, i) => {
          const slot = slotOf(i, active, n);
          const variant = slot === 'active' ? 'hero' : slot === 'prev' ? 'dim' : 'far';
          const side = slot !== 'active';
          return (
            <div
              key={s.id}
              className={`slide is-${slot}`}
              onClick={side ? () => onChange(i) : undefined}
              role={side ? 'button' : undefined}
              tabIndex={side ? 0 : -1}
              aria-label={side ? `Ver ${s.name}` : undefined}
              onKeyDown={(e) => { if (side && e.key === 'Enter') onChange(i); }}
            >
              <LunarGlobe lat={s.lat ?? -89.5} lon={s.lon ?? 0} variant={variant} />
              <LandingSiteSelector markers={s.markers} />
            </div>
          );
        })}

        {n > 1 && (
          <>
            <button className="arrow arrow-left" onClick={() => go(-1)} aria-label="Sitio anterior"><Tri flip /></button>
            <button className="arrow arrow-right" onClick={() => go(1)} aria-label="Sitio siguiente"><Tri /></button>
          </>
        )}
      </div>

      <div className="captions">
        <button className="caption caption-side" onClick={() => go(-1)} disabled={!prev} tabIndex={prev ? 0 : -1}>
          {prev && (<><strong>{prev.name}</strong><SiteCoordinates site={prev} /></>)}
        </button>

        <div className="caption caption-main" aria-live="polite">
          <h2>{site.name}</h2>
          <SiteCoordinates site={site} />
          <button className="cta" onClick={() => (onExploreHorizon ?? onExplore)?.(site)}>EXPLORAR HORIZONTE 360°</button>
        </div>

        <button className="caption caption-side is-right" onClick={() => go(1)} disabled={!next} tabIndex={next ? 0 : -1}>
          {next && (<><strong>{next.name}</strong><SiteCoordinates site={next} /></>)}
        </button>
      </div>

      {coordinatesOpen && (
        <div className="coordinates-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCoordinatesOpen(false); }}>
          <section className="coordinates-dialog" role="dialog" aria-modal="true" aria-labelledby="coordinates-title">
            <button className="coordinates-close" type="button" onClick={() => setCoordinatesOpen(false)} aria-label="Cerrar">×</button>
            <p className="coordinates-eyebrow">CUSTOM LANDING TARGET</p>
            <h2 id="coordinates-title">Coordenadas personalizadas</h2>
            <p className="coordinates-site">{site.name}</p>
            <form onSubmit={submitCoordinates}>
              <label>LATITUD <span>−90° a 90°</span><input name="latitude" type="number" min="-90" max="90" step="any" defaultValue={Number.isFinite(site.lat) ? site.lat : ''} required autoFocus /></label>
              <label>LONGITUD <span>−180° a 180°</span><input name="longitude" type="number" min="-180" max="180" step="any" defaultValue={Number.isFinite(site.lon) ? site.lon : ''} required /></label>
              {coordinateError && <p className="coordinates-error" role="alert">{coordinateError}</p>}
              <button className="coordinates-submit" type="submit">APLICAR AL SITIO</button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
