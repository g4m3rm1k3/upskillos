# Lesson 35: Debugging Three.js — Chrome DevTools, Stats.js, and Common Errors

What you will build:
We will add a real-time performance monitor using Stats.js and systematically diagnose a black screen, z-fighting, transparency sorting, and common errors. Three.js bugs fall into 3 categories: (1) black screen (wrong camera, wrong position, missing light), (2) visual artifacts (wrong normals, z-fighting, transparent sorting), (3) performance (too many draw calls, missing dispose, shader compilation). Each has a systematic diagnostic approach.

What you need to know first:
Nothing

Terms used in this lesson:
- **Z-fighting** — A flickering artifact that occurs when two surfaces sit at nearly the same depth and the depth buffer lacks the precision to reliably distinguish which one is closer.
- **Logarithmic depth buffer** — A WebGL configuration where the depth value is stored logarithmically rather than linearly, providing much greater precision for objects close to the camera, which is especially useful for huge scenes like space.
- **Painter's algorithm** — A rendering technique where objects are drawn from back to front, ensuring that closer transparent objects correctly blend over those further away.
- **Order-independent transparency (OIT)** — A rendering technique that correctly blends overlapping transparent surfaces regardless of the order in which they are rendered, usually requiring advanced post-processing.
- **Context Lost** — A browser-level WebGL event that occurs when the GPU driver crashes or too many WebGL contexts are created (often maxing out around 16 per browser).
- **CORS error** — Cross-Origin Resource Sharing restrictions imposed by the browser, preventing the loading of textures or models from local file systems (`file://`) or foreign domains without proper headers.

Objects and methods used:
- **Stats**
  - *What it is:* A compact performance monitoring utility panel.
  - *Implementation:* `class Stats { constructor(); showPanel(id); begin(); end(); dom: HTMLElement; }`
  - *Its use:* Used to measure and display real-time FPS, milliseconds per frame, and JavaScript heap memory.
  - *Type:* Class
  - *Responsibility:* Tracks frame times and updates a visual graph overlaid on the document.
  - *Depends on:* Being called inside the animation loop via `begin()` and `end()`.
  - *Connects to:* The DOM, appending its `dom` element to `document.body`.
  - *Shape:* A utility layer operating outside the Three.js core scene graph.
- **WebGLRenderer.getSize**
  - *What it is:* A method to retrieve the current pixel dimensions of the renderer's output canvas.
  - *Implementation:* `getSize(target: Vector2): Vector2`
  - *Its use:* Used during diagnostics to ensure the canvas is sized correctly in the DOM.
  - *Type:* Instance method
  - *Responsibility:* Returns the internal width and height of the WebGL drawing buffer.
  - *Depends on:* A target `Vector2` object to store the result.
  - *Connects to:* The renderer instance.
  - *Shape:* An internal diagnostic state query.
- **Object3D.traverse**
  - *What it is:* A deep-search iterator over the scene graph.
  - *Implementation:* `traverse(callback: (object: Object3D) => void): void`
  - *Its use:* Used to iterate through every child object in the scene to count lights or check visibility distances.
  - *Type:* Instance method
  - *Responsibility:* Executes a callback function on the object and all its descendants recursively.
  - *Depends on:* A callback function.
  - *Connects to:* Every object in the scene graph subtree.
  - *Shape:* A tree-walking utility.
- **Vector3.distanceTo**
  - *What it is:* A math utility method calculating the spatial distance between two points.
  - *Implementation:* `distanceTo(v: Vector3): number`
  - *Its use:* Used to verify if a mesh is within the camera's near and far planes.
  - *Type:* Instance method
  - *Responsibility:* Computes the Euclidean distance.
  - *Depends on:* Another `Vector3` point.
  - *Connects to:* Spatial reasoning logic.
  - *Shape:* Mathematical utility.
- **MeshStandardMaterial.polygonOffset**
  - *What it is:* A material property enabling depth-buffer offsetting.
  - *Implementation:* `polygonOffset: boolean`
  - *Its use:* Enabled to fix Z-fighting by subtly pushing the rendered surface back in the depth buffer without moving its geometric position.
  - *Type:* Boolean property
  - *Responsibility:* Instructs the GPU to apply a depth offset during rasterization.
  - *Depends on:* Being set to true, along with `polygonOffsetFactor` and `polygonOffsetUnits`.
  - *Connects to:* WebGL depth testing pipeline.
  - *Shape:* A material state flag.
