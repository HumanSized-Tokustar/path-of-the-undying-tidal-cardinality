"""
INTELLIGENCEentities.py — entity classes.

Player, Enemy subclasses, Allies, Projectiles, Pickups, Landmarks.
All operate in world pixel coordinates.  The Game owns the world list and
calls update / draw on each entity per frame.
"""
from __future__ import annotations
import math, random, pygame
from typing import Optional

from pygame_port.data.constants import (
    GROUND_Y, PIXELS_PER_METER, GRAVITY, JUMP_VEL,
    PLAYER_BASE_MS, PLAYER_MAX_MS, PLAYER_ACCEL, PLAYER_FRICTION,
    PLAYER_MAX_HP_BASE, COYOTE_TIME, JUMP_BUFFER, DASH_IMPULSE, DASH_IFRAMES,
    DASH_COOLDOWN, ROLL_IMPULSE, ROLL_COOLDOWN, PARRY_WINDOW, PARRY_COOLDOWN,
    SAFE_RADIUS_M, MELEE_DAMAGE_MULT, THE_BUTTON_DAMAGE, THE_BUTTON_RADIUS,
    DISCO_BOMB_DURATION,
)
from pygame_port.SUMassets import assets, audio
from pygame_port.data.weapons import WEAPONS


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------
class Entity:
    sprite_key = None
    width = 28; height = 44
    def __init__(self, x, y):
        self.x = float(x); self.y = float(y)
        self.vx = 0.0; self.vy = 0.0
        self.alive = True
    def rect(self):
        return pygame.Rect(int(self.x - self.width/2), int(self.y - self.height), self.width, self.height)
    def draw(self, surf, cam_x):
        sp = self._sprite()
        if not sp: return
        surf.blit(sp, (int(self.x - cam_x - sp.get_width()/2), int(self.y - sp.get_height())))
    def _sprite(self): return None


# ---------------------------------------------------------------------------
# Player
# ---------------------------------------------------------------------------
class Player(Entity):
    width = 28; height = 44
    def __init__(self, x, y):
        super().__init__(x, y)
        self.vx_ms = 0.0  # m/s horizontal speed
        self.facing = 1
        self.hp = PLAYER_MAX_HP_BASE; self.max_hp = PLAYER_MAX_HP_BASE
        self.coyote_t = 0.0; self.jump_buffer_t = 0.0
        self.on_ground = True
        self.dash_cd = 0.0; self.iframes = 0.0
        self.roll_cd = 0.0; self.parry_cd = 0.0; self.parry_t = 0.0
        self.extra_dashes = 0; self.dashes_left = 1
        self.revives = 0
        self.coins = 0; self.crystals = 0; self.tokens = 0
        self.ammo = {wid: w.ammo for wid, w in WEAPONS.items() if w.ammo}
        self.owned = set()
        self.equipped = {"ranged": "pistol", "melee": "knife", "miscA": "grenade", "miscB": "medkit"}
        self.fire_cd = 0.0; self.melee_cd = 0.0; self.misc_cd = 0.0
        self.augments = set()        # status augments owned
        self.shield_charges = 0

    def _sprite(self): return assets.player()

    def take_damage(self, amount):
        if self.iframes > 0 or self.parry_t > 0: return False
        if self.shield_charges > 0:
            self.shield_charges -= 1; audio.play("shield_on"); return False
        if "enfeeble" in self.augments: amount *= 0.7
        self.hp -= amount
        audio.play("hurt")
        return True

    def buffer_jump(self): self.jump_buffer_t = JUMP_BUFFER

    def try_dash(self):
        if self.dash_cd > 0 or self.dashes_left <= 0: return
        self.vx_ms = math.copysign(DASH_IMPULSE, self.facing)
        self.iframes = DASH_IFRAMES; self.dash_cd = DASH_COOLDOWN
        self.dashes_left -= 1; audio.play("dash")

    def try_roll(self):
        if self.roll_cd > 0: return
        self.vx_ms = math.copysign(ROLL_IMPULSE, self.facing)
        self.roll_cd = ROLL_COOLDOWN; audio.play("roll")

    def try_parry(self):
        if self.parry_cd > 0: return
        self.parry_t = PARRY_WINDOW; self.parry_cd = PARRY_COOLDOWN; audio.play("parry")

    def update(self, dt, input_x):
        self.vx_ms += input_x * PLAYER_ACCEL * dt
        self.vx_ms *= PLAYER_FRICTION ** dt
        if abs(self.vx_ms) > PLAYER_MAX_MS:
            self.vx_ms = math.copysign(PLAYER_MAX_MS, self.vx_ms)
        if input_x != 0: self.facing = 1 if input_x > 0 else -1
        self.vy += GRAVITY * dt
        self.coyote_t = COYOTE_TIME if self.on_ground else max(0.0, self.coyote_t - dt)
        self.jump_buffer_t = max(0.0, self.jump_buffer_t - dt)
        if self.jump_buffer_t > 0 and self.coyote_t > 0:
            self.vy = -JUMP_VEL; self.on_ground = False
            self.jump_buffer_t = 0; self.coyote_t = 0; audio.play("jump")
        self.x += self.vx_ms * PIXELS_PER_METER * dt
        self.y += self.vy * dt
        if self.y >= GROUND_Y:
            self.y = GROUND_Y; self.vy = 0
            if not self.on_ground:
                self.on_ground = True; self.dashes_left = 1 + self.extra_dashes
        else:
            self.on_ground = False
        for attr in ("dash_cd", "iframes", "roll_cd", "parry_cd", "parry_t",
                     "fire_cd", "melee_cd", "misc_cd"):
            setattr(self, attr, max(0.0, getattr(self, attr) - dt))


