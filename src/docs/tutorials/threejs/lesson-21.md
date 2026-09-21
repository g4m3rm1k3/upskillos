# Lesson 21: Keyboard and Mouse Interaction — Events, State, and First-Person Controls

In this lesson, you will build a first-person movement and interaction system. You will implement keyboard movement, mouse look, raycasting for clicking objects, and mobile touch controls. The core transferable insight is the separation of input events from continuous processing: keyboard input should update a state object, not trigger movement directly. The animation loop reads that state each frame and computes movement from it, separating asynchronous event handling from synchronous continuous rendering.

**What you need to know first:**
- Lesson 20

**Terms used in this lesson:**
- **State object pattern** — a design pattern where an object acts as a dictionary to hold the instantaneous state of inputs. It solves the problem of operating system key-repeat delays by buffering asynchronous events for continuous polling.
- **Frame-rate independence** — calculating movement by factoring in the time delta since the previous frame. It prevents game logic from running faster or slower depending on the device's rendering capabilities.
- **Pointer lock** — a browser capability that hides the cursor and intercepts raw mouse movements without screen boundaries. It solves the problem of the mouse cursor hitting the edge of the monitor when looking around in 3D.
- **Gimbal lock** — a mathematical problem in Euler angle rotations where two rotational axes align, causing erratic spin. Solved in first-person cameras by clamping the vertical look angle so the user cannot look past straight up or straight down.
- **Normalized Device Coordinates (NDC)** — a 2D coordinate space mapping the screen to a range of -1 to 1 on both axes. It serves as the standard input format for projecting a 2D screen click into a 3D ray.
- **Raycasting** — calculating a mathematical line (ray) through 3D space to test what geometry it hits. It solves the problem of translating a 2D screen click into a 3D physical intersection.
- **`const`** — a JavaScript keyword defining a block-scoped variable that cannot be reassigned.
- **`let`** — a JavaScript keyword defining a block-scoped variable that can be reassigned.
- **Arrow function (`=>`)** — a JavaScript syntax feature that provides a concise way to write functions while preserving the lexical scope of `this`.
- **`Math.max` / `Math.min`** — JavaScript built-in mathematical functions used to clamp numbers to specific ranges.
- **`Math.PI`** — JavaScript built-in mathematical constant for the ratio of a circle's circumference to its diameter, used for calculating rotations in radians.
- **`document.addEventListener`** — a DOM API feature that registers a callback function to be executed when a specified event occurs on the page.
- **`e.preventDefault()`** — a DOM API feature that cancels the browser's default behavior for a triggered event, such as stopping the page from scrolling when swiping.

**Objects and methods used:**

- **`THREE.Vector3`**
  - *What it is:* A fundamental class representing a 3D vector or point.
  - *Implementation:* `class Vector3 { constructor(x, y, z) }`
  - *Its use:* Used extensively to store positions, mathematical directions, and movement increments.
  - *Type:* Class.
  - *Responsibility:* Encapsulates X, Y, and Z coordinates and provides optimized linear algebra operations.
  - *Depends on:* Numerical coordinate inputs.
  - *Connects to:* Passed into physics math and object position properties.
  - *Shape:* A core math structure in the library.

- **`THREE.Vector2`**
  - *What it is:* A core class representing a 2D vector.
  - *Implementation:* `class Vector2 { constructor(x, y) }`
  - *Its use:* Used to hold the user's mouse position in Normalized Device Coordinates.
  - *Type:* Class.
  - *Responsibility:* Encapsulates X and Y coordinates and provides 2D math operations.
  - *Depends on:* Numerical coordinate inputs.
  - *Connects to:* Passed into the raycaster to define the screen-space origin.
  - *Shape:* A core math structure.

- **`THREE.Raycaster`**
  - *What it is:* A utility class that casts a line into the scene to detect geometry.
  - *Implementation:* `class Raycaster { constructor() }`
  - *Its use:* Used to determine which 3D box the user clicks on.
  - *Type:* Class.
  - *Responsibility:* Calculates mathematical intersections between a defined ray and bounding geometries.
  - *Depends on:* A defined origin and direction.
  - *Connects to:* Interrogates scene objects and returns hit data.
  - *Shape:* An interaction utility.

