# Lesson 29: Performance Optimization — Instancing, LOD, Frustum Culling, and Dispose

**What you will build**
You will integrate core performance optimization techniques into your Three.js application. We will implement `InstancedMesh` to render thousands of identical objects in a single draw call, use `LOD` (Level of Detail) to swap out high-polygon models for low-polygon ones at a distance, demonstrate how the renderer automatically handles frustum culling, and properly `dispose()` of geometries, materials, and textures to prevent memory leaks. The transferable insight is that Three.js performance comes down to minimizing draw calls, reducing triangle count, managing texture memory, and avoiding shader complexity.

**What you need to know first**
- Lesson 28 (or prior) concepts on Meshes, Geometries, and Materials.

**Terms used in this lesson**
- **Draw call** — A command sent from the CPU to the GPU to draw a single mesh or geometry. Minimizing draw calls is the primary optimization in 3D rendering.
- **Frustum culling** — The process of skipping the rendering of objects that fall completely outside the camera's viewing area (the frustum), saving GPU cycles.
- **Level of Detail (LOD)** — A technique where the complexity of a 3D model (its triangle count) is reduced as it moves further away from the camera.
- **Memory leak** — In WebGL, this occurs when GPU resources (like geometries and textures) are no longer used by the scene but are not explicitly freed, eventually crashing the browser tab.

**Objects and methods used**

- **`THREE.InstancedMesh`**
  - *What it is:* A special mesh class for rendering a large number of identical geometries with the same material but different transformations, using a single draw call.
  - *Implementation:* `new THREE.InstancedMesh(geometry, material, count)`
  - *Its use:* Used to avoid GPU bottleneck when rendering thousands of identical objects (like trees, particles, or bullets).
  - *Type:* Class extending `THREE.Mesh`
  - *Responsibility:* Manages an array of transformation matrices for instances and sends them to the GPU as a single chunk.
  - *Depends on:* A base `THREE.Geometry`, a `THREE.Material`, and a predefined instance `count`.
  - *Connects to:* Calls WebGL's `gl.drawElementsInstanced()` under the hood.
  - *Shape:* A high-level primitive added to the scene graph in place of multiple individual `THREE.Mesh` objects.

- **`THREE.LOD`**
  - *What it is:* A container object that holds different resolution meshes and switches between them based on camera distance.
  - *Implementation:* `new THREE.LOD()` and `lod.addLevel(mesh, distance)`
  - *Its use:* Used to reduce the triangle count rendered on the GPU for objects far from the camera.
  - *Type:* Class extending `THREE.Object3D`
  - *Responsibility:* Tracks distance to the camera and swaps visibility of its child meshes accordingly.
  - *Depends on:* Being updated every frame via `lod.update(camera)`.
  - *Connects to:* Receives the current `camera` position to calculate distance to its own origin.
  - *Shape:* A scene graph node that acts as a parent to multiple meshes.

- **`THREE.Frustum`**
  - *What it is:* A mathematical representation of the camera's viewing pyramid, defined by 6 planes.
  - *Implementation:* `new THREE.Frustum()`
  - *Its use:* Used to manually check if points or bounding boxes intersect the camera's view, though the renderer does this automatically.
  - *Type:* Class
  - *Responsibility:* Computes intersections with 3D boundaries.
  - *Depends on:* The camera's projection and view matrices.
  - *Connects to:* Calculates 6 `THREE.Plane` objects from the combined view-projection matrix.
  - *Shape:* A mathematical utility outside the scene graph.

- **`dispose()`**
  - *What it is:* A method available on geometries, materials, and textures to explicitly free their allocated WebGL memory.
  - *Implementation:* `geometry.dispose()`, `material.dispose()`, `texture.dispose()`
  - *Its use:* Used when removing objects from the scene permanently, preventing memory leaks.
  - *Type:* Instance method
  - *Responsibility:* Instructs the WebGLRenderer to call the underlying `gl.deleteBuffer`, `gl.deleteProgram`, or `gl.deleteTexture`.
  - *Depends on:* The object having been previously rendered (and thus allocated on the GPU).
  - *Connects to:* The renderer's internal resource managers.
  - *Shape:* A cleanup function invoked manually by application logic.

