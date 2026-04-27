
# PATH OF THE UNDYING TIDAL CARDINALITY — Build Plan

A pixel-art endless side-scrolling platform shooter, playable directly in the Lovable preview, with a downloadable Pygame starter project so you can also rebuild it in Python CE.

---

## What you'll get

1. **Playable web game** — full pixel-art HTML5 canvas game running in your preview, all 10 uploaded audio files wired in (4 cycling music tracks + 5 SFX), keyboard controls exactly as you specified.
2. **Downloadable Pygame starter zip** (`/mnt/documents/path_of_the_undying_tidal_cardinality_pygame.zip`) — `main.py`, `assets/` folder containing your audio files, a `README.md` guide explaining how to open it in Python CE / Thonny / IDLE, install pygame, and run it. The Pygame version will mirror the design and contain core systems (movement, shooting, enemies, shops, HUD) — not 1:1 every weapon and boss, but a strong foundation you can extend.
3. **Controls reference posted in chat** (not shown in-game), plus the in-game bottom description bar like in your reference video.

---

## Build order (core-first, then layered)

I'll build in waves so the game is always playable and stable. Each wave ends with something you can test.

### Wave 1 — Core engine & feel
- Pixel-art canvas renderer, fixed-step game loop, parallax background (moving mountains, clouds, birds)
- Player: WASD move (5 m/s), double jump, dash with i-frames (2 charges, 2s CD), roll (Shift+S, melee-only speed boost), ground slam (S in air), facing direction
- Basic platforms, ladders, jump pads
- HP bar (123), distance counter, base HUD
- Start screen + settings (music vol, sfx vol) + credits (Hisham, Adam, Rhian) + death screen with R-to-restart and S/A/B/C/D/F ranking

### Wave 2 — Combat foundation
- Default loadout: Pistol (J), Knife (L), Grenade (K), 100 ammo, 5 grenades, 100 gold, 1 token
- Shield (I): 95% damage reduction 5s, 6s CD
- Overdrive bar (F): doubles offensive stats 6s
- Combo counter (3s window), damage counter (2s window), total damage, distance, nearby-landmark warnings
- Sound effects wired: Hyperlaser (fire), PvZ Vanquish (kill), Zombies Ate Brains (death), Apple Pay (purchase), Roblox Angry (boss spawn)
- Music cycler in order: Jetpack Joyride → Garfield → Minecraft → Lego Saloon, low volume

### Wave 3 — Enemies & AI
- Shooter (90%), Shanker (50%), Brute w/ shotgun + fists variants (20%), Rider w/ rideable vehicle + H-fire (1%), Bomber Plane (5%)
- Smart spacing AI (no sticking), spawn rate ramps every 100m, slow start
- Drops: coins, tokens (6%), crystals (2.5%), power-ups (5%): damage / speed / invincibility / foresight, all 5s

### Wave 4 — Shops & inventory
- Inventory UI (Y) — Minecraft-style hotbar grid, holds 6 ranged + 1 melee + 1 misc
- Main Shop (every 1000m, coins) — all 6 ranged, 4 melee, 5 misc weapons, ammo/armor/shield/HP upgrades, safezone, quantity selector, weapons one-time purchase
- Augment Shop (next to main, crystals) — fire / lightning chain / confuse / enfeeble / freeze / slow on weapons
- Ally Shop (every 1234m, tokens) — Sheriff, Eradidog, Alien (w/ orbital strike), Homeless Guy
- Shady Guy (every 7777m, 1777 gold) — random reward roll

### Wave 5 — Status effects & weapon variety
- Fire, Freeze, Slow, Enfeeble, Bleed, Confuse — applied to enemies; player-affected at 70% reduced strength; bosses immune to most
- Special weapons behavior: Oiler slip patches, Portal Gun A/B, Flamethrower stream, Machine Gun, Yamato suspend, Kusarigama multi-hit, Napalm, Shockwave, Lightning Rod chain, Disco Bomb, Disposable Shield

### Wave 6 — Bosses (every 5555m, randomized after all defeated)
Unique arena (no other enemies), unique spawn animation, unique drop, status-resistant:
1. Megger Knight (10k HP) → Spikey Shockwave Gauntlets
2. Dead-Eye (4k) → AWP
3. Bombardier (15k, explodes on death) → Nuke
4. Gatling King (20k, 3-weapon cycle) → Sentry ally
5. Aegis (11.1k, front shield) → Battle Ram
6. Swarm Beacon (30k, summons) → Necro Staff
7. Bloodfang (36k, speeds up low HP) → Scythe (lifesteal)
8. Mortar Lord (40k) → Rocket Drone ally
9. E-Wiz (42.4k) → Lightning gun
10. Warlord (100k, all attacks) → Banana + Guardian ally

### Wave 7 — Polish
- Weather system (rain, snow, clear, storm cycling)
- Particle effects, screen shake, hit flashes, death animations
- Boss spawn cinematic flash + Roblox Angry SFX
- Bottom description bar (matches your reference video)
- Final SON 😭👍🏻 rank with ultra-shiny gold gradient effect
- Performance pass — keep it smooth on lower-end machines

### Wave 8 — Pygame starter package
- Generate `main.py` (~1500–2500 lines) with core systems
- Copy your 10 audio files into `assets/audio/`
- Generate `README.md` with: install instructions, how to open in Python CE, asset folder structure, where to drop sprite art, which sections of code to extend for more weapons/bosses
- Bundle into a single zip in `/mnt/documents/`

---

## Controls (will also be sent in chat after build)

| Key | Action |
|---|---|
| WASD | Move (5 m/s) |
| Space | Jump / Double-jump |
| S in air | Ground slam |
| Shift | Dash (2 charges, i-frames) |
| Shift + S | Roll (melee only, faster) |
| J | Fire ranged |
| K | Throw misc (1/sec) |
| L | Melee |
| I | Shield (95% reduce, 5s, 6s CD) |
| F | Overdrive (when bar full) |
| Y | Inventory |
| H | Fire mounted vehicle gun (when riding) |
| R | Restart from death screen |

---

## Technical details (skip if not interested)

- **Web stack**: React + TypeScript + HTML5 Canvas 2D. One game-loop hook driving a render canvas; React only for menu/HUD overlays (start, settings, credits, inventory, shop, death screen). Pixel art rendered with `imageSmoothingEnabled = false` and crisp scaling.
- **Audio**: Your 10 uploaded MP3s copied into `src/assets/audio/`, imported as ES6 modules. Music tracks crossfade-cycle through the 4 in order at ~25% volume default. SFX trigger via a small audio pool to allow overlapping plays.
- **Architecture**: Entity-component-ish — `Player`, `Enemy`, `Projectile`, `Pickup`, `Platform`, `Boss`, `Ally` classes; central `GameState` object; deterministic fixed timestep. World generates chunks ahead of player based on distance traveled.
- **Pygame zip**: pure `pygame` (no extra deps), targets Python 3.10+. Uses the same audio files. README explains: `pip install pygame` (or `pip3`), `python main.py`, where the assets folder lives, how to swap in custom sprite PNGs.

---

## Honest scope note

This is one of the largest single specs I've taken on. The web version will be the polished, full-featured one. The Pygame version will be a strong playable foundation (movement, combat, a few enemies, a few weapons, a couple of shops, HUD, audio) — not all 10 bosses and every augment, because that'd be ~10k+ lines of Python and would inevitably ship buggy. I'll clearly mark in the Python README which sections to extend to add more bosses/weapons/shops following the same pattern.

After the build I'll send you the chat-side controls reference and the Pygame zip link.
