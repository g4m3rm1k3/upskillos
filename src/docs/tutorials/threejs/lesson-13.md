# Lesson 13: Camera Animation — Dolly, Pan, and CatmullRomCurve3

What you will build
In this lesson, you will build cinematic camera movement by animating the camera along smooth curves. The transferable insight here is that cinematic movement is achieved by animating `camera.position` and `camera.lookAt()` along smooth paths over time. `THREE.CatmullRomCurve3` creates a smooth path through a set of control points, and `curve.getPoint(t)` returns a position at parameter `t` in [0, 1]. Combined with `clock.getElapsedTime()`, you can create time-based travel.

What you need to know first
Nothing from prior modules, though familiarity with basic Three.js setup is assumed.

Terms used in this lesson
- **Dolly** — Moving the camera closer to or further from the subject along the Z axis, changing the viewer's physical distance.
- **Pan** — Moving the camera horizontally along the X axis to scan across a scene.
- **Linear interpolation (lerp)** — A mathematical function that finds a value between two other values based on a percentage (0 to 1). In animation, it creates smooth transitions by gradually moving a value toward a target.
- **Catmull-Rom spline** — A type of mathematical curve that smoothly passes *through* all of its control points, making it ideal for camera paths where exact waypoints are needed, unlike Bezier curves which only approximate their control points.
- **Arc length** — The actual physical distance along a curve, which may not scale linearly with the parameter `t` used to sample it.
- **Easing function** — A mathematical formula applied to time (`t`) to make movement accelerate and decelerate naturally, rather than moving at a constant, robotic speed.

Objects and methods used
- **`THREE.PerspectiveCamera`**
  - *What it is:* A camera projection mode designed to mimic the way the human eye sees.
  - *Implementation:* `class PerspectiveCamera extends Camera`
  - *Its use:* Used as the viewing frustum for the 3D scene.
  - *Type:* Class
  - *Responsibility:* Maintains the field of view, aspect ratio, near, and far clipping planes.
  - *Depends on:* Field of view (fov), aspect ratio, near, and far parameters.
  - *Connects to:* Rendered by `WebGLRenderer`, added to `Scene`.
  - *Shape:* A core scene graph node defining the viewpoint.
- **`THREE.Vector3`**
  - *What it is:* A class representing a 3D vector.
  - *Implementation:* `class Vector3`
  - *Its use:* Used to define positions, directions, and targets in 3D space.
  - *Type:* Class
  - *Responsibility:* Holds x, y, and z coordinates and provides vector math operations.
  - *Depends on:* Number values for x, y, and z.
  - *Connects to:* Used extensively by geometry, cameras, and objects.
  - *Shape:* A fundamental data type in Three.js.
- **`THREE.Vector3.lerp(v, alpha)`**
  - *What it is:* A method that linearly interpolates this vector towards another vector.
  - *Implementation:* `lerp(v: Vector3, alpha: Float): this`
  - *Its use:* Animating a vector smoothly from its current state toward a target.
  - *Type:* Instance method
  - *Responsibility:* Modifies the calling vector to be a percentage (`alpha`) closer to vector `v`.
  - *Depends on:* A target vector `v` and a blending factor `alpha`.
  - *Connects to:* Mutates the current `Vector3`.
  - *Shape:* A mutating math utility method.
- **`THREE.CatmullRomCurve3`**
  - *What it is:* A 3D spline curve created from an array of Vector3 points.
  - *Implementation:* `class CatmullRomCurve3 extends Curve`
  - *Its use:* Defining a smooth path for the camera or objects to follow.
  - *Type:* Class
  - *Responsibility:* Calculates intermediate points between provided control points to form a smooth continuous curve.
  - *Depends on:* An array of `Vector3` points.
  - *Connects to:* Sampled via `getPoint` or `getPoints`.
  - *Shape:* A geometry path definition.
