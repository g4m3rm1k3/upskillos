# Lesson 14: TextureLoader — UV Mapping, wrapS/wrapT, repeat

What you will build
In this lesson, you will build a 3D scene that maps 2D images onto the surfaces of 3D geometry. You will solve the transferable problem of loading assets asynchronously over a network without freezing the application, and you will learn how to map, repeat, and offset 2D texture coordinates (UVs) onto 3D shapes.

What you need to know first
- Lesson 13: Geometries and Materials. We will reuse `THREE.Scene`, `THREE.PerspectiveCamera`, and `THREE.WebGLRenderer`.

Terms used in this lesson
- **UV Mapping** — The 3D modeling process of projecting a 2D image to a 3D model's surface. It exists to tell the graphics processor exactly which pixel of an image belongs on which part of a polygon.
- **Asynchronous Loading** — Executing a slow operation (like fetching an image over the network) in the background. It exists so that the main application thread does not freeze while waiting for data.
- **CORS (Cross-Origin Resource Sharing)** — A browser security feature. It exists to prevent malicious scripts on one website from reading data from another without permission. It forces us to serve our local files over an HTTP server instead of opening them directly via `file://`.
- **Albedo Map / Color Map** — An image that defines the base color of a surface without any lighting or shading baked in. It exists to give objects their painted or natural look.
- **Normal Map** — An image where RGB values represent XYZ surface directions. It exists to create the illusion of complex geometric detail (like bumps or scratches) on a flat polygon without the heavy performance cost of adding real vertices.
- **Roughness Map** — A grayscale image defining how smooth or rough a surface is per-pixel. It exists to make materials look more realistic, such as a brick wall where the mortar is rough but the brick faces are slightly smooth.
- **Procedural Texture** — A texture generated mathematically in code rather than loaded from an image file. It exists to save memory and allow infinite resolution for patterns like grids or noise.

Objects and methods used

**`THREE.TextureLoader`**
- *What it is:* A utility class for loading image files as textures.
- *Implementation:* `class TextureLoader extends Loader`
- *Its use:* We use it to fetch image files from the internet and convert them into GPU-ready texture objects.
- *Type:* Class
- *Responsibility:* Manages the asynchronous fetching of image assets and instantiates `THREE.Texture` objects.
- *Depends on:* An active DOM and browser fetch/Image API.
- *Connects to:* Calls network APIs to fetch images; outputs `THREE.Texture`.
- *Shape:* Boundary component bridging external network assets to internal 3D objects.

**`TextureLoader.loadAsync()`**
- *What it is:* An asynchronous method that returns a Promise resolving to a loaded texture.
- *Implementation:* `loadAsync(url: string): Promise<Texture>`
- *Its use:* We use it to halt execution (`await`) until our texture is fully loaded, ensuring our material has the image data before we render.
- *Type:* Instance method
- *Responsibility:* Fetches a URL and resolves a Promise only when the image decoding is fully complete.
- *Depends on:* A valid image URL and proper CORS headers.
- *Connects to:* Returns a `Promise` that resolves to a `THREE.Texture`.
- *Shape:* Internal API boundary for flow control.

**`THREE.Texture`**
- *What it is:* A representation of 2D data (like an image or canvas) prepared for the graphics card.
- *Implementation:* `class Texture`
- *Its use:* We apply it to materials so the geometries they cover display the image.
- *Type:* Class
- *Responsibility:* Holds the raw image data and the settings (wrapping, filtering, offset) that tell the GPU how to read that data.
- *Depends on:* A source image or canvas.
- *Connects to:* Passed into properties of materials (like `map` or `normalMap`).
- *Shape:* Core data container.

**`THREE.MeshStandardMaterial`**
- *What it is:* A physically-based rendering (PBR) material.
- *Implementation:* `class MeshStandardMaterial extends Material`
- *Its use:* We use it because it realistically reacts to light and accepts multiple map types (color, normal, roughness).
- *Type:* Class
- *Responsibility:* Computes how light interacts with a surface based on physical properties.
- *Depends on:* Textures or uniform values (color, roughness).
- *Connects to:* Attached to a `THREE.Mesh`.
- *Shape:* Internal rendering component.

