# Lesson 09: PerspectiveCamera vs OrthographicCamera — FOV, Frustum, and Projection

**What you will build**
You will build a WebGL scene that initializes both a perspective camera and an orthographic camera, allowing you to switch between them at runtime via keyboard input. This explores the transferable problem of how a 3D engine mathematically maps three-dimensional spatial coordinates into a 2D clip space using projection matrices.

**What you need to know first**
- Lesson 08 — Setting up a `THREE.Scene` and a `THREE.WebGLRenderer`.

**Terms used in this lesson**
- **aspect ratio** — The proportional relationship between an image's width and its height (width divided by height). It exists to ensure that images or 3D projections do not look stretched or squished when mapped to screens of different dimensions.
- **field of view (FOV)** — The extent of the observable world that is seen at any given moment. It exists to determine how much of the scene is captured by the camera, directly affecting how zoomed in or zoomed out the view appears.
- **frustum** — The region of space in the modeled world that may appear on the screen; a pyramid with its top cut off. It exists to define the boundaries of what the camera can see, allowing the rendering engine to clip objects outside this volume for efficiency.
- **projection matrix** — A 4x4 mathematical matrix that transforms 3D coordinates into 2D clip space coordinates. It exists to convert the 3D scene into a format suitable for rasterization onto a 2D screen, applying perspective divide or orthographic scaling.
- **clip space** — A coordinate space where all visible coordinates fall between -1 and 1 on all axes. It exists to provide a standardized volume for the graphics hardware to easily discard (clip) geometry that won't appear on screen.
- **normalized device coordinates (NDC)** — The coordinates obtained after performing the perspective divide (dividing clip space coordinates by their W component). NDCs exist to finalize the mapping of 3D geometry onto the 2D viewport independent of the screen's actual resolution.
- **perspective divide** — The mathematical operation of dividing a vector's X, Y, and Z components by its W component. It exists to create the illusion of depth by shrinking objects as they get further away, mapping the frustum into a normalized cube.
- **Z-fighting** — A visual artifact where two or more primitives have similar or identical values in the depth buffer, causing flickering as the renderer struggles to decide which is in front. It exists because depth buffers have limited precision, which gets logarithmically compressed at a distance in perspective projections.
- **event listener** — A mechanism that waits for an event to occur. It exists to execute code in response to user input asynchronously.
- **DOM** — The Document Object Model. It exists to represent HTML nodes as objects that JavaScript can interact with.
- **callback function** — A function passed into another function as an argument. It exists to be invoked later when a specific condition or event occurs.
- **arrow function** — A compact alternative to a traditional function expression. It exists to provide a shorter syntax and lexically bind the `this` value.

**Objects and methods used**

- **`THREE.PerspectiveCamera`**
  - *What it is:* A camera that uses perspective projection, making distant objects appear smaller.
  - *Implementation:* `new THREE.PerspectiveCamera(fov, aspect, near, far)`
  - *Its use:* To simulate human vision and render 3D scenes realistically in this lesson.
  - *Type:* A class extending `THREE.Camera`.
  - *Responsibility:* Manages a perspective projection matrix to transform 3D world coordinates into 2D clip space with depth cues.
  - *Depends on:* Field of view, aspect ratio, near clipping plane, and far clipping plane parameters.
  - *Connects to:* Passed to `renderer.render()`; modifies its internal `projectionMatrix`.
  - *Shape:* A high-level scene graph node (API surface) that acts as the viewer's eye.

- **`THREE.OrthographicCamera`**
  - *What it is:* A camera that uses orthographic projection, where an object's size in the rendered image stays constant regardless of its distance from the camera.
  - *Implementation:* `new THREE.OrthographicCamera(left, right, top, bottom, near, far)`
  - *Its use:* To demonstrate a projection without perspective distortion, useful for 2D games or technical overlays.
  - *Type:* A class extending `THREE.Camera`.
  - *Responsibility:* Manages an orthographic projection matrix that maps a rectangular prism (box) into clip space without perspective divide.
  - *Depends on:* Left, right, top, bottom, near, and far boundary coordinates.
  - *Connects to:* Passed to `renderer.render()`; modifies its internal `projectionMatrix`.
  - *Shape:* A high-level scene graph node (API surface) acting as an isometric or parallel viewer.

- **`camera.position.set`**
  - *What it is:* A method to define the camera's location in 3D world space.
  - *Implementation:* `camera.position.set(x, y, z)`
  - *Its use:* To place the camera at specific distances from the origin to observe the scene.
  - *Type:* An instance method on `THREE.Vector3` (via the `position` property of `Object3D`).
  - *Responsibility:* Updates the X, Y, and Z coordinates of the object's local position.
  - *Depends on:* Numeric X, Y, and Z coordinate values.
  - *Connects to:* Called on the camera object; influences the view matrix computation.
  - *Shape:* Public API surface for spatial manipulation.

