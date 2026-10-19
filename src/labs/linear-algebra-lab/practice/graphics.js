// Practice for the "Graphics and 3D" track: slides with an extra 1, turns about a point and robot
// arms, cameras built from cross products, and perspective. Answers come from running each
// reference solution, so generators only need valid inputs: cameras never look straight up or down,
// and projected points always lie in front of the camera.
import { mat, vec } from './helpers.js'

const lines = (...source) => source.join('\n')

function problem(id, title, difficulty, build) {
  return { id, title, difficulty, generate(rng) {
    const { prompt, setup, solution, outputs, hints } = build(rng)
    return {
      prompt, setup, solution, hints,
      outputs: outputs.map(([name, message]) => ({ name, message, tolerance: 1e-6 })),
      starter: lines('% Replace each placeholder using the supplied inputs.', ...outputs.map(([name]) => `${name} = -999999;`)),
    }
  } }
}

const DEGREES = [30, 45, 60, 90, 120, 135, 150, -30, -45, -60, -90, -120]
const angle = (r, name = 'a') => `${name} = ${r.pick(DEGREES)}*pi/180;`
const TURN = name => `[cos(${name}) -sin(${name}) 0; sin(${name}) cos(${name}) 0; 0 0 1]`
const SLIDE = (x, y) => `[1 0 ${x}; 0 1 ${y}; 0 0 1]`
const corners = (r, n) => [Array.from({ length: n }, () => r.int(-5, 5)), Array.from({ length: n }, () => r.int(-5, 5))]
// A camera at least 2 to the side of a target within 1 of the origin, so it never looks straight up or
// down and cross(f, up) is never zero.
const AWAY = [-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]
const cameraSetup = r => [`e = [${r.pick(AWAY)} ${r.int(-4, 4)} ${r.pick(AWAY)}];`, `g = [${r.int(-1, 1)} ${r.int(-1, 1)} ${r.int(-1, 1)}];`, 'up = [0 1 0];']
const CAMERA = ['f = (g - e)/norm(g - e);', 'r = cross(f, up);', 'r = r/norm(r);', 'u = cross(r, f);', 'C = zeros(3,3);', 'C(1,:) = r;', 'C(2,:) = u;', 'C(3,:) = f;']

