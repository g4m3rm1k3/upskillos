# Lesson 31 — Real 3D Models: Loading, Lighting, Shadows & Reflections

## What you'll learn
- Loading an actual 3D model file (`.glb`) with `GLTFLoader`, instead of
  building geometry by hand
- `MeshStandardMaterial` — roughness and metalness, the two numbers that
  control how a real material reflects light
- Real shadow maps — `castShadow`/`receiveShadow`, and why shadows don't
  appear automatically just because lights and objects exist
- Real environment reflections — why they need an actual environment map,
  not a single light source

## What you'll build
A loaded 3D model, lit with a directional light, casting a real shadow onto
a ground plane, with a reflective material showing an actual environment
reflection — genuine 3D rendering, not the CSS illusions from Lesson 30.

## The question
Lesson 30 ended by admitting its reflection technique was a static,
flipped duplicate image — not real light. What does a renderer actually
need to know, and compute, to produce a *genuine* reflection or a *genuine*
shadow, given a real 3D scene?

## 1. Predict

Think about what information a shadow fundamentally depends on: the shape
of the object blocking light, the position/direction of the light itself,
and the surface the shadow falls on. Predict: do you think a 3D renderer
computes shadows automatically, just because an object and a light both
exist in the scene — or does it need to be told, explicitly, which
objects can cast shadows and which surfaces can receive them?

## 2. Try it — loading a model

```html
<script type="module">
  import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
  import { GLTFLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(3, 2, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const modelLoader = new GLTFLoader();
  modelLoader.load(
    "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf",
    function (loadedModel) {
      scene.add(loadedModel.scene);
    }
  );

  function renderLoop() {
    renderer.render(scene, camera);
    requestAnimationFrame(renderLoop);
  }
  renderLoop();
</script>
```

### What this code does

