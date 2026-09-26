# Lesson 39: Deployment and What’s Next — GitHub Pages, Bundlers, WebXR, and the Road Ahead

What you will build
In this lesson, you will transition a Three.js scene from a learning environment (CDN importmaps) to a production-ready environment using Vite. You will bundle the project, deploy it to GitHub Pages, and enable WebXR for Virtual Reality support. The core problem is that CDN importmaps are not optimized for production, lacking tree-shaking and bundling, and WebXR requires a specific rendering loop to synchronize with headset refresh rates.

What you need to know first
- Lesson 38

Terms used in this lesson
- **CDN importmap** — A way to resolve module imports directly in the browser without a build step. Exists to simplify learning and prototyping by avoiding tooling.
- **Tree-shaking** — The process of removing unused code from the final output bundle. Exists to minimize file size and improve loading performance.
- **Bundler** — A tool that combines multiple JavaScript files and assets into a single or few optimized files. Exists to reduce HTTP requests and optimize payload for production.
- **CORS (Cross-Origin Resource Sharing)** — A security feature in browsers that restricts web pages from making requests to a different domain. Exists to prevent malicious sites from reading sensitive data.
- **HMR (Hot Module Reload)** — A development server feature that replaces, adds, or removes modules while an application is running, without a full reload. Exists to speed up development iteration.
- **WebXR** — A Web API that provides access to virtual reality (VR) and augmented reality (AR) devices. Exists to allow immersive 3D experiences directly in the browser.

Objects and methods used
- **Vite**
  - *What it is:* A modern, fast build tool and development server.
  - *Implementation:* A command-line CLI tool invoked via `npm create vite`.
  - *Its use:* To bundle our Three.js code for production and provide HMR during development.
  - *Type:* Build tool / CLI.
  - *Responsibility:* Serves code locally with HMR and bundles it for production.
  - *Depends on:* Node.js and npm.
  - *Connects to:* Reads `index.html` and `main.js`, outputs optimized static files.
  - *Shape:* A build pipeline boundary between developer code and browser-ready assets.

- **VRButton.createButton**
  - *What it is:* A Three.js helper to inject a button that requests XR sessions.
  - *Implementation:* `static createButton(renderer: WebGLRenderer): HTMLElement`.
  - *Its use:* To give the user a way to initiate an immersive WebXR session.
  - *Type:* Static helper method.
  - *Responsibility:* Creates a DOM element that negotiates a WebXR session when clicked.
  - *Depends on:* `WebGLRenderer`.
  - *Connects to:* Appends to the DOM, communicates with the browser's WebXR API.
  - *Shape:* A UI and permission boundary for XR sessions.

- **renderer.xr.enabled**
  - *What it is:* A boolean flag on the WebGLRenderer.
  - *Implementation:* `renderer.xr.enabled = true`.
  - *Its use:* To tell Three.js to render the scene using the WebXR device API contexts.
  - *Type:* Boolean property.
  - *Responsibility:* Toggles WebXR rendering mode and multiview extensions.
  - *Depends on:* Browser WebXR support and an active session.
  - *Connects to:* WebXR runtime.
  - *Shape:* Configuration flag on the renderer.

- **renderer.setAnimationLoop**
  - *What it is:* A Three.js method that replaces the standard `requestAnimationFrame`.
  - *Implementation:* `setAnimationLoop(callback: Function | null): void`.
  - *Its use:* To drive the animation loop at the VR headset's native refresh rate.
  - *Type:* Instance method.
  - *Responsibility:* Executes the render function synchronized with the XR device frame timing.
  - *Depends on:* A callback function performing the rendering.
  - *Connects to:* `XRSession.requestAnimationFrame`.
  - *Shape:* The core timing loop boundary for XR rendering.

## Concept Unit: Why CDN importmaps are not enough for production

### The Problem
When learning Three.js, using a CDN importmap in a single HTML file is the easiest way to start. However, as projects grow, this approach creates bottlenecks. How do you serve a project to thousands of users without loading 600KB of unused Three.js features? What happens when a CDN blocks assets due to CORS policies?

