# Full 1:1 Pygame CE Port

You asked for both options — I'll deliver **both**: a clean modular package *and* a single concatenated `ULTRAMAIN.py` so you can pick whichever is easier to drop into Pygame CE.

## Honest scope note (read this first)

The TS source is **~6,300 lines** across engine, weapons, shops, platforms, audio, keybinds, and 8 React overlays. A truly 1:1 port means rewriting all of it in Python. I will:

- Match every gameplay number (HP, damage, speeds, spawn tables, shop prices, distances, cooldowns, lifesteal-every-8th, difficulty multipliers, ally caps removed, The Button cost 10000, Disco Bomb rework, etc.).
- Match every system: movement/dash/roll/parry, double-jump enemies, necromancer/minion/bron/giant/apache gating, main+upgrade+ally shops at correct meter intervals, safe zones, almanac, inventory, HUD, pause, settings, death screen, start screen with difficulty select, keybinds.json hot-reload.
- Reproduce all sprites **procedurally** using `pygame.draw` (same colored-rect/pixel-art style the canvas engine uses) so the game runs with **zero asset files required**. If you later drop PNGs into `assets/sprites/...` matching `SPRITE_GUIDE.txt`, they override the procedural fallbacks.
- Reproduce SFX procedurally with `pygame.sndarray` + numpy (square/noise blips) so audio works with no files; drop WAVs into `assets/sfx/` to override.

What will **not** be byte-identical: pixel-exact canvas anti-aliasing, browser font rendering, and React overlay CSS styling — those become Pygame-drawn HUD/menus that visually match but aren't DOM-identical.

## Deliverables

### Modular package (`python_recreation/port/`)
```text
port/
  main.py            # entry point, game loop, phase router
  engine.py          # Game class, update/render, camera, distance, waves
  player.py          # player physics, dash/roll/parry/jump, lifesteal counter
  enemies.py         # all enemy types + AI, double-jump, gated spawns
  allies.py          # Lil One, Sheriff Seriff, Eradidog, Stalien, Dude Person
  weapons.py         # ranged + melee + misc tables incl. The Button, Disco rework
  shops.py           # main/upgrade/ally shop logic, prices, safe zones
  platforms.py       # terrain generator
  spawning.py        # 5s wave system, +6 per 666m, caps per difficulty
  almanac.py         # data tables shared with shops/HUD
  hud.py             # HP/ammo/coins/crystals/tokens/distance/wave readout
  overlays.py        # start, pause, inventory, shop, death, settings, almanac
  audio.py           # procedural SFX + music loop hooks
  keybinds.py        # loads keybinds.json, hot-reload
  sprites.py         # procedural sprite factory + PNG override loader
  config.py          # all constants (difficulty tables, prices, distances)
  keybinds.json      # same keys as src/game/keybinds.ts
```

### Single-file build (`python_recreation/ULTRAMAIN.py`)
Same code, concatenated in dependency order with section banners (`# === engine.py ===`, etc.). Run with `python ULTRAMAIN.py`. ~4–5k lines.

## How to run

```bash
python -m pip install pygame-ce numpy
cd python_recreation
python ULTRAMAIN.py            # single-file
# or
python -m port.main            # modular
```

No assets required. Optional: drop PNGs into `port/assets/sprites/...` per `SPRITE_GUIDE.txt`.

## Parity checklist I will tick off

- [ ] Player: base 9.2 m/s, cap 26, dash, roll, parry, double-jump-aware, revive count
- [ ] Lifesteal: every 8th kill = +10 HP
- [ ] Enemies: shooter/shanker/brute/rider/bomber/sniper + necromancer (≥2000m ALRIGHT+), minions, bron/giant/apache (≥1700m SON only)
- [ ] Spawn waves: 5/5s, +6 per 666m, "(THE TIDE RISES)" every 5th, caps 7/15/40, SON×2, velocity-scaled timer
- [ ] Shops: Main 1234m, Upgrade beside it, Ally 1667m, 9m safe radius, Shady removed
- [ ] Weapons: full price/damage table from `weapons.ts` incl. melee buff, The Button (10000, green sky-bomb AOE), Disco Bomb rework (jump-only 5s)
- [ ] Allies: unlimited Lil One purchases, full ally roster, balanced stats matching player speed
- [ ] Difficulty scaling: DUNCE/ALRIGHT/SON applied to spawn caps + enemy gating
- [ ] Almanac tabs, Inventory, HUD, Pause, Settings, Death, Start
- [ ] keybinds.json reload after settings change

## After you approve

I'll generate all files in one drop and confirm with a file list. Expect a large change — review at your pace.
