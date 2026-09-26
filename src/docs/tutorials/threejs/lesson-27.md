# Lesson 27: Physics with cannon-es — Rigid Bodies, Gravity, and Collision

**What you will build**
Physics engines simulate rigid body dynamics (gravity, collision, forces) independently of rendering. The pattern: create a physics body (`CANNON.Body`) mirroring each Three.js mesh, step the physics world every frame, then copy the physics body's position and quaternion to the mesh. Three.js renders; cannon-es simulates.

**What you need to know first**
- Lesson 26

**Terms used in this lesson**
- **importmap** — A mechanism in HTML to map module specifiers to URLs, solving the problem of bare imports in browser-native ES modules.
- **physics engine** — A separate system that computes mathematical movement and collision based on real-world physics laws, rather than relying on manual animation.
- **rigid body** — A solid object in physics simulation that does not deform. It has mass, shape, and velocity.
- **gravity** — A constant downward acceleration applied to all dynamic bodies in the simulation.
- **broadphase** — The initial phase of collision detection that quickly finds pairs of bodies that *might* be colliding, avoiding an O(n²) check of every body against every other body.
- **fixedTimeStep** — A constant time interval used by the physics engine to ensure deterministic and stable simulation, regardless of frame rate fluctuations.
- **deltaTime** — The actual real-world time passed since the last frame.
- **maxSubSteps** — A limit on how many physics steps the engine will take in a single render frame, preventing a "spiral of death" where a slow frame causes more steps, which causes an even slower frame.
- **mass** — The physical weight of an object. In cannon-es, a mass of 0 makes the object static and immovable.
- **impulse** — An instantaneous change in velocity applied to a body, typically used for jumping or sudden impacts.
- **force** — A continuous push applied over time that changes acceleration, typically used for thrusters or wind.
- **quaternion** — A 4D mathematical representation of 3D rotation that avoids gimbal lock.

**Objects and methods used**
- **CANNON.World**
  - *What it is:* The top-level container for the physics simulation.
  - *Implementation:* `new CANNON.World({ gravity: CANNON.Vec3 })`
  - *Its use:* Holds all bodies and advances their state over time.
  - *Type:* Class
  - *Responsibility:* Manages gravity, broadphase collision detection, and steps the simulation forward.
  - *Depends on:* Optional configuration object.
  - *Connects to:* `CANNON.Body` instances added to it.
  - *Shape:* Global simulation environment.
- **CANNON.Vec3**
  - *What it is:* A 3-dimensional vector class specific to cannon-es.
  - *Implementation:* `new CANNON.Vec3(x, y, z)`
  - *Its use:* Represents positions, velocities, and forces in physics space.
  - *Type:* Class
  - *Responsibility:* Performs vector math independent of Three.js.
  - *Depends on:* X, Y, Z numerical components.
  - *Connects to:* Bodies and worlds for configuration.
  - *Shape:* Fundamental data structure in cannon-es.
- **CANNON.SAPBroadphase**
  - *What it is:* Sweep and Prune algorithm implementation.
  - *Implementation:* `new CANNON.SAPBroadphase(world)`
  - *Its use:* Speeds up collision detection by sorting object bounds along axes.
  - *Type:* Class
  - *Responsibility:* Filters out body pairs that are definitely not colliding.
  - *Depends on:* The `CANNON.World` it belongs to.
  - *Connects to:* Replaces the default naive broadphase in the world.
  - *Shape:* Collision optimization layer.
- **world.step**
  - *What it is:* The method that advances the simulation.
  - *Implementation:* `world.step(fixedTimeStep, deltaTime, maxSubSteps)`
  - *Its use:* Called every frame to calculate the new physics state.
  - *Type:* Instance method on `CANNON.World`.
  - *Responsibility:* Integrates forces and resolves collisions over the given time step.
  - *Depends on:* Step sizes and time elapsed.
  - *Connects to:* Updates all dynamic bodies within the world.
  - *Shape:* The simulation clock tick.
- **CANNON.Body**
  - *What it is:* A rigid body in the physics world.
  - *Implementation:* `new CANNON.Body({ mass, shape, position })`
  - *Its use:* Represents a physical entity that reacts to gravity and collisions.
  - *Type:* Class
  - *Responsibility:* Maintains its own position, velocity, and rotation.
  - *Depends on:* Mass, a geometric shape, and an initial position.
  - *Connects to:* Added to `CANNON.World`.
  - *Shape:* The core unit of physical simulation.
