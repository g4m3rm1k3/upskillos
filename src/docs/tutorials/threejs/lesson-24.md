# Lesson 24: Introduction to GLSL Shaders — Vertex and Fragment Shaders

**What you will build**
You will build a foundational understanding of the WebGL rendering pipeline by bypassing Three.js's built-in materials and writing your own custom GPU programs. You will implement a custom vertex shader to manipulate 3D geometry and a custom fragment shader to control pixel colors precisely, culminating in animated, mathematically generated visual effects.

**What you need to know first**
- Lesson 23

**Terms used in this lesson**
- **Shader** — A program that runs directly on the GPU, designed to process graphics data in parallel. Shaders give you raw control over vertex positions and pixel colors instead of relying on pre-built materials.
- **GLSL (OpenGL Shading Language)** — The strictly-typed, C-like language used to write WebGL shaders. It dictates how GPU programs are structured and compiled.
- **Vertex Shader** — The first stage of the programmable pipeline. It runs exactly once for every vertex in a geometry, and its sole mandatory job is to output the final 2D screen coordinate (clip space) for that vertex.
- **Fragment Shader** — The second stage of the pipeline. After vertices form a shape, the rasterizer figures out which pixels that shape covers. The fragment shader runs once for every single covered pixel, determining its final color.
- **Clip Space** — The standardized coordinate system the GPU expects as output from the vertex shader. All visible coordinates range from -1.0 to 1.0 across X, Y, and Z axes.
- **Varying** — A variable declared in both shaders used to pass data from the vertex shader to the fragment shader. The GPU automatically interpolates (blends) the varying's value across the face of the triangle between vertices.
- **Uniform** — A variable passed from your JavaScript CPU code to the GPU shaders. Its value remains identical for all vertices and fragments during a single draw call, making it perfect for global data like time or base colors.
- **Attribute** — A variable passed from your BufferGeometry to the vertex shader. Its value is unique per-vertex, such as position, normal vector, or texture coordinates (UVs).

**Objects and methods used**

- **`THREE.ShaderMaterial`**
  - *What it is:* A Three.js material subclass that uses custom GLSL shaders instead of built-in physically based rendering logic.
  - *Implementation:* `new THREE.ShaderMaterial({ vertexShader: String, fragmentShader: String, uniforms: Object })`
  - *Its use:* To bind our custom vertex and fragment GLSL code to a `THREE.Mesh` so it can be rendered by the WebGL pipeline.
  - *Type:* Class
  - *Responsibility:* Compiles and links GLSL string inputs into a WebGL shader program and binds it to the geometry.
  - *Depends on:* Valid GLSL string code for both vertex and fragment shaders.
  - *Connects to:* Attached to a `THREE.Mesh`; communicates with the WebGLRenderer.
  - *Shape:* A framework integration boundary bridging JavaScript configuration and native GPU programs.

- **`gl_Position`**
  - *What it is:* A built-in GLSL output variable for the vertex shader.
  - *Implementation:* `vec4 gl_Position`
  - *Its use:* Must be assigned the final transformed position of the vertex in clip space coordinates.
  - *Type:* Built-in GLSL variable (vec4)
  - *Responsibility:* Tells the GPU rasterizer exactly where this vertex lives on the screen.
  - *Depends on:* Matrix multiplications (projection * view * model) applied to the local vertex position.
  - *Connects to:* Output from vertex shader, consumed by the GPU rasterization hardware.
  - *Shape:* The required return value of the vertex shader stage.

- **`gl_FragColor`**
  - *What it is:* A built-in GLSL output variable for the fragment shader.
  - *Implementation:* `vec4 gl_FragColor`
  - *Its use:* Must be assigned the final output color of the pixel (RGBA format, values 0.0 to 1.0).
  - *Type:* Built-in GLSL variable (vec4)
  - *Responsibility:* Defines what color actually gets painted to the screen buffer for a specific fragment.
  - *Depends on:* Computations involving uniforms, varyings, or hardcoded values within the fragment shader.
  - *Connects to:* Output from fragment shader, consumed by the framebuffer.
  - *Shape:* The required return value of the fragment shader stage.

