"""CodeLens's pygame stand-in: runs a game without a window, on scripted input.

A traced program can't have a live window: CodeLens records the whole run first and the
learner steps through it afterwards. So when a program imports pygame, it gets the real
library (pygame-ce: surfaces, drawing, Rect, fonts all work as usual) with five things
replaced:

  window    pygame.display.set_mode() gives an ordinary Surface the size of the window.
            Every flip() or update() saves a picture of it: frame 0, 1, 2, ...
  events    pygame.event.get() returns the events scripted in the Input box
            (src/labs/codelens/codelens/scriptedInput.ts): "@frame 3 key right" is in the
            queue once the program is drawing frame 3.
  keyboard  pygame.key.get_pressed() and pygame.mouse.get_pos()/get_pressed() report
            the state those events leave behind: a key is held from its KEYDOWN to its KEYUP.
  clock     pygame.time.Clock().tick(60) doesn't sleep. It advances a pretend clock by
            1000/60 ms and returns that, so every run takes the same steps and the trace
            doesn't wait for real time.
  quit      If the script has no "@frame N quit", a QUIT event arrives one frame after the
            last scripted event (frame 60 if there are none), so a game loop ends.

Two ways of providing the window:
  - desktop CPython: real pygame display with SDL's "dummy" video driver (no window
    appears). Everything works, including Surface.convert().
  - Pyodide in the browser: pygame's display can't start there, so the window is a plain
    Surface. Drawing, Rect, fonts and images work; convert()/convert_alpha() need a real
    display, so here they return a copy.

Each trace event is annotated (annotate()) with the picture on screen at that step and the
events the program just received; the pictures go into the result's `frames`.
"""

import base64
import hashlib
import os
import struct
import sys
import zlib

MAX_FRAMES = 600            # pictures kept; later flips still count, but aren't saved
MAX_PICTURE_WIDTH = 800     # pictures are scaled down to this width at most (small text stays readable)
AUTO_QUIT_FRAME = 60        # when nothing is scripted at all

_ORIGINALS = {}
_STATE = None
_KEY_ALIASES = {'enter': 'return', 'esc': 'escape', 'spacebar': 'space', 'ctrl': 'lctrl', 'shift': 'lshift', 'alt': 'lalt'}


def _png(width, height, rgb):
    """A PNG file of RGB pixels: zlib is all it needs, so it works in Pyodide too."""
    stride = width * 3
    raw = b''.join(b'\x00' + rgb[y * stride:(y + 1) * stride] for y in range(height))

    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)

    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 6))
            + chunk(b'IEND', b''))


class _Pressed:
    """What pygame.key.get_pressed() returns: index it with a key constant."""

    def __init__(self, held, names):
        self.held = frozenset(held)
        self.names = names   # key code -> the name used in the Input box, for display

    def __getitem__(self, key):
        return key in self.held

    def __len__(self):
        return 512

    def __iter__(self):
        return (index in self.held for index in range(512))

    def __repr__(self):
        # Key codes are large numbers (→ is 1073741903); show the names instead.
        held = ', '.join(sorted(self.names.get(code, str(code)) for code in self.held))
        return f'<keys held: {held or "none"}>'


