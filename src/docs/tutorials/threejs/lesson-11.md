# Lesson 11: Raycasting — Mouse Picking and Hover Effects

**What you will build**
In this lesson, you will build an interactive 3D scene where the mouse can hover over and select objects. The transferable problem we are solving is converting 2D screen coordinates from a mouse event into a 3D ray to test for intersections with objects in a 3D scene, which is the foundational mechanic for mouse picking in all 3D engines.

**What you need to know first**
Nothing

**Terms used in this lesson**
- **Normalized Device Coordinates (NDC)** — A coordinate system where both X and Y axes range from -1 to 1. This system maps the screen uniformly, independent of its actual pixel resolution, solving the problem of screen-size dependent coordinates.
- **Raycasting** — The process of shooting an invisible line (a ray) from a starting point in a specific direction. It solves the problem of determining what objects lie along a specific path in 3D space.
- **Intersection** — The point where a ray collides with a 3D object. This solves the problem of knowing exactly where and if an object was clicked or hovered.
- **Mouse Picking** — The specific application of raycasting where the ray originates at the camera and passes through the mouse cursor's position on the screen. It solves the problem of translating 2D user input into 3D world interactions.
- **Arrow Function** — JavaScript syntax for a compact function expression. It solves the problem of verbose function declarations and automatically binds the lexical `this` context.

**Objects and methods used**

**`THREE.Vector2`**
- *What it is:* A 2D vector class representing a point or direction in 2D space.
- *Implementation:* `new THREE.Vector2(x, y)`
- *Its use:* We use it to store the normalized device coordinates (NDC) of the mouse pointer.
- *Type:* Class instance.
- *Responsibility:* Encapsulates two numeric values (X and Y) and provides math operations for them.
- *Depends on:* Optionally takes X and Y numeric values on instantiation.
- *Connects to:* Passed into `Raycaster.setFromCamera` to dictate the ray's origin point on the screen.
- *Shape:* Data structure used across the Three.js API for 2D positioning.

**`THREE.Raycaster`**
- *What it is:* A utility class that casts a ray and checks for intersections with 3D objects.
- *Implementation:* `new THREE.Raycaster()`
- *Its use:* We use it to perform the actual intersection math between our mouse ray and the objects in our scene.
- *Type:* Class instance.
- *Responsibility:* Manages a `Ray` and tests it against arrays of `Object3D` instances to find collisions.
- *Depends on:* Needs to be configured with an origin and direction, typically via `setFromCamera`.
- *Connects to:* Calls internal math routines to test bounds and faces of geometry, returning an array of intersection results.
- *Shape:* A core service object inside the user's application logic, bridging input to 3D spatial queries.

**`Raycaster.setFromCamera`**
- *What it is:* A method that automatically configures a raycaster's origin and direction based on a 2D screen point and a camera.
- *Implementation:* `raycaster.setFromCamera(coords, camera)`
- *Its use:* We use it to map our 2D mouse NDC coordinates into the 3D world space relative to the camera.
- *Type:* Instance method.
- *Responsibility:* Updates the raycaster's internal ray so that its origin is at the camera and it points through the given NDC coordinates.
- *Depends on:* A `Vector2` representing NDC and a `Camera` (e.g., `PerspectiveCamera`).
- *Connects to:* Modifies the `raycaster.ray` property. Reads the camera's projection and world matrices.
- *Shape:* An API boundary function that translates between 2D screen space and 3D world space.

**`Raycaster.intersectObjects`**
- *What it is:* A method that checks a given array of objects for intersections with the raycaster's ray.
- *Implementation:* `raycaster.intersectObjects(objects, recursive)`
- *Its use:* We use it to find out which specific meshes our mouse is hovering over or clicking on.
- *Type:* Instance method.
- *Responsibility:* Iterates through provided objects, performing ray-bounding-box and ray-face tests, and returns a sorted list of hits.
- *Depends on:* An array of `THREE.Object3D` instances to test against.
- *Connects to:* Returns an array of intersection objects (containing distance, point, face normal, and the object hit).
- *Shape:* The primary query mechanism executed during the render or event loop to detect hits.

