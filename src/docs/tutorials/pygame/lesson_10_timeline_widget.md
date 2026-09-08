# Lesson 10 — Building the Real Clip and a Scrubbable Timeline

## What you'll learn
- How to turn a list of user-drawn `pygame.Rect`s (Lesson 9) into a real `AnimationClip` (Lesson 5)
- A genuinely surprising Qt fact: `QSlider.setValue()` fires `valueChanged` whether *you* or the *user* caused the change — Qt does not distinguish the two
- Why that fact causes a real feedback-loop bug the moment two things (automatic playback and manual scrubbing) both try to control the same piece of state
- `blockSignals`/`QSignalBlocker` as the fix, and exactly what it does and doesn't protect you from

## What you'll build
`TimelineWidget` — a play/pause button plus a slider that either shows
live playback progress or lets the user manually scrub to any frame,
without the two modes fighting each other.

## The question
An `AnimationClip` (Lesson 5) already advances its own frame index every
tick, driven by `QTimer` (Lesson 7). A timeline scrubber needs to do the
*same job* — decide which frame is current — but driven by the user
dragging a slider instead. Two different things now want to control the
same state. What happens when both are wired up at once, naively?

---

## 1. Predict

```python
from PySide6.QtWidgets import QSlider
from PySide6.QtCore import Qt

slider = QSlider(Qt.Orientation.Horizontal)
slider.setRange(0, 10)
slider.valueChanged.connect(lambda v: print(f"valueChanged fired: {v}"))

slider.setValue(5)   # this line is YOUR code setting the value, not a user drag
```

Does `"valueChanged fired: 5"` print, even though no user touched the
slider — only your own code called `setValue`? Form a guess based on
whether you think Qt signals distinguish "the user did this" from "the
program did this."

---

## 2. Try it

Run the snippet above exactly as written.

### What this code does (mechanical explanation)

**`slider = QSlider(Qt.Orientation.Horizontal)`**
A standard Qt widget — a draggable handle along a horizontal track,
producing an integer value within a range.

**`slider.setRange(0, 10)`**
Sets the minimum and maximum values the slider can represent — purely
configuration, no signals involved yet.

**`slider.valueChanged.connect(lambda v: ...)`**
`valueChanged` is a signal `QSlider` emits whenever its value changes, for
*any* reason — carrying the new integer value as its argument. Connecting
a `lambda` (an anonymous, inline function) is a valid, common shorthand
when the handler is a single short expression, functionally identical to
defining a named function and connecting that instead.

**`slider.setValue(5)`**
This is the line the prediction is about. `setValue` is a plain setter
method — but internally, if the value actually changes as a result, Qt
emits `valueChanged` as a consequence, **unconditionally**, regardless of
*what* caused the call. Qt has no built-in concept of "this call came from
user interaction" versus "this call came from my own code" — a signal
fires because a value changed, full stop, not because of *who* changed it.

The output confirms it: `"valueChanged fired: 5"` prints, despite no user
having touched the slider at all.

---

## 3. Why?

### The mechanism, stated precisely

```
Qt signals do not carry provenance information.
valueChanged fires on ANY value change, whether caused by:
  - a user dragging the slider
  - your own code calling setValue()
  - another connected slot indirectly causing setValue() to be called
```

This is neither a bug nor an oversight — it's the entire point of Qt's
signal/slot system: **decoupling**. A signal's job is to announce "this
happened," not to editorialize about who or what caused it. Any code
connected to `valueChanged` reacts the same way regardless of the cause,
which is usually exactly what you want — a progress bar following a
model's state doesn't care whether that state changed because of a user
action or a network response.

### Where this becomes a real problem

The moment **two different things** both call `setValue()` on the *same*
slider for *different reasons* — automatic playback position updates, and
user-initiated scrubbing — both paths trigger the *same* `valueChanged`
signal, and any single handler connected to it cannot tell which situation
it's responding to. If that handler's job is "update the animation's
current frame to match the slider," it will fire just as eagerly for
"the timer moved the slider to reflect where playback already is" as for
"the user dragged the slider to a new position" — even though only the
second case should actually *change* anything.

```
behavior:
  compile_time:
    - "none — signal/slot connections are resolved and checked only when the code runs, not statically"
  runtime:
    - "QSlider.setValue() emits valueChanged whenever the value actually changes, unconditionally, regardless of call origin"
```

---

## 4. Change one thing — blocking the signal for programmatic updates

```diff
 slider = QSlider(Qt.Orientation.Horizontal)
 slider.setRange(0, 10)
 slider.valueChanged.connect(lambda v: print(f"valueChanged fired: {v}"))

-slider.setValue(5)
+slider.blockSignals(True)
+slider.setValue(5)
+slider.blockSignals(False)
```

