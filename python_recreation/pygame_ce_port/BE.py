"""BE.py — Core game logic.

Holds the State machine (Menu/Playing/Paused/Inventory/Shop/Dead/Almanac),
all entity classes (Player, Enemies, Allies, Projectiles, Pickups,
Landmarks), the world tick, and pygame-native HUD/Shop/Inventory/Almanac
overlays. Imports asset dicts from DA.py and pure-data tables from /data.
"""
from __future__ import annotations
import math, random, pygame
from typing import Optional, List

from data.constants import (
    SCREEN_W, SCREEN_H, GROUND_Y, PIXELS_PER_METER, FPS_TARGET,
    GRAVITY, JUMP_VEL, PLAYER_BASE_MS, PLAYER_MAX_MS, PLAYER_ACCEL, PLAYER_FRICTION,
    PLAYER_MAX_HP_BASE, PLAYER_MAX_HP_CAP, LIFESTEAL_KILL_INTERVAL, LIFESTEAL_HEAL,
    COYOTE_TIME, JUMP_BUFFER, DASH_IMPULSE, DASH_IFRAMES, DASH_COOLDOWN,
    ROLL_IMPULSE, ROLL_COOLDOWN, PARRY_WINDOW, PARRY_COOLDOWN,
    WAVE_INTERVAL, WAVE_BASE_COUNT, WAVE_DISTANCE_STEP, WAVE_INCREMENT,
    TIDE_RISES_EVERY, SAFE_RADIUS_M, DIFFICULTY_TABLE,
    MAIN_SHOP_EVERY_M, ALLY_SHOP_EVERY_M, UPGRADE_SHOP_OFFSET_PX,
    NECRO_MIN_M, SON_HEAVY_MIN_M, MELEE_DAMAGE_MULT,
    THE_BUTTON_DAMAGE, THE_BUTTON_RADIUS, DISCO_BOMB_DURATION,
)
from data.keybinds import load_keybinds, key_to_pg
from data.weapons import (
    WEAPONS, STARTING_OWNED, STARTING_RANGED, STARTING_MELEE,
    STARTING_MISC_A, STARTING_MISC_B,
)
from data.shops import MAIN_SHOP, AUGMENT_SHOP, ALLIES
import DA

# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------
def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))

# ---------------------------------------------------------------------------
# Entities
# ---------------------------------------------------------------------------
class Entity:
    width = 28; height = 44; sprite_path = ""
    def __init__(self, x, y):
        self.x = float(x); self.y = float(y)
        self.vx = 0.0; self.vy = 0.0
        self.alive = True
    def rect(self) -> pygame.Rect:
        return pygame.Rect(int(self.x - self.width/2), int(self.y - self.height),
                           self.width, self.height)
    def draw(self, surf, cam_x):
        if self.sprite_path:
            img = DA.IMAGES[self.sprite_path]
            surf.blit(img, (int(self.x - cam_x - img.get_width()/2),
                            int(self.y - img.get_height())))
        else:
            r = self.rect(); r.x -= int(cam_x)
            pygame.draw.rect(surf, (200,200,200), r)


class Player(Entity):
    width = 28; height = 44
    sprite_path = "player/player_idle.png"
    def __init__(self, x, y, save: dict):
        super().__init__(x, y)
        self.vx_ms = 0.0
        self.facing = 1
        self.max_hp = PLAYER_MAX_HP_BASE + save.get("max_hp_bonus", 0)
        self.hp = self.max_hp
        self.coyote_t = 0.0; self.jump_buffer_t = 0.0
        self.on_ground = True
        self.dash_cd = 0.0; self.iframes = 0.0
        self.roll_cd = 0.0; self.parry_cd = 0.0; self.parry_t = 0.0
        self.extra_dashes = save.get("extra_dashes", 0)
        self.dashes_left = 1 + self.extra_dashes
        self.revives = save.get("extra_revives", 0)
        self.coins = 0; self.crystals = 0; self.tokens = 0
        self.ammo: dict[str, int] = {}
        for wid, w in WEAPONS.items():
            if w.klass == "ranged" and wid != "knife":
                self.ammo[wid] = 200
        self.owned: set[str] = set(STARTING_OWNED) | set(save.get("augments_owned", []))
        self.equipped = {"ranged": "pistol", "melee": STARTING_MELEE,
                         "miscA": STARTING_MISC_A, "miscB": STARTING_MISC_B}
        self.fire_cd = 0.0; self.melee_cd = 0.0; self.misc_cd = 0.0
        self.augments: set[str] = set(save.get("augments_owned", []))
        self.shield_charges = 0

    def take_damage(self, amount: float) -> bool:
        if self.iframes > 0 or self.parry_t > 0: return False
        if self.shield_charges > 0:
            self.shield_charges -= 1; DA.play_sfx("shield_on"); return False
        if "enfeeble" in self.augments: amount *= 0.7
        self.hp -= amount; DA.play_sfx("hurt")
        return True

    def buffer_jump(self): self.jump_buffer_t = JUMP_BUFFER
    def try_dash(self):
        if self.dash_cd > 0 or self.dashes_left <= 0: return
        self.vx_ms = math.copysign(DASH_IMPULSE, self.facing)
        self.iframes = DASH_IFRAMES; self.dash_cd = DASH_COOLDOWN
        self.dashes_left -= 1; DA.play_sfx("dash")
    def try_roll(self):
        if self.roll_cd > 0: return
        self.vx_ms = math.copysign(ROLL_IMPULSE, self.facing)
        self.roll_cd = ROLL_COOLDOWN; DA.play_sfx("roll")
    def try_parry(self):
        if self.parry_cd > 0: return
        self.parry_t = PARRY_WINDOW; self.parry_cd = PARRY_COOLDOWN
        DA.play_sfx("parry")

    def update(self, dt, ix):
        self.vx_ms += ix * PLAYER_ACCEL * dt
        self.vx_ms *= PLAYER_FRICTION ** dt
        if abs(self.vx_ms) > PLAYER_MAX_MS:
            self.vx_ms = math.copysign(PLAYER_MAX_MS, self.vx_ms)
        if ix != 0: self.facing = 1 if ix > 0 else -1
        self.vy += GRAVITY * dt
        self.coyote_t = COYOTE_TIME if self.on_ground else max(0.0, self.coyote_t - dt)
        self.jump_buffer_t = max(0.0, self.jump_buffer_t - dt)
        if self.jump_buffer_t > 0 and self.coyote_t > 0:
            self.vy = -JUMP_VEL; self.on_ground = False
            self.jump_buffer_t = 0; self.coyote_t = 0; DA.play_sfx("jump")
        self.x += self.vx_ms * PIXELS_PER_METER * dt
        self.y += self.vy * dt
        if self.y >= GROUND_Y:
            self.y = GROUND_Y; self.vy = 0
            if not self.on_ground:
                self.on_ground = True; self.dashes_left = 1 + self.extra_dashes
        else:
            self.on_ground = False
        for a in ("dash_cd","iframes","roll_cd","parry_cd","parry_t",
                  "fire_cd","melee_cd","misc_cd"):
            setattr(self, a, max(0.0, getattr(self, a) - dt))


