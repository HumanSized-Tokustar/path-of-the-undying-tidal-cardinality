"""data/keybinds.py — load keybinds.json, normalize to pygame keycodes."""
import json, os
import pygame

DEFAULT_KEYBINDS = {
    "moveLeft": "a", "moveRight": "d", "moveUp": "w", "moveDown": "s",
    "jump": "space", "dash": "q", "roll": "z", "parry": "e",
    "fire": "f", "melee": "r", "miscA": "o", "miscB": "p",
    "grab": "v", "shield": "x", "overdrive": "g",
    "inventory": "tab", "pause": "escape", "shop": "t", "interact": "return",
    "slot1": "1", "slot2": "2", "slot3": "3", "slot4": "4", "slot5": "5", "slot6": "6",
}

_ALIASES = {
    "space": pygame.K_SPACE, "escape": pygame.K_ESCAPE, "tab": pygame.K_TAB,
    "return": pygame.K_RETURN, "enter": pygame.K_RETURN,
    "shift": pygame.K_LSHIFT, "ctrl": pygame.K_LCTRL, "alt": pygame.K_LALT,
    "left": pygame.K_LEFT, "right": pygame.K_RIGHT, "up": pygame.K_UP, "down": pygame.K_DOWN,
}

def key_to_pg(name: str) -> int:
    name = (name or "").lower().strip()
    if name in _ALIASES: return _ALIASES[name]
    if not name: return pygame.K_UNKNOWN
    try: return pygame.key.key_code(name)
    except Exception: return pygame.K_UNKNOWN

def load_keybinds() -> dict:
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(here, "keybinds.json")
    binds = dict(DEFAULT_KEYBINDS)
    if os.path.exists(path):
        try:
            with open(path) as f: binds.update(json.load(f))
        except Exception: pass
    return binds

def save_keybinds(binds: dict) -> None:
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(here, "keybinds.json")
    try:
        with open(path, "w") as f: json.dump(binds, f, indent=2)
    except Exception: pass