**`document.addEventListener`**
- *What it is:* A native DOM method that attaches an event handler to a document or element.
- *Implementation:* `document.addEventListener(type, listener)`
- *Its use:* We use it to capture mouse movements and clicks.
- *Type:* Native browser method.
- *Responsibility:* Listens for specific user interaction events and fires a callback function when they occur.
- *Depends on:* A string representing the event type (e.g., 'mousemove', 'click') and a callback function.
- *Connects to:* The browser's event loop, bridging OS-level hardware input into the JavaScript execution environment.
- *Shape:* The entry point for all user-driven interactive logic.

**`THREE.Color.copy`**
- *What it is:* A method to copy the RGB values from one color to another.
- *Implementation:* `color.copy(otherColor)`
- *Its use:* We use it to save an object's original color before highlighting it, and to restore it later.
- *Type:* Instance method.
- *Responsibility:* Overwrites the calling color's internal RGB values with those of the passed color.
- *Depends on:* A valid `THREE.Color` instance to read from.
- *Connects to:* Mutates the state of a `Material`'s color or a standalone `Color` object.
- *Shape:* A utility function for state management within the visual properties of the scene.

**`THREE.Plane`**
- *What it is:* A mathematical representation of an infinite 2D surface in 3D space.
- *Implementation:* `new THREE.Plane(normal, constant)`
- *Its use:* We use it as an invisible flat surface to project our mouse onto during drag operations.
- *Type:* Class instance.
- *Responsibility:* Defines a plane using a normal vector and a distance from the origin, useful for mathematical intersections.
- *Depends on:* A `Vector3` for the normal and a numeric constant for the offset.
- *Connects to:* Passed into `Ray.intersectPlane` to find a specific 3D point along the ray.
- *Shape:* A purely mathematical construct used for intermediate calculations.

**`Ray.intersectPlane`**
- *What it is:* A method that finds the exact 3D point where a ray crosses a plane.
- *Implementation:* `ray.intersectPlane(plane, target)`
- *Its use:* We use it to find the 3D position to move our object to when dragging the mouse.
- *Type:* Instance method.
- *Responsibility:* Calculates the intersection point and stores the result in the provided target vector.
- *Depends on:* A `THREE.Plane` to test against and a `THREE.Vector3` to store the result.
- *Connects to:* Modifies the `target` vector with the intersection coordinates.
- *Shape:* A geometric utility used for constrained 3D interactions.

## Concept Unit: Converting mouse coordinates to normalized device coordinates (NDC)

### The Problem
When a user clicks on the canvas, the browser gives us pixel coordinates (like x: 960, y: 540). However, Three.js and WebGL math requires Normalized Device Coordinates (NDC) where the screen goes from -1 to +1 on both axes, with (0,0) in the exact center. How do we map our pixel-based mouse position into this resolution-independent format?

### Introduce the concept in isolation
We will use a throwaway script to calculate and log the conversion.

```html
<script>
// Throwaway NDC conversion lab
const mouse = { x: 0, y: 0 };
document.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth)  *  2 - 1;
    mouse.y = (event.clientY / window.innerHeight) * -2 + 1;
    console.log('NDC:', mouse.x.toFixed(3), mouse.y.toFixed(3));
});
</script>
```

When you move the mouse to the center of a 1920x1080 screen, the math executes: `x = (960/1920)*2-1 = 0`. `y = -(540/1080)*2+1 = 0`. This proves that our pixel coordinates correctly map into the -1 to 1 space.

### Discard the throwaway
This throwaway script is now deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are starting our raycasting logic.
- **Files affected:** `lesson-11.html`
- **Change type:** add
- **Location:** At the top level of our script tag.
- **Dependencies:** None.

