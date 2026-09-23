# Lesson 30 — CSS Shadows, Lighting & Reflections (the "Fake" Version)

## What you'll learn
- `box-shadow` — the six values that define it, and how multiple stacked
  shadows simulate soft, realistic light
- `filter: drop-shadow` — how it differs from `box-shadow`, and why one of
  them respects transparency and the other doesn't
- Faking a specular highlight (the bright "shine" spot on a glossy surface)
  with a gradient, not an image
- Building a reflection with `scaleY(-1)` and a fading mask — and being
  honest about exactly what this technique can't do

## What you'll build
A card with a soft, realistic-looking drop shadow; a glossy button with a
fake specular highlight; and an image with a fading reflection beneath it —
all pure CSS, no 3D, no real light simulation.

## The question
A real shadow isn't a hard-edged gray rectangle offset from an object — it's
soft, it fades, and it's shaped roughly like the object casting it. `
box-shadow: 5px 5px black;` produces exactly a hard-edged gray rectangle.
What's actually needed to make a CSS shadow look convincing rather than
obviously fake?

## 1. Predict

Look at a real shadow near you right now — a shadow from an object on a
desk, or your own hand's shadow on a wall. Predict: is its edge sharp and
uniform all the way around, or does it look different (blurrier, fainter)
the further the shadow extends from the object? What single CSS value do
you think would need to change to capture that difference?

## 2. Try it

```css
.card {
  width: 200px;
  height: 120px;
  background: white;
  border-radius: 8px;
  box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.2);
}
```

### What this code does

**`box-shadow: offsetX offsetY blurRadius color;`**
- `0px` (offsetX) — no horizontal shift; the shadow sits directly below
  the card, not to either side.
- `10px` (offsetY) — shifts the shadow 10px **down**, simulating a light
  source positioned above the card (shadows fall opposite the light).
- `20px` (**blurRadius**) — **this is the direct answer to your Predict
  question.** Without a blur radius, `box-shadow` produces the hard-edged
  rectangle you'd expect from a flat, uniform color fill. A blur radius
  spreads and softens the shadow's edge, fading it out gradually — this
  single value is what separates an obviously-fake shadow from a
  convincing one, and it exists specifically because real shadows are
  never perfectly sharp (light sources aren't infinitely small points, and
  ambient light fills in shadow edges).
- `rgba(0, 0, 0, 0.2)` — black at only 20% opacity, not solid black. Real
  shadows are rarely pure black; they're a *darkening* of whatever's
  underneath, which partial transparency simulates far better than a solid
  gray/black fill would.

## 3. Why — stacking multiple shadows for realism

```css
.realisticCard {
  width: 200px;
  height: 120px;
  background: white;
  border-radius: 8px;
  box-shadow:
    0px 1px 2px rgba(0, 0, 0, 0.07),
    0px 4px 8px rgba(0, 0, 0, 0.07),
    0px 12px 24px rgba(0, 0, 0, 0.1);
}
```

**Three comma-separated shadow values, applied to one element**
- `box-shadow` accepts a **comma-separated list**, exactly like Lesson
  15's `transition` did — every shadow in the list renders simultaneously,
  layered on top of each other.
- **Why three shadows instead of one?** A real shadow isn't uniform —
  it's actually the sum of many subtle light-blocking effects at different
  distances: a tight, barely-blurred **contact shadow** right where the
  object meets the surface (here, the first value: 1px offset, 2px blur,
  very tight); a medium shadow a bit further out (the second value); and a
  soft, wide, faint shadow reaching furthest (the third value, largest
  blur). **Layering shadows at increasing offset/blur/decreasing opacity
  is a real, standard technique** (used throughout professional design
  systems, not invented for this lesson) precisely because a single
  shadow, however well-tuned, can't capture this multi-distance falloff
  that real light produces.

### Mental model

```
single box-shadow:       tight, uniform fade — looks like a flat blur
multiple stacked shadows: contact shadow (tight) + mid shadow + ambient
                           shadow (wide, faint) — looks like real light
```

## 4. Change one thing

```diff
   box-shadow:
     0px 1px 2px rgba(0, 0, 0, 0.07),
     0px 4px 8px rgba(0, 0, 0, 0.07),
-    0px 12px 24px rgba(0, 0, 0, 0.1);
+    0px 24px 48px rgba(0, 0, 0, 0.15);
```

**What changed:** only the widest, most ambient shadow layer — pushed
further out, more blurred, slightly more opaque.
**What did not change:** the tight contact shadow and mid shadow layers.
**Predict, then verify**: the card now reads as **floating higher above
its surface** — a larger, softer, more offset ambient shadow is exactly
the visual cue real perception uses to judge "how far above the surface is
this object," independent of the object's own size. This is worth
noticing precisely: you changed one number-set out of three, and it
altered a specific, describable quality of the effect (apparent height)
without touching the others (apparent surface contact, which the first
two layers still control).

## 5. Put it in the project — `filter: drop-shadow`, and why it's different

```css
.iconWithTransparency {
  filter: drop-shadow(0px 6px 10px rgba(0, 0, 0, 0.3));
}
```

**`filter: drop-shadow(...)` vs. `box-shadow`**
- Same-looking arguments (offset, blur, color), genuinely different
  behavior: `box-shadow` always shadows the element's **box** — its
  rectangular bounding area — regardless of what's actually visually drawn
  inside it. If the element is a PNG icon with transparent regions,
  `box-shadow` still produces a shadow shaped like the icon's full
  rectangle, ignoring the transparency entirely.
- `filter: drop-shadow(...)` instead shadows the element's **actual
  rendered, non-transparent pixels** — for a transparent PNG icon, this
  produces a shadow shaped like the visible icon itself, not its bounding
  box. **This is the concrete, practical reason to reach for `filter:
  drop-shadow` specifically**: any time the element has real transparency
  (icons, cutout shapes, text) where a bounding-box shadow would look
  visibly wrong.

## 6. A fake reflection

```html
<style>
  .reflectedImage {
    width: 200px;
    display: block;
  }
  .reflectionCopy {
    width: 200px;
    display: block;
    transform: scaleY(-1);
    mask-image: linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 70%);
    -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 70%);
  }
