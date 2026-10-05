// Checks for the Modelling & Geometry Processing course that the lesson
// checkers can't make: every link into MeshLab opens something real, the
// notebook challenges grade correctly, and cells print what the prose says.
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { meshLabLink, parseMeshLabLink } from '../../labs/mesh-lab/links';
import lesson1, { checkHouse } from './1-meshes-as-data/001-vertices-and-faces.js';
import lesson2, { checkWinding } from './1-meshes-as-data/002-winding-and-normals.js';
import lesson3, { checkClosed } from './1-meshes-as-data/003-edges-and-neighbours.js';
import lesson4, { checkJoined } from './1-meshes-as-data/004-connected-pieces.js';
import lesson5, { checkFrame } from './1-meshes-as-data/005-eulers-formula.js';
import lesson6, { checkDistance } from './1-meshes-as-data/006-welding-and-filling.js';
import lesson7, { checkObj } from './1-meshes-as-data/007-obj-and-gltf.js';
import lesson21, { checkLight } from './2-vectors-and-transforms/001-vectors-dot-and-cross.js';
import lesson22, { checkMatrix } from './2-vectors-and-transforms/002-translate-rotate-scale.js';
import lesson23, { checkOrder } from './2-vectors-and-transforms/003-order-matters.js';
import lesson24, { checkScale } from './2-vectors-and-transforms/004-the-determinant.js';
import lesson25, { checkReach } from './2-vectors-and-transforms/005-hierarchies.js';
import lesson26, { checkMove } from './2-vectors-and-transforms/006-local-and-global-axes.js';
import lesson27, { checkTwins } from './2-vectors-and-transforms/007-euler-angles-and-gimbal-lock.js';
import lesson28, { checkGrouping } from './2-vectors-and-transforms/008-numbers-you-can-type.js';
import lesson31, { checkFraming } from './3-from-scene-to-screen/001-cameras.js';
import lesson32, { checkPixel } from './3-from-scene-to-screen/002-projection.js';
import lesson33, { checkWeights } from './3-from-scene-to-screen/003-rasterization.js';
import lesson34, { checkNear } from './3-from-scene-to-screen/004-the-depth-buffer.js';
import lesson35, { checkCorner } from './3-from-scene-to-screen/005-flat-and-smooth-shading.js';
import lesson36, { checkThickness } from './3-from-scene-to-screen/006-lines-outlines-and-overlays.js';
import lesson37, { checkWide } from './3-from-scene-to-screen/007-a-camera-and-a-still.js';
import lesson41, { checkHit } from './4-interacting-with-3d/001-picking-by-ray.js';
import lesson42, { checkSegment } from './4-interacting-with-3d/002-picking-in-screen-space.js';
import lesson43, { checkLoop } from './4-interacting-with-3d/003-box-and-loop-selection.js';
import lesson44, { checkClosest } from './4-interacting-with-3d/004-dragging-with-a-gizmo.js';
import lesson45, { checkCrossing } from './4-interacting-with-3d/005-the-knife.js';
import lesson46, { checkStacks } from './4-interacting-with-3d/006-undo-and-redo.js';
import lesson47, { checkLine } from './4-interacting-with-3d/007-every-click-is-code.js';
import lesson51, { checkBlock } from './5-modelling-operations/001-extrude.js';
import lesson52, { checkCorner120 } from './5-modelling-operations/002-inset.js';
import lesson53, { checkTwoCuts } from './5-modelling-operations/003-edge-rings-and-loop-cuts.js';
import lesson54, { checkSegments } from './5-modelling-operations/004-bevel.js';
import lesson55, { checkGridDissolve } from './5-modelling-operations/005-dissolve-and-delete.js';
import lesson56, { checkShrink } from './5-modelling-operations/006-merge-and-smooth-vertices.js';
import lesson57, { checkMirrorCounts } from './5-modelling-operations/007-mirror-and-modifiers.js';
import lesson58, { checkCage } from './5-modelling-operations/008-box-modelling-a-character.js';
import lesson59, { checkThrees } from './5-modelling-operations/009-clean-topology.js';
import lesson61, { checkChaikin } from './6-subdivision/001-corner-cutting.js';
import lesson62, { checkBump } from './6-subdivision/002-catmull-clark.js';
import lesson63, { checkLimit } from './6-subdivision/003-extraordinary-vertices-and-limits.js';
import lesson64, { checkWidest } from './6-subdivision/004-keeping-edges-sharp.js';
import lesson65, { checkUVVerts } from './6-subdivision/005-subdividing-uvs.js';
import lesson71, { checkDiverging } from './7-geometry-on-a-surface/001-fields-and-colour-maps.js';
import lesson72, { checkCotan } from './7-geometry-on-a-surface/002-the-laplacian.js';
import lesson73, { checkCurvatures } from './7-geometry-on-a-surface/003-mean-curvature.js';
import lesson74, { checkDefects } from './7-geometry-on-a-surface/004-gaussian-curvature.js';
import lesson75, { checkStorage } from './7-geometry-on-a-surface/005-sparse-linear-systems.js';
import lesson76, { checkTube } from './7-geometry-on-a-surface/006-distance-on-a-surface.js';
import lesson77, { checkZigzag } from './7-geometry-on-a-surface/007-smoothing-as-heat-flow.js';
import lesson78, { checkContourSegment } from './7-geometry-on-a-surface/008-level-sets-and-contours.js';
import lesson81, { checkWedges } from './8-uvs/001-what-uvs-are.js';
import lesson82, { checkSeamCount } from './8-uvs/002-seams-and-charts.js';
import lesson83, { checkRoof } from './8-uvs/003-projection.js';
import lesson84, { checkConformal } from './8-uvs/004-conformal-maps-and-lscm.js';
import lesson85, { checkSigmas } from './8-uvs/005-measuring-distortion.js';
import lesson86, { checkTexels } from './8-uvs/006-straighten-and-pack.js';
import lesson91, { checkLambertPixel } from './9-shading-and-textures/001-light-and-the-cosine-law.js';
import lesson92, { checkShininess } from './9-shading-and-textures/002-highlights.js';
import lesson93, { checkFresnel } from './9-shading-and-textures/003-physically-based-shading.js';
import lesson94, { checkBandEdge } from './9-shading-and-textures/004-stylised-shading.js';
import lesson95, { checkDecode } from './9-shading-and-textures/005-debug-views.js';
import lesson96, { checkBrick } from './9-shading-and-textures/006-procedural-textures.js';
import lesson97, { checkErrorLine } from './9-shading-and-textures/007-write-a-shader.js';
import lesson101, { checkKeyValue } from './10-animation/001-keyframes.js';
import lesson102, { checkFallFrames } from './10-animation/002-interpolation-and-easing.js';
import lesson103, { checkQuat } from './10-animation/003-quaternions.js';
import lesson104, { checkSlerpWeight } from './10-animation/004-slerp.js';
import lesson105, { checkTip } from './10-animation/005-motion-through-a-hierarchy.js';
import lesson106, { checkWalkSpeed } from './10-animation/006-a-walk-cycle.js';
import lesson107, { checkClipBytes } from './10-animation/007-animation-in-files.js';
import lesson111, { checkBoneTurn } from './11-rigging-and-skinning/001-bones.js';
import lesson112, { checkPoseTail } from './11-rigging-and-skinning/002-posing.js';
import { evalExpr } from '../../engines/mesh/core/expr';

// fileURLToPath, not .pathname: on Windows a file URL keeps a leading slash
// before the drive letter and percent-encodes spaces, so the naive version
// builds 'C:\C:\...%20...' and every read from it fails. This test reported a
// missing file rather than whatever it was checking - a test that cannot run is
// not a test that passes.
const dir = fileURLToPath(new URL('.', import.meta.url));
const lessonFiles = readdirSync(dir)
  .filter((d) => statSync(join(dir, d)).isDirectory())
  .flatMap((d) => readdirSync(join(dir, d)).filter((f) => f.endsWith('.js')).map((f) => join(dir, d, f)));

describe('links into MeshLab', () => {
  const links = lessonFiles.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/#\/lab\/mesh-lab\?[^)\s'"]*/g)].map((m) => ({ file: f, href: m[0] })));

  it('the course has lessons, and they link into MeshLab', () => {
    expect(lessonFiles.length).toBeGreaterThan(0);
    expect(links.length).toBeGreaterThan(0);
  });

  it('every link names a project or challenge that exists', () => {
    for (const { file, href } of links) {
      const target = parseMeshLabLink(href);
      expect(target, `${file}: ${href}`).not.toBeNull();
      expect(() => meshLabLink(target.kind, target.id), `${file}: ${href}`).not.toThrow();
    }
  });
});

describe('lesson 1: a mesh is two lists', () => {
  const cells = lesson1.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const withFaces = (faces) => `const faces = ${faces};`;

  it('the house solution passes; the start is open, with every missing piece counted', () => {
    expect(checkHouse(challenge.solutionCode)).toMatchObject({ pass: true, message: expect.stringContaining('30 corner slots') });
    const start = checkHouse(challenge.startCode);
    expect(start.pass).toBe(false);
    expect(start.message).toMatch(/^1 face so far, and the house is still open: 15 of its 15 edges/);
    expect(start.message).toMatch(/Vertices 4, 5, 6, 7, 8, 9 aren’t in any face yet/);
  });

  it('any start corner and either direction is the same face', () => {
    const rotated = '[[1,2,3,0],[5,6,2,1],[4,0,3,7],[9,7,3,2,6],[8,5,1,0,4],[8,4,7,9],[6,5,8,9]]';
    expect(checkHouse(withFaces(rotated)).pass).toBe(true);
  });

  it('names each kind of mistake', () => {
    const say = (faces) => checkHouse(withFaces(faces)).message;
    expect(say('[[0,1,2,3],[1,5,6]]')).toMatch(/Face 1 goes straight from vertex 6 to vertex 1/);
    expect(say('[[0,1,3,2]]')).toMatch(/Face 0 goes straight from vertex 1 to vertex 3/); // the bow-tie
    expect(say('[[0,1,2,3],[1,5,10,2]]')).toMatch(/Face 1 uses vertex 10, but the vertices are numbered 0 to 9/);
    expect(say('[[0,1]]')).toMatch(/Face 0 has 2 corners/);
    expect(say('[[0,1,2,3],[0,1,1,2]]')).toMatch(/same corner twice/);
    expect(say('[[1,2,6,9,8,5]]')).toMatch(/don’t all lie in one flat plane/); // side wall + roof slope
    expect(say('[[0,1,2,3],[3,2,1,0]]')).toMatch(/Faces 0 and 1 cover the same piece/);
    expect(say('[[0,1,2,3],[0,1,5,8,4],[0,1,5,8,4,0]]')).toMatch(/same corner twice/);
    expect(say('oops')).toMatch(/Couldn’t read your face list/);
  });

  it('the reading cell prints the degrees and the two equal counts from the prose', () => {
    const reading = cells[2];
    const out = [];
    new Function('console', reading.startCode)({ log: (s) => out.push(s) });
    expect(out).toEqual([
      'face 2 = [2,1,4]',
      'its corners: [[1,0,1],[1,0,-1],[0,1.5,0]]',
      'degree of each vertex: [3,3,3,3,4]',
      'corner slots in the face list: 16   sum of degrees: 16',
      'no problems found',
    ]);
  });

  it('the separate-faces cell makes 16 vertices and names face 1’s tip 6', () => {
    const src = cells[1].startCode.slice(0, cells[1].startCode.indexOf('var slider'));
    const out = [];
    new Function('console', src)({ log: (s) => out.push(s) });
    expect(out).toEqual(['16 vertices, 5 faces', 'faces = [[0,1,2,3],[4,5,6],[7,8,9],[10,11,12],[13,14,15]]', 'face 1 calls its tip vertex 6']);
  });

  it('the worked cube follows its numbering rule, and every step round a face is a real edge', () => {
    const verts = Array.from({ length: 8 }, (_, i) => [i % 2, Math.floor(i / 2) % 2, Math.floor(i / 4)]);
    const faces = [[0, 4, 6, 2], [1, 3, 7, 5], [0, 1, 5, 4], [2, 6, 7, 3], [0, 2, 3, 1], [4, 5, 7, 6]];
    const ex3 = lesson1.examples[2];
    expect(ex3.answer).toContain(JSON.stringify(verts).slice(1, -1).replace(/\],\[/g, '], ['));
    for (const f of faces) {
      f.forEach((a, k) => { const b = f[(k + 1) % 4]; expect(verts[a].filter((c, j) => c !== verts[b][j]).length).toBe(1); });
      // one side of the cube: its four corners share the coordinate fixed on that side
      expect([0, 1, 2].some((j) => f.every((i) => verts[i][j] === verts[f[0]][j]))).toBe(true);
    }
    expect(new Set(faces.flat()).size).toBe(8);
    expect(faces.flat().length).toBe(24);
  });
});

describe('lesson 2: winding and normals', () => {
  const cells = lesson2.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  // A cell's own code, without the drawing appended by withPicture, run with a stand-in for show().
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('the cross-product cell prints the two opposite vectors from the prose', () => {
    expect(run(cells[0]).out).toEqual(['A, B, C: 0, 0, 2', 'A, C, B: 0, 0, -2']);
  });

  it('the Newell cell prints every pyramid normal pointing out, matching examples 2 and 3', () => {
    const { out, shown } = run(cells[1]);
    expect(out).toEqual([
      'face 0 normal 0, -1, 0',
      'face 1 normal 0, 0.555, -0.832',
      'face 2 normal 0.832, 0.555, 0',
      'face 3 normal 0, 0.555, 0.832',
      'face 4 normal -0.832, 0.555, 0',
    ]);
    expect(shown).toHaveLength(1);
  });

  it('the bent quad: two answers from three corners, Newell between them', () => {
    expect(run(cells[2]).out).toEqual([
      'first three corners: 0, -0.371, 0.928',
      'last three corners:  -0.371, 0, 0.928',
      'Newell, all four:    -0.192, -0.192, 0.962',
    ]);
  });

  it('the challenge: the solution passes, the start names both inward faces', () => {
    expect(checkWinding(challenge.solutionCode).pass).toBe(true);
    expect(checkWinding(challenge.startCode)).toEqual({ pass: false, message: expect.stringMatching(/^Faces 2 and 3 still point into the pyramid/) });
  });

  it('names each kind of mistake', () => {
    const list = (faces) => `const faces = [\n${faces.map((f) => `  ${JSON.stringify(f)},`).join('\n')}\n]`;
    const right = [[0, 1, 2, 3], [1, 0, 4], [2, 1, 4], [3, 2, 4], [0, 3, 4]];
    const say = (faces) => checkWinding(list(faces)).message;
    expect(checkWinding(list(right)).pass).toBe(true);
    expect(checkWinding(list([[1, 2, 3, 0], [0, 4, 1], [4, 2, 1], [2, 4, 3], [3, 4, 0]])).pass).toBe(true); // rotations
    expect(say([[0, 3, 2, 1], ...right.slice(1)])).toMatch(/^Face 0 still points into/);
    expect(say([...right.slice(0, 4), [0, 4, 3]])).toMatch(/^Face 4 still points into/);
    expect(say([...right.slice(0, 2), [2, 1, 3], ...right.slice(3)])).toMatch(/Face 2 now has different corners/);
    expect(say([[0, 2, 1, 3], ...right.slice(1)])).toMatch(/Face 0 now has different corners/); // a bow-tie
    expect(say(right.slice(0, 4))).toMatch(/has 4 entries/);
    expect(checkWinding('let faces = 1').message).toMatch(/Keep the list as const faces/);
    expect(checkWinding('const faces = [\n  [0, 1,\n]').message).toMatch(/could not be read|Keep the list/);
  });
});

describe('lesson 3: edges and neighbours', () => {
  const cells = lesson3.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('the cube: 12 edges, each on two faces, and 24 slots = 2 × 12', () => {
    const { out } = run(cells[0]);
    expect(out).toHaveLength(14);
    expect(out.slice(0, 12).every((l) => /^\d-\d: faces \d, \d$/.test(l))).toBe(true);
    expect(out.slice(12)).toEqual(['12 edges: 0 open, 12 shared by two faces', 'corner slots: 24 = 2 × 12']);
  });

  it('the unsorted key files each edge twice', () => {
    expect(run(cells[1]).out).toEqual(['24 entries, 24 of them with only one face', "'0-4': faces 0   '4-0': faces 2"]);
  });

  it('the open box: the four rim edges, the slot sum, and one picture', () => {
    const { out, shown } = run(cells[2]);
    expect(out).toEqual(['12 edges, 4 open: 2-6, 3-7, 2-3, 6-7', 'corner slots: 20 = 2 × 8 + 1 × 4']);
    expect(shown).toHaveLength(1);
  });

  it('neighbours match example 3, and the cost line matches the rigor section and challenge 3', () => {
    expect(run(cells[3]).out).toEqual(['face 0: 2, 4, -, 3', 'face 1: 3, -, 4, 2', 'face 2: 3, 1, 4, 0', 'face 3: 0, -, 1, 2', 'face 4: 2, 1, -, 0', '10000 quads: 49995000 pairs of faces to compare, or 40000 lookups']);
    expect(lesson3.examples[2].answer).toMatch(/^3, -, 4, 2/);
  });

  it('the challenge: the solution passes; the start names the fin\'s edge first', () => {
    expect(checkClosed(challenge.solutionCode).pass).toBe(true);
    expect(checkClosed(challenge.startCode).message).toMatch(/^Edge 0-1 is on 3 faces \(2, 3, 5\)\. /);
  });

  it('names each kind of mistake', () => {
    const list = (faces) => `const faces = [\n${faces.map((f) => `  ${JSON.stringify(f)},`).join('\n')}\n]`;
    const sides = [[0, 4, 6, 2], [1, 3, 7, 5], [0, 1, 5, 4], [2, 6, 7, 3], [0, 2, 3, 1], [4, 5, 7, 6]];
    const say = (faces) => checkClosed(list(faces)).message;
    expect(checkClosed(list(sides)).pass).toBe(true);
    expect(say(sides.filter((_, i) => i !== 3))).toBe('Edges 2-6, 3-7, 2-3, 6-7 are on only one face: the surface is open there.');
    expect(say([...sides, [0, 1, 7, 6]])).toMatch(/^Edge 0-1 is on 3 faces \(2, 4, 6\), and so is edge 6-7\./);
    expect(say(sides.map((f, i) => (i === 3 ? [2, 3, 7, 6] : f)))).toMatch(/^Faces 0 and 3 both go from vertex 6 to vertex 2\./);
    expect(say([...sides, [0, 2, 6, 4]])).toMatch(/^Edge 0-4 is on 3 faces \(0, 2, 6\)/);   // a side listed twice
    expect(say([[0, 1, 2], [0, 2, 1]])).toMatch(/not every vertex is used/);
    expect(say([[0, 1], ...sides])).toMatch(/^Face 0 has 2 corners/);
    expect(say([[0, 1, 8, 2]])).toMatch(/numbered 0 to 7/);
    expect(say([[0, 1, 1, 2]])).toMatch(/same corner twice/);
    // Closed and consistent on all 8 corners, but not the six sides: each side cut into two triangles.
    expect(say(sides.flatMap(([a, b, c, d]) => [[a, b, c], [a, c, d]]))).toBe('The box has 6 sides; the list has 12 faces.');
  });
});

describe('lesson 4: connected pieces', () => {
  const cells = lesson4.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('breadth-first search: the queues of example 1, face 1 last, two pieces', () => {
    const { out } = run(cells[0]);
    expect(out.slice(0, 2)).toEqual(['visit 0: queue 2, 5, 3, 4', 'visit 2: queue 5, 3, 4, 1']);
    expect(out[5]).toBe('visit 1: queue empty');
    expect(out.filter((l) => l.startsWith('piece'))).toEqual(['piece 1: faces 0, 2, 5, 3, 4, 1', 'piece 2: faces 6, 8, 11, 9, 10, 7']);
    expect(lesson4.examples[0].answer).toBe('After face 0: 2, 5, 3, 4. After face 2: 5, 3, 4, 1.');
  });

  it('the shared corner: two pieces by edges, one by vertices, coloured by piece', () => {
    const { out, shown } = run(cells[1]);
    expect(out).toEqual(['15 vertices; by shared edges: 2 pieces; by shared vertices: 1 piece']);
    expect(shown[0].groups).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
  });

  it('a stack visits the same faces in another order', () => {
    expect(run(cells[2]).out).toEqual(['queue (breadth-first): 0, 2, 5, 3, 4, 1', 'stack (depth-first):   0, 4, 1, 3, 5, 2', 'same faces: true']);
  });

  it('the challenge: the solution passes; the start says two pieces', () => {
    expect(checkJoined(challenge.solutionCode).pass).toBe(true);
    expect(checkJoined(challenge.startCode).message).toBe('Still 2 pieces: faces 0 | 1.');
  });

  it('names each kind of mistake', () => {
    const list = (faces) => `const faces = [\n${faces.map((f) => `  ${JSON.stringify(f)},`).join('\n')}\n]`;
    const say = (...extra) => checkJoined(list([[0, 1, 2, 3], [4, 5, 6, 7], ...extra])).message;
    expect(checkJoined(list([[0, 1, 2, 3], [4, 5, 6, 7], [1, 4, 2], [4, 7, 2]])).pass).toBe(true);   // two triangles also join them
    expect(say([1, 4, 7])).toBe('Still 2 pieces: faces 0 | 1, 2. They meet only at vertex 1: pieces join where faces share an edge, not a corner.');
    expect(say([2, 7, 4, 1])).toMatch(/^Faces 0 and 2 both go from vertex 1 to vertex 2/);
    expect(say([1, 4, 7, 2], [1, 4, 7, 2])).toMatch(/^Edge 1-2 is on 3 faces \(0, 2, 3\)/);   // the bridge added twice
    expect(checkJoined(list([[0, 1, 2, 3], [1, 4, 7, 2]])).message).toMatch(/^Keep faces 0 and 1 as they are/);
    expect(say([1, 4])).toMatch(/^Face 2 has 2 corners/);
    expect(say([1, 4, 9])).toMatch(/numbered 0 to 7/);
  });
});