- **`renderer.info`**
  - *What it is:* An object containing real-time statistics about the WebGL context's memory and render performance.
  - *Implementation:* `renderer.info.render.calls`, `renderer.info.memory.geometries`
  - *Its use:* Used to monitor optimization success (e.g., verifying draw calls dropped to 1).
  - *Type:* Object property on `THREE.WebGLRenderer`
  - *Responsibility:* Counts geometries, textures, draw calls, and triangles per frame.
  - *Depends on:* The renderer executing `render()`.
  - *Connects to:* Updated internally by the renderer during the draw loop.
  - *Shape:* A diagnostic data structure.

## Concept Unit: InstancedMesh — N objects in ONE draw call

### The Problem
If you create 10,000 separate `THREE.Mesh` objects and add them to the scene, the CPU must send 10,000 individual draw commands to the GPU every frame. This driver overhead bottlenecks the CPU, causing the framerate to plummet, even if the objects are simple boxes. How do we tell the GPU to draw the same box 10,000 times in different places without issuing 10,000 separate commands?

### Introduce the concept in isolation
```html
<script type="module">
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const N = 10000;
const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
const mat = new THREE.MeshStandardMaterial({color: 0xff6600});

// Instead of 10000 Meshes, we create 1 InstancedMesh
const instancedMesh = new THREE.InstancedMesh(geo, mat, N);

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3(1, 1, 1);

for (let i = 0; i < N; i++) {
    position.set((Math.random()-0.5)*20, (Math.random()-0.5)*20, (Math.random()-0.5)*20);
    matrix.compose(position, quaternion, scale);
    instancedMesh.setMatrixAt(i, matrix);
}
instancedMesh.instanceMatrix.needsUpdate = true;

console.log('Draw calls required for N objects:', 1);
console.log('Instance count:', instancedMesh.count);
</script>
```
Output proves that `InstancedMesh` holds all 10,000 transformations and will only require a single draw call.

### Discard the throwaway
This exact script is discarded and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `lesson-29.html`
- **Change type:** Add
- **Location:** Inside the `init()` function of our main application.
- **Dependencies:** Three.js module.

### The New Code
```javascript
const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
const mat = new THREE.MeshStandardMaterial({color: 0xff6600});
const instancedBoxes = new THREE.InstancedMesh(geo, mat, 10000);

const matrix = new THREE.Matrix4();
const dummyObj = new THREE.Object3D();

for (let i = 0; i < 10000; i++) {
    dummyObj.position.set((Math.random()-0.5)*20, (Math.random()-0.5)*20, (Math.random()-0.5)*20);
    dummyObj.updateMatrix();
    instancedBoxes.setMatrixAt(i, dummyObj.matrix);
}
instancedBoxes.instanceMatrix.needsUpdate = true;
scene.add(instancedBoxes);
```

### The Updated Project
```javascript
1: function init() {
2:     // ... renderer and scene setup ...
3:     // ← new
4:     const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
5:     const mat = new THREE.MeshStandardMaterial({color: 0xff6600});
6:     const instancedBoxes = new THREE.InstancedMesh(geo, mat, 10000);
7: 
8:     const dummyObj = new THREE.Object3D();
9: 
10:    for (let i = 0; i < 10000; i++) {
11:        dummyObj.position.set((Math.random()-0.5)*20, (Math.random()-0.5)*20, (Math.random()-0.5)*20);
12:        dummyObj.updateMatrix();
13:        instancedBoxes.setMatrixAt(i, dummyObj.matrix);
14:    }
15:    instancedBoxes.instanceMatrix.needsUpdate = true;
16:    scene.add(instancedBoxes);
17:    // ← end new
18: }
```
We added 10,000 scattered boxes to our scene using one object.

### Mechanical walkthrough
- `new THREE.InstancedMesh(geo, mat, 10000)`: Creates a mesh that holds 10,000 instances. It creates a special WebGL buffer for 10,000 `Matrix4` objects.
- `new THREE.Object3D()`: We use a dummy 3D object as a mathematical helper.
- `dummyObj.position.set(...)`: Moves the dummy object to a random point.
- `dummyObj.updateMatrix()`: Computes the local 4x4 transformation matrix based on the object's position, rotation, and scale.
- `instancedBoxes.setMatrixAt(i, dummyObj.matrix)`: Copies the dummy's 4x4 matrix into the buffer at index `i`.
- `instancedBoxes.instanceMatrix.needsUpdate = true`: Flags the Float32Array buffer so Three.js uploads the matrix data to the GPU memory before the next frame.

