# Lesson 29 — 3D Transforms

## What you'll learn
- `perspective` — what it actually simulates, and why nothing looks 3D
  without it
- `rotateX`/`rotateY`/`rotateZ` — rotating around each of the three axes,
  and why `rotateZ` is really just Lesson 23's 2D `rotate()` under a new
  name
- `transform-style: preserve-3d` — why nested 3D transforms silently
  flatten back to 2D without it
- `matrix3d(...)` — the 3D generalization of Lesson 23's `matrix()`, a 4×4
  grid instead of a 3×3 one

## What you'll build
A card that flips in 3D (rotating around its vertical axis, revealing a
"back" face), and a small cube built from six flat `<div>`s positioned in
3D space.

## The question
Lesson 23 established that every 2D transform is one 3×3 matrix. A screen
is flat — so what does "3D" even mean here, and what has to be simulated
that a flat screen can't do for free?

## 1. Predict

Hold a real object — a book, a phone, anything nearby — and tilt it away
from you. Notice: the far edge doesn't just get smaller by the same amount
as the near edge — it appears to recede, shrinking *more* the further away
it gets. Predict: does a plain `rotateY()` alone, with nothing else added,
reproduce this "far edge shrinks more" effect on a flat screen, or does
something additional need to happen first?

## 2. Try it

```html
<style>
  .stage {
    width: 200px;
    height: 200px;
  }
  .flatCard {
    width: 200px;
    height: 200px;
    background: steelblue;
    transform: rotateY(45deg);
  }
</style>
<div class="stage">
  <div class="flatCard"></div>
</div>
```

### What this code does

**`transform: rotateY(45deg);`** — with no `perspective` anywhere
- Run this. **The card doesn't look tilted in 3D at all — it just looks
  squashed horizontally**, like a flat, evenly-compressed rectangle. This
  directly answers your Predict question: `rotateY` alone does rotate the
  element mathematically, in 3D space, but without a **perspective**
  applied anywhere, the browser has no notion of "closer things look
  bigger" to apply — every point rotates correctly in 3D, but they're all
  then projected onto the flat screen *without* the "far edge shrinks
  more" distortion your real held object showed.

## 3. Why — `perspective`

```css
.stage {
  width: 200px;
  height: 200px;
  perspective: 500px;
}
.flatCard {
  width: 200px;
  height: 200px;
  background: steelblue;
  transform: rotateY(45deg);
}
```

**`perspective: 500px;`** (on the **parent**, `.stage`, not the rotating
element itself)
- This is the single property answering your Predict question fully.
  `perspective` establishes an imaginary **viewing distance** — think of it
  as "how far your eye is from the screen" — that the browser then uses
  when rendering any 3D-transformed *children* of this element. A
  **smaller** `perspective` value (closer viewing distance) produces a
  **more exaggerated** 3D effect (more dramatic size difference between
  near and far edges); a **larger** value produces a subtler, flatter-
  looking effect — worth testing directly by trying `perspective: 100px`
  versus `perspective: 2000px` on the same rotated card.
- **Why on the parent, not the element being rotated?** `perspective` sets
  up the "camera" for an entire 3D scene of potentially multiple children —
  placing it on the parent lets multiple 3D-transformed children all share
  the same consistent viewing distance/vanishing point, the same way a real
  camera has one consistent viewpoint for everything it photographs, not a
  separately-configured lens per object in the scene.

### What happens

With `perspective` present, the same `rotateY(45deg)` now genuinely looks
tilted in 3D — the edge rotating away from the viewer visibly shrinks more
than the near edge, exactly matching the real-object intuition from your
Predict question.

## 4. Change one thing

```diff
 .stage {
   width: 200px;
   height: 200px;
-  perspective: 500px;
+  perspective: 150px;
 }
```

**What changed:** the viewing distance, much closer.
**What did not change:** the rotation itself, still exactly `45deg`.
**Predict, then verify**: the card now looks **far more dramatically
distorted** — the near edge appears significantly larger relative to the
far edge, an exaggerated, almost fisheye-like effect. This is worth
connecting back to real cameras: a very close/wide-angle lens produces
exactly this kind of exaggerated perspective distortion; a long telephoto
lens (large `perspective` value here) produces a much flatter, less
exaggerated look — the same physical relationship, simulated in CSS.

## 5. Put it in the project — a flipping card

```html
<style>
  .cardStage {
    width: 200px;
    height: 280px;
    perspective: 800px;
  }
  .cardInner {
    width: 100%;
    height: 100%;
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.6s;
  }
  .cardStage:hover .cardInner {
    transform: rotateY(180deg);
  }
  .cardFace {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    border-radius: 12px;
  }
  .cardFront { background: steelblue; }
  .cardBack {
    background: coral;
    transform: rotateY(180deg);
  }
</style>
<div class="cardStage">
  <div class="cardInner">
    <div class="cardFace cardFront">Front</div>
    <div class="cardFace cardBack">Back</div>
  </div>
</div>
```

### Code walkthrough

