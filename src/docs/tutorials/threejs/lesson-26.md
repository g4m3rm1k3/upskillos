# Lesson 26: Custom ShaderMaterial — Displacement, Fog, and Fresnel Effect

What you will build: We will build custom shaders in Three.js that modify geometry (displacement), compute angle-dependent lighting (Fresnel effect), and blend based on distance from the camera (fog). This solves the transferable problem of writing low-level GLSL code inside Three.js materials to achieve effects impossible with standard built-in materials, letting the GPU handle complex visual math in parallel.

What you need to know first: Lesson 25.

**Terms used in this lesson:**
- **Vertex shader** — a program that runs once per vertex, responsible for calculating the final clip-space position of a 3D point. It is needed because the GPU needs to know where each vertex sits on the screen.
- **Fragment shader** — a program that runs once per pixel (fragment), responsible for outputting the final color. It is needed because the GPU must determine the color of every pixel within a rendered shape.
- **Uniform** — a global variable passed from the CPU (JavaScript) to the GPU (GLSL) that remains constant for all vertices/fragments in a single draw call. It solves the problem of sending dynamic application state (like time or mouse position) into the shader.
- **Varying** — a variable used to pass data from the vertex shader to the fragment shader, interpolated across the surface of the geometry. It solves the problem of sharing vertex-specific data (like normals or UV coordinates) with the pixel-rendering stage.
- **Displacement map** — a technique to actually move geometry vertices rather than just faking lighting changes. It is used because moving vertices creates real silhouette changes and self-occlusion.
- **Fresnel effect** — the physical observation that surfaces become more reflective when viewed at grazing angles. It exists to simulate realistic materials like water or glass.
- **GLSL** — OpenGL Shading Language, the C-like language used to write shaders. It is needed because GPUs execute programs differently than CPUs.
- **Dot product** — a mathematical operation that takes two vectors and returns a scalar number related to the angle between them. It is heavily used in computer graphics to determine how much two directions align (e.g., surface normal vs camera direction).
- **Linear interpolation (mix)** — blending between two values based on a factor from 0.0 to 1.0. It is used to smoothly transition between states, like fading an object into fog.

**Objects and methods used:**

- **THREE.ShaderMaterial**
  - *What it is:* A Three.js material rendered with custom shaders.
  - *Implementation:* `new THREE.ShaderMaterial(parameters)`
  - *Its use:* Used to inject custom vertex and fragment GLSL code instead of using built-in materials.
  - *Type:* Class
  - *Responsibility:* Manages the compilation and linking of GLSL shaders and passing of uniforms.
  - *Depends on:* An object containing `vertexShader`, `fragmentShader`, and `uniforms`.
  - *Connects to:* Attached to a `Mesh` to define its visual appearance.
  - *Shape:* A material implementation bridging the Three.js rendering pipeline and raw WebGL.

- **THREE.Color**
  - *What it is:* A representation of a color.
  - *Implementation:* `new THREE.Color(hex)`
  - *Its use:* Used to pass precise color values as uniforms to the shader.
  - *Type:* Class
  - *Responsibility:* Stores and converts RGB color values into a format WebGL understands.
  - *Depends on:* A numeric hex value (e.g., `0xff4400`) or string.
  - *Connects to:* Converted into a `vec3` when sent to the GLSL shader.
  - *Shape:* A data structure representing visual color in Three.js.

- **THREE.SphereGeometry**
  - *What it is:* A class to generate a 3D sphere mesh.
  - *Implementation:* `new THREE.SphereGeometry(radius, widthSegments, heightSegments)`
  - *Its use:* Used to provide dense vertex data so our displacement shader has enough geometry to deform smoothly.
  - *Type:* Class
  - *Responsibility:* Calculates vertex positions, normals, and UVs for a sphere.
  - *Depends on:* Radius and segment counts.
  - *Connects to:* Combined with a material inside a `Mesh`.
  - *Shape:* A mathematical geometry generator.