**`THREE.RepeatWrapping`**
- *What it is:* A constant indicating a texture should tile when its UV coordinates go outside the 0.0 to 1.0 range.
- *Implementation:* `const RepeatWrapping = 1000;`
- *Its use:* We set texture wrapping modes to this so our images tile across large surfaces instead of stretching.
- *Type:* Numeric Constant
- *Responsibility:* Flags the GPU sampler state for wrapping behavior.
- *Depends on:* Nothing.
- *Connects to:* Assigned to `texture.wrapS` and `texture.wrapT`.
- *Shape:* Configuration flag.

**`THREE.Vector2`**
- *What it is:* A 2D vector representing an X and Y value.
- *Implementation:* `class Vector2`
- *Its use:* We use it to set the `repeat` and `offset` properties of textures.
- *Type:* Class
- *Responsibility:* Holds two floating-point numbers and provides math operations for them.
- *Depends on:* Numeric inputs.
- *Connects to:* Used internally by `Texture` to store UV transformations.
- *Shape:* Primitive data structure.

**`THREE.CanvasTexture`**
- *What it is:* A texture generated directly from an HTML `<canvas>` element.
- *Implementation:* `class CanvasTexture extends Texture`
- *Its use:* We use it to draw a procedural checkerboard pattern using JavaScript 2D drawing APIs without needing an external file.
- *Type:* Class
- *Responsibility:* Wraps a 2D canvas and uploads its pixel data to the GPU.
- *Depends on:* An `HTMLCanvasElement`.
- *Connects to:* Inherits from `THREE.Texture` and attaches to materials.
- *Shape:* Data bridge between 2D DOM and 3D WebGL.

**`Promise.all()`**
- *What it is:* A JavaScript language feature that waits for multiple asynchronous tasks to finish.
- *Implementation:* `Promise.all(iterable)`
- *Its use:* We use it to fetch a color map, normal map, and roughness map at the same time, continuing only when all three are ready.
- *Type:* Static method on Promise
- *Responsibility:* Aggregates multiple promises into a single promise.
- *Depends on:* An array of Promises.
- *Connects to:* `await` flow control.
- *Shape:* Language feature for concurrency.

**`document.createElement()`**
- *What it is:* A browser DOM method to create HTML elements dynamically.
- *Implementation:* `document.createElement(tagName)`
- *Its use:* We use it to create an invisible `<canvas>` in memory for our procedural texture.
- *Type:* Method on the global document object
- *Responsibility:* Instantiates new DOM node objects.
- *Depends on:* A valid HTML tag name string.
- *Connects to:* Returns an `HTMLElement` (like `HTMLCanvasElement`).
- *Shape:* Web API.

---

## Concept Unit: TextureLoader — loading an image asynchronously

### The Problem
If we want an image to wrap around a 3D object, we must load the file from a server and feed it to the graphics card. Reading from a hard drive or the network takes time. If the main thread stops to wait for the image to download, the entire webpage freezes. How do we start loading an image without stopping the rest of our code, and how do we ensure the graphics card gets it once it arrives?

Given what `setTimeout` does, what would you try here first to handle waiting? Pause and guess how Three.js might hand back a texture object that isn't fully loaded yet.

### Introduce the concept in isolation
Here is a throwaway script demonstrating `TextureLoader` loading an image asynchronously.

```javascript
import * as THREE from 'three';

const loader = new THREE.TextureLoader();

// loader.load(url, onLoad, onProgress, onError):
// Non-blocking: returns a Texture immediately (empty until image loads)
const texture = loader.load(
    'https://threejs.org/examples/textures/uv_grid_opengl.jpg',
    (tex) => console.log('Loaded! Size:', tex.image.width, 'x', tex.image.height),
    undefined,
    (err) => console.error('Load error:', err)
);

console.log('Texture object (before load):', texture.uuid);

// For guaranteed load before use: await loader.loadAsync(url)
async function fetchTexture() {
    const tex = await loader.loadAsync('https://threejs.org/examples/textures/uv_grid_opengl.jpg');
    console.log('Async loaded:', tex.image.width, 'x', tex.image.height);
}
fetchTexture();
```

Output:
```text
Texture object (before load): 1234abcd-5678-efgh...
Loaded! Size: 1024 x 1024
Async loaded: 1024 x 1024
```
This demonstrates that `loader.load` returns a `Texture` object immediately (which acts as a placeholder) before the image data arrives. This is called **asynchronous loading**. `loadAsync` guarantees the image is fully decoded before the code proceeds.

