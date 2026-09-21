# Lesson 17: Environment Maps and Reflections — RGBELoader, PMREMGenerator

What you will build
In this lesson, you will add highly realistic lighting and reflections to a scene without relying on complex, computationally expensive ray tracing. You will use a 360-degree High Dynamic Range (HDR) image as an environment map to illuminate objects and provide rich reflections. The transferable problem this solves is simulating global illumination and accurate material reflections in a real-time graphics pipeline using pre-computed environment data rather than dynamic light calculations.

What you need to know first
- Lesson 16: Materials and PBR
- MeshStandardMaterial

Terms used in this lesson
- **Environment map** — A 360-degree image of a surrounding scene, used to provide a background, simulate reflections on shiny surfaces, and act as an ambient light source for physically based materials. It solves the problem of needing complex lighting setups by baking real-world light data into an image.
- **Equirectangular** — A projection method for mapping a spherical environment onto a single 2D rectangular image (where x maps to azimuth and y maps to elevation). It exists as a standard format for storing 360-degree panoramas.
- **HDR (High Dynamic Range)** — An image format capable of storing color and brightness values far beyond the standard [0, 1] range of ordinary screens. It exists to capture the true intensity of light sources (like the sun) so that reflections and lighting calculations in a 3D scene behave realistically.
- **CubeMap** — A texture format consisting of six distinct images forming the faces of a cube. It is the format the GPU natively uses for environment reflections, necessitating a conversion from equirectangular panoramas.
- **RGBE** — A specific file encoding (often using the `.hdr` extension) where red, green, and blue channels share a single exponent stored in the alpha channel. It solves the problem of storing high dynamic range data efficiently without requiring full floating-point precision for every color channel on disk.
- **Mipmap** — A sequence of pre-calculated, progressively lower-resolution versions of an image. In environment mapping, they are used to simulate surface roughness: sharp reflections sample the high-resolution mip, while blurry reflections sample the lower-resolution mips.
- **Tone mapping** — The mathematical process of compressing HDR values (which can be infinitely bright) down into the finite [0, 1] range that a standard monitor can display. It solves the problem of "blown out" white pixels while preserving detail in both extreme shadows and bright highlights.
- **ACESFilmicToneMapping** — A specific, industry-standard tone mapping algorithm originally developed by the Academy of Motion Picture Arts and Sciences. It exists to provide a rich, film-like contrast curve that naturally handles overexposed areas.

Objects and methods used
- **RGBELoader**
  - *What it is:* A specialized texture loader for `.hdr` files.
  - *Implementation:* `class RGBELoader extends DataTextureLoader`
  - *Its use:* To fetch and decode an RGBE-encoded high dynamic range image from a URL into raw HDR floating-point pixel data in memory.
  - *Type:* Class
  - *Responsibility:* Responsible for requesting the binary `.hdr` file, parsing the RGBE exponent data, and converting it into a usable texture format (like `HalfFloatType`) on the GPU.
  - *Depends on:* An active WebGL context and a valid URL to an `.hdr` file.
  - *Connects to:* Called by application code; returns a raw `Texture` which is then passed to `PMREMGenerator`.
  - *Shape:* A utility class acting as the data-ingestion boundary for HDR assets.
- **PMREMGenerator**
  - *What it is:* Pre-filtered Mipmapped Radiance Environment Map Generator.
  - *Implementation:* `class PMREMGenerator`
  - *Its use:* To convert a raw equirectangular HDR image into a specialized CubeMap optimized for physically based rendering.
  - *Type:* Class
  - *Responsibility:* Takes a raw environment image, renders it into a cubemap, and computes multiple blurred mipmap levels (convolving the image with a BRDF) so that materials with different roughness values can sample the correct blur level for reflections.
  - *Depends on:* The `WebGLRenderer` instance.
  - *Connects to:* Receives the raw texture from `RGBELoader`, processes it, and outputs a `WebGLRenderTarget` whose `.texture` property is assigned to the scene.
  - *Shape:* An internal processing pipeline tool used during scene setup.