- **THREE.Mesh**
  - *What it is:* A renderable 3D object.
  - *Implementation:* `new THREE.Mesh(geometry, material)`
  - *Its use:* Used to pair our geometry and shader material so they can be added to the scene.
  - *Type:* Class
  - *Responsibility:* Holds the geometry and material together.
  - *Depends on:* A valid geometry and material.
  - *Connects to:* Added to the Three.js `Scene`.
  - *Shape:* The primary spatial object representation.

## Concept Unit: Vertex displacement

### The Problem
How do we actually modify the geometry of a mesh at runtime on the GPU without recalculating vertex positions continuously on the CPU?

### Introduce the concept in isolation
We will write a raw math function to demonstrate a sine wave displacement, which represents what the GPU will do in parallel.
```javascript
function simulateVertexShader(x, y, time) {
    const frequency = 3.0;
    const amplitude = 0.3;
    const displacement = Math.sin(x * frequency + time) * Math.cos(y * frequency + time) * amplitude;
    return displacement;
}
console.log("Displacement at (0, 1) at time 0:", simulateVertexShader(0, 1, 0));
```
When run, the output is `0`. The sine of 0 is 0, so the displacement at the exact center is zero. This proves that vertex displacement can be modeled as a pure mathematical function of position and time.

### Discard the throwaway
This code is deleted. It will not appear in the project again.

### Project Change
- **Reference Source:** None — this is a from-scratch addition because we are exploring custom shaders.
- **Files affected:** `lesson-26.html`
- **Change type:** add
- **Location:** Inside the main script block.
- **Dependencies:** Three.js.

### The New Code
```javascript
const material = new THREE.ShaderMaterial({
    uniforms: {
        uTime:      { value: 0 },
        uAmplitude: { value: 0.3 },
        uFrequency: { value: 3.0 },
    },
    vertexShader: `
        uniform float uTime;
        uniform float uAmplitude;
        uniform float uFrequency;
        varying vec3 vNormal;
        varying float vDisplacement;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            float d = sin(position.x * uFrequency + uTime) *
                      cos(position.y * uFrequency + uTime) * uAmplitude;
            vDisplacement = d;
            vec3 newPos = position + normal * d;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
        }
    `,
    fragmentShader: `
        varying float vDisplacement;
        void main() {
            float c = vDisplacement * 2.0 + 0.5;
            gl_FragColor = vec4(c * 0.2, c * 0.5, c, 1.0);
        }
    `,
    side: THREE.DoubleSide,
});
const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), material);
```

### The Updated Project
```javascript
1: import * as THREE from 'three';
2: 
3: const material = new THREE.ShaderMaterial({ // ← new
4:     uniforms: { // ← new
5:         uTime:      { value: 0 }, // ← new
6:         uAmplitude: { value: 0.3 }, // ← new
7:         uFrequency: { value: 3.0 }, // ← new
8:     }, // ← new
9:     vertexShader: ` // ← new
10:         uniform float uTime; // ← new
11:         uniform float uAmplitude; // ← new
12:         uniform float uFrequency; // ← new
13:         varying vec3 vNormal; // ← new
14:         varying float vDisplacement; // ← new
15:         void main() { // ← new
16:             vNormal = normalize(normalMatrix * normal); // ← new
17:             float d = sin(position.x * uFrequency + uTime) * // ← new
18:                       cos(position.y * uFrequency + uTime) * uAmplitude; // ← new
19:             vDisplacement = d; // ← new
20:             vec3 newPos = position + normal * d; // ← new
21:             gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0); // ← new
22:         } // ← new
23:     `, // ← new
24:     fragmentShader: ` // ← new
25:         varying float vDisplacement; // ← new
26:         void main() { // ← new
27:             float c = vDisplacement * 2.0 + 0.5; // ← new
28:             gl_FragColor = vec4(c * 0.2, c * 0.5, c, 1.0); // ← new
29:         } // ← new
30:     `, // ← new
31:     side: THREE.DoubleSide, // ← new
32: }); // ← new
33: const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), material); // ← new
```
We create a custom material and apply it to a sphere, injecting logic that runs on the GPU.

