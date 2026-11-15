import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createEarthTexture } from '../components/lunar/streetview/lunarTextures.js';

// Module-level cached LROC WAC texture canvas so the 3D Moon loads instantaneously
let cachedMoonCanvasPromise = null;
function getLrocMoonCanvas() {
  if (!cachedMoonCanvasPromise) {
    cachedMoonCanvasPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 2048;
        canvas.height = img.naturalHeight || 1024;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('2D context unavailable'));
          return;
        }
        ctx.filter = 'grayscale(1) contrast(1.18)';
        ctx.drawImage(img, 0, 0);
        ctx.filter = 'none';
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = '/images/lro-wac-global-2k.jpg';
    });
  }
  return cachedMoonCanvasPromise;
}

// Curated Lunar South Pole Ephemeris & Horizon Specimens for the Landing Preview
const HORIZON_SPECIMENS = [
  {
    id: 'shackleton',
    code: 'ARTEMIS-001',
    name: 'Shackleton Rim',
    coords: '89.54°S, 129.78°E',
    elevationM: '+1,420 m',
    sunElev: '+1.54°',
    sunAz: '284.2°',
    dteElev: '+4.22°',
    dteAz: '000.0°',
    illuminationWindow: '86.9% SYNODIC',
    solarFlux: '1,361 W/m²',
    dteStatus: 'CLEAR LOS // LOCK',
    horizonPath:
      'M 0,58 L 28,55 L 56,49 L 84,53 L 112,44 L 140,39 L 168,46 L 196,52 L 224,48 L 252,37 L 280,31 L 308,35 L 336,45 L 364,51 L 392,47 L 420,42 L 448,49 L 476,54 L 504,50 L 532,44 L 560,52 L 588,56 L 620,58',
    sunWavePath:
      'M 0,46 Q 155,34 310,27 T 620,43',
    sunMarkerX: 280,
    sunMarkerY: 27,
    dteMarkerX: 62,
    dteMarkerY: 36,
  },
  {
    id: 'malapert',
    code: 'ARTEMIS-003',
    name: 'Malapert Massif',
    coords: '86.04°S, 002.70°E',
    elevationM: '+4,850 m',
    sunElev: '+1.88°',
    sunAz: '312.6°',
    dteElev: '+6.74°',
    dteAz: '000.4°',
    illuminationWindow: '89.2% SYNODIC',
    solarFlux: '1,364 W/m²',
    dteStatus: 'UNOBSTRUCTED PEAK',
    horizonPath:
      'M 0,62 L 32,60 L 64,56 L 96,51 L 128,46 L 160,48 L 192,54 L 224,57 L 256,49 L 288,41 L 320,38 L 352,43 L 384,50 L 416,55 L 448,52 L 480,47 L 512,51 L 544,57 L 576,60 L 620,62',
    sunWavePath:
      'M 0,44 Q 160,30 320,24 T 620,40',
    sunMarkerX: 320,
    sunMarkerY: 24,
    dteMarkerX: 62,
    dteMarkerY: 30,
  },
  {
    id: 'degerlache',
    code: 'ARTEMIS-002',
    name: 'De Gerlache Rim',
    coords: '88.48°S, 291.60°E',
    elevationM: '+2,190 m',
    sunElev: '+1.38°',
    sunAz: '258.0°',
    dteElev: '+3.65°',
    dteAz: '359.1°',
    illuminationWindow: '84.1% SYNODIC',
    solarFlux: '1,358 W/m²',
    dteStatus: 'NOMINAL // +3.6°',
    horizonPath:
      'M 0,55 L 30,51 L 60,45 L 90,48 L 120,41 L 150,34 L 180,38 L 210,47 L 240,42 L 270,35 L 300,39 L 330,46 L 360,43 L 390,36 L 420,40 L 450,48 L 480,52 L 510,46 L 540,49 L 580,53 L 620,55',
    sunWavePath:
      'M 0,49 Q 150,37 300,31 T 620,47',
    sunMarkerX: 240,
    sunMarkerY: 33,
    dteMarkerX: 62,
    dteMarkerY: 40,
  },
];