- **scene.environment**
  - *What it is:* A global property defining image-based lighting for the scene.
  - *Implementation:* `scene.environment: Texture | null`
  - *Its use:* Set to the PMREM-generated texture so that every `MeshStandardMaterial` or `MeshPhysicalMaterial` automatically receives ambient lighting and reflections from the environment without needing explicit assignment.
  - *Type:* Object property
  - *Responsibility:* Acts as the global fallback environment map for all PBR materials in the scene tree.
  - *Depends on:* A valid, pre-filtered environment texture (usually a CubeMap).
  - *Connects to:* Read by the renderer when evaluating material shaders.
  - *Shape:* Global scene configuration state.

## Concept Unit: What an environment map is

### The Problem
We have materials that should look like shiny chrome or glossy plastic, but right now, they have nothing to reflect except the solid black background or explicit directional lights. How do we provide a rich, complex environment for them to reflect without modeling an entire room full of objects?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';
// Environment map: 360° image of surroundings, used for:
// 1. Background (scene.background)
// 2. Reflections on shiny surfaces (material.envMap)
// 3. Ambient image-based lighting (scene.environment)
// Stored as: CubeMap (6 images) or Equirectangular (1 panorama image)
// HDR: stores values > 1 for bright areas (sun, lights)
// RGBE format (.hdr): RGBELoader reads it
// IMPORTANT: To get a free .hdr file for testing, use:
// https://polyhaven.com/hdris (free CC0 HDRIs)
// Three.js also provides one at:
// https://threejs.org/examples/textures/equirectangular/royal_esplanade_1k.hdr
console.log('Environment map types: CubeMap, Equirectangular HDR');
console.log('Three.js uses PMREMGenerator to pre-filter HDR for PBR');
```
This demonstrates the core idea: an environment map is a static 360-degree image acting as the universe surrounding the scene. By using an Equirectangular HDR image, we store not just colors, but real light intensities.

### Discard the throwaway
This conceptual overview is discarded and will not be included in the project.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are introducing new asset types.
- **Files affected**: `lesson-17.html` (created)
- **Change type**: add
- **Location**: N/A
- **Dependencies**: Three.js library via importmap.

### The New Code
```javascript
console.log("Preparing to load HDR...");
```

### The Updated Project
```javascript
// 1
console.log("Preparing to load HDR..."); // ← new
```
This simply sets up our intention to load the HDR file.

### Mechanical walkthrough
- `console.log`: A standard debugging tool.
- `"Preparing to load HDR..."`: A string literal indicating our starting point.

### CS lens
In computer graphics, baking complex lighting into a static image (image-based lighting) is a classic optimization space-time tradeoff. Instead of tracing millions of rays outward to figure out what a surface reflects, we pre-calculate the incoming light from all directions and store it in a look-up table (the texture).

### SE lens
Using standard formats like Equirectangular HDR decouples the asset creation (done by artists or photographers) from the rendering engine. The engine doesn't need to know how the image was captured, only how to sample it.

### Commands needed
Open lesson-17.html served via http.server. Run: python3 -m http.server 8080

### Run it
The console will print "Preparing to load HDR...".

### One sentence connecting to previous unit
Now that we know what an HDR environment map is, we need to actually load one into memory.

## Concept Unit: RGBELoader — loading an HDR environment

### The Problem
How do we load an `.hdr` file into Three.js when standard HTML image tags (`<img>`) only understand basic formats like PNG or JPEG, which cannot store high dynamic range data?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const loader = new RGBELoader();
const hdrTexture = await loader.loadAsync(
    'https://threejs.org/examples/textures/equirectangular/royal_esplanade_1k.hdr'
);
console.log('HDR texture type:', hdrTexture.type);    // THREE.HalfFloatType
console.log('HDR mapping:', hdrTexture.mapping);      // THREE.UVMapping
console.log('HDR size:', hdrTexture.image.width, 'x', hdrTexture.image.height);
```
This is an isolated demonstration of `RGBELoader` fetching and decoding an `.hdr` file. It proves that the loader outputs a texture with `HalfFloatType` (16-bit floats, capable of storing HDR) and `UVMapping` (equirectangular projection).

