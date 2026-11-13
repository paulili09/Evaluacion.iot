import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Luminaria } from '../types';
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Power,
  Sun,
  Home,
  SlidersHorizontal,
} from 'lucide-react';

interface SmartHome3DViewProps {
  lights: Luminaria[];
  onToggleLight: (id: string) => void;
  onSelectLight: (light: Luminaria) => void;
}

type CameraPresetKey = 'overview' | 'estudio' | 'dormitorio' | 'cocina' | 'salon' | 'gateway';
type HouseMode = 'cutaway' | 'low-walls' | 'roof';

interface CameraPreset {
  label: string;
  pos: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: Record<CameraPresetKey, CameraPreset> = {
  overview: { label: 'Toda la Casa', pos: [11.2, 9.2, 12.2], target: [0, 0.8, 0.2] },
  estudio: { label: 'Estudio', pos: [-3.4, 4.6, 4.5], target: [-3.0, 0.85, -1.8] },
  dormitorio: { label: 'Dormitorio', pos: [3.6, 4.6, 4.5], target: [3.0, 0.85, -1.8] },
  cocina: { label: 'Cocina', pos: [-2.6, 4.5, 7.2], target: [-2.6, 0.85, 2.1] },
  salon: { label: 'Salón', pos: [3.2, 4.5, 7.2], target: [2.8, 0.85, 2.1] },
  gateway: { label: 'ESP32 Hub', pos: [-1.8, 2.35, 0.65], target: [-3.15, 0.92, -2.5] },
};

// Conversión física aproximada de Kelvin (2000K-6500K) a RGB para iluminación Three.js
function kelvinToColor(kelvin: number): THREE.Color {
  const temp = Math.max(2000, Math.min(6500, kelvin)) / 100;
  let r: number;
  let g: number;
  let b: number;

  if (temp <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
    b = temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    b = 255;
  }

  return new THREE.Color(
    Math.max(0, Math.min(255, r)) / 255,
    Math.max(0, Math.min(255, g)) / 255,
    Math.max(0, Math.min(255, b)) / 255
  );
}

// Texturas procedurales sRGB (sin dependencias externas)
function createWoodFloorTexture(baseHex: string, plankHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  const plankH = 64;
  for (let row = 0; row < 8; row++) {
    const y = row * plankH;
    ctx.fillStyle = row % 2 === 0 ? baseHex : plankHex;
    ctx.fillRect(0, y, 512, plankH - 2);
    ctx.strokeStyle = 'rgba(10, 14, 24, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y + plankH - 1);
    ctx.lineTo(512, y + plankH - 1);
    ctx.stroke();

    const offset = (row % 2) * 128;
    for (let x = offset; x < 512; x += 256) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + plankH);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createTileFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#253144';
  ctx.fillRect(0, 0, 512, 512);

  const step = 64;
  for (let y = 0; y < 512; y += step) {
    for (let x = 0; x < 512; x += step) {
      const shade = (x / step + y / step) % 2 === 0 ? '#273448' : '#212d3f';
      ctx.fillStyle = shade;
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

function createLawnTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f221b';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 1800; i++) {
    const x = (i * 73) % 512;
    const y = (i * 137) % 512;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(16, 185, 129, 0.05)';
    ctx.fillRect(x, y, 3, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

function createRadialGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 4, 128, 128, 124);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.45)');
  grad.addColorStop(0.75, 'rgba(255, 255, 255, 0.12)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface FixtureBinding {
  id: string;
  group: THREE.Group;
  bulbMaterials: THREE.MeshStandardMaterial[];
  pointLight: THREE.PointLight;
  floorGlowMesh: THREE.Mesh;
  floorGlowMat: THREE.MeshBasicMaterial;
  hitbox: THREE.Mesh;
}

export const SmartHome3DView: React.FC<SmartHome3DViewProps> = ({
  lights,
  onToggleLight,
  onSelectLight,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [activePreset, setActivePreset] = useState<CameraPresetKey>('overview');
  const [houseMode, setHouseMode] = useState<HouseMode>('cutaway');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [hoveredLightName, setHoveredLightName] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState<boolean>(false);

  const lightsRef = useRef<Luminaria[]>(lights);
  lightsRef.current = lights;

  const callbacksRef = useRef({ onToggleLight, onSelectLight });
  callbacksRef.current = { onToggleLight, onSelectLight };

  const presetTargetRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: false,
    pos: new THREE.Vector3(...CAMERA_PRESETS.overview.pos),
    target: new THREE.Vector3(...CAMERA_PRESETS.overview.target),
  });

  const houseModeRef = useRef<HouseMode>(houseMode);
  houseModeRef.current = houseMode;

  const fixturesRef = useRef<Map<string, FixtureBinding>>(new Map());
  const syncFixturesFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    syncFixturesFnRef.current?.();
  }, [lights]);