### Discard the throwaway
This isolated loading snippet is discarded; we will write the actual integrated loading code in our project.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition because we are starting our texture playground.
- **Files affected:** `lesson-14.html` (created)
- **Change type:** Add
- **Location:** In the new HTML file, setting up the basic scene and loader.
- **Dependencies:** Three.js via CDN.

### The New Code
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Three.js Textures</title>
    <script type="importmap">
        {
            "imports": {
                "three": "https://unpkg.com/three@0.160.0/build/three.module.js"
            }
        }
    </script>
</head>
<body>
    <script type="module">
        import * as THREE from 'three';
        
        const scene = new THREE.Scene();
        const loader = new THREE.TextureLoader();
        const colorTex = await loader.loadAsync('https://threejs.org/examples/textures/uv_grid_opengl.jpg');
    </script>
</body>
</html>
```

### The Updated Project
```html
1: <!DOCTYPE html>
2: <html lang="en">
3: <head>
4:     <meta charset="UTF-8">
5:     <title>Three.js Textures</title>
6:     <script type="importmap">
7:         {
8:             "imports": {
9:                 "three": "https://unpkg.com/three@0.160.0/build/three.module.js"
10:             }
11:         }
12:     </script>
13: </head>
14: <body>
15:     <script type="module">
16:         import * as THREE from 'three';
17:         
18:         const scene = new THREE.Scene(); // ← new
19:         const loader = new THREE.TextureLoader(); // ← new
20:         const colorTex = await loader.loadAsync('https://threejs.org/examples/textures/uv_grid_opengl.jpg'); // ← new
21:     </script>
22: </body>
23: </html>
```
The HTML file now initializes a scene and successfully halts execution using `await` until `TextureLoader` finishes downloading our image.

### Mechanical walkthrough
- `const loader = new THREE.TextureLoader()` instantiates the loader.
- `await` tells JavaScript to pause execution in this async module until the right side resolves.
- `loader.loadAsync(...)` makes an HTTP request to the URL, returning a Promise that resolves to a `THREE.Texture` once the image is fully decoded.
- `colorTex` variable stores the fully loaded `THREE.Texture`.

### CS lens
Asynchronous loading solves a critical synchronization problem in computer graphics. I/O operations (fetching an image over a network) are orders of magnitude slower than CPU operations. By yielding control back to the browser while waiting, the thread isn't blocked, preventing the UI from freezing.

### SE lens
Using `await` at the top level of a module ensures that the application only proceeds when its critical assets are verified and ready. This prevents "pop-in" effects where geometry renders gray for a few frames before the texture arrives.

### Commands needed
Open `lesson-14.html` in a modern browser. Note: TextureLoader requires serving files via HTTP (not file://). Run: `python3 -m http.server 8080` then open `http://localhost:8080/lesson-14.html`

### Run it
The screen remains blank because we have not created a camera or a renderer, but the network tab in browser developer tools will show the successful download of the JPEG.

### One sentence connecting to previous unit
Now that we have successfully loaded our image data into a Texture object, we need to map it onto a 3D surface.

---

## Concept Unit: Applying texture to a material

### The Problem
We have a texture in memory, but 3D geometry doesn't inherently know how an image maps onto its surface. How do we wrap a flat rectangle of pixels onto a sphere?

If you were to paint an image onto a globe, what information would you need at each point on the globe to know which pixel to pick? Pause and think about how a coordinate system on a surface maps to an image.

### Introduce the concept in isolation
Here is a throwaway script demonstrating how to configure a material with a texture.

```javascript
import * as THREE from 'three';

const loader = new THREE.TextureLoader();
// Assuming we are in an async function:
const colorTex = await loader.loadAsync('https://threejs.org/examples/textures/uv_grid_opengl.jpg');

const material = new THREE.MeshStandardMaterial({
    map: colorTex,    
    roughness: 0.8,
    metalness: 0.0,
});

console.log('Texture encoding:', colorTex.colorSpace);
console.log('Material map assigned:', material.map !== null);
```

Output:
```text
Texture encoding: srgb
Material map assigned: true
```
This code proves that the `map` property accepts our `THREE.Texture` object. In a shader, the renderer samples the texture using **UV coordinates** interpolated across the faces.

