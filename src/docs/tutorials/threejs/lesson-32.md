# Lesson 32: Scene Architecture — Module Pattern, Entity-Component, and Game Loop Separation

As scenes grow, monolithic code becomes unmaintainable. The solution is to separate concerns into modules (init, update, render) and group behaviour with data using an Entity-Component (EC) approach. Each entity has an `update(delta)` method. The game loop calls `update()` on all entities, then renders once. This is the architecture of Unity, Unreal, and Godot.

**What you need to know first:**
- Lesson 31
- Basic Three.js rendering loops

**Terms used in this lesson:**
- **Module Pattern** — an architectural pattern that separates code into independent, interchangeable modules. It solves the problem of spaghetti code by encapsulating related functionality.
- **Entity-Component (EC)** — an architectural pattern that groups data (components) and behaviour into discrete entities. It solves the problem of deep inheritance trees by favouring composition and self-contained update logic.
- **Game Loop** — the core loop of a real-time application that continuously reads input, updates state, and renders the screen. It ensures smooth, frame-rate independent progression.
- **State Machine** — a behavioural design pattern where a system exists in exactly one of a finite number of states at any given time. It prevents conflicting updates (like moving while paused).
- **Caching** — storing the results of expensive operations (like loading a texture) to serve future requests faster. It prevents redundant network requests and GPU uploads.
- **class** — ES6 syntax for defining an object blueprint. It provides a structured way to create objects with shared prototypes.
- **constructor** — a special method for creating and initializing an object created within a class.
- **super** — a keyword used to access and call functions on an object's parent.
- **async / await** — syntactic sugar over Promises, allowing asynchronous, non-blocking operations (like loading models) to be written in a synchronous-looking style.
- **Map** — a built-in JavaScript object that holds key-value pairs. Used here for O(1) asset lookups.
- **Object.freeze** — a method that freezes an object, preventing new properties from being added to it. Used to create safe enums.

**Objects and methods used:**
- **THREE.Scene**
  - *What it is:* A container that holds all objects, lights, and cameras.
  - *Implementation:* `class Scene extends Object3D`
  - *Its use:* To hold our entities.
  - *Type:* Class
  - *Responsibility:* Manages the hierarchical graph of 3D objects to be rendered.
  - *Depends on:* Nothing directly, but needs objects added to it to be useful.
  - *Connects to:* Rendered by `THREE.WebGLRenderer`.
  - *Shape:* Core framework container.
- **THREE.PerspectiveCamera**
  - *What it is:* A camera that uses perspective projection.
  - *Implementation:* `class PerspectiveCamera extends Camera`
  - *Its use:* To view the 3D scene from a human-like perspective.
  - *Type:* Class
  - *Responsibility:* Determines what part of the scene is visible and how it projects onto the 2D screen.
  - *Depends on:* Field of view, aspect ratio, near and far clipping planes.
  - *Connects to:* Used by `THREE.WebGLRenderer` to render the scene.
  - *Shape:* Core framework viewing component.
- **THREE.WebGLRenderer**
  - *What it is:* The engine that draws the scene using WebGL.
  - *Implementation:* `class WebGLRenderer`
  - *Its use:* To render our scene to the HTML canvas.
  - *Type:* Class
  - *Responsibility:* Takes a Scene and a Camera, and computes the final pixel output.
  - *Depends on:* An HTML `<canvas>` element.
  - *Connects to:* Reads from `THREE.Scene` and outputs to the DOM.
  - *Shape:* Core framework rendering endpoint.
- **THREE.Mesh**
  - *What it is:* An object that takes a geometry and applies a material to it.
  - *Implementation:* `class Mesh extends Object3D`
  - *Its use:* To represent visual entities in our game.
  - *Type:* Class
  - *Responsibility:* Combines shape and appearance into a renderable 3D object.
  - *Depends on:* A `BufferGeometry` and a `Material`.
  - *Connects to:* Added to a `THREE.Scene`.
  - *Shape:* Core framework visual building block.