---

## Concept Unit: ShaderMaterial — your first custom shader

### The Problem
Built-in Three.js materials (`MeshStandardMaterial`, `MeshBasicMaterial`) are convenient, but what if you want an effect they don't support, like a custom distortion or a mathematically generated pattern? You need a way to bypass the standard renderer logic and tell the GPU exactly what to do.

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

// A minimal custom shader material
const material = new THREE.ShaderMaterial({
    vertexShader: `
        void main() {
            // Transform local vertex position to screen clip space
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        void main() {
            // Output solid opaque red
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
    `,
});
const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), material);
console.log('ShaderMaterial type:', material.type); 
```
**Output:** `ShaderMaterial type: ShaderMaterial`
This isolated test proves that `ShaderMaterial` successfully encapsulates our custom GLSL string code. The vertex shader outputs the position, and the fragment shader outputs solid red.

### Discard the throwaway
This snippet is purely for demonstration and will not be added to the main project. We will integrate it properly next.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are introducing low-level graphics programming.
- **Files affected:** `lesson-24.html` (created)
- **Change type:** Add
- **Location:** Inside the main `<script type="module">` block.
- **Dependencies:** Three.js library via CDN.

### The New Code
```javascript
const customMaterial = new THREE.ShaderMaterial({
    vertexShader: `
        void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        void main() {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
    `
});
const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), customMaterial);
scene.add(mesh);
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <head>
4:     <title>Lesson 24 - Shaders</title>
5:     <style>body { margin: 0; }</style>
6: </head>
7: <body>
8:     <script type="importmap">
9:         { "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }
10:    </script>
11:    <script type="module">
12:        import * as THREE from 'three';
13:        const scene = new THREE.Scene();
14:        const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
15:        const renderer = new THREE.WebGLRenderer();
16:        renderer.setSize(window.innerWidth, window.innerHeight);
17:        document.body.appendChild(renderer.domElement);
18:        camera.position.z = 5;
19:
20:        // ← new start
21:        const customMaterial = new THREE.ShaderMaterial({
22:            vertexShader: `
23:                void main() {
24:                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
25:                }
26:            `,
27:            fragmentShader: `
28:                void main() {
29:                    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
30:                }
31:            `
32:        });
33:        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), customMaterial);
34:        scene.add(mesh);
35:        // ← new end
36:
37:        function animate() {
38:            requestAnimationFrame(animate);
39:            mesh.rotation.x += 0.01;
40:            mesh.rotation.y += 0.01;
41:            renderer.render(scene, camera);
42:        }
43:        animate();
44:    </script>
45: </body>
46: </html>
```
The project now renders a rotating 3D box using our custom ShaderMaterial. It appears as a flat, unlit red silhouette because our fragment shader blindly returns red for every pixel without calculating lighting.

### Mechanical walkthrough
- `const customMaterial = new THREE.ShaderMaterial({...})`: Instantiates a new material expecting raw GLSL code.
- `vertexShader: ...`: A string containing the GLSL code that runs for each of the 24 vertices of the `BoxGeometry`.
- `void main() { ... }`: The required entry point function for GLSL shaders.
- `vec4(position, 1.0)`: Upcasts the built-in 3D `position` attribute (`vec3`) to a 4D vector (`vec4`), adding a `w` component of `1.0` required for matrix multiplication.
- `projectionMatrix * modelViewMatrix`: Built-in Three.js uniforms that transform the coordinate from local object space, into camera view space, and finally into screen clip space.
- `gl_Position = ...`: Assigns the final transformed coordinate to the required built-in output variable.
- `fragmentShader: ...`: A string containing GLSL code that runs for every pixel the box covers on screen.
- `gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0)`: Assigns pure red (`r=1.0, g=0.0, b=0.0`) with full opacity (`a=1.0`) to the built-in fragment color output.

### CS lens
Parallel processing is the defining characteristic of the GPU. A CPU might iterate over an array of pixels one by one in a `for` loop. A GPU executes the fragment shader program concurrently across thousands of processing cores, calculating the color of thousands of pixels simultaneously. Because of this parallel nature, GLSL has strict constraints: shaders cannot allocate dynamic memory, cannot perform recursive function calls, and cannot easily share data between threads (pixels).

### SE lens
Using strings for GLSL code inside JavaScript (`vertexShader: \`...\``) creates a tooling boundary. Your JavaScript IDE will not provide syntax highlighting, linting, or autocomplete for the GLSL code within the string by default. When shaders grow complex, engineers typically extract them into standalone `.glsl` files and configure their bundler (like Webpack or Vite) to import them as text strings, restoring tooling support.

