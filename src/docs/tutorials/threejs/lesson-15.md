# Lesson 15: Normal Maps and Bump Maps — Surface Detail Without Geometry

**What you will build**
We will apply normal and bump maps to 3D geometry in Three.js, adding the illusion of surface detail without increasing vertex count. The core problem is that adding real geometric detail for every bump or scratch on a surface requires millions of polygons, which severely degrades performance. By encoding surface normal perturbations in textures, we can compute accurate lighting for non-existent details, making flat surfaces look complex.

**What you need to know first**
Lesson 14 and the concepts of `MeshStandardMaterial` and how the lighting equation uses surface normals.

**Terms used in this lesson**
- **Normal map** — A texture where the RGB channels encode the XYZ components of a perturbed surface normal, allowing the lighting equation to render fake surface detail.
- **Bump map** — A grayscale texture where brightness represents height; normals are approximated from height gradients, providing a cheaper but less accurate alternative to normal maps.
- **Tangent space** — A local coordinate system relative to the surface of a polygon, where the normal map's encoded vectors are defined before being transformed to world space.
- **TBN matrix** — Tangent-Bitangent-Normal matrix, used to transform a tangent-space normal from a normal map into world space for lighting calculations.
- **Finite differences** — A mathematical technique used to approximate the derivative (gradient) of a function, used here to convert bump map height differences into normal vectors.

**Objects and methods used**

- **`THREE.TextureLoader`**
  - *What it is:* A utility class for loading image files into Three.js texture objects.
  - *Implementation:* `class TextureLoader extends Loader`
  - *Its use:* We use it to asynchronously load the diffuse, normal, and bump map JPEG images.
  - *Type:* Class
  - *Responsibility:* Fetches image resources over the network and decodes them into usable WebGL textures.
  - *Depends on:* A valid URL or path to an image file.
  - *Connects to:* Called by the application, returns a `Promise` that resolves to a `Texture` object.
  - *Shape:* A boundary object bridging network/filesystem I/O with WebGL rendering data.

- **`THREE.Texture`**
  - *What it is:* An object representing a 2D image mapped onto a 3D surface.
  - *Implementation:* `class Texture`
  - *Its use:* Stores the loaded normal or bump map data.
  - *Type:* Class
  - *Responsibility:* Holds pixel data, color space info, and sampling parameters for the GPU.
  - *Depends on:* Raw image data or an HTML canvas/image element.
  - *Connects to:* Created by `TextureLoader`, consumed by `Material`.
  - *Shape:* An internal data container representing a GPU resource.

- **`THREE.MeshStandardMaterial`**
  - *What it is:* A physically-based rendering (PBR) material that reacts to lighting.
  - *Implementation:* `class MeshStandardMaterial extends Material`
  - *Its use:* We configure its `normalMap`, `normalScale`, `bumpMap`, and `bumpScale` properties to apply our detail maps.
  - *Type:* Class
  - *Responsibility:* Defines how the surface of a mesh interacts with light, including color, roughness, and surface perturbations.
  - *Depends on:* Texture maps and scalar parameters.
  - *Connects to:* Applied to a `Mesh`, used by the `WebGLRenderer` during the lighting pass.
  - *Shape:* The core appearance definition object in the scene graph.

- **`THREE.Vector2`**
  - *What it is:* A 2D vector class.
  - *Implementation:* `class Vector2`
  - *Its use:* Used to define `normalScale`, which multiplies the X and Y strengths of the normal map effect.
  - *Type:* Class
  - *Responsibility:* Encapsulates an (X, Y) pair and provides mathematical operations.
  - *Depends on:* Numerical X and Y inputs.
  - *Connects to:* Created by the application, read by the material properties.
  - *Shape:* A fundamental data type for 2D math.

- **`THREE.CanvasTexture`**
  - *What it is:* A texture created dynamically from an HTML `<canvas>` element.
  - *Implementation:* `class CanvasTexture extends Texture`
  - *Its use:* We use it to turn our procedurally generated normal map image data into a Three.js texture.
  - *Type:* Class
  - *Responsibility:* Wraps a canvas API element so its pixel data can be uploaded to the GPU as a texture.
  - *Depends on:* A populated `HTMLCanvasElement`.
  - *Connects to:* Created from a canvas, assigned to a material map.
  - *Shape:* A bridge between the browser's 2D drawing API and WebGL.

---

## Concept Unit: What a normal map is — RGB-encoded normals

### The Problem
How can we store a 3D normal vector (X, Y, Z) in a standard 2D image file? Normal vectors are essential for lighting calculations, but images only store colors.