### Mechanical walkthrough
- `new THREE.ShaderMaterial({...})`: Instantiates a material requiring custom GLSL.
- `uniforms`: Defines variables passed from JS to GLSL.
- `uTime`, `uAmplitude`, `uFrequency`: The specific uniform values we map.
- `vertexShader`: The raw GLSL code running per vertex.
- `uniform float uTime;`: Declares the incoming time variable in GLSL.
- `varying float vDisplacement;`: Declares a variable passed to the fragment shader.
- `vNormal = normalize(normalMatrix * normal);`: Calculates the normal vector.
- `float d = sin(...) * cos(...) * uAmplitude;`: Computes the displacement mathematically.
- `vec3 newPos = position + normal * d;`: Pushes the vertex outward along its normal.
- `gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);`: Computes final screen position.
- `fragmentShader`: The raw GLSL code running per pixel.
- `float c = vDisplacement * 2.0 + 0.5;`: Maps displacement value to color intensity.
- `gl_FragColor = vec4(c * 0.2, c * 0.5, c, 1.0);`: Sets final pixel color.
- `new THREE.SphereGeometry(1, 128, 64)`: Creates a sphere. High segment count (128x64) is needed because displacement only moves existing vertices; low segment count would show facets.

### CS lens
Parallel computing. The GPU runs the vertex shader on all 8192 vertices simultaneously. It does not iterate sequentially like a CPU loop.

### SE lens
Separation of concerns. The CPU defines the parameters (time, amplitude) but the GPU does the heavy lifting of calculating individual vertex positions, keeping the CPU free for game logic.

### Commands needed
Open lesson-26.html in a modern browser.

### Run it
The sphere bulges and contracts smoothly over time.

### One sentence connecting to previous unit
Now that we have moved vertices in space, we can also write shaders that calculate lighting effects based on the angle of the camera.

## Concept Unit: Fresnel effect

### The Problem
How do we make surfaces appear more reflective or glowing at grazing angles (like glass or shields) without relying on complex environment maps?

### Introduce the concept in isolation
We simulate the mathematical dot product computation to see how it isolates edges.
```javascript
function simulateFresnel(normalZ, viewZ) {
    // Both normalized vectors. A dot product of parallel vectors is 1.
    const dot = normalZ * viewZ; 
    const fresnel = Math.pow(1.0 - dot, 2.0);
    return fresnel;
}
console.log("Facing directly (dot=1):", simulateFresnel(1, 1));
console.log("Edge grazing (dot=0):", simulateFresnel(0, 1));
```
When run, facing directly yields `0`, and edge grazing yields `1`. This proves that subtracting the dot product from 1 isolates the edges perfectly for a glow effect.

### Discard the throwaway
This code is deleted. It will not appear in the project again.

### Project Change
- **Reference Source:** None.
- **Files affected:** `lesson-26.html`
- **Change type:** replace
- **Location:** Inside the main script block.
- **Dependencies:** Three.js.

