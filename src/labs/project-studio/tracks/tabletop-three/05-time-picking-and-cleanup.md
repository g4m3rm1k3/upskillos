---
title: 9.5 — Time, picking and cleanup
runtime: none
---

### The story so far

Continue the renderer in table3d.mjs. Use the scratch table page to observe each intermediate renderer before integrating it into the game.

### What this lesson builds

Explain the new rendering boundary and preserve the game's authoritative result.

## Pick and resize before animating {#pick-and-resize}

A click arrives in page coordinates, but a raycaster expects canvas-relative normalized coordinates. getBoundingClientRect gives the canvas's left/top/width/height. Subtract the origin, divide by its size, then map x from [0,1] to [-1,1]. y is flipped because browser y grows downward but camera y grows upward. At the canvas center both coordinates become zero. Vector2 stores that pair.

setFromCamera constructs a ray from the camera through the pointer. intersectObjects(dice,true) also checks descendants; returned hits are nearest first. A nonempty list lets us read hits[0].object.userData.index and call onPick. A click outside the dice has no hit and should not change game state. We register this listener once.

ResizeObserver invokes a callback when host dimensions change. setSize(width,height,false) resizes the drawing buffer without rewriting CSS sizes. camera.aspect becomes width/height; updateProjectionMatrix applies the changed camera setting. Render again after resizing. The show method here snaps to the requested orientations and draws once. Dispose disconnects the observer and listener as well as GPU resources. No animation loop exists yet.

Run the scratch page, click a visible die and confirm its zero-based index. Resize the page and verify proportions. Click Show to snap to the fixed hand. Only after these work add the animation loop in the next step.

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
  const raycaster = new THREE.Raycaster();
  function pick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(2 * (event.clientX - rect.left) / rect.width - 1,
      1 - 2 * (event.clientY - rect.top) / rect.height);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(dice, true);
    if (hits.length) onPick(hits[0].object.userData.index);
  }
  renderer.domElement.addEventListener('click', pick);
  const resize = new ResizeObserver(function () {
    const width = host.clientWidth;
    const height = host.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  });
  resize.observe(host);
  renderer.render(scene, camera);
  return {
    show(faces, held, animate = false) {
      for (let i = 0; i < dice.length; i += 1) {
        dice[i].visible = i < faces.length;
        targets[i] = faceRotation(faces[i] ?? 1);
        dice[i].children[0].material.emissive.setHex(held[i] ? 0x574114 : 0);
        dice[i].quaternion.copy(targets[i]);
      }
      renderer.render(scene, camera);
    },
    dispose() {
      resize.disconnect();
      renderer.domElement.removeEventListener('click', pick);
      scene.traverse(function (object) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
```

```check
run "node --check table3d.mjs"
```

## Extend the renderer

The preceding step added selection and resizing without animation. Now add a draw loop and a show method. requestAnimationFrame schedules one callback before a future browser paint; it does not repeat automatically. Store the returned id in frame so dispose can cancel it. draw schedules its own next call at the end. The callback receives a millisecond timestamp; subtract last, divide by 1000 for seconds and cap at .1 to prevent an enormous jump after a paused tab.

slerp moves a quaternion partway toward a target rotation. A fraction 0 leaves it unchanged; 1 reaches the target. `1 - Math.exp(-12 * seconds)` chooses the fraction from elapsed time. exp(x) means e raised to x, where e is approximately 2.71828. At 1/60 second it gives about .181; at 1/30 it gives about .330. Two short frames leave roughly the same remaining gap as one long frame. The constant 12 controls response speed; this is visual easing, not simulated dice physics.

show hides meshes beyond faces.length, chooses the already-scored faceRotation, and sets held tint through the body's emissive material color. children[0] is the body because we added it first. setHex accepts a hexadecimal color number. matchMedia(...).matches reads the reduced-motion preference. If animate is requested, the die is not held and motion is allowed, start from an Euler rotation (2,3,1 radians); otherwise copy the final quaternion immediately. Euler angles describe turns around axes; the earlier degrees-to-radians exercise explains their unit. We do not pick a second random result.

The returned object exposes only show and dispose. dispose cancels the animation, disconnects observation, removes the click listener, traverses allocated geometry/materials for GPU disposal, disposes the renderer and removes its canvas. Each cleanup mirrors a setup operation. Methods close over resources; we do not need a wrapper class to achieve this ownership.

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
  const raycaster = new THREE.Raycaster();
  function pick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(2 * (event.clientX - rect.left) / rect.width - 1,
      1 - 2 * (event.clientY - rect.top) / rect.height);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(dice, true);
    if (hits.length) onPick(hits[0].object.userData.index);
  }
  renderer.domElement.addEventListener('click', pick);
  const resize = new ResizeObserver(function () {
    const width = host.clientWidth;
    const height = host.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  resize.observe(host);
  let last = 0;
  let frame;
  function draw(time) {
    const seconds = Math.min((time - last) / 1000, 0.1);
    last = time;
    for (let i = 0; i < dice.length; i += 1) dice[i].quaternion.slerp(targets[i], 1 - Math.exp(-12 * seconds));
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);
  return {
    show(faces, held, animate = false) {
      for (let i = 0; i < dice.length; i += 1) {
        dice[i].visible = i < faces.length;
        targets[i] = faceRotation(faces[i] ?? 1);
        dice[i].children[0].material.emissive.setHex(held[i] ? 0x574114 : 0);
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (animate && !held[i] && !reduced) dice[i].quaternion.setFromEuler(new THREE.Euler(2, 3, 1));
        else dice[i].quaternion.copy(targets[i]);
      }
    },
    dispose() {
      cancelAnimationFrame(frame);
      resize.disconnect();
      renderer.domElement.removeEventListener('click', pick);
      scene.traverse(function (object) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
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


**Explore, then restore:** Refresh the scratch table, click Show and compare the top faces with 6,5,4,3,2. The second die should get a held tint and snap rather than tumble. Emulate reduced motion and repeat: faces must still be correct. Change only the easing rate 12 to 3 and observe a slower approach; restore 12.

## Try it — Observe the boundary

Enable 3D after the next integration step, resize the window, then switch 3D off and on repeatedly. Confirm one canvas exists and the keyboard dice controls still work. Emulate reduced motion: the final face must remain correct without tumbling.



## Your turn — Normalize a pointer

Define solve(clientX,left,width) mapping the canvas's left edge to -1, center to 0, right edge to 1. Export the function as solve.

Write practice/05-time-picking-and-cleanup.mjs independently. Try before opening hints. Keep the guided game intact. The checks establish the listed examples, not every possible input or the quality of your explanation. Record the observed result, explain its cause, and add a new case you chose.



```check
run "node --input-type=module -e \"import {solve} from './practice/05-time-picking-and-cleanup.mjs'; if (!(solve(100,100,200)===-1 && solve(200,100,200)===0 && solve(300,100,200)===1)) throw Error('Independent case failed'); console.log('PASS');\"" stdout="PASS"
```

```hints
nudge: Which coordinate origin does the event use?
concept: Subtract the canvas offset before scaling.
shape: Translate, divide by width, scale by two and subtract one.
```
