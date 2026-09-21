# Lesson 20: Particles — Points, PointsMaterial, and Particle Systems

## What you will build
You will build a high-performance particle system that renders thousands of moving particles efficiently on the GPU. The transferable problem this solves is rendering massive amounts of geometry without crushing the CPU: rather than treating 5000 particles as 5000 separate objects, we will pack their positions into a single typed array and issue a single draw call. 

## What you need to know first
- You must understand the basic Three.js scene graph (`THREE.Scene`, `THREE.WebGLRenderer`) from Lesson 1.
- You must be familiar with standard animation loops using `requestAnimationFrame` from Lesson 2.

## Pipeline diagram
`Initialize Scene → Define Buffer Geometry → Create Material → Instantiate Points → Animate Loop`
This lesson touches the entire pipeline: we initialize a scene, construct a `BufferGeometry` holding thousands of coordinates, apply a `PointsMaterial` to style them, and continuously update the buffer in the animate loop to drive motion.

## Terms used in this lesson

- **GPU draw call** — an instruction sent from the CPU to the GPU to draw a batch of geometry. A high number of draw calls crushes performance; batching data into a single draw call solves this overhead.
- **Vertex** — a point in 3D space with associated data (like position or color). In a particle system, every vertex acts as an individual particle.
- **Sprite** — a 2D image mapped onto a plane that always faces the camera. Particles are essentially point sprites rendered at each vertex location.
- **Buffer** — a contiguous block of memory. Buffers exist to hand raw, structured binary data directly to the WebGL API without JavaScript object overhead.
- **Additive Blending** — a rendering technique where pixel colors are added together when overlapping, solving the problem of creating bright, glowing effects like fire or magic.
- **Alpha Test** — a threshold check in the shader that discards pixels below a certain opacity, solving the visual glitch of invisible squares blocking objects behind them.
- **Depth Write** — a setting that tells the renderer whether an object should record its depth in the depth buffer. Disabling it solves sorting artifacts for transparent particles.
- **Object pool pattern (Emitter pattern)** — a software engineering pattern that reuses a fixed set of objects instead of continuously creating and destroying them, solving memory allocation overhead and garbage collection stutters.
- **Vertex colors** — assigning unique colors directly to vertices rather than the whole material, allowing a single batched object to have multi-colored components.

## Objects and methods used

**THREE.Points**
- *What it is*: A Three.js class representing a particle system.
- *Implementation*: `new THREE.Points(geometry, material)`
- *Its use*: Used to render large numbers of particles efficiently.
- *Type*: Class
- *Responsibility*: Renders all vertices defined in its geometry as individual point sprites using a single GPU draw call.
- *Depends on*: A `THREE.BufferGeometry` defining positions, and a `THREE.PointsMaterial` defining visual properties.
- *Connects to*: Added to a `THREE.Scene` and processed by the WebGL renderer.
- *Shape*: Public API surface representing a 3D object in the scene graph.

**Float32Array**
- *What it is*: A typed array representing an array of 32-bit floating point numbers.
- *Implementation*: `new Float32Array(length)`
- *Its use*: Used to efficiently store and pass binary vertex data to WebGL.
- *Type*: Native JavaScript Class
- *Responsibility*: Allocates a contiguous block of memory to store raw numerical data, avoiding garbage collection overhead.
- *Depends on*: Standard JavaScript runtime.
- *Connects to*: Passed as data to `THREE.BufferAttribute`.
- *Shape*: Internal data structure for CPU-GPU memory transfer.

**THREE.BufferGeometry**
- *What it is*: An efficient representation of mesh, line, or point geometry in Three.js.
- *Implementation*: `new THREE.BufferGeometry()`
- *Its use*: Used to hold the `Float32Array` attributes like position and color.
- *Type*: Class
- *Responsibility*: Manages the buffers of data (vertices, colors, etc.) sent to the GPU.
- *Depends on*: `THREE.BufferAttribute` instances attached via `setAttribute`.
- *Connects to*: Passed as the first argument to `THREE.Points`.
- *Shape*: Data layer defining the physical structure of the 3D object.

**THREE.BufferAttribute**
- *What it is*: A class that stores data for an attribute (like position or color) associated with a `BufferGeometry`.
- *Implementation*: `new THREE.BufferAttribute(typedArray, itemSize)`
- *Its use*: Used to map a `Float32Array` to a specific shader attribute.
- *Type*: Class
- *Responsibility*: Describes how raw array data should be read by the GPU (e.g., grouping 3 numbers per vertex).
- *Depends on*: A typed array (like `Float32Array`) and an integer indicating item size.
- *Connects to*: Passed into `THREE.BufferGeometry.setAttribute`.
- *Shape*: Mapping layer connecting raw memory to GPU shader inputs.

