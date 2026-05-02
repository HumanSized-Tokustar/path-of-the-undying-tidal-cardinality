
## Goal

1. Remove the **Shady Guy** rare landmark (the 3333m orange cart) entirely from the game.
2. Keep the upgrade/augment shop that currently spawns *next to* every main shop — it just shouldn't be called "shady" anymore.
3. Update all game `src/components/game/*` UI files so nothing still references Shady Guy.
4. Give you a clear, copy-pasteable guide for converting this React/TS game into a runnable Pygame CE project.

---

## Part 1 — Code changes

### `src/game/engine.ts`
- Replace the `ShopKind` union: `"main" | "ally" | "shady"` → `"main" | "ally" | "upgrade"`.
- Rename the `landmarks` array kind, the `nextShadyAt` field, and the reset line (line 507) — drop `nextShadyAt` entirely.
- Delete the whole "Shady cart every 3333m" block (lines ~1189–1193).
- Change the adjacent upgrade landmark spawn (line ~1180) from `kind: "shady"` to `kind: "upgrade"`.
- Update the proximity check on line 567 to use `"upgrade"` instead of `"shady"`.
- Update the landmark draw routine so the `"upgrade"` kind keeps its current indigo/upgrade-shop sprite (no orange tent).

### `src/game/shops.ts`
- No data changes needed; `AUGMENT_SHOP` stays. Just confirm it's still exported.

### `src/components/game/ShopOverlay.tsx`
- Replace `type ShopKind = "main" | "ally" | "shady"` with `"main" | "ally" | "upgrade"`.
- Replace every `kind === "shady"` check with `kind === "upgrade"` (lines 29, 63, 117, 203).
- Update the header label from "SHADY GUY" to "UPGRADE SHOP".

### `src/components/game/StartScreen.tsx`
- Remove the `🎩 SHADY GUY — every 3333m` legend line (line 115).

### `src/components/game/AlmanacOverlay.tsx`
- Update the "Shops" entry (line 26): drop the Shady Guy mention, describe only Main + Ally + Upgrade shops.

### `src/pages/Index.tsx`
- The `currentShopKind` cast still works; no edit required, but verify after the engine change.

---

## Part 2 — Update the Python translation

Update the existing `python_recreation/` reference docs so they match the new game:
- `IMPLEMENTATION_GUIDE.txt`: remove the "Shady every 3333m" line and the `shady` landmark folder reference.
- `SPRITE_GUIDE.txt`: drop `landmarks/shady.png`.
- `WAVE9_ADDENDUM.txt`: remove the `next_shady_at` block.
- `wave13_translation.py`: remove `next_shady_at`, the shady spawn loop, and rename remaining "shady" landmark kind to `"upgrade"`.

---

## Part 3 — How to convert this game to Pygame CE

You already have a working scaffold at `python_recreation/wave13_translation.py`. Here's the full workflow to actually run it:

### Step 1 — Install Python + Pygame CE
```bash
# Python 3.10+ recommended
python -m pip install --upgrade pip
python -m pip install pygame-ce
```

### Step 2 — Project layout
```text
python_recreation/
  wave13_translation.py     # main game (already generated)
  game.py                   # older scaffold, optional
  keybinds.json             # key mapping
  assets/
    sprites/
      player/
      enemies/
      items/
      allies/
      landmarks/            # main_shop, upgrade_shop, ally_shop  (no shady)
    sfx/
    music/
```

### Step 3 — Mapping TS → Pygame CE
| Web game (TS)                      | Pygame CE equivalent                              |
|-----------------------------------|---------------------------------------------------|
| `<canvas>` + `ctx.fillRect`       | `pygame.Surface` + `pygame.draw.rect`             |
| `requestAnimationFrame` loop      | `while running:` + `clock.tick(60)`               |
| `keydown` / `keyup` events        | `pygame.event.get()` with `KEYDOWN` / `KEYUP`     |
| `Audio` API (`src/game/audio.ts`) | `pygame.mixer.Sound("assets/sfx/x.wav").play()`   |
| TS interfaces (Enemy, Bullet…)    | `@dataclass` classes                              |
| `Math.hypot`, `Math.atan2`        | `math.hypot`, `math.atan2`                        |
| Camera `camX`                     | subtract `cam_x` when blitting                    |

### Step 4 — Port the engine in this order
1. **Window + main loop** — open a 960×540 window, dt-based update.
2. **Player** — movement, jump, dash, gravity (mirror constants from `engine.ts`: `PLAYER_BASE_MS`, `PLAYER_MAX_MS`, gravity).
3. **Enemies + spawner** — copy the difficulty tables (`spawn_base/step/cap`) for DUNCE / ALRIGHT / SON.
4. **Weapons + bullets** — port `WEAPONS` from `src/game/weapons.ts` as a Python dict.
5. **Shops** — Main, Ally, Upgrade (skip Shady — it no longer exists).
6. **Allies** — Lil One unlimited, others as in `shops.ts`.
7. **HUD + Almanac** — render with `pygame.font`.
8. **Audio** — wire `pygame.mixer` to the same SFX names used in `audio.ts`.

### Step 5 — Run it
```bash
cd python_recreation
python wave13_translation.py
```

### Step 6 — Tips
- Keep one source-of-truth for numbers: paste TS constants verbatim into a `constants.py`.
- Use procedural rectangles first, drop in PNGs later (the existing engine already does fallback shapes).
- For pixel-art crispness, set `pygame.display.set_mode((960,540), pygame.SCALED)` and use integer positions when blitting.

---

## Files touched

- `src/game/engine.ts` (remove Shady spawn, rename kind to "upgrade")
- `src/components/game/ShopOverlay.tsx`
- `src/components/game/StartScreen.tsx`
- `src/components/game/AlmanacOverlay.tsx`
- `python_recreation/IMPLEMENTATION_GUIDE.txt`
- `python_recreation/SPRITE_GUIDE.txt`
- `python_recreation/WAVE9_ADDENDUM.txt`
- `python_recreation/wave13_translation.py`

No database, no auth, no new dependencies.