- **THREE.Clock**
  - *What it is:* A utility object for keeping track of time.
  - *Implementation:* `class Clock`
  - *Its use:* To calculate the time elapsed since the last frame (`delta`), ensuring smooth movement regardless of frame rate.
  - *Type:* Class
  - *Responsibility:* Measures time intervals accurately.
  - *Depends on:* The browser's `performance.now()`.
  - *Connects to:* Called in the game loop to provide time data to entities.
  - *Shape:* Utility class.
- **requestAnimationFrame**
  - *What it is:* A browser API that tells the browser you wish to perform an animation.
  - *Implementation:* `window.requestAnimationFrame(callback)`
  - *Its use:* To create the continuous game loop.
  - *Type:* Global function
  - *Responsibility:* Schedules a callback to run before the next screen repaint.
  - *Depends on:* A callback function.
  - *Connects to:* Recursively calls the main animation function.
  - *Shape:* Browser API.
- **Array.prototype.push**
  - *What it is:* A method that adds one or more elements to the end of an array.
  - *Implementation:* `push(...items): number`
  - *Its use:* To add new entities to the `EntityManager`.
  - *Type:* Method
  - *Responsibility:* Modifies an array in-place by appending items.
  - *Depends on:* An existing array and the items to append.
  - *Connects to:* Mutates the array state.
  - *Shape:* Standard library method.
- **Array.prototype.splice**
  - *What it is:* A method that changes the contents of an array by removing or replacing existing elements.
  - *Implementation:* `splice(start, deleteCount): Array`
  - *Its use:* To remove dead entities from the game loop safely.
  - *Type:* Method
  - *Responsibility:* Mutates the array in-place by extracting a segment.
  - *Depends on:* A starting index and a count.
  - *Connects to:* Mutates the array state.
  - *Shape:* Standard library method.

## Concept Unit: The spaghetti problem — why architecture matters

### The Problem
When all scene setup, logic, and rendering code live inside a single 300-line `animate()` function, making changes becomes fragile. Finding where the camera updates versus where the physics syncs is difficult. How would you separate the logic for initializing the scene from the logic that updates it?

### Introduce the concept in isolation
```html
<script type="module">
function initConfig() {
    return { loaded: true, retries: 3 };
}
const config = initConfig();
console.log("Config loaded:", config.loaded);
</script>
```
Output: `Config loaded: true`. This proves that grouping related setup logic into a single function that returns a configured object keeps the global scope clean and logic separated. This is called the **Module Pattern**.

### Discard the throwaway
The simple configuration script is discarded and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are establishing a new architectural baseline.
- **Files affected**: `index.html` (created/modified)
- **Change type**: add
- **Location**: Inside the main `<script type="module">` tag.
- **Dependencies**: Three.js imported via CDN.

### The New Code
```javascript
import * as THREE from 'three';

function initScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122);
    scene.fog = new THREE.FogExp2(0x111122, 0.02);
    scene.add(new THREE.AmbientLight(0x404040, 1));
    const dir = new THREE.DirectionalLight(0xffffff, 2);
    dir.position.set(5, 10, 5);
    dir.castShadow = true;
    scene.add(dir);
    return scene;
}

function initCamera(canvas) {
    const cam = new THREE.PerspectiveCamera(75, canvas.width/canvas.height, 0.1, 100);
    cam.position.set(0, 2, 8);
    return cam;
}

function initRenderer(canvas) {
    const r = new THREE.WebGLRenderer({canvas, antialias: true});
    r.setSize(window.innerWidth, window.innerHeight);
    r.shadowMap.enabled = true;
    return r;
}
```

