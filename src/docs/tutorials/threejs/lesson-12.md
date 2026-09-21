# Lesson 12: Multiple Cameras and Viewports — setViewport, setScissor, split-screen

What you will build
In this lesson, you will build an application that renders a single 3D scene from multiple viewpoints simultaneously. You will implement a side-by-side split screen, a four-view CAD-style layout, and a picture-in-picture minimap. The transferable problem this solves is mapping multiple independent virtual cameras onto different regions of a single physical drawing surface, while preventing their draw operations from overwriting each other.

What you need to know first
- Nothing (this is a standalone module introduction to viewport management).

Terms used in this lesson
- **Viewport** — The rectangular area on the canvas where the normalized device coordinates (NDC) are mapped. Setting a viewport tells WebGL where the rendered image should appear.
- **Scissor Test** — A graphics pipeline stage that discards any pixels outside a defined rectangle. It is necessary when clearing or drawing to a specific region, so that operations do not affect the rest of the canvas.
- **Normalized Device Coordinates (NDC)** — A theoretical coordinate system where X, Y, and Z range from -1 to 1. The viewport dictates how this cube maps to actual screen pixels.
- **Aspect Ratio** — The ratio of width to height. The camera's aspect ratio must match the viewport's aspect ratio to prevent the image from looking squashed or stretched.
- **`autoClear`** — A boolean configuration on the renderer. When `true`, the renderer automatically wipes the entire canvas before rendering. When `false`, it waits for explicit clear commands, allowing multiple cameras to paint onto the canvas sequentially without erasing each other.
- **Orthographic Projection** — A rendering mode where parallel lines remain parallel, lacking depth perspective. Ideal for architectural or top-down mini-map views.
- **Perspective Projection** — A rendering mode simulating human vision where objects appear smaller as they get further away.

Objects and methods used

- **`THREE.WebGLRenderer`**
  - *What it is:* The main rendering engine that takes a scene and a camera and draws it using WebGL.
  - *Implementation:* `new THREE.WebGLRenderer({ canvas: document.getElementById('c') })`
  - *Its use:* We configure it and tell it to render multiple cameras per frame.
  - *Type:* Class
  - *Responsibility:* Manages the WebGL context, compiling shaders, and issuing draw calls to the GPU.
  - *Depends on:* An HTML `<canvas>` element and an active WebGL context.
  - *Connects to:* Calls into WebGL APIs based on the provided Scene and Camera.
  - *Shape:* A core service boundary between Three.js scene graphs and the browser's hardware-accelerated drawing.

- **`WebGLRenderer.setViewport`**
  - *What it is:* A method to specify the rendering region on the canvas.
  - *Implementation:* `renderer.setViewport(x, y, width, height)`
  - *Its use:* We call this before rendering a specific camera to place its output in a specific quadrant or region.
  - *Type:* Instance method
  - *Responsibility:* Maps the camera's -1 to 1 coordinate space to the designated pixel boundaries on the canvas.
  - *Depends on:* `x, y` (bottom-left corner) and `width, height` in pixels.
  - *Connects to:* WebGL's `gl.viewport` function.
  - *Shape:* Configuration method modifying the renderer's internal state.

- **`WebGLRenderer.setScissor`**
  - *What it is:* A method defining the boundaries of the scissor test.
  - *Implementation:* `renderer.setScissor(x, y, width, height)`
  - *Its use:* We use it to ensure `renderer.clear()` only clears the portion of the screen we are about to draw over.
  - *Type:* Instance method
  - *Responsibility:* Defines a clipping rectangle for all subsequent drawing and clearing operations.
  - *Depends on:* Pixel coordinates defining the bounding box.
  - *Connects to:* WebGL's `gl.scissor`.
  - *Shape:* Configuration method modifying state.

- **`WebGLRenderer.setScissorTest`**
  - *What it is:* A toggle to enable or disable the scissor operation.
  - *Implementation:* `renderer.setScissorTest(true)`
  - *Its use:* We turn it on before rendering constrained views so the background outside the scissor region remains untouched.
  - *Type:* Instance method
  - *Responsibility:* Activates or deactivates pixel discarding outside the scissor box.
  - *Depends on:* A boolean value.
  - *Connects to:* WebGL's `gl.enable(gl.SCISSOR_TEST)`.
  - *Shape:* State toggle.

- **`WebGLRenderer.clear`**
  - *What it is:* A method to wipe the color, depth, and stencil buffers.
  - *Implementation:* `renderer.clear()`
  - *Its use:* Used to explicitly wipe the canvas (or the scissored area) because we disabled `autoClear`.
  - *Type:* Instance method
  - *Responsibility:* Resets the pixels to the clear color and resets depth so new objects draw correctly.
  - *Depends on:* Current scissor settings and clear colors.
  - *Connects to:* WebGL's `gl.clear`.
  - *Shape:* Execution command.

- **`WebGLRenderer.clearDepth`**
  - *What it is:* A method that only clears the depth buffer, not the color buffer.
  - *Implementation:* `renderer.clearDepth()`
  - *Its use:* Used for Picture-in-Picture mode so the minimap draws on top of the main scene without erasing the main scene's pixels.
  - *Type:* Instance method
  - *Responsibility:* Resets the depth buffer so subsequent draws render unconditionally on top of existing pixels.
  - *Depends on:* Nothing.
  - *Connects to:* WebGL `gl.clear(gl.DEPTH_BUFFER_BIT)`.
  - *Shape:* Execution command.

