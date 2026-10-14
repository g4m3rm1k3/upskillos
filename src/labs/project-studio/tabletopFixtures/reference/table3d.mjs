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