### The Updated Project
```html
// ← new
<canvas id="gameCanvas"></canvas>
<script type="module">
import * as THREE from 'three';

function initScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122);
    scene.fog = new THREE.FogExp2(0x111122, 0.02);
    scene.add(new THREE.AmbientLight(0x404040, 1));
    const dir = new THREE.DirectionalLight(0xffffff, 2);
    dir.position.set(5, 10, 5);
    dir.castShadow = true;
    scene.add(dir);
    return scene;
}

function initCamera(canvas) {
    const cam = new THREE.PerspectiveCamera(75, canvas.width/canvas.height, 0.1, 100);
    cam.position.set(0, 2, 8);
    return cam;
}

function initRenderer(canvas) {
    const r = new THREE.WebGLRenderer({canvas, antialias: true});
    r.setSize(window.innerWidth, window.innerHeight);
    r.shadowMap.enabled = true;
    return r;
}

const canvas = document.getElementById('gameCanvas');
const scene = initScene();
const camera = initCamera(canvas);
const renderer = initRenderer(canvas);
</script>
```
The logic is now neatly separated. Each function creates, configures, and returns exactly one core framework object.

### Mechanical walkthrough
- `function initScene()` declares a setup block for the environment.
- `const scene = new THREE.Scene()` instantiates the main container.
- `scene.background = new THREE.Color(...)` sets the clear color.
- `scene.fog = ...` adds depth cueing.
- `scene.add(...)` inserts lights into the scene.
- `return scene` exposes the configured container to the caller.
- `function initCamera(canvas)` isolates the camera setup.
- `const cam = new THREE.PerspectiveCamera(...)` uses the canvas dimensions to set the aspect ratio.
- `function initRenderer(canvas)` sets up the WebGL context targeting our specific `<canvas>` element.
- `const canvas = document.getElementById(...)` retrieves the HTML element.
- `const scene = initScene()` invokes the module and stores the result.

### CS lens
Separation of concerns. By moving the setup of distinct subsystems into dedicated functions, the main entry point becomes a clear, declarative sequence of operations rather than an intertwined mess of configuration.

### SE lens
This prevents regression bugs when tweaking scene parameters. A developer modifying the lighting setup is completely isolated from the renderer configuration code, reducing the cognitive load needed to understand what a file does.

### Commands needed
Open `lesson-32.html` in a modern browser.

### Run it
The code runs to produce a blank, dark blue canvas with configured but unseen lighting.

### One sentence connecting to previous unit
With the environment cleanly modularised, we now need a similarly structured way to define the objects that will populate it.

## Concept Unit: Entity class — grouping data and behaviour

### The Problem
If we have 50 spinning cubes, we shouldn't have 50 separate rotation variables cluttering the global scope. How can we encapsulate the mesh and its movement logic into a single reusable object?

### Introduce the concept in isolation
```html
<script type="module">
class Player {
    constructor(name) {
        this.name = name;
        this.score = 0;
    }
    addScore(points) {
        this.score += points;
    }
}
const p = new Player("Alice");
p.addScore(10);
console.log(p.name, p.score);
</script>
```
Output: `Alice 10`. This proves that a class can securely bundle data (name, score) with the logic that modifies it (`addScore`). This is the foundation of **Entity-Component (EC)** grouping.

### Discard the throwaway
The isolated Player class is discarded and will not be used in our 3D project.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `index.html` (modified)
- **Change type**: add
- **Location**: Below the `initRenderer` function.
- **Dependencies**: The `THREE.Scene` instance defined above.

### The New Code
```javascript
class Entity {
    constructor(scene, geometry, material) {
        this.mesh = new THREE.Mesh(geometry, material);
        scene.add(this.mesh);
        this.velocity = new THREE.Vector3();
        this.alive = true;
    }
    update(delta) {
        this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));
    }
    destroy(scene) {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.alive = false;
    }
}

class SpinningCube extends Entity {
    constructor(scene, x, spinSpeed) {
        super(scene, new THREE.BoxGeometry(0.5,0.5,0.5), new THREE.MeshStandardMaterial({color:0xff4400}));
        this.mesh.position.x = x;
        this.spinSpeed = spinSpeed;
    }
    update(delta) {
        super.update(delta);
        this.mesh.rotation.y += this.spinSpeed * delta;
    }
}
```