- **Object3D.renderOrder**
  - *What it is:* An override for the automatic depth-sorting algorithm.
  - *Implementation:* `renderOrder: number`
  - *Its use:* Set to force overlapping transparent meshes to render in a specific sequence (e.g., forcing a glass pane to render after an internal object).
  - *Type:* Numeric property
  - *Responsibility:* Dictates the explicit render sequence for opaque and transparent objects.
  - *Depends on:* The renderer sorting the render list before drawing.
  - *Connects to:* WebGLRenderer's internal render lists.
  - *Shape:* An object-level render hint.

## Concept Unit: Stats.js — real-time FPS, MS, and MB panel

### The Problem
When a scene gets complex, we need a way to objectively measure performance. How do we know if we are hitting a smooth 60 frames per second, or if a recent change tanked the framerate?

### Introduce the concept in isolation
We can use a library called **Stats.js** to track performance visually.
```html
<script src="https://cdn.jsdelivr.net/npm/stats.js@0.17.0/build/stats.min.js"></script>
<script>
    const testStats = new Stats();
    testStats.showPanel(0);
    document.body.appendChild(testStats.dom);
    
    function loop() {
        testStats.begin();
        // simulate work
        for(let i=0; i<1000000; i++) {}
        testStats.end();
        requestAnimationFrame(loop);
    }
    loop();
</script>
```
Output predicted: A small green graph appears in the top-left corner, showing FPS values fluctuating as the loop runs.

### Discard the throwaway
This standalone loop is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are instrumenting our application.
- **Files affected:** `lesson-35.html` (created)
- **Change type:** add
- **Location:** Inside the HTML head and body.
- **Dependencies:** Stats.js loaded via CDN.

### The New Code
```html
<script src="https://cdn.jsdelivr.net/npm/stats.js@0.17.0/build/stats.min.js"></script>
<script type="module">
    import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';

    const stats = new Stats();
    stats.showPanel(0);  // 0=FPS, 1=MS, 2=MB
    document.body.appendChild(stats.dom);

    function animate() {
        stats.begin();
        requestAnimationFrame(animate);
        // renderer.render(scene, camera);
        stats.end();
    }
    animate();
    console.log('Stats panels: 0=FPS, 1=MS, 2=MB');
</script>
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <head>
4:     <title>Lesson 35</title>
5:     <script src="https://cdn.jsdelivr.net/npm/stats.js@0.17.0/build/stats.min.js"></script> <!-- ← new -->
6: </head>
7: <body>
8:     <script type="module">
9:         import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
10:        
11:        const stats = new Stats(); // ← new
12:        stats.showPanel(0);        // ← new
13:        document.body.appendChild(stats.dom); // ← new
14:
15:        function animate() {
16:            stats.begin(); // ← new
17:            requestAnimationFrame(animate);
18:            // renderer.render(scene, camera);
19:            stats.end();   // ← new
20:        }
21:        animate();
22:        console.log('Stats panels: 0=FPS, 1=MS, 2=MB'); // ← new
23:    </script>
24: </body>
25: </html>
```
The file now initializes a `Stats` object and brackets the animation loop with `begin()` and `end()` to record frame durations.

### Mechanical walkthrough
- **`const stats = new Stats();`** creates the instrumentation object.
- **`stats.showPanel(0);`** sets the initial visible panel to index 0, which corresponds to Frames Per Second (FPS). Panel 1 is milliseconds per frame, and panel 2 is megabytes of JavaScript heap memory.
- **`document.body.appendChild(stats.dom);`** injects the UI overlay into the document so we can see it.
- **`stats.begin();`** records a high-resolution timestamp at the start of the frame.
- **`stats.end();`** computes the difference from the start timestamp, updates the internal metrics, and redraws the graph canvas.
- **`console.log(...)`** outputs a simple reminder of what the panels represent.

### CS lens
Performance monitoring is a feedback loop. Measuring rendering speed is crucial in real-time computer graphics because missing the 16.6ms window for a 60 FPS target immediately degrades the user experience. 

### SE lens
Injecting metrics via `Stats.js` is an example of orthogonal instrumentation. The rendering logic itself doesn't need to know it's being timed; the timing code merely wraps the call.

### Commands needed
Open lesson-35.html in a modern browser with DevTools open (F12).

### Run it
The code runs in the browser. You see a small overlay in the top left showing a flat 60 FPS green line, because there is no rendering load yet.

### One sentence connecting to previous unit
Now that we can measure performance, let's learn how to diagnose the most common visual failure: a completely black screen.

## Concept Unit: The black screen checklist

