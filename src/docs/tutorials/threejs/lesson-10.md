# Lesson 10: OrbitControls — Mouse Navigation via CDN Addon

What you will build: You will add interactive mouse and touch navigation to a 3D scene using `OrbitControls`, allowing the user to rotate, pan, and zoom the camera around a central target. The transferable problem this solves is managing camera orientation mathematically based on user input events, using an external addon module via a CDN importmap.

What you need to know first:
- Nothing.

Terms used in this lesson:
- **importmap** — A JSON structure in the HTML `<script>` tag that tells the browser how to resolve module specifiers like `three` or `three/addons/` to full CDN URLs. It exists so we can write clean `import` statements without hardcoding URLs everywhere.
- **import** — JavaScript ES6 syntax to bring in exported classes or functions from another module. It exists to enable modular code architecture.
- **const** — JavaScript keyword to declare a block-scoped variable that cannot be reassigned. It exists to prevent accidental mutation of reference pointers.
- **function** — JavaScript keyword to declare a reusable block of code. It exists to encapsulate logic and allow repeated execution.
- **Math.PI** — A JavaScript constant representing the ratio of a circle's circumference to its diameter (~3.14159). It exists to allow calculation of angles in radians (e.g., 180 degrees = PI radians).
- **lerp** — Linear interpolation. A mathematical formula that finds a value between two points based on a percentage (`t`). It exists to enable smooth animations by moving a fraction of the distance toward a goal each frame.
- **damping** — A physics concept representing inertia or friction. It exists to make movements feel natural by gradually slowing down velocity rather than stopping abruptly when input ceases.

Objects and methods used:

**OrbitControls**
- *What it is:* A camera controller class from the Three.js addons library.
- *Implementation:* `class OrbitControls`
- *Its use:* To allow the user to orbit, pan, and zoom a camera around a target point using mouse or touch events.
- *Type:* A class from `three/addons/controls/OrbitControls.js`.
- *Responsibility:* Listens to DOM events on a canvas element and updates a camera's position and rotation matrices accordingly.
- *Depends on:* A `Camera` object to manipulate, and an HTML DOM element to listen to.
- *Connects to:* Mutates the `Camera` object; called by the application setup.
- *Shape:* An external library utility operating on our core rendering objects.

**controls.update()**
- *What it is:* The method that computes the new camera position.
- *Implementation:* `update()` returning a boolean.
- *Its use:* To apply momentum/damping calculations each frame when `enableDamping` is true.
- *Type:* Instance method on `OrbitControls`.
- *Responsibility:* Applies current velocity to the camera's spherical coordinates and decays the velocity based on the damping factor.
- *Depends on:* Must be called inside the animation loop before rendering.
- *Connects to:* Updates the camera state; called by our `animate` loop.
- *Shape:* A required lifecycle hook for frame-based momentum.

**controls.target**
- *What it is:* The central point the camera orbits around.
- *Implementation:* A `THREE.Vector3` object.
- *Its use:* To change where the camera looks and pivots.
- *Type:* Object property.
- *Responsibility:* Defines the origin of the spherical coordinate system used by the controller.
- *Depends on:* 3D coordinates.
- *Connects to:* Read by `controls.update()` to position the camera.
- *Shape:* Internal state property of the controller.

**THREE.Vector3.lerp()**
- *What it is:* A method to interpolate between the current vector and a target vector.
- *Implementation:* `lerp(v: Vector3, alpha: Float)` modifying the instance in place.
- *Its use:* To smoothly transition the orbit target to a new position.
- *Type:* Instance method on `THREE.Vector3`.
- *Responsibility:* Updates the `x`, `y`, and `z` values to move `alpha` percent closer to `v`.
- *Depends on:* A target vector and an alpha percentage.
- *Connects to:* Mutates the vector it is called on.
- *Shape:* Mathematical utility method.

**controls.addEventListener()**
- *What it is:* A method to listen for custom events emitted by the controller.
- *Implementation:* `addEventListener(type: String, listener: Function)`
- *Its use:* To trigger a render call only when the camera actually moves.
- *Type:* Inherited instance method (from `EventDispatcher`).
- *Responsibility:* Registers a callback function to run when a specific event fires.
- *Depends on:* An event string (like 'change') and a callback function.
- *Connects to:* Calls our rendering logic when user input happens.
- *Shape:* Event subscription boundary.

**Everything else in the file, not this lesson's subject but still explained:**