### Commands needed
Open `lesson-24.html` in a modern browser.

### Run it
The browser will display a rotating, unshaded, flat red square (the 3D box viewed without lighting cues).

### One sentence connecting to previous unit
Now that we have successfully bypassed Three.js's default materials with our own programs, we need to understand the strictly typed language those programs are written in: GLSL.

---

## Concept Unit: GLSL types and built-in variables

### The Problem
JavaScript is dynamically typed; `let x = 1` works the same as `let x = 1.0`. GLSL runs on strict GPU hardware where an integer and a float are fundamentally different. If you try to mix them, or don't know what types the built-in Three.js variables use, your shader will fail to compile.

### Introduce the concept in isolation
```javascript
// Validating GLSL types conceptually (pseudo-validation)
const validGLSL = `
    void main() {
        float a = 1.0;     // Valid float
        int b = 2;         // Valid integer
        vec2 uv = vec2(0.5, 1.0); // 2D vector
        vec3 color = vec3(1.0, 0.0, 0.0); // 3D vector
        vec4 data = vec4(color, 1.0); // 4D vector composed from a vec3 and a float
    }
`;
```
**Output:** (No output, concept demonstration)
This demonstrates the strict, C-like typing of GLSL. Every variable must have a declared type, and floats must include a decimal point.

### Discard the throwaway
This snippet is conceptual syntax only and will not be added to the project.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-24.html`
- **Change type:** Refactor
- **Location:** Inside the vertex shader string of `customMaterial`.
- **Dependencies:** None.

### The New Code
```javascript
            vertexShader: `
                // Built-in attributes provided by Three.js BufferGeometry:
                // attribute vec3 position;
                // attribute vec2 uv;
                // attribute vec3 normal;
                
                // Built-in uniforms provided by Three.js cameras and objects:
                // uniform mat4 projectionMatrix;
                // uniform mat4 modelViewMatrix;

                void main() {
                    vec3 pos = position; // explicitly extracting the vec3
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
```

### The Updated Project
```html
20:        // ← new start
21:        const customMaterial = new THREE.ShaderMaterial({
22:            vertexShader: `
23:                void main() {
24:                    vec3 pos = position; // Reading the built-in attribute
25:                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
26:                }
27:            `,
28:            fragmentShader: `
29:                void main() {
30:                    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
31:                }
32:            `
33:        });
34:        // ← new end
```
The behavior of the project is identical, but the shader explicitly demonstrates interacting with the strict types.

### Mechanical walkthrough
- `vec3 pos = position;`: Declares a new variable `pos` strictly typed as a 3-component float vector (`vec3`). It is initialized with the value of the built-in `position` attribute.
- `attribute`: A GLSL storage qualifier. Attributes are data defined per-vertex. Three.js automatically provides `position`, `uv`, and `normal` for its standard geometries.
- `uniform`: A GLSL storage qualifier. Uniforms are global values passed from CPU to GPU that stay the same for an entire draw call. Three.js automatically provides the transformation matrices (`projectionMatrix`, `modelViewMatrix`).

### CS lens
Strict, explicit typing allows the compiler to generate highly optimized machine code for the GPU architecture. Hardware vector processors can execute operations on a `vec4` (like adding two vectors together) in a single clock cycle (SIMD: Single Instruction, Multiple Data). Dynamic typing would introduce massive overhead checking types at runtime.

