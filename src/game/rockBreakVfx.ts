import * as THREE from 'three';

const MAX_BURSTS = 6;
const MAX_CRACKS = 8;
const MAX_PLATES = 7;
const MAX_SHARDS = 14;

interface RockShard {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  baseScale: number;
  bounced: boolean;
}

interface GroundCrackPlate {
  mesh: THREE.Mesh;
  baseScale: number;
}

interface RockBreakBurst {
  active: boolean;
  group: THREE.Group;
  crackRing: THREE.Mesh;
  crackRingMat: THREE.MeshBasicMaterial;
  plateMats: [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial];
  shardMats: [
    THREE.MeshStandardMaterial,
    THREE.MeshStandardMaterial,
    THREE.MeshStandardMaterial,
  ];
  crackPlates: GroundCrackPlate[];
  shards: RockShard[];
  cracks: THREE.Mesh[];
  crackMat: THREE.MeshBasicMaterial;
  activeCrackCount: number;
  activePlateCount: number;
  activeShardCount: number;
  elapsed: number;
  duration: number;
  peakScale: number;
}

/**
 * Cartoon-style 3D Rock Break VFX System.
 * Triggers exclusively on heavy ground impacts, scaled by impact force,
 * spawning animated radial cracks, broken stone plates, and flying rock fragments.
 */
export class RockBreakVfxSystem {
  public readonly group = new THREE.Group();

  private readonly burstPool: RockBreakBurst[] = [];
  private readonly shardGeoA = new THREE.DodecahedronGeometry(0.18, 0);
  private readonly shardGeoB = new THREE.BoxGeometry(0.24, 0.16, 0.22);
  private readonly plateGeo = new THREE.BoxGeometry(0.55, 0.08, 0.42);
  private readonly ringGeo = new THREE.RingGeometry(0.32, 0.96, 14);
  private readonly crackLineGeo = new THREE.PlaneGeometry(0.11, 1.0);

  constructor() {
    this.ringGeo.rotateX(-Math.PI / 2);
    this.crackLineGeo.rotateX(-Math.PI / 2);

    for (let b = 0; b < MAX_BURSTS; b++) {
      const burst = this.createBurstSlot();
      burst.group.visible = false;
      this.group.add(burst.group);
      this.burstPool.push(burst);
    }
  }

