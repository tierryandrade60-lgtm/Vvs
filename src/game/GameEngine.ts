import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CharacterAnimator, CharacterMotionState } from './characterAnimator';
import {
  CHARACTER_PRESETS,
  CharacterAppearance,
  CharacterArchetype,
  CharacterSkinId,
  PhoenixSkinVariant,
  resolveCharacterAppearance,
} from './characterConfig';
import {
  DEFAULT_GRAPHICS_SETTINGS,
  GraphicsSettings,
  ResolutionScale,
  ShadowQuality,
} from './graphicsSettings';
import { LandingDustSystem } from './landingDust';
import { NpcCombatSystem, NpcEliminationEvent, NpcHudSnapshot } from './npcSystem';
import { PlayableAiEnemySystem } from './aiEnemySystem';
import { RockBreakVfxSystem } from './rockBreakVfx';
import {
  SHIELD_COLORS,
  SHIELD_MAX_DURABILITY,
  ShieldHitVfxSystem,
  ShieldKind,
} from './shieldHitVfx';
import { PLAYER_SPAWN_POINTS, SpawnPadVfxSystem } from './spawnEffectVfx';
import {
  ActiveStatusEffect,
  MultiKillEvent,
  PlayerCombatTelemetry,
  ProtectedTagSnapshot,
} from './statusEffectTypes';
import {
  HandFireAura,
  PAIN_INFLICTION_EXPLOSION_RADIUS,
  PHOENIX_WAVE_RADIUS,
  PhoenixVfxSystem,
  PhoenixWings,
} from './phoenixAbilities';
import {
  BASEPLATE_BORDER_HEIGHT,
  BASEPLATE_HALF_INNER,
  BASEPLATE_HALF_OUTER,
  CharacterPhysics,
} from './physics';
import {
  createBaseplateTopTexture,
  createBaseplateTrimTexture,
  createContactShadowTexture,
  createSkyDomeTexture,
} from './pixelTextures';
import { createR16Character } from './r16Character';
import { R16Ragdoll } from './ragdoll';
import {
  CHAOS_EXPLOSION_RADIUS,
  ChaosDrainBeamVfx,
  CombatTargetProbe,
  DarkholdBookVfx,
  HandChaosAura,
  SCARLET_FLIGHT_CANCEL_RADIUS,
  ScarletShieldVfx,
  ScarletWitchVfxSystem,
  StoneChaosExplosionVfx,
  TELEKINETIC_EXPLOSION_RADIUS,
} from './scarletWitchAbilities';
import {
  AGATHA_BOLT_SPLASH_RADIUS,
  AgathaVfxSystem,
  HandAgathaAura,
} from './agathaAbilities';
import { EmmaFrostVfxSystem, EmmaIdleForeheadRings } from './emmaFrostAbilities';
import { HelaVfxSystem } from './helaAbilities';
import { MagnetoVfxSystem } from './magnetoAbilities';
import { QuicksilverVfxSystem } from './quicksilverAbilities';
import { DoctorStrangeVfxSystem } from './doctorStrangeAbilities';
import { VisionVfxSystem } from './visionAbilities';
import { InvisibleWomanVfxSystem } from './invisibleWomanAbilities';
import {
  AGATHA_DARKHOLD_DURATION_MS,
  AGATHA_SHIELD_DURATION_MS,
  AUTO_SHIELD_DURATION_MS,
  AUTO_SHIELD_MAX_ABSORB,
  DARKHOLD_DURATION_MS,
  EMMA_ASTRAL_MAX_DURATION_MS,
  EMMA_DIAMOND_DURATION_MS,
  EMMA_MC_MENTAL_DMG_MS,
  EMMA_MC_PARALYSIS_MS,
  EMMA_MC_SLEEP_MS,
  FORCEFIELD_BARRIER_LOCK_MS,
  FORCEFIELD_EFFECT_DURATION_MS,
  FORCEFIELD_SHIELD_DURATION_MS,
  FORCEFIELD_SHIELD_MAX_DURABILITY,
  FORCEFIELD_TRANSFER_COOLDOWN_MS,
  HELA_CROWN_BONUS_DAMAGE,
  HELA_CROWN_DURATION_MS,
  HELA_SWORD_APPEAR_MS,
  HELA_SWORD_SLASH_COOLDOWN_MS,
  HELA_SWORD_SUMMON_DURATION_MS,
  HELA_SWORD_THROW_READY_MS,
  INVISIBILITY_MAX_DURATION_MS,
  MAGNETO_TORNADO_DURATION_MS,
  PHOENIX_SPECIAL_REVIVAL_COOLDOWN_MS,
  QUICKSILVER_COMBO_DURATION_MS,
  QUICKSILVER_TORNADO_MAX_DURATION_MS,
  STRANGE_SHIELD_MAX_DURATION_MS,
  VISION_HEAD_GRIP_DURATION_MS,
  VISION_INTANGIBLE_MAX_DURATION_MS,
  VISION_LASER_DURATION_MS,
  VISION_MIND_BOLT_CHARGE_MS,
} from './abilityConfig';
import { CinematicFxController, ScreenFxState } from './cinematicFx';
import { SkyAtmosphere, SUN_LIGHT_DIR } from './skyAtmosphere';
import { WindTrailSystem } from './windTrails';

export interface EngineCallbacks {
  onContextLost?: () => void;
  onContextRestored?: () => void;
  onJump?: () => void;
  onLandDust?: (intensity: number) => void;
  onHitTarget?: () => void;
  onTeleportStart?: () => void;
  onTeleportArrive?: () => void;
  onTeleportLockChange?: (locked: boolean) => void;
  onChaosImplosionAbsorb?: () => void;
  onScarletFlightCancelShockwave?: () => void;
  onDarkholdChange?: (active: boolean, triggerCooldown: boolean) => void;
  onTelekineticExplosion?: () => void;
  onAutoShieldChange?: (active: boolean) => void;
  onAutoShieldDeflect?: () => void;
  onPhoenixWaveCast?: () => void;
  onPhoenixWaveStep?: (stepIdx: number) => void;
  onPhoenixFireballHit?: () => void;
  onBurnTick?: () => void;
  onPainInflictionTick?: () => void;
  onPainInflictionExplosion?: () => void;
  onPainInflictionChange?: (active: boolean, triggerCooldown: boolean) => void;
  onRevivalStart?: () => void;
  onPhoenixSpecialRevival?: (phase: 'rise' | 'manifest' | 'end') => void;
  onPhoenixDiveChange?: (
    phase: 'idle' | 'ascending' | 'hovering' | 'diving',
    triggerCooldown: boolean,
  ) => void;
  onFlightForceChange?: (active: boolean) => void;
  onMindControlChange?: (
    phase: 'idle' | 'choosing' | 'paralysis' | 'sleep' | 'mental-damage',
    triggerCooldown: boolean,
  ) => void;
  onMentalAttackImpact?: () => void;
  onDiamondFormChange?: (active: boolean, triggerCooldown: boolean) => void;
  onDiamondProjectileImpact?: () => void;
  onTelepathicWaveChange?: (active: boolean, triggerCooldown: boolean) => void;
  onAstralProjectionChange?: (active: boolean, triggerCooldown: boolean) => void;
  onAstralPhaseChange?: (
    phase: 'idle' | 'projecting' | 'returning',
    triggerCooldown: boolean,
  ) => void;
  onCrownFormChange?: (active: boolean, triggerCooldown: boolean) => void;
  onSwordSummonChange?: (active: boolean, triggerCooldown: boolean) => void;
  onSwordThrowAvailabilityChange?: (ready: boolean) => void;
  onSwordSlash?: () => void;
  onSwordEmbed?: () => void;
  onGreenExplosion?: (phase: 'charge' | 'detonate') => void;
  onSpinningLeap?: (phase: 'launch' | 'land') => void;
  onGroundSword?: () => void;
  onAbilityFeedback?: (message: string) => void;
  onMagnetoMeteorStage?: (stage: 'charge' | 'launch' | 'impact') => void;
  onMagnetoTornadoChange?: (active: boolean, triggerCooldown: boolean) => void;
  onMagnetoThrow?: () => void;
  onSuperSpeedChange?: (active: boolean) => void;
  onWindTornadoChange?: (active: boolean, triggerCooldown: boolean) => void;
  onRapidPunchChange?: (active: boolean, triggerCooldown: boolean) => void;
  onSpeedBlitzChange?: (active: boolean, triggerCooldown: boolean) => void;
  onRapidPunchStrike?: (finisher: boolean) => void;
  onTimeStopCast?: () => void;
  onStrangeShieldChange?: (active: boolean, triggerCooldown: boolean) => void;
  onStrangeDiscCast?: () => void;
  onStrangeDiscImpact?: () => void;
  onStrangeClonesCast?: () => void;
  onAstralExtractionCast?: () => void;
  onVisionPhaseChange?: (active: boolean, triggerCooldown: boolean) => void;
  onVisionLaserChange?: (active: boolean, triggerCooldown: boolean) => void;
  onVisionBoltSmallCast?: () => void;
  onVisionBoltCharge?: () => void;
  onVisionBoltCast?: () => void;
  onVisionBoltExplode?: () => void;
  onVisionBoltCooldown?: () => void;
  onVisionHeadGripChange?: (active: boolean, triggerCooldown: boolean) => void;
  onAgathaDarkholdChange?: (active: boolean, triggerCooldown: boolean) => void;
  onAgathaAutoShieldChange?: (active: boolean) => void;
  onAgathaShieldChange?: (active: boolean, triggerCooldown: boolean) => void;
  onAgathaShieldDrainTrigger?: () => void;
  onSupremeDrainChange?: (active: boolean) => void;
  onSupremeStacksChange?: (stacks: number) => void;
  onZombieBeamChange?: (active: boolean, triggerCooldown: boolean) => void;
  onZombieStoneExplosionChange?: (active: boolean, triggerCooldown: boolean) => void;
  onPurgatoryGraspCast?: () => void;
  onInvisibilityChange?: (active: boolean, triggerCooldown: boolean) => void;
  onForcefieldShieldChange?: (active: boolean, triggerCooldown: boolean) => void;
  onForcefieldTransferPhaseChange?: (
    phase: 'idle' | 'choosing' | 'protection' | 'suffocation',
  ) => void;
  onForcefieldTransferCooldownStart?: () => void;
  onForcefieldBarrierCast?: () => void;
  onForcefieldBarrierHit?: () => void;
  onForcefieldBarrierLockChange?: (locked: boolean) => void;
  onNpcStrikePlayer?: (kind: 'weapon' | 'punch') => void;
  onPlayerDeath?: () => void;
  onScreenFxUpdate?: (fx: ScreenFxState) => void;
  onNpcEliminated?: (events: NpcEliminationEvent[]) => void;
  onNpcHudUpdate?: (snapshots: NpcHudSnapshot[]) => void;
  onPlayerHealthChange?: (hp: number, maxHp: number) => void;
  onPlayerHeal?: (amount: number) => void;
  onStaminaChange?: (stamina: number, maxStamina: number, regenDelayRemaining: number) => void;
  onSprintForceChange?: (active: boolean) => void;
  onPlayerTelemetryUpdate?: (telemetry: PlayerCombatTelemetry) => void;
  onMultiKill?: (event: MultiKillEvent) => void;
}

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

const TELEPORT_PREPARE_SEC = 0.5;
const TELEPORT_REVEAL_SEC = 0.22;
const TELEPORT_MAX_DISTANCE = 16.0;
const IMPLOSION_MAX_DISTANCE = 22.0;

interface ScheduledWave {
  remainingSec: number;
  stepIdx: number;
  position: THREE.Vector3;
  forward: THREE.Vector3;
}

export class GameEngine {
  private readonly container: HTMLElement;
  private readonly callbacks: EngineCallbacks;

  private readonly isSoftwareGl: boolean;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly sunLight: THREE.DirectionalLight;
  private readonly distanceFog: THREE.Fog;
  private graphicsSettings: GraphicsSettings;

  private readonly physics: CharacterPhysics;
  private archetype: CharacterArchetype;
  private skinVariant: PhoenixSkinVariant;
  private skinId?: CharacterSkinId;
  private currentAppearance: CharacterAppearance;
  private rig: ReturnType<typeof createR16Character>;
  private animator: CharacterAnimator;
  private ragdoll: R16Ragdoll;

  // Scarlet Witch & Agatha Harkness auras & VFX
  private leftHandAura: HandChaosAura | null = null;
  private rightHandAura: HandChaosAura | null = null;
  private leftAgathaAura: HandAgathaAura | null = null;
  private rightAgathaAura: HandAgathaAura | null = null;
  private vfx: ScarletWitchVfxSystem;
  private chaosDrainBeamVfx: ChaosDrainBeamVfx;
  private readonly stoneExplosionVfx: StoneChaosExplosionVfx;
  private readonly agathaVfx: AgathaVfxSystem;
  private readonly darkholdBook: DarkholdBookVfx;
  private readonly scarletShield: ScarletShieldVfx;
  private readonly agathaDarkholdBook: DarkholdBookVfx;
  private readonly agathaDarkholdShield: ScarletShieldVfx;

  // Phoenix Force auras, wings & VFX
  private leftFireAura: HandFireAura | null = null;
  private rightFireAura: HandFireAura | null = null;
  private phoenixWings: PhoenixWings | null = null;
  private phoenixVfx: PhoenixVfxSystem;
  private wingsAlwaysVisible = false;

  // Emma Frost, Hela & 4 New Heroes VFX
  private readonly emmaVfx: EmmaFrostVfxSystem;
  private readonly emmaIdleRings: EmmaIdleForeheadRings;
  private readonly helaVfx: HelaVfxSystem;
  private readonly magnetoVfx: MagnetoVfxSystem;
  private readonly quicksilverVfx: QuicksilverVfxSystem;
  private readonly strangeVfx: DoctorStrangeVfxSystem;
  private readonly visionVfx: VisionVfxSystem;
  private readonly invisibleVfx: InvisibleWomanVfxSystem;

  // Shared landing dust, world VFX & combat targets
  private readonly landingDust: LandingDustSystem;
  private readonly npcs: NpcCombatSystem;
  private readonly aiEnemies: PlayableAiEnemySystem;
  private readonly rockBreakVfx: RockBreakVfxSystem;
  private readonly shieldHitVfx: ShieldHitVfxSystem;
  private readonly spawnPadVfx: SpawnPadVfxSystem;

  private readonly contactShadow: THREE.Mesh;
  private readonly skyDome: THREE.Mesh;
  private readonly skyAtmosphere: SkyAtmosphere;
  private readonly windTrails: WindTrailSystem;
  private readonly fx = new CinematicFxController();
  private readonly abilityLight: THREE.PointLight;

  private readonly disposableGeometries: THREE.BufferGeometry[] = [];
  private readonly disposableMaterials: THREE.Material[] = [];
  private readonly disposableTextures: THREE.Texture[] = [];
  private readonly envRT: THREE.WebGLRenderTarget;

  // Input & lifecycle state
  private joyX = 0;
  private joyY = 0;
  private keyForward = 0;
  private keyRight = 0;
  private jumpQueued = false;
  private sprintEnabled = false;
  private flightEnabled = false;
  private dead = false;
  private controlsEnabled = true;
  private wasGrounded = true;

  // Combat & Ability state
  private playerMaxHp = 250;
  private playerHp = 250;
  private damageMultiplier = 1.0;
  private invulnerable = false;
  private nextBoltHand: 'right' | 'left' = 'right';
  private handFlareLeft = 0;
  private handFlareRight = 0;

  // Phoenix Force / Dark Phoenix 60s Special Revival
  private lastPhoenixRevivalMs = -Infinity;
  private phoenixRevivalState: {
    phase: 'idle' | 'rising' | 'manifest';
    elapsed: number;
    spherePos: THREE.Vector3;
    anchorPos: THREE.Vector3;
    tickAccum: number;
  } = {
    phase: 'idle',
    elapsed: 0,
    spherePos: new THREE.Vector3(0, 0.4, 0),
    anchorPos: new THREE.Vector3(0, 5.4, 0),
    tickAccum: 0,
  };

  // Phoenix Force / Dark Phoenix / White Phoenix Flight Dive
  private phoenixDiveState: {
    phase: 'idle' | 'ascending' | 'hovering' | 'diving';
    elapsed: number;
    startPos: THREE.Vector3;
    peakPos: THREE.Vector3;
    aimGroundPos: THREE.Vector3;
    diveStartPos: THREE.Vector3;
    diveDuration: number;
  } = {
    phase: 'idle',
    elapsed: 0,
    startPos: new THREE.Vector3(),
    peakPos: new THREE.Vector3(),
    aimGroundPos: new THREE.Vector3(),
    diveStartPos: new THREE.Vector3(),
    diveDuration: 0.42,
  };

  private scheduledWaves: ScheduledWave[] = [];
  private painState: {
    active: boolean;
    targetId: string | null;
    elapsed: number;
    tickAccum: number;
    ticksDone: number;
    lastTargetPos: THREE.Vector3;
  } = {
    active: false,
    targetId: null,
    elapsed: 0,
    tickAccum: 0,
    ticksDone: 0,
    lastTargetPos: new THREE.Vector3(),
  };

  private teleportState: {
    phase: 'idle' | 'preparing' | 'revealing';
    elapsed: number;
    destination: THREE.Vector3;
  } = {
    phase: 'idle',
    elapsed: 0,
    destination: new THREE.Vector3(),
  };

  private darkholdState = {
    active: false,
    elapsed: 0,
  };

  private shieldState = {
    active: false,
    elapsed: 0,
    absorbRemaining: AUTO_SHIELD_MAX_ABSORB,
  };

  // Emma Frost state
  private mindControlState: {
    phase: 'idle' | 'choosing' | 'paralysis' | 'sleep' | 'mental-damage';
    targetId: string | null;
    elapsed: number;
    dmgAccum: number;
    paralysisTargetId: string | null;
    paralysisRemaining: number;
  } = {
    phase: 'idle',
    targetId: null,
    elapsed: 0,
    dmgAccum: 0,
    paralysisTargetId: null,
    paralysisRemaining: 0,
  };

  private diamondState = {
    active: false,
    elapsed: 0,
    blend: 0,
    absorbRemaining: SHIELD_MAX_DURABILITY['diamond-form'],
  };

  private telepathicWaveState = {
    active: false,
    elapsed: 0,
    ringAccum: 0,
    tickAccum: 0,
  };

  private astralState: {
    phase: 'idle' | 'projecting' | 'returning';
    elapsed: number;
    returnElapsed: number;
    returnDuration: number;
    returnStartPos: THREE.Vector3;
    bodyPos: THREE.Vector3;
    bodyYaw: number;
    bodyRig: ReturnType<typeof createR16Character> | null;
    bodyAnimator: CharacterAnimator | null;
    preFlight: boolean;
    bodyHits: number;
    bodyHitFlashTimer: number;
  } = {
    phase: 'idle',
    elapsed: 0,
    returnElapsed: 0,
    returnDuration: 0.42,
    returnStartPos: new THREE.Vector3(),
    bodyPos: new THREE.Vector3(),
    bodyYaw: 0,
    bodyRig: null,
    bodyAnimator: null,
    preFlight: false,
    bodyHits: 0,
    bodyHitFlashTimer: 0,
  };

  // Hela state
  private crownState = {
    active: false,
    elapsed: 0,
    blend: 0,
  };

  private swordSummonState: {
    active: boolean;
    elapsed: number;
    leftInHand: boolean;
    rightInHand: boolean;
    nextThrowHand: 'right' | 'left';
    reloadHand: 'right' | 'left' | null;
    throwReady: boolean;
    reloadElapsed: number;
    reloading: boolean;
    slashCooldownRemaining: number;
  } = {
    active: false,
    elapsed: 0,
    leftInHand: false,
    rightInHand: false,
    nextThrowHand: 'right',
    reloadHand: null,
    throwReady: false,
    reloadElapsed: 0,
    reloading: false,
    slashCooldownRemaining: 0,
  };

  private greenChargeState = {
    active: false,
    elapsed: 0,
  };

  private spinningLeapState = {
    active: false,
    elapsed: 0,
  };

  // Magneto state
  private magnetoShieldState = {
    active: false,
    elapsed: 0,
  };
  private magnetoTornadoState = {
    active: false,
    elapsed: 0,
  };
  private magnetoMeteorActive = false;
  private magnetoPreFlight = false;
  private nextMagnetoHand: 'right' | 'left' = 'right';

  // Quicksilver state
  private superSpeedState = {
    active: false,
  };
  private rapidPunchState: {
    active: boolean;
    targetId: string | null;
    elapsed: number;
    punchAccum: number;
    finished: boolean;
    sideSign: number;
  } = {
    active: false,
    targetId: null,
    elapsed: 0,
    punchAccum: 0,
    finished: false,
    sideSign: 1,
  };
  private windTornadoState = {
    active: false,
    elapsed: 0,
    center: new THREE.Vector3(),
    angle: 0,
  };
  private speedBlitzState: {
    active: boolean;
    origin: THREE.Vector3;
    totalTravel: number;
    hitsDone: number;
    hitIds: Set<string>;
    hopStartPos: THREE.Vector3;
    hopDestPos: THREE.Vector3;
    hopTargetId: string | null;
    hopElapsed: number;
    hopDuration: number;
    hopPunched: boolean;
    sideSign: number;
  } = {
    active: false,
    origin: new THREE.Vector3(),
    totalTravel: 0,
    hitsDone: 0,
    hitIds: new Set<string>(),
    hopStartPos: new THREE.Vector3(),
    hopDestPos: new THREE.Vector3(),
    hopTargetId: null,
    hopElapsed: 0,
    hopDuration: 0.095,
    hopPunched: false,
    sideSign: 1,
  };

  // Doctor Strange & Ancient One state
  private strangeShieldState = {
    active: false,
    elapsed: 0,
    absorbRemaining: SHIELD_MAX_DURABILITY['mystic-shield'],
  };
  private astralExtractionState: {
    active: boolean;
    targetId: string | null;
    elapsed: number;
    impactApplied: boolean;
    targetPos: THREE.Vector3;
    targetYaw: number;
    knockAxis: THREE.Vector3;
  } = {
    active: false,
    targetId: null,
    elapsed: 0,
    impactApplied: false,
    targetPos: new THREE.Vector3(),
    targetYaw: 0,
    knockAxis: new THREE.Vector3(0, 0, -1),
  };

  // Vision state
  private visionIntangibleState = {
    active: false,
    elapsed: 0,
    blend: 0,
  };
  private visionLaserState = {
    active: false,
    elapsed: 0,
  };
  private visionBoltChargeState = {
    active: false,
    elapsed: 0,
  };
  private visionBoltShotCount = 0;
  private visionHeadGripState: {
    active: boolean;
    targetId: string | null;
    elapsed: number;
    tickAccum: number;
    ticksDone: number;
    slammed: boolean;
    lockedPos: THREE.Vector3;
  } = {
    active: false,
    targetId: null,
    elapsed: 0,
    tickAccum: 0,
    ticksDone: 0,
    slammed: false,
    lockedPos: new THREE.Vector3(),
  };

  // Supreme Sorceress, Wanda Zombie, Agatha Harkness & Purgatory's Grasp state
  private supremeDrainState: {
    active: boolean;
    targetId: string | null;
    dmgAccum: number;
    stackAccum: number;
    stacks: number;
  } = {
    active: false,
    targetId: null,
    dmgAccum: 0,
    stackAccum: 0,
    stacks: 0,
  };
  private zombieBeamState: {
    active: boolean;
    targetId: string | null;
    elapsed: number;
    dmgAccum: number;
  } = {
    active: false,
    targetId: null,
    elapsed: 0,
    dmgAccum: 0,
  };
  private zombieStoneState = {
    active: false,
    elapsed: 0,
    blasted: false,
    startY: 0,
  };
  private agathaDarkholdState = {
    active: false,
    elapsed: 0,
  };
  private agathaAutoShieldState = {
    active: false,
    elapsed: 0,
    absorbRemaining: SHIELD_MAX_DURABILITY['agatha-auto-shield'],
  };
  private agathaShieldState: {
    active: boolean;
    elapsed: number;
    trackedDamage: number;
    hitCounts: Map<string, number>;
  } = {
    active: false,
    elapsed: 0,
    trackedDamage: 0,
    hitCounts: new Map(),
  };
  private agathaAbsorbState: {
    active: boolean;
    attackerId: string | null;
    elapsed: number;
    duration: number;
    tickAccum: number;
    lastAttackerPos: THREE.Vector3;
  } = {
    active: false,
    attackerId: null,
    elapsed: 0,
    duration: 1.5,
    tickAccum: 0,
    lastAttackerPos: new THREE.Vector3(),
  };
  private strangeClonesPrecastState: {
    active: boolean;
    elapsed: number;
    targetId: string | null;
  } = {
    active: false,
    elapsed: 0,
    targetId: null,
  };
  private purgatoryGraspState: {
    active: boolean;
    elapsed: number;
    slammed: boolean;
    targets: Array<{ id: string; x: number; z: number; startY: number }>;
  } = {
    active: false,
    elapsed: 0,
    slammed: false,
    targets: [],
  };
  private invisibilityState: {
    active: boolean;
    elapsed: number;
    phase: 'idle' | 'vanishing' | 'cloaked' | 'revealing';
    progress: number;
  } = {
    active: false,
    elapsed: 0,
    phase: 'idle',
    progress: 0,
  };
  private forcefieldShieldState = {
    active: false,
    elapsed: 0,
    maxDurability: FORCEFIELD_SHIELD_MAX_DURABILITY,
    absorbRemaining: FORCEFIELD_SHIELD_MAX_DURABILITY,
  };
  private forcefieldTransferState: {
    phase: 'idle' | 'choosing' | 'protection' | 'suffocation';
    targetId: string | null;
    targetShieldMaxHp: number;
    effectElapsed: number;
    tickAccum: number;
    ticksDone: number;
  } = {
    phase: 'idle',
    targetId: null,
    targetShieldMaxHp: 0,
    effectElapsed: 0,
    tickAccum: 0,
    ticksDone: 0,
  };
  private barrierLockTimer = 0;
  private barrierLockedYaw = 0;
  private forcefieldTransferCooldownTimer = 0;

  private prevTurnYaw = 0;

  // Camera orientation & smooth zoom distance
  private cameraYaw = 0;
  private cameraPitch = 0.22;
  private targetCameraDistance = 4.65;
  private smoothCameraDistance = 4.65;
  private smoothCamPos = new THREE.Vector3(0.62, 2.05, 4.6);
  private smoothCamLook = new THREE.Vector3(0.72, 1.48, -3.5);
  private camInitialized = false;
  private baseFov = 50;
  private lastAppliedFov = 50;
  private lastScreenFxSentActive = false;

  // Frame loop management
  private frameId = 0;
  private disposed = false;
  private lastTimeMs = 0;
  private contextLost = false;

  // Scratch math helpers & pre-allocated pools (zero per-frame GC)
  private viewportWidth = 1;
  private viewportHeight = 1;
  private readonly unifiedTargetProbes: CombatTargetProbe[] = [];
  private readonly unifiedNpcHud: NpcHudSnapshot[] = [];
  private readonly protectedTagPool: ProtectedTagSnapshot[] = [];
  private readonly protectedTagsScratch: ProtectedTagSnapshot[] = [];
  private readonly statusEffectPool: ActiveStatusEffect[] = Array.from(
    { length: 5 },
    () => ({
      id: 'shield',
      label: '',
      description: '',
      remainingSec: 0,
      totalSec: 1,
    }),
  );
  private readonly statusEffectsScratch: ActiveStatusEffect[] = [];
  private readonly telemetryScratch: PlayerCombatTelemetry = {
    playerHeadVisible: false,
    playerHeadX: 0,
    playerHeadY: 0,
    killStreak: 0,
    playerShield: {
      active: false,
      hp: 0,
      maxHp: 100,
      screenX: 0,
      screenY: 0,
      color: '#FF2956',
    },
    protectedTags: this.protectedTagsScratch,
    statusEffects: this.statusEffectsScratch,
  };
  private readonly _mainMotion: CharacterMotionState = {
    localForward: 0,
    localRight: 0,
    verticalVelocity: 0,
    grounded: true,
    justJumped: false,
    landImpactSpeed: 0,
    flying: false,
    sprinting: false,
    superSpeed: false,
    turnVelocity: 0,
  };
  private readonly _idleFlyMotion: CharacterMotionState = {
    localForward: 0,
    localRight: 0,
    verticalVelocity: 0,
    grounded: false,
    justJumped: false,
    landImpactSpeed: 0,
    flying: true,
  };
  private readonly _decoyMotion: CharacterMotionState = {
    localForward: 0,
    localRight: 0,
    verticalVelocity: 0,
    grounded: true,
    justJumped: false,
    landImpactSpeed: 0,
    flying: false,
  };
  private readonly _stepInput = {
    moveX: 0,
    moveY: 0,
    facingYaw: 0,
    jumpQueued: false,
    sprintEnabled: false,
    flying: false,
    hoverHeight: 0.94,
    speedMultiplier: 1.0,
    intangible: false,
  };
  private readonly _fwd = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _desiredCamPos = new THREE.Vector3();
  private readonly _desiredCamLook = new THREE.Vector3();
  private readonly _ragdollFocus = new THREE.Vector3();
  private readonly _raycaster = new THREE.Raycaster();
  private readonly _reticleNdc = new THREE.Vector2();
  private readonly _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly _aimTarget = new THREE.Vector3();
  private readonly _handWorld = new THREE.Vector3();
  private readonly _leftHandWorld = new THREE.Vector3();
  private readonly _agathaMidHandWorld = new THREE.Vector3();
  private readonly _painTargetWorld = new THREE.Vector3();
  private readonly _camRightVec = new THREE.Vector3();
  private readonly _camUpVec = new THREE.Vector3();
  private readonly _foreheadPos = new THREE.Vector3();
  private readonly _waveDir = new THREE.Vector3();
  private readonly _hitDir = new THREE.Vector3();
  private readonly _mindStoneWorld = new THREE.Vector3();
  private readonly _laserEndWorld = new THREE.Vector3();
  private readonly _projVec = new THREE.Vector3();
  private readonly _shieldWorld = new THREE.Vector3();
  private readonly _tmpA = new THREE.Vector3();
  private readonly _tmpB = new THREE.Vector3();
  private readonly _tmpDir = new THREE.Vector3();
  private readonly _tmpKnock = new THREE.Vector3();
  private readonly _aimOut = new THREE.Vector3();
  private readonly _rayHitPoint = new THREE.Vector3();
  private readonly _raySphereCenter = new THREE.Vector3();
  private readonly _rayFloorHit = new THREE.Vector3();
  private readonly _ffTorso = new THREE.Vector3();
  private readonly _ffHead = new THREE.Vector3();
  private readonly _ffOrigin = new THREE.Vector3();
  private readonly _ffCloakArg: {
    active: boolean;
    phase: 'idle' | 'vanishing' | 'cloaked' | 'revealing';
    cutLocalY: number;
  } = {
    active: false,
    phase: 'idle',
    cutLocalY: 2.15,
  };
  private readonly _ffTargetArg: {
    active: boolean;
    mode: 'idle' | 'choosing' | 'protection' | 'suffocation';
    torsoPos: THREE.Vector3;
    headPos: THREE.Vector3;
    hasTarget: boolean;
  } = {
    active: false,
    mode: 'idle',
    torsoPos: this._ffTorso,
    headPos: this._ffHead,
    hasTarget: false,
  };

  // Player combat reaction, status effects & kill streak state
  private playerHitRestrictTimer = 0;
  private statusHealTimer = 0;
  private statusDotTimer = 0;
  private statusParalyzeTimer = 0;
  private statusNoPowersTimer = 0;
  private killStreakCount = 0;
  private multiKillCount = 0;
  private multiKillWindowTimer = 0;
  private multiKillSeq = 0;
  private stamina = 100;
  private readonly maxStamina = 100;
  private staminaRegenDelayTimer = 0;
  private lastReportedStamina = 100;

  private readonly handleResizeBound: () => void;
  private readonly resizeObserver: ResizeObserver | null = null;
  private readonly handleKeyDownBound: (e: KeyboardEvent) => void;
  private readonly handleKeyUpBound: (e: KeyboardEvent) => void;
  private readonly handleContextLostBound: (e: Event) => void;
  private readonly handleContextRestoredBound: () => void;

