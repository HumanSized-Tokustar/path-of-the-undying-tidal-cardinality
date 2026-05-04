"""Physics, spawn, and difficulty constants ported 1:1 from src/game/engine.ts."""

# --- Display ---
SCREEN_W = 1280
SCREEN_H = 720
FPS_TARGET = 60
GROUND_Y = SCREEN_H - 120  # baseline ground in pixels
PIXELS_PER_METER = 32       # world scaling

# --- Player physics (from engine.ts) ---
GRAVITY = 1900.0           # px/s^2
JUMP_VEL = 720.0           # px/s
PLAYER_BASE_MS = 9.2       # m/s base move speed
PLAYER_MAX_MS = 26.0       # m/s hard cap
PLAYER_ACCEL = 90.0        # m/s^2
PLAYER_FRICTION = 0.0008   # exponential per second (vel *= friction**dt)
COYOTE_TIME = 0.12         # seconds
JUMP_BUFFER = 0.12         # seconds
DASH_IMPULSE = 22.0        # m/s
DASH_IFRAMES = 0.18
DASH_COOLDOWN = 0.85
ROLL_IMPULSE = 14.0
ROLL_COOLDOWN = 0.7
PARRY_WINDOW = 0.18
PARRY_COOLDOWN = 0.6
EXTRA_DASHES_MAX = 1       # +1 from upgrade shop
EXTRA_REVIVES_MAX = 2

# --- Player baseline stats ---
PLAYER_MAX_HP_BASE = 100
PLAYER_MAX_HP_CAP = 600    # +500 from upgrades
LIFESTEAL_KILL_INTERVAL = 8
LIFESTEAL_HEAL = 10

# --- Wave / spawn rules ---
WAVE_INTERVAL = 5.0        # seconds between waves
WAVE_BASE_COUNT = 5        # enemies per wave at start
WAVE_DISTANCE_STEP = 666   # meters between +6 enemy increases
WAVE_INCREMENT = 6
TIDE_RISES_EVERY = 5       # show "(THE TIDE RISES)" each Nth increase
SAFE_RADIUS_M = 9          # meters around landmarks

DIFFICULTY_TABLE = {
    "DUNCE":   {"cap": 7,  "spawn_mult": 1.0},
    "ALRIGHT": {"cap": 15, "spawn_mult": 1.0},
    "SON":     {"cap": 40, "spawn_mult": 2.0},
}

# --- Landmark intervals ---
MAIN_SHOP_EVERY_M = 1234
ALLY_SHOP_EVERY_M = 1667
# Upgrade shop spawns adjacent to main shop (offset)
UPGRADE_SHOP_OFFSET_M = 30

# --- Enemy unlock gates ---
NECRO_MIN_M = 2000          # ALRIGHT+ only
SON_HEAVY_MIN_M = 1700      # Bron, Giant, Apache (SON only)

# --- Combat ---
MELEE_DAMAGE_MULT = 100.0   # near-instakill melee per spec

# --- Shop / item ---
THE_BUTTON_COST = 10000
THE_BUTTON_DAMAGE = 900
THE_BUTTON_RADIUS = 180     # pixels
DISCO_BOMB_DURATION = 5.0   # seconds, enemies jump-only & cannot attack
LIL_ONE_PURCHASE_LIMIT = None  # uncapped
