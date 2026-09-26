# Lesson 34: Collision Detection — AABB, Sphere Tests, and BVH Raycasting

Collision detection asks: "do these two shapes overlap?" We will build a pipeline that detects collisions between 3D objects using two fundamental approaches: simple overlap tests (AABB, sphere) for fast broad-phase filtering, and a Bounding Volume Hierarchy (BVH) for rapid raycasts and precise intersection tests in O(log n) time instead of O(n) brute-force.

**What you need to know first:**
- Lesson 33

**Terms used in this lesson:**
- **AABB (Axis-Aligned Bounding Box)** — A rectangular box whose edges align with the world's X, Y, and Z axes. Used because testing if two aligned boxes overlap is extremely fast (just checking min/max values on each axis).
- **Bounding Sphere** — A sphere defined by a center point and a radius that completely encloses an object. Used because testing sphere overlap is the fastest possible collision check (one distance calculation).
- **Broadphase** — The first step in collision detection. A fast, computationally cheap test to quickly reject pairs of objects that are definitely not colliding, leaving a smaller list of potential candidates.
- **Narrowphase** — The second step in collision detection. A slower, highly precise test (often triangle-by-triangle) run only on the pairs that survived the broadphase.
- **Raycasting** — Firing an invisible line (a ray) from an origin point in a specific direction to see what objects it intersects.
- **BVH (Bounding Volume Hierarchy)** — A tree structure of bounding boxes that hierarchically encloses geometry. It allows collision tests and raycasts to skip massive irrelevant regions of a mesh, turning an O(n) linear search into an O(log n) tree traversal.
- **O(1), O(n), O(n²), O(log n)** — Big-O notation describing how the cost of an algorithm grows as the amount of data (n) increases. O(n²) means checking 100 items takes ~10,000 steps (slow). O(log n) means checking 100,000 items takes ~17 steps (fast).

**Objects and methods used:**

- **`THREE.Box3`**
  - *What it is:* Three.js's representation of an Axis-Aligned Bounding Box (AABB) in 3D space.
  - *Implementation:* A class holding two `Vector3` properties: `min` and `max`.
  - *Its use:* Used to create and manage the boundaries for simple box overlap tests.
  - *Type:* Class.
  - *Responsibility:* Maintains a 3D bounding box and provides mathematical methods to expand, test, or transform it.
  - *Depends on:* Two `Vector3` instances (`min` and `max`) representing the lower and upper corners.
  - *Connects to:* Interacts with `Vector3` and other `Box3` objects for spatial comparisons.
  - *Shape:* A core math utility structure.

- **`intersectsBox`**
  - *What it is:* A method that checks if one `Box3` overlaps with another.
  - *Implementation:* `box1.intersectsBox(box2)`, returning a Boolean.
  - *Its use:* To perform an O(1) collision check by evaluating the minimum and maximum X, Y, and Z values of two boxes.
  - *Type:* Instance method on `THREE.Box3`.
  - *Responsibility:* Computes whether two AABBs overlap in 3D space.
  - *Depends on:* The internal `min` and `max` vectors of the caller, and the passed target `Box3`.
  - *Connects to:* Returns a boolean primitive to the calling logic.
  - *Shape:* An algorithmic evaluation method.

- **`THREE.Sphere`**
  - *What it is:* Three.js's representation of a bounding sphere.
  - *Implementation:* A class holding a `center` (`Vector3`) and a `radius` (Number).
  - *Its use:* To define the boundaries for the fastest possible broadphase collision tests.
  - *Type:* Class.
  - *Responsibility:* Maintains a spherical boundary in 3D space.
  - *Depends on:* A `Vector3` center point and a numerical radius.
  - *Connects to:* Interacts with vectors and meshes to establish radial bounds.
  - *Shape:* A core math utility structure.

- **`distanceTo`**
  - *What it is:* A method that calculates the straight-line Euclidean distance between two vectors.
  - *Implementation:* `vector1.distanceTo(vector2)`, returning a Number.
  - *Its use:* Used in sphere overlap tests to see if the distance between two centers is less than their combined radii.
  - *Type:* Instance method on `THREE.Vector3`.
  - *Responsibility:* Computes the spatial distance to another point.
  - *Depends on:* The caller's coordinates and the target `Vector3`'s coordinates.
  - *Connects to:* Returns a numerical distance to the calling logic.
  - *Shape:* A mathematical operation.

- **`THREE.Raycaster`**
  - *What it is:* Three.js's tool for raycasting—shooting a line through space to detect intersections.
  - *Implementation:* A class that stores a ray (origin and direction) and provides intersection testing methods.
  - *Its use:* To perform precise, line-of-sight narrowphase collision checks or clicking/picking.
  - *Type:* Class.
  - *Responsibility:* Tests a ray against a single 3D object or an array of objects to find exact intersection points.
  - *Depends on:* A normalized direction vector and an origin vector.
  - *Connects to:* Takes mesh arrays as input, outputs an array of intersection data objects.
  - *Shape:* A scene query utility.

