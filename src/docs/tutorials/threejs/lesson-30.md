# Lesson 30: dat.GUI / lil-gui — Interactive Debug Panel via CDN

What you will build
In this lesson, you will build an interactive debug panel for your Three.js scene using lil-gui. You will start by creating a standalone graphical user interface to tweak plain variables, then connect it to live Three.js materials, lights, and animations. The transferable problem this solves is runtime state manipulation: instead of repeatedly modifying code and reloading to find the right visual parameters, you expose those parameters to a browser-side control panel, a pattern identical to property inspectors in game engines like Unity or Blender.

What you need to know first
- Lesson 29
- Three.js scene basics, materials, and animation loops.

Terms used in this lesson
- **CDN (Content Delivery Network)** — A distributed network of servers that delivers library code (like lil-gui) directly to your browser. This avoids the need to bundle the library locally.
- **ES Module Import** — The modern JavaScript syntax (`import ... from ...`) used to pull specific dependencies into a file. It ensures we only load exactly what we need, keeping the application lightweight.
- **State Persistence** — The ability to save the current values of an application and restore them later. It exists so users don't lose their settings (like tweaked GUI values) across page reloads.

Objects and methods used
- **GUI**
  - *What it is:* The main class from the lil-gui library that instantiates a visual control panel.
  - *Implementation:* `new GUI({ title: '...', width: ... })`
  - *Its use:* We use it to create the main container that holds all our sliders, color pickers, and buttons for tweaking the scene.
  - *Type:* Class constructor.
  - *Responsibility:* Manages the overall panel, its dimensions, and holds the collection of controllers and folders.
  - *Depends on:* An optional configuration object (title, width, etc.).
  - *Connects to:* Calls its internal DOM manipulation methods to render the panel; called by application code to instantiate the interface.
  - *Shape:* A boundary object between your application's state and the browser's DOM.

- **gui.add()**
  - *What it is:* A method that inspects a property on a target object and creates an appropriate UI controller.
  - *Implementation:* `gui.add(object, 'propertyName', [min], [max], [step])`
  - *Its use:* We use it to bind numeric values (for sliders), booleans (for checkboxes), strings (for text inputs), or functions (for buttons) to the GUI.
  - *Type:* Instance method.
  - *Responsibility:* Infers the type of the target property and instantiates the correct controller (slider, checkbox, etc.).
  - *Depends on:* The target object and the string name of the property to inspect.
  - *Connects to:* Reads and writes directly to the provided object's property.
  - *Shape:* An internal controller factory.

- **gui.addColor()**
  - *What it is:* A specialized method for adding color pickers.
  - *Implementation:* `gui.addColor(object, 'colorProperty')`
  - *Its use:* We use it because Three.js uses specific color representations, and we need a visual color wheel instead of a text input.
  - *Type:* Instance method.
  - *Responsibility:* Generates a color picker UI that translates visual color selection into a hex string or RGB object.
  - *Depends on:* The target object and the string name of the color property.
  - *Connects to:* Updates the target object's color property when the user picks a new color.
  - *Shape:* A specialized controller factory.

- **onChange()**
  - *What it is:* An event listener method attached to a GUI controller.
  - *Implementation:* `controller.onChange(callbackFunction)`
  - *Its use:* We use it to trigger side effects (like updating a Three.js material or saving state) whenever the user changes a value in the GUI.
  - *Type:* Instance method on a GUI Controller.
  - *Responsibility:* Registers a callback to execute immediately upon value modification.
  - *Depends on:* A callback function that takes the new value as an argument.
  - *Connects to:* Called by the controller's internal event system; calls your provided callback.
  - *Shape:* A callback boundary between framework and app code.

- **addFolder()**
  - *What it is:* A method to create a collapsible section within the GUI.
  - *Implementation:* `gui.addFolder('FolderName')`
  - *Its use:* We use it to organize related controls (e.g., all Material properties together, all Animation properties together).
  - *Type:* Instance method.
  - *Responsibility:* Creates a nested GUI instance visually styled as a collapsible group.
  - *Depends on:* A string representing the folder's name.
  - *Connects to:* Returns a new GUI-like object that can accept its own `.add()` calls.
  - *Shape:* An organizational container within the GUI hierarchy.

- **localStorage**
  - *What it is:* A web API that allows JavaScript sites to store key/value pairs in a web browser with no expiration date.
  - *Implementation:* `localStorage.setItem('key', 'value')` and `localStorage.getItem('key')`
  - *Its use:* We use it to save the GUI's parameters to the browser, so they persist across page refreshes.
  - *Type:* Browser API object.
  - *Responsibility:* Persistently stores string data tied to the document's origin.
  - *Depends on:* Key strings and stringified data.
  - *Connects to:* The browser's persistent storage engine.
  - *Shape:* A data-transfer boundary to local storage.

