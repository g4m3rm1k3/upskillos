// Lesson 11.2: posing. A pose turns a bone about its own head, in its own frame; a child is posed after its parent,
// in the parent's posed frame: P = P_parent · O · R(pose), with O = B_parent⁻¹ · B. The skin matrix S = P · B⁻¹ moves a
// rest-pose point the way the bone moved. The notebook poses MeshLab's "pose-chain" (Upper, Lower, Hand) by hand.

const MAT = `const r = (x) => +(Math.abs(x) < 1e-9 ? 0 : x).toFixed(4)
const v = (a) => '(' + a.map(r).join(', ') + ')'
const rad = (d) => d * Math.PI / 180
// A rigid transform as a rotation (3 × 3, rows) and a translation: { R, t }. Its 4 × 4 matrix is [R t; 0 0 0 1].
const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
const mm = (A, B) => A.map((row) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]))
const mv = (A, p) => A.map((row) => row[0] * p[0] + row[1] * p[1] + row[2] * p[2])
const T = (R, t = [0, 0, 0]) => ({ R, t })
const compose = (A, B) => T(mm(A.R, B.R), mv(A.R, B.t).map((x, i) => x + A.t[i]))     // A · B
const invert = (A) => { const Rt = [0, 1, 2].map((i) => [0, 1, 2].map((j) => A.R[j][i])); return T(Rt, mv(Rt, A.t).map((x) => -x)) }
const apply = (A, p) => mv(A.R, p).map((x, i) => x + A.t[i])
// A pose rotation: Euler angles about x, then y, then z, as MeshLab and three.js build it (R = Rx · Ry · Rz).
const Rx = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]]
const Ry = (a) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]]
const Rz = (a) => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]]
const pose = ([x, y, z]) => T(mm(mm(Rx(x), Ry(y)), Rz(z)))
// The rest matrix B of a vertical bone (these all point up +y, no roll): its axes are the armature's, at its head.
const rest = (bone) => T(I3, bone.head)
`;
const CHAIN = `const bones = [
  { name: 'Upper', parent: null, head: [0, 0, 0], tail: [0, 1, 0], pose: [rad(30), 0, 0] },
  { name: 'Lower', parent: 'Upper', head: [0, 1, 0], tail: [0, 2, 0], pose: [rad(45), 0, 0] },
  { name: 'Hand', parent: 'Lower', head: [0, 2, 0], tail: [0, 2.5, 0], pose: [0, 0, 0] },
]
const len = (b) => Math.hypot(...b.tail.map((x, i) => x - b.head[i]))
`;