  const handleSelectPreset = (key: CameraPresetKey) => {
    setActivePreset(key);
    const p = CAMERA_PRESETS[key];
    presetTargetRef.current.pos.set(...p.pos);
    presetTargetRef.current.target.set(...p.target);
    presetTargetRef.current.active = true;
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070d19);
    scene.fog = new THREE.FogExp2(0x070d19, 0.022);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 120);
    camera.position.set(...CAMERA_PRESETS.overview.pos);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvasEl = renderer.domElement;
    canvasEl.style.display = 'block';
    canvasEl.style.width = '100%';
    canvasEl.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(canvasEl);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    canvasEl.addEventListener('webglcontextlost', handleContextLost);
    canvasEl.addEventListener('webglcontextrestored', handleContextRestored);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Iluminación ambiental nocturna / atardecer arquitectónico para que resalten las luces de la casa
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0b1220, 0.52);
    scene.add(hemiLight);

    const moonKeyLight = new THREE.DirectionalLight(0xe2e8f0, 0.95);
    moonKeyLight.position.set(11, 15, 11);
    moonKeyLight.castShadow = !isSoftwareGl;
    moonKeyLight.shadow.mapSize.set(1024, 1024);
    moonKeyLight.shadow.camera.left = -10;
    moonKeyLight.shadow.camera.right = 10;
    moonKeyLight.shadow.camera.top = 10;
    moonKeyLight.shadow.camera.bottom = -10;
    moonKeyLight.shadow.bias = -0.0005;
    moonKeyLight.shadow.normalBias = 0.02;
    scene.add(moonKeyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.42);
    rimLight.position.set(-10, 7, -9);
    scene.add(rimLight);

    const controls = new OrbitControls(camera, canvasEl);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 2.6;
    controls.maxDistance = 25;
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controls.addEventListener('start', () => {
      presetTargetRef.current.active = false;
    });

    // --------------------------------------------------------------------------
    // TEXTURAS Y MATERIALES ARQUITECTÓNICOS
    // --------------------------------------------------------------------------
    const studyWoodTex = createWoodFloorTexture('#2c241e', '#241d18');
    const bedroomWoodTex = createWoodFloorTexture('#32261e', '#2a1f18');
    const kitchenTileTex = createTileFloorTexture();
    const lawnTex = createLawnTexture();
    const glowTex = createRadialGlowTexture();

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    studyWoodTex.anisotropy = maxAniso;
    bedroomWoodTex.anisotropy = maxAniso;
    kitchenTileTex.anisotropy = maxAniso;
    lawnTex.anisotropy = maxAniso;

    const disposableTextures = [studyWoodTex, bedroomWoodTex, kitchenTileTex, lawnTex, glowTex];
    const disposableGeometries: THREE.BufferGeometry[] = [];
    const disposableMaterials: THREE.Material[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      disposableGeometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      disposableMaterials.push(m);
      return m;
    };

    // --------------------------------------------------------------------------
    // ENTORNO EXTERIOR DE LA CASA (Jardín, Camino, Terraza y Árboles)
    // --------------------------------------------------------------------------
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const groundMesh = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(28, 48)),
      trackMat(
        new THREE.MeshStandardMaterial({
          map: lawnTex,
          roughness: 0.92,
          metalness: 0.02,
        })
      )
    );
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.18;
    groundMesh.receiveShadow = true;
    worldGroup.add(groundMesh);

    // Base / Cimiento de hormigón de la casa
    const foundationMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, metalness: 0.08 })
    );
    const foundation = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(12.0, 0.22, 9.0)), foundationMat);
    foundation.position.set(0, -0.07, 0);
    foundation.receiveShadow = true;
    worldGroup.add(foundation);

    // Porche delantero + escalones + camino de piedra
    const porchMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.78, metalness: 0.08 })
    );
    const frontPorch = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.4, 0.16, 1.5)), porchMat);
    frontPorch.position.set(0, -0.09, 5.2);
    frontPorch.receiveShadow = true;
    worldGroup.add(frontPorch);

    const step1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 0.09, 0.55)), porchMat);
    step1.position.set(0, -0.135, 6.2);
    step1.receiveShadow = true;
    worldGroup.add(step1);

    for (let s = 0; s < 5; s++) {
      const stone = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 0.04, 0.68)), porchMat);
      stone.position.set(0, -0.16, 7.0 + s * 0.92);
      stone.receiveShadow = true;
      worldGroup.add(stone);
    }

    // Jardineras y árboles multiparte alrededor de la casa
    const trunkMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.9, metalness: 0.02 })
    );
    const leavesMat1 = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.82, metalness: 0.04 })
    );
    const leavesMat2 = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8, metalness: 0.04 })
    );

    const addTree = (x: number, z: number, scale = 1) => {
      const tree = new THREE.Group();
      tree.position.set(x, -0.18, z);
      tree.scale.setScalar(scale);

      const trunk = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.22, 1.4, 10)), trunkMat);
      trunk.position.y = 0.7;
      trunk.castShadow = true;
      tree.add(trunk);

      const crown1 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.05, 1.5, 10)), leavesMat1);
      crown1.position.y = 1.85;
      crown1.castShadow = true;
      tree.add(crown1);

      const crown2 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.82, 1.25, 10)), leavesMat2);
      crown2.position.y = 2.65;
      crown2.castShadow = true;
      tree.add(crown2);

      const crown3 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.54, 0.95, 10)), leavesMat1);
      crown3.position.y = 3.35;
      crown3.castShadow = true;
      tree.add(crown3);

      worldGroup.add(tree);
    };

    addTree(-7.6, -5.2, 1.15);
    addTree(-8.1, 2.4, 0.95);
    addTree(7.8, -4.6, 1.2);
    addTree(7.6, 3.8, 0.92);
    addTree(-4.2, -6.8, 1.05);
    addTree(4.4, -6.6, 1.08);

    // --------------------------------------------------------------------------
    // PISOS DE LAS 4 HABITACIONES DE LA CASA
    // --------------------------------------------------------------------------
    const homeGroup = new THREE.Group();
    scene.add(homeGroup);

    const addRoomFloor = (
      x: number,
      z: number,
      w: number,
      d: number,
      mat: THREE.Material
    ) => {
      const mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, 0.04, d)), mat);
      mesh.position.set(x, 0.02, z);
      mesh.receiveShadow = true;
      homeGroup.add(mesh);
    };

    const studyFloorMat = trackMat(
      new THREE.MeshStandardMaterial({ map: studyWoodTex, roughness: 0.72, metalness: 0.08 })
    );
    const bedroomFloorMat = trackMat(
      new THREE.MeshStandardMaterial({ map: bedroomWoodTex, roughness: 0.75, metalness: 0.06 })
    );
    const kitchenFloorMat = trackMat(
      new THREE.MeshStandardMaterial({ map: kitchenTileTex, roughness: 0.55, metalness: 0.14 })
    );
    const salonFloorMat = trackMat(
      new THREE.MeshStandardMaterial({ map: studyWoodTex, color: 0xd6cfc7, roughness: 0.68, metalness: 0.08 })
    );

    addRoomFloor(-2.85, -2.0, 5.5, 4.1, studyFloorMat);   // Estudio
    addRoomFloor(2.85, -2.0, 5.5, 4.1, bedroomFloorMat);  // Dormitorio Ppal
    addRoomFloor(-2.85, 2.1, 5.5, 4.0, kitchenFloorMat);  // Cocina
    addRoomFloor(2.85, 2.1, 5.5, 4.0, salonFloorMat);     // Salón

    // --------------------------------------------------------------------------
    // MUROS EXTERIORES E INTERIORES CON VENTANAS Y PUERTA PRINCIPAL
    // --------------------------------------------------------------------------
    const wallsGroup = new THREE.Group();
    homeGroup.add(wallsGroup);

    const outerWallMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xdbe2ec, roughness: 0.85, metalness: 0.04 })
    );
    const innerWallMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.82, metalness: 0.05 })
    );
    const frameMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.65 })
    );
    const doorWoodMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.58, metalness: 0.08 })
    );
    const windowGlassMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        metalness: 0.05,
        roughness: 0.08,
        transmission: isSoftwareGl ? 0 : 0.72,
        transparent: true,
        opacity: isSoftwareGl ? 0.34 : 0.92,
        ior: 1.5,
      })
    );

    const H = 2.45; // Altura estándar de muros de la casa

    const addWallSegment = (
      x: number,
      z: number,
      w: number,
      h: number,
      d: number,
      yBase = 0.04,
      mat: THREE.Material = outerWallMat
    ) => {
      const mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, d)), mat);
      mesh.position.set(x, yBase + h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      wallsGroup.add(mesh);
      return mesh;
    };

    const addWindowOnXWall = (cx: number, z: number, winW: number, winH = 1.25, sillY = 0.68) => {
      // Antepecho y dintel
      addWallSegment(cx, z, winW, sillY, 0.18, 0.04, outerWallMat);
      addWallSegment(cx, z, winW, H - (sillY + winH), 0.18, 0.04 + sillY + winH, outerWallMat);
      // Marco + cristal
      const glass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(winW - 0.08, winH - 0.08, 0.05)), windowGlassMat);
      glass.position.set(cx, 0.04 + sillY + winH / 2, z);
      wallsGroup.add(glass);

      const topFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(winW, 0.06, 0.21)), frameMat);
      topFrame.position.set(cx, 0.04 + sillY + winH - 0.03, z);
      wallsGroup.add(topFrame);
      const botFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(winW, 0.06, 0.23)), frameMat);
      botFrame.position.set(cx, 0.04 + sillY + 0.03, z);
      wallsGroup.add(botFrame);
      const mullion = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, winH, 0.14)), frameMat);
      mullion.position.set(cx, 0.04 + sillY + winH / 2, z);
      wallsGroup.add(mullion);
    };

    const addWindowOnZWall = (x: number, cz: number, winD: number, winH = 1.25, sillY = 0.68) => {
      addWallSegment(x, cz, 0.18, sillY, winD, 0.04, outerWallMat);
      addWallSegment(x, cz, 0.18, H - (sillY + winH), winD, 0.04 + sillY + winH, outerWallMat);
      const glass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, winH - 0.08, winD - 0.08)), windowGlassMat);
      glass.position.set(x, 0.04 + sillY + winH / 2, cz);
      wallsGroup.add(glass);

      const topFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.21, 0.06, winD)), frameMat);
      topFrame.position.set(x, 0.04 + sillY + winH - 0.03, cz);
      wallsGroup.add(topFrame);
      const botFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.23, 0.06, winD)), frameMat);
      botFrame.position.set(x, 0.04 + sillY + 0.03, cz);
      wallsGroup.add(botFrame);
    };

    // Muro trasero (z = -4.15) con 2 ventanas (Estudio y Dormitorio)
    addWallSegment(-4.65, -4.15, 2.3, H, 0.18);
    addWindowOnXWall(-2.5, -4.15, 2.0);
    addWallSegment(0, -4.15, 3.0, H, 0.18);
    addWindowOnXWall(2.5, -4.15, 2.0);
    addWallSegment(4.65, -4.15, 2.3, H, 0.18);

    // Muro delantero (z = +4.15) con ventanas panorámicas y Puerta Principal en el centro
    addWallSegment(-4.75, 4.15, 2.1, H, 0.18);
    addWindowOnXWall(-2.6, 4.15, 2.2);
    addWallSegment(-1.0, 4.15, 1.0, H, 0.18);
    // Dintel sobre puerta principal (x: -0.5 .. +0.5)
    addWallSegment(0, 4.15, 1.0, 0.45, 0.18, 0.04 + 2.0);
    addWallSegment(1.0, 4.15, 1.0, H, 0.18);
    addWindowOnXWall(2.7, 4.15, 2.4);
    addWallSegment(4.85, 4.15, 1.9, H, 0.18);

    // Puerta principal multiparte (marco, hoja madera entreabierta, manija dorada)
    const doorPivot = new THREE.Group();
    doorPivot.position.set(-0.46, 0.04, 4.15);
    doorPivot.rotation.y = -0.35; // Ligeramente abierta dando la bienvenida
    const doorLeaf = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.92, 1.98, 0.07)), doorWoodMat);
    doorLeaf.position.set(0.46, 0.99, 0);
    doorLeaf.castShadow = true;
    doorPivot.add(doorLeaf);
    const doorWindow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.95, 0.09)), windowGlassMat);
    doorWindow.position.set(0.46, 1.25, 0);
    doorPivot.add(doorWindow);
    const brassKnob = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.045, 12, 12)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.9 }))
    );
    brassKnob.position.set(0.82, 0.98, 0.055);
    doorPivot.add(brassKnob);
    wallsGroup.add(doorPivot);

    // Muros laterales izquierdo (x = -5.7) y derecho (x = +5.7) con ventanas
    addWallSegment(-5.7, -3.1, 0.18, H, 2.2);
    addWindowOnZWall(-5.7, -1.0, 2.0);
    addWallSegment(-5.7, 1.0, 0.18, H, 2.0);
    addWindowOnZWall(-5.7, 2.8, 1.6);
    addWallSegment(-5.7, 3.9, 0.18, H, 0.6);

    addWallSegment(5.7, -3.1, 0.18, H, 2.2);
    addWindowOnZWall(5.7, -1.0, 2.0);
    addWallSegment(5.7, 1.0, 0.18, H, 2.0);
    addWindowOnZWall(5.7, 2.8, 1.6);
    addWallSegment(5.7, 3.9, 0.18, H, 0.6);

    // Divisiones interiores con vanos de puerta entre habitaciones
    addWallSegment(0, -2.55, 0.14, H, 3.0, 0.04, innerWallMat); // Estudio / Dormitorio
    addWallSegment(0, -0.5, 0.14, 0.45, 1.1, 0.04 + 2.0, innerWallMat); // Paso superior
    addWallSegment(-3.7, 0.05, 3.8, H, 0.14, 0.04, innerWallMat); // Estudio / Cocina
    addWallSegment(-1.2, 0.05, 1.2, 0.45, 0.14, 0.04 + 2.0, innerWallMat);
    addWallSegment(3.7, 0.05, 3.8, H, 0.14, 0.04, innerWallMat); // Dormitorio / Salón
    addWallSegment(1.2, 0.05, 1.2, 0.45, 0.14, 0.04 + 2.0, innerWallMat);

    // Alero sobre la entrada principal (siempre visible como detalle de fachada)
    const canopyMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.4 })
    );
    const entryCanopy = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 0.1, 1.3)), canopyMat);
    entryCanopy.position.set(0, 2.42, 4.85);
    entryCanopy.castShadow = true;
    wallsGroup.add(entryCanopy);

    // --------------------------------------------------------------------------
    // TECHO ARQUITECTÓNICO A DOS AGUAS (Con Modo Cutaway / Casa Completa)
    // --------------------------------------------------------------------------
    const roofGroup = new THREE.Group();
    homeGroup.add(roofGroup);

    const roofShape = new THREE.Shape();
    roofShape.moveTo(-6.2, 0);
    roofShape.lineTo(0, 2.15);
    roofShape.lineTo(6.2, 0);
    roofShape.lineTo(5.9, -0.14);
    roofShape.lineTo(0, 1.92);
    roofShape.lineTo(-5.9, -0.14);
    roofShape.closePath();

    const roofGeo = trackGeo(
      new THREE.ExtrudeGeometry(roofShape, {
        depth: 9.2,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 2,
      })
    );
    roofGeo.translate(0, 0, -4.6);

    const roofMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.62,
        metalness: 0.25,
      })
    );
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.set(0, 2.49, 0);
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    roofGroup.add(roofMesh);

    // Hastiales triangulares (frontal y trasero)
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-5.8, 0);
    gableShape.lineTo(0, 1.98);
    gableShape.lineTo(5.8, 0);
    gableShape.closePath();
    const gableGeo = trackGeo(new THREE.ExtrudeGeometry(gableShape, { depth: 0.16, bevelEnabled: false }));

    const frontGable = new THREE.Mesh(gableGeo, outerWallMat);
    frontGable.position.set(0, 2.48, 4.07);
    roofGroup.add(frontGable);
    const backGable = new THREE.Mesh(gableGeo, outerWallMat);
    backGable.position.set(0, 2.48, -4.23);
    roofGroup.add(backGable);

    // Chimenea + Paneles Solares sobre el techo
    const chimney = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.65, 1.5, 0.65)), porchMat);
    chimney.position.set(-3.4, 3.85, -2.0);
    chimney.castShadow = true;
    roofGroup.add(chimney);

    const solarPanelMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0f294a,
        roughness: 0.18,
        metalness: 0.75,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.08,
      })
    );
    for (const sx of [1.6, 3.3]) {
      const panel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.4, 0.05, 2.2)), solarPanelMat);
      panel.position.set(sx, 3.72, 1.4);
      panel.rotation.z = -0.33;
      roofGroup.add(panel);
    }

    // --------------------------------------------------------------------------
    // MOBILIARIO COMPUESTO POR HABITACIÓN
    // --------------------------------------------------------------------------
    const furnitureGroup = new THREE.Group();
    homeGroup.add(furnitureGroup);

    const woodMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x7c5338, roughness: 0.62, metalness: 0.08 }));
    const darkMetalMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.32, metalness: 0.82 }));
    const brassMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.88 }));
    const fabricSlateMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, metalness: 0.02 }));
    const fabricCreamMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.88, metalness: 0.02 }));
    const stoneMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.15 }));

    // --- 1. ESTUDIO: Escritorio + Silla + Monitor + ESP32-S3 Gateway Hub ---
    const deskGroup = new THREE.Group();
    deskGroup.position.set(-3.15, 0.04, -2.85);
    const deskTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.5, 0.08, 1.05)), woodMat);
    deskTop.position.set(0, 0.74, 0);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    deskGroup.add(deskTop);
    for (const lx of [-1.1, 1.1]) {
      for (const lz of [-0.42, 0.42]) {
        const leg = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.74, 12)), darkMetalMat);
        leg.position.set(lx, 0.37, lz);
        leg.castShadow = true;
        deskGroup.add(leg);
      }
    }
    const monitorStand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.24, 0.12)), darkMetalMat);
    monitorStand.position.set(0, 0.9, -0.2);
    deskGroup.add(monitorStand);
    const monitorScreen = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.18, 0.54, 0.05)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x0b1120,
          emissive: 0x0ea5e9,
          emissiveIntensity: 0.3,
          roughness: 0.2,
          metalness: 0.5,
        })
      )
    );
    monitorScreen.position.set(0, 1.16, -0.18);
    deskGroup.add(monitorScreen);

    // ESP32-S3 Gateway PCB ensamblado
    const espGroup = new THREE.Group();
    espGroup.position.set(0.84, 0.78, 0.15);
    const pcbBoard = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.36, 0.03, 0.24)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.5, metalness: 0.3 }))
    );
    pcbBoard.position.y = 0.015;
    espGroup.add(pcbBoard);
    const shieldCan = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.14, 0.035, 0.14)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.9 }))
    );
    shieldCan.position.set(-0.04, 0.045, 0);
    espGroup.add(shieldCan);
    const antenna = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.012, 0.015, 0.28, 10)), darkMetalMat);
    antenna.position.set(0.13, 0.15, -0.07);
    espGroup.add(antenna);
    const statusLed = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.02, 10, 10)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 2.2 }))
    );
    statusLed.position.set(0.08, 0.04, 0.06);
    espGroup.add(statusLed);
    deskGroup.add(espGroup);

    // Silla ergonómica
    const chairSeat = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.56, 0.08, 0.54)), fabricSlateMat);
    chairSeat.position.set(0, 0.48, 0.88);
    deskGroup.add(chairSeat);
    const chairBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.54, 0.62, 0.08)), fabricSlateMat);
    chairBack.position.set(0, 0.82, 1.12);
    deskGroup.add(chairBack);
    const chairStem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 0.44, 10)), darkMetalMat);
    chairStem.position.set(0, 0.22, 0.88);
    deskGroup.add(chairStem);
    furnitureGroup.add(deskGroup);

    // --- 2. DORMITORIO: Cama + Mesitas + Alfombra ---
    const bedGroup = new THREE.Group();
    bedGroup.position.set(3.0, 0.04, -2.35);
    const bedroomRug = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.3, 0.02, 2.9)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.95 }))
    );
    bedroomRug.position.set(0, 0.01, 0.2);
    bedroomRug.receiveShadow = true;
    bedGroup.add(bedroomRug);

    const bedFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.35, 0.28, 2.55)), darkMetalMat);
    bedFrame.position.y = 0.16;
    bedFrame.castShadow = true;
    bedGroup.add(bedFrame);
    const mattress = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.18, 0.24, 2.4)), fabricCreamMat);
    mattress.position.y = 0.4;
    mattress.receiveShadow = true;
    bedGroup.add(mattress);
    const duvet = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.22, 0.14, 1.65)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.85 }))
    );
    duvet.position.set(0, 0.49, 0.36);
    bedGroup.add(duvet);
    const headboard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.42, 1.05, 0.14)), woodMat);
    headboard.position.set(0, 0.54, -1.26);
    headboard.castShadow = true;
    bedGroup.add(headboard);
    for (const px of [-0.52, 0.52]) {
      const pillow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.75, 0.12, 0.42)), fabricCreamMat);
      pillow.position.set(px, 0.56, -0.84);
      bedGroup.add(pillow);
    }
    furnitureGroup.add(bedGroup);

    // --- 3. COCINA: Mesón + Refrigerador + Isla + Bancos ---
    const kitchenGroup = new THREE.Group();
    kitchenGroup.position.set(-2.85, 0.04, 2.1);

    const counterBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.4, 0.86, 0.72)), darkMetalMat);
    counterBase.position.set(-0.2, 0.43, 1.48);
    counterBase.castShadow = true;
    kitchenGroup.add(counterBase);
    const counterTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.46, 0.07, 0.78)), stoneMat);
    counterTop.position.set(-0.2, 0.89, 1.48);
    kitchenGroup.add(counterTop);
    const wallCabinet = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.35, 0.62, 0.42)), woodMat);
    wallCabinet.position.set(-0.2, 1.75, 1.62);
    kitchenGroup.add(wallCabinet);

    const fridge = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.85, 1.95, 0.82)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.72 }))
    );
    fridge.position.set(-2.28, 0.975, 1.42);
    fridge.castShadow = true;
    kitchenGroup.add(fridge);

    const islandBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.5, 0.82, 1.05)), darkMetalMat);
    islandBase.position.set(0.15, 0.41, -0.2);
    islandBase.castShadow = true;
    islandBase.receiveShadow = true;
    kitchenGroup.add(islandBase);
    const islandTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.65, 0.07, 1.18)), stoneMat);
    islandTop.position.set(0.15, 0.85, -0.2);
    islandTop.castShadow = true;
    kitchenGroup.add(islandTop);

    for (const sx of [-0.65, 0.15, 0.95]) {
      const stoolPole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 0.58, 10)), brassMat);
      stoolPole.position.set(sx, 0.29, -1.0);
      kitchenGroup.add(stoolPole);
      const stoolSeat = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.21, 0.21, 0.06, 16)), fabricSlateMat);
      stoolSeat.position.set(sx, 0.6, -1.0);
      kitchenGroup.add(stoolSeat);
    }
    furnitureGroup.add(kitchenGroup);

    // --- 4. SALÓN: Sofá L + Mesa de centro + TV + Planta ---
    const salonGroup = new THREE.Group();
    salonGroup.position.set(2.9, 0.04, 2.15);

    const salonRug = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.4, 0.02, 2.5)),
      trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.95 }))
    );
    salonRug.position.set(0, 0.01, 0);
    salonRug.receiveShadow = true;
    salonGroup.add(salonRug);

    const sofaBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.45, 0.42, 0.92)), fabricSlateMat);
    sofaBase.position.set(0.2, 0.22, -0.85);
    sofaBase.castShadow = true;
    salonGroup.add(sofaBase);
    const sofaBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.45, 0.78, 0.22)), fabricSlateMat);
    sofaBack.position.set(0.2, 0.42, -1.22);
    sofaBack.castShadow = true;
    salonGroup.add(sofaBack);
    const sofaChaise = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.88, 0.42, 1.65)), fabricSlateMat);
    sofaChaise.position.set(0.98, 0.22, -0.45);
    sofaChaise.castShadow = true;
    salonGroup.add(sofaChaise);

    const coffeeTable = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.3, 0.06, 0.75)), woodMat);
    coffeeTable.position.set(-0.15, 0.38, 0.18);
    coffeeTable.castShadow = true;
    salonGroup.add(coffeeTable);
    const coffeeLegs = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 0.34, 0.55)), darkMetalMat);
    coffeeLegs.position.set(-0.15, 0.18, 0.18);
    salonGroup.add(coffeeLegs);

    const tvUnit = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.1, 0.44, 0.45)), woodMat);
    tvUnit.position.set(-0.1, 0.22, 1.55);
    salonGroup.add(tvUnit);
    const tvScreen = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.65, 0.92, 0.05)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x090d16,
          emissive: 0x1d4ed8,
          emissiveIntensity: 0.18,
          roughness: 0.18,
          metalness: 0.6,
        })
      )
    );
    tvScreen.position.set(-0.1, 1.05, 1.62);
    salonGroup.add(tvScreen);

    // Maceta + planta en esquina del salón
    const pot = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.17, 0.38, 12)), stoneMat);
    pot.position.set(2.1, 0.2, 1.35);
    salonGroup.add(pot);
    const plantLeaves = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.32, 0)), leavesMat2);
    plantLeaves.position.set(2.1, 0.62, 1.35);
    salonGroup.add(plantLeaves);
    furnitureGroup.add(salonGroup);

    // --------------------------------------------------------------------------
    // LUMINARIAS INTERACTIVAS DE LA CASA (100% ENLAZADAS A `lights` DE LA APP)
    // --------------------------------------------------------------------------
    const fixturesContainer = new THREE.Group();
    homeGroup.add(fixturesContainer);

    const buildLuminaria3D = (lum: Luminaria, index: number): FixtureBinding => {
      const group = new THREE.Group();
      const bulbMaterials: THREE.MeshStandardMaterial[] = [];

      const createBulbMat = () => {
        const m = trackMat(
          new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffb347,
            emissiveIntensity: 1.5,
            roughness: 0.2,
            metalness: 0.1,
          })
        );
        bulbMaterials.push(m);
        return m;
      };

      // Coordenadas exactas dentro de cada cuarto de la casa
      let pos: [number, number, number] = [0, 0.04, 0];
      if (lum.id === 'lum-1') pos = [-3.95, 0.82, -2.75];      // Lámpara Estudio (sobre escritorio)
      else if (lum.id === 'lum-2') pos = [3.0, 2.38, -2.2];     // Plafón Suite (techo Dormitorio)
      else if (lum.id === 'lum-3') pos = [-3.15, 0.82, -3.32];  // Tira LED Mesa (borde escritorio)
      else if (lum.id === 'lum-4') pos = [-2.7, 2.25, 1.9];     // Focos Isla (sobre isla cocina)
      else if (lum.id === 'lum-5') pos = [1.95, 1.15, -3.72];   // Aplique Cabecero (cabecera cama)
      else if (lum.id === 'lum-6') pos = [-3.05, 1.38, 3.65];   // Tira Bajomuebles (bajo alacena cocina)
      else {
        const slot = index % 4;
        const offset = (slot - 1.5) * 0.95;
        if (lum.roomType === 'estudio') pos = [-2.8 + offset * 0.65, 2.22, -1.5];
        else if (lum.roomType === 'dormitorio') pos = [3.0 + offset * 0.65, 2.22, -1.2];
        else if (lum.roomType === 'cocina') pos = [-2.8 + offset * 0.65, 2.22, 2.4];
        else pos = [2.9 + offset * 0.65, 2.22, 2.15];           // Salón
      }

      group.position.set(...pos);

      if (lum.iconType === 'lamp') {
        const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 20)), brassMat);
        base.position.y = 0.02;
        group.add(base);
        const arm1 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 10)), darkMetalMat);
        arm1.position.set(0, 0.24, 0);
        arm1.rotation.z = -0.25;
        group.add(arm1);
        const arm2 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.35, 10)), darkMetalMat);
        arm2.position.set(0.14, 0.46, 0);
        arm2.rotation.z = 0.7;
        group.add(arm2);
        const shadeMat = trackMat(brassMat.clone());
        shadeMat.side = THREE.DoubleSide;
        const shade = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.17, 0.2, 20, 1, true)), shadeMat);
        shade.position.set(0.28, 0.44, 0);
        group.add(shade);
        const bulb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.08, 16, 16)), createBulbMat());
        bulb.position.set(0.28, 0.38, 0);
        group.add(bulb);
      } else if (lum.iconType === 'ceiling') {
        const ring = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.55, 0.045, 14, 32)), brassMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
        const diffuser = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.52, 0.52, 0.06, 28)), createBulbMat());
        group.add(diffuser);
      } else if (lum.iconType === 'strip') {
        const channel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.1, 0.05, 0.07)), darkMetalMat);
        group.add(channel);
        const stripBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.04, 0.04, 0.045)), createBulbMat());
        stripBar.position.y = 0.015;
        group.add(stripBar);
      } else if (lum.iconType === 'spot') {
        const rail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.75, 0.04, 0.06)), darkMetalMat);
        rail.position.y = 0.35;
        group.add(rail);
        for (const sx of [-0.62, 0.62]) {
          const cord = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 8)), darkMetalMat);
          cord.position.set(sx, 0.16, 0);
          group.add(cord);
          const hood = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.17, 0.22, 20)), darkMetalMat);
          hood.position.set(sx, 0, 0);
          group.add(hood);
          const bulb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.085, 16, 16)), createBulbMat());
          bulb.position.set(sx, -0.07, 0);
          group.add(bulb);
        }
      } else {
        const mount = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.26, 0.06)), brassMat);
        group.add(mount);
        const globe = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.14, 18, 18)), createBulbMat());
        globe.position.set(0, 0.05, 0.14);
        group.add(globe);
      }

      const pointLight = new THREE.PointLight(0xffb347, 2.2, 7.2, 1.7);
      pointLight.position.set(
        0,
        lum.iconType === 'ceiling' || lum.iconType === 'spot' ? -0.35 : 0.15,
        0
      );
      group.add(pointLight);

      // Halo suave en el suelo para visualizar al instante qué cuarto está encendido incluso con techo cerrado
      const floorGlowMat = trackMat(
        new THREE.MeshBasicMaterial({
          map: glowTex,
          color: 0xffb347,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      const floorGlowMesh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(4.2, 4.2)), floorGlowMat);
      floorGlowMesh.rotation.x = -Math.PI / 2;
      floorGlowMesh.position.set(0, -(pos[1] - 0.055), 0);
      group.add(floorGlowMesh);

      const hitbox = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.3, 1.05, 1.3)),
        trackMat(new THREE.MeshBasicMaterial({ visible: false }))
      );
      hitbox.userData.lightId = lum.id;
      hitbox.layers.set(1);
      group.add(hitbox);

      fixturesContainer.add(group);
      return {
        id: lum.id,
        group,
        bulbMaterials,
        pointLight,
        floorGlowMesh,
        floorGlowMat,
        hitbox,
      };
    };

    const syncFixtures = () => {
      const currentLights = lightsRef.current;
      const activeIds = new Set(currentLights.map((l) => l.id));

      fixturesRef.current.forEach((binding, id) => {
        if (!activeIds.has(id)) {
          fixturesContainer.remove(binding.group);
          fixturesRef.current.delete(id);
        }
      });

      currentLights.forEach((lum, index) => {
        let binding = fixturesRef.current.get(lum.id);
        if (!binding) {
          binding = buildLuminaria3D(lum, index);
          fixturesRef.current.set(lum.id, binding);
        }

        const c = kelvinToColor(lum.colorTemp);
        const intensityFactor = lum.isOn ? Math.max(0.18, lum.brightness / 100) : 0;

        binding.pointLight.color.copy(c);
        binding.pointLight.intensity = lum.isOn ? intensityFactor * 4.4 : 0;

        binding.floorGlowMat.color.copy(c);
        binding.floorGlowMat.opacity = lum.isOn ? 0.14 + intensityFactor * 0.42 : 0;
        binding.floorGlowMesh.visible = lum.isOn;

        binding.bulbMaterials.forEach((mat) => {
          if (lum.isOn) {
            mat.color.copy(c);
            mat.emissive.copy(c);
            mat.emissiveIntensity = 0.8 + intensityFactor * 2.4;
          } else {
            mat.color.setHex(0x475569);
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        });
      });
    };

    syncFixturesFnRef.current = syncFixtures;
    syncFixtures();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting en Capa 1
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let lastHoverTime = 0;

    const updatePointer = (clientX: number, clientY: number) => {
      const rect = canvasEl.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const getHitboxes = () => Array.from(fixturesRef.current.values()).map((b) => b.hitbox);

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 6) return;
      updatePointer(e.clientX, e.clientY);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(getHitboxes(), false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData.lightId as string;
        if (hitId) {
          callbacksRef.current.onToggleLight(hitId);
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 60) return;
      lastHoverTime = now;
      updatePointer(e.clientX, e.clientY);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(getHitboxes(), false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData.lightId as string;
        const found = lightsRef.current.find((l) => l.id === hitId);
        canvasEl.style.cursor = 'pointer';
        setHoveredLightName(
          found ? `${found.name} (${found.isOn ? `${found.brightness}%` : 'Apagada'})` : null
        );
      } else {
        canvasEl.style.cursor = 'grab';
        setHoveredLightName(null);
      }
    };

    canvasEl.addEventListener('pointerdown', onPointerDown);
    canvasEl.addEventListener('pointerup', onPointerUp);
    canvasEl.addEventListener('pointermove', onPointerMove);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 560;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);

      const mode = houseModeRef.current;
      const targetWallScale = mode === 'low-walls' ? 0.35 : 1.0;
      wallsGroup.scale.y = THREE.MathUtils.damp(wallsGroup.scale.y, targetWallScale, 8, delta);

      // Techo animado: sube suavemente al abrir la casa para controlar luces interiores
      const targetRoofY = mode === 'roof' ? 0 : 4.2;
      const targetRoofScale = mode === 'roof' ? 1.0 : 0.001;
      roofGroup.position.y = THREE.MathUtils.damp(roofGroup.position.y, targetRoofY, 7, delta);
      const s = THREE.MathUtils.damp(roofGroup.scale.y, targetRoofScale, 8, delta);
      roofGroup.scale.set(1, s, 1);
      roofGroup.visible = s > 0.02;

      if (presetTargetRef.current.active) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, presetTargetRef.current.pos.x, 6, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, presetTargetRef.current.pos.y, 6, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, presetTargetRef.current.pos.z, 6, delta);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, presetTargetRef.current.target.x, 6, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, presetTargetRef.current.target.y, 6, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, presetTargetRef.current.target.z, 6, delta);

        if (
          camera.position.distanceTo(presetTargetRef.current.pos) < 0.04 &&
          controls.target.distanceTo(presetTargetRef.current.target) < 0.04
        ) {
          presetTargetRef.current.active = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      canvasEl.removeEventListener('pointerup', onPointerUp);
      canvasEl.removeEventListener('pointermove', onPointerMove);
      canvasEl.removeEventListener('webglcontextlost', handleContextLost);
      canvasEl.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      disposableTextures.forEach((t) => t.dispose());
      disposableGeometries.forEach((g) => g.dispose());
      disposableMaterials.forEach((m) => m.dispose());
      renderer.dispose();
    };
  }, []);

  const activeCount = lights.filter((l) => l.isOn).length;

  return (
    <div className="relative w-full h-[600px] sm:h-[660px] rounded-2xl overflow-hidden border border-slate-800 bg-[#070D19]">
      {/* Contenedor dedicado vacío para el Canvas WebGL */}
      <div ref={mountRef} className="w-full h-full" />

      {contextLost && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#070D19] text-center p-6">
          <p className="text-sm font-bold text-white">Contexto WebGL pausado</p>
          <p className="text-xs text-slate-400 mt-1">
            Tu navegador suspendió el renderizado 3D. Recarga la vista para reanudar.
          </p>
        </div>
      )}

      {/* Encabezado limpio superior izquierdo */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none max-w-md">
        <div className="bg-[#0B111E]/95 border border-slate-800 rounded-xl px-3.5 py-2.5">
          <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 text-amber-400" />
            <span>Casa Inteligente 3D · {activeCount}/{lights.length} luces encendidas</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {hoveredLightName
              ? `Click para encender/apagar: ${hoveredLightName}`
              : 'Haz clic en cualquier lámpara dentro de la casa o usa los botones inferiores'}
          </p>
        </div>
      </div>

      {/* Dock inferior colapsable (sin backdrop-filter sobre WebGL) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-2rem)] max-w-4xl flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed(!dockCollapsed)}
          className="px-3 py-1 rounded-t-lg bg-[#0E1526] border border-b-0 border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{dockCollapsed ? 'Mostrar Controles de la Casa' : 'Ocultar Controles'}</span>
        </button>

        {!dockCollapsed && (
          <div className="w-full bg-[#0E1526]/95 border border-slate-800 rounded-2xl p-3 space-y-2.5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Presets de habitaciones */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(Object.keys(CAMERA_PRESETS) as CameraPresetKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectPreset(key)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activePreset === key
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-[#141D33] text-slate-300 hover:text-white'
                    }`}
                  >
                    {CAMERA_PRESETS[key].label}
                  </button>
                ))}
              </div>

              {/* Modos arquitectónicos de la casa (Sin Techo / Muros Bajos / Casa Completa) */}
              <div className="flex items-center gap-1.5 text-xs">
                {(
                  [
                    { id: 'cutaway', label: 'Interior' },
                    { id: 'low-walls', label: 'Plano' },
                    { id: 'roof', label: 'Con Techo' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setHouseMode(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                      houseMode === m.id
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-[#141D33] text-slate-300 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setHouseMode('cutaway');
                    handleSelectPreset('overview');
                  }}
                  className="p-1.5 rounded-lg bg-[#141D33] text-slate-300 hover:text-white cursor-pointer"
                  title="Restablecer vista"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Control rápido de todas las luces de la app conectadas a la casa */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1.5 border-t border-slate-800/80">
              {lights.map((lum) => (
                <div
                  key={lum.id}
                  className={`flex items-center rounded-lg border shrink-0 transition-colors ${
                    lum.isOn
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-[#141D33] border-slate-800 text-slate-400'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleLight(lum.id)}
                    className="px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:text-white"
                  >
                    {lum.isOn ? <Sun className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                    <span>{lum.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectLight(lum)}
                    className="pr-2 pl-1 py-1 text-slate-400 hover:text-white cursor-pointer"
                    title={`Ajustar brillo y Kelvin de ${lum.name}`}
                    aria-label={`Ajustar ${lum.name}`}
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
