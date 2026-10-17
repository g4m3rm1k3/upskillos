// OpenMat exercises use explicit column means and factor products so the same
// mathematics works with OpenMat's flat vector representation.
export const core = [
  {
    id: 'laml-span-rank', module: 'Spaces and bases', title: 'Span, independence, and redundant features', minutes: 30, level: 'Intermediate',
    objective: 'Identify a redundant feature column, compute rank, and reconstruct a target from an independent basis.',
    prose: [
      'A sensor table has columns [1;0;1], [0;1;1], and [1;1;2]. The third column is exactly the first plus the second. Saving it adds a feature name, but adds no new direction that a linear model can express.',
      'The span of several vectors is the set of all weighted sums of those vectors. A target lies in the span if some weights reconstruct it exactly. A basis is an independent set that spans the same space. Independence means that no vector in the set can be written as a combination of the others.',
      'Rank counts independent directions, rather than columns or nonzero entries. Here three columns have rank 2. Leading columns in a reduced matrix identify independent columns of the original matrix. Use the original columns for a basis; row reduction changes their coordinates.',
      'A feature table can be wide yet have little rank because duplicated or derived measurements carry the same information. Near dependence is harder: a tiny amount of noise can make rank appear full while solving becomes sensitive. Later lessons use singular values and scaling to diagnose that situation.',
      'The expression A(:,[1 2]) selects all rows and columns 1 and 2. A colon alone means every index along that dimension. The plot compares the original third feature with its reconstruction across observations; matching curves demonstrate redundancy, not three independent directions.',
    ],
    procedure: ['Inspect how each feature column is constructed and test suspected combinations.', 'Reduce A or compute rank(A), then select independent original columns as B.', 'Solve B*weights=target and inspect the reconstruction error rather than assuming every target belongs to the span.'],
    prediction: { question: 'If a fourth feature is twice the third feature, does the rank increase from 2 to 3?', answer: 'No. The fourth feature remains in the same span; a new column increases rank only when it adds an independent direction.' },
    demo: {
      code: String.raw`A=[1 0 1;0 1 1;1 1 2];
B=A(:,[1 2]);
target=A(:,3);
weights=B\target;
rebuilt=B*weights;
disp(rank(A));
disp(rref(A));
disp(weights);
plot([1 2 3],target);
hold on;
plot([1 2 3],rebuilt);
title('A third feature adds no new direction');
xlabel('Observation');
ylabel('Feature value');
legend('Original third column','First plus second');`,
      explain: [{ code: 'B=A(:,[1 2])', meaning: 'Keep the first two original features as a candidate basis.' }, { code: 'weights=B\\target', meaning: 'Find weights [1,1] that reconstruct the target from those basis columns.' }, { code: 'rank(A)', meaning: 'Count independent directions. The answer is 2 even though A has three columns.' }, { code: 'rebuilt=B*weights', meaning: 'Use the computed weights to test the geometric claim against actual values.' }],
    },
    challenge: {
      prompt: 'For feature table A, store its rank in featureRank. Select original columns 1 and 3 into basis, solve basis*weights=target, and store the reconstruction residual in residual.',
      setup: 'A=[1 2 0;0 0 1;1 2 1];\ntarget=[4;1;5];',
      starter: 'featureRank=3;\nbasis=A(:,[1 2]);\nweights=[0;0];\nresidual=basis*weights-target;',
      solution: String.raw`featureRank=rank(A);
basis=A(:,[1 3]);
weights=basis\target;
residual=basis*weights-target;`,
      checks: [{ name: 'featureRank', expected: 2, tolerance: 1e-6, message: 'The second feature is twice the first; it contributes no new direction.' }, { name: 'basis', expected: [[1, 0], [0, 1], [1, 1]], tolerance: 1e-6, message: 'Use independent columns from the original matrix.' }, { name: 'weights', expected: [4, 1], tolerance: 1e-6, message: 'Choose weights that reconstruct all three target coordinates.' }, { name: 'residual', expected: [0, 0, 0], tolerance: 1e-6, message: 'The target belongs to this span, so every reconstruction residual should vanish.' }],
      hints: ['Compare column 2 with column 1 before counting independent directions.', 'Columns 1 and 3 are independent; select them with A(:,[1 3]).', 'Use weights=basis\\target and subtract target from basis*weights to verify your result.'],
      transfer: 'Try target=[4;1;6]. Explain why the least-squares result now leaves a nonzero residual even though the matrix rank is unchanged.',
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
bar([1 2],x);
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
    id: 'laml-orthogonal-qr', module: 'Least squares and data', title: 'Orthogonality and QR: separate overlapping information', minutes: 30, level: 'Intermediate',
    objective: 'Apply Gram–Schmidt to two independent columns and verify an orthonormal basis and its QR factorization.',
    prose: [
      'The features [1;1;0] and [1;1;2] overlap in their first two entries. Subtract the first direction from the second and the leftover points only along [0;0;2]. This separates shared information from new information.',
      'Two vectors are orthogonal when their dot product is zero. A unit vector has length 1. An orthonormal collection has both properties: every vector has unit length, and distinct vectors are perpendicular. For an orthonormal basis Q, the matrix Q\' *Q is the identity.',
      'Gram–Schmidt first normalizes the initial column into q1. It measures the second column along q1 using q1\' *b, subtracts that component, and normalizes the remainder into q2. If the remainder is zero, the second column was dependent and cannot supply a new basis direction.',
      'The factorization A=Q*R records this process. Q holds perpendicular unit directions; R stores the weights needed to reconstruct each original column. Numerical software usually computes QR with more stable transformations than basic Gram–Schmidt, but this small example exposes exactly what the factors mean.',
      'A(:,1) selects the first column. An apostrophe transposes a real matrix; for real vectors the expression q1\' *b computes the dot product. The bracket expression [q1 q2] places the two vectors side by side. The plotted coordinates are not themselves angles: use the printed Q\' *Q to verify perpendicularity.',
    ],
    procedure: ['Normalize the first column: q1=a/norm(a).', 'Subtract the second column’s projection on q1, then normalize that remainder.', 'Build Q from the unit columns and compute R=Q\' *A.', 'Check Q\' *Q against the identity and Q*R against the original matrix.'],
    prediction: { question: 'What happens if the second column becomes exactly twice the first?', answer: 'Its perpendicular remainder is zero. Normalizing that remainder would divide by zero, so there is no second independent direction.' },
    demo: {
      code: String.raw`A=[1 1;1 1;0 2];
a=A(:,1);
b=A(:,2);
q1=a/norm(a);
remainder=b-q1*(q1'*b);
q2=remainder/norm(remainder);
Q=[q1 q2];
R=Q'*A;
disp(Q'*Q);
disp(R);
disp(sqrt(sum(sum((A-Q*R).^2))));
plot([1 2 3],q1);
hold on;
plot([1 2 3],q2);
title('Two perpendicular unit feature directions');
xlabel('Observation coordinate');
ylabel('Basis vector component');
legend('q1','q2');`,
      explain: [{ code: 'q1=a/norm(a)', meaning: 'Divide by length so the first direction has unit length.' }, { code: 'remainder=b-q1*(q1\'*b)', meaning: 'Remove precisely the component of b that lies along q1.' }, { code: 'R=Q\'*A', meaning: 'Measure the original columns in the new perpendicular coordinate system.' }, { code: 'Q\'*Q', meaning: 'Diagonal ones verify unit length; off-diagonal zeros verify orthogonality.' }],
    },
    challenge: {
      prompt: 'Apply the two-column Gram–Schmidt procedure to A. Store its orthonormal basis in Q, R=Q\' *A in R, Q\' *Q in gram, and the square root of the total squared reconstruction entry errors in reconstructionError. Normalize each nonzero remainder with a positive length.',
      setup: 'A=[1 1;1 1;0 2];',
      starter: 'Q=A;\nR=eye(2);\ngram=Q\'*Q;\nreconstructionError=sqrt(sum(sum((A-Q*R).^2)));',
      solution: String.raw`a=A(:,1);
b=A(:,2);
q1=a/norm(a);
remainder=b-q1*(q1'*b);
q2=remainder/norm(remainder);
Q=[q1 q2];
R=Q'*A;
gram=Q'*Q;
reconstructionError=sqrt(sum(sum((A-Q*R).^2)));`,
      checks: [{ name: 'Q', expected: [[Math.SQRT1_2, 0], [Math.SQRT1_2, 0], [0, 1]], tolerance: 1e-6, message: 'Remove the parallel component before normalizing the second column.' }, { name: 'R', expected: [[Math.SQRT2, Math.SQRT2], [0, 2]], tolerance: 1e-6, message: 'R contains each original feature’s coordinates along Q.' }, { name: 'gram', expected: [[1, 0], [0, 1]], tolerance: 1e-6, message: 'Unit lengths and perpendicular directions are both required.' }, { name: 'reconstructionError', expected: 0, tolerance: 1e-6, message: 'The factorization must reconstruct the original features.' }],
      hints: ['Normalizing both original columns does not remove their overlap.', 'Subtract q1*(q1\'*b) from the second column before its normalization.', 'Build Q=[q1 q2], then R=Q\'*A; verify both orthogonality and reconstruction.'],
      transfer: 'Replace the second column with [1;1;0.000001]. Explain why classical Gram–Schmidt becomes numerically delicate as the columns approach dependence.',
    },
  },
  {
    id: 'laml-least-squares', module: 'Least squares and data', title: 'Least squares: the residual tells the story', minutes: 30, level: 'Intermediate',
    objective: 'Fit an inconsistent system and verify that the least-squares residual is perpendicular to every design column.',
    prose: [
      'Three observations have inputs 0, 1, 2 and outputs 1, 2, 2. No single straight line passes through all three points. A fitted line with intercept 7/6 and slope 1/2 predicts values 7/6, 5/3, and 13/6 instead.',
      'A design matrix stores the features used to make predictions. Here its first column is all ones for the intercept, and its second column contains inputs. Multiplying this matrix X by coefficients beta produces fitted outputs. Define the residual r=y-X*beta, the observed output minus the prediction.',
      'Least squares chooses beta to minimize the sum of squared residuals, written r\' *r. At the optimum, the residual is perpendicular to every column of X: X\' *r=0. Predictions are the closest point to y within the column span; a nonzero residual is expected when y lies outside that span.',
      'For full-column-rank X, QR or a suitable least-squares solver finds the unique coefficients. Solving X\' *X*beta=X\' *y gives the normal equations, but can amplify poor conditioning. Prefer a direct least-squares solve rather than explicitly inverting X\' *X. Rank-deficient designs can have multiple optimal coefficient vectors.',
      'In the demo, X\\y handles the rectangular system as a least-squares problem. The apostrophe turns X into a transposed matrix. The two plotted curves distinguish observed outputs from predictions; the printed X\' *r checks a geometric property that a visually plausible line alone cannot prove.',
    ],
    procedure: ['Construct one design row per observation, including an intercept column when the model needs one.', 'Solve for beta, compute fitted=X*beta, then residual=y-fitted.', 'Compute the squared error and X\' *residual; the latter should be near zero for an unconstrained least-squares optimum.'],
    prediction: { question: 'Does a correct least-squares solution force every residual to zero?', answer: 'No. It makes their squared total as small as possible. For inconsistent data, the remaining residual is nonzero but perpendicular to every design column.' },
    demo: {
      code: String.raw`X=[1 0;1 1;1 2];
y=[1;2;2];
beta=X\y;
fitted=X*beta;
residual=y-fitted;
disp(beta);
disp(residual);
disp(X'*residual);
disp(residual'*residual);
plot([0 1 2],y);
hold on;
plot([0 1 2],fitted);
title('A best fit can still miss every observation');
xlabel('Input');
ylabel('Output');
legend('Observed','Least-squares prediction');`,
      explain: [{ code: 'X=[1 0;1 1;1 2]', meaning: 'Each row predicts intercept plus slope times that observation’s input.' }, { code: 'beta=X\\y', meaning: 'Find coefficients minimizing squared prediction error for this rectangular system.' }, { code: 'residual=y-fitted', meaning: 'Keep the sign convention consistent: positive means the observation is above its prediction.' }, { code: 'X\'*residual', meaning: 'Check that no design direction can explain any remaining residual; the answer is near [0,0].' }],
    },
    challenge: {
      prompt: 'Fit X*beta to y. Store beta, residual=y-X*beta, normalResidual=X\' *residual, and sse=residual\' *residual. The four noisy observations cannot all fit exactly.',
      setup: 'X=[1 0;1 1;1 2;1 3];\ny=[1;2;2;4];',
      starter: 'beta=[0;0];\nresidual=y-X*beta;\nnormalResidual=X\'*residual;\nsse=residual\'*residual;',
      solution: String.raw`beta=X\y;
residual=y-X*beta;
normalResidual=X'*residual;
sse=residual'*residual;`,
      checks: [{ name: 'beta', expected: [0.9, 0.9], tolerance: 1e-6, message: 'The first coefficient is the intercept and the second is the slope.' }, { name: 'residual', expected: [0.1, 0.2, -0.7, 0.4], tolerance: 1e-6, message: 'Subtract predictions from observations, keeping each observation in its original order.' }, { name: 'normalResidual', expected: [0, 0], tolerance: 1e-6, message: 'At the least-squares solution the residual must be perpendicular to both design columns.' }, { name: 'sse', expected: 0.7, tolerance: 1e-6, message: 'Square residuals before adding; signed errors can cancel.' }],
      cases: [{ setup: 'X=[1 0;1 1;1 2;1 3];\ny=[0;1;1;2];', checks: [{ name: 'beta', expected: [0.1, 0.6], tolerance: 1e-6, message: 'Fit the supplied outputs rather than entering a remembered coefficient vector.' }, { name: 'sse', expected: 0.2, tolerance: 1e-6, message: 'Recalculate the squared residual total for these observations.' }] }],
      hints: ['Use the same two-column design for every observation.', 'A rectangular backslash solve finds the least-squares coefficients.', 'Compute beta=X\\y, residual=y-X*beta, normalResidual=X\'*residual, and sse=residual\'*residual.'],
      transfer: 'Double every output y. Predict how beta, residual, and sse change, then verify: coefficients and residuals double, while sse quadruples.',
    },
  },
  {
    id: 'laml-regression-validation', module: 'Least squares and data', title: 'Regression: include an intercept, reserve a test set', minutes: 30, level: 'Intermediate',
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
    id: 'laml-ridge-scaling', module: 'Least squares and data', title: 'Conditioning, scaling, and ridge regularization', minutes: 30, level: 'Advanced',
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
    id: 'laml-eigen-iteration', module: 'Spectral thinking', title: 'Eigenpairs and repeated transformation', minutes: 30, level: 'Advanced',
    objective: 'Use normalized power iteration to estimate a dominant eigenvector and verify its eigenvalue with a residual.',
    prose: [
      'Multiplying [1;1] by [2 1;1 2] gives [3;3]. Its direction stays the same while its length triples. Multiplying [1;-1] gives [1;-1], preserving that direction with a scale of 1.',
      'An eigenvector is a nonzero direction v that a square matrix maps onto itself, scaled by an eigenvalue lambda: A*v=lambda*v. The zero vector is excluded because it satisfies that equation for every lambda and identifies no direction. Eigenvalues describe behavior under repeated transformation.',
      'Power iteration repeatedly applies A and normalizes the result to prevent growth from overwhelming the calculation. When one eigenvalue has uniquely greatest magnitude and the starting vector has a component in its direction, that direction tends to dominate. Equal leading magnitudes, a missing starting component, or complex rotational behavior can prevent this simple method from converging as intended.',
      'For a unit real vector v, the Rayleigh quotient v\' *A*v estimates its eigenvalue. Verify an estimated eigenpair with norm(A*v-lambda*v), the eigenpair residual. A stable-looking sequence alone is insufficient. The sign of an eigenvector is arbitrary: v and -v describe the same line.',
      'A for loop repeats the indented statements; end closes it. history(k)=... stores one value at MATLAB index k, starting at 1. The demo plot tracks the estimated scale after each normalized step. An eigenvector may stretch or reverse; its defining feature is a preserved line, not a fixed length.',
    ],
    procedure: ['Choose a nonzero starting vector and normalize it.', 'Repeatedly compute A*v, then divide by the new length.', 'Estimate lambda using v\' *A*v and compute the eigenpair residual.', 'Check convergence assumptions before interpreting the result as the dominant mode.'],
    prediction: { question: 'For A=[2 1;1 2], what happens if the starting vector is exactly [1;-1]?', answer: 'It stays in the eigenvalue-1 direction forever. It has no component along the dominant [1;1] direction, so power iteration cannot discover that missing component.' },
    demo: {
      code: String.raw`A=[2 1;1 2];
v=[1;0];
history=zeros(1,10);
for k=1:10
  v=A*v;
  v=v/norm(v);
  history(k)=v'*A*v;
end
lambda=v'*A*v;
disp(v);
disp(lambda);
disp(norm(A*v-lambda*v));
plot(1:10,history);
title('Power iteration approaches the dominant scale 3');
xlabel('Iteration');
ylabel('Rayleigh quotient');`,
      explain: [{ code: 'v=A*v', meaning: 'Apply the transformation again; directions with larger eigenvalue magnitude gain relative weight.' }, { code: 'v=v/norm(v)', meaning: 'Keep the vector’s length equal to 1 while retaining its direction.' }, { code: 'history(k)=v\'*A*v', meaning: 'Record the estimated scale after this iteration.' }, { code: 'norm(A*v-lambda*v)', meaning: 'Measure whether the final vector really obeys the eigenpair equation.' }],
    },
    challenge: {
      prompt: 'Run 30 normalized power steps from the supplied v. Store the final vector in v, the Rayleigh quotient in lambda, and norm(A*v-lambda*v) in eigenResidual. Either overall vector sign is valid.',
      setup: 'A=[4 1;1 4];\nv=[1;0];',
      starter: 'v=v/norm(v);\nlambda=v\'*A*v;\neigenResidual=norm(A*v-lambda*v);',
      solution: String.raw`for k=1:30
  v=A*v;
  v=v/norm(v);
end
lambda=v'*A*v;
eigenResidual=norm(A*v-lambda*v);`,
      checks: [{ name: 'v', expected: [Math.SQRT1_2, Math.SQRT1_2], kind: 'abs', tolerance: 1e-6, message: 'Repeated normalized multiplication should approach the dominant direction, not stay at the initial coordinate axis.' }, { name: 'lambda', expected: 5, tolerance: 1e-6, message: 'Compute the scale of the converged vector with its Rayleigh quotient.' }, { name: 'eigenResidual', expected: 0, tolerance: 1e-6, message: 'Check A*v against lambda*v; stop only when their difference is small.' }],
      cases: [{ setup: 'A=[3 1;1 3];\nv=[1;0];', checks: [{ name: 'lambda', expected: 4, tolerance: 1e-6, message: 'Estimate the eigenvalue from A rather than entering a constant.' }, { name: 'eigenResidual', expected: 0, tolerance: 1e-6, message: 'The final pair must satisfy the supplied transformation.' }] }],
      hints: ['One matrix multiplication is not enough; use a loop.', 'Normalize immediately after every A*v multiplication.', 'After 30 steps compute lambda=v\'*A*v and eigenResidual=norm(A*v-lambda*v).'],
      transfer: 'Try A=[0 -1;1 0]. Describe the repeated rotation and explain why this real-vector power iteration does not settle onto a fixed real direction.',
    },
  },
  {
    id: 'laml-symmetric-quadratic', module: 'Spectral thinking', title: 'Symmetric matrices and quadratic energy', minutes: 30, level: 'Advanced',
    objective: 'Diagonalize a real symmetric matrix and compute the same quadratic energy in original and eigenvector coordinates.',
    prose: [
      'For H=[3 1;1 3], the vector [1;1] stretches by 4, while [1;-1] stretches by 2. These two directions are perpendicular. The expression x\' *H*x assigns the vector [1;2] an energy of 19.',
      'A real symmetric matrix equals its transpose. It has real eigenvalues and can be described using an orthonormal basis of eigenvectors. Put those unit eigenvectors in columns of Q and their eigenvalues on the diagonal of D. Then H=Q*D*Q\' and Q\' *Q=I.',
      'A quadratic form is the scalar energy x\' *H*x. Change coordinates with z=Q\' *x. In those coordinates, energy becomes z\' *D*z: a weighted sum of squared coordinates. The eigenvectors identify the principal directions, and eigenvalues give their weights.',
      'If every eigenvalue is positive, every nonzero vector has positive energy; the matrix is positive definite. A negative eigenvalue creates a direction of negative energy. Zero eigenvalues create flat directions. This distinction matters when a matrix describes curvature of a machine-learning loss function.',
      'The assignment [Q,D]=eig(H) returns vectors and their matching diagonal values. An apostrophe on Q changes basis back from perpendicular coordinates. Eigenvector signs may differ between implementations, but reconstruction and energy do not. The plot compares the two energy calculations and should show equal bars.',
    ],
    procedure: ['Verify that H is real symmetric before using orthogonal diagonalization.', 'Compute Q,D and check both Q\' *Q=I and Q*D*Q\'=H.', 'Transform x to z=Q\' *x and compute energy in both coordinate systems.', 'Inspect eigenvalue signs to distinguish positive, flat, and negative directions.'],
    prediction: { question: 'If one diagonal entry of D is negative, can x\' *H*x still be positive for every nonzero x?', answer: 'No. Choose x along that entry’s eigenvector; the energy is that negative eigenvalue times a positive squared length.' },
    demo: {
      code: String.raw`H=[3 1;1 3];
x=[1;2];
[Q,D]=eig(H);
z=Q'*x;
energy=x'*H*x;
diagonalEnergy=z'*D*z;
disp(D);
disp(Q'*Q);
disp(norm(H-Q*D*Q'));
disp([energy diagonalEnergy]);
bar([1 2],[energy diagonalEnergy]);
title('Changing coordinates preserves quadratic energy');
xlabel('1: original coordinates, 2: eigenvector coordinates');
ylabel('Quadratic energy');`,
      explain: [{ code: '[Q,D]=eig(H)', meaning: 'Obtain matching eigenvectors and eigenvalues of this real symmetric matrix.' }, { code: 'z=Q\'*x', meaning: 'Measure x along the perpendicular eigenvector directions.' }, { code: 'diagonalEnergy=z\'*D*z', meaning: 'Compute the weighted squared coordinates; no mixed terms remain in this basis.' }, { code: 'H-Q*D*Q\'', meaning: 'Reconstruct the original operator to verify the factorization independently of eigenvector signs.' }],
    },
    challenge: {
      prompt: 'For the symmetric H, compute Q,D from eig. Store Q\' *Q in gram, norm(H-Q*D*Q\') in reconstructionError, x\' *H*x in energy, and the same energy in eigenvector coordinates in diagonalEnergy.',
      setup: 'H=[5 2;2 2];\nx=[2;-1];',
      starter: 'Q=eye(2);\nD=eye(2);\ngram=Q\'*Q;\nreconstructionError=norm(H-Q*D*Q\');\nenergy=0;\ndiagonalEnergy=0;',
      solution: String.raw`[Q,D]=eig(H);
gram=Q'*Q;
reconstructionError=norm(H-Q*D*Q');
energy=x'*H*x;
z=Q'*x;
diagonalEnergy=z'*D*z;`,
      checks: [{ name: 'D', expected: [[1, 0], [0, 6]], tolerance: 1e-6, message: 'These eigenvalues describe the two positive principal curvatures.' }, { name: 'gram', expected: [[1, 0], [0, 1]], tolerance: 1e-6, message: 'Symmetric diagonalization uses orthonormal eigenvectors.' }, { name: 'reconstructionError', expected: 0, tolerance: 1e-6, message: 'Keep each eigenvalue paired with its eigenvector column.' }, { name: 'energy', expected: 14, tolerance: 1e-6, message: 'Compute the quadratic form using the supplied vector and original matrix.' }, { name: 'diagonalEnergy', expected: 14, tolerance: 1e-6, message: 'Transform x with Q transpose before using D.' }],
      hints: ['Use two outputs from eig so vector columns remain paired with eigenvalues.', 'Compute z=Q\'*x; multiplying D by the original x would use the wrong coordinates.', 'Check energy=x\'*H*x and diagonalEnergy=z\'*D*z after z=Q\'*x.'],
      transfer: 'Change H to [1 2;2 1]. Find a vector with negative quadratic energy and explain what its eigenvalue says about a minimum.',
    },
  },
  {
    id: 'laml-covariance-pca', module: 'Spectral thinking', title: 'Covariance and PCA: find the data’s main direction', minutes: 30, level: 'Advanced',
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
  {
    id: 'laml-svd-low-rank', module: 'Spectral thinking', title: 'SVD: compress a matrix and measure the loss', minutes: 30, level: 'Advanced',
    objective: 'Construct a rank-one matrix approximation from SVD and quantify discarded squared energy.',
    prose: [
      'A three-by-two data matrix [3 0;0 1;0 0] contains one strong direction of size 3 and one weaker direction of size 1. Keeping only the strong direction reconstructs [3 0;0 0;0 0], losing just the entry of size 1.',
      'The singular value decomposition, or SVD, writes a real matrix as U*S*V\'. Columns of V identify input directions; S contains nonnegative singular values; columns of U identify corresponding output directions. It works for rectangular matrices, so it can describe observation-by-feature data directly.',
      'A low-rank approximation keeps the largest singular values and replaces the others by zero. Rank counts the retained independent directions. The best rank-k approximation in total squared entry error comes from keeping the k largest singular values. Discarded singular values predict its squared error: add their squares.',
      'Squared matrix energy means the sum of squared entries, also called the squared Frobenius norm. The same energy equals the sum of squared singular values. Retained energy divides the squared kept singular values by that total. For an all-zero matrix, total energy is zero, so that fraction needs an explicit convention. A high energy fraction measures reconstruction quality, not whether useful labels or rare events were preserved.',
      'The syntax [U,S,V]=svd(A) collects three factors. Set Sk=S and replace Sk(2,2) with zero before multiplying U*Sk*V\'. This factor product also avoids relying on row-versus-column conventions for single vectors in OpenMat. The bar plot exposes the singular strengths rather than hiding loss behind a compressed picture.',
    ],
    procedure: ['Compute U,S,V and verify that their product reconstructs the input.', 'Choose the retained rank, copy S, and zero the discarded diagonal entries.', 'Reconstruct the approximation with the modified diagonal matrix.', 'Measure squared entry error and retained energy; compare them with the discarded singular values.'],
    prediction: { question: 'For singular values 3 and 1, what fraction of squared energy does rank one retain?', answer: 'It retains 3 squared divided by (3 squared plus 1 squared), which is 9/10 or 90 percent. The squared reconstruction error is 1.' },
    demo: {
      code: String.raw`A=[3 0;0 1;0 0];
[U,S,V]=svd(A);
Sk=S;
Sk(2,2)=0;
lowRank=U*Sk*V';
squaredError=sum(sum((A-lowRank).^2));
retainedEnergy=S(1,1)^2/(S(1,1)^2+S(2,2)^2);
disp(S);
disp(lowRank);
disp(squaredError);
disp(retainedEnergy);
bar([1 2],[S(1,1) S(2,2)]);
title('Keep the strong singular direction, discard the weak one');
xlabel('Singular direction, strongest first');
ylabel('Singular value');`,
      explain: [{ code: '[U,S,V]=svd(A)', meaning: 'Factor this rectangular data matrix into input directions, strengths, and output directions.' }, { code: 'Sk(2,2)=0', meaning: 'Discard the weaker singular direction while preserving the factor dimensions.' }, { code: 'lowRank=U*Sk*V\'', meaning: 'Reconstruct with only one nonzero singular value, yielding a rank-one approximation.' }, { code: 'sum(sum((A-lowRank).^2))', meaning: 'Square each entry error and add them all; the discarded singular value predicts this total.' }],
    },
    challenge: {
      prompt: 'Use SVD to form a rank-one approximation lowRank by zeroing the second singular value in a copy of S. Store total squared entry error in squaredError and the fraction of squared singular-value energy retained in retainedEnergy.',
      setup: 'A=[4 0;0 2;0 0];',
      starter: 'lowRank=A;\nsquaredError=0;\nretainedEnergy=1;',
      solution: String.raw`[U,S,V]=svd(A);
Sk=S;
Sk(2,2)=0;
lowRank=U*Sk*V';
squaredError=sum(sum((A-lowRank).^2));
retainedEnergy=S(1,1)^2/(S(1,1)^2+S(2,2)^2);`,
      checks: [{ name: 'lowRank', expected: [[4, 0], [0, 0], [0, 0]], tolerance: 1e-6, message: 'Discard the weaker singular direction; returning the original matrix has rank two.' }, { name: 'squaredError', expected: 4, tolerance: 1e-6, message: 'The discarded singular value is 2, so its contribution to squared error is 4.' }, { name: 'retainedEnergy', expected: 0.8, tolerance: 1e-6, message: 'Use squared singular values for energy, not their unsquared sum.' }],
      cases: [{ setup: 'A=[3 0;0 1;0 0];', checks: [{ name: 'lowRank', expected: [[3, 0], [0, 0], [0, 0]], tolerance: 1e-6, message: 'Recompute the approximation from the supplied matrix.' }, { name: 'squaredError', expected: 1, tolerance: 1e-6, message: 'The squared discarded singular value determines the new loss.' }, { name: 'retainedEnergy', expected: 0.9, tolerance: 1e-6, message: 'Recalculate retained energy from the actual singular values.' }] }],
      hints: ['Capture all three SVD outputs and copy S before editing its second diagonal entry.', 'Set Sk(2,2)=0, then reconstruct U*Sk*V\'.', 'Compare sum(sum((A-lowRank).^2)) with S(2,2)^2; retained energy uses S(1,1)^2 divided by both squared values.'],
      transfer: 'Try A=[3 1;1 3;0 0], where no individual entry alone represents the weak direction. Verify that truncating SVD still gives the smallest rank-one squared error.',
    },
  },
]