### Discard the throwaway
This specific isolated loader test is discarded and will not be part of the final project structure directly.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-17.html`
- **Change type**: add
- **Location**: Inside the main initialization script.
- **Dependencies**: `RGBELoader` module.

### The New Code
```javascript
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const loader = new RGBELoader();
const hdrTexture = await loader.loadAsync('https://threejs.org/examples/textures/equirectangular/royal_esplanade_1k.hdr');
```

### The Updated Project
```javascript
// 1
import * as THREE from 'three';
// 2
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'; // ← new
// 3
// 4
const loader = new RGBELoader(); // ← new
// 5
const hdrTexture = await loader.loadAsync('https://threejs.org/examples/textures/equirectangular/royal_esplanade_1k.hdr'); // ← new
```
We import the specific loader and fetch the HDR texture asynchronously.

### Mechanical walkthrough
- `import { RGBELoader }`: Imports the loader class.
- `new RGBELoader()`: Instantiates the loader object.
- `await`: Pauses execution until the asynchronous load completes.
- `loader.loadAsync(...)`: Initiates the HTTP request to fetch the binary `.hdr` file, decodes the RGBE encoding, and returns a Promise that resolves to a `Texture`.

### CS lens
The RGBE format (Radiance HDR) is a clever encoding. It stores Red, Green, and Blue as standard 8-bit bytes, but uses the fourth byte (usually Alpha) as a shared Exponent. The decoding process is `R * 2^(E-128)`, allowing a massive range of values using only 32 bits per pixel, vastly reducing memory bandwidth compared to uncompressed 32-bit floats.

### SE lens
Using asynchronous loading (`loadAsync`) prevents the main thread from blocking while a large multi-megabyte image downloads over the network, ensuring the web page remains responsive.

### Commands needed
Open lesson-17.html served via http.server. Run: python3 -m http.server 8080

### Run it
The browser fetches the HDR file over the network and decodes it into memory.

### One sentence connecting to previous unit
The raw HDR image is loaded, but it is in equirectangular format and not yet optimized for fast 3D reflections.

## Concept Unit: PMREMGenerator — converting HDR to cube map

### The Problem
A raw equirectangular image is mathematically expensive to sample for blurry reflections. How do we convert this single flat image into a format the GPU can use efficiently for PBR materials, including correct blur levels for different material roughnesses?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const renderer = new THREE.WebGLRenderer();
const hdrLoader = new RGBELoader();
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();  // pre-compile shader

const hdrTexture = await hdrLoader.loadAsync(
    'https://threejs.org/examples/textures/equirectangular/royal_esplanade_1k.hdr'
);
const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
hdrTexture.dispose();           // free the raw HDR
pmremGenerator.dispose();       // free the generator

console.log('EnvMap mapping:', envMap.mapping); // CubeUVReflectionMapping
```
This isolates the `PMREMGenerator`. It proves that taking the raw equirectangular texture and processing it yields a texture with `CubeUVReflectionMapping`, which is exactly what PBR materials need.