- **JSON.stringify() / JSON.parse()**
  - *What it is:* Standard JavaScript methods for converting objects to JSON strings and back.
  - *Implementation:* `JSON.stringify(object)` / `JSON.parse(string)`
  - *Its use:* Used because `localStorage` only stores strings, so we must serialize our params object before saving and deserialize it upon loading.
  - *Type:* Static methods on the global JSON object.
  - *Responsibility:* Serializes JavaScript objects into a standard string format and parses them back into objects.
  - *Depends on:* A target object (for stringify) or a valid JSON string (for parse).
  - *Connects to:* CPU parsing algorithms.
  - *Shape:* A serialization/deserialization utility.

- **listen()**
  - *What it is:* A method that tells a controller to continuously poll its target property for changes.
  - *Implementation:* `controller.listen()`
  - *Its use:* We use it for values like FPS or draw calls that change programmatically, so the GUI updates automatically.
  - *Type:* Instance method on a GUI Controller.
  - *Responsibility:* Flags the controller to check its target value on every frame and update the display if it changes.
  - *Depends on:* The controller having a valid target object and property.
  - *Connects to:* The GUI's internal update loop.
  - *Shape:* A configuration flag on a controller.

- **destroy()**
  - *What it is:* A method to completely remove the GUI from the DOM and clean up its memory.
  - *Implementation:* `gui.destroy()`
  - *Its use:* We use it when switching scenes or cleaning up an application to prevent memory leaks and orphaned UI elements.
  - *Type:* Instance method.
  - *Responsibility:* Unbinds all event listeners and removes the GUI's HTML elements from the document.
  - *Depends on:* The GUI instance existing.
  - *Connects to:* The browser's DOM manipulation APIs (like `removeChild`).
  - *Shape:* A teardown mechanism.

**Everything else in the file, not this lesson's subject but still explained.**
(No other major unexplained concepts.)

## Concept Unit: Creating a basic lil-gui panel
### The Problem
When developing 3D scenes, finding the perfect values for rotation speeds, visibility flags, or colors often requires changing a number in code, saving, and waiting for the browser to reload. This is a slow, iterative loop. How can we expose these internal JavaScript variables to a visual control panel in the browser, so we can tweak them in real-time without reloading the page? What would happen if we tried to build our own HTML sliders for every single variable?

### Introduce the concept in isolation
We will use lil-gui, loading it directly from a CDN, to inspect a plain JavaScript object and auto-generate controls for it.

```html
<!DOCTYPE html>
<html>
<body>
<script type="module">
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// GUI inspects a plain object and creates controls for each property
const params = {
    speed:    1.0,
    visible:  true,
    color:    '#ff4400',
    message:  'hello',
};

const gui = new GUI();
gui.add(params, 'speed', 0, 5, 0.01).name('Rotation Speed').onChange(v => console.log('speed:', v));
gui.add(params, 'visible').name('Show Mesh');
gui.addColor(params, 'color').name('Color').onChange(v => console.log('color:', v));
gui.add(params, 'message').name('Label');

console.log('GUI controls:', gui.controllers.length);
</script>
</body>
</html>
```

Predicted Output:
`GUI controls: 4`
And a control panel appears in the top-right corner with a slider, checkbox, color picker, and text input.

This is called a **GUI Controller**. The output proves that `lil-gui` reads the `params` object and the configuration arguments to generate four distinct interactive DOM elements, dynamically inferring their types (number, boolean, string).

### Discard the throwaway
This standalone HTML example is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are introducing a new debugging tool.
- **Files affected:** `lesson-30.html` (created).
- **Change type:** Add.
- **Location:** At the top of our script module.
- **Dependencies:** lil-gui imported via CDN.