describe("lesson 5: Euler's formula", () => {
  const cells = lesson5.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('three solids give 2', () => {
    expect(run(cells[0]).out).toEqual(['cube:    8 − 12 + 6 = 2', 'pyramid: 5 − 8 + 5 = 2', 'prism:   6 − 9 + 5 = 2']);
  });

  it('Euler operations: the changes the math section lists, and χ stays 2 (example 2)', () => {
    expect(run(cells[1]).out).toEqual([
      'cube:                   8 − 12 + 6 = 2',
      'a diagonal on face 0:   8 − 13 + 7 = 2',
      'face 0 poked:           9 − 16 + 9 = 2',
      'face 1 extruded:        12 − 20 + 10 = 2',
    ]);
    expect(lesson5.examples[1].answer).toBe('V = 12, E = 20, F = 10, χ = 2: unchanged.');
  });

  it('the torus: nm, 2nm, nm', () => {
    const { out, shown } = run(cells[2]);
    expect(out).toEqual(['torus, 8 × 4: 32 − 64 + 32 = 0']);
    expect(shown).toHaveLength(1);
  });

  it('rims, holes and pieces', () => {
    expect(run(cells[3]).out).toEqual(['open box: 8 − 12 + 5 = 1, b = 1, g = 0', 'tube:     8 − 12 + 4 = 0, b = 2, g = 0', 'two cubes: 16 − 24 + 12 = 4: 2 for each piece']);
  });

  it('the challenge: the solution passes; the start names the open edges round the hole', () => {
    expect(checkFrame(challenge.solutionCode)).toEqual({ pass: true, message: expect.stringMatching(/^Closed, and V − E \+ F = 16 − 32 \+ 16 = 0/) });
    expect(checkFrame(challenge.startCode).message).toBe('Edges 12-13, 13-14, 14-15, 12-15, 4-5, 5-6, 6-7, 4-7 are on only one face: the frame is still open there.');
  });

  it('names each kind of mistake', () => {
    const shell = [[12, 13, 9, 8], [13, 14, 10, 9], [14, 15, 11, 10], [15, 12, 8, 11], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [8, 9, 1, 0], [9, 10, 2, 1], [10, 11, 3, 2], [11, 8, 0, 3]];
    const walls = [[4, 5, 13, 12], [5, 6, 14, 13], [6, 7, 15, 14], [7, 4, 12, 15]];
    const list = (faces) => `const faces = [\n${faces.map((f) => `  ${JSON.stringify(f)},`).join('\n')}\n]`;
    const say = (faces) => checkFrame(list(faces)).message;
    expect(checkFrame(list([...shell, ...walls])).pass).toBe(true);
    expect(say([...shell, [12, 13, 14, 15].reverse(), [4, 5, 6, 7]])).toMatch(/^Closed, but V − E \+ F = 16 − 28 \+ 14 = 2: that is a sphere's count/);   // the hole capped
    expect(say([...shell, walls[0], walls[1], walls[2], [7, 15, 12, 4]])).toMatch(/^Faces 3 and 15 both go from vertex 15 to vertex 12/);
    expect(say([...shell, ...walls, walls[0]])).toMatch(/^Edge 12-13 is on 3 faces \(0, 12, 16\)/);   // a wall listed twice
    expect(say([...shell, [4, 5, 16]])).toMatch(/numbered 0 to 15/);
  });
});

describe('lesson 6: welding and filling', () => {
  const cells = lesson6.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('floating point: equal fails, within a distance holds', () => {
    expect(run(cells[0]).out).toEqual(['0.1 + 0.2 === 0.3: false', '0.1 + 0.2 = 0.30000000000000004', 'within 1e-9: true']);
  });

  it('cell walls, both ways of choosing cells', () => {
    expect(run(cells[1]).out).toEqual([
      'rounding: 0.0049 → cell 0, 0.0051 → cell 1: 0.0002 apart, different cells',
      'flooring: 0.0099 → cell 0, 0.0101 → cell 1: the same problem at another wall',
      '0.0101 looks in cells 0, 1, 2 and finds 0.0099, 0.0002 away',
    ]);
  });

  it('the scanned box: 20 → 8 vertices, 4 open edges left (example 2)', () => {
    const { out, shown } = run(cells[2]);
    expect(out.slice(0, 2)).toEqual(['as scanned:          20 vertices, 20 edges, 20 open', 'welded within 0.001: 8 vertices, 12 edges, 4 open']);
    expect(out[2].split(' ')).toHaveLength(3 + 20);   // 'copy → vertex:' and one number per copy
    expect(shown[0].verts).toHaveLength(8);
  });

  it('the fill: the lid of example 3, and the box closed', () => {
    const { out } = run(cells[3]);
    expect(out).toHaveLength(3);
    const lid = out[1].replace('new face: ', '').split(', ').map(Number);
    const rotations = [0, 1, 2, 3].map((k) => [...[2, 6, 7, 3].slice(k), ...[2, 6, 7, 3].slice(0, k)].join());
    expect(rotations).toContain(lid.join());
    expect(out[2]).toBe('closed, every edge walked both ways: true');
  });

  it('the challenge: the window is the copy error up to the thickness', () => {
    const at = (d) => checkDistance(`const distance = ${d}`);
    expect(checkDistance(challenge.solutionCode).pass).toBe(true);
    expect(checkDistance(challenge.startCode).message).toMatch(/^At 0\.00001: 24 vertices and 24 open edges\. Some copies/);
    expect(at(0.0005).message).toMatch(/^At 0\.0005: 11 vertices/);
    expect([0.0006, 0.001, 0.04].map((d) => at(d).pass)).toEqual([true, true, true]);
    expect(at(0.06).message).toMatch(/^At 0\.06: 4 vertices and 2 faces\. That is too far/);
    expect(at(0).message).toBe('The distance must be more than 0.');
    expect(checkDistance('let d = 2').message).toMatch(/^Keep the line/);
  });
});

describe('lesson 7: OBJ and glTF', () => {
  const cells = lesson7.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('writes the pyramid as OBJ, every corner plus 1 (example 1)', () => {
    expect(run(cells[0]).out).toEqual(['o Pyramid\nv -1 0 -1\nv 1 0 -1\nv 1 0 1\nv -1 0 1\nv 0 1.5 0\nf 1 2 3 4\nf 2 1 5\nf 3 2 5\nf 4 3 5\nf 1 4 5']);
  });

  it('reads it back, slashes and negative numbers included (example 2)', () => {
    expect(run(cells[1]).out).toEqual(['5 vertices; faces [[0,1,2,3],[1,0,4],[2,1,4],[3,2,4],[0,3,4]]', 'same as the lists we started from: true']);
  });

  it('the glTF sizes the math section works out', () => {
    expect(run(cells[2]).out).toEqual([
      'triangles: 6 (the square base became 2)',
      'positions: 5 × 3 floats × 4 bytes = 60 bytes',
      'indices: 18 × 2 bytes = 36 bytes',
      'buffer: 96 bytes, 128 characters of base64',
      'position accessor: {"bufferView":0,"componentType":5126,"count":5,"type":"VEC3","min":[-1,0,-1],"max":[1,1.5,1]}',
    ]);
  });

  it('decoding gives back the same points and 6 triangles', () => {
    const { out, shown } = run(cells[3]);
    expect(out).toEqual(['decoded: 5 vertices, 6 triangles', 'the same points: true']);
    expect(shown[0].faces).toEqual([[0, 1, 2], [0, 2, 3], [1, 0, 4], [2, 1, 4], [3, 2, 4], [0, 3, 4]]);
  });

  it('the challenge: the solution passes; the start names the 0', () => {
    expect(checkObj(challenge.solutionCode).pass).toBe(true);
    expect(checkObj(challenge.startCode).message).toBe('"f 0 1 2 3": OBJ counts vertices from 1, so there is no vertex 0.');
    // The buggy file still reads two faces, both wrong: the lines without a 0 shift every corner by one.
    expect(run(challenge).out[0]).toBe('2 faces read: [[1,0,3],[2,1,3]]');
  });

  it('names each kind of mistake', () => {
    const file = (f) => `const obj = \`o Pyramid\nv -1 0 -1\nv 1 0 -1\nv 1 0 1\nv -1 0 1\nv 0 1.5 0\n${f.join('\n')}\``;
    const right = ['f 1 2 3 4', 'f 2 1 5', 'f 3 2 5', 'f 4 3 5', 'f 1 4 5'];
    const say = (f) => checkObj(file(f)).message;
    expect(checkObj(file(right)).pass).toBe(true);
    expect(checkObj(file(['f 2 3 4 1', 'f -4 -5 -1', 'f 3 2 5', 'f 4 3 5', 'f 1 4 5'])).pass).toBe(true);   // rotations and negatives read the same
    expect(say(['f 1 2 3 4', 'f 2 1 6', ...right.slice(2)])).toBe('"f 2 1 6" names vertex 6, but the file has 5 vertices.');
    expect(say(['f 4 3 2 1', ...right.slice(1)])).toMatch(/^"f 4 3 2 1" reads as a face going the wrong way round/);
    expect(say(['f 1 2 5', ...right.slice(1)])).toMatch(/^"f 1 2 5" reads as a face going the wrong way round/);   // face 1 reversed
    expect(say(['f 1 3 5', ...right.slice(1)])).toMatch(/^"f 1 3 5" reads as corners 0, 2, 4, which is not a face/);
    expect(say([...right.slice(0, 4), 'f 2 1 5'])).toBe('Two f lines are the same face, so one face of the pyramid is missing.');
    expect(say(right.slice(0, 4))).toBe('The pyramid has 5 faces; the file has 4 f lines.');
    expect(checkObj('const obj = `o P\nv 0 0 0`').message).toMatch(/^Leave the five v lines/);
  });
});

describe('lesson 2.1: vectors, dot and cross', () => {
  const cells = lesson21.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('vectors and lengths (example 1)', () => {
    expect(run(cells[0]).out).toEqual(['u = 2, 0, 0   |u| = 2', 'v = 1, 1.5, 1   |v| = 2.0616', 'v made length 1: 0.4851, 0.7276, 0.4851']);
  });

  it('angles: 60.98°, 90°, 135°', () => {
    expect(run(cells[1]).out).toEqual([
      'base corner to the tip : u · v = 2, angle 60.9829°',
      'two base edges         : u · v = 0, angle 90°',
      'out and back           : u · v = -1, angle 135°',
    ]);
  });

  it('projection: the height agrees with the cross product', () => {
    expect(run(cells[2]).out).toEqual(['along u: 1, 0, 0   at right angles: 0, 1.5, 1', 'check: (part at right angles) · u = 0', 'area = ½ × base × height = 1.8028;  ½ |u × v| = 1.8028']);
  });

  it('the lit sphere: every face points out, and the lit faces face the light', () => {
    const { out, shown } = run(cells[3]);
    const { verts, faces, values } = shown[0];
    for (const f of faces) {
      const c = f.map((k) => verts[k]), e1 = c[1].map((x, i) => x - c[0][i]), e2 = c[2].map((x, i) => x - c[0][i]);
      const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const mid = c.reduce((a, p) => a.map((x, i) => x + p[i] / c.length), [0, 0, 0]);
      expect(n[0] * mid[0] + n[1] * mid[1] + n[2] * mid[2]).toBeGreaterThan(0);
    }
    expect(values.every((x) => x >= 0 && x <= 1)).toBe(true);
    expect(out[0]).toMatch(/^96 faces, \d+ lit; brightest n · l = 0\.9\d+$/);
  });

  it('the challenge: the solution passes; the start is 56° off; face 4 lit is named', () => {
    const at = (l) => checkLight(`const light = [${l}]`);
    expect(checkLight(challenge.solutionCode).pass).toBe(true);
    expect(checkLight(challenge.startCode).message).toBe('Face 2 gets n · l = 0.555: the light is 56.3° away from its normal, so it gets cos 56.3° of full brightness.');
    expect(at('0.832, 0.555, 0').pass).toBe(true);
    expect(at('0, 0, 0').message).toMatch(/has none/);
    expect(at('1, 2').message).toMatch(/^Keep the line/);
    expect(at('-0.832, -0.555, 0').message).toMatch(/^Face 2 gets n · l = -1\.000/);
  });
});

describe('lesson 2.2: translate, rotate, scale', () => {
  const cells = lesson22.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };
  // The same five places MeshLab's project prints (projects.test.ts).
  const placed = ['0.634, 0, -1.366', '2.366, 0, -2.366', '3.366, 0, -0.634', '1.634, 0, 0.366', '2, 3, -1'];

  it('by hand: the places MeshLab draws them', () => {
    const out = run(cells[0]).out;
    expect(out.map((l) => l.split(' → ')[1])).toEqual(placed);
  });

  it('the rotation matrix: axes and lengths', () => {
    expect(run(cells[1]).out).toEqual(['x axis → 0.866, 0, -0.5', 'y axis → 0, 1, 0', 'z axis → 0.5, 0, 0.866', '|v| = 1.4142, |Rv| = 1.4142']);
  });

  it('M = T·R·S gives the same places, and its fourth column is the position', () => {
    const { out, shown } = run(cells[2]);
    expect(out.slice(0, 4)).toEqual(['[ 0.866  0  0.5  2 ]', '[ 0  2  0  0 ]', '[ -0.5  0  0.866  -1 ]', '[ 0  0  0  1 ]']);
    expect(out[4]).toBe(`v0 → ${placed[0]},  tip → ${placed[4]}`);
    expect(shown[0].verts).toHaveLength(10);
  });

  it('the challenge: the solution passes; identity, S·T and a bad bottom row are each named', () => {
    const rows = (m) => `const M = [\n${m.map((r) => `  [${r.join(', ')}],`).join('\n')}\n]`;
    expect(checkMatrix(challenge.solutionCode).pass).toBe(true);
    expect(checkMatrix(challenge.startCode).message).toBe('M sends v0 (-1, 0, -1) to (-1, 0, -1); it should go to (2, 1, -1).');
    expect(checkMatrix(rows([[1, 0, 0, 3], [0, 2, 0, 2], [0, 0, 1, 0], [0, 0, 0, 1]])).message).toMatch(/^M sends the tip to \(3, 5, 0\): it moves first/);
    expect(checkMatrix(rows([[1, 0, 0, 0], [0, 2, 0, 0], [0, 0, 1, 0], [3, 1, 0, 1]])).message).toMatch(/^The bottom row is 3, 1, 0, 1/);
    expect(checkMatrix(rows([[1, 0, 0, 3], [0, 2, 0, 1], [0, 0, 1, 0]])).message).toMatch(/^M should be 4 rows of 4 numbers/);
  });
});

describe('lesson 2.3: order matters', () => {
  const cells = lesson23.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('R·S and S·R: the columns the math section lists', () => {
    expect(run(cells[0]).out).toEqual(['R·S: [1.4142 0 0.3536] [0 0.5 0] [-1.4142 0 0.3536]', 'S·R: [1.4142 0 1.4142] [0 0.5 0] [-0.3536 0 0.3536]', 'the same: false']);
  });

  it('the boxes: 90° and 28.07° (the angle MeshLab asks for)', () => {
    const { out, shown } = run(cells[1]);
    expect(out).toEqual(['stretch then turn: corner angle 90°', 'turn then stretch: corner angle 28.0725°']);
    expect(shown[0].verts).toHaveLength(16);
  });

  it('moves and turns, and two turns (example 1)', () => {
    expect(run(cells[2]).out).toEqual(['turn, then move: 3, 0, 0   (turns in place, then moves)', 'move, then turn: 0, 0, -3   (swings round the world origin)', 'turn x then y: 0, 0, -1', 'turn y then x: 0, 1, 0']);
  });

  it('decompose: the sheared matrix fails the right-angle check', () => {
    expect(run(cells[3]).out).toEqual(['stretch then turn: scale 2, 0.5, 0.5; angles between columns 90°, 90°, 90°', 'turn then stretch: scale 1.4577, 0.5, 1.4577; angles between columns 90°, 28.0725°, 90°']);
  });

  it('the challenge: every wrong order is named for what it did', () => {
    const say = (o) => checkOrder(`const order = [${o.map((x) => `'${x}'`).join(', ')}]`).message;
    expect(checkOrder(challenge.solutionCode).pass).toBe(true);
    expect(checkOrder(challenge.startCode).message).toMatch(/^It is 2 × 1 × 1: long along x, not z\. It was stretched after it was turned/);
    expect(say(['move', 'rotate', 'scale'])).toBe("Its centre ends at (6, 0, 0), not (0, 0, 3): it was moved before it was turned, so the turn swung it round the world's origin, and then the stretch along x pulled it further out.");
    expect(say(['move', 'scale', 'rotate'])).toBe("Its centre ends at (3, 0, 0), not (0, 0, 3): it was moved before it was turned, so the turn swung it round the world's origin.");
    expect(say(['scale', 'move', 'rotate'])).toMatch(/^Its centre ends at \(3, 0, 0\)/);
    expect(say(['rotate', 'scale', 'move'])).toMatch(/long along x, not z/);
    expect(say(['scale', 'rotate'])).toMatch(/each once/);
  });
});

describe('lesson 2.4: the determinant', () => {
  const cells = lesson24.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('areas in 2D', () => {
    expect(run(cells[0]).out).toEqual(['stretch x by 2: det 2', 'shear (slant): det 1', 'swap x and y (a mirror): det -1', 'squash onto a line: det 0']);
  });

  it('volumes in 3D: the two orders of lesson 2.3 have the same determinant', () => {
    expect(run(cells[1]).out).toEqual(['scale (2, 1, 0.5): det 1', 'turn 30° about y: det 1', 'mirror x: det -1', 'shear: det 1', 'turn, then stretch (2, 0.5, 0.5): det 0.5', 'stretch, then turn: det 0.5']);
  });

  it('signed volume equals the determinant, as MeshLab reports for the mirrored box', () => {
    expect(run(cells[2]).out).toEqual(['unit box: volume 1', 'turned, then stretched: volume 0.5, det 0.5', 'mirrored and widened: volume -1.5, det -1.5']);
  });

  it('a mirror turns every face inside out', () => {
    const { out, shown } = run(cells[3]);
    expect(out).toEqual(['before: 5 of 5 faces point out', 'mirrored: 0 of 5 faces point out']);
    expect(shown).toHaveLength(1);
  });

  it('the challenge: each wrong scale is named', () => {
    const at = (v) => checkScale(`const scale = [${v}]`).message;
    expect(checkScale(challenge.solutionCode).pass).toBe(true);
    expect(checkScale('const scale = [-1, 1, 2]').pass).toBe(true);
    expect(checkScale(challenge.startCode).message).toMatch(/^det = 1, which is positive: nothing is mirrored/);
    expect(at('-2, 2, 1')).toMatch(/^The y scale is 2/);
    expect(at('-2, 1, -1')).toMatch(/two mirrors make a half turn/);
    expect(at('2, 1, -1')).toMatch(/front to back/);
    expect(at('-1, 1, 1')).toMatch(/multiplied by 1, not 2/);
    expect(at('0, 1, 1')).toMatch(/squashes the pyramid flat/);
  });
});

describe('lesson 2.5: hierarchies', () => {
  const cells = lesson25.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('by hand: the origins MeshLab\'s trace computes (example 3)', () => {
    expect(run(cells[0]).out).toEqual(['shoulder 0, 1, 0   elbow -1, 2.732, 0   hand -2.449, 3.12, 0']);
  });

  it('as matrices: the same origins, and the turns add to 75°', () => {
    expect(run(cells[1]).out).toEqual(['shoulder: origin 0, 1, 0, turned 30°', 'elbow: origin -1, 2.732, 0, turned 75°', 'hand: origin -2.449, 3.12, 0, turned 75°']);
  });

  it('turning the elbow moves only what is below it', () => {
    const { out, shown } = run(cells[2]);
    expect(out).toEqual(['elbow 0°: hand at -1.75, 4.031, 0', 'elbow 45°: hand at -2.449, 3.12, 0', 'elbow 90°: hand at -2.299, 1.982, 0']);
    expect(shown[0].groups).toEqual([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 3]);
  });

  it('re-parenting keeps the hand in place', () => {
    expect(run(cells[3]).out).toEqual(['hand, unparented: local position -2.449, 3.12, 0', 'hand under the shoulder: local position -1.061, 3.061, 0, turned 45°', 'check, shoulder × local = world: -2.449, 3.12, 0']);
  });

  it('the challenge: −60° reaches; others say which way to turn', () => {
    const at = (d) => checkReach(`const elbowDeg = ${d}`).message;
    expect(checkReach(challenge.solutionCode).pass).toBe(true);
    expect(run({ startCode: challenge.solutionCode }).out[0]).toBe('hand at -0.25, 4.031, 0, 0 from the target');
    expect(checkReach(challenge.startCode).message).toBe('At 0° the hand reaches (-1.75, 4.031, 0), 1.5 from the target. Turn the elbow clockwise (a smaller angle).');
    expect(at(-90)).toMatch(/anticlockwise \(a larger angle\)/);
    expect(checkReach('const elbowDeg = -60.5').pass).toBe(true);
    expect(checkReach('let a = 1').message).toMatch(/^Keep the line/);
  });
});

describe('lesson 2.6: local and global axes', () => {
  const cells = lesson26.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('the columns: the axes and scales MeshLab\'s trace reports', () => {
    expect(run(cells[0]).out).toEqual(['x column 0.866, 0, -0.5   length 1', 'y column 0, 1, 0   length 1', 'z column 0.75, 0, 1.299   length 1.5', 'unit z 0.5, 0, 0.866']);
  });

  it('the two moves of the prediction', () => {
    expect(run(cells[1]).out).toEqual(['move 1 along world x: 2, 0.5, 2', 'move 1 along local x: 1.866, 0.5, 1.5']);
  });

  it('change of basis: (3, 0.5, 2) is (1.732, 0, 0.667), as in example 2 and the MeshLab project', () => {
    expect(run(cells[2]).out).toEqual(['offset from origin: 2, 0, 0', 'dot with unit axes: 1.732, 0, 1', 'local (divide by scales 1, 1, 1.5): 1.732, 0, 0.667', 'check, M × local: 3, 0.5, 2']);
  });

  it('the picture: the crate, both sets of axes and the point', () => {
    const { out, shown } = run(cells[3]);
    expect(out).toEqual(['48 faces: the crate, the world axes, its own axes, the point']);
    expect(shown[0].groups).toEqual([1, 7, 7, 7, 4, 2, 0, 3].flatMap((g) => Array(6).fill(g)));
    // The crate's own z stick is as long as the others (a unit axis), though the crate is 1.5 deep.
    const v = shown[0].verts;
    const zStick = v.slice(48, 56), crate = v.slice(0, 8);
    const span = (pts) => Math.max(...pts.map((p) => Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1], p[2] - pts[0][2])));
    expect(Math.max(...zStick.map((p) => Math.hypot(p[0] - 1, p[1] - 0.5, p[2] - 2)))).toBeCloseTo(Math.hypot(1.6, 0.06, 0.06), 6);
    expect(span(crate)).toBeCloseTo(Math.hypot(1, 1, 1.5), 6);
  });

  it('the challenge: each wrong move is named', () => {
    const at = (v) => checkMove(`const move = [${v}]`).message;
    expect(checkMove(challenge.solutionCode).pass).toBe(true);
    expect(run({ startCode: challenge.solutionCode }).out).toEqual(['crate moves to 2, 0.5, 3.732, a distance of 2']);
    expect(checkMove(challenge.startCode).message).toMatch(/^That is 2 along the world's z/);
    expect(at('1.5, 0, 2.598')).toMatch(/^That moves 3, not 2/);
    expect(at('0.5, 0, 0.866')).toBe('Right direction, but it moves 1, not 2.');
    expect(at('-1, 0, 1.732')).toMatch(/^It moves 2, but along \(-0\.5, 0, 0\.866\), which is 60° away/);
    expect(at('0, 0, 0')).toMatch(/does not move/);
    expect(at('1, 0')).toMatch(/^Keep the line/);
  });
});

describe('lesson 2.7: Euler angles and gimbal lock', () => {
  const cells = lesson27.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('angles to a matrix: the rows the prose quotes, and ZYX differs', () => {
    expect(run(cells[0]).out).toEqual(['XYZ row 1: 0.3536, -0.6124, 0.7071', 'XYZ row 2: 0.9268, 0.1268, -0.3536', 'XYZ row 3: 0.1268, 0.7803, 0.6124', 'ZYX row 1: 0.3536, -0.5732, 0.7392']);
  });

  it('decoding: both triples come back as (30, 45, 60)', () => {
    expect(run(cells[1]).out).toEqual(['(30, 45, 60) decodes to 30, 45, 60', '(210, 135, 240) decodes to 30, 45, 60', 'same matrix: true']);
  });

  it('the lock: x + 10 and z + 10 roll the wing the same way (the misconception\'s numbers)', () => {
    expect(run(cells[2]).out).toEqual([
      '(20, 90, 10) = (30, 90, 0): true;  = (0, 90, 30): true',
      'start: nose 1, 0, 0   wing 0, 0.5, -0.866',
      'x + 10: nose 1, 0, 0   wing 0, 0.6428, -0.766',
      'z + 10: nose 1, 0, 0   wing 0, 0.6428, -0.766',
      'y = 45: x + 10 moves the nose to 0.7071, -0.3536, 0.6124; z + 10 leaves it at 0.7071, -0.2418, 0.6645',
    ]);
  });

  it('the gimbal: the X and Z rings line up at 90° and part at 45°', () => {
    const { out, shown } = run(cells[3]);
    expect(out).toEqual(["y = 90°: the X and Z rings' axes are 0° apart"]);
    expect(shown[0].faces).toHaveLength(156);
    expect(run({ startCode: cells[3].startCode.replace('const y = 90', 'const y = 45') }).out).toEqual(["y = 45°: the X and Z rings' axes are 45° apart"]);
  });

  it('the challenge: two names for one rotation, and each mistake named', () => {
    const say = (a, b) => checkTwins(`const a = [${a}]\nconst b = [${b}]`).message;
    expect(checkTwins(challenge.solutionCode).pass).toBe(true);
    expect(run({ startCode: challenge.solutionCode }).out).toEqual(['a matches: true, b matches: true']);
    expect(checkTwins(challenge.startCode).message).toMatch(/^a and b are the same angles/);
    expect(checkTwins('const a = [0, 90, 30]\nconst b = [200, 90, 190]').pass).toBe(true);
    expect(say('20, 90, 10', '20, 90, 370')).toMatch(/same angles/);
    expect(say('20, 90, 10', '20, 45, 10')).toMatch(/^b = \(20, 45, 10\) has y = 45°/);
    expect(say('20, 90, 10', '40, 90, 10')).toMatch(/keeps x − z = 30°/);
    expect(say('20, 90, 10', '20, 90, 20')).toMatch(/has x \+ z = 40°/);
    expect(say('20, 90', '1, 2, 3')).toMatch(/^Keep the lines/);
  });
});