**THREE.PointsMaterial**
- *What it is*: A material explicitly designed to render point sprites.
- *Implementation*: `new THREE.PointsMaterial(parameters)`
- *Its use*: Used to style particles with size, color, textures, and blending.
- *Type*: Class
- *Responsibility*: Instructs the GPU on how to visually render each point vertex.
- *Depends on*: Configuration object specifying properties like `size`, `color`, and `map`.
- *Connects to*: Passed as the second argument to `THREE.Points`.
- *Shape*: Presentation layer defining the look of the particle system.

**THREE.CanvasTexture**
- *What it is*: A texture created from an HTML canvas element.
- *Implementation*: `new THREE.CanvasTexture(canvas)`
- *Its use*: Used to dynamically generate a particle glow image without needing an external image file.
- *Type*: Class
- *Responsibility*: Converts 2D canvas drawing instructions into a WebGL-compatible texture.
- *Depends on*: An HTML `<canvas>` element drawn via `CanvasRenderingContext2D`.
- *Connects to*: Assigned to the `map` property of a material.
- *Shape*: Asset generation layer dynamically bridging 2D canvas and 3D WebGL.

**THREE.AdditiveBlending**
- *What it is*: A blending mode constant in Three.js.
- *Implementation*: `THREE.AdditiveBlending`
- *Its use*: Used to make overlapping particles add their colors together, creating a bright glow effect.
- *Type*: Constant Number
- *Responsibility*: Tells the GPU to add the source pixel color to the destination pixel color.
- *Depends on*: The material's `transparent` property being `true`.
- *Connects to*: Assigned to the `blending` property of `THREE.PointsMaterial`.
- *Shape*: Configuration constant controlling GPU render state.

**requestAnimationFrame**
- *What it is*: A browser API function for scheduling rendering frames.
- *Implementation*: `requestAnimationFrame(callback)`
- *Its use*: Used to create the main animation loop that updates particle positions.
- *Type*: Global Function
- *Responsibility*: Asks the browser to call a specified function before the next repaint, matching the display refresh rate.
- *Depends on*: The browser window and a function to execute.
- *Connects to*: Recursively calls the `animate` function, driving the update logic and `renderer.render`.
- *Shape*: External system callback anchoring the application lifecycle.

---

## Concept Unit: THREE.Points

### The Problem
If you create 5000 individual `THREE.Mesh` spheres and add them to the scene, your application will crawl to a halt. The CPU has to issue 5000 separate "draw calls" to the GPU every single frame. How do we draw 5000 objects efficiently without crushing the CPU pipeline?

### Introduce the concept in isolation
We will use a `Float32Array` to batch coordinates and test it in an isolated throwaway file.

```html
<script type="module">
  import * as THREE from 'three';
  const positions = new Float32Array([0,0,0, 1,1,1]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xff0000 }));
  console.log('Is Points:', points.isPoints);
  console.log('Item size:', geo.attributes.position.itemSize);
</script>
```

Stated directly (predicted output):
```text
Is Points: true
Item size: 3
```

This proves that `THREE.Points` successfully wraps the `Float32Array` buffer, grouping the numbers into sets of 3 (x, y, z) per vertex.

### Discard the throwaway
This isolated lab is purely for proof of concept. Delete the throwaway file; it will not be used in the main project.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are initializing the particle system logic.
- **Files affected**: `lesson-20.html` (modified)
- **Change type**: Add
- **Location**: Inside the standard scene initialization function.
- **Dependencies**: Three.js library must be loaded.

### The New Code
```javascript
const N = 5000;
const positions = new Float32Array(N * 3);  // x,y,z per particle
for (let i = 0; i < N; i++) {
    positions[i*3  ] = (Math.random() - 0.5) * 20;  // x: -10 to 10
    positions[i*3+1] = (Math.random() - 0.5) * 20;  // y
    positions[i*3+2] = (Math.random() - 0.5) * 20;  // z
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const mat = new THREE.PointsMaterial({
    size:           0.1,    // point size in world units
    sizeAttenuation: true,  // perspective scaling
    color:          0xffffff,
    transparent:    true,
    opacity:        0.8,
});
const particles = new THREE.Points(geo, mat);
scene.add(particles);
console.log('Particle count:', N);                         // 5000
console.log('Draw calls: 1 (all 5000 in one batch)');
console.log('Position buffer size:', positions.byteLength); // 60000 bytes (5000*3*4)
```

