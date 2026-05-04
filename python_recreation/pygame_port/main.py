"""
main.py — Entry point for the Pygame CE port of
"Path of the Undying Tidal Cardinality".

Run from the python_recreation directory:
    python -m pygame_port.main
or directly:
    python pygame_port/main.py

Requires:  pygame-ce >= 2.5,  numpy
"""
import sys, os, pygame

# Allow direct script execution
if __package__ in (None, ""):
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pygame_port.data.constants import SCREEN_W, SCREEN_H, FPS_TARGET
from pygame_port.data.save import load_save, write_save
from pygame_port.PleaseBeDaOne import Game


def main() -> None:
    pygame.init()
    pygame.display.set_caption("Path of the Undying Tidal Cardinality — Pygame CE Port")
    save = load_save()
    flags = pygame.FULLSCREEN if save.get("settings", {}).get("fullscreen") else 0
    screen = pygame.display.set_mode((SCREEN_W, SCREEN_H), flags)
    clock = pygame.time.Clock()

    game = Game(screen, save)
    game.start()

    running = True
    while running:
        dt = clock.tick(FPS_TARGET) / 1000.0
        events = pygame.event.get()
        for e in events:
            if e.type == pygame.QUIT:
                running = False
            elif e.type == pygame.KEYDOWN and e.key == pygame.K_F11:
                flags ^= pygame.FULLSCREEN
                screen = pygame.display.set_mode((SCREEN_W, SCREEN_H), flags)
                game.screen = screen
                save["settings"]["fullscreen"] = bool(flags & pygame.FULLSCREEN)
                write_save(save)
        if not game.handle_events(events):
            running = False
        game.update(dt)
        game.draw()
        pygame.display.flip()

    write_save(game.save)
    pygame.quit()


if __name__ == "__main__":
    main()