### Introduce the concept in isolation
```javascript
// CDN importmap: great for learning (no build step)
// Problems in production:
// 1. No tree-shaking: entire three.module.js loaded (600KB+ gzipped)
// 2. No bundling: many separate HTTP requests per module
// 3. No cache busting: version pinned in HTML (hard to update)
// 4. CORS issues on some hosting platforms
// 5. No TypeScript, no hot module reload (HMR)

// Vite solution:
// npm create vite@latest my-scene -- --template vanilla
// cd my-scene && npm install three
// npm run dev     -> http://localhost:5173 (HMR)
// npm run build   -> dist/ (bundled, minified, tree-shaken)
// npm run preview -> serve dist/ locally

// Tree-shaking example:
// import * as THREE from 'three';  -> bundles 600KB
// import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three';  -> ~50KB
console.log('CDN: learning. Vite: production.');
console.log('npm create vite@latest my-scene -- --template vanilla');
```
This demonstrates the concept of **Bundlers** and **Tree-shaking**. By using Vite, we can trace the exact imports needed and discard the rest.

### Discard the throwaway
This conceptual overview code is discarded. We will use real Vite commands for the project.

### Project Change
- **Reference Source:** None
- **Files affected:** Terminal / Environment
- **Change type:** Configure
- **Location:** Project root
- **Dependencies:** Node.js

### The New Code
```javascript
// Run in your terminal:
// npm create vite@latest my-scene -- --template vanilla
// cd my-scene
// npm install three
```

### The Updated Project
```javascript
1: // Inside the new my-scene directory, you now have:
2: // package.json
3: // index.html
4: // main.js
5: // public/
```
The project is now a Node package managed by Vite, ready to handle dependencies locally rather than via CDNs.

### Mechanical walkthrough
- `npm create vite@latest` initializes a new Vite project.
- `--template vanilla` specifies that we want raw JavaScript/HTML, no frameworks like React or Vue.
- `npm install three` downloads the Three.js library into a local `node_modules` folder, eliminating the need for a CDN importmap.

### CS lens
Tree-shaking is an application of dead-code elimination. The bundler (Vite via Rollup) constructs an Abstract Syntax Tree (AST) of the imports and exports across all files. It traverses this graph starting from the entry point. Any exported function or class not reached during this traversal is dropped from the final emitted bundle.

### SE lens
Relying on CDNs for production introduces an external point of failure and removes control over caching strategies. Bundling assets locally shifts the dependency resolution to build-time rather than run-time, guaranteeing that what you tested is exactly what is served.

### Commands needed
Open lesson-39.html in a modern browser. For deployment: run npm run build or push to GitHub Pages.

### Run it
Running `npm run dev` starts a local server. The output confirms Vite is serving the project with HMR enabled.

### One sentence connecting to previous unit
Now that we have a build tool, we need to adapt our Three.js code to use local node modules instead of CDN links.

## Concept Unit: Vite project structure and Three.js setup

### The Problem
With Vite installed, how do we load Three.js into our scene? The old `<script type="importmap">` tag won't work with local modules in the same way, and we need an entry point that Vite knows how to bundle.

### Introduce the concept in isolation
```javascript
// main.js:
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
console.log('Vite resolves "three" from node_modules automatically.');
```
Vite intercepts bare imports (like `'three'`) and resolves them against the local `node_modules` directory automatically.

### Discard the throwaway
This snippet is discarded. We will build a complete scene.

### Project Change
- **Reference Source:** None
- **Files affected:** `main.js`, `index.html` (created by Vite)
- **Change type:** Replace
- **Location:** Root of `my-scene`
- **Dependencies:** Three.js

### The New Code
```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({color:0x44aaff}));
scene.add(cube);
const clock = new THREE.Clock();

function animate(){
    requestAnimationFrame(animate);
    cube.rotation.y += clock.getDelta();
    renderer.render(scene, camera);
}
animate();
console.log('Vite entry point: main.js with native ESM imports');
```