- **`PerspectiveCamera`**
  - *What it is:* A camera that uses perspective projection.
  - *Implementation:* `new THREE.PerspectiveCamera(fov, aspect, near, far)`
  - *Its use:* Renders the scene like a human eye or standard camera.
  - *Type:* Class (extends Camera)
  - *Responsibility:* Generates a projection matrix simulating perspective depth.
  - *Depends on:* Field of view, aspect ratio, near/far clipping planes.
  - *Connects to:* Passed to `renderer.render()`.
  - *Shape:* Data container / Math utility.

- **`OrthographicCamera`**
  - *What it is:* A camera that uses parallel projection.
  - *Implementation:* `new THREE.OrthographicCamera(left, right, top, bottom, near, far)`
  - *Its use:* Provides flat, scale-accurate views like blueprints or minimaps.
  - *Type:* Class (extends Camera)
  - *Responsibility:* Generates a projection matrix without perspective distortion.
  - *Depends on:* Box frustum boundaries (left, right, top, bottom).
  - *Connects to:* Passed to `renderer.render()`.
  - *Shape:* Data container / Math utility.

Everything else in the file, not this lesson's subject but still explained:
- **`THREE.Scene`**
  - *What it is:* The container for all objects, lights, and cameras.
  - *Implementation:* `new THREE.Scene()`
  - *Its use:* Holds our meshes.
  - *Type:* Class
  - *Responsibility:* Maintains a hierarchical tree of objects to be rendered.
  - *Depends on:* Nothing to initialize, child nodes added via `add()`.
  - *Connects to:* Iterated over by the renderer during `render()`.
  - *Shape:* Data structure.
- **`THREE.Mesh`**
  - *What it is:* A visual 3D object.
  - *Implementation:* `new THREE.Mesh(geometry, material)`
  - *Its use:* Gives us something to look at.
  - *Type:* Class
  - *Responsibility:* Pairs geometric vertex data with a shading material.
  - *Depends on:* A BufferGeometry and a Material.
  - *Connects to:* Added to the Scene.
  - *Shape:* Scene node.
- **`Camera.updateProjectionMatrix()`**
  - *What it is:* Recalculates the camera's internal matrices.
  - *Implementation:* `camera.updateProjectionMatrix()`
  - *Its use:* Must be called whenever camera parameters (like aspect or FOV) change, such as on window resize.
  - *Type:* Instance method
  - *Responsibility:* Updates the cached projection matrix used by WebGL.
  - *Depends on:* Current camera properties.
  - *Connects to:* Internal matrix math logic.
  - *Shape:* Lifecycle method.

---

## Concept Unit: setViewport and setScissor explained

### The Problem
If we have a single canvas taking up the whole window, but we want to render two distinct camera views simultaneously, how do we prevent them from rendering directly on top of each other? Furthermore, if we disable automatic clearing so one camera doesn't wipe out the other, how do we prevent the renderer from leaving a chaotic trail of old frames behind?

> **What would you try here first?** Given that `renderer.render()` usually covers the whole canvas, is there a way to tell the renderer to only look at a specific quadrant? What happens if you skip clearing entirely? Try to guess what the screen would look like if a rotating cube was drawn every frame without wiping the previous frame.

### Introduce the concept in isolation
We will configure a renderer to disable `autoClear`, manually clear, and then restrict its output to a small box.

```javascript
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(800, 600);
document.body.appendChild(renderer.domElement);

// IMPORTANT: we clear manually for each viewport
renderer.autoClear = false; 

// We tell it to only draw in a 400x300 box starting at (0, 0)
renderer.setViewport(0, 0, 400, 300);
renderer.setScissor(0, 0, 400, 300);
renderer.setScissorTest(true);

console.log('autoClear:', renderer.autoClear);
// Output: autoClear: false
```
*Proof without execution: `autoClear` is definitively set to `false`, verified by reading back the property.*

By disabling `autoClear`, `renderer.render()` does not call `gl.clear()` automatically. Without this, each camera render would wipe the whole canvas, erasing the previous camera's view. By turning on the scissor test, any explicit clear or draw operations are restricted to that exact 400x300 pixel boundary.

### Discard the throwaway
This throwaway test logic is discarded. We will now apply the real technique to our project canvas.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition to demonstrate basic viewports.
- **Files affected:** `lesson-12.html` (created).
- **Change type:** add.
- **Location:** Inside the `<script type="module">` tag.

### The New Code
```html
<!DOCTYPE html>
<html>
<head>
    <style>body { margin: 0; } canvas { display: block; }</style>
</head>
<body>
    <canvas id="c"></canvas>
    <script type="importmap">
      {
        "imports": {
          "three": "https://unpkg.com/three@0.160.0/build/three.module.js"
        }
      }
    </script>
    <script type="module">
        import * as THREE from 'three';
        const canvas = document.getElementById('c');
        const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.autoClear = false; 
    </script>
</body>
</html>
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <head>
4:     <style>body { margin: 0; } canvas { display: block; }</style>
5: </head>
6: <body>
7:     <canvas id="c"></canvas>
8:     <script type="importmap">
9:       {
10:         "imports": {
11:           "three": "https://unpkg.com/three@0.160.0/build/three.module.js"
12:         }
13:       }
14:     </script>
15:     <script type="module">
16:         import * as THREE from 'three';
17:         const canvas = document.getElementById('c');
18:         const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
19:         renderer.setSize(window.innerWidth, window.innerHeight);
20:         renderer.autoClear = false; // ← new
21:     </script>
22: </body>
23: </html>
```
We have instantiated the renderer, attached it to our existing canvas, and explicitly turned off `autoClear`. The renderer will now wait for our exact commands on where and when to draw or clear.

