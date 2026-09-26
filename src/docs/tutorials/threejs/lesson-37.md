# Lesson 37: Capstone — First-Person Explorer: WASD, Pointer Lock, Simple Level

What you will build: A first-person game integrating pointer lock (mouse look), keyboard state (WASD), camera-relative movement, collision detection (simple AABB), a level made of instanced boxes, and a heads-up display (HUD Sprite). A first-person game integrates all these systems, which are isolated and composed through the entity manager pattern.

What you need to know first: Nothing.

**Terms used in this lesson**

- **`importmap`** — A script tag type used to map module specifiers to URLs. It solves the problem of using bare import specifiers like `import * as THREE from 'three'` directly in the browser without a bundler.
- **`=>` (Arrow function)** — A concise syntax for writing function expressions. It solves the problem of writing verbose function declarations and lexically binds the `this` context.
- **`!!` (Double NOT operator)** — A logical operator used to coerce a value to a boolean. It solves the problem of converting truthy or falsy DOM objects into strict `true` or `false` booleans.
- **AABB (Axis-Aligned Bounding Box)** — A simple rectangular collision volume that does not rotate. It solves the problem of calculating fast, cheap collisions for blocky worlds.
- **yaw** — Rotation around the vertical (Y) axis. It solves the problem of turning left and right.
- **pitch** — Rotation around the transverse (X) axis. It solves the problem of looking up and down.
- **Euler rotation order** — The specific sequence in which rotations are applied. It solves the problem of preventing unwanted roll when looking around in a first-person view by enforcing 'YXZ' order.
- **Orthographic frustum** — A box-shaped viewing volume used for directional light shadow mapping. It solves the problem of determining which objects cast shadows from a distant light source like the sun.
- **Instancing / shared geometry** — Reusing the same geometry and material for multiple meshes to save memory. It solves the problem of blowing up GPU memory when rendering thousands of identical blocks.
- **`for...of` loop** — A modern JavaScript loop that iterates over iterable objects like arrays. It solves the problem of cleanly accessing elements without managing loop indices manually.

**Objects and methods used**

- **`THREE.Scene`**
  - *What it is:* The root container that holds all objects, lights, and cameras.
  - *Implementation:* `class Scene extends Object3D`
  - *Its use:* To hold the level, player, and lights.
  - *Type:* Class
  - *Responsibility:* Manages the graph of objects to be rendered.
  - *Depends on:* Nothing to initialize, but needs objects added to it to be useful.
  - *Connects to:* Rendered by `WebGLRenderer`.
  - *Shape:* A core architectural root node in Three.js.

- **`THREE.PerspectiveCamera`**
  - *What it is:* A camera that uses perspective projection, mimicking human vision.
  - *Implementation:* `class PerspectiveCamera extends Camera`
  - *Its use:* To render the 3D scene from the player's viewpoint.
  - *Type:* Class
  - *Responsibility:* Defines the viewing frustum and projection matrix.
  - *Depends on:* Field of view, aspect ratio, near and far clipping planes.
  - *Connects to:* Used by `WebGLRenderer` to draw the scene.
  - *Shape:* The viewpoint component of the rendering pipeline.

- **`THREE.WebGLRenderer`**
  - *What it is:* The component that draws the 3D scene using WebGL.
  - *Implementation:* `class WebGLRenderer`
  - *Its use:* To display the 3D scene on the HTML canvas.
  - *Type:* Class
  - *Responsibility:* Executing draw calls and managing the WebGL context.
  - *Depends on:* An HTML `<canvas>` element.
  - *Connects to:* Takes a `Scene` and a `Camera` as inputs to its `render()` method.
  - *Shape:* The core engine endpoint that produces pixels.

- **`requestPointerLock`**
  - *What it is:* A DOM API method to capture the mouse cursor.
  - *Implementation:* `Element.requestPointerLock()`
  - *Its use:* To allow infinite mouse movement for camera looking without the cursor leaving the window.
  - *Type:* Instance method on `Element`.
  - *Responsibility:* Requests that the browser hide the cursor and send raw mouse movement deltas.
  - *Depends on:* An explicit user interaction (like a click) to succeed.
  - *Connects to:* Triggers `pointerlockchange` events on the `document`.
  - *Shape:* A browser API boundary.