### The Updated Project
```html
// ... previous init functions
// ← new
class Entity {
    constructor(scene, geometry, material) {
        this.mesh = new THREE.Mesh(geometry, material);
        scene.add(this.mesh);
        this.velocity = new THREE.Vector3();
        this.alive = true;
    }
    update(delta) {
        this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));
    }
    destroy(scene) {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.alive = false;
    }
}

class SpinningCube extends Entity {
    constructor(scene, x, spinSpeed) {
        super(scene, new THREE.BoxGeometry(0.5,0.5,0.5), new THREE.MeshStandardMaterial({color:0xff4400}));
        this.mesh.position.x = x;
        this.spinSpeed = spinSpeed;
    }
    update(delta) {
        super.update(delta);
        this.mesh.rotation.y += this.spinSpeed * delta;
    }
}
const canvas = document.getElementById('gameCanvas');
// ...
```
We now have a base `Entity` that handles rendering and movement, and a `SpinningCube` that extends it with custom rotation logic.

### Mechanical walkthrough
- `class Entity` declares our base blueprint.
- `constructor(scene, geometry, material)` takes the required dependencies.
- `this.mesh = new THREE.Mesh(...)` creates the visual component.
- `scene.add(this.mesh)` injects the mesh into the 3D world automatically.
- `this.velocity = new THREE.Vector3()` stores a physical data attribute.
- `update(delta)` provides a uniform method signature for advancing logic.
- `this.mesh.position.add(...)` moves the entity linearly based on its velocity and time passed.
- `destroy(scene)` handles clean removal from the scene and memory disposal to prevent leaks.
- `class SpinningCube extends Entity` creates a specialised version.
- `super(...)` calls the base constructor, passing a specific box geometry and material.
- `this.mesh.position.x = x` overrides the initial position.
- `update(delta)` is overridden to add rotational logic while still calling `super.update(delta)` for movement.

### CS lens
Polymorphism. By ensuring every object provides an `update(delta)` method, the system interacting with these objects doesn't need to know *what* they are, only that they can update themselves.

### SE lens
Self-contained memory management. By giving the `Entity` a `destroy()` method that cleans up its own geometry and material, we prevent memory leaks that commonly occur when developers remove meshes from the scene but forget to free WebGL buffers.

### Commands needed
Open `lesson-32.html` in a modern browser.

### Run it
The code currently defines the classes but instantiates nothing; output remains the empty scene.

### One sentence connecting to previous unit
Now that entities know how to update themselves, we need a centralized system to repeatedly tell them to do so.

## Concept Unit: Entity manager — the update loop

### The Problem
We have entities, but calling `update()` manually on every single one every frame is tedious and error-prone. How do we keep track of all active entities and process them cleanly?

### Introduce the concept in isolation
```html
<script type="module">
const tasks = [
    { name: "A", done: false },
    { name: "B", done: true },
    { name: "C", done: false }
];
for (let i = tasks.length - 1; i >= 0; i--) {
    if (tasks[i].done) tasks.splice(i, 1);
}
console.log(tasks.map(t => t.name));
</script>
```
Output: `["A", "C"]`. This proves that iterating an array *backwards* allows us to safely remove (`splice`) elements mid-loop without skipping the next item. This is crucial for our **Game Loop** logic when culling dead entities.

### Discard the throwaway
The isolated task loop is discarded.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `index.html` (modified)
- **Change type**: add
- **Location**: Below the Entity classes, appending the animation logic.
- **Dependencies**: The `Entity` class, `THREE.Clock`, and `requestAnimationFrame`.

### The New Code
```javascript
class EntityManager {
    constructor() {
        this.entities = [];
    }
    add(entity) {
        this.entities.push(entity);
        return entity;
    }
    update(delta, scene) {
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const e = this.entities[i];
            e.update(delta);
            if (!e.alive) {
                e.destroy(scene);
                this.entities.splice(i, 1);
            }
        }
    }
    get count() { return this.entities.length; }
}

const em = new EntityManager();
em.add(new SpinningCube(scene, -2, 1.0));
em.add(new SpinningCube(scene,  0, 2.0));
em.add(new SpinningCube(scene,  2, -0.5));

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    em.update(delta, scene);
    renderer.render(scene, camera);
}
animate();
```

