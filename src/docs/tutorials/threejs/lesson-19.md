# Lesson 19: Keyframe Animation — AnimationMixer, AnimationClip, AnimationAction

**What you will build**
You will build an interactive 3D scene where objects animate autonomously using keyframes. We'll start by animating simple properties like position and color, group them into reusable clips, and play them back using a central animation mixer with full playback control. The core problem this solves is moving beyond manual per-frame state updates into a declarative, data-driven animation architecture.

**What you need to know first**
- You must understand the basic Three.js scene graph (Scene, Mesh, Material) from Lesson 2.
- You must understand the basic render loop using `requestAnimationFrame` from Lesson 3.

**Terms used in this lesson**
- **Keyframe animation** — A technique where property values are defined only at specific points in time (keyframes), and the system automatically calculates the intermediate values for all other frames. This frees you from writing manual math for every single frame.
- **Interpolation** — The mathematical process of estimating a value between two known values. This is how the engine smoothly transitions a property (like position) from its state at keyframe A to its state at keyframe B.
- **SLERP (Spherical Linear Interpolation)** — A specific type of interpolation used for rotations (quaternions). It ensures smooth, constant-speed rotation along the shortest path between two orientations, unlike standard linear interpolation which can warp rotation speeds.
- **Gimbal lock** — A mathematical anomaly in 3D rotation when using Euler angles, where two axes align, causing a loss of one degree of freedom. Quaternions and SLERP avoid this entirely.
- **LoopOnce** — A playback mode constant where the animation plays from start to finish exactly one time and then stops.
- **LoopRepeat** — A playback mode constant where the animation endlessly restarts from the beginning after reaching the end.
- **Time scale** — A multiplier applied to the passage of time for an animation. A value of 1.0 is normal speed, 2.0 is double speed, and negative values play the animation in reverse.
- **Delta time** — The precise amount of time elapsed since the last frame was rendered, crucial for advancing animations smoothly regardless of hardware frame rate.

**Objects and methods used**

- **`THREE.VectorKeyframeTrack`**
  - *What it is:* A data track storing keyframes for vector-based properties (like position or scale).
  - *Implementation:* `new THREE.VectorKeyframeTrack(name, times, values)`
  - *Its use:* We use it to move our objects around in 3D space and change their scale over time.
  - *Type:* Class constructor.
  - *Responsibility:* Holds the raw timing and value data for a specific vector property over the duration of an animation.
  - *Depends on:* An array of time stamps and a corresponding flat array of vector coordinates.
  - *Connects to:* Passed into an `AnimationClip` to form a complete animation.
  - *Shape:* A passive data container used in the definition phase of animation.

- **`THREE.ColorKeyframeTrack`**
  - *What it is:* A data track storing keyframes for RGB color properties.
  - *Implementation:* `new THREE.ColorKeyframeTrack(name, times, values)`
  - *Its use:* We use it to smoothly transition a material's color over time.
  - *Type:* Class constructor.
  - *Responsibility:* Manages color value interpolation (red, green, blue) across specific time intervals.
  - *Depends on:* Time stamps and RGB triplets (0.0 to 1.0).
  - *Connects to:* Grouped inside an `AnimationClip`.
  - *Shape:* Passive data structure defining material property changes.

- **`THREE.QuaternionKeyframeTrack`**
  - *What it is:* A track specifically for 3D rotations using quaternions to prevent gimbal lock.
  - *Implementation:* `new THREE.QuaternionKeyframeTrack(name, times, values)`
  - *Its use:* We use it to rotate our objects cleanly.
  - *Type:* Class constructor.
  - *Responsibility:* Safely animates rotations by enforcing quaternion interpolation between keyframes.
  - *Depends on:* Times and valid 4-component quaternion values.
  - *Connects to:* An `AnimationClip`.
  - *Shape:* Data container for orientation keyframes.

- **`THREE.NumberKeyframeTrack`**
  - *What it is:* A track for animating scalar (single-number) values like opacity.
  - *Implementation:* `new THREE.NumberKeyframeTrack(name, times, values)`
  - *Its use:* We use it to fade an object in and out.
  - *Type:* Class constructor.
  - *Responsibility:* Interpolates basic numerical properties over time.
  - *Depends on:* Times and singular numerical values.
  - *Connects to:* An `AnimationClip`.
  - *Shape:* Data container for simple floating-point properties.

