# Lesson 20 — Trigonometry I: Sine/Cosine Motion

## What you'll learn
- What `sin`/`cos` actually output, geometrically — not just "a wavy number"
- Radians vs. degrees, and why JavaScript's `Math` functions only speak radians
- Using `sin` to drive a smooth bobbing motion, and `sin`+`cos` together to drive circular orbit motion
- Why this is a fundamentally different technique from every animation so far — computed every frame from a formula, not from CSS keyframes/transitions at all

## What you'll build
A dot that bobs up and down smoothly (sine wave), then a second version
where it orbits in a circle (sine + cosine together) — both driven by a
`requestAnimationFrame` loop computing position directly from math, not CSS.

## The question
Lesson 15's `cubic-bezier` curves move a value from a fixed start to a fixed
end, once. What if you want something that oscillates back and forth
*forever*, smoothly, without ever really "finishing" — like a buoy bobbing
on water? What kind of function naturally repeats itself, smoothly, forever?

## 1. Predict

Picture the position of a point going around a circle, then imagine
tracking *only its height* (ignore its left-right position entirely) as it
goes around, over and over. Predict: would a graph of "height over time" for
that point be a smooth repeating wave, a straight zigzag, or something
else?

(If your intuition says "smooth repeating wave" — that's exactly correct,
and it's not a metaphor: that literal graph *is* the sine function.)

## 2. Try it

```html
<style>
  #dot {
    position: absolute;
    width: 20px;
    height: 20px;
    background: steelblue;
    border-radius: 50%;
  }
</style>
<div id="dot"></div>

<script>
  const dot = document.getElementById("dot");
  const centerY = 150;
  const amplitude = 80;

  function loop(timestamp) {
    const t = timestamp / 1000;
    const y = centerY + amplitude * Math.sin(t);
    dot.style.transform = "translateY(" + y + "px)";
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
</script>
```

### What this code does

**`Math.sin(t)`**
- `Math.sin` takes an angle and returns a number **always between -1 and
  1**, describing that angle's position on a specific wave pattern. This is
  the single fact everything else in this lesson builds on: no matter what
  you pass in, the output never exceeds this range.
- **Crucially: `Math.sin` expects its input in radians, not degrees.**
  JavaScript's `Math` object has no concept of degrees at all — this is
  worth stating plainly since it's a very common early confusion. A full
  circle is `2 * Math.PI` radians (roughly 6.28), not 360.

**`const t = timestamp / 1000;`**
- `timestamp` — the parameter `requestAnimationFrame` automatically passes
  to your callback: milliseconds elapsed since the page loaded (a browser
  built-in you haven't used explicitly before, though `loop` always had
  access to it). Dividing by `1000` converts to **seconds**, which is
  mostly just to make the numbers involved easier to reason about — the
  math would work with any consistent unit, but "how many radians have
  passed per second" is more intuitive to tune than "per millisecond."
- **This is the reason this technique differs fundamentally from every
  earlier animation lesson**: `y`'s value here isn't stored anywhere
  between frames at all — it's **recomputed fresh, every single frame,
  directly from the current time**. Compare to Lesson 5's Pong, which
  *accumulated* position by adding velocity each frame
  (`this.x += this.speedX`) — this lesson's `y` has no memory of the
  previous frame whatsoever; it's a pure function of `t`.

**`centerY + amplitude * Math.sin(t)`**
- `Math.sin(t)` alone oscillates between exactly `-1` and `1` — not useful
  pixel values on its own. `amplitude` (80) **scales** that range up to
  `-80` to `80`. `centerY` (150) **shifts** the whole oscillating range so
  it's centered around pixel `150` instead of `0`. Together:
  `y` oscillates smoothly between `70` and `230` — this three-part
  shift/scale pattern (base value + scale × wave) is the general template
  you'll reuse for every sine-driven animation from here on.

**`dot.style.transform = "translateY(" + y + "px)";`**
- Setting an inline style directly via JS, every frame — a new technique
  compared to Lessons 1-13's DOM manipulation, which mostly changed
  `textContent`/classes rather than inline `style` values directly. This
  works, but note it bypasses CSS entirely — there's no `transition` or
  `@keyframes` involved at all; the smoothness you see comes entirely from
  `requestAnimationFrame` running ~60 times per second, each time
  computing a slightly different `y` from a slightly larger `t`.

### What happens

Every frame, `loop` reads the current elapsed time, computes where along
the sine wave that time corresponds to, converts that to a pixel position,
and sets it directly — producing smooth, continuous up-and-down bobbing
that never "finishes," directly answering your Predict question: this is
the literal shape of `sin`, not an approximation of one.

## 3. Why — adding cosine for circular motion

```js
function loop(timestamp) {
  const t = timestamp / 1000;
  const x = centerX + radius * Math.cos(t);
  const y = centerY + radius * Math.sin(t);
  dot.style.transform = "translate(" + x + "px, " + y + "px)";
  requestAnimationFrame(loop);
}
```

**`Math.cos(t)` for `x`, `Math.sin(t)` for `y`, same `t`**
- This is the core trigonometric fact this lesson exists to make concrete:
  **a point at angle `t` around a circle of radius `r`, centered at
  `(centerX, centerY)`, is always at position
  `(centerX + r * cos(t), centerY + r * sin(t))`.** This isn't a
  CSS/JS-specific trick — it's the actual mathematical definition of sine
  and cosine, going back to their original geometric meaning (a point's
  horizontal and vertical position on a **unit circle** — a circle of
  radius 1 — at a given angle).
- Using the *same* `t` for both `sin` and `cos` is what makes them trace a
  circle together rather than moving independently — this directly answers
  your Predict question's deeper implication: cosine is that same circular
  point's *horizontal* position, exactly as sine was its vertical one.

**`translate(x, y)`** (both axes at once, single `transform` value)
- `translate(x, y)` is `transform`'s two-argument form, equivalent to
  `translateX(x) translateY(y)` combined — worth knowing both forms exist,
  interchangeable here.

## 4. Change one thing

```diff
   function loop(timestamp) {
     const t = timestamp / 1000;
-    const x = centerX + radius * Math.cos(t);
-    const y = centerY + radius * Math.sin(t);
+    const x = centerX + radius * Math.cos(t * 2);
+    const y = centerY + radius * Math.sin(t);
```

**What changed:** `x` now uses `t * 2` while `y` still uses plain `t`.
**What did not change:** the formula's shape — still center + radius ×
trig function.
**Predict, then verify**: multiplying the angle input makes that axis cycle
**twice as fast** as the other — instead of a circle, the dot traces a
**figure-eight-like pattern** (specifically, a Lissajous curve — a real,
named mathematical curve family, worth knowing the term exists even without
deriving it fully here). This is a direct, concrete demonstration that
"same formula, different rate on each axis" produces qualitatively
different shapes, not just faster/slower versions of the same motion.

## 5. Put it in the project

```js
const dot = document.getElementById("dot");
const centerX = 200;
const centerY = 150;
const radius = 80;
const speed = 1.5;

function loop(timestamp) {
  const t = (timestamp / 1000) * speed;
  const x = centerX + radius * Math.cos(t);
  const y = centerY + radius * Math.sin(t);
  dot.style.transform = "translate(" + x + "px, " + y + "px)";
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
```

**`const speed = 1.5;` ... `const t = (timestamp / 1000) * speed;`**
- A single, isolated multiplier controlling how fast `t` advances relative
  to real elapsed time — `speed = 1` matches real seconds directly (one
  full orbit every `2π` seconds, roughly 6.28s); `speed = 2` doubles the
  rate, completing an orbit in roughly half the time. This is the
  cleanest, most tunable version of "how fast does this move" you've built
  in this entire series — a single named constant, isolated from the
  geometry (`centerX`/`centerY`/`radius`) it drives.

### What happens

The dot orbits continuously around `(200, 150)` at a radius of 80px,
completing roughly one full circle every ~4.2 seconds (`2π / 1.5`) — purely
computed, frame by frame, from elapsed time and two trig function calls,
with zero CSS animation involved.

## 6. Trap

Predict, then test: change `Math.cos(t)` to `Math.cos(t) * 2` (doubling
just the `x` calculation's *output*, not scaling `radius` itself), keeping
`y` as `radius * Math.sin(t)` unchanged.

Run it. **The trap: the dot no longer traces a circle — it traces an
ellipse, wider than it is tall**, because `x`'s range is now effectively
`-160` to `160` (radius 80, doubled) while `y`'s stays `-80` to `80`. This
is worth noticing precisely: a circle specifically requires *both* axes to
share the *same* effective radius; independently scaling just one axis's
output — even though each axis's *individual* motion still looks like a
smooth wave on its own — breaks the specific relationship that made the
combined motion circular rather than elliptical. Circles and ellipses are
the same formula; only whether the two radii match differs.

## 7. Exercise

- **Predict:** If you swapped which function drives which axis —
  `Math.sin(t)` for `x`, `Math.cos(t)` for `y` — would the dot still trace
  a circle? Would it look any different to the eye? Reason about *why*
  before testing (hint: think about what "starting position," i.e. `t=0`,
  equals for each version).
- **Modify:** Build the bobbing dot (Step 2) again, but make `amplitude`
  itself slowly grow over time (e.g. `amplitude = 20 + t * 5`) — producing
  a bob that widens as time passes.
- **Break:** Set `radius` to a negative number. Does the dot still trace a
  circle? In which direction, and can you explain why using the formula
  rather than just observing it?
- **Trace:** For `t` values of `0`, `Math.PI / 2`, `Math.PI`, and
  `Math.PI * 1.5` (a quarter-circle apart each time), compute `cos(t)` and
  `sin(t)` by hand (or reasoning, not a calculator) and describe where on
  the circle the dot should be at each — top, bottom, left, or right.

## What to remember
- `Math.sin`/`Math.cos` take radians (`2π` = full circle), always return a
  value in `[-1, 1]` — scale with a multiplier, shift with an added base
  value, to map onto real pixel ranges.
- `(centerX + r·cos(t), centerY + r·sin(t))` is literally the definition of
  a point moving around a circle — not a trick, the actual geometric
  meaning of sine and cosine.
- This technique computes position fresh every frame from a time-based
  formula, with no CSS transition/animation involved at all — genuinely
  different from every prior animation lesson's mechanism.
- Independently scaling one axis's trig output (rather than the shared
  radius) turns a circle into an ellipse — the shared radius is what makes
  it circular specifically.

## Next lesson
Lesson 21 stays in trigonometry but shifts from *position* to
*orientation* — using `Math.atan2` to make an element rotate to actually
face a direction (like a clock hand, or an element pointing toward the
mouse), rather than just moving along a wave.