  constructor(
    container: HTMLElement,
    callbacks: EngineCallbacks = {},
    initialGraphics: GraphicsSettings = DEFAULT_GRAPHICS_SETTINGS,
    initialAppearance: CharacterAppearance = resolveCharacterAppearance(),
    initialMaxHp = 250,
    initialDamageMultiplier = 1.0,
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.graphicsSettings = initialGraphics;
    this.archetype = initialAppearance.archetype ?? 'standard';
    this.skinVariant = initialAppearance.skinVariant ?? 'phoenix';
    this.skinId = initialAppearance.skinId;
    this.currentAppearance = initialAppearance;
    this.playerMaxHp = initialMaxHp;
    this.playerHp = initialMaxHp;
    this.damageMultiplier = initialDamageMultiplier;
    this.targetCameraDistance = initialGraphics.cameraZoom;
    this.smoothCameraDistance = initialGraphics.cameraZoom;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    this.viewportWidth = width;
    this.viewportHeight = height;

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.setPixelRatio(this.computePixelRatio(initialGraphics.resolution));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';

    container.appendChild(this.renderer.domElement);

    // 2. Scene, Sky & Fog
    this.scene = new THREE.Scene();
    const horizonColor = 0xc0dbf4;
    this.scene.background = new THREE.Color(horizonColor);
    this.distanceFog = new THREE.Fog(horizonColor, 22, 102);
    this.scene.fog = initialGraphics.distanceFog ? this.distanceFog : null;

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.65;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const skyTex = createSkyDomeTexture();
    const skyGeo = new THREE.SphereGeometry(210, 24, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.disposableGeometries.push(skyGeo);
    this.disposableMaterials.push(skyMat);
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    this.skyAtmosphere = new SkyAtmosphere(initialGraphics.clouds);
    this.scene.add(this.skyAtmosphere.group);

    // 3. Camera
    const aspect = width / height;
    const fov = aspect < 1 ? 58 : 50;
    this.baseFov = fov;
    this.lastAppliedFov = fov;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.15, 320);

    // 4. Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xb8dcff, 0x263b64, 0.96);
    hemiLight.position.set(0, 30, 0);
    this.scene.add(hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.54);
    this.sunLight.position.copy(SUN_LIGHT_DIR).multiplyScalar(22);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 52;
    const d = 6.5;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0003;
    this.sunLight.shadow.normalBias = 0.018;
    this.applyShadowQuality(initialGraphics.shadows);
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const rimLight = new THREE.DirectionalLight(0x9ac6ff, 0.44);
    rimLight.position.set(-10, 8, 14);
    this.scene.add(rimLight);

    // Persistent PointLight for ability glow flares (never toggle .visible to prevent shader recompile)
    this.abilityLight = new THREE.PointLight(0xffffff, 0, 16, 1.7);
    this.abilityLight.castShadow = false;
    this.abilityLight.visible = true;
    this.scene.add(this.abilityLight);

    this.fx.setIdentity(this.archetype, this.skinVariant, this.skinId);
    this.fx.setAllowSubtleBlur(
      initialGraphics.preset === 'high' || initialGraphics.preset === 'ultra',
    );

    // 5. Physics & Minimalistic Dark-Blue Grid Baseplate
    this.physics = new CharacterPhysics();
    const maxAniso = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    this.buildMinimalBaseplate(maxAniso);

    // 6. R16 Character + Auras / Wings + Ground Contact Shadow
    this.rig = createR16Character(initialAppearance);
    this.scene.add(this.rig.root);
    this.attachCharacterExtras();

    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(0.92, 0.92);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: initialGraphics.shadows === 'off' ? 0.34 : 0.18,
    });
    this.disposableGeometries.push(shadowGeo);
    this.disposableMaterials.push(shadowMat);
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadow.position.set(0, 0.015, 0);
    this.scene.add(this.contactShadow);

    this.animator = new CharacterAnimator(this.rig, this.archetype, this.skinId);
    this.ragdoll = new R16Ragdoll(this.rig);

    // 7. Combat Systems: Scarlet Witch + Agatha Harkness + Darkhold + Phoenix Force VFX + Landing Dust + NPCs
    this.vfx = new ScarletWitchVfxSystem(
      this.skinId === 'wanda-zombie' ? 'crimson-dark' : 'default',
    );
    this.scene.add(this.vfx.group);

    this.chaosDrainBeamVfx = new ChaosDrainBeamVfx(this.skinId === 'wanda-zombie');
    this.scene.add(this.chaosDrainBeamVfx.group);

    this.stoneExplosionVfx = new StoneChaosExplosionVfx();
    this.scene.add(this.stoneExplosionVfx.group);

    this.agathaVfx = new AgathaVfxSystem();
    this.scene.add(this.agathaVfx.group);

    this.darkholdBook = new DarkholdBookVfx();
    this.scene.add(this.darkholdBook.group);

    this.scarletShield = new ScarletShieldVfx();
    this.scene.add(this.scarletShield.group);

    this.agathaDarkholdBook = new DarkholdBookVfx('purple');
    this.scene.add(this.agathaDarkholdBook.group);

    this.agathaDarkholdShield = new ScarletShieldVfx('purple');
    this.scene.add(this.agathaDarkholdShield.group);

    this.phoenixVfx = new PhoenixVfxSystem(this.skinVariant);
    this.scene.add(this.phoenixVfx.group);

    this.emmaVfx = new EmmaFrostVfxSystem();
    this.scene.add(this.emmaVfx.group);

    this.emmaIdleRings = new EmmaIdleForeheadRings(4);
    this.scene.add(this.emmaIdleRings.group);

    this.helaVfx = new HelaVfxSystem();
    this.scene.add(this.helaVfx.group);

    this.magnetoVfx = new MagnetoVfxSystem();
    this.scene.add(this.magnetoVfx.group);

    this.quicksilverVfx = new QuicksilverVfxSystem(
      initialAppearance.skinId === 'speed' ? 'green' : 'blue',
    );
    this.scene.add(this.quicksilverVfx.group);

    this.strangeVfx = new DoctorStrangeVfxSystem(initialAppearance);
    this.scene.add(this.strangeVfx.group);

    this.visionVfx = new VisionVfxSystem();
    this.scene.add(this.visionVfx.group);

    this.invisibleVfx = new InvisibleWomanVfxSystem();
    this.scene.add(this.invisibleVfx.group);

    this.landingDust = new LandingDustSystem();
    this.scene.add(this.landingDust.group);

    this.npcs = new NpcCombatSystem();
    this.scene.add(this.npcs.group);

    this.aiEnemies = new PlayableAiEnemySystem();
    this.scene.add(this.aiEnemies.group);

    this.rockBreakVfx = new RockBreakVfxSystem();
    this.scene.add(this.rockBreakVfx.group);

    this.shieldHitVfx = new ShieldHitVfxSystem();
    this.scene.add(this.shieldHitVfx.group);

    this.spawnPadVfx = new SpawnPadVfxSystem();
    this.scene.add(this.spawnPadVfx.group);

    const initialSpawn = this.pickRandomSpawnPoint();
    this.physics.position.set(initialSpawn.x, 0, initialSpawn.z);
    this.rig.root.position.set(initialSpawn.x, 0, initialSpawn.z);
    this.rig.root.rotation.y = initialSpawn.facingYaw;
    this.cameraYaw = initialSpawn.facingYaw;
    this.spawnPadVfx.triggerArrivalBurst(initialSpawn.x, initialSpawn.z);

    // 8. Wind Trails
    this.windTrails = new WindTrailSystem();
    this.windTrails.lines.visible = initialGraphics.windTrails;
    this.scene.add(this.windTrails.lines);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // 9. Listeners
    this.handleResizeBound = this.onResize.bind(this);
    this.handleKeyDownBound = this.onKeyDown.bind(this);
    this.handleKeyUpBound = this.onKeyUp.bind(this);
    this.handleContextLostBound = (e: Event) => {
      e.preventDefault();
      this.contextLost = true;
      this.callbacks.onContextLost?.();
    };
    this.handleContextRestoredBound = () => {
      this.contextLost = false;
      this.callbacks.onContextRestored?.();
    };

    window.addEventListener('resize', this.handleResizeBound);
    window.addEventListener('orientationchange', this.handleResizeBound);
    document.addEventListener('fullscreenchange', this.handleResizeBound);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.container);
    }
    window.addEventListener('keydown', this.handleKeyDownBound);
    window.addEventListener('keyup', this.handleKeyUpBound);
    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      this.handleContextLostBound,
    );
    this.renderer.domElement.addEventListener(
      'webglcontextrestored',
      this.handleContextRestoredBound,
    );

    this.callbacks.onPlayerHealthChange?.(this.playerHp, this.playerMaxHp);
    this.lastTimeMs = performance.now();
    this.scheduleNextTick();
  }

  private attachCharacterExtras(): void {
    this.leftHandAura?.dispose();
    this.rightHandAura?.dispose();
    this.leftAgathaAura?.dispose();
    this.rightAgathaAura?.dispose();
    this.leftFireAura?.dispose();
    this.rightFireAura?.dispose();
    this.phoenixWings?.dispose();

    this.leftHandAura = null;
    this.rightHandAura = null;
    this.leftAgathaAura = null;
    this.rightAgathaAura = null;
    this.leftFireAura = null;
    this.rightFireAura = null;
    this.phoenixWings = null;

    if (this.archetype === 'scarlet-witch') {
      const variant = this.skinId === 'wanda-zombie' ? 'crimson-dark' : 'default';
      this.leftHandAura = new HandChaosAura(0.24, variant);
      this.rightHandAura = new HandChaosAura(0.24, variant);
      this.leftHandAura.group.position.set(0, -0.09, -0.06);
      this.rightHandAura.group.position.set(0, -0.09, -0.06);
      this.rig.leftHand.add(this.leftHandAura.group);
      this.rig.rightHand.add(this.rightHandAura.group);
    } else if (this.archetype === 'agatha-harkness') {
      this.leftAgathaAura = new HandAgathaAura(0.24);
      this.rightAgathaAura = new HandAgathaAura(0.24);
      this.leftAgathaAura.group.position.set(0, -0.09, -0.06);
      this.rightAgathaAura.group.position.set(0, -0.09, -0.06);
      this.rig.leftHand.add(this.leftAgathaAura.group);
      this.rig.rightHand.add(this.rightAgathaAura.group);
    } else if (this.archetype === 'phoenix-force') {
      this.leftFireAura = new HandFireAura(this.skinVariant, 0.25);
      this.rightFireAura = new HandFireAura(this.skinVariant, 0.25);
      this.leftFireAura.group.position.set(0, -0.09, -0.06);
      this.rightFireAura.group.position.set(0, -0.09, -0.06);
      this.rig.leftHand.add(this.leftFireAura.group);
      this.rig.rightHand.add(this.rightFireAura.group);

      this.phoenixWings = new PhoenixWings(this.skinVariant);
      this.rig.chest.add(this.phoenixWings.group);
    }
  }

  private buildMinimalBaseplate(maxAniso: number): void {
    const innerSpan = BASEPLATE_HALF_INNER * 2;
    const outerSpan = BASEPLATE_HALF_OUTER * 2;
    const borderThick = BASEPLATE_HALF_OUTER - BASEPLATE_HALF_INNER;
    const skirtHeight = 2.0;

    const topTex = createBaseplateTopTexture(maxAniso, BASEPLATE_HALF_INNER);
    const trimTex = createBaseplateTrimTexture(maxAniso);
    this.disposableTextures.push(topTex, trimTex);

    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      roughness: 0.92,
      metalness: 0.0,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      map: trimTex,
      roughness: 0.88,
      metalness: 0.02,
    });
    const skirtMat = new THREE.MeshStandardMaterial({
      color: '#121C34',
      roughness: 0.92,
      metalness: 0.0,
    });
    this.disposableMaterials.push(topMat, trimMat, skirtMat);

    const floorGeo = new THREE.BoxGeometry(innerSpan, skirtHeight, innerSpan);
    this.disposableGeometries.push(floorGeo);
    const floorMesh = new THREE.Mesh(floorGeo, [
      skirtMat,
      skirtMat,
      topMat,
      skirtMat,
      skirtMat,
      skirtMat,
    ]);
    floorMesh.position.set(0, -skirtHeight / 2, 0);
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    const totalBorderHeight = skirtHeight + BASEPLATE_BORDER_HEIGHT;
    const borderCenterY = (BASEPLATE_BORDER_HEIGHT - skirtHeight) / 2;

    const nsGeo = new THREE.BoxGeometry(outerSpan, totalBorderHeight, borderThick);
    const ewGeo = new THREE.BoxGeometry(borderThick, totalBorderHeight, innerSpan);
    this.disposableGeometries.push(nsGeo, ewGeo);

    const offset = BASEPLATE_HALF_INNER + borderThick / 2;

    const north = new THREE.Mesh(nsGeo, trimMat);
    north.position.set(0, borderCenterY, -offset);
    north.receiveShadow = true;
    north.castShadow = true;

    const south = new THREE.Mesh(nsGeo, trimMat);
    south.position.set(0, borderCenterY, offset);
    south.receiveShadow = true;
    south.castShadow = true;

    const west = new THREE.Mesh(ewGeo, trimMat);
    west.position.set(-offset, borderCenterY, 0);
    west.receiveShadow = true;
    west.castShadow = true;

    const east = new THREE.Mesh(ewGeo, trimMat);
    east.position.set(offset, borderCenterY, 0);
    east.receiveShadow = true;
    east.castShadow = true;

    this.scene.add(north, south, west, east);

    // Architectural pillars & walls around open mid-court (passable by Vision Intangibility)
    const pillars: Array<{ x: number; z: number; w: number; h: number; d: number }> = [
      { x: -9.2, z: 0.0, w: 1.6, h: 4.2, d: 5.2 },
      { x: 9.2, z: 0.0, w: 1.6, h: 4.2, d: 5.2 },
      { x: -9.2, z: -9.2, w: 4.6, h: 3.8, d: 1.6 },
      { x: 9.2, z: -9.2, w: 4.6, h: 3.8, d: 1.6 },
      { x: 0.0, z: -11.6, w: 5.8, h: 4.4, d: 1.6 },
      { x: -11.0, z: 9.2, w: 2.2, h: 3.6, d: 2.2 },
      { x: 11.0, z: 9.2, w: 2.2, h: 3.6, d: 2.2 },
    ];
    const pillarMat = new THREE.MeshStandardMaterial({
      color: '#1E2D4D',
      roughness: 0.78,
      metalness: 0.14,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: '#344B7A',
      roughness: 0.65,
      metalness: 0.18,
    });
    this.disposableMaterials.push(pillarMat, capMat);

    for (const p of pillars) {
      const geo = new THREE.BoxGeometry(p.w, p.h, p.d);
      const capGeo = new THREE.BoxGeometry(p.w + 0.18, 0.24, p.d + 0.18);
      this.disposableGeometries.push(geo, capGeo);

      const mesh = new THREE.Mesh(geo, pillarMat);
      mesh.position.set(p.x, p.h * 0.5, p.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(p.x, p.h + 0.12, p.z);
      cap.castShadow = true;
      cap.receiveShadow = true;
      this.scene.add(cap);

      this.physics.addCollider({
        minX: p.x - p.w * 0.5,
        maxX: p.x + p.w * 0.5,
        minY: 0,
        maxY: p.h + 0.24,
        minZ: p.z - p.d * 0.5,
        maxZ: p.z + p.d * 0.5,
      });
    }
  }

  public setJoystickVector(x: number, y: number): void {
    if (!this.controlsEnabled || this.dead) {
      this.joyX = 0;
      this.joyY = 0;
      return;
    }
    this.joyX = THREE.MathUtils.clamp(x, -1, 1);
    this.joyY = THREE.MathUtils.clamp(y, -1, 1);
  }

  private isPhoenixReviving(): boolean {
    return this.phoenixRevivalState.phase !== 'idle';
  }

  private scaleDamage(base: number): number {
    return Math.max(1, Math.round(base * this.damageMultiplier));
  }

  public triggerJump(): void {
    if (
      !this.controlsEnabled ||
      this.dead ||
      this.painState.active ||
      this.isPhoenixReviving() ||
      this.phoenixDiveState.phase !== 'idle' ||
      this.astralState.phase !== 'idle' ||
      this.mindControlState.phase === 'choosing' ||
      this.mindControlState.phase === 'mental-damage' ||
      this.telepathicWaveState.active ||
      this.magnetoTornadoState.active ||
      this.rapidPunchState.active ||
      this.speedBlitzState.active ||
      this.windTornadoState.active ||
      this.astralExtractionState.active ||
      this.visionBoltChargeState.active ||
      this.visionHeadGripState.active ||
      this.agathaShieldState.active ||
      this.agathaAbsorbState.active ||
      this.zombieStoneState.active ||
      this.purgatoryGraspState.active ||
      this.strangeClonesPrecastState.active ||
      this.barrierLockTimer > 0
    ) {
      return;
    }
    if (this.flightEnabled) {
      return;
    }
    this.jumpQueued = true;
    this.physics.queueJump();
  }

  public setSprintEnabled(enabled: boolean): void {
    if (enabled && this.stamina <= 0.5) {
      this.sprintEnabled = false;
      this.callbacks.onSprintForceChange?.(false);
      return;
    }
    this.sprintEnabled = enabled;
  }

  public getStaminaState(): {
    stamina: number;
    maxStamina: number;
    regenDelayRemaining: number;
    sprintEnabled: boolean;
  } {
    return {
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      regenDelayRemaining: this.staminaRegenDelayTimer,
      sprintEnabled: this.sprintEnabled,
    };
  }

  public restoreStaminaState(
    stamina: number,
    regenDelayRemaining = 0,
    sprintEnabled?: boolean,
  ): void {
    this.stamina = THREE.MathUtils.clamp(stamina, 0, this.maxStamina);
    this.staminaRegenDelayTimer = THREE.MathUtils.clamp(regenDelayRemaining, 0, 1.0);
    if (this.stamina <= 0) {
      this.sprintEnabled = false;
      this.callbacks.onSprintForceChange?.(false);
    } else if (typeof sprintEnabled === 'boolean') {
      this.sprintEnabled = sprintEnabled;
      this.callbacks.onSprintForceChange?.(sprintEnabled);
    }
    this.lastReportedStamina = this.stamina;
    this.callbacks.onStaminaChange?.(
      this.stamina,
      this.maxStamina,
      this.staminaRegenDelayTimer,
    );
  }

  public setWingsAlwaysVisible(alwaysOn: boolean): void {
    const changed = this.wingsAlwaysVisible !== alwaysOn;
    this.wingsAlwaysVisible = alwaysOn;
    if (changed && !this.dead && this.archetype === 'phoenix-force') {
      this.fx.triggerCue(alwaysOn ? 'wings-on' : 'wings-off', this.physics.position);
    }
  }

  public setFlightEnabled(enabled: boolean): boolean {
    if (
      this.dead ||
      this.teleportState.phase !== 'idle' ||
      this.painState.active ||
      this.isPhoenixReviving() ||
      this.phoenixDiveState.phase !== 'idle' ||
      this.astralState.phase !== 'idle' ||
      this.mindControlState.phase === 'choosing' ||
      this.mindControlState.phase === 'mental-damage' ||
      this.magnetoMeteorActive ||
      this.magnetoTornadoState.active ||
      this.rapidPunchState.active ||
      this.speedBlitzState.active ||
      this.windTornadoState.active ||
      this.astralExtractionState.active ||
      this.visionHeadGripState.active ||
      this.agathaShieldState.active ||
      this.agathaAbsorbState.active ||
      this.zombieStoneState.active ||
      this.purgatoryGraspState.active ||
      this.strangeClonesPrecastState.active ||
      this.barrierLockTimer > 0 ||
      this.forcefieldTransferState.phase !== 'idle'
    ) {
      return false;
    }
    const prev = this.flightEnabled;
    this.flightEnabled = enabled;
    if (enabled && this.archetype === 'phoenix-force') {
      this.animator.triggerAerialSpin(0.44);
    }
    if (enabled && this.archetype === 'doctor-strange') {
      this.animator.triggerCloakSurge();
    }
    if (this.archetype === 'doctor-strange' && !enabled && this.strangeShieldState.active) {
      this.strangeShieldState.active = false;
      this.strangeShieldState.elapsed = 0;
      this.strangeVfx.setShieldActive(false);
      this.refreshInvulnerable();
      this.fx.triggerCue('strange-shield-off', this.physics.position);
      this.callbacks.onStrangeShieldChange?.(false, true);
    }
    if (this.archetype === 'magneto') {
      this.magnetoShieldState.active = enabled;
      this.magnetoVfx.setShieldActive(enabled);
      this.refreshInvulnerable();
    }
    if (this.archetype === 'vision' && !enabled && this.visionIntangibleState.active) {
      this.visionIntangibleState.active = false;
      this.visionIntangibleState.elapsed = 0;
      this.physics.resolveHorizontalOverlap();
      this.refreshInvulnerable();
      this.fx.triggerCue('vision-phase-off', this.physics.position);
      this.callbacks.onVisionPhaseChange?.(false, true);
    }
    if (enabled !== prev) {
      if (this.archetype === 'scarlet-witch' || this.archetype === 'agatha-harkness') {
        this.fx.triggerCue(
          enabled ? 'scarlet-flight-on' : 'scarlet-flight-off',
          this.physics.position,
        );
      } else if (this.archetype === 'phoenix-force') {
        this.fx.triggerCue(
          enabled ? 'phoenix-flight-on' : 'phoenix-flight-off',
          this.physics.position,
        );
      } else if (this.archetype === 'magneto') {
        this.fx.triggerCue(
          enabled ? 'magneto-flight-on' : 'magneto-flight-off',
          this.physics.position,
        );
      } else if (this.archetype === 'doctor-strange') {
        this.fx.triggerCue(
          enabled ? 'strange-cloak-on' : 'strange-cloak-off',
          this.physics.position,
        );
      } else if (this.archetype === 'vision') {
        this.fx.triggerCue(
          enabled ? 'vision-flight-on' : 'vision-flight-off',
          this.physics.position,
        );
      } else if (this.archetype === 'invisible-woman') {
        this.fx.triggerCue(
          enabled ? 'invisible-flight-on' : 'invisible-flight-off',
          this.physics.position,
        );
      }
    }
    return true;
  }

  /**
   * Scarlet Witch Flight Cancellation:
   * Immediately exits Flight, unleashes a large red magical shockwave around her,
   * damaging nearby targets with strong knockback + 2s ragdoll.
   */
  public cancelScarletFlightWithShockwave(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'scarlet-witch' ||
      !this.flightEnabled ||
      this.teleportState.phase !== 'idle'
    ) {
      return false;
    }

    this.flightEnabled = false;
    this.physics.velocity.y = Math.min(this.physics.velocity.y, -2.0);
    this.handFlareLeft = 1.4;
    this.handFlareRight = 1.4;
    this.animator.triggerCast('implosion', 0.34);

    this.vfx.spawnFlightCancelShockwave(this.physics.position);
    this.fx.triggerCue('scarlet-flight-cancel', this.physics.position);
    this.callbacks.onScarletFlightCancelShockwave?.();

    const hits = this.applyAreaFireExplosionUnified(
      this.physics.position,
      SCARLET_FLIGHT_CANCEL_RADIUS,
      this.scaleDamage(25),
      2.0,
      6.4,
      0,
      0,
    );
    if (hits > 0) {
      this.callbacks.onHitTarget?.();
    }
    return true;
  }

  public isTeleporting(): boolean {
    return this.teleportState.phase !== 'idle';
  }

  private pickRandomSpawnPoint() {
    const idx = Math.floor(Math.random() * PLAYER_SPAWN_POINTS.length);
    return PLAYER_SPAWN_POINTS[idx];
  }

  private getAllTargetProbes(): ReadonlyArray<CombatTargetProbe> {
    const probes = this.unifiedTargetProbes;
    probes.length = 0;
    const npcProbes = this.npcs.getTargetProbes();
    for (let i = 0; i < npcProbes.length; i++) {
      probes.push(npcProbes[i]);
    }
    const aiProbes = this.aiEnemies.getTargetProbes();
    for (let i = 0; i < aiProbes.length; i++) {
      probes.push(aiProbes[i]);
    }
    return probes;
  }

  private findProbeById(
    probes: ReadonlyArray<CombatTargetProbe>,
    id: string,
  ): CombatTargetProbe | undefined {
    for (let i = 0; i < probes.length; i++) {
      if (probes[i].id === id) return probes[i];
    }
    return undefined;
  }

  private getTargetSystem(targetId: string) {
    return this.aiEnemies.ownsTargetId(targetId) ? this.aiEnemies : this.npcs;
  }

  private getSelectedTargetIdUnified(): string | null {
    const npcId = this.npcs.getSelectedTargetId();
    const aiId = this.aiEnemies.getSelectedTargetId();
    if (npcId && aiId) {
      const hasA = this.npcs.getTargetTorsoPosition(npcId, this._tmpA);
      const hasB = this.aiEnemies.getTargetTorsoPosition(aiId, this._tmpB);
      if (hasA && hasB) {
        return this._tmpA.distanceToSquared(this.physics.position) <=
          this._tmpB.distanceToSquared(this.physics.position)
          ? npcId
          : aiId;
      }
    }
    return aiId ?? npcId;
  }

  private getSelectedTargetAimPointUnified(out: THREE.Vector3): boolean {
    const tid = this.getSelectedTargetIdUnified();
    if (!tid) return false;
    return this.getTargetSystem(tid).getTargetTorsoPosition(tid, out);
  }

  private findClosestTargetIdUnified(origin: THREE.Vector3, maxRange: number): string | null {
    const npcId = this.npcs.findClosestTargetId(origin, maxRange);
    const aiId = this.aiEnemies.findClosestTargetId(origin, maxRange);
    if (!npcId) return aiId;
    if (!aiId) return npcId;
    const hasA = this.npcs.getTargetTorsoPosition(npcId, this._tmpA);
    const hasB = this.aiEnemies.getTargetTorsoPosition(aiId, this._tmpB);
    if (!hasA) return aiId;
    if (!hasB) return npcId;
    return this._tmpA.distanceToSquared(origin) <= this._tmpB.distanceToSquared(origin)
      ? npcId
      : aiId;
  }

  private isTargetAliveUnified(targetId: string): boolean {
    return this.getTargetSystem(targetId).isTargetAlive(targetId);
  }

  private getTargetTorsoPositionUnified(targetId: string, out: THREE.Vector3): boolean {
    return this.getTargetSystem(targetId).getTargetTorsoPosition(targetId, out);
  }

  private getTargetHeadPositionUnified(targetId: string, out: THREE.Vector3): boolean {
    return this.getTargetSystem(targetId).getTargetHeadPosition(targetId, out);
  }

  private getNpcSwordEmbedPoseUnified(
    targetId: string,
    outPos: THREE.Vector3,
  ): { alive: boolean; facingYaw: number } {
    return this.getTargetSystem(targetId).getNpcSwordEmbedPose(targetId, outPos);
  }

  private getTargetAppearanceUnified(targetId: string): CharacterAppearance | null {
    return this.getTargetSystem(targetId).getTargetAppearance(targetId);
  }

  private setPainRestrictedUnified(targetId: string, restricted: boolean): void {
    this.getTargetSystem(targetId).setPainRestricted(targetId, restricted);
  }

  private setParalyzedUnified(targetId: string, active: boolean): void {
    this.getTargetSystem(targetId).setParalyzed(targetId, active);
  }

  private setMindControlParalysisUnified(targetId: string, active: boolean): void {
    this.getTargetSystem(targetId).setMindControlParalysis(targetId, active);
  }

  private setMindControlImmuneUnified(targetId: string, active: boolean): void {
    this.getTargetSystem(targetId).setMindControlImmune(targetId, active);
  }

  private setClonesRestrictedUnified(targetId: string, active: boolean): void {
    this.getTargetSystem(targetId).setClonesRestricted(targetId, active);
  }

  private setAgathaDrainVictimUnified(
    targetId: string,
    active: boolean,
    sourcePos?: THREE.Vector3,
  ): void {
    this.getTargetSystem(targetId).setAgathaDrainVictim(targetId, active, sourcePos);
  }

  private setExternalControlUnified(targetId: string, active: boolean): void {
    this.getTargetSystem(targetId).setExternalControl(targetId, active);
  }

  private setExternalPoseUnified(
    targetId: string,
    pos: THREE.Vector3,
    yaw: number,
    options?: { headache?: boolean; limp?: boolean; pitchX?: number },
  ): void {
    this.getTargetSystem(targetId).setExternalPose(targetId, pos, yaw, options);
  }

  private clearAllCrowdControlUnified(): void {
    this.npcs.clearAllCrowdControl();
    this.aiEnemies.clearAllCrowdControl();
  }

  private applyHeadacheUnified(targetId: string, durationSec: number): void {
    this.getTargetSystem(targetId).applyHeadache(targetId, durationSec);
  }

  private applyBurnUnified(targetId: string, durationSec: number, dps = 2): void {
    this.getTargetSystem(targetId).applyBurn(targetId, durationSec, dps);
  }

  private triggerTargetRagdollUnified(
    targetId: string,
    durationSec: number,
    velocity?: THREE.Vector3,
  ): void {
    this.getTargetSystem(targetId).triggerTargetRagdoll(targetId, durationSec, velocity);
  }

  private setForcefieldStateUnified(
    targetId: string,
    state: {
      trapped?: boolean;
      abilitiesLocked?: boolean;
      externalImmune?: boolean;
      shieldHp?: number;
      shieldMaxHp?: number;
    } | null,
  ): void {
    this.getTargetSystem(targetId).setForcefieldState(targetId, state);
  }

  private getForcefieldShieldRemainingUnified(targetId: string): number {
    return this.getTargetSystem(targetId).getForcefieldShieldRemaining(targetId);
  }

  private applyHealUnified(targetId: string, amount: number): number {
    return this.getTargetSystem(targetId).applyHeal(targetId, amount);
  }

  private applyDamageUnified(
    targetId: string,
    amount: number,
    hitDir: THREE.Vector3,
    ragdollSec = 0,
    knockImpulse?: THREE.Vector3,
    options?: {
      noAggro?: boolean;
      bypassMindControlImmunity?: boolean;
      bypassExternalImmunity?: boolean;
      bypassShield?: boolean;
      isBeam?: boolean;
      pushOnly?: boolean;
    },
  ): boolean {
    return this.getTargetSystem(targetId).applyDamage(
      targetId,
      amount,
      hitDir,
      ragdollSec,
      knockImpulse,
      options,
    );
  }

  private applyAreaImplosionUnified(
    center: THREE.Vector3,
    radius: number,
    damage: number,
    ragdollSec: number,
  ): number {
    return (
      this.npcs.applyAreaImplosion(center, radius, damage, ragdollSec) +
      this.aiEnemies.applyAreaImplosion(center, radius, damage, ragdollSec)
    );
  }

  private applyAreaFireExplosionUnified(
    center: THREE.Vector3,
    radius: number,
    damage: number,
    ragdollSec: number,
    pushStrength: number,
    burnDurationSec = 0,
    burnDps = 2,
  ): number {
    return (
      this.npcs.applyAreaFireExplosion(
        center,
        radius,
        damage,
        ragdollSec,
        pushStrength,
        burnDurationSec,
        burnDps,
      ) +
      this.aiEnemies.applyAreaFireExplosion(
        center,
        radius,
        damage,
        ragdollSec,
        pushStrength,
        burnDurationSec,
        burnDps,
      )
    );
  }

  private applyGlobalDamageUnified(amount: number): number {
    return this.npcs.applyGlobalDamage(amount) + this.aiEnemies.applyGlobalDamage(amount);
  }

  private isPositionBlockedByActor(pos: THREE.Vector3, radius = 0.8): boolean {
    if (this.npcs.isPositionBlockedByNpc(pos, radius)) return true;
    const aiProbes = this.aiEnemies.getTargetProbes();
    for (let i = 0; i < aiProbes.length; i++) {
      const p = aiProbes[i];
      const dx = p.position.x - pos.x;
      const dz = p.position.z - pos.z;
      const minDist = radius + p.radius;
      if (dx * dx + dz * dz < minDist * minDist) return true;
    }
    return false;
  }

  private handleEnemyEliminations(events: NpcEliminationEvent[]): void {
    if (events.length === 0) return;
    if (!this.dead) {
      const healGain = 20 * events.length;
      this.playerHp = Math.min(this.playerMaxHp, this.playerHp + healGain);
      this.statusHealTimer = Math.max(this.statusHealTimer, 1.8);
      this.callbacks.onPlayerHealthChange?.(this.playerHp, this.playerMaxHp);
      this.callbacks.onPlayerHeal?.(healGain);
      this.fx.triggerCue('kill-heal', this.physics.position);

      this.killStreakCount += events.length;
      if (this.multiKillWindowTimer > 0) {
        this.multiKillCount += events.length;
      } else {
        this.multiKillCount = events.length;
      }
      this.multiKillWindowTimer = 4.8;

      if (this.multiKillCount >= 2) {
        this.multiKillSeq += 1;
        const title =
          this.multiKillCount === 2
            ? 'DOUBLE KILL!'
            : this.multiKillCount === 3
              ? 'TRIPLE KILL!'
              : this.multiKillCount === 4
                ? 'QUADRA KILL!'
                : this.multiKillCount === 5
                  ? 'PENTA KILL!'
                  : `${this.multiKillCount}X UNSTOPPABLE!`;
        this.callbacks.onMultiKill?.({
          count: this.multiKillCount,
          title,
          key: this.multiKillSeq,
        });
      }
    }
    this.callbacks.onNpcEliminated?.(events);
  }

  private handleAstralBodyHit(rawDamage: number, kind: 'weapon' | 'punch' | 'pistol' | 'ai-ability', _attackerId?: string): void {
    if (this.dead || this.astralState.phase !== 'projecting' || rawDamage <= 0) return;
    this.playerHp = Math.max(0, this.playerHp - rawDamage);
    this.astralState.bodyHitFlashTimer = 0.16;
    this.astralState.bodyAnimator?.triggerHitReaction(-0.7, 0.25);
    this.callbacks.onPlayerHealthChange?.(this.playerHp, this.playerMaxHp);
    this.callbacks.onNpcStrikePlayer?.(kind === 'punch' ? 'punch' : 'weapon');

    if (this.playerHp <= 0) {
      this.finishAstralReturn(true);
      this.callbacks.onPlayerDeath?.();
      return;
    }

    this.astralState.bodyHits += 1;
    if (this.astralState.bodyHits >= 3) {
      this.callbacks.onAbilityFeedback?.('Physical body hit 3 times — returning!');
      this.beginAstralReturn();
    }
  }

  public isInvulnerable(): boolean {
    return (
      this.invulnerable ||
      this.painState.active ||
      this.phoenixDiveState.phase !== 'idle' ||
      this.astralState.phase !== 'idle' ||
      this.mindControlState.phase === 'choosing' ||
      this.mindControlState.phase === 'mental-damage' ||
      this.magnetoShieldState.active ||
      this.astralExtractionState.active ||
      this.visionIntangibleState.active ||
      this.rapidPunchState.active ||
      this.speedBlitzState.active ||
      this.visionHeadGripState.active ||
      this.forcefieldTransferState.phase === 'protection' ||
      this.forcefieldTransferState.phase === 'suffocation'
    );
  }

  private refreshInvulnerable(): void {
    this.invulnerable =
      this.teleportState.phase !== 'idle' ||
      this.painState.active ||
      this.phoenixDiveState.phase !== 'idle' ||
      this.astralState.phase !== 'idle' ||
      this.mindControlState.phase === 'choosing' ||
      this.mindControlState.phase === 'mental-damage' ||
      this.magnetoShieldState.active ||
      this.astralExtractionState.active ||
      this.visionIntangibleState.active ||
      this.rapidPunchState.active ||
      this.speedBlitzState.active ||
      this.visionHeadGripState.active ||
      this.forcefieldTransferState.phase === 'protection' ||
      this.forcefieldTransferState.phase === 'suffocation';
  }

  public isAbilityInterruptImmune(): boolean {
    return (
      this.painState.active ||
      this.phoenixDiveState.phase !== 'idle' ||
      this.phoenixRevivalState.phase !== 'idle' ||
      this.scheduledWaves.length > 0 ||
      this.teleportState.phase !== 'idle' ||
      this.mindControlState.phase === 'choosing' ||
      this.mindControlState.phase === 'mental-damage' ||
      this.telepathicWaveState.active ||
      this.astralState.phase !== 'idle' ||
      (this.crownState.active && this.crownState.elapsed < 0.6) ||
      this.greenChargeState.active ||
      this.spinningLeapState.active ||
      this.magnetoMeteorActive ||
      this.magnetoTornadoState.active ||
      this.rapidPunchState.active ||
      this.speedBlitzState.active ||
      this.windTornadoState.active ||
      this.astralExtractionState.active ||
      this.strangeClonesPrecastState.active ||
      this.purgatoryGraspState.active ||
      this.visionLaserState.active ||
      this.visionBoltChargeState.active ||
      this.visionHeadGripState.active ||
      this.supremeDrainState.active ||
      this.zombieBeamState.active ||
      this.zombieStoneState.active ||
      this.agathaShieldState.active ||
      this.agathaAbsorbState.active ||
      this.barrierLockTimer > 0 ||
      this.forcefieldTransferState.phase === 'protection' ||
      this.forcefieldTransferState.phase === 'suffocation' ||
      this.animator.isCastingAbility()
    );
  }

  public isKnockbackImmune(): boolean {
    return (
      this.agathaShieldState.active ||
      this.agathaAbsorbState.active ||
      this.agathaAutoShieldState.active ||
      this.shieldState.active ||
      this.diamondState.active ||
      this.strangeShieldState.active ||
      this.forcefieldShieldState.active ||
      this.isInvulnerable() ||
      this.isAbilityInterruptImmune()
    );
  }

  /**
   * Public damage intake entrypoint respecting immunity states (Pain Infliction,
   * Astral Form, Mind Control connection, Teleport, Magnetic Shield, Vision Intangibility,
   * Forcefield Protection/Suffocation, combo locks) and durability-tracked Shields (Scarlet Witch Auto-Shield 100,
   * Agatha Purple Darkhold Shield 100, Emma Frost Diamond Form 150, Doctor Strange Mystic Shield 120,
   * Invisible Woman Forcefield Shield 200).
   */
  public damagePlayer(
    rawDamage: number,
    attackerId?: string,
    hitDir?: THREE.Vector3,
    hitKind: 'weapon' | 'punch' | 'pistol' | 'ai-ability' = 'punch',
    isBeam = false,
  ): number {
    if (this.dead || rawDamage <= 0) return 0;
    if (
      this.teleportState.phase !== 'idle' ||
      this.painState.active ||
      this.phoenixDiveState.phase !== 'idle' ||
      this.astralState.phase !== 'idle' ||
      this.mindControlState.phase === 'choosing' ||
      this.mindControlState.phase === 'mental-damage' ||
      this.astralExtractionState.active ||
      this.visionIntangibleState.active ||
      this.rapidPunchState.active ||
      this.speedBlitzState.active ||
      this.visionHeadGripState.active ||
      this.forcefieldTransferState.phase === 'protection' ||
      this.forcefieldTransferState.phase === 'suffocation'
    ) {
      return 0;
    }

    if (this.magnetoShieldState.active) {
      this.fx.triggerCue('magneto-shield-on', this.physics.position);
      this.callbacks.onAutoShieldDeflect?.();
      return 0;
    }

    let remainingDamage = rawDamage;

    if (this.diamondState.active && this.diamondState.absorbRemaining > 0) {
      const absorbed = Math.min(this.diamondState.absorbRemaining, remainingDamage);
      this.diamondState.absorbRemaining -= absorbed;
      remainingDamage -= absorbed;

      this.shieldHitVfx.triggerAbsorb(this.physics.position, 'diamond-form');
      this.fx.triggerCue('auto-shield-deflect', this.physics.position);
      this.callbacks.onAutoShieldDeflect?.();

      if (this.diamondState.absorbRemaining <= 0) {
        this.diamondState.active = false;
        this.diamondState.elapsed = 0;
        this.diamondState.absorbRemaining = SHIELD_MAX_DURABILITY['diamond-form'];
        this.refreshInvulnerable();
        this.fx.triggerCue('diamond-off', this.physics.position);
        this.callbacks.onDiamondFormChange?.(false, true);
      }
    }

    if (
      remainingDamage > 0 &&
      this.strangeShieldState.active &&
      this.strangeShieldState.absorbRemaining > 0
    ) {
      const absorbed = Math.min(
        this.strangeShieldState.absorbRemaining,
        remainingDamage,
      );
      this.strangeShieldState.absorbRemaining -= absorbed;
      remainingDamage -= absorbed;

      this.shieldHitVfx.triggerAbsorb(this.physics.position, 'mystic-shield');
      this.fx.triggerCue('strange-shield-on', this.physics.position);
      this.callbacks.onAutoShieldDeflect?.();

      if (this.strangeShieldState.absorbRemaining <= 0) {
        this.strangeShieldState.active = false;
        this.strangeShieldState.elapsed = 0;
        this.strangeShieldState.absorbRemaining = SHIELD_MAX_DURABILITY['mystic-shield'];
        this.strangeVfx.setShieldActive(false);
        this.refreshInvulnerable();
        this.fx.triggerCue('strange-shield-off', this.physics.position);
        this.callbacks.onStrangeShieldChange?.(false, true);
      }
    }

    if (
      remainingDamage > 0 &&
      this.shieldState.active &&
      this.shieldState.absorbRemaining > 0
    ) {
      const absorbed = Math.min(this.shieldState.absorbRemaining, remainingDamage);
      this.shieldState.absorbRemaining -= absorbed;
      remainingDamage -= absorbed;

      this.scarletShield.triggerDeflectFlash();
      this.shieldHitVfx.triggerAbsorb(this.physics.position, 'auto-shield');
      this.fx.triggerCue('auto-shield-deflect', this.physics.position);
      this.callbacks.onAutoShieldDeflect?.();

      if (this.shieldState.absorbRemaining <= 0) {
        this.shieldState.active = false;
        this.shieldState.elapsed = 0;
        this.shieldState.absorbRemaining = SHIELD_MAX_DURABILITY['auto-shield'];
        this.refreshInvulnerable();
        this.callbacks.onAutoShieldChange?.(false);
      }
    }

    if (
      remainingDamage > 0 &&
      this.agathaAutoShieldState.active &&
      this.agathaAutoShieldState.absorbRemaining > 0
    ) {
      const absorbed = Math.min(
        this.agathaAutoShieldState.absorbRemaining,
        remainingDamage,
      );
      this.agathaAutoShieldState.absorbRemaining -= absorbed;
      remainingDamage -= absorbed;

      this.agathaDarkholdShield.triggerDeflectFlash();
      this.shieldHitVfx.triggerAbsorb(this.physics.position, 'agatha-auto-shield');
      this.fx.triggerCue('auto-shield-deflect', this.physics.position);
      this.callbacks.onAutoShieldDeflect?.();

      if (this.agathaAutoShieldState.absorbRemaining <= 0) {
        this.agathaAutoShieldState.active = false;
        this.agathaAutoShieldState.elapsed = 0;
        this.agathaAutoShieldState.absorbRemaining =
          SHIELD_MAX_DURABILITY['agatha-auto-shield'];
        this.refreshInvulnerable();
        this.callbacks.onAgathaAutoShieldChange?.(false);
      }
    }

    if (
      remainingDamage > 0 &&
      this.forcefieldShieldState.active &&
      this.forcefieldShieldState.absorbRemaining > 0
    ) {
      const absorbed = Math.min(
        this.forcefieldShieldState.absorbRemaining,
        remainingDamage,
      );
      this.forcefieldShieldState.absorbRemaining -= absorbed;
      remainingDamage -= absorbed;

      this.invisibleVfx.triggerOwnerDeflectFlash();
      this.shieldHitVfx.triggerAbsorb(this.physics.position, 'forcefield-shield');
      this.fx.triggerCue('auto-shield-deflect', this.physics.position);
      this.callbacks.onAutoShieldDeflect?.();

      if (this.forcefieldShieldState.absorbRemaining <= 0) {
        this.endForcefieldShield(true);
      }
    }

    if (remainingDamage > 0) {
      const prevHp = this.playerHp;
      this.playerHp = Math.max(0, this.playerHp - remainingDamage);
      if (
        this.archetype === 'agatha-harkness' &&
        this.agathaShieldState.active &&
        prevHp > 0
      ) {
        this.agathaShieldState.trackedDamage += Math.min(prevHp, remainingDamage);
      }
      this.callbacks.onPlayerHealthChange?.(this.playerHp, this.playerMaxHp);

      if (!this.isAbilityInterruptImmune()) {
        // Subtle player hit reaction + brief movement restriction without interrupting active ability casts
        this.playerHitRestrictTimer = Math.max(this.playerHitRestrictTimer, 0.24);
        if (hitKind === 'ai-ability') {
          this.statusDotTimer = Math.max(this.statusDotTimer, 1.15);
        }
        const sinY = Math.sin(this.rig.root.rotation.y);
        const cosY = Math.cos(this.rig.root.rotation.y);
        const fwdDot = hitDir ? hitDir.x * -sinY + hitDir.z * -cosY : -0.7;
        const rightDot = hitDir ? hitDir.x * cosY + hitDir.z * -sinY : 0.25;
        this.animator.triggerHitReaction(fwdDot, rightDot);
      }

      if (this.playerHp <= 0) {
        this.callbacks.onPlayerDeath?.();
      }
    }

    if (
      this.playerHp > 0 &&
      this.archetype === 'agatha-harkness' &&
      this.agathaShieldState.active &&
      attackerId &&
      this.isTargetAliveUnified(attackerId)
    ) {
      if (isBeam) {
        this.triggerAgathaShieldAbsorption(attackerId);
      } else if (remainingDamage > 0) {
        const nextCount = (this.agathaShieldState.hitCounts.get(attackerId) ?? 0) + 1;
        this.agathaShieldState.hitCounts.set(attackerId, nextCount);
        if (nextCount >= 2) {
          this.triggerAgathaShieldAbsorption(attackerId);
        }
      }
    }

    return remainingDamage;
  }

  private closeDarkhold(triggerCooldown: boolean, immediate = false): void {
    if (!this.darkholdState.active) return;
    this.darkholdState.active = false;
    this.darkholdState.elapsed = 0;
    this.darkholdBook.setOpen(false, immediate);

    if (this.shieldState.active) {
      this.shieldState.active = false;
      this.shieldState.elapsed = 0;
      this.shieldState.absorbRemaining = AUTO_SHIELD_MAX_ABSORB;
      this.callbacks.onAutoShieldChange?.(false);
    }
    this.refreshInvulnerable();

    if (!immediate && !this.dead) {
      this.fx.triggerCue('darkhold-close', this.physics.position);
    }
    this.callbacks.onDarkholdChange?.(false, triggerCooldown);
  }

  public toggleDarkhold(): boolean {
    if (
      this.archetype !== 'scarlet-witch' ||
      this.skinId === 'supreme-sorceress' ||
      this.skinId === 'wanda-zombie'
    ) {
      return false;
    }
    if (this.darkholdState.active) {
      if (this.teleportState.phase !== 'idle') return false;
      this.closeDarkhold(true, false);
      return true;
    }

    if (
      this.dead ||
      !this.controlsEnabled ||
      this.teleportState.phase !== 'idle'
    ) {
      return false;
    }

    this.darkholdState.active = true;
    this.darkholdState.elapsed = 0;
    this.darkholdBook.setOpen(true, false);
    this.animator.triggerCast('implosion', 0.34);
    this.handFlareLeft = 1.15;
    this.handFlareRight = 1.3;
    // Subtle crimson eldritch mist only (no explosion or shockwave on Darkhold summon)
    this.vfx.spawnBodyMistCloud(this.physics.position);
    this.fx.triggerCue('darkhold-open', this.physics.position);
    this.callbacks.onDarkholdChange?.(true, false);
    return true;
  }

  public castTelekineticExplosion(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'scarlet-witch' ||
      this.skinId === 'supreme-sorceress' ||
      this.skinId === 'wanda-zombie' ||
      !this.darkholdState.active ||
      this.teleportState.phase !== 'idle'
    ) {
      return false;
    }

    this.animator.triggerCast('implosion', 0.38);
    this.handFlareLeft = 1.45;
    this.handFlareRight = 1.45;
    this.vfx.spawnTelekineticExplosion(this.physics.position);
    this.fx.triggerCue('telekinetic-explosion', this.physics.position);
    this.callbacks.onTelekineticExplosion?.();

    const hits = this.applyAreaFireExplosionUnified(
      this.physics.position,
      TELEKINETIC_EXPLOSION_RADIUS,
      this.scaleDamage(28),
      2.0,
      7.4,
      0,
      0,
    );
    if (hits > 0) {
      this.callbacks.onHitTarget?.();
    }
    return true;
  }

  public castAutoShield(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'scarlet-witch' ||
      this.skinId === 'supreme-sorceress' ||
      this.skinId === 'wanda-zombie' ||
      !this.darkholdState.active ||
      this.shieldState.active ||
      this.teleportState.phase !== 'idle'
    ) {
      return false;
    }

    this.shieldState.active = true;
    this.shieldState.elapsed = 0;
    this.shieldState.absorbRemaining = SHIELD_MAX_DURABILITY['auto-shield'];
    this.refreshInvulnerable();

    this.animator.triggerCast('implosion', 0.28);
    this.handFlareLeft = 1.25;
    this.handFlareRight = 1.25;
    this.fx.triggerCue('auto-shield-on', this.physics.position);
    this.callbacks.onAutoShieldChange?.(true);
    return true;
  }

  private getReticleNdc(): THREE.Vector2 {
    this._reticleNdc.set((18 * 2) / this.viewportWidth, (22 * 2) / this.viewportHeight);
    return this._reticleNdc;
  }

  private computeReticleAimPoint(
    maxDistance: number,
    preferTarget: boolean,
    clampToFloor: boolean,
  ): THREE.Vector3 {
    if (preferTarget && this.getSelectedTargetAimPointUnified(this._aimTarget)) {
      const distSq = this._aimTarget.distanceToSquared(this.physics.position);
      if (distSq <= maxDistance * maxDistance) {
        return this._aimOut.copy(this._aimTarget);
      }
    }

    const ndc = this.getReticleNdc();
    this._raycaster.setFromCamera(ndc, this.camera);
    const ray = this._raycaster.ray;
    const camToPlayer = ray.origin.distanceTo(this.physics.position);

    // For projectiles / airborne aim, intersect exact crosshair ray with alive NPCs & floor
    if (!clampToFloor) {
      let bestRayT = Infinity;
      const hitPoint = this._rayHitPoint;
      const sphereCenter = this._raySphereCenter;
      const probes = this.getAllTargetProbes();
      for (let i = 0; i < probes.length; i++) {
        const trg = probes[i];
        sphereCenter.set(trg.position.x, trg.position.y + trg.height * 0.55, trg.position.z);
        const ocX = ray.origin.x - sphereCenter.x;
        const ocY = ray.origin.y - sphereCenter.y;
        const ocZ = ray.origin.z - sphereCenter.z;
        const b = ocX * ray.direction.x + ocY * ray.direction.y + ocZ * ray.direction.z;
        const r = trg.radius + 0.32;
        const c = ocX * ocX + ocY * ocY + ocZ * ocZ - r * r;
        const disc = b * b - c;
        if (disc >= 0) {
          const t = -b - Math.sqrt(disc);
          if (t > camToPlayer * 0.45 && t < bestRayT) {
            bestRayT = t;
          }
        }
      }

      const floorHit = this._rayFloorHit;
      if (ray.intersectPlane(this._groundPlane, floorHit)) {
        const floorT = ray.origin.distanceTo(floorHit);
        if (floorT > camToPlayer * 0.45 && floorT < bestRayT) {
          bestRayT = floorT;
        }
      }

      const maxRayT = camToPlayer + maxDistance;
      if (bestRayT < Infinity) {
        const chosenT = Math.min(bestRayT, maxRayT);
        ray.at(chosenT, hitPoint);
        hitPoint.y = Math.max(hitPoint.y, 0.08);
        return this._aimOut.copy(hitPoint);
      }

      ray.at(camToPlayer + maxDistance * 0.72, hitPoint);
      hitPoint.y = Math.max(hitPoint.y, 0.25);
      return this._aimOut.copy(hitPoint);
    }

    const hitFloor = this._rayFloorHit;
    const intersected = ray.intersectPlane(this._groundPlane, hitFloor);

    if (intersected) {
      const toHit = this._tmpA.subVectors(hitFloor, this.physics.position);
      toHit.y = 0;
      const horizDist = Math.hypot(toHit.x, toHit.z);
      if (horizDist > maxDistance && horizDist > 0.001) {
        toHit.multiplyScalar(maxDistance / horizDist);
        hitFloor.copy(this.physics.position).add(toHit);
        hitFloor.y = 0;
      }
      return this._aimOut.copy(hitFloor);
    }

    const dir = this._tmpA.copy(ray.direction);
    dir.y = 0;
    if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
    dir.normalize();
    this._aimOut.copy(this.physics.position).addScaledVector(dir, maxDistance * 0.72);
    this._aimOut.y = 0;
    return this._aimOut;
  }

  private computeForwardAimDirection(): THREE.Vector3 {
    const ndc = this.getReticleNdc();
    this._raycaster.setFromCamera(ndc, this.camera);
    const dir = this._tmpDir.copy(this._raycaster.ray.direction);
    dir.y = 0;
    if (dir.lengthSq() < 0.001) {
      dir.set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
    } else {
      dir.normalize();
    }
    return dir;
  }

  public castChaosBolt(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.teleportState.phase !== 'idle' ||
      this.supremeDrainState.active ||
      this.zombieStoneState.active
    ) {
      return false;
    }

    const hand = this.nextBoltHand;
    this.nextBoltHand = hand === 'right' ? 'left' : 'right';

    this.animator.triggerCast(hand === 'right' ? 'bolt-right' : 'bolt-left', 0.28);
    if (hand === 'right') {
      this.handFlareRight = 1.0;
    } else {
      this.handFlareLeft = 1.0;
    }

    this.rig.root.updateMatrixWorld(true);
    const handGroup = hand === 'right' ? this.rig.rightHand : this.rig.leftHand;
    handGroup.getWorldPosition(this._handWorld);
    this._handWorld.y -= 0.06;

    const target = this.computeReticleAimPoint(30, true, false);
    this.vfx.spawnChaosBolt(this._handWorld, target);
    this.fx.triggerCue('chaos-bolt-cast', this._handWorld);
    return true;
  }

  public castTeleport(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'scarlet-witch' ||
      this.skinId === 'supreme-sorceress' ||
      this.skinId === 'wanda-zombie' ||
      !this.darkholdState.active ||
      this.teleportState.phase !== 'idle'
    ) {
      return false;
    }

    const dest = this.teleportState.destination;
    dest.copy(this.computeReticleAimPoint(TELEPORT_MAX_DISTANCE, false, true));
    const safeBound = BASEPLATE_HALF_INNER - 0.85;
    dest.x = THREE.MathUtils.clamp(dest.x, -safeBound, safeBound);
    dest.z = THREE.MathUtils.clamp(dest.z, -safeBound, safeBound);
    dest.y = this.flightEnabled ? Math.max(this.physics.position.y, 0.85) : 0;

    if (this.isPositionBlockedByActor(dest, 0.8)) {
      const toDest = this._tmpA.subVectors(dest, this.physics.position);
      toDest.y = 0;
      if (toDest.lengthSq() > 0.01) {
        toDest.normalize();
        dest.addScaledVector(toDest, -1.1);
        dest.x = THREE.MathUtils.clamp(dest.x, -safeBound, safeBound);
        dest.z = THREE.MathUtils.clamp(dest.z, -safeBound, safeBound);
      }
    }

    if (
      Math.hypot(
        dest.x - this.physics.position.x,
        dest.z - this.physics.position.z,
      ) < 0.75
    ) {
      return false;
    }

    this.teleportState.phase = 'preparing';
    this.teleportState.elapsed = 0;
    this.refreshInvulnerable();
    this.callbacks.onTeleportLockChange?.(true);
    this.callbacks.onTeleportStart?.();

    this.animator.triggerCast('teleport', 0.45);
    this.handFlareLeft = 1.0;
    this.handFlareRight = 1.0;
    this.vfx.spawnBodyMistCloud(this.physics.position);
    this.fx.triggerCue('teleport-vanish', this.physics.position);
    return true;
  }

  public castChaosImplosion(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.teleportState.phase !== 'idle' ||
      this.supremeDrainState.active ||
      this.zombieStoneState.active
    ) {
      return false;
    }

    this.animator.triggerCast('implosion', 0.36);
    this.handFlareLeft = 1.25;
    this.handFlareRight = 1.25;

    this.rig.root.updateMatrixWorld(true);
    this.rig.rightHand.getWorldPosition(this._handWorld);
    this.rig.leftHand.getWorldPosition(this._leftHandWorld);
    const origin = this._handWorld.add(this._leftHandWorld).multiplyScalar(0.5);

    const target = this.computeReticleAimPoint(IMPLOSION_MAX_DISTANCE, true, true);
    target.y = Math.max(target.y, 0.25);

    this.vfx.spawnChaosImplosion(origin, target);
    this.fx.triggerCue('chaos-implosion-cast', origin);
    return true;
  }

  // ====================================================================
  // SCARLET WITCH SUPREME SORCERESS & WANDA ZOMBIE ABILITIES
  // ====================================================================

  public startSupremeDrainHold(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'scarlet-witch' ||
      this.skinId !== 'supreme-sorceress' ||
      this.teleportState.phase !== 'idle'
    ) {
      return false;
    }
    const targetId =
      this.getSelectedTargetIdUnified() ??
      this.findClosestTargetIdUnified(this.physics.position, 26);
    this.supremeDrainState.active = true;
    this.supremeDrainState.targetId = targetId;
    this.supremeDrainState.dmgAccum = 0.35;
    this.supremeDrainState.stackAccum = 0;
    this.chaosDrainBeamVfx.setActive(true);
    this.animator.setSupremeDrain(true);
    this.callbacks.onSupremeDrainChange?.(true);
    return true;
  }

  public stopSupremeDrainHold(): void {
    if (!this.supremeDrainState.active) return;
    this.supremeDrainState.active = false;
    this.supremeDrainState.targetId = null;
    this.chaosDrainBeamVfx.setActive(false);
    this.animator.setSupremeDrain(false);
    this.callbacks.onSupremeDrainChange?.(false);
  }

  public fireSupremeStackBolt(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'scarlet-witch' ||
      this.skinId !== 'supreme-sorceress' ||
      this.teleportState.phase !== 'idle' ||
      this.supremeDrainState.stacks <= 0
    ) {
      return false;
    }

    this.supremeDrainState.stacks = Math.max(0, this.supremeDrainState.stacks - 1);
    this.callbacks.onSupremeStacksChange?.(this.supremeDrainState.stacks);

    this.animator.triggerCast('supreme-beam-bolt', 0.3);
    this.handFlareRight = 1.3;
    this.rig.root.updateMatrixWorld(true);
    this.rig.rightHand.getWorldPosition(this._handWorld);
    this._handWorld.y -= 0.05;

    const target = this.computeReticleAimPoint(32, true, false);
    this.vfx.spawnSupremeBeamBolt(this._handWorld, target);
    this.fx.triggerCue('chaos-drain-bolt', this._handWorld);
    return true;
  }

  public castZombieBeam(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'scarlet-witch' ||
      this.skinId !== 'wanda-zombie' ||
      this.zombieBeamState.active ||
      this.zombieStoneState.active
    ) {
      return false;
    }

    const targetId =
      this.getSelectedTargetIdUnified() ??
      this.findClosestTargetIdUnified(this.physics.position, 26);
    this.zombieBeamState = {
      active: true,
      targetId,
      elapsed: 0,
      dmgAccum: 0.35,
    };
    this.chaosDrainBeamVfx.setActive(true);
    this.animator.setZombieBeam(true);
    this.fx.triggerCue('zombie-beam', this.physics.position);
    this.callbacks.onZombieBeamChange?.(true, false);
    return true;
  }

  public castZombieStoneExplosion(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'scarlet-witch' ||
      this.skinId !== 'wanda-zombie' ||
      this.zombieStoneState.active ||
      this.zombieBeamState.active
    ) {
      return false;
    }

    if (this.flightEnabled) {
      this.flightEnabled = false;
      this.callbacks.onFlightForceChange?.(false);
    }

    this.zombieStoneState = {
      active: true,
      elapsed: 0,
      blasted: false,
      startY: this.physics.position.y,
    };
    this.stoneExplosionVfx.start(this.physics.position, 1.35);
    this.animator.triggerCast('zombie-stone-explosion', 1.65);
    this.handFlareLeft = 1.35;
    this.handFlareRight = 1.35;
    this.fx.triggerCue('zombie-stone-charge', this.physics.position);
    this.callbacks.onZombieStoneExplosionChange?.(true, false);
    return true;
  }

  // ====================================================================
  // AGATHA HARKNESS ABILITIES
  // ====================================================================

  public castAgathaBolt(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'agatha-harkness' ||
      this.teleportState.phase !== 'idle' ||
      this.agathaShieldState.active ||
      this.agathaAbsorbState.active
    ) {
      return false;
    }

    const hand = this.nextBoltHand;
    this.nextBoltHand = hand === 'right' ? 'left' : 'right';

    this.animator.triggerCast(
      hand === 'right' ? 'agatha-bolt-right' : 'agatha-bolt-left',
      0.3,
    );
    if (hand === 'right') this.handFlareRight = 1.1;
    else this.handFlareLeft = 1.1;

    this.rig.root.updateMatrixWorld(true);
    const handGroup = hand === 'right' ? this.rig.rightHand : this.rig.leftHand;
    handGroup.getWorldPosition(this._handWorld);
    this._handWorld.y -= 0.05;

    const target = this.computeReticleAimPoint(32, true, false);
    this.agathaVfx.spawnPurpleBolt(this._handWorld, target);
    this.fx.triggerCue('agatha-bolt', this._handWorld);
    return true;
  }

  private closeAgathaDarkhold(triggerCooldown: boolean, immediate = false): void {
    if (!this.agathaDarkholdState.active) return;
    this.agathaDarkholdState.active = false;
    this.agathaDarkholdState.elapsed = 0;
    this.agathaDarkholdBook.setOpen(false, immediate);

    if (this.agathaAutoShieldState.active) {
      this.agathaAutoShieldState.active = false;
      this.agathaAutoShieldState.elapsed = 0;
      this.agathaAutoShieldState.absorbRemaining =
        SHIELD_MAX_DURABILITY['agatha-auto-shield'];
      this.callbacks.onAgathaAutoShieldChange?.(false);
    }
    this.refreshInvulnerable();

    if (!immediate && !this.dead) {
      this.fx.triggerCue('darkhold-close', this.physics.position);
    }
    this.callbacks.onAgathaDarkholdChange?.(false, triggerCooldown);
  }

  public toggleAgathaDarkhold(): boolean {
    if (this.archetype !== 'agatha-harkness') {
      return false;
    }
    if (this.agathaDarkholdState.active) {
      if (this.teleportState.phase !== 'idle') return false;
      this.closeAgathaDarkhold(true, false);
      return true;
    }

    if (
      this.dead ||
      !this.controlsEnabled ||
      this.teleportState.phase !== 'idle' ||
      this.agathaShieldState.active ||
      this.agathaAbsorbState.active
    ) {
      return false;
    }

    this.agathaDarkholdState.active = true;
    this.agathaDarkholdState.elapsed = 0;
    this.agathaDarkholdBook.setOpen(true, false);
    this.animator.triggerCast('implosion', 0.34);
    this.handFlareLeft = 1.15;
    this.handFlareRight = 1.3;
    this.agathaVfx.spawnSmokeExplosion(this.physics.position, 2.2, 0.42, 8);
    this.fx.triggerCue('darkhold-open', this.physics.position);
    this.callbacks.onAgathaDarkholdChange?.(true, false);
    return true;
  }

  public castAgathaTeleport(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'agatha-harkness' ||
      !this.agathaDarkholdState.active ||
      this.teleportState.phase !== 'idle' ||
      this.agathaShieldState.active ||
      this.agathaAbsorbState.active
    ) {
      return false;
    }

    const dest = this.teleportState.destination;
    dest.copy(this.computeReticleAimPoint(TELEPORT_MAX_DISTANCE, false, true));
    const safeBound = BASEPLATE_HALF_INNER - 0.85;
    dest.x = THREE.MathUtils.clamp(dest.x, -safeBound, safeBound);
    dest.z = THREE.MathUtils.clamp(dest.z, -safeBound, safeBound);
    dest.y = this.flightEnabled ? Math.max(this.physics.position.y, 0.85) : 0;

    if (this.isPositionBlockedByActor(dest, 0.8)) {
      const toDest = this._tmpA.subVectors(dest, this.physics.position);
      toDest.y = 0;
      if (toDest.lengthSq() > 0.01) {
        toDest.normalize();
        dest.addScaledVector(toDest, -1.1);
        dest.x = THREE.MathUtils.clamp(dest.x, -safeBound, safeBound);
        dest.z = THREE.MathUtils.clamp(dest.z, -safeBound, safeBound);
      }
    }

    if (
      Math.hypot(
        dest.x - this.physics.position.x,
        dest.z - this.physics.position.z,
      ) < 0.75
    ) {
      return false;
    }

    this.teleportState.phase = 'preparing';
    this.teleportState.elapsed = 0;
    this.refreshInvulnerable();
    this.callbacks.onTeleportLockChange?.(true);
    this.callbacks.onTeleportStart?.();

    this.animator.triggerCast('teleport', 0.45);
    this.handFlareLeft = 1.05;
    this.handFlareRight = 1.05;
    this.agathaVfx.spawnSmokeExplosion(this.physics.position, 2.3, 0.42, 10);
    this.fx.triggerCue('teleport-vanish', this.physics.position);
    return true;
  }

  public castAgathaDarkholdBlast(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'agatha-harkness' ||
      !this.agathaDarkholdState.active ||
      this.teleportState.phase !== 'idle' ||
      this.agathaShieldState.active ||
      this.agathaAbsorbState.active
    ) {
      return false;
    }

    this.animator.triggerCast('implosion', 0.38);
    this.handFlareLeft = 1.45;
    this.handFlareRight = 1.45;
    this.agathaVfx.spawnSmokeExplosion(this.physics.position, 5.8, 0.68, 22);
    this.rockBreakVfx.spawnImpact(this.physics.position, 1.5, '#A855F7');
    this.fx.triggerCue('agatha-shield-explode', this.physics.position);

    const hits = this.applyAreaFireExplosionUnified(
      this.physics.position,
      TELEKINETIC_EXPLOSION_RADIUS,
      this.scaleDamage(28),
      2.0,
      7.4,
      0,
      0,
    );
    if (hits > 0) {
      this.callbacks.onHitTarget?.();
    }
    return true;
  }

  public castAgathaAutoShield(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'agatha-harkness' ||
      !this.agathaDarkholdState.active ||
      this.agathaAutoShieldState.active ||
      this.teleportState.phase !== 'idle'
    ) {
      return false;
    }

    this.agathaAutoShieldState.active = true;
    this.agathaAutoShieldState.elapsed = 0;
    this.agathaAutoShieldState.absorbRemaining =
      SHIELD_MAX_DURABILITY['agatha-auto-shield'];
    this.refreshInvulnerable();

    this.animator.triggerCast('implosion', 0.28);
    this.handFlareLeft = 1.25;
    this.handFlareRight = 1.25;
    this.fx.triggerCue('auto-shield-on', this.physics.position);
    this.callbacks.onAgathaAutoShieldChange?.(true);
    return true;
  }

  public activateAgathaShield(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'agatha-harkness' ||
      this.agathaShieldState.active ||
      this.agathaAbsorbState.active ||
      this.teleportState.phase !== 'idle'
    ) {
      return false;
    }

    if (this.flightEnabled) {
      this.flightEnabled = false;
      this.callbacks.onFlightForceChange?.(false);
    }

    this.agathaShieldState.active = true;
    this.agathaShieldState.elapsed = 0;
    this.agathaShieldState.trackedDamage = 0;
    this.agathaShieldState.hitCounts.clear();
    this.fx.triggerCue('agatha-shield-on', this.physics.position);
    this.callbacks.onAgathaShieldChange?.(true, false);
    return true;
  }

  private triggerAgathaShieldAbsorption(attackerId: string): void {
    const restored = this.agathaShieldState.trackedDamage;
    this.agathaShieldState.active = false;
    this.agathaShieldState.elapsed = 0;
    this.agathaShieldState.trackedDamage = 0;
    this.agathaShieldState.hitCounts.clear();
    this.agathaVfx.updateAbsorptionShield(false, this.physics.position, 0);
    this.callbacks.onAgathaShieldChange?.(false, true);

    if (restored > 0 && !this.dead) {
      const healAmount = Math.min(
        this.playerMaxHp - this.playerHp,
        Math.ceil(restored),
      );
      if (healAmount > 0) {
        this.playerHp += healAmount;
        this.statusHealTimer = Math.max(this.statusHealTimer, 1.8);
        this.callbacks.onPlayerHealthChange?.(this.playerHp, this.playerMaxHp);
        this.callbacks.onPlayerHeal?.(healAmount);
      }
    }

    const attackerPos = this.agathaAbsorbState.lastAttackerPos;
    if (!this.getTargetTorsoPositionUnified(attackerId, attackerPos)) {
      attackerPos.copy(this.physics.position).add(new THREE.Vector3(0, 1.1, -3));
    }

    this.agathaAbsorbState = {
      active: true,
      attackerId,
      elapsed: 0,
      duration: 1.5,
      tickAccum: 0,
      lastAttackerPos: attackerPos.clone(),
    };
    this.animator.setAgathaAbsorb(true);
    this.agathaVfx.startAbsorbTendrils('player-absorb', attackerId, 1.5);
    this.handFlareLeft = 1.45;
    this.handFlareRight = 1.45;
    this.fx.triggerCue('agatha-drain-start', this.physics.position);
    this.callbacks.onAgathaShieldDrainTrigger?.();
  }

  private finishAgathaAbsorption(spawnBurst: boolean): void {
    if (!this.agathaAbsorbState.active) return;
    this.agathaAbsorbState.active = false;
    this.agathaAbsorbState.attackerId = null;
    this.agathaAbsorbState.elapsed = 0;
    this.agathaVfx.stopAbsorbTendrils('player-absorb');
    this.animator.setAgathaAbsorb(false);
    if (spawnBurst && !this.dead) {
      this.agathaVfx.spawnSmokeExplosion(this.physics.position, 4.8, 0.62, 16);
      this.rockBreakVfx.spawnImpact(this.physics.position, 1.3, '#A855F7');
      this.fx.triggerCue('agatha-shield-explode', this.physics.position);
    }
  }

  private endAgathaShield(triggerExplosion: boolean, triggerCooldown: boolean): void {
    if (!this.agathaShieldState.active) return;
    this.agathaShieldState.hitCounts.clear();
    this.agathaShieldState.trackedDamage = 0;
    this.agathaShieldState.active = false;
    this.agathaShieldState.elapsed = 0;
    this.agathaVfx.updateAbsorptionShield(false, this.physics.position, 0);

    if (triggerExplosion && !this.dead) {
      this.agathaVfx.spawnSmokeExplosion(this.physics.position, 5.8, 0.72, 20);
      this.rockBreakVfx.spawnImpact(this.physics.position, 1.45, '#A84CFF');
      this.fx.triggerCue('agatha-shield-explode', this.physics.position);
      const hits = this.applyAreaFireExplosionUnified(
        this.physics.position,
        5.8,
        this.scaleDamage(30),
        1.6,
        6.8,
        0,
        0,
      );
      if (hits > 0) {
        this.callbacks.onHitTarget?.();
      }
    }
    this.callbacks.onAgathaShieldChange?.(false, triggerCooldown);
  }

  // Phoenix Force Abilities
  private executeWaveBlast(
    stepIdx: number,
    pos: THREE.Vector3,
    forwardDir: THREE.Vector3,
  ): void {
    if (stepIdx === 0) {
      this.animator.triggerCast('bolt-right', 0.24);
      this.handFlareRight = 1.15;
    } else if (stepIdx === 1) {
      this.animator.triggerCast('bolt-left', 0.24);
      this.handFlareLeft = 1.15;
    } else {
      this.animator.triggerCast('implosion', 0.34);
      this.handFlareLeft = 1.35;
      this.handFlareRight = 1.35;
    }

    this.phoenixVfx.spawnPhoenixWaveExplosion(pos, stepIdx, forwardDir);
    const waveCue =
      stepIdx === 0
        ? 'phoenix-wave-step-0'
        : stepIdx === 1
          ? 'phoenix-wave-step-1'
          : 'phoenix-wave-step-2';
    this.fx.triggerCue(waveCue, pos);
    this.callbacks.onPhoenixWaveStep?.(stepIdx);
    const hits = this.applyAreaFireExplosionUnified(
      pos,
      PHOENIX_WAVE_RADIUS,
      this.scaleDamage(20),
      1.4,
      3.8,
      3.0,
      this.scaleDamage(2),
    );
    if (hits > 0) {
      this.callbacks.onHitTarget?.();
    }
  }

  public castPhoenixWave(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.teleportState.phase !== 'idle' ||
      this.painState.active
    ) {
      return false;
    }

    const fwd = this.computeForwardAimDirection();
    const safeBound = BASEPLATE_HALF_INNER - 0.85;
    const p0 = this._tmpA.copy(this.physics.position).addScaledVector(fwd, 3.2);
    p0.x = THREE.MathUtils.clamp(p0.x, -safeBound, safeBound);
    p0.z = THREE.MathUtils.clamp(p0.z, -safeBound, safeBound);
    p0.y = 0;

    const p1 = this.physics.position.clone().addScaledVector(fwd, 6.3);
    p1.x = THREE.MathUtils.clamp(p1.x, -safeBound, safeBound);
    p1.z = THREE.MathUtils.clamp(p1.z, -safeBound, safeBound);
    p1.y = 0;

    const p2 = this.physics.position.clone().addScaledVector(fwd, 9.5);
    p2.x = THREE.MathUtils.clamp(p2.x, -safeBound, safeBound);
    p2.z = THREE.MathUtils.clamp(p2.z, -safeBound, safeBound);
    p2.y = 0;

    this.callbacks.onPhoenixWaveCast?.();
    this.fx.triggerCue('phoenix-wave-cast', this.physics.position);
    // Step 0 triggers immediately (right hand); steps 1 (left hand) & 2 (both hands) follow
    this.executeWaveBlast(0, p0, fwd);
    this.scheduledWaves.push(
      { remainingSec: 0.24, stepIdx: 1, position: p1, forward: fwd.clone() },
      { remainingSec: 0.48, stepIdx: 2, position: p2, forward: fwd.clone() },
    );
    return true;
  }

  public castPhoenixFireball(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.teleportState.phase !== 'idle' ||
      this.painState.active
    ) {
      return false;
    }

    const hand = this.nextBoltHand;
    this.nextBoltHand = hand === 'right' ? 'left' : 'right';

    this.animator.triggerCast(hand === 'right' ? 'bolt-right' : 'bolt-left', 0.22);
    if (hand === 'right') {
      this.handFlareRight = 1.05;
    } else {
      this.handFlareLeft = 1.05;
    }

    this.rig.root.updateMatrixWorld(true);
    const handGroup = hand === 'right' ? this.rig.rightHand : this.rig.leftHand;
    handGroup.getWorldPosition(this._handWorld);
    this._handWorld.y -= 0.06;

    const target = this.computeReticleAimPoint(32, true, false);
    this.phoenixVfx.spawnFireball(this._handWorld, target);
    this.fx.triggerCue('phoenix-fireball-cast', this._handWorld);
    return true;
  }

  private cancelPainInfliction(triggerCooldown: boolean): void {
    const tid = this.painState.targetId;
    if (tid) {
      this.setPainRestrictedUnified(tid, false);
    }
    this.painState.active = false;
    this.painState.targetId = null;
    this.painState.elapsed = 0;
    this.painState.tickAccum = 0;
    this.painState.ticksDone = 0;
    this.refreshInvulnerable();
    this.animator.setPainChanneling(false);
    this.phoenixVfx.updatePainTelekinetic(false, null, null, 0);
    this.fx.triggerCue('pain-cancel', this.physics.position);
    this.callbacks.onPainInflictionChange?.(false, triggerCooldown);
  }

  public togglePainInfliction(): boolean {
    if (this.painState.active) {
      this.cancelPainInfliction(true);
      return true;
    }

    if (
      this.dead ||
      !this.controlsEnabled ||
      this.teleportState.phase !== 'idle' ||
      this.isPhoenixReviving()
    ) {
      return false;
    }

    const targetId =
      this.getSelectedTargetIdUnified() ??
      this.findClosestTargetIdUnified(this.physics.position, 22);
    if (!targetId || !this.getTargetTorsoPositionUnified(targetId, this._painTargetWorld)) {
      return false;
    }

    this.painState.active = true;
    this.painState.targetId = targetId;
    this.painState.elapsed = 0;
    this.painState.tickAccum = 0;
    this.painState.ticksDone = 0;
    this.painState.lastTargetPos.copy(this._painTargetWorld);
    this.physics.velocity.x = 0;
    this.physics.velocity.z = 0;
    this.refreshInvulnerable();

    this.setPainRestrictedUnified(targetId, true);
    this.animator.setPainChanneling(true);
    this.handFlareLeft = 1.15;
    this.handFlareRight = 1.25;
    this.fx.triggerCue('pain-start', this.physics.position);
    this.callbacks.onPainInflictionChange?.(true, false);
    return true;
  }

  public castPhoenixFlightDive(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'phoenix-force' ||
      !this.flightEnabled ||
      this.phoenixDiveState.phase !== 'idle' ||
      this.painState.active ||
      this.isPhoenixReviving() ||
      this.teleportState.phase !== 'idle'
    ) {
      return false;
    }

    const fwd = this._tmpDir
      .set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw))
      .normalize();
    const pds = this.phoenixDiveState;
    pds.startPos.copy(this.physics.position);
    const safeBound = BASEPLATE_HALF_INNER - 2.2;
    pds.peakPos.set(
      THREE.MathUtils.clamp(pds.startPos.x + fwd.x * 8.4, -safeBound, safeBound),
      Math.min(pds.startPos.y + 8.6, 13.4),
      THREE.MathUtils.clamp(pds.startPos.z + fwd.z * 8.4, -safeBound, safeBound),
    );
    const initialAim = this.computeReticleAimPoint(46, true, true);
    pds.aimGroundPos.copy(initialAim);
    pds.aimGroundPos.x = THREE.MathUtils.clamp(pds.aimGroundPos.x, -safeBound, safeBound);
    pds.aimGroundPos.z = THREE.MathUtils.clamp(pds.aimGroundPos.z, -safeBound, safeBound);
    pds.aimGroundPos.y =
      Math.abs(pds.aimGroundPos.x) > BASEPLATE_HALF_INNER ||
      Math.abs(pds.aimGroundPos.z) > BASEPLATE_HALF_INNER
        ? BASEPLATE_BORDER_HEIGHT
        : 0;
    pds.diveStartPos.copy(pds.peakPos);
    pds.phase = 'ascending';
    pds.elapsed = 0;
    pds.diveDuration = 0.42;

    this.physics.velocity.set(0, 0, 0);
    this.refreshInvulnerable();

    this.phoenixVfx.spawnFlightDiveLaunchBurst(pds.startPos, fwd);
    this.animator.triggerAerialSpin(0.38);
    this.fx.triggerCue('phoenix-dive-launch', pds.startPos);
    this.callbacks.onPhoenixDiveChange?.('ascending', false);
    return true;
  }

  public triggerPhoenixDiveNow(): boolean {
    if (this.dead || this.phoenixDiveState.phase !== 'hovering') {
      return false;
    }
    this.beginPhoenixDiveDescent();
    return true;
  }

  private beginPhoenixDiveDescent(): void {
    const pds = this.phoenixDiveState;
    if (pds.phase !== 'hovering') return;
    pds.diveStartPos.copy(this.physics.position);
    const dist = pds.diveStartPos.distanceTo(pds.aimGroundPos);
    pds.diveDuration = THREE.MathUtils.clamp(dist / 36, 0.24, 0.72);
    pds.phase = 'diving';
    pds.elapsed = 0;
    this.phoenixVfx.updateDiveAimIndicator(false);
    this.fx.triggerCue('phoenix-dive-launch', this.physics.position);
    this.callbacks.onPhoenixDiveChange?.('diving', false);
  }

  // ====================================================================
  // EMMA FROST ABILITIES
  // ====================================================================

  private clearMindControl(triggerCooldown: boolean): void {
    const tid = this.mindControlState.targetId;
    if (tid) {
      this.setMindControlImmuneUnified(tid, false);
      this.setExternalControlUnified(tid, false);
    }
    this.emmaVfx.setMindControlBeam(false);
    this.animator.setTelepathicWave(false);
    const hadActive = this.mindControlState.phase !== 'idle';
    this.mindControlState.phase = 'idle';
    this.mindControlState.targetId = null;
    this.mindControlState.elapsed = 0;
    this.mindControlState.dmgAccum = 0;
    this.refreshInvulnerable();
    if (hadActive) {
      this.callbacks.onMindControlChange?.('idle', triggerCooldown);
    }
  }

  public activateMindControl(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'emma-frost' ||
      this.skinId !== 'white-queen' ||
      this.astralState.phase !== 'idle' ||
      this.diamondState.active ||
      this.telepathicWaveState.active ||
      this.mindControlState.phase !== 'idle'
    ) {
      return false;
    }

    const targetId = this.getSelectedTargetIdUnified();
    if (!targetId) {
      this.callbacks.onAbilityFeedback?.('Select a target first');
      return false;
    }

    const probe = this.findProbeById(this.getAllTargetProbes(), targetId);
    const targetHead = this._tmpA;
    if (!probe || !this.getTargetHeadPositionUnified(targetId, targetHead)) {
      this.callbacks.onAbilityFeedback?.('Select a valid target first');
      return false;
    }

    this.physics.velocity.x = 0;
    this.physics.velocity.z = 0;

    const yawToNpc = Math.atan2(
      -(probe.position.x - this.physics.position.x),
      -(probe.position.z - this.physics.position.z),
    );
    this.cameraYaw = yawToNpc;
    this.rig.root.rotation.y = yawToNpc;

    this.setMindControlImmuneUnified(targetId, true);
    this.setExternalControlUnified(targetId, true);
    this.setExternalPoseUnified(targetId, probe.position, yawToNpc + Math.PI, {
      headache: true,
    });

    this.rig.root.updateMatrixWorld(true);
    this._foreheadPos.set(0, 0.3, -0.25).applyMatrix4(this.rig.head.matrixWorld);
    this.emmaVfx.setMindControlBeam(true, this._foreheadPos, targetHead);

    this.animator.setTelepathicWave(true);
    this.mindControlState.phase = 'choosing';
    this.mindControlState.targetId = targetId;
    this.mindControlState.elapsed = 0;
    this.mindControlState.dmgAccum = 0;
    this.refreshInvulnerable();

    this.fx.triggerCue('mind-control-link', this._foreheadPos);
    this.callbacks.onMindControlChange?.('choosing', false);
    return true;
  }

  public selectMindControlOption(
    option: 'mc-paralysis' | 'mc-sleep' | 'mc-mental-damage',
  ): void {
    if (
      this.dead ||
      this.archetype !== 'emma-frost' ||
      this.mindControlState.phase !== 'choosing' ||
      !this.mindControlState.targetId
    ) {
      return;
    }

    const targetId = this.mindControlState.targetId;
    if (!this.isTargetAliveUnified(targetId)) {
      this.clearMindControl(true);
      return;
    }

    this.fx.triggerCue('mind-control-select', this.physics.position);

    if (option === 'mc-paralysis') {
      this.setMindControlImmuneUnified(targetId, false);
      this.setExternalControlUnified(targetId, false);
      if (
        this.mindControlState.paralysisTargetId &&
        this.mindControlState.paralysisTargetId !== targetId
      ) {
        this.setMindControlParalysisUnified(
          this.mindControlState.paralysisTargetId,
          false,
        );
      }
      this.setMindControlParalysisUnified(targetId, true);
      this.mindControlState.paralysisTargetId = targetId;
      this.mindControlState.paralysisRemaining = EMMA_MC_PARALYSIS_MS / 1000;

      this.emmaVfx.setMindControlBeam(false);
      this.animator.setTelepathicWave(false);
      this.mindControlState.phase = 'idle';
      this.mindControlState.targetId = null;
      this.mindControlState.elapsed = 0;
      this.mindControlState.dmgAccum = 0;
      this.refreshInvulnerable();
      this.callbacks.onMindControlChange?.('idle', true);
      return;
    }

    if (option === 'mc-sleep') {
      this.setMindControlImmuneUnified(targetId, false);
      this.setExternalControlUnified(targetId, false);
      this.triggerTargetRagdollUnified(targetId, EMMA_MC_SLEEP_MS / 1000);

      this.emmaVfx.setMindControlBeam(false);
      this.animator.setTelepathicWave(false);
      this.mindControlState.phase = 'idle';
      this.mindControlState.targetId = null;
      this.mindControlState.elapsed = 0;
      this.mindControlState.dmgAccum = 0;
      this.refreshInvulnerable();
      this.callbacks.onMindControlChange?.('idle', true);
      return;
    }

    // option === 'mc-mental-damage' (immunity persists for Emma & target during channel)
    this.mindControlState.phase = 'mental-damage';
    this.mindControlState.elapsed = 0;
    this.mindControlState.dmgAccum = 0.25;
    this.refreshInvulnerable();
    this.callbacks.onMindControlChange?.('mental-damage', false);
  }

  public castMentalAttack(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'emma-frost' ||
      this.astralState.phase === 'returning' ||
      this.diamondState.active ||
      this.telepathicWaveState.active ||
      this.mindControlState.phase === 'choosing' ||
      this.mindControlState.phase === 'mental-damage'
    ) {
      return false;
    }

    this.rig.root.updateMatrixWorld(true);
    this.rig.head.getWorldPosition(this._foreheadPos);
    const sinY = Math.sin(this.rig.root.rotation.y);
    const cosY = Math.cos(this.rig.root.rotation.y);
    this._foreheadPos.x += -sinY * 0.24;
    this._foreheadPos.y += 0.14;
    this._foreheadPos.z += -cosY * 0.24;

    const targetId =
      this.getSelectedTargetIdUnified() ??
      this.findClosestTargetIdUnified(this.physics.position, 24);
    const targetHead = new THREE.Vector3();
    if (!targetId || !this.getTargetHeadPositionUnified(targetId, targetHead)) {
      targetHead.copy(this.computeReticleAimPoint(24, true, false));
      targetHead.y += 0.5;
    }

    this.animator.triggerCast('mental-focus', 0.3);
    this.fx.triggerCue('mental-attack', this._foreheadPos);

    const originCopy = this._foreheadPos.clone();
    this.emmaVfx.spawnMentalAttack(originCopy, targetHead, targetId, () => {
      const impactPos = this._tmpA.copy(targetHead);
      if (targetId && this.getTargetHeadPositionUnified(targetId, impactPos)) {
        // Updated head world coordinates
      }
      this.emmaVfx.spawnMentalHeadExplosion(impactPos);
      this.fx.triggerCue('mental-impact', impactPos);
      this.callbacks.onMentalAttackImpact?.();

      if (targetId && this.isTargetAliveUnified(targetId)) {
        const hitDir = this._tmpDir.subVectors(impactPos, originCopy);
        hitDir.y = 0;
        if (hitDir.lengthSq() < 0.001) hitDir.set(-sinY, 0, -cosY);
        else hitDir.normalize();
        if (this.applyDamageUnified(targetId, this.scaleDamage(15), hitDir, 0)) {
          this.callbacks.onHitTarget?.();
        }
      }
    });
    return true;
  }

  private disposeAstralBodyDecoy(): void {
    if (this.astralState.bodyRig) {
      this.scene.remove(this.astralState.bodyRig.root);
      this.astralState.bodyRig.dispose();
      this.astralState.bodyRig = null;
    }
    this.astralState.bodyAnimator = null;
  }

  private beginAstralReturn(): void {
    if (this.astralState.phase !== 'projecting') return;
    this.astralState.phase = 'returning';
    this.astralState.returnElapsed = 0;
    this.astralState.returnStartPos.copy(this.physics.position);
    const dist = this.physics.position.distanceTo(this.astralState.bodyPos);
    this.astralState.returnDuration = THREE.MathUtils.clamp(dist / 26, 0.28, 0.65);
    this.physics.velocity.set(0, 0, 0);
    this.fx.triggerCue('astral-off', this.physics.position);
    this.callbacks.onAstralPhaseChange?.('returning', false);
  }

  private finishAstralReturn(triggerCooldown: boolean): void {
    this.physics.position.copy(this.astralState.bodyPos);
    this.physics.velocity.set(0, 0, 0);
    this.rig.root.position.copy(this.astralState.bodyPos);
    this.rig.root.rotation.y = this.astralState.bodyYaw;
    this.disposeAstralBodyDecoy();
    this.astralState.phase = 'idle';
    this.astralState.elapsed = 0;
    this.astralState.returnElapsed = 0;
    this.astralState.bodyHits = 0;
    this.astralState.bodyHitFlashTimer = 0;
    this.rig.setAstralProjection(false);
    this.flightEnabled = this.astralState.preFlight;
    this.physics.resolveHorizontalOverlap();
    this.refreshInvulnerable();
    this.fx.triggerCue('astral-off', this.physics.position);
    this.callbacks.onAstralPhaseChange?.('idle', triggerCooldown);
    this.callbacks.onAstralProjectionChange?.(false, triggerCooldown);
  }

  public toggleAstralProjection(): boolean {
    if (this.archetype !== 'emma-frost' || this.skinId === 'white-queen') {
      return false;
    }
    if (this.astralState.phase === 'returning') {
      return false;
    }
    if (this.astralState.phase === 'projecting') {
      this.beginAstralReturn();
      return true;
    }

    if (
      this.dead ||
      !this.controlsEnabled ||
      this.diamondState.active ||
      this.telepathicWaveState.active ||
      this.mindControlState.phase !== 'idle'
    ) {
      return false;
    }

    this.disposeAstralBodyDecoy();
    const bodyRig = createR16Character(this.currentAppearance);
    bodyRig.root.position.copy(this.physics.position);
    bodyRig.root.rotation.y = this.rig.root.rotation.y;
    this.scene.add(bodyRig.root);

    const bodyAnimator = new CharacterAnimator(bodyRig, 'emma-frost');

    this.astralState.phase = 'projecting';
    this.astralState.elapsed = 0;
    this.astralState.returnElapsed = 0;
    this.astralState.bodyPos.copy(this.physics.position);
    this.astralState.bodyYaw = this.rig.root.rotation.y;
    this.astralState.bodyRig = bodyRig;
    this.astralState.bodyAnimator = bodyAnimator;
    this.astralState.preFlight = this.flightEnabled;
    this.astralState.bodyHits = 0;
    this.astralState.bodyHitFlashTimer = 0;

    // Astral projection continuously flies & passes cleanly through walls/obstacles
    this.flightEnabled = true;
    this.physics.position.y = Math.max(this.physics.position.y, 0.96);
    this.rig.setAstralProjection(true);
    this.refreshInvulnerable();
    this.animator.triggerCast('mental-focus', 0.3);
    this.fx.triggerCue('astral-on', this.physics.position);
    this.callbacks.onAstralPhaseChange?.('projecting', false);
    this.callbacks.onAstralProjectionChange?.(true, false);
    return true;
  }

  public toggleDiamondForm(): boolean {
    if (this.archetype !== 'emma-frost') return false;
    if (this.astralState.phase !== 'idle') return false;
    if (this.diamondState.active) {
      this.diamondState.active = false;
      this.diamondState.elapsed = 0;
      this.diamondState.absorbRemaining = SHIELD_MAX_DURABILITY['diamond-form'];
      this.refreshInvulnerable();
      this.fx.triggerCue('diamond-off', this.physics.position);
      this.callbacks.onDiamondFormChange?.(false, true);
      return true;
    }

    if (
      this.dead ||
      !this.controlsEnabled ||
      this.mindControlState.phase === 'choosing' ||
      this.mindControlState.phase === 'mental-damage' ||
      this.telepathicWaveState.active
    ) {
      return false;
    }

    this.diamondState.active = true;
    this.diamondState.elapsed = 0;
    this.diamondState.absorbRemaining = SHIELD_MAX_DURABILITY['diamond-form'];
    this.refreshInvulnerable();
    this.animator.triggerCast('diamond-cast', 0.36);
    this.fx.triggerCue('diamond-on', this.physics.position);
    this.callbacks.onDiamondFormChange?.(true, false);
    return true;
  }

  public castDiamondProjectile(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'emma-frost' ||
      this.astralState.phase !== 'idle' ||
      !this.diamondState.active
    ) {
      return false;
    }

    const hand = this.nextBoltHand;
    this.nextBoltHand = hand === 'right' ? 'left' : 'right';
    this.animator.triggerCast(hand === 'right' ? 'bolt-right' : 'bolt-left', 0.24);

    this.rig.root.updateMatrixWorld(true);
    const handGroup = hand === 'right' ? this.rig.rightHand : this.rig.leftHand;
    handGroup.getWorldPosition(this._handWorld);
    this._handWorld.y -= 0.05;

    const target = this.computeReticleAimPoint(28, true, false);
    this.emmaVfx.spawnDiamondProjectile(this._handWorld, target);
    this.fx.triggerCue('diamond-shard', this._handWorld);
    return true;
  }

  public castTelepathicWave(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'emma-frost' ||
      this.astralState.phase !== 'idle' ||
      this.diamondState.active ||
      this.mindControlState.phase === 'choosing' ||
      this.mindControlState.phase === 'mental-damage' ||
      this.telepathicWaveState.active
    ) {
      return false;
    }

    this.telepathicWaveState = {
      active: true,
      elapsed: 0,
      ringAccum: 0.24,
      tickAccum: 0.38,
    };
    this.animator.setTelepathicWave(true);
    this.fx.triggerCue('telepathic-wave', this.physics.position);
    this.callbacks.onTelepathicWaveChange?.(true, false);
    return true;
  }

  // ====================================================================
  // HELA ABILITIES
  // ====================================================================

  public toggleCrownForm(): boolean {
    if (this.archetype !== 'hela') return false;
    if (this.crownState.active) {
      this.crownState.active = false;
      this.crownState.elapsed = 0;
      this.fx.triggerCue('crown-off', this.physics.position);
      this.callbacks.onCrownFormChange?.(false, true);
      return true;
    }

    if (this.dead || !this.controlsEnabled || this.isPhoenixReviving()) {
      return false;
    }

    this.crownState.active = true;
    this.crownState.elapsed = 0;

    this.animator.triggerCast('crown-transform', 0.44);
    this.fx.triggerCue('crown-on', this.physics.position);
    this.callbacks.onCrownFormChange?.(true, false);
    return true;
  }

  public activateSwordSummon(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.isPhoenixReviving() ||
      this.archetype !== 'hela' ||
      this.swordSummonState.active
    ) {
      return false;
    }

    this.swordSummonState = {
      active: true,
      elapsed: 0,
      leftInHand: true,
      rightInHand: true,
      nextThrowHand: 'right',
      reloadHand: null,
      throwReady: true,
      reloadElapsed: 0,
      reloading: false,
      slashCooldownRemaining: 0,
    };
    this.rig.setHelaHandSwords(true, true);
    this.animator.setSwordHeld(true);
    this.animator.triggerCast('sword-summon-open', 0.42);
    this.fx.triggerCue('sword-summon', this.physics.position);
    this.callbacks.onSwordSummonChange?.(true, false);
    this.callbacks.onSwordThrowAvailabilityChange?.(true);
    return true;
  }

  public throwNecrosword(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.isPhoenixReviving() ||
      this.archetype !== 'hela' ||
      !this.swordSummonState.active ||
      !this.swordSummonState.throwReady
    ) {
      return false;
    }

    const hand = this.swordSummonState.nextThrowHand;
    this.swordSummonState.nextThrowHand = hand === 'right' ? 'left' : 'right';
    if (hand === 'right') {
      this.swordSummonState.rightInHand = false;
    } else {
      this.swordSummonState.leftInHand = false;
    }
    this.swordSummonState.reloadHand = hand;
    this.swordSummonState.throwReady = false;
    this.swordSummonState.reloading = true;
    this.swordSummonState.reloadElapsed = 0;

    this.rig.setHelaHandSwords(
      this.swordSummonState.leftInHand,
      this.swordSummonState.rightInHand,
    );
    this.animator.triggerCast(
      hand === 'right' ? 'sword-throw-right' : 'sword-throw-left',
      0.38,
    );

    this.rig.root.updateMatrixWorld(true);
    const handGroup = hand === 'right' ? this.rig.rightHand : this.rig.leftHand;
    handGroup.getWorldPosition(this._handWorld);
    const target = this.computeReticleAimPoint(28, true, false);
    const dmg = this.scaleDamage(25 + (this.crownState.active ? HELA_CROWN_BONUS_DAMAGE : 0));

    this.helaVfx.spawnThrownSword(this._handWorld, target, dmg);
    this.fx.triggerCue('sword-throw', this._handWorld);
    this.callbacks.onSwordThrowAvailabilityChange?.(false);
    return true;
  }

  public castSwordSlash(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.isPhoenixReviving() ||
      this.archetype !== 'hela' ||
      !this.swordSummonState.active ||
      this.swordSummonState.slashCooldownRemaining > 0
    ) {
      return false;
    }

    const probes = this.getAllTargetProbes();
    let closest: { id: string; dist: number; dx: number; dz: number } | null = null;
    for (const trg of probes) {
      const dx = trg.position.x - this.physics.position.x;
      const dz = trg.position.z - this.physics.position.z;
      const dy = Math.abs(trg.position.y - this.physics.position.y);
      const dist = Math.hypot(dx, dz);
      if (dist <= 2.95 && dy <= 2.2 && (!closest || dist < closest.dist)) {
        closest = { id: trg.id, dist, dx, dz };
      }
    }

    this.swordSummonState.slashCooldownRemaining = HELA_SWORD_SLASH_COOLDOWN_MS / 1000;

    const roll = Math.random();
    const kind: 'right' | 'left' | 'dual' =
      roll < 0.34 ? 'right' : roll < 0.68 ? 'left' : 'dual';

    this.animator.triggerCast(
      kind === 'right'
        ? 'sword-slash-right'
        : kind === 'left'
          ? 'sword-slash-left'
          : 'sword-slash-dual',
      0.3,
    );

    const hitDir = closest
      ? this._tmpDir.set(closest.dx, 0, closest.dz)
      : this._tmpDir.set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
    if (hitDir.lengthSq() > 1e-4) {
      hitDir.normalize();
    } else {
      hitDir.set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
    }

    const slashOrigin = this._tmpA
      .copy(this.physics.position)
      .addScaledVector(hitDir, 0.55);
    slashOrigin.y += 1.15;
    this.helaVfx.spawnSwordSlashTrail(slashOrigin, hitDir, kind);
    this.fx.triggerCue('sword-slash', slashOrigin);
    this.callbacks.onSwordSlash?.();

    const baseDmg = kind === 'dual' ? 26 : 20;
    const dmg = this.scaleDamage(baseDmg + (this.crownState.active ? HELA_CROWN_BONUS_DAMAGE : 0));

    // Single-hit close arc validation (never multi-hits the same target per swing)
    let hitAny = false;
    for (let i = 0; i < probes.length; i++) {
      const trg = probes[i];
      const dx = trg.position.x - this.physics.position.x;
      const dz = trg.position.z - this.physics.position.z;
      const dy = Math.abs(trg.position.y - this.physics.position.y);
      const dist = Math.hypot(dx, dz);
      if (dist <= 2.95 && dy <= 2.2) {
        const dot =
          dist > 0.01 ? (dx * hitDir.x + dz * hitDir.z) / dist : 1;
        if ((closest && trg.id === closest.id) || dot >= 0.35) {
          const knock =
            dist > 0.01 ? this._tmpKnock.set(dx / dist, 0, dz / dist) : hitDir;
          if (this.applyDamageUnified(trg.id, dmg, knock, 0)) {
            hitAny = true;
          }
        }
      }
    }
    if (hitAny) {
      this.callbacks.onHitTarget?.();
    }
    return true;
  }

  public castGreenExplosion(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.isPhoenixReviving() ||
      this.archetype !== 'hela' ||
      this.greenChargeState.active
    ) {
      return false;
    }

    this.greenChargeState = {
      active: true,
      elapsed: 0,
    };
    this.animator.triggerCast('green-charge-slam', 0.68);
    this.fx.triggerCue('green-charge', this.physics.position);
    this.callbacks.onGreenExplosion?.('charge');
    return true;
  }

  public castSpinningLeap(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.isPhoenixReviving() ||
      this.archetype !== 'hela' ||
      this.spinningLeapState.active
    ) {
      return false;
    }

    const fwd = this.computeForwardAimDirection();
    this.physics.position.y = Math.max(this.physics.position.y, 0.06);
    this.physics.velocity.set(fwd.x * 21.8, 15.2, fwd.z * 21.8);

    this.spinningLeapState = {
      active: true,
      elapsed: 0,
    };
    this.animator.setSpinningLeap(true);
    this.fx.triggerCue('spinning-leap', this.physics.position);
    this.callbacks.onSpinningLeap?.('launch');
    return true;
  }

  public castGroundSword(): boolean {
    if (this.dead || !this.controlsEnabled || this.archetype !== 'hela') {
      return false;
    }

    const center = this.computeReticleAimPoint(22, true, true);
    const safeBound = BASEPLATE_HALF_INNER - 0.85;
    center.x = THREE.MathUtils.clamp(center.x, -safeBound, safeBound);
    center.z = THREE.MathUtils.clamp(center.z, -safeBound, safeBound);
    center.y = 0;

    this.animator.triggerCast('implosion', 0.34);
    this.helaVfx.spawnGroundSword(center);
    this.rockBreakVfx.spawnImpact(center, 1.45, '#2BE86B');
    this.fx.triggerCue('ground-sword', center);
    this.callbacks.onGroundSword?.();

    const dmg = this.scaleDamage(35 + (this.crownState.active ? HELA_CROWN_BONUS_DAMAGE : 0));
    const hits = this.applyAreaFireExplosionUnified(
      center,
      3.2,
      dmg,
      1.8,
      6.2,
      0,
      0,
    );
    if (hits > 0) {
      this.callbacks.onHitTarget?.();
    }
    return true;
  }

  // ====================================================================
  // MAGNETO ABILITIES
  // ====================================================================

  public castMetalProjectile(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'magneto' ||
      this.flightEnabled ||
      this.magnetoMeteorActive ||
      this.magnetoTornadoState.active
    ) {
      if (this.archetype === 'magneto' && this.flightEnabled) {
        this.callbacks.onAbilityFeedback?.('Land first to use offensive abilities');
      }
      return false;
    }

    const hand = this.nextMagnetoHand;
    this.nextMagnetoHand = hand === 'right' ? 'left' : 'right';
    this.animator.triggerCast(
      hand === 'right' ? 'magneto-throw-right' : 'magneto-throw-left',
      0.34,
    );

    this.rig.root.updateMatrixWorld(true);
    const handGroup = hand === 'right' ? this.rig.rightHand : this.rig.leftHand;
    handGroup.getWorldPosition(this._handWorld);
    const target = this.computeReticleAimPoint(32, true, false);
    this.magnetoVfx.spawnMetalProjectile(
      this._handWorld,
      target,
      hand === 'right' ? 0 : 1,
    );
    this.fx.triggerCue('magneto-throw', this._handWorld);
    this.callbacks.onMagnetoThrow?.();
    return true;
  }

  public castMagneticMeteor(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'magneto' ||
      this.flightEnabled ||
      this.magnetoMeteorActive ||
      this.magnetoTornadoState.active ||
      this.magnetoVfx.isMeteorBusy()
    ) {
      if (this.archetype === 'magneto' && this.flightEnabled) {
        this.callbacks.onAbilityFeedback?.('Land first to use offensive abilities');
      }
      return false;
    }

    const aimPoint = this.computeReticleAimPoint(24, true, true);
    const safeBound = BASEPLATE_HALF_INNER - 1.2;
    aimPoint.x = THREE.MathUtils.clamp(aimPoint.x, -safeBound, safeBound);
    aimPoint.z = THREE.MathUtils.clamp(aimPoint.z, -safeBound, safeBound);

    if (!this.magnetoVfx.startMeteorSequence(this.physics.position, aimPoint)) {
      return false;
    }
    this.magnetoPreFlight = false;
    this.magnetoMeteorActive = true;
    this.physics.position.y = Math.max(this.physics.position.y, 1.35);
    this.animator.triggerCast('meteor-raise', 1.15);
    this.fx.triggerCue('magneto-meteor-charge', this.physics.position);
    this.callbacks.onMagnetoMeteorStage?.('charge');
    return true;
  }

  public toggleMetalTornado(): boolean {
    if (this.archetype !== 'magneto') return false;
    if (this.magnetoTornadoState.active) {
      this.magnetoTornadoState.active = false;
      this.magnetoTornadoState.elapsed = 0;
      this.magnetoVfx.setTornadoActive(false);
      this.animator.setMetalTornado(false);
      this.flightEnabled = false;
      this.magnetoShieldState.active = false;
      this.magnetoVfx.setShieldActive(false);
      this.refreshInvulnerable();
      this.callbacks.onFlightForceChange?.(false);
      this.callbacks.onMagnetoTornadoChange?.(false, true);
      return true;
    }

    if (
      this.dead ||
      !this.controlsEnabled ||
      this.flightEnabled ||
      this.magnetoMeteorActive
    ) {
      if (this.flightEnabled) {
        this.callbacks.onAbilityFeedback?.('Land first to use offensive abilities');
      }
      return false;
    }

    this.magnetoPreFlight = false;
    this.magnetoTornadoState.active = true;
    this.magnetoTornadoState.elapsed = 0;
    this.physics.position.y = Math.max(this.physics.position.y, 1.5);
    this.magnetoVfx.setTornadoActive(true);
    this.animator.setMetalTornado(true);
    this.fx.triggerCue('magneto-tornado', this.physics.position);
    this.callbacks.onMagnetoTornadoChange?.(true, false);
    return true;
  }

  // ====================================================================
  // QUICKSILVER ABILITIES
  // ====================================================================

  public toggleSuperSpeed(): boolean {
    if (this.archetype !== 'quicksilver') return false;
    if (this.superSpeedState.active) {
      this.superSpeedState.active = false;
      this.fx.triggerCue('qs-speed-off', this.physics.position);
      this.callbacks.onSuperSpeedChange?.(false);
      return true;
    }

    if (this.dead || !this.controlsEnabled) return false;
    this.superSpeedState.active = true;
    this.fx.triggerCue('qs-speed-on', this.physics.position);
    this.callbacks.onSuperSpeedChange?.(true);
    return true;
  }

  public castRapidPunchCombo(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'quicksilver' ||
      this.skinId === 'speed' ||
      this.rapidPunchState.active ||
      this.windTornadoState.active
    ) {
      return false;
    }

    const selected = this.getSelectedTargetIdUnified();
    let targetId = selected;
    if (targetId) {
      if (!this.getTargetTorsoPositionUnified(targetId, this._aimTarget)) {
        targetId = null;
      } else {
        const horizDist = Math.hypot(
          this._aimTarget.x - this.physics.position.x,
          this._aimTarget.z - this.physics.position.z,
        );
        if (horizDist > 6.5 || Math.abs(this._aimTarget.y - this.physics.position.y) > 4.0) {
          this.callbacks.onAbilityFeedback?.('Move closer to target');
          return false;
        }
      }
    }
    if (!targetId) {
      targetId = this.findClosestTargetIdUnified(this.physics.position, 6.5);
    }
    if (!targetId || !this.getTargetTorsoPositionUnified(targetId, this._aimTarget)) {
      this.callbacks.onAbilityFeedback?.('Move closer to a target');
      return false;
    }

    // Blitz directly in front of close target and lock target into rapid punch combo
    const npcProbe = this.findProbeById(this.getAllTargetProbes(), targetId);
    const npcFloor = npcProbe
      ? this._tmpA.copy(npcProbe.position)
      : this._tmpA.copy(this._aimTarget).setY(0);
    const approachDir = this._tmpDir.subVectors(npcFloor, this.physics.position);
    approachDir.y = 0;
    if (approachDir.lengthSq() < 0.001) {
      approachDir.set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
    } else {
      approachDir.normalize();
    }

    const frontPos = this._tmpB.copy(npcFloor).addScaledVector(approachDir, -1.18);
    const safeBound = BASEPLATE_HALF_INNER - 1.2;
    frontPos.x = THREE.MathUtils.clamp(frontPos.x, -safeBound, safeBound);
    frontPos.z = THREE.MathUtils.clamp(frontPos.z, -safeBound, safeBound);
    frontPos.y = Math.max(0, npcFloor.y);

    this.flightEnabled = false;
    this.physics.position.copy(frontPos);
    this.physics.velocity.set(0, 0, 0);
    this.rig.root.position.copy(frontPos);

    const playerToNpcYaw = Math.atan2(-(npcFloor.x - frontPos.x), -(npcFloor.z - frontPos.z));
    this.cameraYaw = playerToNpcYaw;
    this.rig.root.rotation.y = playerToNpcYaw;
    this.setExternalControlUnified(targetId, true);
    this.setExternalPoseUnified(targetId, npcFloor, playerToNpcYaw + Math.PI, { headache: true });

    this.rapidPunchState = {
      active: true,
      targetId,
      elapsed: 0,
      punchAccum: 0.18,
      finished: false,
      sideSign: 1,
    };
    this.refreshInvulnerable();
    this.animator.setRapidPunch(true);
    this.fx.triggerCue('qs-punch-hit', npcFloor);
    this.callbacks.onRapidPunchChange?.(true, false);
    return true;
  }

  private computeSpeedBlitzArrivalPos(
    fromPos: THREE.Vector3,
    targetPos: THREE.Vector3,
    out: THREE.Vector3,
  ): void {
    const approach = this._tmpDir.subVectors(targetPos, fromPos);
    approach.y = 0;
    if (approach.lengthSq() < 0.001) {
      approach.set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
    } else {
      approach.normalize();
    }
    const safeBound = BASEPLATE_HALF_INNER - 1.2;
    out.copy(targetPos).addScaledVector(approach, -1.12);
    out.x = THREE.MathUtils.clamp(out.x, -safeBound, safeBound);
    out.z = THREE.MathUtils.clamp(out.z, -safeBound, safeBound);
    const onBorder =
      Math.abs(out.x) > BASEPLATE_HALF_INNER ||
      Math.abs(out.z) > BASEPLATE_HALF_INNER;
    out.y = onBorder ? BASEPLATE_BORDER_HEIGHT : 0;
  }

  private finishSpeedBlitz(triggerCooldown: boolean): void {
    const sb = this.speedBlitzState;
    if (!sb.active) return;
    sb.active = false;
    sb.hitIds.clear();
    sb.hopTargetId = null;
    this.physics.velocity.set(0, 0, 0);
    const safeBound = BASEPLATE_HALF_INNER - 1.2;
    this.physics.position.x = THREE.MathUtils.clamp(this.physics.position.x, -safeBound, safeBound);
    this.physics.position.z = THREE.MathUtils.clamp(this.physics.position.z, -safeBound, safeBound);
    const onBorder =
      Math.abs(this.physics.position.x) > BASEPLATE_HALF_INNER ||
      Math.abs(this.physics.position.z) > BASEPLATE_HALF_INNER;
    this.physics.position.y = Math.max(
      onBorder ? BASEPLATE_BORDER_HEIGHT : 0,
      this.physics.position.y,
    );
    this.rig.root.position.copy(this.physics.position);
    this.refreshInvulnerable();
    this.callbacks.onSpeedBlitzChange?.(false, triggerCooldown);
  }

  public castSpeedBlitz(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'quicksilver' ||
      this.skinId !== 'speed' ||
      this.speedBlitzState.active ||
      this.rapidPunchState.active ||
      this.windTornadoState.active ||
      this.teleportState.phase !== 'idle'
    ) {
      return false;
    }

    const probes = this.getAllTargetProbes();
    const selectedId = this.getSelectedTargetIdUnified();
    let firstProbe: CombatTargetProbe | undefined;

    if (selectedId) {
      const sel = this.findProbeById(probes, selectedId);
      if (sel) {
        const horizDist = Math.hypot(
          sel.position.x - this.physics.position.x,
          sel.position.z - this.physics.position.z,
        );
        if (horizDist <= 13.5 && Math.abs(sel.position.y - this.physics.position.y) <= 4.2) {
          firstProbe = sel;
        } else {
          this.callbacks.onAbilityFeedback?.('Move closer to target');
          return false;
        }
      }
    }

    if (!firstProbe) {
      let bestDist = 13.0;
      for (let i = 0; i < probes.length; i++) {
        const p = probes[i];
        const horizDist = Math.hypot(
          p.position.x - this.physics.position.x,
          p.position.z - this.physics.position.z,
        );
        if (horizDist <= bestDist && Math.abs(p.position.y - this.physics.position.y) <= 4.2) {
          bestDist = horizDist;
          firstProbe = p;
        }
      }
    }

    if (!firstProbe) {
      this.callbacks.onAbilityFeedback?.('Move closer to a target');
      return false;
    }

    const sb = this.speedBlitzState;
    sb.active = true;
    sb.origin.copy(this.physics.position);
    sb.hitsDone = 0;
    sb.hitIds.clear();
    sb.hopStartPos.copy(this.physics.position);
    this.computeSpeedBlitzArrivalPos(sb.hopStartPos, firstProbe.position, sb.hopDestPos);
    sb.totalTravel = Math.hypot(
      sb.hopDestPos.x - sb.hopStartPos.x,
      sb.hopDestPos.z - sb.hopStartPos.z,
    );
    sb.hopTargetId = firstProbe.id;
    sb.hopElapsed = 0;
    sb.hopDuration = 0.095;
    sb.hopPunched = false;
    sb.sideSign = 1;

    this.flightEnabled = false;
    this.physics.velocity.set(0, 0, 0);
    const yaw = Math.atan2(
      -(firstProbe.position.x - sb.hopStartPos.x),
      -(firstProbe.position.z - sb.hopStartPos.z),
    );
    this.cameraYaw = yaw;
    this.rig.root.rotation.y = yaw;
    this.quicksilverVfx.spawnBlitzDash(sb.hopStartPos, sb.hopDestPos, yaw);
    this.refreshInvulnerable();
    this.callbacks.onSpeedBlitzChange?.(true, false);
    return true;
  }

  public toggleWindTornado(): boolean {
    if (this.archetype !== 'quicksilver') return false;
    if (this.windTornadoState.active) {
      this.windTornadoState.active = false;
      this.windTornadoState.elapsed = 0;
      this.quicksilverVfx.setWindTornado(false);
      this.callbacks.onWindTornadoChange?.(false, true);
      return true;
    }

    if (
      this.dead ||
      !this.controlsEnabled ||
      this.rapidPunchState.active ||
      this.speedBlitzState.active
    ) {
      return false;
    }

    this.flightEnabled = false;
    this.windTornadoState.active = true;
    this.windTornadoState.elapsed = 0;
    this.windTornadoState.center.set(this.physics.position.x, 0, this.physics.position.z);
    this.windTornadoState.angle = 0;
    this.quicksilverVfx.setWindTornado(true, this.windTornadoState.center);
    this.fx.triggerCue('qs-tornado', this.windTornadoState.center);
    this.callbacks.onWindTornadoChange?.(true, false);
    return true;
  }

  public castTimeStop(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'quicksilver' ||
      this.speedBlitzState.active
    ) {
      return false;
    }
    if (!this.quicksilverVfx.spawnTimeStop(this.physics.position)) {
      return false;
    }
    this.animator.triggerCast('qs-time-slam', 0.45);
    this.fx.triggerCue('qs-time-stop', this.physics.position);
    this.callbacks.onTimeStopCast?.();
    return true;
  }

  // ====================================================================
  // DOCTOR STRANGE & THE ANCIENT ONE ABILITIES
  // ====================================================================

  public toggleMysticShield(): boolean {
    if (this.archetype !== 'doctor-strange' || this.skinId === 'ancient-one') {
      return false;
    }
    if (this.strangeShieldState.active) {
      this.strangeShieldState.active = false;
      this.strangeShieldState.elapsed = 0;
      this.strangeShieldState.absorbRemaining = SHIELD_MAX_DURABILITY['mystic-shield'];
      this.strangeVfx.setShieldActive(false);
      this.refreshInvulnerable();
      this.fx.triggerCue('strange-shield-off', this.physics.position);
      this.callbacks.onStrangeShieldChange?.(false, true);
      return true;
    }

    if (
      this.dead ||
      !this.controlsEnabled ||
      !this.flightEnabled ||
      this.astralExtractionState.active ||
      this.purgatoryGraspState.active
    ) {
      return false;
    }
    this.strangeShieldState.active = true;
    this.strangeShieldState.elapsed = 0;
    this.strangeShieldState.absorbRemaining = SHIELD_MAX_DURABILITY['mystic-shield'];
    this.strangeVfx.setShieldActive(true);
    this.refreshInvulnerable();
    this.animator.triggerCast('strange-shield-cast', 0.54);
    this.fx.triggerCue('strange-shield-on', this.physics.position);
    this.callbacks.onStrangeShieldChange?.(true, false);
    return true;
  }

  public castMysticClones(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'doctor-strange' ||
      this.astralExtractionState.active ||
      this.purgatoryGraspState.active ||
      this.strangeClonesPrecastState.active ||
      this.strangeVfx.isClonesActive()
    ) {
      return false;
    }

    const targetId =
      this.getSelectedTargetIdUnified() ??
      this.findClosestTargetIdUnified(this.physics.position, 24);
    if (!targetId) {
      this.callbacks.onAbilityFeedback?.('Target an enemy first');
      return false;
    }
    const probe = this.findProbeById(this.getAllTargetProbes(), targetId);
    if (!probe) return false;

    this.strangeClonesPrecastState = {
      active: true,
      elapsed: 0,
      targetId,
    };
    this.animator.triggerCast('strange-clones-precast', 0.44);
    return true;
  }

  public castPurgatoryGrasp(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'doctor-strange' ||
      this.skinId === 'ancient-one' ||
      this.purgatoryGraspState.active ||
      this.astralExtractionState.active ||
      this.strangeClonesPrecastState.active
    ) {
      return false;
    }

    const probes = this.getAllTargetProbes();
    const nearby = probes
      .filter((p) => p.position.distanceTo(this.physics.position) <= 11.5)
      .sort(
        (a, b) =>
          a.position.distanceToSquared(this.physics.position) -
          b.position.distanceToSquared(this.physics.position),
      )
      .slice(0, 6);

    if (nearby.length === 0) {
      this.callbacks.onAbilityFeedback?.('No enemies nearby');
      return false;
    }

    const targets = nearby.map((p) => {
      this.setExternalControlUnified(p.id, true);
      this.strangeVfx.addPurgatoryTarget(p.id, p.position);
      return {
        id: p.id,
        x: p.position.x,
        z: p.position.z,
        startY: Math.max(0, p.position.y),
      };
    });

    this.purgatoryGraspState = {
      active: true,
      elapsed: 0,
      slammed: false,
      targets,
    };
    this.animator.triggerCast('purgatory-grasp-cast', 0.95);
    this.fx.triggerCue('purgatory-grasp', this.physics.position);
    this.callbacks.onPurgatoryGraspCast?.();
    return true;
  }

  public castEldritchDisc(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'doctor-strange' ||
      this.astralExtractionState.active
    ) {
      return false;
    }

    this.animator.triggerCast('strange-disc-cast', 0.34);
    this.rig.root.updateMatrixWorld(true);
    this.rig.rightHand.getWorldPosition(this._handWorld);
    this._handWorld.y -= 0.04;

    const target = this.computeReticleAimPoint(34, true, false);
    this.strangeVfx.spawnEldritchDisc(this._handWorld, target);
    this.fx.triggerCue('strange-disc', this._handWorld);
    this.callbacks.onStrangeDiscCast?.();
    return true;
  }

  public castAstralExtraction(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'doctor-strange' ||
      this.skinId !== 'ancient-one' ||
      this.astralExtractionState.active ||
      this.strangeVfx.isClonesActive()
    ) {
      return false;
    }

    const selected = this.getSelectedTargetIdUnified();
    const probes = this.getAllTargetProbes();
    let targetProbe = selected ? this.findProbeById(probes, selected) : undefined;
    if (
      !targetProbe ||
      Math.hypot(
        targetProbe.position.x - this.physics.position.x,
        targetProbe.position.z - this.physics.position.z,
      ) > 3.8
    ) {
      const closestId = this.findClosestTargetIdUnified(this.physics.position, 3.8);
      targetProbe = closestId ? this.findProbeById(probes, closestId) : undefined;
    }

    if (!targetProbe) {
      this.callbacks.onAbilityFeedback?.('Move closer to a target');
      return false;
    }

    const targetAppearance = this.getTargetAppearanceUnified(targetProbe.id);
    if (!targetAppearance) return false;

    const aes = this.astralExtractionState;
    const npcPos = aes.targetPos.copy(targetProbe.position);
    npcPos.y = Math.max(0, npcPos.y);
    const knockAxis = aes.knockAxis.subVectors(npcPos, this.physics.position);
    knockAxis.y = 0;
    if (knockAxis.lengthSq() < 0.001) {
      knockAxis.set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
    } else {
      knockAxis.normalize();
    }

    const standPos = this._tmpA.copy(npcPos).addScaledVector(knockAxis, -1.24);
    const safeBound = BASEPLATE_HALF_INNER - 1.2;
    standPos.x = THREE.MathUtils.clamp(standPos.x, -safeBound, safeBound);
    standPos.z = THREE.MathUtils.clamp(standPos.z, -safeBound, safeBound);
    standPos.y = npcPos.y;

    if (this.flightEnabled) {
      this.flightEnabled = false;
      this.callbacks.onFlightForceChange?.(false);
    }

    this.physics.position.copy(standPos);
    this.physics.velocity.set(0, 0, 0);
    this.rig.root.position.copy(standPos);

    const yawToTarget = Math.atan2(
      -(npcPos.x - standPos.x),
      -(npcPos.z - standPos.z),
    );
    const targetYaw = yawToTarget + Math.PI;
    this.cameraYaw = yawToTarget;
    this.rig.root.rotation.y = yawToTarget;

    this.setExternalControlUnified(targetProbe.id, true);
    this.setExternalPoseUnified(targetProbe.id, npcPos, targetYaw);

    this.strangeVfx.startAstralExtractionSoul(targetAppearance);
    this.animator.triggerCast('ancient-one-extract', 0.9);
    aes.active = true;
    aes.targetId = targetProbe.id;
    aes.elapsed = 0;
    aes.impactApplied = false;
    aes.targetYaw = targetYaw;
    this.refreshInvulnerable();
    return true;
  }

  // ====================================================================
  // VISION ABILITIES
  // ====================================================================

  private getMindStoneWorldPosition(out: THREE.Vector3): THREE.Vector3 {
    this.rig.root.updateMatrixWorld(true);
    if (this.rig.mindStone) {
      return this.rig.mindStone.getWorldPosition(out);
    }
    return out.set(0, 0.34, -0.22).applyMatrix4(this.rig.head.matrixWorld);
  }

  public toggleIntangibility(): boolean {
    if (this.archetype !== 'vision') return false;
    if (this.visionIntangibleState.active) {
      this.visionIntangibleState.active = false;
      this.visionIntangibleState.elapsed = 0;
      this.physics.resolveHorizontalOverlap();
      this.refreshInvulnerable();
      this.fx.triggerCue('vision-phase-off', this.physics.position);
      this.callbacks.onVisionPhaseChange?.(false, true);
      return true;
    }

    if (
      this.dead ||
      !this.controlsEnabled ||
      !this.flightEnabled ||
      this.visionHeadGripState.active
    ) {
      return false;
    }
    this.visionIntangibleState.active = true;
    this.visionIntangibleState.elapsed = 0;
    this.refreshInvulnerable();
    this.fx.triggerCue('vision-phase-on', this.physics.position);
    this.callbacks.onVisionPhaseChange?.(true, false);
    return true;
  }

  public castMindStoneLaser(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'vision' ||
      this.visionLaserState.active ||
      this.visionBoltChargeState.active ||
      this.visionHeadGripState.active
    ) {
      return false;
    }

    this.visionLaserState = {
      active: true,
      elapsed: 0,
    };
    this.visionVfx.setLaserActive(true);
    this.animator.setMindLaser(true);
    this.getMindStoneWorldPosition(this._mindStoneWorld);
    this.fx.triggerCue('vision-laser', this._mindStoneWorld);
    this.callbacks.onVisionLaserChange?.(true, false);
    return true;
  }

  public castMindStoneProjectile(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'vision' ||
      this.visionBoltChargeState.active ||
      this.visionLaserState.active ||
      this.visionHeadGripState.active
    ) {
      return false;
    }

    const shotStep = this.visionBoltShotCount % 3;
    this.visionBoltShotCount++;

    if (shotStep < 2) {
      this.getMindStoneWorldPosition(this._mindStoneWorld);
      const target = this.computeReticleAimPoint(36, true, false);
      this.visionVfx.spawnSmallMindBolt(this._mindStoneWorld, target);
      this.animator.triggerCast('vision-bolt-small', 0.24);
      this.fx.triggerCue('vision-bolt-small', this._mindStoneWorld);
      this.callbacks.onVisionBoltSmallCast?.();
      return true;
    }

    this.visionBoltChargeState = {
      active: true,
      elapsed: 0,
    };
    this.physics.velocity.x = 0;
    this.physics.velocity.z = 0;
    this.getMindStoneWorldPosition(this._mindStoneWorld);
    this.animator.setVisionBoltCharge(true);
    this.visionVfx.setBoltCharging(true, 0);
    this.fx.triggerCue('vision-bolt-charge', this._mindStoneWorld);
    this.callbacks.onVisionBoltCharge?.();
    return true;
  }

  public castHeadGrip(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'vision' ||
      this.visionHeadGripState.active ||
      this.visionBoltChargeState.active ||
      this.visionLaserState.active
    ) {
      return false;
    }

    let targetId = this.getSelectedTargetIdUnified();
    if (!targetId) {
      targetId = this.findClosestTargetIdUnified(this.physics.position, 5.5);
    }
    if (!targetId) {
      this.callbacks.onAbilityFeedback?.('Move closer to a target');
      return false;
    }
    const probe = this.findProbeById(this.getAllTargetProbes(), targetId);
    if (!probe) {
      this.callbacks.onAbilityFeedback?.('Select a valid target first');
      return false;
    }
    const horizDist = Math.hypot(
      probe.position.x - this.physics.position.x,
      probe.position.z - this.physics.position.z,
    );
    if (horizDist > 5.5 || Math.abs(probe.position.y - this.physics.position.y) > 3.5) {
      this.callbacks.onAbilityFeedback?.('Move closer to target');
      return false;
    }

    const npcFloor = this.visionHeadGripState.lockedPos.copy(probe.position);
    const approachDir = this._tmpDir.subVectors(npcFloor, this.physics.position);
    approachDir.y = 0;
    if (approachDir.lengthSq() < 0.001) {
      approachDir.set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
    } else {
      approachDir.normalize();
    }

    const standPos = this._tmpA.copy(npcFloor).addScaledVector(approachDir, -0.78);
    const safeBound = BASEPLATE_HALF_INNER - 1.2;
    standPos.x = THREE.MathUtils.clamp(standPos.x, -safeBound, safeBound);
    standPos.z = THREE.MathUtils.clamp(standPos.z, -safeBound, safeBound);
    standPos.y = Math.max(0, npcFloor.y);

    if (this.visionIntangibleState.active) {
      this.visionIntangibleState.active = false;
      this.visionIntangibleState.elapsed = 0;
      this.physics.resolveHorizontalOverlap();
      this.callbacks.onVisionPhaseChange?.(false, true);
    }
    if (this.flightEnabled) {
      this.flightEnabled = false;
      this.callbacks.onFlightForceChange?.(false);
    }

    this.physics.position.copy(standPos);
    this.physics.velocity.set(0, 0, 0);
    this.rig.root.position.copy(standPos);

    const yawToNpc = Math.atan2(-(npcFloor.x - standPos.x), -(npcFloor.z - standPos.z));
    this.cameraYaw = yawToNpc;
    this.rig.root.rotation.y = yawToNpc;

    this.setExternalControlUnified(targetId, true);
    this.setExternalPoseUnified(targetId, npcFloor, yawToNpc + Math.PI, { headache: true });

    this.visionHeadGripState.active = true;
    this.visionHeadGripState.targetId = targetId;
    this.visionHeadGripState.elapsed = 0;
    this.visionHeadGripState.tickAccum = 0.35;
    this.visionHeadGripState.ticksDone = 0;
    this.visionHeadGripState.slammed = false;
    this.refreshInvulnerable();
    this.animator.setHeadGrip(true);
    this.fx.triggerCue('vision-head-grip', npcFloor);
    this.callbacks.onVisionHeadGripChange?.(true, false);
    return true;
  }

  // ==================== INVISIBLE WOMAN ABILITIES ====================

  private cancelInvisibility(triggerCooldown = true): void {
    const inv = this.invisibilityState;
    if (!inv.active && inv.phase !== 'vanishing' && inv.phase !== 'cloaked') {
      return;
    }
    inv.active = false;
    inv.elapsed = 0;
    inv.phase = 'revealing';
    this.fx.setSustainedBlueTint(false);
    this.fx.triggerCue('invisibility-off', this.physics.position);
    this.callbacks.onInvisibilityChange?.(false, triggerCooldown);
  }

  private endForcefieldShield(triggerCooldown: boolean): void {
    const ffs = this.forcefieldShieldState;
    const wasActive = ffs.active;
    ffs.active = false;
    ffs.elapsed = 0;
    ffs.maxDurability = FORCEFIELD_SHIELD_MAX_DURABILITY;
    ffs.absorbRemaining = FORCEFIELD_SHIELD_MAX_DURABILITY;
    this.animator.setForcefieldShield(false);
    this.refreshInvulnerable();
    if (wasActive) {
      this.fx.triggerCue('forcefield-shield-off', this.physics.position);
      this.callbacks.onForcefieldShieldChange?.(false, triggerCooldown);
    }
  }

  private cleanupForcefieldTransfer(triggerEndShieldIfExpired = false): void {
    const fft = this.forcefieldTransferState;
    if (fft.targetId) {
      this.setForcefieldStateUnified(fft.targetId, null);
    }
    const wasActive = fft.phase !== 'idle';
    fft.phase = 'idle';
    fft.targetId = null;
    fft.targetShieldMaxHp = 0;
    fft.effectElapsed = 0;
    fft.tickAccum = 0;
    fft.ticksDone = 0;
    this.refreshInvulnerable();
    if (wasActive) {
      this.callbacks.onForcefieldTransferPhaseChange?.('idle');
    }
    if (
      triggerEndShieldIfExpired &&
      this.forcefieldShieldState.active &&
      this.forcefieldShieldState.elapsed >= FORCEFIELD_SHIELD_DURATION_MS / 1000
    ) {
      this.endForcefieldShield(true);
    }
  }

  public toggleInvisibility(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'invisible-woman' ||
      this.teleportState.phase !== 'idle' ||
      this.barrierLockTimer > 0 ||
      this.forcefieldTransferState.phase !== 'idle'
    ) {
      return false;
    }

    const inv = this.invisibilityState;
    if (inv.active) {
      this.cancelInvisibility(true);
      return true;
    }

    if (this.forcefieldShieldState.active) {
      this.endForcefieldShield(true);
    }

    inv.active = true;
    inv.elapsed = 0;
    inv.phase = 'vanishing';
    inv.progress = 0;
    this.fx.setSustainedBlueTint(true);
    this.fx.triggerCue('invisibility-on', this.physics.position);
    this.callbacks.onInvisibilityChange?.(true, false);
    return true;
  }

  public toggleForcefieldShield(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'invisible-woman' ||
      this.teleportState.phase !== 'idle' ||
      this.barrierLockTimer > 0 ||
      this.forcefieldTransferState.phase !== 'idle'
    ) {
      return false;
    }

    this.cancelInvisibility(true);

    if (this.forcefieldShieldState.active) {
      this.endForcefieldShield(true);
      return true;
    }

    this.forcefieldShieldState.active = true;
    this.forcefieldShieldState.elapsed = 0;
    this.forcefieldShieldState.maxDurability = FORCEFIELD_SHIELD_MAX_DURABILITY;
    this.forcefieldShieldState.absorbRemaining = FORCEFIELD_SHIELD_MAX_DURABILITY;
    this.animator.setForcefieldShield(true);
    this.refreshInvulnerable();
    this.fx.triggerCue('forcefield-shield-on', this.physics.position);
    this.callbacks.onForcefieldShieldChange?.(true, false);
    return true;
  }

  public transferForcefieldShield(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'invisible-woman' ||
      !this.forcefieldShieldState.active ||
      this.forcefieldShieldState.absorbRemaining <= 1 ||
      this.forcefieldTransferState.phase !== 'idle' ||
      this.forcefieldTransferCooldownTimer > 0 ||
      this.barrierLockTimer > 0
    ) {
      return false;
    }

    this.cancelInvisibility(true);

    const targetId = this.getSelectedTargetIdUnified();
    if (!targetId || !this.isTargetAliveUnified(targetId)) {
      this.callbacks.onAbilityFeedback?.('Aim at a target to transfer Forcefield!');
      return false;
    }
    if (!this.getTargetTorsoPositionUnified(targetId, this._ffTorso)) {
      return false;
    }
    if (this._ffTorso.distanceTo(this.physics.position) > 26) {
      this.callbacks.onAbilityFeedback?.('Target out of Forcefield range!');
      return false;
    }

    const totalRemaining = this.forcefieldShieldState.absorbRemaining;
    const halfDurability = Math.max(1, Math.round(totalRemaining * 0.5));
    this.forcefieldShieldState.absorbRemaining = halfDurability;
    this.forcefieldShieldState.maxDurability = halfDurability;
    this.forcefieldTransferCooldownTimer = FORCEFIELD_TRANSFER_COOLDOWN_MS / 1000;

    this.forcefieldTransferState.phase = 'choosing';
    this.forcefieldTransferState.targetId = targetId;
    this.forcefieldTransferState.targetShieldMaxHp = halfDurability;
    this.forcefieldTransferState.effectElapsed = 0;
    this.forcefieldTransferState.tickAccum = 0;
    this.forcefieldTransferState.ticksDone = 0;

    this.setForcefieldStateUnified(targetId, {
      trapped: true,
      abilitiesLocked: true,
      externalImmune: false,
      shieldHp: halfDurability,
      shieldMaxHp: halfDurability,
    });
    this.fx.triggerCue('forcefield-transfer', this._ffTorso);
    this.callbacks.onForcefieldTransferCooldownStart?.();
    this.callbacks.onForcefieldTransferPhaseChange?.('choosing');
    return true;
  }

  public selectForcefieldOption(option: 'protection' | 'suffocation'): void {
    const fft = this.forcefieldTransferState;
    if (this.dead || fft.phase !== 'choosing' || !fft.targetId) return;

    const targetId = fft.targetId;
    if (!this.isTargetAliveUnified(targetId)) {
      this.cleanupForcefieldTransfer(true);
      return;
    }

    fft.phase = option;
    fft.effectElapsed = 0;
    fft.tickAccum = 0;
    fft.ticksDone = 0;

    this.getTargetTorsoPositionUnified(targetId, this._ffTorso);
    if (option === 'protection') {
      this.setForcefieldStateUnified(targetId, {
        trapped: false,
        abilitiesLocked: true,
        externalImmune: true,
      });
      this.fx.triggerCue('forcefield-protection', this._ffTorso);
    } else {
      this.setForcefieldStateUnified(targetId, {
        trapped: true,
        abilitiesLocked: true,
        externalImmune: true,
      });
      this.fx.triggerCue('forcefield-suffocation', this._ffTorso);
    }

    this.refreshInvulnerable();
    this.callbacks.onForcefieldTransferPhaseChange?.(option);
  }

  public castForcefieldBarrier(): boolean {
    if (
      this.dead ||
      !this.controlsEnabled ||
      this.archetype !== 'invisible-woman' ||
      this.teleportState.phase !== 'idle' ||
      this.barrierLockTimer > 0 ||
      this.forcefieldTransferState.phase !== 'idle'
    ) {
      return false;
    }

    this.cancelInvisibility(true);

    const dir = this.computeForwardAimDirection();
    this.barrierLockedYaw = Math.atan2(-dir.x, -dir.z);
    this.rig.root.rotation.y = this.barrierLockedYaw;
    this.physics.velocity.x = 0;
    this.physics.velocity.z = 0;
    this.barrierLockTimer = FORCEFIELD_BARRIER_LOCK_MS / 1000;

    this.animator.triggerCast('invisible-disc-throw', FORCEFIELD_BARRIER_LOCK_MS / 1000);
    this._ffOrigin.set(
      this.physics.position.x + dir.x * 0.65,
      this.physics.position.y + 1.12,
      this.physics.position.z + dir.z * 0.65,
    );
    this.invisibleVfx.spawnBarrierDisc(this._ffOrigin, dir);
    this.fx.triggerCue('forcefield-barrier-cast', this._ffOrigin);
    this.callbacks.onForcefieldBarrierCast?.();
    this.callbacks.onForcefieldBarrierLockChange?.(true);
    return true;
  }

  public setControlsEnabled(enabled: boolean): void {
    this.controlsEnabled = enabled;
    if (!enabled) {
      this.joyX = 0;
      this.joyY = 0;
      this.keyForward = 0;
      this.keyRight = 0;
      this.jumpQueued = false;
    }
  }

  private clearCharacterAbilityStates(immediate = false): void {
    this.scheduledWaves = [];
    if (this.painState.active) {
      this.cancelPainInfliction(false);
    }
    if (this.darkholdState.active) {
      this.closeDarkhold(false, immediate);
    }
    this.darkholdBook.setOpen(false, true);
    this.shieldState.active = false;
    this.shieldState.elapsed = 0;
    this.shieldState.absorbRemaining = AUTO_SHIELD_MAX_ABSORB;
    this.callbacks.onAutoShieldChange?.(false);

    if (this.teleportState.phase !== 'idle') {
      this.teleportState.phase = 'idle';
      this.callbacks.onTeleportLockChange?.(false);
    }

    this.clearMindControl(false);
    if (this.mindControlState.paralysisTargetId) {
      this.setMindControlParalysisUnified(this.mindControlState.paralysisTargetId, false);
      this.mindControlState.paralysisTargetId = null;
      this.mindControlState.paralysisRemaining = 0;
    }
    this.diamondState.absorbRemaining = SHIELD_MAX_DURABILITY['diamond-form'];
    if (this.diamondState.active || this.diamondState.blend > 0) {
      this.diamondState.active = false;
      this.diamondState.elapsed = 0;
      this.diamondState.blend = 0;
      this.rig.setDiamondForm(0);
      this.callbacks.onDiamondFormChange?.(false, false);
    }
    if (this.telepathicWaveState.active) {
      this.telepathicWaveState.active = false;
      this.animator.setTelepathicWave(false);
      this.callbacks.onTelepathicWaveChange?.(false, false);
    }
    this.astralState.bodyHits = 0;
    this.astralState.bodyHitFlashTimer = 0;
    if (this.astralState.phase !== 'idle') {
      this.disposeAstralBodyDecoy();
      this.astralState.phase = 'idle';
      this.astralState.elapsed = 0;
      this.astralState.returnElapsed = 0;
      this.rig.setAstralProjection(false);
      this.callbacks.onAstralPhaseChange?.('idle', false);
      this.callbacks.onAstralProjectionChange?.(false, false);
    }
    if (this.phoenixDiveState.phase !== 'idle') {
      this.phoenixDiveState.phase = 'idle';
      this.phoenixDiveState.elapsed = 0;
      this.phoenixVfx.updateDiveAimIndicator(false);
      this.callbacks.onPhoenixDiveChange?.('idle', false);
    }

    if (this.crownState.active || this.crownState.blend > 0) {
      this.crownState.active = false;
      this.crownState.elapsed = 0;
      this.crownState.blend = 0;
      this.rig.setHelaCrownMode(false);
      this.callbacks.onCrownFormChange?.(false, false);
    }
    if (this.swordSummonState.active) {
      this.swordSummonState.active = false;
      this.swordSummonState.leftInHand = false;
      this.swordSummonState.rightInHand = false;
      this.swordSummonState.reloadHand = null;
      this.swordSummonState.throwReady = false;
      this.swordSummonState.reloading = false;
      this.swordSummonState.slashCooldownRemaining = 0;
      this.rig.setHelaHandSwords(false, false);
      this.animator.setSwordHeld(false);
      this.callbacks.onSwordSummonChange?.(false, false);
      this.callbacks.onSwordThrowAvailabilityChange?.(false);
    }
    this.emmaIdleRings.clear();
    this.greenChargeState.active = false;
    this.greenChargeState.elapsed = 0;
    this.helaVfx.updateHandGather(0, false, null, 0);
    if (this.spinningLeapState.active) {
      this.spinningLeapState.active = false;
      this.animator.setSpinningLeap(false);
    }
    this.phoenixRevivalState.phase = 'idle';
    this.phoenixRevivalState.elapsed = 0;
    this.animator.setPhoenixManifest(false);

    // Magneto cleanup
    if (this.magnetoShieldState.active) {
      this.magnetoShieldState.active = false;
      this.magnetoShieldState.elapsed = 0;
    }
    if (this.magnetoTornadoState.active) {
      this.magnetoTornadoState.active = false;
      this.magnetoTornadoState.elapsed = 0;
      this.animator.setMetalTornado(false);
      this.callbacks.onMagnetoTornadoChange?.(false, false);
    }
    this.magnetoMeteorActive = false;
    this.magnetoPreFlight = false;
    this.magnetoVfx.clearAll((id) => this.setExternalControlUnified(id, false));

    // Quicksilver cleanup
    if (this.superSpeedState.active) {
      this.superSpeedState.active = false;
      this.callbacks.onSuperSpeedChange?.(false);
    }
    if (this.rapidPunchState.active) {
      if (this.rapidPunchState.targetId) {
        this.setExternalControlUnified(this.rapidPunchState.targetId, false);
      }
      this.rapidPunchState.active = false;
      this.rapidPunchState.targetId = null;
      this.animator.setRapidPunch(false);
      this.callbacks.onRapidPunchChange?.(false, false);
    }
    if (this.speedBlitzState.active) {
      this.finishSpeedBlitz(false);
    }
    if (this.windTornadoState.active) {
      this.windTornadoState.active = false;
      this.windTornadoState.elapsed = 0;
      this.callbacks.onWindTornadoChange?.(false, false);
    }
    this.quicksilverVfx.clearAll(
      (id) => this.setExternalControlUnified(id, false),
      (id) => this.setParalyzedUnified(id, false),
    );

    // Doctor Strange & Ancient One cleanup
    this.strangeShieldState.absorbRemaining = SHIELD_MAX_DURABILITY['mystic-shield'];
    if (this.strangeShieldState.active) {
      this.strangeShieldState.active = false;
      this.strangeShieldState.elapsed = 0;
      this.callbacks.onStrangeShieldChange?.(false, false);
    }
    this.strangeClonesPrecastState.active = false;
    this.strangeClonesPrecastState.elapsed = 0;
    this.strangeClonesPrecastState.targetId = null;
    if (this.purgatoryGraspState.active) {
      for (const t of this.purgatoryGraspState.targets) {
        this.strangeVfx.removePurgatoryTarget(t.id);
        this.setExternalControlUnified(t.id, false);
      }
      this.purgatoryGraspState.active = false;
      this.purgatoryGraspState.elapsed = 0;
      this.purgatoryGraspState.targets = [];
    }
    if (this.astralExtractionState.active) {
      if (this.astralExtractionState.targetId) {
        this.setExternalControlUnified(this.astralExtractionState.targetId, false);
      }
      this.astralExtractionState.active = false;
      this.astralExtractionState.targetId = null;
      this.astralExtractionState.elapsed = 0;
    }
    this.strangeVfx.clearAll((id) => this.setClonesRestrictedUnified(id, false));

    // Agatha Harkness, Supreme Sorceress & Wanda Zombie cleanup
    if (this.supremeDrainState.active) {
      this.stopSupremeDrainHold();
    }
    if (this.supremeDrainState.stacks !== 0) {
      this.supremeDrainState.stacks = 0;
      this.callbacks.onSupremeStacksChange?.(0);
    }
    if (this.zombieBeamState.active) {
      this.zombieBeamState.active = false;
      this.zombieBeamState.targetId = null;
      this.zombieBeamState.elapsed = 0;
      this.chaosDrainBeamVfx.setActive(false);
      this.animator.setZombieBeam(false);
      this.callbacks.onZombieBeamChange?.(false, false);
    }
    if (this.zombieStoneState.active) {
      this.zombieStoneState.active = false;
      this.zombieStoneState.elapsed = 0;
      this.zombieStoneState.blasted = false;
      this.callbacks.onZombieStoneExplosionChange?.(false, false);
    }
    this.stoneExplosionVfx.clear();

    if (this.agathaDarkholdState.active) {
      this.closeAgathaDarkhold(false, immediate);
    }
    this.agathaDarkholdBook.setOpen(false, true);
    this.agathaAutoShieldState.active = false;
    this.agathaAutoShieldState.elapsed = 0;
    this.agathaAutoShieldState.absorbRemaining =
      SHIELD_MAX_DURABILITY['agatha-auto-shield'];
    this.callbacks.onAgathaAutoShieldChange?.(false);

    if (this.agathaAbsorbState.active) {
      this.finishAgathaAbsorption(false);
    }
    if (this.agathaShieldState.active) {
      this.endAgathaShield(false, false);
    }
    this.agathaVfx.clearAll();

    // Vision cleanup
    this.visionBoltShotCount = 0;
    if (this.visionIntangibleState.active || this.visionIntangibleState.blend > 0) {
      this.visionIntangibleState.active = false;
      this.visionIntangibleState.elapsed = 0;
      this.visionIntangibleState.blend = 0;
      this.rig.setIntangible(false, 0);
      this.callbacks.onVisionPhaseChange?.(false, false);
    }
    if (this.visionLaserState.active) {
      this.visionLaserState.active = false;
      this.visionLaserState.elapsed = 0;
      this.animator.setMindLaser(false);
      this.callbacks.onVisionLaserChange?.(false, false);
    }
    if (this.visionBoltChargeState.active) {
      this.visionBoltChargeState.active = false;
      this.visionBoltChargeState.elapsed = 0;
      this.animator.setVisionBoltCharge(false);
      this.visionVfx.setBoltCharging(false, 0);
    }
    if (this.visionHeadGripState.active) {
      if (this.visionHeadGripState.targetId) {
        this.setExternalControlUnified(this.visionHeadGripState.targetId, false);
      }
      this.visionHeadGripState.active = false;
      this.visionHeadGripState.targetId = null;
      this.animator.setHeadGrip(false);
      this.callbacks.onVisionHeadGripChange?.(false, false);
    }
    this.visionVfx.clearAll();

    // Invisible Woman cleanup
    if (
      this.invisibilityState.active ||
      this.invisibilityState.phase !== 'idle' ||
      this.invisibilityState.progress > 0
    ) {
      this.invisibilityState.active = false;
      this.invisibilityState.elapsed = 0;
      this.invisibilityState.phase = 'idle';
      this.invisibilityState.progress = 0;
      this.rig.setInvisibilityCloak(false, 2.2, 0, 1);
      this.fx.setSustainedBlueTint(false);
      this.callbacks.onInvisibilityChange?.(false, false);
    }
    this.forcefieldShieldState.maxDurability = FORCEFIELD_SHIELD_MAX_DURABILITY;
    this.forcefieldShieldState.absorbRemaining = FORCEFIELD_SHIELD_MAX_DURABILITY;
    if (this.forcefieldShieldState.active) {
      this.forcefieldShieldState.active = false;
      this.forcefieldShieldState.elapsed = 0;
      this.animator.setForcefieldShield(false);
      this.callbacks.onForcefieldShieldChange?.(false, false);
    }
    if (this.forcefieldTransferState.targetId) {
      this.setForcefieldStateUnified(this.forcefieldTransferState.targetId, null);
    }
    if (this.forcefieldTransferState.phase !== 'idle') {
      this.forcefieldTransferState.phase = 'idle';
      this.forcefieldTransferState.targetId = null;
      this.forcefieldTransferState.targetShieldMaxHp = 0;
      this.forcefieldTransferState.effectElapsed = 0;
      this.forcefieldTransferState.tickAccum = 0;
      this.forcefieldTransferState.ticksDone = 0;
      this.callbacks.onForcefieldTransferPhaseChange?.('idle');
    }
    if (this.barrierLockTimer > 0) {
      this.barrierLockTimer = 0;
      this.callbacks.onForcefieldBarrierLockChange?.(false);
    }
    this.forcefieldTransferCooldownTimer = 0;
    this.invisibleVfx.reset();

    this.clearAllCrowdControlUnified();
    this.playerHitRestrictTimer = 0;
    this.statusHealTimer = 0;
    this.statusDotTimer = 0;
    this.statusParalyzeTimer = 0;
    this.statusNoPowersTimer = 0;
    this.refreshInvulnerable();
  }

  public triggerDeath(): void {
    if (this.dead) return;
    this.dead = true;
    this.controlsEnabled = false;
    this.flightEnabled = false;
    this.invulnerable = false;
    this.killStreakCount = 0;
    this.multiKillCount = 0;
    this.multiKillWindowTimer = 0;
    this.clearCharacterAbilityStates(true);
    this.rig.setOpacity(1);
    this.fx.triggerCue('death', this.physics.position);

    this.playerHp = 0;
    this.callbacks.onPlayerHealthChange?.(0, this.playerMaxHp);

    this.joyX = 0;
    this.joyY = 0;
    this.keyForward = 0;
    this.keyRight = 0;
    this.jumpQueued = false;
    this.ragdoll.trigger(
      this.physics.position,
      this.physics.velocity,
      this.cameraYaw,
    );
  }

  public respawn(cinematic = true): void {
    this.ragdoll.reset();
    this.physics.reset();
    this.vfx.clearActiveProjectiles();
    this.phoenixVfx.clearActiveEffects();
    this.emmaVfx.clearActiveEffects();
    this.helaVfx.clearActiveEffects();
    this.landingDust.clear();
    this.clearCharacterAbilityStates(true);

    this.animator.reset(this.rig, this.archetype, this.skinId);
    this.rig.setOpacity(1);

    this.dead = false;
    this.flightEnabled = false;
    this.invulnerable = false;
    this.wasGrounded = true;
    this.nextBoltHand = 'right';
    this.killStreakCount = 0;
    this.multiKillCount = 0;
    this.multiKillWindowTimer = 0;
    this.stamina = this.maxStamina;
    this.staminaRegenDelayTimer = 0;
    this.lastReportedStamina = this.maxStamina;
    this.callbacks.onStaminaChange?.(this.stamina, this.maxStamina, 0);

    this.playerHp = this.playerMaxHp;
    this.callbacks.onPlayerHealthChange?.(this.playerHp, this.playerMaxHp);

    this.controlsEnabled = true;
    this.joyX = 0;
    this.joyY = 0;
    this.keyForward = 0;
    this.keyRight = 0;
    this.jumpQueued = false;
    this.cameraPitch = 0.22;
    this.camInitialized = false;

    const nowMs = performance.now();
    const canSpecialPhoenixRevive =
      cinematic &&
      this.archetype === 'phoenix-force' &&
      nowMs - this.lastPhoenixRevivalMs >= PHOENIX_SPECIAL_REVIVAL_COOLDOWN_MS;

    if (canSpecialPhoenixRevive) {
      // Phoenix Force & Dark Phoenix 60s-cooldown Special Revival
      this.lastPhoenixRevivalMs = nowMs;
      this.phoenixRevivalState.phase = 'rising';
      this.phoenixRevivalState.elapsed = 0;
      this.phoenixRevivalState.spherePos.set(0, 0.4, 0);
      this.phoenixRevivalState.anchorPos.set(0, 5.4, 0);
      this.phoenixRevivalState.tickAccum = 0;
      this.physics.position.set(0, 0.4, 0);
      this.rig.root.position.set(0, 0.4, 0);
      this.rig.root.rotation.set(0, 0, 0);
      this.cameraYaw = 0;
      this.rig.setOpacity(0);
      this.fx.resetAll(false);
      this.fx.triggerCue('phoenix-special-rise', this.physics.position);
      this.callbacks.onPhoenixSpecialRevival?.('rise');
    } else {
      // Spawn cleanly at one of the 3 arena spawn points
      const sp = this.pickRandomSpawnPoint();
      this.physics.position.set(sp.x, 0, sp.z);
      this.rig.root.position.set(sp.x, 0, sp.z);
      this.rig.root.rotation.set(0, sp.facingYaw, 0);
      this.cameraYaw = sp.facingYaw;
      this.spawnPadVfx.triggerArrivalBurst(sp.x, sp.z);

      this.phoenixRevivalState.phase = 'idle';
      this.fx.resetAll(true);
      this.lastScreenFxSentActive = false;
      this.callbacks.onScreenFxUpdate?.(this.fx.screenFx);
    }
  }

  public setCharacter(
    appearance: CharacterAppearance,
    maxHp = 250,
    damageMultiplier = 1.0,
  ): void {
    this.scene.remove(this.rig.root);
    this.rig.dispose();
    this.archetype = appearance.archetype ?? 'standard';
    this.skinVariant = appearance.skinVariant ?? 'phoenix';
    this.skinId = appearance.skinId;
    this.currentAppearance = appearance;
    this.playerMaxHp = maxHp;
    this.damageMultiplier = damageMultiplier;
    this.fx.setIdentity(this.archetype, this.skinVariant, this.skinId);
    this.quicksilverVfx.setPalette(this.skinId === 'speed' ? 'green' : 'blue');

    this.scene.remove(this.vfx.group);
    this.vfx.dispose();
    this.vfx = new ScarletWitchVfxSystem(
      this.skinId === 'wanda-zombie' ? 'crimson-dark' : 'default',
    );
    this.scene.add(this.vfx.group);

    this.scene.remove(this.chaosDrainBeamVfx.group);
    this.chaosDrainBeamVfx.dispose();
    this.chaosDrainBeamVfx = new ChaosDrainBeamVfx(this.skinId === 'wanda-zombie');
    this.scene.add(this.chaosDrainBeamVfx.group);

    this.scene.remove(this.phoenixVfx.group);
    this.phoenixVfx.dispose();
    this.phoenixVfx = new PhoenixVfxSystem(this.skinVariant);
    this.scene.add(this.phoenixVfx.group);

    this.rig = createR16Character(appearance);
    this.scene.add(this.rig.root);
    this.attachCharacterExtras();
    this.animator = new CharacterAnimator(this.rig, this.archetype, this.skinId);
    this.ragdoll = new R16Ragdoll(this.rig);
    this.respawn(false);
  }

  public rotateCamera(deltaYaw: number, deltaPitch: number): void {
    if (!this.controlsEnabled) return;
    this.cameraYaw -= deltaYaw;
    const minPitch = this.phoenixDiveState.phase !== 'idle' ? -0.38 : -0.12;
    const maxPitch = this.phoenixDiveState.phase !== 'idle' ? 1.28 : 0.72;
    this.cameraPitch = THREE.MathUtils.clamp(
      this.cameraPitch + deltaPitch,
      minPitch,
      maxPitch,
    );
  }

  public zoomCameraByScale(scaleRatio: number): void {
    this.targetCameraDistance = THREE.MathUtils.clamp(
      this.targetCameraDistance * scaleRatio,
      2.4,
      9.5,
    );
  }

  public zoomCameraByDelta(delta: number): void {
    this.targetCameraDistance = THREE.MathUtils.clamp(
      this.targetCameraDistance + delta,
      2.4,
      9.5,
    );
  }

  public setCameraZoomDistance(distance: number): void {
    this.targetCameraDistance = THREE.MathUtils.clamp(distance, 2.4, 9.5);
  }

  private computePixelRatio(resolution: ResolutionScale): number {
    const dpr = window.devicePixelRatio || 1;
    switch (resolution) {
      case 'low':
        return 0.75;
      case 'medium':
        return 1.0;
      case 'high':
        return Math.min(dpr, 1.5);
      case 'native':
        return Math.min(dpr, 2.0);
    }
  }

  private applyShadowQuality(quality: ShadowQuality): void {
    if (quality === 'off') {
      this.sunLight.castShadow = false;
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.shadowMap.needsUpdate = true;
      return;
    }

    const size = quality === 'ultra' ? 2048 : quality === 'high' ? 1536 : 1024;
    const radius = quality === 'ultra' ? 3.2 : quality === 'high' ? 2.6 : 1.8;

    if (this.sunLight.shadow.mapSize.x !== size) {
      this.sunLight.shadow.mapSize.set(size, size);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
    }
    this.sunLight.shadow.radius = radius;
    this.sunLight.castShadow = true;
    this.renderer.shadowMap.autoUpdate = true;
    this.renderer.shadowMap.needsUpdate = true;
  }

  public applyGraphicsSettings(settings: GraphicsSettings): void {
    this.graphicsSettings = settings;
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.renderer.setPixelRatio(this.computePixelRatio(settings.resolution));
    this.renderer.setSize(width, height);

    this.applyShadowQuality(settings.shadows);
    this.skyAtmosphere.setCloudQuality(settings.clouds);
    this.scene.fog = settings.distanceFog ? this.distanceFog : null;
    this.windTrails.lines.visible = settings.windTrails;
    this.fx.setAllowSubtleBlur(
      settings.preset === 'high' || settings.preset === 'ultra',
    );
    this.setCameraZoomDistance(settings.cameraZoom);
  }

  private onResize(): void {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    this.viewportWidth = width;
    this.viewportHeight = height;
    const aspect = width / height;
    this.baseFov = aspect < 1 ? 58 : 50;
    this.camera.fov = this.baseFov + this.fx.fovOffset;
    this.lastAppliedFov = this.camera.fov;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    const pr = this.computePixelRatio(this.graphicsSettings.resolution);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(width, height);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.controlsEnabled || this.dead) return;
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keyForward = 1;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keyForward = -1;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keyRight = 1;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keyRight = -1;
        break;
      case 'Space':
        if (!e.repeat) this.triggerJump();
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        if (this.keyForward > 0) this.keyForward = 0;
        break;
      case 'KeyS':
      case 'ArrowDown':
        if (this.keyForward < 0) this.keyForward = 0;
        break;
      case 'KeyD':
      case 'ArrowRight':
        if (this.keyRight > 0) this.keyRight = 0;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        if (this.keyRight < 0) this.keyRight = 0;
        break;
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private scheduleNextTick(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private tick(): void {
    if (this.disposed) return;
    if (this.contextLost) {
      this.scheduleNextTick();
      return;
    }

    const nowMs = performance.now();
    const dt = Math.min(Math.max((nowMs - this.lastTimeMs) / 1000, 0.001), 0.05);
    this.lastTimeMs = nowMs;

    // Decay hand cast flare & combat status timers
    this.handFlareLeft = Math.max(0, this.handFlareLeft - dt * 3.2);
    this.handFlareRight = Math.max(0, this.handFlareRight - dt * 3.2);
    if (this.playerHitRestrictTimer > 0) {
      this.playerHitRestrictTimer = Math.max(0, this.playerHitRestrictTimer - dt);
    }
    if (this.statusHealTimer > 0) {
      this.statusHealTimer = Math.max(0, this.statusHealTimer - dt);
    }
    if (this.statusDotTimer > 0) {
      this.statusDotTimer = Math.max(0, this.statusDotTimer - dt);
    }
    if (this.statusParalyzeTimer > 0) {
      this.statusParalyzeTimer = Math.max(0, this.statusParalyzeTimer - dt);
    }
    if (this.statusNoPowersTimer > 0) {
      this.statusNoPowersTimer = Math.max(0, this.statusNoPowersTimer - dt);
    }
    if (this.multiKillWindowTimer > 0) {
      this.multiKillWindowTimer = Math.max(0, this.multiKillWindowTimer - dt);
      if (this.multiKillWindowTimer <= 0) {
        this.multiKillCount = 0;
      }
    }
    if (this.astralState.bodyHitFlashTimer > 0) {
      this.astralState.bodyHitFlashTimer = Math.max(
        0,
        this.astralState.bodyHitFlashTimer - dt,
      );
      this.astralState.bodyRig?.setHitFlash(this.astralState.bodyHitFlashTimer / 0.16);
    } else {
      this.astralState.bodyRig?.setHitFlash(0);
    }

    // Step Teleport sequence (Scarlet Witch)
    if (!this.dead && this.teleportState.phase !== 'idle') {
      this.teleportState.elapsed += dt;
      if (this.teleportState.phase === 'preparing') {
        const p = THREE.MathUtils.clamp(
          this.teleportState.elapsed / TELEPORT_PREPARE_SEC,
          0,
          1,
        );
        this.rig.setOpacity(1 - p);

        if (this.teleportState.elapsed >= TELEPORT_PREPARE_SEC) {
          this.physics.position.copy(this.teleportState.destination);
          this.physics.velocity.set(0, 0, 0);
          this.rig.root.position.copy(this.physics.position);
          if (this.archetype === 'agatha-harkness') {
            this.agathaVfx.spawnSmokeExplosion(this.physics.position, 2.3, 0.42, 10);
          } else {
            this.vfx.spawnBodyMistCloud(this.physics.position);
          }
          this.fx.triggerCue('teleport-arrive', this.physics.position);
          this.callbacks.onTeleportArrive?.();

          this.teleportState.phase = 'revealing';
          this.teleportState.elapsed = 0;
        }
      } else if (this.teleportState.phase === 'revealing') {
        const p = THREE.MathUtils.clamp(
          this.teleportState.elapsed / TELEPORT_REVEAL_SEC,
          0,
          1,
        );
        this.rig.setOpacity(p);
        if (this.teleportState.elapsed >= TELEPORT_REVEAL_SEC) {
          this.rig.setOpacity(1);
          this.teleportState.phase = 'idle';
          this.refreshInvulnerable();
          this.callbacks.onTeleportLockChange?.(false);
        }
      }
    }

    // Step Phoenix Force / Dark Phoenix Special Revival (1.1s rise -> 4.0s stationary manifest)
    if (!this.dead && this.phoenixRevivalState.phase !== 'idle') {
      const prs = this.phoenixRevivalState;
      prs.elapsed += dt;

      if (prs.phase === 'rising') {
        const t = THREE.MathUtils.clamp(prs.elapsed / 1.1, 0, 1);
        const ease = 1 - Math.pow(1 - t, 2);
        const sphereY = 0.4 + ease * 5.0;
        prs.spherePos.set(0, sphereY, 0);
        this.physics.position.set(0, sphereY, 0);
        this.physics.velocity.set(0, 0, 0);
        this.rig.setOpacity(0);
        this.phoenixVfx.updateSpecialRevival(
          dt,
          'rising',
          prs.spherePos,
          null,
          this.cameraYaw,
          prs.elapsed,
          1.1,
        );

        if (prs.elapsed >= 1.1) {
          prs.phase = 'manifest';
          prs.elapsed = 0;
          prs.tickAccum = 0.75;
          prs.anchorPos.set(0, 5.4, 0);
          this.physics.position.copy(prs.anchorPos);
          this.physics.velocity.set(0, 0, 0);
          this.rig.setOpacity(1);
          this.animator.setPhoenixManifest(true);
          this.handFlareLeft = 1.45;
          this.handFlareRight = 1.45;
          this.fx.triggerCue('phoenix-special-manifest', this.physics.position);
          this.callbacks.onPhoenixSpecialRevival?.('manifest');
        }
      } else if (prs.phase === 'manifest') {
        this.physics.position.copy(prs.anchorPos);
        this.physics.velocity.set(0, 0, 0);
        prs.tickAccum += dt;
        while (prs.tickAccum >= 1.0) {
          prs.tickAccum -= 1.0;
          if (this.applyGlobalDamageUnified(this.scaleDamage(2)) > 0) {
            this.callbacks.onHitTarget?.();
          }
        }
        this.phoenixVfx.updateSpecialRevival(
          dt,
          'manifest',
          null,
          prs.anchorPos,
          this.cameraYaw,
          prs.elapsed,
          4.0,
        );

        if (prs.elapsed >= 4.0) {
          prs.phase = 'idle';
          prs.elapsed = 0;
          this.animator.setPhoenixManifest(false);
          this.fx.cancelSustainedCues();
          this.phoenixVfx.updateSpecialRevival(dt, 'none', null, null, 0, 0, 0);
          this.callbacks.onPhoenixSpecialRevival?.('end');
        }
      }
    } else {
      this.phoenixVfx.updateSpecialRevival(dt, 'none', null, null, 0, 0, 0);
    }

    // Step scheduled Phoenix Wave blasts
    if (!this.dead && this.scheduledWaves.length > 0) {
      for (let i = this.scheduledWaves.length - 1; i >= 0; i--) {
        const w = this.scheduledWaves[i];
        w.remainingSec -= dt;
        if (w.remainingSec <= 0) {
          this.scheduledWaves.splice(i, 1);
          this.executeWaveBlast(w.stepIdx, w.position, w.forward);
        }
      }
    }

    let focusPos: THREE.Vector3;

    if (this.dead) {
      const pelvisWorld = this.ragdoll.update(dt);
      const onBorder =
        Math.abs(pelvisWorld.x) > BASEPLATE_HALF_INNER ||
        Math.abs(pelvisWorld.z) > BASEPLATE_HALF_INNER;
      const groundSurfaceY = onBorder ? BASEPLATE_BORDER_HEIGHT : 0;
      this._ragdollFocus.set(pelvisWorld.x, groundSurfaceY, pelvisWorld.z);
      focusPos = this._ragdollFocus;
      this.leftHandAura?.update(dt, 0);
      this.rightHandAura?.update(dt, 0);
      this.leftAgathaAura?.update(dt, 0);
      this.rightAgathaAura?.update(dt, 0);
      this.leftFireAura?.update(dt, 0);
      this.rightFireAura?.update(dt, 0);
      this.phoenixWings?.update(dt, false, false, 0);
    } else if (this.isPhoenixReviving()) {
      // Stationary sky anchor during Phoenix Special Revival
      this.rig.root.position.copy(this.physics.position);
      this.rig.root.rotation.y = this.cameraYaw;
      this._idleFlyMotion.localForward = 0;
      this._idleFlyMotion.verticalVelocity = 0;
      this.animator.update(dt, this._idleFlyMotion);
      const revFlare = this.phoenixRevivalState.phase === 'manifest' ? 1.25 : 0;
      this.leftFireAura?.update(dt, revFlare, 0.25);
      this.rightFireAura?.update(dt, revFlare, 0.25);
      this.phoenixWings?.update(
        dt,
        this.phoenixRevivalState.phase === 'manifest',
        false,
        0,
      );
      focusPos = this.physics.position;
    } else if (!this.dead && this.phoenixDiveState.phase !== 'idle') {
      const pds = this.phoenixDiveState;
      pds.elapsed += dt;
      const safeBound = BASEPLATE_HALF_INNER - 1.6;

      if (pds.phase === 'ascending') {
        const t = THREE.MathUtils.clamp(pds.elapsed / 0.38, 0, 1);
        const ease = 1 - Math.pow(1 - t, 2.2);
        this.physics.position.lerpVectors(pds.startPos, pds.peakPos, ease);
        this.physics.velocity.set(0, 0, 0);
        this.rig.root.position.copy(this.physics.position);
        const toPeak = this._tmpA.subVectors(pds.peakPos, pds.startPos);
        if (toPeak.x * toPeak.x + toPeak.z * toPeak.z > 0.001) {
          this.rig.root.rotation.y = Math.atan2(-toPeak.x, -toPeak.z);
        }
        if (t >= 1) {
          pds.phase = 'hovering';
          pds.elapsed = 0;
          this.callbacks.onPhoenixDiveChange?.('hovering', false);
        }
      } else if (pds.phase === 'hovering') {
        this.physics.position.copy(pds.peakPos);
        this.physics.velocity.set(0, 0, 0);
        this.rig.root.position.copy(this.physics.position);

        const aimed = this.computeReticleAimPoint(46, true, true);
        aimed.x = THREE.MathUtils.clamp(aimed.x, -safeBound, safeBound);
        aimed.z = THREE.MathUtils.clamp(aimed.z, -safeBound, safeBound);
        aimed.y =
          Math.abs(aimed.x) > BASEPLATE_HALF_INNER ||
          Math.abs(aimed.z) > BASEPLATE_HALF_INNER
            ? BASEPLATE_BORDER_HEIGHT
            : 0;
        pds.aimGroundPos.copy(aimed);
        this.phoenixVfx.updateDiveAimIndicator(true, pds.aimGroundPos, dt);

        const dxAim = aimed.x - this.physics.position.x;
        const dzAim = aimed.z - this.physics.position.z;
        if (dxAim * dxAim + dzAim * dzAim > 0.01) {
          this.rig.root.rotation.y = Math.atan2(-dxAim, -dzAim);
        }

        if (pds.elapsed >= 3.0) {
          this.beginPhoenixDiveDescent();
        }
      }

      if (pds.phase === 'diving') {
        const t = THREE.MathUtils.clamp(pds.elapsed / pds.diveDuration, 0, 1);
        const diveEase = Math.pow(t, 1.35);
        this.physics.position.lerpVectors(
          pds.diveStartPos,
          pds.aimGroundPos,
          diveEase,
        );
        this.physics.velocity.set(0, -14, 0);
        this.rig.root.position.copy(this.physics.position);

        const dxDive = pds.aimGroundPos.x - pds.diveStartPos.x;
        const dzDive = pds.aimGroundPos.z - pds.diveStartPos.z;
        if (dxDive * dxDive + dzDive * dzDive > 0.01) {
          this.rig.root.rotation.y = Math.atan2(-dxDive, -dzDive);
        }

        const impactSurfaceY =
          Math.abs(pds.aimGroundPos.x) > BASEPLATE_HALF_INNER ||
          Math.abs(pds.aimGroundPos.z) > BASEPLATE_HALF_INNER
            ? BASEPLATE_BORDER_HEIGHT
            : 0;

        if (t >= 1 || this.physics.position.y <= impactSurfaceY + 0.08) {
          const impactPos = this._tmpA.copy(pds.aimGroundPos);
          impactPos.y = impactSurfaceY;

          this.phoenixVfx.spawnPhoenixDiveExplosion(impactPos);
          this.rockBreakVfx.spawnImpact(impactPos, 1.9, '#FF6B1A');
          this.fx.triggerCue('phoenix-dive-impact', impactPos);
          const hits = this.applyAreaFireExplosionUnified(
            impactPos,
            5.8,
            this.scaleDamage(46),
            2.2,
            7.8,
            4.0,
            this.scaleDamage(4),
          );
          if (hits > 0) {
            this.callbacks.onHitTarget?.();
          }

          this.physics.position.set(
            impactPos.x,
            Math.max(impactSurfaceY + 1.08, 1.08),
            impactPos.z,
          );
          this.physics.velocity.set(0, 1.2, 0);
          this.rig.root.position.copy(this.physics.position);
          this.flightEnabled = true;
          this.animator.triggerCast('hero-landing', 0.34);
          pds.phase = 'idle';
          pds.elapsed = 0;
          this.refreshInvulnerable();
          this.callbacks.onPhoenixDiveChange?.('idle', true);
        }
      }

      if (pds.phase !== 'idle') {
        this._idleFlyMotion.localForward =
          pds.phase === 'diving' ? 1.4 : pds.phase === 'ascending' ? 0.9 : 0;
        this._idleFlyMotion.verticalVelocity =
          pds.phase === 'ascending' ? 4 : pds.phase === 'diving' ? -8 : 0;
        this.animator.update(dt, this._idleFlyMotion);
      }
      this.leftFireAura?.update(dt, 1.35, 0.25);
      this.rightFireAura?.update(dt, 1.35, 0.25);
      this.phoenixWings?.update(dt, true, true, pds.phase === 'diving' ? 1.2 : 0.4);
      focusPos = this.physics.position;
    } else if (!this.dead && this.astralState.phase === 'returning') {
      const as = this.astralState;
      as.returnElapsed += dt;
      const t = THREE.MathUtils.clamp(as.returnElapsed / as.returnDuration, 0, 1);
      const ease = 1 - Math.pow(1 - t, 2);
      this.physics.position.lerpVectors(as.returnStartPos, as.bodyPos, ease);
      this.physics.velocity.set(0, 0, 0);
      this.rig.root.position.copy(this.physics.position);
      const dxRet = as.bodyPos.x - as.returnStartPos.x;
      const dzRet = as.bodyPos.z - as.returnStartPos.z;
      if (dxRet * dxRet + dzRet * dzRet > 0.001) {
        this.rig.root.rotation.y = Math.atan2(-dxRet, -dzRet);
      }
      this._idleFlyMotion.localForward = 1.35;
      this._idleFlyMotion.verticalVelocity = 0;
      this.animator.update(dt, this._idleFlyMotion);
      focusPos = this.physics.position;
      if (t >= 1) {
        this.finishAstralReturn(true);
      }
    } else {
      const canMove =
        this.controlsEnabled &&
        this.teleportState.phase !== 'preparing' &&
        !this.painState.active &&
        !this.astralExtractionState.active &&
        this.mindControlState.phase !== 'choosing' &&
        this.mindControlState.phase !== 'mental-damage' &&
        !this.telepathicWaveState.active &&
        !this.magnetoTornadoState.active &&
        !this.rapidPunchState.active &&
        !this.speedBlitzState.active &&
        !this.windTornadoState.active &&
        !this.visionBoltChargeState.active &&
        !this.visionHeadGripState.active &&
        !this.agathaShieldState.active &&
        !this.agathaAbsorbState.active &&
        !this.zombieStoneState.active &&
        !this.purgatoryGraspState.active &&
        this.barrierLockTimer <= 0;
      let moveX = canMove ? this.joyX + this.keyRight : 0;
      let moveY = canMove ? this.joyY + this.keyForward : 0;
      const len = Math.hypot(moveX, moveY);
      if (len > 1) {
        moveX /= len;
        moveY /= len;
      }

      if (
        this.painState.active ||
        this.astralExtractionState.active ||
        this.mindControlState.phase === 'choosing' ||
        this.mindControlState.phase === 'mental-damage' ||
        this.telepathicWaveState.active ||
        this.magnetoTornadoState.active ||
        this.rapidPunchState.active ||
        this.speedBlitzState.active ||
        this.visionBoltChargeState.active ||
        this.visionHeadGripState.active ||
        this.agathaShieldState.active ||
        this.agathaAbsorbState.active ||
        this.zombieStoneState.active ||
        this.purgatoryGraspState.active ||
        this.barrierLockTimer > 0
      ) {
        this.physics.velocity.x = 0;
        this.physics.velocity.z = 0;
      }

      const hoverHeight = this.magnetoTornadoState.active
        ? 2.15
        : this.archetype === 'phoenix-force'
          ? 1.15
          : this.archetype === 'agatha-harkness'
            ? 1.04
            : 0.94;

      const isSpeedBoost =
        this.archetype === 'quicksilver' && this.superSpeedState.active;
      const isEmmaAstral =
        this.archetype === 'emma-frost' && this.astralState.phase === 'projecting';
      const isVisionPhase =
        this.archetype === 'vision' && this.visionIntangibleState.active;
      const isAgathaFlying =
        this.archetype === 'agatha-harkness' && this.flightEnabled;
      const hitSlowMult = this.playerHitRestrictTimer > 0 ? 0.52 : 1.0;

      const baseCharSpeedMult =
        this.archetype === 'hela'
          ? 1.18
          : this.archetype === 'emma-frost'
            ? isEmmaAstral
              ? 1.45
              : 1.18
            : isSpeedBoost
              ? 3.05
              : isAgathaFlying
                ? 0.76
                : this.archetype === 'invisible-woman' && this.forcefieldShieldState.active
                  ? 0.55
                  : 1.0;

      const effectiveSprintEnabled =
        this.sprintEnabled &&
        this.stamina > 0.05 &&
        !this.agathaShieldState.active &&
        !this.agathaAbsorbState.active &&
        !this.forcefieldShieldState.active;

      const stepIn = this._stepInput;
      stepIn.moveX = moveX;
      stepIn.moveY = moveY;
      stepIn.facingYaw = this.cameraYaw;
      stepIn.jumpQueued = this.jumpQueued;
      stepIn.sprintEnabled = effectiveSprintEnabled;
      stepIn.flying = this.flightEnabled || this.magnetoTornadoState.active;
      stepIn.hoverHeight = hoverHeight;
      stepIn.speedMultiplier = baseCharSpeedMult * hitSlowMult;
      stepIn.intangible = isVisionPhase || isEmmaAstral;
      const step = this.physics.step(dt, stepIn);
      this.jumpQueued = false;

      // Stamina system: drains ONLY while sprinting forward; waits 1.0s after stopping before regeneration; reactivation interrupts regeneration immediately
      const sprintingForwardNow =
        step.sprintingForward &&
        effectiveSprintEnabled &&
        !this.flightEnabled &&
        !this.magnetoTornadoState.active &&
        !this.agathaShieldState.active &&
        !this.agathaAbsorbState.active;

      if (sprintingForwardNow) {
        this.stamina = Math.max(0, this.stamina - 22 * dt);
        this.staminaRegenDelayTimer = 1.0;
        if (this.stamina <= 0) {
          this.sprintEnabled = false;
          this.callbacks.onSprintForceChange?.(false);
        }
      } else if (this.stamina < this.maxStamina) {
        if (this.staminaRegenDelayTimer > 0) {
          this.staminaRegenDelayTimer = Math.max(0, this.staminaRegenDelayTimer - dt);
        } else {
          this.stamina = Math.min(this.maxStamina, this.stamina + 26 * dt);
        }
      }
      if (Math.abs(this.stamina - this.lastReportedStamina) > 0.01) {
        this.lastReportedStamina = this.stamina;
        this.callbacks.onStaminaChange?.(
          this.stamina,
          this.maxStamina,
          this.staminaRegenDelayTimer,
        );
      }

      if (step.justJumped) {
        this.callbacks.onJump?.();
      }

      const stepOnBorder =
        Math.abs(step.position.x) > BASEPLATE_HALF_INNER ||
        Math.abs(step.position.z) > BASEPLATE_HALF_INNER;
      const stepSurfaceY = stepOnBorder ? BASEPLATE_BORDER_HEIGHT : 0;

      // Hela Spinning Leap landing check
      if (this.spinningLeapState.active) {
        this.spinningLeapState.elapsed += dt;
        if (this.spinningLeapState.elapsed > 0.16 && step.grounded) {
          this.spinningLeapState.active = false;
          this.animator.setSpinningLeap(false);
          this.animator.triggerCast('hero-landing', 0.48);
          this.landingDust.spawn(step.position, stepSurfaceY, 1.35);
          this.rockBreakVfx.spawnImpact(step.position, 1.3, '#3CE66B');
          this.fx.triggerCue('hero-landing', step.position);
          this.callbacks.onSpinningLeap?.('land');
        }
      }

      // Quicksilver Wind Tornado circular running motion override
      if (this.windTornadoState.active) {
        const radius = 3.2;
        this.windTornadoState.angle += 9.2 * dt;
        const nextX =
          this.windTornadoState.center.x + Math.cos(this.windTornadoState.angle) * radius;
        const nextZ =
          this.windTornadoState.center.z + Math.sin(this.windTornadoState.angle) * radius;
        const safeBound = BASEPLATE_HALF_INNER - 1.0;
        step.position.set(
          THREE.MathUtils.clamp(nextX, -safeBound, safeBound),
          0,
          THREE.MathUtils.clamp(nextZ, -safeBound, safeBound),
        );
        this.physics.position.copy(step.position);
        const tangentYaw = Math.atan2(
          Math.sin(this.windTornadoState.angle),
          -Math.cos(this.windTornadoState.angle),
        );
        this.rig.root.rotation.y = tangentYaw;
      }

      // Wanda Zombie: rise & descend cleanly during Stone Chaos Explosion
      if (
        this.archetype === 'scarlet-witch' &&
        this.skinId === 'wanda-zombie' &&
        this.zombieStoneState.active
      ) {
        const el = this.zombieStoneState.elapsed;
        const peakY = Math.max(this.zombieStoneState.startY, stepSurfaceY) + 4.15;
        if (el < 1.35) {
          const u = THREE.MathUtils.clamp(el / 0.55, 0, 1);
          const ease = 1 - Math.pow(1 - u, 2.2);
          step.position.y = THREE.MathUtils.lerp(this.zombieStoneState.startY, peakY, ease);
        } else {
          const u = THREE.MathUtils.clamp((el - 1.35) / 0.6, 0, 1);
          const ease = u * u;
          step.position.y = THREE.MathUtils.lerp(peakY, stepSurfaceY, ease);
        }
        this.physics.position.y = step.position.y;
        this.physics.velocity.y = 0;
      }

      // Landing dust cloud + soft shockwave on touchdown from Jump OR Flight
      if (
        !this.flightEnabled &&
        !this.windTornadoState.active &&
        !(this.archetype === 'scarlet-witch' && this.skinId === 'wanda-zombie' && this.zombieStoneState.active) &&
        step.grounded &&
        (!this.wasGrounded || step.landImpactSpeed > 0.5)
      ) {
        const intensity = THREE.MathUtils.clamp(
          Math.max(step.landImpactSpeed / 8.5, 0.72),
          0.68,
          1.4,
        );
        this.landingDust.spawn(step.position, stepSurfaceY, intensity);
        this.callbacks.onLandDust?.(intensity);
      }
      this.wasGrounded = step.grounded;

      this.rig.root.position.copy(step.position);
      if (this.painState.active) {
        const dx = this.painState.lastTargetPos.x - step.position.x;
        const dz = this.painState.lastTargetPos.z - step.position.z;
        if (dx * dx + dz * dz > 0.001) {
          this.rig.root.rotation.y = Math.atan2(-dx, -dz);
        }
      } else if (this.barrierLockTimer > 0) {
        this.rig.root.rotation.y = this.barrierLockedYaw;
      } else if (
        !this.windTornadoState.active &&
        !this.agathaAbsorbState.active &&
        !this.speedBlitzState.active
      ) {
        this.rig.root.rotation.y = this.cameraYaw;
      }

      let rawYawDelta = this.rig.root.rotation.y - this.prevTurnYaw;
      while (rawYawDelta > Math.PI) rawYawDelta -= Math.PI * 2;
      while (rawYawDelta < -Math.PI) rawYawDelta += Math.PI * 2;
      this.prevTurnYaw = this.rig.root.rotation.y;
      const turnVelocity = rawYawDelta / Math.max(dt, 0.005);

      const isVisualLevitate =
        this.flightEnabled ||
        (this.archetype === 'scarlet-witch' &&
          this.skinId === 'wanda-zombie' &&
          this.zombieStoneState.active);

      const mainMotion = this._mainMotion;
      mainMotion.localForward = this.windTornadoState.active ? 1.85 : step.localForwardNorm;
      mainMotion.localRight = this.windTornadoState.active ? 0.35 : step.localRightNorm;
      mainMotion.verticalVelocity = step.velocity.y;
      mainMotion.grounded = this.windTornadoState.active
        ? true
        : step.grounded && !isVisualLevitate;
      mainMotion.justJumped = step.justJumped;
      mainMotion.landImpactSpeed = step.landImpactSpeed;
      mainMotion.flying = isVisualLevitate;
      mainMotion.sprinting = sprintingForwardNow;
      mainMotion.superSpeed = isSpeedBoost || this.windTornadoState.active;
      mainMotion.turnVelocity = turnVelocity;
      this.animator.update(dt, mainMotion);

      const baseHandGlow = this.flightEnabled ? 0.95 : 0.38;
      const visScale = this.rig.root.visible ? 1 : 0;
      const painBoost = this.painState.active ? 0.55 : 0;

      this.leftHandAura?.update(
        dt,
        (baseHandGlow + this.handFlareLeft * 0.55) * visScale,
        0.24,
      );
      this.rightHandAura?.update(
        dt,
        (baseHandGlow + this.handFlareRight * 0.55) * visScale,
        0.24,
      );

      this.leftAgathaAura?.update(
        dt,
        (baseHandGlow + this.handFlareLeft * 0.58) * visScale,
        0.25,
      );
      this.rightAgathaAura?.update(
        dt,
        (baseHandGlow + this.handFlareRight * 0.58) * visScale,
        0.25,
      );

      this.leftFireAura?.update(
        dt,
        (baseHandGlow + this.handFlareLeft * 0.6 + painBoost) * visScale,
        0.25,
      );
      this.rightFireAura?.update(
        dt,
        (baseHandGlow + this.handFlareRight * 0.6 + painBoost) * visScale,
        0.25,
      );

      const moveSpeedNorm = THREE.MathUtils.clamp(
        Math.hypot(step.localForwardNorm, step.localRightNorm),
        0,
        1.4,
      );
      this.phoenixWings?.update(
        dt,
        (this.wingsAlwaysVisible || this.flightEnabled) &&
          this.teleportState.phase !== 'preparing',
        this.flightEnabled,
        moveSpeedNorm,
      );

      focusPos = step.position;
    }

    // Pain Infliction Channeling update (5s total, 5 dmg/sec, ends in Phoenix-origin telekinetic shockwave + knockback + 2s ragdoll)
    if (!this.dead && this.painState.active && this.painState.targetId) {
      const targetId = this.painState.targetId;
      const targetAlive = this.getTargetTorsoPositionUnified(
        targetId,
        this._painTargetWorld,
      );
      if (!targetAlive || this._painTargetWorld.distanceTo(focusPos) > 28) {
        this.cancelPainInfliction(true);
      } else {
        this.painState.lastTargetPos.copy(this._painTargetWorld);
        this.painState.elapsed += dt;
        this.painState.tickAccum += dt;

        while (this.painState.tickAccum >= 1.0 && this.painState.ticksDone < 5) {
          this.painState.tickAccum -= 1.0;
          this.painState.ticksDone++;
          const dir = this._aimTarget
            .copy(this._painTargetWorld)
            .sub(focusPos)
            .setY(0);
          if (dir.lengthSq() > 0.001) dir.normalize();
          else dir.set(0, 0, -1);

          if (
            this.applyDamageUnified(targetId, this.scaleDamage(5), dir, 0, undefined, {
              isBeam: true,
            })
          ) {
            this.fx.triggerCue('pain-tick', this._painTargetWorld);
            this.callbacks.onPainInflictionTick?.();
            this.callbacks.onHitTarget?.();
          }
          if (!this.isTargetAliveUnified(targetId)) {
            this.cancelPainInfliction(true);
            break;
          }
        }

        if (this.painState.active) {
          if (this.painState.elapsed >= 5.0) {
            // Complete 5s channel -> telekinetic shockwave originating from PHOENIX pushing nearby targets away + 2s ragdoll
            this.setPainRestrictedUnified(targetId, false);
            this.phoenixVfx.spawnTelekineticShockwave(focusPos);
            this.fx.triggerCue('pain-explosion', focusPos);
            this.callbacks.onPainInflictionExplosion?.();

            const nearbyHits = this.applyAreaFireExplosionUnified(
              focusPos,
              PAIN_INFLICTION_EXPLOSION_RADIUS,
              this.scaleDamage(15),
              2.0,
              6.2,
              0,
              0,
            );
            if (nearbyHits > 0) {
              this.callbacks.onHitTarget?.();
            }

            this.painState.active = false;
            this.painState.targetId = null;
            this.painState.elapsed = 0;
            this.painState.tickAccum = 0;
            this.painState.ticksDone = 0;
            this.refreshInvulnerable();
            this.animator.setPainChanneling(false);
            this.phoenixVfx.updatePainTelekinetic(false, null, null, dt);
            this.callbacks.onPainInflictionChange?.(false, false);
          } else {
            this._handWorld.set(focusPos.x, focusPos.y + 1.62, focusPos.z);
            this._aimTarget.set(
              this._painTargetWorld.x,
              this._painTargetWorld.y + 0.56,
              this._painTargetWorld.z,
            );
            this.phoenixVfx.updatePainTelekinetic(
              true,
              this._handWorld,
              this._aimTarget,
              dt,
            );
          }
        }
      }
    } else {
      this.phoenixVfx.updatePainTelekinetic(false, null, null, dt);
    }

    // Update Scarlet Witch, Phoenix Force, Emma Frost & Hela VFX against NPCs + Playable AI Enemies
    const targetProbes = this.getAllTargetProbes();
    this.vfx.update(
      dt,
      focusPos,
      this.archetype === 'scarlet-witch' && this.flightEnabled && !this.dead,
      targetProbes,
      (targetId, hitDir, hitPos, damage) => {
        this.fx.triggerCue('chaos-bolt-impact', hitPos);
        if (this.applyDamageUnified(targetId, this.scaleDamage(damage), hitDir, 0)) {
          this.callbacks.onHitTarget?.();
        }
      },
      (center) => {
        const hits = this.applyAreaImplosionUnified(
          center,
          CHAOS_EXPLOSION_RADIUS,
          this.scaleDamage(20),
          2.0,
        );
        this.fx.triggerCue('chaos-implosion-detonate', center);
        this.callbacks.onChaosImplosionAbsorb?.();
        if (hits > 0) {
          this.callbacks.onHitTarget?.();
        }
      },
    );

    // Scarlet Witch Supreme Sorceress: Hold-to-Drain Beam + 2-Stack Charge
    if (!this.dead && this.supremeDrainState.active) {
      this.rig.root.updateMatrixWorld(true);
      this.rig.rightHand.getWorldPosition(this._handWorld);
      this._handWorld.y -= 0.04;
      this.handFlareRight = Math.max(this.handFlareRight, 1.05);

      let tid = this.supremeDrainState.targetId;
      let hasLiveTarget = Boolean(
        tid && this.getTargetTorsoPositionUnified(tid, this._aimTarget),
      );
      if (!hasLiveTarget || this._aimTarget.distanceTo(focusPos) > 28) {
        tid =
          this.getSelectedTargetIdUnified() ??
          this.findClosestTargetIdUnified(focusPos, 26);
        this.supremeDrainState.targetId = tid;
        hasLiveTarget = Boolean(
          tid && this.getTargetTorsoPositionUnified(tid, this._aimTarget),
        );
      }

      if (hasLiveTarget && tid && this._aimTarget.distanceTo(focusPos) <= 28) {
        this.chaosDrainBeamVfx.update(dt, this._handWorld, this._aimTarget);
        this.supremeDrainState.dmgAccum += dt;
        while (this.supremeDrainState.dmgAccum >= 0.5) {
          this.supremeDrainState.dmgAccum -= 0.5;
          const dir = this._tmpDir.subVectors(this._aimTarget, focusPos);
          dir.y = 0;
          if (dir.lengthSq() > 0.001) dir.normalize();
          else dir.set(0, 0, -1);
          if (
            this.applyDamageUnified(tid, this.scaleDamage(7), dir, 0, undefined, {
              isBeam: true,
            })
          ) {
            this.callbacks.onHitTarget?.();
          }
        }
        if (this.supremeDrainState.stacks < 2) {
          this.supremeDrainState.stackAccum += dt;
          if (this.supremeDrainState.stackAccum >= 1.0) {
            this.supremeDrainState.stackAccum -= 1.0;
            this.supremeDrainState.stacks = Math.min(2, this.supremeDrainState.stacks + 1);
            this.callbacks.onSupremeStacksChange?.(this.supremeDrainState.stacks);
          }
        }
      } else {
        const fallbackAim = this.computeReticleAimPoint(18, true, false);
        this.chaosDrainBeamVfx.update(dt, this._handWorld, fallbackAim);
      }
    }

    // Scarlet Witch Wanda Zombie: Crimson Chaos Beam (3.0s)
    if (!this.dead && this.zombieBeamState.active) {
      this.zombieBeamState.elapsed += dt;
      this.rig.root.updateMatrixWorld(true);
      this.rig.rightHand.getWorldPosition(this._handWorld);
      this._handWorld.y -= 0.04;
      this.handFlareRight = Math.max(this.handFlareRight, 1.2);

      let tid = this.zombieBeamState.targetId;
      let hasLiveTarget = Boolean(
        tid && this.getTargetTorsoPositionUnified(tid, this._aimTarget),
      );
      if (!hasLiveTarget || this._aimTarget.distanceTo(focusPos) > 28) {
        tid =
          this.getSelectedTargetIdUnified() ??
          this.findClosestTargetIdUnified(focusPos, 26);
        this.zombieBeamState.targetId = tid;
        hasLiveTarget = Boolean(
          tid && this.getTargetTorsoPositionUnified(tid, this._aimTarget),
        );
      }

      if (hasLiveTarget && tid && this._aimTarget.distanceTo(focusPos) <= 28) {
        this.chaosDrainBeamVfx.update(dt, this._handWorld, this._aimTarget);
        this.zombieBeamState.dmgAccum += dt;
        while (this.zombieBeamState.dmgAccum >= 0.5) {
          this.zombieBeamState.dmgAccum -= 0.5;
          const dir = this._tmpDir.subVectors(this._aimTarget, focusPos);
          dir.y = 0;
          if (dir.lengthSq() > 0.001) dir.normalize();
          else dir.set(0, 0, -1);
          if (
            this.applyDamageUnified(tid, this.scaleDamage(8), dir, 0, undefined, {
              isBeam: true,
            })
          ) {
            this.callbacks.onHitTarget?.();
          }
        }
      } else {
        const fallbackAim = this.computeReticleAimPoint(18, true, false);
        this.chaosDrainBeamVfx.update(dt, this._handWorld, fallbackAim);
      }

      if (this.zombieBeamState.elapsed >= 3.0) {
        this.zombieBeamState.active = false;
        this.zombieBeamState.targetId = null;
        this.zombieBeamState.elapsed = 0;
        this.chaosDrainBeamVfx.setActive(false);
        this.animator.setZombieBeam(false);
        this.callbacks.onZombieBeamChange?.(false, true);
      }
    }

    // Scarlet Witch Wanda Zombie: Stone Chaos Explosion
    if (!this.dead && this.zombieStoneState.active) {
      this.zombieStoneState.elapsed += dt;
      this.handFlareLeft = Math.max(this.handFlareLeft, 1.25);
      this.handFlareRight = Math.max(this.handFlareRight, 1.25);
      this.stoneExplosionVfx.update(dt, focusPos);

      if (!this.zombieStoneState.blasted && this.zombieStoneState.elapsed >= 1.35) {
        this.zombieStoneState.blasted = true;
        this.stoneExplosionVfx.triggerBlast(focusPos);
        const groundImpact = this._tmpA.set(
          focusPos.x,
          Math.abs(focusPos.x) > BASEPLATE_HALF_INNER ||
          Math.abs(focusPos.z) > BASEPLATE_HALF_INNER
            ? BASEPLATE_BORDER_HEIGHT
            : 0,
          focusPos.z,
        );
        this.rockBreakVfx.spawnImpact(groundImpact, 1.8, '#8A0F24');
        this.fx.triggerCue('zombie-stone-explode', focusPos);
        const hits = this.applyAreaFireExplosionUnified(
          focusPos,
          7.2,
          this.scaleDamage(52),
          2.2,
          8.4,
          0,
          0,
        );
        if (hits > 0) {
          this.callbacks.onHitTarget?.();
        }
      }

      if (this.zombieStoneState.elapsed >= 1.95) {
        this.zombieStoneState.active = false;
        this.zombieStoneState.elapsed = 0;
        this.zombieStoneState.blasted = false;
        this.callbacks.onZombieStoneExplosionChange?.(false, true);
      }
    } else if (this.stoneExplosionVfx.isActive()) {
      this.stoneExplosionVfx.update(dt, focusPos);
    }

    // Agatha Harkness Abilities (Purple Darkhold, Absorption Shield + Tendrils, Purple Magic Bolts)
    if (!this.dead && this.agathaShieldState.active) {
      this.agathaShieldState.elapsed += dt;
      this.agathaVfx.updateAbsorptionShield(true, focusPos, dt);
      if (this.agathaShieldState.elapsed >= AGATHA_SHIELD_DURATION_MS / 1000) {
        this.endAgathaShield(true, true);
      }
    }

    if (!this.dead && this.agathaAbsorbState.active) {
      const ab = this.agathaAbsorbState;
      ab.elapsed += dt;
      const tid = ab.attackerId;
      const hasLiveAttacker = Boolean(
        tid && this.getTargetTorsoPositionUnified(tid, this._painTargetWorld),
      );
      if (hasLiveAttacker) {
        ab.lastAttackerPos.copy(this._painTargetWorld);
      }
      const dx = ab.lastAttackerPos.x - focusPos.x;
      const dz = ab.lastAttackerPos.z - focusPos.z;
      if (dx * dx + dz * dz > 0.001) {
        this.rig.root.rotation.y = Math.atan2(-dx, -dz);
      }
      this.handFlareLeft = Math.max(this.handFlareLeft, 1.35);
      this.handFlareRight = Math.max(this.handFlareRight, 1.35);
      this.agathaVfx.updateAbsorbTendrils(
        'player-absorb',
        dt,
        focusPos,
        this.rig.root.rotation.y,
        ab.lastAttackerPos,
      );

      ab.tickAccum += dt;
      if (ab.tickAccum >= 0.36 && tid && hasLiveAttacker) {
        ab.tickAccum -= 0.36;
        const dir = this._aimTarget
          .copy(ab.lastAttackerPos)
          .sub(focusPos)
          .setY(0);
        if (dir.lengthSq() > 0.001) dir.normalize();
        else dir.set(0, 0, -1);

        if (
          this.applyDamageUnified(tid, this.scaleDamage(6), dir, 0, undefined, {
            isBeam: true,
          })
        ) {
          this.callbacks.onHitTarget?.();
        }
        const heal = Math.min(4, this.playerMaxHp - this.playerHp);
        if (heal > 0) {
          this.playerHp += heal;
          this.statusHealTimer = Math.max(this.statusHealTimer, 1.3);
          this.callbacks.onPlayerHealthChange?.(this.playerHp, this.playerMaxHp);
          this.callbacks.onPlayerHeal?.(heal);
        }
      }

      if (ab.elapsed >= ab.duration || !hasLiveAttacker) {
        this.finishAgathaAbsorption(true);
      }
    }

    this.agathaVfx.update(
      dt,
      focusPos,
      this.archetype === 'agatha-harkness' && this.flightEnabled && !this.dead,
      targetProbes,
      (impactCenter, directTargetId) => {
        const hits = this.applyAreaFireExplosionUnified(
          impactCenter,
          AGATHA_BOLT_SPLASH_RADIUS,
          this.scaleDamage(28),
          0,
          3.2,
          0,
          0,
        );
        if (hits > 0 || directTargetId) {
          this.callbacks.onHitTarget?.();
        }
      },
    );

    // Agatha Purple Darkhold 12s Active Duration & 10s / 100-durability Purple Shield
    const agathaDarkholdDurSec = AGATHA_DARKHOLD_DURATION_MS / 1000;
    if (!this.dead && this.agathaDarkholdState.active) {
      this.agathaDarkholdState.elapsed += dt;
      if (
        this.agathaDarkholdState.elapsed >= agathaDarkholdDurSec &&
        this.teleportState.phase === 'idle'
      ) {
        this.closeAgathaDarkhold(true, false);
      }
    }

    const agathaShieldDurSec = AUTO_SHIELD_DURATION_MS / 1000;
    let agathaShieldRemainingRatio = 0;
    if (!this.dead && this.agathaAutoShieldState.active) {
      this.agathaAutoShieldState.elapsed += dt;
      const timeRatio = Math.max(
        0,
        1 - this.agathaAutoShieldState.elapsed / agathaShieldDurSec,
      );
      const poolRatio = Math.max(
        0,
        this.agathaAutoShieldState.absorbRemaining /
          SHIELD_MAX_DURABILITY['agatha-auto-shield'],
      );
      agathaShieldRemainingRatio = Math.min(timeRatio, poolRatio);

      if (
        this.agathaAutoShieldState.elapsed >= agathaShieldDurSec ||
        this.agathaAutoShieldState.absorbRemaining <= 0
      ) {
        this.agathaAutoShieldState.active = false;
        this.agathaAutoShieldState.elapsed = 0;
        this.agathaAutoShieldState.absorbRemaining =
          SHIELD_MAX_DURABILITY['agatha-auto-shield'];
        this.refreshInvulnerable();
        this.callbacks.onAgathaAutoShieldChange?.(false);
      }
    }

    this.agathaDarkholdBook.update(
      dt,
      focusPos,
      this.rig.root.rotation.y,
      this.dead || this.teleportState.phase === 'preparing',
    );
    this.agathaDarkholdShield.update(
      dt,
      !this.dead &&
        this.agathaAutoShieldState.active &&
        this.teleportState.phase !== 'preparing',
      focusPos,
      agathaShieldRemainingRatio,
    );

    // Darkhold 12s Active Duration & Simplified 10s / 100-dmg-absorption Automatic Shield
    const darkholdDurSec = DARKHOLD_DURATION_MS / 1000;
    if (!this.dead && this.darkholdState.active) {
      this.darkholdState.elapsed += dt;
      if (
        this.darkholdState.elapsed >= darkholdDurSec &&
        this.teleportState.phase === 'idle'
      ) {
        this.closeDarkhold(true, false);
      }
    }

    const shieldDurSec = AUTO_SHIELD_DURATION_MS / 1000;
    let shieldRemainingRatio = 0;
    if (!this.dead && this.shieldState.active) {
      this.shieldState.elapsed += dt;
      const timeRatio = Math.max(0, 1 - this.shieldState.elapsed / shieldDurSec);
      const poolRatio = Math.max(
        0,
        this.shieldState.absorbRemaining / AUTO_SHIELD_MAX_ABSORB,
      );
      shieldRemainingRatio = Math.min(timeRatio, poolRatio);

      if (
        this.shieldState.elapsed >= shieldDurSec ||
        this.shieldState.absorbRemaining <= 0
      ) {
        this.shieldState.active = false;
        this.shieldState.elapsed = 0;
        this.shieldState.absorbRemaining = AUTO_SHIELD_MAX_ABSORB;
        this.refreshInvulnerable();
        this.callbacks.onAutoShieldChange?.(false);
      }
    }

    this.darkholdBook.update(
      dt,
      focusPos,
      this.rig.root.rotation.y,
      this.dead || this.teleportState.phase === 'preparing',
    );
    this.scarletShield.update(
      dt,
      !this.dead &&
        this.shieldState.active &&
        this.teleportState.phase !== 'preparing',
      focusPos,
      shieldRemainingRatio,
    );

    this.phoenixVfx.update(
      dt,
      focusPos,
      this.archetype === 'phoenix-force' &&
        this.flightEnabled &&
        !this.dead &&
        !this.isPhoenixReviving(),
      targetProbes,
      (targetId, hitDir, hitPos) => {
        this.fx.triggerCue('phoenix-fireball-impact', hitPos);
        if (this.applyDamageUnified(targetId, this.scaleDamage(10), hitDir, 0)) {
          this.applyBurnUnified(targetId, 3.0, this.scaleDamage(2));
          this.callbacks.onPhoenixFireballHit?.();
          this.callbacks.onHitTarget?.();
        }
      },
    );

    // Emma Frost Mind Control Paralysis countdown (persists independently across casts)
    if (!this.dead && this.mindControlState.paralysisTargetId) {
      this.mindControlState.paralysisRemaining -= dt;
      if (
        this.mindControlState.paralysisRemaining <= 0 ||
        !this.isTargetAliveUnified(this.mindControlState.paralysisTargetId)
      ) {
        this.setMindControlParalysisUnified(
          this.mindControlState.paralysisTargetId,
          false,
        );
        this.mindControlState.paralysisTargetId = null;
        this.mindControlState.paralysisRemaining = 0;
      }
    }

    // Emma Frost Mind Control Choosing / Mental Damage Channel, Diamond Form & Telepathic Wave
    if (!this.dead && this.archetype === 'emma-frost') {
      const mc = this.mindControlState;
      if (
        (mc.phase === 'choosing' || mc.phase === 'mental-damage') &&
        mc.targetId
      ) {
        const targetProbe = this.findProbeById(targetProbes, mc.targetId);
        const targetHead = this._tmpA;
        if (
          !targetProbe ||
          !this.getTargetHeadPositionUnified(mc.targetId, targetHead)
        ) {
          this.clearMindControl(true);
        } else {
          const yawToNpc = Math.atan2(
            -(targetProbe.position.x - focusPos.x),
            -(targetProbe.position.z - focusPos.z),
          );
          this.cameraYaw = yawToNpc;
          this.rig.root.rotation.y = yawToNpc;
          this.setMindControlImmuneUnified(mc.targetId, true);
          this.setExternalControlUnified(mc.targetId, true);
          this.setExternalPoseUnified(
            mc.targetId,
            targetProbe.position,
            yawToNpc + Math.PI,
            { headache: true },
          );

          this.rig.root.updateMatrixWorld(true);
          this._foreheadPos
            .set(0, 0.3, -0.25)
            .applyMatrix4(this.rig.head.matrixWorld);
          this.emmaVfx.setMindControlBeam(true, this._foreheadPos, targetHead);

          if (mc.phase === 'mental-damage') {
            mc.elapsed += dt;
            mc.dmgAccum += dt;
            if (mc.dmgAccum >= 0.5) {
              mc.dmgAccum -= 0.5;
              const hitDir = this._tmpDir.subVectors(targetProbe.position, focusPos);
              hitDir.y = 0;
              if (hitDir.lengthSq() < 0.001) hitDir.set(0, 0, -1);
              else hitDir.normalize();
              this.emmaVfx.spawnMentalHeadExplosion(targetHead);
              this.callbacks.onMentalAttackImpact?.();
              if (
                this.applyDamageUnified(
                  mc.targetId,
                  this.scaleDamage(8),
                  hitDir,
                  0,
                  undefined,
                  { bypassMindControlImmunity: true, isBeam: true },
                )
              ) {
                this.callbacks.onHitTarget?.();
              }
            }
            if (
              !this.isTargetAliveUnified(mc.targetId) ||
              mc.elapsed >= EMMA_MC_MENTAL_DMG_MS / 1000
            ) {
              this.clearMindControl(true);
            }
          }
        }
      }

      if (this.diamondState.active) {
        this.diamondState.elapsed += dt;
        if (this.diamondState.elapsed >= EMMA_DIAMOND_DURATION_MS / 1000) {
          this.diamondState.active = false;
          this.diamondState.elapsed = 0;
          this.diamondState.absorbRemaining = SHIELD_MAX_DURABILITY['diamond-form'];
          this.refreshInvulnerable();
          this.fx.triggerCue('diamond-off', focusPos);
          this.callbacks.onDiamondFormChange?.(false, true);
        }
      }
      const targetDiamondBlend = this.diamondState.active ? 1 : 0;
      if (Math.abs(this.diamondState.blend - targetDiamondBlend) > 0.002) {
        this.diamondState.blend = THREE.MathUtils.damp(
          this.diamondState.blend,
          targetDiamondBlend,
          8.5,
          dt,
        );
        if (Math.abs(this.diamondState.blend - targetDiamondBlend) < 0.003) {
          this.diamondState.blend = targetDiamondBlend;
        }
        this.rig.setDiamondForm(this.diamondState.blend);
      }

      if (this.telepathicWaveState.active) {
        this.telepathicWaveState.elapsed += dt;
        this.telepathicWaveState.ringAccum += dt;
        this.telepathicWaveState.tickAccum += dt;

        const sinY = Math.sin(this.rig.root.rotation.y);
        const cosY = Math.cos(this.rig.root.rotation.y);
        this._waveDir.set(-sinY, 0, -cosY).normalize();

        if (this.telepathicWaveState.ringAccum >= 0.24) {
          this.telepathicWaveState.ringAccum -= 0.24;
          this.rig.root.updateMatrixWorld(true);
          this.rig.head.getWorldPosition(this._foreheadPos);
          this._foreheadPos.x += -sinY * 0.24;
          this._foreheadPos.y += 0.14;
          this._foreheadPos.z += -cosY * 0.24;
          this.emmaVfx.spawnTelepathicWaveRing(this._foreheadPos, this._waveDir);
        }

        if (this.telepathicWaveState.tickAccum >= 0.45) {
          this.telepathicWaveState.tickAccum -= 0.45;
          let hitAny = false;
          for (let k = 0; k < targetProbes.length; k++) {
            const trg = targetProbes[k];
            const dx = trg.position.x - focusPos.x;
            const dz = trg.position.z - focusPos.z;
            const dist = Math.hypot(dx, dz);
            if (dist <= 6.5 && dist > 0.01) {
              const dot = (dx * this._waveDir.x + dz * this._waveDir.z) / dist;
              if (dot >= 0.42) {
                this._hitDir.set(dx / dist, 0, dz / dist);
                if (this.applyDamageUnified(trg.id, this.scaleDamage(4), this._hitDir, 0)) {
                  this.applyHeadacheUnified(trg.id, 1.5);
                  hitAny = true;
                }
              }
            }
          }
          if (hitAny) {
            this.callbacks.onHitTarget?.();
          }
        }

        if (this.telepathicWaveState.elapsed >= 2.4) {
          this.telepathicWaveState.active = false;
          this.animator.setTelepathicWave(false);
          this.callbacks.onTelepathicWaveChange?.(false, true);
        }
      }

      if (this.astralState.phase === 'projecting') {
        this.astralState.bodyAnimator?.update(dt, this._decoyMotion);
        this.astralState.elapsed += dt;
        if (this.astralState.elapsed >= EMMA_ASTRAL_MAX_DURATION_MS / 1000) {
          this.beginAstralReturn();
        }
      }
    }

    // Emma Frost idle circular psychic rings on forehead
    if (this.archetype === 'emma-frost') {
      const emmaIdleActive =
        !this.dead &&
        !this.flightEnabled &&
        !this.telepathicWaveState.active &&
        this.mindControlState.phase === 'idle' &&
        this.teleportState.phase === 'idle' &&
        Math.hypot(
          this.physics.velocity.x,
          this.physics.velocity.z,
        ) < 0.4;
      this.rig.root.updateMatrixWorld(true);
      this._foreheadPos.set(0, 0.3, -0.25).applyMatrix4(this.rig.head.matrixWorld);
      this._waveDir
        .set(0, 0.32, -1.25)
        .applyMatrix4(this.rig.head.matrixWorld)
        .sub(this._foreheadPos)
        .normalize();
      this.emmaIdleRings.update(dt, emmaIdleActive, this._foreheadPos, this._waveDir);
    } else {
      this.emmaIdleRings.clear();
    }

    this.emmaVfx.update(dt, targetProbes, (targetId, hitDir) => {
      this.callbacks.onDiamondProjectileImpact?.();
      if (this.applyDamageUnified(targetId, this.scaleDamage(22), hitDir, 0)) {
        this.callbacks.onHitTarget?.();
      }
    });

    // Hela Crown Form smooth transition, Dual-Sword Summon reload cadence & Green Explosion charge slam
    if (!this.dead && this.archetype === 'hela') {
      if (this.crownState.active) {
        this.crownState.elapsed += dt;
        if (this.crownState.elapsed >= HELA_CROWN_DURATION_MS / 1000) {
          this.crownState.active = false;
          this.crownState.elapsed = 0;
          this.fx.triggerCue('crown-off', focusPos);
          this.callbacks.onCrownFormChange?.(false, true);
        }
      }
      const targetCrownBlend = this.crownState.active ? 1 : 0;
      if (Math.abs(this.crownState.blend - targetCrownBlend) > 0.002) {
        this.crownState.blend = THREE.MathUtils.damp(
          this.crownState.blend,
          targetCrownBlend,
          12,
          dt,
        );
        if (Math.abs(this.crownState.blend - targetCrownBlend) < 0.004) {
          this.crownState.blend = targetCrownBlend;
        }
        this.rig.setHelaCrownProgress(this.crownState.blend);
      }

      if (this.swordSummonState.slashCooldownRemaining > 0) {
        this.swordSummonState.slashCooldownRemaining = Math.max(
          0,
          this.swordSummonState.slashCooldownRemaining - dt,
        );
      }

      if (this.swordSummonState.active) {
        this.swordSummonState.elapsed += dt;
        if (this.swordSummonState.reloading) {
          this.swordSummonState.reloadElapsed += dt;
          if (
            (!this.swordSummonState.leftInHand || !this.swordSummonState.rightInHand) &&
            this.swordSummonState.reloadElapsed >= HELA_SWORD_APPEAR_MS / 1000
          ) {
            this.swordSummonState.leftInHand = true;
            this.swordSummonState.rightInHand = true;
            this.swordSummonState.reloadHand = null;
            this.rig.setHelaHandSwords(true, true);
          }
          if (
            this.swordSummonState.reloadElapsed >=
            HELA_SWORD_THROW_READY_MS / 1000
          ) {
            this.swordSummonState.reloading = false;
            this.swordSummonState.throwReady = true;
            this.callbacks.onSwordThrowAvailabilityChange?.(true);
          }
        }

        if (
          this.swordSummonState.elapsed >=
          HELA_SWORD_SUMMON_DURATION_MS / 1000
        ) {
          this.swordSummonState.active = false;
          this.swordSummonState.leftInHand = false;
          this.swordSummonState.rightInHand = false;
          this.swordSummonState.reloadHand = null;
          this.swordSummonState.throwReady = false;
          this.swordSummonState.reloading = false;
          this.swordSummonState.slashCooldownRemaining = 0;
          this.rig.setHelaHandSwords(false, false);
          this.animator.setSwordHeld(false);
          this.callbacks.onSwordSummonChange?.(false, true);
          this.callbacks.onSwordThrowAvailabilityChange?.(false);
        }
      }

      if (this.greenChargeState.active) {
        this.greenChargeState.elapsed += dt;
        this.rig.root.updateMatrixWorld(true);
        this.rig.rightHand.getWorldPosition(this._handWorld);
        const ratio = Math.min(1, this.greenChargeState.elapsed / 0.42);
        this.helaVfx.updateHandGather(
          dt,
          this.greenChargeState.elapsed < 0.42,
          this._handWorld,
          ratio,
        );

        if (this.greenChargeState.elapsed >= 0.42) {
          this.greenChargeState.active = false;
          this.greenChargeState.elapsed = 0;
          this.helaVfx.updateHandGather(dt, false, null, 0);
          this.helaVfx.spawnGreenExplosion(focusPos, 7.5);
          this.rockBreakVfx.spawnImpact(focusPos, 1.55, '#3CE66B');
          this.fx.triggerCue('green-explosion', focusPos);
          this.callbacks.onGreenExplosion?.('detonate');

          const dmg = this.scaleDamage(
            32 + (this.crownState.active ? HELA_CROWN_BONUS_DAMAGE : 0),
          );
          const hits = this.applyAreaFireExplosionUnified(
            focusPos,
            7.5,
            dmg,
            2.0,
            7.2,
            0,
            0,
          );
          if (hits > 0) {
            this.callbacks.onHitTarget?.();
          }
        }
      }
    }

    this.helaVfx.update(
      dt,
      targetProbes,
      (targetId, outPos) => this.getNpcSwordEmbedPoseUnified(targetId, outPos),
      (targetId, damage, hitDir, hitPos) => {
        this.fx.triggerCue('sword-embed', hitPos);
        this.callbacks.onSwordEmbed?.();
        if (this.applyDamageUnified(targetId, damage, hitDir, 0)) {
          this.callbacks.onHitTarget?.();
        }
      },
    );

    // ------------------------------------------------------------------
    // MAGNETO STATE & VFX STEP
    // ------------------------------------------------------------------
    if (!this.dead && this.archetype === 'magneto') {
      if (this.magnetoTornadoState.active) {
        this.magnetoTornadoState.elapsed += dt;
        if (this.magnetoTornadoState.elapsed >= MAGNETO_TORNADO_DURATION_MS / 1000) {
          this.magnetoTornadoState.active = false;
          this.magnetoTornadoState.elapsed = 0;
          this.magnetoVfx.setTornadoActive(false);
          this.animator.setMetalTornado(false);
          this.flightEnabled = false;
          this.magnetoShieldState.active = false;
          this.magnetoVfx.setShieldActive(false);
          this.refreshInvulnerable();
          this.callbacks.onFlightForceChange?.(false);
          this.callbacks.onMagnetoTornadoChange?.(false, true);
        }
      }
    }

    this.magnetoVfx.update(dt, focusPos, targetProbes, {
      onProjectileHit: (id, hitDir, damage) => {
        if (this.applyDamageUnified(id, this.scaleDamage(damage), hitDir, 0)) {
          this.callbacks.onHitTarget?.();
        }
      },
      onMeteorLaunch: () => {
        this.fx.triggerCue('magneto-meteor-impact', focusPos);
        this.callbacks.onMagnetoMeteorStage?.('launch');
      },
      onMeteorImpact: (impactPos) => {
        this.magnetoMeteorActive = false;
        this.flightEnabled = false;
        this.magnetoShieldState.active = false;
        this.magnetoVfx.setShieldActive(false);
        this.refreshInvulnerable();
        this.callbacks.onFlightForceChange?.(false);
        this.rockBreakVfx.spawnImpact(impactPos, 1.85, '#C86BFF');
        this.fx.triggerCue('magneto-meteor-impact', impactPos);
        this.callbacks.onMagnetoMeteorStage?.('impact');
        const hits = this.applyAreaFireExplosionUnified(
          impactPos,
          6.2,
          this.scaleDamage(55),
          2.0,
          8.2,
          0,
          0,
        );
        if (hits > 0) this.callbacks.onHitTarget?.();
      },
      onTornadoControl: (id, pos, yaw, tickDamage) => {
        this.setExternalControlUnified(id, true);
        this.setExternalPoseUnified(id, pos, yaw);
        if (tickDamage > 0) {
          const outDir = this._tmpDir.subVectors(pos, focusPos);
          outDir.y = 0;
          outDir.normalize();
          if (this.applyDamageUnified(id, this.scaleDamage(tickDamage), outDir, 0)) {
            this.callbacks.onHitTarget?.();
          }
        }
      },
      onTornadoRelease: (id) => {
        this.setExternalControlUnified(id, false);
        const dir = this._tmpDir
          .set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw))
          .multiplyScalar(3.4);
        this.triggerTargetRagdollUnified(id, 1.35, dir);
      },
    });

    // ------------------------------------------------------------------
    // QUICKSILVER STATE & VFX STEP
    // ------------------------------------------------------------------
    if (!this.dead && this.archetype === 'quicksilver') {
      const rps = this.rapidPunchState;
      const targetId = rps.targetId;
      if (rps.active && targetId) {
        const targetProbe = this.findProbeById(targetProbes, targetId);
        if (!targetProbe) {
          this.setExternalControlUnified(targetId, false);
          rps.active = false;
          rps.targetId = null;
          this.refreshInvulnerable();
          this.animator.setRapidPunch(false);
          this.callbacks.onRapidPunchChange?.(false, true);
        } else {
          rps.elapsed += dt;
          const totalDur = QUICKSILVER_COMBO_DURATION_MS / 1000;
          const lockedNpcPos = this._tmpA.copy(targetProbe.position);
          lockedNpcPos.y = Math.max(0, lockedNpcPos.y);
          const yawToNpc = Math.atan2(
            -(lockedNpcPos.x - focusPos.x),
            -(lockedNpcPos.z - focusPos.z),
          );
          this.cameraYaw = yawToNpc;
          this.rig.root.rotation.y = yawToNpc;
          this.setExternalControlUnified(targetId, true);
          this.setExternalPoseUnified(targetId, lockedNpcPos, yawToNpc + Math.PI, {
            headache: true,
          });

          if (!rps.finished && rps.elapsed < totalDur - 0.25) {
            rps.punchAccum += dt;
            if (rps.punchAccum >= 0.22) {
              rps.punchAccum -= 0.22;
              rps.sideSign *= -1;
              const hitDir = this._tmpDir.subVectors(lockedNpcPos, focusPos);
              hitDir.y = 0;
              hitDir.normalize();
              this.quicksilverVfx.spawnPunchImpact(lockedNpcPos, false);
              this.callbacks.onRapidPunchStrike?.(false);
              if (this.applyDamageUnified(targetId, this.scaleDamage(4), hitDir, 0)) {
                this.callbacks.onHitTarget?.();
              }
            }
          } else if (!rps.finished && rps.elapsed >= totalDur - 0.25) {
            rps.finished = true;
            this.animator.setRapidPunch(false);
            this.animator.triggerCast('qs-finisher-punch', 0.35);
            const launchDir = this._tmpDir.subVectors(lockedNpcPos, focusPos);
            launchDir.y = 0;
            launchDir.normalize();
            const knockImpulse = this._tmpKnock.copy(launchDir).multiplyScalar(11.5);
            knockImpulse.y = 4.2;
            this.setExternalControlUnified(targetId, false);
            this.quicksilverVfx.spawnPunchImpact(lockedNpcPos, true);
            this.fx.triggerCue('qs-punch-finisher', lockedNpcPos);
            this.callbacks.onRapidPunchStrike?.(true);
            if (
              this.applyDamageUnified(
                targetId,
                this.scaleDamage(18),
                launchDir,
                2.5,
                knockImpulse,
              )
            ) {
              this.callbacks.onHitTarget?.();
            }
          }

          if (rps.elapsed >= totalDur) {
            rps.active = false;
            rps.targetId = null;
            this.refreshInvulnerable();
            this.animator.setRapidPunch(false);
            this.callbacks.onRapidPunchChange?.(false, true);
          }
        }
      }

      if (this.speedBlitzState.active) {
        const sb = this.speedBlitzState;
        sb.hopElapsed += dt;

        const targetProbe = sb.hopTargetId
          ? this.findProbeById(targetProbes, sb.hopTargetId)
          : undefined;
        if (targetProbe && !sb.hopPunched) {
          // Track moving target slightly before landing punch
          this.computeSpeedBlitzArrivalPos(sb.hopStartPos, targetProbe.position, sb.hopDestPos);
        }

        const dashU = Math.min(1, sb.hopElapsed / sb.hopDuration);
        const easeDash = 1 - Math.pow(1 - dashU, 2);
        this.physics.position.lerpVectors(sb.hopStartPos, sb.hopDestPos, easeDash);
        this.physics.velocity.set(0, 0, 0);
        this.rig.root.position.copy(this.physics.position);
        focusPos = this.physics.position;

        const faceTarget = targetProbe ? targetProbe.position : sb.hopDestPos;
        const dxFace = faceTarget.x - this.physics.position.x;
        const dzFace = faceTarget.z - this.physics.position.z;
        if (dxFace * dxFace + dzFace * dzFace > 0.0005) {
          const aimYaw = Math.atan2(-dxFace, -dzFace);
          this.rig.root.rotation.y = aimYaw;
          this.cameraYaw = aimYaw;
        }

        if (!sb.hopPunched && sb.hopElapsed >= sb.hopDuration) {
          sb.hopPunched = true;
          const tid = sb.hopTargetId;
          if (tid && !sb.hitIds.has(tid) && targetProbe) {
            sb.hitIds.add(tid);
            sb.hitsDone++;
            const punchKind =
              sb.hitsDone >= 5
                ? 'qs-finisher-punch'
                : sb.sideSign > 0
                  ? 'npc-punch-right'
                  : 'npc-punch-left';
            sb.sideSign *= -1;
            this.animator.triggerCast(punchKind, punchKind === 'qs-finisher-punch' ? 0.3 : 0.22);

            const pushDir = this._tmpDir.subVectors(targetProbe.position, this.physics.position);
            pushDir.y = 0;
            if (pushDir.lengthSq() < 0.001) {
              pushDir.set(-Math.sin(this.rig.root.rotation.y), 0, -Math.cos(this.rig.root.rotation.y));
            } else {
              pushDir.normalize();
            }
            const knockImpulse = this._tmpKnock.copy(pushDir).multiplyScalar(14.2);
            knockImpulse.y = 0.42;

            this.quicksilverVfx.spawnPunchImpact(targetProbe.position, sb.hitsDone >= 5);
            this.fx.triggerCue('qs-punch-hit', targetProbe.position);
            this.callbacks.onRapidPunchStrike?.(sb.hitsDone >= 5);

            if (
              this.applyDamageUnified(
                tid,
                this.scaleDamage(24),
                pushDir,
                0.56,
                knockImpulse,
                { pushOnly: true },
              )
            ) {
              this.callbacks.onHitTarget?.();
            }
          }
        }

        if (sb.hopElapsed >= sb.hopDuration + 0.045) {
          const MAX_HITS = 5;
          const MAX_HOP_DIST = 11.5;
          const MAX_ORIGIN_RADIUS = 16.0;
          const MAX_TOTAL_TRAVEL = 32.0;

          let nextProbe: CombatTargetProbe | undefined;
          if (sb.hitsDone < MAX_HITS) {
            let bestDist = MAX_HOP_DIST;
            for (let i = 0; i < targetProbes.length; i++) {
              const p = targetProbes[i];
              if (sb.hitIds.has(p.id)) continue;
              const stepDist = Math.hypot(
                p.position.x - this.physics.position.x,
                p.position.z - this.physics.position.z,
              );
              if (stepDist > bestDist) continue;
              const originDist = Math.hypot(
                p.position.x - sb.origin.x,
                p.position.z - sb.origin.z,
              );
              if (originDist > MAX_ORIGIN_RADIUS) continue;
              if (Math.abs(p.position.y - sb.origin.y) > 4.2) continue;
              if (sb.totalTravel + stepDist > MAX_TOTAL_TRAVEL) continue;
              bestDist = stepDist;
              nextProbe = p;
            }
          }

          if (nextProbe) {
            sb.hopStartPos.copy(this.physics.position);
            this.computeSpeedBlitzArrivalPos(sb.hopStartPos, nextProbe.position, sb.hopDestPos);
            const actualHopDist = Math.hypot(
              sb.hopDestPos.x - sb.hopStartPos.x,
              sb.hopDestPos.z - sb.hopStartPos.z,
            );
            sb.totalTravel += actualHopDist;
            sb.hopTargetId = nextProbe.id;
            sb.hopElapsed = 0;
            sb.hopPunched = false;
            const hopYaw = Math.atan2(
              -(nextProbe.position.x - sb.hopStartPos.x),
              -(nextProbe.position.z - sb.hopStartPos.z),
            );
            this.cameraYaw = hopYaw;
            this.rig.root.rotation.y = hopYaw;
            this.quicksilverVfx.spawnBlitzDash(sb.hopStartPos, sb.hopDestPos, hopYaw);
          } else {
            this.finishSpeedBlitz(true);
          }
        }
      }

      if (this.windTornadoState.active) {
        this.windTornadoState.elapsed += dt;
        if (this.windTornadoState.elapsed >= QUICKSILVER_TORNADO_MAX_DURATION_MS / 1000) {
          this.windTornadoState.active = false;
          this.windTornadoState.elapsed = 0;
          this.quicksilverVfx.setWindTornado(false);
          this.callbacks.onWindTornadoChange?.(false, true);
        }
      }
    }

    const horizSpeed = Math.hypot(this.physics.velocity.x, this.physics.velocity.z);
    const speedVfxOn =
      !this.dead &&
      this.archetype === 'quicksilver' &&
      (this.superSpeedState.active ||
        this.windTornadoState.active ||
        this.rapidPunchState.active ||
        this.speedBlitzState.active);
    this.quicksilverVfx.update(
      dt,
      focusPos,
      this.rig.root.rotation.y,
      this.windTornadoState.active || this.speedBlitzState.active ? 18 : horizSpeed,
      speedVfxOn,
      targetProbes,
      {
        onWindTornadoControl: (id, pos, yaw, tickDamage) => {
          this.setExternalControlUnified(id, true);
          this.setExternalPoseUnified(id, pos, yaw);
          if (tickDamage > 0) {
            const outDir = this._tmpDir.subVectors(pos, this.windTornadoState.center);
            outDir.y = 0;
            outDir.normalize();
            if (this.applyDamageUnified(id, this.scaleDamage(tickDamage), outDir, 0)) {
              this.callbacks.onHitTarget?.();
            }
          }
        },
        onWindTornadoRelease: (id) => {
          this.setExternalControlUnified(id, false);
        },
        onTimeFreezeChange: (id, frozen) => {
          this.setParalyzedUnified(id, frozen);
        },
      },
    );

    // ------------------------------------------------------------------
    // DOCTOR STRANGE & THE ANCIENT ONE STATE & VFX STEP
    // ------------------------------------------------------------------
    if (!this.dead && this.archetype === 'doctor-strange') {
      if (this.strangeShieldState.active) {
        this.strangeShieldState.elapsed += dt;
        if (this.strangeShieldState.elapsed >= STRANGE_SHIELD_MAX_DURATION_MS / 1000) {
          this.strangeShieldState.active = false;
          this.strangeShieldState.elapsed = 0;
          this.strangeShieldState.absorbRemaining = SHIELD_MAX_DURABILITY['mystic-shield'];
          this.strangeVfx.setShieldActive(false);
          this.refreshInvulnerable();
          this.fx.triggerCue('strange-shield-off', focusPos);
          this.callbacks.onStrangeShieldChange?.(false, true);
        }
      }

      if (this.astralExtractionState.active && this.astralExtractionState.targetId) {
        const targetId = this.astralExtractionState.targetId;
        const aes = this.astralExtractionState;
        aes.elapsed += dt;

        this.setExternalControlUnified(targetId, true);
        this.setExternalPoseUnified(targetId, aes.targetPos, aes.targetYaw, {
          limp: aes.impactApplied,
        });

        if (!aes.impactApplied && aes.elapsed >= 0.42) {
          aes.impactApplied = true;
          this.fx.triggerCue('astral-extract-strike', aes.targetPos);
          this.callbacks.onAstralExtractionCast?.();
          if (this.applyDamageUnified(targetId, 40, aes.knockAxis, 0)) {
            this.callbacks.onHitTarget?.();
          }
          if (!this.isTargetAliveUnified(targetId)) {
            this.setExternalControlUnified(targetId, false);
            this.strangeVfx.stopAstralExtractionSoul();
            aes.active = false;
            aes.targetId = null;
            this.refreshInvulnerable();
          } else {
            this.setExternalPoseUnified(targetId, aes.targetPos, aes.targetYaw, {
              limp: true,
            });
          }
        }

        if (aes.active) {
          this.strangeVfx.updateAstralExtractionSoul(
            dt,
            aes.elapsed,
            aes.targetPos,
            aes.targetYaw,
            aes.knockAxis,
          );
          if (aes.elapsed >= 2.15) {
            this.setExternalPoseUnified(targetId, aes.targetPos, aes.targetYaw, {
              limp: false,
            });
            this.setExternalControlUnified(targetId, false);
            this.strangeVfx.stopAstralExtractionSoul();
            aes.active = false;
            aes.targetId = null;
            this.refreshInvulnerable();
          }
        }
      }
    }

    // Doctor Strange Mystic Clones Precast + Purgatory's Grasp
    if (!this.dead && this.strangeClonesPrecastState.active) {
      this.strangeClonesPrecastState.elapsed += dt;
      if (this.strangeClonesPrecastState.elapsed >= 0.42) {
        const targetId = this.strangeClonesPrecastState.targetId;
        this.strangeClonesPrecastState.active = false;
        this.strangeClonesPrecastState.elapsed = 0;
        this.strangeClonesPrecastState.targetId = null;

        if (targetId) {
          const probe = this.findProbeById(targetProbes, targetId);
          if (probe) {
            this.strangeVfx.spawnMysticClones(
              targetId,
              probe.position,
              this.currentAppearance,
            );
            this.setClonesRestrictedUnified(targetId, true);
            this.fx.triggerCue('strange-clones', probe.position);
            this.callbacks.onStrangeClonesCast?.();
          }
        }
      }
    }

    if (!this.dead && this.purgatoryGraspState.active) {
      const pgs = this.purgatoryGraspState;
      pgs.elapsed += dt;

      const liftP = THREE.MathUtils.clamp(pgs.elapsed / 0.95, 0, 1);
      const liftEase = 1 - Math.pow(1 - liftP, 2.2);
      const slamFlare =
        pgs.elapsed >= 0.95 && pgs.elapsed < 1.15
          ? THREE.MathUtils.clamp((pgs.elapsed - 0.95) / 0.2, 0, 1)
          : pgs.elapsed >= 1.15
            ? Math.max(0, 1 - (pgs.elapsed - 1.15) / 0.2)
            : 0;
      const slamP =
        pgs.elapsed >= 1.15
          ? THREE.MathUtils.clamp((pgs.elapsed - 1.15) / 0.2, 0, 1)
          : 0;
      const slamEase = slamP * slamP;

      const targetYaw = this.rig.root.rotation.y;
      const tmpPos = this._tmpA;
      for (let i = pgs.targets.length - 1; i >= 0; i--) {
        const t = pgs.targets[i];
        if (!this.isTargetAliveUnified(t.id)) {
          this.strangeVfx.removePurgatoryTarget(t.id);
          this.setExternalControlUnified(t.id, false);
          pgs.targets.splice(i, 1);
          continue;
        }
        const curY =
          pgs.elapsed < 1.15
            ? THREE.MathUtils.lerp(t.startY, 3.35, liftEase)
            : THREE.MathUtils.lerp(3.35, 0, slamEase);
        const pitchX = -Math.PI * 0.5 * liftEase;
        tmpPos.set(t.x, curY, t.z);
        this.setExternalPoseUnified(t.id, tmpPos, targetYaw, { pitchX });
        this.strangeVfx.updatePurgatoryTarget(t.id, t.x, t.z, liftEase, slamFlare);
      }

      if (pgs.elapsed >= 1.35 || pgs.targets.length === 0) {
        let hitAny = false;
        const impactPos = this._tmpA;
        const dir = this._tmpDir;
        const slamVec = this._tmpKnock;
        for (let i = 0; i < pgs.targets.length; i++) {
          const t = pgs.targets[i];
          this.strangeVfx.removePurgatoryTarget(t.id);
          this.setExternalControlUnified(t.id, false);
          impactPos.set(t.x, 0, t.z);
          this.strangeVfx.triggerPurgatoryGroundSlam(impactPos);
          this.rockBreakVfx.spawnImpact(impactPos, 1.35, '#5BC0FF');
          dir.subVectors(impactPos, focusPos);
          dir.y = 0;
          if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
          else dir.normalize();
          slamVec.copy(dir).multiplyScalar(3.2);
          slamVec.y = 2.2;
          if (this.applyDamageUnified(t.id, this.scaleDamage(36), dir, 1.8, slamVec)) {
            hitAny = true;
          }
        }
        if (hitAny) {
          this.callbacks.onHitTarget?.();
        }
        pgs.active = false;
        pgs.elapsed = 0;
        pgs.slammed = false;
        pgs.targets = [];
      }
    }

    this.strangeVfx.update(dt, focusPos, this.rig.root.rotation.y, targetProbes, {
      onClonesTickDamage: (targetId, dmg) => {
        const dir = this._tmpDir.set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
        if (this.applyDamageUnified(targetId, this.scaleDamage(dmg), dir, 0)) {
          this.callbacks.onHitTarget?.();
        }
      },
      onClonesEnd: (targetId) => {
        this.setClonesRestrictedUnified(targetId, false);
      },
      onDiscHitTarget: (targetId, hitDir) => {
        this.callbacks.onStrangeDiscImpact?.();
        const knock = this._tmpKnock.copy(hitDir).multiplyScalar(5.4);
        knock.y = 0.45;
        if (this.applyDamageUnified(targetId, this.scaleDamage(28), hitDir, 0, knock)) {
          this.callbacks.onHitTarget?.();
        }
      },
    });

    // ------------------------------------------------------------------
    // VISION STATE & VFX STEP
    // ------------------------------------------------------------------
    if (!this.dead && this.archetype === 'vision') {
      if (this.visionIntangibleState.active) {
        this.visionIntangibleState.elapsed += dt;
        if (
          !this.flightEnabled ||
          this.visionIntangibleState.elapsed >= VISION_INTANGIBLE_MAX_DURATION_MS / 1000
        ) {
          this.visionIntangibleState.active = false;
          this.visionIntangibleState.elapsed = 0;
          this.physics.resolveHorizontalOverlap();
          this.refreshInvulnerable();
          this.fx.triggerCue('vision-phase-off', focusPos);
          this.callbacks.onVisionPhaseChange?.(false, true);
        }
      }

      const targetBlend = this.visionIntangibleState.active ? 1 : 0;
      if (Math.abs(this.visionIntangibleState.blend - targetBlend) > 0.002) {
        this.visionIntangibleState.blend = THREE.MathUtils.damp(
          this.visionIntangibleState.blend,
          targetBlend,
          12,
          dt,
        );
        if (Math.abs(this.visionIntangibleState.blend - targetBlend) < 0.004) {
          this.visionIntangibleState.blend = targetBlend;
        }
        this.rig.setIntangible(
          this.visionIntangibleState.blend > 0.02,
          this.visionIntangibleState.blend,
        );
      }

      if (this.visionLaserState.active) {
        this.visionLaserState.elapsed += dt;
        if (this.visionLaserState.elapsed >= VISION_LASER_DURATION_MS / 1000) {
          this.visionLaserState.active = false;
          this.visionLaserState.elapsed = 0;
          this.visionVfx.setLaserActive(false);
          this.animator.setMindLaser(false);
          this.callbacks.onVisionLaserChange?.(false, true);
        }
      }

      if (this.visionBoltChargeState.active) {
        this.visionBoltChargeState.elapsed += dt;
        const chargeDur = VISION_MIND_BOLT_CHARGE_MS / 1000;
        const progress = Math.min(1, this.visionBoltChargeState.elapsed / chargeDur);
        this.visionVfx.setBoltCharging(true, progress);
        if (this.visionBoltChargeState.elapsed >= chargeDur) {
          this.visionBoltChargeState.active = false;
          this.visionBoltChargeState.elapsed = 0;
          this.animator.setVisionBoltCharge(false);
          this.visionVfx.setBoltCharging(false, 0);
          this.getMindStoneWorldPosition(this._mindStoneWorld);
          const target = this.computeReticleAimPoint(36, true, false);
          this.visionVfx.spawnMindBolt(this._mindStoneWorld, target);
          this.animator.triggerCast('vision-bolt', 0.28);
          this.fx.triggerCue('vision-bolt', this._mindStoneWorld);
          this.callbacks.onVisionBoltCast?.();
          this.callbacks.onVisionBoltCooldown?.();
        }
      }

      const hg = this.visionHeadGripState;
      const targetId = hg.targetId;
      if (hg.active && targetId) {
        const probe = this.findProbeById(targetProbes, targetId);
        if (!probe && !hg.slammed) {
          this.setExternalControlUnified(targetId, false);
          hg.active = false;
          hg.targetId = null;
          this.animator.setHeadGrip(false);
          this.refreshInvulnerable();
          this.callbacks.onVisionHeadGripChange?.(false, true);
        } else {
          hg.elapsed += dt;
          const totalDur = VISION_HEAD_GRIP_DURATION_MS / 1000;

          if (!hg.slammed) {
            const liftRatio = THREE.MathUtils.clamp(hg.elapsed / 0.45, 0, 1);
            const liftY = hg.lockedPos.y + THREE.MathUtils.lerp(0, 0.22, liftRatio);
            const gripPos = this._tmpA.set(hg.lockedPos.x, liftY, hg.lockedPos.z);

            const yawToNpc = Math.atan2(
              -(gripPos.x - focusPos.x),
              -(gripPos.z - focusPos.z),
            );
            this.cameraYaw = yawToNpc;
            this.rig.root.rotation.y = yawToNpc;
            this.setExternalControlUnified(targetId, true);
            this.setExternalPoseUnified(targetId, gripPos, yawToNpc + Math.PI, {
              headache: true,
            });

            hg.tickAccum += dt;
            if (hg.tickAccum >= 0.48 && hg.ticksDone < 4) {
              hg.tickAccum -= 0.48;
              hg.ticksDone++;
              const hitDir = this._tmpDir.subVectors(gripPos, focusPos);
              hitDir.y = 0;
              hitDir.normalize();
              if (this.applyDamageUnified(targetId, this.scaleDamage(6), hitDir, 0)) {
                this.callbacks.onHitTarget?.();
              }
            }

            if (hg.elapsed >= 2.15) {
              hg.slammed = true;
              this.animator.setHeadGrip(false);
              this.rockBreakVfx.spawnImpact(gripPos, 1.25, '#FFD84D');
              this.fx.triggerCue('vision-head-slam', gripPos);
              const launchDir = this._tmpDir.subVectors(gripPos, focusPos);
              launchDir.y = 0;
              launchDir.normalize();
              const slamImpulse = this._tmpKnock.copy(launchDir).multiplyScalar(8.5);
              slamImpulse.y = -2.2;
              this.setExternalControlUnified(targetId, false);
              if (
                this.applyDamageUnified(
                  targetId,
                  this.scaleDamage(18),
                  launchDir,
                  3.0,
                  slamImpulse,
                )
              ) {
                this.callbacks.onHitTarget?.();
              }
            }
          }

          if (hg.elapsed >= totalDur) {
            hg.active = false;
            hg.targetId = null;
            this.refreshInvulnerable();
            this.callbacks.onVisionHeadGripChange?.(false, true);
          }
        }
      }
    }

    if (this.archetype === 'vision') {
      this.getMindStoneWorldPosition(this._mindStoneWorld);
      if (this.visionLaserState.active) {
        this._laserEndWorld.copy(this.computeReticleAimPoint(34, true, false));
      }
    }
    this.visionVfx.update(
      dt,
      this._mindStoneWorld,
      this._laserEndWorld,
      targetProbes,
      {
        onLaserHitTarget: (id, dir, dmg) => {
          if (
            this.applyDamageUnified(id, this.scaleDamage(dmg), dir, 0, undefined, {
              isBeam: true,
            })
          ) {
            this.callbacks.onHitTarget?.();
          }
        },
        onBoltHitTarget: (id, dir, dmg) => {
          if (this.applyDamageUnified(id, this.scaleDamage(dmg), dir, 0)) {
            this.callbacks.onHitTarget?.();
          }
        },
        onExplosiveBoltDetonate: (impactPos) => {
          this.rockBreakVfx.spawnImpact(impactPos, 1.45, '#FFD84D');
          this.fx.triggerCue('vision-bolt-explode', impactPos);
          this.callbacks.onVisionBoltExplode?.();
          const hits = this.applyAreaFireExplosionUnified(
            impactPos,
            5.2,
            this.scaleDamage(40),
            1.8,
            6.8,
            0,
            0,
          );
          if (hits > 0) {
            this.callbacks.onHitTarget?.();
          }
        },
      },
    );

    // Invisible Woman tick update: Forcefield Barrier lock, Invisibility cloak wave, Forcefield Shield 10s, Transfer/Protection/Suffocation 4s, & VFX
    if (this.barrierLockTimer > 0) {
      this.barrierLockTimer = Math.max(0, this.barrierLockTimer - dt);
      if (this.barrierLockTimer <= 0) {
        this.barrierLockTimer = 0;
        this.callbacks.onForcefieldBarrierLockChange?.(false);
      }
    }
    if (this.forcefieldTransferCooldownTimer > 0) {
      this.forcefieldTransferCooldownTimer = Math.max(
        0,
        this.forcefieldTransferCooldownTimer - dt,
      );
    }

    if (!this.dead && this.archetype === 'invisible-woman') {
      const inv = this.invisibilityState;
      const cloakSpeed = 1 / 0.48;
      if (inv.active) {
        inv.elapsed += dt;
        if (inv.elapsed >= INVISIBILITY_MAX_DURATION_MS / 1000) {
          this.cancelInvisibility(true);
        } else if (inv.phase === 'vanishing') {
          inv.progress = Math.min(1, inv.progress + dt * cloakSpeed);
          if (inv.progress >= 1) {
            inv.phase = 'cloaked';
          }
        }
      } else if (inv.phase === 'revealing') {
        inv.progress = Math.max(0, inv.progress - dt * cloakSpeed);
        if (inv.progress <= 0) {
          inv.phase = 'idle';
        }
      }

      const cutLocalY = THREE.MathUtils.lerp(2.15, -0.15, inv.progress);
      const cloakVisualActive = inv.phase !== 'idle' || inv.progress > 0;
      this.rig.setInvisibilityCloak(
        cloakVisualActive,
        cutLocalY,
        focusPos.y,
        0.34,
      );
      this._ffCloakArg.active = cloakVisualActive;
      this._ffCloakArg.phase = inv.phase;
      this._ffCloakArg.cutLocalY = cutLocalY;

      const ffs = this.forcefieldShieldState;
      if (ffs.active) {
        ffs.elapsed += dt;
        if (ffs.elapsed >= FORCEFIELD_SHIELD_DURATION_MS / 1000) {
          const tPhase = this.forcefieldTransferState.phase;
          if (tPhase === 'idle' || tPhase === 'choosing') {
            if (tPhase === 'choosing') {
              this.cleanupForcefieldTransfer(false);
            }
            this.endForcefieldShield(true);
          }
        }
      }

      const fft = this.forcefieldTransferState;
      let hasTargetSphere = false;
      if (fft.phase !== 'idle' && fft.targetId) {
        const tid = fft.targetId;
        const alive = this.isTargetAliveUnified(tid);
        const targetShieldLeft = this.getForcefieldShieldRemainingUnified(tid);
        if (!alive || targetShieldLeft <= 0) {
          this.cleanupForcefieldTransfer(true);
        } else {
          hasTargetSphere =
            this.getTargetTorsoPositionUnified(tid, this._ffTorso) &&
            this.getTargetHeadPositionUnified(tid, this._ffHead);
          if (!hasTargetSphere) {
            this.cleanupForcefieldTransfer(true);
          } else if (fft.phase === 'protection' || fft.phase === 'suffocation') {
            fft.effectElapsed += dt;
            fft.tickAccum += dt;
            while (fft.tickAccum >= 1.0 && fft.ticksDone < 4) {
              fft.tickAccum -= 1.0;
              fft.ticksDone += 1;
              if (fft.phase === 'protection') {
                this.applyHealUnified(tid, 2);
                this.fx.triggerCue('forcefield-protection', this._ffTorso);
              } else {
                const hitDir = this._tmpDir.subVectors(this._ffTorso, focusPos);
                hitDir.y = 0;
                if (hitDir.lengthSq() > 0.001) hitDir.normalize();
                else hitDir.set(0, 0, -1);
                if (
                  this.applyDamageUnified(
                    tid,
                    this.scaleDamage(5),
                    hitDir,
                    0,
                    undefined,
                    {
                      bypassShield: true,
                      bypassExternalImmunity: true,
                      noAggro: true,
                    },
                  )
                ) {
                  this.callbacks.onHitTarget?.();
                }
                this.fx.triggerCue('forcefield-suffocation', this._ffHead);
              }
            }
            if (fft.effectElapsed >= FORCEFIELD_EFFECT_DURATION_MS / 1000) {
              this.cleanupForcefieldTransfer(true);
            }
          }
        }
      }

      this._ffTargetArg.active = this.forcefieldTransferState.phase !== 'idle';
      this._ffTargetArg.mode = this.forcefieldTransferState.phase;
      this._ffTargetArg.hasTarget =
        hasTargetSphere && this.forcefieldTransferState.phase !== 'idle';

      const showPlatform =
        this.flightEnabled &&
        !this.forcefieldShieldState.active &&
        this.teleportState.phase === 'idle';

      this.invisibleVfx.update(
        dt,
        focusPos,
        showPlatform,
        this.forcefieldShieldState.active,
        this._ffCloakArg,
        this._ffTargetArg,
        targetProbes,
        (hitId, hitDir, hitPos) => {
          const knock = this._tmpKnock.copy(hitDir).multiplyScalar(7.6);
          knock.y = 2.6;
          if (
            this.applyDamageUnified(
              hitId,
              this.scaleDamage(34),
              hitDir,
              1.4,
              knock,
            )
          ) {
            this.callbacks.onHitTarget?.();
          }
          this.rockBreakVfx.spawnImpact(hitPos, 1.15, '#66D4FF');
          this.fx.triggerCue('forcefield-barrier-hit', hitPos);
          this.callbacks.onForcefieldBarrierHit?.();
        },
      );
    } else {
      this._ffCloakArg.active = false;
      this._ffCloakArg.phase = 'idle';
      this._ffCloakArg.cutLocalY = 2.15;
      this._ffTargetArg.active = false;
      this._ffTargetArg.mode = 'idle';
      this._ffTargetArg.hasTarget = false;
      this.invisibleVfx.update(
        dt,
        focusPos,
        false,
        false,
        this._ffCloakArg,
        this._ffTargetArg,
        targetProbes,
        () => {},
      );
    }

    this.landingDust.update(dt);
    this.rockBreakVfx.update(dt);
    this.shieldHitVfx.update(dt);
    this.spawnPadVfx.update(dt);

    // Grounding Contact Shadow
    const onBorder =
      Math.abs(focusPos.x) > BASEPLATE_HALF_INNER ||
      Math.abs(focusPos.z) > BASEPLATE_HALF_INNER;
    const groundSurfaceY = onBorder ? BASEPLATE_BORDER_HEIGHT : 0;
    const heightAboveGround = this.dead
      ? 0
      : Math.max(0, focusPos.y - groundSurfaceY);
    const shadowScale = this.dead
      ? 1.25
      : Math.max(0.45, 1.0 - heightAboveGround * 0.2);
    const sunSlopeX = SUN_LIGHT_DIR.x / Math.max(SUN_LIGHT_DIR.y, 0.25);
    const sunSlopeZ = SUN_LIGHT_DIR.z / Math.max(SUN_LIGHT_DIR.y, 0.25);
    this.contactShadow.position.set(
      focusPos.x - heightAboveGround * sunSlopeX * 0.35,
      groundSurfaceY + 0.015,
      focusPos.z - heightAboveGround * sunSlopeZ * 0.35,
    );
    this.contactShadow.scale.setScalar(shadowScale);
    const baseShadowOpacity = this.graphicsSettings.shadows === 'off' ? 0.34 : 0.18;
    (this.contactShadow.material as THREE.MeshBasicMaterial).opacity =
      this.teleportState.phase === 'preparing'
        ? 0.08
        : Math.max(0.05, baseShadowOpacity - heightAboveGround * 0.08);

    // Directional Sun Frustum
    this.sunLight.position.set(
      focusPos.x + SUN_LIGHT_DIR.x * 22,
      focusPos.y + SUN_LIGHT_DIR.y * 22,
      focusPos.z + SUN_LIGHT_DIR.z * 22,
    );
    this.sunLight.target.position.set(focusPos.x, focusPos.y, focusPos.z);
    this.sunLight.target.updateMatrixWorld();

    this.skyDome.position.set(focusPos.x, 0, focusPos.z);

    // Step Cinematic FX controller (zoom, trauma shake, 3D ability light, screen FX)
    this.fx.update(dt, focusPos);
    this.abilityLight.position.copy(this.fx.lightPos);
    this.abilityLight.color.copy(this.fx.lightColor);
    this.abilityLight.intensity = this.fx.lightIntensity;
    this.renderer.toneMappingExposure = 1.02 + this.fx.exposureBoost;

    // Camera
    this.smoothCameraDistance = THREE.MathUtils.damp(
      this.smoothCameraDistance,
      this.targetCameraDistance,
      10,
      dt,
    );

    const sinY = Math.sin(this.cameraYaw);
    const cosY = Math.cos(this.cameraYaw);
    this._fwd.set(-sinY, 0, -cosY);
    this._right.set(cosY, 0, -sinY);

    const phoenixDiving = !this.dead && this.phoenixDiveState.phase !== 'idle';
    if (!phoenixDiving && (this.cameraPitch < -0.12 || this.cameraPitch > 0.72)) {
      const clampedPitch = THREE.MathUtils.clamp(this.cameraPitch, -0.12, 0.72);
      this.cameraPitch = THREE.MathUtils.damp(this.cameraPitch, clampedPitch, 10, dt);
    }

    const baseCamDist = this.dead
      ? Math.max(this.smoothCameraDistance, 5.2)
      : phoenixDiving
        ? Math.min(this.smoothCameraDistance * 0.78, 3.85)
        : this.smoothCameraDistance;
    const camDist = THREE.MathUtils.clamp(baseCamDist + this.fx.zoomOffset, 2.0, 10.5);
    const horizDist = camDist * Math.cos(this.cameraPitch);
    const vertOffset = (phoenixDiving ? 1.05 : 1.48) + camDist * Math.sin(this.cameraPitch);
    const shoulderOffsetX = this.dead
      ? 0
      : (phoenixDiving ? 0.88 : 0.62) * THREE.MathUtils.clamp(baseCamDist / 4.65, 0.72, 1.35);

    this._desiredCamPos
      .copy(focusPos)
      .addScaledVector(this._right, shoulderOffsetX)
      .addScaledVector(this._fwd, -horizDist);
    this._desiredCamPos.y = Math.max(groundSurfaceY + 0.65, focusPos.y + vertOffset);

    this._desiredCamLook
      .copy(focusPos)
      .addScaledVector(this._right, shoulderOffsetX + (this.dead ? 0 : 0.12))
      .addScaledVector(this._fwd, this.dead ? 0.2 : phoenixDiving ? 4.8 : 3.6);
    this._desiredCamLook.y = this.dead
      ? focusPos.y + 0.35
      : phoenixDiving
        ? focusPos.y + 1.15 - Math.sin(this.cameraPitch) * 3.8
        : focusPos.y + 1.52 - Math.sin(this.cameraPitch) * 1.1;

    if (!this.camInitialized) {
      this.smoothCamPos.copy(this._desiredCamPos);
      this.smoothCamLook.copy(this._desiredCamLook);
      this.camInitialized = true;
    } else {
      this.smoothCamPos.x = THREE.MathUtils.damp(
        this.smoothCamPos.x,
        this._desiredCamPos.x,
        16,
        dt,
      );
      this.smoothCamPos.z = THREE.MathUtils.damp(
        this.smoothCamPos.z,
        this._desiredCamPos.z,
        16,
        dt,
      );
      this.smoothCamPos.y = THREE.MathUtils.damp(
        this.smoothCamPos.y,
        this._desiredCamPos.y,
        11,
        dt,
      );

      this.smoothCamLook.x = THREE.MathUtils.damp(
        this.smoothCamLook.x,
        this._desiredCamLook.x,
        18,
        dt,
      );
      this.smoothCamLook.z = THREE.MathUtils.damp(
        this.smoothCamLook.z,
        this._desiredCamLook.z,
        18,
        dt,
      );
      this.smoothCamLook.y = THREE.MathUtils.damp(
        this.smoothCamLook.y,
        this._desiredCamLook.y,
        12,
        dt,
      );
    }

    const desiredFov = this.baseFov + this.fx.fovOffset;
    if (Math.abs(desiredFov - this.lastAppliedFov) > 0.01) {
      this.camera.fov = desiredFov;
      this.lastAppliedFov = desiredFov;
      this.camera.updateProjectionMatrix();
    }

    this.camera.position.copy(this.smoothCamPos);
    this.camera.lookAt(this.smoothCamLook);

    if (
      this.fx.shakeLocalOffset.lengthSq() > 0 ||
      Math.abs(this.fx.shakeRollRad) > 0.00001
    ) {
      this._camRightVec.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
      this._camUpVec.set(0, 1, 0).applyQuaternion(this.camera.quaternion);
      this.camera.position
        .addScaledVector(this._camRightVec, this.fx.shakeLocalOffset.x)
        .addScaledVector(this._camUpVec, this.fx.shakeLocalOffset.y);
      this.camera.rotateZ(this.fx.shakeRollRad);
    }

    if (this.fx.screenFx.active || this.lastScreenFxSentActive) {
      this.callbacks.onScreenFxUpdate?.(this.fx.screenFx);
      this.lastScreenFxSentActive = this.fx.screenFx.active;
    }

    this.skyAtmosphere.update(dt, focusPos, this.camera);
    if (this.windTrails.lines.visible) {
      this.windTrails.update(dt, focusPos, this.camera);
    }

    this.renderer.render(this.scene, this.camera);

    // Update Bandits, Prisoners & Playable AI Enemies + push projected HUD snapshot & combat telemetry
    const vw = this.viewportWidth;
    const vh = this.viewportHeight;
    const ndc = this.getReticleNdc();
    const isInvisStealthed =
      this.archetype === 'invisible-woman' &&
      (this.invisibilityState.active || this.invisibilityState.phase === 'vanishing');
    const playerTargetable =
      !this.dead &&
      !this.isPhoenixReviving() &&
      this.phoenixDiveState.phase === 'idle' &&
      this.astralState.phase === 'idle' &&
      this.mindControlState.phase !== 'choosing' &&
      this.mindControlState.phase !== 'mental-damage' &&
      !this.astralExtractionState.active &&
      !isInvisStealthed &&
      this.teleportState.phase === 'idle';
    const astralBodyPos =
      !this.dead &&
      this.archetype === 'emma-frost' &&
      this.astralState.phase === 'projecting'
        ? this.astralState.bodyPos
        : null;

    const npcSnapshots = this.npcs.update(
      dt,
      this.camera,
      this.physics.position,
      ndc.x,
      ndc.y,
      vw,
      vh,
      this.callbacks.onBurnTick,
      (events) => this.handleEnemyEliminations(events),
      playerTargetable,
      (dmg, kind, hitDir, attackerId) => {
        const dealt = this.damagePlayer(dmg, attackerId, hitDir, kind);
        if (dealt > 0 || (this.shieldState.active && !this.diamondState.active)) {
          this.callbacks.onNpcStrikePlayer?.(kind === 'punch' ? 'punch' : 'weapon');
        }
      },
      astralBodyPos,
      (dmg, attackerId) => this.handleAstralBodyHit(dmg, 'weapon', attackerId),
    );

    const aiSnapshots = this.aiEnemies.update(
      dt,
      this.camera,
      this.physics.position,
      ndc.x,
      ndc.y,
      vw,
      vh,
      this.callbacks.onBurnTick,
      (events) => this.handleEnemyEliminations(events),
      playerTargetable,
      (dmg, kind, hitDir, attackerId, knockbackForce, isBeam) => {
        if (knockbackForce && knockbackForce > 0 && !this.isKnockbackImmune()) {
          this.physics.velocity.x += hitDir.x * knockbackForce;
          this.physics.velocity.z += hitDir.z * knockbackForce;
          this.statusParalyzeTimer = Math.max(this.statusParalyzeTimer, 0.45);
        }
        const dealt = this.damagePlayer(dmg, attackerId, hitDir, kind, Boolean(isBeam));
        if (
          dealt > 0 ||
          ((this.shieldState.active || this.agathaAutoShieldState.active) &&
            !this.diamondState.active)
        ) {
          this.callbacks.onNpcStrikePlayer?.('weapon');
        }
      },
      astralBodyPos,
      (dmg, attackerId) => this.handleAstralBodyHit(dmg, 'ai-ability', attackerId),
      (pos, force, colorHex) => this.rockBreakVfx.spawnImpact(pos, force, colorHex),
    );

    if (this.callbacks.onNpcHudUpdate) {
      const mergedHud = this.unifiedNpcHud;
      mergedHud.length = 0;
      for (let i = 0; i < npcSnapshots.length; i++) {
        mergedHud.push(npcSnapshots[i]);
      }
      for (let i = 0; i < aiSnapshots.length; i++) {
        mergedHud.push(aiSnapshots[i]);
      }
      this.callbacks.onNpcHudUpdate(mergedHud);
    }

    // Project Player Combat Telemetry (head kill streak, vertical shield bar, "Protected" tags, bottom-left status effects)
    if (this.callbacks.onPlayerTelemetryUpdate) {
      this._projVec.set(focusPos.x, focusPos.y + 2.25, focusPos.z).project(this.camera);
      const headInFront =
        !this.dead &&
        this._projVec.z >= -1 &&
        this._projVec.z <= 1 &&
        Math.abs(this._projVec.x) <= 1.08 &&
        Math.abs(this._projVec.y) <= 1.08;
      const headScreenX = (this._projVec.x * 0.5 + 0.5) * vw;
      const headScreenY = (-this._projVec.y * 0.5 + 0.5) * vh;

      let activeShieldKind: ShieldKind | null = null;
      let shieldHp = 0;
      let shieldMaxHp = 100;
      if (!this.dead) {
        if (this.diamondState.active && this.diamondState.absorbRemaining > 0) {
          activeShieldKind = 'diamond-form';
          shieldHp = this.diamondState.absorbRemaining;
          shieldMaxHp = SHIELD_MAX_DURABILITY['diamond-form'];
        } else if (
          this.strangeShieldState.active &&
          this.strangeShieldState.absorbRemaining > 0
        ) {
          activeShieldKind = 'mystic-shield';
          shieldHp = this.strangeShieldState.absorbRemaining;
          shieldMaxHp = SHIELD_MAX_DURABILITY['mystic-shield'];
        } else if (this.shieldState.active && this.shieldState.absorbRemaining > 0) {
          activeShieldKind = 'auto-shield';
          shieldHp = this.shieldState.absorbRemaining;
          shieldMaxHp = SHIELD_MAX_DURABILITY['auto-shield'];
        } else if (
          this.agathaAutoShieldState.active &&
          this.agathaAutoShieldState.absorbRemaining > 0
        ) {
          activeShieldKind = 'agatha-auto-shield';
          shieldHp = this.agathaAutoShieldState.absorbRemaining;
          shieldMaxHp = SHIELD_MAX_DURABILITY['agatha-auto-shield'];
        } else if (
          this.forcefieldShieldState.active &&
          this.forcefieldShieldState.absorbRemaining > 0
        ) {
          activeShieldKind = 'forcefield-shield';
          shieldHp = this.forcefieldShieldState.absorbRemaining;
          shieldMaxHp = this.forcefieldShieldState.maxDurability;
        }
      }

      let shieldBarVisible = false;
      let shieldScreenX = 0;
      let shieldScreenY = 0;
      if (activeShieldKind) {
        this._shieldWorld
          .copy(focusPos)
          .addScaledVector(this._right, 0.88);
        this._shieldWorld.y += 1.15;
        this._projVec.copy(this._shieldWorld).project(this.camera);
        if (
          this._projVec.z >= -1 &&
          this._projVec.z <= 1 &&
          Math.abs(this._projVec.x) <= 1.1 &&
          Math.abs(this._projVec.y) <= 1.1
        ) {
          shieldBarVisible = true;
          shieldScreenX = (this._projVec.x * 0.5 + 0.5) * vw;
          shieldScreenY = (-this._projVec.y * 0.5 + 0.5) * vh;
        }
      }

      const projectedTags = this.protectedTagsScratch;
      projectedTags.length = 0;
      const rawTags = this.shieldHitVfx.protectedTags;
      let tagPoolIdx = 0;
      for (let i = 0; i < rawTags.length; i++) {
        const t = rawTags[i];
        this._projVec.copy(t.worldPos).project(this.camera);
        if (this._projVec.z >= -1 && this._projVec.z <= 1) {
          let entry = this.protectedTagPool[tagPoolIdx];
          if (!entry) {
            entry = { active: true, screenX: 0, screenY: 0, progress: 0, color: '' };
            this.protectedTagPool[tagPoolIdx] = entry;
          }
          tagPoolIdx++;
          entry.active = true;
          entry.screenX = (this._projVec.x * 0.5 + 0.5) * vw;
          entry.screenY = (-this._projVec.y * 0.5 + 0.5) * vh;
          entry.progress = Math.min(1, t.elapsed / t.duration);
          entry.color = t.color;
          projectedTags.push(entry);
        }
      }

      const statusEffects = this.statusEffectsScratch;
      statusEffects.length = 0;
      if (!this.dead) {
        if (activeShieldKind) {
          const rem =
            activeShieldKind === 'auto-shield'
              ? Math.max(0, AUTO_SHIELD_DURATION_MS / 1000 - this.shieldState.elapsed)
              : activeShieldKind === 'agatha-auto-shield'
                ? Math.max(
                    0,
                    AUTO_SHIELD_DURATION_MS / 1000 - this.agathaAutoShieldState.elapsed,
                  )
                : activeShieldKind === 'diamond-form'
                  ? Math.max(0, EMMA_DIAMOND_DURATION_MS / 1000 - this.diamondState.elapsed)
                  : activeShieldKind === 'forcefield-shield'
                    ? Math.max(
                        0,
                        FORCEFIELD_SHIELD_DURATION_MS / 1000 -
                          this.forcefieldShieldState.elapsed,
                      )
                    : Math.max(
                        0,
                        STRANGE_SHIELD_MAX_DURATION_MS / 1000 -
                          this.strangeShieldState.elapsed,
                      );
          const tot =
            activeShieldKind === 'auto-shield' || activeShieldKind === 'agatha-auto-shield'
              ? AUTO_SHIELD_DURATION_MS / 1000
              : activeShieldKind === 'diamond-form'
                ? EMMA_DIAMOND_DURATION_MS / 1000
                : activeShieldKind === 'forcefield-shield'
                  ? FORCEFIELD_SHIELD_DURATION_MS / 1000
                  : STRANGE_SHIELD_MAX_DURATION_MS / 1000;
          const s0 = this.statusEffectPool[0];
          s0.id = 'shield';
          s0.label =
            activeShieldKind === 'forcefield-shield' ? 'Forcefield Shield' : 'Shield Active';
          s0.description = `Absorbs ${Math.ceil(shieldHp)} incoming damage.`;
          s0.remainingSec = rem;
          s0.totalSec = tot;
          statusEffects.push(s0);
        } else if (this.agathaShieldState.active) {
          const tot = AGATHA_SHIELD_DURATION_MS / 1000;
          const s0 = this.statusEffectPool[0];
          s0.id = 'shield';
          s0.label = 'Absorption Shield';
          s0.description = 'Absorbs hits to counter-drain attackers.';
          s0.remainingSec = Math.max(0, tot - this.agathaShieldState.elapsed);
          s0.totalSec = tot;
          statusEffects.push(s0);
        } else if (this.magnetoShieldState.active) {
          const s0 = this.statusEffectPool[0];
          s0.id = 'shield';
          s0.label = 'Magnetic Barrier';
          s0.description = 'Deflects incoming damage while active.';
          s0.remainingSec = Infinity;
          s0.totalSec = 1;
          statusEffects.push(s0);
        }

        if (this.statusHealTimer > 0) {
          const s1 = this.statusEffectPool[1];
          s1.id = 'health-recovery';
          s1.label = 'Health Recovery';
          s1.description = 'Restoring health from combat recovery.';
          s1.remainingSec = this.statusHealTimer;
          s1.totalSec = 1.8;
          statusEffects.push(s1);
        }
        if (this.statusDotTimer > 0) {
          const s2 = this.statusEffectPool[2];
          s2.id = 'dot';
          s2.label = 'Damage Over Time';
          s2.description = 'Taking lingering elemental energy damage.';
          s2.remainingSec = this.statusDotTimer;
          s2.totalSec = 1.5;
          statusEffects.push(s2);
        }
        if (this.statusParalyzeTimer > 0) {
          const s3 = this.statusEffectPool[3];
          s3.id = 'paralyzed';
          s3.label = 'Staggered';
          s3.description = 'Movement briefly disrupted by heavy impact.';
          s3.remainingSec = this.statusParalyzeTimer;
          s3.totalSec = 0.6;
          statusEffects.push(s3);
        }
        if (this.statusNoPowersTimer > 0) {
          const s4 = this.statusEffectPool[4];
          s4.id = 'no-powers';
          s4.label = 'Powers Sealed';
          s4.description = 'Abilities temporarily suppressed.';
          s4.remainingSec = this.statusNoPowersTimer;
          s4.totalSec = 2.0;
          statusEffects.push(s4);
        }
      }

      const tel = this.telemetryScratch;
      tel.playerHeadVisible = headInFront && !isInvisStealthed;
      tel.playerHeadX = headScreenX;
      tel.playerHeadY = headScreenY;
      tel.killStreak = this.killStreakCount;
      tel.playerShield.active = shieldBarVisible && Boolean(activeShieldKind);
      tel.playerShield.hp = shieldHp;
      tel.playerShield.maxHp = shieldMaxHp;
      tel.playerShield.screenX = shieldScreenX;
      tel.playerShield.screenY = shieldScreenY;
      tel.playerShield.color = activeShieldKind
        ? SHIELD_COLORS[activeShieldKind].main
        : '#FF2956';
      this.callbacks.onPlayerTelemetryUpdate(tel);
    }

    this.scheduleNextTick();
  }

  public dispose(): void {
    this.disposed = true;
    this.fx.resetAll(true);
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResizeBound);
    window.removeEventListener('orientationchange', this.handleResizeBound);
    document.removeEventListener('fullscreenchange', this.handleResizeBound);
    this.resizeObserver?.disconnect();
    window.removeEventListener('keydown', this.handleKeyDownBound);
    window.removeEventListener('keyup', this.handleKeyUpBound);
    this.renderer.domElement.removeEventListener(
      'webglcontextlost',
      this.handleContextLostBound,
    );
    this.renderer.domElement.removeEventListener(
      'webglcontextrestored',
      this.handleContextRestoredBound,
    );

    this.leftHandAura?.dispose();
    this.rightHandAura?.dispose();
    this.leftAgathaAura?.dispose();
    this.rightAgathaAura?.dispose();
    this.leftFireAura?.dispose();
    this.rightFireAura?.dispose();
    this.phoenixWings?.dispose();
    this.disposeAstralBodyDecoy();
    this.rig.dispose();
    this.vfx.dispose();
    this.chaosDrainBeamVfx.dispose();
    this.stoneExplosionVfx.dispose();
    this.agathaVfx.dispose();
    this.darkholdBook.dispose();
    this.scarletShield.dispose();
    this.agathaDarkholdBook.dispose();
    this.agathaDarkholdShield.dispose();
    this.phoenixVfx.dispose();
    this.emmaVfx.dispose();
    this.emmaIdleRings.dispose();
    this.helaVfx.dispose();
    this.magnetoVfx.dispose();
    this.quicksilverVfx.dispose();
    this.strangeVfx.dispose();
    this.visionVfx.dispose();
    this.invisibleVfx.dispose();
    this.landingDust.dispose();
    this.npcs.dispose();
    this.aiEnemies.dispose();
    this.rockBreakVfx.dispose();
    this.shieldHitVfx.dispose();
    this.spawnPadVfx.dispose();
    this.skyAtmosphere.dispose();
    this.windTrails.dispose();
    this.disposableGeometries.forEach((g) => g.dispose());
    this.disposableMaterials.forEach((m) => m.dispose());
    this.disposableTextures.forEach((t) => t.dispose());
    this.envRT.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