Run it. Nothing prints — the slider's displayed value still becomes `5`,
but `valueChanged` does not fire for this particular call.

### What changed
The `setValue(5)` call is now wrapped between `blockSignals(True)` and
`blockSignals(False)`.

### What did not change
- The slider's actual resulting value — still `5`, visibly
- The connection itself between `valueChanged` and the lambda — still
  active, and will fire normally for the *next* unguarded `setValue` call,
  or for real user interaction

```
change_analysis:
  changed: "wrapped the programmatic setValue(5) call with blockSignals(True)/blockSignals(False)"
  unchanged:
    - "the slider's underlying value after the call"
    - "the valueChanged connection itself, for any subsequent, unguarded changes"
  behavioral_difference:
    - "this specific value change no longer triggers connected slots"
  compiler_difference:
    - "none"
  runtime_difference:
    - "blockSignals(True) suppresses ALL signal emissions from this object until blockSignals(False) is called — not just valueChanged specifically"
```

**A precise caveat worth internalizing now:** `blockSignals(True)` blocks
**every** signal that object could emit, not just the one you're thinking
about — if this slider had other connected signals firing for other
reasons during that same window, those would be silenced too. For a
narrower, safer alternative that only guards one specific block of code
and can't accidentally be left blocked forever (e.g., due to an early
`return` skipping the matching `blockSignals(False)`), Qt/PySide6 also
provides `QSignalBlocker`, a context manager:

```python
from PySide6.QtCore import QSignalBlocker

with QSignalBlocker(slider):
    slider.setValue(5)
# signals automatically unblocked here, even if an exception occurred inside
```

---

## 5. Put it in the project

First, turning Lesson 9's imported frame rectangles into a real clip:

```python
# forge/animation.py — extending Lesson 5's AnimationClip
from dataclasses import dataclass, field
import pygame


@dataclass
class AnimationClip:
    frames: list[pygame.Surface]
    frame_duration_ms: int = 150
    loop: bool = True
    playing: bool = True

    _elapsed_ms: float = field(default=0.0, init=False, repr=False)
    _frame_index: int = field(default=0, init=False, repr=False)

    def update(self, dt_ms: float) -> None:
        if not self.playing:
            return
        self._elapsed_ms += dt_ms
        while self._elapsed_ms >= self.frame_duration_ms:
            self._elapsed_ms -= self.frame_duration_ms
            self._frame_index += 1
            if self._frame_index >= len(self.frames):
                self._frame_index = 0 if self.loop else len(self.frames) - 1

    def set_frame(self, index: int) -> None:
        self._frame_index = index % len(self.frames)
        self._elapsed_ms = 0.0

    @property
    def current_frame(self) -> pygame.Surface:
        return self.frames[self._frame_index]

    @property
    def frame_index(self) -> int:
        return self._frame_index


def build_clip_from_rects(sheet: pygame.Surface, rects: list[pygame.Rect]) -> AnimationClip:
    frames = [sheet.subsurface(r) for r in rects]
    return AnimationClip(frames=frames)
```

```python
# forge/timeline_widget.py
from PySide6.QtWidgets import QWidget, QHBoxLayout, QPushButton, QSlider
from PySide6.QtCore import Qt, QSignalBlocker
from forge.animation import AnimationClip


class TimelineWidget(QWidget):
    def __init__(self, clip: AnimationClip):
        super().__init__()
        self.clip = clip

        self.play_button = QPushButton("Pause" if clip.playing else "Play")
        self.slider = QSlider(Qt.Orientation.Horizontal)
        self.slider.setRange(0, len(clip.frames) - 1)

        layout = QHBoxLayout(self)
        layout.addWidget(self.play_button)
        layout.addWidget(self.slider)

        self.play_button.clicked.connect(self._toggle_play)
        self.slider.valueChanged.connect(self._on_slider_moved)

    def _toggle_play(self) -> None:
        self.clip.playing = not self.clip.playing
        self.play_button.setText("Pause" if self.clip.playing else "Play")

    def _on_slider_moved(self, value: int) -> None:
        self.clip.playing = False
        self.play_button.setText("Play")
        self.clip.set_frame(value)

    def sync_from_clip(self) -> None:
        """Call this once per tick from the viewport's update loop."""
        with QSignalBlocker(self.slider):
            self.slider.setValue(self.clip.frame_index)
```

