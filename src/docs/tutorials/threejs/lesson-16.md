# Lesson 16: GLTFLoader — Loading .glb Models from the Web

**What you will build**
You will build a Three.js scene that loads and displays 3D models from the web using GLTFLoader. The transferable problem here is fetching external binary assets, parsing them into an active scene graph, normalizing their scale and position, and extracting their embedded animations to play them in a render loop.

**What you need to know first**
- You need to know the basic Three.js scene setup from Lesson 1.
- You need to know about meshes and materials from Lesson 4.
- You need to know about the render loop from Lesson 3.

**Pipeline diagram**
Asset -> Network -> GLTFLoader -> Scene Graph -> WebGLRenderer

**Terms used in this lesson**
- **GLTF (GL Transmission Format)** — The standard 3D file format for the web. It is designed for efficient transmission and loading of 3D scenes and models.
- **GLB** — The binary version of GLTF. It packages geometry, textures, and materials into a single file.
- **BufferGeometry** — The Three.js representation of 3D geometry, storing data in typed arrays for performance.
- **PBR (Physically Based Rendering)** — A rendering approach that simulates how light interacts with surfaces in the real world.
- **AnimationClip** — A reusable set of keyframe tracks representing an animation.

**Objects and methods used**
- **GLTFLoader**
  - *What it is:* A Three.js addon class that loads GLTF and GLB files.
  - *Implementation:* `import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';`
  - *Its use:* To fetch and parse 3D models from a URL into a Three.js scene.
  - *Type:* Class
  - *Responsibility:* Handles the asynchronous downloading, parsing, and construction of Three.js objects from a GLTF file.
  - *Depends on:* A valid URL to a GLTF/GLB file.
  - *Connects to:* WebGLRenderer, Scene.
  - *Shape:* A utility class used in the setup phase of a scene.

- **traverse()**
  - *What it is:* A method on Object3D that executes a callback on the object and all its descendants.
  - *Implementation:* `object.traverse(callback)`
  - *Its use:* To iterate through all the meshes inside a loaded model to modify their properties (like shadow casting).
  - *Type:* Instance method
  - *Responsibility:* Provides a way to apply operations recursively through the scene graph.
  - *Depends on:* A callback function.
  - *Connects to:* Object3D descendants.
  - *Shape:* Tree traversal algorithm.

- **Box3**
  - *What it is:* A mathematical 3D bounding box (AABB - Axis-Aligned Bounding Box).
  - *Implementation:* `new THREE.Box3().setFromObject(model)`
  - *Its use:* To calculate the size and center of an arbitrary loaded model to normalize it.
  - *Type:* Class
  - *Responsibility:* Computes the extents of 3D objects to aid in spatial calculations.
  - *Depends on:* A target Object3D.
  - *Connects to:* Vector3.
  - *Shape:* Mathematical utility.

- **AnimationMixer**
  - *What it is:* The player for animations on a particular object in the scene.
  - *Implementation:* `new THREE.AnimationMixer(object)`
  - *Its use:* To manage and blend multiple animations for a loaded model.
  - *Type:* Class
  - *Responsibility:* Updates the state of an animated object based on the elapsed time.
  - *Depends on:* A target Object3D and time delta.
  - *Connects to:* AnimationClip, Clock.
  - *Shape:* Animation controller.

- **DRACOLoader**
  - *What it is:* A loader for geometry compressed with the Draco library.
  - *Implementation:* `import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';`
  - *Its use:* To decode highly compressed models to save bandwidth.
  - *Type:* Class
  - *Responsibility:* Decompresses Draco-encoded geometry using WebAssembly.
  - *Depends on:* A path to the Draco decoder WASM files.
  - *Connects to:* GLTFLoader.
  - *Shape:* A decompression plugin for the GLTF loader.

## Concept Unit: Loading a .glb file