export const graphicsPractice = {
  'laml-gfx-homogeneous': [
    problem('slide-point', 'Slide one point', 'Warm-up', r => ({
      prompt: 'p is a point written with an extra 1. Store T, the 3 × 3 slide by tx across and ty up, and q = T*p, the point after the slide.',
      setup: lines(`p = ${vec([r.int(-6, 6), r.int(-6, 6), 1])};`, `tx = ${r.nonzero(-5, 5)};`, `ty = ${r.nonzero(-5, 5)};`),
      solution: lines('T = [1 0 tx; 0 1 ty; 0 0 1];', 'q = T*p;'),
      outputs: [['T', 'The slide amounts go in the last column.'], ['q', 'Multiply the slide by the point.']],
      hints: ['Start from the 3 × 3 identity.', 'T = [1 0 tx; 0 1 ty; 0 0 1];', 'q = T*p;'],
    })),
    problem('slide-shape', 'Slide a whole shape', 'Warm-up', r => ({
      prompt: 'The columns of P are the corners of a triangle. Store H, the corners with a row of ones underneath, and moved = T*H, the corners after the slide T = [1 0 tx; 0 1 ty; 0 0 1].',
      setup: lines(`P = ${mat(corners(r, 3))};`, `tx = ${r.nonzero(-5, 5)};`, `ty = ${r.nonzero(-5, 5)};`),
      solution: lines('H = ones(3, 3);', 'H(1:2,:) = P;', 'T = [1 0 tx; 0 1 ty; 0 0 1];', 'moved = T*H;'),
      outputs: [['H', 'Corners on top, ones underneath.'], ['moved', 'One product moves every corner.']],
      hints: ['H = ones(3, 3); makes the row of ones.', 'H(1:2,:) = P; copies the corners into the top rows.', 'moved = T*H;'],
    })),
    problem('point-or-direction', 'Points slide, directions do not', 'Apply', r => {
      const tx = r.nonzero(-5, 5), ty = r.nonzero(-5, 5)
      return {
        prompt: 'T is a slide. Store asPoint = T*[vx; vy; 1] and asDirection = T*[vx; vy; 0]: the same two numbers read as a point and as a direction.',
        setup: lines(`T = ${mat([[1, 0, tx], [0, 1, ty], [0, 0, 1]])};`, `vx = ${r.int(-6, 6)};`, `vy = ${r.int(-6, 6)};`),
        solution: lines('p = [vx; vy; 1];', 'd = [vx; vy; 0];', 'asPoint = T*p;', 'asDirection = T*d;'),
        outputs: [['asPoint', 'A last entry of 1 picks up the slide.'], ['asDirection', 'A last entry of 0 switches the slide off.']],
        hints: ['Name the two vectors first: p = [vx; vy; 1]; d = [vx; vy; 0];', 'asPoint = T*p;', 'asDirection = T*d; should equal d.'],
      }
    }),
    problem('turn-in-3x3', 'A turn as a 3 × 3 matrix', 'Apply', r => ({
      prompt: 'Store R, the turn by angle a (in radians) set in the corner of a 3 × 3 identity, and q = R*p.',
      setup: lines(angle(r), `p = ${vec([r.int(-5, 5), r.int(-5, 5), 1])};`),
      solution: lines(`R = ${TURN('a')};`, 'q = R*p;'),
      outputs: [['R', 'The 2 × 2 turn in the top-left, then 0 0 1.'], ['q', 'The point turned about the origin.']],
      hints: ['The 2 × 2 turn is [cos(a) -sin(a); sin(a) cos(a)].', 'Add a third row and column from the identity.', `R = ${TURN('a')};`],
    })),
    problem('turn-then-slide', 'Turn, then slide', 'Apply', r => {
      const [x, y] = corners(r, 3)
      return {
        prompt: 'Store M, one matrix that turns by angle a about the origin and then slides by (tx, ty), and moved = M*H for the corners in H.',
        setup: lines(angle(r), `tx = ${r.nonzero(-5, 5)};`, `ty = ${r.nonzero(-5, 5)};`, `H = ${mat([x, y, [1, 1, 1]])};`),
        solution: lines(`R = ${TURN('a')};`, 'T = [1 0 tx; 0 1 ty; 0 0 1];', 'M = T*R;', 'moved = M*H;'),
        outputs: [['M', 'The first move goes nearest the points: T*R.'], ['moved', 'Apply M to every corner.']],
        hints: ['Build R and T separately first.', 'The turn happens first, so it sits on the right: M = T*R;', 'moved = M*H;'],
      }
    }),
    problem('undo-slide', 'Undo a slide', 'Apply', r => {
      const tx = r.nonzero(-6, 6), ty = r.nonzero(-6, 6)
      return {
        prompt: 'T is a slide by an amount you can read from its last column. Store back, the slide that undoes it, and check = back*T.',
        setup: `T = ${mat([[1, 0, tx], [0, 1, ty], [0, 0, 1]])};`,
        solution: lines('back = inv(T);', 'check = back*T;'),
        outputs: [['back', 'Slide by the opposite amounts.'], ['check', 'Undoing after doing leaves every point alone.']],
        hints: ['T(1,3) and T(2,3) are the slide amounts.', 'The undo slides by minus those amounts; inv(T) gives the same matrix.', 'check should be the identity.'],
      }
    }),
  ],
  'laml-gfx-chains': [
    problem('turn-about-point', 'Turn about a point', 'Warm-up', r => ({
      prompt: 'Store M = Tc*R*Tback, the turn by angle a about the point (cx, cy), and q = M*p.',
      setup: lines(angle(r), `cx = ${r.nonzero(-4, 4)};`, `cy = ${r.nonzero(-4, 4)};`, `p = ${vec([r.int(-5, 5), r.int(-5, 5), 1])};`),
      solution: lines(`R = ${TURN('a')};`, `Tc = ${SLIDE('cx', 'cy')};`, `Tback = ${SLIDE('-cx', '-cy')};`, 'M = Tc*R*Tback;', 'q = M*p;'),
      outputs: [['M', 'Slide the pivot to the origin, turn, slide back.'], ['q', 'The point turned about (cx, cy).']],
      hints: ['Tback slides by (-cx, -cy); Tc slides by (cx, cy).', 'Read right to left: Tback acts first.', 'M = Tc*R*Tback; q = M*p;'],
    })),
    problem('pivot-stays', 'The pivot does not move', 'Apply', r => ({
      prompt: 'Build M, the turn by angle a about (cx, cy). Store pivot = M*c for c = [cx; cy; 1], which should not move, and q = M*p.',
      setup: lines(angle(r), `cx = ${r.nonzero(-4, 4)};`, `cy = ${r.nonzero(-4, 4)};`, `p = ${vec([r.int(-5, 5), r.int(-5, 5), 1])};`),
      solution: lines(`R = ${TURN('a')};`, `M = ${SLIDE('cx', 'cy')}*R*${SLIDE('-cx', '-cy')};`, 'c = [cx; cy; 1];', 'pivot = M*c;', 'q = M*p;'),
      outputs: [['pivot', 'The point you turn about stays put.'], ['q', 'Every other point swings round it.']],
      hints: ['M = Tc*R*Tback as in the lesson.', 'Name the pivot first: c = [cx; cy; 1];', 'pivot = M*c; q = M*p;'],
    })),
    problem('order-matters', 'Order matters', 'Apply', r => ({
      prompt: 'R turns by angle a and T slides by (tx, ty). Store TR = T*R (turn first), RT = R*T (slide first), and gap = norm(TR(1:2,3) - RT(1:2,3)), how far apart the two orders put the origin.',
      setup: lines(angle(r), `tx = ${r.nonzero(-5, 5)};`, `ty = ${r.nonzero(-5, 5)};`),
      solution: lines(`R = ${TURN('a')};`, 'T = [1 0 tx; 0 1 ty; 0 0 1];', 'TR = T*R;', 'RT = R*T;', 'gap = norm(TR(1:2,3) - RT(1:2,3));'),
      outputs: [['TR', 'The turn acts first, then the slide.'], ['RT', 'The slide acts first, and the turn carries it round.'], ['gap', 'The last column is where each order sends the origin.']],
      hints: ['Build R and T, then multiply both ways.', 'The last column of each product is where the origin lands.', 'gap = norm(TR(1:2,3) - RT(1:2,3));'],
    })),
    problem('arm', 'Where is the hand?', 'Apply', r => ({
      prompt: 'A two-joint arm has lengths L1 and L2 and joint angles a1 and a2. Store elbow = J1*origin and hand = J1*J2*origin, where each joint is a turn followed by a slide along its arm and origin = [0; 0; 1].',
      setup: lines(`L1 = ${r.int(1, 4)};`, `L2 = ${r.int(1, 4)};`, angle(r, 'a1'), angle(r, 'a2')),
      solution: lines('origin = [0; 0; 1];', `J1 = ${TURN('a1')}*[1 0 L1; 0 1 0; 0 0 1];`, `J2 = ${TURN('a2')}*[1 0 L2; 0 1 0; 0 0 1];`, 'elbow = J1*origin;', 'hand = J1*J2*origin;'),
      outputs: [['elbow', 'Stop the chain after the first joint.'], ['hand', 'Both joints.']],
      hints: ['J1 = turn(a1) times slide(L1).', 'J2 = turn(a2) times slide(L2).', 'elbow = J1*origin; hand = J1*J2*origin;'],
    })),
    problem('arm-reach', 'How far can the hand reach?', 'Apply', r => ({
      prompt: 'For the two-joint arm with lengths L1, L2 and angles a1, a2, store reach = norm(hand(1:2)), the distance from the base to the hand, and cosRule = sqrt(L1^2 + L2^2 + 2*L1*L2*cos(a2)). They should agree, whatever a1 is.',
      setup: lines(`L1 = ${r.int(1, 4)};`, `L2 = ${r.int(1, 4)};`, angle(r, 'a1'), angle(r, 'a2')),
      solution: lines('origin = [0; 0; 1];', `J1 = ${TURN('a1')}*[1 0 L1; 0 1 0; 0 0 1];`, `J2 = ${TURN('a2')}*[1 0 L2; 0 1 0; 0 0 1];`, 'hand = J1*J2*origin;', 'reach = norm(hand(1:2));', 'cosRule = sqrt(L1^2 + L2^2 + 2*L1*L2*cos(a2));'),
      outputs: [['reach', 'Distance from the base to the hand.'], ['cosRule', 'The law of cosines for the triangle base–elbow–hand.']],
      hints: ['Compute hand as in the lesson.', 'hand(1:2) drops the extra 1.', 'Turning the shoulder spins the whole arm, so it cannot change the reach.'],
    })),
    problem('three-joints', 'An arm with three joints', 'Apply', r => ({
      prompt: 'An arm has three links with lengths L1, L2, L3 and joint angles a1, a2, a3. Store wrist = J1*J2*origin and hand = J1*J2*J3*origin, with origin = [0; 0; 1] and each joint a turn followed by a slide.',
      setup: lines(`L1 = ${r.int(1, 4)};`, `L2 = ${r.int(1, 3)};`, `L3 = ${r.int(1, 2)};`, angle(r, 'a1'), angle(r, 'a2'), angle(r, 'a3')),
      solution: lines('origin = [0; 0; 1];', `J1 = ${TURN('a1')}*[1 0 L1; 0 1 0; 0 0 1];`, `J2 = ${TURN('a2')}*[1 0 L2; 0 1 0; 0 0 1];`, `J3 = ${TURN('a3')}*[1 0 L3; 0 1 0; 0 0 1];`, 'wrist = J1*J2*origin;', 'hand = J1*J2*J3*origin;'),
      outputs: [['wrist', 'The end of the second link.'], ['hand', 'One more joint in the chain.']],
      hints: ['Each joint has the same pattern: turn, then slide.', 'Multiply from the base outwards.', 'wrist = J1*J2*origin; hand = J1*J2*J3*origin;'],
    })),
  ],
  'laml-gfx-camera': [
    problem('turn-about-z', 'Turn about the z-axis', 'Warm-up', r => ({
      prompt: 'Store Rz, the 3D turn by angle a about the z-axis, and q = Rz*p.',
      setup: lines(angle(r), `p = ${vec([r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)])};`),
      solution: lines(`Rz = ${TURN('a')};`, 'q = Rz*p;'),
      outputs: [['Rz', 'The 2D turn with a 1 for the z-axis.'], ['q', 'z stays the same; x and y turn.']],
      hints: ['The z-axis is left alone, so the last row and column are 0 0 1.', `Rz = ${TURN('a')};`, 'q = Rz*p;'],
    })),
    problem('turn-about-x', 'Turn about the x-axis', 'Apply', r => ({
      prompt: 'Store Rx, the 3D turn by angle a about the x-axis (y turns toward z), q = Rx*p, and d = det(Rx).',
      setup: lines(angle(r), `p = ${vec([r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)])};`),
      solution: lines('Rx = [1 0 0; 0 cos(a) -sin(a); 0 sin(a) cos(a)];', 'q = Rx*p;', 'd = det(Rx);'),
      outputs: [['Rx', 'Leave x alone and turn the (y, z) pair.'], ['q', 'x stays the same.'], ['d', 'Turns keep volume and do not mirror.']],
      hints: ['The first row and column are 1 0 0.', 'Rx = [1 0 0; 0 cos(a) -sin(a); 0 sin(a) cos(a)];', 'q = Rx*p; d = det(Rx);'],
    })),
    problem('camera-basis', 'Build a camera', 'Apply', r => ({
      prompt: 'A camera at e looks at g, with world up direction up. Store the unit vectors f (forward), r (right) and u (the camera\'s up).',
      setup: lines(...cameraSetup(r)),
      solution: lines(...CAMERA.slice(0, 4)),
      outputs: [['f', 'From the camera to the target, length 1.'], ['r', 'cross(f, up), length 1.'], ['u', 'cross(r, f).']],
      hints: ['f = (g - e)/norm(g - e);', 'r = cross(f, up); then r = r/norm(r);', 'u = cross(r, f);'],
    })),
    problem('view-coords', 'See a point from the camera', 'Apply', r => ({
      prompt: 'A camera at e looks at g, with world up direction up. Build C with rows r, u and f, and store view = C*(p - e): how far right, up and ahead the point p is.',
      setup: lines(...cameraSetup(r), `p = ${vec([r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)])};`),
      solution: lines(...CAMERA, 'view = C*(p - e);'),
      outputs: [['view', 'Measure p − e along r, u and f.']],
      hints: ['Build f, r and u as in the lesson.', 'Fill C row by row: C(1,:) = r; and so on.', 'view = C*(p - e);'],
    })),
    problem('back-to-world', 'From the camera back to the world', 'Apply', r => ({
      prompt: 'A camera at e looks at g, with world up direction up. A point is at v in camera coordinates (right, up, ahead). Store world = e + transpose(C)*v, the point in the world, and check = C*(world - e), which should give v back.',
      setup: lines(...cameraSetup(r), `v = ${vec([r.int(-3, 3), r.int(-3, 3), r.int(1, 8)])};`),
      solution: lines(...CAMERA, 'world = e + transpose(C)*v;', 'check = C*(world - e);'),
      outputs: [['world', 'The inverse of C is its transpose.'], ['check', 'Going to the camera and back.']],
      hints: ['Build C as in the lesson.', 'C has perpendicular unit rows, so transpose(C) undoes it.', 'world = e + transpose(C)*v; check = C*(world - e);'],
    })),
    problem('depth-test', 'In front or behind?', 'Apply', r => ({
      prompt: 'A camera at e looks at g, with world up direction up. The columns of P are four points. Store depth, a row with f·(point − e) for each point, and ahead, how many points have positive depth.',
      setup: lines(...cameraSetup(r), `P = ${mat(Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => r.int(-8, 8))))};`),
      solution: lines('f = (g - e)/norm(g - e);', 'depth = zeros(1, 4);', 'for k = 1:4', '  depth(k) = dot(f, P(:,k) - e);', 'end', 'ahead = sum(depth > 0);'),
      outputs: [['depth', 'How far each point is along the forward direction.'], ['ahead', 'Only these can be drawn.']],
      hints: ['Only f is needed for depth.', 'In a loop: depth(k) = dot(f, P(:,k) - e);', 'ahead = sum(depth > 0);'],
    })),
  ],
  'laml-gfx-perspective': [
    problem('project-point', 'Project one point', 'Warm-up', r => ({
      prompt: 'A point is at (x, y, z) in camera coordinates, and the screen is at distance f. Store sx and sy, where it lands on the screen.',
      setup: lines(`x = ${r.int(-6, 6)};`, `y = ${r.int(-6, 6)};`, `z = ${r.int(2, 12)};`, `f = ${r.int(1, 4)};`),
      solution: lines('sx = f*x/z;', 'sy = f*y/z;'),
      outputs: [['sx', 'f times x, divided by depth.'], ['sy', 'f times y, divided by depth.']],
      hints: ['Similar triangles: screen size over f equals real size over depth.', 'sx = f*x/z;', 'sy = f*y/z;'],
    })),
    problem('with-K', 'Project with a matrix and a divide', 'Apply', r => ({
      prompt: 'The columns of V are points in camera coordinates with a fourth row of ones. Store W = K*V with K = [f 0 0 0; 0 f 0 0; 0 0 1 0], and the screen positions sx and sy after dividing by the third row.',
      setup: lines(`V = ${mat([Array.from({ length: 3 }, () => r.int(-4, 4)), Array.from({ length: 3 }, () => r.int(-4, 4)), Array.from({ length: 3 }, () => r.int(2, 9)), [1, 1, 1]])};`, `f = ${r.int(1, 4)};`),
      solution: lines('K = [f 0 0 0; 0 f 0 0; 0 0 1 0];', 'W = K*V;', 'sx = W(1,:)./W(3,:);', 'sy = W(2,:)./W(3,:);'),
      outputs: [['W', 'One product for every point.'], ['sx', 'Divide row 1 by row 3, entry by entry.'], ['sy', 'Divide row 2 by row 3.']],
      hints: ['K = [f 0 0 0; 0 f 0 0; 0 0 1 0];', 'W = K*V;', 'Use ./ to divide entry by entry.'],
    })),
    problem('twice-as-far', 'Far things look small', 'Apply', r => {
      const z1 = r.int(2, 6)
      return {
        prompt: 'Two posts of height h stand at depths z1 and z2, seen with screen distance f. Store s1 and s2, their heights on the screen, and ratio = s1/s2.',
        setup: lines(`h = ${r.int(1, 5)};`, `z1 = ${z1};`, `z2 = ${z1 * r.int(2, 4)};`, `f = ${r.int(1, 4)};`),
        solution: lines('s1 = f*h/z1;', 's2 = f*h/z2;', 'ratio = s1/s2;'),
        outputs: [['s1', 'f times height over depth.'], ['s2', 'The same post, further away.'], ['ratio', 'It equals z2/z1.']],
        hints: ['Screen height is f*h/z.', 's1 = f*h/z1; s2 = f*h/z2;', 'ratio = s1/s2;'],
      }
    }),
    problem('vanishing-point', 'Where parallel lines meet', 'Apply', r => ({
      prompt: 'A straight line starts at q0 and runs in direction d (camera coordinates, d(3) > 0), seen with screen distance f. Store vp = [f*d(1)/d(3) f*d(2)/d(3)], its vanishing point, and far, the screen position of the point q0 + 1000*d.',
      setup: lines(`q0 = ${vec([r.int(-4, 4), r.int(-4, 4), r.int(2, 6)])};`, `d = ${vec([r.int(-3, 3), r.int(-3, 3), r.int(1, 3)])};`, `f = ${r.int(1, 3)};`),
      solution: lines('vp = [f*d(1)/d(3) f*d(2)/d(3)];', 'q = q0 + 1000*d;', 'far = [f*q(1)/q(3) f*q(2)/q(3)];'),
      outputs: [['vp', 'Only the direction matters, not the starting point.'], ['far', 'A very distant point on the line lands close to vp.']],
      hints: ['Far along the line, q0 hardly matters: the point is about t*d.', 'vp = [f*d(1)/d(3) f*d(2)/d(3)];', 'q = q0 + 1000*d; then project q.'],
    })),
    problem('zoom', 'Zooming is changing f', 'Apply', r => ({
      prompt: 'A square of side s faces the camera at depth z. Store w1 and w2, its width on the screen with screen distances f1 and f2, and zoom = w2/w1.',
      setup: lines(`s = ${r.int(1, 5)};`, `z = ${r.int(3, 12)};`, `f1 = ${r.int(1, 3)};`, `f2 = ${r.int(4, 9)};`),
      solution: lines('w1 = f1*s/z;', 'w2 = f2*s/z;', 'zoom = w2/w1;'),
      outputs: [['w1', 'f1 times side over depth.'], ['w2', 'f2 times side over depth.'], ['zoom', 'It equals f2/f1: a longer lens magnifies.']],
      hints: ['Width on screen is f*s/z.', 'w1 = f1*s/z; w2 = f2*s/z;', 'zoom = w2/w1;'],
    })),
    problem('pipeline', 'Camera, then perspective', 'Apply', r => {
      const ez = -r.int(6, 10)
      return {
        prompt: 'A camera at e looks at g, with world up direction up, and focal is the screen distance. Build C (rows r, u, f), store cam = C*(p - e), and the screen position sx, sy of the world point p.',
        setup: lines(`e = [${r.int(-2, 2)} ${r.int(-2, 2)} ${ez}];`, 'g = [0 0 0];', 'up = [0 1 0];', `p = ${vec([r.int(-2, 2), r.int(-2, 2), r.int(-2, 2)])};`, `focal = ${r.int(1, 3)};`),
        solution: lines(...CAMERA, 'cam = C*(p - e);', 'sx = focal*cam(1)/cam(3);', 'sy = focal*cam(2)/cam(3);'),
        outputs: [['cam', 'Camera coordinates: right, up, ahead.'], ['sx', 'focal times right over ahead.'], ['sy', 'focal times up over ahead.']],
        hints: ['Build the camera as in the previous lesson.', 'cam = C*(p - e);', 'sx = focal*cam(1)/cam(3); sy = focal*cam(2)/cam(3);'],
      }
    }),
  ],
}
