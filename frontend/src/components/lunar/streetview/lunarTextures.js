import * as THREE from 'three';

/**
 * Procedural Earth Canvas Texture (1024 x 512)
 * Generates photorealistic oceanic depth, continents, ice caps,
 * and swirling weather systems without relying on external network requests.
 */
export function createEarthTexture() {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  // 1. Oceanic Deep Blue Gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#091833');
  oceanGrad.addColorStop(0.5, '#0d2b52');
  oceanGrad.addColorStop(1, '#091833');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Shallow continental shelf waters (cyan-blue tint)
  ctx.fillStyle = '#164375';

  // Helper to draw continent blobs with latitude/longitude mapping
  const drawBlob = (cx, cy, rx, ry, color) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // 2. Continental Landmasses (Stylized accurate planetary geographic placement)
  // Eurasia / Africa
  drawBlob(540, 180, 150, 75, '#3a4b35'); // Eurasia
  drawBlob(650, 190, 120, 65, '#4a5438'); // East Asia
  drawBlob(520, 270, 75, 110, '#696144'); // Africa (Sahara / Savanna)
  drawBlob(530, 340, 45, 60, '#384d33');  // Sub-Saharan Africa
  drawBlob(590, 240, 50, 35, '#786e4e');  // Arabian Peninsula
  drawBlob(630, 260, 45, 45, '#3e5235');  // India

  // Americas
  drawBlob(230, 170, 95, 70, '#3c4e36');  // North America
  drawBlob(270, 130, 60, 40, '#4f5e42');  // Canada / Hudson
  drawBlob(260, 330, 65, 115, '#2e4a2a'); // South America (Amazon green)
  drawBlob(280, 380, 45, 80, '#535b44');  // Southern Andes / Pampas
  drawBlob(340, 100, 50, 35, '#dbe3ea');  // Greenland Ice

  // Australia & Oceania
  drawBlob(750, 360, 65, 45, '#856441');  // Australia Outback
  drawBlob(820, 390, 25, 20, '#3a5032');  // New Zealand

  // Polar Ice Caps
  // Antarctica (South Pole)
  ctx.fillStyle = '#eaf2fa';
  ctx.beginPath();
  ctx.ellipse(width / 2, height - 15, width * 0.48, 45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arctic Sea Ice (North Pole)
  ctx.beginPath();
  ctx.ellipse(width / 2, 10, width * 0.42, 35, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Swirling Cloud Systems & Atmospheric Weather Belts
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  
  // Equatorial ITCZ Cloud Belt
  for (let i = 0; i < 40; i++) {
    const x = (i * 28 + Math.sin(i) * 30) % width;
    const y = 240 + Math.sin(i * 0.8) * 35;
    ctx.beginPath();
    ctx.ellipse(x, y, 35 + (i % 5) * 8, 12 + (i % 3) * 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Northern Cyclonic Swirls
  for (let i = 0; i < 25; i++) {
    const x = (i * 45 + 50) % width;
    const y = 140 + Math.cos(i * 0.9) * 25;
    ctx.beginPath();
    ctx.ellipse(x, y, 45 + (i % 4) * 10, 15 + (i % 3) * 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Southern Cyclonic Belts (Roaring Forties)
  for (let i = 0; i < 30; i++) {
    const x = (i * 38 + 20) % width;
    const y = 380 + Math.sin(i * 0.7) * 22;
    ctx.beginPath();
    ctx.ellipse(x, y, 40 + (i % 5) * 8, 14 + (i % 3) * 4, 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Procedural Lunar Regolith Bump/Normal Texture (512 x 512)
 * Creates fine-grain powdery surface roughness and micro-craters.
 */
export function createRegolithNormalTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // Simple pseudo-random hash generator
  let seed = 42;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Base height map buffer
  const heightMap = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      // High-frequency regolith grit
      let h = (random() - 0.5) * 0.15;
      // Mid-frequency undulations
      h += Math.sin(x * 0.05) * Math.cos(y * 0.05) * 0.12;
      heightMap[idx] = h;
    }
  }

  // Add small micro-craters
  const craterCount = 45;
  for (let c = 0; c < craterCount; c++) {
    const cx = Math.floor(random() * size);
    const cy = Math.floor(random() * size);
    const rad = 4 + Math.floor(random() * 18);
    const depth = 0.25 + random() * 0.35;

    for (let dy = -rad * 2; dy <= rad * 2; dy++) {
      const py = (cy + dy + size) % size;
      for (let dx = -rad * 2; dx <= rad * 2; dx++) {
        const px = (cx + dx + size) % size;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < rad) {
          // Depressed crater interior
          const factor = Math.cos((d / rad) * (Math.PI / 2));
          heightMap[py * size + px] -= depth * factor;
        } else if (d < rad * 1.5) {
          // Raised crater rim
          const rimDist = (d - rad) / (rad * 0.5);
          const rimFactor = Math.sin(rimDist * Math.PI) * 0.15 * depth;
          heightMap[py * size + px] += rimFactor;
        }
      }
    }
  }

  // Sobel Filter to generate RGB Normal Map
  for (let y = 0; y < size; y++) {
    const ym1 = (y - 1 + size) % size;
    const yp1 = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm1 = (x - 1 + size) % size;
      const xp1 = (x + 1) % size;

      const dzdx = (heightMap[y * size + xp1] - heightMap[y * size + xm1]) * 4.0;
      const dzdy = (heightMap[yp1 * size + x] - heightMap[ym1 * size + x]) * 4.0;

      // Normal vector = normalize(-dzdx, -dzdy, 1.0)
      const len = Math.sqrt(dzdx * dzdx + dzdy * dzdy + 1.0);
      const nx = (-dzdx / len) * 0.5 + 0.5;
      const ny = (-dzdy / len) * 0.5 + 0.5;
      const nz = (1.0 / len) * 0.5 + 0.5;

      const pIdx = (y * size + x) * 4;
      data[pIdx] = Math.floor(nx * 255);
      data[pIdx + 1] = Math.floor(ny * 255);
      data[pIdx + 2] = Math.floor(nz * 255);
      data[pIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  return texture;
}

/**
 * Sun Core & Corona Glow Texture (256 x 256)
 */
export function createSunTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center, 4, center, center, center);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.12, '#ffffff');
  grad.addColorStop(0.25, 'rgba(255, 250, 235, 0.95)');
  grad.addColorStop(0.45, 'rgba(255, 230, 180, 0.4)');
  grad.addColorStop(0.7, 'rgba(255, 210, 150, 0.12)');
  grad.addColorStop(1, 'rgba(255, 200, 120, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle horizontal anamorphic flare
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.ellipse(center, center, size * 0.48, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Accurate Deep Space Starfield Buffer Geometry (3,200 Stars)
 * Realistic stellar magnitude distribution and vacuum astronomical color temperatures.
 */
export function createStarfieldGeometry(count = 3200, radius = 12000) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const cWhite = new THREE.Color(0xffffff);
  const cBlue = new THREE.Color(0xd6e5ff);
  const cCyan = new THREE.Color(0xafe3ff);
  const cWarm = new THREE.Color(0xffebd2);
  const cAmber = new THREE.Color(0xffd5a0);

  for (let i = 0; i < count; i++) {
    // Spherical distribution
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Stellar magnitude & color
    const dice = Math.random();
    let col = cWhite;
    let size = 1.4;

    if (dice > 0.96) {
      // Very bright primary stars (Sirius, Canopus, Rigel type)
      col = dice > 0.98 ? cBlue : cAmber;
      size = 3.6;
    } else if (dice > 0.82) {
      // Bright stars
      col = dice > 0.90 ? cCyan : cWarm;
      size = 2.4;
    } else if (dice > 0.45) {
      // Standard stars
      col = cWhite;
      size = 1.6;
    } else {
      // Faint background stars
      col = cBlue;
      size = 1.0;
    }

    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
    sizes[i] = size;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  return geometry;
}
