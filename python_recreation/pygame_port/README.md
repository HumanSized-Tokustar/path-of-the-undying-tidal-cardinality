# Pygame CE Port — multi-file architecture

Run:
    python -m pip install pygame-ce numpy
    cd python_recreation
    python -m pygame_port.main

## Files

- `main.py` — entry point, clock, event polling.
- `PleaseBeDaOne.py` — state machine, physics, collision, wave spawner.
- `INTELLIGENCEentities.py` — Player / Enemy / Ally / Projectile classes  *(turn 2)*
- `SUMassets.py` — sprite + audio loader with procedural fallbacks  *(turn 3)*
- `ui.py` — HUD, ShopMenu, Almanac, overlays  *(turn 4)*
- `data/constants.py` — physics + difficulty constants from `engine.ts`
- `data/keybinds.py` — reads `keybinds.json`
- `data/save.py` — local `save_data.json` progression
- `data/weapons.py` / `data/shops.py` — weapon + shop tables  *(turn 3)*

## Build status

Turn 1 (this drop) gives you a runnable game that boots to a difficulty
menu, enters a Playing state with the exact movement physics from the web
engine, and exercises the wave spawner / landmark / lifesteal loops.

Subsequent turns will fill in entity AI, sprites, audio, and the full UI
stack without touching this scaffold.