- **CANNON.Sphere**
  - *What it is:* A spherical collision shape.
  - *Implementation:* `new CANNON.Sphere(radius)`
  - *Its use:* Defines the physical boundary of a spherical body.
  - *Type:* Class
  - *Responsibility:* Provides fast mathematical bounds for collision testing.
  - *Depends on:* A radius number.
  - *Connects to:* Attached to a `CANNON.Body`.
  - *Shape:* Geometry component.
- **CANNON.Plane**
  - *What it is:* An infinite flat surface.
  - *Implementation:* `new CANNON.Plane()`
  - *Its use:* Used as a ground floor that objects cannot pass through.
  - *Type:* Class
  - *Responsibility:* Creates a half-space collision boundary.
  - *Depends on:* Nothing for initialization; default normal is along the Z axis.
  - *Connects to:* Attached to a static `CANNON.Body`.
  - *Shape:* Geometry component.
- **world.addBody**
  - *What it is:* Registration method.
  - *Implementation:* `world.addBody(body)`
  - *Its use:* Makes the physics world aware of a new body.
  - *Type:* Instance method on `CANNON.World`.
  - *Responsibility:* Includes the body in the next `step()` calculations.
  - *Depends on:* A valid `CANNON.Body`.
  - *Connects to:* Modifies the internal array of bodies in the world.
  - *Shape:* Registration boundary.
- **Vector3.copy / Quaternion.copy**
  - *What it is:* Value transfer method.
  - *Implementation:* `mesh.position.copy(body.position)`
  - *Its use:* Syncs the Three.js visual representation with the cannon-es physical state.
  - *Type:* Instance method on Three.js math classes.
  - *Responsibility:* Mutates the caller's coordinates to match the target's.
  - *Depends on:* A source object with `x, y, z` (and `w` for quaternion) properties.
  - *Connects to:* Bridges cannon-es math types to Three.js math types.
  - *Shape:* Integration seam.
- **body.addEventListener**
  - *What it is:* Event registration.
  - *Implementation:* `body.addEventListener('collide', callback)`
  - *Its use:* Triggers logic when physical contact occurs.
  - *Type:* Instance method on `CANNON.Body`.
  - *Responsibility:* Fires the callback synchronously during the physics step when a collision is resolved.
  - *Depends on:* Event name and a callback function.
  - *Connects to:* The application logic handling game rules.
  - *Shape:* Event listener.
- **getImpactVelocityAlongNormal**
  - *What it is:* Collision metric.
  - *Implementation:* `event.contact.getImpactVelocityAlongNormal()`
  - *Its use:* Determines how hard two bodies hit each other.
  - *Type:* Instance method on a Cannon contact equation.
  - *Responsibility:* Calculates the relative velocity of the two bodies along the collision normal vector.
  - *Depends on:* The specific contact event.
  - *Connects to:* Used by event handlers to gate logic.
  - *Shape:* Diagnostic utility.
- **applyImpulse**
  - *What it is:* Instantaneous force applier.
  - *Implementation:* `body.applyImpulse(impulseVec, worldPoint)`
  - *Its use:* Creates sudden bursts of movement, like jumping or explosions.
  - *Type:* Instance method on `CANNON.Body`.
  - *Responsibility:* Modifies the body's velocity directly.
  - *Depends on:* An impulse vector and the application point in world space.
  - *Connects to:* Alters the body's internal state immediately.
  - *Shape:* Physics actuator.
- **applyForce**
  - *What it is:* Continuous force applier.
  - *Implementation:* `body.applyForce(forceVec, worldPoint)`
  - *Its use:* Creates gradual acceleration over a single time step.
  - *Type:* Instance method on `CANNON.Body`.
  - *Responsibility:* Adds to the body's force accumulator, to be integrated during `step()`.
  - *Depends on:* A force vector and application point.
  - *Connects to:* Alters the body's internal state temporarily.
  - *Shape:* Physics actuator.

## Concept Unit: Setting up the physics world

### The Problem
We have 3D graphics rendering on the screen using Three.js, but they don't know how to fall, bounce, or hit each other. How do we introduce a set of physical laws that govern these objects without manually calculating math every frame?

