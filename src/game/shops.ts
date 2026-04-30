// Shop inventories for PATH OF THE UNDYING TIDAL CARDINALITY — Wave 10

import type { WeaponId } from "./weapons";

export type Currency = "coins" | "tokens" | "crystals";
export type ShopCategory = "ranged" | "melee" | "misc" | "stat" | "general";

export interface ShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  currency: Currency;
  category?: ShopCategory;
  weapon?: WeaponId;
  consumable?: "medkit" | "ammoPack";
  grenades?: number;
  maxHp?: number;
  ammo?: number;
  revive?: number;
  dash?: number;
  roll?: number;
  limit?: number;
  color: string;
  visual: string;
}

export interface AllyDef {
  id: string;
  name: string;
  role: string;
  hp: number;
  dmg: number;
  speed: number;
  lifespan: number;
  cost: number;
  currency: Currency;
  color: string;
  accent: string;
  eye: string;
  w: number; h: number;
  desc: string;
  ability: string;
}

export interface AugmentDef {
  id: string;
  name: string;
  tier: "STATUS" | "STAT" | "LEGENDARY";
  cost: number;
  currency: Currency;
  desc: string;
  color: string;
  stat?: "ammo50" | "ammo150" | "maxhp" | "dash" | "revive";
  limit?: number;
}

export const MAIN_SHOP: ShopItem[] = [
  { id:"buy_sniper", name:"Sniper", cost:4000, currency:"coins", category:"ranged", weapon:"sniper", limit:1, color:"#111111", visual:"Long black stick", desc:"100 DMG. 2 Pierce. Slow fire, fast projectile, long range. 0.75s CD." },
  { id:"buy_rocket", name:"Rocket Launcher", cost:5000, currency:"coins", category:"ranged", weapon:"rocket", limit:1, color:"#4f8a35", visual:"Long green stick with bottom handle", desc:"200 DMG. AOE damage. 2s CD." },
  { id:"buy_oiler", name:"Oiler", cost:1234, currency:"coins", category:"ranged", weapon:"oiler", limit:1, color:"#1f2937", visual:"Tank on back, hose in hand", desc:"Makes ground slippery. Enemies slip, making them vulnerable." },
  { id:"buy_portal", name:"Portal Gun", cost:8000, currency:"coins", category:"ranged", weapon:"portalgun", limit:1, color:"#38bdf8", visual:"White stick with orange/blue claws", desc:"Creates Point A & B portals. Teleports player or enemy. Lasts 3s. 4s CD." },
  { id:"buy_flamer", name:"Flamethrower", cost:2643, currency:"coins", category:"ranged", weapon:"flamethrower", limit:1, color:"#ff6a00", visual:"Orange tank and hose", desc:"Continuous stream of Fire status." },
  { id:"buy_goldmg", name:"Gold Machine Gun", cost:5555, currency:"coins", category:"ranged", weapon:"gold_machine_gun", limit:1, color:"#ffd84a", visual:"Golden", desc:"VERY VERY fast fire rate. 10 DMG per hit. 0.01s CD." },
  { id:"buy_katana", name:"Katana", cost:450, currency:"coins", category:"melee", weapon:"katana", limit:1, color:"#c9d1d9", visual:"Long gray stick", desc:"Longer basic melee. 40 DMG. 0.4s CD." },
  { id:"buy_yamato", name:"Yamato", cost:10000, currency:"coins", category:"melee", weapon:"yamato", limit:1, color:"#b9e6ff", visual:"Japanese Katana", desc:"Glint animation. Suspends enemies for combo attacks. 60 DMG." },
  { id:"buy_gauntlet", name:"Gauntlet", cost:9000, currency:"coins", category:"melee", weapon:"gauntlet", limit:1, color:"#9ca3af", visual:"2 gray gloves", desc:"Punching animation. Knocks enemies back. Triple-press J grants extra dash. 70 DMG." },
  { id:"buy_napalm", name:"Napalm", cost:666, currency:"coins", category:"misc", weapon:"napalm", limit:10, color:"#39ff14", visual:"Green bottle", desc:"Like a grenade, but applies Fire status." },
  { id:"buy_shockwave", name:"Shockwave", cost:1500, currency:"coins", category:"misc", weapon:"shockwave", limit:10, color:"#9ed6ff", visual:"Place on ground", desc:"Makes player AND enemies leap forward." },
  { id:"buy_lightrod", name:"Lightning Rod", cost:3000, currency:"coins", category:"misc", weapon:"lightning_rod", limit:10, color:"#7be0ff", visual:"Tesla stick", desc:"Place on ground. Continuous lightning. Chains with other rods. 15 DMG per 0.89s." },
  { id:"buy_disco", name:"Disco Bomb", cost:4000, currency:"coins", category:"misc", weapon:"disco_bomb", limit:10, color:"#ff4fd8", visual:"Multicolored ball", desc:"Enemies jump dance and cannot attack for 6s." },
  { id:"buy_dshield", name:"Disposable Shield", cost:3000, currency:"coins", category:"misc", weapon:"disposable_shield", limit:10, color:"#3b82f6", visual:"Black and blue shield", desc:"Creates 10s barrier blocking all attacks." },
  { id:"buy_more_ammo", name:"More Ammo (+50)", cost:1000, currency:"coins", category:"general", ammo:50, color:"#ffd84a", visual:"Yellow ammo strip", desc:"Instantly gain 50 ammo." },
  { id:"buy_ammo_box", name:"Ammo Box (+167)", cost:2500, currency:"coins", category:"general", ammo:167, color:"#ffb347", visual:"Large orange ammo crate", desc:"Instantly gain 167 ammo." },
  { id:"buy_extra_dash", name:"Extra Dash", cost:5000, currency:"coins", category:"general", dash:1, limit:1, color:"#7be0ff", visual:"Cyan speed icon", desc:"Gain one extra dash charge. Buy once." },
  { id:"buy_extra_roll", name:"Extra Roll", cost:5000, currency:"coins", category:"general", roll:1, limit:1, color:"#9ed6ff", visual:"Silver tumble icon", desc:"Gain one extra roll charge. Buy once." },
  { id:"buy_revive", name:"Revive", cost:8888, currency:"coins", category:"general", revive:1, limit:2, color:"#ff8c42", visual:"Orange phoenix spark", desc:"Gain one extra life. Buy up to 2 times." },
  { id:"buy_obliterator", name:"Obliterator Ray", cost:9999999, currency:"coins", category:"misc", weapon:"obliterator_ray", limit:10, color:"#ffffff", visual:"Big white line with infinity sign", desc:"Unstoppable ray. 999999999 DMG. 3s CD." },
];

