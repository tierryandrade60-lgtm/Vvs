import * as THREE from 'three';
import { CloudQuality } from './graphicsSettings';
import { createSunGlowTexture } from './pixelTextures';

interface PuffDef {
  ox: number;
  oy: number;
  oz: number;
  sx: number;
  sy: number;
  sz: number;
  tint: number;
}

interface CloudCluster {
  relX: number;
  baseY: number;
  relZ: number;
  cosYaw: number;
  sinYaw: number;
  quat: THREE.Quaternion;
  speed: number;
  scale: number;
  bobPhase: number;
  puffs: ReadonlyArray<PuffDef>;
}

const PUFFS_PER_CLOUD = 6;
const MAX_CLOUDS = 28;
const SKY_RING_HALF = 128;

// Rounded, naturally overlapping Cartoon cloud silhouettes
const CLOUD_ARCHETYPES: ReadonlyArray<ReadonlyArray<PuffDef>> = [
  [
    { ox: 0.0, oy: 0.0, oz: 0.0, sx: 3.4, sy: 1.05, sz: 1.9, tint: 0.94 },
    { ox: -1.8, oy: 0.12, oz: 0.1, sx: 2.1, sy: 0.95, sz: 1.55, tint: 0.95 },
    { ox: 1.85, oy: 0.1, oz: -0.1, sx: 2.0, sy: 0.9, sz: 1.5, tint: 0.95 },
    { ox: -0.55, oy: 0.78, oz: 0.05, sx: 1.95, sy: 1.25, sz: 1.45, tint: 1.0 },
    { ox: 0.95, oy: 0.62, oz: -0.05, sx: 1.6, sy: 1.05, sz: 1.3, tint: 0.99 },
    { ox: 0.0, oy: 0.15, oz: 0.65, sx: 2.1, sy: 0.85, sz: 1.15, tint: 0.96 },
  ],
  [
    { ox: 0.0, oy: 0.0, oz: 0.0, sx: 3.8, sy: 1.0, sz: 2.0, tint: 0.94 },
    { ox: -2.1, oy: 0.18, oz: -0.1, sx: 2.2, sy: 1.0, sz: 1.6, tint: 0.96 },
    { ox: 2.0, oy: 0.22, oz: 0.12, sx: 2.1, sy: 0.98, sz: 1.55, tint: 0.96 },
    { ox: 0.1, oy: 0.88, oz: 0.0, sx: 2.1, sy: 1.32, sz: 1.55, tint: 1.0 },
    { ox: -1.15, oy: 0.62, oz: 0.1, sx: 1.55, sy: 1.02, sz: 1.3, tint: 0.99 },
    { ox: 1.25, oy: 0.58, oz: -0.12, sx: 1.5, sy: 0.98, sz: 1.25, tint: 0.99 },
  ],
  [
    { ox: 0.0, oy: 0.0, oz: 0.0, sx: 3.0, sy: 0.98, sz: 1.75, tint: 0.94 },
    { ox: -1.45, oy: 0.14, oz: 0.08, sx: 1.8, sy: 0.92, sz: 1.45, tint: 0.96 },
    { ox: 1.5, oy: 0.12, oz: -0.08, sx: 1.75, sy: 0.88, sz: 1.4, tint: 0.96 },
    { ox: -0.2, oy: 0.72, oz: 0.0, sx: 1.8, sy: 1.2, sz: 1.4, tint: 1.0 },
    { ox: 0.85, oy: 0.45, oz: 0.25, sx: 1.35, sy: 0.92, sz: 1.15, tint: 0.98 },
    { ox: -0.6, oy: 0.2, oz: -0.55, sx: 1.65, sy: 0.82, sz: 1.1, tint: 0.95 },
  ],
];

const CLOUD_COUNTS: Record<CloudQuality, number> = {
  low: 10,
  medium: 16,
  high: 22,
  ultra: 28,
};