### The New Code
```html
<script type="module">
import * as THREE from 'three';

const mouse = new THREE.Vector2();
document.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth)  *  2 - 1;
    mouse.y = (event.clientY / window.innerHeight) * -2 + 1;
});
console.log('Mouse NDC tracker initialized');
</script>
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <head><title>Raycasting</title></head>
4: <body>
5: <script type="module">
6: import * as THREE from 'three';
7: // ← new
8: const mouse = new THREE.Vector2();
9: document.addEventListener('mousemove', (event) => {
10:     mouse.x = (event.clientX / window.innerWidth)  *  2 - 1;
11:     mouse.y = (event.clientY / window.innerHeight) * -2 + 1;
12: });
13: console.log('Mouse NDC tracker initialized');
14: // ← new
15: </script>
16: </body>
17: </html>
```
This structure creates a new script that continuously tracks the mouse's position in NDC format.

### Mechanical walkthrough
- `const mouse` declares a constant reference.
- `new THREE.Vector2()` instantiates a new 2D vector object to hold our coordinates.
- `document.addEventListener` attaches an event listener to the page.
- `'mousemove'` is the event type we are listening for.
- `(event) => { ... }` is an arrow function that executes whenever the mouse moves.
- `mouse.x =` assigns a new value to the X property.
- `(event.clientX / window.innerWidth)` normalizes the X pixel to a percentage (0.0 to 1.0).
- `* 2 - 1` scales that percentage to the -1.0 to 1.0 range.
- `mouse.y =` assigns a new value to the Y property.
- `(event.clientY / window.innerHeight)` normalizes the Y pixel to a percentage.
- `* -2 + 1` scales and inverts the Y axis (since browser Y goes down, but 3D Y goes up).
- `console.log` prints a confirmation message.

### CS lens
Coordinate transformations are a fundamental operation in computer graphics. Normalized Device Coordinates (NDC) create a standard space that hardware can process without caring about the physical dimensions of the screen.

### SE lens
By storing `mouse` as a global or shared `Vector2` and updating it inside the event listener, we avoid instantiating a new vector object every single time the mouse moves. This prevents garbage collection spikes and keeps performance smooth.

### Commands needed
Open lesson-11.html in a modern browser.

### Run it
You will see "Mouse NDC tracker initialized" in the console. As you move the mouse, the internal `mouse` vector is updated to reflect its precise position in NDC space.

### One sentence connecting to previous unit
Now that we have the mouse coordinates in NDC space, we can project them into the 3D world to form a ray.

## Concept Unit: THREE.Raycaster — casting a ray from camera through mouse

### The Problem
We have a 2D position in NDC space. But the objects we want to select live in a 3D world. How do we draw a line starting from our viewpoint (the camera) and piercing straight through that specific 2D pixel out into the infinite 3D void?

### Introduce the concept in isolation
We will use a throwaway block to test the raycaster object.

```javascript
// Throwaway Raycaster lab
const dummyCamera = new THREE.PerspectiveCamera();
dummyCamera.position.set(0, 0, 5);
const testRaycaster = new THREE.Raycaster();
const testMouse = new THREE.Vector2(0, 0); // Center of screen

testRaycaster.setFromCamera(testMouse, dummyCamera);
console.log('Ray origin:', testRaycaster.ray.origin);
console.log('Ray dir:', testRaycaster.ray.direction);
```
This proves that when the mouse is at (0,0), the ray's origin is exactly the camera's position (0, 0, 5), and its direction points straight back into the screen (0, 0, -1).