### The Updated Project
```html
1: <script type="module">
2:   import * as THREE from 'three';
3:   const scene = new THREE.Scene();
4:   // ← new particle creation logic begins here
5:   const N = 5000;
6:   const positions = new Float32Array(N * 3);
7:   for (let i = 0; i < N; i++) {
8:       positions[i*3  ] = (Math.random() - 0.5) * 20;
9:       positions[i*3+1] = (Math.random() - 0.5) * 20;
10:      positions[i*3+2] = (Math.random() - 0.5) * 20;
11:  }
12:  const geo = new THREE.BufferGeometry();
13:  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
14:  const mat = new THREE.PointsMaterial({
15:      size:           0.1,
16:      sizeAttenuation: true,
17:      color:          0xffffff,
18:      transparent:    true,
19:      opacity:        0.8,
20:  });
21:  const particles = new THREE.Points(geo, mat);
22:  scene.add(particles);
23:  // ← new logic ends
24: </script>
```
The scene now initializes an array of 5000 vertex coordinates, wraps them into a single buffer geometry, and renders them in one pass.

### Mechanical walkthrough
- `const N = 5000;` declares the total number of particles.
- `new Float32Array(N * 3);` creates a contiguous block of 15000 slots because each particle needs 3 floating-point numbers (x, y, z).
- `for (let i = 0; i < N; i++)` iterates exactly `N` times.
- `positions[i*3 ]` computes the index for the x-coordinate of the `i`-th particle.
- `(Math.random() - 0.5) * 20` generates a random number evenly distributed between -10 and 10.
- `new THREE.BufferGeometry()` instantiates a hollow shell for geometry data.
- `new THREE.BufferAttribute(positions, 3)` wraps the raw `Float32Array` and dictates that the GPU should read it in groups of 3.
- `geo.setAttribute('position', ...)` binds that attribute to the internal shader keyword `position`.
- `new THREE.PointsMaterial({...})` creates the material specific to rendering points.
- `size: 0.1` sets the particle size.
- `sizeAttenuation: true` ensures points look smaller as they get further away in perspective.
- `new THREE.Points(geo, mat)` marries the batched coordinates with the material.
- `scene.add(particles)` inserts the entire 5000-particle construct into the rendering tree.
- `console.log(...)` traces the resulting memory footprint (15000 floats = 60000 bytes) and notes the efficiency of a single draw call.

### CS lens
In computer graphics, moving data from RAM to VRAM (CPU to GPU) is a massive bottleneck. The overhead of initiating a command (a draw call) is often more expensive than the rendering itself. By flattening all 5000 individual locations into a single contiguous array, we amortize the draw call overhead entirely. 

### SE lens
This array-based logic is heavily optimized but fundamentally lacks object-oriented encapsulation for individual particles. You cannot say `particle.position.x = 5`. Trading ergonomics for raw performance is a classic architectural decision.

### Commands needed
Open `lesson-20.html` in a modern browser.

### Run it
When executed, you will see a scattered cloud of 5000 static white squares occupying the scene. 

### One sentence connecting to previous unit
Now that we have massive quantities of particles rendering efficiently, we need to make them look like glowing orbs instead of flat white squares.

---

## Concept Unit: PointsMaterial with texture

### The Problem
Right now, the particles render as solid white squares. How do we apply a glowing circular texture and ensure they blend together beautifully without obscuring each other with their transparent, invisible bounding boxes?

### Introduce the concept in isolation
We will construct a simple material test in a standalone file.

```html
<script type="module">
  import * as THREE from 'three';
  const mat = new THREE.PointsMaterial({ 
      alphaTest: 0.001, 
      depthWrite: false,
      blending: THREE.AdditiveBlending 
  });
  console.log('alphaTest:', mat.alphaTest);
  console.log('depthWrite:', mat.depthWrite);
</script>
```

Stated directly (predicted output):
```text
alphaTest: 0.001
depthWrite: false
```

This proves that the material configuration securely stores these specialized blending flags, bypassing default solid-rendering behavior.

