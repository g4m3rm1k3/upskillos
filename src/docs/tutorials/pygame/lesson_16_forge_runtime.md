# Lesson 16 — `forge_runtime.py`: Loading a `.forge` Project Into a Real Game

## What you'll learn
- Why `AnimationClip` (Lesson 5) can't be saved to JSON directly, and the separate, serializable data shape that solves it
- How every earlier "keep this pygame/Qt-agnostic" decision (Lessons 3, 6, 11, 13) pays off here specifically — this module needs **zero** editor code
- A direct callback to Lesson 4's very first trap: `convert_alpha()` still requires a display mode, but now the runtime doesn't control when that happens — its *caller* does
- How to turn a loaded `.forge` file into a real `pygame.sprite.Group`, ready to update and draw in an ordinary game loop

## What you'll build
`forge_runtime.py` — a small, standalone module with no PySide6 dependency
at all, importable by any real pygame-ce game, that loads a `.forge`
project and returns a ready-to-use `pygame.sprite.Group`.

## The question
Everything authored in Forge lives as `GameObject`/`Transform`/JSON
(Lessons 3, 13) plus, from this lesson, animation data — none of which
depends on pygame or Qt. A *real game*, though, needs actual
`pygame.Surface` frames and a `pygame.sprite.Group` it can update and
draw every frame (Lesson 6). What's the missing piece connecting "plain,
portable data" to "pygame objects, ready to render," and why couldn't
`AnimationClip` itself just be saved directly?

---

## 1. Predict

```python
from dataclasses import asdict
import json
import pygame
from forge.animation import AnimationClip

pygame.init()
pygame.display.set_mode((1, 1))
sheet = pygame.image.load("assets/walk_sheet.png").convert_alpha()
frames = [sheet.subsurface(pygame.Rect(i * 32, 0, 32, 32)) for i in range(4)]
clip = AnimationClip(frames=frames)

json.dumps(asdict(clip))
```

Before running this: `AnimationClip` is a `@dataclass` (Lesson 5), and
Lesson 3 established that `asdict()` + `json.dumps()` round-trips
dataclasses correctly. Do you expect this to work here too, or to fail —
and if it fails, which specific piece of `AnimationClip`'s data do you
suspect is the problem?

---

## 2. Try it

Run the code above exactly as written.

```
TypeError: Object of type Surface is not JSON serializable
```

### What this (failing) code does, and why

**`asdict(clip)`**
Works without error — `asdict` (Lesson 3) recursively walks `clip`'s
fields and produces a plain dictionary, *including* the `frames` list —
but that list still contains actual `pygame.Surface` objects, because
`asdict` only knows how to unwrap *dataclasses*, lists, and a few other
built-in containers; it has no idea how to convert a `Surface` (a class
from an entirely unrelated library) into plain data.

**`json.dumps(...)`**
This is where the failure actually surfaces. `json.dumps` only knows how
to serialize a fixed set of plain Python types — dicts, lists, strings,
numbers, booleans, `None` — and raises `TypeError` the moment it
encounters anything else, including a `pygame.Surface`, which is exactly
what's still sitting inside `asdict(clip)["frames"]`.

**Why this is a *structural* problem, not a bug to patch**
A `pygame.Surface` holds actual, live pixel data in memory — potentially
megabytes of it — not a description of *how to obtain* that data.
There's no reasonable JSON representation of "these are the literal raw
pixels" that would be worth writing to a small project file. What
*should* be saved is something much smaller and more useful: **which
spritesheet file** the frames came from, and **which rectangles** of it
to slice — exactly the information Lesson 9's import tool already
produces, before it's ever turned into actual `Surface` objects at all.

---

## 3. Why?

### Two different shapes for "an animation," used at two different times

```
AnimationClipData (Lesson 16, new):
  sheet_path: str
  frame_rects: list[tuple[int, int, int, int]]
  frame_duration_ms: int
  loop: bool
  → plain data, JSON-serializable, no pygame dependency, saved in .forge files

AnimationClip (Lesson 5):
  frames: list[pygame.Surface]
  frame_duration_ms, loop, playing, _elapsed_ms, _frame_index
  → real pygame objects, used only in-memory, never saved directly
```

This is the exact same "data model vs. rendering object" split Lesson 6
argued for between `GameObject` and `RenderSprite` — now applied one
level deeper, to animations specifically. `AnimationClipData` is what
gets saved; `AnimationClip` is what gets built *from* it, at load time,
once an actual display and actual image files are available to build
real `Surface`s from.

