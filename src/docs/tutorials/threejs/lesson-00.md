# Lesson 00: What Is 3D Graphics — Coordinates, Cameras, and the GPU Pipeline

What you will build: The reader understands the 3D coordinate system (right-handed, X/Y/Z axes), the GPU rendering pipeline (vertices → rasterization → fragments/pixels), the camera model (frustum, FOV, near/far), and what Three.js abstracts over WebGL. This lesson has NO Three.js code — it establishes the mental model before writing any library code.

What you need to know first: Basic HTML, basic JavaScript (variables, functions, loops).

**Terms used in this lesson**
- **Coordinate system** — A way to use numbers to determine the position of a point in space.
- **Right-handed coordinate system** — A 3D coordinate system where the Z-axis points toward the viewer (thumb=X, index=Y, middle=Z).
- **GPU pipeline** — The sequence of steps a graphics processing unit takes to turn 3D data into 2D pixels.
- **Vertex shader** — A program that runs on the GPU to transform 3D coordinates into 2D screen space.
- **Rasterization** — The process of figuring out which pixels are inside a geometric shape.
- **Fragment shader** — A program that computes the final color of each pixel.
- **Frustum** — A truncated pyramid representing what the camera can see.
- **FOV (Field of View)** — The angle representing how wide the camera's view is.
- **devicePixelRatio** — The ratio between physical pixels and logical CSS pixels on a screen.
- **WebGL** — The browser API for GPU-accelerated 3D graphics.

**Objects and methods used**
- **canvas.getContext**
  - *What it is:* A method to obtain the rendering context and its drawing functions.
  - *Implementation:* `HTMLCanvasElement.getContext(contextType)`
  - *Its use:* Used to get the '2d' or 'webgl' drawing context to draw shapes.
  - *Type:* Instance method of HTMLCanvasElement.
  - *Responsibility:* Initializes and returns the rendering context object.
  - *Depends on:* The canvas element existing in the DOM.
  - *Connects to:* WebGL or Canvas 2D API internally.
  - *Shape:* Boundary between HTML DOM and the rendering APIs.
- **Math.tan**
  - *What it is:* A math function that returns the tangent of a number.
  - *Implementation:* `Math.tan(x)` where x is in radians.
  - *Its use:* Used to calculate the height of the frustum planes based on the FOV angle.
  - *Type:* Static method of the Math object.
  - *Responsibility:* Computes trigonometric tangent.
  - *Depends on:* A numeric input in radians.
  - *Connects to:* Basic arithmetic operations.
  - *Shape:* Internal computation utility.
- **gl.createShader**
  - *What it is:* A WebGL method to create a shader object.
  - *Implementation:* `WebGLRenderingContext.createShader(type)`
  - *Its use:* Used to initialize a vertex or fragment shader before compiling it.
  - *Type:* Instance method of WebGLRenderingContext.
  - *Responsibility:* Allocates a new WebGLShader.
  - *Depends on:* A valid WebGL context.
  - *Connects to:* GPU driver shader compilation stage.
  - *Shape:* Graphics API resource allocation.
- **gl.compileShader**
  - *What it is:* A WebGL method to compile shader source code.
  - *Implementation:* `WebGLRenderingContext.compileShader(shader)`
  - *Its use:* Used to compile the GLSL string into a GPU program.
  - *Type:* Instance method of WebGLRenderingContext.
  - *Responsibility:* Translates GLSL into executable GPU code.
  - *Depends on:* A shader object with source code attached.
  - *Connects to:* GPU driver compiler.
  - *Shape:* Graphics API execution step.

## Concept Unit: The 3D coordinate system

### The Problem
How do we describe where something is in 3D space? If we only have X (left/right) and Y (up/down), how do we represent depth (forward/backward)? What happens if we just guess how Z works?