export const ALLIES: AllyDef[] = [
  { id:"ally_lil_one", name:"Lil One", role:"MINION", hp:70, dmg:10, speed:5, lifespan:20, cost:15, currency:"tokens", color:"#8b8f98", accent:"#c9d1d9", eye:"#fff7d6", w:24, h:24, desc:"Gray cube holding a stick. Disposable minion with sword.", ability:"SWORD 10 DMG" },
  { id:"ally_sheriff", name:"Sheriff Seriff", role:"REVOLVER", hp:800, dmg:79, speed:5, lifespan:251, cost:40, currency:"tokens", color:"#7a5130", accent:"#ffd84a", eye:"#111111", w:24, h:40, desc:"Human with a hat holding a gun. Strong revolver fighter.", ability:"REVOLVER 79 DMG" },
  { id:"ally_eradidog", name:"Eradidog", role:"ROCKET DOG", hp:500, dmg:59, speed:9, lifespan:381, cost:120, currency:"tokens", color:"#8b8f98", accent:"#111111", eye:"#ff3a3a", w:36, h:24, desc:"Gray dog with black rocket strapped on back. Fast rocket support.", ability:"FAST ROCKET 59 DMG" },
  { id:"ally_stalien", name:"STAlien", role:"LASER", hp:1000, dmg:100, speed:6, lifespan:480, cost:200, currency:"tokens", color:"#6ee7b7", accent:"#7be0ff", eye:"#0a0e1f", w:26, h:40, desc:"Generic alien humanoid. Laser gun plus UFO orbital strike every 20s.", ability:"LASER 100 + ORBITAL 500" },
  { id:"ally_dude", name:"Dude Person", role:"ENDGAME", hp:1234567890, dmg:999999999, speed:7, lifespan:9999, cost:99999, currency:"tokens", color:"#2563eb", accent:"#ef4444", eye:"#fff7d6", w:28, h:42, desc:"Humanoid, red cap, blue shirt. The strongesterestesterEST.", ability:"INSTAKILL ROCKS + PUNCHES" },
];

export const AUGMENT_SHOP: AugmentDef[] = [
  { id:"aug_ammo_50", name:"Ammo +50", tier:"STAT", cost:12, currency:"crystals", desc:"Increase current ammo by 50.", color:"#ffd84a", stat:"ammo50" },
  { id:"aug_ammo_150", name:"Ammo +150", tier:"STAT", cost:30, currency:"crystals", desc:"Increase current ammo by 150.", color:"#ffb347", stat:"ammo150" },
  { id:"aug_maxhp", name:"Max Health +50", tier:"STAT", cost:35, currency:"crystals", desc:"Permanent +50 max HP. Total bonus caps at +500.", color:"#7bff8a", stat:"maxhp", limit:10 },
  { id:"aug_dash", name:"Extra Dash", tier:"STAT", cost:90, currency:"crystals", desc:"Gain one extra dash charge. Buy once.", color:"#7be0ff", stat:"dash", limit:1 },
  { id:"aug_revive", name:"Extra Revive", tier:"LEGENDARY", cost:150, currency:"crystals", desc:"Gain one extra life. Buy up to 2 times.", color:"#ff8c42", stat:"revive", limit:2 },
];
