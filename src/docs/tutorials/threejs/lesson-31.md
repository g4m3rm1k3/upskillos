# Lesson 31: Morph Targets — Shape Blending and Facial Animation

**What you will build**
You will implement a dynamic facial animation system and shape blending by directly manipulating vertex positions using morph targets. You will create multiple target shapes on a geometry, configure the GPU to interpolate between them using a material flag, and control their exact blend ratios over time using both manual influence arrays and an `AnimationMixer`. The core transferable skill is understanding how a GPU blends multiple stored versions of a mesh's vertices based on weights (0.0 to 1.0) to achieve complex, non-rigid deformations like smiling, frowning, or organic movement.

**What you need to know first**
- Lesson 30 for `BufferGeometry` vertex attributes.
- Lesson 18 for basic `AnimationMixer` setup.

**Terms used in this lesson**
- **Morph targets (blend shapes)** — Additional arrays of vertex positions stored on a geometry that represent alternate shapes. They exist to allow a single mesh to smoothly deform into different states without relying on a rigid skeleton, making them ideal for facial expressions.
- **Influence weights** — A floating-point value from 0.0 to 1.0 that dictates how much a specific morph target affects the final mesh shape. They exist to allow fractional blending, letting you mix 30% of a smile with 50% of a raised eyebrow.
- **GPU linear interpolation** — The hardware process of calculating in-between values. It exists here to rapidly calculate the exact final position of thousands of vertices every frame by summing the base position with the weighted differences of every active morph target.
- **Skeletal animation** — An animation technique using a hierarchy of bones (matrices) to deform a mesh. It is discussed here to contrast with morph targets, as skeletal animation is better for rigid locomotion while morph targets are better for complex localized surface changes.

**Objects and methods used**

**THREE.PlaneGeometry**
- *What it is:* A class that generates a flat 2D rectangular grid of vertices.
- *Implementation:* `new THREE.PlaneGeometry(width, height, widthSegments, heightSegments)`
- *Its use:* Provides the base set of vertices that we will deform with our morph targets.
- *Type:* Class
- *Responsibility:* Constructs a standardized, subdivided planar mesh with pre-calculated positions, normals, and UVs.
- *Depends on:* Width, height, and subdivision counts passed to the constructor.
- *Connects to:* Forms the `geometry` of a `THREE.Mesh`.
- *Shape:* A base asset geometry instantiated during scene setup.

**Float32Array**
- *What it is:* A typed array representing an array of 32-bit floating-point numbers.
- *Implementation:* `new Float32Array(length)`
- *Its use:* Holds the raw sequential XYZ coordinates for our custom wave and spike morph target positions.
- *Type:* Built-in JavaScript Class
- *Responsibility:* Provides a fixed-length, memory-efficient array buffer strictly for floating point numbers, matching WebGL requirements.
- *Depends on:* An integer length or an existing array to copy.
- *Connects to:* Passed into `THREE.BufferAttribute` to be uploaded to the GPU.
- *Shape:* A low-level data structure in memory.

**THREE.BufferAttribute**
- *What it is:* A Three.js wrapper around a typed array, defining how data is chunked.
- *Implementation:* `new THREE.BufferAttribute(typedArray, itemSize)`
- *Its use:* Packages our `Float32Array` of morph target positions into groups of 3 (X, Y, Z) for the geometry.
- *Type:* Class
- *Responsibility:* Maps flat typed arrays into structured vertex attributes (like vec3) so the WebGL shaders understand how to read them.
- *Depends on:* A typed array and an integer specifying items per vertex.
- *Connects to:* Assigned to geometry properties like `morphAttributes.position`.
- *Shape:* A data wrapper sitting between JavaScript arrays and WebGL buffers.

**geometry.morphAttributes.position**
- *What it is:* An array of `BufferAttribute` objects representing alternate vertex positions.
- *Implementation:* `geo.morphAttributes.position = [ attr1, attr2 ]`
- *Its use:* Stores our wave and spike shapes directly on the geometry so the GPU can access them alongside the base positions.
- *Type:* Array property of a `BufferGeometry`
- *Responsibility:* Holds the absolute target states for the geometry's vertices.
- *Depends on:* Valid `BufferAttribute` instances with exactly the same vertex count as the base geometry.
- *Connects to:* Read by the renderer and WebGL vertex shader.
- *Shape:* A data array attached to a geometry instance.

**morphTargets: true**
- *What it is:* A material configuration flag.
- *Implementation:* `{ morphTargets: true }` passed to material parameters.
- *Its use:* Instructs the material's shader to actively compile in the code necessary to compute morph target blending.
- *Type:* Boolean property on material parameters
- *Responsibility:* Enables or disables morph target processing in the shader to save performance if not needed.
- *Depends on:* The geometry having populated `morphAttributes`.
- *Connects to:* WebGL shader compilation pipeline.
- *Shape:* A configuration flag on a material.

