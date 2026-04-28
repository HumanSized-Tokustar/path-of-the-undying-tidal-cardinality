// Boss definitions for PATH OF THE UNDYING TIDAL CARDINALITY — Wave 8
// Each boss is spawned at a landmark at 555m intervals; rotates through the list then loops.
// These are *data*. The engine reads from here and wires sprite colors + HP/shield + drop.

import type { WeaponId } from "./weapons";

export interface BossDef {
  id: string;
  name: string;
  hp: number;
  shield: number;
  shieldRegens: number;   // 0 = no regen, N = regenerates N times
  speed: number;          // m/s
  w: number; h: number;
  color: string;          // primary body color
  accent: string;         // accent color (trim, detail)
  eye: string;            // eye color
  dropWeapon: WeaponId | null; // special boss drop (null = ally drop)
  dropAlly: string | null;     // ally id if the drop is a permanent ally
  abilities: string[];         // short labels shown to player
  flavor: string;              // one-liner shown on spawn
}

export const BOSSES: BossDef[] = [
  { id:"megger_knight", name:"MEGGER KNIGHT",           hp:2500, shield:0, shieldRegens:0, speed:7,
    w:56, h:70, color:"#6a78a8", accent:"#b8c0d0", eye:"#ffd84a",
    dropWeapon:"spiked_gauntlets", dropAlly:null,
    abilities:["SLAM-STUN","CHARGE LEAP"],
    flavor:"MEGGER KNIGHT stomps onto the arena." },

  { id:"ahyah_omis", name:"AHYAH OMIS",                 hp:1500, shield:0, shieldRegens:0, speed:17,
    w:32, h:46, color:"#1a1a1a", accent:"#3a3a3a", eye:"#7be0ff",
    dropWeapon:"golden_awp", dropAlly:null,
    abilities:["SNIPER SHOT","POCKET SAND","ROLL"],
    flavor:"AHYAH OMIS takes position on the ridge." },

  { id:"terrorist", name:"TERRORIST",                   hp:3000, shield:0, shieldRegens:0, speed:20,
    w:34, h:44, color:"#3a4a2a", accent:"#6a7a4a", eye:"#ff3a3a",
    dropWeapon:"big_red_button", dropAlly:null,
    abilities:["GRENADE CLUSTER","ROCKET","REX-SPLODE"],
    flavor:"TERRORIST is trigger happy. Explosives incoming." },

  { id:"weakest_touhou", name:"WEAKEST TOUHOU ENEMY",   hp:4000, shield:555, shieldRegens:0, speed:20,
    w:56, h:72, color:"#5a2a2a", accent:"#8a4a4a", eye:"#ff3a3a",
    dropWeapon:"wand_beamer", dropAlly:null,
    abilities:["MACHINE GUN","BLAST SPAM","FINAL FLASH"],
    flavor:"WEAKEST TOUHOU ENEMY... is not weak." },

  { id:"aegis", name:"AEGIS",                           hp:2500, shield:3000, shieldRegens:0, speed:15,
    w:48, h:62, color:"#c87a2a", accent:"#2a1a10", eye:"#ffd84a",
    dropWeapon:"shield_of_aegis", dropAlly:null,
    abilities:["DIRECTIONAL 95% SHIELD","SHIELD RAM"],
    flavor:"AEGIS raises its shield." },

  { id:"bum_ahh_cmdr", name:"BUM AHH COMMANDER",        hp:8888, shield:5000, shieldRegens:0, speed:0,
    w:56, h:66, color:"#4a2a6a", accent:"#d97bff", eye:"#ffd84a",
    dropWeapon:"backup_bells", dropAlly:null,
    abilities:["SUMMON MINIONS","SUMMON BIG BRUTE","SUMMON GIANT","DESPERATE"],
    flavor:"BUM AHH COMMANDER does not move. He commands." },

  { id:"generic_vampire", name:"GENERIC VAMPIRE",       hp:10000, shield:0, shieldRegens:0, speed:40,
    w:30, h:46, color:"#2a0a1a", accent:"#8a0a1a", eye:"#ff3a3a",
    dropWeapon:"kusarigama", dropAlly:null,
    abilities:["CLAW BLEED","PIERCING BLOOD","GOY DASH LIFESTEAL"],
    flavor:"GENERIC VAMPIRE bares fangs." },

  { id:"dude_imitation", name:"DUDE PERSON'S INFERIOR IMITATION", hp:9999, shield:999.9, shieldRegens:0, speed:67,
    w:36, h:50, color:"#b1389a", accent:"#ffd84a", eye:"#ffffff",
    dropWeapon:"star_cosmetic", dropAlly:null,
    abilities:["ENFEEBLE PUNCH","SURPRISE!!!","PISTOL <10%"],
    flavor:"HE'S NOT THE REAL DUDE PERSON. PROBABLY." },

  { id:"dr_sighe_yan", name:"DR. SIGHE YAN. TIIESTTE",  hp:4200, shield:4200, shieldRegens:3, speed:15,
    w:34, h:46, color:"#d0d0d8", accent:"#7be0ff", eye:"#d97bff",
    dropWeapon:"potion_launcher", dropAlly:null,
    abilities:["THROW POTION","ELECTRO ZAP","IRON JOTUNN <20%"],
    flavor:"DR. SIGHE YAN. TIIESTTE activates the infinity core." },

  { id:"evilest_oat", name:"THE EVILEST STRONGEST BOSS O.A.T.", hp:25000, shield:1000, shieldRegens:5, speed:20,
    w:48, h:62, color:"#1a0a2a", accent:"#ff3a3a", eye:"#ffd84a",
    dropWeapon:null, dropAlly:"the_exiled",
    abilities:["ALL PREVIOUS ATTACKS","RED SKY"],
    flavor:"THE SKY TURNS RED. HE IS HERE." },
];

// Return the boss that should spawn at the given milestone index (1-based).
// Milestone 1 = 555m, milestone 2 = 1110m, etc.
// After milestone 10, loop with +20% hp per cycle.
export function bossForMilestone(idx: number): BossDef {
  const cycle = Math.floor((idx - 1) / BOSSES.length);
  const base = BOSSES[(idx - 1) % BOSSES.length];
  if (cycle === 0) return base;
  const scale = 1 + cycle * 0.2;
  return { ...base, hp: Math.round(base.hp * scale), shield: Math.round(base.shield * scale) };
}

export const BOSS_SPAWN_INTERVAL_METERS = 555;