### Discard the throwaway
This snippet isolated the material flags. Delete it entirely; it has no place in our ongoing project.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-20.html` (modified)
- **Change type**: Configure / Refactor
- **Location**: Above the `PointsMaterial` declaration.
- **Dependencies**: `CanvasRenderingContext2D` via standard HTML DOM APIs.

### The New Code
```javascript
function makeParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
}
const mat = new THREE.PointsMaterial({
    size:            0.3,
    sizeAttenuation: true,
    map:             makeParticleTexture(),   // circular glow
    transparent:     true,
    alphaTest:       0.001,   // discard pixels with alpha < 0.001 (no square halos)
    depthWrite:      false,   // transparent particles don't occlude each other
    blending:        THREE.AdditiveBlending, // particles add color (glow effect)
    vertexColors:    false,
});
console.log('alphaTest:', mat.alphaTest);   // 0.001
console.log('depthWrite:', mat.depthWrite); // false
console.log('blending:', mat.blending);     // AdditiveBlending
```

### The Updated Project
```html
1:  // ← new logic replacing old material
2:  function makeParticleTexture() {
3:      const canvas = document.createElement('canvas');
4:      canvas.width = canvas.height = 64;
5:      const ctx = canvas.getContext('2d');
6:      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
7:      g.addColorStop(0, 'rgba(255,255,255,1)');
8:      g.addColorStop(1, 'rgba(255,255,255,0)');
9:      ctx.fillStyle = g;
10:     ctx.fillRect(0, 0, 64, 64);
11:     return new THREE.CanvasTexture(canvas);
12: }
13: const mat = new THREE.PointsMaterial({
14:     size:            0.3,
15:     sizeAttenuation: true,
16:     map:             makeParticleTexture(),
17:     transparent:     true,
18:     alphaTest:       0.001,
19:     depthWrite:      false,
20:     blending:        THREE.AdditiveBlending,
21:     vertexColors:    false,
22: });
23: const particles = new THREE.Points(geo, mat);
24: // ← new logic ends
```
We have dynamically generated a procedural radial gradient using the 2D canvas API, injected it into a Three.js canvas texture, and configured the material to safely blend the transparent edges.

### Mechanical walkthrough
- `function makeParticleTexture()` encapsulates the texture generation process.
- `document.createElement('canvas')` generates an invisible, memory-only canvas element.
- `canvas.width = canvas.height = 64;` scales it to a standard texture dimension.
- `canvas.getContext('2d')` obtains the 2D rendering interface for that element.
- `ctx.createRadialGradient(32, 32, 0, 32, 32, 32)` sets up a circle fading from the center to the edge.
- `g.addColorStop(...)` defines the color at the center (solid white) and the edge (transparent white).
- `ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);` actually draws the gradient onto the canvas bounds.
- `new THREE.CanvasTexture(canvas)` wraps the drawn 2D element into a WebGL-compatible texture image.
- `map: makeParticleTexture()` assigns the generated texture to the particle face.
- `alphaTest: 0.001` instructs the shader to discard any pixel with an alpha below 0.001. This fixes the issue where invisible corners block particles drawn behind them.
- `depthWrite: false` prevents the particle from writing its depth to the WebGL depth buffer, ensuring transparent sorting artifacts do not occur.
- `blending: THREE.AdditiveBlending` instructs the GPU to add the RGB values of intersecting pixels together, naturally causing dense particle clusters to appear intensely bright.

### CS lens
Alpha testing and depth writing are fundamental WebGL/OpenGL concepts. Transparent objects are notoriously difficult to sort and render back-to-front. Disabling depth writes and enabling additive blending explicitly bypasses the z-sorting algorithm altogether, allowing the GPU to mindlessly spray pixels onto the frame buffer with simple arithmetic (Color = Source + Destination).

### SE lens
Using `document.createElement('canvas')` dynamically builds an asset at runtime rather than relying on external image files. This reduces HTTP requests and ensures the system remains self-contained, though it requires slightly more CPU cycles during application boot.

### Commands needed
Open `lesson-20.html` in a modern browser.

### Run it
When executed, the previously harsh white squares will transform into glowing, soft, overlapping white orbs. 

### One sentence connecting to previous unit
Now that our static particles look like soft orbs, we must set them in motion by continuously updating their underlying position buffers.

---

## Concept Unit: Animating particles — updating positions each frame

### The Problem
Our particles are perfectly stationary. Because they are baked into a single `BufferGeometry`, we cannot animate them by iterating over `particle.position.x += 1` like typical objects. How do we mutate batched geometry buffer data in real time?

### Introduce the concept in isolation
We will modify a tiny typed array and force WebGL to acknowledge the update.

```html
<script type="module">
  import * as THREE from 'three';
  const pos = new Float32Array([0, 0, 0]);
  const attr = new THREE.BufferAttribute(pos, 3);
  pos[0] += 1;
  attr.needsUpdate = true;
  console.log('Value:', attr.array[0], '| Update Flag:', attr.needsUpdate);