**mesh.morphTargetInfluences**
- *What it is:* An array of numbers mapping 1:1 to the `morphAttributes.position` array.
- *Implementation:* `mesh.morphTargetInfluences[index] = value`
- *Its use:* We manipulate these values to dynamically animate how strongly each morph shape pulls the mesh.
- *Type:* Array property on a `THREE.Mesh`
- *Responsibility:* Provides the real-time weight values (usually 0.0 to 1.0) that the shader uses for interpolation.
- *Depends on:* The mesh being constructed with a geometry that has morph targets.
- *Connects to:* Driven by our code or an `AnimationMixer`, read by the GPU every frame.
- *Shape:* A runtime state array on the mesh.

**THREE.NumberKeyframeTrack**
- *What it is:* An animation track specifically for interpolating scalar numbers.
- *Implementation:* `new THREE.NumberKeyframeTrack(propertyPath, times, values)`
- *Its use:* Declares a sequence of target influence values over time for a specific morph target.
- *Type:* Class
- *Responsibility:* Stores a timeline of values and handles the math to interpolate between them at a specific moment in time.
- *Depends on:* A target path string, an array of time stamps, and an array of numeric values.
- *Connects to:* Grouped into a `THREE.AnimationClip`.
- *Shape:* A single track of animation data.

**THREE.AnimationClip**
- *What it is:* A reusable collection of keyframe tracks that represent a specific animation sequence.
- *Implementation:* `new THREE.AnimationClip(name, duration, tracks)`
- *Its use:* Bundles our wave and spike tracks into a single playable "morph-anim" action.
- *Type:* Class
- *Responsibility:* Groups related animation tracks together into a cohesive duration-bound clip.
- *Depends on:* A name, a duration in seconds, and an array of `KeyframeTrack` objects.
- *Connects to:* Processed by the `AnimationMixer`.
- *Shape:* A data container for animation sequences.

**THREE.AnimationMixer**
- *What it is:* The central player for animations on a specific object in the scene.
- *Implementation:* `new THREE.AnimationMixer(rootObject)`
- *Its use:* Drives the evaluation of the keyframe tracks and applies the resulting values to the mesh's `morphTargetInfluences`.
- *Type:* Class
- *Responsibility:* Keeps track of time, blends multiple playing animations if necessary, and writes the evaluated values to the target object's properties.
- *Depends on:* A root object (like our mesh) to animate.
- *Connects to:* Updated every frame in the render loop; plays `AnimationAction` objects.
- *Shape:* A stateful runtime controller.

**mesh.morphTargetDictionary**
- *What it is:* A plain JavaScript object mapping string names to integer indices.
- *Implementation:* `mesh.morphTargetDictionary = { 'wave': 0, 'spike': 1 }`
- *Its use:* Allows us to access morph targets by a readable name instead of memorizing array indices, which is crucial for complex GLTF models.
- *Type:* Object property on `THREE.Mesh`
- *Responsibility:* Provides a human-readable lookup table for the `morphTargetInfluences` array.
- *Depends on:* Manual population, or automatically populated when loading a GLTF model containing named morph targets.
- *Connects to:* Used by our application logic to index into `morphTargetInfluences`.
- *Shape:* A string-to-number mapping object.

## Concept Unit: Creating morph targets manually on a BufferGeometry

### The Problem
We have a flat plane, and we want it to seamlessly deform into a wave, or a spike, or somewhere in between, without manually recalculating and uploading 10,000 vertex positions to the GPU on every frame. How can we store multiple "alternate states" for a mesh on the GPU once, and let the hardware do the math?

### Introduce the concept in isolation
We will extract the base positions of a geometry and create two completely new sets of positions — one shaped like a wave, one like a spike — and register them as morph targets.

```javascript
import * as THREE from 'three';

// Base geometry: flat plane of points
const geo = new THREE.PlaneGeometry(4, 4, 10, 10);

// Base positions (copy from the geometry's position attribute):
const basePositions = geo.attributes.position.array.slice();

// Morph target 1: wave shape (displace Y by sin)
const wavePositions = new Float32Array(basePositions.length);
for (let i = 0; i < basePositions.length; i += 3) {
    wavePositions[i  ] = basePositions[i  ];
    wavePositions[i+1] = basePositions[i+1];
    // Displace Z (PlaneGeometry is in XY, Z is depth):
    wavePositions[i+2] = Math.sin(basePositions[i] * 2) * 0.5;  // wave on X axis
}

// Morph target 2: spike at center
const spikePositions = new Float32Array(basePositions.length);
for (let i = 0; i < basePositions.length; i += 3) {
    const x = basePositions[i], y = basePositions[i+1];
    const dist = Math.sqrt(x*x + y*y);
    spikePositions[i  ] = x;
    spikePositions[i+1] = y;
    spikePositions[i+2] = Math.max(0, 1 - dist) * 2;  // spike at center
}

// Add morph targets to geometry:
geo.morphAttributes.position = [
    new THREE.BufferAttribute(wavePositions, 3),
    new THREE.BufferAttribute(spikePositions, 3),
];
console.log('Morph targets:', geo.morphAttributes.position.length);
```