- **`intersectObjects`**
  - *What it is:* A method on `Raycaster` that tests a ray against an array of objects.
  - *Implementation:* `raycaster.intersectObjects(objectsArray)`, returning an Array of hit objects.
  - *Its use:* To find every object the ray passes through, sorted by distance.
  - *Type:* Instance method on `THREE.Raycaster`.
  - *Responsibility:* Executes the ray-mesh intersection algorithms against multiple targets.
  - *Depends on:* The raycaster's current origin/direction, and the provided array of `THREE.Mesh` objects.
  - *Connects to:* Returns collision results (distance, point, face normal, object reference) to the caller.
  - *Shape:* A calculation pipeline method.

**Everything else in the file, not this lesson's subject but still explained:**

- **`computeBoundingBox` / `computeBoundingSphere`**
  - *What it is:* Methods on `BufferGeometry` that calculate the geometry's bounding limits.
  - *Implementation:* `geometry.computeBoundingBox()` populates the `geometry.boundingBox` property.
  - *Its use:* To generate the mathematical boundaries based on the raw vertex data so they can be used for tests.
  - *Type:* Instance methods on `THREE.BufferGeometry`.
  - *Responsibility:* Iterates over all vertices to find the spatial extremes (min/max or center/radius).
  - *Depends on:* The geometry's vertex attributes.
  - *Connects to:* Writes directly to the `boundingBox` or `boundingSphere` properties on the geometry.
  - *Shape:* Geometry processing step.

- **`clone`**
  - *What it is:* A method that creates a separate, identical copy of an object (like a Box3 or Sphere).
  - *Implementation:* `box.clone()`, returning a new `THREE.Box3`.
  - *Its use:* To safely modify a bounding box (like applying a world matrix) without corrupting the geometry's original local bounding box.
  - *Type:* Instance method.
  - *Responsibility:* Instantiates a new object with copied internal state.
  - *Depends on:* The current state of the object.
  - *Connects to:* Hands a detached copy back to the caller.
  - *Shape:* Object lifecycle utility.

- **`applyMatrix4`**
  - *What it is:* A method that transforms an object (like a Box3) by a 4x4 transformation matrix.
  - *Implementation:* `box.applyMatrix4(mesh.matrixWorld)`.
  - *Its use:* To convert a bounding box from local space (where the mesh was modeled) to world space (where it currently is in the scene).
  - *Type:* Instance method.
  - *Responsibility:* Applies translation, rotation, and scaling data to boundaries.
  - *Depends on:* A valid `THREE.Matrix4`.
  - *Connects to:* Mutates the caller's internal coordinates based on the matrix.
  - *Shape:* Matrix math operation.

---

## Concept Unit: AABB Overlap Test

### The Problem
If we have two boxes in our 3D world, how do we know if they are colliding? Testing every single triangle in a mesh against every other triangle is too slow. We need a cheap, mathematical way to say "yes" or "no."

What attributes of a box, perfectly aligned with the world's grid, would let you prove they overlap using only basic math?

### Introduce the concept in isolation
We will construct three mathematical AABBs and test them against each other using simple min/max values.

```javascript
import * as THREE from 'three';
// Box3: Three.js's AABB. min=(minX,minY,minZ), max=(maxX,maxY,maxZ)
const box1 = new THREE.Box3(
    new THREE.Vector3(-1, -1, -1),
    new THREE.Vector3( 1,  1,  1)
);
const box2 = new THREE.Box3(
    new THREE.Vector3( 0,  0,  0),
    new THREE.Vector3( 2,  2,  2)
);
const box3 = new THREE.Box3(
    new THREE.Vector3( 3,  0,  0),
    new THREE.Vector3( 5,  2,  2)
);

console.log('box1 intersects box2:', box1.intersectsBox(box2));
console.log('box1 intersects box3:', box1.intersectsBox(box3));

// Extracting an AABB from a mesh and moving it to world space
const mesh = new THREE.Mesh(new THREE.BoxGeometry(2,2,2), new THREE.MeshStandardMaterial());
mesh.position.set(0.5, 0, 0);
mesh.updateMatrixWorld(); // ensure matrix is updated
mesh.geometry.computeBoundingBox();

const meshBox = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
console.log('Mesh world AABB:', meshBox.min, meshBox.max);
```

**Output:**
```text
box1 intersects box2: true
box1 intersects box3: false
Mesh world AABB: Vector3 { x: -0.5, y: -1, z: -1 } Vector3 { x: 1.5, y: 1, z: 1 }
```