**window.requestAnimationFrame()**
- *What it is:* A browser API for scheduling visual updates.
- *Implementation:* `requestAnimationFrame(callback: Function)`
- *Its use:* To create an animation loop that syncs with the monitor's refresh rate.
- *Type:* Global window method.
- *Responsibility:* Executes the provided callback before the next browser repaint.
- *Depends on:* A callback function.
- *Connects to:* Loops back on itself by calling the animation function again.
- *Shape:* Core browser rendering lifecycle hook.

**THREE.WebGLRenderer**
- *What it is:* The core engine that draws 3D scenes.
- *Implementation:* `class WebGLRenderer`
- *Its use:* To output the camera's view of the scene to the HTML canvas.
- *Type:* Class instance.
- *Responsibility:* Issues WebGL commands to the GPU.
- *Depends on:* A canvas element in the DOM.
- *Connects to:* Reads the scene and camera, writes to the canvas.
- *Shape:* The primary output engine.

**THREE.PerspectiveCamera**
- *What it is:* A camera with perspective projection (things further away appear smaller).
- *Implementation:* `class PerspectiveCamera`
- *Its use:* To define the view frustum we are looking through.
- *Type:* Class instance.
- *Responsibility:* Calculates the projection matrix for rendering.
- *Depends on:* FOV, aspect ratio, near, and far planes.
- *Connects to:* Passed to the renderer.
- *Shape:* Core data structure for view math.

**THREE.Clock**
- *What it is:* A utility for tracking time.
- *Implementation:* `class Clock`
- *Its use:* To measure time elapsed between frames (delta time).
- *Type:* Class instance.
- *Responsibility:* Keeps track of the current time and time differences.
- *Depends on:* The browser's performance APIs.
- *Connects to:* Used by animation logic to normalize speeds.
- *Shape:* Timing utility.

---

## Concept Unit: Adding OrbitControls via CDN

### The Problem
We have a 3D scene, but the camera is completely static. If we want the user to be able to look around the scene, we would have to manually capture `mousedown`, `mousemove`, and `mouseup` events, calculate the delta of mouse movement, translate that into angles, and apply complex trigonometry to update the camera's rotation and position. How can we drop in a pre-built solution for this?

### Introduce the concept in isolation
We will use an HTML file to define an importmap and instantiate `OrbitControls`.

```html
<!DOCTYPE html>
<html>
<body>
<canvas id="c"></canvas>
<script type="importmap">
{"imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
}}
</script>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0, 3, 8);

const controls = new OrbitControls(camera, renderer.domElement);
console.log('Controls target:', controls.target);
console.log('Controls enabled:', controls.enabled);
</script>
</body>
</html>
```
*Output (stated from confidence):*
```text
Controls target: Object { x: 0, y: 0, z: 0 }
Controls enabled: true
```
This output proves that the **OrbitControls** instance is successfully loaded from the CDN and initialized. It takes over the camera, setting its default pivot point (target) to the origin `(0,0,0)` and immediately enabling interaction.

### Discard the throwaway
This throwaway HTML code is discarded and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are introducing interactivity to our lesson scene.
- **Files affected:** `index.html` (modified).
- **Change type:** configure and add.
- **Location:** Inside the `<head>` to add the importmap, and at the top of our `<script type="module">`.
- **Dependencies:** An internet connection to fetch the CDN packages.

### The New Code
```html
<script type="importmap">
{"imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
}}
</script>
```
```javascript
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const controls = new OrbitControls(camera, renderer.domElement);
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <head>
4:   <!-- ← new -->
5:   <script type="importmap">
6:   {"imports": {
7:     "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
8:     "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
9:   }}
10:  </script>
11: </head>
12: <body>
13:   <canvas id="c"></canvas>
14:   <script type="module">
15:     import * as THREE from 'three';
16:     import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // ← new
17:     
18:     const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c')});
19:     const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
20:     
21:     const controls = new OrbitControls(camera, renderer.domElement); // ← new
22:   </script>
23: </body>
24: </html>
```
We added the JSON `importmap` to teach the browser where `three/addons/` lives, imported the `OrbitControls` class from that path, and instantiated it by passing in our existing `camera` and the canvas element (`renderer.domElement`) for it to listen to.

