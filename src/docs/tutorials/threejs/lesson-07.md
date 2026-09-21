# Lesson 07: Shadows — castShadow, receiveShadow, Shadow Cameras

What you will build:
In this lesson, you will build a 3D scene with directional, point, and spot lights casting realistic shadows onto objects and a floor plane. The transferable problem this lesson is actually about is understanding how real-time rendering simulates occlusion through depth-map comparisons (shadow mapping), how to configure the orthogonal and perspective cameras that capture those depth maps, and how to balance visual quality against GPU memory constraints and sampling artifacts like shadow acne.

What you need to know first:
- Lessons 00-06

Terms used in this lesson:
- **Shadow map** — a depth texture rendered from the perspective of a light source, storing the distance to the closest surface. It exists to solve the problem of determining visibility from the light to determine which pixels are in shadow.
- **Percentage Closer Filtering (PCF)** — a technique that samples a shadow map multiple times around a fragment's coordinate and averages the results. It exists to solve the problem of hard, pixelated shadow edges by producing artificially soft transitions.
- **Fragment** — a potential pixel being processed by the renderer. It exists as the core unit of shading computations in a rasterization pipeline.
- **Clip space** — the coordinate system after the camera's projection matrix is applied. It exists to normalize spatial coordinates into a standard bounding volume (-1 to 1) for rendering and depth comparison.
- **Shadow acne** — a visual artifact where an illuminated surface falsely shadows itself, appearing as dark moiré patterns or stripes. It exists because shadow maps have limited resolution and precision, causing discrete depth texels to overlap smoothly curved or angled geometry.
- **Peter panning** — a visual artifact where a shadow appears disconnected from the object casting it. It exists because of applying too much shadow bias, effectively pushing the shadow start threshold too far away from the occluder.

Objects and methods used:

**THREE.WebGLRenderer**
- *What it is:* The core rendering engine that draws the 3D scene to an HTML canvas using WebGL.
- *Implementation:* `class WebGLRenderer`
- *Its use:* We reach for it to enable shadow map generation globally and configure the shadow filtering algorithm.
- *Type:* Class
- *Responsibility:* Manages the WebGL state, executes render passes (including shadow maps), and handles the final composite to the screen.
- *Depends on:* An HTML `<canvas>` element (optionally provided or created) and scene data to render.
- *Connects to:* Calls WebGL API methods; reads data from `Scene` and `Camera`.
- *Shape:* The top-level orchestrator of the rendering loop.

**renderer.shadowMap.enabled**
- *What it is:* A boolean flag on the renderer's shadow map subsystem.
- *Implementation:* `boolean` property
- *Its use:* We set it to `true` to instruct the renderer to perform the extra rendering passes required to generate depth textures from lights.
- *Type:* Property
- *Responsibility:* Gates the execution of all shadow-map-related render passes globally.
- *Depends on:* Being set to `true` before or during the render loop.
- *Connects to:* Read by the internal render pipeline to conditionally branch into shadow map generation.
- *Shape:* A global configuration switch on the renderer.

**renderer.shadowMap.type**
- *What it is:* A configuration property dictating the algorithm used to filter shadow edges.
- *Implementation:* Integer constant (e.g., `THREE.PCFSoftShadowMap`)
- *Its use:* We use it to choose between hard, fast shadows and softer, more expensive shadows.
- *Type:* Property
- *Responsibility:* Determines the shader code injected for shadow map sampling during the main render pass.
- *Depends on:* Being assigned a valid Three.js shadow map constant.
- *Connects to:* WebGL shader generation logic.
- *Shape:* A quality-versus-performance tuning dial.

**THREE.BasicShadowMap**
- *What it is:* The simplest, fastest shadow filtering algorithm.
- *Implementation:* Integer constant (value `0`)
- *Its use:* Represents a single-sample shadow lookup resulting in aliased, hard edges.
- *Type:* Constant
- *Responsibility:* Instructs the renderer to use un-filtered depth comparisons.
- *Depends on:* N/A.
- *Connects to:* Assigned to `renderer.shadowMap.type`.
- *Shape:* A baseline performance fallback.

**THREE.PCFShadowMap**
- *What it is:* A shadow algorithm that samples neighboring texels.
- *Implementation:* Integer constant (value `1`)
- *Its use:* Represents the default shadow map type, providing basic anti-aliased shadow edges.
- *Type:* Constant
- *Responsibility:* Smooths the boolean in/out shadow decision using Percentage Closer Filtering.
- *Depends on:* N/A.
- *Connects to:* Assigned to `renderer.shadowMap.type`.
- *Shape:* The middle-ground shadow algorithm.

**THREE.PCFSoftShadowMap**
- *What it is:* An enhanced version of PCF that produces even softer transitions.
- *Implementation:* Integer constant (value `2`)
- *Its use:* We reach for it to achieve visually pleasing, soft shadow edges at the cost of additional fragment shader performance.
- *Type:* Constant
- *Responsibility:* Applies a wider, softer sampling kernel during shadow lookups.
- *Depends on:* N/A.
- *Connects to:* Assigned to `renderer.shadowMap.type`.
- *Shape:* The high-quality shadow algorithm.

**THREE.DirectionalLight**
- *What it is:* A light source representing infinitely far away light, like the sun.
- *Implementation:* `class DirectionalLight extends Light`
- *Its use:* We reach for it to cast parallel rays across the scene, generating uniform shadows.
- *Type:* Class
- *Responsibility:* Illuminates objects based on a fixed direction vector; holds an internal `OrthographicCamera` for its shadow pass.
- *Depends on:* A color and intensity value; needs to be added to a scene.
- *Connects to:* Injects directional lighting data into standard materials; drives a shadow camera if configured to cast shadows.
- *Shape:* A global light source node in the scene graph.

