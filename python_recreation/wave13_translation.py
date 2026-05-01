"""
PATH OF THE UNDYING TIDAL CARDINALITY — Wave 13 Translation
============================================================
Pygame CE port of the latest TypeScript engine (src/game/engine.ts).
This is a *reference scaffold* you can drop into the existing python_recreation/
folder and expand. It exposes the same data tables and the new Wave 13
features so you can paste them into game.py one section at a time.

NEW IN WAVE 13
--------------
1) LIFESTEAL: every 8th enemy kill restores 10 HP.
2) Lil One ally is unlimited (cheaper, stronger, longer life).
3) Portal Gun replaced in Main Shop by "The Button" (misc class).
4) Disco Bomb rework: affected enemies stop moving + attacking and only jump.
5) Difficulty-scaled enemy spawning (DUNCE / ALRIGHT / SON).

Run with:
    pip install pygame-ce
    python wave13_translation.py
"""

import math
import random
import sys
import pygame

# ---------------------------- CONSTANTS ---------------------------------------
W, H = 960, 540
GROUND_Y = 460
PX_PER_METER = 32
PLAYER_BASE_MS = 9.2
PLAYER_MAX_MS = 26
PLAYER_ACCEL = 2150
DASH_DURATION = 0.22
DASH_RECHARGE = 2.0

COLOR = {
    "bg":            (10, 14, 31),
    "ground":        (59, 42, 26),
    "ground_top":    (90, 138, 58),
    "player":        (78, 200, 102),
    "player_pants":  (26, 58, 34),
    "bullet":        (255, 241, 153),
    "bullet_enemy":  (255, 106, 106),
    "hp_bar":        (232, 69, 69),
    "text":          (255, 247, 214),
    "coin":          (255, 216, 74),
    "token":         (123, 224, 255),
    "crystal":       (217, 123, 255),
    "lifesteal":     (123, 255, 138),
}

# ---------------------------- WEAPONS -----------------------------------------
# Mirrors src/game/weapons.ts WEAPONS table. Keys are weapon ids.
WEAPONS = {
    "pistol":         dict(name="Pistol",         kind="ranged", cls="ranged", dmg=40,  cd=0.20, spread=0.02, pellets=1, speed=720,  ammo=1, pierce=0, color=(255,209,102)),
    "smg":            dict(name="SMG",            kind="ranged", cls="ranged", dmg=18,  cd=0.07, spread=0.10, pellets=1, speed=780,  ammo=1, pierce=0, color=(255,234,132)),
    "shotgun":        dict(name="Shotgun",        kind="ranged", cls="ranged", dmg=22,  cd=0.55, spread=0.30, pellets=6, speed=660,  ammo=1, pierce=0, color=(255,179, 71)),
    "rifle":          dict(name="Rifle",          kind="ranged", cls="ranged", dmg=80,  cd=0.55, spread=0.00, pellets=1, speed=980,  ammo=1, pierce=1, color=(158,214,255)),
    "knife":          dict(name="Knife",          kind="melee",  cls="melee",  dmg=25,  cd=0.35, spread=0,    pellets=0, speed=0,    ammo=0, pierce=0, color=(216,226,255)),
    "grenade":        dict(name="Grenade",        kind="thrown", cls="misc",   dmg=100, cd=1.00, spread=0,    pellets=0, speed=360,  ammo=0, pierce=99, color=(255,140, 66)),
    "sniper":         dict(name="Sniper",         kind="ranged", cls="ranged", dmg=100, cd=0.65, spread=0,    pellets=1, speed=1600, ammo=1, pierce=2, color=( 17, 17, 17)),
    "rocket":         dict(name="Rocket",         kind="ranged", cls="ranged", dmg=200, cd=2.00, spread=0,    pellets=1, speed=560,  ammo=1, pierce=99,color=( 79,138, 53)),
    "oiler":          dict(name="Oiler",          kind="ranged", cls="ranged", dmg=0,   cd=1.10, spread=0,    pellets=1, speed=500,  ammo=1, pierce=0, color=( 26, 26, 34)),
    "flamethrower":   dict(name="Flamethrower",   kind="ranged", cls="ranged", dmg=9,   cd=0.05, spread=0.18, pellets=1, speed=420,  ammo=1, pierce=0, color=(255,106,  0)),
    "gold_machine_gun": dict(name="Gold MG",      kind="ranged", cls="ranged", dmg=8,   cd=0.01, spread=0.09, pellets=1, speed=980,  ammo=1, pierce=0, color=(255,216, 74)),
    "katana":         dict(name="Katana",         kind="melee",  cls="melee",  dmg=40,  cd=0.40, spread=0,    pellets=0, speed=0,    ammo=0, pierce=0, color=(201,209,217)),
    "yamato":         dict(name="Yamato",         kind="melee",  cls="melee",  dmg=60,  cd=0.48, spread=0,    pellets=0, speed=0,    ammo=0, pierce=0, color=(185,230,255)),
    "gauntlet":       dict(name="Gauntlet",       kind="melee",  cls="melee",  dmg=70,  cd=0.50, spread=0,    pellets=0, speed=0,    ammo=0, pierce=0, color=(156,163,175)),
    "medkit":         dict(name="Medkit",         kind="thrown", cls="misc",   dmg=0,   cd=0.50, spread=0,    pellets=0, speed=0,    ammo=0, pierce=0, color=(255,106,106), deploy=True),
    "napalm":         dict(name="Napalm",         kind="thrown", cls="misc",   dmg=70,  cd=1.20, spread=0,    pellets=0, speed=340,  ammo=0, pierce=99,color=( 57,255, 20)),
    "shockwave":      dict(name="Shockwave",      kind="thrown", cls="misc",   dmg=0,   cd=1.80, spread=0,    pellets=0, speed=0,    ammo=0, pierce=0, color=(158,214,255), deploy=True),
    "lightning_rod":  dict(name="Lightning Rod",  kind="thrown", cls="misc",   dmg=15,  cd=0.89, spread=0,    pellets=0, speed=0,    ammo=0, pierce=0, color=(123,224,255), deploy=True),
    "disco_bomb":     dict(name="Disco Bomb",     kind="thrown", cls="misc",   dmg=0,   cd=1.20, spread=0,    pellets=0, speed=320,  ammo=0, pierce=99,color=(255, 79,216)),
    "disposable_shield": dict(name="Disposable Shield", kind="thrown", cls="misc", dmg=0, cd=1.00, spread=0,  pellets=0, speed=0,    ammo=0, pierce=0, color=( 59,130,246), deploy=True),
    "obliterator_ray": dict(name="Obliterator Ray", kind="thrown", cls="misc", dmg=999_999_999, cd=3.00, spread=0, pellets=0, speed=0, ammo=0, pierce=99, color=(255,255,255), deploy=True),
    # NEW: replaces Portal Gun in main shop
    "the_button":     dict(name="The Button",     kind="thrown", cls="misc",   dmg=900, cd=2.50, spread=0,    pellets=0, speed=0,    ammo=0, pierce=99,color=(156,163,175), deploy=True),
}

