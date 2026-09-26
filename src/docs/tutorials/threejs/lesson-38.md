# Lesson 38: Capstone — 3D Data Visualization: Bar Chart, Labels, and Animated Transitions

**What you will build**
You will build an interactive, animated 3D bar chart using Three.js and GSAP. The feature maps dataset values to the physical height of 3D geometry, adding dynamic canvas-based labels and interactive raycaster hover tooltips. The transferable insight here is that 3D data visualization relies on the exact same primitives as games and simulations: geometry properties driven by data, spatial positioning, texture mapping for text, raycasting for interaction, and tweening for smooth state transitions.

**What you need to know first**
- Lesson 37 (Camera Controls and Lighting)

**Terms used in this lesson**
- **Data-to-geometry mapping** — The concept of translating abstract numerical data into physical 3D dimensions (like height or color). It exists to bridge the gap between pure information and spatial representation, allowing users to perceive differences visually.
- **Raycasting** — The technique of projecting a ray from a point (usually the camera) through a 2D screen coordinate into 3D space to detect intersections with objects. It solves the problem of mapping a user's 2D mouse position to 3D elements in a scene.
- **Tweening** — Short for in-betweening, it is the process of generating intermediate frames between two states to create the illusion of smooth motion. It solves the jarring effect of instantly snapping values from one state to another.
- **Sprite** — A 2D image or plane in a 3D environment that always faces the camera. It solves the problem of displaying flat UI elements or text labels that need to remain readable regardless of the viewing angle.

**Objects and methods used**

**THREE.BoxGeometry**
- *What it is:* A geometry class for a rectangular cuboid.
- *Implementation:* `new THREE.BoxGeometry(width, height, depth)`
- *Its use:* We use it to create the physical bars of our 3D chart, scaling the height based on our data values.
- *Type:* Class
- *Responsibility:* Constructs the vertex and face data required to render a 3D box.
- *Depends on:* Width, height, and depth dimensions.
- *Connects to:* A `THREE.Mesh` which combines this geometry with a material.
- *Shape:* A primitive geometry within the Three.js modeling layer.

**THREE.CanvasTexture**
- *What it is:* A texture generated from an HTML `<canvas>` element.
- *Implementation:* `new THREE.CanvasTexture(canvas)`
- *Its use:* We use it to turn dynamic 2D text rendered on a canvas into a texture that can be applied to 3D objects, specifically for our axis labels and legend.
- *Type:* Class
- *Responsibility:* Bridges 2D browser canvas contexts into WebGL-compatible textures.
- *Depends on:* An HTML `<canvas>` element with drawn content.
- *Connects to:* A material (like `SpriteMaterial`) that requires a texture map.
- *Shape:* A texture resource within the Three.js rendering layer.

**THREE.Sprite**
- *What it is:* A 3D object that always faces the camera.
- *Implementation:* `new THREE.Sprite(material)`
- *Its use:* We use it to hold our CanvasTexture labels so they are always flat and readable to the user as they orbit the chart.
- *Type:* Class
- *Responsibility:* Maintains rotation to directly face the active camera frame-by-frame.
- *Depends on:* A `SpriteMaterial`.
- *Connects to:* The Scene (to be rendered) and Camera (for orientation).
- *Shape:* A specific scene graph node type.

**gsap.to()**
- *What it is:* The core animation method of the GreenSock Animation Platform (GSAP).
- *Implementation:* `gsap.to(target, { properties, duration, ease })`
- *Its use:* We use it to smoothly animate the height and position of our bars when transitioning between datasets.
- *Type:* Static method
- *Responsibility:* Interpolates properties of a target object over a given duration.
- *Depends on:* A target object, destination property values, and timing settings.
- *Connects to:* The target's properties (modifying them directly over time).
- *Shape:* An external utility library function driving state mutations.

**THREE.Raycaster**
- *What it is:* A utility for detecting intersections between a mathematical ray and 3D meshes.
- *Implementation:* `new THREE.Raycaster()`
- *Its use:* We use it to detect when the user's mouse hovers over a specific bar to display its data in a tooltip.
- *Type:* Class
- *Responsibility:* Casts a line through 3D space and returns an array of objects it hits, sorted by distance.
- *Depends on:* A starting point and direction vector (or a 2D mouse coordinate and a camera).
- *Connects to:* The array of meshes you ask it to test against.
- *Shape:* An interaction utility bridging UI input to spatial geometry.

**Everything else in the file, not this lesson's subject but still explained:**

**THREE.Scene**
- *What it is:* The root container for 3D objects, lights, and cameras.
- *Implementation:* `new THREE.Scene()`
- *Its use:* Holds our chart elements.
- *Type:* Class
- *Responsibility:* Maintains the scene graph hierarchy.
- *Depends on:* Nothing.
- *Connects to:* The WebGLRenderer.
- *Shape:* The root node of the 3D application architecture.

## Concept Unit: Data model and bar geometry mapping

