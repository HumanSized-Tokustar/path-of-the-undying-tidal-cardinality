Plan: Movement + Spawn Tuning Pass

I’ll make a focused update to improve dash/movement feel and fix enemy spawning so enemy speed and spawn amount stay aligned with player speed instead of feeling random or unfair.

1. Improve player movement feel

- Keep the Wave 10 movement nerf, but make acceleration smoother instead of instantly snapping between full speed and zero.
- Add better ground/air control so movement feels responsive without becoming too fast.
- Preserve weather, overdrive, speed pickup, platform friction, conveyor, ladder, jump, roll, and safe-zone behavior.
- Make dash feel stronger and cleaner while staying balanced:
  - Slightly longer/clearer dash impulse.
  - Better dash carry momentum after the dash ends.
  - Maintain invincibility frames during dash.
  - Keep limited dash charges and recharge timing so it is not spammy.

2. Improve dash visuals/feedback

- Enhance dash trail so it is more readable than the current simple blue rectangle.
- Add a small burst/puff when a dash starts so the player can tell the input registered immediately.
- Keep existing HUD dash charge display working.

3. Fix enemy spawn speed and amount

- Replace the current spawn timer behavior that accelerates too aggressively from `pvx / speed`.
- Base spawn timing on actual player pace in meters/second, with guardrails:
  - Slower player speed = fewer/slower spawn waves.
  - Faster player speed = spawn waves catch up, but with a cap so the screen does not flood instantly.
  - Standing still or moving slowly should not keep dumping enemies at the same rate.
- Use active enemy count and difficulty caps to prevent runaway enemy piles.
- Keep the Wave 10 distance-tier idea, but tune it so enemy amount scales more fairly with distance and speed.

4. Align enemy movement with player speed

- Add a single computed “player pace factor” from current player movement.
- Use that factor to slightly scale enemy chase speed and dash behavior so enemies can keep up when the player is moving fast, but do not become absurd when the player slows down.
- Keep difficulty multipliers meaningful:
  - DUNCE stays slower and lighter.
  - ALRIGHT stays normal.
  - SON stays more intense.

5. Preserve important existing systems

- Safe zones still block enemy pressure near shop landmarks.
- No boss logic is reintroduced.
- Current enemies, shops, weapons, almanac, status effects, and ally systems remain intact.

Technical details

- Primary file: `src/game/engine.ts`.
- Likely changes:
  - Add reusable movement constants near the top of the engine.
  - Store recent/current player speed in meters per second or a pace factor.
  - Replace direct horizontal velocity assignment with acceleration/deceleration logic.
  - Rework dash start, dash velocity, recharge, and trail data.
  - Replace spawn timer calculation around the Wave 10 spawn system.
  - Adjust enemy `espd` calculation in `updateEnemies` to include the player pace factor safely.
- Optional small UI update if needed: `src/components/game/Hud.tsx` only if dash max-charge display is inaccurate after tuning.

Expected result

- Movement feels less stiff.
- Dash and roll feels useful and satisfying without undoing the speed nerf.
- Enemy spawning responds to how fast the player is actually progressing.
- The game should maintain pressure while avoiding sudden unfair floods or empty stretches
- Overall sprite design and animation is improved
- reminder to add noticable sprite effects to enemy affected by specific status effects
- Reminder that what I mean by how amount of times it can increase for each mode means how many times it can not max amount of enemies