*Output:*
```text
Morph targets: 2
```
This proves that the geometry now securely holds two alternate vertex arrays in its `morphAttributes.position` list. These are called **morph targets**. The wave array dictates that a vertex at `x=0` has `z=0`, but at `x=PI/4`, `z=sin(PI/2)*0.5=0.5`. The spike array dictates that a vertex at `dist=0` has `z=2`. Crucially, these are absolute final positions, not deltas.

### Discard the throwaway
This raw buffer manipulation proves how targets are stored. We discard this throwaway console log snippet, though we will integrate the target generation logic directly into the project below.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are explicitly demonstrating manual target construction before loading complex 3D files.
- **Files affected:** `lesson-31.html` (created).
- **Change type:** Add.
- **Location:** Inside the main script block.
- **Dependencies:** Three.js.

### The New Code
```html
<script type="module">
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geo = new THREE.PlaneGeometry(4, 4, 10, 10);
const basePositions = geo.attributes.position.array.slice();

const wavePositions = new Float32Array(basePositions.length);
const spikePositions = new Float32Array(basePositions.length);

for (let i = 0; i < basePositions.length; i += 3) {
    const x = basePositions[i], y = basePositions[i+1];
    wavePositions[i] = x;
    wavePositions[i+1] = y;
    wavePositions[i+2] = Math.sin(x * 2) * 0.5;
    
    const dist = Math.sqrt(x*x + y*y);
    spikePositions[i] = x;
    spikePositions[i+1] = y;
    spikePositions[i+2] = Math.max(0, 1 - dist) * 2;
}

geo.morphAttributes.position = [
    new THREE.BufferAttribute(wavePositions, 3),
    new THREE.BufferAttribute(spikePositions, 3)
];
</script>
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <head>
4:     <style>body { margin: 0; }</style>
5: </head>
6: <body>
7: <script type="module">
8: import * as THREE from 'three';
9: 
10: const scene = new THREE.Scene(); // ← new
11: const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100); // ← new
12: camera.position.z = 5; // ← new
13: const renderer = new THREE.WebGLRenderer(); // ← new
14: renderer.setSize(window.innerWidth, window.innerHeight); // ← new
15: document.body.appendChild(renderer.domElement); // ← new
16: 
17: const geo = new THREE.PlaneGeometry(4, 4, 10, 10); // ← new
18: const basePositions = geo.attributes.position.array.slice(); // ← new
19: 
20: const wavePositions = new Float32Array(basePositions.length); // ← new
21: const spikePositions = new Float32Array(basePositions.length); // ← new
22: 
23: for (let i = 0; i < basePositions.length; i += 3) { // ← new
24:     const x = basePositions[i], y = basePositions[i+1]; // ← new
25:     wavePositions[i] = x; // ← new
26:     wavePositions[i+1] = y; // ← new
27:     wavePositions[i+2] = Math.sin(x * 2) * 0.5; // ← new
28:     
29:     const dist = Math.sqrt(x*x + y*y); // ← new
30:     spikePositions[i] = x; // ← new
31:     spikePositions[i+1] = y; // ← new
32:     spikePositions[i+2] = Math.max(0, 1 - dist) * 2; // ← new
33: } // ← new
34: 
35: geo.morphAttributes.position = [ // ← new
36:     new THREE.BufferAttribute(wavePositions, 3), // ← new
37:     new THREE.BufferAttribute(spikePositions, 3) // ← new
38: ]; // ← new
39: </script>
40: </body>
41: </html>
```
This is a standard Three.js initialization that prepares a `PlaneGeometry`, iterates over its base vertices to populate two distinct `Float32Array` buffers with mathematical deformations (wave and spike), and assigns them into the geometry's `morphAttributes.position` array.