### The New Code
```javascript
const material = new THREE.ShaderMaterial({
    uniforms: {
        uFresnelPower: { value: 2.0 },
        uEdgeColor:    { value: new THREE.Color(0x00ffff) },
        uBaseColor:    { value: new THREE.Color(0x000022) },
    },
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
            vNormal  = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vViewDir = normalize(cameraPosition - worldPos.xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uFresnelPower;
        uniform vec3 uEdgeColor;
        uniform vec3 uBaseColor;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
            float fresnel = pow(1.0 - dot(vNormal, vViewDir), uFresnelPower);
            vec3 color = mix(uBaseColor, uEdgeColor, fresnel);
            gl_FragColor = vec4(color, fresnel + 0.1);
        }
    `,
    transparent: true,
    depthWrite: false,
});
```

### The Updated Project
```javascript
1: import * as THREE from 'three';
2: 
3: const material = new THREE.ShaderMaterial({ // ← new
4:     uniforms: { // ← new
5:         uFresnelPower: { value: 2.0 }, // ← new
6:         uEdgeColor:    { value: new THREE.Color(0x00ffff) }, // ← new
7:         uBaseColor:    { value: new THREE.Color(0x000022) }, // ← new
8:     }, // ← new
9:     vertexShader: ` // ← new
10:         varying vec3 vNormal; // ← new
11:         varying vec3 vViewDir; // ← new
12:         void main() { // ← new
13:             vNormal  = normalize(normalMatrix * normal); // ← new
14:             vec4 worldPos = modelMatrix * vec4(position, 1.0); // ← new
15:             vViewDir = normalize(cameraPosition - worldPos.xyz); // ← new
16:             gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); // ← new
17:         } // ← new
18:     `, // ← new
19:     fragmentShader: ` // ← new
20:         uniform float uFresnelPower; // ← new
21:         uniform vec3 uEdgeColor; // ← new
22:         uniform vec3 uBaseColor; // ← new
23:         varying vec3 vNormal; // ← new
24:         varying vec3 vViewDir; // ← new
25:         void main() { // ← new
26:             float fresnel = pow(1.0 - dot(vNormal, vViewDir), uFresnelPower); // ← new
27:             vec3 color = mix(uBaseColor, uEdgeColor, fresnel); // ← new
28:             gl_FragColor = vec4(color, fresnel + 0.1); // ← new
29:         } // ← new
30:     `, // ← new
31:     transparent: true, // ← new
32:     depthWrite: false, // ← new
33: }); // ← new
```
We replace the material with one that calculates view direction relative to surface normals.

### Mechanical walkthrough
- `uFresnelPower`: A uniform defining the sharpness of the edge glow.
- `uEdgeColor`, `uBaseColor`: Uniforms defining the colors to blend between.
- `vViewDir`: A varying vector passed to the fragment shader.
- `vViewDir = normalize(cameraPosition - worldPos.xyz)`: Calculates direction from vertex to camera.
- `pow(1.0 - dot(vNormal, vViewDir), uFresnelPower)`: Calculates the Fresnel intensity.
- `mix(uBaseColor, uEdgeColor, fresnel)`: Linearly interpolates the color.
- `gl_FragColor = vec4(color, fresnel + 0.1)`: Sets output color and transparency.
- `transparent: true`: Enables alpha blending in Three.js.
- `depthWrite: false`: Prevents transparent objects from occluding each other weirdly.

### CS lens
Vector mathematics. The dot product of two normalized vectors yields the cosine of the angle between them. This allows us to determine surface orientation purely through hardware-accelerated math.

### SE lens
Configuration through uniforms. By defining base color and edge color as uniforms, the same GLSL code can be reused for different materials without recompiling the shader.

### Commands needed
Open lesson-26.html in a modern browser.

### Run it
The object is transparent in the center and opaque cyan at its edges, creating a classic sci-fi hologram effect.

### One sentence connecting to previous unit
Now that we have altered lighting based on angle, we can also alter it based on depth by implementing shader fog.

## Concept Unit: Shader fog

### The Problem
How do we make an object fade to a background color as it moves further from the camera?

### Introduce the concept in isolation
We will calculate linear interpolation for fog based on arbitrary depth.
```javascript
function simulateFog(depth, near, far) {
    const factor = Math.max(0.0, Math.min(1.0, (depth - near) / (far - near)));
    return factor;
}
console.log("At depth 10, near 5, far 20:", simulateFog(10, 5, 20));
```
When run, the output is `0.333`. This proves that depth distance maps cleanly to a 0.0 to 1.0 interpolation factor for blending.

### Discard the throwaway
This code is deleted. It will not appear in the project again.

### Project Change
- **Reference Source:** None.
- **Files affected:** `lesson-26.html`
- **Change type:** replace
- **Location:** Inside the main script block.
- **Dependencies:** Three.js.

### The New Code
```javascript
const material = new THREE.ShaderMaterial({
    uniforms: {
        uFogColor: { value: new THREE.Color(0x88aacc) },
        uFogNear:  { value: 5.0 },
        uFogFar:   { value: 20.0 },
        uColor:    { value: new THREE.Color(0xff4400) },
    },
    vertexShader: `
        varying float vDepth;
        void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vDepth = -mvPosition.z;
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform vec3 uFogColor;
        uniform float uFogNear;
        uniform float uFogFar;
        uniform vec3 uColor;
        varying float vDepth;
        void main() {
            float fogFactor = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
            vec3 finalColor = mix(uColor, uFogColor, fogFactor);
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,
});
```

### The Updated Project
```javascript
1: import * as THREE from 'three';
2: 
3: const material = new THREE.ShaderMaterial({ // ← new
4:     uniforms: { // ← new
5:         uFogColor: { value: new THREE.Color(0x88aacc) }, // ← new
6:         uFogNear:  { value: 5.0 }, // ← new
7:         uFogFar:   { value: 20.0 }, // ← new
8:         uColor:    { value: new THREE.Color(0xff4400) }, // ← new
9:     }, // ← new
10:     vertexShader: ` // ← new
11:         varying float vDepth; // ← new
12:         void main() { // ← new
13:             vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); // ← new
14:             vDepth = -mvPosition.z; // ← new
15:             gl_Position = projectionMatrix * mvPosition; // ← new
16:         } // ← new
17:     `, // ← new
18:     fragmentShader: ` // ← new
19:         uniform vec3 uFogColor; // ← new
20:         uniform float uFogNear; // ← new
21:         uniform float uFogFar; // ← new
22:         uniform vec3 uColor; // ← new
23:         varying float vDepth; // ← new
24:         void main() { // ← new
25:             float fogFactor = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0); // ← new
26:             vec3 finalColor = mix(uColor, uFogColor, fogFactor); // ← new
27:             gl_FragColor = vec4(finalColor, 1.0); // ← new
28:         } // ← new
29:     `, // ← new
30: }); // ← new
```
We inject depth calculation into the vertex shader and lerp to a fog color in the fragment shader.