### Introduce the concept in isolation
```html
<!DOCTYPE html>
<html>
<head><title>Coordinates</title></head>
<body>
<canvas id="c" width="400" height="400" style="border:1px solid black"></canvas>
<script>
// 2D canvas to visualize 3D axes projected onto screen
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const cx = 200, cy = 200;  // center of canvas

// Draw X axis (red), Y axis (green), Z axis (blue, projected)
function drawAxis(dx, dy, color, label) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dx * 80, cy + dy * 80);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = '16px sans-serif';
    ctx.fillText(label, cx + dx * 90, cy + dy * 90);
}

ctx.clearRect(0, 0, 400, 400);
drawAxis(1, 0, 'red',   '+X');
drawAxis(0, -1, 'green', '+Y');  // Y up in 3D space
drawAxis(-0.7, 0.7, 'blue', '+Z');  // Z comes toward viewer (right-handed)
console.log('Right-handed coordinate system drawn');
// In Three.js: +X right, +Y up, +Z toward viewer (out of screen)
</script>
</body>
</html>
```
Trace: cx=200, cy=200 (canvas center). drawAxis(1,0,'red','+X'): line from (200,200) to (280,200). drawAxis(0,-1,'green','+Y'): line from (200,200) to (200,120) — up because canvas Y is inverted. drawAxis(-0.7,0.7,'blue','+Z'): diagonal toward lower-left, representing Z coming toward viewer. Right-handed: thumb=X, index=Y, middle finger=Z (points at you).
This proves how a **Right-handed coordinate system** maps 3D directions onto a 2D view.

### Discard the throwaway
This isolated throwaway code is discarded and will not appear in the project again.

### Project Change
No reference counterpart — this is a from-scratch addition because it is a standalone theory lesson. No persistent project file this lesson.

### The New Code
```javascript
// No new project code for this theory unit.
```

### The Updated Project
```html
<!-- No project file created in this standalone lesson -->
```

### Mechanical walkthrough
- `const canvas = document.getElementById('c');` fetches the canvas element.
- `const ctx = canvas.getContext('2d');` gets the 2D drawing context.
- `ctx.beginPath();` starts a new drawing path.
- `ctx.moveTo(cx, cy);` moves the virtual pen to the center.
- `ctx.lineTo(cx + dx * 80, cy + dy * 80);` draws a line for the axis.
- `ctx.stroke();` renders the drawn line.

### CS lens
The concept here is a Cartesian coordinate system applied in 3-dimensional Euclidean space. This shows up in CAD software, physics simulations, game engines, and GPS positioning systems.

### SE lens
Design principle: Convention over configuration. Three.js standardizes on a right-handed system (like OpenGL) instead of a left-handed one (like DirectX). The alternative would be supporting both or letting developers choose, which would unnecessarily fragment the ecosystem and cause bugs when sharing 3D models.

### Commands needed
Open lesson-00.html in a modern browser (Chrome, Firefox, Edge).

### Run it
The browser shows a canvas with three lines originating from the center: a red line going right (+X), a green line going up (+Y), and a blue line going down-left (+Z). The console logs "Right-handed coordinate system drawn".

### One sentence connecting to previous unit
Now that we know the 3D space, we need to understand how shapes in this space become 2D pixels.

## Concept Unit: The GPU rendering pipeline

### The Problem
How does a computer convert a 3D coordinate (X,Y,Z) into a 2D pixel (X,Y) on your screen? What happens if you try to compute every single pixel with the CPU instead of the GPU?

### Introduce the concept in isolation
```html
<!DOCTYPE html>
<html><body>
<pre id="out"></pre>
<script>
// Simulate the GPU pipeline conceptually in JavaScript
const out = document.getElementById('out');

// STAGE 1: Vertex data (3D positions)
const vertices = [
    {x: -0.5, y: -0.5, z: 0},  // triangle vertex A
    {x:  0.5, y: -0.5, z: 0},  // triangle vertex B
    {x:  0.0, y:  0.5, z: 0},  // triangle vertex C
];

// STAGE 2: Vertex shader — transform 3D to 2D clip space
// (Real GPU does this in parallel for all vertices)
function vertexShader(v, canvasWidth, canvasHeight) {
    // Simple orthographic projection: ignore Z, scale to canvas
    return {
        x: (v.x + 1) * canvasWidth  / 2,  // NDC [-1,1] -> pixels [0,W]
        y: (1 - v.y) * canvasHeight / 2,  // flip Y: NDC -> canvas
    };
}

// STAGE 3: Rasterization — fill pixels inside triangle
// (GPU does this: for every pixel in bounding box, test if inside triangle)
// STAGE 4: Fragment shader — color each pixel
function fragmentShader(pixel) {
    return `rgb(255, ${pixel.x | 0}, ${pixel.y | 0})`; // color varies with position
}

const projected = vertices.map(v => vertexShader(v, 400, 400));
out.textContent = `Pipeline stages:\n` +
    `1. Vertices:   ${JSON.stringify(vertices)}\n` +
    `2. Projected:  ${JSON.stringify(projected)}\n` +
    `3. Rasterize:  GPU fills pixels inside triangle (hardware)\n` +
    `4. Fragment:   Each pixel gets a color from fragment shader\n`;
</script>
</body></html>
```
Trace vertexShader({x:-0.5, y:-0.5, z:0}, 400, 400): x=(-0.5+1)*200=100. y=(1-(-0.5))*200=300. Screen position: (100, 300) = bottom-left of canvas. This proves how the **GPU pipeline** fundamentally breaks down rendering into vertices and fragments.

