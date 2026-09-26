# Lesson 33: Memory Management — dispose(), Texture Atlases, and GPU Profiling

What you will build
In this lesson, you will build a memory-efficient scene manager that dynamically loads and unloads 3D objects, geometries, and materials without leaking GPU memory (VRAM). The underlying transferable problem is understanding that JavaScript garbage collection only cleans up CPU-side memory; GPU-side memory requires explicit management and deallocation in WebGL/Three.js.

What you need to know first
- Lesson 32: Lighting and Shadows
- Scene graph fundamentals and object creation.

Terms used in this lesson
- **VRAM** — Video RAM, the memory used by the GPU. It exists because the GPU needs extremely fast access to texture and geometry data to render frames at 60 FPS, separate from the CPU's system RAM.
- **Garbage Collection (GC)** — The JavaScript engine's automatic process of freeing CPU memory for objects that are no longer referenced. It exists to prevent memory leaks in normal application state, but it is entirely unaware of the GPU memory those objects might hold a reference to.
- **Draw Call** — A single instruction sent from the CPU to the GPU to draw a specific batch of geometry with a specific material. It exists because the GPU must be configured for each unique material/geometry pair, which is a slow CPU-bound operation if done too many times per frame.
- **Mipmaps** — Pre-calculated, optimized sequences of textures, each of which is a progressively lower resolution representation of the same image. They exist to increase rendering speed and reduce aliasing artifacts when viewing textures at a distance.
- **Instancing** — A rendering technique that draws the same geometry multiple times with a single draw call. It exists to drastically reduce CPU overhead when rendering thousands of identical objects with different transforms.

Objects and methods used
- **`dispose()`**
  - *What it is:* A method on Three.js geometry, material, and texture objects that explicitly frees the associated WebGL resources.
  - *Implementation:* `mesh.geometry.dispose(); mesh.material.dispose();`
  - *Its use:* Called before removing and forgetting an object, ensuring the GPU memory (VRAM) is released, since JavaScript garbage collection cannot reach the GPU.
  - *Type:* Instance method.
  - *Responsibility:* Triggers the underlying WebGL `deleteBuffer`, `deleteProgram`, or `deleteTexture` calls to free GPU memory.
  - *Depends on:* The Three.js object must be instantiated and have its resources already uploaded to the GPU.
  - *Connects to:* Called by the developer; calls WebGL deallocation APIs internally.
  - *Shape:* A manual memory management boundary between JavaScript application code and the WebGL renderer.
- **`Map`**
  - *What it is:* A built-in JavaScript object that holds key-value pairs and remembers the original insertion order of the keys.
  - *Implementation:* `new Map()`
  - *Its use:* Used here as a texture cache to store loaded textures by URL, ensuring the same image is not uploaded to the GPU multiple times.
  - *Type:* Standard built-in object class.
  - *Responsibility:* Provides O(1) lookup, insertion, and deletion of cached resources based on a unique identifier (URL).
  - *Depends on:* Unique keys (strings) and the objects (textures) to store.
  - *Connects to:* Accessed by the texture loading function to check for existing textures before initiating a new network request.
  - *Shape:* An internal application state structure managing resource references.
- **`TextureLoader.loadAsync()`**
  - *What it is:* A method to load an image over the network and return a Three.js Texture object via a Promise.
  - *Implementation:* `await new THREE.TextureLoader().loadAsync(url);`
  - *Its use:* Fetches textures for use in materials.
  - *Type:* Asynchronous instance method.
  - *Responsibility:* Handles the network request, decodes the image, and creates the texture object that will later be uploaded to the GPU.
  - *Depends on:* A valid image URL.
  - *Connects to:* Called by our resource manager; returns a Promise resolving to a Texture.
  - *Shape:* An I/O boundary fetching external assets.
- **`Vector2`**
  - *What it is:* A class representing a 2D vector, used for texture UV coordinates.
  - *Implementation:* `new THREE.Vector2(x, y)`
  - *Its use:* Sets the offset and repeat properties of a texture to select a specific sub-region (tile) of a texture atlas.
  - *Type:* Class constructor.
  - *Responsibility:* Stores X and Y values and provides mathematical operations.
  - *Depends on:* X and Y numerical values.
  - *Connects to:* Assigned to `material.map.offset` and `material.map.repeat`.
  - *Shape:* A fundamental data structure passing coordinates to the WebGL shader.