### The Problem
How do we turn raw JSON-like data into physical 3D dimensions?
If we have a dataset of monthly sales, how do we systematically convert a value like "220" into a height that fits visually into our 3D scene without breaking out of the camera's view? Pause and consider: if the highest value is 220, but our screen only comfortably shows 10 units of vertical 3D space, what mathematical operation maps the data to the geometry?

### Introduce the concept in isolation
We will create a simple scaling function that divides any data value by the maximum possible data value, then multiplies it by our desired maximum 3D height.

```javascript
const maxDataValue = 220;
const maxWorldHeight = 5;

function valueToHeight(v) {
    return (v / maxDataValue) * maxWorldHeight;
}

console.log('valueToHeight(220):', valueToHeight(220));
console.log('valueToHeight(110):', valueToHeight(110));
```

This output (5 and 2.5) proves that our **data-to-geometry mapping** successfully scales any arbitrary domain value into a bounded range suitable for 3D world coordinates. This is called **normalization and scaling**.

### Discard the throwaway
We will discard this exact throwaway script, but we will port the mathematical logic directly into our charting script in the actual project.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are building a new data visualization capstone.
- **Files affected:** Created `lesson-38.html`.
- **Change type:** Add.
- **Location:** Inside the `<script type="module">` tag.
- **Dependencies:** Three.js module CDN.

### The New Code
```html
<!DOCTYPE html>
<html>
<head>
    <style>body { margin: 0; } canvas { display: block; }</style>
    <script type="importmap">
    {"imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
    }}
    </script>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
</head>
<body>
    <canvas id="c"></canvas>
    <script type="module">
        import * as THREE from 'three';

        const dataset = [
            {label:'Jan',  values:[120, 80, 60]},
            {label:'Feb',  values:[150, 95, 70]},
            {label:'Mar',  values:[90,  130, 85]},
            {label:'Apr',  values:[200, 110, 95]},
            {label:'May',  values:[175, 140, 120]},
            {label:'Jun',  values:[220, 160, 140]},
        ];
        
        const CATEGORIES = ['Product A', 'Product B', 'Product C'];
        const COLORS = [0x4488ff, 0xff6644, 0x44cc88];
        const MAX_VAL = 220;
        const BAR_MAX_HEIGHT = 5;

        function valueToHeight(v) { 
            return (v / MAX_VAL) * BAR_MAX_HEIGHT; 
        }
    </script>
</body>
</html>
```

### The Updated Project
```html
1: <script type="module">
2:     import * as THREE from 'three';
3: 
4:     // ← new
5:     const dataset = [
6:         {label:'Jan',  values:[120, 80, 60]},
7:         {label:'Feb',  values:[150, 95, 70]},
8:         {label:'Mar',  values:[90,  130, 85]},
9:         {label:'Apr',  values:[200, 110, 95]},
10:        {label:'May',  values:[175, 140, 120]},
11:        {label:'Jun',  values:[220, 160, 140]},
12:    ];
13:    
14:    const CATEGORIES = ['Product A', 'Product B', 'Product C'];
15:    const COLORS = [0x4488ff, 0xff6644, 0x44cc88];
16:    const MAX_VAL = 220;
17:    const BAR_MAX_HEIGHT = 5;
18:
19:    function valueToHeight(v) { 
20:        return (v / MAX_VAL) * BAR_MAX_HEIGHT; 
21:    }
22: </script>
```
We now have our static dataset defined, along with the helper function that translates the data values into absolute 3D heights using proportional scaling.

### Mechanical walkthrough
- `const dataset = [...]`: We define an array of objects. Each object represents a month and contains a `label` and an array of numerical `values` corresponding to product categories.
- `const CATEGORIES`: An array mapping the indexes of the `values` array to human-readable product names.
- `const COLORS`: An array mapping the indexes to specific hex color codes.
- `const MAX_VAL = 220`: We define the highest possible value in our domain so we have a static denominator.
- `const BAR_MAX_HEIGHT = 5`: We define the maximum physical height a bar can reach in world units.
- `function valueToHeight(v)`: A function that takes a raw value `v`.
- `(v / MAX_VAL)`: It calculates the ratio of the value to the maximum (a float between 0 and 1).
- `* BAR_MAX_HEIGHT`: It multiplies that ratio by the physical limit, returning the final height to be applied to a geometry.

### CS lens
This mapping is a linear interpolation (lerp) from one one-dimensional space to another. The concept of separating the raw data (the domain) from its visual representation (the range) is the cornerstone of all data visualization. By using a helper function to bridge the two, we decouple our business logic from our rendering logic.

### SE lens
Hardcoding constants like `MAX_VAL` and `BAR_MAX_HEIGHT` at the top of the module is a deliberate configuration pattern. It ensures that if the dataset scales up in the future, developers only have to change the configuration parameters in one place, avoiding magic numbers scattered throughout geometry instantiations.

### Commands needed
There are no terminal commands needed for this step as we are just preparing the HTML file structure and data.