### Mechanical walkthrough
- `uFogNear`, `uFogFar`: Uniforms dictating where fog starts and ends.
- `vDepth`: A varying to carry the vertex distance to the fragment shader.
- `mvPosition`: The position of the vertex relative to the camera (model-view space).
- `vDepth = -mvPosition.z`: In WebGL view space, looking forward goes down the negative Z axis, so negating it gives positive distance.
- `clamp(...)`: Restricts the fog calculation strictly between 0.0 and 1.0.
- `mix(uColor, uFogColor, fogFactor)`: Blends the object color toward the fog color based on the computed factor.

### CS lens
Coordinate spaces. `position` is local space. `modelViewMatrix * vec4(position, 1.0)` converts it to view space (camera-relative). Extracting the Z component here guarantees we measure distance accurately regardless of world position.

### SE lens
State encapsulation. By writing fog explicitly in the shader, the renderer does not need to traverse and manually blend transparency in JavaScript, preventing massive CPU bottlenecks.

### Commands needed
Open lesson-26.html in a modern browser.

### Run it
The object renders orange, but if positioned further back in the scene, it fades perfectly into the `0x88aacc` color.

### One sentence connecting to previous unit
Now that we have written custom fragment math, we need a way to reuse complex functions like noise without duplicating them.

## Concept Unit: GLSL includes and reusable shader chunks

### The Problem
How do we organize complex GLSL code so we aren't writing massive, unreadable template strings in JavaScript?

### Introduce the concept in isolation
We demonstrate string concatenation conceptually to inject logic.
```javascript
const helper = "function getFive() { return 5; }";
const mainLogic = helper + " console.log('Result:', getFive());";
eval(mainLogic);
```
When run, it prints 5. This proves that source code blocks can simply be appended together before execution.

### Discard the throwaway
This code is deleted. It will not appear in the project again.

### Project Change
- **Reference Source:** None.
- **Files affected:** `lesson-26.html`
- **Change type:** add
- **Location:** Inside the main script block.
- **Dependencies:** Three.js.

### The New Code
```javascript
const noiseFunc = `
    float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p) {
        vec2 i=floor(p); vec2 f=fract(p);
        vec2 u=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),
                   mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
    }
`;
const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: noiseFunc + `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
            float n = noise(vUv * 5.0 + uTime * 0.2);
            gl_FragColor = vec4(n, n*0.5, 0.0, 1.0);
        }
    `,
});
```

