# Lesson 36: Capstone — Solar System: Orbits, Textures, Real Scale, OrbitControls

This capstone builds a complete solar system simulation, integrating: scene hierarchy (Object3D pivots for orbit), TextureLoader (planet surfaces), PointLight (the Sun), OrbitControls (camera navigation), and time-based animation (Clock + speed factor). Every concept is applied together in one coherent project.

**What you will build**
You will build an interactive 3D solar system featuring a glowing sun, multiple orbiting planets, Saturn's rings, orbital paths, and a starry background. The simulation includes a GUI for controlling orbit speeds and visibility, with camera damping for smooth navigation.

**What you need to know first**
- Lesson 35: Lighting and Textures
- Lesson 34: Camera Controls

**Terms used in this lesson**
- **Importmap** — A JSON configuration inside an HTML script tag that maps module specifiers to URLs, allowing browser-native ES module imports without a bundler.
- **Float32Array** — A typed array of 32-bit floating-point numbers, used for passing raw numerical data efficiently to WebGL buffers.
- **Draw call** — A command from the CPU to the GPU to draw a set of vertices, representing a performance cost.
- **Axial tilt** — The angle between an object's rotational axis and its orbital axis, causing seasons and angled rotation.
- **Delta time (delta)** — The elapsed time in seconds since the last frame, used to make animations framerate-independent.
- **Damping** — A physics-like inertia applied to camera controls, allowing the camera to smoothly glide to a stop instead of halting instantly.
- **CDN (Content Delivery Network)** — A distributed network of servers that delivers library files quickly to users.

**Objects and methods used**

- **`THREE.Scene`**
  - *What it is:* The top-level container for all 3D objects, lights, and cameras.
  - *Implementation:* `const scene = new THREE.Scene();`
  - *Its use:* Holds the sun, planets, lines, and lights.
  - *Type:* Class instance.
  - *Responsibility:* Manages the graph of all 3D entities to be rendered.
  - *Depends on:* Nothing natively, but needs a renderer to be seen.
  - *Connects to:* `WebGLRenderer` during the render loop.
  - *Shape:* Root of the scene graph.

- **`THREE.Color`**
  - *What it is:* A utility object for managing colors.
  - *Implementation:* `new THREE.Color(0x000008)`
  - *Its use:* Sets the background color of the scene.
  - *Type:* Class instance.
  - *Responsibility:* Converts and stores color values (hex, rgb, hsl).
  - *Depends on:* A numeric, string, or RGB input.
  - *Connects to:* Materials and Scene backgrounds.
  - *Shape:* Value object.

- **`THREE.BufferGeometry`**
  - *What it is:* A raw geometry container that stores vertices, normals, and UVs in typed arrays.
  - *Implementation:* `new THREE.BufferGeometry()`
  - *Its use:* Used for the starfield particles and orbit rings.
  - *Type:* Class instance.
  - *Responsibility:* Efficiently structures vertex data for the GPU.
  - *Depends on:* `BufferAttribute` inputs.
  - *Connects to:* Meshes, Points, and Lines.
  - *Shape:* Data container for rendering.

- **`THREE.BufferAttribute`**
  - *What it is:* A wrapper for typed arrays linking data to WebGL attributes.
  - *Implementation:* `new THREE.BufferAttribute(array, itemSize)`
  - *Its use:* Assigns the Float32Array of star positions to the geometry.
  - *Type:* Class instance.
  - *Responsibility:* Tells WebGL how to read a flat array into vectors.
  - *Depends on:* A typed array and an item size (e.g., 3 for XYZ).
  - *Connects to:* `BufferGeometry`.
  - *Shape:* Data binding object.

- **`THREE.PointsMaterial`**
  - *What it is:* A material specifically for rendering point clouds.
  - *Implementation:* `new THREE.PointsMaterial({size: 0.3, color: 0xffffff})`
  - *Its use:* Defines the look of the individual stars.
  - *Type:* Class instance.
  - *Responsibility:* Colors and sizes vertices rendered as GL_POINTS.
  - *Depends on:* Configuration parameters.
  - *Connects to:* `THREE.Points`.
  - *Shape:* Rendering instruction set.