- **`camera.lookAt`**
  - *What it is:* A method that rotates an object to face a specific point in space.
  - *Implementation:* `camera.lookAt(targetVector)` or `camera.lookAt(x, y, z)`
  - *Its use:* To easily point the camera at the center of the scene without manually calculating Euler angles or quaternions.
  - *Type:* An instance method on `THREE.Object3D` (inherited by cameras).
  - *Responsibility:* Computes and sets the object's rotation (quaternion) so its local Z-axis points toward the target.
  - *Depends on:* A target coordinate and the object's current `up` vector.
  - *Connects to:* Called on the camera; internally updates the local rotation.
  - *Shape:* Utility method for orientation control.

- **`camera.up.set`**
  - *What it is:* A method to define the upward direction for the camera's orientation.
  - *Implementation:* `camera.up.set(x, y, z)`
  - *Its use:* To establish the reference frame for `lookAt` so it knows how to orient the camera's local Y-axis.
  - *Type:* An instance method on `THREE.Vector3` (via the `up` property).
  - *Responsibility:* Defines the reference vector used to calculate relative orientation during look operations.
  - *Depends on:* Numeric X, Y, and Z directional values.
  - *Connects to:* Used by `lookAt` to compute the final rotation quaternion.
  - *Shape:* Configuration property for spatial reference.

- **`camera.updateProjectionMatrix`**
  - *What it is:* A method that recalculates the camera's internal projection matrix based on its current parameters.
  - *Implementation:* `camera.updateProjectionMatrix()`
  - *Its use:* Called to ensure the internal matrix reflects any changes to FOV, aspect ratio, or clipping planes before manually inspecting it.
  - *Type:* An instance method on `THREE.PerspectiveCamera` and `THREE.OrthographicCamera`.
  - *Responsibility:* Recomputes the 16 elements of the 4x4 projection matrix based on the camera's current properties.
  - *Depends on:* The camera's configuration variables (fov, aspect, near, far, etc.).
  - *Connects to:* Called explicitly when parameters change; affects the output of `projectionMatrix`.
  - *Shape:* Internal state synchronization method exposed as public API.

- **`THREE.Vector4`**
  - *What it is:* A 4D vector class used to represent points in homogeneous coordinates.
  - *Implementation:* `new THREE.Vector4(x, y, z, w)`
  - *Its use:* To manually simulate the projection matrix multiplication, requiring a W component for the perspective divide.
  - *Type:* A class in the Three.js math library.
  - *Responsibility:* Holds 4-dimensional spatial data and provides math operations on it.
  - *Depends on:* Numeric X, Y, Z, and W values.
  - *Connects to:* Used in matrix multiplication; receives the result of `applyMatrix4`.
  - *Shape:* Low-level math data structure.

- **`applyMatrix4`**
  - *What it is:* A method that multiplies a vector by a 4x4 matrix.
  - *Implementation:* `vector.applyMatrix4(matrix)`
  - *Its use:* To manually transform a 3D world space coordinate into 4D clip space.
  - *Type:* An instance method on `THREE.Vector4`.
  - *Responsibility:* Performs matrix-vector multiplication, updating the vector's components in place.
  - *Depends on:* A `THREE.Matrix4` instance.
  - *Connects to:* Called on a vector, taking a projection matrix as input.
  - *Shape:* Core math utility for linear algebra operations.

- **`divideScalar`**
  - *What it is:* A method that divides all components of a vector by a single scalar value.
  - *Implementation:* `vector.divideScalar(scalar)`
  - *Its use:* To perform the perspective divide manually, converting clip space to normalized device coordinates (NDC).
  - *Type:* An instance method on `THREE.Vector4`.
  - *Responsibility:* Scales the vector uniformly by the inverse of the provided scalar.
  - *Depends on:* A numeric scalar value.
  - *Connects to:* Modifies the vector's internal X, Y, Z, and W components.
  - *Shape:* Core math utility for vector scaling.

**Everything else in the file, not this lesson's subject but still explained:**

- **`THREE.Scene`**
  - *What it is:* The root container for all 3D objects, lights, and cameras.
  - *Implementation:* `new THREE.Scene()`
  - *Its use:* To hold the objects being rendered in the runtime switching example.
  - *Type:* A class extending `THREE.Object3D`.
  - *Responsibility:* Maintains the scene graph hierarchy of all visual elements.
  - *Depends on:* Nothing for instantiation.
  - *Connects to:* Passed to `renderer.render()`.
  - *Shape:* Core container in the Three.js architecture.

- **`THREE.WebGLRenderer`**
  - *What it is:* The engine that actually draws the 3D scene onto an HTML canvas using WebGL.
  - *Implementation:* `new THREE.WebGLRenderer({ canvas: ..., antialias: true })`
  - *Its use:* To render the scene using the active camera.
  - *Type:* A class orchestrating WebGL contexts.
  - *Responsibility:* Executes the draw calls to paint the scene onto the screen.
  - *Depends on:* An HTML `<canvas>` element and configuration options.
  - *Connects to:* Calls `render()` with a Scene and Camera.
  - *Shape:* The primary output system for the framework.

