I’ll implement this as a Wave 10 specification overhaul, prioritizing the gameplay-critical fixes first and then layering in the new content/UI.

## Scope

### 1. Core fixes and removals
- Fix the current shop purchase runtime bug by removing browser-incompatible `require(...)` calls from game methods and using normal imports.
- Fix Main Shop purchases so sufficient currency always buys the selected item, updates inventory/currency immediately, and plays the purchase sound.
- Make keybind changes take effect immediately in both UI and engine input handling. I’ll also clear stale held-key state after a rebind so an old key does not remain “stuck.”
- Remove the boss system entirely:
  - Remove boss imports, milestone checks, arena teleport, boss warnings, boss drops, boss death handling, boss-specific exceptions, boss arena landmark rendering, and boss-related menu text.
  - Stop using boss kill count for ally caps/rank logic.
- Change default Misc B loadout from Flashbang to Medkit.
- Heavily nerf player movement:
  - Lower base horizontal speed.
  - Reduce distance-based player speed growth.
  - Reduce dash/roll burst multipliers and recharge behavior so movement cannot outrun enemy loading.
  - Keep a strict lower speed cap than the previous 40 m/s behavior.

### 2. Enemy AI and spawn scaling
- Rework spawn rate to match the requested formula:
  - Base: 5 enemies every 5 seconds.
  - SON mode: doubles the current spawn amount.
  - Every 666 meters: +6 enemies per 5 seconds.
  - Caps: DUNCE 7 increases, ALRIGHT 15 increases, SON 40 increases.
  - Every 5th increase: display exactly `(THE TIDE RISES)`.
- Make spawn logic respond to the player’s current movement speed so fast forward motion queues enough enemies and avoids empty stretches.
- Keep safe-zone blocking around shop landmarks so enemies do not spawn/enter within the protected radius.
- Add universal enemy mobility:
  - All ground enemies get double-jump capacity.
  - All enemies get a short dash behavior with cooldown.
- Add new enemies:
  - Necromancer: ALRIGHT mode exclusive after 2000m, black wizard, 200 HP, spawns minions.
  - Minion: 30 HP, 20 damage, spawned by Necromancer.
  - THE BRON: SON mode exclusive after 1700m, black basketball player, 300 HP, throws large orange ball for 50 damage.
  - GIANT: SON mode exclusive after 1700m, very large gray humanoid, 777 HP, stomp attack for 70 damage.
  - APACHE: SON mode exclusive after 1700m, helicopter, 500 HP, flies and fires bullets/rockets.

### 3. Shop inventory refresh
- Replace/refresh Main Shop coin inventory with the requested weapon list and prices.
- Add/adjust weapon definitions and visuals for:
  - Sniper, Rocket Launcher, Oiler, Portal Gun, Flamethrower, Gold Machine Gun.
  - Katana, Yamato, Gauntlet.
  - Napalm, Shockwave, Lightning Rod, Disco Bomb, Disposable Shield, Obliterator Ray.
- Enforce purchase limits:
  - Ranged/melee weapons can only be purchased once.
  - Misc items can be purchased up to 10 times.
- Give each weapon a distinguishable procedural equipped/used visual, including basic melee swing animation for melee weapons except Gauntlets, which get a punching animation.
- Implement or stub gameplay mechanics faithfully enough to work in the current engine:
  - Oiler slippery ground vulnerability zone.
  - Portal A/B teleport pair lasting 3 seconds with 4 second cooldown.
  - Flamethrower continuous fire stream.
  - Napalm fire grenade.
  - Shockwave leap effect for player and enemies.
  - Lightning Rod placed Tesla hazard that chains with other rods.
  - Disco Bomb dance-disable for enemies for 6 seconds.
  - Disposable Shield barrier blocking attacks for 10 seconds.
  - Obliterator Ray huge white infinity ray with 999999999 damage.

### 4. Upgrade Shop refresh
- Convert/refresh the Upgrade Shop to crystal currency.
- Add requested status effects with exact mechanics:
  - Fire: 20 DPS for 5 seconds.
  - Lightning Chain: hits 5 targets.
  - Enfeeble: enemy attack -67% for 6 seconds.
  - Freeze: stun 3 seconds.
  - Slow: speed -67% for 5 seconds.
  - Ultracrit: TBD price chosen to fit economy; 1% chance for 4x damage with red glint.
- Add general crystal stat boosts with suitable prices:
  - Ammo increases in 50 and 150 amounts.
  - Max health increases up to 500 total.
  - Extra dash once.
  - Extra revive up to 2 purchases.
- Make upgrade application work for ranged, melee, and misc classes rather than only the active ranged weapon.

### 5. Ally Shop refresh
- Replace the Ally Shop with the requested token roster:
  - Lil One: 15 tokens, 20s lifespan, 70 HP, sword, 10 damage.
  - Sheriff Seriff: 40 tokens, 4m 11s lifespan, 800 HP, revolver, 79 damage.
  - Eradidog: 120 tokens, 6m 21s lifespan, 500 HP, fast rocket dog, 59 damage.
  - STAlien: 200 tokens, 8m lifespan, 1000 HP, laser gun 100 damage, UFO orbital laser every 20s for 500 damage.
  - Dude Person: 99999 tokens, TBD lifespan chosen as effectively long/endgame, huge HP, instakill rock/punch behavior.
- Implement friendly AI entities directly in the engine:
  - Spawn beside the player on purchase.
  - Follow/fight near the player.
  - Target enemies, deal their described damage, and expire when lifespan timer ends.
  - Render their distinguishable procedural sprites.

### 6. Almanac UI
- Add an Almanac accessible from the main menu.
- The Almanac will include tabs/sections for:
  - Weapons: every weapon, class, cost, visual design, stats, mechanics.
  - Enemies: every standard and new enemy, difficulty/distance spawn rules, health, attacks, sprite descriptions.
  - Mechanics: movement, shops, safe zones, spawn scaling, Tide events, status effects, allies, currencies, and purchase limits.
- Use procedural mini-previews matching the in-game sprite/design descriptions so players understand what to expect.

### 7. Documentation / Python recreation guide
- Update Python recreation docs to match this new boss-free Wave 10 specification:
  - Remove boss sections from guides.
  - Update asset folder instructions for new sprites and effects.
  - Include the exact new shop inventories, enemy types, spawn scaling rules, ally behaviors, movement nerfs, and Almanac data.
  - Explain how to recreate the systems in Python/Pygame, including file structure and where each sprite/audio asset should go.

## Technical notes
- Files expected to change include:
  - `src/game/engine.ts`
  - `src/game/weapons.ts`
  - `src/game/shops.ts`
  - `src/game/keybinds.ts`
  - `src/components/game/ShopOverlay.tsx`
  - `src/components/game/StartScreen.tsx`
  - new Almanac component file(s)
  - Python recreation guide files under `python_recreation/`
- `src/game/bosses.ts` may be left unused or removed if allowed during implementation; all runtime boss behavior will be removed from the game either way.
- I will not add external asset dependencies. All new visuals will be procedural pixel-art shapes inspired by your descriptions, keeping it cost-efficient.
- I’ll also fix the captured runtime error: `Uncaught ReferenceError: require is not defined` in `buyMainItem`.

## Validation after implementation
- Verify Main Shop purchase works with enough coins and fails cleanly without enough currency.
- Verify keybind changes apply immediately.
- Verify no boss arena/boss milestone behavior remains.
- Verify default Misc B is Medkit.
- Verify enemies continue spawning while the player moves quickly.
- Verify Almanac opens from the menu and shows weapons, mechanics, and enemies.
- Verify ally purchases spawn timed friendly AI.