- **`THREE.AnimationClip`**
  - *What it is:* A named collection of keyframe tracks that defines a complete, multi-property animation.
  - *Implementation:* `new THREE.AnimationClip(name, duration, tracks)`
  - *Its use:* We use it to bundle position, rotation, and color tracks into a single conceptual action.
  - *Type:* Class constructor.
  - *Responsibility:* Groups independent property tracks into a synchronized timeline of a specific duration.
  - *Depends on:* A name, a total duration in seconds, and an array of KeyframeTrack instances.
  - *Connects to:* Passed into an `AnimationMixer`.
  - *Shape:* The compiled asset boundary between static keyframe data and the playback engine.

- **`THREE.AnimationMixer`**
  - *What it is:* The playback engine that drives animations for a specific object or hierarchy.
  - *Implementation:* `new THREE.AnimationMixer(rootObject)` followed by calling `mixer.update(deltaTime)`
  - *Its use:* We attach this to our 3D mesh to actively apply the interpolated values to the mesh's properties every frame.
  - *Type:* Class constructor.
  - *Responsibility:* Reads active animations, calculates the current interpolated state, and applies those values to the scene graph object.
  - *Depends on:* A root 3D object to animate, and regular calls to `update()` with a time delta.
  - *Connects to:* Generates `AnimationAction`s from clips.
  - *Shape:* The active controller layer sitting between the render loop and the static animation data.

- **`THREE.AnimationAction`**
  - *What it is:* A controller for a single `AnimationClip` playing on a specific `AnimationMixer`.
  - *Implementation:* Retrieved via `mixer.clipAction(clip)`
  - *Its use:* We use it to start our animations, change their speed, pause them, or dictate how they loop.
  - *Type:* Instance returned by the mixer.
  - *Responsibility:* Manages the playback state (playing, paused, weight, time scale, looping) of one specific clip.
  - *Depends on:* An `AnimationMixer` and an `AnimationClip`.
  - *Connects to:* Modifies its own state which the `AnimationMixer` reads.
  - *Shape:* The interactive API surface for controlling animation timing and blending.

- **`THREE.Clock`**
  - *What it is:* A utility for keeping track of elapsed time and time between frames.
  - *Implementation:* `new THREE.Clock()` and `clock.getDelta()`
  - *Its use:* We use it to feed the `AnimationMixer` the exact amount of time that has passed since the last frame.
  - *Type:* Utility class.
  - *Responsibility:* Accurately measures time independently of frame rate.
  - *Depends on:* The browser's internal high-resolution timer.
  - *Connects to:* Provides the delta value to `mixer.update()`.
  - *Shape:* A standalone utility used inside the render loop.

**Everything else in the file, not this lesson's subject but still explained**
- **`THREE.Scene`**
  - *What it is:* The top-level container holding all 3D objects, lights, and cameras.
  - *Implementation:* `new THREE.Scene()`
  - *Its use:* Holds our animating mesh.
  - *Type:* Class constructor.
  - *Responsibility:* Maintains the spatial hierarchy of all 3D elements.
  - *Depends on:* Nothing.
  - *Connects to:* Passed into `renderer.render()`.
  - *Shape:* The root node of the 3D graph.

- **`THREE.Mesh`**
  - *What it is:* A 3D object combining structural geometry and visual material.
  - *Implementation:* `new THREE.Mesh(geometry, material)`
  - *Its use:* The actual cube we see and animate.
  - *Type:* Class constructor.
  - *Responsibility:* Represents a renderable 3D physical object.
  - *Depends on:* A Geometry and a Material.
  - *Connects to:* Added to the `THREE.Scene`.
  - *Shape:* A leaf node in the scene graph.

- **`THREE.BoxGeometry`** / **`THREE.SphereGeometry`**
  - *What it is:* Mathematical definitions of 3D shapes.
  - *Implementation:* `new THREE.BoxGeometry(width, height, depth)`
  - *Its use:* Defines the vertices of the objects we draw.
  - *Type:* Class constructor.
  - *Responsibility:* Generates the coordinate points for rendering.
  - *Depends on:* Dimensions.
  - *Connects to:* Handed to a `THREE.Mesh`.
  - *Shape:* Pure data geometry.