### The Problem
How do we load an external 3D model file into our Three.js scene when the file is hosted on a remote server?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const gltf = await loader.loadAsync('https://threejs.org/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb');
console.log('GLTF loaded in isolation!', gltf.scene);
```
Output: `GLTF loaded in isolation! Group { ... }`
This proves that the GLTFLoader successfully fetches the file and creates a Three.js Group containing the scene data. This is called a **GLTFLoader instance**.

### Discard the throwaway
This throwaway snippet is deleted and will not appear in the project again.

### Project Change
- **Reference Source** — No reference counterpart — this is a from-scratch addition.
- **Files affected** — `lesson-16.html` (modified).
- **Change type** — Add.
- **Location** — Inside the `<script type="module">` block, after scene setup.
- **Dependencies** — Three.js library and GLTFLoader addon.

### The New Code
```javascript
const loader = new GLTFLoader();
loader.load(
    'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
    (gltf) => {
        console.log('GLTF loaded!');
        console.log('Scene:', gltf.scene);
        console.log('Animations:', gltf.animations.length);
        scene.add(gltf.scene);
    },
    (xhr) => console.log('Loading:', (xhr.loaded/xhr.total*100).toFixed(0) + '%'),
    (err) => console.error('Error:', err)
);
```

### The Updated Project
```javascript
1: import * as THREE from 'three';
2: import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
3: 
4: const scene = new THREE.Scene();
5: 
6: // ← new
7: const loader = new GLTFLoader();
8: loader.load(
9:     'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
10:     (gltf) => {
11:         console.log('GLTF loaded!');
12:         console.log('Scene:', gltf.scene);
13:         console.log('Animations:', gltf.animations.length);
14:         scene.add(gltf.scene);
15:     },
16:     (xhr) => console.log('Loading:', (xhr.loaded/xhr.total*100).toFixed(0) + '%'),
17:     (err) => console.error('Error:', err)
18: );
```

### Mechanical walkthrough
- `const loader = new GLTFLoader();`: Creates an instance of the GLTFLoader. This object is responsible for making the network request and parsing the binary data.
- `loader.load(...)`: Initiates the asynchronous loading process.
- `'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb'`: The URL of the model to load.
- `(gltf) => { ... }`: The onLoad callback. `gltf` is an object containing the parsed scene, animations, and cameras.
- `console.log('GLTF loaded!');`: Logs a success message.
- `console.log('Scene:', gltf.scene);`: Logs the root object of the loaded model.
- `console.log('Animations:', gltf.animations.length);`: Logs the number of animations found.
- `scene.add(gltf.scene);`: Adds the root Group of the loaded model into our active Three.js scene so it can be rendered.
- `(xhr) => ...`: The onProgress callback, providing progress events.
- `(err) => ...`: The onError callback, handling network or parsing failures.

### CS lens
Asynchronous asset loading is a fundamental computer science concept for web applications. The main thread cannot block while waiting for a multi-megabyte file to download over the network. Callbacks or Promises are used to handle the completion event without freezing the UI.

### SE lens
Using standard formats like GLTF decouples the asset creation pipeline from the rendering code. Artists can author models in Blender, export a `.glb`, and the engine can consume it transparently without needing custom parsers for proprietary formats.

### Commands needed
Open lesson-16.html served via http.server. Run: `python3 -m http.server 8080`

### Run it
The browser network tab will show the `.glb` downloading. The console will log loading percentages, followed by the parsed Scene object. The model will appear in the scene.

### One sentence connecting to previous unit
Now that we have the model in our scene graph, we need to inspect and modify its internal structure.

## Concept Unit: Traversing the loaded model

### The Problem
How do we apply material changes or enable shadows on every individual mesh piece inside a complex, multi-part loaded model?

### Introduce the concept in isolation
```javascript
const testGroup = new THREE.Group();
const testMesh = new THREE.Mesh();
testMesh.name = "TestMesh";
testGroup.add(testMesh);

