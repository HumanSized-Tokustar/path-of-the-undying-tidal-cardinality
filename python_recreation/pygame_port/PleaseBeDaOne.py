"""
PleaseBeDaOne.py — core game logic (state machine, physics, spawner).

Hooks together:
  * INTELLIGENCEentities  -> Player / Enemy / Ally / Projectile / Pickup / Landmark
  * SUMassets             -> sprite + procedural audio
  * ui                    -> HUD, ShopMenu, Almanac
  * data.weapons / data.shops / data.constants
"""
from __future__ import annotations
import math, random, pygame
from typing import List, Optional

from pygame_port.data.constants import (
    SCREEN_W, SCREEN_H, GROUND_Y, PIXELS_PER_METER,
    GRAVITY, JUMP_VEL, PLAYER_BASE_MS, PLAYER_MAX_MS,
    PLAYER_MAX_HP_BASE, LIFESTEAL_KILL_INTERVAL, LIFESTEAL_HEAL,
    WAVE_INTERVAL, WAVE_BASE_COUNT, WAVE_DISTANCE_STEP, WAVE_INCREMENT,
    TIDE_RISES_EVERY, SAFE_RADIUS_M, DIFFICULTY_TABLE,
    MAIN_SHOP_EVERY_M, ALLY_SHOP_EVERY_M, UPGRADE_SHOP_OFFSET_M,
    NECRO_MIN_M, SON_HEAVY_MIN_M, MELEE_DAMAGE_MULT,
    THE_BUTTON_DAMAGE, THE_BUTTON_RADIUS, DISCO_BOMB_DURATION,
)
from pygame_port.data.keybinds import load_keybinds, key_name_to_pg
from pygame_port.data.weapons import WEAPONS
from pygame_port.SUMassets import audio, assets
from pygame_port.INTELLIGENCEentities import (
    Player, Projectile, Pickup, Landmark,
    ENEMY_POOL_BASE, Necromancer, Bron, Giant, Apache, ALLY_CLASSES,
)
from pygame_port.ui import draw_hud, ShopMenu, Almanac


# ---------------------------------------------------------------------------
# State machine base
# ---------------------------------------------------------------------------
class State:
    def __init__(self, game): self.game = game
    def enter(self): pass
    def exit(self): pass
    def handle_event(self, e): pass
    def update(self, dt): pass
    def draw(self, surf): pass