- **`THREE.MeshStandardMaterial`**
  - *What it is:* A physically-based rendering material.
  - *Implementation:* `new THREE.MeshStandardMaterial({color: hex, transparent: boolean, opacity: float})`
  - *Its use:* Gives our mesh color and handles transparency for fading.
  - *Type:* Class constructor.
  - *Responsibility:* Determines how light reacts to the surface.
  - *Depends on:* Configuration object (color, transparency).
  - *Connects to:* Handed to a `THREE.Mesh`.
  - *Shape:* Rendering instruction data.

- **`requestAnimationFrame`**
  - *What it is:* The browser's native API for scheduling screen updates.
  - *Implementation:* `requestAnimationFrame(callbackFunction)`
  - *Its use:* Drives our render loop so the mixer updates continuously.
  - *Type:* Global browser function.
  - *Responsibility:* Syncs execution with the monitor's refresh rate.
  - *Depends on:* A callback function to execute.
  - *Connects to:* Calls `animate()` recursively.
  - *Shape:* The engine's heartbeat boundary against the host environment.

---

## Concept Unit: KeyframeTrack — animating one property

### The Problem
When building an interactive 3D scene, we often want objects to move, change color, or scale over time. Writing manual update logic inside the render loop (like `if (time < 1) { object.position.y += 0.01; }`) quickly becomes unmanageable as animations grow in complexity. How can we define a sequence of property values across a timeline and let the engine handle the exact math of transitioning between them?

### Introduce the concept in isolation
To solve this, Three.js provides the **KeyframeTrack**. It is a data structure that maps specific times (keyframes) to specific values for a single property. The engine uses interpolation to smoothly guess the values between your defined keyframes.

```html
<script type="module">
import * as THREE from 'three';

// Animate position Y: 0 -> 2 -> 0 -> 2 -> 0 over 4 seconds
const posTrack = new THREE.VectorKeyframeTrack(
    '.position[y]',          // property path: position Y component
    [0, 1, 2, 3, 4],        // times: 0s, 1s, 2s, 3s, 4s
    [0, 2, 0, 2, 0]         // values: Y position at each time
);

// Color track: red -> blue -> red
const colorTrack = new THREE.ColorKeyframeTrack(
    '.material.color',
    [0, 2, 4],              // times
    [1, 0, 0,  0, 0, 1,  1, 0, 0]  // RGB values: red, blue, red
);

console.log('Track name:', posTrack.name);
console.log('Track times:', posTrack.times);
console.log('Track values:', posTrack.values);
</script>
```

When this script runs, it outputs `'.position[y]'` for the name, a typed array of `[0, 1, 2, 3, 4]` for the times, and a typed array of `[0, 2, 0, 2, 0]` for the values. This proves that the track successfully stores our discrete animation points. At precisely 1 second, the `y` value will be 2. Between 0 and 1 second, the system will use **Interpolation** to calculate intermediate values (for example, at 0.5 seconds, the value is interpolated exactly to 1). 

### Discard the throwaway
This isolated logging script is deleted and will not appear in our main project code again.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are starting our animation logic.
- **Files affected**: `lesson-19.html` (created).
- **Change type**: Add.
- **Location**: Inside the main `<script type="module">` block.
- **Dependencies**: The Three.js library imported via module.

### The New Code
We set up our `VectorKeyframeTrack` and `ColorKeyframeTrack` directly in our file.

```javascript
const posTrack = new THREE.VectorKeyframeTrack('.position[y]', [0, 1, 2, 3, 4], [0, 2, 0, 2, 0]);
const colorTrack = new THREE.ColorKeyframeTrack('.material.color', [0, 2, 4], [1, 0, 0, 0, 0, 1, 1, 0, 0]);
```

### The Updated Project
Here is where these new tracks fit into our foundational HTML structure.