# --- Enemies ---
class Enemy(Entity):
    name = "enemy"; hp_max = 30; touch_dmg = 10; speed_ms = 7.0
    coin_drop = (1, 3); crystal_chance = 0.05; token_chance = 0.0
    can_double_jump = True; flying = False
    sprite_path = "enemies/shooter.png"
    def __init__(self, x, y):
        super().__init__(x, y if not self.flying else y - 180)
        self.hp = self.hp_max
        self.attack_cd = 0.0
        self.disco_jump_t = 0.0
        self.jumps_left = 2 if self.can_double_jump else 1
    def update(self, dt, world):
        if self.disco_jump_t > 0:
            self.disco_jump_t = max(0.0, self.disco_jump_t - dt)
            if self.y >= GROUND_Y - 0.1 and self.jumps_left > 0:
                self.vy = -JUMP_VEL * 0.7; self.jumps_left -= 1
        else:
            self._ai(dt, world)
        if not self.flying:
            self.vy += GRAVITY * dt
            self.y += self.vy * dt
            if self.y >= GROUND_Y:
                self.y = GROUND_Y; self.vy = 0
                self.jumps_left = 2 if self.can_double_jump else 1
        self.x += self.vx * dt
        self.attack_cd = max(0.0, self.attack_cd - dt)
    def _ai(self, dt, world):
        p = world.player
        if not p: return
        if world.in_safe_radius(self.x): self.vx = 0; return
        dirx = 1 if p.x > self.x else -1
        self.vx = dirx * self.speed_ms * PIXELS_PER_METER
        if self.attack_cd <= 0 and abs(self.x - p.x) < 28 and abs(self.y - p.y) < 50:
            if p.take_damage(self.touch_dmg): self.attack_cd = 0.8
    def damage(self, amt, world):
        self.hp -= amt
        if self.hp <= 0:
            self.alive = False
            world.player.coins += random.randint(*self.coin_drop)
            if random.random() < self.crystal_chance: world.player.crystals += 1
            if random.random() < self.token_chance: world.player.tokens += 1
            world.register_kill()
            DA.play_sfx("kill")

class Shooter(Enemy):
    name = "Shooter"; hp_max = 35; touch_dmg = 12; speed_ms = 6.0
    sprite_path = "enemies/shooter.png"
    def _ai(self, dt, world):
        p = world.player
        if not p: return
        if world.in_safe_radius(self.x): self.vx = 0; return
        dist = abs(self.x - p.x); dirx = 1 if p.x > self.x else -1
        self.vx = dirx * (self.speed_ms * PIXELS_PER_METER) * (0.4 if dist < 280 else 1)
        if self.attack_cd <= 0 and dist < 360:
            world.spawn_projectile(self.x, self.y - 24, dirx*540, 0, 14, "enemy")
            self.attack_cd = 1.1

class Shanker(Enemy):
    name = "Shanker"; hp_max = 28; touch_dmg = 16; speed_ms = 11.0
    sprite_path = "enemies/shanker.png"

class Brute(Enemy):
    name = "Brute"; hp_max = 120; touch_dmg = 28; speed_ms = 5.5
    coin_drop = (4, 8); crystal_chance = 0.15
    sprite_path = "enemies/brute.png"

class Necromancer(Enemy):
    name = "Necromancer"; hp_max = 200; touch_dmg = 18; speed_ms = 4.5
    coin_drop = (8, 14); crystal_chance = 0.4; token_chance = 0.1
    sprite_path = "enemies/necromancer.png"
    def __init__(self, x, y): super().__init__(x, y); self.summon_cd = 0.0
    def _ai(self, dt, world):
        super()._ai(dt, world)
        self.summon_cd = max(0.0, self.summon_cd - dt)
        if self.summon_cd <= 0:
            world.enemies.append(Minion(self.x + random.randint(-40, 40), GROUND_Y))
            self.summon_cd = 4.0

class Minion(Enemy):
    name = "Minion"; hp_max = 30; touch_dmg = 20; speed_ms = 9.0
    coin_drop = (1, 2)
    sprite_path = "enemies/minion.png"

class Bron(Enemy):
    name = "The Bron"; hp_max = 300; touch_dmg = 30; speed_ms = 7.0
    coin_drop = (10, 18); crystal_chance = 0.5; token_chance = 0.2
    sprite_path = "enemies/bron.png"
    def _ai(self, dt, world):
        p = world.player
        if not p or world.in_safe_radius(self.x): self.vx = 0; return
        dirx = 1 if p.x > self.x else -1
        self.vx = dirx * self.speed_ms * PIXELS_PER_METER * 0.6
        if self.attack_cd <= 0 and abs(self.x - p.x) < 420:
            world.spawn_projectile(self.x, self.y - 30, dirx*700, -200, 50, "enemy", color=(220,120,40))
            self.attack_cd = 1.6

