"""
================================================================================
 PATH OF THE UNDYING TIDAL CARDINALITY — Pygame CE Single-File Port
 1:1 gameplay port of src/game/engine.ts + weapons.ts + shops.ts + platforms.ts
 + keybinds.ts + the React overlays.

 Run:
   python -m pip install pygame-ce numpy
   python ULTRAMAIN.py

 No external assets required. All sprites and SFX are generated procedurally
 at startup. To override, drop PNGs / WAVs into ./assets/ matching the names
 listed in SPRITE_GUIDE.txt and SOUND_GUIDE.txt (loaded automatically if found).
================================================================================
"""
from __future__ import annotations

import json, math, os, random, sys, time
from dataclasses import dataclass, field
from typing import Optional

import pygame

# --------------------------------------------------------------------------- #
# CONFIG / CONSTANTS  (mirrors src/game/engine.ts top-of-file constants)
# --------------------------------------------------------------------------- #
W, H            = 960, 540
GROUND_Y        = 460
PX_PER_METER    = 32
DAY_NIGHT_PERIOD= 60.0
PLAYER_BASE_MS  = 9.2
PLAYER_MAX_MS   = 26.0
PLAYER_ACCEL    = 2150
PLAYER_AIR_ACCEL= 1380
PLAYER_DECEL    = 2400
DASH_DURATION   = 0.22
DASH_RECHARGE   = 2.0
DASH_SPEED_MULT = 2.5
DASH_EXIT_CARRY = 0.72
GRAVITY         = 1900
JUMP_VEL        = 720
TARGET_FPS      = 60

COLOR = {
    "bg_day":      (24, 32, 60),
    "bg_night":    (8, 10, 22),
    "ground":      (59, 42, 26),
    "ground_top":  (90, 138, 58),
    "player":      (78, 200, 102),
    "player_out":  (31, 74, 38),
    "player_buckle":(255, 216, 74),
    "player_pants":(26, 58, 34),
    "bullet":      (255, 241, 153),
    "bullet_enemy":(255, 106, 106),
    "hp":          (232, 69, 69),
    "shield":      (74, 198, 255),
    "od":          (200, 123, 255),
    "text":        (255, 247, 214),
    "shadow":      (10, 14, 31),
    "coin":        (255, 216, 74),
    "token":       (123, 224, 255),
    "crystal":     (217, 123, 255),
}

ENEMY_COLOR = {
    "shooter":      (232, 93, 58),
    "shooterElite": (255, 140, 66),
    "shanker":      (168, 58, 240),
    "shankerSwift": (210, 74, 255),
    "brute":        (138, 74, 42),
    "bruteHeavy":   (90, 42, 24),
    "rider":        (58, 160, 232),
    "bomber":       (136, 143, 168),
    "sniper":       (255, 58, 106),
    "necromancer":  (5, 5, 5),
    "minion":       (58, 58, 68),
    "bron":         (17, 17, 17),
    "giant":        (139, 143, 152),
    "apache":       (95, 107, 119),
}

# --------------------------------------------------------------------------- #
# WEAPONS  (mirrors src/game/weapons.ts exactly)
# --------------------------------------------------------------------------- #
@dataclass
class WeaponDef:
    id: str; name: str; kind: str; clazz: str
    dmg: float; fireCd: float; spread: float; pellets: int
    speed: float; ammoPerShot: int; pierce: int
    color: tuple; desc: str; visual: str
    deploy: bool = False

WEAPONS: dict[str, WeaponDef] = {
    "pistol":           WeaponDef("pistol","Pistol","ranged","ranged",40,0.20,0.02,1,720,1,0,(255,209,102),"Reliable starter sidearm.","small black pistol"),
    "smg":              WeaponDef("smg","SMG","ranged","ranged",18,0.07,0.10,1,780,1,0,(255,234,132),"Fast fire rate, wide spread.","compact dark machine pistol"),
    "shotgun":          WeaponDef("shotgun","Shotgun","ranged","ranged",22,0.55,0.30,6,660,1,0,(255,179,71),"6-pellet close-range slug.","short brown double barrel"),
    "rifle":            WeaponDef("rifle","Rifle","ranged","ranged",80,0.55,0.0,1,980,1,1,(158,214,255),"High-damage piercing rifle.","blue long rifle"),
    "knife":            WeaponDef("knife","Knife","melee","melee",25,0.35,0,0,0,0,0,(216,226,255),"Quick melee swipe.","short silver blade"),
    "grenade":          WeaponDef("grenade","Grenade","thrown","misc",100,1.00,0,0,360,0,99,(255,140,66),"AoE explosive misc.","round orange grenade"),
    "sniper":           WeaponDef("sniper","Sniper","ranged","ranged",100,0.65,0,1,1600,1,2,(17,17,17),"100 DMG, 2 pierce, fast long-range.","long black stick"),
    "rocket":           WeaponDef("rocket","Rocket Launcher","ranged","ranged",200,2.00,0,1,560,1,99,(79,138,53),"200 DMG rocket with AoE damage.","green rocket launcher"),
    "oiler":            WeaponDef("oiler","Oiler","ranged","ranged",0,1.10,0,1,500,1,0,(26,26,34),"Sprays slippery oil zones.","tank on back, hose in hand"),
    "portalgun":        WeaponDef("portalgun","Portal Gun","ranged","ranged",0,4.00,0,1,900,1,0,(56,189,248),"Creates portals (legacy).","white portal device"),
    "flamethrower":     WeaponDef("flamethrower","Flamethrower","ranged","ranged",9,0.05,0.18,1,420,1,0,(255,106,0),"Continuous stream applying Fire.","orange tank + hose"),
    "gold_machine_gun": WeaponDef("gold_machine_gun","Gold Machine Gun","ranged","ranged",8,0.01,0.09,1,980,1,0,(255,216,74),"VERY VERY fast fire rate.","golden machine gun"),
    "katana":           WeaponDef("katana","Katana","melee","melee",40,0.40,0,0,0,0,0,(201,209,217),"Longer melee.","long gray stick"),
    "yamato":           WeaponDef("yamato","Yamato","melee","melee",60,0.48,0,0,0,0,0,(185,230,255),"Suspends enemies for combos.","japanese katana"),
    "gauntlet":         WeaponDef("gauntlet","Gauntlet","melee","melee",70,0.50,0,0,0,0,0,(156,163,175),"Punching with knockback.","two gray gloves"),
    "medkit":           WeaponDef("medkit","Medkit","thrown","misc",0,0.50,0,0,0,0,0,(255,106,106),"Deploy: heal +60 HP.","white kit + red cross", deploy=True),
    "napalm":           WeaponDef("napalm","Napalm","thrown","misc",70,1.20,0,0,340,0,99,(57,255,20),"Grenade that applies Fire.","green bottle"),
    "shockwave":        WeaponDef("shockwave","Shockwave","thrown","misc",0,1.80,0,0,0,0,0,(158,214,255),"Pulse that flings everyone forward.","ground plate", deploy=True),
    "lightning_rod":    WeaponDef("lightning_rod","Lightning Rod","thrown","misc",15,0.89,0,0,0,0,0,(123,224,255),"Placed Tesla, chains.","tesla stick", deploy=True),
    "disco_bomb":       WeaponDef("disco_bomb","Disco Bomb","thrown","misc",0,1.20,0,0,320,0,99,(255,79,216),"Forces enemies to jump-only for 5s, no attacking, no movement.","multicolored ball"),
    "disposable_shield":WeaponDef("disposable_shield","Disposable Shield","thrown","misc",0,1.00,0,0,0,0,0,(59,130,246),"10s barrier blocking all attacks.","black & blue shield", deploy=True),
    "obliterator_ray":  WeaponDef("obliterator_ray","Obliterator Ray","thrown","misc",999_999_999,3.00,0,0,0,0,99,(255,255,255),"Unstoppable infinity ray.","big white line + infinity", deploy=True),
    "the_button":       WeaponDef("the_button","The Button","thrown","misc",900,2.50,0,0,0,0,99,(156,163,175),"Press to summon a green sky-bomb for massive AoE.","gray cube + red button", deploy=True),
}