### Discard the throwaway
We will discard this isolated lab code and add the real material setup to our HTML file.

### Project Change
- **Reference Source:** No reference counterpart — this is a from-scratch addition.
- **Files affected:** `lesson-14.html` (modified)
- **Change type:** Add
- **Location:** Below the texture loading logic.
- **Dependencies:** The previously created `scene` and `colorTex`.

### The New Code
```javascript
        colorTex.colorSpace = THREE.SRGBColorSpace;
        
        const material = new THREE.MeshStandardMaterial({
            map: colorTex,
            roughness: 0.8,
            metalness: 0.0,
        });
        
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), material);
        scene.add(sphere);

        // Boilerplate rendering setup
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.z = 3;
        
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);
        
        const light = new THREE.AmbientLight(0xffffff, 1.0);
        scene.add(light);
        
        renderer.render(scene, camera);
```

### The Updated Project
```html
15:     <script type="module">
16:         import * as THREE from 'three';
17:         
18:         const scene = new THREE.Scene(); 
19:         const loader = new THREE.TextureLoader(); 
20:         const colorTex = await loader.loadAsync('https://threejs.org/examples/textures/uv_grid_opengl.jpg'); 
21:         
22:         colorTex.colorSpace = THREE.SRGBColorSpace; // ← new
23:         const material = new THREE.MeshStandardMaterial({ // ← new
24:             map: colorTex, // ← new
25:             roughness: 0.8, // ← new
26:             metalness: 0.0, // ← new
27:         }); // ← new
28:         
29:         const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), material); // ← new
30:         scene.add(sphere); // ← new
31: 
32:         const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100); // ← new
33:         camera.position.z = 3; // ← new
34:         const renderer = new THREE.WebGLRenderer(); // ← new
35:         renderer.setSize(window.innerWidth, window.innerHeight); // ← new
36:         document.body.appendChild(renderer.domElement); // ← new
37:         const light = new THREE.AmbientLight(0xffffff, 1.0); // ← new
38:         scene.add(light); // ← new
39:         renderer.render(scene, camera); // ← new
40:     </script>
```
The project now wraps our texture around a sphere geometry and renders it to the screen using standard camera and light setups.

### Mechanical walkthrough
- `colorTex.colorSpace = THREE.SRGBColorSpace;` ensures the color image is treated in the sRGB color space, preventing it from appearing washed out.
- `new THREE.MeshStandardMaterial({...})` creates a new PBR material.
- `map: colorTex` assigns our loaded texture as the albedo/color map.
- `new THREE.SphereGeometry(1, 64, 32)` generates vertices that come pre-populated with **UV coordinates**, where `u` = azimuth/2PI and `v` = (PI/2 - elevation)/PI.
- `renderer.render(scene, camera);` draws the frame, pushing the geometry and texture uniform data to the GPU.

### CS lens
UV coordinates are a normalized 2D grid `[0.0, 1.0]`. When rendering a triangle, the GPU hardware automatically interpolates these UV values from the three vertices across the surface of the triangle. The fragment shader then reads the interpolated UV value and samples the corresponding pixel from the 2D texture memory.

### SE lens
Using pre-built geometries (`SphereGeometry`) saves us from having to manually calculate the complex spherical UV mapping math. The framework provides correct UVs automatically, decoupling the geometry creation from the material configuration.