- **`THREE.CatmullRomCurve3.getPoint(t, optionalTarget)`**
  - *What it is:* A method that returns a vector for a given position along the curve.
  - *Implementation:* `getPoint(t: Float, optionalTarget?: Vector3): Vector3`
  - *Its use:* Finding exactly where the camera should be at time `t`.
  - *Type:* Instance method
  - *Responsibility:* Evaluates the curve equation at parameter `t` (from 0.0 to 1.0).
  - *Depends on:* A parameter `t` between 0 and 1.
  - *Connects to:* Returns a `Vector3` position.
  - *Shape:* Curve evaluation API.
- **`THREE.Clock`**
  - *What it is:* An object for keeping track of time.
  - *Implementation:* `class Clock`
  - *Its use:* Managing animation timing independent of frame rate.
  - *Type:* Class
  - *Responsibility:* Measures elapsed time and delta time between frames.
  - *Depends on:* The system's performance timer.
  - *Connects to:* Typically polled in the animation loop using `getElapsedTime()`.
  - *Shape:* A utility timing object.

## Concept Unit: Simple dolly and pan with lerp

### The Problem
How do we move the camera smoothly from one position to another without it snapping instantly or moving mechanically?

Can you imagine what happens if we just add a fixed amount to the camera's position every frame until it reaches the target? It moves at a constant speed and stops abruptly. How could we make it slow down as it approaches the destination?

### Introduce the concept in isolation
Let's see how `lerp` (linear interpolation) achieves a smooth approach.

```javascript
import * as THREE from 'three';
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 8);

// Dolly: move camera along Z axis (in/out)
const dollyTarget = new THREE.Vector3(0, 2, 3);  // dolly in
function dollyUpdate(delta) {
    camera.position.lerp(dollyTarget, 3 * delta);  // 3 units/s approach speed
}

// Pan: move camera along X axis (left/right)
const panTarget = new THREE.Vector3(4, 2, 8);    // pan right
function panUpdate(delta) {
    camera.position.lerp(panTarget, 2 * delta);
    camera.lookAt(panTarget.x, 0, 0);  // look at panned-to area
}
console.log('Initial camera Z:', camera.position.z);  // 8
// After dolly converges: camera.position.z approaches 3
// lerp convergence: position += (target-position) * speed * delta
```

This output proves that `lerp` implements an exponential decay approach. Each frame, it covers a percentage of the *remaining* distance. As the distance gets smaller, the step size gets smaller, naturally creating a smooth deceleration.

### Discard the throwaway
This isolated `lerp` example is deleted and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are starting the camera animation module.
- **Files affected**: `lesson-13.html` (created)
- **Change type**: Add
- **Location**: N/A (new file)
- **Dependencies**: Three.js imported via CDN.

### The New Code
```javascript
// Placeholder for the start of the camera animation setup
const target = new THREE.Vector3(0, 2, 3);
camera.position.lerp(target, 0.1);
```

### The Updated Project
```javascript
1: function render() {
2:     requestAnimationFrame(render);
3:     const target = new THREE.Vector3(0, 2, 3); // ← new
4:     camera.position.lerp(target, 0.1); // ← new
5:     renderer.render(scene, camera);
6: }
```
The render loop now smoothly moves the camera toward the target position every frame.

### Mechanical walkthrough
1. `requestAnimationFrame(render);`: Queues the next frame.
2. `const target = new THREE.Vector3(0, 2, 3);`: Defines the destination coordinate.
3. `camera.position.lerp(target, 0.1);`: Modifies `camera.position` by moving it 10% of the remaining distance toward `target`.
4. `renderer.render(scene, camera);`: Draws the scene from the new camera position.

### CS lens
Linear interpolation (lerp) over time with a constant alpha factor is mathematically equivalent to exponential decay. The formula `current = current + (target - current) * alpha` means the step size scales with the error (the distance). This is a foundational concept in control theory (a simple P-controller) ensuring smooth convergence without overshooting.

### SE lens
Using `lerp` with a constant factor tied to frame delta is a cheap, robust way to add "juice" (smoothness) to UI and camera movements without managing complex animation state machines or pre-calculating paths. It is fire-and-forget.