### Introduce the concept in isolation
```javascript
import * as CANNON from 'cannon-es';

// CANNON.World: the physics simulation container
const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),  // Earth gravity: 9.82 m/s² downward
});
world.broadphase = new CANNON.SAPBroadphase(world);  // Sweep and Prune: fast collision detection
world.allowSleep = true;  // bodies that stop moving go to sleep (performance)

console.log('Physics world gravity:', world.gravity);
console.log('Broadphase:', world.broadphase.constructor.name);

const FIXED_STEP = 1/60;
function animate(delta) {
    world.step(FIXED_STEP, delta, 3);
}

// Run output:
// Physics world gravity: Vec3 { x: 0, y: -9.82, z: 0 }
// Broadphase: SAPBroadphase
```
This is called a **CANNON.World configuration**. It proves that the physics engine is a standalone system with its own configuration, entirely separate from Three.js.

### Discard the throwaway
This isolated world setup is deleted and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are introducing a physics engine.
- **Files affected**: `lesson-27.html` (modified)
- **Change type**: Add
- **Location**: Top of the `<script type="module">` block, right after Three.js initialization.
- **Dependencies**: The `cannon-es` package imported via importmap.

### The New Code
```html
<script type="importmap">
{"imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/",
  "cannon-es": "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js"
}}
</script>
```
```javascript
import * as CANNON from 'cannon-es';

const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0)
});
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
```

### The Updated Project
```html
1: <script type="importmap">
2: {"imports": {
3:   "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
4:   "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/",
5:   "cannon-es": "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js" // ← new
6: }}
7: </script>
8: <script type="module">
9: import * as THREE from 'three';
10: import * as CANNON from 'cannon-es'; // ← new
11: 
12: // Set up Three.js scene...
13: const scene = new THREE.Scene();
14: 
15: // ← new
16: const world = new CANNON.World({
17:     gravity: new CANNON.Vec3(0, -9.82, 0)
18: });
19: world.broadphase = new CANNON.SAPBroadphase(world);
20: world.allowSleep = true;
21: // ← new
```
We now have an importmap providing cannon-es, and a global physics `world` configured with Earth-like gravity.

### Mechanical walkthrough
- `import * as CANNON from 'cannon-es'` loads the library under the CANNON namespace.
- `new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) })` creates the simulation container. It uses `CANNON.Vec3`, cannon-es's own vector format, to pull objects down on the Y-axis at 9.82 meters per second squared.
- `world.broadphase = new CANNON.SAPBroadphase(world)` replaces the default naive broadphase. SAPBroadphase sorts objects by axis to find collision candidates efficiently.
- `world.allowSleep = true` tells the engine to stop calculating physics for bodies that have come to a complete rest, saving CPU cycles.
- `world.step(1/60, delta, 3)` (shown in the lab) steps the simulation. It uses a `fixedTimeStep` of 60Hz, the actual `deltaTime`, and up to 3 `maxSubSteps` to catch up if the frame rate drops.

### CS lens
**Sweep and Prune (SAP)** is a spatial indexing algorithm. Instead of checking every object against every other object O(n²), it projects the bounding boxes of all objects onto the X, Y, and Z axes and sorts them. It only checks for exact collisions if the intervals overlap on all axes, reducing the broadphase complexity to O(n log n).

### SE lens
**Separation of Concerns**. The physics engine knows absolutely nothing about graphics, meshes, or materials. It only computes math for abstract mathematical boundaries. Three.js knows nothing about gravity or mass. We maintain two separate data structures and explicitly bridge them.

### Commands needed
Open `lesson-27.html` in a modern browser.

### Run it
The scene is empty, but the physics engine is now initialized in the background.

### One sentence connecting to previous unit
With a physics simulation running in the background, we now need to put objects into it.

## Concept Unit: Creating a physics body and syncing it to Three.js

### The Problem
We have a physics world, but how do we connect a visible 3D mesh to the invisible math representing its physical bounds?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Three.js mesh:
const sphereMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 16),
    new THREE.MeshStandardMaterial({color: 0xff4400})
);
sphereMesh.position.set(0, 5, 0);

// Matching cannon-es body:
const sphereBody = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Sphere(0.5),
    position: new CANNON.Vec3(0, 5, 0),
});

function syncPhysics() {
    sphereMesh.position.copy(sphereBody.position);
    sphereMesh.quaternion.copy(sphereBody.quaternion);
}

console.log('Body mass:', sphereBody.mass);
console.log('Body shape:', sphereBody.shapes[0].constructor.name);

