## Wave 9 — Landmarks, Shops, Status Effects, Bosses, Python Refresh

### 1. Landmark / Safe-Zone System (`src/game/engine.ts`)

Replace the current "every 1000m" landmark generator with **fixed milestone scheduling** tied to distance traveled:

- Main Shop + Augment (Upgrade) Shop: every **1234 m** — augment spawns ~280px to the right of the main shop.
- Ally Shop: every **1667 m** (independent cycle).
- Boss Arena: every **5555 m** (independent cycle, see §3).
- Shady Figure: every **3333 m** (cheap rare-augment cart).

Implementation:
- Track `nextMainAt`, `nextAllyAt`, `nextShadyAt`, `nextBossAt` (in meters). When `worldX/PX_PER_METER >= nextX`, push the landmark and advance.
- `inSafeZone` already exists; expand it to also **disable enemy AI / spawning** within **9 m (= 288 px)** of any shop landmark center. In `updateEnemies`, if `Math.abs(e.x - safeCenter) < 288`, skip movement + skip firing. In `spawnEnemy`, reject `spawnX` inside any safe zone.
- Currency rebalance: drop `coin` rates -25%, drop `token`/`crystal` rates -50% to make them harder to find (per prior user request, reaffirmed).

### 2. Shop UI Overhaul (`src/components/game/ShopOverlay.tsx`)

Rebuild to match the user's mockups:

- **Main Shop**: yellow/blue palette, header "COINS LEFT: N" + EXIT button, 2×3 grid of class-tagged cards (MISC / GENERAL / RANGED / MELEE), big sprite preview area, "TAP TO READ ITEM DESCRIPTION" hint, paginated PAGE 1/N at bottom.
- **Augment Shop**: purple palette, lightning bolt accent, RANGED / MELEE / MISC rows of empty boxes for 5 owned weapons, right-side STATUS EFFECTS panel (FIRE / FREEZE / STUN / ENFEEBLE / BLEED / ULTRA CRIT) each with an ADD button + crystal cost, "MAX 3 UPGRADES PER ITEM" footer.
- **Ally Shop**: green palette, "TOKEN LEFT: N" header, horizontal scroll of ally cards w/ sprite, lifespan, cost, READ DESCRIPTION button, max-allies counter (20 normal / 50 if all bosses beaten).

Interaction:
- **ENTER** key (or click) on a selected card buys it. Engine exposes `interactPressed` input wired to the new `interact` keybind (default ENTER).
- On successful purchase, play `audio.play("applepay")` (already loaded as `sfx_apple_pay.mp3`).
- Selected card shown via local `useState` selectedId; arrow-key navigation moves selection.

### 3. Boss Arena (separate stadium)

When player hits a 5555m milestone:
- `enterBossArena()`: snapshot `worldX`/`px`, then **teleport** to a synthetic gray-stadium stage (different background palette, no day/night, no weather, no other enemies, no other landmarks). Implemented by setting `arenaMode = true` and short-circuiting weather/landmark/enemy spawn code while it's true; render a stone-tile floor + colosseum back wall.
- Spawn the next boss from `bosses.ts` (already have all 10).
- Player physically clamped between `arenaLeft`/`arenaRight` (already implemented; just widen to full screen).
- On boss death: drop the boss-specific weapon/ally + bundle (coins / heal / powerup / crystals / tokens — already present), play `bossDeath` SFX, then `exitBossArena()` restores `worldX`/`px` and resumes normal run.

### 4. Status Effects (`src/game/weapons.ts` + `engine.ts`)

Add `StatusKind = "fire" | "lightning" | "enfeeble" | "freeze" | "slow" | "ultracrit"` and a per-enemy `statuses: { kind, until, data }[]`.

Augment shop entries (crystal costs per spec):
- **Fire** — 20 crystals — `tickDamage 10/s` for 5s.
- **Crystal Lightning** — 60 crystals — bullet chains to up to **5** nearest enemies within 140px.
- **Enfeeble** — 76 crystals — enemy outgoing damage ×0.20 for 5s.
- **Freeze** — 100 crystals — enemy `vx=vy=0` and AI skipped for 3s.
- **Slow** — 70 crystals — enemy speed ×0.50 for 5s.
- **UltraCrit** — 90 crystals — 1% chance any hit deals ×4 damage.

