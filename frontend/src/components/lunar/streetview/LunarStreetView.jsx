import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import {
  Sun,
  Globe,
  Compass,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  Radio,
  Eye,
  Crosshair,
} from 'lucide-react';

import {
  calculateSolarVector,
  calculateEarthVector,
  evaluateSiteTelemetry,
  getTerrainElevationAtAzimuth,
  normalizeAngle360,
  LUNAR_SYNODIC_HOURS,
  DEFAULT_MISSION_EPOCH,
} from '../../../services/ephemerisEngine.js';

import {
  createRegolithNormalTexture,
} from './lunarTextures.js';

import {
  createHorizonRidgeMesh,
  createHorizonContourLine,
  createLocalLunarGround,
} from './lunarTerrain.js';

import {
  createCelestialSystem,
  updateCelestialVectors,
  projectToScreen,
} from './lunarCelestial.js';

import { CANDIDATE_SITES_CATALOG } from '../../../services/horizonsService.js';
import '../../../styles/streetview.css';

export default function LunarStreetView({
  site = null,
  horizonProfile = [],
  hoursOffset = 0,
  onChangeHoursOffset = null,
  onSelectSite = null,
  baseDate = DEFAULT_MISSION_EPOCH,
}) {
  const mountRef = useRef(null);
  const shellRef = useRef(null);

  // Simulation timeline state
  const [internalHours, setInternalHours] = useState(hoursOffset);
  const activeHours = onChangeHoursOffset ? hoursOffset : internalHours;
  const setHours = onChangeHoursOffset || setInternalHours;

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(6); // 1 = 1x, 6 = 6hr/s, 24 = 24hr/s
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLolaContour, setShowLolaContour] = useState(true);
  const [isAutoPanning, setIsAutoPanning] = useState(false);

  // Camera orientation state (degrees)
  // Yaw: 0° = North (-Z), 90° = East (+X), 180° = South (+Z), 270° = West (-X)
  // Pitch: -35° (down to boots/ground) to +75° (up into sky)
  const [cameraState, setCameraState] = useState({ yaw: 74, pitch: 4, fov: 70 });
  const targetCamRef = useRef({ yaw: 74, pitch: 4, fov: 70 });
  const liveCamRef = useRef({ yaw: 74, pitch: 4, fov: 70 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, yaw: 0, pitch: 0 });

  // On-screen projected celestial markers
  const [screenTargets, setScreenTargets] = useState({
    sun: { x: 0, y: 0, inFront: false, inView: false, angleDeg: 0 },
    earth: { x: 0, y: 0, inFront: false, inView: false, angleDeg: 0 },
  });

  // Reference to 3D scene elements
  const threeRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    celestial: null,
    horizonMesh: null,
    contourLine: null,
    beaconLed: null,
    animFrame: null,
  });

  // Active Site Coordinates & ID
  const activeSite = site || {
    id: 'shackleton-rim',
    siteId: 'shackleton',
    name: 'Shackleton Rim',
    lat: -89.54,
    lon: 0.0,
    elevation: 4218,
  };

  const latitude = Number(activeSite.lat ?? activeSite.latitude ?? -89.54);
  const longitude = Number(activeSite.lon ?? activeSite.longitude ?? 0.0);
  const elevation = Number(activeSite.elevation ?? activeSite.elevationMeters ?? 4218);

  // Real-time Ephemeris Evaluation
  const telemetry = useMemo(() => {
    return evaluateSiteTelemetry(activeSite, horizonProfile, activeHours, new Date(baseDate));
  }, [activeSite, horizonProfile, activeHours, baseDate]);

  const sunData = telemetry.sun;
  const earthData = telemetry.earth;

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090a0d); // LuNav Deep Void Black
    scene.fog = null; // Moon has no atmospheric fog

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 25000);
    camera.position.set(0, 1.8, 0); // Exact Astronaut Eye-Level Height

    // 2. High-Performance Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;outline:none;';

    // 3. Local Astronaut Ground with Regolith Micro-Relief
    const regolithNormal = createRegolithNormalTexture();
    const { group: groundGroup, beaconLed } = createLocalLunarGround(regolithNormal);
    scene.add(groundGroup);

    // 4. Celestial System (Sun, Earth, Stars)
    const celestial = createCelestialSystem(scene);

    threeRef.current = {
      scene,
      camera,
      renderer,
      celestial,
      horizonMesh: null,
      contourLine: null,
      beaconLed,
      animFrame: null,
    };

    // 5. Responsive Resize Observer
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (threeRef.current.animFrame) {
        cancelAnimationFrame(threeRef.current.animFrame);
      }
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // Update Horizon Mesh when site or horizonProfile changes
  useEffect(() => {
    const { scene } = threeRef.current;
    if (!scene) return;

    // Remove previous horizon meshes
    if (threeRef.current.horizonMesh) {
      scene.remove(threeRef.current.horizonMesh);
      threeRef.current.horizonMesh.geometry?.dispose();
      threeRef.current.horizonMesh.material?.dispose();
      threeRef.current.horizonMesh = null;
    }
    if (threeRef.current.contourLine) {
      scene.remove(threeRef.current.contourLine);
      threeRef.current.contourLine.geometry?.dispose();
      threeRef.current.contourLine.material?.dispose();
      threeRef.current.contourLine = null;
    }

    // Build LOLA Horizon Mesh
    const horizonMesh = createHorizonRidgeMesh(horizonProfile, 2400);
    scene.add(horizonMesh);
    threeRef.current.horizonMesh = horizonMesh;

    // Build LOLA Technical Contour Polyline
    const contourLine = createHorizonContourLine(horizonProfile, 2400);
    contourLine.visible = showLolaContour;
    scene.add(contourLine);
    threeRef.current.contourLine = contourLine;
  }, [horizonProfile, showLolaContour]);

  // Toggle LOLA Contour visibility
  useEffect(() => {
    if (threeRef.current.contourLine) {
      threeRef.current.contourLine.visible = showLolaContour;
    }
  }, [showLolaContour]);

  // Main Animation Render Loop
  useEffect(() => {
    const { scene, camera, renderer, celestial, beaconLed } = threeRef.current;
    if (!scene || !camera || !renderer || !celestial) return;

    let lastTime = performance.now();

    const renderLoop = (time) => {
      const deltaSec = (time - lastTime) / 1000.0;
      lastTime = time;

      // 1. Interactive Camera Damping & Auto-Panning
      if (isAutoPanning) {
        targetCamRef.current.yaw = normalizeAngle360(targetCamRef.current.yaw + deltaSec * 3.5);
      }

      // Smooth camera interpolation
      const cur = liveCamRef.current;
      const tgt = targetCamRef.current;

      // Wrap-around handling for yaw
      let diffYaw = (tgt.yaw - cur.yaw) % 360;
      if (diffYaw > 180) diffYaw -= 360;
      if (diffYaw < -180) diffYaw += 360;

      cur.yaw = normalizeAngle360(cur.yaw + diffYaw * 0.14);
      cur.pitch += (tgt.pitch - cur.pitch) * 0.14;
      cur.fov += (tgt.fov - cur.fov) * 0.14;

      if (camera.fov !== cur.fov) {
        camera.fov = cur.fov;
        camera.updateProjectionMatrix();
      }

      // Calculate First-Person Look Vector
      // Yaw: 0° = North (-Z), 90° = East (+X)
      const yawRad = (cur.yaw * Math.PI) / 180.0;
      const pitchRad = (cur.pitch * Math.PI) / 180.0;

      const cosPitch = Math.cos(pitchRad);
      const lookX = cosPitch * Math.sin(yawRad);
      const lookY = Math.sin(pitchRad);
      const lookZ = -cosPitch * Math.cos(yawRad);

      camera.lookAt(lookX, 1.8 + lookY, lookZ);

      // 2. Pulse Artemis Telemetry Beacon LED
      if (beaconLed) {
        const pulse = (Math.sin(time * 0.005) + 1.0) * 0.5;
        beaconLed.color.setRGB(0.36 + pulse * 0.6, 0.88, 0.9 + pulse * 0.1);
      }

      // 3. Project 3D Celestial Targets to Screen for HUD
      const width = renderer.domElement.clientWidth || 800;
      const height = renderer.domElement.clientHeight || 520;

      const sunPos = celestial.sunGroup.position;
      const earthPos = celestial.earthGroup.position;

      const sunProj = projectToScreen(sunPos, camera, width, height);
      const earthProj = projectToScreen(earthPos, camera, width, height);

      setScreenTargets({ sun: sunProj, earth: earthProj });

      // Update camera readout state throttled
      if (Math.abs(cameraState.yaw - cur.yaw) > 0.4 || Math.abs(cameraState.pitch - cur.pitch) > 0.4) {
        setCameraState({
          yaw: Number(cur.yaw.toFixed(1)),
          pitch: Number(cur.pitch.toFixed(1)),
          fov: Number(cur.fov.toFixed(1)),
        });
      }

      // Render Three.js Scene
      renderer.render(scene, camera);

      threeRef.current.animFrame = requestAnimationFrame(renderLoop);
    };

    threeRef.current.animFrame = requestAnimationFrame(renderLoop);

    return () => {
      if (threeRef.current.animFrame) {
        cancelAnimationFrame(threeRef.current.animFrame);
      }
    };
  }, [isAutoPanning, cameraState.yaw, cameraState.pitch]);

  // Update Ephemeris Vectors in 3D Scene when telemetry changes
  useEffect(() => {
    const { celestial } = threeRef.current;
    if (!celestial || !sunData || !earthData) return;

    updateCelestialVectors(
      celestial,
      sunData,
      earthData,
      sunData.clearance,
      earthData.clearance,
      1400
    );
  }, [sunData, earthData]);

  // Timeline Playback Animation
  useEffect(() => {
    if (!isPlaying) return;

    let animId;
    let lastT = performance.now();

    const loop = (t) => {
      const dt = (t - lastT) / 1000.0;
      lastT = t;
      const stepHours = dt * playbackSpeed * 1.5;
      const nextH = (activeHours + stepHours) % LUNAR_SYNODIC_HOURS;
      setHours(Number(nextH.toFixed(2)));
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed, activeHours, setHours]);

  // Mouse & Touch Drag Handlers
  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    setIsAutoPanning(false);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      yaw: targetCamRef.current.yaw,
      pitch: targetCamRef.current.pitch,
    };
    if (e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const sensitivity = 0.22 * (targetCamRef.current.fov / 70);
    const nextYaw = normalizeAngle360(dragStartRef.current.yaw - dx * sensitivity);
    const nextPitch = Math.max(-32, Math.min(74, dragStartRef.current.pitch + dy * sensitivity));

    targetCamRef.current.yaw = nextYaw;
    targetCamRef.current.pitch = nextPitch;
  };

  const handlePointerUp = (e) => {
    isDraggingRef.current = false;
    if (e.currentTarget.releasePointerCapture) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.05;
    const nextFov = Math.max(35, Math.min(85, targetCamRef.current.fov + zoomDelta));
    targetCamRef.current.fov = nextFov;
  };

  // Quick Camera Targeting Helpers
  const targetSun = () => {
    if (!sunData) return;
    setIsAutoPanning(false);
    targetCamRef.current.yaw = sunData.azimuth;
    targetCamRef.current.pitch = Math.max(-10, Math.min(50, sunData.elevation));
  };

  const targetEarth = () => {
    if (!earthData) return;
    setIsAutoPanning(false);
    targetCamRef.current.yaw = earthData.azimuth;
    targetCamRef.current.pitch = Math.max(-10, Math.min(50, earthData.elevation));
  };

  const resetNorth = () => {
    setIsAutoPanning(false);
    targetCamRef.current.yaw = 0;
    targetCamRef.current.pitch = 2;
    targetCamRef.current.fov = 70;
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Preset Timeline Contingencies (+3d, +7d, +14d)
  const presets = [
    { label: 'T+0 NOMINAL', hours: 0 },
    { label: '+3d (+72h)', hours: 72 },
    { label: '+7d (+168h)', hours: 168 },
    { label: '+14d (+336h)', hours: 336 },
  ];

  // Format UTC
  const baseEpochMs = new Date(baseDate).getTime();
  const currentEpochMs = baseEpochMs + activeHours * 3600 * 1000;
  const formattedUtc = new Date(currentEpochMs).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  // Dynamic Distance Numbers formatted cleanly
  const sunDistanceFormatted = sunData?.distanceKm
    ? sunData.distanceKm.toLocaleString()
    : '149,597,870';
  const earthDistanceFormatted = earthData?.distanceKm
    ? earthData.distanceKm.toLocaleString()
    : '384,400';

  // Compass tape ticks generation
  const compassTicks = useMemo(() => {
    const ticks = [];
    for (let deg = 0; deg < 360; deg += 10) {
      let label = `${deg}°`;
      let isCardinal = false;
      let isMajor = deg % 30 === 0;

      if (deg === 0) { label = 'N'; isCardinal = true; isMajor = true; }
      else if (deg === 90) { label = 'E'; isCardinal = true; isMajor = true; }
      else if (deg === 180) { label = 'S'; isCardinal = true; isMajor = true; }
      else if (deg === 270) { label = 'W'; isCardinal = true; isMajor = true; }

      ticks.push({ deg, label, isCardinal, isMajor });
    }
    return ticks;
  }, []);

  return (
    <section className="lunar-streetview-root" aria-label="Lunar Street View and Horizon Simulator">
      {/* 1. Header Toolbar */}
      <div className="streetview-top-toolbar">
        <div className="streetview-kicker-col">
          <div className="streetview-kicker-tag">
            <span className="pulse-dot" />
            <span>NASA JPL HORIZONS #301 · LOLA GDR 128PPD · FIRST-PERSON LUNAR VIEW</span>
          </div>
          <h2 className="streetview-title">
            Lunar Street View & Horizon Simulator // {activeSite.name}
          </h2>
        </div>

        {/* Site Quick Switcher */}
        <div className="streetview-site-selector-row" role="group" aria-label="Candidate Sites">
          {CANDIDATE_SITES_CATALOG.map((s) => {
            const isSelected = s.id === activeSite.id || s.siteId === activeSite.siteId || s.id === activeSite.siteId;
            return (
              <button
                key={s.id}
                type="button"
                className={`site-pill-btn ${isSelected ? 'is-active' : ''}`}
                onClick={() => onSelectSite?.(s)}
              >
                {s.name.replace(/ Crater Rim| Rim| Massif/g, '')}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 3D Viewport Shell */}
      <div
        ref={shellRef}
        className={`streetview-viewport-shell ${isFullscreen ? 'is-fullscreen' : ''}`}
      >
        {/* Three.js Canvas Mount */}
        <div
          ref={mountRef}
          className="streetview-canvas-mount"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        />

        {/* Visor Compass Heading Tape at Top */}
        <div className="visor-compass-strip">
          <div className="compass-tape-window">
            <div className="compass-center-indicator" />
            <div
              className="compass-tape-inner"
              style={{
                transform: `translateX(${160 - (cameraState.yaw / 10) * 36}px)`,
              }}
            >
              {/* Double loop for smooth 0-360 wrapping */}
              {compassTicks.concat(compassTicks).map((t, idx) => (
                <div
                  key={`${t.deg}-${idx}`}
                  className={`compass-tick ${t.isMajor ? 'is-major' : ''} ${t.isCardinal ? 'is-cardinal' : ''}`}
                >
                  <div className="compass-tick-mark" />
                  <span className="compass-tick-label">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="compass-bearing-badge">
            <span>AZ: <b>{String(Math.round(cameraState.yaw)).padStart(3, '0')}°</b></span>
            <span>TILT: <b>{cameraState.pitch >= 0 ? `+${cameraState.pitch.toFixed(1)}°` : `${cameraState.pitch.toFixed(1)}°`}</b></span>
            <span>FOV: <b>{Math.round(cameraState.fov)}°</b></span>
          </div>
        </div>

        {/* Center Crosshair / Visor Reticle */}
        <div className="visor-center-crosshair">
          <div className="crosshair-line h-left" />
          <div className="crosshair-line h-right" />
          <div className="crosshair-line v-top" />
          <div className="crosshair-line v-bottom" />
        </div>

        {/* 3. Floating 3D Projected Reticles for Sun & Earth */}
        {screenTargets.sun.inView && (
          <div
            className="celestial-reticle-box"
            style={{ left: `${screenTargets.sun.x}px`, top: `${screenTargets.sun.y}px` }}
            onClick={targetSun}
            title="Click to Lock Camera on Sun"
          >
            <div className="reticle-bracket">
              <span className="reticle-icon sun"><Sun size={12} /></span>
              <span className="reticle-tag">SUN [10]</span>
              <span className="reticle-metrics">
                EL {sunData.elevation >= 0 ? `+${sunData.elevation}°` : `${sunData.elevation}°`}
              </span>
              <span className={`reticle-margin-pill ${sunData.clearance > 0 ? 'clear' : 'occluded'}`}>
                {sunData.clearance > 0 ? 'LOS CLEAR' : 'OCCLUDED'}
              </span>
            </div>
          </div>
        )}

        {screenTargets.earth.inView && (
          <div
            className="celestial-reticle-box"
            style={{ left: `${screenTargets.earth.x}px`, top: `${screenTargets.earth.y}px` }}
            onClick={targetEarth}
            title="Click to Lock Camera on Earth"
          >
            <div className="reticle-bracket">
              <span className="reticle-icon earth"><Globe size={12} /></span>
              <span className="reticle-tag">EARTH [399]</span>
              <span className="reticle-metrics">
                EL {earthData.elevation >= 0 ? `+${earthData.elevation}°` : `${earthData.elevation}°`}
              </span>
              <span className={`reticle-margin-pill ${earthData.clearance > 0 ? 'clear' : 'occluded'}`}>
                {earthData.clearance > 0 ? 'DTE LOCK' : 'BLOCKED'}
              </span>
            </div>
          </div>
        )}

        {/* Off-screen guidance cues */}
        {!screenTargets.sun.inView && (
          <button
            type="button"
            className="offscreen-tracker-arrow"
            style={{
              top: '75px',
              left: screenTargets.sun.x < 100 ? '16px' : 'auto',
              right: screenTargets.sun.x >= 100 ? '16px' : 'auto',
            }}
            onClick={targetSun}
          >
            {screenTargets.sun.x < 100 ? <ChevronLeft size={12} /> : null}
            <span>SUN [10] // AZ {sunData.azimuth}°</span>
            {screenTargets.sun.x >= 100 ? <ChevronRight size={12} /> : null}
          </button>
        )}

        {!screenTargets.earth.inView && (
          <button
            type="button"
            className="offscreen-tracker-arrow"
            style={{
              top: '105px',
              left: screenTargets.earth.x < 100 ? '16px' : 'auto',
              right: screenTargets.earth.x >= 100 ? '16px' : 'auto',
            }}
            onClick={targetEarth}
          >
            {screenTargets.earth.x < 100 ? <ChevronLeft size={12} /> : null}
            <span>EARTH [399] // AZ {earthData.azimuth}°</span>
            {screenTargets.earth.x >= 100 ? <ChevronRight size={12} /> : null}
          </button>
        )}

        {/* 4. Bottom Viewport Controls Toolbar */}
        <div className="viewport-bottom-controls">
          <div className="viewport-btn-group">
            <button
              type="button"
              className="vp-btn"
              onClick={targetSun}
              title="Align Camera View with Sun (JPL ID 10)"
            >
              <Sun size={13} />
              <span>LOCK SUN</span>
            </button>
            <button
              type="button"
              className="vp-btn"
              onClick={targetEarth}
              title="Align Camera View with Earth (JPL ID 399)"
            >
              <Globe size={13} />
              <span>LOCK EARTH</span>
            </button>
            <button
              type="button"
              className="vp-btn"
              onClick={resetNorth}
              title="Reset Horizon View to True North (000°)"
            >
              <Compass size={13} />
              <span>NORTH (000°)</span>
            </button>
            <button
              type="button"
              className={`vp-btn ${isAutoPanning ? 'is-active' : ''}`}
              onClick={() => setIsAutoPanning(!isAutoPanning)}
              title="Toggle 360° Panoramic Horizon Auto-Sweep"
            >
              <RotateCcw size={13} />
              <span>360° SWEEP</span>
            </button>
          </div>

          <div className="viewport-btn-group">
            <button
              type="button"
              className={`vp-btn ${showLolaContour ? 'is-active' : ''}`}
              onClick={() => setShowLolaContour(!showLolaContour)}
              title="Toggle 3D LOLA Elevation Profile Radar Contour"
            >
              <Layers size={13} />
              <span>LOLA RADAR HUD</span>
            </button>
            <button
              type="button"
              className="vp-btn"
              onClick={toggleFullscreen}
              title="Toggle Fullscreen 3D View"
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isFullscreen ? 'EXIT' : 'FULLSCREEN'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Clean Unboxed Monospace Telemetry Grid (Zero Heavy UI) */}
      <div className="streetview-telemetry-grid">
        {/* Channel 1: Sun (JPL ID 10) */}
        <div className="telemetry-channel-col">
          <div className="telemetry-channel-header">
            <span className="channel-title">
              <Sun size={13} style={{ color: '#ffb14a' }} />
              <span>SOLAR EPHEMERIS</span>
            </span>
            <span className="channel-id-badge">JPL ID: 10</span>
          </div>

          <div className="telemetry-stat-row">
            <span className="stat-label">DISTANCE (KM):</span>
            <span className="stat-val highlight">{sunDistanceFormatted}<span className="stat-unit">KM</span></span>
          </div>
          <div className="telemetry-stat-row">
            <span className="stat-label">AZIMUTH / ELEVATION:</span>
            <span className="stat-val">{sunData.azimuth.toFixed(2)}° / {sunData.elevation >= 0 ? `+${sunData.elevation.toFixed(2)}°` : `${sunData.elevation.toFixed(2)}°`}</span>
          </div>
          <div className="telemetry-stat-row">
            <span className="stat-label">LOLA HORIZON CLEARANCE:</span>
            <span className={`stat-val ${sunData.clearance > 0 ? 'positive' : 'negative'}`}>
              {sunData.clearance > 0 ? `+${sunData.clearance.toFixed(2)}° [CLEAR]` : `${sunData.clearance.toFixed(2)}° [OCCLUDED]`}
            </span>
          </div>
          <div className="telemetry-stat-row">
            <span className="stat-label">DIRECT SOLAR FLUX:</span>
            <span className="stat-val amber">{sunData.directFluxW.toFixed(1)}<span className="stat-unit">W/M²</span></span>
          </div>
        </div>

        {/* Channel 2: Earth (JPL ID 399) */}
        <div className="telemetry-channel-col">
          <div className="telemetry-channel-header">
            <span className="channel-title">
              <Globe size={13} style={{ color: '#5ce1e6' }} />
              <span>EARTH VECTOR & DTE</span>
            </span>
            <span className="channel-id-badge">JPL ID: 399</span>
          </div>

          <div className="telemetry-stat-row">
            <span className="stat-label">DISTANCE (KM):</span>
            <span className="stat-val highlight">{earthDistanceFormatted}<span className="stat-unit">KM</span></span>
          </div>
          <div className="telemetry-stat-row">
            <span className="stat-label">AZIMUTH / ELEVATION:</span>
            <span className="stat-val">{earthData.azimuth.toFixed(2)}° / {earthData.elevation >= 0 ? `+${earthData.elevation.toFixed(2)}°` : `${earthData.elevation.toFixed(2)}°`}</span>
          </div>
          <div className="telemetry-stat-row">
            <span className="stat-label">LOLA HORIZON CLEARANCE:</span>
            <span className={`stat-val ${earthData.clearance > 0 ? 'positive' : 'negative'}`}>
              {earthData.clearance > 0 ? `+${earthData.clearance.toFixed(2)}° [DIRECT LOS]` : `${earthData.clearance.toFixed(2)}° [SHADOWED]`}
            </span>
          </div>
          <div className="telemetry-stat-row">
            <span className="stat-label">PHASE / DTE STATUS:</span>
            <span className="stat-val">{earthData.phaseFraction ? `${Math.round(earthData.phaseFraction * 100)}% ${earthData.phaseName.toUpperCase()}` : 'LOCKED'}</span>
          </div>
        </div>

        {/* Channel 3: Lunar Observer Station */}
        <div className="telemetry-channel-col">
          <div className="telemetry-channel-header">
            <span className="channel-title">
              <Crosshair size={13} style={{ color: '#8f9cff' }} />
              <span>OBSERVER STATION</span>
            </span>
            <span className="channel-id-badge">SELENO #301</span>
          </div>

          <div className="telemetry-stat-row">
            <span className="stat-label">TOPOGRAPHIC SITE:</span>
            <span className="stat-val">{activeSite.name}</span>
          </div>
          <div className="telemetry-stat-row">
            <span className="stat-label">LAT / LON:</span>
            <span className="stat-val">{Math.abs(latitude).toFixed(3)}° {latitude < 0 ? 'S' : 'N'} / {Math.abs(longitude).toFixed(3)}° {longitude < 0 ? 'W' : 'E'}</span>
          </div>
          <div className="telemetry-stat-row">
            <span className="stat-label">ELEVATION (DATUM):</span>
            <span className="stat-val">+{elevation.toLocaleString()}<span className="stat-unit">M</span></span>
          </div>
          <div className="telemetry-stat-row">
            <span className="stat-label">CAMERA HEIGHT:</span>
            <span className="stat-val highlight">+1.80<span className="stat-unit">M [ASTRONAUT VISOR]</span></span>
          </div>
        </div>
      </div>

      {/* 4. Interactive Simulation Timeline Scrubber */}
      <div className="streetview-timeline-bar" aria-label="Interactive Ephemeris Time Scrubber">
        <div className="timeline-ctrl-row">
          <div className="timeline-playback-group">
            <button
              type="button"
              className="playback-btn"
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause Simulation' : 'Play Ephemeris Propagation'}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              type="button"
              className="playback-btn"
              onClick={() => { setIsPlaying(false); setHours(0); }}
              title="Reset Timeline to T+0"
            >
              <RotateCcw size={14} />
            </button>
            <select
              className="playback-speed-select"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              aria-label="Simulation Playback Speed"
            >
              <option value="1">1 HR / SEC</option>
              <option value="6">6 HR / SEC</option>
              <option value="24">24 HR / SEC (1D/S)</option>
              <option value="72">72 HR / SEC (3D/S)</option>
            </select>
          </div>

          {/* Contingency Presets (+3d, +7d, +14d) */}
          <div className="timeline-preset-pills" role="group" aria-label="Schedule Contingency Presets">
            {presets.map((p) => {
              const isActive = Math.abs(activeHours - p.hours) < 0.8;
              return (
                <button
                  key={p.label}
                  type="button"
                  className={`preset-pill ${isActive ? 'is-active' : ''}`}
                  onClick={() => {
                    setIsPlaying(false);
                    setHours(p.hours);
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Range Scrubber Slider */}
        <input
          type="range"
          className="timeline-slider-track"
          min="0"
          max={Number(LUNAR_SYNODIC_HOURS.toFixed(1))}
          step="0.5"
          value={activeHours}
          onChange={(e) => {
            setIsPlaying(false);
            setHours(Number(e.target.value));
          }}
          aria-label="Scrub Mission Timeline"
        />

        <div className="timeline-footer-row">
          <span>MISSION EPOCH: <b>{formattedUtc}</b></span>
          <span>CYCLE PROGRESS: <b>+{(activeHours / 24.0).toFixed(1)}d ({activeHours.toFixed(1)}h) / {((activeHours / LUNAR_SYNODIC_HOURS) * 100).toFixed(1)}% LUNAR SYNODIC DAY</b></span>
        </div>
      </div>
    </section>
  );
}
