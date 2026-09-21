# Lesson 05: Lights — AmbientLight, DirectionalLight, PointLight

**What you will build**
The reader switches from `MeshBasicMaterial` (ignores lights) to `MeshStandardMaterial` (physically-based, responds to lights), and adds `AmbientLight` (baseline illumination), `DirectionalLight` (sun-like), and `PointLight` (bulb-like). The transferable insight: `MeshBasicMaterial` never shows depth or shape because it has no lighting model. `MeshStandardMaterial` uses physically-based rendering (PBR) — roughness and metalness parameters model real-world surface properties.

**What you need to know first**
Lessons 00-04.

**Terms used in this lesson**
- **Physically-Based Rendering (PBR)** — A lighting model that simulates how light interacts with real-world materials, conserving energy so surfaces don't reflect more light than they receive.
- **Dielectric** — A non-metallic material (like plastic or wood) where diffuse and specular lighting are separate.
- **Penumbra** — The soft outer edge of a shadow or light cone where light transitions to darkness.
- **Vector** — A mathematical entity with magnitude and direction, used to represent positions or directions in 3D space.
- **Dot product** — A mathematical operation between two vectors that determines how aligned they are, crucial for calculating how much light hits a surface.
- **Frustum** — A cone or pyramid with the top sliced off, representing the volume of space illuminated by a spotlight or seen by a camera.
- **`import`** — JavaScript module syntax for bringing in external code.
- **`const`** — JavaScript keyword to declare a variable that cannot be reassigned.
- **`new`** — JavaScript keyword to instantiate an object from a constructor.

**Objects and methods used**
- **`THREE.MeshBasicMaterial`**
  - *What it is:* A flat-shading material.
  - *Implementation:* `class MeshBasicMaterial extends Material`
  - *Its use:* Used when lighting is not wanted.
  - *Type:* Class
  - *Responsibility:* Renders an object with a flat color, completely ignoring any lights in the scene.
  - *Depends on:* Configuration parameters like color.
  - *Connects to:* Applied to a Mesh.
  - *Shape:* A material definition passed to the renderer.
- **`THREE.MeshStandardMaterial`**
  - *What it is:* A physically-based rendering material.
  - *Implementation:* `class MeshStandardMaterial extends Material`
  - *Its use:* Used to create realistic materials that respond to light.
  - *Type:* Class
  - *Responsibility:* Computes final pixel colors based on physical properties (roughness, metalness) and scene lighting.
  - *Depends on:* Configuration parameters (color, roughness, metalness) and at least one light in the scene.
  - *Connects to:* Applied to a Mesh; reads light data.
  - *Shape:* A material definition passed to the renderer.
- **`THREE.AmbientLight`**
  - *What it is:* A uniform, directionless light source.
  - *Implementation:* `class AmbientLight extends Light`
  - *Its use:* Provides a baseline illumination so shadows aren't pitch black.
  - *Type:* Class
  - *Responsibility:* Adds a flat color and intensity to every face of every object in the scene equally.
  - *Depends on:* Color and intensity values.
  - *Connects to:* Added to the Scene.
  - *Shape:* A light node in the scene graph.
- **`THREE.DirectionalLight`**
  - *What it is:* A light source with parallel rays.
  - *Implementation:* `class DirectionalLight extends Light`
  - *Its use:* Simulates the sun or any infinitely distant light.
  - *Type:* Class
  - *Responsibility:* Illuminates objects from a specific direction, revealing their 3D shape through shading and highlights.
  - *Depends on:* Color, intensity, and position (which dictates direction towards its target).
  - *Connects to:* Added to the Scene.
  - *Shape:* A light node in the scene graph.
- **`THREE.PointLight`**
  - *What it is:* An omnidirectional light source.
  - *Implementation:* `class PointLight extends Light`
  - *Its use:* Simulates a light bulb emitting light in all directions.
  - *Type:* Class
  - *Responsibility:* Emits light from a specific point, with intensity falling off over distance.
  - *Depends on:* Color, intensity, distance limit, and decay rate.
  - *Connects to:* Added to the Scene.
  - *Shape:* A light node in the scene graph.
- **`THREE.PointLightHelper`**
  - *What it is:* A debug utility for PointLight.
  - *Implementation:* `class PointLightHelper extends Mesh`
  - *Its use:* Visualizes the position and range of a PointLight.
  - *Type:* Class
  - *Responsibility:* Renders a wireframe sphere at the light's position.
  - *Depends on:* A PointLight instance and a size parameter.
  - *Connects to:* Added to the Scene.
  - *Shape:* A helper object in the scene graph.
