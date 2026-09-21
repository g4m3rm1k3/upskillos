# Lesson 01: The Minimal Three.js Scene — Scene, Camera, Renderer

**What you will build**
The reader creates their first Three.js scene: a rotating green cube on a black background. They understand Scene (the container), PerspectiveCamera (the viewpoint), WebGLRenderer (the drawing engine), BoxGeometry, MeshBasicMaterial, Mesh, and the requestAnimationFrame render loop.

**What you need to know first**
Lesson 00.

**Terms used in this lesson**
- **canvas** — The HTML element used to draw graphics via JavaScript. It acts as the window into our 3D world.
- **WebGL** — A JavaScript API for rendering high-performance interactive 3D and 2D graphics within any compatible web browser.
- **hex color** — A base-16 numerical representation of color, often prefixed with `0x` in JavaScript.
- **radians** — A standard unit of angular measure, where 2π radians equal 360 degrees.
- **scene graph** — A hierarchical tree structure that organizes and manages the 3D objects to be rendered.
- **aspect ratio** — The proportional relationship between the width and height of an image or screen.

**Objects and methods used**
- **THREE.Scene**
  - *What it is:* The root container for all 3D objects, lights, and cameras.
  - *Implementation:* `new THREE.Scene()`
  - *Its use:* Holds everything that should be rendered to the screen.
  - *Type:* Class
  - *Responsibility:* Maintains a hierarchical tree (scene graph) of objects to be drawn.
  - *Depends on:* Nothing for creation; objects must be added to it.
  - *Connects to:* Added objects (children) and the renderer (which draws it).
  - *Shape:* Root of the architectural scene graph.
- **THREE.PerspectiveCamera**
  - *What it is:* A camera that mimics human eyesight, where distant objects appear smaller.
  - *Implementation:* `new THREE.PerspectiveCamera(fov, aspect, near, far)`
  - *Its use:* Defines the viewpoint from which the scene is rendered.
  - *Type:* Class
  - *Responsibility:* Computes the projection matrix to transform 3D coordinates into 2D screen space.
  - *Depends on:* Field of view, aspect ratio, near, and far clipping planes.
  - *Connects to:* The renderer (to provide the viewpoint).
  - *Shape:* The viewer's lens into the virtual world.
- **THREE.WebGLRenderer**
  - *What it is:* The drawing engine that renders the scene to the canvas.
  - *Implementation:* `new THREE.WebGLRenderer({ canvas: ..., antialias: ... })`
  - *Its use:* Executes the drawing commands via WebGL to draw our scene.
  - *Type:* Class
  - *Responsibility:* Manages the WebGL context and drawing pipeline.
  - *Depends on:* An HTML canvas element.
  - *Connects to:* The Scene and Camera during the render call.
  - *Shape:* The output mechanism bridging the 3D graph to the 2D display.
- **THREE.BoxGeometry**
  - *What it is:* A mathematical shape defining a rectangular cuboid.
  - *Implementation:* `new THREE.BoxGeometry(width, height, depth)`
  - *Its use:* Defines the vertices and faces of our 3D cube.
  - *Type:* Class
  - *Responsibility:* Stores position and structure data of a box.
  - *Depends on:* Dimensions (width, height, depth).
  - *Connects to:* A Mesh object.
  - *Shape:* Data container for vertex buffers.
- **THREE.MeshBasicMaterial**
  - *What it is:* A material that colors an object without reacting to lighting.
  - *Implementation:* `new THREE.MeshBasicMaterial({ color: 0x00ff00 })`
  - *Its use:* Defines how the surface of the geometry looks (solid green color).
  - *Type:* Class
  - *Responsibility:* Dictates shader properties for drawing faces without light calculations.
  - *Depends on:* Configuration parameters like color.
  - *Connects to:* A Mesh object.
  - *Shape:* Shader configuration layer.