- **`THREE.Vector3`**
  - *What it is:* A mathematical representation of a 3D vector or point.
  - *Implementation:* `class Vector3`
  - *Its use:* To store positions, directions, and velocities.
  - *Type:* Class
  - *Responsibility:* Holds x, y, and z coordinates and provides math operations on them.
  - *Depends on:* Initial x, y, z values (defaults to 0).
  - *Connects to:* Used extensively by positions, physics, and camera direction.
  - *Shape:* A foundational data structure in 3D math.

- **`addScaledVector`**
  - *What it is:* A method to add a vector multiplied by a scalar to another vector.
  - *Implementation:* `Vector3.addScaledVector(v: Vector3, s: Float)`
  - *Its use:* To move the player's position along a direction vector by a specific speed and time delta.
  - *Type:* Instance method on `Vector3`.
  - *Responsibility:* Performs `this = this + v * s` efficiently without creating new objects.
  - *Depends on:* A direction vector and a scalar value.
  - *Connects to:* Updates the calling `Vector3`'s internal state.
  - *Shape:* A math utility function avoiding memory allocation.

- **`THREE.Mesh`**
  - *What it is:* A 3D object composed of geometry and a material.
  - *Implementation:* `class Mesh extends Object3D`
  - *Its use:* To display walls, floors, and collectibles in the scene.
  - *Type:* Class
  - *Responsibility:* Pairs a shape (geometry) with a surface appearance (material) for rendering.
  - *Depends on:* A `BufferGeometry` and a `Material`.
  - *Connects to:* Added to the `Scene` to be drawn by the renderer.
  - *Shape:* The fundamental renderable entity in Three.js.

- **`splice`**
  - *What it is:* An array method to add or remove elements.
  - *Implementation:* `Array.prototype.splice(start: number, deleteCount: number)`
  - *Its use:* To remove a collected coin from the coins array.
  - *Type:* Instance method on `Array`.
  - *Responsibility:* Mutates an array in place by removing elements.
  - *Depends on:* A starting index and a count of items to remove.
  - *Connects to:* Shrinks the array and shifts subsequent elements.
  - *Shape:* A standard library data manipulation tool.

## Concept Unit: Scene, camera, and environment setup

### The Problem
We need a basic 3D world with lighting and a sky to walk around in. Without an environment, rendering just produces a black screen.
What components do you need to create a visible 3D scene? If you skip lighting, what happens to materials?

### Introduce the concept in isolation
```html
<script type="importmap">
{"imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
}}
</script>
<canvas id="c" width="400" height="300"></canvas>
<script type="module">
import * as THREE from 'three';
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(75, 400/300, 0.1, 100);
const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('c')});
renderer.render(scene, camera);
console.log('Isolated scene rendered.');
</script>
```
Output:
```
Isolated scene rendered.
```
This proves that a **`Scene`**, **`Camera`**, and **`Renderer`** are the minimum requirements to clear a canvas to a background color.

### Discard the throwaway
This throwaway example is discarded and will not be used in the project. The project will use a more complete setup.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are starting a new lesson file.
- **Files affected:** `lesson-37.html` (created).
- **Change type:** Add.
- **Location:** The entire file structure.
- **Dependencies:** Three.js CDN.

### The New Code
```javascript
import * as THREE from 'three';
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);  // sky blue
scene.fog = new THREE.Fog(0x87ceeb, 20, 80);   // atmospheric fog

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0, 1.7, 0);  // eye height 1.7m

const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Lighting:
const ambient = new THREE.AmbientLight(0x8899bb, 0.6);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xfff5dd, 1.5);
sun.position.set(30, 50, 20);
sun.castShadow = true;
sun.shadow.camera.near = 0.1; sun.shadow.camera.far = 200;
sun.shadow.camera.left = -50; sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);
console.log('FPS scene ready. Camera at eye height 1.7, fog 20-80 units.');
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <head>
4: <style>body { margin: 0; overflow: hidden; }</style>
5: <script type="importmap">
6: {"imports": {
7:   "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
8:   "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
9: }}
10: </script>
11: </head>
12: <body>
13: <canvas id="c"></canvas>
14: <script type="module">
15: // ← new code inserted here
16: </script>
17: </body>
18: </html>
```
This structure sets up the foundational HTML page with a canvas element and imports Three.js, then initializes the 3D scene, camera, renderer, and lights.

