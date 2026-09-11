# Lesson 22 — Vectors: Following & Parallax

## What you'll learn
- What a vector actually is: magnitude + direction, formalizing Lesson 21's informal `dx`/`dy`
- Magnitude via the Pythagorean theorem — the actual distance a `(dx, dy)` pair represents
- Normalization — turning any vector into a pure direction, magnitude stripped out
- Building smooth "chase" motion (an element that eases toward a target, never snapping) and a parallax scroll effect

## What you'll build
A dot that smoothly follows the mouse cursor — not snapping to it
instantly, but easing toward it every frame — plus a layered parallax
background that shifts at different rates as you scroll.

## The question
Lesson 21 computed `dx`/`dy` and immediately turned them into an *angle* via
`atan2`. But `(dx, dy)` contains more information than just an angle — it
also encodes a *distance*. If you wanted an element to move *toward* the
mouse, gradually, at a *controlled speed* — not just instantly rotate to
face it — what additional piece of information from `(dx, dy)` would you
need beyond the angle alone?

## 1. Predict

If `dx = 3` and `dy = 4`, predict: is there a way to compute a single
number representing the actual straight-line distance those two values
represent together — not the angle, a literal distance? (If you recall the
Pythagorean theorem from geometry, this is exactly it, applied to pixels
instead of a triangle's sides.)

## 2. Try it

```html
<style>
  #dot { position: absolute; width: 20px; height: 20px;
         background: steelblue; border-radius: 50%; left: 0; top: 0; }
</style>
<div id="dot"></div>

<script>
  const dot = document.getElementById("dot");
  let mouseX = 0, mouseY = 0;
  let dotX = 0, dotY = 0;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function loop() {
    const dx = mouseX - dotX;
    const dy = mouseY - dotY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    dotX += dx * 0.05;
    dotY += dy * 0.05;

    dot.style.transform = "translate(" + dotX + "px, " + dotY + "px)";
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
</script>
```

### What this code does

**`Math.sqrt(dx * dx + dy * dy)`**
- **This is the Pythagorean theorem, directly**: for a right triangle with
  legs `dx` and `dy`, the hypotenuse (the straight-line distance between
  the two points `dx`/`dy` were measured from) equals
  `√(dx² + dy²)`. `Math.sqrt` is JS's square root function; `dx * dx` is
  how you square a number in JS (there's no dedicated `²` operator — some
  languages have `**`, and JS actually does too: `dx ** 2` is equivalent,
  though `dx * dx` is at least as common in practice).
- This **magnitude** (length) is the piece of information Lesson 21's
  `atan2`-only approach discarded entirely — `atan2(dy, dx)` tells you
  *which direction* `(dx, dy)` points, but says nothing about *how far*.
  Together, magnitude + direction is the complete, formal definition of a
  **vector**: not just a pair of numbers, but a length and a heading,
  bundled as one quantity.
- **Note `distance` isn't actually used for anything in this specific
  code** — it's computed here deliberately, unused, purely so you can see
  it calculated in isolation before Step 3 puts it to work. Worth
  confirming for yourself, via `console.log(distance)`, that it does
  produce a sensible-looking pixel distance as the mouse moves.

**`dotX += dx * 0.05; dotY += dy * 0.05;`**
- **This is the actual "smooth follow" mechanism, and it doesn't use
  `distance` or any trig at all** — it directly answers your Predict
  question differently than you might expect: rather than needing the
  angle or magnitude explicitly, multiplying the *raw* `dx`/`dy` by a small
  fraction (`0.05`, meaning "close 5% of the remaining gap, every frame")
  produces smooth easing on its own. When the dot is far from the mouse,
  `dx`/`dy` are large, so it moves a proportionally large step; as it gets
  closer, `dx`/`dy` shrink, so the steps shrink too — naturally decelerating
  as it approaches, never overshooting, never needing an explicit "arrived"
  check.
- **This specific pattern — `current += (target - current) * factor` — is
  worth memorizing by shape, not just this one example**: it's one of the
  most common, useful small formulas in any animation code, and it
  reappears (formalized properly) as linear interpolation (`lerp`) in
  Lesson 27.

### What happens

Every frame, the gap between the dot's current position and the mouse's
current position shrinks by 5%, producing continuous, decelerating,
trailing motion — the dot chases the mouse but never quite catches up
completely (mathematically, it approaches but never exactly reaches zero
distance, though visually it appears to settle once the remaining gap
becomes sub-pixel).

## 3. Why — normalization

```js
const dx = mouseX - dotX;
const dy = mouseY - dotY;
const distance = Math.sqrt(dx * dx + dy * dy);

const dirX = distance === 0 ? 0 : dx / distance;
const dirY = distance === 0 ? 0 : dy / distance;

const speed = 3;
dotX += dirX * speed;
dotY += dirY * speed;
```

**`dx / distance`, `dy / distance`**
- **This is normalization**: dividing a vector's components by its own
  magnitude produces a new vector with the **exact same direction**, but a
  magnitude of **exactly 1** — called a **unit vector**. `dirX`/`dirY`
  together now represent *pure direction*, with all information about the
  original distance completely removed.
- **Why do this at all?** Because it decouples direction from speed
  entirely: `dirX * speed` moves exactly `speed` pixels per frame, **in the
  correct direction, regardless of how far away the mouse currently is.**
  Compare directly to Step 2's `dx * 0.05` — there, the *step size itself*
  was proportional to distance (large gap → large step), which is what
  produced the easing/deceleration feel. Here, with normalization, the step
  size is **constant** (always exactly `speed` pixels), so the dot moves at
  a **steady, unchanging speed** toward the mouse, arriving with no
  deceleration at all — genuinely different motion, and the direct,
  concrete payoff of understanding the difference between a raw vector and
  a normalized one.

**`distance === 0 ? 0 : dx / distance`**
- A guard against **division by zero**: if the dot and mouse are at the
  exact same position, `distance` is `0`, and `dx / 0` in JavaScript
  doesn't throw an error — it silently produces `Infinity` (or `NaN` if
  `dx` is also `0`), which would then corrupt `dotX` on the very next line.
  This ternary sidesteps that entirely by explicitly defining "no distance
  means no direction" as `0`, rather than letting `Infinity` leak into your
  animation state — a real, easy-to-miss edge case any normalization code
  needs to handle.