**light.castShadow**
- *What it is:* A boolean flag on light objects.
- *Implementation:* `boolean` property
- *Its use:* We set it to `true` to designate this specific light as a shadow caster.
- *Type:* Property
- *Responsibility:* Instructs the renderer to allocate a shadow map and render the scene from this light's perspective.
- *Depends on:* `renderer.shadowMap.enabled` also being `true`.
- *Connects to:* Triggers the creation and update of `light.shadow`.
- *Shape:* A per-light configuration toggle.

**mesh.castShadow**
- *What it is:* A boolean flag on 3D objects (meshes).
- *Implementation:* `boolean` property
- *Its use:* We set it to `true` to make this object block light and write its depth to shadow maps.
- *Type:* Property
- *Responsibility:* Determines if this mesh is included in the shadow-map generation render pass.
- *Depends on:* A shadow-casting light existing in the scene.
- *Connects to:* Read by the renderer during the shadow map render pass.
- *Shape:* A per-object shadow contribution switch.

**mesh.receiveShadow**
- *What it is:* A boolean flag on 3D objects (meshes).
- *Implementation:* `boolean` property
- *Its use:* We set it to `true` to make this object sample shadow maps and darken its surface where occluded.
- *Type:* Property
- *Responsibility:* Instructs the material shader to execute shadow map lookups during the main render pass.
- *Depends on:* A shadow-casting light and shadow maps being enabled.
- *Connects to:* Triggers shader code inclusion for shadow receiving.
- *Shape:* A per-object shadow reception switch.

**light.shadow.camera**
- *What it is:* The internal camera used by a light to render its depth map.
- *Implementation:* `Camera` instance (`OrthographicCamera` for directional lights, `PerspectiveCamera` for spots/points).
- *Its use:* We manipulate its bounds (left, right, top, bottom, near, far) to tightly bound the shadowed area.
- *Type:* Property holding an Object
- *Responsibility:* Defines the projection matrix for the light's point of view.
- *Depends on:* The light type deciding which camera class to instantiate.
- *Connects to:* Used by the renderer to transform geometry during the shadow pass.
- *Shape:* The frustum defining where shadows can exist for this light.

**light.shadow.mapSize**
- *What it is:* A 2D vector defining the resolution of the depth texture.
- *Implementation:* `Vector2` holding `width` and `height` properties.
- *Its use:* We increase these values to get sharper shadows or decrease them to save GPU memory.
- *Type:* Property
- *Responsibility:* Determines the pixel dimensions of the allocated WebGL texture for the shadow map.
- *Depends on:* Must be a power of two (e.g., 512, 1024, 2048) in older WebGL contexts, though generally flexible in modern WebGL.
- *Connects to:* Used by WebGL to allocate texture memory.
- *Shape:* A resolution configuration object.

**light.shadow.bias**
- *What it is:* A scalar offset applied during shadow depth comparisons.
- *Implementation:* `number` property (default 0)
- *Its use:* We set a small negative value (like `-0.001`) to push the shadow threshold away from the light, preventing shadow acne.
- *Type:* Property
- *Responsibility:* Artificially alters the depth value sampled from the shadow map before comparing it to the fragment's depth.
- *Depends on:* Manual tuning based on scene scale and shadow map resolution.
- *Connects to:* Injected into the fragment shader's shadow comparison logic.
- *Shape:* A mathematical offset to fix precision artifacts.

**light.shadow.normalBias**
- *What it is:* A bias applied along the geometric normal of the surface rather than uniformly.
- *Implementation:* `number` property (default 0)
- *Its use:* We set a small positive value (like `0.05`) to prevent shadow acne on sloped or curved surfaces.
- *Type:* Property
- *Responsibility:* Offsets the position used for the shadow lookup along the normal vector, scaling with the angle to the light.
- *Depends on:* The object having vertex normals.
- *Connects to:* Injected into the vertex shader during the shadow pass.
- *Shape:* A geometry-aware offset for precision artifacts.

**THREE.CameraHelper**
- *What it is:* A debugging utility that renders a wireframe representation of a camera's frustum.
- *Implementation:* `class CameraHelper extends LineSegments`
- *Its use:* We reach for it to visually see the bounding box of a shadow camera, aiding in tuning left/right/top/bottom properties.
- *Type:* Class
- *Responsibility:* Reads a camera's projection matrix and draws lines defining its near, far, top, bottom, left, and right planes.
- *Depends on:* Being passed a valid camera instance and being added to the scene.
- *Connects to:* Reads matrix data from the target camera and updates its own line geometry.
- *Shape:* A visual diagnostic tool.

**THREE.PointLight**
- *What it is:* A light emitting equally in all directions from a point.
- *Implementation:* `class PointLight extends Light`
- *Its use:* We reach for it to simulate light bulbs or localized energy sources; it casts shadows using a 6-face cubemap.
- *Type:* Class
- *Responsibility:* Illuminates based on distance falloff; orchestrates 6 separate shadow renders for full coverage.
- *Depends on:* A position in 3D space.
- *Connects to:* Drives distance-based shading and spherical shadow mapping.
- *Shape:* An omnidirectional light source.

**THREE.SpotLight**
- *What it is:* A light emitting in a cone shape from a point.
- *Implementation:* `class SpotLight extends Light`
- *Its use:* We reach for it to simulate flashlights or stage lights; casts shadows using a single perspective camera.
- *Type:* Class
- *Responsibility:* Illuminates fragments within a specific angle; orchestrates a perspective shadow render.
- *Depends on:* A position, a target to point at, and an angle.
- *Connects to:* Drives angular falloff shading and single-pass perspective shadow mapping.
- *Shape:* A directional, localized light source.