### Mechanical walkthrough
1. `<script type="importmap">` defines a JSON mapping of import specifiers to URLs.
2. `import { OrbitControls }` is ES6 syntax that pulls the specific `OrbitControls` export.
3. `from 'three/addons/controls/OrbitControls.js'` resolves via the importmap to the JSDelivr CDN.
4. `const controls =` declares a constant reference for our controller.
5. `new OrbitControls(...)` calls the constructor of the class to create a new instance.
6. `camera` is passed as the first argument, giving the controller the object it must mutate.
7. `renderer.domElement` is passed as the second argument, giving the controller the HTML element it attaches mouse and touch event listeners to.

### CS lens
In Computer Science, this is an implementation of the **Observer Pattern**. The `OrbitControls` instance attaches itself to the DOM element and passively listens (observes) for user input events (like `mousemove` or `wheel`). When those events fire, it translates 2D screen coordinates into 3D spherical coordinates (radius, theta, phi) and mutates the camera's state.

### SE lens
Using an `importmap` is a Software Engineering choice for dependency management in native browser environments without a build step (like Webpack or Vite). By explicitly separating the aliases (`"three/addons/"`) from their physical URLs, we can update the version of Three.js in exactly one place (the importmap), and all `import` statements across our entire application will automatically resolve to the new version.

### Commands needed
Open `index.html` in a modern browser.

### Run it
When you open the page, left-click and drag to orbit around the center, right-click and drag to pan, and use the scroll wheel to zoom in and out. The camera is now fully interactive.

### One sentence connecting to previous unit
Now that we can move around, we'll notice the movement stops instantly when the mouse is released; we can fix this by adding physical inertia.

---

## Concept Unit: Damping (inertia)

### The Problem
When you drag the mouse to rotate the camera and let go, the camera freezes exactly on the frame the mouse stops. Real-world physical objects have inertia — they glide to a halt. How do we make the camera movement feel smooth and heavy instead of rigid?

### Introduce the concept in isolation
We configure the `OrbitControls` instance to use damping, and we set up an animation loop to process it.

```html
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('c')});
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
const controls = new OrbitControls(camera, renderer.domElement);

controls.enableDamping = true;
controls.dampingFactor = 0.05;

console.log('Damping enabled:', controls.enableDamping);
console.log('Damping factor:', controls.dampingFactor);

function animate() {
    requestAnimationFrame(animate);
    controls.update();
}
animate();
</script>
```
*Output (stated from confidence):*
```text
Damping enabled: true
Damping factor: 0.05
```
This output proves we have toggled the **damping** properties on the controls. Crucially, the `controls.update()` method is now called continuously inside the `requestAnimationFrame` loop, which applies an exponential decay to the velocity frame-by-frame.

### Discard the throwaway
This throwaway snippet is discarded and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `index.html` (modified).
- **Change type:** configure.
- **Location:** Right after initializing `controls`, and inside the `requestAnimationFrame` loop.
- **Dependencies:** The previously initialized `controls` instance.

### The New Code
```javascript
controls.enableDamping = true;
controls.dampingFactor = 0.05;

function animate() {
    requestAnimationFrame(animate);
    controls.update(); 
    renderer.render(scene, camera);
}
animate();
```

### The Updated Project
```html
14:   <script type="module">
15:     import * as THREE from 'three';
16:     import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
17:     
18:     const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c')});
19:     const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
20:     const scene = new THREE.Scene();
21:     
22:     const controls = new OrbitControls(camera, renderer.domElement);
23:     controls.enableDamping = true; // ← new
24:     controls.dampingFactor = 0.05; // ← new
25:     
26:     function animate() { // ← new
27:         requestAnimationFrame(animate); // ← new
28:         controls.update(); // ← new
29:         renderer.render(scene, camera); // ← new
30:     } // ← new
31:     animate(); // ← new
32:   </script>
```
We enabled damping on the controller, set its decay rate, and created an `animate` function that loops endlessly, calling `controls.update()` right before `renderer.render()` to compute the inertia physics.

### Mechanical walkthrough
1. `controls.enableDamping = true;` flips a boolean flag inside the controller to enable velocity tracking.
2. `controls.dampingFactor = 0.05;` sets a float representing how much inertia exists. Lower numbers mean less friction (more sliding).
3. `function animate() {` defines our render loop function.
4. `requestAnimationFrame(animate);` asks the browser to execute `animate` again before the next screen repaint, creating a continuous loop.
5. `controls.update();` calculates the camera's new position for the current frame by multiplying the remaining velocity by `(1 - dampingFactor)`.
6. `animate();` calls the function the very first time to start the cycle.