STARTING_OWNED   = ["pistol","smg","shotgun","rifle","knife","grenade","medkit"]
STARTING_RANGED  = ["pistol","smg","shotgun","rifle","sniper","rocket"]
STARTING_MELEE   = "knife"
STARTING_MISC_A  = "grenade"
STARTING_MISC_B  = "medkit"

# --------------------------------------------------------------------------- #
# SHOPS  (mirrors src/game/shops.ts)
# --------------------------------------------------------------------------- #
@dataclass
class ShopItem:
    id: str; name: str; desc: str; cost: int; currency: str
    category: str = "general"
    weapon: Optional[str] = None
    ammo: int = 0; revive: int = 0; dash: int = 0; roll: int = 0
    limit: int = 1
    color: tuple = (255,255,255)

MAIN_SHOP = [
    ShopItem("buy_sniper","Sniper","100 DMG, 2 Pierce. 0.75s CD.",4000,"coins","ranged","sniper",limit=1,color=(17,17,17)),
    ShopItem("buy_rocket","Rocket Launcher","200 DMG, AOE. 2s CD.",5000,"coins","ranged","rocket",limit=1,color=(79,138,53)),
    ShopItem("buy_oiler","Oiler","Slippery ground; enemies vulnerable.",1234,"coins","ranged","oiler",limit=1,color=(31,41,55)),
    ShopItem("buy_button","The Button","Summons a green sky-bomb for massive AoE. 900 DMG, r180.",10000,"coins","misc","the_button",limit=10,color=(156,163,175)),
    ShopItem("buy_flamer","Flamethrower","Continuous Fire stream.",2643,"coins","ranged","flamethrower",limit=1,color=(255,106,0)),
    ShopItem("buy_goldmg","Gold Machine Gun","8 DMG, 0.01s CD.",7777,"coins","ranged","gold_machine_gun",limit=1,color=(255,216,74)),
    ShopItem("buy_katana","Katana","40 DMG, 0.4s CD.",450,"coins","melee","katana",limit=1,color=(201,209,217)),
    ShopItem("buy_yamato","Yamato","Suspends enemies. 60 DMG.",8500,"coins","melee","yamato",limit=1,color=(185,230,255)),
    ShopItem("buy_gauntlet","Gauntlet","Knockback. 70 DMG.",7500,"coins","melee","gauntlet",limit=1,color=(156,163,175)),
    ShopItem("buy_napalm","Napalm","Grenade with Fire.",666,"coins","misc","napalm",limit=10,color=(57,255,20)),
    ShopItem("buy_shockwave","Shockwave","Leap pulse for player & enemies.",1500,"coins","misc","shockwave",limit=10,color=(158,214,255)),
    ShopItem("buy_lightrod","Lightning Rod","Continuous chained lightning.",2500,"coins","misc","lightning_rod",limit=10,color=(123,224,255)),
    ShopItem("buy_disco","Disco Bomb","Enemies jump-only for 5s, no attack/move.",3500,"coins","misc","disco_bomb",limit=10,color=(255,79,216)),
    ShopItem("buy_dshield","Disposable Shield","10s barrier blocking attacks.",3000,"coins","misc","disposable_shield",limit=10,color=(59,130,246)),
    ShopItem("buy_more_ammo","More Ammo (+50)","+50 ammo.",1000,"coins","general",ammo=50,color=(255,216,74)),
    ShopItem("buy_ammo_box","Ammo Box (+167)","+167 ammo.",2500,"coins","general",ammo=167,color=(255,179,71)),
    ShopItem("buy_extra_dash","Extra Dash","+1 dash charge.",5000,"coins","general",dash=1,limit=1,color=(123,224,255)),
    ShopItem("buy_extra_roll","Extra Roll","+1 roll charge.",5000,"coins","general",roll=1,limit=1,color=(158,214,255)),
    ShopItem("buy_revive","Revive","+1 life. Up to 2.",8888,"coins","general",revive=1,limit=2,color=(255,140,66)),
    ShopItem("buy_obliterator","Obliterator Ray","999999999 DMG. 3s CD.",9_999_999,"coins","misc","obliterator_ray",limit=10,color=(255,255,255)),
]

@dataclass
class AllyDef:
    id: str; name: str; role: str
    hp: int; dmg: int; speed: float; lifespan: float
    cost: int; currency: str
    color: tuple; accent: tuple; eye: tuple
    w: int; h: int; desc: str; ability: str

ALLIES = [
    AllyDef("ally_lil_one","Lil One","MINION",90,28,6,35,10,"tokens",(139,143,152),(201,209,217),(255,247,214),24,24,"Gray cube w/ stick. NO BUY LIMIT.","SWORD 28 DMG (UNLIMITED)"),
    AllyDef("ally_sheriff","Sheriff Seriff","REVOLVER",800,110,5,251,40,"tokens",(122,81,48),(255,216,74),(17,17,17),24,40,"Hat + revolver fighter.","REVOLVER 110 DMG"),
    AllyDef("ally_eradidog","Eradidog","ROCKET DOG",500,95,9,381,120,"tokens",(139,143,152),(17,17,17),(255,58,58),36,24,"Gray dog w/ rocket pack.","FAST ROCKET 95 + 80 AoE"),
    AllyDef("ally_stalien","STAlien","LASER",1000,140,6,480,200,"tokens",(110,231,183),(123,224,255),(10,14,31),26,40,"Alien w/ laser + UFO orbital.","LASER 140 + ORBITAL 500 (r160)"),
    AllyDef("ally_dude","Dude Person","ENDGAME",1_234_567_890,999_999_999,7,9999,99999,"tokens",(37,99,235),(239,68,68),(255,247,214),28,42,"Red cap, blue shirt. Strongest.","INSTAKILL"),
]

@dataclass
class AugmentDef:
    id: str; name: str; tier: str; cost: int; currency: str
    desc: str; color: tuple; stat: str = ""; limit: int = 999

AUGMENT_SHOP = [
    AugmentDef("aug_ammo_50","Ammo +50","STAT",12,"crystals","+50 ammo.",(255,216,74),"ammo50"),
    AugmentDef("aug_ammo_150","Ammo +150","STAT",30,"crystals","+150 ammo.",(255,179,71),"ammo150"),
    AugmentDef("aug_maxhp","Max Health +50","STAT",35,"crystals","+50 max HP, caps +500.",(123,255,138),"maxhp",10),
    AugmentDef("aug_dash","Extra Dash","STAT",90,"crystals","+1 dash.",(123,224,255),"dash",1),
    AugmentDef("aug_revive","Extra Revive","LEGENDARY",150,"crystals","+1 life. Up to 2.",(255,140,66),"revive",2),
]

STATUS_AUGMENTS = [
    ("fire","FIRE",10,"20 dmg/s for 5s."),
    ("lightning","LIGHTNING CHAIN",76,"Hit 5 targets at once."),
    ("enfeeble","ENFEEBLE",100,"Enemy attack -67% / 6s."),
    ("freeze","FREEZE",105,"Stop enemy 3s."),
    ("slow","SLOW",90,"Enemy speed -67% / 5s."),
    ("ultracrit","ULTRACRIT",125,"1% chance ×4 dmg w/ red glint."),
]

# --------------------------------------------------------------------------- #
# KEYBINDS  (mirrors keybinds.json + keybinds.ts)
# --------------------------------------------------------------------------- #
DEFAULT_KEYBINDS = {
    "moveLeft":"a","moveRight":"d","moveUp":"w","moveDown":"s",
    "jump":"space","dash":"q","roll":"z","parry":"e",
    "fire":"f","melee":"r","miscA":"o","miscB":"p","grab":"v",
    "shield":"x","overdrive":"g",
    "inventory":"tab","pause":"escape","interact":"return","shop":"t",
    "slot1":"1","slot2":"2","slot3":"3","slot4":"4","slot5":"5","slot6":"6",
}