class Giant(Enemy):
    name = "Giant"; hp_max = 777; touch_dmg = 70; speed_ms = 4.0
    width = 56; height = 84
    coin_drop = (20, 35); crystal_chance = 0.7; token_chance = 0.3
    sprite_path = "enemies/giant.png"

class Apache(Enemy):
    name = "Apache"; hp_max = 500; touch_dmg = 25; speed_ms = 9.0
    width = 72; height = 36; flying = True
    coin_drop = (15, 30); crystal_chance = 0.6; token_chance = 0.25
    sprite_path = "enemies/apache.png"
    def _ai(self, dt, world):
        p = world.player
        if not p: return
        target_y = GROUND_Y - 220
        self.y += (target_y - self.y) * min(1.0, dt * 3)
        dirx = 1 if p.x > self.x else -1
        self.vx = dirx * self.speed_ms * PIXELS_PER_METER * 0.7
        if self.attack_cd <= 0 and abs(self.x - p.x) < 520:
            world.spawn_projectile(self.x, self.y + 12, dirx*620, 320, 25, "enemy", color=(230,80,80))
            self.attack_cd = 0.7

ENEMY_POOL_BASE = [Shooter, Shanker, Brute]


# --- Allies ---
class Ally(Entity):
    name = "ally"; hp_max = 60; speed_ms = 9.0; touch_dmg = 15
    fire_cd_max = 0.6; range_px = 320; lifetime: Optional[float] = None
    sprite_path = "allies/lil_one.png"
    def __init__(self, x, y):
        super().__init__(x, y); self.hp = self.hp_max
        self.fire_cd = 0.0; self.life_left = self.lifetime
    def update(self, dt, world):
        p = world.player
        if not p: return
        target_x = p.x - 40 * (1 if p.facing > 0 else -1)
        dx = target_x - self.x
        max_speed = min(self.speed_ms, abs(p.vx_ms) + 1.0)
        self.vx = max(-max_speed, min(max_speed, dx * 4)) * PIXELS_PER_METER * 0.1
        self.x += self.vx * dt
        self.vy += GRAVITY * dt; self.y += self.vy * dt
        if self.y >= GROUND_Y: self.y = GROUND_Y; self.vy = 0
        self.fire_cd = max(0.0, self.fire_cd - dt)
        target = None; best = self.range_px
        for e in world.enemies:
            d = abs(e.x - self.x)
            if d < best: best = d; target = e
        if target and self.fire_cd <= 0:
            dirx = 1 if target.x > self.x else -1
            world.spawn_projectile(self.x, self.y - 20, dirx*600, 0, self.touch_dmg, "ally")
            self.fire_cd = self.fire_cd_max
        if self.life_left is not None:
            self.life_left -= dt
            if self.life_left <= 0: self.alive = False

class LilOne(Ally):
    name = "Lil One"; hp_max = 90; speed_ms = 6.0; touch_dmg = 28
    fire_cd_max = 0.7; range_px = 80; lifetime = 35
    sprite_path = "allies/lil_one.png"

class SheriffSeriff(Ally):
    name = "Sheriff Seriff"; hp_max = 800; speed_ms = 5.0; touch_dmg = 110
    fire_cd_max = 0.45; range_px = 420; lifetime = 251
    sprite_path = "allies/sheriff_seriff.png"

class Eradidog(Ally):
    name = "Eradidog"; hp_max = 500; speed_ms = 9.0; touch_dmg = 95
    fire_cd_max = 0.3; range_px = 80; lifetime = 381
    sprite_path = "allies/eradidog.png"

class Stalien(Ally):
    name = "STAlien"; hp_max = 1000; speed_ms = 6.0; touch_dmg = 140
    fire_cd_max = 0.5; range_px = 380; lifetime = 480
    sprite_path = "allies/stalien.png"

class DudePerson(Ally):
    name = "Dude Person"; hp_max = 1234567890; speed_ms = 7.0; touch_dmg = 999999999
    fire_cd_max = 0.55; range_px = 360; lifetime = 9999
    sprite_path = "allies/dude_person.png"

ALLY_CLASSES: dict[str, type] = {
    "ally_lil_one": LilOne, "ally_sheriff": SheriffSeriff,
    "ally_eradidog": Eradidog, "ally_stalien": Stalien, "ally_dude": DudePerson,
}


# --- Projectiles / pickups / landmarks / fx ---
class Projectile:
    def __init__(self, x, y, vx, vy, dmg, owner, color=(255,230,80), radius=0):
        self.x=x; self.y=y; self.vx=vx; self.vy=vy
        self.dmg=dmg; self.owner=owner; self.color=color
        self.radius_aoe=radius; self.life=2.5; self.alive=True
    def update(self, dt, world):
        self.x += self.vx*dt; self.y += self.vy*dt
        self.vy += GRAVITY*0.4*dt; self.life -= dt
        if self.life <= 0 or self.y > GROUND_Y + 10:
            if self.radius_aoe > 0:
                world.aoe_explode(self.x, self.y, self.radius_aoe, self.dmg, self.owner)
            self.alive = False; return
        if self.owner == "enemy":
            p = world.player
            if p and abs(self.x - p.x) < 16 and abs(self.y - (p.y - p.height/2)) < 24:
                p.take_damage(self.dmg); self.alive = False
        else:
            for e in world.enemies:
                if abs(self.x - e.x) < e.width/2 + 6 and abs(self.y - (e.y - e.height/2)) < e.height/2 + 6:
                    e.damage(self.dmg, world)
                    if self.radius_aoe > 0:
                        world.aoe_explode(self.x, self.y, self.radius_aoe, self.dmg, self.owner)
                    self.alive = False; return
    def draw(self, surf, cam_x):
        pygame.draw.circle(surf, self.color, (int(self.x - cam_x), int(self.y)), 4)


