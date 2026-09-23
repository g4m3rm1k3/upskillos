# Lesson 32 — Quaternions

## What you'll learn
- Gimbal lock — what it actually is, and how to reproduce it deliberately
  so it stops being an abstract warning and becomes something you've seen
  happen
- What a quaternion actually is: four numbers representing a single
  rotation, not three separate axis rotations chained together
- `slerp` — spherical linear interpolation, and why it's the *correct* way
  to smoothly blend between two 3D orientations, unlike lerping Euler
  angles directly
- Using Three.js's `Quaternion` class directly, instead of `rotation.x/y/z`

## What you'll build
A cube rotated with chained `rotation.x/y/z` (Euler angles) pushed into
visible gimbal lock, then the same cube controlled with a `Quaternion`
instead — free rotation with no lock, plus a smooth `slerp`-based
transition between two arbitrary orientations.

## The question
Lesson 29 rotated elements with `rotateX`/`rotateY`/`rotateZ` — three
separate rotations, one per axis, applied in some order. Your own
[[mesh-viewer-curriculum]] project ran into a real limit doing exactly
this for camera orbiting (a "phi clamp" preventing rotation past the
poles). What specifically goes wrong with chaining three separate
axis rotations that a single, different kind of rotation representation
avoids entirely?

## 1. Predict

Hold a book flat, spine facing you. Rotate it 90° around the vertical
axis (so the spine now faces left/right). Now try to rotate it around
what was originally the "horizontal, left-right" axis — notice that axis
has, physically, become the same as the *vertical* axis after your first
rotation. Predict: if a rotation system tracks three *separate* axis
angles independently, and two of those axes have effectively become the
same physical axis, what do you think happens to the system's ability to
rotate freely around the *third*, remaining distinct axis?

## 2. Try it — reproducing gimbal lock deliberately

```js
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshNormalMaterial()
);

cube.rotation.order = "XYZ";
cube.rotation.x = 0;
cube.rotation.y = Math.PI / 2;
cube.rotation.z = 0;

function attemptRotationX(additionalAngle) {
  cube.rotation.x += additionalAngle;
}

function attemptRotationZ(additionalAngle) {
  cube.rotation.z += additionalAngle;
}
```

### What this code does

**`cube.rotation.order = "XYZ";`**
- Three.js's `Object3D.rotation` (an `Euler` object — new terminology
  here, named after Leonhard Euler, same mathematician from Lesson 26's
  "Euler integration," a different contribution of his) applies its three
  axis rotations **in a specific, configurable order** — `"XYZ"` means:
  rotate around X first, then Y (using the *already-X-rotated* object),
  then Z (using the result of both previous rotations). This ordering
  detail matters directly to what happens next.

**`cube.rotation.y = Math.PI / 2;`** (a 90° rotation around Y, applied
alone first)
- This single rotation is exactly the "turn the book 90°" step from your
  Predict question. After this rotation, the cube's *own* local X-axis
  and Z-axis — which were originally distinct, perpendicular directions —
  have been rotated such that, from the outside, further rotation around
  either the object's local X or the object's local Z now visually
  produces **the same kind of motion**: rotation around what is now the
  same physical vertical-ish axis in world space.

**`attemptRotationX(...)` and `attemptRotationZ(...)`**
- Try calling both, after the 90° Y-rotation above, and watch the cube.
  **This is gimbal lock, directly answering your Predict question**: with
  the Y-rotation at exactly 90°, changing `rotation.x` and changing
  `rotation.z` now produce visually **identical or near-identical**
  motion — you've lost one full degree of independent rotational freedom.
  The three numbers (`x`, `y`, `z`) are still there, still distinct
  numbers in memory, but two of them no longer correspond to two
  genuinely different physical rotations anymore — they've collapsed onto
  each other.

### What happens

At the specific 90° Y-rotation configured here, `attemptRotationX` and
`attemptRotationZ` both end up spinning the cube around the same visual
axis — a real, reproducible demonstration of gimbal lock, not just a
description of it. This is precisely the "phi clamp" problem your
mesh-viewer-curriculum's spherical-coordinate camera ran into: an
orbit camera built from separately-tracked angles hits this same collapse
near the poles, which is why that project needed a clamp to avoid it
rather than solving it outright — quaternions are the actual fix that
avoids needing the clamp at all.

## 3. Why — quaternions represent one rotation, not three chained ones