- **`renderer.info`**
  - *What it is:* A property of the WebGLRenderer that holds diagnostic and performance information.
  - *Implementation:* `renderer.info.memory.geometries`, `renderer.info.render.calls`
  - *Its use:* Read every frame to display live VRAM usage and draw call metrics, proving that our memory management is working.
  - *Type:* JavaScript Object property.
  - *Responsibility:* Accumulates and exposes internal renderer state counters (draw calls, triangles, geometry/texture counts).
  - *Depends on:* The renderer actively rendering a scene to update the counts.
  - *Connects to:* Read by our custom performance panel.
  - *Shape:* An inspection API exposing the renderer's internal state.

## Concept Unit: The GPU memory leak pattern

### The Problem
When replacing objects in a 3D scene (for example, navigating between levels), removing the mesh from the scene and letting it fall out of scope frees the JavaScript object wrapper. But the geometry and material data was uploaded to the GPU. How does the GPU know you are done with that data? What happens to the VRAM?
What would you try first to clean up an object? What happens if you skip it?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

// WRONG: creating new geometries/textures without disposal
let mesh = null;

function loadNewScene() {
    if (mesh) scene.remove(mesh);  // removes from scene, but NOT from GPU!
    // LEAK: old geometry still in VRAM:
    mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1,1,1),  // uploads to GPU
        new THREE.MeshStandardMaterial({color: Math.random()*0xffffff})
    );
    scene.add(mesh);
}

// CORRECT: dispose before replacing
function loadNewSceneCorrect() {
    if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();   // frees GPU vertex buffer
        mesh.material.dispose();   // frees GPU shader program
    }
    mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1),
        new THREE.MeshStandardMaterial({color: Math.random()*0xffffff}));
    scene.add(mesh);
}

