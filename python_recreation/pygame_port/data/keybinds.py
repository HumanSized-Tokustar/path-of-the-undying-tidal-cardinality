"""Loads keybinds.json (shared with web version) and converts to pygame key codes."""
import json, os
import pygame

DEFAULT_KEYBINDS = {
    "moveLeft": "a", "moveRight": "d", "moveUp": "w", "moveDown": "s",
    "jump": "space", "dash": "q", "roll": "z", "parry": "e",
    "fire": "f", "melee": "r", "miscA": "o", "miscB": "p",
    "grab": "v", "shield": "x", "overdrive": "g",
    "inventory": "tab", "pause": "escape", "interact": "return",
    "slot1": "1", "slot2": "2", "slot3": "3", "slot4": "4", "slot5": "5", "slot6": "6",
}

_KEY_ALIASES = {
    "space": pygame.K_SPACE, "escape": pygame.K_ESCAPE, "tab": pygame.K_TAB,
    "return": pygame.K_RETURN, "enter": pygame.K_RETURN,
    "shift": pygame.K_LSHIFT, "ctrl": pygame.K_LCTRL, "alt": pygame.K_LALT,
    "left": pygame.K_LEFT, "right": pygame.K_RIGHT, "up": pygame.K_UP, "down": pygame.K_DOWN,
}

def key_name_to_pg(name: str) -> int:
    name = (name or "").lower().strip()
    if name in _KEY_ALIASES: return _KEY_ALIASES[name]
    if len(name) == 1:
        return pygame.key.key_code(name)
    try: return pygame.key.key_code(name)
    except Exception: return pygame.K_UNKNOWN

def load_keybinds(path: str | None = None) -> dict:
    here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    candidates = [path] if path else []
    candidates += [
        os.path.join(here, "pygame_port", "keybinds.json"),
        os.path.join(here, "keybinds.json"),
    ]
    binds = dict(DEFAULT_KEYBINDS)
    for p in candidates:
        if p and os.path.exists(p):
            try:
                with open(p) as f: binds.update(json.load(f))
                break
            except Exception: pass
    return binds

def save_keybinds(binds: dict, path: str | None = None) -> None:
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target = path or os.path.join(here, "keybinds.json")
    with open(target, "w") as f: json.dump(binds, f, indent=2)