export default function MissionLanding({
  isExiting = false,
  onEnterMissionControl,
  onEnterAcademy,
  onEnterStudentView,
}) {
  const mountRef = useRef(null);
  const [activeSpecimenId, setActiveSpecimenId] = useState('shackleton');
  const [utcTimestamp, setUtcTimestamp] = useState(() =>
    new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  );

  const activeSpecimen =
    HORIZON_SPECIMENS.find((item) => item.id === activeSpecimenId) || HORIZON_SPECIMENS[0];

  // Live UTC orbital clock for the editorial telemetry header
  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTimestamp(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 60 FPS Three.js Lunar South Pole Horizon + Earthrise Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    let disposed = false;
    let rafId = null;
    let moonTexture = null;

    // 1. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;pointer-events:none;';

    // 2. Scene & Camera (framed with generous negative space on the left for editorial typography)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120);
    camera.position.set(-0.35, 0.28, 5.25);
    camera.lookAt(0.32, -0.18, 0);

    // 3. Deep Stellar Field (Subtle, high-precision pinpoint stars on #090A0D)
    const starCount = 1100;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 38 + Math.random() * 14;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = -Math.abs(r * Math.sin(phi) * Math.sin(theta));
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xe2e8f0,
      size: 0.052,
      transparent: true,
      opacity: 0.54,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 4. Sculpted 3D Moon Focused on the Lunar South Pole Horizon
    const moonGroup = new THREE.Group();
    moonGroup.position.set(0.62, -2.28, -0.15);
    moonGroup.rotation.x = THREE.MathUtils.degToRad(-68);
    scene.add(moonGroup);

    const moonRadius = 2.68;
    const moonGeo = new THREE.SphereGeometry(moonRadius, 112, 84);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.95,
      metalness: 0.02,
      bumpScale: 0.044,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(moonMesh);

    // Restrained optical limb atmosphere (no neon cyan glow)
    const moonGlowGeo = new THREE.SphereGeometry(moonRadius * 1.022, 64, 48);
    const moonGlowMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x94a3b8) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        uniform vec3 glowColor;
        void main() {
          float rim = clamp(dot(-vNormal, vViewPosition), 0.0, 1.0);
          float intensity = pow(rim * 1.9, 2.8) * clamp(vNormal.y + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(glowColor, intensity * 0.24);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const moonGlowMesh = new THREE.Mesh(moonGlowGeo, moonGlowMat);
    moonGroup.add(moonGlowMesh);

    // Load High-Resolution NASA LROC WAC Texture + Bump Relief
    getLrocMoonCanvas()
      .then((canvas) => {
        if (disposed) return;
        moonTexture = new THREE.CanvasTexture(canvas);
        moonTexture.colorSpace = THREE.SRGBColorSpace;
        moonTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
        moonMat.map = moonTexture;
        moonMat.bumpMap = moonTexture;
        moonMat.color.set(0xf8fafc);
        moonMat.needsUpdate = true;
      })
      .catch(() => {});

    // 5. Distant Blue Earth ("Earthrise") Above the Eastern South Pole Limb
    const earthGroup = new THREE.Group();
    earthGroup.position.set(1.95, 0.78, -3.5);
    scene.add(earthGroup);

    const earthRadius = 0.31;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 48, 36);
    const earthTex = createEarthTexture();
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.58,
      metalness: 0.06,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.rotation.z = THREE.MathUtils.degToRad(23.4);
    earthGroup.add(earthMesh);

    const earthHaloGeo = new THREE.SphereGeometry(earthRadius * 1.15, 36, 28);
    const earthHaloMat = new THREE.ShaderMaterial({
      uniforms: {
        haloColor: { value: new THREE.Color(0x60a5fa) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        uniform vec3 haloColor;
        void main() {
          float f = clamp(dot(-vNormal, vView), 0.0, 1.0);
          float a = pow(f * 2.0, 2.2);
          gl_FragColor = vec4(haloColor, a * 0.45);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const earthHaloMesh = new THREE.Mesh(earthHaloGeo, earthHaloMat);
    earthGroup.add(earthHaloMesh);

    // 6. Raking Low-Angle Polar Sunlight (1.5° grazing incidence across crater rims)
    const sunKeyLight = new THREE.DirectionalLight(0xfff8ed, 2.75);
    sunKeyLight.position.set(-4.4, 2.2, 1.9);
    const earthshineFill = new THREE.DirectionalLight(0x64748b, 0.22);
    earthshineFill.position.set(3.0, 2.0, 1.5);
    const ambientLight = new THREE.AmbientLight(0x0f172a, 0.28);
    scene.add(sunKeyLight, earthshineFill, ambientLight);

    // Subtle pointer parallax
    const mouseTarget = { x: 0, y: 0 };
    const mouseCurrent = { x: 0, y: 0 };
    const handlePointerMove = (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouseTarget.x = nx * 0.1;
      mouseTarget.y = -ny * 0.06;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    let lastTime = performance.now();
    const animate = (now) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      moonMesh.rotation.y += dt * 0.034;
      earthMesh.rotation.y += dt * 0.095;
      stars.rotation.y += dt * 0.003;

      mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.045;
      mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.045;
      camera.position.x = -0.35 + mouseCurrent.x;
      camera.position.y = 0.28 + mouseCurrent.y;
      camera.lookAt(0.32, -0.18, 0);

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      resizeObserver.disconnect();
      starGeo.dispose();
      starMat.dispose();
      moonGeo.dispose();
      moonMat.dispose();
      moonGlowGeo.dispose();
      moonGlowMat.dispose();
      moonTexture?.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      earthTex?.dispose();
      earthHaloGeo.dispose();
      earthHaloMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <section
      className={`mission-landing-hub is-cinematic-3d is-editorial-dark ${
        isExiting ? 'is-exiting' : 'is-entering'
      }`}
      aria-labelledby="landing-hero-title"
    >
      {/* 1. Full-Bleed 60 FPS 3D Lunar South Pole + Earthrise Canvas on #090A0D */}
      <div ref={mountRef} className="landing-3d-canvas-stage" aria-hidden="true" />

      {/* Editorial Chiaroscuro Vignette (preserves deep #090A0D negative space on left) */}
      <div className="landing-editorial-vignette" aria-hidden="true" />

      {/* Structural Architectural Grid Container */}
      <div className="landing-editorial-frame">
        {/* TOP TELEMETRY META STRIP (Monospace Orbital Readout, Zero Pills) */}
        <header className="landing-editorial-topbar" aria-label="Orbital Telemetry Reference">
          <div className="topbar-cell">
            <span className="topbar-index">SYS // 00</span>
            <span className="topbar-value">LUNAV SURFACE INTELLIGENCE V2.4</span>
          </div>
          <div className="topbar-cell">
            <span className="topbar-label">TARGET BODY</span>
            <span className="topbar-value">301 LUNA // 84°S – 90°S</span>
          </div>
          <div className="topbar-cell">
            <span className="topbar-label">EPHEMERIS KERNEL</span>
            <span className="topbar-value">JPL DE440 · LRO LOLA 128 PPD</span>
          </div>
          <div className="topbar-cell is-right">
            <span className="topbar-live-indicator" aria-hidden="true" />
            <span className="topbar-value">{utcTimestamp}</span>
          </div>
        </header>

        {/* SECTION 1 & 2: EDITORIAL HERO + DIRECT DUAL CALL-TO-ACTION */}
        <div className="landing-editorial-MainGrid">
          <div className="landing-hero-column">
            <div className="landing-section-kicker">
              <span className="kicker-num">01</span>
              <span className="kicker-sep">/</span>
              <span className="kicker-text">ARTEMIS SOUTH POLE LANDING SITE ARCHITECTURE</span>
            </div>

            <h1 id="landing-hero-title" className="landing-editorial-headline">
              Navigate the permanent twilight of the Lunar South Pole.
            </h1>

            <p className="landing-editorial-lead">
              At 89° South, the Sun skims just 1.5° above crater ridges—casting 40-kilometer
              topographic shadows while Earth hovers near the northern horizon. LuNav synthesizes
              LRO LOLA laser altimetry and JPL Horizons ephemerides to model 360° terrain occlusion,
              solar power availability, and Direct-to-Earth communication links in real time.
            </p>

            {/* Clean Architectural Dual CTAs: Mission Planners vs. Educators / Cadets */}
            <div
              className="landing-editorial-actions"
              role="group"
              aria-label="Select Operational Workspace"
            >
              <button
                type="button"
                className="editorial-cta-btn is-primary-planner"
                onClick={() => onEnterMissionControl?.()}
              >
                <div className="cta-top-row">
                  <span className="cta-role-tag">FOR MISSION PLANNERS</span>
                  <span className="cta-arrow" aria-hidden="true">
                    →
                  </span>
                </div>
                <span className="cta-main-label">Launch Mission Control</span>
                <span className="cta-tech-meta">
                  360° LOLA HORIZON VISOR · WAC POLAR DEM · DTE LINK BUDGET
                </span>
              </button>

              <button
                type="button"
                className="editorial-cta-btn is-secondary-academy"
                onClick={() => (onEnterAcademy || onEnterStudentView)?.()}
              >
                <div className="cta-top-row">
                  <span className="cta-role-tag">FOR EDUCATORS &amp; CADETS</span>
                  <span className="cta-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
                <span className="cta-main-label">Enter LuNav Academy</span>
                <span className="cta-tech-meta">
                  5 INTERACTIVE SIMULATORS · FIELD TRAINING · EARTH VS MOON LAB
                </span>
              </button>
            </div>
          </div>

          {/* Right Negative Space Column: Minimal Optical Callout Aligned with 3D Horizon */}
          <aside className="landing-optical-sidebar" aria-label="Optical Target Reference">
            <div className="optical-callout-block">
              <div className="optical-row">
                <span className="optical-key">OPTICAL LOCK</span>
                <span className="optical-val">EARTH (TARGET 399)</span>
              </div>
              <div className="optical-row">
                <span className="optical-key">SOLAR INCIDENCE</span>
                <span className="optical-val">GRAZING POLAR · 1.54°</span>
              </div>
              <div className="optical-row">
                <span className="optical-key">RELIEF DATASET</span>
                <span className="optical-val">LROC WAC + LOLA DEM</span>
              </div>
            </div>
          </aside>
        </div>

        {/* SECTION 3: CLEAN HORIZON & EPHEMERIS PREVIEW SPECIMEN DOCK */}
        <footer
          className="landing-ephemeris-dock"
          aria-label="Live Horizon and Ephemeris Preview"
        >
          {/* Left Dock Panel: Interactive 360° Horizon Elevation Profile Preview */}
          <div className="ephemeris-preview-chart-col">
            <div className="dock-header-bar">
              <div className="dock-title-group">
                <span className="dock-index">02 // HORIZON &amp; EPHEMERIS PREVIEW</span>
                <span className="dock-subtitle">
                  360° AZIMUTH ELEVATION MASK vs. ECLIPTIC SOLAR WAVE
                </span>
              </div>

              {/* Site Switcher Tabs (Sharp Hairline Tabs) */}
              <div className="dock-site-tabs" role="tablist" aria-label="Candidate South Pole Sites">
                {HORIZON_SPECIMENS.map((site) => {
                  const isSelected = site.id === activeSpecimen.id;
                  return (
                    <button
                      key={site.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      className={`dock-site-tab ${isSelected ? 'is-active' : ''}`}
                      onClick={() => setActiveSpecimenId(site.id)}
                    >
                      <span className="tab-code">{site.code}</span>
                      <span className="tab-name">{site.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clean SVG Topographic Horizon Curve + Grazing Sun & DTE Vectors */}
            <div className="horizon-specimen-canvas">
              <svg
                viewBox="0 0 620 76"
                preserveAspectRatio="none"
                className="horizon-specimen-svg"
                 role="img"
                aria-label={`360 degree horizon elevation profile for ${activeSpecimen.name}`}
              >
                {/* Subtle 0° Mathematical Horizon Reference Line */}
                <line
                  x1="0"
                  y1="48"
                  x2="620"
                  y2="48"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />

                {/* Azimuth Meridian Hairlines (90° E, 180° S, 270° W) */}
                <line x1="155" y1="0" x2="155" y2="76" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                <line x1="310" y1="0" x2="310" y2="76" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                <line x1="465" y1="0" x2="465" y2="76" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />

                {/* Diurnal Solar Ecliptic Trajectory Wave */}
                <path
                  d={activeSpecimen.sunWavePath}
                  fill="none"
                  stroke="rgba(245, 158, 11, 0.65)"
                  strokeWidth="1.25"
                  strokeDasharray="4 3"
                />

                {/* LRO LOLA Terrain Occlusion Fill */}
                <path
                  d={`${activeSpecimen.horizonPath} L 620,76 L 0,76 Z`}
                  fill="rgba(248, 250, 252, 0.06)"
                />

                {/* LRO LOLA 360° Ridge Silhouette Line */}
                <path
                  d={activeSpecimen.horizonPath}
                  fill="none"
                  stroke="rgba(248, 250, 252, 0.78)"
                  strokeWidth="1.5"
                />

                {/* Direct-to-Earth (DTE) Azimuth Lock Vector */}
                <line
                  x1={activeSpecimen.dteMarkerX}
                  y1={activeSpecimen.dteMarkerY}
                  x2={activeSpecimen.dteMarkerX}
                  y2="76"
                  stroke="rgba(56, 189, 248, 0.45)"
                  strokeWidth="1"
                />
                <circle
                  cx={activeSpecimen.dteMarkerX}
                  cy={activeSpecimen.dteMarkerY}
                  r="3.2"
                  fill="#38bdf8"
                />

                {/* Solar Ephemeris Position Marker */}
                <line
                  x1={activeSpecimen.sunMarkerX}
                  y1={activeSpecimen.sunMarkerY}
                  x2={activeSpecimen.sunMarkerX}
                  y2="76"
                  stroke="rgba(245, 158, 11, 0.45)"
                  strokeWidth="1"
                />
                <circle
                  cx={activeSpecimen.sunMarkerX}
                  cy={activeSpecimen.sunMarkerY}
                  r="3.6"
                  fill="#f59e0b"
                />
              </svg>

              {/* Azimuth Axis Scale & Vector Legend */}
              <div className="horizon-specimen-axis">
                <span>000° N (DTE AXIS)</span>
                <span>090° E</span>
                <span>180° S (POLEWARD)</span>
                <span>270° W</span>
                <span>360° N</span>
              </div>
            </div>
          </div>

          {/* Right Dock Panel: High-Contrast Monospace Ephemeris Telemetry Matrix */}
          <div className="ephemeris-telemetry-matrix">
            <div className="telemetry-cell">
              <span className="telemetry-label">SELECTED SITE COORDINATES</span>
              <strong className="telemetry-value">{activeSpecimen.coords}</strong>
              <span className="telemetry-sub">
                ELEVATION {activeSpecimen.elevationM} · {activeSpecimen.name.toUpperCase()}
              </span>
            </div>

            <div className="telemetry-cell">
              <span className="telemetry-label">SOLAR EPHEMERIS VECTOR</span>
              <strong className="telemetry-value is-amber">
                ELEV {activeSpecimen.sunElev} / AZ {activeSpecimen.sunAz}
              </strong>
              <span className="telemetry-sub">
                INCIDENT FLUX {activeSpecimen.solarFlux}
              </span>
            </div>

            <div className="telemetry-cell">
              <span className="telemetry-label">DIRECT-TO-EARTH (DTE) LINK</span>
              <strong className="telemetry-value is-sky">
                ELEV {activeSpecimen.dteElev} / AZ {activeSpecimen.dteAz}
              </strong>
              <span className="telemetry-sub">{activeSpecimen.dteStatus}</span>
            </div>

            <div className="telemetry-cell">
              <span className="telemetry-label">SYNODIC ILLUMINATION</span>
              <strong className="telemetry-value">{activeSpecimen.illuminationWindow}</strong>
              <span className="telemetry-sub">LOLA 128 PPD HORIZON CLEARANCE</span>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}