- **`THREE.Points`**
  - *What it is:* A 3D object for rendering particles.
  - *Implementation:* `new THREE.Points(geometry, material)`
  - *Its use:* Renders the entire starfield in one draw call.
  - *Type:* Class instance.
  - *Responsibility:* Instructs the renderer to draw points instead of triangles.
  - *Depends on:* Geometry and PointsMaterial.
  - *Connects to:* Scene.
  - *Shape:* Scene graph node.

- **`THREE.PointLight`**
  - *What it is:* A light emitting in all directions from a single point.
  - *Implementation:* `new THREE.PointLight(0xffffff, 3, 200)`
  - *Its use:* Acts as the sun, illuminating the planets.
  - *Type:* Class instance.
  - *Responsibility:* Calculates distance-based lighting for standard/physical materials.
  - *Depends on:* Color, intensity, and range/distance limit.
  - *Connects to:* Scene and mesh materials.
  - *Shape:* Scene graph node.

- **`THREE.Object3D`**
  - *What it is:* The base class for most objects in Three.js, containing position, rotation, and scale.
  - *Implementation:* `new THREE.Object3D()`
  - *Its use:* Acts as an invisible pivot point at the center of the solar system.
  - *Type:* Class instance.
  - *Responsibility:* Manages hierarchical transformations (parent-child relationships).
  - *Depends on:* Nothing natively.
  - *Connects to:* Scene and child meshes.
  - *Shape:* Scene graph node structure.

- **`OrbitControls`**
  - *What it is:* An add-on that allows orbiting, panning, and zooming the camera.
  - *Implementation:* `new OrbitControls(camera, renderer.domElement)`
  - *Its use:* Lets the user explore the solar system.
  - *Type:* Class instance.
  - *Responsibility:* Captures mouse/touch input and updates camera transforms.
  - *Depends on:* A camera and an HTML DOM element.
  - *Connects to:* User input events and the camera object.
  - *Shape:* Input controller.

## Concept Unit: Scene setup and the Sun

### The Problem
We need an environment to place our planets in. A plain black background is dull. How do we create a massive field of stars efficiently without creating thousands of individual mesh spheres, which would crash the browser? 

### Introduce the concept in isolation
```html
<script type="importmap">
{"imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"
}}
</script>
<script type="module">
import * as THREE from 'three';
const geo = new THREE.BufferGeometry();
const pos = new Float32Array([0,0,0, 10,10,0, -10,5,0]);
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const mat = new THREE.PointsMaterial({color: 0xff0000, size: 2});
const points = new THREE.Points(geo, mat);
console.log('Points created with vertex count:', geo.attributes.position.count);
</script>
```
Output: `Points created with vertex count: 3`. This proves that `THREE.Points` can turn a raw array of numbers into a single object holding multiple distinct coordinates.

### Discard the throwaway
The isolated points example is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `lesson-36.html` (created)
- **Change type:** add
- **Location:** In the `<script type="module">` tag.
- **Dependencies:** Three.js CDN importmap.

### The New Code
```javascript
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000008);

// Stars: particle field
const starGeo = new THREE.BufferGeometry();
const starPositions = new Float32Array(3000);
for (let i = 0; i < 3000; i += 3) {
    starPositions[i  ] = (Math.random()-0.5)*400;
    starPositions[i+1] = (Math.random()-0.5)*400;
    starPositions[i+2] = (Math.random()-0.5)*400;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions,3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({size:0.3,color:0xffffff})));

// Sun: emissive sphere + PointLight
const sunMat = new THREE.MeshStandardMaterial({color:0xffdd00, emissive:0xffaa00, emissiveIntensity:2});
const sun = new THREE.Mesh(new THREE.SphereGeometry(2,32,16), sunMat);
scene.add(sun);
const sunLight = new THREE.PointLight(0xffffff, 3, 200);
sunLight.position.set(0,0,0);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x111111,1));
console.log('Sun radius: 2 world units. Star count:', starPositions.length/3);
```