### The Problem
You've written your Three.js boilerplate, added objects, and called render—but the screen is just solid black. What do you check?

### Introduce the concept in isolation
We write a quick diagnostic function to probe the scene state.
```javascript
const dummyCamera = { position: { distanceTo: () => 5 }, near: 0.1, far: 100 };
const dummyMesh = { isMesh: true, visible: true, name: 'cube', position: {} };
const dummyScene = { background: null, traverse: cb => cb(dummyMesh) };
function check(scene, camera) {
    scene.traverse(obj => {
        if (obj.isMesh) console.log(`Mesh visible: ${obj.visible}`);
    });
}
check(dummyScene, dummyCamera);
```
Predicted output: "Mesh visible: true".

### Discard the throwaway
This mock object test is discarded and will not be used in the actual project.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because it's a diagnostic tool.
- **Files affected:** `lesson-35.html` (modified)
- **Change type:** add
- **Location:** After the Stats initialization, before the animation loop.
- **Dependencies:** A Three.js scene, camera, and renderer.

### The New Code
```javascript
// Systematic diagnostic:
function diagnoseBlackScreen(scene, camera, renderer) {
    console.log('Canvas in DOM:', document.body.contains(renderer.domElement));
    console.log('Renderer size:', renderer.getSize(new THREE.Vector2()));
    console.log('Camera position:', camera.position);
    console.log('Camera near/far:', camera.near, camera.far);
    scene.traverse(obj => {
        if (obj.isMesh) {
            const dist = camera.position.distanceTo(obj.position);
            console.log(`Mesh '${obj.name||obj.uuid.slice(0,6)}': dist=${dist.toFixed(2)}, visible=${obj.visible}`);
        }
    });
    let lights = 0;
    scene.traverse(obj => { if (obj.isLight) lights++; });
    console.log('Lights in scene:', lights, lights===0?'(WARNING: no lights!)':'');
    console.log('Scene background:', scene.background);
}
```

### The Updated Project
```html
1: <script type="module">
2:     import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
3:     // ... stats setup ...
4:     const renderer = new THREE.WebGLRenderer();
5:     const scene = new THREE.Scene();
6:     const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
7:
8:     function diagnoseBlackScreen(scene, camera, renderer) { // ← new
9:         console.log('Canvas in DOM:', document.body.contains(renderer.domElement)); // ← new
10:        console.log('Renderer size:', renderer.getSize(new THREE.Vector2())); // ← new
11:        console.log('Camera position:', camera.position); // ← new
12:        console.log('Camera near/far:', camera.near, camera.far); // ← new
13:        scene.traverse(obj => { // ← new
14:            if (obj.isMesh) { // ← new
15:                const dist = camera.position.distanceTo(obj.position); // ← new
16:                console.log(`Mesh '${obj.name||obj.uuid.slice(0,6)}': dist=${dist.toFixed(2)}, visible=${obj.visible}`); // ← new
17:            } // ← new
18:        }); // ← new
19:        let lights = 0; // ← new
20:        scene.traverse(obj => { if (obj.isLight) lights++; }); // ← new
21:        console.log('Lights in scene:', lights, lights===0?'(WARNING: no lights!)':''); // ← new
22:        console.log('Scene background:', scene.background); // ← new
23:    } // ← new
24:    
25:    diagnoseBlackScreen(scene, camera, renderer); // ← new
26:    // ... animate ...
27: </script>
```
The application now runs a comprehensive health-check on the scene to find out why it might be rendering empty.

### Mechanical walkthrough
- **`function diagnoseBlackScreen(scene, camera, renderer)`** defines a helper function taking the three core Three.js components.
- **`renderer.getSize(new THREE.Vector2())`** asks the renderer for its drawing buffer size, ensuring it's not 0x0.
- **`scene.traverse(obj => ...)`** walks every node in the graph.
- **`if (obj.isMesh)`** checks if the node actually has geometry to draw.
- **`camera.position.distanceTo(obj.position)`** calculates the linear distance between the camera and the mesh to verify it lies between `near` and `far`.
- **`obj.isLight`** checks for light sources. A scene with `MeshStandardMaterial` but 0 lights will render completely black.

### CS lens
Rendering is a pipeline of matrix multiplications and rasterization steps. A black screen means a failure at one specific stage of the pipeline: the frustum culling step (wrong coordinates), the lighting step (missing light data), or the DOM integration step (missing canvas).