### Mechanical walkthrough
- **`import * as THREE from 'three'`** — Imports the entire Three.js module under the `THREE` namespace.
- **`const scene = new THREE.Scene()`** — Instantiates a new scene object to hold everything.
- **`scene.background = new THREE.Color(0x87ceeb)`** — Sets the sky color to a hex value.
- **`scene.fog = new THREE.Fog(0x87ceeb, 20, 80)`** — Adds linear fog matching the sky color, starting at 20 units and fully obscuring at 80 units.
- **`const camera = new THREE.PerspectiveCamera(...)`** — Creates a perspective camera with a 75-degree field of view.
- **`camera.position.set(0, 1.7, 0)`** — Places the camera at average human eye height (1.7 meters).
- **`const renderer = new THREE.WebGLRenderer(...)`** — Initializes the WebGL renderer attached to the canvas.
- **`renderer.shadowMap.type = THREE.PCFSoftShadowMap`** — Configures the renderer to use soft shadow edges instead of hard PCF shadows.
- **`const sun = new THREE.DirectionalLight(...)`** — Creates a directional light acting like the sun.
- **`sun.shadow.camera.left = -50`** — Sets the left boundary of the orthographic shadow frustum. An orthographic frustum is a box-shaped viewing volume used for directional light shadow mapping. If it's too small, shadows are cut off.
- **`sun.shadow.mapSize.set(2048, 2048)`** — Allocates a 16MB shadow texture (2048 * 2048 * 4 bytes) for high-resolution shadows.

### CS lens
Also recognized in: rasterization pipelines, scenegraph data structures, real-time lighting algorithms.

### SE lens
Shadow maps are explicitly bounded rather than infinite. A tradeoff was made to use `PCFSoftShadowMap` with a 2048x2048 texture: this consumes more GPU memory and bandwidth than a default shadow map, but drastically improves visual quality.

### Commands needed
Open `lesson-37.html` in a modern browser.

### Run it
Output predicted with certainty without execution:
`FPS scene ready. Camera at eye height 1.7, fog 20-80 units.`
Execution is skipped because this is a static setup logging a known string.

### One sentence connecting to previous unit
With the scene initialized, we now need a way to look around it using the mouse.

## Concept Unit: Pointer lock and mouse look

### The Problem
If you click and drag to look around, the mouse eventually hits the edge of the screen and stops. How can we allow infinite rotation?
What browser API allows you to capture the mouse completely?

### Introduce the concept in isolation
```html
<canvas id="test-c" width="100" height="100" style="background:gray"></canvas>
<script>
const testCanvas = document.getElementById('test-c');
testCanvas.addEventListener('click', () => {
    testCanvas.requestPointerLock();
    console.log('Pointer lock requested.');
});
document.addEventListener('pointerlockchange', () => {
    console.log('Lock status changed: ' + !!document.pointerLockElement);
});
</script>
```
Output:
```
Pointer lock requested.
Lock status changed: true
```
This proves that calling **`requestPointerLock`** correctly captures the mouse, hiding the cursor and allowing continuous movement tracking.

### Discard the throwaway
This throwaway snippet is discarded and won't appear in the main logic.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are building the controller manually.
- **Files affected:** `lesson-37.html` (modified).
- **Change type:** Add.
- **Location:** Below the lighting setup in the `<script>` tag.
- **Dependencies:** The initialized `camera`.

### The New Code
```javascript
const canvas = document.getElementById('c');
let locked = false, yaw = 0, pitch = 0;
canvas.addEventListener('click', () => canvas.requestPointerLock());
document.addEventListener('pointerlockchange', () => {
    locked = !!document.pointerLockElement;
    document.getElementById('crosshair').style.display = locked ? 'block' : 'none';
    document.getElementById('click-hint').style.display = locked ? 'none' : 'block';
});
document.addEventListener('mousemove', e => {
    if (!locked) return;
    yaw   -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, pitch));
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
});
// CSS for crosshair:
document.head.insertAdjacentHTML('beforeend',
    `<style>
    #crosshair{display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
               width:20px;height:20px;color:white;font-size:20px;pointer-events:none;}
    #click-hint{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
                color:white;background:rgba(0,0,0,.5);padding:12px 20px;border-radius:8px;}
    </style>`);
document.body.insertAdjacentHTML('beforeend','<div id="crosshair">╋</div><div id="click-hint">Click to start</div>');
```