### Run it
No visual output is rendered yet, but the data structures are loaded into browser memory.

### One sentence connecting to previous unit
Now that we have a mathematical bridge between data and geometry, we can use it to actually generate the physical 3D bars.

## Concept Unit: Building the bar chart

### The Problem
How do we convert our array of arrays into a spaced-out grid of 3D boxes?
If we loop over the months and the categories, creating a box for each, they will all spawn exactly at `(0, 0, 0)` and overlap. Pause and attempt this: how would you calculate the X position for the months so they sit side-by-side, and the Z position for the categories so they sit behind each other?

### Introduce the concept in isolation
We will demonstrate spacing using a simple loop calculation.

```javascript
const GROUP_SPACING = 2.5;
const numGroups = 6;
for (let mi = 0; mi < numGroups; mi++) {
    const xPos = mi * GROUP_SPACING - (numGroups - 1) * GROUP_SPACING / 2;
    console.log(`Group ${mi} X position:`, xPos);
}
```

This output proves that subtracting half the total width `(numGroups - 1) * GROUP_SPACING / 2` from the current offset `mi * GROUP_SPACING` perfectly centers the entire structure around `x = 0`. This is called **origin-centered offset alignment**.

### Discard the throwaway
We discard this snippet, but will use its centering logic directly in our mesh positioning code.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-38.html`.
- **Change type:** Add.
- **Location:** Below the `valueToHeight` function.
- **Dependencies:** The previously defined `dataset`.

### The New Code
```javascript
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.add(new THREE.AmbientLight(0x444466, 1));
const dir = new THREE.DirectionalLight(0xffffff, 1.5);
dir.position.set(10, 20, 10);
scene.add(dir);

const bars = [];
const GROUP_SPACING = 2.5;
const BAR_SPACING = 0.8;

dataset.forEach((month, mi) => {
    month.values.forEach((val, ci) => {
        const h = valueToHeight(val);
        const geo = new THREE.BoxGeometry(0.6, h, 0.6);
        const mat = new THREE.MeshStandardMaterial({
            color: COLORS[ci],
            roughness: 0.4,
            metalness: 0.3,
        });
        const mesh = new THREE.Mesh(geo, mat);
        
        mesh.position.set(
            mi * GROUP_SPACING - (dataset.length - 1) * GROUP_SPACING / 2,
            h / 2,
            (ci - 1) * BAR_SPACING
        );
        
        mesh.userData = { month: month.label, category: CATEGORIES[ci], value: val };
        scene.add(mesh);
        bars.push({ mesh, targetHeight: h });
    });
});
```

### The Updated Project
```javascript
1:  function valueToHeight(v) { 
2:      return (v / MAX_VAL) * BAR_MAX_HEIGHT; 
3:  }
4:  
5:  // ← new
6:  const scene = new THREE.Scene();
7:  scene.background = new THREE.Color(0x1a1a2e);
8:  scene.add(new THREE.AmbientLight(0x444466, 1));
9:  const dir = new THREE.DirectionalLight(0xffffff, 1.5);
10: dir.position.set(10, 20, 10);
11: scene.add(dir);
12: 
13: const bars = [];
14: const GROUP_SPACING = 2.5;
15: const BAR_SPACING = 0.8;
16: 
17: dataset.forEach((month, mi) => {
18:     month.values.forEach((val, ci) => {
19:         const h = valueToHeight(val);
20:         const geo = new THREE.BoxGeometry(0.6, h, 0.6);
21:         const mat = new THREE.MeshStandardMaterial({
22:             color: COLORS[ci],
23:             roughness: 0.4,
24:             metalness: 0.3,
25:         });
26:         const mesh = new THREE.Mesh(geo, mat);
27:         
28:         mesh.position.set(
29:             mi * GROUP_SPACING - (dataset.length - 1) * GROUP_SPACING / 2,
30:             h / 2,
31:             (ci - 1) * BAR_SPACING
32:         );
33:         
34:         mesh.userData = { month: month.label, category: CATEGORIES[ci], value: val };
35:         scene.add(mesh);
36:         bars.push({ mesh, targetHeight: h });
37:     });
38: });
```
We set up our foundational Three.js `Scene` and lighting, then iterate through every data point. For each point, we create a specific `BoxGeometry` sized to its value, apply a colored `MeshStandardMaterial`, and physically position it in a spaced grid. We also store the original data right inside the mesh's `userData` property.

### Mechanical walkthrough
- `new THREE.Scene()`: Initializes the 3D scene container.
- `scene.background = new THREE.Color(0x1a1a2e)`: Sets a dark blue ambient backdrop.
- `new THREE.AmbientLight(...)`: Adds base illumination so shadows aren't pitch black.
- `new THREE.DirectionalLight(...)`: Adds a directional sun-like light for material shading.
- `const bars = []`: Initializes an array to hold references to our generated meshes for later updates.
- `dataset.forEach((month, mi) => { ... })`: Iterates over the months, where `mi` is the month index.
- `month.values.forEach((val, ci) => { ... })`: Iterates over the values in a month, where `ci` is the category index.
- `const h = valueToHeight(val)`: Uses our helper to get the physical height.
- `new THREE.BoxGeometry(0.6, h, 0.6)`: Creates a box with fixed width and depth (0.6), but dynamic height `h`.
- `new THREE.MeshStandardMaterial(...)`: Creates a material using the corresponding color from `COLORS[ci]`.
- `new THREE.Mesh(geo, mat)`: Combines the geometry and material.
- `mesh.position.set(...)`: Sets the X, Y, and Z positions.
- `mi * GROUP_SPACING - ...`: Calculates the X coordinate to center the months horizontally.
- `h / 2`: Calculates the Y coordinate. Since BoxGeometry creates boxes centered around their origin, moving it up by half its height places its base exactly flat on `y = 0`.
- `(ci - 1) * BAR_SPACING`: Calculates the Z coordinate. By subtracting 1 from `ci` (which ranges 0, 1, 2), we get offsets of -1, 0, and 1, centering the three categories on the Z axis.
- `mesh.userData = { ... }`: A built-in Three.js dictionary object on every 3D object for storing arbitrary application data.
- `scene.add(mesh)`: Adds the object to the renderer's graph.
- `bars.push(...)`: Saves it to our custom array.

### CS lens
Using `mesh.userData` is a classic example of embedding abstract metadata into a spatial node. Rather than maintaining a complex mapping between spatial bounding volumes and an external database, the data point physically carries its own identity. When the raycaster hits the geometry later, all the context needed to describe it is immediately available on the hit target.

### SE lens
We create a brand new `BoxGeometry` and `MeshStandardMaterial` for every single bar. In a massive dataset (thousands of points), this un-instanced approach would crater performance due to draw calls and memory overhead. We accept this trade-off here because 18 bars render trivially, keeping our implementation straightforward.

### Commands needed
There are no terminal commands needed.

### Run it
Still no visual output because we have not initialized a `WebGLRenderer` or a camera to view the scene.

### One sentence connecting to previous unit
Our bars now represent the data physically, but users won't know what the bars mean without text labels.

## Concept Unit: CanvasTexture labels for months and categories

### The Problem
How do we display dynamic, readable text in a 3D WebGL context?
WebGL doesn't have a native "DOM text" primitive — everything is drawn using triangles and textures. Pause and think: if you can draw text to a 2D HTML5 canvas, and WebGL can accept image textures, how do you bridge the two?

### Introduce the concept in isolation
We will draw text to an invisible HTML canvas, then log its data URL to prove the text is rendered as an image buffer.

```javascript
const canvas = document.createElement('canvas');
canvas.width = 256; canvas.height = 64;
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'red';
ctx.fillRect(0, 0, 256, 64);
ctx.fillStyle = 'white';
ctx.font = '32px Arial';
ctx.fillText('Test', 10, 40);