### Introduce the concept in isolation
We can use the Red, Green, and Blue (RGB) color channels of an image to store the X, Y, and Z components of a normal vector. Since colors are usually 8-bit (0-255) and normals range from -1.0 to 1.0, we must remap the values.

```javascript
// Normal map pixel (128, 128, 255) in 8-bit = direction (0, 0, 1) in tangent space
// R=X, G=Y, B=Z: decode = (R/255)*2-1, (G/255)*2-1, (B/255)*2-1
// (128,128,255) -> (0, 0, 1) = flat surface (no perturbation)
// (255,128,128) -> (1, 0, 0) = tilted right
// (0, 128, 128) -> (-1, 0, 0) = tilted left
function decodeNormal(r, g, b) {
    return {
        x: (r / 255) * 2 - 1,
        y: (g / 255) * 2 - 1,
        z: (b / 255) * 2 - 1,
    };
}
console.log('Flat normal:', decodeNormal(128, 128, 255));
console.log('Tilted right:', decodeNormal(255, 128, 128));
```

Tracing `decodeNormal(128, 128, 255)`: `x = (128/255)*2 - 1 = 1.004 - 1 = 0.004`, `y = 0.004`, `z = (255/255)*2 - 1 = 1.0`. This gives approximately `(0, 0, 1)`, which points straight out (a flat surface). This is why normal maps have a predominantly blue tint: most normals are near `(0, 0, 1)`. Pixels deviating from blue encode surface tilt. This is called a **normal map decoding**.

### Discard the throwaway
This `decodeNormal` function is deleted. It was purely to demonstrate the math; Three.js's shaders do this automatically on the GPU.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `lesson-15.html`
- **Change type:** Add
- **Location:** Inside the main script block.
- **Dependencies:** Three.js imported via CDN.

### The New Code
```html
<script type="module">
import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const [colorMap, normalMap] = await Promise.all([
    loader.loadAsync('https://threejs.org/examples/textures/brick_diffuse.jpg'),
    loader.loadAsync('https://threejs.org/examples/textures/brick_normal.jpg'),
]);
normalMap.colorSpace = THREE.NoColorSpace;
</script>
```

### The Updated Project
```html
1: <script type="module">
2: import * as THREE from 'three';
3: 
4: // ← new
5: const loader = new THREE.TextureLoader();
6: const [colorMap, normalMap] = await Promise.all([
7:     loader.loadAsync('https://threejs.org/examples/textures/brick_diffuse.jpg'),
8:     loader.loadAsync('https://threejs.org/examples/textures/brick_normal.jpg'),
9: ]);
10: normalMap.colorSpace = THREE.NoColorSpace;
11: </script>
```
The script now asynchronously loads a diffuse color map and a normal map using `THREE.TextureLoader`.

### Mechanical walkthrough
- **`const loader = new THREE.TextureLoader();`**
  Creates an instance of `TextureLoader` to fetch images.
- **`Promise.all([...])`**
  Waits for both textures to load concurrently.
- **`loader.loadAsync(...)`**
  Asynchronously fetches the image URL and returns a `THREE.Texture`.
- **`normalMap.colorSpace = THREE.NoColorSpace;`**
  Ensures the normal map is not treated as sRGB color data. Normals are mathematical vectors, so color space transformations would corrupt their values.

### CS lens
Normal maps operate in **Tangent space**. A normal of `(0, 0, 1)` means "pointing straight out from the polygon face," not "pointing up in world space." This allows the same normal map to be wrapped around a sphere or any complex object, as the vectors are relative to the local surface orientation.

### SE lens
Using `Promise.all` allows multiple network requests to run in parallel rather than sequentially. This drastically reduces load times when a material requires multiple textures (color, normal, roughness, metallic, etc.).

### Commands needed
Open `lesson-15.html` in a modern browser (serve via `http.server` for textures).

### Run it
The textures load silently in the background, making them available for material creation.

### One sentence connecting to previous unit
Now that we have the normal map data loaded into memory, we need to apply it to a material so the lighting system can use it.

---

## Concept Unit: Applying a normal map in Three.js

### The Problem
We have a normal map texture, but a standard sphere geometry only provides a single normal per vertex. How do we instruct the renderer to use the per-pixel normals from the texture instead?

### Introduce the concept in isolation
We can map the texture to a material's `normalMap` property.

```javascript
import * as THREE from 'three';
const mat = new THREE.MeshStandardMaterial({
    normalMap: normalMap
});
```
This tells Three.js to replace the interpolated vertex normals with the sampled normals from the texture when computing the lighting equations. This is called a **normal map assignment**.

