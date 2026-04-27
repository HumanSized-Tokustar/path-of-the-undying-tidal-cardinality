# Wave 4 — Class Split, Smarter AI, Day/Night, Parry & Grab, Humanoid Redesign

A focused single-wave rebuild that hits every issue in your message. Built lean to save credits — no extra polish passes you didn't ask for.

## 1. Weapon class system (the big one)

Split inventory into **3 independent classes** so nothing competes for slots:

- **RANGED — 6 slots**, hotkeys `1` `2` `3` `4` `5` `6`, fired with `J`
- **MELEE — 1 slot**, fired with `L` (Knife is the default; future melee weapons drop in here)
- **MISC — 2 slots**, slot A fires with `K`, slot B fires with `O` (Grenade defaults to slot A)

Engine changes:
- `InventoryState` becomes `{ owned, ranged: WeaponId[6], melee: WeaponId, miscA: WeaponId, miscB: WeaponId, activeRanged: 0..5 }`.
- Number keys 1–6 select active ranged slot. `J` fires it. Mouse wheel cycles ranged only.
- `K` fires `miscA`, `O` fires `miscB`. `L` swings `melee`.
- `WEAPONS` table gains `class: "ranged" | "melee" | "misc"` and a `deploy: boolean` flag (turrets/medkits etc. don't get charged throws).
- All HUD wording: "throw misc" instead of "throw grenade".

Inventory overlay (matches your annotated screenshot):
- Top row: 3 tabs become **WEAPONS** only (CONSUMABLES tab removed — misc weapons live in the box grid). STATS stays.
- Equipped panel shows **6 ranged slots [1]–[6]**, then **1 melee slot [L]**, then **2 misc slots [K] [O]**.
- Owned grid below — click a weapon, then click a target slot of matching class to equip. Cross-class equip is blocked with a tiny toast.

## 2. Charged misc throws

- Holding `K` or `O` builds a 0–1.0 charge meter (capped at 1.2s).
- On release, throw velocity = `base * (0.6 + charge * 1.4)` — short tap = lob, full hold = long throw.
- Tiny charge ring renders above player while held.
- If `WEAPONS[id].deploy === true` (medkit, turret, shield drop), pressing the key just deploys instantly — no charge.

## 3. Parry (`E`) + Grab/Throw (`F`)

Parry:
- Engine scans every frame for hostile bullets within 90px AND closing on player. If found and no parry-window already open, sets `parryWindow = 0.35s` and shows a `!` indicator above player head.
- Pressing `E` during the window: deflects all bullets in 70px radius back at nearest enemy (2× damage, color flips to friendly yellow), plays Ultrakill parry sound, spawns spark particles, animates the same melee swing arc with a white flash.
- Missed parry: window closes silently, `!` fades.

Grab/Throw (`F`):
- Press `F`: nearest non-boss enemy within 70px is grabbed — locked above player head, `disabled = true` so it can't shoot/melee.
- Press `F` again: throws it as a projectile with arc physics. On landing it deals **80 AoE** in a 90px radius and dies with the glint death animation.
- Bosses ignore grab attempts (small "RESISTED" floater).

Overdrive moves to `G` to free up `F`. Inventory key stays `Y`. Pause stays `P`. Description bar updates to reflect the rebind.

## 4. Smarter enemy AI + Difficulty setting

AI improvements (all enemies):
- **Jumping**: if a platform edge or player is above and within 120px, ground enemies attempt jump (cooldown 1.2s).
- **Repositioning**: shooters strafe in/out of optimal range (180–320px) instead of locking distance.
- **Separation**: existing separation force kept, but boosted so they don't stack.
- **Variant behaviors**: Shanker leaps gaps, Brute hops to body-slam, Sniper repositions if line-of-sight is broken, Rider doesn't try to jump.

Difficulty selector on Start screen (also accessible from Pause overlay → "DIFFICULTY"):
- **DUNCE** — enemy HP ×0.7, dmg ×0.6, fire rate ×0.7, AI reaction +200ms.
- **ALRIGHT** — baseline (current values).
- **SON 😭** — HP ×1.5, dmg ×1.5, fire rate ×1.4, AI reaction −100ms, +1 spawn per wave.

Stored in `GameStats.difficulty`, applied as multipliers everywhere enemies take/deal damage or fire.

## 5. Day/Night cycle + weather

- Add `cycleTime` (seconds, mod 60) and `cycleProgress` (0..1) to engine.
- Sky gradient interpolates between day palette (#6cb8ff → #c8d8ff) and night palette (#0c1230 → #2a2050) over each minute.
- Sun/Moon icon rendered top-right of canvas (HUD-overlapping safe — drawn in canvas, behind HUD chips):
  - **Sun** — yellow disc with 8 sword-shaped rays (elongated triangles), subtle white `∞` symbol etched in middle.
  - **Moon** — pale disc with crescent shading, same `∞` etched in middle.
- Existing weather variants kept (rain, snow, storm) — storm keeps lightning bolts but those bolts get **no** infinity symbol. Adds **fog** (visibility tint) and **windy** (slight horizontal bullet drift) variants.
- Weather rolls every 45–90s independent of day/night.

## 6. Jump-through platforms + new variants

- All non-ground platforms become **jump-through** (player can jump up through them; only land when falling and feet cross top edge). Press `down + jump` to drop through.
- Ground stays solid.
- New variants added on top of existing stone/floating/crumble/ice/spike/moving:
  - **bounce** — green pad, +60% jump impulse on contact
  - **conveyor** — striped, pushes player horizontally (alternates direction by instance)
  - **cloud** — semi-transparent, fades after 1s of standing on it, respawns after 3s
- `pickPlatformKind` weights updated to include the 3 new kinds in mid/late game.

## 7. Speed rework

- Base run speed: **15 m/s** (was lower).
- Every **400m**, base scrolling speed gains **+10 m/s**, capped at **105 m/s**.
- Untouched-momentum bonus (existing) reduced to ±15% of current base so it doesn't blow past the cap.
- Hit-too-much penalty (existing) kept at −20% but recovers in 8s.

## 8. Dash buff

- Distance ×1.5 (longer leap).
- **i-frames** for the entire dash duration (`invuln` flag set true → all `damagePlayer` calls early-return).
- Visual: cyan after-image trail (3 ghosts).

## 9. Humanoid sprite redesign

Replacing all square sprites with simple humanoid pixel rigs (head, body, 2 arms, 2 legs) drawn procedurally in canvas — same lightweight cost, much better look:

- **Player**: yellow tunic, brown pants, **wide-brim hat with `∞` symbol stitched in white**, weapon held in active hand. Walking animation (legs alternate), idle bob, jump tuck, dash lean, parry/melee swing arc with motion lines.
- **Allies**: same rig, blue tunic.
- **Enemies**: per-type rigs —
  - Shooter: red coat, pistol arm
  - Shooter Elite: same + helmet
  - Shanker: hooded purple, dagger
  - Brute: bulky brown, no head visible (helmet)
  - Rider: small body on bike base
  - Sniper: kneeling pose, rifle
  - Bomber: small pilot in plane outline
- **Bosses (stub frames for now)**: each boss gets a unique silhouette — Megger Knight (giant armored humanoid w/ greatsword), Tide Cardinal (robed figure w/ floating halos). Bosses 3–10 get placeholder humanoid rigs with unique color/weapon and will gain unique attack frames in Wave 5.
- **Death animation**: on enemy death, sprite freezes white for 1 frame then plays a **glint** — 4 expanding white star particles + thin cross-flash — then dissolves.

## 10. New sounds

`src/game/audio.ts` gets 3 new entries played from the right events:
- `purchase` → Apple Pay sound (on shop buy)
- `miscThrow` → Nintendo Switch click (on K/O release)
- `parry` → Ultrakill parry sound (on successful `E` parry)

Files copied from `user-uploads://` into `src/assets/audio/` and imported as ES6 modules.

## 11. Python remake sync

Update `path_of_the_undying_tidal_cardinality_pygame.zip`:
- `main.py` mirrors all of the above: 3-class loadout, `K`/`O`/`L` bindings, charged throws, parry/grab on `E`/`F`, day/night cycle (60s), sun/moon with `∞`, jump-through platforms + new variants, difficulty selector at boot, humanoid sprite draw functions, glint death.
- `assets.md` updated with: humanoid sprite spec sheet (player hat with `∞`, sun/moon with `∞`, enemy color refs), new sound filenames.
- `GUIDE.md` controls section rewritten + difficulty section added.

## Out of scope (next waves)

- Full unique boss attack patterns for bosses 3–10 (stub humanoid rigs only this wave)
- Functional shop purchase UIs
- Augment shop / status effects

## Technical notes (for the code review)

- New file `src/game/parryGrab.ts` for parry-window + grab-state helpers.
- `src/game/weapons.ts` extended with `class` and `deploy` fields, plus 2–3 starter misc weapons (Grenade, Smoke, Medkit).
- `src/game/platforms.ts` extended with `bounce`/`conveyor`/`cloud` and a `passThrough` flag on every non-ground variant.
- `src/components/game/InventoryOverlay.tsx` rebuilt to the 6+1+2 layout from your screenshot.
- `src/components/game/Hud.tsx` hotbar splits into 3 row groups: ranged (6), melee (1), misc (2). Description bar wording updated.
- `src/components/game/StartScreen.tsx` gains difficulty toggle.
- Engine input map updated: `E` parry, `F` grab/throw, `G` overdrive, `1–6` ranged, `K`/`O` misc, `L` melee, `J` ranged fire, `Y` inventory, `P` pause, `I` shield.
- All damage/fire-rate paths multiply by `state.difficultyMods`.

Approve and I'll build it in one pass.