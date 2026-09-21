# Lesson 02: Geometry and Mesh — Shapes, Wireframe, and Multiple Objects

What you will build: The reader understands BufferGeometry (the data structure of vertices), expands beyond the cube to SphereGeometry, CylinderGeometry, TorusGeometry, and PlaneGeometry, uses wireframe mode to see the mesh, and adds multiple objects at different positions. The transferable insight: every 3D object is just arrays of numbers in GPU memory. Geometry = the shape data. Material = how it looks. Mesh = geometry + material.

What you need to know first: Lessons 00-01.

**Terms used in this lesson**
- **BufferGeometry** — The fundamental data structure for all 3D geometry in Three.js, composed of typed arrays of numbers (vertices, normals, uvs, indices) rather than individual objects, designed specifically for fast transfer to GPU memory.
- **Wireframe** — A rendering mode where only the edges of the triangles making up a mesh are drawn, not the filled faces inside them, useful for seeing the structural skeleton of an object.
- **Float32BufferAttribute** — A wrapper around a Float32Array that tells the GPU how to read those raw floats (e.g., "read 3 floats at a time to form one position vector").
- **Vertex Normals** — Vectors extending perpendicular from a vertex, used by the GPU to calculate how light hits a surface.
- **Index buffer** — An array of integers that groups vertices into triangles. Instead of duplicating vertices that are shared between triangles, the index buffer says "triangle 1 uses vertices 0, 1, 2".

**Objects and methods used**

- **THREE.BoxGeometry**
  - *What it is:* A factory class for generating the vertex data of a rectangular cuboid.
  - *Implementation:* `class BoxGeometry extends BufferGeometry`
  - *Its use:* We use it to create our first basic shape.
  - *Type:* Class
  - *Responsibility:* Computes and populates a BufferGeometry with the positions, normals, uvs, and indices necessary to form a 3D box.
  - *Depends on:* Dimensions (width, height, depth) and segment counts.
  - *Connects to:* Passed into a `Mesh` alongside a Material.
  - *Shape:* Data generation utility within the Three.js library.

- **THREE.SphereGeometry**
  - *What it is:* A factory class for generating the vertex data of a sphere.
  - *Implementation:* `class SphereGeometry extends BufferGeometry`
  - *Its use:* We use it to create round objects and see how segment counts affect vertex counts.
  - *Type:* Class
  - *Responsibility:* Generates vertices and indices mapping a 2D grid onto a sphere using spherical coordinates.
  - *Depends on:* Radius, widthSegments, and heightSegments.
  - *Connects to:* Passed into a `Mesh`.
  - *Shape:* Data generation utility.

- **THREE.CylinderGeometry**
  - *What it is:* A factory class for generating the vertex data of a cylinder (or cone, if tapered).
  - *Implementation:* `class CylinderGeometry extends BufferGeometry`
  - *Its use:* Used to add another standard primitive to our scene.
  - *Type:* Class
  - *Responsibility:* Generates the geometry for a cylinder, including caps and side faces.
  - *Depends on:* Top radius, bottom radius, height, and radial segments.
  - *Connects to:* Passed into a `Mesh`.
  - *Shape:* Data generation utility.

- **THREE.TorusGeometry**
  - *What it is:* A factory class for generating the vertex data of a donut shape.
  - *Implementation:* `class TorusGeometry extends BufferGeometry`
  - *Its use:* Used to demonstrate a shape with a higher vertex count and complex topology.
  - *Type:* Class
  - *Responsibility:* Generates the geometry for a torus by sweeping a circle along a larger circular path.
  - *Depends on:* Radius, tube radius, radial segments, tubular segments.
  - *Connects to:* Passed into a `Mesh`.
  - *Shape:* Data generation utility.

