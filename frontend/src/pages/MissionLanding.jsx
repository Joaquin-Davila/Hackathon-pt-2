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

  const handleOpenAcademy = () => {
    (onEnterAcademy || onEnterStudentView)?.();
  };

  const handleOpenMissionControl = () => {
    onEnterMissionControl?.();
  };

  // 60 FPS Three.js 3D Lunar South Pole + Earthrise Scene
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

    // 2. Scene & Camera — Centered cinematic framing
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120);
    camera.position.set(0, 0.25, 4.85);
    camera.lookAt(0, -0.18, 0);

    // 3. Deep Space Starfield
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
    moonGroup.position.set(0, -2.12, 0.1);
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

    // Subtle Fresnel Limb Glow on the Lunar Horizon
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
    earthGroup.position.set(1.52, 0.72, -3.35);
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
      camera.position.x = mouseCurrent.x;
      camera.position.y = 0.25 + mouseCurrent.y;
      camera.lookAt(0, -0.18, 0);

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
      <section className="observatory-hero" aria-labelledby="observatory-hero-title">
        {/* Giant 3D Moon + Earthrise WebGL Background */}
        <div ref={mountRef} className="observatory-3d-stage" aria-hidden="true" />

        {/* Atmospheric Blending Vignette */}
        <div className="observatory-hero-vignette" aria-hidden="true" />

        {/* ULTRA-CLEAN HEADER: Only Lunar Observatory Brand */}
        <header className="observatory-header">
          <div className="observatory-brand">
            <span className="observatory-brand-mark">
              <span>LU</span>
              <b>NAV</b>
            </span>
            <span className="observatory-brand-divider" aria-hidden="true" />
            <span className="observatory-brand-tag">LUNAR OBSERVATORY</span>
          </div>
        </header>

        {/* CENTERED HERO ACTION */}
        <div className="observatory-hero-body">
          <div className="observatory-hero-copy">
            <h1 id="observatory-hero-title" className="observatory-headline">
              THE MOON IS A WORLD
              <br />
              WAITING TO BE EXPLORED.
            </h1>

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
                <span>ENTER LUNAV ACADEMY</span>
              </button>

              <button
                type="button"
                className="observatory-btn is-secondary"
                onClick={handleOpenMissionControl}
              >
                <span>LAUNCH MISSION CONTROL</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