describe('lesson 2.8: numbers you can type', () => {
  const cells = lesson28.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell, html = []) => {
    const out = [];
    const document = { body: { insertAdjacentHTML: (_, h) => html.push(h) } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')) }, document);
    return out;
  };

  it('left to right gives 20; precedence gives 14', () => {
    expect(run(cells[0])).toEqual(['left to right: 20', 'with precedence (as JavaScript does it): 14']);
  });

  it('tokens: spaces separate, "1 2" is two tokens', () => {
    expect(run(cells[1])).toEqual(['"2+3*4" → ["2","+","3","*","4"]', '" 2 * ( 1 + 1 ) " → ["2","*","(","1","+","1",")"]', '"1 2" → ["1","2"]', '"pi/4" → ["pi","/","4"]']);
  });

  it('the parser: groupings, values and order of operations, and the three errors', () => {
    expect(run(cells[2])).toEqual([
      '2 + 3 * 4 → (2 + (3 * 4)) = 14 (3 * 4 = 12, 2 + 12 = 14)',
      '8 - 3 - 2 → ((8 - 3) - 2) = 3 (8 - 3 = 5, 5 - 2 = 3)',
      '-2^2 → -(2 ^ 2) = -4 (2 ^ 2 = 4, -(4) = -4)',
      '2^3^2 → (2 ^ (3 ^ 2)) = 512 (3 ^ 2 = 9, 2 ^ 9 = 512)',
      '(2 + 3) * 4 → ((2 + 3) * 4) = 20 (2 + 3 = 5, 5 * 4 = 20)',
      '"1 2": expected an operator but found "2"',
      '"(1 + 2": expected )',
      '"2 +": expected a number, but the text ended',
    ]);
  });

  it('the notebook parser agrees with MeshLab\'s on every expression in the lesson', () => {
    for (const [text, v] of [['2 + 3 * 4', 14], ['8 - 3 - 2', 3], ['-2^2', -4], ['2^3^2', 512], ['(2 + 3) * 4', 20], ['-2^3^2/4', -128], ['90/4', 22.5]]) expect(evalExpr(text)).toBe(v);
    for (const bad of ['1 2', '(1 + 2', '2 +']) expect(evalExpr(bad)).toBeNull();
  });

  it('the tree: five nodes for 2 + 3 * 4, + at the top', () => {
    const html = [];
    expect(run(cells[3], html)).toEqual(['2 + 3 * 4 → (2 + (3 * 4)): 5 nodes; the operator at the top is done last']);
    expect(html[0].match(/<circle/g)).toHaveLength(5);
    expect(html[0]).toMatch(/<text x="92.5" y="35" fill="white">\+<\/text>/);   // the root: above the middle of its two children, 2 and ×
  });

  it('the challenge: every wrong grouping is named', () => {
    const say = (answers) => checkGrouping(`const answers = [${answers.map((a) => `'${a}'`).join(', ')}]`).message;
    const right = ['(8 - 3) - 2', '-(2^2)', '2^(3^2)', '1 + (2 * (3^2))'];
    expect(checkGrouping(challenge.solutionCode).pass).toBe(true);
    expect(checkGrouping(challenge.startCode).message).toBe('Answer 1 groups correctly, but 1 of its 1 inner operations has no brackets of its own. Bracket every operation except the last one done.');
    expect(say(['8 - (3 - 2)', ...right.slice(1)])).toBe('Answer 1 groups "8 - 3 - 2" as (8 − (3 − 2)), which is 7, not 3. − goes left to right: the first subtraction is done first.');
    expect(say([right[0], '(-2)^2', ...right.slice(2)])).toMatch(/^Answer 2 groups "-2\^2" as \(\(−2\) \^ 2\), which is 4, not -4/);
    expect(say([...right.slice(0, 2), '(2^3)^2', right[3]])).toMatch(/which is 64, not 512\. \^ groups to the right/);
    expect(say([...right.slice(0, 3), '(1 + 2) * 3^2'])).toMatch(/^Answer 4 groups/);
    expect(say([...right.slice(0, 3), '1 + (2 * 3^2)'])).toMatch(/^Answer 4 groups correctly, but 1 of its 2 inner operations/);
    expect(say([...right.slice(0, 3), '1 + (2 * (3^2)'])).toMatch(/^Answer 4 could not be read: a \( is not closed/);
    expect(say(right.slice(0, 3))).toMatch(/^Keep const answers/);
    expect(checkGrouping(`const answers = [${right.map((a) => `"${a}"`).join(', ')}]`).pass).toBe(true);
  });
});

describe('lesson 3.1: cameras', () => {
  const cells = lesson31.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('look-at: the axes the prose quotes, at right angles', () => {
    expect(run(cells[0]).out).toEqual(['forward -0.582, -0.364, -0.727', 'right 0.781, 0, -0.625', 'up -0.227, 0.932, -0.284', 'right · up = 0, right · forward = 0, up · forward = 0']);
  });

  it('the view matrix: the same camera space as MeshLab\'s trace and three.js', () => {
    expect(run(cells[1]).out).toEqual([
      'row 1: 0.781, 0, -0.625, 0',
      'row 2: -0.227, 0.932, -0.284, -0.466',
      'row 3: 0.582, 0.364, 0.727, -7.056',
      '(0, 0.5, 0) → (0, 0, -6.874), 6.874 in front',
      '(0, 0, 0) → (0, -0.466, -7.056), 7.056 in front',
      '(0, 0, 10) → (-6.247, -3.306, 0.218), behind the camera',
    ]);
  });

  it('orbit, pan and zoom (example 3)', () => {
    expect(run(cells[2]).out).toEqual(['orbit 90°: eye 5, 3, -4, still 6.874 from the target', 'pan 1 right: eye 4.781, 3, 4.375, target 0.781, 0.5, -0.625', 'zoom in to half: eye 2, 1.75, 2.5, 3.437 from the target']);
  });

  it('the picture: box, camera pyramid and line of sight', () => {
    const { out, shown } = run(cells[3]);
    expect(out).toEqual(['the camera (amber) is 6.874 from the box, looking straight down its own −z axis (red)']);
    expect(shown[0].groups).toEqual([...Array(6).fill(0), 1, 1, 1, 1, 1, ...Array(6).fill(4)]);
    // The line of sight ends at the box's centre.
    const tip = shown[0].verts.slice(-8).filter((v) => Math.hypot(v[0], v[1] - 0.5, v[2]) < 0.1);
    expect(tip.length).toBe(4);
  });

  it('the challenge: each wrong distance is named', () => {
    const at = (x) => checkFraming(`const distance = ${x}`).message;
    expect(checkFraming(challenge.solutionCode).pass).toBe(true);
    expect(checkFraming('const distance = 4.508').pass).toBe(true);
    expect(run({ startCode: challenge.solutionCode }).out).toEqual(['stand 4.508219499267045 from the centre']);
    expect(checkFraming(challenge.startCode).message).toMatch(/^Work out the distance/);
    expect(at('1.732 / Math.tan(25 * Math.PI / 180) * 1.1')).toMatch(/uses tan/);
    expect(at('1.732 / Math.sin(25 * Math.PI / 180)')).toMatch(/10% further back/);
    expect(at('1.732 / Math.sin(fov * Math.PI / 180) * 1.1')).toMatch(/uses all 50°/);
    expect(at('Math.hypot(2, 2, 2) / Math.sin(25 * Math.PI / 180) * 1.1')).toMatch(/twice too far/);
    expect(at('1.732 / Math.sin(25) * 1.1')).toMatch(/radians/);
    expect(at('3')).toMatch(/^At 3 the sphere's edge is 35\.3° from the line of sight/);
    expect(at('alert(1)')).toMatch(/^Write the distance as a number/);
    expect(at('Math.constructor')).toMatch(/^Write the distance as a number/);
  });
});

describe('lesson 3.2: projection', () => {
  const cells = lesson32.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('the pinhole: twice as far, half as tall', () => {
    expect(run(cells[0]).out).toEqual(['a box 1 tall at distance 5 is 0.2 tall on the screen', 'a box 1 tall at distance 10 is 0.1 tall on the screen', 'a box 1 tall at distance 20 is 0.05 tall on the screen', 'fov 50°: the screen is 0.9326 tall at distance 1; f = 1 / tan(25°) = 2.1445']);
  });

  it('matrix, divide, pixel: the numbers MeshLab\'s trace and three.js give', () => {
    expect(run(cells[1]).out).toEqual([
      'P row 1: 1.2063, 0, 0, 0', 'P row 2: 0, 2.1445, 0, 0', 'P row 3: 0, 0, -1.001, -0.2001', 'P row 4: 0, 0, -1, 0',
      'clip 0.942, -0.4872, 6.0981, 6.2919   (w = −z = the distance in front)',
      'ndc 0.1497, -0.0774, 0.9692',
      'pixel 735.8, 387.9',
    ]);
  });

  it('orthographic keeps sizes; depth crowds towards 1 (example 3, challenge 3)', () => {
    expect(run(cells[2]).out).toEqual(['perspective: 0.4289 at 5, 0.2145 at 10', 'orthographic: 0.3333 at 5, 0.3333 at 10', 'perspective depth: 0.1 → -1, 1 → 0.8009, 10 → 0.981, 100 → 0.999, 200 → 1']);
  });

  it('the frustum and the cube', () => {
    const { out, shown } = run(cells[3]);
    expect(out).toEqual(['after the divide the boxes are 0.8578, 0.5147, 0.3676 wide: the far ones are squeezed']);
    expect(shown[0].faces).toHaveLength(132);
    // The cube's corners are at ±1 (shifted 2.5 to the right).
    const cube = shown[0].verts.slice(96, 192);
    expect(Math.max(...cube.map((v) => v[0]))).toBeGreaterThan(3.5);
    expect(Math.max(...cube.map((v) => v[0]))).toBeLessThan(3.6);
    expect(Math.min(...cube.map((v) => v[0]))).toBeLessThan(1.5);
    expect(Math.min(...cube.map((v) => v[0]))).toBeGreaterThan(1.4);
  });

  it('the challenge: each wrong step is named', () => {
    const at = (x) => checkPixel(`const pixel = [${x}]`).message;
    expect(checkPixel(challenge.solutionCode).pass).toBe(true);
    expect(checkPixel('const pixel = [529.9, 235]').pass).toBe(true);
    expect(run({ startCode: challenge.solutionCode }).out[0]).toMatch(/^pixel 529\.90\d*, 235\.04\d*/);
    expect(checkPixel(challenge.startCode).message).toMatch(/^Work the pixel out/);
    expect(at('573.2, 235.05')).toMatch(/aspect ratio/);
    expect(at('919.6, 40.2')).toMatch(/no perspective divide/);
    expect(at('529.9, 364.95')).toMatch(/upside down/);
    expect(at('270.1, 364.95')).toMatch(/mirrored/);
    expect(at('443.3, 278.35')).toMatch(/HALF the field of view/);
    expect(at('100, 100')).toMatch(/^\(100, 100\) is not where/);
    expect(at('window.x, 1')).toMatch(/^Write the pixel with numbers/);
    expect(checkPixel('const f = 1.7320508, aspect = 4 / 3\nconst pixel = [(f / aspect / 4 + 1) * 400, (1 - f / 8) * 300]').pass).toBe(true);
    expect(checkPixel('const aspect = 4 / 3\nconst pixel = [(1.7320508 / aspect / 4 + 1) * 400, (1 - 1.7320508 / 8) * 300]').pass).toBe(true);
  });
});

describe('lesson 3.3: rasterization', () => {
  const cells = lesson33.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [], fills = [];
    const ctx = { fillRect: (...a) => fills.push(a), set fillStyle(v) { fills.push(v); } };
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')) }, document);
    return { out, fills };
  };

  it('inside or out: 16 pixels for a triangle of area 14', () => {
    expect(run(cells[0]).out).toEqual(['twice the area: 28', 'row 7: ........', 'row 6: ........', 'row 5: ...#....', 'row 4: ..###...', 'row 3: ..####..', 'row 2: ..#####.', 'row 1: .###....', 'row 0: ........', "16 pixels covered; the triangle's area is 14"]);
  });

  it('barycentric weights: the numbers of example 2', () => {
    expect(run(cells[1]).out).toEqual(['weights at (3.5, 3.5): 0.2857, 0.2679, 0.4464; sum 1', 'w·corners = 3.5, 3.5', 'colour: 73, 68, 114', 'at A: 1, 0, 0; on BC midpoint: 0, 0.5, 0.5']);
  });

  it('the shared edge: only the top-left rule has no doubles and no gaps', () => {
    expect(run(cells[2]).out).toEqual(['always count it: 8 pixels drawn twice, 0 gaps', 'never count it: 0 pixels drawn twice, 8 gaps', 'top-left rule: 0 pixels drawn twice, 0 gaps']);
  });

  it('the filled triangle', () => {
    const { out, fills } = run(cells[3]);
    expect(out).toEqual(['232 of 1024 pixels filled; red at A, green at B, blue at C']);
    expect(fills.filter((f) => Array.isArray(f))).toHaveLength(233);   // the background, then each pixel
  });

  it('perspective-correct: a quarter of the way, not half (example 3)', () => {
    expect(run(cells[4]).out).toEqual(['affine u = 0.5, perspective-correct u = 0.25', 'that pixel looks at depth 1.5, which is 0.25 of the way from the near end to the far end']);
  });

  it('the challenge: each wrong blend is named', () => {
    const at = (x) => checkWeights(`const weights = [${x}]`).message;
    expect(checkWeights(challenge.solutionCode).pass).toBe(true);
    expect(checkWeights('const weights = [0.2857, 0.5179, 0.1964]').pass).toBe(true);
    expect(checkWeights(challenge.startCode).message).toMatch(/^Work out the three edge functions/);
    expect(at('8, 14.5, 5.5')).toMatch(/are the edge functions themselves/);
    expect(at('8 / 14, 14.5 / 14, 5.5 / 14')).toMatch(/add up to 2/);
    expect(at('12 / 28, 13 / 28, 3 / 28')).toMatch(/pixel's corner, \(4, 2\)/);
    expect(at('14.5 / 28, 5.5 / 28, 8 / 28')).toMatch(/wrong places/);
    expect(at('0.5, 0.5, 0.5')).toMatch(/adds up to 1\.5, not 1/);
    expect(at('0.5, 0.25, 0.25')).toMatch(/not this pixel's blend/);
    expect(at('a, b')).toMatch(/^Keep const weights/);
  });
});

describe('lesson 3.4: the depth buffer', () => {
  const cells = lesson34.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [], fills = [];
    const ctx = { fillRect: (...a) => fills.push(a), set fillStyle(v) { fills.push(v); } };
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')) }, document);
    return { out, fills };
  };

  it('the depth test: the same picture in either order', () => {
    const { out } = run(cells[0]);
    expect(out.slice(0, 2)).toEqual(['with the depth test, red first: 18 red, 45 blue; blue first: 18 red, 45 blue', 'no depth test, red first: 15 red; blue first: 36 red']);
  });

  it('uneven depth, and the wall and poster of example 2 and the MeshLab project', () => {
    expect(run(cells[1]).out).toEqual([
      'near 0.1, far 1000: 1 → 0.9000900, 10 → 0.9900990, 100 → 0.9990999',
      'near 1, far 1000: 1 → 0.0000000, 10 → 0.9009009, 100 → 0.9909910',
      'near 0.1: wall 16762114, poster 16762114 (the same: they fight)',
      'near 1: wall 16626069, poster 16626067 (different: the poster wins)',
    ]);
  });

  it('the resolution: near matters, far does not', () => {
    expect(run(cells[2]).out).toEqual(['near 0.01: at 1 5.96e-6, at 10 5.96e-4, at 100 5.96e-2', 'near 0.1: at 1 5.96e-7, at 10 5.96e-5, at 100 5.96e-3', 'near 1: at 1 5.95e-8, at 10 5.95e-6, at 100 5.95e-4', 'far 100000, near 1, at 100: 5.96e-4']);
  });

  it('stripes at 8 bits, nearly clean at 16', () => {
    expect(run(cells[3]).out).toEqual(['8 bits: orange wins 152 of the 2048 pixels on the left, where it is nearer, and 0 on the right']);
    expect(run({ startCode: cells[3].startCode.replace('const bits = 8', 'const bits = 16') }).out).toEqual(['16 bits: orange wins 1991 of the 2048 pixels on the left, where it is nearer, and 0 on the right']);
  });

  it('polygon offset settles the ties', () => {
    expect(run(cells[4]).out).toEqual(['no offset: 967 of 1000 pixels tie (the winner then depends on draw order and rounding)', 'offset by 4 steps: the decal wins 1000 of 1000']);
  });

  it('the challenge: too small fights, too big wastes', () => {
    const at = (n) => checkNear(`const near = ${n}`).message;
    expect(checkNear(challenge.solutionCode).pass).toBe(true);
    expect(checkNear('const near = 0.62').pass).toBe(true);
    expect(run({ startCode: challenge.solutionCode }).out).toEqual(['near 0.596: one step at 100 is 0.000999 (separated)']);
    expect(checkNear(challenge.startCode).message).toMatch(/^At near 0\.01, one depth step at distance 100 is 0\.059604/);
    expect(at('0.5')).toMatch(/still fight/);
    expect(at('1')).toMatch(/^Near 1 works/);
    expect(at('0')).toMatch(/above 0/);
    expect(at('150')).toMatch(/not drawn at all/);
    expect(at('x')).toMatch(/^Keep the line/);
  });
});

describe('lesson 3.5: flat and smooth shading', () => {
  const cells = lesson35.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('flat: the side and cap normals and areas MeshLab traces', () => {
    expect(run(cells[0]).out).toEqual(['a side face: normal 0.9808, 0, 0.1951, area 0.7804', 'the bottom cap: normal 0, -1, 0, area 3.0615', 'flat shading uses 18 normals, one per face']);
  });

  it('smooth: the rim vertex by area and by angle, as in the MeshLab project', () => {
    expect(run(cells[1]).out).toEqual(['vertex 0 is on faces 0, 2, 17', 'area-weighted: 0.4472, -0.8944, 0, tilted 63.4349° down from the side', 'angle-weighted: 0.7462, -0.6657, 0, tilted 41.7375° down from the side']);
  });

  it('the smear: N · L from 0.59 to 0', () => {
    expect(run(cells[2]).out[2]).toBe('so across the side face the light fades from 0.5885 to 0 at the bottom rim: the dark smear');
  });

  it('auto smooth: two normals at the rim; 96, 32 and 64 vertices sent', () => {
    expect(run(cells[3]).out).toEqual(['vertex 0 on the side face: 1, 0, 0; on the cap: 0, -1, 0', 'vertices sent to the GPU: flat 96, smooth 32, auto smooth 64']);
  });

  it('the picture: three copies with their normals', () => {
    const { shown } = run(cells[4]);
    expect(shown[0].verts).toHaveLength(96);
    expect(shown[0].shading).toHaveLength(54);
    // The middle copy's rim corner on a side face carries the smeared normal; the right copy's does not.
    const side = 18 + 2, k = shown[0].faces[side].indexOf(32);
    expect(shown[0].shading[side][k].map((x) => +x.toFixed(4) || 0)).toEqual([0.4472, -0.8944, 0]);
    expect(shown[0].shading[36 + 2][k].map((x) => +x.toFixed(4) || 0)).toEqual([1, 0, 0]);
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkCorner(`const normal = [${x}]`).message;
    expect(checkCorner(challenge.solutionCode).pass).toBe(true);
    expect(checkCorner('const normal = [-0.3333, -0.6667, -0.6667]').pass).toBe(true);
    expect(checkCorner(challenge.startCode).message).toMatch(/^Weight each face/);
    expect(at('-0.5774, -0.5774, -0.5774')).toMatch(/weights all three faces equally/);
    expect(at('-1, -2, -2')).toMatch(/is the weighted sum, 3 long/);
    expect(at('1 / 3, 2 / 3, 2 / 3')).toMatch(/points into the box/);
    expect(at('-2 / 3, -1 / 3, -2 / 3')).toMatch(/areas on the wrong faces/);
    expect(at('-0.5, -0.5, -0.5')).toMatch(/is 0\.866 long/);
    expect(at('x')).toMatch(/^Keep const normal/);
  });
});

describe('lesson 3.6: lines, outlines and overlays', () => {
  const cells = lesson36.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], calls = [];
    new Function('console', 'showOutline', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => calls.push(m));
    return { out, calls };
  };

  it('screen-space width: the distance cancels (example 1)', () => {
    expect(run(cells[0]).out).toEqual(['distance 2: a fixed push of 0.01 is 3.62 px; a push of 0.0035 × d is 2.53 px', 'distance 5: a fixed push of 0.01 is 1.45 px; a push of 0.0035 × d is 2.53 px', 'distance 20: a fixed push of 0.01 is 0.36 px; a push of 0.0035 × d is 2.53 px']);
  });

  it('the recess walls that are back faces, and their corners pushed towards the eye', () => {
    expect(run(cells[1]).out).toEqual(['the outer walls: back, front, front, back; the panel: front', 'the recess walls: front, back, back, front', 'vertex 14: normal -0.1925, -0.1925, 0.9623, towards the eye 0.7291', 'vertex 15: normal 0.1925, -0.1925, 0.9623, towards the eye 0.8011']);
  });

  it('the stencil: 32 outline pixels without, 28 with', () => {
    expect(run(cells[2]).out.slice(0, 2)).toEqual(['without the stencil: 32 outline pixels, 4 of them inside the body', 'with the stencil: 28 outline pixels, 0 of them inside the body']);
  });

  it('the picture is drawn from the same box', () => {
    const { calls } = run(cells[3]);
    expect(calls[0].faces).toHaveLength(14);
    expect(calls[0].k).toBe(0.01);
  });

  it('MeshLab\'s viewport uses the same k as the lesson', async () => {
    const { OUTLINE_THICKNESS } = await import('../../engines/mesh/core/camera');
    expect(OUTLINE_THICKNESS).toBe(0.0035);
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkThickness(`const k = ${x}`).message;
    expect(checkThickness(challenge.solutionCode).pass).toBe(true);
    expect(checkThickness('const k = 0.00259').pass).toBe(true);
    expect(run({ startCode: challenge.solutionCode }).out[0]).toMatch(/^k = 0\.00259\d* gives 3\.00 pixels$/);
    expect(checkThickness(challenge.startCode).message).toMatch(/^0\.0035 gives 4\.05 pixels/);
    expect(at('3 / (1080 / Math.tan(25 * Math.PI / 180))')).toMatch(/H \/ 2 pixels, not H/);
    expect(at('6 * Math.tan(50 * Math.PI / 180) / 1080')).toMatch(/HALF the field of view/);
    expect(at('6 * Math.tan(25 * Math.PI / 180) / 1920')).toMatch(/use the height/);
    expect(at('0.01')).toMatch(/gives 11\.58 pixels, not 3/);
    expect(at('alert(1)')).toMatch(/^Write k as a number/);
  });
});

describe('lesson 3.7: a camera you can place, and a still image', () => {
  const cells = lesson37.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], calls = [];
    new Function('console', 'showStills', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => calls.push(m));
    return { out, calls };
  };

  it('look-at as a change of basis: the Rotation fields MeshLab shows', () => {
    expect(run(cells[0]).out).toEqual(['right 0.8, 0, -0.6   up -0.198, 0.944, -0.264   back 0.566, 0.33, 0.755', 'rotation fields: -23.63°, 34.49°, 13.92°']);
  });

  it('tall and wide', () => {
    expect(run(cells[1]).out).toEqual(['16:9: 50° tall, 79.3° wide', '1:1: 50° tall, 50.0° wide', '4:3: 50° tall, 63.7° wide', '2.39:1: 50° tall, 96.2° wide']);
  });

  it('the frame in the viewport (example 3)', () => {
    expect(run(cells[2]).out).toEqual(['1280 × 720 render: frame 900.0 × 506.3, bars 0.0 left and right, 46.9 top and bottom; the view uses 57.9° tall', '1080 × 1080 render: frame 600.0 × 600.0, bars 150.0 left and right, 0.0 top and bottom; the view uses 50.0° tall']);
  });

  it('two stills from the same camera', () => {
    expect(run(cells[3]).calls[0]).toEqual({ eye: [6, 4, 8], target: [0, 0.5, 0], fov: 50, sizes: [[320, 180], [180, 180]] });
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkWide(`const wide = ${x}`).message;
    expect(checkWide(challenge.solutionCode).pass).toBe(true);
    expect(checkWide('const wide = 65.3').pass).toBe(true);
    expect(checkWide(challenge.startCode).message).toMatch(/^Work it out/);
    expect(at('71.7')).toMatch(/multiplies the angle by 2\.39/);
    expect(at('32.6')).toMatch(/is half the view/);
    expect(at('2 * Math.atan(Math.tan(30 * Math.PI / 180) * 2.39) * 180 / Math.PI')).toMatch(/starts from tan 30/);
    expect(at('2 * Math.atan(Math.tan(15 * Math.PI / 180) * 2.39)')).toMatch(/in radians/);
    expect(at('40')).toMatch(/is not the wide angle/);
    expect(at('fov * 2')).toMatch(/^Write the angle/);
  });
});

