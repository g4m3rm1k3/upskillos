---
title: 9.4 — Assemble dice from reusable parts
runtime: none
---

### The story so far

Continue the renderer in table3d.mjs. Intermediate versions draw only when called; the host is connected in the next lesson.

### What this lesson builds

Explain the new rendering boundary and preserve the game's authoritative result.

## Extend the renderer

Group collects child objects so they transform together. Each die owns a body and six side groups. CircleGeometry(radius,segments) makes a flat pip in its local xy plane. A side's normal determines its position just beyond the cube surface and its rotation from the default +z normal. copy copies vector components; multiplyScalar scales them. Small local pip coordinates are transformed by their parent group. traverse visits all descendants; userData stores the die index for picking. These meshes share an interpretation with SVG pip data, but have separate GPU geometry and materials.

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
  const dice = [];
  const targets = [];
  for (let i = 0; i < 5; i += 1) {
    const group = new THREE.Group();
    group.position.x = (i - 2) * 1.55;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xfff4de, roughness: 0.3 }));
    body.castShadow = true;
    group.add(body);
    for (let face = 1; face <= 6; face += 1) {
      const side = new THREE.Group();
      const normal = new THREE.Vector3(...normals[face - 1]);
      side.position.copy(normal).multiplyScalar(0.506);
      side.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      for (const [x, y] of pips[face]) {
        const pip = new THREE.Mesh(new THREE.CircleGeometry(0.065, 12), new THREE.MeshStandardMaterial({ color: 0x16362e }));
        pip.position.set(x * 0.25, y * 0.25, 0);
        side.add(pip);
      }
      group.add(side);
    }
    group.traverse(function (object) { object.userData.index = i; });
    scene.add(group);
    dice.push(group);
    targets.push(faceRotation(1));
  }
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

Set the side distance to 0.5 instead of 0.506. Coplanar surfaces may flicker (z-fighting). Restore the small offset and explain why it helps. This is a rendering issue, not a scoring change.



## Your turn — Normalize a pointer

Define solve(clientX,left,width) mapping the canvas's left edge to -1, center to 0, right edge to 1. Export the function as solve.

Write practice/04-assemble-the-dice.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/04-assemble-the-dice.mjs'; if (!(solve(100,100,200)===-1 && solve(200,100,200)===0 && solve(300,100,200)===1)) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Which coordinate origin does the event use?
concept: Subtract the canvas offset before scaling.
shape: Translate, divide by width, scale by two and subtract one.
```