  private createBurstSlot(): RockBreakBurst {
    const burstGroup = new THREE.Group();

    const crackRingMat = new THREE.MeshBasicMaterial({
      color: '#0D1322',
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const crackRing = new THREE.Mesh(this.ringGeo, crackRingMat);
    crackRing.position.y = 0.012;
    burstGroup.add(crackRing);

    const crackMat = new THREE.MeshBasicMaterial({
      color: '#0A0D18',
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const cracks: THREE.Mesh[] = [];
    for (let i = 0; i < MAX_CRACKS; i++) {
      const crack = new THREE.Mesh(this.crackLineGeo, crackMat);
      crack.visible = false;
      burstGroup.add(crack);
      cracks.push(crack);
    }

    const plateMats: [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial] = [
      new THREE.MeshStandardMaterial({
        color: '#3E4B68',
        roughness: 0.85,
        metalness: 0.08,
        flatShading: true,
        transparent: true,
        opacity: 0.96,
      }),
      new THREE.MeshStandardMaterial({
        color: '#2C3752',
        roughness: 0.85,
        metalness: 0.08,
        flatShading: true,
        transparent: true,
        opacity: 0.96,
      }),
    ];

    const crackPlates: GroundCrackPlate[] = [];
    for (let i = 0; i < MAX_PLATES; i++) {
      const plate = new THREE.Mesh(this.plateGeo, plateMats[i % 2]);
      plate.castShadow = false;
      plate.receiveShadow = true;
      plate.visible = false;
      burstGroup.add(plate);
      crackPlates.push({ mesh: plate, baseScale: 1 });
    }

    const shardMats: [
      THREE.MeshStandardMaterial,
      THREE.MeshStandardMaterial,
      THREE.MeshStandardMaterial,
    ] = [
      new THREE.MeshStandardMaterial({
        color: '#506084',
        roughness: 0.82,
        metalness: 0.08,
        flatShading: true,
        transparent: true,
        opacity: 1,
      }),
      new THREE.MeshStandardMaterial({
        color: '#36425E',
        roughness: 0.82,
        metalness: 0.08,
        flatShading: true,
        transparent: true,
        opacity: 1,
      }),
      new THREE.MeshStandardMaterial({
        color: '#252E44',
        roughness: 0.82,
        metalness: 0.08,
        flatShading: true,
        transparent: true,
        opacity: 1,
      }),
    ];

    const shards: RockShard[] = [];
    for (let i = 0; i < MAX_SHARDS; i++) {
      const mesh = new THREE.Mesh(
        i % 2 === 0 ? this.shardGeoA : this.shardGeoB,
        shardMats[i % 3],
      );
      mesh.visible = false;
      burstGroup.add(mesh);
      shards.push({
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        baseScale: 1,
        bounced: false,
      });
    }

    return {
      active: false,
      group: burstGroup,
      crackRing,
      crackRingMat,
      plateMats,
      shardMats,
      crackPlates,
      shards,
      cracks,
      crackMat,
      activeCrackCount: 0,
      activePlateCount: 0,
      activeShardCount: 0,
      elapsed: 0,
      duration: 1.85,
      peakScale: 1,
    };
  }

  /**
   * @param pos World ground point of the heavy impact
   * @param force Scale factor (~0.8 small-heavy slam .. 2.4 massive meteor/dive)
   * @param accentHex Optional impact rim tint (e.g. crater glow)
   */
  public spawnImpact(
    pos: THREE.Vector3,
    force = 1.0,
    accentHex = '#0D1322',
  ): void {
    // Select first inactive slot, or recycle oldest active burst
    let b: RockBreakBurst | null = null;
    let oldest = this.burstPool[0];
    for (let i = 0; i < this.burstPool.length; i++) {
      const slot = this.burstPool[i];
      if (!slot.active) {
        b = slot;
        break;
      }
      if (slot.elapsed > oldest.elapsed) {
        oldest = slot;
      }
    }
    if (!b) b = oldest;

    const clampedForce = THREE.MathUtils.clamp(force, 0.7, 2.6);
    b.active = true;
    b.elapsed = 0;
    b.duration = 1.55 + clampedForce * 0.3;
    b.peakScale = clampedForce;

    b.group.position.set(pos.x, Math.max(0.015, pos.y + 0.015), pos.z);
    b.group.visible = true;

    // 1. Cartoon dark crater outline ring expanding briefly on impact
    b.crackRingMat.color.set(accentHex);
    b.crackRingMat.opacity = 0.88;
    b.crackRing.scale.setScalar(0.35 * clampedForce);

    // 2. Jagged cartoon ground crack lines radiating outward
    b.crackMat.opacity = 0.92;
    const crackCount = clampedForce > 1.35 ? 8 : 6;
    b.activeCrackCount = crackCount;
    for (let i = 0; i < MAX_CRACKS; i++) {
      const crack = b.cracks[i];
      if (i >= crackCount) {
        crack.visible = false;
        continue;
      }
      const angle = (i / crackCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.34;
      const len = (1.1 + Math.random() * 0.95) * clampedForce;
      crack.position.set(
        Math.cos(angle) * len * 0.45,
        0.016,
        Math.sin(angle) * len * 0.45,
      );
      crack.rotation.y = -angle + Math.PI * 0.5;
      crack.scale.set(0.75 + Math.random() * 0.45, 0.01, len);
      crack.visible = true;
    }

    // 3. Tilted broken ground stone plates around epicenter
    const plateCount = Math.min(MAX_PLATES, Math.round(3 + clampedForce * 2));
    b.activePlateCount = plateCount;
    b.plateMats[0].opacity = 0.96;
    b.plateMats[1].opacity = 0.96;
    for (let i = 0; i < MAX_PLATES; i++) {
      const pl = b.crackPlates[i];
      if (i >= plateCount) {
        pl.mesh.visible = false;
        continue;
      }
      const angle = (i / plateCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.32;
      const dist = (0.48 + Math.random() * 0.45) * clampedForce;
      pl.mesh.position.set(
        Math.cos(angle) * dist,
        0.03,
        Math.sin(angle) * dist,
      );
      pl.mesh.rotation.y = -angle + (Math.random() - 0.5) * 0.4;
      pl.mesh.rotation.x = 0.24 + Math.random() * 0.22;
      const s = (0.78 + Math.random() * 0.45) * Math.sqrt(clampedForce);
      pl.mesh.scale.setScalar(s);
      pl.baseScale = s;
      pl.mesh.visible = true;
    }

    // 4. Flying cartoon rock fragments (eruption with gravity + bounce)
    const shardCount = Math.min(MAX_SHARDS, Math.round(6 + clampedForce * 4));
    b.activeShardCount = shardCount;
    b.shardMats[0].opacity = 1;
    b.shardMats[1].opacity = 1;
    b.shardMats[2].opacity = 1;
    for (let i = 0; i < MAX_SHARDS; i++) {
      const sh = b.shards[i];
      if (i >= shardCount) {
        sh.mesh.visible = false;
        continue;
      }
      const angle = Math.random() * Math.PI * 2;
      const radialSpeed = (2.4 + Math.random() * 4.2) * Math.sqrt(clampedForce);
      const upSpeed = (4.6 + Math.random() * 4.4) * Math.sqrt(clampedForce);
      const spawnDist = (0.15 + Math.random() * 0.5) * clampedForce;
      sh.mesh.position.set(
        Math.cos(angle) * spawnDist,
        0.12 + Math.random() * 0.22,
        Math.sin(angle) * spawnDist,
      );
      sh.mesh.rotation.set(0, 0, 0);
      const baseScale = (0.7 + Math.random() * 0.72) * (0.75 + clampedForce * 0.26);
      sh.mesh.scale.setScalar(baseScale);
      sh.mesh.visible = true;
      sh.vx = Math.cos(angle) * radialSpeed;
      sh.vy = upSpeed;
      sh.vz = Math.sin(angle) * radialSpeed;
      sh.rx = (Math.random() - 0.5) * 11;
      sh.ry = (Math.random() - 0.5) * 11;
      sh.rz = (Math.random() - 0.5) * 11;
      sh.baseScale = baseScale;
      sh.bounced = false;
    }
  }

  public update(dt: number): void {
    const safeDt = Math.min(dt, 0.05);
    const gravity = -24.0;

    for (let i = 0; i < this.burstPool.length; i++) {
      const b = this.burstPool[i];
      if (!b.active) continue;

      b.elapsed += safeDt;
      const t = Math.min(1, b.elapsed / b.duration);

      // Ring pops outward immediately in first 0.25s, then fades cleanly
      const ringExpand = 0.4 + Math.min(1, b.elapsed / 0.24) * 1.45 * b.peakScale;
      b.crackRing.scale.setScalar(ringExpand);
      b.crackRingMat.opacity = Math.max(0, (1 - Math.min(1, b.elapsed / 0.65)) * 0.78);

      // Ground cracks hold solid briefly then fade out in final 45%
      const crackAlpha = t < 0.55 ? 0.92 : Math.max(0, 1 - (t - 0.55) / 0.45) * 0.92;
      b.crackMat.opacity = crackAlpha;
      const crackGrow = Math.min(1, b.elapsed / 0.09);
      for (let c = 0; c < b.activeCrackCount; c++) {
        b.cracks[c].scale.y = Math.max(0.01, crackGrow);
      }

      // Ground plates settle and fade near the end
      const plateAlpha = t < 0.6 ? 0.96 : Math.max(0, 1 - (t - 0.6) / 0.4) * 0.96;
      b.plateMats[0].opacity = plateAlpha;
      b.plateMats[1].opacity = plateAlpha;
      if (t > 0.72) {
        const shrink = 1 - (t - 0.72) / 0.28;
        for (let p = 0; p < b.activePlateCount; p++) {
          const pl = b.crackPlates[p];
          pl.mesh.scale.setScalar(Math.max(0.01, pl.baseScale * shrink));
        }
      }

      // Flying rock fragments obey ballistic arc + crisp bounce + shrink fade
      const fade = t < 0.58 ? 1 : Math.max(0, 1 - (t - 0.58) / 0.42);
      b.shardMats[0].opacity = fade;
      b.shardMats[1].opacity = fade;
      b.shardMats[2].opacity = fade;
      const scaleFactor = 0.25 + 0.75 * fade;

      for (let s = 0; s < b.activeShardCount; s++) {
        const sh = b.shards[s];
        sh.vy += gravity * safeDt;
        sh.mesh.position.x += sh.vx * safeDt;
        sh.mesh.position.y += sh.vy * safeDt;
        sh.mesh.position.z += sh.vz * safeDt;

        sh.mesh.rotation.x += sh.rx * safeDt;
        sh.mesh.rotation.y += sh.ry * safeDt;
        sh.mesh.rotation.z += sh.rz * safeDt;

        if (sh.mesh.position.y <= 0.07) {
          sh.mesh.position.y = 0.07;
          if (!sh.bounced && sh.vy < -1.5) {
            sh.vy = Math.abs(sh.vy) * 0.34;
            sh.vx *= 0.52;
            sh.vz *= 0.52;
            sh.rx *= 0.45;
            sh.ry *= 0.45;
            sh.rz *= 0.45;
            sh.bounced = true;
          } else {
            sh.vy = 0;
            sh.vx *= 0.84;
            sh.vz *= 0.84;
            sh.rx *= 0.7;
            sh.ry *= 0.7;
            sh.rz *= 0.7;
          }
        }

        sh.mesh.scale.setScalar(Math.max(0.01, sh.baseScale * scaleFactor));
      }

      if (b.elapsed >= b.duration) {
        b.active = false;
        b.group.visible = false;
      }
    }
  }

  public dispose(): void {
    for (const b of this.burstPool) {
      b.active = false;
      b.group.visible = false;
      b.crackRingMat.dispose();
      b.crackMat.dispose();
      b.plateMats[0].dispose();
      b.plateMats[1].dispose();
      b.shardMats[0].dispose();
      b.shardMats[1].dispose();
      b.shardMats[2].dispose();
    }
    this.burstPool.length = 0;
    this.shardGeoA.dispose();
    this.shardGeoB.dispose();
    this.plateGeo.dispose();
    this.ringGeo.dispose();
    this.crackLineGeo.dispose();
  }
}
