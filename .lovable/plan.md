# Wave 8 — Rebindable controls, responsive UI, 10-boss system, polished shops, full Python sync

## 1. Rebindable keybinds (Settings menu)

- New `SettingsOverlay.tsx` accessed via a `SETTINGS` button on `StartScreen` and on the `PauseOverlay`.
- Tabs: **Audio** (existing sliders) and **Controls** (new).
- Controls tab lists every action (Move U/D/L/R, Jump, Dash, Roll, Parry, Fire, Melee, MiscA, MiscB, Grab, Shield, Overdrive, Inventory, Pause, Slots 1-6). Clicking a row → "Press any key…" → captures next keydown, validates no duplicate, saves.
- Bindings persisted in `localStorage` (`potc.keybinds.v1`) and loaded into `Game.keybinds` at boot. Defaults = Wave 6 layout (Q dash, Z roll, E parry, W/SPACE jump, ESC pause, O/P misc, etc.).
- `Game.onKeyDown/onKeyUp` refactored: instead of a `switch(e.code)`, it looks up `this.keybinds.actionFor(e.code)` and dispatches.
- A **RESET DEFAULTS** button restores the Wave 6 map.

## 2. Responsive UI (fix the clipped HUD in the screenshot)

- `src/pages/Index.tsx` wrapper: replace fixed canvas size with a `ResizeObserver`-driven sizer that keeps a 16:9 aspect and scales HUD text with `clamp()`.
- `Hud.tsx` + all overlays: wrap in a container using `container queries` (`@container`) + `clamp(8px, 1.2vw, 14px)` font sizing. The tall controls list in `PauseOverlay` becomes scrollable (`overflow-y-auto max-h-[70vh]`) so the RESUME/MENU buttons are always visible.
- All overlays use `inset-0 flex items-center justify-center p-4` with `max-w-[min(90vw,640px)]`.
- Hotbar, lives, ammo reflow to a 2-column grid under ~900px width.

## 3. Boss system overhaul (10 unique bosses + arenas)

Bosses spawn at fixed landmark distances: **first at 555m, then every 555m** (555, 1110, 1665, 2220, …). The 10 bosses from `BOSS_CONCEPTS.pdf` rotate in order, then loop with scaled stats.

### Arena lock
When player enters a boss landmark:
- An invisible L/R wall spawns at arena edges (±600px from boss anchor).
- Normal enemy/tide spawning is paused inside the arena.
- Camera auto-scroll pauses — the runner becomes a bounded arena fight.
- On boss death: walls drop, tide resumes, camera resumes, boss explodes into loot.

### Bosses (from concept PDF)

| # | Name | HP / Shield | Speed | Key moves | Special drop |
|---|---|---|---|---|---|
| 1 | Megger Knight | 2500 | 7 | Slam-stun, 1.5s charge leap | **Spiked Gauntlets** (melee + long-jump) |
| 2 | Ahyah Omis | 1500 | 17 | Sniper, Pocket Sand (2s blur), Roll | **Golden AWP** |
| 3 | Terrorist | 3000 | 20 | Grenade cluster, Rocket, Rex-Splode on death (200 dmg) | **Big Red Button** (nuke, 7min CD) |
| 4 | Weakest Touhou Enemy | 4000 / 555 shield | 20/26 | Machine gun 30-burst, Blast Spam, Final Flash beam <10% | **Wand Beamer** |
| 5 | Aegis | 2500 / 3000 shield | 15/30 | Directional 95% shield, Shield Ram | **Shield of Aegis** (hold-melee block, triple-tap ram) |
| 6 | Bum Ahh Commander | 8888 / 5000 shield | 0 | Summons Minion1/BigBrute/ChainedGiant; Desperate <20% | **Backup Bells** (summon 2 minions+brute+giant allies, 19s) |
| 7 | Generic Vampire | 10000 | 40 | Claw bleed, Piercing Blood, Goy Dash lifesteal 500 | **Kusarigama** (hook + lifesteal 25) |
| 8 | Dude Person's Inferior Imitation | 9999 / 999.9 shield | 67 | Enfeeble punch, Surprise (truck/rock, -40% maxHP), Pistol <10% | **Star** (cosmetic sparkle trail) |
| 9 | Dr. Sighe Yan. Tiiestte | 4200 / 4200×3 regen shield | 15 (+15/break) | Potion (status), Zap, Iron Jotunn minion <20% | **Potion Launcher** |
| 10 | The Evilest Strongest Boss O.A.T. | 25000 / 1000×5 regen | 20 (+11/break) | Combines all prior boss attacks; red sky | **The Exiled** (permanent ally, 6767 HP, greatsword + solar/lunar beam) |

### Shared boss behavior
- Unique death sound: loaded from new `src/assets/audio/sfx_boss_death.mp3` (from uploaded `Roblox_tower_battles_void_s_death_sound.mp3`). Replaces regular `sfx_death` for bosses only.
- On death drops (always): 1 special weapon/ally + random bundle of **coins (50-150), medkit, random powerup, 1-3 crystals, 1-2 tokens**.
- Health bar banner at top of screen while boss is alive, with boss name + shield segment if applicable.
- Unique pixel sprite per boss drawn procedurally on the canvas (no external PNGs needed — styled by color palette + silhouette per concept descriptions).

