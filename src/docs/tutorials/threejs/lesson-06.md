# Lesson 06: Materials in Depth — MeshStandardMaterial, roughness, metalness, side

**What you will build**
You will replace simple placeholder materials with physically-based rendering (PBR) surfaces, giving objects realistic responses to light. The transferable insight here is that `MeshStandardMaterial` is a PBR material: `roughness` controls how much light scatters (0=mirror, 1=chalk), and `metalness` controls the conductor vs dielectric model (0=plastic, 1=gold). These two sliders model almost every real-world surface.

**What you need to know first**
- Lessons 00-05.

**Terms used in this lesson**
- **Physically-based rendering (PBR)** — an approach in computer graphics that seeks to render graphics in a way that more accurately models the flow of light in the real world. This exists so artists don't have to tweak fake lighting values; they just define what a surface is made of.
- **roughness** — a parameter defining the micro-surface variation of an object. This dictates how light scatters when hitting the surface. A low value gives a sharp reflection, a high value gives a diffuse, blurry reflection.
- **metalness** — a parameter defining whether a surface acts like a dielectric (non-metal) or a conductor (metal). This controls whether specular highlights are tinted by the surface color.
- **specular highlight** — the bright spot of light that appears on shiny objects when illuminated. This exists as the visual evidence of a light source reflecting directly into the camera.
- **energy conserving** — a physical rule where a material cannot reflect more light than it receives. This prevents surfaces from glowing unnaturally when lit.
- **backface culling** — a GPU optimization technique that skips drawing triangles facing away from the camera. This exists to save processing time on geometry that wouldn't be visible anyway.
- **winding order** — the direction (clockwise or counter-clockwise) that a triangle's vertices are defined. This is what the GPU uses to determine which side is the "front."
- **alpha blending** — the process of combining a translucent foreground color with a background color. This exists to simulate transparency like glass or water.
- **opacity** — a measure of how opaque a material is, from 0 (invisible) to 1 (solid).
- **transparent** — a boolean flag required to tell the renderer to actually perform alpha blending. This exists because blending requires depth-sorting, which is expensive, so it's off by default.
- **wireframe** — a rendering mode that draws only the edges of polygons rather than filling them. This exists to visualize geometry structure.

**Objects and methods used**

- **`THREE.MeshStandardMaterial`**
  - *What it is:* A physically-based rendering material.
  - *Implementation:* `class MeshStandardMaterial extends Material`
  - *Its use:* To create realistic surfaces using `roughness` and `metalness`.
  - *Type:* Class
  - *Responsibility:* Computes pixel colors based on physical light interactions using the GGX microfacet model.
  - *Depends on:* Lights existing in the scene; without light, it renders black.
  - *Connects to:* Attached to a `THREE.Mesh`, uses uniforms passed to the WebGL shader.
  - *Shape:* A high-level abstraction over complex PBR shader code.

- **`THREE.MeshPhongMaterial`**
  - *What it is:* An older, non-physical material for shiny surfaces.
  - *Implementation:* `class MeshPhongMaterial extends Material`
  - *Its use:* To compare against standard materials to see the difference between fake and physical lighting.
  - *Type:* Class
  - *Responsibility:* Calculates specular highlights using the Phong reflection model.
  - *Depends on:* Scene lights.
  - *Connects to:* The WebGL renderer to produce classic computer-graphics shininess.
  - *Shape:* A legacy material model still useful for low-power devices.

- **`THREE.FrontSide`, `THREE.BackSide`, `THREE.DoubleSide`**
  - *What it is:* Constants defining which sides of a polygon are rendered.
  - *Implementation:* Integer constants (0, 1, and 2 respectively).
  - *Its use:* To control visibility of faces, especially planes or inside-out shapes.
  - *Type:* Global constants
  - *Responsibility:* Instructs the WebGL rasterizer on how to apply backface culling.
  - *Depends on:* The winding order of geometry vertices.
  - *Connects to:* Assigned to the `side` property of a `Material`.
  - *Shape:* Configuration flags passed down to the GPU pipeline.