describe('lesson 4.1: picking by ray', () => {
  const cells = lesson41.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('a pixel becomes a ray: the same directions as MeshLab\'s rayFromPixel', async () => {
    expect(run(cells[0]).out).toEqual(['pixel (639.5, 359.5): ndc 0, 0, direction 0, -0.1159, -0.9933', 'pixel (790, 300): ndc 0.2352, 0.1653, direction 0.1908, -0.0385, -0.9809']);
    const { rayFromPixel } = await import('../../engines/mesh/core/pickRay');
    const { Matrix4, Vector3 } = await import('three');
    const m = new Matrix4().lookAt(new Vector3(0, 1.2, 6), new Vector3(0, 0.5, 0), new Vector3(0, 1, 0)).setPosition(0, 1.2, 6);
    const ray = rayFromPixel(m.elements, { fov: 50, near: 0.1, far: 200 }, { width: 1280, height: 720 }, 790, 300);
    expect(ray.dir.map((x) => +x.toFixed(4))).toEqual([0.1908, -0.0385, -0.9809]);
  });

  it('Möller–Trumbore on one triangle (and the same point from u and v)', () => {
    expect(run(cells[1]).out).toEqual(['edge1 1, 1, 0, edge2 0, 1, 0, det 0.9933', 'u 0.5, v 0.175, t 4.5305; point 0, 0.675, 1.5', 'the same point from u and v: 0, 0.675, 1.5']);
  });

  it('every hit, and the nearest (example 2)', () => {
    expect(run(cells[2]).out).toEqual(['centre: front face 4 at t = 5.5373; front face 5 at t = 4.5305', 'pixel (790, 300): back face 4 at t = 8.9716; back face 5 at t = 7.3404']);
  });

  it('the picture: the boxes, the ray and the first hit', () => {
    const { out, shown } = run(cells[3]);
    expect(out).toEqual(['the ray (red) first hits the front box at 0, 0.675, 1.5, t = 4.5305']);
    expect(shown[0].groups).toEqual([...Array(6).fill(0), ...Array(6).fill(1), 4, 4, 4, 4, ...Array(6).fill(2)]);
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkHit(`const hit = [${x}]`).message;
    expect(checkHit(challenge.solutionCode).pass).toBe(true);
    expect(checkHit('const hit = [4, 13 / 40, 11 / 20]').pass).toBe(true);
    expect(checkHit(challenge.startCode).message).toMatch(/^Find t first/);
    expect(at('-4, 0.325, 0.55')).toMatch(/behind the start/);
    expect(at('4, 0.55, 0.325')).toMatch(/u and v are swapped/);
    expect(at('4, 0.125, 0.55')).toMatch(/weight of a/);
    expect(at('3, 0.3, 0.5')).toMatch(/does not reach the triangle's plane/);
    expect(at('4, 0.3, 0.3')).toMatch(/^With t = 4 the hit is/);
    expect(at('x, y')).toMatch(/^Keep const hit/);
  });
});

describe('lesson 4.2: picking in screen space', () => {
  const cells = lesson42.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')) }, document);
    return out;
  };

  it('the corners on screen match MeshLab\'s projection', async () => {
    const out = run(cells[0]);
    expect(out[7]).toBe('v7 (1, 1, 1) → pixel (679.68, 306.76), depth 0.94957');
    const { traceProjection } = await import('../../engines/mesh/core/camera');
    const { Matrix4, Vector3 } = await import('three');
    const m = new Matrix4().lookAt(new Vector3(3, 2.5, 4), new Vector3(0, 0, 0), new Vector3(0, 1, 0)).setPosition(3, 2.5, 4);
    const t = traceProjection(m.elements, { fov: 50, near: 0.1, far: 200 }, { width: 1280, height: 720 }, [1, 1, 1]);
    expect(t.pixel.map((x) => +x.toFixed(2))).toEqual([679.68, 306.76]);
  });

  it('the nearest vertex, and nothing beyond the radius', () => {
    expect(run(cells[1])).toEqual(['pointer (686.68, 311.76): v7, 8.6 px away', '30 px further right: nothing within 12 px', 'nearest three: v7 8.6 px, v0 102.39 px, v2 152.73 px']);
  });

  it('distance to an edge, clamped', () => {
    expect(run(cells[2])).toEqual(['beside the middle: t = 0.52, 5.26 px (picked)', 'beyond v7: t = 1, 37.26 px (too far)', 'far below: t = 0.6, 35.08 px (too far)']);
  });

  it('the picture picks v7', () => {
    expect(run(cells[3])).toEqual(['picked v7 (red), 8.6 px from the pointer (orange, with its 12 px reach)']);
  });

  it('the notebook\'s rules are MeshLab\'s', async () => {
    const { nearestPoint, pointSegment } = await import('../../engines/mesh/core/screenPick');
    expect(nearestPoint([{ x: 200, y: 200, z: 0.98 }, { x: 205, y: 200, z: 0.95 }], 202.5, 200).index).toBe(1);
    expect(pointSegment(108, 3, { x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 })).toEqual({ t: 1, d: Math.sqrt(73) });
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkSegment(`const answer = [${x}]`).message;
    expect(checkSegment(challenge.solutionCode).pass).toBe(true);
    expect(checkSegment('const answer = [0.6, 67.08]').pass).toBe(true);
    expect(checkSegment(challenge.startCode).message).toMatch(/^Project the pointer/);
    expect(at('134.16, 0')).toMatch(/not \|b − a\|²/);
    expect(at('0, 150')).toMatch(/distance to a/);
    expect(at('1, 111.8')).toMatch(/distance to b/);
    expect(at('0.6, 60')).toMatch(/^t = 0\.6 is right/);
    expect(at('0.4, 50')).toMatch(/is not where the closest point is/);
    expect(at('p, q')).toMatch(/^Write t and d/);
  });
});

describe('lesson 4.3: box and loop selection', () => {
  const cells = lesson43.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('box select', () => {
    expect(run(cells[0]).out).toEqual(['vertex select: v0, v2, v7', 'edge select: 0-2']);
  });

  it('a grid loop stops at the boundary', () => {
    expect(run(cells[1]).out).toEqual(['loop through 6-7: vertices 5, 6, 7, 8, 9 (open)', 'edges at v6: 4, at v5: 3, at v0 (a corner): 2']);
  });

  it('sphere loops: the same counts as MeshLab\'s walk on its UV sphere', async () => {
    expect(run(cells[2]).out).toEqual(['latitude loop: 12 edges, all the way round', 'longitude loop: 6 edges, open: rings 1 to 7, stopping before the poles', 'the north pole has 12 triangles round it: a pole, so the walk cannot go straight on through it']);
    const { makePrimitive } = await import('../../engines/mesh/core/primitives');
    const ball = makePrimitive('uvSphere', { radius: 1, segments: 12, rings: 8 });
    const edges = [...ball.edges().values()], y = (v) => ball.verts[v][1];
    const lat = edges.find((e) => Math.abs(y(e.a) - y(e.b)) < 1e-9 && Math.abs(y(e.a)) < 0.5);
    const lon = edges.find((e) => Math.abs(y(e.a) - y(e.b)) > 1e-6 && Math.abs(y(e.a)) < 0.9 && Math.abs(y(e.b)) < 0.9);
    expect(ball.edgeLoop(lat.a, lat.b)).toMatchObject({ closed: true });
    expect(ball.edgeLoop(lat.a, lat.b).edges).toHaveLength(12);
    expect(ball.edgeLoop(lon.a, lon.b)).toMatchObject({ closed: false });
    expect(ball.edgeLoop(lon.a, lon.b).edges).toHaveLength(6);
  });

  it('the picture: the sphere and both loops', () => {
    const { out, shown } = run(cells[3]);
    expect(out).toEqual(['red: 12 edges, closed; blue: 6 edges, open at the poles']);
    expect(shown[0].faces).toHaveLength(96 + 18 * 4);
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkLoop(`const loop = [${x}]`).message;
    expect(checkLoop(challenge.solutionCode).pass).toBe(true);
    expect(checkLoop('const loop = [21, 16, 11, 6, 1]').pass).toBe(true);
    expect(checkLoop(challenge.startCode).message).toMatch(/^That is just the start edge/);
    expect(at('11, 16, 21')).toMatch(/only one way/);
    expect(at('1, 6, 11, 16, 17')).toMatch(/turns a corner/);
    expect(at('1, 6, 11, 16, 21, 26')).toMatch(/0 to 24/);
    expect(at('0, 5')).toMatch(/is not the loop/);
    expect(at('a')).toMatch(/^Keep const loop/);
  });
});

describe('lesson 4.4: dragging with a gizmo', () => {
  const cells = lesson44.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('along the X arrow: the 1.261 MeshLab\'s trace finds', () => {
    expect(run(cells[0]).out).toEqual(['the box\'s origin is drawn at (640, 360)', 'grab: s = 0; after 120 px right: s = 1.261; move 1.261 along x']);
  });

  it('same pixels, different moves', () => {
    expect(run(cells[1]).out).toEqual(['x arrow, box at the origin: 1.261', 'x arrow, box twice as far away: 2.522', 'z arrow, box at the origin: -1.797', 'y arrow, dragged 120 px up: 1.235']);
  });

  it('a plane drag, and snapping', () => {
    expect(run(cells[2]).out).toEqual(['grab: the ground at (0, 0, 0)', '120 px right: the ground at (1.01, 0, -0.673)', 'and 60 px down: the ground at (1.59, 0, 0.54)']);
    expect(run(cells[3]).out).toEqual(['move 1.261 → 1.25;  move 1.38 → 1.5', 'turn 37° → 30°;  turn 38° → 45°', 'scale 1.234 → 1.2']);
  });

  it('the notebook\'s closest point is MeshLab\'s', async () => {
    const { closestOnAxis } = await import('../../engines/mesh/core/gizmoDrag');
    expect(closestOnAxis([0, 0, 0], [1, 0, 0], { origin: [2, 3, 5], dir: [0.36, -0.48, -0.8] })).toBeCloseTo(4.25, 9);
    expect(closestOnAxis([0, 0, 0], [0, 0, 1], { origin: [0, 0, 5], dir: [0, 0, -1] })).toBeNull();
  });

  it('the picture: the box, the ghost and the axis', () => {
    const { out, shown } = run(cells[4]);
    expect(out).toEqual(['blue: the box; amber: where the drag puts it, 1.261 along x; red: the axis it is held to']);
    expect(shown[0].groups).toEqual([...Array(6).fill(0), ...Array(6).fill(1), ...Array(6).fill(4)]);
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkClosest(`const s = ${x}`).message;
    expect(checkClosest(challenge.solutionCode).pass).toBe(true);
    expect(checkClosest(challenge.startCode).message).toMatch(/^Use s = /);
    expect(at('2')).toMatch(/starting x/);
    expect(at('-0.3456')).toMatch(/sign of c·d/);
    expect(at('3.6992')).toMatch(/divide by a·c − b²/);
    expect(at('5')).toMatch(/is not the closest point/);
    expect(at('x')).toMatch(/^Keep the line/);
  });
});

describe('lesson 4.5: the knife', () => {
  const cells = lesson45.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('the plane and the corners\' signed distances', () => {
    expect(run(cells[0]).out).toEqual(['n = (from − eye) × (to − eye) = (-6, -24, 0)', 'corner 1 (-1, -1, 1): d = 30  (one side)', 'corner 5 (1, -1, 1): d = 18  (one side)', 'corner 7 (1, 1, 1): d = -30  (the other side)', 'corner 3 (-1, 1, 1): d = -18  (the other side)']);
  });

  it('the crossings: t = 0.375, as MeshLab\'s knife finds on the same slab', async () => {
    expect(run(cells[1]).out).toEqual(['edge 1–5: not crossed (both ends on one side)', 'edge 5–7: crossed at t = 0.375, the point (1, -0.25, 1)', 'edge 7–3: not crossed (both ends on one side)', 'edge 3–1: crossed at t = 0.375, the point (-1, 0.25, 1)']);
    const { makePrimitive } = await import('../../engines/mesh/core/primitives');
    const { knife, knifeFaces } = await import('../../engines/mesh/core/knife');
    const slab = makePrimitive('cube', { size: 2 }), line = { eye: [0, 0, 6], from: [-2, 0.5, 0], to: [2, -0.5, 0] };
    expect(knife(slab, line, knifeFaces(slab, line.eye))).toHaveLength(1);
    const added = slab.verts.slice(8).map((v) => v.map((x) => +x.toFixed(4) || 0)).sort((a, b) => a[0] - b[0]);
    expect(added).toEqual([[-1, 0.25, 1], [1, -0.25, 1]]);
    expect(slab.stats()).toMatchObject({ closed: true, faces: 7 });
  });

  it('the split keeps the slab closed; the wedge; the picture', () => {
    expect(run(cells[2]).out).toEqual(['front face [1, 5, 7, 3] becomes [8,7,3,9] and [9,1,5,8]', 'right side [4, 6, 7, 5] becomes [4, 6, 7, 8, 5]: still one face, now with 5 corners', '7 faces; every edge on two faces: true']);
    expect(run(cells[3]).out).toEqual(['the crossing (1, -0.25, 1): inside the wedge true', 'short line: (1, -0.25, 1) inside false, (-1, 0.25, 1) inside false: nothing is cut']);
    expect(run(cells[4]).shown[0].faces).toHaveLength(7);
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkCrossing(`const crossing = [${x}]`).message;
    expect(checkCrossing(challenge.solutionCode).pass).toBe(true);
    expect(checkCrossing(challenge.startCode).message).toMatch(/^t = d\(a\)/);
    expect(at('0.75, 1, 1.5, 0')).toMatch(/measures from b/);
    expect(at('-1 / 3, 1, 0, 0')).toMatch(/is not the crossing/);
    expect(at('0.25, 1, 0.25, 0')).toMatch(/^t = 0\.25 is right/);
    expect(at('0.5, 1, 1, 0')).toMatch(/is not where the edge crosses/);
    expect(at('x')).toMatch(/^Keep const crossing/);
  });
});

describe('lesson 4.6: undo and redo', () => {
  const cells = lesson46.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')) }, document);
    return out;
  };

  it('snapshots: undo restores before, redo after', () => {
    expect(run(cells[0])).toEqual(['move: [[0,0],[1,0],[1,2]]   undo [move]  redo []', 'add: [[0,0],[1,0],[1,2],[0,2]]   undo [move,add]  redo []', 'undo: [[0,0],[1,0],[1,2]]   undo [move]  redo [add]', 'undo: [[0,0],[1,0],[1,1]]   undo []  redo [add,move]', 'redo: [[0,0],[1,0],[1,2]]   undo [move]  redo [add]']);
  });

  it('commands are small; the numbers in the prose', () => {
    expect(run(cells[1])).toEqual(['point 7 after the move: [7,2]', 'after undo: [7,0], the scene is as it was: true', 'stored for this one step: snapshots 15782 characters, command 7']);
  });

  it('a new change empties redo (example 2), and a drag is one step', () => {
    expect(run(cells[2])).toEqual(['undo twice: [[0,0],[1,0],[1,1],[5,5]]   undo [A]  redo [C,B]', 'then D: [[9,9],[1,0],[1,1],[5,5]]   undo [A,D]  redo []', 'redo: [[9,9],[1,0],[1,1],[5,5]]   undo [A,D]  redo []']);
    expect(run(cells[3])).toEqual(['after the drag: x = 1.50, undo steps: 1', 'one Ctrl+Z: x = 0']);
    expect(run(cells[4])).toEqual(['before D: undo [A], redo [C, B] (B on top); after D: undo [A, D], redo empty']);
  });

  it('MeshLab\'s editor follows the same rules', async () => {
    const { Editor } = await import('../../engines/mesh/core/Editor');
    const { makePrimitive } = await import('../../engines/mesh/core/primitives');
    const e = new Editor(), id = e.scene.add({ name: 'Box', mesh: makePrimitive('cube', { size: 1 }) }).id;
    for (const v of [true, false, true]) e.setSmooth(id, v);
    const n = e.undoStack.length;
    e.undo(); e.undo();
    expect([e.undoStack.length, e.redoStack.length]).toEqual([n - 2, 2]);
    e.setSmooth(id, false);                    // a real change (it is smooth after the two undos)
    expect(e.redoStack).toHaveLength(0);
  });

  it('the challenge: each slip is named', () => {
    const at = (u, r) => checkStacks(`const undoStack = [${u}]\nconst redoStack = [${r}]`).message;
    expect(checkStacks(challenge.solutionCode).pass).toBe(true);
    expect(checkStacks(challenge.startCode).message).toMatch(/^Replay it step by step/);
    expect(at("'A'", "'B'")).toMatch(/B is gone/);
    expect(at("'C'", "'A'")).toMatch(/The order is the other way/);
    expect(at("'A', 'C'", '')).toMatch(/only restores one step/);
    expect(at("'D'", '')).toMatch(/is not what the sequence leaves/);
    expect(checkStacks('const undoStack = 1').message).toMatch(/^Keep the two lines/);
  });
});

describe('lesson 4.7: every click is code', () => {
  const cells = lesson47.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')) }, document);
    return out;
  };

  it('clicks become the same lines MeshLab logs', () => {
    expect(run(cells[0])).toEqual(['1: scene.get("Box").smooth = true', '2: scene.get("Box").position.x = 1.5', '3: scene.get("Box").rotation.y = 0.785398']);
  });

  it('literals: the notebook\'s lit() writes what MeshLab\'s does', async () => {
    expect(run(cells[1])).toEqual(['0.785398   0   2.5   [1, 0.333333, 0]', '{ name: "Cone", position: [0, 1, 0] }   "a \\"quoted\\" name"', 'largest error from trimming π/4: 1.6e-7']);
    const { lit } = await import('../../engines/mesh/core/Editor');
    expect([lit(Math.PI / 4), lit(1e-9), lit([1, 0.333333333, -0]), lit({ name: 'Cone', position: [0, 1, 0] })]).toEqual(['0.785398', '0', '[1, 0.333333, 0]', '{ name: "Cone", position: [0, 1, 0] }']);
  });

  it('replay rebuilds the scene; numbering goes wrong', () => {
    expect(run(cells[2])).toEqual(['4 lines replayed; the same scene: true', 'the start was 95 characters; the log is 209']);
    expect(run(cells[3])[0]).toBe('by number: Box (smooth), Cone: the wrong object was deleted and shaded');
    expect(run(cells[4])).toEqual(['log: scene.get("Box").position.x = 1.5; scene.get("Box").rotation.z = 0.523599']);
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkLine(`const line = '${x}'`).message;
    expect(checkLine(challenge.solutionCode).pass).toBe(true);
    expect(checkLine("const line = 'scene.get(\"Box\").rotation.y = 0.5235988'").pass).toBe(true);
    expect(checkLine(challenge.startCode).message).toMatch(/^Write the line/);
    expect(at('scene.get("Box").rotation.y = 30')).toMatch(/in degrees/);
    expect(at('scene.objects[0].rotation.y = 0.523599')).toMatch(/Name the object/);
    expect(at('scene.get("Box").rotation.x = 0.523599')).toMatch(/not x/);
    expect(at('scene.get("Cube").rotation.y = 0.523599')).toMatch(/named "Box"/);
    expect(at('scene.get("Box").rotation.y = 0.5')).toMatch(/radians is 28\.648°/);
    expect(at('scene.get("Box").rotation = [0, 0.5, 0]')).toMatch(/one axis/);
  });
});

describe('lesson 5.1: extrude', () => {
  const cells = lesson51.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('the direction is area-weighted', () => {
    expect(run(cells[0]).out).toEqual(['face 4: normal 0, 1, 0, area 1', 'face 7: normal 0, 1, 0, area 1', 'the region moves along n = 0, 1, 0', 'top + end, area-weighted: n = 0.4472, 0.8944, 0, 26.5651° from up']);
  });

  it('six copies, six border edges, one inner', () => {
    const copy = run(cells[1]).out;
    expect(copy.slice(0, 2)).toEqual(["corners on the region's faces: 8", 'new vertices: 6']);
    expect(copy).toContain('v5 (-0.5, 0, -0.5) → v16 (-0.5, 0.5, -0.5)');
    expect(run(cells[2]).out.slice(0, 2)).toEqual(['border edges (6): 5-6, 6-10, 5-9, 10-14, 13-14, 9-13', 'inner edges (1): 9-10']);
  });

  it('every wall faces out and V − E + F is unchanged', () => {
    const out = run(cells[3]).out;
    expect(out.filter((l) => l.startsWith('wall')).length).toBe(6);
    expect(out.every((l) => !l.endsWith(', IN'))).toBe(true);
    expect(out.slice(-2)).toEqual(['before: V 16, E 24, F 9, V − E + F = 1', 'after: V 22, E 36, F 15, V − E + F = 1']);
  });

  it('the picture: grid, caps and walls, and the tilted smooth normal', () => {
    const { out, shown } = run(cells[4]);
    expect(out).toEqual(["corner v16: smooth normal -0.4082, 0.8165, -0.4082, 35.2644° off the cap's (0, 1, 0)"]);
    expect(shown).toHaveLength(1);
    const { faces, groups, shading } = shown[0];
    expect(faces).toHaveLength(15);
    expect([0, 1, 2].map((g) => groups.filter((x) => x === g).length)).toEqual([7, 2, 6]);
    expect(shading).toHaveLength(15);
  });

  it('the engine extrudes the same way', async () => {
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const verts = [], faces = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) verts.push([i - 1.5, 0, j - 1.5]);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) faces.push([i * 4 + j, i * 4 + j + 1, (i + 1) * 4 + j + 1, (i + 1) * 4 + j]);
    const m = new EditMesh(verts, faces).extrudeFaces([4, 7], 0.5);
    expect(m.verts).toHaveLength(22);
    expect(m.faces).toHaveLength(15);
    expect(m.faces.slice(9)).toEqual([[5, 6, 17, 16], [6, 10, 18, 17], [9, 5, 16, 19], [10, 14, 20, 18], [14, 13, 21, 20], [13, 9, 19, 21]]);
  });

  it('the challenge: each slip is named', () => {
    const at = (v, w, i) => checkBlock(`const answer = { verts: ${v}, walls: ${w}, inner: ${i} }`);
    expect(checkBlock(challenge.solutionCode).pass).toBe(true);
    expect(checkBlock(challenge.startCode).pass).toBe(false);
    expect(at(16, 8, 4).message).toMatch(/copied once/);
    expect(at(9, 16, 4).message).toMatch(/gets no wall/);
    expect(at(9, 12, 4).message).toMatch(/distinct edges/);
    expect(at(9, 8, 8).message).toMatch(/so 8 is not/);
    expect(checkBlock('const answer = { verts: 9 }').message).toMatch(/all three/);
  });
});