# ---------------------------------------------------------------------------
# Enemies
# ---------------------------------------------------------------------------
class Enemy(Entity):
    name = "enemy"; hp_max = 30; touch_dmg = 10
    coin_drop = (1, 3); xp_drop = 0; crystal_chance = 0.05; token_chance = 0.0
    speed_ms = 7.0; can_double_jump = True; flying = False
    def __init__(self, x, y):
        super().__init__(x, y if not self.flying else y - 180)
        self.hp = self.hp_max
        self.attack_cd = 0.0
        self.disco_jump_t = 0.0  # set by Disco Bomb
        self.jumps_left = 2 if self.can_double_jump else 1
    def update(self, dt, world):
        # Disco Bomb: forced jumping, no attacks
        if self.disco_jump_t > 0:
            self.disco_jump_t = max(0.0, self.disco_jump_t - dt)
            if self.on_ground_check() and self.jumps_left > 0:
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
    def on_ground_check(self): return self.y >= GROUND_Y - 0.1
    def _ai(self, dt, world):
        # Default: chase player horizontally, contact damage
        p = world.player
        if not p: return
        # Respect 9m landmark safe radius
        if world.in_safe_radius(self.x):
            self.vx = 0; return
        dirx = 1 if p.x > self.x else -1
        self.vx = dirx * self.speed_ms * PIXELS_PER_METER
        if self.attack_cd <= 0 and abs(self.x - p.x) < 28 and abs(self.y - p.y) < 50:
            if p.take_damage(self.touch_dmg): self.attack_cd = 0.8
    def damage(self, amt, world):
        self.hp -= amt
        if self.hp <= 0:
            self.alive = False
            world.coins += random.randint(*self.coin_drop)
            if random.random() < self.crystal_chance: world.crystals += 1
            if random.random() < self.token_chance: world.tokens += 1
            world.register_kill()
            audio.play("kill" if False else "hit")

class Shooter(Enemy):
    name = "Shooter"; hp_max = 35; touch_dmg = 12; speed_ms = 6.0
    def _sprite(self): return assets.shooter()
    def _ai(self, dt, world):
        p = world.player
        if not p: return
        if world.in_safe_radius(self.x): self.vx = 0; return
        dist = abs(self.x - p.x)
        dirx = 1 if p.x > self.x else -1
        self.vx = dirx * (self.speed_ms * PIXELS_PER_METER) * (0.4 if dist < 280 else 1)
        if self.attack_cd <= 0 and dist < 360:
            world.spawn_projectile(self.x, self.y - 24, dirx * 540, 0, 14, owner="enemy")
            self.attack_cd = 1.1