### SE lens
Writing a deterministic diagnostic script is superior to random guessing. Instead of tweaking values hoping the screen turns on, a script proves exactly which assumption is wrong.

### Commands needed
Open lesson-35.html in a modern browser with DevTools open (F12).

### Run it
The console will print out the checklist. If lights are 0, it warns "(WARNING: no lights!)".

### One sentence connecting to previous unit
With the screen no longer inexplicably black, we next address when surfaces appear to glitch and tear through each other.

## Concept Unit: Z-fighting and depth buffer issues

### The Problem
When two planes are placed at exactly the same location, the GPU doesn't know which one should be drawn in front, resulting in a rapid flickering called Z-fighting.

### Introduce the concept in isolation
We can use Polygon Offset to push a material artificially backwards in the depth buffer without actually moving its 3D position.
```javascript
import * as THREE from 'three';
const mat = new THREE.MeshStandardMaterial({
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
});
console.log('Polygon offset enabled:', mat.polygonOffset);
```
Predicted output: "Polygon offset enabled: true"

### Discard the throwaway
This material test is discarded and will not appear in the project.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because it demonstrates a visual artifact fix.
- **Files affected:** `lesson-35.html` (modified)
- **Change type:** add
- **Location:** Inside the scene setup block.
- **Dependencies:** The Three.js module.

### The New Code
```javascript
// Fix 1: increase near plane (more precision near camera)
camera.near = 0.1;

// Fix 2: polygon offset (push one surface slightly back in depth)
const mat1 = new THREE.MeshStandardMaterial({color: 0xff0000});
const mat2 = new THREE.MeshStandardMaterial({
    color: 0x0000ff,
    polygonOffset:      true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits:  1,
});
const plane1 = new THREE.Mesh(new THREE.PlaneGeometry(2,2), mat1);
const plane2 = new THREE.Mesh(new THREE.PlaneGeometry(2,2), mat2);

// Fix 3: positional offset
plane2.position.z = 0.001; 

scene.add(plane1, plane2);
```

### The Updated Project
```html
1: <script type="module">
2:     // ...
3:     camera.near = 0.1; // ← new
4:     const mat1 = new THREE.MeshStandardMaterial({color: 0xff0000}); // ← new
5:     const mat2 = new THREE.MeshStandardMaterial({ // ← new
6:         color: 0x0000ff, // ← new
7:         polygonOffset: true, // ← new
8:         polygonOffsetFactor: 1, // ← new
9:         polygonOffsetUnits: 1, // ← new
10:    }); // ← new
11:    const plane1 = new THREE.Mesh(new THREE.PlaneGeometry(2,2), mat1); // ← new
12:    const plane2 = new THREE.Mesh(new THREE.PlaneGeometry(2,2), mat2); // ← new
13:    plane2.position.z = 0.001; // ← new
14:    scene.add(plane1, plane2); // ← new
15:    // ...
16: </script>
```
The scene now holds two planes stacked on top of each other, explicitly configured to resolve the depth conflict using offset properties.

### Mechanical walkthrough
- **`camera.near = 0.1;`** configures the projection matrix. Setting it higher prevents wasting depth precision on objects impossibly close to the lens.
- **`polygonOffset: true`** enables the GPU state flag for depth offsetting.
- **`polygonOffsetFactor: 1`** applies an offset multiplier based on the polygon's slope relative to the screen.
- **`polygonOffsetUnits: 1`** adds a constant minimum offset step to the depth value.
- **`plane2.position.z = 0.001;`** provides a physical spatial gap as an alternative fix.

### CS lens
The depth buffer typically uses 24-bit floats. Because projection matrices map depth logarithmically, resolution is high near the camera but incredibly sparse far away. Z-fighting is an arithmetic precision failure.

### SE lens
It is better to structurally separate objects (physical gap) than to rely on driver-dependent tweaks like `polygonOffset`, but when generating dynamic co-planar decals, `polygonOffset` is the standard tool.

### Commands needed
Open lesson-35.html in a modern browser with DevTools open (F12).

### Run it
The scene renders a solid color plane without flickering, as the depth conflict is cleanly resolved.

### One sentence connecting to previous unit
While Z-fighting applies to solid surfaces fighting for the same pixel, transparent surfaces introduce a completely different sorting challenge.

## Concept Unit: Transparent object sorting artifacts

### The Problem
When drawing transparent objects, the background behind them must be drawn first. If a transparent object is drawn, it writes to the depth buffer, causing anything drawn behind it later to be discarded by the GPU, leading to visual cutouts.