describe('lesson 5.2: inset', () => {
  const cells = lesson52.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('a fraction gives an uneven frame; edges move along normal × edge', () => {
    expect(run(cells[0]).out.at(-1)).toBe('frame at the ends (x): 0.25, along the sides (z): 0.125');
    expect(run(cells[1]).out).toContain('edge -1, 0, -0.5 → -1, 0, 0.5: inward 1, 0, 0');
    expect(run(cells[1]).out.at(-1)).toBe('the corner -1, 0, -0.5 moves to -0.8, 0, -0.3: 0.2 from both edges');
  });

  it('the mitre keeps both edges t away, except where capped', () => {
    expect(run(cells[2]).out).toEqual([
      '90°: moves 0.2828, from the two edges 0.2 and 0.2',
      '60°: moves 0.4, from the two edges 0.2 and 0.2',
      '120°: moves 0.2309, from the two edges 0.2 and 0.2',
      '270°: moves 0.2828, from the two edges 0.2 and 0.2',
      '20°: moves 1 (capped), from the two edges 0.1736 and 0.1736',
    ]);
  });

  it('the L: 8 outline edges, every new edge 0.2 away, as the engine does it', async () => {
    const out = run(cells[3]).out;
    expect(out[0]).toBe('outline edges (8): 0→1, 3→0, 1→2, 2→5, 5→4, 4→7, 7→6, 6→3');
    expect(out).toContain('v4 1, 0, 1 moves 0.2828 to 0.8, 0, 0.8');
    expect(out.slice(-2)).toEqual(['distance of each new edge from its old one: 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2', 'faces: 3 → 11 (8 bridge quads)']);
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const { insetRegion } = await import('../../engines/mesh/core/modelling');
    const m = new EditMesh([[0, 0, 0], [0, 0, 1], [0, 0, 2], [1, 0, 0], [1, 0, 1], [1, 0, 2], [2, 0, 0], [2, 0, 1]], [[0, 1, 4, 3], [1, 2, 5, 4], [3, 4, 7, 6]]);
    expect(insetRegion(m, [0, 1, 2], 0.2)).toHaveLength(8);
    const near = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 1e-9);
    for (const p of [[0.2, 0, 0.2], [1, 0, 0.2], [0.8, 0, 0.8], [1.8, 0, 0.2]]) expect(m.verts.some((v) => near(v, p))).toBe(true);
  });

  it('the picture: both kinds of inset', () => {
    const { shown } = run(cells[4]);
    expect(shown).toHaveLength(1);
    const { faces, groups } = shown[0];
    expect([1, 2, 3].map((g) => groups.filter((x) => x === g).length)).toEqual([4, 8, 4]);
    expect(faces).toHaveLength(16);
  });

  it('the challenge: each slip is named, and only arithmetic is run', () => {
    const at = (x) => checkCorner120(`const distance = ${x}`);
    expect(checkCorner120(challenge.solutionCode).pass).toBe(true);
    expect(at('0.11547').pass).toBe(true);
    expect(checkCorner120(challenge.startCode).pass).toBe(false);
    expect(at('0.1').message).toMatch(/straight run/);
    expect(at('0.1 * Math.sin(Math.PI / 3)').message).toMatch(/Divide by/);
    expect(at('0.2').message).toMatch(/cos 60/);
    expect(at('0.1 * Math.SQRT2').message).toMatch(/90° corner/);
    expect(at('0.1 / Math.sin(60)').message).toMatch(/radians/);
    expect(at('globalThis.x = 1').message).toMatch(/arithmetic/);
  });
});

describe('lesson 5.3: edge rings and loop cuts', () => {
  const cells = lesson53.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('the opposite edge, and two rings on the tube', () => {
    expect(run(cells[0]).out[1]).toBe('out by [1, 9]: 1 is next to 0, 9 is next to 8');
    expect(run(cells[1]).out).toEqual([
      'from [0, 8]: 8 quads, closed; edges [0,8] [1,9] [2,10] [3,11] [4,12] [5,13] [6,14] [7,15]',
      'from [0, 1]: 1 quad, open; stops at face 1 (8 corners) and face 0 (8 corners)',
    ]);
  });

  it('orientation keeps the cut level; winding order makes it jump', () => {
    expect(run(cells[2]).out).toEqual([
      'oriented, first corner on the same side each time: heights -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5',
      "in each quad's winding order: heights -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5",
    ]);
  });

  it('the split keeps V − E + F, and the caps gain a corner', () => {
    expect(run(cells[3]).out).toEqual([
      'before: V 16, E 24, F 10, V − E + F = 2',
      'round the middle: V 24, E 40, F 18, V − E + F = 2',
      'across the side:  V 27, E 45, F 20, V − E + F = 2',
      'the caps now have 9 and 9 corners',
    ]);
    const { out, shown } = run(cells[4]);
    expect(out).toEqual(["20 faces: 14 amber, 4 green (the second cut split 2 of the first cut's 16 halves), 2 caps"]);
    expect(shown[0].faces).toHaveLength(20);
  });

  it('the engine cuts the same way', async () => {
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const n = 8, verts = [], faces = [];
    for (const y of [-1, 1]) for (let k = 0; k < n; k++) verts.push([Math.cos(2 * Math.PI * k / n), y, Math.sin(2 * Math.PI * k / n)]);
    faces.push([...Array(n).keys()].map((k) => n + k), [...Array(n).keys()].map((k) => (n - k) % n));
    for (let k = 0; k < n; k++) faces.push([(k + 1) % n, k, n + k, n + (k + 1) % n]);
    const m = new EditMesh(verts, faces);
    expect(m.edgeRing(0, 8).faces).toHaveLength(8);
    m.loopCut(0, 8, 0.5).loopCut(16, 17, 0.5);
    expect([m.verts.length, m.faces.length]).toEqual([27, 20]);
    expect(m.faces.filter((f) => f.length > 4).map((f) => f.length)).toEqual([9, 9]);
  });

  it('the challenge: each slip is named', () => {
    const at = (a, b, c) => checkTwoCuts(`const answer = { first: ${a}, second: ${b}, cap: ${c} }`).message;
    expect(checkTwoCuts(challenge.solutionCode).pass).toBe(true);
    expect(checkTwoCuts(challenge.startCode).pass).toBe(false);
    expect(at(24, 2, 13)).toMatch(/after the first cut/);
    expect(at(12, 1, 13)).toMatch(/two rows/);
    expect(at(12, 12, 13)).toMatch(/does not go round/);
    expect(at(12, 2, 12)).toMatch(/outline/);
    expect(at(12, 2, 14)).toMatch(/one vertex, not two/);
  });
});

describe('lesson 5.4: bevel', () => {
  const cells = lesson54.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('slides, the profile and its bulge', () => {
    expect(run(cells[0]).out.slice(0, 2)).toEqual(['top face:   -1, 1, 0.7', 'front face: -1, 0.7, 1']);
    const prof = run(cells[1]).out;
    expect(prof[0]).toBe('B(0.5) = 0.925, 0.925');
    expect(prof[2]).toBe('2 segments: points at distance 0.3, 0.3182, 0.3 from the centre (a circle: all 0.3)');
  });

  it('the strip: counts, end faces and normals', () => {
    expect(run(cells[2]).out).toEqual([
      '1 segment: V 10, E 15, F 7, V − E + F = 2; the end faces have 5 corners',
      '   strip normals, degrees from up: 45',
      '2 segments: V 12, E 18, F 8, V − E + F = 2; the end faces have 6 corners',
      '   strip normals, degrees from up: 18.4349, 71.5651',
      '4 segments: V 16, E 24, F 10, V − E + F = 2; the end faces have 8 corners',
      '   strip normals, degrees from up: 8.1301, 30.9638, 59.0362, 81.8699',
    ]);
  });

  it('the corner patch and the highlight', () => {
    expect(run(cells[3]).out.at(-1)).toBe('2 segments: a 6-sided patch; between top and front, 0.85, 0.925, 0.925');
    const { out, shown } = run(cells[4]);
    expect(out).toEqual(['brightness: top 0.8305, strips 0.8926, 0.9685, 0.8545, 0.6107, front 0.4983']);
    expect(Math.max(...shown[0].values)).toBeCloseTo(0.9685, 4);
  });

  it('the engine agrees: one edge in 3 segments, and every edge in 1', async () => {
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const { bevelEdges } = await import('../../engines/mesh/core/modelling');
    const cube = () => new EditMesh(
      [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
      [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [0, 4, 7, 3], [1, 2, 6, 5]],
    );
    const one = cube();
    bevelEdges(one, [[6, 7]], 0.3, 3);
    expect(one.faces).toHaveLength(9);
    expect(one.faces.filter((f) => f.length === 7)).toHaveLength(2);
    const all = cube();
    bevelEdges(all, [...all.edges().values()].map((e) => [e.a, e.b]), 0.3, 1);
    expect([all.verts.length, all.edges().size, all.faces.length]).toEqual([24, 48, 26]);
  });

  it('the challenge: each slip is named', () => {
    const at = (f, c) => checkSegments(`const answer = { faces: ${f}, endCorners: ${c} }`).message;
    expect(checkSegments(challenge.solutionCode).pass).toBe(true);
    expect(checkSegments(challenge.startCode).pass).toBe(false);
    expect(at(7, 7)).toMatch(/one segment/);
    expect(at(8, 7)).toMatch(/3 strip faces/);
    expect(at(9, 4)).toMatch(/cut off/);
    expect(at(9, 5)).toMatch(/4 points/);
    expect(at(9, 6)).toMatch(/one point more/);
  });
});

describe('lesson 5.5: dissolve and delete', () => {
  const cells = lesson55.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('dissolving an edge and vertices keeps V − E + F', () => {
    expect(run(cells[0]).out).toEqual([
      'before: V 6, E 7, F 2, V − E + F = 1, open edges 6',
      '1 shared edge goes; the outline [0, 3, 4, 5, 2, 1] is one face with 6 corners',
      'after:  V 6, E 6, F 1, V − E + F = 1, open edges 6',
    ]);
    expect(run(cells[1]).out[1]).toBe("the 2 × 2 grid's middle vertex 4 dissolved: one face [0, 1, 2, 5, 8, 7, 6, 3], 8 corners, 4 of them on straight sides");
  });

  it('delete opens the cube; dissolve keeps it closed but bent', () => {
    expect(run(cells[2]).out).toEqual([
      'cube:               V 8, E 12, F 6, V − E + F = 2, open edges 0',
      'top deleted:        V 8, E 12, F 5, V − E + F = 1, open edges 4',
      'top + front merged: V 8, E 11, F 5, V − E + F = 2, open edges 0',
      'its corners are up to 0.9428 off its own plane: bent, not flat',
    ]);
  });

  it('fans from corners 0 and 3 only; ear clipping matches the engine', async () => {
    const out = run(cells[3]).out;
    expect(out.filter((l) => l.endsWith('covers the L exactly')).map((l) => l.split(':')[0])).toEqual(['fan from corner 0', 'fan from corner 3']);
    expect(out.at(-1)).toBe('ear clipping: [0, 1, 2] [0, 2, 3] [5, 0, 3] [3, 4, 5], areas 0.5, 1, 0.5, 1');
    const { faceTriangles } = await import('../../engines/mesh/core/triangulate');
    const L = [[1, 0, 1], [2, 0, 1], [2, 0, 0], [0, 0, 0], [0, 0, 2], [1, 0, 2]];
    expect(faceTriangles(L, [0, 1, 2, 3, 4, 5])).toEqual([[0, 1, 2], [0, 2, 3], [5, 0, 3], [3, 4, 5]]);
    expect(run(cells[4]).shown[0].faces).toHaveLength(8);
  });

  it('the engine: dissolving a 3 × 3 grid gives 12 corners', async () => {
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const { dissolveFaces } = await import('../../engines/mesh/core/modelling');
    const verts = [], faces = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) verts.push([i, 0, j]);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) faces.push([i * 4 + j, i * 4 + j + 1, (i + 1) * 4 + j + 1, (i + 1) * 4 + j]);
    const m = new EditMesh(verts, faces);
    expect(dissolveFaces(m, [...Array(9).keys()])).toBe(1);
    expect(m.faces.map((f) => f.length)).toEqual([12]);
  });

  it('the challenge: each slip is named', () => {
    const at = (c, a) => checkGridDissolve(`const answer = { corners: ${c}, after: ${a} }`).message;
    expect(checkGridDissolve(challenge.solutionCode).pass).toBe(true);
    expect(checkGridDissolve(challenge.startCode).pass).toBe(false);
    expect(at(16, 4)).toMatch(/inside it/);
    expect(at(4, 4)).toMatch(/middle of the sides/);
    expect(at(9, 4)).toMatch(/number of faces/);
    expect(at(12, 12)).toMatch(/8 of the 12/);
  });
});

describe('lesson 5.6: merge and smooth vertices', () => {
  const cells = lesson56.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('merge at centre, as the engine does it', async () => {
    expect(run(cells[0]).out).toEqual(['the four corners meet at 1.5, 0, 1.5', 'faces: 9 → 8; corner counts 4, 3, 4, 3, 3, 4, 3, 4']);
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const verts = [], faces = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) verts.push([i, 0, j]);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) faces.push([i * 4 + j, i * 4 + j + 1, (i + 1) * 4 + j + 1, (i + 1) * 4 + j]);
    const m = new EditMesh(verts, faces).mergeVerts([5, 6, 10, 9]);
    expect(m.faces.map((f) => f.length)).toEqual([4, 3, 4, 3, 3, 4, 3, 4]);
    expect(m.verts).toHaveLength(13);
  });

  it('a step, the ring, and Taubin', () => {
    expect(run(cells[1]).out.slice(1)).toEqual(['λ = 0.25: x + λ (x̄ − x) = 0, 0.225, 0', 'λ = 0.5: x + λ (x̄ − x) = 0, 0.15, 0', 'λ = 1: x + λ (x̄ − x) = 0, 0, 0']);
    const ring = run(cells[2]).out;
    expect(ring.slice(0, 2)).toEqual(['step 0: mean radius 1, zigzag 0.1', 'step 1: mean radius 0.9619, zigzag 0.0038']);
    expect(ring).toContain('step 10: mean radius 0.6784, zigzag 0');
    expect(ring.at(-1)).toBe('8 waves round the ring: × 0 per step');
    expect(run(cells[3]).out).toEqual(['plain, 10 steps: mean radius 0.6784, zigzag 0', 'Taubin, 10 pairs: mean radius 1.0075, zigzag 0', 'per pair: the circle × 1.0007, the zigzag × 0']);
  });

  it('the picture matches MeshLab\'s project: 0.15 → 0.0375', () => {
    const { out, shown } = run(cells[4]);
    expect(out).toEqual(['largest bump: 0.15 before, 0.0375 after one step']);
    expect(shown[0].faces).toHaveLength(144);
  });

  it('the challenge: each slip is named, and only arithmetic is run', () => {
    const at = (x) => checkShrink(`const radius = ${x}`);
    expect(checkShrink(challenge.solutionCode).pass).toBe(true);
    expect(at('0.96194').pass).toBe(true);
    expect(checkShrink(challenge.startCode).pass).toBe(false);
    expect(at('1').message).toMatch(/does shrink/);
    expect(at('Math.cos(Math.PI / 8)').message).toMatch(/λ = 1/);
    expect(at('1 - 0.5 * (1 - Math.cos(Math.PI / 16))').message).toMatch(/cos 11.25/);
    expect(at('1 - 0.5 * (1 - Math.cos(22.5))').message).toMatch(/radians/);
    expect(at('fetch(1)').message).toMatch(/arithmetic/);
  });
});

describe('lesson 5.7: mirror and modifiers', () => {
  const cells = lesson57.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('reflections and winding', () => {
    expect(run(cells[0]).out).toEqual(['R (0.7, 0.2, -0.4) = (-0.7, 0.2, -0.4), det R = -1', 'in the plane x + y = 0: (1, 0, 0) → (0, -1, 0), det = -1', 'twice: (0.7, 0.2, -0.4) → (0.7, 0.2, -0.4)']);
    expect(run(cells[1]).out.slice(1)).toEqual(['reflected, same order: (0, 0, -1): facing in, the wrong way', 'reflected, order reversed: (0, 0, 1): facing out']);
  });

  it('sharing the plane, the stack, and the engine\'s counts', async () => {
    expect(run(cells[2]).out).toEqual([
      'the cage:              V 8, E 12, F 5, V − E + F = 1, open edges 4',
      'mirrored, no sharing:  V 16, E 24, F 10, V − E + F = 2, open edges 8',
      'mirrored, shared:      V 12, E 20, F 10, V − E + F = 2, open edges 0',
      'one vertex 0.01 off:   V 13, E 22, F 10, V − E + F = 1, open edges 4',
    ]);
    expect(run(cells[3]).out.every((l) => l.includes('true'))).toBe(true);
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const { mirror } = await import('../../engines/mesh/core/modifiers');
    const cage = new EditMesh([[0, -1, -1], [1, -1, -1], [1, 1, -1], [0, 1, -1], [0, -1, 1], [1, -1, 1], [1, 1, 1], [0, 1, 1]], [[1, 2, 6, 5], [0, 1, 5, 4], [2, 3, 7, 6], [0, 3, 2, 1], [4, 5, 6, 7]]);
    const s = mirror(cage).stats();
    expect([s.verts, s.edges, s.faces, s.closed]).toEqual([12, 20, 10, true]);
    expect(s.volume).toBeCloseTo(8, 9); // a 2 × 2 × 2 box, faces outward
  });

  it('the order of the stack matters: the seam\'s top lands at 1.089 or 0.938', async () => {
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const { evaluate } = await import('../../engines/mesh/core/modifiers');
    const half = () => new EditMesh([[0, -1, -1], [1, -1, -1], [1.5, 1.5, -1], [0, 1, -1], [0, -1, 1], [1, -1, 1], [1.5, 1.5, 1], [0, 1, 1]], [[1, 2, 6, 5], [0, 1, 5, 4], [2, 3, 7, 6], [0, 3, 2, 1], [4, 5, 6, 7]]);
    const mir = { type: 'mirror', axis: 'x', merge: 0.001, clip: true, enabled: true }, sub = { type: 'subsurf', levels: 2, enabled: true };
    const top = (m) => +Math.max(...m.verts.filter((v) => Math.abs(v[0]) < 1e-6).map((v) => v[1])).toFixed(3);
    expect(top(evaluate(half(), [mir, sub]))).toBe(1.089);
    expect(top(evaluate(half(), [sub, mir]))).toBe(0.938);
  });

  it('the picture: reversed on the left, inverted on the right', () => {
    expect(run(cells[4]).shown[0].faces).toHaveLength(20);
  });

  it('the challenge: each slip is named', () => {
    const at = (v, f) => checkMirrorCounts(`const answer = { verts: ${v}, faces: ${f} }`).message;
    expect(checkMirrorCounts(challenge.solutionCode).pass).toBe(true);
    expect(checkMirrorCounts(challenge.startCode).pass).toBe(false);
    expect(at(80, 72)).toMatch(/shared/);
    expect(at(68, 72)).toMatch(/once/);
    expect(at(34, 72)).toMatch(/only the copies/);
    expect(at(74, 36)).toMatch(/double/);
  });
});

describe('lesson 5.8: box modelling a character', () => {
  const cells = lesson58.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('the plan predicts every step MeshLab logs', () => {
    const out = run(cells[0]).out;
    expect(out.slice(1).every((l) => l.endsWith('(MeshLab: the same)'))).toBe(true);
    expect(out.at(-1)).toMatch(/→ 38, 32/);
    expect(run(cells[1]).out.slice(0, 3)).toEqual(['mirrored: 66 vertices, 128 edges, 64 faces', 'subdivided ×1: 258 vertices, 512 edges, 256 faces, V − E + F = 2', 'subdivided ×2: 1026 vertices, 2048 edges, 1024 faces, V − E + F = 2']);
  });

  it('silhouettes: the cube and the sphere, as the engine finds them', async () => {
    expect(run(cells[2]).out).toEqual(['in front, (0, 0, 5): 1 front faces, 4 silhouette edges: 4-5, 5-6, 6-7, 4-7', 'a corner, (5, 4, 3): 3 front faces, 6 silhouette edges: 2-3, 1-2, 4-5, 4-7, 1-5, 3-7']);
    expect(run(cells[3]).out[0]).toBe('eye (0,0,5): 36 of 128 faces face it, 24 silhouette edges');
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const { traceSilhouette } = await import('../../engines/mesh/core/silhouette');
    const cube = new EditMesh([[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [0, 4, 7, 3], [1, 2, 6, 5]]);
    const r = traceSilhouette(cube, [5, 4, 3]);
    expect([r.front.length, r.edges.length]).toEqual([3, 6]);
    expect(run(cells[4]).shown[0].groups.filter((g) => g === 1)).toHaveLength(36);
  });

  it('the challenge: each slip is named', () => {
    const at = (v, f) => checkCage(`const answer = { verts: ${v}, faces: ${f} }`).message;
    expect(checkCage(challenge.solutionCode).pass).toBe(true);
    expect(checkCage(challenge.startCode).pass).toBe(false);
    expect(at(38, 32)).toMatch(/original counts/);
    expect(at(46, 42)).toMatch(/mirror plane/);
    expect(at(46, 44)).toMatch(/walls only/);
  });
});

describe('lesson 5.9: clean topology', () => {
  const cells = lesson59.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('valence, the budget, and n-gons becoming poles', () => {
    expect(run(cells[0]).out).toEqual(['4 × 4 grid, inside vertices: 9 × 4', 'cube: 8 × 3']);
    expect(run(cells[1]).out).toEqual([
      'cube: 8 × 3; Σ (4 − valence) = 8, 4χ = 8',
      'cube subdivided ×1: 8 × 3, 18 × 4; Σ (4 − valence) = 8, 4χ = 8',
      'cube subdivided ×2: 8 × 3, 90 × 4; Σ (4 − valence) = 8, 4χ = 8',
      'torus: 24 × 4; Σ (4 − valence) = 0, 4χ = 0',
    ]);
    expect(run(cells[2]).out).toEqual(['prism: 6 × 3 (corners)', 'subdivided once: 8 × 3, 12 × 4, all quads now', 'pentagonal prism: 10 × 3', 'subdivided once: 10 × 3, 20 × 4, 2 × 5; Σ (4 − valence) = 8']);
  });

  it('the engine agrees: the ball MeshLab builds has the same 8 × 3, 90 × 4', async () => {
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const { catmullClark } = await import('../../engines/mesh/core/subdivision');
    const { traceValence } = await import('../../engines/mesh/core/valence');
    let m = new EditMesh([[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [0, 4, 7, 3], [1, 2, 6, 5]]);
    m = catmullClark(catmullClark(m));
    const r = traceValence(m);
    expect(r.inside).toEqual({ 3: 8, 4: 90 });
    expect(r.budget).toEqual({ sum: 8, fourChi: 8 });
  });

  it('the picture: a cube-sphere with 8 poles', () => {
    const { out, shown } = run(cells[4]);
    expect(out).toEqual(['218 vertices: 8 × 3, 210 × 4; 8 poles, each touching 3 amber faces']);
    expect(shown[0].groups.filter((g) => g === 1)).toHaveLength(24);
  });

  it('the challenge: each slip is named', () => {
    const at = (n) => checkThrees(`const threes = ${n}`).message;
    expect(checkThrees(challenge.solutionCode).pass).toBe(true);
    expect(checkThrees(challenge.startCode).pass).toBe(false);
    expect(at(8)).toMatch(/no 5-poles/);
    expect(at(2)).toMatch(/against the budget/);
    expect(at(6)).toMatch(/torus/);
  });
});

describe('lesson 6.1: corner cutting', () => {
  const cells = lesson61.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')) }, document);
    return out;
  };

  it('one step, and the limit', () => {
    expect(run(cells[0])[0]).toBe('one step: 8 points: (1, 0) (3, 0) (4, 1) (4, 3) (3, 4) (1, 4) (0, 3) (0, 1)');
    const rep = run(cells[1]);
    expect(rep.slice(0, 4)).toEqual(['step 0: 4 points, area 16, perimeter 16', 'step 1: 8 points, area 14, perimeter 13.6569', 'step 2: 16 points, area 13.5, perimeter 13.153', 'step 3: 32 points, area 13.375, perimeter 13.0275']);
    expect(rep.at(-1)).toBe('after 9 steps, the closest point to (2, 0) is 0.0039 away; to the old corner (4, 0), 0.7071');
  });

  it('three schemes: shrink, shrink more, interpolate and bulge', () => {
    expect(run(cells[2])).toEqual([
      'Chaikin (quadratic): 128 points, area 13.3359, nearest to the corner 0.7085, inside the square',
      'cubic B-spline: 128 points, area 10.8488, nearest to the corner 0.9419, inside the square',
      '4-point: 128 points, area 21.959, nearest to the corner 0, bulges 0.5 outside the square',
    ]);
    expect(run(cells[3])[0]).toMatch(/blue: five steps \(128 points\)/);
  });

  it('the cubic rule is the engine\'s Catmull–Clark border rule', async () => {
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const { catmullClark } = await import('../../engines/mesh/core/subdivision');
    // A strip of three quads: the middle vertex of its bottom border has border neighbours at x = 0 and x = 2.
    const m = new EditMesh([[0, 0, 0], [1, 0, 0.5], [2, 0, 0], [3, 0, 0], [0, 0, 1], [1, 0, 1], [2, 0, 1], [3, 0, 1]], [[0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3]]);
    const s = catmullClark(m);
    expect(s.verts[1].map((x) => +x.toFixed(6))).toEqual([1, 0, (0 + 6 * 0.5 + 0) / 8]);
  });

  it('the challenge: each slip is named', () => {
    const at = (q, r) => checkChaikin(`const q = [${q}]\nconst r = [${r}]`).message;
    expect(checkChaikin(challenge.solutionCode).pass).toBe(true);
    expect(checkChaikin(challenge.startCode).pass).toBe(false);
    expect(at('1, 3', '3, 1')).toMatch(/other order/);
    expect(at('2, 2', '1, 3')).toMatch(/midpoint/);
    expect(at('4, 0', '1, 3')).toMatch(/cut off/);
  });
});

describe('lesson 6.2: Catmull–Clark', () => {
  const cells = lesson62.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('face, edge and vertex points as the engine computes them', async () => {
    expect(run(cells[0]).out).toEqual(['top face (y = 1): face point (0, 1, 0)', 'edge (1, 1, 1)–(1, 1, -1): edge point (0.75, 0.75, 0) = (a + b + top + right) / 4']);
    expect(run(cells[1]).out[1]).toBe('V′ = (F̄ + 2R̄ + 0·V) / 3 = (0.5556, 0.5556, 0.5556)');
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const { catmullClark } = await import('../../engines/mesh/core/subdivision');
    const cube = new EditMesh([[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [0, 4, 7, 3], [1, 2, 6, 5]]);
    const s = catmullClark(cube);
    expect(s.verts[6].map((x) => +x.toFixed(4))).toEqual([0.5556, 0.5556, 0.5556]);
    expect([s.verts.length, s.faces.length]).toEqual([26, 24]);
  });

  it('levels, and the regular case is the cubic B-spline', () => {
    const lv = run(cells[2]).out;
    expect(lv[0]).toBe('level 1: 26 vertices, 24 faces; the old corner at (0.5556, 0.5556, 0.5556), 0.9623 from the centre; the highest point 1 high');
    expect(lv[1]).toMatch(/^level 2: 98 vertices, 96 faces; .* the highest point 0\.8785 high$/);
    const g = run(cells[3]).out;
    expect(g[0].split(':')[1].trim()).toBe(g[1].split(':')[1].trim());
    expect(run(cells[4]).shown[0].faces).toHaveLength(6 + 24 + 96 + 384);
  });

  it('the bump challenge, checked against the engine', async () => {
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const { catmullClark } = await import('../../engines/mesh/core/subdivision');
    // A 4 × 4 grid of unit squares, its middle vertex raised; far enough from the border to be a regular vertex.
    const verts = [], faces = [];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) verts.push([i - 2, i === 2 && j === 2 ? 1 : 0, j - 2]);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) faces.push([i * 5 + j, i * 5 + j + 1, (i + 1) * 5 + j + 1, (i + 1) * 5 + j]);
    expect(catmullClark(new EditMesh(verts, faces)).verts[12][1]).toBeCloseTo(0.5625, 12);
    const at = (x) => checkBump(`const height = ${x}`).message;
    expect(checkBump(challenge.solutionCode).pass).toBe(true);
    expect(checkBump('const height = 9 / 16').pass).toBe(true);
    expect(checkBump(challenge.startCode).pass).toBe(false);
    expect(at(0.25)).toMatch(/F̄/);
    expect(at(0.5)).toMatch(/R̄/);
    expect(at(1)).toMatch(/approximating/);
    expect(at(0.4375)).toMatch(/n − 3/);
  });
});