console.log('renderer.info.memory.geometries before:', renderer.info.memory.geometries);
loadNewSceneCorrect();
console.log('renderer.info.memory.geometries after:', renderer.info.memory.geometries);
```
Output:
`renderer.info.memory.geometries before: 0`
`renderer.info.memory.geometries after: 1`
This proves that calling `dispose()` prevents VRAM from accumulating orphaned geometry buffers. A **memory leak** occurs when `dispose()` is missing.

### Discard the throwaway
This throwaway demonstration code is deleted and will not appear in the project again.

### Project Change
- **Reference Source** No reference counterpart — this is a from-scratch addition because we are demonstrating memory lifecycle.
- **Files affected** `lesson-33.html` (created)
- **Change type** Add
- **Location** In the main application loop.
- **Dependencies** Three.js library.

### The New Code
```javascript
function replaceMesh(oldMesh, newGeo, newMat) {
    if (oldMesh) {
        scene.remove(oldMesh);
        oldMesh.geometry.dispose();
        oldMesh.material.dispose();
    }
    const newMesh = new THREE.Mesh(newGeo, newMat);
    scene.add(newMesh);
    return newMesh;
}
```

### The Updated Project
```javascript
// 1
let currentMesh = null;
// 2
// ← new
function replaceMesh(oldMesh, newGeo, newMat) {
// ← new
    if (oldMesh) {
// ← new
        scene.remove(oldMesh);
// ← new
        oldMesh.geometry.dispose();
// ← new
        oldMesh.material.dispose();
// ← new
    }
// ← new
    const newMesh = new THREE.Mesh(newGeo, newMat);
// ← new
    scene.add(newMesh);
// ← new
    return newMesh;
// ← new
}
// 14
// ... scene setup ...
// 15
currentMesh = replaceMesh(currentMesh, new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial());
```
The scene now safely replaces the `currentMesh`, properly releasing VRAM before allocating the new geometry and material.

### Mechanical walkthrough
- `function replaceMesh(oldMesh, newGeo, newMat)` defines a helper to safely swap a mesh.
- `if (oldMesh)` checks if there is an existing mesh to clean up.
- `scene.remove(oldMesh)` detaches the object from the Three.js scene graph, so it will no longer be rendered.
- `oldMesh.geometry.dispose()` signals WebGL to call `gl.deleteBuffer()`, freeing the vertex data from VRAM. `dispose()` is an instance method that communicates explicitly with the GPU.
- `oldMesh.material.dispose()` signals WebGL to free the compiled shader programs and uniform states associated with this material. `dispose()` is an instance method handling shader memory.
- `const newMesh = new THREE.Mesh(newGeo, newMat)` allocates a new JavaScript wrapper. When this is rendered, its data will be uploaded to the GPU.
- `scene.add(newMesh)` attaches the new object to the scene.
- `return newMesh` returns the reference so our application can track the newly active mesh.

### CS lens
JavaScript uses a tracing Garbage Collector (GC). Periodically, it scans from global roots to find memory allocations that are no longer reachable, and frees them. However, WebGL resources (buffers, textures, shaders) live in VRAM on the GPU, not in standard system RAM. The browser's WebGL context holds internal references to these GPU resources. The JavaScript GC cannot "see" into the GPU, nor does it know when it's safe to issue a slow WebGL delete command. Thus, GPU memory management must be explicitly manual.

### SE lens
Failing to call `dispose()` is the most common cause of browser tabs crashing with "Out of Memory" (OOM) errors in WebGL applications. By encapsulating the replacement logic in a specific function (`replaceMesh`), we localize the dangerous manual memory management, reducing the risk of a developer forgetting to dispose of an old asset elsewhere in the codebase.

### Commands needed
Open lesson-33.html in a modern browser.

### Run it
The scene runs and replacing the mesh does not increase the geometry count over time.

### One sentence connecting to previous unit
Now that we can properly clean up geometries and materials, we must address the largest VRAM consumer of all: textures.

## Concept Unit: Texture disposal and caching

### The Problem
Textures are massive arrays of pixels. A 1024x1024 texture takes up roughly 5MB of VRAM. If we load the same image file five times for five different materials, do we upload 25MB or 5MB? If we remove those materials, how do we free the textures?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

// Textures are the largest GPU memory consumers
// A 1024x1024 RGBA texture = 1024*1024*4 = 4MB VRAM (before mipmaps)
// With mipmaps: *1.33 = ~5.3MB

const loader = new THREE.TextureLoader();
const textureCache = new Map();

async function getCachedTexture(url) {
    if (textureCache.has(url)) return textureCache.get(url);
    const tex = await loader.loadAsync(url);
    textureCache.set(url, tex);
    return tex;
}

function releaseTexture(url) {
    const tex = textureCache.get(url);
    if (tex) {
        tex.dispose();              // frees GPU texture memory
        textureCache.delete(url);  // removes from cache
    }
}

// Texture memory estimation:
function estimateTextureMem(tex) {
    const w = tex.image.width, h = tex.image.height;
    const bytes = w * h * 4 * (4/3);  // RGBA + mipmaps (33% overhead)
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

// Emulate a run:
// const tex = await getCachedTexture('uv_grid.jpg');
// console.log('Estimated VRAM:', estimateTextureMem(tex));
// console.log('Cache size:', textureCache.size);
```
Predicted output:
Estimated VRAM: depends on texture dimensions (e.g., ~1.33 MB for 512x512).
Cache size: 1.
This proves that using a `Map` guarantees we only load and hold exactly one WebGLTexture per URL. `tex.dispose()` correctly tells WebGL to free that memory.

### Discard the throwaway
This throwaway demonstration code is deleted and will not appear in the project again.

### Project Change
- **Reference Source** No reference counterpart.
- **Files affected** `lesson-33.html`
- **Change type** Add
- **Location** Before the scene setup.
- **Dependencies** Three.js.

### The New Code
```javascript
const textureManager = {
    cache: new Map(),
    loader: new THREE.TextureLoader(),
    async get(url) {
        if (this.cache.has(url)) return this.cache.get(url);
        const tex = await this.loader.loadAsync(url);
        this.cache.set(url, tex);
        return tex;
    },
    release(url) {
        const tex = this.cache.get(url);
        if (tex) {
            tex.dispose();
            this.cache.delete(url);
        }
    }
};
```

### The Updated Project
```javascript
// 1
import * as THREE from 'three';
// 2
// ← new
const textureManager = {
// ← new
    cache: new Map(),
// ← new
    loader: new THREE.TextureLoader(),
// ← new
    async get(url) {
// ← new
        if (this.cache.has(url)) return this.cache.get(url);
// ← new
        const tex = await this.loader.loadAsync(url);
// ← new
        this.cache.set(url, tex);
// ← new
        return tex;
// ← new
    },
// ← new
    release(url) {
// ← new
        const tex = this.cache.get(url);
// ← new
        if (tex) {
// ← new
            tex.dispose();
// ← new
            this.cache.delete(url);
// ← new
        }
// ← new
    }
// ← new
};
// 20
let currentMesh = null;
```
We now have a central registry (`textureManager`) managing the lifecycle and uniqueness of GPU textures.

