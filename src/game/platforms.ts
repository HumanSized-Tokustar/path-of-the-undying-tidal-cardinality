// Platform variant definitions

export type PlatformKind = "stone" | "floating" | "crumble" | "ice" | "spike" | "moving";

export interface PlatformVariant {
  kind: PlatformKind;
  topColor: string;
  bodyColor: string;
  edgeColor: string;
  friction: number;       // 1 = normal, 0.2 = ice
  damageOnTop: number;    // spike does damage
  hazardSpikes: boolean;
}

export const PLATFORM_VARIANTS: Record<PlatformKind, PlatformVariant> = {
  stone:    { kind:"stone",    topColor:"#8a5a3a", bodyColor:"#6b4226", edgeColor:"#3a2010", friction:1.0, damageOnTop:0,  hazardSpikes:false },
  floating: { kind:"floating", topColor:"#b8c0d0", bodyColor:"#737d92", edgeColor:"#2a3046", friction:1.0, damageOnTop:0,  hazardSpikes:false },
  crumble:  { kind:"crumble",  topColor:"#c9a06a", bodyColor:"#8a6a3a", edgeColor:"#3a2a10", friction:1.0, damageOnTop:0,  hazardSpikes:false },
  ice:      { kind:"ice",      topColor:"#a6e9ff", bodyColor:"#5fb6d4", edgeColor:"#1a4a66", friction:0.15,damageOnTop:0,  hazardSpikes:false },
  spike:    { kind:"spike",    topColor:"#aa3030", bodyColor:"#5a2020", edgeColor:"#1a0a0a", friction:1.0, damageOnTop:14, hazardSpikes:true },
  moving:   { kind:"moving",   topColor:"#d8a84a", bodyColor:"#8a6a2a", edgeColor:"#3a2a10", friction:1.0, damageOnTop:0,  hazardSpikes:false },
};

// Weighted picker by distance (more variants unlock further out)
export function pickPlatformKind(meters: number): PlatformKind {
  const r = Math.random();
  if (meters < 200)  return "stone";
  if (meters < 600) {
    if (r < 0.6) return "stone";
    if (r < 0.9) return "floating";
    return "crumble";
  }
  if (meters < 1500) {
    if (r < 0.4) return "stone";
    if (r < 0.65) return "floating";
    if (r < 0.8) return "crumble";
    if (r < 0.92) return "ice";
    return "moving";
  }
  // late game: full variety incl. spikes
  if (r < 0.25) return "stone";
  if (r < 0.45) return "floating";
  if (r < 0.6)  return "crumble";
  if (r < 0.75) return "ice";
  if (r < 0.88) return "moving";
  return "spike";
}