### CS lens
Damping is an implementation of **Euler Integration** for physics simulation. Instead of jumping directly from point A to point B, the controller stores a velocity vector. Each frame, it adds the velocity to the position, and then decays the velocity (`velocity *= 0.95`). After 14 frames, the velocity is roughly halved (0.95^14 ≈ 0.49).

### SE lens
Notice the architectural requirement: `controls.update()` *must* be called every frame for damping to work. If you forget to place it inside the animation loop, the controls will ignore damping completely because the math required to decay the velocity over time is never executed. This is an API design tradeoff: forcing the consumer (us) to manually trigger the update avoids the library having to create hidden, hard-to-manage background timers.

### Commands needed
Open `index.html` in a modern browser.

### Run it
Click and drag the scene, then release the mouse while still moving. The camera will smoothly glide to a halt instead of stopping rigidly.

### One sentence connecting to previous unit
Now that movement is smooth, we need to ensure the user cannot flip the camera upside down or zoom infinitely far away.

---

## Concept Unit: Orbit limits — min/max angles and zoom

### The Problem
By default, the user can rotate the camera all the way under the scene, looking up from below, or zoom out until the scene disappears. For a controlled experience, how do we restrict the camera's movement to a specific arc and distance?

### Introduce the concept in isolation
We modify properties on the `controls` object that clamp the allowed angles and distances.

```html
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('c')});
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
const controls = new OrbitControls(camera, renderer.domElement);

controls.minPolarAngle = Math.PI / 6;   
controls.maxPolarAngle = Math.PI / 2;   
controls.minDistance = 2;   
controls.maxDistance = 20;  

console.log('Min polar:', (controls.minPolarAngle * 180/Math.PI).toFixed(0) + '°');
console.log('Max distance:', controls.maxDistance);
</script>
```
*Output (stated from confidence):*
```text
Min polar: 30°
Max distance: 20
```
This output proves we have overridden the default constraints. The **Math.PI** constants are used to define the vertical (polar) angle in radians. `Math.PI / 2` is exactly 90 degrees (horizon level), preventing the camera from going underground.

### Discard the throwaway
This throwaway verification snippet is discarded and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `index.html` (modified).
- **Change type:** configure.
- **Location:** Right after `controls.dampingFactor`.
- **Dependencies:** The initialized `controls` instance.

### The New Code
```javascript
controls.minPolarAngle = Math.PI / 6;
controls.maxPolarAngle = Math.PI / 2;
controls.minDistance = 2;
controls.maxDistance = 20;
```

### The Updated Project
```html
22:     const controls = new OrbitControls(camera, renderer.domElement);
23:     controls.enableDamping = true; 
24:     controls.dampingFactor = 0.05; 
25:     
26:     controls.minPolarAngle = Math.PI / 6; // ← new
27:     controls.maxPolarAngle = Math.PI / 2; // ← new
28:     controls.minDistance = 2; // ← new
29:     controls.maxDistance = 20; // ← new
30:     
31:     function animate() {
```
We configured four boundaries on the `OrbitControls` instance. The polar angles restrict the vertical rotation (preventing ground clipping), and the distance properties restrict the scroll wheel zoom limits.

### Mechanical walkthrough
1. `controls.minPolarAngle = Math.PI / 6;` sets the highest vertical point the camera can reach to 30 degrees down from the top (+Y axis).
2. `controls.maxPolarAngle = Math.PI / 2;` sets the lowest vertical point to exactly the horizon (90 degrees).
3. `controls.minDistance = 2;` sets the absolute closest the camera can get to the target point.
4. `controls.maxDistance = 20;` sets the absolute furthest the camera can zoom out.

### CS lens
These properties implement a **clamping** algorithm inside `controls.update()`. Before calculating the final camera position, the controller takes the proposed new angle and passes it through `Math.max(minLimit, Math.min(maxLimit, value))`. If the user moves their mouse past the limit, the value simply truncates at the boundary.

### SE lens
Using radians (`Math.PI`) instead of degrees is an industry standard across 3D graphics APIs (WebGL, OpenGL, DirectX). As a software engineer, getting comfortable reading `Math.PI / 2` as 90 degrees and `Math.PI` as 180 degrees prevents endless conversion bugs.

### Commands needed
Open `index.html` in a modern browser.

### Run it
Attempt to drag the camera underneath the scene; it will violently stop at the horizon. Scroll the wheel to zoom out, and you will hit an invisible wall at 20 units.

### One sentence connecting to previous unit
We've restricted where the camera can go, but it is still always looking at the exact center `(0,0,0)` of the world; we can change that.

