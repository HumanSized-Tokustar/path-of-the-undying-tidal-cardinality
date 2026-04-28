import { audio } from "./audio";
import { WEAPONS, WeaponId, STARTING_OWNED, STARTING_RANGED, STARTING_MELEE, STARTING_MISC_A, STARTING_MISC_B } from "./weapons";
import { PLATFORM_VARIANTS, PlatformKind, pickPlatformKind } from "./platforms";

// ============================================================
// PATH OF THE UNDYING TIDAL CARDINALITY — Wave 4 Engine
// 6/1/2 weapon classes, parry+grab, day/night, smarter AI,
// jump-through platforms, humanoid sprites, difficulty.
// ============================================================

export type Phase = "menu" | "playing" | "paused" | "inventory" | "dead";
export type Difficulty = "dunce" | "alright" | "son";

const W = 960;
const H = 540;
const GROUND_Y = 460;
const PX_PER_METER = 32;
const DAY_NIGHT_PERIOD = 60; // seconds for full cycle

const COLOR = {
  ground: "#3b2a1a",
  groundTop: "#5a8a3a",
  player: "#4ec866",          // green tunic
  playerOut: "#1f4a26",       // dark green outline
  playerBuckle: "#ffd84a",    // yellow belt buckle
  playerPants: "#1a3a22",     // dark green pants
  bullet: "#fff199",
  bulletEnemy: "#ff6a6a",
  hpBar: "#e84545",
  shieldBar: "#4ac6ff",
  odBar: "#c87bff",
  text: "#fff7d6",
  shadow: "#0a0e1f",
  coin: "#ffd84a",
  token: "#7be0ff",
  crystal: "#d97bff",
};
const COLOR_PLAYER_HI = "#7ce896";   // tunic highlight
const COLOR_PLAYER_LO = "#2a7a3a";   // tunic mid-shadow

type EnemyType =
  | "shooter" | "shooterElite"
  | "shanker" | "shankerSwift"
  | "brute"   | "bruteHeavy"
  | "rider"   | "bomber" | "sniper";

const ENEMY_COLOR: Record<EnemyType, string> = {
  shooter:      "#e85d3a",
  shooterElite: "#ff8c42",
  shanker:      "#a83af0",
  shankerSwift: "#d24aff",
  brute:        "#8a4a2a",
  bruteHeavy:   "#5a2a18",
  rider:        "#3aa0e8",
  bomber:       "#888fa8",
  sniper:       "#ff3a6a",
};

interface Input {
  left: boolean; right: boolean; up: boolean; down: boolean;
  jump: boolean; jumpPressed: boolean;
  dash: boolean; dashPressed: boolean;
  fireR: boolean; fireRPressed: boolean;
  miscA: boolean; miscAPressed: boolean; miscAReleased: boolean;
  miscB: boolean; miscBPressed: boolean; miscBReleased: boolean;
  melee: boolean; meleePressed: boolean;
  shield: boolean; shieldPressed: boolean;
  overdrivePressed: boolean;       // G
  parryPressed: boolean;           // E
  grabPressed: boolean;            // F
  grab: boolean;                   // held for charged throw
  grabReleased: boolean;
  inventoryPressed: boolean;       // Y
  pausePressed: boolean;           // P
  slotPressed: boolean[]; // 1..6
  wheelDelta: number;
}

interface Bullet {
  x: number; y: number; vx: number; vy: number;
  dmg: number; life: number; friendly: boolean; r: number; pierce: number;
  color: string;
  kind?: "normal" | "molotov";
}
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; gravity?: number; }
interface Pickup { x: number; y: number; vy: number; type: "coin" | "token" | "crystal"; value: number; life: number; }

interface Platform {
  x: number; y: number; w: number; h: number;
  kind: PlatformKind;
  cracked: boolean; crumbleTimer: number; falling: boolean; fallVy: number;
  baseX: number; baseY: number; phase: number; horizontal: boolean;
  conveyorDir: 1 | -1;
  cloudFade: number;     // 0 invisible..1 full
  cloudActive: boolean;  // currently usable
  cloudRespawn: number;
}

interface Enemy {
  type: EnemyType;
  x: number; y: number; vx: number; vy: number;
  w: number; h: number; hp: number; maxHp: number;
  onGround: boolean; facing: 1 | -1;
  fireCd: number; aiTimer: number; targetDx: number;
  hurtFlash: number;
  burstLeft: number; burstCd: number;
  chargeTime: number; charging: boolean;
  flying: boolean; baseY: number;
  jumpCd: number;
  disabled: number;       // grabbed
  grabbed: boolean;
  thrown: boolean; throwVx: number; throwVy: number;
  legPhase: number;
  glintTimer: number;     // death glint
  dying: boolean;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randi = (a: number, b: number) => Math.floor(rand(a, b + 1));
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export interface InventoryState {
  owned: WeaponId[];
  // 6/1/2 class layout
  ranged: WeaponId[];     // length 6
  melee: WeaponId;
  miscA: WeaponId;
  miscB: WeaponId;
  activeRanged: number;   // 0..5
  consumables: { medkit: number; ammoPack: number };
  augments: string[];
  // Back-compat for legacy InventoryOverlay (treated as the old hotbar)
  loadout: [WeaponId, WeaponId, WeaponId];
  active: 0 | 1 | 2;
}

export interface GameStats {
  hp: number; maxHp: number;
  ammo: number; grenades: number; miscAmmo: number;
  lives: number;
  coins: number; tokens: number; crystals: number;
  distance: number;
  totalDamage: number;
  comboCount: number;
  damageRecent: number;
  shieldActive: boolean; shieldCd: number;
  overdriveBar: number; overdriveActive: boolean; overdriveTime: number;
  dashCharges: number; dashCdNext: number;
  kills: number; bossKills: number;
  timeAlive: number;
  rank: string; rankColor: string;
  trackName: string;
  warning: string | null;
  description: string;
  inventory: InventoryState;
  phase: Phase;
  difficulty: Difficulty;
  weather: string;
  cycleProgress: number;   // 0..1 day/night
  parryWindow: number;     // 0 if none
  miscCharge: number;      // 0..1 charging throw
  grabbedHas: boolean;
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  phase: Phase = "menu";
  onStatsChange: (s: GameStats) => void;
  onPhaseChange: (p: Phase) => void;
  difficulty: Difficulty = "alright";

  private input: Input = this.makeInput();
  private keys = new Set<string>();

  private px = 200; private py = 0; private pvx = 0; private pvy = 0;
  private pw = 28; private ph = 40;
  private pOnGround = false;
  private pJumps = 0; private maxJumps = 2;
  private pFacing: 1 | -1 = 1;
  private pHp = 123; private pMaxHp = 123;
  private lives = 3;
  private maxLives = 3;
  private slowFall = 0; // antigrav: seconds remaining of slow-fall buff
  private pInv = 0;
  private dashCharges = 2; private dashRecharge = 0; private dashTime = 0;
  private dashTrail: { x:number; y:number; life:number }[] = [];
  private rolling = false; private rollTime = 0;
  private rollCharges = 2; private rollRecharge = 0;
  private slamming = false;
  private dropThrough = 0; // disable jump-through landings briefly
  private shieldActive = false; private shieldTime = 0; private shieldCd = 0;
  private odBar = 0; private odActive = false; private odTime = 0;
  private fireCdR = 0; private fireCdM = 0; private fireCdMiscA = 0; private fireCdMiscB = 0;
  private currentPlatform: Platform | null = null;

  // Misc charged-throw
  private miscACharge = 0;        // seconds held
  private miscBCharge = 0;

  // Parry
  private parryWindow = 0;        // remaining seconds window is open
  private parryFlash = 0;

  // Grab/throw
  private grabbed: Enemy | null = null;

  private paceMult = 1;

  private inventory: InventoryState = this.makeInventory();

  private camX = 0;
  private worldX = 0;
  private platforms: Platform[] = [];
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private pickups: Pickup[] = [];
  private comboTimer = 0; private comboCount = 0;
  private dmgRecentTimer = 0; private dmgRecent = 0;
  private totalDmg = 0;
  private kills = 0; private bossKills = 0;
  private coins = 100; private tokens = 1; private crystals = 0;
  private ammo = 240; private miscAmmo = 5;
  private timeAlive = 0;
  private spawnTimer = 0;
  private enemiesSpawned = 0;
  private warning: string | null = null;
  private warnTimer = 0;
  private description = "WASD MOVE • SPACE/W JUMP×2 (S+SPACE drop, W on ladder = climb) • Q DASH • Z ROLL • F FIRE • R MELEE • O/P THROW MISC • E PARRY • V GRAB (HOLD) • X SHIELD • G OVERDRIVE • 1-6 SLOTS • TAB INV • ESC PAUSE";
  private spawnTier = 0;        // grows by 1 per 111m for the tide system
  private spawnAllowance = 5;   // current allowed total spawned enemies (cap 100)
  private tideMessageCount = 0; // every 5th tier triggers "THE TIDE IS RISING"
  private tideMsgTimer = 0;     // overlay timer for the tide banner
  private tideMsgText = "";
  private grabCharge = 0;       // seconds F is held to charge a throw (0..1.5)
  private descTimer = 0;
  private screenShake = 0;
  private weatherTime = 0;
  private animTime = 0;
  private meleeSwing = 0;

  private weather: "clear" | "rain" | "snow" | "storm" | "fog" | "windy" = "clear";
  private weatherSwitch = 8;
  private rainDrops: { x:number; y:number; vy:number }[] = [];
  private lightningFlash = 0;
  private nextLightning = 6;

  private cycleTime = 0; // 0..DAY_NIGHT_PERIOD

  private puDamage = 0; private puSpeed = 0; private puInvincible = 0; private puChrono = 0;
  private worldPickups: { x:number; y:number; type: "coin"|"token"|"crystal"|"pu_dmg"|"pu_spd"|"pu_inv"|"pu_chr"; value:number }[] = [];
  private worldPickupNextX = 600;
  private landmarks: { x:number; kind:"main"|"ally"|"shady"; w:number }[] = [];
  private inSafeZone = false;
  private odPrevMaxHp = 123;

  private last = 0; private rafId = 0;

  constructor(canvas: HTMLCanvasElement, opts: {
    onStatsChange: (s: GameStats) => void;
    onPhaseChange: (p: Phase) => void;
  }) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;
    this.onStatsChange = opts.onStatsChange;
    this.onPhaseChange = opts.onPhaseChange;
    this.attachInput();
  }

  private makeInput(): Input {
    return {
      left: false, right: false, up: false, down: false,
      jump: false, jumpPressed: false,
      dash: false, dashPressed: false,
      fireR: false, fireRPressed: false,
      miscA: false, miscAPressed: false, miscAReleased: false,
      miscB: false, miscBPressed: false, miscBReleased: false,
      melee: false, meleePressed: false,
      shield: false, shieldPressed: false,
      overdrivePressed: false,
      parryPressed: false, grabPressed: false,
      grab: false, grabReleased: false,
      inventoryPressed: false, pausePressed: false,
      slotPressed: [false,false,false,false,false,false],
      wheelDelta: 0,
    };
  }

  private makeInventory(): InventoryState {
    const ranged = [...STARTING_RANGED];
    return {
      owned: [...STARTING_OWNED],
      ranged,
      melee: STARTING_MELEE,
      miscA: STARTING_MISC_A,
      miscB: STARTING_MISC_B,
      activeRanged: 0,
      consumables: { medkit: 2, ammoPack: 3 },
      augments: [],
      // back-compat fields (mirror first 3 ranged so legacy HUD doesn't break)
      loadout: [ranged[0], ranged[1], ranged[2]] as [WeaponId, WeaponId, WeaponId],
      active: 0,
    };
  }

  setDifficulty(d: Difficulty) {
    // Locked once a run is in progress
    if (this.phase === "playing" || this.phase === "paused" || this.phase === "inventory") return;
    this.difficulty = d;
    this.emitStats();
  }

  // Multipliers (enemy stats)
  // DUNCE: weaker, slower, dumber. SON: smarter, faster, 2× damage.
  private diffEnemyHp()    { return this.difficulty === "dunce" ? 0.5 : this.difficulty === "son" ? 1.6 : 1; }
  private diffEnemyDmg()   { return this.difficulty === "dunce" ? 0.4 : this.difficulty === "son" ? 2.0 : 1; }
  private diffEnemyFire()  { return this.difficulty === "dunce" ? 1.7 : this.difficulty === "son" ? 0.55 : 1; }
  private diffEnemySpeed() { return this.difficulty === "dunce" ? 0.55: this.difficulty === "son" ? 1.15 : 1; }
  private diffSmart()      { return this.difficulty === "son" ? 1 : 0; } // 0..1 smartness boost
  // Player starter stat multiplier (DUNCE = 2× starter HP/ammo/grenades)
  private diffPlayerMult() { return this.difficulty === "dunce" ? 2 : 1; }