</script>
```

Stated directly (predicted output):
```text
Value: 1 | Update Flag: true
```

This proves that after we manually alter the `Float32Array`, we must set a specific boolean flag `needsUpdate` to `true` to signal the change to the internal WebGL state.

### Discard the throwaway
This small state-flag test is complete. Delete the isolated file.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-20.html` (modified)
- **Change type**: Refactor
- **Location**: In the core particle generation block and inside a new `animate` loop.
- **Dependencies**: `THREE.Clock` must be instantiated.

### The New Code
```javascript
const N = 2000;
const positions = new Float32Array(N * 3);
const velocities = new Float32Array(N * 3);  // per-particle velocity
for (let i = 0; i < N; i++) {
    positions[i*3  ] = (Math.random()-0.5)*10;
    positions[i*3+1] = (Math.random()-0.5)*10;
    positions[i*3+2] = (Math.random()-0.5)*10;
    velocities[i*3  ] = (Math.random()-0.5)*0.05;
    velocities[i*3+1] = (Math.random()-0.5)*0.05;
    velocities[i*3+2] = (Math.random()-0.5)*0.05;
}
const geo = new THREE.BufferGeometry();
const posAttr = new THREE.BufferAttribute(positions, 3);
geo.setAttribute('position', posAttr);
const particles = new THREE.Points(geo, mat);
scene.add(particles);

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    for (let i = 0; i < N; i++) {
        positions[i*3  ] += velocities[i*3  ];
        positions[i*3+1] += velocities[i*3+1];
        positions[i*3+2] += velocities[i*3+2];
    }
    posAttr.needsUpdate = true;  // re-upload to GPU
    renderer.render(scene, camera);
}
animate();
console.log('Particle animation: CPU updates Float32Array each frame');
```

### The Updated Project
```html
1:  // ← new logic replacing particle initialization and creating loop
2:  const N = 2000;
3:  const positions = new Float32Array(N * 3);
4:  const velocities = new Float32Array(N * 3); 
5:  for (let i = 0; i < N; i++) {
6:      positions[i*3  ] = (Math.random()-0.5)*10;
7:      positions[i*3+1] = (Math.random()-0.5)*10;
8:      positions[i*3+2] = (Math.random()-0.5)*10;
9:      velocities[i*3  ] = (Math.random()-0.5)*0.05;
10:     velocities[i*3+1] = (Math.random()-0.5)*0.05;
11:     velocities[i*3+2] = (Math.random()-0.5)*0.05;
12: }
13: const geo = new THREE.BufferGeometry();
14: const posAttr = new THREE.BufferAttribute(positions, 3);
15: geo.setAttribute('position', posAttr);
16: const particles = new THREE.Points(geo, mat);
17: scene.add(particles);
18: const clock = new THREE.Clock();
19: function animate() {
20:     requestAnimationFrame(animate);
21:     const delta = clock.getDelta();
22:     for (let i = 0; i < N; i++) {
23:         positions[i*3  ] += velocities[i*3  ];
24:         positions[i*3+1] += velocities[i*3+1];
25:         positions[i*3+2] += velocities[i*3+2];
26:     }
27:     posAttr.needsUpdate = true;
28:     renderer.render(scene, camera);
29: }
30: animate();
31: // ← new logic ends
```
We now maintain a secondary array representing the velocity of each particle, update the positions inside the render loop every frame, and flip the `needsUpdate` switch so Three.js transfers the new binary data to the graphics card.

### Mechanical walkthrough
- `const velocities = new Float32Array(N * 3);` allocates a matching array to hold the movement speeds on the X, Y, and Z axes.
- `velocities[i*3] = ...` assigns a tiny random drift value per axis.
- `const posAttr = new THREE.BufferAttribute(positions, 3);` stores a direct reference to the position attribute so we can flag it later.
- `const clock = new THREE.Clock();` initializes a timing utility to measure frame durations.
- `function animate() { ... }` begins our standard recursive rendering loop.
- `requestAnimationFrame(animate);` schedules the next frame.
- `for (let i = 0; i < N; i++)` iterates over every particle precisely once per frame.
- `positions[i*3 ] += velocities[i*3 ];` adds the stored velocity directly onto the physical coordinate, advancing its position in space.
- `posAttr.needsUpdate = true;` marks the attribute as dirty. Three.js will catch this flag and invoke `gl.bufferSubData()` internally to overwrite the GPU's copy of the array.
- `renderer.render(scene, camera);` physically draws the updated state.

### CS lens
Every frame, we are executing 2000 loops in pure JavaScript and performing basic addition, then transmitting 24,000 bytes (2000 * 3 * 4 bytes per float) across the PCIe bus from system RAM to VRAM. WebGL is highly optimized to handle `bufferSubData` for these sizes effortlessly, ensuring 60 frames per second.