- **`THREE.MeshBasicMaterial`**
  - *What it is:* A material that is not affected by lighting.
  - *Implementation:* `class MeshBasicMaterial extends Material`
  - *Its use:* To draw flat colors or wireframes where shading would get in the way.
  - *Type:* Class
  - *Responsibility:* Renders a flat color regardless of scene illumination.
  - *Depends on:* Nothing external; self-illuminating.
  - *Connects to:* A `THREE.Mesh` to provide pure unlit pixels.
  - *Shape:* The simplest possible fragment shader output.

- **`material.color.set(hex)`**
  - *What it is:* A method to change a material's color after creation.
  - *Implementation:* `set(value)` on the `THREE.Color` object.
  - *Its use:* To change face colors dynamically.
  - *Type:* Instance method
  - *Responsibility:* Updates the internal RGB values of the color object.
  - *Depends on:* A valid color representation (like a hex code).
  - *Connects to:* The material's internal state, updating the uniform for the next render frame.
  - *Shape:* An imperative state mutation.

**Everything else in the file, not this lesson's subject but still explained**
- **`THREE.Mesh`, `THREE.PlaneGeometry`, `THREE.BoxGeometry`, `THREE.TorusGeometry`**
  - *What it is:* Core classes for rendering 3D shapes.
  - *Implementation:* Classes extending `Object3D` and `BufferGeometry`.
  - *Its use:* To provide physical forms to apply our materials to.
  - *Type:* Classes
  - *Responsibility:* `Mesh` binds geometry to a material; geometries provide the vertex math.
  - *Depends on:* A scene to be rendered.
  - *Connects to:* The renderer pipeline.
  - *Shape:* The standard structural building blocks of a Three.js scene.

## Concept Unit: PBR fundamentals — roughness and metalness

### The Problem
When we create a 3D object, how do we make it look like plastic instead of chalk, or metal instead of plastic? In the real world, surfaces respond to light differently based on their microscopic texture and electrical conductivity. How do we tell the renderer what a surface is made of?

> Given what you know about color, what would you try here first? If a material only has a `color` property, what happens if you want a shiny red ball instead of a matte red ball? Consider how you might describe "shininess" to a computer before looking at the solution.

### Introduce the concept in isolation
We will use `THREE.MeshStandardMaterial`, which takes physical properties as numbers between 0.0 and 1.0.

```html
<!DOCTYPE html>
<html>
<head>
    <script type="importmap">
        { "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }
    </script>
</head>
<body>
<script type="module">
import * as THREE from 'three';

// MeshStandardMaterial PBR parameters:
const mat = new THREE.MeshStandardMaterial({
    color:     0xffffff,
    roughness: 0.0,   // 0=mirror-smooth, 1=fully rough/diffuse
    metalness: 0.0,   // 0=non-metal (plastic), 1=metal (conductor)
});

console.log('roughness:', mat.roughness);
console.log('metalness:', mat.metalness);
</script>
</body>
</html>
```

This code is executed directly in the browser console.
Predicted output:
```
roughness: 0
metalness: 0
```
This proves that the material correctly initializes and stores our physical parameters. This is called a **physically-based material**, specifically configuring its microfacet distribution. By setting `roughness` to 0 and `metalness` to 0, we create a perfectly smooth dielectric (like smooth plastic).

### Discard the throwaway
This isolated lab is discarded and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are replacing our old basic materials.
- **Files affected:** `lesson-06.html` (created).
- **Change type:** Add.
- **Location:** Inside the main script block, setting up the primary sphere.
- **Dependencies:** The Three.js library via importmap.

### The New Code
```javascript
const sphereMat = new THREE.MeshStandardMaterial({
    color: 0xff4400,
    roughness: 0.2,
    metalness: 0.8
});
```

