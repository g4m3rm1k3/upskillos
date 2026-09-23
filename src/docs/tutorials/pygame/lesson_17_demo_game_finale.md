# Lesson 17 — The Demo Game: Closing the Loop

## What you'll learn
- That `forge_runtime`'s output (a `pygame.sprite.Group`) works seamlessly alongside sprites the demo game writes itself — a live confirmation of Lesson 6's duck-typing argument
- How to write a real, standalone game loop, with player-controlled movement, that is **not** driven by any Qt code at all
- The final, generalized form of Lesson 5's core lesson: delta-time correctness isn't an animation-only concern — it applies to *any* per-frame changing state, including player movement

## What you'll build
`demo_game.py` — a small, completely independent pygame-ce script (no
PySide6 anywhere in it) that loads a scene authored in Forge and lets you
move a hand-written player character around it with the arrow keys.

## The question
`forge_runtime.load_scene()` (Lesson 16) hands back a
`pygame.sprite.Group` full of `RenderSprite`s. A real game also needs its
*own* objects — a player character, here, written with no knowledge of
Forge at all. Can genuinely unrelated code — one side built for an
editor, the other hand-written for a specific game — cooperate inside the
same `pygame.sprite.Group` machinery, or does using Forge's output require
adopting Forge's own classes throughout the whole game?

---

## 1. Predict

`RenderSprite` (Lesson 6) is a `pygame.sprite.Sprite` subclass defined
entirely inside the Forge codebase. A `PlayerSprite`, about to be written
in this lesson, will *also* subclass `pygame.sprite.Sprite`, but has never
heard of `RenderSprite`, `GameObject`, or anything else in Forge. If both
kinds of sprite are added to the *same* `pygame.sprite.Group` and you call
`group.draw(screen)`, do you expect this to work correctly for both, fail
for one of them, or fail entirely? Reason from Lesson 6's explanation of
what `Group.draw()` actually requires, before answering.

---

## 2. Try it

```python
import pygame

class PlayerSprite(pygame.sprite.Sprite):
    def __init__(self, pos: tuple[int, int]):
        super().__init__()
        self.image = pygame.Surface((24, 24))
        self.image.fill((80, 200, 120))
        self.rect = self.image.get_rect(center=pos)

pygame.init()
screen = pygame.display.set_mode((400, 300))

group = pygame.sprite.Group()
group.add(PlayerSprite((200, 150)))
# imagine a RenderSprite from Lesson 16 were also added here

screen.fill((20, 20, 20))
group.draw(screen)
pygame.display.flip()
pygame.time.wait(1000)
pygame.quit()
```

Run it — a green square appears. Nothing about this code, or `Group`
itself, needed to know or care that `PlayerSprite` and `RenderSprite`
come from completely unrelated parts of the codebase.

### Why this works (mechanical explanation, brief — this mechanism was already fully explained in Lesson 6)

`Group.draw()` only ever looks for two attribute names on each of its
members: `image` and `rect` (Lesson 6, Section 2). `PlayerSprite` defines
both, exactly the same convention-based contract `RenderSprite` also
satisfies — `Group` has no way to distinguish "a sprite that came from
Forge's editor" from "a sprite this game wrote itself," and it was never
designed to. This answers Section 1's prediction directly: **both kinds
of sprite work identically inside the same group**, precisely *because*
`Sprite`/`Group` were built around duck typing rather than requiring a
specific class hierarchy.

---

## 3. Why this actually matters for this project, specifically

This is the moment Lesson 6's design decision — *not* rebuilding
`GameObject` as a `pygame.sprite.Sprite` subclass, and instead using a
thin `RenderSprite` adapter — proves itself for a second, independent
reason beyond what Lesson 6 originally argued. Lesson 6 justified the
adapter for `GameObject`'s own sake (serialization, Inspector reflection).
This lesson shows the *other* side of that same boundary: because
`RenderSprite` still ultimately behaves like an ordinary
`pygame.sprite.Sprite` to anything consuming it, **a completely
independent game can mix Forge-authored content with its own hand-written
game objects in the exact same rendering and update machinery**, with no
special-casing anywhere. The adapter didn't just protect `GameObject` from
depending on pygame — it also made the *output* of that adapter fully
interoperable with ordinary pygame code that knows nothing about Forge at
all.