// We won't output the massive base64 string, but it exists:
// console.log(canvas.toDataURL());
```

This hidden canvas generation proves that HTML Canvas API can programmatically bake complex text rendering into pixel buffers entirely in memory. This technique is called **canvas texture baking**.

### Discard the throwaway
We discard this snippet, but will wrap its logic in a helper function to turn the resulting canvas directly into a `THREE.CanvasTexture`.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-38.html`.
- **Change type:** Add.
- **Location:** Below the bar generation loops.
- **Dependencies:** The previously defined spatial constants.

### The New Code
```javascript
function makeLabelSprite(text, color = '#ffffff', bgColor = 'rgba(0,0,0,0.6)') {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = bgColor; 
    ctx.fillRect(0, 0, 256, 64);
    
    ctx.fillStyle = color;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
    
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    
    sprite.scale.set(1.5, 0.375, 1);
    return sprite;
}

dataset.forEach((month, mi) => {
    const sprite = makeLabelSprite(month.label, '#aaccff');
    sprite.position.set(
        mi * GROUP_SPACING - (dataset.length - 1) * GROUP_SPACING / 2,
        -0.5, 
        0
    );
    scene.add(sprite);
});

CATEGORIES.forEach((cat, ci) => {
    const hexColor = '#' + COLORS[ci].toString(16).padStart(6, '0');
    const sprite = makeLabelSprite(cat, hexColor);
    sprite.position.set(9, 3 - ci * 0.8, 0);
    scene.add(sprite);
});
```

