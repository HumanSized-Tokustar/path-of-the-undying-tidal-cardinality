"""DA.py — Asset loader.

Per spec: NO procedural generation, NO embedded binaries. This module exposes
two dictionaries — IMAGES and SOUNDS — keyed by canonical asset names. Each
key maps to either a pygame.Surface (image) or a pygame.mixer.Sound, lazily
loaded from /assets on first request. Missing files fall back to a tiny
solid-color placeholder Surface or a silent Sound so the game never crashes.

Provide the listed files in pygame_ce_port/assets/ to get full visuals/audio.
"""
from __future__ import annotations
import os
import pygame

ASSETS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")
SPRITES_DIR = os.path.join(ASSETS_DIR, "sprites")
SFX_DIR     = os.path.join(ASSETS_DIR, "sfx")
MUSIC_DIR   = os.path.join(ASSETS_DIR, "music")

# ---------------------------------------------------------------------------
# Expected manifest (provide these files in /assets)
# ---------------------------------------------------------------------------
EXPECTED_SPRITES = [
    # Player
    "player/player_idle.png", "player/player_run.png", "player/player_jump.png",
    # Enemies
    "enemies/shooter.png", "enemies/shanker.png", "enemies/brute.png",
    "enemies/necromancer.png", "enemies/minion.png",
    "enemies/bron.png", "enemies/giant.png", "enemies/apache.png",
    # Allies
    "allies/lil_one.png", "allies/sheriff_seriff.png",
    "allies/eradidog.png", "allies/stalien.png", "allies/dude_person.png",
    # Items / weapons (icons)
    "items/pistol.png", "items/smg.png", "items/shotgun.png", "items/rifle.png",
    "items/knife.png", "items/grenade.png", "items/sniper.png", "items/rocket.png",
    "items/oiler.png", "items/flamethrower.png", "items/gold_machine_gun.png",
    "items/katana.png", "items/yamato.png", "items/gauntlet.png",
    "items/medkit.png", "items/napalm.png", "items/shockwave.png",
    "items/lightning_rod.png", "items/disco_bomb.png", "items/disposable_shield.png",
    "items/obliterator_ray.png", "items/the_button.png",
    "items/coin.png", "items/crystal.png", "items/token.png",
    # Landmarks
    "landmarks/main_shop.png", "landmarks/upgrade_shop.png", "landmarks/ally_shop.png",
]

EXPECTED_SFX = [
    "shoot.wav", "hit.wav", "jump.wav", "dash.wav", "roll.wav",
    "parry.wav", "throw.wav", "explode.wav", "purchase.wav",
    "kill.wav", "death.wav", "hurt.wav", "heal.wav", "coin.wav",
    "shield_on.wav", "game_over.wav",
]

EXPECTED_MUSIC = [
    "music_jetpack.mp3", "music_garfield.mp3",
    "music_minecraft.mp3", "music_lego.mp3",
]

# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------
_image_cache: dict[str, pygame.Surface] = {}
_sound_cache: dict[str, pygame.mixer.Sound] = {}

def _placeholder_surface(w=28, h=44, color=(220, 80, 200)) -> pygame.Surface:
    s = pygame.Surface((w, h), pygame.SRCALPHA)
    s.fill(color)
    pygame.draw.rect(s, (0, 0, 0), s.get_rect(), 1)
    return s

def _silent_sound() -> pygame.mixer.Sound | None:
    try:
        # Tiny zeroed buffer = silent sound.
        return pygame.mixer.Sound(buffer=bytes(64))
    except Exception:
        return None

def load_image(rel_path: str) -> pygame.Surface:
    if rel_path in _image_cache: return _image_cache[rel_path]
    full = os.path.join(SPRITES_DIR, rel_path)
    try:
        if os.path.exists(full):
            img = pygame.image.load(full).convert_alpha()
            _image_cache[rel_path] = img
            return img
    except Exception: pass
    img = _placeholder_surface()
    _image_cache[rel_path] = img
    return img

def load_sound(rel_name: str) -> pygame.mixer.Sound | None:
    if rel_name in _sound_cache: return _sound_cache[rel_name]
    full = os.path.join(SFX_DIR, rel_name)
    try:
        if os.path.exists(full):
            snd = pygame.mixer.Sound(full)
            _sound_cache[rel_name] = snd
            return snd
    except Exception: pass
    snd = _silent_sound()
    if snd: _sound_cache[rel_name] = snd
    return snd

# ---------------------------------------------------------------------------
# Public dicts (lazy-resolved via __getitem__-style helpers)
# ---------------------------------------------------------------------------
class _LazyDict:
    def __init__(self, expected: list[str], loader):
        self._expected = expected
        self._loader = loader
    def __getitem__(self, key: str):
        return self._loader(key)
    def __contains__(self, key: str): return key in self._expected
    def keys(self): return iter(self._expected)
    def all(self) -> dict:
        return {k: self._loader(k) for k in self._expected}

IMAGES: _LazyDict = _LazyDict(EXPECTED_SPRITES, load_image)
SOUNDS: _LazyDict = _LazyDict(EXPECTED_SFX, load_sound)

# Convenience SFX play
def play_sfx(name: str, volume: float = 1.0) -> None:
    full = name if name.endswith(('.wav', '.ogg', '.mp3')) else name + ".wav"
    s = load_sound(full)
    if s is not None:
        try:
            s.set_volume(max(0.0, min(1.0, volume)))
            s.play()
        except Exception: pass

# Music
_current_music_index = 0
def play_music(volume: float = 0.18) -> None:
    """Plays the first existing track from EXPECTED_MUSIC. Loops the playlist."""
    global _current_music_index
    if not pygame.mixer.get_init(): return
    for i in range(len(EXPECTED_MUSIC)):
        idx = (_current_music_index + i) % len(EXPECTED_MUSIC)
        path = os.path.join(MUSIC_DIR, EXPECTED_MUSIC[idx])
        if os.path.exists(path):
            try:
                pygame.mixer.music.load(path)
                pygame.mixer.music.set_volume(volume)
                pygame.mixer.music.play(-1)
                _current_music_index = (idx + 1) % len(EXPECTED_MUSIC)
                return
            except Exception: pass

def stop_music() -> None:
    if pygame.mixer.get_init(): pygame.mixer.music.stop()

def report_missing() -> dict[str, list[str]]:
    """Returns a dict listing any expected files missing from /assets."""
    return {
        "sprites": [p for p in EXPECTED_SPRITES if not os.path.exists(os.path.join(SPRITES_DIR, p))],
        "sfx":     [p for p in EXPECTED_SFX     if not os.path.exists(os.path.join(SFX_DIR, p))],
        "music":   [p for p in EXPECTED_MUSIC   if not os.path.exists(os.path.join(MUSIC_DIR, p))],
    }