- **`Raycaster.setFromCamera`**
  - *What it is:* An instance method that aims the ray based on the camera view.
  - *Implementation:* `setFromCamera(coords: Vector2, camera: Camera): void`
  - *Its use:* Converts a 2D screen click into a 3D aiming vector.
  - *Type:* Instance method.
  - *Responsibility:* Unprojects normalized device coordinates into world space using the camera's projection matrix.
  - *Depends on:* The NDC mouse position and the active camera.
  - *Connects to:* Updates the internal state of the `Raycaster`.
  - *Shape:* The entry point for screen-to-world interaction.

- **`Raycaster.intersectObjects`**
  - *What it is:* An instance method that tests the ray against an array of targets.
  - *Implementation:* `intersectObjects(objects: Object3D[]): Intersection[]`
  - *Its use:* Finds which specific meshes are currently under the mouse cursor.
  - *Type:* Instance method.
  - *Responsibility:* Iterates over an array of objects to mathematically verify if the ray intersects their geometry, returning sorted hits.
  - *Depends on:* An array of `THREE.Object3D` targets.
  - *Connects to:* Returns detailed hit records to the application logic.
  - *Shape:* The execution query of the raycaster.

- **`canvas.requestPointerLock`**
  - *What it is:* A DOM element method that requests absolute control over the mouse pointer.
  - *Implementation:* `element.requestPointerLock(): void`
  - *Its use:* Enables the infinite mouse movement needed for a first-person camera.
  - *Type:* Instance method on DOM elements.
  - *Responsibility:* Requests the operating system to hide the cursor and route raw movement deltas to the browser.
  - *Depends on:* Requires a user gesture (like a click) to activate for security reasons.
  - *Connects to:* Triggers browser-level `pointerlockchange` events.
  - *Shape:* A bridge between the OS window manager and the web environment.

- **`Vector3.crossVectors`**
  - *What it is:* An instance method that calculates the cross product of two vectors.
  - *Implementation:* `crossVectors(a: Vector3, b: Vector3): this`
  - *Its use:* Calculates the "right" vector from the camera's "forward" and "up" axes.
  - *Type:* Instance method.
  - *Responsibility:* Computes a vector that is perfectly orthogonal (perpendicular) to the two input vectors.
  - *Depends on:* Two input `Vector3` directions.
  - *Connects to:* Mutates the vector it is called upon.
  - *Shape:* A fundamental 3D geometry operation.

- **`Vector3.addScaledVector`**
  - *What it is:* An instance method that adds a multiplied vector to the current one.
  - *Implementation:* `addScaledVector(v: Vector3, s: number): this`
  - *Its use:* Efficiently accumulates directional movement multiplied by speed and frame delta.
  - *Type:* Instance method.
  - *Responsibility:* Performs a combined scale and addition operation without creating intermediate temporary objects in memory.
  - *Depends on:* A direction vector and a numerical scalar.
  - *Connects to:* Mutates the vector it is called upon.
  - *Shape:* An optimized math operation for continuous game loops.

- **`Object3D.getWorldDirection`**
  - *What it is:* An instance method that extracts the absolute forward-facing vector of a 3D object.
  - *Implementation:* `getWorldDirection(target: Vector3): Vector3`
  - *Its use:* Discovers exactly which way the camera is currently looking so WASD keys move relative to the view.
  - *Type:* Instance method.
  - *Responsibility:* Reads the object's global transformation matrix to extract its normalized Z-axis.
  - *Depends on:* A target vector to populate, avoiding garbage collection overhead.
  - *Connects to:* Reads the internal matrix state of the object.
  - *Shape:* A spatial query.

- **`THREE.Mesh`**
  - *What it is:* A 3D object that consists of geometry and material.
  - *Implementation:* `class Mesh { constructor(geometry, material) }`
  - *Its use:* Represents the physical boxes the user can click on.
  - *Type:* Class.
  - *Responsibility:* Combines a structural shape and a visual surface into a renderable node.
  - *Depends on:* A geometry definition and a material definition.
  - *Connects to:* Placed into the scene graph.
  - *Shape:* The primary renderable primitive.

- **`THREE.BoxGeometry`**
  - *What it is:* A mathematical definition of a rectangular cuboid.
  - *Implementation:* `class BoxGeometry { constructor(width, height, depth) }`
  - *Its use:* Defines the physical shape of the interactable objects.
  - *Type:* Class.
  - *Responsibility:* Generates the vertices and faces required to draw a cube.
  - *Depends on:* Dimensional measurements.
  - *Connects to:* Provided to a `Mesh` during instantiation.
  - *Shape:* A primitive geometry provider.