### Mechanical walkthrough
- `const geo = new THREE.PlaneGeometry(4, 4, 10, 10);` initializes a flat grid.
- `geo.attributes.position.array.slice();` extracts a shallow copy of the raw float data of the base vertices.
- `new Float32Array(basePositions.length);` allocates memory exactly large enough to hold a 1:1 replacement of those coordinates.
- `for (let i = 0; i < basePositions.length; i += 3)` steps through the array in groups of 3 (X, Y, Z coordinates).
- `Math.sin(x * 2) * 0.5` calculates the Z-depth for the wave shape based on the vertex's X position.
- `Math.max(0, 1 - dist) * 2` calculates the Z-depth for the spike, lifting points near the center `(0,0)` and dropping rapidly to 0.
- `geo.morphAttributes.position = [...]` assigns these arrays as the geometry's available alternate shapes.
- `new THREE.BufferAttribute(...)` wraps each float array into a structured buffer telling WebGL that the data comes in sets of 3 (`xyz`).

### CS lens
In computer science, precomputing geometry avoids expensive recalculation. Instead of running a complex function (like `sin` or radial distance) per-vertex inside the rendering loop on the CPU, we do the heavy math exactly once during setup, storing the final absolute positions. We trade memory (storing extra arrays) for massive processing speed.

### SE lens
This manual target construction is a low-level API interaction. In production game development, software engineers almost never build morph targets vertex-by-vertex in code like this. Instead, 3D artists sculpt the expressions in software like Blender or Maya, and the engine simply loads the arrays. The SE principle here is understanding the data layout so you can debug the pipeline when the imported model inevitably breaks.

### Commands needed
Open lesson-31.html in a modern browser.

### Run it
*Execution output stated directly per exemption:*
The screen will be completely blank. We have constructed a geometry and populated its morph attributes, but we have neither attached a material nor added it to the scene, so nothing renders yet.

### One sentence connecting to previous unit
Now that the alternate vertex positions are locked onto the geometry, we must configure a material to actually use them and a mesh to dictate the blend.

## Concept Unit: morphTargetInfluences — blending between shapes

### The Problem
The GPU has three sets of vertex data: base, wave, and spike. If we render the mesh right now, it will just draw the base. How do we tell the GPU to "mix" the shapes together, and how do we control the percentage of each?

### Introduce the concept in isolation
We will create a material with morph targets enabled, create the mesh, and set the influence array to mix 50% of the wave and 30% of the spike.

```javascript
import * as THREE from 'three';

const mat = new THREE.MeshStandardMaterial({
    color: 0x44aaff,
    side: THREE.DoubleSide,
    morphTargets: true,  // REQUIRED: enables morph target interpolation in shader
});
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);

// morphTargetInfluences: array of weights [0,1] per morph target
console.log('Influence array:', mesh.morphTargetInfluences); 

// Blend 50% wave:
mesh.morphTargetInfluences[0] = 0.5;

// Blend 50% wave + 30% spike:
mesh.morphTargetInfluences[0] = 0.5;
mesh.morphTargetInfluences[1] = 0.3;

console.log('Wave influence:', mesh.morphTargetInfluences[0]); 
console.log('Spike influence:', mesh.morphTargetInfluences[1]); 
```

*Output:*
```text
Influence array: [0, 0]
Wave influence: 0.5
Spike influence: 0.3
```
This proves that the `morphTargetInfluences` array defaults to zeros (meaning no deformation), maps 1:1 with the attributes, and stores floating point weights. Setting `mesh.morphTargetInfluences[0] = 0.5` causes the GPU to linearly interpolate every vertex to 50% of its wave shape.

### Discard the throwaway
This snippet proves the default state and assignment behavior. We discard this throwaway console log snippet, as we will directly add the material and light into the main loop below.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-31.html` (modified).
- **Change type:** Add.
- **Location:** Following the geometry creation block.
- **Dependencies:** The geometry and scene from the previous unit.

### The New Code
```javascript
const mat = new THREE.MeshStandardMaterial({
    color: 0x44aaff,
    side: THREE.DoubleSide,
    morphTargets: true
});
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);

