"""
PleaseBeDaOne.py — Core game logic.

Owns:
  * The class-based state machine (Menu, Playing, Shop, Almanac, Pause, GameOver).
  * Player physics ported 1:1 from src/game/engine.ts.
  * Collision detection (AABB vs platforms / enemies / projectiles).
  * The wave spawner with DUNCE / ALRIGHT / SON difficulty scaling.
  * Lifesteal (every 8th kill -> +10 HP).
  * Distance-gated landmark + enemy unlock rules.

Entities, sprites, and UI live in their own modules:
  - INTELLIGENCEentities.py  (Player, Enemy, Ally, Projectile, Pickup, Landmark)
  - SUMassets.py             (assets + procedural audio)
  - ui.py                    (HUD, ShopMenu, Almanac, overlays)

Until those turns land this module renders a self-contained Menu state with
the difficulty picker and a placeholder Playing state showing the scrolling
ground + spawn timer, so the game already boots and runs end to end.
"""
from __future__ import annotations
import math, random, pygame
from typing import Optional, List

from pygame_port.data.constants import (
    SCREEN_W, SCREEN_H, GROUND_Y, PIXELS_PER_METER,
    GRAVITY, JUMP_VEL, PLAYER_BASE_MS, PLAYER_MAX_MS, PLAYER_ACCEL, PLAYER_FRICTION,
    COYOTE_TIME, JUMP_BUFFER, DASH_IMPULSE, DASH_IFRAMES, DASH_COOLDOWN,
    ROLL_IMPULSE, ROLL_COOLDOWN, PARRY_WINDOW, PARRY_COOLDOWN,
    PLAYER_MAX_HP_BASE, LIFESTEAL_KILL_INTERVAL, LIFESTEAL_HEAL,
    WAVE_INTERVAL, WAVE_BASE_COUNT, WAVE_DISTANCE_STEP, WAVE_INCREMENT,
    TIDE_RISES_EVERY, SAFE_RADIUS_M, DIFFICULTY_TABLE,
    MAIN_SHOP_EVERY_M, ALLY_SHOP_EVERY_M, UPGRADE_SHOP_OFFSET_M,
    NECRO_MIN_M, SON_HEAVY_MIN_M,
)
from pygame_port.data.keybinds import load_keybinds, key_name_to_pg

# ---------------------------------------------------------------------------
# State machine
# ---------------------------------------------------------------------------
class State:
    def __init__(self, game: "Game"): self.game = game
    def enter(self): pass
    def exit(self): pass
    def handle_event(self, e: pygame.event.Event): pass
    def update(self, dt: float): pass
    def draw(self, surf: pygame.Surface): pass