- **`THREE.MeshStandardMaterial`**
  - *What it is:* A physically-based rendering surface definition.
  - *Implementation:* `class MeshStandardMaterial { constructor(parameters) }`
  - *Its use:* Defines the color and light-reactive properties of the clickable boxes.
  - *Type:* Class.
  - *Responsibility:* Informs the renderer how light should bounce off the surface of the associated geometry.
  - *Depends on:* Configuration parameters like color and roughness.
  - *Connects to:* Provided to a `Mesh`.
  - *Shape:* A surface definition.

## Concept Unit: Key state tracking — the state object pattern

### The Problem
If you listen for a `keydown` event and immediately move an object inside that event handler, the movement will stutter. The operating system triggers the event once, waits for a built-in delay, and then repeats the event rapidly. This makes it impossible to achieve smooth, continuous movement. How can we decouple the keyboard hardware events from our continuous visual frame rendering?

### Introduce the concept in isolation
```javascript
const keys = {};
document.addEventListener('keydown', (e) => { keys[e.code] = true; });

// Simulate W key press
document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
console.log('KeyW is currently:', keys['KeyW']);
```
Output:
KeyW is currently: true

This proves that an object can act as a dictionary to passively store whether a key is currently held. Our animation loop can poll this dictionary continuously without waiting for OS events.

### Discard the throwaway
This throwaway simulation is discarded and will not be used in the project.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are adding keyboard controls.
- **Files affected**: `src/lesson-21.html` (modified)
- **Change type**: add
- **Location**: Above the animation loop.
- **Dependencies**: None.

### The New Code
```javascript
const keys = {};
document.addEventListener('keydown', (e) => { keys[e.code] = true; });
document.addEventListener('keyup',   (e) => { keys[e.code] = false; });

const SPEED = 5;  
function update(delta) {
    if (keys['KeyW'] || keys['ArrowUp'])    player.position.z -= SPEED * delta;
    if (keys['KeyS'] || keys['ArrowDown'])  player.position.z += SPEED * delta;
    if (keys['KeyA'] || keys['ArrowLeft'])  player.position.x -= SPEED * delta;
    if (keys['KeyD'] || keys['ArrowRight']) player.position.x += SPEED * delta;
    if (keys['Space']) player.position.y += SPEED * delta;  
}
```

### The Updated Project
```javascript
// 1: const scene = new THREE.Scene();
// 2: // ← new: State dictionary and event listeners
// 3: const keys = {};
// 4: document.addEventListener('keydown', (e) => { keys[e.code] = true; });
// 5: document.addEventListener('keyup',   (e) => { keys[e.code] = false; });
// 6: 
// 7: const SPEED = 5;  
// 8: function update(delta) {
// 9:     if (keys['KeyW'] || keys['ArrowUp'])    player.position.z -= SPEED * delta;
// 10:    if (keys['KeyS'] || keys['ArrowDown'])  player.position.z += SPEED * delta;
// 11:    if (keys['KeyA'] || keys['ArrowLeft'])  player.position.x -= SPEED * delta;
// 12:    if (keys['KeyD'] || keys['ArrowRight']) player.position.x += SPEED * delta;
// 13:    if (keys['Space']) player.position.y += SPEED * delta;  
// 14: }
// 15: // ...
// 16: function animate() {
// 17:     requestAnimationFrame(animate);
// 18:     const delta = clock.getDelta();
// 19:     update(delta); // ← new: poll state continuously
// 20:     renderer.render(scene, camera);
// 21: }
```
The state object captures keyboard events, and the animation loop continuously updates the player's position based on whatever keys are currently `true`.

### Mechanical walkthrough
- `const keys = {};` initializes an empty object to act as the state dictionary.
- `document.addEventListener('keydown', ...)` registers an asynchronous listener for any key press.
- `(e) => { keys[e.code] = true; }` extracts the key code and creates or updates a boolean flag in the dictionary to `true`.
- `document.addEventListener('keyup', ...)` listens for the key release.
- `(e) => { keys[e.code] = false; }` resets that specific key's flag to `false`.
- `const SPEED = 5;` sets the movement rate in 3D units per second.
- `function update(delta)` is our continuous processing function, accepting the frame time.
- `if (keys['KeyW'] || keys['ArrowUp'])` polls the state dictionary to see if the user wants to move forward.
- `player.position.z -= SPEED * delta;` applies the movement, factoring in `delta` to ensure frame-rate independence.

### CS lens
This pattern bridges discrete and continuous domains. Hardware interrupts and OS events are discrete occurrences in time. Physics integration and rendering are continuous mathematical processes. By writing events into a passive buffer (the state object) and having the continuous process read from that buffer, the two systems run independently at their own natural rates without blocking or stuttering each other.

