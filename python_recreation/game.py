"""
Path of the Undying Tidal Cardinality — Python (pygame) recreation

Mirrors the latest web engine rules:
  - 6 ranged / 1 melee / 2 misc class layout
  - Unified MISC ammo pool
  - 3-life respawn system
  - Distance-based pace: 15 m/s base, +10 every 300m, cap 105
  - DUNCE / ALRIGHT / SON 😭 difficulty (locked at run start)
  - Platforms: stone/floating/crumble/ice/spike/moving/bounce/conveyor/cloud/ladder/jumppad/antigrav
  - Power-ups including Chrono Slow (50% enemy time)
  - Parry negates ranged AND melee
  - Day/night cycle with ∞ sigils, weather (rain/snow/storm/fog/windy)
  - Ominous start portal (orb + ∞ sigil)

Run: python game.py
Deps: pip install pygame
"""

import math
import random
import sys

import pygame

# ----------------------------- Constants -----------------------------
W, H = 960, 540
GROUND_Y = 460
PX_PER_METER = 32
DAY_NIGHT_PERIOD = 60.0
FPS = 60

COLOR = {
    "ground": (59, 42, 26),
    "ground_top": (90, 138, 58),
    "player": (78, 200, 102),
    "player_out": (31, 74, 38),
    "player_buckle": (255, 216, 74),
    "player_pants": (26, 58, 34),
    "bullet": (255, 241, 153),
    "bullet_enemy": (255, 106, 106),
    "hp": (232, 69, 69),
    "shield": (74, 198, 255),
    "od": (200, 123, 255),
    "text": (255, 247, 214),
    "shadow": (10, 14, 31),
    "coin": (255, 216, 74),
    "token": (123, 224, 255),
    "crystal": (217, 123, 255),
}

ENEMY_COLOR = {
    "shooter": (232, 93, 58),
    "shooterElite": (255, 140, 66),
    "shanker": (168, 58, 240),
    "shankerSwift": (210, 74, 255),
    "brute": (138, 74, 42),
    "bruteHeavy": (90, 42, 24),
    "rider": (58, 160, 232),
    "bomber": (136, 143, 168),
    "sniper": (255, 58, 106),
}

# ----------------------------- Weapons -----------------------------
# id -> dict
WEAPONS = {
    "pistol":   dict(name="Pistol",   kind="ranged", cls="ranged", dmg=40,  cd=0.20, spread=0.02, pellets=1, speed=720, ammo=1, pierce=0, color=(255,209,102), deploy=False),
    "smg":      dict(name="SMG",      kind="ranged", cls="ranged", dmg=18,  cd=0.07, spread=0.10, pellets=1, speed=780, ammo=1, pierce=0, color=(255,234,132), deploy=False),
    "shotgun":  dict(name="Shotgun",  kind="ranged", cls="ranged", dmg=22,  cd=0.55, spread=0.30, pellets=6, speed=660, ammo=1, pierce=0, color=(255,179,71), deploy=False),
    "rifle":    dict(name="Rifle",    kind="ranged", cls="ranged", dmg=80,  cd=0.55, spread=0.0,  pellets=1, speed=980, ammo=1, pierce=1, color=(158,214,255), deploy=False),
    "minigun":  dict(name="Minigun",  kind="ranged", cls="ranged", dmg=14,  cd=0.04, spread=0.14, pellets=1, speed=820, ammo=1, pierce=0, color=(255,216,74), deploy=False),
    "rocket":   dict(name="Rocket",   kind="ranged", cls="ranged", dmg=160, cd=1.10, spread=0,    pellets=1, speed=520, ammo=1, pierce=99, color=(255,90,90), deploy=False),
    "knife":    dict(name="Knife",    kind="melee",  cls="melee",  dmg=25,  cd=0.35, spread=0,    pellets=0, speed=0,   ammo=0, pierce=0, color=(216,226,255), deploy=False),
    "katana":   dict(name="Katana",   kind="melee",  cls="melee",  dmg=55,  cd=0.32, spread=0,    pellets=0, speed=0,   ammo=0, pierce=0, color=(255,240,160), deploy=False),
    "grenade":  dict(name="Grenade",  kind="thrown", cls="misc",   dmg=100, cd=1.00, spread=0,    pellets=0, speed=360, ammo=0, pierce=99, color=(255,140,66), deploy=False),
    "smoke":    dict(name="Flashbang",kind="thrown", cls="misc",   dmg=0,   cd=1.10, spread=0,    pellets=0, speed=0,   ammo=0, pierce=0, color=(255,248,194), deploy=True),
    "molotov":  dict(name="Molotov",  kind="thrown", cls="misc",   dmg=60,  cd=1.20, spread=0,    pellets=0, speed=340, ammo=0, pierce=99, color=(255,90,42), deploy=False),
    "medkit":   dict(name="Medkit",   kind="thrown", cls="misc",   dmg=0,   cd=0.50, spread=0,    pellets=0, speed=0,   ammo=0, pierce=0, color=(255,106,106), deploy=True),
}

STARTING_RANGED = ["pistol", "smg", "shotgun", "rifle", "minigun", "rocket"]
STARTING_MELEE = "knife"
STARTING_MISC_A = "grenade"
STARTING_MISC_B = "smoke"

# ----------------------------- Platforms -----------------------------
# kind -> dict of properties (mirrors src/game/platforms.ts)
PLATFORM_VARIANTS = {
    "stone":    dict(top=(138,90,58),  body=(107,66,38),  edge=(58,32,16),  friction=1.0, dmg=0,  spikes=False, bounce=0,   conveyor=0, fades=False, climb=False, slow_fall=0),
    "floating": dict(top=(184,192,208),body=(115,125,146),edge=(42,48,70),  friction=1.0, dmg=0,  spikes=False, bounce=0,   conveyor=0, fades=False, climb=False, slow_fall=0),
    "crumble":  dict(top=(201,160,106),body=(138,106,58), edge=(58,42,16),  friction=1.0, dmg=0,  spikes=False, bounce=0,   conveyor=0, fades=False, climb=False, slow_fall=0),
    "ice":      dict(top=(166,233,255),body=(95,182,212), edge=(26,74,102), friction=0.15,dmg=0,  spikes=False, bounce=0,   conveyor=0, fades=False, climb=False, slow_fall=0),
    "spike":    dict(top=(170,48,48),  body=(90,32,32),   edge=(26,10,10),  friction=1.0, dmg=14, spikes=True,  bounce=0,   conveyor=0, fades=False, climb=False, slow_fall=0),
    "moving":   dict(top=(216,168,74), body=(138,106,42), edge=(58,42,16),  friction=1.0, dmg=0,  spikes=False, bounce=0,   conveyor=0, fades=False, climb=False, slow_fall=0),
    "bounce":   dict(top=(123,255,138),body=(58,138,74),  edge=(10,58,26),  friction=1.0, dmg=0,  spikes=False, bounce=1.6, conveyor=0, fades=False, climb=False, slow_fall=0),
    "conveyor": dict(top=(255,216,74), body=(90,74,42),   edge=(42,26,10),  friction=1.0, dmg=0,  spikes=False, bounce=0,   conveyor=200, fades=False, climb=False, slow_fall=0),
    "cloud":    dict(top=(255,255,255),body=(214,226,255),edge=(160,180,214),friction=1.0,dmg=0,  spikes=False, bounce=0,   conveyor=0, fades=True,  climb=False, slow_fall=0),
    "ladder":   dict(top=(192,138,64), body=(122,80,32),  edge=(58,32,16),  friction=1.0, dmg=0,  spikes=False, bounce=0,   conveyor=0, fades=False, climb=True,  slow_fall=0),
    "jumppad":  dict(top=(255,90,240), body=(122,32,128), edge=(58,10,64),  friction=1.0, dmg=0,  spikes=False, bounce=2.4, conveyor=0, fades=False, climb=False, slow_fall=0),
    "antigrav": dict(top=(155,232,255),body=(58,106,160), edge=(10,32,64),  friction=1.0, dmg=0,  spikes=False, bounce=0,   conveyor=0, fades=False, climb=False, slow_fall=3),
}