```js
const targetQuaternion = new THREE.Quaternion();
targetQuaternion.setFromAxisAngle(
  new THREE.Vector3(0, 1, 0),
  Math.PI / 2
);

cube.quaternion.copy(targetQuaternion);
```

**`new THREE.Quaternion()`**
- A quaternion is **four numbers** — conventionally `x, y, z, w` — but
  crucially, **not** three separate angles around three separate axes.
  Instead, it encodes **one single rotation**: a rotation *axis* (an
  arbitrary direction in 3D space, not necessarily aligned to X, Y, or Z)
  and a rotation *amount* around that one axis, packed into those four
  numbers via a specific mathematical formula (the formula itself —
  involving `sin`/`cos` of half the rotation angle, distributed across the
  four components — is beyond what this lesson needs to derive; the
  concept to internalize is *what it represents*, not deriving the
  encoding by hand).

**`targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);`**
- `setFromAxisAngle(axisVector, angleInRadians)` — the most intuitive way
  to construct a quaternion: "rotate `angleInRadians` around this one
  specific axis." `Vector3(0, 1, 0)` is straight up (the Y-axis) — this
  produces **the same 90°-around-Y rotation** as Section 2's
  `cube.rotation.y = Math.PI / 2`, but represented completely differently
  underneath.
- **Why doesn't this version suffer gimbal lock?** Because there are no
  longer three *separate* tracked angles that can collapse onto each
  other — there's exactly **one** rotation, described as one axis and one
  angle. Applying a *further* rotation combines two quaternions via
  quaternion multiplication (not covered in derivation detail here) into
  a **new single quaternion**, representing the *combined* rotation as
  one coherent whole — there's no "two of my three tracked numbers have
  become the same axis" scenario possible, because the representation was
  never three separately-tracked axis angles to begin with.

**`cube.quaternion.copy(targetQuaternion);`**
- Every Three.js `Object3D` (including your cube, and the camera in
  [[mesh-viewer-curriculum]]) has **both** a `.rotation` (Euler angles)
  and a `.quaternion` property simultaneously, kept in sync automatically
  — you can use either, but mixing manual edits to both on the same
  object in the same frame can cause confusing conflicts, so a real
  project typically commits to controlling *one* of the two consistently
  for any given object, not both.

## 4. Change one thing

```diff
 targetQuaternion.setFromAxisAngle(
-  new THREE.Vector3(0, 1, 0),
+  new THREE.Vector3(1, 1, 0).normalize(),
   Math.PI / 2
 );
```

