// The final studios connect the same matrix operations to learning and control.
// All scripts run in the repository's @opencalc/openmat engine.
export const applications = [
  {
    id: 'laml-stable-logistic', module: 'Math for machine learning',
    title: 'Logistic regression without numerical overflow', minutes: 35, level: 'Advanced',
    objective: 'Compute binary probabilities, a stable logistic loss, and its vectorized gradient.',
    prose: [
      'A classifier can produce scores -1000, 0, and 1000 for three examples. The intended probabilities are approximately 0, 0.5, and 1. Evaluating log(1+exp(1000)) overflows on ordinary floating-point machines even though the correctly classified example should contribute almost no loss.',
      'Let X be a design matrix with one row per example, w the coefficient vector, and z=X*w the score vector. The sigmoid probability is p=1/(1+exp(-z)) for a scalar score. For a negative score, use exp(z)/(1+exp(z)); for a nonnegative score, use the first expression. Neither branch exponentiates a large positive number.',
      'The binary target y is either 0 or 1. A stable per-example loss is max(z,0)-y*z+log(1+exp(-abs(z))). Here max(z,0) means entrywise maximum; .* multiplies corresponding entries when z and y are vectors. This expression avoids logarithms of rounded probabilities equal to zero. It remains finite for the extreme scores in the demo.',
      'Average the losses across m examples. The gradient is transpose(X)*(p-y)/m. A confident wrong prediction has a large loss, so saturation does not excuse an incorrect label. The probability curve stays within [0,1] as the score changes; it demonstrates a mapping of scores, not a claim that probabilities are calibrated on unseen data.',
    ],
    procedure: ['Compute score z=X*w and allocate a probability vector p.', 'Evaluate each sigmoid with the branch that exponentiates a nonpositive number.', 'Average max(z,0)-y.*z+log(1+exp(-abs(z))).', 'Compute transpose(X)*(p-y)/m and keep evaluation examples separate from fitting examples.'],
    prediction: { question: 'If score 1000 has target 0, is its stable loss close to 0 or 1000?', answer: 'Close to 1000. The classifier is confidently wrong. Numerical stability preserves that penalty instead of hiding it behind overflow or a clipped probability.' },
    demo: {
      code: `z=[-1000;0;1000];
y=[0;1;1];
p=zeros(3,1);
for i=1:3
  if z(i)>=0
    p(i)=1/(1+exp(-z(i)));
  else
    ez=exp(z(i));
    p(i)=ez/(1+ez);
  end
end
loss=mean(max(z,0)-y.*z+log(1+exp(-abs(z))));
disp('Extreme-score probabilities and finite mean loss');
disp(p);
disp(loss);
scores=-8:0.2:8;
probabilities=1./(1+exp(-scores));
plot(scores,probabilities);
title('Sigmoid maps scores to probabilities');
xlabel('Score');
ylabel('Probability of target 1');`,
      explain: [{ code: 'ez/(1+ez)', meaning: 'For a negative score, exp(z) is at most one and cannot overflow.' }, { code: 'log(1+exp(-abs(z)))', meaning: 'The exponential receives a nonpositive argument even for extreme scores.' }, { code: 'max(z,0)-y.*z', meaning: 'Preserve the large penalty for confidently wrong predictions.' }],
    },
    challenge: {
      prompt: 'Implement the stable probability branches, average loss, and gradient for the supplied design matrix. Save p, loss, and gradient.',
      setup: `X=[1 -1;1 0;1 1];
y=[0;1;1];
w=[0;2];`,
      starter: `p=zeros(3,1);
loss=0;
gradient=zeros(2,1);`,
      solution: `m=size(X,1);
z=X*w;
p=zeros(m,1);
for i=1:m
  if z(i)>=0
    p(i)=1/(1+exp(-z(i)));
  else
    ez=exp(z(i));
    p(i)=ez/(1+ez);
  end
end
loss=sum(max(z,0)-y.*z+log(1+exp(-abs(z))))/m;
gradient=transpose(X)*(p-y)/m;`,
      checks: [{ name: 'p', expected: [0.11920292202211755,0.5,0.8807970779778823], tolerance: 1e-6, message: 'Scores are -2, 0, and 2. Keep the probabilities in the same example order.' }, { name: 'loss', expected: 0.31566773421529676, tolerance: 1e-6, message: 'Average stable per-example losses, including the ambiguous middle example.' }, { name: 'gradient', expected: [-0.1666666666666667,-0.0794686146814117], tolerance: 1e-6, message: 'Use p-y and the transpose of the design matrix, then divide by the row count.' }],
      cases: [{ setup: `X=[1 -1;1 0;1 1];
y=[1;0;0];
w=[0;1000];`, checks: [{ name: 'p', expected: [0,0.5,1], tolerance: 1e-6, message: 'Your probability calculation must remain finite at extreme scores.' }, { name: 'loss', expected: 666.8977157268534, tolerance: 1e-6, message: 'Confidently wrong labels must retain their large finite loss.' }, { name: 'gradient', expected: [1/6,2/3], tolerance: 1e-6, message: 'The gradient still follows p-y when scores saturate.' }] }],
      hints: ['Compute z first. Use a for loop to choose the safe sigmoid branch for each score.', 'Compute the loss from scores rather than log(p) or log(1-p).', 'The middle target is 1 but its probability is 0.5, so the intercept gradient is negative.'],
      transfer: 'Compare stable and direct log-probability losses at scores ±1000. Explain why clipping probabilities changes the objective, then test calibration on a separate dataset.',
    },
  },
  {
    id: 'laml-backpropagation', module: 'Math for machine learning',
    title: 'A neural network is a chain of matrix operations', minutes: 35, level: 'Advanced',
    objective: 'Implement a small neural-network forward pass and verify a backpropagated gradient numerically.',
    prose: [
      'Feed the two measurements [2;-1] into a layer with rows [1,-1] and [0.5,1]. Its two pre-activation scores are 3 and 0. Applying tanh gives approximately 0.995 and 0. The first hidden unit is almost saturated; changing its score slightly changes its output only slightly.',
      'Call the input vector x, the first-layer matrix W, and the hidden output h=tanh(W*x). The hyperbolic tangent tanh acts on each score. Let v contain output weights and define prediction=dot(v,h). For target y, define error d=prediction-y and squared loss d^2/2. This example has no bias parameters, so every trainable quantity appears explicitly.',
      'The chain rule passes local rates backward. The output-weight gradient is d*h. Because the derivative of tanh is 1-h.^2, the hidden-score gradient is delta=(d*v).*(1-h.^2). The matrix gradient is the outer product delta*x transposed. In this engine, reshape(delta,2,1)*reshape(x,1,2) explicitly preserves the required row and column dimensions.',
      'A central finite difference changes one weight by plus and minus epsilon and divides the loss difference by 2*epsilon. It should agree with the corresponding backpropagated entry. Extremely small epsilon magnifies rounding error; this check uses 1e-5. The plot compares analytic and numerical entries, while the printed difference makes a sign error visible even when bars look similar.',
    ],
    procedure: ['Compute hidden outputs, prediction, error, and loss in that order.', 'Propagate the scalar error through v and the tanh derivative.', 'Form the first-layer gradient with an explicit outer product.', 'Perturb one weight in both directions and compare its numerical and analytic derivatives.'],
    prediction: { question: 'Which hidden unit has the smaller tanh derivative: the one with score 3 or score 0?', answer: 'The unit with score 3. Its output is close to 1, so 1-h^2 is close to zero. The unit at zero has derivative 1.' },
    demo: {
      code: `x=[2;-1];
W=[1 -1;0.5 1];
v=[1;-2];
y=1;
h=tanh(W*x);
prediction=dot(v,h);
d=prediction-y;
delta=(d*v).*(1-h.^2);
gradW=reshape(delta,2,1)*reshape(x,1,2);
epsilon=0.00001;
Wp=W;
Wp(1,1)=W(1,1)+epsilon;
Wm=W;
Wm(1,1)=W(1,1)-epsilon;
lp=(dot(v,tanh(Wp*x))-y)^2/2;
lm=(dot(v,tanh(Wm*x))-y)^2/2;
finiteDifference=(lp-lm)/(2*epsilon);
disp('Prediction, analytic derivative, numerical derivative');
disp(prediction);
disp(gradW(1,1));
disp(finiteDifference);
bar([gradW(1,1) finiteDifference]);
title('Check one backpropagated derivative');
xlabel('1 = analytic, 2 = numerical');
ylabel('Derivative of loss');`,
      explain: [{ code: '(d*v).*(1-h.^2)', meaning: 'Multiply the upstream gradient by the local tanh derivative, entry by entry.' }, { code: 'reshape(delta,2,1)*reshape(x,1,2)', meaning: 'An outer product gives one gradient entry for each hidden-unit/input pair.' }, { code: '(lp-lm)/(2*epsilon)', meaning: 'Estimate the same derivative by symmetric perturbations of one weight.' }],
    },
    challenge: {
      prompt: 'Compute prediction, gradV, and gradW for this network. Independently check gradW(1,1) with a central finite difference and save the absolute disagreement as gradientError.',
      setup: `x=[1;2];
W=[0.5 -0.5;1 0];
v=[1;-1];
y=0.5;
epsilon=0.00001;`,
      starter: `prediction=0;
gradV=zeros(2,1);
gradW=zeros(2,2);
gradientError=1;`,
      solution: `h=tanh(W*x);
prediction=dot(v,h);
d=prediction-y;
gradV=d*h;
delta=(d*v).*(1-h.^2);
gradW=reshape(delta,2,1)*reshape(x,1,2);
Wp=W;
Wp(1,1)=W(1,1)+epsilon;
Wm=W;
Wm(1,1)=W(1,1)-epsilon;
lp=(dot(v,tanh(Wp*x))-y)^2/2;
lm=(dot(v,tanh(Wm*x))-y)^2/2;
finiteDifference=(lp-lm)/(2*epsilon);
gradientError=abs(finiteDifference-gradW(1,1));`,
      checks: [{ name: 'prediction', expected: -1.2237113132157746, tolerance: 1e-6, message: 'Apply tanh before the output dot product.' }, { name: 'gradV', expected: [0.796556572000192,-1.312768462699971], tolerance: 1e-6, message: 'Each output weight receives error times its hidden activation.' }, { name: 'gradW', expected: [[-1.3556088545662677,-2.7112177091325353],[0.7239145239004433,1.4478290478008866]], tolerance: 1e-6, message: 'Include both the output weight and the local tanh derivative before taking the outer product.' }, { name: 'gradientError', expected: 0, tolerance: 1e-6, message: 'Use fresh plus/minus copies of W and compare the same weight entry.' }],
      hints: ['Write h=tanh(W*x), then prediction=dot(v,h) and d=prediction-y.', 'The hidden gradient has two entries: (d*v).*(1-h.^2). Its outer product with x gives gradW.', 'Evaluate the complete forward loss twice with W(1,1) shifted by ±epsilon; do not differentiate a partially updated network.'],
      transfer: 'Add a hidden bias vector and an output bias scalar. Derive their gradients, then finite-difference one bias and one weight before training the network.',
    },
  },
  {
    id: 'laml-markov-state-vectors', module: 'Dynamic programming',
    title: 'State vectors and the direction of a transition', minutes: 35, level: 'Advanced',
    objective: 'Propagate state probabilities and expected future values using a consistent row-stochastic transition convention.',
    prose: [
      'A customer starts in state 1 with certainty. From state 1, the next state is 1 with probability 0.8 and 2 with probability 0.2. After one transition, the distribution must be [0.8;0.2]. Multiplying by the wrong orientation can produce [0.8;0.1], which has lost probability mass.',
      'The transition matrix P uses rows for current states and columns for next states. Entry P(i,j) is the probability of moving from state i to state j. Every entry is nonnegative and every row sums to one. Such a matrix is called row-stochastic. A probability distribution p is treated as a column vector, so its next distribution is transpose(P)*p.',
      'A value vector v has one expected future payoff for each possible next state. The vector P*v answers a different question: starting in each current state, what next payoff should we expect? No transpose is needed. The same matrix transports distributions forward and pulls future values backward; the quantities have different meanings even when their arrays have the same length.',
      'The engine displays one-dimensional vectors compactly, so write the mathematical orientation before choosing multiplication. Check total mass with sum(p) and check transition rows explicitly. The plotted first-state probability changes with time while total probability remains one. This invariant detects many orientation errors before a control algorithm hides them.',
    ],
    procedure: ['List states in one fixed order and put current states on rows of P.', 'Check that each row is nonnegative and sums to one.', 'Propagate a column distribution with transpose(P)*p.', 'Compute next-value expectations with P*v and verify the interpretation using a single known starting state.'],
    prediction: { question: 'With next-state payoffs [10;0], what payoff is expected from current state 1 in the demo?', answer: '8, because 0.8*10+0.2*0=8. It is the first entry of P*v and equals dot(transpose(P)*[1;0],v).' },
    demo: {
      code: `P=[0.8 0.2;0.1 0.9];
p=[1;0];
v=[10;0];
expectations=P*v;
history=zeros(21,1);
history(1)=p(1);
for k=1:20
  p=transpose(P)*p;
  history(k+1)=p(1);
end
disp('Next-value expectations, final distribution, total mass');
disp(expectations);
disp(p);
disp(sum(p));
plot(0:20,history,'o-');
title('Forward distribution with conserved probability');
xlabel('Transition');
ylabel('Probability of state 1');`,
      explain: [{ code: 'P*v', meaning: 'Each current-state row averages the possible next-state payoffs.' }, { code: 'transpose(P)*p', meaning: 'Redistribute current probability mass into next states.' }, { code: 'sum(p)', meaning: 'Check the invariant that total probability remains one.' }],
    },
    challenge: {
      prompt: 'Advance p0 by two transitions into p2, compute mass=sum(p2), and calculate expectedNext=P*payoffs for all three starting states.',
      setup: `P=[0.5 0.5 0;0 0.5 0.5;1 0 0];
p0=[1;0;0];
payoffs=[2;0;6];`,
      starter: `p2=p0;
mass=0;
expectedNext=zeros(3,1);`,
      solution: `p1=transpose(P)*p0;
p2=transpose(P)*p1;
mass=sum(p2);
expectedNext=P*payoffs;`,
      checks: [{ name: 'p2', expected: [0.25,0.5,0.25], tolerance: 1e-6, message: 'Apply the transposed row-stochastic matrix twice to the starting distribution.' }, { name: 'mass', expected: 1, tolerance: 1e-6, message: 'A valid probability transition preserves total mass.' }, { name: 'expectedNext', expected: [1,3,2], tolerance: 1e-6, message: 'Expected next payoffs use P without a transpose.' }],
      hints: ['Rows describe where mass goes from each current state.', 'p1=transpose(P)*p0, then apply the identical operation once more.', 'Do not use the forward-distribution formula to pull next-state payoffs back.'],
      transfer: 'Construct a three-state customer-retention model with one absorbing state. Check row sums and predict which distributions eventually concentrate in the absorbing state.',
    },
  },
  {
    id: 'laml-policy-evaluation', module: 'Dynamic programming',
    title: 'Evaluate a fixed policy two ways', minutes: 35, level: 'Advanced',
    objective: 'Solve a discounted policy-value equation directly and by iteration, then certify the result with a residual.',
    prose: [
      'Suppose state 2 pays 2 every step and always returns to itself. With discount 0.8, its total value is 2+0.8*2+0.8^2*2+...=10. State 1 pays 1 and moves equally often to states 1 and 2. Its value is smaller than 10 because it takes time to reach the better reward stream.',
      'A fixed policy has already chosen how to act. Its transition matrix P has current-state rows, and r contains expected immediate rewards. The discount gamma is between zero and one. The value vector v obeys v=r+gamma*P*v, called a Bellman expectation equation. Moving the future-value term left gives (I-gamma*P)*v=r, where I is the identity matrix.',
      'Use mldivide(I-gamma*P,r) to solve the linear system without explicitly forming an inverse. Alternatively, start at zero and repeatedly assign v=r+gamma*P*v. Discounting makes this update a contraction: differences shrink by at most gamma in the maximum-entry norm. The iteration includes the reward stream repeatedly; it does not describe a finite horizon.',
      'Define the Bellman residual as max(abs(r+gamma*P*v-v)). It measures the largest violation of any state equation. Dividing it by 1-gamma bounds the largest value error for this exact model. A tiny residual certifies the numerical solve, not the estimated rewards or transitions. The plot shows how a chosen state value approaches the direct solution.',
    ],
    procedure: ['Check 0<=gamma<1 and that P has probability rows.', 'Solve (I-gamma*P)*v=r with mldivide.', 'Run repeated Bellman expectation updates from a starting vector.', 'Measure the maximum Bellman residual and divide by 1-gamma for an error bound.'],
    prediction: { question: 'Why is the value in an absorbing state not necessarily zero?', answer: 'An absorbing state can keep receiving rewards. State 2 here earns 2 forever and has value 10. A terminal state instead has no future rewards unless a terminal payoff is explicitly specified.' },
    demo: {
      code: `P=[0.5 0.5;0 1];
r=[1;2];
gamma=0.8;
A=eye(2)-gamma*P;
direct=mldivide(A,r);
v=zeros(2,1);
history=zeros(81,1);
for k=1:80
  v=r+gamma*(P*v);
  history(k+1)=v(1);
end
bellmanResidual=max(abs(r+gamma*(P*v)-v));
errorBound=bellmanResidual/(1-gamma);
disp('Direct / iterative values and certified value-error bound');
disp(direct);
disp(v);
disp(errorBound);
plot(0:80,history);
title('Discounted fixed-policy evaluation');
xlabel('Bellman update');
ylabel('Value of state 1');`,
      explain: [{ code: 'mldivide(A,r)', meaning: 'Solve the linear system using a numerical solver instead of computing inv(A).' }, { code: 'r+gamma*(P*v)', meaning: 'Add current rewards to discounted expected continuation values.' }, { code: 'bellmanResidual/(1-gamma)', meaning: 'Convert a computable equation mismatch into a worst-state value-error bound.' }],
    },
    challenge: {
      prompt: 'Save direct and iterative policy values, using 50 Bellman updates. Save residual as the maximum Bellman mismatch of iterative, and errorBound=residual/(1-gamma).',
      setup: `P=[0 1;0.5 0.5];
r=[1;0];
gamma=0.5;`,
      starter: `direct=zeros(2,1);
iterative=zeros(2,1);
residual=1;
errorBound=1;`,
      solution: `n=size(P,1);
direct=mldivide(eye(n)-gamma*P,r);
iterative=zeros(n,1);
for k=1:50
  iterative=r+gamma*(P*iterative);
end
residual=max(abs(r+gamma*(P*iterative)-iterative));
errorBound=residual/(1-gamma);`,
      checks: [{ name: 'direct', expected: [1.2,0.4], tolerance: 1e-6, message: 'Solve the policy equation with current-state rows and an identity matrix.' }, { name: 'iterative', expected: [1.2,0.4], tolerance: 1e-6, message: 'Update all states from the previous vector, including the discount.' }, { name: 'residual', expected: 0, tolerance: 1e-6, message: 'Compare the final vector with one more Bellman update.' }, { name: 'errorBound', expected: 0, tolerance: 1e-6, message: 'The maximum value-error certificate divides the residual by 1-gamma.' }],
      hints: ['The identity size must match the number of states.', 'Use simultaneous vector updates; changing states one at a time defines a different iteration.', 'A small change between iterates is useful, but the requested certificate is the residual of the final iterate.'],
      transfer: 'Increase gamma toward one and compare iteration counts at a fixed certified error. Explain why a small residual becomes less informative when 1-gamma becomes small.',
    },
  },
  {
    id: 'laml-backward-induction', module: 'Dynamic programming',
    title: 'Finite horizons and backward induction', minutes: 35, level: 'Advanced',
    objective: 'Work backward from a terminal payoff and recover a policy that can change with time.',
    prose: [
      'You have three decisions left. Waiting in state 1 earns 1 and keeps you there. Moving to state 2 costs 1. State 2 earns nothing, but pays a terminal bonus of 5 after the final decision. With one decision left, moving is worth 4 while waiting is worth 1. Earlier, it can be better to collect a waiting reward first.',
      'Let terminal be the value paid after all H decisions, where H is the horizon. For time t, the vector V_t contains the best remaining value before taking that decision. An action has immediate rewards r1 or r2 and a row-stochastic transition matrix P1 or P2. Its candidate value is reward plus the transition matrix times V_(t+1).',
      'Start with the terminal vector at time H+1, then work backward through t=H,...,1. At each state, keep the larger action value and record which action produced it. This example uses no discount, so gamma equals one. A finite horizon still gives a well-defined calculation because the recursion stops at the supplied terminal payoff.',
      'Pay the terminal bonus once. State 2 being absorbing does not turn that bonus into a reward every step. Break equal-value ties by choosing action 1 so the policy is reproducible. The plot runs from decisions remaining zero upward; it shows why a time-dependent policy cannot always be replaced by one stationary action per state.',
    ],
    procedure: ['Write the terminal payoff separately from immediate rewards.', 'Initialize v=terminal and iterate once for each remaining decision.', 'Compute both action vectors from the same v, then take their entrywise maximum.', 'Record the action for each state and each time; interpret the last and first decision policies separately.'],
    prediction: { question: 'With three decisions left, should state 1 move immediately or wait first?', answer: 'Wait first. The best value is 6: wait twice for 2, then move for -1 and receive the terminal 5. With only one decision left, the best action is to move.' },
    demo: {
      code: `P1=[1 0;0 1];
P2=[0 1;0 1];
r1=[1;0];
r2=[-1;0];
terminal=[0;5];
H=3;
v=terminal;
history=zeros(H+1,1);
history(1)=v(1);
for remaining=1:H
  q1=r1+P1*v;
  q2=r2+P2*v;
  v=max(q1,q2);
  history(remaining+1)=v(1);
end
disp('Optimal values with three decisions remaining');
disp(v);
plot(0:H,history,'o-');
title('Work backward from a one-time terminal payoff');
xlabel('Decisions remaining');
ylabel('Best value from state 1');`,
      explain: [{ code: 'v=terminal', meaning: 'Zero decisions remain, so only the terminal payoff is available.' }, { code: 'r2+P2*v', meaning: 'Pay the move cost now and then use the best value with one fewer decision.' }, { code: 'max(q1,q2)', meaning: 'Choose the better action independently in every current state.' }],
    },
    challenge: {
      prompt: 'Perform H backward updates. Save initialValue for H decisions remaining, lastPolicy for the final decision, and firstPolicy for the initial decision. Use action 1 when action values tie.',
      setup: `P1=[1 0;0 1];
P2=[0 1;0 1];
r1=[1;0];
r2=[-1;0];
terminal=[0;5];
H=3;`,
      starter: `initialValue=terminal;
lastPolicy=ones(2,1);
firstPolicy=2*ones(2,1);`,
      solution: `n=size(P1,1);
v=terminal;
for remaining=1:H
  q1=r1+P1*v;
  q2=r2+P2*v;
  policy=ones(n,1);
  for s=1:n
    if q2(s)>q1(s)
      policy(s)=2;
    end
  end
  if remaining==1
    lastPolicy=policy;
  end
  v=max(q1,q2);
end
initialValue=v;
firstPolicy=policy;`,
      checks: [{ name: 'initialValue', expected: [6,5], tolerance: 1e-6, message: 'The terminal 5 is paid once, after exactly H decisions.' }, { name: 'lastPolicy', expected: [2,1], tolerance: 1e-6, message: 'With one decision left, move from state 1; use action 1 for the tie in state 2.' }, { name: 'firstPolicy', expected: [1,1], tolerance: 1e-6, message: 'The first decision waits in state 1 because another opportunity to move remains.' }],
      hints: ['The first backward update describes the last chronological decision.', 'Select action 2 only when its value is strictly greater than action 1.', 'After H updates, v describes the first chronological decision. Do not add terminal again inside the loop.'],
      transfer: 'Reduce the terminal bonus until moving is never worthwhile, then find the threshold at which the last decision changes. Explain how changing the horizon affects that threshold.',
    },
  },
  {
    id: 'laml-value-iteration', module: 'Dynamic programming',
    title: 'Bellman optimality and value iteration', minutes: 35, level: 'Advanced',
    objective: 'Compute an optimal discounted value, extract a greedy policy, and certify its Bellman mismatch.',
    prose: [
      'In state 1, staying pays 1. In state 2, staying pays 0. Switching pays 0 from state 1 and 2 from state 2. With discount 0.5, staying in state 1 forever is worth 2, and switching from state 2 to that stream is worth 3. The best actions are therefore different in the two states.',
      'For any candidate value vector v, define q1=r1+gamma*P1*v and q2=r2+gamma*P2*v. The reward vectors r1 and r2 contain immediate rewards, and P1 and P2 use current-state rows. The Bellman optimality operator T chooses the larger action value in each state. Its fixed point satisfies v=T(v).',
      'Value iteration repeatedly sets v=max(q1,q2). With 0<=gamma<1 and finite rewards, these updates converge to the unique optimal value. After the last update, recompute both q vectors from the final v. Extract a greedy policy by choosing action 2 only when q2 is strictly greater; ties choose action 1.',
      'The optimality residual max(abs(T(v)-v)) yields a value-error bound after division by 1-gamma. A greedy policy inferred from an inaccurate v can still pick the wrong action when candidate values are close. Inspect action gaps as well as residuals. The plot compares state values across updates; both state equations must settle, not just the first one.',
    ],
    procedure: ['Initialize one candidate value for each state.', 'Form every action-value vector from the same old value vector.', 'Take the entrywise maximum and repeat until a residual target or iteration limit is reached.', 'Recompute action values, extract the greedy policy, and report the optimality residual and its value-error bound.'],
    prediction: { question: 'Why must q1 and q2 be recomputed after the final value update?', answer: 'Otherwise the policy and residual are based on the previous value vector. Recomputing makes the reported policy and certificate refer to the values actually returned.' },
    demo: {
      code: `P1=eye(2);
P2=[0 1;1 0];
r1=[1;0];
r2=[0;2];
gamma=0.5;
v=zeros(2,1);
h1=zeros(41,1);
h2=zeros(41,1);
for k=1:40
  q1=r1+gamma*(P1*v);
  q2=r2+gamma*(P2*v);
  v=max(q1,q2);
  h1(k+1)=v(1);
  h2(k+1)=v(2);
end
q1=r1+gamma*(P1*v);
q2=r2+gamma*(P2*v);
residual=max(abs(max(q1,q2)-v));
disp('Optimal values and Bellman residual');
disp(v);
disp(residual);
plot(0:40,h1);
hold on;
plot(0:40,h2);
title('Value iteration updates every state');
xlabel('Update');
ylabel('Discounted optimal value');
legend('State 1','State 2');`,
      explain: [{ code: 'max(q1,q2)', meaning: 'This maximum is entrywise across actions, not across states.' }, { code: 'q1=r1+gamma*(P1*v)', meaning: 'Each action includes immediate reward and expected discounted continuation.' }, { code: 'max(abs(max(q1,q2)-v))', meaning: 'Report the largest violation of the Bellman optimality equation.' }],
    },
    challenge: {
      prompt: 'Run 100 value-iteration updates, recompute both action values, and save value, policy, residual, and errorBound. Break ties in favor of action 1.',
      setup: `P1=eye(2);
P2=[0 1;1 0];
r1=[0.5;0];
r2=[0;2];
gamma=0.8;`,
      starter: `value=zeros(2,1);
policy=ones(2,1);
residual=1;
errorBound=1;`,
      solution: `n=size(P1,1);
value=zeros(n,1);
for k=1:100
  q1=r1+gamma*(P1*value);
  q2=r2+gamma*(P2*value);
  value=max(q1,q2);
end
q1=r1+gamma*(P1*value);
q2=r2+gamma*(P2*value);
policy=ones(n,1);
for s=1:n
  if q2(s)>q1(s)
    policy(s)=2;
  end
end
residual=max(abs(max(q1,q2)-value));
errorBound=residual/(1-gamma);`,
      checks: [{ name: 'value', expected: [40/9,50/9], tolerance: 1e-6, message: 'Both states optimally switch for these rewards and this discount.' }, { name: 'policy', expected: [2,2], tolerance: 1e-6, message: 'Extract actions from recomputed final action values.' }, { name: 'residual', expected: 0, tolerance: 1e-6, message: 'Measure optimality using the maximum over actions in every state.' }, { name: 'errorBound', expected: 0, tolerance: 1e-6, message: 'Discounting converts the residual into a worst-state value-error certificate.' }],
      hints: ['Compute q1 and q2 before replacing value.', 'Use max(q1,q2) to choose per state; max(q1) would compare states instead.', 'The best action is not necessarily the action with the largest immediate reward.'],
      transfer: 'Add a third action with an upfront cost and a different transition. Find a cost at which the greedy action changes, then check whether numerical error is smaller than the competing action gap.',
    },
  },
  {
    id: 'laml-recommendation-studio', module: 'Mastery studio',
    title: 'Low-rank recommendations with honest holdouts', minutes: 35, level: 'Mastery',
    objective: 'Construct a low-rank rating estimate without using a held-out rating, and separate reconstruction error from predictive evidence.',
    prose: [
      'A three-user, three-item ratings table contains six training ratings: 5, 4, 4, 2, 2, and 1. Their mean is 3. Three cells are unavailable during fitting. Fill those cells with the training mean as a simple baseline, then compress the filled table to rank one. One hidden rating is 3 and will be used only after fitting.',
      'The matrix R stores training values; the separate mask observed is 1 for an available training cell and 0 elsewhere. A zero in R alone does not mean missing, because zero can be a legitimate measurement. Compute the fill mean using only observed entries. The held-out target never participates in the mean, rank choice, or singular-vector calculation.',
      'A singular value decomposition writes the filled matrix as U*S*transpose(V). Its diagonal matrix S contains singular values in decreasing order. Keep only the first singular value to form Sk and reconstruct estimate=U*Sk*transpose(V). This is the best rank-one approximation of the filled table in squared reconstruction error, not a solution to missing-data matrix completion.',
      'Report training RMSE only over observed cells and report held-out squared error separately. Mean filling creates artificial observations, so SVD can learn the fill rule as well as actual preferences. One held-out rating has enormous uncertainty and cannot establish general recommendation quality. The plot shows a reconstructed user profile, while the independent holdout checks whether compression helped predict anything unavailable during fitting.',
    ],
    procedure: ['Separate the training mask and values from the held-out target.', 'Compute a training-only fill mean and fill unobserved cells.', 'Compute SVD, retain the selected singular values, and reconstruct estimates.', 'Measure training RMSE only on observed cells and evaluate the reserved rating after fitting.'],
    prediction: { question: 'Does a lower rank-one reconstruction error on the filled table guarantee a smaller held-out rating error?', answer: 'No. The reconstruction objective includes invented fill values. Predictive evidence comes from ratings that did not influence fitting or rank selection.' },
    demo: {
      code: `R=[5 4 0;4 0 2;0 2 1];
observed=[1 1 0;1 0 1;0 1 1];
fillMean=sum(sum(R.*observed))/sum(sum(observed));
filled=R+(1-observed)*fillMean;
[U,S,V]=svd(filled);
Sk=zeros(3,3);
Sk(1,1)=S(1,1);
estimate=U*Sk*transpose(V);
holdoutTruth=3;
heldoutError=(estimate(2,2)-holdoutTruth)^2;
disp('Training fill mean, held-out estimate, held-out squared error');
disp(fillMean);
disp(estimate(2,2));
disp(heldoutError);
plot(1:3,estimate(1,:),'o-');
hold on;
plot(1:3,filled(1,:),'s-');
title('Rank-one user profile after training-only filling');
xlabel('Item');
ylabel('Rating');
legend('Rank-one estimate','Filled training table');`,
      explain: [{ code: 'sum(sum(R.*observed))/sum(sum(observed))', meaning: 'Average only training ratings; neither missing cells nor held-out truth enter this statistic.' }, { code: 'Sk(1,1)=S(1,1)', meaning: 'Keep the strongest singular component and remove the others.' }, { code: '(estimate(2,2)-holdoutTruth)^2', meaning: 'Evaluate a rating that was hidden from every fitting step.' }],
    },
    challenge: {
      prompt: 'Build a rank-one estimator from R and observed. Return fillMean, heldoutPrediction at (2,2), trainingRmse over observed entries, heldoutSquaredError, and reconstructionError for the complete filled table. Do not use heldoutTruth during fitting.',
      setup: `R=[5 4 0;4 0 2;0 2 1];
observed=[1 1 0;1 0 1;0 1 1];
heldoutTruth=3;`,
      starter: `fillMean=0;
heldoutPrediction=0;
trainingRmse=0;
heldoutSquaredError=0;
reconstructionError=0;`,
      solution: `fillMean=sum(sum(R.*observed))/sum(sum(observed));
filled=R+(1-observed)*fillMean;
[U,S,V]=svd(filled);
Sk=zeros(size(S,1),size(S,2));
Sk(1,1)=S(1,1);
estimate=U*Sk*transpose(V);
heldoutPrediction=estimate(2,2);
trainingRmse=sqrt(sum(sum(((estimate-R).*observed).^2))/sum(sum(observed)));
heldoutSquaredError=(heldoutPrediction-heldoutTruth)^2;
reconstructionError=sqrt(sum(sum((estimate-filled).^2)));`,
      checks: [{ name: 'fillMean', expected: 3, tolerance: 1e-6, message: 'Only the six observed training entries belong in the fill statistic.' }, { name: 'heldoutPrediction', expected: 3.0126451130702243, tolerance: 1e-6, message: 'Reconstruct from the first singular component; do not insert the held-out truth.' }, { name: 'trainingRmse', expected: 0.19647804169964572, tolerance: 1e-6, message: 'Compute a masked training RMSE, not the error over all filled cells.' }, { name: 'heldoutSquaredError', expected: 0.00015989888455875774, tolerance: 1e-6, message: 'Compare the hidden target with the fitted estimate only after reconstruction.' }, { name: 'reconstructionError', expected: 0.6234753829797993, tolerance: 1e-6, message: 'Use the square root of the sum of all squared reconstruction entries.' }],
      cases: [{ setup: `R=[5 4 0;4 0 2;0 2 1];
observed=[1 1 0;1 0 1;0 1 1];
heldoutTruth=5;`, checks: [{ name: 'fillMean', expected: 3, tolerance: 1e-6, message: 'Changing an evaluation target must not change a training statistic.' }, { name: 'heldoutPrediction', expected: 3.0126451130702243, tolerance: 1e-6, message: 'Held-out truth is unavailable during fitting; its value must not affect the prediction.' }, { name: 'heldoutSquaredError', expected: (3.0126451130702243-5)**2, tolerance: 1e-6, message: 'The unchanged prediction must be evaluated against the new independent target.' }] }],
      hints: ['Use observed as a mask throughout; never infer observation status from a rating value.', 'Set all entries of Sk to zero except Sk(1,1), then multiply the complete SVD factors.', 'The training RMSE denominator is the number of observed cells. Held-out squared error uses exactly one reserved target.'],
      transfer: 'Design a larger train/validation/test rating split. Compare mean filling with a model trained only on observed entries, choose rank on validation data, and report an untouched test error with cold-start limitations.',
    },
  },
  {
    id: 'laml-pca-ridge-capstone', module: 'Mastery studio',
    title: 'Capstone: a PCA and ridge prediction pipeline', minutes: 35, level: 'Mastery',
    objective: 'Fit a training-only PCA projection and ridge model, then evaluate unseen rows without leaking test information.',
    prose: [
      'Four training examples have feature pairs [0,0], [1,2], [2,4], and [3,6], with targets 1, 4, 7, and 10. The two columns measure the same direction at different scales. A one-component projection preserves their variation. Future examples [4,8] and [5,10] must be transformed using the training mean [1.5,3], even though their own mean is different.',
      'Let Xtrain contain the training features and ytrain the targets. The vector mu contains one training mean per feature; ymean is the training target mean. Center each feature column separately. Compute the SVD of the centered training matrix and call the first right singular vector direction. Multiplying centered rows by direction produces one-dimensional scores.',
      'Let scores be the training scores, yc=ytrain-ymean the centered targets, and lambda a positive regularization strength. The scalar ridge coefficient is dot(scores,yc)/(dot(scores,scores)+lambda). This minimizes squared fitting error plus lambda times the squared coefficient. The intercept is handled through ymean and is not penalized.',
      'Center test rows with mu and apply the same direction and coefficient. Report test mean squared error after fitting. A singular vector can flip sign without changing predictions because the fitted coefficient flips too; compare the projection matrix or predictions instead of the raw direction sign. The normal-equation residual checks numerical fitting, while test error checks performance on these specific unseen rows. Neither certifies extrapolation in general.',
    ],
    procedure: ['Estimate feature and target means from training rows only.', 'Center training features, fit PCA, and project onto the first component.', 'Fit the scalar ridge coefficient and check its normal-equation residual.', 'Transform test rows with the fitted training quantities, predict, and evaluate their targets.'],
    prediction: { question: 'If direction flips sign, should the final predictions change?', answer: 'No. Training scores and the fitted ridge coefficient both flip, leaving their product unchanged. The projector direction*transpose(direction) is also unchanged.' },
    demo: {
      code: `Xtrain=[0 0;1 2;2 4;3 6];
ytrain=[1;4;7;10];
Xtest=[4 8;5 10];
ytest=[13;16];
lambda=1;
Xc=Xtrain;
Xt=Xtest;
mu=zeros(2,1);
for j=1:2
  mu(j)=mean(Xtrain(:,j));
  Xc(:,j)=Xtrain(:,j)-mu(j);
  Xt(:,j)=Xtest(:,j)-mu(j);
end
ymean=mean(ytrain);
yc=ytrain-ymean;
[U,S,V]=svd(Xc);
direction=V(:,1);
scores=Xc*direction;
coefficient=dot(scores,yc)/(dot(scores,scores)+lambda);
predictions=ymean+(Xt*direction)*coefficient;
testMse=mean((predictions-ytest).^2);
disp('Training means, held-out predictions, test MSE');
disp(mu);
disp(predictions);
disp(testMse);
plot(ytest,predictions,'o-');
title('PCA and ridge on untouched test examples');
xlabel('Observed test target');
ylabel('Predicted target');`,
      explain: [{ code: 'mu(j)=mean(Xtrain(:,j))', meaning: 'Fit a separate feature mean using training rows only.' }, { code: 'direction=V(:,1)', meaning: 'Use the feature-space direction of largest centered training variation.' }, { code: 'dot(scores,scores)+lambda', meaning: 'Ridge adds positive curvature, shrinking the fitted coefficient.' }],
    },
    challenge: {
      prompt: 'Implement the complete training-only pipeline for any supplied row count. Save mu, projector, predictions, testMse, and normalResidual. The residual must measure the scalar ridge normal equation, not test prediction error.',
      setup: `Xtrain=[0 0;1 2;2 4;3 6];
ytrain=[1;4;7;10];
Xtest=[4 8;5 10];
ytest=[13;16];
lambda=1;`,
      starter: `mu=zeros(2,1);
projector=zeros(2,2);
predictions=zeros(2,1);
testMse=0;
normalResidual=1;`,
      solution: `p=size(Xtrain,2);
mu=zeros(p,1);
Xc=Xtrain;
Xt=Xtest;
for j=1:p
  mu(j)=mean(Xtrain(:,j));
  Xc(:,j)=Xtrain(:,j)-mu(j);
  Xt(:,j)=Xtest(:,j)-mu(j);
end
ymean=mean(ytrain);
yc=ytrain-ymean;
[U,S,V]=svd(Xc);
direction=V(:,1);
scores=Xc*direction;
denominator=dot(scores,scores)+lambda;
coefficient=dot(scores,yc)/denominator;
predictions=ymean+(Xt*direction)*coefficient;
projector=V(:,1:1)*transpose(V(:,1:1));
testMse=mean((predictions-ytest).^2);
normalResidual=abs(denominator*coefficient-dot(scores,yc));`,
      checks: [{ name: 'mu', expected: [1.5,3], tolerance: 1e-6, message: 'Use training means even when test features have a different center.' }, { name: 'projector', expected: [[0.2,0.4],[0.4,0.8]], tolerance: 1e-6, message: 'Compare the invariant projection matrix, not a singular-vector sign.' }, { name: 'predictions', expected: [12.711538461538462,15.596153846153847], tolerance: 1e-6, message: 'Apply training centering, the learned PCA direction, ridge shrinkage, and the unpenalized target mean.' }, { name: 'testMse', expected: 0.1231508875739645, tolerance: 1e-6, message: 'Average squared errors only on the held-out test targets.' }, { name: 'normalResidual', expected: 0, tolerance: 1e-6, message: 'Verify the fitted scalar normal equation independently of its predictive accuracy.' }],
      cases: [{ setup: `Xtrain=[3 6;1 2;0 0;2 4];
ytrain=[10;4;1;7];
Xtest=[6 12;7 14];
ytest=[19;22];
lambda=1;`, checks: [{ name: 'mu', expected: [1.5,3], tolerance: 1e-6, message: 'Permuting training rows must not change the fitted means.' }, { name: 'predictions', expected: [18.48076923076923,21.365384615384617], tolerance: 1e-6, message: 'A fitted pipeline must transform new test inputs rather than store the original answers.' }, { name: 'normalResidual', expected: 0, tolerance: 1e-6, message: 'The numerical fit should still satisfy its normal equation.' }] }],
      hints: ['A matrix-wide mean would mix features. Loop over columns to compute mu(j).', 'Center ytrain with its own training mean and fit the coefficient to PCA scores.', 'Reuse mu, direction, coefficient, and ymean on every test row. Never refit them using test features or targets.'],
      transfer: 'Introduce a non-collinear third feature and compare one versus two principal components. Select the component count and lambda on validation data, then evaluate once on a separate test split.',
    },
  },
  {
    id: 'laml-policy-iteration-capstone', module: 'Mastery studio',
    title: 'Capstone: policy iteration as solve and improve', minutes: 35, level: 'Mastery',
    objective: 'Alternate exact policy evaluation with greedy improvement, then verify both policy and optimality equations.',
    prose: [
      'With rewards [0.5;0] for staying and [0;2] for switching, a policy that always stays values the states at [2.5;0] when the discount is 0.8. Switching from state 2 then becomes attractive. Re-evaluating that improved policy can make switching from state 1 attractive too. One greedy pass from a poor policy need not finish the job.',
      'The policy vector contains action number 1 or 2 for each state. Build a policy transition matrix Ppi by selecting each state row from the corresponding action matrix. Build its reward vector rpi the same way. Exact evaluation solves (I-gamma*Ppi)*value=rpi. The policy is fixed during this solve.',
      'Improvement compares q1=r1+gamma*P1*value and q2=r2+gamma*P2*value in every state. Replace the policy with greedy actions, breaking ties toward action 1. Repeat evaluation and improvement until the policy is unchanged. With finitely many policies, discounted exact evaluation and a consistent tie convention allow this process to settle at an optimal policy.',
      'Verify two different equations: policyResidual measures rpi+gamma*Ppi*value-value, while bellmanResidual compares value with the maximum over all actions. A policy can be evaluated perfectly and still be suboptimal. Both residuals must be small to support the final claim. The plot compares values obtained by evaluation; abrupt improvements reflect a different complete policy, not a gradient update.',
    ],
    procedure: ['Choose an initial action for each state and assemble Ppi and rpi row by row.', 'Solve the fixed-policy value system with mldivide.', 'Improve actions from all candidate action values using one consistent tie rule.', 'Stop when the policy is unchanged, then recompute both policy and Bellman optimality residuals.'],
    prediction: { question: 'Does policyResidual=0 prove the policy is optimal?', answer: 'No. It proves only that the returned values evaluate that particular policy. Bellman optimality also requires that no alternative action offers a larger value.' },
    demo: {
      code: `P1=eye(2);
P2=[0 1;1 0];
r1=[0.5;0];
r2=[0;2];
gamma=0.8;
policy=ones(2,1);
history=zeros(4,1);
for k=1:4
  Ppi=zeros(2,2);
  rpi=zeros(2,1);
  for s=1:2
    for j=1:2
      if policy(s)==1
        Ppi(s,j)=P1(s,j);
      else
        Ppi(s,j)=P2(s,j);
      end
    end
    if policy(s)==1
      rpi(s)=r1(s);
    else
      rpi(s)=r2(s);
    end
  end
  value=mldivide(eye(2)-gamma*Ppi,rpi);
  history(k)=value(1);
  q1=r1+gamma*(P1*value);
  q2=r2+gamma*(P2*value);
  policy=ones(2,1);
  for s=1:2
    if q2(s)>q1(s)
      policy(s)=2;
    end
  end
end
disp('Improved policy and evaluated values');
disp(policy);
disp(value);
plot(1:4,history,'o-');
title('Policy iteration: solve, then improve');
xlabel('Policy evaluation');
ylabel('Value of state 1');`,
      explain: [{ code: 'Ppi(s,j)=P2(s,j)', meaning: 'Selecting an action selects the entire transition row for that current state.' }, { code: 'mldivide(eye(2)-gamma*Ppi,rpi)', meaning: 'Evaluate the whole fixed policy by solving its coupled equations.' }, { code: 'q2(s)>q1(s)', meaning: 'Improve only after evaluating; strict comparison gives a reproducible tie convention.' }],
    },
    challenge: {
      prompt: 'Implement policy iteration for up to 12 rounds, beginning with action 1 everywhere. Save policy, value, policyResidual, and bellmanResidual after stable actions are found. Support the alternate reward/discount case as well.',
      setup: `P1=eye(2);
P2=[0 1;1 0];
r1=[0.5;0];
r2=[0;2];
gamma=0.8;`,
      starter: `policy=ones(2,1);
value=zeros(2,1);
policyResidual=1;
bellmanResidual=1;`,
      solution: `n=size(P1,1);
policy=ones(n,1);
for k=1:12
  Ppi=zeros(n,n);
  rpi=zeros(n,1);
  for s=1:n
    for j=1:n
      if policy(s)==1
        Ppi(s,j)=P1(s,j);
      else
        Ppi(s,j)=P2(s,j);
      end
    end
    if policy(s)==1
      rpi(s)=r1(s);
    else
      rpi(s)=r2(s);
    end
  end
  value=mldivide(eye(n)-gamma*Ppi,rpi);
  oldPolicy=policy;
  q1=r1+gamma*(P1*value);
  q2=r2+gamma*(P2*value);
  policy=ones(n,1);
  for s=1:n
    if q2(s)>q1(s)
      policy(s)=2;
    end
  end
  if max(abs(policy-oldPolicy))==0
    break
  end
end
policyResidual=max(abs(rpi+gamma*(Ppi*value)-value));
bellmanResidual=max(abs(max(q1,q2)-value));`,
      checks: [{ name: 'policy', expected: [2,2], tolerance: 1e-6, message: 'Keep evaluating and improving; the first improvement is not the final policy.' }, { name: 'value', expected: [40/9,50/9], tolerance: 1e-6, message: 'Solve the coupled system for the policy that actually survives improvement.' }, { name: 'policyResidual', expected: 0, tolerance: 1e-6, message: 'The final values must satisfy the selected-policy equations.' }, { name: 'bellmanResidual', expected: 0, tolerance: 1e-6, message: 'No unselected action may improve the final value.' }],
      cases: [{ setup: `P1=eye(2);
P2=[0 1;1 0];
r1=[1;0];
r2=[0;2];
gamma=0.5;`, checks: [{ name: 'policy', expected: [1,2], tolerance: 1e-6, message: 'Recompute the best policy when the rewards and discount change.' }, { name: 'value', expected: [2,3], tolerance: 1e-6, message: 'A reusable solver must evaluate the new optimal policy.' }, { name: 'bellmanResidual', expected: 0, tolerance: 1e-6, message: 'The changed model still requires an optimality certificate.' }] }],
      hints: ['For each state, copy the row and immediate reward belonging to its current action.', 'Save oldPolicy before allocating a new greedy policy, then compare them after all states are improved.', 'Stop only after evaluation and improvement agree; both reported residuals should refer to that stable policy.'],
      transfer: 'Implement value iteration for the same model and compare final policies, residuals, and work required. Explain why counting iterations alone is unfair when a policy-iteration round solves a linear system.',
    },
  },
  {
    id: 'laml-independent-audit', module: 'Mastery studio',
    title: 'Independent studio: learn rewards, then audit a decision', minutes: 35, level: 'Mastery',
    objective: 'Combine regularized prediction with discounted control and support conclusions using independent numerical and Bellman evidence.',
    prose: [
      'Three noisy observations at inputs 0, 1, and 2 have measured rewards 1, 2, and 2. Fit a line with an unpenalized intercept and a ridge-penalized slope. Use its predicted rewards at inputs 0 and 2 as the staying rewards of a two-state decision model. A switching action has known rewards [0;3]. The learned model now influences an actual decision.',
      'The training design matrix X has an intercept column and one measured feature. Let lambda be the slope penalty and penalty=diag([0,1]); the zero protects the intercept. Solve A*coefficients=b with A=transpose(X)*X+lambda*penalty and b=transpose(X)*y. The numerical residual norm(A*coefficients-b) checks this solve. A separate test mean squared error measures prediction error on held-out observations.',
      'The state design matrix Xstate converts coefficients into a staying-reward vector r1. The switching rewards r2 are supplied independently. Transition matrices P1 and P2 have current-state rows, and gamma discounts future rewards. Value iteration produces a candidate value and a greedy policy. Its Bellman residual and residual/(1-gamma) certify value accuracy only for the fitted reward model.',
      'Audit the action gap: the smallest absolute difference between the two final action values. A tiny gap makes the decision sensitive to reward estimation and numerical error. A perfect linear-system residual says nothing about test accuracy, and a perfect Bellman residual says nothing about reward-model truth. Report all three evidence streams before recommending an action. The independent task asks you to decide what further evidence would change that recommendation.',
    ],
    procedure: ['Fit ridge coefficients with only the slope penalized and calculate the linear-system residual.', 'Evaluate held-out predictions without refitting and report test MSE.', 'Predict staying rewards for each state and solve the discounted optimal-control problem.', 'Extract actions, calculate a Bellman residual and value-error bound, and compare those with the smallest action gap.'],
    prediction: { question: 'If both numerical residuals are zero, can the policy still be poor in the real system?', answer: 'Yes. The calculations can solve the fitted model accurately while that model predicts rewards incorrectly. Test error and reward sensitivity must be examined separately.' },
    demo: {
      code: `X=[1 0;1 1;1 2];
y=[1;2;2];
lambda=0.5;
penalty=[0 0;0 1];
A=transpose(X)*X+lambda*penalty;
b=transpose(X)*y;
coefficients=mldivide(A,b);
linearResidual=norm(A*coefficients-b);
Xstate=[1 0;1 2];
r1=Xstate*coefficients;
r2=[0;3];
P1=eye(2);
P2=[0 1;1 0];
gamma=0.5;
value=zeros(2,1);
for k=1:80
  q1=r1+gamma*(P1*value);
  q2=r2+gamma*(P2*value);
  value=max(q1,q2);
end
q1=r1+gamma*(P1*value);
q2=r2+gamma*(P2*value);
bellmanResidual=max(abs(max(q1,q2)-value));
disp('Learned coefficients, linear residual, Bellman residual');
disp(coefficients);
disp(linearResidual);
disp(bellmanResidual);
plot(1:2,q1,'o-');
hold on;
plot(1:2,q2,'s-');
title('Audit the final competing action values');
xlabel('Current state');
ylabel('Discounted return');
legend('Stay','Switch');`,
      explain: [{ code: 'lambda*penalty', meaning: 'Regularize the slope while leaving the intercept unpenalized.' }, { code: 'Xstate*coefficients', meaning: 'Connect the learned regression model to immediate rewards for the control problem.' }, { code: 'max(abs(max(q1,q2)-value))', meaning: 'Audit the control solve separately from the regression solve.' }],
    },
    challenge: {
      prompt: 'Independently fit the reward model, evaluate held-out targets, solve the induced control problem, and return coefficients, linearResidual, testMse, value, policy, bellmanResidual, valueErrorBound, and actionGap. Use 100 Bellman updates and action 1 for ties. Each certificate must be computed from its own equation.',
      setup: `X=[1 0;1 1;1 2];
y=[1;2;2];
lambda=0.5;
penalty=[0 0;0 1];
Xtest=[1 3;1 4];
ytest=[3;3];
Xstate=[1 0;1 2];
P1=eye(2);
P2=[0 1;1 0];
r2=[0;3];
gamma=0.5;`,
      starter: `coefficients=zeros(2,1);
linearResidual=1;
testMse=0;
value=zeros(2,1);
policy=2*ones(2,1);
bellmanResidual=1;
valueErrorBound=1;
actionGap=0;`,
      solution: `A=transpose(X)*X+lambda*penalty;
b=transpose(X)*y;
coefficients=mldivide(A,b);
linearResidual=norm(A*coefficients-b);
testPredictions=Xtest*coefficients;
testMse=mean((testPredictions-ytest).^2);
r1=Xstate*coefficients;
n=size(P1,1);
value=zeros(n,1);
for k=1:100
  q1=r1+gamma*(P1*value);
  q2=r2+gamma*(P2*value);
  value=max(q1,q2);
end
q1=r1+gamma*(P1*value);
q2=r2+gamma*(P2*value);
policy=ones(n,1);
for s=1:n
  if q2(s)>q1(s)
    policy(s)=2;
  end
end
bellmanResidual=max(abs(max(q1,q2)-value));
valueErrorBound=bellmanResidual/(1-gamma);
actionGap=min(abs(q1-q2));`,
      checks: [{ name: 'coefficients', expected: [19/15,0.4], tolerance: 1e-6, message: 'Fit the training line with a slope penalty and unpenalized intercept.' }, { name: 'linearResidual', expected: 0, tolerance: 1e-6, message: 'Certify the fitted normal equation without confusing residuals with prediction errors.' }, { name: 'testMse', expected: 34/225, tolerance: 1e-6, message: 'Evaluate the two untouched targets using the fitted coefficients.' }, { name: 'value', expected: [38/15,64/15], tolerance: 1e-6, message: 'Use learned staying rewards and the supplied switching rewards consistently.' }, { name: 'policy', expected: [1,2], tolerance: 1e-6, message: 'Inspect discounted action values, including continuation rewards.' }, { name: 'bellmanResidual', expected: 0, tolerance: 1e-6, message: 'Numerically certify optimality within the fitted decision model.' }, { name: 'valueErrorBound', expected: 0, tolerance: 1e-6, message: 'Scale the maximum Bellman residual by 1/(1-gamma).' }, { name: 'actionGap', expected: 1/15, tolerance: 1e-6, message: 'The smallest absolute competing-action difference exposes sensitivity in state 2.' }],
      cases: [{ setup: `X=[1 0;1 1;1 2];
y=[1;2;2];
lambda=0.5;
penalty=[0 0;0 1];
Xtest=[1 3;1 4];
ytest=[3;3];
Xstate=[1 0;1 2];
P1=eye(2);
P2=[0 1;1 0];
r2=[0;4];
gamma=0.5;`, checks: [{ name: 'coefficients', expected: [19/15,0.4], tolerance: 1e-6, message: 'Changing the control model must not refit the independent reward observations.' }, { name: 'policy', expected: [2,2], tolerance: 1e-6, message: 'The increased switching reward changes the best action in state 1.' }, { name: 'value', expected: [8/3,16/3], tolerance: 1e-6, message: 'Re-solve the changed control model rather than storing the first policy values.' }, { name: 'bellmanResidual', expected: 0, tolerance: 1e-6, message: 'Every changed model requires its own Bellman certificate.' }, { name: 'actionGap', expected: 1/15, tolerance: 1e-6, message: 'Measure the new competing-action gap from final action values.' }] }],
      hints: ['Separate fitting, held-out prediction, and control into three blocks. Each block needs its own evidence.', 'The penalty matrix has zero in its intercept entry. Use mldivide rather than inv.', 'Recompute q1 and q2 after value iteration. The action gap is the minimum across states of abs(q1-q2), not a Bellman residual.'],
      transfer: 'Write a short audit using your actual outputs: justify the numerical solve, quantify held-out prediction error, and identify the more fragile action. Perturb one training target by ±0.2, refit, and report whether that action changes. State which new measurements you would collect before deploying the policy.',
    },
  },
]