mesh.morphTargetInfluences[0] = 0.5; // 50% wave
mesh.morphTargetInfluences[1] = 0.3; // 30% spike

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(2, 2, 5);
scene.add(light);

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
```

### The Updated Project
```html
35: geo.morphAttributes.position = [
36:     new THREE.BufferAttribute(wavePositions, 3),
37:     new THREE.BufferAttribute(spikePositions, 3)
38: ];
39: 
40: const mat = new THREE.MeshStandardMaterial({ // ← new
41:     color: 0x44aaff, // ← new
42:     side: THREE.DoubleSide, // ← new
43:     morphTargets: true // ← new
44: }); // ← new
45: const mesh = new THREE.Mesh(geo, mat); // ← new
46: scene.add(mesh); // ← new
47: 
48: mesh.morphTargetInfluences[0] = 0.5; // ← new
49: mesh.morphTargetInfluences[1] = 0.3; // ← new
50: 
51: const light = new THREE.DirectionalLight(0xffffff, 1); // ← new
52: light.position.set(2, 2, 5); // ← new
53: scene.add(light); // ← new
54: 
55: function animate() { // ← new
56:     requestAnimationFrame(animate); // ← new
57:     renderer.render(scene, camera); // ← new
58: } // ← new
59: animate(); // ← new
60: </script>
```
We construct the material with `morphTargets: true`, build the `Mesh`, adjust the `morphTargetInfluences` values directly, add a basic light so the 3D surface is visible, and start the render loop. 

### Mechanical walkthrough
- `new THREE.MeshStandardMaterial(...)` prepares a standard shading material.
- `morphTargets: true` is a crucial flag. It tells Three.js to recompile the internal WebGL shader to explicitly include the math for morph targets. If forgotten, manipulating influences does nothing.
- `new THREE.Mesh(geo, mat)` pairs our geometry with its new material.
- `scene.add(mesh)` injects the object into the visible hierarchy.
- `mesh.morphTargetInfluences[0] = 0.5` addresses the first morph attribute (the wave) and sets its weight to 0.5.
- `mesh.morphTargetInfluences[1] = 0.3` addresses the second morph attribute (the spike) and sets its weight to 0.3.
- `new THREE.DirectionalLight` and `scene.add(light)` provide illumination; without it, `MeshStandardMaterial` renders pitch black.
- `requestAnimationFrame(animate)` and `renderer.render(scene, camera)` spin up the standard infinite render cycle.

### CS lens
In the GPU's vertex shader, final vertex position is computed via **linear interpolation**. Given an absolute base position, the shader computes: `finalPos = basePos*(1 - sumOfInfluences) + target0*influence0 + target1*influence1`. For a vertex at `x=PI/4`, the wave targets `z=0.5`. With `influence[0]=0.5`, the vertex moves exactly half that distance. Because this is executed purely in hardware parallel processing, updating 52 facial morph targets across 10,000 vertices happens nearly instantly.

### SE lens
Notice the array index access: `influences[0]`. Referencing indices blindly is brittle engineering. If the artist changes the order of the shapes in the source file, index 0 might suddenly become a frown instead of a smile, breaking the app silently. Hardcoded indices are a known hazard in rendering pipelines.

### Commands needed
Open lesson-31.html in a modern browser.

### Run it
*Execution output stated directly per exemption:*
The browser will render a blue, shaded plane. The surface will be frozen in a strange hybrid shape: partially rippled like a wave, with a softened, blunt point lifting the center.

### One sentence connecting to previous unit
Static blending is useful, but the true power of morph targets lies in dynamically animating those influences over time.

## Concept Unit: Animating morph influences with AnimationMixer

### The Problem
We can manually set `morphTargetInfluences[0] = 0.5` inside the render loop using `Math.sin(Date.now())` to animate it, but what if we have a complex timeline of keyframes (e.g., a specific choreographed blink, smile, and frown sequence exported from an animator)? How do we drive the influences using a structured timeline?

### Introduce the concept in isolation
We will declare specific keyframe tracks targeting the influence array and bind them into an animation clip.

```javascript
import * as THREE from 'three';

// Use AnimationMixer + NumberKeyframeTrack to drive morphTargetInfluences
const waveTrack = new THREE.NumberKeyframeTrack(
    '.morphTargetInfluences[0]',  // path: morphTargetInfluences array, index 0
    [0, 1, 2, 3, 4],             // times in seconds
    [0, 1, 0, 0.5, 0]            // influence values: off->full->off->half->off
);
const spikeTrack = new THREE.NumberKeyframeTrack(
    '.morphTargetInfluences[1]',
    [0, 2, 4],                   // times in seconds
    [0, 0.8, 0]                  // influence values
);

const clip = new THREE.AnimationClip('morph-anim', 4, [waveTrack, spikeTrack]);
console.log('Morph animation tracks:', clip.tracks.length); 
```

*Output:*
```text
Morph animation tracks: 2
```
This proves we can construct an `AnimationClip` consisting of two separate scalar timelines. The path string `'.morphTargetInfluences[0]'` uses Three.js's internal parsing syntax to resolve exactly which property on the target mesh should receive these interpolated values at runtime. 

### Discard the throwaway
This isolated track building proves the syntax. We discard this throwaway console log snippet, as we will directly wire the mixer into our update loop below.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-31.html` (modified).
- **Change type:** Add / Replace.
- **Location:** Just before the `animate` function, and inside the `animate` loop.
- **Dependencies:** `THREE.Clock` for delta time.

