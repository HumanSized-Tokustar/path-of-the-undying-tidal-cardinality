"""Main / Upgrade / Ally shop tables.  Ported from src/game/shops.ts."""
from dataclasses import dataclass
from typing import Optional

@dataclass
class ShopItem:
    weapon_id: str
    cost: int
    purchase_limit: Optional[int] = 1   # None = unlimited

@dataclass
class AugmentDef:
    id: str
    name: str
    cost: int
    desc: str
    purchase_limit: int = 1

@dataclass
class AllyDef:
    id: str
    name: str
    cost: int
    hp: int
    speed: float
    desc: str
    purchase_limit: Optional[int] = 1   # Lil One = None

# --- Main Shop (coins) ---
MAIN_SHOP: list[ShopItem] = [
    # Ranged
    ShopItem("sniper",       4000, 1),
    ShopItem("rocket",       5000, 1),
    ShopItem("oiler",        1234, 1),
    ShopItem("flamethrower", 2643, 1),
    ShopItem("gold_mg",      5555, 1),
    # Melee
    ShopItem("katana",       450,  1),
    ShopItem("yamato",      10000, 1),
    ShopItem("gauntlet",     9000, 1),
    # Misc (10 buys each)
    ShopItem("napalm",       666, 10),
    ShopItem("shockwave",   1500, 10),
    ShopItem("lightning_rod",3000, 10),
    ShopItem("disco_bomb",  4000, 10),
    ShopItem("shield",      3000, 10),
    ShopItem("obliterator", 9999999, 1),
    # THE BUTTON replaces Portal Gun
    ShopItem("the_button", 10000, 10),
]

# --- Upgrade Shop (crystals) ---
STATUS_AUGMENTS: list[AugmentDef] = [
    AugmentDef("fire",         "Fire",          10,  "Bullets ignite enemies."),
    AugmentDef("chain",        "Lightning Chain", 76, "Hits chain to nearby enemies."),
    AugmentDef("enfeeble",     "Enfeeble",      100, "Enemies deal less damage."),
    AugmentDef("freeze",       "Freeze",        105, "Hits chance to freeze."),
    AugmentDef("slow",         "Slow",           90, "Hits slow enemy speed."),
    AugmentDef("ultracrit",    "Ultracrit",     125, "Critical hits multiplied."),
]

AUGMENT_SHOP: list[AugmentDef] = STATUS_AUGMENTS + [
    AugmentDef("ammo_50",   "Ammo Capacity +50",   60,  "Adds +50 ammo capacity.", 5),
    AugmentDef("ammo_150",  "Ammo Capacity +150",  150, "Adds +150 ammo capacity.", 5),
    AugmentDef("hp_50",     "Max HP +50",          80,  "Increase max HP by 50.", 10),
    AugmentDef("extra_dash","Extra Dash",          200, "Gain +1 dash charge.", 1),
    AugmentDef("extra_revive","Extra Revive",      300, "Gain +1 revive.", 2),
]

# --- Ally Shop (tokens) ---
ALLIES: list[AllyDef] = [
    AllyDef("lil_one",        "Lil One",         100, 60,  9.0, "Tiny pal, follows you everywhere.", purchase_limit=None),
    AllyDef("sheriff_seriff", "Sheriff Seriff",  300, 180, 7.0, "Six-shooter lawman, picks off ranged enemies.", 3),
    AllyDef("eradidog",       "Eradidog",        450, 220, 12.0,"Loyal hound, charges shankers.", 3),
    AllyDef("stalien",        "Stalien",         600, 260, 8.0, "Plasma gunner from elsewhere.", 3),
    AllyDef("dude_person",    "Dude Person",     800, 320, 9.5, "All-rounder bruiser.", 3),
]
