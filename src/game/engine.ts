import { audio } from "./audio";

// ============================================================
// PATH OF THE UNDYING TIDAL CARDINALITY — Core Engine
// Wave 1 + 2: movement, combat foundation, HUD, basic enemies, music + SFX.
// More features (full shops, all bosses, augments) layered on later.
// ============================================================

export type Phase = "menu" | "playing" | "dead";

const W = 960;   // logical canvas width
const H = 540;   // logical canvas height
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
  platform: "#6b4226",
  platformTop: "#8a5a3a",
  player: "#f6c453",
  playerOut: "#3a2a10",
  pistol: "#ffd166",
  knife: "#d8e2ff",
  enemy1: "#e85d3a",   // shooter
  enemy2: "#a83af0",   // shanker
  enemy3: "#8a4a2a",   // brute
  bullet: "#fff199",
  bulletEnemy: "#ff6a6a",
  hpBar: "#e84545",
  shieldBar: "#4ac6ff",
  odBar: "#c87bff",
  ammoBar: "#ffd166",
  text: "#fff7d6",
  textDim: "#b8b08a",
  shadow: "#0a0e1f",
  coin: "#ffd84a",
  token: "#7be0ff",
  crystal: "#d97bff",
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
  inventory: boolean; inventoryPressed: boolean;
  interact: boolean; interactPressed: boolean;
}