class Screen:
    def __init__(self, pygame, tracer, events, real_display):
        self.pg = pygame
        self.tracer = tracer
        self.real_display = real_display
        self.surface = None
        self.frame = 0             # the picture being drawn now
        self.time_ms = 0           # the pretend clock
        self.frames = []           # saved pictures: {frame, timeMs, png}
        self.picture_for_frame = []  # index into self.frames for each flipped frame
        self.last_hash = None
        self.key_names = {}          # key code -> name, for showing which keys are held
        self.pending =[self.make_event(item) for item in events]
        last = max((item['frame'] for item in events), default=None)
        if not any(item['type'] == 'quit' for item in events):
            quit_frame = AUTO_QUIT_FRAME if last is None else last + 1
            self.pending.append((quit_frame, pygame.event.Event(pygame.QUIT, {'codelens_auto': True}), 'quit (automatic)'))
        self.queue = []            # arrived, not yet taken by event.get()
        self.received = []         # descriptions of events taken since the previous trace event
        self.held = set()
        self.mouse_pos = (0, 0)
        self.mouse_buttons = [False, False, False]

    # ── scripted events ─────────────────────────────────────────────────────

    def key_code(self, name):
        name = _KEY_ALIASES.get(name, name)
        for attr in (f'K_{name}', f'K_{name.upper()}', f'K_{name.lower()}'):
            if hasattr(self.pg, attr):
                return getattr(self.pg, attr)
        raise ValueError(f'CodeLens Input box: pygame has no key called "{name}" (try right, space, a, return, escape)')

    def make_event(self, item):
        pg = self.pg
        kind = item['type']
        if kind in ('keydown', 'keyup'):
            code = self.key_code(item['key'])
            self.key_names[code] = item['key']
            unicode = item['key'] if len(item['key']) == 1 else (' ' if item['key'] == 'space' else '')
            event = pg.event.Event(pg.KEYDOWN if kind == 'keydown' else pg.KEYUP, {'key': code, 'mod': 0, 'unicode': unicode, 'scancode': 0})
            return item['frame'], event, f"{kind.upper()} {item['key']}"
        if kind in ('mousedown', 'mouseup'):
            pos = tuple(int(v) for v in item['pos'])
            event = pg.event.Event(pg.MOUSEBUTTONDOWN if kind == 'mousedown' else pg.MOUSEBUTTONUP, {'pos': pos, 'button': item.get('button', 1)})
            return item['frame'], event, f"{'MOUSEBUTTONDOWN' if kind == 'mousedown' else 'MOUSEBUTTONUP'} at {pos}"
        if kind == 'mousemotion':
            pos = tuple(int(v) for v in item['pos'])
            return item['frame'], pg.event.Event(pg.MOUSEMOTION, {'pos': pos, 'rel': (0, 0), 'buttons': (0, 0, 0)}), f'MOUSEMOTION to {pos}'
        return item['frame'], pg.event.Event(pg.QUIT, {}), 'QUIT'

    def arrive(self):
        """Move events due by the current frame into the queue, updating what's held."""
        pg = self.pg
        while self.pending and self.pending[0][0] <= self.frame:
            _, event, label = self.pending.pop(0)
            if event.type == pg.KEYDOWN:
                self.held.add(event.key)
            elif event.type == pg.KEYUP:
                self.held.discard(event.key)
            elif event.type == pg.MOUSEMOTION:
                event.rel = (event.pos[0] - self.mouse_pos[0], event.pos[1] - self.mouse_pos[1])
                self.mouse_pos = event.pos
            elif event.type in (pg.MOUSEBUTTONDOWN, pg.MOUSEBUTTONUP):
                self.mouse_pos = event.pos
                if 1 <= event.button <= 3:
                    self.mouse_buttons[event.button - 1] = event.type == pg.MOUSEBUTTONDOWN
            self.queue.append((event, label))

    def take(self, eventtype=None, exclude=None):
        self.arrive()
        wanted = None if eventtype is None else set(eventtype if isinstance(eventtype, (list, tuple, set)) else [eventtype])
        unwanted = set() if exclude is None else set(exclude if isinstance(exclude, (list, tuple, set)) else [exclude])
        taken, kept = [], []
        for event, label in self.queue:
            if (wanted is None or event.type in wanted) and event.type not in unwanted:
                taken.append(event)
                self.received.append(label)
            else:
                kept.append((event, label))
        self.queue = kept
        return taken

    # ── pictures ────────────────────────────────────────────────────────────

    def flip(self):
        pg = self.pg
        if self.surface is not None and len(self.frames) < MAX_FRAMES:
            picture = self.surface
            width, height = picture.get_size()
            if width > MAX_PICTURE_WIDTH:
                height = max(1, round(height * MAX_PICTURE_WIDTH / width))
                width = MAX_PICTURE_WIDTH
                picture = pg.transform.scale(picture, (width, height))
            to_bytes = getattr(pg.image, 'tobytes', None) or pg.image.tostring
            rgb = to_bytes(picture, 'RGB')
            digest = hashlib.sha1(rgb).digest()
            if digest != self.last_hash:   # an unchanged picture reuses the previous one
                self.last_hash = digest
                self.frames.append({'frame': self.frame, 'timeMs': self.time_ms, 'width': width, 'height': height,
                                    'png': base64.b64encode(_png(width, height, rgb)).decode('ascii')})
        self.picture_for_frame.append(len(self.frames) - 1 if self.frames else None)
        self.frame += 1

    def annotate(self, event):
        """Called by the tracer for every trace event."""
        event['gameFrame'] = self.frame
        if self.picture_for_frame and self.picture_for_frame[-1] is not None:
            event['screen'] = self.picture_for_frame[-1]
        if self.received:
            event['gameEvents'] = self.received
            self.received = []


def _patch(module, name, replacement):
    _ORIGINALS.setdefault((module, name), getattr(module, name, None))
    setattr(module, name, replacement)


def prepare():
    """Settings pygame reads when it is first imported, so call this before that."""
    if sys.platform != 'emscripten':
        # No window, no sound card: SDL's dummy drivers.
        os.environ.setdefault('SDL_VIDEODRIVER', 'dummy')
        os.environ.setdefault('SDL_AUDIODRIVER', 'dummy')
    os.environ.setdefault('PYGAME_HIDE_SUPPORT_PROMPT', '1')   # no "Hello from the pygame community" line