## 4. Change one thing

```diff
-const speed = 3;
+const speed = 3;
+const maxDistance = 100;
+const clampedDistance = Math.min(distance, maxDistance);
 dotX += dirX * speed;
 dotY += dirY * speed;
```

(The `clampedDistance` variable is computed but not yet used — this is
intentionally left as this lesson's exercise territory, not solved here.)

**What changed:** `Math.min(distance, maxDistance)` caps how large
`distance` is allowed to be treated as, without changing the actual real
`distance` value itself.
**What did not change:** the normalization formula, or `speed`.
**Worth noticing before the exercise below:** `Math.min(a, b)` — a built-in
function (new here) returning whichever of its arguments is smaller —
combined with a captured-but-unused variable, is deliberately left as a
half-finished thought: the exercise section asks you to actually use
`clampedDistance` to build speed that slows down only within `maxDistance`
of the target, a common real "arrival easing" pattern.

## 5. Put it in the project — parallax scroll

```html
<style>
  .layer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; }
  #back { background: lightblue; }
  #mid { background: none; }
  #front { background: none; }
</style>
<div id="back" class="layer"></div>
<div id="mid" class="layer"></div>
<div id="front" class="layer"></div>
<div style="height: 3000px;"></div>

<script>
  const back = document.getElementById("back");
  const mid = document.getElementById("mid");

  window.addEventListener("scroll", function () {
    const scrollY = window.scrollY;
    back.style.transform = "translateY(" + scrollY * 0.2 + "px)";
    mid.style.transform = "translateY(" + scrollY * 0.5 + "px)";
  });
</script>
```

**`window.scrollY`**
- A built-in property (new here) giving how many pixels the page has
  currently scrolled vertically.

**`scrollY * 0.2` vs `scrollY * 0.5`**
- Each layer moves at a **different fraction** of the actual scroll amount
  — this is the entire mechanism behind parallax: layers moving slower than
  real scroll speed (a fraction less than 1) appear farther away (since in
  real depth perception, distant objects appear to move less as you pass
  them); a layer using `scrollY * 1` would move exactly with the scroll,
  appearing at "normal" foreground depth; a fraction greater than 1 would
  move *faster* than scroll, appearing to rush toward the viewer — this
  connects directly back to Lesson 20's "scale a base quantity by a
  constant" template, just applied to `scrollY` instead of `sin(t)`.

## 6. Trap

Predict, then test: in the smooth-follow code (Step 3, normalized version),
move your mouse very quickly across the screen and back, repeatedly, then
stop moving it entirely and watch closely.

You may notice the dot doesn't perfectly settle exactly on the final mouse
position — it can visibly overshoot slightly or oscillate a pixel or two
before settling, especially at higher `speed` values. **The trap: this
version's constant-speed approach, unlike Step 2's proportional-easing
approach, has no built-in mechanism to slow down as it nears the target —
it moves exactly `speed` pixels toward the target every frame, potentially
stepping *past* the target and needing to visibly correct on the next
frame if `speed` is large relative to the remaining distance.** This is a
genuine, common tradeoff between the two techniques in this lesson: Step
2's proportional approach naturally decelerates (never overshoots, but
technically never fully "arrives" either) while Step 3's normalized
constant-speed approach moves at a steady, predictable rate (useful when
you want consistent velocity) but can overshoot a stationary target
depending on `speed`.