class Pickup:
    def __init__(self, x, y, kind):
        self.x=x; self.y=y; self.kind=kind; self.alive=True
    def update(self, dt, world):
        p = world.player
        if p and abs(self.x - p.x) < 28 and abs(self.y - (p.y - 20)) < 40:
            if self.kind == "coin": p.coins += 1
            elif self.kind == "crystal": p.crystals += 1
            elif self.kind == "token": p.tokens += 1
            DA.play_sfx("coin"); self.alive = False
    def draw(self, surf, cam_x):
        col = {"coin":(240,210,80), "crystal":(120,200,255), "token":(220,140,240)}[self.kind]
        pygame.draw.circle(surf, col, (int(self.x - cam_x), int(self.y)), 6)


class FlashFx:
    def __init__(self, x, y, r):
        self.x=x; self.y=y; self.r=r; self.t=0.25; self.alive=True
    def update(self, dt, world):
        self.t -= dt
        if self.t <= 0: self.alive = False
    def draw(self, surf, cam_x):
        a = max(0, int(self.t*4*180))
        s = pygame.Surface((self.r*2, self.r*2), pygame.SRCALPHA)
        pygame.draw.circle(s, (255,180,80,a), (self.r, self.r), self.r)
        surf.blit(s, (int(self.x - cam_x - self.r), int(self.y - self.r)))


class Landmark:
    SPRITES = {"MAIN_SHOP":"landmarks/main_shop.png",
               "UPGRADE_SHOP":"landmarks/upgrade_shop.png",
               "ALLY_SHOP":"landmarks/ally_shop.png"}
    def __init__(self, kind, x):
        self.kind=kind; self.x=x; self.y=GROUND_Y; self.alive=True
    def draw(self, surf, cam_x):
        img = DA.IMAGES[self.SPRITES[self.kind]]
        surf.blit(img, (int(self.x - cam_x - img.get_width()/2),
                        int(self.y - img.get_height())))


# ---------------------------------------------------------------------------
# UI overlays (pygame.draw + screen.blit, layouts mirror the React HUD)
# ---------------------------------------------------------------------------
PANEL_BG = (18, 16, 30, 235)
PANEL_BORDER = (90, 90, 140)

def _panel(surf, rect):
    p = pygame.Surface(rect.size, pygame.SRCALPHA)
    p.fill(PANEL_BG); surf.blit(p, rect.topleft)
    pygame.draw.rect(surf, PANEL_BORDER, rect, 2, border_radius=6)