### Introduce the concept in isolation
We can instruct an object to skip writing to the depth buffer.
```javascript
import * as THREE from 'three';
const mat = new THREE.MeshStandardMaterial({transparent: true, depthWrite: false});
console.log('Depth write disabled:', !mat.depthWrite);
```
Predicted output: "Depth write disabled: true"

### Discard the throwaway
This standalone check is discarded and will not appear again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because it isolates transparency rendering rules.
- **Files affected:** `lesson-35.html` (modified)
- **Change type:** add
- **Location:** Below the plane definitions.
- **Dependencies:** The scene instance.

### The New Code
```javascript
const glass1 = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({color:0x4488ff, transparent:true, opacity:0.3, depthWrite:false})
);
const glass2 = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({color:0xff4400, transparent:true, opacity:0.3, depthWrite:false})
);
glass2.position.z = 0.5;

glass1.renderOrder = 0;
glass2.renderOrder = 1;

scene.add(glass1, glass2);
```

### The Updated Project
```html
1: <script type="module">
2:     // ... previous code
3:     const glass1 = new THREE.Mesh( // ← new
4:         new THREE.BoxGeometry(1,1,1), // ← new
5:         new THREE.MeshStandardMaterial({color:0x4488ff, transparent:true, opacity:0.3, depthWrite:false}) // ← new
6:     ); // ← new
7:     const glass2 = new THREE.Mesh( // ← new
8:         new THREE.BoxGeometry(1,1,1), // ← new
9:         new THREE.MeshStandardMaterial({color:0xff4400, transparent:true, opacity:0.3, depthWrite:false}) // ← new
10:    ); // ← new
11:    glass2.position.z = 0.5; // ← new
12:    glass1.renderOrder = 0; // ← new
13:    glass2.renderOrder = 1; // ← new
14:    scene.add(glass1, glass2); // ← new
15:    // ...
16: </script>
```
The scene now correctly handles overlapping translucent geometry by disabling depth writes and explicitly setting the render order.

### Mechanical walkthrough
- **`transparent: true`** tells Three.js to use blending modes instead of opaque replacement for pixels.
- **`depthWrite: false`** tells the GPU to read the depth buffer to see if it is hidden by a solid object, but not to record its own depth, preventing it from incorrectly occluding geometry drawn after it.
- **`glass1.renderOrder = 0;`** and **`glass2.renderOrder = 1;`** bypass Three.js's distance-based auto-sorting and force the renderer to draw `glass1` first, then `glass2`.

### CS lens
The Painter's Algorithm sorts objects from back to front, but this sorting is per-mesh. If two transparent meshes intersect, no sorting order can perfectly resolve them. True solutions require Order-Independent Transparency (OIT).

### SE lens
Using `renderOrder` is an imperative override of a declarative scene graph. It solves specific edge cases (like UI over a scene) but scales poorly if heavily relied upon for general scene architecture.

### Commands needed
Open lesson-35.html in a modern browser with DevTools open (F12).

### Run it
The two transparent boxes blend cleanly without occlusion cut-out boxes appearing around their edges.

### One sentence connecting to previous unit
Having handled rendering artifacts, we finally address terminal runtime errors that crash the scene entirely.

## Concept Unit: Common Three.js error messages and fixes

### The Problem
You encounter a terminal failure like `THREE.WebGLRenderer: Context Lost` or `Cannot read properties of undefined (reading 'position')` and need to know the root cause without guessing.

### Introduce the concept in isolation
We can mock an error catalog loop to map symptoms to causes.
```javascript
const e = { error: 'Context Lost', fix: 'Dispose contexts' };
console.log(`[${e.error}] Fix: ${e.fix}`);
```
Predicted output: "[Context Lost] Fix: Dispose contexts"

### Discard the throwaway
This loop is discarded.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because it is a documentation table encoded in code.
- **Files affected:** `lesson-35.html` (modified)
- **Change type:** add
- **Location:** At the end of the script before the closing tag.
- **Dependencies:** None.

