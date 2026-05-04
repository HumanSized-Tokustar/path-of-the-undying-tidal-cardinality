# Pygame CE Port — multi-file architecture

True 1:1 port of the web game, split into the modules you specified.

## Run it

```bash
python -m pip install pygame-ce numpy
cd python_recreation
python -m pygame_port.main
```

(or just `python pygame_port/main.py`)

## File map

| File | Role |
|------|------|
| `main.py` | Entry point, clock, event polling, fullscreen toggle (F11) |
| `PleaseBeDaOne.py` | State machine (Menu/Playing/Shop/Almanac/Pause/GameOver), physics, collision, wave spawner, lifesteal |
| `INTELLIGENCEentities.py` | `Player`, all `Enemy` subclasses (Shooter, Shanker, Brute, Necromancer, Minion, Bron, Giant, Apache), `Ally` subclasses (Lil One, Sheriff Seriff, Eradidog, Stalien, Dude Person), `Projectile`, `Pickup`, `Landmark` |
| `SUMassets.py` | `Assets` (procedural sprites with PNG override) and `Audio` (numpy-synth SFX with WAV/OGG override) |
| `ui.py` | `draw_hud`, `ShopMenu` (Main/Upgrade/Ally), `Almanac` |
| `data/constants.py` | All physics + difficulty + spawn constants |
| `data/weapons.py` | `WEAPONS` table including **The Button** (10000 coins, 900 dmg, 180px AOE) and reworked **Disco Bomb** (5s jump-only, attacks disabled) |
| `data/shops.py` | `MAIN_SHOP`, `AUGMENT_SHOP`, `ALLIES` (Lil One has `purchase_limit=None`) |
| `data/keybinds.py` | Reads / writes `keybinds.json` |
| `data/save.py` | Local `save_data.json` progression (replaces any DB) |

## Default controls (rebindable via `keybinds.json`)

- Move: `A` / `D`   |  Jump: `Space`  |  Dash: `Q`  |  Roll: `Z`  |  Parry: `E`
- Fire: `F`  |  Melee: `R`  |  Misc A: `O`  |  Misc B: `P`
- Interact / open shop: `Enter`  |  Almanac: `Tab`  |  Pause: `Esc`  |  Fullscreen: `F11`

## Drop-in assets (optional)

Files under `pygame_port/assets/sprites/<name>.png` override the procedural
sprite for that key (e.g. `the_button.png`, `apache.png`, `lil_one.png`).
Files under `pygame_port/assets/sfx/<name>.wav|.ogg` override the synth SFX
(e.g. `shoot.wav`, `explode.wav`, `purchase.wav`).

## What is preserved 1:1

- Physics: `GRAVITY 1900`, `JUMP_VEL 720`, `PLAYER_BASE_MS 9.2`, `PLAYER_MAX_MS 26`, exponential friction, accel curve, coyote time, jump buffer, dash i-frames, parry window
- Lifesteal: every 8th kill restores 10 HP
- Wave: 5s base, +6 enemies per 666m, caps DUNCE 7 / ALRIGHT 15 / SON 40 (SON x2 spawns), `(THE TIDE RISES)` every 5th
- Landmarks: Main Shop every 1234m, Upgrade Shop adjacent, Ally Shop every 1667m
- 9-meter safe radius around shops blocks enemy AI
- Necromancer unlocks at 2000m (ALRIGHT+); Bron / Giant / Apache at 1700m (SON only)
- Melee 100x multiplier (near-instakill)
- Shady Guy removed from world
- Lil One: uncapped purchase count, paced to player speed