```html
1: <!DOCTYPE html>
2: <html>
3: <head>
4:     <title>Lesson 19: Keyframe Animation</title>
5:     <style>body { margin: 0; }</style>
6: </head>
7: <body>
8:     <script type="module">
9:         import * as THREE from 'three';
10:        
11:        // ← new
12:        const posTrack = new THREE.VectorKeyframeTrack('.position[y]', [0, 1, 2, 3, 4], [0, 2, 0, 2, 0]);
13:        const colorTrack = new THREE.ColorKeyframeTrack('.material.color', [0, 2, 4], [1, 0, 0, 0, 0, 1, 1, 0, 0]);
14:     </script>
15: </body>
16: </html>
```

### Mechanical walkthrough
- **`new THREE.VectorKeyframeTrack(...)`**: Constructs a new track for vector data.
- **`'.position[y]'`**: The string path identifying which property to animate. It targets the `y` component of a property named `position`.
- **`[0, 1, 2, 3, 4]`**: The array of timestamps (in seconds) indicating when each keyframe occurs.
- **`[0, 2, 0, 2, 0]`**: The array of values corresponding to each timestamp. Because we targeted `y`, this is treated as single values. 
- **`new THREE.ColorKeyframeTrack(...)`**: Constructs a track specifically for RGB color **Interpolation**.
- **`'.material.color'`**: The target property path for the material's color.
- **`[1, 0, 0, 0, 0, 1, 1, 0, 0]`**: A flat array of RGB triplets corresponding to the 3 timestamps. `1,0,0` is red, `0,0,1` is blue.

### CS lens
Notice that the values are provided as a single flat, one-dimensional array (`[1, 0, 0, 0, 0, 1...]`) instead of an array of objects (`[{r:1, g:0, b:0}, ...]`). This "Structure of Arrays" (or flattened buffer) approach is a common Computer Science optimization. Storing raw floats contiguously in memory heavily reduces object allocation overhead, prevents garbage collection pauses, and allows fast traversal by the CPU during **Interpolation** math.

### SE lens
Using strings like `'.position[y]'` decouples the animation data from the object it animates. This Software Engineering pattern means the track doesn't need to hold a hard reference to a specific **`THREE.Mesh`**. We can build this track once and apply it to a hundred different meshes, significantly reusing our animation definitions.

### Commands needed
Open lesson-19.html in a modern browser.

### Run it
The code loads but produces no visual output yet. The tracks exist passively in memory.

### One sentence connecting to previous unit
Building upon our knowledge of basic 3D scenes, we now have the raw animation data tracks defined.

---

## Concept Unit: AnimationClip — grouping tracks

### The Problem
A single `KeyframeTrack` only describes one property, like position or color. But character movements or complex effects involve many properties changing simultaneously—an object might move, rotate, and change color all at once. How do we group multiple isolated tracks into a single, synchronized animation sequence?

### Introduce the concept in isolation
To solve this, we use an **AnimationClip**. An `AnimationClip` is a named collection of tracks, bound together by a total duration. We also introduce a `QuaternionKeyframeTrack` to animate rotation cleanly using **SLERP (Spherical Linear Interpolation)** to avoid **Gimbal lock**.

```html
<script type="module">
import * as THREE from 'three';

const posTrack = new THREE.VectorKeyframeTrack('.position[y]', [0, 1, 2, 3, 4], [0, 2, 0, 2, 0]);
const rotTrack = new THREE.QuaternionKeyframeTrack(
    '.quaternion',
    [0, 2, 4],
    [
        0, 0, 0, 1,                              // identity (no rotation)
        0, Math.sin(Math.PI/4), 0, Math.cos(Math.PI/4),  // 90° around Y
        0, 0, 0, 1,                              // back to identity
    ]
);

// AnimationClip(name, duration, tracks)
const clip = new THREE.AnimationClip('bounce', 4, [posTrack, rotTrack]);
console.log('Clip name:', clip.name);
console.log('Clip duration:', clip.duration);
console.log('Track count:', clip.tracks.length);
</script>
```

When executed, this outputs the clip's name `'bounce'`, its duration `4`, and a track count of `2`. This proves the `AnimationClip` successfully bundled our position and rotation tracks into one unified 4-second action. At exactly 2 seconds, the rotation will be a 90-degree turn around the Y axis via **SLERP (Spherical Linear Interpolation)**.

