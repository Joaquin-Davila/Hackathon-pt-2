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

  // 60 FPS Three.js Giant Lunar South Pole Horizon + Earthrise Scene
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
    renderer.toneMappingExposure = 1.18;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;pointer-events:none;';

    // 2. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
    camera.position.set(0, 0.25, 5.2);
    camera.lookAt(0, -0.15, 0);

    // 3. Deep Space Starfield (Lightweight 1,400 stars for 60 FPS)
    const starCount = 1400;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 38 + Math.random() * 12;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = -Math.abs(r * Math.sin(phi) * Math.sin(theta));
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xdbeafe,
      size: 0.065,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 4. Giant 3D Moon Focused on the Rugged Lunar South Pole Horizon
    const moonGroup = new THREE.Group();
    // Position the giant Moon in the lower half of the viewport so its curved horizon arcs across the screen
    moonGroup.position.set(0, -2.35, 0);
    // Tilt so the South Pole (-90° lat) faces toward the upper-front camera horizon
    moonGroup.rotation.x = THREE.MathUtils.degToRad(-68);
    scene.add(moonGroup);

    const moonRadius = 2.65;
    const moonGeo = new THREE.SphereGeometry(moonRadius, 112, 84);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xcfd4dc,
      roughness: 0.94,
      metalness: 0.02,
      bumpScale: 0.042,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(moonMesh);

    // Subtle Fresnel Atmospheric/Limb Rim Glow on the Lunar Horizon
    const moonGlowGeo = new THREE.SphereGeometry(moonRadius * 1.032, 64, 48);
    const moonGlowMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x5ce1e6) },
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
          float intensity = pow(rim * 1.95, 2.4) * clamp(vNormal.y + 0.55, 0.0, 1.0);
          gl_FragColor = vec4(glowColor, intensity * 0.42);
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

    // 5. Distant Blue Earth ("Earthrise") Peeking Above the Lunar South Pole Horizon
    const earthGroup = new THREE.Group();
    earthGroup.position.set(1.52, 0.68, -3.4);
    scene.add(earthGroup);

    const earthRadius = 0.34;
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
          gl_FragColor = vec4(haloColor, a * 0.65);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const earthHaloMesh = new THREE.Mesh(earthHaloGeo, earthHaloMat);
    earthGroup.add(earthHaloMesh);

    // 6. Dramatic Grazing Polar Sunlight (Raking shadows across South Pole craters)
    const sunKeyLight = new THREE.DirectionalLight(0xfff6e5, 2.65);
    sunKeyLight.position.set(-4.2, 2.4, 2.1);
    const earthshineFill = new THREE.DirectionalLight(0x60a5fa, 0.28);
    earthshineFill.position.set(3.0, 2.0, 1.5);
    const ambientLight = new THREE.AmbientLight(0x1e2530, 0.35);
    scene.add(sunKeyLight, earthshineFill, ambientLight);

    // Subtle mouse parallax state (interpolated inside rAF for zero layout thrashing)
    const mouseTarget = { x: 0, y: 0 };
    const mouseCurrent = { x: 0, y: 0 };
    const handlePointerMove = (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouseTarget.x = nx * 0.14;
      mouseTarget.y = -ny * 0.08;
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

    // 7. 60 FPS Inertial Render Loop
    let lastTime = performance.now();
    const animate = (now) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      // Smooth inertial rotation of the Lunar South Pole & Earth
      moonMesh.rotation.y += dt * 0.042;
      earthMesh.rotation.y += dt * 0.11;
      stars.rotation.y += dt * 0.004;

      // Smooth camera parallax damping
      mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.05;
      mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.05;
      camera.position.x = mouseCurrent.x;
      camera.position.y = 0.25 + mouseCurrent.y;
      camera.lookAt(0, -0.15, 0);

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
      className={`mission-landing-hub is-cinematic-3d ${isExiting ? 'is-exiting' : 'is-entering'}`}
      aria-labelledby="landing-hero-title"
    >
      {/* 1. Full-Bleed 60 FPS 3D Lunar South Pole + Earthrise WebGL Canvas */}
      <div ref={mountRef} className="landing-3d-canvas-stage" aria-hidden="true" />

      {/* Subtle Vignette & Horizon Atmospheric Gradient Overlay */}
      <div className="landing-cinematic-vignette" aria-hidden="true" />

      {/* Earthrise Telemetry Callout Badge near Upper Right Horizon */}
      <div className="landing-earthrise-callout" aria-hidden="true">
        <span className="earthrise-dot" />
        <span>DTE TARGET 399 // EARTH HORIZON LOCK</span>
      </div>

      {/* Corner Fiducial Marks */}
      <div className="landing-corner-mark top-left" aria-hidden="true">
        <span>SYS // NASA SPACE APPS CHALLENGE</span>
      </div>
      <div className="landing-corner-mark top-right" aria-hidden="true">
        <span>SECTOR // 84°S – 90°S LRO LOLA DEM</span>
      </div>
      <div className="landing-corner-mark bottom-left" aria-hidden="true">
        <span>EPHEMERIS // JPL HORIZONS DE440</span>
      </div>
      <div className="landing-corner-mark bottom-right" aria-hidden="true">
        <span>INERTIAL ORBIT // 60 FPS WEBGL</span>
      </div>

      {/* 2. Central Frosted-Glass (Glassmorphism) Mission Control HUD */}
      <div className="landing-glass-hud-panel">
        {/* Corner HUD Brackets */}
        <span className="hud-corner-bracket tl" aria-hidden="true" />
        <span className="hud-corner-bracket tr" aria-hidden="true" />
        <span className="hud-corner-bracket bl" aria-hidden="true" />
        <span className="hud-corner-bracket br" aria-hidden="true" />

        {/* Live Telemetry Status Pill */}
        <div className="landing-status-pill" role="status">
          <span className="status-beacon-dot" />
          <span>SYSTEM ONLINE // TELEMETRY LINK ACTIVE</span>
        </div>

        {/* Imposing Main Mission Title */}
        <h1 id="landing-hero-title" className="landing-main-title">
          LUNAR NAVIGATION &amp; SITE SELECTOR <span className="title-version">// SYSTEM V1.0</span>
        </h1>

        {/* Concise Single-Line Mission Description */}
        <p className="landing-single-line-desc">
          Real-time 360° topographic horizon, solar power flux, and Direct-to-Earth (DTE) link analysis platform for NASA Artemis South Pole missions.
        </p>

        {/* Primary Access Mode Buttons: [ ENTER LUNAV ACADEMY ] vs [ ASTRONAUT / MISSION CONTROL ] */}
        <div className="landing-cta-matrix" role="group" aria-label="Select Operational Interface Mode">
          <button
            type="button"
            className="landing-mode-btn is-student is-academy-entry"
            onClick={() => (onEnterAcademy || onEnterStudentView)?.()}
          >
            <div className="btn-main-line">
              <span className="btn-bracket">[</span>
              <span className="btn-label">ENTER LUNAV ACADEMY</span>
              <span className="btn-bracket">]</span>
            </div>
            <span className="btn-subtag">Interactive challenges &amp; Earth vs. Moon comparative telemetry</span>
            <span className="btn-academy-desc">
              Train as a lunar explorer. Complete scientific challenges, investigate real lunar terrain and prepare for your first mission.
            </span>
          </button>

          <button
            type="button"
            className="landing-mode-btn is-astronaut"
            onClick={() => onEnterMissionControl?.()}
          >
            <div className="btn-main-line">
              <span className="btn-bracket">[</span>
              <span className="btn-label">ASTRONAUT / MISSION CONTROL</span>
              <span className="btn-bracket">]</span>
            </div>
            <span className="btn-subtag">LAUNCH FULL 360° VISOR &amp; POLAR HUD →</span>
            <span className="btn-academy-desc">
              Direct operational access to LRO LOLA 360° horizon visors, LROC WAC polar maps, and JPL Horizons ephemeris telemetry.
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
