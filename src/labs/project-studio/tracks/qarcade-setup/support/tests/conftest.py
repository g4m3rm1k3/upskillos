# pytest runs this file before any test in this folder.
# SDL is the library pygame is built on. Its "dummy" drivers make a window that
# exists only in memory and a sound device that plays nothing, so tests can run
# a game loop without a screen, and without waiting for real audio to start.
import os

os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")