### Discard the throwaway
This throwaway script is now deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-11.html`
- **Change type:** add
- **Location:** Inside our module script, beneath the vector definition.
- **Dependencies:** The previous mouse tracking code.

### The New Code
```javascript
const raycaster = new THREE.Raycaster();

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth)  *  2 - 1;
    mouse.y = (event.clientY / window.innerHeight) * -2 + 1;
    // raycaster.setFromCamera computes a ray from camera through the mouse point
    raycaster.setFromCamera(mouse, camera);
}
```

### The Updated Project
```html
1: <script type="module">
2: import * as THREE from 'three';
3: 
4: const scene = new THREE.Scene();
5: const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
6: camera.position.set(0, 0, 5);
7: 
8: const mouse = new THREE.Vector2();
9: // ← new
10: const raycaster = new THREE.Raycaster();
11: 
12: function onMouseMove(event) {
13:     mouse.x = (event.clientX / window.innerWidth)  *  2 - 1;
14:     mouse.y = (event.clientY / window.innerHeight) * -2 + 1;
15:     raycaster.setFromCamera(mouse, camera);
16: }
17: document.addEventListener('mousemove', onMouseMove);
18: // ← new
19: </script>
```
The script now configures a raycaster to shoot a ray through the screen every time the mouse moves.

### Mechanical walkthrough
- `const raycaster =` declares a constant reference.
- `new THREE.Raycaster()` instantiates the utility object that will perform the raycasting math.
- `function onMouseMove(event)` defines a named function for our event listener.
- `mouse.x =` assigns the normalized X value.
- `mouse.y =` assigns the normalized Y value.
- `raycaster.setFromCamera` executes the method that updates the internal ray.
- `mouse` is passed as the origin coordinates.
- `camera` is passed to provide the viewpoint matrix.
- `document.addEventListener('mousemove', onMouseMove);` binds the function to the event.

### CS lens
Projection matrices convert 3D coordinates into 2D screen space. `setFromCamera` uses the inverse of the camera's projection matrix to "unproject" a 2D point back into a 3D ray. This relies on the mathematical property that matrix operations are reversible.

### SE lens
Extracting the inline arrow function into a named `onMouseMove` handler makes the code cleaner and allows the event listener to be easily removed or referenced later if the component lifecycle requires teardown.

### Commands needed
Open lesson-11.html in a modern browser.

### Run it
The raycaster invisibly updates its internal ray vector as you move the mouse across the screen. There is no visual output yet.

### One sentence connecting to previous unit
With a ray extending into the 3D scene, we can now check if it hits anything.

## Concept Unit: intersectObjects — finding what the ray hits

### The Problem
We have a mathematical ray pointing into the scene. How do we determine if that ray actually passes through the boundaries of any 3D objects, and if so, which one is closest to the camera?

### Introduce the concept in isolation
We use a throwaway array of objects to test intersection.

```javascript
// Throwaway intersectObjects lab
const dummyObjects = [ new THREE.Mesh(new THREE.BoxGeometry(1,1,1)) ];
dummyObjects[0].position.z = -5; // Place in front of dummyCamera
const hits = testRaycaster.intersectObjects(dummyObjects);
console.log('Hits found:', hits.length);
if (hits.length > 0) console.log('Distance:', hits[0].distance);
```
This proves that the raycaster checks the array and returns a list of hit objects, including data like the exact distance from the camera to the hit point.

### Discard the throwaway
This throwaway script is now deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-11.html`
- **Change type:** add
- **Location:** Inside our event listener.
- **Dependencies:** The previously defined raycaster and scene setup.

### The New Code
```javascript
const objects = [
    new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:0xff4400})),
    new THREE.Mesh(new THREE.SphereGeometry(0.5,32,16), new THREE.MeshStandardMaterial({color:0x0088ff})),
];
objects[0].position.x = -1.5;
objects[1].position.x =  1.5;
objects.forEach(o => scene.add(o));

// Inside onMouseMove:
const hits = raycaster.intersectObjects(objects);
if (hits.length > 0) {
    const hit = hits[0];
    console.log('Hit object:', hit.object.geometry.type);
} else {
    console.log('No hit');
}
```

### The Updated Project
```html
1: <script type="module">
2: // ... existing scene, camera, raycaster setup ...
3: // ← new
4: const objects = [
5:     new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:0xff4400})),
6:     new THREE.Mesh(new THREE.SphereGeometry(0.5,32,16), new THREE.MeshStandardMaterial({color:0x0088ff})),
7: ];
8: objects[0].position.x = -1.5;
9: objects[1].position.x =  1.5;
10: objects.forEach(o => scene.add(o));
11: // ← new
12: 
13: function onMouseMove(event) {
14:     mouse.x = (event.clientX / window.innerWidth)  *  2 - 1;
15:     mouse.y = (event.clientY / window.innerHeight) * -2 + 1;
16:     raycaster.setFromCamera(mouse, camera);
17: // ← new
18:     const hits = raycaster.intersectObjects(objects);
19:     if (hits.length > 0) {
20:         const hit = hits[0];
21:         console.log('Hit object:', hit.object.geometry.type);
22:     } else {
23:         console.log('No hit');
24:     }
25: // ← new
26: }
27: document.addEventListener('mousemove', onMouseMove);
28: </script>
```
The application now loops over `objects`, checks for collisions with the raycaster, and prints the result.