### The Updated Project
```html
// ... Entity classes
// ← new
class EntityManager {
    constructor() {
        this.entities = [];
    }
    add(entity) {
        this.entities.push(entity);
        return entity;
    }
    update(delta, scene) {
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const e = this.entities[i];
            e.update(delta);
            if (!e.alive) {
                e.destroy(scene);
                this.entities.splice(i, 1);
            }
        }
    }
    get count() { return this.entities.length; }
}

const canvas = document.getElementById('gameCanvas');
const scene = initScene();
const camera = initCamera(canvas);
const renderer = initRenderer(canvas);

const em = new EntityManager();
em.add(new SpinningCube(scene, -2, 1.0));
em.add(new SpinningCube(scene,  0, 2.0));
em.add(new SpinningCube(scene,  2, -0.5));

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    em.update(delta, scene);
    renderer.render(scene, camera);
}
animate();
</script>
```
The game loop is now active. Every frame, time is measured, entities are updated, dead ones are removed, and the scene is drawn.

### Mechanical walkthrough
- `class EntityManager` serves as the registry for all game objects.
- `this.entities = []` initializes the backing list.
- `add(entity)` uses `push()` to track a new entity.
- `update(delta, scene)` is the core batch operation.
- `for (let i = this.entities.length - 1; i >= 0; i--)` loops backwards.
- `e.update(delta)` tells the entity to perform its frame logic.
- `if (!e.alive)` checks the death flag.
- `e.destroy(scene)` triggers cleanup.
- `this.entities.splice(i, 1)` uses the standard library to extract the dead element from the array safely.
- `const clock = new THREE.Clock()` initializes the timekeeper.
- `function animate()` defines the recursive game loop.
- `requestAnimationFrame(animate)` schedules the next frame.
- `const delta = clock.getDelta()` fetches the seconds elapsed since the last frame.
- `em.update(...)` steps the simulation forward.
- `renderer.render(scene, camera)` paints the updated state to the canvas.

### CS lens
The Observer pattern variant. The `EntityManager` maintains a list of subjects and broadcasts a uniform message (`update()`) to all of them, decoupling the game loop from the specific concrete classes it is simulating.

### SE lens
Using `requestAnimationFrame` and a `Clock` ensures frame-rate independence. Whether the monitor is 60Hz or 144Hz, multiplying speeds by `delta` guarantees the objects move at the exact same physical speed across all hardware.

### Commands needed
Open `lesson-32.html` in a modern browser.

### Run it
The canvas displays three orange cubes spinning at different rates.

### One sentence connecting to previous unit
With objects spinning seamlessly, we need a way to pause or stop the action without breaking the renderer.

## Concept Unit: State machine — managing game states

### The Problem
If the user opens a menu, the game should pause. We could scatter `if (!isPaused)` checks inside every entity's `update()` method, but that scatters flow control across the entire codebase. How do we cleanly halt simulation while continuing rendering?

### Introduce the concept in isolation
```html
<script type="module">
const AppState = Object.freeze({ IDLE: 0, RUNNING: 1 });
let state = AppState.IDLE;
function tick() {
    switch (state) {
        case AppState.IDLE: console.log("Waiting"); break;
        case AppState.RUNNING: console.log("Working"); break;
    }
}
tick();
</script>
```
Output: `Waiting`. This proves that using an immutable configuration object combined with a `switch` statement forces the application to cleanly divide behavior based on its active mode. This is called a **State Machine**.

### Discard the throwaway
The simple AppState script is discarded.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `index.html` (modified)
- **Change type**: refactor
- **Location**: Above the `animate()` function.
- **Dependencies**: The `EntityManager`.

