## Wave 6 — Keybind overhaul, Roll meter, Better enemy ladder AI, and packaged Python build

### 1. Keybind remap (TS engine + UI)

New layout (every list/HUD/StartScreen/Pause must reflect this exactly):


| Action                | Old                                         | New                                                                             |
| --------------------- | ------------------------------------------- | ------------------------------------------------------------------------------- |
| Dash                  | SHIFT                                       | **Q**                                                                           |
| Roll                  | S+SHIFT                                     | **Z**(standalone, no S needed)                                                  |
| Parry                 | C                                           | **E**                                                                           |
| Misc A                | Q                                           | **O**                                                                           |
| Misc B                | E                                           | **P**                                                                           |
| Jump / Double-jump    | SPACE                                       | SPACE **or W**                                                                  |
| Climb ladder up       | W                                           | **W** still works (dual purpose: jump when not on ladder, climb when on ladder) |
| Climb ladder down     | S                                           | S (unchanged)                                                                   |
| Fire                  | F                                           | F                                                                               |
| Melee                 | R                                           | R                                                                               |
| Grab (hold to charge) | V                                           | V                                                                               |
| Shield                | X                                           | X                                                                               |
| Overdrive             | G                                           | G                                                                               |
| Inventory             | TAB                                         | TAB                                                                             |
| Pause                 | P moved → **Pause = ESC** (P is now Misc B) | &nbsp;                                                                          |
| Slots                 | 1-6                                         | 1-6                                                                             |


NOTE: MAKE SURE ALL IMAGES ARE LOCAL AND NOT USING ANY EXTERNAL AS MUCH AS POSSIBLE, IF ITS GOING TO AFFECT QUALITY TELL ME WHERE YOU GOT EACH AND HOW TO IMPLEMENT THEM IN MY PYTHON CE PUGAME RECREATION

&nbsp;

Conflicts resolved:

- W now multiplexes: if overlapping a ladder → climb up; otherwise → jump (mirrors SPACE).
- P collided with pause → Pause moves to **ESC**.
- Q collided with dash & old Misc A → Misc A moves to **O**, dash takes Q.
- E collided with parry & old Misc B → Misc B moves to **P**, parry takes E.

Files: `src/game/engine.ts` (`onKeyDown`/`onKeyUp` switch, `description` string), `src/components/game/Hud.tsx` (hotbar slot labels: ranged [1-6], melee [R], misc [O]/[P]), `src/components/game/PauseOverlay.tsx` (controls list), `src/components/game/StartScreen.tsx` (footer controls strip), `src/components/game/InventoryOverlay.tsx` (labels "MISC [O] [P]", "MELEE [R]", "FIRE F", and CLOSE hint = TAB).

### 2. Roll gets its own 2-charge meter (twice as slow as dash)

- Add `rollCharges` (max 2) and `rollRecharge` (4s, dash is 2s) to engine.
- `Z` now triggers roll standalone (no S+SHIFT). Roll consumes a roll charge instead of a dash charge.
- Recharge logic mirrors dash but with 4s interval.
- HUD: under the existing `DASH x/2` add `ROLL x/2` line (same style, dimmer color).
- Stats payload exposes `rollCharges`, `rollCdNext`.

### 3. Enemies climb ladders better (all difficulties)

Current logic only ascends when player is above. Improve:

- Enemies now seek the nearest ladder when there's a vertical gap to the player (>40 px) and the player is reachable via that ladder's top platform. Apply gentle horizontal nudge toward ladder x if within ~140 px.
- Climb speed scaled per difficulty but minimum 120 px/s on Dunce (was effectively gated). Cap with `vy = -clamp(climbSpeed)`.
- Allow descending too (player below + on ladder → vy = +130).
- Snap enemy x toward ladder center while climbing so they don't fall off.

### 4. Python recreation parity

Update `python_recreation/game.py` + `README.md`:

- Same key map (pygame: K_q dash, K_z roll, K_e parry, K_o miscA, K_p miscB, K_w = jump or climb up, K_ESCAPE = pause).
- Same roll-meter logic.
- Same improved enemy ladder seeking.
- Update README control list.

### 5. Packaged Python drop (delivered as artifact)

Build `/mnt/documents/python_build_v2.zip` containing:

```text
python_build/
├── game.py                  # full standalone Pygame port (current python_recreation/game.py)
├── README.md                # how to run + controls
├── ASSET_GUIDE.txt          # where to drop external assets
└── assets/
    ├── sfx/                 # empty placeholder folders with .gitkeep + notes
    │   ├── shoot.wav        (placeholder readme)
    │   ├── hit.wav
    │   ├── jump.wav
    │   ├── dash.wav
    │   ├── parry.wav
    │   └── death.wav
    ├── music/
    │   └── track1.ogg
    └── fonts/
        └── pixel.ttf
```

`ASSET_GUIDE.txt` will explain:

- Drop your sfx files into `assets/sfx/` with the exact filenames listed (shoot.wav, hit.wav, jump.wav, dash.wav, roll.wav, parry.wav, throw.wav, explode.wav, death.wav). Game auto-loads any that exist; missing files fall back to procedural beeps.
- Music goes in `assets/music/` as `.ogg` or `.wav`; first file found is looped.
- Optional pixel font in `assets/fonts/pixel.ttf` overrides default.
- Keep the `assets/` folder next to `game.py`.

The `game.py` will be patched with a small `load_asset()` helper that checks for these paths and silently no-ops if absent (no crashes if user runs without assets).

Also emit the zip via `<lov-artifact>` so it's downloadable from chat.

### Technical notes

- HUD lives counter & misc-count code untouched; only label strings change.
- The existing `S+SHIFT` roll path is removed from the dash branch and replaced by an independent `Z` handler block above it.
- `STARTING_MISC_A`/`STARTING_MISC_B` constants unchanged (5 each, totaled in `miscAmmo`).
- No DB / Cloud changes.
- No new external assets bundled — guide explains where the user adds their own.

### Out of scope

- Rebindable controls UI (stays hard-coded).
- Visual redesign beyond adding the ROLL bar entry.