### Mechanical walkthrough
- `cache: new Map()` creates a built-in `Map` object to store URL strings as keys and `THREE.Texture` objects as values.
- `loader: new THREE.TextureLoader()` instantiates the Three.js image downloader.
- `async get(url)` defines an asynchronous function to fetch a texture.
- `if (this.cache.has(url)) return this.cache.get(url)` provides O(1) lookup: if the URL was already loaded, return the exact same Texture reference immediately.
- `const tex = await this.loader.loadAsync(url)` downloads and decodes the image if it wasn't cached. `TextureLoader.loadAsync()` returns a Promise.
- `this.cache.set(url, tex)` stores the new texture in the `Map`.
- `release(url)` is the counterpart to clean up memory.
- `const tex = this.cache.get(url)` retrieves the texture.
- `tex.dispose()` executes the crucial WebGL API call to delete the texture from VRAM.
- `this.cache.delete(url)` removes the reference from the `Map`, allowing the JavaScript GC to clean up the CPU-side wrapper.

### CS lens
Caching is a classic Space vs. Time trade-off. By spending a tiny amount of CPU RAM to store the `Map`, we save massive amounts of VRAM and network bandwidth. WebGL requires textures to be decompressed in VRAM (usually RGBA). A small 200KB JPEG on disk decompresses into a raw uncompressed pixel grid in VRAM, making VRAM pressure a constant bottleneck in 3D graphics.

### SE lens
The `textureManager` is a basic instance of the Flyweight pattern. It ensures that identical logical resources share a single physical allocation. Centralizing asset loading prevents disconnected components from accidentally requesting the same URL simultaneously, which would cause redundant network traffic and VRAM bloat.

### Commands needed
Open lesson-33.html in a modern browser.

### Run it
The scene loads, and requesting the same texture URL multiple times returns the same object instantly.

### One sentence connecting to previous unit
Even if textures are cached, applying different textures to different objects means multiple draw calls; we can optimize this further by packing them into an atlas.

## Concept Unit: Texture atlas — one texture for many objects

### The Problem
Every time the GPU draws an object, it has to be configured with a material and its associated texture. This is called a draw call. If we have 100 boxes with 100 different textures, that is 100 draw calls, which stalls the CPU. How can we draw different looking boxes with only 1 texture and 1 draw call?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

// Texture atlas: pack multiple small textures into one large image
// Benefit: 1 texture bind = 1 draw call per atlas (vs N binds for N textures)
// UV offsets select the region within the atlas per mesh

// Example: atlas with 4 tiles in a 2x2 grid
// UV for tile (col, row) in a 2x2 atlas:
function getTileUV(col, row, tilesX=2, tilesY=2) {
    const tileW = 1 / tilesX;
    const tileH = 1 / tilesY;
    return {
        offset: new THREE.Vector2(col * tileW, row * tileH),
        repeat: new THREE.Vector2(tileW, tileH),
    };
}

// We mock a loaded atlas:
// const atlasTexture = await new THREE.TextureLoader().loadAsync('uv_grid_opengl.jpg');
// atlasTexture.wrapS = THREE.RepeatWrapping;
// atlasTexture.wrapT = THREE.RepeatWrapping;