**Everything else in the file, not this lesson's subject but still explained:**

**THREE.Scene**
- *What it is:* The container for all 3D objects, lights, and cameras.
- *Implementation:* `class Scene extends Object3D`
- *Its use:* We create it to hold our meshes and lights.
- *Type:* Class
- *Responsibility:* Manages the graph of objects to be rendered.
- *Depends on:* Nothing to initialize, but needs children to be useful.
- *Connects to:* Passed to the renderer.
- *Shape:* The root node of the application state.

**THREE.PerspectiveCamera**
- *What it is:* A camera that uses perspective projection (things further away appear smaller).
- *Implementation:* `class PerspectiveCamera extends Camera`
- *Its use:* We use it to view the scene in a realistic manner.
- *Type:* Class
- *Responsibility:* Generates a perspective projection matrix.
- *Depends on:* Field of view, aspect ratio, near, and far planes.
- *Connects to:* Passed to the renderer.
- *Shape:* The main viewport definition.

**THREE.AmbientLight**
- *What it is:* A light that globally illuminates all objects equally without direction.
- *Implementation:* `class AmbientLight extends Light`
- *Its use:* We add it to prevent shadowed areas from being pitch black.
- *Type:* Class
- *Responsibility:* Adds a base color value to all materials regardless of normals.
- *Depends on:* Color and intensity.
- *Connects to:* Standard material shaders.
- *Shape:* A baseline illumination provider.

**THREE.Mesh**
- *What it is:* A rendered 3D object constructed from geometry and a material.
- *Implementation:* `class Mesh extends Object3D`
- *Its use:* We instantiate it to create physical entities in our scene.
- *Type:* Class
- *Responsibility:* Binds vertices (geometry) to visual properties (material) for rendering.
- *Depends on:* A `BufferGeometry` and a `Material`.
- *Connects to:* Added to the scene; read by the renderer.
- *Shape:* A visible node in the scene graph.

**THREE.SphereGeometry**
- *What it is:* A class that generates vertex data for a sphere.
- *Implementation:* `class SphereGeometry extends BufferGeometry`
- *Its use:* We use it to create a ball to cast a shadow.
- *Type:* Class
- *Responsibility:* Calculates coordinates, normals, and UVs for a sphere.
- *Depends on:* Radius, width segments, height segments.
- *Connects to:* Passed to a Mesh.
- *Shape:* A mathematical definition of a shape.

**THREE.PlaneGeometry**
- *What it is:* A class that generates vertex data for a flat 2D rectangle in 3D space.
- *Implementation:* `class PlaneGeometry extends BufferGeometry`
- *Its use:* We use it to create a floor to receive shadows.
- *Type:* Class
- *Responsibility:* Calculates coordinates, normals, and UVs for a plane.
- *Depends on:* Width and height dimensions.
- *Connects to:* Passed to a Mesh.
- *Shape:* A mathematical definition of a shape.

**THREE.MeshStandardMaterial**
- *What it is:* A physically-based rendering (PBR) material.
- *Implementation:* `class MeshStandardMaterial extends Material`
- *Its use:* We use it because it correctly reacts to lighting and shadows.
- *Type:* Class
- *Responsibility:* Defines how the surface interacts with light (roughness, metalness, color).
- *Depends on:* Configuration parameters like color.
- *Connects to:* Passed to a Mesh; executed by the WebGL renderer via shaders.
- *Shape:* The surface appearance definition.

---

## Concept Unit: How shadow maps work

### The Problem
Rendering is fundamentally about drawing what is visible. When calculating the color of a surface, a directional light provides illumination — but how does the renderer know if another object is blocking that light? To draw shadows, the renderer must answer a visibility question for every pixel: "Can the light source 'see' this spot?"
Given what you know about cameras rendering depths from their own point of view, how might you use a second rendering pass to figure out what a light can see before drawing the final image?

### Introduce the concept in isolation
We will configure the renderer to enable shadow maps globally and set the algorithm to use soft shadows.

```html
<!DOCTYPE html>
<html>
<head>
    <style>body { margin: 0; } canvas { display: block; }</style>
    <script type="importmap">
        {
            "imports": {
                "three": "https://unpkg.com/three@0.160.0/build/three.module.js"
            }
        }
    </script>
</head>
<body>
    <script type="module">
        import * as THREE from 'three';
        // Shadow map algorithm:
        // PASS 1: Render scene from light's POV -> depth texture (shadowMap)
        // PASS 2: Main render. For each fragment:
        //   - Transform to light's clip space
        //   - Compare fragment depth to shadowMap depth
        //   - If fragment is farther than stored depth: it's in shadow
        
        const renderer = new THREE.WebGLRenderer();
        renderer.shadowMap.enabled = true;                    // enable shadow maps
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;     // soft shadow algorithm
        // THREE.BasicShadowMap: hard edges, fastest
        // THREE.PCFShadowMap: percentage closer filtering, smooth edges
        // THREE.PCFSoftShadowMap: softer PCF, best quality
        
        console.log('Shadow map enabled:', renderer.shadowMap.enabled);
        console.log('Shadow map type:', renderer.shadowMap.type);
    </script>
</body>
</html>
```
This isolates the global renderer configuration. Running this prints:
```text
Shadow map enabled: true
Shadow map type: 2
```
This proves that shadow maps are globally activated on the renderer object, and the filtering algorithm is set to `2`, which corresponds to the constant value of **THREE.PCFSoftShadowMap**.

