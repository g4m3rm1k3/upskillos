# Lesson 04: Responding to the Window — Resize Handling and Aspect Ratio

**What you will build**
The reader handles window resize events correctly: updating camera aspect ratio, calling `camera.updateProjectionMatrix()`, resizing the renderer, and using CSS to make the canvas fill the page. The transferable insight: when the window resizes, THREE things must update together — renderer size, camera aspect ratio, and camera projection matrix. Missing any one of them causes stretching or wrong FOV.

**What you need to know first**
Lesson 00, Lesson 01, Lesson 02, Lesson 03

**Terms used in this lesson**
- **Aspect Ratio** — The proportional relationship between the width and height of an image or screen. It exists to ensure that the image is not stretched or squished when rendered.
- **Frustum** — The region of space in the modeled world that may appear on the screen. It exists to cull objects that are not visible to the camera, saving rendering computation.
- **Device Pixel Ratio** — The ratio between physical pixels and logical CSS pixels on a device. It exists to allow high-resolution displays (like Retina) to render sharper images by using more physical pixels for the same logical size.
- **Fullscreen API** — A browser API that allows an element (or the whole document) to take up the entire screen, hiding the browser UI. It exists to provide immersive experiences.

**Objects and methods used**

**`THREE.PerspectiveCamera`**
- *What it is:* A camera projection mode designed to mimic the way the human eye sees.
- *Implementation:* `new THREE.PerspectiveCamera(fov, aspect, near, far)`
- *Its use:* To define what part of the 3D scene is visible and how it is projected onto the 2D screen.
- *Type:* Class
- *Responsibility:* Maintains the camera's intrinsic parameters (field of view, aspect ratio, near and far clipping planes) and computes the resulting projection matrix.
- *Depends on:* Field of view, aspect ratio, near plane distance, far plane distance.
- *Connects to:* Called by the application to configure the view; used by the `WebGLRenderer` to project 3D coordinates to 2D.
- *Shape:* Public API surface.

**`PerspectiveCamera.updateProjectionMatrix()`**
- *What it is:* A method to recalculate the camera's projection matrix.
- *Implementation:* `camera.updateProjectionMatrix()`
- *Its use:* Must be called after changing any camera parameters (like aspect ratio) so the changes take effect in the rendering pipeline.
- *Type:* Instance method
- *Responsibility:* Rebuilds the internal 4x4 projection matrix based on the current camera properties.
- *Depends on:* The current values of `fov`, `aspect`, `near`, and `far` on the camera instance.
- *Connects to:* Called by the application after modifying properties; modifies internal state read by the renderer.
- *Shape:* Public API surface.

**`WebGLRenderer.setSize()`**
- *What it is:* A method to resize the output canvas and the internal WebGL drawing buffer.
- *Implementation:* `renderer.setSize(width, height, updateStyle)`
- *Its use:* Called when the window resizes to ensure the rendering resolution matches the new display size.
- *Type:* Instance method
- *Responsibility:* Sets the dimensions of the `<canvas>` element and the WebGL context's viewport, determining how many pixels are rendered.
- *Depends on:* Desired width and height in logical pixels.
- *Connects to:* Called by the application; modifies the DOM element and the WebGL state.
- *Shape:* Public API surface.

**`WebGLRenderer.setPixelRatio()`**
- *What it is:* A method to set the pixel ratio of the renderer.
- *Implementation:* `renderer.setPixelRatio(value)`
- *Its use:* Called to accommodate high-DPI displays by rendering at a higher internal resolution while maintaining the same CSS size.
- *Type:* Instance method
- *Responsibility:* Scales the internal WebGL buffer size relative to the CSS size of the canvas to improve sharpness on high-density displays.
- *Depends on:* The desired pixel ratio (usually derived from `window.devicePixelRatio`).
- *Connects to:* Called by the application; alters the internal resolution used during `setSize`.
- *Shape:* Public API surface.

