"""Save/load helper for pygame_port/save_data.json."""
import json, os

_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "save_data.json")

def load_save() -> dict:
    try:
        with open(_PATH) as f: return json.load(f)
    except Exception:
        return {
            "version": 1,
            "best_distance": {"DUNCE": 0, "ALRIGHT": 0, "SON": 0},
            "total_coins_earned": 0, "total_kills": 0,
            "settings": {"music_volume": 0.18, "sfx_volume": 0.55, "fullscreen": False},
            "unlocked_almanac": {"weapons": [], "enemies": [], "allies": []},
        }

def write_save(data: dict) -> None:
    try:
        with open(_PATH, "w") as f: json.dump(data, f, indent=2)
    except Exception: pass