### Discard the throwaway
This standalone script logging clip metadata is deleted and will not be in our final project code.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are organizing our animation data.
- **Files affected**: `lesson-19.html` (modified).
- **Change type**: Add.
- **Location**: Right after our previous track definitions.
- **Dependencies**: The tracks defined in the previous unit.

### The New Code
We define the rotation track and combine it with our position track into a single clip.

```javascript
const rotTrack = new THREE.QuaternionKeyframeTrack(
    '.quaternion',
    [0, 2, 4],
    [0, 0, 0, 1, 0, Math.sin(Math.PI/4), 0, Math.cos(Math.PI/4), 0, 0, 0, 1]
);
const clip = new THREE.AnimationClip('bounce', 4, [posTrack, rotTrack]);
```

### The Updated Project
Here is the updated script block showing the tracks bundled into a clip.

```html
10:        const posTrack = new THREE.VectorKeyframeTrack('.position[y]', [0, 1, 2, 3, 4], [0, 2, 0, 2, 0]);
11:        const colorTrack = new THREE.ColorKeyframeTrack('.material.color', [0, 2, 4], [1, 0, 0, 0, 0, 1, 1, 0, 0]);
12:        
13:        // ← new
14:        const rotTrack = new THREE.QuaternionKeyframeTrack(
15:            '.quaternion',
16:            [0, 2, 4],
17:            [0, 0, 0, 1, 0, Math.sin(Math.PI/4), 0, Math.cos(Math.PI/4), 0, 0, 0, 1]
18:        );
19:        const clip = new THREE.AnimationClip('bounce', 4, [posTrack, rotTrack]);
```

### Mechanical walkthrough
- **`new THREE.QuaternionKeyframeTrack(...)`**: Creates a track specifically for 3D rotations based on quaternions.
- **`'.quaternion'`**: The string path targeting the mesh's rotational quaternion property.
- **`[0, 0, 0, 1, ...]`**: The flat array of quaternion components (x, y, z, w). `0, 0, 0, 1` represents the identity quaternion (zero rotation).
- **`new THREE.AnimationClip('bounce', 4, [posTrack, rotTrack])`**: Instantiates the clip. The string `'bounce'` is its name, `4` is the total duration in seconds, and the array lists the tracks to include.

### CS lens
Using Quaternions instead of Euler angles (pitch, yaw, roll) solves a classic Computer Science and mathematics problem known as **Gimbal lock**, where two axes of rotation align and you lose a degree of freedom. Furthermore, interpolating between quaternions uses **SLERP (Spherical Linear Interpolation)**, guaranteeing that the rotation occurs at a constant angular velocity along the shortest path, rather than warping awkwardly as standard linear interpolation would do.

### SE lens
By grouping tracks into an `AnimationClip`, we establish a modular asset. We can now treat "bounce" as a single noun in our system. A game character could have an `AnimationClip` for "walk", "run", and "jump", abstracting away the dozens of individual bone tracks inside each one.

### Commands needed
Open lesson-19.html in a modern browser.

### Run it
Executing this in the browser stores the clip in memory but nothing moves yet, as we have no visual scene or playback engine. 

### One sentence connecting to previous unit
Moving beyond isolated tracks, we have bundled our positional and rotational instructions into a synchronized timeline.

---

## Concept Unit: AnimationMixer and AnimationAction

### The Problem
A clip is just abstract data. It dictates that *something* moves and rotates, but it doesn't know *what* object should move, nor does it inherently progress time on its own. How do we apply that data to an actual `THREE.Mesh` and push it forward through time every frame?

### Introduce the concept in isolation
We introduce the **`THREE.AnimationMixer`** and **`THREE.AnimationAction`**. The mixer is the playback engine attached to an object, and the action is the controller for playing a specific clip on that mixer. We must supply **Delta time** to the mixer every frame.