### Mechanical walkthrough
- `const objects =` defines an array holding our interactive meshes.
- `new THREE.Mesh` creates our 3D items.
- `objects.forEach` iterates over the array to add them to the scene.
- `const hits =` declares a constant to hold the results.
- `raycaster.intersectObjects(objects)` executes the collision detection against the array.
- `if (hits.length > 0)` checks if the returned array contains any intersections.
- `const hit = hits[0];` accesses the very first item in the array, which is always the closest one to the camera.
- `console.log` prints the `geometry.type` of the hit object.
- `else` handles the scenario where the ray hits nothing.

### CS lens
Ray intersection is computationally expensive. To optimize, Three.js first tests the ray against each object's invisible "Bounding Box" or "Bounding Sphere" (a cheap mathematical check). Only if that passes does it test against the individual polygons of the complex geometry.

### SE lens
Passing an explicit array of `objects` to `intersectObjects` is safer and faster than passing `scene.children`. By maintaining a dedicated array of "interactable" objects, we avoid wasting CPU cycles raycasting against lights, cameras, or background scenery that should never trigger a mouse event.

### Commands needed
Open lesson-11.html in a modern browser.

### Run it
Moving the mouse over the canvas will print "No hit". When the mouse pointer crosses the 3D box or sphere, the console will log "Hit object: BoxGeometry" or "Hit object: SphereGeometry".

### One sentence connecting to previous unit
Now that we know exactly which object the mouse is touching, we can modify its appearance to create a hover effect.

## Concept Unit: Hover effect — changing color on mouseover

### The Problem
We can detect when the mouse hits an object. But when the mouse leaves the object, how do we return the object to its original color? We need a way to track state so that we can restore the previous visual appearance when the hover ends.

### Introduce the concept in isolation
We will test a state variable mechanism in a throwaway block.

```javascript
// Throwaway hover state lab
let testHovered = null;
const originalState = "red";
function simulateHover(target) {
    if (target !== testHovered) {
        if (testHovered) console.log("Restoring", testHovered, "to", originalState);
        testHovered = target;
        console.log("Setting", testHovered, "to yellow");
    }
}
simulateHover("Box");
simulateHover("Box"); // No change
simulateHover(null);  // Restoring Box
```
This proves that tracking the previously hovered target allows us to execute teardown logic only when the state actually transitions from one target to another (or to nothing).

### Discard the throwaway
This throwaway script is now deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-11.html`
- **Change type:** replace
- **Location:** Inside `onMouseMove`, replacing the console logs.
- **Dependencies:** The previously defined raycaster logic.

### The New Code
```javascript
let hoveredObject = null;
const originalColor = new THREE.Color();
const hoverColor = new THREE.Color(0xffff00);

// Inside onMouseMove, replacing the if (hits.length > 0) block:
    if (hits.length > 0) {
        const hit = hits[0].object;
        if (hit !== hoveredObject) {
            if (hoveredObject) hoveredObject.material.color.copy(originalColor);
            hoveredObject = hit;
            originalColor.copy(hit.material.color);
            hit.material.color.set(hoverColor);
        }
    } else {
        if (hoveredObject) {
            hoveredObject.material.color.copy(originalColor);
            hoveredObject = null;
        }
    }