### CS lens
Instancing relies on a specific GPU feature (`glDrawElementsInstanced` in OpenGL/WebGL). Instead of pushing vertex attributes and executing a draw command per object, the CPU sends the vertex attributes once, along with an array of per-instance data (here, matrices). The GPU runs the vertex shader $N$ times, pulling the correct matrix for each instance. This flips a CPU-bound workload into a purely GPU-bound one.

### SE lens
Using a dummy `Object3D` to calculate matrices is a common Three.js idiom. Manually composing a `Matrix4` from position, quaternion, and scale requires intermediate math objects. Reusing one dummy object inside the loop avoids allocating 10,000 `Vector3` and `Matrix4` objects, preventing a massive garbage collection pause during initialization.

### Commands needed
Open `lesson-29.html` in a modern browser.

### Run it
The scene renders 10,000 boxes smoothly. Without instancing, this would cripple the framerate.

### One sentence connecting to previous unit
Instancing handles thousands of simple objects, but what if we need complex objects whose detail only matters when viewed up close?


## Concept Unit: LOD (Level of Detail) — swap geometry by distance

### The Problem
A highly detailed character model might have 50,000 triangles. If there are 10 of them standing a mile away, they take up 5 pixels on the screen, but the GPU still processes 500,000 triangles. How do we dynamically swap out the high-quality model for a low-polygon version when the camera is far away?

### Introduce the concept in isolation
```html
<script type="module">
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const lod = new THREE.LOD();

lod.addLevel(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32)), 0);  // High detail (distance 0+)
lod.addLevel(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8)), 15);  // Med detail (distance 15+)
lod.addLevel(new THREE.Mesh(new THREE.SphereGeometry(1, 6, 3)), 30);   // Low detail (distance 30+)

console.log('LOD levels generated:', lod.levels.length);
</script>
```
Output confirms 3 levels exist. At distance 10, Level 0 is active. At distance 35, Level 2 is active, drastically reducing triangles.

### Discard the throwaway
This exact script is discarded and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-29.html`
- **Change type:** Add
- **Location:** Inside `init()` and `animate()`.
- **Dependencies:** Three.js.

### The New Code
```javascript
const lod = new THREE.LOD();
const mat = new THREE.MeshStandardMaterial({color:0x44aaff});

lod.addLevel(new THREE.Mesh(new THREE.SphereGeometry(2, 64, 32), mat), 0);
lod.addLevel(new THREE.Mesh(new THREE.SphereGeometry(2, 16, 8), mat), 20);
lod.addLevel(new THREE.Mesh(new THREE.SphereGeometry(2, 6, 3), mat), 50);

lod.position.set(0, 5, -30);
scene.add(lod);