---

## 4. Change one thing — from a fixed square to delta-time-correct movement

```diff
 class PlayerSprite(pygame.sprite.Sprite):
     def __init__(self, pos: tuple[int, int]):
         super().__init__()
         self.image = pygame.Surface((24, 24))
         self.image.fill((80, 200, 120))
         self.rect = self.image.get_rect(center=pos)
+        self.speed_px_per_sec = 200.0
+
+    def update(self, dt_ms: float) -> None:
+        keys = pygame.key.get_pressed()
+        dx = (keys[pygame.K_RIGHT] - keys[pygame.K_LEFT])
+        dy = (keys[pygame.K_DOWN] - keys[pygame.K_UP])
+        dt_sec = dt_ms / 1000.0
+        self.rect.x += dx * self.speed_px_per_sec * dt_sec
+        self.rect.y += dy * self.speed_px_per_sec * dt_sec
```

### What changed
`PlayerSprite` now has an `update(dt_ms)` method — matching exactly the
signature `Group.update(dt_ms)` (Lesson 6) will call automatically —
reading keyboard state and moving the player's `rect` accordingly.

### What did not change
`image`/`rect` construction — untouched; this is purely additive.

```
change_analysis:
  changed: "added update(dt_ms) implementing keyboard-driven, speed-and-time-based movement"
  unchanged:
    - "image/rect construction from Section 2"
  behavioral_difference:
    - "the player now moves in response to arrow keys, at a fixed real-world speed"
  compiler_difference:
    - "none"
  runtime_difference:
    - "Group.update(dt_ms), called once per game-loop iteration, now drives this movement automatically alongside any RenderSprite in the same group"
```

**Why `dx * self.speed_px_per_sec * dt_sec`, and not just `dx * some_fixed_number`:**
This is Lesson 5's core lesson, generalized. `keys[pygame.K_RIGHT] -
keys[pygame.K_LEFT]` gives a direction (`-1`, `0`, or `1` — `pygame.key`
values are `0`/`1` booleans-as-ints, so subtracting them combines "held
right" and "held left" into one net direction). Multiplying by
`speed_px_per_sec` (a real-world speed, pixels per **second**, not per
frame) and by `dt_sec` (real elapsed seconds since the last frame, from
the same `clock.tick()` return value used throughout Lessons 5, 7, and
10) means the player moves at *exactly* `200` pixels per second of real
time, **regardless of frame rate** — on a machine running the game loop
at 30fps or 144fps, the player crosses the screen in the same amount of
real time either way. Using a fixed per-frame pixel amount instead — the
mistake Lesson 5 opened with, for animation — would reintroduce that
exact same framerate-dependence bug here, just for player movement
instead of animation playback. This is precisely why Section 7's
capstone trap revisits it.

---

## 5. Put it in the project — the full demo game

```python
# demo_game.py
import sys
from pathlib import Path
import pygame
import forge_runtime


class PlayerSprite(pygame.sprite.Sprite):
    def __init__(self, pos: tuple[int, int]):
        super().__init__()
        self.image = pygame.Surface((24, 24))
        self.image.fill((80, 200, 120))
        self.rect = self.image.get_rect(center=pos)
        self.speed_px_per_sec = 200.0

    def update(self, dt_ms: float) -> None:
        keys = pygame.key.get_pressed()
        dx = keys[pygame.K_RIGHT] - keys[pygame.K_LEFT]
        dy = keys[pygame.K_DOWN] - keys[pygame.K_UP]
        dt_sec = dt_ms / 1000.0
        self.rect.x += dx * self.speed_px_per_sec * dt_sec
        self.rect.y += dy * self.speed_px_per_sec * dt_sec


def main() -> int:
    pygame.init()
    screen = pygame.display.set_mode((800, 600))
    pygame.display.set_caption("Forge Demo")
    clock = pygame.time.Clock()

    scene_sprites = forge_runtime.load_scene(Path("level1.forge"))
    player_group = pygame.sprite.Group()
    player_group.add(PlayerSprite((400, 300)))

    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        dt = clock.tick(60)
        scene_sprites.update(dt)
        player_group.update(dt)

        screen.fill((30, 30, 40))
        scene_sprites.draw(screen)
        player_group.draw(screen)
        pygame.display.flip()

    pygame.quit()
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