# ---------------------------- SHOPS -------------------------------------------
MAIN_SHOP = [
    dict(id="buy_sniper",    name="Sniper",            cost=4000,    weapon="sniper",         limit=1),
    dict(id="buy_rocket",    name="Rocket Launcher",   cost=5000,    weapon="rocket",         limit=1),
    dict(id="buy_oiler",     name="Oiler",             cost=1234,    weapon="oiler",          limit=1),
    # PORTAL GUN REMOVED. Replaced by THE BUTTON below.
    dict(id="buy_button",    name="The Button",        cost=10000,   weapon="the_button",     limit=10),
    dict(id="buy_flamer",    name="Flamethrower",      cost=2643,    weapon="flamethrower",   limit=1),
    dict(id="buy_goldmg",    name="Gold MG",           cost=7777,    weapon="gold_machine_gun", limit=1),
    dict(id="buy_katana",    name="Katana",            cost=450,     weapon="katana",         limit=1),
    dict(id="buy_yamato",    name="Yamato",            cost=8500,    weapon="yamato",         limit=1),
    dict(id="buy_gauntlet",  name="Gauntlet",          cost=7500,    weapon="gauntlet",       limit=1),
    dict(id="buy_napalm",    name="Napalm",            cost=666,     weapon="napalm",         limit=10),
    dict(id="buy_shockwave", name="Shockwave",         cost=1500,    weapon="shockwave",      limit=10),
    dict(id="buy_lightrod",  name="Lightning Rod",     cost=2500,    weapon="lightning_rod",  limit=10),
    dict(id="buy_disco",     name="Disco Bomb",        cost=3500,    weapon="disco_bomb",     limit=10),
    dict(id="buy_dshield",   name="Disposable Shield", cost=3000,    weapon="disposable_shield", limit=10),
    dict(id="buy_obliterator", name="Obliterator Ray", cost=9_999_999, weapon="obliterator_ray", limit=10),
]

