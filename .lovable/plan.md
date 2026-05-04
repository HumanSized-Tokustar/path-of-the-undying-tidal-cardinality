# Modular Pygame CE Port — Rebuild Plan

The previous port collapsed everything into `ULTRAMAIN.py` with thin re-export shims. You want a real multi-file architecture with the exact filenames you specified. This plan rebuilds it properly.

## 1. New folder layout

```
python_recreation/pygame_port/
  main.py                  Entry point: clock, main loop, event polling, state dispatch
  PleaseBeDaOne.py         Core logic: state machine, physics, collision, wave/spawn loop
  INTELLIGENCEentities.py  Player, Enemy, Ally, Projectile, Pickup classes
  SUMassets.py             Sprite/music/SFX loader with procedural fallbacks
  ui.py                    HUD, shop menus, almanac, inventory, pause, death, start screen
  data/
    weapons.py             WEAPONS table (1:1 from src/game/weapons.ts)
    shops.py               MAIN_SHOP, AUGMENT_SHOP, ALLIES (1:1 from src/game/shops.ts)
    keybinds.py            Keybind loader (reads ../keybinds.json)
    constants.py           Physics + difficulty constants from engine.ts
  save_data.json           Local progression / shop state (replaces any DB)
  assets/                  Optional drop-in sprites & audio (procedural if missing)
```

No more `ULTRAMAIN.py` shim. Each module owns its code.

## 2. File responsibilities

**main.py**
- Init pygame-ce, create 1280x720 window, `pygame.time.Clock()`
- Top-level loop: poll events, delegate to active state, flip display, tick(60)
- Owns the `Game` instance from `PleaseBeDaOne.py`
- Handles quit + global hotkeys (pause, fullscreen)

**PleaseBeDaOne.py**
- `class Game` with state machine: `MenuState`, `PlayingState`, `ShopState`, `AlmanacState`, `PauseState`, `GameOverState`
- Each state has `handle_event`, `update(dt)`, `draw(surface)`
- Physics ported exactly from `engine.ts`: gravity 1900, jump 720, base MS 9.2, max MS 26, friction/acceleration curves, dash/roll/parry timers, coyote time, jump buffer
- Collision: AABB vs platforms, enemy hitboxes, projectile sweeps, landmark 9m safe radius
- Wave spawner: 5s base, +6 per 666m, caps DUNCE 7 / ALRIGHT 15 / SON 40, SON x2 multiplier, "(THE TIDE RISES)" every 5th
- Lifesteal counter (every 8th kill +10 HP)
- Distance-gated unlocks (Necromancer 2000m+ ALRIGHT, Bron/Giant/Apache 1700m+ SON)
- Save/load via `save_data.json`

**INTELLIGENCEentities.py**
- `Entity` base (pos, vel, hp, draw, update)
- `Player`: inventory, ammo, dash/roll/parry, overdrive, revives, status effects
- `Enemy` subclasses: Shooter, Shanker, Brute, Necromancer, Minion, Bron, Giant, Apache (each with HP, dmg, AI)
- `Ally` subclasses: LilOne (uncapped purchases, paced to player), SheriffSeriff, Eradidog, Stalien, DudePerson
- `Projectile`, `Pickup` (coin/token/crystal), `Landmark` (MainShop, UpgradeShop, AllyShop)
- Disco Bomb effect: forces enemies into 5s jump-only, attacks disabled
- The Button: spawns 900 dmg green sky-bomb, radius 180

**SUMassets.py**
- `class Assets`: lazy-loads sprites/music/sfx from `assets/`
- Procedural fallbacks: `make_humanoid`, `make_block`, `make_button_cube` (gray cube + red button), `make_green_bomb`, etc.
- `class Audio`: numpy-generated SFX (shoot, hit, jump, dash, roll, parry, throw, explode, purchase, coin, heal, shield_on, overdrive, hurt, death, game_over)
- Music streamer with track rotation (Jetpack, Garfield, Minecraft, Lego)

**ui.py**
- `HUD`: health/ammo/coin/crystal/token bars, distance, wave indicator, "(THE TIDE RISES)" toast
- `ShopMenu`: tabbed Main/Upgrade/Ally, button widgets, purchase confirmation
- `Almanac`: Weapons/Enemies/Allies/Mechanics tabs reading from `data/`
- `InventoryOverlay`, `PauseMenu`, `SettingsMenu` (volume sliders, keybind rebinding), `DeathScreen`, `StartScreen` (DUNCE/ALRIGHT/SON select)

**data/weapons.py / data/shops.py**
- Pure data tables, identical IDs/costs/damage to TS source
- Includes The Button (10000 coins, misc) replacing Portal Gun in MAIN_SHOP
- Disco Bomb reworked entry
- Lil One with `purchase_limit=None`

**data/constants.py**
- All physics/difficulty/spawn/landmark constants pulled from engine.ts in one place

## 3. Technical details

- **Framework**: `pygame-ce` only. `requirements.txt`: `pygame-ce>=2.5`, `numpy`
- **Resolution**: 1280x720, scalable via fullscreen toggle
- **State machine**: class-based, single `current_state` reference, push/pop for overlays (pause, shop)
- **Movement**: ported with same accel curve — `vel.x += accel*dt*input`, `vel.x *= friction**dt`, clamp to `PLAYER_MAX_MS`. Dash = velocity impulse with i-frames, roll = lower hitbox + impulse, parry = 0.18s window
- **Save data**: `save_data.json` stores unlocked weapons, best distance per difficulty, settings, keybinds. Loaded on boot, written on shop purchase / death
- **Keybinds**: read existing `python_recreation/keybinds.json` on launch, rebindable in SettingsMenu, written back to disk

## 4. Build order (across turns if needed)

This will exceed one response cleanly. Proposed split:

- **Turn 1 (this approval)**: Scaffold + `main.py`, `PleaseBeDaOne.py` (state machine + physics + spawn loop), `data/constants.py`, `data/keybinds.py`, `save_data.json`
- **Turn 2**: `INTELLIGENCEentities.py` (all player/enemy/ally/projectile classes with full AI)
- **Turn 3**: `SUMassets.py` (procedural sprites + numpy SFX + music) and `data/weapons.py`, `data/shops.py`
- **Turn 4**: `ui.py` (all overlays, shop, almanac, HUD)

Each turn produces complete, runnable files — no stubs, no "simplified" placeholders. After turn 1 the game boots to the menu; after turn 4 it is feature-complete vs the web version.

## 5. Cleanup

- Delete `python_recreation/ULTRAMAIN.py` and the `python_recreation/port/` shim package (they misled you about modularity)
- Update `python_recreation/PORT_README.md` to point at `pygame_port/main.py` with run instructions: `pip install pygame-ce numpy && python -m pygame_port.main`

Approve and I'll execute Turn 1 immediately.