const ONE = MAT + CHAIN + `
// One bone, posed: P = B · R(pose). The pose turns the bone about its own head, in its own frame. Upper is turned
// 30° about its x axis. Predict first: where does its tail go?
const up = bones[0], P = compose(rest(up), pose(up.pose))
console.log('rest tail ' + v(up.tail) + ' → posed tail ' + v(apply(P, [0, len(up), 0])))
console.log('its head stays at ' + v(apply(P, [0, 0, 0])))`;
const CHAIN_CELL = MAT + CHAIN + `
// The chain. A child sits in its parent's frame by its offset O = B_parent⁻¹ · B, and is posed after it:
// P = P_parent · O · R(pose). Predict first: Lower turns 45° on top of Upper's 30°. By how much is it turned in all,
// and where is the Hand's tail?
const P = new Map(), B = new Map()
for (const b of bones) {
  B.set(b.name, rest(b))
  const O = b.parent ? compose(invert(B.get(b.parent)), rest(b)) : rest(b)
  const parentP = b.parent ? P.get(b.parent) : T(I3)
  P.set(b.name, compose(compose(parentP, O), pose(b.pose)))
  const head = apply(P.get(b.name), [0, 0, 0]), tail = apply(P.get(b.name), [0, len(b), 0])
  const angle = Math.atan2(tail[2] - head[2], tail[1] - head[1]) * 180 / Math.PI
  console.log(b.name.padEnd(6) + ' head ' + v(head) + '  tail ' + v(tail) + '  turned ' + r(angle) + '° from +y')
}`;
const ORDER = MAT + CHAIN + `
// Why parents first. Pose the bones in the wrong order (child before parent), and a child is built on a parent that
// has not moved yet. Predict first: where does Lower's tail end up if Upper is posed after it?
function poseAll(order) {
  const P = new Map()
  for (const b of order) {
    const O = b.parent ? compose(invert(rest(bones.find((x) => x.name === b.parent))), rest(b)) : rest(b)
    const parentP = b.parent ? (P.get(b.parent) ?? rest(bones.find((x) => x.name === b.parent))) : T(I3)   // not posed yet: its rest
    P.set(b.name, compose(compose(parentP, O), pose(b.pose)))
  }
  return (name) => v(apply(P.get(name), [0, len(bones.find((x) => x.name === name)), 0]))
}
const right = poseAll(bones), wrong = poseAll([bones[2], bones[1], bones[0]])
console.log('parents first:  Lower tail ' + right('Lower') + ', Hand tail ' + right('Hand'))
console.log('children first: Lower tail ' + wrong('Lower') + ', Hand tail ' + wrong('Hand'))`;
const SKIN = MAT + CHAIN + `
// The skin matrix S = P · B⁻¹: a mesh is modelled in the rest pose, so a vertex goes back into the bone's frame
// (B⁻¹), then out with the posed bone (P). Predict first: S in the rest pose; then where the forearm vertex
// (0.1, 1.5, 0) goes, carried by Lower.
const P = new Map()
for (const b of bones) {
  const O = b.parent ? compose(invert(rest(bones.find((x) => x.name === b.parent))), rest(b)) : rest(b)
  P.set(b.name, compose(compose(b.parent ? P.get(b.parent) : T(I3), O), pose(b.pose)))
}
const lower = bones[1], S = compose(P.get('Lower'), invert(rest(lower)))
const restS = compose(rest(lower), invert(rest(lower)))
console.log('rest pose: S rows ' + restS.R.map((row) => '[' + row.map(r).join(', ') + ']').join(' ') + ', translation ' + v(restS.t))
console.log('posed: the vertex (0.1, 1.5, 0) goes to ' + v(apply(S, [0.1, 1.5, 0])))
console.log('check: Lower\\'s rest tail (0, 2, 0) goes to ' + v(apply(S, [0, 2, 0])) + ', its posed tail')`;
const PICTURE = MAT + CHAIN + `
// The chain from the side (z across, y up): the rest pose in grey, the posed chain in colour, and the forearm vertex
// (0.1, 1.5, 0) carried by Lower's skin matrix from its rest place (grey dot) to its posed place (orange).
const P = new Map()
for (const b of bones) {
  const O = b.parent ? compose(invert(rest(bones.find((x) => x.name === b.parent))), rest(b)) : rest(b)
  P.set(b.name, compose(compose(b.parent ? P.get(b.parent) : T(I3), O), pose(b.pose)))
}
const canvas = document.createElement('canvas'), W = 380, H = 280
canvas.width = W * 2; canvas.height = H * 2; canvas.style.cssText = 'width: ' + W + 'px; height: ' + H + 'px; display: block; margin: 0 auto'
document.body.appendChild(canvas)
const g = canvas.getContext('2d'); g.scale(2, 2); g.fillStyle = '#0f1923'; g.fillRect(0, 0, W, H)
const S = (p) => [120 + 90 * p[2], H - 25 - 90 * p[1]]
const seg = (a, b, c, w) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(...S(a)); g.lineTo(...S(b)); g.stroke() }
const dot = (p, c) => { g.fillStyle = c; g.beginPath(); g.arc(...S(p), 4, 0, 7); g.fill() }
const colours = ['#38bdf8', '#a78bfa', '#f472b6']
bones.forEach((b, i) => {
  seg(b.head, b.tail, '#475569', 3)
  seg(apply(P.get(b.name), [0, 0, 0]), apply(P.get(b.name), [0, len(b), 0]), colours[i], 5)
  // the name beside the middle of the posed bone, on its lower side
  const [hx, hy] = S(apply(P.get(b.name), [0, 0, 0])), [tx, ty] = S(apply(P.get(b.name), [0, len(b), 0]))
  const d = Math.hypot(tx - hx, ty - hy)
  g.fillStyle = colours[i]; g.font = '11px sans-serif'
  g.fillText(b.name, (hx + tx) / 2 - 14 * (ty - hy) / d, (hy + ty) / 2 + 14 * (tx - hx) / d + 4)
})
const vtx = [0.1, 1.5, 0], Sk = compose(P.get('Lower'), invert(rest(bones[1])))
dot(vtx, '#94a3b8'); dot(apply(Sk, vtx), '#f59e0b')
console.log('drawn: 3 bones, rest and posed, and one vertex')`;

