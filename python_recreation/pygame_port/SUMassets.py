"""SUMassets.py — sprite + audio loader.

* Sprites are drawn procedurally with pygame.draw so the game runs without
  any external PNGs.  Drop matching files into pygame_port/assets/sprites/
  and the loader will prefer them.
* Audio synthesises beeps via numpy + pygame.sndarray.  Drop .wav/.ogg
  into pygame_port/assets/sfx/  to override.
"""
from __future__ import annotations
import os, math, pygame
try:
    import numpy as np
    HAVE_NUMPY = True
except Exception:
    HAVE_NUMPY = False

ASSETS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")

# ---------------------------------------------------------------------------
# Procedural sprite factory
# ---------------------------------------------------------------------------
def _surf(w, h, alpha=True):
    s = pygame.Surface((w, h), pygame.SRCALPHA if alpha else 0)
    return s

def make_humanoid(body, head=(255,210,170), w=28, h=44, accent=None):
    s = _surf(w, h)
    pygame.draw.rect(s, body, (4, 14, w-8, h-18), border_radius=4)        # torso
    pygame.draw.rect(s, body, (2, h-8, 8, 8))                              # left leg
    pygame.draw.rect(s, body, (w-10, h-8, 8, 8))                           # right leg
    pygame.draw.circle(s, head, (w//2, 8), 8)                              # head
    if accent: pygame.draw.rect(s, accent, (4, 14, w-8, 6))
    return s

def make_block(color, w=36, h=36, button_color=None):
    s = _surf(w, h)
    pygame.draw.rect(s, color, (0, 0, w, h), border_radius=4)
    pygame.draw.rect(s, (0,0,0,90), (0, 0, w, h), 2, border_radius=4)
    if button_color:
        pygame.draw.circle(s, button_color, (w//2, h//2), min(w, h)//4)
        pygame.draw.circle(s, (0,0,0,140), (w//2, h//2), min(w, h)//4, 2)
    return s

def make_helicopter(w=72, h=36):
    s = _surf(w, h)
    pygame.draw.ellipse(s, (60,60,70), (10, 10, w-20, h-14))
    pygame.draw.rect(s, (40,40,50), (w//2-3, 0, 6, 8))
    pygame.draw.line(s, (200,200,210), (4, 4), (w-4, 4), 2)               # rotor
    pygame.draw.rect(s, (90,180,220), (w//2-6, 14, 12, 8))                # cockpit
    return s

def make_bomb(color=(80,220,90), r=22):
    s = _surf(r*2, r*2 + 8)
    pygame.draw.circle(s, color, (r, r+6), r)
    pygame.draw.rect(s, (60,60,60), (r-3, 0, 6, 10))
    pygame.draw.circle(s, (255,200,80), (r-2, 4), 3)
    return s

class Assets:
    def __init__(self):
        self.cache: dict[str, pygame.Surface] = {}

    def _load_or(self, key, builder):
        if key in self.cache: return self.cache[key]
        path = os.path.join(ASSETS_DIR, "sprites", key + ".png")
        try:
            if os.path.exists(path):
                s = pygame.image.load(path).convert_alpha()
                self.cache[key] = s; return s
        except Exception: pass
        s = builder(); self.cache[key] = s; return s

    # Player + enemies
    def player(self):       return self._load_or("player",       lambda: make_humanoid((240,220,80), accent=(255,255,200)))
    def shooter(self):      return self._load_or("shooter",      lambda: make_humanoid((180,80,80)))
    def shanker(self):      return self._load_or("shanker",      lambda: make_humanoid((180,140,60)))
    def brute(self):        return self._load_or("brute",        lambda: make_humanoid((140,90,200), w=36, h=54))
    def necromancer(self):  return self._load_or("necromancer",  lambda: make_humanoid((30,30,40), head=(180,180,200), accent=(120,60,200)))
    def minion(self):       return self._load_or("minion",       lambda: make_humanoid((90,40,40), w=22, h=34))
    def bron(self):         return self._load_or("bron",         lambda: make_humanoid((40,40,50), head=(120,80,60), accent=(220,120,40)))
    def giant(self):        return self._load_or("giant",        lambda: make_humanoid((150,150,160), w=56, h=84))
    def apache(self):       return self._load_or("apache",       lambda: make_helicopter())
    # Allies
    def lil_one(self):      return self._load_or("lil_one",      lambda: make_humanoid((120,200,120), w=20, h=30))
    def sheriff(self):      return self._load_or("sheriff",      lambda: make_humanoid((200,160,100), accent=(220,40,40)))
    def eradidog(self):     return self._load_or("eradidog",     lambda: make_humanoid((180,120,60), w=30, h=22))
    def stalien(self):      return self._load_or("stalien",      lambda: make_humanoid((120,220,180), head=(180,255,220)))
    def dude_person(self):  return self._load_or("dude_person",  lambda: make_humanoid((100,140,220)))
    # Items / landmarks
    def the_button(self):   return self._load_or("the_button",   lambda: make_block((150,150,160), 36, 36, button_color=(220,40,40)))
    def green_bomb(self):   return self._load_or("green_bomb",   lambda: make_bomb((80,220,90), 24))
    def main_shop(self):    return self._load_or("main_shop",    lambda: make_block((90,140,220), 60, 80))
    def upgrade_shop(self): return self._load_or("upgrade_shop", lambda: make_block((180,90,220), 60, 80))
    def ally_shop(self):    return self._load_or("ally_shop",    lambda: make_block((90,220,140), 60, 80))

# ---------------------------------------------------------------------------
# Procedural audio
# ---------------------------------------------------------------------------
class Audio:
    def __init__(self):
        self.ready = False
        self.cache: dict[str, pygame.mixer.Sound] = {}
        self.sfx_vol = 0.55
        self.music_vol = 0.18
        try:
            pygame.mixer.pre_init(44100, -16, 2, 512)
            pygame.mixer.init()
            self.ready = True
        except Exception:
            self.ready = False

    def _tone(self, freq=440.0, dur=0.08, kind="sine", vol=0.5):
        if not self.ready or not HAVE_NUMPY: return None
        sr = 44100; n = int(sr * dur)
        t = np.linspace(0, dur, n, endpoint=False)
        if kind == "square":  wave = np.sign(np.sin(2*np.pi*freq*t))
        elif kind == "noise": wave = np.random.uniform(-1, 1, n)
        elif kind == "saw":   wave = 2*(t*freq - np.floor(0.5 + t*freq))
        else:                 wave = np.sin(2*np.pi*freq*t)
        env = np.linspace(1.0, 0.0, n) ** 1.5
        wave = (wave * env * vol * 32767).astype(np.int16)
        stereo = np.repeat(wave[:, None], 2, axis=1)
        snd = pygame.sndarray.make_sound(np.ascontiguousarray(stereo))
        snd.set_volume(self.sfx_vol)
        return snd

    def _get(self, key, builder):
        if key in self.cache: return self.cache[key]
        path_w = os.path.join(ASSETS_DIR, "sfx", key + ".wav")
        path_o = os.path.join(ASSETS_DIR, "sfx", key + ".ogg")
        try:
            if os.path.exists(path_w):
                s = pygame.mixer.Sound(path_w); self.cache[key] = s; return s
            if os.path.exists(path_o):
                s = pygame.mixer.Sound(path_o); self.cache[key] = s; return s
        except Exception: pass
        s = builder()
        if s: self.cache[key] = s
        return s

    def play(self, key):
        if not self.ready: return
        builders = {
            "shoot":    lambda: self._tone(880, 0.06, "square", 0.4),
            "hit":      lambda: self._tone(220, 0.05, "noise", 0.5),
            "jump":     lambda: self._tone(520, 0.10, "sine", 0.4),
            "dash":     lambda: self._tone(700, 0.12, "saw",  0.4),
            "roll":     lambda: self._tone(360, 0.10, "saw",  0.35),
            "parry":    lambda: self._tone(1200, 0.08,"square",0.5),
            "throw":    lambda: self._tone(440, 0.08, "sine", 0.4),
            "explode":  lambda: self._tone(110, 0.30, "noise", 0.7),
            "purchase": lambda: self._tone(660, 0.18, "sine", 0.5),
            "coin":     lambda: self._tone(990, 0.05, "square",0.4),
            "heal":     lambda: self._tone(770, 0.18, "sine", 0.45),
            "shield_on":lambda: self._tone(330, 0.20, "square",0.4),
            "overdrive":lambda: self._tone(150, 0.40, "saw",  0.55),
            "hurt":     lambda: self._tone(180, 0.10, "saw",  0.55),
            "death":    lambda: self._tone(90,  0.40, "noise", 0.7),
            "game_over":lambda: self._tone(70,  0.80, "saw",  0.6),
        }
        s = self._get(key, builders.get(key, lambda: self._tone()))
        if s: s.set_volume(self.sfx_vol); s.play()

    def set_sfx_volume(self, v):  self.sfx_vol = max(0.0, min(1.0, v))
    def set_music_volume(self, v):
        self.music_vol = max(0.0, min(1.0, v))
        if self.ready: pygame.mixer.music.set_volume(self.music_vol)

audio = Audio()
assets = Assets()
