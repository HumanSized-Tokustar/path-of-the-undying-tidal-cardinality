# Wave 11 Polish: Allies, Balance, Sprites, Almanac, Speed

Five focused passes across `src/game/engine.ts`, `src/game/shops.ts`, and `src/components/game/AlmanacOverlay.tsx`. No new files; no schema changes.

---

## 0) Ally Overhaul — follow you everywhere, smarter, deadlier, prettier

In `updateAllies` (engine.ts ~1932) and ally render block (~2595–2603):

- **Always follow the player**, not just enemies. Replace target priority: if no enemy within ~700px, follow tight to player at `leashX`. If enemy within 700px, engage but periodically re-anchor toward player so they never get left behind.
- **Teleport leash tightened**: snap to player when `|dx| > 380` (was 520) OR when offscreen. Also snap vertically when player is on a high platform for >0.6s.
- **Smarter combat**:
  - Lead targets (predict by `target.vx * 0.15`).
  - Add line-of-sight friendly fire avoidance: skip shot if player is between ally and target.
  - Reduce fire cooldowns ~20% (Lil One 0.55, Sheriff 0.7, Eradidog 0.45, STAlien 0.7).
  - Add melee lunge for Lil One (small dash when `|dx| < 90`).
- **Damage buff** (in `ALLIES`):
  - Lil One dmg 10 → 20
  - Sheriff dmg 79 → 110
  - Eradidog dmg 59 → 95 (rocket AoE radius 80 added in engine via `explode` on hit)
  - STAlien dmg 100 → 140, orbital cooldown 20 → 14, radius 120 → 160
  - Dude unchanged (already infinite)
- **Sprite + animation polish** in render pass (~2585–2610):
  - Add bobbing already exists; add per-type details:
    - **Lil One**: tiny held sword that swings on attack frame (rotate via `Math.sin(animTime*8)` when `fireCd > 0.4`).
    - **Sheriff**: cowboy hat brim (extra rect), animated revolver muzzle flash on shot.
    - **Eradidog**: 4 leg rects animated with `Math.sin(animTime*12)`, rocket exhaust trail particles when moving.
    - **STAlien**: pulsing orbital ring (`arc` radius oscillates), antenna with blinking tip.
    - **Dude**: red cap visible, fist trail on attack.
  - Add a subtle ally aura ring (faint colored circle) so they're easy to spot.

---

## 1) Balance Pass

**Enemy spawn scaling** (engine.ts ~1071–1106): retune so each difficulty feels distinct.

| Difficulty | Base allowance | Per-tier add | Screen cap | Spawn interval |
|---|---|---|---|---|
| DUNCE | 4 | +3 | 8 | 1.4–1.8s |
| ALRIGHT | 6 | +5 | 18 | 1.0–1.5s |
| SON | 10 | +8 | 36 | 0.55–1.2s |

Replace fixed `5 + tier*6` with `base + tier*step` per difficulty. Lower the SON screenCap from 42 → 36, ALRIGHT 24 → 18.

**Nerf enemy jumping** (~1828–1840):
- `jumpsLeft` reset: dunce=1, alright=2, son=3 (was 3/3/4).
- `jumpChance` halved: `(0.009 + (paceFactor-0.7)*0.009) * espd`.
- Jump impulse `-520` → `-440`, pace bonus `90` → `60`.
- `jumpCd` floor raised: 0.5s → 0.7s minimum.

**Weapon damage tweaks** (`weapons.ts`):
- Flamethrower 6 → 9 (still tick-heavy)
- Gold MG 10 → 8 (fire rate is the value)
- Sniper CD 0.75 → 0.65
- Disco bomb duration desc clarified
- Rocket splash radius unchanged