### Mechanical walkthrough
- `const canvas = document.getElementById('c');` fetches the canvas element from the DOM to use as the drawing surface.
- `const renderer = new THREE.WebGLRenderer({canvas, antialias:true});` creates a new WebGL rendering context tied to that canvas, enabling smooth edges.
- `renderer.setSize(window.innerWidth, window.innerHeight);` makes the internal drawing buffer match the full screen resolution.
- `renderer.autoClear = false;` disables the automatic wipe before every render call, placing the burden of clearing buffers onto our own render loop.

### CS lens
This mirrors the concept of **Windowing Systems** in operating systems or **Multiplexing** in networks. A single shared resource (the WebGL context and framebuffer) is partitioned into logical sub-resources (viewports/scissors), allowing multiple independent processes (cameras) to operate without stomping on each other's memory.
Also recognized in: terminal multiplexers (tmux), picture-in-picture video decoding, window managers.

### SE lens
By disabling `autoClear`, we trade framework magic for explicit control. The tradeoff is that we must now manually orchestrate clearing and scissor boundaries. If we forget to clear, the screen will smear. If we forget to set the scissor, our clears will erase other cameras. We accept this state-management burden because it is the only way to achieve multi-camera composition on a single canvas efficiently without allocating multiple separate, expensive WebGL contexts.

### Commands needed
Open `lesson-12.html` in a modern browser.

### Run it
*No run needed. The output is a blank, black canvas because nothing has been rendered yet.*

### One sentence connecting to previous unit
Now that the renderer will wait for our explicit clearing and region commands, we can create our first split-screen layout.

---

## Concept Unit: Side-by-side split screen (two PerspectiveCameras)

### The Problem
We have a scene and two cameras. How do we tell the renderer to draw Camera 1 on the left half of the screen, and Camera 2 on the right half?

> **What would you try here first?** Given the viewport and scissor parameters `x, y, width, height`, what would the exact math look like to split a 1920x1080 screen directly down the middle vertically?

### Introduce the concept in isolation
We will define a basic loop that splits drawing.

```javascript
const w = 1920;
const h = 1080;
const hw = w / 2;

// Left
console.log(`Left viewport: x: 0, y: 0, width: ${hw}, height: ${h}`);
// Right
console.log(`Right viewport: x: ${hw}, y: 0, width: ${hw}, height: ${h}`);
```
*Output: confidently predictable as simple arithmetic.*
```
Left viewport: x: 0, y: 0, width: 960, height: 1080
Right viewport: x: 960, y: 0, width: 960, height: 1080
```
By halving the width and offsetting the X-coordinate of the right viewport by that half-width, we perfectly tile the canvas horizontally.

### Discard the throwaway
This simple math block is discarded, but we will use the exact logic in our render loop.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-12.html`
- **Change type:** add.
- **Location:** Below the renderer setup.

### The New Code
```javascript
        const scene = new THREE.Scene();
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        scene.add(new THREE.DirectionalLight(0xffffff, 1));
        const cube = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:0x44aaff}));
        scene.add(cube);

        const aspect = (window.innerWidth / 2) / window.innerHeight;
        const cam1 = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
        cam1.position.set(0, 0, 5); 
        cam1.lookAt(0,0,0);
        
        const cam2 = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
        cam2.position.set(5, 2, 0); 
        cam2.lookAt(0,0,0);

        function render() {
            const w = window.innerWidth, h = window.innerHeight;
            const hw = w / 2;
            
            renderer.setScissorTest(false);
            renderer.clear(); 
            
            // Left viewport (camera 1)
            renderer.setViewport(0, 0, hw, h);
            renderer.setScissor(0, 0, hw, h);
            renderer.setScissorTest(true);
            renderer.render(scene, cam1);
            
            // Right viewport (camera 2)
            renderer.setViewport(hw, 0, hw, h);
            renderer.setScissor(hw, 0, hw, h);
            renderer.render(scene, cam2);
        }

        function animate() { 
            requestAnimationFrame(animate); 
            cube.rotation.y += 0.01; 
            render(); 
        }
        animate();