- **`requestAnimationFrame`**
  - *What it is:* A browser API that tells the browser you wish to perform an animation.
  - *Implementation:* `requestAnimationFrame(callback)`
  - *Its use:* To create a continuous render loop for the camera switching example.
  - *Type:* A global function on the browser's `window` object.
  - *Responsibility:* Schedules a callback to be executed right before the next screen repaint.
  - *Depends on:* A callback function.
  - *Connects to:* Calls the `animate` function recursively.
  - *Shape:* Browser API integration point for the render loop.

- **`document.addEventListener`**
  - *What it is:* A browser DOM API method to register an event handler.
  - *Implementation:* `document.addEventListener(eventName, callback)`
  - *Its use:* To listen for keyboard inputs to swap cameras.
  - *Type:* An instance method on the global `document` node.
  - *Responsibility:* Attaches a function to fire whenever a specific event bubbles to this node.
  - *Depends on:* An event string (like `'keydown'`) and a listener callback.
  - *Connects to:* The browser event loop; executes the callback when triggered.
  - *Shape:* DOM API binding.

- **`console.log`**
  - *What it is:* A debugging function that prints output to the web console.
  - *Implementation:* `console.log(message)`
  - *Its use:* To print calculated FOV values and matrix states.
  - *Type:* A method on the global `console` object.
  - *Responsibility:* Formats and streams text to the browser's developer tools console.
  - *Depends on:* The values passed to it.
  - *Connects to:* The developer tools output panel.
  - *Shape:* Diagnostic utility.

- **`Math.atan`**
  - *What it is:* The arctangent mathematical function.
  - *Implementation:* `Math.atan(x)`
  - *Its use:* To manually calculate the horizontal Field of View from a tangent ratio.
  - *Type:* A static method on the global `Math` object.
  - *Responsibility:* Computes the inverse tangent (in radians) of a number.
  - *Depends on:* A numeric input.
  - *Connects to:* Used in FOV trace calculations.
  - *Shape:* Standard library math utility.

- **`Math.tan`**
  - *What it is:* The tangent mathematical function.
  - *Implementation:* `Math.tan(x)`
  - *Its use:* To compute the tangent of the half-FOV angle.
  - *Type:* A static method on the global `Math` object.
  - *Responsibility:* Computes the tangent of an angle (in radians).
  - *Depends on:* A numeric angle in radians.
  - *Connects to:* Used in FOV trace calculations.
  - *Shape:* Standard library math utility.

