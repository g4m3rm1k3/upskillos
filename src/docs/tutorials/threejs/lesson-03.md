# Lesson 03: The Animation Loop — requestAnimationFrame, Clock, and Delta Time

What you will build
The reader understands `requestAnimationFrame` (the browser's animation scheduler), `THREE.Clock` for measuring elapsed time, delta-time-based animation (frame-rate-independent movement), and how to pause/resume the loop. The transferable insight: NEVER use a fixed rotation increment like `rotation += 0.01`. Instead use `rotation += speed * delta` where delta is seconds since the last frame. This makes animation frame-rate-independent: it runs at the same perceived speed on 30fps, 60fps, or 144fps hardware, completely separating the physical representation from the logical update step.

What you need to know first
Lesson 02.

**Terms used in this lesson**
- **DOMHighResTimeStamp** — a time value in milliseconds, accurate to 5 microseconds. It exists because `Date.now()` is not precise enough for smooth animation timing.
- **Delta time** — the elapsed time since the previous frame. It exists to scale movement amounts so that an object moves at a constant real-world speed regardless of the fluctuating framerate.
- **Frame-rate-independent** — a design principle where game/animation logic runs at the same perceived speed on any hardware. It exists to prevent animations from speeding up on 144Hz monitors or slowing down on struggling devices.
- **Radians** — a measure of angle based on the radius of a circle, where `Math.PI` is a half-turn. It exists because standard mathematical trigonometry functions and Three.js rotations natively operate on radians, not degrees.

**Objects and methods used**

**requestAnimationFrame**
- *What it is:* A browser API function that schedules a callback to run before the next screen repaint.
- *Implementation:* `function requestAnimationFrame(callback: FrameRequestCallback): number`
- *Its use:* Used to create the main animation loop that syncs with the display's refresh rate.
- *Type:* Global window method.
- *Responsibility:* Tells the browser that you wish to perform an animation and requests that the browser call a specified function to update an animation before the next repaint.
- *Depends on:* A callback function representing the next step of the animation.
- *Connects to:* Called by the user's animation loop, calls the provided callback, returns a numeric ID for cancellation.
- *Shape:* A boundary between the application's JavaScript and the browser's native rendering pipeline.

**cancelAnimationFrame**
- *What it is:* A browser API function that cancels an animation frame request.
- *Implementation:* `function cancelAnimationFrame(handle: number): void`
- *Its use:* Used to stop the animation loop when paused.
- *Type:* Global window method.
- *Responsibility:* Removes the scheduled callback associated with the given ID from the browser's repaint queue so it doesn't fire.
- *Depends on:* The numeric ID returned by a previous `requestAnimationFrame` call.
- *Connects to:* Called by the user's pause logic, communicates with the browser's native scheduling queue.
- *Shape:* A control boundary for stopping the animation loop.

**THREE.Clock**
- *What it is:* A utility class in Three.js for tracking time.
- *Implementation:* `class Clock { constructor(autoStart?: boolean) }`
- *Its use:* Instantiated to measure delta time between frames and total elapsed time for animations.
- *Type:* Class instance.
- *Responsibility:* Maintains an internal state of when it was started and when its time was last checked, safely calculating elapsed intervals.
- *Depends on:* `performance.now()` internally. Optional `autoStart` boolean parameter.
- *Connects to:* Created in setup, polled every frame by the animation loop.
- *Shape:* An internal timing service within the application.

**clock.getDelta**
- *What it is:* A method on the `Clock` instance to get the time since it was last called.
- *Implementation:* `getDelta(): number`
- *Its use:* Returns the exact delta time in seconds to scale our animation speeds.
- *Type:* Instance method.
- *Responsibility:* Calculates the time elapsed since the last `getDelta()` call, updates the 'last time' marker, and returns the difference in seconds.
- *Depends on:* The clock's internal state and the browser's high-resolution timer.
- *Connects to:* Called by the animation loop, returns a float representing seconds.
- *Shape:* An internal state-mutating accessor.

**clock.getElapsedTime**
- *What it is:* A method to get the total time since the clock started.
- *Implementation:* `getElapsedTime(): number`
- *Its use:* Used for absolute time-based animations like orbiting, rather than step-by-step frame deltas.
- *Type:* Instance method.
- *Responsibility:* Returns the total accumulated time in seconds since the clock was explicitly started (or auto-started).
- *Depends on:* The clock's start timestamp.
- *Connects to:* Called by the animation loop, returns a float representing seconds.
- *Shape:* An internal read-only accessor.

**clock.start**
- *What it is:* A method to start or restart the clock.
- *Implementation:* `start(): void`
- *Its use:* Explicitly begins the clock's timekeeping when resuming from a paused state.
- *Type:* Instance method.
- *Responsibility:* Sets the start time and the old time to the current time, and marks the clock as running.
- *Depends on:* Nothing explicitly, relies on system time.
- *Connects to:* Called by user input (play button), mutates clock internal state.
- *Shape:* An internal state mutator.

**clock.stop**
- *What it is:* A method to stop the clock.
- *Implementation:* `stop(): void`
- *Its use:* Freezes the clock so elapsed time doesn't continue ticking while the animation is paused.
- *Type:* Instance method.
- *Responsibility:* Updates the final elapsed time and marks the clock as not running.
- *Depends on:* Nothing.
- *Connects to:* Called by user input (pause button), mutates clock internal state.
- *Shape:* An internal state mutator.

**Everything else in the file, not this lesson's subject but still explained.**

**THREE.Scene**
- *What it is:* The root container for all 3D objects.
- *Implementation:* `class Scene extends Object3D`
- *Its use:* Holds the cube and sphere to be rendered.
- *Type:* Class.
- *Responsibility:* Maintains the scenegraph.
- *Depends on:* Nothing to instantiate.
- *Connects to:* Passed to the renderer.
- *Shape:* Core data structure.

**THREE.PerspectiveCamera**
- *What it is:* A projection camera mimicking the human eye.
- *Implementation:* `class PerspectiveCamera extends Camera`
- *Its use:* Provides the viewpoint for the scene.
- *Type:* Class.
- *Responsibility:* Defines the viewing frustum.
- *Depends on:* FOV, aspect ratio, near, and far planes.
- *Connects to:* Passed to the renderer.
- *Shape:* Viewport boundary.

**THREE.WebGLRenderer**
- *What it is:* The drawing engine.
- *Implementation:* `class WebGLRenderer`
- *Its use:* Renders the scene to the canvas.
- *Type:* Class.
- *Responsibility:* Executes WebGL draw calls.
- *Depends on:* A target canvas element.
- *Connects to:* Takes the scene and camera.
- *Shape:* Output sink.

**THREE.Mesh**
- *What it is:* A rendered 3D object.
- *Implementation:* `class Mesh extends Object3D`
- *Its use:* Represents the visible cube/sphere.
- *Type:* Class.
- *Responsibility:* Pairs geometry with a material.
- *Depends on:* Geometry and Material instances.
- *Connects to:* Added to the Scene.
- *Shape:* Scenegraph leaf node.

**Math.PI**
- *What it is:* A mathematical constant.
- *Implementation:* `const PI: number`
- *Its use:* Used as the base for rotational calculations (half a turn).
- *Type:* Global constant.
- *Responsibility:* Provides the ratio of a circle's circumference to its diameter.
- *Depends on:* Native JS Math object.
- *Connects to:* Used in rotation math.
- *Shape:* Primitive data.

**console.log**
- *What it is:* Debugging output.
- *Implementation:* `log(...data: any[]): void`
- *Its use:* Proving state in throwaway labs.
- *Type:* Global function.
- *Responsibility:* Writes to the browser console.
- *Depends on:* String inputs.
- *Connects to:* Developer tools.
- *Shape:* Diagnostic boundary.

---

## Concept Unit: requestAnimationFrame

### The Problem
If we want to animate a cube, we need a loop that constantly updates its rotation and redraws it to the screen. 
- Why can't we just use a standard `while(true)` loop to redraw the scene?
- If we use `setInterval`, how does it know when the screen is actually ready to draw the next frame?
- What happens to battery life if our loop runs a thousand times a second while the tab is hidden?

### Introduce the concept in isolation
```javascript
// Throwaway HTML/JS
<script>
let frameCount = 0;
let animId;

function loop(timestamp) {
    frameCount++;
    if (frameCount <= 5) {
        console.log(`Frame ${frameCount}: timestamp=${timestamp.toFixed(2)}ms`);
    }
    if (frameCount < 180) {    // run for ~3 seconds at 60fps
        animId = requestAnimationFrame(loop);
    } else {
        console.log('Stopped after 180 frames');
    }
}
animId = requestAnimationFrame(loop);
</script>
```

**Execution trace:**
1. `requestAnimationFrame(loop)` — browser queues `loop` to run before the next paint.
2. `loop` runs, increments `frameCount`, and logs the timestamp.
3. `requestAnimationFrame(loop)` — schedules itself again.
4. Output proves the interval: Frame 1 is ~16.67ms, Frame 2 is ~33.34ms (at 60Hz display rate).

This proves that **requestAnimationFrame** synchronizes directly with the browser's repaint cycle, guaranteeing a smooth execution pace without locking up the main thread.

### Discard the throwaway
This isolated logging loop is discarded and will not be added to the project.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are fundamentally changing how the app runs from a static frame to a continuous loop.
- **Files affected:** `lesson-03.html` (created, based on `lesson-02.html`)
- **Change type:** Wrap the render call in an animation function.
- **Location:** At the bottom of the script.
- **Dependencies:** Three.js CDN setup from Lesson 02.

### The New Code
```javascript
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <head>
4:     <style>body { margin: 0; }</style>
5: </head>
6: <body>
7:     <canvas id="c"></canvas>
8:     <script type="importmap">
9:         {
10:             "imports": {
11:                 "three": "https://unpkg.com/three@0.160.0/build/three.module.js"
12:             }
13:         }
14:     </script>
15:     <script type="module">
16:         import * as THREE from 'three';
17:         const scene = new THREE.Scene();
18:         const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
19:         const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c')});
20:         renderer.setSize(window.innerWidth, window.innerHeight);
21:         camera.position.z = 5;
22: 
23:         const cube = new THREE.Mesh(
24:             new THREE.BoxGeometry(1, 1, 1),
25:             new THREE.MeshBasicMaterial({color: 0x00ff88})
26:         );
27:         scene.add(cube);
28: 
29:         function animate() {                  // ← new
30:             requestAnimationFrame(animate);   // ← new
31:             renderer.render(scene, camera);   // ← new (moved inside)
32:         }                                     // ← new
33:         animate();                            // ← new
34:     </script>
35: </body>
36: </html>
```
The script now continuously calls `animate()`, keeping the renderer active.

### Mechanical walkthrough
- `function animate() {` — Defines a new function named `animate`.
- `requestAnimationFrame(` — Calls the global browser scheduling method.
- `animate` — Passes the `animate` function reference itself as the callback, creating a recursive scheduling loop.
- `)` — Closes the `requestAnimationFrame` call.
- `renderer.render(` — Calls the render method on our WebGL renderer object.
- `scene,` — Passes the global `scene` object containing our cube.
- `camera` — Passes the perspective `camera` object.
- `);` — Closes the render call.
- `}` — Closes the `animate` function body.
- `animate();` — Executes the function for the first time to kickstart the continuous loop.

### CS lens
The concept here is a **Game Loop**. A game loop decoupling rendering from input is central to real-time interactive systems. 
Also recognized in: GUI event loops (like Qt or Win32), PLC runtimes reading sensor states, audio processing buffers, physics engines continuously integrating forces.

### SE lens
**Inversion of Control.** Instead of the application dictating exactly *when* to execute a frame via a strict `sleep()` or `while` loop, the application hands a callback to the host environment (the browser). The tradeoff: the application yields control over exact timing, meaning it must calculate time diffs (deltas) instead of assuming a fixed 16ms step, but it gains massive battery efficiency and tear-free syncing.

### Commands needed
Open `lesson-03.html` in a modern browser.

### Run it
The static green cube appears exactly as it did in Lesson 02, but the tab is now rendering it 60 times a second behind the scenes.
(Confirmed from confidence: a static scene drawn 60 times a second looks identical to a scene drawn once.)

### One sentence connecting to previous unit
Now that we have a loop running every frame, we need a way to measure exactly how much time passes *between* these frames so we can move objects smoothly.

---

## Concept Unit: THREE.Clock

### The Problem
If we update a rotation by `0.01` every frame, a 144Hz monitor will spin the cube more than twice as fast as a 60Hz monitor.
- How can we know how much physical time passed between frame 1 and frame 2?
- Since `Date.now()` only gives integers, how do we handle a frame that took 16.67 milliseconds?

### Introduce the concept in isolation
```javascript
// Throwaway HTML/JS
<script type="module">
import * as THREE from 'three';

const clock = new THREE.Clock();

function measureTime() {
    const delta = clock.getDelta();    
    const elapsed = clock.getElapsedTime();  
    console.log(`delta=${delta.toFixed(4)}s, elapsed=${elapsed.toFixed(4)}s`);
}

measureTime(); 

// Simulate waiting:
const start = performance.now();
while (performance.now() - start < 50) {}  // busy-wait 50ms

measureTime(); 
</script>
```

**Execution trace:**
1. First `getDelta()`: clock starts, returns `delta~0.0001s`.
2. Busy-wait locks the thread for exactly 50ms.
3. Second `getDelta()`: returns `delta~0.0500s`. The clock accurately measured the gap. `getElapsedTime()` reflects the total elapsed time.

This proves that **THREE.Clock** measures fractional seconds between calls. `getDelta()` explicitly resets its internal "last called" timestamp every time it is invoked.

### Discard the throwaway
This throwaway timing script is discarded and will not be added to the project.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are introducing stateful timekeeping to the renderer.
- **Files affected:** `lesson-03.html`
- **Change type:** Add `THREE.Clock` instantiation before the animation loop.
- **Location:** Just before the `animate()` function.
- **Dependencies:** None.

### The New Code
```javascript
const clock = new THREE.Clock();
```

### The Updated Project
```html
23:         const cube = new THREE.Mesh(
24:             new THREE.BoxGeometry(1, 1, 1),
25:             new THREE.MeshBasicMaterial({color: 0x00ff88})
26:         );
27:         scene.add(cube);
28: 
29:         const clock = new THREE.Clock();      // ← new
30: 
31:         function animate() {
32:             requestAnimationFrame(animate);
33:             renderer.render(scene, camera);
34:         }
35:         animate();
```
The application now holds an instantiated clock ready to measure intervals inside the render loop.

### Mechanical walkthrough
- `const clock` — Declares a constant named `clock`.
- `=` — Assigns the following expression to it.
- `new` — Allocates memory for a new object instance.
- `THREE.Clock(` — Calls the constructor for the `Clock` class from the Three.js library.
- `);` — Executes the constructor with no arguments (defaulting `autoStart` to true upon first read).

### CS lens
The concept here is a **Monotonic Timer**. A monotonic timer is a clock that only ever moves forward, unaffected by the user changing the system clock or daylight savings time.
Also recognized in: POSIX `clock_gettime(CLOCK_MONOTONIC)`, game engine physics steppers, distributed tracing timestamps, rate-limiting algorithms (token buckets).

### SE lens
**Stateful Utilities.** The alternative to `THREE.Clock` is manually storing `let lastTime = performance.now()` and calculating `const delta = (performance.now() - lastTime) / 1000` every frame. The tradeoff: `THREE.Clock` encapsulates this state, preventing scope pollution and making the code declarative, at the cost of hiding the underlying math from the developer and forcing them to understand that `getDelta()` has side effects (it mutates the internal `oldTime` state).

### Commands needed
Open `lesson-03.html` in a modern browser.

### Run it
The green cube is still static. The clock is running, but we haven't asked it for time yet.
(Confirmed from confidence: instantiating a clock object does not change the visual output.)

### One sentence connecting to previous unit
Now that we have a clock ready to track time, we can read its delta inside the loop to drive the cube's rotation.

---

## Concept Unit: Delta-time animation

### The Problem
If our framerate fluctuates between 40fps and 60fps, fixed-step rotation will visibly stutter and change speeds.
- If we want the cube to rotate exactly half a turn (`Math.PI`) every second, what should we multiply `Math.PI` by on a frame that took exactly 0.5 seconds?
- What should we multiply it by on a frame that took 0.016 seconds?

### Introduce the concept in isolation
```javascript
// Throwaway HTML/JS
<script type="module">
import * as THREE from 'three';

const ROTATION_SPEED = Math.PI; // rad/sec
let rotationY = 0;

// Simulate a 60fps frame (16.67ms)
let delta = 0.01667; 
rotationY += ROTATION_SPEED * delta;
console.log("At 60fps frame:", rotationY.toFixed(4)); // 0.0524

// Simulate a laggy 30fps frame (33.33ms)
delta = 0.03333; 
rotationY += ROTATION_SPEED * delta;
console.log("At 30fps frame:", rotationY.toFixed(4)); // 0.1047 + previous
</script>
```

**Execution trace:**
1. At 60fps, `delta` is 0.01667. `rotationY += Math.PI * 0.01667` adds 0.0524 radians. Over 60 frames, it sums to `Math.PI`.
2. At 30fps, `delta` is 0.03333. `rotationY += Math.PI * 0.03333` adds 0.1047 radians. Over 30 frames, it sums to `Math.PI`.

This proves that **Delta-time animation** automatically compensates for lag. A slower frame takes a larger chunk of time, resulting in a larger physical movement step, keeping the real-world speed identical.

### Discard the throwaway
This simulated delta math script is discarded and will not be added to the project.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are adding the animation logic itself.
- **Files affected:** `lesson-03.html`
- **Change type:** Add rotation logic inside `animate()`.
- **Location:** Inside `animate()`, before `renderer.render`.
- **Dependencies:** None.

### The New Code
```javascript
const ROTATION_SPEED = Math.PI; 
// inside animate:
const delta = clock.getDelta();
cube.rotation.y += ROTATION_SPEED * delta;
```

### The Updated Project
```html
28: 
29:         const clock = new THREE.Clock();
30:         const ROTATION_SPEED = Math.PI;             // ← new
31: 
32:         function animate() {
33:             requestAnimationFrame(animate);
34:             const delta = clock.getDelta();                 // ← new
35:             cube.rotation.y += ROTATION_SPEED * delta;      // ← new
36:             renderer.render(scene, camera);
37:         }
38:         animate();
```
The animate function now requests the time elapsed since the *last* frame, and applies exactly that much rotation to the cube.

### Mechanical walkthrough
- `const ROTATION_SPEED` — Declares a constant for our speed configuration.
- `=` — Assigns the value.
- `Math.PI;` — Assigns the constant Pi (representing half a turn in radians).
- `const delta` — Declares a local constant inside the animation loop.
- `=` — Assigns the value.
- `clock.getDelta(` — Calls the delta method on our clock instance.
- `);` — Executes the call, which returns seconds and resets the clock's internal timer.
- `cube.rotation.y` — Accesses the Y-axis rotation property on the cube's transform.
- `+=` — Adds the right side to the left side and assigns the result back.
- `ROTATION_SPEED` — Takes our desired speed in radians per second.
- `*` — Multiplies it.
- `delta;` — By the fraction of a second that actually passed, yielding the exact rotation for this specific frame.

### CS lens
The concept here is **Numerical Integration** (specifically Euler integration). We are computing the new position of a system by taking its current position and adding its velocity multiplied by the time step.
Also recognized in: physics engines updating velocities (`v = v + a * dt`), financial models tracking compound interest over irregular periods, PID controllers computing error over time, audio synthesis advancing oscillator phases.

### SE lens
**Separation of Logical Time from Physical Ticks.** The alternative is binding logic to CPU speed, which famously broke older MS-DOS games when run on faster computers (the games became unplayably fast). The tradeoff: delta time requires floating-point math on every mutable property every frame, adding a tiny overhead, but it completely abstracts the hardware's capabilities away from the application's perceived behavior.

### Commands needed
Open `lesson-03.html` in a modern browser.

### Run it
The green cube is now smoothly spinning on its Y axis, completing one half-turn every exactly one second, regardless of the monitor's refresh rate.

### One sentence connecting to previous unit
Now that the cube rotates perfectly across time, we need to handle what happens to that time if the user pauses the application.

---

## Concept Unit: Pausing and resuming the animation loop

### The Problem
If the user opens a menu and we want the game to pause, we can't just let the loop spin.
- How do we tell the browser to *stop* calling our loop?
- When we resume, what happens to `clock.getDelta()` if 5 minutes have passed? (Hint: the cube would jump wildly to catch up with a 300-second delta!)

### Introduce the concept in isolation
```javascript
// Throwaway HTML/JS
<script type="module">
import * as THREE from 'three';

let animId = null;
let isRunning = false;
const clock = new THREE.Clock(false);  

function animate() {
    animId = requestAnimationFrame(animate);
    console.log("Tick");
}

function start() {
    if (!isRunning) {
        isRunning = true;
        clock.start();
        animate();
        console.log('Animation started');
    }
}

function pause() {
    if (isRunning) {
        isRunning = false;
        cancelAnimationFrame(animId);
        animId = null;
        clock.stop();
        console.log('Animation paused at elapsed:', clock.getElapsedTime().toFixed(3) + 's');
    }
}

// simulate clicks
start();
setTimeout(pause, 50);
</script>
```

**Execution trace:**
1. `start()` fires: `isRunning` flips, `clock.start()` initializes time, `animate()` begins the loop.
2. `animate()` logs "Tick" a few times.
3. `pause()` fires (after 50ms): `cancelAnimationFrame(animId)` removes the scheduled next tick.
4. `clock.stop()` freezes the time.
5. "Tick" stops appearing in the console.

This proves that **cancelAnimationFrame** stops the browser loop, and **clock.stop()** cleanly pauses the timekeeping, so that a subsequent `clock.start()` will resume delta measurements from zero rather than dumping a massive delta spike into the physics calculations.

### Discard the throwaway
This pausing simulation is discarded and will not be added to the project.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `lesson-03.html`
- **Change type:** Add HTML buttons and wire them to new `start`/`pause` functions.
- **Location:** Buttons in `<body>`, functions wrapping the clock and loop.
- **Dependencies:** None.

### The New Code
```javascript
let animId = null;
let isRunning = false;
// change Clock initialization to manual start:
// const clock = new THREE.Clock(false);

function start() {
    if (!isRunning) {
        isRunning = true;
        clock.start();
        animate();
    }
}

function pause() {
    if (isRunning) {
        isRunning = false;
        cancelAnimationFrame(animId);
        animId = null;
        clock.stop();
    }
}

document.getElementById('startBtn').addEventListener('click', start);
document.getElementById('pauseBtn').addEventListener('click', pause);
```

### The Updated Project
```html
6: <body>
7:     <div style="position:absolute; top:10px; left:10px;">       <!-- ← new -->
8:         <button id="startBtn">Start</button>                    <!-- ← new -->
9:         <button id="pauseBtn">Pause</button>                    <!-- ← new -->
10:     </div>                                                      <!-- ← new -->
11:     <canvas id="c"></canvas>
12:     <script type="importmap">
<!-- ... -->
28: 
29:         let animId = null;                                      <!-- ← new -->
30:         let isRunning = false;                                  <!-- ← new -->
31:         const clock = new THREE.Clock(false);                   <!-- ← new (replaced old clock) -->
32:         const ROTATION_SPEED = Math.PI;
33: 
34:         function animate() {
35:             animId = requestAnimationFrame(animate);            <!-- ← new (assignment) -->
36:             const delta = clock.getDelta();
37:             cube.rotation.y += ROTATION_SPEED * delta;
38:             renderer.render(scene, camera);
39:         }
40: 
41:         function start() {                                      <!-- ← new -->
42:             if (!isRunning) {                                   <!-- ← new -->
43:                 isRunning = true;                               <!-- ← new -->
44:                 clock.start();                                  <!-- ← new -->
45:                 animate();                                      <!-- ← new -->
46:             }                                                   <!-- ← new -->
47:         }                                                       <!-- ← new -->
48: 
49:         function pause() {                                      <!-- ← new -->
50:             if (isRunning) {                                    <!-- ← new -->
51:                 isRunning = false;                              <!-- ← new -->
52:                 cancelAnimationFrame(animId);                   <!-- ← new -->
53:                 animId = null;                                  <!-- ← new -->
54:                 clock.stop();                                   <!-- ← new -->
55:             }                                                   <!-- ← new -->
56:         }                                                       <!-- ← new -->
57: 
58:         document.getElementById('startBtn').addEventListener('click', start); <!-- ← new -->
59:         document.getElementById('pauseBtn').addEventListener('click', pause); <!-- ← new -->
60:         // animate(); removed
```
The application now waits for the user to press "Start", and allows them to cleanly freeze the execution and timekeeping at will.

### Mechanical walkthrough
- `let animId = null;` — Declares a variable to hold the browser's animation loop ticket, starting empty.
- `const clock = new THREE.Clock(false);` — Passes `false` to prevent the clock from auto-starting on creation.
- `animId = requestAnimationFrame(animate);` — Captures the numeric ticket the browser returns when scheduling the frame.
- `function start() {` — Declares the start function.
- `if (!isRunning) {` — Checks if we are already running to prevent scheduling two overlapping loops.
- `isRunning = true;` — Flips the state flag.
- `clock.start();` — Mutates the clock to capture the exact current timestamp.
- `animate();` — Enters the loop.
- `function pause() {` — Declares the pause function.
- `cancelAnimationFrame(` — Calls the browser API to un-schedule a frame.
- `animId);` — Passes the specific ticket we captured earlier.
- `clock.stop();` — Halts the clock so elapsed time freezes.
- `document.getElementById('startBtn')` — Grabs the HTML button.
- `.addEventListener('click', start);` — Binds our `start` function to its click event.

### CS lens
The concept here is **Idempotence and State Guards**. An operation is idempotent if doing it multiple times has the same effect as doing it once. By wrapping `start()` inside an `if (!isRunning)` check, pressing "Start" 50 times does not spin up 50 overlapping animation loops.
Also recognized in: HTTP PUT methods, database `UPSERT` commands, initialization flags in Singletons, Unix `mkdir -p`.

### SE lens
**Graceful Interruption.** The alternative to `cancelAnimationFrame` and `clock.stop` is letting the loop run but adding an `if (isPaused) return;` inside `animate()`. The tradeoff: checking a boolean inside a running loop wastes CPU cycles and battery for a tab that is fundamentally doing nothing. By explicitly canceling the schedule request, the application fully yields the thread back to the browser.

### Commands needed
Open `lesson-03.html` in a modern browser.

### Run it
The scene loads completely static. Clicking "Start" begins the smooth rotation. Clicking "Pause" freezes the cube instantly. Clicking "Start" again resumes the rotation perfectly smoothly from where it left off, with no sudden speed-up jump.

### One sentence connecting to previous unit
Delta time works perfectly for adding to a rotation, but some animations need to know exactly how long the app has been running in total.

---

## Concept Unit: Using elapsed time for non-rotation animation

### The Problem
If we want a sphere to hover up and down smoothly in a sine wave, delta time is awkward.
- If we use `y += delta`, the sphere flies off into space.
- If we want to calculate `Math.sin(time)`, do we need to manually keep track of the total time ourselves?

### Introduce the concept in isolation
```javascript
// Throwaway HTML/JS
<script type="module">
import * as THREE from 'three';

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime(); 
    
    // Calculate a sine wave hovering effect:
    const y = Math.sin(t * 4) * 0.5;
    
    if (t > 1.0 && t < 1.05) {
        console.log(`At t=1.0s: y=${y.toFixed(3)}`); // -0.378
    }
}
animate();
</script>
```

**Execution trace:**
1. `t` tracks total seconds since start.
2. At `t = 1.0s`, `y = Math.sin(1.0 * 4) * 0.5`.
3. `Math.sin(4)` is roughly `-0.7568`. Multiplied by `0.5`, `y` is `-0.378`.
4. As `t` increases linearly, `Math.sin(t)` naturally oscillates perfectly between `-1` and `1`.

This proves that **clock.getElapsedTime()** is the correct tool for absolute, continuous trigonometric motion. We don't add to the position over time; we recompute the exact position purely as a function of current time.

### Discard the throwaway
This trigonometric logging loop is discarded and will not be added to the project.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `lesson-03.html`
- **Change type:** Add a sphere and animate its position using `getElapsedTime()`.
- **Location:** Geometry setup below the cube, and inside `animate()`.
- **Dependencies:** None.

### The New Code
```javascript
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 32, 16),
    new THREE.MeshBasicMaterial({color: 0xff6600})
);
scene.add(sphere);

// inside animate:
const t = clock.getElapsedTime();
sphere.position.x = Math.sin(t * 2) * 3;
sphere.position.z = Math.cos(t * 2) * 3;
sphere.position.y = Math.sin(t * 4) * 0.5;
```

### The Updated Project
```html
23:         const cube = new THREE.Mesh(
24:             new THREE.BoxGeometry(1, 1, 1),
25:             new THREE.MeshBasicMaterial({color: 0x00ff88})
26:         );
27:         scene.add(cube);
28: 
29:         const sphere = new THREE.Mesh(                              <!-- ← new -->
30:             new THREE.SphereGeometry(0.4, 32, 16),                  <!-- ← new -->
31:             new THREE.MeshBasicMaterial({color: 0xff6600})          <!-- ← new -->
32:         );                                                          <!-- ← new -->
33:         scene.add(sphere);                                          <!-- ← new -->
34: 
35:         let animId = null;
<!-- ... -->
42:         function animate() {
43:             animId = requestAnimationFrame(animate);
44:             const delta = clock.getDelta();
45:             cube.rotation.y += ROTATION_SPEED * delta;
46:             
47:             const t = clock.getElapsedTime();                       <!-- ← new -->
48:             sphere.position.x = Math.sin(t * 2) * 3;                <!-- ← new -->
49:             sphere.position.z = Math.cos(t * 2) * 3;                <!-- ← new -->
50:             sphere.position.y = Math.sin(t * 4) * 0.5;              <!-- ← new -->
51: 
52:             renderer.render(scene, camera);
53:         }
```
The scene now features an orange sphere orbiting the cube, driven entirely by absolute time.

### Mechanical walkthrough
- `const sphere = new THREE.Mesh(` — Instantiates a new rendered object.
- `new THREE.SphereGeometry(0.4, 32, 16),` — Creates a sphere structure with radius `0.4` and segmented resolution.
- `new THREE.MeshBasicMaterial({color: 0xff6600})` — Applies an orange color.
- `);` — Closes the mesh constructor.
- `scene.add(sphere);` — Inserts it into the renderer's scenegraph.
- `const t = clock.getElapsedTime();` — Calls the clock to get the total cumulative running time in seconds.
- `sphere.position.x` — Accesses the horizontal placement property.
- `=` — Assigns a completely new value (replacing, not adding).
- `Math.sin(` — Calls the native sine function.
- `t * 2` — Multiplies the total time by 2, doubling the speed of the oscillation.
- `) * 3;` — Multiplies the output (which is between -1 and 1) by 3, making the orbit 3 units wide.
- `sphere.position.z = Math.cos(t * 2) * 3;` — Uses Cosine on the Z axis. Sine and Cosine together create a perfect circle in the XZ plane.
- `sphere.position.y = Math.sin(t * 4) * 0.5;` — Uses a faster sine wave (`* 4`) to create a shorter (`* 0.5`) vertical bobbing effect.

### CS lens
The concept here is **Parametric Equations**. Instead of updating a state incrementally based on its previous state (`x_new = x_old + step`), the entire state is purely a function of an independent parameter `t` (`x = f(t)`).
Also recognized in: Bezier curve evaluation, shader programming (where pixels have no memory of their past state), functional reactive programming, and data-driven declarative UI rendering.

### SE lens
**Stateless Updates.** The alternative is tracking the sphere's current angle in a variable outside the loop, incrementing it by delta, and manually resetting it when it passes `2 * PI`. The tradeoff: relying on `getElapsedTime()` makes the animation entirely stateless and mathematically pure, meaning if the game stutters or pauses, the sphere's position perfectly maps to reality, but it costs slightly more CPU to compute multiple trigonometric functions per frame.

### Commands needed
Open `lesson-03.html` in a modern browser.

### Run it
Clicking "Start" now spins the cube in the center while an orange sphere orbits around it in a circle (XZ plane) while rapidly bobbing up and down (Y axis). 

### One sentence connecting to previous unit
The animation loop is now capable of both incremental frame-by-frame updates (delta time) and absolute trigonometric movement (elapsed time) side by side.

---

## Closing

### Connect the pieces
Trace one frame of animation, exactly 1 second after "Start" was pressed:
1. The browser's native scheduler hits the repaint moment and invokes `animate()`.
2. `animId = requestAnimationFrame(animate)` immediately secures our ticket for the *next* frame.
3. `clock.getDelta()` returns `0.01667`s (at 60Hz), clearing the fractional gap since the last frame.
4. `cube.rotation.y += Math.PI * 0.01667` adds `0.0524` radians to the spinning cube.
5. `clock.getElapsedTime()` returns exactly `1.0`.
6. The sphere's position recalculates absolutely: `x = sin(2)*3` (`2.727`), `z = cos(2)*3` (`-1.248`), `y = sin(4)*0.5` (`-0.378`).
7. `renderer.render(scene, camera)` issues the final WebGL draw calls, sending the slightly-turned cube and the exactly-positioned sphere to the screen.
8. The frame completes, yielding control back to the browser until the next repaint.