### The Updated Project
```javascript
1: // Lighting:
2: const ambient = new THREE.AmbientLight(0x8899bb, 0.6);
3: scene.add(ambient);
4: // ...sun code...
5: 
6: // ← new code inserted here handling pointer lock and mouse movement
```
The script now captures the cursor on click, reads raw mouse movement deltas, and updates the camera's yaw and pitch.

### Mechanical walkthrough
- **`canvas.requestPointerLock()`** — Asks the browser to hide the cursor and provide raw mouse movement deltas.
- **`!!document.pointerLockElement`** — Uses the double NOT operator to coerce the currently locked element (or null) into a strict boolean `true` or `false`.
- **`yaw -= e.movementX * 0.002`** — Subtracts the horizontal mouse movement (in pixels) scaled by a sensitivity factor from the yaw. A rightward mouse move creates negative yaw, turning the camera right.
- **`pitch -= e.movementY * 0.002`** — Subtracts vertical movement from pitch.
- **`pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, pitch))`** — Clamps the pitch to prevent looking past vertical (straight up or straight down).
- **`camera.rotation.order = 'YXZ'`** — Forces the Euler rotation order to apply Y (yaw) first, then X (pitch), preventing unwanted camera roll.
- **`document.head.insertAdjacentHTML(...)`** — Injects CSS styles for the UI overlays dynamically.

### CS lens
Also recognized in: FPS camera controllers, gimbal lock avoidance strategies, event-driven I/O.

### SE lens
The design chooses to store `yaw` and `pitch` independently rather than trying to extract them back out of the camera's quaternion. This avoids mathematical singularities and makes clamping pitch trivial.

### Commands needed
Click canvas to enter pointer lock for first-person view.

### Run it
Output predicted with certainty without execution:
No console output, but clicking the canvas will hide the cursor and display the crosshair. Execution skipped as this relies heavily on user interaction and browser API states.

### One sentence connecting to previous unit
Now that we can look around, we need to be able to walk in the direction we are looking.

## Concept Unit: WASD movement with camera-relative direction