interface Bullet {
  x: number; y: number; vx: number; vy: number;
  dmg: number; life: number; friendly: boolean; r: number; pierce: number;
}
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; }
interface Pickup { x: number; y: number; vy: number; type: "coin" | "token" | "crystal"; value: number; life: number; }
interface Platform { x: number; y: number; w: number; h: number; }
interface Enemy {
  type: "shooter" | "shanker" | "brute";
  x: number; y: number; vx: number; vy: number;
  w: number; h: number; hp: number; maxHp: number;
  onGround: boolean; facing: 1 | -1;
  fireCd: number; aiTimer: number; targetDx: number;
  hurtFlash: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randi = (a: number, b: number) => Math.floor(rand(a, b + 1));

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
    inventory: false, inventoryPressed: false,
    interact: false, interactPressed: false,
  };
  private keys = new Set<string>();

  // Player
  private px = 200; private py = 0; private pvx = 0; private pvy = 0;
  private pw = 28; private ph = 40;
  private pOnGround = false;
  private pJumps = 0; private maxJumps = 2;
  private pFacing: 1 | -1 = 1;
  private pHp = 123; private pMaxHp = 123;
  private pInv = 0; // i-frames
  private dashCharges = 2; private dashRecharge = 0; private dashTime = 0;
  private rolling = false; private rollTime = 0;
  private slamming = false;
  private shieldActive = false; private shieldTime = 0; private shieldCd = 0;
  private odBar = 0; private odActive = false; private odTime = 0;
  private fireCdR = 0; private fireCdM = 0; private fireCdMisc = 0;

  // World
  private camX = 0;
  private worldX = 0; // total distance traveled by player in pixels
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
  private ammo = 100; private grenades = 5;
  private timeAlive = 0;
  private spawnTimer = 0;
  private warning: string | null = null;
  private warnTimer = 0;
  private screenShake = 0;
  private weatherTime = 0;

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

  // ---- Input ----
  private attachInput() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }
  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    cancelAnimationFrame(this.rafId);
  }
  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (["w","a","s","d"," ","j","k","l","i","f","y","e","h","r","shift"].includes(k)) e.preventDefault();
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
      case "y": this.input.inventory = true; this.input.inventoryPressed = true; break;
      case "e": this.input.interact = true; this.input.interactPressed = true; break;
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
      case "y": this.input.inventory = false; break;
      case "e": this.input.interact = false; break;
    }
  };

  // ---- Lifecycle ----
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
    this.ammo = 100; this.grenades = 5;
    this.timeAlive = 0; this.spawnTimer = 1.5;
    this.warning = null; this.warnTimer = 0; this.screenShake = 0;
    // Seed initial platforms
    for (let i = 0; i < 12; i++) this.maybeSpawnPlatformAhead(i * 250);
  }
  goToMenu() {
    this.phase = "menu";
    this.onPhaseChange(this.phase);
    audio.stopMusic();
  }

  private frame = (t: number) => {
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    if (this.phase === "playing") this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame(this.frame);
  };

  // ---- Update ----
  private update(dt: number) {
    this.timeAlive += dt;
    this.weatherTime += dt;

    // Player movement
    let speed = 5 * PX_PER_METER; // 5 m/s -> px/s
    if (this.rolling) speed *= 1.6;
    if (this.odActive) speed *= 1.15;

    const wantLeft = this.input.left;
    const wantRight = this.input.right;
    if (wantLeft) { this.pvx = -speed; this.pFacing = -1; }
    else if (wantRight) { this.pvx = speed; this.pFacing = 1; }
    else this.pvx = 0;

    // Dash
    if (this.input.dashPressed && this.dashCharges > 0 && this.dashTime <= 0) {
      // Roll if Shift+S
      if (this.input.down && this.pOnGround) {
        this.rolling = true; this.rollTime = 0.5;
      } else {
        this.dashTime = 0.18;
        this.pInv = Math.max(this.pInv, 0.18);
        this.dashCharges--;
        if (this.dashRecharge <= 0) this.dashRecharge = 2;
      }
    }
    if (this.dashTime > 0) {
      this.pvx = this.pFacing * speed * 2.6;
      this.dashTime -= dt;
    }
    if (this.rolling) {
      this.rollTime -= dt;
      this.pvx = this.pFacing * speed * 1.6;
      if (this.rollTime <= 0) this.rolling = false;
    }
    if (this.dashRecharge > 0) {
      this.dashRecharge -= dt;
      if (this.dashRecharge <= 0 && this.dashCharges < 2) {
        this.dashCharges++;
        if (this.dashCharges < 2) this.dashRecharge = 2;
      }
    }

    // Jump / double jump
    if (this.input.jumpPressed && this.pJumps < this.maxJumps) {
      this.pvy = -560;
      this.pJumps++;
      this.spawnPuff(this.px + this.pw/2, this.py + this.ph, "#cfe");
    }
    // Ground slam
    if (!this.pOnGround && this.input.down && !this.slamming) {
      this.slamming = true;
      this.pvy = 900;
    }

    // Gravity
    this.pvy += 1700 * dt;
    if (this.pvy > 1200) this.pvy = 1200;

    // Apply movement + collision (axis separated)
    this.px += this.pvx * dt;
    this.resolveCollisionsX();
    this.py += this.pvy * dt;
    this.pOnGround = false;
    this.resolveCollisionsY();
    if (this.pOnGround && this.slamming) {
      this.slamming = false;
      this.screenShake = 12;
      // Slam shockwave damages nearby enemies
      this.enemies.forEach(e => {
        if (Math.abs(e.x - this.px) < 120 && Math.abs(e.y - this.py) < 80) {
          this.damageEnemy(e, 40);
        }
      });
      for (let i = 0; i < 14; i++) this.spawnPuff(this.px + this.pw/2, this.py + this.ph, "#cfe");
    }

    // Distance
    if (this.pvx > 0) this.worldX += this.pvx * dt;
    this.camX = this.px - W * 0.35;
    if (this.camX < 0) this.camX = 0;

    // Shield
    if (this.input.shieldPressed && this.shieldCd <= 0) {
      this.shieldActive = true; this.shieldTime = 5; this.shieldCd = 6;
    }
    if (this.shieldActive) {
      this.shieldTime -= dt;
      if (this.shieldTime <= 0) this.shieldActive = false;
    }
    if (this.shieldCd > 0) this.shieldCd -= dt;

    // Overdrive
    if (this.input.overdrivePressed && this.odBar >= 1 && !this.odActive) {
      this.odActive = true; this.odTime = 6; this.odBar = 0;
    }
    if (this.odActive) {
      this.odTime -= dt;
      if (this.odTime <= 0) this.odActive = false;
    }

    // Cooldowns
    if (this.fireCdR > 0) this.fireCdR -= dt;
    if (this.fireCdM > 0) this.fireCdM -= dt;
    if (this.fireCdMisc > 0) this.fireCdMisc -= dt;
    if (this.pInv > 0) this.pInv -= dt;

    // Fire ranged (pistol)
    if (this.input.fireR && this.fireCdR <= 0 && this.ammo > 0) {
      this.fireCdR = 0.2;
      this.ammo--;
      const dmg = (40) * (this.odActive ? 2 : 1);
      this.bullets.push({
        x: this.px + this.pw/2, y: this.py + this.ph * 0.4,
        vx: this.pFacing * 720, vy: 0,
        dmg, life: 0.8, friendly: true, r: 4, pierce: 0,
      });
      audio.play("fire");
      this.spawnPuff(this.px + (this.pFacing > 0 ? this.pw : 0), this.py + this.ph * 0.4, "#ffd166");
    }
    // Melee (knife)
    if (this.input.meleePressed && this.fireCdM <= 0) {
      this.fireCdM = 0.35;
      const dmg = 25 * (this.odActive ? 2 : 1);
      this.enemies.forEach(e => {
        if (Math.sign(e.x - this.px) === this.pFacing &&
            Math.abs(e.x - this.px) < 60 && Math.abs(e.y - this.py) < 50) {
          this.damageEnemy(e, dmg);
        }
      });
      audio.play("fire");
    }
    // Misc (grenade)
    if (this.input.fireMPressed && this.fireCdMisc <= 0 && this.grenades > 0) {
      this.fireCdMisc = 1;
      this.grenades--;
      this.bullets.push({
        x: this.px + this.pw/2, y: this.py + this.ph * 0.3,
        vx: this.pFacing * 360, vy: -380,
        dmg: 100 * (this.odActive ? 2 : 1), life: 2, friendly: true, r: 8, pierce: 99,
      });
    }

    // Reset pressed flags
    this.input.jumpPressed = false; this.input.dashPressed = false;
    this.input.fireRPressed = false; this.input.fireMPressed = false;
    this.input.meleePressed = false; this.input.shieldPressed = false;
    this.input.overdrivePressed = false; this.input.inventoryPressed = false;
    this.input.interactPressed = false;

    // Combo / damage timers
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.comboCount = 0; }
    if (this.dmgRecentTimer > 0) { this.dmgRecentTimer -= dt; if (this.dmgRecentTimer <= 0) this.dmgRecent = 0; }

    // Bullets
    this.bullets = this.bullets.filter(b => {
      b.life -= dt;
      if (b.life <= 0) return false;
      if (!b.friendly) b.vy += 0; // straight for now
      else if (b.r >= 8) b.vy += 1500 * dt; // grenades arc
      b.x += b.vx * dt; b.y += b.vy * dt;
      // Off screen cull
      if (b.x < this.camX - 100 || b.x > this.camX + W + 100) return false;
      // Ground hit (grenade explode)
      if (b.r >= 8 && b.y > GROUND_Y) {
        this.explode(b.x, b.y, b.dmg, 90);
        return false;
      }
      // Hit enemies
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

    // Particles
    this.particles = this.particles.filter(p => {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt;
      return p.life > 0;
    });

    // Pickups
    this.pickups = this.pickups.filter(p => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.vy += 1400 * dt;
      p.y += p.vy * dt;
      if (p.y > GROUND_Y - 8) { p.y = GROUND_Y - 8; p.vy = 0; }
      // Magnet
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

    // Enemies
    this.updateEnemies(dt);
    // Spawning
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      const meters = this.worldX / PX_PER_METER;
      const ramp = clamp(1 - meters / 3000, 0.2, 1);
      this.spawnTimer = rand(1.4, 2.6) * ramp;
    }

    // World streaming — keep platforms ahead
    while (this.platforms.length === 0 || this.platforms[this.platforms.length - 1].x < this.camX + W + 600) {
      const lastX = this.platforms.length ? this.platforms[this.platforms.length - 1].x + this.platforms[this.platforms.length - 1].w : this.px + 200;
      this.maybeSpawnPlatformAhead(lastX + rand(120, 260));
    }
    // Cull behind
    this.platforms = this.platforms.filter(p => p.x + p.w > this.camX - 200);

    // Warning sample
    this.warnTimer -= dt;
    if (this.warnTimer <= 0) {
      this.warnTimer = 1;
      const meters = Math.floor(this.worldX / PX_PER_METER);
      const toShop = 1000 - (meters % 1000);
      const toBoss = 5555 - (meters % 5555);
      if (toBoss < 80) this.warning = `BOSS APPROACHING — ${toBoss}m`;
      else if (toShop < 60) this.warning = `Main shop — ${toShop}m`;
      else this.warning = null;
    }

    if (this.screenShake > 0) this.screenShake -= dt * 30;

    // Death check
    if (this.pHp <= 0) {
      this.die();
    }

    this.emitStats();
  }

  private resolveCollisionsX() {
    if (this.px < 0) this.px = 0;
    for (const p of this.platforms) {
      if (this.px + this.pw > p.x && this.px < p.x + p.w &&
          this.py + this.ph > p.y && this.py < p.y + p.h) {
        if (this.pvx > 0) this.px = p.x - this.pw;
        else if (this.pvx < 0) this.px = p.x + p.w;
      }
    }
  }
  private resolveCollisionsY() {
    // Ground
    if (this.py + this.ph >= GROUND_Y) {
      this.py = GROUND_Y - this.ph;
      this.pvy = 0;
      this.pOnGround = true;
      this.pJumps = 0;
    }
    for (const p of this.platforms) {
      if (this.px + this.pw > p.x && this.px < p.x + p.w &&
          this.py + this.ph > p.y && this.py < p.y + p.h) {
        if (this.pvy > 0) {
          this.py = p.y - this.ph; this.pvy = 0; this.pOnGround = true; this.pJumps = 0;
        } else if (this.pvy < 0) {
          this.py = p.y + p.h; this.pvy = 0;
        }
      }
    }
  }

  private maybeSpawnPlatformAhead(x: number) {
    if (Math.random() < 0.55) {
      const w = randi(80, 180);
      const y = randi(280, 400);
      this.platforms.push({ x, y, w, h: 16 });
    }
  }

  private spawnEnemy() {
    const meters = this.worldX / PX_PER_METER;
    const r = Math.random();
    const spawnX = this.camX + W + rand(40, 200);
    let type: Enemy["type"] = "shooter";
    if (r < 0.2) type = "brute";
    else if (r < 0.7) type = "shanker";
    else type = "shooter";
    const base = {
      shooter: { hp: 100, w: 26, h: 40 },
      shanker: { hp: 60, w: 24, h: 36 },
      brute: { hp: 320, w: 38, h: 48 },
    }[type];
    this.enemies.push({
      type, x: spawnX, y: GROUND_Y - base.h, vx: 0, vy: 0,
      w: base.w, h: base.h, hp: base.hp, maxHp: base.hp,
      onGround: true, facing: -1,
      fireCd: rand(0.6, 1.4), aiTimer: 0, targetDx: 0, hurtFlash: 0,
    });
    // small ramp: occasionally spawn 2nd if deep
    if (meters > 500 && Math.random() < 0.3) this.spawnEnemy();
  }

  private updateEnemies(dt: number) {
    this.enemies = this.enemies.filter(e => {
      // Cull far behind
      if (e.x < this.camX - 300) return false;
      e.hurtFlash = Math.max(0, e.hurtFlash - dt);
      const dx = (this.px + this.pw/2) - e.x;
      e.facing = dx > 0 ? 1 : -1;
      const dist = Math.abs(dx);

      // Type AI
      if (e.type === "shanker") {
        // Chase
        const desired = Math.sign(dx) * 130;
        e.vx = desired;
      } else if (e.type === "shooter") {
        // Maintain ~280px distance
        if (dist > 320) e.vx = Math.sign(dx) * 80;
        else if (dist < 220) e.vx = -Math.sign(dx) * 60;
        else e.vx = 0;
        e.fireCd -= dt;
        if (e.fireCd <= 0 && dist < 460) {
          e.fireCd = rand(1.0, 1.8);
          this.bullets.push({
            x: e.x, y: e.y + e.h * 0.4,
            vx: e.facing * 420, vy: 0,
            dmg: 8, life: 1.2, friendly: false, r: 3, pierce: 0,
          });
        }
      } else if (e.type === "brute") {
        e.vx = Math.sign(dx) * 50;
        e.fireCd -= dt;
        if (e.fireCd <= 0 && dist < 380) {
          e.fireCd = rand(1.6, 2.4);
          // Shotgun burst
          for (let i = -1; i <= 1; i++) {
            this.bullets.push({
              x: e.x, y: e.y + e.h * 0.4,
              vx: e.facing * 360 + i * 30, vy: i * 60,
              dmg: 12, life: 1, friendly: false, r: 3, pierce: 0,
            });
          }
        }
      }

      // gravity
      e.vy += 1700 * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.y + e.h >= GROUND_Y) { e.y = GROUND_Y - e.h; e.vy = 0; e.onGround = true; }

      // Touch damage (shanker)
      if (e.type === "shanker" && dist < 24 && Math.abs((e.y) - this.py) < 30) {
        this.damagePlayer(8);
      }
      return e.hp > 0;
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
    // Coins: 30% normal, 60% brute
    const coinChance = e.type === "brute" ? 0.6 : 0.3;
    if (Math.random() < coinChance) {
      const v = e.type === "brute" ? randi(100, 400) : randi(50, 100);
      this.pickups.push({ x: e.x, y: e.y, vy: -260, type: "coin", value: v, life: 12 });
    }
    if (Math.random() < 0.06) {
      this.pickups.push({ x: e.x + 8, y: e.y, vy: -240, type: "token", value: randi(30, 45), life: 12 });
    }
    if (Math.random() < 0.025) {
      this.pickups.push({ x: e.x - 8, y: e.y, vy: -260, type: "crystal", value: randi(1, 10), life: 12 });
    }
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
    if (this.pInv > 0) return;
    let actual = dmg;
    if (this.shieldActive) actual *= 0.05;
    this.pHp -= actual;
    this.pInv = 0.4;
    this.screenShake = Math.max(this.screenShake, 6);
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

  // ---- Stats emission for HUD ----
  private emitStats() {
    const meters = this.worldX / PX_PER_METER;
    const rank = this.computeRank(meters);
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
    });
  }

  computeRank(meters: number): { label: string; color: string } {
    const minutes = this.timeAlive / 60;
    if (this.bossKills >= 20 || this.coins >= 1_000_000 || meters >= 1_000_000 || this.totalDmg >= 100_000_000 || minutes >= 60)
      return { label: "SON 😭👍", color: "rank-son" };
    if (this.bossKills >= 10 || this.totalDmg >= 300_000 || minutes >= 45)
      return { label: "S", color: "text-[hsl(var(--rank-s))]" };
    if (this.bossKills >= 5 || meters >= 500_000 || minutes >= 30)
      return { label: "A", color: "text-[hsl(var(--rank-a))]" };
    if (this.bossKills >= 3 || minutes >= 20)
      return { label: "B", color: "text-[hsl(var(--rank-b))]" };
    if (this.bossKills >= 2 || minutes >= 15)
      return { label: "C", color: "text-[hsl(var(--rank-c))]" };
    if (this.bossKills >= 1 || minutes >= 10)
      return { label: "D", color: "text-[hsl(var(--rank-d))]" };
    return { label: "F", color: "text-[hsl(var(--rank-f))]" };
  }

  // ---- Render ----
  private render() {
    const ctx = this.ctx;
    // Resize handling — render at logical W×H, scale with CSS
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    let shakeX = 0, shakeY = 0;
    if (this.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * this.screenShake;
      shakeY = (Math.random() - 0.5) * this.screenShake;
    }
    ctx.clearRect(0, 0, W, H);

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, COLOR.sky1);
    grad.addColorStop(1, COLOR.sky2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (let i = 0; i < 40; i++) {
      const x = (i * 137 + this.camX * 0.05) % W;
      const y = (i * 73) % 240;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(x, y, 2, 2);
    }
    // Birds (moving)
    for (let i = 0; i < 5; i++) {
      const bx = (i * 220 + this.weatherTime * 30) % (W + 80) - 40;
      const by = 80 + Math.sin(this.weatherTime + i) * 10;
      ctx.fillStyle = "#0a0e1f";
      ctx.fillRect(bx, by, 6, 2);
      ctx.fillRect(bx - 3, by + 2, 4, 2);
      ctx.fillRect(bx + 5, by + 2, 4, 2);
    }

    ctx.translate(shakeX, shakeY);

    // Mountains parallax (3 layers)
    this.drawMountains(COLOR.mtnFar, 0.15, 360, 80);
    this.drawMountains(COLOR.mtnMid, 0.35, 380, 110);
    this.drawMountains(COLOR.mtnNear, 0.6, 410, 140);

    // Ground
    ctx.fillStyle = COLOR.ground;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = COLOR.groundTop;
    ctx.fillRect(0, GROUND_Y, W, 6);
    // ground tile lines
    const tileOffset = Math.floor(this.camX) % 32;
    ctx.fillStyle = "#2a1a0a";
    for (let x = -tileOffset; x < W; x += 32) ctx.fillRect(x, GROUND_Y + 6, 1, H - GROUND_Y);

    // Platforms
    for (const p of this.platforms) {
      const sx = p.x - this.camX;
      if (sx + p.w < 0 || sx > W) continue;
      ctx.fillStyle = COLOR.platform;
      ctx.fillRect(sx, p.y, p.w, p.h);
      ctx.fillStyle = COLOR.platformTop;
      ctx.fillRect(sx, p.y, p.w, 4);
    }

    // Pickups
    for (const p of this.pickups) {
      const sx = p.x - this.camX;
      const c = p.type === "coin" ? COLOR.coin : p.type === "token" ? COLOR.token : COLOR.crystal;
      ctx.fillStyle = "#0008"; ctx.fillRect(sx - 5, p.y - 5, 10, 10);
      ctx.fillStyle = c; ctx.fillRect(sx - 4, p.y - 4, 8, 8);
      ctx.fillStyle = "#fff8"; ctx.fillRect(sx - 3, p.y - 3, 2, 2);
    }

    // Enemies
    for (const e of this.enemies) {
      const sx = e.x - this.camX - e.w/2;
      ctx.fillStyle = COLOR.shadow;
      ctx.fillRect(sx + 2, e.y + 2, e.w, e.h);
      ctx.fillStyle = e.hurtFlash > 0 ? "#fff" :
        e.type === "shooter" ? COLOR.enemy1 : e.type === "shanker" ? COLOR.enemy2 : COLOR.enemy3;
      ctx.fillRect(sx, e.y, e.w, e.h);
      // eyes
      ctx.fillStyle = "#fff";
      const eyeX = e.facing > 0 ? sx + e.w - 8 : sx + 4;
      ctx.fillRect(eyeX, e.y + 8, 4, 4);
      // hp
      ctx.fillStyle = "#0008"; ctx.fillRect(sx, e.y - 8, e.w, 4);
      ctx.fillStyle = COLOR.hpBar; ctx.fillRect(sx, e.y - 8, (e.hp / e.maxHp) * e.w, 4);
    }

    // Bullets
    for (const b of this.bullets) {
      const sx = b.x - this.camX;
      ctx.fillStyle = b.friendly ? COLOR.bullet : COLOR.bulletEnemy;
      ctx.fillRect(sx - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }

    // Player
    const psx = this.px - this.camX;
    ctx.fillStyle = COLOR.shadow;
    ctx.fillRect(psx + 3, this.py + 3, this.pw, this.ph);
    const flicker = this.pInv > 0 && Math.floor(this.pInv * 30) % 2 === 0;
    ctx.fillStyle = flicker ? "#fff" : COLOR.player;
    ctx.fillRect(psx, this.py, this.pw, this.ph);
    // outline
    ctx.fillStyle = COLOR.playerOut;
    ctx.fillRect(psx, this.py, this.pw, 2);
    ctx.fillRect(psx, this.py + this.ph - 2, this.pw, 2);
    // face
    ctx.fillStyle = "#000";
    const faceX = this.pFacing > 0 ? psx + this.pw - 9 : psx + 5;
    ctx.fillRect(faceX, this.py + 12, 4, 4);
    // gun
    ctx.fillStyle = "#222";
    if (this.pFacing > 0) ctx.fillRect(psx + this.pw, this.py + this.ph * 0.45, 12, 4);
    else ctx.fillRect(psx - 12, this.py + this.ph * 0.45, 12, 4);
    // shield aura
    if (this.shieldActive) {
      ctx.strokeStyle = COLOR.shieldBar;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(psx + this.pw/2, this.py + this.ph/2, 30, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.odActive) {
      ctx.strokeStyle = COLOR.odBar;
      ctx.lineWidth = 2;
      ctx.strokeRect(psx - 3, this.py - 3, this.pw + 6, this.ph + 6);
    }

    // Particles
    for (const p of this.particles) {
      const sx = p.x - this.camX;
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(sx, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // Bottom description bar
    this.drawBottomBar();
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

  private drawBottomBar() {
    const ctx = this.ctx;
    const y = H - 28;
    ctx.fillStyle = "rgba(10, 14, 31, 0.85)";
    ctx.fillRect(0, y, W, 28);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(0, y, W, 2);
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillStyle = "#fff7d6";
    ctx.textBaseline = "middle";
    const meters = Math.floor(this.worldX / PX_PER_METER);
    const text = `WASD MOVE  SPACE JUMP×2  SHIFT DASH  J FIRE  K MISC  L MELEE  I SHIELD  F OD  Y INV  ●  ${meters}m  ●  ${audio.currentTrackName()}`;
    ctx.fillText(text, 12, y + 14);
  }
}