- **THREE.PlaneGeometry**
  - *What it is:* A factory class for generating the vertex data of a flat 2D rectangle in 3D space.
  - *Implementation:* `class PlaneGeometry extends BufferGeometry`
  - *Its use:* We use it to create a flat ground surface.
  - *Type:* Class
  - *Responsibility:* Generates a flat grid of vertices.
  - *Depends on:* Width and height.
  - *Connects to:* Passed into a `Mesh`, often rotated to lie flat on the ground.
  - *Shape:* Data generation utility.

- **THREE.Mesh**
  - *What it is:* A 3D object that ties together geometry (shape) and material (appearance).
  - *Implementation:* `class Mesh extends Object3D`
  - *Its use:* We instantiate meshes to place our geometries into the scene.
  - *Type:* Class
  - *Responsibility:* Acts as the scenegraph node that actually renders, holding a reference to both its shape data and its visual properties.
  - *Depends on:* A `BufferGeometry` instance and a `Material` instance.
  - *Connects to:* Added to a `Scene`. Handled by the `WebGLRenderer`.
  - *Shape:* Core structural node in the scene graph.

- **THREE.BufferAttribute**
  - *What it is:* Defines how the GPU should read a typed array.
  - *Implementation:* `class BufferAttribute`
  - *Its use:* We use it to manually define positions for a custom triangle.
  - *Type:* Class
  - *Responsibility:* Stores an array of data and its itemSize (how many array elements make up one vertex component).
  - *Depends on:* A typed array (like `Float32Array`) and an integer `itemSize`.
  - *Connects to:* Attached to a `BufferGeometry` via `setAttribute`.
  - *Shape:* Data structure mapping JavaScript arrays to WebGL buffers.

## Concept Unit: BufferGeometry — what geometry actually is

### The Problem
When we create a shape in Three.js, what is it actually made of under the hood? If we want to manipulate it, what kind of data are we touching?
- What kind of data structure would you use to store a 3D position?
- Why might it be a bad idea to create a separate JavaScript object (like `{x: 1, y: 2, z: 3}`) for every single corner of a complex shape?

### Introduce the concept in isolation
We will inspect the underlying data of a basic cube. This is called a **BufferGeometry**.

```javascript
import * as THREE from 'three';

const geo = new THREE.BoxGeometry(1, 1, 1);

// Geometry IS a BufferGeometry: arrays of floats in typed arrays
const positions = geo.attributes.position;
console.log('Position attribute type:', positions.constructor.name); 
console.log('Vertex count:', positions.count);     
console.log('Item size:', positions.itemSize);     
// First 3 values = first vertex position:
console.log('Vertex 0:', positions.getX(0), positions.getY(0), positions.getZ(0));

// Index buffer: tells GPU which vertices form each triangle
// 2 triangles per face * 6 faces = 12 triangles = 36 indices
const index = geo.index;
console.log('Index count:', index.count);  
```
**Output:**
```
Position attribute type: Float32BufferAttribute
Vertex count: 24
Item size: 3
Vertex 0: -0.5 -0.5 0.5
Index count: 36
```
This proves that 3D shapes are not magical solid objects; they are just raw arrays of numbers. A `BoxGeometry(1,1,1)` has 6 faces, each made of 2 triangles. It defines 4 unique vertices per face (24 position entries total). The index buffer contains 36 entries pointing into the position array to form the 12 triangles.

### Discard the throwaway
This isolated logging script is discarded and will not be added to our project.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are demonstrating geometry primitives.
- **Files affected:** `lesson-02.html` (created).
- **Change type:** Add.
- **Location:** Inside the main `<script type="module">` block.
- **Dependencies:** Three.js loaded via importmap.

