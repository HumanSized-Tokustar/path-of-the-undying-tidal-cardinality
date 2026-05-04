"""
ui.py — HUD, ShopMenu, Almanac, Inventory, Pause, Settings overlays.
All rendered with pygame primitives + system fonts so no extra assets needed.
"""
from __future__ import annotations
import pygame
from pygame_port.data.constants import SCREEN_W, SCREEN_H
from pygame_port.data.weapons import WEAPONS
from pygame_port.data.shops import MAIN_SHOP, AUGMENT_SHOP, ALLIES

PANEL = (18, 16, 30, 235)
PANEL_BORDER = (90, 90, 140)


def _panel(surf, rect, alpha_bg=PANEL):
    p = pygame.Surface(rect.size, pygame.SRCALPHA)
    p.fill(alpha_bg); surf.blit(p, rect.topleft)
    pygame.draw.rect(surf, PANEL_BORDER, rect, 2, border_radius=6)


def draw_hud(game, surf):
    f = game.fonts; p = game.player
    if not p: return
    # Health bar
    pygame.draw.rect(surf, (40,40,50), (16, 14, 240, 18), border_radius=4)
    hp_w = int(240 * max(0, p.hp) / max(1, p.max_hp))
    pygame.draw.rect(surf, (220,80,80), (16, 14, hp_w, 18), border_radius=4)
    surf.blit(f["sm"].render(f"{int(p.hp)}/{p.max_hp}", True, (240,240,240)), (20, 14))
    # Resources
    surf.blit(f["md"].render(f"Coins {p.coins}", True, (240,220,120)), (16, 40))
    surf.blit(f["md"].render(f"Crystals {p.crystals}", True, (140,200,240)), (16, 66))
    surf.blit(f["md"].render(f"Tokens {p.tokens}", True, (220,160,240)), (16, 92))
    # Distance / wave
    dist_t = f["lg"].render(f"{int(game.distance_m)} m", True, (240,240,240))
    surf.blit(dist_t, dist_t.get_rect(midtop=(SCREEN_W//2, 12)))
    surf.blit(f["sm"].render(f"Wave x{game.wave_count}  {game.difficulty}", True, (200,200,220)),
              (SCREEN_W//2 - 80, 56))
    # Equipped (right side)
    eq = p.equipped
    y = 14
    for slot in ("ranged","melee","miscA","miscB"):
        wid = eq.get(slot); w = WEAPONS.get(wid)
        if not w: continue
        ammo = p.ammo.get(wid)
        label = f"{slot.upper():<6} {w.name}" + (f"  [{ammo}]" if ammo is not None else "")
        surf.blit(f["sm"].render(label, True, (220,220,240)), (SCREEN_W - 280, y))
        y += 22
    # Tide rises
    if game.tide_msg_t > 0:
        t = f["lg"].render("(THE TIDE RISES)", True, (255, 80, 80))
        surf.blit(t, t.get_rect(center=(SCREEN_W//2, 110)))


# ---------------------------------------------------------------------------
# Shop overlays
# ---------------------------------------------------------------------------
class ShopMenu:
    """Overlay opened when the player touches a shop landmark."""
    def __init__(self, game, kind: str):
        self.game = game; self.kind = kind  # MAIN_SHOP / UPGRADE_SHOP / ALLY_SHOP
        self.idx = 0
        self.items = self._build_items()
    def _build_items(self):
        if self.kind == "MAIN_SHOP":
            return [("weapon", it) for it in MAIN_SHOP]
        if self.kind == "UPGRADE_SHOP":
            return [("aug", a) for a in AUGMENT_SHOP]
        return [("ally", a) for a in ALLIES]
    def title(self):
        return {"MAIN_SHOP":"MAIN SHOP","UPGRADE_SHOP":"UPGRADE SHOP","ALLY_SHOP":"ALLY SHOP"}[self.kind]
    def currency(self):
        p = self.game.player
        if self.kind == "MAIN_SHOP":   return ("Coins", p.coins)
        if self.kind == "UPGRADE_SHOP":return ("Crystals", p.crystals)
        return ("Tokens", p.tokens)
    def handle_event(self, e):
        if e.type != pygame.KEYDOWN: return
        if e.key in (pygame.K_UP, pygame.K_w):    self.idx = (self.idx - 1) % len(self.items)
        elif e.key in (pygame.K_DOWN, pygame.K_s): self.idx = (self.idx + 1) % len(self.items)
        elif e.key in (pygame.K_RETURN, pygame.K_SPACE): self._buy()
        elif e.key == pygame.K_ESCAPE: self.game.close_overlay()
    def _buy(self):
        kind, item = self.items[self.idx]
        p = self.game.player
        if kind == "weapon":
            if p.coins < item.cost: return
            p.coins -= item.cost
            p.owned.add(item.weapon_id)
            w = WEAPONS[item.weapon_id]
            if w.klass == "ranged": p.equipped["ranged"] = item.weapon_id
            elif w.klass == "melee": p.equipped["melee"]  = item.weapon_id
            else:                    p.equipped["miscB"]  = item.weapon_id
            if w.ammo: p.ammo[item.weapon_id] = w.ammo
        elif kind == "aug":
            if p.crystals < item.cost: return
            p.crystals -= item.cost
            if item.id == "ammo_50":
                for k in p.ammo: p.ammo[k] += 50
            elif item.id == "ammo_150":
                for k in p.ammo: p.ammo[k] += 150
            elif item.id == "hp_50":
                p.max_hp = min(600, p.max_hp + 50); p.hp = min(p.max_hp, p.hp + 50)
            elif item.id == "extra_dash":
                p.extra_dashes = min(1, p.extra_dashes + 1)
            elif item.id == "extra_revive":
                p.revives = min(2, p.revives + 1)
            else:
                p.augments.add(item.id)
        elif kind == "ally":
            if p.tokens < item.cost: return
            p.tokens -= item.cost
            self.game.spawn_ally(item.id)
        from pygame_port.SUMassets import audio
        audio.play("purchase")
    def draw(self, surf):
        # Dim background
        ov = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA); ov.fill((0,0,0,170))
        surf.blit(ov, (0,0))
        rect = pygame.Rect(120, 60, SCREEN_W-240, SCREEN_H-120)
        _panel(surf, rect)
        f = self.game.fonts
        title = f["lg"].render(self.title(), True, (240,230,160))
        surf.blit(title, (rect.x + 24, rect.y + 16))
        c_label, c_val = self.currency()
        cur = f["md"].render(f"{c_label}: {c_val}", True, (220,220,240))
        surf.blit(cur, (rect.right - cur.get_width() - 24, rect.y + 22))
        y = rect.y + 80
        for i, (kind, item) in enumerate(self.items):
            sel = (i == self.idx)
            color = (255,230,120) if sel else (220,220,240)
            if kind == "weapon":
                w = WEAPONS[item.weapon_id]
                line = f"{w.name:<22} {item.cost:>8} {c_label[:1]}    {w.desc}"
            elif kind == "aug":
                line = f"{item.name:<22} {item.cost:>8} {c_label[:1]}    {item.desc}"
            else:
                line = f"{item.name:<22} {item.cost:>8} {c_label[:1]}    {item.desc}"
            surf.blit(f["sm"].render(line, True, color), (rect.x + 24, y))
            y += 24
            if y > rect.bottom - 40: break
        hint = f["sm"].render("Up/Down to choose - Enter to buy - Esc to leave", True, (160,160,180))
        surf.blit(hint, hint.get_rect(midbottom=(rect.centerx, rect.bottom - 16)))


# ---------------------------------------------------------------------------
# Almanac (read-only reference)
# ---------------------------------------------------------------------------
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
        if self.tabs[self.tab] == "Weapons":
            return [f"{w.name:<22} {w.klass:<6} dmg {int(w.damage):>5}   {w.desc}" for w in WEAPONS.values()]
        if self.tabs[self.tab] == "Enemies":
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
        if self.tabs[self.tab] == "Allies":
            return [f"{a.name:<18} {a.cost:>5} tokens   {a.desc}" for a in ALLIES]
        return [
            "Lifesteal: every 8th kill restores 10 HP.",
            "Wave: every 5s spawn group; +6 enemies per 666m.",
            "Caps: DUNCE 7, ALRIGHT 15, SON 40 (SON also x2 spawns).",
            "Landmarks: Main Shop every 1234m, Upgrade beside it, Ally every 1667m.",
            "Safe radius: enemies cannot approach within 9m of a shop.",
            "Disco Bomb: forces 5s jump-only on all enemies, attacks disabled.",
            "The Button: 10000 coins, summons green sky-bomb (900 dmg, 180px AOE).",
            "Lil One: uncapped purchases, paced to player speed.",
        ]
    def draw(self, surf):
        ov = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA); ov.fill((0,0,0,180))
        surf.blit(ov, (0,0))
        rect = pygame.Rect(80, 50, SCREEN_W-160, SCREEN_H-100)
        _panel(surf, rect)
        f = self.game.fonts
        # Tabs
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