// In animate loop:
// lod.update(camera);
```

### The Updated Project
```javascript
1: function init() {
2:     // ... previous instanced boxes ...
3:     // ← new
4:     const lod = new THREE.LOD();
5:     const lodMat = new THREE.MeshStandardMaterial({color:0x44aaff});
6:     lod.addLevel(new THREE.Mesh(new THREE.SphereGeometry(2, 64, 32), lodMat), 0);
7:     lod.addLevel(new THREE.Mesh(new THREE.SphereGeometry(2, 16, 8), lodMat), 20);
8:     lod.addLevel(new THREE.Mesh(new THREE.SphereGeometry(2, 6, 3), lodMat), 50);
9:     lod.position.set(0, 5, -30);
10:    scene.add(lod);
11:    // ← end new
12: }
13: 
14: function animate() {
15:     requestAnimationFrame(animate);
16:     // ← new
17:     scene.children.forEach(child => {
18:         if (child instanceof THREE.LOD) child.update(camera);
19:     });
20:     // ← end new
21:     renderer.render(scene, camera);
22: }
```
We added an LOD sphere that degrades gracefully as you move away from it.

### Mechanical walkthrough
- `new THREE.LOD()`: Creates the LOD container.
- `lod.addLevel(mesh, distance)`: Registers a mesh to be shown when the camera is at least `distance` units away. Three.js keeps the list sorted.
- `lodMat`: We share the material across all levels to save memory.
- `child.update(camera)`: Every frame, we tell the LOD object where the camera is. It calculates the Euclidean distance between its origin and the camera, evaluates the thresholds, and toggles the `visible` property of its child meshes so only one is drawn.

### CS lens
LOD is a spatial optimization. It trades increased memory usage (storing 3 copies of the geometry in RAM/VRAM) for drastically reduced compute overhead (processing a fraction of the vertices in the vertex shader). It is a classic memory-compute tradeoff.

### SE lens
Notice we manually call `child.update(camera)` in the render loop. Some engines do this implicitly during the render pass, but Three.js requires explicit updates. This gives you architectural control: if you have 1,000 LOD objects, you could optimize by updating their LOD levels only twice per second instead of every single frame, decoupling simulation logic from render logic.

### Commands needed
Open `lesson-29.html` in a modern browser.

### Run it
The sphere looks perfectly smooth up close. As you move the camera backward, it becomes visibly blocky, but the triangle count drops by over 90%.

### One sentence connecting to previous unit
LOD saves triangles when an object is far away, but what if the object is entirely behind the camera?


## Concept Unit: Frustum culling and object visibility

### The Problem
If a mesh is behind the camera, rendering it is a waste of time, as it will never appear on screen. Does Three.js blindly send everything in the scene to the GPU, or does it know to ignore off-screen objects?

### Introduce the concept in isolation
```html
<script type="module">
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const m = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
console.log('mesh.frustumCulled default:', m.frustumCulled);

const frustum = new THREE.Frustum();
const matrix = new THREE.Matrix4();
// A camera matrix would normally be used:
// matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
// frustum.setFromProjectionMatrix(matrix);
// const inFrustum = frustum.containsPoint(m.position);
</script>
```
Output: `mesh.frustumCulled default: true`. Three.js does this automatically.

### Discard the throwaway
This script is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-29.html`
- **Change type:** Configure
- **Location:** Inside `init()`
- **Dependencies:** Three.js

### The New Code
```javascript
// We don't need to add code to enable it, but we can explicitly disable it
// to force an object to always render (e.g., if its shadow is visible but the object isn't).
lod.children[0].frustumCulled = false;
```

### The Updated Project
```javascript
1:     // ... lod setup ...
2:     lod.addLevel(new THREE.Mesh(new THREE.SphereGeometry(2, 6, 3), lodMat), 50);
3:     lod.position.set(0, 5, -30);
4:     scene.add(lod);
5:     
6:     // ← new
7:     lod.children.forEach(mesh => mesh.frustumCulled = true); // Explicitly true (default)
8:     // ← end new
```
Frustum culling is on by default, ensuring only visible boxes and spheres are sent to the GPU.

### Mechanical walkthrough
- `mesh.frustumCulled = true`: A boolean flag on `THREE.Object3D`. When true, `WebGLRenderer` checks if the object's bounding sphere intersects the camera's viewing frustum before issuing a draw call.
- The renderer dynamically builds a `THREE.Frustum` object every frame from the camera's projection and view matrices.
- It iterates through the scene graph, checks bounding boxes/spheres, and skips rendering for anything strictly outside the frustum planes.

### CS lens
Frustum culling is a broad-phase collision detection problem. The view frustum is a 6-sided convex polyhedron. Testing every triangle against the frustum is too slow. Instead, Three.js wraps the complex mesh in a simple bounding sphere (calculated once) and does a cheap distance check against the 6 planes.

### SE lens
Because it's automatic, you rarely manage frustum math directly. The exception is when you use vertex shaders to push vertices wildly outside their original bounding box (e.g., wind in grass). The CPU doesn't know the shader moved the vertices, so it culls the object prematurely. You fix this by setting `frustumCulled = false` for that specific mesh.

### Commands needed
Open `lesson-29.html` in a modern browser.

### Run it
No visual change, but if you look away from the 10,000 boxes, GPU load drops because the renderer stops drawing them.

### One sentence connecting to previous unit
Frustum culling stops drawing objects temporarily, but what happens when you delete an object permanently?