```html
<script type="module">
import * as THREE from 'three';

const scene = new THREE.Scene();
const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({color: 0x44aaff})
);
scene.add(mesh);

// Mock the clip from the previous unit
const posTrack = new THREE.VectorKeyframeTrack('.position[y]', [0, 1], [0, 2]);
const clip = new THREE.AnimationClip('test', 1, [posTrack]);

// AnimationMixer: attached to the object to animate
const mixer = new THREE.AnimationMixer(mesh);

// AnimationAction: controls playback of ONE clip on the mixer
const action = mixer.clipAction(clip);
action.play();

console.log('Action playing:', action.isRunning());    
console.log('Action loop:', action.loop);              

const clock = new THREE.Clock();
mixer.update(0.5); // manually step half a second
console.log('Mesh Y position after 0.5s:', mesh.position.y);
</script>
```

When this runs, `action.isRunning()` is `true`, `action.loop` equals the **LoopRepeat** constant (2200), and after updating the mixer by 0.5 seconds, the `mesh.position.y` prints `1`. This proves the mixer successfully read the clip data, processed the **Interpolation**, and applied the resulting value directly to the attached `THREE.Mesh`.

### Discard the throwaway
This standalone demonstration of the mixer stepping through time is discarded.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-19.html` (modified).
- **Change type**: Add.
- **Location**: Below the clip declaration, adding scene setup and a render loop.
- **Dependencies**: The clip from the previous step.

### The New Code
We initialize the scene, create a mixer for our mesh, play the action, and update the mixer inside `requestAnimationFrame`.

```javascript
const scene = new THREE.Scene();
const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:0x44aaff}));
scene.add(mesh);

const mixer = new THREE.AnimationMixer(mesh);
const action = mixer.clipAction(clip);
action.play();

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    mixer.update(clock.getDelta());
}
animate();
```

### The Updated Project
Here is the full integration into our HTML file, including the required `requestAnimationFrame` loop.

```html
18:        );
19:        const clip = new THREE.AnimationClip('bounce', 4, [posTrack, rotTrack]);
20:
21:        // ← new
22:        const scene = new THREE.Scene();
23:        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:0x44aaff}));
24:        scene.add(mesh);
25:
26:        const mixer = new THREE.AnimationMixer(mesh);
27:        const action = mixer.clipAction(clip);
28:        action.play();
29:
30:        const clock = new THREE.Clock();
31:        function animate() {
32:            requestAnimationFrame(animate);
33:            mixer.update(clock.getDelta());
34:        }
35:        animate();
```

### Mechanical walkthrough
- **`new THREE.Scene()`**: Creates the root scene graph node.
- **`new THREE.Mesh(...)`**: Creates the visual cube object.
- **`scene.add(mesh)`**: Adds the cube to the scene.
- **`new THREE.AnimationMixer(mesh)`**: Instantiates the playback engine and permanently binds it to `mesh`.
- **`mixer.clipAction(clip)`**: Creates an `AnimationAction` that represents this specific clip playing on this specific mixer.
- **`action.play()`**: Tells the action to begin processing.
- **`new THREE.Clock()`**: Creates a timer utility.
- **`requestAnimationFrame(animate)`**: Asks the browser to call `animate` again before the next repaint.
- **`clock.getDelta()`**: Retrieves the **Delta time** (seconds since the last frame).
- **`mixer.update(...)`**: Advances the internal timer of all playing actions by the given delta, forcing property recalculations.

### CS lens
The `AnimationMixer` functions as a sophisticated State Machine. It manages multiple overlapping timelines simultaneously, resolving conflicts (if two clips try to animate `.position[y]` at once) by calculating weighted averages. Passing **Delta time** to `update()` ensures the animation runs at the same real-world speed regardless of whether the user's monitor is 60Hz or 144Hz.

### SE lens
Notice the clean separation of concerns: The `AnimationClip` holds the pure data, the `AnimationMixer` handles the math and applying values to the DOM/WebGL, and the `AnimationAction` holds the playback state (paused, playing, weight). This decoupling allows one clip to be shared among hundreds of mixers effortlessly.

### Commands needed
Open lesson-19.html in a modern browser.

### Run it
The code runs without crashing, and internally the mesh properties are changing frame by frame, but you won't see anything yet because we haven't added a camera or renderer to draw the scene to the canvas. (We will assume standard rendering boilerplate exists around this logic).

### One sentence connecting to previous unit
Now that our animation data is successfully driving a 3D object's properties over time, we need to learn how to manipulate the playback itself.

---

## Concept Unit: Controlling playback — play, pause, stop, loop

### The Problem
By default, calling `action.play()` causes the animation to loop infinitely at standard speed. What if you want an animation to play exactly once and stop, hold its final frame, or play backwards? 

### Introduce the concept in isolation
We configure the `AnimationAction` directly by modifying properties like `loop`, `clampWhenFinished`, and `timeScale`. 

```html
<script type="module">
import * as THREE from 'three';