testGroup.traverse((child) => {
    if (child.isMesh) {
        console.log('Found mesh in isolation:', child.name);
    }
});
```
Output: `Found mesh in isolation: TestMesh`
This proves that the `traverse()` method executes the callback on all descendant objects. This is called a **scene graph traversal**.

### Discard the throwaway
This throwaway snippet is deleted and will not appear in the project again.

### Project Change
- **Reference Source** — No reference counterpart.
- **Files affected** — `lesson-16.html` (modified).
- **Change type** — Add.
- **Location** — Inside the `onLoad` callback of `loader.load()`.
- **Dependencies** — None.

### The New Code
```javascript
gltf.scene.traverse((child) => {
    if (child.isMesh) {
        console.log('Mesh:', child.name);
        console.log('  Vertices:', child.geometry.attributes.position.count);
        console.log('  Material:', child.material.constructor.name);
        child.castShadow = true;
        child.receiveShadow = true;
    }
});
```

### The Updated Project
```javascript
1: loader.load(
2:     'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
3:     (gltf) => {
4:         scene.add(gltf.scene);
5:         // ← new
6:         gltf.scene.traverse((child) => {
7:             if (child.isMesh) {
8:                 console.log('Mesh:', child.name);
9:                 console.log('  Vertices:', child.geometry.attributes.position.count);
10:                 console.log('  Material:', child.material.constructor.name);
11:                 child.castShadow = true;
12:                 child.receiveShadow = true;
13:             }
14:         });
15:     }
16: );
```

### Mechanical walkthrough
- `gltf.scene.traverse(...)`: Starts a depth-first search on the root object of the loaded model.
- `(child) => { ... }`: The callback function executed for each descendant.
- `if (child.isMesh)`: A boolean flag provided by Three.js that is true if the child is a `THREE.Mesh`.
- `console.log('Mesh:', child.name);`: Logs the name of the mesh.
- `console.log('  Vertices:', child.geometry.attributes.position.count);`: Logs the vertex count.
- `console.log('  Material:', child.material.constructor.name);`: Logs the material type.
- `child.castShadow = true;`: Enables the mesh to cast shadows onto other objects.
- `child.receiveShadow = true;`: Enables the mesh to receive shadows from other objects.

### CS lens
Tree traversal (specifically depth-first search) is the standard algorithm for visiting every node in a hierarchical data structure like a scene graph.

### SE lens
The Visitor pattern is applied here. `traverse` accepts a visitor function and handles the recursive iteration, allowing developers to inject arbitrary logic without modifying the underlying data structures.

### Commands needed
Open lesson-16.html served via http.server. Run: `python3 -m http.server 8080`

### Run it
The console will log the name, vertex count, and material type of every mesh inside the GLTF model. Shadows will be enabled on all parts.

### One sentence connecting to previous unit
With the model properly configured, we often find that arbitrary models from the web are too large or off-center, requiring mathematical normalization.

## Concept Unit: Centering and scaling

### The Problem
How do we ensure an arbitrary loaded model fits perfectly in our camera view, regardless of its original size or coordinate origin?

### Introduce the concept in isolation
```javascript
const box = new THREE.Box3();
box.setFromCenterAndSize(new THREE.Vector3(10, 10, 10), new THREE.Vector3(2, 4, 2));
const center = box.getCenter(new THREE.Vector3());
console.log('Isolated center:', center.x, center.y, center.z);
```
Output: `Isolated center: 10 10 10`
This proves that a `Box3` can accurately calculate spatial extents and centers. This is called **bounding box computation**.

### Discard the throwaway
This throwaway snippet is deleted and will not appear in the project again.

### Project Change
- **Reference Source** — No reference counterpart.
- **Files affected** — `lesson-16.html` (modified).
- **Change type** — Add.
- **Location** — Inside the `onLoad` callback, after adding to the scene.
- **Dependencies** — None.

### The New Code
```javascript
const model = gltf.scene;
const box = new THREE.Box3().setFromObject(model);
const center = box.getCenter(new THREE.Vector3());
const size = box.getSize(new THREE.Vector3());
const maxDim = Math.max(size.x, size.y, size.z);
model.position.sub(center);
model.scale.setScalar(2 / maxDim);
console.log('Center:', center);
console.log('Scale:', (2/maxDim).toFixed(3));
```

### The Updated Project
```javascript
1: loader.load(
2:     'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
3:     (gltf) => {
4:         scene.add(gltf.scene);
5:         
6:         // ← new
7:         const model = gltf.scene;
8:         const box = new THREE.Box3().setFromObject(model);
9:         const center = box.getCenter(new THREE.Vector3());
10:         const size = box.getSize(new THREE.Vector3());
11:         const maxDim = Math.max(size.x, size.y, size.z);
12:         model.position.sub(center);
13:         model.scale.setScalar(2 / maxDim);
14:         console.log('Center:', center);
15:         console.log('Scale:', (2/maxDim).toFixed(3));
16:     }
17: );
```

### Mechanical walkthrough
- `const model = gltf.scene;`: Creates a local reference to the root group.
- `const box = new THREE.Box3().setFromObject(model);`: Calculates an Axis-Aligned Bounding Box that encloses all meshes within the model.
- `const center = box.getCenter(new THREE.Vector3());`: Computes the center point of the bounding box and stores it in the provided vector.
- `const size = box.getSize(new THREE.Vector3());`: Computes the dimensions (width, height, depth) of the bounding box.
- `const maxDim = Math.max(size.x, size.y, size.z);`: Finds the largest dimension of the model.
- `model.position.sub(center);`: Subtracts the center offset from the model's position, shifting its pivot exactly to the origin (0,0,0).
- `model.scale.setScalar(2 / maxDim);`: Scales the model uniformly so its largest dimension is exactly 2 units long.
- `console.log(...)`: Logs the computed center and scale factor.

### CS lens
Normalization of data (mapping arbitrary bounds into a standardized `[-1, 1]` or `[0, 2]` range) is common in graphics to simplify viewing logic, ensuring models are always visible and proportional.

### SE lens
Writing defensive, generalized code to normalize external assets protects your application from badly exported data (e.g., a model saved with a 1000x scale offset in Blender).

### Commands needed
Open lesson-16.html served via http.server. Run: `python3 -m http.server 8080`

### Run it
The model will instantly jump to the center of the screen and resize itself to fit comfortably within the camera's default view, regardless of its original size.

### One sentence connecting to previous unit
With the model loaded and normalized, we can now extract and play any embedded animations it contains.

## Concept Unit: Playing GLTF animations

### The Problem
How do we extract keyframe animations stored inside a `.glb` file and play them continuously in our render loop?

### Introduce the concept in isolation
```javascript
const mixer = new THREE.AnimationMixer(new THREE.Object3D());
console.log('Mixer created in isolation:', mixer !== null);
```
Output: `Mixer created in isolation: true`
This proves that an `AnimationMixer` can be attached to any 3D object to manage its animation state. This is called an **Animation Controller**.

### Discard the throwaway
This throwaway snippet is deleted and will not appear in the project again.

### Project Change
- **Reference Source** — No reference counterpart.
- **Files affected** — `lesson-16.html` (modified).
- **Change type** — Add.
- **Location** — Below the loader block, creating an animation loop.
- **Dependencies** — None.

### The New Code
```javascript
const mixer = new THREE.AnimationMixer(gltf.scene);
if (gltf.animations.length > 0) {
    const action = mixer.clipAction(gltf.animations[0]);
    action.play();
    console.log('Playing animation:', gltf.animations[0].name);
}
```

### The Updated Project
```javascript
1: let mixer;
2: const clock = new THREE.Clock();
3: 
4: loader.load(
5:     'https://threejs.org/examples/models/gltf/CesiumMan/glTF-Binary/CesiumMan.glb',
6:     (gltf) => {
7:         scene.add(gltf.scene);
8:         // ← new
9:         mixer = new THREE.AnimationMixer(gltf.scene);
10:         if (gltf.animations.length > 0) {
11:             const action = mixer.clipAction(gltf.animations[0]);
12:             action.play();
13:             console.log('Playing animation:', gltf.animations[0].name);
14:         }
15:     }
16: );
17: 
18: function animate() {
19:     requestAnimationFrame(animate);
20:     // ← new
21:     if (mixer) mixer.update(clock.getDelta());
22:     renderer.render(scene, camera);
23: }
24: animate();
```

### Mechanical walkthrough
- `mixer = new THREE.AnimationMixer(gltf.scene);`: Creates an animation player attached to the root of our model.
- `if (gltf.animations.length > 0)`: Checks if the file actually contains any animation clips.
- `const action = mixer.clipAction(gltf.animations[0]);`: Converts the raw AnimationClip data into a playable AnimationAction.
- `action.play();`: Schedules the action to start playing.
- `if (mixer) mixer.update(clock.getDelta());`: Advances the mixer forward in time by the seconds elapsed since the last frame.

### CS lens
Keyframe interpolation requires knowing the exact time delta between frames. By multiplying velocities by `clock.getDelta()`, animations play at the same speed regardless of the monitor's refresh rate.

### SE lens
The mixer architecture separates the *data* (AnimationClip) from the *playback state* (AnimationAction). This allows the same animation clip to be played on multiple identical models simultaneously without duplicating the heavy keyframe data.

### Commands needed
Open lesson-16.html served via http.server. Run: `python3 -m http.server 8080`

### Run it
The console will log the name of the animation, and the model (CesiumMan) will begin walking, looping the animation smoothly on the screen.

### One sentence connecting to previous unit
Standard GLB files can be large, so we often use Draco compression to shrink them, which requires a specialized decoder.

## Concept Unit: DRACOLoader for compressed models

### The Problem
How do we load `.glb` files that have been heavily compressed to save bandwidth, given that standard GLTFLoader cannot read Draco compression natively?

### Introduce the concept in isolation
```javascript
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
const isolatedDraco = new DRACOLoader();
isolatedDraco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
console.log('Isolated DRACO decoder path:', isolatedDraco.decoderPath);
```
Output: `Isolated DRACO decoder path: https://www.gstatic.com/draco/versioned/decoders/1.5.6/`
This proves the Draco loader correctly stores the path to the WASM decompilers. This is called a **decompression plugin**.

