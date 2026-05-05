# Path of the Undying Tidal Cardinality — Pygame CE Port

1:1 functional refactor of the TypeScript web game into Pygame CE.

## Run
```bash
cd python_recreation/pygame_ce_port
pip install -r requirements.txt
python PLEASE.py
```

## File tree
```
pygame_ce_port/
├── PLEASE.py            # Entry: clock, event loop, fullscreen toggle
├── BE.py                # Game logic: state machine, entities, HUD, shops
├── DA.py                # Asset loader: IMAGES + SOUNDS dicts (no procgen)
├── requirements.txt
├── keybinds.json        # Mirrors web localStorage keybinds
├── save_data.json       # Persistent progression / settings
├── __init__.py
├── data/
│   ├── __init__.py
│   ├── constants.py     # Physics, spawn, world, FULLSCREEN=False, 1280x720
│   ├── keybinds.py      # Loader / pygame keycode mapping
│   ├── save.py          # JSON save read/write
│   ├── weapons.py       # 1:1 port of src/game/weapons.ts (23 weapons)
│   └── shops.py         # 1:1 port of src/game/shops.ts (Main/Augment/Allies)
└── assets/              # ← provide these manually
    ├── sprites/         # player/, enemies/, allies/, items/, landmarks/
    ├── sfx/             # *.wav
    └── music/           # *.mp3
```

## Required asset filenames

DA.py prints a summary on launch listing any missing files. Drop the
following into `pygame_ce_port/assets/` and they will load automatically;
anything missing falls back to a magenta placeholder.

### sprites/
- player/player_idle.png, player/player_run.png, player/player_jump.png
- enemies/shooter.png, shanker.png, brute.png, necromancer.png, minion.png,
  bron.png, giant.png, apache.png
- allies/lil_one.png, sheriff_seriff.png, eradidog.png, stalien.png, dude_person.png
- items/pistol.png, smg.png, shotgun.png, rifle.png, knife.png, grenade.png,
  sniper.png, rocket.png, oiler.png, flamethrower.png, gold_machine_gun.png,
  katana.png, yamato.png, gauntlet.png, medkit.png, napalm.png, shockwave.png,
  lightning_rod.png, disco_bomb.png, disposable_shield.png, obliterator_ray.png,
  the_button.png, coin.png, crystal.png, token.png
- landmarks/main_shop.png, upgrade_shop.png, ally_shop.png

### sfx/  (.wav)
shoot, hit, jump, dash, roll, parry, throw, explode, purchase, kill, death,
hurt, heal, coin, shield_on, game_over

### music/  (.mp3)
music_jetpack, music_garfield, music_minecraft, music_lego

## Mechanics parity (mirrors src/game/engine.ts)

- Physics: GRAVITY 1900, JUMP_VEL 720, PLAYER_BASE_MS 9.2, MAX_MS 26,
  ACCEL 90, FRICTION 0.0008, COYOTE/JUMP_BUFFER 0.12s,
  DASH 22 m/s @ 0.18 iframes / 0.85 cd, ROLL 14 / 0.7,
  PARRY 0.18 / 0.6
- Wave: every 5 s, +6 enemies per 666 m, "(THE TIDE RISES)" every 5th
  increase. Caps DUNCE 7 / ALRIGHT 15 / SON 40 (×2 spawn).
- Landmarks: Main Shop @ 1234 m, Upgrade beside it, Ally Shop @ 1667 m.
  Enemies cannot enter the 9 m safe radius.
- Combat: melee dmg ×100, lifesteal +10 HP per 8 kills.
- Special: The Button (10000 coins, 900 dmg / 180 px AOE),
  Disco Bomb (5 s jump-only on enemies, attacks disabled).
- Necromancer: ALRIGHT+ at 2000 m, summons Minions every 4 s.
- Bron / Giant / Apache: SON only at 1700 m.
- Lil One ally: uncapped, paced to player speed.

## Controls (override in keybinds.json)
- A/D move, SPACE jump, Q dash, Z roll, E parry
- F fire, R melee, O misc A, P misc B
- T or ENTER to open a nearby shop
- TAB inventory, ESC pause, F11 fullscreen