// Run output:
// Body mass: 1
// Body shape: Sphere
```
This is called a **rigid body sync pattern**. It proves that we must maintain two identical positions — one for the physical body, and one for the visual mesh — and copy the state from physics to graphics every frame.

### Discard the throwaway
This isolated sync example is deleted and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are adding a falling ball.
- **Files affected**: `lesson-27.html` (modified)
- **Change type**: Add
- **Location**: Below the physics world setup, and inside the animation loop.
- **Dependencies**: The `world` and `scene`.

### The New Code
```javascript
const sphereGeo = new THREE.SphereGeometry(0.5, 32, 16);
const sphereMat = new THREE.MeshStandardMaterial({color: 0xff4400});
const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
scene.add(sphereMesh);

const sphereBody = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Sphere(0.5),
    position: new CANNON.Vec3(0, 5, 0),
});
world.addBody(sphereBody);
```
```javascript
// Inside animation loop
world.step(1/60, delta, 3);
sphereMesh.position.copy(sphereBody.position);
sphereMesh.quaternion.copy(sphereBody.quaternion);
```

### The Updated Project
```javascript
1: const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
2: 
3: // ← new
4: const sphereGeo = new THREE.SphereGeometry(0.5, 32, 16);
5: const sphereMat = new THREE.MeshStandardMaterial({color: 0xff4400});
6: const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
7: scene.add(sphereMesh);
8: 
9: const sphereBody = new CANNON.Body({
10:     mass: 1,
11:     shape: new CANNON.Sphere(0.5),
12:     position: new CANNON.Vec3(0, 5, 0),
13: });
14: world.addBody(sphereBody);
15: // ← new
16: 
17: const clock = new THREE.Clock();
18: function animate() {
19:     requestAnimationFrame(animate);
20:     const delta = clock.getDelta();
21:     
22:     // ← new
23:     world.step(1/60, delta, 3);
24:     sphereMesh.position.copy(sphereBody.position);
25:     sphereMesh.quaternion.copy(sphereBody.quaternion);
26:     // ← new
27:     
28:     renderer.render(scene, camera);
29: }
```
We have a Three.js sphere and a CANNON.js sphere body. During `animate`, the engine steps forward, pulling the physical body down, and the visual mesh copies those coordinates exactly.

### Mechanical walkthrough
- `new CANNON.Body({ mass: 1, ... })` creates a rigid body weighing 1 kg. It's dynamic because mass > 0.
- `shape: new CANNON.Sphere(0.5)` attaches a physical collision boundary. This MUST exactly match the Three.js `SphereGeometry` radius of 0.5, or else the object will visually sink into or float above surfaces.
- `position: new CANNON.Vec3(0, 5, 0)` sets the initial spawn point.
- `world.addBody(sphereBody)` registers it with the physics engine.
- Inside the loop, `world.step(1/60, delta, 3)` applies gravity. The body's velocity increases downward by 9.82 m/s² factored by the delta time, updating its position.
- `sphereMesh.position.copy(sphereBody.position)` safely transfers the `x, y, z` values from the cannon-es vector format to the Three.js vector format.
- `sphereMesh.quaternion.copy(sphereBody.quaternion)` transfers rotation exactly, maintaining any tumbling or spinning caused by physics.

### CS lens
**Numerical Integration**. `world.step()` uses an integrator (typically Euler or Runge-Kutta) to update position based on velocity, and velocity based on acceleration (gravity and forces) over tiny discrete time steps.

### SE lens
**The Bridge Pattern**. The `copy()` lines are the bridge between two disparate systems. The physics engine is entirely headless. This clear data-transfer boundary means you could swap cannon-es for another engine like Ammo.js, and only the bridge lines would need to change.

### Commands needed
Open `lesson-27.html` in a modern browser.

### Run it
The sphere falls straight down through empty space forever.

### One sentence connecting to previous unit
The sphere falls infinitely, so we need to add a static object to stop it.

## Concept Unit: Static floor and collision detection

### The Problem
Objects fall forever unless they hit something. How do we create an immovable object, like the ground, and detect when our sphere hits it?

### Introduce the concept in isolation
```javascript
import * as CANNON from 'cannon-es';

const floorBody = new CANNON.Body({
    mass: 0,  // mass 0 means static
    shape: new CANNON.Plane(),
});
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

console.log('Floor body type:', floorBody.type);