### The Updated Project
```html
// ← new
<!DOCTYPE html>
<html>
<head>
    <title>Solar System</title>
    <style>body { margin: 0; overflow: hidden; }</style>
    <script type="importmap">
    {"imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
    }}
    </script>
</head>
<body>
    <script type="module">
        import * as THREE from 'three';

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000008);

        // Stars: particle field
        const starGeo = new THREE.BufferGeometry();
        const starPositions = new Float32Array(3000);
        for (let i = 0; i < 3000; i += 3) {
            starPositions[i  ] = (Math.random()-0.5)*400;
            starPositions[i+1] = (Math.random()-0.5)*400;
            starPositions[i+2] = (Math.random()-0.5)*400;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions,3));
        scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({size:0.3,color:0xffffff})));

        // Sun: emissive sphere + PointLight
        const sunMat = new THREE.MeshStandardMaterial({color:0xffdd00, emissive:0xffaa00, emissiveIntensity:2});
        const sun = new THREE.Mesh(new THREE.SphereGeometry(2,32,16), sunMat);
        scene.add(sun);
        const sunLight = new THREE.PointLight(0xffffff, 3, 200);
        sunLight.position.set(0,0,0);
        scene.add(sunLight);
        scene.add(new THREE.AmbientLight(0x111111,1));
        console.log('Sun radius: 2 world units. Star count:', starPositions.length/3);
    </script>
</body>
</html>
```
This sets up an HTML document, loads Three.js, generates 1000 stars as a single point cloud, creates a glowing sun, and adds a point light at the center.

### Mechanical walkthrough
- `const scene = new THREE.Scene();` instantiates the master scene graph.
- `scene.background = new THREE.Color(0x000008);` assigns a very dark blue background.
- `new Float32Array(3000)` creates a fixed array of 3000 slots (for 1000 x,y,z coordinates).
- The `for` loop populates the array with random numbers from -200 to 200.
- `new THREE.BufferAttribute(starPositions,3)` informs Three.js that every 3 numbers represent one vertex.
- `starGeo.setAttribute(...)` locks the attribute to the geometry.
- `new THREE.Points(...)` bundles the geometry and material into a renderable object.
- `new THREE.MeshStandardMaterial({color:0xffdd00, emissive:0xffaa00, emissiveIntensity:2})` creates a material that catches light but also heavily glows its own yellow-orange light.
- `new THREE.PointLight(0xffffff, 3, 200)` creates a white light, intensity 3, that falls off over 200 units.
- `scene.add(...)` inserts the objects into the active hierarchy.

### CS lens
Using `THREE.Points` is a fundamental Computer Graphics optimization. Rather than defining spherical geometry (hundreds of triangles) for every star, a point particle requires exactly one vertex in memory. The GPU plots a single pixel or small square (controlled by `size`) for each vertex. This reduces 1000 spheres (millions of triangles) into just 1000 vertices and exactly 1 draw call.

### SE lens
Separating the visual representation of the sun (the Mesh) from the actual illumination source (the PointLight) is an architectural decoupling common in rendering engines. A mesh cannot natively emit physical light that affects other objects; light objects cannot be natively seen by the camera. Combining them in the scene graph provides the illusion of a light-emitting object.

### Commands needed
None yet (runs in browser).

### Run it
No command. The console prints: `Sun radius: 2 world units. Star count: 1000`.

### One sentence connecting to previous unit
With the central sun and background established, we need a mechanism to make objects circle around it.

## Concept Unit: Planet class with orbit pivot

### The Problem
Calculating circular motion requires trigonometry (sine and cosine) updated every single frame for every planet. If we have 8 planets, doing raw math to update `x` and `z` positions every tick is tedious and prone to desync if we want to pause or change speeds. How can we make planets orbit using built-in rotation?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';
const pivot = new THREE.Object3D();
const item = new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
item.position.x = 10;
pivot.add(item);
pivot.rotation.y = Math.PI; // 180 degrees
const worldPos = new THREE.Vector3();
item.getWorldPosition(worldPos);
console.log('Item world position:', worldPos.x, worldPos.y, worldPos.z);
```
Output: `Item world position: -10 0 0`. This proves that rotating the parent pivot, while the child has a fixed local offset, swings the child through 3D space in a perfect arc.

### Discard the throwaway
The pivot rotation example is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-36.html`
- **Change type:** add
- **Location:** Below the sun setup.
- **Dependencies:** None.

