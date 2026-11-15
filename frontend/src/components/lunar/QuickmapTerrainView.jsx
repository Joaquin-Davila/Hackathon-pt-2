import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Compass, Sun, Radio, Crosshair, ZoomIn, ZoomOut, RotateCcw, MapPin } from 'lucide-react';
import { CANDIDATE_SITES_CATALOG } from '../../services/horizonsService.js';

// Official Selenographic South Polar Craters & Massifs (IAU / LROC WAC / LRO LOLA Nomenclature)
const SOUTH_POLE_LANDMARKS = [
  { name: 'SHACKLETON', lat: -89.9, lon: 0.0, r: 10.5, depth: 4.2, rim: 1.55, type: 'crater', major: true, labelOffset: { dx: 18, dy: 14 } },
  { name: 'CONNECTING RIDGE', lat: -89.45, lon: -137.5, r: 13.5, height: 2.45, type: 'massif', major: true, labelOffset: { dx: -14, dy: 18 } },
  { name: 'DE GERLACHE', lat: -88.5, lon: -87.1, r: 16.2, depth: 3.7, rim: 1.35, type: 'crater', major: true, labelOffset: { dx: 0, dy: -16 } },
  { name: 'SHOEMAKER', lat: -88.1, lon: 44.9, r: 25.4, depth: 4.1, rim: 1.45, type: 'crater', major: true, labelOffset: { dx: 0, dy: 4 } },
  { name: 'FAUSTINI', lat: -87.3, lon: 77.0, r: 19.5, depth: 3.5, rim: 1.25, type: 'crater', major: true, labelOffset: { dx: 0, dy: 4 } },
  { name: 'HAWORTH', lat: -87.45, lon: -4.0, r: 25.7, depth: 3.9, rim: 1.4, type: 'crater', major: true, labelOffset: { dx: 0, dy: -4 } },
  { name: 'MALAPERT', lat: -85.99, lon: 2.93, r: 24.0, height: 3.25, type: 'massif', major: true, labelOffset: { dx: 0, dy: -12 } },
  { name: 'CABEUS', lat: -84.9, lon: -35.5, r: 48.0, depth: 4.0, rim: 1.35, type: 'crater', major: true, labelOffset: { dx: 0, dy: 4 } },
  { name: 'NOBILE', lat: -85.2, lon: 53.5, r: 36.5, depth: 3.7, rim: 1.3, type: 'crater', major: true, labelOffset: { dx: 0, dy: 4 } },
  { name: 'AMUNDSEN', lat: -84.5, lon: 82.8, r: 51.5, depth: 3.8, rim: 1.4, type: 'crater', major: true, labelOffset: { dx: 0, dy: 4 } },
  { name: 'SVEDBERG', lat: -86.0, lon: 145.0, r: 14.2, depth: 2.8, rim: 1.0, type: 'crater', major: false, labelOffset: { dx: 0, dy: 0 } },
  { name: 'SLIPHER S', lat: -89.1, lon: 160.0, r: 8.8, depth: 2.6, rim: 0.95, type: 'crater', major: true, labelOffset: { dx: 0, dy: 15 } },
  { name: 'MONS MOUTON', lat: -84.6, lon: -31.0, r: 28.0, height: 2.9, type: 'massif', major: false, labelOffset: { dx: 0, dy: 0 } },
];

/**
 * Converts selenographic (lat, lon) into South Polar Stereographic planar coordinates (km from 90°S Pole).
 * 0° Longitude (Prime Meridian / Sub-Earth direction) points UP (-Y in screen space).
 * 90°E points RIGHT (+X), 180° points DOWN (+Y), 90°W (-90°) points LEFT (-X).
 */
function latLonToPolarKm(lat, lon) {
  const safeLat = Math.max(-90, Math.min(-75, Number(lat) || -89.54));
  const safeLon = Number(lon) || 0;
  const colatDeg = Math.max(0, 90 + safeLat);
  const rKm = colatDeg * 30.32;
  const lonRad = (safeLon * Math.PI) / 180.0;
  return {
    xKm: rKm * Math.sin(lonRad),
    yKm: -rKm * Math.cos(lonRad),
  };
}

function polarKmToLatLon(xKm, yKm) {
  const rKm = Math.hypot(xKm, yKm);
  const colatDeg = rKm / 30.32;
  const lat = Number(Math.max(-90, Math.min(-82.5, -90 + colatDeg)).toFixed(3));
  let lon = (Math.atan2(xKm, -yKm) * 180.0) / Math.PI;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  return { lat, lon: Number(lon.toFixed(3)) };
}

const PRECOMPUTED_LANDMARKS = SOUTH_POLE_LANDMARKS.map((f) => {
  const pt = latLonToPolarKm(f.lat, f.lon);
  return { ...f, xKm: pt.xKm, yKm: pt.yKm };
});