def install(tracer, events):
    global _STATE
    in_browser = sys.platform == 'emscripten'
    prepare()
    import pygame as pg

    real_display = not in_browser
    screen = Screen(pg, tracer, events, real_display)
    _STATE = screen
    tracer.screen = screen
    originals = {name: getattr(pg.display, name) for name in ('set_mode', 'init')}
    real_init = pg.init

    def init():
        if real_display:
            return real_init()
        for part in ('font',):   # what works in the browser without a display
            try:
                getattr(pg, part).init()
            except Exception:
                pass
        return (1, 0)

    def set_mode(size=(0, 0), flags=0, *args, **kwargs):
        size = tuple(int(v) for v in size) if size and tuple(size) != (0, 0) else (640, 480)
        if real_display:
            originals['init']()
            screen.surface = originals['set_mode'](size, flags, *args, **kwargs)
        else:
            screen.surface = pg.Surface(size)
        return screen.surface

    def flip():
        screen.flip()

    def update(*_rects):
        screen.flip()

    caption = ['pygame window']

    _patch(pg, 'init', init)
    _patch(pg, 'quit', lambda: None)   # the window "closes"; the pictures stay
    _patch(pg.display, 'set_mode', set_mode)
    _patch(pg.display, 'get_surface', lambda: screen.surface)
    _patch(pg.display, 'flip', flip)
    _patch(pg.display, 'update', update)
    _patch(pg.display, 'set_caption', lambda title, icontitle=None: caption.__setitem__(0, title))
    _patch(pg.display, 'get_caption', lambda: (caption[0], caption[0]))
    if not real_display:
        _patch(pg.display, 'init', lambda: None)
        _patch(pg.display, 'quit', lambda: None)
        _patch(pg.display, 'get_init', lambda: True)
        _patch(pg.display, 'set_icon', lambda surface: None)

    _patch(pg.event, 'get', lambda eventtype=None, pump=True, exclude=None: screen.take(eventtype, exclude))
    _patch(pg.event, 'pump', lambda: screen.arrive())

    def poll():
        taken = screen.take()
        if not taken:
            return pg.event.Event(pg.NOEVENT, {})
        # Put back all but the first.
        screen.queue[:0] = [(event, f'event {pg.event.event_name(event.type)}') for event in taken[1:]]
        screen.received[1:] = []
        return taken[0]

    def wait(timeout=0):
        # Waiting lets time pass: move to the frame of the next scripted event.
        screen.arrive()
        if not screen.queue and screen.pending:
            screen.frame = max(screen.frame, screen.pending[0][0])
        return poll()

    def post(event):
        screen.queue.append((event, f'posted {pg.event.event_name(event.type)}'))
        return True

    def clear(eventtype=None, pump=True):
        screen.take(eventtype)

    def peek(eventtype=None, pump=True):
        screen.arrive()
        if eventtype is None:
            return bool(screen.queue)
        wanted = set(eventtype if isinstance(eventtype, (list, tuple, set)) else [eventtype])
        return any(event.type in wanted for event, _ in screen.queue)

    _patch(pg.event, 'poll', poll)
    _patch(pg.event, 'wait', wait)
    _patch(pg.event, 'post', post)
    _patch(pg.event, 'clear', clear)
    _patch(pg.event, 'peek', peek)

    def get_pressed():
        screen.arrive()
        return _Pressed(screen.held, screen.key_names)

    _patch(pg.key, 'get_pressed', get_pressed)
    _patch(pg.key, 'get_mods', lambda: 0)
    _patch(pg.mouse, 'get_pos', lambda: (screen.arrive(), screen.mouse_pos)[1])
    _patch(pg.mouse, 'get_pressed', lambda num_buttons=3, desktop=False: (screen.arrive(), tuple(screen.mouse_buttons) + ((False, False) if num_buttons == 5 else ()))[1])
    _patch(pg.mouse, 'set_visible', lambda visible: True)

    class Clock:
        """pygame.time.Clock on the pretend clock: tick() never sleeps."""

        def __init__(self):
            self.last = 0
            self.fps = 0.0

        def tick(self, framerate=0):
            step = round(1000 / framerate) if framerate else 16
            screen.time_ms += step
            self.last = step
            self.fps = 1000 / step
            return step

        tick_busy_loop = tick

        def get_time(self):
            return self.last

        get_rawtime = get_time

        def get_fps(self):
            return self.fps

        def __repr__(self):
            return f'<Clock(fps={self.fps:.2f})>'   # as pygame-ce shows its own Clock

    # Shown as pygame.time.Clock, not as this stand-in's internals.
    Clock.__module__, Clock.__qualname__ = 'pygame.time', 'Clock'

    def delay(ms):
        screen.time_ms += int(ms)
        return int(ms)

    _patch(pg.time, 'Clock', Clock)
    _patch(pg.time, 'get_ticks', lambda: screen.time_ms)
    _patch(pg.time, 'delay', delay)
    _patch(pg.time, 'wait', delay)

    if not real_display:
        # convert() needs a display mode, which the browser can't provide: a copy keeps the
        # pixels the same.
        surface_class = pg.Surface
        try:
            surface_class.convert(surface_class((1, 1)))
        except Exception:
            class Surface(surface_class):
                def convert(self, *args):
                    return self.copy()

                def convert_alpha(self, *args):
                    return self.copy()
            _patch(pg, 'Surface', Surface)
    return screen


def uninstall():
    global _STATE
    for (module, name), original in _ORIGINALS.items():
        if original is None:
            try:
                delattr(module, name)
            except AttributeError:
                pass
        else:
            setattr(module, name, original)
    _ORIGINALS.clear()
    _STATE = None