### Discard the throwaway
This throwaway script is discarded. It will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are establishing the base rendering setup.
- **Files affected**: Created `lesson-07.html`.
- **Change type**: Add.
- **Location**: In a new HTML file.
- **Dependencies**: Three.js imported via CDN.

### The New Code
```html
<!DOCTYPE html>
<html>
<head>
    <style>body { margin: 0; } canvas { display: block; }</style>
    <script type="importmap">
        {
            "imports": {
                "three": "https://unpkg.com/three@0.160.0/build/three.module.js"
            }
        }
    </script>
</head>
<body>
    <canvas id="c"></canvas>
    <script type="module">
        import * as THREE from 'three';
        const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias:true});
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
5:     <script type="importmap">
6:         {
7:             "imports": {
8:                 "three": "https://unpkg.com/three@0.160.0/build/three.module.js"
9:             }
10:         }
11:     </script>
12: </head>
13: <body>
14:     <canvas id="c"></canvas>
15:     <script type="module">
16:         import * as THREE from 'three';
17:         const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias:true});
18:         renderer.setSize(window.innerWidth, window.innerHeight);
19:         renderer.shadowMap.enabled = true; // ← new
20:         renderer.shadowMap.type = THREE.PCFSoftShadowMap; // ← new
21:     </script>
22: </body>
23: </html>
```
This sets up a full-screen WebGL canvas and globally configures the renderer to support calculating shadow maps with soft filtering, though nothing is being drawn yet.

### Mechanical walkthrough
- `renderer` — The instance of `THREE.WebGLRenderer`.
- `.shadowMap` — An object nested within the renderer responsible for global shadow configuration.
- `.enabled` — A boolean property.
- `=` — The assignment operator.
- `true` — The literal boolean value activating the system.
- `renderer.shadowMap.type` — The property defining the filtering algorithm.
- `=` — The assignment operator.
- `THREE.PCFSoftShadowMap` — An integer constant (2) instructing the internal shaders to use Percentage Closer Filtering with an expanded sampling kernel for soft transitions.

### CS lens
The algorithm enabling this is fundamentally a two-pass rendering architecture. In Pass 1, the scene is not rendered to the screen; it is rendered into a framebuffer object containing a depth texture, using a camera placed exactly at the light source. This captures the distance to the closest surface the light can "see". In Pass 2, the scene is rendered normally from the player's camera. For every pixel processed, its 3D position is mathematically projected back into the light's coordinate space (clip space) to determine what its distance to the light is. If this distance is greater than the value stored in the depth texture at that coordinate, something else was closer to the light, and the current pixel is in shadow.

### SE lens
Global flags like `renderer.shadowMap.enabled` dictate behavior deep within the renderer's shader compilation pipeline. Three.js generates GLSL shader code dynamically based on these settings. By toggling this on, you are commanding the engine to inject shadow-mapping GLSL functions into the materials of your scene. Setting the type to `PCFSoftShadowMap` swaps the exact shader function used for sampling, abstracting thousands of lines of complex WebGL matrix math and texture sampling behind a single constant assignment.

### Commands needed
Open `lesson-07.html` in a modern browser.

### Run it
The screen remains black because no scene or camera has been added, but the renderer is silently primed to compute soft shadows when geometry is introduced.

### One sentence connecting to previous unit
With the renderer capable of processing shadows globally, we now need to explicitly tell the individual lights and objects in our scene to participate in this two-pass process.

---

## Concept Unit: Enabling shadows: renderer, light, and mesh

### The Problem
Even with the renderer's shadow map subsystem enabled, shadows do not automatically appear everywhere. Calculating shadows is computationally expensive, so if every tiny background object cast a shadow, performance would plummet. How do we opt-in specific entities to act as shadow casters and receivers so that the renderer only calculates depth information for the objects that actually matter?

### Introduce the concept in isolation
We will construct a minimal scene with a directional light, a sphere, and a floor, and configure exactly which objects cast and receive shadows.

```html
<!DOCTYPE html>
<html>
<head>
    <script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js"}}</script>
</head>
<body>
    <script type="module">
        import * as THREE from 'three';
        const scene = new THREE.Scene();
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        scene.add(dirLight);
        
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 32, 16),
            new THREE.MeshStandardMaterial({color: 0xff4400})
        );
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        scene.add(sphere);
        
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10),
            new THREE.MeshStandardMaterial({color: 0xaaaaaa})
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);
        
        console.log("Light castShadow:", dirLight.castShadow);
        console.log("Sphere castShadow:", sphere.castShadow);
        console.log("Floor receiveShadow:", floor.receiveShadow);
    </script>
</body>
</html>
```
This isolates the boolean flags required to complete the shadow pipeline. Running this prints:
```text
Light castShadow: true
Sphere castShadow: true
Floor receiveShadow: true
```
This proves that the properties are successfully set to `true`, configuring the `dirLight` to generate a shadow map, the `sphere` to render into it, and the `floor` (and `sphere`) to check against it.

### Discard the throwaway
This throwaway script is discarded. It will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: Modified `lesson-07.html`.
- **Change type**: Add.
- **Location**: Inside the `<script>` tag, after setting up the renderer.
- **Dependencies**: The renderer configured in the previous unit.

### The New Code
```javascript
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 5);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0x404040, 1));

const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 16),
    new THREE.MeshStandardMaterial({color: 0xff4400})
);
sphere.position.y = 0.5;
sphere.castShadow = true;
sphere.receiveShadow = true;
scene.add(sphere);

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({color: 0xaaaaaa})
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
```