### SE lens
When a ShaderMaterial fails to compile due to a GLSL type error, Three.js catches the WebGL error and logs it to the browser console. Reading these WebGL compiler errors is a crucial debugging skill. An error like `type mismatch` often means you tried to multiply a `vec3` by an `int` instead of a `float` (e.g., `pos * 2` instead of `pos * 2.0`).

### Commands needed
Open `lesson-24.html` in a modern browser.

### Run it
The display remains a rotating flat red square. No visual change, but the shader is now explicitly managing its types.

### One sentence connecting to previous unit
Knowing the built-in per-vertex attributes, we can now pass that data from the vertex shader over to the fragment shader.

---

## Concept Unit: Passing UV to fragment shader with varying

### The Problem
The fragment shader dictates color, but it only knows about pixels. If we want to color a shape based on its geometry—for example, mapping an image onto it using UV coordinates—the fragment shader needs access to those UVs. However, UVs are an `attribute` bound to vertices, not fragments. How do we send data from the vertex stage down to the fragment stage?

### Introduce the concept in isolation
```javascript
// Minimal varying demonstration
const mat = new THREE.ShaderMaterial({
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = vec2(1.0, 0.5); // Hardcoded value passed along
            gl_Position = vec4(0.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        void main() {
            gl_FragColor = vec4(vUv.x, vUv.y, 0.0, 1.0); // Reads interpolated value
        }
    `
});
console.log("Varyings link shaders together");
```
**Output:** `Varyings link shaders together`
This validates that a variable declared with the `varying` keyword in both shaders forms a bridge.

### Discard the throwaway
We will discard this hardcoded test and map actual geometry UV coordinates.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-24.html`
- **Change type:** Replace
- **Location:** Replacing the `customMaterial` shaders entirely.
- **Dependencies:** None.

### The New Code
```javascript
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv; 
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                void main() {
                    gl_FragColor = vec4(vUv.x, vUv.y, 0.0, 1.0);
                }
            `
```

### The Updated Project
```html
20:        // ← new start
21:        const customMaterial = new THREE.ShaderMaterial({
22:            vertexShader: `
23:                varying vec2 vUv;
24:                void main() {
25:                    vUv = uv; 
26:                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
27:                }
28:            `,
29:            fragmentShader: `
30:                varying vec2 vUv;
31:                void main() {
32:                    gl_FragColor = vec4(vUv.x, vUv.y, 0.0, 1.0);
33:                }
34:            `
35:        });
36:        // ← new end
```
The cube is no longer solid red. Instead, each face of the cube displays a color gradient ranging from black to red, green, and yellow at its corners.

### Mechanical walkthrough
- `varying vec2 vUv;` (in vertex shader): Declares an outbound variable to send data to the next pipeline stage. The convention is to prefix varyings with `v`.
- `vUv = uv;`: Assigns the built-in Three.js `uv` attribute to our varying. The vertex shader runs only at the corners of the geometry.
- `varying vec2 vUv;` (in fragment shader): Declares the inbound variable. The name and type must match the vertex shader exactly.
- `gl_FragColor = vec4(vUv.x, vUv.y, 0.0, 1.0);`: Uses the interpolated UV coordinates as color. `vUv.x` becomes the red channel, and `vUv.y` becomes the green channel.

### CS lens
The magic of varyings is interpolation. When the vertex shader outputs `vUv` at corner A as `(0,0)` and at corner B as `(1,0)`, the GPU rasterizer kicks in before the fragment shader. For a pixel physically located halfway between A and B on the screen, the rasterization hardware automatically interpolates the value, handing `vUv` as `(0.5, 0)` to the fragment shader. You get smooth gradients for free.

### SE lens
Matching varying names exactly across strings is prone to typos that cause silent failures or compile errors. This is why shader code relies heavily on established naming conventions (like prefixing varyings with `v_` or `v`, and uniforms with `u_` or `u`) to maintain sanity when reading pairs of independent programs.

### Commands needed
Open `lesson-24.html` in a modern browser.

### Run it
The rotating box now has distinct color gradients on each face mapping its UV coordinates to red and green color channels.

### One sentence connecting to previous unit
Now that the GPU stages can talk to each other, we need a way for our JavaScript CPU code to talk to the GPU on the fly.

---

## Concept Unit: Uniforms — passing data from JavaScript to shader

### The Problem
Our shaders are entirely static. If we want a color to pulse over time, or react to user input, the shader code itself can't know about that. We need to push data from our JavaScript runtime (CPU) into the shader execution context (GPU) every frame.

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';
const mat = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0.0 }
    },
    vertexShader: `
        uniform float uTime;
        void main() { gl_Position = vec4(0.0); }
    `,
    fragmentShader: `void main() { gl_FragColor = vec4(0.0); }`
});
mat.uniforms.uTime.value = 5.0; // Update value from JS
console.log("Uniform updated to:", mat.uniforms.uTime.value);
```
**Output:** `Uniform updated to: 5`
This proves that the `uniforms` configuration object creates a bridge, allowing JavaScript to update a value that a `uniform` declaration in the shader will read.