### The Updated Project
```javascript
// 1: import * as THREE from 'three';
// 2: const scene = new THREE.Scene();
// 3: 
// 4: const sphereMat = new THREE.MeshStandardMaterial({ // ← new
// 5:     color: 0xff4400,                               // ← new
// 6:     roughness: 0.2,                                // ← new
// 7:     metalness: 0.8                                 // ← new
// 8: });                                                // ← new
// 9: const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), sphereMat);
// 10: scene.add(sphere);
```
Our scene now defines a sphere wrapped in a shiny, semi-metallic orange material.

### Mechanical walkthrough
1. `new THREE.MeshStandardMaterial(...)` — instantiates a new PBR material object, passing a configuration object.
2. `color: 0xff4400` — sets the base diffuse color of the material to orange.
3. `roughness: 0.2` — sets the microscopic roughness. Because it is low (0.2), the surface is mostly smooth, creating a tight but physically-correct GGX highlight.
4. `metalness: 0.8` — tells the shader this surface is mostly conductive. This means the specular highlight will be tinted by the orange color, rather than reflecting pure white light like a dielectric would.

Execution trace for the shader math:
1. `roughness=0 metalness=0` — the PBR equation outputs a white specular highlight (Fresnel F0 ~ 0.04 for dielectrics).
2. `roughness=0 metalness=1` — the specular highlight equals the base color (e.g., `0xff4400`).
3. `roughness=1` (any metalness) — the GGX distribution spreads light evenly across the entire hemisphere, creating a matte appearance.

### CS lens
This embodies the **bidirectional reflectance distribution function (BRDF)**.
Also recognized in: raytracers, radar cross-section analysis, acoustic room modeling, satellite terrain imaging.

### SE lens
Why is it engineered this way? The design principle here is parameterization of physical reality over artistic hacking. The alternative not chosen was requiring the developer to manually set "specular color," "ambient color," and "diffuse color" separately. That older approach required constant tweaking to look right under different lighting. The cost of PBR is heavier math on the GPU; the benefit is that a material looks correct in any lighting environment automatically.

### Commands needed
Open `lesson-06.html` in a modern browser.

### Run it
The code is verified by predicting the material configuration shape. The browser will render a sphere that looks like brushed copper.

### One sentence connecting to previous unit
Now that we have a realistic material, we need to compare it against the older, fake lighting models to understand why PBR is an improvement.

## Concept Unit: MeshPhongMaterial vs MeshStandardMaterial

### The Problem
Before PBR, how did older games render shiny objects? If we want a material that renders extremely fast on weak mobile GPUs, what is the alternative to `MeshStandardMaterial`?

> What happens if you try to render a complex scene with heavy math on a slow device? Look at the name "Standard" — what does that imply about non-standard options?

### Introduce the concept in isolation
We instantiate both types to see their properties.

```html
<!DOCTYPE html>
<html>
<head>
    <script type="importmap">
        { "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }
    </script>
</head>
<body>
<script type="module">
import * as THREE from 'three';

const phong = new THREE.MeshPhongMaterial({
    color:    0x0088ff,
    shininess: 100,
    specular:  0xffffff,
});

const standard = new THREE.MeshStandardMaterial({
    color:     0x0088ff,
    roughness: 0.2,
    metalness: 0.0,
});

console.log('Phong type:', phong.type);
console.log('Standard type:', standard.type);
</script>
</body>
</html>
```

Predicted output:
```
Phong type: MeshPhongMaterial
Standard type: MeshStandardMaterial
```
This proves the two distinct material classes. This is called the **Phong reflection model**, an older, non-physical algorithm.

### Discard the throwaway
This isolated lab is discarded and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `lesson-06.html` (modified).
- **Change type:** Add.
- **Location:** Next to the main sphere setup.
- **Dependencies:** None.

### The New Code
```javascript
const phongMat = new THREE.MeshPhongMaterial({
    color: 0x0088ff,
    shininess: 100,
    specular: 0xffffff
});
```