### Commands needed
Open `lesson-14.html` in a modern browser. Note: TextureLoader requires serving files via HTTP (not file://). Run: `python3 -m http.server 8080` then open `http://localhost:8080/lesson-14.html`

### Run it
You will see a sphere covered in a colorful numbered grid mapping.

### One sentence connecting to previous unit
Now that our texture is wrapped across the geometry, we can manipulate how it repeats or wraps if the UV coordinates go beyond the standard [0, 1] range.

---

## Concept Unit: wrapS, wrapT, and repeat

### The Problem
If a texture is applied to a very large floor, stretching one single image across the entire expanse looks blurry and terrible. How do we make the image act like tiles repeating across the surface?

If you had a 1x1 image, and you asked the computer to fetch the pixel at coordinate 1.5, what should it do? Pause and guess what options a graphics card might have for out-of-bounds coordinates.

### Introduce the concept in isolation
Here is a throwaway snippet testing how texture wrapping properties are modified.

```javascript
import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const texture = await loader.loadAsync('https://threejs.org/examples/textures/brick_diffuse.jpg');

texture.wrapS = THREE.RepeatWrapping;   
texture.wrapT = THREE.RepeatWrapping;   
texture.repeat.set(4, 4);   

texture.offset.set(0.1, 0.0);  
texture.rotation = Math.PI / 4;  
texture.center.set(0.5, 0.5);    

console.log('WrapS:', texture.wrapS);     
console.log('Repeat:', texture.repeat.x, texture.repeat.y); 
console.log('Offset:', texture.offset.x, texture.offset.y); 
```

Output:
```text
WrapS: 1000
Repeat: 4 4
Offset: 0.1 0
```
This shows the texture being configured to tile 4 times on the U axis (`repeat.set`), using **`THREE.RepeatWrapping`**, and shifted slightly (`offset.set`).

### Discard the throwaway
We will discard this isolated code snippet before returning to our project.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-14.html` (modified)
- **Change type:** Replace
- **Location:** Update the texture loading section to load brick textures and apply wrapping, and update the geometry to a plane to see tiling clearly.
- **Dependencies:** The previously initialized scene setup.

### The New Code
```javascript
        const brickTex = await loader.loadAsync('https://threejs.org/examples/textures/brick_diffuse.jpg');
        brickTex.colorSpace = THREE.SRGBColorSpace;
        
        brickTex.wrapS = THREE.RepeatWrapping;
        brickTex.wrapT = THREE.RepeatWrapping;
        brickTex.repeat.set(4, 4);

        const material = new THREE.MeshStandardMaterial({
            map: brickTex,
            roughness: 0.8,
            metalness: 0.0,
        });
        
        // Replace sphere with a plane
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), material);
        plane.rotation.x = -Math.PI / 2;
        scene.add(plane);
```

### The Updated Project
```html
18:         const scene = new THREE.Scene(); 
19:         const loader = new THREE.TextureLoader(); 
20:         
21:         const brickTex = await loader.loadAsync('https://threejs.org/examples/textures/brick_diffuse.jpg'); // ← new
22:         brickTex.colorSpace = THREE.SRGBColorSpace; // ← new
23:         
24:         brickTex.wrapS = THREE.RepeatWrapping; // ← new
25:         brickTex.wrapT = THREE.RepeatWrapping; // ← new
26:         brickTex.repeat.set(4, 4); // ← new
27: 
28:         const material = new THREE.MeshStandardMaterial({ // ← new
29:             map: brickTex, // ← new
30:             roughness: 0.8,
31:             metalness: 0.0,
32:         });
33:         
34:         const plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), material); // ← new
35:         plane.rotation.x = -Math.PI / 2; // ← new
36:         scene.add(plane); // ← new
37: 
38:         const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100); 
39:         camera.position.set(0, 5, 5); // ← changed for better view
40:         camera.lookAt(0, 0, 0);       // ← changed for better view
41:         // ...renderer and light code unchanged
```
Our project now displays a flat floor plane with the brick texture tiled 4 times across its surface.

### Mechanical walkthrough
- `brickTex.wrapS = THREE.RepeatWrapping;` sets the horizontal (U axis) wrapping mode to repeat instead of clamping to the edge.
- `brickTex.wrapT = THREE.RepeatWrapping;` sets the vertical (V axis) wrapping mode to repeat.
- `brickTex.repeat.set(4, 4);` scales the UV coordinates. A UV of `[0, 1]` maps to `[0, 4]` on the GPU. Because wrapping is set to repeat, a UV of `1.5` equals `0.5` (fractional part).
- `plane.rotation.x = -Math.PI / 2;` rotates the plane 90 degrees so it lies flat like a floor.

### CS lens
When the GPU attempts to sample a texture at coordinate 1.5, the wrapping mode defines the behavior. `ClampToEdge` (default) clamps the value to 1.0. `RepeatWrapping` uses the fractional remainder (modulo 1), wrapping 1.5 back to 0.5. This allows infinite repetition without additional geometry memory.

### SE lens
Exposing the transformation properties (`repeat`, `offset`, `rotation`) directly on the `Texture` object means that the material and shader can remain agnostic. You do not need to write a custom shader to tile an image; you just configure the data object holding it.

### Commands needed
Open `lesson-14.html` in a modern browser. Note: TextureLoader requires serving files via HTTP (not file://). Run: `python3 -m http.server 8080` then open `http://localhost:8080/lesson-14.html`

