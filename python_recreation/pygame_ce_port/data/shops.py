"""data/shops.py — 1:1 port of src/game/shops.ts (MAIN_SHOP, AUGMENT_SHOP, ALLIES)."""
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class ShopItem:
    id: str
    name: str
    desc: str
    cost: int
    currency: str           # coins | tokens | crystals
    category: str = "general"
    weapon: Optional[str] = None
    consumable: Optional[str] = None
    grenades: int = 0
    maxHp: int = 0
    ammo: int = 0
    revive: int = 0
    dash: int = 0
    roll: int = 0
    limit: Optional[int] = None
    color: str = "#ffffff"
    visual: str = ""

@dataclass
class AllyDef:
    id: str
    name: str
    role: str
    hp: int
    dmg: int
    speed: float
    lifespan: int
    cost: int
    currency: str
    color: str
    accent: str
    eye: str
    w: int
    h: int
    desc: str
    ability: str

@dataclass
class AugmentDef:
    id: str
    name: str
    tier: str               # STATUS | STAT | LEGENDARY
    cost: int
    currency: str
    desc: str
    color: str
    stat: Optional[str] = None
    limit: Optional[int] = None

MAIN_SHOP: list[ShopItem] = [
    ShopItem("buy_sniper","Sniper","100 DMG. 2 Pierce. Slow fire, fast projectile, long range. 0.75s CD.",4000,"coins","ranged",weapon="sniper",limit=1,color="#111111",visual="Long black stick"),
    ShopItem("buy_rocket","Rocket Launcher","200 DMG. AOE damage. 2s CD.",5000,"coins","ranged",weapon="rocket",limit=1,color="#4f8a35",visual="Long green stick with bottom handle"),
    ShopItem("buy_oiler","Oiler","Makes ground slippery. Enemies slip, making them vulnerable.",1234,"coins","ranged",weapon="oiler",limit=1,color="#1f2937",visual="Tank on back, hose in hand"),
    ShopItem("buy_button","The Button","Press button to summon a green bomb of destruction from the sky for MASSIVE AoE damage. 900 DMG, r180.",10000,"coins","misc",weapon="the_button",limit=10,color="#9ca3af",visual="Gray cube with a red button"),
    ShopItem("buy_flamer","Flamethrower","Continuous stream of Fire status.",2643,"coins","ranged",weapon="flamethrower",limit=1,color="#ff6a00",visual="Orange tank and hose"),
    ShopItem("buy_goldmg","Gold Machine Gun","VERY VERY fast fire rate. 8 DMG per hit. 0.01s CD.",7777,"coins","ranged",weapon="gold_machine_gun",limit=1,color="#ffd84a",visual="Golden"),
    ShopItem("buy_katana","Katana","Longer basic melee. 40 DMG. 0.4s CD.",450,"coins","melee",weapon="katana",limit=1,color="#c9d1d9",visual="Long gray stick"),
    ShopItem("buy_yamato","Yamato","Glint animation. Suspends enemies for combo attacks. 60 DMG.",8500,"coins","melee",weapon="yamato",limit=1,color="#b9e6ff",visual="Japanese Katana"),
    ShopItem("buy_gauntlet","Gauntlet","Punching animation. Knocks enemies back. Triple-press J grants extra dash. 70 DMG.",7500,"coins","melee",weapon="gauntlet",limit=1,color="#9ca3af",visual="2 gray gloves"),
    ShopItem("buy_napalm","Napalm","Like a grenade, but applies Fire status.",666,"coins","misc",weapon="napalm",limit=10,color="#39ff14",visual="Green bottle"),
    ShopItem("buy_shockwave","Shockwave","Makes player AND enemies leap forward.",1500,"coins","misc",weapon="shockwave",limit=10,color="#9ed6ff",visual="Place on ground"),
    ShopItem("buy_lightrod","Lightning Rod","Place on ground. Continuous lightning. Chains with other rods. 15 DMG per 0.89s.",2500,"coins","misc",weapon="lightning_rod",limit=10,color="#7be0ff",visual="Tesla stick"),
    ShopItem("buy_disco","Disco Bomb","Enemies jump dance and cannot attack for 6s.",3500,"coins","misc",weapon="disco_bomb",limit=10,color="#ff4fd8",visual="Multicolored ball"),
    ShopItem("buy_dshield","Disposable Shield","Creates 10s barrier blocking all attacks.",3000,"coins","misc",weapon="disposable_shield",limit=10,color="#3b82f6",visual="Black and blue shield"),
    ShopItem("buy_more_ammo","More Ammo (+50)","Instantly gain 50 ammo.",1000,"coins","general",ammo=50,color="#ffd84a",visual="Yellow ammo strip"),
    ShopItem("buy_ammo_box","Ammo Box (+167)","Instantly gain 167 ammo.",2500,"coins","general",ammo=167,color="#ffb347",visual="Large orange ammo crate"),
    ShopItem("buy_extra_dash","Extra Dash","Gain one extra dash charge. Buy once.",5000,"coins","general",dash=1,limit=1,color="#7be0ff",visual="Cyan speed icon"),
    ShopItem("buy_extra_roll","Extra Roll","Gain one extra roll charge. Buy once.",5000,"coins","general",roll=1,limit=1,color="#9ed6ff",visual="Silver tumble icon"),
    ShopItem("buy_revive","Revive","Gain one extra life. Buy up to 2 times.",8888,"coins","general",revive=1,limit=2,color="#ff8c42",visual="Orange phoenix spark"),
    ShopItem("buy_obliterator","Obliterator Ray","Unstoppable ray. 999999999 DMG. 3s CD.",9999999,"coins","misc",weapon="obliterator_ray",limit=10,color="#ffffff",visual="Big white line with infinity sign"),
]

