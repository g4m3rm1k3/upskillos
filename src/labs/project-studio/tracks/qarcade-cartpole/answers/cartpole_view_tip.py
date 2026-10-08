import math

WIDTH, HEIGHT = 640, 320
SCALE = 100
TRACK_Y = 240
POLE_PIXELS = 100


def to_pixels(x):
    return int(WIDTH / 2 + x * SCALE)


def pole_tip(base, theta, length=POLE_PIXELS):
    bx, by = base
    return (bx + length * math.sin(theta), by - length * math.cos(theta))