### Discard the throwaway
This isolated throwaway code is discarded and will not appear in the project again.

### Project Change
No reference counterpart — this is a from-scratch addition because it is a standalone theory lesson. No persistent project file this lesson.

### The New Code
```javascript
// No new project code for this theory unit.
```

### The Updated Project
```html
<!-- No project file created in this standalone lesson -->
```

### Mechanical walkthrough
- `const vertices = [...]` defines an array of 3D points.
- `function vertexShader(v, canvasWidth, canvasHeight)` translates a single 3D point to 2D screen coordinates.
- `vertices.map(...)` applies the vertex shader to all points, mimicking parallel GPU execution.
- `function fragmentShader(pixel)` calculates a color based on pixel coordinates.

### CS lens
The concept here is parallel processing and graphics pipelines. This shows up in vector graphics, video decoding, and machine learning (where GPU parallelization is also used).

### SE lens
Design principle: Pipeline Architecture. The graphics pipeline forces data to move in one direction through fixed stages. The alternative is immediate mode rendering where logic and drawing are intertwined, making it impossible for the hardware to parallelize effectively.

### Commands needed
Open lesson-00.html in a modern browser (Chrome, Firefox, Edge).

### Run it
The browser shows a preformatted text block detailing the 4 pipeline stages with the calculated 2D projected coordinates. 

### One sentence connecting to previous unit
Now that we know how points become pixels, we need a way to define what we can actually see in the 3D space.

## Concept Unit: The camera model — frustum and FOV

### The Problem
If the 3D world is infinite, how do we decide which parts of it get drawn to the screen? What happens to objects that are behind you or too far away?

### Introduce the concept in isolation
```html
<!DOCTYPE html>
<html><body>
<canvas id="c" width="500" height="300" style="border:1px solid #ccc"></canvas>
<script>
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// Draw a 2D side-view diagram of a camera frustum
// Camera at left, frustum opens to the right
const camX = 50, camY = 150;   // camera position in diagram
const near = 80;               // near plane distance
const far  = 350;              // far plane distance
const fovHalf = 40;            // half-angle of FOV in degrees

const fovRad = (fovHalf * Math.PI) / 180;
const nearH = near * Math.tan(fovRad);  // half-height at near plane
const farH  = far  * Math.tan(fovRad);  // half-height at far plane

// Draw frustum lines
ctx.strokeStyle = '#0066cc';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(camX, camY);
ctx.lineTo(camX + far, camY - farH);
ctx.moveTo(camX, camY);
ctx.lineTo(camX + far, camY + farH);
// Near and far planes
ctx.moveTo(camX + near, camY - nearH); ctx.lineTo(camX + near, camY + nearH);
ctx.moveTo(camX + far,  camY - farH);  ctx.lineTo(camX + far,  camY + farH);
ctx.stroke();

// Labels
ctx.fillStyle = '#333'; ctx.font = '13px sans-serif';
ctx.fillText('Camera', camX - 10, camY + 25);
ctx.fillText('Near plane', camX + near - 20, camY + nearH + 20);
ctx.fillText('Far plane', camX + far - 20, camY + farH + 20);
ctx.fillText(`FOV = ${fovHalf*2}°`, camX + 20, camY - 20);
console.log(`Near half-height: ${nearH.toFixed(1)}, Far half-height: ${farH.toFixed(1)}`);
</script>
</body></html>
```
Trace: fovRad = 40*PI/180 = 0.698. nearH = 80 * tan(0.698) = 80 * 0.839 = 67.1px in diagram. farH = 350 * 0.839 = 293.6px. Objects inside the **frustum** are visible.

### Discard the throwaway
This isolated throwaway code is discarded and will not appear in the project again.

### Project Change
No reference counterpart — this is a from-scratch addition because it is a standalone theory lesson. No persistent project file this lesson.

### The New Code
```javascript
// No new project code for this theory unit.
```