**`transform-style: preserve-3d;`** (on `.cardInner`)
- **This property is easy to skip and the result silently breaks if you
  do.** By default, an element's children are flattened into a single 2D
  plane before any *further* nested 3D transform is applied to them — so
  without `preserve-3d` here, `.cardFront`/`.cardBack` (children of
  `.cardInner`) would lose their own individual 3D positioning (their
  `rotateY(180deg)` on `.cardBack` specifically) the moment `.cardInner`
  itself rotates. `preserve-3d` tells the browser "keep this element's
  children genuinely positioned in 3D space, don't flatten them," which is
  required any time you nest 3D-transformed elements inside another
  3D-transformed element, as this card does.

**`.cardFace { position: absolute; ... }`** (both faces stacked in the
same spot)
- Both `.cardFront` and `.cardBack` occupy the *exact same* position
  (via `position: absolute` inside `.cardInner`, which is `position:
  relative`) — they're stacked directly on top of each other in space, not
  side by side. What makes only one visible at a time is entirely the next
  property.

**`backface-visibility: hidden;`**
- **This is the actual mechanism that hides whichever face is currently
  turned away from the viewer.** Every element has a "front" and "back"
  side in 3D space (the side facing the viewer, and the side facing away,
  determined by its current rotation) — by default, the back side is still
  rendered (you'd see a mirror-flipped version of the element if you
  rotated it 180°). `backface-visibility: hidden` makes an element
  disappear entirely once its back is what would be facing the viewer.
  Combined with `.cardBack`'s own baked-in `rotateY(180deg)` (so it starts
  already facing away, hidden, until the whole `.cardInner` rotates), this
  produces the illusion of one continuous card flipping to reveal a
  genuinely different face — actually two separate flat elements, each
  independently hidden/shown by their own current facing direction.

**`.cardStage:hover .cardInner { transform: rotateY(180deg); }`**
- On hover, `.cardInner` (the shared parent of both faces) rotates a full
  180° — carrying both children's absolute positions and rotations along
  with it, correctly, specifically because `preserve-3d` was set. The
  `transition: transform 0.6s;` (Lesson 15) animates this rotation
  smoothly rather than snapping instantly.

### What happens

Hovering the card rotates `.cardInner` 180° around its vertical axis;
`.cardFront` starts facing the viewer and rotates away (eventually hidden
by `backface-visibility`), while `.cardBack` — which started pre-rotated
180° and thus hidden — rotates into the position `.cardFront` vacated,
becoming visible. The `perspective` on `.cardStage` gives the whole flip a
genuine sense of depth rather than a flat horizontal squash.

## 6. Trap

Predict, then test: remove `transform-style: preserve-3d;` from
`.cardInner` only, keep everything else, and hover the card.

Run it. **The trap: the flip animation itself still runs, but the "back"
face never correctly appears — you either see the front face
mirror-flipped, or a blank/incorrect result, depending on the browser.**
This is the precise, visible consequence of the default flattening
behavior described above: without `preserve-3d`, `.cardInner`'s children
lose their individual 3D positioning the moment their parent is itself
inside a 3D transform context, collapsing back into a flat 2D plane before
`backface-visibility` and each face's own rotation ever get a chance to
matter. This is a genuinely common real bug in 3D CSS — remembering
`preserve-3d` on *every* intermediate parent in a nested 3D hierarchy,
not just the outermost one, is a real, recurring discipline.

## 7. Exercise

- **Predict:** If `.cardBack` did **not** have its own `rotateY(180deg)`
  baked in (just plain `.cardFace`, no extra rotation), what would you see
  on the "back" of the card after the flip — the correct back content, or
  something visually wrong? Reason about *why*, using
  `backface-visibility`'s actual rule, before testing.
- **Modify:** Build a six-sided cube from six `<div>`s, each positioned
  with `transform: rotateX(...)/rotateY(...) translateZ(...)` to place
  them as the cube's faces (research `translateZ` briefly — it moves an
  element directly toward/away from the viewer along the third axis,
  the natural 3D extension of `translateX`/`translateY`).
- **Break:** Change `rotateY(180deg)` (in both the hover rule and
  `.cardBack`) to `rotateX(180deg)`. Does the card still flip
  convincingly, and does the direction of the flip motion change in a way
  you'd expect?
- **Trace:** Explain, in your own words, why `perspective` belongs on the
  *parent* of a rotating element rather than on the rotating element
  itself — what would go wrong, conceptually, if every element set its own
  independent `perspective` value in a scene with multiple 3D-transformed
  siblings?

## What to remember
- `rotateX/Y/Z` alone rotate correctly in 3D math, but produce no visible
  depth/distortion without `perspective` set on a containing parent —
  `perspective` is what simulates "closer things look bigger."
- Smaller `perspective` values = closer viewing distance = more dramatic,
  exaggerated 3D distortion; larger values = flatter, subtler effect.
- `transform-style: preserve-3d` must be set on every intermediate parent
  in a nested 3D hierarchy, or children silently flatten back to 2D —
  a genuinely common, recurring bug.
- `backface-visibility: hidden` is the actual mechanism behind
  flip-card effects — hiding whichever face currently points away from
  the viewer, not some higher-level "flip" primitive.

## Next lesson
Lesson 30 covers quaternions — a different, more robust way to represent
3D rotation than `rotateX/Y/Z` chained together, which avoids a real
problem (gimbal lock) that chained axis rotations suffer from — directly
continuing the motivation behind your separate [[mesh-viewer-curriculum]]
project's free-rotation work.
