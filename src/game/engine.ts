import { audio } from "./audio";
import { WEAPONS, WeaponId, STARTING_LOADOUT, STARTING_OWNED } from "./weapons";
import { PLATFORM_VARIANTS, PlatformKind, pickPlatformKind } from "./platforms";

// ============================================================
// PATH OF THE UNDYING TIDAL CARDINALITY — Core Engine (Wave 3)
// Adds: pause, inventory, weapon switching/hotbar, enemy variants,
// platform variants, redesigned HUD signaling.
// ============================================================

export type Phase = "menu" | "playing" | "paused" | "inventory" | "dead";

const W = 960;
const H = 540;
const GROUND_Y = 460;
const PX_PER_METER = 32;

const COLOR = {
  sky1: "#1a2342",
  sky2: "#2a3a6a",
  mtnFar: "#2c3a5e",
  mtnMid: "#3a4a72",
  mtnNear: "#4a5a82",
  ground: "#3b2a1a",
  groundTop: "#5a8a3a",
  player: "#f6c453",
  playerOut: "#3a2a10",
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

// Enemy palette
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
  fireM: boolean; fireMPressed: boolean;
  melee: boolean; meleePressed: boolean;
  shield: boolean; shieldPressed: boolean;
  overdrive: boolean; overdrivePressed: boolean;
  inventoryPressed: boolean;
  pausePressed: boolean;
  interactPressed: boolean;
  slot1Pressed: boolean; slot2Pressed: boolean; slot3Pressed: boolean;
  wheelDelta: number;
}

interface Bullet {
  x: number; y: number; vx: number; vy: number;
  dmg: number; life: number; friendly: boolean; r: number; pierce: number;
  color: string;
}
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; }
interface Pickup { x: number; y: number; vy: number; type: "coin" | "token" | "crystal"; value: number; life: number; }

interface Platform {
  x: number; y: number; w: number; h: number;
  kind: PlatformKind;
  // Crumble
  cracked: boolean; crumbleTimer: number; falling: boolean; fallVy: number;
  // Moving
  baseX: number; baseY: number; phase: number; horizontal: boolean;
}

type EnemyType =
  | "shooter" | "shooterElite"
  | "shanker" | "shankerSwift"
  | "brute"   | "bruteHeavy"
  | "rider"   | "bomber" | "sniper";

interface Enemy {
  type: EnemyType;
  x: number; y: number; vx: number; vy: number;
  w: number; h: number; hp: number; maxHp: number;
  onGround: boolean; facing: 1 | -1;
  fireCd: number; aiTimer: number; targetDx: number;
  hurtFlash: number;
  // burst / charge
  burstLeft: number; burstCd: number;
  chargeTime: number; charging: boolean;
  flying: boolean; baseY: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randi = (a: number, b: number) => Math.floor(rand(a, b + 1));
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export interface InventoryState {
  owned: WeaponId[];
  loadout: [WeaponId, WeaponId, WeaponId];
  active: 0 | 1 | 2;
  consumables: { medkit: number; ammoPack: number };
  augments: string[];
}

export interface GameStats {
  hp: number; maxHp: number;
  ammo: number; grenades: number;
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
  description: string;       // dynamic bottom-bar text
  inventory: InventoryState;
  phase: Phase;
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  phase: Phase = "menu";
  onStatsChange: (s: GameStats) => void;
  onPhaseChange: (p: Phase) => void;

  // Input
  private input: Input = {
    left: false, right: false, up: false, down: false,
    jump: false, jumpPressed: false,
    dash: false, dashPressed: false,
    fireR: false, fireRPressed: false,
    fireM: false, fireMPressed: false,
    melee: false, meleePressed: false,
    shield: false, shieldPressed: false,
    overdrive: false, overdrivePressed: false,
    inventoryPressed: false,
    pausePressed: false,
    interactPressed: false,
    slot1Pressed: false, slot2Pressed: false, slot3Pressed: false,
    wheelDelta: 0,
  };
  private keys = new Set<string>();

  // Player
  private px = 200; private py = 0; private pvx = 0; private pvy = 0;
  private pw = 28; private ph = 40;
  private pOnGround = false;
  private pJumps = 0; private maxJumps = 2;
  private pFacing: 1 | -1 = 1;
  private pHp = 123; private pMaxHp = 123;
  private pInv = 0;
  private dashCharges = 2; private dashRecharge = 0; private dashTime = 0;
  private rolling = false; private rollTime = 0;
  private slamming = false;
  private shieldActive = false; private shieldTime = 0; private shieldCd = 0;
  private odBar = 0; private odActive = false; private odTime = 0;
  private fireCdR = 0; private fireCdM = 0; private fireCdMisc = 0;
  private currentPlatform: Platform | null = null;

  // Pacing — builds while untouched, drops on hit, plus a permanent ramp by distance
  private untouchedTime = 0;     // seconds since last hit
  private momentum = 0;          // 0..1 bonus from staying clean
  private paceMult = 1;          // emitted to HUD

  // Inventory
  private inventory: InventoryState = {
    owned: [...STARTING_OWNED],
    loadout: [...STARTING_LOADOUT] as [WeaponId, WeaponId, WeaponId],
    active: 0,
    consumables: { medkit: 2, ammoPack: 3 },
    augments: [],
  };