### The Updated Project
```html
15:     <script type="module">
16:         import * as THREE from 'three';
17:         const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias:true});
18:         renderer.setSize(window.innerWidth, window.innerHeight);
19:         renderer.shadowMap.enabled = true;
20:         renderer.shadowMap.type = THREE.PCFSoftShadowMap;
21: 
22:         const scene = new THREE.Scene(); // ← new
23:         const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100); // ← new
24:         camera.position.set(0, 2, 5); // ← new
25: 
26:         const dirLight = new THREE.DirectionalLight(0xffffff, 1.0); // ← new
27:         dirLight.position.set(5, 10, 5); // ← new
28:         dirLight.castShadow = true; // ← new
29:         scene.add(dirLight); // ← new
30:         scene.add(new THREE.AmbientLight(0x404040, 1)); // ← new
31: 
32:         const sphere = new THREE.Mesh( // ← new
33:             new THREE.SphereGeometry(0.5, 32, 16), // ← new
34:             new THREE.MeshStandardMaterial({color: 0xff4400}) // ← new
35:         ); // ← new
36:         sphere.position.y = 0.5; // ← new
37:         sphere.castShadow = true; // ← new
38:         sphere.receiveShadow = true; // ← new
39:         scene.add(sphere); // ← new
40: 
41:         const floor = new THREE.Mesh( // ← new
42:             new THREE.PlaneGeometry(10, 10), // ← new
43:             new THREE.MeshStandardMaterial({color: 0xaaaaaa}) // ← new
44:         ); // ← new
45:         floor.rotation.x = -Math.PI / 2; // ← new
46:         floor.receiveShadow = true; // ← new
47:         scene.add(floor); // ← new
48: 
49:         function animate() { // ← new
50:             requestAnimationFrame(animate); // ← new
51:             renderer.render(scene, camera); // ← new
52:         } // ← new
53:         animate(); // ← new
54:     </script>
```
This constructs the scene graph, creates a light configured to emit shadows, places an orange sphere that both casts and receives shadows, and a grey floor that receives shadows, then starts the render loop.

### Mechanical walkthrough
- `const dirLight` — Declares a constant for the light.
- `=` — Assignment operator.
- `new THREE.DirectionalLight(0xffffff, 1.0)` — Instantiates a white directional light with intensity 1.
- `dirLight.position.set(5, 10, 5)` — Sets the light's X, Y, Z coordinates.
- `dirLight.castShadow` — Accesses the boolean flag determining if this light creates a shadow map.
- `=` — Assignment operator.
- `true` — The boolean literal enabling shadow mapping for this light.
- `scene.add(dirLight)` — Inserts the light into the scene.
- `sphere.castShadow = true` — Instructs the sphere to be drawn during the light's depth pass.
- `sphere.receiveShadow = true` — Instructs the sphere's material to sample the depth map to darken itself.
- `floor.receiveShadow = true` — Instructs the floor's material to sample the depth map. Note that `floor.castShadow` is not set because a flat floor generally doesn't cast shadows onto anything else, saving performance.

### CS lens
Shadows are essentially a 3-way logical AND gate. For a shadow to appear on the screen, three conditions must be strictly met simultaneously: (1) The global renderer must support shadow maps (`renderer.shadowMap.enabled = true`), (2) The light illuminating the area must generate depth data (`light.castShadow = true`), and (3) The object in question must participate (`mesh.castShadow` to block light, `mesh.receiveShadow` to be darkened by blocked light). Missing any one of these links means the boolean logic fails, and the shadow pipeline is completely bypassed for that fragment to save computational cycles.

### SE lens
By making shadow casting and receiving an explicit opt-in at the object level, Three.js adheres to the principle of "pay for what you use". In a video game, a dense forest might contain thousands of blades of grass. If all of them defaulted to `castShadow = true`, the GPU would grind to a halt rendering thousands of tiny depth passes. Requiring explicit activation forces the developer to deliberately architect their performance budget, enabling shadows only on major geometry (trees, buildings, characters) while leaving minor debris un-shadowed.

### Commands needed
Open `lesson-07.html` in a modern browser.

### Run it
You will see a lit orange sphere sitting on a grey floor, with a soft, distinct shadow cast diagonally across the floor by the directional light.

### One sentence connecting to previous unit
Now that the sphere is successfully casting a shadow onto the floor, we must look at how the light's internal camera dictates the quality and coverage of that shadow.

---

## Concept Unit: Shadow camera frustum — controlling shadow quality and coverage

### The Problem
If you zoom out or move the sphere further away, you might notice the shadow disappears, or the shadow edges look incredibly blocky and pixelated despite having soft filtering enabled. The depth texture generated by the light is finite in resolution (a grid of pixels) and stretches over a specific area defined by a camera. How do we control the bounding box of what the light "sees" and the resolution of the texture it renders to, ensuring the shadows cover our scene accurately without becoming pixelated?
Given what you know about cameras, what happens to the visual size of a pixel if you stretch a 512x512 image across a 100-meter field versus a 10-meter room?

### Introduce the concept in isolation
We will configure the frustum of the directional light's internal orthographic shadow camera and define its texture resolution, while using a helper to visualize the box.