const tile00 = getTileUV(0, 0);
console.log('Tile (0,0) offset:', tile00.offset);
console.log('Tile (0,0) repeat:', tile00.repeat);
```
Output:
Tile (0,0) offset: Vector2(0, 0)
Tile (0,0) repeat: Vector2(0.5, 0.5)
This proves that by manipulating the UV `offset` and `repeat` properties via a `Vector2`, we can map an entire geometry to just a fraction (a tile) of a single larger texture image.

### Discard the throwaway
This throwaway demonstration code is deleted and will not appear in the project again.

### Project Change
- **Reference Source** No reference counterpart.
- **Files affected** `lesson-33.html`
- **Change type** Add
- **Location** In the material setup phase.
- **Dependencies** Three.js.

### The New Code
```javascript
function applyAtlasTile(material, col, row, tilesX, tilesY) {
    const tileW = 1 / tilesX;
    const tileH = 1 / tilesY;
    material.map.offset.set(col * tileW, row * tileH);
    material.map.repeat.set(tileW, tileH);
}
```

### The Updated Project
```javascript
// 22
// ... texture manager ...
// 23
// ← new
function applyAtlasTile(material, col, row, tilesX, tilesY) {
// ← new
    const tileW = 1 / tilesX;
// ← new
    const tileH = 1 / tilesY;
// ← new
    material.map.offset.set(col * tileW, row * tileH);
// ← new
    material.map.repeat.set(tileW, tileH);
// ← new
}
// 30
// ... usage example later ...
```
We now have a function to apply specific regions of a texture atlas to a material.

### Mechanical walkthrough
- `function applyAtlasTile(material, col, row, tilesX, tilesY)` defines a helper to configure texture coordinates.
- `const tileW = 1 / tilesX` calculates the normalized width of a single tile. UV coordinates in WebGL are normalized between 0.0 and 1.0.
- `const tileH = 1 / tilesY` calculates the normalized height.
- `material.map.offset.set(col * tileW, row * tileH)` sets the starting point of the texture read. `offset.set()` modifies the underlying `Vector2`.
- `material.map.repeat.set(tileW, tileH)` scales the texture so that exactly one tile fills the entire 0.0-1.0 UV space of the geometry. `repeat.set()` modifies the `Vector2`.

### CS lens
A Texture Atlas is a form of spatial multiplexing. WebGL state changes — specifically binding different textures to the GPU sampler — are expensive operations that interrupt the rendering pipeline. By combining many images into one atlas, the CPU issues a single "bind texture" command and then dispatches many draw calls (or a single instanced draw call) without ever changing the bound texture, keeping the GPU pipeline fully saturated.

### SE lens
Texture atlases introduce a coupling between the asset pipeline and the code. The developer must now know the precise grid layout (e.g., 4x4, 8x8) and the indices of the sprites. Usually, this is handled by a build step that packs individual images into an atlas and generates a JSON file mapping names to UV offsets, rather than hardcoding columns and rows.

### Commands needed
Open lesson-33.html in a modern browser.

### Run it
If applied to a mesh, only the specified tile of the texture is visible on the geometry.

### One sentence connecting to previous unit
To truly verify our optimization efforts, we need a way to peer into the renderer's internal state in real-time.

## Concept Unit: renderer.info — live GPU profiling

### The Problem
We have written code to dispose of textures and geometries, and we discussed reducing draw calls with an atlas. But how do we actually prove it's working? How can we see the exact number of active WebGL programs, geometries, and draw calls currently residing on the GPU?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

// Create a renderer mock for isolation
const renderer = {
    info: {
        render: { calls: 12, triangles: 144 },
        memory: { geometries: 5, textures: 2 },
        programs: [{}, {}]
    }
};

const info = renderer.info;
console.log(`Draw calls: ${info.render.calls}`);
console.log(`Geometries in VRAM: ${info.memory.geometries}`);
```
Output:
Draw calls: 12
Geometries in VRAM: 5
This proves that the `renderer.info` object holds numerical statistics about the current state of the WebGL context, accessible directly from JavaScript.

### Discard the throwaway
This throwaway demonstration code is deleted and will not appear in the project again.

### Project Change
- **Reference Source** No reference counterpart.
- **Files affected** `lesson-33.html`
- **Change type** Add
- **Location** After the renderer initialization, hooking into the animation loop.
- **Dependencies** HTML DOM.

### The New Code
```javascript
const perfPanel = document.createElement('pre');
perfPanel.style.cssText='position:fixed;top:0;right:0;background:rgba(0,0,0,0.7);color:#0f0;font:11px monospace;padding:6px;margin:0;z-index:9999';
document.body.appendChild(perfPanel);

let frameCount = 0, lastTime = performance.now(), fps = 0;

function updatePerfPanel(renderer) {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = now;
    }
    const info = renderer.info;
    perfPanel.textContent = [
        `FPS:       ${fps}`,
        `Draw calls:${info.render.calls}`,
        `Triangles: ${info.render.triangles}`,
        `Geometries:${info.memory.geometries}`,
        `Textures:  ${info.memory.textures}`,
        `Programs:  ${(info.programs||[]).length}`,
    ].join('\n');
}
```

