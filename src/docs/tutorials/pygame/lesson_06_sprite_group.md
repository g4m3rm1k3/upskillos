# Lesson 6 — `pygame.sprite.Sprite`/`Group`: What They Give You, and Why Forge Won't Use Them as Its Core Model

## What you'll learn
- What `pygame.sprite.Sprite` and `Group` actually do for you (batched update/draw, membership tracking)
- The exact contract `Group.draw()` requires every sprite to satisfy
- A real aliasing trap involving `Rect`, connected directly to Lesson 3's mutable-default lesson
- Why Forge will **not** use `Sprite` as its core object model — argued explicitly, not assumed

## What you'll build
A small adapter class, `RenderSprite`, that *wraps* Lesson 3's `GameObject` +
Lesson 5's `AnimationClip` just enough to be drawable through a
`pygame.sprite.Group` — without making `pygame.sprite.Sprite` the thing
Forge's data model, JSON serialization, or Inspector panel actually depend
on.

## The question
pygame ships its own built-in "many objects on screen" system:
`Sprite`/`Group`. Forge already has `GameObject` (Lesson 3) — a plain
dataclass, JSON-serializable, framework-agnostic. Do you throw that away
and rebuild everything on top of `pygame.sprite.Sprite` instead, since it's
"the pygame way"? This lesson argues the answer is no, and shows you
precisely where the boundary should sit.

---

## 1. Predict

```python
import pygame

class Blob(pygame.sprite.Sprite):
    pass

group = pygame.sprite.Group()
blob = Blob()
group.add(blob)
group.draw(screen)   # assume `screen` exists
```

Before reading on: `Blob` here defines nothing beyond inheriting from
`Sprite`. What do you expect `group.draw(screen)` to do — draw something,
draw nothing, or raise an error? Guess based on what a `Sprite` would
plausibly need to know in order to be drawn at all.

---

## 2. Try it

```python
import pygame

pygame.init()
screen = pygame.display.set_mode((400, 300))

class Blob(pygame.sprite.Sprite):
    def __init__(self, image: pygame.Surface, pos: tuple[int, int]):
        super().__init__()
        self.image = image
        self.rect = image.get_rect(topleft=pos)

group = pygame.sprite.Group()
surf = pygame.Surface((32, 32))
surf.fill((200, 60, 60))
group.add(Blob(surf, (50, 50)))
group.add(Blob(surf, (150, 100)))

screen.fill((20, 20, 20))
group.draw(screen)
pygame.display.flip()
pygame.time.wait(1500)
pygame.quit()
```

Run it. Two red squares appear at the positions given.

### What this code does (mechanical explanation)

**`class Blob(pygame.sprite.Sprite):`**
`Blob` inherits from `pygame.sprite.Sprite` — the same inheritance
mechanism from Lesson 2's `EditorWindow(QMainWindow)`, just with a
different base class from a different library.

**`super().__init__()`**
Exactly the same rule from Lesson 2: `Sprite.__init__` sets up internal
bookkeeping — specifically, an internal record of which `Group`s this
sprite currently belongs to — and skipping this call breaks that
bookkeeping, the same way skipping `QMainWindow.__init__` broke native
window setup.

**`self.image = image`** / **`self.rect = image.get_rect(topleft=pos)`**
This is the entire contract `Sprite` asks you to fulfill, and it's a loose
one: **an attribute literally named `image`** (a `Surface` to draw) and
**an attribute literally named `rect`** (a `Rect` saying where). `Sprite`
does not enforce this with an abstract method or a type system — it's a
**duck-typing convention**: `Group.draw()` will simply reach for
`sprite.image` and `sprite.rect` on every member and fail with an
`AttributeError` if either is missing. This answers Section 1's
prediction: an empty `Blob()` with no `image`/`rect` set would error the
moment `draw()` tried to use it, not silently do nothing.

**`group = pygame.sprite.Group()`**
Constructs a container purpose-built for holding many sprites and
performing batch operations on all of them at once — `draw()` and
`update()` being the two you'll use constantly.