class MenuState(State):
    def __init__(self, game):
        super().__init__(game)
        self.options = ["DUNCE","ALRIGHT","SON","Almanac","Quit"]
        self.idx = 0
    def handle_event(self, e):
        if e.type == pygame.KEYDOWN:
            if e.key in (pygame.K_UP, pygame.K_w):    self.idx = (self.idx - 1) % len(self.options)
            elif e.key in (pygame.K_DOWN, pygame.K_s): self.idx = (self.idx + 1) % len(self.options)
            elif e.key in (pygame.K_RETURN, pygame.K_SPACE):
                choice = self.options[self.idx]
                if choice in DIFFICULTY_TABLE: self.game.start_run(choice)
                elif choice == "Almanac": self.game.open_overlay(Almanac(self.game))
                elif choice == "Quit": pygame.event.post(pygame.event.Event(pygame.QUIT))
    def draw(self, surf):
        surf.fill((10, 10, 18))
        f = self.game.fonts
        title = f["xl"].render("PATH OF THE UNDYING TIDAL CARDINALITY", True, (220,220,240))
        surf.blit(title, title.get_rect(center=(SCREEN_W//2, 120)))
        sub = f["md"].render("Pygame CE port", True, (160,160,200))
        surf.blit(sub, sub.get_rect(center=(SCREEN_W//2, 175)))
        for i, name in enumerate(self.options):
            color = (255,230,120) if i == self.idx else (180,180,200)
            t = f["lg"].render(name, True, color)
            surf.blit(t, t.get_rect(center=(SCREEN_W//2, 270 + i*60)))
        best = self.game.save.get("best_distance", {})
        bs = f["sm"].render(
            f"Best  DUNCE {best.get('DUNCE',0)} m   ALRIGHT {best.get('ALRIGHT',0)} m   SON {best.get('SON',0)} m",
            True, (160,160,180))
        surf.blit(bs, bs.get_rect(center=(SCREEN_W//2, SCREEN_H-60)))


class PlayingState(State):
    def handle_event(self, e):
        if e.type == pygame.KEYDOWN:
            g = self.game
            if e.key == g.bind("pause"):       g.push_state(PauseState(g))
            elif e.key == g.bind("jump"):      g.player.buffer_jump()
            elif e.key == g.bind("dash"):      g.player.try_dash()
            elif e.key == g.bind("roll"):      g.player.try_roll()
            elif e.key == g.bind("parry"):     g.player.try_parry()
            elif e.key == g.bind("fire"):      g.player_fire("ranged")
            elif e.key == g.bind("melee"):     g.player_fire("melee")
            elif e.key == g.bind("miscA"):     g.player_fire("miscA")
            elif e.key == g.bind("miscB"):     g.player_fire("miscB")
            elif e.key == g.bind("interact"):  g.try_open_shop()
            elif e.key == g.bind("inventory"): g.open_overlay(Almanac(g))
    def update(self, dt): self.game.update_world(dt)
    def draw(self, surf): self.game.draw_world(surf); draw_hud(self.game, surf)


class OverlayState(State):
    """Wraps a ui object (ShopMenu/Almanac) above the playing state."""
    def __init__(self, game, overlay): super().__init__(game); self.overlay = overlay
    def handle_event(self, e): self.overlay.handle_event(e)
    def draw(self, surf):
        # Render previous state underneath
        if len(self.game.states) >= 2: self.game.states[-2].draw(surf)
        self.overlay.draw(surf)


class PauseState(State):
    def handle_event(self, e):
        if e.type == pygame.KEYDOWN and e.key in (pygame.K_ESCAPE, pygame.K_RETURN):
            self.game.pop_state()
    def draw(self, surf):
        if len(self.game.states) >= 2: self.game.states[-2].draw(surf)
        ov = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA); ov.fill((0,0,0,160))
        surf.blit(ov, (0,0))
        t = self.game.fonts["xl"].render("PAUSED", True, (240,240,255))
        surf.blit(t, t.get_rect(center=(SCREEN_W//2, SCREEN_H//2)))


class GameOverState(State):
    def __init__(self, game, distance, kills, coins):
        super().__init__(game); self.distance=distance; self.kills=kills; self.coins=coins
    def handle_event(self, e):
        if e.type == pygame.KEYDOWN and e.key in (pygame.K_RETURN, pygame.K_SPACE):
            self.game.replace_state(MenuState(self.game))
    def draw(self, surf):
        surf.fill((20,6,6)); f=self.game.fonts
        for y, (text, font, col) in enumerate([
            ("GAME OVER", f["xl"], (255,100,100)),
            (f"Distance: {int(self.distance)} m", f["lg"], (240,240,240)),
            (f"Kills: {self.kills}",  f["md"], (220,220,220)),
            (f"Coins: {self.coins}",  f["md"], (220,220,120)),
            ("Enter to return to menu", f["sm"], (160,160,180)),
        ]):
            r = font.render(text, True, col); surf.blit(r, r.get_rect(center=(SCREEN_W//2, 180 + y*70)))


# ---------------------------------------------------------------------------
# Game
# ---------------------------------------------------------------------------
class Game:
    def __init__(self, screen, save):
        self.screen = screen; self.save = save
        self.fonts = {
            "xl": pygame.font.SysFont("arial", 56, bold=True),
            "lg": pygame.font.SysFont("arial", 36, bold=True),
            "md": pygame.font.SysFont("arial", 24),
            "sm": pygame.font.SysFont("arial", 18),
        }
        self.keybinds = load_keybinds()
        s = save.get("settings", {})
        audio.set_sfx_volume(s.get("sfx_volume", 0.55))
        audio.set_music_volume(s.get("music_volume", 0.18))
        self.states: List[State] = []
        self.difficulty = "DUNCE"
        self.distance_m = 0.0; self.kills = 0; self.coins = 0; self.crystals = 0; self.tokens = 0
        self.lifesteal_counter = 0
        self.player: Optional[Player] = None
        self.enemies: list = []; self.allies: list = []
        self.projectiles: list = []; self.pickups: list = []; self.landmarks: list = []
        self.next_main_shop_m = MAIN_SHOP_EVERY_M
        self.next_ally_shop_m = ALLY_SHOP_EVERY_M
        self.wave_timer = 0.0; self.wave_count = WAVE_BASE_COUNT
        self.wave_increases = 0; self.next_wave_distance = WAVE_DISTANCE_STEP
        self.tide_msg_t = 0.0
        self.cam_x = 0.0
        self.button_purchases = 0   # visual stub
        self.disco_t = 0.0

    # --- state stack ---
    def start(self): self.replace_state(MenuState(self))
    def push_state(self, s):
        if self.states: self.states[-1].exit()
        self.states.append(s); s.enter()
    def pop_state(self):
        if self.states: self.states.pop().exit()
        if self.states: self.states[-1].enter()
    def replace_state(self, s):
        while self.states: self.states.pop().exit()
        self.states.append(s); s.enter()
    def open_overlay(self, ov): self.push_state(OverlayState(self, ov))
    def close_overlay(self):
        if isinstance(self.states[-1] if self.states else None, OverlayState):
            self.pop_state()

    def bind(self, action): return key_name_to_pg(self.keybinds.get(action, ""))

    def handle_events(self, events):
        for e in events:
            if e.type == pygame.QUIT: return False
            if self.states: self.states[-1].handle_event(e)
        return True
    def update(self, dt):
        if self.states: self.states[-1].update(dt)
    def draw(self):
        if self.states: self.states[-1].draw(self.screen)

    # --- run lifecycle ---
    def start_run(self, difficulty):
        self.difficulty = difficulty
        self.distance_m = 0.0; self.kills = 0; self.lifesteal_counter = 0
        self.enemies.clear(); self.allies.clear(); self.projectiles.clear()
        self.pickups.clear(); self.landmarks.clear()
        self.next_main_shop_m = MAIN_SHOP_EVERY_M
        self.next_ally_shop_m = ALLY_SHOP_EVERY_M
        self.wave_timer = 0.0; self.wave_count = WAVE_BASE_COUNT
        self.wave_increases = 0; self.next_wave_distance = WAVE_DISTANCE_STEP
        self.tide_msg_t = 0.0; self.cam_x = 0.0; self.disco_t = 0.0
        self.player = Player(0, GROUND_Y)
        self.player.coins = self.coins = 0
        self.player.crystals = self.crystals = 0
        self.player.tokens = self.tokens = 0
        self.player.owned = {"pistol","smg","shotgun","rifle","sniper","rocket","knife","grenade","medkit"}
        self.replace_state(PlayingState(self))

    def end_run(self):
        best = self.save.setdefault("best_distance", {})
        best[self.difficulty] = max(best.get(self.difficulty, 0), int(self.distance_m))
        self.save["total_kills"] = self.save.get("total_kills", 0) + self.kills
        self.save["total_coins_earned"] = self.save.get("total_coins_earned", 0) + (self.player.coins if self.player else 0)
        audio.play("game_over")
        self.replace_state(GameOverState(self, self.distance_m, self.kills, self.player.coins if self.player else 0))

    # --- combat hooks ---
    def register_kill(self):
        self.kills += 1; self.lifesteal_counter += 1
        if self.lifesteal_counter >= LIFESTEAL_KILL_INTERVAL and self.player:
            self.lifesteal_counter = 0
            self.player.hp = min(self.player.max_hp, self.player.hp + LIFESTEAL_HEAL)
            audio.play("heal")

    def in_safe_radius(self, x):
        r = SAFE_RADIUS_M * PIXELS_PER_METER
        for lm in self.landmarks:
            if abs(lm.x - x) < r: return True
        return False

    def spawn_projectile(self, x, y, vx, vy, dmg, owner, color=(255,230,80), radius=0):
        self.projectiles.append(Projectile(x, y, vx, vy, dmg, owner, color, radius))

    def aoe_explode(self, x, y, radius, dmg, owner):
        audio.play("explode")
        if owner == "ally" or owner == "player":
            for e in self.enemies:
                if (e.x - x)**2 + (e.y - y)**2 < radius*radius:
                    e.damage(dmg, self)
        # Visual flash
        self.pickups.append(_FlashFx(x, y, radius))

    # --- player input -> weapon ---
    def player_fire(self, slot):
        p = self.player
        if not p: return
        wid = p.equipped.get(slot)
        if not wid: return
        w = WEAPONS[wid]
        cd_attr = "fire_cd" if slot == "ranged" else ("melee_cd" if slot == "melee" else "misc_cd")
        if getattr(p, cd_attr) > 0: return
        if w.ammo and p.ammo.get(wid, 0) <= 0: return
        setattr(p, cd_attr, w.cooldown)
        if w.ammo: p.ammo[wid] = max(0, p.ammo[wid] - 1)
        if w.klass == "ranged":
            audio.play("shoot")
            self.spawn_projectile(p.x + 16*p.facing, p.y - 28, p.facing*820, 0, w.damage, "player")
        elif w.klass == "melee":
            audio.play("hit")
            dmg = w.damage * MELEE_DAMAGE_MULT
            for e in list(self.enemies):
                if abs(e.x - p.x) < 70 and abs(e.y - p.y) < 60:
                    e.damage(dmg, self)
        else:
            audio.play("throw")
            if wid == "the_button":
                # Summon green sky bomb at player position
                self.aoe_explode(p.x + 80*p.facing, GROUND_Y - 40, THE_BUTTON_RADIUS, THE_BUTTON_DAMAGE, "player")
            elif wid == "disco_bomb":
                self.disco_t = DISCO_BOMB_DURATION
                for e in self.enemies: e.disco_jump_t = DISCO_BOMB_DURATION
            elif wid == "obliterator":
                for e in list(self.enemies): e.damage(99999, self)
            elif wid == "shield":
                p.shield_charges += 1
            elif wid == "medkit":
                p.hp = min(p.max_hp, p.hp + 50); audio.play("heal")
            else:
                # Generic AOE projectile (grenade, napalm, shockwave, lightning)
                self.spawn_projectile(p.x + 30*p.facing, p.y - 40, p.facing*420, -260,
                                      w.damage, "player", color=(255,140,80), radius=max(80, w.radius))

    def try_open_shop(self):
        p = self.player
        if not p: return
        for lm in self.landmarks:
            if abs(lm.x - p.x) < 60:
                self.open_overlay(ShopMenu(self, lm.kind)); return

    def spawn_ally(self, ally_id):
        cls = ALLY_CLASSES.get(ally_id)
        if not cls or not self.player: return
        self.allies.append(cls(self.player.x - 60, GROUND_Y))

    # --- world tick ---
    def update_world(self, dt):
        p = self.player
        if not p: return
        keys = pygame.key.get_pressed()
        ix = 0
        if keys[self.bind("moveLeft")]:  ix -= 1
        if keys[self.bind("moveRight")]: ix += 1
        p.update(dt, ix)
        if p.vx_ms > 0: self.distance_m += p.vx_ms * dt
        # Camera
        self.cam_x = p.x - SCREEN_W * 0.35
        # Wave timer
        self.wave_timer += dt
        if self.wave_timer >= WAVE_INTERVAL:
            self.wave_timer = 0.0; self._spawn_wave()
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
            base = p.x + 600
            self.landmarks.append(Landmark("MAIN_SHOP", base))
            self.landmarks.append(Landmark("UPGRADE_SHOP", base + 120))
            self.next_main_shop_m += MAIN_SHOP_EVERY_M
        if self.distance_m >= self.next_ally_shop_m:
            self.landmarks.append(Landmark("ALLY_SHOP", p.x + 700))
            self.next_ally_shop_m += ALLY_SHOP_EVERY_M
        # Tide / disco timers
        self.tide_msg_t = max(0.0, self.tide_msg_t - dt)
        self.disco_t = max(0.0, self.disco_t - dt)
        # Update entities
        for e in list(self.enemies):
            e.update(dt, self)
            if not e.alive or e.x < self.cam_x - 600: self.enemies.remove(e)
        for a in list(self.allies):
            a.update(dt, self)
            if not a.alive: self.allies.remove(a)
        for pr in list(self.projectiles):
            pr.update(dt, self)
            if not pr.alive: self.projectiles.remove(pr)
        for pk in list(self.pickups):
            pk.update(dt, self)
            if not pk.alive: self.pickups.remove(pk)
        for lm in list(self.landmarks):
            if lm.x < self.cam_x - 200: self.landmarks.remove(lm)
        # Sync HUD-visible currencies
        self.coins = p.coins; self.crystals = p.crystals; self.tokens = p.tokens
        if p.hp <= 0:
            if p.revives > 0:
                p.revives -= 1; p.hp = p.max_hp; audio.play("heal")
            else: self.end_run()

    def _spawn_wave(self):
        n = int(self.wave_count * DIFFICULTY_TABLE[self.difficulty]["spawn_mult"])
        for _ in range(n):
            cls = self._pick_enemy_class()
            x = self.player.x + random.choice([-1,1]) * random.randint(420, 640)
            self.enemies.append(cls(x, GROUND_Y))

    def _pick_enemy_class(self):
        pool = list(ENEMY_POOL_BASE)
        if self.difficulty in ("ALRIGHT","SON") and self.distance_m >= NECRO_MIN_M:
            pool.append(Necromancer)
        if self.difficulty == "SON" and self.distance_m >= SON_HEAVY_MIN_M:
            pool += [Bron, Giant, Apache]
        return random.choice(pool)

    # --- rendering ---
    def draw_world(self, surf):
        surf.fill((24, 22, 40))
        # parallax stripe
        for i in range(0, SCREEN_W, 80):
            sx = (i - int(self.cam_x * 0.3)) % SCREEN_W
            pygame.draw.rect(surf, (30,28,52), (sx, GROUND_Y-180, 40, 180))
        # Ground
        pygame.draw.rect(surf, (60,40,28), (0, GROUND_Y, SCREEN_W, SCREEN_H - GROUND_Y))
        pygame.draw.rect(surf, (90,60,40), (0, GROUND_Y, SCREEN_W, 6))
        # Landmarks
        for lm in self.landmarks: lm.draw(surf, self.cam_x)
        # Pickups
        for pk in self.pickups: pk.draw(surf, self.cam_x)
        # Allies
        for a in self.allies: a.draw(surf, self.cam_x)
        # Player
        self.player.draw(surf, self.cam_x)
        # Enemies
        for e in self.enemies: e.draw(surf, self.cam_x)
        # Projectiles
        for pr in self.projectiles: pr.draw(surf, self.cam_x)
        # Disco overlay
        if self.disco_t > 0:
            ov = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
            t = (pygame.time.get_ticks() // 80) % 6
            tints = [(255,80,80,30),(255,200,80,30),(80,220,120,30),
                     (80,200,255,30),(180,80,255,30),(255,80,200,30)]
            ov.fill(tints[t]); surf.blit(ov, (0,0))


# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------
class _FlashFx:
    def __init__(self, x, y, radius):
        self.x = x; self.y = y; self.r = radius; self.t = 0.25; self.alive = True
    def update(self, dt, world):
        self.t -= dt
        if self.t <= 0: self.alive = False
    def draw(self, surf, cam_x):
        a = max(0, int(255 * (self.t / 0.25)))
        s = pygame.Surface((self.r*2, self.r*2), pygame.SRCALPHA)
        pygame.draw.circle(s, (255,200,80,a), (self.r, self.r), self.r)
        surf.blit(s, (int(self.x - cam_x - self.r), int(self.y - self.r)))
