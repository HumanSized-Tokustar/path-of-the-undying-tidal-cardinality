// Shop inventories for PATH OF THE UNDYING TIDAL CARDINALITY — Wave 8
// Landmarks: "main" (weapons/consumables), "ally" (recruits), "shady" (augments)
// Augment shop spawns adjacent to main shop (handled in engine landmark gen).

import type { WeaponId } from "./weapons";

export type Currency = "coins" | "tokens" | "crystals";

export interface ShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  currency: Currency;
  // What it grants:
  weapon?: WeaponId;                    // adds to inventory.owned
  consumable?: "medkit" | "ammoPack";   // +1 to consumables
  grenades?: number;                    // +N grenades
  maxHp?: number;                       // +N maxHp
  // Visual accent for the item card.
  color: string;
}

export interface AllyDef {
  id: string;
  name: string;
  role: string;          // short label (DPS / TANK / HEALER / ...)
  hp: number;
  dmg: number;
  speed: number;         // m/s
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
  tier: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  cost: number;
  currency: Currency;
  desc: string;
  color: string;
}

export const MAIN_SHOP: ShopItem[] = [
  { id:"buy_rifle",     name:"Rifle",        desc:"High-damage piercing rifle.",    cost:350,  currency:"coins", weapon:"rifle",    color:"#9ed6ff" },
  { id:"buy_minigun",   name:"Minigun",      desc:"Spool-up shredder.",             cost:900,  currency:"coins", weapon:"minigun",  color:"#ffd84a" },
  { id:"buy_katana",    name:"Katana",       desc:"Wider melee arc.",               cost:420,  currency:"coins", weapon:"katana",   color:"#fff0a0" },
  { id:"buy_molotov",   name:"Molotov",      desc:"Burning AoE puddle.",            cost:260,  currency:"coins", weapon:"molotov",  color:"#ff5a2a" },
  { id:"buy_smoke",     name:"Flashbang",    desc:"Stun enemies in radius.",        cost:180,  currency:"coins", weapon:"smoke",    color:"#fff8c2" },
  { id:"buy_medkit_w",  name:"Medkit (slot)",desc:"Instant heal misc slot.",        cost:220,  currency:"coins", weapon:"medkit",   color:"#ff6a6a" },
  { id:"buy_medkit",    name:"Medkit x1",    desc:"Consumable: +60 HP.",            cost:120,  currency:"coins", consumable:"medkit", color:"#e84545" },
  { id:"buy_ammo",      name:"Ammo Pack x1", desc:"Consumable: +100 ammo.",         cost:80,   currency:"coins", consumable:"ammoPack", color:"#ffd84a" },
  { id:"buy_grenade",   name:"Grenade x3",   desc:"+3 grenades.",                   cost:150,  currency:"coins", grenades:3,        color:"#ff8c42" },
  { id:"buy_maxhp",     name:"Vitality +20", desc:"Permanent +20 max HP.",          cost:2,    currency:"tokens", maxHp:20,         color:"#7bff8a" },
  { id:"buy_awp",       name:"AWP",          desc:"Sniper rifle. Rare stock.",      cost:6,    currency:"tokens", weapon:"awp",     color:"#7be0ff" },
  { id:"buy_rocket",    name:"Rocket",       desc:"AoE rocket launcher.",           cost:8,    currency:"tokens", weapon:"rocket",  color:"#ff5a5a" },
  { id:"buy_portal",    name:"Portal Gun",   desc:"Experimental utility.",          cost:10,   currency:"tokens", weapon:"portalgun", color:"#d97bff" },
];