This is called an **AABB (Axis-Aligned Bounding Box) overlap test**. The output proves that we can instantly determine overlap without drawing anything. `box1` overlaps `box2` because their coordinates interlock on all three axes (e.g., box1's max X of 1 is greater than box2's min X of 0). `box1` completely misses `box3` because box1's max X (1) is less than box3's min X (3), allowing the check to exit early.

### Discard the throwaway
This standalone box testing script is discarded and will not be used in the main project code.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are demonstrating collision pipelines.
- **Files affected:** `lesson-34.html`
- **Change type:** add
- **Location:** Inside our script tag, right after initializing the scene.
- **Dependencies:** Three.js.

### The New Code
```javascript
const box1 = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
const box2 = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 2, 2));
const isHit = box1.intersectsBox(box2);
```

### The Updated Project
```html
1: <script type="module">
2:   import * as THREE from 'three';
3:   const scene = new THREE.Scene();
4:   // ← new
5:   const box1 = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
6:   const box2 = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 2, 2));
7:   const isHit = box1.intersectsBox(box2);
8: </script>
```

The script sets up our scene and calculates an immediate collision between two abstract bounds.

### Mechanical walkthrough
- `const box1` initializes a variable to hold our first bounding area.
- `new THREE.Box3(...)` instantiates an AABB.
- `new THREE.Vector3(-1, -1, -1)` provides the minimum spatial boundary on the X, Y, and Z axes.
- `new THREE.Vector3(1, 1, 1)` provides the maximum spatial boundary on the X, Y, and Z axes.
- `const box2` creates the second bounding area, slightly offset positively.
- `box1.intersectsBox(box2)` performs the overlap evaluation. It checks X, Y, and Z. If any single axis does not overlap, it immediately returns false. If all three overlap, it returns true.

### CS lens
In Computer Science, an AABB test is an O(1) constant-time operation. It requires a maximum of 6 comparisons (checking `min <= target_max` and `max >= target_min` for X, Y, and Z). This extreme efficiency is why AABBs are heavily favored in computer graphics; before engaging in complex polygon math, an engine will check AABBs to instantly reject shapes that are miles apart.

### SE lens
Software Engineering relies on cheap abstraction layers to protect expensive logic. An AABB is a structural proxy. Because calculating bounding boxes is inherently inaccurate (a rotated sword has an enormous AABB compared to its actual thin mesh), it is never used for final precise collision (like bullets hitting a character), but is used as a filter layer to stop the CPU from doing unnecessary precise work.

### Commands needed
Open `lesson-34.html` in a modern browser.

### Run it
The console logs `true`, confirming the math works.

### One sentence connecting to previous unit
While boxes are fast, measuring the distance between two points is even faster.

---

## Concept Unit: Sphere Overlap Test

### The Problem
An AABB requires up to 6 comparisons. If we have thousands of objects, even that can become a bottleneck. What geometry allows us to define an object using only a center point and a single size value, to make the test even simpler?

### Introduce the concept in isolation
We will define spheres by a center point and radius, and measure the distance between them.

```javascript
import * as THREE from 'three';

const sphere1 = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1.0);
const sphere2 = new THREE.Sphere(new THREE.Vector3(1.5, 0, 0), 0.8);
const sphere3 = new THREE.Sphere(new THREE.Vector3(5, 0, 0), 0.5);

function spheresOverlap(s1, s2) {
    const dist = s1.center.distanceTo(s2.center);
    return dist < (s1.radius + s2.radius);
}

console.log('sphere1 vs sphere2:', spheresOverlap(sphere1, sphere2));
console.log('sphere1 vs sphere3:', spheresOverlap(sphere1, sphere3));

const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), new THREE.MeshStandardMaterial());
mesh.updateMatrixWorld();
mesh.geometry.computeBoundingSphere();
const meshSphere = mesh.geometry.boundingSphere.clone();
meshSphere.applyMatrix4(mesh.matrixWorld);
console.log('Mesh bounding sphere radius:', meshSphere.radius);
```

**Output:**
```text
sphere1 vs sphere2: true
sphere1 vs sphere3: false
Mesh bounding sphere radius: 1
```

This is called a **Sphere overlap test**. The output proves that if the distance between the two centers (1.5) is smaller than the combined size of their radii (1.0 + 0.8 = 1.8), they must be intersecting. Sphere 3 is 5 units away, far exceeding the combined radii, returning false.

### Discard the throwaway
This standalone sphere testing script is discarded and will not appear in the project.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are demonstrating collision pipelines.
- **Files affected:** `lesson-34.html`
- **Change type:** add
- **Location:** Below the Box3 logic.
- **Dependencies:** Three.js.

### The New Code
```javascript
const sphere1 = new THREE.Sphere(new THREE.Vector3(0,0,0), 1.0);
const sphere2 = new THREE.Sphere(new THREE.Vector3(1.5,0,0), 0.8);
const dist = sphere1.center.distanceTo(sphere2.center);
const sphereHit = dist < (sphere1.radius + sphere2.radius);
```

