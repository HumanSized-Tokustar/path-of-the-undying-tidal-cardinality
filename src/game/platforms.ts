// Platform variant definitions (Wave 4 — adds bounce/conveyor/cloud + jump-through flag)

export type PlatformKind =
  | "stone" | "floating" | "crumble" | "ice" | "spike" | "moving"
  | "bounce" | "conveyor" | "cloud";

export interface PlatformVariant {
  kind: PlatformKind;
  topColor: string;
  bodyColor: string;
  edgeColor: string;
  friction: number;       // 1 = normal, 0.15 = ice
  damageOnTop: number;    // spike does damage
  hazardSpikes: boolean;
  passThrough: boolean;   // jump-through (only collide when falling onto top)
  bounce?: number;        // jump impulse multiplier when stepped on
  conveyorVx?: number;    // horizontal push applied while standing
  fades?: boolean;        // cloud-style fade
}

export const PLATFORM_VARIANTS: Record<PlatformKind, PlatformVariant> = {
  stone:    { kind:"stone",    topColor:"#8a5a3a", bodyColor:"#6b4226", edgeColor:"#3a2010", friction:1.0, damageOnTop:0,  hazardSpikes:false, passThrough:true },
  floating: { kind:"floating", topColor:"#b8c0d0", bodyColor:"#737d92", edgeColor:"#2a3046", friction:1.0, damageOnTop:0,  hazardSpikes:false, passThrough:true },
  crumble:  { kind:"crumble",  topColor:"#c9a06a", bodyColor:"#8a6a3a", edgeColor:"#3a2a10", friction:1.0, damageOnTop:0,  hazardSpikes:false, passThrough:true },
  ice:      { kind:"ice",      topColor:"#a6e9ff", bodyColor:"#5fb6d4", edgeColor:"#1a4a66", friction:0.15,damageOnTop:0,  hazardSpikes:false, passThrough:true },
  spike:    { kind:"spike",    topColor:"#aa3030", bodyColor:"#5a2020", edgeColor:"#1a0a0a", friction:1.0, damageOnTop:14, hazardSpikes:true,  passThrough:true },
  moving:   { kind:"moving",   topColor:"#d8a84a", bodyColor:"#8a6a2a", edgeColor:"#3a2a10", friction:1.0, damageOnTop:0,  hazardSpikes:false, passThrough:true },
  bounce:   { kind:"bounce",   topColor:"#7bff8a", bodyColor:"#3a8a4a", edgeColor:"#0a3a1a", friction:1.0, damageOnTop:0,  hazardSpikes:false, passThrough:true, bounce:1.6 },
  conveyor: { kind:"conveyor", topColor:"#ffd84a", bodyColor:"#5a4a2a", edgeColor:"#2a1a0a", friction:1.0, damageOnTop:0,  hazardSpikes:false, passThrough:true, conveyorVx:200 },
  cloud:    { kind:"cloud",    topColor:"#ffffff", bodyColor:"#d6e2ff", edgeColor:"#a0b4d6", friction:1.0, damageOnTop:0,  hazardSpikes:false, passThrough:true, fades:true },
};

// Weighted picker by distance
export function pickPlatformKind(meters: number): PlatformKind {
  const r = Math.random();
  if (meters < 200)  return "stone";
  if (meters < 600) {
    if (r < 0.45) return "stone";
    if (r < 0.7)  return "floating";
    if (r < 0.85) return "bounce";
    return "crumble";
  }
  if (meters < 1500) {
    if (r < 0.25) return "stone";
    if (r < 0.45) return "floating";
    if (r < 0.58) return "crumble";
    if (r < 0.7)  return "ice";
    if (r < 0.8)  return "moving";
    if (r < 0.9)  return "bounce";
    return "conveyor";
  }
  // late game: full variety incl. spikes + cloud
  if (r < 0.15) return "stone";
  if (r < 0.30) return "floating";
  if (r < 0.42) return "crumble";
  if (r < 0.54) return "ice";
  if (r < 0.66) return "moving";
  if (r < 0.76) return "bounce";
  if (r < 0.86) return "conveyor";
  if (r < 0.94) return "cloud";
  return "spike";
}