### The New Code
```javascript
const GameState = Object.freeze({
    LOADING:   'LOADING',
    MENU:      'MENU',
    PLAYING:   'PLAYING',
    PAUSED:    'PAUSED',
    GAME_OVER: 'GAME_OVER',
});

class Game {
    constructor() {
        this.state = GameState.PLAYING;
        this.em = new EntityManager();
    }
    setState(newState) {
        console.log(`State: ${this.state} -> ${newState}`);
        this.state = newState;
    }
    update(delta, scene) {
        switch (this.state) {
            case GameState.PLAYING:
                this.em.update(delta, scene);
                break;
            case GameState.PAUSED:
                break;
            case GameState.GAME_OVER:
                break;
        }
    }
}

const game = new Game();
game.em.add(new SpinningCube(scene, -2, 1.0));
game.em.add(new SpinningCube(scene,  0, 2.0));
game.em.add(new SpinningCube(scene,  2, -0.5));

// Change animate loop:
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    game.update(delta, scene);
    renderer.render(scene, camera);
}
```

### The Updated Project
```html
// ... EntityManager ...
// ← new
const GameState = Object.freeze({
    LOADING:   'LOADING',
    MENU:      'MENU',
    PLAYING:   'PLAYING',
    PAUSED:    'PAUSED',
    GAME_OVER: 'GAME_OVER',
});

class Game {
    constructor() {
        this.state = GameState.PLAYING;
        this.em = new EntityManager();
    }
    setState(newState) {
        console.log(`State: ${this.state} -> ${newState}`);
        this.state = newState;
    }
    update(delta, scene) {
        switch (this.state) {
            case GameState.PLAYING:
                this.em.update(delta, scene);
                break;
            case GameState.PAUSED:
                break;
            case GameState.GAME_OVER:
                break;
        }
    }
}

const clock = new THREE.Clock();
const game = new Game();
game.em.add(new SpinningCube(scene, -2, 1.0));
game.em.add(new SpinningCube(scene,  0, 2.0));
game.em.add(new SpinningCube(scene,  2, -0.5));

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    game.update(delta, scene);
    renderer.render(scene, camera);
}
animate();
</script>
```
The `Game` object now wraps the `EntityManager` and gates its update step behind a state check.

### Mechanical walkthrough
- `const GameState` declares an enumeration object.
- `Object.freeze(...)` locks the object so properties cannot be added or removed, preventing accidental corruption.
- `class Game` is our top-level orchestrator.
- `this.state = GameState.PLAYING` sets the initial condition.
- `setState(newState)` provides a controlled mutation point for changing modes.
- `update(delta, scene)` acts as the router.
- `switch (this.state)` branches logic in O(1) time based on the active mode.
- `case GameState.PLAYING:` delegates to `this.em.update()`.
- `case GameState.PAUSED:` does nothing, effectively freezing the simulation while rendering continues in `animate()`.
- The instantiation logic was updated to add entities to `game.em` instead of a raw `EntityManager`.

### CS lens
Finite State Automata. By restricting the system to exactly one explicitly named state at a time, we eliminate impossible states (like being paused and game-over simultaneously), drastically reducing bug surfaces.

### SE lens
Centralised flow control. Instead of every entity needing to know if the game is paused, the top-level `Game` object intercepts the tick. Entities remain ignorant of global state, keeping them simple.

### Commands needed
Open `lesson-32.html` in a modern browser. Add `setTimeout(() => game.setState(GameState.PAUSED), 2000);` to the console to observe it.

### Run it
The cubes spin for 2 seconds (if you trigger the timeout) and then freeze perfectly in place.

### One sentence connecting to previous unit
The engine can now pause, update, and manage logic safely, leaving asset loading as the final architectural piece.

## Concept Unit: Asset manager — preloading and caching

### The Problem
If 50 enemies spawn, calling `new TextureLoader().load()` 50 times will crash the browser or stall the frame rate by duplicating GPU memory. How do we ensure an asset is loaded exactly once and shared by all instances?

### Introduce the concept in isolation
```html
<script type="module">
const cache = new Map();
function getAsset(name) {
    if (cache.has(name)) return cache.get(name);
    console.log("Loading hard:", name);
    cache.set(name, name + "_data");
    return cache.get(name);
}
console.log(getAsset("brick"));
console.log(getAsset("brick"));
</script>
```
Output:
`Loading hard: brick`
`brick_data`
`brick_data`
This proves that checking a `Map` before performing an expensive operation prevents duplicate work. This pattern is known as **Caching**.

