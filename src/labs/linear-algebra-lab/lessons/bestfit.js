// Stage 3: "Best fit". The module opens with GPS: more readings than unknowns, none of them exact,
// so the receiver looks for the position that disagrees least. The order is: where am I (GPS), least
// squares, orthogonal matrices and Gram–Schmidt (spaces.js, slotted with `after`), then QR as the
// safe way to compute a best fit. Regression and ridge live in the machine-learning track.
// OpenMAT notes: name a right-hand side before solving, and keep a transpose quote and a string off
// the same line.
const t = String.raw
const FIT = 'Best fit'

export const bestFitLessons = [
  {
    id: 'laml-best-fit-gps', module: FIT, title: 'Where am I? More satellites than unknowns', minutes: 25, level: 'Intermediate',
    why: { title: 'Why should I care about a best fit?', story: 'Your phone hears eight or more GPS satellites, but it only needs to find a few numbers: where you are. Every reading is off by a few metres, because the signal slows in the air and bounces off buildings, so the readings never agree on one point. The phone does not give up. It finds the position that disagrees least with all of them at once. The same idea draws a trend line through data, calibrates a sensor and fixes the orbit of a planet.' },
    objective: 'Turn several noisy readings into more equations than unknowns, see why no exact answer exists, and find the position that makes the total squared misfit smallest.',
    prose: [
      'Picture a flat map. Your position p is two numbers: how far east and how far north you are from a landmark, in metres. A satellite sits far away in a known direction d, an arrow of length 1. Its reading tells you how far you are along that direction: d · p = reading. One reading is one equation.',
      'Two satellites give two equations in two unknowns, and the elimination lessons solve them exactly. Four satellites give four equations in two unknowns. Each reading carries a few metres of error, so on the map the four lines do not meet at one point. Whatever p you choose, some reading disagrees. There is no exact answer.',
      'So change the question. For any guess p, the **misfit** of satellite i is d_i · p − reading_i: what that satellite would read if you were at p, minus what it did read. Square each misfit and add them up. The best fit is the p that makes this total as small as possible. This is the method of **least squares**. Squaring stops positive and negative misses from cancelling, and it makes a big miss count more than a small one.',
      'In code, stack the directions as the rows of a matrix D. Then D*p lists the predicted readings of all four satellites at once, and D*p − r lists the misfits. For a tall D, with more rows than columns, `D\\r` returns the least-squares p: the same backslash as before, now asking for the closest answer instead of an exact one. In the demo it gives p = (31.6, 38.8), with misfits 0.6, 0.8, −1 and 0 metres and a total of 2.',
      'Why listen to all four? The errors partly cancel. Using only the first two satellites gives p = (31, 38): it fits those two exactly but misses the third by 2 metres. The true position in this example is (30, 40). The four-satellite fit lands 2.0 metres away and the two-satellite one 2.2 metres away. With a dozen satellites the gain is larger, and that is why a receiver uses every satellite it can hear.',
      'An honest note. Real GPS has four unknowns, not two: three for position and one for the error of the receiver\'s own clock. That is why it needs at least four satellites. And a satellite measures a distance, not a dot product. But when the satellite is far away, a small move of yours changes that distance by exactly d · (your move). So the receiver guesses, solves a least-squares problem like this one for the correction, and repeats until the correction is tiny.',
    ],
    procedure: ['Write one equation per reading: d_i · p = reading_i. Stack the directions as rows of D and the readings in r.', 'More equations than unknowns, with noise, means no exact solution. Ask for the p with the smallest total squared misfit.', 'Compute p = D\\r, then misfit = D*p − r and total = sum(misfit.^2).'],
    prediction: { question: 'A fifth satellite reads exactly what the best-fit position p predicts for it. Does the best fit move?', answer: 'No. At p its misfit is zero, so it adds nothing to the total there, and any other position makes both the old total and the new term larger. Readings that agree with the fit leave it where it is.' },
    demo: {
      code: t`D = [1 0; 0 1; 0.6 0.8; -0.8 0.6];  % satellite directions
r = [31; 38; 51; -2];  % readings (m)
p = D\r  % best fit
misfit = D*p - r
total = sum(misfit.^2)
two = D(1:2,:)\r(1:2)  % first two only
twoTotal = sum((D*two - r).^2)`,
      draw: t`s = -4:4;   % a short piece of each line, near the fit
for i = 1:4
  d = D(i,:);
  c = p - misfit(i)*d;   % the point of line i closest to p
  x = c(1) - s*d(2);
  y = c(2) + s*d(1);
  plot(x, y)
  hold on
end
scatter(p(1), p(2))
title('Close up: four lines that miss, and the best fit')
xlabel('East (m)'); ylabel('North (m)'); legend('Satellite 1', 'Satellite 2', 'Satellite 3', 'Satellite 4', 'Best fit'); axis equal; grid on`,
      explain: [{ code: 'D = [1 0; 0 1; 0.6 0.8; -0.8 0.6];', meaning: 'Four directions, one per row. Each row has length 1: 0.6² + 0.8² = 1.' }, { code: 'p = D\\r', meaning: 'Four equations, two unknowns: backslash returns the position with the smallest total squared misfit.' }, { code: 'misfit = D*p - r', meaning: 'What each satellite would read at p, minus what it did read. They cannot all be zero at once.' }, { code: 'two = D(1:2,:)\\r(1:2)', meaning: 'The first two rows only: an exact solve that ignores the other two satellites, and does worse overall.' }],
    },
    challenge: {
      prompt: 'Four satellites, in the directions given by the rows of `D`, read `r`. Store the best-fit position `p`, the misfits `misfit = D*p - r`, and their squared total `total`. The starter listens to two satellites only.',
      setup: 'D = [1 0; 0 1; 0.6 0.8; 0.8 -0.6];\nr = [12; 21; 25; -6];',
      starter: 'p = D(1:2,:)\\r(1:2);\nmisfit = D*p - r;\ntotal = sum(misfit.^2);',
      solution: t`p = D\r;
misfit = D*p - r;
total = sum(misfit.^2);`,
      checks: [{ name: 'p', expected: [11.1, 22.3], tolerance: 1e-6, message: 'Use all four rows: p = D\\r.' }, { name: 'misfit', expected: [-0.9, 1.3, -0.5, 1.5], tolerance: 1e-6, message: 'Predicted readings minus recorded readings, in satellite order.' }, { name: 'total', expected: 5, tolerance: 1e-6, message: 'Square each misfit before adding.' }],
      cases: [{ setup: 'D = [1 0; 0 1; 0.6 0.8; 0.8 -0.6];\nr = [10; 20; 22; -4];', checks: [{ name: 'p', expected: [10, 20], tolerance: 1e-6, message: 'These readings happen to agree exactly.' }, { name: 'total', expected: 0, tolerance: 1e-6, message: 'When the readings agree, the best fit is an exact fit.' }] }],
      hints: ['The starter uses D(1:2,:), the first two rows only.', 'Backslash with the whole tall matrix gives the least-squares answer.', 'p = D\\r; misfit = D*p - r; total = sum(misfit.^2);'],
      transfer: 'Change the third reading from 25 to 35, a reflection off a building. Which misfit grows most, and how far does p move? What does that say about trusting one wild reading?',
    },
    notation: [
      { tex: t`D\mathbf p \approx \mathbf r, \qquad D \text{ has more rows than columns}`, say: 'More readings than unknowns: the equations cannot all hold.' },
      { tex: t`\hat{\mathbf p} = \text{the } \mathbf p \text{ that makes } \|D\mathbf p - \mathbf r\|^2 = \sum_i (\mathbf d_i\cdot\mathbf p - r_i)^2 \text{ smallest}`, say: 'The least-squares position: the smallest total squared misfit.' },
    ],
    quiz: [
      { q: 'Five satellites are used to find a position on a flat map. How many equations and unknowns?', options: ['5 equations, 2 unknowns', '2 equations, 5 unknowns', '5 equations, 5 unknowns', '2 equations, 2 unknowns'], answer: 0, why: 'One equation per reading; the unknowns are the two coordinates of the position.' },
      { q: 'Why are the misfits squared before adding?', options: ['So misses in opposite directions cannot cancel', 'To make the numbers smaller', 'Because the readings are in metres', 'So that every misfit becomes zero'], answer: 0, why: 'A miss of +3 and one of −3 would add to 0 without squaring, although both are wrong.' },
      { q: 'You measure one length four times: 10.2, 9.9, 10.1 and 9.8. What is the least-squares value?', options: ['10.0, the average', '10.2, the largest', '9.95, the middle two averaged', '9.8, the smallest'], answer: 0, why: 'With one unknown and readings of it directly, least squares gives the mean.' },
    ],
    proof: {
      claim: t`With one unknown $p$ and readings $r_1, \dots, r_n$ of it, the total $\sum_i (p - r_i)^2$ is smallest when $p$ is the mean $m = \tfrac1n\sum_i r_i$.`,
      steps: [
        { ask: t`Split each miss through the mean: $p - r_i = (p - m) + (m - r_i)$. What does squaring and adding give?`, options: [t`$n(p - m)^2 + 2(p - m)\sum_i (m - r_i) + \sum_i (m - r_i)^2$`, t`$(p - m)^2 + (m - r_i)^2$`, t`$n(p - m)^2$`], answer: 0, why: t`Expand $(a + b)^2 = a^2 + 2ab + b^2$ for each $i$, then add; the first term is the same $n$ times.` },
        { ask: t`What is $\sum_i (m - r_i)$?`, options: ['0', t`$m$`, t`$n m$`], answer: 0, why: t`$\sum_i m = nm$ and $\sum_i r_i = nm$ too, by the definition of the mean.` },
        { ask: t`The total is now $n(p - m)^2 + \sum_i (m - r_i)^2$. Which $p$ makes it smallest?`, options: [t`$p = m$`, t`$p = 0$`, t`$p = r_1$`], answer: 0, why: t`The second part does not depend on $p$, and the first is never negative and is zero only at $p = m$.` },
      ],
      conclusion: 'Averaging is least squares with one unknown. With several unknowns the same idea, the leftover meeting everything at a right angle, gives the next lesson.',
    },
  },
  {
    id: 'laml-least-squares', module: FIT, title: 'Least squares: the closest point and the right angle', minutes: 30, level: 'Intermediate',
    why: { title: 'How a lost planet was found', story: 'On New Year\'s Day 1801, Giuseppe Piazzi spotted a new object, Ceres, and followed it for 41 nights before it vanished into the glare of the Sun. Astronomers had a handful of noisy positions and no idea where to look. Carl Friedrich Gauss, aged 24, chose the orbit that disagreed least with all the observations, squared misses and all, and predicted where Ceres would reappear. In December it was there. The method he used, least squares, is the subject of this lesson.' },
    objective: 'Fit a line to points it cannot pass through exactly, see the best fit as the closest point in the column space, and check the answer with the right-angle test Xᵀr = 0.',
    prose: [
      'Three measurements: at inputs 0, 1 and 2 the outputs are 1, 2 and 2. A line has two numbers, an intercept (where it crosses input 0) and a slope. No line passes through all three points. Any choice misses each point by some amount, its **residual**. The least-squares line is the one with the smallest total of squared residuals. Here it has intercept 7/6 and slope 1/2.',
      'Write it with a matrix, as in the GPS lesson. The **design matrix** X has one row per measurement: a 1 (for the intercept) and the input. For coefficients β = (intercept, slope), X·β lists the predictions, and r = y − X·β lists the residuals. Three equations, two unknowns: no exact solution, so we look for the closest one.',
      'Now picture it. As β changes, X·β moves around the span of the columns of X, a flat plane inside three-dimensional space (the Spaces module). The data vector y sticks out of that plane. The best fit X·β̂ is the point of the plane closest to y.',
      'The closest point is the shadow. Just as in the projection lesson, the shortest way from y to a plane meets it at a right angle. So the leftover r is **perpendicular to every column** of X. In symbols, Xᵀr = 0: each entry of Xᵀr is a column of X dotted with r. Put r = y − Xβ in and rearrange: XᵀXβ = Xᵀy. These are the **normal equations** ("normal" means perpendicular): two equations in two unknowns, which elimination solves.',
      'In code, `X\\y` finds β̂ for a tall X. The right-angle test is the honest check on any claimed fit: compute X\'*residual and see that it is zero, apart from rounding. A line that merely looks good on a plot can fail it.',
      'Two cautions. Squaring makes one wild measurement pull the line hard, so look at the residuals before trusting the fit. And solving the normal equations directly can lose accuracy on a computer; the QR lesson at the end of this module shows why, and the safer way.',
    ],
    procedure: ['Build X with one row per measurement: a 1 for the intercept, then the input.', 'Solve beta = X\\y, then compute fitted = X*beta and residual = y - fitted.', 'Check the right angle: X\'*residual should be zero. The squared total residual\'*residual is the smallest possible.'],
    prediction: { question: 'Does the least-squares line pass through any of the three points?', answer: 'Not necessarily, and here it passes through none: it predicts 7/6, 5/3 and 13/6. It makes the squared total smallest; it does not try to hit any single point.' },
    demo: {
      code: t`X = [1 0; 1 1; 1 2];
y = [1; 2; 2];
beta = X\y
fitted = X*beta;
residual = y - fitted
rightAngle = X'*residual
total = sum(residual.^2)`,
      draw: t`plot([0 1 2], y)
hold on
plot([0 1 2], fitted)
title('A best fit can miss every point')
xlabel('Input'); ylabel('Output'); legend('Measured', 'Least-squares line'); grid on`,
      explain: [{ code: 'X = [1 0; 1 1; 1 2];', meaning: 'Each row predicts intercept + slope × that input.' }, { code: 'beta = X\\y', meaning: 'Three equations, two unknowns: backslash returns the least-squares coefficients, 7/6 and 1/2.' }, { code: 'residual = y - fitted', meaning: 'Positive means the measurement is above the line.' }, { code: "rightAngle = X'*residual", meaning: 'The residual dotted with each column of X. Both are zero: the leftover is perpendicular to the plane of predictions.' }],
    },
    challenge: {
      prompt: 'Fit `X*beta` to `y`. Store `beta`, `residual = y - X*beta`, `normalResidual = X\'*residual` and `sse = residual\'*residual`. The four measurements cannot all fit exactly.',
      setup: 'X = [1 0; 1 1; 1 2; 1 3];\ny = [1; 2; 2; 4];',
      starter: 'beta = [0; 0];\nresidual = y - X*beta;\nnormalResidual = X\'*residual;\nsse = residual\'*residual;',
      solution: t`beta = X\y;
residual = y - X*beta;
normalResidual = X'*residual;
sse = residual'*residual;`,
      checks: [{ name: 'beta', expected: [0.9, 0.9], tolerance: 1e-6, message: 'The first coefficient is the intercept and the second is the slope.' }, { name: 'residual', expected: [0.1, 0.2, -0.7, 0.4], tolerance: 1e-6, message: 'Measurements minus predictions, in their original order.' }, { name: 'normalResidual', expected: [0, 0], tolerance: 1e-6, message: 'At the best fit the residual is perpendicular to both columns.' }, { name: 'sse', expected: 0.7, tolerance: 1e-6, message: 'Square the residuals before adding; signed ones can cancel.' }],
      cases: [{ setup: 'X = [1 0; 1 1; 1 2; 1 3];\ny = [0; 1; 1; 2];', checks: [{ name: 'beta', expected: [0.1, 0.6], tolerance: 1e-6, message: 'Fit the new outputs rather than entering remembered numbers.' }, { name: 'sse', expected: 0.2, tolerance: 1e-6, message: 'Recompute the squared total for these outputs.' }] }],
      hints: ['Use the same two-column design for every measurement.', 'Backslash with a tall matrix gives the least-squares coefficients.', 'beta = X\\y; residual = y - X*beta; normalResidual = X\'*residual; sse = residual\'*residual;'],
      transfer: 'Double every output y. Predict how beta, residual and sse change, then check: the coefficients and residuals double, and sse becomes four times as large.',
    },
  },
  {
    id: 'laml-orthogonal-qr', module: FIT, title: 'QR: solve a best fit without losing digits', minutes: 30, level: 'Advanced',
    why: { title: 'The shortcut that squares your errors', story: 'Fit a trend to sales recorded in the years 2020 to 2025, and the textbook shortcut, the normal equations, quietly throws away most of your computer\'s accuracy. The two columns of the table, a column of ones and a column of years near 2020, point almost the same way, and forming XᵀX makes that problem twice as bad. Surveying networks, GPS receivers and every statistics package avoid the shortcut. They factor the table with QR and solve a triangular system instead.' },
    objective: 'Measure how touchy a fit is with the condition number, see why the normal equations square it, and solve a best fit with the thin QR factors: R·β = Qᵀy.',
    prose: [
      'A computer keeps about 16 significant digits of every number. The **condition number** of a matrix, `cond(X)`, says how much a solve can magnify small errors: a condition number of 10⁶ can cost up to 6 of those digits. A table whose columns point in nearly the same direction has a large condition number.',
      'Sales by year: X has a column of ones and a column of years 2020, 2021, …, 2025. The year column is almost 2020 times the ones column, so the two columns are nearly parallel and cond(X) is about 2 × 10⁶. Forming XᵀX for the normal equations squares this: cond(XᵀX) is about 6 × 10¹². Twelve of the sixteen digits are at risk before you start.',
      'QR avoids forming XᵀX. The Gram–Schmidt lesson wrote X = Q·R: the columns of Q are perpendicular unit vectors spanning the same plane as the columns of X, and R is a small upper-triangular matrix. The best fit is still the point where the residual meets that plane at a right angle, and Q\'s columns span the plane, so Qᵀ(y − Xβ) = 0.',
      'Replace X by Q·R and use QᵀQ = I: Qᵀy − Rβ = 0, so **R·β = Qᵀy**. R is triangular, so this is solved by back-substitution from the bottom row up. And R has the same condition number as X, not its square, because multiplying by Qᵀ keeps every length (the orthogonal matrices lesson). Nothing was squared, so nothing extra was lost.',
      'In code, `[Q, R] = qr(X, 0)` returns the **thin** factors: Q with as many columns as X, and a square R. Then `beta = R\\(Q\'*y)`. MATLAB\'s `X\\y` does this for you on a tall matrix. Libraries build Q with reflections (Householder) rather than Gram–Schmidt, which is steadier when columns are nearly dependent; the factors are the same apart from signs.',
      'A cheaper cure works too, when you can see the problem: measure years from 2020 instead of from year 0. The columns then point in clearly different directions and the condition number drops to about 6. QR protects you when you cannot see it.',
    ],
    procedure: ['Check how touchy the table is with cond(X); the normal equations would square it.', 'Factor [Q, R] = qr(X, 0): Q has perpendicular unit columns, R is upper triangular.', 'Solve the triangular system R*beta = Q\'*y, then check the residual as in the least-squares lesson.'],
    prediction: { question: 'The years are replaced by years − 2020, so they run 0, 1, …, 5. Does the fitted line change?', answer: 'Not as a line: it is the same best fit, with the intercept now read at 2020 instead of at year 0. Only the coefficients\' meaning shifts, and the condition number falls from about 2 million to about 6.' },
    demo: {
      code: t`years = [2020; 2021; 2022; 2023; 2024; 2025];
sales = [12; 14; 15; 18; 19; 22];
X = [ones(6,1) years];
touchy = cond(X)
touchyNormal = cond(X'*X)       % its square
[Q, R] = qr(X, 0);
disp('R, upper triangular:'); disp(R)
beta = R\(Q'*sales)             % back-substitution
direct = X\sales                % the same answer
centred = cond([ones(6,1) years-2020])`,
      draw: t`plot(years, sales)
hold on
plot(years, X*beta)
title('Sales by year, and the best-fit line found with QR')
xlabel('Year'); ylabel('Sales'); legend('Recorded', 'Best fit'); grid on`,
      explain: [{ code: 'touchy = cond(X)', meaning: 'About 2 million: the ones column and the years column point almost the same way.' }, { code: "touchyNormal = cond(X'*X)", meaning: 'The square of the first number. This is what solving the normal equations would face.' }, { code: '[Q, R] = qr(X, 0);', meaning: 'The thin factors: a 6 × 2 Q with perpendicular unit columns, and a 2 × 2 upper-triangular R.' }, { code: "beta = R\\(Q'*sales)", meaning: 'Solve R·β = Qᵀy. The triangle makes it a back-substitution.' }],
    },
    challenge: {
      prompt: 'Fit a line to `y` using the thin QR factors of `X`. Store `beta` from `R*beta = Q\'*y`, `corner = R(2,1)` (zero for a triangular R), and `sse`, the sum of the squared residuals `y - X*beta`.',
      setup: 'X = [1 0; 1 1; 1 2; 1 3];\ny = [2; 3; 5; 6];',
      starter: '[Q, R] = qr(X, 0);\nbeta = [0; 0];\ncorner = 1;\nsse = sum((y - X*beta).^2);',
      solution: t`[Q, R] = qr(X, 0);
beta = R\(Q'*y);
corner = R(2,1);
sse = sum((y - X*beta).^2);`,
      checks: [{ name: 'beta', expected: [1.9, 1.4], tolerance: 1e-6, message: 'Solve the triangular system R*beta = Q\'*y.' }, { name: 'corner', expected: 0, tolerance: 1e-9, message: 'R is upper triangular: the entry below the diagonal is zero.' }, { name: 'sse', expected: 0.2, tolerance: 1e-6, message: 'The residuals are 0.1, −0.3, 0.3 and −0.1.' }],
      cases: [{ setup: 'X = [1 0; 1 1; 1 2; 1 3];\ny = [1; 2; 2; 4];', checks: [{ name: 'beta', expected: [0.9, 0.9], tolerance: 1e-6, message: 'The least-squares lesson\'s data: QR gives the same answer as backslash.' }, { name: 'sse', expected: 0.7, tolerance: 1e-6, message: 'The same smallest total as before.' }] }],
      hints: ['The starter already factors X. Only beta and corner are missing.', 'Project y first: Q\'*y. Then solve with the triangle R.', "beta = R\\(Q'*y); corner = R(2,1);"],
      transfer: 'Use X = [ones(4,1) [2020; 2021; 2022; 2023]] with the same y. Compare cond(X) with cond(X\'*X), and check that QR and backslash still agree.',
    },
    notation: [
      { tex: t`X = QR, \qquad Q^TQ = I, \qquad R \text{ upper triangular}`, say: 'Perpendicular unit columns times a small triangle.' },
      { tex: t`Q^T(\mathbf y - QR\boldsymbol\beta) = \mathbf 0 \;\Longrightarrow\; R\boldsymbol\beta = Q^T\mathbf y`, say: 'The right-angle condition, written with the factors: a triangular system.' },
      { tex: t`\operatorname{cond}(X^TX) = \operatorname{cond}(X)^2, \qquad \operatorname{cond}(R) = \operatorname{cond}(X)`, say: 'The normal equations square the trouble; QR keeps it as it is.' },
    ],
    quiz: [
      { q: 'cond(X) is $10^5$. About how large is cond($X^TX$)?', options: ['$10^{10}$', '$10^5$', '$10^{2.5}$', '$2 \\times 10^5$'], answer: 0, why: 'Forming $X^TX$ squares the condition number.' },
      { q: 'After $[Q, R] = $ qr$(X, 0)$, which system gives the least-squares coefficients?', options: ['$R\\boldsymbol\\beta = Q^T\\mathbf y$', '$Q\\boldsymbol\\beta = R\\mathbf y$', '$R^TR\\boldsymbol\\beta = \\mathbf y$', '$Q^TQ\\boldsymbol\\beta = \\mathbf y$'], answer: 0, why: 'The residual is perpendicular to the columns of $Q$; with $Q^TQ = I$ that leaves $R\\boldsymbol\\beta = Q^T\\mathbf y$.' },
      { q: 'Why does multiplying by $Q^T$ not magnify errors?', options: ['Its columns are perpendicular unit vectors, so it keeps lengths', 'It is triangular', 'It has determinant 0', 'It is the identity'], answer: 0, why: 'A matrix with orthonormal columns preserves lengths, so an error vector keeps its size.' },
    ],
    proof: {
      claim: t`If $X = QR$ with $Q^TQ = I$ and $R$ invertible, then $\boldsymbol\beta$ solves $R\boldsymbol\beta = Q^T\mathbf y$ exactly when it solves the normal equations $X^TX\boldsymbol\beta = X^T\mathbf y$.`,
      steps: [
        { ask: t`Write $X^TX$ with the factors.`, options: [t`$R^TQ^TQR = R^TR$`, t`$QRQR$`, t`$Q^TQ$`], answer: 0, why: t`$X^T = R^TQ^T$ (transposing a product reverses its order), and $Q^TQ = I$.` },
        { ask: t`And $X^T\mathbf y$?`, options: [t`$R^TQ^T\mathbf y$`, t`$Q^TR^T\mathbf y$`, t`$R\mathbf y$`], answer: 0, why: 'The same transpose rule.' },
        { ask: t`So the normal equations read $R^TR\boldsymbol\beta = R^TQ^T\mathbf y$. What can you do with $R^T$?`, options: [t`Cancel it: $R$ is invertible, so $R^T$ is too`, 'Nothing: it must stay', t`Replace it by $Q$`], answer: 0, why: t`Multiply both sides by $(R^T)^{-1}$, leaving $R\boldsymbol\beta = Q^T\mathbf y$.` },
      ],
      conclusion: 'QR gives the same least-squares answer as the normal equations, but reaches it through a triangular system with the conditioning of X instead of its square.',
    },
  },
]