### The New Code
```html
<script type="module">
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

const params = {
    speed:    1.0,
    visible:  true,
    color:    '#ff4400',
    message:  'hello',
};

const gui = new GUI();
gui.add(params, 'speed', 0, 5, 0.01).name('Rotation Speed').onChange(v => console.log('speed:', v));
gui.add(params, 'visible').name('Show Mesh');
gui.addColor(params, 'color').name('Color').onChange(v => console.log('color:', v));
gui.add(params, 'message').name('Label');
</script>
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <body>
4: <script type="module">
5: import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm'; // ← new
6: 
7: const params = { // ← new
8:     speed:    1.0, // ← new
9:     visible:  true, // ← new
10:    color:    '#ff4400', // ← new
11:    message:  'hello', // ← new
12: }; // ← new
13: 
14: const gui = new GUI(); // ← new
15: gui.add(params, 'speed', 0, 5, 0.01).name('Rotation Speed').onChange(v => console.log('speed:', v)); // ← new
16: gui.add(params, 'visible').name('Show Mesh'); // ← new
17: gui.addColor(params, 'color').name('Color').onChange(v => console.log('color:', v)); // ← new
18: gui.add(params, 'message').name('Label'); // ← new
19: </script>
20: </body>
21: </html>
```

The script tag now imports the GUI library and creates a floating panel bound to a simple parameters object.

### Mechanical walkthrough
1. `import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm'`: We import the `GUI` class from a CDN URL.
2. `const params = { speed: 1.0, visible: true, color: '#ff4400', message: 'hello' }`: We declare a plain JavaScript object holding the initial state values.
3. `const gui = new GUI()`: We instantiate the `GUI` class, creating the main panel DOM element.
4. `gui.add(params, 'speed', 0, 5, 0.01)`: We call `add` on `gui`, passing `params` and the property name `'speed'`, along with minimum `0`, maximum `5`, and step `0.01`. This creates a numeric slider.
5. `.name('Rotation Speed')`: We chain a call to `.name()`, setting the display label in the GUI.
6. `.onChange(v => console.log('speed:', v))`: We chain a call to `.onChange()`, passing an arrow function that logs the new value `v` whenever the slider moves.
7. `gui.add(params, 'visible').name('Show Mesh')`: We call `add` for the boolean `'visible'`, creating a checkbox.
8. `gui.addColor(params, 'color')`: We call `addColor` specifically for the `'color'` property, creating a visual color picker.
9. `.name('Color').onChange(v => console.log('color:', v))`: We name the color picker and log its value on change.
10. `gui.add(params, 'message').name('Label')`: We call `add` for the string `'message'`, generating a text input field.