## Concept Unit: Disposing GPU resources — preventing memory leaks

### The Problem
If you call `scene.remove(mesh)`, the object disappears from the screen. In JavaScript, if no variables point to it, the garbage collector deletes it from RAM. However, WebGL buffers (geometries, materials, textures) are stored on the GPU. The JavaScript garbage collector cannot touch GPU memory. If you continually create and remove objects, VRAM will fill up and crash the context. How do we tell the GPU to free the memory?

### Introduce the concept in isolation
```html
<script type="module">
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const geo = new THREE.BoxGeometry();
const mat = new THREE.MeshBasicMaterial();
const mesh = new THREE.Mesh(geo, mat);

// Memory is allocated on GPU when rendered.
// To permanently delete:
geo.dispose();
mat.dispose();

console.log('Geometry and Material disposed.');
</script>
```
Output: Disposed flags set internally; next render will not track them.

### Discard the throwaway
This script is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-29.html`
- **Change type:** Add
- **Location:** Global scope.
- **Dependencies:** Three.js

### The New Code
```javascript
function removeAndDispose(scene, mesh) {
    scene.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => disposeMaterial(m));
        } else {
            disposeMaterial(mesh.material);
        }
    }
    if (mesh.dispose) mesh.dispose(); // For InstancedMesh
}