- **`THREE.HemisphereLight`**
  - *What it is:* A gradient ambient light.
  - *Implementation:* `class HemisphereLight extends Light`
  - *Its use:* Simulates outdoor lighting with distinct sky and ground colors.
  - *Type:* Class
  - *Responsibility:* Blends between a sky color (shining down) and ground color (shining up).
  - *Depends on:* Sky color, ground color, and intensity.
  - *Connects to:* Added to the Scene.
  - *Shape:* A light node in the scene graph.
- **`THREE.SpotLight`**
  - *What it is:* A directional cone of light.
  - *Implementation:* `class SpotLight extends Light`
  - *Its use:* Simulates a flashlight or stage light.
  - *Type:* Class
  - *Responsibility:* Emits light in a cone from a specific point towards a target.
  - *Depends on:* Color, intensity, distance, angle, penumbra, and decay.
  - *Connects to:* Added to the Scene, along with its target.
  - *Shape:* A light node in the scene graph.
- **`THREE.SpotLightHelper`**
  - *What it is:* A debug utility for SpotLight.
  - *Implementation:* `class SpotLightHelper extends Object3D`
  - *Its use:* Visualizes the cone (frustum) of a SpotLight.
  - *Type:* Class
  - *Responsibility:* Renders a wireframe cone showing the light's spread.
  - *Depends on:* A SpotLight instance.
  - *Connects to:* Added to the Scene.
  - *Shape:* A helper object in the scene graph.
- **`Math.PI`**
  - *What it is:* The mathematical constant Pi.
  - *Implementation:* `Math.PI`
  - *Its use:* Used to specify angles in radians.
  - *Type:* Constant property of the built-in Math object.
  - *Responsibility:* Provides the ratio of a circle's circumference to its diameter (approx 3.14159).
  - *Depends on:* Nothing.
  - *Connects to:* Used in angle calculations.
  - *Shape:* A static numeric property.
- **`console.log`**
  - *What it is:* A debugging output function.
  - *Implementation:* `console.log(...args)`
  - *Its use:* Prints values to the browser's developer console.
  - *Type:* Function.
  - *Responsibility:* Serializes and displays data for inspection.
  - *Depends on:* The values passed to it.
  - *Connects to:* The browser console.
  - *Shape:* A built-in browser API.

## Concept Unit: Why MeshBasicMaterial hides shape — switching to MeshStandardMaterial

### The Problem
We have a 3D sphere on the screen, but it looks like a completely flat circle. How can we make it look 3D and show its curvature?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

// MeshBasicMaterial: flat color, no lighting response
const basicMat = new THREE.MeshBasicMaterial({color: 0xff4400});
console.log('Basic material type:', basicMat.type);

// MeshStandardMaterial: PBR material, responds to lights
const standardMat = new THREE.MeshStandardMaterial({
    color:     0xff4400,
    roughness: 0.5,
    metalness: 0.0,
});
console.log('Standard material type:', standardMat.type);
```
Output:
```
Basic material type: MeshBasicMaterial
Standard material type: MeshStandardMaterial
```
This proves we are creating different material types. `MeshBasicMaterial` completely ignores lighting and just paints pixels the exact base color. `MeshStandardMaterial` calculates pixel colors based on lights.

### Discard the throwaway
We will discard this isolated example; it will not appear in our project.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `lesson-05.html`
- **Change type:** Add
- **Location:** Material definition
- **Dependencies:** Three.js library

### The New Code
```html
<script type="module">
import * as THREE from 'three';
const standardMat = new THREE.MeshStandardMaterial({
    color:     0xff4400,
    roughness: 0.5,
    metalness: 0.0,
});
</script>
```

### The Updated Project
```html
1: <script type="module">
2: import * as THREE from 'three';
3: // ← new
4: const standardMat = new THREE.MeshStandardMaterial({
5:     color:     0xff4400,
6:     roughness: 0.5,
7:     metalness: 0.0,
8: });
9: </script>
```
The project now defines a physically-based material that requires light to be visible.

### Mechanical walkthrough
- `const` declares a new variable `standardMat`.
- `new` instantiates an object from the `THREE.MeshStandardMaterial` class.
- The object literal `{ ... }` passes configuration.
- `color: 0xff4400` sets the base diffuse color.
- `roughness: 0.5` sets how smooth the surface is (0 is mirror-smooth, 1 is fully matte). 0.5 is halfway between mirror and chalk.
- `metalness: 0.0` sets whether the material is metallic. 0 means it's a dielectric (non-metal) with separate diffuse and specular reflection.

### CS lens
Physically-Based Rendering (PBR) uses mathematical models to simulate how light interacts with real surfaces. A key principle is energy conservation: a surface cannot reflect more light than it receives.

### SE lens
Using `MeshStandardMaterial` standardizes lighting behavior across different 3D engines and tools. A PBR material will look correct under any lighting setup, removing the need to tweak material colors for specific scenes.

### Commands needed
Open `lesson-05.html` in a modern browser.

### Run it
The sphere appears completely black because `MeshStandardMaterial` requires at least one light in the scene, and the GPU runs the PBR lighting equation with 0 light contribution.

### One sentence connecting to previous unit
Now that we have a material that responds to light, we need to add light to the scene so it isn't pitch black.

## Concept Unit: AmbientLight — uniform baseline illumination

### The Problem
The scene is completely black because there is no light. How do we provide a baseline level of light so nothing is completely invisible?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

const scene = new THREE.Scene();
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

console.log('Ambient color:', ambientLight.color);
console.log('Ambient intensity:', ambientLight.intensity);

ambientLight.color.set(0x404080);
ambientLight.intensity = 0.3;
console.log('Ambient color updated:', ambientLight.color.getHexString());
```
Output:
```
Ambient color: {isColor: true, r: 1, g: 1, b: 1}
Ambient intensity: 0.5
Ambient color updated: 404080
```
This proves that an `AmbientLight` stores a color and intensity, and that we can change its color in place.

