// LROC WAC global mosaic from NASA SVS, converted to grayscale for the globe.
// Source: https://svs.gsfc.nasa.gov/4720/ (NASA/GSFC; LRO LROC WAC)
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

let grayscaleCanvasPromise;

function loadGrayscaleMoonCanvas() {
  if (!grayscaleCanvasPromise) {
    grayscaleCanvasPromise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas 2D is unavailable for the lunar albedo texture.'));
          return;
        }
        context.filter = 'grayscale(1) contrast(1.08)';
        context.drawImage(image, 0, 0);
        context.filter = 'none';
        resolve(canvas);
      };
      image.onerror = () => reject(new Error('Could not load the local LROC WAC lunar texture.'));
      image.src = '/images/lro-wac-global-2k.jpg';
    });
  }
  return grayscaleCanvasPromise;
}

const LOOKS = {
  hero: { key: new THREE.Color(0xf0f1f3), intensity: 2.2, glow: 0.58, ambient: 0.42 },
  dim:  { key: new THREE.Color(0xd8dbe0), intensity: 1.35, glow: 0.08, ambient: 0.32 },
  far:  { key: new THREE.Color(0xb7bdc6), intensity: 0.62, glow: 0.02, ambient: 0.22 },
};

export default function LunarGlobe({ lat = -89.5, lon = 0, variant = 'dim' }) {
  const mount = useRef(null);
  const live = useRef({ variant, lat, lon });
  live.current = { variant, lat, lon };

  useEffect(() => {
    const el = mount.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let map = null;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.z = 4.85;

    const pivot = new THREE.Group();
    const orient = new THREE.Group();
    pivot.add(orient);
    scene.add(pivot);

    const moonMaterial = new THREE.MeshStandardMaterial({
      color: 0xaeb1b5,
      roughness: 1,
      metalness: 0,
    });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), moonMaterial);
    orient.add(moon);

    loadGrayscaleMoonCanvas().then((canvas) => {
      if (disposed) return;
      map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      moonMaterial.map = map;
      moonMaterial.color.set(0xffffff);
      moonMaterial.needsUpdate = true;
    }).catch((error) => {
      console.error('[LuNav] Failed to load NASA LROC WAC texture:', error);
    });

    const glowMat = new THREE.ShaderMaterial({
      uniforms: { c: { value: new THREE.Color(0xf5f6f8) }, k: { value: 0 } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main(){ vN = normalize(normalMatrix*normal);
          vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; uniform vec3 c; uniform float k;
        void main(){ float i = clamp(dot(-vN, vV), 0.0, 1.0);
          float f = clamp(pow(i*2.2, 1.5), 0.0, 1.0);
          f *= 0.3 + 0.7*clamp(-vN.x*1.2 + 0.2, 0.0, 1.0);
          gl_FragColor = vec4(c, f*0.72*k); }`,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const rimLight = new THREE.Mesh(new THREE.SphereGeometry(1.12, 64, 48), glowMat);
    scene.add(rimLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1);
    keyLight.position.set(-3, 1.2, 2.4);
    const fill = new THREE.DirectionalLight(0xe5e8ed, 0.24);
    fill.position.set(3, -1, 1);
    const ambient = new THREE.AmbientLight(0x30343a, 0.42);
    scene.add(keyLight, fill, ambient);

    const target = new THREE.Quaternion();
    const from = new THREE.Vector3();
    const to = new THREE.Vector3(0, 0, 1);
    const initialLook = LOOKS[variant] ?? LOOKS.dim;
    const look = { intensity: initialLook.intensity, ambient: initialLook.ambient, glow: initialLook.glow };
    keyLight.color.copy(initialLook.key);
    let snapped = false;

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(el);
    resize();

    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const current = live.current;
      const nextLook = LOOKS[current.variant] ?? LOOKS.dim;

      const latitude = THREE.MathUtils.degToRad(current.lat);
      const longitude = THREE.MathUtils.degToRad(current.lon);
      from.set(Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude), Math.cos(latitude) * Math.cos(longitude));
      target.setFromUnitVectors(from, to);
      if (!snapped) {
        orient.quaternion.copy(target);
        snapped = true;
      } else {
        orient.quaternion.slerp(target, 0.06);
      }

      keyLight.color.lerp(nextLook.key, 0.08);
      look.intensity += (nextLook.intensity - look.intensity) * 0.08;
      look.ambient += (nextLook.ambient - look.ambient) * 0.08;
      look.glow += (nextLook.glow - look.glow) * 0.08;
      keyLight.intensity = look.intensity;
      ambient.intensity = look.ambient;
      glowMat.uniforms.k.value = look.glow;

      if (!reduce) pivot.rotation.z += 0.0012;
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      moon.geometry.dispose();
      moonMaterial.dispose();
      rimLight.geometry.dispose();
      glowMat.dispose();
      map?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []); // props are read from live.current during the render loop

  return <div ref={mount} className="globe-canvas" aria-hidden="true" />;
}