**Shop prices** (`shops.ts`):
- Gold MG 5555 → 7777 (it's strong)
- Yamato 10000 → 8500
- Gauntlet 9000 → 7500
- Lightning Rod 3000 → 2500
- Disco Bomb 4000 → 3500

**Status effects**: bump `statusAttackMul` reductions from disabled enemies +10%; freeze slow 0.5 → 0.4; burn DoT +15%.

---

## 2) Sprite & Animation Polish (Melee + Misc)

In the player weapon render (search `w.id === "katana"` etc., ~2400–2550 area) and projectile renderers:

- **Knife**: short white blade with brown grip; quick 0→90° arc swipe over 0.18s.
- **Katana**: long gray blade, two-handed grip overlay, full 180° sweeping arc with motion-trail (3 ghost copies fading).
- **Yamato**: cyan glint shader (white-blue gradient stripe along blade animated), suspends-enemy now shows yellow upward arrow particles on hit.
- **Gauntlet**: two visible gloves alternate punches (use `animTime` parity), shockwave ring on impact, on triple-press shows orange knuckle flash.
- **Misc polish**:
  - **Napalm**: spinning bottle (rotate via animTime), green trail; on detonate spawn 5 fire patches that tick burn.
  - **Shockwave plate**: pulsing concentric rings; trigger now reliably leaps player AND enemies (currently only enemies sometimes — fix in update logic).
  - **Lightning Rod**: tesla coil base + animated zap arcs to nearest enemies; chain to other rods rendered as jagged polyline.
  - **Disco Bomb**: rotating multicolor orb (HSL cycling), affected enemies render with rainbow tint and forced jump bob.
  - **Disposable Shield**: blue-black layered rect with shimmer animation; clearly blocks bullets visually (consume bullets that intersect).
  - **Obliterator Ray**: thick white beam with glow + ∞ symbol at muzzle, screen flash on use.

---

## 3) Almanac Expansion

Rewrite `src/components/game/AlmanacOverlay.tsx`:

- Add full enemy list with sprites (small canvas swatch per enemy using its color/visual): Shooter, Shanker, Shanker Swift, Brute, Rider, Necromancer, Minion, THE BRON, GIANT, APACHE, plus boss notes.
- Add **Ally** cards with stat block (HP/DMG/Lifespan/Ability) and visual swatch.
- Add **Status Effects** section listing each augment with what weapons can carry it.
- Add **Mechanics** subsections:
  - Movement (dash, roll, double jump, ladders, parry).
  - Shops (Main / Ally / Shady — distance schedule 1234m / 1667m / 3333m).
  - Tide system (every 666m, every 5th = TIDE RISES).
  - Currencies (coins from kills, tokens from shop, crystals from elites).
- Two-column responsive grid stays; add a small `<Sprite>` mini-canvas component that draws a colored rect with eye/visual hint per entry.

---

## 4) Faster Player Movement (without breaking spawn pacing)

Constants (engine.ts ~22):
- `PLAYER_BASE_MS` 7.2 → **8.4**
- `PLAYER_MAX_MS` 21 → **24**
- `PLAYER_ACCEL` 1850 → **2150**
- `DASH_SPEED_MULT` 2.2 → **2.5**
- `DASH_RECHARGE` 2.35 → **2.0**

Spawn-system insulation so faster speed doesn't outrun waves:
- Spawn pacing already uses `speedRatio`. Add a **forward spawn offset**: spawn enemies at `camX + W + 60 + pvx * 0.35` (lead the player) so they appear sooner at high speed.
- Increase `spawnClock` ceiling 1.65 → **2.1** and lower interval floor 0.58 → **0.42** in SON / **0.55** in ALRIGHT.
- Cap minimum burst at high speed: `burst = max(2, …)` when `speedRatio > 1.2`.
- Pace catchup for enemies already scales with `playerPaceFactor`; raise SON cap 1.7 → **1.85**, ALRIGHT 1.48 → **1.6** so enemies keep up after the speed buff.

---

## Files Touched

- `src/game/engine.ts` — speed constants, spawn scaling per difficulty, jump nerf, ally AI/render, melee+misc polish, status tweaks, shockwave fix, spawn lead-offset.
- `src/game/shops.ts` — ally damage buffs, shop price tweaks.
- `src/game/weapons.ts` — small damage/CD tweaks.
- `src/components/game/AlmanacOverlay.tsx` — full expansion with sprite swatches.

No new dependencies, no database changes.