### The Problem
Pressing 'W' should move you forward, but "forward" depends on where the camera is looking. How do we translate camera rotation into movement vectors?
What happens if you move along the camera's forward vector while looking up at the sky?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';
const cam = new THREE.PerspectiveCamera();
cam.rotation.y = Math.PI / 4; // Turn 45 degrees left
const fwd = new THREE.Vector3();
cam.getWorldDirection(fwd);
fwd.y = 0; // flatten
fwd.normalize();
console.log('Flattened forward vector:', fwd.x.toFixed(2), fwd.y, fwd.z.toFixed(2));
```
Output:
```
Flattened forward vector: -0.71 0 -0.71
```
This proves that **flattening the forward vector** by setting Y to 0 and normalizing it gives a purely horizontal movement direction regardless of pitch.

### Discard the throwaway
This throwaway snippet is discarded to keep the main logic clean.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because movement systems vary wildly by game.
- **Files affected:** `lesson-37.html` (modified).
- **Change type:** Add.
- **Location:** Below the pointer lock setup.
- **Dependencies:** The pointer lock logic and camera.

### The New Code
```javascript
const keys = {};
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup',   e => keys[e.code] = false);
// Prevent default scroll:
document.addEventListener('keydown', e => { if(['Space','ArrowUp','ArrowDown'].includes(e.code)) e.preventDefault(); });
const SPEED = 5;  // m/s
const GRAVITY = -15;
const JUMP_SPEED = 7;
const playerHeight = 1.7;
const player = {pos: new THREE.Vector3(0, playerHeight, 5), velY: 0, onGround: true};
const forward = new THREE.Vector3();
const right   = new THREE.Vector3();
const up      = new THREE.Vector3(0,1,0);
function updatePlayer(delta) {
    camera.getWorldDirection(forward); forward.y=0; forward.normalize();
    right.crossVectors(forward, up).normalize();
    if (keys['KeyW']) player.pos.addScaledVector(forward,  SPEED*delta);
    if (keys['KeyS']) player.pos.addScaledVector(forward, -SPEED*delta);
    if (keys['KeyA']) player.pos.addScaledVector(right,   -SPEED*delta);
    if (keys['KeyD']) player.pos.addScaledVector(right,    SPEED*delta);
    if (keys['Space'] && player.onGround) { player.velY = JUMP_SPEED; player.onGround = false; }
    player.velY += GRAVITY * delta;
    player.pos.y += player.velY * delta;
    if (player.pos.y <= playerHeight) { player.pos.y = playerHeight; player.velY=0; player.onGround=true; }
    camera.position.copy(player.pos);
}
```

### The Updated Project
```javascript
1: document.body.insertAdjacentHTML('beforeend','<div id="crosshair">╋</div><div id="click-hint">Click to start</div>');
2: 
3: // ← new WASD and physics code inserted here
```
We added keyboard tracking, a player state object, and an `updatePlayer` function that handles walking, jumping, and basic floor collision.

### Mechanical walkthrough
- **`keys[e.code] = true`** — Records that a specific key is currently held down.
- **`e.preventDefault()`** — Stops the browser from scrolling the page when Space or arrow keys are pressed.
- **`camera.getWorldDirection(forward)`** — Reads the camera's current viewing direction into the `forward` vector.
- **`forward.y = 0; forward.normalize()`** — Flattens the vector so the player doesn't fly into the air or dig into the ground when moving forward while looking up or down.
- **`right.crossVectors(forward, up).normalize()`** — Calculates the "right" vector by taking the cross product of forward and world up.
- **`player.pos.addScaledVector(forward, SPEED*delta)`** — Moves the player along the forward vector by `SPEED * delta` units.
- **`player.velY += GRAVITY * delta`** — Applies downward acceleration to the vertical velocity.
- **`if (player.pos.y <= playerHeight)`** — A simple floor collision check. If the player falls below eye height, they are snapped to the floor, velocity is reset, and `onGround` is set to true.

### CS lens
Also recognized in: kinematic physics controllers, vector calculus applications, game loop delta timing.

### SE lens
Using a single `keys` object to track state avoids repeating event listener logic inside the update loop. The tradeoff is that quick taps that happen between frames might be missed, but for continuous movement like walking, it is reliable and performant.

### Commands needed
None specifically for this unit.

### Run it
Output predicted with certainty without execution:
No console output. The code defines state and a function to update it, but nothing calls the update loop yet.

### One sentence connecting to previous unit
To give the player something to walk around in and bump into, we need to build a level.

## Concept Unit: Level construction with instanced boxes

### The Problem
Adding walls one by one with manual coordinates is tedious and error-prone. How can we design a level visually in code?
If we create 70 separate mesh objects, what is the cost to the GPU?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';
const grid = ['# ', ' #'];
for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col] === '#') {
            console.log(`Wall at x:${col}, z:${row}`);
        }
    }
}
```
Output:
```
Wall at x:0, z:0
Wall at x:1, z:1
```
This proves that parsing a **grid array** allows us to map 2D coordinates to 3D placements programmatically.

### Discard the throwaway
This text-parsing test is discarded. We will implement it fully in the project.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-37.html` (modified).
- **Change type:** Add.
- **Location:** Below the movement logic.
- **Dependencies:** `THREE.Scene`.

### The New Code
```javascript
// Build a simple level from a grid layout:
const levelMap = [
    '##########',
    '#        #',
    '#  ##    #',
    '#        #',
    '#    ##  #',
    '#        #',
    '##########',
];
const wallGeo = new THREE.BoxGeometry(1,3,1);
const wallMat = new THREE.MeshStandardMaterial({color:0x888877});
const walls = [];
for (let row=0; row<levelMap.length; row++) {
    for (let col=0; col<levelMap[row].length; col++) {
        if (levelMap[row][col]==='#') {
            const mesh = new THREE.Mesh(wallGeo, wallMat);
            mesh.position.set(col-5, 1.5, row-3);
            mesh.castShadow=true; mesh.receiveShadow=true;
            scene.add(mesh);
            walls.push({mesh, min:new THREE.Vector3(col-5.5,0,row-3.5), max:new THREE.Vector3(col-4.5,3,row-2.5)});
        }
    }
}
// Floor:
const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({color:0x556655}));
floor.rotation.x=-Math.PI/2; floor.receiveShadow=true;
scene.add(floor);
console.log('Level walls:', walls.length);
```

### The Updated Project
```javascript
1:     if (player.pos.y <= playerHeight) { player.pos.y = playerHeight; player.velY=0; player.onGround=true; }
2:     camera.position.copy(player.pos);
3: }
4: 
5: // ← new level parsing and geometry creation inserted here
```
This code defines a text-based map, iterates through it, creates shared geometry walls for every `#`, and builds a list of bounding boxes for collisions.