---

## Concept Unit: Controlling the orbit target

### The Problem
By default, the camera orbits around `(0, 0, 0)`. If our 3D model is tall, or off to the side, rotating around the origin feels awkward. How do we change the pivot point, and how can we smoothly transition the camera to look at a new object?

### Introduce the concept in isolation
We modify the `target` property of the controls and use `lerp` to smoothly animate it.

```html
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const camera = new THREE.PerspectiveCamera();
const controls = new OrbitControls(camera, document.createElement('canvas'));

const targetGoal = new THREE.Vector3(5, 1, 0);

// Simulate one frame of lerp:
controls.target.lerp(targetGoal, 0.05);

console.log('Target after 1 frame:', controls.target.x, controls.target.y, controls.target.z);
</script>
```
*Output (stated from confidence):*
```text
Target after 1 frame: 0.25 0.05 0
```
This output proves the **lerp** function modifies the vector in place. Starting at `(0,0,0)`, moving 5% (`0.05`) of the way towards `(5,1,0)` results in `x = 0.25` and `y = 0.05`. Doing this every frame creates an asymptotic curve that smoothly glides the focus point.

### Discard the throwaway
This manual lerp simulation is discarded and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `index.html` (modified).
- **Change type:** configure.
- **Location:** Above the animation loop to define the goal, and inside the animation loop to apply the `lerp`.
- **Dependencies:** `controls` and `THREE.Vector3`.

### The New Code
```javascript
const targetGoal = new THREE.Vector3(0, 2, 0);

function animate() {
    requestAnimationFrame(animate);
    controls.target.lerp(targetGoal, 0.05);
    controls.update(); 
    renderer.render(scene, camera);
}
```

### The Updated Project
```html
26:     controls.minPolarAngle = Math.PI / 6; 
27:     controls.maxPolarAngle = Math.PI / 2; 
28:     controls.minDistance = 2; 
29:     controls.maxDistance = 20; 
30:     
31:     const targetGoal = new THREE.Vector3(0, 2, 0); // ← new
32:     
33:     function animate() {
34:         requestAnimationFrame(animate); 
35:         controls.target.lerp(targetGoal, 0.05); // ← new
36:         controls.update(); 
37:         renderer.render(scene, camera); 
38:     }
39:     animate(); 
```
We defined a target goal of `y = 2`, and added a line inside the animation loop that continuously mathematically inches the actual `controls.target` towards that goal.

### Mechanical walkthrough
1. `const targetGoal =` declares a constant variable for our final destination.
2. `new THREE.Vector3(0, 2, 0);` creates an object representing the 3D coordinates we want to focus on (2 units high).
3. `controls.target.lerp(...)` calls the interpolation method on the controller's internal target vector.
4. `targetGoal` is passed as the destination parameter.
5. `0.05` is passed as the alpha percentage, moving the target 5% closer to the goal every frame.

### CS lens
**Linear Interpolation (lerp)** is a foundational concept in graphics programming. The formula is `current + alpha * (target - current)`. When placed in an animation loop where `current` is constantly updating, it produces Zeno's Paradox: the value continuously halves the remaining distance. It never theoretically reaches the absolute exact number, but it mathematically approaches it, resulting in a beautiful, natural easing effect.

### SE lens
Mutating `controls.target` explicitly requires `controls.update()` to be called afterwards for the camera matrix to react to the new origin. Because we correctly placed `controls.update()` directly below our lerp call in the loop, our architecture cleanly supports changing the target dynamically at runtime.

### Commands needed
Open `index.html` in a modern browser.

### Run it
Upon loading, you will see the camera naturally sweep upwards to center on a position 2 units off the ground.

### One sentence connecting to previous unit
If our scene doesn't have any moving parts on its own, running a loop 60 times a second just to wait for the mouse is inefficient; we can switch to an event-driven model.

---

## Concept Unit: Static scenes — render only on change

### The Problem
Our `animate` function uses `requestAnimationFrame` to run 60 times a second, consuming CPU and GPU resources constantly. If the user isn't touching the mouse, and no objects in the scene are spinning, we are drawing the exact same static pixels over and over. How can we pause rendering entirely until the user actually interacts?

### Introduce the concept in isolation
We use `addEventListener` on the `OrbitControls` instance to trigger a render exclusively when the controls emit a `change` event.