```

### The Updated Project
```html
15:     <script type="module">
16:         import * as THREE from 'three';
17:         const canvas = document.getElementById('c');
18:         const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
19:         renderer.setSize(window.innerWidth, window.innerHeight);
20:         renderer.autoClear = false; 
21:
22:         // ← new below
23:         const scene = new THREE.Scene();
24:         scene.add(new THREE.AmbientLight(0xffffff, 0.5));
25:         scene.add(new THREE.DirectionalLight(0xffffff, 1));
26:         const cube = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:0x44aaff}));
27:         scene.add(cube);
28:
29:         const aspect = (window.innerWidth / 2) / window.innerHeight;
30:         const cam1 = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
31:         cam1.position.set(0, 0, 5); 
32:         cam1.lookAt(0,0,0);
33:         
34:         const cam2 = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
35:         cam2.position.set(5, 2, 0); 
36:         cam2.lookAt(0,0,0);
37:
38:         function render() {
39:             const w = window.innerWidth, h = window.innerHeight;
40:             const hw = w / 2;
41:             
42:             renderer.setScissorTest(false);
43:             renderer.clear(); 
44:             
45:             renderer.setViewport(0, 0, hw, h);
46:             renderer.setScissor(0, 0, hw, h);
47:             renderer.setScissorTest(true);
48:             renderer.render(scene, cam1);
49:             
50:             renderer.setViewport(hw, 0, hw, h);
51:             renderer.setScissor(hw, 0, hw, h);
52:             renderer.render(scene, cam2);
53:         }
54:
55:         function animate() { 
56:             requestAnimationFrame(animate); 
57:             cube.rotation.y += 0.01; 
58:             render(); 
59:         }
60:         animate();
61:     </script>
```
We have introduced a single rotating cube and two cameras. One looks from the front, the other from the side. In the render loop, we disable the scissor globally to wipe the entire screen once, then activate the scissor to draw the left half, and then re-configure it to draw the right half.

### Mechanical walkthrough
- `const scene = new THREE.Scene();` initializes the graph.
- `scene.add(new THREE.AmbientLight(0xffffff, 0.5));` and `scene.add(new THREE.DirectionalLight(0xffffff, 1));` illuminate the scene.
- `const cube = new THREE.Mesh(...)` builds a blue box and `scene.add(cube);` places it in the scene.
- `const aspect = (window.innerWidth / 2) / window.innerHeight;` calculates the width-to-height ratio specifically for *half* the screen. This is crucial; if we used the full screen aspect ratio, the camera would squish the image horizontally when we squished its viewport.
- `const cam1 = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);` creates a camera with that specific half-screen aspect ratio.
- `cam1.position.set(0, 0, 5); cam1.lookAt(0,0,0);` places it right in front of the cube.
- `const cam2 = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);` creates a second camera.
- `cam2.position.set(5, 2, 0); cam2.lookAt(0,0,0);` places it to the side and slightly above.
- `function render() { ... }` defines what happens every frame.
- `const w = window.innerWidth, h = window.innerHeight; const hw = w / 2;` retrieves dimensions.
- `renderer.setScissorTest(false);` disables the scissor test temporarily.
- `renderer.clear();` wipes the whole canvas to black, because no scissor is currently active.
- `renderer.setViewport(0, 0, hw, h);` maps the NDC block to the left half of the screen.
- `renderer.setScissor(0, 0, hw, h);` restricts any background clearing to that same left half (though we already cleared the whole screen).
- `renderer.setScissorTest(true);` turns the clipping back on.
- `renderer.render(scene, cam1);` draws the front-facing view.
- `renderer.setViewport(hw, 0, hw, h);` shifts the NDC map to the right half.
- `renderer.setScissor(hw, 0, hw, h);` shifts the scissor boundary to the right half.
- `renderer.render(scene, cam2);` draws the side-facing view into that right box.
- `function animate() { requestAnimationFrame(animate); cube.rotation.y += 0.01; render(); }` continuously requests frames, spins the cube, and draws both views.

### CS lens
This loop executes a **State Machine** pattern for GPU state. The GPU is a massive state machine. When you call `renderer.render()`, WebGL uses whatever the *currently bound* viewport and scissor settings are. We must mutate that global state (set left config), execute a side effect (render cam 1), mutate state again (set right config), and execute again.

### SE lens
Notice that `renderer.clear()` is called once for the whole screen, rather than clearing each half individually. Clearing the entire framebuffer in one go is generally faster than doing piecemeal clears. We turn off the scissor, clear everything, turn the scissor on, and draw. The tradeoff is remembering to reset `setScissorTest(false)` at the top of the loop, otherwise `clear()` would only clear the right half from the previous frame's final state.

### Commands needed
Refresh `lesson-12.html` in the browser.

### Run it
*No run needed. Confidently predicted: A split screen with a rotating blue cube, viewed from the front on the left, and the side on the right.*

### One sentence connecting to previous unit
Two identical camera types split the screen evenly, but we can mix different projection math and more viewports to create complex layouts.

---

## Concept Unit: Perspective + Orthographic four-view layout (CAD style)

### The Problem
A standard CAD or 3D modeling tool shows four views: one 3D perspective view, and three flat Orthographic views (top, front, side). How do we orchestrate four cameras, of two completely different mathematical types, seamlessly into quadrants?

> **What would you try here first?** You now know how to halve the screen horizontally. How would you divide the coordinates to get four equal quadrants?

### Introduce the concept in isolation
We will define an array of configurations to map coordinates dynamically.

```javascript
const w = 1920;
const h = 1080;
const hw = w/2;
const hh = h/2;

const quadrants = [
    { name: "Top-Left",     x: 0,  y: hh },
    { name: "Top-Right",    x: hw, y: hh },
    { name: "Bottom-Left",  x: 0,  y: 0  },
    { name: "Bottom-Right", x: hw, y: 0  }
];

