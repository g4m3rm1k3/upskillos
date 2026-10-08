import pygame

WIDTH, HEIGHT = 640, 240
STEP = 40
BACKGROUND = (24, 26, 33)
PLAYER = (250, 204, 21)


def move(x, key):
    if key == pygame.K_LEFT:
        x -= STEP
    elif key == pygame.K_RIGHT:
        x += STEP
    return max(STEP // 2, min(WIDTH - STEP // 2, x))


def run(max_frames=None):
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Q-Arcade")
    clock = pygame.time.Clock()
    x = WIDTH // 2
    frames = 0
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                x = move(x, event.key)
        screen.fill(BACKGROUND)
        pygame.draw.circle(screen, PLAYER, (x, HEIGHT // 2), STEP // 2)
        pygame.display.flip()
        clock.tick(60)
        frames += 1
        if max_frames is not None and frames >= max_frames:
            running = False
    pygame.quit()
    return frames


if __name__ == "__main__":
    run()