const CHALLENGE = `// Upper: head (0, 0, 0), tail (0, 1, 0), posed 90° about z. Lower: its child, head (0, 1, 0), tail (0, 2, 0),
// not posed. Where is Lower's tail once posed? Write it as [x, y, z].
const tail = [0, 0, 0]
console.log(tail)`;

const SOLVED = CHALLENGE.replace('const tail = [0, 0, 0]', 'const tail = [-2, 0, 0]');

/** The challenge's check: Upper turned 90° about z carries Lower along, so Lower lies along −x, its tail at (−2, 0, 0). */
export function checkPoseTail(code) {
  const no = (message) => ({ pass: false, message });
  const m = code.match(/const\s+tail\s*=\s*\[([^\]]*)\]/);
  if (!m) return no('Keep the line const tail = [x, y, z], with three numbers.');
  const parts = m[1].split(',').map((x) => x.trim()).filter((x) => x !== '');
  if (parts.length !== 3 || parts.some((x) => !/^-?\d+(\.\d+)?$/.test(x))) return no('Write the tail as three plain numbers, such as [1, 2, 3].');
  const t = parts.map(Number), is = (a) => a.every((x, i) => Math.abs(x - t[i]) < 1e-3);
  if (is([-2, 0, 0])) return { pass: true, message: '(−2, 0, 0): turning Upper 90° about z carries +y to −x, and Lower, posed in Upper\'s frame, comes with it: its head at Upper\'s posed tail (−1, 0, 0), its tail one more unit along −x.' };
  if (is([0, 0, 0])) return no('Pose Upper first: a 90° turn about z, about its head at the origin. Then Lower is carried along.');
  if (is([0, 2, 0])) return no('That is Lower\'s rest tail. Lower is Upper\'s child, so Upper\'s turn carries it, even though Lower itself is not posed.');
  if (is([2, 0, 0])) return no('The right size, the wrong side: a positive turn about z takes +y towards −x (x\' = x cos θ − y sin θ).');
  if (is([-1, 1, 0])) return no('You moved Lower\'s head to Upper\'s posed tail but kept it pointing up. The child\'s whole frame turns with its parent, its direction too.');
  if (is([-1, 0, 0])) return no('That is Lower\'s head (Upper\'s posed tail). Its tail is one more unit along the same direction.');
  return no(`(${t.join(', ')}): pose Upper about its head (y turns to −x), then Lower rides on it: P_Lower = P_Upper · O · R, with R = I.`);
}