  private attachInput() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("wheel", this.onWheel, { passive: true });
  }
  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("wheel", this.onWheel);
    cancelAnimationFrame(this.rafId);
  }
  private onWheel = (e: WheelEvent) => {
    if (this.phase !== "playing") return;
    this.input.wheelDelta += e.deltaY;
  };
  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (["w","a","s","d"," ","f","r","q","e","c","v","x","g","tab","p","shift","1","2","3","4","5","6"].includes(k)) e.preventDefault();
    if (this.keys.has(k)) return;
    this.keys.add(k);
    switch (k) {
      case "a": this.input.left = true; break;
      case "d": this.input.right = true; break;
      case "w": {
        // W = climb up if on ladder, otherwise jump (mirrors SPACE)
        this.input.up = true;
        const onLadder = !!this.findOverlappingLadder();
        if (!onLadder) { this.input.jump = true; this.input.jumpPressed = true; }
        break;
      }
      case "s": this.input.down = true; break;
      case " ": this.input.jump = true; this.input.jumpPressed = true; break;
      case "q": this.input.dash = true; this.input.dashPressed = true; break;       // DASH
      case "z": (this as any).rollPressed = true; break;                              // ROLL
      case "f": this.input.fireR = true; this.input.fireRPressed = true; break;
      case "o": this.input.miscA = true; this.input.miscAPressed = true; break;     // MISC A
      case "p": this.input.miscB = true; this.input.miscBPressed = true; break;     // MISC B
      case "r": this.input.melee = true; this.input.meleePressed = true; break;
      case "x": this.input.shield = true; this.input.shieldPressed = true; break;
      case "g": this.input.overdrivePressed = true; break;
      case "e": this.input.parryPressed = true; break;                                // PARRY
      case "v": this.input.grab = true; this.input.grabPressed = true; break;
      case "tab": this.input.inventoryPressed = true; break;
      case "escape": this.input.pausePressed = true; break;                           // PAUSE
      case "1": case "2": case "3": case "4": case "5": case "6":
        this.input.slotPressed[parseInt(k) - 1] = true; break;
    }
  };
  private onKeyUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    this.keys.delete(k);
    switch (k) {
      case "a": this.input.left = false; break;
      case "d": this.input.right = false; break;
      case "w": this.input.up = false; break;
      case "s": this.input.down = false; break;
      case " ": this.input.jump = false; break;
      case "shift": this.input.dash = false; break;
      case "f": this.input.fireR = false; break;
      case "q": this.input.miscA = false; this.input.miscAReleased = true; break;
      case "e": this.input.miscB = false; this.input.miscBReleased = true; break;
      case "r": this.input.melee = false; break;
      case "x": this.input.shield = false; break;
      case "v": this.input.grab = false; this.input.grabReleased = true; break;
    }
  };

  start() {
    this.reset();
    this.phase = "playing";
    this.onPhaseChange(this.phase);
    audio.startMusic();
    this.last = performance.now();
    if (!this.rafId) this.rafId = requestAnimationFrame(this.frame);
  }
  reset() {
    this.px = 200; this.py = GROUND_Y - this.ph; this.pvx = 0; this.pvy = 0;
    // DUNCE: double player starter stats
    const pm = this.diffPlayerMult();
    this.pMaxHp = 123 * pm;
    this.pHp = this.pMaxHp; this.pInv = 0; this.pFacing = 1;
    this.lives = this.maxLives;
    this.slowFall = 0;
    this.dashCharges = 2; this.dashRecharge = 0; this.dashTime = 0; this.dashTrail = [];
    this.shieldActive = false; this.shieldTime = 0; this.shieldCd = 0;
    this.odBar = 0; this.odActive = false; this.odTime = 0;
    this.camX = 0; this.worldX = 0;
    this.platforms = []; this.enemies = []; this.bullets = []; this.particles = []; this.pickups = [];
    this.comboTimer = 0; this.comboCount = 0;
    this.dmgRecentTimer = 0; this.dmgRecent = 0;
    this.totalDmg = 0; this.kills = 0; this.bossKills = 0;
    this.coins = 100 * pm; this.tokens = 1; this.crystals = 0;
    this.ammo = 240 * pm; this.miscAmmo = 10 * pm; // 5 per equipped misc slot × 2 slots
    this.timeAlive = 0; this.spawnTimer = 3.5;
    this.enemiesSpawned = 0;
    this.spawnTier = 0; this.spawnAllowance = 5;
    this.tideMessageCount = 0; this.tideMsgTimer = 0; this.tideMsgText = "";
    this.grabCharge = 0;
    this.warning = null; this.warnTimer = 0; this.screenShake = 0;
    this.paceMult = 1;
    this.animTime = 0; this.meleeSwing = 0;
    this.weather = "clear"; this.weatherSwitch = 8; this.rainDrops = []; this.lightningFlash = 0; this.nextLightning = 6;
    this.puDamage = 0; this.puSpeed = 0; this.puInvincible = 0; this.puChrono = 0;
    this.worldPickups = []; this.worldPickupNextX = 600;
    this.landmarks = []; this.inSafeZone = false; this.odPrevMaxHp = this.pMaxHp;
    this.miscACharge = 0; this.miscBCharge = 0;
    this.parryWindow = 0; this.parryFlash = 0; this.grabbed = null;
    this.cycleTime = 0;
    this.inventory = this.makeInventory();
    for (let i = 0; i < 12; i++) this.spawnPlatformAt(this.px + 220 + i * 240);
  }
  goToMenu() {
    this.phase = "menu";
    this.onPhaseChange(this.phase);
    audio.stopMusic();
  }
  togglePause() {
    if (this.phase === "playing") { this.phase = "paused"; this.onPhaseChange(this.phase); }
    else if (this.phase === "paused") { this.phase = "playing"; this.onPhaseChange(this.phase); this.last = performance.now(); }
  }
  toggleInventory() {
    if (this.phase === "playing") { this.phase = "inventory"; this.onPhaseChange(this.phase); }
    else if (this.phase === "inventory") { this.phase = "playing"; this.onPhaseChange(this.phase); this.last = performance.now(); }
  }
  resume() {
    if (this.phase === "paused" || this.phase === "inventory") {
      this.phase = "playing";
      this.onPhaseChange(this.phase);
      this.last = performance.now();
    }
  }

  // Equip APIs (class-aware)
  equipRangedSlot(weaponId: WeaponId, slot: number) {
    if (slot < 0 || slot > 5) return;
    if (!this.inventory.owned.includes(weaponId)) return;
    if (WEAPONS[weaponId].class !== "ranged") return;
    this.inventory.ranged[slot] = weaponId;
    this.syncLegacyLoadout();
    this.emitStats();
  }
  equipMelee(weaponId: WeaponId) {
    if (!this.inventory.owned.includes(weaponId)) return;
    if (WEAPONS[weaponId].class !== "melee") return;
    this.inventory.melee = weaponId;
    this.emitStats();
  }
  equipMisc(weaponId: WeaponId, slot: "A" | "B") {
    if (!this.inventory.owned.includes(weaponId)) return;
    if (WEAPONS[weaponId].class !== "misc") return;
    if (slot === "A") this.inventory.miscA = weaponId; else this.inventory.miscB = weaponId;
    this.emitStats();
  }
  // Legacy (used by old InventoryOverlay) — routes to ranged
  equipToSlot(weaponId: WeaponId, slot: 0 | 1 | 2) {
    if (WEAPONS[weaponId].class === "ranged") this.equipRangedSlot(weaponId, slot);
    else if (WEAPONS[weaponId].class === "melee") this.equipMelee(weaponId);
    else if (WEAPONS[weaponId].class === "misc") this.equipMisc(weaponId, slot === 0 ? "A" : "B");
  }
  setActiveSlot(slot: number) {
    if (slot < 0 || slot > 5) return;
    this.inventory.activeRanged = slot;
    this.syncLegacyLoadout();
    this.emitStats();
  }
  private syncLegacyLoadout() {
    const r = this.inventory.ranged;
    this.inventory.loadout = [r[0], r[1], r[2]] as [WeaponId, WeaponId, WeaponId];
    this.inventory.active = (Math.min(2, this.inventory.activeRanged) as 0|1|2);
  }
  useMedkit() {
    if (this.inventory.consumables.medkit > 0 && this.pHp < this.pMaxHp) {
      this.inventory.consumables.medkit--;
      this.pHp = Math.min(this.pMaxHp, this.pHp + 60);
      this.flashDescription("MEDKIT — +60 HP");
      this.emitStats();
    }
  }
  useAmmoPack() {
    if (this.inventory.consumables.ammoPack > 0) {
      this.inventory.consumables.ammoPack--;
      this.ammo += 100;
      this.flashDescription("AMMO PACK — +100 AMMO");
      this.emitStats();
    }
  }
  // Shop hook (sound)
  purchaseSound() { audio.play("applepay"); }

  private frame = (t: number) => {
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    if (this.input.pausePressed) { this.input.pausePressed = false; this.togglePause(); }
    if (this.input.inventoryPressed) { this.input.inventoryPressed = false; this.toggleInventory(); }
    if (this.phase === "playing") this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    this.timeAlive += dt;
    this.weatherTime += dt;
    this.cycleTime = (this.cycleTime + dt) % DAY_NIGHT_PERIOD;

    // Slot select 1..6
    for (let i = 0; i < 6; i++) {
      if (this.input.slotPressed[i]) {
        this.inventory.activeRanged = i;
        this.syncLegacyLoadout();
        this.flashDescription(`EQUIPPED ${WEAPONS[this.inventory.ranged[i]].name} [${i+1}]`);
      }
      this.input.slotPressed[i] = false;
    }
    if (Math.abs(this.input.wheelDelta) > 30) {
      const dir = this.input.wheelDelta > 0 ? 1 : -1;
      this.inventory.activeRanged = (this.inventory.activeRanged + dir + 6) % 6;
      this.syncLegacyLoadout();
      this.flashDescription(`EQUIPPED ${WEAPONS[this.inventory.ranged[this.inventory.activeRanged]].name}`);
      this.input.wheelDelta = 0;
    }
    this.input.wheelDelta *= 0.5;

    // Pacing — distance-based ONLY: base 15 m/s, +10 every 300m, cap 105
    const meters = this.worldX / PX_PER_METER;
    const stepIncrements = Math.floor(meters / 300);
    const baseMs = Math.min(105, 15 + stepIncrements * 10);
    this.paceMult = baseMs / 15;

    // Movement: convert m/s to px/s
    let speed = baseMs * (PX_PER_METER / 3);
    if (this.rolling) speed *= 1.6;
    if (this.odActive) speed *= 1.25;
    if (this.puSpeed > 0) speed *= 2;
    if (this.weather === "rain") speed *= 0.92;
    if (this.weather === "storm") speed *= 0.85;
    if (this.weather === "snow") speed *= 0.95;
    this.animTime += dt * (Math.abs(this.pvx) > 10 ? 1 : 0.4);

    const friction = this.currentPlatform ? PLATFORM_VARIANTS[this.currentPlatform.kind].friction : 1.0;
    const conveyorPush = this.currentPlatform && PLATFORM_VARIANTS[this.currentPlatform.kind].conveyorVx
      ? PLATFORM_VARIANTS[this.currentPlatform.kind].conveyorVx! * (this.currentPlatform.conveyorDir)
      : 0;

    if (this.input.left) { this.pFacing = -1; this.pvx = friction < 0.5 ? this.pvx + (-speed - this.pvx) * friction : -speed; }
    else if (this.input.right) { this.pFacing = 1; this.pvx = friction < 0.5 ? this.pvx + (speed - this.pvx) * friction : speed; }
    else { this.pvx = friction < 0.5 ? this.pvx * (1 - friction * 0.3) : 0; }
    this.pvx += conveyorPush;

    // Dash (with i-frames)
    if (this.input.dashPressed && this.dashCharges > 0 && this.dashTime <= 0) {
      if (this.input.down && this.pOnGround) {
        this.rolling = true;
        this.rollTime = 0.56;          // 2× dash duration
        this.pInv = Math.max(this.pInv, 0.56); // i-frames whole roll
        this.dashCharges--;
        if (this.dashRecharge <= 0) this.dashRecharge = 2;
      }
      else {
        this.dashTime = 0.28; // longer dash
        this.pInv = Math.max(this.pInv, 0.28); // i-frames whole dash
        this.dashCharges--;
        if (this.dashRecharge <= 0) this.dashRecharge = 2;
      }
    }
    if (this.dashTime > 0) {
      this.pvx = this.pFacing * speed * 3.4;
      this.dashTime -= dt;
      this.dashTrail.push({ x: this.px, y: this.py, life: 0.2 });
    }
    this.dashTrail = this.dashTrail.filter(t => { t.life -= dt; return t.life > 0; });
    if (this.rolling) {
      this.rollTime -= dt;
      this.pvx = this.pFacing * speed * 1.8;
      // Knock enemies in path away
      const cx = this.px + this.pw/2, cy = this.py + this.ph/2;
      for (const e of this.enemies) {
        if (e.dying || e.thrown || e.grabbed) continue;
        const dx = e.x - cx, dy = e.y - cy;
        if (Math.abs(dx) < 36 && Math.abs(dy) < 30) {
          e.vx = this.pFacing * 520;
          e.vy = -360;
          e.disabled = Math.max(e.disabled, 0.8);
          this.damageEnemy(e, 12);
          for (let i = 0; i < 4; i++) this.spawnPuff(e.x, e.y + e.h/2, "#cfe");
        }
      }
      if (this.rollTime <= 0) this.rolling = false;
    }
    if (this.dashRecharge > 0) {
      this.dashRecharge -= dt;
      if (this.dashRecharge <= 0 && this.dashCharges < 2) {
        this.dashCharges++;
        if (this.dashCharges < 2) this.dashRecharge = 2;
      }
    }

    // Jump (or drop-through if pressing S)
    if (this.input.jumpPressed) {
      if (this.input.down && this.pOnGround && this.currentPlatform && this.currentPlatform.y > GROUND_Y - 200) {
        // Drop through current platform
        this.dropThrough = 0.25;
        this.py += 4;
        this.pvy = 60;
        this.pOnGround = false;
      } else if (this.pJumps < this.maxJumps) {
        this.pvy = -560; this.pJumps++;
        this.spawnPuff(this.px + this.pw/2, this.py + this.ph, "#cfe");
      }
    }
    if (this.dropThrough > 0) this.dropThrough -= dt;

    if (!this.pOnGround && this.input.down && !this.slamming) { this.slamming = true; this.pvy = 900; }

    // Slow-fall (antigrav) reduces gravity & terminal velocity
    if (this.slowFall > 0) this.slowFall -= dt;
    const gravMul = this.slowFall > 0 ? 0.35 : 1;
    this.pvy += 1700 * dt * gravMul;
    const termV = this.slowFall > 0 ? 380 : 1200;
    if (this.pvy > termV) this.pvy = termV;

    // Ladder climbing — if overlapping a ladder platform and holding W/S
    const ladder = this.findOverlappingLadder();
    if (ladder) {
      if (this.input.up)   { this.pvy = -260; this.pOnGround = false; }
      else if (this.input.down) { this.pvy = 260; }
      else                 { this.pvy *= 0.4; }
    }

    this.px += this.pvx * dt;
    this.resolveCollisionsX();
    this.py += this.pvy * dt;
    this.pOnGround = false;
    this.currentPlatform = null;
    this.resolveCollisionsY();
    if (this.pOnGround && this.slamming) {
      this.slamming = false;
      this.screenShake = 12;
      this.enemies.forEach(e => {
        if (Math.abs(e.x - this.px) < 120 && Math.abs(e.y - this.py) < 80) this.damageEnemy(e, 40);
      });
      for (let i = 0; i < 14; i++) this.spawnPuff(this.px + this.pw/2, this.py + this.ph, "#cfe");
    }

    if (this.pvx > 0) this.worldX += this.pvx * dt;
    this.camX = this.px - W * 0.35;
    if (this.camX < 0) this.camX = 0;

    // Shield
    if (this.input.shieldPressed && this.shieldCd <= 0) {
      this.shieldActive = true; this.shieldTime = 5; this.shieldCd = 6;
      this.flashDescription("SHIELD UP — 95% damage reduction");
    }
    if (this.shieldActive) { this.shieldTime -= dt; if (this.shieldTime <= 0) this.shieldActive = false; }
    if (this.shieldCd > 0) this.shieldCd -= dt;

    // Overdrive (G)
    if (this.input.overdrivePressed && this.odBar >= 1 && !this.odActive) {
      this.odActive = true; this.odTime = 6; this.odBar = 0;
      this.odPrevMaxHp = this.pMaxHp;
      this.pMaxHp = this.odPrevMaxHp * 2;
      this.pHp = Math.min(this.pMaxHp, this.pHp + this.odPrevMaxHp);
      this.flashDescription("OVERDRIVE — 2× DMG, 2× MAX HP, +SPEED (6s)");
    }
    if (this.odActive) {
      this.odTime -= dt;
      if (this.odTime <= 0) {
        this.odActive = false;
        this.pMaxHp = this.odPrevMaxHp;
        this.pHp = Math.min(this.pHp, this.pMaxHp);
      }
    }

    if (this.fireCdR > 0) this.fireCdR -= dt;
    if (this.fireCdM > 0) this.fireCdM -= dt;
    if (this.fireCdMiscA > 0) this.fireCdMiscA -= dt;
    if (this.fireCdMiscB > 0) this.fireCdMiscB -= dt;
    if (this.pInv > 0) this.pInv -= dt;
    if (this.descTimer > 0) this.descTimer -= dt;
    if (this.meleeSwing > 0) this.meleeSwing = Math.max(0, this.meleeSwing - dt * 4);
    if (this.parryFlash > 0) this.parryFlash -= dt;
    if (this.puDamage > 0) this.puDamage -= dt;
    if (this.puSpeed > 0) this.puSpeed -= dt;
    if (this.puInvincible > 0) { this.puInvincible -= dt; this.pInv = Math.max(this.pInv, 0.1); }
    if (this.puChrono > 0) this.puChrono -= dt;

    // J = fire active ranged
    if (this.input.fireR && this.fireCdR <= 0) {
      const w = WEAPONS[this.inventory.ranged[this.inventory.activeRanged]];
      const dmgMult = (this.odActive ? 2 : 1) * (this.puDamage > 0 ? 2 : 1);
      if (w.kind === "ranged" && this.ammo >= w.ammoPerShot) {
        this.fireCdR = w.fireCd;
        this.ammo -= w.ammoPerShot;
        for (let p = 0; p < w.pellets; p++) {
          const ang = (Math.random() - 0.5) * w.spread + (this.weather === "windy" ? 0.04 : 0);
          const cs = Math.cos(ang), sn = Math.sin(ang);
          this.bullets.push({
            x: this.px + this.pw/2, y: this.py + this.ph * 0.4,
            vx: this.pFacing * w.speed * cs, vy: w.speed * sn,
            dmg: w.dmg * dmgMult, life: 0.9, friendly: true, r: w.id === "rocket" ? 7 : 4, pierce: w.pierce,
            color: w.color,
          });
        }
        audio.play("fire");
        this.spawnPuff(this.px + (this.pFacing > 0 ? this.pw : 0), this.py + this.ph * 0.4, w.color);
      }
    }
    // L = melee
    if (this.input.meleePressed && this.fireCdM <= 0) {
      const w = WEAPONS[this.inventory.melee];
      this.fireCdM = w.fireCd;
      this.meleeSwing = 1;
      const dmg = w.dmg * (this.odActive ? 2 : 1) * (this.puDamage > 0 ? 2 : 1);
      const reach = w.id === "katana" ? 80 : 60;
      this.enemies.forEach(e => {
        if (Math.sign(e.x - this.px) === this.pFacing &&
            Math.abs(e.x - this.px) < reach && Math.abs(e.y - this.py) < 55) this.damageEnemy(e, dmg);
      });
      audio.play("slash");
    }

    // K = misc A (charged throw / deploy)
    this.handleMisc("A", dt);
    this.handleMisc("B", dt);

    // E = parry
    this.updateParry(dt);
    if (this.input.parryPressed) {
      this.input.parryPressed = false;
      this.tryParry();
    }

    // V = grab (press) / throw (release with charge)
    if (this.input.grabPressed && !this.grabbed) {
      this.input.grabPressed = false;
      this.handleGrabThrow(0); // attempt grab
    }
    if (this.grabbed) {
      if (this.input.grab) {
        this.grabCharge = Math.min(1.5, this.grabCharge + dt);
      }
      if (this.input.grabReleased || this.input.grabPressed) {
        const c = this.grabCharge / 1.5;
        this.grabCharge = 0;
        this.input.grabPressed = false;
        this.handleGrabThrow(c);
      }
    } else {
      this.grabCharge = 0;
    }

    this.input.jumpPressed = false; this.input.dashPressed = false;
    this.input.fireRPressed = false; this.input.miscAPressed = false; this.input.miscBPressed = false;
    this.input.miscAReleased = false; this.input.miscBReleased = false;
    this.input.meleePressed = false; this.input.shieldPressed = false;
    this.input.grabReleased = false;
    this.input.overdrivePressed = false;

    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.comboCount = 0; }
    if (this.dmgRecentTimer > 0) { this.dmgRecentTimer -= dt; if (this.dmgRecentTimer <= 0) this.dmgRecent = 0; }

    // Bullets (enemy bullets are slowed by Chrono)
    const enemySlowB = this.puChrono > 0 ? 0.5 : 1;
    this.bullets = this.bullets.filter(b => {
      const bdt = b.friendly ? dt : dt * enemySlowB;
      b.life -= bdt;
      if (b.life <= 0) return false;
      if (b.friendly && b.r >= 8) b.vy += 1500 * bdt;
      if (this.weather === "windy" && !b.friendly) b.vx *= 0.998;
      b.x += b.vx * bdt; b.y += b.vy * bdt;
      if (b.x < this.camX - 100 || b.x > this.camX + W + 200) return false;
      if (b.r >= 8 && b.y > GROUND_Y) { this.explode(b.x, b.y, b.dmg, 90); return false; }
      if (b.friendly) {
        for (const e of this.enemies) {
          if (e.dying) continue;
          if (b.x > e.x - e.w/2 && b.x < e.x + e.w/2 && b.y > e.y && b.y < e.y + e.h) {
            this.damageEnemy(e, b.dmg);
            if (b.r >= 8) { this.explode(b.x, b.y, b.dmg, 90); return false; }
            if (b.pierce > 0) { b.pierce--; } else return false;
          }
        }
      } else {
        if (b.x > this.px && b.x < this.px + this.pw && b.y > this.py && b.y < this.py + this.ph) {
          this.damagePlayer(b.dmg);
          return false;
        }
      }
      return true;
    });

    this.particles = this.particles.filter(p => {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.gravity ?? 600) * dt;
      return p.life > 0;
    });

    this.pickups = this.pickups.filter(p => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.vy += 1400 * dt;
      p.y += p.vy * dt;
      if (p.y > GROUND_Y - 8) { p.y = GROUND_Y - 8; p.vy = 0; }
      const dx = (this.px + this.pw/2) - p.x; const dy = (this.py + this.ph/2) - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 80) { p.x += (dx/d) * 200 * dt; p.y += (dy/d) * 200 * dt; }
      if (d < 22) {
        if (p.type === "coin") this.coins += p.value;
        if (p.type === "token") this.tokens += p.value;
        if (p.type === "crystal") this.crystals += p.value;
        return false;
      }
      return true;
    });

    this.updatePlatforms(dt);
    this.updateEnemies(dt);

    // === Tide spawn system: start with 5-enemy allowance, +5 per 111m, hard cap 100.
    // Every 5th tier increase shouts "THE TIDE IS RISING".
    {
      const newTier = Math.floor(meters / 111);
      if (newTier > this.spawnTier) {
        const tiersGained = newTier - this.spawnTier;
        this.spawnTier = newTier;
        this.spawnAllowance = Math.min(100, this.spawnAllowance + 5 * tiersGained);
        for (let i = 0; i < tiersGained; i++) {
          this.tideMessageCount++;
          if (this.tideMessageCount % 5 === 0) {
            this.tideMsgText = "THE TIDE IS RISING";
            this.tideMsgTimer = 3.5;
            this.screenShake = Math.max(this.screenShake, 8);
          }
        }
      }
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.enemiesSpawned < this.spawnAllowance && this.enemiesSpawned < 100) {
        this.spawnEnemy();
        this.enemiesSpawned++;
        // Pace: faster rate as the tier grows. Start gentle ~0.5/s, ramp linearly.
        const rate = 0.5 + 0.35 * this.spawnTier;
        const interval = 1 / Math.max(0.2, rate);
        this.spawnTimer = interval * rand(0.85, 1.15);
        if (this.difficulty === "son" && this.enemiesSpawned < this.spawnAllowance && this.enemiesSpawned < 100) {
          this.spawnEnemy(); this.enemiesSpawned++;
        }
      }
    }
    if (this.tideMsgTimer > 0) this.tideMsgTimer -= dt;

    while (this.platforms.length === 0 || this.lastPlatformX() < this.camX + W + 600) {
      this.spawnPlatformAt(this.lastPlatformX() + rand(140, 280));
    }
    this.platforms = this.platforms.filter(p => p.x + p.w > this.camX - 200 && p.y < H + 200);

    while (this.worldPickupNextX < this.camX + W + 400) {
      const x = this.worldPickupNextX;
      const r = Math.random();
      let type: any = "coin", value = randi(1, 30);
      if (r < 0.10) {
        const pr = Math.random();
        type = pr < 0.25 ? "pu_dmg" : pr < 0.5 ? "pu_spd" : pr < 0.75 ? "pu_inv" : "pu_chr";
        value = 5;
      } else if (r < 0.18) { type = "crystal"; value = randi(1, 3); }
      else if (r < 0.32) { type = "token"; value = randi(1, 2); }
      else { type = "coin"; value = randi(1, 30); }
      this.worldPickups.push({ x, y: GROUND_Y - 14, type, value });
      this.worldPickupNextX += randi(80, 220);
    }
    this.worldPickups = this.worldPickups.filter(p => {
      if (p.x < this.camX - 200) return false;
      const dx = (this.px + this.pw/2) - p.x;
      const dy = (this.py + this.ph/2) - p.y;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 28) {
        if (p.type === "coin") this.coins += p.value;
        else if (p.type === "token") this.tokens += p.value;
        else if (p.type === "crystal") this.crystals += p.value;
        else if (p.type === "pu_dmg") { this.puDamage = 5; this.flashDescription("POWER-UP — 2× DAMAGE (5s)"); }
        else if (p.type === "pu_spd") { this.puSpeed = 5; this.flashDescription("POWER-UP — 2× SPEED (5s)"); }
        else if (p.type === "pu_inv") { this.puInvincible = 5; this.flashDescription("POWER-UP — INVINCIBLE (5s)"); }
        else if (p.type === "pu_chr") { this.puChrono = 5; this.flashDescription("POWER-UP — CHRONO SLOW (5s)"); }
        return false;
      }
      return true;
    });

    // Landmarks
    const metersNow = Math.floor(this.worldX / PX_PER_METER);
    if (this.landmarks.length === 0 || this.landmarks[this.landmarks.length-1].x < this.camX + W + 800) {
      const baseM = metersNow + 200;
      const nextMain = Math.ceil(baseM / 1000) * 1000;
      const lx = nextMain * PX_PER_METER;
      if (!this.landmarks.find(l => Math.abs(l.x - lx) < 200)) {
        this.landmarks.push({ x: lx, kind: "main", w: 220 });
        this.landmarks.push({ x: lx + 260, kind: "ally", w: 200 });
        if (nextMain % 7777 < 1000) this.landmarks.push({ x: lx + 520, kind: "shady", w: 180 });
      }
    }
    this.landmarks = this.landmarks.filter(l => l.x + l.w > this.camX - 100);
    this.inSafeZone = this.landmarks.some(l =>
      this.px + this.pw > l.x && this.px < l.x + l.w);

    // Weather (excluding day/night which is independent)
    this.weatherSwitch -= dt;
    if (this.weatherSwitch <= 0) {
      const opts: any[] = ["clear","clear","rain","snow","storm","fog","windy"];
      this.weather = opts[Math.floor(Math.random() * opts.length)];
      this.weatherSwitch = rand(45, 90);
      this.flashDescription(`WEATHER — ${this.weather.toUpperCase()}`);
    }
    if ((this.weather === "rain" || this.weather === "storm") && this.rainDrops.length < 80) {
      for (let i = this.rainDrops.length; i < 80; i++) this.rainDrops.push({ x: rand(0, W), y: rand(-H, 0), vy: rand(620, 880) });
    }
    if (this.weather !== "rain" && this.weather !== "storm") this.rainDrops = [];
    for (const d of this.rainDrops) {
      d.y += d.vy * dt; d.x -= 60 * dt;
      if (d.y > H) { d.y = -10; d.x = rand(0, W); }
    }
    if (this.lightningFlash > 0) this.lightningFlash -= dt * 4;
    if (this.weather === "storm") {
      this.nextLightning -= dt;
      if (this.nextLightning <= 0) {
        this.nextLightning = rand(4, 9);
        this.lightningFlash = 1;
        this.screenShake = Math.max(this.screenShake, 6);
        if (this.enemies.length && Math.random() < 0.7) {
          const t = pick(this.enemies);
          this.damageEnemy(t, 80);
        } else if (!this.inSafeZone && Math.random() < 0.3) {
          this.damagePlayer(20);
        }
      }
    }

    this.warnTimer -= dt;
    if (this.warnTimer <= 0) {
      this.warnTimer = 1;
      const m = Math.floor(this.worldX / PX_PER_METER);
      const toShop = 1000 - (m % 1000);
      const toBoss = 5555 - (m % 5555);
      if (toBoss < 80) this.warning = `BOSS APPROACHING — ${toBoss}m`;
      else if (toShop < 60) this.warning = `Main shop — ${toShop}m`;
      else if (this.inSafeZone) this.warning = `SAFEZONE — protected`;
      else this.warning = null;
    }

    if (this.screenShake > 0) this.screenShake -= dt * 30;
    if (this.pHp <= 0) this.die();
    this.emitStats();
  }

  // === Misc weapon handling (charged throw)
  private handleMisc(slot: "A" | "B", dt: number) {
    const isA = slot === "A";
    const wid = isA ? this.inventory.miscA : this.inventory.miscB;
    const w = WEAPONS[wid];
    const cdRef = isA ? "fireCdMiscA" : "fireCdMiscB";
    const chargeRef = isA ? "miscACharge" : "miscBCharge";
    const heldKey = isA ? this.input.miscA : this.input.miscB;
    const releasedKey = isA ? this.input.miscAReleased : this.input.miscBReleased;

    // Deploy weapons (medkit) — fire on press
    if ((isA ? this.input.miscAPressed : this.input.miscBPressed) && w.deploy && (this as any)[cdRef] <= 0) {
      // Deploy items also pull from the unified misc pool
      if (this.miscAmmo <= 0) { this.flashDescription("OUT OF MISC"); return; }
      (this as any)[cdRef] = w.fireCd;
      this.miscAmmo = Math.max(0, this.miscAmmo - 1);
      if (w.id === "medkit") this.useMedkit(); // direct heal
      else if (w.id === "smoke") {
        // FLASHBANG: bright flash + stun all enemies in large radius
        const cx = this.px + this.pw/2, cy = this.py + this.ph/2;
        this.parryFlash = Math.max(this.parryFlash, 0.4);
        this.screenShake = Math.max(this.screenShake, 6);
        for (const e of this.enemies) {
          if (e.dying || e.thrown) continue;
          const d = Math.hypot(e.x - cx, e.y - cy);
          if (d < 360) {
            // Bosses get reduced stun
            const isBoss = (e as any).boss === true || e.maxHp > 400;
            e.disabled = Math.max(e.disabled, isBoss ? 0.8 : 2.5);
            e.fireCd = Math.max(e.fireCd, isBoss ? 0.6 : 2.0);
          }
        }
        // Particle burst
        for (let i = 0; i < 40; i++) this.particles.push({
          x: cx, y: cy, vx: rand(-300,300), vy: rand(-260,-20),
          life: 0.8, max: 0.8, color: i%2 ? "#fff8c2" : "#ffffff", size: 4,
        });
        this.flashDescription("FLASHBANG — enemies stunned");
      }
      audio.play("miscthrow");
      return;
    }

    // Hold to charge
    if (heldKey && (this as any)[cdRef] <= 0) {
      (this as any)[chargeRef] = Math.min(1.2, (this as any)[chargeRef] + dt);
    }
    // Release: throw
    if (releasedKey && (this as any)[cdRef] <= 0 && !w.deploy) {
      if (this.miscAmmo <= 0) { (this as any)[chargeRef] = 0; this.flashDescription("OUT OF MISC"); return; }
      const charge = clamp((this as any)[chargeRef] / 1.2, 0, 1);
      (this as any)[chargeRef] = 0;
      (this as any)[cdRef] = w.fireCd;
      const baseSpeed = 360;
      const v = baseSpeed * (0.6 + charge * 1.6);
      const dmgMult = (this.odActive ? 2 : 1) * (this.puDamage > 0 ? 2 : 1);
      this.bullets.push({
        x: this.px + this.pw/2, y: this.py + this.ph * 0.3,
        vx: this.pFacing * v, vy: -380 - charge * 120,
        dmg: (w.dmg || 1) * dmgMult, life: 2.4, friendly: true, r: 8, pierce: 99,
        color: w.color,
        kind: w.id === "molotov" ? "molotov" : "normal",
      });
      this.miscAmmo = Math.max(0, this.miscAmmo - 1);
      audio.play("miscthrow");
      this.flashDescription(`THROW MISC — ${w.name} (${Math.round(charge*100)}% charge)`);
    }
    // Reset charge if not held
    if (!heldKey) (this as any)[chargeRef] = Math.max(0, (this as any)[chargeRef] - dt * 2);
  }

  // === Parry
  private updateParry(dt: number) {
    if (this.parryWindow > 0) { this.parryWindow -= dt; if (this.parryWindow <= 0) this.parryWindow = 0; return; }
    const cx = this.px + this.pw/2, cy = this.py + this.ph/2;
    // Scan for incoming projectiles
    for (const b of this.bullets) {
      if (b.friendly) continue;
      const dx = b.x - cx, dy = b.y - cy;
      const d = Math.hypot(dx, dy);
      if (d < 90) {
        const closing = (b.vx * -dx + b.vy * -dy) > 0;
        if (closing) { this.parryWindow = 0.35; return; }
      }
    }
    // Scan for nearby melee threats (close enemies that touch-damage)
    for (const e of this.enemies) {
      if (e.dying || e.disabled > 0 || e.thrown) continue;
      const isMelee = e.type === "shanker" || e.type === "shankerSwift" || e.type === "rider" ||
                      e.type === "brute" || e.type === "bruteHeavy";
      if (!isMelee) continue;
      const dx = e.x - cx, dy = e.y - cy;
      if (Math.hypot(dx, dy) < 70) { this.parryWindow = 0.35; return; }
    }
  }
  private tryParry() {
    if (this.parryWindow <= 0) return;
    let hit = 0;
    const cx = this.px + this.pw/2, cy = this.py + this.ph/2;
    for (const b of this.bullets) {
      if (b.friendly) continue;
      if (Math.hypot(b.x - cx, b.y - cy) < 90) {
        b.friendly = true;
        b.dmg *= 2;
        const target = this.enemies[0];
        if (target) {
          const dx = target.x - b.x, dy = target.y - b.y;
          const d = Math.hypot(dx, dy) || 1;
          const sp = Math.hypot(b.vx, b.vy) * 1.5;
          b.vx = (dx/d) * sp; b.vy = (dy/d) * sp;
        } else { b.vx = -b.vx; b.vy = -b.vy; }
        b.color = "#ffd84a";
        hit++;
      }
    }
    // Stun & knock back melee enemies in front of the player
    for (const e of this.enemies) {
      if (e.dying || e.thrown) continue;
      const dx = e.x - cx, dy = e.y - cy;
      if (Math.hypot(dx, dy) < 80) {
        e.disabled = Math.max(e.disabled, 1.2);
        e.vx = Math.sign(dx || 1) * 320;
        e.vy = -260;
        e.hp -= 15;
        hit++;
      }
    }
    if (hit > 0) {
      audio.play("parry");
      this.meleeSwing = 1;
      this.parryFlash = 0.25;
      this.parryWindow = 0;
      this.flashDescription(`PARRY × ${hit}`);
      for (let i = 0; i < 16; i++) this.particles.push({ x: cx, y: cy, vx: rand(-260,260), vy: rand(-260,-30), life: 0.5, max: 0.5, color: "#fff", size: 3 });
    }
  }

  // === Grab/Throw
  private handleGrabThrow(charge: number = 0) {
    if (this.grabbed) {
      // Throw it
      const e = this.grabbed;
      e.grabbed = false;
      e.disabled = 0;
      e.thrown = true;
      const vBase = 520;
      const vBoost = 700 * charge; // up to ~1220 px/s when fully charged
      e.throwVx = this.pFacing * (vBase + vBoost);
      e.throwVy = -360 - 220 * charge;
      // Stash bonus damage for landing explosion (read in updateEnemies)
      (e as any).throwDmg = 60 + Math.round(140 * charge);
      (e as any).throwRadius = 80 + Math.round(60 * charge);
      this.grabbed = null;
      this.flashDescription(`THROW ENEMY — ${Math.round(charge * 100)}% charge`);
      audio.play("miscthrow");
    } else {
      // Find nearest non-boss enemy in range
      let best: Enemy | null = null; let bestD = 70;
      for (const e of this.enemies) {
        if (e.dying || e.thrown) continue;
        const d = Math.hypot(e.x - (this.px + this.pw/2), e.y - (this.py + this.ph/2));
        if (d < bestD) { best = e; bestD = d; }
      }
      if (best) {
        best.grabbed = true;
        best.disabled = 99;
        this.grabbed = best;
        this.flashDescription("GRABBED — F again to throw");
      }
    }
  }

  private flashDescription(text: string) { this.description = text; this.descTimer = 3; }

  private lastPlatformX() {
    if (!this.platforms.length) return this.px + 200;
    const last = this.platforms[this.platforms.length - 1];
    return last.x + last.w;
  }

  private spawnPlatformAt(x: number) {
    if (Math.random() < 0.5) return;
    const meters = this.worldX / PX_PER_METER;
    let kind = pickPlatformKind(meters);
    // Ladders aren't standalone platforms — they get attached to a base.
    if (kind === "ladder") kind = "stone";
    const w = randi(80, 180);
    const y = randi(280, 400);
    const base: Platform = {
      x, y, w, h: 16,
      kind,
      cracked: false, crumbleTimer: 0, falling: false, fallVy: 0,
      baseX: x, baseY: y, phase: Math.random() * Math.PI * 2,
      horizontal: Math.random() < 0.5,
      conveyorDir: Math.random() < 0.5 ? 1 : -1,
      cloudFade: 1, cloudActive: true, cloudRespawn: 0,
    };
    this.platforms.push(base);

    // ~30% chance: attach a climbable ladder to one side of the base platform
    // running from the platform top down to the ground.
    if (kind === "stone" || kind === "floating" || kind === "crumble" || kind === "ice" || kind === "moving") {
      if (Math.random() < 0.3 && y < GROUND_Y - 40) {
        const onLeft = Math.random() < 0.5;
        const lw = 12;
        const lx = onLeft ? base.x - lw : base.x + base.w;
        const ly = base.y;
        const lh = GROUND_Y - ly;
        this.platforms.push({
          x: lx, y: ly, w: lw, h: lh,
          kind: "ladder",
          cracked: false, crumbleTimer: 0, falling: false, fallVy: 0,
          baseX: lx, baseY: ly, phase: 0,
          horizontal: false,
          conveyorDir: 1,
          cloudFade: 1, cloudActive: true, cloudRespawn: 0,
        });
      }
    }
  }

  private updatePlatforms(dt: number) {
    for (const p of this.platforms) {
      if (p.kind === "moving") {
        p.phase += dt * 1.2;
        if (p.horizontal) p.x = p.baseX + Math.sin(p.phase) * 60;
        else p.y = p.baseY + Math.sin(p.phase) * 40;
      }
      if (p.kind === "crumble" && p.cracked && !p.falling) {
        p.crumbleTimer -= dt;
        if (p.crumbleTimer <= 0) p.falling = true;
      }
      if (p.falling) {
        p.fallVy += 1700 * dt;
        p.y += p.fallVy * dt;
      }
      if (p.kind === "cloud") {
        if (p.cloudActive && p.cloudFade < 1) p.cloudFade = Math.min(1, p.cloudFade + dt);
        if (!p.cloudActive) {
          p.cloudFade = Math.max(0, p.cloudFade - dt);
          p.cloudRespawn -= dt;
          if (p.cloudRespawn <= 0) { p.cloudActive = true; }
        }
      }
    }
  }

  private resolveCollisionsX() {
    if (this.px < 0) this.px = 0;
    // Only the GROUND has horizontal solid walls. All platforms are jump-through.
  }
  private resolveCollisionsY() {
    if (this.py + this.ph >= GROUND_Y) {
      this.py = GROUND_Y - this.ph; this.pvy = 0; this.pOnGround = true; this.pJumps = 0;
    }
    for (const p of this.platforms) {
      if (p.falling) continue;
      const v = PLATFORM_VARIANTS[p.kind];
      if (p.kind === "ladder") continue; // ladders don't have a landable top
      if (p.kind === "cloud" && (!p.cloudActive || p.cloudFade < 0.4)) continue;
      // Only land if falling and feet were above the top last frame
      if (this.dropThrough > 0) continue;
      if (this.pvy <= 0) continue;
      const prevBottom = this.py + this.ph - this.pvy * 0.001; // approx
      // Use pvy: feet must be crossing top
      if (this.px + this.pw > p.x && this.px < p.x + p.w &&
          this.py + this.ph >= p.y && this.py + this.ph - this.pvy * 0.02 <= p.y + 4) {
        this.py = p.y - this.ph;
        this.pvy = v.bounce ? -560 * v.bounce : 0;
        if (!v.bounce) { this.pOnGround = true; this.pJumps = 0; }
        this.currentPlatform = p;
        if (p.kind === "spike") this.damagePlayer(v.damageOnTop);
        if (p.kind === "crumble" && !p.cracked) { p.cracked = true; p.crumbleTimer = 0.5; }
        if (v.slowFallSeconds && this.slowFall <= 0.1) {
          this.slowFall = v.slowFallSeconds;
          this.flashDescription(`ANTIGRAV PAD — slow fall ${v.slowFallSeconds}s`);
        }
        if (p.kind === "jumppad") {
          this.flashDescription("JUMP PAD!");
          for (let i = 0; i < 8; i++) this.spawnPuff(this.px + this.pw/2, this.py + this.ph, "#ff5af0");
        }
        if (p.kind === "cloud" && p.cloudActive) {
          // start fading after step
          setTimeout(() => { if (p.cloudActive) { p.cloudActive = false; p.cloudRespawn = 3; } }, 1000);
        }
      }
    }
    void prevBottomDummy;
  }

  private spawnEnemy() {
    const meters = this.worldX / PX_PER_METER;
    const spawnX = this.camX + W + rand(40, 200);

    const pool: EnemyType[] = ["shooter", "shanker"];
    if (meters > 150) pool.push("brute");
    if (meters > 400) pool.push("shankerSwift", "shooterElite");
    if (meters > 700) pool.push("rider");
    if (meters > 1000) pool.push("bomber", "sniper", "bruteHeavy");
    const type = pick(pool);

    const stats: Record<EnemyType, { hp: number; w: number; h: number }> = {
      shooter:      { hp: 100, w: 26, h: 40 },
      shooterElite: { hp: 200, w: 28, h: 42 },
      shanker:      { hp: 60,  w: 24, h: 36 },
      shankerSwift: { hp: 45,  w: 22, h: 34 },
      brute:        { hp: 320, w: 38, h: 48 },
      bruteHeavy:   { hp: 600, w: 46, h: 56 },
      rider:        { hp: 140, w: 44, h: 30 },
      bomber:       { hp: 90,  w: 50, h: 24 },
      sniper:       { hp: 130, w: 24, h: 40 },
    };
    const base = stats[type];
    const flying = type === "bomber" || type === "rider";
    const baseY = flying ? randi(120, 240) : GROUND_Y - base.h;
    const hpMul = this.diffEnemyHp();

    this.enemies.push({
      type, x: spawnX, y: baseY, vx: 0, vy: 0,
      w: base.w, h: base.h, hp: base.hp * hpMul, maxHp: base.hp * hpMul,
      onGround: !flying, facing: -1,
      fireCd: rand(0.6, 1.4), aiTimer: 0, targetDx: 0, hurtFlash: 0,
      burstLeft: 0, burstCd: 0, chargeTime: 0, charging: false,
      flying, baseY,
      jumpCd: 0, disabled: 0, grabbed: false,
      thrown: false, throwVx: 0, throwVy: 0,
      legPhase: 0, glintTimer: 0, dying: false,
    });
    if (meters > 500 && Math.random() < 0.3 && this.enemiesSpawned < this.spawnAllowance && this.enemiesSpawned < 100) {
      this.spawnEnemy();
      this.enemiesSpawned++;
    }
  }

  private updateEnemies(dtRaw: number) {
    // CHRONO SLOW: enemies experience 50% time (bosses 75% — none yet, so flat 0.5)
    const slow = this.puChrono > 0 ? 0.5 : 1;
    const dt = dtRaw * slow;
    this.enemies = this.enemies.filter(e => {
      if (e.x < this.camX - 300) return false;
      e.hurtFlash = Math.max(0, e.hurtFlash - dt);
      e.legPhase += dt * 10;

      // Death glint phase
      if (e.dying) {
        e.glintTimer -= dt;
        return e.glintTimer > 0;
      }

      // If grabbed: lock above player, don't act
      if (e.grabbed) {
        e.x = this.px + this.pw/2;
        e.y = this.py - e.h - 6;
        return e.hp > 0;
      }

      // If thrown: arc + collide
      if (e.thrown) {
        e.throwVy += 1700 * dt;
        e.x += e.throwVx * dt;
        e.y += e.throwVy * dt;
        if (e.y + e.h >= GROUND_Y) {
          const dmg = (e as any).throwDmg ?? 80;
          const radius = (e as any).throwRadius ?? 90;
          this.explode(e.x, e.y + e.h, dmg, radius);
          e.hp = 0;
        }
      } else {
        if (e.disabled > 0) e.disabled -= dt;
        if (e.jumpCd > 0) e.jumpCd -= dt;

        const dx = (this.px + this.pw/2) - e.x;
        e.facing = dx > 0 ? 1 : -1;
        const dist = Math.abs(dx);
        const dy = (this.py + this.ph/2) - (e.y + e.h/2);
        const fireMul = this.diffEnemyFire();

        switch (e.type) {
          case "shanker":
            e.vx = Math.sign(dx) * 130;
            if (e.onGround && e.jumpCd <= 0 && dy < -30 && dist < 200) { e.vy = -520; e.onGround = false; e.jumpCd = 1.2; }
            break;
          case "shankerSwift":
            e.vx = Math.sign(dx) * 220;
            if (e.onGround && e.jumpCd <= 0 && (Math.random() < 0.02 || dy < -20) && dist < 220) { e.vy = -540; e.onGround = false; e.jumpCd = 0.9; }
            break;
          case "shooter":
            // strafe in/out of optimal range
            if (dist > 320) e.vx = Math.sign(dx) * 90;
            else if (dist < 180) e.vx = -Math.sign(dx) * 90;
            else e.vx = Math.sin(this.timeAlive * 2 + e.x * 0.01) * 50;
            e.fireCd -= dt;
            if (e.fireCd <= 0 && dist < 460) {
              e.fireCd = rand(1.0, 1.8) * fireMul;
              this.spawnEnemyBullet(e, 420, 8);
            }
            if (e.onGround && e.jumpCd <= 0 && dy < -40 && Math.random() < 0.01) { e.vy = -480; e.onGround = false; e.jumpCd = 1.5; }
            break;
          case "shooterElite":
            if (dist > 320) e.vx = Math.sign(dx) * 110;
            else if (dist < 200) e.vx = -Math.sign(dx) * 100;
            else e.vx = Math.sin(this.timeAlive * 3) * 60;
            e.fireCd -= dt; e.burstCd -= dt;
            if (e.burstLeft > 0 && e.burstCd <= 0) {
              this.spawnEnemyBullet(e, 480, 10);
              e.burstLeft--; e.burstCd = 0.12;
            } else if (e.fireCd <= 0 && dist < 480) {
              e.fireCd = rand(1.6, 2.4) * fireMul; e.burstLeft = 3; e.burstCd = 0;
            }
            if (e.onGround && e.jumpCd <= 0 && dy < -40 && Math.random() < 0.02) { e.vy = -520; e.onGround = false; e.jumpCd = 1.2; }
            break;
          case "brute":
            e.vx = Math.sign(dx) * 60;
            if (e.onGround && e.jumpCd <= 0 && dist < 80 && dy < -10) { e.vy = -560; e.onGround = false; e.jumpCd = 1.5; }
            e.fireCd -= dt;
            if (e.fireCd <= 0 && dist < 380) {
              e.fireCd = rand(1.6, 2.4) * fireMul;
              for (let i = -1; i <= 1; i++) this.spawnEnemyBullet(e, 360, 12, i * 60);
            }
            break;
          case "bruteHeavy":
            e.vx = Math.sign(dx) * 40;
            e.fireCd -= dt;
            if (e.fireCd <= 0 && dist < 220 && e.onGround) {
              e.fireCd = 3.0 * fireMul;
              this.screenShake = Math.max(this.screenShake, 8);
              for (let i = -2; i <= 2; i++) this.spawnEnemyBullet(e, 420, 16, i * 20);
            }
            break;
          case "rider":
            e.vx = -260;
            e.fireCd -= dt;
            if (e.fireCd <= 0 && dist < 600) {
              e.fireCd = 0.8 * fireMul;
              this.bullets.push({
                x: e.x, y: e.y + e.h, vx: 0, vy: 200, dmg: 14, life: 4, friendly: false, r: 5, pierce: 0, color: "#ff8c42",
              });
            }
            break;
          case "bomber":
            e.vx = -180;
            e.y = e.baseY + Math.sin(this.weatherTime * 1.2 + e.x * 0.01) * 12;
            e.fireCd -= dt;
            if (e.fireCd <= 0 && dist < 500) {
              e.fireCd = 1.2 * fireMul;
              this.bullets.push({
                x: e.x, y: e.y + e.h, vx: -60, vy: 80, dmg: 22, life: 4, friendly: false, r: 6, pierce: 0, color: "#ffb347",
              });
            }
            break;
          case "sniper":
            e.vx = (Math.random() < 0.01) ? Math.sign(dx) * 80 : 0;
            if (!e.charging && dist < 700) {
              e.charging = true; e.chargeTime = 1.2 * fireMul;
            }
            if (e.charging) {
              e.chargeTime -= dt;
              if (e.chargeTime <= 0) {
                this.spawnEnemyBullet(e, 1200, 35);
                e.charging = false;
                e.fireCd = 1.5;
              }
            }
            break;
        }

        // Separation
        for (const o of this.enemies) {
          if (o === e || o.flying !== e.flying || o.dying) continue;
          const sep = e.x - o.x;
          if (Math.abs(sep) < 32 && Math.abs(e.y - o.y) < 30) {
            e.vx += Math.sign(sep || 1) * 120 * dt * 60;
          }
        }

        // Kite away from melee
        const distToP = Math.abs((this.px + this.pw/2) - e.x);
        if (distToP < 36 && (e.type === "shooter" || e.type === "shooterElite" || e.type === "sniper")) {
          e.vx = -Math.sign(dx) * 200;
        }
        // Melee swipe
        if ((e.type === "shooter" || e.type === "shooterElite") && distToP < 44 && e.fireCd <= 0.2) {
          e.fireCd = 0.9;
          if (Math.abs(e.y - this.py) < 50) this.damagePlayer(10 * this.diffEnemyDmg());
        }
      }

      const espd = this.diffEnemySpeed();
      if (!e.flying && !e.thrown) {
        // Climb ladders if overlapping one and player is higher than the enemy
        let onLadder = false;
        for (const p of this.platforms) {
          if (p.kind !== "ladder") continue;
          if (e.x + e.w/2 > p.x && e.x - e.w/2 < p.x + p.w &&
              e.y + e.h > p.y - 4 && e.y < p.y + p.h + 30) { onLadder = true; break; }
        }
        if (onLadder && this.py + this.ph < e.y + 4) {
          e.vy = -150;
          e.onGround = false;
        }
        e.vy += 1700 * dt * (this.difficulty === "dunce" ? 0.85 : 1);
        e.y += e.vy * dt;
        if (e.y + e.h >= GROUND_Y) { e.y = GROUND_Y - e.h; e.vy = 0; e.onGround = true; }
        // Land on platform tops (enemies can sometimes reach platforms)
        if (e.vy > 0) {
          for (const p of this.platforms) {
            const v = PLATFORM_VARIANTS[p.kind];
            if (v.hazardSpikes) continue;
            if (p.kind === "ladder") continue;
            if (e.x + e.w/2 > p.x && e.x - e.w/2 < p.x + p.w) {
              const top = p.y;
              const prevBottom = e.y + e.h - e.vy * dt;
              if (prevBottom <= top + 2 && e.y + e.h >= top) {
                e.y = top - e.h; e.vy = 0; e.onGround = true;
                if (v.bounce && Math.random() < 0.5) e.vy = -520 * v.bounce;
                break;
              }
            }
          }
        }
        // Occasional jump toward player platform
        if (e.onGround && e.jumpCd <= 0 && Math.random() < 0.008 * espd) {
          e.vy = -520; e.onGround = false; e.jumpCd = 1.5;
        }
      }
      if (!e.thrown) e.x += e.vx * dt * espd;

      // Touch damage
      const touching = !e.disabled && e.x - e.w/2 < this.px + this.pw && e.x + e.w/2 > this.px &&
                       e.y < this.py + this.ph && e.y + e.h > this.py;
      if (touching && !e.thrown) {
        const m = this.diffEnemyDmg();
        if (e.type === "shanker" || e.type === "shankerSwift") this.damagePlayer(8 * m);
        else if (e.type === "rider") this.damagePlayer(15 * m);
        else if (e.type === "bruteHeavy" || e.type === "brute") this.damagePlayer(12 * m);
      }

      if (e.hp <= 0 && !e.dying) {
        e.dying = true;
        e.glintTimer = 0.4;
        this.kills++;
        this.comboCount++; this.comboTimer = 3;
        audio.play("kill");
        this.dropLoot(e);
        // glint particles
        for (let i = 0; i < 8; i++) this.particles.push({
          x: e.x, y: e.y + e.h/2, vx: rand(-260, 260), vy: rand(-220, -40),
          life: 0.6, max: 0.6, color: "#ffffff", size: 3,
        });
      }
      return e.hp > 0 || e.dying;
    });
    if (this.grabbed && (!this.enemies.includes(this.grabbed) || this.grabbed.dying)) this.grabbed = null;
  }

  private spawnEnemyBullet(e: Enemy, speed: number, dmg: number, vyOffset = 0) {
    this.bullets.push({
      x: e.x, y: e.y + e.h * 0.4,
      vx: e.facing * speed, vy: vyOffset,
      dmg: dmg * this.diffEnemyDmg(), life: 1.5, friendly: false, r: 3, pierce: 0,
      color: "#ff6a6a",
    });
  }

  private damageEnemy(e: Enemy, dmg: number) {
    if (e.dying) return;
    e.hp -= dmg;
    e.hurtFlash = 0.12;
    this.totalDmg += dmg;
    this.dmgRecent += dmg; this.dmgRecentTimer = 2;
    this.odBar = clamp(this.odBar + dmg / 1200, 0, 1);
    for (let i = 0; i < 4; i++) this.particles.push({
      x: e.x, y: e.y + e.h/2, vx: rand(-120, 120), vy: rand(-200, -40),
      life: 0.4, max: 0.4, color: "#ffd166", size: 2,
    });
  }

  private dropLoot(e: Enemy) {
    const heavy = e.type === "brute" || e.type === "bruteHeavy" || e.type === "shooterElite";
    const coinChance = heavy ? 0.7 : 0.35;
    if (Math.random() < coinChance) {
      const v = heavy ? randi(120, 480) : randi(50, 100);
      this.pickups.push({ x: e.x, y: e.y, vy: -260, type: "coin", value: v, life: 12 });
    }
    if (Math.random() < 0.07) this.pickups.push({ x: e.x + 8, y: e.y, vy: -240, type: "token", value: randi(30, 45), life: 12 });
    if (Math.random() < 0.03) this.pickups.push({ x: e.x - 8, y: e.y, vy: -260, type: "crystal", value: randi(1, 10), life: 12 });
  }

  private explode(x: number, y: number, dmg: number, radius: number) {
    this.screenShake = Math.max(this.screenShake, 8);
    this.enemies.forEach(e => {
      if (e.dying) return;
      const dx = e.x - x, dy = e.y - y;
      if (dx*dx + dy*dy < radius*radius) this.damageEnemy(e, dmg);
    });
    for (let i = 0; i < 24; i++) this.particles.push({
      x, y, vx: rand(-340, 340), vy: rand(-340, -40),
      life: 0.7, max: 0.7, color: i % 2 ? "#ffb347" : "#ffd166", size: 3,
    });
  }

  private damagePlayer(dmg: number) {
    if (this.inSafeZone) return;
    if (this.puInvincible > 0) return;
    if (this.pInv > 0) return;
    // Parry negates incoming damage entirely (incl. melee)
    if (this.parryFlash > 0) return;
    let actual = dmg;
    if (this.shieldActive) actual *= 0.05;
    this.pHp -= actual;
    this.pInv = 0.4;
    this.screenShake = Math.max(this.screenShake, 6);
    this.flashDescription(`HIT — pace ${(this.paceMult).toFixed(2)}× (distance-based)`);
  }

  private spawnPuff(x: number, y: number, color: string) {
    for (let i = 0; i < 4; i++) this.particles.push({
      x, y, vx: rand(-60, 60), vy: rand(-160, -20),
      life: 0.35, max: 0.35, color, size: 2,
    });
  }

  // Ladder helper: returns ladder platform if player overlaps it
  private findOverlappingLadder(): Platform | null {
    for (const p of this.platforms) {
      if (p.kind !== "ladder") continue;
      if (this.px + this.pw > p.x && this.px < p.x + p.w &&
          this.py + this.ph > p.y && this.py < p.y + p.h + 60) return p;
    }
    return null;
  }

  private die() {
    // 3-life system: respawn unless out of lives
    if (this.lives > 1) {
      this.lives--;
      this.pHp = this.pMaxHp;
      this.pInv = 2.0;
      this.pvy = -300; this.pvx = 0;
      this.screenShake = Math.max(this.screenShake, 14);
      // clear nearby threats (small mercy)
      for (const e of this.enemies) {
        if (Math.abs(e.x - this.px) < 220 && !e.dying) e.disabled = Math.max(e.disabled, 1.2);
      }
      this.flashDescription(`LIFE LOST — ${this.lives}/${this.maxLives} REMAINING`);
      audio.play("death");
      return;
    }
    audio.play("death");
    audio.stopMusic();
    this.phase = "dead";
    this.onPhaseChange(this.phase);
  }

  private emitStats() {
    const meters = this.worldX / PX_PER_METER;
    const rank = this.computeRank(meters);
    const activeName = WEAPONS[this.inventory.ranged[this.inventory.activeRanged]].name.toUpperCase();
    const desc = this.descTimer > 0
      ? this.description
      : (this.warning ? `! ${this.warning} !` : `${activeName} EQUIPPED  •  ${Math.floor(meters)}m  •  PACE ${this.paceMult.toFixed(2)}×  •  ♪ ${audio.currentTrackName()}`);
    this.onStatsChange({
      hp: this.pHp, maxHp: this.pMaxHp,
      ammo: this.ammo, grenades: this.miscAmmo, miscAmmo: this.miscAmmo, lives: this.lives,
      coins: this.coins, tokens: this.tokens, crystals: this.crystals,
      distance: meters,
      totalDamage: this.totalDmg,
      comboCount: this.comboCount,
      damageRecent: this.dmgRecent,
      shieldActive: this.shieldActive, shieldCd: Math.max(0, this.shieldCd),
      overdriveBar: this.odBar, overdriveActive: this.odActive, overdriveTime: Math.max(0, this.odTime),
      dashCharges: this.dashCharges, dashCdNext: Math.max(0, this.dashRecharge),
      kills: this.kills, bossKills: this.bossKills,
      timeAlive: this.timeAlive,
      rank: rank.label, rankColor: rank.color,
      trackName: audio.currentTrackName(),
      warning: this.warning,
      description: desc,
      inventory: this.inventory,
      phase: this.phase,
      difficulty: this.difficulty,
      weather: this.weather,
      cycleProgress: this.cycleTime / DAY_NIGHT_PERIOD,
      parryWindow: this.parryWindow,
      miscCharge: Math.max(this.miscACharge, this.miscBCharge) / 1.2,
      grabbedHas: !!this.grabbed,
    });
  }

  computeRank(meters: number): { label: string; color: string } {
    const minutes = this.timeAlive / 60;
    if (this.bossKills >= 20 || this.coins >= 1_000_000 || meters >= 1_000_000 || this.totalDmg >= 100_000_000 || minutes >= 60)
      return { label: "SON 😭👍", color: "rank-son" };
    if (this.bossKills >= 10 || this.totalDmg >= 300_000 || minutes >= 45) return { label: "S", color: "text-[hsl(var(--rank-s))]" };
    if (this.bossKills >= 5  || meters >= 500_000 || minutes >= 30) return { label: "A", color: "text-[hsl(var(--rank-a))]" };
    if (this.bossKills >= 3  || minutes >= 20) return { label: "B", color: "text-[hsl(var(--rank-b))]" };
    if (this.bossKills >= 2  || minutes >= 15) return { label: "C", color: "text-[hsl(var(--rank-c))]" };
    if (this.bossKills >= 1  || minutes >= 10) return { label: "D", color: "text-[hsl(var(--rank-d))]" };
    return { label: "F", color: "text-[hsl(var(--rank-f))]" };
  }

  // ============================================================
  // RENDER
  // ============================================================
  private render() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    let shakeX = 0, shakeY = 0;
    if (this.screenShake > 0 && this.phase === "playing") {
      shakeX = (Math.random() - 0.5) * this.screenShake;
      shakeY = (Math.random() - 0.5) * this.screenShake;
    }
    ctx.clearRect(0, 0, W, H);

    // === Day/Night sky
    const t = this.cycleTime / DAY_NIGHT_PERIOD; // 0..1
    // 0 = sunrise, 0.25 noon, 0.5 sunset, 0.75 midnight
    const dayAmt = (Math.cos(t * Math.PI * 2) + 1) / 2; // 1 at noon-ish, 0 at midnight
    const sky1 = lerpColor("#1a2342", "#6cb8ff", dayAmt);
    const sky2 = lerpColor("#2a2050", "#c8d8ff", dayAmt);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, sky1);
    grad.addColorStop(1, sky2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars at night
    if (dayAmt < 0.5) {
      ctx.globalAlpha = 1 - dayAmt * 2;
      for (let i = 0; i < 60; i++) {
        const x = (i * 137 + this.camX * 0.05) % W;
        const y = (i * 73) % 240;
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    // Sun / Moon (top right area, with sword rays + infinity)
    this.drawSunMoon(ctx, dayAmt);

    ctx.translate(shakeX, shakeY);

    this.drawMountains("#2c3a5e", 0.15, 360, 80);
    this.drawMountains("#3a4a72", 0.35, 380, 110);
    this.drawMountains("#4a5a82", 0.6, 410, 140);

    ctx.fillStyle = COLOR.ground;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = COLOR.groundTop;
    ctx.fillRect(0, GROUND_Y, W, 6);
    const tileOffset = Math.floor(this.camX) % 32;
    ctx.fillStyle = "#2a1a0a";
    for (let x = -tileOffset; x < W; x += 32) ctx.fillRect(x, GROUND_Y + 6, 1, H - GROUND_Y);

    // Landmarks
    for (const l of this.landmarks) {
      const sx = l.x - this.camX;
      if (sx + l.w < 0 || sx > W) continue;
      ctx.fillStyle = "rgba(123,224,255,0.10)";
      ctx.fillRect(sx, GROUND_Y - 120, l.w, 120);
      ctx.strokeStyle = "rgba(123,224,255,0.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, GROUND_Y - 120, l.w, 120);
      const col = l.kind === "main" ? "#5a3a8a" : l.kind === "ally" ? "#3a8a5a" : "#8a5a3a";
      ctx.fillStyle = col;
      ctx.fillRect(sx + 30, GROUND_Y - 80, l.w - 60, 80);
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(sx + l.w/2 - 12, GROUND_Y - 50, 24, 50);
      ctx.fillStyle = "#ffd84a";
      ctx.fillRect(sx + l.w/2 - 8, GROUND_Y - 110, 16, 14);
      ctx.fillStyle = "#0a0e1f";
      ctx.font = "10px monospace";
      const label = l.kind === "main" ? "MAIN SHOP" : l.kind === "ally" ? "ALLY SHOP" : "SHADY GUY";
      ctx.fillText(label, sx + 20, GROUND_Y - 96);
    }

    // === START PORTAL (ominous orb with infinity sigil) at worldX = 0
    {
      const portalWorldX = 90;
      const sx = portalWorldX - this.camX;
      if (sx > -120 && sx < W + 120) {
        const baseY = GROUND_Y - 4;
        // Stone arch base
        ctx.fillStyle = "#1a1426";
        ctx.fillRect(sx - 50, baseY - 110, 100, 110);
        ctx.fillStyle = "#2a1f3a";
        ctx.fillRect(sx - 46, baseY - 106, 92, 102);
        // Pillar runes
        ctx.fillStyle = "#7b4adf";
        for (let i = 0; i < 4; i++) ctx.fillRect(sx - 44, baseY - 100 + i * 22, 4, 12);
        for (let i = 0; i < 4; i++) ctx.fillRect(sx + 40, baseY - 100 + i * 22, 4, 12);
        // Inner dark arch
        ctx.fillStyle = "#0a0612";
        ctx.beginPath();
        ctx.moveTo(sx - 32, baseY);
        ctx.lineTo(sx - 32, baseY - 60);
        ctx.quadraticCurveTo(sx, baseY - 100, sx + 32, baseY - 60);
        ctx.lineTo(sx + 32, baseY);
        ctx.closePath(); ctx.fill();
        // Ominous orb
        const orbY = baseY - 60;
        const pulse = 0.5 + 0.5 * Math.sin(this.weatherTime * 2);
        // Outer glow
        ctx.globalAlpha = 0.25 + pulse * 0.25;
        ctx.fillStyle = "#a87bff";
        ctx.beginPath(); ctx.arc(sx, orbY, 30, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        // Orb core
        const grad2 = ctx.createRadialGradient(sx - 4, orbY - 4, 2, sx, orbY, 22);
        grad2.addColorStop(0, "#fff");
        grad2.addColorStop(0.4, "#c9a8ff");
        grad2.addColorStop(1, "#3a1a6a");
        ctx.fillStyle = grad2;
        ctx.beginPath(); ctx.arc(sx, orbY, 22, 0, Math.PI * 2); ctx.fill();
        // Swirl marks
        ctx.strokeStyle = "rgba(20,5,40,0.6)"; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, orbY, 14, this.weatherTime, this.weatherTime + Math.PI * 1.4);
        ctx.stroke();
        // ∞ sigil floating ABOVE the orb
        const sigY = orbY - 42;
        // glow under sigil
        ctx.globalAlpha = 0.35 + pulse * 0.3;
        ctx.fillStyle = "#a87bff";
        ctx.fillRect(sx - 18, sigY - 4, 36, 8);
        ctx.globalAlpha = 1;
        this.drawInfinity(ctx, sx, sigY, 14, "#fff");
        this.drawInfinity(ctx, sx, sigY, 11, "#d8c4ff");
        // Floating embers
        for (let i = 0; i < 5; i++) {
          const t = (this.weatherTime * 0.6 + i * 0.3) % 1;
          ctx.fillStyle = `rgba(200,160,255,${1 - t})`;
          ctx.fillRect(sx + Math.sin(i * 1.7 + this.weatherTime) * 22, orbY - t * 50, 2, 2);
        }
      }
    }

    // World pickups
    for (const p of this.worldPickups) {
      const sx = p.x - this.camX;
      if (sx < -20 || sx > W + 20) continue;
      const float = Math.sin(this.animTime * 4 + p.x * 0.01) * 2;
      let col = "#ffd84a";
      let label = "";
      let icon = "";
      if (p.type === "coin") col = "#ffd84a";
      else if (p.type === "token") col = "#7be0ff";
      else if (p.type === "crystal") col = "#d97bff";
      else if (p.type === "pu_dmg") { col = "#ff5a5a"; label = "DMG"; icon = "+"; }
      else if (p.type === "pu_spd") { col = "#7bff8a"; label = "SPD"; icon = ">"; }
      else if (p.type === "pu_inv") { col = "#fff7d6"; label = "INV"; icon = "*"; }
      else if (p.type === "pu_chr") { col = "#a78bfa"; label = "SLOW"; icon = "~"; }
      const py = p.y + float;
      // Soft halo glow (pulsing)
      const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 5 + p.x * 0.02);
      ctx.globalAlpha = 0.18 + pulse * 0.18;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(sx, py, 11 + pulse * 2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      // Coin/token/crystal: render gem or coin
      if (p.type === "coin") {
        // Coin: outer ring + inner
        ctx.fillStyle = "#7a5a10"; ctx.fillRect(sx - 6, py - 6, 12, 12);
        ctx.fillStyle = col; ctx.fillRect(sx - 5, py - 5, 10, 10);
        ctx.fillStyle = "#fff8"; ctx.fillRect(sx - 4, py - 4, 2, 2);
        ctx.fillStyle = "#a07020"; ctx.fillRect(sx - 2, py + 1, 4, 1);
      } else if (p.type === "crystal") {
        // Diamond shape
        ctx.fillStyle = "#0008";
        ctx.beginPath(); ctx.moveTo(sx, py - 7); ctx.lineTo(sx + 6, py); ctx.lineTo(sx, py + 7); ctx.lineTo(sx - 6, py); ctx.closePath(); ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(sx, py - 6); ctx.lineTo(sx + 5, py); ctx.lineTo(sx, py + 6); ctx.lineTo(sx - 5, py); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.fillRect(sx - 2, py - 3, 2, 2);
      } else if (p.type === "token") {
        // Hex token
        ctx.fillStyle = "#0008"; ctx.fillRect(sx - 6, py - 6, 12, 12);
        ctx.fillStyle = col;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const x = sx + Math.cos(a) * 6, y = py + Math.sin(a) * 6;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.fillRect(sx - 1, py - 1, 2, 2);
      } else {
        // Power-up capsule
        ctx.fillStyle = "#0a0e1f";
        ctx.fillRect(sx - 7, py - 8, 14, 16);
        ctx.fillStyle = col;
        ctx.fillRect(sx - 6, py - 7, 12, 14);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(sx - 5, py - 6, 3, 6);
        ctx.fillStyle = "#0a0e1f";
        ctx.font = "bold 9px monospace";
        ctx.fillText(icon, sx - 2, py + 2);
      }
      if (label) {
        ctx.font = "7px monospace";
        ctx.fillStyle = col;
        ctx.fillText(label, sx - label.length * 2, py - 11);
      }
      // Sparkle bits
      if ((Math.floor(this.animTime * 6) + Math.floor(p.x * 0.1)) % 5 === 0) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(sx + 6, py - 8, 1, 1);
        ctx.fillRect(sx - 8, py + 4, 1, 1);
      }
    }

    // Platforms with variants
    for (const p of this.platforms) {
      const sx = p.x - this.camX;
      if (sx + p.w < 0 || sx > W) continue;
      const v = PLATFORM_VARIANTS[p.kind];
      if (p.kind === "crumble" && p.cracked && Math.floor(this.weatherTime * 12) % 2 === 0) ctx.globalAlpha = 0.6;
      if (p.kind === "cloud") ctx.globalAlpha = p.cloudFade;
      ctx.fillStyle = v.bodyColor;
      ctx.fillRect(sx, p.y, p.w, p.h);
      ctx.fillStyle = v.topColor;
      ctx.fillRect(sx, p.y, p.w, 4);
      ctx.fillStyle = v.edgeColor;
      ctx.fillRect(sx, p.y + p.h - 2, p.w, 2);
      ctx.globalAlpha = 1;
      if (p.kind === "spike") {
        ctx.fillStyle = "#ffd6d6";
        for (let i = 0; i < p.w; i += 8) {
          ctx.beginPath();
          ctx.moveTo(sx + i, p.y);
          ctx.lineTo(sx + i + 4, p.y - 6);
          ctx.lineTo(sx + i + 8, p.y);
          ctx.closePath();
          ctx.fill();
        }
      }
      if (p.kind === "ice") {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillRect(sx + 4, p.y + 1, Math.max(8, p.w * 0.3), 1);
      }
      if (p.kind === "bounce") {
        ctx.fillStyle = "#cfffd0";
        ctx.fillRect(sx + 2, p.y - 3, p.w - 4, 3);
      }
      if (p.kind === "conveyor") {
        ctx.fillStyle = "#000";
        const offset = Math.floor(this.weatherTime * 60 * p.conveyorDir) % 8;
        for (let i = -offset; i < p.w; i += 8) {
          ctx.fillRect(sx + i, p.y + 1, 4, 2);
        }
        // arrow
        ctx.fillStyle = "#fff";
        const ax = sx + p.w/2 + (p.conveyorDir > 0 ? 4 : -4);
        ctx.fillRect(ax - 2, p.y + 6, 4, 2);
      }
      if (p.kind === "crumble" && p.cracked) {
        ctx.strokeStyle = "#3a2010";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx + p.w * 0.3, p.y); ctx.lineTo(sx + p.w * 0.4, p.y + p.h);
        ctx.moveTo(sx + p.w * 0.7, p.y); ctx.lineTo(sx + p.w * 0.6, p.y + p.h);
        ctx.stroke();
      }
      if (p.kind === "ladder") {
        // Vertical ladder attached to the side of a base platform
        ctx.clearRect(sx, p.y, p.w, p.h); // we don't want the body block
        // Rails
        ctx.fillStyle = "#5a3010";
        ctx.fillRect(sx + 1, p.y, 2, p.h);
        ctx.fillRect(sx + p.w - 3, p.y, 2, p.h);
        // Rungs
        ctx.fillStyle = "#c08a40";
        for (let yy = p.y + 4; yy < p.y + p.h - 2; yy += 8) {
          ctx.fillRect(sx + 2, yy, p.w - 4, 2);
        }
        // Faint glow on top to show climb-up zone
        ctx.fillStyle = "rgba(255,232,180,0.25)";
        ctx.fillRect(sx, p.y - 2, p.w, 2);
      }
      if (p.kind === "jumppad") {
        // pulsing arrow
        const pulse = 0.5 + 0.5 * Math.sin(this.weatherTime * 8);
        ctx.fillStyle = `rgba(255,255,255,${0.4 + pulse * 0.5})`;
        const cx = sx + p.w/2;
        ctx.beginPath();
        ctx.moveTo(cx, p.y - 8 - pulse * 3);
        ctx.lineTo(cx - 6, p.y - 1);
        ctx.lineTo(cx + 6, p.y - 1);
        ctx.closePath(); ctx.fill();
      }
      if (p.kind === "antigrav") {
        // floating particles + glow halo
        ctx.fillStyle = "rgba(155,232,255,0.45)";
        for (let i = 0; i < 4; i++) {
          const t = (this.weatherTime + i * 0.6) % 1.5;
          ctx.fillRect(sx + 8 + i * (p.w / 5), p.y - 4 - t * 18, 2, 2);
        }
        ctx.strokeStyle = "rgba(155,232,255,0.6)"; ctx.lineWidth = 1;
        ctx.strokeRect(sx, p.y - 1, p.w, 2);
      }
    }

    for (const p of this.pickups) {
      const sx = p.x - this.camX;
      const c = p.type === "coin" ? COLOR.coin : p.type === "token" ? COLOR.token : COLOR.crystal;
      ctx.fillStyle = "#0008"; ctx.fillRect(sx - 5, p.y - 5, 10, 10);
      ctx.fillStyle = c; ctx.fillRect(sx - 4, p.y - 4, 8, 8);
      ctx.fillStyle = "#fff8"; ctx.fillRect(sx - 3, p.y - 3, 2, 2);
    }

    // Enemies (humanoid rigs)
    for (const e of this.enemies) {
      this.drawEnemy(e);
    }

    // Bullets
    for (const b of this.bullets) {
      const sx = b.x - this.camX;
      ctx.fillStyle = b.color;
      ctx.fillRect(sx - b.r, b.y - b.r, b.r * 2, b.r * 2);
      if (b.r >= 6) { ctx.fillStyle = "#fff8"; ctx.fillRect(sx - 2, b.y - 2, 4, 4); }
    }

    // Dash trail
    for (const t of this.dashTrail) {
      ctx.globalAlpha = t.life * 4 * 0.4;
      ctx.fillStyle = "#7be0ff";
      ctx.fillRect(t.x - this.camX, t.y, this.pw, this.ph);
    }
    ctx.globalAlpha = 1;

    // Player (humanoid)
    this.drawPlayer();

    // Particles
    for (const p of this.particles) {
      const sx = p.x - this.camX;
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(sx, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Weather overlays
    if (this.weather === "rain" || this.weather === "storm") {
      ctx.strokeStyle = this.weather === "storm" ? "rgba(180,200,255,0.7)" : "rgba(180,200,255,0.5)";
      ctx.lineWidth = 1;
      for (const d of this.rainDrops) {
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 3, d.y + 8); ctx.stroke();
      }
      ctx.fillStyle = "rgba(20,20,40,0.25)";
      ctx.fillRect(0, 0, W, H);
    }
    if (this.weather === "snow") {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      for (let i = 0; i < 60; i++) {
        const x = (i * 53 + this.weatherTime * 30) % W;
        const y = (i * 31 + this.weatherTime * 60) % H;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.fillStyle = "rgba(200,220,240,0.18)";
      ctx.fillRect(0, 0, W, H);
    }
    if (this.weather === "fog") {
      ctx.fillStyle = "rgba(220,220,230,0.35)";
      ctx.fillRect(0, 0, W, H);
    }
    if (this.weather === "windy") {
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      for (let i = 0; i < 30; i++) {
        const y = (i * 19 + this.weatherTime * 80) % H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y - 4); ctx.stroke();
      }
    }
    if (this.lightningFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.lightningFlash * 0.6})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.parryFlash > 0) {
      ctx.fillStyle = `rgba(255,255,180,${this.parryFlash * 0.6})`;
      ctx.fillRect(0, 0, W, H);
    }
    // === Tide warning banner
    if (this.tideMsgTimer > 0 && this.tideMsgText) {
      const t = clamp(this.tideMsgTimer / 3.5, 0, 1);
      const pulse = 0.7 + 0.3 * Math.sin(this.weatherTime * 8);
      ctx.save();
      ctx.globalAlpha = t;
      // Banner backdrop
      ctx.fillStyle = "rgba(10,30,60,0.55)";
      ctx.fillRect(0, 110, W, 70);
      ctx.strokeStyle = `rgba(123,224,255,${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 110, W, 70);
      // Title text
      ctx.fillStyle = "#7be0ff";
      ctx.font = "bold 30px monospace";
      const txt = this.tideMsgText;
      const tw = ctx.measureText(txt).width;
      ctx.fillText(txt, (W - tw) / 2, 152);
      // Glow underline
      ctx.fillStyle = `rgba(255,255,255,${pulse * 0.6})`;
      ctx.fillRect((W - tw) / 2, 158, tw, 1);
      ctx.restore();
    }
    if (this.puChrono > 0) {
      // Purple time-warp tint
      ctx.fillStyle = "rgba(167,139,250,0.10)";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(167,139,250,0.55)"; ctx.lineWidth = 1;
      for (const e of this.enemies) {
        if (e.dying) continue;
        const sx = e.x - this.camX - e.w/2;
        ctx.strokeRect(sx - 2, e.y - 2, e.w + 4, e.h + 4);
      }
    }

    // Dim if paused
    if (this.phase === "paused" || this.phase === "inventory") {
      ctx.fillStyle = "rgba(10,14,31,0.7)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  private drawSunMoon(ctx: CanvasRenderingContext2D, dayAmt: number) {
    // Position arcs across sky
    const t = this.cycleTime / DAY_NIGHT_PERIOD;
    const cx = W * 0.85;
    const cy = 90 + Math.sin(t * Math.PI * 2 - Math.PI/2) * 30;
    const isDay = dayAmt > 0.5;
    const r = 26;
    if (isDay) {
      // Sun with sword rays + ∞
      ctx.fillStyle = "#ffd84a";
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ffea7a"; ctx.fillStyle = "#ffea7a"; ctx.lineWidth = 1;
      // 8 sword rays
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + this.weatherTime * 0.2;
        const x1 = cx + Math.cos(ang) * (r + 4);
        const y1 = cy + Math.sin(ang) * (r + 4);
        const x2 = cx + Math.cos(ang) * (r + 22);
        const y2 = cy + Math.sin(ang) * (r + 22);
        // sword shape: thin triangle
        const px = -Math.sin(ang) * 3;
        const py = Math.cos(ang) * 3;
        ctx.beginPath();
        ctx.moveTo(x1 + px, y1 + py);
        ctx.lineTo(x1 - px, y1 - py);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.fill();
        // hilt
        ctx.fillStyle = "#a07020";
        ctx.fillRect(x1 - 2, y1 - 2, 4, 4);
        ctx.fillStyle = "#ffea7a";
      }
      // ∞ symbol in middle
      this.drawInfinity(ctx, cx, cy, 10, "rgba(255,255,255,0.55)");
    } else {
      // Moon (crescent) with ∞
      ctx.fillStyle = "#e8e8f0";
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = lerpColor("#1a2342", "#6cb8ff", dayAmt);
      ctx.beginPath(); ctx.arc(cx + 8, cy - 4, r - 4, 0, Math.PI * 2); ctx.fill();
      this.drawInfinity(ctx, cx - 4, cy + 2, 9, "rgba(120,140,200,0.7)");
    }
  }

  private drawInfinity(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const x = cx + Math.cos(a) * size;
      const y = cy + Math.sin(2 * a) * size * 0.4;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // === Humanoid sprite drawing
  private drawPlayer() {
    const ctx = this.ctx;
    const psx = this.px - this.camX;
    const psy = this.py;
    const flicker = this.pInv > 0 && Math.floor(this.pInv * 30) % 2 === 0;
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(psx + 2, GROUND_Y - 2, this.pw, 3);

    // Spinning roll: draw player as a tumbling ball with motion lines
    if (this.rolling) {
      const cx = psx + this.pw / 2;
      const cy = psy + this.ph - 14;
      const r = 16;
      const spin = this.animTime * 22 * this.pFacing;
      ctx.fillStyle = COLOR.playerOut;
      ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flicker ? "#fff" : COLOR.player;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLOR_PLAYER_HI;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(spin) * 4, cy + Math.sin(spin) * 4, r - 5, 0, Math.PI * 2);
      ctx.fill();
      // Yellow buckle dot orbiting
      ctx.fillStyle = COLOR.playerBuckle;
      const bx = cx + Math.cos(spin * 1.4) * (r - 5);
      const by = cy + Math.sin(spin * 1.4) * (r - 5);
      ctx.fillRect(bx - 2, by - 2, 4, 4);
      // Hat brim flickering through the spin
      ctx.fillStyle = "#3a2a10";
      ctx.fillRect(cx - r + 2, cy + Math.sin(spin) * 6, r * 2 - 4, 2);
      // Motion blur lines behind
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      for (let i = 1; i <= 4; i++) {
        const ox = -this.pFacing * (6 + i * 5);
        ctx.beginPath();
        ctx.moveTo(cx + ox, cy - 6 + i);
        ctx.lineTo(cx + ox - this.pFacing * 10, cy - 6 + i);
        ctx.stroke();
      }
      if (Math.random() < 0.4) this.spawnPuff(this.px + this.pw/2, GROUND_Y - 4, "#cfe");
      return;
    }

    const legPhase = Math.sin(this.animTime * 12);
    const lOff = this.pOnGround ? Math.max(0, legPhase) * 4 : 2;
    const rOff = this.pOnGround ? Math.max(0, -legPhase) * 4 : 2;

    // Legs (dark green pants)
    ctx.fillStyle = COLOR.playerPants;
    ctx.fillRect(psx + 6, psy + this.ph - 8 + lOff, 5, 8);
    ctx.fillRect(psx + this.pw - 11, psy + this.ph - 8 + rOff, 5, 8);
    // Boots
    ctx.fillStyle = "#0d1f12";
    ctx.fillRect(psx + 5, psy + this.ph - 2 + lOff, 7, 2);
    ctx.fillRect(psx + this.pw - 12, psy + this.ph - 2 + rOff, 7, 2);

    // Body (green tunic)
    ctx.fillStyle = flicker ? "#fff" : COLOR.player;
    ctx.fillRect(psx + 4, psy + 14, this.pw - 8, this.ph - 22);
    // Tunic shading (left dark / right highlight)
    if (!flicker) {
      ctx.fillStyle = COLOR.playerOut;
      ctx.fillRect(psx + 4, psy + 14, 2, this.ph - 22);
      ctx.fillStyle = COLOR_PLAYER_HI;
      ctx.fillRect(psx + this.pw - 6, psy + 14, 2, this.ph - 22);
      // Mid stitch
      ctx.fillStyle = COLOR_PLAYER_LO;
      ctx.fillRect(psx + this.pw/2 - 1, psy + 16, 2, this.ph - 26);
    }
    // Belt (dark)
    ctx.fillStyle = "#1a0a05";
    ctx.fillRect(psx + 4, psy + 24, this.pw - 8, 2);
    // Yellow buckle (centered)
    ctx.fillStyle = COLOR.playerBuckle;
    ctx.fillRect(psx + this.pw/2 - 2, psy + 23, 4, 4);
    ctx.fillStyle = "#a07020";
    ctx.fillRect(psx + this.pw/2 - 1, psy + 24, 2, 2);

    // Head (skin)
    ctx.fillStyle = "#fde2a0";
    ctx.fillRect(psx + 8, psy + 6, this.pw - 16, 10);
    // Eye
    ctx.fillStyle = "#000";
    const faceX = this.pFacing > 0 ? psx + this.pw - 11 : psx + 9;
    ctx.fillRect(faceX, psy + 10, 2, 2);

    // Hat (wide brim) with infinity sign
    ctx.fillStyle = "#3a2a10";
    ctx.fillRect(psx + 2, psy + 4, this.pw - 4, 3); // brim
    ctx.fillRect(psx + 7, psy, this.pw - 14, 5);   // crown
    // hat band
    ctx.fillStyle = "#1a0a05";
    ctx.fillRect(psx + 7, psy + 3, this.pw - 14, 1);
    // ∞ on hat
    this.drawInfinity(ctx, psx + this.pw/2, psy + 2, 4, "#fff7d6");

    // Arm carrying weapon
    const activeW = WEAPONS[this.inventory.ranged[this.inventory.activeRanged]];
    ctx.fillStyle = "#fde2a0";
    if (this.pFacing > 0) ctx.fillRect(psx + this.pw - 6, psy + 18, 4, 8);
    else ctx.fillRect(psx + 2, psy + 18, 4, 8);
    // Weapon
    ctx.fillStyle = "#222";
    if (this.pFacing > 0) ctx.fillRect(psx + this.pw, psy + 20, 12, 4);
    else ctx.fillRect(psx - 12, psy + 20, 12, 4);
    ctx.fillStyle = activeW.color;
    if (this.pFacing > 0) ctx.fillRect(psx + this.pw + 10, psy + 20, 2, 2);
    else ctx.fillRect(psx - 12, psy + 20, 2, 2);

    // Melee swing arc
    if (this.meleeSwing > 0) {
      const swing = this.meleeSwing;
      const cx = psx + this.pw/2;
      const cy = psy + this.ph * 0.45;
      const len = 26;
      ctx.strokeStyle = this.parryFlash > 0 ? "#fff" : "#d8e2ff"; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, len, this.pFacing > 0 ? -1.2 : Math.PI - 0.2, this.pFacing > 0 ? 0.2 : Math.PI + 1.2);
      ctx.stroke();
      if (this.parryFlash > 0) {
        // sparks
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = "#fff";
          ctx.fillRect(cx + this.pFacing * (len + i*3), cy - 4 + i*3, 2, 2);
        }
      }
      void swing;
    }

    // Shield bubble
    if (this.shieldActive) {
      ctx.strokeStyle = COLOR.shieldBar; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(psx + this.pw/2, psy + this.ph/2, 30, 0, Math.PI * 2); ctx.stroke();
    }
    // Slow-fall (antigrav) aura — cyan feathers
    if (this.slowFall > 0) {
      ctx.strokeStyle = "rgba(155,232,255,0.7)"; ctx.lineWidth = 1;
      const r = 18 + Math.sin(this.animTime * 8) * 2;
      ctx.beginPath(); ctx.arc(psx + this.pw/2, psy + this.ph/2, r, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const yy = psy + this.ph + ((this.animTime * 30 + i * 8) % 18);
        ctx.fillStyle = "rgba(155,232,255,0.7)";
        ctx.fillRect(psx + 4 + i * 6, yy, 2, 4);
      }
    }
    if (this.odActive) {
      ctx.strokeStyle = COLOR.odBar; ctx.lineWidth = 2;
      ctx.strokeRect(psx - 3, psy - 3, this.pw + 6, this.ph + 6);
    }
    if (this.puInvincible > 0) {
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(psx + this.pw/2, psy + this.ph/2, 26 + Math.sin(this.animTime*10)*2, 0, Math.PI*2); ctx.stroke();
    }

    // Parry "!" indicator
    if (this.parryWindow > 0) {
      ctx.fillStyle = "#ffd84a";
      ctx.font = "bold 18px monospace";
      ctx.fillText("!", psx + this.pw/2 - 3, psy - 14);
    }
    // Charge ring
    const charge = Math.max(this.miscACharge, this.miscBCharge);
    if (charge > 0.05) {
      ctx.strokeStyle = "#ffd84a"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(psx + this.pw/2, psy - 18, 8, -Math.PI/2, -Math.PI/2 + (charge / 1.2) * Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawEnemy(e: Enemy) {
    const ctx = this.ctx;
    const sx = e.x - this.camX - e.w/2;
    // Death glint: bright flash + cross star
    if (e.dying) {
      const a = e.glintTimer / 0.4;
      ctx.globalAlpha = a;
      ctx.fillStyle = "#fff";
      const cx = sx + e.w/2, cy = e.y + e.h/2;
      const len = (1 - a) * 30 + 6;
      ctx.fillRect(cx - len, cy - 1, len*2, 2);
      ctx.fillRect(cx - 1, cy - len, 2, len*2);
      // 4 small stars
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        ctx.fillRect(cx + Math.cos(ang) * len * 0.7, cy + Math.sin(ang) * len * 0.7, 3, 3);
      }
      ctx.globalAlpha = 1;
      return;
    }
    const baseCol = ENEMY_COLOR[e.type];
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(sx + 2, GROUND_Y - 2, e.w, 3);

    // Legs (humanoid for ground enemies)
    if (!e.flying) {
      const ph = Math.sin(e.legPhase + e.x * 0.1);
      const lOff = Math.max(0, ph) * 3;
      const rOff = Math.max(0, -ph) * 3;
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(sx + 5, e.y + e.h - 8 + lOff, 5, 8);
      ctx.fillRect(sx + e.w - 10, e.y + e.h - 8 + rOff, 5, 8);
    }

    // Body
    ctx.fillStyle = e.hurtFlash > 0 ? "#fff" : baseCol;
    ctx.fillRect(sx + 3, e.y + 12, e.w - 6, e.h - 22);
    // Body shading (left strip)
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(sx + 3, e.y + 12, 2, e.h - 22);
    // Body highlight (right strip)
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(sx + e.w - 5, e.y + 12, 2, e.h - 22);
    // Shoulder pads
    ctx.fillStyle = "#1a0a05";
    ctx.fillRect(sx + 2, e.y + 12, e.w - 4, 3);
    // Chest plate (V stripe)
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(sx + e.w/2 - 1, e.y + 14, 2, 8);
    // Belt
    ctx.fillStyle = "#1a0a05";
    ctx.fillRect(sx + 3, e.y + e.h - 14, e.w - 6, 2);
    // Belt buckle
    ctx.fillStyle = "#7a5a2a";
    ctx.fillRect(sx + e.w/2 - 2, e.y + e.h - 14, 4, 2);
    // Arms
    ctx.fillStyle = baseCol;
    ctx.fillRect(sx + 1, e.y + 15, 3, e.h - 28);
    ctx.fillRect(sx + e.w - 4, e.y + 15, 3, e.h - 28);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(sx + 1, e.y + 15, 1, e.h - 28);
    // Head
    ctx.fillStyle = "#e8c89a";
    ctx.fillRect(sx + 6, e.y + 4, e.w - 12, 10);
    // Head shading
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(sx + 6, e.y + 4, 2, 10);
    // Jaw shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(sx + 6, e.y + 12, e.w - 12, 2);
    // Eyes (red glow)
    ctx.fillStyle = "#ff3030";
    const eyeX = e.facing > 0 ? sx + e.w - 9 : sx + 7;
    ctx.fillRect(eyeX, e.y + 8, 2, 2);
    ctx.fillStyle = "rgba(255,80,80,0.4)";
    ctx.fillRect(eyeX - 1, e.y + 7, 4, 4);

    // Type-specific accents
    if (e.type === "shooter" || e.type === "shooterElite" || e.type === "sniper") {
      ctx.fillStyle = "#222";
      if (e.facing > 0) ctx.fillRect(sx + e.w, e.y + e.h * 0.45, 12, 3);
      else ctx.fillRect(sx - 12, e.y + e.h * 0.45, 12, 3);
    }
    if (e.type === "shanker" || e.type === "shankerSwift") {
      // Hood
      ctx.fillStyle = "#3a1a4a";
      ctx.fillRect(sx + 4, e.y + 2, e.w - 8, 6);
      // Dagger
      ctx.fillStyle = "#d8e2ff";
      if (e.facing > 0) ctx.fillRect(sx + e.w, e.y + e.h * 0.4, 8, 2);
      else ctx.fillRect(sx - 8, e.y + e.h * 0.4, 8, 2);
    }
    if (e.type === "shooterElite") {
      // Helmet
      ctx.fillStyle = "#444"; ctx.fillRect(sx + 4, e.y + 2, e.w - 8, 5);
    } else if (e.type === "brute" || e.type === "bruteHeavy") {
      // bulky armor pad
      ctx.fillStyle = "#000"; ctx.fillRect(sx + 2, e.y + 14, e.w - 4, 4);
    } else if (e.type === "rider") {
      // Bike base
      ctx.fillStyle = "#222"; ctx.fillRect(sx, e.y + e.h - 4, e.w, 6);
      ctx.fillStyle = "#ffd166"; ctx.fillRect(sx + e.w - 6, e.y + 4, 2, 2);
    } else if (e.type === "bomber") {
      // wings
      ctx.fillStyle = "#444"; ctx.fillRect(sx - 6, e.y + e.h/2, e.w + 12, 3);
    } else if (e.type === "sniper") {
      if (e.charging) {
        ctx.strokeStyle = "rgba(255,60,60,0.7)"; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx + e.w/2, e.y + e.h * 0.4);
        ctx.lineTo(sx + e.w/2 + e.facing * 800, e.y + e.h * 0.4);
        ctx.stroke();
      }
    }

    // Disabled (grabbed) overlay
    if (e.disabled > 0 || e.grabbed) {
      ctx.strokeStyle = "#ffd84a"; ctx.lineWidth = 2;
      ctx.strokeRect(sx - 2, e.y - 2, e.w + 4, e.h + 4);
    }

    // HP bar
    ctx.fillStyle = "#0008"; ctx.fillRect(sx, e.y - 8, e.w, 4);
    ctx.fillStyle = COLOR.hpBar; ctx.fillRect(sx, e.y - 8, (e.hp / e.maxHp) * e.w, 4);
  }

  private drawMountains(color: string, parallax: number, baseY: number, height: number) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    const off = -((this.camX * parallax) % 200);
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = off - 200; x <= W + 200; x += 100) {
      ctx.lineTo(x, baseY - Math.sin(x * 0.01) * height * 0.3);
      ctx.lineTo(x + 50, baseY - height);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }
}

// dummy referenced inside resolveCollisionsY to silence unused-var lint when inlined
const prevBottomDummy: any = undefined;

function lerpColor(a: string, b: string, t: number) {
  const pa = parseHex(a), pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
function parseHex(h: string): [number, number, number] {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0,2), 16), parseInt(s.slice(2,4), 16), parseInt(s.slice(4,6), 16)];
}