const mixer = new THREE.AnimationMixer(new THREE.Mesh());
const clip = new THREE.AnimationClip('dummy', 1, []);
const action = mixer.clipAction(clip);

action.loop = THREE.LoopOnce;
action.clampWhenFinished = true;
action.timeScale = -1.0; 
action.play();

console.log('Loop mode:', action.loop);
console.log('Clamp:', action.clampWhenFinished);
console.log('Time scale:', action.timeScale);
</script>
```

When this runs, the output confirms the properties are set: loop mode is **LoopOnce** (2201), clamp is `true`, and **Time scale** is `-1.0`. This proves we can override the default playback behavior. Setting `timeScale` to -1 forces the mixer's internal update math to subtract time instead of adding it, running the animation in reverse.

### Discard the throwaway
This standalone action configuration script is discarded.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-19.html` (modified).
- **Change type**: Configure.
- **Location**: Right before we call `action.play()`.
- **Dependencies**: The `action` variable from the previous unit.

### The New Code
We update the action configuration to play once, hold the last frame, and run at double speed.

```javascript
action.loop = THREE.LoopOnce;
action.clampWhenFinished = true;
action.timeScale = 2.0;
```

### The Updated Project
Here is the configuration placed into the setup phase.

```html
26:        const mixer = new THREE.AnimationMixer(mesh);
27:        const action = mixer.clipAction(clip);
28:        
29:        // ← new
30:        action.loop = THREE.LoopOnce;
31:        action.clampWhenFinished = true;
32:        action.timeScale = 2.0;
33:        
34:        action.play();
35:
36:        const clock = new THREE.Clock();
```

### Mechanical walkthrough
- **`action.loop`**: Determines the repetition behavior.
- **`THREE.LoopOnce`**: A constant instructing the action to stop completely after finishing its duration.
- **`action.clampWhenFinished`**: A boolean flag. When `true`, the object stays frozen at the exact property values defined in the very last keyframe instead of resetting to its original state.
- **`action.timeScale`**: A multiplier for **Delta time**.
- **`2.0`**: Runs the animation at twice the normal speed.

### CS lens
Multiplying **Delta time** by a **Time scale** is a standard technique in simulation engines. By scaling time at the action level rather than the global clock level, you can implement slow-motion effects for a single character while the rest of the world runs at normal speed, simply by giving that character's action a `timeScale` of `0.1`.

### SE lens
Exposing playback controls on an `AnimationAction` object instead of the `AnimationClip` is a deliberate architectural choice. If `timeScale` lived on the Clip, every object sharing that clip would be forced to play it at the same speed. Placing the state on the Action allows the same walk cycle clip to be used by a fast runner and a slow walker simultaneously.

### Commands needed
Open lesson-19.html in a modern browser.

### Run it
The mesh will rapidly jump through its positional and rotational keyframes, finishing the 4-second clip in just 2 real-world seconds, and then freeze permanently at its final rotation and position.

### One sentence connecting to previous unit
Having mastered playback controls for vector and quaternion data, we can apply these same techniques to any numeric property.

---

## Concept Unit: Animating object properties with NumberKeyframeTrack

### The Problem
We have animated 3D position (a vector) and rotation (a quaternion). But what if we want to fade an object in or out? Opacity is a single scalar number, not a 3D coordinate. How do we animate flat numerical properties?

### Introduce the concept in isolation
We introduce the **`THREE.NumberKeyframeTrack`**, specifically designed for interpolating singular numbers. 

```html
<script type="module">
import * as THREE from 'three';

// Animate opacity: 1 -> 0 -> 1 (fade out and back in)
const opacityTrack = new THREE.NumberKeyframeTrack(
    '.material.opacity',
    [0, 1, 2],            // times
    [1, 0, 1]             // opacity values
);

console.log('Opacity track name:', opacityTrack.name);
console.log('Opacity track values:', opacityTrack.values);
</script>
```

