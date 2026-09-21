# Lesson 23: Post-Processing — EffectComposer, RenderPass, UnrealBloomPass

What you will build: In this lesson, you will build a post-processing pipeline to add a glowing bloom effect to specific objects in a 3D scene. You will understand that post-processing applies full-screen image effects AFTER the 3D scene is rendered by routing the rendering through an EffectComposer rather than directly to the canvas.

What you need to know first:
- Lesson 22 (or earlier covering basic Three.js setup, Renderer, Scene, Camera).

**Terms used in this lesson**
- **Post-processing** — The technique of applying 2D image effects (like blur, color correction, or bloom) to a rendered 3D scene before it is displayed on the screen. It exists to enhance the visual quality without modifying the 3D geometry or materials directly.
- **Ping-pong rendering** — A technique using two alternating render targets where the output of one pass becomes the input of the next. It solves the problem of needing to read from and write to textures sequentially during multiple post-processing passes.
- **Luminance** — A measure of the perceived brightness of a color. It is used to threshold which pixels should receive the bloom effect, preventing dark areas from glowing.
- **Tone mapping** — The process of mapping High Dynamic Range (HDR) colors to the limited Low Dynamic Range (LDR) of a standard screen. It prevents intensely bright colors (like emissive materials) from just turning flat white, preserving detail.

**Objects and methods used**

- **EffectComposer**
  - *What it is:* The main orchestrator for the post-processing pipeline in Three.js.
  - *Implementation:* `import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';`
  - *Its use:* We use it to replace the standard `renderer.render()` call so we can stack multiple rendering passes.
  - *Type:* Class constructor `EffectComposer(renderer, renderTarget?)`.
  - *Responsibility:* Manages a chain of passes and handles the ping-pong rendering between internal render targets.
  - *Depends on:* A `WebGLRenderer` instance.
  - *Connects to:* Calls `render()` on each added pass sequentially.
  - *Shape:* A wrapper around the renderer at the application boundary, intercepting the final output.

- **RenderPass**
  - *What it is:* A post-processing pass that renders the 3D scene normally, but into a texture instead of the screen.
  - *Implementation:* `import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';`
  - *Its use:* It is always the first pass in our composer, capturing the base scene so subsequent effects have an image to work with.
  - *Type:* Class constructor `RenderPass(scene, camera)`.
  - *Responsibility:* Renders the provided scene and camera into the composer's current read buffer.
  - *Depends on:* A `Scene` and a `Camera`.
  - *Connects to:* Writes pixel data to an internal texture used by the next pass.
  - *Shape:* The entry point of the post-processing pipeline.

- **UnrealBloomPass**
  - *What it is:* A pass that applies a high-quality bloom (glow) effect to bright areas of the image.
  - *Implementation:* `import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';`
  - *Its use:* We use it to make emissive objects look like they are actually emitting light by bleeding their color into surrounding pixels.
  - *Type:* Class constructor `UnrealBloomPass(resolution, strength, radius, threshold)`.
  - *Responsibility:* Extracts pixels above a luminance threshold, blurs them, and adds them back over the original image.
  - *Depends on:* The output of the previous pass (typically `RenderPass`).
  - *Connects to:* Reads the current buffer, processes it, and writes the bloomed image to the next buffer.
  - *Shape:* A middle-stage effect in the composer pipeline.

- **OutputPass**
  - *What it is:* The final pass that performs color space conversion and tone mapping.
  - *Implementation:* `import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';`
  - *Its use:* It ensures the final composite image is correctly formatted for display on the monitor, matching what standard rendering would do.
  - *Type:* Class constructor `OutputPass()`.
  - *Responsibility:* Converts linear color to sRGB and applies the renderer's tone mapping to the final texture before drawing it to the canvas.
  - *Depends on:* The final processed texture from the preceding passes.
  - *Connects to:* Writes directly to the screen (canvas).
  - *Shape:* The terminal node of the post-processing pipeline.

- **Everything else in the file, not this lesson's subject but still explained**
- **WebGLRenderer.toneMapping**: Property (`THREE.ACESFilmicToneMapping`). Used to compress HDR values (emissive > 1) gracefully.

## Concept Unit: The Post-Processing Pipeline