Stored per-weapon under `inventory.augments` keyed by weapon id (max 3 per item, enforced in shop). Apply on damage application in `damageEnemy()`. Render small status icons above enemy HP bar.

### 5. Bug Fixes & Pacing

- **Pause-menu controls list** (`PauseOverlay.tsx`): replace the hard-coded WASD/F/R text with a generated list that reads `getKeybinds()` and shows live bindings (same source as Settings).
- **Settings persistence**: already saves to `localStorage`; verified `engine.ts` calls `kbActionFor` per keypress so changes apply instantly. Add an `onChange` event so the pause overlay re-renders when keybinds change.
- **Enemy spawn pacing**: scale `spawnTimer` interval by `1 / (1 + playerAvgSpeed/40)` so enemy density doesn't lag behind a fast player. Also clamp landmark generation lookahead to `camX + W + 1200` (currently 800) to prevent pop-in at high speed.
- **Map Info menu** (`StartScreen.tsx`): new "MAP INFO" button opens a panel listing: Main Shop @ 1234m (×N), Ally Shop @ 1667m, Shady @ 3333m, Boss Arena @ 5555m, plus icon legend.

### 6. Sprite Sourcing (no licensed assets used)

All sprites are drawn procedurally on canvas (boxes, circles, gradients) — no external sources. Where the boss images you provided show a specific look (Megger Knight spiked fists, Aegis shield, Bum Ahh throne, etc.), the engine renders a simplified pixel approximation using the `bossColor`/`bossAccent`/`bossEye` already in `bosses.ts`. If you want authentic sprite art, you can later drop PNGs into `src/assets/sprites/bosses/` and we'll wire `<image>` draws — the SPRITE_GUIDE.txt already documents the expected filenames.

### 7. Python Recreation Refresh (`python_recreation/`)

- Rewrite **`game.py`** to mirror the new TS systems:
  - Fixed milestone landmark generator (1234/1667/3333/5555).
  - Safe-zone enemy AI gate (9-meter radius).
  - Status-effect framework (`Status` dataclass, applied on hit).
  - Boss arena teleport (separate `Scene` enum value with its own draw + update).
  - Shop UIs matching the mockups (pygame surfaces, ENTER to buy, plays `applepay.wav`).
  - Player max speed 40 m/s clamp.
  - Reads `keybinds.json` at startup, falls back to defaults.
- Update **`keybinds.json`** to add `"interact": "return"`.
- Rewrite **`IMPLEMENTATION_GUIDE.txt`** as a single ordered walkthrough: file layout, install pygame, asset folder structure, how to add the audio assets (where they came from — user uploads), how to drop in optional sprite PNGs, how to extend each system.
- Update **`SPRITE_GUIDE.txt`** + **`SOUND_GUIDE.txt`** with the new shop palettes + apple-pay/ENTER sound cue.

### 8. Files Touched

```text
src/game/engine.ts              landmarks, safe-zone AI gate, status effects,
                                arena teleport, pacing, interact keybind
src/game/keybinds.ts            + "interact" action (default Enter)
src/game/shops.ts               crystal-cost status augments, max 3/item rule
src/game/weapons.ts             status hooks on damage application
src/components/game/ShopOverlay.tsx     full re-skin (3 palettes, ENTER, Apple Pay)
src/components/game/PauseOverlay.tsx    live-keybind controls list
src/components/game/StartScreen.tsx     + MAP INFO button & panel
python_recreation/game.py               full rewrite mirroring above
python_recreation/keybinds.json         + interact
python_recreation/IMPLEMENTATION_GUIDE.txt   refreshed step-by-step
python_recreation/SPRITE_GUIDE.txt      shop palettes
python_recreation/SOUND_GUIDE.txt       apple-pay cue
```

### Confirm

Approve this and I'll switch to build mode and implement all 8 sections in one pass, ending with the updated Python files attached as artifacts you can download.