## 7. Exercise

- **Repair:** Use the `clampedDistance` variable from Section 4 to make
  `speed` itself shrink as the dot approaches (e.g.
  `const currentSpeed = speed * (clampedDistance / maxDistance);`),
  producing motion that moves at constant speed far away, but decelerates
  smoothly within `maxDistance`, combining both techniques from this
  lesson.
- **Predict:** In the parallax example, if `#front` were added with
  `scrollY * 1.5`, and it contained actual visible content (not `background:
  none`), would that content appear to scroll faster or slower than the
  page's normal scroll rate?
- **Modify:** Add a `distance` display (a `<p>` updated every frame) showing
  the live Pythagorean distance between dot and mouse, to directly observe
  the magnitude calculation working in real time.
- **Trace:** For `dx = 6, dy = 8`, compute `distance` by hand, then compute
  `dirX`/`dirY` by hand, and confirm `dirX² + dirY²` equals (very close to)
  `1` — the defining property of any unit vector, worth verifying
  concretely at least once rather than taking on faith.

## What to remember
- A vector is magnitude (`√(dx² + dy²)`, the Pythagorean theorem) +
  direction (the angle, or equivalently the normalized components) —
  Lesson 21 only ever used the direction half.
- `current += (target - current) * factor` is a general, reusable
  "ease toward a target" formula — worth recognizing by shape wherever it
  reappears.
- Normalizing (`dx / distance`, `dy / distance`) strips magnitude out,
  leaving pure direction — always guard against dividing by a zero
  distance.
- Proportional easing (Step 2) naturally decelerates but never fully
  arrives; constant normalized speed (Step 3) arrives at a steady rate but
  can overshoot — genuinely different tools for different feels, not one
  strictly better than the other.

## Next lesson
Lesson 23 moves from vectors to matrices — what `transform: matrix(...)`
actually encodes, and how `translate`/`scale`/`rotate` are all, underneath,
the same kind of mathematical operation: multiplying a point by a matrix.