class MenuState(State):
    def __init__(self, game):
        super().__init__(game)
        self.options = ["DUNCE", "ALRIGHT", "SON"]
        self.idx = 0

    def handle_event(self, e):
        if e.type == pygame.KEYDOWN:
            if e.key in (pygame.K_UP, pygame.K_w):    self.idx = (self.idx - 1) % len(self.options)
            elif e.key in (pygame.K_DOWN, pygame.K_s): self.idx = (self.idx + 1) % len(self.options)
            elif e.key in (pygame.K_RETURN, pygame.K_SPACE):
                self.game.start_run(self.options[self.idx])

    def draw(self, surf):
        surf.fill((10, 10, 18))
        title = self.game.fonts["xl"].render("PATH OF THE UNDYING TIDAL CARDINALITY", True, (220, 220, 240))
        surf.blit(title, title.get_rect(center=(SCREEN_W // 2, 140)))
        sub = self.game.fonts["md"].render("Pygame CE Port — choose difficulty", True, (160, 160, 200))
        surf.blit(sub, sub.get_rect(center=(SCREEN_W // 2, 200)))
        for i, name in enumerate(self.options):
            color = (255, 230, 120) if i == self.idx else (180, 180, 200)
            txt = self.game.fonts["lg"].render(name, True, color)
            surf.blit(txt, txt.get_rect(center=(SCREEN_W // 2, 320 + i * 70)))
        hint = self.game.fonts["sm"].render(
            "Up/Down to move - Enter to start - F11 fullscreen - Esc pause",
            True, (140, 140, 160))
        surf.blit(hint, hint.get_rect(center=(SCREEN_W // 2, SCREEN_H - 60)))


class PlayingState(State):
    def __init__(self, game): super().__init__(game)

    def handle_event(self, e):
        if e.type == pygame.KEYDOWN:
            if e.key == self.game.bind("pause"):
                self.game.push_state(PauseState(self.game))
            elif e.key == self.game.bind("jump"):
                self.game.player_buffer_jump()

    def update(self, dt): self.game.update_world(dt)
    def draw(self, surf): self.game.draw_world(surf)


class PauseState(State):
    def handle_event(self, e):
        if e.type == pygame.KEYDOWN and e.key in (pygame.K_ESCAPE, pygame.K_RETURN):
            self.game.pop_state()
    def draw(self, surf):
        self.game.states[-2].draw(surf)
        overlay = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 160)); surf.blit(overlay, (0, 0))
        t = self.game.fonts["xl"].render("PAUSED", True, (240, 240, 255))
        surf.blit(t, t.get_rect(center=(SCREEN_W // 2, SCREEN_H // 2)))


class GameOverState(State):
    def __init__(self, game, distance, kills, coins):
        super().__init__(game); self.distance = distance; self.kills = kills; self.coins = coins
    def handle_event(self, e):
        if e.type == pygame.KEYDOWN and e.key in (pygame.K_RETURN, pygame.K_SPACE):
            self.game.replace_state(MenuState(self.game))
    def draw(self, surf):
        surf.fill((20, 6, 6))
        f = self.game.fonts
        lines = [
            ("GAME OVER", f["xl"], (255, 100, 100)),
            (f"Distance: {int(self.distance)} m", f["lg"], (240, 240, 240)),
            (f"Kills: {self.kills}", f["md"], (220, 220, 220)),
            (f"Coins: {self.coins}", f["md"], (220, 220, 120)),
            ("Enter to return to menu", f["sm"], (160, 160, 180)),
        ]
        y = 180
        for text, font, color in lines:
            r = font.render(text, True, color)
            surf.blit(r, r.get_rect(center=(SCREEN_W // 2, y))); y += 70


# ---------------------------------------------------------------------------
# Game (owns physics + spawner)
# ---------------------------------------------------------------------------
class Game:
    def __init__(self, screen: pygame.Surface, save: dict):
        self.screen = screen; self.save = save
        self.fonts = {
            "xl": pygame.font.SysFont("arial", 56, bold=True),
            "lg": pygame.font.SysFont("arial", 36, bold=True),
            "md": pygame.font.SysFont("arial", 24),
            "sm": pygame.font.SysFont("arial", 18),
        }
        self.keybinds = load_keybinds()
        self.states: List[State] = []
        # World state (initialised on start_run)
        self.difficulty = "DUNCE"
        self.distance_m = 0.0
        self.kills = 0
        self.coins = 0
        self.crystals = 0
        self.tokens = 0
        self.lifesteal_counter = 0
        self.player = None
        self.enemies: list = []
        self.allies: list = []
        self.projectiles: list = []
        self.pickups: list = []
        self.landmarks: list = []
        self.next_main_shop_m = MAIN_SHOP_EVERY_M
        self.next_ally_shop_m = ALLY_SHOP_EVERY_M
        self.wave_timer = 0.0
        self.wave_count = WAVE_BASE_COUNT
        self.wave_increases = 0
        self.next_wave_distance = WAVE_DISTANCE_STEP
        self.tide_msg_t = 0.0

    # --- state stack helpers ---
    def start(self): self.replace_state(MenuState(self))
    def push_state(self, s: State):
        if self.states: self.states[-1].exit()
        self.states.append(s); s.enter()
    def pop_state(self):
        if self.states: self.states.pop().exit()
        if self.states: self.states[-1].enter()
    def replace_state(self, s: State):
        while self.states: self.states.pop().exit()
        self.states.append(s); s.enter()

    def bind(self, action: str) -> int:
        return key_name_to_pg(self.keybinds.get(action, ""))

    # --- main loop hooks ---
    def handle_events(self, events) -> bool:
        for e in events:
            if e.type == pygame.QUIT: return False
            if self.states: self.states[-1].handle_event(e)
        return True

    def update(self, dt: float):
        if self.states: self.states[-1].update(dt)

    def draw(self):
        if self.states: self.states[-1].draw(self.screen)

    # --- run lifecycle ---
    def start_run(self, difficulty: str):
        self.difficulty = difficulty
        self.distance_m = 0.0; self.kills = 0; self.coins = 0
        self.crystals = 0; self.tokens = 0; self.lifesteal_counter = 0
        self.enemies.clear(); self.allies.clear(); self.projectiles.clear()
        self.pickups.clear(); self.landmarks.clear()
        self.next_main_shop_m = MAIN_SHOP_EVERY_M
        self.next_ally_shop_m = ALLY_SHOP_EVERY_M
        self.wave_timer = 0.0; self.wave_count = WAVE_BASE_COUNT
        self.wave_increases = 0; self.next_wave_distance = WAVE_DISTANCE_STEP
        self.tide_msg_t = 0.0
        self.player = _PlayerStub()
        self.replace_state(PlayingState(self))

    def end_run(self):
        best = self.save.setdefault("best_distance", {})
        best[self.difficulty] = max(best.get(self.difficulty, 0), int(self.distance_m))
        self.save["total_kills"] = self.save.get("total_kills", 0) + self.kills
        self.save["total_coins_earned"] = self.save.get("total_coins_earned", 0) + self.coins
        self.replace_state(GameOverState(self, self.distance_m, self.kills, self.coins))

    # --- combat hook (called by entities later) ---
    def register_kill(self):
        self.kills += 1
        self.lifesteal_counter += 1
        if self.lifesteal_counter >= LIFESTEAL_KILL_INTERVAL and self.player:
            self.lifesteal_counter = 0
            self.player.hp = min(self.player.max_hp, self.player.hp + LIFESTEAL_HEAL)

    def player_buffer_jump(self):
        if self.player: self.player.jump_buffer_t = JUMP_BUFFER

    # --- world tick (physics + spawner) ---
    def update_world(self, dt: float):
        p = self.player
        if not p: return
        keys = pygame.key.get_pressed()
        # Horizontal input
        ax = 0
        if keys[self.bind("moveLeft")]:  ax -= 1
        if keys[self.bind("moveRight")]: ax += 1
        # Acceleration / friction in m/s
        p.vx_ms += ax * PLAYER_ACCEL * dt
        p.vx_ms *= PLAYER_FRICTION ** dt
        if abs(p.vx_ms) > PLAYER_MAX_MS:
            p.vx_ms = math.copysign(PLAYER_MAX_MS, p.vx_ms)
        # Gravity & jump
        p.vy += GRAVITY * dt
        if p.on_ground: p.coyote_t = COYOTE_TIME
        else:           p.coyote_t = max(0.0, p.coyote_t - dt)
        p.jump_buffer_t = max(0.0, p.jump_buffer_t - dt)
        if p.jump_buffer_t > 0 and p.coyote_t > 0:
            p.vy = -JUMP_VEL; p.on_ground = False
            p.jump_buffer_t = 0; p.coyote_t = 0
        # Integrate
        p.x += p.vx_ms * PIXELS_PER_METER * dt
        p.y += p.vy * dt
        if p.y >= GROUND_Y:
            p.y = GROUND_Y; p.vy = 0; p.on_ground = True
        else:
            p.on_ground = False
        # Distance increases when moving right
        if p.vx_ms > 0: self.distance_m += p.vx_ms * dt
        # Wave spawner
        self.wave_timer += dt
        if self.wave_timer >= WAVE_INTERVAL:
            self.wave_timer = 0.0
            self._spawn_wave()
        # Difficulty wave-count escalation
        if self.distance_m >= self.next_wave_distance:
            cap = DIFFICULTY_TABLE[self.difficulty]["cap"]
            if self.wave_increases < cap:
                self.wave_increases += 1
                self.wave_count += WAVE_INCREMENT
                if self.wave_increases % TIDE_RISES_EVERY == 0:
                    self.tide_msg_t = 2.5
            self.next_wave_distance += WAVE_DISTANCE_STEP
        # Landmarks
        if self.distance_m >= self.next_main_shop_m:
            self.landmarks.append(("MAIN_SHOP",   self.next_main_shop_m))
            self.landmarks.append(("UPGRADE_SHOP", self.next_main_shop_m + UPGRADE_SHOP_OFFSET_M))
            self.next_main_shop_m += MAIN_SHOP_EVERY_M
        if self.distance_m >= self.next_ally_shop_m:
            self.landmarks.append(("ALLY_SHOP", self.next_ally_shop_m))
            self.next_ally_shop_m += ALLY_SHOP_EVERY_M
        self.tide_msg_t = max(0.0, self.tide_msg_t - dt)
        # Death check (placeholder — real damage comes with entities turn)
        if p.hp <= 0: self.end_run()

    def _spawn_wave(self):
        n = int(self.wave_count * DIFFICULTY_TABLE[self.difficulty]["spawn_mult"])
        # Real enemy classes arrive in INTELLIGENCEentities turn; for now,
        # just track the number so HUD/spawn logic is exercised.
        self.enemies.extend([("placeholder", random.random())] * n)

    # --- rendering (placeholder until ui.py turn) ---
    def draw_world(self, surf: pygame.Surface):
        surf.fill((24, 22, 40))
        pygame.draw.rect(surf, (60, 40, 28), (0, GROUND_Y, SCREEN_W, SCREEN_H - GROUND_Y))
        pygame.draw.rect(surf, (90, 60, 40), (0, GROUND_Y, SCREEN_W, 6))
        # Player block
        p = self.player
        px = SCREEN_W // 2  # camera follows player horizontally
        py = int(p.y) - 40
        pygame.draw.rect(surf, (240, 220, 80), (px - 14, py, 28, 40))
        # HUD
        f = self.fonts
        surf.blit(f["md"].render(f"HP {p.hp}/{p.max_hp}", True, (240,240,240)), (16, 14))
        surf.blit(f["md"].render(f"{int(self.distance_m)} m", True, (240,240,240)), (16, 42))
        surf.blit(f["md"].render(f"Kills {self.kills}   Coins {self.coins}", True, (240,240,240)), (16, 70))
        surf.blit(f["md"].render(f"Wave x{self.wave_count}  ({self.difficulty})", True, (220,220,160)), (16, 98))
        surf.blit(f["sm"].render(f"Enemies queued: {len(self.enemies)}  Landmarks: {len(self.landmarks)}", True, (180,180,200)), (16, 130))
        if self.tide_msg_t > 0:
            t = f["lg"].render("(THE TIDE RISES)", True, (255, 80, 80))
            surf.blit(t, t.get_rect(center=(SCREEN_W // 2, 80)))


class _PlayerStub:
    """Minimal player struct used until INTELLIGENCEentities.py lands."""
    __slots__ = ("x","y","vx_ms","vy","hp","max_hp","on_ground","coyote_t","jump_buffer_t")
    def __init__(self):
        self.x = 0.0; self.y = float(GROUND_Y); self.vx_ms = 0.0; self.vy = 0.0
        self.hp = PLAYER_MAX_HP_BASE; self.max_hp = PLAYER_MAX_HP_BASE
        self.on_ground = True; self.coyote_t = 0.0; self.jump_buffer_t = 0.0