for(const q of quadrants) {
    console.log(`${q.name} -> x: ${q.x}, y: ${q.y}, w: ${hw}, h: ${hh}`);
}
```
*Output: confidently predictable as arithmetic.*
```
Top-Left -> x: 0, y: 540, w: 960, h: 540
Top-Right -> x: 960, y: 540, w: 960, h: 540
Bottom-Left -> x: 0, y: 0, w: 960, h: 540
Bottom-Right -> x: 960, y: 0, w: 960, h: 540
```
This isolates the grid layout logic. The WebGL Y-axis starts at 0 at the bottom, so `y: hh` (540) is the top half of the screen.

### Discard the throwaway
This loop is discarded, but the concept of iterating over viewport configurations remains.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-12.html`
- **Change type:** replace.
- **Location:** Inside the `<script type="module">` tag, replacing all logic below the renderer initialization.

### The New Code
```javascript
        const scene = new THREE.Scene();
        const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.8, 0.3, 64, 8), new THREE.MeshStandardMaterial({color:0xff6600}));
        scene.add(mesh);
        scene.add(new THREE.AmbientLight(0x404040)); 
        scene.add(new THREE.DirectionalLight(0xffffff, 1));

        const w = window.innerWidth, h = window.innerHeight;
        const hw = w/2, hh = h/2;
        const aspect = hw/hh;

        const perspCam  = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
        perspCam.position.set(4, 4, 4); perspCam.lookAt(0,0,0);
        
        const frontCam  = new THREE.OrthographicCamera(-3*aspect, 3*aspect, 3, -3, 0.1, 100);
        frontCam.position.set(0,0,10); frontCam.lookAt(0,0,0);
        
        const topCam    = new THREE.OrthographicCamera(-3*aspect, 3*aspect, 3, -3, 0.1, 100);
        topCam.position.set(0,10,0); topCam.lookAt(0,0,0);
        
        const sideCam   = new THREE.OrthographicCamera(-3*aspect, 3*aspect, 3, -3, 0.1, 100);
        sideCam.position.set(10,0,0); sideCam.lookAt(0,0,0);

        const views = [
            {cam: perspCam, x: 0,  y: hh, w: hw, h: hh},  
            {cam: frontCam, x: hw, y: hh, w: hw, h: hh},  
            {cam: topCam,   x: 0,  y: 0,  w: hw, h: hh},  
            {cam: sideCam,  x: hw, y: 0,  w: hw, h: hh},  
        ];

        function render() {
            renderer.setScissorTest(false);
            renderer.clear();
            for (const v of views) {
                renderer.setViewport(v.x, v.y, v.w, v.h);
                renderer.setScissor(v.x, v.y, v.w, v.h);
                renderer.setScissorTest(true);
                renderer.render(scene, v.cam);
            }
        }
        
        const clock = new THREE.Clock();
        function animate() { 
            requestAnimationFrame(animate); 
            mesh.rotation.y += 0.005; 
            render(); 
        }
        animate();
```

### The Updated Project
```html
15:     <script type="module">
16:         import * as THREE from 'three';
17:         const canvas = document.getElementById('c');
18:         const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
19:         renderer.setSize(window.innerWidth, window.innerHeight);
20:         renderer.autoClear = false; 
21:
22:         // ← new below (replacing previous scene and loop)
23:         const scene = new THREE.Scene();
24:         const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.8, 0.3, 64, 8), new THREE.MeshStandardMaterial({color:0xff6600}));
25:         scene.add(mesh);
26:         scene.add(new THREE.AmbientLight(0x404040)); 
27:         scene.add(new THREE.DirectionalLight(0xffffff, 1));
28:
29:         const w = window.innerWidth, h = window.innerHeight;
30:         const hw = w/2, hh = h/2;
31:         const aspect = hw/hh;
32:
33:         const perspCam  = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
34:         perspCam.position.set(4, 4, 4); perspCam.lookAt(0,0,0);
35:         
36:         const frontCam  = new THREE.OrthographicCamera(-3*aspect, 3*aspect, 3, -3, 0.1, 100);
37:         frontCam.position.set(0,0,10); frontCam.lookAt(0,0,0);
38:         
39:         const topCam    = new THREE.OrthographicCamera(-3*aspect, 3*aspect, 3, -3, 0.1, 100);
40:         topCam.position.set(0,10,0); topCam.lookAt(0,0,0);
41:         
42:         const sideCam   = new THREE.OrthographicCamera(-3*aspect, 3*aspect, 3, -3, 0.1, 100);
43:         sideCam.position.set(10,0,0); sideCam.lookAt(0,0,0);
44:
45:         const views = [
46:             {cam: perspCam, x: 0,  y: hh, w: hw, h: hh},  
47:             {cam: frontCam, x: hw, y: hh, w: hw, h: hh},  
48:             {cam: topCam,   x: 0,  y: 0,  w: hw, h: hh},  
49:             {cam: sideCam,  x: hw, y: 0,  w: hw, h: hh},  
50:         ];
51:
52:         function render() {
53:             renderer.setScissorTest(false);
54:             renderer.clear();
55:             for (const v of views) {
56:                 renderer.setViewport(v.x, v.y, v.w, v.h);
57:                 renderer.setScissor(v.x, v.y, v.w, v.h);
58:                 renderer.setScissorTest(true);
59:                 renderer.render(scene, v.cam);
60:             }
61:         }
62:         
63:         const clock = new THREE.Clock();
64:         function animate() { 
65:             requestAnimationFrame(animate); 
66:             mesh.rotation.y += 0.005; 
67:             render(); 
68:         }
69:         animate();
70:     </script>
```
We replaced our two perspective cameras with one perspective camera and three orthographic ones, looking from the front, top, and side. We packaged the quadrant coordinates and camera references into an array, and looped over them to execute the render logic generically.