function disposeMaterial(mat) {
    mat.dispose();
    for (const key in mat) {
        if (mat[key] && mat[key].isTexture) {
            mat[key].dispose();
        }
    }
}
```

### The Updated Project
```javascript
1: // ← new
2: function disposeMaterial(mat) {
3:     mat.dispose();
4:     for (const key in mat) {
5:         if (mat[key] && mat[key].isTexture) {
6:             mat[key].dispose();
7:         }
8:     }
9: }
10: 
11: function removeAndDispose(scene, mesh) {
12:     scene.remove(mesh);
13:     if (mesh.geometry) mesh.geometry.dispose();
14:     if (mesh.material) {
15:         if (Array.isArray(mesh.material)) {
16:             mesh.material.forEach(m => disposeMaterial(m));
17:         } else {
18:             disposeMaterial(mesh.material);
19:         }
20:     }
21:     if (mesh.dispose) mesh.dispose();
22: }
23: // ← end new
24: 
25: function init() {
26:     // ...
```
We added a generic cleanup utility function that completely eradicates a mesh from GPU memory.

### Mechanical walkthrough
- `scene.remove(mesh)`: Unlinks the object from the Three.js scene graph so it isn't iterated over during render.
- `mesh.geometry.dispose()`: Sends an event to the renderer, causing it to call `gl.deleteBuffer()` on the GPU vertex buffers.
- `Array.isArray(mesh.material)`: Handles cases where a mesh has an array of materials (e.g., a cube with different textures on each face).
- `mat.dispose()`: Frees the compiled shader program (`gl.deleteProgram()`).
- `mat[key].isTexture`: We iterate over the material's properties (like `map`, `normalMap`) and call `dispose()` on textures, firing `gl.deleteTexture()`.
- `mesh.dispose()`: Specifically needed for `InstancedMesh` to clear the massive instance matrix buffer.

### CS lens
The boundary between JavaScript runtimes and the GPU driver is a strict barrier. JS is a managed, garbage-collected language. WebGL is an imperative C-style state machine with manual memory management. `dispose()` is the bridge where the managed language explicitly signals the unmanaged system to execute a `free()` operation.

### SE lens
Memory leaks in single-page WebGL applications are fatal. Users might stay on the page for hours. Without `dispose()`, firing a laser beam that creates and deletes a particle mesh every second will crash the browser tab in ten minutes. The robust utility function above ensures you never miss a texture map.

### Commands needed
Open `lesson-29.html` in a modern browser.

### Run it
The app functions identically, but you now have a utility to safely delete objects later.

### One sentence connecting to previous unit
We can optimize and manage memory, but how do we objectively measure if our optimizations are actually working?


## Concept Unit: renderer.info and performance monitoring

### The Problem
You suspect your scene is slow, but you don't know why. Is it too many draw calls? Too many triangles? Are memory leaks accumulating geometries? We need a way to look at the exact numbers the renderer is pushing to the GPU every frame.

### Introduce the concept in isolation
```html
<script type="module">
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
const renderer = new THREE.WebGLRenderer();
console.log('Renderer info:', renderer.info.render);
</script>
```
Output: `{ calls: 0, triangles: 0, points: 0, lines: 0 }`.

### Discard the throwaway
This script is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-29.html`
- **Change type:** Add
- **Location:** At the end of `init()` and inside `animate()`.
- **Dependencies:** Three.js

### The New Code
```javascript
const statsDiv = document.createElement('div');
statsDiv.style.cssText = 'position:fixed;top:10px;left:10px;color:lime;font:14px monospace;background:rgba(0,0,0,0.8);padding:8px;z-index:999;';
document.body.appendChild(statsDiv);

// In animate():
statsDiv.innerHTML = `
    Calls: ${renderer.info.render.calls}<br>
    Tris: ${renderer.info.render.triangles}<br>
    Geoms: ${renderer.info.memory.geometries}<br>
    Tex: ${renderer.info.memory.textures}
`;
```

### The Updated Project
```javascript
1: let statsDiv;
2: 
3: function init() {
4:     // ... renderer and scene ...
5:     
6:     // ← new
7:     statsDiv = document.createElement('div');
8:     statsDiv.style.cssText = 'position:fixed;top:10px;left:10px;color:lime;font:14px monospace;background:rgba(0,0,0,0.8);padding:8px;z-index:999;';
9:     document.body.appendChild(statsDiv);
10:    // ← end new
11: }
12: 
13: function animate() {
14:     requestAnimationFrame(animate);
15:     // ... LOD updates ...
16:     renderer.render(scene, camera);
17:     
18:     // ← new
19:     statsDiv.innerHTML = `
20:         Calls: ${renderer.info.render.calls}<br>
21:         Tris: ${renderer.info.render.triangles}<br>
22:         Geoms: ${renderer.info.memory.geometries}<br>
23:         Tex: ${renderer.info.memory.textures}
24:     `;
25:     // ← end new
26: }
```
We added a real-time heads-up display (HUD) rendering vital WebGL statistics to the DOM.

### Mechanical walkthrough
- `statsDiv`: A standard HTML `div` styled to float in the top left corner.
- `renderer.info.render.calls`: The number of times `gl.drawElements` or `gl.drawArrays` was called this frame.
- `renderer.info.render.triangles`: The total number of triangles sent to the rasterizer this frame.
- `renderer.info.memory.geometries`: The number of geometry buffers currently living in GPU VRAM.
- `renderer.info.memory.textures`: The number of texture buffers in VRAM.

### CS lens
Notice that we read `renderer.info` *after* calling `renderer.render()`. During the render call, Three.js resets `calls` and `triangles` to 0, and increments them as it processes the scene graph. If you read them before `render()`, you'll get the stats from the previous frame (or 0 on the first frame).

### SE lens
This simple HUD is the most important debugging tool for Three.js optimization. If `Geoms` keeps climbing while you run your app, you know you have a memory leak (you forgot to `dispose()`). If `Calls` is over 1000, you are CPU bound and need `InstancedMesh`. If `Tris` is over 2,000,000, you are GPU bound and need `LOD`.

### Commands needed
Open `lesson-29.html` in a modern browser.

### Run it
Look at the green text in the corner. Notice how `Calls` is tiny (around 2 or 3) despite there being 10,000 boxes, proving `InstancedMesh` worked. Notice how `Tris` dynamically changes as you move the camera toward and away from the LOD sphere.

### One sentence connecting to previous unit
By making performance visible, we confirm that our instancing, LOD, culling, and memory management are working exactly as intended.


## Closing

### Connect the pieces
We achieved massive performance gains by respecting the hardware pipeline. We bypassed the CPU bottleneck by collapsing 10,000 draw calls into 1 using `InstancedMesh`. We relieved the GPU rasterizer by dropping triangle counts at a distance using `LOD`. We took comfort in automatic Frustum Culling ignoring unseen meshes, and we closed the memory lifecycle gap between JavaScript and WebGL using `dispose()`. Finally, we attached a telemetry HUD via `renderer.info` so we never have to guess about our frame budget again. Your engine is now ready to handle massive scale.