### The Updated Project
```javascript
1:          mesh.userData = { month: month.label, category: CATEGORIES[ci], value: val };
2:          scene.add(mesh);
3:          bars.push({ mesh, targetHeight: h });
4:      });
5:  });
6:  
7:  // ← new
8:  function makeLabelSprite(text, color = '#ffffff', bgColor = 'rgba(0,0,0,0.6)') {
9:      const canvas = document.createElement('canvas');
10:     canvas.width = 256; canvas.height = 64;
11:     const ctx = canvas.getContext('2d');
12:     
13:     ctx.fillStyle = bgColor; 
14:     ctx.fillRect(0, 0, 256, 64);
15:     
16:     ctx.fillStyle = color;
17:     ctx.font = 'bold 32px Arial';
18:     ctx.textAlign = 'center'; 
19:     ctx.textBaseline = 'middle';
20:     ctx.fillText(text, 128, 32);
21:     
22:     const tex = new THREE.CanvasTexture(canvas);
23:     const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
24:     const sprite = new THREE.Sprite(mat);
25:     
26:     sprite.scale.set(1.5, 0.375, 1);
27:     return sprite;
28: }
29: 
30: dataset.forEach((month, mi) => {
31:     const sprite = makeLabelSprite(month.label, '#aaccff');
32:     sprite.position.set(
33:         mi * GROUP_SPACING - (dataset.length - 1) * GROUP_SPACING / 2,
34:         -0.5, 
35:         0
36:     );
37:     scene.add(sprite);
38: });
39: 
40: CATEGORIES.forEach((cat, ci) => {
41:     const hexColor = '#' + COLORS[ci].toString(16).padStart(6, '0');
42:     const sprite = makeLabelSprite(cat, hexColor);
43:     sprite.position.set(9, 3 - ci * 0.8, 0);
44:     scene.add(sprite);
45: });
```
We define a helper function `makeLabelSprite` that creates an in-memory 2D canvas, draws text on it, converts it to a `CanvasTexture`, and mounts it on a `Sprite` object. We then loop over our months and categories to generate and position these flat, camera-facing text labels.

### Mechanical walkthrough
- `const canvas = document.createElement('canvas')`: Creates a DOM `<canvas>` element without appending it to the webpage.
- `canvas.width = 256; canvas.height = 64`: Gives the canvas fixed 4:1 aspect ratio pixel dimensions.
- `const ctx = canvas.getContext('2d')`: Retrieves the 2D drawing API.
- `ctx.fillStyle` & `ctx.fillRect`: Draws the semi-transparent background.
- `ctx.fillText(text, 128, 32)`: Draws the text string exactly in the center of the 256x64 canvas.
- `new THREE.CanvasTexture(canvas)`: Creates a WebGL-compatible texture using the canvas pixel buffer as the image source.
- `new THREE.SpriteMaterial({ map: tex, transparent: true })`: Assigns the texture to a material specifically designed for 2D sprites, enabling transparency processing.
- `new THREE.Sprite(mat)`: Creates the physical Sprite mesh in Three.js.
- `sprite.scale.set(1.5, 0.375, 1)`: Scales the sprite in world units. Because the original canvas is 256x64 (a 4:1 ratio), our world scaling (1.5 x 0.375) maintains that exact 4:1 ratio, preventing the text from stretching.
- `dataset.forEach(...)`: We position a month label directly below each bar group (at `y = -0.5`).
- `COLORS[ci].toString(16).padStart(6, '0')`: Takes the numerical hex value (e.g., `0x4488ff`), converts it to a base-16 string (`"4488ff"`), and prefixes missing zeroes to form a valid CSS hex string for the canvas context.
- `sprite.position.set(9, 3 - ci * 0.8, 0)`: Stacks the category legend sprites physically to the right of the chart.

### CS lens
Using `THREE.Sprite` ensures the label text never breaks perspective. A Sprite bypasses normal 3D rotation matrices; the rendering engine continuously overrides its model-view matrix to align perpendicularly to the camera. This solves the fundamental problem of 3D UI: text skewed at an angle is illegible.

### SE lens
Passing the DOM element directly into `THREE.CanvasTexture` creates a tightly coupled data binding. If the canvas context changes after the texture is created, WebGL requires you to manually flag `texture.needsUpdate = true` to push the new pixel buffer to the GPU. For static labels, doing it once at initialization avoids continuous expensive VRAM uploads.

### Commands needed
No terminal commands needed.

### Run it
Still no visual output because the camera and renderer are pending.

### One sentence connecting to previous unit
The chart and labels are built, but static data is boring; let's allow users to swap datasets and animate the physical transition of the bars.

## Concept Unit: GSAP animated transition between datasets

### The Problem
How do we smoothly change the height of a 3D geometry?
In Three.js, you cannot animate a `BoxGeometry`'s physical height parameters after creation without rebuilding the geometry entirely. Pause and attempt this: if rebuilding is expensive, what transform property exists on a mesh that you *can* change smoothly to make a box look shorter or taller?

### Introduce the concept in isolation
We will use the GSAP animation library to tween an arbitrary object's property over time.

```javascript
const myObj = { val: 5 };
gsap.to(myObj, { val: 10, duration: 1 });

// Simulating what happens over time:
setTimeout(() => console.log('After 500ms, val is roughly:', myObj.val), 500);
setTimeout(() => console.log('After 1000ms, val is:', myObj.val), 1000);
// Output approx: 7.5
// Output exactly: 10
```

This proves that `gsap.to()` takes an object, mutates its specific numerical properties continuously over a set duration, and stops at the target value. This is called **property tweening**.