```html
<!DOCTYPE html>
<html>
<head>
    <script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js"}}</script>
</head>
<body>
    <script type="module">
        import * as THREE from 'three';
        const scene = new THREE.Scene();
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.castShadow = true;
        
        // The shadow camera is an OrthographicCamera:
        dirLight.shadow.camera.left   = -10;   // shadow frustum: 20 units wide
        dirLight.shadow.camera.right  =  10;
        dirLight.shadow.camera.top    =  10;
        dirLight.shadow.camera.bottom = -10;
        dirLight.shadow.camera.near   = 0.1;
        dirLight.shadow.camera.far    = 50;
        
        // Shadow map resolution:
        dirLight.shadow.mapSize.width  = 2048;  // default 512
        dirLight.shadow.mapSize.height = 2048;
        
        scene.add(dirLight);
        
        const shadowHelper = new THREE.CameraHelper(dirLight.shadow.camera);
        scene.add(shadowHelper);
        
        console.log('Shadow map size:', dirLight.shadow.mapSize.width);
        console.log('Camera left:', dirLight.shadow.camera.left);
    </script>
</body>
</html>
```
This isolates the shadow camera dimensions and resolution settings. Running this prints:
```text
Shadow map size: 2048
Camera left: -10
```
This proves that the light holds an internal camera whose properties can be explicitly sized, and that we have quadrupled the default texture resolution to 2048x2048.

### Discard the throwaway
This throwaway script is discarded. It will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: Modified `lesson-07.html`.
- **Change type**: Add.
- **Location**: Directly after configuring `dirLight.castShadow = true`.
- **Dependencies**: The `dirLight` object.

### The New Code
```javascript
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 50;

dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;

const shadowHelper = new THREE.CameraHelper(dirLight.shadow.camera);
scene.add(shadowHelper);
```

### The Updated Project
```html
26:         const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
27:         dirLight.position.set(5, 10, 5);
28:         dirLight.castShadow = true;
29:         dirLight.shadow.camera.left = -10; // ← new
30:         dirLight.shadow.camera.right = 10; // ← new
31:         dirLight.shadow.camera.top = 10; // ← new
32:         dirLight.shadow.camera.bottom = -10; // ← new
33:         dirLight.shadow.camera.near = 0.1; // ← new
34:         dirLight.shadow.camera.far = 50; // ← new
35:         dirLight.shadow.mapSize.width = 2048; // ← new
36:         dirLight.shadow.mapSize.height = 2048; // ← new
37:         scene.add(dirLight);
38: 
39:         const shadowHelper = new THREE.CameraHelper(dirLight.shadow.camera); // ← new
40:         scene.add(shadowHelper); // ← new
```
This explicitly sizes the box volume where shadows will be calculated to a 20x20 unit wide area, increases the resolution of the depth texture for sharper edges, and adds a visible wireframe helper to show exactly what the shadow camera covers.

### Mechanical walkthrough
- `dirLight.shadow` — The object managing shadow properties for this light.
- `.camera` — The `OrthographicCamera` instance used to render the depth map.
- `.left` / `.right` / `.top` / `.bottom` — The boundaries of the orthographic projection. Setting left to -10 and right to 10 means the shadow camera captures a width of 20 units.
- `.near` / `.far` — The near and far clipping planes. Objects outside this distance range relative to the light will not cast or receive shadows.
- `.mapSize.width` / `.mapSize.height` — The resolution of the generated texture.
- `=` — Assignment operator.
- `2048` — A high-resolution power-of-two texture size.
- `const shadowHelper` — Declares a variable for the visual helper.
- `new THREE.CameraHelper(dirLight.shadow.camera)` — Instantiates a line-drawing utility that maps out the frustum of the passed camera.
- `scene.add(shadowHelper)` — Adds the wireframe box to the scene.

### CS lens
Shadow quality is entirely dependent on the ratio between the physical size of the camera's frustum and the resolution of the shadow map texture. If a `DirectionalLight`'s orthographic camera is 20 units wide, and the mapSize is 2048x2048, each pixel (texel) in the shadow map represents 20 / 2048 = 0.0098 units of physical space. This means shadows have a precision of roughly 1 centimeter. If the camera was expanded to be 200 units wide to cover a whole city block, but the mapSize stayed at 2048, each texel would cover 0.1 units (10cm), resulting in visibly jagged, blocky shadows. The engineering tradeoff is simple: larger map sizes consume more GPU memory and bandwidth.

### SE lens
Visual debugging tools like `CameraHelper` are essential for solving state problems. When a shadow inexplicably stops rendering, it is almost always because the geometry has moved outside the invisible boundary of the shadow camera's near, far, left, or right planes. By rendering the invisible mathematical volume as a tangible wireframe object on the screen, developers can visually verify that their dynamic geometry remains completely enclosed within the shadow-casting volume, turning a complex math problem into a simple bounding-box intersection check.

### Commands needed
Open `lesson-07.html` in a modern browser.

### Run it
You will see the same scene, but now there is a yellow/green wireframe box representing the exact boundaries of the directional light's shadow camera. The shadows cast by the sphere are noticeably sharper due to the 2048x2048 resolution.

### One sentence connecting to previous unit
With the shadow map stretched tightly over our geometry at a high resolution, we may now start to notice ugly mathematical artifacts occurring on the surface of the sphere itself, which we must fix next.

---

## Concept Unit: Shadow acne and bias

### The Problem
If you look closely at the illuminated surface of the sphere, you may see strange, dark banding patterns or patches of shadow where there should only be light. This is an artifact called "shadow acne". Because the shadow map depth texture has limited precision and is formed by discrete, flat pixels (texels), a curved surface being sampled against it will mathematically intersect those flat depth steps. This causes the surface to register as being slightly "behind" its own depth stored in the shadow map, falsely shadowing itself. How do we alter the math so that the surface ignores these tiny, self-inflicted depth errors?
Given that this is a mathematical comparison (`fragment depth > stored shadow depth`), what simple arithmetic operation could you apply to the values to artificially push the fragment slightly closer to the light?