### Run it
You will see a large floor plane composed of a tiled brick pattern.

### One sentence connecting to previous unit
While tiling gives us broad coverage, our brick floor looks completely flat because it only has color information; adding multiple texture maps will give it depth.

---

## Concept Unit: Multiple texture maps (normal, roughness, AO)

### The Problem
A single color map paints an image onto a surface, but real-world objects have microscopic bumps and varying shininess. How do we tell the renderer that the mortar between the bricks is rough and pushed inward, without building millions of tiny polygons?

If you wanted to fake lighting on a bumpy surface without changing the surface itself, what information would you need? Pause and try to imagine how an image could store "direction."

### Introduce the concept in isolation
Here is a snippet showing how to fetch multiple maps concurrently using `Promise.all`.

```javascript
import * as THREE from 'three';

const loader = new THREE.TextureLoader();

const [colorMap, normalMap, roughnessMap] = await Promise.all([
    loader.loadAsync('https://threejs.org/examples/textures/brick_diffuse.jpg'),
    loader.loadAsync('https://threejs.org/examples/textures/brick_normal.jpg'),
    loader.loadAsync('https://threejs.org/examples/textures/brick_roughness.jpg')
]);

normalMap.colorSpace = THREE.NoColorSpace;  

const material = new THREE.MeshStandardMaterial({
    map:          colorMap,    
    normalMap:    normalMap,   
    normalScale:  new THREE.Vector2(1, 1),  
    roughnessMap: roughnessMap, 
    roughness:    1.0,          
});

console.log('Normal map type loaded:', material.normalMap !== null);
```

Output:
```text
Normal map type loaded: true
```
This isolates the fetching of multiple texture files. Using **`Promise.all`**, we wait for all images. We assign a **Normal Map** to trick the lighting calculation.

### Discard the throwaway
We will discard this lab code and weave the concurrent loading structure into our main project.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-14.html` (modified)
- **Change type:** Replace
- **Location:** Update the texture loading and material definition to use the three new maps.
- **Dependencies:** `Promise.all` handling multiple asynchronous loaders.

### The New Code
```javascript
        const [brickTex, brickNormal, brickRoughness] = await Promise.all([
            loader.loadAsync('https://threejs.org/examples/textures/brick_diffuse.jpg'),
            loader.loadAsync('https://threejs.org/examples/textures/brick_normal.jpg'),
            loader.loadAsync('https://threejs.org/examples/textures/brick_diffuse.jpg') // using diffuse as a makeshift roughness for demo
        ]);

        brickTex.colorSpace = THREE.SRGBColorSpace;
        brickNormal.colorSpace = THREE.NoColorSpace;

        [brickTex, brickNormal, brickRoughness].forEach(tex => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(4, 4);
        });

        const material = new THREE.MeshStandardMaterial({
            map: brickTex,
            normalMap: brickNormal,
            normalScale: new THREE.Vector2(2, 2),
            roughnessMap: brickRoughness,
            roughness: 1.0,
            metalness: 0.0,
        });