### The New Code
```javascript
const waveTrack = new THREE.NumberKeyframeTrack('.morphTargetInfluences[0]', [0, 1, 2, 3, 4], [0, 1, 0, 0.5, 0]);
const spikeTrack = new THREE.NumberKeyframeTrack('.morphTargetInfluences[1]', [0, 2, 4], [0, 0.8, 0]);
const clip = new THREE.AnimationClip('morph-anim', 4, [waveTrack, spikeTrack]);

const mixer = new THREE.AnimationMixer(mesh);
const action = mixer.clipAction(clip);
action.play();

const clock = new THREE.Clock();
```
*Inside the animate function:*
```javascript
    const delta = clock.getDelta();
    mixer.update(delta);
```

### The Updated Project
```html
48: // mesh.morphTargetInfluences[0] = 0.5;  ← removed (mixer handles it)
49: // mesh.morphTargetInfluences[1] = 0.3;  ← removed
50: 
51: const light = new THREE.DirectionalLight(0xffffff, 1);
52: light.position.set(2, 2, 5);
53: scene.add(light);
54: 
55: const waveTrack = new THREE.NumberKeyframeTrack('.morphTargetInfluences[0]', [0, 1, 2, 3, 4], [0, 1, 0, 0.5, 0]); // ← new
56: const spikeTrack = new THREE.NumberKeyframeTrack('.morphTargetInfluences[1]', [0, 2, 4], [0, 0.8, 0]); // ← new
57: const clip = new THREE.AnimationClip('morph-anim', 4, [waveTrack, spikeTrack]); // ← new
58: 
59: const mixer = new THREE.AnimationMixer(mesh); // ← new
60: const action = mixer.clipAction(clip); // ← new
61: action.play(); // ← new
62: 
63: const clock = new THREE.Clock(); // ← new
64: 
65: function animate() {
66:     requestAnimationFrame(animate);
67:     const delta = clock.getDelta(); // ← new
68:     mixer.update(delta); // ← new
69:     renderer.render(scene, camera);
70: }
71: animate();
```
We replaced the static influence assignments with a data-driven `AnimationClip`, initialized an `AnimationMixer` targeting our mesh, and added the mixer's update call to the render loop using a clock's delta time.

### Mechanical walkthrough
- `new THREE.NumberKeyframeTrack('.morphTargetInfluences[0]', ...)` creates a timeline bound to the first element of the influences array.
- `[0, 1, 2, 3, 4]` specifies the precise seconds at which keyframes occur.
- `[0, 1, 0, 0.5, 0]` are the actual influence values written at those times. At t=1, the wave influence hits 1.0 (full wave).
- `new THREE.AnimationClip('morph-anim', 4, [...])` groups the tracks into a 4-second looping clip.
- `new THREE.AnimationMixer(mesh)` creates the runtime playback engine attached to our specific 3D object.
- `mixer.clipAction(clip)` prepares the clip for playback on the mixer.
- `action.play()` queues the animation to start.
- `new THREE.Clock()` initializes a timer.
- `const delta = clock.getDelta()` fetches the exact fraction of a second since the last frame.
- `mixer.update(delta)` calculates the correct interpolated values for the current time and forcefully overwrites the mesh's `morphTargetInfluences` array.

### CS lens
Animation systems separate data (the `AnimationClip` and `KeyframeTracks`) from state (the `AnimationMixer`). The clip is just immutable mathematical data—it knows nothing about the mesh. The mixer holds the state—current time, playback speed, and target object. This architectural separation allows the exact same 4-second animation clip to be played on 50 different meshes simultaneously by 50 different mixers, minimizing memory waste.

### SE lens
Using the string path `'.morphTargetInfluences[0]'` is a form of reflection or late binding. The animation system parses this string, traversing the mesh's properties to locate the array and index. While powerful and flexible for generic systems, string-based property binding means typos fail silently at runtime rather than at compile time.

### Commands needed
Open lesson-31.html in a modern browser.

### Run it
*Execution output stated directly per exemption:*
The blue plane will dynamically ripple and spike. Over 4 seconds, the wave will surge, recede as the center spike rises to 80% maximum height, and then a smaller wave will pass through before looping seamlessly.

### One sentence connecting to previous unit
We successfully animated via array indices, but we still have the brittle index problem where `[0]` represents "wave"—a problem we must solve before handling complex imported files.

## Concept Unit: morphTargetDictionary — named morph targets

