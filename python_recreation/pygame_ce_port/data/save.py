"""data/save.py — save_data.json read/write."""
import json, os

_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "save_data.json")

DEFAULT = {
    "version": 1,
    "best_distance": {"DUNCE": 0, "ALRIGHT": 0, "SON": 0},
    "total_coins_earned": 0,
    "total_kills": 0,
    "settings": {"music_volume": 0.18, "sfx_volume": 0.55, "fullscreen": False},
    "shop_purchases": {},
    "augments_owned": [],
    "max_hp_bonus": 0,
    "extra_dashes": 0,
    "extra_revives": 0,
}

def load_save() -> dict:
    try:
        with open(_PATH) as f:
            d = json.load(f)
        for k, v in DEFAULT.items(): d.setdefault(k, v)
        return d
    except Exception:
        return dict(DEFAULT)

def write_save(data: dict) -> None:
    try:
        with open(_PATH, "w") as f: json.dump(data, f, indent=2)
    except Exception: pass