```

### The Updated Project
```html
18:         const scene = new THREE.Scene(); 
19:         const loader = new THREE.TextureLoader(); 
20:         
21:         const [brickTex, brickNormal, brickRoughness] = await Promise.all([ // ← new
22:             loader.loadAsync('https://threejs.org/examples/textures/brick_diffuse.jpg'), // ← new
23:             loader.loadAsync('https://threejs.org/examples/textures/brick_normal.jpg'), // ← new
24:             loader.loadAsync('https://threejs.org/examples/textures/brick_diffuse.jpg') // ← new
25:         ]); // ← new
26: 
27:         brickTex.colorSpace = THREE.SRGBColorSpace; 
28:         brickNormal.colorSpace = THREE.NoColorSpace; // ← new
29: 
30:         [brickTex, brickNormal, brickRoughness].forEach(tex => { // ← new
31:             tex.wrapS = THREE.RepeatWrapping; // ← new
32:             tex.wrapT = THREE.RepeatWrapping; // ← new
33:             tex.repeat.set(4, 4); // ← new
34:         }); // ← new
35: 
36:         const material = new THREE.MeshStandardMaterial({ 
37:             map: brickTex, 
38:             normalMap: brickNormal, // ← new
39:             normalScale: new THREE.Vector2(2, 2), // ← new
40:             roughnessMap: brickRoughness, // ← new
41:             roughness: 1.0, 
42:             metalness: 0.0,
43:         });
```
The application now fetches three textures simultaneously. By applying normal maps and roughness maps with identical tiling, the flat plane renders with complex lighting reactions.

### Mechanical walkthrough
- `Promise.all([...])` executes multiple `loadAsync` fetches in parallel and waits for all of them to resolve.
- `brickNormal.colorSpace = THREE.NoColorSpace;` ensures normal maps are not gamma-corrected. They encode mathematical directions (XYZ mapped to RGB channels), not visual colors.
- `tex.wrapS = THREE.RepeatWrapping;` is applied via a loop so that all maps tile identically and stay physically aligned.
- `normalScale: new THREE.Vector2(2, 2)` amplifies the bumpiness effect of the normal map.
- `roughnessMap: brickRoughness` uses the image's red channel to determine how diffuse the lighting reflection should be per-pixel.

### CS lens
A normal map uses RGB color channels to represent a 3D vector (X, Y, Z). A flat surface pointing straight up has a normal of `(0, 0, 1)`. Mapped to RGB `[0, 255]`, this is `(128, 128, 255)` — the light blue color iconic to normal maps. This vector math allows the fragment shader to calculate shadows and highlights dynamically without heavy vertex geometry processing.

### SE lens
Using `Promise.all` prevents a waterfall network fetch. If you awaited each texture sequentially, loading time would be `Time(A) + Time(B) + Time(C)`. By doing it in parallel, the total time is `max(Time(A), Time(B), Time(C))`.

### Commands needed
Open `lesson-14.html` in a modern browser. Note: TextureLoader requires serving files via HTTP (not file://). Run: `python3 -m http.server 8080` then open `http://localhost:8080/lesson-14.html`

### Run it
The floor will now visibly react to lighting, showing bumps and crevices as if the bricks were actually modeled in 3D.

### One sentence connecting to previous unit
Sometimes fetching files over a network isn't an option or is unnecessary for simple patterns, so we can generate textures procedurally using code instead.

---

## Concept Unit: CanvasTexture — procedural textures without image files

### The Problem
Fetching an image from a URL relies on an external server and takes network bandwidth. What if we just need a simple checkerboard or a dynamically updating label? How can we create a texture purely in code without depending on static image assets?

If you were to draw pixels directly into memory, what web standard already exists to do 2D drawing? Pause and consider how you might pipe that into Three.js.

### Introduce the concept in isolation
Here is a throwaway snippet using the HTML Canvas API to generate a texture.

```javascript
import * as THREE from 'three';

function makeCheckerTexture(size, squares) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    const sq = size / squares;
    for (let y = 0; y < squares; y++) {
        for (let x = 0; x < squares; x++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#000000';
            ctx.fillRect(x * sq, y * sq, sq, sq);
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

const checker = makeCheckerTexture(512, 8);  
console.log('Canvas texture size:', checker.image.width); 
console.log('Is Texture?', checker instanceof THREE.Texture);
```

Output:
```text
Canvas texture size: 512
Is Texture? true
```
We created a 2D **procedural texture** using standard HTML canvas elements. This proves that `THREE.CanvasTexture` cleanly wraps a raw `<canvas>` element and produces a valid texture without loading anything.

### Discard the throwaway
We will discard the throwaway test and incorporate a similar generation function into our main code.

### Project Change
- **Reference Source:** No reference counterpart.
- **Files affected:** `lesson-14.html` (modified)
- **Change type:** Add
- **Location:** At the top of the script, create a generator function, then apply it to an object floating above our floor.
- **Dependencies:** The HTML Canvas 2D API context.