### The New Code
```html
<script type="module">
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.set(0, 0, 5);

const geo = new THREE.BoxGeometry(1, 1, 1);
const mat = new THREE.MeshBasicMaterial({color: 0xffffff});
const mesh = new THREE.Mesh(geo, mat);
scene.add(mesh);
renderer.render(scene, camera);
</script>
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <head>
4:   <style>body { margin: 0; } canvas { display: block; }</style>
5:   <script type="importmap">
6:     { "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js" } }
7:   </script>
8: </head>
9: <body>
10:   <canvas id="c"></canvas>
11:   <script type="module"> // ← new
12:   import * as THREE from 'three'; // ← new
13:   
14:   const scene = new THREE.Scene(); // ← new
15:   const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000); // ← new
16:   const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias: true}); // ← new
17:   renderer.setSize(window.innerWidth, window.innerHeight); // ← new
18:   camera.position.set(0, 0, 5); // ← new
19:   
20:   const geo = new THREE.BoxGeometry(1, 1, 1); // ← new
21:   const mat = new THREE.MeshBasicMaterial({color: 0xffffff}); // ← new
22:   const mesh = new THREE.Mesh(geo, mat); // ← new
23:   scene.add(mesh); // ← new
24:   renderer.render(scene, camera); // ← new
25:   </script> <!-- new -->
26: </body>
27: </html>
```
We have initialized a basic Three.js scene with a single white cube.

### Mechanical walkthrough
- `<script type="module">`: Declares the script as an ES6 module, allowing imports.
- `import * as THREE from 'three'`: Imports the entire Three.js namespace.
- `new THREE.Scene()`: Creates the root graph node holding everything.
- `new THREE.PerspectiveCamera(...)`: Creates a camera.
- `new THREE.WebGLRenderer(...)`: Creates the renderer bound to our canvas.
- `renderer.setSize(...)`: Sets the rendering resolution.
- `camera.position.set(0, 0, 5)`: Moves the camera back 5 units on the Z axis.
- `new THREE.BoxGeometry(1, 1, 1)`: Creates a 1x1x1 cube geometry.
- `new THREE.MeshBasicMaterial({color: 0xffffff})`: Creates an unlit white material.
- `new THREE.Mesh(geo, mat)`: Combines the geometry and material into a renderable object.
- `scene.add(mesh)`: Inserts the mesh into the scene graph.
- `renderer.render(scene, camera)`: Draws the scene to the canvas once.

### CS lens
Data Oriented Design. Object-oriented programming often encapsulates data inside discrete objects (e.g., a `Vertex` class). Graphics programming uses Structure of Arrays (SoA) instead, packing all X,Y,Z positions into a single flat Float32Array. This maximizes cache locality, allowing the GPU to blast through contiguous memory instantly. This appears in entity-component systems (ECS) in game engines, high-performance database column stores, and SIMD instruction programming.

### SE lens
Separation of Concerns. A `Mesh` separates structural data (Geometry) from visual properties (Material). This allows you to instantiate one heavy BufferGeometry in memory and reuse it across a thousand different meshes, each with a different color material, without duplicating the memory-intensive vertex data.

### Commands needed
Open lesson-02.html in a modern browser (Chrome, Firefox, Edge).

### Run it
A solid white square (the front face of the cube) appears in the center of a black screen.

### One sentence connecting to previous unit
Now that we know a cube is just 12 triangles defined by numbers, let's look at those triangles directly.

## Concept Unit: Wireframe mode — seeing the mesh skeleton

### The Problem
Right now, our cube just looks like a flat 2D square because it's completely solid white and facing us perfectly. How can we prove it is actually made of triangles?
- What would happen if we only drew the edges of the polygons instead of filling them?
- How could drawing lines help debug a 3D scene?

### Introduce the concept in isolation
We will create a material with **wireframe** turned on.

```javascript
import * as THREE from 'three';

const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({canvas: document.getElementById('c'), antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.set(2, 2, 5);
camera.lookAt(0, 0, 0);

const solidCube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({color: 0x0044ff})
);
solidCube.position.x = -1.5;

const wireCube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({color: 0x00ff88, wireframe: true})
);
wireCube.position.x = 1.5;

scene.add(solidCube, wireCube);
renderer.render(scene, camera);
```
**Output:** Left: solid blue cube. Right: green wireframe cube showing 12 triangle edges.
This proves that a 3D surface is entirely constructed from interconnected flat triangles. By enabling `wireframe: true`, the WebGL renderer changes from filling polygons to stroking lines between the vertices defined in the index buffer. BoxGeometry's 12 triangles yield 36 edges drawn (with shared borders).