### The Updated Project
```html
1: <script type="module">
2:   import * as THREE from 'three';
3:   const scene = new THREE.Scene();
4:   const box1 = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
5:   const box2 = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 2, 2));
6:   const isHit = box1.intersectsBox(box2);
7:   // ← new
8:   const sphere1 = new THREE.Sphere(new THREE.Vector3(0,0,0), 1.0);
9:   const sphere2 = new THREE.Sphere(new THREE.Vector3(1.5,0,0), 0.8);
10:  const dist = sphere1.center.distanceTo(sphere2.center);
11:  const sphereHit = dist < (sphere1.radius + sphere2.radius);
12: </script>
```

We establish two bounded spheres and directly calculate their separation against their combined width.

### Mechanical walkthrough
- `const sphere1` holds a boundary defined only by a center coordinate and a radius (1.0).
- `const sphere2` defines a second boundary, moved 1.5 units to the right, with a radius of 0.8.
- `sphere1.center.distanceTo(sphere2.center)` performs a Pythagorean calculation to find the exact line-of-sight distance between the two origins.
- `sphereHit = dist < (sphere1.radius + sphere2.radius)` adds the two radii together (1.8). Because the physical distance (1.5) is strictly less than their combined width, they overlap.

### CS lens
A sphere test requires exactly one distance calculation: finding the square root of the sum of squared vector differences. Mathematically, it is the absolute cheapest 3D spatial check. Because it is rotationally invariant (a sphere looks exactly the same no matter how you spin it), you never need to recalculate the bounding volume when the object rotates, unlike an AABB which grows and shrinks as its internal mesh rotates off-axis.

### SE lens
Choosing between AABB and Sphere for a broadphase filter depends entirely on your application's data shape. Games featuring primarily bipedal characters or vehicles often use capsules or spheres, because characters rotate frequently. City builders or voxel games like Minecraft use AABBs, because the world is perfectly aligned to an inflexible grid.

### Commands needed
Open `lesson-34.html` in a modern browser.

### Run it
The sphere intersection executes silently, providing `true` to our variable.

### One sentence connecting to previous unit
Broadphase tests like spheres tell us *if* we hit something, but not exactly *where* or against which specific polygon.

---

## Concept Unit: Three.js Raycaster

### The Problem
If a player shoots a laser, we don't just want to know if it hit a bounding box. We need to know exactly which triangle on the mesh it struck, how far away it was, and the surface angle (normal) of the hit so we can place a scorch mark. How do we extract precise polygon data?

### Introduce the concept in isolation
We will fire a line across a scene of random meshes and extract exact collision point data.

```javascript
import * as THREE from 'three';

const scene = new THREE.Scene();
const raycaster = new THREE.Raycaster();
const objects = [];

// Populate scene with 20 objects
for (let i = 0; i < 20; i++) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshStandardMaterial({color: 0x44aaff})
    );
    // Seed positions deterministically for this test
    mesh.position.set(i - 10, 0, 0); 
    mesh.updateMatrixWorld();
    scene.add(mesh);
    objects.push(mesh);
}

// Ray from origin looking down +X
raycaster.set(
    new THREE.Vector3(-15, 0, 0),
    new THREE.Vector3(1, 0, 0)
);

const hits = raycaster.intersectObjects(objects);
console.log('Ray hits:', hits.length);
if (hits.length > 0) {
    console.log('  Distance to first hit:', hits[0].distance);
    console.log('  Intersection point:', hits[0].point.x, hits[0].point.y, hits[0].point.z);
}
```

**Output:**
```text
Ray hits: 20
  Distance to first hit: 4.75
  Intersection point: -10.25 0 0
```

This is called **Raycasting**. A mathematical ray is projected forward. The output proves that the `Raycaster` evaluates all objects, finds the ones that cross the ray's path, and returns a sorted array of rich intersection data objects. The closest hit is strictly evaluated to provide the exact 3D world coordinate where the line pierced the polygon.

### Discard the throwaway
This random raycast script is discarded.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are demonstrating collision pipelines.
- **Files affected:** `lesson-34.html`
- **Change type:** add
- **Location:** Below our sphere math.
- **Dependencies:** Three.js.

### The New Code
```javascript
const raycaster = new THREE.Raycaster();
raycaster.set(new THREE.Vector3(-10, 0, 0), new THREE.Vector3(1, 0, 0));

const targetMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
targetMesh.position.set(0, 0, 0);
targetMesh.updateMatrixWorld();

const hits = raycaster.intersectObjects([targetMesh]);
if (hits.length > 0) {
    const closest = hits[0];
    console.log('Hit at distance:', closest.distance, 'Point:', closest.point);
}
```