describe('lesson 6.3: extraordinary vertices and limits', () => {
  const cells = lesson63.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('cost and limits; the formula agrees with the engine', async () => {
    expect(run(cells[0]).out[5]).toBe('level 5: 65,536 faces, 65,538 vertices, about 3072 KB on the GPU');
    const lim = run(cells[1]).out;
    expect(lim[0]).toBe('after 1 step: (0.5556, 0.5556, 0.5556); its limit by the formula: (0.5, 0.5, 0.5)');
    expect(lim.at(-1)).toBe('after 5 steps: (0.5, 0.5, 0.5), 0.0001 from the limit');
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const { catmullClark } = await import('../../engines/mesh/core/subdivision');
    const { limitPosition } = await import('../../engines/mesh/core/limit');
    const cube = new EditMesh([[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [0, 4, 7, 3], [1, 2, 6, 5]]);
    const r = limitPosition(catmullClark(cube), 6);
    expect(typeof r).toBe('object');
    expect(r.limit.map((x) => +x.toFixed(9))).toEqual([0.5, 0.5, 0.5]);
  });

  it('λ(n) measured matches the closed form; stretching compounds', () => {
    const eig = run(cells[2]).out;
    expect(eig).toHaveLength(5);
    for (const line of eig) { const [, a, b] = line.match(/× ([\d.]+) a step; λ\(\d\) = ([\d.]+)/); expect(Math.abs(Number(a) - Number(b))).toBeLessThan(0.005); }
    expect(run(cells[3]).out[3]).toBe('n = 8: after 1, 3, 5, 8 steps the quads there are 1.2222, 1.8258, 2.7275, 4.98 × regular size');
    const { out, shown } = run(cells[4]);
    expect(out[0]).toBe('768 quads; the biggest is 5.6302 times the smallest, and the biggest are round the tips');
    expect(shown[0].faces).toHaveLength(768);
  });

  it('the challenge: each slip is named', () => {
    const at = (y) => checkLimit(`const limitPoint = [0, ${y}, 0]`).message;
    expect(checkLimit(challenge.solutionCode).pass).toBe(true);
    expect(checkLimit(challenge.startCode).pass).toBe(false);
    expect(at(9.5 / 36)).toMatch(/n = 4/);
    expect(at(3.5 / 50)).toMatch(/4 times/);
    expect(at(9.5 / 25)).toMatch(/not n²/);
  });
});

describe('lesson 6.4: keeping edges sharp', () => {
  const cells = lesson64.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('support points on a curve: the gap is 0.236 d', () => {
    const out = run(cells[0]).out;
    expect(out.at(-1)).toBe('support d = 0.1: the curve comes within 0.0236 of the corner');
    expect(out[1]).toBe('support d = 1: the curve comes within 0.2357 of the corner');
  });

  it('support loops on a cube: the same volumes as MeshLab\'s project', async () => {
    const out = run(cells[1]).out;
    expect(out[0]).toBe('no support loops: 35.0% of the box, the edge rounded off by 0.3532; cage 6 faces, drawn 96');
    expect(out[3]).toBe('loops at w = 0.1: 93.4% of the box, the edge rounded off by 0.0488; cage 30 faces, drawn 480');
    const { Editor } = await import('../../engines/mesh/core/Editor');
    const { PROJECTS, openProject } = await import('../../labs/mesh-lab/core/projects');
    const e = new Editor();
    const r = openProject(e, PROJECTS.find((p) => p.id === 'support-loops'), null);
    expect(r.output[0]).toMatch(/\(35%\)$/);
    expect(r.output[2]).toMatch(/\(93%\)$/);
    expect(run(cells[2]).shown[0].faces).toHaveLength(96 + 480 + 480);
  });

  it('the challenge: 0.2, and each slip is named', () => {
    const at = (w) => checkWidest(`const widest = ${w}`).message;
    expect(checkWidest(challenge.solutionCode).pass).toBe(true);
    expect(checkWidest(challenge.startCode).pass).toBe(false);
    expect(at(0.25)).toMatch(/89\.6%/);
    expect(at(0.3)).toMatch(/88\.1%/);
    expect(at(0.1)).toMatch(/not the widest/);
    // 0.25 really is under 90% and 0.2 over: run cell 2's code with those widths.
    const src = cells[1].startCode.replace('[null, 0.3, 0.2, 0.1, 0.05]', '[0.25, 0.2]');
    const out = []; new Function('console', src)({ log: (...a) => out.push(a.join(' ')) });
    expect(out.map((l) => l.match(/: ([\d.]+)%/)[1])).toEqual(['89.6', '90.9']);
  });
});

describe('lesson 6.5: subdividing UVs', () => {
  const cells = lesson65.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')) }, document);
    return out;
  };

  it('UV vertices, and smooth UVs reproduce the projection inside the island where linear ones slide', () => {
    expect(run(cells[0])[0]).toBe('mesh vertices: 16; UV vertices: 18');
    expect(run(cells[1])).toEqual(['vertex 5 moved from (0.3, 0.6) to (0.35, 0.6)', 'its smooth UV: (0.35, 0.6); its linear UV: (0.3, 0.6)', 'largest slide from the projection: smooth, inside the island 0; smooth, on its border 0.05; linear 0.0559']);
    expect(run(cells[2]).slice(0, 2)).toEqual(['border smoothed: island area 5.2234; the outline point (-0.25, 0.6) is now at (-0.2109, 0.6)', 'border kept:     island area 5.325; the outline point (-0.25, 0.6) is now at (-0.25, 0.6)']);
    expect(run(cells[3])[0]).toBe('grey: the subdivided grid projected; blue: smooth UVs, off it at 12 corners (all on the border); amber: 64 linear UV corners slid off it');
  });

  it('the engine agrees: inside the island, smooth UVs on a flat grid are the projection', async () => {
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const { subdivideUV } = await import('../../engines/mesh/core/uv');
    const { subdivide } = await import('../../engines/mesh/core/subdivision');
    const xs = [0, 0.3, 1, 2], zs = [0, 0.6, 1.2, 2], verts = [], faces = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) verts.push([xs[i], 0, zs[j]]);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) faces.push([i * 4 + j, i * 4 + j + 1, (i + 1) * 4 + j + 1, (i + 1) * 4 + j]);
    const g = new EditMesh(verts, faces);
    const uv = { faces: g.faces.map((f) => f.map((v) => [g.verts[v][0], g.verts[v][2]])) };
    const s = subdivide(g, 1), su = subdivideUV(uv, 1, g, true);
    let inside = 0;
    s.faces.forEach((f, fi) => f.forEach((v, k) => {
      const t = su.faces[fi][k];
      if ([t[0], t[1]].some((x) => Math.abs(x) < 1e-9 || Math.abs(x - 2) < 1e-9)) return; // on the island's border: kept, so it may slide
      inside++;
      expect(t[0]).toBeCloseTo(s.verts[v][0], 12); expect(t[1]).toBeCloseTo(s.verts[v][2], 12);
    }));
    expect(inside).toBeGreaterThan(50);
  });

  it('the challenge: each slip is named', () => {
    const at = (a, b) => checkUVVerts(`const answer = { sixIslands: ${a}, cross: ${b} }`).message;
    expect(checkUVVerts(challenge.solutionCode).pass).toBe(true);
    expect(checkUVVerts(challenge.startCode).pass).toBe(false);
    expect(at(8, 14)).toMatch(/mesh vertices/);
    expect(at(24, 24)).toMatch(/share their corners/);
    expect(at(24, 12)).toMatch(/column of 4/);
  });
});

describe('lesson 7.1: fields and colour maps', () => {
  const cells = lesson71.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('a field, its range, and the maps match the engine\'s turbo and cool–warm', async () => {
    expect(run(cells[0]).out[2]).toBe('values at the corners: 1.2, 1.0158, 1.0158; at the centre (⅓ each): 1.0772');
    expect(run(cells[1]).out).toEqual(['min to max (0.0058 to 12): 99% of vertices get t < 0.1, nearly one colour', '2nd to 98th percentile (0.0058 to 1.0158): 43%; the spike is clamped to t = 1']);
    const maps = run(cells[2]).out;
    const { turbo, coolwarm } = await import('../../engines/mesh/core/fields');
    const rgb = (c) => '(' + c.map((x) => Math.round(x * 255)).join(', ') + ')';
    [0, 0.25, 0.5, 0.75, 1].forEach((t, i) => expect(maps[i]).toBe('t = ' + t + ': turbo ' + rgb(turbo(t)) + ', cool–warm ' + rgb(coolwarm(t))));
  });

  it('blending colours is not blending values; the picture gives every vertex a colour', () => {
    expect(run(cells[3]).out).toEqual(['blended colours: (110, 96, 36); colour of the blended value, turbo(0.5): (150, 250, 80)', 'corners 0, 0.5, 1: 155 apart (out of 255)', 'corners 0.3, 0.5, 0.7: 41 apart (out of 255)', 'corners 0.45, 0.5, 0.55: 3 apart (out of 255)']);
    const { shown } = run(cells[4]);
    expect(shown[0].colors).toHaveLength(81);
  });

  it('the challenge: each slip is named', () => {
    const at = (z, t) => checkDiverging(`const answer = { zero: ${z}, three: ${t} }`).message;
    expect(checkDiverging(challenge.solutionCode).pass).toBe(true);
    expect(checkDiverging(challenge.startCode).pass).toBe(false);
    expect(at(0.25, 0.625)).toMatch(/symmetric/);
    expect(at(0.5, 0.625)).toMatch(/−6 to 6/);
    expect(at(0.5, 0.5)).toMatch(/past the middle/);
  });
});

describe('lesson 7.2: the Laplacian', () => {
  const cells = lesson72.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')) }, document);
    return out;
  };

  it('umbrella moves a flat vertex; cotan does not', () => {
    expect(run(cells[0])).toEqual(['umbrella: average of (x_j − x_0) = (0.28, 0, 0.14): not zero, it pulls vertex 0 sideways', 'cotan:    Σ w_0j (x_j − x_0)    = (0, 0, 0): zero, the surface is flat here']);
    expect(run(cells[1]).slice(1)).toEqual(['two angles of 30°: w = 1.7321', 'two angles of 60°: w = 0.5774', 'two angles of 90°: w = 0', 'two angles of 120°: w = -0.5774']);
  });

  it('the octahedron matrix, linear precision, and the engine\'s H', async () => {
    const m = run(cells[2]);
    expect(m[0]).toBe('row 0: 2.3094  0  -0.5774  -0.5774  -0.5774  -0.5774   sum 0');
    expect(m.at(-1)).toBe('30 non-zeros of 36: sparse; symmetric: true');
    const lin = run(cells[3]);
    expect(lin[0]).toMatch(/^cotan: \(L f\)_0 = 0; umbrella: /);
    expect(lin[1]).toBe('octahedron vertex (1, 0, 0): Δx = (-2, 0, 0), so H ≈ 1 (a unit sphere has H = 1)');
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const { traceVertexLaplacian } = await import('../../engines/mesh/core/laplacianTrace');
    const oct = new EditMesh([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]]);
    const r = traceVertexLaplacian(oct, 0);
    expect(r.H).toBeCloseTo(1, 12);
    expect(r.weights.every((w) => Math.abs(w - 1 / Math.sqrt(3)) < 1e-12)).toBe(true);
  });

  it('the challenge: each slip is named, and only arithmetic is run', () => {
    const at = (x) => checkCotan(`const w = ${x}`);
    expect(checkCotan(challenge.solutionCode).pass).toBe(true);
    expect(at('1.1547').pass).toBe(true);
    expect(checkCotan(challenge.startCode).pass).toBe(false);
    expect(at('2.3094').message).toMatch(/half/);
    expect(at('1 / Math.tan(Math.PI / 3) / 2').message).toMatch(/Both angles/);
    expect(at('window.x').message).toMatch(/arithmetic/);
  });
});

describe('lesson 7.3: mean curvature', () => {
  const cells = lesson73.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('spheres, a cylinder, and the engine agrees', async () => {
    expect(run(cells[0]).out[1]).toBe('sphere of radius 2: H mean 0.5021, from 0.3814 to 0.5092');
    expect(run(cells[1]).out[0]).toBe('middle ring: H mean 1, from 1 to 1 (1/r = 2, and 0 along the axis: their average is 1)');
    const { makePrimitive } = await import('../../engines/mesh/core/primitives');
    const { meanCurvature } = await import('../../engines/mesh/core/geometry');
    const H = Array.from(meanCurvature(makePrimitive('uvSphere', { radius: 2, segments: 24, rings: 12 })));
    expect(H.reduce((a, b) => a + b) / H.length).toBeCloseTo(0.5, 1);
  });

  it('mixed area is somewhat better; the dent is negative', () => {
    expect(run(cells[2]).out).toEqual(['barycentric area: H mean 1.0013, from 0.7479 to 1.2758, typical error 0.0774', 'mixed area:       H mean 0.9964, from 0.7378 to 1.2094, typical error 0.0682']);
    expect(run(cells[3]).out).toEqual(['inside the dent: 37 vertices, H mean -0.9983, from -1.0012 to -0.9969', 'the rest of the ball: 373 vertices, H mean 1.0031, from 0.7572 to 1.0109', 'the rim of the dent, where the surface folds: the largest H, 7.1048']);
    expect(run(cells[4]).shown[0].colors.length).toBe(run(cells[4]).shown[0].verts.length);
  });

  it('the challenge: each slip is named', () => {
    const at = (a, b) => checkCurvatures(`const answer = { sphere: ${a}, cylinder: ${b} }`).message;
    expect(checkCurvatures(challenge.solutionCode).pass).toBe(true);
    expect(checkCurvatures(challenge.startCode).pass).toBe(false);
    expect(at(2, 1)).toMatch(/1\/r/);
    expect(at(0.5, 2)).toMatch(/along its axis/);
    expect(at(0.5, 0.25)).toMatch(/1\/r = 2/);
  });
});

describe('lesson 7.4: Gaussian curvature', () => {
  const cells = lesson74.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const src = cell.startCode.split('// ── drawing')[0];
    const out = [], shown = [];
    new Function('console', 'show', src)({ log: (...a) => out.push(a.join(' ')) }, (m) => shown.push(m));
    return { out, shown };
  };

  it('defects and Gauss–Bonnet', () => {
    expect(run(cells[0]).out.at(-1)).toBe('5 squares round a vertex: angles add up to 450°, defect -90°: too much angle, it ruffles into a saddle');
    const b = run(cells[1]).out;
    expect(b.slice(0, 3).every((l) => l.includes('= 720°;') && l.endsWith('2πχ = 720°'))).toBe(true);
    expect(b[3]).toMatch(/total 0°; χ = 0$/);
    expect(run(cells[2]).out).toEqual(['sphere of radius 1: K mean 1.0174, total defect 720°', 'sphere of radius 2: K mean 0.2544, total defect 720°']);
  });

  it('K against H, the torus, and the engine\'s total', async () => {
    expect(run(cells[3]).out[0]).toMatch(/^saddle centre: angles add up to 360\.5715°, K = -3\.9801/);
    expect(run(cells[4]).out[0]).toBe('K from -2.1919 (inside) to 1.06 (outside); the defects add up to 0°');
    const { makePrimitive } = await import('../../engines/mesh/core/primitives');
    const { gaussianCurvature } = await import('../../engines/mesh/core/geometry');
    const total = (m) => Array.from(gaussianCurvature(m, { integrated: true })).reduce((a, b) => a + b, 0);
    expect(total(makePrimitive('cube'))).toBeCloseTo(4 * Math.PI, 9);
    expect(total(makePrimitive('torus'))).toBeCloseTo(0, 9);
  });

  it('the challenge: each slip is named', () => {
    const at = (v, t) => checkDefects(`const answer = { vertex: ${v}, total: ${t} }`).message;
    expect(checkDefects(challenge.solutionCode).pass).toBe(true);
    expect(checkDefects(challenge.startCode).pass).toBe(false);
    expect(at(60, -720)).toMatch(/negative/);
    expect(at(420, -720)).toMatch(/angle sum/);
    expect(at(-60, 720)).toMatch(/sphere/);
    expect(at(-60, -360)).toMatch(/360° per unit/);
  });
});

describe('lesson 7.5: sparse linear systems', () => {
  const cells = lesson75.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')) }, document);
    return out;
  };

  it('sparsity, SPD, and CG against Jacobi', () => {
    expect(run(cells[0]).at(-1)).toBe('counted for N = 10: 460 non-zeros');
    expect(run(cells[1])[0]).toMatch(/^symmetric: true; .* > 0$/);
    expect(run(cells[2]).slice(0, 2)).toEqual(['CG: 26 iterations; residual after 1, 5, 10, 20: 4.0e-1, 2.8e-2, 9.1e-4, 4.6e-7', 'Jacobi: 72 iterations']);
  });

  it('how the counts grow', () => {
    expect(run(cells[3])).toEqual([
      'heat step, 10 × 10: CG 22, Jacobi 66', 'heat step, 20 × 20: CG 26, Jacobi 72', 'heat step, 40 × 40: CG 27, Jacobi 72',
      'Poisson, 10 × 10: CG 33, Jacobi 414', 'Poisson, 20 × 20: CG 63, Jacobi 1463', 'Poisson, 40 × 40: CG 121, Jacobi 5360',
    ]);
  });

  it('the challenge: each slip is named', () => {
    const at = (d, s) => checkStorage(`const answer = { dense: ${d}, sparse: ${s} }`).message;
    expect(checkStorage(challenge.solutionCode).pass).toBe(true);
    expect(checkStorage('const answer = { dense: 10000000000, sparse: 700_000 }').pass).toBe(true);
    expect(checkStorage(challenge.startCode).pass).toBe(false);
    expect(at('2e5', 700000)).toMatch(/n × n/);
    expect(at('1e10', 600000)).toMatch(/diagonal/);
    expect(at('1e10', '1e5')).toMatch(/one per row/);
  });
});

describe('lesson 7.6: distance on a surface', () => {
  const cells = lesson76.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('edge paths staircase; the heat method does not', () => {
    expect(run(cells[0])[0]).toBe('corner (1, −1): along edges 2, straight line 1.4142');
    expect(run(cells[2])).toEqual(['corner (1, −1): heat method 1.4642, exact 1.4142; along edges it was 2', 'over all 441 vertices: mean error 0.0217, worst 0.0659']);
  });

  it('a sphere and a wall', () => {
    expect(run(cells[3])[0]).toBe('equator: 1.5645 (π/2 = 1.5708); south pole: 3.129 (π = 3.1416)');
    expect(run(cells[4])[0]).toBe('the point straight across the wall: straight line 1, along the sheet 2.4259');
  });

  it('the challenge: each slip is named', () => {
    const at = (e) => checkTube(`const distance = ${e}`).message;
    expect(checkTube(challenge.solutionCode).pass).toBe(true);
    expect(checkTube('const distance = 5.0862').pass).toBe(true);
    expect(checkTube(challenge.startCode).pass).toBe(false);
    expect(at('Math.hypot(2, 4)')).toMatch(/through the air/);
    expect(at('Math.PI + 4')).toMatch(/round the rim/);
    expect(at('Math.hypot(2 * Math.PI, 4)')).toMatch(/half way round/);
  });
});

describe('lesson 7.7: smoothing as heat flow', () => {
  const cells = lesson77.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('explicit and implicit factors on the ring', () => {
    expect(run(cells[0])).toEqual(['k = 1: size 0.9904, formula 1 − λ(1 − cos θ) = 0.9904', 'k = 4: size 0.8536, formula 1 − λ(1 − cos θ) = 0.8536', 'k = 16: size 0, formula 1 − λ(1 − cos θ) = 0']);
    expect(run(cells[1]).at(-1)).toBe('λ = 1.5: factor per step -2, size after 10 steps 1024');
    expect(run(cells[2])[1]).toBe('λ = 1.5: zigzag × 0.25 (1 / (1 + 2λ) = 0.25), one bump × 0.972');
  });

  it('a sphere shrinks, and the picture\'s numbers', () => {
    expect(run(cells[3])).toEqual(['1 step of t = 0.1: radius 0.8334', '4 steps of t = 0.025: radius 0.7955', '16 steps of t = 0.0063: radius 0.7806', 'the flow itself: radius 0.7746']);
    expect(run(cells[4])[0]).toBe('roughness: bumpy 2.2931%, explicit λ = 2 ×3 8.5239%, implicit ×1 0.7631%');
  });

  it('the challenge: each slip is named', () => {
    const at = (l, f) => checkZigzag(`const answer = { explicitLimit: ${l}, implicitFactor: ${f} }`).message;
    expect(checkZigzag(challenge.solutionCode).pass).toBe(true);
    expect(checkZigzag('const answer = { explicitLimit: 1, implicitFactor: 0.142857 }').pass).toBe(true);
    expect(checkZigzag(challenge.startCode).pass).toBe(false);
    expect(at(0.5, '1 / 7')).toMatch(/goes to zero/);
    expect(at(1, -5)).toMatch(/explicit factor/);
    expect(at(1, 0.25)).toMatch(/forgets/);
  });
});