class Shanker(Enemy):
    name = "Shanker"; hp_max = 28; touch_dmg = 16; speed_ms = 11.0
    def _sprite(self): return assets.shanker()

class Brute(Enemy):
    name = "Brute"; hp_max = 120; touch_dmg = 28; speed_ms = 5.5
    coin_drop = (4, 8); crystal_chance = 0.15
    def _sprite(self): return assets.brute()

class Necromancer(Enemy):
    name = "Necromancer"; hp_max = 200; touch_dmg = 18; speed_ms = 4.5
    coin_drop = (8, 14); crystal_chance = 0.4; token_chance = 0.1
    summon_cd = 0.0
    def _sprite(self): return assets.necromancer()
    def _ai(self, dt, world):
        super()._ai(dt, world)
        self.summon_cd = max(0.0, self.summon_cd - dt)
        if self.summon_cd <= 0:
            world.enemies.append(Minion(self.x + random.randint(-40, 40), GROUND_Y))
            self.summon_cd = 4.0

class Minion(Enemy):
    name = "Minion"; hp_max = 30; touch_dmg = 20; speed_ms = 9.0
    coin_drop = (1, 2)
    def _sprite(self): return assets.minion()

class Bron(Enemy):
    name = "The Bron"; hp_max = 300; touch_dmg = 30; speed_ms = 7.0
    coin_drop = (10, 18); crystal_chance = 0.5; token_chance = 0.2
    def _sprite(self): return assets.bron()
    def _ai(self, dt, world):
        p = world.player
        if not p or world.in_safe_radius(self.x): self.vx = 0; return
        dirx = 1 if p.x > self.x else -1
        self.vx = dirx * self.speed_ms * PIXELS_PER_METER * 0.6
        if self.attack_cd <= 0 and abs(self.x - p.x) < 420:
            world.spawn_projectile(self.x, self.y - 30, dirx * 700, -200, 50, owner="enemy", color=(220,120,40))
            self.attack_cd = 1.6

class Giant(Enemy):
    name = "Giant"; hp_max = 777; touch_dmg = 70; speed_ms = 4.0
    width = 56; height = 84
    coin_drop = (20, 35); crystal_chance = 0.7; token_chance = 0.3
    def _sprite(self): return assets.giant()

class Apache(Enemy):
    name = "Apache"; hp_max = 500; touch_dmg = 25; speed_ms = 9.0
    width = 72; height = 36; flying = True
    coin_drop = (15, 30); crystal_chance = 0.6; token_chance = 0.25
    def _sprite(self): return assets.apache()
    def _ai(self, dt, world):
        p = world.player
        if not p: return
        # Hover at fixed altitude, strafe toward player
        target_y = GROUND_Y - 220
        self.y += (target_y - self.y) * min(1.0, dt * 3)
        dirx = 1 if p.x > self.x else -1
        self.vx = dirx * self.speed_ms * PIXELS_PER_METER * 0.7
        if self.attack_cd <= 0 and abs(self.x - p.x) < 520:
            world.spawn_projectile(self.x, self.y + 12, dirx * 620, 320, 25, owner="enemy", color=(230,80,80))
            self.attack_cd = 0.7


ENEMY_POOL_BASE = [Shooter, Shanker, Brute]


# ---------------------------------------------------------------------------
# Allies
# ---------------------------------------------------------------------------
class Ally(Entity):
    name = "ally"; hp_max = 60; speed_ms = 9.0; touch_dmg = 15
    fire_cd_max = 0.6; range_px = 320; lifetime = None
    sprite_func = None
    def __init__(self, x, y):
        super().__init__(x, y); self.hp = self.hp_max; self.fire_cd = 0.0
        self.life_left = self.lifetime
    def _sprite(self): return self.sprite_func() if self.sprite_func else assets.lil_one()
    def update(self, dt, world):
        p = world.player
        if not p: return
        # Pace to match player so we don't outrun them
        target_x = p.x - 40 * (1 if p.facing > 0 else -1)
        dx = target_x - self.x
        max_speed = min(self.speed_ms, abs(p.vx_ms) + 1.0)
        self.vx = max(-max_speed, min(max_speed, dx * 4)) * PIXELS_PER_METER * 0.1
        self.x += self.vx * dt
        self.vy += GRAVITY * dt; self.y += self.vy * dt
        if self.y >= GROUND_Y: self.y = GROUND_Y; self.vy = 0
        self.fire_cd = max(0.0, self.fire_cd - dt)
        # Find nearest enemy in range, shoot
        target = None; best = self.range_px
        for e in world.enemies:
            d = abs(e.x - self.x)
            if d < best: best = d; target = e
        if target and self.fire_cd <= 0:
            dirx = 1 if target.x > self.x else -1
            world.spawn_projectile(self.x, self.y - 20, dirx * 600, 0, self.touch_dmg, owner="ally")
            self.fire_cd = self.fire_cd_max
        if self.life_left is not None:
            self.life_left -= dt
            if self.life_left <= 0: self.alive = False

