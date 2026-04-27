# Path of the Undying Tidal Cardinality — Python recreation

Pygame port that mirrors the web engine.

## Run
```
pip install pygame
python python_recreation/game.py
```

## Controls
- WASD — Move (W on ladder = climb, S on ladder = down)
- SPACE — Jump (×2). S+SPACE drop through platform.
- SHIFT — Dash. **S+SHIFT — Roll** (spinning ball, 2× dash duration, knocks enemies back).
- F — Fire ranged
- R — Melee
- Q — Misc A, E — Misc B (hold to charge throw)
- C — Parry (negates ranged + melee damage)
- V — Grab nearest enemy. Hold V to charge a stronger/farther throw.
- X — Shield, G — Overdrive
- 1-6 switch ranged
- TAB inventory, P pause

## Mechanics
- Distance-based pace: 15 m/s base, +10 per 300m, cap 105.
- Tide spawns: start with 5-enemy allowance, +5 per 111m, hard cap 100.
  Every 5th tier increase shows **"THE TIDE IS RISING"**.
- 3-life respawn system.
- Ladders attach to the side of base platforms and reach the ground; player and enemies can climb.
- Charged grab/throw: hold V while grabbing — longer hold = farther throw + bigger AoE.
- Roll knocks enemies away and grants i-frames the whole duration.
