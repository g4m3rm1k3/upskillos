# Lesson 22: Tweening with GSAP — Smooth Property Animation via CDN

What you will build
In this lesson, you will learn to animate numeric properties smoothly using GSAP (GreenSock Animation Platform) via a CDN script tag. You will build a sequence of animations including simple object tweening, Three.js property animations, timeline sequencing, easing curves, and scroll-driven camera movements. The core transferable problem is decoupling animation state logic from the explicit `requestAnimationFrame` loop, allowing a dedicated animation engine to handle easing and interpolation.

What you need to know first
- Lesson 21

Terms used in this lesson
- **Tween** — Short for in-betweening, the process of generating intermediate frames between two states to give the appearance of smooth motion. This solves the problem of calculating frame-by-frame values manually.
- **GSAP** — The GreenSock Animation Platform, an industry-standard JavaScript animation library. It solves the problem of writing complex easing math and timing sequences by providing a robust, ticker-driven engine.
- **Easing** — The rate of change of a parameter over time (e.g., accelerating, decelerating, bouncing). It solves the problem of animations feeling robotic or linear by applying mathematical curves to the transition.
- **Timeline** — A sequence container for tweens. It solves the problem of chaining multiple animations together, allowing overlap, sequencing, and precise timing without nested callbacks.
- **ScrollTrigger** — A GSAP plugin that links animation progress to scrollbar position. It solves the problem of calculating intersection observer logic and scroll offsets manually for scroll-driven animations.
- **Ticker** — An internal loop that drives the animation engine. It solves the problem of needing to manually integrate animation state into the main `requestAnimationFrame` loop.

Objects and methods used
- **`gsap.to()`**
  - *What it is:* A method that creates a tween from an object's current state to a specified target state.
  - *Implementation:* `gsap.to(target: Object, vars: Object)` where `vars` contains the properties to animate, `duration`, `ease`, etc.
  - *Its use:* Used here to smoothly transition a property over a duration.
  - *Type:* Static method on the global `gsap` object.
  - *Responsibility:* Computes and applies intermediate values to the target object's properties on every tick of GSAP's internal loop.
  - *Depends on:* An object with numeric properties, and a configuration object defining the target values and duration.
  - *Connects to:* Mutates the provided target object properties directly.
  - *Shape:* A public API boundary into the GSAP engine.

- **`gsap.fromTo()`**
  - *What it is:* A method that creates a tween transitioning from a specific starting state to a specific target state.
  - *Implementation:* `gsap.fromTo(target: Object, fromVars: Object, toVars: Object)`
  - *Its use:* Used here to demonstrate easing behavior by forcing a starting position rather than inheriting the current one.
  - *Type:* Static method on the global `gsap` object.
  - *Responsibility:* Instantly sets the target's properties to the `fromVars`, then tweens them to `toVars`.
  - *Depends on:* Target object, explicit start values, and explicit end values.
  - *Connects to:* Mutates the target object properties directly.
  - *Shape:* A public API boundary into the GSAP engine.

- **`gsap.timeline()`**
  - *What it is:* A method that creates a new Timeline instance.
  - *Implementation:* `gsap.timeline({vars})`
  - *Its use:* Used here to sequence multiple tweens so they execute one after another or overlap.
  - *Type:* Factory method on the global `gsap` object.
  - *Responsibility:* Manages a collection of tweens and child timelines, controlling their playhead as a single unit.
  - *Depends on:* Optionally takes configuration variables for defaults.
  - *Connects to:* Returns a Timeline instance that can have `.to()` calls chained onto it.
  - *Shape:* An architectural container for composing complex animation sequences.

- **`gsap.registerPlugin()`**
  - *What it is:* A method to register GSAP plugins like ScrollTrigger.
  - *Implementation:* `gsap.registerPlugin(ScrollTrigger)`
  - *Its use:* Used here to enable scroll-driven animation capabilities within the GSAP core.
  - *Type:* Static method on the global `gsap` object.
  - *Responsibility:* Links external plugin logic into the core GSAP engine, ensuring they are initialized properly.
  - *Depends on:* The plugin object (e.g., `ScrollTrigger`) being loaded in the environment.
  - *Connects to:* Connects the core GSAP engine with the specific plugin functionality.
  - *Shape:* A configuration boundary at the application initialization phase.