class LilOne(Ally):
    name = "Lil One"; hp_max = 60; speed_ms = 9.0; touch_dmg = 8
    fire_cd_max = 0.7; range_px = 240
    def _sprite(self): return assets.lil_one()

class SheriffSeriff(Ally):
    name = "Sheriff Seriff"; hp_max = 180; speed_ms = 7.0; touch_dmg = 30
    fire_cd_max = 0.45; range_px = 420
    def _sprite(self): return assets.sheriff()

class Eradidog(Ally):
    name = "Eradidog"; hp_max = 220; speed_ms = 12.0; touch_dmg = 25
    fire_cd_max = 0.3; range_px = 80
    def _sprite(self): return assets.eradidog()

class Stalien(Ally):
    name = "Stalien"; hp_max = 260; speed_ms = 8.0; touch_dmg = 40
    fire_cd_max = 0.5; range_px = 380
    def _sprite(self): return assets.stalien()

class DudePerson(Ally):
    name = "Dude Person"; hp_max = 320; speed_ms = 9.5; touch_dmg = 50
    fire_cd_max = 0.55; range_px = 360
    def _sprite(self): return assets.dude_person()

ALLY_CLASSES = {
    "lil_one": LilOne, "sheriff_seriff": SheriffSeriff,
    "eradidog": Eradidog, "stalien": Stalien, "dude_person": DudePerson,
}


# ---------------------------------------------------------------------------
# Projectiles & pickups & landmarks
# ---------------------------------------------------------------------------
class Projectile:
    def __init__(self, x, y, vx, vy, dmg, owner, color=(255,230,80), radius=0):
        self.x = x; self.y = y; self.vx = vx; self.vy = vy
        self.dmg = dmg; self.owner = owner; self.color = color
        self.radius_aoe = radius; self.life = 2.5; self.alive = True
    def update(self, dt, world):
        self.x += self.vx * dt; self.y += self.vy * dt
        self.vy += GRAVITY * 0.4 * dt
        self.life -= dt
        if self.life <= 0 or self.y > GROUND_Y + 10:
            if self.radius_aoe > 0: world.aoe_explode(self.x, self.y, self.radius_aoe, self.dmg, self.owner)
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
        self.x = x; self.y = y; self.kind = kind; self.alive = True
    def update(self, dt, world):
        p = world.player
        if p and abs(self.x - p.x) < 28 and abs(self.y - (p.y - 20)) < 40:
            if self.kind == "coin":    world.coins += 1
            elif self.kind == "crystal":world.crystals += 1
            elif self.kind == "token": world.tokens += 1
            audio.play("coin"); self.alive = False
    def draw(self, surf, cam_x):
        col = {"coin":(240,210,80), "crystal":(120,200,255), "token":(220,140,240)}[self.kind]
        pygame.draw.circle(surf, col, (int(self.x - cam_x), int(self.y)), 6)


class Landmark:
    def __init__(self, kind, x):
        self.kind = kind; self.x = x; self.y = GROUND_Y; self.alive = True
    def sprite(self):
        return {"MAIN_SHOP": assets.main_shop, "UPGRADE_SHOP": assets.upgrade_shop, "ALLY_SHOP": assets.ally_shop}[self.kind]()
    def draw(self, surf, cam_x):
        sp = self.sprite()
        surf.blit(sp, (int(self.x - cam_x - sp.get_width()/2), int(self.y - sp.get_height())))
    def safe_radius_px(self):
        return SAFE_RADIUS_M * PIXELS_PER_METER
