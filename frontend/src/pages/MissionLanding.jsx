import React, { useEffect, useRef } from 'react';
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
        ctx.filter = 'grayscale(1) contrast(1.16)';
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

export default function MissionLanding({
  isExiting = false,
  onEnterMissionControl,
  onEnterAcademy,
  onEnterStudentView,
}) {
  const mountRef = useRef(null);
  const discoverSectionRef = useRef(null);

  const handleOpenAcademy = () => {
    (onEnterAcademy || onEnterStudentView)?.();
  };

  const handleOpenMissionControl = () => {
    onEnterMissionControl?.();
  };

  const handleScrollToDiscover = () => {
    discoverSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Preserve & enhance the existing 60 FPS Three.js 3D Lunar South Pole + Earthrise Scene
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
    renderer.toneMappingExposure = 1.16;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;pointer-events:none;';

    // 2. Scene & Camera — Framed for immense scale (65-75% viewport presence) with negative space on the left
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 120);
    camera.position.set(-0.42, 0.24, 4.65);
    camera.lookAt(0.36, -0.18, 0);

    // 3. Deep Space Starfield (Subtle pinpoint observatory stars over #080B10)
    const starCount = 1200;
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
      color: 0xdbeafe,
      size: 0.055,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 4. Giant 3D Moon Focused on the Rugged Lunar South Pole Horizon
    const moonGroup = new THREE.Group();
    // Positioned so the immense lunar limb sweeps across 65-75% of the composition
    moonGroup.position.set(0.68, -1.92, 0.12);
    // Tilted so the South Pole (-90° lat) faces toward the upper-front camera horizon
    moonGroup.rotation.x = THREE.MathUtils.degToRad(-68);
    scene.add(moonGroup);

    const moonRadius = 2.68;
    const moonGeo = new THREE.SphereGeometry(moonRadius, 112, 84);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xcfd4dc,
      roughness: 0.94,
      metalness: 0.02,
      bumpScale: 0.044,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(moonMesh);

    // Subtle Fresnel Limb Glow on the Lunar Horizon (#43DCE8 Lunar Cyan & Deep Blue)
    const moonGlowGeo = new THREE.SphereGeometry(moonRadius * 1.026, 64, 48);
    const moonGlowMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x43dce8) },
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
          float intensity = pow(rim * 1.95, 2.6) * clamp(vNormal.y + 0.52, 0.0, 1.0);
          gl_FragColor = vec4(glowColor, intensity * 0.28);
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
        moonMat.color.set(0xffffff);
        moonMat.needsUpdate = true;
      })
      .catch(() => {});

    // 5. Distant Blue Earth ("Earthrise") Visible Above the Lunar South Pole Horizon
    const earthGroup = new THREE.Group();
    earthGroup.position.set(1.88, 0.86, -3.25);
    scene.add(earthGroup);

    const earthRadius = 0.32;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 48, 36);
    const earthTex = createEarthTexture();
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.55,
      metalness: 0.08,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.rotation.z = THREE.MathUtils.degToRad(23.4);
    earthGroup.add(earthMesh);

    // Earth Atmospheric Halo
    const earthHaloGeo = new THREE.SphereGeometry(earthRadius * 1.18, 36, 28);
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
          float a = pow(f * 2.1, 2.0);
          gl_FragColor = vec4(haloColor, a * 0.58);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const earthHaloMesh = new THREE.Mesh(earthHaloGeo, earthHaloMat);
    earthGroup.add(earthHaloMesh);

    // 6. Realistic Grazing Polar Sunlight & Soft Shadows Across South Pole Craters
    const sunKeyLight = new THREE.DirectionalLight(0xfff6e5, 2.7);
    sunKeyLight.position.set(-4.3, 2.35, 2.0);
    const earthshineFill = new THREE.DirectionalLight(0x3b82f6, 0.25);
    earthshineFill.position.set(3.0, 2.0, 1.5);
    const ambientLight = new THREE.AmbientLight(0x151a24, 0.32);
    scene.add(sunKeyLight, earthshineFill, ambientLight);

    // Subtle cursor parallax
    const mouseTarget = { x: 0, y: 0 };
    const mouseCurrent = { x: 0, y: 0 };
    const handlePointerMove = (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouseTarget.x = nx * 0.11;
      mouseTarget.y = -ny * 0.065;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Responsive ResizeObserver
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

    // 7. 60 FPS Slow Orbital / Inertial Render Loop
    let lastTime = performance.now();
    const animate = (now) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      moonMesh.rotation.y += dt * 0.032;
      earthMesh.rotation.y += dt * 0.095;
      stars.rotation.y += dt * 0.003;

      mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.045;
      mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.045;
      camera.position.x = -0.42 + mouseCurrent.x;
      camera.position.y = 0.24 + mouseCurrent.y;
      camera.lookAt(0.36, -0.18, 0);

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
    <div
      className={`lunar-observatory-landing ${isExiting ? 'is-exiting' : 'is-entering'}`}
    >
      {/* =====================================================================
          1. FULLSCREEN HERO SECTION (100VH) — LUNAR OBSERVATORY
         ===================================================================== */}
      <section className="observatory-hero" aria-labelledby="observatory-hero-title">
        {/* Preserved 3D Moon + Earthrise WebGL Stage (Occupies 65-75% of visual space) */}
        <div ref={mountRef} className="observatory-3d-stage" aria-hidden="true" />

        {/* Atmospheric Blending Vignette for Seamless Integration with #080B10 */}
        <div className="observatory-hero-vignette" aria-hidden="true" />

        {/* DISCREET HEADER: LuNav Logo + Academy + Mission Control (No Explore) */}
        <header className="observatory-header">
          <div className="observatory-brand">
            <span className="observatory-brand-mark">
              <span>LU</span>
              <b>NAV</b>
            </span>
            <span className="observatory-brand-divider" aria-hidden="true" />
            <span className="observatory-brand-tag">LUNAR OBSERVATORY</span>
          </div>

          <nav className="observatory-nav" aria-label="Primary Navigation">
            <button
              type="button"
              className="observatory-nav-link"
              onClick={handleOpenAcademy}
            >
              Academy
            </button>
            <button
              type="button"
              className="observatory-nav-link"
              onClick={handleOpenMissionControl}
            >
              Mission Control
            </button>
          </nav>
        </header>

        {/* SCIENTIFIC OBSERVATORY ANNOTATIONS (Delicate Lines & Coordinates, Not Cards) */}
        <div className="observatory-annotations" aria-hidden="true">
          {/* Earthrise Optical Annotation near Upper-Right Limb */}
          <div className="obs-annotation is-earth">
            <span className="obs-dot is-cyan" />
            <span className="obs-line is-short" />
            <div className="obs-meta">
              <span className="obs-coord">EARTH VISIBILITY</span>
              <span className="obs-detail">Direct-to-Earth horizon lock</span>
            </div>
          </div>

          {/* Grazing Solar Incidence Annotation */}
          <div className="obs-annotation is-solar">
            <div className="obs-meta is-right">
              <span className="obs-coord">SOLAR ELEVATION — 1.54°</span>
              <span className="obs-detail">Grazing polar illumination</span>
            </div>
            <span className="obs-line" />
            <span className="obs-dot" />
          </div>

          {/* Lunar South Pole Coordinate Annotation */}
          <div className="obs-annotation is-pole">
            <span className="obs-dot is-cyan" />
            <span className="obs-line" />
            <div className="obs-meta">
              <span className="obs-coord">89.5° S — LUNAR SOUTH POLE</span>
              <span className="obs-detail">Lunar terrain — LOLA DEM</span>
            </div>
          </div>
        </div>

        {/* HERO EDITORIAL CONTENT IN LEFT NEGATIVE SPACE */}
        <div className="observatory-hero-body">
          <div className="observatory-hero-copy">
            <p className="observatory-eyebrow">
              LUNAR OBSERVATORY — EXPLORE THE LUNAR SOUTH POLE
            </p>

            <h1 id="observatory-hero-title" className="observatory-headline">
              THE MOON IS A WORLD
              <br />
              WAITING TO BE EXPLORED.
            </h1>

            <p className="observatory-subtitle">
              Discover the lunar South Pole, understand its hidden terrain and explore the
              challenges of humanity&apos;s return to the Moon.
            </p>

            <div
              className="observatory-cta-row"
              role="group"
              aria-label="Begin Lunar Exploration"
            >
              <button
                type="button"
                className="observatory-btn is-primary"
                onClick={handleOpenAcademy}
              >
                <span className="btn-bracket" aria-hidden="true">[</span>
                <span>ENTER LUNAV ACADEMY</span>
                <span className="btn-bracket" aria-hidden="true">]</span>
              </button>

              <button
                type="button"
                className="observatory-btn is-secondary"
                onClick={handleOpenMissionControl}
              >
                <span className="btn-bracket" aria-hidden="true">[</span>
                <span>LAUNCH MISSION CONTROL</span>
                <span className="btn-bracket" aria-hidden="true">]</span>
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM SCROLL CUE + MINIMAL COORDINATE HAIRLINE */}
        <footer className="observatory-hero-footer">
          <div className="hero-footer-coords" aria-hidden="true">
            <span>89.5° S</span>
            <span className="coord-sep">·</span>
            <span>SOLAR ELEVATION 1.54°</span>
            <span className="coord-sep">·</span>
            <span>LOLA DEM</span>
          </div>

          <button
            type="button"
            className="observatory-scroll-cue"
            onClick={handleScrollToDiscover}
            aria-label="Scroll to Discover LuNav"
          >
            <span className="scroll-cue-label">SCROLL TO DISCOVER</span>
            <span className="scroll-cue-line" aria-hidden="true" />
          </button>

          <div className="hero-footer-coords is-right" aria-hidden="true">
            <span>EARTH VISIBILITY</span>
            <span className="coord-sep">·</span>
            <span>JPL HORIZONS</span>
          </div>
        </footer>
      </section>

      {/* =====================================================================
          2. LOWER EDITORIAL SECTION — DISCOVER LUNAV (TWO LARGE PORTALS)
         ===================================================================== */}
      <section
        ref={discoverSectionRef}
        id="discover-lunav"
        className="observatory-discover-section"
        aria-labelledby="discover-section-heading"
      >
        <div className="discover-section-header">
          <span className="discover-kicker">DISCOVER LUNAV</span>
          <h2 id="discover-section-heading" className="discover-heading">
            Two pathways into the Lunar South Pole.
          </h2>
        </div>

        <div className="discover-editorial-list">
          {/* 01 — ACADEMY */}
          <article className="discover-feature-row is-academy">
            <div
              className="discover-visual-stage"
              onClick={handleOpenAcademy}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenAcademy();
                }
              }}
              aria-label="Enter LuNav Academy"
            >
              {/* Large Observatory Render: Comparative Earth vs. Moon Physics & Lunar Training Simulation */}
              <svg
                viewBox="0 0 800 480"
                className="discover-render-svg"
                role="img"
                aria-label="Visual representation of LuNav Academy interactive lunar training and Earth versus Moon physics experiments"
              >
                <defs>
                  <radialGradient id="academySpaceGlow" cx="62%" cy="48%" r="58%">
                    <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.38" />
                    <stop offset="55%" stopColor="#151a1e" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#080b10" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="cyanArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#43dce8" stopOpacity="0.15" />
                    <stop offset="60%" stopColor="#43dce8" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#f4f5f7" stopOpacity="0.95" />
                  </linearGradient>
                  <linearGradient id="earthArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.55" />
                  </linearGradient>
                </defs>

                {/* Deep Observatory Background Glow */}
                <rect width="800" height="480" fill="#0d1117" />
                <rect width="800" height="480" fill="url(#academySpaceGlow)" />

                {/* Subtle Observatory Astrometric Grid */}
                <g stroke="rgba(244, 245, 247, 0.05)" strokeWidth="1">
                  <line x1="0" y1="120" x2="800" y2="120" />
                  <line x1="0" y1="240" x2="800" y2="240" />
                  <line x1="0" y1="360" x2="800" y2="360" />
                  <line x1="200" y1="0" x2="200" y2="480" />
                  <line x1="400" y1="0" x2="400" y2="480" />
                  <line x1="600" y1="0" x2="600" y2="480" />
                </g>

                {/* Orbital & Ballistic Comparative Circles */}
                <circle
                  cx="510"
                  cy="240"
                  r="155"
                  fill="none"
                  stroke="rgba(67, 220, 232, 0.16)"
                  strokeWidth="1"
                  strokeDasharray="4 6"
                />
                <circle
                  cx="510"
                  cy="240"
                  r="112"
                  fill="none"
                  stroke="rgba(244, 245, 247, 0.1)"
                  strokeWidth="1"
                />

                {/* Lunar Horizon Terrain Silhouette at Bottom of Stage */}
                <path
                  d="M 0,392 Q 110,378 210,386 T 420,372 T 630,384 T 800,368 L 800,480 L 0,480 Z"
                  fill="#151a1e"
                  stroke="rgba(244, 245, 247, 0.18)"
                  strokeWidth="1"
                />

                {/* Earth Gravity Trajectory (9.81 m/s² — Short Arc) */}
                <path
                  d="M 110,384 Q 215,255 320,382"
                  fill="none"
                  stroke="url(#earthArcGrad)"
                  strokeWidth="1.75"
                  strokeDasharray="5 5"
                />

                {/* Lunar Gravity Trajectory (1.62 m/s² — Extended Low-Gravity Arc) */}
                <path
                  d="M 110,384 Q 395,95 690,376"
                  fill="none"
                  stroke="url(#cyanArcGrad)"
                  strokeWidth="2.25"
                />

                {/* Descent & Touchdown Vector Geometry */}
                <line
                  x1="510"
                  y1="85"
                  x2="510"
                  y2="375"
                  stroke="rgba(67, 220, 232, 0.28)"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
                <circle cx="110" cy="384" r="4.5" fill="#43dce8" />
                <circle cx="320" cy="382" r="3.5" fill="#60a5fa" />
                <circle cx="408" cy="236" r="5" fill="#f4f5f7" />
                <circle
                  cx="408"
                  cy="236"
                  r="14"
                  fill="none"
                  stroke="rgba(67, 220, 232, 0.55)"
                  strokeWidth="1"
                />
                <circle cx="690" cy="376" r="5" fill="#43dce8" />

                {/* Scientific Annotation Labels Inside Render */}
                <g fontFamily="JetBrains Mono, monospace" fontSize="11" letterSpacing="1.4">
                  <text x="48" y="54" fill="#43dce8">
                    SIMULATION // EARTH VS. MOON GRAVITY &amp; SURFACE TRAINING
                  </text>
                  <text x="360" y="208" fill="#f4f5f7">
                    LUNA — 1.62 m/s² (6× RANGE)
                  </text>
                  <text x="182" y="302" fill="#8a99ad">
                    EARTH — 9.81 m/s²
                  </text>
                  <text x="48" y="444" fill="#8a99ad">
                    89.5° S · ROVER NAVIGATION · SOLAR POWER · DESCENT PHYSICS
                  </text>
                </g>
              </svg>

              <div className="discover-visual-overlay">
                <span className="visual-badge">INTERACTIVE TRAINING LAB</span>
              </div>
            </div>

            <div className="discover-copy-col">
              <div className="discover-index-line">
                <span className="discover-index">01</span>
                <span className="discover-index-Rule" aria-hidden="true" />
                <span className="discover-label">ACADEMY</span>
              </div>

              <h3 className="discover-title">01 — ACADEMY</h3>

              <p className="discover-description">
                Learn through interactive challenges, scientific experiments and Earth vs. Moon
                comparisons.
              </p>

              <div className="discover-meta-notes">
                <span>EARTH VS. MOON PHYSICS</span>
                <span>·</span>
                <span>SOLAR &amp; TERRAIN SIMULATORS</span>
              </div>

              <button
                type="button"
                className="discover-action-link"
                onClick={handleOpenAcademy}
              >
                <span>ENTER LUNAV ACADEMY</span>
                <span className="action-arrow" aria-hidden="true">→</span>
              </button>
            </div>
          </article>

          {/* 02 — MISSION CONTROL */}
          <article className="discover-feature-row is-mission-control is-reversed">
            <div
              className="discover-visual-stage"
              onClick={handleOpenMissionControl}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenMissionControl();
                }
              }}
              aria-label="Launch Mission Control"
            >
              {/* Real LROC WAC Lunar Texture Backdrop + Polar Stereographic Horizon & Crater Map */}
              <div
                className="discover-wac-backdrop"
                style={{ backgroundImage: "url('/images/lro-wac-global-2k.jpg')" }}
                aria-hidden="true"
              />

              <svg
                viewBox="0 0 800 480"
                className="discover-render-svg is-overlay"
                role="img"
                aria-label="Visual representation of Mission Control lunar South Pole topographic map, crater coordinates, and 360 degree horizon elevation analysis"
              >
                <defs>
                  <radialGradient id="polarMapVignette" cx="50%" cy="46%" r="56%">
                    <stop offset="0%" stopColor="#080b10" stopOpacity="0.18" />
                    <stop offset="70%" stopColor="#080b10" stopOpacity="0.72" />
                    <stop offset="100%" stopColor="#080b10" stopOpacity="0.94" />
                  </radialGradient>
                </defs>

                <rect width="800" height="480" fill="url(#polarMapVignette)" />

                {/* Concentric Lunar South Pole Stereographic Rings (84°S – 90°S) */}
                <g transform="translate(400, 215)">
                  <circle
                    r="168"
                    fill="none"
                    stroke="rgba(244, 245, 247, 0.14)"
                    strokeWidth="1"
                  />
                  <circle
                    r="116"
                    fill="none"
                    stroke="rgba(244, 245, 247, 0.16)"
                    strokeWidth="1"
                    strokeDasharray="4 5"
                  />
                  <circle
                    r="64"
                    fill="none"
                    stroke="rgba(67, 220, 232, 0.32)"
                    strokeWidth="1"
                  />
                  <circle r="3.5" fill="#43dce8" />

                  {/* Azimuth Crosshairs */}
                  <line x1="-185" y1="0" x2="185" y2="0" stroke="rgba(244, 245, 247, 0.1)" strokeWidth="1" />
                  <line x1="0" y1="-185" x2="0" y2="185" stroke="rgba(244, 245, 247, 0.1)" strokeWidth="1" />

                  {/* Candidate Landing Site Reticles (Verified Project Sites) */}
                  <g transform="translate(18, -14)">
                    <circle r="10" fill="none" stroke="#43dce8" strokeWidth="1.25" />
                    <line x1="12" y1="-12" x2="36" y2="-28" stroke="#43dce8" strokeWidth="1" />
                    <text
                      x="42"
                      y="-26"
                      fill="#f4f5f7"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="10.5"
                      letterSpacing="1.2"
                    >
                      SHACKLETON RIM · 89.5° S
                    </text>
                  </g>

                  <g transform="translate(-82, -52)">
                    <circle r="4" fill="#f4f5f7" />
                    <text
                      x="-148"
                      y="-62"
                      fill="#94a3b8"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="10"
                      letterSpacing="1.1"
                    >
                      DE GERLACHE · 88.5° S
                    </text>
                  </g>

                  <g transform="translate(8, -132)">
                    <circle r="4" fill="#60a5fa" />
                    <text
                      x="14"
                      y="-130"
                      fill="#93c5fd"
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="10"
                      letterSpacing="1.1"
                    >
                      MALAPERT MASSIF · 86.0° S
                    </text>
                  </g>
                </g>

                {/* 360° LOLA DEM Horizon Profile Curve Along Lower Band */}
                <path
                  d="M 48,418 L 95,412 L 145,398 L 195,405 L 250,388 L 305,376 L 355,392 L 410,382 L 465,368 L 520,379 L 575,396 L 630,389 L 690,404 L 752,414"
                  fill="none"
                  stroke="#43dce8"
                  strokeWidth="1.6"
                />
                <line
                  x1="48"
                  y1="422"
                  x2="752"
                  y2="422"
                  stroke="rgba(244, 245, 247, 0.14)"
                  strokeWidth="1"
                />

                <g fontFamily="JetBrains Mono, monospace" fontSize="11" letterSpacing="1.4">
                  <text x="48" y="54" fill="#43dce8">
                    TELEMETRY // LRO LOLA DEM &amp; LROC WAC SOUTH POLE HORIZON
                  </text>
                  <text x="48" y="446" fill="#8a99ad">
                    360° HORIZON VISOR · SOLAR AVAILABILITY · EARTH VISIBILITY
                  </text>
                </g>
              </svg>

              <div className="discover-visual-overlay">
                <span className="visual-badge">84°S – 90°S SITE SELECTOR &amp; 360° VISOR</span>
              </div>
            </div>

            <div className="discover-copy-col">
              <div className="discover-index-line">
                <span className="discover-index">02</span>
                <span className="discover-index-Rule" aria-hidden="true" />
                <span className="discover-label">MISSION CONTROL</span>
              </div>

              <h3 className="discover-title">02 — MISSION CONTROL</h3>

              <p className="discover-description">
                Analyze lunar terrain, solar availability and communication visibility to
                evaluate potential landing sites.
              </p>

              <div className="discover-meta-notes">
                <span>LRO LOLA DEM</span>
                <span>·</span>
                <span>SOLAR ELEVATION 1.54°</span>
                <span>·</span>
                <span>DTE VISIBILITY</span>
              </div>

              <button
                type="button"
                className="discover-action-link"
                onClick={handleOpenMissionControl}
              >
                <span>LAUNCH MISSION CONTROL</span>
                <span className="action-arrow" aria-hidden="true">→</span>
              </button>
            </div>
          </article>
        </div>

        {/* Minimal Observatory Colophon */}
        <footer className="observatory-colophon">
          <span>LUNAV — LUNAR OBSERVATORY</span>
          <span>89.5° S — LUNAR SOUTH POLE · LOLA DEM · JPL HORIZONS</span>
        </footer>
      </section>
    </div>
  );
}