### SE lens
Notice that we never instantiate new arrays or objects inside the `animate` loop. We alter the numbers *in place*. If we allocated new memory on every frame, the JavaScript garbage collector would frequently pause execution to clean up, causing stutter.

### Commands needed
Open `lesson-20.html` in a modern browser.

### Run it
When executed, the particles will slowly and fluidly drift outward in all directions.

### One sentence connecting to previous unit
Continuous random drifting is visually uninteresting, so we need to structure these arrays into an emitter pattern where particles are born, move with purpose, and recycle when they die.

---

## Concept Unit: Emitter pattern

### The Problem
Particles currently drift forever into the void. A true particle effect (like a fountain or explosion) continuously emits particles from an origin, lets them move for a set lifetime, and then removes them. How do we build a robust system of "birth and death" without actually creating and destroying objects in memory?

### Introduce the concept in isolation
We will construct a small lifecycle simulator that "recycles" state when a lifespan hits zero.

```html
<script type="module">
  const maxLife = 1.0;
  let life = 1.0;
  let pos = 0;
  // Simulating frame execution
  life -= 0.6;
  if (life <= 0) { pos = 0; life = maxLife; } else { pos += 1; }
  console.log('Frame 1 - Life:', life.toFixed(1), 'Pos:', pos);
  
  life -= 0.6;
  if (life <= 0) { pos = 0; life = maxLife; } else { pos += 1; }
  console.log('Frame 2 - Life:', life.toFixed(1), 'Pos:', pos);
</script>
```

Stated directly (predicted output):
```text
Frame 1 - Life: 0.4 Pos: 1
Frame 2 - Life: 1.0 Pos: 0
```

This proves the **Object Pool pattern**: instead of deleting the variable, we catch its "death" threshold and simply reset its properties back to their initial state, creating the illusion of a new entity.

### Discard the throwaway
The basic arithmetic lifecycle is proven. Delete the throwaway file.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-20.html` (modified)
- **Change type**: Refactor
- **Location**: The particle initialization block and the `animate` loop logic.
- **Dependencies**: None additional.

### The New Code
```javascript
const N = 500;
const positions  = new Float32Array(N * 3);
const velocities = new Float32Array(N * 3);
const lifetimes  = new Float32Array(N);      // remaining lifetime per particle
const maxLife    = new Float32Array(N);      // max lifetime per particle
const opacities  = new Float32Array(N);      // per-particle opacity