describe('lesson 7.8: level sets and contours', () => {
  const cells = lesson78.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('an edge, a triangle\'s cases, and the saddle', () => {
    expect(run(cells[0])[0]).toBe('t = 0.375, the point 0.75, 0');
    expect(run(cells[1]).at(-1)).toBe('cases by crossed edges: {"0":2,"2":6}');
    expect(run(cells[3])).toEqual([
      'diagonal A–C: segments AB to BC; CD to DA. The high corners are joined',
      'diagonal B–D: segments AB to DA; BC to CD. The high corners are separated',
    ]);
  });

  it('the two hills match the MeshLab project and its engine', async () => {
    const { makePrimitive } = await import('../../engines/mesh/core/primitives');
    const { traceContour } = await import('../../engines/mesh/core/contourTrace');
    const out = run(cells[2]);
    const m = makePrimitive('grid', { size: 6, subdivisions: 36 });
    m.verts = m.verts.map(([x, , z]) => [x, 1.2 * Math.exp(-((x + 1.2) ** 2 + z ** 2) / 0.8) + 0.8 * Math.exp(-((x - 1.3) ** 2 + z ** 2) / 0.6), z]);
    [0.01, 0.2, 0.5, 0.9, 1.3].forEach((L, k) => {
      const e = traceContour(m, m.verts.map((p) => p[1]), L);
      expect(out[k]).toBe(`height ${L}: ${e.crossed} segments, ${e.loops} loops, ${e.open} open, length ${+e.length.toFixed(4)}`);
    });
    expect(run(cells[4])[0]).toBe('loops at heights 0.1 … 1.2: 1 1 2 2 2 2 2 1 1 1 1 0');
  });

  it('the challenge: each slip is named', () => {
    const at = (e) => checkContourSegment(`const length = ${e}`).message;
    expect(checkContourSegment(challenge.solutionCode).pass).toBe(true);
    expect(checkContourSegment('const length = 1.6771').pass).toBe(true);
    expect(checkContourSegment(challenge.startCode).pass).toBe(false);
    expect(at('Math.sqrt(2)')).toMatch(/midpoints/);
    expect(at('Math.hypot(1.25, 0.5)')).toMatch(/first end/);
    expect(at('Math.hypot(0.75, 0.5)')).toMatch(/wrong end/);
  });
});

describe('lesson 8.1: what UVs are', () => {
  const cells = lesson81.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('wedges, barycentric weights and lookups', () => {
    expect(run(cells[0])).toEqual(['vertices 8, corners 24', 'atlas: 24 wedges; whole texture on each face: 19 wedges']);
    expect(run(cells[1])).toEqual(['weights 0.2, 0.5, 0.3 (they add to 1)', 'UV at P: 0.56, 0.36']);
    expect(run(cells[2])).toEqual(['(0.3, 0.6): nearest 90, bilinear 83', '(1.3, 0.6): nearest 90, bilinear 83', '(0.375, 0.625): nearest 90, bilinear 90']);
  });

  it('the challenge agrees with the engine, and each slip is named', async () => {
    const { makePrimitive } = await import('../../engines/mesh/core/primitives');
    const { unwrap } = await import('../../engines/mesh/core/uv');
    const { traceUVLookup } = await import('../../engines/mesh/core/uvLookup');
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const m = makePrimitive('uvSphere', { radius: 1, segments: 16, rings: 8 });
    const on = new Set(m.verts.flatMap((p, i) => (p[0] >= -1e-9 && Math.abs(p[2]) < 1e-9 ? [i] : [])));
    const seams = new Set([...m.edges().values()].filter((e) => on.has(e.a) && on.has(e.b)).map((e) => EditMesh.edgeKey(e.a, e.b)));
    expect(traceUVLookup(m, unwrap(m, seams), 0).wedges).toBe(121);
    const at = (x) => checkWedges(`const wedges = ${x}`).message;
    expect(checkWedges(challenge.solutionCode).pass).toBe(true);
    expect(checkWedges(challenge.startCode).pass).toBe(false);
    expect(at(123)).toMatch(/poles/);
    expect(at(114)).toMatch(/one UV on each side/);
    expect(at(480)).toMatch(/face corners/);
  });
});

describe('lesson 8.2: seams and charts', () => {
  const cells = lesson82.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('the disc test on a cube, a net, a tube and a torus', () => {
    expect(run(cells[0])).toEqual([
      '12 seams: 6 charts, 1 face: W 4, E 4, χ 1, 1 rim (disc) each',
      'no seams: 6 faces: W 8, E 12, χ 2, 0 rims (not a disc)',
      'one seam (edge 0-1): 6 faces: W 8, E 13, χ 1, 1 rim (disc)',
    ]);
    expect(run(cells[1])[1]).toBe('6 faces: W 14, E 19, χ 1, 1 rim (disc)');
    expect(run(cells[2]).slice(1)).toEqual([
      'tube, one seam from rim to rim (0-8): 8 faces: W 18, E 25, χ 1, 1 rim (disc)',
      'torus, no seams: 32 faces: W 32, E 64, χ 0, 0 rims (not a disc)',
      'torus, one loop round the tube: 32 faces: W 36, E 68, χ 0, 2 rims (not a disc)',
      'torus, both loops: 32 faces: W 45, E 76, χ 1, 1 rim (disc)',
    ]);
    expect(run(cells[3])).toEqual(['flat corners (wedges): 14 for 8 vertices']);
  });

  it('the notebook agrees with the engine on the net', async () => {
    const { makePrimitive } = await import('../../engines/mesh/core/primitives');
    const { charts } = await import('../../engines/mesh/core/uv');
    const m = makePrimitive('cube');
    const keep = new Set(['6-7', '4-5', '4-7', '5-6', '2-3']);
    // The engine's cube numbers its vertices differently: match edges by their positions.
    const pos = (i) => m.verts[i].map((x) => Math.sign(x));
    const nb = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
    const toNb = (i) => nb.findIndex((p) => p.every((x, k) => x === pos(i)[k]));
    const seams = new Set([...m.edges().keys()].filter((k) => { const [a, b] = k.split('-').map(Number).map(toNb); return !keep.has(a < b ? `${a}-${b}` : `${b}-${a}`); }));
    const cs = charts(m, seams);
    expect(cs.length).toBe(1);
    expect(cs[0].mesh.verts.length).toBe(14);
    expect(cs[0].mesh.topology()).toMatchObject({ chi: 1, boundaryLoops: 1 });
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkSeamCount(`const seams = ${x}`).message;
    expect(checkSeamCount(challenge.solutionCode).pass).toBe(true);
    expect(checkSeamCount('const seams = 5').pass).toBe(true);
    expect(checkSeamCount(challenge.startCode).pass).toBe(false);
    expect(at('12 - 8')).toMatch(/one join too many/);
    expect(at(7)).toMatch(/kept edges/);
    expect(at(12)).toMatch(/8 separate/);
  });
});

describe('lesson 8.3: projection', () => {
  const cells = lesson83.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: (_, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('stretch is 1/cos θ, the wrap fix, and three projections of a sphere', () => {
    expect(run(cells[0])[3]).toBe('60°: σ₁ 1, σ₂ 0.5, σ₁/σ₂ 2 (1/cos θ = 2)');
    expect(run(cells[1])[1]).toBe('face 7: u from 0.9688 to 0.0313 (width 0.9375); after the fix 0.9688 to 1.0313 (width 0.0625)');
    expect(run(cells[2])).toEqual([
      'from above: median 1.5809, 95% of faces under 10.2512, worst 10.2512',
      'around (cylinder): median 1.839, 95% of faces under 52.6305, worst 52.6305',
      'box (by the normal): median 1.1393, 95% of faces under 1.4653, worst 1.5809',
    ]);
    expect(run(cells[3])[0]).toMatch(/^pixels on the spheres: \d+$/);
  });

  it('the notebook\'s 1/cos θ matches the engine\'s projection', async () => {
    const { makePrimitive } = await import('../../engines/mesh/core/primitives');
    const { traceUVProjection } = await import('../../engines/mesh/core/projection');
    const { angleDistortion } = await import('../../engines/mesh/core/uv');
    const m = makePrimitive('grid', { size: 2, subdivisions: 2 });
    const th = Math.PI / 6;
    m.verts = m.verts.map(([x, y, z]) => [x, y * Math.cos(th) - z * Math.sin(th), y * Math.sin(th) + z * Math.cos(th)]);
    for (const d of angleDistortion(m, traceUVProjection(m, 'planar').layer)) expect(d).toBeCloseTo(1 / Math.cos(th), 9);
  });

  it('the challenge: each slip is named', () => {
    const at = (e) => checkRoof(`const ratio = ${e}`).message;
    expect(checkRoof(challenge.solutionCode).pass).toBe(true);
    expect(checkRoof('const ratio = 1.1547').pass).toBe(true);
    expect(checkRoof(challenge.startCode).pass).toBe(false);
    expect(at('Math.cos(Math.PI / 6)')).toMatch(/other way/);
    expect(at(2)).toMatch(/sin 30/);
    expect(at('1 / Math.cos(30)')).toMatch(/radians/);
  });
});

describe('lesson 8.4: conformal maps and LSCM', () => {
  const cells = lesson84.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('Cauchy–Riemann and the conformal energy', () => {
    expect(run(cells[0])).toEqual([
      'turn 30°, scale 2: (a − d)² + (b + c)² = 0, σ₁/σ₂ = 1, det 4',
      'shear by 0.5: (a − d)² + (b + c)² = 0.25, σ₁/σ₂ = 1.6404, det 1',
      'squash y by half: (a − d)² + (b + c)² = 0.25, σ₁/σ₂ = 2, det 0.5',
      'mirror in x: (a − d)² + (b + c)² = 4, σ₁/σ₂ = 1, det -1',
    ]);
    expect(run(cells[1])).toEqual(['u = x, v = z: E_D 4, A 4, E 0', 'u = x + 0.5 z, v = z: E_D 4.5, A 4, E 0.5', 'u = 2x, v = 2z: E_D 16, A 16, E 0']);
  });

  it('the notebook\'s LSCM matches the engine on the dome', async () => {
    const out = run(cells[2]);
    expect(out[0]).toMatch(/^LSCM, \d+ CG iterations: angle distortion mean 1.0735, worst 1.215; area scale varies 4.1368×$/);
    expect(out[1]).toBe('projected from above: angle distortion mean 2.8619, worst 10.2895; area scale varies 10.2391×');
    expect(run(cells[3])[0]).toMatch(/^one pin: the UVs span 0 /);
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const { lscm } = await import('../../engines/mesh/core/uv');
    const { Trace } = await import('../../engines/mesh/core/trace');
    const S = 24, R = 8, V = [[0, 1, 0]], F = [];
    for (let i = 1; i <= R; i++) for (let j = 0; j < S; j++) { const a = (Math.PI / 2) * i / R, b = 2 * Math.PI * j / S; V.push([Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b)]); }
    const at = (i, j) => 1 + (i - 1) * S + (j % S);
    for (let j = 0; j < S; j++) F.push([0, at(1, j + 1), at(1, j)]);
    for (let i = 1; i < R; i++) for (let j = 0; j < S; j++) F.push([at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i + 1, j)]);
    const t = new Trace('Unwrap (LSCM)');
    lscm(new EditMesh(V, F), t, 'Chart 1');
    expect(t.steps.at(-1).label).toBe('Chart 1: angle distortion σ₁/σ₂ mean 1.0735, worst 1.215; area scale from 0.238 to 0.985');
  });

  it('the challenge: each slip is named', () => {
    const at = (b, d) => checkConformal(`const answer = { b: ${b}, d: ${d} }`).message;
    expect(checkConformal(challenge.solutionCode).pass).toBe(true);
    expect(checkConformal(challenge.startCode).pass).toBe(false);
    expect(at(0.8, -0.6)).toMatch(/reflection/);
    expect(at(0.8, 0.6)).toMatch(/symmetric/);
    expect(at(0, 0.6)).toMatch(/d is right/);
  });
});

describe('lesson 8.5: measuring distortion', () => {
  const cells = lesson85.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('the Jacobian, singular values and measures', () => {
    expect(run(cells[0])[0]).toBe('J = [[0.2, 0], [0, 0.3]]');
    expect(run(cells[1])).toEqual(['measured on the ellipse: longest 1.2808, shortest 0.7808', 'from JᵀJ: σ₁ 1.2808, σ₂ 0.7808; σ₁σ₂ = 1 = det J = 1']);
    expect(run(cells[2])).toEqual([
      'turn and double: σ₁/σ₂ 1, area 4, not flipped, stretch 2', 'squash and stretch: σ₁/σ₂ 4, area 1, not flipped, stretch 2',
      'turn only: σ₁/σ₂ 1, area 1, not flipped, stretch 1', 'mirror: σ₁/σ₂ 1, area 1, flipped, stretch 1',
    ]);
    expect(run(cells[3])[2]).toBe('φ ≈ 61.875°: mean σ₁/σ₂ 2.1356, 1/cos φ = 2.1214');
    expect(run(cells[4])).toEqual(['worst σ₁/σ₂: from above 14.1368, stereographic 1']);
  });

  it('the notebook\'s singular values match the engine\'s', async () => {
    const { singularValues, triangleJacobian } = await import('../../engines/mesh/core/distortionTrace');
    const { J } = triangleJacobian([[0, 0, 0], [2, 0, 0], [0.5, 0, 1]], [[0.1, 0.1], [0.5, 0.1], [0.2, 0.4]]);
    expect(J.flat().map((x) => +x.toFixed(9))).toEqual([0.2, 0, 0, 0.3]);
    expect(singularValues([[1, 0.5], [0, 1]]).map((x) => +x.toFixed(4))).toEqual([1.2808, 0.7808]);
  });

  it('the challenge: each slip is named', () => {
    const at = (a, b) => checkSigmas(`const answer = { angle: ${a}, area: ${b} }`).message;
    expect(checkSigmas(challenge.solutionCode).pass).toBe(true);
    expect(checkSigmas(challenge.startCode).pass).toBe(false);
    expect(at(1, 1)).toMatch(/zero/);
    expect(at(2, 1)).toMatch(/ratio/);
    expect(at(4, 2.5)).toMatch(/product/);
    expect(at(4, -1)).toMatch(/not flipped/);
  });
});

describe('lesson 8.6: straighten and pack', () => {
  const cells = lesson86.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('the smallest box, true area and shelves', () => {
    const box = run(cells[0]);
    expect(box[0]).toBe('as it is: 2.7383 × 2.6526 = 7.2636');
    expect(box.at(-1)).toBe('smallest: turn by 144.4725°, area 3.6868');
    expect(run(cells[1])[0]).toBe('A: scale 2, UV area after 2 = surface area');
    expect(run(cells[2])).toEqual(['in the order given: 46.2822% of the square used', 'tallest first: 73.9904% used']);
    expect(run(cells[3])).toEqual(['5 shelves; 73.9904% of the square used']);
  });

  it('the engine straightens to the same smallest box', async () => {
    const { EditMesh } = await import('../../engines/mesh/core/EditMesh');
    const { straighten } = await import('../../engines/mesh/core/uv');
    const t = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
    const uv = [[0, 0], [3, 0], [3.4, 1.1], [0.3, 0.8]].map((p) => t(p, Math.PI / 6));
    const m = new EditMesh(uv.map(([u, v]) => [u, 0, v]), [[0, 1, 2, 3]]);
    const out = straighten(m, uv), us = out.map((p) => p[0]), vs = out.map((p) => p[1]);
    expect((Math.max(...us) - Math.min(...us)) * (Math.max(...vs) - Math.min(...vs))).toBeCloseTo(3.6868, 4);
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkTexels(`const texels = ${x}`).message;
    expect(checkTexels(challenge.solutionCode).pass).toBe(true);
    expect(checkTexels('const texels = 128').pass).toBe(true);
    expect(checkTexels(challenge.startCode).pass).toBe(false);
    expect(at(512)).toMatch(/texel density/);
    expect(at('2048 * 4')).toMatch(/divide 2048 by 4/);
    expect(at('2048 / 4 / 0.25')).toMatch(/whole texture/);
  });
});