### Commands needed
Open lesson-13.html in a modern browser.

### Run it
Running this shows the camera gliding smoothly toward the target and gently coming to a halt.

### One sentence connecting to previous unit
While `lerp` is great for simple point-A-to-point-B movement, complex cinematic shots require traveling along a defined path.

## Concept Unit: CatmullRomCurve3 — smooth path through control points

### The Problem
How do we define a complex, curving path for the camera to fly along, ensuring it hits specific waypoints without jagged corners?

### Introduce the concept in isolation
Let's see how `CatmullRomCurve3` generates a smooth path.

```javascript
import * as THREE from 'three';
// CatmullRomCurve3: smooth curve through a set of Vector3 control points
// Catmull-Rom spline: passes THROUGH all control points (unlike Bezier)
const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5, 2, 8),
    new THREE.Vector3(-3, 4, 5),
    new THREE.Vector3( 0, 3, 3),
    new THREE.Vector3( 3, 5, 5),
    new THREE.Vector3( 5, 2, 8),
], false,  // closed: false (open curve)
'catmullrom',  // type
0.5           // tension (0.5 = standard Catmull-Rom)
);

// Sample 50 points along the curve:
const points = curve.getPoints(50);
console.log('First point:', points[0]);    // Vector3(-5, 2, 8)
console.log('Mid point:', points[25]);     // approximately (0, 3, 3)
console.log('Last point:', points[50]);   // Vector3(5, 2, 8)

// getPoint(t): t in [0,1] -> position on curve
const midPos = curve.getPoint(0.5);
console.log('getPoint(0.5):', midPos);    // near (0, 3, 3)

// Curve length (approx):
console.log('Curve length:', curve.getLength().toFixed(2));
```

This output proves that `CatmullRomCurve3` creates a continuous path that accurately intersects the specified `Vector3` waypoints.

### Discard the throwaway
This isolated curve example is deleted and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-13.html`
- **Change type**: Add
- **Location**: Before the animation loop.
- **Dependencies**: Three.js

### The New Code
```javascript
const camCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5, 2, 8),
    new THREE.Vector3(-2, 3, 4),
    new THREE.Vector3( 0, 2, 2),
    new THREE.Vector3( 3, 4, 5),
    new THREE.Vector3( 5, 2, 8),
], true);
```

### The Updated Project
```javascript
1: // Scene setup omitted...
2: const camCurve = new THREE.CatmullRomCurve3([ // ← new
3:     new THREE.Vector3(-5, 2, 8), // ← new
4:     new THREE.Vector3(-2, 3, 4), // ← new
5:     new THREE.Vector3( 0, 2, 2), // ← new
6:     new THREE.Vector3( 3, 4, 5), // ← new
7:     new THREE.Vector3( 5, 2, 8), // ← new
8: ], true); // ← new
9: const clock = new THREE.Clock();
```
We have defined a looping path for our camera.

### Mechanical walkthrough
1. `const camCurve = new THREE.CatmullRomCurve3`: Instantiates a new Catmull-Rom spline curve.
2. `[...]`: Provides an array of `Vector3` coordinates that the curve must pass through.
3. `true`: Sets the curve to be closed, meaning it loops smoothly from the last point back to the first.

### CS lens
Splines are piecewise polynomial functions. A Catmull-Rom spline ensures $C^1$ continuity (the curve and its first derivative are continuous), meaning there are no sharp corners. Its defining mathematical feature is that it interpolates (passes exactly through) its control points, unlike B-splines or Bezier curves which only approximate them.

### SE lens
Defining paths via control points separates the *data* of the path from the *logic* of traversing it. You can tweak the path without changing the animation code, enabling designers to adjust camera tracks independently of the engine logic.

### Commands needed
Open lesson-13.html in a modern browser.

### Run it
The code defines a curve in memory; nothing changes visually yet.

### One sentence connecting to previous unit
With a defined curve, we now need a way to animate the camera along its length over time.

## Concept Unit: Camera flying along a curve path

### The Problem
How do we tie the camera's position to the curve over time, and importantly, how do we make the camera look where it's going?

### Introduce the concept in isolation
Let's see how `getPoint` combined with time moves the camera.

```javascript
import * as THREE from 'three';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
scene.add(new THREE.AmbientLight(0x404040)); scene.add(new THREE.DirectionalLight(0xffffff,1));
// Add some scene objects to fly past:
for (let i = 0; i < 5; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5),
        new THREE.MeshStandardMaterial({color: Math.random()*0xffffff}));
    mesh.position.set((Math.random()-0.5)*8, 0, (Math.random()-0.5)*8);
    scene.add(mesh);
}
const camCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5, 2, 8),
    new THREE.Vector3(-2, 3, 4),
    new THREE.Vector3( 0, 2, 2),
    new THREE.Vector3( 3, 4, 5),
    new THREE.Vector3( 5, 2, 8),
], true);  // closed=true: loops back
const clock = new THREE.Clock();
const TRAVEL_SPEED = 0.05;  // loops per second
const lookAhead = new THREE.Vector3();
function animate() {
    requestAnimationFrame(animate);
    const t = (clock.getElapsedTime() * TRAVEL_SPEED) % 1;  // 0..1 looping
    camera.position.copy(camCurve.getPoint(t));
    // Look ahead: sample slightly ahead on the curve to get forward direction
    const tAhead = (t + 0.01) % 1;
    camCurve.getPoint(tAhead, lookAhead);
    camera.lookAt(lookAhead);
    renderer.render(scene, camera);
}
animate();
```

This code proves that sampling the curve slightly ahead (`t + 0.01`) provides a reliable target vector for `camera.lookAt()`, keeping the camera oriented forward along the path.

### Discard the throwaway
This full flying example is deleted.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-13.html`
- **Change type**: Add
- **Location**: Inside the animation loop.
- **Dependencies**: The `camCurve` and `clock` defined in the previous unit.