### SE lens
Separation of concerns. The code calculating movement physics does not care *how* a key was pressed, only that the `keys` dictionary says a direction is intended. This makes testing trivial—you can inject a fake dictionary to simulate inputs.

### Commands needed
Open lesson-21.html in a modern browser.

### Run it
Hold the W key and watch the player smoothly glide. Release the key and watch movement stop instantly.

### One sentence connecting to previous unit
With keyboard movement handled smoothly, we must now let the user aim that movement by looking around with the mouse.

## Concept Unit: Pointer lock and mouse look — first-person camera

### The Problem
If we tie camera rotation to mouse coordinates, the cursor will quickly hit the physical edge of the monitor, preventing the user from turning further. How do we allow infinite mouse rotation and hide the cursor from the user?

### Introduce the concept in isolation
```javascript
// A minimal illustration of pointer lock concepts
const dx = 10; // simulated mouse delta right
const sensitivity = 0.002;
let yaw = 0;

yaw -= dx * sensitivity;
console.log('New yaw in radians:', yaw);
```
Output:
New yaw in radians: -0.02

This proves that by taking a relative mouse movement (delta) and multiplying it by a tiny sensitivity scalar, we can continuously accumulate a rotation angle (yaw) in radians.

### Discard the throwaway
This throwaway math calculation is discarded and will not be used in the project.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `src/lesson-21.html` (modified)
- **Change type**: add
- **Location**: Below the keyboard event listeners.
- **Dependencies**: Requires a `canvas` element to exist.

### The New Code
```javascript
const canvas = document.getElementById('c');
canvas.addEventListener('click', () => canvas.requestPointerLock());

let yaw = 0, pitch = 0;  
document.addEventListener('mousemove', (e) => {
    if (!document.pointerLockElement) return;
    const sensitivity = 0.002;  
    yaw   -= e.movementX * sensitivity;  
    pitch -= e.movementY * sensitivity;  
    pitch  = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, pitch));  
    camera.rotation.order = 'YXZ';  
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
});
```

### The Updated Project
```javascript
// 1: const SPEED = 5;
// 2: // ← new: Pointer lock and mouse look variables
// 3: const canvas = document.getElementById('c');
// 4: canvas.addEventListener('click', () => canvas.requestPointerLock());
// 5: let yaw = 0, pitch = 0;  
// 6: document.addEventListener('mousemove', (e) => {
// 7:     if (!document.pointerLockElement) return;
// 8:     const sensitivity = 0.002;  
// 9:     yaw   -= e.movementX * sensitivity;  
// 10:    pitch -= e.movementY * sensitivity;  
// 11:    pitch  = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, pitch));  
// 12:    camera.rotation.order = 'YXZ';  
// 13:    camera.rotation.y = yaw;
// 14:    camera.rotation.x = pitch;
// 15: });
// 16: function update(delta) { // ...
```
Clicking the canvas asks the browser to trap the mouse. The mousemove event then receives raw movement deltas, allowing the camera to spin freely without the cursor hitting screen edges.

### Mechanical walkthrough
- `const canvas = document.getElementById('c');` selects the rendering canvas.
- `canvas.addEventListener('click', () => canvas.requestPointerLock());` triggers the browser's security-restricted pointer lock API upon user interaction.
- `let yaw = 0, pitch = 0;` initializes the horizontal (yaw) and vertical (pitch) rotation angles.
- `document.addEventListener('mousemove', ...)` listens for mouse movements globally.
- `if (!document.pointerLockElement) return;` skips execution if the pointer isn't locked, preventing accidental rotation when the user is just browsing.
- `const sensitivity = 0.002;` defines a scalar to convert raw mouse pixel deltas into small radian adjustments.
- `yaw -= e.movementX * sensitivity;` accumulates horizontal mouse travel into the yaw angle.
- `pitch -= e.movementY * sensitivity;` accumulates vertical mouse travel into the pitch angle.
- `pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, pitch));` uses mathematical clamping to restrict looking straight up or down, avoiding gimbal lock.
- `camera.rotation.order = 'YXZ';` reconfigures the camera to apply rotations in the correct sequence for a first-person view.
- `camera.rotation.y = yaw;` applies the yaw angle to the camera's Y axis.
- `camera.rotation.x = pitch;` applies the pitch angle to the camera's X axis.