### Discard the throwaway
This throwaway script is discarded and will not remain in the project.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-02.html` (modified).
- **Change type:** Replace.
- **Location:** In the script, replacing the white cube material.
- **Dependencies:** None.

### The New Code
```javascript
  const mat = new THREE.MeshBasicMaterial({color: 0x00ff88, wireframe: true});
```

### The Updated Project
```html
18:   camera.position.set(2, 2, 5); 
19:   camera.lookAt(0, 0, 0);
20:   
21:   const geo = new THREE.BoxGeometry(1, 1, 1); 
22:   const mat = new THREE.MeshBasicMaterial({color: 0x00ff88, wireframe: true}); // ← new
23:   const mesh = new THREE.Mesh(geo, mat); 
24:   scene.add(mesh); 
25:   renderer.render(scene, camera); 
```
The material now sets `wireframe: true` and the camera is angled to see the shape better.

### Mechanical walkthrough
- `camera.position.set(2, 2, 5)`: Moves the camera up and to the right.
- `camera.lookAt(0, 0, 0)`: Angles the camera back towards the origin.
- `new THREE.MeshBasicMaterial({color: 0x00ff88, wireframe: true})`: Creates a bright green material that instructs the GPU to render lines instead of filled triangles.

### CS lens
Rasterization State. GPUs operate as state machines. `wireframe` alters the rasterizer stage of the graphics pipeline, toggling it from GL_FILL to GL_LINE. This applies globally to how the subsequent vertices are processed for this draw call. Similar state toggles exist in 2D canvas drawing and PDF rendering engines.

### SE lens
Declarative Configuration. Three.js takes an options object `{color: 0x00ff88, wireframe: true}` instead of requiring you to call `material.setColor()` and `material.setWireframe()`. This pattern allows concise, order-independent initialization in a single statement.

### Commands needed
Open lesson-02.html in a modern browser (Chrome, Firefox, Edge).

### Run it
A green cube made entirely of lines, clearly showing the diagonal cut splitting each square face into two triangles.

### One sentence connecting to previous unit
A cube is easy to build with 12 triangles, but curves require a massive increase in geometry.

## Concept Unit: Geometry zoo — Sphere, Cylinder, Torus, Plane

### The Problem
Everything in the real world isn't a box. How does a computer graphics system render curved objects using only flat triangles?
- How many flat sides would you need to make something look round?
- What happens to performance if you use too many triangles?

### Introduce the concept in isolation
We will log the vertex counts of different **Geometry** primitives.

```javascript
import * as THREE from 'three';

// SphereGeometry(radius, widthSegments, heightSegments)
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 16),
    new THREE.MeshBasicMaterial({color: 0xff4400})
);

// CylinderGeometry(radiusTop, radiusBottom, height, segments)
const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.5, 1, 16),
    new THREE.MeshBasicMaterial({color: 0xffcc00})
);

// TorusGeometry(radius, tube, radialSegs, tubularSegs)
const torus = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.15, 16, 50),
    new THREE.MeshBasicMaterial({color: 0x00ccff, wireframe: true})
);

// PlaneGeometry(width, height)
const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicMaterial({color: 0x888888, side: THREE.DoubleSide})
);
plane.rotation.x = -Math.PI / 2;

console.log('Sphere verts:', new THREE.SphereGeometry(0.5,32,16).attributes.position.count); 
console.log('Torus verts:',  new THREE.TorusGeometry(0.4,0.15,16,50).attributes.position.count); 
```
**Output:**
```
Sphere verts: 561
Torus verts: 867
```
This proves that curves are just illusions created by using hundreds of tiny flat triangles. `SphereGeometry(0.5, 32, 16)` produces 561 vertices. A plane is rotated horizontally using `-Math.PI/2` (-90 degrees), and `THREE.DoubleSide` ensures it renders from both top and bottom views.

### Discard the throwaway
This throwaway script is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-02.html` (modified).
- **Change type:** Add/Replace.
- **Location:** In the script, replacing the cube with the geometry zoo.
- **Dependencies:** None.