### Discard the throwaway
We discard this snippet and will apply GSAP directly to our Three.js mesh scales and positions.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-38.html`.
- **Change type:** Add.
- **Location:** Below the label generation.
- **Dependencies:** The GSAP script tag included in the HTML head.

### The New Code
```javascript
const dataset2 = [
    {label:'Jan', values:[80,  140, 180]},
    {label:'Feb', values:[60,  160, 200]},
    {label:'Mar', values:[170, 70,  90]},
    {label:'Apr', values:[90,  190, 110]},
    {label:'May', values:[130, 80,  160]},
    {label:'Jun', values:[185, 100, 220]},
];

function transitionToDataset(newData, duration = 1.5) {
    newData.forEach((month, mi) => {
        month.values.forEach((val, ci) => {
            const barIdx = mi * 3 + ci;
            const { mesh } = bars[barIdx];
            const newH = valueToHeight(val);
            const originalH = mesh.geometry.parameters.height;
            
            gsap.to(mesh.scale, { 
                y: newH / originalH, 
                duration: duration, 
                ease: 'power2.inOut' 
            });
            
            gsap.to(mesh.position, { 
                y: newH / 2, 
                duration: duration, 
                ease: 'power2.inOut' 
            });
            
            mesh.userData.value = val;
        });
    });
}

const btn = document.createElement('button');
btn.textContent = 'Switch Data';
btn.style.cssText = 'position:fixed;top:20px;left:20px;z-index:100;padding:10px;';
document.body.appendChild(btn);
btn.addEventListener('click', () => transitionToDataset(dataset2));
```

### The Updated Project
```javascript
1:  CATEGORIES.forEach((cat, ci) => {
2:      const hexColor = '#' + COLORS[ci].toString(16).padStart(6, '0');
3:      const sprite = makeLabelSprite(cat, hexColor);
4:      sprite.position.set(9, 3 - ci * 0.8, 0);
5:      scene.add(sprite);
6:  });
7: 
8:  // ← new
9:  const dataset2 = [
10:     {label:'Jan', values:[80,  140, 180]},
11:     {label:'Feb', values:[60,  160, 200]},
12:     {label:'Mar', values:[170, 70,  90]},
13:     {label:'Apr', values:[90,  190, 110]},
14:     {label:'May', values:[130, 80,  160]},
15:     {label:'Jun', values:[185, 100, 220]},
16: ];
17: 
18: function transitionToDataset(newData, duration = 1.5) {
19:     newData.forEach((month, mi) => {
20:         month.values.forEach((val, ci) => {
21:             const barIdx = mi * 3 + ci;
22:             const { mesh } = bars[barIdx];
23:             const newH = valueToHeight(val);
24:             const originalH = mesh.geometry.parameters.height;
25:             
26:             gsap.to(mesh.scale, { 
27:                 y: newH / originalH, 
28:                 duration: duration, 
29:                 ease: 'power2.inOut' 
30:             });
31:             
32:             gsap.to(mesh.position, { 
33:                 y: newH / 2, 
34:                 duration: duration, 
35:                 ease: 'power2.inOut' 
36:             });
37:             
38:             mesh.userData.value = val;
39:         });
40:     });
41: }
42: 
43: const btn = document.createElement('button');
44: btn.textContent = 'Switch Data';
45: btn.style.cssText = 'position:fixed;top:20px;left:20px;z-index:100;padding:10px;';
46: document.body.appendChild(btn);
47: btn.addEventListener('click', () => transitionToDataset(dataset2));
```
We define a second mock dataset and a function that updates the physical size of our bars using `gsap.to()`. Instead of rebuilding the geometry, we modify the Y-axis `scale` of the existing mesh. Since scaling from the center also moves the base, we simultaneously animate the Y-axis `position` to keep the bars grounded at `y = 0`. We tie this to a DOM button overlay.

### Mechanical walkthrough
- `const dataset2`: A new array with identical structure but different values.
- `function transitionToDataset(...)`: Encapsulates the animation logic.
- `const barIdx = mi * 3 + ci`: Calculates the flattened 1D index of our specific bar out of the 18 stored in the `bars` array.
- `const { mesh } = bars[barIdx]`: Extracts the Three.js mesh object.
- `const newH = valueToHeight(val)`: Calculates the required new physical height.
- `const originalH = mesh.geometry.parameters.height`: Reads the original instantiation height of the geometry.
- `gsap.to(mesh.scale, ...)`: Instructs GSAP to mutate the `scale` property of the mesh.
- `y: newH / originalH`: The Y scale is a multiplier. If the original geometry is `2.0` high, and we want `1.0`, we scale it to `0.5`.
- `ease: 'power2.inOut'`: Applies a smooth easing curve (accelerates in, decelerates out).
- `gsap.to(mesh.position, ...)`: Instructs GSAP to simultaneously animate the spatial position.
- `y: newH / 2`: Keeps the base of the bar anchored at zero by shifting the mesh up by half its *new* total height.
- `mesh.userData.value = val`: Updates the invisible metadata to ensure subsequent tooltips show the new value.
- `btn.addEventListener(...)`: Triggers the transition.

### CS lens
In a real-time rendering graph, creating and destroying geometry (garbage collection and GPU buffer allocation) is incredibly expensive compared to transforming a matrix. Animating `scale` and `position` merely alters the float values in the mesh's transformation matrix passed to the shader. This is why scaling is the standard implementation for resizing objects dynamically in 3D engines.

### SE lens
Because GSAP handles the timing loop entirely independently, we do not need to pollute our Three.js `requestAnimationFrame` loop with complex delta-time math and state tracking. We simply state the declarative intent ("scale to X over Y seconds"), and the external library manages the imperative frame-by-frame interpolation.

### Commands needed
No terminal commands needed.

### Run it
Still no rendering canvas to execute visual interactions.

### One sentence connecting to previous unit
To finally see our chart and trigger the transition, we must attach a renderer, a camera, and a raycaster to handle user mouse hovers.

## Concept Unit: Raycaster hover tooltip and camera

### The Problem
How do we know which 3D object the user's 2D mouse is pointing at?
The screen is a 2D grid of pixels, but our scene is a 3D void with depth. Pause and think: how could you draw a straight line from your eye, through the exact pixel your mouse is on, and figure out what it hits in the world?

### Introduce the concept in isolation
We will define a raycaster intersecting an array of objects. Since we lack a live mouse here, we will mock a mouse vector directly in the center of the screen.

```javascript
import * as THREE from 'three';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0, 0); // Center of NDC (Normalized Device Coordinates)
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 0, 10);

const testMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
testMesh.position.set(0, 0, 0);

raycaster.setFromCamera(mouse, camera);
const hits = raycaster.intersectObjects([testMesh]);

console.log('Did ray hit the mesh?', hits.length > 0);
// Output: Did ray hit the mesh? true
```

This output proves that `raycaster.setFromCamera` accurately calculates a line through 3D space originating from the camera lens, and `intersectObjects` detects collisions. This is called **raycasting**.

### Discard the throwaway
We discard this snippet and will implement dynamic raycasting bound to real DOM `mousemove` events.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-38.html`.
- **Change type:** Add.
- **Location:** At the bottom of the script, assembling the final loop.
- **Dependencies:** The `OrbitControls` addon module.

### The New Code
```javascript
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 8, 18);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 2, 0);

const tooltip = document.createElement('div');
tooltip.style.cssText = 'position:fixed;background:rgba(0,0,0,.8);color:#fff;padding:8px 12px;border-radius:6px;font:14px sans-serif;pointer-events:none;display:none;z-index:200;';
document.body.appendChild(tooltip);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

document.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const allBarMeshes = bars.map(b => b.mesh);
    const hits = raycaster.intersectObjects(allBarMeshes);
    
    if (hits.length > 0) {
        const d = hits[0].object.userData;
        tooltip.style.display = 'block';
        tooltip.style.left = e.clientX + 12 + 'px';
        tooltip.style.top = e.clientY - 12 + 'px';
        tooltip.textContent = `${d.month} | ${d.category}: ${d.value}`;
    } else {
        tooltip.style.display = 'none';
    }
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();
```

### The Updated Project
```javascript
1:  // ← new imports added to top
2:  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
3:  
4:  // ... existing code ...
5:  btn.addEventListener('click', () => transitionToDataset(dataset2));
6:  
7:  // ← new
8:  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
9:  camera.position.set(0, 8, 18);
10: 
11: const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
12: renderer.setSize(window.innerWidth, window.innerHeight);
13: 
14: const controls = new OrbitControls(camera, renderer.domElement);
15: controls.enableDamping = true;
16: controls.target.set(0, 2, 0);
17: 
18: const tooltip = document.createElement('div');
19: tooltip.style.cssText = 'position:fixed;background:rgba(0,0,0,.8);color:#fff;padding:8px 12px;border-radius:6px;font:14px sans-serif;pointer-events:none;display:none;z-index:200;';
20: document.body.appendChild(tooltip);
21: 
22: const raycaster = new THREE.Raycaster();
23: const mouse = new THREE.Vector2();
24: 
25: document.addEventListener('mousemove', (e) => {
26:     mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
27:     mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
28:     
29:     raycaster.setFromCamera(mouse, camera);
30:     const allBarMeshes = bars.map(b => b.mesh);
31:     const hits = raycaster.intersectObjects(allBarMeshes);
32:     
33:     if (hits.length > 0) {
34:         const d = hits[0].object.userData;
35:         tooltip.style.display = 'block';
36:         tooltip.style.left = e.clientX + 12 + 'px';
37:         tooltip.style.top = e.clientY - 12 + 'px';
38:         tooltip.textContent = `${d.month} | ${d.category}: ${d.value}`;
39:     } else {
40:         tooltip.style.display = 'none';
41:     }
42: });
43: 
44: function animate() {
45:     requestAnimationFrame(animate);
46:     controls.update();
47:     renderer.render(scene, camera);
48: }
49: animate();
```
We set up the `PerspectiveCamera` and `WebGLRenderer` to display the scene. We attach `OrbitControls` so the user can drag around the 3D space. We create a floating DOM `<div>` as our tooltip. On every mouse movement, we map the pixel coordinates to WebGL Normalized Device Coordinates, project a `Raycaster`, and check for collisions. If it hits, we extract the stored `userData` to display the exact data value in our tooltip. Finally, we kick off the continuous animation loop.