### Discard the throwaway
We will discard this minimal test and apply uniforms to animate our 3D geometry and colors.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-24.html`
- **Change type:** Replace
- **Location:** Update the `customMaterial` definition and the `animate` loop.
- **Dependencies:** None.

### The New Code
```javascript
        const customMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0.0 },
                uColor: { value: new THREE.Color(0.0, 0.5, 1.0) }
            },
            vertexShader: `
                uniform float uTime;
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    vec3 pos = position;
                    pos.z += sin(pos.x * 3.0 + uTime) * 0.2;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform float uTime;
                varying vec2 vUv;
                void main() {
                    float brightness = sin(vUv.x * 10.0 + uTime) * 0.5 + 0.5;
                    gl_FragColor = vec4(uColor * brightness, 1.0);
                }
            `
        });
        
        const clock = new THREE.Clock(); // Add before animate function
```

### The Updated Project
```html
20:        // ← new start
21:        const customMaterial = new THREE.ShaderMaterial({
22:            uniforms: {
23:                uTime: { value: 0.0 },
24:                uColor: { value: new THREE.Color(0.0, 0.5, 1.0) } // Blue color
25:            },
26:            vertexShader: `
27:                uniform float uTime;
28:                varying vec2 vUv;
29:                void main() {
30:                    vUv = uv;
31:                    vec3 pos = position;
32:                    pos.z += sin(pos.x * 3.0 + uTime) * 0.2; // Wave effect
33:                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
34:                }
35:            `,
36:            fragmentShader: `
37:                uniform vec3 uColor;
38:                uniform float uTime;
39:                varying vec2 vUv;
40:                void main() {
41:                    float brightness = sin(vUv.x * 10.0 + uTime) * 0.5 + 0.5;
42:                    gl_FragColor = vec4(uColor * brightness, 1.0);
43:                }
44:            `
45:        });
46:        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 32, 32), customMaterial); // Switched to high-res plane
47:        scene.add(mesh);
48:
49:        const clock = new THREE.Clock();
50:        
51:        function animate() {
52:            requestAnimationFrame(animate);
53:            customMaterial.uniforms.uTime.value = clock.getElapsedTime(); // Update uniform
54:            renderer.render(scene, camera);
55:        }
56:        // ← new end
```
*(Note: I replaced `BoxGeometry(1,1,1)` with `PlaneGeometry(2,2,32,32)` and removed rotation in the animate loop to make the vertex displacement wave clearly visible).*

The plane now ripples like a flag in the wind, and dark blue bands animate smoothly across its surface.

### Mechanical walkthrough
- `uniforms: { uTime: { value: 0.0 }, ... }`: Three.js configures the shader material to bind data to the GPU. The object structure must exactly follow `{ value: data }`.
- `uniform float uTime;` (in GLSL): Declares that the shader should receive a float from the CPU named `uTime`.
- `pos.z += sin(pos.x * 3.0 + uTime) * 0.2`: A mathematical formula modifying the vertex's local Z coordinate. Using `sin()` combined with the increasing `uTime` creates an oscillating wave.
- `uniform vec3 uColor;`: A `THREE.Color` passed as a uniform is automatically mapped to a GLSL `vec3` representing RGB.
- `float brightness = ...`: Computes a multiplier oscillating between `0.0` and `1.0` based on UV and time.
- `vec4(uColor * brightness, 1.0)`: Multiplies the base color by the brightness. Vector-scalar multiplication in GLSL multiplies every component of the vector by the scalar.
- `customMaterial.uniforms.uTime.value = clock.getElapsedTime()`: Every single frame, JavaScript calculates the elapsed seconds and pushes the new value to the GPU via the uniform binding.

### CS lens
Uniforms represent a critical synchronization point. The CPU prepares data (updating the clock), and then issues a draw call (`renderer.render`). Only then does the data travel over the system bus to the GPU VRAM. The shaders execute using that frozen snapshot of data. This unidirectional data flow (CPU -> GPU) is fundamental to real-time graphics architecture.

### SE lens
Passing complex data (like arrays or large matrices) as uniforms every frame can become a performance bottleneck due to bandwidth constraints between the CPU and GPU. For simple floats and vectors like time and color, the overhead is negligible, making it the standard pattern for driving shader animation.

### Commands needed
Open `lesson-24.html` in a modern browser.

### Run it
The browser renders a flat plane that physically ripples (vertex shader) while displaying scrolling dark and light blue color bands (fragment shader).

### One sentence connecting to previous unit
The `sin()` function powered our animation; GLSL provides an entire suite of built-in math functions optimized for graphics.

---

## Concept Unit: Built-in GLSL functions

### The Problem
You need to generate complex visual patterns, but conditionals like `if/else` statements are notoriously slow on GPU architectures due to "branch divergence" (where different threads in the parallel execution take different paths, forcing the hardware to wait). We need math functions that can generate sharp lines, grids, and boundaries without branching.

### Introduce the concept in isolation
```javascript
// Demonstrating the logic of GLSL fract() and step() in JS
function simulateGLSL() {
    let x = 1.7;
    let fractionalPart = x - Math.floor(x); // fract(x) equivalent
    
    // step(edge, value): returns 1.0 if value >= edge, else 0.0
    let edge = 0.5;
    let isGreater = fractionalPart >= edge ? 1.0 : 0.0; // step() equivalent
    return isGreater;
}
console.log("Simulated step(0.5, fract(1.7)):", simulateGLSL());
```
**Output:** `Simulated step(0.5, fract(1.7)): 1`
This proves that mathematical operations can replace `if` statements. `fract` extracts repeating decimals, and `step` creates a hard binary cutoff.

### Discard the throwaway
This JavaScript simulation of GLSL functions is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-24.html`
- **Change type:** Replace
- **Location:** Update the `fragmentShader` string.
- **Dependencies:** None.