### Discard the throwaway
We will discard this isolated example; it will not appear in our project.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `lesson-05.html`
- **Change type:** Add
- **Location:** Scene setup
- **Dependencies:** Three.js library

### The New Code
```html
<script type="module">
import * as THREE from 'three';
const scene = new THREE.Scene();
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);
</script>
```

### The Updated Project
```html
1: <script type="module">
2: import * as THREE from 'three';
3: const scene = new THREE.Scene();
4: // ← new
5: const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
6: scene.add(ambientLight);
7: </script>
```
The project now has an ambient light that illuminates all surfaces equally.

### Mechanical walkthrough
- `const` declares `ambientLight`.
- `new THREE.AmbientLight(0xffffff, 0.3)` creates the light.
- `0xffffff` is the hex code for white light.
- `0.3` is the intensity.
- `scene.add(ambientLight)` attaches the light to the scene graph so it affects rendering.

### CS lens
The PBR formula for ambient contribution is: `ambient contribution = ambientColor * intensity * materialColor`. For a white light (1,1,1) at 0.5 intensity and an orange material (1, 0.267, 0), the contribution is (0.5, 0.133, 0). Every surface receives this equally — there is no directional information, so no shape is revealed.

### SE lens
Ambient light is a "cheap" hack in computer graphics. It simulates the complex bouncing of light around an environment (global illumination) with a single flat color, saving immense calculation time.

### Commands needed
Open `lesson-05.html` in a modern browser.

### Run it
The sphere now appears as a flat, dark orange circle. Every face has identical brightness, so it still doesn't look 3D.

### One sentence connecting to previous unit
To reveal the 3D curvature of the sphere, we need a light that hits it from a specific direction.

## Concept Unit: DirectionalLight — sun-like parallel light

### The Problem
The ambient light makes the object visible, but it looks flat. How do we create highlights and shading to reveal the 3D shape?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

const scene = new THREE.Scene();
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

console.log('Light direction vector:', dirLight.position.normalize());
```
Output:
```
Light direction vector: {x: 0.408248, y: 0.816496, z: 0.408248}
```
This proves that a `DirectionalLight`'s position actually determines its direction towards the origin. The light is infinitely far away.

### Discard the throwaway
We will discard this isolated example.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-05.html`
- **Change type:** Add
- **Location:** Scene setup
- **Dependencies:** Three.js library

### The New Code
```html
<script type="module">
import * as THREE from 'three';
const scene = new THREE.Scene();
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);
</script>
```

### The Updated Project
```html
1: <script type="module">
2: import * as THREE from 'three';
3: const scene = new THREE.Scene();
4: const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
5: scene.add(ambientLight);
6: // ← new
7: const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
8: dirLight.position.set(5, 10, 5);
9: scene.add(dirLight);
10: </script>
```
The project now includes parallel rays from a specific direction, revealing surface curvature.

### Mechanical walkthrough
- `const` declares `dirLight`.
- `new THREE.DirectionalLight(0xffffff, 1.0)` creates the light with white color and full intensity.
- `dirLight.position.set(5, 10, 5)` sets the light's position. Because its default target is the origin (0,0,0), this position defines the direction FROM the origin TO the light.
- `scene.add(dirLight)` adds it to the scene.

