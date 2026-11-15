import * as THREE from 'three';
import {
  createEarthTexture,
  createSunTexture,
  createStarfieldGeometry,
} from './lunarTextures.js';

export function createCelestialSystem(scene) {
  // 1. Starfield
  const starGeo = createStarfieldGeometry(3200, 10000);
  const starMat = new THREE.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: false,
  });
  const starfield = new THREE.Points(starGeo, starMat);
  scene.add(starfield);

  // 2. High-Intensity Directional Light (Sun)
  const sunLight = new THREE.DirectionalLight(0xffffff, 3.0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 1200;
  sunLight.shadow.camera.left = -50;
  sunLight.shadow.camera.right = 50;
  sunLight.shadow.camera.top = 50;
  sunLight.shadow.camera.bottom = -50;
  sunLight.shadow.bias = -0.0008;
  scene.add(sunLight);

  // Faint ambient light (lunar regolith scattered starlight & earthshine)
  const ambientLight = new THREE.AmbientLight(0x10141e, 0.25);
  scene.add(ambientLight);

  // Earthshine subtle fill light
  const earthshineLight = new THREE.DirectionalLight(0x2d4868, 0.0);
  scene.add(earthshineLight);

  // 3. Sun Visual Disk & Corona
  const sunGroup = new THREE.Group();
  const sunTexture = createSunTexture();

  // Core blinding disk
  const sunCoreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  const sunCoreMesh = new THREE.Mesh(new THREE.SphereGeometry(18, 32, 32), sunCoreMat);
  sunGroup.add(sunCoreMesh);

  // Radiating Corona Flare Sprite
  if (sunTexture) {
    const sunSpriteMat = new THREE.SpriteMaterial({
      map: sunTexture,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sunSprite = new THREE.Sprite(sunSpriteMat);
    sunSprite.scale.set(160, 160, 1.0);
    sunGroup.add(sunSprite);

    // Wide horizontal diffraction spike
    const flareSpriteMat = new THREE.SpriteMaterial({
      map: sunTexture,
      color: 0xe6f2ff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.75,
    });
    const flareSprite = new THREE.Sprite(flareSpriteMat);
    flareSprite.scale.set(520, 24, 1.0);
    sunGroup.add(flareSprite);
  }
  scene.add(sunGroup);

  // 4. Earth Sphere (JPL ID 399)
  const earthGroup = new THREE.Group();
  const earthTexture = createEarthTexture();

  // Base Earth Sphere (radius = 16m at 1400m distance subtends ~1.3°, matching real lunar view)
  const earthMat = new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 0.85,
    metalness: 0.1,
    bumpScale: 0.05,
  });
  const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(16, 64, 48), earthMat);
  earthGroup.add(earthMesh);

  // Atmospheric Blue Rayleigh Limb Glow (Soft Halo)
  const atmosphereGeo = new THREE.SphereGeometry(16.8, 48, 32);
  const atmosphereMat = new THREE.MeshBasicMaterial({
    color: 0x4fa8ff,
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
  const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
  earthGroup.add(atmosphereMesh);

  scene.add(earthGroup);

  return {
    sunLight,
    ambientLight,
    earthshineLight,
    sunGroup,
    earthGroup,
    earthMesh,
    starfield,
  };
}

/**
 * Updates positions and lighting of Sun & Earth based on Ephemeris angles
 */
export function updateCelestialVectors(
  celestial,
  sunVec,
  earthVec,
  sunClearance = 1.0,
  earthClearance = 1.0,
  skyDistance = 1400
) {
  if (!celestial || !sunVec || !earthVec) return;

  const { sunLight, earthshineLight, sunGroup, earthGroup, earthMesh } = celestial;

  // 1. Position Sun in 3D Sky
  // Azimuth 0° = North (-Z), 90° = East (+X), 180° = South (+Z), 270° = West (-X)
  const sunAzRad = (sunVec.azimuth * Math.PI) / 180.0;
  const sunElRad = (sunVec.elevation * Math.PI) / 180.0;

  const cosSunEl = Math.cos(sunElRad);
  const sunX = skyDistance * cosSunEl * Math.sin(sunAzRad);
  const sunY = 1.8 + skyDistance * Math.sin(sunElRad);
  const sunZ = -skyDistance * cosSunEl * Math.cos(sunAzRad);

  sunGroup.position.set(sunX, sunY, sunZ);

  // Directional Light originates from the Sun direction
  const lightDist = 400;
  sunLight.position.set(
    lightDist * cosSunEl * Math.sin(sunAzRad),
    Math.max(2.0, 1.8 + lightDist * Math.sin(sunElRad)),
    -lightDist * cosSunEl * Math.cos(sunAzRad)
  );
  sunLight.target.position.set(0, 1.8, 0);
  sunLight.target.updateMatrixWorld();

  // If Sun is below local LOLA terrain crest (occulted by crater mountain rim),
  // smoothly extinguish direct sunlight.
  const isSunVisible = sunClearance > 0 && sunVec.elevation > -0.5;
  if (isSunVisible) {
    const marginRatio = Math.min(1.0, Math.max(0.0, sunClearance / 0.4));
    sunLight.intensity = 3.2 * marginRatio;
    sunGroup.visible = true;
  } else {
    sunLight.intensity = 0.0;
    // When Sun is slightly below rim, keep the corona glow visible if near crest
    sunGroup.visible = sunClearance > -1.2;
  }

  // 2. Position Earth in 3D Sky
  const earthAzRad = (earthVec.azimuth * Math.PI) / 180.0;
  const earthElRad = (earthVec.elevation * Math.PI) / 180.0;

  const cosEarthEl = Math.cos(earthElRad);
  const earthX = skyDistance * cosEarthEl * Math.sin(earthAzRad);
  const earthY = 1.8 + skyDistance * Math.sin(earthElRad);
  const earthZ = -skyDistance * cosEarthEl * Math.cos(earthAzRad);

  earthGroup.position.set(earthX, earthY, earthZ);

  // Rotate Earth sphere to orient its polar axis and face observer
  earthGroup.lookAt(0, 1.8, 0);

  // Earthshine illumination on lunar regolith
  const isEarthVisible = earthClearance > 0 && earthVec.elevation > 0;
  if (isEarthVisible) {
    earthshineLight.intensity = 0.18;
    earthshineLight.position.set(earthX, earthY, earthZ);
    earthshineLight.target.position.set(0, 1.8, 0);
    earthGroup.visible = true;
  } else {
    earthshineLight.intensity = 0.0;
    earthGroup.visible = earthClearance > -1.5;
  }
}

/**
 * Projects 3D Celestial position into 2D Screen Space
 * Returns { x, y, visible, inView, angleDeg }
 */
export function projectToScreen(vector3, camera, width, height) {
  const clone = vector3.clone();
  clone.project(camera);

  // Behind camera?
  const inFront = clone.z < 1.0;

  const screenX = (clone.x * 0.5 + 0.5) * width;
  const screenY = (-(clone.y * 0.5) + 0.5) * height;

  const inView = inFront && screenX >= 20 && screenX <= width - 20 && screenY >= 20 && screenY <= height - 20;

  // Bearing angle from center of screen (for directional guidance arrow)
  const dx = screenX - width / 2;
  const dy = screenY - height / 2;
  const angleRad = Math.atan2(dy, dx);
  const angleDeg = (angleRad * 180.0) / Math.PI;

  return {
    x: Math.round(screenX),
    y: Math.round(screenY),
    inFront,
    inView,
    angleDeg,
  };
}