### Unique weapon/ally behaviors added to `weapons.ts` / engine
- `spiked_gauntlets`: melee class, +long-jump when equipped in melee slot.
- `golden_awp`: ranged, 2× AWP damage + faster.
- `big_red_button`: misc deploy, screen-wide nuke, 420s cooldown.
- `wand_beamer`: ranged, fast AOE beams.
- `shield_of_aegis`: melee, hold R = 80% damage reduction, triple-tap R = ram.
- `backup_bells`: misc, summons friendly mob pack for 19s.
- `kusarigama`: melee, hook pull + 25 lifesteal.
- `star`: misc, cosmetic sparkle trail (no damage).
- `potion_launcher`: ranged, random status effects.
- Ally `the_exiled`: permanent ally entity (tracked in `Game.allies[]`), attacks with greatsword + solar/lunar beams.

## 4. Shop polish (Main, Augment, Ally, Shady)

- **Main Shop** (`ShopOverlay.tsx`):
  - Click item or press **ENTER** to buy selected; arrow keys navigate grid.
  - Pagination: 8 items per page, `← PREV PAGE / NEXT PAGE →` footer (A/D keys).
- **Ally Shop** (`AllyOverlay.tsx`):
  - Horizontal scroll roster (mouse wheel + left/right arrows) — "MORE →" hint when overflow.
  - Right pane shows **description + stats** of currently focused ally (HP, damage, behavior text).
- **Augment Shop** (`AugmentOverlay.tsx`): same pagination pattern, Crystal currency.
- **Shady Guy** (`ShadyOverlay.tsx`): gamble / curse pacts, Token currency.
- Every shop item gets a **distinct 16×16 procedural pixel icon** drawn via small canvas sprite functions (no external assets).
- Currency rarity unchanged from Wave 7 (Crystals ~1%, Tokens ~3%).

## 5. Audio

- Add `sfx_boss_death.mp3` to `src/assets/audio/` (copied from the uploaded Tower Battles sound).
- `audio.ts`: new SFX key `bossDeath`; engine plays it on any boss death instead of regular `death`.

## 6. Python recreation parity (PRIORITY)

Update `python_recreation/`:
- `game.py` — mirror all Wave 7 + Wave 8 systems: rebindable keys via a `KEYBINDS` dict loaded from `keybinds.json`, responsive window (`pygame.RESIZABLE`), 10 bosses with arena walls, unique drops, boss death sound, polished shop menus (pages + scroll).
- `keybinds.json` — default map, user-editable.
- `IMPLEMENTATION_GUIDE.txt` — step-by-step: folder layout, where to drop sprites (`assets/sprites/bosses/megger_knight.png`, etc.), how to wire sounds (`assets/sfx/boss_death.wav`), how to swap procedural sprites for hand-drawn ones, and how to extend the keybind system.
- `SPRITE_GUIDE.txt` — per-boss/per-item description + expected filename so the user or an artist can drop PNGs in.
- `SOUND_GUIDE.txt` — list of every SFX filename the game looks for and what triggers it.
- `README.md` — refreshed controls + new features summary.

All four text guides will be written in plain readable English, no code jargon where avoidable, so the user can follow them without dev experience.

## Technical details (for reference)

- Files created:
  - `src/components/game/SettingsOverlay.tsx`
  - `src/components/game/ShopOverlay.tsx`
  - `src/components/game/AllyOverlay.tsx`
  - `src/components/game/AugmentOverlay.tsx`
  - `src/components/game/ShadyOverlay.tsx`
  - `src/components/game/BossHealthBar.tsx`
  - `src/game/keybinds.ts` (load/save + default map)
  - `src/game/bosses.ts` (10 boss definitions + AI state machines)
  - `src/game/sprites.ts` (procedural pixel drawers for bosses/items/allies)
  - `src/assets/audio/sfx_boss_death.mp3` (copied from upload)
  - `python_recreation/keybinds.json`
  - `python_recreation/IMPLEMENTATION_GUIDE.txt`
  - `python_recreation/SPRITE_GUIDE.txt`
  - `python_recreation/SOUND_GUIDE.txt`
- Files modified:
  - `src/game/engine.ts` (keybind lookup, arena lock, boss spawn at 555m intervals, loot table, ally list, responsive virtual resolution)
  - `src/game/weapons.ts` (+10 unique boss drops)
  - `src/game/audio.ts` (+bossDeath key)
  - `src/components/game/Hud.tsx` (responsive clamp sizing, boss bar, status icons above player stays in engine)
  - `src/components/game/PauseOverlay.tsx` (scrollable + SETTINGS button)
  - `src/components/game/StartScreen.tsx` (SETTINGS button)
  - `src/pages/Index.tsx` (ResizeObserver sizing)
  - `python_recreation/game.py`, `README.md`

- No DB / Cloud changes.
- No new external image assets — all boss/item sprites drawn procedurally from concept descriptions.

## Out of scope
- Hand-drawn PNG boss art (guide included so user can add later).
- Mobile touch controls (keybind system is keyboard only; mobile remains a stretch goal).
- Packaged `python_build_v3.zip` — will be regenerated at end of implementation and delivered as an artifact.

---

Approve to proceed, or tell me what to trim/expand.