When this runs, it prints `'.material.opacity'` and a typed array of `[1, 0, 1]`. This proves that singular numerical properties can be tracked and interpolated identically to complex 3D vectors. At exactly 0.5 seconds, the engine will compute an **Interpolation** between 1 and 0, resulting in an opacity of 0.5.

### Discard the throwaway
This opacity track logging script is discarded.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-19.html` (modified).
- **Change type**: Add.
- **Location**: In the material definition and adding the track to the clip.
- **Dependencies**: The `MeshStandardMaterial` instance.

### The New Code
First, we ensure the material supports transparency. Then we create the track and append it to our clip.

```javascript
// Ensure material can fade
const material = new THREE.MeshStandardMaterial({color:0x44aaff, transparent: true, opacity: 1.0});

const opacityTrack = new THREE.NumberKeyframeTrack('.material.opacity', [0, 2, 4], [1, 0, 1]);
// Assume clip array includes this new track
```

### The Updated Project
Here is the fully assembled script integrating the opacity track.

```html
22:        const scene = new THREE.Scene();
23:        
24:        // ← new
25:        const material = new THREE.MeshStandardMaterial({color:0x44aaff, transparent: true, opacity: 1.0});
26:        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), material);
27:        scene.add(mesh);
28:        
29:        // ← new
30:        const opacityTrack = new THREE.NumberKeyframeTrack('.material.opacity', [0, 2, 4], [1, 0, 1]);
31:        const clip = new THREE.AnimationClip('bounce', 4, [posTrack, rotTrack, opacityTrack]);
```

### Mechanical walkthrough
- **`transparent: true`**: A required boolean flag on `THREE.MeshStandardMaterial` that instructs the WebGL renderer to actually process the opacity property.
- **`opacity: 1.0`**: Sets the initial starting state of the material to fully opaque.
- **`new THREE.NumberKeyframeTrack(...)`**: Constructs a track specifically for single-float interpolation.
- **`'.material.opacity'`**: The string path bridging the object hierarchy. The mixer starts at the `mesh`, accesses its `.material` property, and animates that material's `.opacity` property.
- **`[1, 0, 1]`**: The flat array of scalar values corresponding to the timestamps. 

### CS lens
Under the hood, **Interpolation** of 1D data (`NumberKeyframeTrack`) is mathematically simpler than 3D data (`VectorKeyframeTrack`) or 4D rotational data (`QuaternionKeyframeTrack`). However, Three.js unifies all of them under a shared generic track architecture, meaning the mixer processes them identically. This polymorphism keeps the update loop extremely tight and fast.

### SE lens
The dot-notation string `'.material.opacity'` represents a powerful unified property binding system. Instead of hardcoding specialized getters and setters for every conceivable property, Three.js parses the string path at runtime to dynamically resolve references. This allows developers to animate custom properties they add to their own objects, not just built-in ones.

### Commands needed
Open lesson-19.html in a modern browser.

### Run it
When paired with the render loop, the mesh will physically move, rotate, and smoothly fade to completely invisible at the 2-second mark before fading back in.

### One sentence connecting to previous unit
This single generic tracking system handles everything from positions to opacity values seamlessly.

---

## Closing

### Connect the pieces
We have successfully decoupled our animation logic from our render loop. We started by defining pure, declarative timeline data using **`THREE.VectorKeyframeTrack`**, **`THREE.QuaternionKeyframeTrack`**, and **`THREE.NumberKeyframeTrack`**. We bundled those isolated instructions into a synchronized **`THREE.AnimationClip`**. We then bound that clip to a physical 3D **`THREE.Mesh`** via a **`THREE.AnimationMixer`**, and took granular control over its playback state (speed, looping, and halting) via the **`THREE.AnimationAction`**. By continuously feeding **Delta time** to the mixer, we enabled the engine to autonomously manage the complex mathematics of **Interpolation** and **SLERP (Spherical Linear Interpolation)** for us, resulting in perfectly smooth, constant-speed animations that are entirely data-driven.
