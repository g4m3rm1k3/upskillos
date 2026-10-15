---
title: 9.1 — A scene you can name
runtime: none
---

### The story so far

You have built real 2D games. The model remains authoritative while a new renderer presents its dice in space.

### What this lesson builds

Render a single cube and explain scene, camera, geometry, material, mesh and renderer.

## Read the spatial vocabulary

A 3D point has x, y and z coordinates. Here x is left/right, y is height and z is depth. A vector represents a direction or displacement; its components use those same axes. A scene holds objects. Geometry describes shape, a material describes surface appearance, and a mesh combines the two. A camera determines a view; a renderer draws that view into a canvas. new constructs an instance using a class supplied by the library. import * as THREE groups the library's named exports under one local object. These classes are useful library abstractions, not a reason to wrap every game function in a class.



## Give the scene a page

The earlier SVG fit a two-dimensional coordinate rectangle. A WebGL renderer needs a canvas and a nonzero drawing area. This HTML supplies a host div; the renderer will create and append the canvas. The style gives the host height as well as width so it cannot collapse to an invisible zero-height region. The module script src points to scene.mjs in this same scratch folder.

Use npm run dev and open /scratch/scene.html at the printed local address. A bare package import such as 'three' is resolved by Vite; opening this page as file:// does not perform that resolution. Before writing the script, inspect the empty host in DevTools and identify the space where the cube should appear.

```html file=scratch/scene.html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tabletop workshop</title>
</head>
<body>
<main><h1>One cube</h1><div id="scene" style="height: 300px"></div></main>
<script type="module" src="./scene.mjs"></script>
</body>
</html>
```



```check
file scratch/scene.html
```


**Explore, then restore:** Temporarily give the host a visible border and height 0, then restore its height. Explain why an empty area can result from layout rather than from the 3D camera. Keep the original dimensions for the next step.

## Draw once before animating

Use a tabletop coordinate system: x goes left/right, y up/down and z forward/back. The origin (0,0,0) is our cube's center. A Scene contains objects; it does not draw itself. new constructs an instance of a library class, giving each scene its own state. `import * as THREE` exposes the package's named exports through the THREE namespace; the star does not mean multiplication here.

PerspectiveCamera(45,2,0.1,100) takes vertical field of view in degrees, aspect width/height, near clipping distance and far clipping distance. Positions are scene units, not CSS pixels. Moving the camera to (0,2,5) changes where you view from; lookAt(0,0,0) changes where you view toward. A mesh combines BoxGeometry(1,1,1), a unit cube shape, with MeshBasicMaterial, a color surface that needs no lights. The hexadecimal number 0x... is JavaScript color input; it is not a CSS # string.

WebGLRenderer creates the canvas. antialias:true requests smoother edges. setSize(600,300) defines its drawing dimensions; domElement is the actual canvas appended to our host. render(scene,camera) draws one frame. Nothing animates because no loop asks for a second frame. Read the target as these six responsibilities, not one incantation.

```javascript file=scratch/scene.mjs
import * as THREE from 'three';
const host = document.getElementById('scene');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 100);
camera.position.set(0, 2, 5);
camera.lookAt(0, 0, 0);
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x184d40 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(600, 300);
host.append(renderer.domElement);
renderer.render(scene, camera);
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check scratch/scene.mjs"
```

```predict
question: Why is the camera aspect 2 here?
choice: 600 divided by 300 is 2
choice: It is the number of objects
answer: 600 divided by 300 is 2
explain: Aspect describes the display shape, not scene contents.
```


**Explore, then restore:** Change only cube width from 1 to 2; predict a wider shape. Restore it and change only camera aspect from 2 to 1 without changing the canvas: predict distortion. Restore aspect 2. Explain why shape, viewpoint and display proportions are different causes of a changed image.

## Try it — Look away

Change camera.lookAt to (20,0,0). The cube leaves the view even though it still exists in the scene. Restore the origin. Then change the material color only; explain why geometry did not change.



## Your turn — Keep the aspect correct

Define solve(width,height) returning width/height for positive dimensions. Export the function as solve.

Write practice/01-a-scene-you-can-name.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/01-a-scene-you-can-name.mjs'; if (!(solve(600,300)===2 && solve(300,600)===0.5)) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Which dimension is the numerator?
concept: Aspect measures width relative to height.
shape: Divide width by height.
```
