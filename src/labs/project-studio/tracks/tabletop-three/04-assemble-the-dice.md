---
title: 9.4 — Assemble dice from reusable parts
runtime: none
---

### The story so far

Continue the renderer in table3d.mjs. Use the scratch table page to observe each intermediate renderer before integrating it into the game.

### What this lesson builds

Explain the new rendering boundary and preserve the game's authoritative result.

## Place unmarked die bodies {#die-bodies}

Reuse the tray from the last lesson. Add the outer five-iteration loop with a Group and a unit cube per iteration; pips are deliberately absent. A group is a transform parent, even with one child. body.castShadow allows that cube to cast onto the receiving tray. Push each group into dice and an identity-facing target into targets.

Refresh the scratch table page. Expect five ivory cubes on the tray. Before changing spacing, calculate all five x coordinates. Try changing i-2 to i: all centers move to the right instead of straddling zero. Restore i-2. Once this is understood, add the side and pip loops in the next step.

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
    group.traverse(function (object) { object.userData.index = i; });
    scene.add(group);
    dice.push(group);
    targets.push(faceRotation(1));
  }
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

```check
run "node --check table3d.mjs"
```

## Extend the renderer

A die is a Group containing a cube body and six side groups. Moving or rotating the parent transforms all its children together. group.position.x=(i-2)*1.55 places five centers at -3.1,-1.55,0,1.55,3.1. These are scene units, not CSS pixels. Each new Group is a separate instance.

A side starts in its own xy plane, facing +z. Copy its normal into side.position and multiply by 0.506 to put it just outside the cube, whose half-width is 0.5. copy copies components; assigning one vector variable to another would alias an object. multiplyScalar changes the copied vector in place. setFromUnitVectors rotates the side's original +z direction into the desired face normal. These transformations use the mapping tested in the previous lesson.

For each [x,y] pip pair, destructuring names the two local offsets. CircleGeometry(0.065,12) uses radius .065 and twelve segments to approximate a circle. Multiplying offsets by .25 makes the 3×3 pip pattern fit the side. Adding each pip to side, and side to group, preserves their local coordinate relationships. A separate material per pip is simple to understand here; later optimization could share resources with an explicit ownership policy.

traverse visits the group and descendants. userData is a library-provided object for application metadata; assigning index to each descendant lets a ray hit on either body or pip identify the same die. Push the group into dice and its target rotation into targets so both arrays use the same index.

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


**Explore, then restore:** Refresh /scratch/table-probe.html: expect five cubes with pips. Change the spacing to 2 and predict the outer positions; restore 1.55. Temporarily remove one side.add(pip) and observe missing pips on that face; restore it. Identify which parent transform moves an entire die versus a single face.

## Try it — Observe the boundary

Set the side distance to 0.5 instead of 0.506. Coplanar surfaces may flicker (z-fighting). Restore the small offset and explain why it helps. This is a rendering issue, not a scoring change.



## Your turn — Center a row of objects

Define solve(count, spacing) returning a new array of x positions centered on zero. Assume count is a positive integer. For count 3 and spacing 2 return [-2,0,2]; for count 1 return [0]. Generalize the five-die formula using midpoint index (count-1)/2.

Write `practice/04-assemble-the-dice.mjs` independently and export solve. Predict your cases before running. These checks establish the numeric contract, not visual rendering quality. Explain your design and add a case of your own.

```check
run "node --input-type=module -e \"import assert from 'node:assert/strict';import {solve} from './practice/04-assemble-the-dice.mjs';assert.deepEqual(solve(3,2),[-2,0,2]);assert.deepEqual(solve(1,2),[0]);assert.deepEqual(solve(2,2),[-1,1]);\""
```

```hints
nudge: Where is the midpoint between the first and last index?
concept: Subtract that midpoint before multiplying by the gap.
shape: Loop across count positions and append each centered coordinate to a new array.
```
