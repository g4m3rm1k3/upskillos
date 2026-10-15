---
title: 9.3 — Light the table
runtime: none
---

### The story so far

Continue the renderer in table3d.mjs. Use the scratch table page to observe each intermediate renderer before integrating it into the game.

### What this lesson builds

Explain the new rendering boundary and preserve the game's authoritative result.

## Extend the renderer

Replace the unlit scratch cube with a makeTable(host,onPick) function that owns its own drawing resources. host is a DOM element supplied by the caller; onPick will be a callback for selected die indices. No dice or picking exist in this stage yet. Scene, camera and renderer are the same responsibilities you just explored.

MeshStandardMaterial responds to lighting. color tints the surface and roughness controls how broadly light reflects: near 0 is smooth, near 1 rough. HemisphereLight(skyColor,groundColor,intensity) supplies contrasting light from above and below. DirectionalLight(color,intensity) produces parallel rays; position sets its direction toward the default origin target. A material may look black without light although its geometry is present.

BoxGeometry(9,0.18,4) is a wide, thin tray. Its y position -0.68 places its top below dice centered at y=0. Shadow rendering requires renderer.shadowMap.enabled, a light that casts, and meshes marked as casters/receivers. The tray receives shadows; later dice cast them. alpha:true leaves the canvas background transparent. devicePixelRatio relates device pixels to CSS pixels; Math.min(ratio,2) caps expensive high-density rendering. The fixed draw at this stage is intentional; responsive resizing comes later.

scene.traverse calls its callback for the scene and every descendant. Some nodes have geometry or material and others do not; each if guards that optional resource before calling its dispose method. The returned dispose method is part of this view's contract. It releases the resources this stage allocated. Removing only the canvas is not sufficient GPU cleanup. The next step supplies a scratch host so you can observe the tray before adding dice.

```javascript file=table3d.mjs
import * as THREE from 'three';
import { pips } from './svg.mjs';

export const normals = [[0, 1, 0], [1, 0, 0], [0, 0, 1], [0, 0, -1], [-1, 0, 0], [0, -1, 0]];
export function faceRotation(face) {
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...normals[face - 1]), new THREE.Vector3(0, 1, 0));
}
export function makeTable(host, onPick) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 7, 9);
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  host.append(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xfff4df, 0x123b32, 3));
  const light = new THREE.DirectionalLight(0xffffff, 4);
  light.position.set(-3, 8, 5);
  light.castShadow = true;
  scene.add(light);
  const ground = new THREE.Mesh(new THREE.BoxGeometry(9, 0.18, 4), new THREE.MeshStandardMaterial({ color: 0x184d40, roughness: 0.95 }));
  ground.position.y = -0.68;
  ground.receiveShadow = true;
  scene.add(ground);
  renderer.setSize(600, 300);
  renderer.render(scene, camera);
  return { dispose() {
    scene.traverse(function (object) {
      if (object.geometry) object.geometry.dispose();
      if (object.material) object.material.dispose();
    });
    renderer.dispose();
    renderer.domElement.remove();
  } };
}
```



The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check table3d.mjs"
```

```predict
question: Does removing a canvas automatically dispose every geometry and material?
choice: No
choice: Yes
answer: No
explain: Explicit renderer resource ownership is needed when views are created and destroyed.
```


**Explore, then restore:** In the scratch view below, set both light intensities to 0 and observe a dark surface. Restore them, then compare roughness .1 and .95. Do not change geometry and light simultaneously: identify one cause for each result.

## Give the table a scratch host {#table-host}

Use a separate page to explore the current renderer without changing the game. The host's width shrinks with the available page width but its height is fixed. The canvas CSS width and height fill that host; display:block removes inline baseline spacing. These CSS dimensions differ from the renderer's pixel buffer size, which may be larger on a high-density screen. Without these rules the canvas can overflow its host after setSize(...,false). The button and status paragraph are ordinary HTML controls; a separate module will wire them next. Open /scratch/table-probe.html through npm run dev. The script file is supplied in the next step, so a missing-script error before then is expected.

```html file=scratch/table-probe.html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Table experiment</title>
<style>#host { width: min(600px, 100%); height: 300px; background: #dce5dd; } #host canvas { width: 100%; height: 100%; display: block; }</style>
</head><body>
<h1>One renderer, observed directly</h1>
<div id="host"></div><button id="show">Show 6, 5, 4, 3, 2</button>
<p id="picked" role="status">No die selected.</p>
<script type="module" src="./table-probe.mjs"></script>
</body></html>
```

```check
file scratch/table-probe.html
```

## Call the renderer from the scratch page {#table-caller}

makeTable returns an object with methods closing over its scene resources. The callback receives an index and writes the selected die into a paragraph. At this stage there are no dice or picking, so the paragraph remains unchanged. A method that is not present reads as undefined; if(view.show) prevents calling that missing method. The button tells you that this stage draws once. Later the same caller works with the fuller returned object.

Read the call order: create the view once, register listeners once, then wait for user actions. pagehide releases the view when leaving the page. Run it and expect a lit tray, not a die yet. Change the tray dimensions one at a time, record the visible effect and restore them. Keep this page for the next lessons. Stop the server with Ctrl+C when finished.

```javascript file=scratch/table-probe.mjs
import { makeTable } from '../table3d.mjs';
const output = document.getElementById('picked');
const view = makeTable(document.getElementById('host'), function (index) {
  output.textContent = 'Picked die index ' + index;
});
document.getElementById('show').addEventListener('click', function () {
  if (view.show) view.show([6, 5, 4, 3, 2], [false, true, false, false, false], true);
  else output.textContent = 'This stage draws once; show arrives in the interaction lesson.';
});
window.addEventListener('pagehide', function () { view.dispose(); });
```

```check
run "node --check scratch/table-probe.mjs"
```

## Try it — Observe the boundary

Disable the light temporarily while using StandardMaterial. The surface becomes dark; geometry did not vanish. Restore the lights. Compare roughness 0.1 and 0.95 before restoring 0.95.



## Your turn — Bound the drawing density

Define solve(ratio) returning the device pixel ratio capped at 2. Assume a positive input. Explain why doubling pixel density in both dimensions uses four times as many pixels.

Write `practice/03-light-and-material.mjs` independently and export solve. Predict your cases before running. These checks establish the numeric contract, not visual rendering quality. Explain your design and add a case of your own.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict';import {solve} from './practice/03-light-and-material.mjs';assert.equal(solve(1),1);assert.equal(solve(1.5),1.5);assert.equal(solve(3),2);\""
```

```hints
nudge: Which input should change, 1.5 or 3?
concept: A cap limits the upper value without increasing smaller ones.
shape: Compare ratio with 2 and return the smaller.
```