### The Updated Project
```html
1: <script type="module">
2:   import * as THREE from 'three';
3:   const scene = new THREE.Scene();
4:   const box1 = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
5:   const box2 = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 2, 2));
6:   const isHit = box1.intersectsBox(box2);
7:   const sphere1 = new THREE.Sphere(new THREE.Vector3(0,0,0), 1.0);
8:   const sphere2 = new THREE.Sphere(new THREE.Vector3(1.5,0,0), 0.8);
9:   const dist = sphere1.center.distanceTo(sphere2.center);
10:  const sphereHit = dist < (sphere1.radius + sphere2.radius);
11:  // ← new
12:  const raycaster = new THREE.Raycaster();
13:  raycaster.set(new THREE.Vector3(-10, 0, 0), new THREE.Vector3(1, 0, 0));
14:  const targetMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
15:  targetMesh.position.set(0, 0, 0);
16:  targetMesh.updateMatrixWorld();
17:  const hits = raycaster.intersectObjects([targetMesh]);
18:  if (hits.length > 0) {
19:      const closest = hits[0];
20:      console.log('Hit at distance:', closest.distance, 'Point:', closest.point);
21:  }
22: </script>
```

We configure a ray to aim straight down the X-axis and manually evaluate a single box sitting at the world origin.

### Mechanical walkthrough
- `const raycaster = new THREE.Raycaster()` instantiates the core utility for tracking linear intersection.
- `raycaster.set(...)` configures the ray's starting origin `(-10, 0, 0)` and its normalized direction vector `(1, 0, 0)` (pointing precisely positive-X).
- `const targetMesh` creates a simple 1x1x1 cube.
- `targetMesh.position.set(0, 0, 0)` places it at the center of the world.
- `targetMesh.updateMatrixWorld()` forces the engine to calculate its exact spatial transforms so the raycaster has accurate data.
- `raycaster.intersectObjects([targetMesh])` executes the deep test. It returns an array.
- `const closest = hits[0]` extracts the very first hit, which Three.js guarantees is the closest due to internal distance sorting.
- `closest.distance` retrieves the distance from origin to impact.
- `closest.point` retrieves the exact `Vector3` coordinate of the collision on the cube's face.

### CS lens
Raycasting is computationally heavy because it is actually a two-phase process inside the engine. First, `intersectObjects` tests the ray against the object's `boundingSphere` (a broadphase check). If that passes, it iterates through every single triangle composing the `BufferGeometry` and performs a ray-triangle intersection math formula (Barycentric coordinates). For a 100,000-triangle mesh, that is 100,000 mathematical checks. 

### SE lens
When using Raycasters, you almost never pass the entire `scene.children` array into `intersectObjects`. That forces the engine to evaluate lights, cameras, and background elements that cannot possibly be hit. Software Engineering discipline dictates maintaining a specific array (e.g., `collidableObjects = []`) containing only the geometry that actually matters to the simulation, drastically reducing the search space.

### Commands needed
Open `lesson-34.html` in a modern browser.

### Run it
The console logs the collision data, confirming a hit at distance 9.5 and point (-0.5, 0, 0).

### One sentence connecting to previous unit
Even with a curated list of collidable objects, comparing every object against every other object scales quadratically.

---

## Concept Unit: Broadphase + Narrowphase Pipeline

### The Problem
If you have 100 asteroids bouncing around, finding out who is hitting whom requires checking Asteroid 1 against 2 through 100, then Asteroid 2 against 3 through 100. That's `(N * (N - 1)) / 2` checks. For 100 items, it's 4,950 checks. For 10,000 items, it's 49,995,000 checks every single frame (60 times a second). How do we survive this O(n²) scaling?

### Introduce the concept in isolation
We will build a two-tier pipeline. A cheap broadphase quickly filters the list, passing only a tiny fraction of candidates to the expensive narrowphase.

```javascript
import * as THREE from 'three';

const entities = [];
for (let i = 0; i < 100; i++) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 4), new THREE.MeshStandardMaterial());
    // Keep them somewhat clustered to ensure some collisions
    mesh.position.set((Math.random()-0.5)*10, (Math.random()-0.5)*10, (Math.random()-0.5)*10);
    mesh.updateMatrixWorld();
    mesh.geometry.computeBoundingSphere();
    entities.push(mesh);
}

function checkCollisions(entities) {
    const pairs = [];
    let checks = 0;
    // O(n^2) broad-phase:
    for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
            checks++;
            const a = entities[i];
            const b = entities[j];
            
            // Broadphase: sphere vs sphere
            const dist = a.position.distanceTo(b.position);
            const ra = a.geometry.boundingSphere.radius * a.scale.x;
            const rb = b.geometry.boundingSphere.radius * b.scale.x;
            
            if (dist < ra + rb) {
                pairs.push([a, b]); // Survive to narrowphase
            }
        }
    }
    console.log(`Performed ${checks} broadphase checks.`);
    return pairs;
}

const collisions = checkCollisions(entities);
console.log('Surviving pairs for narrowphase:', collisions.length);
```