### The New Code
```javascript
            fragmentShader: `
                varying vec2 vUv;
                void main() {
                    // Multiply UV by 10 and extract decimal part to create a 10x10 repeating grid
                    vec2 grid = fract(vUv * 10.0); 
                    
                    // Generate a hard line at the upper 5% edge of each grid cell
                    float lineX = step(0.95, grid.x);
                    float lineY = step(0.95, grid.y);
                    
                    // Combine X and Y lines, clamp to max 1.0
                    float line = clamp(lineX + lineY, 0.0, 1.0);
                    
                    // Mix between dark grey and white based on the line value
                    vec4 bgColor = vec4(0.1, 0.1, 0.1, 1.0);
                    vec4 lineColor = vec4(1.0, 1.0, 1.0, 1.0);
                    gl_FragColor = mix(bgColor, lineColor, line);
                }
            `
```

### The Updated Project
```html
20:        // ← new start
21:        const customMaterial = new THREE.ShaderMaterial({
22:            uniforms: {
23:                uTime: { value: 0.0 },
24:            },
25:            vertexShader: `
26:                uniform float uTime;
27:                varying vec2 vUv;
28:                void main() {
29:                    vUv = uv;
30:                    vec3 pos = position;
31:                    pos.z += sin(pos.x * 3.0 + uTime) * 0.2;
32:                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
33:                }
34:            `,
35:            fragmentShader: `
36:                varying vec2 vUv;
37:                void main() {
38:                    vec2 grid = fract(vUv * 10.0); 
39:                    float lineX = step(0.95, grid.x);
40:                    float lineY = step(0.95, grid.y);
41:                    float line = clamp(lineX + lineY, 0.0, 1.0);
42:                    vec4 bgColor = vec4(0.1, 0.1, 0.1, 1.0);
43:                    vec4 lineColor = vec4(1.0, 1.0, 1.0, 1.0);
44:                    gl_FragColor = mix(bgColor, lineColor, line);
45:                }
46:            `
47:        });
48:        // ← new end
```
The animated blue bands are replaced by a sharp, repeating 10x10 white grid over a dark background.

