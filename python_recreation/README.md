# Path of the Undying Tidal Cardinality — Python Recreation

A pygame port of the web game, kept in sync with the latest engine changes.

## Run

```bash
python -m pip install pygame
python python_recreation/game.py
```

## Controls

- WASD — move (W on ladder = climb up, S on ladder = climb down, S+SPACE on platform = drop through)
- SPACE — jump (×2)
- SHIFT — dash (i-frames)
- J — fire active ranged
- 1–6 — select ranged slot
- L — melee swipe
- K / O — throw / deploy MISC A / MISC B (hold to charge thrown weapons)
- E — parry (negates incoming damage; bullets deflect)
- F — grab / throw enemy
- G — overdrive (when bar full)
- I — shield
- Y — inventory (no-op stub here — UI lives on the web build)
- P — pause

## What is in sync with the web build

- 6 ranged / 1 melee / 2 misc weapon class layout
- Unified MISC ammo pool (5 per equipped misc slot × 2 slots = 10 starter, ×2 on DUNCE)
- 3-life respawn system
- Distance-based pace: base 15 m/s, +10 m/s every 300 m, capped at 105 m/s
- Enemy spawn rate: starts slow (~0.4/s), +2/s every 111 m, hard cap at 100 total spawns per run
- LEVEL OF ENEMY THREAT: DUNCE / ALRIGHT / SON 😭
    - DUNCE: enemies 0.5× HP, 0.4× dmg, 0.55× speed, 1.7× fire cd; player gets 2× starter HP/ammo/misc/coins
    - SON: enemies 1.6× HP, 2× dmg, 1.15× speed, 0.55× fire cd, smarter
- Locked once a run starts (cannot be changed mid-run)
- Platform variants: stone, floating, crumble, ice, spike, moving, bounce, conveyor, cloud, ladder, jumppad, antigrav (3-second slow-fall buff)
- Power-ups: 2× damage / 2× speed / invincible / chrono slow (50% enemy time, less for bosses)
- Day/Night cycle (60s) with sun/moon + ∞ sigils
- Weather: clear, rain, snow, storm (lightning), fog, windy (bullet drift)
- Parry negates ranged & melee damage; grab+throw deals 80 AoE
- Ominous start portal (orb + ∞ sigil) at world origin
- Humanoid sprites — green tunic, yellow buckle, ∞ on hat

The web build (`src/game/engine.ts`) is the source of truth. This file mirrors
the same rules so the game can be replayed in pygame.