### The New Code
```javascript
class Planet {
    constructor(scene, {name, radius, distance, color, orbitSpeed, axialTilt=0}) {
        this.name = name;
        this.orbitSpeed = orbitSpeed;
        
        this.pivot = new THREE.Object3D();
        scene.add(this.pivot);
        
        const geo = new THREE.SphereGeometry(radius, 32, 16);
        const mat = new THREE.MeshStandardMaterial({color});
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.x = distance;
        this.mesh.rotation.z = axialTilt;
        
        this.pivot.add(this.mesh);
    }
    update(delta) {
        this.pivot.rotation.y += this.orbitSpeed * delta;
        this.mesh.rotation.y += 0.5 * delta;
    }
    getWorldPosition() { return this.mesh.getWorldPosition(new THREE.Vector3()); }
}

const earth = new Planet(scene, {name:'Earth', radius:0.5, distance:10, color:0x2244aa, orbitSpeed:0.5});
console.log('Earth orbit distance: 10 units, speed: 0.5 rad/s');
```

### The Updated Project
```html
        scene.add(sunLight);
        scene.add(new THREE.AmbientLight(0x111111,1));
        console.log('Sun radius: 2 world units. Star count:', starPositions.length/3);

        // ← new
        class Planet {
            constructor(scene, {name, radius, distance, color, orbitSpeed, axialTilt=0}) {
                this.name = name;
                this.orbitSpeed = orbitSpeed;
                
                this.pivot = new THREE.Object3D();
                scene.add(this.pivot);
                
                const geo = new THREE.SphereGeometry(radius, 32, 16);
                const mat = new THREE.MeshStandardMaterial({color});
                this.mesh = new THREE.Mesh(geo, mat);
                this.mesh.position.x = distance;
                this.mesh.rotation.z = axialTilt;
                
                this.pivot.add(this.mesh);
            }
            update(delta) {
                this.pivot.rotation.y += this.orbitSpeed * delta;
                this.mesh.rotation.y += 0.5 * delta;
            }
            getWorldPosition() { return this.mesh.getWorldPosition(new THREE.Vector3()); }
        }

        const earth = new Planet(scene, {name:'Earth', radius:0.5, distance:10, color:0x2244aa, orbitSpeed:0.5});
        console.log('Earth orbit distance: 10 units, speed: 0.5 rad/s');
```
This introduces an OOP class wrapper. It creates an empty `Object3D` pivot at the sun's center, offsets the planet mesh by a distance, and makes the mesh a child of the pivot. Rotating the pivot orbits the planet.

### Mechanical walkthrough
- `class Planet` defines our blueprint.
- `this.pivot = new THREE.Object3D();` spawns an invisible transform node at `0,0,0`.
- `this.mesh.position.x = distance;` slides the planet sideways away from the center.
- `this.mesh.rotation.z = axialTilt;` applies a static tilt to the planet itself.
- `this.pivot.add(this.mesh);` establishes the parent-child relationship.
- `this.pivot.rotation.y += this.orbitSpeed * delta;` spins the central pivot every frame based on elapsed time, swinging the child mesh through space.
- `this.mesh.rotation.y += 0.5 * delta;` spins the planet on its own tilted local Y axis (simulating a day).

### CS lens
Hierarchical scene graphs resolve transforms via Matrix Multiplication. The child's local transformation matrix is multiplied by the parent's matrix. Because the parent (pivot) rotates, its matrix encodes that rotation. When the child (at local x=10) is multiplied through the parent, its resulting world position naturally plots a circle. This pushes the trigonometry off the CPU and into the GPU's matrix hardware.

### SE lens
Wrapping the Three.js mesh and pivot inside a custom `Planet` class creates an abstraction boundary. The main loop doesn't need to know *how* a planet orbits; it only calls `planet.update(delta)`. Encapsulating the complex pivot hierarchy inside the class keeps the top-level script clean.

### Commands needed
None.

### Run it
Output: `Earth orbit distance: 10 units, speed: 0.5 rad/s`.

### One sentence connecting to previous unit
Now that the orbital mechanics are proven with Earth, we can generate the entire solar system from data.

## Concept Unit: Adding all planets with orbital rings

### The Problem
We have the class, but we need 8 planets. Stating `new Planet()` eight times is verbose. Furthermore, empty space is hard to judge visually; how do we draw faint lines to show the exact orbital path each planet takes?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';
const pts = [];
pts.push(new THREE.Vector3(0,0,0));
pts.push(new THREE.Vector3(1,1,1));
const geo = new THREE.BufferGeometry().setFromPoints(pts);
const line = new THREE.Line(geo, new THREE.LineBasicMaterial({color:0xff0000}));
console.log('Line vertices:', geo.attributes.position.count);
```
Output: `Line vertices: 2`. `setFromPoints` easily converts an array of `Vector3` objects into a geometry buffer that a `Line` object can draw.

### Discard the throwaway
The single line geometry example is deleted.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-36.html`
- **Change type:** replace
- **Location:** Replace the single Earth variable.
- **Dependencies:** None.