### Mechanical walkthrough
- `new THREE.PerspectiveCamera(...)`: Creates the virtual camera.
- `new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true })`: Binds WebGL to our existing `<canvas>` element and enables edge smoothing.
- `new OrbitControls(...)`: Hands camera manipulation over to the standard Three.js addon.
- `controls.target.set(0, 2, 0)`: Focuses the camera's orbital pivot slightly above the floor.
- `const tooltip = document.createElement('div')`: Generates the HTML popup element.
- `pointer-events: none`: CSS property ensuring the tooltip itself never blocks the mouse from triggering the canvas beneath it.
- `new THREE.Raycaster()`: Creates the ray intersection tool.
- `new THREE.Vector2()`: Initializes a 2D vector to store mouse coordinates.
- `document.addEventListener('mousemove', ...)`: Captures cursor movement over the whole document.
- `mouse.x = (e.clientX / window.innerWidth) * 2 - 1`: Normalizes the horizontal mouse pixel position into WebGL space (-1 on the left, to +1 on the right).
- `mouse.y = -(e.clientY / window.innerHeight) * 2 + 1`: Normalizes the vertical position. It is inverted because the DOM `Y` increases downwards, while WebGL `Y` increases upwards.
- `raycaster.setFromCamera(mouse, camera)`: Updates the ray to project from the camera lens exactly through the 2D mouse point.
- `const allBarMeshes = bars.map(b => b.mesh)`: Flattens our custom objects array into an array of pure `THREE.Mesh` targets.
- `const hits = raycaster.intersectObjects(allBarMeshes)`: Returns an array of intersecting meshes sorted by nearest first.
- `if (hits.length > 0)`: Checks if the ray hit anything.
- `const d = hits[0].object.userData`: Accesses the data payload stored during generation.
- `tooltip.style.left = e.clientX + 12 + 'px'`: Moves the DOM tooltip slightly to the bottom-right of the physical cursor.
- `tooltip.textContent = ...`: Prints the label string.
- `requestAnimationFrame(animate)`: Tells the browser to run this loop as fast as the monitor refreshes.
- `controls.update()`: Computes the dampening physics for the orbit controls.
- `renderer.render(scene, camera)`: Draws the active frame to the `<canvas>`.

### CS lens
Mapping 2D screen space to 3D world space is a reversal of the rendering pipeline. Rendering applies a projection matrix to 3D vertices to squash them into 2D screen pixels. Raycasting reverses this: it multiplies the 2D normalized device coordinates by the inverse of the camera's projection matrix to generate a 3D spatial vector.

### SE lens
Notice that the tooltip rendering is managed by HTML DOM manipulation, while the charting is managed by WebGL. We do not attempt to draw complex formatted 2D text boxes inside WebGL. Delegating UI text to the DOM and 3D graphics to WebGL leverages the strengths of both engines, saving thousands of lines of manual layout code.

### Commands needed
Open `lesson-38.html` in a modern browser.

### Run it
Open the HTML file. You will see a 3D bar chart hovering in dark space. Drag to orbit the camera. Hover over any bar to see its exact data payload pop up in an HTML tooltip. Click the "Switch Data" button in the corner, and observe the bars physically morph their sizes while retaining perfect hovering hit-detection.

### One sentence connecting to previous unit
The integration of DOM overlays and WebGL interactions completes our transition from a static model into an interactive data visualization dashboard.

## Closing
### Connect the pieces
Let's trace what happens when we switch datasets and then hover a specific bar. The data point "Jan, Product A" begins with a `value` of 120 and a height of 2.727. When we click "Switch Data", our GSAP animation calls `gsap.to(mesh.scale, {y: 0.667})` and `gsap.to(mesh.position, {y: 0.909})` over 1.5 seconds. The bar visually shrinks and settles lower to the ground. Simultaneously, `mesh.userData.value` is updated to 80. As you move your mouse over the newly shortened bar, the browser fires `mousemove`, triggering the `THREE.Raycaster`. The ray perfectly strikes the modified, scaled-down boundary of the `BoxGeometry`. The collision accesses `hits[0].object.userData` and pulls out the new `80`, dynamically positioning a DOM `<div>` at your mouse coordinates. The visualization flows seamlessly from abstract arrays through structural geometry, tweened transitions, inverse-matrix raycasting, and back out to the DOM UI.