### The Problem
When you call `renderer.render(scene, camera)`, Three.js draws the 3D scene directly to the HTML canvas. What if you want to apply a 2D effect to the entire rendered image, like a blur, a color tint, or a cinematic glow, before the user sees it? You can't easily do this within the standard 3D rendering step because these effects need to analyze the whole flat image at once. How can we intercept the image between the 3D scene and the screen?

### Introduce the concept in isolation
Instead of rendering to the canvas, we render to a hidden texture (a Render Target), pass that texture through various effect filters, and only then draw the final result to the canvas.

```javascript
// Throwaway isolation example
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Setup basic renderer, scene, camera
const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();

// The pipeline:
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 1.5, 0.4, 0.85));
composer.addPass(new OutputPass());

// Instead of renderer.render(scene, camera), we do:
composer.render();
console.log('Pass count:', composer.passes.length); // Outputs: Pass count: 3
```
This demonstrates **Post-Processing**. The output proves that the `EffectComposer` holds multiple passes (3 in this case). When `composer.render()` is called, it executes them in order: RenderPass captures the scene, UnrealBloomPass blurs bright spots, and OutputPass formats it for the screen.

### Discard the throwaway
This simplified setup is discarded and will not be used in our project code.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition to introduce the composer pipeline.
- **Files affected:** `index.html` (modified)
- **Change type:** refactor / add
- **Location:** Inside the main setup block, replacing the standard render loop call.
- **Dependencies:** Requires Three.js addons `EffectComposer.js`, `RenderPass.js`, `UnrealBloomPass.js`, and `OutputPass.js`.

### The New Code
```html
<script type="module">
import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,   
    0.4,   
    0.85   
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

function animate() {
    requestAnimationFrame(animate);
    composer.render();
}
animate();
</script>
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <body>
4: <canvas id="c"></canvas>
5: <script type="module">
6: import * as THREE from 'three';
7: import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js'; // ← new
8: import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js'; // ← new
9: import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'; // ← new
10: import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js'; // ← new
11: 
12: const canvas = document.getElementById('c');
13: const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
14: renderer.setSize(window.innerWidth, window.innerHeight);
15: renderer.toneMapping = THREE.ACESFilmicToneMapping; // ← new
16: 
17: const scene = new THREE.Scene();
18: const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
19: 
20: const composer = new EffectComposer(renderer); // ← new
21: const renderPass = new RenderPass(scene, camera); // ← new
22: composer.addPass(renderPass); // ← new
23: 
24: const bloomPass = new UnrealBloomPass( // ← new
25:     new THREE.Vector2(window.innerWidth, window.innerHeight), // ← new
26:     1.5, // ← new
27:     0.4, // ← new
28:     0.85 // ← new
29: ); // ← new
30: composer.addPass(bloomPass); // ← new
31: composer.addPass(new OutputPass()); // ← new
32: 
33: function animate() {
34:     requestAnimationFrame(animate);
35:     composer.render(); // ← new (replaced renderer.render)
36: }
37: animate();
38: </script>
39: </body>
40: </html>
```

### Mechanical walkthrough
- `renderer.toneMapping = THREE.ACESFilmicToneMapping`: Sets the renderer to compress extreme brightness values gracefully rather than just clipping them to white. This is crucial for bloom.
- `const composer = new EffectComposer(renderer)`: Creates the pipeline manager, wrapping our existing renderer.
- `const renderPass = new RenderPass(scene, camera)`: Creates the first pass, which will draw our 3D objects.
- `composer.addPass(renderPass)`: Adds the render pass to the beginning of the composer's sequence.
- `new UnrealBloomPass(new THREE.Vector2(...), 1.5, 0.4, 0.85)`: Creates the bloom effect. The arguments are resolution, strength (intensity of the glow), radius (how far the glow spreads), and threshold (minimum brightness required to trigger a glow).
- `composer.addPass(bloomPass)`: Adds the bloom effect as the second step.
- `composer.addPass(new OutputPass())`: Adds the final step to handle tone mapping and color space correction before drawing to the physical screen.
- `composer.render()`: Executes all added passes in sequence every frame.

### CS lens
The `EffectComposer` implements the **Chain of Responsibility** or a **Pipeline** design pattern. Data (the pixel buffer) enters the top, and each pass performs its specific transformation on that data before handing it to the next. In graphics hardware terms, this requires "ping-pong rendering"—allocating two memory buffers on the GPU and alternating which one is being read from and written to, because a shader generally cannot read and write to the exact same texture simultaneously.