- **THREE.Mesh**
  - *What it is:* A renderable 3D object that combines geometry and material.
  - *Implementation:* `new THREE.Mesh(geometry, material)`
  - *Its use:* The actual cube we add to the scene and spin.
  - *Type:* Class
  - *Responsibility:* Links a mathematical shape to a visual style and positions it in space.
  - *Depends on:* A Geometry and a Material.
  - *Connects to:* The Scene (as a child).
  - *Shape:* Leaf node in the scene graph.

## Concept Unit: THREE.Scene — the scene graph container
### The Problem
How do we organize objects in a 3D world before we draw them? If we create a cube, a sphere, and a light, how does the system know they belong together? What data structure makes sense for a universe of objects?

### Introduce the concept in isolation
```html
<!DOCTYPE html>
<html>
<head>
  <script type="importmap">
    {"imports": {"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"}}
  </script>
</head>
<body>
<script type="module">
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);  // dark grey background

// The scene is a tree (graph) of 3D objects
// scene.children: array of top-level objects
// All objects added to scene are rendered
console.log('Scene created:', scene.type);        // 'Scene'
console.log('Children:', scene.children.length);  // 0 (nothing added yet)

// Add a placeholder object:
const placeholder = new THREE.Object3D();
placeholder.name = 'placeholder';
scene.add(placeholder);
console.log('Children after add:', scene.children.length);  // 1
console.log('Child name:', scene.children[0].name);          // 'placeholder'
</script>
</body>
</html>
```
Trace: `new THREE.Scene()` creates an empty scene graph. `scene.background = new THREE.Color(0x111111)` sets dark grey. `scene.add(placeholder)` inserts it into the children array. `scene.children.length = 1`. This proves the scene acts as a container. This is called a **Scene Graph**.

### Discard the throwaway
This throwaway code is explicitly discarded and will not appear in the project.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because it is the foundational file.
- **Files affected**: Created `lesson-01.html`.
- **Change type**: add.
- **Location**: New file.
- **Dependencies**: Three.js module via importmap.

### The New Code
```javascript
const scene = new THREE.Scene();
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <head>
4:   <title>Lesson 01 — Minimal Three.js Scene</title>
5:   <style>body { margin: 0; overflow: hidden; background: #000; }</style>
6:   <script type="importmap">
7:     {"imports": {"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"}}
8:   </script>
9: </head>
10: <body>
11: <canvas id="c"></canvas>
12: <script type="module">
13: import * as THREE from 'three';
14: 
15: const scene = new THREE.Scene(); // ← new
16: </script>
17: </body>
18: </html>
```
The script tag now imports the library and creates our empty scene container.

### Mechanical walkthrough
- `const` declares a block-scoped constant.
- `scene` is the variable name holding our container.
- `=` is the assignment operator.
- `new` allocates memory and initializes a new object instance.
- `THREE` accesses the imported namespace.
- `.` accesses properties on an object.
- `Scene()` invokes the constructor for the Scene class.
- `;` terminates the statement.

### CS lens
The concept here is a **Tree**. In computer science, a tree is a hierarchical data structure.
- DOM (Document Object Model) in web browsers.
- File system directories (folders containing folders or files).
- Abstract Syntax Trees (AST) in compilers.
- UI widget hierarchies in desktop frameworks.

### SE lens
**Composite Pattern**. The scene graph treats individual objects and groups of objects uniformly. The alternative not chosen would be a flat array of objects. A real tradeoff is that a flat array is faster to iterate over, but makes hierarchical transformations (like moving a car, which moves its wheels) extremely difficult to manage.

### Commands needed
Open lesson-01.html in a modern browser (Chrome, Firefox, Edge).

### Run it
Currently, the screen is completely black. The script runs silently in the console, initializing the scene.

### One sentence connecting to previous unit
Now that we have a container for our world, we need a way to view it.

## Concept Unit: THREE.PerspectiveCamera
### The Problem
A scene graph holds objects, but what does the user actually see? If there are objects scattered across 3D space, how do we flatten them into a 2D monitor screen? What parameters define human-like vision?