### Code walkthrough — what's new versus Sections 2/4

**`scene_sprites = forge_runtime.load_scene(Path("level1.forge"))`**
Called *after* `pygame.display.set_mode(...)` — this ordering directly
satisfies the precondition `load_scene` explicitly checks for (Lesson
16's trap and its fix), avoiding that exact failure by construction, in
the correct order this time.

**Two separate groups, `scene_sprites` and `player_group`, rather than one**
A deliberate choice: `scene_sprites` contains whatever Forge authored;
`player_group` contains this game's own hand-written objects. Keeping
them separate — rather than merging the player into `scene_sprites`
directly — means the game's own code never needs to reach into or modify
what `forge_runtime` returned; it only needs to `update()`/`draw()` it
alongside its own group, which Section 2 already established works
correctly regardless of which sprites came from where.

**`scene_sprites.draw(screen)` before `player_group.draw(screen)`**
Draw order matters — whichever group draws *last* appears visually *on
top*. Drawing the scene first, then the player, ensures the player is
never hidden behind background elements, a plain consequence of `blit`
overwriting whatever pixels were there before (Lesson 4), applied here at
the whole-group level rather than a single sprite.

**The overall loop shape**
Notice this is, structurally, exactly Lesson 4's very first `while
running:` loop — event handling, `clock.tick`, fill, draw, flip — now
carrying real gameplay logic, real authored content, and zero Qt anywhere
in the file. This is the plain pygame loop from the very first pygame
lesson, unchanged in shape, now doing the actual job the whole series has
been building toward.

---

## 6. What to double-check, revisiting the whole series

This lesson intentionally doesn't introduce one final *new* trap, hidden
and waiting to surprise you — it's a good moment to actively check this
code against every trap already taught, since a real, working game is
exactly where they'd resurface if any were missed:

- **Lesson 4:** is `convert_alpha()` (inside `forge_runtime`'s `hydrate`)
  being called only after a display mode exists? *(Checked directly by
  Lesson 16's precondition check.)*
- **Lesson 5:** is any per-frame state — not just animation, as this
  lesson's Section 4 demonstrated — advanced using real elapsed time
  rather than a fixed per-frame amount?
- **Lesson 6:** does anything added to `scene_sprites` or `player_group`
  actually define `image` and `rect`? *(`PlayerSprite` does; confirm any
  future sprite type you add does too.)*
- **Lesson 9:** if this game's own code ever slices a spritesheet
  directly (rather than through `forge_runtime`), are float coordinates
  explicitly rounded before constructing a `pygame.Rect`?

Treating a finished feature as "probably fine" and moving on is how
regressions of exactly this kind slip back in — the discipline of
checking new code against previously-learned failure modes doesn't stop
being useful once the tutorial series ends.

---

## 7. Capstone Trap — the one bug this entire series has now taught you to recognize on sight

**Normal rule (Lesson 5, generalized in Section 4 of this lesson):**
per-frame changing state must be driven by real elapsed time
(`dt`), not by counting loop iterations or using a fixed per-frame
increment.

**Apparently equivalent code** — a very reasonable-looking simplification
of `PlayerSprite.update`, written by someone focused on "just get the
player moving" and not thinking about frame rate at all:

```python
def update(self, dt_ms: float) -> None:
    keys = pygame.key.get_pressed()
    if keys[pygame.K_RIGHT]:
        self.rect.x += 3   # "3 pixels per frame felt about right"
```

**Surprising result:** on the developer's machine, running comfortably at
60fps, this feels fine during testing. Shipped to a player on a
significantly faster or slower machine — or simply after some *other*
part of the game later gets slow enough to occasionally drop frames — the
player character visibly speeds up or slows down, unpredictably, with no
code change to the movement logic itself.

**Exact reason:** this is the *exact* mechanism Lesson 5 opened the
entire animation topic with, six lessons ago — `dt_ms` is accepted as a
parameter here but never actually used; the movement amount per call to
`update` is a fixed constant, meaning total movement speed is entirely a
function of *how many times `update` happens to be called per second*,
which is not a fixed, guaranteed quantity (Lesson 5, Section 3).

**Project consequence, and the actual point of ending here on this,
specifically:** this project has now taught this precise failure
mode — "coupling a rate of change to loop-iteration count instead of to
real elapsed time" — in exactly one place, explicitly (Lesson 5), and it
has generalized, unannounced, to a second one right here, in ordinary
gameplay movement, which has nothing to do with animation frames at all.
**The goal of this whole curriculum was never "memorize these sixteen
specific traps" — it's recognizing the small number of underlying
*shapes* that produce them, so that the seventeenth occurrence, in code
this series never showed you at all, is still recognizable on sight.**

---

## 8. Exercise

**Predict:** If `scene_sprites.draw(screen)` and `player_group.draw(screen)`
were swapped in order, under what specific circumstance would you
actually be able to *see* the difference on screen? (Hint: think about
what would need to be true about the player's position relative to the
scene's authored objects.)

**Modify:** Add a simple boundary check to `PlayerSprite.update` keeping
`self.rect` within the `800×600` screen (clamp `rect.x`/`rect.y` to valid
ranges after the movement lines). Where exactly should this clamping
happen relative to the existing movement code, and why does it need to
happen *after* the position update rather than before?

**Break:** Reintroduce this lesson's Capstone Trap on purpose — replace
`PlayerSprite.update`'s delta-time-correct movement with the fixed
`self.rect.x += 3` version. Run the game with `clock.tick(60)` changed to
`clock.tick(15)` (a much lower cap) and observe the player's movement
speed change, despite no change to the movement logic itself — direct,
hands-on confirmation of the bug this lesson has been building toward the
whole time.

**Trace, as a full-series capstone:** Pick any **two** of this series'
sixteen previous traps (aliasing/mutable defaults, signal feedback loops,
`is` vs. `==`, silent truncation, stale references, missing assertions,
etc.) and, in your own words, explain what the two traps have in common
at the *mechanism* level, even though they occurred in completely
different libraries and contexts. This is the exercise this whole series
has actually been training you toward — not remembering sixteen isolated
facts, but recognizing a much smaller number of recurring shapes.

---

## What to remember — and a full-series retrospective
1. `pygame.sprite.Group`'s duck-typed contract means Forge-authored content and hand-written game objects interoperate freely in the same group, with no special-casing — the direct, second payoff of Lesson 6's adapter design.
2. Delta-time correctness (Lesson 5) applies to *any* per-frame changing state, not just animation — player movement, timers, or anything else that changes "per frame" needs the same discipline.
3. A finished game is exactly where previously-learned traps would resurface if missed — actively checking new code against them is a permanent habit, not a one-time tutorial exercise.

Across this whole series, a small number of **shapes** kept recurring in
different disguises:
- **Aliasing vs. copying** (Lessons 3, 6, 8): does a name refer to a
  *shared* mutable object, or an independent one?
- **Identity vs. value equality** (Lessons 3, 6, 8, 12): `is` for "the
  same real thing," `==` for "currently equal values" — conflating them
  causes silent, hard-to-notice bugs specifically because both usually
  agree, right up until they don't.
- **Silent, no-error failures** (Lessons 6, 9, 13, 14, 15): a mismatched
  pixel format, a truncated float, a stale reference, a missing `assert`,
  a no-op `basicConfig()` call — none of these raise an exception, which
  is exactly what makes them worth specifically watching for.
- **Decoupling through a boundary or a shared model, instead of direct
  references** (Lessons 6, 9, 12, 16): `RenderSprite`, `frame_defined`,
  `SelectionModel`, `forge_runtime` — the same pattern, applied repeatedly,
  of one layer not needing to know another layer's internals.
- **Rate-of-change correctness** (Lessons 5 and this lesson): tie
  anything that changes over time to real elapsed time, never to
  iteration count.

That's the actual curriculum, underneath the sixteen individual lessons:
not pygame, not PySide6, not even Python specifically, but a handful of
shapes that show up constantly in real software, wearing sixteen
different disguises. Recognizing the disguise is the skill.

## Where to go from here
This closes the core curriculum. Two areas from the original roadmap were
deliberately left lighter than the rest, if you want to keep building:
**Phase 6's remaining import-wizard polish** (multi-row/irregular
spritesheet grids, not just single-row sheets) and **Phase 8's CI setup**
(running Lesson 14's `pytest` suite automatically on every change). Either
is a reasonable next lesson to request, or feel free to take Forge in
whatever direction the project itself now points you toward.