### The Updated Project
```javascript
1: // In index.html
2: <body>
3:   <script type="module" src="/main.js"></script> // ← new
4: </body>
```
The `index.html` file now points to `/main.js` as a module. There is no importmap. Vite sees this script tag and treats `main.js` as the entry point for bundling.

### Mechanical walkthrough
- `import * as THREE from 'three';` asks Vite to find the Three.js package.
- `import { OrbitControls } from 'three/addons/...';` resolves the specific addon path natively.
- `const scene = new THREE.Scene();` and the rest of the standard setup runs exactly as it did with a CDN.
- `renderer.render(scene, camera);` pushes the pixels to the screen.

### CS lens
Hot Module Replacement (HMR) works by keeping a WebSocket connection open between the browser and the Vite dev server. When you save `main.js`, Vite recompiles only the changed module, sends a patch over the socket, and the browser injects the new logic without reloading the page state.

### SE lens
Using bare imports (`'three'`) instead of URLs decouple your source code from its hosting location. The build tool handles the environment differences (dev vs. prod), allowing the same source to work locally via HMR and in production as static hashed files.

### Commands needed
Open lesson-39.html in a modern browser. For deployment: run npm run build or push to GitHub Pages.

### Run it
Running `npm run dev` and viewing `http://localhost:5173` renders a spinning blue cube.

### One sentence connecting to previous unit
With a bundled project working locally, the next step is making it public on the internet.

## Concept Unit: Deploying to GitHub Pages

### The Problem
You have a `dist/` folder full of bundled assets, but you need a free, reliable place to host them so others can see your work. How do you configure Vite and GitHub to serve your 3D app correctly?

### Introduce the concept in isolation
```javascript
// vite.config.js
import { defineConfig } from 'vite';
export default defineConfig({ 
    base: '/your-repo-name/' 
});
console.log('Configures Vite to use relative paths for GitHub Pages subdirectories.');
```
This is the **Vite configuration** base path. It ensures that when GitHub Pages serves the site at `github.io/repo-name/`, the asset links in the HTML point to `/repo-name/assets/` instead of the root `/assets/`.

### Discard the throwaway
This config snippet is discarded. We will apply the real command line deployment steps.

### Project Change
- **Reference Source:** None
- **Files affected:** `vite.config.js`, `package.json`
- **Change type:** Add
- **Location:** Project root
- **Dependencies:** `gh-pages` npm package

### The New Code
```javascript
// 1. Create vite.config.js
import { defineConfig } from 'vite';
export default defineConfig({ base: '/my-scene/' });

// 2. Add deploy script to package.json
// "scripts": {
//   "deploy": "gh-pages -d dist"
// }
```

### The Updated Project
```javascript
1: {
2:   "name": "my-scene",
3:   "scripts": {
4:     "dev": "vite",
5:     "build": "vite build",
6:     "deploy": "gh-pages -d dist" // ← new
7:   }
8: }
```
The project now has explicit instructions for building and pushing the bundled static files directly to the `gh-pages` branch.

### Mechanical walkthrough
- `defineConfig({ base: '/my-scene/' })` sets the URL prefix for all built assets.
- `npm run build` generates the `dist/` folder.
- `gh-pages -d dist` takes the contents of the `dist/` folder, creates an orphaned git branch named `gh-pages`, commits the files, and pushes them to GitHub.

### CS lens
Cache busting is critical for web deployment. When Vite builds your project, it outputs files like `index-A3b9x.js`. The hash `A3b9x` is generated from the file's contents. If you change a line of code and rebuild, the hash changes. This forces the browser to download the new file instead of using a stale cached version from the CDN.

### SE lens
Automating deployment via npm scripts ("npm run deploy") removes human error from the release process. Instead of manually dragging and dropping files, one command reliably builds and ships the artifact.

### Commands needed
Open lesson-39.html in a modern browser. For deployment: run npm run build or push to GitHub Pages.

### Run it
Running `npm run deploy` outputs "Published". Navigating to the GitHub Pages URL loads the Three.js scene perfectly.

### One sentence connecting to previous unit
Now that our scene is live on the web, we can add immersive device support so users can step inside it.