### Discard the throwaway
This throwaway snippet is deleted and will not appear in the project again.

### Project Change
- **Reference Source** — No reference counterpart.
- **Files affected** — `lesson-16.html` (modified).
- **Change type** — Add.
- **Location** — Before the GLTFLoader instantiation.
- **Dependencies** — DRACOLoader addon.

### The New Code
```javascript
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
```

### The Updated Project
```javascript
1: import * as THREE from 'three';
2: import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
3: // ← new
4: import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
5: 
6: // ← new
7: const dracoLoader = new DRACOLoader();
8: dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
9: 
10: const loader = new GLTFLoader();
11: // ← new
12: loader.setDRACOLoader(dracoLoader);
13: 
14: loader.load('path/to/compressed.glb', (gltf) => {
15:     scene.add(gltf.scene);
16: });
```

### Mechanical walkthrough
- `import { DRACOLoader } ...`: Imports the Draco loader utility.
- `const dracoLoader = new DRACOLoader();`: Creates an instance of the Draco loader.
- `dracoLoader.setDecoderPath('...');`: Tells the loader where to fetch the WebAssembly (`.wasm`) files needed to decode the compression algorithm. Google hosts these publicly.
- `loader.setDRACOLoader(dracoLoader);`: Injects the Draco plugin into the main GLTFLoader. If the GLTFLoader encounters a mesh with the `KHR_draco_mesh_compression` extension, it will hand it off to the Draco loader for processing.