### Introduce the concept in isolation
```html
<!DOCTYPE html>
<html>
<head>
  <script type="importmap">
    {"imports": {"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"}}
  </script>
</head>
<body>
<script type="module">
import * as THREE from 'three';

// PerspectiveCamera(fov, aspect, near, far)
// fov: vertical field of view in degrees
// aspect: width / height (match canvas)
// near: closest visible distance
// far: farthest visible distance
const camera = new THREE.PerspectiveCamera(
    75,                                      // fov: 75 degrees
    window.innerWidth / window.innerHeight,  // aspect: full window
    0.1,                                     // near: 0.1 units
    1000                                     // far: 1000 units
);

camera.position.set(0, 0, 5);  // step back 5 units on Z axis
camera.lookAt(0, 0, 0);        // aim at origin

console.log('Camera position:', camera.position);  // Vector3(0, 0, 5)
console.log('Camera FOV:', camera.fov);            // 75
console.log('Camera near/far:', camera.near, camera.far); // 0.1 1000
</script>
</body>
</html>
```
Trace: `camera.position.set(0,0,5)`: Z=5 means camera is 5 units in front of the origin (positive Z is toward viewer). `camera.lookAt(0,0,0)`: rotates camera to face the origin. Without `position.set`, camera starts at `(0,0,0)` same as default objects — you'd see nothing because camera is inside the cube. This proves the camera is an object with spatial properties. This is called a **Perspective Projection**.

### Discard the throwaway
This throwaway code is explicitly discarded and will not appear in the project.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: Modified `lesson-01.html`.
- **Change type**: add.
- **Location**: After the scene creation.
- **Dependencies**: None.

### The New Code
```javascript
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 5;
```

### The Updated Project
```html
13: import * as THREE from 'three';
14: 
15: const scene = new THREE.Scene();
16: const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000); // ← new
17: camera.position.z = 5; // ← new
18: </script>
```
The script now defines our viewport and steps the viewpoint back 5 units along the Z axis.

### Mechanical walkthrough
- `const camera` declares a constant named camera.
- `=` assignment operator.
- `new THREE.PerspectiveCamera(...)` instantiates the camera object.
- `75` is the literal integer for the vertical field of view in degrees.
- `window.innerWidth` accesses the browser window's width.
- `/` is the division operator to compute the aspect ratio.
- `window.innerHeight` accesses the browser window's height.
- `0.1` is the near clipping plane distance.
- `1000` is the far clipping plane distance.
- `camera.position.z` accesses the z property of the camera's position vector.
- `= 5` sets that coordinate to 5.
- `;` terminates the statement.

### CS lens
The concept here is a **Projection Matrix**. In linear algebra and computer graphics, this maps a 3D coordinate space onto a 2D plane.
- GPS mapping software projecting earth onto a flat screen.
- 3D modeling tools like Blender showing orthographic vs perspective views.
- Ray tracing algorithms casting rays from a virtual eye point.

### SE lens
**Configuration vs Defaults**. The API requires four specific parameters for the camera rather than supplying defaults. The alternative not chosen is parameterless instantiation `new THREE.PerspectiveCamera()`. The real tradeoff is that forcing the developer to provide FOV and aspect ratio prevents distorted rendering bugs where the canvas shape doesn't match the internal viewport shape.

### Commands needed
Open lesson-01.html in a modern browser (Chrome, Firefox, Edge).

### Run it
The screen is still black. The camera exists in memory, positioned at Z=5, ready to capture.

### One sentence connecting to previous unit
With our container and our viewpoint established, we need an engine to actually draw what the camera sees.

## Concept Unit: THREE.WebGLRenderer
### The Problem
We have a scene graph and a camera, but how do pixels actually light up on the screen? Who talks to the graphics card to execute these mathematical descriptions? How do we connect our 3D logic to the HTML `<canvas>` element?