## Concept Unit: WebXR — Three.js in VR/AR headsets

### The Problem
A 3D scene on a flat screen is engaging, but immersive VR/AR headsets require a different rendering paradigm. The browser must negotiate with the headset, and the render loop must sync with the device's native refresh rate, overriding `requestAnimationFrame`.

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.xr.enabled = true;  
document.body.appendChild(VRButton.createButton(renderer));

renderer.setAnimationLoop(() => {
    // Render loop controlled by WebXR
});
console.log('WebXR: renderer.xr.enabled=true. setAnimationLoop() required.');
```
This isolates **WebXR** setup. `renderer.xr.enabled` activates the necessary WebGL extensions, and `VRButton` handles the complex browser permission flow to enter VR.

### Discard the throwaway
This snippet is discarded. We will integrate XR into our existing Vite project.

### Project Change
- **Reference Source:** None
- **Files affected:** `main.js`
- **Change type:** Add
- **Location:** Below renderer setup, modifying the animation loop.
- **Dependencies:** A WebXR-compatible browser.

### The New Code
```javascript
import { VRButton } from 'three/addons/webxr/VRButton.js';

// Enable XR on the existing renderer
renderer.xr.enabled = true;
document.body.appendChild(VRButton.createButton(renderer));

// Replace the old animate() with setAnimationLoop
renderer.setAnimationLoop((time, frame) => {
    cube.rotation.y += clock.getDelta();
    renderer.render(scene, camera);
});
```

### The Updated Project
```javascript
 1: const renderer = new THREE.WebGLRenderer({antialias:true});
 2: renderer.setSize(window.innerWidth, window.innerHeight);
 3: document.body.appendChild(renderer.domElement);
 4: 
 5: renderer.xr.enabled = true; // ← new
 6: document.body.appendChild(VRButton.createButton(renderer)); // ← new
 7: 
 8: const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({color:0x44aaff}));
 9: scene.add(cube);
10: const clock = new THREE.Clock();
11: 
12: renderer.setAnimationLoop((time, frame) => { // ← new
13:     cube.rotation.y += clock.getDelta();
14:     renderer.render(scene, camera);
15: });
```
The standard browser `requestAnimationFrame` has been completely replaced by Three.js's WebXR-aware animation loop. The VR button provides the UI entry point.

### Mechanical walkthrough
- `import { VRButton }` pulls the helper module from the Three.js addons.
- `renderer.xr.enabled = true` configures the WebGL context to support multiview and XR device reference spaces.
- `VRButton.createButton(renderer)` generates an HTML `<button>` that, when clicked, calls `navigator.xr.requestSession('immersive-vr')`.
- `renderer.setAnimationLoop(...)` registers the callback. When not in VR, it falls back to standard `requestAnimationFrame`. When in VR, the headset's runtime calls it at 72, 90, or 120Hz.

### CS lens
In a WebXR session, the position and rotation of the `PerspectiveCamera` are automatically overwritten by the headset's tracking matrix on every frame. Any manual changes to `camera.position` in your code are ignored while in VR. To move the player, you must move a parent group object that the camera is attached to, altering the reference space origin.

### SE lens
`VRButton` abstracts away a highly complex, asynchronous, and rapidly changing web standard (the WebXR Device API) into a single method call. This protects your application code from boilerplate and future API deprecations.

### Commands needed
Open lesson-39.html in a modern browser. For deployment: run npm run build or push to GitHub Pages.

### Run it
Clicking the "Enter VR" button on a supported headset transitions the browser into an immersive session. The spinning cube appears in 3D space, and moving your head moves the camera.

### One sentence connecting to previous unit
With a deployed, VR-capable application under your belt, you are ready to explore the wider Three.js ecosystem.

## Concept Unit: The road ahead — ecosystem, resources, and next projects

### The Problem
Three.js is massive, and no single tutorial series can cover every edge case, shader optimization, or physics engine. Where do you go from here to build professional-grade applications?

### Introduce the concept in isolation
```javascript
// Major Three.js ecosystem libraries:
const ecosystem = {
    '@react-three/fiber':  'React bindings for Three.js (declarative, hooks-based)',
    '@react-three/drei':   'Useful R3F helpers (OrbitControls, Loader, Env)',
    'three-mesh-bvh':      'BVH acceleration for raycasting and collision',
    'troika-three-text':   'High-quality SDF text rendering',
    'theatre.js':          'Professional animation timeline/sequencer',
    'rapier':              'Fast WASM physics engine',
    'postprocessing':      'Advanced post-FX (alternative to built-in)',
    'shader-park':         'Live GLSL shader coding environment',
};
console.log('Ecosystem libraries:', Object.keys(ecosystem).length);