### CS lens
The GUI library uses **Reflection** (or JavaScript's dynamic property access) to inspect the runtime types of the `params` object's values. Because JavaScript is dynamically typed, `typeof params['speed'] === 'number'` allows the library to decide at runtime that it should instantiate a slider class rather than a checkbox class. This dynamic dispatch keeps the API incredibly simple (`gui.add()`) while hiding complex factory logic internally.

### SE lens
Using a single `params` object acts as an **Adapter** or state container. Instead of the GUI library needing to understand Three.js objects, or Three.js needing to understand HTML sliders, both sides only interact with this plain JavaScript object. This enforces a clean decoupling: the UI modifies the state object, and the application reads from it.

### Commands needed
Open lesson-30.html in a modern browser.

### Run it
When you open the file, you will see a panel in the top right. Drag the "Rotation Speed" slider, and watch the browser console log `speed: 1.25`, etc. Change the color wheel, and see `color: #0088ff` logged.

### One sentence connecting to previous unit
Now that we have a basic panel logging values to the console, we can connect those values to actual objects in a Three.js scene.

## Concept Unit: Connecting GUI to Three.js scene properties
### The Problem
Logging numbers to a console is helpful, but the goal is to alter the 3D scene visually. If a Three.js material requires a specific color format, and an animation loop runs 60 times a second, how do we bridge our simple GUI object to these complex Three.js systems efficiently? What happens if we try to replace the material every frame?

### Introduce the concept in isolation
We will create a dummy object representing our 3D mesh, and bind GUI controls to modify it, organizing them into folders.

```html
<script type="module">
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

// Mock Three.js mesh behavior
const mesh = { material: { color: '#ffffff', roughness: 0.5 }, rotation: { y: 0 } };

const params = { color: '#ff4400', roughness: 0.5 };
const gui = new GUI();
const matFolder = gui.addFolder('Material');

matFolder.addColor(params, 'color').onChange(v => { mesh.material.color = v; console.log('Mesh color:', mesh.material.color); });
matFolder.add(params, 'roughness', 0, 1, 0.01).onChange(v => { mesh.material.roughness = v; console.log('Mesh roughness:', mesh.material.roughness); });
</script>
```

Predicted Output: A panel with a "Material" folder containing a color picker and a slider. Adjusting them updates the mock `mesh.material` values.

This is called **Event-Driven State Binding**. The output proves that by using the `onChange` callback, we can translate GUI updates directly into object mutations exactly when they happen, rather than polling for changes.

### Discard the throwaway
This mock example is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `lesson-30.html` (modified).
- **Change type:** Replace.
- **Location:** Replacing the previous simple GUI setup with a Three.js scene setup.
- **Dependencies:** Three.js and lil-gui imported via CDN.

### The New Code
```javascript
import * as THREE from 'three';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.z = 3;

const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xff4400, roughness: 0.5, metalness: 0 })
);
scene.add(mesh);
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const params = {
    color:      '#ff4400',
    roughness:  0.5,
    metalness:  0.0,
    wireframe:  false,
    rotSpeed:   1.0,
};

const gui = new GUI();
const matFolder = gui.addFolder('Material');
matFolder.addColor(params, 'color').onChange(v => mesh.material.color.set(v));
matFolder.add(params, 'roughness', 0, 1, 0.01).onChange(v => mesh.material.roughness = v);
matFolder.add(params, 'metalness', 0, 1, 0.01).onChange(v => mesh.material.metalness = v);
matFolder.add(params, 'wireframe').onChange(v => mesh.material.wireframe = v);

const animFolder = gui.addFolder('Animation');
animFolder.add(params, 'rotSpeed', 0, 5, 0.1).name('Rotation Speed');

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    mesh.rotation.y += params.rotSpeed * clock.getDelta();
    renderer.render(scene, camera);
}
animate();
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html>
3: <head><style>body { margin: 0; }</style></head>
4: <body>
5: <script type="importmap">
6:   {
7:     "imports": {
8:       "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
9:       "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
10:    }
11:  }
12: </script>
13: <script type="module">
14: // +++ replaced previous script block +++
15: import * as THREE from 'three'; // ← new
16: import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm'; // ← new
17: 
18: const scene = new THREE.Scene(); // ← new
19: const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); // ← new
20: const renderer = new THREE.WebGLRenderer(); // ← new
21: renderer.setSize(window.innerWidth, window.innerHeight); // ← new
22: document.body.appendChild(renderer.domElement); // ← new
23: camera.position.z = 3; // ← new
24: 
25: const mesh = new THREE.Mesh( // ← new
26:     new THREE.BoxGeometry(1, 1, 1), // ← new
27:     new THREE.MeshStandardMaterial({ color: 0xff4400, roughness: 0.5, metalness: 0 }) // ← new
28: ); // ← new
29: scene.add(mesh); // ← new
30: const ambientLight = new THREE.AmbientLight(0xffffff, 1); // ← new
31: scene.add(ambientLight); // ← new
32: 
33: const params = { // ← new
34:     color:      '#ff4400', // ← new
35:     roughness:  0.5, // ← new
36:     metalness:  0.0, // ← new
37:     wireframe:  false, // ← new
38:     rotSpeed:   1.0, // ← new
39: }; // ← new
40: 
41: const gui = new GUI(); // ← new
42: const matFolder = gui.addFolder('Material'); // ← new
43: matFolder.addColor(params, 'color').onChange(v => mesh.material.color.set(v)); // ← new
44: matFolder.add(params, 'roughness', 0, 1, 0.01).onChange(v => mesh.material.roughness = v); // ← new
45: matFolder.add(params, 'metalness', 0, 1, 0.01).onChange(v => mesh.material.metalness = v); // ← new
46: matFolder.add(params, 'wireframe').onChange(v => mesh.material.wireframe = v); // ← new
47: 
48: const animFolder = gui.addFolder('Animation'); // ← new
49: animFolder.add(params, 'rotSpeed', 0, 5, 0.1).name('Rotation Speed'); // ← new
50: 
51: const clock = new THREE.Clock(); // ← new
52: function animate() { // ← new
53:     requestAnimationFrame(animate); // ← new
54:     mesh.rotation.y += params.rotSpeed * clock.getDelta(); // ← new
55:     renderer.render(scene, camera); // ← new
56: } // ← new
57: animate(); // ← new
58: // +++ end replacement +++
59: </script>
60: </body>
61: </html>
```

The script now builds a full Three.js scene, maps GUI events to Three.js material properties, and uses a GUI parameter continuously in the render loop.

### Mechanical walkthrough
1. `import * as THREE from 'three'`: We import the Three.js library using an import map.
2. `const mesh = new THREE.Mesh(...)`: We create a standard mesh with a box geometry and a standard material.
3. `const params = { color: '#ff4400', roughness: 0.5, ... }`: We set up our state container for the GUI.
4. `const matFolder = gui.addFolder('Material')`: We call `addFolder` on `gui`, creating a collapsible "Material" group.
5. `matFolder.addColor(params, 'color')`: We add a color picker to the folder.
6. `.onChange(v => mesh.material.color.set(v))`: Inside the `onChange` callback, we call `mesh.material.color.set(v)`. `v` is the hex string from the GUI (like `'#0088ff'`). The `set()` method on Three.js's `Color` object correctly parses this CSS string and updates the internal RGB values.
7. `matFolder.add(params, 'roughness', 0, 1, 0.01).onChange(v => mesh.material.roughness = v)`: We add a slider for roughness and directly assign the new value `v` to `mesh.material.roughness`.
8. `animFolder.add(params, 'rotSpeed', 0, 5, 0.1)`: We add a slider for `rotSpeed`, but notice we do *not* attach an `.onChange` event.
9. `mesh.rotation.y += params.rotSpeed * clock.getDelta()`: Inside the `animate` loop, we read `params.rotSpeed` continuously every frame.

### CS lens
Notice the two different data-flow patterns. The material properties (color, roughness) use an **Event-Driven Push** pattern: they only update the Three.js object precisely when the user modifies the GUI. This avoids constantly rewriting material properties on the GPU when they haven't changed. The rotation speed uses a **Continuous Poll** pattern: the animation loop reads the `params.rotSpeed` value directly from the object 60 times a second. Because the loop must calculate a delta every frame regardless, polling the state object is efficient and correct.

### SE lens
Using `addFolder()` is an architectural principle of **High Cohesion**. As scenes grow, a flat list of 50 sliders becomes unusable. Grouping related parameters (Material, Animation, Lighting) into discrete folders makes the debug panel reflect the domain model of the application, rather than just being a raw data dump.

### Commands needed
Open lesson-30.html in a modern browser.

### Run it
Open the file. You will see a rotating 3D box. Open the "Material" folder in the GUI, pick a new color, and drag the roughness slider; the box immediately updates. Drag the "Rotation Speed" slider in the "Animation" folder, and the box speeds up or slows down instantly.

### One sentence connecting to previous unit
Now that we can change values and see them applied to the scene, we'll discover that refreshing the page wipes out our perfect settings, which we can solve by persisting the GUI state.

## Concept Unit: GUI presets and saving state
### The Problem
You spend 10 minutes carefully tweaking colors, roughness, and animation speeds until the scene looks perfect. Then you reload the page, and everything reverts to the hardcoded defaults in the script. How do we save our tweaked `params` object so that the next time the page loads, the GUI and the scene remember our custom settings?

### Introduce the concept in isolation
We will serialize our parameters into a string, save it to the browser's persistent storage, and reload it.

```html
<script type="module">
const params = { intensity: 1.0, color: '#ffffff' };

// Simulate reading from previous session
const savedData = '{"intensity":0.5,"color":"#ff0000"}'; 
localStorage.setItem('mockGuiParams', savedData);

// On load:
const saved = localStorage.getItem('mockGuiParams');
if (saved) {
    Object.assign(params, JSON.parse(saved));
}
console.log('Restored params:', params);
</script>
```

Predicted Output: `Restored params: { intensity: 0.5, color: '#ff0000' }`.

This is called **State Persistence**. The output proves that by parsing a JSON string and using `Object.assign()`, we can seamlessly overwrite the default values in our `params` object with the saved values, automatically updating anything that reads from it.

### Discard the throwaway
This simulated persistence script is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-30.html` (modified).
- **Change type:** Add.
- **Location:** Right after the GUI folder setups, before the animation loop.
- **Dependencies:** None.

### The New Code
```javascript
const saved = localStorage.getItem('guiParams');
if (saved) {
    Object.assign(params, JSON.parse(saved));
}

gui.onChange(() => {
    localStorage.setItem('guiParams', JSON.stringify(params));
});
```

### The Updated Project
```html
46: matFolder.add(params, 'wireframe').onChange(v => mesh.material.wireframe = v);
47: 
48: const animFolder = gui.addFolder('Animation');
49: animFolder.add(params, 'rotSpeed', 0, 5, 0.1).name('Rotation Speed');
50: 
51: const saved = localStorage.getItem('guiParams'); // ← new
52: if (saved) { // ← new
53:     Object.assign(params, JSON.parse(saved)); // ← new
54: } // ← new
55: 
56: gui.onChange(() => { // ← new
57:     localStorage.setItem('guiParams', JSON.stringify(params)); // ← new
58: }); // ← new
59: 
60: const clock = new THREE.Clock();
61: function animate() {
```

We read from `localStorage` during initialization and attach a global `onChange` listener to the `gui` instance to save changes.

### Mechanical walkthrough
1. `const saved = localStorage.getItem('guiParams')`: We query the browser's built-in `localStorage` for the key `'guiParams'`. If nothing was saved, this returns `null`.
2. `if (saved) { ... }`: We check if data exists.
3. `JSON.parse(saved)`: We convert the saved JSON string back into a JavaScript object.
4. `Object.assign(params, ...)`: We merge the parsed object's properties directly into our existing `params` object, overwriting the default values while preserving any keys that might not have been saved.
5. `gui.onChange(() => { ... })`: We attach a global change listener to the `gui` instance. Unlike a controller-specific `onChange`, this fires whenever *any* controller in the entire GUI is modified.
6. `localStorage.setItem('guiParams', JSON.stringify(params))`: Whenever a change occurs, we serialize the entire `params` object into a JSON string and store it under the `'guiParams'` key.

### CS lens
This implements **Serialization and Deserialization** across a persistence boundary. Because memory structures (like JavaScript objects) are transient and lost on shutdown, we must serialize them into a linear format (JSON) to cross the boundary into persistent storage (the hard drive via `localStorage`), and deserialize them when crossing back.

### SE lens
Notice that `Object.assign()` happens *before* we enter the render loop, but *after* the GUI controls are added. Because lil-gui reads the current state of the `params` object on initialization, doing this means the sliders and pickers will automatically match the restored values. If we added the GUI controls *before* assigning the values, the UI would show defaults while the scene used saved values, causing a desync bug.

### Commands needed
Open lesson-30.html in a modern browser.

### Run it
Load the page, change the color to bright blue, and change the rotation speed. Refresh the page. The box will still be bright blue and spinning at your custom speed.

### One sentence connecting to previous unit
While sliders and colors cover numeric and visual data, sometimes we need to execute discrete actions or pick from a specific list of options.

## Concept Unit: Adding buttons and dropdowns
### The Problem
How do we trigger a one-off action, like resetting the camera position, from the GUI? A slider or checkbox represents a continuous or binary state, but an action is an event. Furthermore, what if we want to change the material type, which must be chosen from a specific list of strings (Standard, Phong, Basic), rather than typed freely?

### Introduce the concept in isolation
We will define a parameter as an array (for a dropdown) and a parameter as a function (for a button).

```html
<script type="module">
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';
const params = {
    materialType: 'Standard',
    triggerAlert: () => { console.log('Button clicked!'); }
};

const gui = new GUI();
gui.add(params, 'materialType', ['Standard', 'Phong', 'Basic']).onChange(v => console.log('Selected:', v));
gui.add(params, 'triggerAlert').name('Click Me');
</script>
```

Predicted Output: A panel with a dropdown menu offering three choices, and a clickable button labeled "Click Me" that logs to the console when clicked.

This is called **Type Inference Mapping**. The output proves that passing an array as the third argument signals lil-gui to build a `<select>` dropdown, and defining the property itself as a `function` signals it to build a `<button>` that executes the function on click.

### Discard the throwaway
This snippet is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-30.html` (modified).
- **Change type:** Add.
- **Location:** Adding to the `params` object and GUI setup.
- **Dependencies:** None.

### The New Code
```javascript
const params = {
    color:      '#ff4400',
    roughness:  0.5,
    metalness:  0.0,
    wireframe:  false,
    rotSpeed:   1.0,
    material:   'Standard',
    resetCamera: () => {
        camera.position.set(0, 0, 3);
        camera.lookAt(0, 0, 0);
    },
};

// ... existing code ...

const actionFolder = gui.addFolder('Actions');
actionFolder.add(params, 'material', ['Standard', 'Phong', 'Basic'])
   .name('Material Type')
   .onChange(v => {
       const colors = { Standard: THREE.MeshStandardMaterial, Phong: THREE.MeshPhongMaterial, Basic: THREE.MeshBasicMaterial };
       mesh.material.dispose();
       mesh.material = new (colors[v] || THREE.MeshStandardMaterial)({ color: params.color, roughness: params.roughness });
   });

actionFolder.add(params, 'resetCamera').name('Reset Camera');
```

### The Updated Project
```html
33: const params = {
34:     color:      '#ff4400',
35:     roughness:  0.5,
36:     metalness:  0.0,
37:     wireframe:  false,
38:     rotSpeed:   1.0,
39:     material:   'Standard', // ← new
40:     resetCamera: () => { // ← new
41:         camera.position.set(0, 0, 3); // ← new
42:         camera.lookAt(0, 0, 0); // ← new
43:     }, // ← new
44: };
45: 
46: const gui = new GUI();
...
50: 
51: const actionFolder = gui.addFolder('Actions'); // ← new
52: actionFolder.add(params, 'material', ['Standard', 'Phong', 'Basic']) // ← new
53:    .name('Material Type') // ← new
54:    .onChange(v => { // ← new
55:        const colors = { Standard: THREE.MeshStandardMaterial, Phong: THREE.MeshPhongMaterial, Basic: THREE.MeshBasicMaterial }; // ← new
56:        mesh.material.dispose(); // ← new
57:        mesh.material = new (colors[v] || THREE.MeshStandardMaterial)({ color: params.color, roughness: params.roughness }); // ← new
58:    }); // ← new
59: actionFolder.add(params, 'resetCamera').name('Reset Camera'); // ← new
```

We expand our params object with a string and a function, then bind them to the GUI as a dropdown and a button.

### Mechanical walkthrough
1. `material: 'Standard'`: We add a string property to hold the selected material type.
2. `resetCamera: () => { ... }`: We add a property whose value is a function containing our reset logic.
3. `actionFolder.add(params, 'material', ['Standard', 'Phong', 'Basic'])`: We call `add`, but pass an array of strings as the third argument. lil-gui detects the array and generates a dropdown selector instead of a text input.
4. `.onChange(v => { ... })`: When the dropdown changes, we look up the corresponding Three.js material class from our `colors` dictionary.
5. `mesh.material.dispose()`: We call `dispose()` on the old material to free up GPU memory before replacing it.
6. `mesh.material = new (colors[v] || THREE.MeshStandardMaterial)(...)`: We instantiate the new material class, passing in our current `params.color` and `params.roughness` so the visual state isn't lost on switch.
7. `actionFolder.add(params, 'resetCamera')`: We bind the function property. lil-gui detects `typeof params.resetCamera === 'function'` and generates a button.

### CS lens
Using a dictionary `const colors = { ... }` to map string keys to Class Constructors is a **Registry Pattern**. Instead of writing a massive `if/else` or `switch` statement to instantiate the correct material, we use the string value `v` from the UI directly as an index into an object containing constructor references.

### SE lens
When replacing complex objects like Three.js Materials or Geometries at runtime, you must explicitly manage memory by calling `.dispose()`. Unlike standard JavaScript garbage collection, WebGL resources reside on the GPU. If we just dropped the reference (`mesh.material = new...`), the old material would remain in VRAM, causing a **Memory Leak**.

### Commands needed
Open lesson-30.html in a modern browser.

### Run it
Click the "Reset Camera" button; if you had moved the camera (or altered its position in code), it jumps back. Change the Material Type dropdown to "Basic"; the cube will suddenly lose all shading and appear flat, confirming the material swap logic works.

### One sentence connecting to previous unit
All our controls so far push data *from* the UI *to* the application, but sometimes we need the UI to display data changing *inside* the application in real-time.

## Concept Unit: Dynamically updating and destroying GUI
### The Problem
If we want to track real-time engine statistics like frames-per-second (FPS) or total draw calls, the application needs to update the GUI automatically. By default, lil-gui only reads the `params` object once when `.add()` is called. How do we tell the GUI to continuously poll the object and update its display? Furthermore, if we build a complex Single Page Application that switches scenes, how do we remove the GUI panel entirely without leaving orphaned HTML elements?

### Introduce the concept in isolation
We will create a controller that listens for programmatic changes to a value.

```html
<script type="module">
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';
const params = { time: 0 };
const gui = new GUI();
gui.add(params, 'time').listen();

setInterval(() => {
    params.time += 1;
}, 1000);
</script>
```

Predicted Output: A panel with a "time" input that automatically increments every second.

This is called **Passive Binding**. The output proves that calling `.listen()` on a controller instructs it to check its target property on every frame and redraw itself if the underlying value has changed from somewhere else in the code.

### Discard the throwaway
This snippet is deleted and will not appear in the project again.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-30.html` (modified).
- **Change type:** Add.
- **Location:** Adding FPS tracking variables and binding them to the GUI.
- **Dependencies:** None.

### The New Code
```javascript
Object.assign(params, { fps: 0, drawCalls: 0 });

const statsFolder = gui.addFolder('Stats');
statsFolder.add(params, 'fps').name('FPS').listen().disable();
statsFolder.add(params, 'drawCalls').name('Draw Calls').listen().disable();

let lastTime = performance.now();
let frames = 0;

// inside animate():
frames++;
const now = performance.now();
if (now - lastTime >= 1000) {
    params.fps = frames;
    params.drawCalls = renderer.info.render.calls;
    frames = 0;
    lastTime = now;
}

// when done:
// gui.destroy();
```

### The Updated Project
```html
46: const actionFolder = gui.addFolder('Actions');
...
50: 
51: Object.assign(params, { fps: 0, drawCalls: 0 }); // ← new
52: const statsFolder = gui.addFolder('Stats'); // ← new
53: statsFolder.add(params, 'fps').name('FPS').listen().disable(); // ← new
54: statsFolder.add(params, 'drawCalls').name('Draw Calls').listen().disable(); // ← new
55: 
56: let lastTime = performance.now(); // ← new
57: let frames = 0; // ← new
58: 
59: const clock = new THREE.Clock();
60: function animate() {
61:     requestAnimationFrame(animate);
62:     mesh.rotation.y += params.rotSpeed * clock.getDelta();
63:     
64:     frames++; // ← new
65:     const now = performance.now(); // ← new
66:     if (now - lastTime >= 1000) { // ← new
67:         params.fps = frames; // ← new
68:         params.drawCalls = renderer.info.render.calls; // ← new
69:         frames = 0; // ← new
70:         lastTime = now; // ← new
71:     } // ← new
72: 
73:     renderer.render(scene, camera);
74: }
```

We track rendering metrics manually over a 1-second window and write them to `params`. The GUI automatically reflects these updates.

### Mechanical walkthrough
1. `Object.assign(params, { fps: 0, drawCalls: 0 })`: We dynamically inject two new numeric properties into our state object.
2. `statsFolder.add(params, 'fps').listen()`: We chain `.listen()` to the controller. This forces lil-gui to run a check every frame: "does the DOM input match `params.fps`? If not, update the DOM."
3. `.disable()`: We chain `.disable()` to make the input greyed out. It is a read-only statistic; the user shouldn't try to edit the FPS.
4. `let lastTime = performance.now()`: We capture a high-resolution timestamp using the browser's `performance` API.
5. `frames++`: Inside the render loop, we increment our counter every time a frame is drawn.
6. `if (now - lastTime >= 1000)`: We check if exactly 1000 milliseconds (1 second) have elapsed since the last reset.
7. `params.fps = frames`: We write the accumulated frame count into our state object. Because of `.listen()`, the GUI instantly updates.
8. `params.drawCalls = renderer.info.render.calls`: We extract the current number of WebGL draw calls from Three.js's internal info registry and expose it to the GUI.
9. `gui.destroy()`: (Commented concept) If we ever needed to tear down this scene, calling this method would immediately unhook all these listeners and delete the HTML panel, returning memory to the browser.

### CS lens
Polling a value in UI updates is essentially the **Observer Pattern** reversed. Usually, the data subject explicitly notifies observers when it changes (push). By using `.listen()`, the UI element constantly asks the data subject "have you changed?" (pull). While slightly less efficient, it drastically simplifies application code because the renderer doesn't need to know the GUI exists to trigger an update.

### SE lens
Exposing `renderer.info.render.calls` is critical for **Performance Profiling**. In modern graphics, rendering one complex mesh (1 draw call) is vastly cheaper than rendering 10,000 simple cubes (10,000 draw calls) due to CPU-to-GPU communication overhead. Having this metric visible immediately tells you if adding a new feature destroyed your rendering budget.

### Commands needed
Open lesson-30.html in a modern browser.

### Run it
Watch the "Stats" folder in your GUI. Every second, the FPS will update (usually sitting near 60) and the Draw Calls will read 1 (since we only have one mesh in the scene). 

### One sentence connecting to previous unit
With bi-directional data flow established, our debug panel is fully capable of manipulating and monitoring the entire lifecycle of a 3D application.

## Closing
### Connect the pieces
Throughout this lesson, we traced the path of data across the boundary between standard HTML and a WebGL canvas. When you add a roughness slider `matFolder.add(params, 'roughness', 0, 1).onChange(...)`, you establish a pipeline: the DOM slider moves, it mutates `params.roughness`, it fires the `onChange` callback, and your code assigns the new value to `mesh.material.roughness`. On the next `requestAnimationFrame`, the GPU re-renders the pixels using the updated material properties. This architecture—a centralized state object watched by both the interface and the engine—is exactly how professional game editors stay synchronized without entangling their rendering logic with their button click logic.