### Mechanical walkthrough
- `const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.8, 0.3, 64, 8), ...)` builds a complex knot geometry to make the flat projections more visually distinct.
- `const hw = w/2, hh = h/2;` determines the width and height of a single quadrant.
- `const aspect = hw/hh;` computes the aspect ratio for that quadrant.
- `const perspCam = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);` makes a 3D camera mapped to the quadrant's shape.
- `const frontCam = new THREE.OrthographicCamera(-3*aspect, 3*aspect, 3, -3, 0.1, 100);` constructs an orthographic camera. We multiply the horizontal boundaries (left, right) by `aspect` so the flat frustum matches the physical screen box, preventing horizontal squishing.
- `frontCam.position.set(0,0,10);` pulls the camera out on the Z axis. Because it's orthographic, distance doesn't affect size, it only determines the clipping plane.
- `const views = [ ... ]` groups the cameras with their target coordinates.
- `for (const v of views) { ... }` loops four times per frame.
- `renderer.setViewport(v.x, v.y, v.w, v.h);` sets the bounds for the current camera in the loop.
- `renderer.setScissor(v.x, v.y, v.w, v.h);` matches the scissor to the viewport.
- `renderer.setScissorTest(true);` enables clipping.
- `renderer.render(scene, v.cam);` paints the current camera to the currently locked region.
- `const clock = new THREE.Clock();` initializes a timer (though unused right now, standard for robust animation loops).

### CS lens
This implements **Data-Driven Execution**. By hoisting the camera and rectangle state into a data structure (`views` array), we eliminate repeated, hard-coded imperative statements. The renderer function now simply interprets the data structure.
Also recognized in: UI routing tables, ECS (Entity Component System) architectures, table-driven test suites.

### SE lens
The alternative was writing out `setViewport`, `setScissor`, and `render` four distinct times, yielding 12 lines of highly repetitive code. By driving the logic from an array, adding a 5th view or tweaking the layout requires changing only the data, not the execution loop. The tradeoff is slightly more setup complexity, but it prevents copy-paste errors where you might update a viewport's X coordinate but forget to update the corresponding scissor X coordinate.

### Commands needed
Refresh `lesson-12.html` in the browser.

### Run it
*No run needed. Confidently predicted: Four quadrants. Top-left shows a 3D knot. Top-right shows it flat from the front. Bottom-left shows it flat from above. Bottom-right shows it flat from the side.*

### One sentence connecting to previous unit
Four separate quadrants are great for editing, but sometimes we want one main view with a small overlay overlapping it, which requires handling depth buffers carefully.

---

## Concept Unit: Picture-in-picture (PIP) mini-map

### The Problem
If we draw a full-screen scene, and then immediately draw a smaller mini-map scene on top of it, the renderer will naturally overlay them. But if we use `renderer.clear()` it wipes everything! How do we draw *over* existing pixels without erasing them, while ensuring the new mini-map objects don't physically intersect or clip into the 3D objects already drawn on the canvas?

> **What would you try here first?** If you turn the scissor test on just for a small corner box, what happens when you draw? If both cameras have a depth buffer (Z-buffer), what happens if a distant mountain in the mini-map ends up with a Z-value "behind" a nearby object from the main camera's draw pass?

### Introduce the concept in isolation
We will demonstrate the difference between clearing color vs clearing depth.

```javascript
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer();

// Clear both color and depth
renderer.clear(); 
// WebGL internal equivalent: gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

// Clear ONLY depth
renderer.clearDepth(); 
// WebGL internal equivalent: gl.clear(gl.DEPTH_BUFFER_BIT)
```
*Proof without execution: `clearDepth` only issues the depth clear bit, leaving existing color pixel values intact on the screen.*

When WebGL draws a pixel, it records its depth. If you try to draw another pixel at the same screen location, WebGL checks if the new pixel is "closer". If it is behind the existing pixel, it is discarded. To draw a mini-map, we want it to *always* draw on top of the main scene. By calling `renderer.clearDepth()`, we tell WebGL to forget the depth of the pixels already painted by the main camera. The mini-map now believes the screen is empty and draws on top of everything.

### Discard the throwaway
This snippet is discarded, but `clearDepth` will be our tool.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-12.html`
- **Change type:** replace.
- **Location:** Replacing the four-view loop in the script block.

### The New Code
```javascript
        const scene = new THREE.Scene();
        const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.8, 0.3, 64, 8), new THREE.MeshStandardMaterial({color:0xff6600}));
        scene.add(mesh);
        scene.add(new THREE.AmbientLight(0x404040)); 
        scene.add(new THREE.DirectionalLight(0xffffff, 1));

        const mainCam = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
        mainCam.position.set(0, 2, 5); mainCam.lookAt(0, 0, 0);

        const minimapCam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
        minimapCam.position.set(0, 20, 0);
        minimapCam.lookAt(0, 0, 0);

        const pipW = 200, pipH = 200;  
        
        function render() {
            const pipX = window.innerWidth - pipW - 20; 
            const pipY = window.innerHeight - pipH - 20;

            renderer.setScissorTest(false);
            renderer.clear();
            
            renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
            renderer.render(scene, mainCam);
            
            renderer.setScissor(pipX, pipY, pipW, pipH);
            renderer.setScissorTest(true);
            renderer.clearDepth();  
            renderer.setViewport(pipX, pipY, pipW, pipH);
            renderer.render(scene, minimapCam);
        }

        function animate() { 
            requestAnimationFrame(animate); 
            mesh.rotation.y += 0.005; 
            render(); 
        }
        animate();