### CS lens
To calculate shading, the GPU computes the dot product between the surface normal (N) and the light direction (L). Surfaces facing the light exactly (N dot L = 1) get full illumination. Surfaces facing away get 0 (shadowed). The direction vector is normalized (magnitude 1): magnitude = sqrt(25+100+25) = 12.25. (5/12.25, 10/12.25, 5/12.25) = (0.408, 0.816, 0.408).

### SE lens
Using `DirectionalLight` models the sun perfectly because the sun is so far away that its rays are effectively parallel. This makes shadow calculation simpler than a point light.

### Commands needed
Open `lesson-05.html` in a modern browser.

### Run it
The sphere now has a bright highlight on the side facing (5,10,5) and fades to the darker ambient color on the opposite side, revealing a perfect 3D sphere.

### One sentence connecting to previous unit
Sometimes we need local lights, like a lightbulb in a room, rather than the global sun.

## Concept Unit: PointLight — omnidirectional bulb

### The Problem
How do we model a local light source, like a torch or lightbulb, whose brightness fades over distance?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

const scene = new THREE.Scene();
const pointLight = new THREE.PointLight(0xff8844, 2.0, 10, 2);
pointLight.position.set(0, 3, 0);
scene.add(pointLight);

const lightHelper = new THREE.PointLightHelper(pointLight, 0.2);
scene.add(lightHelper);

console.log('Point light position:', pointLight.position);
console.log('Point light distance:', pointLight.distance);
console.log('Point light decay:', pointLight.decay);
```
Output:
```
Point light position: {x: 0, y: 3, z: 0}
Point light distance: 10
Point light decay: 2
```
This proves a point light has distance and decay properties, and that we can attach a helper to visualize its position in the 3D scene.

### Discard the throwaway
We will discard this isolated example.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-05.html`
- **Change type:** Add
- **Location:** Scene setup
- **Dependencies:** Three.js library

### The New Code
```html
<script type="module">
import * as THREE from 'three';
const scene = new THREE.Scene();
const pointLight = new THREE.PointLight(0xff8844, 2.0, 10, 2);
pointLight.position.set(0, 3, 0);
scene.add(pointLight);

const lightHelper = new THREE.PointLightHelper(pointLight, 0.2);
scene.add(lightHelper);
</script>
```

### The Updated Project
```html
1: <script type="module">
2: import * as THREE from 'three';
3: const scene = new THREE.Scene();
4: // ← new
5: const pointLight = new THREE.PointLight(0xff8844, 2.0, 10, 2);
6: pointLight.position.set(0, 3, 0);
7: scene.add(pointLight);
8: 
9: const lightHelper = new THREE.PointLightHelper(pointLight, 0.2);
10: scene.add(lightHelper);
11: </script>
```
The project now includes a local point light that emits in all directions and a helper to visualize it.

### Mechanical walkthrough
- `new THREE.PointLight(0xff8844, 2.0, 10, 2)`:
  - `0xff8844`: warm orange-white color.
  - `2.0`: high intensity.
  - `10`: distance limit (how far the light reaches).
  - `2`: decay rate (2 is physically correct inverse-square falloff).
- `pointLight.position.set(0, 3, 0)` moves the light source.
- `new THREE.PointLightHelper(pointLight, 0.2)` creates a wireframe sphere of radius 0.2 tied to the light.

### CS lens
Intensity at distance d is calculated as: `I = intensity / (d^decay)`. With decay=2 and intensity=2.0:
An object 3 units away gets intensity = `2.0 / (3^2) = 2.0 / 9 = 0.222`.
An object 2 units away gets intensity = `2.0 / (2^2) = 2.0 / 4 = 0.5`.
Light drops off incredibly fast.

### SE lens
PointLightHelpers are development tools. They are not visible in the final rendered output of a finished game (you would remove or hide them), but they are crucial for debugging where light is coming from during development.

### Commands needed
Open `lesson-05.html` in a modern browser.

### Run it
You will see the sphere illuminated warmly from directly above, and a small wireframe sphere indicating exactly where the point light sits in space.

### One sentence connecting to previous unit
Beyond simple point lights, Three.js provides specialized lights like spotlights for cones of light and hemisphere lights for outdoor ambient skies.

## Concept Unit: SpotLight and HemisphereLight

### The Problem
How do we create a flashlight effect (a cone of light) or a more realistic outdoor ambient light that has different colors for the sky and the ground?