// Run output:
// Floor body type: 2 (CANNON.Body.STATIC)
```
This is called a **static physics plane**. It proves that giving an object a mass of 0 makes it completely immune to gravity and collisions — other objects bounce off it, but it never moves.

### Discard the throwaway
This isolated floor setup is deleted and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are adding a ground plane.
- **Files affected**: `lesson-27.html` (modified)
- **Change type**: Add
- **Location**: Between the sphere setup and the animation loop.
- **Dependencies**: The `world` and `scene`.

### The New Code
```javascript
const floorBody = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Plane(),
});
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floorBody);

const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({color: 0xaaaaaa})
);
floorMesh.rotation.x = -Math.PI / 2;
scene.add(floorMesh);

sphereBody.addEventListener('collide', (event) => {
    console.log('Impact velocity:', event.contact.getImpactVelocityAlongNormal());
});
```

### The Updated Project
```javascript
1: world.addBody(sphereBody);
2: 
3: // ← new
4: const floorBody = new CANNON.Body({
5:     mass: 0,
6:     shape: new CANNON.Plane(),
7: });
8: floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
9: world.addBody(floorBody);
10: 
11: const floorMesh = new THREE.Mesh(
12:     new THREE.PlaneGeometry(20, 20),
13:     new THREE.MeshStandardMaterial({color: 0xaaaaaa})
14: );
15: floorMesh.rotation.x = -Math.PI / 2;
16: scene.add(floorMesh);
17: 
18: sphereBody.addEventListener('collide', (event) => {
19:     console.log('Impact velocity:', event.contact.getImpactVelocityAlongNormal());
20: });
21: // ← new
22: 
23: const clock = new THREE.Clock();
```
We added a static physical plane, a visible mesh plane, rotated both to be flat, and registered a collision event listener on the sphere.

### Mechanical walkthrough
- `mass: 0` explicitly marks the `floorBody` as `CANNON.Body.STATIC`.
- `new CANNON.Plane()` creates an infinite half-space. In cannon-es, planes face the positive Z-axis by default (like a wall).
- `floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)` rotates the physical plane 90 degrees backward on the X-axis so it faces the positive Y-axis (up), acting as a floor. We must rotate the visual `floorMesh` exactly the same way.
- `sphereBody.addEventListener('collide', callback)` registers logic to fire during `world.step()` when the engine detects overlap between the sphere and the floor.
- `event.contact.getImpactVelocityAlongNormal()` reads the mathematical contact equation to tell us the speed at which the bodies struck each other.

### CS lens
**Infinite Boundaries vs Explicit Vertices**. A `CANNON.Plane` is an analytical shape. It has no vertices, just a normal vector and a distance from the origin. Collision detection is an extremely cheap mathematical dot-product (`position • normal > 0`), which is vastly faster than checking triangles on a mesh.

### SE lens
**Event-Driven Physics Hooks**. Physics engines execute inside a tight loop. Exposing events like `collide` allows application logic (like playing an impact sound) to subscribe to physics events without polling positions every frame or muddying the simulation loop itself.

### Commands needed
Open `lesson-27.html` in a modern browser and open the developer console.

### Run it
The sphere falls and stops abruptly on the floor. The console prints an impact velocity of around `9.8`.

### One sentence connecting to previous unit
The sphere rests on the ground, so let's learn how to apply forces to make it jump.

## Concept Unit: Applying forces and impulses

### The Problem
The sphere only moves under gravity. How do we make it jump instantly, or push it continuously like a wind or thruster?

### Introduce the concept in isolation
```javascript
import * as CANNON from 'cannon-es';

const ballBody = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(0, 1, 0),
});

// applyImpulse: instant velocity change
ballBody.applyImpulse(
    new CANNON.Vec3(0, 5, 0),
    ballBody.position
);

console.log('Velocity after impulse:', ballBody.velocity.y);