### SE lens
Using a pipeline separates concerns. The `WebGLRenderer` doesn't need to know anything about glow effects or color grading. The `UnrealBloomPass` doesn't need to know how to project 3D geometry into 2D space. Each module does one job and passes its output forward, making the visual system modular and easily extensible just by pushing another pass into the array.

### Commands needed
Open lesson-23.html in a modern browser.

### Run it
When executed, the screen is black because we haven't added any objects yet, but the pipeline is actively running without throwing errors.

### One sentence connecting to previous unit
Now that the pipeline is set up to apply bloom, we need to create objects bright enough to trigger it.

## Concept Unit: Emissive Materials and Glow

### The Problem
The bloom pass is active, but how does it know *what* should glow? If everything glows, the image just looks blurry. We need a way to tell the renderer that certain specific objects are physically emitting intense light.

### Introduce the concept in isolation
We use a material's `emissive` color and push its `emissiveIntensity` above 1.0.

```javascript
// Throwaway isolation example
import * as THREE from 'three';

const mat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0x00ffff,
    emissiveIntensity: 3.0
});
console.log('Glow emissiveIntensity:', mat.emissiveIntensity); // Outputs 3.0
```
This demonstrates **HDR Emissive Values**. By pushing intensity to 3.0, the shader outputs color values far brighter than a standard white pixel. The ACESFilmic tone mapping keeps the color visible, while the bloom pass detects these ultra-bright pixels (above the 0.85 threshold) and blurs them to create a glow.

### Discard the throwaway
This material snippet is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `index.html` (modified)
- **Change type:** add
- **Location:** Inside the setup block, before the animation loop.
- **Dependencies:** The previously configured `UnrealBloomPass`.

### The New Code
```javascript
const glowMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0x00ffff,
    emissiveIntensity: 5.0
});
const glowSphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16), glowMat);
scene.add(glowSphere);

const normalMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 });
const normalSphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16), normalMat);
normalSphere.position.x = 2;
scene.add(normalSphere);
```

### The Updated Project
```html
17: const scene = new THREE.Scene();
18: const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
19: camera.position.z = 5; 
20: 
21: const glowMat = new THREE.MeshStandardMaterial({ // ← new
22:     color: 0x000000, // ← new
23:     emissive: 0x00ffff, // ← new
24:     emissiveIntensity: 5.0 // ← new
25: }); // ← new
26: const glowSphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16), glowMat); // ← new
27: scene.add(glowSphere); // ← new
28: 
29: const normalMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 }); // ← new
30: const normalSphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16), normalMat); // ← new
31: normalSphere.position.x = 2; // ← new
32: scene.add(normalSphere); // ← new
33: 
34: const composer = new EffectComposer(renderer);
```

### Mechanical walkthrough
- `color: 0x000000`: Sets the base diffuse color of the glowing material to black, ensuring only the emitted light is visible.
- `emissive: 0x00ffff`: Sets the glowing color to cyan.
- `emissiveIntensity: 5.0`: Multiplies the emissive color by 5. Because the bloom pass threshold is 0.85, these super-bright values (well over 1.0) will easily trigger the bloom extraction step.
- `normalMat`: A standard gray material with default emissive settings (which is black/0), meaning its luminance remains well below the 0.85 threshold and it will not glow.

### CS lens
Luminance is typically calculated using a dot product of the RGB values against perceived human eye sensitivity weights (e.g., `0.2126 * R + 0.7152 * G + 0.0722 * B`). When `emissiveIntensity` is 5.0, the shader fragment outputs values like `(0, 5.0, 5.0)`. The luminance calculation yields roughly `0 + 3.5 + 0.36 = 3.86`, which is much greater than the threshold `0.85`, flagging this pixel to be isolated and blurred in the bloom pass.

### SE lens
By using `emissiveIntensity` to control bloom, the rendering logic remains physically based. We don't have to write custom shaders or manually mark objects as "glowing" through special tags for basic bloom; we simply treat them as very bright light bulbs, and the pipeline naturally processes the physics of a camera lens overexposing bright light.

### Commands needed
Open lesson-23.html in a modern browser.

### Run it
When executed, you will see two spheres. The left sphere glows with a vibrant cyan halo, while the right sphere remains a flat, sharp gray.

### One sentence connecting to previous unit
The bloom is working perfectly, but if the user resizes the browser window, the effect will break unless we update the composer's internal dimensions.