export const ALLIES: AllyDef[] = [
  { id:"ally_gunner",  name:"Gunner",       role:"DPS",    hp:200, dmg:18, speed:6, cost:500,  currency:"coins",
    color:"#6a78a8", accent:"#ffd84a", eye:"#7be0ff", w:22, h:36,
    desc:"Reliable allied shooter. Fires at nearest enemy.", ability:"AUTO-FIRE SMG" },
  { id:"ally_medic",   name:"Medic",        role:"HEALER", hp:160, dmg:6,  speed:6, cost:700,  currency:"coins",
    color:"#d8e2ff", accent:"#ff6a6a", eye:"#ffd84a", w:22, h:36,
    desc:"Heals you +4 HP/s when within 120px.", ability:"AURA HEAL" },
  { id:"ally_brute",   name:"Brute",        role:"TANK",   hp:600, dmg:25, speed:4, cost:900,  currency:"coins",
    color:"#8a4a2a", accent:"#3a1a10", eye:"#ff3a3a", w:32, h:44,
    desc:"Walking wall. Takes hits for you.", ability:"TAUNT" },
  { id:"ally_sniper",  name:"Sharpshooter", role:"SNIPER", hp:140, dmg:90, speed:5, cost:4,    currency:"tokens",
    color:"#2a3a6a", accent:"#7be0ff", eye:"#ffd84a", w:22, h:38,
    desc:"Slow fire, very high damage at range.", ability:"CHARGED SHOT" },
  { id:"ally_bomber",  name:"Bomber",       role:"AOE",    hp:180, dmg:45, speed:6, cost:6,    currency:"tokens",
    color:"#5a2a2a", accent:"#ff8c42", eye:"#ffd84a", w:24, h:34,
    desc:"Throws grenades at clusters.", ability:"GRENADE TOSS" },
  { id:"ally_mage",    name:"Beamer",       role:"MAGIC",  hp:160, dmg:30, speed:5, cost:3,    currency:"crystals",
    color:"#4a2a6a", accent:"#d97bff", eye:"#7be0ff", w:22, h:36,
    desc:"Fires piercing beams. Ignores armor.", ability:"PIERCE BEAM" },
  { id:"ally_phantom", name:"Phantom",      role:"STEALTH",hp:220, dmg:40, speed:9, cost:5,    currency:"crystals",
    color:"#1a1a2a", accent:"#7be0ff", eye:"#d97bff", w:22, h:36,
    desc:"Teleports near you. Backstab damage.", ability:"BLINK DAGGER" },
];

export const AUGMENT_SHOP: AugmentDef[] = [
  // Commons (coins)
  { id:"aug_hp_s",  name:"Tough Skin",       tier:"COMMON",    cost:200, currency:"coins",    desc:"+15 max HP.",                        color:"#7bff8a" },
  { id:"aug_spd_s", name:"Light Boots",      tier:"COMMON",    cost:240, currency:"coins",    desc:"+8% move speed.",                    color:"#7be0ff" },
  { id:"aug_dmg_s", name:"Sharpener",        tier:"COMMON",    cost:260, currency:"coins",    desc:"+5% ranged damage.",                 color:"#ffd84a" },
  { id:"aug_ammo",  name:"Bandoleer",        tier:"COMMON",    cost:220, currency:"coins",    desc:"+25% max ammo capacity.",            color:"#ffb347" },
  // Rares (tokens)
  { id:"aug_crit",  name:"Critical Eye",     tier:"RARE",      cost:3,   currency:"tokens",   desc:"+10% chance to deal 2× damage.",     color:"#d97bff" },
  { id:"aug_life",  name:"Vampirism",        tier:"RARE",      cost:4,   currency:"tokens",   desc:"Heal 2 HP per enemy kill.",          color:"#ff6a6a" },
  { id:"aug_dash",  name:"Double Dash",      tier:"RARE",      cost:5,   currency:"tokens",   desc:"+1 dash charge.",                    color:"#7be0ff" },
  { id:"aug_shld",  name:"Kinetic Barrier",  tier:"RARE",      cost:5,   currency:"tokens",   desc:"Shield cooldown -25%.",              color:"#ffd84a" },
  // Epics (crystals)
  { id:"aug_rage",  name:"Berserker Rage",   tier:"EPIC",      cost:2,   currency:"crystals", desc:"Under 40% HP: +40% damage.",         color:"#ff3a3a" },
  { id:"aug_chrono",name:"Chronoshift",      tier:"EPIC",      cost:3,   currency:"crystals", desc:"Roll grants 0.8s time-slow.",        color:"#d97bff" },
  { id:"aug_magnet",name:"Pickup Magnet",    tier:"EPIC",      cost:2,   currency:"crystals", desc:"Pickups auto-attract within 180px.", color:"#ffd84a" },
  // Legendary
  { id:"aug_od",    name:"Overdrive Core",   tier:"LEGENDARY", cost:5,   currency:"crystals", desc:"Overdrive fills 30% faster.",        color:"#fff0a0" },
  { id:"aug_revive",name:"Phoenix Feather",  tier:"LEGENDARY", cost:6,   currency:"crystals", desc:"Revive once with 50% HP on death.",  color:"#ff8c42" },
];