### The New Code
```javascript
const t = (clock.getElapsedTime() * 0.05) % 1;
camera.position.copy(camCurve.getPoint(t));
const tAhead = (t + 0.01) % 1;
camCurve.getPoint(tAhead, lookAhead);
camera.lookAt(lookAhead);
```

### The Updated Project
```javascript
1: const lookAhead = new THREE.Vector3();
2: function render() {
3:     requestAnimationFrame(render);
4:     const t = (clock.getElapsedTime() * 0.05) % 1; // ← new
5:     camera.position.copy(camCurve.getPoint(t)); // ← new
6:     const tAhead = (t + 0.01) % 1; // ← new
7:     camCurve.getPoint(tAhead, lookAhead); // ← new
8:     camera.lookAt(lookAhead); // ← new
9:     renderer.render(scene, camera);
10: }
```
The animation loop now calculates a normalized time `t`, moves the camera to that point on the curve, and points the camera slightly ahead.

### Mechanical walkthrough
1. `const t = (clock.getElapsedTime() * 0.05) % 1;`: Calculates elapsed time, scales it by speed, and uses modulo `1` to keep `t` strictly between 0 and 1, creating a loop.
2. `camera.position.copy(camCurve.getPoint(t));`: Gets the position at `t` and copies it into the camera's position vector.
3. `const tAhead = (t + 0.01) % 1;`: Calculates a parameter slightly further along the curve, wrapping around to 0 if it exceeds 1.
4. `camCurve.getPoint(tAhead, lookAhead);`: Evaluates the curve at `tAhead` and stores the result in the `lookAhead` vector (avoiding object allocation).
5. `camera.lookAt(lookAhead);`: Rotates the camera to face the `lookAhead` point.

### CS lens
Using `modulo 1` on a continuously growing timer is the standard way to map unbounded domain (time) into the bounded parameter space `[0, 1]` required by curve evaluation functions, naturally creating infinite cyclic animations.