```

### The Updated Project
```html
1: <script type="module">
2: // ... setup ...
3: // ← new
4: let hoveredObject = null;
5: const originalColor = new THREE.Color();
6: const hoverColor = new THREE.Color(0xffff00);
7: // ← new
8: 
9: function onMouseMove(event) {
10:     mouse.x = (event.clientX / window.innerWidth)  *  2 - 1;
11:     mouse.y = (event.clientY / window.innerHeight) * -2 + 1;
12:     raycaster.setFromCamera(mouse, camera);
13:     const hits = raycaster.intersectObjects(objects);
14: // ← new
15:     if (hits.length > 0) {
16:         const hit = hits[0].object;
17:         if (hit !== hoveredObject) {
18:             if (hoveredObject) hoveredObject.material.color.copy(originalColor);
19:             hoveredObject = hit;
20:             originalColor.copy(hit.material.color);
21:             hit.material.color.set(hoverColor);
22:         }
23:     } else {
24:         if (hoveredObject) {
25:             hoveredObject.material.color.copy(originalColor);
26:             hoveredObject = null;
27:         }
28:     }
29: // ← new
30: }
31: </script>
```
The code now applies a yellow color when hovering over an object and restores its original color when the mouse moves away.

### Mechanical walkthrough
- `let hoveredObject = null;` initializes an empty state variable.
- `const originalColor =` initializes a color object to backup the previous hue.
- `const hoverColor =` sets up the bright yellow target color.
- `const hit = hits[0].object;` extracts the actual mesh from the hit data.
- `if (hit !== hoveredObject)` checks if we are looking at a *new* object.
- `if (hoveredObject)` verifies if there is an existing highlighted object to clean up.
- `hoveredObject.material.color.copy(originalColor);` restores the previous object's color.
- `hoveredObject = hit;` updates our state to track the new object.
- `originalColor.copy(hit.material.color);` backups the current object's default color.
- `hit.material.color.set(hoverColor);` applies the yellow highlight.
- `else` triggers when the ray hits empty space.
- `hoveredObject = null;` clears the state entirely.

### CS lens
This pattern represents a finite state machine transition. The application has specific states ("nothing hovered", "object A hovered", "object B hovered") and explicitly handles the entry and exit actions for transitioning between these states.

### SE lens
Using `copy` instead of re-instantiating new `THREE.Color` objects inside the render loop ensures zero garbage collection overhead. This pattern of pre-allocating utility objects globally and mutating them is critical for consistent 60 FPS performance in 3D applications.

### Commands needed
Open lesson-11.html in a modern browser.

### Run it
Moving the mouse over the red box or blue sphere will turn them bright yellow. Moving the mouse off them immediately returns them to their original colors.

### One sentence connecting to previous unit
Now that objects react to the mouse position, we can expand user interaction to allow clicking and dragging.

## Concept Unit: Click to select and drag

### The Problem
When dragging an object in a 3D scene, the 2D mouse moves across the flat screen, but the 3D object needs to slide in the physical world without changing its vertical height. How do we constrain the mathematical ray's intersection to a horizontal plane at the specific elevation of the selected object?

### Introduce the concept in isolation
We will use a throwaway test of `intersectPlane`.

```javascript
// Throwaway plane intersection lab
const testPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Flat on floor
const testResult = new THREE.Vector3();
// A ray pointing down at an angle
testRaycaster.ray.origin.set(0, 5, 0);
testRaycaster.ray.direction.set(1, -1, 0).normalize();
testRaycaster.ray.intersectPlane(testPlane, testResult);
console.log("Plane hit at:", testResult);
```
This proves that a mathematical ray can find the exact 3D coordinates where it pierces an invisible, infinite mathematical plane, yielding a safe target to move our object towards.

### Discard the throwaway
This throwaway script is now deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-11.html`
- **Change type:** add
- **Location:** Below our hover logic, adding new event listeners.
- **Dependencies:** The previously created objects and raycaster.

### The New Code
```javascript
let selected = null;
let isDragging = false;
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const dragPoint = new THREE.Vector3();

document.addEventListener('mousedown', (e) => {
    const hits = raycaster.intersectObjects(objects);
    if (hits.length > 0) {
        selected = hits[0].object;
        isDragging = true;
        dragPlane.constant = -selected.position.y;
    }
});

// Inside onMouseMove:
    if (isDragging && selected) {
        raycaster.ray.intersectPlane(dragPlane, dragPoint);
        selected.position.set(dragPoint.x, selected.position.y, dragPoint.z);
        return;
    }

document.addEventListener('mouseup', () => {
    isDragging = false;
    selected = null;
});
```