- **`Math.PI`**
  - *What it is:* The mathematical constant Pi (ratio of a circle's circumference to its diameter).
  - *Implementation:* `Math.PI`
  - *Its use:* To convert between degrees and radians.
  - *Type:* A static property on the global `Math` object.
  - *Responsibility:* Provides a high-precision constant for trigonometry.
  - *Depends on:* Nothing.
  - *Connects to:* Used in multiplication to convert degrees.
  - *Shape:* Standard library constant.

- **`toFixed`**
  - *What it is:* A method to format a number using fixed-point notation.
  - *Implementation:* `number.toFixed(digits)`
  - *Its use:* To cleanly format floating-point projection matrix calculations for logging.
  - *Type:* An instance method on the JavaScript `Number` prototype.
  - *Responsibility:* Converts a number to a string, rounding to a specified number of decimals.
  - *Depends on:* The number of decimal digits desired.
  - *Connects to:* The string formatting output for `console.log`.
  - *Shape:* Primitive formatting utility.

---

## Concept Unit: PerspectiveCamera parameters deep dive

### The Problem
We need to define a viewpoint that mathematically shrinks objects as they move further away, mimicking human eyes. 

If you have a 1920x1080 monitor, but your virtual camera expects a perfect square aspect ratio, how would the rendered image be distorted? What would happen if a camera had no maximum "far" distance limits at all? Pause and think about what computing an infinite horizon would do to rendering performance.

### Introduce the concept in isolation
```javascript
// Throwaway Lab: Verifying PerspectiveCamera Math
import * as THREE from 'three';

// PerspectiveCamera(fov, aspect, near, far)
const cam = new THREE.PerspectiveCamera(75, 1920/1080, 0.1, 1000);

// fov=75: vertical field of view in degrees
// Horizontal FOV = 2 * atan(tan(vFOV/2) * aspect)
const vFov = 75 * Math.PI / 180;
const hFov = 2 * Math.atan(Math.tan(vFov/2) * cam.aspect);

console.log('Vertical FOV:', cam.fov + '°');
console.log('Horizontal FOV:', (hFov*180/Math.PI).toFixed(1) + '°');

// near=0.1, far=1000: objects outside this range are clipped
// Larger far/near ratio = more Z-fighting (depth buffer precision loss)
console.log('Far/near ratio:', cam.far / cam.near);
```
*(Predicted output based on known math, exempt from execution verification)*:
`Vertical FOV: 75°`
`Horizontal FOV: 107.5°`
`Far/near ratio: 10000`

This demonstrates exactly how **THREE.PerspectiveCamera** calculates its frustum. It proves that a 75-degree vertical field of view creates a ~107.5-degree horizontal field of view on a standard 16:9 widescreen layout. It also highlights the 10,000x ratio between the near and far clipping planes.

### Discard the throwaway
This raw math verification lab is discarded and will not be added to our real project source.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are creating our main camera setup for the renderer.
- **Files affected**: `lesson-09.html` (created)
- **Change type**: add
- **Location**: Inside the `<script type="module">` tag.
- **Dependencies**: Three.js imported via CDN module.

### The New Code
```javascript
import * as THREE from 'three';

const aspect = window.innerWidth / window.innerHeight;
const perspCam = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
```

### The Updated Project
```html
// ← new file: lesson-09.html
1: <!DOCTYPE html>
2: <html>
3: <body>
4: <script type="importmap">
5:   { "imports": { "three": "https://unpkg.com/three/build/three.module.js" } }
6: </script>
7: <script type="module">
8:   import * as THREE from 'three'; // ← new
9:   const aspect = window.innerWidth / window.innerHeight; // ← new
10:  const perspCam = new THREE.PerspectiveCamera(75, aspect, 0.1, 100); // ← new
11: </script>
12: </body>
13: </html>
```
This minimal setup loads Three.js and initializes a perspective camera tailored to the browser's current window size.

### Mechanical walkthrough
1. `import`: The JavaScript module keyword.
2. `*`: The import-all operator.
3. `as THREE`: The alias binding all exports into the `THREE` namespace.
4. `from 'three'`: The import specifier pointing to our CDN map.
5. `const`: The block-scoped variable declaration keyword.
6. `aspect`: The variable name holding the proportional relationship.
7. `=`: The assignment operator.
8. `window`: The global browser object.
9. `.innerWidth`: Property access retrieving the viewport width in pixels.
10. `/`: The division operator calculating the ratio.
11. `window.innerHeight`: Property access retrieving the viewport height in pixels.
12. `const perspCam`: Variable declaration for our camera.
13. `=`: The assignment operator.
14. `new`: The keyword used to instantiate a class object.
15. `THREE.PerspectiveCamera`: The class constructor that manages a perspective projection matrix to transform 3D world coordinates into 2D clip space with depth cues.
16. `(`: The opening parenthesis for constructor arguments.
17. `75`: A number literal representing the vertical field of view in degrees.
18. `,`: Argument separator.
19. `aspect`: Variable reference passing the calculated screen proportion.
20. `,`: Argument separator.
21. `0.1`: Number literal for the near clipping plane distance.
22. `,`: Argument separator.
23. `100`: Number literal for the far clipping plane distance.
24. `)`: The closing parenthesis.

### CS lens
A **projection matrix** converts a 3D coordinate (X, Y, Z) into 2D normalized device coordinates. The **PerspectiveCamera** does this by compressing the distant parts of the view frustum (the pyramid of vision). A critical artifact in 3D rendering is **Z-fighting**: depth buffers typically have ~24 bits of precision, distributed logarithmically. The space between 0.1 and 1.0 consumes as much precision as the space between 1.0 and 100.0. A large ratio between the far and near planes severely compresses the precision available for distant objects, causing overlapping geometry to flicker.

### SE lens
Engineers cap the far/near ratio (a rule of thumb is keeping `far / near < 10000`) to guarantee acceptable depth precision across the scene. Pushing `near` too close to `0.0001` is a common mistake that ruins depth sorting for distant geometry.

### Commands needed
Open `lesson-09.html` in a modern browser.

### Run it
No visual output yet, but the JavaScript console will run without errors, meaning the camera instantiated successfully.

### One sentence connecting to previous unit
Now that we understand perspective projection, we can compare it to a projection that ignores distance entirely.

---

## Concept Unit: OrthographicCamera parameters

### The Problem
Perspective distortion makes things smaller in the distance, which is terrible for a 2D UI overlay or a CAD diagram where parallel lines must stay parallel. 

If an object moves further away in a CAD program, should it shrink? If it shouldn't shrink, what kind of transformation matrix is required instead of perspective division? Pause and think about how a bounding box maps to the screen.

### Introduce the concept in isolation
```javascript
// Throwaway Lab: Verifying Orthographic bounds
import * as THREE from 'three';

const aspect = 1920 / 1080;
const frustumSize = 10;  // total visible height in world units

// OrthographicCamera(left, right, top, bottom, near, far)
const orthoCam = new THREE.OrthographicCamera(
    -frustumSize * aspect / 2,  // left
     frustumSize * aspect / 2,  // right
     frustumSize / 2,           // top
    -frustumSize / 2,           // bottom
    0.1,                        // near
    100                         // far
);

console.log('Ortho left:', orthoCam.left.toFixed(2));
console.log('Ortho right:', orthoCam.right.toFixed(2));
console.log('Ortho top:', orthoCam.top);
console.log('Ortho bottom:', orthoCam.bottom);
```
*(Predicted output based on static math, exempt from execution verification)*:
`Ortho left: -8.89`
`Ortho right: 8.89`
`Ortho top: 5`
`Ortho bottom: -5`

This demonstrates the **THREE.OrthographicCamera**. It proves that the projection matrix builds a literal rectangular box (from -8.89 to 8.89 horizontally, and -5 to +5 vertically). Objects at distance 1 and distance 50 will appear IDENTICAL in size, as there is no perspective scaling involved.

### Discard the throwaway
This isolated bounding box calculation script is discarded.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition.
- **Files affected**: `lesson-09.html`
- **Change type**: add
- **Location**: Right below the PerspectiveCamera definition.
- **Dependencies**: The `aspect` variable calculated in the previous unit.

### The New Code
```javascript
const orthoCam = new THREE.OrthographicCamera(-5 * aspect, 5 * aspect, 5, -5, 0.1, 100);
```

### The Updated Project
```html
7: <script type="module">
8:   import * as THREE from 'three';
9:   const aspect = window.innerWidth / window.innerHeight;
10:  const perspCam = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
11:  const orthoCam = new THREE.OrthographicCamera(-5 * aspect, 5 * aspect, 5, -5, 0.1, 100); // ← new
12: </script>
```
We now have two distinct camera objects living in memory side-by-side.

### Mechanical walkthrough
1. `const`: The block-scoped variable declaration keyword.
2. `orthoCam`: The variable name for the new camera.
3. `=`: The assignment operator.
4. `new`: The keyword used to instantiate a class object.
5. `THREE.OrthographicCamera`: The class constructor that manages an orthographic projection matrix that maps a rectangular prism into clip space without perspective divide.
6. `(`: The opening parenthesis for constructor arguments.
7. `-5`: Number literal representing half the vertical frustum size, negated.
8. `*`: Multiplication operator.
9. `aspect`: The variable holding the screen aspect ratio.
10. `,`: Argument separator.
11. `5`: Number literal.
12. `*`: Multiplication operator.
13. `aspect`: The variable holding the screen aspect ratio.
14. `,`: Argument separator.
15. `5`: Number literal defining the top bound.
16. `,`: Argument separator.
17. `-5`: Number literal defining the bottom bound.
18. `,`: Argument separator.
19. `0.1`: Number literal for near clipping plane.
20. `,`: Argument separator.
21. `100`: Number literal for far clipping plane.
22. `)`: Closing parenthesis.

### CS lens
In linear algebra, an orthographic projection matrix strictly performs scaling and translation. It maps X to `[-1, 1]` via an `xy scale` equation `2/(right-left)` and `2/(top-bottom)`. The Z coordinate is mapped linearly to `[-1, 1]` for depth buffering. Because the `W` component remains `1.0`, the final **perspective divide** step does absolutely nothing — meaning parallel lines stay parallel indefinitely.

### SE lens
Game engines load both perspective and orthographic cameras simultaneously into memory. While the perspective camera is used for rendering the 3D world, the orthographic camera is passed to a secondary render pass strictly to draw 2D health bars, minimaps, and UI elements directly over the screen, bypassing perspective logic entirely.

### Commands needed
Open `lesson-09.html` in a modern browser.

### Run it
The console will execute the instantiation without errors, holding both cameras in memory.

### One sentence connecting to previous unit
With both cameras created in memory, we need a way to hot-swap them into the render loop dynamically.

---

## Concept Unit: Switching cameras at runtime

### The Problem
A 3D level editor often needs a 3D perspective view for flying around, and a 2D orthographic top-down view for placing objects precisely. We need to swap them dynamically. 

If a scene has 10,000 objects, do you need to modify the objects themselves to change from 3D to 2D? What exactly does the renderer need to know to change the projection? Pause and think about what object is handed to the render call.

### Introduce the concept in isolation
```javascript
// Throwaway Lab: Dynamic swapping logic
let currentTarget = "A";

document.addEventListener('keydown', (e) => {
    if (e.key === 'p') { currentTarget = "A"; console.log("Swapped to A"); }
    if (e.key === 'o') { currentTarget = "B"; console.log("Swapped to B"); }
});

function loop() {
    // requestAnimationFrame(loop);
    // process(currentTarget);
}
loop();
```
*(Predicted output based on deterministic JavaScript event flow, exempt)*:
When the user presses 'o', the console prints `Swapped to B`. The loop will repeatedly pass `"B"` instead of `"A"`.

This isolates the **event listener** state swap. It proves that holding a mutable reference (`currentTarget`) allows a continuous loop to seamlessly shift targets without recreating or destroying objects.

### Discard the throwaway
This string-swapping logic is discarded.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition.
- **Files affected**: `lesson-09.html`
- **Change type**: add
- **Location**: Below the camera creations.
- **Dependencies**: A basic `THREE.Scene` and `THREE.WebGLRenderer` setup.

### The New Code
```javascript
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
document.body.appendChild(renderer.domElement);
renderer.setSize(window.innerWidth, window.innerHeight);

let activeCamera = perspCam;

document.addEventListener('keydown', (e) => {
    if (e.key === 'p') { activeCamera = perspCam; console.log('Perspective'); }
    if (e.key === 'o') { activeCamera = orthoCam; console.log('Orthographic'); }
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, activeCamera);
}
animate();
```

### The Updated Project
```html
7: <script type="module">
8:   import * as THREE from 'three';
9:   const aspect = window.innerWidth / window.innerHeight;
10:  const perspCam = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
11:  const orthoCam = new THREE.OrthographicCamera(-5 * aspect, 5 * aspect, 5, -5, 0.1, 100);
12:
13:  const scene = new THREE.Scene(); // ← new
14:  const renderer = new THREE.WebGLRenderer({ antialias: true }); // ← new
15:  document.body.appendChild(renderer.domElement); // ← new
16:  renderer.setSize(window.innerWidth, window.innerHeight); // ← new
17:
18:  let activeCamera = perspCam; // ← new
19:
20:  document.addEventListener('keydown', (e) => { // ← new
21:      if (e.key === 'p') { activeCamera = perspCam; console.log('Perspective'); } // ← new
22:      if (e.key === 'o') { activeCamera = orthoCam; console.log('Orthographic'); } // ← new
23:  }); // ← new
24:
25:  function animate() { // ← new
26:      requestAnimationFrame(animate); // ← new
27:      renderer.render(scene, activeCamera); // ← new
28:  } // ← new
29:  animate(); // ← new
30: </script>
```
The script now builds the engine infrastructure, sets up a mutable `activeCamera` variable, and runs a render loop that reacts to keyboard inputs.

### Mechanical walkthrough
1. `const scene`: Variable declaration.
2. `=`: Assignment operator.
3. `new THREE.Scene`: The class constructor that maintains the scene graph hierarchy.
4. `()`: Constructor invocation.
5. `const renderer`: Variable declaration.
6. `=`: Assignment operator.
7. `new THREE.WebGLRenderer`: The engine constructor that executes the draw calls to paint the scene onto the screen.
8. `({ antialias: true })`: The options object passed to the constructor.
9. `document.body.appendChild`: DOM API to insert an element into the page.
10. `(`: Opening parenthesis.
11. `renderer.domElement`: Property access retrieving the actual `<canvas>` HTML element generated by the engine.
12. `)`: Closing parenthesis.
13. `renderer.setSize`: Method call to set canvas dimensions.
14. `(window.innerWidth, window.innerHeight)`: Execution passing screen sizes.
15. `let activeCamera`: Mutable variable declaration.
16. `= perspCam`: Assignment.
17. `document.addEventListener`: The DOM API method that attaches a function to fire whenever a specific event bubbles.
18. `('keydown', ...)`: Passing the event string.
19. `(e) => {`: Defining an **arrow function** callback.
20. `if (e.key === 'p')`: Branching checking the literal key pressed.
21. `{ activeCamera = perspCam; ... }`: Reassigning the mutable reference.
22. `console.log`: The debugging function printing output to the web console.
23. `('Perspective')`: String literal passed to log.
24. `if (e.key === 'o')`: Secondary check for orthographic key.
25. `{ activeCamera = orthoCam; ... }`: State swap.
26. `function animate() {`: Standard function declaration.
27. `requestAnimationFrame`: The browser API that schedules a callback to be executed right before the next screen repaint.
28. `(animate)`: Passing the function itself recursively.
29. `renderer.render`: The execution call to paint the frame.
30. `(scene, activeCamera)`: Passing the data graph and the current camera.
31. `animate()`: Initial invocation to bootstrap the loop.

### CS lens
The `render` loop isolates state mutations from frame generation. Three.js uses the projection matrix attached to the provided camera parameter. Switching cameras merely passes a different internal matrix into the WebGL shaders on the next frame. The 3D scene data itself is totally unaware of this change.

### SE lens
Using a mutable reference pointer (`activeCamera`) is a standard architectural pattern for managing active states. Rather than writing branches inside the `animate()` loop (`if (mode === "P") render(p); else render(o);`), passing the reference directly maintains a decoupled, O(1) rendering execution path that easily scales to dozens of viewports.

### Commands needed
Open `lesson-09.html` in a modern browser.

### Run it
The canvas is black (no geometry yet), but pressing 'p' and 'o' logs the mode to the developer console.

### One sentence connecting to previous unit
We can swap cameras seamlessly, but right now both cameras are sitting at the absolute origin `(0,0,0)` staring down an arbitrary axis.

---

## Concept Unit: Camera position, lookAt, and up vector

### The Problem
Our cameras are created, but they are sitting at the origin `(0,0,0)` looking down an arbitrary default axis. 

If you move a camera to `x=5`, how does the camera know where the center of the scene is? If it rotates to look at the center, how does it know which way is "up" so the world doesn't appear sideways? Pause and sketch out what an "up" vector means in space.

### Introduce the concept in isolation
```javascript
// Throwaway Lab: Verifying lookAt rotations
import * as THREE from 'three';

const testCam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);

// position: where the camera is in world space
testCam.position.set(0, 10, 0);  // directly above origin

// up vector: defines 'which way is up'
testCam.up.set(0, 1, 0);         // Default Y-up

// lookAt: rotates camera to face a point
testCam.lookAt(new THREE.Vector3(0, 0, 0));

console.log('Camera rotation X:', (testCam.rotation.x * 180 / Math.PI).toFixed(1) + '°');
```
*(Predicted output based on vector math, exempt)*:
`Camera rotation X: -90.0°`

This demonstrates **camera.lookAt()** and **camera.up.set()**. It proves that when positioned 10 units up on the Y axis, looking at `0,0,0` automatically computes a -90° rotation on the X axis to aim the lens straight down.

### Discard the throwaway
This raw rotation calculation is discarded.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition.
- **Files affected**: `lesson-09.html`
- **Change type**: add
- **Location**: Right after the camera initializations, before the scene is created.
- **Dependencies**: The `perspCam` and `orthoCam` instances.

### The New Code
```javascript
perspCam.position.set(0, 3, 8);
perspCam.lookAt(0, 0, 0);

orthoCam.position.set(0, 3, 8);
orthoCam.lookAt(0, 0, 0);
```

### The Updated Project
```html
10:  const perspCam = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
11:  const orthoCam = new THREE.OrthographicCamera(-5 * aspect, 5 * aspect, 5, -5, 0.1, 100);
12:
13:  perspCam.position.set(0, 3, 8); // ← new
14:  perspCam.lookAt(0, 0, 0); // ← new
15:  
16:  orthoCam.position.set(0, 3, 8); // ← new
17:  orthoCam.lookAt(0, 0, 0); // ← new
18:
19:  const scene = new THREE.Scene();
```
Both cameras are now positioned back 8 units, up 3 units, and explicitly pitched down to look at the center of the world.

### Mechanical walkthrough
1. `perspCam`: Variable reference.
2. `.position`: Property access for the local transform translation object.
3. `.set`: The method that updates the X, Y, and Z coordinates of the object's local position.
4. `(0, 3, 8)`: The numeric X, Y, and Z arguments.
5. `perspCam.lookAt`: The method that computes and sets the object's rotation (quaternion) so its local Z-axis points toward the target.
6. `(0, 0, 0)`: Execution passing the absolute origin vector as numbers.
7. `orthoCam.position.set`: Same position update on the orthographic camera.
8. `(0, 3, 8)`: Passing matching coordinates.
9. `orthoCam.lookAt`: Same rotation computation on the orthographic camera.
10. `(0, 0, 0)`: Execution passing the target vector.

### CS lens
Behind the scenes, `lookAt` calculates the direction vector by subtracting the camera's position from the target's position. It normalizes this direction, then takes the cross product of the direction and the `up` vector to find the right-side axis. The cross product of the right and direction vectors gives the true orthogonal up axis. These three orthogonal vectors form a 3x3 rotation matrix, solving the orientation math entirely. If you look straight down a vector matching the `up` vector, cross products yield zero length, causing a mathematical singularity known as Gimbal Lock.

### SE lens
Using `lookAt` is far less error-prone than manually trying to calculate Euler angles (`rotation.x = -Math.PI / 4`). Hardcoded angles break instantly if the camera or target ever moves. `lookAt` dynamically reconstructs the correct spatial orientation from arbitrary coordinates at runtime.

### Commands needed
Open `lesson-09.html` in a modern browser.

### Run it
The canvas runs with identical logical execution as before, though the cameras are now officially pointing at the origin.

### One sentence connecting to previous unit
With the cameras firmly placed in the world, we can now manually inspect the raw mathematical matrices they generate.

---

## Concept Unit: Projection matrix inspection and manual clip space

### The Problem
Three.js hides the complex math of dividing X and Y by depth (Z) to create perspective, but understanding this matrix is critical for advanced graphics programming. 

If the projection matrix is a 4x4 grid of numbers, where does the field of view angle actually get stored? How do 3D coordinates map to a standardized -1 to 1 box? Pause and calculate what happens if a point's depth exceeds the far clipping plane.

### Introduce the concept in isolation
```javascript
// Throwaway Lab: Tracing a 3D point through the matrix manually
import * as THREE from 'three';

const cam = new THREE.PerspectiveCamera(75, 16/9, 0.1, 100);
cam.updateProjectionMatrix();

// The 4x4 projection matrix (column-major array of 16 elements):
const P = cam.projectionMatrix.elements;

console.log('P[0] (x scale):', P[0].toFixed(4));
console.log('P[5] (y scale):', P[5].toFixed(4));

// Manual point projection:
const point = new THREE.Vector4(2, 1, -5, 1);  // 3D world space (w=1)
point.applyMatrix4(cam.projectionMatrix);       // transforms to clip space

console.log('Clip space Z:', point.z.toFixed(2), 'Clip space W:', point.w.toFixed(2));

// Perspective divide -> Normalized Device Coordinates (NDC)
point.divideScalar(point.w);                   

console.log('NDC:', point.x.toFixed(3), point.y.toFixed(3), point.z.toFixed(3));
```
*(Predicted output based on 4x4 matrix multiplication math, exempt)*:
`P[0] (x scale): 0.7476`
`P[5] (y scale): 1.3032`
`Clip space Z: 4.90 Clip space W: 5.00`
`NDC: 0.299 0.261 0.980`

This isolates the manual **perspective divide** sequence. It proves that scaling factors derived from the FOV (`1.3032`) multiply the coordinates, and dividing by `W` (which captured the depth `5.00`) normalizes the X, Y, and Z values strictly between `-1` and `1`.

### Discard the throwaway
This manual 4D vector multiplication script is discarded.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition for inspection logging.
- **Files affected**: `lesson-09.html`
- **Change type**: modify
- **Location**: Inside the `keydown` event listener from Unit 3.
- **Dependencies**: The `perspCam.projectionMatrix` array.

### The New Code
```javascript
        console.log('P[5] (y scale):', perspCam.projectionMatrix.elements[5].toFixed(4)); 
```

### The Updated Project
```html
20:  document.addEventListener('keydown', (e) => {
21:      if (e.key === 'p') { 
22:          activeCamera = perspCam; 
23:          console.log('Perspective'); 
24:          console.log('P[5] (y scale):', perspCam.projectionMatrix.elements[5].toFixed(4)); // ← new
25:      }
26:      if (e.key === 'o') { 
27:          activeCamera = orthoCam; 
28:          console.log('Orthographic'); 
29:      }
30:  });
```
We log the internal matrix elements to the console every time we swap to the perspective camera, proving that the abstract camera object indeed carries a raw numerical matrix underneath.

### Mechanical walkthrough
1. `console.log`: The debugging function printing output to the console.
2. `('P[5] (y scale):', ...)`: String literal prefix passed as the first argument.
3. `perspCam`: Variable reference to the perspective camera object.
4. `.projectionMatrix`: Property access retrieving the `Matrix4` object maintained by the camera.
5. `.elements`: Property access reading the raw 16-number Float32Array backing the matrix.
6. `[5]`: Array indexing retrieving the 6th element (vertical scale factor).
7. `.toFixed`: The method that converts a number to a string, rounding to a specified number of decimals.
8. `(4)`: Execution passing 4 decimals of precision.

### CS lens
In computer graphics, a 4x4 matrix is stored in a 1D column-major array of 16 floats. The index `5` corresponds to row 1, column 1, which governs vertical scaling. For a perspective projection, `P[5]` is exactly `1 / tan(vFov / 2)`. Because the camera FOV is 75°, the half-angle is 37.5°, and `1 / tan(37.5°)` equals `1.3032`.

### SE lens
Three.js handles matrix state caching internally. `camera.updateProjectionMatrix()` is called manually when you alter FOV or aspect ratio, but simply reading `projectionMatrix.elements` returns the currently cached buffer. This lazy-evaluation architecture avoids rebuilding complex matrices 60 times a second unless parameters actually mutated.

### Commands needed
Open `lesson-09.html` in a modern browser.

### Run it
When pressing 'p', the console will print `P[5] (y scale): 1.3032`, verifying the FOV math trace perfectly.

### One sentence connecting to previous unit
With the projection matrices fully decoded, our next module will place visible 3D geometry onto the screen for the cameras to observe.

## Closing
### Connect the pieces
Tracing the switch from PerspectiveCamera to OrthographicCamera reveals that the exact same scene objects appear entirely different sizes relative to each other. This traces entirely to the underlying mathematical difference in their projection matrices: the perspective matrix loads the point's depth into the `W` vector slot for division, aggressively scaling distant X and Y values, while the orthographic matrix skips division entirely. Understanding these matrices allows you to control whether a scene mimics the human eye or acts as a rigid, uniform technical schematic.