// Run output:
// Velocity after impulse: 5
```
This is called **impulse application**. It proves that applying an impulse instantly changes the body's velocity based on its mass, avoiding the need to manually alter coordinates.

### Discard the throwaway
This isolated impulse test is deleted and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are adding user interaction.
- **Files affected**: `lesson-27.html` (modified)
- **Change type**: Add
- **Location**: Right after the collision event listener.
- **Dependencies**: The `sphereBody`.

### The New Code
```javascript
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        sphereBody.applyImpulse(
            new CANNON.Vec3(0, 5, 0),
            sphereBody.position
        );
    }
    if (e.code === 'KeyR') {
        sphereBody.applyForce(
            new CANNON.Vec3(10, 0, 0),
            sphereBody.position
        );
    }
});
```

### The Updated Project
```javascript
1: sphereBody.addEventListener('collide', (event) => {
2:     console.log('Impact velocity:', event.contact.getImpactVelocityAlongNormal());
3: });
4: 
5: // ← new
6: document.addEventListener('keydown', (e) => {
7:     if (e.code === 'Space') {
8:         sphereBody.applyImpulse(
9:             new CANNON.Vec3(0, 5, 0),
10:             sphereBody.position
11:         );
12:     }
13:     if (e.code === 'KeyR') {
14:         sphereBody.applyForce(
15:             new CANNON.Vec3(10, 0, 0),
16:             sphereBody.position
17:         );
18:     }
19: });
20: // ← new
21: 
22: const clock = new THREE.Clock();
```
Pressing Space makes the sphere jump up, and pressing R pushes it to the right.

### Mechanical walkthrough
- `document.addEventListener('keydown', ...)` listens for keyboard input.
- `sphereBody.applyImpulse(new CANNON.Vec3(0, 5, 0), sphereBody.position)` applies an instant force (Newtons * seconds) at the exact center of the body. Because mass is 1, velocity instantly becomes 5 m/s upward. Gravity will immediately start pulling it back down on the next step.
- `sphereBody.applyForce(new CANNON.Vec3(10, 0, 0), sphereBody.position)` applies a continuous force (Newtons). However, it only applies for *one physics step*. To keep pushing it right continuously, `applyForce` must be called inside the animation loop every single frame.

### CS lens
**Euler Equations of Motion**. `applyImpulse` modifies velocity: `v_new = v_old + impulse/mass`. `applyForce` modifies acceleration: `a = force/mass`, which the integrator then adds to velocity over the delta time: `v_new = v_old + a * dt`.

### SE lens
**State vs Simulation Mutation**. Directly setting `body.velocity.set(0,5,0)` overwrites whatever other physical interactions were happening (like getting hit by another object). Using `applyImpulse` mathematically sums all forces appropriately, letting the engine resolve the complex interactions safely.

### Commands needed
Open `lesson-27.html` in a modern browser.

### Run it
Wait for the sphere to hit the ground. Press Space, and the sphere jumps. Press R, and the sphere rolls off to the right.

### One sentence connecting to previous unit
Now that one object can jump around, we can scale this up to many objects interacting.

## Concept Unit: Multiple bodies and a simple physics scene

### The Problem
Tracking one `sphereBody` and one `sphereMesh` in manual variables works, but how do we manage a scene with many dynamic objects efficiently?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const bodies = [];
const meshes = [];

function syncAll() {
    for(let i = 0; i < bodies.length; i++) {
        meshes[i].position.copy(bodies[i].position);
        meshes[i].quaternion.copy(bodies[i].quaternion);
    }
}
// Assume bodies and meshes are pushed into the arrays
// Run output: (Concept proven: arrays map 1:1)
```
This is an **array synchronization pattern**. It proves that as long as the indices of the `bodies` array match the indices of the `meshes` array, we can iterate over them and sync an unlimited number of objects.

### Discard the throwaway
This array sync pattern is discarded as isolated code but will heavily inform our project change.

### Project Change
- **Reference Source**: No reference counterpart — this is a refactoring to support many objects.
- **Files affected**: `lesson-27.html` (modified)
- **Change type**: Refactor
- **Location**: Replacing the single sphere setup and updating the animation loop.
- **Dependencies**: The `world`, `scene`.

### The New Code
```javascript
const bodies = [];
const meshes = [];

function addSphere(x, y, z, r, color) {
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 8),
        new THREE.MeshStandardMaterial({color})
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);
    
    const body = new CANNON.Body({
        mass: 1, 
        shape: new CANNON.Sphere(r),
        position: new CANNON.Vec3(x, y, z)
    });
    world.addBody(body);
    
    bodies.push(body);
    meshes.push(mesh);
}

for (let i = 0; i < 10; i++) {
    addSphere(
        (Math.random() - 0.5) * 4,
        3 + i * 1.2,
        (Math.random() - 0.5) * 4,
        0.3,
        Math.random() * 0xffffff
    );
}
```
```javascript
// Replace old sync in animate loop:
for(let i = 0; i < bodies.length; i++) {
    meshes[i].position.copy(bodies[i].position);
    meshes[i].quaternion.copy(bodies[i].quaternion);
}
```