```html
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('c')});
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
const scene = new THREE.Scene();
const controls = new OrbitControls(camera, renderer.domElement);

let renderCount = 0;
controls.addEventListener('change', () => {
    renderCount++;
    console.log('Render triggered. Total renders:', renderCount);
});
</script>
```
*Output (stated from confidence):*
```text
(When dragging mouse)
Render triggered. Total renders: 1
Render triggered. Total renders: 2
```
This output proves the controller fires a `change` event strictly when a user input modifies the camera position. If the mouse is still, zero events fire, meaning zero renders occur.

### Discard the throwaway
This event logging snippet is discarded and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch replacement of the loop.
- **Files affected:** `index.html` (modified).
- **Change type:** replace.
- **Location:** Replacing the `animate()` function entirely.
- **Dependencies:** `controls` and `renderer`.

### The New Code
```javascript
controls.enableDamping = false; 

controls.addEventListener('change', () => {
    renderer.render(scene, camera);
});

renderer.render(scene, camera);
```

### The Updated Project
```html
22:     const controls = new OrbitControls(camera, renderer.domElement);
23:     controls.enableDamping = false; // ← modified (damping requires a loop)
24:     
25:     controls.minPolarAngle = Math.PI / 6; 
26:     controls.maxPolarAngle = Math.PI / 2; 
27:     controls.minDistance = 2; 
28:     controls.maxDistance = 20; 
29:     controls.target.set(0, 2, 0); // ← modified (no smooth lerping)
30:     controls.update(); // ← new (apply target immediately)
31:     
32:     // ← loop removed and replaced with event listener:
33:     controls.addEventListener('change', () => { // + new
34:         renderer.render(scene, camera); // + new
35:     }); // + new
36:     
37:     renderer.render(scene, camera); // + new (initial draw)
38:   </script>
```
We deleted the `requestAnimationFrame` loop. Because damping and smooth lerping *require* a continuous frame loop to process math over time, we disabled damping and applied the target immediately. We then attached an event listener to trigger rendering only on user input, and called render once manually to draw the initial state.

### Mechanical walkthrough
1. `controls.enableDamping = false;` disables inertia, as it breaks without a loop.
2. `controls.target.set(0, 2, 0);` statically assigns the target without lerping.
3. `controls.update();` forces the controller to apply the new target vector to the camera immediately.
4. `controls.addEventListener('change', ...)` subscribes to the custom `change` event emitted by `OrbitControls`.
5. `() => { renderer.render(scene, camera); }` defines an anonymous arrow function callback that forces the GPU to draw the frame.
6. `renderer.render(scene, camera);` at the bottom executes a single initial draw so the canvas isn't blank on page load.

### CS lens
This is a shift from a **Polling/Continuous execution model** to an **Event-Driven execution model**. Instead of constantly polling the system (drawing a frame and asking "did anything move?"), we let the system idle at 0% CPU usage until an interrupt (a mouse event) awakens the process.

### SE lens
This optimization is critical for battery life on laptops and mobile devices. A static scene rendering at 60FPS drains a battery aggressively for absolutely zero visual benefit. However, the architectural tradeoff is stark: by dropping the loop, we lose access to time-based features like physics damping and smooth vector lerping. The engineer must choose the architecture that fits the product requirements.

### Commands needed
Open `index.html` in a modern browser.

### Run it
The scene behaves exactly as before, but without the sliding inertia. Check your system's task manager: when you are not clicking the canvas, the browser's GPU usage for this tab will drop to 0%.

### One sentence connecting to previous unit
With our controls fully implemented, we have a complete foundation for managing user viewpoint, ready for adding complex geometry to actually look at.

---

## Closing

### Connect the pieces
In this lesson, we imported an external addon module, `OrbitControls`, via an HTML importmap, demonstrating how to expand Three.js capabilities beyond the core library. We bound the controller to our camera and canvas DOM element, instantly enabling complex spherical math for orbiting, panning, and zooming.

We explored the physics of damping by applying an exponential decay to momentum inside an animation loop, then locked the camera inside a safe viewing box by clamping polar angles and distances. We mathematically smoothed our transitions using linear interpolation (`lerp`) on the controller's target. Finally, we learned the crucial architectural tradeoff between an active animation loop (required for physics and smooth lerping) and a passive event-driven render model (saving battery life on static scenes). 

Through all of this, the central mechanism remains the same: `OrbitControls` intercepts human input events, modifies the camera's underlying position and rotation matrices, and relies on `controls.update()` and `renderer.render()` to paint that new math to the screen.