```python
# forge/viewport_widget.py — one addition to Lesson 7's _on_tick
    def _on_tick(self) -> None:
        dt = self.clock.tick(60)
        self.sprites.update(dt)
        self.surface.fill((30, 30, 40, 255))
        self.sprites.draw(self.surface)
        self.update()
        if self.timeline is not None:
            self.timeline.sync_from_clip()
```

### Code walkthrough — what's new

**`playing: bool = True`**
A new, ordinary (non-`init=False`) field — unlike `_elapsed_ms`/
`_frame_index` from Lesson 5, this one *is* meant to be set at
construction or from outside, which is exactly why it has no leading
underscore and no `init=False`: it's part of the class's public,
intentional interface, not internal bookkeeping.

**`if not self.playing: return`** at the top of `update`
A **guard clause** — the simplest possible way to make an entire method a
no-op under some condition, without wrapping the rest of the method body
in an `if`. This is the mechanism that makes scrubbing "stick": once
`playing` is `False`, the `QTimer`-driven `clip.update(dt)` calls from
`ViewportWidget._on_tick` keep happening every frame, but do nothing at
all, leaving `_frame_index` exactly where `set_frame` last put it.

**`def set_frame(self, index: int) -> None:`**
Directly sets `_frame_index`, and — importantly — resets `_elapsed_ms` to
`0.0`. Without that reset, a stale, possibly-large `_elapsed_ms` left over
from before scrubbing could cause `update()` to immediately advance
*multiple* frames the instant playback resumes (Lesson 5's `while` loop
logic), jumping past the frame the user specifically scrubbed to.

**`self.slider.valueChanged.connect(self._on_slider_moved)`**
Connects the slider directly to a handler that both pauses playback and
calls `set_frame` — this is the "user changed it" path, and it's the
**only** path where you actually *want* the model (`clip`) to change
because of this signal.

**`def sync_from_clip(self) -> None:`**
This is the "playback changed it" path, called once per `QTimer` tick from
`ViewportWidget`, and it's exactly Section 4's fix, applied for real:
`QSignalBlocker(self.slider)` ensures this programmatic `setValue` call
does **not** re-trigger `_on_slider_moved` — because if it did, every
single automatic playback tick would incorrectly re-pause playback and
call `set_frame` right back to the value it was already at, fighting the
very playback that's supposed to be advancing it.

### Execution trace — one full tick during normal playback

```
1. QTimer fires → ViewportWidget._on_tick runs
2. clip.update(dt) → self.playing is True → frame index may advance
3. viewport re-renders and calls self.update() (schedule Qt repaint)
4. self.timeline.sync_from_clip() runs
5. inside sync_from_clip: QSignalBlocker(self.slider) begins
6. self.slider.setValue(self.clip.frame_index) — slider's displayed
   position updates visually
7. because signals are blocked, _on_slider_moved is NOT called here
8. QSignalBlocker's `with` block ends → signals unblocked again
9. next tick repeats from step 1
```

### Execution trace — the user drags the slider mid-playback

```
1. user drags the slider → Qt emits valueChanged with the new position
   (signals are NOT blocked here — this is a real, direct user action,
   not a call inside sync_from_clip's `with` block)
2. _on_slider_moved(value) runs: sets clip.playing = False,
   updates the Play/Pause button text, calls clip.set_frame(value)
3. on the NEXT QTimer tick, clip.update(dt) immediately returns
   (guard clause — playing is False) — frame index stays exactly where
   the user left it
4. sync_from_clip still runs every tick regardless, but since
   clip.frame_index hasn't changed, setValue is a no-op in practice
   (same value, no visible change) — though it's still wrapped safely
   in QSignalBlocker regardless
```

### Why this design?
```
design_decision:
  problem: "two different actors (automatic playback and user scrubbing) both need to set the current frame, without fighting each other"
  available_choices:
    - "let both call clip.set_frame()/slider.setValue() directly, unguarded"
    - "give AnimationClip a playing flag as a single source of truth for whether automatic advancement happens at all, and block signals during programmatic slider sync"
  selected_choice: "playing flag + guard clause + QSignalBlocker on the sync path only"
  reason: "exactly one thing should be authoritative for 'is this animation currently auto-advancing' at any moment; the slider should reflect that state, not compete to set it, except when the user explicitly acts on it"
  benefit: "scrubbing pauses playback automatically and predictably; the slider never snaps back or fights the user's drag"
  cost: "two separate code paths (_on_slider_moved vs sync_from_clip) both touch slider/clip state, and keeping their responsibilities cleanly separated is an ongoing discipline, not something enforced by the type system"
  future_revisit_condition: "if a 'loop preview region' feature is added later, this same playing-flag pattern extends naturally, but a third actor (region looping) would need the same care taken here to not fight the other two"
```

