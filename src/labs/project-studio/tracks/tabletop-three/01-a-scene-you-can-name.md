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

The canvas is created by the renderer. This page supplies a host with height so it has space to appear. Run npm run dev and open /scratch/scene.html; bare package imports require the development server.

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

## Draw once before animating

PerspectiveCamera arguments are vertical field of view in degrees, aspect width/height, near clipping distance and far clipping distance. BoxGeometry arguments are width, height and depth. MeshBasicMaterial needs no light; 0x introduces a hexadecimal number. antialias smooths jagged edges. renderer.domElement is its canvas. setSize defines the drawing size; this first example is deliberately fixed at 600×300. render draws once. A later loop will draw repeatedly.

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