### Discard the throwaway
This isolated generator script is discarded.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-17.html`
- **Change type**: add
- **Location**: Immediately after loading the `hdrTexture`.
- **Dependencies**: A valid `WebGLRenderer` instance.

### The New Code
```javascript
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
scene.background = envMap;
scene.environment = envMap;
hdrTexture.dispose();
pmremGenerator.dispose();
```

### The Updated Project
```javascript
// 1
const hdrTexture = await loader.loadAsync('https://threejs.org/examples/textures/equirectangular/royal_esplanade_1k.hdr');
// 2
const pmremGenerator = new THREE.PMREMGenerator(renderer); // ← new
// 3
pmremGenerator.compileEquirectangularShader(); // ← new
// 4
const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture; // ← new
// 5
scene.background = envMap; // ← new
// 6
scene.environment = envMap; // ← new
// 7
hdrTexture.dispose(); // ← new
// 8
pmremGenerator.dispose(); // ← new
```
We process the HDR into a PMREM cubemap, apply it globally to the scene, and clean up the intermediate memory.

### Mechanical walkthrough
- `new THREE.PMREMGenerator(renderer)`: Creates the generator, passing the renderer so it can perform off-screen GPU operations.
- `compileEquirectangularShader()`: Forces the shader compiler to prepare the necessary GPU programs early, preventing a stutter when processing begins.
- `fromEquirectangular(hdrTexture)`: Executes the conversion, rendering the equirectangular image into the faces of a cubemap and generating convoluted mipmaps.
- `.texture`: Extracts the resulting processed texture from the render target.
- `scene.background = envMap`: Sets the skybox visible behind all objects.
- `scene.environment = envMap`: Sets global image-based lighting for all PBR materials.
- `dispose()`: Explicitly frees GPU memory for objects we no longer need, preventing memory leaks.

### CS lens
Convolving an environment map for roughness means pre-calculating the integral of incoming light scattered by a microfacet BRDF. By storing the progressively blurrier results in mipmap levels, the shader only has to do a simple texture lookup (sampling the correct mip level based on material roughness) instead of running a complex integral in real-time.

### SE lens
Manual memory management (`dispose()`) is critical in WebGL. JavaScript's garbage collector only manages CPU memory; it does not automatically free textures uploaded to VRAM.

### Commands needed
Open lesson-17.html served via http.server. Run: python3 -m http.server 8080

### Run it
The scene will now have a visible 360-degree background and lighting.

### One sentence connecting to previous unit
With the environment map set globally, we can now configure specific materials to interact with it.

## Concept Unit: Applying envMap to materials

### The Problem
How do different materials (like chrome versus matte plastic) respond to the environment map differently?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

const chromeMat = new THREE.MeshStandardMaterial({
    color:      0xffffff,
    roughness:  0.0,        // perfectly smooth -> sharp reflections
    metalness:  1.0,        // fully metallic -> colored reflections
    envMapIntensity: 1.0,   // 0=no reflection, 1=full, >1=brighter
});
const roughMat = new THREE.MeshStandardMaterial({
    color:     0xff4400,
    roughness: 0.8,    // rough: blurry reflections
    metalness: 0.0,
});
console.log('Chrome roughness:', chromeMat.roughness);
```
This isolates material configuration. It shows that `roughness` dictates how sharp the reflections are, and `metalness` dictates whether the material reflects like a metal or a dielectric.

