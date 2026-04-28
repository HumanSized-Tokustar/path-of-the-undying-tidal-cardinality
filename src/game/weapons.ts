// Weapon definitions table for PATH OF THE UNDYING TIDAL CARDINALITY

export type WeaponId =
  | "pistol" | "smg" | "shotgun" | "rifle" | "knife" | "grenade"
  | "awp" | "portalgun" | "rocket" | "minigun"
  | "smoke" | "medkit" | "molotov" | "katana"
  // Wave 8 — Boss drops
  | "spiked_gauntlets" | "golden_awp" | "big_red_button" | "wand_beamer"
  | "shield_of_aegis" | "backup_bells" | "kusarigama" | "star_cosmetic"
  | "potion_launcher";

export interface WeaponDef {
  id: WeaponId;
  name: string;
  kind: "ranged" | "melee" | "thrown";
  class: "ranged" | "melee" | "misc";
  deploy?: boolean;        // misc that deploys instantly (no charge throw)
  dmg: number;
  fireCd: number;       // seconds between shots
  spread: number;       // radians
  pellets: number;      // for shotgun
  speed: number;        // px/s
  ammoPerShot: number;
  pierce: number;
  color: string;        // bullet color
  desc: string;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pistol:   { id:"pistol",   name:"Pistol",   kind:"ranged", class:"ranged", dmg:40,  fireCd:0.20, spread:0.02, pellets:1, speed:720, ammoPerShot:1, pierce:0, color:"#ffd166", desc:"Reliable starter sidearm." },
  smg:      { id:"smg",      name:"SMG",      kind:"ranged", class:"ranged", dmg:18,  fireCd:0.07, spread:0.10, pellets:1, speed:780, ammoPerShot:1, pierce:0, color:"#ffea84", desc:"Fast fire rate, wide spread." },
  shotgun:  { id:"shotgun",  name:"Shotgun",  kind:"ranged", class:"ranged", dmg:22,  fireCd:0.55, spread:0.30, pellets:6, speed:660, ammoPerShot:1, pierce:0, color:"#ffb347", desc:"6-pellet close-range slug." },
  rifle:    { id:"rifle",    name:"Rifle",    kind:"ranged", class:"ranged", dmg:80,  fireCd:0.55, spread:0.0,  pellets:1, speed:980, ammoPerShot:1, pierce:1, color:"#9ed6ff", desc:"High-damage piercing rifle." },
  knife:    { id:"knife",    name:"Knife",    kind:"melee",  class:"melee",  dmg:25,  fireCd:0.35, spread:0,    pellets:0, speed:0,   ammoPerShot:0, pierce:0, color:"#d8e2ff", desc:"Quick melee swipe (L)." },
  katana:   { id:"katana",   name:"Katana",   kind:"melee",  class:"melee",  dmg:55,  fireCd:0.32, spread:0,    pellets:0, speed:0,   ammoPerShot:0, pierce:0, color:"#fff0a0", desc:"Wider melee arc, more damage." },
  grenade:  { id:"grenade",  name:"Grenade",  kind:"thrown", class:"misc",   dmg:100, fireCd:1.00, spread:0,    pellets:0, speed:360, ammoPerShot:0, pierce:99, color:"#ff8c42", desc:"AoE explosive misc (charge to throw)." },
  smoke:    { id:"smoke",    name:"Flashbang",kind:"thrown", class:"misc",   deploy:true, dmg:0, fireCd:1.10, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:0, color:"#fff8c2", desc:"Deploy: blinds & stuns enemies in radius for 2.5s." },
  molotov:  { id:"molotov",  name:"Molotov",  kind:"thrown", class:"misc",   dmg:60,  fireCd:1.20, spread:0,    pellets:0, speed:340, ammoPerShot:0, pierce:99, color:"#ff5a2a", desc:"Burning AoE puddle (charge throw)." },
  medkit:   { id:"medkit",   name:"Medkit",   kind:"thrown", class:"misc",   deploy:true, dmg:0, fireCd:0.50, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:0, color:"#ff6a6a", desc:"Deploy: heal +60 HP instantly." },
  awp:      { id:"awp",      name:"AWP",      kind:"ranged", class:"ranged", dmg:240, fireCd:1.20, spread:0,    pellets:1, speed:1400,ammoPerShot:1, pierce:3, color:"#7be0ff", desc:"Sniper. Boss drop." },
  portalgun:{ id:"portalgun",name:"Portal Gun",kind:"ranged",class:"ranged", dmg:0,   fireCd:0.80, spread:0,    pellets:1, speed:600, ammoPerShot:1, pierce:0, color:"#d97bff", desc:"Boss drop (utility)." },
  rocket:   { id:"rocket",   name:"Rocket",   kind:"ranged", class:"ranged", dmg:160, fireCd:1.10, spread:0,    pellets:1, speed:520, ammoPerShot:1, pierce:99,color:"#ff5a5a", desc:"AoE rocket. Boss drop." },
  minigun:  { id:"minigun",  name:"Minigun",  kind:"ranged", class:"ranged", dmg:14,  fireCd:0.04, spread:0.14, pellets:1, speed:820, ammoPerShot:1, pierce:0, color:"#ffd84a", desc:"Spool-up shredder." },
  // Wave 8 — Boss drops
  spiked_gauntlets: { id:"spiked_gauntlets", name:"Spiked Gauntlets", kind:"melee", class:"melee", dmg:60, fireCd:0.30, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:0, color:"#b8c0d0", desc:"Megger Knight fists. Grants long-jump when equipped." },
  golden_awp: { id:"golden_awp", name:"Golden AWP", kind:"ranged", class:"ranged", dmg:480, fireCd:0.70, spread:0, pellets:1, speed:1600, ammoPerShot:1, pierce:4, color:"#ffd84a", desc:"Ahyah Omis' sniper. 2× AWP damage, faster fire." },
  big_red_button: { id:"big_red_button", name:"Big Red Button", kind:"thrown", class:"misc", deploy:true, dmg:6767, fireCd:420, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:99, color:"#ff3a3a", desc:"NUKE. 7-minute cooldown. One-shots almost anything." },
  wand_beamer: { id:"wand_beamer", name:"Wand Beamer", kind:"ranged", class:"ranged", dmg:20, fireCd:0.06, spread:0.04, pellets:1, speed:900, ammoPerShot:1, pierce:1, color:"#d97bff", desc:"Weakest Touhou wand. Very fast energy balls." },
  shield_of_aegis: { id:"shield_of_aegis", name:"Shield of Aegis", kind:"melee", class:"melee", dmg:35, fireCd:0.40, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:0, color:"#ffd84a", desc:"Hold melee = 80% damage reduction. Triple-tap = ram." },
  backup_bells: { id:"backup_bells", name:"Backup Bells", kind:"thrown", class:"misc", deploy:true, dmg:0, fireCd:30, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:0, color:"#ffd84a", desc:"Summons 2 minions + 1 brute + 1 giant ally for 19s." },
  kusarigama: { id:"kusarigama", name:"Kusarigama", kind:"melee", class:"melee", dmg:45, fireCd:0.38, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:0, color:"#8a0a1a", desc:"Hook sickle. Lifesteals 25 HP per hit." },
  star_cosmetic: { id:"star_cosmetic", name:"Star", kind:"thrown", class:"misc", deploy:true, dmg:0, fireCd:1, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:0, color:"#ffd84a", desc:"Sparkle trail. Purely cosmetic." },
  potion_launcher: { id:"potion_launcher", name:"Potion Launcher", kind:"ranged", class:"ranged", dmg:30, fireCd:0.55, spread:0.08, pellets:1, speed:520, ammoPerShot:1, pierce:99, color:"#7be0ff", desc:"Dr. Sighe's potion. Random status on enemies, heals allies." },
};

export const STARTING_LOADOUT: WeaponId[] = ["pistol", "smg", "shotgun"];
export const STARTING_OWNED: WeaponId[] = ["pistol", "smg", "shotgun", "rifle", "minigun", "knife", "katana", "grenade", "smoke", "molotov", "medkit"];

// New 6/1/2 class loadout
export const STARTING_RANGED: WeaponId[] = ["pistol", "smg", "shotgun", "rifle", "minigun", "rocket"];
export const STARTING_MELEE: WeaponId = "knife";
export const STARTING_MISC_A: WeaponId = "grenade";
export const STARTING_MISC_B: WeaponId = "smoke";