### CS lens
The `requestPointerLock` API shifts the application from an absolute coordinate system (where is the mouse on the screen?) to a relative delta system (how far did the mouse physically move since the last poll?). This paradigm shift is required for any application simulating continuous 360-degree rotation, as finite screens cannot represent infinite absolute positions.

### SE lens
Notice how we track `yaw` and `pitch` in separate state variables rather than querying `camera.rotation.y` and adding to it. Euler angles in 3D engines are mathematically intertwined; reading them back after they have been converted to quaternions internally can yield unpredictable signs and values. Storing our own authoritative truth (yaw and pitch) and continuously pushing it to the camera is vastly more robust than reading and modifying the engine's internal state.

### Commands needed
Open lesson-21.html in a modern browser.

### Run it
Click the canvas to lock the pointer. Move the mouse to smoothly look around the 3D scene. Hit Escape to unlock the cursor.

### One sentence connecting to previous unit
Now that the camera turns, our previous keyboard code needs to understand which way the camera is facing so "forward" is always the direction the user is looking.

## Concept Unit: WASD movement in camera-relative direction

### The Problem
Our current `update` function moves the player along the absolute Z axis when 'W' is pressed. If the user turns the camera 90 degrees to the right and presses 'W', they will strafe sideways. How do we ensure 'W' always moves the player in the direction the camera is looking?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

const forward = new THREE.Vector3(0.5, 0, -0.5); // Example diagonal look
const up = new THREE.Vector3(0, 1, 0);
const right = new THREE.Vector3();

right.crossVectors(forward, up);
console.log('Right vector is:', right.x, right.y, right.z);
```
Output:
Right vector is: 0.5 0 0.5

This proves that by using the mathematical cross product (`crossVectors`) between the forward direction and the absolute up vector, we can derive the precise orthogonal "right" vector needed for the 'D' and 'A' strafe keys.

### Discard the throwaway
This math calculation is discarded and will not be used in the project.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `src/lesson-21.html` (modified)
- **Change type**: replace
- **Location**: Inside the `update` function.
- **Dependencies**: None.

### The New Code
```javascript
const moveDir = new THREE.Vector3();
const forward = new THREE.Vector3();
const right   = new THREE.Vector3();
const up      = new THREE.Vector3(0, 1, 0);