### Mechanical walkthrough
- `fract(vUv * 10.0)`: Multiplies UV coordinates (0.0 to 1.0) by 10, resulting in (0.0 to 10.0). `fract()` throws away the integer part, leaving only the decimal. The result smoothly loops from 0.0 to 0.999 ten times across the surface.
- `step(0.95, grid.x)`: A built-in function taking an edge value and a test value. Returns `0.0` if `grid.x < 0.95`, and `1.0` if `grid.x >= 0.95`. This creates a sharp boundary (the grid line) using pure math.
- `clamp(value, min, max)`: Restricts a value to a range. If `lineX` and `lineY` are both `1.0` (at the intersection), their sum is `2.0`. Clamp forces it back to `1.0`.
- `mix(value1, value2, percentage)`: Linear interpolation. When `line` is `0.0`, it returns `bgColor`. When `line` is `1.0`, it returns `lineColor`.

### CS lens
These built-in functions (`fract`, `step`, `mix`, `clamp`, `sin`, `dot`) are implemented directly in the silicon of the GPU. Calling `step()` is not invoking a library function; it maps to native hardware instructions. This is why procedural generation (creating textures via math rather than loading image files) is insanely fast on modern hardware.

### SE lens
Replacing conditional logic with continuous mathematical functions is the core paradigm shift of shader programming. An `if` statement on a CPU is cheap. On a GPU, an `if` statement can force the entire block of parallel threads to evaluate both branches. Learning to use `step` and `mix` instead of `if` is essential for writing performant shaders.

### Commands needed
Open `lesson-24.html` in a modern browser.

### Run it
The rippling plane now displays a sharp, mathematically perfect grid pattern that stretches and distorts according to the waves generated by the vertex shader.

### One sentence connecting to previous unit
Combining uniforms, varyings, and mathematical built-ins provides the raw toolkit needed to build virtually any visual effect.

---

## Closing

### Connect the pieces
Trace the lifecycle of a single point in our scene, for example, a vertex at the far right edge of the plane with UV coordinate `(1.0, 0.5)`. 
1. The CPU updates `uTime` and issues the draw call.
2. The **Vertex Shader** executes for this vertex. It reads the `position` attribute, uses `sin()` and `uTime` to physically push the vertex along the Z axis, and outputs the final `gl_Position`. It also grabs the `uv` and passes it forward as the `varying vUv`.
3. The GPU rasterizes the geometry, finding all the pixels covered by the shape. It interpolates `vUv` for every single pixel.
4. The **Fragment Shader** executes for a pixel located at that right edge. It receives the interpolated `vUv`. It uses `fract()` to multiply the UV and determine if it falls within the 5% threshold edge of the grid cell.
5. `step()` returns a hard `1.0` for the line, and `mix()` outputs pure white to `gl_FragColor`. 

Every pixel on screen from a 3D scene is computed by these two programs working in tandem. Writing custom shaders gives you complete, uncompromising control over both the geometry and the pixels.
