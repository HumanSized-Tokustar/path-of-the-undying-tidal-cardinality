# Path of the Undying Tidal Cardinality — Python recreation

Pygame port that mirrors the web engine.

## Run
```
pip install pygame
python python_recreation/game.py
```

## Controls (Wave 6)
- WASD — Move (W on ladder = climb up, S on ladder = climb down)
- SPACE **or W** — Jump (×2). S+SPACE drop through platform.
- **Q — Dash** (2 charges, 2s recharge each)
- **Z — Roll** (2 charges, **4s recharge**, spinning ball, 2× dash length, knocks enemies back, full i-frames)
- F — Fire ranged
- R — Melee
- **O — Misc A**, **P — Misc B** (hold to charge throw)
- **E — Parry** (negates ranged + melee damage)
- V — Grab nearest enemy. Hold V to charge a stronger/farther throw.
- X — Shield, G — Overdrive
- 1-6 switch ranged
- TAB inventory, ESC pause

## Mechanics
- Distance-based pace: 15 m/s base, +10 per 300m, cap 105.
- Tide spawns: start with 5-enemy allowance, +5 per 111m, hard cap 100.
  Every 5th tier increase shows **"THE TIDE IS RISING"**.
- 3-life respawn system.
- Ladders attach to the side of base platforms and reach the ground; player and enemies can climb.
- Charged grab/throw: hold V while grabbing — longer hold = farther throw + bigger AoE.
- Roll knocks enemies away and grants i-frames the whole duration.
- Enemies actively seek the nearest ladder when there's a vertical gap to the player and climb up or down regardless of difficulty.