### The mechanism connecting the two — "hydration"

```
AnimationClipData (plain data, from a loaded .forge file)
        ↓ load the sheet_path as a real pygame.Surface (Lesson 4)
        ↓ slice frame_rects into subsurfaces (Lesson 5)
        ↓ construct a real AnimationClip from those Surfaces
AnimationClip (real pygame object, ready to update()/render)
```

This one-directional conversion — plain data *becoming* a live pygame
object, never the reverse — is commonly called "hydration," and it's the
same shape as Lesson 3's `GameObject.from_dict`, just crossing a library
boundary (plain data → pygame) instead of a format boundary
(dict → dataclass).

---

## 4. Change one thing — the payoff of every earlier boundary decision

```diff
 @dataclass
 class GameObject:
     name: str
     transform: Transform = field(default_factory=Transform)
     children: list["GameObject"] = field(default_factory=list)
+    animation_data: "AnimationClipData | None" = None
```

### What changed
One new, optional field — `GameObject` can now optionally reference an
animation.

### What did not change
**Nothing else about `GameObject` needed to change at all** — no import
of pygame, no change to `to_json`/`from_dict`'s existing logic (Lesson
13's `asdict`/reconstruction already handles arbitrarily nested
dataclasses and `None` values correctly, without modification), no change
to `SetAttrCommand`, `SelectionModel`, or the Inspector's reflection logic
from Lesson 11.

```
change_analysis:
  changed: "added an optional animation_data field to GameObject"
  unchanged:
    - "every existing GameObject method and every piece of code that consumes GameObject (serialization, Inspector reflection, undo commands, selection)"
  behavioral_difference:
    - "a GameObject can now carry a reference to an animation, still with zero pygame dependency of its own"
  compiler_difference:
    - "none"
  runtime_difference:
    - "asdict()/from_dict() automatically include/reconstruct this new field, exactly like every other field, since AnimationClipData is itself just another plain dataclass"
```

**This is the direct, concrete payoff of Lesson 6's and Lesson 11's design
decisions.** `GameObject` staying pygame-agnostic wasn't an abstract
principle — it's *specifically why* adding animation support here required
touching exactly one line in the entire model, instead of reworking
serialization, the Inspector, or undo logic to account for a new kind of
data.

---

## 5. Put it in the project

```python
# forge/animation.py — adding AnimationClipData alongside Lesson 5/10's AnimationClip
from dataclasses import dataclass, field
import pygame


@dataclass
class AnimationClipData:
    sheet_path: str
    frame_rects: list[tuple[int, int, int, int]]
    frame_duration_ms: int = 150
    loop: bool = True


def hydrate(data: AnimationClipData, sheet_cache: dict[str, pygame.Surface]) -> "AnimationClip":
    if data.sheet_path not in sheet_cache:
        sheet_cache[data.sheet_path] = pygame.image.load(data.sheet_path).convert_alpha()
    sheet = sheet_cache[data.sheet_path]

    frames = [sheet.subsurface(pygame.Rect(*r)) for r in data.frame_rects]
    return AnimationClip(frames=frames, frame_duration_ms=data.frame_duration_ms, loop=data.loop)
```

```python
# forge_runtime.py — the standalone module a real game imports
from pathlib import Path
import pygame
from forge.model import GameObject
from forge.project_file import load_project
from forge.animation import hydrate
from forge.render_sprite import RenderSprite


def load_scene(path: Path) -> pygame.sprite.Group:
    if not pygame.display.get_init() or pygame.display.get_surface() is None:
        raise RuntimeError(
            "forge_runtime.load_scene() requires a display mode to already be set "
            "(call pygame.display.set_mode(...) before loading a scene)."
        )

    roots = load_project(path)
    sprites = pygame.sprite.Group()
    sheet_cache: dict[str, pygame.Surface] = {}

    def add_recursive(obj: GameObject) -> None:
        if obj.animation_data is not None:
            clip = hydrate(obj.animation_data, sheet_cache)
            sprites.add(RenderSprite(obj, clip))
        for child in obj.children:
            add_recursive(child)

    for root in roots:
        add_recursive(root)

    return sprites
```

### Code walkthrough — what's new