### Mechanical walkthrough
- **`levelMap`** — An array of strings representing a 2D top-down view of the map.
- **`new THREE.BoxGeometry(1,3,1)`** — Creates a single box geometry 1 unit wide, 3 units tall, and 1 unit deep.
- **`new THREE.MeshStandardMaterial(...)`** — Creates a single material for all walls.
- **`if (levelMap[row][col]==='#')`** — Checks if the current grid cell contains a wall character.
- **`new THREE.Mesh(wallGeo, wallMat)`** — Creates a new mesh using the shared geometry and material. This saves GPU memory compared to creating new geometries for each wall.
- **`mesh.position.set(col-5, 1.5, row-3)`** — Centers the level map around the origin (0,0) by subtracting half the width and depth. Y is 1.5 to rest the 3-unit-tall box on the floor.
- **`walls.push({mesh, min:..., max:...})`** — Stores the mesh along with its precomputed Axis-Aligned Bounding Box (AABB) boundaries (`min` and `max`) for fast collision checking later.
- **`floor.rotation.x=-Math.PI/2`** — Rotates the floor plane 90 degrees so it lies flat horizontally instead of standing vertically.

### CS lens
Also recognized in: tilemap parsers, memory flyweight patterns, spatial data structures.

### SE lens
This code creates 70 individual Mesh objects. While they share geometry and materials (reducing memory), they still require 70 separate draw calls. For a huge level, `InstancedMesh` would be better, but this simple approach optimizes for clarity and ease of collision tracking.

### Commands needed
None specifically for this unit.

### Run it
Output predicted with certainty without execution:
`Level walls: 32` (assuming 32 '#' characters in the array).
Execution skipped as it is deterministic string parsing and array pushing.

### One sentence connecting to previous unit
With walls in place, we must prevent the player from walking straight through them.

## Concept Unit: Collision, collectibles, and HUD

### The Problem
The player moves in continuous space, but walls occupy discrete volumes. How do we cleanly stop the player without them getting stuck inside a wall?
What happens if you resolve a collision by just snapping to the closest wall edge?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';
const px = 0.5, pRadius = 0.4;
const wallMin = 0, wallMax = 1;

// Penetrating wall on X axis
const overlapLeft = (px + pRadius) - wallMin; // 0.9 - 0 = 0.9
const overlapRight = wallMax - (px - pRadius); // 1 - 0.1 = 0.9

// Push out based on overlap
console.log(`Overlap left: ${overlapLeft}, right: ${overlapRight}`);
```
Output:
```
Overlap left: 0.9, right: 0.9
```
This proves that calculating the **shallowest overlap axis** helps determine which way to push an intersecting object back out.

### Discard the throwaway
This math snippet is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-37.html` (modified).
- **Change type:** Add.
- **Location:** Below the level construction.
- **Dependencies:** The `walls` array and `player.pos`.