**`window.addEventListener()`**
- *What it is:* A DOM method to register an event handler.
- *Implementation:* `window.addEventListener(type, listener)`
- *Its use:* Used to listen for 'resize' and 'keydown' events to trigger layout updates and fullscreen toggling.
- *Type:* Native DOM method
- *Responsibility:* Maintains a list of callback functions for a specific event type and invokes them when the event occurs.
- *Depends on:* The event type string and the callback function.
- *Connects to:* Called by the application; triggered by the browser engine.
- *Shape:* Boundary between framework/browser and app code.

**Everything else in the file, not this lesson's subject but still explained**
*(None in this lesson)*

## Concept Unit: The resize problem

### The Problem
When the browser window resizes, the canvas containing our 3D scene stays the same size, or if we force it to change using CSS, the image inside it becomes distorted. Why does changing the size of the container stretch the objects inside instead of just showing more of the scene?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

// camera.aspect must match canvas width/height ratio
// If they differ: objects appear stretched or squished
const camera = new THREE.PerspectiveCamera(75, 1.0, 0.1, 1000); // aspect=1 (square)

// If rendered on a 1920x1080 canvas: aspect should be 1920/1080=1.778
// With aspect=1: everything appears squished horizontally
console.log('Correct aspect:', window.innerWidth / window.innerHeight);
console.log('Wrong aspect: 1.0 -> stretched by factor:', (window.innerWidth/window.innerHeight).toFixed(3));

// After changing aspect: MUST call camera.updateProjectionMatrix()
// otherwise Three.js uses the OLD matrix and aspect change has no effect
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
```
*Output: (Stated directly from confidence, not executed)*
```
Correct aspect: 1.778
Wrong aspect: 1.0 -> stretched by factor: 1.778
```
This proves that the camera's aspect ratio defines the shape of the viewing frustum, and failing to update it (and its projection matrix) when the display area changes shape results in a mismatch between the calculated projection and the physical display, causing distortion.

### Discard the throwaway
This throwaway demonstration is discarded and will not be used in the project.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we need to handle browser window resizing.
- **Files affected:** `lesson-04.html` (modified)
- **Change type:** configure
- **Location:** At the camera initialization.
- **Dependencies:** None.

### The New Code
```javascript
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
```

### The Updated Project
```javascript
// 1: import * as THREE from 'three';
// 2: const scene = new THREE.Scene();
// 3: // ← new
// 4: const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
```
The camera is now initialized with an aspect ratio that matches the current window dimensions, rather than a hardcoded value.

### Mechanical walkthrough
- `const camera` declares a constant variable to hold our camera instance.
- `=` assigns the right-hand value to the variable.
- `new THREE.PerspectiveCamera(...)` creates a new instance of a perspective camera.
- `75` is the field of view in degrees.
- `window.innerWidth / window.innerHeight` calculates the current aspect ratio of the browser window.
- `0.1` is the near clipping plane.
- `1000` is the far clipping plane.

### CS lens
The projection matrix is a mathematical transformation that converts 3D coordinates in camera space into 2D coordinates on the screen. The aspect ratio is a critical parameter in this matrix. If the aspect ratio used to build the matrix doesn't match the aspect ratio of the actual display area (the canvas), the math maps a space of one shape into a rectangle of a different shape, resulting in stretching or squishing.

### SE lens
By dynamically calculating the aspect ratio from the window dimensions at initialization, we eliminate a magic number (`1.0` or `1920/1080`) and replace it with a derived value that is always correct for the environment the code is running in. This is the first step toward responsive design in 3D graphics.

### Commands needed
Open `lesson-04.html` in a modern browser.

### Run it
The scene renders without distortion upon initial load, regardless of the window's starting size.

### One sentence connecting to previous unit
While the initial render is correct, we still need a way to update these values if the window size changes *after* the page loads.

## Concept Unit: The resize event handler

### The Problem
If the user resizes their browser window after the page has loaded, the canvas stays its original size, and the 3D scene either gets cut off or doesn't fill the new space. How do we tell our application to recalculate and redraw when the window dimensions change?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

const camera   = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias: true});

function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // 1. Update renderer output size:
    renderer.setSize(w, h);
    // 2. Update camera aspect ratio:
    camera.aspect = w / h;
    // 3. Recompute projection matrix from new aspect:
    camera.updateProjectionMatrix();
    console.log(`Resized to ${w}x${h}, aspect=${(w/h).toFixed(3)}`);
}

// Listen for resize events:
window.addEventListener('resize', onResize);
// Call once on load to set correct initial size:
onResize();
```
*Output: (Stated directly from confidence, not executed)*
```
Resized to 1280x720, aspect=1.778
```
This proves that by listening to the `resize` event, we can intercept changes to the window dimensions and synchronously update the renderer's buffer size, the camera's aspect ratio property, and trigger a rebuild of the projection matrix so the next frame is drawn correctly.