### The Updated Project
```javascript
1: import * as THREE from 'three';
2: 
3: const noiseFunc = ` // ← new
4:     float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); } // ← new
5:     float noise(vec2 p) { // ← new
6:         vec2 i=floor(p); vec2 f=fract(p); // ← new
7:         vec2 u=f*f*(3.0-2.0*f); // ← new
8:         return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), // ← new
9:                    mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); // ← new
10:     } // ← new
11: `; // ← new
12: const material = new THREE.ShaderMaterial({ // ← new
13:     uniforms: { uTime: { value: 0 } }, // ← new
14:     vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`, // ← new
15:     fragmentShader: noiseFunc + ` // ← new
16:         uniform float uTime; // ← new
17:         varying vec2 vUv; // ← new
18:         void main() { // ← new
19:             float n = noise(vUv * 5.0 + uTime * 0.2); // ← new
20:             gl_FragColor = vec4(n, n*0.5, 0.0, 1.0); // ← new
21:         } // ← new
22:     `, // ← new
23: }); // ← new
```
We define a raw GLSL noise algorithm as a string and concatenate it directly onto our `fragmentShader` source.

### Mechanical walkthrough
- `noiseFunc`: A multiline JavaScript string containing independent GLSL functions (`hash` and `noise`).
- `fragmentShader: noiseFunc + ...`: The critical concatenation. The GLSL compiler receives one massive string where `hash` and `noise` are defined strictly before `main()`.
- `varying vec2 vUv`: Passes texture coordinates from vertex to fragment.
- `float n = noise(...)`: Calls the injected noise function from inside `main()`.
- `gl_FragColor = vec4(n, n*0.5, 0.0, 1.0);`: Uses the noise output to drive colors.

### CS lens
Compilation targeting. GLSL is compiled at runtime by the WebGL driver in the browser. Because of this, textual concatenation in JS is identical to #include directives in native C++ compilation.

### SE lens
Modularity. This solves the problem of duplicating massive chunks of utility GLSL code (like lighting equations or noise) across many different `ShaderMaterial` instances.

### Commands needed
Open lesson-26.html in a modern browser.

### Run it
The surface of the mesh displays a procedurally generated fiery noise pattern that scrolls over time.

### One sentence connecting to previous unit
Now that we can build complex shader programs cleanly, we can combine effects like Fresnel with transparency and additive blending to create sophisticated final materials.

## Concept Unit: ShaderMaterial side, transparent, and blending

### The Problem
How do we make our custom materials interact with the environment, specifically handling transparency, inner faces, and light addition rather than replacement?

### Introduce the concept in isolation
We will demonstrate additive blending mathematically.
```javascript
function additiveBlend(backgroundLight, incomingLight) {
    return Math.min(1.0, backgroundLight + incomingLight);
}
console.log("Dark bg + incoming:", additiveBlend(0.1, 0.5));
console.log("Bright bg + incoming:", additiveBlend(0.8, 0.5));
```
When run, the bright background caps at `1.0`. Additive blending simply adds light together, preventing occlusion entirely and making everything behind it brighter.

### Discard the throwaway
This code is deleted. It will not appear in the project again.

### Project Change
- **Reference Source:** None.
- **Files affected:** `lesson-26.html`
- **Change type:** replace
- **Location:** Inside the main script block.
- **Dependencies:** Three.js.

### The New Code
```javascript
const hologramMat = new THREE.ShaderMaterial({
    uniforms: { uTime: {value:0}, uColor: {value: new THREE.Color(0x00ffff)} },
    vertexShader: `
        varying vec3 vNormal; varying vec3 vViewDir;
        void main(){
            vNormal=normalize(normalMatrix*normal);
            vViewDir=normalize(cameraPosition-(modelMatrix*vec4(position,1.0)).xyz);
            gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        }`,
    fragmentShader: `
        uniform float uTime; uniform vec3 uColor;
        varying vec3 vNormal; varying vec3 vViewDir;
        void main(){
            float fresnel=pow(1.0-dot(vNormal,vViewDir),2.0);
            float scanline=step(0.95,fract(gl_FragCoord.y/4.0+uTime));
            float alpha=fresnel*0.8+scanline*0.3;
            gl_FragColor=vec4(uColor,clamp(alpha,0.0,1.0));
        }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
});
```

### The Updated Project
```javascript
1: import * as THREE from 'three';
2: 
3: const hologramMat = new THREE.ShaderMaterial({ // ← new
4:     uniforms: { uTime: {value:0}, uColor: {value: new THREE.Color(0x00ffff)} }, // ← new
5:     vertexShader: ` // ← new
6:         varying vec3 vNormal; varying vec3 vViewDir; // ← new
7:         void main(){ // ← new
8:             vNormal=normalize(normalMatrix*normal); // ← new
9:             vViewDir=normalize(cameraPosition-(modelMatrix*vec4(position,1.0)).xyz); // ← new
10:             gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); // ← new
11:         }`, // ← new
12:     fragmentShader: ` // ← new
13:         uniform float uTime; uniform vec3 uColor; // ← new
14:         varying vec3 vNormal; varying vec3 vViewDir; // ← new
15:         void main(){ // ← new
16:             float fresnel=pow(1.0-dot(vNormal,vViewDir),2.0); // ← new
17:             float scanline=step(0.95,fract(gl_FragCoord.y/4.0+uTime)); // ← new
18:             float alpha=fresnel*0.8+scanline*0.3; // ← new
19:             gl_FragColor=vec4(uColor,clamp(alpha,0.0,1.0)); // ← new
20:         }`, // ← new
21:     transparent: true, // ← new
22:     depthWrite: false, // ← new
23:     side: THREE.DoubleSide, // ← new
24:     blending: THREE.AdditiveBlending, // ← new
25: }); // ← new
```
We combine all techniques and add Three.js material flags for additive blending and double-sided rendering.

### Mechanical walkthrough
- `gl_FragCoord.y`: A built-in GLSL variable giving the literal screen-space pixel coordinate (not the 3D world coordinate).
- `fract(gl_FragCoord.y/4.0+uTime)`: Creates a repeating mathematical pattern every 4 screen pixels, offset by time.
- `step(0.95, ...)`: Returns `1.0` if the value is greater than `0.95`, and `0.0` otherwise. This makes the scanline 1 pixel wide and 3 pixels empty.
- `transparent: true`: Tells Three.js to render this after opaque objects.
- `depthWrite: false`: Stops this object from writing to the depth buffer. This prevents transparent objects from blocking each other incorrectly.
- `side: THREE.DoubleSide`: Instructs the WebGL renderer not to cull back-faces, meaning we see the inside of the shape.
- `blending: THREE.AdditiveBlending`: Changes the draw mode so pixel colors are added instead of replacing what's behind them.

### CS lens
Rasterization. `gl_FragCoord` maps directly to the actual monitor pixels being rendered. Because it bypasses the 3D model matrix entirely, scanlines stay perfectly horizontal and perfectly spaced regardless of how the camera or object moves.

### SE lens
Rendering pipeline state. Setting `blending: THREE.AdditiveBlending` is not GLSL code; it flips a state switch on the WebGL context before the `drawArrays` call is made.

### Commands needed
Open lesson-26.html in a modern browser.

### Run it
The mesh appears as a glowing, transparent, double-sided sci-fi hologram with scrolling horizontal scanlines.

### One sentence connecting to previous unit
We have successfully combined custom math, lighting, and engine state to create a complete visual effect from raw math.

## Closing

### Connect the pieces
We have learned how raw mathematics drive the visuals on a screen. A sphere's vertices are displaced when we apply `sin*cos*0.3` to its normals in the vertex shader. A glowing edge is computed mathematically when the Fresnel effect analyzes `dot(normal,viewDir)`. Objects fade into the distance because fog is applied at depth by determining a `fogFactor` based on near and far planes. All of these run completely inside the GPU via GLSL, leaving our JavaScript and CPU completely free to orchestrate the broader application.
