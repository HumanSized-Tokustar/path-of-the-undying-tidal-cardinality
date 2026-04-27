# Wave 3 — Fix Pack: Roster, Variants, Inventory, Pause, HUD Redesign

You're right — too much was missing. This plan tackles everything you called out in one focused wave, prioritizing the gaps before adding more bosses.

## What's broken / missing right now

- No pause (P)
- No inventory screen (Y) — flag exists in input but no UI opens
- No weapon switching — only Pistol/Knife/Grenade as separate buttons, no hotbar/cycling
- Base roster missing — only 3 weapons exist, the full starting kit isn't there
- Only 3 enemy types (shooter, shanker, brute), no variants (no Riders, no Bomber Planes, no elite/armored variants)
- Only 1 platform style (flat brown) — no variants (floating, crumbling, ice, spike, moving)
- HUD doesn't match the reference video (colors, fonts, layout, bottom description bar)

## What this wave delivers

### 1. Pause system (P)
- `P` toggles a full pause overlay. Game loop freezes (no physics, no spawns, no audio progression).
- Overlay shows: "PAUSED", controls cheatsheet, Resume / Restart / Main Menu buttons.

### 2. Inventory screen (Y)
- `Y` opens a grid-based inventory overlay (paused while open).
- Tabs: **Weapons** (owned + equipped slots), **Consumables** (grenades, medkits, ammo packs), **Augments** (passive upgrades), **Stats** (HP, dmg mult, speed, crit).
- Click weapon → equip into slot 1 / 2 / 3.

### 3. Weapon switching + base roster
- Hotbar with 3 active slots, shown bottom-center of HUD with icons + ammo counts.
- `1` `2` `3` switch active weapon. Mouse wheel also cycles. `J` = fire active weapon, `K` = grenade (always), `L` = melee (always knife or upgraded melee).
- **Base roster (starting unlocked):** Pistol, Knife, Grenade, SMG, Shotgun, Rifle. All available from spawn so you can test switching immediately.
- Each weapon has: damage, fire rate, spread, ammo, reserve, projectile speed, sprite color.

### 4. Enemy variants (expanded roster)
Adding to existing shooter/shanker/brute:
- **Shooter Elite** — armored, 2x HP, burst-fires 3 rounds
- **Shanker Swift** — faster, lower HP, leaps
- **Brute Heavy** — slow, huge HP, ground-pound shockwave
- **Rider** — rides a hover-bike, fast horizontal pass, drops bombs
- **Bomber Plane** — flies overhead, drops gravity bombs in arc
- **Sniper** — stationary on tall platforms, charges a red laser line before firing

Spawn weights ramp by distance.

### 5. Platform variants
- **Standard** (current brown)
- **Floating stone** (gray, mid-air)
- **Crumbling** (cracks then falls 0.5s after step)
- **Ice** (slippery, low friction)
- **Spike-top** (damages on contact — visual hazard)
- **Moving** (oscillates horizontally or vertically)

Spawner picks variant by biome/distance with weighted randomness so terrain feels varied.

### 6. HUD redesign to match reference video
Restyling to match the screen-replay reference (bottom description bar, retro arcade colors, chunkier bars):
- **Top-left:** stacked HP / Shield / Overdrive bars with thick pixel borders, segmented fills, white labels with hard shadow
- **Top-center:** distance + timer in large amber pixel font
- **Top-right:** currencies (coins / tokens / crystals) with glyph icons
- **Bottom-center:** **weapon hotbar** (3 slots, active slot glows amber, shows ammo)
- **Bottom bar:** dark translucent strip running full width with **dynamic description text** (like the reference video) — context-sensitive: "MEGGER KNIGHT — slam attack, weak to fire", "SHOP AHEAD — 30m", "OVERDRIVE READY — press F", combo text, pickup names
- Combo / damage popups float on right side as before but restyled

### 7. Pygame zip refresh
Update `path_of_the_undying_tidal_cardinality_pygame.zip` to mirror: pause, inventory stub, hotbar, new enemy types, new platform types. Same `# === EXTEND ME ===` markers.

## Technical notes

- New `src/game/weapons.ts` — weapon definitions table + `fireWeapon(state, weapon)` function.
- New `src/game/platforms.ts` — variant defs + `spawnPlatform(distance)` weighted picker.
- Engine: enemy union type expanded; physics adds friction-per-platform, crumble timers, moving platform velocity carry, spike contact damage.
- New components: `src/components/game/PauseOverlay.tsx`, `src/components/game/InventoryOverlay.tsx`, `src/components/game/Hotbar.tsx`, `src/components/game/DescriptionBar.tsx`.
- `Phase` type adds `"paused"` and `"inventory"`. Engine stops stepping when phase ≠ `"playing"`.
- HUD CSS: bump bar borders to 2px solid, add segmented fill via repeating-linear-gradient, switch label color to off-white #f4e9c1, add bottom description bar fixed at viewport bottom.

## Out of scope for this wave (next waves)

- Remaining bosses 5–10 (have 0–4 stub right now; will do in Wave 4)
- Full shop UIs (Augment shop, Ally shop)
- Status effects (fire/freeze/slow/bleed/confuse)
- Weather system
- Ranking screen polish

Approve and I'll build it straight through.