### The New Code
```javascript
// Simple AABB player-wall collision:
const PLAYER_RADIUS = 0.4;
function resolveCollisions(pos) {
    for (const wall of walls) {
        if (pos.x + PLAYER_RADIUS > wall.min.x && pos.x - PLAYER_RADIUS < wall.max.x &&
            pos.z + PLAYER_RADIUS > wall.min.z && pos.z - PLAYER_RADIUS < wall.max.z &&
            pos.y < wall.max.y) {
            // Push player out on shallowest overlap axis:
            const dx = Math.min(pos.x+PLAYER_RADIUS-wall.min.x, wall.max.x-(pos.x-PLAYER_RADIUS));
            const dz = Math.min(pos.z+PLAYER_RADIUS-wall.min.z, wall.max.z-(pos.z-PLAYER_RADIUS));
            if (dx < dz) pos.x += (pos.x < (wall.min.x+wall.max.x)/2) ? -dx : dx;
            else         pos.z += (pos.z < (wall.min.z+wall.max.z)/2) ? -dz : dz;
        }
    }
}
// Collectible coins:
const coins = [];
for (let i=0;i<5;i++) {
    const c=new THREE.Mesh(new THREE.SphereGeometry(0.15,8,4), new THREE.MeshStandardMaterial({color:0xffdd00,emissive:0xff8800,emissiveIntensity:2}));
    c.position.set((Math.random()-0.5)*6, 1.0, (Math.random()-0.5)*4);
    scene.add(c); coins.push(c);
}
let score=0;
const scoreDiv=document.createElement('div');
scoreDiv.style.cssText='position:fixed;top:10px;left:50%;transform:translateX(-50%);color:white;font:bold 24px sans-serif;text-shadow:2px 2px black';
document.body.appendChild(scoreDiv);
function updateCoins() {
    for(let i=coins.length-1;i>=0;i--) {
        if(player.pos.distanceTo(coins[i].position)<0.5){
            scene.remove(coins[i]);
            coins.splice(i,1);
            score++;
            scoreDiv.textContent='Coins: '+score+'/5';
        }
    }
}
```

### The Updated Project
```javascript
1: floor.rotation.x=-Math.PI/2; floor.receiveShadow=true;
2: scene.add(floor);
3: console.log('Level walls:', walls.length);
4: 
5: // ← new collision, collectibles, and HUD code inserted here
```
We now have functions to detect and resolve wall intersections, spawn collectibles, and manage a 2D HTML score overlay.

### Mechanical walkthrough
- **`for (const wall of walls)`** — Iterates over every wall to check for overlap.
- **`pos.x + PLAYER_RADIUS > wall.min.x && ...`** — Checks if the player's bounding cylinder (radius in X/Z, height in Y) intersects the wall's AABB.
- **`const dx = Math.min(...)`** — Calculates the depth of penetration on the X axis from both the left and right sides.
- **`if (dx < dz)`** — Determines if the intersection is shallower on the X axis or Z axis. Resolving along the shallowest axis prevents the player from sliding diagonally through corners.
- **`pos.x += (pos.x < ...) ? -dx : dx`** — Pushes the player's position out by `dx` away from the center of the wall.
- **`new THREE.MeshStandardMaterial({emissive:0xff8800...})`** — Creates a material that glows orange independent of scene lighting.
- **`for(let i=coins.length-1;i>=0;i--)`** — Loops backward through the array. This is required because we are removing items during the loop; looping forward would skip elements as indices shift.
- **`player.pos.distanceTo(coins[i].position) < 0.5`** — Checks if the player is within half a unit of the coin.
- **`scene.remove(coins[i])`** — Despawns the collected mesh from the renderer.
- **`coins.splice(i,1)`** — Removes the coin object from our update array.

### CS lens
Also recognized in: separating axis theorem (SAT), discrete collision detection, reverse array iteration.

### SE lens
Using DOM elements (`div`) for the HUD is vastly simpler and sharper than rendering text geometry inside WebGL. It leverages the browser's existing layout and compositing engine, trading a tiny bit of DOM overhead for massive ease of use.

### Commands needed
None.

### Run it
Output predicted with certainty without execution:
No console output. Logic is defined.

### One sentence connecting to previous unit
All our systems are built; we just need to wire them into the main animation loop.

## Closing

### Connect the pieces
Let's trace a player pressing W+D at a yaw of PI/4 (northeast):
1. **Input:** `keys['KeyW']` and `keys['KeyD']` are true.
2. **Direction:** `camera.getWorldDirection()` yields a forward vector. Since the camera looks down -Z by default, turning PI/4 (45 deg left) gives `forward = (-0.71, 0, -0.71)`.
3. **Movement:** `addScaledVector` moves the player northeast based on `forward` and `right`.
4. **Collision:** The new position is passed to `resolveCollisions`. It overlaps a wall, so `dx` and `dz` penetration depths are calculated, and the position is pushed back along the shallowest axis to slide along the wall.
5. **Collection:** `updateCoins` checks distance. A coin at `(1, 1, 0)` is less than 0.5 units away. It is `remove()`d from the scene, `splice()`d from the array, and the `div` text updates to "Coins: 1/5".
6. **Render:** The `camera` adopts the final resolved position, and `renderer.render()` draws the frame. All systems compose cleanly.