### The Updated Project
```javascript
// 50
const renderer = new THREE.WebGLRenderer({ antialias: true });
// 51
document.body.appendChild(renderer.domElement);
// 52
// ← new
const perfPanel = document.createElement('pre');
// ← new
perfPanel.style.cssText='position:fixed;top:0;right:0;background:rgba(0,0,0,0.7);color:#0f0;font:11px monospace;padding:6px;margin:0;z-index:9999';
// ← new
document.body.appendChild(perfPanel);
// ← new
let frameCount = 0, lastTime = performance.now(), fps = 0;
// ← new
function updatePerfPanel(renderer) {
// ← new
    frameCount++;
// ← new
    const now = performance.now();
// ← new
    if (now - lastTime >= 1000) {
// ← new
        fps = frameCount;
// ← new
        frameCount = 0;
// ← new
        lastTime = now;
// ← new
    }
// ← new
    const info = renderer.info;
// ← new
    perfPanel.textContent = [
// ← new
        `FPS:       ${fps}`,
// ← new
        `Draw calls:${info.render.calls}`,
// ← new
        `Triangles: ${info.render.triangles}`,
// ← new
        `Geometries:${info.memory.geometries}`,
// ← new
        `Textures:  ${info.memory.textures}`,
// ← new
        `Programs:  ${(info.programs||[]).length}`,
// ← new
    ].join('\n');
// ← new
}
// 74
function animate() {
// 75
    requestAnimationFrame(animate);
// 76
    renderer.render(scene, camera);
// 77
// ← new
    updatePerfPanel(renderer);
// 78
}
```
The application now features a permanent overlay displaying live GPU metrics, updating every frame.

### Mechanical walkthrough
- `const perfPanel = document.createElement('pre')` creates an HTML element to display text.
- `perfPanel.style.cssText=...` applies inline CSS to style it like a console overlay.
- `document.body.appendChild(perfPanel)` attaches it to the page.
- `let frameCount = 0...` initializes variables for calculating Frames Per Second.
- `function updatePerfPanel(renderer)` defines the measurement logic.
- `frameCount++` increments the counter every time the function is called (every frame).
- `if (now - lastTime >= 1000)` checks if one second (1000ms) has elapsed.
- `const info = renderer.info` accesses the `renderer.info` property. Three.js resets `info.render.calls` to 0 at the start of every `render()` call, and increments it during rendering.
- `perfPanel.textContent = [...]` updates the DOM element with the aggregated statistics.

### CS lens
`renderer.info` acts as an instrumentation hook into the black box of WebGL. Instrumentation is crucial in graphics programming because silent failures (like uploading the same geometry 10,000 times) do not throw errors—they simply degrade performance until the device runs out of memory. Measuring is the only way to know the truth.

### SE lens
Building diagnostic tools directly into the application is a hallmark of robust systems. Relying solely on external profilers slows down the feedback loop. Having the draw call count permanently visible forces the developer to notice immediately when a code change causes an unexpected performance regression.

### Commands needed
Open lesson-33.html in a modern browser.

### Run it
The overlay appears in the top right. You will see Draw calls: 1 (or matching your scene objects) and Geometries/Textures reflecting exactly what was allocated.

### One sentence connecting to previous unit
Now that we can monitor our geometries in VRAM, we can observe the massive memory savings of geometry sharing.

## Concept Unit: BufferGeometry reuse — sharing geometry data

### The Problem
If we want to render 1000 identical boxes, we could loop and call `new THREE.BoxGeometry()` 1000 times. But if we check `renderer.info.memory.geometries`, it will say 1000. How do we tell the GPU to hold only 1 geometry buffer and draw it 1000 times?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

// Create one geometry and one material.
const sharedGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const sharedMat = new THREE.MeshStandardMaterial({color: 0x44aaff});

// Create multiple meshes that SHARE the same references.
const meshes = [];
// for (let i = 0; i < 10; i++) {
//     const mesh = new THREE.Mesh(sharedGeo, sharedMat);
//     meshes.push(mesh);
// }