### Discard the throwaway
This isolated event listener demonstration is discarded.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are adding dynamic resize support.
- **Files affected:** `lesson-04.html` (modified)
- **Change type:** add
- **Location:** After setting up the camera and renderer, before the animation loop.
- **Dependencies:** None.

### The New Code
```javascript
function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
```

### The Updated Project
```javascript
// 10: const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c')});
// 11: // ← new
// 12: function onResize() {
// 13:     renderer.setSize(window.innerWidth, window.innerHeight);
// 14:     camera.aspect = window.innerWidth / window.innerHeight;
// 15:     camera.updateProjectionMatrix();
// 16: }
// 17: window.addEventListener('resize', onResize);
// 18: onResize();
```
The application now listens for window resize events and updates the three critical components required to maintain a correct render: the renderer size, the camera aspect ratio, and the camera projection matrix.

### Mechanical walkthrough
- `function onResize() { ... }` defines a new function that acts as our event handler.
- `renderer.setSize(...)` updates the internal pixel buffer size of the WebGL renderer.
- `window.innerWidth` and `window.innerHeight` read the current inner dimensions of the browser window.
- `camera.aspect = ...` updates the aspect property on the camera instance.
- `camera.updateProjectionMatrix()` tells the camera to recalculate its internal matrix using the new aspect ratio.
- `window.addEventListener('resize', onResize)` registers our function to be called by the browser whenever the 'resize' event fires.
- `onResize()` is called immediately once to ensure the initial sizes are set correctly based on the current window.

### CS lens
Event-driven programming flips the control flow: instead of our code constantly checking if the window has resized (polling), we hand a function pointer (`onResize`) to the browser, and the browser invokes it exactly when the state changes. This is vastly more efficient for events that happen sporadically.

### SE lens
Grouping these three dependent updates (renderer size, camera aspect, matrix update) into a single function ensures they always happen together. In graphics programming, modifying state without committing it (failing to call `updateProjectionMatrix`) is a classic source of silent bugs where the visual output doesn't match the object's properties.

### Commands needed
Open `lesson-04.html` in a modern browser.

### Run it
Resize the browser window. The 3D scene fluidly resizes, and objects remain correctly proportioned without stretching.

### One sentence connecting to previous unit
Now that our JavaScript handles the WebGL resolution, we need to ensure the HTML canvas element itself actually stretches to fill the browser viewport.

## Concept Unit: CSS setup — canvas fills the viewport

### The Problem
Even though our renderer updates its internal pixel buffer size, default HTML/CSS rules add margins, padding, and sometimes scrollbars. How do we ensure our canvas element sits perfectly flush against the edges of the window without overflowing?

### Introduce the concept in isolation
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Remove default margin/padding */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; background: #000; }
    /* Canvas fills full viewport: */
    canvas {
        display: block;          /* removes inline gap under canvas */
        width: 100vw;            /* viewport width */
        height: 100vh;           /* viewport height */
    }
  </style>