```

### The Updated Project
```html
15:     <script type="module">
16:         import * as THREE from 'three';
17:         const canvas = document.getElementById('c');
18:         const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
19:         renderer.setSize(window.innerWidth, window.innerHeight);
20:         renderer.autoClear = false; 
21:
22:         // ← new below
23:         const scene = new THREE.Scene();
24:         const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.8, 0.3, 64, 8), new THREE.MeshStandardMaterial({color:0xff6600}));
25:         scene.add(mesh);
26:         scene.add(new THREE.AmbientLight(0x404040)); 
27:         scene.add(new THREE.DirectionalLight(0xffffff, 1));
28:
29:         const mainCam = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
30:         mainCam.position.set(0, 2, 5); mainCam.lookAt(0, 0, 0);
31:
32:         const minimapCam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
33:         minimapCam.position.set(0, 20, 0);
34:         minimapCam.lookAt(0, 0, 0);
35:
36:         const pipW = 200, pipH = 200;  
37:         
38:         function render() {
39:             const pipX = window.innerWidth - pipW - 20; 
40:             const pipY = window.innerHeight - pipH - 20;
41:
42:             renderer.setScissorTest(false);
43:             renderer.clear();
44:             
45:             renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
46:             renderer.render(scene, mainCam);
47:             
48:             renderer.setScissor(pipX, pipY, pipW, pipH);
49:             renderer.setScissorTest(true);
50:             renderer.clearDepth();  
51:             renderer.setViewport(pipX, pipY, pipW, pipH);
52:             renderer.render(scene, minimapCam);
53:         }
54:
55:         function animate() { 
56:             requestAnimationFrame(animate); 
57:             mesh.rotation.y += 0.005; 
58:             render(); 
59:         }
60:         animate();
61:     </script>
```
We now have a full-screen `mainCam` and a small `minimapCam` hovering at the top. The render loop draws the full screen first, zeroes out the depth buffer in the top right corner, and draws the top-down minimap over it.

### Mechanical walkthrough
- `const mainCam = new THREE.PerspectiveCamera(...)` creates the primary player view covering the full aspect ratio.
- `const minimapCam = new THREE.OrthographicCamera(...)` creates a top-down view. We use an orthographic camera here because mini-maps shouldn't distort with perspective; distance should look uniform.
- `const pipW = 200, pipH = 200;` statically defines the pixel size of the overlay map.
- `const pipX = window.innerWidth - pipW - 20;` dynamically calculates the starting X coordinate, keeping it 20 pixels away from the right edge of the screen.
- `renderer.setScissorTest(false); renderer.clear();` resets the entire screen to black.
- `renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);` targets the entire canvas.
- `renderer.render(scene, mainCam);` paints the main 3D view.
- `renderer.setScissor(pipX, pipY, pipW, pipH);` locks any clears/draws to our 200x200 box in the top right.
- `renderer.setScissorTest(true);` enforces that lock.
- `renderer.clearDepth();` wipes the depth buffer specifically in that scissor region. The color buffer (the pixels already drawn by mainCam) stays untouched.
- `renderer.setViewport(pipX, pipY, pipW, pipH);` shrinks the NDC map so the minimap is squeezed down into the 200x200 box, instead of rendering a full 1080p frame and cutting a 200x200 hole in it.
- `renderer.render(scene, minimapCam);` paints the top-down view on top of the existing pixels, with no depth conflict.

### CS lens
This relies heavily on the **Z-Buffer (Depth Buffer) Algorithm**. By intentionally wiping the Z-buffer data, we are violating the physical space of the scene to force **Painter's Algorithm** compositing (draw A, then draw B on top). We rely on the hardware to handle pixel depth, and we manually override it to create layers.
Also recognized in: HUDs (Heads Up Displays) in games, UI rendering passes over 3D scenes, compositing engines.

### SE lens
Notice that we compute `pipX` inside the `render()` loop rather than globally. We could have calculated it once globally, but resizing the browser window would cause the minimap to float off-screen or drift away from the edge. By recalculating the position derived from `window.innerWidth` every frame, we implement a robust **Reactive Layout** without needing complex event listeners. The cost is a negligible amount of subtraction arithmetic per frame.

### Commands needed
Refresh `lesson-12.html` in the browser.

### Run it
*No run needed. Confidently predicted: A full screen view of the knot, with a 200x200 top-down square overlay anchored to the top right corner.*

### One sentence connecting to previous unit
Calculating coordinates per-frame works for simple PIP positioning, but true browser window resizing requires fundamentally updating the camera projection matrices themselves.

---

## Concept Unit: Updating viewports on window resize

### The Problem
If the user resizes the browser window, our canvas stretches or squishes, distorting the aspect ratios we calculated at load time. How do we inform all our cameras that the mathematical proportions of their viewports have physically changed?

> **What would you try here first?** When the window size changes, you know you have to update `renderer.setSize()`. But what variables on the camera itself rely on the width and height?

### Introduce the concept in isolation
We will look at how changing a camera's aspect ratio requires a matrix update.

```javascript
import * as THREE from 'three';

