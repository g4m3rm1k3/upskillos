# Lesson 16 — Keyframe Animations & a Real Loading Screen

## What you'll learn
- `@keyframes` — animations with multiple stages, not just a single start/end like `transition`
- The `animation` shorthand and its individual properties (`infinite`, `iteration-count`, direction)
- Building an actual spinner from `rotate` + `linear` + `infinite`
- Building a skeleton-loading screen using a looping gradient sweep — a real, common production pattern

## What you'll build
Two loading indicators: a classic spinning-circle loader, and a
skeleton-loading placeholder (the gray "shimmer" boxes you've seen on sites
like LinkedIn or YouTube while content loads).

## The question
Lesson 15's `transition` only ever went from one state to another, once,
triggered by something like `:hover`. A loading spinner has no "hover" —
it just spins, continuously, forever, with no trigger at all. What CSS
feature animates something on its own, without needing a state change to
kick it off?

## 1. Predict

You already know `transform: rotate(...)` (Lesson 15's exercise briefly
touched it). If something needs to rotate *continuously*, forever, predict:
would `transition` alone ever be able to do this, given that `transition`
only fires once per value change? What would need to be different?

## 2. Try it — the spinner

```html
<style>
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #eee;
    border-top-color: steelblue;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
<div class="spinner"></div>
```

### What this code does

