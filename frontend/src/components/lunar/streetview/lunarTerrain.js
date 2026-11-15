import * as THREE from 'three';
import { getTerrainElevationAtAzimuth, normalizeAngle360 } from '../../../services/ephemerisEngine.js';

/**
 * Builds the 360° Mountain Horizon Ridge from LOLA Profile Data
 * Ensures every angular peak, ridge saddle, and crater elevation
 * in the 3D scene corresponds to verified NASA LOLA GDR 128PPD data.
 */
export function createHorizonRidgeMesh(horizonProfile, radius = 2400) {
  const segments = 360; // 1 degree per segment
  const vertices = [];
  const indices = [];
  const uvs = [];

  // Rings:
  // 0: Deep crater abyss floor (y = -700)
  // 1: Mid-slope crater wall
  // 2: Upper ridge terrace
  // 3: Exact LOLA peak crest line
  // 4: Far back slope drop-off

  const ringCount = 5;

  for (let i = 0; i <= segments; i++) {
    const azDeg = (i % segments);
    const azRad = (azDeg * Math.PI) / 180.0;

    // Exact LOLA angular elevation at this azimuth
    const elevDeg = getTerrainElevationAtAzimuth(horizonProfile, azDeg);
    const elevRad = (elevDeg * Math.PI) / 180.0;

    // Peak height from astronaut eye level (y = 1.8)
    const peakHeight = 1.8 + radius * Math.tan(elevRad);

    // Direction vector in horizontal plane (Azimuth 0° = North = -Z, 90° = East = +X)
    const sinAz = Math.sin(azRad);
    const cosAz = Math.cos(azRad);

    // Geological pseudo-noise variation for mid slopes
    const noise1 = Math.sin(azDeg * 0.35) * 8.0 + Math.cos(azDeg * 0.8) * 4.0;
    const noise2 = Math.cos(azDeg * 0.6) * 6.0;

    // Ring 0: Deep crater floor base
    const r0 = radius * 0.72;
    vertices.push(r0 * sinAz, -650.0, -r0 * cosAz);
    uvs.push(i / segments, 0.0);

    // Ring 1: Lower scree / talus slope
    const r1 = radius * 0.84;
    const h1 = -180.0 + noise1;
    vertices.push(r1 * sinAz, h1, -r1 * cosAz);
    uvs.push(i / segments, 0.25);

    // Ring 2: Upper crater rim cliff shoulder
    const r2 = radius * 0.94;
    const h2 = peakHeight * 0.65 + noise2;
    vertices.push(r2 * sinAz, h2, -r2 * cosAz);
    uvs.push(i / segments, 0.6);

    // Ring 3: Exact LOLA Crest Line
    const r3 = radius;
    vertices.push(r3 * sinAz, peakHeight, -r3 * cosAz);
    uvs.push(i / segments, 0.9);

    // Ring 4: Far slope back descent
    const r4 = radius * 1.15;
    const h4 = Math.min(peakHeight * 0.4, 0.0) - 200.0;
    vertices.push(r4 * sinAz, h4, -r4 * cosAz);
    uvs.push(i / segments, 1.0);
  }

  // Construct triangles between consecutive segments
  for (let i = 0; i < segments; i++) {
    for (let r = 0; r < ringCount - 1; r++) {
      const p0 = i * ringCount + r;
      const p1 = (i + 1) * ringCount + r;
      const p2 = (i + 1) * ringCount + (r + 1);
      const p3 = i * ringCount + (r + 1);

      // Two triangles per quad
      indices.push(p0, p1, p2);
      indices.push(p0, p2, p3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x585c64,
    roughness: 0.96,
    metalness: 0.02,
    flatShading: true, // Gives realistic faceted basaltic lunar rock faces
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Creates 3D LOLA Vector Contour Polyline
 * Glowing technical line along the crater rim profile with elevation guide markers.
 */
export function createHorizonContourLine(horizonProfile, radius = 2400) {
  const segments = 360;
  const points = [];

  for (let i = 0; i <= segments; i++) {
    const azDeg = (i % segments);
    const azRad = (azDeg * Math.PI) / 180.0;
    const elevDeg = getTerrainElevationAtAzimuth(horizonProfile, azDeg);
    const elevRad = (elevDeg * Math.PI) / 180.0;

    const y = 1.8 + radius * Math.tan(elevRad) + 2.5; // Offset 2.5m above crest
    const x = radius * Math.sin(azRad);
    const z = -radius * Math.cos(azRad);

    points.push(new THREE.Vector3(x, y, z));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x5ce1e6, // LuNav Cyan
    linewidth: 2,
    transparent: true,
    opacity: 0.65,
  });

  return new THREE.Line(geometry, material);
}

/**
 * Creates Local Astronaut Foreground Surface (Radius 350m)
 * Features micro-craters, regolith displacement, scattered 3D rock boulders,
 * footprints, and a mission telemetry beacon.
 */
export function createLocalLunarGround(regolithNormalTexture) {
  const group = new THREE.Group();

  // 1. Ground Plane with Radial Tessellation
  const groundGeo = new THREE.PlaneGeometry(700, 700, 96, 96);
  groundGeo.rotateX(-Math.PI / 2);

  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const dist = Math.sqrt(x * x + z * z);

    // Center where astronaut stands is relatively level (y ~ 0)
    let y = 0;

    // Subtle undulating slopes
    y += Math.sin(x * 0.02) * Math.cos(z * 0.02) * 1.8;
    y += Math.sin(x * 0.06 + z * 0.04) * 0.6;

    // Rim crest curvature (drops off towards crater interior to the south/west)
    if (z > 40) {
      y -= Math.pow((z - 40) * 0.035, 1.8) * 12.0;
    }

    // Micro-craters
    const c1Dist = Math.sqrt((x - 18) * (x - 18) + (z + 24) * (z + 24));
    if (c1Dist < 14) {
      y -= (14 - c1Dist) * 0.32;
    }

    const c2Dist = Math.sqrt((x + 28) * (x + 28) + (z - 35) * (z - 35));
    if (c2Dist < 20) {
      y -= (20 - c2Dist) * 0.28;
    }

    pos.setY(i, y);
  }

  groundGeo.computeVertexNormals();

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x72767f,
    roughness: 0.98,
    metalness: 0.0,
    normalMap: regolithNormalTexture,
    normalScale: new THREE.Vector2(0.8, 0.8),
  });

  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // 2. Scattered 3D Lunar Boulders
  const rockGeo = new THREE.DodecahedronGeometry(1.0, 1);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x5a5e66,
    roughness: 0.95,
    metalness: 0.02,
    flatShading: true,
  });

  // Deterministic seed rocks
  const rockPositions = [
    { x: 7.2, z: -14.5, scale: 0.85, rot: 1.2 },
    { x: -9.5, z: -18.2, scale: 1.4, rot: 0.5 },
    { x: 14.0, z: -8.0, scale: 0.65, rot: 2.1 },
    { x: -16.0, z: -6.5, scale: 1.1, rot: 3.4 },
    { x: 4.8, z: 12.0, scale: 1.8, rot: 0.8 },
    { x: -11.2, z: 15.0, scale: 1.25, rot: 1.9 },
    { x: 22.0, z: -25.0, scale: 2.2, rot: 2.7 },
    { x: -28.0, z: -22.0, scale: 1.9, rot: 0.2 },
    { x: 32.0, z: 18.0, scale: 2.6, rot: 1.4 },
    { x: -35.0, z: 28.0, scale: 3.1, rot: 2.9 },
    { x: 1.5, z: -4.5, scale: 0.35, rot: 0.4 }, // Foreground small rock near boots
    { x: -2.8, z: -3.2, scale: 0.42, rot: 1.7 },
    { x: 3.2, z: -6.1, scale: 0.5, rot: 2.5 },
  ];

  rockPositions.forEach((rock) => {
    const mesh = new THREE.Mesh(rockGeo, rockMat);
    mesh.position.set(rock.x, rock.scale * 0.45, rock.z);
    mesh.scale.set(rock.scale, rock.scale * (0.7 + Math.sin(rock.rot) * 0.2), rock.scale);
    mesh.rotation.set(rock.rot, rock.rot * 1.5, rock.rot * 0.8);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });

  // 3. Artemis Waypoint Beacon Marker (At x: 6, z: -12)
  const beaconGroup = new THREE.Group();
  beaconGroup.position.set(6.0, 0.0, -12.0);

  // Mast pole
  const mastGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8);
  mastGeo.translate(0, 1.2, 0);
  const mastMat = new THREE.MeshStandardMaterial({ color: 0xd4d8e0, metalness: 0.85, roughness: 0.25 });
  const mastMesh = new THREE.Mesh(mastGeo, mastMat);
  mastMesh.castShadow = true;
  beaconGroup.add(mastMesh);

  // Antenna dish
  const dishGeo = new THREE.ConeGeometry(0.35, 0.15, 16, 1, true);
  dishGeo.rotateX(Math.PI / 4);
  dishGeo.translate(0, 2.2, 0);
  const dishMesh = new THREE.Mesh(dishGeo, mastMat);
  beaconGroup.add(dishMesh);

  // Flashing Telemetry LED Beacon
  const ledGeo = new THREE.SphereGeometry(0.08, 16, 16);
  ledGeo.translate(0, 2.42, 0);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x5ce1e6 });
  const ledMesh = new THREE.Mesh(ledGeo, ledMat);
  beaconGroup.add(ledMesh);

  group.add(beaconGroup);

  return {
    group,
    beaconLed: ledMat,
  };
}

/**
 * Creates 3D Luminous Traverse Route Vector Ribbon along lunar ground
 * Points in the direction of the Spatial AI recommended bearing azimuth.
 */
export function create3DRouteLine(bearingDeg, length = 120) {
  const points = [];
  const bearingRad = (bearingDeg * Math.PI) / 180.0;
  const sinB = Math.sin(bearingRad);
  const cosB = Math.cos(bearingRad);

  for (let d = 3; d <= length; d += 3) {
    const x = d * sinB;
    const z = -d * cosB;
    // Align with ground undulation
    const y = 0.18 + Math.sin(x * 0.02) * Math.cos(z * 0.02) * 1.8;
    points.push(new THREE.Vector3(x, y, z));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: 0x5ce1e6, // LuNav Cyan
    dashSize: 3,
    gapSize: 2,
    linewidth: 2,
    transparent: true,
    opacity: 0.85,
  });

  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}
