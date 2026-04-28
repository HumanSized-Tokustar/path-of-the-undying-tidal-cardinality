// Rebindable keybinds system.
// Stores a mapping from canonical game action -> keyboard key (lowercased KeyboardEvent.key).
// Persists to localStorage under POTC_KEYBINDS_V1.

export type GameAction =
  | "moveLeft" | "moveRight" | "moveUp" | "moveDown"
  | "jump" | "dash" | "roll" | "parry"
  | "fire" | "melee" | "miscA" | "miscB" | "grab"
  | "shield" | "overdrive"
  | "inventory" | "pause"
  | "slot1" | "slot2" | "slot3" | "slot4" | "slot5" | "slot6";

export const ALL_ACTIONS: GameAction[] = [
  "moveLeft","moveRight","moveUp","moveDown",
  "jump","dash","roll","parry",
  "fire","melee","miscA","miscB","grab",
  "shield","overdrive",
  "inventory","pause",
  "slot1","slot2","slot3","slot4","slot5","slot6",
];

export const ACTION_LABEL: Record<GameAction, string> = {
  moveLeft: "Move Left", moveRight: "Move Right", moveUp: "Up / Climb Up", moveDown: "Down / Climb Down",
  jump: "Jump (2nd bind)", dash: "Dash", roll: "Roll", parry: "Parry",
  fire: "Fire Ranged", melee: "Melee", miscA: "Misc A (hold to charge)", miscB: "Misc B (hold to charge)", grab: "Grab (hold to charge throw)",
  shield: "Shield", overdrive: "Overdrive",
  inventory: "Inventory", pause: "Pause",
  slot1: "Ranged Slot 1", slot2: "Slot 2", slot3: "Slot 3", slot4: "Slot 4", slot5: "Slot 5", slot6: "Slot 6",
};

export const DEFAULT_KEYBINDS: Record<GameAction, string> = {
  moveLeft: "a", moveRight: "d", moveUp: "w", moveDown: "s",
  jump: " ",     // space (W also jumps in engine special-case)
  dash: "q",
  roll: "z",
  parry: "e",
  fire: "f",
  melee: "r",
  miscA: "o",
  miscB: "p",
  grab: "v",
  shield: "x",
  overdrive: "g",
  inventory: "tab",
  pause: "escape",
  slot1: "1", slot2: "2", slot3: "3", slot4: "4", slot5: "5", slot6: "6",
};

const STORAGE_KEY = "POTC_KEYBINDS_V1";

export function loadKeybinds(): Record<GameAction, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_KEYBINDS };
    const saved = JSON.parse(raw) as Partial<Record<GameAction, string>>;
    return { ...DEFAULT_KEYBINDS, ...saved };
  } catch {
    return { ...DEFAULT_KEYBINDS };
  }
}

export function saveKeybinds(kb: Record<GameAction, string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(kb)); } catch {}
}

export function resetKeybinds(): Record<GameAction, string> {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  return { ...DEFAULT_KEYBINDS };
}

// Normalize a KeyboardEvent.key into the lowercase canonical form we store.
export function normalizeKey(k: string): string {
  const low = k.toLowerCase();
  if (low === "spacebar") return " ";
  return low;
}

// Pretty-print a stored key for display.
export function prettyKey(k: string): string {
  if (k === " ") return "SPACE";
  if (k === "escape") return "ESC";
  if (k === "tab") return "TAB";
  if (k === "arrowleft") return "←";
  if (k === "arrowright") return "→";
  if (k === "arrowup") return "↑";
  if (k === "arrowdown") return "↓";
  return k.toUpperCase();
}

// Singleton accessor used by the engine
let current: Record<GameAction, string> = loadKeybinds();
export function getKeybinds() { return current; }
export function setKeybinds(kb: Record<GameAction, string>) { current = { ...kb }; saveKeybinds(current); }

// Reverse lookup: which action does this key trigger?
export function actionFor(key: string): GameAction | null {
  const k = normalizeKey(key);
  for (const a of ALL_ACTIONS) if (current[a] === k) return a;
  return null;
}