### Discard the throwaway
The isolated Map test is discarded.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `index.html` (modified)
- **Change type**: add
- **Location**: Before the `Game` class.
- **Dependencies**: Three.js loaders.

### The New Code
```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class AssetManager {
    constructor() {
        this.textures = new Map();
        this.models   = new Map();
        this.texLoader = new THREE.TextureLoader();
        this.gltfLoader = new GLTFLoader();
    }
    async loadTexture(key, url) {
        if (this.textures.has(key)) return this.textures.get(key);
        const tex = await this.texLoader.loadAsync(url);
        this.textures.set(key, tex);
        return tex;
    }
    async loadModel(key, url) {
        if (this.models.has(key)) return this.models.get(key);
        const gltf = await this.gltfLoader.loadAsync(url);
        this.models.set(key, gltf);
        return gltf;
    }
    disposeAll() {
        this.textures.forEach(t => t.dispose());
        this.models.clear();
        this.textures.clear();
    }
}
```

### The Updated Project
```html
// ... previous code
// ← new
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class AssetManager {
    constructor() {
        this.textures = new Map();
        this.models   = new Map();
        this.texLoader = new THREE.TextureLoader();
        this.gltfLoader = new GLTFLoader();
    }
    async loadTexture(key, url) {
        if (this.textures.has(key)) return this.textures.get(key);
        const tex = await this.texLoader.loadAsync(url);
        this.textures.set(key, tex);
        return tex;
    }
    async loadModel(key, url) {
        if (this.models.has(key)) return this.models.get(key);
        const gltf = await this.gltfLoader.loadAsync(url);
        this.models.set(key, gltf);
        return gltf;
    }
    disposeAll() {
        this.textures.forEach(t => t.dispose());
        this.models.clear();
        this.textures.clear();
    }
}

const assets = new AssetManager();
// Now usable within our game startup sequence.
```
The asset manager provides a safe, asynchronous gatekeeper for resources.

### Mechanical walkthrough
- `import { GLTFLoader }` imports the specific Three.js addon for 3D models.
- `class AssetManager` acts as our resource registry.
- `this.textures = new Map()` initializes an O(1) lookup dictionary.
- `async loadTexture(key, url)` defines an asynchronous fetch method.
- `if (this.textures.has(key))` acts as the cache hit-check.
- `return this.textures.get(key)` immediately returns the stored reference.
- `await this.texLoader.loadAsync(url)` pauses execution of this function until the network request completes, yielding to the browser.
- `this.textures.set(key, tex)` commits the result to the cache.
- `disposeAll()` provides a nuclear cleanup option.
- `this.textures.forEach(t => t.dispose())` iterates the map, calling WebGL cleanup on every texture.

### CS lens
Flyweight pattern. By storing a heavy object (a texture) once in a Map and handing out references to it, thousands of meshes can share the same memory footprint instead of allocating redundant copies.

### SE lens
Graceful cleanup. WebGL has limited memory limits. The `disposeAll()` method guarantees that when switching from a menu to a game level, old textures can be evicted predictably, avoiding eventual tab crashes.

### Commands needed
Open `lesson-32.html` in a modern browser.

### Run it
The code defines the manager but does not yet load anything; the canvas remains the same as the previous step.

### One sentence connecting to previous unit
With assets strictly managed, our core architecture is complete.

## Closing

### Connect the pieces
We traced a monolithic script and fractured it into purposeful modules. The `Entity` class provided behavior and data grouping, the `EntityManager` created a robust loop, the `State Machine` granted high-level flow control, and the `AssetManager` protected our memory limits. If you trace the game loop now: `animate()` queries `requestAnimationFrame`, pulls `clock.getDelta()`, and hands control to `Game`. The `Game` checks if state is `PLAYING`, then calls `EntityManager.update()`. The manager loops its inner array safely backwards with a `for` loop, calling `update()` on every `SpinningCube`. The cubes advance their own rotations. Finally, control returns to `animate()`, and `renderer.render()` executes exactly once per frame. This complete pipeline structure is identical in principle to how massive commercial engines operate behind the scenes.