def draw_hud(game, surf):
    f = game.fonts; p = game.player
    if not p: return
    # HP bar (top-left)
    pygame.draw.rect(surf, (40,40,50), pygame.Rect(16, 14, 240, 18), border_radius=4)
    hp_w = int(240 * max(0, p.hp) / max(1, p.max_hp))
    pygame.draw.rect(surf, (220,80,80), pygame.Rect(16, 14, hp_w, 18), border_radius=4)
    surf.blit(f["sm"].render(f"{int(p.hp)}/{p.max_hp}", True, (240,240,240)), (20, 14))
    # Currency stack
    surf.blit(f["md"].render(f"Coins {p.coins}", True, (240,220,120)), (16, 40))
    surf.blit(f["md"].render(f"Crystals {p.crystals}", True, (140,200,240)), (16, 66))
    surf.blit(f["md"].render(f"Tokens {p.tokens}", True, (220,160,240)), (16, 92))
    # Distance / wave (top-center)
    dist_t = f["lg"].render(f"{int(game.distance_m)} m", True, (240,240,240))
    surf.blit(dist_t, dist_t.get_rect(midtop=(SCREEN_W//2, 12)))
    surf.blit(f["sm"].render(f"Wave x{game.wave_count}  {game.difficulty}", True, (200,200,220)),
              (SCREEN_W//2 - 80, 56))
    # Equipped (top-right)
    y = 14
    for slot in ("ranged","melee","miscA","miscB"):
        wid = p.equipped.get(slot); w = WEAPONS.get(wid)
        if not w: continue
        ammo = p.ammo.get(wid)
        label = f"{slot.upper():<6} {w.name}" + (f"  [{ammo}]" if ammo is not None else "")
        surf.blit(f["sm"].render(label, True, (220,220,240)), (SCREEN_W - 320, y))
        y += 22
    # Tide rises banner
    if game.tide_msg_t > 0:
        t = f["lg"].render("(THE TIDE RISES)", True, (255, 80, 80))
        surf.blit(t, t.get_rect(center=(SCREEN_W//2, 110)))


# ---------------------------------------------------------------------------
# Overlays — Shop, Inventory, Almanac, Settings (read-only stub), Pause
# ---------------------------------------------------------------------------
class ShopMenu:
    def __init__(self, game, kind: str):
        self.game = game; self.kind = kind  # MAIN_SHOP / UPGRADE_SHOP / ALLY_SHOP
        self.idx = 0
        if kind == "MAIN_SHOP":      self.items = MAIN_SHOP
        elif kind == "UPGRADE_SHOP": self.items = AUGMENT_SHOP
        else:                        self.items = ALLIES
    def title(self):
        return {"MAIN_SHOP":"MAIN SHOP","UPGRADE_SHOP":"UPGRADE SHOP","ALLY_SHOP":"ALLY SHOP"}[self.kind]
    def currency_for(self, item) -> tuple[str, int]:
        c = item.currency
        p = self.game.player
        return (c.title(), {"coins":p.coins,"crystals":p.crystals,"tokens":p.tokens}[c])
    def handle_event(self, e):
        if e.type != pygame.KEYDOWN: return
        if e.key in (pygame.K_UP, pygame.K_w):    self.idx = (self.idx - 1) % len(self.items)
        elif e.key in (pygame.K_DOWN, pygame.K_s): self.idx = (self.idx + 1) % len(self.items)
        elif e.key in (pygame.K_RETURN, pygame.K_SPACE): self._buy()
        elif e.key == pygame.K_ESCAPE: self.game.close_overlay()
    def _can_afford(self, item) -> bool:
        p = self.game.player
        bal = {"coins":p.coins,"crystals":p.crystals,"tokens":p.tokens}[item.currency]
        return bal >= item.cost
    def _under_limit(self, item) -> bool:
        if getattr(item, "limit", None) is None: return True
        n = self.game.save["shop_purchases"].get(item.id, 0)
        return n < item.limit
    def _buy(self):
        item = self.items[self.idx]; p = self.game.player
        if not self._can_afford(item) or not self._under_limit(item): return
        # Deduct
        if   item.currency == "coins":    p.coins -= item.cost
        elif item.currency == "crystals": p.crystals -= item.cost
        else:                             p.tokens -= item.cost
        # Apply
        if isinstance(item, type(MAIN_SHOP[0])):  # ShopItem
            if item.weapon:
                p.owned.add(item.weapon)
                w = WEAPONS[item.weapon]
                if   w.klass == "ranged": p.equipped["ranged"] = item.weapon
                elif w.klass == "melee":  p.equipped["melee"]  = item.weapon
                else:                     p.equipped["miscB"]  = item.weapon
                if w.klass == "ranged":   p.ammo[item.weapon] = 200
            if item.ammo:
                for k in p.ammo: p.ammo[k] += item.ammo
            if item.dash:    p.extra_dashes += item.dash
            if item.revive:  p.revives += item.revive
        elif isinstance(item, type(AUGMENT_SHOP[0])):  # AugmentDef
            s = item.stat
            if   s == "ammo50":  [p.ammo.__setitem__(k, p.ammo[k]+50)  for k in p.ammo]
            elif s == "ammo150": [p.ammo.__setitem__(k, p.ammo[k]+150) for k in p.ammo]
            elif s == "maxhp":
                p.max_hp = min(PLAYER_MAX_HP_CAP, p.max_hp + 50)
                p.hp = min(p.max_hp, p.hp + 50)
                self.game.save["max_hp_bonus"] = min(500, self.game.save.get("max_hp_bonus",0) + 50)
            elif s == "dash":
                p.extra_dashes += 1; self.game.save["extra_dashes"] += 1
            elif s == "revive":
                p.revives += 1; self.game.save["extra_revives"] += 1
            else:
                p.augments.add(item.id)
                if item.id not in self.game.save["augments_owned"]:
                    self.game.save["augments_owned"].append(item.id)
        else:  # AllyDef
            cls = ALLY_CLASSES.get(item.id)
            if cls and self.game.player:
                self.game.allies.append(cls(self.game.player.x - 60, GROUND_Y))
        self.game.save["shop_purchases"][item.id] = self.game.save["shop_purchases"].get(item.id, 0) + 1
        DA.play_sfx("purchase")
    def draw(self, surf):
        ov = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA); ov.fill((0,0,0,170))
        surf.blit(ov, (0,0))
        rect = pygame.Rect(120, 60, SCREEN_W-240, SCREEN_H-120)
        _panel(surf, rect); f = self.game.fonts
        surf.blit(f["lg"].render(self.title(), True, (240,230,160)), (rect.x + 24, rect.y + 16))
        # Show all currencies
        p = self.game.player
        cur = f["md"].render(f"Coins {p.coins}   Crystals {p.crystals}   Tokens {p.tokens}", True, (220,220,240))
        surf.blit(cur, (rect.right - cur.get_width() - 24, rect.y + 22))
        y = rect.y + 80
        for i, item in enumerate(self.items):
            sel = (i == self.idx)
            color = (255,230,120) if sel else (220,220,240)
            cost_s = f"{item.cost} {item.currency[:1].upper()}"
            limit_s = ""
            if getattr(item, "limit", None) is not None:
                bought = self.game.save["shop_purchases"].get(item.id, 0)
                limit_s = f" [{bought}/{item.limit}]"
            line = f"{item.name:<22} {cost_s:>14}{limit_s:<10}  {item.desc}"
            surf.blit(f["sm"].render(line, True, color), (rect.x + 24, y))
            y += 22
            if y > rect.bottom - 40: break
        hint = f["sm"].render("Up/Down  -  Enter to buy  -  Esc to leave", True, (160,160,180))
        surf.blit(hint, hint.get_rect(midbottom=(rect.centerx, rect.bottom - 16)))


class Inventory:
    def __init__(self, game):
        self.game = game
        self.slots = ["ranged", "melee", "miscA", "miscB"]
        self.idx = 0
    def handle_event(self, e):
        if e.type != pygame.KEYDOWN: return
        if e.key in (pygame.K_UP, pygame.K_w):    self.idx = (self.idx - 1) % len(self.slots)
        elif e.key in (pygame.K_DOWN, pygame.K_s): self.idx = (self.idx + 1) % len(self.slots)
        elif e.key in (pygame.K_LEFT, pygame.K_a, pygame.K_RIGHT, pygame.K_d):
            self._cycle(1 if e.key in (pygame.K_RIGHT, pygame.K_d) else -1)
        elif e.key == pygame.K_ESCAPE or e.key == self.game.bind("inventory"):
            self.game.close_overlay()
    def _cycle(self, dir):
        slot = self.slots[self.idx]
        target_klass = "ranged" if slot == "ranged" else "melee" if slot == "melee" else "misc"
        owned = [wid for wid in self.game.player.owned
                 if WEAPONS.get(wid) and WEAPONS[wid].klass == target_klass]
        if not owned: return
        cur = self.game.player.equipped.get(slot)
        i = owned.index(cur) if cur in owned else 0
        self.game.player.equipped[slot] = owned[(i + dir) % len(owned)]
    def draw(self, surf):
        ov = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA); ov.fill((0,0,0,170))
        surf.blit(ov, (0,0))
        rect = pygame.Rect(160, 80, SCREEN_W-320, SCREEN_H-160)
        _panel(surf, rect); f = self.game.fonts
        surf.blit(f["lg"].render("INVENTORY", True, (240,230,160)), (rect.x + 24, rect.y + 16))
        y = rect.y + 80
        for i, slot in enumerate(self.slots):
            sel = (i == self.idx)
            color = (255,230,120) if sel else (220,220,240)
            wid = self.game.player.equipped.get(slot)
            w = WEAPONS.get(wid)
            ammo = self.game.player.ammo.get(wid)
            ammo_s = f"  [{ammo}]" if ammo is not None else ""
            line = f"{slot.upper():<6}  {(w.name if w else '-'):<24}{ammo_s}    {(w.desc if w else '')}"
            surf.blit(f["sm"].render(line, True, color), (rect.x + 24, y))
            y += 28
        hint = f["sm"].render("Up/Down select  Left/Right cycle  Esc close", True, (160,160,180))
        surf.blit(hint, hint.get_rect(midbottom=(rect.centerx, rect.bottom - 16)))


class Almanac:
    def __init__(self, game):
        self.game = game
        self.tabs = ["Weapons","Enemies","Allies","Mechanics"]
        self.tab = 0; self.scroll = 0
    def handle_event(self, e):
        if e.type != pygame.KEYDOWN: return
        if e.key in (pygame.K_LEFT, pygame.K_a):  self.tab = (self.tab - 1) % len(self.tabs); self.scroll = 0
        elif e.key in (pygame.K_RIGHT, pygame.K_d): self.tab = (self.tab + 1) % len(self.tabs); self.scroll = 0
        elif e.key in (pygame.K_UP, pygame.K_w):  self.scroll = max(0, self.scroll - 1)
        elif e.key in (pygame.K_DOWN, pygame.K_s): self.scroll += 1
        elif e.key == pygame.K_ESCAPE: self.game.close_overlay()
    def _lines(self):
        t = self.tabs[self.tab]
        if t == "Weapons":
            return [f"{w.name:<22} {w.klass:<6} dmg {int(w.dmg):>10}   {w.desc}" for w in WEAPONS.values()]
        if t == "Enemies":
            return [
                "Shooter      35 HP  ranged",
                "Shanker      28 HP  fast melee",
                "Brute       120 HP  heavy",
                "Necromancer 200 HP  ALRIGHT+ at 2000m, summons Minions",
                "Minion       30 HP  20 touch dmg",
                "The Bron    300 HP  SON only at 1700m, throws ball",
                "Giant       777 HP  SON only at 1700m, stomp",
                "Apache      500 HP  SON only at 1700m, flying",
            ]
        if t == "Allies":
            return [f"{a.name:<18} {a.cost:>5} tokens   {a.desc}" for a in ALLIES]
        return [
            "Lifesteal: every 8th kill restores 10 HP.",
            "Wave: every 5s spawn group; +6 enemies per 666m.",
            "Caps: DUNCE 7, ALRIGHT 15, SON 40 (SON also x2 spawns).",
            "Landmarks: Main Shop every 1234m, Upgrade beside it, Ally every 1667m.",
            "Safe radius: 9m around shop blocks enemy AI.",
            "Disco Bomb: forces 5s jump-only on all enemies, attacks disabled.",
            "The Button: 10000 coins, summons green sky-bomb (900 dmg, 180px AOE).",
            "Lil One: uncapped purchases, paced to player speed.",
        ]
    def draw(self, surf):
        ov = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA); ov.fill((0,0,0,180))
        surf.blit(ov, (0,0))
        rect = pygame.Rect(80, 50, SCREEN_W-160, SCREEN_H-100)
        _panel(surf, rect); f = self.game.fonts
        x = rect.x + 24
        for i, t in enumerate(self.tabs):
            color = (255,230,120) if i == self.tab else (180,180,200)
            txt = f["md"].render(t, True, color); surf.blit(txt, (x, rect.y + 16))
            x += txt.get_width() + 32
        lines = self._lines(); self.scroll = min(self.scroll, max(0, len(lines)-1))
        y = rect.y + 70
        for line in lines[self.scroll:]:
            surf.blit(f["sm"].render(line, True, (220,220,240)), (rect.x + 24, y))
            y += 22
            if y > rect.bottom - 40: break
        hint = f["sm"].render("Left/Right tabs - Up/Down scroll - Esc close", True, (160,160,180))
        surf.blit(hint, hint.get_rect(midbottom=(rect.centerx, rect.bottom - 16)))


# ---------------------------------------------------------------------------
# State machine
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
        surf.fill((10, 10, 18)); f = self.game.fonts
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
            if   e.key == g.bind("pause"):     g.push_state(PauseState(g))
            elif e.key == g.bind("jump"):      g.player.buffer_jump()
            elif e.key == g.bind("dash"):      g.player.try_dash()
            elif e.key == g.bind("roll"):      g.player.try_roll()
            elif e.key == g.bind("parry"):     g.player.try_parry()
            elif e.key == g.bind("fire"):      g.player_fire("ranged")
            elif e.key == g.bind("melee"):     g.player_fire("melee")
            elif e.key == g.bind("miscA"):     g.player_fire("miscA")
            elif e.key == g.bind("miscB"):     g.player_fire("miscB")
            elif e.key == g.bind("interact") or e.key == g.bind("shop"): g.try_open_shop()
            elif e.key == g.bind("inventory"): g.open_overlay(Inventory(g))
    def update(self, dt): self.game.update_world(dt)
    def draw(self, surf): self.game.draw_world(surf); draw_hud(self.game, surf)


class OverlayState(State):
    def __init__(self, game, overlay):
        super().__init__(game); self.overlay = overlay
    def handle_event(self, e): self.overlay.handle_event(e)
    def draw(self, surf):
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
        surf.fill((20,6,6)); f = self.game.fonts
        for y, (text, font, col) in enumerate([
            ("GAME OVER", f["xl"], (255,100,100)),
            (f"Distance: {int(self.distance)} m", f["lg"], (240,240,240)),
            (f"Kills: {self.kills}",  f["md"], (220,220,220)),
            (f"Coins: {self.coins}",  f["md"], (220,220,120)),
            ("Enter to return to menu", f["sm"], (160,160,180)),
        ]):
            r = font.render(text, True, col)
            surf.blit(r, r.get_rect(center=(SCREEN_W//2, 180 + y*70)))


# ---------------------------------------------------------------------------
# Game (engine.ts equivalent)
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
        s = save.get("settings", {})
        self.sfx_vol = s.get("sfx_volume", 0.55)
        self.music_vol = s.get("music_volume", 0.18)
        self.states: List[State] = []
        self.difficulty = "DUNCE"
        self.distance_m = 0.0; self.kills = 0
        self.lifesteal_counter = 0
        self.player: Optional[Player] = None
        self.enemies: list = []; self.allies: list = []
        self.projectiles: list = []; self.pickups: list = []
        self.fx: list = []; self.landmarks: list = []
        self.next_main_shop_m = MAIN_SHOP_EVERY_M
        self.next_ally_shop_m = ALLY_SHOP_EVERY_M
        self.wave_timer = 0.0; self.wave_count = WAVE_BASE_COUNT
        self.wave_increases = 0; self.next_wave_distance = WAVE_DISTANCE_STEP
        self.tide_msg_t = 0.0
        self.cam_x = 0.0
        self.disco_t = 0.0

    # state stack
    def start(self):
        self.replace_state(MenuState(self))
        DA.play_music(self.music_vol)
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
        if self.states and isinstance(self.states[-1], OverlayState): self.pop_state()

    def bind(self, action: str) -> int:
        return key_to_pg(self.keybinds.get(action, ""))

    # event/update/draw
    def handle_events(self, events) -> bool:
        for e in events:
            if e.type == pygame.QUIT: return False
            if self.states: self.states[-1].handle_event(e)
        return True
    def update(self, dt):
        if self.states: self.states[-1].update(dt)
    def draw(self):
        if self.states: self.states[-1].draw(self.screen)

    # run
    def start_run(self, difficulty: str):
        self.difficulty = difficulty
        self.distance_m = 0.0; self.kills = 0; self.lifesteal_counter = 0
        for L in (self.enemies, self.allies, self.projectiles,
                  self.pickups, self.fx, self.landmarks): L.clear()
        self.next_main_shop_m = MAIN_SHOP_EVERY_M
        self.next_ally_shop_m = ALLY_SHOP_EVERY_M
        self.wave_timer = 0.0; self.wave_count = WAVE_BASE_COUNT
        self.wave_increases = 0; self.next_wave_distance = WAVE_DISTANCE_STEP
        self.tide_msg_t = 0.0; self.cam_x = 0.0; self.disco_t = 0.0
        self.player = Player(0, GROUND_Y, self.save)
        self.replace_state(PlayingState(self))

    def end_run(self):
        best = self.save.setdefault("best_distance", {})
        best[self.difficulty] = max(best.get(self.difficulty, 0), int(self.distance_m))
        self.save["total_kills"] = self.save.get("total_kills", 0) + self.kills
        if self.player:
            self.save["total_coins_earned"] = self.save.get("total_coins_earned", 0) + self.player.coins
        DA.play_sfx("game_over")
        self.replace_state(GameOverState(self, self.distance_m, self.kills,
                                         self.player.coins if self.player else 0))

    # combat helpers
    def register_kill(self):
        self.kills += 1; self.lifesteal_counter += 1
        if self.lifesteal_counter >= LIFESTEAL_KILL_INTERVAL and self.player:
            self.lifesteal_counter = 0
            self.player.hp = min(self.player.max_hp, self.player.hp + LIFESTEAL_HEAL)
            DA.play_sfx("heal")

    def in_safe_radius(self, x: float) -> bool:
        r = SAFE_RADIUS_M * PIXELS_PER_METER
        for lm in self.landmarks:
            if abs(lm.x - x) < r: return True
        return False

    def spawn_projectile(self, x, y, vx, vy, dmg, owner, color=(255,230,80), radius=0):
        self.projectiles.append(Projectile(x, y, vx, vy, dmg, owner, color, radius))

    def aoe_explode(self, x, y, radius, dmg, owner):
        DA.play_sfx("explode")
        if owner in ("ally", "player"):
            for e in self.enemies:
                if (e.x - x)**2 + (e.y - y)**2 < radius*radius:
                    e.damage(dmg, self)
        self.fx.append(FlashFx(x, y, int(radius)))

    # input -> weapon
    def player_fire(self, slot: str):
        p = self.player
        if not p: return
        wid = p.equipped.get(slot)
        if not wid: return
        w = WEAPONS.get(wid)
        if not w: return
        cd_attr = "fire_cd" if slot == "ranged" else ("melee_cd" if slot == "melee" else "misc_cd")
        if getattr(p, cd_attr) > 0: return
        if w.klass == "ranged" and p.ammo.get(wid, 0) <= 0: return
        setattr(p, cd_attr, w.fireCd)
        if w.klass == "ranged" and wid in p.ammo: p.ammo[wid] = max(0, p.ammo[wid] - w.ammoPerShot)
        if w.klass == "ranged":
            DA.play_sfx("shoot")
            for _ in range(max(1, w.pellets)):
                spread = (random.random() - 0.5) * w.spread * 2
                self.spawn_projectile(p.x + 16*p.facing, p.y - 28,
                                      p.facing*w.speed, spread*w.speed,
                                      w.dmg, "player", color=hex_to_rgb(w.color))
        elif w.klass == "melee":
            DA.play_sfx("hit")
            dmg = w.dmg * MELEE_DAMAGE_MULT
            for e in list(self.enemies):
                if abs(e.x - p.x) < 70 and abs(e.y - p.y) < 60:
                    e.damage(dmg, self)
        else:  # misc / thrown
            DA.play_sfx("throw")
            if wid == "the_button":
                self.aoe_explode(p.x + 80*p.facing, GROUND_Y - 40,
                                 THE_BUTTON_RADIUS, THE_BUTTON_DAMAGE, "player")
            elif wid == "disco_bomb":
                self.disco_t = DISCO_BOMB_DURATION
                for e in self.enemies: e.disco_jump_t = DISCO_BOMB_DURATION
            elif wid == "obliterator_ray":
                for e in list(self.enemies): e.damage(99999, self)
            elif wid == "disposable_shield":
                p.shield_charges += 1
            elif wid == "medkit":
                p.hp = min(p.max_hp, p.hp + 60); DA.play_sfx("heal")
            else:
                radius = 110 if wid == "grenade" else 160 if wid == "napalm" else 80
                self.spawn_projectile(p.x + 30*p.facing, p.y - 40,
                                      p.facing*420, -260, w.dmg, "player",
                                      color=hex_to_rgb(w.color), radius=radius)

    def try_open_shop(self):
        p = self.player
        if not p: return
        for lm in self.landmarks:
            if abs(lm.x - p.x) < 60:
                self.open_overlay(ShopMenu(self, lm.kind)); return

    # world tick
    def update_world(self, dt):
        p = self.player
        if not p: return
        keys = pygame.key.get_pressed()
        ix = 0
        l = self.bind("moveLeft"); r = self.bind("moveRight")
        if 0 <= l < len(keys) and keys[l]: ix -= 1
        if 0 <= r < len(keys) and keys[r]: ix += 1
        p.update(dt, ix)
        if p.vx_ms > 0: self.distance_m += p.vx_ms * dt
        self.cam_x = p.x - SCREEN_W * 0.35
        # Wave timer (scale by player velocity so sprints don't create empty stretches)
        speed_factor = 1.0 + max(0.0, p.vx_ms - PLAYER_BASE_MS) / PLAYER_MAX_MS
        self.wave_timer += dt * speed_factor
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
            self.landmarks.append(Landmark("UPGRADE_SHOP", base + UPGRADE_SHOP_OFFSET_PX))
            self.next_main_shop_m += MAIN_SHOP_EVERY_M
        if self.distance_m >= self.next_ally_shop_m:
            self.landmarks.append(Landmark("ALLY_SHOP", p.x + 700))
            self.next_ally_shop_m += ALLY_SHOP_EVERY_M
        # Timers
        self.tide_msg_t = max(0.0, self.tide_msg_t - dt)
        self.disco_t = max(0.0, self.disco_t - dt)
        # Update lists
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
        for fx in list(self.fx):
            fx.update(dt, self)
            if not fx.alive: self.fx.remove(fx)
        for lm in list(self.landmarks):
            if lm.x < self.cam_x - 200: self.landmarks.remove(lm)
        # Death / revive
        if p.hp <= 0:
            if p.revives > 0:
                p.revives -= 1; p.hp = p.max_hp; DA.play_sfx("heal")
            else:
                self.end_run()

    def _spawn_wave(self):
        n = int(self.wave_count * DIFFICULTY_TABLE[self.difficulty]["spawn_mult"])
        for _ in range(n):
            cls = self._pick_enemy_class()
            x = self.player.x + random.choice([-1, 1]) * random.randint(420, 640)
            self.enemies.append(cls(x, GROUND_Y))

    def _pick_enemy_class(self):
        pool = list(ENEMY_POOL_BASE)
        if self.difficulty in ("ALRIGHT","SON") and self.distance_m >= NECRO_MIN_M:
            pool.append(Necromancer)
        if self.difficulty == "SON" and self.distance_m >= SON_HEAVY_MIN_M:
            pool += [Bron, Giant, Apache]
        return random.choice(pool)

    # rendering
    def draw_world(self, surf):
        surf.fill((24, 22, 40))
        # Parallax stripes
        for i in range(0, SCREEN_W, 80):
            sx = (i - int(self.cam_x * 0.3)) % SCREEN_W
            pygame.draw.rect(surf, (30,28,52), (sx, GROUND_Y-180, 40, 180))
        # Ground
        pygame.draw.rect(surf, (60,40,28), (0, GROUND_Y, SCREEN_W, SCREEN_H - GROUND_Y))
        pygame.draw.rect(surf, (90,60,40), (0, GROUND_Y, SCREEN_W, 6))
        for lm in self.landmarks: lm.draw(surf, self.cam_x)
        for pk in self.pickups:   pk.draw(surf, self.cam_x)
        for fx in self.fx:        fx.draw(surf, self.cam_x)
        for a in self.allies:     a.draw(surf, self.cam_x)
        if self.player:           self.player.draw(surf, self.cam_x)
        for e in self.enemies:    e.draw(surf, self.cam_x)
        for pr in self.projectiles: pr.draw(surf, self.cam_x)
        if self.disco_t > 0:
            ov = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
            t = (pygame.time.get_ticks() // 80) % 6
            cols = [(255,80,200,30),(80,255,200,30),(255,255,80,30),
                    (80,200,255,30),(200,80,255,30),(255,200,80,30)]
            ov.fill(cols[t]); surf.blit(ov, (0,0))