### Introduce the concept in isolation
We will modify the shadow bias properties of the light to introduce an artificial offset.

```html
<!DOCTYPE html>
<html>
<head>
    <script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js"}}</script>
</head>
<body>
    <script type="module">
        import * as THREE from 'three';
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.castShadow = true;
        
        // Fix: shadow bias shifts depth comparison by a small amount
        dirLight.shadow.bias = -0.001;   // negative: push shadow slightly toward light
        // Too large a bias: 'peter panning' (shadow detaches from object)
        // Too small: acne remains. Tune manually per scene.
        
        // normalBias: bias along surface normal (better for curved geometry)
        dirLight.shadow.normalBias = 0.05;
        
        console.log('Shadow bias:', dirLight.shadow.bias);
        console.log('Normal bias:', dirLight.shadow.normalBias);
    </script>
</body>
</html>
```
This isolates the bias properties. Running this prints:
```text
Shadow bias: -0.001
Normal bias: 0.05
```
This proves that the mathematical offsets have been assigned, instructing the shader to artificially shift the depth comparisons to ignore micro-intersections.

### Discard the throwaway
This throwaway script is discarded. It will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: Modified `lesson-07.html`.
- **Change type**: Add.
- **Location**: Right after configuring the shadow map size.
- **Dependencies**: The `dirLight` object.

### The New Code
```javascript
dirLight.shadow.bias = -0.001;
dirLight.shadow.normalBias = 0.05;
```

### The Updated Project
```html
35:         dirLight.shadow.mapSize.width = 2048;
36:         dirLight.shadow.mapSize.height = 2048;
37:         dirLight.shadow.bias = -0.001; // ← new
38:         dirLight.shadow.normalBias = 0.05; // ← new
39:         scene.add(dirLight);
```
This applies a flat depth offset and a normal-based depth offset to the directional light, mathematically cleaning up the self-shadowing artifacts on curved surfaces.

### Mechanical walkthrough
- `dirLight.shadow` — The shadow configuration object for the light.
- `.bias` — A floating-point property applied universally to depth comparisons.
- `=` — Assignment operator.
- `-0.001` — A small negative value. Negative values pull the mathematical threshold closer to the light, ensuring the actual surface registers as being "in front" of the shadow depth.
- `.normalBias` — A floating-point property applied along the direction of the surface's normal vector.
- `0.05` — A positive value pushing the sampling coordinate slightly away from the surface along the normal, specifically fixing acne on curved geometry like spheres where flat bias is insufficient at grazing angles.

### CS lens
Shadow bias is a practical hack applied to floating-point imprecision. The depth texture stores 24-bit floating-point values representing distance. When the fragment shader calculates its own distance to the light to compare against the texture, floating-point rounding errors and the quantization of the texture grid mean the values rarely match perfectly. If the fragment calculates a distance of `10.00001` and the map stores `10.00000`, the comparison triggers, rendering a shadow. Adding a bias of `-0.001` changes the test to `10.00001 + (-0.001) > 10.00000`, which correctly evaluates to false. It artificially widens the tolerance for equality.

### SE lens
Tuning shadow bias is an empirical art, not an exact science. Because every 3D scene has different scales, camera sizes, and object curves, there is no single "correct" bias value. As an engineer, you must manually adjust these numbers until the visual artifacts disappear. However, applying too much bias results in an opposite artifact: "peter panning". If the bias is set to `-0.5`, the shadow threshold is pushed so far back that the shadow detaches from the base of the object, making it look like it's floating. The goal is to find the smallest possible bias that eliminates acne without causing peter panning.

### Commands needed
Open `lesson-07.html` in a modern browser.

### Run it
The sphere's surface will now be cleanly illuminated, with the dark, jagged moiré patterns entirely removed by the bias adjustments, while the main shadow on the floor remains firmly attached to the base of the sphere.

### One sentence connecting to previous unit
While the directional light accurately simulates the sun, we often need localized indoor lighting like lamps and flashlights, which calculate shadows using entirely different camera types.

---

## Concept Unit: PointLight shadows and SpotLight shadows

### The Problem
A directional light uses an orthographic box because sunlight is parallel. However, a lightbulb radiates outward in every direction spherically. An orthographic camera cannot capture a 360-degree view. To cast shadows from a point light, the engine must somehow render a depth map that covers every possible angle around the light source. How is this computationally achieved, and what are the severe performance implications of doing so?

### Introduce the concept in isolation
We will instantiate both a PointLight and a SpotLight, configure their shadow settings, and compare the underlying camera types used.

```html
<!DOCTYPE html>
<html>
<head>
    <script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js"}}</script>
</head>
<body>
    <script type="module">
        import * as THREE from 'three';
        
        // PointLight shadows: 6 shadow maps (one per cube face)
        const pointLight = new THREE.PointLight(0xffffff, 2, 20, 2);
        pointLight.castShadow = true;
        pointLight.shadow.mapSize.set(1024, 1024);
        
        // SpotLight shadow: 1 perspective shadow camera
        const spotLight = new THREE.SpotLight(0xffffff, 3);
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.set(1024, 1024);
        spotLight.shadow.camera.near = 0.5;
        spotLight.shadow.camera.far  = 20;
        spotLight.shadow.camera.fov  = 30;
        
        console.log('PointLight shadow camera type:', pointLight.shadow.camera.type);
        console.log('SpotLight shadow camera type:', spotLight.shadow.camera.type);
    </script>
</body>
</html>
```
This isolates the creation of omnidirectional and conical shadow casters. Running this prints:
```text
PointLight shadow camera type: PerspectiveCamera
SpotLight shadow camera type: PerspectiveCamera
```
This proves that unlike directional lights, these localized lights use perspective projection to map depth radiating outward from a point.