### The Updated Project
```html
<!-- No project file created in this standalone lesson -->
```

### Mechanical walkthrough
- `const fovRad = (fovHalf * Math.PI) / 180;` converts the field of view angle to radians.
- `const nearH = near * Math.tan(fovRad);` calculates the height of the view cone at the near clipping plane using trigonometry.
- `const farH = far * Math.tan(fovRad);` calculates the height at the far clipping plane.
- The `ctx.moveTo` and `ctx.lineTo` commands draw the boundaries of the frustum shape.

### CS lens
The concept here is view frustum culling. This shows up in 3D graphics to avoid computing pixels for geometry that will never appear on the screen, saving massive amounts of computation.

### SE lens
Design principle: Early Exit / Optimization. By defining a mathematical volume (the frustum), the graphics engine can immediately discard (clip) entire models before sending them down the GPU pipeline. The alternative is sending the entire universe to the GPU, which would immediately crash performance.

### Commands needed
Open lesson-00.html in a modern browser (Chrome, Firefox, Edge).

### Run it
The browser shows a diagram of a camera and a frustum cone opening to the right, bound by a near plane and a far plane. The console logs "Near half-height: 67.1, Far half-height: 293.6".

### One sentence connecting to previous unit
Now that we know how a camera frames a view, we need to see what standardizing this process looks like in raw code versus a library.

## Concept Unit: What WebGL is and what Three.js adds

### The Problem
If the browser has a built-in GPU API called WebGL, why do we need Three.js? What happens if you try to draw a simple shape from scratch using only raw WebGL?

### Introduce the concept in isolation
```html
<!DOCTYPE html>
<html><body>
<canvas id="c" width="300" height="200"></canvas>
<script>
// RAW WebGL to draw one red triangle — this is what Three.js hides:
const gl = document.getElementById('c').getContext('webgl');
const vs = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vs, `attribute vec4 p; void main(){gl_Position=p;}`);
gl.compileShader(vs);
const fs = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fs, `void main(){gl_FragColor=vec4(1,0,0,1);}`);
gl.compileShader(fs);
const prog = gl.createProgram();
gl.attachShader(prog, vs); gl.attachShader(prog, fs);
gl.linkProgram(prog); gl.useProgram(prog);
const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5,-0.5,0, 0.5,-0.5,0, 0,0.5,0]), gl.STATIC_DRAW);
const loc = gl.getAttribLocation(prog, 'p');
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
gl.drawArrays(gl.TRIANGLES, 0, 3);  // One red triangle, ~25 lines of boilerplate
console.log('Raw WebGL: ~25 lines for ONE triangle. Three.js: ~5 lines.');
</script>
</body></html>
```
Trace: raw **WebGL** requires creating shaders, compiling them, creating a GPU program, creating a buffer, uploading vertex data, setting attribute pointers, then drawing. ~25 lines for 1 triangle. This proves how low-level WebGL is.

### Discard the throwaway
This isolated throwaway code is discarded and will not appear in the project again.

### Project Change
No reference counterpart — this is a from-scratch addition because it is a standalone theory lesson. No persistent project file this lesson.

### The New Code
```javascript
// No new project code for this theory unit.
```

### The Updated Project
```html
<!-- No project file created in this standalone lesson -->
```

### Mechanical walkthrough
- `const gl = document.getElementById('c').getContext('webgl');` gets the low-level graphics context.
- `gl.createShader(gl.VERTEX_SHADER);` allocates a new vertex shader.
- `gl.shaderSource(...)` assigns GLSL code to the shader.
- `gl.compileShader(vs);` compiles the shader code for the GPU.
- `gl.createBuffer()` and `gl.bindBuffer` allocate and bind memory for vertices.
- `gl.bufferData(...)` uploads the physical floating-point array of points.
- `gl.drawArrays(...)` triggers the actual pipeline execution.

### CS lens
The concept here is a low-level hardware abstraction layer. This shows up in Vulkan, Metal, and DirectX, where the developer must manually manage memory buffers, pointers, and compilation steps rather than just describing objects.

### SE lens
Design principle: Abstraction over Boilerplate. Three.js provides a scene graph where you define meshes and materials, and it handles the repetitive buffer management and shader compilation internally. The alternative is writing raw WebGL, which offers maximum control but requires immense boilerplate for every single object.

### Commands needed
Open lesson-00.html in a modern browser (Chrome, Firefox, Edge).