const cam = new THREE.PerspectiveCamera(75, 1.0, 0.1, 100);

// We change the property:
cam.aspect = 2.0; 

// Proof that the internal math doesn't automatically catch up:
console.log(cam.projectionMatrix.elements[0]);

cam.updateProjectionMatrix();

// Proof that the matrix has now absorbed the new aspect:
console.log(cam.projectionMatrix.elements[0]);
```
*Output: confidently predicted shape.*
```
1.303225...
0.651612...
```
When you modify `cam.aspect`, you are just changing a JavaScript number property. WebGL relies on the `projectionMatrix` to warp vertices. `updateProjectionMatrix()` is the explicit trigger that compiles your new `aspect` value into the raw matrix math.

### Discard the throwaway
This small script is discarded, we will now attach this logic to a browser resize event.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-12.html`
- **Change type:** add.
- **Location:** At the bottom of the script tag, just before the `animate()` call.

### The New Code
```javascript
        function onResize() {
            const w = window.innerWidth, h = window.innerHeight;
            renderer.setSize(w, h);
            
            // Update main camera
            mainCam.aspect = w / h;
            mainCam.updateProjectionMatrix();
            
            // Note: Our minimap is Orthographic and defined with hardcoded
            // -10 to 10 bounds, so it does not distort on resize.
            // If it relied on aspect ratio, we'd update its left/right bounds here.
            
            console.log('Viewports updated for', w, 'x', h);
        }
        window.addEventListener('resize', onResize);
```

### The Updated Project
```html
52:             renderer.render(scene, minimapCam);
53:         }
54:
55:         function animate() { 
56:             requestAnimationFrame(animate); 
57:             mesh.rotation.y += 0.005; 
58:             render(); 
59:         }
60:
61:         // ← new below
62:         function onResize() {
63:             const w = window.innerWidth, h = window.innerHeight;
64:             renderer.setSize(w, h);
65:             
66:             mainCam.aspect = w / h;
67:             mainCam.updateProjectionMatrix();
68:             
69:             console.log('Viewports updated for', w, 'x', h);
70:         }
71:         window.addEventListener('resize', onResize);
72:         // ← new above
73:
74:         animate();
75:     </script>
```
We define a callback triggered by the window's `resize` event. It immediately tells the renderer to expand or shrink its drawing surface, and then corrects the camera's aspect ratio so objects stay perfectly proportioned.

### Mechanical walkthrough
- `function onResize() { ... }` encapsulates the reaction to screen changes.
- `const w = window.innerWidth, h = window.innerHeight;` captures the new literal pixel dimensions of the browser window.
- `renderer.setSize(w, h);` tells the WebGL renderer to stretch the canvas element and resize its internal pixel buffers to match.
- `mainCam.aspect = w / h;` recalculates the physical width-to-height ratio. If the window got wider, this number goes up.
- `mainCam.updateProjectionMatrix();` forces Three.js to take that new `aspect` and rebuild the 4x4 matrix it passes to the GPU. Without this, the image would just stretch like silly putty as the window expanded.
- `window.addEventListener('resize', onResize);` tells the browser to call our function anytime the user drags the edge of the window.

### CS lens
This implements the **Observer Pattern**. The browser window is the subject, and our `onResize` function is an observer registered via `addEventListener`. It also highlights **Cache Invalidation**: `cam.aspect` is the source of truth, but `cam.projectionMatrix` is a cached optimization that must be explicitly invalidated/recalculated when the truth changes.
Also recognized in: DOM event handling, layout engine reflow triggers.

### SE lens
Why not put this logic inside the `render()` loop to make it reactive, like we did for `pipX`? Polling `window.innerWidth` every frame is cheap, but `renderer.setSize()` and `updateProjectionMatrix()` allocate new memory and do heavy matrix math. Running that 60 times a second would severely hurt performance. By relying on an event listener, we pay that cost *only* when the window size actually changes. The tradeoff is maintaining the listener connection, which is easily worth it here.

### Commands needed
Refresh `lesson-12.html` and drag the browser window edges to resize it.

### Run it
*No run needed. Confidently predicted: Resizing the window immediately resizes the canvas, and the 3D knot maintains its physical proportions rather than stretching or squishing.*

### One sentence connecting to previous unit
With resizing handled, our viewport layout is fully robust for actual deployment.

---

## Closing

### Connect the pieces
Let's trace a single frame rendering our PIP minimap setup:
1. `animate()` triggers `render()`.
2. `renderer.clear()` unconditionally wipes the screen to black because `setScissorTest(false)` is active.
3. `renderer.setViewport` maps the primary NDC box to cover the entire screen. `renderer.render(scene, mainCam)` executes, calculating depth into the Z-buffer and drawing the TorusKnot on screen.
4. `renderer.setScissor` and `setViewport` are locked to a 200x200 box in the top-right. `clearDepth()` deletes the Z-buffer data *only* inside that 200x200 region, meaning WebGL now thinks that corner of the screen is empty.
5. `renderer.render(scene, minimapCam)` executes. Because the Z-buffer is empty there, the top-down orthographic view of the TorusKnot paints perfectly over the top-right corner of the main perspective scene, giving us our final multi-camera composition.