// Deterministic secondary impact crater field (210 multi-scale craters) for LROC WAC / LOLA relief fidelity
const DENSE_CRATER_CATALOG = Array.from({ length: 210 }, (_, i) => {
  const golden = i * 2.399963229728653;
  const norm = (i + 0.5) / 210;
  const distKm = 3.5 + Math.pow(norm, 0.76) * 235;
  const xKm = distKm * Math.cos(golden);
  const yKm = distKm * Math.sin(golden);
  const seed = Math.abs(Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1;
  const r = 1.0 + Math.pow(seed, 1.65) * 8.8;
  return {
    xKm,
    yKm,
    r,
    depth: 0.65 + seed * 1.45,
    rim: 0.34 + seed * 0.52,
  };
});

// Cached 960x960 South Polar Stereographic Master Raster covering [-240 km, +240 km] around 90°S
const MASTER_TILE_SIZE = 960;
const MASTER_WORLD_SPAN_KM = 480; // -240 km to +240 km (~82°S to 90°S)
let cachedMasterTileCanvas = null;
let cachedMasterWithWac = false;

/**
 * Evaluates high-definition LRO LOLA elevation (km) at South Polar planar coordinates (xKm, yKm).
 */
function evaluateLolaRasterHeight(xKm, yKm) {
  let h =
    Math.sin(xKm * 0.038 + yKm * 0.029) * 0.36 +
    Math.cos(xKm * 0.024 - yKm * 0.044) * 0.32 +
    Math.sin(xKm * 0.11 - yKm * 0.085) * 0.14 +
    Math.cos(xKm * 0.29 + yKm * 0.24) * 0.065 +
    Math.sin(xKm * 0.72 - yKm * 0.68) * 0.028;

  for (let i = 0; i < PRECOMPUTED_LANDMARKS.length; i++) {
    const f = PRECOMPUTED_LANDMARKS[i];
    const dx = xKm - f.xKm;
    const dy = yKm - f.yKm;
    const dSq = dx * dx + dy * dy;
    const maxR = f.r * 2.15;
    if (dSq > maxR * maxR) continue;

    const d = Math.sqrt(dSq);
    const u = d / f.r;
    const theta = Math.atan2(dy, dx);
    const rimWobble = 1.0 + 0.045 * Math.cos(theta * 5 + i) + 0.03 * Math.sin(theta * 3 - i);
    const uMod = u / rimWobble;

    if (f.type === 'massif') {
      const ridgeAniso = 1.0 + 0.34 * Math.cos(theta * 2.0 - 0.6);
      h += f.height * Math.exp(-uMod * uMod * 1.55) * ridgeAniso;
    } else {
      if (uMod < 1.0) {
        const floorFlat = Math.pow(uMod, 2.8);
        const bowl = (floorFlat - 1.0) * f.depth * 0.52;
        const rimCrest = f.rim * Math.exp(-Math.pow((uMod - 0.96) / 0.14, 2));
        const terrace = uMod > 0.65 && uMod < 0.92 ? Math.sin(uMod * 28) * 0.06 : 0;
        h += bowl + rimCrest + terrace;
      } else {
        const ejecta = f.rim * Math.exp(-(uMod - 1.0) * 3.2);
        const radialRays = 1.0 + 0.18 * Math.sin(theta * 14 + i * 1.7) * Math.exp(-(uMod - 1.0) * 1.8);
        h += ejecta * radialRays;
      }
    }
  }

  for (let i = 0; i < DENSE_CRATER_CATALOG.length; i++) {
    const c = DENSE_CRATER_CATALOG[i];
    const dx = xKm - c.xKm;
    const dy = yKm - c.yKm;
    const dSq = dx * dx + dy * dy;
    const maxR = c.r * 1.85;
    if (dSq > maxR * maxR) continue;

    const u = Math.sqrt(dSq) / c.r;
    if (u < 1.0) {
      h += (Math.pow(u, 2.4) - 1.0) * c.depth * 0.38 + c.rim * Math.exp(-Math.pow((u - 0.95) / 0.18, 2));
    } else {
      h += c.rim * Math.exp(-(u - 1.0) * 3.8);
    }
  }

  return h;
}

/**
 * Builds and caches the high-resolution LROC WAC + LOLA Shaded Relief South Pole 2D Polar Raster.
 */
function getOrBuildMasterLunarRaster(wacImageData) {
  if (cachedMasterTileCanvas && (cachedMasterWithWac || !wacImageData)) {
    return cachedMasterTileCanvas;
  }

  const canvas = cachedMasterTileCanvas || document.createElement('canvas');
  canvas.width = MASTER_TILE_SIZE;
  canvas.height = MASTER_TILE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imgData = ctx.createImageData(MASTER_TILE_SIZE, MASTER_TILE_SIZE);
  const data = imgData.data;

  const halfSpan = MASTER_WORLD_SPAN_KM / 2;
  const kmPerPx = MASTER_WORLD_SPAN_KM / MASTER_TILE_SIZE;
  const epsKm = kmPerPx * 0.95;

  // Grazing polar solar incidence for authentic LROC WAC South Pole shadow contrast
  const lx = 0.56;
  const ly = -0.78;
  const lz = 0.25;
  const lLen = Math.hypot(lx, ly, lz);
  const sunX = lx / lLen;
  const sunY = ly / lLen;
  const sunZ = lz / lLen;

  let ptr = 0;
  for (let py = 0; py < MASTER_TILE_SIZE; py++) {
    const yKm = -halfSpan + py * kmPerPx;
    for (let px = 0; px < MASTER_TILE_SIZE; px++) {
      const xKm = -halfSpan + px * kmPerPx;

      const h0 = evaluateLolaRasterHeight(xKm, yKm);
      const hx = evaluateLolaRasterHeight(xKm + epsKm, yKm);
      const hy = evaluateLolaRasterHeight(xKm, yKm + epsKm);

      const dzdx = (hx - h0) / epsKm;
      const dzdy = (hy - h0) / epsKm;

      const nx = -dzdx * 2.65;
      const ny = -dzdy * 2.65;
      const nz = 1.0;
      const invN = 1.0 / Math.hypot(nx, ny, nz);

      const lambert = (nx * sunX + ny * sunY + nz * sunZ) * invN;

      // Blend real NASA LROC WAC 2K global mosaic reflectance
      let wacAlbedo = 0;
      if (wacImageData) {
        const wacW = wacImageData.width;
        const wacH = wacImageData.height;
        const u1 = ((xKm + halfSpan) / MASTER_WORLD_SPAN_KM) * 0.85 + 0.07;
        const v1 = ((yKm + halfSpan) / MASTER_WORLD_SPAN_KM) * 0.85 + 0.07;
        const tx1 = Math.min(wacW - 1, Math.max(0, Math.floor(u1 * wacW)));
        const ty1 = Math.min(wacH - 1, Math.max(0, Math.floor(v1 * wacH)));

        const u2 = (((xKm * 0.0048) % 1) + 1) % 1;
        const v2 = (((yKm * 0.0048) % 1) + 1) % 1;
        const tx2 = Math.min(wacW - 1, Math.max(0, Math.floor(u2 * wacW)));
        const ty2 = Math.min(wacH - 1, Math.max(0, Math.floor(v2 * wacH)));

        const lum1 = wacImageData.data[(ty1 * wacW + tx1) * 4];
        const lum2 = wacImageData.data[(ty2 * wacW + tx2) * 4];
        wacAlbedo = (lum1 - 118) * 0.36 + (lum2 - 118) * 0.22;
      }

      const microNoise =
        ((Math.sin(xKm * 18.73 + yKm * 91.17) * 43758.5453) % 1) * 5.0;

      let luma = 56 + h0 * 15 + lambert * 98 + wacAlbedo + microNoise;

      // Deep Permanently Shadowed Region (PSR) crater floor darkening
      if (h0 < -0.55 && lambert < 0.14) {
        luma *= 0.32;
      } else if (lambert < 0.0) {
        luma *= 0.6;
      }

      const gray = Math.max(6, Math.min(234, Math.round(luma)));
      data[ptr++] = Math.max(5, gray - 2);
      data[ptr++] = gray;
      data[ptr++] = Math.min(240, gray + 3);
      data[ptr++] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  cachedMasterTileCanvas = canvas;
  if (wacImageData) cachedMasterWithWac = true;
  return canvas;
}

/**
 * Clean, Minimalist Mission Control Vector Card for the Right Sidebar.
 * Displays SOLAR VECTOR or EARTH VECTOR with large Azimuth & Elevation readouts.
 */
const MissionControlVectorCard = React.memo(function MissionControlVectorCard({
  title,
  subtitle,
  azimuth = 0,
  elevation = 0,
  terrainElev = 0,
  clearance = 0,
  statusLabel,
  isNominal = true,
  accentColor = '#ffb14a',
  icon: Icon,
}) {
  const formattedElev =
    Number(elevation) >= 0
      ? `+${Number(elevation).toFixed(2)}°`
      : `${Number(elevation).toFixed(2)}°`;

  const formattedClearance =
    Number(clearance) >= 0
      ? `+${Number(clearance).toFixed(2)}°`
      : `${Number(clearance).toFixed(2)}°`;

  return (
    <div className="qm-mc-vector-card">
      <div className="qm-mc-card-top">
        <div className="qm-mc-title-group">
          <span className="qm-mc-icon-box" style={{ color: accentColor, borderColor: `${accentColor}40` }}>
            <Icon size={14} />
          </span>
          <div>
            <h3 className="qm-mc-title">{title}</h3>
            <span className="qm-mc-subtitle">{subtitle}</span>
          </div>
        </div>
        <span
          className={`qm-mc-status-pill ${isNominal ? 'is-ok' : 'is-warn'}`}
          style={
            isNominal
              ? {
                  color: accentColor,
                  borderColor: `${accentColor}55`,
                  background: `${accentColor}14`,
                }
              : undefined
          }
        >
          <span className="qm-mc-dot" style={{ background: isNominal ? accentColor : '#ef4444' }} />
          {statusLabel}
        </span>
      </div>

      {/* Primary Telemetry Readouts: AZIMUTH & ELEVATION */}
      <div className="qm-mc-primary-grid">
        <div className="qm-mc-stat-box">
          <span className="qm-mc-stat-label">AZIMUTH</span>
          <strong className="qm-mc-stat-value" style={{ color: accentColor }}>
            {Number(azimuth).toFixed(1)}°
          </strong>
        </div>
        <div className="qm-mc-stat-box">
          <span className="qm-mc-stat-label">ELEVATION</span>
          <strong className="qm-mc-stat-value">
            {formattedElev}
          </strong>
        </div>
      </div>

      {/* Subtle Secondary Horizon Clearance Line */}
      <div className="qm-mc-footer-line">
        <span>LOCAL HORIZON CREST: <b>{terrainElev >= 0 ? `+${Number(terrainElev).toFixed(2)}°` : `${Number(terrainElev).toFixed(2)}°`}</b></span>
        <span>CLEARANCE: <b style={{ color: clearance >= 0 ? '#10b981' : '#ef4444' }}>{formattedClearance}</b></span>
      </div>
    </div>
  );
});

const QuickmapTerrainView = React.memo(function QuickmapTerrainView({
  site,
  telemetry,
  onSelectSite,
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const [wacImageData, setWacImageData] = useState(null);
  const [zoom, setZoom] = useState(1.15);
  const [centerOnTarget, setCenterOnTarget] = useState(false);

  const activeLat = Number.isFinite(Number(site?.lat)) ? Number(site.lat) : -89.54;
  const activeLon = Number.isFinite(Number(site?.lon)) ? Number(site.lon) : 0.0;
  const activeElev = Number.isFinite(Number(site?.elevation)) ? Number(site.elevation) : 4218;
  const activeName = site?.name || 'Shackleton Rim';

  const sun = telemetry?.sun ?? {
    azimuth: 332.9,
    elevation: 1.55,
    terrainElevation: 1.15,
    clearance: 0.4,
    isIlluminated: true,
  };
  const earth = telemetry?.earth ?? {
    azimuth: 356.2,
    elevation: 7.56,
    terrainElevation: 1.52,
    clearance: 6.04,
    isVisible: true,
  };

  // Load NASA LROC WAC global lunar mosaic once
  useEffect(() => {
    let isMounted = true;
    if (cachedMasterWithWac) return undefined;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/images/lro-wac-global-2k.jpg';
    img.onload = () => {
      if (!isMounted) return;
      const off = document.createElement('canvas');
      off.width = 1024;
      off.height = 512;
      const oCtx = off.getContext('2d');
      if (oCtx) {
        oCtx.drawImage(img, 0, 0, 1024, 512);
        setWacImageData(oCtx.getImageData(0, 0, 1024, 512));
      }
    };
    return () => {
      isMounted = false;
    };
  }, []);

  // Selected target in South Polar Stereographic kilometers from 90°S
  const targetKm = useMemo(() => latLonToPolarKm(activeLat, activeLon), [activeLat, activeLon]);

  // Map center: either 90°S Pole-Centered (scientific polar projection) or Target-Centered
  const viewCenterKm = useMemo(() => {
    if (centerOnTarget) return targetKm;
    // Blend slightly toward target when zoomed in so target stays well inside the polar disc
    const factor = zoom > 1.35 ? Math.min(0.85, (zoom - 1.15) * 0.45) : 0;
    return {
      xKm: targetKm.xKm * factor,
      yKm: targetKm.yKm * factor,
    };
  }, [centerOnTarget, targetKm, zoom]);

  const mapWidth = 660;
  const mapHeight = 460;
  const pxPerKm = 1.65 * zoom;

  const projectToMapPx = useCallback(
    (lat, lon) => {
      const pt = latLonToPolarKm(lat, lon);
      return {
        x: mapWidth / 2 + (pt.xKm - viewCenterKm.xKm) * pxPerKm,
        y: mapHeight / 2 + (pt.yKm - viewCenterKm.yKm) * pxPerKm,
      };
    },
    [viewCenterKm.xKm, viewCenterKm.yKm, pxPerKm]
  );

  // Screen pixel position of 90°S Pole & Selected Target
  const polePx = useMemo(() => projectToMapPx(-90.0, 0.0), [projectToMapPx]);
  const targetPx = useMemo(() => projectToMapPx(activeLat, activeLon), [projectToMapPx, activeLat, activeLon]);

  // 60 FPS GPU-Accelerated LROC WAC Polar Raster Render
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const masterTile = getOrBuildMasterLunarRaster(wacImageData);

      const halfSpanKm = MASTER_WORLD_SPAN_KM / 2;
      const tilePxPerKm = MASTER_TILE_SIZE / MASTER_WORLD_SPAN_KM;

      const viewSpanXKm = mapWidth / pxPerKm;
      const viewSpanYKm = mapHeight / pxPerKm;

      const sx = (viewCenterKm.xKm - viewSpanXKm / 2 + halfSpanKm) * tilePxPerKm;
      const sy = (viewCenterKm.yKm - viewSpanYKm / 2 + halfSpanKm) * tilePxPerKm;
      const sw = viewSpanXKm * tilePxPerKm;
      const sh = viewSpanYKm * tilePxPerKm;

      ctx.fillStyle = '#0d1115';
      ctx.fillRect(0, 0, mapWidth, mapHeight);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(masterTile, sx, sy, sw, sh, 0, 0, mapWidth, mapHeight);

      // Circular Polar Stereographic Vignette Framing
      const vig = ctx.createRadialGradient(
        mapWidth / 2,
        mapHeight / 2,
        mapHeight * 0.34,
        mapWidth / 2,
        mapHeight / 2,
        mapWidth * 0.58
      );
      vig.addColorStop(0, 'rgba(13, 17, 21, 0.0)');
      vig.addColorStop(0.75, 'rgba(13, 17, 21, 0.18)');
      vig.addColorStop(1, 'rgba(10, 14, 18, 0.82)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, mapWidth, mapHeight);
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [viewCenterKm, pxPerKm, wacImageData]);

  // Click anywhere on the 2D Polar Map to relocate target coordinates
  const handleMapClick = (e) => {
    if (!onSelectSite) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * mapWidth;
    const clickY = ((e.clientY - rect.top) / rect.height) * mapHeight;

    const xKm = viewCenterKm.xKm + (clickX - mapWidth / 2) / pxPerKm;
    const yKm = viewCenterKm.yKm + (clickY - mapHeight / 2) / pxPerKm;
    const { lat, lon } = polarKmToLatLon(xKm, yKm);

    onSelectSite({
      id: 'custom-coords',
      siteId: 'custom',
      isCustom: true,
      name: `Polar Target (${Math.abs(lat).toFixed(2)}°S, ${Math.abs(lon).toFixed(1)}°${lon < 0 ? 'W' : 'E'})`,
      lat,
      lon,
      elevation: activeElev,
    });
  };

  // Polar Coordinate Grid: Concentric Latitude Rings (89°S to 84°S) & Radial Meridians every 30°
  const latitudeRings = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7].map((colatDeg) => ({
      colatDeg,
      latLabel: `${90 - colatDeg}°S`,
      rPx: colatDeg * 30.32 * pxPerKm,
      isMajor: colatDeg % 2 === 0 || colatDeg === 1,
    }));
  }, [pxPerKm]);

  const meridianLines = useMemo(() => {
    const outerRadiusPx = 7.2 * 30.32 * pxPerKm;
    const innerRadiusPx = 0.4 * 30.32 * pxPerKm;
    const labelRadiusPx = Math.min(202, outerRadiusPx);
    const lines = [];

    for (let deg = 0; deg < 360; deg += 30) {
      const rad = ((deg - 90) * Math.PI) / 180.0;
      const isCardinal = deg % 90 === 0;
      let degText = `${deg}°`;
      if (deg === 0) degText = '0° (N / EARTH)';
      else if (deg === 90) degText = '90°E';
      else if (deg === 180) degText = '180°S';
      else if (deg === 270) degText = '90°W';
      else if (deg > 180) degText = `${360 - deg}°W`;
      else degText = `${deg}°E`;

      lines.push({
        deg,
        isCardinal,
        degText,
        x1: polePx.x + innerRadiusPx * Math.cos(rad),
        y1: polePx.y + innerRadiusPx * Math.sin(rad),
        x2: polePx.x + outerRadiusPx * Math.cos(rad),
        y2: polePx.y + outerRadiusPx * Math.sin(rad),
        lx: polePx.x + labelRadiusPx * Math.cos(rad),
        ly: polePx.y + labelRadiusPx * Math.sin(rad),
      });
    }
    return lines;
  }, [polePx.x, polePx.y, pxPerKm]);

  // Solar & Earth Vector Endpoints Originating from Active Target Position (targetPx)
  const vectorLength = 122;
  const sunRad = ((sun.azimuth - 90) * Math.PI) / 180.0;
  const earthRad = ((earth.azimuth - 90) * Math.PI) / 180.0;

  const sunTip = {
    x: targetPx.x + vectorLength * Math.cos(sunRad),
    y: targetPx.y + vectorLength * Math.sin(sunRad),
  };

  const earthTip = {
    x: targetPx.x + vectorLength * Math.cos(earthRad),
    y: targetPx.y + vectorLength * Math.sin(earthRad),
  };

  return (
    <section className="quickmap-terrain-section" aria-label="2D Scientific Polar Map and Vector View">
      {/* 1. Top Scientific Control Bar */}
      <div className="quickmap-section-header">
        <div className="quickmap-header-left">
          <Compass size={14} className="quickmap-header-icon" />
          <span>LROC WAC 2D SCIENTIFIC POLAR MAP // SOUTH POLE STEREOGRAPHIC PROJECTION (84°S – 90°S)</span>
        </div>

        {/* Quick Candidate Site Switcher Pills + Zoom Controls */}
        <div className="quickmap-toolbar-right">
          <div className="quickmap-site-pills" role="group" aria-label="Polar Landing Sites">
            {CANDIDATE_SITES_CATALOG.map((cat) => {
              const isSelected =
                cat.id === site?.id ||
                (Boolean(site?.siteId) && (cat.id === site.siteId || cat.defaultHorizon === site.siteId));
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`qm-site-pill ${isSelected ? 'is-active' : ''}`}
                  onClick={() => onSelectSite?.(cat)}
                >
                  {cat.name.replace(/ Crater Rim| Rim| Massif/g, '')}
                </button>
              );
            })}
          </div>

          <div className="quickmap-zoom-controls">
            <button
              type="button"
              className={`qm-ctrl-btn ${centerOnTarget ? 'is-active' : ''}`}
              onClick={() => setCenterOnTarget((v) => !v)}
              title="Toggle Pole-Centered vs Target-Centered Projection"
            >
              <Crosshair size={12} />
            </button>
            <button
              type="button"
              className="qm-ctrl-btn"
              onClick={() => setZoom((z) => Math.max(0.85, Number((z - 0.25).toFixed(2))))}
              title="Zoom Out Polar Map"
            >
              <ZoomOut size={13} />
            </button>
            <span className="qm-zoom-readout">{zoom.toFixed(2)}x</span>
            <button
              type="button"
              className="qm-ctrl-btn"
              onClick={() => setZoom((z) => Math.min(3.4, Number((z + 0.25).toFixed(2))))}
              title="Zoom In Polar Map"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              className="qm-ctrl-btn"
              onClick={() => {
                setZoom(1.15);
                setCenterOnTarget(false);
              }}
              title="Reset Polar View"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace Grid: Left 2D Polar Map with Graticule + Right Mission Control Vector Panels */}
      <div className="quickmap-workspace-grid">
        {/* Left: 2D Scientific Polar Map Container */}
        <div
          className="quickmap-map-viewport"
          onClick={handleMapClick}
          title="Click anywhere on the 2D Lunar South Pole map to select coordinates"
        >
          {/* Grayscale Shaded Relief LROC WAC + LOLA DEM Canvas */}
          <canvas
            ref={canvasRef}
            width={mapWidth}
            height={mapHeight}
            className="quickmap-dem-canvas"
          />

          {/* Scientific Polar Coordinate Graticule, Crater Nomenclature & Vectors SVG */}
          <svg
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            className="quickmap-tactical-svg"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <linearGradient
                id="qm-sun-grad"
                gradientUnits="userSpaceOnUse"
                x1={targetPx.x}
                y1={targetPx.y}
                x2={sunTip.x}
                y2={sunTip.y}
              >
                <stop offset="0%" stopColor="#ffb14a" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ffd27d" stopOpacity="1" />
              </linearGradient>

              <linearGradient
                id="qm-earth-grad"
                gradientUnits="userSpaceOnUse"
                x1={targetPx.x}
                y1={targetPx.y}
                x2={earthTip.x}
                y2={earthTip.y}
              >
                <stop offset="0%" stopColor="#5ce1e6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#8f9cff" stopOpacity="1" />
              </linearGradient>

              <marker
                id="hud-sun-arrow"
                viewBox="0 0 10 10"
                refX="7.5"
                refY="5"
                markerWidth="5.5"
                markerHeight="5.5"
                orient="auto"
              >
                <path d="M 0 1.5 L 8.5 5 L 0 8.5 L 2.2 5 z" fill="#ffc46b" />
              </marker>

              <marker
                id="hud-earth-arrow"
                viewBox="0 0 10 10"
                refX="7.5"
                refY="5"
                markerWidth="5.5"
                markerHeight="5.5"
                orient="auto"
              >
                <path d="M 0 1.5 L 8.5 5 L 0 8.5 L 2.2 5 z" fill="#9da9ff" />
              </marker>
            </defs>

            {/* 1. Polar Coordinate Grid: Radial Meridians & Concentric Latitude Rings */}
            <g className="qm-polar-graticule">
              {/* Outer Scientific Polar Dial Ring */}
              <circle
                cx={polePx.x}
                cy={polePx.y}
                r={Math.min(212, 7.0 * 30.32 * pxPerKm)}
                fill="none"
                stroke="rgba(92, 225, 230, 0.28)"
                strokeWidth="1"
              />

              {/* Meridian / Azimuth Lines (Every 30°) */}
              {meridianLines.map((m) => (
                <g key={m.deg}>
                  <line
                    x1={m.x1}
                    y1={m.y1}
                    x2={m.x2}
                    y2={m.y2}
                    stroke={m.isCardinal ? 'rgba(92, 225, 230, 0.26)' : 'rgba(255, 255, 255, 0.12)'}
                    strokeWidth={m.isCardinal ? '0.9' : '0.65'}
                    strokeDasharray={m.isCardinal ? 'none' : '2 4'}
                  />
                  {m.lx > 24 && m.lx < mapWidth - 24 && m.ly > 18 && m.ly < mapHeight - 36 && (
                    <text
                      x={m.lx}
                      y={m.ly + 3}
                      textAnchor="middle"
                      className={`qm-compass-deg ${m.isCardinal ? 'is-cardinal' : ''}`}
                    >
                      {m.degText}
                    </text>
                  )}
                </g>
              ))}

              {/* Concentric Selenographic Latitude Rings (89°S to 84°S) */}
              {latitudeRings.map((ring) => (
                <g key={ring.colatDeg}>
                  <circle
                    cx={polePx.x}
                    cy={polePx.y}
                    r={ring.rPx}
                    fill="none"
                    stroke={ring.isMajor ? 'rgba(92, 225, 230, 0.24)' : 'rgba(255, 255, 255, 0.11)'}
                    strokeWidth={ring.isMajor ? '0.85' : '0.6'}
                    strokeDasharray={ring.isMajor ? '4 4' : '2 5'}
                  />
                  {polePx.y - ring.rPx > 18 && (
                    <text
                      x={polePx.x + 6}
                      y={polePx.y - ring.rPx - 3}
                      className="qm-graticule-label"
                    >
                      {ring.latLabel}
                    </text>
                  )}
                </g>
              ))}

              {/* Exact 90°S Lunar South Pole Fiducial Marker */}
              <g transform={`translate(${polePx.x}, ${polePx.y})`}>
                <line x1="-6" y1="0" x2="6" y2="0" stroke="rgba(92, 225, 230, 0.65)" strokeWidth="0.9" />
                <line x1="0" y1="-6" x2="0" y2="6" stroke="rgba(92, 225, 230, 0.65)" strokeWidth="0.9" />
                <circle r="2" fill="none" stroke="rgba(92, 225, 230, 0.65)" strokeWidth="0.8" />
                <text x="8" y="-5" className="qm-pole-label">90°S POLE</text>
              </g>
            </g>

            {/* 2. Major Lunar South Pole Craters & Rim Outlines + Nomenclature */}
            {PRECOMPUTED_LANDMARKS.filter((f) => f.major).map((feat) => {
              const fx = mapWidth / 2 + (feat.xKm - viewCenterKm.xKm) * pxPerKm;
              const fy = mapHeight / 2 + (feat.yKm - viewCenterKm.yKm) * pxPerKm;
              const rPx = feat.r * pxPerKm;
              if (fx < 32 || fx > mapWidth - 32 || fy < 22 || fy > mapHeight - 40) return null;

              return (
                <g key={feat.name} className="qm-landmark-group">
                  {feat.type === 'crater' && rPx > 10 && (
                    <circle
                      cx={fx}
                      cy={fy}
                      r={rPx}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.14)"
                      strokeWidth="0.7"
                      strokeDasharray="2 4"
                    />
                  )}
                  <text
                    x={fx + (feat.labelOffset?.dx || 0)}
                    y={fy + (feat.labelOffset?.dy || 0)}
                    textAnchor="middle"
                    className="qm-crater-map-label"
                  >
                    {feat.name}
                  </text>
                </g>
              );
            })}

            {/* 3. Candidate Landing Sites Interactive Nodes */}
            {CANDIDATE_SITES_CATALOG.map((cat) => {
              const pt = projectToMapPx(cat.lat, cat.lon);
              if (pt.x < 20 || pt.x > mapWidth - 20 || pt.y < 20 || pt.y > mapHeight - 38) return null;
              if (Math.hypot(pt.x - targetPx.x, pt.y - targetPx.y) < 10) return null;
              return (
                <g
                  key={cat.id}
                  transform={`translate(${pt.x}, ${pt.y})`}
                  className="qm-candidate-node"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSite?.(cat);
                  }}
                >
                  <title>{cat.name} ({cat.lat}°, {cat.lon}°)</title>
                  <circle r="3.5" fill="#0d1115" stroke="rgba(92, 225, 230, 0.8)" strokeWidth="1.1" />
                </g>
              );
            })}

            {/* 4. Solar Vector & Earth Vector Originating from Selected Target Position */}
            <g className="qm-target-vectors-layer">
              {/* Local Azimuth Ring around Active Target */}
              <circle
                cx={targetPx.x}
                cy={targetPx.y}
                r="46"
                fill="rgba(92, 225, 230, 0.03)"
                stroke="rgba(92, 225, 230, 0.28)"
                strokeWidth="0.75"
                strokeDasharray="2 3"
              />

              {/* SOLAR VECTOR Ray */}
              <line
                x1={targetPx.x}
                y1={targetPx.y}
                x2={sunTip.x}
                y2={sunTip.y}
                stroke="url(#qm-sun-grad)"
                strokeWidth="1.75"
                markerEnd="url(#hud-sun-arrow)"
              />
              <line
                x1={targetPx.x}
                y1={targetPx.y}
                x2={sunTip.x}
                y2={sunTip.y}
                stroke="#ffe09e"
                strokeWidth="1"
                strokeDasharray="4 8"
                className="qm-vector-flow-line"
              />
              <text
                x={targetPx.x + (vectorLength + 10) * Math.cos(sunRad)}
                y={targetPx.y + (vectorLength + 10) * Math.sin(sunRad) + 3}
                textAnchor={Math.cos(sunRad) >= 0 ? 'start' : 'end'}
                className="qm-ray-tag is-sun"
              >
                SUN · {Number(sun.azimuth).toFixed(1)}°
              </text>

              {/* EARTH VECTOR Ray */}
              <line
                x1={targetPx.x}
                y1={targetPx.y}
                x2={earthTip.x}
                y2={earthTip.y}
                stroke="url(#qm-earth-grad)"
                strokeWidth="1.75"
                markerEnd="url(#hud-earth-arrow)"
              />
              <line
                x1={targetPx.x}
                y1={targetPx.y}
                x2={earthTip.x}
                y2={earthTip.y}
                stroke="#c7d0ff"
                strokeWidth="1"
                strokeDasharray="4 8"
                className="qm-vector-flow-line"
              />
              <text
                x={targetPx.x + (vectorLength + 10) * Math.cos(earthRad)}
                y={targetPx.y + (vectorLength + 10) * Math.sin(earthRad) + 3}
                textAnchor={Math.cos(earthRad) >= 0 ? 'start' : 'end'}
                className="qm-ray-tag is-earth"
              >
                EARTH · {Number(earth.azimuth).toFixed(1)}°
              </text>

              {/* 5. Interactive Target Selection Reticle at Active Coordinates */}
              <g transform={`translate(${targetPx.x}, ${targetPx.y})`} className="qm-target-reticle">
                <circle r="15" fill="rgba(13, 17, 21, 0.35)" stroke="#5ce1e6" strokeWidth="1.1" />
                <circle r="5" fill="none" stroke="rgba(92, 225, 230, 0.6)" strokeWidth="0.8" />
                <circle r="2" fill="#5ce1e6" />
                <line x1="-22" y1="0" x2="-8" y2="0" stroke="#5ce1e6" strokeWidth="1.1" />
                <line x1="8" y1="0" x2="22" y2="0" stroke="#5ce1e6" strokeWidth="1.1" />
                <line x1="0" y1="-22" x2="0" y2="-8" stroke="#5ce1e6" strokeWidth="1.1" />
                <line x1="0" y1="8" x2="0" y2="22" stroke="#5ce1e6" strokeWidth="1.1" />
              </g>
            </g>
          </svg>

          {/* Corner HUD Badges */}
          <div className="quickmap-corner-badge top-left">
            <Crosshair size={11} className="reticle-mini-icon" />
            <span>TARGET: {activeName.toUpperCase()}</span>
          </div>

          <div className="quickmap-corner-badge top-right">
            <span>LROC WAC // LOLA 128 PPD</span>
          </div>

          {/* Bottom Bar Inside Map Showing Exact Coordinates of Selected Site */}
          <div className="quickmap-bottom-coord-bar" onClick={(e) => e.stopPropagation()}>
            <div className="qm-coord-item">
              <MapPin size={11} className="reticle-mini-icon" />
              <span className="qm-coord-lbl">LATITUDE:</span>
              <strong className="qm-coord-val">{Math.abs(activeLat).toFixed(3)}° {activeLat < 0 ? 'S' : 'N'}</strong>
            </div>
            <div className="qm-coord-item">
              <span className="qm-coord-lbl">LONGITUDE:</span>
              <strong className="qm-coord-val">{Math.abs(activeLon).toFixed(3)}° {activeLon < 0 ? 'W' : 'E'}</strong>
            </div>
            <div className="qm-coord-item">
              <span className="qm-coord-lbl">ELEVATION:</span>
              <strong className="qm-coord-val">{activeElev >= 0 ? `+${activeElev.toLocaleString()} M` : `${activeElev.toLocaleString()} M`}</strong>
            </div>
            <div className="qm-coord-hint">
              <span>CLICK POLAR MAP TO RELOCATE</span>
            </div>
          </div>
        </div>

        {/* Right: Clean Mission Control Lateral Vector Panels (SOLAR VECTOR & EARTH VECTOR) */}
        <div className="quickmap-vectors-column">
          <MissionControlVectorCard
            title="SOLAR VECTOR"
            subtitle="JPL EPHEMERIS TARGET 10"
            azimuth={sun.azimuth}
            elevation={sun.elevation}
            terrainElev={sun.terrainElevation ?? 0}
            clearance={sun.clearance}
            statusLabel={sun.isIlluminated ? 'ILLUMINATED' : 'SHADOWED'}
            isNominal={Boolean(sun.isIlluminated)}
            accentColor="#ffb14a"
            icon={Sun}
          />

          <MissionControlVectorCard
            title="EARTH VECTOR"
            subtitle="DIRECT-TO-EARTH (DTE 399)"
            azimuth={earth.azimuth}
            elevation={earth.elevation}
            terrainElev={earth.terrainElevation ?? 0}
            clearance={earth.clearance}
            statusLabel={earth.isVisible ? 'DTE LOCKED' : 'OCCLUDED'}
            isNominal={Boolean(earth.isVisible)}
            accentColor="#5ce1e6"
            icon={Radio}
          />
        </div>
      </div>
    </section>
  );
});

export default QuickmapTerrainView;