### The Problem
When a 3D artist exports a facial rig from Maya (using ARKit's 52 standard blend shapes like `jawOpen`, `eyeBlinkLeft`, `mouthSmileRight`), the engine loads an array of 52 morph targets. How do we ensure we trigger a smile instead of accidentally triggering a left eye blink, without memorizing arbitrary indices?

### Introduce the concept in isolation
We manually construct a lookup dictionary directly on the mesh to map readable string keys to integer indices.

```javascript
import * as THREE from 'three';

const mesh2 = new THREE.Mesh(geo, mat);
mesh2.morphTargetDictionary = { 'wave': 0, 'spike': 1 };
mesh2.morphTargetInfluences = [0, 0];

// Access by name:
const waveIdx = mesh2.morphTargetDictionary['wave']; 
const spikeIdx = mesh2.morphTargetDictionary['spike'];

mesh2.morphTargetInfluences[waveIdx]  = 0.6;
mesh2.morphTargetInfluences[spikeIdx] = 0.4;

console.log('Wave index:', waveIdx); 
console.log('Spike index:', spikeIdx); 
```

*Output:*
```text
Wave index: 0
Spike index: 1
```
This proves that `morphTargetDictionary` is simply a plain JavaScript object serving as a lookup table. When the GLTF loader parses a model with named morph targets, it automatically populates this exact structure on the resulting meshes.

### Discard the throwaway
This snippet proves the structure of the dictionary object. We discard this throwaway console log snippet, but we will attach a dictionary to our real mesh to solve our index problem.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-31.html` (modified).
- **Change type:** Add / Replace.
- **Location:** Right after `const mesh = new THREE.Mesh(geo, mat);`.
- **Dependencies:** None.

### The New Code
```javascript
mesh.morphTargetDictionary = { 'wave': 0, 'spike': 1 };
```
*And update the track definitions to use name paths:*
```javascript
const waveTrack = new THREE.NumberKeyframeTrack(
    mesh.name + '.morphTargetInfluences[' + mesh.morphTargetDictionary['wave'] + ']',
    [0, 1, 2, 3, 4], [0, 1, 0, 0.5, 0]
);
const spikeTrack = new THREE.NumberKeyframeTrack(
    mesh.name + '.morphTargetInfluences[' + mesh.morphTargetDictionary['spike'] + ']',
    [0, 2, 4], [0, 0.8, 0]
);
```

### The Updated Project
```html
45: const mesh = new THREE.Mesh(geo, mat);
46: mesh.name = 'DeformingPlane'; // ← new
47: mesh.morphTargetDictionary = { 'wave': 0, 'spike': 1 }; // ← new
48: scene.add(mesh);
49: 
50: const light = new THREE.DirectionalLight(0xffffff, 1);
51: light.position.set(2, 2, 5);
52: scene.add(light);
53: 
54: const waveTrack = new THREE.NumberKeyframeTrack( // ← new
55:     mesh.name + '.morphTargetInfluences[' + mesh.morphTargetDictionary['wave'] + ']', // ← new
56:     [0, 1, 2, 3, 4], [0, 1, 0, 0.5, 0] // ← new
57: ); // ← new
58: const spikeTrack = new THREE.NumberKeyframeTrack( // ← new
59:     mesh.name + '.morphTargetInfluences[' + mesh.morphTargetDictionary['spike'] + ']', // ← new
60:     [0, 2, 4], [0, 0.8, 0] // ← new
61: ); // ← new
62: const clip = new THREE.AnimationClip('morph-anim', 4, [waveTrack, spikeTrack]);
```
We attached a `name` to the mesh, attached the `morphTargetDictionary`, and used dictionary lookups to dynamically construct the track path strings instead of hardcoding `[0]` and `[1]`.

### Mechanical walkthrough
- `mesh.name = 'DeformingPlane'` gives the object an identity that the animation system can use for scoped targeting.
- `mesh.morphTargetDictionary = { 'wave': 0, 'spike': 1 }` builds the explicit mapping from human-readable names to array indices.
- `mesh.morphTargetDictionary['wave']` safely resolves to `0` at runtime.
- `mesh.name + '.morphTargetInfluences[' + ... + ']'` dynamically constructs the string path (e.g. `DeformingPlane.morphTargetInfluences[0]`). If the model changes and 'wave' becomes index 4, the code still targets the correct slot seamlessly.

### CS lens
A dictionary mapping provides indirection. The animation track no longer couples tightly to the physical layout of memory (the array index). It couples to a logical contract (the shape's name). In CS, adding a layer of indirection is the standard solution to decoupling systems that evolve independently.

### SE lens
GLTF models loaded into Three.js automatically receive exactly this dictionary. A classic SE failure in graphics programming is manually matching indices from a spreadsheet provided by a 3D artist. If the artist adds a new blend shape ("noseWrinkle") into the middle of the stack, every index shifts, and all hardcoded animation logic breaks. Relying exclusively on the dictionary guarantees stability across asset iterations.

### Commands needed
Open lesson-31.html in a modern browser.

### Run it
*Execution output stated directly per exemption:*
The visual result is identical to the previous unit—the plane still animates exactly as before. The change was entirely structural, making the code robust against index shifting.

### One sentence connecting to previous unit
Morph targets are powerful and robust when named, but understanding their physical limitations is critical when choosing how to rig a character.

## Concept Unit: Performance: morph targets vs skeletal animation

### The Problem
If morph targets let us blend shapes instantly on the GPU, why do characters have bones at all? Why not just use morph targets for walking, running, and jumping?

### Introduce the concept in isolation
We will calculate the raw memory footprint required to store facial morph targets compared to standard skeletal bones.

```javascript
// Morph targets: each vertex has N positions stored in GPU
// GPU memory: vertices * N_targets * 3 floats * 4 bytes
// Example: face mesh 5000 vertices, 52 blend shapes:
const vertices = 5000, targets = 52, bytesPerFloat = 4;
const morphMem = vertices * targets * 3 * bytesPerFloat;
console.log('Morph target GPU memory:', (morphMem/1024/1024).toFixed(2) + ' MB'); 

// Skeletal animation: bones with matrices (much smaller data)
// 70 bones * 64 bytes per matrix = 4.5 KB (vs 3.1 MB)
console.log('Skeletal (70 bones):', (70*64/1024).toFixed(2) + ' KB'); 
```

*Output:*
```text
Morph target GPU memory: 3.10 MB
Skeletal (70 bones): 4.38 KB
```
This proves that 52 facial expressions consume over 3 Megabytes of VRAM. A full body skeleton with 70 bones consumes roughly 4.4 Kilobytes. Morph targets require copying the *entire vertex array* for every shape. Skeletal animation only requires updating a few tiny mathematical matrices, and the vertices just follow the math.

### Discard the throwaway
This snippet proves the memory disparity. We discard this throwaway calculation. It won't be in the project, but the concept dictates architectural decisions.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** None.
- **Change type:** Configuration/Architectural.
- **Location:** Conceptual.
- **Dependencies:** None.

### The New Code
```javascript
// Architectural rule established:
// Use Morph Targets for: Faces, non-rigid localized squashing.
// Use Skeletal Animation for: Body locomotion, limbs, rigid joints.
```

### The Updated Project
No code changed. This unit establishes the pipeline rules for importing models.

### Mechanical walkthrough
- `vertices * targets * 3 * bytesPerFloat` calculates memory because every morph target duplicates the entire geometry's `X, Y, Z` coordinates, taking 4 bytes per float.
- `70 * 64` calculates skeletal memory because 70 bones represented by 4x4 matrix transforms (`16 floats * 4 bytes = 64 bytes`) are incredibly tiny.

### CS lens
**Space vs Expressiveness.** Morph targets scale linearly in memory complexity `O(V * T)` (Vertices * Targets). They offer infinite expressiveness because any vertex can move anywhere, regardless of physical constraints. Skeletal animation has `O(B)` space complexity (Bones), which is minuscule, but can only execute rigid rotational transformations.

### SE lens
In a production pipeline, mixing the two is standard practice. The SE challenge is budget. WebGL environments on mobile phones crash if VRAM is exhausted. Exporting a 50,000 vertex character with 100 morph targets for every body movement would instantly blow out memory limits. The standard division of labor: skeletal for the body, blend shapes for the face.

### Commands needed
Open lesson-31.html in a modern browser.

### Run it
*Execution output stated directly per exemption:*
The scene continues to animate exactly as before. The hardware is easily handling our single 10x10 plane with two targets.

### One sentence connecting to previous unit
Understanding the memory constraints of morph targets closes out our deep dive into vertex manipulation.

## Closing

### Connect the pieces
Morph targets function entirely by passing arrays of raw XYZ coordinates into `THREE.BufferAttribute` structures attached to a geometry. The `morphTargets: true` flag enables hardware linear interpolation, letting the `morphTargetInfluences` array mathematically mix these absolute positions in real time. We bound these influences to a `THREE.AnimationMixer` using an `AnimationClip`, and shielded our logic from index changes using a `morphTargetDictionary`. Tracing the system end-to-end: with `morphTargetInfluences[waveIdx] = 0.6` and `[spikeIdx] = 0.3`, a vertex at `x=PI/4` (`dist=0.5`) computes a final Z depth of `0*(0.1) + 0.5*0.6 + max(0, 0.5)*2*0.3 = 0.3 + 0.3 = 0.6`. By blending shapes via percentages, we build the foundation for complex, organic facial animations without crushing the skeletal hierarchy.

**Next lesson:** We will proceed to skeletal structures and imported models.