**Output:**
```text
Performed 4950 broadphase checks.
Surviving pairs for narrowphase: 4
```

This is called a **Broadphase + Narrowphase Pipeline**. The output proves that while we still paid the O(n²) cost of looping over all 100 entities (resulting in exactly 4,950 loops), we only used a cheap distance check. The expensive true-mesh intersection test only needs to be run on the 4 pairs that survived, saving thousands of wasted calculations.

### Discard the throwaway
This nested loop isolation script is discarded.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are demonstrating collision pipelines.
- **Files affected:** `lesson-34.html`
- **Change type:** add
- **Location:** Below the raycaster logic.
- **Dependencies:** Three.js.

### The New Code
```javascript
const entities = [];
for (let i = 0; i < 50; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.5));
    m.position.set(Math.random()*10, Math.random()*10, Math.random()*10);
    m.geometry.computeBoundingSphere();
    entities.push(m);
}

const narrowphaseCandidates = [];
for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
        const a = entities[i], b = entities[j];
        const dist = a.position.distanceTo(b.position);
        if (dist < (a.geometry.boundingSphere.radius + b.geometry.boundingSphere.radius)) {
            narrowphaseCandidates.push([a, b]);
        }
    }
}
```

### The Updated Project
```html
1: <script type="module">
2:   import * as THREE from 'three';
3:   const scene = new THREE.Scene();
4:   const box1 = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
5:   const box2 = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 2, 2));
6:   const isHit = box1.intersectsBox(box2);
7:   const sphere1 = new THREE.Sphere(new THREE.Vector3(0,0,0), 1.0);
8:   const sphere2 = new THREE.Sphere(new THREE.Vector3(1.5,0,0), 0.8);
9:   const dist = sphere1.center.distanceTo(sphere2.center);
10:  const sphereHit = dist < (sphere1.radius + sphere2.radius);
11:  const raycaster = new THREE.Raycaster();
12:  raycaster.set(new THREE.Vector3(-10, 0, 0), new THREE.Vector3(1, 0, 0));
13:  const targetMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
14:  targetMesh.position.set(0, 0, 0);
15:  targetMesh.updateMatrixWorld();
16:  const hits = raycaster.intersectObjects([targetMesh]);
17:  if (hits.length > 0) {
18:      const closest = hits[0];
19:  }
20:  // ← new
21:  const entities = [];
22:  for (let i = 0; i < 50; i++) {
23:      const m = new THREE.Mesh(new THREE.SphereGeometry(0.5));
24:      m.position.set(Math.random()*10, Math.random()*10, Math.random()*10);
25:      m.geometry.computeBoundingSphere();
26:      entities.push(m);
27:  }
28:  const narrowphaseCandidates = [];
29:  for (let i = 0; i < entities.length; i++) {
30:      for (let j = i + 1; j < entities.length; j++) {
31:          const a = entities[i], b = entities[j];
32:          const dist = a.position.distanceTo(b.position);
33:          if (dist < (a.geometry.boundingSphere.radius + b.geometry.boundingSphere.radius)) {
34:              narrowphaseCandidates.push([a, b]);
35:          }
36:      }
37:  }
38: </script>
```

We generate 50 random entities, ensure their bounding data is precomputed, and loop through them to extract a filtered array of pairs that are mathematically proven to be overlapping at their outer boundaries.

### Mechanical walkthrough
- `const entities = []` creates an array to hold all dynamic objects.
- `for (let i = 0; i < 50; i++)` runs 50 times.
- `const m = new THREE.Mesh(new THREE.SphereGeometry(0.5))` creates a fresh mesh with a half-unit radius.
- `m.position.set(...)` scrambles its location within a 10x10x10 cube.
- `m.geometry.computeBoundingSphere()` forcibly calculates the base geometry boundary so it is ready for checks.
- `entities.push(m)` adds the mesh to the tracking list.
- `const narrowphaseCandidates = []` holds only the pairs that pass the test.
- `for (let i = 0; i < entities.length; i++)` iterates over every item.
- `for (let j = i + 1; j < entities.length; j++)` iterates starting from `i+1`. This is critical: if A checks B, B does not need to check A. This halves the workload.
- `const a = entities[i], b = entities[j]` grabs the two meshes to compare.
- `const dist = a.position.distanceTo(b.position)` retrieves the absolute distance between their current origins.
- `if (dist < ...)` evaluates if their boundaries cross.
- `narrowphaseCandidates.push([a, b])` stores them together as an array pair to be handled later by exact math.