  // World
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
  private ammo = 240; private grenades = 5;
  private timeAlive = 0;
  private spawnTimer = 0;
  private warning: string | null = null;
  private warnTimer = 0;
  private description = "WASD MOVE • SPACE JUMP×2 • SHIFT DASH • J FIRE • K GRENADE • L MELEE • 1/2/3 SWITCH • Y INVENTORY • P PAUSE";
  private descTimer = 0;
  private screenShake = 0;
  private weatherTime = 0;
  // === Animation
  private animTime = 0;
  private meleeSwing = 0; // 0..1 visual swing
  // === Weather
  private weather: "clear" | "rain" | "snow" | "storm" = "clear";
  private weatherSwitch = 8;
  private rainDrops: { x:number; y:number; vy:number }[] = [];
  private lightningFlash = 0;
  private nextLightning = 6;
  // === Power-ups (active timers, 5s each)
  private puDamage = 0; private puSpeed = 0; private puInvincible = 0; private puForesight = 0;
  // === World pickups on ground (coins/tokens/crystals/powerups) — different list separate from drops
  private worldPickups: { x:number; y:number; type: "coin"|"token"|"crystal"|"pu_dmg"|"pu_spd"|"pu_inv"|"pu_for"; value:number }[] = [];
  private worldPickupNextX = 600;
  // === Landmarks (safezones)
  private landmarks: { x:number; kind:"main"|"ally"|"shady"; w:number }[] = [];
  private inSafeZone = false;
  // Overdrive previous max HP cache
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
    if (["w","a","s","d"," ","j","k","l","i","f","y","p","e","h","r","shift","1","2","3"].includes(k)) e.preventDefault();
    if (this.keys.has(k)) return;
    this.keys.add(k);
    switch (k) {
      case "a": this.input.left = true; break;
      case "d": this.input.right = true; break;
      case "w": this.input.up = true; break;
      case "s": this.input.down = true; break;
      case " ": this.input.jump = true; this.input.jumpPressed = true; break;
      case "shift": this.input.dash = true; this.input.dashPressed = true; break;
      case "j": this.input.fireR = true; this.input.fireRPressed = true; break;
      case "k": this.input.fireM = true; this.input.fireMPressed = true; break;
      case "l": this.input.melee = true; this.input.meleePressed = true; break;
      case "i": this.input.shield = true; this.input.shieldPressed = true; break;
      case "f": this.input.overdrive = true; this.input.overdrivePressed = true; break;
      case "y": this.input.inventoryPressed = true; break;
      case "p": this.input.pausePressed = true; break;
      case "e": this.input.interactPressed = true; break;
      case "1": this.input.slot1Pressed = true; break;
      case "2": this.input.slot2Pressed = true; break;
      case "3": this.input.slot3Pressed = true; break;
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
      case "j": this.input.fireR = false; break;
      case "k": this.input.fireM = false; break;
      case "l": this.input.melee = false; break;
      case "i": this.input.shield = false; break;
      case "f": this.input.overdrive = false; break;
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
    this.pHp = this.pMaxHp; this.pInv = 0; this.pFacing = 1;
    this.dashCharges = 2; this.dashRecharge = 0; this.dashTime = 0;
    this.shieldActive = false; this.shieldTime = 0; this.shieldCd = 0;
    this.odBar = 0; this.odActive = false; this.odTime = 0;
    this.camX = 0; this.worldX = 0;
    this.platforms = []; this.enemies = []; this.bullets = []; this.particles = []; this.pickups = [];
    this.comboTimer = 0; this.comboCount = 0;
    this.dmgRecentTimer = 0; this.dmgRecent = 0;
    this.totalDmg = 0; this.kills = 0; this.bossKills = 0;
    this.coins = 100; this.tokens = 1; this.crystals = 0;
    this.ammo = 240; this.grenades = 5;
    this.timeAlive = 0; this.spawnTimer = 1.5;
    this.warning = null; this.warnTimer = 0; this.screenShake = 0;
    this.untouchedTime = 0; this.momentum = 0; this.paceMult = 1;
    this.animTime = 0; this.meleeSwing = 0;
    this.weather = "clear"; this.weatherSwitch = 8; this.rainDrops = []; this.lightningFlash = 0; this.nextLightning = 6;
    this.puDamage = 0; this.puSpeed = 0; this.puInvincible = 0; this.puForesight = 0;
    this.worldPickups = []; this.worldPickupNextX = 600;
    this.landmarks = []; this.inSafeZone = false; this.odPrevMaxHp = this.pMaxHp;
    this.inventory = {
      owned: [...STARTING_OWNED],
      loadout: [...STARTING_LOADOUT] as [WeaponId, WeaponId, WeaponId],
      active: 0,
      consumables: { medkit: 2, ammoPack: 3 },
      augments: [],
    };
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
  equipToSlot(weaponId: WeaponId, slot: 0 | 1 | 2) {
    if (!this.inventory.owned.includes(weaponId)) return;
    this.inventory.loadout[slot] = weaponId;
    this.emitStats();
  }
  setActiveSlot(slot: 0 | 1 | 2) {
    this.inventory.active = slot;
    this.emitStats();
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

  private frame = (t: number) => {
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    // Always handle pause/inv toggles even when paused
    if (this.input.pausePressed) { this.input.pausePressed = false; this.togglePause(); }
    if (this.input.inventoryPressed) { this.input.inventoryPressed = false; this.toggleInventory(); }
    if (this.phase === "playing") this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    this.timeAlive += dt;
    this.weatherTime += dt;

    // Weapon switching
    if (this.input.slot1Pressed) { this.inventory.active = 0; this.flashDescription(`EQUIPPED ${WEAPONS[this.inventory.loadout[0]].name}`); }
    if (this.input.slot2Pressed) { this.inventory.active = 1; this.flashDescription(`EQUIPPED ${WEAPONS[this.inventory.loadout[1]].name}`); }
    if (this.input.slot3Pressed) { this.inventory.active = 2; this.flashDescription(`EQUIPPED ${WEAPONS[this.inventory.loadout[2]].name}`); }
    this.input.slot1Pressed = this.input.slot2Pressed = this.input.slot3Pressed = false;
    if (Math.abs(this.input.wheelDelta) > 30) {
      const dir = this.input.wheelDelta > 0 ? 1 : -1;
      this.inventory.active = ((this.inventory.active + dir + 3) % 3) as 0 | 1 | 2;
      this.flashDescription(`EQUIPPED ${WEAPONS[this.inventory.loadout[this.inventory.active]].name}`);
      this.input.wheelDelta = 0;
    }
    this.input.wheelDelta *= 0.5;

    // Pacing — momentum builds while untouched, decays on hit (handled in damagePlayer)
    this.untouchedTime += dt;
    // Build momentum after a 3s grace, ramp to full over ~25s untouched
    if (this.untouchedTime > 3) {
      this.momentum = Math.min(1, this.momentum + dt / 25);
    }
    const meters = this.worldX / PX_PER_METER;
    // Permanent distance ramp: +0% at 0m, +60% by 3000m, +100% by 8000m (soft cap)
    const distRamp = Math.min(1.0, meters / 8000) * 1.0 + Math.min(0.6, meters / 5000 * 0.6);
    const distanceMult = 1 + Math.min(1.0, meters / 8000);
    // Untouched bonus up to +50%
    const momentumMult = 1 + this.momentum * 0.5;
    this.paceMult = distanceMult * momentumMult;

    // Movement
    let speed = 5 * PX_PER_METER * this.paceMult;
    if (this.rolling) speed *= 1.6;
    if (this.odActive) speed *= 1.25;
    if (this.puSpeed > 0) speed *= 2;
    if (this.weather === "rain") speed *= 0.92;
    if (this.weather === "storm") speed *= 0.85;
    this.animTime += dt * (Math.abs(this.pvx) > 10 ? 1 : 0.4);

    // Friction from current platform (ice = slippery)
    const friction = this.currentPlatform ? PLATFORM_VARIANTS[this.currentPlatform.kind].friction : 1.0;

    if (this.input.left) { this.pFacing = -1; this.pvx = friction < 0.5 ? this.pvx + (-speed - this.pvx) * friction : -speed; }
    else if (this.input.right) { this.pFacing = 1; this.pvx = friction < 0.5 ? this.pvx + (speed - this.pvx) * friction : speed; }
    else { this.pvx = friction < 0.5 ? this.pvx * (1 - friction * 0.3) : 0; }

    // Dash
    if (this.input.dashPressed && this.dashCharges > 0 && this.dashTime <= 0) {
      if (this.input.down && this.pOnGround) { this.rolling = true; this.rollTime = 0.5; }
      else {
        this.dashTime = 0.18;
        this.pInv = Math.max(this.pInv, 0.18);
        this.dashCharges--;
        if (this.dashRecharge <= 0) this.dashRecharge = 2;
      }
    }
    if (this.dashTime > 0) { this.pvx = this.pFacing * speed * 2.6; this.dashTime -= dt; }
    if (this.rolling) { this.rollTime -= dt; this.pvx = this.pFacing * speed * 1.6; if (this.rollTime <= 0) this.rolling = false; }
    if (this.dashRecharge > 0) {
      this.dashRecharge -= dt;
      if (this.dashRecharge <= 0 && this.dashCharges < 2) {
        this.dashCharges++;
        if (this.dashCharges < 2) this.dashRecharge = 2;
      }
    }

    if (this.input.jumpPressed && this.pJumps < this.maxJumps) {
      this.pvy = -560; this.pJumps++;
      this.spawnPuff(this.px + this.pw/2, this.py + this.ph, "#cfe");
    }
    if (!this.pOnGround && this.input.down && !this.slamming) { this.slamming = true; this.pvy = 900; }

    this.pvy += 1700 * dt;
    if (this.pvy > 1200) this.pvy = 1200;

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

    if (this.input.shieldPressed && this.shieldCd <= 0) {
      this.shieldActive = true; this.shieldTime = 5; this.shieldCd = 6;
      this.flashDescription("SHIELD UP — 95% damage reduction");
    }
    if (this.shieldActive) { this.shieldTime -= dt; if (this.shieldTime <= 0) this.shieldActive = false; }
    if (this.shieldCd > 0) this.shieldCd -= dt;

    if (this.input.overdrivePressed && this.odBar >= 1 && !this.odActive) {
      this.odActive = true; this.odTime = 6; this.odBar = 0;
      // Double offensive stats AND double max HP + heal proportionally
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
    if (this.fireCdMisc > 0) this.fireCdMisc -= dt;
    if (this.pInv > 0) this.pInv -= dt;
    if (this.descTimer > 0) this.descTimer -= dt;
    if (this.meleeSwing > 0) this.meleeSwing = Math.max(0, this.meleeSwing - dt * 4);
    if (this.puDamage > 0) this.puDamage -= dt;
    if (this.puSpeed > 0) this.puSpeed -= dt;
    if (this.puInvincible > 0) { this.puInvincible -= dt; this.pInv = Math.max(this.pInv, 0.1); }
    if (this.puForesight > 0) this.puForesight -= dt;

    // J = fire ACTIVE ranged weapon only (knife in slot still acts melee)
    if (this.input.fireR && this.fireCdR <= 0) {
      const w = WEAPONS[this.inventory.loadout[this.inventory.active]];
      const dmgMult = (this.odActive ? 2 : 1) * (this.puDamage > 0 ? 2 : 1);
      if (w.kind === "ranged" && this.ammo >= w.ammoPerShot) {
        this.fireCdR = w.fireCd;
        this.ammo -= w.ammoPerShot;
        for (let p = 0; p < w.pellets; p++) {
          const ang = (Math.random() - 0.5) * w.spread;
          const cs = Math.cos(ang), sn = Math.sin(ang);
          this.bullets.push({
            x: this.px + this.pw/2, y: this.py + this.ph * 0.4,
            vx: this.pFacing * w.speed * cs, vy: w.speed * sn,
            dmg: w.dmg * dmgMult, life: 0.9, friendly: true, r: 4, pierce: w.pierce,
            color: w.color,
          });
        }
        audio.play("fire");
        this.spawnPuff(this.px + (this.pFacing > 0 ? this.pw : 0), this.py + this.ph * 0.4, w.color);
      } else if (w.kind === "melee") {
        this.fireCdR = w.fireCd;
        this.meleeSwing = 1;
        const dmg = w.dmg * dmgMult;
        this.enemies.forEach(e => {
          if (Math.sign(e.x - this.px) === this.pFacing &&
              Math.abs(e.x - this.px) < 70 && Math.abs(e.y - this.py) < 55) this.damageEnemy(e, dmg);
        });
        audio.play("fire");
      }
    }
    // Always-melee L (knife) — animated
    if (this.input.meleePressed && this.fireCdM <= 0) {
      this.fireCdM = WEAPONS.knife.fireCd;
      this.meleeSwing = 1;
      const dmg = WEAPONS.knife.dmg * (this.odActive ? 2 : 1) * (this.puDamage > 0 ? 2 : 1);
      this.enemies.forEach(e => {
        if (Math.sign(e.x - this.px) === this.pFacing &&
            Math.abs(e.x - this.px) < 60 && Math.abs(e.y - this.py) < 50) this.damageEnemy(e, dmg);
      });
      audio.play("fire");
    }
    // Always-grenade K
    if (this.input.fireMPressed && this.fireCdMisc <= 0 && this.grenades > 0) {
      this.fireCdMisc = 1;
      this.grenades--;
      this.bullets.push({
        x: this.px + this.pw/2, y: this.py + this.ph * 0.3,
        vx: this.pFacing * 360, vy: -380,
        dmg: WEAPONS.grenade.dmg * (this.odActive ? 2 : 1), life: 2, friendly: true, r: 8, pierce: 99,
        color: WEAPONS.grenade.color,
      });
    }

    this.input.jumpPressed = false; this.input.dashPressed = false;
    this.input.fireRPressed = false; this.input.fireMPressed = false;
    this.input.meleePressed = false; this.input.shieldPressed = false;
    this.input.overdrivePressed = false;
    this.input.interactPressed = false;

    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.comboCount = 0; }
    if (this.dmgRecentTimer > 0) { this.dmgRecentTimer -= dt; if (this.dmgRecentTimer <= 0) this.dmgRecent = 0; }

    // Bullets
    this.bullets = this.bullets.filter(b => {
      b.life -= dt;
      if (b.life <= 0) return false;
      if (b.friendly && b.r >= 8) b.vy += 1500 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < this.camX - 100 || b.x > this.camX + W + 200) return false;
      if (b.r >= 8 && b.y > GROUND_Y) { this.explode(b.x, b.y, b.dmg, 90); return false; }
      if (b.friendly) {
        for (const e of this.enemies) {
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
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt;
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

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      const meters = this.worldX / PX_PER_METER;
      const ramp = clamp(1 - meters / 3000, 0.2, 1);
      this.spawnTimer = rand(1.4, 2.6) * ramp;
    }

    // World streaming
    while (this.platforms.length === 0 || this.lastPlatformX() < this.camX + W + 600) {
      this.spawnPlatformAt(this.lastPlatformX() + rand(140, 280));
    }
    this.platforms = this.platforms.filter(p => p.x + p.w > this.camX - 200 && p.y < H + 200);

    // === World ground pickups (coins/tokens/crystals/powerups along the road)
    while (this.worldPickupNextX < this.camX + W + 400) {
      const x = this.worldPickupNextX;
      const r = Math.random();
      let type: any = "coin", value = randi(1, 30);
      if (r < 0.05) { // 5% power-up
        const pr = Math.random();
        type = pr < 0.25 ? "pu_dmg" : pr < 0.5 ? "pu_spd" : pr < 0.75 ? "pu_inv" : "pu_for";
        value = 5; // seconds
      } else if (r < 0.10) { type = "crystal"; value = randi(1, 3); }
      else if (r < 0.20) { type = "token"; value = randi(1, 2); }
      else { type = "coin"; value = randi(1, 30); }
      this.worldPickups.push({ x, y: GROUND_Y - 14, type, value });
      this.worldPickupNextX += randi(140, 320);
    }
    // Pick up world items on touch
    this.worldPickups = this.worldPickups.filter(p => {
      if (p.x < this.camX - 200) return false;
      const dx = (this.px + this.pw/2) - p.x;
      const dy = (this.py + this.ph/2) - p.y;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 28) {
        if (p.type === "coin") { this.coins += p.value; }
        else if (p.type === "token") { this.tokens += p.value; }
        else if (p.type === "crystal") { this.crystals += p.value; }
        else if (p.type === "pu_dmg") { this.puDamage = 5; this.flashDescription("POWER-UP — 2× DAMAGE (5s)"); }
        else if (p.type === "pu_spd") { this.puSpeed = 5; this.flashDescription("POWER-UP — 2× SPEED (5s)"); }
        else if (p.type === "pu_inv") { this.puInvincible = 5; this.flashDescription("POWER-UP — INVINCIBLE (5s)"); }
        else if (p.type === "pu_for") { this.puForesight = 5; this.flashDescription("POWER-UP — FORESIGHT (5s)"); }
        return false;
      }
      return true;
    });

    // === Landmarks (safezones)
    const metersNow = Math.floor(this.worldX / PX_PER_METER);
    // Spawn next landmark roughly every 1000m (main+ally), 7777m (shady) — predicted positions
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
    // Determine if player is inside a safezone
    this.inSafeZone = this.landmarks.some(l =>
      this.px + this.pw > l.x && this.px < l.x + l.w);

    // === Weather
    this.weatherSwitch -= dt;
    if (this.weatherSwitch <= 0) {
      const opts: any[] = ["clear","clear","rain","snow","storm"];
      this.weather = opts[Math.floor(Math.random() * opts.length)];
      this.weatherSwitch = rand(20, 45);
      this.flashDescription(`WEATHER — ${this.weather.toUpperCase()}`);
    }
    // Rain particle init
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
        // Strike a random visible enemy or near player
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

  private flashDescription(text: string) { this.description = text; this.descTimer = 3; }

  private lastPlatformX() {
    if (!this.platforms.length) return this.px + 200;
    const last = this.platforms[this.platforms.length - 1];
    return last.x + last.w;
  }

  private spawnPlatformAt(x: number) {
    if (Math.random() < 0.5) return;
    const meters = this.worldX / PX_PER_METER;
    const kind = pickPlatformKind(meters);
    const w = randi(80, 180);
    const y = randi(280, 400);
    this.platforms.push({
      x, y, w, h: 16,
      kind,
      cracked: false, crumbleTimer: 0, falling: false, fallVy: 0,
      baseX: x, baseY: y, phase: Math.random() * Math.PI * 2,
      horizontal: Math.random() < 0.5,
    });
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
    }
  }

  private resolveCollisionsX() {
    if (this.px < 0) this.px = 0;
    for (const p of this.platforms) {
      if (p.falling) continue;
      if (this.px + this.pw > p.x && this.px < p.x + p.w &&
          this.py + this.ph > p.y && this.py < p.y + p.h) {
        if (this.pvx > 0) this.px = p.x - this.pw;
        else if (this.pvx < 0) this.px = p.x + p.w;
      }
    }
  }
  private resolveCollisionsY() {
    if (this.py + this.ph >= GROUND_Y) {
      this.py = GROUND_Y - this.ph; this.pvy = 0; this.pOnGround = true; this.pJumps = 0;
    }
    for (const p of this.platforms) {
      if (p.falling) continue;
      if (this.px + this.pw > p.x && this.px < p.x + p.w &&
          this.py + this.ph > p.y && this.py < p.y + p.h) {
        if (this.pvy > 0) {
          this.py = p.y - this.ph; this.pvy = 0; this.pOnGround = true; this.pJumps = 0;
          this.currentPlatform = p;
          if (p.kind === "spike") this.damagePlayer(PLATFORM_VARIANTS.spike.damageOnTop);
          if (p.kind === "crumble" && !p.cracked) { p.cracked = true; p.crumbleTimer = 0.5; }
        } else if (this.pvy < 0) {
          this.py = p.y + p.h; this.pvy = 0;
        }
      }
    }
  }

  private spawnEnemy() {
    const meters = this.worldX / PX_PER_METER;
    const spawnX = this.camX + W + rand(40, 200);

    // Type pool by distance
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

    this.enemies.push({
      type, x: spawnX, y: baseY, vx: 0, vy: 0,
      w: base.w, h: base.h, hp: base.hp, maxHp: base.hp,
      onGround: !flying, facing: -1,
      fireCd: rand(0.6, 1.4), aiTimer: 0, targetDx: 0, hurtFlash: 0,
      burstLeft: 0, burstCd: 0, chargeTime: 0, charging: false,
      flying, baseY,
    });
    if (meters > 500 && Math.random() < 0.3) this.spawnEnemy();
  }

  private updateEnemies(dt: number) {
    this.enemies = this.enemies.filter(e => {
      if (e.x < this.camX - 300) return false;
      e.hurtFlash = Math.max(0, e.hurtFlash - dt);
      const dx = (this.px + this.pw/2) - e.x;
      e.facing = dx > 0 ? 1 : -1;
      const dist = Math.abs(dx);

      switch (e.type) {
        case "shanker":
          e.vx = Math.sign(dx) * 130;
          break;
        case "shankerSwift":
          e.vx = Math.sign(dx) * 220;
          // leap occasionally
          if (e.onGround && Math.random() < 0.01 && dist < 200) { e.vy = -480; e.onGround = false; }
          break;
        case "shooter":
          if (dist > 320) e.vx = Math.sign(dx) * 80;
          else if (dist < 220) e.vx = -Math.sign(dx) * 60;
          else e.vx = 0;
          e.fireCd -= dt;
          if (e.fireCd <= 0 && dist < 460) {
            e.fireCd = rand(1.0, 1.8);
            this.spawnEnemyBullet(e, 420, 8);
          }
          break;
        case "shooterElite":
          if (dist > 320) e.vx = Math.sign(dx) * 90;
          else if (dist < 220) e.vx = -Math.sign(dx) * 70;
          else e.vx = 0;
          e.fireCd -= dt; e.burstCd -= dt;
          if (e.burstLeft > 0 && e.burstCd <= 0) {
            this.spawnEnemyBullet(e, 480, 10);
            e.burstLeft--; e.burstCd = 0.12;
          } else if (e.fireCd <= 0 && dist < 480) {
            e.fireCd = rand(1.6, 2.4); e.burstLeft = 3; e.burstCd = 0;
          }
          break;
        case "brute":
          e.vx = Math.sign(dx) * 50;
          e.fireCd -= dt;
          if (e.fireCd <= 0 && dist < 380) {
            e.fireCd = rand(1.6, 2.4);
            for (let i = -1; i <= 1; i++) this.spawnEnemyBullet(e, 360, 12, i * 60);
          }
          break;
        case "bruteHeavy":
          e.vx = Math.sign(dx) * 35;
          e.fireCd -= dt;
          if (e.fireCd <= 0 && dist < 220 && e.onGround) {
            e.fireCd = 3.0;
            // ground pound shockwave
            this.screenShake = Math.max(this.screenShake, 8);
            for (let i = -2; i <= 2; i++) this.spawnEnemyBullet(e, 420, 16, i * 20);
          }
          break;
        case "rider":
          // hover-bike pass
          e.vx = -260; // moves left across screen
          e.fireCd -= dt;
          if (e.fireCd <= 0 && dist < 600) {
            e.fireCd = 0.8;
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
            e.fireCd = 1.2;
            this.bullets.push({
              x: e.x, y: e.y + e.h, vx: -60, vy: 80, dmg: 22, life: 4, friendly: false, r: 6, pierce: 0, color: "#ffb347",
            });
          }
          break;
        case "sniper":
          e.vx = 0;
          if (!e.charging && dist < 700) {
            e.charging = true; e.chargeTime = 1.2;
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

      // === Separation: don't stick to player or each other
      const distToP = Math.abs((this.px + this.pw/2) - e.x);
      if (distToP < 36 && (e.type === "shooter" || e.type === "shooterElite" || e.type === "sniper")) {
        // ranged enemies kite away from melee range
        e.vx = -Math.sign(dx) * 160;
      }
      for (const o of this.enemies) {
        if (o === e || o.flying !== e.flying) continue;
        const sep = e.x - o.x;
        if (Math.abs(sep) < 28 && Math.abs(e.y - o.y) < 30) {
          e.vx += Math.sign(sep || 1) * 80 * dt * 60;
        }
      }
      // Occasional melee swipe for ranged shooters when adjacent
      if ((e.type === "shooter" || e.type === "shooterElite") && distToP < 44 && e.fireCd <= 0.2) {
        e.fireCd = 0.9;
        if (Math.abs(e.y - this.py) < 50) this.damagePlayer(10);
      }

      if (!e.flying) {
        e.vy += 1700 * dt;
        e.y += e.vy * dt;
        if (e.y + e.h >= GROUND_Y) { e.y = GROUND_Y - e.h; e.vy = 0; e.onGround = true; }
      }
      e.x += e.vx * dt;

      // Touch damage with cooldown so they can't spam
      const touching = e.x - e.w/2 < this.px + this.pw && e.x + e.w/2 > this.px &&
                       e.y < this.py + this.ph && e.y + e.h > this.py;
      if (touching) {
        if (e.type === "shanker" || e.type === "shankerSwift") this.damagePlayer(8);
        else if (e.type === "rider") this.damagePlayer(15);
        else if (e.type === "bruteHeavy" || e.type === "brute") this.damagePlayer(12);
      }
      return e.hp > 0;
    });
  }

  private spawnEnemyBullet(e: Enemy, speed: number, dmg: number, vyOffset = 0) {
    this.bullets.push({
      x: e.x, y: e.y + e.h * 0.4,
      vx: e.facing * speed, vy: vyOffset,
      dmg, life: 1.5, friendly: false, r: 3, pierce: 0,
      color: "#ff6a6a",
    });
  }

  private damageEnemy(e: Enemy, dmg: number) {
    e.hp -= dmg;
    e.hurtFlash = 0.12;
    this.totalDmg += dmg;
    this.dmgRecent += dmg; this.dmgRecentTimer = 2;
    this.odBar = clamp(this.odBar + dmg / 1200, 0, 1);
    for (let i = 0; i < 4; i++) this.particles.push({
      x: e.x, y: e.y + e.h/2, vx: rand(-120, 120), vy: rand(-200, -40),
      life: 0.4, max: 0.4, color: "#ffd166", size: 2,
    });
    if (e.hp <= 0) {
      this.kills++;
      this.comboCount++; this.comboTimer = 3;
      audio.play("kill");
      this.dropLoot(e);
      for (let i = 0; i < 12; i++) this.particles.push({
        x: e.x, y: e.y + e.h/2, vx: rand(-260, 260), vy: rand(-300, -40),
        life: 0.7, max: 0.7, color: COLOR.bulletEnemy, size: 3,
      });
    }
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
    let actual = dmg;
    if (this.shieldActive) actual *= 0.05;
    this.pHp -= actual;
    this.pInv = 0.4;
    this.screenShake = Math.max(this.screenShake, 6);
    // Pace penalty: lose ~35% of momentum per hit, reset untouched timer
    this.untouchedTime = 0;
    this.momentum = Math.max(0, this.momentum - 0.35);
    this.flashDescription(`HIT — pace ${(this.paceMult).toFixed(2)}× (rebuild by avoiding damage)`);
  }

  private spawnPuff(x: number, y: number, color: string) {
    for (let i = 0; i < 4; i++) this.particles.push({
      x, y, vx: rand(-60, 60), vy: rand(-160, -20),
      life: 0.35, max: 0.35, color, size: 2,
    });
  }

  private die() {
    audio.play("death");
    audio.stopMusic();
    this.phase = "dead";
    this.onPhaseChange(this.phase);
  }

  private emitStats() {
    const meters = this.worldX / PX_PER_METER;
    const rank = this.computeRank(meters);
    const desc = this.descTimer > 0
      ? this.description
      : (this.warning ? `! ${this.warning} !` : `${WEAPONS[this.inventory.loadout[this.inventory.active]].name.toUpperCase()} EQUIPPED  •  ${Math.floor(meters)}m  •  PACE ${this.paceMult.toFixed(2)}×  •  ♪ ${audio.currentTrackName()}`);
    this.onStatsChange({
      hp: this.pHp, maxHp: this.pMaxHp,
      ammo: this.ammo, grenades: this.grenades,
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

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, COLOR.sky1);
    grad.addColorStop(1, COLOR.sky2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 40; i++) {
      const x = (i * 137 + this.camX * 0.05) % W;
      const y = (i * 73) % 240;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(x, y, 2, 2);
    }
    for (let i = 0; i < 5; i++) {
      const bx = (i * 220 + this.weatherTime * 30) % (W + 80) - 40;
      const by = 80 + Math.sin(this.weatherTime + i) * 10;
      ctx.fillStyle = "#0a0e1f";
      ctx.fillRect(bx, by, 6, 2);
      ctx.fillRect(bx - 3, by + 2, 4, 2);
      ctx.fillRect(bx + 5, by + 2, 4, 2);
    }

    ctx.translate(shakeX, shakeY);

    this.drawMountains(COLOR.mtnFar, 0.15, 360, 80);
    this.drawMountains(COLOR.mtnMid, 0.35, 380, 110);
    this.drawMountains(COLOR.mtnNear, 0.6, 410, 140);

    ctx.fillStyle = COLOR.ground;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = COLOR.groundTop;
    ctx.fillRect(0, GROUND_Y, W, 6);
    const tileOffset = Math.floor(this.camX) % 32;
    ctx.fillStyle = "#2a1a0a";
    for (let x = -tileOffset; x < W; x += 32) ctx.fillRect(x, GROUND_Y + 6, 1, H - GROUND_Y);

    // === Landmarks (safezones)
    for (const l of this.landmarks) {
      const sx = l.x - this.camX;
      if (sx + l.w < 0 || sx > W) continue;
      // Safezone glow
      ctx.fillStyle = "rgba(123,224,255,0.10)";
      ctx.fillRect(sx, GROUND_Y - 120, l.w, 120);
      ctx.strokeStyle = "rgba(123,224,255,0.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, GROUND_Y - 120, l.w, 120);
      // Building
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

    // === World pickups along the road
    for (const p of this.worldPickups) {
      const sx = p.x - this.camX;
      if (sx < -20 || sx > W + 20) continue;
      const float = Math.sin(this.animTime * 4 + p.x * 0.01) * 2;
      let col = "#ffd84a";
      let label = "";
      if (p.type === "coin") col = "#ffd84a";
      else if (p.type === "token") col = "#7be0ff";
      else if (p.type === "crystal") col = "#d97bff";
      else if (p.type === "pu_dmg") { col = "#ff5a5a"; label = "DMG"; }
      else if (p.type === "pu_spd") { col = "#7bff8a"; label = "SPD"; }
      else if (p.type === "pu_inv") { col = "#fff7d6"; label = "INV"; }
      else if (p.type === "pu_for") { col = "#a78bfa"; label = "FOR"; }
      ctx.fillStyle = "#0008"; ctx.fillRect(sx - 6, p.y + float - 6, 12, 12);
      ctx.fillStyle = col; ctx.fillRect(sx - 5, p.y + float - 5, 10, 10);
      ctx.fillStyle = "#fff"; ctx.fillRect(sx - 4, p.y + float - 4, 2, 2);
      if (label) {
        ctx.font = "8px monospace";
        ctx.fillStyle = col;
        ctx.fillText(label, sx - 8, p.y + float - 10);
      }
    }


    // Platforms with variants
    for (const p of this.platforms) {
      const sx = p.x - this.camX;
      if (sx + p.w < 0 || sx > W) continue;
      const v = PLATFORM_VARIANTS[p.kind];
      // crumble flicker
      if (p.kind === "crumble" && p.cracked && Math.floor(this.weatherTime * 12) % 2 === 0) {
        ctx.globalAlpha = 0.6;
      }
      ctx.fillStyle = v.bodyColor;
      ctx.fillRect(sx, p.y, p.w, p.h);
      ctx.fillStyle = v.topColor;
      ctx.fillRect(sx, p.y, p.w, 4);
      ctx.fillStyle = v.edgeColor;
      ctx.fillRect(sx, p.y + p.h - 2, p.w, 2);
      ctx.globalAlpha = 1;
      // Spike teeth
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
      // Ice sheen
      if (p.kind === "ice") {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillRect(sx + 4, p.y + 1, Math.max(8, p.w * 0.3), 1);
      }
      // Crumble cracks
      if (p.kind === "crumble" && p.cracked) {
        ctx.strokeStyle = "#3a2010";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx + p.w * 0.3, p.y); ctx.lineTo(sx + p.w * 0.4, p.y + p.h);
        ctx.moveTo(sx + p.w * 0.7, p.y); ctx.lineTo(sx + p.w * 0.6, p.y + p.h);
        ctx.stroke();
      }
    }

    for (const p of this.pickups) {
      const sx = p.x - this.camX;
      const c = p.type === "coin" ? COLOR.coin : p.type === "token" ? COLOR.token : COLOR.crystal;
      ctx.fillStyle = "#0008"; ctx.fillRect(sx - 5, p.y - 5, 10, 10);
      ctx.fillStyle = c; ctx.fillRect(sx - 4, p.y - 4, 8, 8);
      ctx.fillStyle = "#fff8"; ctx.fillRect(sx - 3, p.y - 3, 2, 2);
    }

    // Enemies (variant-aware)
    for (const e of this.enemies) {
      const sx = e.x - this.camX - e.w/2;
      ctx.fillStyle = COLOR.shadow;
      ctx.fillRect(sx + 2, e.y + 2, e.w, e.h);
      const baseCol = ENEMY_COLOR[e.type];
      ctx.fillStyle = e.hurtFlash > 0 ? "#fff" : baseCol;
      ctx.fillRect(sx, e.y, e.w, e.h);
      // outline accents per variant
      if (e.type === "shooterElite") {
        ctx.fillStyle = "#fff"; ctx.fillRect(sx, e.y, e.w, 2); ctx.fillRect(sx, e.y + e.h - 2, e.w, 2);
      } else if (e.type === "bruteHeavy") {
        ctx.fillStyle = "#000"; ctx.fillRect(sx + 4, e.y + 4, e.w - 8, 4);
      } else if (e.type === "rider") {
        ctx.fillStyle = "#222"; ctx.fillRect(sx, e.y + e.h - 2, e.w, 4);
        ctx.fillStyle = "#ffd166"; ctx.fillRect(sx + e.w - 6, e.y + 4, 2, 2);
      } else if (e.type === "bomber") {
        ctx.fillStyle = "#444"; ctx.fillRect(sx - 6, e.y + e.h/2, e.w + 12, 3);
      } else if (e.type === "sniper") {
        if (e.charging) {
          ctx.strokeStyle = "rgba(255,60,60,0.7)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx + e.w/2, e.y + e.h * 0.4);
          ctx.lineTo(sx + e.w/2 + e.facing * 800, e.y + e.h * 0.4);
          ctx.stroke();
        }
      }
      ctx.fillStyle = "#fff";
      const eyeX = e.facing > 0 ? sx + e.w - 8 : sx + 4;
      ctx.fillRect(eyeX, e.y + 8, 4, 4);
      ctx.fillStyle = "#0008"; ctx.fillRect(sx, e.y - 8, e.w, 4);
      ctx.fillStyle = COLOR.hpBar; ctx.fillRect(sx, e.y - 8, (e.hp / e.maxHp) * e.w, 4);
    }

    for (const b of this.bullets) {
      const sx = b.x - this.camX;
      ctx.fillStyle = b.friendly ? b.color : COLOR.bulletEnemy;
      ctx.fillRect(sx - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }

    // Player
    const psx = this.px - this.camX;
    ctx.fillStyle = COLOR.shadow;
    ctx.fillRect(psx + 3, this.py + 3, this.pw, this.ph);
    const flicker = this.pInv > 0 && Math.floor(this.pInv * 30) % 2 === 0;
    ctx.fillStyle = flicker ? "#fff" : COLOR.player;
    ctx.fillRect(psx, this.py, this.pw, this.ph);
    ctx.fillStyle = COLOR.playerOut;
    ctx.fillRect(psx, this.py, this.pw, 2);
    ctx.fillRect(psx, this.py + this.ph - 2, this.pw, 2);
    ctx.fillStyle = "#000";
    const faceX = this.pFacing > 0 ? psx + this.pw - 9 : psx + 5;
    ctx.fillRect(faceX, this.py + 12, 4, 4);
    // gun (color reflects equipped)
    const eqColor = WEAPONS[this.inventory.loadout[this.inventory.active]].color;
    ctx.fillStyle = "#222";
    if (this.pFacing > 0) ctx.fillRect(psx + this.pw, this.py + this.ph * 0.45, 12, 4);
    else ctx.fillRect(psx - 12, this.py + this.ph * 0.45, 12, 4);
    ctx.fillStyle = eqColor;
    if (this.pFacing > 0) ctx.fillRect(psx + this.pw + 10, this.py + this.ph * 0.45, 2, 2);
    else ctx.fillRect(psx - 12, this.py + this.ph * 0.45, 2, 2);
    if (this.shieldActive) {
      ctx.strokeStyle = COLOR.shieldBar; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(psx + this.pw/2, this.py + this.ph/2, 30, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.odActive) {
      ctx.strokeStyle = COLOR.odBar; ctx.lineWidth = 2;
      ctx.strokeRect(psx - 3, this.py - 3, this.pw + 6, this.ph + 6);
    }

    for (const p of this.particles) {
      const sx = p.x - this.camX;
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(sx, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Pause/Inventory dim
    if (this.phase === "paused" || this.phase === "inventory") {
      ctx.fillStyle = "rgba(10,14,31,0.7)";
      ctx.fillRect(0, 0, W, H);
    }
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