</head>
<body>
<canvas id="c"></canvas>
<script type="module">
import * as THREE from 'three';
const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c')});
// renderer.setSize sets the PIXEL BUFFER size, not CSS size
// CSS above handles layout; JS handles resolution
renderer.setSize(window.innerWidth, window.innerHeight);
console.log('Canvas CSS:', document.getElementById('c').style.width);
// '' (empty) - CSS class handles it, not inline style
</script>
</body>
</html>
```
*Output: (Stated directly from confidence, not executed)*
```
Canvas CSS: 
```
This proves that CSS layout and WebGL buffer size are distinct concerns. The CSS forces the `<canvas>` DOM element to fill the screen (using `vw` and `vh`), while `display: block` removes the phantom baseline space typical of inline elements, and `overflow: hidden` prevents scrollbars.

### Discard the throwaway
This isolated HTML/CSS snippet is discarded.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are styling the HTML page.
- **Files affected:** `lesson-04.html` (modified)
- **Change type:** add
- **Location:** In the `<head>` section of the HTML document.
- **Dependencies:** None.

### The New Code
```html
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { overflow: hidden; background: #000; }
  canvas { display: block; width: 100vw; height: 100vh; }
</style>
```

### The Updated Project
```html
<!-- 1: <!DOCTYPE html> -->
<!-- 2: <html> -->
<!-- 3: <head> -->
<!-- 4:   <title>Lesson 04</title> -->
<!-- 5:   // ← new -->
<!-- 6:   <style> -->
<!-- 7:     * { margin: 0; padding: 0; box-sizing: border-box; } -->
<!-- 8:     body { overflow: hidden; background: #000; } -->
<!-- 9:     canvas { display: block; width: 100vw; height: 100vh; } -->
<!-- 10:  </style> -->
<!-- 11: </head> -->
```
The page now has CSS rules that strip default browser margins, set a black background, and force the canvas to strictly obey viewport dimensions without triggering scrollbars.

### Mechanical walkthrough
- `<style>` opens a block of CSS rules.
- `* { ... }` applies rules to all elements, resetting default margins and padding.
- `box-sizing: border-box` ensures padding and borders are included in the element's total width and height.
- `body { overflow: hidden; ... }` hides any content that bleeds outside the body, eliminating scrollbars.
- `background: #000` sets the page background to black.
- `canvas { ... }` targets the canvas element.
- `display: block` changes the canvas from its default `inline` display, removing a small gap browsers leave underneath inline elements for text descenders.
- `width: 100vw` sets the width to 100% of the viewport width.
- `height: 100vh` sets the height to 100% of the viewport height.

### CS lens
Separation of concerns: HTML dictates structure, CSS dictates layout and presentation on the page, and JavaScript/WebGL dictates the internal rasterization resolution. A `<canvas>` element actually has two sizes: its CSS styling size (how large it appears on the screen) and its drawing buffer size (how many pixels are in the memory array). Keeping them aligned is what produces crisp graphics.

### SE lens
Applying a universal reset (`* { margin: 0; ... }`) normalizes behavior across different browsers, which all have slightly different default stylesheets. This creates a predictable baseline for full-screen applications.

### Commands needed
Open `lesson-04.html` in a modern browser.

### Run it
The canvas now perfectly fills the browser window, leaving no white margins and triggering no scrollbars.

### One sentence connecting to previous unit
While the layout is perfect, high-resolution screens (like Retina displays) might render the scene fuzzily because the internal pixel buffer doesn't match the physical pixels of the display.

## Concept Unit: setPixelRatio and sharp rendering

### The Problem
On a high-DPI monitor or a smartphone, a 100x100 CSS square might actually be drawn using 200x200 or 300x300 physical pixels. If we only set our WebGL buffer size based on the logical CSS dimensions (`window.innerWidth`), the browser stretches a low-resolution buffer across those extra physical pixels, resulting in blurry edges. How do we tell Three.js to render at the native physical resolution?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias: true});

