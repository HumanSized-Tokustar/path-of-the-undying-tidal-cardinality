"""Weapon table — ported from src/game/weapons.ts.

Includes The Button (replaces Portal Gun in main shop) and the Disco Bomb
rework (5s jump-only, attacks disabled).
"""
from dataclasses import dataclass

@dataclass
class WeaponDef:
    id: str
    name: str
    klass: str            # "ranged" | "melee" | "misc"
    damage: float
    cost: int = 0
    cooldown: float = 0.25
    ammo: int = 0         # 0 = infinite / not ammo based
    desc: str = ""
    radius: float = 0.0   # AOE radius in px
    duration: float = 0.0 # status duration in seconds

WEAPONS: dict[str, WeaponDef] = {
    # --- starter ranged loadout (free) ---
    "pistol":      WeaponDef("pistol",      "Pistol",      "ranged", 14, 0,    0.30,  60, "Reliable starter sidearm."),
    "smg":         WeaponDef("smg",         "SMG",         "ranged", 9,  0,    0.08, 200, "High fire rate, low damage."),
    "shotgun":     WeaponDef("shotgun",     "Shotgun",     "ranged", 42, 0,    0.65,  30, "Pellets up close."),
    "rifle":       WeaponDef("rifle",       "Rifle",       "ranged", 28, 0,    0.20, 120, "Balanced full auto."),
    # --- premium ranged ---
    "sniper":      WeaponDef("sniper",      "Sniper",      "ranged", 220, 4000, 1.20, 12, "Long-range one-shotter."),
    "rocket":      WeaponDef("rocket",      "Rocket Launcher","ranged", 320, 5000, 1.40, 8, "AOE rockets.", radius=120),
    "oiler":       WeaponDef("oiler",       "Oiler",       "ranged", 18, 1234, 0.10, 240, "Sprays slick oil."),
    "flamethrower":WeaponDef("flamethrower","Flamethrower","ranged", 22, 2643, 0.05, 400, "Continuous fire stream."),
    "gold_mg":     WeaponDef("gold_mg",     "Gold Machine Gun","ranged", 35, 5555, 0.06, 600, "Glittering rapid fire."),
    # --- melee (100x mult applied at runtime, near instakill) ---
    "knife":       WeaponDef("knife",       "Knife",       "melee", 18, 0,    0.25,  0, "Quick close-range stab."),
    "katana":      WeaponDef("katana",      "Katana",      "melee", 60, 450,  0.35,  0, "Sweeping slash."),
    "yamato":      WeaponDef("yamato",      "Yamato",      "melee", 180, 10000, 0.45, 0, "Legendary cleaver."),
    "gauntlet":    WeaponDef("gauntlet",    "Gauntlet",    "melee", 120, 9000, 0.40,  0, "Crushing punches."),
    # --- misc ---
    "grenade":     WeaponDef("grenade",     "Grenade",     "misc", 140, 0,   0.80,   3, "Throwable explosive.", radius=110),
    "medkit":      WeaponDef("medkit",      "Medkit",      "misc", 0,   0,   0.5,    2, "Restores 50 HP."),
    "napalm":      WeaponDef("napalm",      "Napalm",      "misc", 240, 666, 1.0,    2, "Burning AOE field.", radius=160, duration=4.0),
    "shockwave":   WeaponDef("shockwave",   "Shockwave",   "misc", 200, 1500,1.2,    2, "Knockback ring.", radius=180),
    "lightning_rod":WeaponDef("lightning_rod","Lightning Rod","misc", 260, 3000,1.4, 2, "Calls down lightning chain."),
    "disco_bomb":  WeaponDef("disco_bomb",  "Disco Bomb",  "misc", 0,   4000,1.5,    2,
                             "Forces all enemies into a 5s jump-only frenzy. They cannot attack.",
                             radius=9999, duration=5.0),
    "shield":      WeaponDef("shield",      "Disposable Shield","misc",0,3000,2.0,  1, "Absorbs the next hit."),
    "obliterator": WeaponDef("obliterator", "Obliterator Ray","misc", 99999, 9999999, 5.0, 1, "Erases everything onscreen.", radius=9999),
    # --- THE BUTTON (replaces Portal Gun) ---
    "the_button":  WeaponDef("the_button",  "The Button",  "misc", 900, 10000, 2.0, 5,
                             "Press button to summon a green bomb of destruction from the sky for massive AOE damage.",
                             radius=180),
}

STARTING_OWNED = ["pistol", "smg", "shotgun", "rifle", "sniper", "rocket",
                  "knife", "grenade", "medkit"]
STARTING_RANGED = "pistol"
STARTING_MELEE  = "knife"
STARTING_MISC_A = "grenade"
STARTING_MISC_B = "medkit"
