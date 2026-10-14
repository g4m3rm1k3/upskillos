---
title: 9.3 — Light the table
runtime: none
---

### The story so far

Continue the renderer in table3d.mjs. Intermediate versions draw only when called; the host is connected in the next lesson.

### What this lesson builds

Explain the new rendering boundary and preserve the game's authoritative result.

## Extend the renderer

HemisphereLight provides different sky and ground colors; its third argument is intensity. DirectionalLight models parallel rays from its position toward its target. MeshStandardMaterial responds to light: color sets the surface tint, roughness controls the spread of reflections. Shadow rendering needs both the renderer switch and castShadow/receiveShadow on appropriate objects. BoxGeometry(9,0.18,4) makes a shallow tray. position.y lowers it below the dice. setPixelRatio caps the drawing cost on high-density displays. alpha:true lets the canvas background be transparent. The temporary fixed-size draw is replaced by the resize/animation loop later.

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
  return { dispose() { renderer.dispose(); renderer.domElement.remove(); } };
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

## Try it — Observe the boundary

Disable the light temporarily while using StandardMaterial. The surface becomes dark; geometry did not vanish. Restore the lights. Compare roughness 0.1 and 0.95 before restoring 0.95.



## Your turn — Normalize a pointer

Define solve(clientX,left,width) mapping the canvas's left edge to -1, center to 0, right edge to 1. Export the function as solve.

Write practice/03-light-and-material.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/03-light-and-material.mjs'; if (!(solve(100,100,200)===-1 && solve(200,100,200)===0 && solve(300,100,200)===1)) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Which coordinate origin does the event use?
concept: Subtract the canvas offset before scaling.
shape: Translate, divide by width, scale by two and subtract one.
```