### Introduce the concept in isolation
```html
<!DOCTYPE html>
<html>
<head>
  <script type="importmap">
    {"imports": {"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"}}
  </script>
</head>
<body>
<canvas id="c"></canvas>
<script type="module">
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('c'),  // attach to existing canvas
    antialias: true,                       // smooth edges
});
renderer.setSize(window.innerWidth, window.innerHeight);  // fill window
renderer.setPixelRatio(window.devicePixelRatio);          // sharp on HiDPI

console.log('Renderer size:', renderer.domElement.width, 'x', renderer.domElement.height);
console.log('Pixel ratio:', renderer.getPixelRatio());
// domElement.width = innerWidth * devicePixelRatio (e.g. 1920 on Retina)
</script>
</body>
</html>
```
Trace: `renderer.setSize(1920, 1080)` on a 1920x1080 screen. `renderer.setPixelRatio(2)` on Retina: actual canvas buffer = 3840x2160. `antialias: true` uses MSAA to smooth staircase edges on diagonals. This proves the renderer controls the physical output to the canvas. This is called a **Graphics Pipeline**.

### Discard the throwaway
This throwaway code is explicitly discarded and will not appear in the project.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: Modified `lesson-01.html`.
- **Change type**: add.
- **Location**: After the camera configuration.
- **Dependencies**: An HTML element with ID `c`.

### The New Code
```javascript
const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
```

### The Updated Project
```html
13: import * as THREE from 'three';
14: 
15: const scene = new THREE.Scene();
16: const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
17: camera.position.z = 5;
18: 
19: const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias: true}); // ← new
20: renderer.setSize(window.innerWidth, window.innerHeight); // ← new
21: renderer.setPixelRatio(window.devicePixelRatio); // ← new
22: </script>
```
The script initializes the WebGL renderer, binds it to the canvas, and sets its rendering dimensions.

### Mechanical walkthrough
- `const renderer` declares a new constant.
- `=` assignment operator.
- `new THREE.WebGLRenderer(...)` instantiates the renderer.
- `{ canvas: ..., antialias: true }` is an object literal passed as the configuration options.
- `canvas:` property key for the target element.
- `document.getElementById('c')` fetches the HTML `<canvas>` element.
- `antialias: true` property key enabling smoothing.
- `renderer.setSize(...)` calls the method to define the canvas pixel dimensions.
- `window.innerWidth`, `window.innerHeight` supplies the browser dimensions.
- `renderer.setPixelRatio(...)` calls the method to handle high-density displays.
- `window.devicePixelRatio` fetches the display's scaling factor.
- `;` terminates each statement.

### CS lens
The concept here is **Hardware Acceleration**. Programs can offload mathematically intensive tasks (like drawing millions of triangles) from the CPU (general purpose) to the GPU (highly parallel processing).
- Video decoding hardware in media players.
- Neural network training on tensor cores.
- Physics engines utilizing compute shaders.

### SE lens
**Dependency Injection**. By passing the canvas element into the renderer constructor (`document.getElementById('c')`), we supply the dependency from the outside rather than having the renderer create or find the element itself. The alternative not chosen is letting `THREE.WebGLRenderer` create its own canvas element globally. The real tradeoff is that injecting it allows us to style, position, or replace the canvas element cleanly in HTML without interfering with the renderer's logic.

### Commands needed
Open lesson-01.html in a modern browser (Chrome, Firefox, Edge).

### Run it
The screen is now styled with our canvas filling the page (due to our CSS), but still no shapes are drawn.

### One sentence connecting to previous unit
Now that the infrastructure is set up, we need something physical to actually look at.

## Concept Unit: BoxGeometry, MeshBasicMaterial, and Mesh
### The Problem
How do we define an object in 3D space? A shape needs corners (vertices), but it also needs an appearance (color, shininess). How does Three.js decouple the mathematical shape of an object from its visual style?