def pick_platform_kind(meters: float) -> str:
    r = random.random()
    if meters < 200: return "stone"
    if meters < 600:
        if r < 0.35: return "stone"
        if r < 0.55: return "floating"
        if r < 0.7:  return "bounce"
        if r < 0.8:  return "jumppad"
        if r < 0.9:  return "ladder"
        return "crumble"
    if meters < 1500:
        if r < 0.18: return "stone"
        if r < 0.34: return "floating"
        if r < 0.46: return "crumble"
        if r < 0.56: return "ice"
        if r < 0.66: return "moving"
        if r < 0.74: return "bounce"
        if r < 0.82: return "jumppad"
        if r < 0.90: return "ladder"
        if r < 0.96: return "antigrav"
        return "conveyor"
    if r < 0.12: return "stone"
    if r < 0.24: return "floating"
    if r < 0.34: return "crumble"
    if r < 0.44: return "ice"
    if r < 0.54: return "moving"
    if r < 0.62: return "bounce"
    if r < 0.70: return "jumppad"
    if r < 0.78: return "ladder"
    if r < 0.86: return "antigrav"
    if r < 0.92: return "conveyor"
    if r < 0.97: return "cloud"
    return "spike"

# ----------------------------- Helpers -----------------------------
def clamp(v, a, b): return max(a, min(b, v))
def lerp(a, b, t): return a + (b - a) * t
def lerp_color(a, b, t):
    return (int(lerp(a[0], b[0], t)), int(lerp(a[1], b[1], t)), int(lerp(a[2], b[2], t)))

