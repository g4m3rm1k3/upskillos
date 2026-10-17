// OpenMAT lessons start with runnable arithmetic and build toward geometric reasoning.
// Each challenge is checked against values produced by the shared OpenMAT engine.
export const foundations = [
  {
    id: 'laml-first-run', module: 'First steps', title: 'Your first calculation and figure', minutes: 25, level: 'Beginner',
    objective: 'Edit a small OpenMAT program, calculate a prediction, and connect the number to its labelled figure.',
    prose: [
      'A delivery service charges 4 dollars before a journey and 2 dollars per kilometre. A 3 kilometre journey costs 4 + 2 × 3 = 10 dollars. We will calculate that price and draw how it changes with distance. You need no MATLAB or programming experience.',
      'A variable is a name attached to a value. In `base = 4;`, the equals sign stores 4 under the name base. It does not ask whether two things are equal. The final semicolon hides automatic printing; `disp(base)` deliberately displays the value. A line beginning with `%` is a comment for the reader.',
      'The star `*` means multiply. OpenMAT evaluates multiplication before addition, so `base + rate * distance` means base plus the product. Parentheses choose a different order when necessary. Read code from top to bottom: a name must be assigned before another line uses it.',
      'A plot connects horizontal input values to vertical output values. `plot([0 1 2 3], [4 6 8 10])` pairs the first distance with the first price, and so on. Square brackets collect several values. `xlabel`, `ylabel`, and `title` add text that explains units and meaning. A good data science prediction has both a number and an interpretation.',
      'Change the rate, rerun, and watch the line become steeper. Change only the base and the line moves upward without changing its steepness. This two-number model will return as linear regression. A negative distance is arithmetically valid but would violate this journey model; computation and a sensible real-world interpretation are separate checks.',
    ],
    procedure: ['Read the given inputs and say what each name measures.', 'Store the calculation in a new variable, using * for multiplication.', 'Use disp to inspect the answer and label the figure before interpreting it.'],
    prediction: { question: 'If the base charge increases from 4 to 7 while the rate stays 2, what happens to the price at every distance?', answer: 'Every price increases by 3 dollars. The slope stays 2 dollars per kilometre.' },
    demo: {
      code: `base = 4;
rate = 2;
distance = [0 1 2 3];
price = base + rate * distance;
disp('Prices in dollars:'); disp(price)
plot(distance, price)
title('Delivery price model'); xlabel('Distance (km)'); ylabel('Price (dollars)'); grid on`,
      explain: [{ code: 'base = 4;', meaning: 'Store the fixed charge; a semicolon suppresses automatic output.' }, { code: 'price = base + rate * distance;', meaning: 'Calculate a price for each distance using the same fixed charge and rate.' }, { code: "xlabel('Distance (km)')", meaning: 'Name the horizontal quantity and its unit so the line can be interpreted.' }],
    },
    challenge: {
      prompt: 'A different service charges 5 dollars plus 3 dollars per kilometre. Calculate fare for a 4 kilometre journey and store it in fare.',
      setup: 'base = 5; rate = 3; distance = 4;', starter: 'fare = 0;\ndisp(fare)', solution: 'fare = base + rate * distance;\ndisp(fare)',
      checks: [{ name: 'fare', expected: 17, tolerance: 1e-6, message: 'Include both the fixed charge and the rate multiplied by distance.' }],
      hints: ['The fixed charge is paid once, regardless of distance.', 'Multiply rate by distance before adding base.', 'Use fare = base + rate * distance; and display fare.'],
      transfer: 'Make a second service with a larger base charge and smaller rate. Find a distance where it becomes cheaper, and explain the crossing of the two price lines.',
    },
  },
  {
    id: 'laml-arrays', module: 'First steps', title: 'Vectors are ordered measurements', minutes: 25, level: 'Beginner',
    objective: 'Write row and column vector notation and use ordered entries as a small data record.',
    prose: [
      'A sensor records temperatures of 18, 21, and 24 degrees on three successive days. The order matters: swapping the first and last numbers changes the story. A vector is an ordered collection of numbers. It can describe measurements over time or several features of one object.',
      'Write a row vector as `temperature = [18 21 24];`. Spaces separate entries across a row. Write a column vector as `temperature = [18; 21; 24];`. Semicolons inside brackets move to a new row. The semicolon after the closing bracket has a different job: it hides automatic output.',
      'In MATLAB notation, the transpose operator, written as an apostrophe after a variable, swaps rows and columns: `column = temperature\'`. For real numbers this preserves values. OpenMAT stores both row and column vectors as flat arrays: size and Workspace report a single row for either notation. This engine therefore cannot demonstrate their distinct MATLAB shapes. It does transpose genuine multirow, multicolumn matrices.',
      'Use `mean(temperature)` to calculate the average: add the three values and divide by three. Use `sum(temperature)` for the total. These summaries lose order: [18 21 24] and [24 21 18] have the same mean but opposite trends. A plot preserves the pairing between day and reading.',
      'In machine learning a feature vector might store [height, mass, age]. Those positions require names and units. The average of height and age would have no sensible shared unit. Start with a single measured quantity across observations, and combine different features only when their meanings are clear.',
    ],
    procedure: ['Choose an order and name what each position represents.', 'Use spaces for a row or semicolons inside brackets for a column.', 'Calculate a summary and compare it with the ordered figure.'],
    prediction: { question: 'If [18 21 24] is reversed, do its mean and its rising trend both stay the same?', answer: 'Its mean remains 21, but the trend becomes falling. The mean does not retain order.' },
    demo: {
      code: `day = [1 2 3];
temperature = [18 21 24];
column = temperature';
average = mean(temperature);
disp('Average temperature:'); disp(average)
disp('Column version:'); disp(column)
plot(day, temperature)
title('Three ordered readings'); xlabel('Day'); ylabel('Temperature (degrees)'); grid on`,
      explain: [{ code: 'temperature = [18 21 24];', meaning: 'The three entries retain their day-by-day order.' }, { code: "column = temperature';", meaning: 'This is column-vector notation in MATLAB. OpenMAT stores either vector orientation as the same flat array.' }, { code: 'average = mean(temperature);', meaning: 'Summarize the readings by their arithmetic average.' }],
    },
    challenge: {
      prompt: 'Store total as the sum of the four daily orders, and average as their mean. Keep the supplied observations unchanged.',
      setup: 'orders = [3 5 7 9];', starter: 'total = 0; average = 0;\ndisp(total); disp(average)', solution: 'total = sum(orders); average = mean(orders);\ndisp(total); disp(average)',
      checks: [{ name: 'total', expected: 24, tolerance: 1e-6, message: 'The total must include all four order counts.' }, { name: 'average', expected: 6, tolerance: 1e-6, message: 'The average is the total divided by the number of days.' }],
      hints: ['Sum and mean are two different summaries of the same observations.', 'OpenMAT provides sum(vector) and mean(vector).', 'Assign total = sum(orders); and average = mean(orders);.'],
      transfer: 'Create two differently ordered vectors with the same mean. Plot both against day and describe the information the mean hides.',
    },
  },
  {
    id: 'laml-indexing', module: 'First steps', title: 'Read a dataset by row and column', minutes: 25, level: 'Beginner',
    objective: 'Select entries, rows, and columns using one-based indexing and describe the shape of a dataset.',
    prose: [
      'Three homes have [rooms, area] measurements [2, 50], [3, 75], and [4, 100]. Put each home on one row: `homes = [2 50; 3 75; 4 100];`. A matrix is a rectangular array. Here its shape is 3 rows by 2 columns: three observations and two features.',
      'OpenMAT uses one-based indexing. `homes(2, 1)` reads row 2, column 1, giving 3 rooms. Parentheses select entries; square brackets create arrays. Row and column positions are separate coordinates, so reversing them generally selects a different measurement.',
      'A colon on its own means every position along that axis. `homes(:, 2)` reads every row of column 2, yielding all floor areas. `homes(2, :)` reads both features of the second home. A range such as `1:2` means positions 1 through 2, including both ends.',
      'The function `size(homes, 1)` counts rows and `size(homes, 2)` counts columns. Checking shape is the first debugging step before any machine learning calculation. A length-three target vector can correspond to these three homes; a length-two target vector cannot, even if both arrays contain valid numbers.',
      'The figure plots the first column on the horizontal axis and the second on the vertical axis. Rows preserve which area belongs to which room count. Sorting or slicing each column independently would break that relationship. Position zero and positions beyond the dataset are invalid; confirm both the axis and the range before indexing.',
    ],
    procedure: ['Write the dataset shape as observations by features.', 'Name the row and column needed before writing the index.', 'Use : for a complete axis and confirm the selected values with disp.'],
    prediction: { question: 'What does homes(3, 2) mean, and why is it different from homes(2, 3)?', answer: 'It selects the third home’s area, 100. homes(2, 3) asks for a third feature, which this two-column dataset does not contain.' },
    demo: {
      code: `homes = [2 50; 3 75; 4 100];
rooms = homes(:, 1);
area = homes(:, 2);
middle_area = homes(2, 2);
observations = size(homes, 1);
features = size(homes, 2);
disp('Rows, columns, middle area:'); disp(observations); disp(features); disp(middle_area)
scatter(rooms, area)
title('Rows keep features paired'); xlabel('Rooms'); ylabel('Area (square metres)'); grid on`,
      explain: [{ code: 'homes = [2 50; 3 75; 4 100];', meaning: 'Each semicolon inside brackets starts the next observation.' }, { code: 'area = homes(:, 2);', meaning: 'Select all observations from the area feature.' }, { code: 'middle_area = homes(2, 2);', meaning: 'Read one entry using row first and column second.' }],
    },
    challenge: {
      prompt: 'Read the third observation’s target into last_target, the second observation’s first feature into middle_feature, and the row count into observations.',
      setup: 'data = [1 10; 2 20; 3 30];', starter: 'last_target = 0; middle_feature = 0; observations = 0;', solution: 'last_target = data(3, 2); middle_feature = data(2, 1); observations = size(data, 1);',
      checks: [{ name: 'last_target', expected: 30, tolerance: 1e-6, message: 'Select row 3 and column 2 for the final target.' }, { name: 'middle_feature', expected: 2, tolerance: 1e-6, message: 'Select row 2 and column 1 for the middle observation’s feature.' }, { name: 'observations', expected: 3, tolerance: 1e-6, message: 'Observations are rows; count them with size(data, 1).' }],
      hints: ['Parentheses select an existing array entry.', 'The order is data(row, column), starting from 1.', 'Use data(3, 2), data(2, 1), and size(data, 1) for the three requested outputs.'],
      transfer: 'Add a third feature to each observation. Predict the new shape, extract that whole column, and explain why the number of observations stays fixed.',
    },
  },
  {
    id: 'laml-two-multiplications', module: 'First steps', title: 'Two meanings of multiplication', minutes: 25, level: 'Beginner',
    objective: 'Distinguish elementwise transformations from matrix products and compute one prediction per dataset row.',
    prose: [
      'Two products have [quantity, delivery-distance] records [1, 2] and [3, 4]. A price rule weights quantity by 2 and distance by 1. The predicted prices are 1×2 + 2×1 = 4 and 3×2 + 4×1 = 10. A matrix product performs these weighted sums for the complete batch.',
      'Write `X = [1 2; 3 4];` and a column of weights `w = [2; 1];`. The expression `X * w` combines each row with the weights. Mathematically the output is 2 by 1: one result for each observation. OpenMAT stores this vector as a flat array and reports 1 by 2 in Workspace. Count the matching features: two feature columns need two weights.',
      'Elementwise multiplication `.*` instead multiplies corresponding entries. Elementwise power `.^` applies a power to each entry. Thus `X.^2` squares four separate measurements; `X^2` means `X * X` and mixes entries through matrix multiplication. Their values generally differ.',
      'Use ordinary `*` when a map combines features, and dotted operators when a transformation acts independently on measurements. This distinction is central to machine learning: predicting from a dataset uses matrix multiplication, while squaring each prediction error uses `.^2`. A program may run with the wrong operator and still calculate the wrong model.',
      'The bar plot shows the two batch predictions. Manually checking the first weighted sum is a useful defense against shape mistakes. A square matrix can be multiplied by itself, so shape alone does not prove that `X^2` was the intended operation; state the meaning of the calculation as well.',
    ],
    procedure: ['Decide whether entries are transformed independently or combined into weighted sums.', 'For a matrix product, match the left column count with the right row count.', 'Check one output by hand, then compare it with the complete batch.'],
    prediction: { question: 'For X = [1 2; 3 4], is the first entry of X.^2 the same as the first entry of X*X?', answer: 'No. X.^2 starts with 1, while X*X starts with 1×1 + 2×3 = 7.' },
    demo: {
      code: `X = [1 2; 3 4];
w = [2; 1];
prediction = X * w;
independent_squares = X.^2;
composed_map = X * X;
disp('One prediction per row:'); disp(prediction)
disp('Elementwise square:'); disp(independent_squares)
disp('Matrix product:'); disp(composed_map)
bar([1 2], prediction)
title('Batch weighted sums'); xlabel('Observation'); ylabel('Predicted price'); grid on`,
      explain: [{ code: 'prediction = X * w;', meaning: 'Each row is combined with the same weight column.' }, { code: 'independent_squares = X.^2;', meaning: 'The dot makes squaring act separately on every entry.' }, { code: 'composed_map = X * X;', meaning: 'A matrix product sums products across matching inner positions.' }],
    },
    challenge: {
      prompt: 'Calculate predictions = X*w. Also calculate squares by squaring every entry of X separately.',
      setup: 'X = [2 1; 4 3]; w = [3; 2];', starter: 'predictions = [0; 0]; squares = zeros(2, 2);', solution: 'predictions = X * w; squares = X.^2;',
      checks: [{ name: 'predictions', expected: [8, 18], tolerance: 1e-6, message: 'Combine each row with weights [3; 2]; do not multiply entries independently.' }, { name: 'squares', expected: [[4, 1], [16, 9]], tolerance: 1e-6, message: 'Square each original entry with .^2 rather than composing the matrix with itself.' }],
      hints: ['One operation combines features; the other keeps entries separate.', 'Use * for the batch predictions and .^ for the independent powers.', 'Write predictions = X * w; and squares = X.^2;.'],
      transfer: 'Change X to three observations with two features. Predict the shape of X*w and explain why X*X is no longer a valid product.',
    },
  },
  {
    id: 'laml-weighted-combinations', module: 'Vector geometry', title: 'Build a vector from weighted pieces', minutes: 25, level: 'Beginner',
    objective: 'Form a linear combination and interpret coefficients as signed amounts of reusable directions.',
    prose: [
      'A shop sells two bundles. Bundle a contains 2 notebooks and 1 pen; bundle b contains 1 notebook and 3 pens. Three copies of a plus two copies of b give [8; 9]: eight notebooks and nine pens. The same operation combines motion directions, image patterns, or model features.',
      'A scalar is one number. Multiplying a vector by a scalar scales every entry: `3*a` makes three copies. Adding equal-shaped vectors adds corresponding entries. An expression such as `3*a + 2*b` is a linear combination: a sum of vectors multiplied by scalar coefficients.',
      'Negative coefficients are permitted in vector algebra. The vector `a - b` means `a + (-1)*b`, giving [1; -2]. This may describe a change in inventory even when it cannot describe a purchasable bundle. Coefficients need an interpretation appropriate to the application.',
      'Place vectors in matrix columns: `A = [2 1; 1 3];`. Then `A * [3; 2]` makes exactly the same combination. Matrix multiplication can therefore mean combining column patterns, as well as taking weighted sums across rows. These are two views of one operation.',
      'The plot joins the origin to the combined inventory. Changing a coefficient moves the endpoint along one bundle direction. If both bundle vectors pointed along the same line, changing two coefficients would still reach only that line. This prepares the idea of span: all vectors reachable from the available pieces.',
    ],
    procedure: ['Write one component vector for each reusable direction or pattern.', 'Multiply each component by its signed coefficient.', 'Add corresponding entries and interpret the resulting vector in the original units.'],
    prediction: { question: 'If the coefficient of a increases by 1 while the coefficient of b stays fixed, how does the result change?', answer: 'The result increases by exactly a: 2 more notebooks and 1 more pen.' },
    demo: {
      code: `a = [2; 1];
b = [1; 3];
combined = 3*a + 2*b;
A = [2 1; 1 3];
by_matrix = A * [3; 2];
disp('Three a plus two b:'); disp(combined)
disp('Same result by matrix multiplication:'); disp(by_matrix)
plot([0 combined(1)], [0 combined(2)])
title('A weighted combination'); xlabel('Notebooks'); ylabel('Pens'); grid on; axis equal`,
      explain: [{ code: 'combined = 3*a + 2*b;', meaning: 'Scale each bundle, then add matching inventory counts.' }, { code: 'A = [2 1; 1 3];', meaning: 'The columns store a and b as reusable patterns.' }, { code: 'by_matrix = A * [3; 2];', meaning: 'Matrix multiplication applies the coefficients to those columns.' }],
    },
    challenge: {
      prompt: 'A robot can move by a or b. Compute destination after 2 copies of a and -1 copy of b.',
      setup: 'a = [3; 1]; b = [1; 2];', starter: 'destination = [0; 0];', solution: 'destination = 2*a - b;',
      checks: [{ name: 'destination', expected: [5, 0], tolerance: 1e-6, message: 'Scale a by 2 and subtract b component by component.' }],
      hints: ['A negative coefficient reverses the corresponding displacement.', 'The first coordinate is 2*3 - 1; the second is 2*1 - 2.', 'Assign destination = 2*a - b;.'],
      transfer: 'Choose two different nonzero vectors that lie on the same line. Explain which target points their linear combinations can never reach.',
    },
  },
  {
    id: 'laml-dot-product', module: 'Vector geometry', title: 'Dot products score matching features', minutes: 25, level: 'Beginner',
    objective: 'Compute a dot product as a weighted score and distinguish positive, zero, and negative alignment.',
    prose: [
      'An apartment has two standardized features [2; 1], and a scoring rule uses weights [3; -1]. The score is 2×3 + 1×(-1) = 5. Each matching pair contributes one product, and adding the products produces one number. This operation is the dot product.',
      'In MATLAB column-vector notation, `x\' * w` transposes x into a row and then multiplies it by the weight column. OpenMAT stores both vector orientations as flat arrays, but this expression still computes the dot product here. Use `dot(x, w)` to express the operation directly. Both vectors need the same number of coordinates, and positions must represent the same features.',
      'The sign also has geometric meaning. Directions that point broadly together have a positive dot product; perpendicular directions have dot product zero; opposing directions have a negative one. Zero does not mean either vector has no information: [1; 0] and [0; 1] are both nonzero but perpendicular.',
      'A raw dot product depends on vector length as well as direction. Doubling x doubles the score even though its direction stays fixed. This is useful for weighted totals but can distort similarity comparisons when document length or measurement scale varies. A later lesson divides by lengths to obtain cosine similarity.',
      'The figure compares the two coordinate contributions. One negative contribution can be outweighed by a larger positive contribution. In machine learning a linear prediction is a dot product plus an optional offset. Always inspect feature units: a huge unscaled measurement may dominate a score merely because of its numerical scale.',
    ],
    procedure: ['Align entries that refer to the same feature.', 'Multiply each matching pair, keeping any negative signs.', 'Add the contributions and explain what the sign and magnitude mean.'],
    prediction: { question: 'If x doubles while w remains fixed, does x\' * w stay unchanged?', answer: 'No. Every coordinate contribution doubles, so the complete dot product doubles.' },
    demo: {
      code: `x = [2; 1];
w = [3; -1];
contributions = x .* w;
score = x' * w;
perpendicular = dot([1; 0], [0; 1]);
disp('Weighted score:'); disp(score)
disp('Perpendicular dot product:'); disp(perpendicular)
bar([1 2], contributions)
title('Contributions to one dot product'); xlabel('Feature position'); ylabel('Feature times weight'); grid on`,
      explain: [{ code: 'contributions = x .* w;', meaning: 'Elementwise multiplication exposes the separate coordinate contributions.' }, { code: "score = x' * w;", meaning: 'The mathematical row-times-column expression computes a scalar dot product; OpenMAT stores both vectors flat.' }, { code: 'perpendicular = dot([1; 0], [0; 1]);', meaning: 'Two nonzero perpendicular directions have a zero dot product.' }],
    },
    challenge: {
      prompt: 'Calculate score for the feature vector x and weights w. Also compute opposing = dot(x, -x).',
      setup: 'x = [1; 2; 3]; w = [2; -1; 4];', starter: 'score = 0; opposing = 0;', solution: "score = x' * w;\nopposing = dot(x, -x);",
      checks: [{ name: 'score', expected: 12, tolerance: 1e-6, message: 'Add 1*2, 2*(-1), and 3*4; the result is a scalar.' }, { name: 'opposing', expected: -14, tolerance: 1e-6, message: 'A vector dotted with its negative gives the negative sum of its squared entries.' }],
      hints: ['A dot product sums products of matching entries.', 'Transpose x to turn it into a row, or call dot(x, w).', "Use score = x' * w; and opposing = dot(x, -x);."],
      transfer: 'Find two nonzero three-coordinate vectors with dot product zero. Verify it in OpenMAT and explain why zero similarity is different from a zero vector.',
    },
  },
  {
    id: 'laml-length-distance-cosine', module: 'Vector geometry', title: 'Separate length, distance, and direction', minutes: 25, level: 'Beginner',
    objective: 'Calculate Euclidean length and distance, normalize a nonzero vector, and compare directions with cosine similarity.',
    prose: [
      'A point at [3; 4] is 5 units from the origin because 3² + 4² = 25 and the square root of 25 is 5. The Euclidean norm is this straight-line length. OpenMAT calculates it with `norm(v)`. A zero vector has length zero.',
      'The displacement from point a to point b is `b-a`; its length `norm(b-a)` is their Euclidean distance. Distance compares positions, while norm compares a vector with the origin. In nearest-neighbor methods this distance decides which examples are close, making the units of each feature consequential.',
      'Normalize a nonzero vector by dividing it by its length: `unit = v / norm(v)`. The result has length 1 and keeps the direction. This removes magnitude. Division by the length of a zero vector is undefined; test for nonzero length before normalizing real data.',
      'Cosine similarity compares directions by dividing a dot product by both lengths: `dot(a,b)/(norm(a)*norm(b))`. For real nonzero vectors the answer lies between -1 and 1. One means matching directions, zero means perpendicular directions, and -1 means opposite directions. It is undefined if either vector is zero.',
      'The plot shows v and its unit version on the same ray. A longer document feature vector can point in the same direction as a shorter one: their cosine is 1 even though their distance is positive. Choose distance when magnitude should count, and cosine when direction is the intended comparison.',
    ],
    procedure: ['Compute each vector length and guard against zero before division.', 'Subtract points before computing their distance.', 'Normalize or divide the dot product by both lengths when comparing directions.'],
    prediction: { question: 'What are cosine similarity and distance between [3; 4] and [6; 8]?', answer: 'Their cosine similarity is 1 because the directions match. Their distance is 5 because the displacement is [3; 4].' },
    demo: {
      code: `v = [3; 4];
longer = [6; 8];
length_v = norm(v);
unit = v / length_v;
distance = norm(longer-v);
cosine = dot(v, longer)/(norm(v)*norm(longer));
disp('Length, distance, cosine:'); disp(length_v); disp(distance); disp(cosine)
plot([0 v(1)], [0 v(2)])
hold on
plot([0 unit(1)], [0 unit(2)])
title('Normalization keeps direction'); xlabel('Coordinate 1'); ylabel('Coordinate 2'); legend('Original', 'Unit vector'); grid on; axis equal`,
      explain: [{ code: 'length_v = norm(v);', meaning: 'Take the square root of the sum of squared coordinates.' }, { code: 'unit = v / length_v;', meaning: 'Scale the nonzero vector to length one.' }, { code: 'distance = norm(longer-v);', meaning: 'Measure the displacement between two endpoints.' }, { code: 'cosine = dot(v, longer)/(norm(v)*norm(longer));', meaning: 'Remove length from the dot product to compare only direction.' }],
    },
    challenge: {
      prompt: 'For a and b, calculate length_a, their distance, and their cosine similarity. Both supplied vectors are nonzero.',
      setup: 'a = [3; 4]; b = [-4; 3];', starter: 'length_a = 0; distance = 0; cosine = 1;', solution: 'length_a = norm(a); distance = norm(b-a); cosine = dot(a,b)/(norm(a)*norm(b));',
      checks: [{ name: 'length_a', expected: 5, tolerance: 1e-6, message: 'Use the square root of 3^2 + 4^2.' }, { name: 'distance', expected: Math.sqrt(50), tolerance: 1e-6, message: 'Take the norm of b-a, rather than subtracting the two lengths.' }, { name: 'cosine', expected: 0, tolerance: 1e-6, message: 'The dot product is zero, so these nonzero directions are perpendicular.' }],
      hints: ['Lengths belong to vectors; distance belongs to the difference between two points.', 'Both norms are 5. The dot product is 3*(-4)+4*3.', 'Use norm(a), norm(b-a), and dot(a,b)/(norm(a)*norm(b)) for the outputs.'],
      transfer: 'Construct two vectors with cosine similarity 1 and a large distance. Then explain a dataset where cosine is a better choice than raw Euclidean distance.',
    },
  },
  {
    id: 'laml-projection', module: 'Vector geometry', title: 'Find the closest point on a direction', minutes: 25, level: 'Beginner',
    objective: 'Project a vector onto a nonzero direction and verify that the remaining error is perpendicular.',
    prose: [
      'A measurement is [3; 2], but a one-feature model can produce only horizontal vectors [c; 0]. The closest allowed prediction is [3; 0]. Its error is [0; 2], which points straight away from the permitted line. This closest-point operation is an orthogonal projection.',
      'For a nonzero allowed direction u, every permitted prediction is `coefficient*u`. The coefficient is `dot(u,x)/dot(u,u)`. Multiplying by u gives the projection. The denominator compensates for the length of u: using [2; 0] instead of [1; 0] must describe the same horizontal line.',
      'The residual is `x-projection`: the part the model did not explain. Its dot product with u should be zero, within numerical tolerance. A nonzero residual can still be the best possible answer when the model is constrained. Machine learning uses this geometric idea when fitting a target from a restricted collection of features.',
      'The projection is a vector, the coefficient is a scalar, and the residual is another vector. Confusing them hides important meaning. A negative coefficient projects onto the opposite ray of the same line. We allow the whole line, not only positive multiples.',
      'The figure links the measurement to its projection. Moving along the allowed line from that point increases the residual length. Projecting onto a zero direction is undefined because the denominator is zero. Roundoff may leave a tiny dot product such as 1e-15; compare against a tolerance instead of requiring exact floating-point equality.',
    ],
    procedure: ['Confirm that the allowed direction is nonzero.', 'Compute dot(u,x)/dot(u,u), then multiply that coefficient by u.', 'Subtract the projection from x and check that its dot product with u is near zero.'],
    prediction: { question: 'If the allowed direction changes from [1; 0] to [2; 0], should the projected point move?', answer: 'No. Both directions span the same line. The coefficient halves while the projected vector stays [3; 0].' },
    demo: {
      code: `x = [3; 2];
u = [2; 0];
coefficient = dot(u,x)/dot(u,u);
projection = coefficient*u;
residual = x-projection;
orthogonality = dot(u,residual);
disp('Projection:'); disp(projection)
disp('Residual:'); disp(residual)
disp('Residual dot direction:'); disp(orthogonality)
plot([0 x(1)], [0 x(2)])
hold on
plot([0 projection(1)], [0 projection(2)])
plot([projection(1) x(1)], [projection(2) x(2)])
title('Projection and unexplained residual'); xlabel('Coordinate 1'); ylabel('Coordinate 2'); legend('Measurement', 'Projection', 'Residual'); grid on; axis equal`,
      explain: [{ code: 'coefficient = dot(u,x)/dot(u,u);', meaning: 'Find how much of the allowed direction is closest to x.' }, { code: 'projection = coefficient*u;', meaning: 'Convert the scalar coefficient back into a point on the line.' }, { code: 'orthogonality = dot(u,residual);', meaning: 'Check the defining closest-point condition: no residual remains along u.' }],
    },
    challenge: {
      prompt: 'Project x onto the line spanned by u. Store projection, residual, and orthogonality = dot(u,residual).',
      setup: 'x = [4; 2]; u = [1; 1];', starter: 'projection = [0; 0]; residual = [0; 0]; orthogonality = 1;', solution: 'coefficient = dot(u,x)/dot(u,u); projection = coefficient*u; residual = x-projection; orthogonality = dot(u,residual);',
      checks: [{ name: 'projection', expected: [3, 3], tolerance: 1e-6, message: 'The coefficient is dot(u,x)/dot(u,u); the projected point must have equal coordinates.' }, { name: 'residual', expected: [1, -1], tolerance: 1e-6, message: 'Subtract the projected vector from the original measurement.' }, { name: 'orthogonality', expected: 0, tolerance: 1e-6, message: 'The residual must be perpendicular to the allowed direction.' }],
      hints: ['The allowed points have the form [c; c].', 'The dot products in the coefficient are 6 and 2.', 'Use coefficient = dot(u,x)/dot(u,u); projection = coefficient*u; then residual = x-projection;.'],
      transfer: 'Project the same x using direction [-3; -3]. Verify that the projection and residual are unchanged, and explain why the coefficient changes.',
    },
  },
  {
    id: 'laml-matrix-maps', module: 'Matrices as maps', title: 'See a matrix move the coordinate directions', minutes: 25, level: 'Beginner',
    objective: 'Interpret matrix columns as transformed coordinate directions and predict the image of a new vector.',
    prose: [
      'A display stretches a point [1; 2] to [2; 2]: its horizontal coordinate doubles while its vertical coordinate stays fixed. The matrix `[2 0; 0 1]` performs this operation by multiplication. A matrix can describe a repeatable transformation rather than a dataset.',
      'The coordinate directions e1 = [1; 0] and e2 = [0; 1] form the standard basis: every two-coordinate vector is x1*e1 + x2*e2. The columns of A are exactly A*e1 and A*e2. Reading the columns therefore tells you how A moves the basic directions.',
      'A linear map preserves addition and scaling: mapping a sum gives the sum of the mapped vectors. That is why learning the images of the basis directions is enough. A fixed shift such as adding [2; 3] does not by itself define a linear map, because it moves the zero vector away from zero.',
      'For `A = [2 1; 0 1]`, the first direction becomes [2; 0] and the second becomes [1; 1]. The latter both tilts and changes length. A new vector [1; 2] becomes one copy of the first column plus two of the second: [4; 2]. This is the column-combination view of multiplication.',
      'The plot compares one input vector with its image. Feature transforms in machine learning apply the same rule to many examples. This lesson writes individual vectors in mathematical column notation with A*x; OpenMAT stores those vectors flat. For a genuine multirow dataset X whose observations occupy rows, applying this same coordinate map to every observation uses X*A\'.',
    ],
    procedure: ['Find the two columns of the transformation matrix.', 'Interpret them as the images of [1; 0] and [0; 1].', 'Combine the columns using the input coordinates and compare with A*x.'],
    prediction: { question: 'Without multiplying all entries, where does A = [2 1; 0 1] send [0; 1]?', answer: 'It sends [0; 1] to the second column, [1; 1].' },
    demo: {
      code: `A = [2 1; 0 1];
x = [1; 2];
y = A*x;
first_direction = A*[1; 0];
second_direction = A*[0; 1];
disp('Mapped vector:'); disp(y)
disp('Images of the coordinate directions:'); disp(first_direction); disp(second_direction)
plot([0 x(1)], [0 x(2)])
hold on
plot([0 y(1)], [0 y(2)])
title('A matrix acts on a vector'); xlabel('Coordinate 1'); ylabel('Coordinate 2'); legend('Input', 'Output'); grid on; axis equal`,
      explain: [{ code: 'A = [2 1; 0 1];', meaning: 'Column one and column two specify the transformed coordinate directions.' }, { code: 'y = A*x;', meaning: 'Apply the same linear map to the complete input vector.' }, { code: 'second_direction = A*[0; 1];', meaning: 'This product selects the second matrix column.' }],
    },
    challenge: {
      prompt: 'Apply A to x and store the result in mapped. Also store the image of [0; 1] in second_direction.',
      setup: 'A = [1 2; -1 1]; x = [2; 3];', starter: 'mapped = [0; 0]; second_direction = [0; 0];', solution: 'mapped = A*x; second_direction = A*[0; 1];',
      checks: [{ name: 'mapped', expected: [8, 1], tolerance: 1e-6, message: 'Combine two copies of column one with three copies of column two.' }, { name: 'second_direction', expected: [2, 1], tolerance: 1e-6, message: 'The image of [0; 1] is the second column of A.' }],
      hints: ['A matrix acts on a column vector from the left.', 'Each output coordinate is one matrix row dotted with x.', 'Write mapped = A*x; and second_direction = A*[0; 1];.'],
      transfer: 'Construct a matrix that sends [1; 0] to [0; 2] and [0; 1] to [-1; 0]. Verify the images and predict where [3; 4] goes.',
    },
  },
  {
    id: 'laml-composition', module: 'Matrices as maps', title: 'Order matters when transformations combine', minutes: 25, level: 'Beginner',
    objective: 'Compose two maps in the correct order and give a concrete example where reversing them changes the result.',
    prose: [
      'Start at [1; 1]. Stretch the horizontal direction by 2, producing [2; 1], then rotate a quarter turn counterclockwise, producing [-1; 2]. Reverse the operations and the result is [-2; 1]. The same two transformations can produce different answers when their order changes.',
      'Let S = [2 0; 0 1] be the stretch and R = [0 -1; 1 0] be the rotation. `R*(S*x)` means first apply S to x, then apply R. The combined matrix is `R*S`. When a product acts on a vector, read the operations from right to left.',
      'Matrix multiplication is associative: `(R*S)*x` and `R*(S*x)` give the same result. It is generally not commutative: `R*S` need not equal `S*R`. Associativity lets a pipeline be precomputed; it does not permit swapping its steps.',
      'For example, a data pipeline may first rescale features and then mix them into new coordinates. Reversing those operations changes which directions receive the scaling. A chain of linear neural network layers also composes through matrix products; nonlinear activation functions change this simple combination rule.',
      'The figure draws both final vectors. Some pairs do commute: uniform scaling by 2 commutes with this rotation. Finding one commuting pair does not establish a general rule. Test the actual operators and use a concrete input to expose an incorrect ordering.',
    ],
    procedure: ['Write the intended sequence in words: first which map, then which map.', 'Place the first map nearest the input vector, on the right.', 'Compare the sequential result with the combined product and test the reverse order.'],
    prediction: { question: 'For a pipeline that first applies S and then R, is the combined matrix S*R or R*S?', answer: 'R*S. The rightmost factor acts on the input first.' },
    demo: {
      code: `x = [1; 1];
S = [2 0; 0 1];
R = [0 -1; 1 0];
stretch_then_rotate = R*(S*x);
rotate_then_stretch = S*(R*x);
combined = R*S;
disp('Stretch then rotate:'); disp(stretch_then_rotate)
disp('Rotate then stretch:'); disp(rotate_then_stretch)
disp('Combined map:'); disp(combined)
plot([0 stretch_then_rotate(1)], [0 stretch_then_rotate(2)])
hold on
plot([0 rotate_then_stretch(1)], [0 rotate_then_stretch(2)])
title('Reversing maps changes the endpoint'); xlabel('Coordinate 1'); ylabel('Coordinate 2'); legend('Stretch then rotate', 'Rotate then stretch'); grid on; axis equal`,
      explain: [{ code: 'stretch_then_rotate = R*(S*x);', meaning: 'The inner product applies the stretch before the rotation.' }, { code: 'rotate_then_stretch = S*(R*x);', meaning: 'The same input now encounters the operations in the reverse order.' }, { code: 'combined = R*S;', meaning: 'This single matrix represents the first pipeline for every input vector.' }],
    },
    challenge: {
      prompt: 'Compute first for a stretch S followed by rotation R, and reverse for the opposite order. Use the given x.',
      setup: 'S = [3 0; 0 1]; R = [0 -1; 1 0]; x = [2; 1];', starter: 'first = [0; 0]; reverse = [0; 0];', solution: 'first = R*(S*x); reverse = S*(R*x);',
      checks: [{ name: 'first', expected: [-1, 6], tolerance: 1e-6, message: 'First stretch [2; 1] into [6; 1], then rotate that result.' }, { name: 'reverse', expected: [-3, 2], tolerance: 1e-6, message: 'First rotate [2; 1] into [-1; 2], then stretch its horizontal coordinate.' }],
      hints: ['The map nearest x acts first.', 'The two expressions are R*(S*x) and S*(R*x).', 'Assign first = R*(S*x); and reverse = S*(R*x);.'],
      transfer: 'Replace S with [3 0; 0 3]. Check several input vectors and explain why uniform scaling commutes with rotation in this case.',
    },
  },
  {
    id: 'laml-invertibility', module: 'Matrices as maps', title: 'Undo a map and detect lost information', minutes: 25, level: 'Beginner',
    objective: 'Recover an input with a linear solve, verify its residual, and identify an information-destroying map.',
    prose: [
      'A sensor doubles a horizontal position and triples a vertical position. An observed output [8; 6] came from [4; 2]. Both coordinates can be recovered because neither was discarded. A square map is invertible when every output has exactly one input.',
      'Write the map as `A = [2 0; 0 3];`. Solve `A*x = b` using OpenMAT’s backslash operator: `x = A \\ b;`. The operator asks for the unknown input that produces b. Prefer this direct solve to forming an explicit inverse and multiplying it by b.',
      'Check the residual `A*x-b`. Its norm measures how closely the recovered input reproduces the output. A tiny residual confirms the equation is satisfied, but it does not by itself prove the input is stable under small changes in measurements. Later lessons investigate conditioning.',
      'Now consider `C = [1 0; 0 0]`. Both [2; 1] and [2; 9] become [2; 0]. The map erased the second coordinate, so no procedure can uniquely recover it from the output. Its columns fail to provide two independent directions: all outputs lie on the horizontal line.',
      'The figure compares the known output with the output reconstructed from the solve. Recoverable representations matter in data transformations; projections deliberately give up information to simplify a model. A non-square system needs separate analysis of consistency and uniqueness. This lesson’s guarantee concerns the supplied square invertible A.',
    ],
    procedure: ['Identify the known map A, observed output b, and unknown input x.', 'Use x = A \\ b rather than explicitly computing an inverse.', 'Calculate norm(A*x-b) and inspect whether the map could have erased an input direction.'],
    prediction: { question: 'Can C = [1 0; 0 0] distinguish inputs [2; 1] and [2; 9]?', answer: 'No. Both produce [2; 0]. The erased second coordinate prevents a unique inverse.' },
    demo: {
      code: `A = [2 0; 0 3];
b = [8; 6];
x = A \\ b;
reconstructed = A*x;
residual = norm(reconstructed-b);
C = [1 0; 0 0];
lost_difference = C*[2; 1] - C*[2; 9];
disp('Recovered input:'); disp(x)
disp('Reconstruction residual:'); disp(residual)
disp('Difference after information loss:'); disp(lost_difference)
plot([1 2], b)
hold on
plot([1 2], reconstructed)
title('Verify the recovered input'); xlabel('Output coordinate'); ylabel('Coordinate value'); legend('Observed', 'Reconstructed'); grid on`,
      explain: [{ code: 'x = A \\ b;', meaning: 'Solve for the input whose mapped output is b.' }, { code: 'residual = norm(reconstructed-b);', meaning: 'Measure the discrepancy between the reconstructed and observed outputs.' }, { code: 'lost_difference = C*[2; 1] - C*[2; 9];', meaning: 'Two distinct inputs become indistinguishable after a singular map.' }],
    },
    challenge: {
      prompt: 'Recover x from A*x=b using a linear solve. Store residual = norm(A*x-b).',
      setup: 'A = [2 1; 1 3]; b = [8; 9];', starter: 'x = [0; 0]; residual = 1;', solution: 'x = A \\ b; residual = norm(A*x-b);',
      checks: [{ name: 'x', expected: [3, 2], tolerance: 1e-6, message: 'The recovered coordinates must simultaneously satisfy both rows of A*x=b.' }, { name: 'residual', expected: 0, tolerance: 1e-6, message: 'Reapply A to the recovered input and measure the remaining error.' }],
      hints: ['Each row gives an equation in the same two unknown input coordinates.', 'OpenMAT solves the system with the backslash operator.', 'Write x = A \\ b; followed by residual = norm(A*x-b);.'],
      transfer: 'Create two different inputs that map to the same output under [1 2; 2 4]. Explain which difference between them is invisible to the map.',
    },
  },
  {
    id: 'laml-determinant-area', module: 'Matrices as maps', title: 'Determinants measure signed area change', minutes: 25, level: 'Beginner',
    objective: 'Interpret a two-dimensional determinant as area scaling, orientation, and a test for collapse.',
    prose: [
      'A unit square has area 1. Stretch its horizontal direction by 2 and vertical direction by 3, and its area becomes 6. The determinant of [2 0; 0 3] is 6. A determinant measures the signed area scale of a two-dimensional linear map, not the length scale of every vector.',
      'For `A = [a b; c d]`, the determinant is a*d - b*c. OpenMAT provides `det(A)`. The absolute value gives the area factor. The sign records orientation: a reflection reverses orientation and has negative determinant, even though geometric area remains positive.',
      'The columns of A are the transformed unit-square edges. They enclose a parallelogram whose area is abs(det(A)). A shear such as [1 2; 0 1] slants the square but has determinant 1, preserving area. Equal area therefore does not mean equal shape or unchanged distances.',
      'A zero determinant means the parallelogram has collapsed to a line or point. Some input direction was erased, so a square map cannot be inverted. A tiny nonzero determinant is not a general-purpose measure of numerical reliability; units and dimension can change its magnitude dramatically. Use conditioning for sensitivity analysis later.',
      'The figure draws the transformed square boundary in order. In data science, a feature transformation can rotate, stretch, or collapse a cloud of observations. The determinant explains local volume scaling for square linear transforms, while rank and singular values provide richer information about which directions survive.',
    ],
    procedure: ['Read the two columns as the new edges of the unit square.', 'Calculate det(A) and separate its sign from its absolute magnitude.', 'Interpret zero as collapse, a negative sign as orientation reversal, and abs(det(A)) as the area factor.'],
    prediction: { question: 'What area factor and orientation does A = [-2 0; 0 3] produce?', answer: 'The determinant is -6. The area factor is 6 and orientation reverses.' },
    demo: {
      code: `A = [2 1; 0 3];
signed_area = det(A);
area_factor = abs(signed_area);
square = [0 1 1 0 0; 0 0 1 1 0];
mapped = A*square;
disp('Signed determinant:'); disp(signed_area)
disp('Area factor:'); disp(area_factor)
plot(square(1,:), square(2,:))
hold on
plot(mapped(1,:), mapped(2,:))
title('A unit square becomes a parallelogram'); xlabel('Coordinate 1'); ylabel('Coordinate 2'); legend('Unit square', 'Mapped boundary'); grid on; axis equal`,
      explain: [{ code: 'signed_area = det(A);', meaning: 'Compute the signed area scale of this square linear map.' }, { code: 'area_factor = abs(signed_area);', meaning: 'Geometric area uses the determinant magnitude, without orientation.' }, { code: 'mapped = A*square;', meaning: 'Transform every column point on the square boundary with the same map.' }],
    },
    challenge: {
      prompt: 'For reflection-and-stretch A, compute signed_area and positive area_factor. Also compute collapsed_area for C.',
      setup: 'A = [-2 0; 0 3]; C = [1 2; 2 4];', starter: 'signed_area = 0; area_factor = 0; collapsed_area = 1;', solution: 'signed_area = det(A); area_factor = abs(signed_area); collapsed_area = det(C);',
      checks: [{ name: 'signed_area', expected: -6, tolerance: 1e-6, message: 'Keep the negative sign: this map reverses orientation.' }, { name: 'area_factor', expected: 6, tolerance: 1e-6, message: 'Geometric area uses the absolute value of the determinant.' }, { name: 'collapsed_area', expected: 0, tolerance: 1e-6, message: 'The columns of C lie on the same line, so their parallelogram has zero area.' }],
      hints: ['A diagonal map scales area by the product of its diagonal entries.', 'Use det for signed area and abs for a nonnegative magnitude.', 'Assign signed_area = det(A); area_factor = abs(signed_area); collapsed_area = det(C);.'],
      transfer: 'Find a non-identity matrix with determinant 1 that changes vector lengths. Plot its transformed square and explain what area preservation does and does not guarantee.',
    },
  },
];
