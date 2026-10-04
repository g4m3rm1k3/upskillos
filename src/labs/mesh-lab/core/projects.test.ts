import { traceReplay } from '../../../engines/mesh/core/logReplay';
import { beforeAll, describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { loadPyodide } from 'pyodide';
import { Editor } from '../../../engines/mesh/core/Editor';
import { EditMesh } from '../../../engines/mesh/core/EditMesh';
import { runScript } from '../../../engines/mesh/core/api';
import { checkQuiz } from '../../../engines/mesh/core/trace';
import { skinSource, skinnedSource } from '../../../engines/mesh/core/evaluate';
import { PROJECTS, PROJECT_GROUPS, openProject, startState, stepText } from './projects';
import { sampleKeys } from '../../../engines/mesh/core/animation';
import type { PyodideLike } from '../../../engines/mesh/core/python';

let py: PyodideLike;
beforeAll(async () => { py = (await loadPyodide()) as unknown as PyodideLike; }, 60000);

describe('example projects', () => {
  it('have unique ids, known groups and a guide', () => {
    expect(new Set(PROJECTS.map((p) => p.id)).size).toBe(PROJECTS.length);
    for (const p of PROJECTS) { expect(PROJECT_GROUPS).toContain(p.group); expect(p.guide.length).toBeGreaterThanOrEqual(3); }
  });

  for (const p of PROJECTS) {
    it(`"${p.title}" builds without errors and its setup points at real things`, () => {
      const e = new Editor();
      const r = openProject(e, p, py);
      expect(r.error, r.output.join('\n')).toBeNull();
      if (p.setup.select) expect(e.activeObject?.name).toBe(p.setup.select);
      expect(e.scene.get('Cube')).toBeUndefined();
      expect(e.undoStack.length).toBe(1); // one undo step takes the whole build back
      for (const o of e.scene.objects) if (o.mesh) expect(o.mesh.validate()).toEqual([]);
    });
  }
});

describe('what the projects claim', () => {
  const open = (id: string) => { const e = new Editor(); const r = openProject(e, PROJECTS.find((p) => p.id === id)!, py); return { e, r }; };

  it('the bouncing ball follows the gravity parabola exactly between keys', () => {
    const { e } = open('bouncing-ball');
    const keys = e.scene.get('Ball')!.anim!.position!;
    // The first fall: from the top key (rest) to the first bounce, y = top − (top − y₁)·t², t the fraction of the time.
    const [k0, k1] = keys;
    for (let f = k0.frame + 1; f < k1.frame; f++) {
      const t = (f - k0.frame) / (k1.frame - k0.frame);
      expect(sampleKeys(keys, f).value[1]).toBeCloseTo(k0.value[1] - (k0.value[1] - k1.value[1]) * t * t, 12);
    }
    // Falling 3 m under g = 9.8 takes √(2·3/9.8) s = 0.78 s = 19 frames at 24 fps.
    expect(k1.frame - k0.frame).toBe(19);
  });

  it('the curvature gallery prints Gauss–Bonnet: 4π for the sphere, 0 for the torus', () => {
    const { r } = open('curvature-gallery');
    expect(r.output.find((l) => l.startsWith('Sphere'))).toMatch(/Σ K·area = 4\.000000π\s+χ = 2/);
    expect(r.output.find((l) => l.startsWith('Torus'))).toMatch(/= -?0\.000000π\s+χ = 0/);
  });

  it('smoothing flattens the curvature spread and shrinks the volume', () => {
    const { r } = open('smoothing');
    const parse = (name: string) => { const m = r.output.find((l) => l.startsWith(name))!.match(/volume ([\d.]+) .* ± ([\d.]+)/)!; return { vol: +m[1], spread: +m[2] }; };
    const a = parse('Bumpy'), b = parse('Smoothed ×5'), c = parse('Smoothed ×40');
    expect(b.spread).toBeLessThan(a.spread / 3);
    expect(c.vol).toBeLessThan(b.vol); expect(b.vol).toBeLessThan(a.vol);
  });

  it('the knot is one closed tube and shows distance from vertex 0', () => {
    const { e } = open('knot-distance');
    expect(e.field?.spec).toEqual({ kind: 'geodesic', sources: [0] });
    expect(e.scene.get('Trefoil')!.mesh!.stats().closed).toBe(true);
    expect(e.trace?.op).toBe('Heat method');
  });

  it('the candy wrapper: at the full twist the linear tube pinches, the dual-quaternion one stays round', async () => {
    const { skinnedSource } = await import('../../../engines/mesh/core/evaluate');
    const { e } = open('candy-wrapper');
    e.setFrame(36);
    const mid = (name: string) => {
      const o = e.scene.get(name)!, v = skinnedSource(e.scene, o).verts;
      return Array.from({ length: 16 }, (_, j) => 8 * 16 + j).reduce((s, i) => s + Math.hypot(v[i][0], v[i][2]), 0) / 16;
    };
    expect(mid('Linear blend')).toBeLessThan(0.5 * 0.25);
    expect(mid('Dual quaternion')).toBeGreaterThan(0.9 * 0.25);
    for (const n of ['Linear blend', 'Dual quaternion']) { const s = e.scene.get(n)!.mesh!.stats(); expect(s.closed).toBe(true); expect(s.volume).toBeGreaterThan(0); }
  });

  it('fix a bad rig: opens painting the spine, and painting the chest stops the arm dragging it', async () => {
    const { skinnedSource, skinSource } = await import('../../../engines/mesh/core/evaluate');
    const { e } = open('fix-a-bad-rig');
    expect(e.mode).toBe('weight'); expect(e.activeBone).toBe('Spine'); expect(e.frame).toBe(24);
    const body = () => e.scene.get('Character')!;
    const src = skinSource(body()).verts;
    const chest = src.map((v, i) => [v, i] as const).filter(([v]) => v[0] > 0.2 && v[0] < 0.65 && v[1] > 0.8 && v[1] < 1.25).map(([, i]) => i);
    const drift = () => { const p = skinnedSource(e.scene, body()).verts; return chest.reduce((s, i) => s + Math.hypot(p[i][0] - src[i][0], p[i][1] - src[i][1], p[i][2] - src[i][2]), 0) / chest.length; };
    const before = drift();
    const pos = skinnedSource(e.scene, body()).verts;
    e.paint = { ...e.paint, brush: 'draw', value: 1, strength: 0.8, radius: 0.35 };
    e.beginStroke(); for (const i of chest) e.strokeDab(pos[i]); e.endStroke();
    expect(drift()).toBeLessThan(before * 0.5); // the chest stays nearly where it rests
  });

  it('the tentacle: rolling a bone 90° turns its bending plane from forward to sideways', async () => {
    const { posedEnds } = await import('../../../engines/mesh/core/armature');
    const { e } = open('tentacle');
    e.setFrame(13);                                   // Seg 1 at a full swing
    const tip = () => posedEnds(e.scene.get('Tentacle rig')!.bones!).get('Seg 1')!.tail;
    const a = tip();
    expect(Math.abs(a[2])).toBeGreaterThan(0.2); expect(Math.abs(a[0])).toBeLessThan(1e-9);   // swings in z
    e.enterBoneEdit(); e.setBone('Seg 1', { roll: Math.PI / 2 }); e.exitBoneEdit();
    e.setFrame(13);
    const b = tip();
    expect(Math.abs(b[0])).toBeCloseTo(Math.abs(a[2]), 9); expect(Math.abs(b[2])).toBeLessThan(1e-9); // same swing, now in x
  });

  it('the robot gripper moves only because its parents turn', () => {
    const { e } = open('robot-arm');
    const g = e.scene.get('Gripper')!;
    expect(g.anim).toBeUndefined();
    const at = (f: number) => e.scene.worldMatrixAt(g, f).elements.slice(12, 15);
    expect(Math.hypot(...at(1).map((x, i) => x - at(45)[i]))).toBeGreaterThan(1);
    // The block is carried: at the gripper while held, left where it was let go.
    const b = e.scene.get('Block')!;
    const bAt = (f: number) => e.scene.worldMatrixAt(b, f).elements.slice(12, 15);
    for (const f of [45, 60, 75, 90, 105]) expect(Math.hypot(...bAt(f).map((x, i) => x - at(f)[i]))).toBeLessThan(1e-9);
    expect(bAt(120)).toEqual(bAt(105));
    expect(Math.hypot(...bAt(105).map((x, i) => x - bAt(45)[i]))).toBeGreaterThan(1);
  });
});

describe('bone edit mode shows the rest pose', () => {
  it('while the tentacle rig is edited the tentacle is straight; leaving puts the pose back', async () => {
    const { skinnedSource, skinSource } = await import('../../../engines/mesh/core/evaluate');
    const e = new Editor();
    openProject(e, PROJECTS.find((p) => p.id === 'tentacle')!, py);
    e.setFrame(13);
    const t = () => e.scene.get('Tentacle')!;
    const moved = () => { const a = skinnedSource(e.scene, t()).verts, b = skinSource(t()).verts; return Math.max(...a.map((v, i) => Math.hypot(v[0] - b[i][0], v[1] - b[i][1], v[2] - b[i][2]))); };
    expect(moved()).toBeGreaterThan(0.3);
    e.enterBoneEdit();
    expect(moved()).toBe(0);
    e.exitBoneEdit();
    expect(moved()).toBeGreaterThan(0.3);
  });
});

describe('UV and material projects', () => {
  const open = (id: string) => { const e = new Editor(); const r = openProject(e, PROJECTS.find((p) => p.id === id)!, py); return { e, r }; };

  it('the fly-through loops: frame 241 is frame 1, and the camera always looks at the peak', () => {
    const { e, r } = open('island-flythrough');
    expect(r.output.at(-1)).toBe('Camera keyed every 6 frames: 41 keys; the scene camera is Camera');
    const cam = e.scene.get('Camera')!;
    expect(e.scene.activeCamera).toBe(cam.id);
    expect(cam.anim!.rotationMode).toBe('quaternion');
    const at = (f: number) => e.scene.worldMatrixAt(cam, f);
    const pos = (f: number) => at(f).elements.slice(12, 15);
    pos(241).forEach((x, i) => expect(x).toBeCloseTo(pos(1)[i], 9));
    // Between keys too, −z points close to the peak (slerp between two aimed rotations stays near aimed).
    for (const f of [1, 4, 100, 157, 238]) {
      const m = at(f).elements, look = [-m[8], -m[9], -m[10]], p = pos(f);
      const to = [0 - p[0], 1.2 - p[1], 0 - p[2]], n = Math.hypot(...to);
      const cos = (look[0] * to[0] + look[1] * to[1] + look[2] * to[2]) / n;
      expect(cos).toBeGreaterThan(0.999);
    }
  });

  it('winding and normals: face 2 is turned out by a traced flip (its question is the reversed normal); face 3 still points in', () => {
    const { e, r } = open('winding-and-normals');
    // The script logs every face's normal before the flip: faces 2 and 3 point into the pyramid.
    expect(r.output).toEqual(['face 0 normal 0, -1, 0', 'face 1 normal 0, 0.55, -0.83', 'face 2 normal -0.83, -0.55, 0', 'face 3 normal 0, -0.55, -0.83', 'face 4 normal -0.83, 0.55, 0']);
    const m = e.scene.get('Pyramid')!.mesh!, centre = [0, 0.3, 0];
    const out = (i: number) => { const n = m.faceNormal(i), c = m.faceCenter(i); return n[0] * (c[0] - centre[0]) + n[1] * (c[1] - centre[1]) + n[2] * (c[2] - centre[2]) > 0; };
    expect([0, 1, 2, 3, 4].map(out)).toEqual([true, true, true, false, true]);
    expect(m.faces[2]).toEqual([4, 2, 1]);
    expect(e.trace?.op).toBe('Flip normals');
    const q = e.trace!.steps.find((x) => x.quiz)!.quiz!;
    q.answer.forEach((a, i) => expect(a).toBeCloseTo(m.faceNormal(2)[i], 12));
    expect(q.answer.map((x) => +x.toFixed(2))).toEqual([0.83, 0.55, 0]);
  });

  it('edges and neighbours: the table of the open box, rebuilt by a traced edgeTable() that asks twice', () => {
    const { e, r } = open('edges-and-neighbours');
    expect(r.output).toEqual([
      'edge 0-4: faces 0, 2', 'edge 4-6: faces 0, 4', 'edge 2-6: faces 0', 'edge 0-2: faces 0, 3',
      'edge 1-3: faces 1, 3', 'edge 3-7: faces 1', 'edge 5-7: faces 1, 4', 'edge 1-5: faces 1, 2',
      'edge 0-1: faces 2, 3', 'edge 4-5: faces 2, 4', 'edge 2-3: faces 3', 'edge 6-7: faces 4',
      '12 edges, 4 open: 2-6, 3-7, 2-3, 6-7',
    ]);
    expect(e.trace?.op).toBe('Edge table');
    expect(e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!.answer)).toEqual([[2, 9], [4, 0]]);
    const m = e.scene.get('Open box')!.mesh!;
    // Neighbours: the bottom (face 2) has four; each side has three and one open edge (-1).
    expect(m.neighbours(2)).toEqual([3, 1, 4, 0]);
    expect([0, 1, 3, 4].map((f) => m.neighbours(f).filter((x) => x < 0).length)).toEqual([1, 1, 1, 1]);
  });

  it('connected pieces: three pieces by shared edges; the trace asks the first piece\'s size, then the queue', () => {
    const { e, r } = open('connected-pieces');
    expect(r.output).toEqual(['23 vertices, 18 faces', 'piece 1: faces 0, 2, 5, 3, 4, 1', 'piece 2: faces 6, 8, 11, 9, 10, 7', 'piece 3: faces 12, 14, 17, 15, 16, 13']);
    expect(e.trace?.op).toBe('Pieces');
    const asked = e.trace!.steps.filter((x) => x.quiz);
    expect(asked.map((x) => x.label)).toEqual(['Piece 1: visit face 0, queue 2, 5, 3, 4; queue now 2, 5, 3, 4', 'Piece 1: visit face 2, queue 1; queue now 5, 3, 4, 1']);
    expect(asked.map((x) => x.quiz!.answer)).toEqual([[6], [4]]);
    expect(e.trace!.steps.filter((x) => x.phase === 'Piece done')).toHaveLength(3);
  });

  it("Euler's formula: 2, 2, 0, 1; the traced count asks for χ, then the genus", () => {
    const { e, r } = open('eulers-formula');
    expect(r.output).toEqual(['Closed cube: V − E + F = 8 − 12 + 6 = 2', 'Sphere: V − E + F = 114 − 240 + 128 = 2', 'Torus: V − E + F = 96 − 192 + 96 = 0', 'Open box: V − E + F = 8 − 12 + 5 = 1', 'Torus: 0 boundary loops, genus 1']);
    expect(e.trace?.op).toBe('Euler characteristic');
    expect(e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!.answer)).toEqual([[0], [1]]);
    expect(e.scene.get('Open box')!.mesh!.topology()).toMatchObject({ chi: 1, boundaryLoops: 1, genus: 0 });
  });

  it('welding and filling: 20 → 8 vertices by spatial hash, a question across a cell wall', () => {
    const { e, r } = open('welding-and-filling');
    expect(r.output).toEqual(['as scanned: 20 vertices, 20 open edges, 5 pieces', 'weld(0): 20 vertices', 'weld(0.001): 8 vertices, 4 open edges, 1 piece']);
    expect(e.trace?.op).toBe('Merge by distance');
    const asked = e.trace!.steps.filter((x) => x.quiz);
    expect(asked).toHaveLength(1);
    expect(asked[0].label).toMatch(/in a neighbouring cell, so it becomes \d+$/);
    expect(e.trace!.steps.at(-1)!.label).toBe('12 vertices merged: 20 → 8; faces repointed');
  });

  it('OBJ files: 1-based lines become 0-based faces, the trace asks for the first face, and it writes back', () => {
    const { e, r } = open('obj-files');
    expect(r.output[0]).toBe('read: 5 vertices, 5 faces: [[0,1,2,3],[1,0,4],[2,1,4],[3,2,4],[0,3,4]]');
    expect(r.output[1].split('\n')).toEqual(['o Pyramid', 'v -1 0 -1', 'v 1 0 -1', 'v 1 0 1', 'v -1 0 1', 'v 0 1.5 0', 's off', 'f 1 2 3 4', 'f 2 1 5', 'f 3 2 5', 'f 4 3 5', 'f 1 4 5', '']);
    expect(e.trace?.op).toBe('Read OBJ');
    const q = e.trace!.steps.find((x) => x.quiz)!;
    expect(q.label).toBe('line 8: f 1 2 3 4 → face 0: 0, 1, 2, 3');
    expect(q.quiz!.answer).toEqual([0, 1, 2, 3]);
  });

  it('vectors, dot and cross: the base corner of the pyramid, measured and traced', () => {
    const { e, r } = open('vectors-dot-cross');
    expect(r.output).toEqual(['u = 2, 0, 0    v = 1, 1.5, 1', '|u| = 2   |v| = 2.0616   u · v = 2   angle 60.98°', 'u × v = 0, -2, 3   triangle area 1.8028']);
    expect(e.trace?.op).toBe('Measure angle');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Vectors', 'Lengths', 'Dot product', 'Angle', 'Cross product']);
    const qs = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(checkQuiz(qs[0], [2]).correct).toBe(true);
    expect(checkQuiz(qs[1], [61]).correct).toBe(true);    // 60.98° to the nearest degree
    expect(checkQuiz(qs[1], [62]).correct).toBe(false);
  });

  it('translate, rotate, scale: M = T·R·S traced; v0 and the tip where the lesson says', () => {
    const { e, r } = open('translate-rotate-scale');
    expect(r.output).toEqual(['v0 is drawn at 0.634, 0, -1.366', 'v1 is drawn at 2.366, 0, -2.366', 'v2 is drawn at 3.366, 0, -0.634', 'v3 is drawn at 1.634, 0, 0.366', 'v4 is drawn at 2, 3, -1']);
    expect(e.trace?.op).toBe('Trace the transform');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Build', 'Build', 'Build', 'Combine', 'Vertices', 'Vertices', 'Vertices', 'Vertices', 'Vertices']);
    const qs = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(qs[0].answer).toEqual([2, 0, -1]);
    expect(checkQuiz(qs[1], [0.634, 0, -1.366]).correct).toBe(true);
  });

  it('order matters: no shear when stretched then turned; 61.93° when turned then stretched', () => {
    const { e, r } = open('order-matters');
    expect(r.output).toEqual(['Stretch then turn: scale 2, 0.5, 0.5   shear 0°', 'Turn then stretch: scale 1.458, 0.5, 1.458   shear 61.928°']);
    expect(e.trace?.op).toBe('Decompose the matrix');
    const qs = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(checkQuiz(qs[0], [1.4577]).correct).toBe(true);
    expect(checkQuiz(qs[1], [28.07]).correct).toBe(true);
  });

  it('the determinant: 1 and −1.5, the baked mirror inside out, and the traced expansion', () => {
    const { e, r } = open('the-determinant');
    expect(r.output).toEqual(['Stretched: det 1', 'Baked mirror: its mesh holds volume -2 (inside out)', 'Mirrored: det -1.5   its unit-cube mesh fills -1.5 in the world']);
    expect(e.trace?.op).toBe('Determinant');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Matrix', 'Expand', 'Triple product', 'Meaning']);
    expect(e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!.answer)).toEqual([[-1.5], [-1.5]]);
  });

  it('hierarchies: origins down the chain, with questions on the elbow and the hand', () => {
    const { e, r } = open('hierarchies');
    expect(r.output).toEqual(["Shoulder's origin in the world: 0, 1, 0", "Elbow's origin in the world: -1, 2.732, 0", "Hand's origin in the world: -2.449, 3.12, 0"]);
    expect(e.trace?.op).toBe('Trace the world matrix');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Walk up', 'Root', 'Multiply', 'Multiply']);
    const qs = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(checkQuiz(qs[0], [-1, 2.732, 0]).correct).toBe(true);
    expect(checkQuiz(qs[1], [-2.449, 3.12, 0]).correct).toBe(true);
  });

  it('hierarchies: clearing the parent keeps the hand where it is', () => {
    const { e } = open('hierarchies');
    const hand = e.scene.get('Hand')!;
    const before = e.scene.worldMatrix(hand).elements.slice(12, 15);
    expect(e.setParent(hand.id, null)).toBe(true);
    e.scene.worldMatrix(hand).elements.slice(12, 15).forEach((x, i) => expect(x).toBeCloseTo(before[i], 9));
  });

  it('local and global axes: the axes, the scales and a world point in local coordinates', () => {
    const { e, r } = open('local-and-global-axes');
    expect(r.output).toEqual(['local x 0.866, 0, -0.5   local y 0, 1, 0   local z 0.5, 0, 0.866', 'scales 1, 1, 1.5', "world point (3, 0.5, 2) in the crate's coordinates: 1.732, 0, 0.667"]);
    expect(e.trace?.op).toBe('Trace the local axes');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Columns', 'Unit axes', 'Right angles', 'Move', 'Change of basis']);
    const qs = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(checkQuiz(qs[0], [0.866, 0, -0.5]).correct).toBe(true);
    expect(checkQuiz(qs[1], [1.732, 0, 0.667]).correct).toBe(true);
  });

  it('gimbal lock: (20, 90, 10) decodes to (30, 90, 0), and the rig turns the jet the same way', () => {
    const { e, r } = open('gimbal-lock');
    expect(r.output).toEqual(['decoded: 30, 90, 0 (gimbal lock)']);
    expect(e.trace?.op).toBe('Trace the Euler angles');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Build', 'Combine', 'Decode', 'Lock']);
    const qs = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(checkQuiz(qs[0], [1]).correct).toBe(true);
    expect(checkQuiz(qs[1], [30, 90, 0]).correct).toBe(true);
    const world = (n: string) => e.scene.worldMatrix(e.scene.get(n)!).elements;
    const a = world('Jet in the gimbal'), b = world('Jet (Euler)');
    [0, 1, 2, 4, 5, 6, 8, 9, 10].forEach((i) => expect(a[i]).toBeCloseTo(b[i], 9));
    // The X ring and the Z ring now turn about the same world axis.
    const axis = (n: string, j: number) => world(n).slice(j * 4, j * 4 + 3);
    axis('X ring', 1).forEach((x, i) => expect(Math.abs(x)).toBeCloseTo(Math.abs(axis('Z ring', 1)[i]), 9));
  });

  it('numbers you can type: parse() results, its errors, and the traced 2 + 3 * 4', () => {
    const { e, r } = open('numbers-you-can-type');
    expect(r.output).toEqual([
      '2 * 0.75 = 1.5   pi/4 = 0.7854   -2^2 = -4   2^3^2 = 512',
      '"1 2" → parse: expected an operator but found "2" (at character 3)',
      '"(1 + 2" → parse: a ( was never closed: expected ) (at character 7)',
      '"2 +" → parse: expected a number, but the text ended (at character 4)',
      '2 + 3 * 4 = 14',
    ]);
    expect(e.trace?.op).toBe('Parse a number');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Atom', 'Atom', 'Atom', 'Product', 'Sum', 'Result']);
    const qs = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(checkQuiz(qs[0], [12]).correct).toBe(true);
    expect(checkQuiz(qs[1], [14]).correct).toBe(true);
  });

  it('cameras: the view matrix puts the box straight ahead, 6.874 away', () => {
    const { e, r } = open('cameras');
    expect(r.output).toEqual(['(0, 0, 10) in camera space: -6.247, -3.306, 0.218 (z > 0: behind)', 'looking along -0.582, -0.364, -0.727', "the box's centre in camera space: 0, 0, -6.874"]);
    expect(e.trace?.op).toBe('Trace the view matrix');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Camera', 'Inverse', 'Camera space', 'Check']);
    const qs = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(checkQuiz(qs[0], [-0.582, -0.364, -0.727]).correct).toBe(true);
    expect(checkQuiz(qs[1], [0, 0, -6.874]).correct).toBe(true);
    // The menu item traces the same thing for the selected camera.
    e.selectObject(e.scene.get('Camera')!.id);
    expect(e.traceViewOf()).toBe(true);
    expect(e.message).toBe('Camera: Box is at (0, 0, -6.874) in camera space');
    e.selectObject(e.scene.get('Box')!.id);
    expect(e.traceViewOf()).toBe(false);
  });

  it('projection: the far box is drawn smaller, and a point becomes a pixel', () => {
    const { e, r } = open('projection');
    expect(r.output.slice(2)).toEqual(['(1, 0.5, 0): clip 0.94, -0.49, 6.1, 6.29  ndc 0.15, -0.08, 0.97  pixel 735.81, 387.88']);
    expect(r.output.slice(0, 2)).toEqual(['Near box: 104.7 pixels tall', 'Far box: 48.3 pixels tall']);
    expect(e.trace?.op).toBe('Trace the projection');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Camera space', 'Projection matrix', 'Clip space', 'Divide', 'Pixels']);
    const qs = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(checkQuiz(qs[0], [0.1497, -0.0774, 0.9692]).correct).toBe(true);
    expect(checkQuiz(qs[1], [735.81, 387.88]).correct).toBe(true);
    // The menu item: the first mesh (Near box) lands in the middle of the image.
    e.selectObject(e.scene.get('Camera')!.id);
    expect(e.traceProjectionOf()).toBe(true);
    expect(e.message).toBe('Camera: Near box lands at pixel (640, 360)');
  });

  it('depth buffer: near 0.01 makes the poster fight the wall; near 1 separates them', () => {
    const { e, r } = open('depth-buffer');
    expect(r.output[0]).toMatch(/^near 0\.01: depths 0\.9999\d+, 0\.9999\d+  stored (\d+), \1  \(they fight\)$/);
    expect(r.output[1]).toBe('one depth step at 100 is 0.0596 long; the poster is 0.001 in front');
    expect(e.trace?.op).toBe('Trace the depth buffer');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Distance', 'Depth', 'Store', 'Compare']);
    const qs = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(checkQuiz(qs[1], [0.0596]).correct).toBe(true);
    expect(checkQuiz(qs[1], [0.05]).correct).toBe(false);
    const cam = e.scene.get('Camera')!;
    e.setCameraClip(cam.id, 'near', 1);
    e.selectObject(cam.id);
    expect(e.traceDepthOf()).toBe(true);
    expect(e.message).toMatch(/^Camera: Wall and Poster store \d+ and \d+$/);
    e.setCameraClip(cam.id, 'near', 2000);
    expect(cam.camera!.near).toBe(1);
  });

  it('flat and smooth: the cap drags the rim normal down; auto smooth splits it', () => {
    const { e, r } = open('flat-and-smooth');
    expect(r.output).toEqual(['angle-weighted normal: 0.7462, -0.6657, 0', 'faces round vertex 0: 0, 2, 17   areas 3.0615, 0.7804, 0.7804   area-weighted normal 0.4472, -0.8944, 0']);
    expect(e.trace?.op).toBe('Trace the vertex normal');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Faces round it', 'Face normals', 'Face normals', 'Face normals', 'Average']);
    const qs = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(checkQuiz(qs[0], [3.0615]).correct).toBe(true);
    expect(checkQuiz(qs[1], [0.4472, -0.8944, 0]).correct).toBe(true);
    expect(e.scene.get('Auto smooth')!.autoSmooth).toBe(30);
    // Shade smooth after auto smooth turns auto smooth off again.
    e.setSmooth(e.scene.get('Auto smooth')!.id, true);
    expect(e.scene.get('Auto smooth')!.autoSmooth).toBeNull();
  });

  it('outlines: the outline width cancels the distance', () => {
    const { e, r } = open('outlines');
    expect(r.output[0]).toMatch(/^the block is [\d.]+ away; the hull is pushed out [\d.]+; the outline is 2\.70 pixels wide$/);
    expect(e.trace?.op).toBe('Trace the outline width');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Distance', 'Push', 'Pixels', 'Stencil']);
    const q = e.trace!.steps.find((x) => x.quiz)!.quiz!;
    expect(checkQuiz(q, [0.0035 * (1 / Math.tan(25 * Math.PI / 180)) * 360]).correct).toBe(true);
    expect(e.scene.get('Block')!.mesh!.stats()).toMatchObject({ closed: true, faces: 14 });
  });

  it('camera and still: look-at worked out matches lookAt, and the fields show it', () => {
    const { e, r } = open('camera-and-still');
    expect(e.trace?.op).toBe('Trace look-at');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Forward', 'Right and up', 'Change of basis', 'Rotation fields']);
    expect(r.output[2]).toBe('field of view: 50° tall, 79.3° wide at 16:9');
    const cam = e.scene.get('Camera')!;
    const shown = r.output[1].match(/-?[\d.]+/g)!.map(Number);
    cam.rotation.forEach((a, i) => expect(a * 180 / Math.PI).toBeCloseTo(shown[i], 1));
    // The camera's -z axis points at the box's centre.
    const w = e.scene.worldMatrix(cam).elements, fwd = [-w[8], -w[9], -w[10]], to = [0 - 6, 0.5 - 4, 0 - 8], l = Math.hypot(...to);
    fwd.forEach((x, i) => expect(x).toBeCloseTo(to[i] / l, 6));
    const q = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(checkQuiz(q[0], to.map((x) => x / l)).correct).toBe(true);
    expect(checkQuiz(q[1], [shown[1]]).correct).toBe(true);
    // The menu item aims the camera too.
    cam.rotation = [0, 0, 0];
    e.selectObject(cam.id);
    expect(e.traceLookAtOf()).toBe(true);
    cam.rotation.forEach((a, i) => expect(a * 180 / Math.PI).toBeCloseTo(shown[i], 1));
  });

  it('picking: the centre ray hits the front box; Möller–Trumbore agrees with three.js', async () => {
    const { e, r } = open('picking');
    expect(r.output[0]).toBe('pixel (790, 300) hits Back box');
    expect(r.output[2]).toMatch(/^centre pixel hits Front box face \d+ at t = [\d.]+ point /);
    expect(e.trace?.op).toBe('Trace picking');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Ray', 'Test', 'Test', 'Möller–Trumbore', 'Nearest']);
    // three.js's own raycaster, on the same triangles, finds the same distance.
    const THREE = await import('three');
    const { rayFromPixel, tracePick } = await import('../../../engines/mesh/core/pickRay');
    const cam = e.scene.get('Camera')!;
    const ray = rayFromPixel(e.scene.worldMatrix(cam).elements, cam.camera!, e.renderSize, 639.5, 359.5);
    const mine = tracePick(ray, e.pickables())!;
    const pos: number[] = [];
    for (const m of e.pickables()) for (const f of m.faces) for (let i = 1; i + 1 < f.length; i++) for (const k of [f[0], f[i], f[i + 1]]) pos.push(...m.verts[k]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const hit = new THREE.Raycaster(new THREE.Vector3(...ray.origin), new THREE.Vector3(...ray.dir)).intersectObject(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })))[0];
    expect(mine.t).toBeCloseTo(hit.distance, 4);
    const q = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(checkQuiz(q[0], [mine.t]).correct).toBe(true);
    e.selectObject(cam.id);
    expect(e.tracePickOf()).toBe(true);
    expect(e.message).toMatch(/^Camera: the ray hits Front box/);
  });

  it('screen picking: the pointer 7 and 5 px from a corner picks it, 8.60 px away', () => {
    const { e, r } = open('screen-picking');
    expect(r.output[2]).toMatch(/^nearest vertex: \d+ 8\.60 px away$/);
    expect(r.output[1]).toMatch(/^nearest edge: \d+-\d+ [\d.]+ px away, at t = [\d.]+$/);
    expect(e.trace?.op).toBe('Trace screen picking');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Project', 'Distances', 'Pick']);
    const q = e.trace!.steps.find((x) => x.quiz)!.quiz!;
    expect(checkQuiz(q, [Math.hypot(7, 5)]).correct).toBe(true);
    // The menu item: edit mode, vertex select, the image centre.
    e.selectObject(e.scene.get('Block')!.id); e.enterEdit(); e.setSelectMode('vert');
    expect(e.traceScreenPickOf()).toBe(true);
    // The centre of the image is the origin, inside the block: the nearest corner on screen is more than 12 px away.
    expect(e.message).toBe('Nothing within reach of the pointer');
  });

  it('loops: latitude loops close, longitude loops stop at the poles', () => {
    const { e, r } = open('loops');
    expect(r.output[0]).toMatch(/^a longitude loop: \d+ edges, open: it stops next to the poles$/);
    expect(r.output[1]).toBe('a latitude loop: 12 edges, all the way round');
    expect(e.trace?.op).toBe('Edge loop');
    const phases = e.trace!.steps.map((x) => x.phase);
    expect(phases[0]).toBe('Start');
    expect(phases.at(-1)).toBe('Loop');
    const qs = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(qs).toHaveLength(2);
    expect(checkQuiz(qs[1], [12]).correct).toBe(true);
    expect(checkQuiz(qs[1], [11]).correct).toBe(false);
  });

  it('gizmo drag: the move is the change in the closest point on the axis', () => {
    const { e, r } = open('gizmo-drag');
    expect(r.output).toEqual(['120 px right on the z arrow moves the box -1.797 along z', '120 px right on the x arrow: grab at s = 0.000 , now s = 1.261 , move 1.261 , snapped 1.25']);
    expect(e.trace?.op).toBe('Trace a gizmo drag');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Axis', 'Grab', 'Drag', 'Snap']);
    const qs = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(checkQuiz(qs[0], [1.261]).correct).toBe(true);
    expect(checkQuiz(qs[1], [1.25]).correct).toBe(true);
    expect(checkQuiz(qs[1], [1.5]).correct).toBe(false);
    // The menu item: the same drag, with the toolbar's Snap off.
    e.selectObject(e.scene.get('Box')!.id);
    expect(e.traceDragOf()).toBe(true);
    expect(e.message).toBe('Box: dragging 120 px moves it 1.261 along x');
  });

  it('knife cut: front faces only, or through; no crack either way', () => {
    const { e, r } = open('knife-cut');
    expect(r.output).toEqual(['cut through (X-ray): 10 faces, closed: true', 'front faces only: 1 face cut, 7 faces, closed: true']);
    expect(e.trace?.op).toBe('Knife');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Plane', 'Crossings', 'Split']);
    const qs = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(checkQuiz(qs[0], [0.375]).correct).toBe(true);
    expect(checkQuiz(qs[1], [1]).correct).toBe(true);
  });

  it('undo and redo: the trace counts the stacks; a new change clears redo', () => {
    const { e } = open('undo-redo');
    const box = e.scene.get('Box')!;
    e.setSmooth(box.id, true); runScript(e, `scene.get('Box').position.x = 1`); e.setSmooth(box.id, false);
    expect(e.traceUndo()).toBe(true);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Stack', 'Undo', 'Redo', 'Memory']);
    const n = e.undoStack.length, qs = e.trace!.steps.filter((x) => x.quiz).map((x) => x.quiz!);
    expect(checkQuiz(qs[0], [n - 2]).correct).toBe(true);
    e.undo(); e.undo();
    expect(e.redoStack).toHaveLength(2);
    e.setSmooth(box.id, true);                 // already smooth: no change, so redo survives
    expect(e.redoStack).toHaveLength(2);
    e.setSmooth(box.id, false);                // a real change clears it
    expect(e.redoStack).toHaveLength(0);
    expect(checkQuiz(qs[1], [0]).correct).toBe(true);
  });

  it('every click is code: the log replays to the same scene', async () => {
    const { traceReplay } = await import('../../../engines/mesh/core/logReplay');
    const { e } = open('every-click');
    const box = e.scene.get('Box')!;
    e.setSmooth(box.id, true); e.setTransform(box.id, 'position', 0, 1.5); e.setTransform(box.id, 'rotation', 1, Math.PI / 4);
    // The first entry is the project's own script, logged as one block.
    expect(e.log.slice(1).map((l) => l.code)).toEqual(['scene.get("Box").smooth = true', 'scene.get("Box").position.x = 1.5', 'scene.get("Box").rotation.y = 0.785398']);
    const r = traceReplay(e);
    expect(r).toEqual({ lines: 4, same: true, error: null });
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Log', 'Replay', 'Compare']);
    expect(checkQuiz(e.trace!.steps[0].quiz!, [4]).correct).toBe(true);
    e.undo();
    expect(e.log).toHaveLength(3);
  });

  it('write a shader: a ball', () => {
    const { e, r } = open('write-a-shader');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['shade() is lines 19 to 21 of the 34 lines MeshLab writes', 'problem: line 2: 3 is a whole number: in float maths write 3.0']);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Frame', 'Your code', 'main()', 'Checks']);
    expect(e.trace!.steps[1].quiz!.answer).toEqual([3]);
  });

  it('procedural textures: six tiles', () => {
    const { e, r } = open('procedural-textures');
    expect(r.error).toBeNull();
    expect(r.output).toEqual([
      'Checker  face 6 at (0.3, 0.3) → (235, 235, 235)', 'Grid     face 6 at (0.3, 0.3) → (225, 228, 232)', 'Stripes  face 6 at (0.3, 0.3) → (255, 159, 28)',
      'Wood     face 6 at (0.3, 0.3) → (173, 114, 62)', 'Grass    face 6 at (0.3, 0.3) → (112, 169, 62)', 'Bricks   face 6 at (0.3, 0.3) → (130, 57, 40)',
    ]);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Repeat', 'Formula', 'Colour']);
    expect(e.trace!.steps[1].quiz!.answer).toEqual([2]);
  });

  it('debug views: a flipped face and a seam', () => {
    const { e, r } = open('debug-views');
    expect(r.error).toBeNull();
    expect(r.output[0]).toBe('face 0 normal (0, 0, 1) → colour (0.5, 0.5, 1)');
    expect(r.output[1]).toBe('face 1 normal (0, 0, 1) → colour (0.5, 0.5, 1)');
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Vectors', 'Encode', 'Result']);
    expect(e.trace!.steps[1].quiz!.answer).toEqual([0.5, 0.5, 1]);
    expect(e.trace!.steps[2].label).toBe('linear (0.5, 0.5, 1) → screen (188, 188, 255)');
  });

  it('toon shading: two balls', () => {
    const { e, r } = open('toon-shading');
    expect(r.error).toBeNull();
    expect(r.output).toEqual([
      ' 0°: N·L 1.000 → band 1.000   rim 1.000', '30°: N·L 0.851 → band 0.667   rim 0.128', '60°: N·L 0.491 → band 0.333   rim 0.001',
      '75°: N·L 0.254 → band 0.000   rim 0.000', '90°: N·L 0.000 → band 0.000   rim 0.000', '45°: N·L 0.695 → band 0.667   rim 0.018',
    ]);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Vectors', 'Ambient', 'Cosine law', 'Bands', 'Rim', 'Colour', 'Result']);
    expect(e.trace!.steps[3].quiz!.answer[0]).toBeCloseTo(2 / 3, 9);
  });

  it('pbr materials: six balls', () => {
    const { e, r } = open('pbr-materials');
    expect(r.error).toBeNull();
    expect(r.output).toEqual([
      'Metal 0.15   D 161.870   F 0.3712', 'Metal 0.8    D 0.767   F 0.3714', 'Metal 0.4    D 10.885   F 0.3713',
      'Plastic 0.15 D 46.624   F 0.0400', 'Plastic 0.8  D 0.770   F 0.0403', 'Plastic 0.4  D 10.115   F 0.0401',
    ]);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Vectors', 'Ambient', 'Microfacets (D)', 'Fresnel (F)', 'Shadowing (G)', 'Energy', 'Result']);
    expect(e.trace!.steps[3].quiz!.answer[0]).toBeCloseTo(0.0401, 4);
  });

  it('highlights: three balls', () => {
    const { e, r } = open('highlights');
    expect(r.error).toBeNull();
    expect(r.output).toEqual([
      'shininess 5    highlight at its peak 0.9906   15° away 0.7664',
      'shininess 200  highlight at its peak 0.8733   15° away 0.0006',
      'shininess 40   highlight at its peak 0.9873   15° away 0.1583',
    ]);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Vectors', 'Ambient', 'Cosine law', 'Half vector', 'Highlight', 'Colour', 'Result']);
    expect(e.trace!.steps[4].quiz!.answer[0]).toBeCloseTo(0.9873, 4);
  });

  it('walk sliding', () => {
    const { e, r } = open('walk-sliding');
    expect(r.error).toBeNull();
    expect(r.output.slice(1)).toEqual(['left foot planted on frames 4–7, 28–31, 52–55, 76–79', 'worst slide while planted: 0.1744 (frames 28–31)', 'pose at frame 25 against frame 1: 0.00000 rad']);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Path', 'Contact', 'Slide', 'Loop']);
    expect(e.trace!.steps[3].quiz!.answer).toEqual([25]);
  });

  it('bone frames: three rest matrices', () => {
    const { e, r } = open('bone-frames');
    expect(r.error).toBeNull();
    expect(r.output).toEqual([
      'Spine: length 1.5, turned 0.00° from +y, x axis (1, 0, 0)',
      'Tilted: length 1.4142, turned 45.00° from +y, x axis (0, 0.7071, -0.7071)',
      'Arm: length 1.3, turned 72.08° from +y, x axis (0.9593, -0.2308, -0.1629)',
    ]);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Direction', 'Turn', 'Roll', 'Matrix']);
    expect(e.trace!.steps[0].quiz!.answer[0]).toBeCloseTo(1.3, 9);
  });

  it('pose chain: the chain posed root first, and the Hand\'s skin matrix', () => {
    const { e, r } = open('pose-chain');
    expect(r.error).toBeNull();
    expect(r.output).toEqual([
      'Upper posed tail (0, 0.866, 0.5)',
      'Lower posed tail (0, 1.1248, 1.4659)',
      'Hand posed tail (0, 1.2543, 1.9489)',
      'chain Upper → Lower → Hand; the Hand\u2019s tail (0, 1.2543, 1.9489)',
    ]);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Chain', 'Pose', 'Pose', 'Pose', 'Skin matrix']);
    expect(e.trace!.steps[3].quiz!.answer[2]).toBeCloseTo(1.9489, 3);
  });

  it('gltf clip: channels, times and bytes', () => {
    const { e, r } = open('gltf-clip');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['channels: Ball.translation, Box.rotation, Box.scale', '49 keys per sampler, 2 s, 2548 bytes of floats']);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Channels', 'Times', 'Values', 'Interpolation', 'Bytes']);
    expect(e.trace!.steps[1].quiz!.answer).toEqual([1]);
    expect(e.trace!.steps[4].quiz!.answer).toEqual([2548]);
  });

  it('hierarchy motion: an arm and a pen', () => {
    const { e, r } = open('hierarchy-motion');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['every  1 frames: 49 keys, worst gap 0.0000', 'every  6 frames:  9 keys, worst gap 0.0302', 'every 12 frames:  5 keys, worst gap 0.1197', 'every  3 frames: 17 keys, worst gap 0.0067']);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Chain', 'Sample', 'Check']);
    expect(e.trace!.steps[1].quiz!.answer).toEqual([17]);
  });

  it('quaternions and slerp', () => {
    const q = open('quaternions');
    expect(q.r.error).toBeNull();
    expect(q.r.output).toEqual(['y by   0°: q = (0, 0, 0, 1)', 'y by  90°: q = (0, 0.7071, 0, 0.7071)', 'y by 180°: q = (0, 1, 0, 0)', 'y by 360°: q = (0, 0, 0, -1)', 'Arrow: q = (0.483, 0.2241, 0.1294, 0.8365)']);
    expect(q.e.trace!.steps[0].quiz!.answer[0]).toBeCloseTo(Math.cos(Math.PI / 6), 9);
    const sl = open('slerp-turn');
    expect(sl.r.error).toBeNull();
    expect(sl.r.output).toEqual(['Euler  turned at frames 1, 7, 13, 19, 25: 0.0°, 47.7°, 93.2°, 133.7°, 165.1°', 'Slerp  turned at frames 1, 7, 13, 19, 25: 0.0°, 41.3°, 82.6°, 123.8°, 165.1°']);
    expect(sl.e.trace!.steps.map((x) => x.phase)).toEqual(['Keys', 'How far', 'Ease', 'Quaternions', 'Shortest path', 'Weights', 'Back to Euler']);
    expect(sl.e.trace!.steps[5].quiz!.answer[0]).toBeCloseTo(0.6654, 4);
  });

  it('keyframes and easing', () => {
    const k = open('keyframes');
    expect(k.r.error).toBeNull();
    expect(k.r.output.at(-1)).toBe('frame  7: (-2.25, 0.8, 0)   t = 0.25');
    expect(k.e.trace!.steps.map((x) => x.phase)).toEqual(['Keys', 'How far', 'Ease', 'Blend']);
    k.e.trace!.steps[3].quiz!.answer.forEach((x, i) => expect(x).toBeCloseTo([-2.25, 0.8, 0][i], 12));
    const ez = open('easing');
    expect(ez.r.error).toBeNull();
    expect(ez.r.output.slice(3)).toEqual(['ease-in  height at t = ¼: 2.813   at t = ½: 2.250', 'free fall   height at t = ¼: 2.813   at t = ½: 2.250']);
    expect(ez.e.trace!.steps[2].quiz!.answer[0]).toBeCloseTo(0.25, 12);
  });

  it('cosine law: a ball', () => {
    const { e, r } = open('cosine-law');
    expect(r.error).toBeNull();
    expect(r.output).toEqual([
      ' 0°: N·L 1.0000   screen 220, 221, 224', '30°: N·L 0.8506   screen 206, 207, 210',
      '90°: N·L 0.0000   screen 75, 77, 83', '60°: N·L 0.4913   screen 167, 168, 172',
    ]);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Vectors', 'Ambient', 'Cosine law', 'Colour', 'Result']);
    expect(e.trace!.steps[2].quiz!.answer[0]).toBeCloseTo(0.4913, 4);
    expect(e.trace!.steps[1].label).toBe('Ambient light (0.178, 0.19, 0.219): 75% sky, 25% ground');
  });

  it('pack charts: a plank', () => {
    const { e, r } = open('pack-charts');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['square used: 40.6%', 'texels per unit length, face by face: 200.8, 200.8, 200.8, 200.8, 200.8, 200.8']);
    const at = (phase: string) => e.trace!.steps.find((x) => x.phase === phase)!;
    expect(at('Straighten').label).toBe('Chart 1 turned to its smallest bounding box: 2.4 → 1.2');
    expect(at('True area').quiz!.answer[0]).toBeCloseTo(1, 9);
    expect(at('Shelves').label).toBe('6 charts (6 turned), tallest first, in 4 rows up to 3.802 wide');
    expect(at('Fit').label).toBe('Scaled by 1/5.1 into the square: the charts fill 40.6% of it; a 1024² texture gives 200.8 texels per unit of surface length');
  });

  it('measuring distortion: a globe', () => {
    const { e, r } = open('measuring-distortion');
    expect(r.error).toBeNull();
    expect(r.output).toEqual([
      'equator    σ₁ 0.2003  σ₂ 0.1805  σ₁/σ₂ 1.1094  area σ₁σ₂ 0.036147',
      'north pole σ₁ 0.5503  σ₂ 0.4139  σ₁/σ₂ 1.3295  area σ₁σ₂ 0.22776',
      'whole globe: σ₁/σ₂ mean 1.1539  worst 1.7736  area scale varies 31.6376×, 0 flipped',
    ]);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Local frame', 'Jacobian', 'Singular values', 'Whole mesh']);
    expect(e.trace!.steps[1].quiz!.answer[0]).toBeCloseTo(0.4345, 4);
  });

  it('conformal unwrap: a dome', () => {
    const { e, r } = open('conformal-unwrap');
    expect(r.error).toBeNull();
    expect(r.output).toEqual([
      'Dome            angle distortion: mean 1.079  worst 1.202   area scale varies 3.69×',
      'Dome, projected angle distortion: mean 3.261  worst 10.000   area scale varies 10.24×',
    ]);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Cut into charts', 'Pins', 'Conformal solve', 'Angles kept', 'Straighten', 'True area', 'Shelves', 'Fit', 'Result']);
    expect(e.trace!.steps[1].quiz!.answer[0]).toBeCloseTo(2, 9);
    expect(e.trace!.steps[3].label).toBe('Chart 1: angle distortion σ₁/σ₂ mean 1.0735, worst 1.215; area scale from 0.238 to 0.985');
  });

  it('uv projection: a cliff and a pillar', () => {
    const { e, r } = open('uv-projection');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['Cliff  angle distortion: mean 1.125  worst 1.941', 'Pillar angle distortion: mean 1.003  worst 1.003']);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Direction', 'One vertex', 'Wrap', 'Stretch']);
    expect(e.trace!.steps[1].quiz!.answer[0]).toBeCloseTo(0.5, 6);
    expect(e.trace!.steps[1].quiz!.answer[1]).toBeCloseTo(0.6366, 4);
    expect(e.trace!.steps[2].label).toBe('1 face straddles the line where the angle wraps round; its small u values are moved up by one turn');
  });

  it('seams and charts: a can', () => {
    const { e, r } = open('seams-and-charts');
    expect(r.error).toBeNull();
    expect(r.output).toEqual([
      'Can, opened:', '   1 face,  χ = 1, 1 rim → a disc', '   1 face,  χ = 1, 1 rim → a disc', '   16 faces, χ = 1, 1 rim → a disc',
      'Can:', '   1 face,  χ = 1, 1 rim → a disc', '   1 face,  χ = 1, 1 rim → a disc', '   16 faces, χ = 0, 2 rims → not a disc',
    ]);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Seams', 'Grow charts', 'Grow charts', 'Grow charts', 'Disc test', 'Wedges']);
    expect(e.trace!.steps[0].quiz!.answer).toEqual([3]);
    expect(e.trace!.steps[4].label).toBe('2 of 3 charts are discs; 1 needs another cut');
  });

  it('what uvs are: a box and a globe', () => {
    const { e, r } = open('what-uvs-are');
    expect(r.error).toBeNull();
    expect(r.output).toEqual([
      'Globe  114 vertices, 480 corners, 121 wedges; face 0 centre UV 0.6825, 0.3671 → texel 174, 93',
      'Box    8 vertices, 24 corners, 24 wedges; face 0 centre UV 0.168, 0.168 → texel 43, 43',
    ]);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Corners', 'Wedges', 'Interpolate', 'Texture lookup']);
    expect(e.trace!.steps[2].quiz!.answer[0]).toBeCloseTo(0.168, 3);
    expect(e.trace!.steps.at(-1)!.label).toBe('Texel (43, 43) of 256 × 256: checker square (1, 1), white');
  });

  it('level sets: two hills', () => {
    const { e, r } = open('level-sets');
    expect(r.error).toBeNull();
    expect(r.output).toEqual([
      'height 0.01: 0 loops, 1 open, length 15.109', 'height 0.2: 1 loops, 0 open, length 13.072', 'height 0.5: 2 loops, 0 open, length 8.608',
      'height 0.9: 1 loops, 0 open, length 2.983', 'height 1.3: 0 loops, 0 open, length 0.000',
    ]);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Classify', 'One triangle', 'Every triangle', 'Join']);
    expect(e.trace!.steps[1].quiz!.answer[0]).toBeCloseTo(0.7079, 3);
    expect(e.trace!.steps.at(-1)!.label).toBe('2 closed loops and 0 open chains; total length 8.6081');
  });

  it('implicit smoothing: four bumpy spheres', () => {
    const { e, r } = open('implicit-smoothing');
    expect(r.error).toBeNull();
    expect(r.output).toEqual([
      'Bumpy            volume 4.124   roughness 2.29%', 'Explicit ×5      volume 3.816   roughness 0.81%',
      'Explicit λ = 1.5 volume 3.581   roughness 4.71%', 'Implicit ×1      volume 3.725   roughness 0.82%',
    ]);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['The system', 'Solve', 'Shrinkage']);
    expect(e.trace!.steps[0].quiz!.answer[0]).toBeCloseTo(0.2496, 3);
    expect(e.trace!.steps[2].label).toBe('Volume 4.1241 → 3.7246 (-9.7%)');
  });

  it('geodesic: distance on a globe', () => {
    const { e, r } = open('geodesic-distance');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['to the equator: 1.5645 (exactly π/2 = 1.5708)', 'to the south pole: 3.1290 (exactly π = 3.1416)']);
    const steps = e.trace!.steps;
    expect(steps.at(-1)!.phase).toBe('Poisson solve');
    expect(steps.at(-1)!.quiz!.answer[0]).toBeCloseTo(0.1951, 3);
  });

  it('sparse solve: heat on a sphere', () => {
    const { e, r } = open('sparse-solve');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['482 unknowns, 4258 non-zeros; conjugate gradients: 45 iterations; Jacobi: 310']);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['The matrix', 'Symmetric positive definite', 'Conjugate gradients', 'Jacobi, for comparison']);
    expect(e.trace!.steps[0].quiz!.answer).toEqual([9]);
  });

  it('gaussian curvature: a torus', () => {
    const { e, r } = open('gaussian-curvature');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['K from -5.256 to 3.229']);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Angle sums', 'Angle defect', 'Gauss–Bonnet']);
    expect(e.trace!.steps[2].label).toBe('Total defect 0 = 0π; 2πχ = 0π with χ = 0');
    expect(e.trace!.steps[1].quiz!.answer[0]).toBeCloseTo(-3.88, 2);
  });

  it('mean curvature: a dented ball', () => {
    const { e, r } = open('mean-curvature');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['H from -1.001 to 6.198 ; 45 vertices curve inward']);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Laplacian of position', 'Sign', 'Range']);
    expect(e.trace!.steps[1].quiz!.answer).toEqual([-1]);
  });

  it('laplacian: a sphere vertex', () => {
    const { e, r } = open('laplacian');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['vertex 121 : mean curvature H ≈ 0.4973 (a sphere of radius 2 has H = 0.5)']);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Neighbours', 'Umbrella', 'Cotan weights', 'Area', 'Laplacian']);
    expect(e.trace!.steps[2].quiz!.answer[0]).toBeCloseTo(0.9831, 4);
  });

  it('fields: height coloured, traced', () => {
    const { e, r } = open('fields');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['y coordinate']);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Range', 'Normalise', 'Colour', 'Between vertices']);
    expect(e.trace!.steps[1].quiz!.answer[0]).toBeCloseTo(0.2953, 4);
  });

  it('subdivide uvs: seams, borders and distortion', () => {
    const { e, r } = open('subdivide-uvs');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['seam edges: 8', 'mean distortion on the smoothed ball: linear UVs 1.485 · smooth UVs 1.325']);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['UV vertices', 'Borders kept', 'Inside points', 'Distortion']);
    expect(e.trace!.steps[0].label).toBe('86 mesh vertices are 93 UV vertices: 7 extra copies where seams cut through');
    expect(e.traceUVSubdivisionOf()).toBe(true);
    expect(e.message).toBe('UVs subdivided 2×: distortion 1.49 linear, 1.32 smooth');
  });

  it('limits: the spinning top tip', () => {
    const { e, r } = open('limits');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['after one step: 48 quads; the tip is at y = 0.9500', 'its limit position: y = 0.7692']);
    const steps = e.trace!.steps;
    expect(steps.map((x) => x.phase)).toEqual(['Neighbours', 'Limit', 'Levels']);
    expect(steps[1].quiz!.answer.map((x: number) => +x.toFixed(6))).toEqual([0, 0.769231, 0]);
    expect(steps[2].label).toMatch(/× 0\.6111 a step$/);
  });

  it('clean topology: valence and the pole budget', () => {
    const { e, r } = open('clean-topology');
    expect(r.error).toBeNull();
    expect(r.output).toEqual([
      'Torus: {"4":576} · 0 poles · 576 quads, 0 triangles · budget 0 = 4χ = 0',
      'UV sphere: {"4":480,"32":2} · 2 poles · 448 quads, 64 triangles',
      'Quad ball: {"3":8,"4":90} · 8 poles · 96 quads, 0 triangles · budget 8 = 4χ = 8',
    ]);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Valence', 'Faces', 'Pole budget']);
    expect(e.trace!.steps[0].quiz!.answer).toEqual([3]);
  });

  it('box character: counts per step and a silhouette', () => {
    const { e, r } = open('box-character');
    expect(r.error).toBeNull();
    expect(r.output).toEqual([
      '1. half a torso: 8 vertices, 5 faces', '2. two loop cuts: 18 vertices, 14 faces', '3. an arm: 26 vertices, 22 faces',
      '4. a leg: 30 vertices, 26 faces', '5. neck and head: 38 vertices, 32 faces',
      '6. drawn: mirrored and subdivided, 1026 vertices, 1024 faces; closed: true',
      'from the front: 462 of 1024 faces face the camera; 122 silhouette edges',
    ]);
    expect(e.trace!.steps.map((x) => x.phase)).toEqual(['Facing', 'Silhouette']);
    expect(e.trace!.steps[0].quiz!.answer).toEqual([0]);
    expect(e.traceSilhouetteOf()).toBe(true);
    expect(e.message).toBe('Character from Front: 462 of 1024 faces face the camera, 122 silhouette edges');
  });

  it('mirror: half a box, traced', () => {
    const { e, r } = open('mirror');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['cage: 12 vertices, 8 faces', 'drawn: 18 vertices, 16 faces; closed: true']);
    expect(e.trace!.steps.map((x) => x.label)).toEqual(['6 vertices reflected, 6 on the plane shared', '8 faces mirrored with their corner order reversed']);
    expect(e.trace!.steps[0].quiz!.answer).toEqual([-1, -1, -1]);
    // The menu traces the same, from the Editor.
    expect(e.traceMirrorOf()).toBe(true);
    expect(e.trace!.op).toBe('Trace the mirror modifier');
  });

  it('merge and smooth: a checkerboard flattened in one step', () => {
    const { e, r } = open('merge-smooth');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['largest bump before: 0.1500', 'after one step: 0.0375']);
    const q = e.trace!.steps.find((x) => x.quiz)!.quiz!;
    expect(q.answer.map((x: number) => +x.toFixed(9))).toEqual([-0.5, 0, -0.5]);
  });

  it('dissolve: an L into one face, a corner deleted', () => {
    const { e, r } = open('dissolve');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['open edges 20', 'after delete: faces 24 ; open edges 24', 'after dissolve: faces 22 ; open edges 24']);
    expect(e.trace!.steps.map((x) => x.label)).toEqual(['3 faces: 2 shared edges go, 8 outline edges stay', 'The outline, walked in order: one 8-sided face [8, 7, 13, 19, 20, 14, 15, 9]']);
    expect(e.trace!.steps[1].quiz!.answer).toEqual([7]);
    // The merged L is concave: it is drawn by ear clipping, into 8 − 2 = 6 triangles.
    const L = e.activeObject!.mesh!.faces.findIndex((f) => f.length === 8);
    e.enterEdit(); e.setSelectMode('face'); e.selectElement(L, false);
    expect(e.traceTriangulateOf()).toBe(true);
    expect(e.trace!.steps[0].label).toMatch(/turns the other way .*: concave, so ear clipping/);
    expect(e.trace!.steps.at(-1)!.label).toMatch(/^6 triangles/);
  });

  it('bevel: three edges at a corner', () => {
    const { e, r } = open('bevel');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['bevelling 3 edges at vertex 6', 'faces 6 → 18 ; vertices 8 → 20']);
    const steps = e.trace!.steps;
    expect(steps.map((x) => x.phase).filter((p, i, a) => p !== a[i - 1])).toEqual(['Width', 'Slide', 'Profile', 'Corners', 'Strips', 'Patches', 'Bevel']);
    expect(steps.filter((x) => x.quiz).map((x) => x.quiz!.answer)).toEqual([[0.7, -1, 1], [0.925, -1, 0.925]]);
    expect(steps.some((x) => x.label === 'v6: 3 face corners, 3 bevelled edges, a 6-sided hole to patch')).toBe(true);
    expect(steps.at(-1)!.label).toBe('3 edges bevelled by 0.3, 2 segments: 6 strip faces, 1 corner patch in 6 faces (6 → 18 faces)');
  });

  it('loop cuts: round the tube', () => {
    const { e, r } = open('loop-cuts');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['cutting through edge 0 – 8', 'faces 10 → 18 ; vertices 16 → 24']);
    const steps = e.trace!.steps;
    expect(steps.filter((x) => x.phase === 'Walk the ring' && x.label.startsWith('Forward: quad'))).toHaveLength(8);
    expect(steps.some((x) => x.label === 'Back at [0, 8]: a closed ring of 8 quads')).toBe(true);
    expect(steps.filter((x) => x.quiz).map((x) => x.quiz!.answer)).toEqual([[1, 9], [1, 0, 0]]);
    // Across the side, the ring stops at both caps.
    e.enterEdit();
    expect(e.loopCut(16, 17)).toBe(true);
    expect(e.trace!.steps.filter((x) => /stop, face \d+ has 8 corners/.test(x.label))).toHaveLength(2);
    expect(e.trace!.steps.some((x) => x.label === '3 vertices at t = 0.5 along each ring edge')).toBe(true);
  });

  it('inset: an L as a region, mitred at its corners', () => {
    const { e, r } = open('inset');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['the L is faces 5, 6, 9', 'faces now: 28']);
    const mitres = e.trace!.steps.filter((x) => x.phase === 'Mitre').map((x) => x.label.replace(/^v\d+: /, ''));
    expect(mitres.filter((l) => l === 'a 90° corner, moves 0.283')).toHaveLength(5);
    expect(mitres.filter((l) => l === 'a 270° corner, moves 0.283')).toHaveLength(1);
    expect(mitres.filter((l) => l === 'straight (180°), moves 0.2')).toHaveLength(2);
    expect(e.trace!.steps.find((x) => x.quiz)!.quiz!.answer).toEqual([-0.8, 0, -0.8]);
  });

  it('extrude: two faces together, walls on the border only', () => {
    const { e, r } = open('extrude');
    expect(r.error).toBeNull();
    expect(r.output).toEqual(['faces 4, 5 extruded together', 'vertices 16 → 22 ; faces 9 → 15']);
    const steps = e.trace!.steps;
    expect(steps.find((x) => x.phase === 'Border edges')!.label).toBe('6 border edges, 1 inner edge');
    expect(steps.filter((x) => x.phase === 'Walls')).toHaveLength(6);
    expect(steps.find((x) => x.quiz)!.quiz!.answer).toEqual([-0.5, 0.5, 0.5]);
  });

  it('two lists: the shared pyramid is closed with 5 vertices; the separate one has 16 and tears when its tip moves', () => {
    const { e, r } = open('two-lists');
    expect(r.output).toEqual(['Shared corners: 5 vertices, 5 faces', 'Separate faces: 16 vertices, 5 faces: [[0,1,2,3],[4,5,6],[7,8,9],[10,11,12],[13,14,15]]']);
    const shared = e.scene.get('Pyramid')!.mesh!, apart = e.scene.get('Pyramid, separate faces')!.mesh!;
    expect(shared.stats()).toMatchObject({ verts: 5, faces: 5, edges: 8, closed: true });
    expect(apart.stats()).toMatchObject({ verts: 16, faces: 5, closed: false });
    // Raising vertex 4 moves all four sides; raising face 1's copy of the tip (6) moves one corner only.
    shared.translateVerts([4], [0, 1.5, 0]);
    expect(shared.faces.filter((f) => f.includes(4)).length).toBe(4);
    apart.translateVerts([6], [0, 1.5, 0]);
    expect([9, 12, 15].map((i) => apart.verts[i][1])).toEqual([1.5, 1.5, 1.5]);
    expect(apart.verts[6][1]).toBe(3);
  });

  it('unwrap basics: the cube has no distortion, the sphere keeps angles well but not areas', () => {
    const { r } = open('unwrap-basics');
    expect(r.output[0]).toBe('cube: worst angle distortion 1.0000');
    expect(Number(r.output[1].split(' ').at(-1))).toBeLessThan(1.25);
    expect(Number(r.output[2].match(/varies ([\d.]+)×/)![1])).toBeGreaterThan(3);
  });

  it('the vase gets a band and a disc, with little angle distortion', async () => {
    const { uvFits, charts } = await import('../../../engines/mesh/core/uv');
    const { e, r } = open('python-vase');
    const v = e.scene.get('Vase')!;
    expect(uvFits(v.mesh!, v.uv)).toBe(true);
    expect(charts(v.mesh!, new Set(v.seams)).length).toBe(2);
    expect(Number(r.output.at(-1)!.match(/mean ([\d.]+)/)![1])).toBeLessThan(1.2);
  });

  it('the shader gallery has one sphere per model, all unwrapped, and the custom GLSL set', async () => {
    const { uvFits } = await import('../../../engines/mesh/core/uv');
    const { e } = open('shader-gallery');
    const want = { PBR: 'pbr', Lambert: 'lambert', 'Blinn–Phong 10': 'blinn-phong', 'Blinn–Phong 120': 'blinn-phong', Toon: 'toon', Normals: 'normals', UV: 'uv', Custom: 'custom' };
    for (const [n, m] of Object.entries(want)) { const o = e.scene.get(n)!; expect(o.material.shader).toBe(m); expect(uvFits(o.mesh!, o.uv)).toBe(true); }
    expect(e.scene.get('Blinn–Phong 120')!.material.shininess).toBe(120);
    expect(e.scene.get('Custom')!.material.glsl).toMatch(/^float d = max/);
  });

  it('the dining set is wood-grained: every part unwrapped with the wood texture', async () => {
    const { uvFits } = await import('../../../engines/mesh/core/uv');
    const { e } = open('dining-set');
    const parts = e.scene.objects.filter((o) => o.mesh);
    expect(parts.length).toBeGreaterThan(20);
    for (const o of parts) { expect(o.material.texture).toBe('wood'); expect(uvFits(o.mesh!, o.uv)).toBe(true); }
  });
});