# ----------------------------- Game -----------------------------
class Game:
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((W, H))
        pygame.display.set_caption("Path of the Undying Tidal Cardinality")
        self.clock = pygame.time.Clock()
        self.font = pygame.font.SysFont("monospace", 12)
        self.font_big = pygame.font.SysFont("monospace", 20, bold=True)
        self.phase = "menu"        # menu | playing | dead
        self.difficulty = "alright"
        self.reset()

    # ---- Difficulty multipliers (mirror engine.ts) ----
    def diff_enemy_hp(self):    return 0.5 if self.difficulty=="dunce" else (1.6 if self.difficulty=="son" else 1.0)
    def diff_enemy_dmg(self):   return 0.4 if self.difficulty=="dunce" else (2.0 if self.difficulty=="son" else 1.0)
    def diff_enemy_fire(self):  return 1.7 if self.difficulty=="dunce" else (0.55 if self.difficulty=="son" else 1.0)
    def diff_enemy_speed(self): return 0.55 if self.difficulty=="dunce" else (1.15 if self.difficulty=="son" else 1.0)
    def diff_player_mult(self): return 2 if self.difficulty=="dunce" else 1

    def reset(self):
        pm = self.diff_player_mult()
        self.px, self.py = 200.0, GROUND_Y - 40
        self.pvx, self.pvy = 0.0, 0.0
        self.pw, self.ph = 28, 40
        self.p_facing = 1
        self.p_on_ground = False
        self.p_jumps = 0; self.max_jumps = 2
        self.p_max_hp = 123 * pm
        self.p_hp = self.p_max_hp
        self.lives = 3; self.max_lives = 3
        self.p_inv = 0.0
        self.dash_charges = 2; self.dash_recharge = 0; self.dash_time = 0
        self.shield_active = False; self.shield_time = 0; self.shield_cd = 0
        self.od_bar = 0; self.od_active = False; self.od_time = 0
        self.slow_fall = 0
        self.cam_x = 0.0; self.world_x = 0.0
        self.platforms = []
        self.enemies = []
        self.bullets = []
        self.particles = []
        self.world_pickups = []
        self.world_pickup_next_x = 600
        self.coins = 100 * pm; self.tokens = 1; self.crystals = 0
        self.ammo = 240 * pm
        self.misc_ammo = 10 * pm  # 5 per slot × 2 slots
        self.kills = 0; self.boss_kills = 0
        self.time_alive = 0
        self.spawn_timer = 3.5
        self.enemies_spawned = 0
        # --- Tide spawn system ---
        self.spawn_tier = 0          # int(meters / 111)
        self.spawn_allowance = 5     # caps at 100
        self.tide_msg_count = 0
        self.tide_msg_timer = 0
        self.tide_msg_text = ""
        # --- Roll & charged grab ---
        self.rolling = False
        self.roll_time = 0
        self.grabbed = None          # reference to enemy dict
        self.grab_charge = 0
        self.weather = "clear"; self.weather_switch = 8.0
        self.cycle_time = 0
        self.pace_mult = 1.0
        self.misc_a_charge = 0; self.misc_b_charge = 0
        self.fire_cd_r = 0; self.fire_cd_m = 0; self.fire_cd_misc_a = 0; self.fire_cd_misc_b = 0
        self.melee_swing = 0
        self.parry_window = 0; self.parry_flash = 0
        self.pu_damage = 0; self.pu_speed = 0; self.pu_invincible = 0; self.pu_chrono = 0
        self.inventory = dict(
            ranged=list(STARTING_RANGED),
            melee=STARTING_MELEE,
            misc_a=STARTING_MISC_A,
            misc_b=STARTING_MISC_B,
            active_ranged=0,
        )
        self.anim_time = 0
        self.weather_time = 0
        self.screen_shake = 0
        # Pre-seed platforms
        for i in range(12):
            self.spawn_platform_at(self.px + 220 + i * 240)

    # ---- Platform spawning ----
    def last_platform_x(self):
        if not self.platforms: return self.px + 200
        last = self.platforms[-1]
        return last["x"] + last["w"]

    def spawn_platform_at(self, x):
        if random.random() < 0.5: return
        meters = self.world_x / PX_PER_METER
        kind = pick_platform_kind(meters)
        w = random.randint(80, 180)
        y = random.randint(280, 400)
        self.platforms.append(dict(
            x=x, y=y, w=w, h=16, kind=kind,
            cracked=False, crumble_timer=0, falling=False, fall_vy=0,
            base_x=x, base_y=y, phase=random.random()*math.pi*2,
            horizontal=random.random()<0.5,
            conveyor_dir=1 if random.random()<0.5 else -1,
            cloud_fade=1.0, cloud_active=True, cloud_respawn=0,
        ))

    def find_overlapping_ladder(self):
        for p in self.platforms:
            if p["kind"] != "ladder": continue
            if (self.px + self.pw > p["x"] and self.px < p["x"] + p["w"] and
                self.py + self.ph > p["y"] and self.py < p["y"] + p["h"] + 60):
                return p
        return None

    # ---- Enemies ----
    def spawn_enemy(self):
        meters = self.world_x / PX_PER_METER
        spawn_x = self.cam_x + W + random.uniform(40, 200)
        pool = ["shooter", "shanker"]
        if meters > 150: pool.append("brute")
        if meters > 400: pool += ["shankerSwift", "shooterElite"]
        if meters > 700: pool.append("rider")
        if meters > 1000: pool += ["bomber", "sniper", "bruteHeavy"]
        t = random.choice(pool)
        stats = {
            "shooter":      (100, 26, 40),
            "shooterElite": (200, 28, 42),
            "shanker":      (60,  24, 36),
            "shankerSwift": (45,  22, 34),
            "brute":        (320, 38, 48),
            "bruteHeavy":   (600, 46, 56),
            "rider":        (140, 44, 30),
            "bomber":       (90,  50, 24),
            "sniper":       (130, 24, 40),
        }[t]
        hp, w, h = stats
        flying = t in ("bomber", "rider")
        base_y = random.randint(120, 240) if flying else GROUND_Y - h
        hp *= self.diff_enemy_hp()
        self.enemies.append(dict(
            type=t, x=spawn_x, y=base_y, vx=0, vy=0, w=w, h=h, hp=hp, max_hp=hp,
            on_ground=not flying, facing=-1,
            fire_cd=random.uniform(0.6,1.4), burst_left=0, burst_cd=0,
            charging=False, charge_time=0,
            flying=flying, base_y=base_y,
            jump_cd=0, disabled=0, dying=False, glint=0,
            leg_phase=random.random()*math.pi*2, hurt_flash=0,
        ))

    # ---- Damage helpers ----
    def damage_player(self, dmg):
        if self.pu_invincible > 0: return
        if self.p_inv > 0: return
        if self.parry_flash > 0: return
        actual = dmg * (0.05 if self.shield_active else 1)
        self.p_hp -= actual
        self.p_inv = 0.4
        self.screen_shake = max(self.screen_shake, 6)
        if self.p_hp <= 0:
            self.die()

    def damage_enemy(self, e, dmg):
        if e["dying"]: return
        e["hp"] -= dmg
        e["hurt_flash"] = 0.12
        self.od_bar = clamp(self.od_bar + dmg/1200, 0, 1)

    def explode(self, x, y, dmg, radius):
        self.screen_shake = max(self.screen_shake, 8)
        for e in self.enemies:
            if e["dying"]: continue
            if (e["x"]-x)**2 + (e["y"]-y)**2 < radius*radius:
                self.damage_enemy(e, dmg)

    def die(self):
        if self.lives > 1:
            self.lives -= 1
            self.p_hp = self.p_max_hp
            self.p_inv = 2.0
            self.pvy = -300; self.pvx = 0
            self.screen_shake = max(self.screen_shake, 14)
            for e in self.enemies:
                if abs(e["x"]-self.px) < 220 and not e["dying"]:
                    e["disabled"] = max(e["disabled"], 1.2)
            return
        self.phase = "dead"

    # ---- Misc weapons ----
    def handle_misc(self, slot, dt, keys, pressed_set, released_set):
        is_a = (slot == "A")
        wid = self.inventory["misc_a"] if is_a else self.inventory["misc_b"]
        w = WEAPONS[wid]
        cd_attr = "fire_cd_misc_a" if is_a else "fire_cd_misc_b"
        ch_attr = "misc_a_charge"  if is_a else "misc_b_charge"
        key = pygame.K_q if is_a else pygame.K_e
        held = keys[key]
        # Deploy
        if key in pressed_set and w["deploy"] and getattr(self, cd_attr) <= 0:
            if self.misc_ammo <= 0: return
            setattr(self, cd_attr, w["cd"])
            self.misc_ammo -= 1
            if wid == "medkit":
                self.p_hp = min(self.p_max_hp, self.p_hp + 60)
            elif wid == "smoke":
                cx, cy = self.px + self.pw/2, self.py + self.ph/2
                self.parry_flash = max(self.parry_flash, 0.4)
                self.screen_shake = max(self.screen_shake, 6)
                for e in self.enemies:
                    if e["dying"]: continue
                    d = math.hypot(e["x"]-cx, e["y"]-cy)
                    if d < 360:
                        is_boss = e["max_hp"] > 400
                        e["disabled"] = max(e["disabled"], 0.8 if is_boss else 2.5)
            return
        # Charge / throw
        if held and getattr(self, cd_attr) <= 0:
            setattr(self, ch_attr, min(1.2, getattr(self, ch_attr) + dt))
        if key in released_set and getattr(self, cd_attr) <= 0 and not w["deploy"]:
            if self.misc_ammo <= 0:
                setattr(self, ch_attr, 0); return
            charge = clamp(getattr(self, ch_attr) / 1.2, 0, 1)
            setattr(self, ch_attr, 0)
            setattr(self, cd_attr, w["cd"])
            v = 360 * (0.6 + charge * 1.6)
            dmg_mult = (2 if self.od_active else 1) * (2 if self.pu_damage > 0 else 1)
            self.bullets.append(dict(
                x=self.px + self.pw/2, y=self.py + self.ph*0.3,
                vx=self.p_facing * v, vy=-380 - charge*120,
                dmg=(w["dmg"] or 1) * dmg_mult, life=2.4, friendly=True,
                r=8, pierce=99, color=w["color"], grenade=True,
            ))
            self.misc_ammo -= 1
        if not held:
            setattr(self, ch_attr, max(0, getattr(self, ch_attr) - dt*2))

    # ---- Update ----
    def update(self, dt, keys, pressed_set, released_set):
        self.time_alive += dt
        self.weather_time += dt
        self.cycle_time = (self.cycle_time + dt) % DAY_NIGHT_PERIOD

        # slot select 1-6
        for i in range(6):
            if (pygame.K_1 + i) in pressed_set:
                self.inventory["active_ranged"] = i

        # Pace: distance-only, +10 m/s every 300m, cap 105
        meters = self.world_x / PX_PER_METER
        steps = int(meters // 300)
        base_ms = min(105, 15 + steps * 10)
        self.pace_mult = base_ms / 15.0
        speed = base_ms * (PX_PER_METER / 3.0)
        if self.od_active: speed *= 1.25
        if self.pu_speed > 0: speed *= 2
        if self.weather == "rain": speed *= 0.92
        elif self.weather == "storm": speed *= 0.85
        elif self.weather == "snow": speed *= 0.95
        self.anim_time += dt * (1 if abs(self.pvx) > 10 else 0.4)

        if keys[pygame.K_a]: self.p_facing = -1; self.pvx = -speed
        elif keys[pygame.K_d]: self.p_facing = 1; self.pvx = speed
        else: self.pvx = 0

        # Dash
        if pygame.K_LSHIFT in pressed_set and self.dash_charges > 0 and self.dash_time <= 0:
            self.dash_time = 0.28
            self.p_inv = max(self.p_inv, 0.28)
            self.dash_charges -= 1
            if self.dash_recharge <= 0: self.dash_recharge = 2
        if self.dash_time > 0:
            self.pvx = self.p_facing * speed * 3.4
            self.dash_time -= dt
        if self.dash_recharge > 0:
            self.dash_recharge -= dt
            if self.dash_recharge <= 0 and self.dash_charges < 2:
                self.dash_charges += 1
                if self.dash_charges < 2: self.dash_recharge = 2

        # Jump
        if pygame.K_SPACE in pressed_set and self.p_jumps < self.max_jumps:
            self.pvy = -560; self.p_jumps += 1

        # Slow-fall (antigrav)
        if self.slow_fall > 0: self.slow_fall -= dt
        grav_mul = 0.35 if self.slow_fall > 0 else 1.0
        self.pvy += 1700 * dt * grav_mul
        term_v = 380 if self.slow_fall > 0 else 1200
        if self.pvy > term_v: self.pvy = term_v

        # Ladder climb
        ladder = self.find_overlapping_ladder()
        if ladder:
            if keys[pygame.K_w]: self.pvy = -260; self.p_on_ground = False
            elif keys[pygame.K_s]: self.pvy = 260
            else: self.pvy *= 0.4

        self.px += self.pvx * dt
        if self.px < 0: self.px = 0
        self.py += self.pvy * dt
        self.p_on_ground = False

        # Ground
        if self.py + self.ph >= GROUND_Y:
            self.py = GROUND_Y - self.ph
            self.pvy = 0; self.p_on_ground = True; self.p_jumps = 0

        # Platforms (jump-through)
        if self.pvy > 0:
            for p in self.platforms:
                v = PLATFORM_VARIANTS[p["kind"]]
                if (self.px + self.pw > p["x"] and self.px < p["x"]+p["w"] and
                    self.py + self.ph >= p["y"] and self.py + self.ph - self.pvy*0.02 <= p["y"] + 4):
                    self.py = p["y"] - self.ph
                    if v["bounce"]:
                        self.pvy = -560 * v["bounce"]
                    else:
                        self.pvy = 0; self.p_on_ground = True; self.p_jumps = 0
                    if p["kind"] == "spike": self.damage_player(v["dmg"])
                    if p["kind"] == "crumble" and not p["cracked"]:
                        p["cracked"] = True; p["crumble_timer"] = 0.5
                    if v["slow_fall"] and self.slow_fall <= 0.1:
                        self.slow_fall = v["slow_fall"]
                    break

        if self.pvx > 0: self.world_x += self.pvx * dt
        self.cam_x = max(0, self.px - W * 0.35)

        # Shield
        if pygame.K_i in pressed_set and self.shield_cd <= 0:
            self.shield_active = True; self.shield_time = 5; self.shield_cd = 6
        if self.shield_active:
            self.shield_time -= dt
            if self.shield_time <= 0: self.shield_active = False
        if self.shield_cd > 0: self.shield_cd -= dt

        # Overdrive
        if pygame.K_g in pressed_set and self.od_bar >= 1 and not self.od_active:
            self.od_active = True; self.od_time = 6; self.od_bar = 0
        if self.od_active:
            self.od_time -= dt
            if self.od_time <= 0: self.od_active = False

        # Cooldowns
        for attr in ("fire_cd_r","fire_cd_m","fire_cd_misc_a","fire_cd_misc_b"):
            if getattr(self, attr) > 0: setattr(self, attr, getattr(self, attr) - dt)
        if self.p_inv > 0: self.p_inv -= dt
        if self.melee_swing > 0: self.melee_swing = max(0, self.melee_swing - dt*4)
        if self.parry_flash > 0: self.parry_flash -= dt
        for attr in ("pu_damage","pu_speed","pu_invincible","pu_chrono"):
            if getattr(self, attr) > 0: setattr(self, attr, getattr(self, attr) - dt)

        # J fire
        if keys[pygame.K_j] and self.fire_cd_r <= 0:
            wid = self.inventory["ranged"][self.inventory["active_ranged"]]
            w = WEAPONS[wid]
            if w["kind"] == "ranged" and self.ammo >= w["ammo"]:
                self.fire_cd_r = w["cd"]
                self.ammo -= w["ammo"]
                dmg_mult = (2 if self.od_active else 1) * (2 if self.pu_damage > 0 else 1)
                for _ in range(w["pellets"]):
                    ang = (random.random()-0.5) * w["spread"]
                    cs, sn = math.cos(ang), math.sin(ang)
                    self.bullets.append(dict(
                        x=self.px+self.pw/2, y=self.py+self.ph*0.4,
                        vx=self.p_facing*w["speed"]*cs, vy=w["speed"]*sn,
                        dmg=w["dmg"]*dmg_mult, life=0.9, friendly=True,
                        r=7 if wid=="rocket" else 4, pierce=w["pierce"], color=w["color"], grenade=False,
                    ))

        # L melee
        if pygame.K_l in pressed_set and self.fire_cd_m <= 0:
            w = WEAPONS[self.inventory["melee"]]
            self.fire_cd_m = w["cd"]; self.melee_swing = 1
            dmg = w["dmg"] * (2 if self.od_active else 1) * (2 if self.pu_damage > 0 else 1)
            reach = 80 if w["name"]=="Katana" else 60
            for e in self.enemies:
                if (1 if e["x"]>self.px else -1) == self.p_facing and abs(e["x"]-self.px) < reach and abs(e["y"]-self.py) < 55:
                    self.damage_enemy(e, dmg)

        # K / O
        self.handle_misc("A", dt, keys, pressed_set, released_set)
        self.handle_misc("B", dt, keys, pressed_set, released_set)

        # E parry
        cx, cy = self.px+self.pw/2, self.py+self.ph/2
        if self.parry_window <= 0:
            for b in self.bullets:
                if b["friendly"]: continue
                d = math.hypot(b["x"]-cx, b["y"]-cy)
                if d < 90 and (b["vx"]*-(b["x"]-cx) + b["vy"]*-(b["y"]-cy)) > 0:
                    self.parry_window = 0.35; break
        else:
            self.parry_window -= dt
        if pygame.K_e in pressed_set and self.parry_window > 0:
            for b in list(self.bullets):
                if not b["friendly"] and math.hypot(b["x"]-cx, b["y"]-cy) < 90:
                    b["friendly"] = True; b["dmg"] *= 2
            self.parry_flash = 0.25
            self.parry_window = 0

        # Bullets (chrono slows enemy bullets)
        slow_b = 0.5 if self.pu_chrono > 0 else 1
        new_bullets = []
        for b in self.bullets:
            bdt = dt if b["friendly"] else dt * slow_b
            b["life"] -= bdt
            if b["life"] <= 0: continue
            if b["friendly"] and b["r"] >= 8: b["vy"] += 1500 * bdt
            b["x"] += b["vx"] * bdt; b["y"] += b["vy"] * bdt
            if b["x"] < self.cam_x - 100 or b["x"] > self.cam_x + W + 200: continue
            if b["r"] >= 8 and b["y"] > GROUND_Y:
                self.explode(b["x"], b["y"], b["dmg"], 90); continue
            hit = False
            if b["friendly"]:
                for e in self.enemies:
                    if e["dying"]: continue
                    if (b["x"] > e["x"]-e["w"]/2 and b["x"] < e["x"]+e["w"]/2 and
                        b["y"] > e["y"] and b["y"] < e["y"]+e["h"]):
                        self.damage_enemy(e, b["dmg"])
                        if b["r"] >= 8:
                            self.explode(b["x"], b["y"], b["dmg"], 90); hit = True; break
                        if b["pierce"] > 0: b["pierce"] -= 1
                        else: hit = True; break
            else:
                if (b["x"] > self.px and b["x"] < self.px+self.pw and
                    b["y"] > self.py and b["y"] < self.py+self.ph):
                    self.damage_player(b["dmg"]); hit = True
            if not hit: new_bullets.append(b)
        self.bullets = new_bullets

        # Enemies (chrono slow)
        slow = 0.5 if self.pu_chrono > 0 else 1
        edt = dt * slow
        new_enemies = []
        for e in self.enemies:
            if e["x"] < self.cam_x - 300: continue
            e["hurt_flash"] = max(0, e["hurt_flash"] - edt)
            e["leg_phase"] += edt * 10
            if e["dying"]:
                e["glint"] -= edt
                if e["glint"] > 0: new_enemies.append(e)
                continue
            if e["disabled"] > 0: e["disabled"] -= edt
            if e["jump_cd"] > 0: e["jump_cd"] -= edt
            dx = (self.px+self.pw/2) - e["x"]
            e["facing"] = 1 if dx > 0 else -1
            dist = abs(dx)
            fire_mul = self.diff_enemy_fire()
            t = e["type"]
            if t == "shanker": e["vx"] = (1 if dx>0 else -1) * 130
            elif t == "shankerSwift": e["vx"] = (1 if dx>0 else -1) * 220
            elif t in ("shooter","shooterElite","sniper"):
                if dist > 320: e["vx"] = (1 if dx>0 else -1) * 90
                elif dist < 180: e["vx"] = -(1 if dx>0 else -1) * 90
                else: e["vx"] = math.sin(self.time_alive*2 + e["x"]*0.01) * 50
                e["fire_cd"] -= edt
                if e["fire_cd"] <= 0 and dist < 460:
                    e["fire_cd"] = random.uniform(1.0,1.8) * fire_mul
                    self.bullets.append(dict(
                        x=e["x"], y=e["y"]+e["h"]*0.4,
                        vx=e["facing"]*420, vy=0,
                        dmg=8 * self.diff_enemy_dmg(), life=1.5, friendly=False,
                        r=3, pierce=0, color=(255,106,106), grenade=False,
                    ))
            elif t in ("brute","bruteHeavy"):
                e["vx"] = (1 if dx>0 else -1) * (60 if t=="brute" else 40)
                e["fire_cd"] -= edt
                if e["fire_cd"] <= 0 and dist < 380:
                    e["fire_cd"] = random.uniform(1.6,2.4) * fire_mul
                    for i in range(-1,2):
                        self.bullets.append(dict(
                            x=e["x"], y=e["y"]+e["h"]*0.4,
                            vx=e["facing"]*360, vy=i*60,
                            dmg=12 * self.diff_enemy_dmg(), life=1.5, friendly=False,
                            r=3, pierce=0, color=(255,106,106), grenade=False,
                        ))
            elif t == "rider": e["vx"] = -260
            elif t == "bomber":
                e["vx"] = -180
                e["y"] = e["base_y"] + math.sin(self.weather_time*1.2 + e["x"]*0.01) * 12

            espd = self.diff_enemy_speed()
            if not e["flying"]:
                e["vy"] += 1700 * edt
                e["y"] += e["vy"] * edt
                if e["y"] + e["h"] >= GROUND_Y:
                    e["y"] = GROUND_Y - e["h"]; e["vy"] = 0; e["on_ground"] = True
                if e["vy"] > 0:
                    for p in self.platforms:
                        v = PLATFORM_VARIANTS[p["kind"]]
                        if v["spikes"]: continue
                        if e["x"]+e["w"]/2 > p["x"] and e["x"]-e["w"]/2 < p["x"]+p["w"]:
                            top = p["y"]
                            prev_bot = e["y"]+e["h"] - e["vy"]*edt
                            if prev_bot <= top + 2 and e["y"]+e["h"] >= top:
                                e["y"] = top - e["h"]; e["vy"] = 0; e["on_ground"] = True
                                break
                if e["on_ground"] and e["jump_cd"] <= 0 and random.random() < 0.008 * espd:
                    e["vy"] = -520; e["on_ground"] = False; e["jump_cd"] = 1.5
            e["x"] += e["vx"] * edt * espd

            # Touch damage
            if (not e["disabled"] and e["x"]-e["w"]/2 < self.px+self.pw and e["x"]+e["w"]/2 > self.px and
                e["y"] < self.py+self.ph and e["y"]+e["h"] > self.py):
                m = self.diff_enemy_dmg()
                base = 8 if t in ("shanker","shankerSwift") else 12 if t in ("brute","bruteHeavy") else 15 if t == "rider" else 0
                if base: self.damage_player(base * m)

            if e["hp"] <= 0 and not e["dying"]:
                e["dying"] = True; e["glint"] = 0.4
                self.kills += 1
                # Loot
                if random.random() < 0.4:
                    self.coins += random.randint(50, 100)
            new_enemies.append(e)
        self.enemies = new_enemies

        # Spawn enemies — tide system: +5 allowance per 111 m, "TIDE IS RISING" every 5th tier
        new_tier = int(meters) // 111
        if new_tier > self.spawn_tier:
            gained = new_tier - self.spawn_tier
            self.spawn_tier = new_tier
            self.spawn_allowance = min(100, self.spawn_allowance + 5 * gained)
            for _ in range(gained):
                self.tide_msg_count += 1
                if self.tide_msg_count % 5 == 0:
                    self.tide_msg_text = "THE TIDE IS RISING"
                    self.tide_msg_timer = 3.5
                    self.screen_shake = max(self.screen_shake, 8)
        self.spawn_timer -= dt
        if (self.spawn_timer <= 0 and
            self.enemies_spawned < self.spawn_allowance and
            self.enemies_spawned < 100):
            self.spawn_enemy()
            self.enemies_spawned += 1
            rate = 0.5 + 0.35 * self.spawn_tier
            interval = 1.0 / max(0.2, rate)
            self.spawn_timer = interval * random.uniform(0.85, 1.15)
            if (self.difficulty == "son" and
                self.enemies_spawned < self.spawn_allowance and
                self.enemies_spawned < 100):
                self.spawn_enemy()
                self.enemies_spawned += 1
        if self.tide_msg_timer > 0:
            self.tide_msg_timer -= dt

        # Maintain platforms
        while not self.platforms or self.last_platform_x() < self.cam_x + W + 600:
            self.spawn_platform_at(self.last_platform_x() + random.uniform(140, 280))
        self.platforms = [p for p in self.platforms if p["x"]+p["w"] > self.cam_x - 200 and p["y"] < H + 200]

        # World pickups
        while self.world_pickup_next_x < self.cam_x + W + 400:
            x = self.world_pickup_next_x
            r = random.random()
            if r < 0.10:
                pr = random.random()
                t = "pu_dmg" if pr<0.25 else "pu_spd" if pr<0.5 else "pu_inv" if pr<0.75 else "pu_chr"
                value = 5
            elif r < 0.18: t = "crystal"; value = random.randint(1,3)
            elif r < 0.32: t = "token"; value = random.randint(1,2)
            else: t = "coin"; value = random.randint(1,30)
            self.world_pickups.append(dict(x=x, y=GROUND_Y-14, type=t, value=value))
            self.world_pickup_next_x += random.randint(80, 220)
        keep = []
        for p in self.world_pickups:
            if p["x"] < self.cam_x - 200: continue
            dx = (self.px+self.pw/2) - p["x"]; dy = (self.py+self.ph/2) - p["y"]
            if abs(dx) < 24 and abs(dy) < 28:
                if p["type"] == "coin": self.coins += p["value"]
                elif p["type"] == "token": self.tokens += p["value"]
                elif p["type"] == "crystal": self.crystals += p["value"]
                elif p["type"] == "pu_dmg": self.pu_damage = 5
                elif p["type"] == "pu_spd": self.pu_speed = 5
                elif p["type"] == "pu_inv": self.pu_invincible = 5
                elif p["type"] == "pu_chr": self.pu_chrono = 5
                continue
            keep.append(p)
        self.world_pickups = keep

        # Weather
        self.weather_switch -= dt
        if self.weather_switch <= 0:
            self.weather = random.choice(["clear","clear","rain","snow","storm","fog","windy"])
            self.weather_switch = random.uniform(45, 90)

        if self.screen_shake > 0: self.screen_shake -= dt * 30

    # ---- Render ----
    def render(self):
        s = self.screen
        # Day/night sky
        t = self.cycle_time / DAY_NIGHT_PERIOD
        day_amt = (math.cos(t * math.pi*2) + 1) / 2
        sky1 = lerp_color((26,35,66), (108,184,255), day_amt)
        sky2 = lerp_color((42,32,80), (200,216,255), day_amt)
        for y in range(0, H, 4):
            col = lerp_color(sky1, sky2, y/H)
            pygame.draw.rect(s, col, (0, y, W, 4))

        # Stars at night
        if day_amt < 0.5:
            for i in range(60):
                x = (i*137 + int(self.cam_x*0.05)) % W
                y = (i*73) % 240
                pygame.draw.rect(s, (255,255,255), (x,y,2,2))

        # Sun/Moon with ∞
        cx_sun = int(W*0.85)
        cy_sun = int(90 + math.sin(t*math.pi*2 - math.pi/2) * 30)
        if day_amt > 0.5:
            pygame.draw.circle(s, (255,216,74), (cx_sun, cy_sun), 26)
            self.draw_infinity(cx_sun, cy_sun, 10, (255,255,255))
        else:
            pygame.draw.circle(s, (232,232,240), (cx_sun, cy_sun), 26)
            pygame.draw.circle(s, lerp_color((26,35,66),(108,184,255),day_amt), (cx_sun+8, cy_sun-4), 22)
            self.draw_infinity(cx_sun-4, cy_sun+2, 9, (160,180,220))

        # Ground
        pygame.draw.rect(s, COLOR["ground"], (0, GROUND_Y, W, H-GROUND_Y))
        pygame.draw.rect(s, COLOR["ground_top"], (0, GROUND_Y, W, 6))

        # START PORTAL at world x ~ 90
        portal_sx = int(90 - self.cam_x)
        if -120 < portal_sx < W + 120:
            base_y = GROUND_Y - 4
            pygame.draw.rect(s, (26,20,38), (portal_sx-50, base_y-110, 100, 110))
            pygame.draw.rect(s, (42,31,58), (portal_sx-46, base_y-106, 92, 102))
            for i in range(4):
                pygame.draw.rect(s, (123,74,223), (portal_sx-44, base_y-100+i*22, 4, 12))
                pygame.draw.rect(s, (123,74,223), (portal_sx+40, base_y-100+i*22, 4, 12))
            pygame.draw.ellipse(s, (10,6,18), (portal_sx-32, base_y-100, 64, 100))
            orb_y = base_y - 60
            pulse = 0.5 + 0.5*math.sin(self.weather_time*2)
            for r,a in [(30, int(60+pulse*60)), (24, 255)]:
                surf = pygame.Surface((r*2, r*2), pygame.SRCALPHA)
                pygame.draw.circle(surf, (168,123,255, a), (r,r), r)
                s.blit(surf, (portal_sx-r, orb_y-r))
            pygame.draw.circle(s, (220,196,255), (portal_sx, orb_y), 18)
            pygame.draw.circle(s, (255,255,255), (portal_sx-4, orb_y-4), 5)
            sig_y = orb_y - 42
            self.draw_infinity(portal_sx, sig_y, 14, (255,255,255))
            self.draw_infinity(portal_sx, sig_y, 11, (216,196,255))

        # World pickups
        for p in self.world_pickups:
            sx = int(p["x"] - self.cam_x)
            if sx < -20 or sx > W + 20: continue
            float_y = math.sin(self.anim_time*4 + p["x"]*0.01) * 2
            py = int(p["y"] + float_y)
            cmap = {"coin":(255,216,74),"token":(123,224,255),"crystal":(217,123,255),
                    "pu_dmg":(255,90,90),"pu_spd":(123,255,138),"pu_inv":(255,247,214),"pu_chr":(167,139,250)}
            col = cmap.get(p["type"], (255,216,74))
            pulse = 0.5 + 0.5*math.sin(self.anim_time*5 + p["x"]*0.02)
            halo = pygame.Surface((28, 28), pygame.SRCALPHA)
            pygame.draw.circle(halo, (*col, int(40 + pulse*60)), (14,14), int(11+pulse*2))
            s.blit(halo, (sx-14, py-14))
            if p["type"] == "coin":
                pygame.draw.rect(s, (122,90,16), (sx-6, py-6, 12, 12))
                pygame.draw.rect(s, col, (sx-5, py-5, 10, 10))
                pygame.draw.rect(s, (255,255,255), (sx-4, py-4, 2, 2))
            elif p["type"] == "crystal":
                pygame.draw.polygon(s, col, [(sx,py-6),(sx+5,py),(sx,py+6),(sx-5,py)])
                pygame.draw.rect(s, (255,255,255), (sx-2, py-3, 2, 2))
            elif p["type"] == "token":
                points = [(sx + math.cos(i/6*math.pi*2)*6, py + math.sin(i/6*math.pi*2)*6) for i in range(6)]
                pygame.draw.polygon(s, col, points)
            else:
                pygame.draw.rect(s, (10,14,31), (sx-7, py-8, 14, 16))
                pygame.draw.rect(s, col, (sx-6, py-7, 12, 14))
                label = {"pu_dmg":"DMG","pu_spd":"SPD","pu_inv":"INV","pu_chr":"SLOW"}[p["type"]]
                lbl = self.font.render(label, True, col)
                s.blit(lbl, (sx - lbl.get_width()//2, py - 22))

        # Platforms
        for p in self.platforms:
            sx = int(p["x"] - self.cam_x)
            if sx + p["w"] < 0 or sx > W: continue
            v = PLATFORM_VARIANTS[p["kind"]]
            pygame.draw.rect(s, v["body"], (sx, int(p["y"]), p["w"], p["h"]))
            pygame.draw.rect(s, v["top"], (sx, int(p["y"]), p["w"], 4))
            pygame.draw.rect(s, v["edge"], (sx, int(p["y"])+p["h"]-2, p["w"], 2))
            if p["kind"] == "spike":
                for i in range(0, p["w"], 8):
                    pygame.draw.polygon(s, (255,214,214), [(sx+i, p["y"]), (sx+i+4, p["y"]-6), (sx+i+8, p["y"])])
            elif p["kind"] == "ladder":
                for yy in range(int(p["y"])-80, int(p["y"])+p["h"], 4):
                    pygame.draw.rect(s, (58,32,16), (sx+4, yy, 2, 3))
                    pygame.draw.rect(s, (58,32,16), (sx+p["w"]-6, yy, 2, 3))
                for yy in range(int(p["y"])-76, int(p["y"])+p["h"], 8):
                    pygame.draw.rect(s, (90,48,16), (sx+6, yy, p["w"]-12, 2))
            elif p["kind"] == "jumppad":
                pulse = 0.5 + 0.5*math.sin(self.weather_time*8)
                col = (255, 255, 255, int(100 + pulse*150))
                surf = pygame.Surface((14, 12), pygame.SRCALPHA)
                pygame.draw.polygon(surf, col, [(7, 0), (0, 11), (14, 11)])
                s.blit(surf, (sx + p["w"]//2 - 7, p["y"] - 12 - int(pulse*3)))
            elif p["kind"] == "antigrav":
                for i in range(4):
                    tt = (self.weather_time + i*0.6) % 1.5
                    pygame.draw.rect(s, (155,232,255), (sx+8 + i*(p["w"]//5), int(p["y"] - 4 - tt*18), 2, 2))

        # Enemies (humanoid blocks)
        for e in self.enemies:
            sx = int(e["x"] - self.cam_x - e["w"]/2)
            if e["dying"]:
                a = e["glint"] / 0.4
                cx, cy = sx + e["w"]//2, int(e["y"] + e["h"]/2)
                length = int((1-a)*30 + 6)
                pygame.draw.rect(s, (255,255,255), (cx-length, cy-1, length*2, 2))
                pygame.draw.rect(s, (255,255,255), (cx-1, cy-length, 2, length*2))
                continue
            base_col = ENEMY_COLOR[e["type"]]
            if e["hurt_flash"] > 0: base_col = (255,255,255)
            # Legs
            ph = math.sin(e["leg_phase"] + e["x"]*0.1)
            l_off = max(0, ph)*3; r_off = max(0, -ph)*3
            pygame.draw.rect(s, (26,26,26), (sx+5, int(e["y"]+e["h"]-8+l_off), 5, 8))
            pygame.draw.rect(s, (26,26,26), (sx+e["w"]-10, int(e["y"]+e["h"]-8+r_off), 5, 8))
            # Body
            pygame.draw.rect(s, base_col, (sx+3, int(e["y"]+12), e["w"]-6, e["h"]-22))
            # Head
            pygame.draw.rect(s, (232,200,154), (sx+6, int(e["y"]+4), e["w"]-12, 10))
            # Eyes (red glow)
            eye_x = sx + e["w"] - 9 if e["facing"] > 0 else sx + 7
            pygame.draw.rect(s, (255,48,48), (eye_x, int(e["y"]+8), 2, 2))
            # HP bar
            pygame.draw.rect(s, (10,14,31), (sx, int(e["y"]-8), e["w"], 4))
            pygame.draw.rect(s, COLOR["hp"], (sx, int(e["y"]-8), int((e["hp"]/e["max_hp"])*e["w"]), 4))

        # Bullets
        for b in self.bullets:
            sx = int(b["x"] - self.cam_x)
            pygame.draw.rect(s, b["color"], (sx-b["r"], int(b["y"]-b["r"]), b["r"]*2, b["r"]*2))

        # Player
        self.draw_player(s)

        # Weather overlay
        if self.weather == "fog":
            ov = pygame.Surface((W, H), pygame.SRCALPHA); ov.fill((220,220,230,90)); s.blit(ov, (0,0))
        elif self.weather in ("rain","storm"):
            for i in range(80):
                x = (i*53 + int(self.weather_time*30)) % W
                y = (i*31 + int(self.weather_time*600)) % H
                pygame.draw.line(s, (180,200,255), (x,y),(x-3,y+8))
            ov = pygame.Surface((W,H), pygame.SRCALPHA); ov.fill((20,20,40,60)); s.blit(ov, (0,0))
        elif self.weather == "snow":
            for i in range(60):
                x = (i*53 + int(self.weather_time*30)) % W
                y = (i*31 + int(self.weather_time*60)) % H
                pygame.draw.rect(s, (255,255,255), (x,y,2,2))

        if self.parry_flash > 0:
            ov = pygame.Surface((W,H), pygame.SRCALPHA); ov.fill((255,255,180, int(self.parry_flash*150))); s.blit(ov,(0,0))
        if self.pu_chrono > 0:
            ov = pygame.Surface((W,H), pygame.SRCALPHA); ov.fill((167,139,250,30)); s.blit(ov,(0,0))

        self.draw_hud(s)

    def draw_player(self, s):
        psx, psy = int(self.px - self.cam_x), int(self.py)
        # Pants
        pygame.draw.rect(s, COLOR["player_pants"], (psx+6, psy+self.ph-8, 5, 8))
        pygame.draw.rect(s, COLOR["player_pants"], (psx+self.pw-11, psy+self.ph-8, 5, 8))
        # Tunic
        pygame.draw.rect(s, COLOR["player"], (psx+4, psy+14, self.pw-8, self.ph-22))
        # Belt
        pygame.draw.rect(s, (26,10,5), (psx+4, psy+24, self.pw-8, 2))
        # Yellow buckle
        pygame.draw.rect(s, COLOR["player_buckle"], (psx+self.pw//2-2, psy+23, 4, 4))
        # Head
        pygame.draw.rect(s, (253,226,160), (psx+8, psy+6, self.pw-16, 10))
        # Hat with ∞
        pygame.draw.rect(s, (58,42,16), (psx+2, psy+4, self.pw-4, 3))
        pygame.draw.rect(s, (58,42,16), (psx+7, psy, self.pw-14, 5))
        self.draw_infinity(psx + self.pw//2, psy+2, 4, (255,247,214))
        # Slow-fall aura
        if self.slow_fall > 0:
            pygame.draw.circle(s, (155,232,255), (psx+self.pw//2, psy+self.ph//2), 18, 1)
        # Shield bubble
        if self.shield_active:
            pygame.draw.circle(s, COLOR["shield"], (psx+self.pw//2, psy+self.ph//2), 30, 2)

    def draw_infinity(self, cx, cy, size, color):
        pts = []
        for i in range(61):
            a = (i/60)*math.pi*2
            x = cx + math.cos(a)*size
            y = cy + math.sin(2*a)*size*0.4
            pts.append((x,y))
        if len(pts) > 1:
            pygame.draw.lines(self.screen, color, False, pts, 2)

    def draw_hud(self, s):
        # HP bar
        hp_pct = max(0, self.p_hp/self.p_max_hp)
        pygame.draw.rect(s, (10,14,31), (10, 10, 200, 12))
        pygame.draw.rect(s, COLOR["hp"], (10, 10, int(200*hp_pct), 12))
        s.blit(self.font.render(f"HP {int(self.p_hp)}/{int(self.p_max_hp)}", True, COLOR["text"]), (12, 24))
        # Lives (3 hearts)
        for i in range(3):
            col = (255,90,90) if i < self.lives else (58,74,114)
            s.blit(self.font.render("HEART", True, col), (10 + i*40, 42))
        # Currencies
        s.blit(self.font.render(f"AMMO {self.ammo}  MISC {self.misc_ammo}  DASH {self.dash_charges}/2", True, (255,216,74)), (10, 60))
        s.blit(self.font.render(f"COINS {self.coins}  TOKENS {self.tokens}  CRYS {self.crystals}", True, COLOR["text"]), (10, 76))
        # Distance + pace
        m = int(self.world_x / PX_PER_METER)
        msg = self.font_big.render(f"{m} m", True, (255,216,74))
        s.blit(msg, (W//2 - msg.get_width()//2, 10))
        s.blit(self.font.render(f"PACE {self.pace_mult:.2f}x  WX {self.weather.upper()}  THREAT {self.difficulty.upper()}", True, COLOR["text"]),
               (W//2 - 140, 36))
        # Active weapon
        wid = self.inventory["ranged"][self.inventory["active_ranged"]]
        s.blit(self.font.render(f"[{self.inventory['active_ranged']+1}] {WEAPONS[wid]['name']}  L:{WEAPONS[self.inventory['melee']]['name']}  K:{WEAPONS[self.inventory['misc_a']]['name']}  O:{WEAPONS[self.inventory['misc_b']]['name']}", True, COLOR["text"]),
               (10, H - 22))

    # ---- Menu / Death overlays ----
    def draw_menu(self):
        s = self.screen
        s.fill((10,14,31))
        # Big ∞ behind title
        big_inf_pts = []
        cx, cy = W//2, H//2 - 40
        for i in range(121):
            a = (i/120)*math.pi*2
            x = cx + math.cos(a)*180
            y = cy + math.sin(2*a)*70
            big_inf_pts.append((x,y))
        pygame.draw.lines(s, (60, 50, 100), False, big_inf_pts, 6)
        title = self.font_big.render("PATH OF THE UNDYING TIDAL CARDINALITY", True, (255,216,74))
        s.blit(title, (W//2 - title.get_width()//2, H//2 - 50))
        s.blit(self.font.render("LEVEL OF ENEMY THREAT: " + self.difficulty.upper() + "  (1=DUNCE 2=ALRIGHT 3=SON)", True, COLOR["text"]),
               (W//2 - 220, H//2 + 10))
        s.blit(self.font.render("PRESS ENTER TO START", True, (123,224,255)),
               (W//2 - 80, H//2 + 40))

    def draw_death(self):
        ov = pygame.Surface((W,H), pygame.SRCALPHA); ov.fill((0,0,0,180)); self.screen.blit(ov,(0,0))
        msg = self.font_big.render("YOU DIED", True, (255, 90, 90))
        self.screen.blit(msg, (W//2 - msg.get_width()//2, H//2 - 30))
        self.screen.blit(self.font.render(f"Distance: {int(self.world_x/PX_PER_METER)}m   Kills: {self.kills}", True, COLOR["text"]),
                         (W//2 - 100, H//2 + 5))
        self.screen.blit(self.font.render("PRESS R TO RESTART", True, (123,224,255)),
                         (W//2 - 80, H//2 + 30))

    # ---- Main loop ----
    def run(self):
        running = True
        while running:
            dt = self.clock.tick(FPS) / 1000.0
            pressed_set = set(); released_set = set()
            for ev in pygame.event.get():
                if ev.type == pygame.QUIT: running = False
                elif ev.type == pygame.KEYDOWN:
                    pressed_set.add(ev.key)
                    if self.phase == "menu":
                        if ev.key == pygame.K_1: self.difficulty = "dunce"
                        elif ev.key == pygame.K_2: self.difficulty = "alright"
                        elif ev.key == pygame.K_3: self.difficulty = "son"
                        elif ev.key == pygame.K_RETURN:
                            self.reset(); self.phase = "playing"
                    elif self.phase == "dead":
                        if ev.key == pygame.K_r:
                            self.phase = "menu"
                elif ev.type == pygame.KEYUP:
                    released_set.add(ev.key)

            keys = pygame.key.get_pressed()
            if self.phase == "playing":
                self.update(dt, keys, pressed_set, released_set)
                self.render()
            elif self.phase == "menu":
                self.draw_menu()
            elif self.phase == "dead":
                self.render()
                self.draw_death()

            pygame.display.flip()

        pygame.quit()
        sys.exit()


if __name__ == "__main__":
    Game().run()