**`import { GLTFLoader } from ".../GLTFLoader.js";`**
- `GLTFLoader` is a separate module (not part of Three.js's core) that
  reads **glTF** files — the most common modern 3D model format (`.gltf`
  is a JSON-based version; `.glb` is a compact binary version of the same
  format). This matters because, unlike every geometry you've built so far
  in this curriculum (or in [[mesh-viewer-curriculum]]'s manual
  `BufferGeometry` work), a real model file contains its own vertices,
  faces, materials, and textures — already authored, likely in a 3D
  modeling tool — and `GLTFLoader`'s job is purely to parse that file into
  Three.js objects you can add to a scene.

**`modelLoader.load(url, function (loadedModel) { scene.add(loadedModel.scene); })`**
- `.load(...)` is **asynchronous** — fetching and parsing a model file
  takes real time (conceptually the same category of operation as
  Lesson 6/11's `fetch`, though `GLTFLoader` uses its own callback-based
  API rather than `async`/`await` directly). The **second argument** is a
  callback run once loading completes — you cannot use `loadedModel`
  before this callback fires; attempting to add the model to the scene
  synchronously, right after calling `.load()`, would fail, since nothing
  has actually loaded yet at that point in the code.
- `loadedModel.scene` — a loaded glTF file can technically contain multiple
  named scenes/objects; `.scene` is the default one, a Three.js `Group`
  (a container object) holding every mesh the file defines, already
  correctly positioned relative to each other as the original model
  author set up.

### What happens

The model loads asynchronously, and once ready, gets added to the Three.js
scene and rendered — but **notice it will render dark or flat-looking with
no lights added yet**, setting up the next section's actual point.

## 3. Why — materials need light, and shadows need explicit permission

```js
const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

renderer.shadowMap.enabled = true;

const groundPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x888888 })
);
groundPlane.rotation.x = -Math.PI / 2;
groundPlane.receiveShadow = true;
scene.add(groundPlane);
```

**`new THREE.DirectionalLight(0xffffff, 3)` vs `new THREE.AmbientLight(0xffffff, 0.4)`**
- `DirectionalLight` simulates light coming from one consistent direction
  across the whole scene (like sunlight) — it has a `.position`, but only
  its *direction relative to the scene's origin* actually matters for
  lighting math, not its literal distance.
- `AmbientLight` adds a flat, uniform amount of light to *everything* in
  the scene equally, with no direction and no shadows at all — this is a
  cheap approximation of the countless small indirect light bounces a real
  environment has (light bouncing off walls, the sky's general glow), used
  specifically so that surfaces facing *away* from the directional light
  aren't rendered completely, unrealistically black.
- **Without ANY light in the scene, `MeshStandardMaterial` (and every
  "standard/physically-based" material) renders completely black** —
  unlike a flat-color CSS background, this material's entire rendering
  model is defined in terms of *how it responds to light*, meaning "no
  light" genuinely means "no visible color," not a fallback flat shade.
  This is the direct answer to why Section 2's model looked dark: it had
  color and shape, but nothing illuminating it yet.

**`directionalLight.castShadow = true;`** / **`groundPlane.receiveShadow = true;`**
- **This is the direct, complete answer to your Predict question.**
  Shadows in Three.js (and in real-time 3D rendering generally) are
  **not** automatic — computing accurate shadows for every possible
  light/object/surface combination in a scene is expensive, so you must
  explicitly opt each piece in: which lights are allowed to cast shadows
  at all (`castShadow` on the light), which specific objects can cast a
  shadow (`castShadow` on that object, needed on the model's meshes too,
  not shown above but required), and which surfaces are allowed to have
  shadows rendered onto them (`receiveShadow` on the ground plane here).
  **Omitting any one of these three flags silently produces no shadow at
  all**, with no error — a real, common source of "why isn't my shadow
  showing up" confusion.

**`renderer.shadowMap.enabled = true;`**
- A **global** switch, on the renderer itself, that must also be on for
  *any* shadow to render anywhere in the scene — a fourth, easy-to-forget
  requirement alongside the three per-object/per-light flags above.

**`groundPlane.rotation.x = -Math.PI / 2;`**
- `PlaneGeometry` is created flat, facing the camera by default (like a
  sheet of paper standing upright) — rotating it `-90°` (`-Math.PI / 2`
  radians, Lesson 20's radian conversion reappearing here) around the
  x-axis lays it flat, horizontal, to actually function as a "ground."

### What happens

With both lights and all four shadow-related flags set, the model now
renders lit (bright side facing the directional light, dimmer side lifted
slightly by the ambient light rather than pure black) and casts a real,
computed shadow onto the ground plane beneath it — genuinely calculated
from the model's actual 3D geometry and the light's actual direction, not
a flipped image or a pre-drawn blur.

## 4. Change one thing

```diff
 const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
-directionalLight.position.set(5, 10, 5);
+directionalLight.position.set(-5, 2, 5);
```

**What changed:** the light's position, now lower and to the opposite
side.
**What did not change:** its color, intensity, or `castShadow` setting.
**Predict, then verify**: the shadow's direction and length change to
match — a lower, more horizontal light angle produces a **longer,
more stretched-out shadow** (exactly like real late-afternoon sunlight
producing longer shadows than overhead midday sun), and the bright/dark
sides of the model itself shift to match the new light direction too. This
is worth confirming directly: nothing about the shadow's shape was
hardcoded anywhere — it's a genuine geometric consequence of the light's
position relative to the model and ground plane, recalculated correctly
the moment the light moves.

## 5. Put it in the project — real environment reflections

```js
import { RoomEnvironment } from "https://unpkg.com/three@0.160.0/examples/jsm/environments/RoomEnvironment.js";

const environmentGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = environmentGenerator.fromScene(new RoomEnvironment()).texture;

const reflectiveMaterial = new THREE.MeshStandardMaterial({
  color: 0x8888ff,
  metalness: 1.0,
  roughness: 0.1
});
```

### Code walkthrough

**`metalness`, `roughness`** — the two defining numbers of
`MeshStandardMaterial`
- `metalness` (0 to 1): `0` means a non-metal (like plastic or wood —
  reflects light diffusely, scattered in many directions); `1` means a
  pure metal (reflects light more like a mirror, tinted by the material's
  base color).
- `roughness` (0 to 1): `0` means a perfectly smooth, mirror-like surface;
  `1` means a very rough, matte surface that scatters reflected light in
  many directions, blurring any reflection into an unrecognizable smear.
  **Together, these two numbers are why real reflections need more than
  just "turn reflections on"** — a rough, non-metal surface (like
  cardboard) should show almost no visible reflection at all, while a
  smooth metal surface should show a sharp one; the material itself
  determines how much of the environment is actually visible in it.

**`scene.environment = environmentGenerator.fromScene(new RoomEnvironment()).texture;`**
- **This is the direct answer to what a "genuine reflection" actually
  requires, versus Lesson 30's flipped-image illusion**: a reflective
  material needs an actual image (or generated scene) representing "what's
  around it" to reflect — this is an **environment map**. `RoomEnvironment`
  is a small built-in Three.js helper that procedurally generates a
  simple, generic indoor-room-like environment (soft varied lighting from
  different angles) — a reasonable default when you don't have a real
  photographed environment (an HDRI image) to use instead.
- `PMREMGenerator` — **P**refiltered **M**ipmapped **R**adiance
  **E**nvironment **M**ap generator — processes that room environment into
  a format optimized for physically-based rendering across a range of
  roughness values (so a rough, blurry-reflection material and a
  perfectly sharp mirror-like material can both sample the same underlying
  environment data correctly, at different levels of blur). The exact
  internals here are beyond this lesson's scope — the concept to retain is
  that `scene.environment` is what supplies "the thing being reflected,"
  and reflective materials automatically sample from it once it's set.

### What happens

Any `MeshStandardMaterial` with non-zero `metalness` now shows a genuine
reflection of the generated room environment — brighter/darker patches
shifting realistically as the camera or object moves, blurred
proportionally to `roughness` — a real, continuously recalculated
reflection, fundamentally different in kind from Lesson 30's static
flipped duplicate, because it's actually sampling real environment data
based on the material's real surface properties and the camera's real
viewing angle.

## 6. Trap

Predict, then test: set `directionalLight.castShadow = true` and
`groundPlane.receiveShadow = true`, but **forget** to set
`modelMesh.castShadow = true` on the loaded model's actual mesh (you'll
need to traverse `loadedModel.scene` and set this on each mesh it
contains, since a loaded model is often composed of several separate
meshes internally — a `.traverse(...)` call, briefly worth knowing exists,
is the standard way to reach all of them).

Run it. **The trap: the light and ground are both correctly configured,
yet no shadow appears at all** — because the *object itself* was never
told it's allowed to cast one. This is the precise, concrete consequence
of shadows requiring **all** relevant flags set correctly (light, caster,
receiver, and the renderer's global switch) — missing any single one of
the four produces the identical symptom ("no shadow, no error"), meaning
debugging a missing shadow in practice means checking all four
systematically, not guessing which one is wrong.

## 7. Exercise

- **Predict:** If `roughness` were set to `1.0` on the reflective material
  (keeping `metalness: 1.0`), would you still describe the result as
  "reflective," even though it's technically still a metal? What would it
  actually look like?
- **Modify:** Load a second model (or duplicate the ground plane's
  material) with `metalness: 0, roughness: 0.9` — a non-metal, rough
  material — and confirm it shows little to no visible environment
  reflection, contrasting directly with the shiny material from Section 5.
- **Break:** Set `renderer.shadowMap.enabled` back to `false`, keeping
  every other shadow-related flag correctly set. Confirm this alone is
  enough to remove the shadow entirely, directly demonstrating the "four
  independent requirements" point from the Trap section.
- **Trace:** Write out, in your own words, the full list of everything
  that had to be explicitly configured for a shadow to appear in this
  lesson — compare that list against how many separate things Lesson 30's
  fake `box-shadow` needed (answer: none of this — just CSS values on one
  element) to make the tradeoff between "fake but simple" and "real but
  requires correct setup" concrete for yourself.

## What to remember
- Loading a real model (`GLTFLoader`) is asynchronous — nothing about the
  loaded content exists until the load callback fires.
- `MeshStandardMaterial` renders black with no light in the scene at all —
  physically-based materials are defined entirely in terms of their
  response to light, unlike a flat CSS background color.
- Shadows require four separate, independent opt-ins: the light's
  `castShadow`, the object's `castShadow`, the receiving surface's
  `receiveShadow`, and the renderer's global `shadowMap.enabled` — missing
  any one produces the identical "no shadow, no error" symptom.
- Real reflections require an actual environment map (`scene.environment`)
  for a material to sample from, and how visible that reflection is
  depends on the material's own `metalness`/`roughness` — not a switch you
  flip, a physical property you tune.

## Next lesson
Lesson 32 returns to a topic Three.js's `rotateX/Y/Z`-chaining approach
struggles with directly: gimbal lock, and quaternions as the fix — the
math your [[mesh-viewer-curriculum]] project's free-rotation capstone
actually depends on.