### The Updated Project
```javascript
1: world.addBody(floorBody);
2: 
3: // ← new
4: const bodies = [];
5: const meshes = [];
6: 
7: function addSphere(x, y, z, r, color) {
8:     const mesh = new THREE.Mesh(
9:         new THREE.SphereGeometry(r, 16, 8),
10:         new THREE.MeshStandardMaterial({color})
11:     );
12:     mesh.position.set(x, y, z);
13:     scene.add(mesh);
14:     
15:     const body = new CANNON.Body({
16:         mass: 1, 
17:         shape: new CANNON.Sphere(r),
18:         position: new CANNON.Vec3(x, y, z)
19:     });
20:     world.addBody(body);
21:     
22:     bodies.push(body);
23:     meshes.push(mesh);
24: }
25: 
26: for (let i = 0; i < 10; i++) {
27:     addSphere(
28:         (Math.random() - 0.5) * 4,
29:         3 + i * 1.2,
30:         (Math.random() - 0.5) * 4,
31:         0.3,
32:         Math.random() * 0xffffff
33:     );
34: }
35: // ← new
36: 
37: const clock = new THREE.Clock();
38: function animate() {
39:     requestAnimationFrame(animate);
40:     world.step(1/60, clock.getDelta(), 3);
41:     
42:     // ← new
43:     for(let i = 0; i < bodies.length; i++) {
44:         meshes[i].position.copy(bodies[i].position);
45:         meshes[i].quaternion.copy(bodies[i].quaternion);
46:     }
47:     // ← new
48:     
49:     renderer.render(scene, camera);
50: }
```
We replaced our single sphere with a helper function that generates both visual and physical representations simultaneously, pushing them into tracking arrays. Our loop now syncs the whole array.

### Mechanical walkthrough
- `const bodies = []` and `const meshes = []` hold our dual representations.
- `function addSphere(...)` takes parameters for position, radius, and color. It guarantees that the `THREE.Mesh` and `CANNON.Body` are instantiated with identical data.
- `bodies.push(body)` and `meshes.push(mesh)` ensure that index `i` of one array perfectly corresponds to index `i` of the other.
- `for (let i = 0; i < 10; i++)` drops 10 spheres from random X/Z positions at escalating heights (`3 + i * 1.2`).
- Inside `animate`, `for(let i = 0; i < bodies.length; i++)` loops over every active object and bridges its `position` and `quaternion`.

### CS lens
**Data Locality**. While iterating over parallel arrays (`bodies` and `meshes`) is common in JavaScript, in lower-level C++ engines, this concept scales into Data-Oriented Design (DoD). By keeping all physics transforms packed tightly in memory, cache misses drop dramatically when simulating thousands of objects.

### SE lens
**Factory Functions**. `addSphere` is a factory. It abstracts away the tedious, error-prone boilerplate of creating a mesh, material, shape, and rigid body into a single verifiable unit. If we later add shadow casting or collision groups, we only have to add it to the factory function.

### Commands needed
Open `lesson-27.html` in a modern browser.

### Run it
10 spheres spawn in the air, fall at varying times, strike the ground, bounce, and strike each other, realistically scattering around the floor. Because `world.allowSleep = true` is set, objects that settle down completely stop consuming CPU.

### One sentence connecting to previous unit
We've successfully bridged headless physics math to WebGL rendering for dynamic interactive scenes.

## Closing
### Connect the pieces
Trace a single sphere falling from `y = 5` under gravity: 
1. `world.step(1/60, delta, 3)` advances time.
2. Gravity applies acceleration: `body.velocity.y` decreases by `-9.82 * (1/60)` (-0.164 m/s per step).
3. The integrator updates the body: `body.position.y` shifts downwards by the new velocity.
4. When `body.position.y` reaches 0.5, SAPBroadphase flags an overlap, and exact collision detection calculates a bounce against the `CANNON.Plane`.
5. An automatic upward bounce impulse alters `body.velocity.y`.
6. Finally, `meshes[i].position.copy(bodies[i].position)` forces the glowing WebGL sphere on your screen to match the exact mathematical bounce computed in the background.