**`load_project` — imported and used with zero modification**
This is worth pausing on explicitly: `forge_runtime.py` imports Lesson
13's `load_project` **completely unchanged**. That function was already
pygame-agnostic and Qt-agnostic when it was written, purely as a
consequence of `GameObject`/`Transform` themselves being plain
dataclasses — this lesson is the moment that earlier, seemingly abstract
design choice becomes directly, concretely useful: an entire file-loading
and validation subsystem, written for the *editor*, works perfectly for a
*completely separate program* with no changes at all.

**`if not pygame.display.get_init() or pygame.display.get_surface() is None:`**
This is a **deliberate, explicit precondition check** — this lesson's
answer to the ordering hazard Section 6 is built around. `load_scene`
cannot control *when* it's called, unlike the editor (Lesson 7), which
fully owned its own startup sequence. Raising a clear `RuntimeError`
with an explanatory message here, at the exact point the real problem
would otherwise surface as a much more confusing failure deep inside
`convert_alpha()`, is a direct application of Lesson 13's "fail with a
clear, specific error rather than an inscrutable one" philosophy —
applied here to an ordering dependency instead of a file-format one.

**`sheet_cache: dict[str, pygame.Surface] = {}`**
Multiple `GameObject`s in the same scene commonly share one spritesheet
(several enemies of the same type, for instance). Without a cache,
`hydrate` would call `pygame.image.load` and `.convert_alpha()` again for
*every single* `GameObject` referencing the same file — redundant disk
I/O and redundant memory for pixel data that's identical every time. The
cache, keyed by `sheet_path`, ensures each distinct spritesheet file is
loaded and converted exactly once per `load_scene` call, no matter how
many objects reference it — passed explicitly into `hydrate` as a
parameter (rather than a global or a class attribute) so its lifetime is
scoped to one `load_scene` call, not accidentally shared or leaked across
separate scene loads.

**`def add_recursive(obj: GameObject) -> None:`** — a nested function
Defined *inside* `load_scene`, this function has direct access to
`sprites` and `sheet_cache` from the enclosing scope (a **closure**,
without needing them passed as explicit parameters on every recursive
call) — a reasonable, common pattern when a helper function is only ever
meaningful in the context of one specific call and doesn't need to exist
independently elsewhere. It walks `obj.children` recursively, exactly
mirroring Lesson 3's `from_dict`'s own recursive structure — any
`GameObject` with animation data anywhere in the tree, at any depth, gets
wrapped in a `RenderSprite` and added to the group.

### Why this design?
```
design_decision:
  problem: "how does a real game consume something authored in Forge, without depending on Forge's editor, Qt, or any part of the codebase that isn't strictly needed at runtime?"
  available_choices:
    - "have the game import editor modules directly and reuse EditorWindow-adjacent code"
    - "a small, standalone forge_runtime.py, depending only on the pygame-agnostic data model, project_file, animation, and render_sprite modules — never PySide6"
  selected_choice: "standalone forge_runtime.py"
  reason: "a shipped game should not need PySide6 installed at all just to load a scene someone authored in the editor; Lessons 3, 6, 11, and 13's insistence on keeping the core data model pygame/Qt-agnostic is precisely what makes this separation possible without rewriting anything"
  benefit: "a completely separate project can `pip install` just pygame-ce plus this small runtime module, with no editor dependency whatsoever"
  cost: "the runtime imposes an ordering requirement on its caller (a display mode must already exist) that it cannot enforce, only check and report clearly"
  future_revisit_condition: "if scenes grow large enough that loading time matters, sheet_cache's simple dict could be replaced with a persistent, cross-scene asset cache — but that's a real, deliberate scope expansion, not something this lesson's version needs yet"
```

---

## 6. Trap

**Normal rule (Lesson 4):** `convert_alpha()` requires a display mode to
already be set, because it needs to know the display's native pixel
format to convert to.

**Apparently equivalent code** — a new, separate game project, written by
someone who reasonably assumes "loading a scene" is the natural first
thing to do at startup:

```python
# a real game's main.py, using forge_runtime
import sys
import pygame
import forge_runtime
from pathlib import Path

sprites = forge_runtime.load_scene(Path("level1.forge"))   # called first!

pygame.init()
screen = pygame.display.set_mode((800, 600))
```

**Surprising result:** the program crashes immediately, with
`RuntimeError: forge_runtime.load_scene() requires a display mode to
already be set...` — or, if Section 5's explicit check were *not* in
place, it would instead crash with a much less clear
`pygame.error: cannot convert without pygame.display initialized`, raised
from deep inside `hydrate`'s call to `.convert_alpha()`.