### Introduce the concept in isolation
```html
<!DOCTYPE html>
<html>
<head>
  <script type="importmap">
    {"imports": {"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"}}
  </script>
</head>
<body>
<script type="module">
import * as THREE from 'three';

// BoxGeometry(width, height, depth)
const geometry = new THREE.BoxGeometry(1, 1, 1);  // 1x1x1 cube

// MeshBasicMaterial: unlit (ignores light sources, always full color)
const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,    // green
    wireframe: false,   // solid faces
});

// Mesh: geometry + material = renderable object
const cube = new THREE.Mesh(geometry, material);
console.log('Cube position:', cube.position);  // Vector3(0, 0, 0) by default
console.log('Geometry vertices:', geometry.attributes.position.count);  // 24
console.log('Material color:', material.color);  // Color{r:0, g:1, b:0}
</script>
</body>
</html>
```
Trace: `BoxGeometry(1,1,1)`: 6 faces * 4 vertices each = 24 positions in the buffer (with duplicates for UV seams). `material.color`: 0x00ff00 hex -> `{r:0, g:1, b:0}` in [0,1] range. Mesh does NOT render until added to scene and `renderer.render()` is called. This proves that an object is a composition of shape and style. This is called a **Mesh**.

### Discard the throwaway
This throwaway code is explicitly discarded and will not appear in the project.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: Modified `lesson-01.html`.
- **Change type**: add.
- **Location**: After the renderer setup.
- **Dependencies**: None.

### The New Code
```javascript
const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({color: 0x00ff00})
);
scene.add(cube);
```

### The Updated Project
```html
19: const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias: true});
20: renderer.setSize(window.innerWidth, window.innerHeight);
21: renderer.setPixelRatio(window.devicePixelRatio);
22: 
23: const cube = new THREE.Mesh( // ← new
24:     new THREE.BoxGeometry(1, 1, 1), // ← new
25:     new THREE.MeshBasicMaterial({color: 0x00ff00}) // ← new
26: ); // ← new
27: scene.add(cube); // ← new
28: </script>
```
The script defines a 1x1x1 cube painted solid green and adds it to our scene graph.

### Mechanical walkthrough
- `const cube` declares the constant to hold our object.
- `=` assignment operator.
- `new THREE.Mesh(...)` instantiates the final renderable object.
- `new THREE.BoxGeometry(1, 1, 1)` creates an inline instance of a 1x1x1 cuboid for the first argument.
- `,` separates the arguments.
- `new THREE.MeshBasicMaterial(...)` creates an inline instance of an unlit material for the second argument.
- `{color: 0x00ff00}` is an object literal configuring the material to be pure green.
- `scene.add(cube)` invokes the add method on our scene, passing the newly created mesh as a child.
- `;` terminates the statements.

### CS lens
The concept here is **Composition**. Instead of creating a `GreenCube` class, we compose a generic `Mesh` out of interchangeable components (a geometry and a material).
- Entity-Component Systems in video games.
- Higher-order functions composing behaviors in functional programming.
- Dependency injection building complex services from simpler ones.

### SE lens
**Separation of Concerns**. By separating Geometry from Material, Three.js allows developers to reuse the same box math for a wooden crate and a metal safe. The alternative not chosen would be putting color directly onto the geometry. The real tradeoff is that defining meshes is slightly more verbose, but drastically reduces memory usage when thousands of objects share the same shape.

### Commands needed
Open lesson-01.html in a modern browser (Chrome, Firefox, Edge).

### Run it
The screen is still black because we have constructed the objects in memory but never actually told the renderer to draw them!

### One sentence connecting to previous unit
To finally see our scene, we must ask the browser to draw it continuously over time.

## Concept Unit: The render loop — requestAnimationFrame
### The Problem
If we just draw the scene once, it will be a static image. How do we create a running animation? How do we sync our JavaScript logic so it draws exactly when the screen refreshes, preventing tearing and lag?