ALLIES = [
    # Lil One: unlimited buys, cheap, disposable
    dict(id="ally_lil_one",  name="Lil One",   role="MINION",     hp=90,        dmg=28,         speed=6, lifespan=35,  cost=10,    limit=None),
    dict(id="ally_sheriff",  name="Sheriff",   role="REVOLVER",   hp=800,       dmg=110,        speed=5, lifespan=251, cost=40,    limit=None),
    dict(id="ally_eradidog", name="Eradidog",  role="ROCKET DOG", hp=500,       dmg=95,         speed=9, lifespan=381, cost=120,   limit=None),
    dict(id="ally_stalien",  name="STAlien",   role="LASER",      hp=1000,      dmg=140,        speed=6, lifespan=480, cost=200,   limit=None),
    dict(id="ally_dude",     name="Dude",      role="ENDGAME",    hp=1_234_567_890, dmg=999_999_999, speed=7, lifespan=9999, cost=99999, limit=None),
]

# ---------------------------- DIFFICULTY --------------------------------------
DIFFICULTY = {
    "dunce":   dict(hp=0.5, dmg=0.4, fire=1.7, speed=0.55, spawn_base=4,  spawn_step=3, spawn_cap=8,  int_min=1.4,  int_max=1.8, tier_limit=7),
    "alright": dict(hp=1.0, dmg=1.0, fire=1.0, speed=1.00, spawn_base=6,  spawn_step=5, spawn_cap=18, int_min=0.55, int_max=1.5, tier_limit=15),
    "son":     dict(hp=1.6, dmg=2.0, fire=0.55,speed=1.15, spawn_base=10, spawn_step=8, spawn_cap=36, int_min=0.42, int_max=1.2, tier_limit=40),
}