---

## 6. Trap

**Normal rule (Section 4):** `QSignalBlocker`/`blockSignals(True)` around
a programmatic `setValue` call prevents that specific call from
re-triggering a connected handler.

**Apparently equivalent code** — someone "simplifies" `sync_from_clip` by
removing what looks like unnecessary ceremony:

```python
def sync_from_clip(self) -> None:
    self.slider.setValue(self.clip.frame_index)   # blockSignals removed
```

**Surprising result:** during normal playback, the animation visibly
**stutters or refuses to advance past frame 0** — or, depending on exact
timing, plays but the Play/Pause button flickers rapidly between "Play"
and "Pause" on its own, with no button click from the user at all.

**Exact reason:** every single automatic tick's `setValue` call now fires
`valueChanged` for real, which calls `_on_slider_moved`, which sets
`self.clip.playing = False` and calls `set_frame(value)` — **immediately
undoing the very playback state the timer is trying to advance**. The
guard clause in `update()` (`if not self.playing: return`) then makes the
*next* tick's `clip.update(dt)` a no-op, since `playing` was just set to
`False` a moment ago by the sync call itself. The system is, in effect,
pausing itself every single frame, purely because a signal that was meant
to mean "the user changed this" fired for a reason that had nothing to do
with the user — exactly Section 3's core fact, now causing real, visible
damage rather than just an unexpected print statement.

**Project consequence:** **any time code needs to programmatically reflect
model state into a UI control that has a connected handler meant only for
*user-initiated* changes, that programmatic update must have its signals
blocked.** This is not a one-off fix for this one slider — it's a general
rule for the rest of Forge: the Inspector panel (Phase 7) will face the
exact same shape of problem the moment it needs to display a
`GameObject`'s current values in editable fields *and* let the user type
into those same fields to change them.

---

## 7. Exercise

**Predict:** If `set_frame`'s `self._elapsed_ms = 0.0` reset were removed,
and the user scrubs to frame 2 while `_elapsed_ms` happens to already be
`140` (out of a `frame_duration_ms` of `150`) from before scrubbing
started, what would you expect to happen within the next ~10ms of
playback resuming? Trace it through `update()`'s `while` loop.

**Modify:** Add a `frame_changed` custom `Signal(int)` to `AnimationClip`
... except `AnimationClip` is a plain `@dataclass`, not a `QObject` — Qt
signals require inheriting from `QObject`. Explain, in a sentence or two,
why this means `AnimationClip` cannot gain a Qt signal without a design
change, and propose one option consistent with Lesson 6's adapter pattern
(hint: where does `RenderSprite` already sit between `AnimationClip` and
the rest of the Qt-facing code?).

**Break:** Reintroduce the Trap section's bug on purpose (remove
`QSignalBlocker` from `sync_from_clip`), then add a `print` inside
`_on_slider_moved` showing `self.clip.playing` each time it's called.
Watch the console during normal playback. Does the printed pattern match
what Section 6 predicted?

**Trace:** Suppose `sync_from_clip` used `self.slider.blockSignals(True)`
/ `self.slider.blockSignals(False)` (Section 4's manual form) instead of
`QSignalBlocker`, and an exception happened to be raised between those two
lines (contrived, but possible). What state would the slider be left in
afterward, and why does `QSignalBlocker`'s `with`-block form avoid that
specific failure mode?

---

## What to remember
1. `QSlider.setValue()` (and Qt setters generally) fire their change signal regardless of whether a user or your own code caused the change — Qt has no built-in "who caused this" distinction.
2. When two different actors can both set the same piece of state (automatic playback vs. manual scrubbing), pick one flag as the single source of truth (`playing`) and gate the automatic path behind a guard clause.
3. Programmatic updates to a UI control that has a connected "user changed this" handler must have their signals blocked, or the update can re-trigger that handler and fight itself.
4. `QSignalBlocker` is the safer, exception-proof alternative to manual `blockSignals(True)`/`blockSignals(False)` pairs.
5. Plain `@dataclass`es cannot emit Qt signals directly — that requires inheriting from `QObject`, which is part of why adapter classes (Lesson 6's `RenderSprite`) exist at the boundary between plain Python data and Qt-facing code.

## Next lesson
Lesson 11 begins Phase 7: the `Node`/scene-graph system — parent-child
`GameObject` hierarchies, and the Inspector panel that reads a
`GameObject`'s fields via `dataclasses.fields()` to auto-generate editable
rows, which is where Lesson 3's type hints and Lesson 8's undo commands
finally meet in one feature.
