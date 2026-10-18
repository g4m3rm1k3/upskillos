// Stage 1, "See it": vectors and the dot product for someone with basic algebra and no programming.
// Each lesson opens with why the idea matters (`why`), shows only 1–4 lines of code (the drawing code
// lives in `demo.draw`, shown collapsed and appended when the example runs), and asks for one small change.
// Rewritten lessons keep their original ids, so saved progress still counts.
const t = String.raw

export const stage1 = [
  {
    id: 'laml-why-linear-algebra', module: 'Vectors: arrows and lists', title: 'What is linear algebra for?', minutes: 10, level: 'Beginner',
    why: { title: 'The maths behind games, bridges, photos and search', story: 'When a game turns a character, the computer recalculates every point of it. When engineers check a bridge, they solve hundreds of force equations at once. When your phone shrinks a photo, it keeps only the photo\'s most important patterns. When a search engine ranks web pages, it looks for a pattern that repeats forever. All four are linear algebra.' },
    objective: 'Meet the two ideas linear algebra is built from, and run your first program that uses them.',
    prose: [
      'Linear algebra works with two things. A **vector** is a list of numbers, such as the position [3; 1]: 3 steps right and 1 step up. A **matrix** is a table of numbers that changes vectors: it can turn them, stretch them or mix them.',
      'In the example below, a matrix turns the point [3; 1] a quarter turn around the centre. You do not need to know how yet. Press **Run example** and look at the picture.',
      'Every lesson follows the same path. First, why the idea matters. Then a small example to run and change, a picture to drag, practice that checks your answers, and questions that come back later to see whether it stuck.',
      'You only need basic algebra: putting numbers into a formula and solving simple equations. Code arrives one line at a time. Calculus appears later, and only where it is needed.',
    ],
    procedure: ['Read why the idea matters before the details.', 'Run the example, change one number, and predict what will happen before running it again.', 'Use the playground and the practice to check that you really understand.'],
    prediction: { question: 'The matrix turns a point a quarter turn. If you apply it four times in a row, where does the point end up?', answer: 'Back where it started: four quarter turns make one full turn.' },
    demo: {
      code: t`point = [3; 1];
turned = [0 -1; 1 0] * point;
disp(turned)`,
      draw: t`plot([0 point(1)], [0 point(2)])
hold on
plot([0 turned(1)], [0 turned(2)])
title('A matrix turns the point a quarter turn')
xlabel('Right'); ylabel('Up')
legend('Before', 'After'); axis equal; grid on`,
      explain: [{ code: 'point = [3; 1];', meaning: 'A vector: 3 steps right and 1 step up. The semicolon inside the brackets stacks the numbers in a column.' }, { code: 'turned = [0 -1; 1 0] * point;', meaning: 'A matrix times the vector. This matrix turns any point a quarter turn anticlockwise.' }, { code: 'disp(turned)', meaning: 'Show the result, [-1; 3]: the point is now 1 step left and 3 steps up.' }],
    },
    challenge: {
      prompt: 'A game character stands at point. Store turned = R * point, using the quarter-turn matrix R that is already supplied.',
      setup: 'R = [0 -1; 1 0];\npoint = [2; 0];',
      starter: 'turned = point;   % replace point with: R * point',
      solution: 'turned = R * point;',
      checks: [{ name: 'turned', expected: [0, 2], tolerance: 1e-9, message: 'Multiply the matrix R by the point: R * point.' }],
      cases: [{ setup: 'R = [0 -1; 1 0];\npoint = [1; 1];', checks: [{ name: 'turned', expected: [-1, 1], tolerance: 1e-9, message: 'The same turn applied to a different point.' }] }],
      hints: ['The matrix goes first, then the vector.', 'The star * multiplies the matrix by the vector.', 'turned = R * point;'],
      transfer: 'Replace R with [0 1; -1 0] and run again. Which way does the point turn now? Then apply R twice in a row and describe what happens.',
    },
    notation: [
      { tex: t`\mathbf v = \begin{bmatrix} 3 \\ 1 \end{bmatrix}`, say: 'A vector: a column of numbers, which can also be drawn as an arrow from the origin.' },
      { tex: t`R\,\mathbf v`, say: 'A matrix $R$ acting on the vector $\\mathbf v$. The result is a new vector.' },
    ],
    quiz: [
      { q: 'What is a vector?', options: ['An ordered list of numbers, which can be drawn as an arrow', 'A table of numbers', 'A single number', 'A kind of graph'], answer: 0, why: 'A table of numbers is a matrix. A vector is a single list.' },
      { q: 'What does multiplying a vector by a matrix do?', options: ['Changes it: turns, stretches or mixes it into a new vector', 'Sorts its entries', 'Adds 1 to every entry', 'Nothing; a matrix only stores numbers'], answer: 0, why: 'A matrix is a machine that turns one vector into another.' },
    ],
  },
  {
    id: 'laml-first-run', module: 'Vectors: arrows and lists', title: 'Your first line of code', minutes: 10, level: 'Beginner',
    why: { title: 'A formula is a tiny program', story: 'A taxi fare, a phone bill and an exam grade are all formulas: numbers go in, a number comes out. Writing a formula as code means a computer can apply it to a thousand customers as easily as to one, and draw the result.' },
    objective: 'Store numbers under names and calculate a result from them.',
    prose: [
      'A taxi charges 4 dollars to start and 2 dollars per kilometre. A 3 kilometre trip costs 4 + 2 × 3 = 10 dollars.',
      'In code we give each number a name. `base = 4;` stores 4 under the name base. Here the equals sign means "store", not "is equal to". The semicolon at the end keeps the line quiet.',
      'The star `*` multiplies. Multiplication happens before addition, so `base + rate * 3` means 4 + (2 × 3), just as on paper.',
      'Leave the semicolon off and the computer shows the result. That is how the example prints the fare. The picture is drawn by extra drawing code, which you can open but do not need yet.',
    ],
    procedure: ['Give each input number a name.', 'Write the formula using those names.', 'Run it, and check the answer against a quick calculation by hand.'],
    prediction: { question: 'If the starting charge rises from 4 to 7, how much more does every trip cost?', answer: '3 dollars more, whatever the distance. The price per kilometre has not changed.' },
    demo: {
      code: t`base = 4;
rate = 2;
fare = base + rate * 3`,
      draw: t`distance = [0 1 2 3 4 5];
plot(distance, base + rate * distance)
title('Taxi fare for each distance')
xlabel('Distance (km)'); ylabel('Fare (dollars)'); grid on`,
      explain: [{ code: 'base = 4;', meaning: 'Store the starting charge under the name base. The semicolon keeps the line quiet.' }, { code: 'rate = 2;', meaning: 'Store the price per kilometre.' }, { code: 'fare = base + rate * 3', meaning: 'Multiply first, then add: 4 + 6 = 10. No semicolon, so the answer is shown.' }],
    },
    challenge: {
      prompt: 'A different taxi charges base dollars to start and rate dollars per kilometre. Store the fare for a trip of distance kilometres in fare.',
      setup: 'base = 5;\nrate = 3;\ndistance = 4;',
      starter: 'fare = base + 0;   % replace 0 with: rate * distance',
      solution: 'fare = base + rate * distance;',
      checks: [{ name: 'fare', expected: 17, tolerance: 1e-9, message: 'Add the starting charge to rate times distance.' }],
      cases: [{ setup: 'base = 2;\nrate = 1;\ndistance = 10;', checks: [{ name: 'fare', expected: 12, tolerance: 1e-9, message: 'Use the names, not the numbers, so the code works for any trip.' }] }],
      hints: ['The starting charge is paid once, whatever the distance.', 'The distance part is rate * distance.', 'fare = base + rate * distance;'],
      transfer: 'A second taxi charges more to start but less per kilometre. Choose its numbers, then find a distance where both taxis cost the same.',
    },
    notation: [
      { tex: t`\text{fare} = 4 + 2d`, say: 'A fixed charge plus a rate times the distance $d$.' },
      { tex: t`y = b + m\,x`, say: 'The same pattern in general: a starting value $b$ and a slope $m$. It comes back later as line fitting.' },
    ],
    quiz: [
      { q: 'In OpenMAT, what does `base = 4;` do?', options: ['Stores 4 under the name base, without printing it', 'Checks whether base equals 4', 'Prints 4', 'Draws a picture'], answer: 0, why: 'A single equals sign stores a value. The semicolon hides the printout.' },
      { q: 'What is `2 + 3 * 4`?', options: ['14', '20', '24', '9'], answer: 0, why: 'Multiplication first: 3 × 4 = 12, then 2 + 12 = 14.' },
    ],
  },
  {
    id: 'laml-arrays', module: 'Vectors: arrows and lists', title: 'What is a vector?', minutes: 10, level: 'Beginner',
    why: { title: 'Numbers that belong together', story: 'A position needs two numbers: how far east and how far north. A recipe needs one number per ingredient. A weather report needs temperature, wind and rain. Keeping such numbers together, in a fixed order, is exactly what a vector does.' },
    objective: 'Write a vector, read its entries by position, and see it as an arrow.',
    prose: [
      'A drone flies 3 metres east and 1 metre north. We can write the whole move as one object: the vector [3; 1]. The first number always means east, the second always means north.',
      'Order matters. [1; 3] is a different move: 1 east and 3 north. A vector is an **ordered** list.',
      'In code, square brackets make a vector, and semicolons stack the numbers in a column: `move = [3; 1];`. To read one entry, put its position in round brackets: `move(1)` is 3 and `move(2)` is 1. Positions start at 1.',
      'The same vector can be drawn as an arrow from where the drone started to where it ended. The list and the arrow are two views of one thing.',
    ],
    procedure: ['Decide what each position means, such as first = east and second = north.', 'Write the numbers in that order inside square brackets.', 'Read an entry by its position in round brackets, counting from 1.'],
    prediction: { question: 'The drone\'s move is [3; 1]. What is move(2), and what does it mean?', answer: 'It is 1: the drone moves 1 metre north.' },
    demo: {
      code: t`move = [3; 1];
east = move(1)
north = move(2)`,
      draw: t`plot([0 move(1)], [0 move(2)])
title('The vector [3; 1] drawn as an arrow')
xlabel('East (m)'); ylabel('North (m)'); axis equal; grid on`,
      explain: [{ code: 'move = [3; 1];', meaning: 'A vector with two entries, stacked in a column.' }, { code: 'east = move(1)', meaning: 'Read the first entry: 3.' }, { code: 'north = move(2)', meaning: 'Read the second entry: 1.' }],
    },
    challenge: {
      prompt: 'recipe lists grams of flour, sugar and butter, in that order. Store sugar (the second entry) and butter (the third entry).',
      setup: 'recipe = [200; 50; 100];',
      starter: 'sugar = 0;   % replace 0 with: recipe(2)\nbutter = 0;',
      solution: 'sugar = recipe(2);\nbutter = recipe(3);',
      checks: [{ name: 'sugar', expected: 50, tolerance: 1e-9, message: 'Sugar is in position 2.' }, { name: 'butter', expected: 100, tolerance: 1e-9, message: 'Butter is in position 3.' }],
      cases: [{ setup: 'recipe = [300; 80; 120];', checks: [{ name: 'sugar', expected: 80, tolerance: 1e-9, message: 'Read the entry by its position, not its value.' }, { name: 'butter', expected: 120, tolerance: 1e-9, message: 'Read the entry by its position, not its value.' }] }],
      hints: ['Positions start at 1: flour is recipe(1).', 'Sugar is the second entry.', 'sugar = recipe(2); butter = recipe(3);'],
      transfer: 'Write a vector of seven daily temperatures, Monday first. Which position is Wednesday? Find out what happens when you ask for position 8.',
    },
    notation: [
      { tex: t`\mathbf v = \begin{bmatrix} v_1 \\ v_2 \end{bmatrix}`, say: 'The entries are numbered: $v_1$ is the first and $v_2$ the second.' },
      { tex: t`\mathbf v \in \mathbb R^2`, say: 'Read it as "$\\mathbf v$ is a list of two numbers". $\\mathbb R^3$ would mean three numbers.' },
    ],
    quiz: [
      { q: 'Are [3; 1] and [1; 3] the same vector?', options: ['No: the order is part of the vector', 'Yes: they contain the same numbers', 'Only when drawn as arrows', 'Only in code'], answer: 0, why: 'A vector is an ordered list, so [3; 1] and [1; 3] are different moves.' },
      { q: 'With recipe = [200; 50; 100], what is recipe(1)?', options: ['200', '50', '100', '0'], answer: 0, why: 'Positions start at 1, so recipe(1) is the first entry.' },
    ],
  },
  {
    id: 'laml-add-scale', module: 'Vectors: arrows and lists', title: 'Adding and scaling vectors', minutes: 12, level: 'Beginner',
    why: { title: 'Two pushes on one box', story: 'Two people push a heavy box, one towards the east and one towards the north. Which way does it slide? Add the two pushes. A drone that flies the same leg twice travels double the distance. Adding and scaling are the only two moves linear algebra ever makes; everything else is built from them.' },
    objective: 'Add two vectors entry by entry, scale a vector by a number, and see both as arrows.',
    prose: [
      'A drone flies a = [3; 1], then b = [1; 2]. Altogether it moved 3 + 1 = 4 east and 1 + 2 = 3 north. So a + b = [4; 3]: add the matching entries.',
      'As arrows, start the second arrow where the first one ends. The total is the arrow from the very start to the very end. This picture is called **tip to tail**.',
      'Flying a twice gives 2a = [6; 2]: multiply every entry by 2. Multiplying a vector by a number is called **scaling**. A negative number turns the arrow round: −a = [−3; −1] flies straight back.',
      'In code, `a + b` adds and `2 * a` scales, entry by entry. Two vectors can be added only if they have the same number of entries.',
    ],
    procedure: ['Check that the two vectors have the same number of entries.', 'Add matching entries for a sum; multiply every entry for a scaling.', 'Draw the arrows tip to tail to check the picture.'],
    prediction: { question: 'What is a − a, and what does it mean for the drone?', answer: '[0; 0]: fly out and straight back again, ending where you started.' },
    demo: {
      code: t`a = [3; 1];
b = [1; 2];
total = a + b
double = 2 * a`,
      draw: t`plot([0 a(1)], [0 a(2)])
hold on
plot([a(1) total(1)], [a(2) total(2)])
plot([0 total(1)], [0 total(2)])
title('Tip to tail: a, then b, gives a + b')
xlabel('East'); ylabel('North')
legend('a', 'b, starting where a ends', 'a + b'); axis equal; grid on`,
      explain: [{ code: 'total = a + b', meaning: 'Add matching entries: [3 + 1; 1 + 2] = [4; 3].' }, { code: 'double = 2 * a', meaning: 'Scale: multiply every entry by 2, giving [6; 2].' }, { code: 'plot([a(1) total(1)], [a(2) total(2)])', meaning: 'In the drawing code, b is drawn starting from the end of a: tip to tail.' }],
    },
    challenge: {
      prompt: 'Two forces push a box: push1 and push2. Store the combined force in total, and store doubled, which is push1 made twice as strong.',
      setup: 'push1 = [4; -1];\npush2 = [2; 3];',
      starter: 'total = push1;   % replace with: push1 + push2\ndoubled = push1;   % replace with: 2 * push1',
      solution: 'total = push1 + push2;\ndoubled = 2 * push1;',
      checks: [{ name: 'total', expected: [6, 2], tolerance: 1e-9, message: 'Add the matching entries of the two pushes.' }, { name: 'doubled', expected: [8, -2], tolerance: 1e-9, message: 'Multiply every entry of push1 by 2.' }],
      cases: [{ setup: 'push1 = [1; 1];\npush2 = [-3; 2];', checks: [{ name: 'total', expected: [-2, 3], tolerance: 1e-9, message: 'Use the names so the code works for any pushes.' }, { name: 'doubled', expected: [2, 2], tolerance: 1e-9, message: 'Scale push1, not the total.' }] }],
      hints: ['Forces on the same object add like moves.', 'push1 + push2 adds entry by entry; 2 * push1 scales.', 'total = push1 + push2; doubled = 2 * push1;'],
      transfer: 'Find a third push that makes the box stay still when added to push1 and push2. What must the total of all three be?',
    },
    notation: [
      { tex: t`\mathbf a + \mathbf b = \begin{bmatrix} a_1 + b_1 \\ a_2 + b_2 \end{bmatrix}`, say: 'Add matching entries.' },
      { tex: t`c\,\mathbf a = \begin{bmatrix} c\,a_1 \\ c\,a_2 \end{bmatrix}`, say: 'Scaling multiplies every entry by the number $c$.' },
    ],
    quiz: [
      { q: 'What is [3; 1] + [1; 2]?', options: ['[4; 3]', '[3; 2]', '[4; 1]', '[5; 1]'], answer: 0, why: '3 + 1 = 4 and 1 + 2 = 3.' },
      { q: 'What does multiplying a vector by −1 do to its arrow?', options: ['Turns it round to point the opposite way', 'Makes it shorter', 'Turns it a quarter turn', 'Nothing'], answer: 0, why: 'Every entry changes sign, so the arrow points straight back.' },
    ],
  },
  {
    id: 'laml-weighted-combinations', module: 'Vectors: arrows and lists', title: 'Mixing: combinations of vectors', minutes: 12, level: 'Beginner',
    why: { title: 'Every colour from three lights', story: 'Your screen makes every colour you see from just red, green and blue light, mixed in different amounts. A chef makes many dishes from the same few ingredients. Mixing a few basic vectors in different amounts is called a combination, and it is the single most important idea in linear algebra.' },
    objective: 'Combine vectors with weights, and find the weights that make a target.',
    prose: [
      'A screen pixel mixes red light r = [1; 0; 0], green g = [0; 1; 0] and blue b = [0; 0; 1]. Half red plus full blue gives 0.5·r + 1·b = [0.5; 0; 1], a purple.',
      'Scale each vector by its own number, called a **weight**, then add them up. The result is a **combination** of the vectors. Weights can be any numbers, including 0 and negative ones.',
      'Some targets can be reached and some cannot. With only red and blue light, no weights will ever make green. Everything that can be reached is called the **span** of the vectors.',
      'In code a combination is one line: `colour = 0.5*r + 1*b`. Change one weight and only that ingredient changes.',
    ],
    procedure: ['Write down each basic vector.', 'Choose a weight for each one.', 'Scale each vector by its weight and add; check the result entry by entry.'],
    prediction: { question: 'Using only r and g, can you make the colour [0; 0; 1]?', answer: 'No. Every mix of red and green has 0 in the blue position.' },
    demo: {
      code: t`r = [1; 0; 0];
b = [0; 0; 1];
colour = 0.5*r + 1*b`,
      draw: t`plot([1 2 3], colour)
title('How much red, green and blue is in the mix')
xlabel('Channel: 1 red, 2 green, 3 blue'); ylabel('Amount'); grid on`,
      explain: [{ code: 'r = [1; 0; 0];', meaning: 'Pure red light: all of channel 1, none of the others.' }, { code: 'b = [0; 0; 1];', meaning: 'Pure blue light.' }, { code: 'colour = 0.5*r + 1*b', meaning: 'Weight 0.5 on red and 1 on blue, added: [0.5; 0; 1].' }],
    },
    challenge: {
      prompt: 'Mix the colour target from red, green and blue light. Store the three weights wr, wg and wb, and store mix = wr*r + wg*g + wb*b.',
      setup: 'r = [1; 0; 0];\ng = [0; 1; 0];\nb = [0; 0; 1];\ntarget = [0.2; 0.8; 0.4];',
      starter: 'wr = 0;\nwg = 0;\nwb = 0;\nmix = wr*r + wg*g + wb*b;',
      solution: 'wr = target(1);\nwg = target(2);\nwb = target(3);\nmix = wr*r + wg*g + wb*b;',
      checks: [{ name: 'wr', expected: 0.2, tolerance: 1e-9, message: 'Red only affects channel 1.' }, { name: 'wg', expected: 0.8, tolerance: 1e-9, message: 'Green only affects channel 2.' }, { name: 'wb', expected: 0.4, tolerance: 1e-9, message: 'Blue only affects channel 3.' }, { name: 'mix', expected: [0.2, 0.8, 0.4], tolerance: 1e-9, message: 'The mix should equal the target.' }],
      cases: [{ setup: 'r = [1; 0; 0];\ng = [0; 1; 0];\nb = [0; 0; 1];\ntarget = [1; 0.5; 0];', checks: [{ name: 'mix', expected: [1, 0.5, 0], tolerance: 1e-9, message: 'Read the weights from the target so the code works for any colour.' }] }],
      hints: ['Red appears only in position 1, so its weight must be the target\'s first entry.', 'The weights are target(1), target(2) and target(3).', 'wr = target(1); wg = target(2); wb = target(3); then mix = wr*r + wg*g + wb*b;'],
      transfer: 'Replace blue with cyan, [0; 1; 1]. Can you still make every colour? Try to make [0; 0; 1] and explain what goes wrong.',
    },
    notation: [
      { tex: t`\mathbf c = w_1\mathbf r + w_2\mathbf g + w_3\mathbf b`, say: 'A combination: each vector times its weight, all added.' },
      { tex: t`\operatorname{span}(\mathbf r, \mathbf b)`, say: 'Everything that can be made from $\\mathbf r$ and $\\mathbf b$ with some weights.' },
    ],
    quiz: [
      { q: 'Weights 2 and 3 on [1; 0] and [0; 1] give which vector?', options: ['[2; 3]', '[3; 2]', '[5; 0]', '[6; 0]'], answer: 0, why: '2·[1; 0] + 3·[0; 1] = [2; 3].' },
      { q: 'With only red and blue light, can you make green?', options: ['No: green is outside their span', 'Yes, with negative weights', 'Yes, with very large weights', 'Only on some screens'], answer: 0, why: 'Every mix of red and blue has 0 green.' },
    ],
  },
  {
    id: 'laml-length-distance-cosine', module: 'Vectors: arrows and lists', title: 'How long is it? Length and distance', minutes: 12, level: 'Beginner',
    why: { title: 'How far, as the crow flies', story: 'A ship sails 30 km east and 40 km north. How far is it from port? A delivery app needs the straight-line distance between two addresses. A robot checks how far its hand is from a part. Each of them uses the length of a vector: Pythagoras, written for lists.' },
    objective: 'Find the length of a vector with Pythagoras, and the distance between two points.',
    prose: [
      'The ship\'s move is [30; 40]. Its straight-line distance from port is √(30² + 40²) = √2500 = 50 km. That is Pythagoras: the two entries are the short sides of a right-angled triangle.',
      'This number is the **length** of the vector, written ‖v‖. With three entries, add a third square: ‖[2; 3; 6]‖ = √(4 + 9 + 36) = 7.',
      'The **distance** between two points is the length of the move from one to the other. Subtract first, then take the length. From [1; 1] to [4; 5] the move is [3; 4], so the distance is 5.',
      'In code, `norm(v)` gives the length of v. The distance between p and q is `norm(q - p)`.',
    ],
    procedure: ['If you need the distance between two points, subtract them first.', 'Square every entry and add the squares.', 'Take the square root, or use norm in code.'],
    prediction: { question: 'Is the distance from p to q the same as the distance from q to p?', answer: 'Yes. q − p and p − q point in opposite directions but have the same length.' },
    demo: {
      code: t`ship = [30; 40];
fromPort = norm(ship)
apart = norm([4; 5] - [1; 1])`,
      draw: t`plot([0 ship(1) ship(1) 0], [0 0 ship(2) 0])
title('Pythagoras: the long side is the length of the vector')
xlabel('East (km)'); ylabel('North (km)'); axis equal; grid on`,
      explain: [{ code: 'ship = [30; 40];', meaning: 'The ship\'s move: 30 km east and 40 km north.' }, { code: 'fromPort = norm(ship)', meaning: 'Its length: the square root of 30² + 40², which is 50.' }, { code: 'apart = norm([4; 5] - [1; 1])', meaning: 'Subtract to get the move [3; 4] between the points, then take its length: 5.' }],
    },
    challenge: {
      prompt: 'A robot\'s hand is at hand and the part it must pick up is at target. Store gap, the distance between them, and reach, the length of target (its distance from the robot\'s base at the origin).',
      setup: 'hand = [1; 2; 2];\ntarget = [4; 6; 2];',
      starter: 'gap = 0;   % replace 0 with: norm(target - hand)\nreach = 0;',
      solution: 'gap = norm(target - hand);\nreach = norm(target);',
      checks: [{ name: 'gap', expected: 5, tolerance: 1e-9, message: 'Subtract the two points, then take the length.' }, { name: 'reach', expected: Math.sqrt(56), tolerance: 1e-9, message: 'The distance from the origin is just the length of target.' }],
      cases: [{ setup: 'hand = [0; 0; 0];\ntarget = [2; 3; 6];', checks: [{ name: 'gap', expected: 7, tolerance: 1e-9, message: 'Use the names so the code works for any positions.' }, { name: 'reach', expected: 7, tolerance: 1e-9, message: 'The length of [2; 3; 6] is 7.' }] }],
      hints: ['The move from hand to target is target - hand.', 'norm(...) gives the length of a vector.', 'gap = norm(target - hand); reach = norm(target);'],
      transfer: 'The robot moves its hand in two legs: first to a waypoint, then to the target. Compare the total length of the two legs with the straight-line gap. When are they equal?',
    },
    notation: [
      { tex: t`\|\mathbf v\| = \sqrt{v_1^2 + v_2^2}`, say: 'The length of a vector: Pythagoras on its entries.' },
      { tex: t`d(\mathbf p, \mathbf q) = \|\mathbf q - \mathbf p\|`, say: 'The distance between two points is the length of the move between them.' },
    ],
    quiz: [
      { q: 'What is the length of [6; 8]?', options: ['10', '14', '48', '100'], answer: 0, why: '√(36 + 64) = √100 = 10.' },
      { q: 'How do you find the distance between the points p and q?', options: ['The length of q − p', 'The length of p plus the length of q', 'The length of p + q', 'p times q'], answer: 0, why: 'The move from p to q is q − p, and its length is the distance.' },
    ],
  },
  {
    id: 'laml-shopping-bill', module: 'The dot product', title: 'A shopping bill is a dot product', minutes: 12, level: 'Beginner',
    why: { title: 'One number from two lists', story: 'At the checkout, the shop multiplies how many of each item you bought by its price and adds everything up. A teacher combines marks with weights to make a final grade. A spam filter gives each word a score and adds them up. Each one pairs two lists and adds the products: a dot product.' },
    objective: 'Compute a dot product by multiplying matching entries and adding.',
    prose: [
      'You buy 2 loaves, 1 cheese and 3 apples, priced 1.50, 4 and 0.50 dollars. The bill is 2×1.50 + 1×4 + 3×0.50 = 3 + 4 + 1.50 = 8.50.',
      'Put the amounts in one vector and the prices in another, in the same order. Multiply matching entries and add the results. That single number is the **dot product** of the two vectors, written a · b.',
      'Both lists must use the same order and have the same length. Swapping two prices gives a wrong bill, even though every number is right.',
      'In code, `dot(amounts, prices)` does all of it at once.',
    ],
    procedure: ['Line the two lists up in the same order.', 'Multiply each matching pair.', 'Add the products: that sum is the dot product.'],
    prediction: { question: 'You double every amount. What happens to the bill?', answer: 'It doubles. Every product doubles, so their sum doubles.' },
    demo: {
      code: t`amounts = [2; 1; 3];
prices = [1.5; 4; 0.5];
bill = dot(amounts, prices)`,
      draw: t`plot([1 2 3], amounts .* prices)
title('What each item adds to the bill')
xlabel('Item: 1 bread, 2 cheese, 3 apples'); ylabel('Dollars'); grid on`,
      explain: [{ code: 'amounts = [2; 1; 3];', meaning: 'How many of each item, in a fixed order: bread, cheese, apples.' }, { code: 'prices = [1.5; 4; 0.5];', meaning: 'The prices, in the same order.' }, { code: 'bill = dot(amounts, prices)', meaning: 'Multiply matching entries and add: 8.5.' }],
    },
    challenge: {
      prompt: 'A teacher combines three marks using weights. Store the final grade in final = dot(marks, weights).',
      setup: 'marks = [70; 85; 60];\nweights = [0.5; 0.3; 0.2];',
      starter: 'final = 0;   % replace 0 with: dot(marks, weights)',
      solution: 'final = dot(marks, weights);',
      checks: [{ name: 'final', expected: 72.5, tolerance: 1e-9, message: 'Multiply each mark by its weight and add: 35 + 25.5 + 12.' }],
      cases: [{ setup: 'marks = [100; 50; 80];\nweights = [0.5; 0.3; 0.2];', checks: [{ name: 'final', expected: 81, tolerance: 1e-9, message: 'Use the names so the code works for any marks.' }] }],
      hints: ['Each mark counts with its own weight.', 'Multiply matching entries and add, or use dot.', 'final = dot(marks, weights);'],
      transfer: 'The weights add up to 1. Explain why that makes the final grade an average. What happens to the grade if every weight is doubled?',
    },
    notation: [
      { tex: t`\mathbf a\cdot\mathbf b = a_1b_1 + a_2b_2 + a_3b_3`, say: 'Multiply matching entries, then add.' },
    ],
    quiz: [
      { q: 'What is [1; 2] · [3; 4]?', options: ['11', '10', '[3; 8]', '21'], answer: 0, why: '1×3 + 2×4 = 3 + 8 = 11.' },
      { q: 'What kind of thing is a dot product?', options: ['A single number', 'A vector', 'A matrix', 'An arrow'], answer: 0, why: 'The products are added, leaving one number.' },
    ],
  },
  {
    id: 'laml-work-force', module: 'The dot product', title: 'Pushing at an angle: work and right angles', minutes: 15, level: 'Beginner',
    why: { title: 'Pulling a sledge, carrying a bag', story: 'Pull a sledge with a rope that slopes upwards and only part of your pull moves it forward. Carry a heavy bag across a level room and, in physics terms, gravity does no work on it at all. Engineers and physicists measure "how much of a force acts along a movement" with the dot product.' },
    objective: 'Use the dot product to measure work, and recognise vectors at right angles by a dot product of zero.',
    prose: [
      'You pull a sledge with a force of [30; 40] newtons: 30 forwards and 40 upwards. It slides [10; 0] metres forwards. Only the forward part of your pull helps: 30 × 10 = 300 joules of work.',
      'That is exactly the dot product: [30; 40] · [10; 0] = 30×10 + 40×0 = 300. In physics, **work** is the dot product of the force and the movement.',
      'Gravity pulls the sledge straight down with [0; −200]. The movement is level, so the work is 0×10 + (−200)×0 = 0. Gravity does no work on a level slide.',
      'A dot product of zero means the two vectors are at **right angles** (perpendicular): neither has any part along the other. This is one of the most useful tests in linear algebra. One multiply-and-add tells you whether two directions meet at 90°.',
    ],
    procedure: ['Write the force and the movement as vectors using the same directions.', 'Take their dot product to get the work.', 'A result of zero means the force is at right angles to the movement and does no work.'],
    prediction: { question: 'You pull the sledge straight up while someone else drags it forwards. How much work does your pull do?', answer: 'None. Straight up is at right angles to forwards, so the dot product is 0.' },
    demo: {
      code: t`pull = [30; 40];
move = [10; 0];
work = dot(pull, move)
gravityWork = dot([0; -200], move)`,
      draw: t`plot([0 pull(1)], [0 pull(2)])
hold on
plot([0 move(1)], [0 move(2)])
title('Only the part of the pull along the movement does work')
xlabel('Forwards'); ylabel('Up')
legend('Pull (N)', 'Movement (m)'); axis equal; grid on`,
      explain: [{ code: 'work = dot(pull, move)', meaning: '30×10 + 40×0 = 300 joules: only the forward part counts.' }, { code: 'gravityWork = dot([0; -200], move)', meaning: 'Gravity points straight down, at right angles to the movement, so its work is 0.' }, { code: 'move = [10; 0];', meaning: '10 metres forwards and nothing up or down.' }],
    },
    challenge: {
      prompt: 'A crate is pushed with force and moves by move. Store work = dot(force, move). Then store check = dot(force, side); a check of 0 means force is at right angles to side.',
      setup: 'force = [3; 4];\nmove = [5; 0];\nside = [4; -3];',
      starter: 'work = 0;   % replace 0 with: dot(force, move)\ncheck = 1;   % replace 1 with: dot(force, side)',
      solution: 'work = dot(force, move);\ncheck = dot(force, side);',
      checks: [{ name: 'work', expected: 15, tolerance: 1e-9, message: 'Dot the force with the movement.' }, { name: 'check', expected: 0, tolerance: 1e-9, message: 'Dot the force with side.' }],
      cases: [{ setup: 'force = [2; 1];\nmove = [1; 1];\nside = [1; -2];', checks: [{ name: 'work', expected: 3, tolerance: 1e-9, message: 'Use the names so the code works for any force.' }, { name: 'check', expected: 0, tolerance: 1e-9, message: 'This side is also at right angles to the force.' }] }],
      hints: ['Work is the dot product of force and movement.', 'dot(force, move) multiplies matching entries and adds.', 'work = dot(force, move); check = dot(force, side);'],
      transfer: 'For any force [a; b], the vector [−b; a] is at right angles to it. Check this with the dot product and explain why it is always zero.',
    },
    notation: [
      { tex: t`W = \mathbf F\cdot\mathbf d`, say: 'Work is the dot product of force and movement.' },
      { tex: t`\mathbf a\cdot\mathbf b = 0 \iff \mathbf a \perp \mathbf b`, say: 'A zero dot product means the vectors are at right angles. The symbol $\\perp$ means "perpendicular".' },
    ],
    quiz: [
      { q: 'Which pair of vectors is at right angles?', options: ['[1; 2] and [2; −1]', '[1; 2] and [2; 1]', '[1; 0] and [1; 1]', '[3; 4] and [3; 4]'], answer: 0, why: '1×2 + 2×(−1) = 0.' },
      { q: 'A force does no work on a moving object. What can you conclude?', options: ['The force is at right angles to the movement', 'The force is zero', 'The object is not moving', 'The force is very large'], answer: 0, why: 'Zero work with a nonzero force and movement means a zero dot product: right angles.' },
    ],
  },
  {
    id: 'laml-dot-product', module: 'The dot product', title: 'Angles: how alike are two directions?', minutes: 15, level: 'Beginner',
    why: { title: 'Which songs are alike?', story: 'A music app describes each song with numbers: how fast it is, how loud, how much guitar. Two songs whose lists point the same way sound alike, even if one is louder overall. Navigation uses the same idea to measure the angle between two headings.' },
    objective: 'Measure the angle between two vectors from their dot product and lengths.',
    prose: [
      'The dot product knows about angles. For vectors a and b with angle θ (the Greek letter theta) between them, a · b = ‖a‖ ‖b‖ cos θ. Cosine is the "cos" button on a calculator: cos 0° = 1, cos 90° = 0 and cos 180° = −1.',
      'Rearranged, cos θ = (a · b) / (‖a‖ ‖b‖). This number, the **cosine similarity**, is 1 when the vectors point the same way, 0 when they are at right angles and −1 when they point opposite ways.',
      'The songs [120; 8] and [60; 4] (tempo, loudness) have similarity 1. One is a slower, quieter version of the other, in exactly the same proportions. Lengths do not matter here; only direction does.',
      'In code, `acos(c) * 180 / pi` turns a cosine back into an angle in degrees.',
    ],
    procedure: ['Compute the dot product of the two vectors.', 'Divide by both lengths to get the cosine.', 'Read it: 1 means same direction, 0 right angles, −1 opposite. Use acos to get the angle.'],
    prediction: { question: 'What is the cosine similarity of a vector with itself? With its negative?', answer: '1 with itself (same direction) and −1 with its negative (opposite direction).' },
    demo: {
      code: t`a = [3; 4];
b = [4; 3];
similarity = dot(a, b) / (norm(a) * norm(b))
angle = acos(similarity) * 180 / pi`,
      draw: t`plot([0 a(1)], [0 a(2)])
hold on
plot([0 b(1)], [0 b(2)])
title('Two directions about 16 degrees apart')
xlabel('x'); ylabel('y'); legend('a', 'b'); axis equal; grid on`,
      explain: [{ code: 'similarity = dot(a, b) / (norm(a) * norm(b))', meaning: '24 / (5 × 5) = 0.96: the directions are close.' }, { code: 'angle = acos(similarity) * 180 / pi', meaning: 'acos undoes cos, giving radians; multiplying by 180/pi converts to degrees: about 16.3°.' }, { code: 'a = [3; 4];', meaning: 'A direction with length 5.' }],
    },
    challenge: {
      prompt: 'Two songs are described by s1 and s2. Store their cosine similarity in similarity, and the angle between them, in degrees, in angle.',
      setup: 's1 = [1; 2; 2];\ns2 = [2; 1; 2];',
      starter: 'similarity = 0;\nangle = 0;',
      solution: 'similarity = dot(s1, s2) / (norm(s1) * norm(s2));\nangle = acos(similarity) * 180 / pi;',
      checks: [{ name: 'similarity', expected: 8 / 9, tolerance: 1e-9, message: 'Divide the dot product by both lengths.' }, { name: 'angle', expected: Math.acos(8 / 9) * 180 / Math.PI, tolerance: 1e-6, message: 'Use acos, then convert radians to degrees.' }],
      cases: [{ setup: 's1 = [1; 0; 0];\ns2 = [0; 1; 0];', checks: [{ name: 'similarity', expected: 0, tolerance: 1e-9, message: 'These directions are at right angles.' }, { name: 'angle', expected: 90, tolerance: 1e-6, message: 'Right angles are 90 degrees.' }] }],
      hints: ['Cosine similarity is the dot product divided by both lengths.', 'Then angle = acos(similarity) * 180 / pi.', 'similarity = dot(s1, s2) / (norm(s1) * norm(s2)); angle = acos(similarity) * 180 / pi;'],
      transfer: 'Make a third song that is louder than s1 but has the same similarity to s2. What do you have to change, and what must stay in proportion?',
    },
    notation: [
      { tex: t`\mathbf a\cdot\mathbf b = \|\mathbf a\|\,\|\mathbf b\|\cos\theta`, say: 'The dot product combines both lengths with the angle between the vectors.' },
      { tex: t`\cos\theta = \frac{\mathbf a\cdot\mathbf b}{\|\mathbf a\|\,\|\mathbf b\|}`, say: 'Cosine similarity: 1 same direction, 0 right angles, −1 opposite.' },
    ],
    quiz: [
      { q: 'What is the cosine similarity of [3; 4] and [6; 8]?', options: ['1', '0', '5', '0.5'], answer: 0, why: 'They point the same way; only the length differs.' },
      { q: 'Two vectors have cosine similarity −1. How are they arranged?', options: ['They point in opposite directions', 'They are at right angles', 'They are identical', 'One is zero'], answer: 0, why: 'cos 180° = −1.' },
    ],
  },
  {
    id: 'laml-projection', module: 'The dot product', title: 'Shadows: projection', minutes: 15, level: 'Beginner',
    why: { title: 'The shadow of a stick', story: 'At noon a leaning stick casts a shadow straight down onto the ground. The shadow is the part of the stick that lies along the ground. GPS, line fitting and image compression all use this one idea: find the closest point that lies along an allowed direction.' },
    objective: 'Find the shadow (projection) of a vector on a direction, and check that the leftover part is at right angles.',
    prose: [
      'A stick leans as the vector x = [3; 2]. The ground runs along u = [1; 0]. With the sun straight overhead the shadow is [3; 0]: keep the part along the ground and drop the part pointing up.',
      'For a sloping direction u we need a rule. The shadow is some number c times u. The leftover part x − c·u must stand at right angles to u, like the stick standing on its shadow. So its dot product with u is zero.',
      'Solving u · (x − c·u) = 0 for c gives c = (u · x) / (u · u). The shadow c·u is called the **projection** of x onto u. The leftover x − c·u is called the **residual**.',
      'In code: `c = dot(u, x) / dot(u, u);` then `shadow = c * u`. The Reason & prove tab walks through why the residual is always at right angles.',
    ],
    derive: {
      claim: t`Find the number $c$ that makes $c\,\mathbf u$ the shadow of $\mathbf x$ on the direction $\mathbf u$.`,
      given: t`The leftover $\mathbf x - c\,\mathbf u$ stands at right angles to $\mathbf u$.`,
      steps: [
        { ask: 'Write "at right angles" as an equation.', options: [t`$\mathbf u\cdot(\mathbf x - c\,\mathbf u) = 0$`, t`$\mathbf x - c\,\mathbf u = \mathbf 0$`, t`$\mathbf u\cdot\mathbf x = c$`], answer: 0, why: 'Two arrows are at right angles exactly when their dot product is zero.' },
        { ask: 'Open the bracket.', options: [t`$\mathbf u\cdot\mathbf x - c\,(\mathbf u\cdot\mathbf u) = 0$`, t`$\mathbf u\cdot\mathbf x - c = 0$`, t`$(\mathbf u\cdot\mathbf x)\,c = 0$`], answer: 0, why: t`The dot product shares out over a difference, and the number $c$ comes outside.` },
        { ask: t`Solve for $c$.`, options: [t`$c = \dfrac{\mathbf u\cdot\mathbf x}{\mathbf u\cdot\mathbf u}$`, t`$c = \dfrac{\mathbf u\cdot\mathbf u}{\mathbf u\cdot\mathbf x}$`, t`$c = \mathbf u\cdot\mathbf x$`], answer: 0, why: t`Move the second term across and divide by $\mathbf u\cdot\mathbf u$, which is not zero because $\mathbf u$ is not the zero arrow.` },
      ],
      conclusion: t`The shadow is $\dfrac{\mathbf u\cdot\mathbf x}{\mathbf u\cdot\mathbf u}\,\mathbf u$. One idea, "the leftover is at right angles", gave the whole formula; least squares later uses exactly the same idea.`,
    },
    procedure: ['Find c = (u · x) / (u · u).', 'The projection is c times u.', 'Check: the residual x − c·u has a dot product of zero with u.'],
    prediction: { question: 'The ground direction changes from [1; 0] to [2; 0]. Does the shadow move?', answer: 'No. Both describe the same line. The number c halves while u doubles, so the shadow stays [3; 0].' },
    demo: {
      code: t`x = [3; 2];
u = [2; 1];
c = dot(u, x) / dot(u, u);
shadow = c * u`,
      draw: t`plot([0 x(1)], [0 x(2)])
hold on
plot([0 shadow(1)], [0 shadow(2)])
plot([shadow(1) x(1)], [shadow(2) x(2)])
title('The shadow of x on the direction u')
xlabel('x'); ylabel('y'); legend('Stick x', 'Shadow', 'Leftover'); axis equal; grid on`,
      explain: [{ code: 'c = dot(u, x) / dot(u, u);', meaning: '8 / 5 = 1.6: how many copies of u make the shadow.' }, { code: 'shadow = c * u', meaning: 'The projection: 1.6 × [2; 1] = [3.2; 1.6].' }, { code: 'plot([shadow(1) x(1)], [shadow(2) x(2)])', meaning: 'In the drawing code, the leftover part joins the shadow to the tip of the stick at a right angle.' }],
    },
    challenge: {
      prompt: 'Project x onto the line through u. Store c, then projection, residual = x - projection, and orthogonality = dot(u, residual), which should be 0.',
      setup: 'x = [4; 2];\nu = [1; 1];',
      starter: 'c = 0;   % replace 0 with: dot(u, x) / dot(u, u)\nprojection = c * u;\nresidual = x - projection;\northogonality = dot(u, residual);',
      solution: 'c = dot(u, x) / dot(u, u);\nprojection = c * u;\nresidual = x - projection;\northogonality = dot(u, residual);',
      checks: [{ name: 'projection', expected: [3, 3], tolerance: 1e-6, message: 'c = dot(u,x)/dot(u,u) = 3, then multiply by u.' }, { name: 'residual', expected: [1, -1], tolerance: 1e-6, message: 'Subtract the projection from x.' }, { name: 'orthogonality', expected: 0, tolerance: 1e-6, message: 'The leftover part must be at right angles to u.' }],
      cases: [{ setup: 'x = [1; 3];\nu = [1; 0];', checks: [{ name: 'projection', expected: [1, 0], tolerance: 1e-6, message: 'With flat ground, the shadow keeps only the first entry.' }, { name: 'residual', expected: [0, 3], tolerance: 1e-6, message: 'The leftover is the upright part.' }] }],
      hints: ['Only the first line needs changing.', 'c is the dot product of u and x divided by the dot product of u with itself.', 'c = dot(u, x) / dot(u, u);'],
      transfer: 'Project the same x onto [-3; -3]. Check that the projection and residual do not change, and explain why c does.',
    },
    notation: [
      { tex: t`\operatorname{proj}_{\mathbf u}\mathbf x = \frac{\mathbf u\cdot\mathbf x}{\mathbf u\cdot\mathbf u}\,\mathbf u`, say: 'The projection of $\\mathbf x$ onto the line of $\\mathbf u$: a number times $\\mathbf u$.' },
      { tex: t`\mathbf r = \mathbf x - \operatorname{proj}_{\mathbf u}\mathbf x, \qquad \mathbf u\cdot\mathbf r = 0`, say: 'The residual is the part the line cannot explain, and it is at right angles to the line.' },
    ],
    quiz: [
      { q: 'You project $\\mathbf x$ onto $\\mathbf u$, then replace $\\mathbf u$ by $5\\mathbf u$. What happens to the projected point?', options: ['It stays the same', 'It becomes five times longer', 'It becomes five times shorter', 'It flips direction'], answer: 0, why: 'Both directions span the same line. The number c shrinks by 5 and the direction grows by 5.' },
      { q: 'What is $\\mathbf u\\cdot\\mathbf r$ for the residual $\\mathbf r$ of a projection onto $\\mathbf u$?', options: ['$0$', '$\\|\\mathbf r\\|$', '$\\mathbf u\\cdot\\mathbf x$', 'It depends on $\\mathbf x$'], answer: 0, why: 'The closest point leaves a leftover part at right angles to the line.' },
    ],
    proof: {
      claim: t`With $c = \dfrac{\mathbf u\cdot\mathbf x}{\mathbf u\cdot\mathbf u}$, the residual $\mathbf x - c\,\mathbf u$ is at right angles to $\mathbf u$.`,
      given: t`$\mathbf u \neq \mathbf 0$, so $\mathbf u\cdot\mathbf u > 0$.`,
      steps: [
        { ask: 'What must we show?', options: [t`$\mathbf u\cdot(\mathbf x - c\,\mathbf u) = 0$`, t`$\|\mathbf x - c\,\mathbf u\| = 0$`, '$c = 1$', t`$\mathbf x\cdot\mathbf x = \mathbf u\cdot\mathbf u$`], answer: 0, why: 'Right angles means the dot product is zero.', hint: 'Right angles are tested with a dot product.' },
        { ask: 'Expand the dot product.', options: [t`$\mathbf u\cdot\mathbf x - c\,(\mathbf u\cdot\mathbf u)$`, t`$\mathbf u\cdot\mathbf x - c$`, t`$(\mathbf u\cdot\mathbf x)\,(1 - c)$`, t`$\mathbf u\cdot\mathbf x + c\,(\mathbf u\cdot\mathbf u)$`], answer: 0, why: 'The dot product shares out over subtraction, and the number $c$ comes outside.', hint: t`Share the dot product out, and keep $\mathbf u\cdot\mathbf u$ together.` },
        { ask: 'Substitute the value of $c$.', options: [t`$\mathbf u\cdot\mathbf x - \dfrac{\mathbf u\cdot\mathbf x}{\mathbf u\cdot\mathbf u}(\mathbf u\cdot\mathbf u) = 0$`, t`$\mathbf u\cdot\mathbf x - (\mathbf u\cdot\mathbf x)^2 = 0$`, t`$\mathbf u\cdot\mathbf x\,(1 - \mathbf u\cdot\mathbf u) = 0$`], answer: 0, why: t`$\mathbf u\cdot\mathbf u$ cancels because it is not zero, leaving $\mathbf u\cdot\mathbf x - \mathbf u\cdot\mathbf x = 0$.` },
      ],
      conclusion: t`So the residual is at right angles to $\mathbf u$ for every $\mathbf x$. Dividing by $\mathbf u\cdot\mathbf u$ is the only place we used $\mathbf u \neq \mathbf 0$.`,
    },
  },
]
