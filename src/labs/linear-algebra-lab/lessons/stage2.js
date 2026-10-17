// Stage 2, "Use it": matrices as machines, and solving many equations at once.
// Same conventions as stage1.js: why first, short visible code (drawing code in `demo.draw`),
// and starters that run but give a wrong answer until the learner fills in one piece.
// Rewritten lessons keep their ids; their notation, quick checks and proofs come from enrich.js.
// OpenMAT note: name a right-hand side before solving (b = [..]; x = A \ b); `A \ [..]` is misread.
const t = String.raw

const TRUSS_M = 'M = [1 c 0 1 0 0; 0 c 0 0 1 0; -1 0 -c 0 0 0; 0 0 c 0 0 1; 0 -c c 0 0 0; 0 -c -c 0 0 0];'

export const stage2 = [
  {
    id: 'laml-indexing', module: 'Matrices are machines', title: 'A table of numbers', minutes: 12, level: 'Beginner',
    why: { title: 'Spreadsheets, photos and timetables', story: 'A price list with one row per shop and one column per item. A photo stored as a grid of brightness values. A train timetable with stations down the side and times across the top. Each is a table of numbers: a matrix. Code reads it exactly the way you read a spreadsheet.' },
    objective: 'Write a matrix, read single entries, whole rows and whole columns, and state its shape.',
    prose: [
      'Three shops sell four items. A table with one row per shop and one column per item holds all twelve prices. A table of numbers like this is a **matrix**. This one is 3 × 4: 3 rows and 4 columns. Rows always come first.',
      'In code, spaces separate the entries of a row and semicolons start a new row: `prices = [2 1 4 3; 2 2 3 3; 3 1 4 2];`.',
      'To read one price, give the row and then the column: `prices(2, 3)` is shop 2\'s price for item 3. A colon means "all of them": `prices(2, :)` is every price at shop 2, and `prices(:, 3)` is every shop\'s price for item 3.',
      '`size(prices)` reports the shape, [3 4]. Mixing up rows and columns is the most common matrix mistake, so say "row, column" to yourself until it is automatic.',
    ],
    procedure: ['Decide what the rows mean and what the columns mean.', 'Read one entry as (row, column).', 'Use a colon for a whole row or a whole column.'],
    prediction: { question: 'What does prices(1, :) contain, and how many numbers is it?', answer: 'All of shop 1\'s prices, one per item: 4 numbers.' },
    demo: {
      code: t`prices = [2 1 4 3; 2 2 3 3; 3 1 4 2];
shop2item3 = prices(2, 3)
shop1 = prices(1, :)`,
      draw: t`plot(1:4, prices(1, :))
hold on
plot(1:4, prices(2, :))
plot(1:4, prices(3, :))
title('Each row of the table is one shop')
xlabel('Item'); ylabel('Price'); legend('Shop 1', 'Shop 2', 'Shop 3'); grid on`,
      explain: [{ code: 'prices = [2 1 4 3; 2 2 3 3; 3 1 4 2];', meaning: 'Three rows (shops) of four entries (items), rows separated by semicolons.' }, { code: 'shop2item3 = prices(2, 3)', meaning: 'Row 2, column 3: shop 2\'s price for item 3, which is 3.' }, { code: 'shop1 = prices(1, :)', meaning: 'The colon takes every column: all of row 1.' }],
    },
    challenge: {
      prompt: 'temps has one row per city and one column per day. Store wednesday = city 2\'s temperature on day 3, and city3 = the whole third row.',
      setup: 'temps = [12 14 15 13 11; 20 22 21 19 18; 5 7 6 8 9];',
      starter: 'wednesday = 0;   % replace 0 with: temps(2, 3)\ncity3 = 0;   % replace 0 with: temps(3, :)',
      solution: 'wednesday = temps(2, 3);\ncity3 = temps(3, :);',
      checks: [{ name: 'wednesday', expected: 21, tolerance: 1e-9, message: 'Row 2 (the city), column 3 (the day).' }, { name: 'city3', expected: [5, 7, 6, 8, 9], tolerance: 1e-9, message: 'A colon in the column position takes the whole row.' }],
      cases: [{ setup: 'temps = [1 2 3 4 5; 6 7 8 9 10; 11 12 13 14 15];', checks: [{ name: 'wednesday', expected: 8, tolerance: 1e-9, message: 'Read by position, not by value.' }, { name: 'city3', expected: [11, 12, 13, 14, 15], tolerance: 1e-9, message: 'Row 3, all columns.' }] }],
      hints: ['Row first, then column.', 'temps(2, 3) is row 2, column 3.', 'wednesday = temps(2, 3); city3 = temps(3, :);'],
      transfer: 'Compute mean(temps(:, 1)) and describe in words what it measures. Then find the warmest city on day 5.',
    },
  },
  {
    id: 'laml-matrix-vector', module: 'Matrices are machines', title: 'Matrix × vector: many dot products at once', minutes: 15, level: 'Beginner',
    why: { title: 'Every shop\'s bill in one step', story: 'You have a shopping list and a table of prices from three shops. Which shop is cheapest? Each bill is a dot product of your list with one shop\'s prices. A matrix times a vector does all of them at once, and it is the operation computers do fastest.' },
    objective: 'Multiply a matrix by a vector, reading it both as dot products with the rows and as a combination of the columns.',
    prose: [
      'Your basket is q = [1; 2; 0; 1]: how many of each of four items. Shop 1\'s prices are the first row of the price matrix P. Its bill is the dot product of that row with q.',
      '`P * q` takes the dot product of every row with q and stacks the answers: one bill per shop. The result has one entry for each row of P.',
      'For this to work, q needs one entry per column of P (one amount per item). A 3 × 4 matrix times a vector with 4 entries gives a vector with 3 entries.',
      'There is a second way to read the very same product, which the next lessons rely on: P * q is a combination of the **columns** of P, with the entries of q as the weights.',
    ],
    procedure: ['Check that the vector has one entry per column of the matrix.', 'Each entry of the answer is one row dotted with the vector.', 'The answer has one entry per row of the matrix.'],
    prediction: { question: 'P is 3 × 4 and q has 4 entries. How many entries does P * q have?', answer: 'Three: one for each row (shop).' },
    demo: {
      code: t`P = [2 1 4 3; 2 2 3 3; 3 1 4 2];
q = [1; 2; 0; 1];
bills = P * q`,
      draw: t`plot([1 2 3], bills)
title('The same basket costs a different amount at each shop')
xlabel('Shop'); ylabel('Bill'); grid on`,
      explain: [{ code: 'P = [2 1 4 3; 2 2 3 3; 3 1 4 2];', meaning: 'One row of prices per shop, one column per item.' }, { code: 'q = [1; 2; 0; 1];', meaning: 'How many of each item you buy.' }, { code: 'bills = P * q', meaning: 'Each row dotted with q: [7; 9; 7]. Shops 1 and 3 are cheapest.' }],
    },
    challenge: {
      prompt: 'nutrition has one row per nutrient (protein, fat, sugar) and one column per food, in grams per serving. servings says how many servings of each food you eat. Store totals = nutrition * servings.',
      setup: 'nutrition = [10 2 0 5; 3 8 1 0; 1 0 20 2];\nservings = [2; 1; 1; 3];',
      starter: 'totals = servings;   % replace with: nutrition * servings',
      solution: 'totals = nutrition * servings;',
      checks: [{ name: 'totals', expected: [37, 15, 28], tolerance: 1e-9, message: 'Each total is one row of nutrition dotted with servings.' }],
      cases: [{ setup: 'nutrition = [10 2 0 5; 3 8 1 0; 1 0 20 2];\nservings = [0; 0; 1; 1];', checks: [{ name: 'totals', expected: [5, 1, 22], tolerance: 1e-9, message: 'A different menu, the same table.' }] }],
      hints: ['The matrix goes first, then the vector.', 'There is one serving count per column of nutrition.', 'totals = nutrition * servings;'],
      transfer: 'Rebuild totals as servings(1)*nutrition(:,1) + ... + servings(4)*nutrition(:,4). Explain why the column view gives the same answer as the row view.',
    },
    notation: [
      { tex: t`A\mathbf x = \begin{bmatrix} \text{row}_1 \cdot \mathbf x \\ \text{row}_2 \cdot \mathbf x \\ \vdots \end{bmatrix}`, say: 'Row view: each entry of the answer is one row dotted with $\\mathbf x$.' },
      { tex: t`A\mathbf x = x_1\,\mathbf a_1 + x_2\,\mathbf a_2 + \dots + x_n\,\mathbf a_n`, say: 'Column view: a combination of the columns $\\mathbf a_j$, weighted by the entries of $\\mathbf x$.' },
      { tex: t`(m \times n)\,(n \times 1) = (m \times 1)`, say: 'The inner sizes must match; the outer sizes give the shape of the answer.' },
    ],
    quiz: [
      { q: 'A is 2 × 3. How many entries must x have for A * x to work?', options: ['3', '2', '6', 'Any number'], answer: 0, why: 'One entry per column of A.' },
      { q: 'What is [1 2; 3 4] * [1; 1]?', options: ['[3; 7]', '[4; 6]', '[1 2; 3 4]', '10'], answer: 0, why: 'Row 1: 1 + 2 = 3. Row 2: 3 + 4 = 7.' },
    ],
  },
  {
    id: 'laml-sin-cos', module: 'Matrices are machines', title: 'Angles as points on a circle', minutes: 15, level: 'Beginner',
    why: { title: 'Turning things', story: 'A robot arm turns at its shoulder. A game turns a spaceship. A wheel turns on its axle. To turn a point by an angle, you need to know where a turned arrow ends up. Two calculator buttons, cos and sin, answer exactly that, and they are all the trigonometry linear algebra needs.' },
    objective: 'Find the point at a given angle on a circle with cos and sin, and convert degrees to radians.',
    prose: [
      'Walk 1 metre in a direction θ degrees anticlockwise from east. You end up cos θ metres east and sin θ metres north. That is what cos and sin are: (cos θ, sin θ) is the point at angle θ on a circle of radius 1.',
      'Check the easy angles. At 0° you are at (1, 0), so cos 0° = 1 and sin 0° = 0. At 90° you are at (0, 1). At 180° you are at (−1, 0).',
      'For a longer walk of length r, scale it: the end point is (r cos θ, r sin θ). This turns "distance and direction" into a vector.',
      'Computers measure angles in **radians**, where a full turn is 2π instead of 360°. Convert by multiplying degrees by π/180. In code: `cos(30*pi/180)`.',
    ],
    procedure: ['Convert degrees to radians: multiply by pi/180.', 'The unit arrow at angle θ is [cos θ; sin θ].', 'For length r, multiply by r.'],
    prediction: { question: 'Where is the point at 270°?', answer: '(0, −1): straight down, or due south.' },
    demo: {
      code: t`theta = 30*pi/180;
point = [cos(theta); sin(theta)]
lengthCheck = norm(point)`,
      draw: t`t = linspace(0, 2*pi, 100);
plot(cos(t), sin(t))
hold on
plot([0 point(1)], [0 point(2)])
title('The point at 30 degrees on a circle of radius 1')
xlabel('cos'); ylabel('sin'); legend('Circle', 'Arrow at 30 degrees'); axis equal; grid on`,
      explain: [{ code: 'theta = 30*pi/180;', meaning: '30 degrees in radians: about 0.524.' }, { code: 'point = [cos(theta); sin(theta)]', meaning: 'The end of a 1 metre walk at 30°: about [0.866; 0.5].' }, { code: 'lengthCheck = norm(point)', meaning: 'Always 1: the point lies on the circle of radius 1.' }],
    },
    challenge: {
      prompt: 'A robot arm of length armLength points angleDeg degrees above the horizontal. Store t (the angle in radians) and tip = [armLength*cos(t); armLength*sin(t)].',
      setup: 'armLength = 2;\nangleDeg = 60;',
      starter: 't = 0;   % replace 0 with: angleDeg*pi/180\ntip = [armLength*cos(t); armLength*sin(t)];',
      solution: 't = angleDeg*pi/180;\ntip = [armLength*cos(t); armLength*sin(t)];',
      checks: [{ name: 'tip', expected: [1, Math.sqrt(3)], tolerance: 1e-6, message: 'Convert the angle to radians first.' }],
      cases: [{ setup: 'armLength = 3;\nangleDeg = 90;', checks: [{ name: 'tip', expected: [0, 3], tolerance: 1e-6, message: 'Pointing straight up, the tip is directly above the shoulder.' }] }],
      hints: ['cos and sin expect radians.', 'Multiply degrees by pi/180.', 't = angleDeg*pi/180;'],
      transfer: 'Add a second arm segment that points at a different angle and starts at tip. Where does its end land? (This is how robot arms are controlled.)',
    },
    notation: [
      { tex: t`(\cos\theta,\ \sin\theta)`, say: 'The point at angle $\\theta$ on the circle of radius 1.' },
      { tex: t`\cos^2\theta + \sin^2\theta = 1`, say: 'Pythagoras on that circle: the point is always at distance 1.' },
      { tex: t`\theta_{\text{rad}} = \theta_{\text{deg}} \times \frac{\pi}{180}`, say: 'Degrees to radians.' },
    ],
    quiz: [
      { q: 'What is (cos 90°, sin 90°)?', options: ['(0, 1)', '(1, 0)', '(1, 1)', '(0, 0)'], answer: 0, why: 'A quarter turn from east points due north.' },
      { q: 'How do you convert 45° to radians?', options: ['45 × π / 180', '45 × 180 / π', '45 / 360', '45 × 2'], answer: 0, why: 'A full turn of 360° is 2π radians, so 1° is π/180.' },
    ],
  },
  {
    id: 'laml-matrix-maps', module: 'Matrices are machines', title: 'Moving pictures: stretch, shear and turn', minutes: 20, level: 'Beginner',
    why: { title: 'How a game moves a character', story: 'A game character is drawn from hundreds of points. To make it bigger, lean it over or turn it round, the game multiplies every point by one small matrix. Choosing that matrix is easy once you know one secret: its columns are where the two axis arrows land.' },
    objective: 'Build a matrix from where it sends [1; 0] and [0; 1], and use it to move a shape.',
    prose: [
      'The matrix A = [2 0; 0 1] doubles every x-coordinate: it stretches the picture sideways. Try it: A * [1; 0] = [2; 0] and A * [0; 1] = [0; 1].',
      'Notice that A * [1; 0] is the first column of A, and A * [0; 1] is the second. That is true for every matrix: **the columns are where the axis arrows land**. Every other point lands on the same combination of those columns.',
      'So to build a move, decide where [1; 0] and [0; 1] should go, and write those as the columns. A shear that leans everything to the right keeps [1; 0] where it is and sends [0; 1] to [1; 1]. So the shear is [1 1; 0 1].',
      'A turn by angle θ sends [1; 0] to [cos θ; sin θ] and [0; 1] to [−sin θ; cos θ]. So its matrix is [cos θ −sin θ; sin θ cos θ], straight from the previous lesson.',
    ],
    procedure: ['Decide where [1; 0] and [0; 1] should land.', 'Write those landing points as the columns of the matrix.', 'Multiply every point of the picture by the matrix.'],
    prediction: { question: 'Without multiplying, where does [2 1; 0 1] send [0; 1]?', answer: 'To its second column, [1; 1].' },
    demo: {
      code: t`A = [1 1; 0 1];
shape = [0 1 1 0 0; 0 0 1 1 0];
moved = A * shape`,
      draw: t`plot(shape(1,:), shape(2,:))
hold on
plot(moved(1,:), moved(2,:))
title('A shear leans the square to the right')
xlabel('x'); ylabel('y'); legend('Before', 'After'); axis equal; grid on`,
      explain: [{ code: 'A = [1 1; 0 1];', meaning: 'Columns [1; 0] and [1; 1]: x-arrow stays, y-arrow leans right.' }, { code: 'shape = [0 1 1 0 0; 0 0 1 1 0];', meaning: 'Each column is one corner of a square, ending where it started.' }, { code: 'moved = A * shape', meaning: 'One multiplication moves every corner at once.' }],
    },
    challenge: {
      prompt: 'Build turn, the matrix that turns points anticlockwise by angle degrees, and store moved = turn * point.',
      setup: 'angle = 90;\npoint = [2; 1];',
      starter: 't = angle*pi/180;\nturn = [1 0; 0 1];   % replace with the turning matrix\nmoved = turn * point;',
      solution: 't = angle*pi/180;\nturn = [cos(t) -sin(t); sin(t) cos(t)];\nmoved = turn * point;',
      checks: [{ name: 'turn', expected: [[0, -1], [1, 0]], tolerance: 1e-6, message: 'The columns are [cos t; sin t] and [-sin t; cos t].' }, { name: 'moved', expected: [-1, 2], tolerance: 1e-6, message: 'Multiply the turn by the point.' }],
      cases: [{ setup: 'angle = 180;\npoint = [1; 3];', checks: [{ name: 'moved', expected: [-1, -3], tolerance: 1e-6, message: 'A half turn sends every point to its opposite.' }] }],
      hints: ['Where should [1; 0] land after a turn by t?', 'The first column is [cos(t); sin(t)], the second [-sin(t); cos(t)].', 'turn = [cos(t) -sin(t); sin(t) cos(t)];'],
      transfer: 'Find a matrix that mirrors pictures in the vertical axis. Decide where [1; 0] and [0; 1] go first, then check it on the square.',
    },
  },
  {
    id: 'laml-composition', module: 'Matrices are machines', title: 'One move after another', minutes: 15, level: 'Beginner',
    why: { title: 'Socks, then shoes', story: 'A robot arm turns at the shoulder, then at the elbow. A game scales a model, then turns it, then moves it into place. Doing one move after another is multiplying matrices, and the order matters, just as socks then shoes is not the same as shoes then socks.' },
    objective: 'Combine two moves into one matrix in the right order, and show that the order changes the result.',
    prose: [
      'First stretch with S, then turn with R. A point x becomes S * x, and then R * (S * x). The single matrix that does both is R * S. Read it right to left: the matrix nearest the point acts first.',
      'Swap the order and the result usually changes. Stretching sideways and then turning a quarter turn makes a tall picture. Turning first and then stretching sideways makes a wide one.',
      'Multiplying two matrices, R * S, builds the combined move. Each column of R * S is R applied to a column of S: where the axis arrows land after both moves.',
      'Computers combine long chains of moves, such as a game\'s model, camera and screen moves, into one matrix, then apply that single matrix to millions of points.',
    ],
    procedure: ['Write the moves in the order they happen.', 'Multiply them in reverse order: the first move goes on the right.', 'Check with one point, one move at a time.'],
    prediction: { question: 'A pipeline first applies S and then R. Is the combined matrix S*R or R*S?', answer: 'R*S. The matrix on the right acts on the point first.' },
    demo: {
      code: t`S = [2 0; 0 1];
R = [0 -1; 1 0];
stretchThenTurn = R * S
turnThenStretch = S * R`,
      draw: t`shape = [0 1 1 0 0; 0 0 1 1 0];
a = stretchThenTurn * shape;
b = turnThenStretch * shape;
plot(a(1,:), a(2,:))
hold on
plot(b(1,:), b(2,:))
title('The same two moves in a different order give a different result')
xlabel('x'); ylabel('y'); legend('Stretch, then turn', 'Turn, then stretch'); axis equal; grid on`,
      explain: [{ code: 'stretchThenTurn = R * S', meaning: 'S acts first because it is next to the point; then R.' }, { code: 'turnThenStretch = S * R', meaning: 'The other order: a different matrix.' }, { code: 'a = stretchThenTurn * shape;', meaning: 'In the drawing code, both combined moves are applied to the same square.' }],
    },
    challenge: {
      prompt: 'A pipeline first applies A, then B. Store combined, the single matrix for the whole pipeline, and final = combined * x.',
      setup: 'A = [1 2; 0 1];\nB = [0 -1; 1 0];\nx = [1; 1];',
      starter: 'combined = A * B;   % check the order\nfinal = combined * x;',
      solution: 'combined = B * A;\nfinal = combined * x;',
      checks: [{ name: 'combined', expected: [[0, -1], [1, 2]], tolerance: 1e-9, message: 'The first move goes on the right: B * A.' }, { name: 'final', expected: [-1, 3], tolerance: 1e-9, message: 'Apply the combined matrix to x.' }],
      cases: [{ setup: 'A = [1 2; 0 1];\nB = [0 -1; 1 0];\nx = [2; 0];', checks: [{ name: 'final', expected: [0, 2], tolerance: 1e-9, message: 'The same pipeline on another point.' }] }],
      hints: ['Which matrix touches x first?', 'A acts first, so A sits next to x: B * A * x.', 'combined = B * A;'],
      transfer: 'Check that B*(A*x) gives the same answer as (B*A)*x. Then find two matrices whose order does not matter, and explain why.',
    },
  },
  {
    id: 'laml-invertibility', module: 'Matrices are machines', title: 'Undoing a move', minutes: 18, level: 'Beginner',
    why: { title: 'Rewinding, decoding, recovering', story: 'A camera records a blurred picture: can the blur be undone? A message is scrambled with a matrix: can the receiver unscramble it? A sensor mixes two signals: can you separate them? Undoing a matrix means solving equations, and sometimes it is impossible because information was destroyed.' },
    objective: 'Recover an input from an output with a solve, check the answer, and recognise a move that cannot be undone.',
    prose: [
      'The stretch S = [2 0; 0 1] is undone by halving the x-coordinate: [0.5 0; 0 1]. That undo matrix is the **inverse** of S, written S⁻¹. Doing S and then S⁻¹ returns every point to where it started.',
      'Given an output b, the input x satisfies A * x = b. In code, `x = A \\ b` (a backslash) finds it. This is faster and more accurate than calculating the inverse first.',
      'Some moves cannot be undone. The matrix [1 0; 0 0] flattens every point onto the x-axis: [2; 1] and [2; 9] both become [2; 0]. Once flattened, the height is lost for good, so this matrix has no inverse.',
      'Always check a solve by computing A * x − b. If it is zero (or very close), x really does produce b.',
    ],
    procedure: ['Name the move A, the output b and the unknown input x.', 'Solve with x = A \\ b.', 'Check that A * x − b is close to zero, and ask whether A could have flattened anything.'],
    prediction: { question: 'Can C = [1 0; 0 0] tell the inputs [2; 1] and [2; 9] apart?', answer: 'No. Both become [2; 0]. The erased second coordinate means C has no inverse.' },
    demo: {
      code: t`A = [2 1; 1 3];
b = [5; 10];
x = A \ b
check = A * x - b`,
      draw: t`s = linspace(-1, 4, 20);
plot(s, 5 - 2*s)
hold on
plot(s, (10 - s)/3)
title('The input is where both equations hold at once')
xlabel('x(1)'); ylabel('x(2)'); legend('2 x(1) + x(2) = 5', 'x(1) + 3 x(2) = 10'); grid on`,
      explain: [{ code: 'x = A \\ b', meaning: 'Solve A * x = b. The answer is [1; 3].' }, { code: 'check = A * x - b', meaning: 'Zero: the recovered input really produces b.' }, { code: 'b = [5; 10];', meaning: 'Name the output before solving.' }],
    },
    challenge: {
      prompt: 'A scrambler A mixed a secret pair of numbers into scrambled. Recover secret with a solve, and store check = A * secret - scrambled.',
      setup: 'A = [3 1; 2 1];\nscrambled = [11; 8];',
      starter: 'secret = scrambled;   % replace with: A \\ scrambled\ncheck = A * secret - scrambled;',
      solution: 'secret = A \\ scrambled;\ncheck = A * secret - scrambled;',
      checks: [{ name: 'secret', expected: [3, 2], tolerance: 1e-9, message: 'Solve A * secret = scrambled with a backslash.' }, { name: 'check', expected: [0, 0], tolerance: 1e-9, message: 'A correct secret reproduces the scrambled numbers exactly.' }],
      cases: [{ setup: 'A = [3 1; 2 1];\nscrambled = [7; 5];', checks: [{ name: 'secret', expected: [2, 1], tolerance: 1e-9, message: 'A new message, the same scrambler.' }] }],
      hints: ['You know the output and the machine; you want the input.', 'A backslash solves A * x = b.', 'secret = A \\ scrambled;'],
      transfer: 'Try the scrambler [2 4; 1 2]. What goes wrong, and which two different secrets would it scramble into the same output?',
    },
  },
  {
    id: 'laml-determinant-area', module: 'Matrices are machines', title: 'How much area changes: the determinant', minutes: 18, level: 'Beginner',
    why: { title: 'One number for "how much bigger?"', story: 'When a map projection enlarges a country, how much bigger does it look? When a material deforms, how much does it expand? When a matrix flattens space, how can you tell before trying to undo it? One number answers all three: the determinant.' },
    objective: 'Compute a 2 × 2 determinant and read it as an area factor, an orientation flip and a test for flattening.',
    prose: [
      'Every matrix turns the unit square, with sides [1; 0] and [0; 1], into a parallelogram whose sides are the matrix\'s two columns. Every other shape\'s area changes by the same factor.',
      'For A = [a b; c d] that factor is the **determinant**: det A = ad − bc. For the stretch [2 0; 0 3] it is 6, so every area becomes six times larger.',
      'A negative determinant means the picture was also flipped over, like a mirror image. Its size is still the area factor.',
      'A determinant of 0 means the parallelogram is flat: the matrix squashes the plane onto a line, so it cannot be undone. This is the quick test for "does an inverse exist?"',
    ],
    procedure: ['Read the two columns as the new sides of the unit square.', 'Compute det A = ad − bc, or det(A) in code.', 'Size = area factor, negative sign = flipped, zero = flattened (no inverse).'],
    prediction: { question: 'What area factor and orientation does [-2 0; 0 3] produce?', answer: 'The determinant is −6: areas grow by 6 and the picture is flipped.' },
    demo: {
      code: t`A = [2 1; 1 3];
areaFactor = det(A)
flat = det([1 2; 2 4])`,
      draw: t`P = A * [0 1 1 0 0; 0 0 1 1 0];
plot([0 1 1 0 0], [0 0 1 1 0])
hold on
plot(P(1,:), P(2,:))
title('The unit square becomes a parallelogram of area det(A)')
xlabel('x'); ylabel('y'); legend('Unit square', 'After A'); axis equal; grid on`,
      explain: [{ code: 'areaFactor = det(A)', meaning: '2 × 3 − 1 × 1 = 5: every area becomes 5 times larger.' }, { code: 'flat = det([1 2; 2 4])', meaning: 'The second column is twice the first, so the square is squashed flat: 0.' }, { code: 'P = A * [0 1 1 0 0; 0 0 1 1 0];', meaning: 'In the drawing code, the corners of the unit square are moved by A.' }],
    },
    challenge: {
      prompt: 'A map projection is given by M. A country covers area square kilometres on the ground. Store factor = det(M) and newArea = factor * area, its area on the map.',
      setup: 'M = [3 1; 0 2];\narea = 5;',
      starter: 'factor = 1;   % replace 1 with: det(M)\nnewArea = factor * area;',
      solution: 'factor = det(M);\nnewArea = factor * area;',
      checks: [{ name: 'factor', expected: 6, tolerance: 1e-9, message: 'ad − bc = 3 × 2 − 1 × 0.' }, { name: 'newArea', expected: 30, tolerance: 1e-9, message: 'Every area is multiplied by the same factor.' }],
      cases: [{ setup: 'M = [1 2; 1 4];\narea = 5;', checks: [{ name: 'newArea', expected: 10, tolerance: 1e-9, message: 'A different projection, the same country.' }] }],
      hints: ['The area factor is the determinant.', 'det(M) computes ad − bc.', 'factor = det(M); newArea = factor * area;'],
      transfer: 'Find the determinant of a turn by any angle. Explain why turning a picture never changes its area.',
    },
  },
  {
    id: 'laml-two-multiplications', module: 'Matrices are machines', title: 'Two meanings of multiplication', minutes: 15, level: 'Beginner',
    why: { title: 'A classic bug', story: 'A spreadsheet multiplies cell by cell. Matrix multiplication combines rows with columns. Using one when you meant the other is one of the most common mistakes in data and engineering code, and it often runs without any error message.' },
    objective: 'Tell entry-by-entry multiplication apart from matrix multiplication, and choose the right one.',
    prose: [
      '`A .* B` (with a dot) multiplies matching entries: top-left by top-left, and so on. Both tables must have the same shape. This is what a spreadsheet does.',
      '`A * B` (no dot) is matrix multiplication: each entry is a row of A dotted with a column of B. It is the "one move after another" product.',
      'They give different answers. For X = [1 2; 3 4], X .* X starts with 1 × 1 = 1, but X * X starts with 1 × 1 + 2 × 3 = 7.',
      'Powers work the same way: `X.^2` squares every entry, while `X^2` means X * X. When in doubt, ask: am I combining matching entries, or applying a move?',
    ],
    procedure: ['Decide whether entries are combined in matching pairs or as moves.', 'Use .* (and .^) for matching entries; * for moves.', 'Check one entry by hand.'],
    prediction: { question: 'For X = [1 2; 3 4], is the first entry of X.^2 the same as the first entry of X*X?', answer: 'No. X.^2 starts with 1, while X*X starts with 1×1 + 2×3 = 7.' },
    demo: {
      code: t`X = [1 2; 3 4];
entrywise = X .* X
matrixProduct = X * X`,
      draw: t`plot([1 2 3 4], [entrywise(1,1) entrywise(1,2) entrywise(2,1) entrywise(2,2)])
hold on
plot([1 2 3 4], [matrixProduct(1,1) matrixProduct(1,2) matrixProduct(2,1) matrixProduct(2,2)])
title('The same matrix, two different products')
xlabel('Entry, read row by row'); ylabel('Value'); legend('X .* X', 'X * X'); grid on`,
      explain: [{ code: 'entrywise = X .* X', meaning: 'Each entry times itself: [1 4; 9 16].' }, { code: 'matrixProduct = X * X', meaning: 'Rows dotted with columns: [7 10; 15 22].' }, { code: 'X = [1 2; 3 4];', meaning: 'One small matrix used both ways.' }],
    },
    challenge: {
      prompt: 'quantities and prices have one row per shop and one column per item. Store perItem = quantities .* prices (money spent on each item at each shop) and perShop = sum(perItem, 2), the total for each shop.',
      setup: 'quantities = [2 1; 3 0];\nprices = [4 5; 4 6];',
      starter: 'perItem = quantities * prices;   % should this be .* ?\nperShop = sum(perItem, 2);',
      solution: 'perItem = quantities .* prices;\nperShop = sum(perItem, 2);',
      checks: [{ name: 'perItem', expected: [[8, 5], [12, 0]], tolerance: 1e-9, message: 'Each quantity times its own price: use .*.' }, { name: 'perShop', expected: [13, 12], tolerance: 1e-9, message: 'sum(..., 2) adds across each row.' }],
      cases: [{ setup: 'quantities = [1 1; 1 1];\nprices = [1 2; 3 4];', checks: [{ name: 'perShop', expected: [3, 7], tolerance: 1e-9, message: 'Matching entries, then row totals.' }] }],
      hints: ['Each quantity belongs to the price in the same position.', 'Matching positions means .* with a dot.', 'perItem = quantities .* prices;'],
      transfer: 'Find two 2 × 2 matrices for which A .* B and A * B happen to be equal. Is that common?',
    },
  },
  {
    id: 'laml-why-equations', module: 'Solving many equations', title: 'Many conditions at once', minutes: 12, level: 'Beginner',
    why: { title: 'When several things must be true together', story: 'A jeweller needs 30 grams of 60% gold made from two alloys. A chemist balances a reaction so that every atom is accounted for. An engineer checks that the forces at every joint of a bridge cancel out. Each one is a set of conditions that must all hold at once: a system of linear equations.' },
    objective: 'Turn a word problem into a matrix equation A * x = b and solve it with the computer.',
    prose: [
      'Alloy X is 70% gold and alloy Y is 40% gold. You need 30 grams of a 60% mix. Two conditions: the weights add to 30, so x + y = 30. The gold adds to 18 grams (60% of 30), so 0.7x + 0.4y = 18.',
      'Each condition is a **linear equation**: unknowns multiplied by numbers and added. Together they form a **system**. Put the numbers in front of the unknowns into a matrix A, the unknowns into a vector, and the right-hand sides into b. Then the whole system is A * [x; y] = b.',
      'The computer solves it with `A \\ b`. Here x = 20 and y = 10: 20 grams of X and 10 grams of Y.',
      'Each equation is a line on a graph, and the answer is where the lines cross. The next lessons show how the computer finds that point, and what happens when the lines are parallel.',
    ],
    procedure: ['Name the unknowns.', 'Write one equation per condition, with the unknowns in the same order every time.', 'Put the coefficients in A and the right-hand sides in b, then solve x = A \\ b and check A * x − b.'],
    prediction: { question: 'Could you make a 60% mix from alloys of 70% and 80% gold?', answer: 'No. Any mix of 70% and 80% gold contains between 70% and 80%; the system has no answer with non-negative amounts.' },
    demo: {
      code: t`A = [1 1; 0.7 0.4];
b = [30; 18];
amounts = A \ b`,
      draw: t`x = linspace(0, 30, 20);
plot(x, 30 - x)
hold on
plot(x, (18 - 0.7*x)/0.4)
title('The answer is where the two conditions cross')
xlabel('Grams of alloy X'); ylabel('Grams of alloy Y'); legend('Total is 30 g', 'Gold is 18 g'); grid on`,
      explain: [{ code: 'A = [1 1; 0.7 0.4];', meaning: 'Row 1: 1x + 1y (total weight). Row 2: 0.7x + 0.4y (gold).' }, { code: 'b = [30; 18];', meaning: 'The required total and the required gold.' }, { code: 'amounts = A \\ b', meaning: 'Solve both at once: [20; 10].' }],
    },
    challenge: {
      prompt: 'Tickets cost 5 for children and 12 for adults. A group of people paid money in total. Store A, b and tickets = A \\ b, where tickets lists [children; adults].',
      setup: 'people = 7;\nmoney = 56;',
      starter: 'A = [1 1; 5 12];\nb = [0; 0];   % replace with: [people; money]\ntickets = A \\ b;',
      solution: 'A = [1 1; 5 12];\nb = [people; money];\ntickets = A \\ b;',
      checks: [{ name: 'A', expected: [[1, 1], [5, 12]], tolerance: 1e-9, message: 'Row 1 counts people; row 2 counts money.' }, { name: 'tickets', expected: [4, 3], tolerance: 1e-9, message: 'The right-hand side is [people; money].' }],
      cases: [{ setup: 'people = 10;\nmoney = 64;', checks: [{ name: 'tickets', expected: [8, 2], tolerance: 1e-9, message: 'A different group, the same prices.' }] }],
      hints: ['One equation counts people, the other counts money.', 'The right-hand sides are people and money, in that order.', 'b = [people; money];'],
      transfer: 'Add a third ticket type for seniors at 8. Why can two conditions no longer pin down three unknowns? What extra fact would you need?',
    },
    notation: [
      { tex: t`\begin{cases} x + y = 30 \\ 0.7x + 0.4y = 18 \end{cases} \iff \begin{bmatrix} 1 & 1 \\ 0.7 & 0.4 \end{bmatrix}\begin{bmatrix} x \\ y \end{bmatrix} = \begin{bmatrix} 30 \\ 18 \end{bmatrix}`, say: 'A system of equations is one matrix equation.' },
      { tex: t`A\mathbf x = \mathbf b`, say: 'Coefficients $A$, unknowns $\\mathbf x$, right-hand sides $\\mathbf b$.' },
    ],
    quiz: [
      { q: 'Which is a linear equation?', options: ['3x + 2y = 7', 'xy = 7', 'x² + y = 7', '1/x + y = 7'], answer: 0, why: 'Linear means unknowns are only multiplied by numbers and added.' },
      { q: 'In A * x = b, what does each row of A hold?', options: ['The coefficients of one equation', 'The values of one unknown', 'The answers', 'The right-hand sides'], answer: 0, why: 'One row per equation, one column per unknown.' },
    ],
  },
  {
    id: 'laml-elimination', module: 'Solving many equations', title: 'Elimination: solving by hand, then by code', minutes: 20, level: 'Beginner',
    why: { title: 'What A \\ b actually does', story: 'Every solver inside every calculator, spreadsheet and engineering package uses the idea you met at school: subtract one equation from another to remove an unknown. Seeing it done step by step once makes every later method, and every error message, make sense.' },
    objective: 'Solve a small system by eliminating unknowns, read the reduced table, and check the answer.',
    prose: [
      'Take x + y = 5 and 2x − y = 1. Add the two equations: the y terms cancel, leaving 3x = 6, so x = 2. Put that back into the first equation: y = 3.',
      'Elimination does this systematically. Write the system as a table [A b], one row per equation. Subtract multiples of one row from another to clear unknowns, one column at a time.',
      'These **row operations** never change the answer, because each one replaces an equation with an equivalent one. In the playground, watch the lines move while their crossing point stays fixed.',
      'In code, `rref([A b])` carries elimination all the way: each row then reads "unknown = value". A row like [0 0 | 1] would say 0 = 1, which means there is no solution.',
    ],
    procedure: ['Write one row of [A b] per equation.', 'Use row operations to clear each unknown from the other rows.', 'Read the answer from the reduced table, and check A * x − b.'],
    prediction: { question: 'If the second equation becomes 2x + 2y = 11 while the first stays x + y = 5, can the lines meet?', answer: 'No. Doubling the first equation gives 10, not 11. Elimination produces a row that says 0 = 1.' },
    demo: {
      code: t`A = [1 1; 2 -1];
b = [5; 1];
reduced = rref([A b])
x = A \ b`,
      draw: t`s = 0:0.25:5;
plot(s, 5 - s)
hold on
plot(s, 2*s - 1)
title('Two equations meet at x = 2, y = 3')
xlabel('x'); ylabel('y'); legend('x + y = 5', '2x - y = 1'); grid on`,
      explain: [{ code: 'reduced = rref([A b])', meaning: 'Fully eliminated: [1 0 2; 0 1 3] reads x = 2 and y = 3.' }, { code: 'x = A \\ b', meaning: 'The same answer straight from the solver.' }, { code: 'b = [5; 1];', meaning: 'The right-hand sides go in the last column of [A b].' }],
    },
    challenge: {
      prompt: 'Solve A * x = b. Store the reduced table [A b] in reduced, the solution in x, and A * x - b in residual.',
      setup: 'A = [2 1; 1 -1];\nb = [7; 2];',
      starter: 'reduced = rref([A b]);\nx = [0; 0];   % replace with: A \\ b\nresidual = A * x - b;',
      solution: 'reduced = rref([A b]);\nx = A \\ b;\nresidual = A * x - b;',
      checks: [{ name: 'x', expected: [3, 1], tolerance: 1e-6, message: 'Solve with a backslash, or read the last column of reduced.' }, { name: 'reduced', expected: [[1, 0, 3], [0, 1, 1]], tolerance: 1e-6, message: 'Reduce [A b], with b as the last column.' }, { name: 'residual', expected: [0, 0], tolerance: 1e-6, message: 'Check against the original equations.' }],
      cases: [{ setup: 'A = [2 1; 1 -1];\nb = [5; 4];', checks: [{ name: 'x', expected: [3, -1], tolerance: 1e-6, message: 'New right-hand sides, the same equations.' }, { name: 'residual', expected: [0, 0], tolerance: 1e-6, message: 'The new answer must satisfy the new totals.' }] }],
      hints: ['The last column of the reduced table is the answer.', 'Or solve directly with A \\ b.', 'x = A \\ b;'],
      transfer: 'Solve the same system by hand: subtract half of row 1 from row 2, then finish. Compare each step with the row-operations playground.',
    },
  },
  {
    id: 'laml-nullspace', module: 'Solving many equations', title: 'One answer, none, or infinitely many', minutes: 20, level: 'Beginner',
    why: { title: 'When the equations do not pin down an answer', story: 'Two sensors that measure the same thing give no new information. A diet can be met by many different menus. A structure with too few bars wobbles. Knowing whether a system has one answer, none, or infinitely many tells you whether your measurements or your design are complete.' },
    objective: 'Recognise the three possible outcomes of a system, and describe infinitely many answers as one answer plus invisible directions.',
    prose: [
      'Two lines in a plane can cross once (one answer), be parallel (no answer) or lie on top of each other (infinitely many answers). Nothing else can happen, and the same three cases hold for any number of equations.',
      'Infinitely many answers follow a pattern. Take x + 2y = 4. One answer is [4; 0]. Moving in the direction [−2; 1] never changes x + 2y, because −2 + 2 × 1 = 0. So every [4; 0] + t[−2; 1] is also an answer.',
      'A direction that the matrix sends to zero, like [−2; 1] here, is invisible to the equations. All such directions form the **nullspace**. Every answer is one particular answer plus something from the nullspace.',
      'In code, `rref` shows which case you are in. A row [0 … 0 | nonzero] means no answer. An unknown with no leading 1 is free, which means infinitely many answers.',
    ],
    procedure: ['Reduce [A b] and look for a row that says 0 = nonzero (no answer).', 'Otherwise find one particular answer.', 'Find the directions A sends to zero; adding any of them gives another answer.'],
    prediction: { question: 'A direction n satisfies A * n = 0. What happens to A * x if you add 100 n to a valid answer x?', answer: 'Nothing: A * (x + 100 n) = b + 100 × 0 = b.' },
    demo: {
      code: t`A = [1 2];
particular = [4; 0];
direction = [-2; 1];
another = particular + 3*direction
check = A * another`,
      draw: t`s = linspace(-4, 8, 20);
plot(s, (4 - s)/2)
hold on
plot([particular(1) another(1)], [particular(2) another(2)])
title('Every point on the line solves x + 2y = 4')
xlabel('x'); ylabel('y'); legend('All answers', 'Moving along the invisible direction'); grid on`,
      explain: [{ code: 'direction = [-2; 1];', meaning: 'A * direction = −2 + 2 = 0: the equation cannot see this direction.' }, { code: 'another = particular + 3*direction', meaning: 'Move three steps along it: [−2; 3].' }, { code: 'check = A * another', meaning: 'Still 4, so it is another answer.' }],
    },
    challenge: {
      prompt: 'particular solves A * x = b. Store invisible = A * direction (it should be all zeros), second = particular + 2*direction, and checkSecond = A * second.',
      setup: 'A = [1 1 -1; 0 1 2];\nb = [3; 4];\nparticular = [-1; 4; 0];\ndirection = [3; -2; 1];',
      starter: 'invisible = [1; 1];   % replace with: A * direction\nsecond = particular;   % replace with: particular + 2*direction\ncheckSecond = A * second;',
      solution: 'invisible = A * direction;\nsecond = particular + 2*direction;\ncheckSecond = A * second;',
      checks: [{ name: 'invisible', expected: [0, 0], tolerance: 1e-9, message: 'Multiply A by the direction.' }, { name: 'second', expected: [5, 0, 2], tolerance: 1e-9, message: 'Add two copies of the direction to the particular answer.' }, { name: 'checkSecond', expected: [3, 4], tolerance: 1e-9, message: 'The second answer must still give b.' }],
      cases: [{ setup: 'A = [1 1 -1; 0 1 2];\nb = [1; 1];\nparticular = [0; 1; 0];\ndirection = [3; -2; 1];', checks: [{ name: 'second', expected: [6, -3, 2], tolerance: 1e-9, message: 'A different particular answer.' }, { name: 'checkSecond', expected: [1, 1], tolerance: 1e-9, message: 'It still gives the new b.' }] }],
      hints: ['A direction in the nullspace gives zero when multiplied by A.', 'second is the particular answer plus 2 copies of direction.', 'invisible = A * direction; second = particular + 2*direction;'],
      transfer: 'Find a third equation which, added to A, removes the freedom so there is exactly one answer. How can you tell it worked?',
    },
  },
  {
    id: 'laml-truss', module: 'Solving many equations', title: 'Forces in a bridge truss', minutes: 25, level: 'Intermediate',
    why: { title: 'Will the bridge hold?', story: 'A truss bridge is built from straight bars joined at pins. Each bar is either pulled (in tension) or squeezed (in compression), and engineers need every bar\'s force to choose its size. Every joint gives two balance equations, and solving them together is exactly the linear system you have just learned.' },
    objective: 'Write the balance equations of a simple truss as a matrix equation, solve for every bar force, and read tension and compression.',
    prose: [
      'Our truss is a triangle. Joints A and B sit on the ground 4 m apart, and joint C is on top, 2 m up. A load P = 10 kN hangs from C. A is pinned, so it can push in any direction. B sits on a roller, so it can only push up.',
      'The unknowns are the force in each bar (AB, AC, BC) and the pushes from the supports (Ax and Ay at A, By at B). That is 6 unknowns. A positive bar force means tension.',
      'Each joint stays still, so the forces on it add to zero sideways and up-down: 2 equations per joint, 6 in all. A bar pulls each of its joints towards its other end. The sloping bars point along [0.707; 0.707] or [−0.707; 0.707], and the code calls 0.707 = √2/2 by the name c.',
      'Put the 6 equations into the rows of M and solve forces = M \\ b. Bar AB is in tension with 5 kN, both sloping bars are squeezed with 7.07 kN, and each support pushes up with 5 kN: half the load each, just as the symmetry suggests.',
    ],
    procedure: ['List the unknowns: bar forces and support reactions.', 'At each joint, write "forces add to zero" sideways and up-down.', 'Put the equations into a matrix and solve; positive bar forces are tension, negative ones are compression.'],
    prediction: { question: 'Will the bottom bar AB be pulled or squeezed?', answer: 'Pulled (in tension). The sloping bars push A and B apart, and AB holds them together.' },
    demo: {
      code: t`c = sqrt(2)/2;
P = 10;
${TRUSS_M}
b = [0; 0; 0; 0; 0; P];
forces = M \ b`,
      draw: t`plot([0 4 2 0], [0 0 2 0])
title('Triangle truss: AB in tension, AC and BC in compression')
xlabel('x (m)'); ylabel('y (m)'); axis equal; grid on`,
      explain: [{ code: 'c = sqrt(2)/2;', meaning: 'The sloping bars are at 45°, so each direction has entries of size √2/2.' }, { code: 'M = [1 c 0 1 0 0; ...];', meaning: 'Six rows, one balance equation each: joint A sideways and up, then B, then C. Columns are AB, AC, BC, Ax, Ay, By.' }, { code: 'forces = M \\ b', meaning: 'Solve all six at once: [5; −7.07; −7.07; 0; 5; 5].' }],
    },
    challenge: {
      prompt: 'The same truss carries a heavier load P. Solve for forces, then store tensionAB = forces(1) and squeezeAC = -forces(2) (the size of the compression in AC).',
      setup: `c = sqrt(2)/2;\nP = 24;\n${TRUSS_M}\nb = [0; 0; 0; 0; 0; P];`,
      starter: 'forces = M \\ b;\ntensionAB = 0;   % replace 0 with: forces(1)\nsqueezeAC = 0;   % replace 0 with: -forces(2)',
      solution: 'forces = M \\ b;\ntensionAB = forces(1);\nsqueezeAC = -forces(2);',
      checks: [{ name: 'tensionAB', expected: 12, tolerance: 1e-6, message: 'The first unknown is the force in AB.' }, { name: 'squeezeAC', expected: 24 / Math.SQRT2, tolerance: 1e-6, message: 'AC is in compression, so its force is negative; store its size.' }],
      cases: [{ setup: `c = sqrt(2)/2;\nP = 6;\n${TRUSS_M}\nb = [0; 0; 0; 0; 0; P];`, checks: [{ name: 'tensionAB', expected: 3, tolerance: 1e-6, message: 'Forces grow in proportion to the load.' }, { name: 'squeezeAC', expected: 6 / Math.SQRT2, tolerance: 1e-6, message: 'Half of P divided by c.' }] }],
      hints: ['The order of the unknowns is AB, AC, BC, Ax, Ay, By.', 'forces(1) is AB; forces(2) is AC.', 'tensionAB = forces(1); squeezeAC = -forces(2);'],
      transfer: 'In the playground, drag the top joint higher. What happens to the bar forces, and why do engineers prefer taller trusses for long spans?',
    },
    notation: [
      { tex: t`\sum \mathbf F = \mathbf 0 \ \text{ at every joint}`, say: 'Each joint is still, so the forces on it cancel, sideways and up-down.' },
      { tex: t`M\mathbf f = \mathbf b, \qquad \mathbf f = (F_{AB}, F_{AC}, F_{BC}, A_x, A_y, B_y)`, say: 'Six balance equations, six unknown forces.' },
    ],
    quiz: [
      { q: 'A truss has 3 joints in a plane. How many balance equations does it give?', options: ['6', '3', '9', '2'], answer: 0, why: 'Two per joint: sideways and up-down.' },
      { q: 'A bar force comes out negative. What does it mean?', options: ['The bar is in compression (squeezed)', 'The bar is in tension (pulled)', 'The bar carries no force', 'The calculation failed'], answer: 0, why: 'We counted tension as positive.' },
    ],
  },
  {
    id: 'laml-circuit', module: 'Solving many equations', title: 'Currents in a circuit', minutes: 20, level: 'Intermediate',
    why: { title: 'How every circuit is simulated', story: 'Before a circuit board is manufactured, software predicts the voltage at every junction. It uses Kirchhoff\'s current law: at each junction, the current flowing in equals the current flowing out. One equation per junction, all solved together.' },
    objective: 'Write node equations for a small resistor circuit, solve them as G * V = I, and check the currents balance.',
    prose: [
      'A 12 V battery feeds node a through a 1 Ω resistor. Node a connects to ground through 1 Ω and to node b through 1 Ω. Node b connects to ground through 1 Ω. The unknowns are the voltages Va and Vb; ground is 0 V.',
      'Ohm\'s law gives each current: current = voltage difference ÷ resistance. At node a, the current arriving from the battery, (12 − Va)/1, equals the current leaving: Va/1 to ground plus (Va − Vb)/1 to b. Tidied up: 3Va − Vb = 12.',
      'At node b, the current arriving, (Va − Vb)/1, equals the current leaving to ground, Vb/1. Tidied up: −Va + 2Vb = 0.',
      'Two equations, two unknowns: G * [Va; Vb] = [12; 0] with G = [3 −1; −1 2]. Solving gives Va = 4.8 V and Vb = 2.4 V. Real simulators build the same kind of matrix with thousands of nodes.',
    ],
    procedure: ['Choose the unknown node voltages; ground is 0 V.', 'At each node, write current in = current out, using current = voltage difference ÷ resistance.', 'Collect the equations into G * V = I and solve.'],
    prediction: { question: 'If the battery doubles to 24 V, what happens to Va and Vb?', answer: 'They double too. The equations are linear, so doubling the right-hand side doubles the answer.' },
    demo: {
      code: t`G = [3 -1; -1 2];
I = [12; 0];
V = G \ I
currentAtoB = V(1) - V(2)`,
      draw: t`plot([0 1 2], [12 V(1) V(2)])
title('The voltage drops from the battery to node a to node b')
xlabel('Battery, node a, node b'); ylabel('Volts'); grid on`,
      explain: [{ code: 'G = [3 -1; -1 2];', meaning: 'Row 1 is node a\'s balance, row 2 is node b\'s.' }, { code: 'V = G \\ I', meaning: 'Both node voltages at once: [4.8; 2.4].' }, { code: 'currentAtoB = V(1) - V(2)', meaning: 'Ohm\'s law with a 1 Ω resistor: 2.4 A flows from a to b.' }],
    },
    challenge: {
      prompt: 'Now every resistor is R ohms and the battery is Vs volts. Build G = (1/R) * [3 -1; -1 2] and I = [Vs/R; 0], then store V = G \\ I.',
      setup: 'R = 2;\nVs = 9;',
      starter: 'G = (1/R) * [3 -1; -1 2];\nI = [0; 0];   % replace with: [Vs/R; 0]\nV = G \\ I;',
      solution: 'G = (1/R) * [3 -1; -1 2];\nI = [Vs/R; 0];\nV = G \\ I;',
      checks: [{ name: 'V', expected: [3.6, 1.8], tolerance: 1e-6, message: 'The battery current source is Vs/R.' }],
      cases: [{ setup: 'R = 5;\nVs = 20;', checks: [{ name: 'V', expected: [8, 4], tolerance: 1e-6, message: 'Different resistors and battery, the same circuit shape.' }] }],
      hints: ['Only node a is connected to the battery.', 'The battery\'s push into node a is Vs/R.', 'I = [Vs/R; 0];'],
      transfer: 'Change R and keep Vs fixed. The node voltages do not change. Explain why, using the fact that every resistor has the same value.',
    },
    notation: [
      { tex: t`\sum I_{\text{in}} = \sum I_{\text{out}}`, say: 'Kirchhoff\'s current law at every junction.' },
      { tex: t`G\,\mathbf V = \mathbf I`, say: 'Conductances (1 ÷ resistance) times node voltages equal the injected currents.' },
    ],
    quiz: [
      { q: 'Kirchhoff\'s current law says what about a junction?', options: ['Current in equals current out', 'Voltage is the same everywhere', 'Resistance adds up', 'Current is always zero'], answer: 0, why: 'Charge does not pile up at a junction.' },
      { q: 'A 2 Ω resistor has 6 V across it. What current flows?', options: ['3 A', '12 A', '8 A', '0.33 A'], answer: 0, why: 'Current = voltage ÷ resistance.' },
    ],
  },
]