### CS lens
The algorithm used here, testing `i` against `i+1`, is the standard O(n²) combinatorics loop. O(n²) does not scale. To solve this for massive sets (like 10,000 objects), computer graphics engines use Spatial Partitioning algorithms (like Octrees, Quadtrees, or a Spatial Grid). By dividing the world into chunks, an entity in sector 1 only checks for collisions with other entities registered in sector 1, completely ignoring the other 9,990 objects on the other side of the map, effectively dropping the complexity back down toward O(n).

### SE lens
By separating the broadphase logic entirely from the narrowphase, the architecture allows you to drop in a highly optimized C++ WebAssembly module to handle the spatial grid sorting, returning only the `narrowphaseCandidates` array to JavaScript. The JavaScript then loops over that tiny array to fire game logic events. Separation of responsibilities creates clean optimization seams.

### Commands needed
Open `lesson-34.html` in a modern browser.

### Run it
The background filtering logic works silently.

### One sentence connecting to previous unit
But what happens when the narrowphase candidate itself isn't a simple sphere, but a massive architectural level containing millions of polygons?

---

## Concept Unit: BVH Raycasting

### The Problem
If a player shoots a ray at a complex landscape mesh, the broadphase passes immediately (because the ray definitely hits the giant map's bounding box). The raycaster then falls back to narrowphase: testing every single triangle in the map. If the map has 500,000 triangles, the game stutters or crashes. How do we filter *inside* a single large mesh?

### Introduce the concept in isolation
We will conceptually mirror how a BVH (Bounding Volume Hierarchy) works by testing AABB overlap on sub-volumes. (Real `three-mesh-bvh` requires external CDN loading, so we simulate the mathematical reduction).

```javascript
import * as THREE from 'three';

// Simulate BVH concept with built-in Box3 hierarchy
function aabbOverlap(a, b) {
    return a.min.x <= b.max.x && a.max.x >= b.min.x &&
           a.min.y <= b.max.y && a.max.y >= b.min.y &&
           a.min.z <= b.max.z && a.max.z >= b.min.z;
}

const meshA = new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
const meshB = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 8));
meshB.position.set(0.5, 0, 0);

meshA.geometry.computeBoundingBox(); 
meshB.geometry.computeBoundingBox();

// Create boxes reflecting world position manually
const aabb_A = meshA.geometry.boundingBox.clone(); // Identity at origin
const aabb_B = meshB.geometry.boundingBox.clone();
aabb_B.min.add(meshB.position);
aabb_B.max.add(meshB.position);

console.log('AABB overlap:', aabbOverlap(aabb_A, aabb_B));
console.log('BVH: O(log n) raycasting vs O(n) brute-force');
```

**Output:**
```text
AABB overlap: true
BVH: O(log n) raycasting vs O(n) brute-force
```

This represents the core logic of a **Bounding Volume Hierarchy (BVH)**. The output proves that we can wrap subset chunks of data in bounding boxes. In a true BVH library, the 500,000 triangle map is mathematically sliced in half, placed in two AABBs. Those are sliced in half into four AABBs, continuing down into a tree. The ray checks the root box. If it hits, it checks the left and right child boxes. It instantly ignores the half of the map it misses, turning an O(n) linear triangle search into an O(log n) binary tree traversal.

### Discard the throwaway
This simulated AABB isolation is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-34.html`
- **Change type:** add
- **Location:** Below the broadphase loop.
- **Dependencies:** Three.js.

### The New Code
```javascript
function aabbOverlap(a, b) {
    return a.min.x <= b.max.x && a.max.x >= b.min.x &&
           a.min.y <= b.max.y && a.max.y >= b.min.y &&
           a.min.z <= b.max.z && a.max.z >= b.min.z;
}
const bvhRoot = new THREE.Box3(new THREE.Vector3(-10,-10,-10), new THREE.Vector3(10,10,10));
const bvhLeftChild = new THREE.Box3(new THREE.Vector3(-10,-10,-10), new THREE.Vector3(0,10,10));
const playerBox = new THREE.Box3(new THREE.Vector3(5,0,0), new THREE.Vector3(6,1,1));

if (aabbOverlap(playerBox, bvhRoot)) {
    if (aabbOverlap(playerBox, bvhLeftChild)) {
        console.log("Check left polygons");
    } else {
        console.log("Ignored left half of the world");
    }
}
```

### The Updated Project
```html
1: <script type="module">
2:   import * as THREE from 'three';
3:   const scene = new THREE.Scene();
4:   const box1 = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
5:   const box2 = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 2, 2));
6:   const isHit = box1.intersectsBox(box2);
7:   const sphere1 = new THREE.Sphere(new THREE.Vector3(0,0,0), 1.0);
8:   const sphere2 = new THREE.Sphere(new THREE.Vector3(1.5,0,0), 0.8);
9:   const dist = sphere1.center.distanceTo(sphere2.center);
10:  const sphereHit = dist < (sphere1.radius + sphere2.radius);
11:  const raycaster = new THREE.Raycaster();
12:  raycaster.set(new THREE.Vector3(-10, 0, 0), new THREE.Vector3(1, 0, 0));
13:  const targetMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
14:  targetMesh.position.set(0, 0, 0);
15:  targetMesh.updateMatrixWorld();
16:  const hits = raycaster.intersectObjects([targetMesh]);
17:  if (hits.length > 0) {
18:      const closest = hits[0];
19:  }
20:  const entities = [];
21:  for (let i = 0; i < 50; i++) {
22:      const m = new THREE.Mesh(new THREE.SphereGeometry(0.5));
23:      m.position.set(Math.random()*10, Math.random()*10, Math.random()*10);
24:      m.geometry.computeBoundingSphere();
25:      entities.push(m);
26:  }
27:  const narrowphaseCandidates = [];
28:  for (let i = 0; i < entities.length; i++) {
29:      for (let j = i + 1; j < entities.length; j++) {
30:          const a = entities[i], b = entities[j];
31:          const dist = a.position.distanceTo(b.position);
32:          if (dist < (a.geometry.boundingSphere.radius + b.geometry.boundingSphere.radius)) {
33:              narrowphaseCandidates.push([a, b]);
34:          }
35:      }
36:  }
37:  // ← new
38:  function aabbOverlap(a, b) {
39:      return a.min.x <= b.max.x && a.max.x >= b.min.x &&
40:             a.min.y <= b.max.y && a.max.y >= b.min.y &&
41:             a.min.z <= b.max.z && a.max.z >= b.min.z;
42:  }
43:  const bvhRoot = new THREE.Box3(new THREE.Vector3(-10,-10,-10), new THREE.Vector3(10,10,10));
44:  const bvhLeftChild = new THREE.Box3(new THREE.Vector3(-10,-10,-10), new THREE.Vector3(0,10,10));
45:  const playerBox = new THREE.Box3(new THREE.Vector3(5,0,0), new THREE.Vector3(6,1,1));
46:  
47:  if (aabbOverlap(playerBox, bvhRoot)) {
48:      if (aabbOverlap(playerBox, bvhLeftChild)) {
49:          console.log("Check left polygons");
50:      } else {
51:          console.log("Ignored left half of the world");
52:      }
53:  }
54: </script>
```

We manually recreate the branching logic of a BVH, checking the root box, and then demonstrating how missing a child node entirely aborts further checking.

### Mechanical walkthrough
- `function aabbOverlap(a, b)` defines our raw intersection math directly.
- `return a.min.x <= b.max.x && a.max.x >= b.min.x ...` returns true only if all boundaries interlock on X, Y, and Z.
- `const bvhRoot = new THREE.Box3(...)` defines a massive boundary encapsulating our entire hypothetical world.
- `const bvhLeftChild = new THREE.Box3(...)` defines a smaller subset boundary representing strictly the negative-X half of the geometry.
- `const playerBox = new THREE.Box3(...)` simulates a player located at X=5 (on the right side).
- `if (aabbOverlap(playerBox, bvhRoot))` confirms the player is generally inside the world map.
- `if (aabbOverlap(playerBox, bvhLeftChild))` tests if the player touches the left half. Because the player's min X is 5, and the left child's max X is 0, this immediately fails. The code executes the `else` block, successfully pruning half the map from collision tests.

### CS lens
A BVH structure is an application of Binary Space Partitioning (BSP) trees or k-d trees. When a ray is cast, instead of hitting an O(n) array of triangles, it walks down a tree data structure. By quickly returning `false` on a massive parent AABB, it instantly removes all of that parent's children (thousands of triangles) from the search pool in O(1) time. This hierarchical culling is the exact reason modern 3D games can calculate complex bullet physics in less than 16 milliseconds.

### SE lens
While writing your own AABB overlap test is useful for understanding, in production Software Engineering, you rely on specialized open-source plugins like `three-mesh-bvh`. They patch Three.js's native raycasting to automatically use a pre-calculated tree, meaning you write the exact same `raycaster.intersectObject()` code as before, but the library swaps out the slow internal O(n) loop with an O(log n) tree traversal behind the scenes.

### Commands needed
Open `lesson-34.html` in a modern browser.

### Run it
The console logs `Ignored left half of the world`, demonstrating a successful geometric cull.

### One sentence connecting to previous unit
With the collision math established, we must map our game logic to interact safely with the 3D world.

## Closing

### Connect the pieces
Collision detection is fundamentally about scale. A brute-force O(n²) test of 100 spheres results in 4,950 checks. A raycast against a raw 100,000-triangle landscape performs 100,000 exact intersection math operations. Using tools like AABBs, Sphere boundaries, and hierarchical BVH structures lets us reject the vast majority of those calculations before they ever begin. The art of 3D performance is not doing the math faster; it is doing less math. Next lesson, we will integrate this collision pipeline to drive player movement and physics resolution.