### The Updated Project
```html
1: <script type="module">
2: // ... previous variables ...
3: // ← new
4: let selected = null;
5: let isDragging = false;
6: const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
7: const dragPoint = new THREE.Vector3();
8: // ← new
9: 
10: document.addEventListener('mousedown', (e) => {
11:     const hits = raycaster.intersectObjects(objects);
12:     if (hits.length > 0) {
13:         selected = hits[0].object;
14:         isDragging = true;
15:         dragPlane.constant = -selected.position.y;
16:     }
17: });
18: 
19: function onMouseMove(event) {
20:     mouse.x = (event.clientX / window.innerWidth)  *  2 - 1;
21:     mouse.y = (event.clientY / window.innerHeight) * -2 + 1;
22:     raycaster.setFromCamera(mouse, camera);
23: // ← new
24:     if (isDragging && selected) {
25:         raycaster.ray.intersectPlane(dragPlane, dragPoint);
26:         selected.position.set(dragPoint.x, selected.position.y, dragPoint.z);
27:         return;
28:     }
29: // ← new
30: // ... hover logic ...
31: }
32: 
33: // ← new
34: document.addEventListener('mouseup', () => {
35:     isDragging = false;
36:     selected = null;
37: });
38: // ← new
39: </script>
```
You can now click to grab an object and slide it around horizontally.

### Mechanical walkthrough
- `let selected = null;` tracks the object currently being dragged.
- `let isDragging = false;` tracks the state of the mouse button.
- `const dragPlane =` creates the mathematical surface we will project mouse coordinates onto.
- `new THREE.Vector3(0, 1, 0)` sets the plane's normal pointing straight up.
- `document.addEventListener('mousedown')` fires when the user clicks.
- `selected = hits[0].object;` stores the closest clicked object.
- `isDragging = true;` updates our interaction state.
- `dragPlane.constant = -selected.position.y;` adjusts the plane so it sits exactly at the elevation of the selected object.
- `if (isDragging && selected)` inside `onMouseMove` intercepts the execution if we are in the middle of a drag.
- `raycaster.ray.intersectPlane` calculates where the current mouse ray pierces our invisible plane.
- `selected.position.set` moves the object to the new X and Z coordinates, preserving its original Y.
- `return;` escapes the mouse move function so the hover logic below doesn't run during a drag.
- `document.addEventListener('mouseup')` fires when the click is released.
- `isDragging = false;` cleans up the interaction state.

### CS lens
Using a virtual dragging plane abstracts the movement out of camera space and into world space. By projecting onto a plane defined by the object's current Y axis, we enforce a constraint that limits 3D motion into 2D planar motion, making it controllable with a 2D mouse.

### SE lens
Separating mouse state (`isDragging`) from object state (`selected`) makes the code robust. The mouseup event cleans up these states globally, meaning even if the mouse leaves the browser window before releasing the button, releasing it anywhere will safely end the drag operation.

### Commands needed
Open lesson-11.html in a modern browser.

### Run it
Click on an object and hold down the mouse button. Moving the mouse will drag the object seamlessly across the floor without lifting it into the air.

### One sentence connecting to previous unit
The complete sequence of projecting coordinates to rays, querying intersections, and manipulating objects via virtual planes forms the core of an interactive 3D application.

## Closing

### Connect the pieces
Trace clicking on a sphere at NDC (0.3, -0.1): The browser captures the pixel coordinates, which map to NDC space. `raycaster.setFromCamera` uses the projection matrix to cast an infinite ray originating at the camera. `raycaster.intersectObjects` performs geometric tests, finding the sphere and modifying its color. On mousedown, an invisible horizontal plane aligns with the sphere's height, and dragging updates the sphere's position by solving where the ray mathematically pierces that plane. Every piece links together to create smooth, precise 3D input.