**Exact reason:** in this new game, unlike the editor (which fully
controlled its own startup order in `main()`, Lesson 7), `load_scene` is
being called *before* `pygame.init()`/`pygame.display.set_mode()` — there
is no display mode set yet at all, so `convert_alpha()` — called
indirectly, inside `hydrate`, inside `load_scene` — fails for exactly the
reason Lesson 4 first explained, six lessons ago, in a completely
different context (loading one static sprite, not a whole scene).

**Project consequence:** **`forge_runtime.py` is a library, not an
application — it does not, and should not, control when `pygame.init()`
or `pygame.display.set_mode()` are called; that responsibility belongs
entirely to whatever real game imports it.** The explicit precondition
check added in Section 5 exists specifically because this ordering
requirement, once real, external code is calling into Forge's runtime,
can no longer be guaranteed by Forge itself the way it could inside the
editor's own `main()` — the best a library can do, when it can't enforce
an ordering requirement on its own, is detect the violation immediately
and explain clearly what the caller needs to do differently, rather than
letting the failure surface confusingly, several function calls away from
its actual cause.

---

## 7. Exercise

**Predict:** If two different `GameObject`s in the same scene reference
the *same* `sheet_path` but with *different* `frame_rects`, does
`sheet_cache` cause any problem here? Trace through `hydrate` to confirm
whether the cache operates at the level of "the whole sheet" or "a
specific set of frames," and explain why that distinction matters for
your answer.

**Modify:** `load_scene` currently returns a `pygame.sprite.Group`
containing only objects that have `animation_data` set — a `GameObject`
with no animation is silently skipped entirely, even though it might
still need a `Transform` position tracked in the running game (a
static prop, for instance). Adjust `add_recursive` to still create some
form of a game-object record for non-animated objects too, without
requiring a `RenderSprite` (which specifically expects a `clip.current_frame`
to draw) — what's the minimal information a "static, unanimated object" needs
that a full `RenderSprite` doesn't require?

**Break:** Remove the precondition check from `load_scene` entirely, and
reproduce this lesson's Trap scenario yourself — call `load_scene` before
`pygame.init()`/`set_mode()`. Read the resulting `pygame.error` message
carefully. Does it, on its own, give a newcomer enough information to
guess the actual fix (call `set_mode` first), or does Section 5's
explicit, custom error message genuinely communicate something the raw
pygame error doesn't?

**Trace:** Write out, in order, every function call from
`forge_runtime.load_scene(path)` down to the very first `pygame.Surface`
actually being created, naming which lesson's code is responsible for
each step (`load_project` → ? → ? → ...). Confirm for yourself that not
one step in that chain imports anything from PySide6.

---

## What to remember
1. `AnimationClip`'s real `pygame.Surface` frames can't be saved to JSON directly — `AnimationClipData` (a sheet path plus frame rectangles) is the plain, serializable shape that gets saved instead, "hydrated" into a real `AnimationClip` only at load time.
2. Keeping `GameObject` pygame/Qt-agnostic (Lessons 3, 6, 11) is precisely why adding animation support required changing exactly one field, with zero changes to serialization, the Inspector, undo, or selection code.
3. A cache keyed by resource path (here, `sheet_path`) avoids redundant loading when multiple objects share the same underlying asset — scoped to the operation that needs it, not stored globally.
4. A library that depends on an ordering precondition it cannot enforce (here, "a display mode must already exist") should check for and clearly report a violation, rather than letting the real failure surface confusingly, several calls removed from its actual cause.
5. The entire runtime — loading, hydration, and rendering — reuses Lessons 3, 4, 5, 6, and 13's code completely unmodified; this is the concrete, working payoff of every "keep this layer separate from that layer" decision made across the whole series.

## Next lesson — and the end of this series
Lesson 17, the last lesson, is short and different in shape: a genuinely
tiny, separate pygame-ce game — a single moving character on a
background — that imports `forge_runtime` and plays back a scene actually
authored in Forge, closing the full loop this whole curriculum has been
building toward. Say "next" when you're ready for it, or let me know if
you'd rather revisit or expand any earlier phase (the roadmap's Phase 6
import-wizard polish and Phase 8 CI setup were both left intentionally
light, if you want to go deeper on either).