### SE lens
Passing `lookAhead` into `getPoint` as a target object (`camCurve.getPoint(tAhead, lookAhead)`) is a crucial performance optimization in JavaScript graphics programming. It prevents the allocation of a new `Vector3` object every frame, avoiding garbage collection stutters.

### Commands needed
Open lesson-13.html in a modern browser.

### Run it
The camera now flies along the looping spline, looking gracefully forward.

### One sentence connecting to previous unit
Our camera travels smoothly along the path, but the linear time mapping means it moves at an unvarying, robotic speed.

## Concept Unit: Easing functions for non-linear camera movement

### The Problem
Linear movement looks mechanical. Real cameras accelerate smoothly from a stop and decelerate before stopping. How do we map linear time to eased time?

### Introduce the concept in isolation
Let's see how an easing function distorts linear input.

```javascript
// Linear t: constant speed feels mechanical
// Eased t: accelerate and decelerate like a real camera

function easeInOutCubic(t) {
    return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
}

// Apply to curve travel:
// const rawT = clock.getElapsedTime() * 0.1 % 1;
// const easedT = easeInOutCubic(rawT);
// const pos = curve.getPoint(easedT);

// Demonstration:
for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0]) {
    console.log(`t=${t}: linear=${t.toFixed(2)}, eased=${easeInOutCubic(t).toFixed(4)}`);
}
// t=0:   eased=0.0000 (starts slow)
// t=0.5: eased=0.5000 (halfway)
// t=1.0: eased=1.0000 (ends slow)
// t=0.25: eased=0.0625 (much slower than linear at 25%)
```

This output proves that `easeInOutCubic` starts slowly, moves fastest in the middle, and slows down at the end, while still mapping `[0,1]` exactly to `[0,1]`.

### Discard the throwaway
This console easing example is deleted.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-13.html`
- **Change type**: Add
- **Location**: Above the animation loop and inside it.
- **Dependencies**: The `t` calculation.

### The New Code
```javascript
function easeInOutCubic(t) {
    return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
}

// Inside render:
const easedT = easeInOutCubic(t);
camera.position.copy(camCurve.getPoint(easedT));
```

### The Updated Project
```javascript
1: function easeInOutCubic(t) { // ← new
2:     return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; // ← new
3: } // ← new
4: function render() {
5:     requestAnimationFrame(render);
6:     const t = (clock.getElapsedTime() * 0.05) % 1;
7:     const easedT = easeInOutCubic(t); // ← new
8:     camera.position.copy(camCurve.getPoint(easedT)); // ← new
9:     // ... lookAt logic remains the same
10: }
```
We now pass our linear time through an easing function before querying the curve.

### Mechanical walkthrough
1. `function easeInOutCubic(t)`: Defines a standard easing equation.
2. `return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;`: Evaluates the cubic easing curve depending on whether we are in the first half or second half of the animation.
3. `const easedT = easeInOutCubic(t);`: Transforms the linear `0..1` value into an eased `0..1` value.
4. `camera.position.copy(camCurve.getPoint(easedT));`: Samples the curve using the warped time parameter.

### CS lens
Easing functions map the domain $[0, 1]$ onto the range $[0, 1]$ non-linearly. By shaping the derivative (the velocity) such that it equals zero at $t=0$ and $t=1$, we simulate physical momentum and inertia.

### SE lens
Separating the timing logic (the `clock`), the easing logic (`easeInOutCubic`), and the path logic (`CatmullRomCurve3`) allows you to swap them independently. You could use a different easing function without touching the curve definition or the render loop.

### Commands needed
Open lesson-13.html in a modern browser.

### Run it
The camera now eases in and out, feeling much more cinematic and heavy.

### One sentence connecting to previous unit
We can feel the camera moving along a complex path, but visualizing that path in 3D space would make debugging much easier.

## Concept Unit: Visualizing the camera path with Line

### The Problem
The curve exists only mathematically. How can we draw it on screen so we can see the exact path the camera takes?

### Introduce the concept in isolation
Let's see how `THREE.Line` and `getPoints` create a visible track.

```javascript
import * as THREE from 'three';
// Draw the camera path as a visible line in the scene
const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5, 2, 8),
    new THREE.Vector3(-2, 3, 4),
    new THREE.Vector3( 0, 2, 2),
    new THREE.Vector3( 3, 4, 5),
    new THREE.Vector3( 5, 2, 8),
]);
const points = curve.getPoints(100);  // 101 points
const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
const lineMat = new THREE.LineBasicMaterial({color: 0xffff00});
const pathLine = new THREE.Line(lineGeo, lineMat);
scene.add(pathLine);
// Also show control points as small spheres:
const cpGeo = new THREE.SphereGeometry(0.1, 8, 4);
const cpMat = new THREE.MeshBasicMaterial({color: 0xff0000});
for (const pt of curve.points) {
    const cp = new THREE.Mesh(cpGeo, cpMat);
    cp.position.copy(pt);
    scene.add(cp);
}
console.log('Path line vertices:', points.length);  // 101
console.log('Control points:', curve.points.length);  // 5
```

This output proves that `getPoints(100)` returns 101 vertices, which `THREE.Line` uses to draw connected segments, while the control points can be rendered separately.

### Discard the throwaway
This isolated debug-drawing code is deleted.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-13.html`
- **Change type**: Add
- **Location**: Right after `camCurve` is defined.
- **Dependencies**: `camCurve` and `scene`.