export default {
  id: 'modelling-geometry-11-002',
  slug: 'posing',
  chapter: 'modelling-geometry',
  order: 2,
  title: 'Posing',
  subtitle: 'Turn each bone about its own head, parents before children: the posed matrix P, and the skin matrix S = P · B⁻¹ that moves the mesh.',
  tags: ['rigging', 'posing', 'pose mode', 'bone chain', 'skin matrix', 'hierarchy'],
  coreConcept: 'A pose is a rotation of a bone about its own head, measured in its own frame: for a root bone the posed matrix is P = B · R(pose). A child sits in its parent\'s frame by its offset O = B_parent⁻¹ · B, and is posed after its parent, so it is carried by whatever the parent did and then adds its own turn: P = P_parent · O · R(pose). That is why bones are posed parents first. The mesh is modelled in the rest pose, so to move a vertex with a bone, take it into the bone\'s frame (B⁻¹) and out again with the posed bone (P): the skin matrix S = P · B⁻¹, which is the identity in the rest pose.',
  prerequisites: ['modelling-geometry-11-001', 'modelling-geometry-10-005'],
  timeToComplete: 40,
  nextLesson: 'modelling-geometry-11-003',

  hook: {
    question: 'Bend an arm at the shoulder and the hand moves, though you never touched it. Bend the elbow too and the hand moves again, around a point that has itself moved. How does a program keep track, and how does the mesh know where to go?',
    realWorldContext: 'Every skeletal animation system, Blender\'s pose mode, Unity\'s and Unreal\'s animators, glTF players, computes exactly these matrices every frame: each bone\'s posed matrix down the hierarchy, then each skin matrix, which the GPU uses to move every vertex (lesson 11.4).',
  },

  intuition: {
    prose: [
      'A **pose** is a rotation of a bone about its own head, in its own frame (the x, y, z of its rest matrix $B$, lesson 11.1). For a bone with no parent, the posed matrix is $P = B \\cdot R(\\text{pose})$: first turn in the bone\'s own frame, then place that frame where the bone rests. Before running cell 1, predict where Upper\'s tail goes when it is turned 30° about its x axis: $(0, \\cos 30°, \\sin 30°) = (0, 0.866, 0.5)$. Its head stays where it is.',
      'A **child** is placed in its parent\'s frame by its **offset** $O = B_{\\text{parent}}^{-1} \\cdot B$: where it rests, as seen from the parent. Posing it means: start from the parent\'s posed frame, step out by the offset, then add its own turn: $P = P_{\\text{parent}} \\cdot O \\cdot R(\\text{pose})$. Before running cell 2, predict how far Lower is turned in all when Upper turns 30° and Lower 45° more: 75°. The Hand, not posed at all, is turned 75° too: it rides on Lower.',
      '**Parents first.** A child\'s $P$ starts from its parent\'s $P$, so the parent must be posed first. Before running cell 3, predict what happens if Upper is posed after its children: Lower is built on an Upper that has not moved, so it turns only its own 45°, and the Hand, built on an unposed Lower, stays at rest. MeshLab sorts the bones parents-first once (a topological sort) and poses them in that order every frame.',
      'The **skin matrix** $S = P \\cdot B^{-1}$. A mesh is modelled in the rest pose, in armature space. $B^{-1}$ takes a rest-pose point into the bone\'s own frame; $P$ takes it out again where the posed bone is. In the rest pose $P = B$, so $S$ is the identity: nothing moves. Before running cell 4, predict where the forearm vertex $(0.1, 1.5, 0)$ goes, carried by Lower: half a unit up Lower from its head, turned 75°, at the posed head $(0, 0.866, 0.5)$: $(0.1, 0.9954, 0.983)$.',
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'Procedure: Posing an armature',
        body: 'Step 1. Order the bones parents first.\nStep 2. For each bone: R = its pose rotation (Euler x, y, z, in its own frame).\nStep 3. A root: P = B · R. A child: O = B_parent⁻¹ · B, then P = P_parent · O · R.\nStep 4. Its posed head is P · (0, 0, 0), its posed tail P · (0, length, 0).\nStep 5. Its skin matrix S = P · B⁻¹ moves a rest-pose point the way the bone moved.',
      },
      {
        type: 'warning',
        title: 'A pose is in the bone\'s frame, not the world\'s',
        body: 'A 45° turn about x on Lower turns it about Lower\'s own x axis, wherever its parent has put that axis. Typing the same numbers on a bone with a different roll (lesson 11.3) bends it a different way.',
      },
      {
        type: 'warning',
        title: 'Pose bones parents first',
        body: 'Cell 3: posed in the wrong order, Lower turns only 45° and the Hand does not move at all. A loader that builds bones in file order, when the file lists children first, makes exactly this mistake.',
      },
      {
        type: 'insight',
        title: 'The graphics strand: pose mode',
        body: 'In pose mode (Ctrl+Tab in MeshLab and Blender) rotating a bone writes its pose, not its rest: the rest pose and the bind stay as they were, and the mesh follows through the skin matrices. Clearing the pose (Alt+R in Blender) sets every R back to the identity.',
      },
      {
        type: 'insight',
        title: 'What the picture shows (cell 5)',
        body: 'Misconception it contradicts: "only the bone you turn moves". The Hand was never posed, yet it has moved and turned with Lower; and the forearm vertex has followed Lower, from its grey rest place to the orange one.',
      },
      { type: 'insight', title: 'Bridge: from the maths to code', body: 'compose(compose(P_parent, O), pose(R)) is P = P_parent · O · R; invert(rest) is B⁻¹, written as the transposed rotation and the moved-back head.' },
      { type: 'insight', title: 'Bridge: from code to the GPU', body: 'Each frame the CPU walks the bones once, parents first, and sends the skin matrices S to the GPU as an array of uniforms; the vertex shader blends them per vertex (lesson 11.4).' },
      { type: 'insight', title: 'Bridge: from the GPU to MeshLab', body: 'Object › Trace posing the bone (active bone, down its chain) walks the chain from the root: each bone\'s posed head and tail (predict the last tail), then the skin matrix. In a script: rig.bone("Lower").pose = [x, y, z] (radians), rig.bone("Hand").tracePose(), and .posedTail.' },
    ],
    visualizations: [
      {
        id: 'JSNotebook',
        title: 'Build it: posing a chain',
        caption: 'One bone, the chain, the order, and the skin matrix.',
        props: {
          lesson: {
            title: 'Posing',
            subtitle: 'P = P_parent · O · R, and S = P · B⁻¹.',
            cells: [
              { type: 'js', instruction: '### 1. One bone, posed\nPredict first: Upper\'s posed tail.', startCode: ONE },
              { type: 'js', instruction: '### 2. The chain\nPredict first: how far Lower turns in all.', startCode: CHAIN_CELL },
              { type: 'js', instruction: '### 3. Parents first\nPredict first: the wrong order\'s Lower tail.', startCode: ORDER },
              { type: 'js', instruction: '### 4. The skin matrix\nPredict first: where the forearm vertex goes.', startCode: SKIN },
              { type: 'js', instruction: '### 5. See it\nRest and pose, and one vertex.', startCode: PICTURE, showPreviewByDefault: true, outputHeight: 330 },
              { type: 'challenge', instruction: '### 6. Challenge: a child carried by its parent\nThe check names any slip.', startCode: CHALLENGE, solutionCode: SOLVED, check: checkPoseTail },
              { type: 'markdown', instruction: '### Watch MeshLab do it\n[Open "Posing a chain of bones" in MeshLab](#/lab/mesh-lab?project=pose-chain). The same chain, posed the same way, with an arm bound to it: press Play in the Algorithm trace and predict the Hand\'s posed tail.' },
              { type: 'markdown', instruction: '### Use the tool\n- **Ctrl+Tab** on an armature: pose mode. Select a bone and **R** to rotate it; **I** keys the pose.\n- **Object › Trace posing the bone (active bone, down its chain)**.\n- In a script: `rig.bone(name).pose = [x, y, z]` (radians, in the bone\'s frame), `.posedHead`, `.posedTail`, `.tracePose()`.\n- [The tentacle](#/lab/mesh-lab?project=tentacle): five bones, each keyed with the same swing a little later, a travelling wave.\n- **Elsewhere:** Blender\'s Pose Mode (Ctrl+Tab), Alt+R clears a rotation; in glTF, each joint\'s node rotation is its pose.' },
            ],
          },
        },
      },
    ],
  },

  math: {
    prose: [
      '**Posed matrices.** For bones ordered parents first, $P_i = P_{p(i)}\\, O_i\\, R_i$ with $O_i = B_{p(i)}^{-1} B_i$, and $P_i = B_i R_i$ for a root. Unrolling the chain to the root, $P_i = B_{\\text{root}} R_{\\text{root}} \\cdots O_i R_i$: every ancestor\'s rotation acts on everything below it.',
      '**Skin matrices.** $S_i = P_i B_i^{-1}$. In the rest pose every $R = I$, so $P_i = B_i$ (by induction: $P_i = B_{p} B_{p}^{-1} B_i = B_i$) and $S_i = I$.',
      '**Points.** A bone\'s posed head is $P(0, 0, 0)$ and its tail $P(0, \\ell, 0)$; a rest-pose point $x$ moved by the bone goes to $S x$.',
    ],
    equations: [
      { label: 'A root bone', latex: 'P = B \\, R(\\text{pose})' },
      { label: 'A child', latex: 'P = P_{\\text{parent}} \\, O \\, R(\\text{pose}),\\quad O = B_{\\text{parent}}^{-1} B' },
      { label: 'Skin matrix', latex: 'S = P\\,B^{-1}' },
      { label: 'Rest pose', latex: 'R = I \;\\Rightarrow\; P = B,\; S = I' },
    ],
  },

  rigor: {
    prose: [
      '**Formal statement.** An armature is a rooted forest; with bones in a topological order (each after its parent) the recurrence $P_i = P_{p(i)} O_i R_i$ is well defined and computes every $P_i$ in one pass, O(n) for n bones.',
      '**Invariant viewpoint.** The rest matrices and offsets never change while posing; only the R\'s do. So $O_i$ and $B_i^{-1}$ can be computed once at bind time, and each frame costs one matrix product per bone.',
      '**Geometric picture.** Each bone carries a small set of axes on its head. Turning a bone swings its axes, and every child\'s axes, rigidly, about its head; the child then swings its own about its own head.',
      '**Where this goes.** Lesson 11.3 shows what roll does to a pose; lesson 11.4 blends skin matrices to move a mesh smoothly at the joints.',
    ],
  },

  examples: [
    {
      id: 'modelling-geometry-11-002-ex1',
      title: 'A root bone, posed',
      problem: 'A vertical bone, head (0, 0, 0), tail (0, 2, 0), posed 90° about x. Its posed tail?',
      steps: [
        { expression: 'B = I', annotation: 'Vertical at the origin.' },
        { expression: 'R_x(90°)(0, 2, 0) = (0, 0, 2)', annotation: '+y turns towards +z.' },
      ],
      conclusion: '(0, 0, 2): the bone now points along +z.',
    },
    {
      id: 'modelling-geometry-11-002-ex2',
      title: 'Turns add down a straight chain',
      problem: 'Upper turned 30° about x, Lower 45° more about its own x. How far is Lower turned from +y?',
      steps: [
        { expression: 'O = I\\text{ (rotation part)}', annotation: 'Both bones point up +y at rest.' },
        { expression: 'R_x(30°)\\,R_x(45°) = R_x(75°)', annotation: 'Turns about the same axis add.' },
      ],
      conclusion: '75°, as cell 2 prints. (About different axes, turns do not simply add: order matters, lesson 2.3.)',
    },
    {
      id: 'modelling-geometry-11-002-ex3',
      title: 'The skin matrix at rest',
      problem: 'Why does a mesh not move when it is bound to an armature in its rest pose?',
      steps: [
        { expression: 'P = B', annotation: 'Every pose is the identity.' },
        { expression: 'S = B\\,B^{-1} = I', annotation: 'Into the bone\'s frame and straight back out.' },
      ],
      conclusion: 'Every skin matrix is the identity, so every vertex stays where it was modelled (cell 4\'s first line).',
    },
  ],

  challenges: [
    {
      id: 'modelling-geometry-11-002-ch1',
      difficulty: 'easy',
      problem: 'The Hand is not posed, yet in cell 2 it is turned 75°. Why?',
      walkthrough: [{ expression: 'P_{\\text{Hand}} = P_{\\text{Lower}}\\, O\\, I', annotation: 'Its own R is the identity.' }],
      answer: 'Its P starts from Lower\'s posed P; with no turn of its own, it simply keeps Lower\'s direction, 75° from +y.',
    },
    {
      id: 'modelling-geometry-11-002-ch2',
      difficulty: 'medium',
      problem: 'Show that S moves a bone\'s rest tail to its posed tail.',
      walkthrough: [
        { expression: 'B^{-1} t = (0, \\ell, 0)', annotation: 'Lesson 11.1, challenge 2.' },
        { expression: 'S t = P B^{-1} t = P (0, \\ell, 0)', annotation: 'Which is the posed tail.' },
      ],
      answer: 'S t = P B⁻¹ t = P (0, ℓ, 0), the posed tail by definition. Cell 4 checks it for Lower: (0, 2, 0) goes to (0, 1.1248, 1.4659).',
    },
    {
      id: 'modelling-geometry-11-002-ch3',
      difficulty: 'hard',
      problem: 'Prove that in the rest pose every P_i = B_i, for any tree of bones.',
      walkthrough: [
        { expression: 'P_{\\text{root}} = B_{\\text{root}}\\,I', annotation: 'The base case.' },
        { expression: 'P_i = P_p\\,B_p^{-1}B_i\\,I = B_p B_p^{-1} B_i = B_i', annotation: 'If the parent\'s P is its B.' },
      ],
      answer: 'By induction down the tree in topological order: a root has P = B · I = B; if a parent has P_p = B_p, its child has P_i = B_p · B_p⁻¹ · B_i · I = B_i. Hence every S_i = I.',
    },
  ],

  semantics: {
    core: [
      { symbol: 'R(\\text{pose})', meaning: 'A bone\'s pose: a rotation in its own frame.' },
      { symbol: 'P', meaning: 'The posed matrix: where the bone\'s frame is now.' },
      { symbol: 'O = B_{\\text{parent}}^{-1} B', meaning: 'Where a bone rests in its parent\'s frame.' },
      { symbol: 'S = P\\,B^{-1}', meaning: 'The skin matrix: moves a rest point the way the bone moved.' },
      { symbol: '\\text{parents first}', meaning: 'The order bones must be posed in.' },
    ],
    rulesOfThumb: [
      'A pose turns a bone about its own head, in its own frame.',
      'P = P_parent · O · R.',
      'Pose parents before children.',
      'S = P · B⁻¹; in the rest pose, S = I.',
      'A bone you did not pose still moves with its parent.',
    ],
  },

  spiral: {
    recoveryPoints: [
      { lessonId: 'modelling-geometry-11-001', label: 'Bones', note: 'The rest matrix B.' },
      { lessonId: 'modelling-geometry-10-005', label: 'Motion through a hierarchy', note: 'Parents carrying children.' },
    ],
    futureLinks: [
      { lessonId: 'modelling-geometry-11-003', label: 'Roll and editing joints', note: 'Which way a pose bends.' },
      { lessonId: 'modelling-geometry-11-004', label: 'Linear blend skinning', note: 'Blending skin matrices.' },
    ],
  },

  checkpoints: [
    { id: 'cp-modelling-geometry-11-002-1', label: 'Read what a pose is', type: 'read' },
    { id: 'cp-modelling-geometry-11-002-2', label: 'Read how a chain is posed', type: 'read' },
    { id: 'cp-modelling-geometry-11-002-3', label: 'Read the skin matrix', type: 'read' },
    { id: 'cp-modelling-geometry-11-002-4', label: 'Run cells 1 to 4: one bone, the chain, the order, the skin matrix', type: 'lab' },
    { id: 'cp-modelling-geometry-11-002-5', label: 'Trace posing the chain in MeshLab and pose a bone yourself', type: 'lab' },
    { id: 'cp-modelling-geometry-11-002-6', label: 'Work through example 2, turns down a chain', type: 'example' },
    { id: 'cp-modelling-geometry-11-002-7', label: 'Work through example 3, the skin matrix at rest', type: 'example' },
    { id: 'cp-modelling-geometry-11-002-8', label: 'Complete the challenge: a child carried by its parent', type: 'challenge' },
  ],

  assessment: {
    questions: [
      {
        id: 'modelling-geometry-11-002-assess-1',
        type: 'choice',
        text: 'A child bone\'s posed matrix is:',
        options: ['P_parent · O · R(pose)', 'B · R(pose)', 'R(pose) · P_parent', 'P_parent · R(pose)'],
        answer: 'P_parent · O · R(pose)',
        hint: 'Cell 2.',
      },
    ],
  },

  quiz: [
    { id: 'modelling-geometry-11-002-quiz-1', type: 'choice', text: 'Upper turned 30° about x: its posed tail is', options: ['(0, 0.866, 0.5)', '(0, 1, 0)', '(0, 0.5, 0.866)', '(0.5, 0.866, 0)'], answer: '(0, 0.866, 0.5)', hints: ['Cell 1.', '(0, cos 30°, sin 30°).'], reviewSection: 'Cell 1' },
    { id: 'modelling-geometry-11-002-quiz-2', type: 'choice', text: 'With Upper at 30° and Lower at 45°, Lower is turned in all', options: ['75°', '45°', '30°', '15°'], answer: '75°', hints: ['Cell 2.', 'Turns about one axis add.'], reviewSection: 'Cell 2' },
    { id: 'modelling-geometry-11-002-quiz-3', type: 'choice', text: 'The Hand, not posed itself, is turned', options: ['75°, carried by Lower', '0°', '45°', '30°'], answer: '75°, carried by Lower', hints: ['Cell 2.'], reviewSection: 'Cell 2' },
    { id: 'modelling-geometry-11-002-quiz-4', type: 'choice', text: 'Posed children first, the Hand\'s tail is', options: ['At rest, (0, 2.5, 0)', '(0, 1.2543, 1.9489)', '(0, 1.7071, 0.7071)', 'Undefined'], answer: 'At rest, (0, 2.5, 0)', hints: ['Cell 3.'], reviewSection: 'Cell 3' },
    { id: 'modelling-geometry-11-002-quiz-5', type: 'choice', text: 'In the rest pose the skin matrix S is', options: ['The identity', 'B', 'B⁻¹', 'P'], answer: 'The identity', hints: ['Cell 4.', 'S = B · B⁻¹.'], reviewSection: 'Cell 4' },
    { id: 'modelling-geometry-11-002-quiz-6', type: 'choice', text: 'S = P · B⁻¹ moves a rest-pose point by', options: ['Taking it into the bone\'s frame, then out with the posed bone', 'Adding the pose angle', 'Rotating it about the origin', 'Moving it to the bone\'s tail'], answer: 'Taking it into the bone\'s frame, then out with the posed bone', hints: ['Cell 4.'], reviewSection: 'Cell 4' },
  ],

  misconceptions: [
    { falseBelief: 'Only the bone you pose moves.', whyStudentsThinkIt: 'You changed one bone.', correctionExample: 'The Hand, unposed, turned 75° (cell 2).', contrastCase: 'Posing the last bone of a chain moves nothing above it.' },
    { falseBelief: 'A pose rotates a bone about the world\'s axes.', whyStudentsThinkIt: 'Angles look like world angles.', correctionExample: 'Lower\'s 45° is about Lower\'s own x, already turned by Upper.', contrastCase: 'For a root bone with B = I, its axes and the world\'s coincide.' },
    { falseBelief: 'The skin matrix is the posed matrix.', whyStudentsThinkIt: 'Both describe the posed bone.', correctionExample: 'P places the bone\'s frame; S = P · B⁻¹ moves rest points. At rest P = B but S = I.', contrastCase: 'For a bone with B = I, S and P coincide.' },
  ],

  transferPrompts: [
    { situation: 'A character\'s hand floats away from the arm when you rotate the shoulder.', competingTechniques: ['Key the hand\'s position every frame', 'Parent the hand bone to the forearm'], whyThisTechniqueWins: 'Parented, it is posed in the forearm\'s frame and follows by itself.' },
    { situation: 'Writing your own animation player for glTF.', competingTechniques: ['Pose joints in file order', 'Sort joints parents first, then compute P and S'], whyThisTechniqueWins: 'File order can list children first (cell 3).' },
  ],

  debugging: [
    { commonError: 'Multiplying the pose on the wrong side.', symptom: 'Bones turn about the armature\'s origin, not their heads.', whyItHappened: 'R · B turns about the origin; B · R turns in the bone\'s frame.', repairStrategy: 'P = P_parent · O · R: the pose last.' },
    { commonError: 'Using the parent\'s rest matrix instead of its posed one.', symptom: 'Children ignore their parents\' poses.', whyItHappened: 'The parent was not posed first.', repairStrategy: 'Pose parents first; use P_parent.' },
    { commonError: 'Sending P instead of S to the shader.', symptom: 'The whole mesh jumps away even in the rest pose.', whyItHappened: 'P = B at rest, not the identity.', repairStrategy: 'Send S = P · B⁻¹.' },
  ],

  mastery: {
    targetLevel: 3,
    solveIndependently: 'Pose a chain of bones and find each posed head and tail.',
    explainVerbally: 'Explain P = P_parent · O · R, parents first, and S = P · B⁻¹.',
    detectIncorrectApplication: 'Spot children posed before parents and P sent instead of S.',
    transferToUnfamiliar: 'Pose a skeleton from a glTF file.',
  },
};