describe('hard-surface projects', () => {
  const open = (id: string) => { const e = new Editor(); const r = openProject(e, PROJECTS.find((p) => p.id === id)!, py); return { e, r }; };

  it('the crate is closed, bevelled, panelled and fully unwrapped', async () => {
    const { uvFits, angleDistortion } = await import('../../../engines/mesh/core/uv');
    const { e } = open('crate');
    const c = e.scene.get('Crate')!, s = c.mesh!.stats();
    expect(s.closed).toBe(true); expect(s.euler).toBe(2);
    expect(s.volume).toBeLessThan(1.6 ** 3); expect(s.volume).toBeGreaterThan(0.85 * 1.6 ** 3); // six 5 cm recesses and the bevels take about 11%
    expect(uvFits(c.mesh!, c.uv)).toBe(true);
    const d = angleDistortion(c.mesh!, c.uv!);
    expect(d.reduce((a, b) => a + b, 0) / d.length).toBeLessThan(1.1);
  });

  it('support loops: the more support near the edges, the closer the subdivided volume stays to the box', () => {
    const { r } = open('support-loops');
    const pct = (name: string) => Number(r.output.find((l) => l.startsWith(name))!.match(/\((\d+)%\)/)![1]);
    const a = pct('No support loops'), b = pct('Bevelled edges'), c = pct('Support loops');
    expect(a).toBeLessThan(b); expect(b).toBeLessThan(c); expect(c).toBeGreaterThan(90); expect(a).toBeLessThan(80);
  });
});