function update(delta) {
    camera.getWorldDirection(forward);  
    forward.y = 0; forward.normalize(); 
    right.crossVectors(forward, up);    
    
    moveDir.set(0, 0, 0);
    if (keys['KeyW']) moveDir.addScaledVector(forward,  SPEED * delta);
    if (keys['KeyS']) moveDir.addScaledVector(forward, -SPEED * delta);
    if (keys['KeyA']) moveDir.addScaledVector(right,   -SPEED * delta);
    if (keys['KeyD']) moveDir.addScaledVector(right,    SPEED * delta);
    
    player.position.add(moveDir);
    camera.position.copy(player.position).add(new THREE.Vector3(0, 1.8, 0)); 
}
```

### The Updated Project
```javascript
// 1: const SPEED = 5;
// 2: // ← new: vector allocations moved outside the loop
// 3: const moveDir = new THREE.Vector3();
// 4: const forward = new THREE.Vector3();
// 5: const right   = new THREE.Vector3();
// 6: const up      = new THREE.Vector3(0, 1, 0);
// 7: 
// 8: function update(delta) {
// 9:     // ← new: camera-relative movement logic
// 10:    camera.getWorldDirection(forward);  
// 11:    forward.y = 0; forward.normalize(); 
// 12:    right.crossVectors(forward, up);    
// 13:    moveDir.set(0, 0, 0);
// 14:    if (keys['KeyW']) moveDir.addScaledVector(forward,  SPEED * delta);
// 15:    if (keys['KeyS']) moveDir.addScaledVector(forward, -SPEED * delta);
// 16:    if (keys['KeyA']) moveDir.addScaledVector(right,   -SPEED * delta);
// 17:    if (keys['KeyD']) moveDir.addScaledVector(right,    SPEED * delta);
// 18:    player.position.add(moveDir);
// 19:    camera.position.copy(player.position).add(new THREE.Vector3(0, 1.8, 0));
// 20: }
```
The movement vector is now constructed dynamically each frame based on the camera's actual physical orientation.

### Mechanical walkthrough
- `const moveDir = new THREE.Vector3();` instantiates a vector to hold the calculated movement for this frame.
- `const forward = new THREE.Vector3();` allocates a vector to store the camera's look direction.
- `const right = new THREE.Vector3();` allocates a vector to store the camera's right-hand direction.
- `const up = new THREE.Vector3(0, 1, 0);` defines the absolute global up direction.
- `camera.getWorldDirection(forward);` retrieves the camera's forward orientation and writes it into the `forward` vector.
- `forward.y = 0; forward.normalize();` flattens the forward vector so looking up doesn't make the player walk into the sky, then normalizes its length back to 1.
- `right.crossVectors(forward, up);` computes the cross product, generating a vector pointing precisely right relative to the current forward direction.
- `moveDir.set(0, 0, 0);` resets the accumulator vector to zero before checking keys.
- `if (keys['KeyW']) moveDir.addScaledVector(forward, SPEED * delta);` accumulates forward direction multiplied by scaled speed if 'W' is held.
- `player.position.add(moveDir);` physically moves the player by the final accumulated vector.
- `camera.position.copy(player.position).add(new THREE.Vector3(0, 1.8, 0));` snaps the camera to the player's new location, offset upwards to simulate eye height.

### CS lens
In a 3D coordinate system, movement is fundamentally a vector addition problem. Absolute movement adds a static vector `(0, 0, -1)`. Relative movement requires dynamically generating a basis matrix (the forward and right vectors) based on the camera's rotational state, and then scaling those basis vectors by the input magnitude.

### SE lens
Vector math generates massive amounts of temporary objects if not managed correctly. Notice that `moveDir`, `forward`, `right`, and `up` are instantiated exactly once outside the `update` loop. Inside the loop, we use in-place mutation methods (`set`, `addScaledVector`, `crossVectors`). If we used `new THREE.Vector3()` inside a function running 60 times a second, the JavaScript garbage collector would eventually stall the main thread, causing severe visual stuttering.

### Commands needed
Open lesson-21.html in a modern browser.

### Run it
Click the canvas to lock the mouse. Turn right, hold 'W', and notice you move in the exact direction you are facing.

### One sentence connecting to previous unit
Now that the player can navigate freely, we must give them a way to interact with the objects they approach using mouse clicks.

## Concept Unit: Click to interact — combining raycasting with events

### The Problem
When the user clicks the screen, the browser provides a 2D pixel coordinate (X and Y). The 3D scene exists in a completely different spatial context. How do we determine which 3D object lies behind the 2D pixel the user clicked on?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

const raycaster = new THREE.Raycaster();
raycaster.ray.origin.set(0, 0, 0);
raycaster.ray.direction.set(0, 0, -1); // Pointing forward

const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
box.position.set(0, 0, -5); // Sitting in front of ray

const hits = raycaster.intersectObjects([box]);
console.log('Ray hit count:', hits.length);
```
Output:
Ray hit count: 1

This proves that given a defined origin and direction, the `Raycaster` class can mathematically intersect its line against an array of objects to determine if a collision occurred. 

### Discard the throwaway
This throwaway intersection check is discarded and will not be used in the project.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `src/lesson-21.html` (modified)
- **Change type**: add
- **Location**: Below the pointer lock code, before the animation loop.
- **Dependencies**: Requires scene graph access.

### The New Code
```javascript
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const interactables = [];  

for (let i = 0; i < 5; i++) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.8,0.8,0.8),
        new THREE.MeshStandardMaterial({color: Math.random()*0xffffff})
    );
    mesh.position.set((i-2)*2, 0, -5);
    mesh.userData.onClick = () => {
        mesh.material.color.set(Math.random()*0xffffff);  
    };
    scene.add(mesh);
    interactables.push(mesh);
}

document.addEventListener('click', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(interactables);
    if (hits.length > 0 && hits[0].object.userData.onClick) {
        hits[0].object.userData.onClick();
    }
});
```

### The Updated Project
```javascript
// 1: // ← new: Raycasting interaction code
// 2: const raycaster = new THREE.Raycaster();
// 3: const mouse = new THREE.Vector2();
// 4: const interactables = [];  
// 5: 
// 6: for (let i = 0; i < 5; i++) {
// 7:     const mesh = new THREE.Mesh(
// 8:         new THREE.BoxGeometry(0.8,0.8,0.8),
// 9:         new THREE.MeshStandardMaterial({color: Math.random()*0xffffff})
// 10:    );
// 11:    mesh.position.set((i-2)*2, 0, -5);
// 12:    mesh.userData.onClick = () => {
// 13:        mesh.material.color.set(Math.random()*0xffffff);  
// 14:    };
// 15:    scene.add(mesh);
// 16:    interactables.push(mesh);
// 17: }
// 18: 
// 19: document.addEventListener('click', (e) => {
// 20:    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
// 21:    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
// 22:    raycaster.setFromCamera(mouse, camera);
// 23:    const hits = raycaster.intersectObjects(interactables);
// 24:    if (hits.length > 0 && hits[0].object.userData.onClick) {
// 25:        hits[0].object.userData.onClick();
// 26:    }
// 27: });
// 28: function update(delta) { // ...
```
We define a list of objects that can be interacted with, map screen clicks into a normalized 2D coordinate system, and fire a mathematical ray into the 3D scene to detect clicks.

