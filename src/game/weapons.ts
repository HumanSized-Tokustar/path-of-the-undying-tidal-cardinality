// Weapon definitions table for PATH OF THE UNDYING TIDAL CARDINALITY — Wave 10

export type WeaponId =
  | "pistol" | "smg" | "shotgun" | "rifle" | "knife" | "grenade"
  | "sniper" | "portalgun" | "rocket" | "gold_machine_gun"
  | "oiler" | "flamethrower" | "katana" | "yamato" | "gauntlet"
  | "medkit" | "napalm" | "shockwave" | "lightning_rod" | "disco_bomb"
  | "disposable_shield" | "obliterator_ray";

export interface WeaponDef {
  id: WeaponId;
  name: string;
  kind: "ranged" | "melee" | "thrown";
  class: "ranged" | "melee" | "misc";
  deploy?: boolean;
  dmg: number;
  fireCd: number;
  spread: number;
  pellets: number;
  speed: number;
  ammoPerShot: number;
  pierce: number;
  color: string;
  desc: string;
  visual: string;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pistol: { id:"pistol", name:"Pistol", kind:"ranged", class:"ranged", dmg:40, fireCd:0.20, spread:0.02, pellets:1, speed:720, ammoPerShot:1, pierce:0, color:"#ffd166", visual:"small black pistol", desc:"Reliable starter sidearm." },
  smg: { id:"smg", name:"SMG", kind:"ranged", class:"ranged", dmg:18, fireCd:0.07, spread:0.10, pellets:1, speed:780, ammoPerShot:1, pierce:0, color:"#ffea84", visual:"compact dark machine pistol", desc:"Fast fire rate, wide spread." },
  shotgun: { id:"shotgun", name:"Shotgun", kind:"ranged", class:"ranged", dmg:22, fireCd:0.55, spread:0.30, pellets:6, speed:660, ammoPerShot:1, pierce:0, color:"#ffb347", visual:"short brown double barrel", desc:"6-pellet close-range slug." },
  rifle: { id:"rifle", name:"Rifle", kind:"ranged", class:"ranged", dmg:80, fireCd:0.55, spread:0, pellets:1, speed:980, ammoPerShot:1, pierce:1, color:"#9ed6ff", visual:"blue long rifle", desc:"High-damage piercing rifle." },
  knife: { id:"knife", name:"Knife", kind:"melee", class:"melee", dmg:25, fireCd:0.35, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:0, color:"#d8e2ff", visual:"short silver blade", desc:"Quick melee swipe." },
  grenade: { id:"grenade", name:"Grenade", kind:"thrown", class:"misc", dmg:100, fireCd:1.00, spread:0, pellets:0, speed:360, ammoPerShot:0, pierce:99, color:"#ff8c42", visual:"round orange grenade", desc:"AoE explosive misc." },

  sniper: { id:"sniper", name:"Sniper", kind:"ranged", class:"ranged", dmg:100, fireCd:0.75, spread:0, pellets:1, speed:1600, ammoPerShot:1, pierce:2, color:"#111111", visual:"long black stick", desc:"100 DMG, 2 pierce, slow fire, fast long-range projectile." },
  rocket: { id:"rocket", name:"Rocket Launcher", kind:"ranged", class:"ranged", dmg:200, fireCd:2.00, spread:0, pellets:1, speed:560, ammoPerShot:1, pierce:99, color:"#4f8a35", visual:"long green stick with bottom handle", desc:"200 DMG rocket with AoE damage." },
  oiler: { id:"oiler", name:"Oiler", kind:"ranged", class:"ranged", dmg:0, fireCd:1.10, spread:0, pellets:1, speed:500, ammoPerShot:1, pierce:0, color:"#1a1a22", visual:"tank on back, hose in hand", desc:"Sprays slippery oil zones. Slipping enemies become vulnerable." },
  portalgun: { id:"portalgun", name:"Portal Gun", kind:"ranged", class:"ranged", dmg:0, fireCd:4.00, spread:0, pellets:1, speed:900, ammoPerShot:1, pierce:0, color:"#38bdf8", visual:"white stick with orange and blue claws", desc:"Creates Point A and B portals. Teleports player or enemy. Lasts 3s." },
  flamethrower: { id:"flamethrower", name:"Flamethrower", kind:"ranged", class:"ranged", dmg:6, fireCd:0.05, spread:0.18, pellets:1, speed:420, ammoPerShot:1, pierce:0, color:"#ff6a00", visual:"orange tank on back, orange hose in hand", desc:"Continuous stream applying Fire." },
  gold_machine_gun: { id:"gold_machine_gun", name:"Gold Machine Gun", kind:"ranged", class:"ranged", dmg:10, fireCd:0.01, spread:0.09, pellets:1, speed:980, ammoPerShot:1, pierce:0, color:"#ffd84a", visual:"golden machine gun", desc:"VERY VERY fast fire rate. 10 DMG per hit." },

