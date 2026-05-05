"""data/weapons.py — 1:1 port of src/game/weapons.ts WEAPONS table."""
from dataclasses import dataclass

@dataclass
class WeaponDef:
    id: str
    name: str
    kind: str       # "ranged" | "melee" | "thrown"
    klass: str      # "ranged" | "melee" | "misc"
    dmg: float
    fireCd: float
    spread: float
    pellets: int
    speed: float
    ammoPerShot: int
    pierce: int
    color: str
    visual: str
    desc: str
    deploy: bool = False

WEAPONS: dict[str, WeaponDef] = {
    "pistol":       WeaponDef("pistol","Pistol","ranged","ranged",40,0.20,0.02,1,720,1,0,"#ffd166","small black pistol","Reliable starter sidearm."),
    "smg":          WeaponDef("smg","SMG","ranged","ranged",18,0.07,0.10,1,780,1,0,"#ffea84","compact dark machine pistol","Fast fire rate, wide spread."),
    "shotgun":      WeaponDef("shotgun","Shotgun","ranged","ranged",22,0.55,0.30,6,660,1,0,"#ffb347","short brown double barrel","6-pellet close-range slug."),
    "rifle":        WeaponDef("rifle","Rifle","ranged","ranged",80,0.55,0,1,980,1,1,"#9ed6ff","blue long rifle","High-damage piercing rifle."),
    "knife":        WeaponDef("knife","Knife","melee","melee",25,0.35,0,0,0,0,0,"#d8e2ff","short silver blade","Quick melee swipe."),
    "grenade":      WeaponDef("grenade","Grenade","thrown","misc",100,1.00,0,0,360,0,99,"#ff8c42","round orange grenade","AoE explosive misc."),
    "sniper":       WeaponDef("sniper","Sniper","ranged","ranged",100,0.65,0,1,1600,1,2,"#111111","long black stick","100 DMG, 2 pierce, fast long-range projectile."),
    "rocket":       WeaponDef("rocket","Rocket Launcher","ranged","ranged",200,2.00,0,1,560,1,99,"#4f8a35","long green stick with bottom handle","200 DMG rocket with AoE damage."),
    "oiler":        WeaponDef("oiler","Oiler","ranged","ranged",0,1.10,0,1,500,1,0,"#1a1a22","tank on back, hose in hand","Sprays slippery oil zones. Slipping enemies become vulnerable."),
    "portalgun":    WeaponDef("portalgun","Portal Gun","ranged","ranged",0,4.00,0,1,900,1,0,"#38bdf8","white stick with orange and blue claws","Creates Point A and B portals. Lasts 3s."),
    "flamethrower": WeaponDef("flamethrower","Flamethrower","ranged","ranged",9,0.05,0.18,1,420,1,0,"#ff6a00","orange tank on back, orange hose in hand","Continuous stream applying Fire."),
    "gold_machine_gun":WeaponDef("gold_machine_gun","Gold Machine Gun","ranged","ranged",8,0.01,0.09,1,980,1,0,"#ffd84a","golden machine gun","VERY VERY fast fire rate. 8 DMG per hit."),
    "katana":       WeaponDef("katana","Katana","melee","melee",40,0.40,0,0,0,0,0,"#c9d1d9","long gray stick","Longer version of the basic melee knife."),
    "yamato":       WeaponDef("yamato","Yamato","melee","melee",60,0.48,0,0,0,0,0,"#b9e6ff","Japanese katana with glint","Special glint. Suspends enemies in air for combos."),
    "gauntlet":     WeaponDef("gauntlet","Gauntlet","melee","melee",70,0.50,0,0,0,0,0,"#9ca3af","two gray gloves","Punching animation. Knockback. Triple-press J grants extra dash punch."),
    "medkit":       WeaponDef("medkit","Medkit","thrown","misc",0,0.50,0,0,0,0,0,"#ff6a6a","white kit with red cross","Deploy: heal +60 HP instantly.", deploy=True),
    "napalm":       WeaponDef("napalm","Napalm","thrown","misc",70,1.20,0,0,340,0,99,"#39ff14","green bottle","Like a grenade, but applies Fire status."),
    "shockwave":    WeaponDef("shockwave","Shockwave","thrown","misc",0,1.80,0,0,0,0,0,"#9ed6ff","ground plate","Places a pulse that makes player and enemies leap forward.", deploy=True),
    "lightning_rod":WeaponDef("lightning_rod","Lightning Rod","thrown","misc",15,0.89,0,0,0,0,0,"#7be0ff","Tesla stick","Placed lightning stream. Chains with other rods. 15 DMG per 0.89s.", deploy=True),
    "disco_bomb":   WeaponDef("disco_bomb","Disco Bomb","thrown","misc",0,1.20,0,0,320,0,99,"#ff4fd8","multicolored ball","Forces enemies to jump dance, unable to attack, for 6s."),
    "disposable_shield":WeaponDef("disposable_shield","Disposable Shield","thrown","misc",0,1.00,0,0,0,0,0,"#3b82f6","black and blue shield","Places a 10s barrier blocking all attacks.", deploy=True),
    "obliterator_ray":WeaponDef("obliterator_ray","Obliterator Ray","thrown","misc",999999999,3.00,0,0,0,0,99,"#ffffff","big white line with infinity sign","Unstoppable infinity ray. 999999999 DMG.", deploy=True),
    "the_button":   WeaponDef("the_button","The Button","thrown","misc",900,2.50,0,0,0,0,99,"#9ca3af","gray cube with a red button","Press button to summon a green bomb of destruction from the sky for massive AoE damage.", deploy=True),
}

STARTING_LOADOUT = ["pistol","smg","shotgun"]
STARTING_OWNED = ["pistol","smg","shotgun","rifle","knife","grenade","medkit"]
STARTING_RANGED = ["pistol","smg","shotgun","rifle","sniper","rocket"]
STARTING_MELEE = "knife"
STARTING_MISC_A = "grenade"
STARTING_MISC_B = "medkit"