# ---------------------------- CORE GAME LOOP ----------------------------------
class Game:
    def __init__(self, difficulty="alright"):
        self.diff = DIFFICULTY[difficulty]
        self.diff_name = difficulty
        self.px = 100.0; self.py = float(GROUND_Y - 44)
        self.pvx = 0.0;  self.pvy = 0.0
        self.pw, self.ph = 22, 44
        self.facing = 1
        self.on_ground = True
        self.p_max_hp = 200; self.p_hp = 200
        self.coins = 100; self.tokens = 1; self.crystals = 0
        self.kills = 0
        self.lifesteal_counter = 0     # NEW Wave 13
        self.bullets = []
        self.enemies = []
        self.allies  = []
        self.hazards = []
        self.spawn_timer = 3.5
        self.tier = 0
        self.cam_x = 0
        self.time_alive = 0.0
        self.misc_ammo = 10

    # ------------------- spawn enemies according to difficulty ----------------
    def update_spawn(self, dt, meters):
        d = self.diff
        new_tier = min(d["tier_limit"], int(meters // 666))
        if new_tier > self.tier:
            self.tier = new_tier
        desired = d["spawn_base"] + self.tier * d["spawn_step"]
        self.spawn_timer -= dt
        if self.spawn_timer <= 0:
            cur_alive = sum(1 for e in self.enemies if e["hp"] > 0)
            target = min(d["spawn_cap"], desired)
            for _ in range(max(0, target - cur_alive)):
                self.spawn_enemy()
            self.spawn_timer = d["int_max"]

    def spawn_enemy(self):
        e = dict(
            x=self.cam_x + W + random.randint(40, 200),
            y=GROUND_Y - 36, vx=-110.0 * self.diff["speed"], vy=0.0,
            w=22, h=36, hp=80 * self.diff["hp"], max_hp=80 * self.diff["hp"],
            on_ground=False, fire_cd=1.5, jumps_left=2,
            disco_until=0.0,                 # NEW Wave 13
        )
        self.enemies.append(e)

    # ------------------- enemy update with disco-bomb override ----------------
    def update_enemies(self, dt):
        now = self.time_alive
        for e in list(self.enemies):
            # Disco bomb: forced jump-only, no movement, no attacking
            if e["disco_until"] > now:
                e["vx"] = 0
                e["fire_cd"] = max(e["fire_cd"], 0.5)
                e["vy"] += 1700 * dt
                if e["on_ground"]:
                    e["vy"] = -360 - random.random() * 80
                    e["on_ground"] = False
                e["y"] += e["vy"] * dt
                if e["y"] + e["h"] >= GROUND_Y:
                    e["y"] = GROUND_Y - e["h"]; e["vy"] = 0; e["on_ground"] = True
                continue

            # Normal AI
            e["vy"] += 1700 * dt
            e["x"] += e["vx"] * dt
            e["y"] += e["vy"] * dt
            if e["y"] + e["h"] >= GROUND_Y:
                e["y"] = GROUND_Y - e["h"]; e["vy"] = 0; e["on_ground"] = True
            # touch damage
            if abs((e["x"] + e["w"]/2) - (self.px + self.pw/2)) < 18 and abs(e["y"] - self.py) < 30:
                self.damage_player(8 * self.diff["dmg"])

    # ------------------- damage / lifesteal -----------------------------------
    def damage_enemy(self, e, dmg):
        e["hp"] -= dmg
        if e["hp"] <= 0:
            self.on_kill(e)

    def on_kill(self, e):
        self.kills += 1
        if e in self.enemies:
            self.enemies.remove(e)
        # NEW WAVE 13: Lifesteal every 8th kill
        self.lifesteal_counter += 1
        if self.lifesteal_counter >= 8:
            self.lifesteal_counter = 0
            heal = min(10, self.p_max_hp - self.p_hp)
            if heal > 0:
                self.p_hp += heal
                # spawn green pulse, etc.

    def damage_player(self, dmg):
        self.p_hp -= dmg

    # ------------------- shop hooks -------------------------------------------
    def buy_ally(self, ally_id):
        a = next((x for x in ALLIES if x["id"] == ally_id), None)
        if not a: return False
        if self.tokens < a["cost"]: return False
        # Lil One has limit=None → unlimited spawning
        self.tokens -= a["cost"]
        self.allies.append(dict(def_=a, x=self.px - 40, y=self.py,
                                vx=0, vy=0, hp=a["hp"], life=a["lifespan"],
                                fire_cd=0, special_cd=20, facing=1))
        return True

    def deploy_button(self):
        """THE BUTTON: spawn a green bomb falling from the sky."""
        tx = self.px + self.pw/2 + self.facing * 120
        self.bullets.append(dict(
            x=tx, y=-40, vx=0, vy=520,
            dmg=900, life=3.0, friendly=True, r=12, pierce=99,
            color=(57,255,20), kind="napalm", source="the_button",
        ))

    def deploy_disco(self, x):
        """Disco bomb impact: places a 5s disco hazard."""
        self.hazards.append(dict(kind="disco", x=x, y=GROUND_Y - 16, life=5.0))

    def update_hazards(self, dt):
        now = self.time_alive
        for h in list(self.hazards):
            h["life"] -= dt
            if h["kind"] == "disco":
                for e in self.enemies:
                    if math.hypot(e["x"] - h["x"], e["y"] - h["y"]) < 170:
                        e["disco_until"] = max(e["disco_until"], now + 5.0)
            if h["life"] <= 0:
                self.hazards.remove(h)


# ---------------------------- BOOTSTRAP (skeleton) ----------------------------
def main():
    pygame.init()
    screen = pygame.display.set_mode((W, H))
    pygame.display.set_caption("Wave 13 Translation — pygame ce")
    clock = pygame.time.Clock()
    g = Game(difficulty="alright")
    font = pygame.font.SysFont("monospace", 14)
    running = True
    while running:
        dt = clock.tick(60) / 1000.0
        g.time_alive += dt
        for ev in pygame.event.get():
            if ev.type == pygame.QUIT: running = False
            if ev.type == pygame.KEYDOWN and ev.key == pygame.K_b:
                g.deploy_button()        # press B = THE BUTTON demo
            if ev.type == pygame.KEYDOWN and ev.key == pygame.K_d:
                g.deploy_disco(g.px + 80)# press D = disco hazard demo
            if ev.type == pygame.KEYDOWN and ev.key == pygame.K_l:
                g.buy_ally("ally_lil_one")  # press L = recruit Lil One (unlimited)

        meters = (g.px - 100) / PX_PER_METER
        g.update_spawn(dt, meters)
        g.update_enemies(dt)
        g.update_hazards(dt)
        # very small render
        screen.fill(COLOR["bg"])
        pygame.draw.rect(screen, COLOR["ground"], (0, GROUND_Y, W, H - GROUND_Y))
        pygame.draw.rect(screen, COLOR["player"], (g.px - g.cam_x, g.py, g.pw, g.ph))
        for e in g.enemies:
            col = (255, 100, 100) if e["disco_until"] > g.time_alive else (180, 80, 80)
            pygame.draw.rect(screen, col, (e["x"] - g.cam_x, e["y"], e["w"], e["h"]))
        for h in g.hazards:
            if h["kind"] == "disco":
                pygame.draw.circle(screen, (255, 79, 216), (int(h["x"] - g.cam_x), int(h["y"])), 12, 2)
        hud = font.render(f"HP {int(g.p_hp)}/{g.p_max_hp}  Kills {g.kills}  Lifesteal {g.lifesteal_counter}/8  Diff {g.diff_name}", True, COLOR["text"])
        screen.blit(hud, (8, 8))
        pygame.display.flip()
    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