  katana: { id:"katana", name:"Katana", kind:"melee", class:"melee", dmg:40, fireCd:0.40, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:0, color:"#c9d1d9", visual:"long gray stick", desc:"Longer version of the basic melee knife." },
  yamato: { id:"yamato", name:"Yamato", kind:"melee", class:"melee", dmg:60, fireCd:0.48, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:0, color:"#b9e6ff", visual:"Japanese katana with glint", desc:"Special glint. Suspends enemies in air for combos." },
  gauntlet: { id:"gauntlet", name:"Gauntlet", kind:"melee", class:"melee", dmg:70, fireCd:0.50, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:0, color:"#9ca3af", visual:"two gray gloves", desc:"Punching animation. Knockback. Triple-press J grants extra dash punch." },

  medkit: { id:"medkit", name:"Medkit", kind:"thrown", class:"misc", deploy:true, dmg:0, fireCd:0.50, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:0, color:"#ff6a6a", visual:"white kit with red cross", desc:"Deploy: heal +60 HP instantly." },
  napalm: { id:"napalm", name:"Napalm", kind:"thrown", class:"misc", dmg:70, fireCd:1.20, spread:0, pellets:0, speed:340, ammoPerShot:0, pierce:99, color:"#39ff14", visual:"green bottle", desc:"Like a grenade, but applies Fire status." },
  shockwave: { id:"shockwave", name:"Shockwave", kind:"thrown", class:"misc", deploy:true, dmg:0, fireCd:1.80, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:0, color:"#9ed6ff", visual:"ground plate", desc:"Places a pulse that makes player and enemies leap forward." },
  lightning_rod: { id:"lightning_rod", name:"Lightning Rod", kind:"thrown", class:"misc", deploy:true, dmg:15, fireCd:0.89, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:0, color:"#7be0ff", visual:"Tesla stick", desc:"Placed lightning stream. Chains with other rods. 15 DMG per 0.89s." },
  disco_bomb: { id:"disco_bomb", name:"Disco Bomb", kind:"thrown", class:"misc", dmg:0, fireCd:1.20, spread:0, pellets:0, speed:320, ammoPerShot:0, pierce:99, color:"#ff4fd8", visual:"multicolored ball", desc:"Forces enemies to jump dance, unable to attack, for 6s." },
  disposable_shield: { id:"disposable_shield", name:"Disposable Shield", kind:"thrown", class:"misc", deploy:true, dmg:0, fireCd:1.00, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:0, color:"#3b82f6", visual:"black and blue shield", desc:"Places a 10s barrier blocking all attacks." },
  obliterator_ray: { id:"obliterator_ray", name:"Obliterator Ray", kind:"thrown", class:"misc", deploy:true, dmg:999999999, fireCd:3.00, spread:0, pellets:0, speed:0, ammoPerShot:0, pierce:99, color:"#ffffff", visual:"big white line with infinity sign", desc:"Unstoppable infinity ray. 999999999 DMG." },
};

export const STARTING_LOADOUT: WeaponId[] = ["pistol", "smg", "shotgun"];
export const STARTING_OWNED: WeaponId[] = ["pistol", "smg", "shotgun", "rifle", "knife", "grenade", "medkit"];

export const STARTING_RANGED: WeaponId[] = ["pistol", "smg", "shotgun", "rifle", "sniper", "rocket"];
export const STARTING_MELEE: WeaponId = "knife";
export const STARTING_MISC_A: WeaponId = "grenade";
export const STARTING_MISC_B: WeaponId = "medkit";