**`group.add(Blob(surf, (50, 50)))`**
`add` does two things: it stores the sprite in the group's internal
collection, *and* it registers the group in the sprite's own internal
list of groups it belongs to (from `super().__init__()`'s bookkeeping) —
this is why a single sprite can belong to multiple groups simultaneously
(useful for "all enemies" and "all on-screen objects" being separate
groups containing overlapping sprites), and why `sprite.kill()` (not shown
here, but worth knowing) removes a sprite from **every** group it belongs
to in one call, rather than needing to be removed from each manually.

**`group.draw(screen)`**
Iterates every sprite currently in the group and calls, effectively,
`screen.blit(sprite.image, sprite.rect)` for each — exactly Lesson 5's
`blit` mechanism, just automated across however many sprites the group
holds, in one call instead of a hand-written loop.

---

## 3. Why?

### The mechanism — `Group` as a managed collection, not magic

```
Group internal state:
  a collection of Sprite references
Sprite internal state (from Sprite.__init__):
  a collection of Group references it belongs to

group.add(sprite)   → sprite added to group's collection
                       AND group added to sprite's collection
group.draw(surface)  → for sprite in group: surface.blit(sprite.image, sprite.rect)
group.update(*args)  → for sprite in group: sprite.update(*args)
sprite.kill()         → sprite removed from every group it's registered with
```

None of this is exotic — `Group` is, underneath, a fairly ordinary
container class doing a `for` loop over its members and calling
conventionally-named attributes/methods on each. The value it adds is
**bookkeeping across many objects and many groups at once**, not any
capability you couldn't write yourself with a plain list.

### Where the fit is genuinely good

For a game *actually running* — as opposed to being edited — "loop over
every on-screen thing, blit it, then call its per-frame update" is close
to exactly the job Forge's Phase 9 export runtime needs to do, fast, for
potentially hundreds of objects. `Sprite`/`Group` are a reasonable, minimal
answer to that specific problem.

---

## 4. Change one thing

```diff
 class Blob(pygame.sprite.Sprite):
     def __init__(self, image: pygame.Surface, pos: tuple[int, int]):
         super().__init__()
         self.image = image
         self.rect = image.get_rect(topleft=pos)
+
+    def update(self, dt_ms: float) -> None:
+        self.rect.x += 1
```

```diff
 screen.fill((20, 20, 20))
+group.update(16)
 group.draw(screen)
```

### What changed
Each `Blob` now has an `update` method; `group.update(16)` is called once
before drawing, per frame (`16` standing in for a delta-time value, echoing
Lesson 5).

### What did not change
- `Group.draw()`'s contract and behavior — unchanged
- Sprite construction and group membership — unchanged

```
change_analysis:
  changed: "added Blob.update(dt_ms) and a single group.update(16) call before drawing"
  unchanged:
    - "image/rect contract for drawing"
    - "group membership mechanics from add()"
  behavioral_difference:
    - "every sprite in the group now moves one pixel right per call, without the calling code looping over sprites manually"
  compiler_difference:
    - "none"
  runtime_difference:
    - "group.update(16) internally loops and calls sprite.update(16) on each member — one call site now drives arbitrarily many sprites"
```

**Why this generalizes:** `update`, like `image`/`rect`, is a **convention
name**, not a required override — `Sprite`'s own base `update` does
nothing at all; defining your own on a subclass is what gives it behavior.
`Group.update(*args)` simply forwards whatever arguments you pass it
(here, `16`) to every member's `update` — this is why the signature
`def update(self, dt_ms: float)` above must match what the group is
actually called with.

---

## 5. Trap

**Normal rule:** a `Rect` you construct and assign to `self.rect` behaves
like any Python object reference — assigning it around doesn't
automatically copy it, exactly like Lesson 3's dataclass fields didn't
automatically copy lists you passed in.

**Apparently equivalent code** — imagine spawning two sprites that should
*start* at the same position but move independently afterward:

```python
shared_rect = surf.get_rect(topleft=(50, 50))

blob_a = Blob(surf, (0, 0))
blob_a.rect = shared_rect

blob_b = Blob(surf, (0, 0))
blob_b.rect = shared_rect

blob_a.rect.x += 10   # "just moving blob_a a bit"
```

**Surprising result:** `blob_b` also visibly moved, even though only
`blob_a.rect.x` was touched.

**Exact reason:** `blob_a.rect` and `blob_b.rect` are two names bound to
the **exact same `Rect` object** — `shared_rect` was assigned to both,
not copied for each. `Rect` is mutable; `blob_a.rect.x += 10` mutates that
one shared object in place, and since `blob_b.rect` points at that same
object, the change is visible through *either* name. This is precisely
the same category of bug as Lesson 3's shared-mutable-list trap — the same
underlying Python fact (assignment binds a name to an object; it doesn't
copy it) surfacing in a different library.

**Project consequence:** whenever Forge code needs two sprites/objects at
the same *starting* position, construct **two separate `Rect`s** (even if
built from identical coordinates) — `pygame.Rect(0, 0, 32, 32)` called
twice produces two independent objects; reusing one `Rect` reference for
"convenience" is exactly the mistake above. This is the same discipline
Lesson 3's Exercise (writing a correct `duplicate()` for `GameObject`)
already asked you to practice — the rule is really "know when you're
sharing a reference vs. creating something new," and it recurs everywhere,
not just in dataclasses.

---

## 6. Apply to the project — the design decision this lesson is really about

Forge already has `GameObject` (Lesson 3): a plain dataclass, JSON
round-trippable, with no dependency on pygame at all. `pygame.sprite.Sprite`
requires `image`/`rect` attributes and is *not* JSON-serializable, has no
concept of a parent/child hierarchy, and ties an object's identity to
pygame specifically — which becomes a real problem the moment the
Inspector panel (Phase 7) needs to introspect a `GameObject`'s fields via
`dataclasses.fields()` (Lesson 3), since `Sprite` isn't a dataclass and
wasn't built to be reflected over that way.

```
design_decision:
  problem: "should GameObject (the editor's core data model) be rebuilt as a pygame.sprite.Sprite subclass instead of a plain dataclass?"
  available_choices:
    - "make GameObject inherit from pygame.sprite.Sprite directly"
    - "keep GameObject as a plain, pygame-agnostic dataclass; use Sprite/Group only as an internal rendering detail"
  selected_choice: "keep GameObject as a plain dataclass; add a thin RenderSprite adapter"
  reason: "GameObject must be JSON-serializable (Lesson 3), reflectable for the Inspector (Phase 7), and usable without a display/pygame context at all (e.g. running the data-model test suite in Phase 8 headlessly); pygame.sprite.Sprite satisfies none of those constraints and wasn't designed to"
  benefit: "the data model stays a small, dependency-free, testable core; pygame's batching convenience is still available exactly where it's actually useful — the render/viewport layer"
  cost: "one extra adapter class, and the two attributes it syncs (position, current frame) must be kept in agreement every frame — a small but real ongoing responsibility"
  future_revisit_condition: "if the exported runtime (Phase 9) needs to manage hundreds of moving objects and profiling shows the adapter layer itself is a bottleneck, this boundary is the first place to optimize"
```

The adapter, kept intentionally thin:

```python
# forge/render_sprite.py
import pygame
from forge.model import GameObject
from forge.animation import AnimationClip


class RenderSprite(pygame.sprite.Sprite):
    """Draws a GameObject's current animation frame at its Transform's position.

    Deliberately NOT the source of truth for position or animation state —
    GameObject and AnimationClip remain that. This class exists only so a
    pygame.sprite.Group can batch-draw many GameObjects at once.
    """

    def __init__(self, game_object: GameObject, clip: AnimationClip):
        super().__init__()
        self.game_object = game_object
        self.clip = clip
        self.image = clip.current_frame
        self.rect = self.image.get_rect()
        self._sync_position()

    def update(self, dt_ms: float) -> None:
        self.clip.update(dt_ms)
        self.image = self.clip.current_frame
        self._sync_position()

    def _sync_position(self) -> None:
        t = self.game_object.transform
        self.rect = self.image.get_rect(center=(t.x, t.y))
```

### Code walkthrough — what's new

**`self.game_object = game_object`** / **`self.clip = clip`**
Plain attribute storage — `RenderSprite` holds *references* to the real
data (a `GameObject`, an `AnimationClip`), rather than copying or
re-implementing anything from either. This is the entire point of an
adapter: it translates between two shapes without owning the underlying
truth.

**`self.image = clip.current_frame`**
Recall Lesson 5: `current_frame` is a `@property`, computed live from
`clip`'s internal frame index — so this assignment captures *whatever
frame is current right now*, not a permanent link that updates itself.
That's exactly why `update()` below re-reads it every call.

**`def update(self, dt_ms: float) -> None:`** matching `Group.update(dt_ms)`
This satisfies the exact convention from Section 4 — `Group.update(16)`
elsewhere in the codebase will call this method, with `16` (or whatever
real `dt_ms` is measured) automatically forwarded as the argument.

**`self.rect = self.image.get_rect(center=(t.x, t.y))`**
Rebuilding `rect` fresh from `game_object.transform` every update,
**by constructing a brand-new `Rect`** rather than mutating an existing
one in place. This sidesteps Section 5's aliasing trap entirely — there's
never a `Rect` shared between two `RenderSprite`s, because a new one is
created here every single frame.

---

## 7. Exercise

**Predict:** If two different `GameObject`s are wrapped in two separate
`RenderSprite`s, both sharing the *same* `AnimationClip` **instance**
(not two separate clips), what happens to their animations over time —
do they play independently, or in lockstep? Reason from where
`AnimationClip`'s `_frame_index` state actually lives (Lesson 5) before
answering.

**Modify:** `RenderSprite.__init__` currently calls `_sync_position()`
using a freshly-constructed `Rect` each time. Rewrite it to instead mutate
`self.rect.center = (t.x, t.y)` in place (a real, valid pygame `Rect` API)
and explain, given Section 5's trap, why this version is *not* dangerous
the way the shared-`Rect` example was — what's actually different about
*whose* `Rect` is being mutated here.

**Break:** Remove the `RenderSprite.update` method's line
`self.image = self.clip.current_frame`, leaving `clip.update(dt_ms)` in
place. Run the animation and describe what you'd actually observe on
screen. Which piece of state advances correctly, and which piece stays
stale — and why does that split occur, given that `image` and `clip`'s
internal frame index are two genuinely separate pieces of state?

**Compare:** Write one paragraph contrasting `GameObject` (Lesson 3) and
`RenderSprite` (this lesson) along exactly these axes: JSON-serializable?
Requires pygame to even import the class? Has a meaningful identity
outside of being drawn? Use your answers to restate, in your own words,
why the design decision in Section 6 drew the boundary where it did.

---

## What to remember
1. `Sprite`/`Group` work by convention (`image`, `rect`, `update`), not by enforced interface — `Group.draw()` simply expects those attribute names to exist.
2. `Group` gives you batched draw/update and multi-group membership tracking over what would otherwise be manual loops — genuinely useful, but not magic.
3. `Rect` is mutable; assigning the same `Rect` object to two sprites means mutating one mutates both — the same aliasing hazard as Lesson 3's shared mutable list, in a new context.
4. Forge deliberately keeps `GameObject` pygame-agnostic and JSON-serializable, and uses `Sprite`/`Group` only inside a thin rendering adapter (`RenderSprite`) — a boundary chosen for testability and Inspector-reflection, not adopted or rejected reflexively.
5. An adapter class should hold *references* to the real data, not duplicate or become the source of truth for it.

## Next lesson
Lesson 7 is the architectural hinge of the whole project (Phase 4): rendering
pygame headlessly to an off-screen `Surface`, converting it to a `QImage`,
and painting it inside a Qt widget via `QTimer` — merging everything you've
built in Lessons 1–2 (the editor shell) with Lessons 4–6 (pygame rendering)
into one running application for the first time.
