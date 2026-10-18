// OpenMat exercises use explicit column means and factor products so the same
// mathematics works with OpenMat's flat vector representation.
export const core = [
  {
    id: 'laml-span-rank', module: 'Spaces and bases', title: 'Span and rank: how many real directions?', minutes: 25, level: 'Intermediate',
    why: { title: 'Two thermometers, one fact', story: 'A weather log stores each temperature twice: once in Celsius and once in Fahrenheit. The table has two columns but only one piece of information. Spotting that matters. A model fitted to both columns cannot decide how to share the credit between them, and its answers swing wildly. The rank of a table counts how many genuinely different directions its columns hold. The span is everything you can build from them.' },
    objective: 'Describe the span of some columns as everything they can build, spot a redundant column, count the real directions with rank, and test whether a target can be built.',
    prose: [
      'Take some columns of numbers and mix them: multiply each by a weight and add. The result is a **combination** of the columns. The set of every combination you can make is their **span**: everything those columns can build. Two arrows in the plane that point different ways span the whole plane. Two arrows along the same line span only that line.',
      'A weather log has three columns over five days: a column of ones (it lets a model add a constant), the temperature in Celsius, and the temperature in Fahrenheit. Fahrenheit is 32 times the ones column plus 1.8 times the Celsius column. So the Fahrenheit column is a combination of the other two, and anything you can build with it you can already build without it. It is **redundant**.',
      'Columns with no redundancy, where none is a combination of the others, are called **independent**. The **rank** of a table is the number of independent directions among its columns. The weather table has 3 columns but rank 2. In code, `rank(A)` counts them. A new column raises the rank only when it brings a direction the others cannot build.',
      'Can a target column be built from some columns B? Solve B·w = target for the weights w and check the leftover, B·w − target. A zero leftover means the target is in the span. A nonzero leftover means it is not, and the best you can do is get close, which is what least squares does in the next module.',
      'Real data is rarely this tidy. If the Fahrenheit readings are rounded to whole degrees, the column is no longer an exact combination and the rank becomes 3, although the column still adds almost nothing new. The SVD module measures this "almost" with the singular values. `A(:,[1 2])` picks out columns 1 and 2: the colon means every row.',
    ],
    procedure: ['Look at how each column was made and test any suspected combination.', 'Count the independent directions with rank(A).', 'Keep independent columns B, solve B*w = target, and check that B*w − target is zero before claiming the target is in the span.'],
    prediction: { question: 'A fourth column is added: the temperature in kelvin, which is Celsius plus 273.15. Does the rank go up from 2 to 3?', answer: 'No. Kelvin is 273.15 times the ones column plus the Celsius column, so it adds no new direction. The rank stays 2.' },
    demo: {
      code: String.raw`C = [-5; 0; 10; 20; 30];
F = 32 + 1.8*C;
A = [ones(5,1) C F];
disp('Rank of the weather table:'); disp(rank(A))
B = A(:,[1 2]);
weights = B\F
rebuilt = B*weights;
leftover = norm(rebuilt - F)`,
      draw: String.raw`plot(1:5, F)
hold on
plot(1:5, rebuilt)
title('Fahrenheit is already built from the ones column and Celsius')
xlabel('Day'); ylabel('Temperature in Fahrenheit'); legend('Recorded column', '32 x ones + 1.8 x Celsius'); grid on`,
      explain: [{ code: 'A = [ones(5,1) C F];', meaning: 'Three columns side by side: ones, Celsius and Fahrenheit.' }, { code: 'rank(A)', meaning: 'Count the independent directions: 2, although there are 3 columns.' }, { code: 'weights = B\\F', meaning: 'Find the weights that build Fahrenheit from the first two columns: 32 and 1.8.' }, { code: 'leftover = norm(rebuilt - F)', meaning: 'Zero, apart from rounding: a number like 1e-14 means 0.00000000000001. Fahrenheit is in the span of the other two columns.' }],
    },
    challenge: {
      prompt: 'In the table A, column 2 is twice column 1. Store the rank of A in featureRank. Put the independent columns 1 and 3 into basis, solve basis*weights = target, and store the leftover residual = basis*weights - target.',
      setup: 'A = [1 2 0; 0 0 1; 1 2 1];\ntarget = [4; 1; 5];',
      starter: 'featureRank = 3;\nbasis = A(:,[1 2]);\nweights = [0; 0];\nresidual = basis*weights - target;',
      solution: String.raw`featureRank = rank(A);
basis = A(:,[1 3]);
weights = basis\target;
residual = basis*weights - target;`,
      checks: [{ name: 'featureRank', expected: 2, tolerance: 1e-6, message: 'Column 2 is twice column 1, so it adds no new direction.' }, { name: 'basis', expected: [[1, 0], [0, 1], [1, 1]], tolerance: 1e-6, message: 'Take columns 1 and 3 of the original table with A(:,[1 3]).' }, { name: 'weights', expected: [4, 1], tolerance: 1e-6, message: 'Four of column 1 and one of column 3 build the target.' }, { name: 'residual', expected: [0, 0, 0], tolerance: 1e-6, message: 'The target is in the span, so nothing is left over.' }],
      cases: [{ setup: 'A = [1 2 0; 0 0 1; 1 2 1];\ntarget = [2; 3; 5];', checks: [{ name: 'weights', expected: [2, 3], tolerance: 1e-6, message: 'A different target in the same span.' }, { name: 'residual', expected: [0, 0, 0], tolerance: 1e-6, message: 'It can be built exactly too.' }] }],
      hints: ['Compare column 2 with column 1 before counting.', 'Columns 1 and 3 are independent: A(:,[1 3]).', 'weights = basis\\target; then residual = basis*weights - target;'],
      transfer: 'Try target = [4; 1; 6]. The rank of A has not changed, so why is the leftover no longer zero? What does that say about whether this target is in the span?',
    },
  },
  {
    id: 'laml-lu-pivoting', module: 'Solving many equations', title: 'LU and pivoting: reuse the work safely', minutes: 30, level: 'Intermediate',
    objective: 'Use a pivoted LU factorization to solve a system and verify the permutation convention.',
    prose: [
      'The matrix [0 2;1 3] starts with a zero in its first pivot position. Dividing by that entry would fail, even though the equations have a unique solution. Swapping the two rows gives a usable first pivot.',
      'LU factorization records elimination as two triangular matrices. L is lower triangular, with entries above its diagonal equal to zero. U is upper triangular, with zeros below its diagonal. A permutation matrix P records row swaps; the convention used here is P*A=L*U.',
      'Pivoting chooses a larger available pivot rather than dividing by zero or a dangerously tiny value. It changes the order of equations, so it must also reorder b. First solve L*y=P*b, then solve U*x=y. These triangular systems are simpler than the original system.',
      'When many right-hand sides share the same A, its factors can be reused. This is useful for repeated simulations or several output variables. LU here requires a nonsingular square matrix. Rank-deficient or rectangular data needs a different tool, such as least squares or SVD.',
      'The syntax [L,U,P]=lu(A) captures three outputs; square brackets on the left collect results rather than build a matrix. Keep that assignment on its own line. A backslash solves each triangular system. The bar plot shows the recovered unknowns; the printed factor residual checks the row-swap convention.',
    ],
    procedure: ['Compute [L,U,P]=lu(A) and check that P*A-L*U is near zero.', 'Apply the same permutation to the totals by forming P*b.', 'Solve L*y=P*b, then U*x=y; verify A*x-b.'],
    prediction: { question: 'Can you solve L*y=b without permuting b after LU has swapped rows?', answer: 'Generally no. L and U describe the reordered equations P*A, so the right-hand side must be P*b as well.' },
    demo: {
      code: String.raw`A=[0 2;1 3];
b=[4;7];
[L,U,P]=lu(A);
y=L\(P*b);
x=U\y;
disp(P);
disp(P*A-L*U);
disp(x);
disp(A*x-b);
bar(x);
title('Pivoted LU recovers both unknowns');
xlabel('Unknown index');
ylabel('Solved value');`,
      explain: [{ code: '[L,U,P]=lu(A)', meaning: 'Factor A while recording row swaps, including the swap required by its zero leading entry.' }, { code: 'P*A-L*U', meaning: 'This matrix should be zero; it tests which side of A receives the permutation.' }, { code: 'y=L\\(P*b)', meaning: 'Solve the lower triangular system after applying the same row swaps to the totals.' }, { code: 'x=U\\y', meaning: 'Solve the upper triangular system to recover the original unknown order.' }],
    },
    challenge: {
      prompt: 'Factor A into L,U,P. Solve through the factors, storing the intermediate vector in y and final answer in x. Store norm(P*A-L*U) in factorError and A*x-b in residual.',
      setup: 'A=[0 2;4 1];\nb=[6;11];',
      starter: 'L=eye(2);\nU=A;\nP=eye(2);\ny=b;\nx=[0;0];\nfactorError=1;\nresidual=A*x-b;',
      solution: String.raw`[L,U,P]=lu(A);
y=L\(P*b);
x=U\y;
factorError=norm(P*A-L*U);
residual=A*x-b;`,
      checks: [{ name: 'P', expected: [[0, 1], [1, 0]], tolerance: 1e-6, message: 'A zero first pivot requires swapping the equations.' }, { name: 'y', expected: [11, 6], tolerance: 1e-6, message: 'Apply P to b before the lower triangular solve.' }, { name: 'x', expected: [2, 3], tolerance: 1e-6, message: 'Solve U*x=y after the lower triangular system.' }, { name: 'factorError', expected: 0, tolerance: 1e-6, message: 'Verify P*A=L*U using the actual factors.' }, { name: 'residual', expected: [0, 0], tolerance: 1e-6, message: 'Check the result in the original equation order.' }],
      hints: ['The first entry of A is zero, so the permutation must swap its two rows.', 'Factor once, then solve the lower system against P*b.', 'Use y=L\\(P*b), x=U\\y, and factorError=norm(P*A-L*U).'],
      transfer: 'Reuse the same L,U,P for b=[2;9] without refactoring A. Explain why the factors stay unchanged.',
    },
  },
  {
    id: 'laml-regression-validation', module: 'Machine learning', title: 'Regression: include an intercept, reserve a test set', minutes: 30, level: 'Intermediate',
    objective: 'Fit an intercept and slope using training observations only, then evaluate held-out mean squared error.',
    prose: [
      'Training observations (0,1), (1,3), and (2,5) lie exactly on output=1+2*input. A new input 4 has an observed output of 10, while that trained rule predicts 9. Perfect training fit did not guarantee perfect future prediction.',
      'The intercept is the predicted output at input zero. A column of ones gives the model a way to represent it. Omitting that column forces the fitted line through the origin, which can bias every prediction when the true baseline is nonzero.',
      'A training set determines the coefficients. A test set holds observations aside until the rule is fixed. Test mean squared error, or MSE, averages the squared differences between test observations and predictions. Squaring penalizes larger misses and prevents positive and negative errors from cancelling.',
      'A test set loses its role as an independent check if you keep tuning the model against it. Use a validation split for repeated choices, and reserve a final test set for evaluation. For time-dependent data, preserve time order rather than letting future measurements inform the past.',
      'ones(length(trainX),1) requests a column of ones with one entry per training row. [ones(...) trainX] puts that intercept feature beside the inputs. In OpenMat, the result is a two-column design matrix. The plot extends the trained rule into the held-out region; the test observations do not participate in the solve.',
    ],
    procedure: ['Separate training and test observations before fitting or choosing preprocessing parameters.', 'Build training and test designs with identical feature ordering and an intercept column.', 'Solve only against trainY, then predict test outputs with the fixed coefficients.', 'Average squared test residuals and report the units and the split used.'],
    prediction: { question: 'If you append the test observations to the training solve, can you still call the resulting error a held-out test error?', answer: 'No. Those observations influenced the coefficients. A held-out estimate requires observations excluded from fitting and model choices.' },
    demo: {
      code: String.raw`trainX=[0;1;2];
trainY=[1;3;5];
testX=[3;4];
testY=[7;10];
trainDesign=[ones(length(trainX),1) trainX];
testDesign=[ones(length(testX),1) testX];
beta=trainDesign\trainY;
predictions=testDesign*beta;
testResidual=testY-predictions;
mse=mean(testResidual.^2);
disp(beta);
disp(predictions);
disp(mse);
plot([0 1 2 3 4],[1 3 5 7 9]);
hold on;
plot(testX,testY);
title('Train at inputs 0–2, evaluate at inputs 3–4');
xlabel('Input');
ylabel('Observed or predicted output');
legend('Trained rule','Held-out observations');`,
      explain: [{ code: 'trainDesign=[ones(length(trainX),1) trainX]', meaning: 'Create the intercept and input columns in that order, so beta means [intercept,slope].' }, { code: 'beta=trainDesign\\trainY', meaning: 'Learn from training outputs only; testY is intentionally absent from this operation.' }, { code: 'predictions=testDesign*beta', meaning: 'Apply the same feature definition to new inputs without refitting.' }, { code: 'mse=mean(testResidual.^2)', meaning: 'The dot in .^ squares each residual separately; their average is 0.5.' }],
    },
    challenge: {
      prompt: 'Create trainDesign and testDesign with a ones column followed by the supplied inputs. Fit beta using only trainY, compute test predictions in predictions, and store mean squared test error in mse.',
      setup: 'trainX=[0;1;2;3];\ntrainY=[2;4;6;8];\ntestX=[4;5];\ntestY=[10;13];',
      starter: 'trainDesign=[ones(length(trainX),1) trainX];\ntestDesign=[ones(length(testX),1) testX];\nbeta=[0;0];\npredictions=testDesign*beta;\nmse=mean((testY-predictions).^2);',
      solution: String.raw`trainDesign=[ones(length(trainX),1) trainX];
testDesign=[ones(length(testX),1) testX];
beta=trainDesign\trainY;
predictions=testDesign*beta;
mse=mean((testY-predictions).^2);`,
      checks: [{ name: 'trainDesign', expected: [[1, 0], [1, 1], [1, 2], [1, 3]], tolerance: 1e-6, message: 'Put the intercept column before the input column.' }, { name: 'beta', expected: [2, 2], tolerance: 1e-6, message: 'Fit the baseline and slope using training data only.' }, { name: 'predictions', expected: [10, 12], tolerance: 1e-6, message: 'Apply the trained coefficients to test inputs without using test outputs.' }, { name: 'mse', expected: 0.5, tolerance: 1e-6, message: 'Average squared test errors, including the miss on the last observation.' }],
      cases: [{ setup: 'trainX=[0;1;2;3];\ntrainY=[2;4;6;8];\ntestX=[4;5];\ntestY=[100;100];', checks: [{ name: 'beta', expected: [2, 2], tolerance: 1e-6, message: 'Changing held-out outputs must not change fitted coefficients.' }, { name: 'predictions', expected: [10, 12], tolerance: 1e-6, message: 'Predictions must be independent of held-out outputs.' }, { name: 'mse', expected: 7922, tolerance: 1e-6, message: 'The new test outputs should affect evaluation, not training.' }] }],
      hints: ['An intercept needs a ones column in both designs.', 'Use trainDesign\\trainY; neither testY nor testDesign belongs in this fitting step.', 'Compute predictions=testDesign*beta, then mse=mean((testY-predictions).^2).'],
      transfer: 'Remove the intercept column and compare training and test errors. Explain why the forced zero baseline changes the slope.',
    },
  },
  {
    id: 'laml-ridge-scaling', module: 'Machine learning', title: 'Conditioning, scaling, and ridge regularization', minutes: 30, level: 'Advanced',
    objective: 'Scale feature columns, fit ridge regression in scaled coordinates, and convert coefficients back to original units.',
    prose: [
      'One feature measures length in meters as [1;2;3]; another measures the same length in millimeters as [1000;2000;3000]. They encode one direction twice. A model can trade coefficients between the columns without changing its predictions.',
      'Conditioning describes how strongly a solution can change when the inputs change slightly. Nearly dependent columns make this problem severe. Singular values measure the strengths of independent directions; a value near zero signals a weak direction. Exact dependence makes ordinary unique coefficient recovery impossible.',
      'Scaling divides each feature by a representative size. Here each column is divided by its Euclidean length, so both scaled columns have unit length. Record those scales from training data and reuse them later. A zero-length column needs separate handling because division by its scale would fail.',
      'Ridge regression minimizes squared prediction error plus lambda times the squared coefficient length. The positive number lambda controls the penalty. In scaled coordinates Z, solve (Z\' *Z+lambda*I)*gamma=Z\' *y. Convert back by dividing each scaled coefficient gamma by its original column scale. This deliberately accepts some fit error to reduce coefficient instability.',
      'eye(2) creates a two-by-two identity matrix. Dividing a column by a scalar scales every entry. The expression scales(1,2) reads the second entry of the computed scale row. The demo has no intercept; when an intercept is included, it is usually left unpenalized. The plotted ridge predictions shrink toward zero. Scaling gives the penalty a meaning independent of whether a feature uses meters or millimeters.',
    ],
    procedure: ['Compute and record one nonzero scale per training feature.', 'Divide columns by their scales to construct Z; apply the same scales to new data.', 'Solve the ridge system with positive lambda, then convert gamma back to original-unit beta.', 'Evaluate predictions and inspect the tradeoff between fit error and coefficient size.'],
    prediction: { question: 'Should ridge penalize a millimeter coefficient and a meter coefficient equally before accounting for their units?', answer: 'Equal raw penalties depend on arbitrary units. Scaling makes equivalent feature directions comparable before applying the coefficient penalty.' },
    demo: {
      code: String.raw`X=[1 1000;2 2000;3 3000];
y=[2;4;6];
scales=[norm(X(:,1)) norm(X(:,2))];
z1=X(:,1)/scales(1,1);
z2=X(:,2)/scales(1,2);
Z=[z1 z2];
lambda=1;
gamma=(Z'*Z+lambda*eye(2))\(Z'*y);
beta=[gamma(1)/scales(1,1);gamma(2)/scales(1,2)];
predictions=X*beta;
disp(scales);
disp(beta);
disp(predictions);
plot([1 2 3],y);
hold on;
plot([1 2 3],predictions);
title('Ridge shrinks a fit with redundant scaled features');
xlabel('Observation');
ylabel('Response');
legend('Observed','Ridge prediction');`,
      explain: [{ code: 'scales=[norm(X(:,1)) norm(X(:,2))]', meaning: 'Measure each feature’s length independently; the second is 1000 times the first.' }, { code: 'z1=X(:,1)/scales(1,1)', meaning: 'Divide the first feature by its own scalar scale; do the same separately for the second before joining them into Z.' }, { code: 'gamma=(Z\'*Z+lambda*eye(2))\\(Z\'*y)', meaning: 'Add a positive penalty to both coefficient directions, making this redundant system solvable.' }, { code: 'beta=[gamma(1)/scales(1,1);gamma(2)/scales(1,2)]', meaning: 'Undo the feature scaling so X*beta uses the original measurement units.' }],
    },
    challenge: {
      prompt: 'Using the supplied positive lambda, compute scales from each column’s norm, scaled design Z, ridge coefficients gamma, original-unit coefficients beta, and predictions=X*beta. The model has no intercept.',
      setup: 'X=[1 1000;2 2000;3 3000];\ny=[2;4;6];\nlambda=1;',
      starter: 'scales=[1 1];\nZ=X;\ngamma=[0;0];\nbeta=gamma;\npredictions=X*beta;',
      solution: String.raw`scales=[norm(X(:,1)) norm(X(:,2))];
z1=X(:,1)/scales(1,1);
z2=X(:,2)/scales(1,2);
Z=[z1 z2];
gamma=(Z'*Z+lambda*eye(2))\(Z'*y);
beta=[gamma(1)/scales(1,1);gamma(2)/scales(1,2)];
predictions=X*beta;`,
      checks: [{ name: 'scales', expected: [[Math.sqrt(14), 1000 * Math.sqrt(14)]], tolerance: 1e-6, message: 'Compute one norm per feature; do not let the larger unit dominate both scales.' }, { name: 'Z', expected: [[1 / Math.sqrt(14), 1 / Math.sqrt(14)], [2 / Math.sqrt(14), 2 / Math.sqrt(14)], [3 / Math.sqrt(14), 3 / Math.sqrt(14)]], tolerance: 1e-6, message: 'Divide each feature by its own scale.' }, { name: 'beta', expected: [2 / 3, 1 / 1500], tolerance: 1e-6, message: 'Convert gamma back to the original units after the ridge solve.' }, { name: 'predictions', expected: [4 / 3, 8 / 3, 4], tolerance: 1e-6, message: 'Positive ridge penalty shrinks these predictions below the exact interpolating values.' }],
      cases: [{ setup: 'X=[1 1000;2 2000;3 3000];\ny=[3;6;9];\nlambda=1;', checks: [{ name: 'beta', expected: [1, 0.001], tolerance: 1e-6, message: 'Recompute coefficients from the supplied response values.' }, { name: 'predictions', expected: [2, 4, 6], tolerance: 1e-6, message: 'Prediction must use coefficients converted to the original units.' }] }],
      hints: ['Scale each column separately with norm(X(:,j)); scales is a one-row matrix.', 'Fit gamma using Z, adding lambda*eye(2) to Z\'*Z.', 'Divide gamma(1) by scales(1,1) and gamma(2) by scales(1,2) before multiplying X*beta.'],
      transfer: 'Repeat with lambda=0.1 and lambda=10. Compare fit error and coefficient size, then explain why training error alone cannot choose lambda.',
    },
  },
  {
    id: 'laml-covariance-pca', module: 'The SVD: the shape of any matrix', title: 'Covariance and PCA: find the data’s main direction', minutes: 30, level: 'Advanced',
    why: { title: 'A table of measurements is a picture too', story: 'Measure the height and arm span of a class, or the size and price of houses, and the points lie in a cloud stretched along one direction. Principal component analysis (PCA) finds that direction, so two or two hundred measurements can be summarised by a few numbers that keep most of the spread. It is the SVD layers of the previous lessons, applied to data after subtracting the averages.' },
    objective: 'Center two features, form sample covariance, and compute a one-component PCA reconstruction with a sign-invariant projector.',
    prose: [
      'The four points (-2,-1), (-1,-2), (1,2), and (2,1) vary mostly along the diagonal where both features increase together. A single coordinate along that diagonal preserves much of their spread, while the perpendicular difference varies less.',
      'Centering subtracts each feature’s mean from that feature. The centered matrix C has one row per observation and zero mean in every column. Sample covariance is C\' *C divided by n-1, where n is the number of observations. Diagonal entries measure individual feature variance; off-diagonal entries measure joint variation.',
      'Principal component analysis, or PCA, chooses perpendicular directions with the greatest variance. For a real covariance matrix, its eigenvectors are those directions and eigenvalues are their variances. The largest eigenvalue belongs to the first principal component. The explained-variance ratio divides a selected eigenvalue by the sum of all eigenvalues.',
      'Projecting centered rows onto a unit component gives scores, one coordinate per observation. The projector onto the component line is unchanged if the component reverses sign. Reconstruct in centered coordinates, then add the feature means back. PCA maximizes variance retained by a linear projection; it does not use class labels or guarantee predictive value.',
      'Use [mean(X(:,1)) mean(X(:,2))] to compute feature means explicitly: OpenMat’s mean(X) averages the whole array. repmat(mu,n,1) repeats a mean row n times. The demo draws the centered data and a diagonal reference direction; the printed covariance and variance ratio quantify what the eye sees.',
    ],
    procedure: ['Compute feature means from training rows and subtract them column by column.', 'Form covariance C\' *C/(n-1) with at least two observations.', 'Select the eigenvector with the largest eigenvalue and compute its explained-variance ratio.', 'Project, reconstruct, add means back, and measure the information lost.'],
    prediction: { question: 'If a PCA implementation returns the opposite sign for the leading eigenvector, does the reconstructed data change?', answer: 'No. Scores reverse sign too, leaving their product unchanged. The component line and its projection matrix are identical.' },
    demo: {
      code: String.raw`X=[-2 -1;-1 -2;1 2;2 1];
mu=[mean(X(:,1)) mean(X(:,2))];
C=X-repmat(mu,4,1);
covariance=C'*C/3;
[Q,D]=eig(covariance);
component=Q(:,2);
ratio=D(2,2)/trace(D);
disp(mu);
disp(covariance);
disp(component);
disp(ratio);
scatter(C(:,1),C(:,2));
hold on;
plot([-2.5 2.5],[-2.5 2.5]);
title('Most variation follows the shared diagonal');
xlabel('Centered feature 1');
ylabel('Centered feature 2');
legend('Centered observations','Leading component line');`,
      explain: [{ code: 'mu=[mean(X(:,1)) mean(X(:,2))]', meaning: 'Compute a separate average for each feature rather than one global average.' }, { code: 'covariance=C\'*C/3', meaning: 'Combine centered feature products and divide by n-1=3 for sample covariance.' }, { code: 'component=Q(:,2)', meaning: 'For this two-feature example, eig returns the larger eigenvalue second, so its matching column is the leading direction.' }, { code: 'ratio=D(2,2)/trace(D)', meaning: 'The leading variance is 6 out of total variance 20/3, retaining 90 percent.' }],
    },
    challenge: {
      prompt: 'Compute feature means mu, centered data C, and sample covariance covariance. Use eig to build projector=Q*diag([0 1])*Q\', selecting this example’s larger second eigenvalue. Store its variance ratio in ratio, reconstructed data in reconstructed, and total squared reconstruction error in squaredError.',
      setup: 'X=[1 2;2 1;4 3;3 4];',
      starter: 'mu=[0 0];\nC=X;\ncovariance=eye(2);\nprojector=eye(2);\nratio=1;\nreconstructed=X;\nsquaredError=0;',
      solution: String.raw`mu=[mean(X(:,1)) mean(X(:,2))];
n=size(X,1);
C=X-repmat(mu,n,1);
covariance=C'*C/(n-1);
[Q,D]=eig(covariance);
projector=Q*diag([0 1])*Q';
ratio=D(2,2)/trace(D);
reconstructed=C*projector+repmat(mu,n,1);
squaredError=sum(sum((X-reconstructed).^2));`,
      checks: [{ name: 'mu', expected: [[2.5, 2.5]], tolerance: 1e-6, message: 'Center each feature separately before forming covariance.' }, { name: 'covariance', expected: [[5 / 3, 1], [1, 5 / 3]], tolerance: 1e-6, message: 'Use centered data and the sample denominator n-1.' }, { name: 'projector', expected: [[0.5, 0.5], [0.5, 0.5]], tolerance: 1e-6, message: 'Keep only the direction with the largest variance; the projector is independent of eigenvector sign.' }, { name: 'ratio', expected: 0.8, tolerance: 1e-6, message: 'Divide retained variance by the sum of both eigenvalues.' }, { name: 'reconstructed', expected: [[1.5, 1.5], [1.5, 1.5], [3.5, 3.5], [3.5, 3.5]], tolerance: 1e-6, message: 'Project centered observations, then restore their feature means.' }, { name: 'squaredError', expected: 2, tolerance: 1e-6, message: 'Add squared errors across every observation and feature.' }],
      cases: [{ setup: 'X=[11 2;12 1;14 3;13 4];', checks: [{ name: 'mu', expected: [[12.5, 2.5]], tolerance: 1e-6, message: 'Use one mean per feature; translating one feature changes only its own mean.' }, { name: 'covariance', expected: [[5 / 3, 1], [1, 5 / 3]], tolerance: 1e-6, message: 'Proper centering makes covariance invariant to a feature translation.' }, { name: 'squaredError', expected: 2, tolerance: 1e-6, message: 'Translation should not change the lost centered variation.' }] }],
      hints: ['Start with two explicit column means, then subtract repmat(mu,n,1).', 'Covariance is C\'*C/(n-1); the larger second eigenvalue supplies the retained direction here.', 'Use Q*diag([0 1])*Q\' as a sign-invariant projector, then restore mu after C*projector.'],
      transfer: 'Multiply just one feature by 100 and repeat PCA. Explain why centering alone does not remove unit sensitivity, and compare with standardizing feature scales.',
    },
  },
]
