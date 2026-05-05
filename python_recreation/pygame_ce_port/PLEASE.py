"""PLEASE.py — Entry point for the Pygame CE port.

Run:
    cd python_recreation/pygame_ce_port
    pip install -r requirements.txt
    python PLEASE.py
"""
import os, sys, pygame

# Make sibling imports (BE, DA, data.*) work when run as a script.
HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path: sys.path.insert(0, HERE)

from data.constants import SCREEN_W, SCREEN_H, FULLSCREEN, FPS_TARGET
from data.save import load_save, write_save
import BE
import DA


def main() -> None:
    pygame.init()
    pygame.display.set_caption("Path of the Undying Tidal Cardinality — Pygame CE Port")
    save = load_save()
    use_fullscreen = FULLSCREEN or save.get("settings", {}).get("fullscreen", False)
    flags = pygame.FULLSCREEN if use_fullscreen else 0
    screen = pygame.display.set_mode((SCREEN_W, SCREEN_H), flags)
    clock = pygame.time.Clock()

    # Report missing assets so the user knows what to provide.
    missing = DA.report_missing()
    total_missing = sum(len(v) for v in missing.values())
    if total_missing:
        print(f"[DA] {total_missing} expected asset files missing under /assets — placeholders will be used.")

    game = BE.Game(screen, save)
    game.start()

    running = True
    while running:
        dt = clock.tick(FPS_TARGET) / 1000.0
        events = pygame.event.get()
        # Global hotkeys
        for e in events:
            if e.type == pygame.QUIT:
                running = False
            elif e.type == pygame.KEYDOWN and e.key == pygame.K_F11:
                flags ^= pygame.FULLSCREEN
                screen = pygame.display.set_mode((SCREEN_W, SCREEN_H), flags)
                game.screen = screen
                save["settings"]["fullscreen"] = bool(flags & pygame.FULLSCREEN)
        if not game.handle_events(events): running = False
        game.update(dt)
        game.draw()
        pygame.display.flip()

    write_save(game.save)
    DA.stop_music()
    pygame.quit()


if __name__ == "__main__":
    main()