### The New Code
```javascript
const planetData = [
    {name:'Mercury', radius:0.2, distance:4,  color:0x888888, orbitSpeed:1.2},
    {name:'Venus',   radius:0.4, distance:6,  color:0xffcc44, orbitSpeed:0.8},
    {name:'Earth',   radius:0.5, distance:9,  color:0x2244aa, orbitSpeed:0.5, axialTilt:0.41},
    {name:'Mars',    radius:0.3, distance:12, color:0xcc4422, orbitSpeed:0.35},
    {name:'Jupiter', radius:1.2, distance:18, color:0xbb9955, orbitSpeed:0.15},
    {name:'Saturn',  radius:1.0, distance:24, color:0xddcc88, orbitSpeed:0.1},
    {name:'Uranus',  radius:0.7, distance:29, color:0x88ccff, orbitSpeed:0.07},
    {name:'Neptune', radius:0.65,distance:33, color:0x3344cc, orbitSpeed:0.05},
];

function makeOrbitRing(radius, scene) {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
        const a = (i/64)*Math.PI*2;
        pts.push(new THREE.Vector3(Math.cos(a)*radius, 0, Math.sin(a)*radius));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({color:0x333333})));
}

const planets = planetData.map(d => { 
    makeOrbitRing(d.distance, scene); 
    return new Planet(scene, d); 
});
console.log('Planets created:', planets.length);
```

### The Updated Project
```html
        // ... previous code ...
        // ← new (replacing Earth)
        const planetData = [
            {name:'Mercury', radius:0.2, distance:4,  color:0x888888, orbitSpeed:1.2},
            {name:'Venus',   radius:0.4, distance:6,  color:0xffcc44, orbitSpeed:0.8},
            {name:'Earth',   radius:0.5, distance:9,  color:0x2244aa, orbitSpeed:0.5, axialTilt:0.41},
            {name:'Mars',    radius:0.3, distance:12, color:0xcc4422, orbitSpeed:0.35},
            {name:'Jupiter', radius:1.2, distance:18, color:0xbb9955, orbitSpeed:0.15},
            {name:'Saturn',  radius:1.0, distance:24, color:0xddcc88, orbitSpeed:0.1},
            {name:'Uranus',  radius:0.7, distance:29, color:0x88ccff, orbitSpeed:0.07},
            {name:'Neptune', radius:0.65,distance:33, color:0x3344cc, orbitSpeed:0.05},
        ];

        function makeOrbitRing(radius, scene) {
            const pts = [];
            for (let i = 0; i <= 64; i++) {
                const a = (i/64)*Math.PI*2;
                pts.push(new THREE.Vector3(Math.cos(a)*radius, 0, Math.sin(a)*radius));
            }
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({color:0x333333})));
        }

        const planets = planetData.map(d => { 
            makeOrbitRing(d.distance, scene); 
            return new Planet(scene, d); 
        });
        console.log('Planets created:', planets.length);
```
We define an array of configurations, then map over it to spawn the `Planet` instances and draw a static circular `Line` for each orbit using math.

### Mechanical walkthrough
- `const planetData` defines a declarative array of POJOs (Plain Old JavaScript Objects).
- `function makeOrbitRing` accepts a distance.
- `const a = (i/64)*Math.PI*2;` divides a full circle (2 PI radians) into 64 slices.
- `Math.cos(a)*radius` and `Math.sin(a)*radius` manually calculate the X and Z coordinates of the circle.
- `setFromPoints(pts)` converts the array of Vector3s into buffer attributes.
- `planetData.map(...)` iterates the array, draws the ring, instantiates the class, and returns the class instance to the new `planets` array.

### CS lens
We use manual trigonometry here to generate vertices for a static geometry, rather than using an Object3D pivot. This is because the visual ring doesn't move. Pre-computing vertices once at load time is extremely cheap, creating a static asset the GPU draws effortlessly.

### SE lens
Data-Driven Design: By extracting the properties of the planets into a JSON-like array `planetData`, we decouple the *data* of the solar system from the *logic* that builds it. If we want to add Pluto or a fictional planet, we just add one object to the array; zero logic changes.

### Commands needed
None.