### Discard the throwaway
This throwaway script is discarded. It will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: Modified `lesson-07.html`.
- **Change type**: Add.
- **Location**: After adding the `dirLight`.
- **Dependencies**: The scene and previously configured renderer.

### The New Code
```javascript
const spotLight = new THREE.SpotLight(0xffffff, 3);
spotLight.position.set(-5, 5, 0);
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;
spotLight.shadow.camera.near = 0.5;
spotLight.shadow.camera.far = 20;
spotLight.shadow.camera.fov = 45;
scene.add(spotLight);

const spotHelper = new THREE.CameraHelper(spotLight.shadow.camera);
scene.add(spotHelper);
```

### The Updated Project
```html
40:         scene.add(shadowHelper);
41: 
42:         const spotLight = new THREE.SpotLight(0xffffff, 3); // ← new
43:         spotLight.position.set(-5, 5, 0); // ← new
44:         spotLight.castShadow = true; // ← new
45:         spotLight.shadow.mapSize.width = 1024; // ← new
46:         spotLight.shadow.mapSize.height = 1024; // ← new
47:         spotLight.shadow.camera.near = 0.5; // ← new
48:         spotLight.shadow.camera.far = 20; // ← new
49:         spotLight.shadow.camera.fov = 45; // ← new
50:         scene.add(spotLight); // ← new
51: 
52:         const spotHelper = new THREE.CameraHelper(spotLight.shadow.camera); // ← new
53:         scene.add(spotHelper); // ← new
54: 
55:         const sphere = new THREE.Mesh(
```
This adds a spotlight to the left side of the scene, pointing inwards. Because it is a spotlight, its internal shadow camera is a `PerspectiveCamera` with a field-of-view (`fov`) defining the cone of its light and shadows. A helper is added to visualize this perspective cone.

### Mechanical walkthrough
- `const spotLight` — Declares the new localized light.
- `new THREE.SpotLight(0xffffff, 3)` — Instantiates it with a color and an intensity of 3.
- `spotLight.position.set(-5, 5, 0)` — Positions it to the left and slightly elevated.
- `spotLight.castShadow = true` — Instructs it to generate a shadow map.
- `spotLight.shadow.mapSize.width = 1024` — Sets the texture resolution for the perspective depth map.
- `spotLight.shadow.camera.fov = 45` — Sets the field-of-view in degrees for the internal perspective camera. This should generally match the spread angle of the spotlight itself.
- `scene.add(spotLight)` — Adds it to the render graph.
- `new THREE.CameraHelper(spotLight.shadow.camera)` — Creates a wireframe visualization of the perspective frustum (a truncated pyramid shape).

### CS lens
While a `SpotLight` uses a single perspective camera to capture its cone of influence (rendering the scene once per frame for shadows), a `PointLight` is significantly more complex. To capture shadows in 360 degrees, a `PointLight` internally uses 6 different perspective cameras arranged in a cube (facing +X, -X, +Y, -Y, +Z, -Z). It generates a "cubemap" texture. This means turning on `castShadow = true` for a single `PointLight` forces the engine to render the entire scene geometry **6 times** just to build the shadow map. This is a massive computational burden. The hierarchy of shadow performance cost is: `DirectionalLight` (1 orthographic pass) <= `SpotLight` (1 perspective pass) << `PointLight` (6 perspective passes).

### SE lens
Engineers must heavily constrain the use of `PointLight` shadows due to their 6x rendering cost. A common architectural pattern in game engines is to fake omnidirectional light. Instead of using a shadow-casting `PointLight`, an engineer might use a non-shadowing `PointLight` to provide the illumination, and pair it with a downward-facing `SpotLight` that only casts shadows directly underneath the source where the player expects to see them. This achieves the visual feel of a local lamp while reducing the render passes from 6 back down to 1.

### Commands needed
Open `lesson-07.html` in a modern browser.

### Run it
You will now see a second, distinct shadow cast onto the floor originating from the left. The `CameraHelper` visualizes the `SpotLight`'s shadow camera as a distinct pyramid spreading outward from the point source, proving its perspective nature.

### One sentence connecting to previous unit
By combining orthographic global lights and perspective localized lights, you can orchestrate complex, multi-source shadows while managing the heavy performance costs associated with depth-map rendering.

---

## Closing

### Connect the pieces
Tracing a single shadow pixel backward illuminates the entire pipeline. The floor pixel begins being processed in the main render pass. The shader checks `renderer.shadowMap.enabled` and sees it is true. It checks the floor's `receiveShadow` flag and sees it is true. The shader then mathematically projects the 3D coordinate of the floor pixel into the invisible orthographic bounding box defined by the `DirectionalLight`'s shadow camera (`left`, `right`, `top`, `bottom`). It calculates the distance from the light to this floor pixel. It then samples the 2048x2048 depth texture generated during the light's earlier Pass 1 to find out what the closest recorded distance is at that coordinate. It applies the `-0.001` `bias` to fix floating-point acne, and compares the values. Because the `sphere` had `castShadow = true`, its closer distance was recorded in the texture. The comparison reveals the sphere's recorded depth is closer than the floor's distance. The shader uses the `PCFSoftShadowMap` algorithm to sample surrounding pixels, softening the transition, and returns a darkened color. The result is a perfect, soft-edged silhouette of the sphere draped across the flat floor.