### The New Code
```javascript
const errors = [
    {
        error: 'THREE.WebGLRenderer: Context Lost',
        cause: 'Too many WebGL contexts (max ~16 per browser), or GPU driver crash',
        fix: 'Call renderer.dispose() when destroying a canvas. Reuse one renderer.',
    },
    {
        error: 'THREE.TextureLoader: Couldn\'t load texture at URL',
        cause: 'CORS error (loading from file:// or cross-origin without headers)',
        fix: 'Serve files via http.server. Ensure server sets CORS headers.',
    },
    {
        error: 'THREE.WebGLProgram: Shader Error',
        cause: 'GLSL syntax error in custom ShaderMaterial',
        fix: 'Check browser console for line number. GLSL is strictly typed: 1.0 not 1',
    },
    {
        error: 'Object added is not an instance of THREE.Object3D',
        cause: 'scene.add(undefined) or scene.add(gltf) instead of scene.add(gltf.scene)',
        fix: 'Check loader callback: scene.add(gltf.scene) not scene.add(gltf)',
    },
    {
        error: 'Cannot read properties of undefined (reading \'position\')',
        cause: 'Accessing mesh before loader async callback resolves',
        fix: 'Use await loader.loadAsync() or move code inside the onLoad callback',
    }
];
errors.forEach(e => console.log(`[${e.error.slice(0,40)}] Fix: ${e.fix}`));
console.log('Error catalog:', errors.length, 'common issues');
```

### The Updated Project
```html
1: <script type="module">
2:     // ... previous code
3:     const errors = [ // ← new
4:         { // ← new
5:             error: 'THREE.WebGLRenderer: Context Lost', // ← new
6:             cause: 'Too many WebGL contexts (max ~16 per browser), or GPU driver crash', // ← new
7:             fix: 'Call renderer.dispose() when destroying a canvas. Reuse one renderer.', // ← new
8:         }, // ← new
9:         { // ← new
10:            error: 'THREE.TextureLoader: Couldn\'t load texture at URL', // ← new
11:            cause: 'CORS error (loading from file:// or cross-origin without headers)', // ← new
12:            fix: 'Serve files via http.server. Ensure server sets CORS headers.', // ← new
13:        }, // ← new
14:        { // ← new
15:            error: 'THREE.WebGLProgram: Shader Error', // ← new
16:            cause: 'GLSL syntax error in custom ShaderMaterial', // ← new
17:            fix: 'Check browser console for line number. GLSL is strictly typed: 1.0 not 1', // ← new
18:        }, // ← new
19:        { // ← new
20:            error: 'Object added is not an instance of THREE.Object3D', // ← new
21:            cause: 'scene.add(undefined) or scene.add(gltf) instead of scene.add(gltf.scene)', // ← new
22:            fix: 'Check loader callback: scene.add(gltf.scene) not scene.add(gltf)', // ← new
23:        }, // ← new
24:        { // ← new
25:            error: 'Cannot read properties of undefined (reading \'position\')', // ← new
26:            cause: 'Accessing mesh before loader async callback resolves', // ← new
27:            fix: 'Use await loader.loadAsync() or move code inside the onLoad callback', // ← new
28:        } // ← new
29:    ]; // ← new
30:    errors.forEach(e => console.log(`[${e.error.slice(0,40)}] Fix: ${e.fix}`)); // ← new
31:    console.log('Error catalog:', errors.length, 'common issues'); // ← new
32: </script>
```
The file now outputs a diagnostic checklist of the most common WebGL and Three.js runtime crashes directly into the console.

### Mechanical walkthrough
- **`const errors = [...]`** defines an array of object literals, each mapping an error string to its cause and fix.
- **`e.error`** holds the exact exception text thrown by the browser or Three.js.
- **`e.cause`** explains the conceptual failure (like exhausting context handles or CORS).
- **`e.fix`** dictates the API call or structural change required to repair it.
- **`errors.forEach(...)`** iterates over the array.
- **`console.log(...)`** prints the truncated error message alongside the fix.

### CS lens
Many Three.js errors originate not in the library, but at the browser's security or hardware integration boundary. A `Context Lost` error is the OS or browser forcibly reclaiming GPU resources.

### SE lens
Recognizing errors by their symptom signature is a core debugging skill. Rather than assuming the geometry is wrong, recognizing a CORS error immediately redirects the developer to the network configuration layer.

### Commands needed
Open lesson-35.html in a modern browser with DevTools open (F12).

### Run it
The console logs the five common errors and their fixes.

### One sentence connecting to previous unit
With our scene debugged, optimized, and robust against common crashes, our development toolkit is complete.

## Closing

### Connect the pieces
Debugging Three.js scenes requires shifting from random tweaking to systematic diagnosis. By utilizing `Stats.js` to observe frame timing, using programmatic graph traversal to verify mesh and light states for black screens, strategically manipulating the depth buffer to resolve Z-fighting, and understanding the core WebGL limitations behind transparency sorting and CORS errors, we transform rendering failures from mysteries into solvable mechanical issues.