const SUN_SKY_OFFSET = new THREE.Vector3(46, 28, -110);
export const SUN_LIGHT_DIR = SUN_SKY_OFFSET.clone().normalize();
const _UP_AXIS = new THREE.Vector3(0, 1, 0);

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export class SkyAtmosphere {
  public readonly group = new THREE.Group();

  private readonly sunBillboard: THREE.Mesh;
  private readonly cloudMesh: THREE.InstancedMesh;
  private readonly clouds: CloudCluster[] = [];
  private activeCloudCount = CLOUD_COUNTS.high;

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly textures: THREE.Texture[] = [];

  private elapsed = 0;
  private lastPlayerX = 0;
  private lastPlayerZ = 0;

  private readonly _dummyPos = new THREE.Vector3();
  private readonly _dummyScale = new THREE.Vector3();
  private readonly _dummyMat = new THREE.Matrix4();
  private readonly _color = new THREE.Color();

  constructor(initialCloudQuality: CloudQuality = 'high') {
    // --- 1. Soft Glowing Circular Sky Sun Texture (shared singleton cached in pixelTextures) ---
    const sunTex = createSunGlowTexture();

    const sunGeo = new THREE.PlaneGeometry(54, 54);
    const sunMat = new THREE.MeshBasicMaterial({
      map: sunTex,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    this.geometries.push(sunGeo);
    this.materials.push(sunMat);

    this.sunBillboard = new THREE.Mesh(sunGeo, sunMat);
    this.sunBillboard.renderOrder = -1;
    this.group.add(this.sunBillboard);

    // --- 2. Soft Rounded Cartoon Clouds (Single InstancedMesh Draw Call) ---
    const puffGeo = new THREE.SphereGeometry(1, 18, 12);
    const cloudMat = new THREE.MeshLambertMaterial({
      color: '#FFFFFF',
      emissive: '#B6D3F5',
      emissiveIntensity: 0.62,
      fog: true,
    });
    this.geometries.push(puffGeo);
    this.materials.push(cloudMat);

    this.cloudMesh = new THREE.InstancedMesh(
      puffGeo,
      cloudMat,
      MAX_CLOUDS * PUFFS_PER_CLOUD,
    );
    this.cloudMesh.frustumCulled = false;

    // Golden-ratio spiral distribution for well-balanced cloud depth & spacing
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < MAX_CLOUDS; i++) {
      const frac = (i + 0.5) / MAX_CLOUDS;
      const radius = 28 + Math.sqrt(frac) * (SKY_RING_HALF - 34);
      const angle = i * goldenAngle + 0.4;
      const rx = Math.cos(angle) * radius;
      const rz = Math.sin(angle) * radius;

      const yaw = (i * 1.17) % (Math.PI * 2);
      const quat = new THREE.Quaternion().setFromAxisAngle(_UP_AXIS, yaw);
      const cluster: CloudCluster = {
        relX: rx,
        baseY: 17 + (i % 6) * 2.8,
        relZ: rz,
        cosYaw: Math.cos(yaw),
        sinYaw: Math.sin(yaw),
        quat,
        speed: 0.85 + (i % 5) * 0.22,
        scale: 0.92 + (i % 4) * 0.24,
        bobPhase: i * 0.9,
        puffs: CLOUD_ARCHETYPES[i % CLOUD_ARCHETYPES.length],
      };
      this.clouds.push(cluster);

      for (let p = 0; p < PUFFS_PER_CLOUD; p++) {
        const tint = cluster.puffs[p].tint;
        this._color.setRGB(tint * 0.99, tint * 0.995, Math.min(1, tint * 1.01));
        this.cloudMesh.setColorAt(i * PUFFS_PER_CLOUD + p, this._color);
      }
    }
    if (this.cloudMesh.instanceColor) {
      this.cloudMesh.instanceColor.needsUpdate = true;
    }

    this.setCloudQuality(initialCloudQuality);
    this.group.add(this.cloudMesh);
    this.updateCloudMatrices(0, 0);
  }

  public setCloudQuality(quality: CloudQuality): void {
    this.activeCloudCount = CLOUD_COUNTS[quality];
    this.cloudMesh.count = this.activeCloudCount * PUFFS_PER_CLOUD;
  }

  public update(dt: number, playerPos: THREE.Vector3, camera: THREE.Camera): void {
    this.elapsed += dt;

    // Position soft glowing sun texture at celestial offset and orient toward camera
    this.sunBillboard.position.set(
      playerPos.x + SUN_SKY_OFFSET.x,
      SUN_SKY_OFFSET.y,
      playerPos.z + SUN_SKY_OFFSET.z,
    );
    this.sunBillboard.quaternion.copy(camera.quaternion);
    const subtleBreath = 1 + Math.sin(this.elapsed * 0.42) * 0.012;
    this.sunBillboard.scale.setScalar(subtleBreath);

    // Drift clouds continuously with smooth wrap outside the fog horizon
    const dxPlayer = playerPos.x - this.lastPlayerX;
    const dzPlayer = playerPos.z - this.lastPlayerZ;
    this.lastPlayerX = playerPos.x;
    this.lastPlayerZ = playerPos.z;

    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      c.relX += c.speed * dt - dxPlayer;
      c.relZ += c.speed * 0.18 * dt - dzPlayer;

      if (c.relX > SKY_RING_HALF) c.relX -= SKY_RING_HALF * 2;
      else if (c.relX < -SKY_RING_HALF) c.relX += SKY_RING_HALF * 2;

      if (c.relZ > SKY_RING_HALF) c.relZ -= SKY_RING_HALF * 2;
      else if (c.relZ < -SKY_RING_HALF) c.relZ += SKY_RING_HALF * 2;
    }

    this.updateCloudMatrices(playerPos.x, playerPos.z);
  }

  private updateCloudMatrices(px: number, pz: number): void {
    let instanceIdx = 0;
    for (let i = 0; i < this.activeCloudCount; i++) {
      const c = this.clouds[i];
      const horizDist = Math.hypot(c.relX, c.relZ);
      // Smoothly taper scale near the far wrap ring so clouds never pop even if fog is off
      const boundaryFade = 1 - smoothstep(SKY_RING_HALF - 34, SKY_RING_HALF - 4, horizDist);
      const effectiveScale = c.scale * boundaryFade;

      const bobY = Math.sin(this.elapsed * 0.45 + c.bobPhase) * 0.18;
      const cx = px + c.relX;
      const cy = c.baseY + bobY;
      const cz = pz + c.relZ;
      const cosY = c.cosYaw;
      const sinY = c.sinYaw;

      for (let p = 0; p < PUFFS_PER_CLOUD; p++) {
        const puff = c.puffs[p];
        const ox = puff.ox * effectiveScale;
        const oy = puff.oy * effectiveScale;
        const oz = puff.oz * effectiveScale;

        this._dummyPos.set(
          cx + ox * cosY + oz * sinY,
          cy + oy,
          cz - ox * sinY + oz * cosY,
        );
        this._dummyScale.set(
          puff.sx * effectiveScale,
          puff.sy * effectiveScale,
          puff.sz * effectiveScale,
        );
        this._dummyMat.compose(this._dummyPos, c.quat, this._dummyScale);
        this.cloudMesh.setMatrixAt(instanceIdx++, this._dummyMat);
      }
    }
    this.cloudMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose(): void {
    this.cloudMesh.dispose();
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
  }
}