### CS lens
WebAssembly (WASM) allows running compiled C++ code (the Draco decoder) in the browser at near-native speeds. Decompressing complex geometry requires heavy mathematical processing that JavaScript is too slow to handle efficiently during load time.

### SE lens
Using an external decoder path prevents the heavy WASM binaries from being bundled into your main application payload. They are only fetched if and when a Draco-compressed model is actually encountered.

### Commands needed
Open lesson-16.html served via http.server. Run: `python3 -m http.server 8080`

### Run it
When loading a compressed `.glb`, you will see additional network requests for `draco_wasm_wrapper.js` and `draco_decoder.wasm`. The model will then appear identically to a non-compressed version.

### One sentence connecting to previous unit
All the pieces are now in place to load, inspect, normalize, animate, and decode 3D assets from the web efficiently.

## Closing

### Connect the pieces
In this lesson, we established the pipeline for bringing external 3D data into our Three.js application. We instantiated a `GLTFLoader` to fetch a binary `.glb` file. We used `traverse()` to iterate through its hierarchical scene graph to apply material settings like shadows. We leveraged `Box3` math to calculate the object's spatial bounds, allowing us to mathematically normalize its scale and position. For animated models, we bound an `AnimationMixer` to the root scene object and advanced it via time deltas in our render loop. Finally, we integrated the `DRACOLoader` plugin to allow WebAssembly-powered decompression of heavily optimized geometry files. This covers the full lifecycle of ingesting standard 3D web assets.