## Concept Unit: `gsap.to()` — animate any property to a target value

### The Problem
When building user interfaces or 3D scenes, abruptly changing a property (like position or color) from one state to another feels jarring. While a custom `requestAnimationFrame` loop can calculate a fraction of the distance per frame, building your own robust easing math, timing constraints, and completion callbacks quickly becomes a complex state-management problem. How can we declaratively state "change this value to X over Y seconds" and let the system handle the intermediate frames?

### Introduce the concept in isolation
We will use GSAP to animate a plain JavaScript object. This **tween** computes values over time.

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
</head>
<body>
<script>
    const box = { x: 0, y: 0, rotation: 0 };  // plain object
    gsap.to(box, {
        x: 10,
        duration: 2,    // 2 seconds
        ease: 'power2.inOut',  // acceleration curve
        onUpdate: () => console.log('x:', box.x.toFixed(3)),
        onComplete: () => console.log('Done! x:', box.x),
    });
</script>
</body>
</html>
```
This script proves that GSAP can animate any arbitrary numeric property on a plain JavaScript object. Over 2 seconds, GSAP intercepts its internal ticker and continually updates `box.x` until it exactly reaches 10, executing the `onUpdate` callback on each tick.

### Discard the throwaway
This simple object tween is discarded and will not be used in our project.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are starting our animation module.
- **Files affected:** `lesson-22.html` created.
- **Change type:** Add.
- **Location:** In the `<head>` and `<body>` tags of the new file.
- **Dependencies:** GSAP loaded via CDN.

### The New Code
```html
<!DOCTYPE html>
<html>
<head>
    <title>Lesson 22 - GSAP Animations</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
    <style>
        body { margin: 0; overflow: hidden; background: #222; color: #fff; }
    </style>
</head>
<body>
    <script>
        const state = { value: 0 };
        gsap.to(state, {
            value: 100,
            duration: 1,
            onUpdate: () => {
                // We'll hook this up to a real scene later
            }
        });
    </script>
</body>
</html>
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <head>
4:     <title>Lesson 22 - GSAP Animations</title>
5:     <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script> <!-- new -->
6:     <style>
7:         body { margin: 0; overflow: hidden; background: #222; color: #fff; }
8:     </style>
9: </head>
10: <body>
11:     <script>
12:         const state = { value: 0 }; // ← new
13:         gsap.to(state, {            // ← new
14:             value: 100,             // ← new
15:             duration: 1,            // ← new
16:             onUpdate: () => {}      // ← new
17:         });                         // ← new
18:     </script>
19: </body>
20: </html>
```
The file now loads the GSAP library from a CDN. The global `gsap` object is immediately available to our script. The script creates an object and initializes a tween that modifies it over 1 second.

### Mechanical walkthrough
- **`<script src="...">`** loads the GSAP minified code.
- **`const state = { value: 0 };`** creates a standard JS object.
- **`gsap.to()`** is invoked as a global static method.
- **`state`** is passed as the target.
- **`{ value: 100, duration: 1, onUpdate: () => {} }`** is the configuration object. It tells GSAP to search for a `value` property on the target, tween it to 100 over 1 second, and call `onUpdate` repeatedly.

### CS lens
Interpolation in a continuous time domain mapped to a discrete frame sequence. The GSAP ticker runs at ~60Hz (or higher, depending on monitor refresh rate). It checks the total elapsed time, computes the expected interpolated position based on the `ease` mathematical curve, and overwrites the variable in memory.

### SE lens
Declarative vs Imperative boundaries. You declare the *desired end state* and *duration*. GSAP encapsulates the imperative loops, timing checks, and state mutations required to reach that state. This vastly reduces the surface area for bugs in animation logic.

### Commands needed
Open lesson-22.html in a modern browser.

### Run it
The console logs the target object's values smoothly interpolating up to 100.

### One sentence connecting to previous unit
Because GSAP can animate any property on any JavaScript object, it can directly manipulate Three.js primitives without needing specialized Three.js adapters.


## Concept Unit: Tweening Three.js Vector3 and Color

### The Problem
In Three.js, objects like `Mesh` use `Vector3` for positioning and `Color` for materials. Modifying these within the render loop requires tracking multiple vectors, deltas, and state flags. How do we cleanly apply GSAP's declarative animation to Three.js's specific object structures?

### Introduce the concept in isolation
We demonstrate animating a `Vector3` and a `Color` directly.

```javascript
// Simulated Three.js classes for isolation
class Vector3 { constructor(x,y,z) { this.x = x; this.y = y; this.z = z; } }
class Color { constructor(r,g,b) { this.r = r; this.g = g; this.b = b; } }

const pos = new Vector3(0, 0, 0);
const col = new Color(0, 0, 0);

gsap.to(pos, { x: 4, y: 2, z: -3, duration: 1.5, ease: 'back.out(1.7)' });
gsap.to(col, { r: 1, g: 0.5, b: 0, duration: 1, ease: 'none' });

setTimeout(() => {
    console.log(`pos at 1.5s: ${pos.x}, ${pos.y}, ${pos.z}`);
    console.log(`col at 1.0s: ${col.r}, ${col.g}, ${col.b}`);
}, 1600);
```
Output:
`pos at 1.5s: 4, 2, -3`
`col at 1.0s: 1, 0.5, 0`
This proves that because Three.js uses direct numeric properties (`x`, `y`, `z`, `r`, `g`, `b`), GSAP can mutate them effortlessly.

### Discard the throwaway
These simulated classes are discarded; we will use real Three.js primitives now.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-22.html` modified.
- **Change type:** Add.
- **Location:** Inside the `<script>` tag.
- **Dependencies:** Three.js module.

### The New Code
```html
<script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.160.0/build/three.module.js"
    }
  }
</script>
<script type="module">
    import * as THREE from 'three';
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1,1,1),
        new THREE.MeshStandardMaterial({color:0x44aaff})
    );
    scene.add(mesh);

    const light = new THREE.PointLight(0xffffff, 100);
    light.position.set(10, 10, 10);
    scene.add(light);

    // Fly mesh to a new position smoothly:
    gsap.to(mesh.position, {
        x: 4,
        y: 2,
        z: -3,
        duration: 1.5,
        ease: 'back.out(1.7)'
    });

    // Tween camera position:
    gsap.to(camera.position, {
        z: 3,
        duration: 2,
        ease: 'power3.in',
        onUpdate: () => camera.lookAt(0, 0, 0)
    });

    // Tween material color:
    gsap.to(mesh.material.color, {
        r: 1, g: 0.5, b: 0,
        duration: 1,
        ease: 'none'
    });

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
</script>
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <head>
4:     <title>Lesson 22 - GSAP Animations</title>
5:     <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
6:     <style> body { margin: 0; overflow: hidden; background: #222; } </style>
7:     <script type="importmap"> // ← new
8:       { "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } } // ← new
9:     </script> // ← new
10: </head>
11: <body>
12:     <script type="module"> // ← new
13:         import * as THREE from 'three'; // ← new
14:         // Setup scene, camera, renderer... // ← new
15:         // Add mesh and light... // ← new
16:         gsap.to(mesh.position, { x: 4, y: 2, z: -3, duration: 1.5, ease: 'back.out(1.7)' }); // ← new
17:         gsap.to(camera.position, { z: 3, duration: 2, ease: 'power3.in', onUpdate: () => camera.lookAt(0, 0, 0) }); // ← new
18:         gsap.to(mesh.material.color, { r: 1, g: 0.5, b: 0, duration: 1, ease: 'none' }); // ← new
19:         function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); } // ← new
20:         animate(); // ← new
21:     </script>
22: </body>
23: </html>
```
The project now instantiates a full Three.js scene. GSAP interacts with the Three.js primitives (`mesh.position`, `camera.position`, `mesh.material.color`) to animate their numeric vectors over time. The Three.js `requestAnimationFrame` loop strictly handles *rendering* the scene, while GSAP's invisible background ticker mutates the values.

### Mechanical walkthrough
- **`gsap.to(mesh.position, ...)`** targets the `Vector3` representing the mesh's position.
- **`ease: 'back.out(1.7)'`** applies a specific mathematical easing curve that overshoots the target and bounces back.
- **`gsap.to(camera.position, ...)`** targets the camera's `Vector3`.
- **`onUpdate: () => camera.lookAt(0, 0, 0)`** ensures that every time GSAP ticks and mutates `camera.position`, the camera is forced to orient itself back at the origin.
- **`gsap.to(mesh.material.color, ...)`** targets the `Color` object. Three.js colors expose `r`, `g`, and `b` properties as floats from 0.0 to 1.0, which GSAP seamlessly manipulates.

### CS lens
Separation of concerns in game loops. The render thread (Three.js `animate`) simply reads memory and pushes draw calls to the GPU. The simulation/logic thread (GSAP's internal ticker) handles interpolation math and overwrites that memory.

### SE lens
Using established abstraction layers. We could have written custom delta-time calculations for vector lerping, but `gsap.to()` collapses hundreds of lines of tedious, error-prone math into a single readable dictionary.

### Commands needed
Open lesson-22.html in a modern browser.

### Run it
The mesh flies outward with an elastic bounce, the camera zooms in smoothly while staying focused on the origin, and the mesh color transitions to orange.

### One sentence connecting to previous unit
While firing independent `gsap.to()` calls works for simple scenes, complex choreography requires sequencing them together with a **Timeline**.


## Concept Unit: Timeline — sequencing multiple tweens

### The Problem
When you have multiple animations (e.g., a mesh jumps, then spins, then falls), trying to chain them together using `delay` properties or nested `onComplete` callbacks creates spaghetti code. How do we cleanly sequence animations to execute one after the other, or overlap slightly, using a unified controller?

### Introduce the concept in isolation
We will use `gsap.timeline()` to sequence animations on a basic object.

```javascript
const obj = { value: 0 };
const tl = gsap.timeline();

tl.to(obj, { value: 10, duration: 0.5 })
  .to(obj, { value: 20, duration: 1 })
  .to(obj, { value: 30, duration: 0.5 }, '-=0.3');

setTimeout(() => {
    console.log('Timeline duration:', tl.totalDuration());
}, 100);
```
Output:
`Timeline duration: 1.7`
This proves that the timeline sequences tweens natively. The first takes 0.5s. The second takes 1.0s. The third takes 0.5s, but the `-=0.3` overlap parameter pulls it back so it starts 0.3s *before* the second one finishes. Total: 0.5 + 1.0 + (0.5 - 0.3) = 1.7s.

### Discard the throwaway
The simple timeline sequence is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-22.html` modified.
- **Change type:** Replace.
- **Location:** Inside the `<script type="module">` tag, replacing the individual `gsap.to` calls.
- **Dependencies:** None.

### The New Code
```javascript
// Remove previous individual gsap.to() calls and replace with:
const tl = gsap.timeline();

// Tweens run in sequence by default:
tl.to(mesh.position, { y: 3, duration: 0.5, ease: 'bounce.out' })
  .to(mesh.rotation, { y: Math.PI * 2, duration: 1, ease: 'power1.inOut' })
  .to(mesh.position, { y: 0, duration: 0.5, ease: 'power2.in' })
  .to(mesh.material.color, { r: 0, g: 1, b: 0, duration: 0.3 }, '-=0.3');

tl.addLabel('landing', 1.0);
console.log('Playing from label: landing');
tl.play('landing');
```

### The Updated Project
```html
12:     <script type="module">
13:         import * as THREE from 'three';
14:         // Setup scene, camera, renderer, mesh, light...
15:         
16:         const tl = gsap.timeline(); // ← new
17:         tl.to(mesh.position, { y: 3, duration: 0.5, ease: 'bounce.out' }) // ← new
18:           .to(mesh.rotation, { y: Math.PI * 2, duration: 1, ease: 'power1.inOut' }) // ← new
19:           .to(mesh.position, { y: 0, duration: 0.5, ease: 'power2.in' }) // ← new
20:           .to(mesh.material.color, { r: 0, g: 1, b: 0, duration: 0.3 }, '-=0.3'); // ← new
21:           
22:         function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); }
23:         animate();
24:     </script>
```
The disjointed tweens have been replaced with a single `Timeline` object. The methods chain directly onto each other, creating a choreography where the mesh leaps, spins, falls, and turns green as it lands.

### Mechanical walkthrough
- **`const tl = gsap.timeline();`** invokes the factory method to create a new timeline instance.
- **`tl.to(...)`** appends a tween to the timeline's sequence. Because it returns the timeline itself, it can be chained.
- **`.to(mesh.rotation, { y: Math.PI * 2 ... })`** executes immediately *after* the previous 0.5s tween finishes.
- **`'-=0.3'`** is the position parameter. It tells the timeline to schedule this tween exactly 0.3 seconds before the end of the timeline's current duration, creating overlap.
- **`tl.addLabel('landing', 1.0)`** assigns a string name to a specific timestamp in the timeline.
- **`tl.play('landing')`** forces the timeline to jump to that timestamp and play forward.

### CS lens
Relative scheduling vs Absolute scheduling. Instead of forcing the programmer to compute `startTime = t0 + duration1 + duration2` for every animation, the Timeline acts as a relative sequencer, calculating absolute global time offsets automatically.

### SE lens
Fluent APIs. The Timeline design pattern utilizes method chaining (`a().b().c()`). This pattern keeps complex sequential configurations highly readable, mapping directly to how a human describes choreography.

### Commands needed
Open lesson-22.html in a modern browser.

### Run it
The mesh executes a flawless jumping sequence, proving that the timeline handles sequential state correctly over multiple seconds.

### One sentence connecting to previous unit
While timelines give us control over *when* things happen, mastering GSAP requires understanding *how* they happen through Easing functions.


## Concept Unit: Easing reference — power, bounce, elastic, back

### The Problem
A linear animation (`ease: "none"`) moves at a constant velocity, which feels rigid and artificial. Physical objects accelerate and decelerate. How do we impart realistic weight, springiness, or momentum into our programmed animations without writing complex polynomial mathematics?

### Introduce the concept in isolation
We explore GSAP's named easing functions using `gsap.fromTo`.

```javascript
const obj = { x: 0 };
gsap.fromTo(obj, { x: -5 }, { x: 5, duration: 2, ease: 'bounce.out' });
// Output trace: at 90% duration, x briefly exceeds 5, then settles backwards.
```
This demonstrates the **Easing** concept. By just changing a string from `none` to `bounce.out`, GSAP applies entirely different interpolation logic under the hood.

### Discard the throwaway
We will discard this and apply it to our 3D mesh.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-22.html` modified.
- **Change type:** Add.
- **Location:** After the timeline code.
- **Dependencies:** None.

### The New Code
```javascript
// Demonstrate: tween an object and observe different feels:
function testEase(ease) {
    gsap.fromTo(mesh.position, 
        {x: -5}, 
        {x: 5, duration: 2, ease: ease, repeat: -1, yoyo: true}
    );
}
testEase('elastic.out(1,0.3)');  // try 'bounce.out', 'back.out(1.7)', etc.
```

### The Updated Project
```html
16:         const tl = gsap.timeline();
17:         // ... (timeline code) ...
22: 
23:         function testEase(ease) { // ← new
24:             gsap.fromTo(mesh.position, // ← new
25:                 {x: -5}, // ← new
26:                 {x: 5, duration: 2, ease: ease, repeat: -1, yoyo: true} // ← new
27:             ); // ← new
28:         } // ← new
29:         testEase('elastic.out(1,0.3)'); // ← new
30: 
31:         function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); }
```
We define a reusable function that continually sweeps the mesh back and forth across the screen. By passing in an easing string like `'elastic.out(1,0.3)'`, we instantly fundamentally change the motion characteristics. 

### Mechanical walkthrough
- **`function testEase(ease)`** wraps the execution so we can hot-swap strings.
- **`gsap.fromTo(...)`** is a new method that forces an explicit starting state (`{x: -5}`) and an explicit end state (`{x: 5}`).
- **`ease: ease`** injects our string (e.g. `'elastic.out(1,0.3)'`). The `1` dictates the amplitude, and `0.3` dictates the frequency of the elastic snap.
- **`repeat: -1`** tells the tween to loop infinitely.
- **`yoyo: true`** tells the tween to alternate direction on every loop (like a pendulum) rather than snapping back to the start.

### CS lens
Bezier curves and parametric functions. Easing algorithms map a normalized time variable `t` (from 0.0 to 1.0) to a progress variable `p`. A linear ease is `p = t`. An ease-in quadratic is `p = t^2`. Elastic and bounce eases utilize sine waves and conditional damping.

### SE lens
Magic strings vs Configuration objects. GSAP parses strings like `'elastic.out(1,0.3)'` internally to generate its mathematical functions. This keeps the configuration JSON-serializable and extremely concise.

### Commands needed
Open lesson-22.html in a modern browser.

### Run it
The cube sweeps back and forth. When reaching the edges, it visibly wobbles and snaps, proving the elastic easing math is working perfectly over the 3D position vector.

### One sentence connecting to previous unit
Timelines and Eases run based on ticking clocks; our final integration links that progress directly to a user's mouse scroll wheel.


## Concept Unit: GSAP ScrollTrigger for scroll-driven 3D animations

### The Problem
Traditional animations run on a timer. But modern web experiences often want 3D models or cameras to move *as the user scrolls down the page*, tying animation progress 1:1 with the scrollbar. Capturing scroll events, calculating offsets, and interpolating 3D data manually causes heavy stuttering. How do we drive our GSAP animations natively with a scrollbar?

### Introduce the concept in isolation
We will register **ScrollTrigger** and create a dummy tween that tracks the scrollbar.

```javascript
// Register the plugin:
gsap.registerPlugin(ScrollTrigger);

const dummy = { progress: 0 };
gsap.to(dummy, {
    progress: 100,
    scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true
    }
});
```
This isolates the plugin binding. The `scrollTrigger` configuration intercepts the tween's timeline. Instead of playing automatically based on a clock, the tween's progress is directly clamped to the scroll position of the `body`. `scrub: true` smoothly links the interpolation.

### Discard the throwaway
The dummy object tween is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-22.html` modified.
- **Change type:** Add.
- **Location:** In the `<head>` (for the CDN) and inside the `<script type="module">` (for the logic). Also, add height to the body so scrolling is possible.
- **Dependencies:** ScrollTrigger CDN script.

### The New Code
```html
<!-- Add in Head: -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>

<!-- Add in module script: -->
// Register the plugin:
gsap.registerPlugin(ScrollTrigger);
// Animate camera as user scrolls:
gsap.to(camera.position, {
    z: 2,  // zoom in
    y: 5,  // rise up
    duration: 1,
    ease: 'none',  // linear for scroll-driven
    scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,  // animation tracks scroll position 1:1
    },
    onUpdate: () => camera.lookAt(0, 0, 0),
});
console.log('ScrollTrigger: scroll page to move camera');
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <head>
4:     <title>Lesson 22 - GSAP Animations</title>
5:     <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
6:     <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script> <!-- new -->
7:     <style> body { margin: 0; background: #222; height: 3000px; } canvas { position: fixed; top: 0; left: 0; } </style> <!-- modified -->
8:     <script type="importmap"> { "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } } </script>
9: </head>
10: <body>
11:     <script type="module">
12:         import * as THREE from 'three';
13:         // Setup scene, camera, renderer...
14:         
15:         gsap.registerPlugin(ScrollTrigger); // ← new
16:         
17:         gsap.to(camera.position, { // ← new
18:             z: 2, y: 5, duration: 1, ease: 'none', // ← new
19:             scrollTrigger: { // ← new
20:                 trigger: document.body, // ← new
21:                 start: 'top top', // ← new
22:                 end: 'bottom bottom', // ← new
23:                 scrub: true, // ← new
24:             }, // ← new
25:             onUpdate: () => camera.lookAt(0, 0, 0), // ← new
26:         }); // ← new
27: 
28:         function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); }
29:         animate();
30:     </script>
31: </body>
32: </html>
```
The page now has a height of `3000px` to enable scrolling, and the `canvas` is `fixed` to the viewport. As the user scrolls down the massive body, GSAP intercepts the scroll event, maps the percentage scrolled to the tween's `duration`, and updates the camera's `Vector3` dynamically. The `onUpdate` ensures the camera always points at the center.

### Mechanical walkthrough
- **`<script src=".../ScrollTrigger.min.js">`** loads the plugin globally.
- **`gsap.registerPlugin(ScrollTrigger)`** executes to register the loaded code with the GSAP core.
- **`scrollTrigger: { ... }`** is a configuration block passed natively inside `gsap.to()`.
- **`trigger: document.body`** declares the DOM element that dictates scroll boundaries.
- **`start: 'top top'`** means the animation begins when the top of the trigger hits the top of the viewport.
- **`end: 'bottom bottom'`** means the animation ends when the bottom of the trigger hits the bottom of the viewport.
- **`scrub: true`** ties the playhead explicitly to the scroll position, pausing when scrolling stops and reversing when scrolling up.
- **`ease: 'none'`** prevents GSAP from artificially warping the scroll input.

### CS lens
Event throttling vs Polling. Browsers emit hundreds of scroll events per second, which can overwhelm main-thread execution. ScrollTrigger optimizes this by intercepting the rendering pipeline, mapping values during `requestAnimationFrame` ticks rather than aggressively calculating layouts in a generic DOM event listener.

### SE lens
Plugin Architecture. Core libraries often stay lean to keep bundle sizes small. By separating advanced intersecting logic into the `ScrollTrigger` plugin, GSAP ensures developers only pay the byte-size penalty for scroll logic if their specific project requires it.

### Commands needed
Open lesson-22.html in a modern browser.

### Run it
Scroll down the page. The camera slowly arcs up and forward, continually gazing at the origin, perfectly synced with the scroll wheel's rotation.

### One sentence connecting to previous unit
Now that you have bound high-performance logic directly to input streams, you are ready to construct interactive UI layers over your Three.js canvas.


## Closing
In this lesson, we established a declarative animation system. Through `gsap.to()`, you proved you can tween primitive object properties safely over time. By targeting `mesh.position` and `material.color`, you saw that Three.js natively supports external interpolation since it exposes numeric `Vector3` and `Color` parameters. You implemented a `Timeline` to handle sequence complexities, applied advanced polynomial mathematical easing using magic strings like `elastic.out`, and ultimately usurped the clock entirely using the `ScrollTrigger` plugin to bind spatial 3D state to physical scroll interactions. Tracing `gsap.to(mesh.position, {y:3, duration:0.5, ease:'bounce.out'})`, at t=0.4s traced through GSAP's bounce easing, `mesh.position.y` is mathematically computed and cleanly updated in memory, leaving the Three.js render loop to simply draw the updated position flawlessly frame after frame.

### Connect the pieces
Next lesson, we will begin managing the Raycaster to handle direct object clicks.