ALLIES: list[AllyDef] = [
    AllyDef("ally_lil_one","Lil One","MINION",90,28,6,35,10,"tokens","#8b8f98","#c9d1d9","#fff7d6",24,24,"Gray cube holding a stick. Disposable minion with sword. NO BUY LIMIT — spam them!","SWORD 28 DMG (UNLIMITED SPAWN)"),
    AllyDef("ally_sheriff","Sheriff Seriff","REVOLVER",800,110,5,251,40,"tokens","#7a5130","#ffd84a","#111111",24,40,"Human with a hat holding a gun. Strong revolver fighter.","REVOLVER 110 DMG"),
    AllyDef("ally_eradidog","Eradidog","ROCKET DOG",500,95,9,381,120,"tokens","#8b8f98","#111111","#ff3a3a",36,24,"Gray dog with black rocket strapped on back. Fast rocket support with AoE splash.","FAST ROCKET 95 DMG + 80 AoE"),
    AllyDef("ally_stalien","STAlien","LASER",1000,140,6,480,200,"tokens","#6ee7b7","#7be0ff","#0a0e1f",26,40,"Generic alien humanoid. Laser gun plus UFO orbital strike every 14s.","LASER 140 + ORBITAL 500 (r160)"),
    AllyDef("ally_dude","Dude Person","ENDGAME",1234567890,999999999,7,9999,99999,"tokens","#2563eb","#ef4444","#fff7d6",28,42,"Humanoid, red cap, blue shirt. The strongesterestesterEST.","INSTAKILL ROCKS + PUNCHES"),
]

AUGMENT_SHOP: list[AugmentDef] = [
    AugmentDef("aug_ammo_50","Ammo +50","STAT",12,"crystals","Increase current ammo by 50.","#ffd84a",stat="ammo50"),
    AugmentDef("aug_ammo_150","Ammo +150","STAT",30,"crystals","Increase current ammo by 150.","#ffb347",stat="ammo150"),
    AugmentDef("aug_maxhp","Max Health +50","STAT",35,"crystals","Permanent +50 max HP. Total bonus caps at +500.","#7bff8a",stat="maxhp",limit=10),
    AugmentDef("aug_dash","Extra Dash","STAT",90,"crystals","Gain one extra dash charge. Buy once.","#7be0ff",stat="dash",limit=1),
    AugmentDef("aug_revive","Extra Revive","LEGENDARY",150,"crystals","Gain one extra life. Buy up to 2 times.","#ff8c42",stat="revive",limit=2),
]