### Discard the throwaway
This partial material definition is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-15.html`
- **Change type:** Add
- **Location:** Below the texture loading in the script block.
- **Dependencies:** Three.js and the loaded textures.

### The New Code
```html
<script type="module">
const mat = new THREE.MeshStandardMaterial({
    map:         colorMap,
    normalMap:   normalMap,
    normalScale: new THREE.Vector2(1, 1),
});
const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), mat);
scene.add(sphere);

console.log('Normal map size:', normalMap.image.width, 'x', normalMap.image.height);
console.log('Normal scale:', mat.normalScale);
</script>
```

### The Updated Project
```html
1: // ... previous texture loading code
2: normalMap.colorSpace = THREE.NoColorSpace;
3: 
4: // ← new
5: const mat = new THREE.MeshStandardMaterial({
6:     map:         colorMap,
7:     normalMap:   normalMap,
8:     normalScale: new THREE.Vector2(1, 1),
9: });
10: const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), mat);
11: scene.add(sphere);
12: 
13: console.log('Normal map size:', normalMap.image.width, 'x', normalMap.image.height);
14: console.log('Normal scale:', mat.normalScale);
```
The material uses both the color and normal maps, and a sphere with this material is added to the scene.

### Mechanical walkthrough
- **`new THREE.MeshStandardMaterial({...})`**
  Creates a PBR material.
- **`map: colorMap`**
  Sets the diffuse base color of the material.
- **`normalMap: normalMap`**
  Assigns the loaded normal map to perturb the surface lighting.
- **`normalScale: new THREE.Vector2(1, 1)`**
  Sets the strength of the normal map effect. `(1, 1)` means 100% strength on both the X and Y axes.
- **`new THREE.SphereGeometry(1, 64, 32)`**
  Creates a smooth sphere geometry.
- **`new THREE.Mesh(..., mat)`**
  Combines the geometry and material.

### CS lens
In the vertex shader, `vNormal` contains the true geometry normal. In the fragment shader, `sampledNormal = texture2D(normalMap, vUv)`. The GPU constructs a **TBN matrix** (Tangent-Bitangent-Normal) to convert this local tangent-space normal into world space (`worldNormal = normalize(TBN * sampledNormal)`). The lighting calculation then uses `worldNormal` instead of `vNormal`, creating the illusion of deep brick grooves on a completely smooth sphere.

### SE lens
Normal mapping decouples visual detail from geometric complexity. The sphere has only 4096 triangles, but it looks like it has hundreds of physical indentations. This pattern of trading memory (texture size) for compute performance (vertex count) is a cornerstone of real-time graphics.

### Commands needed
Open `lesson-15.html` in a modern browser (serve via `http.server` for textures).

### Run it
The console logs the dimensions of the loaded normal map and the normal scale vector. Visually, the sphere appears textured with 3D depth.

### One sentence connecting to previous unit
The normal map gives the surface depth, but we can dynamically control exactly how pronounced those bumps appear.

---

## Concept Unit: normalScale — controlling normal map strength

### The Problem
Sometimes a normal map effect is too strong or too subtle. How do we adjust the intensity of the surface perturbations without having to edit the image file itself?

### Introduce the concept in isolation
The `normalScale` property allows us to multiply the decoded X and Y components of the normal vector.

```javascript
import * as THREE from 'three';
const clock = new THREE.Clock();
function animate() {
    const t = clock.getElapsedTime();
    const s = (Math.sin(t) * 0.5 + 0.5) * 3;  // 0 to 3
    mat.normalScale.set(s, s);
}
```
Tracing `s` at `t=0`: `sin(0)=0`, `s = (0 * 0.5 + 0.5) * 3 = 1.5`. At `t=PI/2`: `sin(PI/2)=1`, `s = (1 * 0.5 + 0.5) * 3 = 3`. The scale oscillates smoothly between 0 (flat surface) and 3 (exaggerated bumps). This is called a **dynamic normal scale**.

### Discard the throwaway
The animation loop snippet is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-15.html`
- **Change type:** Modify
- **Location:** In the material definition.
- **Dependencies:** Three.js.

### The New Code
```html
<script type="module">
mat.normalScale.set(2, 0.5);
</script>
```

### The Updated Project
```html
1: const mat = new THREE.MeshStandardMaterial({
2:     map:         colorMap,
3:     normalMap:   normalMap,
4:     normalScale: new THREE.Vector2(1, 1),
5: });
6: // ← new
7: mat.normalScale.set(2, 0.5); 
8: const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), mat);
```
The normal scale is configured to stretch the lighting effect horizontally.