### Introduce the concept in isolation
```javascript
import * as THREE from 'three';

const scene = new THREE.Scene();
const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x8b6914, 0.8);
scene.add(hemiLight);

const spotLight = new THREE.SpotLight(0xffffff, 3.0);
spotLight.position.set(0, 10, 0);
spotLight.angle = Math.PI / 8;
spotLight.penumbra = 0.2;
spotLight.decay = 2;
spotLight.target.position.set(0, 0, 0);
scene.add(spotLight);
scene.add(spotLight.target);

const helper = new THREE.SpotLightHelper(spotLight);
scene.add(helper);

console.log('Spot angle:', (spotLight.angle * 180 / Math.PI).toFixed(1) + '°');
console.log('Spot penumbra:', spotLight.penumbra);
```
Output:
```
Spot angle: 22.5°
Spot penumbra: 0.2
```
This proves that SpotLight uses a cone defined by an angle, and it has a target that must be added to the scene to orient the cone.

### Discard the throwaway
We will discard this isolated example.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-05.html`
- **Change type:** Add
- **Location:** Scene setup
- **Dependencies:** Three.js library

### The New Code
```html
<script type="module">
import * as THREE from 'three';
const scene = new THREE.Scene();
const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x8b6914, 0.8);
scene.add(hemiLight);

const spotLight = new THREE.SpotLight(0xffffff, 3.0);
spotLight.position.set(0, 10, 0);
spotLight.angle = Math.PI / 8;
spotLight.penumbra = 0.2;
spotLight.decay = 2;
spotLight.target.position.set(0, 0, 0);
scene.add(spotLight);
scene.add(spotLight.target);

const helper = new THREE.SpotLightHelper(spotLight);
scene.add(helper);
</script>
```

### The Updated Project
```html
1: <script type="module">
2: import * as THREE from 'three';
3: const scene = new THREE.Scene();
4: // ← new
5: const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x8b6914, 0.8);
6: scene.add(hemiLight);
7: 
8: const spotLight = new THREE.SpotLight(0xffffff, 3.0);
9: spotLight.position.set(0, 10, 0);
10: spotLight.angle = Math.PI / 8;
11: spotLight.penumbra = 0.2;
12: spotLight.decay = 2;
13: spotLight.target.position.set(0, 0, 0);
14: scene.add(spotLight);
15: scene.add(spotLight.target);
16: 
17: const helper = new THREE.SpotLightHelper(spotLight);
18: scene.add(helper);
19: </script>
```
The project now uses a HemisphereLight for realistic outdoor ambient lighting and a SpotLight pointing at the origin.

### Mechanical walkthrough
- `new THREE.HemisphereLight(0x87ceeb, 0x8b6914, 0.8)` creates a light that shines sky-blue (0x87ceeb) from above and earth-brown (0x8b6914) from below.
- `new THREE.SpotLight(0xffffff, 3.0)` creates the spotlight.
- `spotLight.angle = Math.PI / 8` sets the cone size. `Math.PI / 8` is 22.5 degrees. This is the HALF-angle.
- `spotLight.penumbra = 0.2` makes the outer 20% of the cone soft.
- `scene.add(spotLight.target)` adds the light's target to the scene, which Three.js requires to compute the direction.
- `new THREE.SpotLightHelper(spotLight)` visualizes the frustum.

### CS lens
A spotlight defines a frustum — a cone where lighting is calculated. `Math.PI` (π) radians is 180°. `PI/8` is 22.5°. Because this is the half-angle, the full cone is 45°. The penumbra smooths the transition so the edge isn't aliased or unnaturally sharp.

### SE lens
It is a common pitfall in Three.js to forget to add `spotLight.target` to the scene. The engine updates the target's world matrix only if it is part of the scene graph. If it isn't added, the light will not aim correctly.

### Commands needed
Open `lesson-05.html` in a modern browser.

### Run it
The sphere will be lit by a sharp cone of light fading softly at the edges, and surrounded by a realistic outdoor ambient gradient.

### One sentence connecting to previous unit
By combining ambient, directional, and specialized lights, we can build realistic lighting models.

## Closing

### Connect the pieces
We started with a material that couldn't understand light (`MeshBasicMaterial`) and upgraded to one that simulates physical reality (`MeshStandardMaterial`). We proved that without light, a physical material is black. We added `AmbientLight` for uniform color, `DirectionalLight` for parallel sun-rays that reveal shape, and `PointLight` for localized light that decays over distance. If you trace the math for a sphere illuminated by an `AmbientLight(0.3)` and a `DirectionalLight(1.0)` at `(5,10,5)`, the final pixel color at the top face is the sum of the ambient contribution and the dot product of the face's normal with the directional light vector. All these layers accumulate to give the 3D renderer enough data to draw a realistic scene.