// Cap pixel ratio at 2 for performance (4K Retina = 4x pixels = 4x GPU work)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

console.log('Device pixel ratio:', window.devicePixelRatio);
console.log('Capped pixel ratio:', renderer.getPixelRatio());
console.log('Actual buffer width:', renderer.domElement.width);
// On Retina (dpr=2): buffer = 2 * window.innerWidth
// On 4K (dpr=3): capped at 2, buffer = 2 * window.innerWidth (not 3x)
```
*Output: (Stated directly from confidence, not executed. Assuming a standard 1080p non-Retina monitor for this output.)*
```
Device pixel ratio: 1
Capped pixel ratio: 1
Actual buffer width: 1920
```
This proves that `setPixelRatio` acts as a multiplier. When set, subsequent calls to `setSize` will multiply the provided logical width and height by this ratio to determine the actual number of pixels in the WebGL drawing buffer. Capping it at 2 prevents the GPU from being overwhelmed on ultra-high-density screens where the visual difference between 2x and 3x is imperceptible but the performance cost is massive.

### Discard the throwaway
This isolated pixel ratio setup is discarded.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we want sharp rendering on high-DPI displays.
- **Files affected:** `lesson-04.html` (modified)
- **Change type:** add
- **Location:** Inside the renderer configuration, and inside the `onResize` handler.
- **Dependencies:** None.

### The New Code
```javascript
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

### The Updated Project
```javascript
// 10: const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c')});
// 11: // ← new
// 12: renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// 13: 
// 14: function onResize() {
// 15:     // ← new
// 16:     renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// 17:     renderer.setSize(window.innerWidth, window.innerHeight);
// 18:     camera.aspect = window.innerWidth / window.innerHeight;
// 19:     camera.updateProjectionMatrix();
// 20: }
```
The renderer now queries the device's pixel ratio, caps it at 2, and uses it to size its internal buffer. We also update this inside `onResize` in case the user drags the window across monitors with different pixel densities.

### Mechanical walkthrough
- `renderer.setPixelRatio(...)` sets the multiplier applied to the renderer's internal resolution.
- `Math.min(...)` returns the smallest of zero or more numbers.
- `window.devicePixelRatio` is a browser-provided value representing the ratio of physical pixels to logical CSS pixels.
- `2` is our hard cap. If `devicePixelRatio` is 3, `Math.min(3, 2)` returns 2.

### CS lens
Pixel density changes the computational cost of rendering non-linearly. A device pixel ratio of 2 means rendering 4 times as many pixels (2x width * 2x height). A ratio of 3 means rendering 9 times as many pixels. By capping the ratio at 2, we avoid a 9x performance cliff on devices that have extremely dense screens (like modern smartphones) but don't have the GPU power to match.

### SE lens
Defensive programming: we don't blindly trust environment variables (`window.devicePixelRatio`) to dictate our application's workload. We read the environment variable to provide a good experience, but impose our own sensible limits (`Math.min`) to protect the application's stability and frame rate.

### Commands needed
Open `lesson-04.html` in a modern browser.

### Run it
The scene now renders sharply on Retina displays and high-end smartphones without a severe performance penalty.

### One sentence connecting to previous unit
The view looks great inside the browser window, but for a truly immersive experience, we should allow the user to take the canvas completely full-screen.

## Concept Unit: Fullscreen toggle

### The Problem
A web page still has browser chrome (tabs, URL bar) that detracts from a 3D application. How can we allow the user to press a key to strip away the browser UI and take over the entire physical screen?