import { readFileSync, readdirSync } from 'fs';
import { CHALLENGES } from './challenges';

describe('guides name things that exist', () => {
  it('every "Menu › Item" in a guide or hint is a real menu item; every other "A › B" is text in the interface', () => {
    // fileURLToPath, not .pathname: on Windows a file URL keeps a leading slash
    // before the drive letter and percent-encodes spaces, so the naive version
    // builds 'C:\C:\...%20...' and every read from it fails. This test reported a
    // missing file rather than whatever it was checking - a test that cannot run is
    // not a test that passes.
    const dir = fileURLToPath(new URL('..', import.meta.url));
    const meshlab = readFileSync(dir + 'MeshLab.tsx', 'utf8');
    // The interface is split: content-facing panels stay with the lab,
    // the inspection panels are shared in src/engines/mesh. Scanning only
    // one of the two would check a fraction of the menu items and pass.
    const uiDirs = [dir + 'ui', dir + '../../engines/mesh/ui'];
    const ui = meshlab + uiDirs.flatMap((d) => readdirSync(d)
      .map((f) => readFileSync(d + '/' + f, 'utf8'))).join('\n');
    // The menus: `Name: [ ... ],` or `'Name': [ ... ],` inside the menus object, with their item labels.
    const block = meshlab.slice(meshlab.indexOf('const menus'), meshlab.indexOf('const stats'));
    const menus = new Map<string, string>();
    const keys = [...block.matchAll(/\n {4}'?([A-Z][A-Za-z ]+)'?: \[/g)];
    keys.forEach((k, i) => menus.set(k[1], block.slice(k.index!, keys[i + 1]?.index ?? block.length)));
    expect([...menus.keys()]).toEqual(expect.arrayContaining(['File', 'Mesh', 'UV', 'Heat map', 'Object']));
    const stale = (texts: string[]) => {
      const refs = texts.flatMap((t) => [...t.matchAll(/([A-Z][A-Za-z]+(?: [a-z]+)?) › ([A-Z][^.,:;()"]*?)(?=[.,:;()"]|$| (?:and|then|or|on|with|to|in)\b)/g)].map((m) => [m[1], m[2].trim()] as const));
      const bad: string[] = [];
      for (const [a, b] of refs) {
        const lead = b.split(' ').slice(0, 2).join(' ');
        if (menus.has(a)) { if (!menus.get(a)!.includes(lead)) bad.push(`${a} › ${b} (no such item in the ${a} menu)`); }
        else if (!ui.includes(lead)) bad.push(`${a} › ${b} (no such text in the interface)`);
      }
      return { refs, bad };
    };
    // The check itself catches a made-up item and a made-up panel.
    expect(stale(['Use Heat map › Banana split here.', 'See Frobnicator panel › Zork.']).bad.length).toBe(2);
    const { refs, bad } = stale([...PROJECTS.flatMap((p) => [...p.guide.map(stepText), p.desc]), ...CHALLENGES.flatMap((c) => [...c.hints, c.brief])]);
    expect(refs.length).toBeGreaterThan(10);
    expect(bad).toEqual([]);
  });
});

describe('the walk cycle', () => {
  it('loops, dips after each contact, and moves forward at a steady speed', () => {
    const e = new Editor();
    expect(openProject(e, PROJECTS.find((p) => p.id === 'walk-cycle')!).error).toBeNull();
    const rig = () => e.scene.get('Rig')!;
    const pose = (f: number) => { e.setFrame(f); return rig().bones!.map((b) => b.pose.map((x) => +x.toFixed(9))); };
    expect(pose(25)).toEqual(pose(1));                  // one cycle later, the same pose
    expect(pose(49)).toEqual(pose(1));
    const at = (f: number) => { e.setFrame(f); return [...rig().position]; };
    expect(at(4)[1]).toBeLessThan(at(1)[1]); expect(at(10)[1]).toBeGreaterThan(at(1)[1]); // down, then up
    // Steady forward speed: the same distance every 6 frames.
    const z = [1, 7, 13, 19, 25, 31].map((f) => at(f)[2]);
    const steps = z.slice(1).map((v, i) => v - z[i]);
    for (const d of steps) expect(d).toBeCloseTo(steps[0], 9);
  });

  it('the island is grass on planar UVs', async () => {
    const { uvFits } = await import('../../../engines/mesh/core/uv');
    const e = new Editor(); openProject(e, PROJECTS.find((p) => p.id === 'island')!);
    const land = e.scene.get('Island')!;
    expect(land.material.texture).toBe('grass'); expect(uvFits(land.mesh!, land.uv)).toBe(true);
  });
});

describe('guide steps that tick themselves', () => {
  // For every step with a check: the action it asks for, done the way the GUI does it.
  const obj = (e: Editor, n: string) => e.scene.get(n)!;
  const edit = (e: Editor, name: string, mode: 'vert' | 'edge' | 'face', keys: (number | string)[]) => {
    e.selectObject(obj(e, name).id); e.enterEdit(); e.setSelectMode(mode);
    keys.forEach((k, i) => e.selectElement(k, i > 0));
  };
  /** Where the left chest is drawn now (the character is posed), for a brush dab to land on. */
  const chest = (e: Editor) => {
    const c = obj(e, 'Character'), rest = skinSource(c).verts, now = skinnedSource(e.scene, c).verts;
    return now[rest.findIndex((v) => v[0] > 0.2 && v[0] < 0.65 && v[1] > 0.8 && v[1] < 1.25)];
  };
  const firstEdge = (e: Editor, name: string) => [...obj(e, name).mesh!.edges().values()].find((x) => x.faces.length === 2)!;
  const act: Record<string, (e: Editor) => void> = {
    'Tab for edit mode, press 3 for face select, click a face of the bottom-left block': (e) => { edit(e, 'Blocks', 'face', [3]); e.selectLinked(); },
    'Now press 1 for vertex select, click a corner of the same block': (e) => { edit(e, 'Blocks', 'vert', [0]); e.selectLinked(); },
    'Make a hole: select the Closed cube': (e) => { edit(e, 'Closed cube', 'face', [0]); e.deleteElements(); },
    'Merge Your box: select it': (e) => { e.selectObject(obj(e, 'Your box').id); e.enterEdit(); expect(e.mergeByDistance(0.001)).toBe(true); },
    'Close it: press 1 for vertex select': (e) => { e.selectObject(obj(e, 'Your box').id); e.enterEdit(); expect(e.mergeByDistance(0.001)).toBe(true); const m = obj(e, 'Your box').mesh!; e.setSelectMode('vert'); m.verts.forEach((v, i) => { if (v[1] > 0.5) e.selectElement(i, true); }); expect(e.fill()).toBe(true); },
    'Change the model and see the file change': (e) => { edit(e, 'Pyramid', 'face', [0]); expect(e.flip()).toBe(true); },
    'Measure the tip: Tab for edit mode': (e) => { edit(e, 'Pyramid', 'edge', [EditMesh.edgeKey(4, 0), EditMesh.edgeKey(4, 1)]); expect(e.measureAngle()).toBe(true); expect(e.lastMeasure!.degrees).toBeCloseTo(58.03, 2); },
    'Set Rotation Y to 90 in the Inspector': (e) => { runScript(e, `scene.get('Pyramid').rotation.y = Math.PI / 2`); e.selectObject(obj(e, 'Pyramid').id); expect(e.traceTransformOf()).toBe(true); },
    'Fix it: select Stretcher': (e) => { runScript(e, `scene.get('Stretcher').scale = [1, 1, 1]; scene.get('Turn then stretch').scale = [2, 0.5, 0.5]`); e.selectObject(obj(e, 'Turn then stretch').id); expect(e.decomposeOf()).toBe(true); },
    'Baked mirror has its mirror in its vertices': (e) => { e.selectObject(obj(e, 'Baked mirror').id); e.enterEdit(); e.selectAllElements(); expect(e.flip()).toBe(true); },   // as the guide says: Tab, A, Flip normals
    'Turn the Elbow: select it and set Rotation Z to 90': (e) => { runScript(e, `scene.get('Elbow').rotation.z = Math.PI / 2`); e.selectObject(obj(e, 'Hand').id); expect(e.traceWorldOf()).toBe(true); },
    'Unparent the Hand with Object › Clear parent': (e) => { expect(e.setParent(obj(e, 'Hand').id, null)).toBe(true); },
    'With the toolbar on Local axes, press Move and drag': (e) => { runScript(e, `scene.get('Crate').position = [1 + 0.5 * Math.cos(Math.PI / 6), 0.5, 2 - 0.5 * Math.sin(Math.PI / 6)]`); },
    'Click Local axes to switch to World axes': (e) => { runScript(e, `scene.get('Crate').rotation.y = 1`); e.selectObject(obj(e, 'Crate').id); expect(e.traceAxesOf()).toBe(true); },
    'Select "Jet (Euler)" and set Rotation X to 30': (e) => { runScript(e, `scene.get('Jet (Euler)').rotation = [Math.PI / 6, Math.PI / 2, 0]`); },
    'Set its Rotation Y to 45': (e) => { runScript(e, `scene.get('Jet (Euler)').rotation.y = Math.PI / 4`); e.selectObject(obj(e, 'Jet (Euler)').id); expect(e.traceEulerOf()).toBe(true); },
    'Select Box and type 90/4 into Rotation Y': (e) => { runScript(e, `scene.get('Box').rotation.y = parse('90/4') * Math.PI / 180`); },
    'Move the camera and trace it': (e) => { runScript(e, `scene.get('Camera').position = [6, 2, 0]`); e.selectObject(obj(e, 'Camera').id); expect(e.traceViewOf()).toBe(true); },
    'Select Camera and set its Field of view to 30': (e) => { runScript(e, `scene.get('Camera').fov = 30`); e.selectObject(obj(e, 'Camera').id); expect(e.traceProjectionOf()).toBe(true); },
    'Select Camera and set Near to 1': (e) => { e.setCameraClip(obj(e, 'Camera').id, 'near', 1); e.selectObject(obj(e, 'Camera').id); expect(e.traceDepthOf()).toBe(true); },
    'Select Smooth and use Object › Shade auto smooth': (e) => { e.setAutoSmooth(obj(e, 'Smooth').id, 30); },
    'Tab into edit mode on Smooth': (e) => { e.setAutoSmooth(obj(e, 'Smooth').id, 30); edit(e, 'Smooth', 'vert', [0]); expect(e.traceNormalOf()).toBe(true); },
    'Select Camera, set its Field of view to 25': (e) => { runScript(e, `scene.get('Camera').fov = 25`); e.selectObject(obj(e, 'Camera').id); expect(e.traceOutlineOf()).toBe(true); },
    'In the Inspector, set Render size to 1080': (e) => { e.renderSize = { width: 1080, height: 1080 }; },
    'Click the back box where it shows': (e) => { e.selectObject(obj(e, 'Back box').id); },
    'Tab into edit mode on Block, press 1 for vertex select, and click a corner': (e) => { edit(e, 'Block', 'vert', [0]); },
    'Tab into edit mode on Ball, press 1, and Alt+click an edge on the equator': (e) => {
      const m = obj(e, 'Ball').mesh!, ed = [...m.edges().values()].find((x) => Math.abs(m.verts[x.a][1] - m.verts[x.b][1]) < 1e-9 && Math.abs(m.verts[x.a][1]) < 0.5)!;
      edit(e, 'Ball', 'vert', []); expect(e.selectLoop(ed.a, ed.b)).toBe(true);
    },
    'Press Move, then drag the gizmo’s red arrow': (e) => { runScript(e, `scene.get('Box').position.x += 0.5`); },
    'Tab into edit mode on Slab, press K': (e) => { edit(e, 'Slab', 'edge', []); expect(e.knife({ eye: [0, 0, 6], from: [-2, -0.5, 0], to: [2, 0.5, 0] })).toBe(true); },
    'Make three changes to Box': (e) => { const b = obj(e, 'Box'); e.setSmooth(b.id, true); runScript(e, `scene.get('Box').position.x = 1`); e.setSmooth(b.id, false); },
    'Use Edit › Trace the undo stack': (e) => { const b = obj(e, 'Box'); e.setSmooth(b.id, true); e.setSmooth(b.id, false); e.setSmooth(b.id, true); expect(e.traceUndo()).toBe(true); },
    'Change Box three ways': (e) => { const b = obj(e, 'Box'); e.setSmooth(b.id, true); e.setTransform(b.id, 'position', 0, 1.5); e.setTransform(b.id, 'rotation', 1, 0.5); },
    'Use Script › Trace the GUI → code log': (e) => { const b = obj(e, 'Box'); e.setSmooth(b.id, true); e.setTransform(b.id, 'position', 0, 1.5); traceReplay(e); },
    'Select "Bumpy", Tab into edit mode, select all (A) and use Mesh › Smooth vertices (implicit)': (e) => { const m = obj(e, 'Bumpy').mesh!; edit(e, 'Bumpy', 'vert', m.verts.map((_, i) => i)); expect(e.smoothImplicit()).toBe(true); },
    'Show Heat map › Mean curvature on "Bumpy"': (e) => { e.selectObject(obj(e, 'Bumpy').id); expect(e.showField({ kind: 'mean' })).toBe(true); },
    'Heat map › Trace the iso-line (middle of the range): the level halfway up': (e) => { expect(e.traceContourOf()).toBe(true); },
    'Heat map › Mean curvature, then trace its iso-line': (e) => { expect(e.showField({ kind: 'mean' })).toBe(true); expect(e.traceContourOf()).toBe(true); },
    'Open the Shader tab, change the 3 on line 2 to 3.0': (e) => { const o = obj(e, 'Ball'); e.setMaterial(o.id, { glsl: o.material.glsl!.replace(', 3);', ', 3.0);') }); },
    'In the Inspector, set the Bricks tile': (e) => { e.setMaterial(obj(e, 'Bricks').id, { textureScale: 2 }); },
    'Tab into edit mode on another tile, select a face': (e) => { edit(e, 'Wood', 'face', [3]); expect(e.traceTextureOf()).toBe(true); },
    'Select the Ball, key its scale at frame 13': (e) => { e.selectObject(obj(e, 'Ball').id); e.setFrame(13); expect(e.insertKey(['scale'])).toBe(true); expect(e.traceClipOf()).toBe(true); },
    'Select the Rig, pick bone Shin.R': (e) => { e.selectObject(obj(e, 'Rig').id); e.activeBone = 'Shin.R'; expect(e.traceFootSlideOf(24)).toBe(true); },
    'Press Space to play: the orange marker': (e) => { e.setFrame(25); },
    'Select the Pen and use Object › Trace baking world motion': (e) => { e.selectObject(obj(e, 'Pen').id); expect(e.traceBakeOf(3)).toBe(true); },
    'Change the Arrow': (e) => { const a = obj(e, 'Arrow'); e.selectObject(a.id); expect(e.traceQuaternionOf()).toBe(true); },
    'Press Space to play, and watch the two boxes': (e) => { e.setFrame(20); },
    'In the Timeline, scrub to another frame and use Object › Trace sampling the keys': (e) => { e.selectObject(obj(e, 'Box').id); e.setFrame(20); expect(e.traceSampleOf()).toBe(true); },
    'Insert a key of your own: move the box at frame 37': (e) => { e.selectObject(obj(e, 'Box').id); e.setFrame(37); expect(e.insertKey(['position'])).toBe(true); },
    'Play the animation (Space)': (e) => { e.setFrame(12); },
    'Fix the box: Tab into edit mode, select its back face': (e) => { edit(e, 'Box', 'face', [0]); expect(e.flip()).toBe(true); },
    'Tab into edit mode on "Toon", pick a vertex near its edge': (e) => { edit(e, 'Toon', 'vert', [200]); expect(e.traceShadingOf()).toBe(true); },
    'In the Inspector, set "Plastic 0.4"': (e) => { e.setMaterial(obj(e, 'Plastic 0.4').id, { metalness: 1 }); },
    'Orbit the view, Tab into edit mode on "Shininess 40"': (e) => { edit(e, 'Shininess 40', 'vert', [300]); expect(e.traceShadingOf()).toBe(true); },
    'In the Inspector, change the shininess of "Shininess 40" to 10': (e) => { e.setMaterial(obj(e, 'Shininess 40').id, { shininess: 10 }); },
    'Tab into edit mode on "Ball", select a vertex (1 for vertex select) and use Mesh › Trace the shading': (e) => { edit(e, 'Ball', 'vert', [5]); expect(e.traceShadingOf()).toBe(true); },
    'In the Inspector, set the texture repeat (×) to 4': (e) => { e.setMaterial(obj(e, 'Plank').id, { textureScale: 4 }); },
    'Tab into edit mode, select a face on the equator (3 for face select) and use UV › Trace the distortion': (e) => { const m = obj(e, 'Globe').mesh!; edit(e, 'Globe', 'face', [m.faces.findIndex((_, i) => m.faces[i].length === 4 && Math.abs(m.faceCenter(i)[1]) < 0.1 && m.faceCenter(i)[2] > 0.7)]); expect(e.traceDistortionOf()).toBe(true); },
    'Select "Dome, projected" and use UV › Angle distortion heat map': (e) => { e.selectObject(obj(e, 'Dome, projected').id); expect(e.showField({ kind: 'uv' })).toBe(true); },
    'With "Dome, projected" selected, Tab into edit mode and press U': (e) => { edit(e, 'Dome, projected', 'face', []); expect(e.unwrap()).toBe(true); },
    'Select "Cliff" and use UV › Angle distortion heat map': (e) => { e.selectObject(obj(e, 'Cliff').id); expect(e.showField({ kind: 'uv' })).toBe(true); },
    'Select "Pillar" and use UV › Project from above': (e) => { e.selectObject(obj(e, 'Pillar').id); expect(e.unwrap('planar')).toBe(true); },
    'Select "Can", Tab into edit mode, select one vertical edge': (e) => { edit(e, 'Can', 'edge', ['0-16']); e.markSeams(true); },
    'UV › Trace the charts (seams → pieces) on "Can"': (e) => { e.selectObject(obj(e, 'Can').id); runScript(e, `scene.get('Can').mesh.markSeams([[0, 16]])`); expect(e.traceChartsOf()).toBe(true); },
    'Tab into edit mode on "Box", select one face (3 for face select) and use UV › Trace a texture lookup': (e) => { edit(e, 'Box', 'face', [2]); expect(e.traceUVLookupOf()).toBe(true); },
    'Tab into edit mode, select two vertices far apart': (e) => { edit(e, 'Globe', 'vert', [0, e.activeObject!.mesh!.verts.length - 1]); expect(e.showDistanceFromSelection()).toBe(true); },
    'Tab into edit mode, select another vertex (1 for vertex select) and use Heat map › Trace the heat solve': (e) => { edit(e, 'Sphere', 'vert', [40]); expect(e.traceSolveOf()).toBe(true); },
    'Heat map › Distance from selected vertices: the heat method': (e) => { edit(e, 'Sphere', 'vert', [40]); expect(e.showDistanceFromSelection()).toBe(true); },
    'Add a cube from the Add menu, select it and show Heat map › Gaussian curvature': (e) => { const c = e.addPrimitive('cube'); e.selectObject(c.id); expect(e.showField({ kind: 'gaussian' })).toBe(true); },
    'Tab into edit mode, select one vertex in the dent': (e) => { const m = e.activeObject!.mesh!; edit(e, 'Dented ball', 'vert', [m.verts.findIndex((p) => p[0] > 0.3 && p[0] < 0.5 && Math.abs(p[1]) < 0.2)]); expect(e.traceLaplacianOf()).toBe(true); },
    'Heat map › Gaussian curvature: the next lesson': (e) => { expect(e.showField({ kind: 'gaussian' })).toBe(true); },
    'Tab into edit mode, select a vertex near a pole': (e) => { const m = e.activeObject!.mesh!; edit(e, 'Sphere', 'vert', [m.verts.findIndex((p) => p[1] > 1.8 && p[1] < 1.99)]); expect(e.traceLaplacianOf()).toBe(true); },
    'Heat map › Mean curvature: H at every vertex': (e) => { expect(e.showField({ kind: 'mean' })).toBe(true); },
    'Heat map › Mean curvature: a different field': (e) => { expect(e.showField({ kind: 'mean' })).toBe(true); },
    'Heat map › Trace the colour mapping on the curvature': (e) => { e.showField({ kind: 'mean' }); expect(e.traceColourMapOf()).toBe(true); },
    'In the Inspector, untick Smooth UVs on the subdivision modifier': (e) => { e.updateModifier(e.activeObject!.id, 0, { uvSmooth: false }); },
    'Tab into edit mode, select one vertex where 4 edges meet (1 for vertex select) and use Mesh › Trace the limit position': (e) => { const m = e.activeObject!.mesh!; const v = m.verts.findIndex((_, i) => m.faces.filter((f) => f.includes(i)).length === 4); edit(e, 'Spinning top', 'vert', [v]); expect(e.traceLimitOf()).toBe(true); },
    'Add a Subdivision modifier in the Inspector': (e) => { e.addModifier(e.activeObject!.id, 'subsurf'); },
    'Select the UV sphere and use Object › Trace clean topology': (e) => { e.selectObject(e.scene.objects.find((x) => x.name === 'UV sphere')!.id); expect(e.traceValenceOf()).toBe(true); },
    'Select the torus and trace it': (e) => { e.selectObject(e.scene.objects.find((x) => x.name === 'Torus')!.id); expect(e.traceValenceOf()).toBe(true); },
    'In the Inspector, turn the subdivision modifier off': (e) => { const o = e.scene.objects.find((x) => x.name === 'Character')!; e.updateModifier(o.id, 1, { enabled: false }); },
    'Tab into edit mode on the character, select the faces at the end of an arm': (e) => { const o = e.scene.objects.find((x) => x.name === 'Character')!; const m = o.mesh!; const ends = m.faces.map((_, i) => i).filter((i) => m.faceNormal(i)[0] > 0.9 && m.faceCenter(i)[0] > 1.5); edit(e, 'Character', 'face', ends); expect(e.extrude(0.3)).toBe(true); },
    'In the Inspector, switch the mirror modifier off and on': (e) => { const o = e.activeObject!; e.updateModifier(o.id, 0, { enabled: false }); },
    'Object › Apply modifiers': (e) => { e.applyModifiers(e.activeObject!.id); },
    'Tab into edit mode, select the four corners of one face (1 for vertex select, Shift+click) and press M': (e) => { const f = e.activeObject!.mesh!.faces[0]; edit(e, 'Grid', 'vert', f); expect(e.merge()).toBe(true); },
    'Select all (A) and use Mesh › Smooth vertices': (e) => { const m = e.activeObject!.mesh!; edit(e, 'Grid', 'vert', m.verts.map((_, i) => i)); expect(e.smoothVerts()).toBe(true); },
    'Select the L (3 for face select, click it) and use Mesh › Trace drawing the face': (e) => { edit(e, 'Grid', 'face', [e.activeObject!.mesh!.faces.findIndex((f) => f.length === 8)]); expect(e.traceTriangulateOf()).toBe(true); },
    'Select two neighbouring faces of the grid and press Ctrl+X': (e) => { edit(e, 'Grid', 'face', [0, 1]); expect(e.dissolve()).toBe(true); },
    'Select one edge of the cube (2 for edge select, click it) and press Ctrl+B': (e) => { edit(e, 'Block', 'edge', []); const m = e.editObject!.mesh!; const [k] = [...m.edges().keys()]; e.selectElement(k, false); expect(e.bevel(0.1, 1)).toBe(true); },
    'Select one of the new horizontal edges (2 for edge select, click it) and press Ctrl+R': (e) => { edit(e, 'Tube', 'edge', []); expect(e.loopCut(16, 17)).toBe(true); },
    'Select one face of the grid (3 for face select, click it) and press I': (e) => { edit(e, 'Grid', 'face', [0]); expect(e.insetRegion(0.1)).toBe(true); },
    'Tab into edit mode on Grid, press 3 for face select, click a corner face': (e) => { edit(e, 'Grid', 'face', [0]); expect(e.extrude(0.5)).toBe(true); },
    'Find the rim: Edit › Select non-manifold': (e) => { e.selectObject(obj(e, 'Open box').id); expect(e.selectNonManifold()).toBe(true); },
    'Fix the last one: Tab for edit mode': (e) => { edit(e, 'Pyramid', 'face', [3]); expect(e.flip()).toBe(true); },
    'Select the left Pyramid': (e) => { runScript(e, `scene.get('Pyramid').mesh.translate([4], [0, 1, 0])`); },
    'Press Tab, select the right pyramid': (e) => { runScript(e, `scene.get('Pyramid, separate faces').mesh.translate([6], [0, 1, 0])`); },
    'Click a tree.': (e) => { runScript(e, `scene.get('Tree 3').rotation = [0, 1, 0]`); },
    'Select "Dining set" and rotate it': (e) => { runScript(e, `scene.get('Dining set').rotation = [0, 0.5, 0]`); },
    'Select a few edges and press Ctrl+B yourself': (e) => { const x = firstEdge(e, 'Crate'); edit(e, 'Crate', 'edge', [EditMesh.edgeKey(x.a, x.b)]); expect(e.bevel(0.02, 1)).toBe(true); },
    'Select two neighbouring faces of a frame': (e) => { edit(e, 'Crate', 'face', firstEdge(e, 'Crate').faces); expect(e.dissolve()).toBe(true); },
    'Tab into "Support loops"': (e) => { edit(e, 'Support loops', 'face', firstEdge(e, 'Support loops').faces); expect(e.dissolve()).toBe(true); },
    'Go to a top key and set it to "ease"': (e) => { obj(e, 'Ball').anim!.position![0].interp = 'ease'; },
    'Select Shoulder and look at the Timeline': (e) => { e.selectObject(obj(e, 'Shoulder').id); },
    'Press Space to pause, then Ctrl+Tab': (e) => { e.selectObject(obj(e, 'Rig').id); e.enterPose(); e.setBonePose('Head', [0.3, 0, 0]); },
    'Select Character and use Heat map › Bone weights': (e) => { e.activeBone = 'Spine'; expect(e.showField({ kind: 'weight', bone: 'Spine' }, obj(e, 'Character').id)).toBe(true); },
    'Brush Draw, Value 1': (e) => { e.beginStroke(); e.strokeDab(chest(e)); e.endStroke(); },
    'Turn on X-mirror': (e) => { e.paint = { ...e.paint, mirror: true }; for (let k = 0; k < 2; k++) { e.beginStroke(); e.strokeDab(chest(e)); e.endStroke(); } },
    'Press Tab on the rig: Edit bones. Click the Arm': (e) => { e.selectObject(obj(e, 'Rig').id); e.enterBoneEdit(); e.selectJoint({ bone: 'Arm', part: 'tail' }); expect(e.extrudeBone()).toBe(true); },
    'Select the new bone and use Object › Trace the rest matrix': (e) => { e.selectObject(obj(e, 'Rig').id); e.activeBone = obj(e, 'Rig').bones!.at(-1)!.name; expect(e.traceRestMatrixOf()).toBe(true); },
    'Pause (Space) and press Tab on the rig': (e) => { runScript(e, `scene.get('Tentacle rig').addBone({ name: 'Seg 6', parent: 'Seg 5', head: [0, 2.5, 0], tail: [0, 3, 0] })`); },
    'Still in Edit bones, set Roll to 90': (e) => { e.selectObject(obj(e, 'Tentacle rig').id); e.enterBoneEdit(); e.setBone('Seg 1', { roll: Math.PI / 2 }); },
    'Ctrl+Tab for pose mode: bend a segment': (e) => { e.selectObject(obj(e, 'Tentacle rig').id); e.enterPose(); e.setBonePose('Seg 2', [0.4, 0, 0]); },
    'Select each shape and switch Heat map': (e) => { expect(e.showField({ kind: 'mean' }, obj(e, 'Cylinder').id)).toBe(true); },
    'Tab into edit mode, select a different vertex': (e) => { expect(e.showField({ kind: 'geodesic', sources: [40] }, obj(e, 'Trefoil').id)).toBe(true); },
    'Select "Smoothed ×5" and Heat map': (e) => { expect(e.showField({ kind: 'mean' }, obj(e, 'Smoothed ×5').id)).toBe(true); },
    'Tab into edit mode on "Bumpy"': (e) => { edit(e, 'Bumpy', 'vert', [0, 1, 2, 3]); expect(e.smoothVerts(5, 0.5)).toBe(true); },
    'Try it yourself: Tab into edit mode on a new cube': (e) => { runScript(e, `scene.add.cube({ name: 'Mine' }).mesh.seamsFromSharp(60)`); edit(e, 'Mine', 'face', [0, 1, 2, 3, 4, 5]); expect(e.unwrap()).toBe(true); },
    'The Shader tab shows the selected sphere': (e) => { runScript(e, `scene.get('Custom').material.glsl = 'return base * 0.5;'`); },
    'Drag the Light object (the sun) to one side': (e) => { runScript(e, `scene.get('Light').position = [4, 6, 0]`); },
    'Move the Light object': (e) => { runScript(e, `scene.get('Light').position = [2, 6, 1]`); },
    'In the inspector, turn the mirror and subdivision': (e) => { const c = obj(e, 'Character'); e.updateModifier(c.id, 0, { enabled: false }); },
    'Heat map › Mean curvature: the smooth body': (e) => { expect(e.showField({ kind: 'mean' }, obj(e, 'Character').id)).toBe(true); },
    'Press 0 to look through the camera': (e) => { e.setFrame(60); },
    'In the Inspector, set Field of view to 25': (e) => { e.setCameraFov(obj(e, 'Camera').id, 25); },
    'Heat map › Height (y) shows the rings': (e) => { expect(e.showField({ kind: 'coord', axis: 1 }, obj(e, 'Vase').id)).toBe(true); },
  };

  it('every action above belongs to exactly one checked step', () => {
    const checked = PROJECTS.flatMap((p) => p.guide.filter((g) => typeof g !== 'string').map(stepText));
    for (const k of Object.keys(act)) expect(checked.filter((t) => t.startsWith(k)), k).toHaveLength(1);
    expect(checked.length).toBe(Object.keys(act).length);
  });

  for (const p of PROJECTS) {
    p.guide.forEach((g, i) => {
      if (typeof g === 'string') return;
      it(`${p.id}, step ${i + 1}: not ticked when the project opens; ticked once you do it`, () => {
        const e = new Editor();
        expect(openProject(e, p, py).error).toBeNull();
        const start = startState(e);
        expect(g.done(e, start)).toBe(false);
        const key = Object.keys(act).find((k) => g.text.startsWith(k))!;
        act[key](e);
        expect(g.done(e, start)).toBe(true);
      });
    });
  }

  it('local-and-global-axes, step 3: a drag along the world\'s x does not count', () => {
    const e = new Editor(), p = PROJECTS.find((x) => x.id === 'local-and-global-axes')!;
    expect(openProject(e, p, py).error).toBeNull();
    const start = startState(e), g = p.guide[2];
    runScript(e, `scene.get('Crate').position.x += 0.5`);
    expect(typeof g !== 'string' && g.done(e, start)).toBe(false);
  });
});