### The New Code
```javascript
  const shapes = [
      {geo: new THREE.BoxGeometry(0.8, 0.8, 0.8),        color: 0xff0000, pos: [-2, 0, 0]},
      {geo: new THREE.SphereGeometry(0.5, 32, 16),       color: 0x00ff00, pos: [ 0, 0, 0]},
      {geo: new THREE.CylinderGeometry(0.3, 0.3, 1, 16), color: 0x0000ff, pos: [ 2, 0, 0]},
  ];

  const meshes = shapes.map(({geo, color, pos}) => {
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color}));
      mesh.position.set(...pos); 
      return mesh;
  });
  
  meshes.forEach(m => scene.add(m));
```

### The Updated Project
```html
18:   camera.position.set(0, 2, 5); 
19:   camera.lookAt(0, 0, 0);
20:   
21:   const shapes = [ // ← new
22:       {geo: new THREE.BoxGeometry(0.8, 0.8, 0.8),        color: 0xff0000, pos: [-2, 0, 0]}, // ← new
23:       {geo: new THREE.SphereGeometry(0.5, 32, 16),       color: 0x00ff00, pos: [ 0, 0, 0]}, // ← new
24:       {geo: new THREE.CylinderGeometry(0.3, 0.3, 1, 16), color: 0x0000ff, pos: [ 2, 0, 0]}, // ← new
25:   ]; // ← new
26: 
27:   const meshes = shapes.map(({geo, color, pos}) => { // ← new
28:       const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color})); // ← new
29:       mesh.position.set(...pos);  // ← new
30:       return mesh; // ← new
31:   }); // ← new
32:   
33:   meshes.forEach(m => scene.add(m)); // ← new
34: 
35:   renderer.render(scene, camera); 
```
We removed the single cube and replaced it with a data-driven approach to generate multiple different shapes side-by-side.

### Mechanical walkthrough
- `const shapes = [...]`: Defines an array of plain JavaScript objects containing configuration data.
- `{geo: new THREE.BoxGeometry(...), color: 0xff0000, pos: [-2, 0, 0]}`: Object holding a geometry instance, a hex color, and a position array.
- `shapes.map(({geo, color, pos}) => ...)`: Iterates over the array, destructuring the properties from each object.
- `new THREE.MeshBasicMaterial({color})`: Uses shorthand property name to pass the color variable.
- `mesh.position.set(...pos)`: Uses the spread operator to expand the `[-2, 0, 0]` array into the three distinct `x, y, z` arguments expected by `.set()`.
- `meshes.forEach(m => scene.add(m))`: Adds every generated mesh to the scene graph.

### CS lens
Level of Detail (LOD). We specified `32, 16` for the sphere's segments. In game engines, distant objects use fewer segments to save GPU cycles, swapping to higher segment counts only when the camera gets close. Managing this polygon budget is a core graphics programming challenge, analogous to pagination or infinite scrolling in web development.

### SE lens
Data-Driven Construction. Instead of manually writing `scene.add(mesh1); scene.add(mesh2);`, we separated the _what_ (the `shapes` array) from the _how_ (the `map` function). If we want to add 50 objects, we only need to add data rows, not copy-paste initialization code.

### Commands needed
Open lesson-02.html in a modern browser (Chrome, Firefox, Edge).

### Run it
Three shapes appear lined up horizontally: a red box on the left, a green sphere in the middle, and a blue cylinder on the right.

### One sentence connecting to previous unit
We've used built-in shapes, but to truly understand them, we need to build one from raw memory.

## Concept Unit: Custom BufferGeometry — a triangle from scratch

