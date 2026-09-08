// pyside6 — Building a Godot-Like Editor — Lesson 1: Pygame Draws to
// Memory, Qt Draws to the Screen
//
// First lesson of a multi-lesson project: a PySide6 application with a
// pygame-rendered viewport, laid out like a game engine's editor (Godot,
// Unity) — dockable panels, a scene tree, an inspector, and a live
// viewport in the middle. This lesson solves the one problem every later
// lesson depends on: pygame and Qt each want to own "the window." Getting
// pygame's pixels onto a Qt widget without either fighting the other is
// the seed the whole editor grows from.
//
// Content follows docs/Schema.md's rigor: every meaningful construct in
// the code gets a real explanation (not a summary), the trap is
// introduced only after the normal rule is established, and the
// exercises are predict/modify/break/trace tasks, not "run the code."

export default {
  id: 'pyside6-002-pygame-surface-to-qimage',
  slug: 'pygame-surface-to-qimage',
  chapter: 2,
  order: 1,
  title: 'Pygame Draws to Memory, Qt Draws to the Screen',
  subtitle: 'Building a Godot-Like Editor',
  tags: ['pyside6', 'pygame', 'qimage', 'qpainter', 'qtimer', 'godot'],

  hook: {
    question: 'Pygame wants to own a window. PySide6 wants to own the window. Can they both get what they want?',
    realWorldContext: 'This is the first lesson of a project: a PySide6 application laid out like a game engine editor — Godot, Unity, Unreal — with a live viewport, a scene tree, and an inspector panel, all inside one window. Every one of those tools solves the same underlying problem this lesson solves: the thing that actually simulates and draws the game (a physics/rendering engine) is a completely different piece of software from the thing that draws the editor\'s UI chrome around it (menus, panels, docks). Pygame is normally both a drawing library AND a window-and-event-loop library at once — for this project, only its drawing half gets used. Today\'s smallest possible version: get one pygame-drawn shape to appear, and then animate, inside a real PySide6 widget, with no second window anywhere.',
    previewVisualizationId: 'PySideNotebook',
  },

  intuition: {
    prose: [
      'A `pygame.Surface` is not a window. It is a rectangular block of memory holding one color value per pixel — width times height pixels, each with a red, green, and blue byte. Pygame\'s drawing functions (`pygame.draw.circle`, `.fill`, and the rest) all do the same thing: they read and overwrite bytes inside a Surface you hand them. None of that requires a window to exist anywhere. A window only enters the picture when something takes a Surface\'s bytes and asks the operating system to display them on screen.',
      'PySide6\'s `QWidget` is the thing in this project that actually owns a window and talks to the operating system\'s window manager. A `QWidget` becomes visible pixel-by-pixel through a method called `paintEvent`, which Qt calls automatically whenever it decides the widget needs to be redrawn — when it\'s first shown, when it\'s resized, or whenever your own code calls `.update()` to ask for a fresh repaint. Inside `paintEvent`, a `QPainter` object is Qt\'s tool for actually placing pixels: lines, shapes, text, or — the one operation this lesson needs — an entire pre-made image at once, via `drawImage`.',
      'The bridge between the two: draw onto a pygame Surface using ordinary pygame calls, pull the Surface\'s raw pixel bytes out with `pygame.image.tostring`, wrap those same bytes in a `QImage` (Qt\'s own in-memory pixel buffer, structurally the same idea as a Surface but Qt\'s version of it), and hand that `QImage` to a `QPainter` inside `paintEvent`. No pixel is copied more than once, and neither library ever creates a window the other doesn\'t know about.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Objects and Methods Used',
        body: '- **`pygame.Surface((w, h))`** — allocates a block of memory for `w * h` pixels and returns an object representing it. Takes a `(width, height)` tuple, not two separate arguments. Constructing one does **not** open a window, register anything with the operating system, or run any event loop — it is pure memory allocation, nothing else.\n- **`surface.fill(color)`** — overwrites every pixel in the Surface with one RGB color, given as a `(r, g, b)` tuple of `0`-`255` integers. Used here to clear the previous frame before drawing the new one; without it, each new circle would draw on top of the last one\'s leftover pixels.\n- **`pygame.draw.circle(surface, color, center, radius)`** — writes a filled circle\'s pixels directly into `surface`\'s memory. `center` is an `(x, y)` tuple in pixel coordinates from the Surface\'s top-left corner; `radius` is a plain integer. This function returns a `Rect` describing the area it touched, which this lesson\'s code does not use and does not need to.\n- **`pygame.image.tostring(surface, "RGB")`** — reads every pixel out of `surface` and returns them as one Python `bytes` object, three bytes per pixel (red, green, blue, in that order), row by row from top to bottom. The string `"RGB"` argument is not a filename or a label — it is pygame\'s format specifier telling it exactly which byte order and channel count to emit, because pygame Surfaces can internally store pixels in more than one layout.\n- **`QImage(data, w, h, QImage.Format.Format_RGB888)`** — constructs a Qt image directly from raw bytes, with no decoding step (this is not reading a `.png` or `.jpg` — it is telling Qt "these exact bytes are already pixels, arranged like this"). `Format_RGB888` specifies 3 bytes per pixel in red-green-blue order with no gap between pixels and no alpha channel — this must match `pygame.image.tostring`\'s `"RGB"` output exactly, or the image renders with wrong or shifted colors because Qt would be slicing the same byte stream into pixels at the wrong boundaries.\n- **`QPainter(self)`** — constructed inside `paintEvent`, with the widget itself (`self`) as the argument, meaning "I am about to paint onto this specific widget." Qt only permits a `QPainter` to target a widget from inside that widget\'s own `paintEvent` — constructing one at any other time raises a runtime warning and paints nothing.\n- **`painter.drawImage(x, y, image)`** — copies every pixel of `image` onto the widget starting at position `(x, y)`. This is the one call in this lesson that actually causes anything to become visible on screen.\n- **`painter.end()`** — explicitly closes the painting operation. Without it, the `QPainter` would still release its resources automatically when the Python object is garbage-collected, but leaving painting open past the end of `paintEvent` risks Qt reusing the same widget for something else while a stale painter still thinks it owns it — calling `end()` explicitly removes that ambiguity rather than relying on garbage-collection timing.\n- **`QTimer()` / `timer.timeout.connect(fn)` / `timer.start(ms)`** — `QTimer` is an object that, once started, asks Qt\'s event loop to call a function on a repeating schedule. `.timeout.connect(fn)` registers which function runs each time the timer fires — this is PySide6\'s **signal/slot** mechanism: `timeout` is a signal the timer emits on schedule, and `connect` attaches your function as the thing that runs in response, with no direct call from your code to `fn` anywhere. `.start(16)` begins the schedule, firing roughly every 16 milliseconds — approximately 60 times per second, since `1000ms / 60 ≈ 16.67ms`.',
      },
    ],
    visualizations: [
      {
        id: 'PySideNotebook',
        title: 'Hands-On: Pygame Inside a Qt Widget',
        caption: 'One editor, three small steps — type each step yourself; a clean run auto-advances to the next step without losing what you typed.',
        props: {
          filename: 'lesson.py',
          steps: [
            {
              id: 1,
              cellTitle: 'Step 1 — Get Pygame Pixels Onto the Qt Window (No Shape Yet)',
              prose: [
                'Predict before typing: this step fills the pygame Surface with one solid color and paints it — no shape, no animation, nothing else. What do you expect the window to show: a solid colored rectangle, a blank white window, or an error?',
                'Type this fully before running it. Every construct here — pygame.Surface, surface.fill, pygame.image.tostring, QImage, QPainter, drawImage, painter.end() — is explained in the "Objects and Methods Used" callout above. This one step is the entire pygame-to-Qt bridge; Steps 2 and 3 only add to it, they never replace any of it. Run it once you\'ve typed it — a clean run automatically reveals Step 2 below, and what you typed stays right where it is.',
              ],
              solution: 'import sys\nimport pygame\nfrom PySide6.QtWidgets import QApplication, QWidget\nfrom PySide6.QtGui import QImage, QPainter\n\npygame.init()\nsurface = pygame.Surface((400, 300))\n\nclass Viewport(QWidget):\n    def __init__(self):\n        super().__init__()\n        self.setWindowTitle("Step 1: Just a Color")\n        self.resize(400, 300)\n\n    def paintEvent(self, event):\n        surface.fill((20, 20, 30))\n\n        w, h = surface.get_size()\n        data = pygame.image.tostring(surface, "RGB")\n        qimg = QImage(data, w, h, QImage.Format.Format_RGB888)\n\n        painter = QPainter(self)\n        painter.drawImage(0, 0, qimg)\n        painter.end()\n\napp = QApplication(sys.argv)\nwindow = Viewport()\nwindow.show()\nsys.exit(app.exec())\n',
            },
            {
              id: 2,
              cellTitle: 'Step 2 — Add One Shape',
              prose: [
                'What changed from Step 1: exactly one new line, `pygame.draw.circle(surface, (255, 100, 50), (200, 150), 40)`, inserted between `surface.fill(...)` and the conversion to `QImage`. What did not change: the QWidget subclass, the QImage/QPainter conversion, QApplication, `.show()`, and `app.exec()` are byte-for-byte identical to Step 1 — your code from Step 1 is still sitting in the editor below; just add this one line in the right place, you don\'t need to retype anything.',
                'Predict before running: at what pixel position will the circle\'s center land, and why does it have to be drawn before `pygame.image.tostring`, not after?',
              ],
              solution: 'import sys\nimport pygame\nfrom PySide6.QtWidgets import QApplication, QWidget\nfrom PySide6.QtGui import QImage, QPainter\n\npygame.init()\nsurface = pygame.Surface((400, 300))\n\nclass Viewport(QWidget):\n    def __init__(self):\n        super().__init__()\n        self.setWindowTitle("Step 2: One Shape")\n        self.resize(400, 300)\n\n    def paintEvent(self, event):\n        surface.fill((20, 20, 30))\n        pygame.draw.circle(surface, (255, 100, 50), (200, 150), 40)\n\n        w, h = surface.get_size()\n        data = pygame.image.tostring(surface, "RGB")\n        qimg = QImage(data, w, h, QImage.Format.Format_RGB888)\n\n        painter = QPainter(self)\n        painter.drawImage(0, 0, qimg)\n        painter.end()\n\napp = QApplication(sys.argv)\nwindow = Viewport()\nwindow.show()\nsys.exit(app.exec())\n',
            },
            {
              id: 3,
              cellTitle: 'Step 3 — Make It Move',
              prose: [
                'What changed from Step 2: the circle\'s x position now reads `200 + int(100 * math.cos(self.angle))` instead of the fixed `200`, and three new pieces appear after `window.show()` — a `tick()` function that advances `self.angle` and calls `self.update()`, a `QTimer`, and `timer.start(16)` to run `tick()` on a schedule. What did not change: `paintEvent`\'s own structure (fill, draw, convert, paint) is identical to Step 2 except that one number becoming an expression — it still has no idea whether it is being called once or sixty times a second.',
                'This is the project artifact for this lesson: a QWidget that redraws a pygame scene on a schedule is the viewport panel every later lesson\'s editor layout will dock other panels around.',
              ],
              solution: 'import sys, math\nimport pygame\nfrom PySide6.QtWidgets import QApplication, QWidget\nfrom PySide6.QtGui import QImage, QPainter\nfrom PySide6.QtCore import QTimer\n\npygame.init()\nsurface = pygame.Surface((400, 300))\n\nclass Viewport(QWidget):\n    def __init__(self):\n        super().__init__()\n        self.setWindowTitle("Step 3: Animated")\n        self.resize(400, 300)\n        self.angle = 0.0\n\n    def paintEvent(self, event):\n        surface.fill((20, 20, 30))\n        x = 200 + int(100 * math.cos(self.angle))\n        pygame.draw.circle(surface, (255, 100, 50), (x, 150), 30)\n\n        w, h = surface.get_size()\n        data = pygame.image.tostring(surface, "RGB")\n        qimg = QImage(data, w, h, QImage.Format.Format_RGB888)\n\n        painter = QPainter(self)\n        painter.drawImage(0, 0, qimg)\n        painter.end()\n\napp = QApplication(sys.argv)\nwindow = Viewport()\nwindow.show()\n\ndef tick():\n    window.angle += 0.05\n    window.update()\n\ntimer = QTimer()\ntimer.timeout.connect(tick)\ntimer.start(16)\n\nsys.exit(app.exec())\n',
            },
          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: {
    prose: [
      'Byte layout is not a formality here, it is the entire contract the bridge depends on. `pygame.image.tostring(surface, "RGB")` produces exactly 3 bytes per pixel, red then green then blue, with rows stored back-to-back and no padding — and `QImage.Format.Format_RGB888` tells Qt to interpret its input bytes with that exact same layout. If either side changed — say, pygame emitted `"RGBA"` (4 bytes per pixel, with an alpha channel) while the QImage format stayed `Format_RGB888` (3 bytes per pixel) — Qt would start reading each new pixel one byte early, and the image would render as a diagonal, color-shifted smear, not a clean error. This class of bug (two systems agreeing on *quantity* of data but not its *shape*) has no exception to catch; the only way to catch it is knowing both formats and checking they match, which is exactly why this pairing is called out explicitly rather than treated as an implementation detail.',
      'Python resolves nearly everything used in this lesson at runtime, not ahead of time — this matters for how you should read the code. When `surface.fill(...)` executes, Python does not know in advance that `surface` is a `pygame.Surface` with a `fill` method; it looks up `fill` on whatever object `surface` actually refers to at that exact moment, only when that line runs. This is why a typo like `surface.fil(...)` produces no warning until that exact line executes — there is no separate compiler pass that would have caught it earlier, unlike a statically-typed language where a misspelled method name fails before the program ever runs. The practical consequence for debugging this project: an error inside `paintEvent` only ever surfaces the moment Qt actually calls `paintEvent`, which is why a broken repaint can silently do nothing (Qt catches the exception internally rather than crashing the whole application) instead of announcing itself immediately.',
    ],
    callouts: [
      {
        type: 'misconception',
        title: 'The Trap: One Almost-Identical Line, Two Windows',
        body: 'The normal rule this lesson establishes: `pygame.Surface((400, 300))` allocates pixel memory and creates no window at all — the only window in this whole project is the `QWidget`.\n\nHere is code that looks like a harmless variation on that line:\n\n```python\nsurface = pygame.display.set_mode((400, 300))\n```\n\n**Predict before reading on:** does this line behave the same as `pygame.Surface((400, 300))`, just written differently, or does something different happen?\n\n**What actually happens:** running this inside the project pops open a **second, real, native OS window** — a genuine SDL-owned window, completely separate from the PySide6 `QWidget` — sitting alongside it, showing nothing this project ever draws into on purpose.\n\n**Exact reason:** `pygame.display.set_mode(...)` does not just allocate memory the way `pygame.Surface(...)` does — its entire job is to ask the operating system for a window handle and register pygame as that window\'s owner, then hand back a `Surface` representing that window\'s own pixels as a side effect. `pygame.Surface(...)` allocates the identical *kind* of object — both return a `Surface` — but performs none of that window-creation work. The two calls are similar enough to type by accident and different enough to break the entire architecture this project depends on.\n\n**Project consequence:** this is precisely why `pygame.display.set_mode` never appears anywhere in this project\'s code, in this lesson or any later one — every pygame Surface here is created with the plain `pygame.Surface(...)` constructor specifically to guarantee pygame never creates a window of its own.',
      },
    ],
    visualizations: [],
  },

  examples: [],
  challenges: [
    {
      id: 'pygame-qimage-predict-framerate',
      difficulty: 'easy',
      problem: 'In Cell 2, `timer.start(16)` schedules `tick()` roughly every 16 milliseconds. Predict: if you changed that line to `timer.start(1000)`, what would visibly change about the animation, and why is `16` — specifically, not some other small number — the value used for smooth motion?',
      hint: 'How many times would each version call tick() in one second? What does "frames per second" actually count?',
      walkthrough: [
        'timer.start(16) fires roughly every 16ms, and 1000ms / 16ms ≈ 62.5 — close to 60 calls to tick() per second.',
        'timer.start(1000) fires once per second — 1000ms / 1000ms = 1 call to tick() per second.',
        'Each call to tick() advances the angle by a fixed 0.05 radians and requests one repaint, so fewer calls per second means fewer, larger jumps in position rather than smooth motion.',
        'At 1-second intervals the circle would visibly teleport in small jumps once a second instead of appearing to glide continuously.',
      ],
      answer: 'The circle would visibly jump once per second instead of animating smoothly, because tick() (and therefore the position update and repaint) would run about 60 times less often. 16ms is used because 1000ms / 16ms ≈ 60, matching the ~60Hz refresh rate most monitors use — calling tick() faster than the screen can actually redraw would waste CPU with no visible benefit.',
    },
    {
      id: 'pygame-qimage-break-repair',
      difficulty: 'medium',
      problem: 'Take Cell 1 or Cell 2 and deliberately replace `surface = pygame.Surface((400, 300))` with `surface = pygame.display.set_mode((400, 300))`, matching the trap callout above. Run it. Confirm a second window actually appears. Then explain, in your own words, exactly why `Surface` and `set_mode` — both of which return a `Surface` object you can draw on identically — lead to such different outcomes.',
      hint: 'What does the returned object being able to draw the same way tell you, and what does it not tell you, about what else happened when that line executed?',
      walkthrough: [
        'Both pygame.Surface(...) and pygame.display.set_mode(...) return an object of the same Python type, Surface, which is why drawing calls like .fill() and pygame.draw.circle() work identically on either.',
        'Returning "the same kind of object" only guarantees the same drawing interface — it says nothing about what side effects happened to produce that object.',
        'pygame.display.set_mode(...) has the side effect of asking the OS for a window and registering pygame as its owner; pygame.Surface(...) has no such side effect.',
        'The QWidget-based project code never reads from or displays the window set_mode() creates, so that second window sits there empty and unused — a visible symptom that something extra (and unwanted) happened.',
      ],
      answer: 'Surface and set_mode both hand back a drawable Surface object, so any code that only draws on it behaves identically either way — but set_mode additionally performs a real side effect (asking the operating system to create and own a window) that Surface deliberately does not. The second window you see is that real OS window, created and immediately abandoned, since nothing in this project ever reads from it.',
    },
    {
      id: 'pygame-qimage-modify-shape',
      difficulty: 'easy',
      problem: 'Modify Cell 2 to draw a rectangle instead of a circle, using pygame.draw.rect(surface, color, rect) in place of pygame.draw.circle(...). What shape of argument does pygame.draw.rect expect for its third parameter, and how is that different from the (center, radius) pair pygame.draw.circle takes?',
      hint: 'Look at what a rectangle needs to be fully specified that a circle does not: a circle is symmetric around its center, but a rectangle has an independent width and height.',
      walkthrough: [
        'pygame.draw.circle needs a center point and a single radius, since a circle is fully described by those two values.',
        'pygame.draw.rect needs a pygame.Rect (or an (x, y, width, height) tuple) — a rectangle needs a corner position plus independent width and height, which a single center+radius pair cannot express.',
        'A minimal replacement: pygame.draw.rect(surface, (255, 100, 50), (x - 30, 150 - 20, 60, 40)) draws a 60x40 rectangle centered similarly to the original circle.',
      ],
      answer: 'pygame.draw.rect takes a rectangle — either a pygame.Rect or an (x, y, width, height) tuple — instead of circle\'s (center, radius) pair, because a rectangle needs an independent width and height that a single radius cannot represent.',
    },
  ],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If nothing appears, check the environment banner above the editor first — Python + PySide6 + pygame may still be installing.',
      'If a second, empty window appears alongside the real one, you (or the lesson\'s trap exercise) likely have pygame.display.set_mode() somewhere instead of pygame.Surface() — see the trap callout above.',
      'If colors look scrambled or diagonally smeared, double check the QImage format argument matches pygame.image.tostring\'s second argument exactly ("RGB" ↔ Format_RGB888).',
    ],
    futureLinks: [
      'Next lesson: giving this viewport its own dock inside a real editor shell — a menu bar, a scene-tree panel, and an inspector panel arranged around it, the next piece of the Godot-like layout.',
    ],
  },

  quiz: [],

  mentalModel: [
    'A pygame Surface is a block of pixel memory, not a window — only pygame.display.set_mode() creates a real window, and this project never calls it.',
    'QImage.Format.Format_RGB888 must match pygame.image.tostring\'s "RGB" output exactly in byte order and channel count, or the image renders corrupted, not with a clean error.',
    'paintEvent only runs when Qt decides to repaint; .update() requests one repaint, and a QTimer calling .update() on a schedule is what turns a single paintEvent into an animation.',
    'Two calls that return the same kind of object (Surface) can still have completely different side effects (creating a real OS window or not) — matching return types never guarantee matching behavior.',
  ],

  checkpoints: ['read-intuition'],
}
