import * as THREE from 'three';
import { TRACK, COLORS, wrap } from './simulation.js';

export function createScene(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor('#b8d9e4');
  renderer.domElement.setAttribute('aria-label', 'Third-person view of Circuit Clash, a mountain circuit with four karts');
  renderer.domElement.setAttribute('role', 'img');
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#b8d9e4', 105, 370);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 650);
  const sun = new THREE.DirectionalLight('#ffedcd', 2.7);
  sun.position.set(60, 120, 80); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 100, bottom: -100, near: 1, far: 280 });
  sun.shadow.bias = -0.001;
  scene.add(sun, new THREE.HemisphereLight('#d4f3ff', '#718d6c', 2.4));
  const materials = new Map();
  function material(color, glow = false) {
    const key = `${color}/${glow}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8,
      ...(glow ? { emissive: color, emissiveIntensity: 0.65 } : {}) }));
    return materials.get(key);
  }
  function box(parent, x, y, z, sx, sy, sz, color, glow = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material(color, glow));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function ribbon(inner, outer, color, lift = 0) {
    const vertices = [];
    for (let i = 0; i < TRACK.length; i++) {
      const a = TRACK[i], b = TRACK[(i + 1) % TRACK.length];
      const at = (p, offset) => [p.x + Math.cos(p.yaw) * offset, p.y + lift, p.z - Math.sin(p.yaw) * offset];
      const p = at(a, inner), q = at(a, outer), r = at(b, inner), s = at(b, outer);
      vertices.push(...p, ...r, ...q, ...q, ...r, ...s);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    const mat = material(color).clone(); mat.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(geometry, mat); mesh.receiveShadow = true; scene.add(mesh);
  }
  ribbon(-11, 11, '#86ad77', -0.12);
  ribbon(-7, 7, '#37495d');
  ribbon(-7.15, -6.8, '#f7e6c5', 0.025);
  ribbon(6.8, 7.15, '#f7e6c5', 0.025);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), material('#73988b'));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -4; floor.receiveShadow = true; scene.add(floor);
  for (let i = 0; i < TRACK.length; i += 3) {
    const p = TRACK[i], group = new THREE.Group();
    group.position.set(p.x, p.y, p.z); group.rotation.y = p.yaw;
    scene.add(group);
    for (const side of [-1, 1]) box(group, side * 7.5, 0.1, 0, 0.8, 0.2, 2.1, i % 6 ? '#f9efdd' : '#ed806a');
    if (i % 6 === 0) box(group, 0, 0.025, 0, 0.14, 0.03, 1.2, '#92a4af');
    if (i % 18 === 0) {
      box(group, -9, -p.y / 2, 0, 0.8, p.y + 5, 1, '#697f84');
      box(group, 9, -p.y / 2, 0, 0.8, p.y + 5, 1, '#697f84');
    }
  }
  for (let i = 0; i < 20; i++) {
    const a = i * Math.PI * 2 / 20, radius = 190 + 20 * Math.sin(i * 8);
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(35 + i % 4 * 9, 45 + i % 5 * 12, 5), material(i % 2 ? '#8fa799' : '#719493'));
    mesh.position.set(Math.sin(a) * radius, 10, Math.cos(a) * radius); mesh.rotation.y = a; scene.add(mesh);
  }
  for (let i = 0; i < 100; i++) {
    const p = TRACK[(i * 17) % 360], side = i % 2 ? 1 : -1, offset = side * (14 + (i % 5) * 3);
    const group = new THREE.Group(); group.position.set(p.x + Math.cos(p.yaw) * offset, -3, p.z - Math.sin(p.yaw) * offset);
    const height = 7 + i % 5;
    box(group, 0, height / 3, 0, 0.5, height, 0.5, '#746f59');
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(3.2, height, 6), material(i % 2 ? '#3f786a' : '#56856b'));
    leaves.position.y = height; group.add(leaves); scene.add(group);
  }
  // A proper gantry and checker stripe make the start line legible from the chase camera.
  const start = new THREE.Group(), p = TRACK[0];
  start.position.set(p.x, p.y, p.z); start.rotation.y = p.yaw; scene.add(start);
  box(start, -8.2, 4, 0, 0.65, 8, 0.65, '#253b4a');
  box(start, 8.2, 4, 0, 0.65, 8, 0.65, '#253b4a');
  box(start, 0, 7.8, 0, 17, 1.2, 0.6, '#62f3c6', true);
  for (let i = 0; i < 14; i++) for (let j = 0; j < 2; j++) box(start, i - 6.5, 0.04, j - 0.5, 1, 0.04, 1, (i + j) % 2 ? '#f7f1dd' : '#253b4a');
  for (const index of [90, 180, 270]) {
    const p = TRACK[index], g = new THREE.Group(); g.position.set(p.x, p.y, p.z); g.rotation.y = p.yaw;
    for (const side of [-1, 1]) {
      box(g, side * 8.5, 2.5, 0, 0.35, 5, 0.35, '#ffd06b');
      box(g, side * 8, 4.5, 0, 1.4, 0.7, 0.3, '#ffd06b', true);
    }
    scene.add(g);
  }
  function kart(color) {
    const group = new THREE.Group();
    box(group, 0, 0.45, 0, 1.7, 0.5, 2.5, color);
    box(group, 0, 0.63, 1.05, 1.5, 0.24, 1, color);
    box(group, 0, 0.5, 1.6, 1.85, 0.22, 0.18, '#26343f');
    box(group, 0, 0.82, -0.25, 0.8, 0.7, 0.85, '#26343f');
    box(group, 0, 1.15, -1.2, 2, 0.13, 0.6, color);
    box(group, -0.65, 0.85, -1.2, 0.12, 0.65, 0.12, '#26343f');
    box(group, 0.65, 0.85, -1.2, 0.12, 0.65, 0.12, '#26343f');
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), material('#f9eed7'));
    head.position.set(0, 1.36, -0.15); group.add(head);
    box(group, 0, 1.36, 0.2, 0.58, 0.2, 0.23, '#284958');
    for (const x of [-1, 1]) for (const z of [-0.8, 0.85]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.35, 12), material('#24343c'));
      wheel.rotation.z = Math.PI / 2; wheel.position.set(x, 0.38, z); group.add(wheel);
      box(group, x * 1.18, 0.38, z, 0.06, 0.25, 0.25, '#b4c8ce');
    }
    const shield = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 12), new THREE.MeshBasicMaterial({ color: '#65ddff', transparent: true, opacity: 0.22, wireframe: true }));
    shield.position.y = 0.6; group.add(shield);
    const flame = box(group, 0, 0.4, -1.9, 0.6, 0.5, 1.4, '#ffbe55', true);
    group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(group); return { group, shield, flame };
  }
  const karts = COLORS.map(kart);
  const pickups = [35, 95, 155, 215, 275, 335].map(i => {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.15), material('#78f5db', true));
    mesh.position.set(TRACK[i].x, TRACK[i].y + 1.8, TRACK[i].z); scene.add(mesh); return mesh;
  });
  const dynamic = new Map();
  const bursts = Array.from({ length: 8 }, () => {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffb359', transparent: true, opacity: 0.7, wireframe: true }));
    mesh.visible = false; scene.add(mesh); return mesh;
  });
  const desired = new THREE.Vector3(), look = new THREE.Vector3();
  let initialized = false;
  const resize = () => {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  return {
    draw(race, menu = false) {
      for (const r of race.racers) {
        const k = karts[r.id]; k.group.position.set(r.x, r.y + 0.1, r.z); k.group.rotation.y = r.yaw;
        k.shield.visible = r.shield > 0; k.flame.visible = r.boost > 0;
        const a = TRACK[wrap(r.index + 1, 360)], b = TRACK[wrap(r.index - 1, 360)];
        k.group.rotation.x = -Math.atan2(a.y - b.y, Math.hypot(a.x - b.x, a.z - b.z));
      }
      pickups.forEach((m, i) => { m.visible = race.pickups[i].ready === 0; m.rotation.y = race.time * 2; });
      const live = new Set();
      for (const [kind, items] of [['shot', race.shots], ['mine', race.mines]]) for (const item of items) {
        const key = `${kind}${item.id}`; live.add(key);
        if (!dynamic.has(key)) {
          const mesh = new THREE.Mesh(kind === 'mine' ? new THREE.OctahedronGeometry(0.75) : new THREE.SphereGeometry(0.5, 8, 6), material(kind === 'mine' ? '#ff6777' : '#ffe580', true));
          scene.add(mesh); dynamic.set(key, mesh);
        }
        dynamic.get(key).position.set(item.x, item.y, item.z);
      }
      for (const [key, mesh] of dynamic) if (!live.has(key)) { scene.remove(mesh); mesh.geometry.dispose(); dynamic.delete(key); }
      bursts.forEach((mesh, i) => {
        const effect = race.effects[i]; mesh.visible = !!effect;
        if (effect) {
          mesh.position.set(effect.x, effect.y + 0.5, effect.z);
          mesh.scale.setScalar(1 + (0.5 - effect.ttl) * 5);
          mesh.material.color.set(effect.color); mesh.material.opacity = effect.ttl;
        }
      });
      const r = race.racers[0];
      const distance = menu ? 12 : 8.5;
      desired.set(r.x - Math.sin(r.yaw + (menu ? 0.65 : 0)) * distance, r.y + (menu ? 6 : 4.2), r.z - Math.cos(r.yaw + (menu ? 0.65 : 0)) * distance);
      if (!initialized || menu) { camera.position.copy(desired); initialized = true; }
      else camera.position.lerp(desired, 0.15);
      look.set(r.x + Math.sin(r.yaw) * 7, r.y + 1.1, r.z + Math.cos(r.yaw) * 7);
      camera.lookAt(look); renderer.render(scene, camera);
    },
    dispose() {
      observer.disconnect();
      const geometries = new Set(), mats = new Set();
      scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) mats.add(o.material); });
      geometries.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); materials.forEach(m => m.dispose());
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