### The Problem
If `BoxGeometry` and `SphereGeometry` are just conveniences, how do we create a shape that doesn't exist in the library?
- If you were writing Three.js yourself, how would you submit 3 arbitrary points in space to the GPU?
- How do you guarantee the GPU knows those points form a triangle?

### Introduce the concept in isolation
We will construct a single triangle manually using raw numbers and a **BufferAttribute**.

```javascript
import * as THREE from 'three';

const geometry = new THREE.BufferGeometry();

// 3 vertices, each with x, y, z
const vertices = new Float32Array([
    -0.5, -0.5, 0,  // vertex 0
     0.5, -0.5, 0,  // vertex 1
     0.0,  0.5, 0,  // vertex 2
]);

geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
geometry.computeVertexNormals();

const triangle = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({color: 0xff66cc, side: THREE.DoubleSide})
);

console.log('Triangle vertex count:', geometry.attributes.position.count);
console.log('Vertex 2 position:',
    geometry.attributes.position.getX(2),
    geometry.attributes.position.getY(2),
    geometry.attributes.position.getZ(2));
```
**Output:**
```
Triangle vertex count: 3
Vertex 2 position: 0 0.5 0
```
This proves that geometries are fundamentally just typed arrays. We allocate a flat `Float32Array` of 9 numbers. `BufferAttribute(vertices, 3)` tells the system that every 3 numbers represent one vertex. `computeVertexNormals()` calculates cross products to generate lighting data, and `side: THREE.DoubleSide` ensures the triangle is visible from behind.

### Discard the throwaway
This raw triangle script is discarded.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** None.
- **Change type:** None.
- **Location:** None.
- **Dependencies:** None.

### The New Code
```javascript
// No new code added to the main project for this unit.
```

### The Updated Project
```html
// The project remains the same as the end of the previous unit, demonstrating the three shapes.
```
We are not keeping the raw triangle, relying instead on the established data-driven shape generator.

### Mechanical walkthrough
- `new THREE.BufferGeometry()`: Creates an empty geometry shell.
- `new Float32Array([...])`: Allocates a contiguous block of memory specifically for 32-bit floating point numbers.
- `new THREE.BufferAttribute(vertices, 3)`: Wraps the array and declares `itemSize=3` (X, Y, and Z).
- `geometry.setAttribute('position', ...)`: Assigns the attribute to the specific string key `'position'`, which the GPU vertex shader expects.
- `geometry.computeVertexNormals()`: Automatically calculates normal vectors for the faces based on vertex winding order.
- `THREE.DoubleSide`: A constant telling the material not to perform backface culling.

### CS lens
Winding Order & Backface Culling. Graphics pipelines determine the "front" of a triangle by the order its vertices are defined (clockwise or counter-clockwise). If you look at the back of a triangle, the order is reversed, so the GPU skips drawing it to save time (backface culling). `THREE.DoubleSide` explicitly turns this optimization off.

### SE lens
Low-Level Escapes. High-level frameworks like Three.js provide easy abstractions (`BoxGeometry`), but good architecture always provides a "low-level escape hatch" (`BufferGeometry` + raw `Float32Array`) so developers aren't trapped when they need to do something custom, like procedurally generating terrain.

### Commands needed
Open lesson-02.html in a modern browser (Chrome, Firefox, Edge).

### Run it
The main project still renders the three primitive shapes perfectly.

### One sentence connecting to previous unit
Understanding how raw geometry is built prepares us to move objects around dynamically in 3D space.

## Closing
### Connect the pieces
We began by analyzing `BoxGeometry` to realize it is just a `BufferGeometry` made of arrays of positions and indices. We exposed that structure visually using `wireframe: true`. We then loaded a `SphereGeometry` and `CylinderGeometry`, placing them all into a scene at `[-2,0,0]`, `[0,0,0]`, and `[2,0,0]` using a data-driven array loop. Finally, we looked under the hood at how to inject raw `Float32Array` data directly into WebGL attributes. You now have full control over the shape of your meshes and where they sit in the scene graph.