describe('lesson 9.1: light and the cosine law', () => {
  const cells = lesson91.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: (_, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('the cosine law, Lambert and sRGB', () => {
    expect(run(cells[0])[2]).toBe('60°: 0.5 of the rays (cos θ = 0.5)');
    expect(run(cells[1])[1]).toBe('tilted 60°: N·L 0.5, d 0.5, colour 0.36');
    expect(run(cells[2])[1]).toBe('linear 0.5 → screen 188 (without encoding: 128)');
    expect(run(cells[3])[0]).toMatch(/^pixels shaded: \d+$/);
  });

  it('the notebook\'s encoding and Lambert agree with the engine\'s shading trace', async () => {
    const { shadePoint, toSRGB } = await import('../../engines/mesh/core/shadingTrace');
    expect(Math.round(255 * toSRGB(0.6))).toBe(203);
    const r = shadePoint({ model: 'lambert', P: [0, 0, 0], N: [0, 0.6, 0.8], L: [0, 1, 0], eye: [0, 0, 5], light: [1, 1, 1], base: [1, 1, 1] });
    expect(r.terms['N·L']).toBeCloseTo(0.6, 12);
  });

  it('the challenge: each slip is named', () => {
    const at = (d, sc) => checkLambertPixel(`const answer = { d: ${d}, screen: ${sc} }`).message;
    expect(checkLambertPixel(challenge.solutionCode).pass).toBe(true);
    expect(checkLambertPixel(challenge.startCode).pass).toBe(false);
    expect(at(0.8, 203)).toMatch(/z component/);
    expect(at(0.6, 153)).toMatch(/without the sRGB/);
    expect(at(0.6, 83)).toMatch(/decodes/);
  });
});

describe('lesson 9.2: highlights', () => {
  const cells = lesson92.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: (_, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('R and H, the width, the colour and the picture', () => {
    expect(run(cells[0])[3]).toBe('eye at 60°: R to V 20°, N to H 10°');
    expect(run(cells[1])[2]).toBe('shininess 40: half brightness 10.6357° from the centre');
    expect(run(cells[2])).toEqual(['plastic: (1.24, 0.68, 0.68)  →  screen (255, 215, 215)', 'metal:   (0.48, 0.06, 0.06)  →  screen (184, 69, 69)']);
    const peaks = run(cells[3])[0].replace('brightest highlight on each: ', '').split(', ').map(Number);
    for (const p of peaks) expect(p).toBeGreaterThan(0.97);
  });

  it('the notebook\'s highlight matches the engine\'s', async () => {
    const { shadePoint } = await import('../../engines/mesh/core/shadingTrace');
    const r = shadePoint({ model: 'blinn-phong', P: [0, 0, 0], N: [0, 1, 0], L: [-Math.sin(0.7), Math.cos(0.7), 0], eye: [Math.sin(1.0) * 5, Math.cos(1.0) * 5, 0], light: [1, 1, 1], base: [1, 1, 1], shininess: 40 });
    expect(r.terms['N·H']).toBeCloseTo(Math.cos(0.15), 9);
    expect(r.terms.s).toBeCloseTo(Math.pow(Math.cos(0.15), 40), 9);
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkShininess(`const n = ${x}`).message;
    expect(checkShininess(challenge.solutionCode).pass).toBe(true);
    expect(checkShininess('const n = 45').pass).toBe(true);
    expect(checkShininess(challenge.startCode).pass).toBe(false);
    expect(at('Math.log(0.5) / Math.log(Math.cos(10))')).toMatch(/radians/);
    expect(at('Math.log(Math.cos(10 * Math.PI / 180)) / Math.log(0.5)')).toMatch(/Upside down/);
  });
});

describe('lesson 9.3: physically based shading', () => {
  const cells = lesson93.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: (_, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('GGX, Fresnel and energy', () => {
    expect(run(cells[0])[1]).toBe('roughness 0.4: D at 0° 12.434, at 10° 2.6956, at 30° 0.1124; total 1');
    expect(run(cells[1])[3]).toBe('80°: plastic 0.4099, silver 0.9693');
    expect(run(cells[2])).toEqual(['roughness 0.15: 1.0006 of the light reflected', 'roughness 0.4: 0.9677 of the light reflected', 'roughness 0.8: 0.5552 of the light reflected']);
    expect(run(cells[3])).toEqual(['drawn: 2 rows × 3 roughnesses']);
  });

  it('the notebook\'s terms match the engine\'s shading trace', async () => {
    const { shadePoint } = await import('../../engines/mesh/core/shadingTrace');
    const r = shadePoint({ model: 'pbr', P: [0, 0, 0], N: [0, 1, 0], L: [0, 1, 0], eye: [0, 5, 0], light: [1, 1, 1], base: [0.5, 0.5, 0.5], roughness: 0.4, metalness: 0 });
    expect(r.terms.D).toBeCloseTo(12.434, 3);
    expect(r.terms.F).toBeCloseTo(0.04, 9);
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkFresnel(`const F75 = ${x}`).message;
    expect(checkFresnel(challenge.solutionCode).pass).toBe(true);
    expect(checkFresnel(challenge.startCode).pass).toBe(false);
    expect(at(0.04)).toMatch(/F₀/);
    expect(at('0.04 + 0.96 * Math.pow(Math.cos(75 * Math.PI / 180), 5)')).toMatch(/not of V·H/);
    expect(at('0.04 + Math.pow(1 - Math.cos(75 * Math.PI / 180), 5)')).toMatch(/0.96/);
    expect(at('Math.cos(75)')).toMatch(/radians/);
  });
});

describe('lesson 9.4: stylised shading', () => {
  const cells = lesson94.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: (_, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('bands, rim, outline and the picture', () => {
    const bands = run(cells[0]);
    expect(bands[1]).toBe('d 0.99: 3 bands → 0.6667, 4 bands → 0.75');
    expect(bands.at(-1)).toBe('3-band edges at 70.5288°, 48.1897° from the light');
    expect(run(cells[1])[3]).toBe('N at 60° from V (N·V 0.5): rim 0.0625');
    expect(run(cells[2])[1]).toBe("threshold 0.25: outline from radius 0.9682 out, 3.1754% of the radius, 6.25% of the disc's area");
    expect(run(cells[3])).toEqual(['light levels on the toon ball: 0, 0.3333, 0.6667']);
  });

  it('the notebook\'s band matches the engine\'s toon shader', async () => {
    const { shadePoint } = await import('../../engines/mesh/core/shadingTrace');
    const r = shadePoint({ model: 'toon', P: [0, 0, 0], N: [0, 1, 0], L: [Math.sin(1.05), Math.cos(1.05), 0], eye: [0, 0, 5], light: [1, 1, 1], base: [1, 1, 1], bands: 3 });
    expect(r.terms.band).toBeCloseTo(Math.floor(Math.cos(1.05) * 3) / 3, 12);
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkBandEdge(`const degrees = ${x}`).message;
    expect(checkBandEdge(challenge.solutionCode).pass).toBe(true);
    expect(checkBandEdge('const degrees = 41.4').pass).toBe(true);
    expect(checkBandEdge(challenge.startCode).pass).toBe(false);
    expect(at('Math.acos(0.75)')).toMatch(/radians/);
    expect(at(67.5)).toMatch(/equal steps of angle/);
    expect(at('Math.acos(0.25) * 180 / Math.PI')).toMatch(/darkest/);
  });
});

describe('lesson 9.5: debug views', () => {
  const cells = lesson95.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: (_, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('encoding, a flipped face, a seam and precision', () => {
    expect(run(cells[0])[0]).toBe('up: N (0, 1, 0) → colour (0.5, 1, 0.5) → back to (0, 1, 0)');
    expect(run(cells[1]).slice(0, 2)).toEqual(['face 0: colour (0.5, 0.5, 1)  ← points inward: flipped', 'face 1: colour (0.5, 0.5, 1)']);
    expect(run(cells[2])[0]).toBe('between corners 11 and 12: red 0.9167 → 0  ← a seam');
    expect(run(cells[3])).toEqual(['worst error over 20 000 directions: 0.3785°']);
    expect(run(cells[4])).toEqual(['drawn']);
  });

  it('the notebook\'s encoding matches the engine\'s Normals model', async () => {
    const { shadePoint } = await import('../../engines/mesh/core/shadingTrace');
    const r = shadePoint({ model: 'normals', P: [0, 0, 0], N: [-0.6, 0.8, 0], L: [0, 1, 0], eye: [0, 0, 5], light: [1, 1, 1], base: [1, 1, 1] });
    r.color.forEach((c, k) => expect(c).toBeCloseTo([0.2, 0.9, 0.5][k], 12));
  });

  it('the challenge: each slip is named', () => {
    const at = (x, y, z) => checkDecode(`const N = { x: ${x}, y: ${y}, z: ${z} }`).message;
    expect(checkDecode(challenge.solutionCode).pass).toBe(true);
    expect(checkDecode('const N = { x: 0.7071, y: -0.7071, z: 0 }').pass).toBe(true);
    expect(checkDecode(challenge.startCode).pass).toBe(false);
    expect(at(0.5, -0.5, 0)).toMatch(/normalise/);
    expect(at(0.75, 0.25, 0.5)).toMatch(/colour itself/);
  });
});

describe('lesson 9.6: procedural textures', () => {
  const cells = lesson96.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: (_, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('checker, bricks, tiling and the picture', () => {
    expect(run(cells[0]).at(-1)).toBe('cell (3, 5): white');
    const bricks = run(cells[1]);
    expect(bricks[0]).toBe('BBBBBB|BBBBBBBBBBB|BBBBBBBBBBB|BBBBBBBBBBB|BBBBB');
    expect(bricks.at(-1)).toBe('v = 0.3 is in row 2');
    expect(run(cells[2])).toEqual([
      'checker: largest difference one square on 206 ← a visible join', 'stripes: largest difference one square on 0 (tiles)',
      'bricks: largest difference one square on 0 (tiles)', 'wood: largest difference one square on 50 ← a visible join',
      'grass: largest difference one square on 1 (tiles)',
    ]);
    expect(run(cells[3])).toEqual(['drawn: checker, stripes, bricks, wood, grass']);
  });

  it('the notebook\'s formulas are the engine\'s texels', async () => {
    const { texelColor } = await import('../../engines/mesh/core/shading');
    const tex = new Function(cells[0].startCode.split('const CHECKER')[0].replace(/console\.log[^\n]*\n?/g, '') + '; return tex')();
    for (const name of ['checker', 'stripes', 'bricks', 'wood', 'grass']) for (const [u, v] of [[0.1, 0.2], [0.37, 0.81], [0.93, 0.44]]) expect(tex[name](u, v)).toEqual(texelColor(name, u, v));
  });

  it('the challenge: each slip is named', () => {
    const at = (r, b) => checkBrick(`const answer = { row: ${r}, brick: ${b} }`).message;
    expect(checkBrick(challenge.solutionCode).pass).toBe(true);
    expect(checkBrick(challenge.startCode).pass).toBe(false);
    expect(at(3, 2)).toMatch(/no repeat/);
    expect(at(6, 1)).toMatch(/no half-brick shift/);
  });
});

describe('lesson 9.7: write a shader', () => {
  const cells = lesson97.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: (_, k) => (k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {}), set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('shade(), error lines, floats and tone mapping', () => {
    expect(run(cells[0])[2]).toBe('edge-on to the eye: (0.43, 0.37, 0.362)');
    expect(run(cells[1]).slice(0, 2)).toEqual(['your body starts on program line 8', "line 2 of your code: 'pow' : no matching overloaded function found"]);
    expect(run(cells[2]).filter((l) => l.startsWith('✗'))).toEqual(['✗ float d = max(dot(N, L), 0);', '✗ vec3 c = base * 2;', '✗ float s = pow(d, 40);']);
    expect(run(cells[3])[4]).toBe('linear 3: clipped 255, Reinhard 225');
    expect(run(cells[4])).toEqual(['brightest linear value: 2.2829']);
  });

  it('the notebook\'s float rule agrees with MeshLab\'s checks', async () => {
    const { lintShaderBody } = await import('../../engines/mesh/core/shaderTrace');
    expect(lintShaderBody('float s = pow(d, 40);\nreturn base * s;').map((x) => x.line)).toEqual([1]);
    expect(lintShaderBody('float s = pow(d, 40.0);\nreturn base * s;')).toEqual([]);
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkErrorLine(`const yourLine = ${x}`).message;
    expect(checkErrorLine(challenge.solutionCode).pass).toBe(true);
    expect(checkErrorLine('const yourLine = 6').pass).toBe(true);
    expect(checkErrorLine(challenge.startCode).pass).toBe(false);
    expect(at(5)).toMatch(/add 1/);
    expect(at(24)).toMatch(/whole program/);
  });
});

describe('lesson 10.1: keyframes', () => {
  const cells = lesson101.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('sampling, time and search', () => {
    expect(run(cells[0]).slice(1, 2)).toEqual(['frame 7: x = -2.25']);
    expect(run(cells[0]).at(-1)).toBe('frame 60: x = 3');
    expect(run(cells[1])[0]).toBe('24 fps: frames 1 → 49 take 2 s');
    expect(run(cells[2])[1]).toBe('frame 1001: walking 501 checks, binary search 10');
    expect(run(cells[3])).toEqual(['keys at frames 1, 25, 49']);
  });

  it('the notebook\'s sample matches the engine\'s', async () => {
    const { sampleKeys } = await import('../../engines/mesh/core/animation');
    const keys = [{ frame: 1, value: [-3, 0.3, 0], interp: 'linear' }, { frame: 25, value: [0, 2.3, 0], interp: 'linear' }, { frame: 49, value: [3, 0.3, 0], interp: 'linear' }];
    expect(sampleKeys(keys, 7).value[0]).toBeCloseTo(-2.25, 12);
    expect(sampleKeys(keys, 60).value).toEqual([3, 0.3, 0]);
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkKeyValue(`const angle = ${x}`).message;
    expect(checkKeyValue(challenge.solutionCode).pass).toBe(true);
    expect(checkKeyValue(challenge.startCode).pass).toBe(false);
    expect(at(18)).toMatch(/add the first key/);
    expect(at('92 * 16 / 40')).toMatch(/counts from the first key/);
  });
});

describe('lesson 10.2: interpolation and easing', () => {
  const cells = lesson102.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('easings, gravity and slopes', () => {
    expect(run(cells[0])[1]).toBe('ease-in  0  0.0625  0.25  0.5625  1');
    expect(run(cells[1])).toEqual(['linear    worst error 0.75 m', 'ease-in   worst error 0 m', 'ease-out  worst error 1.5 m', 'ease      worst error 0.8886 m']);
    expect(run(cells[2]).at(-1)).toBe('top of a throw: arriving 0, leaving 0');
    expect(run(cells[3])).toEqual(['drawn']);
  });

  it('the notebook\'s easings are the engine\'s', async () => {
    const { ease } = await import('../../engines/mesh/core/animation');
    for (const t of [0.1, 0.37, 0.8]) {
      expect(ease(t, 'ease-in')).toBeCloseTo(t * t, 12);
      expect(ease(t, 'ease-out')).toBeCloseTo(1 - (1 - t) ** 2, 12);
      expect(ease(t, 'ease')).toBeCloseTo(t * t * (3 - 2 * t), 12);
    }
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkFallFrames(`const frames = ${x}`).message;
    expect(checkFallFrames(challenge.solutionCode).pass).toBe(true);
    expect(checkFallFrames('const frames = 17').pass).toBe(true);
    expect(checkFallFrames(challenge.startCode).pass).toBe(false);
    expect(at(12)).toMatch(/√\(2h\/g\)/);
    expect(at('Math.sqrt(2 * 2.45 / 9.8) * 24')).toMatch(/Round/);
  });
});

describe('lesson 10.3: quaternions', () => {
  const cells = lesson103.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('half angles, combining, no lock, and the picture', () => {
    expect(run(cells[0]).slice(1, 2)).toEqual(['y by 90°: q = (0, 0.7071, 0, 0.7071)']);
    expect(run(cells[0])[4]).toBe('y by 360°: q = (0, 0, 0, -1)');
    expect(run(cells[1])[0]).toBe('q = (0.5, 0.5, -0.5, 0.5): one turn of 120° about (0.5774, 0.5774, -0.5774)');
    expect(run(cells[2])[2]).toBe('(0°, 90°, 30°):  (0.183, 0.683, 0.183, 0.683)  ← the same as the first: only x + z counted');
    expect(run(cells[3])).toEqual(['the tip at 120°: (0, 1, 0) (x goes to y)']);
  });

  it('the notebook\'s quaternions match three.js (through the engine)', async () => {
    const { eulerToQuat } = await import('../../engines/mesh/core/animation');
    const q = eulerToQuat([10 * Math.PI / 180, Math.PI / 2, 20 * Math.PI / 180]);
    [0.183, 0.683, 0.183, 0.683].forEach((x, i) => expect(q[i]).toBeCloseTo(x, 3));
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkQuat(`const q = [${x}]`).message;
    expect(checkQuat(challenge.solutionCode).pass).toBe(true);
    expect(checkQuat('const q = [0, 0, -0.866, -0.5]').pass).toBe(true);
    expect(checkQuat(challenge.startCode).pass).toBe(false);
    expect(at('0, 0, Math.sin(2 * Math.PI / 3), Math.cos(2 * Math.PI / 3)')).toMatch(/half the angle/);
    expect(at('0, 0, 0.5, 0.866')).toMatch(/swapped/);
    expect(at('0.866, 0, 0, 0.5')).toMatch(/z place/);
  });
});

describe('lesson 10.4: slerp', () => {
  const cells = lesson104.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('even and shortest, the short way, the weights', () => {
    expect(run(cells[0])).toEqual([
      'Euler angles     turns per step: 47.6838°, 47.6838°, 47.6838°, 47.6838°; in all 190.7352°',
      'lerp (straight)  turns per step: 35.1629°, 47.4017°, 47.4017°, 35.1629°; in all 165.1292°',
      'slerp            turns per step: 41.2823°, 41.2823°, 41.2823°, 41.2823°; in all 165.1292°',
      'the end is 165.1291° from the start: no route can turn less',
    ]);
    expect(run(cells[1]).slice(1)).toEqual(['halfway, without the check: y = 150°  (the long way: 150°)', 'halfway, with the check:    y = -30°  (the short way: −30°, same as 330°)']);
    expect(run(cells[2])[1]).toBe('θ = 60°: weights at s = ½ are 0.5774 and 0.5774 (sum 1.1547)');
  });

  it('the notebook\'s slerp matches the engine\'s', async () => {
    const { slerp, eulerToQuat } = await import('../../engines/mesh/core/animation');
    const q0 = eulerToQuat([0, 0, 0]), q1 = eulerToQuat([0, 150 * Math.PI / 180, 120 * Math.PI / 180]);
    expect(2 * Math.acos(Math.abs(slerp(q0, q1, 0.25).q[3])) * 180 / Math.PI).toBeCloseTo(41.2823, 3);
  });

  it('the challenge: each slip is named', () => {
    const at = (x) => checkSlerpWeight(`const weight = ${x}`).message;
    expect(checkSlerpWeight(challenge.solutionCode).pass).toBe(true);
    expect(checkSlerpWeight(challenge.startCode).pass).toBe(false);
    expect(at(0.25)).toMatch(/straight blend/);
    expect(at('Math.sin(0.75 * Math.PI / 2)')).toMatch(/weight on q₀/);
  });
});

describe('lesson 10.5: motion through a hierarchy', () => {
  const cells = lesson105.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('composing, the curve and baking', () => {
    expect(run(cells[0]).at(-1)).toBe('frame 49: pen at (-1.2, 2)');
    expect(run(cells[1])).toEqual(['path 5.5523, straight line 4.1785']);
    expect(run(cells[2])).toEqual(['every 1 frames: 49 keys, worst gap 0', 'every 3 frames: 17 keys, worst gap 0.0067', 'every 6 frames: 9 keys, worst gap 0.0303', 'every 12 frames: 5 keys, worst gap 0.1197']);
    expect(run(cells[3])).toEqual(['drawn']);
  });

  it('the notebook\'s arm agrees with the engine\'s worldAt', async () => {
    const { Scene } = await import('../../engines/mesh/core/Scene');
    const { worldAt } = await import('../../engines/mesh/core/animTrace');
    const scene = new Scene();
    const sh = scene.add({ name: 'Shoulder', position: [0, 0.5, 0] }), el = scene.add({ name: 'Elbow', position: [1.5, 0, 0] }), pen = scene.add({ name: 'Pen', position: [1.2, 0, 0] });
    el.parent = sh.id; pen.parent = el.id;
    for (const o of [sh, el]) o.anim = { rotation: [{ frame: 1, value: [0, 0, 0], interp: 'linear' }, { frame: 49, value: [0, 0, Math.PI / 2], interp: 'linear' }] };
    const e = worldAt(scene, pen, 25).elements;
    expect(e[12]).toBeCloseTo(1.0607, 4);
    expect(e[13]).toBeCloseTo(2.7607, 4);
  });

  it('the challenge: each slip is named', () => {
    const at = (x, y) => checkTip(`const tip = { x: ${x}, y: ${y} }`).message;
    expect(checkTip(challenge.solutionCode).pass).toBe(true);
    expect(checkTip(challenge.startCode).pass).toBe(false);
    expect(at('Math.sqrt(3) + 0.5', '1 + Math.sqrt(3) / 2')).toMatch(/relative/);
    expect(at('Math.sqrt(3)', 1)).toMatch(/That is the elbow/);
  });
});

describe('lesson 10.6: a walk cycle', () => {
  const cells = lesson106.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('poses, the loop, sliding and the strobe', () => {
    expect(run(cells[0])).toEqual(['frame 0: left foot height 0, right foot height 0', 'frame 3: left foot height 0, right foot height 0.2335', 'frame 6: left foot height 0, right foot height 0.2298', 'frame 9: left foot height 0, right foot height 0.0247']);
    expect(run(cells[1])).toContain('frame 50 plays frame 2');
    expect(run(cells[1])).toContain('frame 25 plays frame 1');
    expect(run(cells[2])).toEqual(['sweep ±0.06 rad: the foot slides 0.1201', 'sweep ±0.12 rad: the foot slides 0.0006', 'sweep ±0.24 rad: the foot slides 0.2354']);
    expect(run(cells[3])).toEqual(['poses drawn: 9; the foot touches the ground at x = 0.225 and 1.125 (one stride apart)']);
  });

  it('the challenge: each slip is named', () => {
    const at = (v) => checkWalkSpeed(`const speed = ${v}`).message;
    expect(checkWalkSpeed(challenge.solutionCode).pass).toBe(true);
    expect(checkWalkSpeed(challenge.startCode).pass).toBe(false);
    expect(at('0.45')).toMatch(/one step/);
    expect(at('0.9 / 24')).toMatch(/per frame/);
    expect(at('0.9 * 24')).toMatch(/one second/);
  });
});

describe('lesson 10.7: animation in files', () => {
  const cells = lesson107.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('channels, bytes, baking and the picture', () => {
    expect(run(cells[0])[0]).toBe('3 channels');
    expect(run(cells[1])).toEqual(['49 keys, from 0 s to 2 s', 'translation: 196 + 588 = 784 bytes', 'rotation: 196 + 784 = 980 bytes', 'scale: 196 + 588 = 784 bytes', 'total 2548 bytes']);
    expect(run(cells[2])).toEqual(['a key every 24 frames: 2 keys, worst error 0.5', 'a key every 4 frames: 7 keys, worst error 0.0139', 'a key every frame: 25 keys, worst error 0.0009']);
    expect(run(cells[3])).toEqual(['baked keys drawn: 13']);
  });

  it('the notebook\'s bytes agree with MeshLab\'s traceClip of the gltf-clip project', async () => {
    const { PROJECTS } = await import('../../labs/mesh-lab/core/projects');
    expect(PROJECTS.find((p) => p.id === 'gltf-clip').code).toContain("scene.setTimeline({ start: 1, end: 49, fps: 24 })");
  });

  it('the challenge: each slip is named', () => {
    const at = (v) => checkClipBytes(`const bytes = ${v}`).message;
    expect(checkClipBytes(challenge.solutionCode).pass).toBe(true);
    expect(checkClipBytes(challenge.startCode).pass).toBe(false);
    expect(at('20 * 4 * 61 * 4 + 4 * 61 * 3')).toMatch(/input/);
    expect(at('20 * 4 * 60 * 5 + 4 * 60 * 4')).toMatch(/61 keys/);
    expect(at('20 * 4 * 61 * 4 + 4 * 61 * 4')).toMatch(/quaternion/);
    expect(at('25376 / 4')).toMatch(/counts floats/);
    expect(at('20 * 4 * 61 * 5')).toMatch(/root/);
  });
});

describe('lesson 11.1: bones', () => {
  const cells = lesson111.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };

  it('direction, turn, roll, matrix and the picture', () => {
    expect(run(cells[0])).toEqual(['tail − head = (0.3, 0.4, 1.2), length 1.3', 'unit direction (0.2308, 0.3077, 0.9231)']);
    expect(run(cells[1])[0]).toBe('turned 72.0798° from +y');
    expect(run(cells[1])[2]).toBe('lengths 1, 1, 1; x·y 0, y·z 0, z·x 0');
    expect(run(cells[2])).toEqual(['roll 0°: x (1, 0, 0), y (0, 0.7071, 0.7071), z (0, -0.7071, 0.7071); tail (1.5, 1, 1)', 'roll 90°: x (0, 0.7071, -0.7071), y (0, 0.7071, 0.7071), z (1, 0, 0); tail (1.5, 1, 1)']);
    expect(run(cells[3]).slice(-2)).toEqual(["tail in the bone's frame: (0, 1.3, 0)", 'halfway along the bone, (0, 0.65, 0), in the armature: (0.15, 1.7, 0.6)']);
    expect(run(cells[4])).toEqual(['bones drawn: 3']);
  });

  it('the notebook\'s frames agree with MeshLab\'s restMatrix', async () => {
    const { restMatrix } = await import('../../engines/mesh/core/armature');
    const e = restMatrix({ name: 'Arm', parent: null, head: [0, 1.5, 0], tail: [0.3, 1.9, 1.2], pose: [0, 0, 0] }).elements;
    expect(run(cells[1])[1]).toBe(`x (${[e[0], e[1], e[2]].map((x) => +x.toFixed(4)).join(', ')})  y (${[e[4], e[5], e[6]].map((x) => +x.toFixed(4)).join(', ')})  z (${[e[8], e[9], e[10]].map((x) => +x.toFixed(4)).join(', ')})`);
    const t = restMatrix({ name: 'Tilted', parent: null, head: [1.5, 0, 0], tail: [1.5, 1, 1], pose: [0, 0, 0], roll: Math.PI / 2 }).elements;
    expect(run(cells[2])[1]).toContain(`x (${[t[0], t[1], t[2]].map((x) => +(Math.abs(x) < 1e-9 ? 0 : x).toFixed(4)).join(', ')})`);
  });

  it('the challenge: each slip is named', () => {
    const at = (v) => checkBoneTurn(`const degrees = ${v}`).message;
    expect(checkBoneTurn(challenge.solutionCode).pass).toBe(true);
    expect(checkBoneTurn(challenge.startCode).pass).toBe(false);
    expect(checkBoneTurn('const degrees = 53.13').pass).toBe(true);
    expect(at('Math.acos(0.6)')).toMatch(/radians/);
    expect(at('Math.acos(0.8) * 180 / Math.PI')).toMatch(/horizontal/);
    expect(at('Math.acos(-0.6) * 180 / Math.PI')).toMatch(/reflex/);
    expect(at('Math.acos(3) * 180 / Math.PI')).toMatch(/unit direction/);
  });
});

describe('lesson 11.2: posing', () => {
  const cells = lesson112.intuition.visualizations[0].props.lesson.cells;
  const challenge = cells.find((c) => c.type === 'challenge');
  const run = (cell) => {
    const out = [];
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
    const document = { createElement: () => ({ style: {}, getContext: () => ctx }), body: { appendChild: () => {} } };
    new Function('console', 'document', cell.startCode)({ log: (...a) => out.push(a.join(' ')), error: () => {} }, document);
    return out;
  };
  const chain = [
    { name: 'Upper', parent: null, head: [0, 0, 0], tail: [0, 1, 0], pose: [Math.PI / 6, 0, 0] },
    { name: 'Lower', parent: 'Upper', head: [0, 1, 0], tail: [0, 2, 0], pose: [Math.PI / 4, 0, 0] },
    { name: 'Hand', parent: 'Lower', head: [0, 2, 0], tail: [0, 2.5, 0], pose: [0, 0, 0] },
  ];

  it('one bone, the chain, the order, the skin matrix and the picture', () => {
    expect(run(cells[0])).toEqual(['rest tail (0, 1, 0) → posed tail (0, 0.866, 0.5)', 'its head stays at (0, 0, 0)']);
    expect(run(cells[1])).toEqual([
      'Upper  head (0, 0, 0)  tail (0, 0.866, 0.5)  turned 30° from +y',
      'Lower  head (0, 0.866, 0.5)  tail (0, 1.1248, 1.4659)  turned 75° from +y',
      'Hand   head (0, 1.1248, 1.4659)  tail (0, 1.2543, 1.9489)  turned 75° from +y',
    ]);
    expect(run(cells[2])).toEqual(['parents first:  Lower tail (0, 1.1248, 1.4659), Hand tail (0, 1.2543, 1.9489)', 'children first: Lower tail (0, 1.7071, 0.7071), Hand tail (0, 2.5, 0)']);
    expect(run(cells[3])).toEqual(['rest pose: S rows [1, 0, 0] [0, 1, 0] [0, 0, 1], translation (0, 0, 0)', 'posed: the vertex (0.1, 1.5, 0) goes to (0.1, 0.9954, 0.983)', "check: Lower's rest tail (0, 2, 0) goes to (0, 1.1248, 1.4659), its posed tail"]);
    expect(run(cells[4])).toEqual(['drawn: 3 bones, rest and posed, and one vertex']);
  });

  it('the notebook agrees with MeshLab\'s boneMatrices and posedEnds', async () => {
    const { boneMatrices, posedEnds } = await import('../../engines/mesh/core/armature');
    const { Vector3 } = await import('three');
    const f = (v) => `(${v.map((x) => +(Math.abs(x) < 1e-9 ? 0 : x).toFixed(4)).join(', ')})`;
    const ends = posedEnds(chain);
    const lines = run(cells[1]);
    for (const [i, n] of ['Upper', 'Lower', 'Hand'].entries()) expect(lines[i]).toContain(`head ${f(ends.get(n).head)}  tail ${f(ends.get(n).tail)}`);
    const v = new Vector3(0.1, 1.5, 0).applyMatrix4(boneMatrices(chain).get('Lower').skin);
    expect(run(cells[3])[1]).toBe(`posed: the vertex (0.1, 1.5, 0) goes to ${f([v.x, v.y, v.z])}`);
    const child = posedEnds([
      { name: 'Upper', parent: null, head: [0, 0, 0], tail: [0, 1, 0], pose: [0, 0, Math.PI / 2] },
      { name: 'Lower', parent: 'Upper', head: [0, 1, 0], tail: [0, 2, 0], pose: [0, 0, 0] },
    ]).get('Lower').tail;
    expect(checkPoseTail(`const tail = [${child.map((x) => +x.toFixed(4)).join(', ')}]`).pass).toBe(true);
  });

  it('the challenge: each slip is named', () => {
    const at = (v) => checkPoseTail(`const tail = [${v}]`).message;
    expect(checkPoseTail(challenge.solutionCode).pass).toBe(true);
    expect(checkPoseTail(challenge.startCode).pass).toBe(false);
    expect(at('0, 2, 0')).toMatch(/rest tail/);
    expect(at('2, 0, 0')).toMatch(/wrong side/);
    expect(at('-1, 0, 0')).toMatch(/Lower's head/);
    expect(at('-1, 1, 0')).toMatch(/turns with its parent/);
    expect(at('1, 2')).toMatch(/three/);
  });
});