### Run it
Output: `Planets created: 8`.

### One sentence connecting to previous unit
The solar system is populated, but Saturn is missing its most distinct visual feature, and we have no way to view it all.

## Concept Unit: Saturn’s rings and camera setup

### The Problem
Saturn requires flat, wide geometry attached directly to it. Once added, we need a Camera to see the scene, and controls to allow the user to fly around it smoothly.

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';
const geo = new THREE.RingGeometry(1, 2, 8);
console.log('Ring indices count:', geo.index.count);
```
Output: `Ring indices count: 48`. A `RingGeometry` generates a 2D flat disk with a hole in the center, built from triangles.

### Discard the throwaway
The ring geometry example is deleted.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-36.html`
- **Change type:** add
- **Location:** Below the planets array creation.
- **Dependencies:** `OrbitControls` imported from `three/addons/`.

### The New Code
```javascript
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function makeSaturnRings(saturnMesh) {
    const geo = new THREE.RingGeometry(1.4, 2.5, 64);
    const mat = new THREE.MeshBasicMaterial({
        color: 0xccbb88,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
    });
    const rings = new THREE.Mesh(geo, mat);
    rings.rotation.x = Math.PI / 2;
    saturnMesh.add(rings);
    return rings;
}
makeSaturnRings(planets[5].mesh); // Saturn is index 5

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 500);
camera.position.set(0, 25, 50);

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 150;
console.log('Saturn rings: RingGeometry(1.4, 2.5, 64)');
```

### The Updated Project
```html
        // ... planets mapped ...
        // ← new
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

        function makeSaturnRings(saturnMesh) {
            const geo = new THREE.RingGeometry(1.4, 2.5, 64);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xccbb88,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.7,
            });
            const rings = new THREE.Mesh(geo, mat);
            rings.rotation.x = Math.PI / 2;
            saturnMesh.add(rings);
            return rings;
        }
        makeSaturnRings(planets[5].mesh);

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 500);
        camera.position.set(0, 25, 50);

        const renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 5;
        controls.maxDistance = 150;
        console.log('Saturn rings: RingGeometry(1.4, 2.5, 64)');
```
We define a function that attaches a flat, translucent ring directly to Saturn's mesh, setup the standard camera and WebGL renderer, and attach `OrbitControls` with physics damping enabled.

### Mechanical walkthrough
- `THREE.RingGeometry(1.4, 2.5, 64)` spans from inner radius 1.4 to outer 2.5 in 64 segments.
- `side: THREE.DoubleSide` tells the renderer not to cull the backface; rings must be visible from underneath.
- `rings.rotation.x = Math.PI / 2` lays the ring flat on the XZ plane.
- `saturnMesh.add(rings)` adds it to Saturn. As Saturn moves through space, the rings move perfectly with it.
- `new THREE.PerspectiveCamera(...)` creates the view. `500` is the far clipping plane, ensuring the outer planets remain visible.
- `new OrbitControls(...)` attaches mouse listeners to the canvas.
- `enableDamping = true` applies a friction algorithm so releasing the mouse makes the camera slide to a halt rather than stopping instantly.

### CS lens
Scene graph traversal applies transforms recursively. By adding the rings to the Saturn mesh, which is a child of the Saturn pivot, which is a child of the Scene, the rings' final world position is: `Scene * Pivot * Saturn * Rings`. Three.js computes this deep matrix chain automatically every frame.

### SE lens
Hardcoding `planets[5]` relies on magic numbers and strict array ordering. In a larger production app, we would prefer a lookup like `planets.find(p => p.name === 'Saturn')` to make the code resilient to array reordering or additions.

### Commands needed
None.

### Run it
Output: `Saturn rings: RingGeometry(1.4, 2.5, 64)`.

### One sentence connecting to previous unit
We have our setup, camera, and controls, but nothing is moving yet because we have no render loop.

## Concept Unit: Animation loop with speed control and UI

### The Problem
The scene exists statically. We need to continuously render it, advance time, and provide a user interface so the user can speed up time, pause, or hide the orbital rings without recompiling code.

### Introduce the concept in isolation
```javascript
const params = { speed: 1.0 };
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';
const gui = new GUI();
gui.add(params, 'speed', 0, 5, 0.1);
console.log('GUI created for speed control.');
```
Output: `GUI created`. The `lil-gui` library reads an object property, creates an HTML slider, and natively mutates that property's value when the user drags the slider.