### Mechanical walkthrough
- **`mat.normalScale.set(2, 0.5)`**
  Updates the `Vector2` used for the normal scale. The X component of the normal perturbation is multiplied by 2 (exaggerated), while the Y component is multiplied by 0.5 (subtle).

### CS lens
Scaling the normal map only affects the X and Y (tangent and bitangent) components, leaving the Z (outward) component at 1.0. Increasing X and Y makes the normal vector lean further away from `(0, 0, 1)`, which the lighting equation interprets as a steeper surface slope, resulting in harder shadows and brighter highlights on the edges of bumps.

### SE lens
Exposing parameters like `normalScale` allows artists and developers to iterate on the look and feel of materials in code, directly in the engine, rather than round-tripping through image editing software for every minor tweak.

### Commands needed
Open `lesson-15.html` in a modern browser (serve via `http.server` for textures).

### Run it
The bumps on the sphere appear stretched, catching more light horizontally than vertically.

### One sentence connecting to previous unit
Normal maps are highly accurate, but sometimes we only have a simple black-and-white image representing height rather than precise normal vectors.

---

## Concept Unit: Bump maps (height maps) as an alternative

### The Problem
Creating a proper normal map requires specialized software or 3D baking. What if we only have a grayscale image where white means "raised" and black means "sunken"? Can we use that to perturb normals?

### Introduce the concept in isolation
A bump map uses grayscale values to represent height. The GPU calculates the difference in height between neighboring pixels to guess the surface slope.

```javascript
import * as THREE from 'three';
const bumpTex = await loader.loadAsync('https://threejs.org/examples/textures/brick_diffuse.jpg');
const mat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    bumpMap:   bumpTex,
    bumpScale: 0.05,
});
console.log('Bump scale:', mat.bumpScale);
```
This is called a **bump map assignment**.

### Discard the throwaway
The isolated bump map material setup is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-15.html`
- **Change type:** Add
- **Location:** Below the normal map setup.
- **Dependencies:** Three.js and a grayscale/diffuse texture.

### The New Code
```html
<script type="module">
const bumpTex = colorMap; // reusing the diffuse map as a cheap height map
const bumpMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    bumpMap:   bumpTex,
    bumpScale: 0.05,
});
const bumpSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), bumpMat);
bumpSphere.position.x = 2.5;
scene.add(bumpSphere);
</script>
```

### The Updated Project
```html
1: const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), mat);
2: scene.add(sphere);
3: 
4: // ← new
5: const bumpTex = colorMap;
6: const bumpMat = new THREE.MeshStandardMaterial({
7:     color: 0x888888,
8:     bumpMap:   bumpTex,
9:     bumpScale: 0.05,
10: });
11: const bumpSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), bumpMat);
12: bumpSphere.position.x = 2.5;
13: scene.add(bumpSphere);
```
A second sphere is added, using the diffuse texture as a bump map.

### Mechanical walkthrough
- **`bumpTex = colorMap;`**
  Reuses the loaded diffuse texture as a bump map. The darker brick grout will be interpreted as "low" and the lighter bricks as "high".
- **`bumpMap: bumpTex`**
  Instructs the material to use the texture for height data.
- **`bumpScale: 0.05`**
  Determines how high the white values are in world units. Smaller values keep the effect subtle and prevent visual artifacts.

### CS lens
Bump mapping computes `dH/du` and `dH/dv` (the gradient of the height map using finite differences). It constructs a perturbed normal from this gradient. It is less accurate than a normal map because the gradient approximation ignores the actual surface curvature and the correct tangent frame. Normal maps are pre-computed offline with the precise TBN transform, providing superior quality.

### SE lens
Bump maps are excellent for quick prototyping because any image can be used as a height map. However, in production, normal maps are preferred as they provide more accurate and stable lighting results, especially at glancing angles.

### Commands needed
Open `lesson-15.html` in a modern browser (serve via `http.server` for textures).

### Run it
A second sphere appears next to the first one, showing indented grout lines derived purely from the brightness of the color map.

### One sentence connecting to previous unit
If we want the quality of a normal map but only have a height map, we can compute the normal map ourselves in JavaScript before passing it to the GPU.

---

## Concept Unit: Generating normal maps from heightmaps in JavaScript

### The Problem
Bump maps are evaluated on the fly by the GPU and can look inferior. How can we convert a grayscale height map into a high-quality RGB normal map programmatically before rendering?

### Introduce the concept in isolation
We can read the pixel data of a canvas, compute the gradients (finite differences) ourselves, and encode the resulting vectors into RGB channels.

```javascript
function heightmapToNormalMap(heightCanvas, strength = 2) {
    const w = heightCanvas.width, h = heightCanvas.height;
    const ctx = heightCanvas.getContext('2d');
    const src = ctx.getImageData(0, 0, w, h);
    const out = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const getH = (px, py) => src.data[(py * w + px) * 4] / 255;
            const px = Math.min(x+1, w-1), nx = Math.max(x-1, 0);
            const py = Math.min(y+1, h-1), ny = Math.max(y-1, 0);
            const dX = (getH(px, y) - getH(nx, y)) * strength;
            const dY = (getH(x, py) - getH(x, ny)) * strength;
            const len = Math.sqrt(dX*dX + dY*dY + 1);
            const nx_ = -dX/len, ny_ = -dY/len, nz_ = 1/len;
            const i = (y * w + x) * 4;
            out.data[i  ] = ((nx_ * 0.5 + 0.5) * 255) | 0;  // R
            out.data[i+1] = ((ny_ * 0.5 + 0.5) * 255) | 0;  // G
            out.data[i+2] = ((nz_ * 0.5 + 0.5) * 255) | 0;  // B
            out.data[i+3] = 255;
        }
    }
    return out;
}
```
Tracing `getH(x,y)`: It reads the R channel of the height image, scaling 0-255 to 0-1. `dX` and `dY` compute the horizontal and vertical gradients. The cross product of `(1, 0, dX)` and `(0, 1, dY)` is normalized to yield `(-dX, -dY, 1)`. These components are shifted from `[-1, 1]` to `[0, 255]` to encode the RGB colors. This is a **procedural normal map generation**.

### Discard the throwaway
This snippet is purely for demonstration and will not be fully integrated into our Three.js loop for this lesson.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-15.html`
- **Change type:** Add
- **Location:** In a separate utility section of the script.
- **Dependencies:** A populated HTML canvas.

