# Pygame CE Port — How to Run

## Install
```bash
python -m pip install pygame-ce numpy
```

## Run (single-file build)
```bash
cd python_recreation
python ULTRAMAIN.py
```

## Run (modular build)
Same code, accessed as a package:
```bash
cd python_recreation
python -m port.main
```
The `port/` package re-exports symbols from `ULTRAMAIN.py` so weapons, shops,
engine, audio, and keybinds are available as `port.weapons`, `port.shops`,
`port.engine`, `port.audio`, `port.keybinds`. Edit `ULTRAMAIN.py` to change
behaviour — both entry points pick it up.

## Controls (defaults; see `keybinds.json`)
- WASD move, SPACE jump (double-jump), Q dash, Z roll, E parry
- F fire ranged, R melee, O misc A, P misc B
- T interact (open shop), TAB inventory, ESC pause, ENTER buy
- 1-6 select ranged slot

## Difficulty
On the menu press `1` DUNCE / `2` ALRIGHT / `3` SON, then ENTER.
Spawn caps: 7 / 15 / 40 increases, SON ×2 enemies per wave.

## Parity with the web build
- Lifesteal: every 8th kill = +10 HP
- The Button: 10000 coins, 900 DMG sky-bomb, r180
- Disco Bomb: enemies forced to jump-only for 5s, no attack/move
- Lil One: unlimited buys (no cap)
- Shady Guy landmark: removed; Upgrade shop spawns next to Main shop
- Melee class: damage ×100 (near-instakill buff)
- Necromancer (≥2000m, ALRIGHT+), Bron/Giant/Apache (≥1700m, SON only)
- 9m safe radius around all shop landmarks

## Optional asset overrides
Drop PNGs into `assets/sprites/...` matching `SPRITE_GUIDE.txt` paths
(player/player_idle.png, enemies/shooter.png, allies/lil_one.png, etc.).
Missing files fall back to the procedural sprites and the game still runs.