### Discard the throwaway
The isolated GUI example is deleted.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-36.html`
- **Change type:** add
- **Location:** At the bottom of the script.
- **Dependencies:** `lil-gui` module.

### The New Code
```javascript
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

const params = { speed: 1.0, showOrbits: true, pauseAnimation: false };
const gui = new GUI();
gui.add(params,'speed',0,5,0.1).name('Orbit Speed');
gui.add(params,'showOrbits').name('Show Orbits').onChange(v => {
    scene.traverse(obj => { if(obj.isLine) obj.visible=v; });
});
gui.add(params,'pauseAnimation').name('Pause');

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    
    if (!params.pauseAnimation) {
        sun.rotation.y += 0.2 * delta;
        planets.forEach(p => p.update(delta * params.speed));
    }
    
    controls.update(); 
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
```

### The Updated Project
```html
        // ... controls setup ...
        // ← new
        import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

        const params = { speed: 1.0, showOrbits: true, pauseAnimation: false };
        const gui = new GUI();
        gui.add(params,'speed',0,5,0.1).name('Orbit Speed');
        gui.add(params,'showOrbits').name('Show Orbits').onChange(v => {
            scene.traverse(obj => { if(obj.isLine) obj.visible=v; });
        });
        gui.add(params,'pauseAnimation').name('Pause');

        const clock = new THREE.Clock();

        function animate() {
            requestAnimationFrame(animate);
            const delta = clock.getDelta();
            
            if (!params.pauseAnimation) {
                sun.rotation.y += 0.2 * delta;
                planets.forEach(p => p.update(delta * params.speed));
            }
            
            controls.update(); 
            renderer.render(scene, camera);
        }
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth/window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
```
We initialize the UI panel, setup a continuous render loop using `requestAnimationFrame`, apply the time `delta` modified by our GUI speed, ensure controls are updated for damping, and handle window resizing.

### Mechanical walkthrough
- `const params` holds state for the GUI.
- `gui.add(...)` wires a UI element to a specific key in `params`.
- `.onChange(v => ...)` fires a callback when the toggle is clicked.
- `scene.traverse(obj => ...)` recursively walks the entire scene graph. We find all rings via `obj.isLine` and toggle their `visible` property.
- `const clock = new THREE.Clock();` tracks time internally.
- `requestAnimationFrame(animate)` tells the browser to call `animate` before the next repaint, creating an infinite loop at the monitor's refresh rate.
- `clock.getDelta()` returns the fractional seconds since the last call.
- `planets.forEach(...)` calls our custom class update method, passing the delta scaled by the GUI speed modifier.
- `controls.update()` must be called in the loop for `enableDamping` to calculate the gradual slow-down friction.
- `renderer.render(scene, camera)` paints the frame to the canvas.
- `window.addEventListener('resize')` ensures the camera aspect ratio and canvas size stay synced with the browser window.

### CS lens
Multiplying `delta` by `params.speed` is an implementation of "Time Scaling". Because all movement in our engine is bound to `delta` (time) rather than frames, multiplying the time factor scales the simulation speed uniformly without altering the framerate or causing physics jitter.

### SE lens
Using `scene.traverse` to toggle lines is a powerful pattern because the GUI doesn't need to hold references to an array of lines. It broadcasts a state change to the scene graph itself. This loose coupling means we could add or remove orbits dynamically and the toggle logic would still perfectly affect all of them.

### Commands needed
Open `lesson-36.html` in a modern browser (serve via `http.server` for textures, though not strictly required here as we used colors).
`python -m http.server`

### Run it
No console output. The window renders the moving solar system, complete with controls and UI.

### One sentence connecting to previous unit
The capstone is complete, bringing all the concepts together.

## Closing

### Connect the pieces
Trace Earth at t=10s with speed=1: `delta` accumulates. Earth's pivot `rotation.y` becomes `0.5 * 10 = 5` radians (approx 286 degrees around the sun). Earth's world position transforms through the pivot matrix to `(10*cos(5), 0, 10*sin(5))`, ending up at approximately `(2.84, 0, -9.59)`. The entire hierarchy behaves cohesively. If you added a Moon mesh to the Earth mesh, it would automatically follow Earth's orbit and rotation for free due to the scene graph. You have successfully mastered Three.js fundamentals.