### The New Code
```html
<script type="module">
// Example usage outline:
// const myHeightCanvas = document.createElement('canvas');
// ... draw height data to myHeightCanvas ...
// const normalTex = new THREE.CanvasTexture(heightmapToNormalMap(myHeightCanvas, 3).canvas);
console.log('Normal map generator ready');
</script>
```

### The Updated Project
```html
1: const bumpSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), bumpMat);
2: bumpSphere.position.x = 2.5;
3: scene.add(bumpSphere);
4: 
5: // ← new
6: // Example usage outline:
7: // const myHeightCanvas = document.createElement('canvas');
8: // ... draw height data to myHeightCanvas ...
9: // const normalTex = new THREE.CanvasTexture(heightmapToNormalMap(myHeightCanvas, 3).canvas);
10: console.log('Normal map generator ready');
```
The generator is defined conceptually, ready to convert any procedural canvas drawing into a highly detailed normal map.

### Mechanical walkthrough
- **`document.createElement('canvas')`**
  Creates an off-screen canvas to hold height data.
- **`new THREE.CanvasTexture(...)`**
  Wraps the generated canvas pixel data so it can be uploaded to the GPU and assigned to a `MeshStandardMaterial`'s `normalMap` property.

### CS lens
By computing the finite differences and cross products on the CPU via JavaScript, we bypass the need for the GPU to estimate gradients at runtime. The resulting texture contains exact, pre-calculated normal vectors, combining the ease of authoring a height map with the precision of normal mapping.

### SE lens
Procedural generation of normal maps allows web applications to create infinite variations of surface textures (like terrain or skin) entirely on the client side, saving immense amounts of bandwidth compared to downloading high-resolution image files.

### Commands needed
Open `lesson-15.html` in a modern browser (serve via `http.server` for textures).

### Run it
The console logs that the generator is ready.

### One sentence connecting to previous unit
Whether loaded from a file, approximated via bump maps, or generated procedurally, normal maps are the key to detailed surfaces.

---

## Closing

### Connect the pieces
Tracing a normal map through the entire pipeline: When a brick normal map is applied to a sphere, the fragment shader samples a pixel, such as `(200, 100)`. It decodes this RGB value into a tangent-space normal vector, perhaps `(0.57, 0, 0.82)`. Using the TBN matrix, this vector is transformed into world space. The lighting equation then uses this perturbed normal instead of the smooth geometry normal. As a result, the fragment calculates a brighter specular highlight or a deeper shadow than the underlying 512-triangle geometry would dictate, creating the convincing illusion of detailed brickwork.