function resetParticle(i) {
    positions[i*3  ] = 0; positions[i*3+1] = 0; positions[i*3+2] = 0;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.05 + Math.random() * 0.1;
    velocities[i*3  ] = Math.cos(angle) * speed;
    velocities[i*3+1] = 0.1 + Math.random() * 0.1;  // upward
    velocities[i*3+2] = Math.sin(angle) * speed;
    lifetimes[i] = maxLife[i] = 1 + Math.random() * 2;  // 1-3 seconds
}
for (let i = 0; i < N; i++) resetParticle(i);

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    for (let i = 0; i < N; i++) {
        lifetimes[i] -= delta;
        if (lifetimes[i] <= 0) { resetParticle(i); continue; }  // recycle
        positions[i*3  ] += velocities[i*3  ];
        positions[i*3+1] += velocities[i*3+1];
        positions[i*3+2] += velocities[i*3+2];
        velocities[i*3+1] -= 0.002;  // gravity
    }
    posAttr.needsUpdate = true;
    renderer.render(scene, camera);
}
console.log('Emitter: particles recycle on death, no allocation in loop');
```

### The Updated Project
```html
1:  // ← new logic replacing previous animate/setup logic
2:  const N = 500;
3:  const positions  = new Float32Array(N * 3);
4:  const velocities = new Float32Array(N * 3);
5:  const lifetimes  = new Float32Array(N);      
6:  const maxLife    = new Float32Array(N);      
7:  const opacities  = new Float32Array(N);      
8:  
9:  function resetParticle(i) {
10:     positions[i*3  ] = 0; positions[i*3+1] = 0; positions[i*3+2] = 0;
11:     const angle = Math.random() * Math.PI * 2;
12:     const speed = 0.05 + Math.random() * 0.1;
13:     velocities[i*3  ] = Math.cos(angle) * speed;
14:     velocities[i*3+1] = 0.1 + Math.random() * 0.1;
15:     velocities[i*3+2] = Math.sin(angle) * speed;
16:     lifetimes[i] = maxLife[i] = 1 + Math.random() * 2;
17: }
18: for (let i = 0; i < N; i++) resetParticle(i);
19: 
20: const geo = new THREE.BufferGeometry();
21: const posAttr = new THREE.BufferAttribute(positions, 3);
22: geo.setAttribute('position', posAttr);
23: const particles = new THREE.Points(geo, mat);
24: scene.add(particles);
25: 
26: const clock = new THREE.Clock();
27: function animate() {
28:     requestAnimationFrame(animate);
29:     const delta = clock.getDelta();
30:     for (let i = 0; i < N; i++) {
31:         lifetimes[i] -= delta;
32:         if (lifetimes[i] <= 0) { resetParticle(i); continue; } 
33:         positions[i*3  ] += velocities[i*3  ];
34:         positions[i*3+1] += velocities[i*3+1];
35:         positions[i*3+2] += velocities[i*3+2];
36:         velocities[i*3+1] -= 0.002;
37:     }
38:     posAttr.needsUpdate = true;
39:     renderer.render(scene, camera);
40: }
41: animate();
42: // ← new logic ends
```
Instead of spawning once and drifting endlessly, our particles now respawn from the center `(0,0,0)` when they run out of a predefined "lifespan", creating a continuously shooting fountain.

### Mechanical walkthrough
- `const lifetimes = new Float32Array(N);` allocates 1 float per particle tracking remaining life in seconds.
- `function resetParticle(i)` encapsulates the logic for birthing (or rebirthing) a particle at a specific index.
- `positions[i*3] = 0;` snaps the particle back to the absolute origin.
- `const angle = Math.random() * Math.PI * 2;` picks a random direction along a 360-degree radius for the spread.
- `velocities[i*3+1] = 0.1 + Math.random() * 0.1;` assigns a strong upward bias to the velocity, making the fountain shoot upwards.
- `lifetimes[i] = maxLife[i] = 1 + Math.random() * 2;` establishes a random total lifespan between 1 and 3 seconds.
- `for (let i = 0; i < N; i++) resetParticle(i);` initializes the fountain at boot.
- `lifetimes[i] -= delta;` subtracts the actual time elapsed since the last frame from the particle's countdown.
- `if (lifetimes[i] <= 0) { resetParticle(i); continue; }` detects death. If it dies, the particle state is immediately re-rolled and the loop skips the rest of the movement calculation for this frame.
- `velocities[i*3+1] -= 0.002;` subtracts a tiny constant from the vertical (Y) speed every frame, simulating the constant downward pull of gravity.

### CS lens
We simulate physical systems via numerical integration (specifically, forward Euler integration here). By constantly subtracting from velocity, we are applying acceleration. By resetting particles rather than deleting them, we avoid dynamically resizing arrays, keeping the memory block rigidly fixed.

### SE lens
This function illustrates Data-Oriented Design (DOD). Rather than iterating over a list of `Particle` objects, we iterate over several parallel arrays (positions, velocities, lifetimes). This guarantees that sequential loops hit sequential memory addresses, which is immensely favorable for CPU cache performance.

### Commands needed
Open `lesson-20.html` in a modern browser.

### Run it
When executed, you will observe a continuous fountain of particles shooting upwards from the center and arching downwards via gravity, over and over.

### One sentence connecting to previous unit
The fountain moves beautifully, but it is uniformly white; we can drastically enhance realism by assigning colors on a per-particle basis using a vertex color buffer.

---

## Concept Unit: Vertex colors

### The Problem
If we modify `mat.color.setHex(...)`, it will change the color of all 500 particles simultaneously, because they share a single material. How do we apply a unique, individual color to a single particle inside a shared buffer geometry?

### Introduce the concept in isolation
We will construct a standalone buffer holding multiple RGB values to verify the layout.

```html
<script type="module">
  import * as THREE from 'three';
  const colors = new Float32Array([1, 0, 0,  0, 1, 0]); // red, green
  const attr = new THREE.BufferAttribute(colors, 3);
  console.log('Count:', attr.count, '| Items size:', attr.itemSize);
</script>
```

Stated directly (predicted output):
```text
Count: 2 | Items size: 3
```

This proves that vertex colors work exactly like positions: a single flat `Float32Array` storing 3 elements (R, G, B) per entity. 

### Discard the throwaway
The structural proof is established. Delete the throwaway file.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-20.html` (modified)
- **Change type**: Add / Configure
- **Location**: In the initial particle buffer setup and the `PointsMaterial` configuration block.
- **Dependencies**: None.