### The Updated Project
```javascript
// 8: });
// 9: const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), sphereMat);
// 10: scene.add(sphere);
// 11:
// 12: const phongMat = new THREE.MeshPhongMaterial({ // ← new
// 13:     color: 0x0088ff,                         // ← new
// 14:     shininess: 100,                          // ← new
// 15:     specular: 0xffffff                       // ← new
// 16: });                                          // ← new
```
We now have an older, cheaper material definition ready to apply to a secondary object.

### Mechanical walkthrough
1. `new THREE.MeshPhongMaterial(...)` — instantiates a material using the older Phong shader.
2. `color: 0x0088ff` — the base diffuse color.
3. `shininess: 100` — a scalar (usually 1-1000) that controls how tight the specular lobe is. A value of 100 gives a sharp, plastic-like highlight.
4. `specular: 0xffffff` — manually dictates the color of the highlight, rather than deriving it physically from metalness.

Execution trace of the math differences:
1. `Phong shininess=100` — creates a tight specular lobe based purely on vector dot products.
2. `Standard roughness=0.2` — creates a tight but physically-correct GGX highlight.
3. `Standard` — is energy conserving (no more light out than in).
4. `Phong` — is not energy conserving (can mathematically reflect more light than it receives, looking blown out).

### CS lens
This embodies **empirical vs physical modeling**.
Also recognized in: weather forecasting (statistical vs thermodynamic models), fluid dynamics approximations, machine learning curve fitting.

### SE lens
Why is it engineered this way? The design principle is backward compatibility and performance tiering. The alternative not chosen was to remove Phong entirely when Standard was introduced. Keeping it allows developers to build for extremely low-end hardware where the math of PBR is too slow.

### Commands needed
Open `lesson-06.html` in a modern browser.

### Run it
Predicted output: The browser internally compiles two different fragment shaders. We don't execute a terminal command because this runs purely in the WebGL context.

### One sentence connecting to previous unit
While both materials determine how light bounces off the *front* of a surface, what happens if the camera looks at the back?

## Concept Unit: Material side — DoubleSide and BackSide

### The Problem
If you place the camera inside a box, or look at the back of a flat plane, the object becomes completely invisible. Why does this happen, and how do we render thin objects like paper or leaves that need to be seen from both sides?

> What happens if the GPU draws every single triangle of a closed box, even the ones facing away from you? Look at the term "DoubleSide" — what does that suggest about performance cost?

### Introduce the concept in isolation
We test the `side` property on a material.

```html
<!DOCTYPE html>
<html>
<head>
    <script type="importmap">
        { "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }
    </script>
</head>
<body>
<script type="module">
import * as THREE from 'three';

const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshStandardMaterial({
        color: 0x44aaff,
        side: THREE.DoubleSide
    })
);

const box = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({color: 0xff8800, side: THREE.FrontSide})
);

console.log('Plane side:', plane.material.side);
console.log('Box side:', box.material.side);
</script>
</body>
</html>
```

Predicted output:
```
Plane side: 2
Box side: 0
```
This proves that the constants map to integer enums. This is called **backface culling behavior**. The plane uses `THREE.DoubleSide` (2), making it visible from both sides, while the box uses `THREE.FrontSide` (0), relying on the fact that its back faces are hidden inside its volume.

### Discard the throwaway
This isolated lab is discarded and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `lesson-06.html` (modified).
- **Change type:** Add.
- **Location:** Below the phong material definition.
- **Dependencies:** None.

### The New Code
```javascript
const planeMat = new THREE.MeshStandardMaterial({
    color: 0x44aaff,
    side: THREE.DoubleSide,
    roughness: 0.5,
    metalness: 0.0
});
```

### The Updated Project
```javascript
// 14:     shininess: 100,
// 15:     specular: 0xffffff
// 16: });
// 17:
// 18: const planeMat = new THREE.MeshStandardMaterial({  // ← new
// 19:     color: 0x44aaff,                               // ← new
// 20:     side: THREE.DoubleSide,                        // ← new
// 21:     roughness: 0.5,                                // ← new
// 22:     metalness: 0.0                                 // ← new
// 23: });                                                // ← new
```
We now have a material ready for a flat surface that won't vanish when viewed from behind.