### Introduce the concept in isolation
```javascript
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            console.log('Entered fullscreen');
        });
    } else {
        document.exitFullscreen().then(() => {
            console.log('Exited fullscreen');
        });
    }
}

// Press 'F' to toggle fullscreen:
document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
});

// Handle fullscreen-triggered resize:
document.addEventListener('fullscreenchange', () => {
    // Browser fires resize event automatically on fullscreen change
    // Our existing resize handler covers it
    console.log('Fullscreen:', !!document.fullscreenElement);
    console.log('New size:', window.innerWidth, 'x', window.innerHeight);
});
```
*Output: (Stated directly from confidence, not executed. Simulating user pressing 'F')*
```
Entered fullscreen
Fullscreen: true
New size: 1920 x 1080
```
This proves that we can request fullscreen on the `document.documentElement` (the entire `<html>` tag). When the transition happens, the browser automatically fires a `resize` event, which means our existing `onResize` handler will catch the change and correctly update the camera and renderer without any extra work.

### Discard the throwaway
This isolated fullscreen logic is discarded.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are adding user-driven fullscreen controls.
- **Files affected:** `lesson-04.html` (modified)
- **Change type:** add
- **Location:** At the bottom of the script, before the animation loop.
- **Dependencies:** None.

### The New Code
```javascript
window.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
});
```

### The Updated Project
```javascript
// 20: }
// 21: window.addEventListener('resize', onResize);
// 22: onResize();
// 23: 
// 24: // ← new
// 25: window.addEventListener('keydown', (e) => {
// 26:     if (e.key === 'f' || e.key === 'F') {
// 27:         if (!document.fullscreenElement) {
// 28:             document.documentElement.requestFullscreen();
// 29:         } else {
// 30:             document.exitFullscreen();
// 31:         }
// 32:     }
// 33: });
```
The user can now press the 'F' key to toggle fullscreen mode.

### Mechanical walkthrough
- `window.addEventListener('keydown', (e) => { ... })` listens for keyboard presses.
- `(e)` is the event object passed to the callback.
- `e.key === 'f' || e.key === 'F'` checks if the pressed key is "f", handling both lowercase and uppercase (if caps lock is on).
- `document.fullscreenElement` is a property that returns the element currently in fullscreen mode, or `null` if the browser is not in fullscreen mode.
- `!document.fullscreenElement` evaluates to true if we are not currently fullscreen.
- `document.documentElement.requestFullscreen()` asks the browser to make the root HTML element take up the whole screen. This returns a Promise (which we ignore here).
- `document.exitFullscreen()` asks the browser to leave fullscreen mode.

### CS lens
The Fullscreen API requires a user gesture (like a click or a keydown event) to activate. This is a security and anti-abuse mechanism in browsers. A script cannot simply force the user's screen into fullscreen mode on page load without their explicit interaction.

### SE lens
By leveraging the fact that `requestFullscreen()` implicitly triggers a window `resize` event, we avoid duplicating our resize logic. The fullscreen handler only cares about changing the browser's presentation state; it trusts that the resize handler we built earlier will react to the new dimensions correctly. This is an example of orthogonal design.

### Commands needed
Open `lesson-04.html` in a modern browser.

### Run it
Press the 'F' key. The browser UI vanishes, and the 3D scene expands to fill the entire monitor.

### One sentence connecting to previous unit
With a perfectly resizing, sharp, fullscreen-capable canvas, the foundation is completely solid.

## Closing
### Connect the pieces
When the user grabs the corner of their browser and drags, the browser fires a `resize` event. Our `onResize` handler catches it, reads the new `window.innerWidth` and `window.innerHeight`, and updates the `WebGLRenderer` buffer size. Crucially, it also updates the `PerspectiveCamera`'s `aspect` ratio and calls `updateProjectionMatrix()`, preventing the scene from stretching. Concurrently, CSS ensures the DOM element itself fills the available space, and capping the `devicePixelRatio` guarantees sharp edges without tanking performance. Finally, pressing 'F' leverages the exact same resize pipeline by simply asking the browser to expand the viewport. We have built a robust, responsive 3D viewport.