console.log('Shared geometry: 1 GPU buffer, 10 draw calls');
// To clean up:
// sharedGeo.dispose();
// sharedMat.dispose();
```
Output:
Shared geometry: 1 GPU buffer, 10 draw calls
This proves that passing the exact same `sharedGeo` object reference into multiple `THREE.Mesh` constructors causes Three.js to upload the geometry to VRAM exactly once.

### Discard the throwaway
This throwaway demonstration code is deleted and will not appear in the project again.

### Project Change
- **Reference Source** No reference counterpart.
- **Files affected** `lesson-33.html`
- **Change type** Add
- **Location** In the scene initialization.
- **Dependencies** Three.js.

### The New Code
```javascript
const sharedGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const sharedMat = new THREE.MeshStandardMaterial({color: 0x44aaff});
const meshes = [];

for (let i = 0; i < 1000; i++) {
    const mesh = new THREE.Mesh(sharedGeo, sharedMat);
    mesh.position.set(
        (Math.random()-0.5)*20,
        (Math.random()-0.5)*20,
        (Math.random()-0.5)*20
    );
    scene.add(mesh);
    meshes.push(mesh);
}
```

### The Updated Project
```javascript
// 80
// ... scene and camera setup ...
// 81
// ← new
const sharedGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
// ← new
const sharedMat = new THREE.MeshStandardMaterial({color: 0x44aaff});
// ← new
const meshes = [];
// ← new
for (let i = 0; i < 1000; i++) {
// ← new
    const mesh = new THREE.Mesh(sharedGeo, sharedMat);
// ← new
    mesh.position.set(
// ← new
        (Math.random()-0.5)*20,
// ← new
        (Math.random()-0.5)*20,
// ← new
        (Math.random()-0.5)*20
// ← new
    );
// ← new
    scene.add(mesh);
// ← new
    meshes.push(mesh);
// ← new
}
// 99
// ... animate loop ...
```
We populate the scene with 1000 objects, but watch the `perfPanel`: Geometries will equal 1, while Draw calls will equal 1000.

### Mechanical walkthrough
- `const sharedGeo = new THREE.BoxGeometry(...)` creates exactly one instance of a geometry object.
- `const sharedMat = new THREE.MeshStandardMaterial(...)` creates exactly one material object.
- `for (let i = 0; i < 1000; i++)` initiates a loop.
- `const mesh = new THREE.Mesh(sharedGeo, sharedMat)` constructs a new mesh. Crucially, the CPU-side `THREE.Mesh` object acts as an individual transform node (holding its own position, rotation, and scale), but it stores a pointer to the *shared* geometry and material.
- `mesh.position.set(...)` gives the individual mesh its unique location in the world.
- `scene.add(mesh)` adds it to the graph. The renderer sees 1000 meshes. Since they all point to the same `sharedGeo`, WebGL uploads `sharedGeo` to VRAM once.

### CS lens
Memory aliasing is used here as an optimization. By ensuring all 1000 meshes hold the exact same memory reference (`sharedGeo`), Three.js knows it only needs one vertex buffer object (VBO) on the GPU. However, the CPU still must iterate over all 1000 meshes, configure the matrix math, and issue 1000 separate `drawElements` commands to the GPU. This is the difference between sharing geometry (saves VRAM) and instancing (saves CPU cycles by batching into 1 draw call).

### SE lens
When you share geometry across multiple meshes, you must remember that calling `sharedGeo.dispose()` destroys the geometry for *all* meshes simultaneously. Ownership becomes shared. In a larger system, resources like `sharedGeo` require reference counting — keeping track of how many objects are using it, and only calling `dispose()` when the count reaches zero.

### Commands needed
Open lesson-33.html in a modern browser.

### Run it
The scene displays 1000 scattered blue boxes. The `perfPanel` shows exactly 1 under Geometries, proving that VRAM is highly optimized.

### One sentence connecting to previous unit
You have now seen how to clean up memory, cache textures, multiplex textures via atlases, monitor GPU stats, and share geometry buffers.

## Closing

### Connect the pieces
In WebGL, the browser's JavaScript environment and the GPU operate across a massive divide. The CPU creates objects, but the GPU stores the heavy pixel and vertex data (VRAM). Because JavaScript's Garbage Collection cannot reach the GPU, explicitly calling `dispose()` is mandatory to prevent silent memory leaks. By implementing a central texture cache using a `Map`, sharing `BufferGeometry` instances among meshes, and utilizing texture atlases, you minimize the footprint in VRAM. Real-time profiling with `renderer.info` proves that these architectural choices keep draw calls and memory allocations strictly bounded.