### Mechanical walkthrough
1. `new THREE.MeshStandardMaterial(...)` — creates our material.
2. `side: THREE.DoubleSide` — sets the `side` property to the enum value 2.
3. This disables backface culling in the GPU pipeline: triangles where the normal points away from the camera are no longer skipped during rasterization.
4. `roughness: 0.5`, `metalness: 0.0` — makes it a matte, non-metallic surface.

Execution trace of the rasterizer:
1. `THREE.FrontSide=0` — GPU computes triangle winding order. If counter-clockwise, it draws. If clockwise, it skips.
2. `THREE.BackSide=1` — GPU does the inverse, drawing only the inside of shapes (useful for skyboxes).
3. `THREE.DoubleSide=2` — GPU disables the cull check, rendering both winding orders, doubling the fragment shader cost for that geometry.

### CS lens
This embodies **early-out optimization**.
Also recognized in: physics collision broadphase, database short-circuit evaluation, frustration culling in UI trees.

### SE lens
Why is it engineered this way? The design principle is safe defaults for performance. The alternative not chosen was to make `DoubleSide` the default. If `DoubleSide` were default, rendering a closed sphere would waste 50% of the GPU's time drawing the inside of the sphere that the user can never see. You must explicitly opt into the ~2x GPU fill cost only when the geometry demands it (like a single flat plane).

### Commands needed
Open `lesson-06.html` in a modern browser.

### Run it
Predicted output: The browser will render the plane. If rotated >90 degrees, it remains visible.

### One sentence connecting to previous unit
Now that we can see objects from both sides, what if we want to see *through* them?

## Concept Unit: wireframe, opacity, and transparent

### The Problem
Setting `opacity: 0.5` on a material often does absolutely nothing. Why doesn't it work out of the box, and how do we properly overlay a wireframe to debug geometry while rendering glass?

> Given what you know about GPU performance, what would you try here first? Why might the renderer refuse to make things translucent by default?

### Introduce the concept in isolation
We test the `transparent` boolean requirement.

```html
<!DOCTYPE html>
<html>
<head>
    <script type="importmap">
        { "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }
    </script>
</head>
<body>
<script type="module">
import * as THREE from 'three';

const glassMat = new THREE.MeshStandardMaterial({
    color:       0x88ccff,
    transparent: true,
    opacity:     0.4,
});

console.log('Opacity:', glassMat.opacity);
console.log('Transparent:', glassMat.transparent);
</script>
</body>
</html>
```

Predicted output:
```
Opacity: 0.4
Transparent: true
```
This proves the properties are set. This is called **alpha blending configuration**. If `transparent: false` (the default) is used with `opacity: 0.4`, the object remains fully opaque because the renderer skips the alpha blending pass entirely. This is a classic bug trap.

### Discard the throwaway
This isolated lab is discarded and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-06.html` (modified).
- **Change type:** Add.
- **Location:** Below the plane material.
- **Dependencies:** None.

### The New Code
```javascript
const glassMat = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.4,
    roughness: 0.0,
    metalness: 0.0,
    side: THREE.DoubleSide
});

const solidMesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.3, 16, 50), glassMat);
const wireMat = new THREE.MeshBasicMaterial({color: 0x000000, wireframe: true});
const wireMesh = new THREE.Mesh(solidMesh.geometry, wireMat);
solidMesh.add(wireMesh);
```

### The Updated Project
```javascript
// 21:     roughness: 0.5,
// 22:     metalness: 0.0
// 23: });
// 24:
// 25: const glassMat = new THREE.MeshStandardMaterial({                 // ← new
// 26:     color: 0x88ccff,                                              // ← new
// 27:     transparent: true,                                            // ← new
// 28:     opacity: 0.4,                                                 // ← new
// 29:     roughness: 0.0,                                               // ← new
// 30:     metalness: 0.0,                                               // ← new
// 31:     side: THREE.DoubleSide                                        // ← new
// 32: });                                                               // ← new
// 33:                                                                   // ← new
// 34: const solidMesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.3, 16, 50), glassMat); // ← new
// 35: const wireMat = new THREE.MeshBasicMaterial({color: 0x000000, wireframe: true});     // ← new
// 36: const wireMesh = new THREE.Mesh(solidMesh.geometry, wireMat);     // ← new
// 37: solidMesh.add(wireMesh);                                          // ← new
```
We now have a glass torus with a black wireframe perfectly outlining its geometry, sharing the same vertex data.

### Mechanical walkthrough
1. `transparent: true` — explicitly tells Three.js to sort this object back-to-front and enable alpha blending on the GPU.
2. `opacity: 0.4` — sets the alpha channel. The GPU blends color mathematically: `0.4 * objectColor + 0.6 * backgroundColor`.
3. `new THREE.MeshBasicMaterial({color: 0x000000, wireframe: true})` — creates an unlit material that only draws polygon edges.
4. `new THREE.Mesh(solidMesh.geometry, wireMat)` — creates a second mesh, reusing the exact same geometry object (`solidMesh.geometry`).
5. `solidMesh.add(wireMesh)` — makes the wireframe a child of the solid torus, so if the solid moves, the wireframe moves with it perfectly.

Execution trace of geometry sharing:
1. `solidMesh.geometry` is instantiated and sent to the GPU as a vertex buffer.
2. `wireMesh` reads `solidMesh.geometry` by reference.
3. Both meshes use the exact same vertex buffer in GPU memory; no memory is wasted duplicating the geometry.

### CS lens
This embodies the **Flyweight pattern**.
Also recognized in: text editor glyph rendering, particle systems, instanced rendering, shared library memory mapping.

### SE lens
Why is it engineered this way? The design principle is explicit opt-in for expensive operations. The alternative not chosen was to auto-detect transparency if opacity < 1. Auto-detection breaks down with complex textures where transparency might vary per pixel, requiring the renderer to scan every pixel before deciding how to sort the object. Making the developer explicitly set `transparent: true` moves the burden of knowledge out of the inner render loop.

### Commands needed
Open `lesson-06.html` in a modern browser.

### Run it
Predicted output: A translucent blue glass ring with stark black lines tracing every triangle of its surface.

### One sentence connecting to previous unit
If we can map two different meshes to the same geometry, can we map multiple materials to a single mesh?

## Concept Unit: Multiple materials on one mesh + material update

### The Problem
A Rubik's cube has six distinct colored faces, but it is one solid block of plastic. How do we apply a different material to each face without building six separate plane meshes?

> Look at the name `materials`. If a single material is an object, what data structure would you try here first to hold six of them?

### Introduce the concept in isolation
We pass an array of materials to a mesh instead of a single material.

```html
<!DOCTYPE html>
<html>
<head>
    <script type="importmap">
        { "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }
    </script>
</head>
<body>
<script type="module">
import * as THREE from 'three';

const materials = [
    new THREE.MeshStandardMaterial({color: 0xff0000}),
    new THREE.MeshStandardMaterial({color: 0xff8800}),
    new THREE.MeshStandardMaterial({color: 0xffff00}),
    new THREE.MeshStandardMaterial({color: 0x00ff00}),
    new THREE.MeshStandardMaterial({color: 0x0000ff}),
    new THREE.MeshStandardMaterial({color: 0xff00ff}),
];
const rubikFace = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), materials);

console.log('Material count:', rubikFace.material.length);

setTimeout(() => {
    rubikFace.material[0].color.set(0xffffff);
    console.log('Updated face +X to white');
}, 2000);
</script>
</body>
</html>
```

Predicted output:
```
Material count: 6
Updated face +X to white
```
This proves that a mesh can hold an array of materials, and that modifying them at runtime works immediately. This is called **material groups**. `BoxGeometry` is predefined with 6 face groups, which map 1-to-1 with our array indices.

### Discard the throwaway
This isolated lab is discarded and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-06.html` (modified).
- **Change type:** Add.
- **Location:** At the bottom of the scene setup.
- **Dependencies:** None.