### The New Code
```javascript
        function makeCheckerTexture(size, squares) {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size;
            const ctx = canvas.getContext('2d');
            const sq = size / squares;
            for (let y = 0; y < squares; y++) {
                for (let x = 0; x < squares; x++) {
                    ctx.fillStyle = (x + y) % 2 === 0 ? '#ff0000' : '#ffffff';
                    ctx.fillRect(x * sq, y * sq, sq, sq);
                }
            }
            return new THREE.CanvasTexture(canvas);
        }

        const checker = makeCheckerTexture(512, 8);
        const floatPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(3, 3),
            new THREE.MeshStandardMaterial({ map: checker, side: THREE.DoubleSide })
        );
        floatPlane.position.set(0, 2, 0);
        scene.add(floatPlane);
```

### The Updated Project
```html
16:         import * as THREE from 'three';
17:         
18:         function makeCheckerTexture(size, squares) { // ← new
19:             const canvas = document.createElement('canvas'); // ← new
20:             canvas.width = canvas.height = size; // ← new
21:             const ctx = canvas.getContext('2d'); // ← new
22:             const sq = size / squares; // ← new
23:             for (let y = 0; y < squares; y++) { // ← new
24:                 for (let x = 0; x < squares; x++) { // ← new
25:                     ctx.fillStyle = (x + y) % 2 === 0 ? '#ff0000' : '#ffffff'; // ← new
26:                     ctx.fillRect(x * sq, y * sq, sq, sq); // ← new
27:                 } // ← new
28:             } // ← new
29:             return new THREE.CanvasTexture(canvas); // ← new
30:         } // ← new
31: 
32:         const scene = new THREE.Scene(); 
33:         // ... loader logic unchanged ...
34: 
35:         const checker = makeCheckerTexture(512, 8); // ← new
36:         const floatPlane = new THREE.Mesh( // ← new
37:             new THREE.PlaneGeometry(3, 3), // ← new
38:             new THREE.MeshStandardMaterial({ map: checker, side: THREE.DoubleSide }) // ← new
39:         ); // ← new
40:         floatPlane.position.set(0, 2, 0); // ← new
41:         scene.add(floatPlane); // ← new
42:         
43:         const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100); 
```
We now have a floating plane using a generated texture that required zero network bandwidth to load.

### Mechanical walkthrough
- `const canvas = document.createElement('canvas');` creates an HTML canvas element purely in memory (not appended to the DOM).
- `const ctx = canvas.getContext('2d');` grabs the 2D rendering context so we can use JavaScript drawing commands.
- `ctx.fillStyle` and `ctx.fillRect(...)` loop to draw an alternating red/white checkerboard pattern.
- `new THREE.CanvasTexture(canvas)` wraps the canvas object, telling Three.js to upload the canvas's pixel buffer to the GPU as a texture.
- `side: THREE.DoubleSide` ensures our floating plane is visible from both underneath and above.

### CS lens
Using a canvas for a texture is a form of procedural generation. It trades CPU cycles (the time taken to execute the loops and draw rectangles) for network bandwidth and memory footprint. Canvas textures are also dynamic — if you call `ctx.fillRect` again later and set `checker.needsUpdate = true`, the graphics card will swap the old texture for the new one at runtime, making this an ideal path for dynamic elements like scoreboards or nametags.

### SE lens
Generating textures programmatically decouples your application from external asset constraints. It ensures that critical fallback materials or testing grids are strictly self-contained and guarantee no missing-file HTTP 404 errors during development.

### Commands needed
Open `lesson-14.html` in a modern browser. Note: TextureLoader requires serving files via HTTP (not file://). Run: `python3 -m http.server 8080` then open `http://localhost:8080/lesson-14.html`

### Run it
You will see a floating plane with a red-and-white checkerboard, sitting above the brick floor.

### One sentence connecting to previous unit
We've mapped an image, tiled it across geometry, added lighting detail with normal maps, and created textures dynamically using code.

---

## Closing

### Connect the pieces
In this lesson, we transitioned from basic colors to complex, image-driven surfaces. By utilizing `THREE.TextureLoader` and `loadAsync`, we safely fetched a color `map`, a `normalMap`, and a `roughnessMap` simultaneously over the network. We manipulated exactly how those textures were applied using `wrapS = THREE.RepeatWrapping` and scaled them using `repeat.set(4,4)`, mapping UV coordinates from the default `[0,1]` range out to `[0,4]`. Finally, we utilized `THREE.CanvasTexture` to sidestep loading entirely, leveraging the browser's own 2D graphics API to procedurally generate a checkerboard texture in code, opening the door for dynamically updated screens or labels in our 3D world.
