// Optional track: "Graphics and 3D". Homogeneous coordinates make a slide a matrix; chains of
// turns and slides place a robot arm; a camera is a change of basis; perspective is a divide by depth.
// Each lesson carries its own why, notation, quiz, uses and angles.
// OpenMAT note: OpenMAT cannot tell a flat row from a flat column, so `[r; u; f]` of three flat
// vectors joins them end to end. Fill matrix rows by index (C(1,:) = r). A flat row stacked under
// a matrix of the same width does work: [P; ones(1, n)].
const t = String.raw
const GFX = 'Graphics and 3D'

// A walk along all 12 edges of the cube with corners at ±1 (some edges are walked twice).
const CUBE = t`cube = [-1 1 1 -1 -1 -1 1 1 -1 -1 1 1 1 1 -1 -1;
        -1 -1 1 1 -1 -1 -1 1 1 -1 -1 -1 1 1 1 1;
        -1 -1 -1 -1 -1 1 1 1 1 1 1 -1 -1 1 1 -1];`

export const graphicsLessons = [
  {
    id: 'laml-gfx-homogeneous', module: GFX, title: 'Sliding a picture: the extra 1', minutes: 25, level: 'Intermediate',
    why: { title: 'The move a matrix cannot make', story: 'Every game, map and drawing program moves shapes around: turn the ship, shrink the icon, slide it across the screen. Turns and stretches are matrices, as Stage 2 showed. A slide is not, because a matrix always keeps the origin where it is. In 1827 August Möbius described points with one extra number, and in the 1960s Larry Roberts at MIT brought the idea to computer graphics. With an extra 1 on every point, a slide becomes a matrix too, and every move a screen makes is a matrix product.' },
    objective: 'Write points with an extra 1, build a 3 × 3 slide matrix, and combine slides with turns by multiplying.',
    prose: [
      'A matrix always sends the origin to the origin: A times the zero vector is zero. A **slide** (a translation) moves every point by the same amount, the origin included. So no 2 × 2 matrix can slide a shape 3 to the right, although that is the most common move in any game.',
      'The trick is to write the point (x, y) as three numbers, (x, y, 1). Then the 3 × 3 matrix T = [1 0 tx; 0 1 ty; 0 0 1] gives T * [x; y; 1] = [x + tx; y + ty; 1]. The extra 1 picks up the slide from the last column. Points written this way are in **homogeneous coordinates**.',
      'Turns and stretches fit too: put the 2 × 2 matrix in the top-left corner and 0 0 1 along the bottom. Now every move is a 3 × 3 matrix, and doing one move after another is multiplying their matrices, as in Stage 2. In T*R*H the matrix next to the points, R, acts first.',
      'In code, keep a shape\'s corners as the columns of H, with a row of ones underneath: H = ones(3, n); H(1:2,:) = P. Then T*H moves every corner at once, and the top two rows of the result are the new corners. Writing H = [P; ones(1, n)] builds the same matrix in one line.',
      'A direction, such as the way a ship points or its velocity, gets a 0 instead of a 1. Then T * [dx; dy; 0] = [dx; dy; 0]: sliding a ship does not change which way it faces, but turning it does. The last entry tells points and directions apart.',
    ],
    procedure: ['Write each point as (x, y, 1), and keep a shape\'s corners as the columns of H.', 'Build the slide T = [1 0 tx; 0 1 ty; 0 0 1], or put a 2 × 2 turn in the top-left corner of a 3 × 3 identity.', 'Multiply, with the first move nearest H, and read the new corners from the top two rows.'],
    prediction: { question: 'What does the slide T = [1 0 3; 0 1 1; 0 0 1] do to the direction [1; 0; 0], the way a ship is pointing?', answer: 'Nothing: T * [1; 0; 0] = [1; 0; 0]. The 0 in the last place switches the slide off, so directions turn with a ship but never slide.' },
    demo: {
      code: t`P = [0 2 2 0 0; 0 0 1 1 0];  % corners of a box (back to the start)
H = ones(3, 5);
H(1:2,:) = P;
T = [1 0 3; 0 1 1; 0 0 1];  % slide 3 right and 1 up
moved = T*H;
disp(moved)
a = 90*pi/180;
R = [cos(a) -sin(a) 0; sin(a) cos(a) 0; 0 0 1];
both = T*R*H;  % turn first, then slide
disp(both)`,
      draw: t`plot(P(1,:), P(2,:))
hold on
plot(moved(1,:), moved(2,:))
plot(both(1,:), both(2,:))
title('One 3 × 3 matrix can turn and slide')
xlabel('x'); ylabel('y'); legend('Start', 'Slid', 'Turned, then slid'); axis equal; grid on`,
      explain: [{ code: 'H(1:2,:) = P;', meaning: 'Copy the corners into the top two rows; the bottom row stays all ones.' }, { code: 'moved = T*H;', meaning: 'Every corner moves 3 right and 1 up. The bottom row is still all ones.' }, { code: 'R = [cos(a) -sin(a) 0; sin(a) cos(a) 0; 0 0 1];', meaning: 'The quarter turn from Stage 2, set in the corner of a 3 × 3 identity.' }, { code: 'both = T*R*H;', meaning: 'R is nearest the points, so it acts first: turn about the origin, then slide.' }],
    },
    challenge: {
      prompt: 'The corners of a triangle are the columns of P. Store H, the corners with a row of ones underneath; T, the slide by dx across and dy up; and moved = T*H.',
      setup: 'P = [0 4 0; 0 0 3];\ndx = -2;\ndy = 5;',
      starter: 'H = ones(3, 3);\nH(1:2,:) = P;\nT = eye(3);   % replace with the slide matrix\nmoved = T*H;',
      solution: 'H = ones(3, 3);\nH(1:2,:) = P;\nT = [1 0 dx; 0 1 dy; 0 0 1];\nmoved = T*H;',
      checks: [{ name: 'H', expected: [[0, 4, 0], [0, 0, 3], [1, 1, 1]], tolerance: 1e-9, message: 'The corners on top, a row of ones underneath.' }, { name: 'T', expected: [[1, 0, -2], [0, 1, 5], [0, 0, 1]], tolerance: 1e-9, message: 'The slide sits in the last column.' }, { name: 'moved', expected: [[-2, 2, -2], [5, 5, 8], [1, 1, 1]], tolerance: 1e-9, message: 'Every corner moves by (dx, dy).' }],
      cases: [{ setup: 'P = [0 4 0; 0 0 3];\ndx = 1;\ndy = -1;', checks: [{ name: 'moved', expected: [[1, 5, 1], [-1, -1, 2], [1, 1, 1]], tolerance: 1e-9, message: 'A different slide of the same triangle.' }] }],
      hints: ['The identity leaves every point where it is.', 'Put dx and dy in the last column: T = [1 0 dx; 0 1 dy; 0 0 1].', 'moved = T*H; then read the new corners from moved(1:2,:).'],
      transfer: 'Turn the triangle by 90° about the origin and then slide it, and also slide first and turn second. Which order leaves the triangle near (dx, dy), and why?',
    },
    notation: [
      { tex: t`\begin{bmatrix} x' \\ y' \\ 1 \end{bmatrix} = \begin{bmatrix} 1 & 0 & t_x \\ 0 & 1 & t_y \\ 0 & 0 & 1 \end{bmatrix}\begin{bmatrix} x \\ y \\ 1 \end{bmatrix}`, say: 'A slide by $(t_x, t_y)$ as a 3 × 3 matrix acting on $(x, y, 1)$.' },
      { tex: t`(x, y, 1) \text{ is a point}, \qquad (d_x, d_y, 0) \text{ is a direction}`, say: 'The last entry decides whether a slide applies.' },
    ],
    quiz: [
      { q: 'Why can no 2 × 2 matrix slide every point 3 to the right?', options: ['Any matrix sends the origin to the origin', 'Because 3 is odd', '2 × 2 matrices cannot be multiplied', 'Because slides change areas'], answer: 0, why: 'A times the zero vector is always zero, but a slide moves the origin.' },
      { q: 'In T*R*H, which move happens first?', options: ['R, the one next to H', 'T, the one written first', 'Both at the same time', 'It depends on the shape'], answer: 0, why: 'The matrix nearest the points acts first, as in any chain of moves.' },
      { q: 'What does a slide do to (2, 1, 0)?', options: ['Nothing: the 0 switches the slide off', 'Moves it like a point', 'Doubles it', 'Turns it'], answer: 0, why: 'The slide amounts are multiplied by the last entry, which is 0 for a direction.' },
    ],
    uses: [
      { who: 'general', title: 'Every app animation', story: 'When an icon slides, spins or grows on a phone screen, the web page or app applies a 3 × 3 matrix like these. The CSS `matrix(a, b, c, d, e, f)` transform is exactly its six changing entries.' },
      { who: 'cs', title: 'Scene graphs', story: 'Games and drawing programs store each object\'s placement as a matrix. A wheel is placed on a car, the car on a road, and multiplying the matrices places the wheel on the road.' },
      { who: 'mech', title: 'Assemblies in CAD', story: 'A CAD assembly places each part with a position and an orientation. In 3D that is a 4 × 4 homogeneous matrix per part, and moving a sub-assembly multiplies all of its parts\' matrices at once.' },
      { who: 'math', title: 'Projective geometry', story: 'Möbius\'s homogeneous coordinates treat (x, y, w) and (2x, 2y, 2w) as the same point. Points with w = 0 are "points at infinity", where parallel lines meet; the last lesson of this track uses that for perspective.' },
    ],
    angles: [
      { title: 'A slide is a shear in one dimension up', body: 'Picture the plane as the level $z = 1$ inside 3D space. The matrix $T$ is a shear of 3D space: it keeps the floor $z = 0$ fixed and pushes each level sideways by $z$ times $(t_x, t_y)$. The level $z = 1$ slides along itself, carrying the picture with it.' },
      { title: 'Points minus points are directions', body: 'Subtract two points: $(x_1, y_1, 1) - (x_2, y_2, 1) = (x_1 - x_2,\\ y_1 - y_2,\\ 0)$, an arrow from one to the other. Adding two points gives a last entry of 2, which is not a point at all. The bookkeeping matches common sense.' },
    ],
  },
  {
    id: 'laml-gfx-chains', module: GFX, title: 'Turning about any point, and a robot arm', minutes: 25, level: 'Intermediate',
    why: { title: 'Doors, wheels and robot arms', story: 'A door turns about its hinge, a wheel about its axle, a robot\'s forearm about its elbow. None of them turns about the origin. With homogeneous coordinates the fix is a short chain of matrices: slide the pivot to the origin, turn, slide back. Chain one turn and one slide per joint and you have the position of a robot\'s hand. Jacques Denavit and Richard Hartenberg wrote down the standard way to do this in 1955, and industrial robots still use it.' },
    objective: 'Turn a shape about any point with T(c)*R*T(-c), see that the order of moves matters, and find the joints of a two-link arm by multiplying one turn and one slide per joint.',
    prose: [
      'The turn R from Stage 2 always turns about the origin. To turn about another point c, slide c to the origin, turn, and slide back. As one matrix that is M = T(c) * R * T(−c), read from right to left: T(−c) acts first.',
      'Order matters. Turn by 90° and then slide 3 to the right, and the origin ends up at (3, 0). Slide first and then turn, and the turn carries that slide round to (0, 3). Matrix products do not commute, and here you can see it on the screen.',
      'A robot arm is a chain. The shoulder turns by angle a1, the upper arm has length L1, the elbow turns by a2 and the forearm has length L2. Each joint is a turn followed by a slide along its own arm: J1 = R(a1) * T(L1) and J2 = R(a2) * T(L2). The hand is at J1 * J2 * [0; 0; 1]. This is **forward kinematics**.',
      'Check it by hand with a1 = 90°, a2 = −90° and both lengths 1. Read right to left: start at (0, 0), slide 1 along the forearm to (1, 0), turn −90° to (0, −1), slide 1 to (1, −1), turn 90° to (1, 1). The arm goes up and then right, as the angles say.',
      'Stop the chain early to find a middle joint: the elbow is J1 * [0; 0; 1]. Industrial robots, animated characters and the bones of every 3D game character store a chain like this, one 4 × 4 matrix per joint in 3D.',
    ],
    procedure: ['To turn about c, multiply T(c)*R*T(-c), and read the product right to left.', 'For an arm, multiply one turn and one slide per joint, from the base outwards.', 'Apply the product to [0; 0; 1] for the end point; stop the chain early for a middle joint.'],
    prediction: { question: 'A square with corners (0, 0) and (2, 2) is turned 90° about its centre (1, 1). Where does the corner (0, 0) go?', answer: 'To (2, 0). Measured from the centre it is (−1, −1); a quarter turn makes that (1, −1); adding the centre back gives (2, 0). The square covers the same place, with its corners moved round.' },
    demo: {
      code: t`a = 90*pi/180;
R = [cos(a) -sin(a) 0; sin(a) cos(a) 0; 0 0 1];
Tc = [1 0 1; 0 1 1; 0 0 1];      % slide by c = (1, 1)
Tback = [1 0 -1; 0 1 -1; 0 0 1]; % slide by -c
M = Tc*R*Tback;                  % turn about (1, 1)
H = [0 2 0 0; 0 0 1 0; 1 1 1 1];  % a triangle, back to the start
turned = M*H;
disp(turned)
L1 = 2; L2 = 1.5;
a1 = 60*pi/180; a2 = -45*pi/180;
J1 = [cos(a1) -sin(a1) 0; sin(a1) cos(a1) 0; 0 0 1]*[1 0 L1; 0 1 0; 0 0 1];
J2 = [cos(a2) -sin(a2) 0; sin(a2) cos(a2) 0; 0 0 1]*[1 0 L2; 0 1 0; 0 0 1];
origin = [0; 0; 1];
elbow = J1*origin
hand = J1*J2*origin`,
      draw: t`plot(H(1,:), H(2,:))
hold on
plot(turned(1,:), turned(2,:))
plot([0 elbow(1) hand(1)], [0 elbow(2) hand(2)], 'o-')
title('Turning about (1, 1), and a two-joint arm')
xlabel('x'); ylabel('y'); legend('Triangle', 'Turned about (1, 1)', 'Arm: base, elbow, hand'); axis equal; grid on`,
      explain: [{ code: 'M = Tc*R*Tback;', meaning: 'Right to left: slide the pivot to the origin, turn, slide it back.' }, { code: 'J1 = [cos(a1) ...]*[1 0 L1; 0 1 0; 0 0 1];', meaning: 'The shoulder joint: turn by a1, then slide L1 along the upper arm.' }, { code: 'elbow = J1*origin', meaning: 'Stopping after the first joint gives the elbow: (1, 1.73).' }, { code: 'hand = J1*J2*origin', meaning: 'Both joints: the hand at (2.45, 2.12).' }],
    },
    challenge: {
      prompt: 'A two-joint arm has lengths L1 and L2 and joint angles a1 and a2 in radians. Store J1 and J2, each a turn followed by a slide along its arm, elbow = J1*origin and hand = J1*J2*origin, where origin = [0; 0; 1].',
      setup: 'L1 = 3;\nL2 = 2;\na1 = pi/2;\na2 = -pi/2;',
      starter: 'origin = [0; 0; 1];\nJ1 = [1 0 L1; 0 1 0; 0 0 1];   % the turns are missing\nJ2 = [1 0 L2; 0 1 0; 0 0 1];\nelbow = J1*origin;\nhand = J1*J2*origin;',
      solution: t`origin = [0; 0; 1];
J1 = [cos(a1) -sin(a1) 0; sin(a1) cos(a1) 0; 0 0 1]*[1 0 L1; 0 1 0; 0 0 1];
J2 = [cos(a2) -sin(a2) 0; sin(a2) cos(a2) 0; 0 0 1]*[1 0 L2; 0 1 0; 0 0 1];
elbow = J1*origin;
hand = J1*J2*origin;`,
      checks: [{ name: 'J1', expected: [[0, -1, 0], [1, 0, 3], [0, 0, 1]], tolerance: 1e-9, message: 'Turn by a1, then slide L1: the turn matrix times the slide matrix.' }, { name: 'J2', expected: [[0, 1, 0], [-1, 0, -2], [0, 0, 1]], tolerance: 1e-9, message: 'The same pattern with a2 and L2.' }, { name: 'elbow', expected: [0, 3, 1], tolerance: 1e-9, message: 'Straight up by L1.' }, { name: 'hand', expected: [2, 3, 1], tolerance: 1e-9, message: 'Up 3, then a right turn and 2 along.' }],
      cases: [{ setup: 'L1 = 3;\nL2 = 2;\na1 = 0;\na2 = pi/2;', checks: [{ name: 'elbow', expected: [3, 0, 1], tolerance: 1e-9, message: 'With a1 = 0 the upper arm lies along x.' }, { name: 'hand', expected: [3, 2, 1], tolerance: 1e-9, message: 'The elbow bends up by a quarter turn.' }] }],
      hints: ['Each joint is a turn matrix times a slide matrix, in that order.', 'J1 = [cos(a1) -sin(a1) 0; sin(a1) cos(a1) 0; 0 0 1]*[1 0 L1; 0 1 0; 0 0 1];', 'elbow = J1*origin; hand = J1*J2*origin;'],
      transfer: 'Find a second pair of angles that puts the hand at the same point, with the elbow bent the other way. How are its angles related to the first pair?',
    },
    notation: [
      { tex: t`M = T(\mathbf c)\,R\,T(-\mathbf c)`, say: 'Turn about the point $\\mathbf c$: slide it to the origin, turn, slide back.' },
      { tex: t`\text{hand} = R(a_1)\,T(L_1)\,R(a_2)\,T(L_2)\begin{bmatrix} 0 \\ 0 \\ 1 \end{bmatrix}`, say: 'Forward kinematics: one turn and one slide per joint.' },
    ],
    quiz: [
      { q: 'Turning 90° and then sliding 3 to the right moves the origin to (3, 0). Where does sliding first, then turning, move it?', options: ['(0, 3)', '(3, 0)', '(0, 0)', '(3, 3)'], answer: 0, why: 'The slide takes it to (3, 0), then the quarter turn carries it round to (0, 3).' },
      { q: 'In M = T(c)*R*T(−c), what does T(−c) do?', options: ['Slides the pivot c to the origin', 'Turns by −c', 'Undoes the turn', 'Nothing: it cancels T(c)'], answer: 0, why: 'R can only turn about the origin, so the pivot is moved there first.' },
    ],
    uses: [
      { who: 'mech', title: 'Industrial robots', story: 'Welding and assembly robots compute where their tool is by multiplying one 4 × 4 matrix per joint, following the Denavit–Hartenberg convention of 1955.' },
      { who: 'cs', title: 'Skeletal animation', story: 'A game character\'s hand is placed by multiplying the matrices of the shoulder, elbow and wrist bones, many times a second for every character on screen.' },
      { who: 'general', title: 'Hinges and pivots', story: 'Opening a laptop lid or swinging a gate in a 3D model is a turn about the hinge: slide the hinge to the origin, turn, slide back.' },
      { who: 'physics', title: 'Moons around planets', story: 'A simulation of the Moon going round the Earth going round the Sun chains two turns about two moving centres, exactly like a two-joint arm.' },
    ],
    angles: [
      { title: 'Why right to left', body: 'Write $M\\mathbf p = T(\\mathbf c)\\big(R\\,(T(-\\mathbf c)\\,\\mathbf p)\\big)$. The brackets show the order: the factor nearest $\\mathbf p$ acts first. Reading a chain of matrices from the right follows the point as it moves.' },
      { title: 'Frames inside frames', body: 'Each joint matrix turns coordinates measured along the next link into coordinates measured along the previous one. The product $J_1 J_2$ turns "hand coordinates", where the hand is at the origin, into base coordinates. That is the change of basis from Spaces and bases, with a slide included.' },
    ],
  },
  {
    id: 'laml-gfx-camera', module: GFX, title: '3D turns and a camera that looks at things', minutes: 30, level: 'Advanced',
    why: { title: 'Where is the camera pointing?', story: 'A film crew plans a shot by saying where the camera stands and what it looks at. A game does the same 60 times a second, and a virtual-reality headset does it for each eye. From those two points, and which way is up, the computer builds three perpendicular directions: right, up and ahead. Measuring every point of the scene along them is a change of basis, the idea from Spaces and bases, and it is what the classic graphics function "look at" computes.' },
    objective: 'Build 3D turns, construct a camera\'s right, up and forward directions with cross products, and convert world points into camera coordinates.',
    prose: [
      'A turn about the z-axis in 3D is the 2D turn with a 1 added: Rz = [cos(a) −sin(a) 0; sin(a) cos(a) 0; 0 0 1]. It leaves z alone. Turns about x and y are built the same way, each leaving its own axis alone. Every 3D turn has perpendicular unit columns and determinant 1, like the orthogonal matrices of Best fit.',
      'A camera stands at a point e and looks at a target g. Its forward direction is f = (g − e)/‖g − e‖. Its right direction must be perpendicular to f and level with the ground, so take the cross product with the world\'s up direction and normalise: r = cross(f, up)/‖cross(f, up)‖. The camera\'s own up is u = cross(r, f), already of length 1.',
      'r, u and f are perpendicular unit vectors: a new basis. To see a point p from the camera, measure p − e along each one: how far right, how far up, how far ahead. Each is a dot product. Put r, u and f as the rows of C, and view = C * (p − e) does all three at once.',
      'Because the rows of C are perpendicular unit vectors, C * Cᵀ = I, so C\'s inverse is its transpose. Going back from the camera\'s view to the world is p = e + Cᵀ * view: no solve needed.',
      'The third view coordinate is the depth. A point with negative depth is behind the camera and must not be drawn. In code, build C by rows: C = zeros(3,3); C(1,:) = r; C(2,:) = u; C(3,:) = f. Games fold the subtraction of e into a single 4 × 4 matrix, using the extra 1 from the first lesson of this track.',
    ],
    procedure: ['Forward: f = (g − e)/norm(g − e).', 'Right: r = cross(f, up), divided by its length. Camera up: u = cross(r, f).', 'Put r, u and f as the rows of C, and compute view = C*(p − e) for each point.'],
    prediction: { question: 'A camera at e = (0, 0, 0) looks at g = (0, 0, 5) with world up (0, 1, 0). What are f and r?', answer: 'f = (0, 0, 1) and r = (−1, 0, 0). Looking along +z with y up, the x-axis points to your left in a right-handed system, so the camera\'s right is −x. That surprise is why cameras are built from cross products, not guesses.' },
    demo: {
      code: t`e = [4 3 5];   % where the camera stands
g = [0 0 0];   % what it looks at
up = [0 1 0];
f = (g - e)/norm(g - e);
r = cross(f, up);
r = r/norm(r);
u = cross(r, f);
C = zeros(3,3);
C(1,:) = r;
C(2,:) = u;
C(3,:) = f;
check = C*transpose(C)   % the identity: perpendicular unit rows
p = [1 1 1];
view = C*(p - e)         % right, up, ahead`,
      draw: t`${CUBE}
seen = C*cube;
w = C*e;
for i = 1:3
  seen(i,:) = seen(i,:) - w(i);   % C*(corner - e) = C*corner - C*e
end
plot(seen(1,:), seen(2,:))
title('The cube as seen from (4, 3, 5): right and up coordinates')
xlabel('Right'); ylabel('Up'); axis equal; grid on`,
      explain: [{ code: 'f = (g - e)/norm(g - e);', meaning: 'The unit arrow from the camera to the target.' }, { code: 'r = cross(f, up);', meaning: 'Perpendicular to both forward and the world\'s up, so it is level: the camera\'s right.' }, { code: 'check = C*transpose(C)', meaning: 'All the dot products of the rows: 1 on the diagonal, 0 elsewhere.' }, { code: 'view = C*(p - e)', meaning: 'The corner (1, 1, 1) is about 5.4 ahead of the camera, a little right of and above the centre of view.' }],
    },
    challenge: {
      prompt: 'A camera at e looks at g, with world up direction up. Store the unit vectors f, r and u, the matrix C with rows r, u and f, and view = C*(p - e), the point p in camera coordinates (right, up, ahead).',
      setup: 'e = [0 0 -5];\ng = [0 0 0];\nup = [0 1 0];\np = [1 2 3];',
      starter: 'f = g - e;   % not yet of length 1\nr = cross(f, up);\nu = cross(r, f);\nC = zeros(3,3);\nC(1,:) = r;\nC(2,:) = u;\nC(3,:) = f;\nview = C*(p - e);',
      solution: t`f = (g - e)/norm(g - e);
r = cross(f, up);
r = r/norm(r);
u = cross(r, f);
C = zeros(3,3);
C(1,:) = r;
C(2,:) = u;
C(3,:) = f;
view = C*(p - e);`,
      checks: [{ name: 'f', expected: [0, 0, 1], tolerance: 1e-9, message: 'Divide g − e by its length.' }, { name: 'r', expected: [-1, 0, 0], tolerance: 1e-9, message: 'cross(f, up), then divide by its length.' }, { name: 'u', expected: [0, 1, 0], tolerance: 1e-9, message: 'cross(r, f).' }, { name: 'C', expected: [[-1, 0, 0], [0, 1, 0], [0, 0, 1]], tolerance: 1e-9, message: 'Rows r, u and f, in that order.' }, { name: 'view', expected: [-1, 2, 8], tolerance: 1e-9, message: 'Measure p − e along each row.' }],
      cases: [{ setup: 'e = [3 0 0];\ng = [0 0 0];\nup = [0 1 0];\np = [0 0 1];', checks: [{ name: 'f', expected: [-1, 0, 0], tolerance: 1e-9, message: 'This camera looks along −x.' }, { name: 'view', expected: [-1, 0, 3], tolerance: 1e-9, message: 'The point is 3 ahead and 1 to the left.' }] }],
      hints: ['f must have length 1: divide by norm(g - e).', 'Normalise r too; u = cross(r, f) then has length 1 already.', 'Fill C row by row, then view = C*(p - e);'],
      transfer: 'Move the camera straight above the target, so g − e points along up. What goes wrong with cross(f, up), and how could a camera system avoid it?',
    },
    notation: [
      { tex: t`\mathbf f = \frac{\mathbf g - \mathbf e}{\|\mathbf g - \mathbf e\|}, \quad \mathbf r = \frac{\mathbf f \times \mathbf{up}}{\|\mathbf f \times \mathbf{up}\|}, \quad \mathbf u = \mathbf r \times \mathbf f`, say: 'Forward, right and up for a camera at $\\mathbf e$ looking at $\\mathbf g$.' },
      { tex: t`\text{view} = C(\mathbf p - \mathbf e), \quad C = \begin{bmatrix} \mathbf r^T \\ \mathbf u^T \\ \mathbf f^T \end{bmatrix}, \quad C^{-1} = C^T`, say: 'Camera coordinates by dot products; going back needs only a transpose.' },
    ],
    quiz: [
      { q: 'Why is C\'s inverse its transpose?', options: ['Its rows are perpendicular unit vectors', 'Every 3 × 3 matrix has this property', 'Because C is symmetric', 'Because the camera is at the origin'], answer: 0, why: 'C times its transpose holds all the dot products of the rows: 1 on the diagonal and 0 elsewhere.' },
      { q: 'A point has view coordinates (2, 1, −4). Where is it?', options: ['Behind the camera', 'Ahead and to the right', 'Exactly at the camera', 'On the screen'], answer: 0, why: 'The third coordinate is the depth along f, and it is negative.' },
    ],
    uses: [
      { who: 'cs', title: 'Game cameras', story: 'Game engines have a LookAt function that builds exactly this matrix from a position, a target and an up direction, every frame.' },
      { who: 'general', title: 'Virtual reality', story: 'A headset tracks where your head is and which way it faces, and builds a camera matrix for each eye, about 90 times a second.' },
      { who: 'mech', title: 'CAD viewports', story: 'Orbiting around a part in a CAD program moves the camera position e while keeping the target g on the part; the view is rebuilt with the same cross products.' },
      { who: 'physics', title: 'Pointing a telescope', story: 'Converting a star\'s position in the sky to "how far up, how far round" for a telescope mount is a change between two perpendicular bases, done with a turn matrix.' },
      { who: 'math', title: 'Turns need three numbers', story: 'A 3 × 3 turn has 9 entries but must have 3 unit-length columns and 3 right angles between them. That leaves 3 free numbers, such as the yaw, pitch and roll of an aircraft.' },
    ],
    angles: [
      { title: 'Rows as questions', body: 'Each row of $C$ asks one question of $\\mathbf p - \\mathbf e$: how far right, how far up, how far ahead? A dot product with a unit vector measures length along it, so three dot products answer all three.' },
      { title: 'Why the cross product order matters', body: '$\\mathbf a \\times \\mathbf b = -(\\mathbf b \\times \\mathbf a)$. Swapping to cross(up, f) gives the camera\'s left instead of its right, and the picture comes out mirrored. Fix one order and use it everywhere.' },
    ],
  },
  {
    id: 'laml-gfx-perspective', module: GFX, title: 'Capstone: perspective, and a wireframe cube', minutes: 35, level: 'Capstone',
    why: { title: 'Why far things look small', story: 'Around 1415 Filippo Brunelleschi stood in the doorway of Florence Cathedral with a painting of the Baptistery and a mirror, and showed that a picture could match the real view exactly. Leon Battista Alberti wrote down the rules in 1435. The rule underneath is simple: divide by the distance. Twice as far away looks half as big. Every graphics card does that division billions of times a second, after the matrices of this track have put each point in front of the camera.' },
    objective: 'Project camera-space points onto a screen by dividing by depth, write the projection with a 3 × 4 matrix and homogeneous coordinates, and draw a cube in perspective from a camera.',
    prose: [
      'Use camera coordinates: x to the right, y up, z ahead. Put a pinhole at the origin and a screen at distance f in front of it. The ray from a point (x, y, z) through the pinhole meets the screen at (f·x/z, f·y/z): similar triangles. Twice as far away, half as big.',
      'Dividing by z is not a matrix move. Homogeneous coordinates help again. K = [f 0 0 0; 0 f 0 0; 0 0 1 0] times (x, y, z, 1) gives (f·x, f·y, z). Read the result as a point "up to scale" and divide the first two entries by the last. Graphics programmers call this last entry w, and the step the **perspective divide**.',
      'The whole pipeline is: place the model in the world (a 4 × 4 matrix, as in the first lesson of this track), view it from the camera (the previous lesson), apply K, divide. Every step but the last is a matrix, so a graphics card multiplies them into one matrix per object and then divides.',
      'Straight edges stay straight on the screen, so a wireframe needs only its corners: project them and join them in order. Parallel edges that go away from the camera meet at a vanishing point, as the painters discovered: the gap between them is f·(gap)/z, which shrinks to nothing as z grows.',
      'A point with z ≤ 0 is at or behind the pinhole. Dividing would flip it or send it to infinity, so real renderers cut such points away first ("clipping"). Every point in this lesson is in front of the camera.',
    ],
    procedure: ['Put each point in camera coordinates (x right, y up, z ahead) with a fourth entry 1.', 'Multiply by K = [f 0 0 0; 0 f 0 0; 0 0 1 0].', 'Divide the first two rows by the third to get screen positions, then join the corners in order.'],
    prediction: { question: 'Two posts of the same height stand at depths 4 and 8. How do their heights on the screen compare?', answer: 'The far one looks half as tall. Screen height is f·y/z, so doubling z halves it.' },
    demo: {
      code: t`${CUBE}
V = ones(4, 16);
V(1,:) = cube(1,:) + 1.5;   % move the cube right,
V(2,:) = cube(2,:) + 1;     % up,
V(3,:) = cube(3,:) + 5;     % and 5 ahead of the camera
f = 2;
K = [f 0 0 0; 0 f 0 0; 0 0 1 0];
W = K*V;
sx = W(1,:)./W(3,:);
sy = W(2,:)./W(3,:);
disp('Near face, then far face: screen x of the first corner')
disp([sx(1) sx(6)])`,
      draw: t`plot(sx, sy)
title('A cube in perspective: the far face looks smaller')
xlabel('Screen x'); ylabel('Screen y'); axis equal; grid on`,
      explain: [{ code: 'V(3,:) = cube(3,:) + 5;', meaning: 'The cube now spans depths 4 to 6, all in front of the pinhole.' }, { code: 'W = K*V;', meaning: 'One matrix product: (f·x, f·y, z) for all 16 corners.' }, { code: 'sx = W(1,:)./W(3,:);', meaning: 'The perspective divide, corner by corner. The near corner lands at 0.25, the far one at 0.17.' }],
    },
    derive: {
      claim: t`Show that a point $(x, z)$ seen through a pinhole at the origin lands on a screen at depth $f$ at height $f\,x/z$.`,
      given: t`Look from the side, so only the across position $x$ and the depth $z > 0$ matter. The screen is the line of depth $f$.`,
      steps: [
        { ask: t`The ray from the pinhole through the point is every point $s\,(x, z)$ for $s \ge 0$. Where does it meet the screen?`, options: [t`Where $s\,z = f$, so $s = f/z$`, t`Where $s\,x = f$`, t`At $s = 1$`], answer: 0, why: t`The screen is where the depth equals $f$, and the depth along the ray is $s\,z$.` },
        { ask: t`What is the across position there?`, options: [t`$s\,x = f\,x/z$`, t`$x$`, t`$f\,x$`], answer: 0, why: t`Substitute $s = f/z$ into $s\,x$.` },
        { ask: t`The point moves twice as far away, to $(x, 2z)$. What happens to its screen position?`, options: ['It halves', 'It doubles', 'It stays the same'], answer: 0, why: t`$f\,x/(2z)$ is half of $f\,x/z$.` },
      ],
      conclusion: t`Screen position is $f\,x/z$, and the same holds for $y$. The division by $z$ is the whole of perspective; the matrix $K$ prepares $(f x, f y, z)$ and the divide finishes the job.`,
    },
    challenge: {
      prompt: 'A camera at e looks at g with world up direction up. The columns of P are points in the world, and focal is the screen distance. Build the camera matrix C (rows r, u, fwd), store cam, the points in camera coordinates (one column per point), and the screen positions sx and sy after the perspective divide.',
      setup: 'e = [0 0 -5];\ng = [0 0 0];\nup = [0 1 0];\nP = [1 -1 0; 1 1 -2; 0 3 -1];\nfocal = 2;',
      starter: 'cam = P;   % the camera is missing\nsx = focal*cam(1,:)./cam(3,:);\nsy = focal*cam(2,:)./cam(3,:);',
      solution: t`fwd = (g - e)/norm(g - e);
r = cross(fwd, up);
r = r/norm(r);
u = cross(r, fwd);
C = zeros(3,3);
C(1,:) = r;
C(2,:) = u;
C(3,:) = fwd;
n = size(P, 2);
cam = zeros(3, n);
for k = 1:n
  cam(:,k) = C*(P(:,k) - e);
end
sx = focal*cam(1,:)./cam(3,:);
sy = focal*cam(2,:)./cam(3,:);`,
      checks: [{ name: 'cam', expected: [[-1, 1, 0], [1, 1, -2], [5, 8, 4]], tolerance: 1e-9, message: 'Each column is C*(point − e).' }, { name: 'sx', expected: [-0.4, 0.25, 0], tolerance: 1e-9, message: 'focal times right, divided by depth.' }, { name: 'sy', expected: [0.4, 0.25, -1], tolerance: 1e-9, message: 'focal times up, divided by depth.' }],
      cases: [{ setup: 'e = [0 0 -10];\ng = [0 0 0];\nup = [0 1 0];\nP = [1 -1 0; 1 1 -2; 0 3 -1];\nfocal = 1;', checks: [{ name: 'cam', expected: [[-1, 1, 0], [1, 1, -2], [10, 13, 9]], tolerance: 1e-9, message: 'The camera stands further back.' }, { name: 'sx', expected: [-0.1, 1 / 13, 0], tolerance: 1e-9, message: 'Further away and a shorter screen distance: smaller.' }] }],
      hints: ['Build fwd, r, u and C exactly as in the camera lesson. (f is not used here, so it cannot clash with focal.)', 'Loop over the columns: cam(:,k) = C*(P(:,k) - e);', 'sx = focal*cam(1,:)./cam(3,:); and the same for sy with row 2.'],
      transfer: 'Move the camera to e = [0 0 0.5], so one point is behind it. What happens to that point\'s screen position if you divide anyway, and what should a renderer do instead?',
    },
    notation: [
      { tex: t`(x, y, z) \mapsto \left(\frac{f\,x}{z},\ \frac{f\,y}{z}\right)`, say: 'Perspective: divide by the depth $z$.' },
      { tex: t`K = \begin{bmatrix} f & 0 & 0 & 0 \\ 0 & f & 0 & 0 \\ 0 & 0 & 1 & 0 \end{bmatrix}, \quad K\begin{bmatrix} x \\ y \\ z \\ 1 \end{bmatrix} = \begin{bmatrix} f x \\ f y \\ z \end{bmatrix}`, say: 'The matrix part of the projection; dividing by the last entry finishes it.' },
    ],
    quiz: [
      { q: 'Why can\'t a matrix alone do perspective?', options: ['It divides by depth, and a matrix only multiplies and adds', 'Matrices cannot shrink things', 'Perspective needs complex numbers', 'Because screens are flat'], answer: 0, why: 'f·x/z is not a fixed combination of x, y and z.' },
      { q: 'Railway lines meet on the horizon in a photo. In 3D they are…', options: ['parallel lines going away from the camera', 'lines that really meet', 'curved', 'vertical'], answer: 0, why: 'Their screen gap is f·(gap)/z, which shrinks to zero as z grows: the vanishing point.' },
    ],
    uses: [
      { who: 'cs', title: 'Every 3D game', story: 'Graphics cards multiply each corner by one combined matrix and then divide by w, for millions of corners a frame. The steps are exactly this track\'s.' },
      { who: 'general', title: 'Painting and photography', story: 'A photograph is a pinhole projection with a lens. Painters since the Renaissance have used vanishing points to make flat pictures look deep.' },
      { who: 'ml', title: 'Camera calibration', story: 'Self-driving cars and phone apps that measure rooms first estimate each camera\'s f and position from photos of a known pattern, then invert the projection to measure the world.' },
      { who: 'mech', title: 'Photogrammetry', story: 'Engineers measure bridges, dams and buildings from overlapping photographs. Each photo is a camera matrix plus a divide, and matching points across photos recovers 3D positions.' },
      { who: 'physics', title: 'The camera obscura', story: 'Light through a small hole in a dark room paints an upside-down image of the outside on the far wall, by the same similar triangles. Astronomers used it to watch solar eclipses safely.' },
    ],
    angles: [
      { title: 'Points up to scale', body: 'The homogeneous vectors $(2, 4, 2)$ and $(1, 2, 1)$ give the same screen point $(1, 2)$. Every point on one ray through the pinhole lands on the same pixel, and the ray is exactly the set of multiples of one vector.' },
      { title: 'Why straight edges stay straight', body: 'A straight edge and the pinhole lie in one flat plane. The screen meets that plane in a straight line, so the picture of the edge is straight too. That is why projecting the corners and joining them is enough.' },
    ],
  },
]
