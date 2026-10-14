---
title: 9.2 — Put the scored face on top
runtime: none
---

### The story so far

A cube can be drawn. A game die must display the same result the rule engine scored.

### What this lesson builds

Map each die face to a direction, then rotate that direction upward.

## Name the six directions

A unit vector has length one and represents direction without distance. The six normals point outward from the cube faces. The face index selects its outward normal. A quaternion stores a rotation; we do not add its components like position coordinates. setFromUnitVectors constructs a rotation taking one unit direction to another. Applying that rotation takes the chosen face's outward normal to (0,1,0), upward. Opposite labels sum to seven in this layout.

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