// Next project ideas (increasing difficulty):
const projects = [
    'Procedural terrain with heightmap and LOD',
    'Multiplayer scene with WebSocket sync',
    'VR room with hand tracking (WebXR)',
    'Particle physics simulation (SPH fluid)',
    'Ray marching renderer (full GLSL)',
    'WebGPU via Three.js WebGPU renderer (r163+)',
];
projects.forEach((p,i) => console.log(`${i+1}. ${p}`));
```
This isolates the scope of the **Three.js Ecosystem**. Learning to integrate these external tools is the next step in mastering WebGL.

### Discard the throwaway
This roadmap snippet is discarded. It serves as a guide for your next steps.

### Project Change
- **Reference Source:** None
- **Files affected:** None
- **Change type:** None
- **Location:** None
- **Dependencies:** None

### The New Code
```javascript
// Key resources to bookmark:
// threejs.org/docs - API reference
// threejs.org/examples - 400+ live examples with source
// thebookofshaders.com - GLSL learning
// shadertoy.com - GLSL community
// r/threejs on Reddit

console.log('You have completed the Three.js: Zero to Mastery series.');
console.log('40 lessons. 200+ concepts. Keep building.');
```

### The Updated Project
```javascript
1: // Your project is complete.
2: // It is bundled with Vite, deployed to GitHub pages, and WebXR ready.
```
The capstone project stands on its own, utilizing best practices for web deployment.

### Mechanical walkthrough
- `@react-three/fiber` changes the paradigm from imperative (`scene.add()`) to declarative (`<mesh><boxGeometry/></mesh>`).
- `rapier` uses WebAssembly (WASM) to run complex physics calculations at near-native speeds, far outperforming JavaScript-based physics engines.
- The `WebGPU renderer` is the future of Three.js, offering compute shaders and vastly improved draw call performance compared to WebGL.

### CS lens
WebAssembly (WASM) allows languages like Rust or C++ to compile down to a binary format that the browser executes. Ecosystem tools like Rapier physics leverage WASM to handle collision detection math, bypassing the JavaScript garbage collector and JIT compiler overheads for intensive frame-by-frame calculations.

### SE lens
Adopting libraries like `three-mesh-bvh` or `troika-three-text` prevents you from reinventing the wheel. In software engineering, recognizing when a problem (like raycasting against a million polygons, or rendering crisp text) has already been solved by the community is a crucial skill for maintaining project velocity.

### Commands needed
Open lesson-39.html in a modern browser. For deployment: run npm run build or push to GitHub Pages.

### Run it
The roadmap and ecosystem notes provide clear directions for independent learning and project scaling.

### One sentence connecting to previous unit
You have built a complete foundation; the only limit now is what you choose to create next.

## Closing

### Connect the pieces
Trace the lifecycle of a professional Three.js project: it begins with rapid prototyping, perhaps using a simple CDN importmap as seen in our earliest lessons. As the codebase grows, it transitions to a robust build pipeline using Vite, ensuring unused code is stripped away via tree-shaking and assets are optimized into a neat bundle. That bundle is automatically deployed to scalable static hosting like GitHub Pages, making it accessible to the world. Finally, by integrating WebXR, the application breaks out of the flat screen, running high-performance rendered frames natively inside a VR headset. You now possess the complete toolchain to build, optimize, and ship immersive 3D experiences.