**What changed:** the rotation axis, from straight-up to a diagonal
direction (halfway between X and Y).
**What did not change:** the rotation *amount* (still `Math.PI / 2`, 90°).
**Predict, then verify**: **this is a rotation with no equivalent single
`rotateX`/`rotateY`/`rotateZ` call at all** — it's a genuine 90° spin
around a diagonal axis, something Euler angles can only approximate by
combining *multiple* separate axis rotations in careful sequence, whereas
a quaternion expresses it as directly and simply as the straight-up-axis
version. `.normalize()` (Lesson 22's concept, reappearing here) is
required because `setFromAxisAngle` expects a **unit vector** — a
direction of length exactly 1 — and `(1, 1, 0)` has a length of
`√2`, not `1`, without normalizing first.

## 5. Put it in the project — `slerp`, smooth rotation blending

```js
const startingQuaternion = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0), 0
);
const endingQuaternion = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(1, 0, 0), Math.PI / 2
);

let blendProgress = 0;

function animateRotation() {
  blendProgress = Math.min(blendProgress + 0.01, 1);
  cube.quaternion.slerpQuaternions(startingQuaternion, endingQuaternion, blendProgress);

  if (blendProgress < 1) {
    requestAnimationFrame(animateRotation);
  }
}
animateRotation();
```

**`cube.quaternion.slerpQuaternions(startingQuaternion, endingQuaternion, blendProgress)`**
- **`slerp`** — spherical linear interpolation — is Lesson 27's `lerp`,
  but for *rotations* instead of plain numbers. **Why can't you just
  `lerp` the individual `x, y, z, w` numbers directly, the ordinary way?**
  Because a quaternion's four numbers only represent a *valid* rotation
  when they satisfy a specific mathematical constraint (their combined
  length must equal exactly 1 — the same "unit" idea from normalization in
  Lesson 22, extended to four dimensions instead of two) — plain
  numeric `lerp` between two *valid* quaternions generally produces an
  *invalid* one partway through, one that doesn't correspond to any real
  rotation at all. `slerp` specifically blends *along the curved path*
  that stays valid at every intermediate point, producing a smooth,
  constant-angular-speed rotation from the starting orientation to the
  ending one — genuinely analogous to Lesson 28's "arc-length vs. raw `t`"
  distinction: `slerp` moves at a consistent *rotational* speed, the same
  way arc-length parameterization moved at consistent *positional* speed
  along a curve.

### What happens

Over roughly 100 frames (`blendProgress` incrementing by `0.01` each
frame until it hits `1`), the cube smoothly rotates from its starting
orientation (no rotation) to its ending orientation (90° around X) — along
the single most direct, natural-looking rotational path between the two,
with no gimbal lock risk anywhere in the process, regardless of what the
starting/ending orientations happen to be.

## 6. Trap

Predict, then test: replace the `slerpQuaternions` call with manually
`lerp`-ing each Euler angle component instead —
```js
cube.rotation.x = lerp(0, Math.PI / 2, blendProgress);
cube.rotation.y = lerp(0, 0, blendProgress);
cube.rotation.z = lerp(0, 0, blendProgress);
```
(using Lesson 27's `lerp` function) for a *different*, more dramatic pair
of start/end orientations — say, starting at `rotation.set(0, 0, 0)` and
ending at `rotation.set(Math.PI / 2, Math.PI / 2, 0)` (two axes rotating
90° simultaneously).

Run it, and compare visually against the equivalent `slerp`-based version.
**The trap: lerping each Euler angle independently produces a visibly
different, often less natural-looking rotation path than `slerp` gives you
for the equivalent quaternion rotation** — because each axis angle is
blended completely independently of the others, with no awareness that
together they represent one combined 3D orientation; the object can appear
to wobble or take a longer, curved-looking path rather than rotating along
the single shortest/most direct route between the two orientations.
**This is the concrete, visible cost of treating rotation as "three
independent numbers to interpolate" rather than "one single thing to
interpolate correctly"** — the same conceptual gap that caused gimbal lock
in Section 2 in the first place.

## 7. Exercise

- **Predict:** Reproduce Section 2's gimbal lock, but at a **45°**
  Y-rotation instead of exactly 90°. Is the lock as complete/total as at
  90°, or partial? Reason about why 90° specifically is the worst case,
  connecting back to your book-rotation thought experiment from the
  Predict section.
- **Modify:** Build a `slerp` transition between three orientations in
  sequence (start → middle → end), by running two separate `slerp`
  animations back to back, each using the previous one's ending quaternion
  as its new starting quaternion.
- **Break:** Try `Math.min(blendProgress + 0.01, 1)` changed to no
  clamping at all (`blendProgress += 0.01`, unclamped) — what happens to
  `slerpQuaternions` once `blendProgress` exceeds `1`? (Predict based on
  Lesson 27's discussion of `lerp` not clamping on its own, then verify
  whether `slerp` behaves the same way or differently.)
- **Trace:** In your own words, explain to yourself why `.normalize()` was
  necessary for the diagonal axis in Section 4, but *not* needed for
  `Vector3(0, 1, 0)` in Section 3 — what property does `(0, 1, 0)` already
  have that `(1, 1, 0)` does not?

## What to remember
- Gimbal lock happens when two of three separately-tracked Euler rotation
  axes align, collapsing one full degree of rotational freedom — a real,
  reproducible phenomenon, not just a theoretical warning.
- A quaternion represents **one** rotation (an axis + an angle, packed
  into four numbers under a unit-length constraint) rather than three
  separately chained axis rotations — this structural difference is
  exactly what avoids gimbal lock entirely.
- `slerp` blends between two rotations along the path that stays
  mathematically valid throughout — plain per-axis `lerp` of Euler angles
  does not, and can produce visibly unnatural intermediate rotations.
- Three.js objects keep `.rotation` and `.quaternion` in sync
  automatically, but commit to controlling one consistently per object
  rather than mixing manual edits to both.

## This closes the applied-3D arc
Lessons 29-32 took Lesson 23's flat 2D matrix idea into genuine 3D:
perspective and depth (29), convincing-but-fake lighting (30), real
lighting/shadows/reflections on a loaded model (31), and now the actual
rotation math — quaternions — that solves the exact limitation your
[[mesh-viewer-curriculum]] project's phi-clamp was working around.
Remaining in the roadmap: Lesson 33 (Verlet integration, a second, more
stable integration method than Lesson 26's Euler approach) and Lesson 34
(Perlin noise, for organic randomness) — both stand alone from the 3D arc
and can be tackled whenever you're ready.
