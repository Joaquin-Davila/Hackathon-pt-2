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
  create3DRouteLine,
} from './lunarTerrain.js';

import {
  createCelestialSystem,
  updateCelestialVectors,
  projectToScreen,
} from './lunarCelestial.js';

import {
  evaluateMissionFeasibility,
  generateSmartWarnings,
  recommendOptimalAlternative,
} from '../../../services/recommendationEngine.js';

import { CANDIDATE_SITES_CATALOG } from '../../../services/horizonsService.js';
import '../../../styles/streetview.css';

// Preset Timeline Contingencies (+3d, +7d, +14d)
const TIMELINE_PRESETS = [
  { label: 'T+0 NOMINAL', hours: 0 },
  { label: '+3d (+72h)', hours: 72 },
  { label: '+7d (+168h)', hours: 168 },
  { label: '+14d (+336h)', hours: 336 },
];

/**
 * Isolated 60 FPS Timeline Bar component.
 * Separates high-frequency timeOffset/epoch scrubber state from heavy 3D/chart parent components,
 * driving WebGL vectors imperatively at 60 FPS while debouncing/throttling heavy React state commits.
 */
const StreetViewTimelineBar = React.memo(function StreetViewTimelineBar({
  externalHours = 0,
  baseDate = DEFAULT_MISSION_EPOCH,
  onFastTick,
  onCommitHours,
}) {
  const [localHours, setLocalHours] = useState(externalHours);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(6); // 1 = 1h/s, 6 = 6h/s, 24 = 24h/s, 72 = 72h/s

  // Refs for 60 FPS animation loop & timer cleanup without memory leaks or dependency churn
  const hoursRef = useRef(externalHours);
  const speedRef = useRef(playbackSpeed);
  const isPlayingRef = useRef(isPlaying);
  const rafRef = useRef(null);
  const lastFrameTimeRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const lastCommitTimeRef = useRef(0);
  const onFastTickRef = useRef(onFastTick);
  const onCommitHoursRef = useRef(onCommitHours);

  useEffect(() => {
    onFastTickRef.current = onFastTick;
    onCommitHoursRef.current = onCommitHours;
  }, [onFastTick, onCommitHours]);

  useEffect(() => {
    speedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Sync external hours when not actively playing
  useEffect(() => {
    if (!isPlayingRef.current && Math.abs(hoursRef.current - externalHours) > 0.05) {
      hoursRef.current = externalHours;
      setLocalHours(externalHours);
    }
  }, [externalHours]);

  // Debounced / Throttled commit helper for heavy parent components
  const scheduleParentCommit = useCallback((nextHours, immediate = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (immediate) {
      lastCommitTimeRef.current = performance.now();
      onCommitHoursRef.current?.(nextHours);
      return;
    }

    const now = performance.now();
    // During playback, throttle heavy React state commits to ~220ms while 3D WebGL runs at 60 FPS
    if (isPlayingRef.current && now - lastCommitTimeRef.current >= 220) {
      lastCommitTimeRef.current = now;
      onCommitHoursRef.current?.(nextHours);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      lastCommitTimeRef.current = performance.now();
      onCommitHoursRef.current?.(nextHours);
      debounceTimerRef.current = null;
    }, 120);
  }, []);

  // Controlled 60 FPS requestAnimationFrame playback loop via useRef
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastFrameTimeRef.current = null;
      return;
    }

    lastFrameTimeRef.current = performance.now();

    const tick = (now) => {
      const dtSec = Math.min(0.1, Math.max(0, (now - (lastFrameTimeRef.current ?? now)) / 1000.0));
      lastFrameTimeRef.current = now;

      // Exact hours progression based on selected speed ("6 HR / SEC" = 6 hours per real second)
      const nextHours = (hoursRef.current + dtSec * speedRef.current) % LUNAR_SYNODIC_HOURS;
      const roundedHours = Number(nextHours.toFixed(2));
      hoursRef.current = nextHours;

      // 1. Imperative 60 FPS update to 3D celestial vectors (zero parent re-render)
      onFastTickRef.current?.(roundedHours);

      // 2. Update isolated timeline scrubber UI state
      setLocalHours(roundedHours);

      // 3. Throttled/debounced update to heavy parent telemetry & charts
      scheduleParentCommit(roundedHours, false);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, scheduleParentCommit]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  const handleTogglePlay = () => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (!next) {
        // Flush final hours to parent immediately when pausing
        scheduleParentCommit(Number(hoursRef.current.toFixed(2)), true);
      }
      return next;
    });
  };

  const handleJumpToHours = (targetHours, immediate = true) => {
    setIsPlaying(false);
    hoursRef.current = targetHours;
    setLocalHours(targetHours);
    onFastTickRef.current?.(targetHours);
    scheduleParentCommit(targetHours, immediate);
  };

  const baseEpochMs = useMemo(() => new Date(baseDate).getTime(), [baseDate]);
  const currentEpochMs = baseEpochMs + localHours * 3600 * 1000;
  const formattedUtc = new Date(currentEpochMs).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  return (
    <div className="streetview-timeline-bar" aria-label="Interactive Ephemeris Time Scrubber">
      <div className="timeline-ctrl-row">
        <div className="timeline-playback-group">
          <button
            type="button"
            className="playback-btn"
            onClick={handleTogglePlay}
            title={isPlaying ? 'Pause Simulation' : 'Play Ephemeris Propagation'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            type="button"
            className="playback-btn"
            onClick={() => handleJumpToHours(0, true)}
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
          {TIMELINE_PRESETS.map((p) => {
            const isActive = Math.abs(localHours - p.hours) < 0.8;
            return (
              <button
                key={p.label}
                type="button"
                className={`preset-pill ${isActive ? 'is-active' : ''}`}
                onClick={() => handleJumpToHours(p.hours, true)}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Range Scrubber Slider (60 FPS local scrub + debounced parent commit) */}
      <input
        type="range"
        className="timeline-slider-track"
        min="0"
        max={Number(LUNAR_SYNODIC_HOURS.toFixed(1))}
        step="0.25"
        value={localHours}
        onChange={(e) => {
          const val = Number(e.target.value);
          handleJumpToHours(val, false);
        }}
        onPointerUp={() => scheduleParentCommit(Number(hoursRef.current.toFixed(2)), true)}
        onKeyUp={() => scheduleParentCommit(Number(hoursRef.current.toFixed(2)), true)}
        aria-label="Scrub Mission Timeline"
      />

      <div className="timeline-footer-row">
        <span>MISSION EPOCH: <b>{formattedUtc}</b></span>
        <span>
          CYCLE PROGRESS: <b>+{(localHours / 24.0).toFixed(1)}d ({localHours.toFixed(1)}h) / {((localHours / LUNAR_SYNODIC_HOURS) * 100).toFixed(1)}% LUNAR SYNODIC DAY</b>
        </span>
      </div>
    </div>
  );
});

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

  // Committed simulation timeline state (debounced/throttled from 60 FPS scrubber)
  const [internalHours, setInternalHours] = useState(hoursOffset);
  const activeHours = onChangeHoursOffset ? hoursOffset : internalHours;
  const setHours = onChangeHoursOffset || setInternalHours;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLolaContour, setShowLolaContour] = useState(true);
  const [isAutoPanning, setIsAutoPanning] = useState(false);
  const isAutoPanningRef = useRef(isAutoPanning);
  useEffect(() => {
    isAutoPanningRef.current = isAutoPanning;
  }, [isAutoPanning]);

  // Camera orientation state (degrees)
  // Yaw: 0° = North (-Z), 90° = East (+X), 180° = South (+Z), 270° = West (-X)
  // Pitch: -35° (down to boots/ground) to +75° (up into sky)
  const [cameraState, setCameraState] = useState({ yaw: 74, pitch: 4, fov: 70 });
  const targetCamRef = useRef({ yaw: 74, pitch: 4, fov: 70 });
  const liveCamRef = useRef({ yaw: 74, pitch: 4, fov: 70 });
  const lastCamStateRef = useRef({ yaw: 74, pitch: 4, fov: 70 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, yaw: 0, pitch: 0 });

  // On-screen projected celestial & route callout markers
  const [screenTargets, setScreenTargets] = useState({
    sun: { x: 0, y: 0, inFront: false, inView: false, angleDeg: 0 },
    earth: { x: 0, y: 0, inFront: false, inView: false, angleDeg: 0 },
    route: { x: 0, y: 0, inFront: false, inView: false, angleDeg: 0 },
  });
  const lastScreenTargetsRef = useRef(null);

  // Reference to 3D scene elements
  const threeRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    celestial: null,
    horizonMesh: null,
    contourLine: null,
    routeLine: null,
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

  // Real-time Ephemeris Evaluation (on committed hours)
  const telemetry = useMemo(() => {
    return evaluateSiteTelemetry(activeSite, horizonProfile, activeHours, new Date(baseDate));
  }, [activeSite, horizonProfile, activeHours, baseDate]);

  // Spatial AI Route Recommendation (runs only on committed hours, never on 60 FPS micro-ticks)
  const recommendation = useMemo(() => {
    return recommendOptimalAlternative(activeSite, horizonProfile, activeHours, 336, new Date(baseDate));
  }, [activeSite, horizonProfile, activeHours, baseDate]);

  // Imperative 60 FPS handler for updating Three.js Sun & Earth vectors without React re-renders
  const handleFastTick = useCallback(
    (fastHours) => {
      const { celestial } = threeRef.current;
      if (!celestial) return;
      const fastTelemetry = evaluateSiteTelemetry(activeSite, horizonProfile, fastHours, new Date(baseDate));
      updateCelestialVectors(
        celestial,
        fastTelemetry.sun,
        fastTelemetry.earth,
        fastTelemetry.sun.clearance,
        fastTelemetry.earth.clearance,
        1400
      );
    },
    [activeSite, horizonProfile, baseDate]
  );

  const routeTargetVecRef = useRef(new THREE.Vector3(0, 20, -2400));
  useEffect(() => {
    if (!recommendation) return;
    const azRad = (recommendation.bearing * Math.PI) / 180.0;
    const elevDeg = recommendation.horizonCrestDeg ?? 1.5;
    const elevRad = (elevDeg * Math.PI) / 180.0;
    const r = 2400;
    const x = r * Math.sin(azRad);
    const y = 1.8 + r * Math.tan(elevRad) + 8.0;
    const z = -r * Math.cos(azRad);
    routeTargetVecRef.current.set(x, y, z);
  }, [recommendation]);

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

  // Update 3D Traverse Route Line along recommended ridge bearing
  useEffect(() => {
    const { scene } = threeRef.current;
    if (!scene) return;

    if (threeRef.current.routeLine) {
      scene.remove(threeRef.current.routeLine);
      threeRef.current.routeLine.geometry?.dispose();
      threeRef.current.routeLine.material?.dispose();
      threeRef.current.routeLine = null;
    }

    if (recommendation && Number.isFinite(recommendation.bearing)) {
      const routeLine = create3DRouteLine(recommendation.bearing, 140);
      routeLine.visible = showLolaContour;
      scene.add(routeLine);
      threeRef.current.routeLine = routeLine;
    }
  }, [recommendation, showLolaContour]);

  // Toggle LOLA Contour visibility
  useEffect(() => {
    if (threeRef.current.contourLine) {
      threeRef.current.contourLine.visible = showLolaContour;
    }
    if (threeRef.current.routeLine) {
      threeRef.current.routeLine.visible = showLolaContour;
    }
  }, [showLolaContour]);

  // Main Animation Render Loop (Controlled via useRef, zero dependency churn)
  useEffect(() => {
    const { scene, camera, renderer, celestial, beaconLed } = threeRef.current;
    if (!scene || !camera || !renderer || !celestial) return;

    let lastTime = performance.now();

    const renderLoop = (time) => {
      const deltaSec = Math.min(0.1, (time - lastTime) / 1000.0);
      lastTime = time;

      // 1. Interactive Camera Damping & Auto-Panning
      if (isAutoPanningRef.current) {
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

      if (Math.abs(camera.fov - cur.fov) > 0.05) {
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

      // 3. Project 3D Celestial Targets to Screen for HUD (update React state only when delta > 0.5px)
      const width = renderer.domElement.clientWidth || 800;
      const height = renderer.domElement.clientHeight || 520;

      const sunPos = celestial.sunGroup.position;
      const earthPos = celestial.earthGroup.position;

      const sunProj = projectToScreen(sunPos, camera, width, height);
      const earthProj = projectToScreen(earthPos, camera, width, height);
      const routeProj = projectToScreen(routeTargetVecRef.current, camera, width, height);

      const prevTargets = lastScreenTargetsRef.current;
      const hasTargetsMoved =
        !prevTargets ||
        prevTargets.sun.inView !== sunProj.inView ||
        prevTargets.earth.inView !== earthProj.inView ||
        prevTargets.route.inView !== routeProj.inView ||
        Math.abs(prevTargets.sun.x - sunProj.x) > 0.6 ||
        Math.abs(prevTargets.sun.y - sunProj.y) > 0.6 ||
        Math.abs(prevTargets.earth.x - earthProj.x) > 0.6 ||
        Math.abs(prevTargets.earth.y - earthProj.y) > 0.6 ||
        Math.abs(prevTargets.route.x - routeProj.x) > 0.6 ||
        Math.abs(prevTargets.route.y - routeProj.y) > 0.6;

      if (hasTargetsMoved) {
        const nextTargets = { sun: sunProj, earth: earthProj, route: routeProj };
        lastScreenTargetsRef.current = nextTargets;
        setScreenTargets(nextTargets);
      }

      // Update camera readout state throttled via ref comparison
      const lastCam = lastCamStateRef.current;
      if (
        Math.abs(lastCam.yaw - cur.yaw) > 0.4 ||
        Math.abs(lastCam.pitch - cur.pitch) > 0.4 ||
        Math.abs(lastCam.fov - cur.fov) > 0.4
      ) {
        const nextCam = {
          yaw: Number(cur.yaw.toFixed(1)),
          pitch: Number(cur.pitch.toFixed(1)),
          fov: Number(cur.fov.toFixed(1)),
        };
        lastCamStateRef.current = nextCam;
        setCameraState(nextCam);
      }

      // Render Three.js Scene
      renderer.render(scene, camera);

      threeRef.current.animFrame = requestAnimationFrame(renderLoop);
    };

    threeRef.current.animFrame = requestAnimationFrame(renderLoop);

    return () => {
      if (threeRef.current.animFrame) {
        cancelAnimationFrame(threeRef.current.animFrame);
        threeRef.current.animFrame = null;
      }
    };
  }, []);

  // Update Ephemeris Vectors in 3D Scene when committed telemetry changes
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

  const targetRoute = () => {
    if (!recommendation) return;
    setIsAutoPanning(false);
    targetCamRef.current.yaw = recommendation.bearing;
    targetCamRef.current.pitch = Math.max(-4, Math.min(20, (recommendation.horizonCrestDeg ?? 1.5) + 1.5));
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
            <span>360° TOPOGRAPHIC HORIZON VISOR // LRO LOLA DEM (+1.80M EYE HEIGHT)</span>
          </div>
        </div>

        {/* Site Quick Switcher */}
        <div className="streetview-site-selector-row" role="group" aria-label="Candidate Sites">
          {CANDIDATE_SITES_CATALOG.map((s) => {
            const isSelected =
              s.id === activeSite.id ||
              (Boolean(activeSite.siteId) && (s.id === activeSite.siteId || s.defaultHorizon === activeSite.siteId));
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
            <span>VIEW AZ: <b>{String(Math.round(cameraState.yaw)).padStart(3, '0')}°</b></span>
            <span>PITCH: <b>{cameraState.pitch >= 0 ? `+${cameraState.pitch.toFixed(1)}°` : `${cameraState.pitch.toFixed(1)}°`}</b></span>
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

        {/* Minimalist Callout Line & Unboxed Smart-Guidance Badge on 3D Horizon Crest */}
        {recommendation && screenTargets.route.inView && (
          <div
            className="horizon-route-callout"
            style={{ left: `${screenTargets.route.x}px`, top: `${screenTargets.route.y}px` }}
            onClick={() => onSelectSite?.(recommendation.recommendedSite)}
            title={`Click to relocate to ${recommendation.recommendedSite.name}`}
          >
            <svg className="route-callout-svg" width="160" height="68" viewBox="0 0 160 68" aria-hidden="true">
              <circle cx="6" cy="62" r="3.5" fill="#5ce1e6" />
              <circle cx="6" cy="62" r="7" fill="none" stroke="rgba(92, 225, 230, 0.45)" strokeWidth="1" />
              <polyline
                points="6,62 28,22 156,22"
                fill="none"
                stroke="rgba(92, 225, 230, 0.75)"
                strokeWidth="1"
              />
            </svg>
            <div className="route-callout-unboxed-meta">
              <span className="route-callout-kicker">
                BACKUP ROUTE // {recommendation.distKm} KM
              </span>
              <span className="route-callout-title">
                {recommendation.recommendedSite.name.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* 3. Minimal 3D Projected Reticles for Sun & Earth (No Repeated Telemetry Numbers) */}
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
            <span>SUN [10]</span>
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
            <span>EARTH [399]</span>
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
            {recommendation && (
              <button
                type="button"
                className="vp-btn"
                onClick={targetRoute}
                title={`Align Camera View with Recommended Route to ${recommendation.recommendedSite.name}`}
              >
                <Sparkles size={13} />
                <span>LOCK ROUTE</span>
              </button>
            )}
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

      {/* 3. Isolated 60 FPS Simulation Timeline Scrubber */}
      <StreetViewTimelineBar
        externalHours={activeHours}
        baseDate={baseDate}
        onFastTick={handleFastTick}
        onCommitHours={setHours}
      />
    </section>
  );
}