def load_keybinds() -> dict:
    path = os.path.join(os.path.dirname(__file__), "keybinds.json")
    try:
        with open(path) as f:
            data = json.load(f)
        return {**DEFAULT_KEYBINDS, **data}
    except Exception:
        return dict(DEFAULT_KEYBINDS)

def key_name_to_pg(name: str) -> int:
    n = name.lower()
    table = {
        "space": pygame.K_SPACE, "escape": pygame.K_ESCAPE,
        "tab": pygame.K_TAB, "return": pygame.K_RETURN,
        "enter": pygame.K_RETURN, "shift": pygame.K_LSHIFT,
        "ctrl": pygame.K_LCTRL, "alt": pygame.K_LALT,
    }
    if n in table: return table[n]
    if len(n) == 1: return ord(n)
    return 0

# --------------------------------------------------------------------------- #
# AUDIO  (procedural — matches src/game/audio.ts blip style)
# --------------------------------------------------------------------------- #
class Audio:
    def __init__(self):
        try:
            pygame.mixer.pre_init(44100, -16, 1, 256)
            pygame.mixer.init()
            import numpy as np
            self.np = np
            self.enabled = True
        except Exception:
            self.enabled = False
        self.cache: dict = {}

    def beep(self, freq=440, dur=0.06, vol=0.25, kind="square"):
        if not self.enabled: return
        key = (round(freq), round(dur*1000), kind)
        if key not in self.cache:
            np = self.np
            n = int(44100*dur)
            t = np.linspace(0, dur, n, False)
            if kind == "noise":
                wave = np.random.uniform(-1,1,n)
            elif kind == "saw":
                wave = 2*(t*freq - np.floor(0.5+t*freq))
            else:
                wave = np.sign(np.sin(2*math.pi*freq*t))
            env = np.linspace(1,0,n)**1.3
            samples = (wave*env*vol*32767).astype(np.int16)
            snd = pygame.sndarray.make_sound(samples)
            self.cache[key] = snd
        try: self.cache[key].play()
        except Exception: pass

    def shoot(self): self.beep(620, 0.05, 0.18)
    def hit(self):   self.beep(180, 0.06, 0.22, "noise")
    def jump(self):  self.beep(520, 0.08, 0.18)
    def explode(self): self.beep(90, 0.30, 0.30, "noise")
    def coin(self):  self.beep(880, 0.05, 0.18); self.beep(1320, 0.06, 0.18)
    def hurt(self):  self.beep(220, 0.18, 0.30, "saw")

audio = Audio()