### Discard the throwaway
This isolated material setup is discarded.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-17.html`
- **Change type**: add
- **Location**: Where meshes are created.
- **Dependencies**: `scene.environment` already set.

### The New Code
```javascript
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.0, metalness: 1.0 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.0, metalness: 0.0, transparent: true, opacity: 0.3, envMapIntensity: 2.0 });
```

### The Updated Project
```javascript
// 1
const geometry = new THREE.SphereGeometry(1, 32, 32);
// 2
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.0, metalness: 1.0 }); // ← new
// 3
const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.0, metalness: 0.0, transparent: true, opacity: 0.3, envMapIntensity: 2.0 }); // ← new
// 4
const chromeSphere = new THREE.Mesh(geometry, chromeMat);
```
We define distinct materials that will automatically react to `scene.environment`.

### Mechanical walkthrough
- `roughness: 0.0`: The surface is perfectly smooth. The shader will sample the highest-resolution, sharpest mip level of the PMREM texture.
- `metalness: 1.0`: The surface is fully metallic, meaning it has no diffuse reflection; all light is specularly reflected.
- `transparent: true`: Enables alpha blending for the glass material.
- `envMapIntensity: 2.0`: An arbitrary multiplier. Setting it > 1.0 artificially boosts the brightness of the reflection.

### CS lens
In a physically based rendering pipeline, metalness determines the Fresnel reflectance at normal incidence (F0). Dielectrics (metalness 0) reflect about 4% of light and scatter the rest as diffuse color. Metals (metalness 1) reflect almost all light, tinted by the base color.

### SE lens
Because we assigned `scene.environment`, we do not need to manually pass `envMap: envMap` into every single material definition. This makes material creation DRY (Don't Repeat Yourself).

### Commands needed
Open lesson-17.html served via http.server. Run: python3 -m http.server 8080

### Run it
The chrome sphere acts like a mirror reflecting the esplanade, while the glass sphere has faint, boosted reflections.

### One sentence connecting to previous unit
The materials reflect accurately, but if the HDR environment contains values vastly brighter than 1.0, they will clip to pure white on a normal monitor without tone mapping.

## Concept Unit: Tone mapping — displaying HDR on SDR screens

### The Problem
A standard monitor can only display RGB values between 0.0 (black) and 1.0 (white). An HDR environment might have the sun with a brightness value of 50.0. If we just clamp values > 1.0 down to 1.0, everything bright becomes a flat, featureless white blotch. How do we compress this massive range smoothly?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer();
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const clock = new THREE.Clock();
function animate() {
    renderer.toneMappingExposure = 1.0 + Math.sin(clock.getElapsedTime()) * 0.5;
}
console.log('Tone mapping enabled:', renderer.toneMapping);
```
This isolates the tone mapping properties. It shows how ACESFilmic is applied globally to the renderer and how exposure acts as a multiplier before the tone map curve is applied.

### Discard the throwaway
This isolated renderer setup is discarded.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-17.html`
- **Change type**: configure
- **Location**: Immediately after creating the `WebGLRenderer`.
- **Dependencies**: None.

### The New Code
```javascript
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
```

### The Updated Project
```javascript
// 1
const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
// 2
renderer.setSize(window.innerWidth, window.innerHeight);
// 3
renderer.toneMapping = THREE.ACESFilmicToneMapping; // ← new
// 4
renderer.toneMappingExposure = 1.0; // ← new
```
We configure the renderer to process HDR pixel data through the ACES filmic curve before sending it to the screen.

### Mechanical walkthrough
- `renderer.toneMapping`: Sets the algorithm used. `THREE.ACESFilmicToneMapping` applies an S-curve that provides dark shadows, linear midtones, and a soft shoulder for highlights, mimicking real camera film.
- `renderer.toneMappingExposure`: A linear multiplier applied to light values before tone mapping. `1.0` is baseline; higher values let more light in, brightening the image.

### CS lens
Tone mapping is a non-linear color space transformation. If incoming luminance is `L`, a simple clamp is `min(L, 1.0)`. ACES uses an S-curve defined roughly by `(L*(a*L+b))/(L*(c*L+d)+e)`, ensuring that even at extremely high `L` values, the output approaches 1.0 smoothly without abruptly clipping, preserving subtle gradients inside bright light sources.

### SE lens
Tone mapping is applied globally as a post-processing step in the renderer's final fragment shader output. It separates the physical correctness of the lighting calculations (which happen in unbounded linear HDR space) from the artistic display constraints of the output device.

### Commands needed
Open lesson-17.html served via http.server. Run: python3 -m http.server 8080

### Run it
Highlights on the chrome sphere and the bright sky no longer look washed out and clamped; they look rich and naturally compressed.

### One sentence connecting to previous unit
Tone mapping provides the final polish, allowing the full dynamic range of the environment map to be perceived realistically.

## Closing

### Connect the pieces
Trace loading `royal_esplanade_1k.hdr` -> `PMREMGenerator.fromEquirectangular()` converts it -> `envMap` -> `scene.environment = envMap` makes it available globally -> a chrome sphere with `roughness=0` reflects this environment vividly -> the final image is passed through `ACESFilmicToneMapping` so the intensely bright reflections look natural on your screen. You have successfully implemented image-based lighting.