## Concept Unit: Resizing the Composer

### The Problem
When the browser window resizes, standard Three.js applications call `renderer.setSize(w, h)` to stretch the canvas. However, the `EffectComposer` created its internal textures at the exact dimensions the window had when the page first loaded. If we resize the window, the composer will stretch those low-resolution textures over the new canvas size, making the image pixelated and breaking the bloom proportions.

### Introduce the concept in isolation
Both the composer and specific passes like `UnrealBloomPass` need to be explicitly told when the screen resolution changes.

```javascript
// Throwaway isolation example
import * as THREE from 'three';

let w = 800, h = 600;
// composer.setSize(w, h)
// bloomPass.resolution.set(w, h)
console.log(`Composer resized to: ${w} x ${h}`);
```
This demonstrates **Resolution Management**. Updating the composer's size destroys and recreates the internal render targets (textures) to match the new dimensions. Updating the bloom pass resolution recalculates the math for the Gaussian blur kernel, keeping the blur radius consistent.

### Discard the throwaway
This concept snippet is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `index.html` (modified)
- **Change type:** add
- **Location:** At the bottom of the script, adding a window resize event listener.
- **Dependencies:** `camera`, `renderer`, `composer`, and `bloomPass`.

### The New Code
```javascript
function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloomPass.resolution.set(w, h);
}
window.addEventListener('resize', onResize);
```

### The Updated Project
```html
46: function animate() {
47:     requestAnimationFrame(animate);
48:     composer.render();
49: }
50: animate();
51: 
52: function onResize() { // ← new
53:     const w = window.innerWidth; // ← new
54:     const h = window.innerHeight; // ← new
55:     camera.aspect = w / h; // ← new
56:     camera.updateProjectionMatrix(); // ← new
57:     renderer.setSize(w, h); // ← new
58:     composer.setSize(w, h); // ← new
59:     bloomPass.resolution.set(w, h); // ← new
60: } // ← new
61: window.addEventListener('resize', onResize); // ← new
62: </script>
63: </body>
64: </html>
```

### Mechanical walkthrough
- `const w = window.innerWidth; const h = window.innerHeight`: Grabs the new viewport dimensions.
- `camera.aspect = w / h` and `camera.updateProjectionMatrix()`: Updates the 3D camera to prevent the geometry from stretching.
- `renderer.setSize(w, h)`: Updates the physical HTML `<canvas>` element and the standard WebGL viewport.
- `composer.setSize(w, h)`: Iterates through the ping-pong render buffers and reallocates their GPU memory to exactly match the new width and height.
- `bloomPass.resolution.set(w, h)`: Modifies the specific `THREE.Vector2` representing the resolution inside the bloom pass, ensuring the blur shader samples neighboring pixels at the correct distances.

### CS lens
Every full-screen render target consumes memory equal to `Width * Height * 4 bytes (RGBA)`. Because ping-pong rendering uses at least two of these textures, a resize operation is a relatively expensive GPU memory reallocation. Calling `composer.setSize()` destroys the old textures and asks the GPU driver to assign new memory blocks.

### SE lens
Failing to update internal state (like `composer.setSize()`) while updating external state (`renderer.setSize()`) is a classic source of visual bugs. The `EffectComposer` does not magically observe the renderer it wraps; we must proactively push state changes down the dependency tree manually.

### Commands needed
Open lesson-23.html in a modern browser, and resize the window drastically.

### Run it
When executed, dragging the corner of the browser window keeps the scene perfectly crisp, and the bloom halo around the cyan sphere maintains its exact proportion and softness regardless of the window shape.

### One sentence connecting to previous unit
We now have a robust, responsive post-processing pipeline making bright materials glow.

## Closing
### Connect the pieces
We intercepted the standard 3D rendering flow by injecting an `EffectComposer`. Inside this pipeline, the `RenderPass` drew our scene—featuring one intensely emitting cyan sphere and one dull gray sphere—into an off-screen texture. The `UnrealBloomPass` read that texture, isolated the high-luminance pixels of the cyan sphere based on its `0.85` threshold, blurred them to create a halo, and blended them back in. The `OutputPass` then translated those colors to sRGB space for the monitor. Finally, we bound the composer's internal dimensions to the window resize event, ensuring our rendering pipeline stays mathematically consistent at any resolution.