</style>
<img class="reflectedImage" src="photo.jpg">
<img class="reflectionCopy" src="photo.jpg">
```

**`transform: scaleY(-1);`** (Lesson 23's scale matrix, with a negative
value)
- Recall Lesson 23's exercise: a **negative** scale factor flips an
  element across that axis. `scaleY(-1)` flips the duplicate image
  **vertically** — upside down — which is the geometric basis of any
  reflection: a mirrored copy, flipped across the boundary between object
  and reflection.

**`mask-image: linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 70%);`**
- A **CSS mask** (new here) uses a gradient's *opacity* to control the
  masked element's own visibility, pixel by pixel — wherever the mask
  gradient is more opaque, more of the underlying element shows; wherever
  it's more transparent, less shows. Here: `rgba(0,0,0,0.35)` (35% opaque)
  at the top of the flipped copy — closest to the real image, where a real
  reflection would be strongest — fading to fully `transparent` by 70% of
  the way down. **This produces the classic fading-reflection look**,
  purely from masking a flipped, otherwise-ordinary duplicate image.
- `-webkit-mask-image` — a **vendor-prefixed** duplicate of the same
  property (new concept here), included because `mask-image` support has
  historically been inconsistent across browsers without the prefixed
  version also present — a real, practical browser-compatibility detail
  worth knowing exists, not unique to this one property.

### What this technique cannot do, honestly

This reflection is a **flipped, faded duplicate image** — it does not
actually simulate light bouncing off any surface. It won't correctly
reflect anything that moves independently (an animated element reflecting
in real time requires re-rendering the reflected content continuously, not
just this one static flip), and it can't reflect a *different* angle of
the same object the way a real mirror or real water would. **This is
worth stating plainly rather than glossing over**: it's a convincing trick
for a specific, common case (a static image with a reflection beneath it),
not a general reflection *simulation* — the next lesson's real 3D
rendering is what handles genuine, physically-based reflections.

## 7. Trap

Predict, then test: apply `filter: drop-shadow(...)` **and** `box-shadow`
to the *same* element simultaneously, where the element also has
`border-radius` and is rotated via `transform: rotate(20deg)`.

Run it. **The trap, worth confirming directly: `box-shadow` respects
`border-radius` (the shadow's corners are rounded to match) but does
**not** automatically follow a `transform: rotate(...)` applied to the
same element in every way you might expect** — actually, `box-shadow` DOES
rotate along with the element (since `transform` affects the entire
rendered box, shadow included) — but a shadow computed *before* other
sibling elements or z-index stacking can still end up rendering in an
unexpected paint order relative to overlapping elements, especially once
multiple shadowed, rotated, overlapping elements are involved. **The
practical lesson: complex combinations of shadow + transform + stacking
context are worth testing directly in your actual browser rather than
assumed from general CSS reasoning** — this area of CSS has enough
interacting rules (paint order, stacking contexts, filter's own separate
compositing behavior) that "trust but verify visually" is a genuinely
correct engineering habit here, not a cop-out.

## 8. Exercise

- **Predict:** For the `reflectionCopy` mask gradient, if you changed
  `transparent 70%` to `transparent 30%`, would the reflection appear to
  fade out faster or slower, over a shorter or longer distance?
- **Modify:** Build a "pressed button" effect using an **inset** shadow
  (`box-shadow: inset 0px 2px 4px rgba(0,0,0,0.3);` — research the `inset`
  keyword briefly) instead of the outward shadows used throughout this
  lesson — notice how the same property, with one added keyword, produces
  a shadow that appears to carve *into* the surface rather than lift an
  object above it.
- **Break:** Remove the `mask-image` (and `-webkit-mask-image`) from
  `.reflectionCopy`, keeping the `scaleY(-1)` flip. What do you see
  instead of a fading reflection?
- **Trace:** For the three-layer stacked shadow in Section 3, describe in
  your own words what visual role each of the three layers plays
  (contact/mid/ambient) — then remove just the middle layer and describe,
  concretely, what specifically looks different about the result.

## What to remember
- `box-shadow`'s blur radius, not its offset or color, is what separates a
  convincing shadow from an obviously flat rectangle — soft edges are the
  actual visual cue for realism.
- Layering multiple shadows at increasing offset/blur and decreasing
  opacity simulates the multi-distance falloff of real light — a standard
  professional technique, not a one-off trick.
- `filter: drop-shadow` respects transparency (shadows the actual visible
  pixels); `box-shadow` always shadows the full rectangular box regardless
  of what's drawn inside it.
- A CSS "reflection" (flipped duplicate + fading mask) is a convincing but
  fundamentally static illusion — it doesn't simulate real light, and
  knowing that limitation is as important as knowing the technique itself.

## Next lesson
Lesson 31 is where "fake" stops being enough: loading an actual 3D model
file and lighting it with real shadow maps and real environment
reflections in Three.js — the same engine your [[mesh-viewer-curriculum]]
project already uses, now specifically for lighting/shadows/reflections
rather than camera controls.