**`@keyframes spin { from { ... } to { ... } }`**
- Defines a **named animation sequence**, independent of any element — this
  block, by itself, does nothing until something references it by name
  (`spin`). `from`/`to` are shorthand for `0%`/`100%` — the animation's
  start and end states. (You'll use more than two stages below.)
- `transform: rotate(0deg)` to `rotate(360deg)` — one full rotation, start
  to finish.

**`animation: spin 1s linear infinite;`**
- Shorthand combining: **which** `@keyframes` block to use (`spin`), **how
  long** one cycle takes (`1s`), **what timing curve** (`linear` — same
  concept as Lesson 15's `transition-timing-function`, applying here too),
  and **how many times to repeat** (`infinite`).
- **This directly answers your Predict question**: `animation` doesn't need
  a triggering state change at all — unlike `transition`, which only reacts
  to a property changing (like `:hover`), `@keyframes` + `animation`
  describes self-contained motion that starts as soon as the element
  exists on the page and — with `infinite` — never stops on its own.

**`linear` timing here specifically**
- For a continuous rotation, `linear` is almost always the right choice —
  any easing curve would make the spin visibly speed up and slow down at
  the seam where one rotation ends and the next begins, which reads as
  stuttering rather than smooth continuous motion. This is a case where
  Lesson 15's "ease feels more natural" default is specifically *wrong* —
  worth noticing that the right timing function depends on what's actually
  moving, not a universal rule.

**`border-top-color: steelblue`** (while the rest of `border` is `#eee`)
- A plain CSS trick, no animation involved: setting only the *top* border's
  color differently from the other three sides is what makes the rotating
  circle look like it has a moving "gap" — the color itself never changes,
  only the whole element's rotation, but visually it reads as continuous
  motion around the circle.

## 3. Why — more than two stages

```css
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}
```

**Percentage-based stages**
- Unlike `transition`, which only ever has a start and end, `@keyframes`
  can define **any number of intermediate stages**, each as a percentage of
  the total animation duration. `0%`/`50%`/`100%` here means: full opacity
  at the start, fade to 40% at the halfway point, back to full by the end —
  producing a breathing/pulsing effect rather than a one-directional
  change.
- Each stage can set **multiple properties at once** — a single `%` block
  isn't limited to one property, exactly like a single ruleset anywhere
  else in CSS.

## 4. Change one thing

```diff
   .spinner {
     ...
-    animation: spin 1s linear infinite;
+    animation: spin 1s linear infinite reverse;
   }
```

**What changed:** added `reverse` to the shorthand.
**What did not change:** the `@keyframes` definition itself — `spin` still
goes from `0deg` to `360deg`.
**Predict, then verify**: `reverse` doesn't require rewriting the keyframes
backward — it tells the *animation* to play the existing keyframes
start-to-end, then end-to-start, alternating... actually, plain `reverse`
(not `alternate`) simply plays the whole sequence backward every cycle:
the spinner rotates counter-clockwise instead of clockwise, using the exact
same `@keyframes` block unmodified. This shows `@keyframes` and the
`animation` shorthand's direction control are genuinely separate concerns —
the same keyframe sequence, played different directions, without touching
the keyframes at all.

## 5. Put it in the project — a skeleton loading screen

```html
<div class="skeleton-card">
  <div class="skeleton-line skeleton-title"></div>
  <div class="skeleton-line"></div>
  <div class="skeleton-line short"></div>
</div>
```

```css
.skeleton-line {
  height: 14px;
  margin-bottom: 10px;
  border-radius: 4px;
  background: linear-gradient(90deg, #eee 25%, #ddd 50%, #eee 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
.skeleton-title { height: 20px; width: 60%; }
.skeleton-line.short { width: 40%; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Code walkthrough

**`background: linear-gradient(90deg, #eee 25%, #ddd 50%, #eee 75%);`**
- A gradient with a distinctly lighter band (`#ddd`) in the middle,
  surrounded by the base color (`#eee`) — this is the "shine" band that
  will visually sweep across the element.

**`background-size: 200% 100%;`**
- Makes the gradient **twice as wide** as the element itself. This matters
  because of what happens next — with a gradient exactly the element's own
  width, there'd be no room to "slide" it anywhere.

**`background-position: 200% 0;`** → **`background-position: -200% 0;`**
(the two keyframe stages)
- `background-position` shifts *where* the (now-oversized) gradient sits
  relative to the element's visible box. Animating it from `200%` to
  `-200%` slides the entire oversized gradient — including its lighter
  "shine" band — smoothly from fully off-screen on the right to fully
  off-screen on the left, passing across the visible element in between.
  **This is the entire mechanism behind the shimmer effect**: nothing about
  the element's actual size or shape changes — only *which portion* of a
  wider-than-needed gradient is currently visible, sweeping over time.

**`ease-in-out` here, not `linear`**
- Unlike the spinner (where `linear` avoided a stutter at the loop seam), a
  shimmer sweep reads as more natural with a slight ease — worth comparing
  directly against `linear` yourself as an exercise below, since "which
  timing function suits which animation" is a judgment call this lesson
  wants you to start developing intuition for, not a fixed rule to
  memorize.

### What happens

Every 1.5 seconds, the oversized gradient's visible window slides fully
across each skeleton line, producing the light-sweep effect real loading
screens use — all without JavaScript, without images, and without any
trigger at all; it starts the instant the element exists on the page and
loops forever until you remove the element (e.g. once real content has
actually loaded, typically by conditionally rendering the skeleton only
while `isLoading` is true — directly connecting back to Lesson 11's
`isLoading` state).

## 6. Trap

Predict, then test: change `background-size: 200% 100%;` to
`background-size: 100% 100%;` (matching the element's own size exactly),
keeping the keyframes unchanged.

Run it. **The trap: with the gradient exactly the element's own size, there
is no extra room for `background-position` to slide through** — the
"shine" band either stays static or snaps abruptly rather than sweeping
smoothly, because the animation is moving a viewing window that's now the
*same size* as the whole gradient, leaving nothing partially offscreen to
reveal gradually. The oversized `background-size` isn't a decorative
choice — it's the mechanical requirement that makes the sweep possible at
all.

## 7. Exercise

- **Predict:** If `@keyframes spin` used `50% { transform: rotate(180deg); }`
  as a third explicit stage (between `0%` and `100%`), would the visible
  rotation look any different from the current two-stage version? Reason
  about it before testing (hint: is `180deg` at the halfway point of a
  linear `0→360` rotation already implied, or does adding it change
  anything?).
- **Modify:** Change the shimmer's timing function to `linear` and compare
  directly against `ease-in-out` — which feels more like a "real" loading
  shimmer to you, and can you articulate why in terms of the curve's shape
  (Lesson 15)?
- **Break:** Remove `infinite` from the spinner's `animation` shorthand.
  What happens after the first rotation completes?
- **Trace:** For the skeleton shimmer, write out what `background-position`
  equals at 0%, 50%, and 100% of one cycle, and roughly where the light
  band should be visually at each point.

## What to remember
- `@keyframes` + `animation` runs on its own, without needing a triggering
  state change — the core difference from `transition`.
- Keyframes can have any number of percentage-based stages, each setting
  multiple properties, not just a single start/end.
- The skeleton shimmer's mechanism is entirely `background-size` (oversized
  gradient) + animated `background-position` (sliding the visible window)
  — no JS, no image assets.
- The right timing function depends on what's moving — `linear` for
  seamless continuous loops (spinners), easing for anything that should
  feel like it's decelerating naturally.

## Next lesson
Lesson 17 shifts away from animation entirely, into native `<form>`
behavior — input types, validation, and why forms reload the page by
default, laying the groundwork Lesson 18 needs to submit one via AJAX
instead.