# --------------------------------------------------------------------------- #
# PROCEDURAL SPRITES
# --------------------------------------------------------------------------- #
def make_humanoid(w, h, body, accent, eye=(255,255,255), pants=None) -> pygame.Surface:
    surf = pygame.Surface((w, h), pygame.SRCALPHA)
    pants = pants or tuple(max(0,c-40) for c in body)
    head_h = max(8, h//4)
    pygame.draw.rect(surf, body, (w//4, 0, w//2, head_h))
    pygame.draw.rect(surf, eye,  (w//2-1, head_h//2, 2, 2))
    pygame.draw.rect(surf, body, (2, head_h, w-4, h-head_h-6))
    pygame.draw.rect(surf, accent,(2, head_h+2, w-4, 3))
    pygame.draw.rect(surf, pants,(2, h-6, (w-4)//2-1, 6))
    pygame.draw.rect(surf, pants,(w//2+1, h-6, (w-4)//2-1, 6))
    pygame.draw.rect(surf, (0,0,0), surf.get_rect(), 1)
    return surf

def make_block(w, h, body, accent=None) -> pygame.Surface:
    s = pygame.Surface((w,h), pygame.SRCALPHA)
    pygame.draw.rect(s, body, (0,0,w,h))
    if accent: pygame.draw.rect(s, accent, (2,2,w-4,3))
    pygame.draw.rect(s, (0,0,0), s.get_rect(), 1)
    return s

def make_button_item() -> pygame.Surface:
    s = pygame.Surface((20,20), pygame.SRCALPHA)
    pygame.draw.rect(s, (156,163,175),(0,4,20,16))
    pygame.draw.circle(s,(220,38,38),(10,10),5)
    pygame.draw.circle(s,(255,180,180),(8,8),2)
    pygame.draw.rect(s,(0,0,0),s.get_rect(),1)
    return s

def make_disco_ball() -> pygame.Surface:
    s = pygame.Surface((14,14), pygame.SRCALPHA)
    cols=[(255,79,216),(123,224,255),(255,234,132),(110,231,183)]
    for i in range(6):
        for j in range(6):
            pygame.draw.rect(s, random.choice(cols), (i*2+1,j*2+1,2,2))
    pygame.draw.circle(s,(0,0,0),(7,7),7,1)
    return s

# --------------------------------------------------------------------------- #
# DATA CLASSES
# --------------------------------------------------------------------------- #
@dataclass
class Bullet:
    x: float; y: float; vx: float; vy: float
    dmg: float; life: float; friendly: bool; r: float; pierce: int
    color: tuple; kind: str = "normal"; source: str = "player"

@dataclass
class Particle:
    x: float; y: float; vx: float; vy: float
    life: float; max: float; color: tuple; size: float; gravity: float = 0.0

@dataclass
class Pickup:
    x: float; y: float; vy: float; type: str; value: int; life: float

@dataclass
class Enemy:
    type: str
    x: float; y: float; vx: float; vy: float
    w: int; h: int; hp: float; maxHp: float
    onGround: bool = False; facing: int = 1
    fireCd: float = 0; aiTimer: float = 0; targetDx: float = 0
    hurtFlash: float = 0
    jumpsLeft: int = 2
    dashCd: float = 0
    summonCd: float = 0
    discoUntil: float = 0
    statuses: list = field(default_factory=list)
    flying: bool = False; baseY: float = 0

@dataclass
class FriendlyAlly:
    defn: AllyDef
    x: float; y: float; vx: float = 0; vy: float = 0
    hp: float = 0; life: float = 0; fireCd: float = 0
    specialCd: float = 0; facing: int = 1

@dataclass
class FieldHazard:
    kind: str; x: float; y: float; life: float; cd: float = 0

@dataclass
class Platform:
    x: float; y: float; w: float; h: float; kind: str = "stone"

@dataclass
class Landmark:
    kind: str   # 'main' | 'upgrade' | 'ally'
    x: float
    used: bool = False

# --------------------------------------------------------------------------- #
# DIFFICULTY (mirrors engine.ts spawn tables)
# --------------------------------------------------------------------------- #
DIFFICULTY_TABLE = {
    "dunce":   {"spawn_base":5,"spawn_step":6,"spawn_cap_increases":7, "son_mult":1.0, "necromancer_min":99999,"giant_unlock":False},
    "alright": {"spawn_base":5,"spawn_step":6,"spawn_cap_increases":15,"son_mult":1.0, "necromancer_min":2000, "giant_unlock":False},
    "son":     {"spawn_base":10,"spawn_step":12,"spawn_cap_increases":40,"son_mult":2.0,"necromancer_min":2000, "giant_unlock":True},
}

# --------------------------------------------------------------------------- #
# GAME
# --------------------------------------------------------------------------- #
class Game:
    def __init__(self, screen):
        self.screen = screen
        self.font_s = pygame.font.SysFont("consolas", 12)
        self.font   = pygame.font.SysFont("consolas", 16, bold=True)
        self.font_b = pygame.font.SysFont("consolas", 26, bold=True)
        self.font_h = pygame.font.SysFont("consolas", 38, bold=True)
        self.kb = load_keybinds()
        self.phase = "menu"
        self.difficulty = "alright"
        self.reset()

        # sprite cache
        self.sprites = {
            "player": make_humanoid(28, 40, COLOR["player"], COLOR["player_buckle"], (255,255,255), COLOR["player_pants"]),
            "the_button": make_button_item(),
            "disco_bomb": make_disco_ball(),
        }
        for et,c in ENEMY_COLOR.items():
            if et == "giant":     self.sprites[et] = make_humanoid(64, 96, c, (60,60,60))
            elif et == "apache":  self.sprites[et] = make_block(64, 28, c, (40,40,40))
            elif et in ("brute","bruteHeavy"): self.sprites[et] = make_humanoid(48,48,c,(60,40,20))
            else:                  self.sprites[et] = make_humanoid(28, 36, c, tuple(max(0,k-50) for k in c))
        for a in ALLIES:
            self.sprites[a.id] = make_humanoid(a.w, a.h, a.color, a.accent, a.eye)

        # Try to load PNG overrides
        self._load_asset_overrides()

    def _load_asset_overrides(self):
        base = os.path.join(os.path.dirname(__file__), "assets", "sprites")
        if not os.path.isdir(base): return
        mapping = {
            "player": "player/player_idle.png",
            "shooter":"enemies/shooter.png", "shanker":"enemies/shanker.png",
            "brute":"enemies/brute.png", "sniper":"enemies/sniper.png",
            "bomber":"enemies/bomber.png","rider":"enemies/rider.png",
            "ally_lil_one":"allies/lil_one.png",
        }
        for k,p in mapping.items():
            full = os.path.join(base, p)
            if os.path.isfile(full):
                try: self.sprites[k] = pygame.image.load(full).convert_alpha()
                except Exception: pass

    # ------------------------------------------------------------------ reset
    def reset(self):
        self.t = 0.0
        self.cam_x = 0.0
        self.distance = 0.0
        self.kills = 0
        self.lifesteal_counter = 0   # every 8 -> +10 HP
        self.coins = 0; self.tokens = 0; self.crystals = 0
        # Player
        self.px = W*0.4; self.py = GROUND_Y - 40
        self.pvx = 0.0; self.pvy = 0.0
        self.on_ground = False
        self.facing = 1
        self.max_hp = 200; self.hp = self.max_hp
        self.lives = 1
        self.ammo = 240; self.misc_ammo = 6
        self.dash_charges = 1; self.dash_cd_next = 0.0; self.dashing = 0.0
        self.roll_charges = 1; self.roll_cd_next = 0.0; self.rolling = 0.0
        self.parry_cd = 0.0; self.parry_window = 0.0
        self.jumps_left = 2
        # Inventory (6/1/2)
        self.owned = list(STARTING_OWNED)
        self.ranged_slots = list(STARTING_RANGED)
        self.melee = STARTING_MELEE
        self.miscA = STARTING_MISC_A
        self.miscB = STARTING_MISC_B
        self.active_ranged = 0
        self.purchase_counts: dict = {}
        self.augment_counts: dict = {}
        self.statuses_unlocked: set = set()
        # World
        self.bullets: list[Bullet] = []
        self.enemies: list[Enemy] = []
        self.allies: list[FriendlyAlly] = []
        self.particles: list[Particle] = []
        self.pickups: list[Pickup] = []
        self.hazards: list[FieldHazard] = []
        self.platforms = self._gen_platforms()
        self.landmarks: list[Landmark] = []
        self.next_main_at = 1234.0
        self.next_ally_at = 1667.0
        self.spawn_timer = 5.0
        self.spawn_increases = 0
        self.warning = None
        self.shop_open: Optional[Landmark] = None
        self.shop_tab = 0    # for upgrade shop tab cycling
        self.shop_sel = 0
        self.weapon_cd = {}  # weapon id -> next-fire time
        self.fire_cd = 0.0
        self.melee_cd = 0.0
        self.misc_cd = 0.0

    def _gen_platforms(self):
        ps = [Platform(0, GROUND_Y, 100000, 80, "stone")]
        for i in range(60):
            x = 200 + i*220 + random.randint(-40,40)
            y = GROUND_Y - random.randint(60, 220)
            ps.append(Platform(x, y, random.randint(80,180), 14, "floating"))
        return ps

    # ------------------------------------------------------------------ start
    def start(self):
        self.reset()
        self.phase = "playing"

    # ------------------------------------------------------------------ input
    def _is_down(self, action):
        keys = pygame.key.get_pressed()
        k = key_name_to_pg(self.kb.get(action,""))
        return bool(k and keys[k])

    def handle_event(self, e):
        if e.type != pygame.KEYDOWN: return
        if self.phase == "playing":
            if e.key == key_name_to_pg(self.kb["pause"]): self.phase = "paused"; return
            if e.key == key_name_to_pg(self.kb["inventory"]): self.phase = "inventory"; return
            if e.key == key_name_to_pg(self.kb["jump"]): self._do_jump()
            if e.key == key_name_to_pg(self.kb["dash"]): self._do_dash()
            if e.key == key_name_to_pg(self.kb["roll"]): self._do_roll()
            if e.key == key_name_to_pg(self.kb["miscA"]): self._do_misc(self.miscA)
            if e.key == key_name_to_pg(self.kb["miscB"]): self._do_misc(self.miscB)
            if e.key == key_name_to_pg(self.kb["melee"]): self._do_melee()
            if e.key == key_name_to_pg(self.kb["interact"]): self._try_open_shop()
            for i in range(6):
                if e.key == key_name_to_pg(self.kb[f"slot{i+1}"]): self.active_ranged = i
        elif self.phase == "paused":
            if e.key in (key_name_to_pg(self.kb["pause"]), pygame.K_ESCAPE): self.phase = "playing"
        elif self.phase == "inventory":
            if e.key in (key_name_to_pg(self.kb["inventory"]), pygame.K_ESCAPE): self.phase = "playing"
        elif self.phase == "shop":
            self._handle_shop_event(e)
        elif self.phase in ("menu","dead"):
            if e.key == pygame.K_RETURN: self.start()
            if e.key == pygame.K_1: self.difficulty = "dunce"
            if e.key == pygame.K_2: self.difficulty = "alright"
            if e.key == pygame.K_3: self.difficulty = "son"

    # ------------------------------------------------------------------ player actions
    def _do_jump(self):
        if self.jumps_left > 0:
            self.pvy = -JUMP_VEL; self.jumps_left -= 1; self.on_ground = False
            audio.jump()

    def _do_dash(self):
        if self.dash_charges > 0 and self.dash_cd_next <= 0:
            self.dash_charges -= 1; self.dash_cd_next = DASH_RECHARGE
            self.dashing = DASH_DURATION
            self.pvx = self.facing * PLAYER_MAX_MS * PX_PER_METER * DASH_SPEED_MULT
            audio.beep(900, 0.06, 0.2)

    def _do_roll(self):
        if self.roll_charges > 0 and self.roll_cd_next <= 0:
            self.roll_charges -= 1; self.roll_cd_next = 1.5
            self.rolling = 0.35
            self.pvx = self.facing * PLAYER_MAX_MS * PX_PER_METER * 1.6

    def _do_melee(self):
        if self.melee_cd > 0: return
        w = WEAPONS[self.melee]
        self.melee_cd = w.fireCd
        # MELEE BUFF: near instakill (multiplier 100x for melee class)
        dmg_mult = 100.0 if w.clazz == "melee" else 1.0
        # AOE arc in front of player
        for en in list(self.enemies):
            if abs(en.x - self.px) < 70 and abs(en.y - self.py) < 50:
                if (en.x - self.px) * self.facing >= -10:
                    self._damage_enemy(en, w.dmg * dmg_mult, "melee")
        audio.hit()

    def _do_misc(self, weapon_id):
        if self.misc_cd > 0: return
        w = WEAPONS[weapon_id]
        self.misc_cd = w.fireCd
        if weapon_id == "the_button":
            # Green sky bomb at cursor / player position
            tx = self.px + self.facing*200
            ty = -50
            self.hazards.append(FieldHazard("sky_bomb_marker", tx, GROUND_Y-20, 0.8))
            for _ in range(20):
                self.particles.append(Particle(tx, ty, random.uniform(-30,30), random.uniform(0,20), 0.8, 0.8, (57,255,20), 4, 0))
            # Schedule explosion
            self.hazards.append(FieldHazard("sky_bomb", tx, GROUND_Y-20, 0.8))
            audio.beep(300,0.2,0.3,"noise")
        elif weapon_id == "medkit":
            self.hp = min(self.max_hp, self.hp + 60); audio.beep(660,0.1,0.2)
        elif weapon_id == "grenade":
            self.bullets.append(Bullet(self.px, self.py, self.facing*360, -350, w.dmg, 1.5, True, 8, 99, (255,140,66)))
        elif weapon_id == "napalm":
            self.bullets.append(Bullet(self.px, self.py, self.facing*340, -300, w.dmg, 1.5, True, 8, 99, w.color, "napalm"))
        elif weapon_id == "disco_bomb":
            self.bullets.append(Bullet(self.px, self.py, self.facing*320, -260, 1, 1.5, True, 8, 99, w.color, "disco"))
        elif weapon_id == "shockwave":
            for en in self.enemies:
                if abs(en.x-self.px) < 200: en.vx += self.facing*400; en.vy = -300
            self.pvx += self.facing*300
        elif weapon_id == "lightning_rod":
            self.hazards.append(FieldHazard("lightning", self.px, GROUND_Y-10, 8.0, 0))
        elif weapon_id == "disposable_shield":
            self.hazards.append(FieldHazard("shield", self.px, self.py, 10.0))
        elif weapon_id == "obliterator_ray":
            for en in list(self.enemies):
                if (en.x - self.px) * self.facing > 0:
                    self._damage_enemy(en, w.dmg, "ray")

    def _try_open_shop(self):
        for lm in self.landmarks:
            if abs(lm.x - self.px) < 60:
                self.shop_open = lm; self.phase = "shop"; self.shop_sel = 0
                return

    # ------------------------------------------------------------------ shop
    def _shop_items(self):
        if self.shop_open.kind == "main": return MAIN_SHOP
        if self.shop_open.kind == "ally": return ALLIES
        if self.shop_open.kind == "upgrade":
            # combine status + augment
            items = []
            for sid,name,cost,desc in STATUS_AUGMENTS:
                items.append(("status", sid, name, cost, desc))
            for a in AUGMENT_SHOP:
                items.append(("augment", a.id, a.name, a.cost, a.desc))
            return items
        return []

    def _handle_shop_event(self, e):
        items = self._shop_items()
        if e.key in (pygame.K_ESCAPE, key_name_to_pg(self.kb["pause"])):
            self.phase = "playing"; self.shop_open = None; return
        if e.key in (pygame.K_DOWN, pygame.K_s): self.shop_sel = (self.shop_sel+1) % len(items)
        if e.key in (pygame.K_UP, pygame.K_w):   self.shop_sel = (self.shop_sel-1) % len(items)
        if e.key in (pygame.K_RETURN, key_name_to_pg(self.kb["interact"])):
            self._buy(items[self.shop_sel])

    def _can_afford(self, cost, currency):
        bal = {"coins":self.coins,"tokens":self.tokens,"crystals":self.crystals}[currency]
        return bal >= cost

    def _spend(self, cost, currency):
        if currency == "coins": self.coins -= cost
        elif currency == "tokens": self.tokens -= cost
        elif currency == "crystals": self.crystals -= cost

    def _buy(self, entry):
        if self.shop_open.kind == "main":
            it: ShopItem = entry
            n = self.purchase_counts.get(it.id, 0)
            if n >= it.limit: return
            if not self._can_afford(it.cost, it.currency): return
            self._spend(it.cost, it.currency)
            self.purchase_counts[it.id] = n+1
            if it.weapon:
                if it.weapon not in self.owned: self.owned.append(it.weapon)
                if it.category == "ranged":
                    if it.weapon not in self.ranged_slots:
                        self.ranged_slots[self.active_ranged] = it.weapon
                elif it.category == "melee":
                    self.melee = it.weapon
                elif it.category == "misc":
                    self.miscA = it.weapon
            if it.ammo: self.ammo += it.ammo
            if it.dash: self.dash_charges += it.dash
            if it.roll: self.roll_charges += it.roll
            if it.revive: self.lives += it.revive
            audio.coin()
        elif self.shop_open.kind == "ally":
            a: AllyDef = entry
            # NO LIMIT for Lil One
            if not self._can_afford(a.cost, a.currency): return
            self._spend(a.cost, a.currency)
            ally = FriendlyAlly(a, self.px+40, self.py, hp=a.hp, life=a.lifespan, facing=self.facing)
            self.allies.append(ally)
            audio.coin()
        elif self.shop_open.kind == "upgrade":
            kind, sid, name, cost, desc = entry
            if not self._can_afford(cost, "crystals"): return
            self._spend(cost, "crystals")
            if kind == "status":
                self.statuses_unlocked.add(sid)
            else:
                cnt = self.augment_counts.get(sid, 0)
                self.augment_counts[sid] = cnt+1
                if sid == "aug_ammo_50": self.ammo += 50
                elif sid == "aug_ammo_150": self.ammo += 150
                elif sid == "aug_maxhp" and cnt < 10:
                    self.max_hp += 50; self.hp = min(self.max_hp, self.hp+50)
                elif sid == "aug_dash" and cnt < 1: self.dash_charges += 1
                elif sid == "aug_revive" and cnt < 2: self.lives += 1
            audio.coin()

    # ------------------------------------------------------------------ damage
    def _damage_enemy(self, en: Enemy, dmg: float, src: str):
        en.hp -= dmg; en.hurtFlash = 0.12
        if en.hp <= 0:
            self.kills += 1
            self.lifesteal_counter += 1
            if self.lifesteal_counter >= 8:
                self.lifesteal_counter = 0
                self.hp = min(self.max_hp, self.hp + 10)
                self.particles.append(Particle(en.x, en.y, 0, -40, 1.0, 1.0, (123,255,138), 5, 0))
            # Drops
            if random.random() < 0.7:
                self.pickups.append(Pickup(en.x, en.y, -120, "coin", random.randint(1,5), 12))
            if random.random() < 0.18:
                self.pickups.append(Pickup(en.x, en.y, -120, "token", 1, 12))
            if random.random() < 0.10:
                self.pickups.append(Pickup(en.x, en.y, -120, "crystal", 1, 12))
            for _ in range(8):
                self.particles.append(Particle(en.x, en.y, random.uniform(-120,120), random.uniform(-200,-40), 0.6, 0.6, ENEMY_COLOR.get(en.type,(255,255,255)), 3, 600))
            self.enemies.remove(en)
            audio.hit()

    def _damage_player(self, dmg: float):
        if any(h.kind == "shield" and abs(h.x-self.px)<60 and abs(h.y-self.py)<60 for h in self.hazards):
            return
        if self.rolling > 0: return
        self.hp -= dmg
        audio.hurt()
        if self.hp <= 0:
            self.lives -= 1
            if self.lives > 0: self.hp = self.max_hp
            else: self.phase = "dead"

    # ------------------------------------------------------------------ spawn
    def _spawn_wave(self):
        diff = DIFFICULTY_TABLE[self.difficulty]
        base = diff["spawn_base"]
        extra = diff["spawn_step"] * int(self.distance // 666)
        cap = base + diff["spawn_step"] * diff["spawn_cap_increases"]
        count = int(min(base + extra, cap) * diff["son_mult"])
        self.spawn_increases += 1
        if self.spawn_increases % 5 == 0:
            self.warning = "(THE TIDE RISES)"
        for _ in range(count):
            self._spawn_enemy()

    def _spawn_enemy(self):
        diff = DIFFICULTY_TABLE[self.difficulty]
        side = random.choice([-1, 1])
        x = self.px + side*(W*0.6 + random.uniform(0, 200))
        # Safe zone check
        for lm in self.landmarks:
            if abs(lm.x - x) < 9*PX_PER_METER:
                x = lm.x + side*9*PX_PER_METER*1.2
        types = ["shooter","shanker","brute","rider","bomber","sniper","shooterElite","shankerSwift","bruteHeavy"]
        if self.distance >= diff["necromancer_min"] and random.random() < 0.05:
            types.append("necromancer")
        if diff["giant_unlock"] and self.distance >= 1700:
            types.extend(["bron","giant","apache"])
        t = random.choice(types)
        sprite = self.sprites.get(t)
        w,h = (sprite.get_width(), sprite.get_height()) if sprite else (28,36)
        hp = {"shooter":60,"shooterElite":90,"shanker":50,"shankerSwift":60,"brute":160,"bruteHeavy":260,
              "rider":80,"bomber":70,"sniper":90,"necromancer":200,"minion":30,"bron":300,"giant":777,"apache":500}.get(t,60)
        en = Enemy(t, x, GROUND_Y-h, 0, 0, w, h, hp, hp, jumpsLeft=2, flying=(t=="apache"))
        if t == "apache": en.y = GROUND_Y - 200; en.baseY = en.y; en.flying = True
        self.enemies.append(en)

    # ------------------------------------------------------------------ update
    def update(self, dt):
        if self.phase != "playing": return
        self.t += dt

        # --- player movement
        kb = self.kb
        ax = 0
        if self._is_down("moveLeft"):  ax -= 1; self.facing = -1
        if self._is_down("moveRight"): ax += 1; self.facing = 1
        accel = PLAYER_ACCEL if self.on_ground else PLAYER_AIR_ACCEL
        if ax != 0:
            self.pvx += ax * accel * dt
        else:
            # decel
            if self.on_ground:
                if self.pvx > 0: self.pvx = max(0, self.pvx - PLAYER_DECEL*dt)
                else:            self.pvx = min(0, self.pvx + PLAYER_DECEL*dt)
        cap = PLAYER_MAX_MS * PX_PER_METER
        if self.dashing > 0:
            self.dashing -= dt
            cap *= DASH_SPEED_MULT
        elif self.rolling > 0:
            self.rolling -= dt
        self.pvx = max(-cap, min(cap, self.pvx))

        self.pvy += GRAVITY * dt
        self.px += self.pvx * dt
        self.py += self.pvy * dt
        if self.py >= GROUND_Y - 40:
            self.py = GROUND_Y - 40; self.pvy = 0
            if not self.on_ground:
                self.jumps_left = 2
            self.on_ground = True
        else:
            self.on_ground = False

        # cooldowns
        if self.dash_cd_next > 0:
            self.dash_cd_next -= dt
            if self.dash_cd_next <= 0 and self.dash_charges < 1: self.dash_charges = 1
        if self.roll_cd_next > 0:
            self.roll_cd_next -= dt
            if self.roll_cd_next <= 0 and self.roll_charges < 1: self.roll_charges = 1
        self.fire_cd = max(0, self.fire_cd - dt)
        self.melee_cd = max(0, self.melee_cd - dt)
        self.misc_cd = max(0, self.misc_cd - dt)

        # firing (held)
        if self._is_down("fire") and self.fire_cd <= 0 and self.ammo > 0:
            w = WEAPONS[self.ranged_slots[self.active_ranged]]
            self.fire_cd = w.fireCd
            self.ammo -= w.ammoPerShot
            for _ in range(max(1, w.pellets)):
                spread = random.uniform(-w.spread, w.spread)
                vx = math.cos(spread) * w.speed * self.facing
                vy = math.sin(spread) * w.speed
                self.bullets.append(Bullet(self.px+self.facing*16, self.py-10, vx, vy, w.dmg, 1.4, True, 4, w.pierce, w.color, source=w.id))
            audio.shoot()

        # distance & camera
        self.cam_x += (self.px - W*0.4 - self.cam_x) * 0.1
        if self.pvx > 0:
            self.distance += (self.pvx * dt) / PX_PER_METER

        # spawn timer (scaled by movement speed)
        speed_factor = 1.0 + abs(self.pvx) / (PLAYER_MAX_MS * PX_PER_METER)
        self.spawn_timer -= dt * speed_factor
        if self.spawn_timer <= 0:
            self.spawn_timer = 5.0
            self._spawn_wave()

        # landmarks
        if self.distance >= self.next_main_at:
            x = self.px + W*0.7
            self.landmarks.append(Landmark("main", x))
            self.landmarks.append(Landmark("upgrade", x + 120))
            self.next_main_at += 1234
        if self.distance >= self.next_ally_at:
            self.landmarks.append(Landmark("ally", self.px + W*0.7))
            self.next_ally_at += 1667

        # bullets
        for b in list(self.bullets):
            b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt
            if b.kind in ("napalm","normal") and not b.friendly:
                pass
            # gravity for thrown
            if b.kind in ("normal",) and b.source in ("grenade","napalm","disco_bomb"):
                b.vy += 900*dt
            if b.life <= 0:
                if b.source in ("grenade","napalm","the_button"):
                    self._explode(b.x, b.y, 80, b.dmg)
                self.bullets.remove(b); continue
            # collisions
            if b.friendly:
                for en in list(self.enemies):
                    if abs(b.x-en.x) < en.w/2+b.r and abs(b.y-en.y) < en.h/2+b.r:
                        self._damage_enemy(en, b.dmg, b.source or "bullet")
                        if b.kind == "disco":
                            en.discoUntil = self.t + 5.0
                        if b.pierce <= 0:
                            if b in self.bullets: self.bullets.remove(b)
                            break
                        b.pierce -= 1
            else:
                if abs(b.x-self.px)<14+b.r and abs(b.y-self.py)<20+b.r:
                    self._damage_player(b.dmg)
                    if b in self.bullets: self.bullets.remove(b)

        # hazards
        for h in list(self.hazards):
            h.life -= dt
            if h.kind == "lightning":
                h.cd -= dt
                if h.cd <= 0:
                    h.cd = 0.89
                    for en in list(self.enemies):
                        if abs(en.x-h.x) < 220:
                            self._damage_enemy(en, 15, "lightning")
            if h.kind == "sky_bomb" and h.life <= 0:
                self._explode(h.x, GROUND_Y-30, 180, 900)
                audio.explode()
            if h.life <= 0:
                self.hazards.remove(h)

        # enemies
        for en in list(self.enemies):
            if en.discoUntil > self.t:
                # forced jump only, no attacks/movement
                en.vx = 0
                if en.onGround:
                    en.vy = -JUMP_VEL*0.7
                en.vy += GRAVITY*dt
                en.y += en.vy*dt
                if en.y >= GROUND_Y - en.h: en.y = GROUND_Y - en.h; en.vy = 0; en.onGround=True
                else: en.onGround = False
                continue
            self._update_enemy(en, dt)

        # allies
        for a in list(self.allies):
            self._update_ally(a, dt)
            a.life -= dt
            if a.life <= 0 or a.hp <= 0:
                self.allies.remove(a)

        # pickups
        for p in list(self.pickups):
            p.vy += GRAVITY*dt; p.y += p.vy*dt; p.life -= dt
            if p.y >= GROUND_Y - 8: p.y = GROUND_Y-8; p.vy = 0
            if abs(p.x - self.px) < 24 and abs(p.y - self.py) < 30:
                if p.type == "coin": self.coins += p.value
                elif p.type == "token": self.tokens += p.value
                elif p.type == "crystal": self.crystals += p.value
                audio.coin(); self.pickups.remove(p); continue
            if p.life <= 0: self.pickups.remove(p)

        # particles
        for q in list(self.particles):
            q.life -= dt
            q.x += q.vx*dt; q.y += q.vy*dt; q.vy += q.gravity*dt
            if q.life <= 0: self.particles.remove(q)

        # warning fade
        if self.warning:
            self._warn_t = getattr(self, "_warn_t", 0) + dt
            if self._warn_t > 2.5: self.warning = None; self._warn_t = 0

    def _explode(self, x, y, r, dmg):
        for en in list(self.enemies):
            if (en.x-x)**2 + (en.y-y)**2 < r*r:
                self._damage_enemy(en, dmg, "explosion")
        if (self.px-x)**2 + (self.py-y)**2 < r*r:
            self._damage_player(dmg*0.3)
        for _ in range(30):
            self.particles.append(Particle(x,y,random.uniform(-300,300),random.uniform(-300,100),0.8,0.8,(255,140,66),4,400))

    def _update_enemy(self, en: Enemy, dt):
        # Safe zone check
        in_safe = any(abs(lm.x-en.x) < 9*PX_PER_METER for lm in self.landmarks)
        en.fireCd -= dt; en.dashCd -= dt
        dx = self.px - en.x
        en.facing = 1 if dx > 0 else -1
        if in_safe: pass
        else:
            target_speed = 110
            if en.type in ("shankerSwift","rider"): target_speed = 200
            if en.type in ("brute","bruteHeavy","giant"): target_speed = 70
            en.vx += en.facing * target_speed * dt * 4
            en.vx = max(-target_speed, min(target_speed, en.vx))
        # gravity
        if not en.flying:
            en.vy += GRAVITY*dt
            en.y += en.vy*dt
            if en.y >= GROUND_Y - en.h:
                en.y = GROUND_Y - en.h; en.vy = 0; en.onGround=True; en.jumpsLeft = 2
            else:
                en.onGround = False
            # double jump near gaps / when player above
            if self.py < en.y - 60 and en.jumpsLeft > 0 and random.random() < 0.02:
                en.vy = -JUMP_VEL*0.9; en.jumpsLeft -= 1
        else:
            en.y += math.sin(self.t*2 + en.x*0.01)*30*dt
        en.x += en.vx*dt
        # firing
        if en.type in ("shooter","shooterElite","sniper","necromancer","apache","bron") and en.fireCd <= 0 and not in_safe:
            en.fireCd = {"shooter":1.2,"shooterElite":0.7,"sniper":2.0,"necromancer":2.5,"apache":0.6,"bron":1.5}[en.type]
            ang = math.atan2(self.py - en.y, self.px - en.x)
            spd = 380
            dmg = {"shooter":12,"shooterElite":18,"sniper":35,"necromancer":18,"apache":18,"bron":50}[en.type]
            self.bullets.append(Bullet(en.x, en.y, math.cos(ang)*spd, math.sin(ang)*spd, dmg, 2.0, False, 4, 0, COLOR["bullet_enemy"]))
        # melee touch
        if abs(en.x-self.px)<24 and abs(en.y-self.py)<30 and not in_safe:
            self._damage_player({"shanker":12,"shankerSwift":10,"brute":24,"bruteHeavy":34,"minion":20,"giant":70}.get(en.type,8) * dt * 4)
        # necromancer summon
        if en.type == "necromancer":
            en.summonCd -= dt
            if en.summonCd <= 0:
                en.summonCd = 6.0
                m = Enemy("minion", en.x+random.uniform(-30,30), en.y, 0,0, 24, 24, 30, 30, jumpsLeft=2)
                self.enemies.append(m)

    def _update_ally(self, a: FriendlyAlly, dt):
        # Match player speed so it can keep up
        target_speed = max(a.defn.speed * PX_PER_METER, abs(self.pvx))
        dx = self.px - a.x
        if abs(dx) > 60:
            a.vx += (1 if dx>0 else -1) * 4000 * dt
            a.vx = max(-target_speed, min(target_speed, a.vx))
            a.facing = 1 if dx>0 else -1
        else:
            a.vx *= 0.7
            # attack nearest enemy
            target = None; tmin = 9e9
            for en in self.enemies:
                d = abs(en.x-a.x)
                if d < tmin and d < 400: tmin = d; target = en
            a.fireCd -= dt
            if target and a.fireCd <= 0:
                a.fireCd = 0.6
                if a.defn.id == "ally_lil_one":
                    if abs(target.x-a.x) < 50:
                        self._damage_enemy(target, a.defn.dmg, "ally")
                else:
                    ang = math.atan2(target.y-a.y, target.x-a.x)
                    self.bullets.append(Bullet(a.x,a.y, math.cos(ang)*700, math.sin(ang)*700, a.defn.dmg, 1.5, True, 4, 1, a.defn.accent, source="ally"))
        a.vy += GRAVITY*dt
        a.x += a.vx*dt; a.y += a.vy*dt
        if a.y >= GROUND_Y - a.defn.h: a.y = GROUND_Y - a.defn.h; a.vy = 0

    # ------------------------------------------------------------------ render
    def _bg_color(self):
        # day/night
        phase = (math.sin(self.t * 2*math.pi / DAY_NIGHT_PERIOD) + 1) * 0.5
        d = COLOR["bg_day"]; n = COLOR["bg_night"]
        return tuple(int(n[i] + (d[i]-n[i])*phase) for i in range(3))

    def render(self):
        s = self.screen
        s.fill(self._bg_color())
        # ground
        gy = GROUND_Y
        pygame.draw.rect(s, COLOR["ground"], (0, gy, W, H-gy))
        pygame.draw.rect(s, COLOR["ground_top"], (0, gy-4, W, 4))
        cx = self.cam_x
        # landmarks
        for lm in self.landmarks:
            x = lm.x - cx
            if -200 < x < W+200:
                col = {"main":(80,150,200),"upgrade":(58,74,138),"ally":(80,200,140)}[lm.kind]
                pygame.draw.rect(s, col, (x-30, gy-100, 60, 100))
                txt = {"main":"MAIN SHOP","upgrade":"UPGRADE","ally":"ALLY SHOP"}[lm.kind]
                lab = self.font_s.render(txt, True, COLOR["text"])
                s.blit(lab, (x-lab.get_width()//2, gy-110))
        # pickups
        for p in self.pickups:
            col = {"coin":COLOR["coin"],"token":COLOR["token"],"crystal":COLOR["crystal"]}[p.type]
            pygame.draw.circle(s, col, (int(p.x-cx), int(p.y)), 5)
        # allies
        for a in self.allies:
            sp = self.sprites.get(a.defn.id)
            if sp:
                if a.facing < 0: sp = pygame.transform.flip(sp, True, False)
                s.blit(sp, (a.x-cx-a.defn.w//2, a.y))
            # hp bar
            pygame.draw.rect(s,(40,40,40),(a.x-cx-15, a.y-6, 30, 3))
            pygame.draw.rect(s,(123,255,138),(a.x-cx-15, a.y-6, 30*max(0,a.hp/a.defn.hp),3))
        # enemies
        for en in self.enemies:
            sp = self.sprites.get(en.type)
            if sp:
                if en.facing < 0: sp = pygame.transform.flip(sp, True, False)
                if en.hurtFlash > 0: sp = sp.copy(); sp.fill((255,255,255,100), special_flags=pygame.BLEND_RGBA_ADD)
                s.blit(sp, (en.x-cx-en.w//2, en.y))
            else:
                pygame.draw.rect(s, ENEMY_COLOR.get(en.type,(255,0,255)), (en.x-cx-en.w//2, en.y, en.w, en.h))
            # hp bar
            pygame.draw.rect(s,(40,40,40),(en.x-cx-en.w//2, en.y-6, en.w, 3))
            pygame.draw.rect(s,(232,69,69),(en.x-cx-en.w//2, en.y-6, en.w*max(0,en.hp/en.maxHp),3))
            en.hurtFlash = max(0, en.hurtFlash - 1/60)
            if en.discoUntil > self.t:
                pygame.draw.circle(s,(255,79,216),(int(en.x-cx),int(en.y-10)),3)
        # bullets
        for b in self.bullets:
            pygame.draw.circle(s, b.color, (int(b.x-cx), int(b.y)), int(b.r))
        # hazards
        for h in self.hazards:
            if h.kind == "lightning":
                pygame.draw.line(s,(123,224,255),(h.x-cx, gy),(h.x-cx, gy-180),3)
            elif h.kind == "shield":
                pygame.draw.circle(s,(59,130,246),(int(h.x-cx),int(h.y)),50,2)
            elif h.kind == "sky_bomb":
                pygame.draw.circle(s,(57,255,20),(int(h.x-cx),50),12)
                pygame.draw.line(s,(57,255,20),(h.x-cx,50),(h.x-cx,gy),2)
        # player
        sp = self.sprites["player"]
        if self.facing < 0: sp = pygame.transform.flip(sp, True, False)
        s.blit(sp, (self.px-cx-14, self.py))
        # particles
        for q in self.particles:
            a = max(0, min(255, int(255*q.life/q.max)))
            col = (*q.color, a)
            srf = pygame.Surface((int(q.size*2), int(q.size*2)), pygame.SRCALPHA)
            pygame.draw.circle(srf, col, (int(q.size), int(q.size)), int(q.size))
            s.blit(srf, (q.x-cx-q.size, q.y-q.size))

        # HUD
        self._render_hud()

        if self.warning:
            t = self.font_b.render(self.warning, True, (255,200,80))
            s.blit(t, (W//2 - t.get_width()//2, 80))

        if self.phase == "menu":     self._render_menu()
        elif self.phase == "paused": self._render_pause()
        elif self.phase == "dead":   self._render_dead()
        elif self.phase == "inventory": self._render_inventory()
        elif self.phase == "shop":   self._render_shop()

    def _render_hud(self):
        s = self.screen
        # HP
        pygame.draw.rect(s,(40,40,40),(12,12,220,14))
        pygame.draw.rect(s,COLOR["hp"],(12,12,220*max(0,self.hp/self.max_hp),14))
        s.blit(self.font_s.render(f"HP {int(self.hp)}/{int(self.max_hp)}  Lives {self.lives}", True, COLOR["text"]),(14,28))
        # Currency
        s.blit(self.font.render(f"Coins {self.coins}  Tokens {self.tokens}  Crystals {self.crystals}", True, COLOR["text"]),(12,46))
        s.blit(self.font.render(f"Ammo {self.ammo}  Misc {self.misc_ammo}  Kills {self.kills} (next heal in {8-self.lifesteal_counter})", True, COLOR["text"]),(12,66))
        s.blit(self.font.render(f"Distance {int(self.distance)} m   Diff {self.difficulty.upper()}", True, COLOR["text"]),(12,86))
        w = WEAPONS[self.ranged_slots[self.active_ranged]]
        s.blit(self.font.render(f"Weapon: {w.name}  [{self.active_ranged+1}/6]", True, COLOR["text"]), (12, H-26))

    def _render_menu(self):
        s = self.screen
        overlay = pygame.Surface((W,H), pygame.SRCALPHA); overlay.fill((0,0,0,180)); s.blit(overlay,(0,0))
        t = self.font_h.render("PATH OF THE UNDYING TIDAL CARDINALITY", True, COLOR["text"])
        s.blit(t,(W//2-t.get_width()//2, 80))
        s.blit(self.font_b.render("Pygame CE Port", True, COLOR["text"]),(W//2-90,140))
        diffs = [("1","DUNCE","dunce"),("2","ALRIGHT","alright"),("3","SON","son")]
        for i,(k,n,d) in enumerate(diffs):
            col = (255,216,74) if self.difficulty==d else COLOR["text"]
            s.blit(self.font_b.render(f"[{k}] {n}", True, col),(W//2-80, 220+i*40))
        s.blit(self.font_b.render("[ENTER] START", True, COLOR["text"]),(W//2-80, 380))
        s.blit(self.font_s.render("WASD move  SPACE jump  Q dash  Z roll  E parry  F fire  R melee  O/P misc  T interact  TAB inv  ESC pause", True, COLOR["text"]),(20,H-30))

    def _render_pause(self):
        s = self.screen
        overlay = pygame.Surface((W,H), pygame.SRCALPHA); overlay.fill((0,0,0,160)); s.blit(overlay,(0,0))
        t = self.font_h.render("PAUSED", True, COLOR["text"]); s.blit(t,(W//2-t.get_width()//2, H//2-40))
        s.blit(self.font.render("ESC to resume", True, COLOR["text"]),(W//2-60, H//2+10))

    def _render_dead(self):
        s = self.screen
        overlay = pygame.Surface((W,H), pygame.SRCALPHA); overlay.fill((0,0,0,180)); s.blit(overlay,(0,0))
        t = self.font_h.render("YOU DIED", True, (232,69,69)); s.blit(t,(W//2-t.get_width()//2, 100))
        s.blit(self.font_b.render(f"Distance {int(self.distance)} m  Kills {self.kills}", True, COLOR["text"]),(W//2-150,180))
        s.blit(self.font_b.render("[ENTER] RESTART", True, COLOR["text"]),(W//2-100,260))

    def _render_inventory(self):
        s = self.screen
        overlay = pygame.Surface((W,H), pygame.SRCALPHA); overlay.fill((0,0,0,200)); s.blit(overlay,(0,0))
        s.blit(self.font_h.render("INVENTORY", True, COLOR["text"]),(40,30))
        y = 100
        s.blit(self.font_b.render("RANGED SLOTS:", True, COLOR["text"]),(40,y)); y+=30
        for i,wid in enumerate(self.ranged_slots):
            col = (255,216,74) if i==self.active_ranged else COLOR["text"]
            s.blit(self.font.render(f"[{i+1}] {WEAPONS[wid].name}", True, col),(60,y)); y+=22
        y+=10; s.blit(self.font_b.render(f"MELEE: {WEAPONS[self.melee].name}", True, COLOR["text"]),(40,y)); y+=30
        s.blit(self.font_b.render(f"MISC A: {WEAPONS[self.miscA].name}   MISC B: {WEAPONS[self.miscB].name}", True, COLOR["text"]),(40,y)); y+=40
        s.blit(self.font.render(f"Augments: {dict(self.augment_counts)}", True, COLOR["text"]),(40,y))
        s.blit(self.font.render(f"Statuses unlocked: {sorted(self.statuses_unlocked)}", True, COLOR["text"]),(40,y+22))

    def _render_shop(self):
        s = self.screen
        overlay = pygame.Surface((W,H), pygame.SRCALPHA); overlay.fill((0,0,0,210)); s.blit(overlay,(0,0))
        kind = self.shop_open.kind
        title = {"main":"MAIN SHOP","upgrade":"UPGRADE SHOP","ally":"ALLY SHOP"}[kind]
        s.blit(self.font_h.render(title, True, COLOR["text"]),(40,20))
        s.blit(self.font.render(f"Coins {self.coins}  Tokens {self.tokens}  Crystals {self.crystals}", True, COLOR["text"]),(40,70))
        items = self._shop_items()
        y = 110
        view = items[max(0,self.shop_sel-7):self.shop_sel+8]
        for i,it in enumerate(view):
            idx = max(0,self.shop_sel-7) + i
            sel = idx == self.shop_sel
            if kind == "main":
                line = f"{it.name}  -  {it.cost} {it.currency}  -  {it.desc}"
                col = it.color
            elif kind == "ally":
                line = f"{it.name}  -  {it.cost} {it.currency}  -  HP {it.hp}  DMG {it.dmg}  {it.ability}"
                col = it.color
            else:
                _,sid,name,cost,desc = it
                line = f"{name}  -  {cost} crystals  -  {desc}"
                col = (200,200,255)
            if sel:
                pygame.draw.rect(s,(80,80,80),(30,y-3,W-60,22))
            s.blit(self.font.render(line[:90], True, col),(40,y))
            y += 22
        s.blit(self.font_s.render("UP/DOWN select  ENTER buy  ESC close", True, COLOR["text"]),(40,H-30))

# --------------------------------------------------------------------------- #
# MAIN LOOP
# --------------------------------------------------------------------------- #
def main():
    pygame.init()
    screen = pygame.display.set_mode((W, H))
    pygame.display.set_caption("Path of the Undying Tidal Cardinality - Pygame CE")
    clock = pygame.time.Clock()
    game = Game(screen)
    running = True
    while running:
        dt = clock.tick(TARGET_FPS) / 1000.0
        for e in pygame.event.get():
            if e.type == pygame.QUIT: running = False
            game.handle_event(e)
        game.update(dt)
        game.render()
        pygame.display.flip()
    pygame.quit()

if __name__ == "__main__":
    main()