### Mechanical walkthrough
- `const raycaster = new THREE.Raycaster();` initializes the mathematical picking tool.
- `const mouse = new THREE.Vector2();` initializes a 2D coordinate vector.
- `const interactables = [];` establishes an array to track exactly which objects we want to raycast against.
- `for (let i = 0; i < 5; i++)` loops to construct five test targets.
- `const mesh = new THREE.Mesh(...)` creates the physical 3D box.
- `mesh.userData.onClick = () => { ... }` assigns a custom callback function to the object's `userData` dictionary, which is reserved explicitly by Three.js for application-specific data.
- `scene.add(mesh);` and `interactables.push(mesh);` insert the object into the visible scene and the logical array.
- `document.addEventListener('click', ...)` listens for the OS mouse click.
- `mouse.x = (e.clientX / window.innerWidth) * 2 - 1;` mathematically converts the pixel X coordinate into Normalized Device Coordinates (-1 to 1).
- `mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;` mathematically converts and inverts the Y coordinate.
- `raycaster.setFromCamera(mouse, camera);` unprojects the 2D coordinate using the camera's projection matrix to establish a 3D ray.
- `const hits = raycaster.intersectObjects(interactables);` executes the mathematical test and returns an array of hit records, sorted by closest distance.
- `if (hits.length > 0 && hits[0].object.userData.onClick)` verifies that at least one object was hit and that the closest object contains our custom click handler.
- `hits[0].object.userData.onClick();` executes the interaction logic tied to that specific mesh.

### CS lens
Raycasting is computationally expensive. It requires testing every triangle of a mesh against a mathematical line segment. If a scene contains a million triangles, testing all of them every frame is catastrophic. This is why we maintain an explicit `interactables` array. By isolating the raycaster to only test a subset of bounding boxes, we drastically reduce algorithmic complexity from O(N) where N is all polygons, down to a manageable fraction.

### SE lens
Using the `userData` object to store the `onClick` callback embeds the interaction behavior directly onto the entity. This avoids giant switch statements in the click handler (e.g., `if (hit == box1) doX() else if (hit == box2) doY()`). The click handler just blindly executes whatever function is attached to the hit object, enforcing loose coupling.

### Commands needed
Open lesson-21.html in a modern browser.

### Run it
Click on any of the five generated boxes. Their color will randomly change immediately.

### One sentence connecting to previous unit
The desktop interface is complete, but if a user loads this on a phone, they lack a keyboard and physical mouse, requiring a touch interface adapter.

## Concept Unit: Touch events for mobile — same pattern

### The Problem
Mobile devices don't have pointer lock. When a user drags their finger on the screen, there is no `movementX` or `movementY` provided by the operating system, only absolute coordinates where the finger is currently located. How do we simulate camera look using touch?

### Introduce the concept in isolation
```javascript
let lastX = 100;
const currentX = 115; // User dragged finger 15px right

const dx = currentX - lastX;
lastX = currentX; // Update for next frame

console.log('Derived movement delta:', dx);
```
Output:
Derived movement delta: 15

This proves that by manually tracking the absolute position of the touch in the previous frame and subtracting it from the current frame's position, we can derive our own `movementX` equivalent for camera rotation.

### Discard the throwaway
This mathematical derivation is discarded and will not be used in the project.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `src/lesson-21.html` (modified)
- **Change type**: add
- **Location**: Below the click event listener.
- **Dependencies**: None.

### The New Code
```javascript
const touch = { active: false, lastX: 0, lastY: 0 };
document.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touch.active = true;
    touch.lastX = e.touches[0].clientX;
    touch.lastY = e.touches[0].clientY;
}, {passive: false});

document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!touch.active) return;
    const dx = e.touches[0].clientX - touch.lastX;
    const dy = e.touches[0].clientY - touch.lastY;
    touch.lastX = e.touches[0].clientX;
    touch.lastY = e.touches[0].clientY;
    
    const sensitivity = 0.003;
    yaw   -= dx * sensitivity;
    pitch -= dy * sensitivity;
    pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, pitch));
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
}, {passive: false});

document.addEventListener('touchend', () => { touch.active = false; });
```