### Introduce the concept in isolation
```html
<!DOCTYPE html>
<html>
<head>
  <script type="importmap">
    {"imports": {"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"}}
  </script>
</head>
<body>
<canvas id="c"></canvas>
<script type="module">
import * as THREE from 'three';

const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.z = 5;

const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({color: 0x00ff00})
);
scene.add(cube);

// Render loop:
function animate() {
    requestAnimationFrame(animate);   // schedule next frame (~60fps)
    cube.rotation.x += 0.01;         // rotate 0.01 radians per frame
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);   // draw frame
}
animate();  // kick off the loop
console.log('Render loop started');
</script>
</body>
</html>
```
Trace `animate()`: `requestAnimationFrame` schedules `animate` to run before next screen repaint (~16.67ms at 60fps). `cube.rotation.x += 0.01`: adds 0.01 radians (~0.57 degrees) per frame. After 360 frames: 3.6 radians > 2*PI = full rotation. `renderer.render(scene, camera)`: traverses scene graph, runs GPU pipeline, draws to canvas. This proves the function loops perfectly with the display hardware. This is called a **Render Loop**.

### Discard the throwaway
This throwaway code is explicitly discarded and will not appear in the project.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: Modified `lesson-01.html`.
- **Change type**: add.
- **Location**: End of the script block.
- **Dependencies**: None.

### The New Code
```javascript
function animate() {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
}
animate();
```

### The Updated Project
```html
23: const cube = new THREE.Mesh(
24:     new THREE.BoxGeometry(1, 1, 1),
25:     new THREE.MeshBasicMaterial({color: 0x00ff00})
26: );
27: scene.add(cube);
28: 
29: function animate() { // ← new
30:     requestAnimationFrame(animate); // ← new
31:     cube.rotation.x += 0.01; // ← new
32:     cube.rotation.y += 0.01; // ← new
33:     renderer.render(scene, camera); // ← new
34: } // ← new
35: animate(); // ← new
36: </script>
37: </body>
38: </html>
```
We define an animation function that updates the cube's rotation and commands the renderer to draw, then kicks itself off continuously.

### Mechanical walkthrough
- `function animate() {` defines a named function with no parameters.
- `requestAnimationFrame(animate)` tells the browser to call the `animate` function right before the next screen repaint.
- `cube.rotation.x` accesses the rotation property of our mesh along the X axis.
- `+=` is the addition assignment operator, incrementing the value.
- `0.01` is the literal float value in radians to rotate per frame.
- `cube.rotation.y += 0.01` applies the same rotation around the Y axis.
- `renderer.render(...)` issues the draw command.
- `scene, camera` are the arguments telling the renderer what to draw, and from what perspective.
- `}` closes the function body.
- `animate();` executes the function manually for the first time, initiating the infinite loop.

### CS lens
The concept here is an **Event Loop Callback**. In an asynchronous environment, `requestAnimationFrame` registers our callback with the browser's refresh cycle.
- Desktop game engines with an `update()` and `draw()` loop.
- Polling for hardware input on microcontrollers.
- The Node.js event loop scheduling `setImmediate`.

### SE lens
**Inversion of Control**. Instead of writing an infinite `while (true)` loop that halts the browser, we yield control to the browser. The alternative not chosen is `setInterval(animate, 16)`. The real tradeoff is that `requestAnimationFrame` automatically pauses when the user switches tabs, saving battery life and CPU cycles, which `setInterval` fails to do.

### Commands needed
Open lesson-01.html in a modern browser (Chrome, Firefox, Edge).

### Run it
A solid green cube appears in the center of the dark gray screen. It slowly rotates along both its X and Y axes continuously.

### One sentence connecting to previous unit
We've brought our static data structures to life by rendering them continuously.

## Closing
### Connect the pieces
When `renderer.render(scene, camera)` is called, the renderer traverses the `Scene` container to find all renderable objects. It discovers our `Mesh`, which points to a `BoxGeometry`. The renderer takes one of the 24 vertices (for example, at `0.5, 0.5, 0.5`). It applies the mesh's `rotation` values to move the vertex in 3D space. Then, it uses the `PerspectiveCamera`'s field of view and position (Z=5) to compute a projection matrix, mathematical logic that flattens this 3D coordinate onto our 2D HTML `<canvas>`. Finally, it uses the `MeshBasicMaterial`'s configuration (`0x00ff00`) to fill the pixels comprising the flattened face with green. This entire pipeline repeats 60 times a second thanks to `requestAnimationFrame`, transforming static coordinates into our spinning green cube.