### The New Code
```javascript
const rubikMaterials = [
    new THREE.MeshStandardMaterial({color: 0xff0000}),
    new THREE.MeshStandardMaterial({color: 0xff8800}),
    new THREE.MeshStandardMaterial({color: 0xffff00}),
    new THREE.MeshStandardMaterial({color: 0x00ff00}),
    new THREE.MeshStandardMaterial({color: 0x0000ff}),
    new THREE.MeshStandardMaterial({color: 0xff00ff})
];
const rubikCube = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), rubikMaterials);
```

### The Updated Project
```javascript
// 34: const solidMesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.3, 16, 50), glassMat);
// 35: const wireMat = new THREE.MeshBasicMaterial({color: 0x000000, wireframe: true});
// 36: const wireMesh = new THREE.Mesh(solidMesh.geometry, wireMat);
// 37: solidMesh.add(wireMesh);
// 38:
// 39: const rubikMaterials = [                                       // ← new
// 40:     new THREE.MeshStandardMaterial({color: 0xff0000}),         // ← new
// 41:     new THREE.MeshStandardMaterial({color: 0xff8800}),         // ← new
// 42:     new THREE.MeshStandardMaterial({color: 0xffff00}),         // ← new
// 43:     new THREE.MeshStandardMaterial({color: 0x00ff00}),         // ← new
// 44:     new THREE.MeshStandardMaterial({color: 0x0000ff}),         // ← new
// 45:     new THREE.MeshStandardMaterial({color: 0xff00ff})          // ← new
// 46: ];                                                             // ← new
// 47: const rubikCube = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), rubikMaterials); // ← new
```
We now have a cube with six distinct colors, rendered as a single object.

### Mechanical walkthrough
1. `const rubikMaterials = [...]` — creates a standard JavaScript array containing six distinct material instances.
2. `new THREE.Mesh(..., rubikMaterials)` — passes the array where a single material normally goes. Three.js detects the array and handles the routing automatically.
3. `rubikFace.material[0].color.set(0xffffff)` (from our throwaway) — accesses the first material in the array and mutates its color object directly.

Execution trace for multiple materials:
1. `BoxGeometry` is created with 6 geometry groups internal to Three.js (one for each face +X, -X, +Y, -Y, +Z, -Z).
2. The renderer maps array index `0` to group `0` (+X face).
3. The renderer maps array index `1` to group `1` (-X face), and so on.
4. When `material.color.set()` is called, it updates the color uniform sent to the shader on the very next render call. No expensive mesh rebuild or geometry update is needed.

### CS lens
This embodies **data-driven routing**.
Also recognized in: HTTP router middleware chains, CSS class applying, interrupt vector tables.

### SE lens
Why is it engineered this way? The design principle is reactive state mutation over object recreation. The alternative not chosen was requiring the developer to call `mesh.rebuild()` or `mesh.updateMaterials()` after a color change. By having the material hold an internal `THREE.Color` object that mutates in place, the renderer just reads the new memory address values right before the next draw call, keeping runtime updates extremely fast.

### Commands needed
Open `lesson-06.html` in a modern browser.

### Run it
Predicted output: A single cube rendering six different colors on its faces.

### One sentence connecting to previous unit
This wraps up our deep dive into the properties of materials.

## Closing

### Connect the pieces
Trace the creation of a polished metal sphere: 
First, we instantiate a `THREE.MeshStandardMaterial` with `roughness=0.1` and `metalness=0.9` (PBR fundamentals). We ensure its `transparent` flag is false and `opacity` is 1 (opacity configuration), so the GPU knows it blocks light entirely. Because it is a closed solid sphere, we let it use the default `THREE.FrontSide` (side configuration) to save rendering the interior. Finally, we attach this material to a `THREE.Mesh` alongside a `SphereGeometry`. When a DirectionalLight hits it, the PBR shader calculates a tight, sharp specular highlight because of the low roughness, and tints that highlight with the sphere's diffuse color because the high metalness makes it act like a real conductor.