### The New Code
```javascript
const N = 1000;
const positions = new Float32Array(N * 3);
const colors    = new Float32Array(N * 3);  // r,g,b per particle

for (let i = 0; i < N; i++) {
    positions[i*3  ] = (Math.random()-0.5)*10;
    positions[i*3+1] = (Math.random()-0.5)*10;
    positions[i*3+2] = (Math.random()-0.5)*10;
    
    // Color based on Y position: bottom=blue, top=red
    const t = (positions[i*3+1] + 5) / 10;  // 0 at y=-5, 1 at y=5
    colors[i*3  ] = t;        // R: 0->1 (bottom to top)
    colors[i*3+1] = 0.2;      // G: constant
    colors[i*3+2] = 1 - t;    // B: 1->0
}

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));

const mat = new THREE.PointsMaterial({
    vertexColors: true,  // use 'color' attribute instead of mat.color
    size: 0.1,
    sizeAttenuation: true,
});
const particles = new THREE.Points(geo, mat);
console.log('vertexColors:', mat.vertexColors);  // true
```

### The Updated Project
```html
1:  // ← new logic replacing initial geometry and material blocks
2:  const N = 1000;
3:  const positions = new Float32Array(N * 3);
4:  const colors    = new Float32Array(N * 3);
5:  
6:  for (let i = 0; i < N; i++) {
7:      positions[i*3  ] = (Math.random()-0.5)*10;
8:      positions[i*3+1] = (Math.random()-0.5)*10;
9:      positions[i*3+2] = (Math.random()-0.5)*10;
10:     
11:     const t = (positions[i*3+1] + 5) / 10;
12:     colors[i*3  ] = t;        
13:     colors[i*3+1] = 0.2;      
14:     colors[i*3+2] = 1 - t;   
15: }
16: 
17: const geo = new THREE.BufferGeometry();
18: geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
19: geo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
20: 
21: const mat = new THREE.PointsMaterial({
22:     vertexColors: true,
23:     size: 0.1,
24:     sizeAttenuation: true,
25: });
26: const particles = new THREE.Points(geo, mat);
27: scene.add(particles);
28: // ← new logic ends
```
The application now intercepts the generation loop to calculate a distinct red-to-blue gradient based on vertical height, embeds it into a new buffer, and flips the `vertexColors` flag on the material so the shader knows to consume it.

### Mechanical walkthrough
- `const colors = new Float32Array(N * 3);` creates a new buffer for holding RGB values (0.0 to 1.0).
- `const t = (positions[i*3+1] + 5) / 10;` derives a normalized float (`t`) from `0.0` to `1.0` by taking the Y-coordinate (which ranges roughly -5 to 5), shifting it up by 5, and dividing by the total span (10).
- `colors[i*3 ] = t;` assigns the red channel. If the particle is near the top (t=1), it gets full red.
- `colors[i*3+2] = 1 - t;` assigns the blue channel. If the particle is near the bottom (t=0), it gets full blue.
- `geo.setAttribute('color', ...)` binds the RGB buffer to the internal shader keyword `color`.
- `vertexColors: true` is an explicit override on `THREE.PointsMaterial`. It tells the GPU shader to completely ignore the material's default solid color property and instead read the individual pixel color out of the vertex attributes array.

### CS lens
Passing data to the GPU via vertex attributes is the foundation of the programmable pipeline. In a standard triangle mesh, vertex colors are mathematically interpolated across the surface of the triangle by the rasterizer. For `THREE.Points`, there is no triangle surface — each vertex corresponds to one point sprite, so interpolation is entirely bypassed.

### SE lens
This creates a hard coupling between the position initialization and the visual styling logic. In production architectures, "position" and "color" updates are often separated into distinct passes or completely delegated to a GPU Compute Shader, avoiding CPU processing logic entirely.

### Commands needed
Open `lesson-20.html` in a modern browser.

### Run it
When executed, the rendered particles will form a stunning gradient cloud: deeply blue at the bottom, shifting to purple in the middle, and ending in bright red at the top.

### One sentence connecting to previous unit
Not applicable — this is the final unit of the lesson.

---

## Closing
You successfully transitioned from rendering singular objects to orchestrating thousands of independent elements in a unified particle system. 

### Connect the pieces
The architecture of a particle system in Three.js requires shifting logic out of individual JavaScript objects and into monolithic typed arrays. By allocating a single `Float32Array` of 15000 slots and updating positions sequentially in a loop, you avoided garbage collection overhead and enabled the GPU to process 5000 particles in a single, hyper-efficient draw call. Assigning a material with `AdditiveBlending`, `depthWrite: false`, and `vertexColors: true` empowered the WebGL shader to correctly merge transparent glows and dynamically color each vertex, establishing a solid foundation for advanced visual effects.
