---
title: 9.2 — Put the scored face on top
runtime: none
---

### The story so far

A cube can be drawn. A game die must display the same result the rule engine scored.

### What this lesson builds

Map each die face to a direction, then rotate that direction upward.

## Name the six directions

Put a real box on the desk. Its top points up (0,1,0), bottom down (0,-1,0), right (1,0,0), left (-1,0,0), and the remaining faces along ±z. These are **normals**: directions perpendicular to a face. Their length is one, so they carry direction without distance. The length of a vector (x,y,z) is the square root of x²+y²+z²; (1,0,0) therefore has length 1.

The ordered normals array assigns labels 1–6 to those directions. Face labels start at one but arrays start at zero, so read normals[face-1]. Spread expands the three stored numbers into Vector3(x,y,z) arguments. A quaternion is a rotation representation with four components. We use the library's operation rather than treating those components as positions: setFromUnitVectors(source,target) constructs a rotation carrying one unit direction to the other. Its return value is that quaternion, enabling the chained return.

For face 1, source already equals up and the rotation is identity. For face 6, source is down, requiring a half-turn. For face 2, source is right, requiring a quarter-turn toward up. The chosen face comes from the rule model; this function must not sample another die. Learn the input/output contract now; deriving quaternion algebra is not required to use this operation correctly.

```javascript file=table3d.mjs
import * as THREE from 'three';
import { pips } from './svg.mjs';

export const normals = [[0, 1, 0], [1, 0, 0], [0, 0, 1], [0, 0, -1], [-1, 0, 0], [0, -1, 0]];
export function faceRotation(face) {
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...normals[face - 1]), new THREE.Vector3(0, 1, 0));
}
```

For face 1 the input direction is already up, so no rotation is needed. For face 6 it points down and must turn halfway around. Use an actual cube or sketch to predict faces 2 and 5. This is a geometric mapping, not a second die roll.

The syntax check establishes that this file parses. It does not execute imports or prove the rule. Run the behavioral checks where supplied and add a case of your own.

```check
run "node --check table3d.mjs"
```

```predict
question: Should animation choose a new random final face?
choice: No
choice: Yes
answer: No
explain: The game has already chosen the face. Animation presents it.
```


**Explore, then restore:** Sketch faces 2 and 5 rotating upward, then use the numeric probe below for all six faces. Try normals[face] instead of normals[face-1] and explain the failed face-6 lookup. Restore the offset.

## Verify all six directions numerically {#rotation-probe}

A visible cube can hide a wrong side label, so test the direction mapping directly. Vector3.clone makes a separate vector; applyQuaternion rotates that copy. distanceTo measures Euclidean distance between two points/vectors. Require distance below 1e-10 because floating-point rotation arithmetic can introduce tiny rounding error. The 1e-10 notation means one ten-billionth, not an exact-equality comparison.

Run node scratch/check-rotation.mjs. All six transformed normals must be close to up. Temporarily change the target direction in faceRotation to (0,0,1); predict failure, observe it, then restore up. This establishes orientation math, not whether the pips have been drawn on the correct surfaces.

```javascript file=scratch/check-rotation.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { normals, faceRotation } from '../table3d.mjs';
const up = new THREE.Vector3(0, 1, 0);
for (let face = 1; face <= 6; face += 1) {
  const normal = new THREE.Vector3(...normals[face - 1]);
  const rotated = normal.clone().applyQuaternion(faceRotation(face));
  assert.ok(rotated.distanceTo(up) < 1e-10);
}
console.log('PASS all six faces point upward');
```

```check
run "node scratch/check-rotation.mjs" stdout="PASS all six faces point upward"
```

## Try it — Rotate the wrong normal

On paper use normals[face] instead of normals[face-1]. Face 1 now selects the direction for face 2, and face 6 is out of range. Keep the correct offset. Test every face, not only the starting orientation.



## Your turn — Convert degrees to radians

Three.js Euler angles use radians. One full turn is 360 degrees or 2π radians. Define solve(degrees) returning degrees times π divided by 180. Math.PI is the standard π constant. Export the function as solve.

Write practice/02-orient-a-face.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/02-orient-a-face.mjs'; if (!(Math.abs(solve(180)-Math.PI)<1e-12 && Math.abs(solve(90)-Math.PI/2)<1e-12)) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Use the full-turn equivalence.
concept: 180 degrees equals π radians.
shape: Multiply by π/180.
```