### Run it
The browser shows a canvas with a single red triangle. The console logs "Raw WebGL: ~25 lines for ONE triangle. Three.js: ~5 lines."

### One sentence connecting to previous unit
Now that we know how WebGL renders our pixels, we need to ensure they look sharp on modern screens.

## Concept Unit: The devicePixelRatio and canvas resolution

### The Problem
Why do 3D scenes often look blurry on a smartphone or a Macbook Retina screen? What happens if you only set the CSS width and height of a canvas?

### Introduce the concept in isolation
```html
<!DOCTYPE html>
<html><body>
<canvas id="c"></canvas>
<script>
const canvas = document.getElementById('c');
const dpr = window.devicePixelRatio || 1;

// CSS size vs. actual resolution:
const cssWidth  = 400;
const cssHeight = 300;

// Set CSS size (what the user SEES):
canvas.style.width  = cssWidth  + 'px';
canvas.style.height = cssHeight + 'px';

// Set actual pixel buffer (multiply by dpr for sharp rendering on HiDPI):
canvas.width  = cssWidth  * dpr;
canvas.height = cssHeight * dpr;

const ctx = canvas.getContext('2d');
ctx.scale(dpr, dpr);  // scale drawing context to match CSS size
ctx.font = '20px sans-serif';
ctx.fillStyle = '#222';
ctx.fillText(`devicePixelRatio = ${dpr}`, 20, 40);
ctx.fillText(`Canvas buffer: ${canvas.width} x ${canvas.height}px`, 20, 80);
ctx.fillText(`CSS display:   ${cssWidth} x ${cssHeight}px`, 20, 120);
console.log(`DPR=${dpr}, buffer=${canvas.width}x${canvas.height}`);
// On a Retina (2x) display: buffer=800x600, CSS=400x300 -> sharp text
// Three.js: renderer.setPixelRatio(window.devicePixelRatio) does this automatically
</script>
</body></html>
```
Trace dpr=2 (Retina): canvas.width=800, canvas.height=600. CSS shows 400x300 area. ctx.scale(2,2): all drawing commands scale up by 2. Result: crisp rendering on Retina. This proves that **devicePixelRatio** must be handled to avoid blurry canvases.

### Discard the throwaway
This isolated throwaway code is discarded and will not appear in the project again.

### Project Change
No reference counterpart — this is a from-scratch addition because it is a standalone theory lesson. No persistent project file this lesson.

### The New Code
```javascript
// No new project code for this theory unit.
```

### The Updated Project
```html
<!-- No project file created in this standalone lesson -->
```

### Mechanical walkthrough
- `const dpr = window.devicePixelRatio || 1;` safely gets the display scaling factor.
- `canvas.style.width = cssWidth + 'px';` scales the element using CSS logic pixels.
- `canvas.width = cssWidth * dpr;` scales the actual physical buffer of the canvas.
- `ctx.scale(dpr, dpr);` adjusts the rendering context so drawing coordinates still match logical pixels, but output at high resolution.

### CS lens
The concept here is resolution independence. This shows up in UI frameworks (Android DP, iOS Points) and vector graphics rendering, where logical measurements need to be translated into physical display matrices.

### SE lens
Design principle: Separation of Presentation and Data. CSS manages how the canvas element is sized on the page, while the canvas attributes manage the raw pixel density of the buffer. The alternative is tying them together, which on modern devices causes extreme pixelation when the OS stretches the low-resolution buffer.

### Commands needed
Open lesson-00.html in a modern browser (Chrome, Firefox, Edge).

### Run it
The browser shows a canvas with sharp text detailing the device pixel ratio, canvas buffer size, and CSS display size. The console logs these values.

### One sentence connecting to previous unit
We've now seen the full picture of the environment Three.js will run in.

## Closing

### Connect the pieces
When you define a 3D point like (x=1, y=0.5, z=-2) in our right-handed coordinate system, it exists in a mathematically infinite void. It is first checked against the camera's frustum (defined by FOV, near, and far planes); if it's within those bounds, it moves into the GPU pipeline. Raw WebGL takes over, passing it to a vertex shader which projects those 3D coordinates onto a 2D plane (accounting for the devicePixelRatio for sharpness). Rasterization determines which actual physical pixels cover the resulting shape, and finally, the fragment shader computes the exact color for those pixels to display on your screen. This pipeline happens dozens of times a second for millions of points, which is why we will leverage Three.js to manage all of it.