### The New Code
```javascript
const points = camCurve.getPoints(100);
const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
const lineMat = new THREE.LineBasicMaterial({color: 0xffff00});
scene.add(new THREE.Line(lineGeo, lineMat));
```

### The Updated Project
```javascript
1: const camCurve = new THREE.CatmullRomCurve3([ /* ... */ ], true);
2: const points = camCurve.getPoints(100); // ← new
3: const lineGeo = new THREE.BufferGeometry().setFromPoints(points); // ← new
4: const lineMat = new THREE.LineBasicMaterial({color: 0xffff00}); // ← new
5: scene.add(new THREE.Line(lineGeo, lineMat)); // ← new
6: const clock = new THREE.Clock();
```
We extract the curve into discrete vertices and create a Line object to render it.

### Mechanical walkthrough
1. `const points = camCurve.getPoints(100);`: Samples the continuous mathematical curve into an array of 101 discrete `Vector3` points.
2. `const lineGeo = new THREE.BufferGeometry().setFromPoints(points);`: Creates a GPU-ready geometry buffer from the point array.
3. `const lineMat = new THREE.LineBasicMaterial({color: 0xffff00});`: Creates a simple unlit yellow material.
4. `scene.add(new THREE.Line(lineGeo, lineMat));`: Constructs the `Line` mesh and adds it to the rendering graph.

### CS lens
Rendering a continuous mathematical curve requires tessellation—breaking it down into discrete straight line segments. By sampling 100 times, we trade memory for smoothness. At a distance, human vision interprets enough straight segments as a continuous curve.

### SE lens
Debug visualizations are crucial when working in 3D. A math error in a vector is completely invisible until you render it as a line or a sphere. Building the habit of instantly visualizing abstract math paths saves hours of blind debugging.

### Commands needed
Open lesson-13.html in a modern browser.

### Run it
You will now see a yellow ring tracing the exact flight path of the camera through the scene.

### One sentence connecting to previous unit
Visualizing the curve confirms the invisible track that the camera and easing functions have been following.

## Closing

### Connect the pieces
Tracing the camera flying along `CatmullRomCurve3` from `t=0` to `t=0.5`: The animation loop polls `clock.getElapsedTime()` and normalizes it to a linear `t`. This linear `t` is fed into `easeInOutCubic`, which distorts it to start slowly. The eased `t` is passed to `camCurve.getPoint(t)` to calculate the exact 3D coordinate for the camera. To prevent the camera from staring blankly ahead, we sample `getPoint(t + 0.01)` to determine the forward vector, passing it to `lookAt`. The line visualization shows exactly what this mathematical interpolation looks like in space, proving out our logic from setup to render.