### The Updated Project
```javascript
// 1: // ... previous raycast code
// 2: // ← new: Mobile touch interaction adapter
// 3: const touch = { active: false, lastX: 0, lastY: 0 };
// 4: document.addEventListener('touchstart', (e) => {
// 5:     e.preventDefault();
// 6:     touch.active = true;
// 7:     touch.lastX = e.touches[0].clientX;
// 8:     touch.lastY = e.touches[0].clientY;
// 9: }, {passive: false});
// 10: 
// 11: document.addEventListener('touchmove', (e) => {
// 12:    e.preventDefault();
// 13:    if (!touch.active) return;
// 14:    const dx = e.touches[0].clientX - touch.lastX;
// 15:    const dy = e.touches[0].clientY - touch.lastY;
// 16:    touch.lastX = e.touches[0].clientX;
// 17:    touch.lastY = e.touches[0].clientY;
// 18:    
// 19:    const sensitivity = 0.003;
// 20:    yaw   -= dx * sensitivity;
// 21:    pitch -= dy * sensitivity;
// 22:    pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, pitch));
// 23:    camera.rotation.order = 'YXZ';
// 24:    camera.rotation.y = yaw;
// 25:    camera.rotation.x = pitch;
// 26: }, {passive: false});
// 27: 
// 28: document.addEventListener('touchend', () => { touch.active = false; });
// 29: function update(delta) { // ...
```
By listening to touch events, calculating deltas, and applying those deltas to our existing `yaw` and `pitch` state variables, we reuse the exact same camera math as the mouse lock logic.

### Mechanical walkthrough
- `const touch = { active: false, lastX: 0, lastY: 0 };` initializes an isolated state object for touch tracking.
- `document.addEventListener('touchstart', ...)` captures the moment a finger lands on the screen.
- `e.preventDefault();` tells the browser to stop executing default behaviors (like scrolling or zooming the webpage).
- `touch.lastX = e.touches[0].clientX;` records the exact starting coordinate.
- `{passive: false}` is a required browser flag indicating that we intend to call `preventDefault`, overriding modern browser optimizations.
- `document.addEventListener('touchmove', ...)` fires continuously as the finger drags.
- `const dx = e.touches[0].clientX - touch.lastX;` calculates the relative movement (delta) manually by comparing the current frame to the recorded last frame.
- `touch.lastX = e.touches[0].clientX;` updates the record so the next frame measures correctly.
- `const sensitivity = 0.003;` establishes the conversion factor.
- `yaw -= dx * sensitivity;` and `pitch -= dy * sensitivity;` apply the calculated deltas identically to the mouse implementation.

### CS lens
This highlights the fundamental difference between absolute and relative input devices. A mouse with pointer lock provides native relative deltas. A touch screen provides native absolute positioning. To unify the two, we mathematically derive the relative deltas from the touch screen's absolute positions across frames, converting the touch screen into an equivalent relative input source.

### SE lens
Notice how this block modifies the same `yaw` and `pitch` variables defined in the mouse pointer lock block. The state variables belong to the camera, not the input device. By separating state from input, we can trivially bolt on multiple input methods (mouse, touch, or even a gamepad controller) that all feed into the same unified camera state without duplicating the underlying rotation math.

### Commands needed
Open lesson-21.html in a modern browser with mobile emulation enabled in dev tools.

### Run it
Click and drag on the screen (emulating a touch swipe) to look around smoothly.

### One sentence connecting to previous unit
All core interactions—movement, aiming, and object selection—are fully established and decoupled from rendering speed.

## Closing

### Connect the pieces
Every system implemented in this lesson relies on separating input events from continuous application logic. Whether a user taps 'W', moves their mouse, clicks an object, or swipes their screen, the asynchronous DOM event is caught and either modifies a state dictionary (like the `keys` object), updates an authoritative rotation value (`yaw` and `pitch`), or executes a mathematical derivation (`raycaster`). Only when the `update(delta)` function is called during the synchronous rendering loop is the physics of the world actually modified. Tracing the W key for 0.5 seconds at 60fps illustrates this perfectly: `keys['KeyW']` remains `true` throughout, `update(0.016)` executes 30 times, constructing a forward vector and accumulating a total movement of `30 * SPEED * 0.016 = 2.4` units forward without stutter or delay.
