import { mat, vec } from './helpers.js'

// Each program is evaluated again with fresh named inputs. No reference answer
// or sampled numeric answer is embedded in learner code.
const output = (name, message = `Recompute ${name} from the supplied inputs; check the formula and convention in the prompt.`) => ({ name, message, tolerance: 1e-6 })
function task(id, title, difficulty, inputs, prompt, solution, names, hints) {
  return { id, title, difficulty, generate(rng) {
    return { prompt, setup: inputs(rng), starter: `% Replace each placeholder with your calculation.\n${names.map(name => `${name}=NaN;`).join('\n')}`, solution, outputs: names.map(name => output(name)), hints }
  } }
}
const three = (a, b, c) => [a, b, c]
const literal = (values) => Object.entries(values).map(([name, value]) => `${name}=${Array.isArray(value) ? (Array.isArray(value[0]) ? mat(value) : vec(value)) : value};`).join('\n')
const meanColumns = (source, centered, means) => `${means}=zeros(size(${source},2),1);
${centered}=${source};
for j=1:size(${source},2)
  ${means}(j)=mean(${source}(:,j));
  ${centered}(:,j)=${source}(:,j)-${means}(j);
end`
const sigmoid = (scores, probabilities) => `${probabilities}=zeros(length(${scores}),1);
for i=1:length(${scores})
  if ${scores}(i)>=0
    ${probabilities}(i)=1/(1+exp(-${scores}(i)));
  else
    e=exp(${scores}(i));
    ${probabilities}(i)=e/(1+e);
  end
end`
const greedy = (first, second, policy) => `${policy}=ones(length(${first}),1);
for s=1:length(${first})
  if ${second}(s)>${first}(s)
    ${policy}(s)=2;
  end
end`
const policyRows = (policy, transition, rewards) => `${transition}=zeros(size(P1,1),size(P1,2));
${rewards}=zeros(size(P1,1),1);
for s=1:size(P1,1)
  for j=1:size(P1,2)
    if ${policy}(s)==1
      ${transition}(s,j)=P1(s,j);
    else
      ${transition}(s,j)=P2(s,j);
    end
  end
  if ${policy}(s)==1
    ${rewards}(s)=r1(s);
  else
    ${rewards}(s)=r2(s);
  end
end`
const valueIteration = (reward1 = 'r1', reward2 = 'r2', value = 'value', rounds = 'iterations') => `${value}=zeros(size(P1,1),1);
for k=1:${rounds}
  q1=${reward1}+gamma*(P1*${value});
  q2=${reward2}+gamma*(P2*${value});
  ${value}=max(q1,q2);
end
q1=${reward1}+gamma*(P1*${value});
q2=${reward2}+gamma*(P2*${value});`
const fitReward = `A=transpose(X)*X+lambda*penalty;
b=transpose(X)*y;
coefficients=mldivide(A,b);
r1=Xstate*coefficients;`
const centeredPipeline = `${meanColumns('Xtrain', 'Xc', 'mu')}
Xt=Xtest;
for j=1:size(Xtrain,2)
  Xt(:,j)=Xtest(:,j)-mu(j);
end
ymean=mean(ytrain);
yc=ytrain-ymean;
[U,S,V]=svd(Xc);
direction=V(:,1);
scores=Xc*direction;
denominator=dot(scores,scores)+lambda;
coefficient=dot(scores,yc)/denominator;
predictions=ymean+(Xt*direction)*coefficient;`
const rankOne = (source, estimate) => `[U,S,V]=svd(${source});
Sk=zeros(size(S,1),size(S,2));
Sk(1,1)=S(1,1);
${estimate}=U*Sk*transpose(V);`
const fillRatings = `fillMean=sum(sum(R.*observed))/sum(sum(observed));
filled=R.*observed+(1-observed)*fillMean;`
const fullBackprop = `h=tanh(W*x);
prediction=dot(v,h)+offset;
error=prediction-y;
gradV=error*h;
delta=(error*v).*(1-h.^2);
gradW=reshape(delta,length(delta),1)*reshape(x,1,length(x));`
const policyIteration = `policy=ones(size(P1,1),1);
for round=1:maxRounds
  ${policyRows('policy', 'Ppi', 'rpi')}
  value=mldivide(eye(size(P1,1))-gamma*Ppi,rpi);
  oldPolicy=policy;
  q1=r1+gamma*(P1*value);
  q2=r2+gamma*(P2*value);
  ${greedy('q1', 'q2', 'policy')}
  if max(abs(policy-oldPolicy))==0
    break
  end
end`

function regressionInputs(rng) {
  const n = rng.int(3,5), start = rng.int(-2,0), intercept = rng.int(1,4), slope = rng.int(1,3)
  const xs = Array.from({ length: n }, (_, i) => start+i)
  return literal({ X: xs.map(x => [1,x]), y: xs.map((x,i) => intercept+slope*x+(i===1?1:0)), w: [rng.int(-2,2),rng.nonzero(-2,2)], eta: 0.01, weights: xs.map(()=>rng.int(1,4)), epsilon: 0.00001 })
}
function quadraticInputs(rng) {
  const a=rng.int(1,3), b=rng.int(4,8)
  return literal({ H:[[a,0],[0,b]], curvatures:[a,b], w0:[rng.nonzero(-4,4),rng.nonzero(-4,4)], eta:rng.pick([0.05,0.1,0.15]), proposed:rng.pick([0.1,0.4,0.8]), iterations:rng.int(20,35) })
}
function logisticInputs(rng) {
  const n=rng.int(3,5)
  return literal({ X:Array.from({length:n},(_,i)=>[1,i-2]), y:Array.from({length:n},(_,i)=>(i+rng.int(0,1))%2), w:[rng.nonzero(-3,3),rng.nonzero(-4,4)], eta:0.05, threshold:rng.pick([0.4,0.5,0.7]), clip:0.001 })
}
function extremeLogisticInputs(rng) {
  return literal({ X:[[1,-1],[1,0],[1,1]], y:[1,0,0], w:[rng.int(-2,2),rng.int(800,1200)], eta:0.01, threshold:0.5, clip:rng.pick([0.001,0.0001]) })
}
function networkInputs(rng) {
  return literal({ x:[rng.nonzero(-2,2),rng.nonzero(-2,2)], W:[[rng.int(-3,3)/4,rng.int(-3,3)/4],[rng.int(-3,3)/4,rng.int(-3,3)/4]], v:[rng.nonzero(-3,3)/2,rng.nonzero(-3,3)/2], y:rng.int(-2,2), offset:rng.int(-2,2)/4, eta:0.01, epsilon:0.00001, X:[[rng.nonzero(-2,2),rng.nonzero(-2,2)],[rng.nonzero(-2,2),rng.nonzero(-2,2)]], targets:[rng.int(-2,2),rng.int(-2,2)] })
}
function markovInputs(rng) {
  const normalized = () => {const a=[rng.int(1,5),rng.int(1,5),rng.int(1,5)];const total=a.reduce((x,y)=>x+y,0);return a.map(x=>x/total)}
  return literal({ P:[normalized(),normalized(),normalized()], p0:normalized(), payoffs:[rng.int(-2,6),rng.int(-2,6),rng.int(-2,6)], steps:rng.int(3,9) })
}
function evaluationInputs(rng) {
  const a=rng.int(1,8)/10,b=rng.int(1,8)/10
  return literal({ P:[[a,1-a],[b,1-b]], r:[rng.int(1,5),rng.int(-2,4)], gamma:rng.pick([0.3,0.5,0.7]), iterations:100, candidate:[rng.int(-2,2),rng.int(-2,2)], shift:rng.nonzero(-3,3), otherRewards:[rng.int(-3,4),rng.int(-3,4)], alpha:rng.int(1,3), beta:rng.int(1,3) })
}
function controlInputs(rng) {
  const a=rng.int(1,8)/10,b=rng.int(1,8)/10,c=rng.int(1,8)/10,d=rng.int(1,8)/10
  return literal({ P1:[[a,1-a],[b,1-b]], P2:[[c,1-c],[d,1-d]], r1:[rng.int(0,3),rng.int(-1,1)], r2:[rng.int(-1,1),rng.int(2,5)], gamma:rng.pick([0.3,0.5,0.7]), iterations:120, maxRounds:12, terminal:[rng.int(0,2),rng.int(3,7)], horizon:rng.int(2,5), firstBonus:[rng.int(1,3),rng.int(-2,0)], shift:rng.nonzero(-2,2), candidate:[rng.int(0,2),rng.int(0,2)], policy0:[rng.pick([1,2]),rng.pick([1,2])], targetError:0.00001 })
}
function ratingsInputs(rng) {
  return literal({ R:[[rng.int(1,5),rng.int(1,5),0],[rng.int(1,5),0,rng.int(1,5)],[0,rng.int(1,5),rng.int(1,5)]], observed:[[1,1,0],[1,0,1],[0,1,1]], heldoutTruth:rng.int(1,5), poison:rng.int(20,50), coldTruth:rng.int(1,5) })
}
function pcaInputs(rng) {
  const intercept=rng.int(1,3),slope=rng.int(1,3)
  return literal({ Xtrain:[[0,rng.int(-2,2)],[1,rng.int(0,3)],[2,rng.int(2,5)],[3,rng.int(3,7)]], ytrain:[intercept,intercept+slope+1,intercept+2*slope-1,intercept+3*slope], Xtest:[[4,rng.int(4,9)],[5,rng.int(5,10)]], ytest:[intercept+4*slope,intercept+5*slope+1], lambda:rng.pick([0.5,1,2]) })
}
function auditInputs(rng) {
  const intercept=rng.int(1,3),slope=rng.int(1,2)
  return literal({ X:[[1,0],[1,1],[1,2]], y:[intercept,intercept+slope+1,intercept+2*slope], lambda:rng.pick([0.5,1,2]), penalty:[[0,0],[0,1]], Xstate:[[1,0],[1,2]], Xtest:[[1,3],[1,4]], ytest:[intercept+3*slope,intercept+4*slope+1], P1:[[1,0],[0,1]], P2:[[0,1],[1,0]], r2:[rng.int(0,1),rng.int(3,6)], gamma:rng.pick([0.3,0.5,0.7]), iterations:120, rewardRadius:rng.pick([0.1,0.2,0.3]), changedRow:rng.int(1,3), perturbation:rng.pick([-0.5,0.5]) })
}

export const applicationsPractice = {
  'laml-vectorized-gradient': [
    task('residual-accounting','Account for every squared error','Warm-up',regressionInputs,
      'For residual=prediction-target, compute predictions=X*w, residual, and loss=sum(residual.^2)/(2*m), where m is the number of examples.',
      `predictions=X*w;\nresidual=predictions-y;\nloss=sum(residual.^2)/(2*size(X,1));`, ['predictions','residual','loss'],
      three('Form the complete prediction vector before subtracting targets.','Keep one residual for each row of X.','Square entries with .^2 and divide their sum by twice size(X,1).')),
    task('gradient-components','Separate baseline and slope contributions','Warm-up',regressionInputs,
      'Compute gradient=transpose(X)*(X*w-y)/m. Save baselineGradient=gradient(1) and slopeGradient=gradient(2) separately; m is the row count.',
      `residual=X*w-y;\ngradient=transpose(X)*residual/size(X,1);\nbaselineGradient=gradient(1);\nslopeGradient=gradient(2);`, ['gradient','baselineGradient','slopeGradient'],
      three('The intercept feature is the column of ones.','Multiply transpose(X) by the residual vector.','Average by the number of observations, then select the two components.')),
    task('one-learning-step','Take and evaluate one learning step','Apply',regressionInputs,
      'Save updated=w-eta*gradient, afterLoss evaluated at updated, and improvement=beforeLoss-afterLoss. Use squared loss divided by 2*m at both parameter vectors.',
      `m=size(X,1);\nr=X*w-y;\ngradient=transpose(X)*r/m;\nbeforeLoss=sum(r.^2)/(2*m);\nupdated=w-eta*gradient;\nafterLoss=sum((X*updated-y).^2)/(2*m);\nimprovement=beforeLoss-afterLoss;`, ['updated','afterLoss','improvement'],
      three('The gradient belongs to the original w.','Subtract eta times that gradient.','Recompute residuals after changing w; reusing old residuals would hide the update.')),
    task('repair-uphill-update','Diagnose an uphill update','Apply',regressionInputs,
      'An erroneous trainer adds eta*gradient. Compute wrongParameters with that rule, correctedParameters with descent, and excessLoss=loss(wrongParameters)-loss(correctedParameters), using the same original gradient.',
      `m=size(X,1);\ng=transpose(X)*(X*w-y)/m;\nwrongParameters=w+eta*g;\ncorrectedParameters=w-eta*g;\nexcessLoss=(sum((X*wrongParameters-y).^2)-sum((X*correctedParameters-y).^2))/(2*m);`, ['wrongParameters','correctedParameters','excessLoss'],
      three('Both proposed updates must start at the same original w.','The gradient points toward increasing loss.','Evaluate each candidate separately and subtract corrected loss from erroneous loss.')),
    task('weighted-observations','Give examples different importance','Transfer',regressionInputs,
      'Positive weights give each example an importance. Define weightedLoss=sum(weights.*r.^2)/(2*sum(weights)), with r=X*w-y. Compute weightedGradient=transpose(X)*(weights.*r)/sum(weights) and weightedUpdate=w-eta*weightedGradient.',
      `r=X*w-y;\nweightedLoss=sum(weights.*r.^2)/(2*sum(weights));\nweightedGradient=transpose(X)*(weights.*r)/sum(weights);\nweightedUpdate=w-eta*weightedGradient;`, ['weightedLoss','weightedGradient','weightedUpdate'],
      three('Importance weights multiply individual residual contributions, not feature columns.','Normalize by total importance rather than observation count.','Apply the weighted residual vector inside transpose(X)*(weights.*r).')),
    task('numerical-slope-audit','Audit a gradient using nearby losses','Transfer',regressionInputs,
      'Compute analyticSlope, the second component of the gradient. Independently shift w(2) by ±epsilon and compute numericalSlope=(lossPlus-lossMinus)/(2*epsilon). Save disagreement=abs(analyticSlope-numericalSlope). Both losses use sum(r.^2)/(2*m).',
      `m=size(X,1);\ngradient=transpose(X)*(X*w-y)/m;\nanalyticSlope=gradient(2);\nplus=w;\nminus=w;\nplus(2)=w(2)+epsilon;\nminus(2)=w(2)-epsilon;\nlossPlus=sum((X*plus-y).^2)/(2*m);\nlossMinus=sum((X*minus-y).^2)/(2*m);\nnumericalSlope=(lossPlus-lossMinus)/(2*epsilon);\ndisagreement=abs(analyticSlope-numericalSlope);`, ['analyticSlope','numericalSlope','disagreement'],
      three('Perturb only the slope, leaving the intercept fixed.','Re-evaluate the complete loss at each perturbed parameter vector.','The symmetric difference divides by 2*epsilon, not epsilon.')),
  ],
  'laml-descent-convergence': [
    task('curvature-step-limit','Find a safe step interval','Warm-up',quadraticInputs,
      'Save largestCurvature=max(curvatures), upperLimit=2/largestCurvature, and safe=1 only when proposed lies strictly between 0 and upperLimit; otherwise safe=0.',
      `largestCurvature=max(curvatures);\nupperLimit=2/largestCurvature;\nsafe=0;\nif proposed>0\n  safe=1;\nend\nif proposed>=upperLimit\n  safe=0;\nend`, ['largestCurvature','upperLimit','safe'],
      three('The steepest direction limits the step.','The bound is strict: equality may preserve oscillations.','Start with a zero flag, accept a positive step, then reject one at or above the limit.')),
    task('quadratic-step','Compute one quadratic update','Warm-up',quadraticInputs,
      'For loss dot(w,H*w)/2, compute gradient=H*w0, next=w0-eta*gradient, and nextLoss evaluated at next.',
      `gradient=H*w0;\nnext=w0-eta*gradient;\nnextLoss=dot(next,H*next)/2;`, ['gradient','next','nextLoss'],
      three('For this quadratic, the gradient is H times the coefficients.','Use the supplied eta once.','Evaluate the new quadratic at next, not at w0.')),
    task('oscillation-trace','Track shrinking oscillations','Apply',quadraticInputs,
      'Run iterations descent steps from w0 with eta. Save firstStep, finalParameters, and gradientNorm=norm(H*finalParameters). Also save multipliers=1-eta*curvatures, which expose sign reversals.',
      `multipliers=1-eta*curvatures;\nfinalParameters=w0;\nfor k=1:iterations\n  finalParameters=finalParameters-eta*(H*finalParameters);\n  if k==1\n    firstStep=finalParameters;\n  end\nend\ngradientNorm=norm(H*finalParameters);`, ['firstStep','finalParameters','gradientNorm','multipliers'],
      three('A negative multiplier reverses one coordinate at each step.','Record the first update inside the loop.','Keep applying the current gradient; do not multiply the original gradient by the iteration count.')),
    task('diagnose-proposed-rate','Diagnose a proposed learning rate','Apply',quadraticInputs,
      'Compute multipliers=1-proposed*curvatures and amplification=max(abs(multipliers)). Save converges=1 only if amplification<1, and oscillates=1 if any multiplier is negative. Both flags otherwise equal 0.',
      `multipliers=1-proposed*curvatures;\namplification=max(abs(multipliers));\nconverges=0;\nif amplification<1\n  converges=1;\nend\noscillates=0;\nfor j=1:length(multipliers)\n  if multipliers(j)<0\n    oscillates=1;\n  end\nend`, ['multipliers','amplification','converges','oscillates'],
      three('Convergence depends on magnitude, while oscillation depends on sign.','Take absolute values before finding the largest amplification.','Inspect every direction when setting the oscillates flag.')),
    task('cap-unsafe-step','Repair a potentially unsafe step','Transfer',quadraticInputs,
      'Choose repairedRate=min(proposed,1/max(curvatures)). Run iterations updates from w0 at that rate. Return repairedRate, finalLoss, and contraction=max(abs(1-repairedRate*curvatures)).',
      `repairedRate=min(proposed,1/max(curvatures));\nw=w0;\nfor k=1:iterations\n  w=w-repairedRate*(H*w);\nend\nfinalLoss=dot(w,H*w)/2;\ncontraction=max(abs(1-repairedRate*curvatures));`, ['repairedRate','finalLoss','contraction'],
      three('The chosen cap is half the strict upper stability limit.','Use repairedRate for every update.','The reported contraction must belong to the repaired rate, not the original proposal.')),
    task('rotated-curvature','Work in rotated coordinates','Transfer',rng=>quadraticInputs(rng)+`\nrotation=[0.6 -0.8;0.8 0.6];\nH=rotation*H*transpose(rotation);`,
      'H is a rotated positive-definite bowl. Use eig(H) to compute rate=1/largest eigenvalue. Run iterations updates from w0. Save rate, finalParameters, and finalGradientNorm. Do not read diagonal entries as eigenvalues after rotation.',
      `[Q,D]=eig(H);\nrate=1/max(diag(D));\nfinalParameters=w0;\nfor k=1:iterations\n  finalParameters=finalParameters-rate*(H*finalParameters);\nend\nfinalGradientNorm=norm(H*finalParameters);`, ['rate','finalParameters','finalGradientNorm'],
      three('A rotation changes matrix entries without changing its eigenvalues.','Take the diagonal of D from eig, then its maximum.','The update itself remains in the original coordinates using H.')),
  ],
  'laml-stable-logistic': [
    task('stable-probabilities','Map scores safely to probabilities','Warm-up',logisticInputs,
      'Compute scores=X*w and probabilities using the stable sigmoid: for score>=0 use 1/(1+exp(-score)); otherwise use exp(score)/(1+exp(score)).',
      `scores=X*w;\n${sigmoid('scores','probabilities')}`, ['scores','probabilities'],
      three('Form one score for each example.','Choose the branch separately for each score.','Every exponential in your chosen branch should receive a nonpositive argument.')),
    task('extreme-loss','Preserve the penalty for confident mistakes','Warm-up',extremeLogisticInputs,
      'Compute scores and perExampleLoss=max(scores,0)-y.*scores+log(1+exp(-abs(scores))). Save meanLoss as their average. Do not take logarithms of rounded probabilities.',
      `scores=X*w;\nperExampleLoss=max(scores,0)-y.*scores+log(1+exp(-abs(scores)));\nmeanLoss=mean(perExampleLoss);`, ['perExampleLoss','meanLoss'],
      three('These scores can overflow a direct exponential.','The stable expression uses -abs(scores) inside exp.','Confidently incorrect examples must retain a large finite loss.')),
    task('logistic-gradient-update','Update a binary classifier','Apply',logisticInputs,
      'Compute stable probabilities, gradient=transpose(X)*(probabilities-y)/m, and updated=w-eta*gradient. Save gradient and updated.',
      `scores=X*w;\n${sigmoid('scores','probabilities')}\ngradient=transpose(X)*(probabilities-y)/size(X,1);\nupdated=w-eta*gradient;`, ['gradient','updated'],
      three('The residual for logistic regression is probability minus target.','Average contributions with the transpose of the design matrix.','Subtract the gradient when updating the parameters.')),
    task('clipping-bias','Measure what probability clipping hides','Apply',extremeLogisticInputs,
      'Compute stableLoss from scores. Also compute clipped probabilities limited to [clip,1-clip], then clippedLoss=-mean(y.*log(clipped)+(1-y).*log(1-clipped)). Save hiddenPenalty=stableLoss-clippedLoss. This compares objectives; clipping is not the requested stability repair.',
      `scores=X*w;\n${sigmoid('scores','p')}\nstableLoss=mean(max(scores,0)-y.*scores+log(1+exp(-abs(scores))));\nclipped=min(max(p,clip),1-clip);\nclippedLoss=-mean(y.*log(clipped)+(1-y).*log(1-clipped));\nhiddenPenalty=stableLoss-clippedLoss;`, ['stableLoss','clippedLoss','hiddenPenalty'],
      three('Use the same scores and labels for both objectives.','Clip only the probability-based comparison, not the stable score loss.','Subtract the clipped objective from the stable objective to expose the lost penalty.')),
    task('decision-threshold','Turn probabilities into decisions','Transfer',logisticInputs,
      'Compute stable probabilities. Set each decision to 1 if its probability>=threshold, otherwise 0. Save decisions, positiveCount=sum(decisions), and accuracy as the fraction matching y. Thresholding changes decisions, not fitted probabilities.',
      `scores=X*w;\n${sigmoid('scores','probabilities')}\ndecisions=zeros(length(y),1);\ncorrect=0;\nfor i=1:length(y)\n  if probabilities(i)>=threshold\n    decisions(i)=1;\n  end\n  if decisions(i)==y(i)\n    correct=correct+1;\n  end\nend\npositiveCount=sum(decisions);\naccuracy=correct/length(y);`, ['decisions','positiveCount','accuracy'],
      three('Fit probabilities first; apply the supplied threshold afterward.','Use >= so an exact threshold match becomes class 1.','Count correct labels explicitly and divide by the total example count.')),
    task('label-symmetry','Audit a reversed label convention','Transfer',logisticInputs,
      'Reverse the meaning of class 1 by replacing labels with 1-y and coefficients with -w. Compute originalLoss, reversedLoss, and probabilityMismatch=max(abs(reversedProbabilities-(1-originalProbabilities))) using stable formulas.',
      `scores=X*w;\n${sigmoid('scores','originalProbabilities')}\nreversedScores=-scores;\n${sigmoid('reversedScores','reversedProbabilities')}\noriginalLoss=mean(max(scores,0)-y.*scores+log(1+exp(-abs(scores))));\nreversedTargets=1-y;\nreversedLoss=mean(max(reversedScores,0)-reversedTargets.*reversedScores+log(1+exp(-abs(reversedScores))));\nprobabilityMismatch=max(abs(reversedProbabilities-(1-originalProbabilities)));`, ['originalLoss','reversedLoss','probabilityMismatch'],
      three('Reverse both the label and the score sign.','The reversed probabilities should complement the originals.','Evaluate both stable losses independently; their equality follows from the label convention.')),
  ],
  'laml-backpropagation': [
    task('network-forward','Read a two-layer forward pass','Warm-up',networkInputs,
      'Compute hidden=tanh(W*x), prediction=dot(v,hidden)+offset, and loss=(prediction-y)^2/2. offset is a supplied scalar output bias.',
      `hidden=tanh(W*x);\nprediction=dot(v,hidden)+offset;\nloss=(prediction-y)^2/2;`, ['hidden','prediction','loss'],
      three('The nonlinearity comes between the two linear operations.','Add the output offset after the dot product.','Square the scalar prediction error and divide by two.')),
    task('output-layer-gradient','Differentiate output weights and bias','Warm-up',networkInputs,
      'Keep the hidden layer fixed. Compute gradV=(prediction-y)*hidden and gradOffset=prediction-y for prediction=dot(v,tanh(W*x))+offset.',
      `hidden=tanh(W*x);\nprediction=dot(v,hidden)+offset;\ngradOffset=prediction-y;\ngradV=gradOffset*hidden;`, ['gradV','gradOffset'],
      three('The output layer is a linear prediction from hidden features.','The derivative with respect to its scalar bias is the error.','Multiply the error by each hidden activation for the weight derivatives.')),
    task('hidden-chain-rule','Backpropagate into the hidden layer','Apply',networkInputs,
      'Compute the squared-loss gradients gradV and gradW for the supplied network with output offset. Use delta=((prediction-y)*v).*(1-hidden.^2), then its outer product with x.',
      `${fullBackprop}`, ['gradV','gradW'],
      three('Compute the forward pass before differentiating.','Include both the output weights and the tanh derivative in delta.','Use reshape(delta,2,1)*reshape(x,1,2) to preserve outer-product dimensions in this engine.')),
    task('simultaneous-network-step','Repair a stale-gradient training step','Apply',networkInputs,
      'Compute both layer gradients at the original W and v. Save nextW=W-eta*gradW and nextV=v-eta*gradV. Keep offset fixed, then save nextLoss from the complete updated forward pass. Do not recompute the second gradient after changing one layer.',
      `${fullBackprop}\nnextW=W-eta*gradW;\nnextV=v-eta*gradV;\nnextPrediction=dot(nextV,tanh(nextW*x))+offset;\nnextLoss=(nextPrediction-y)^2/2;`, ['nextW','nextV','nextLoss'],
      three('Both derivatives must refer to the same original parameter state.','Store gradients before assigning updated weights.','Run a fresh forward pass with both updated layers to evaluate nextLoss.')),
    task('all-weights-finite-difference','Audit every first-layer derivative','Transfer',networkInputs,
      'Compute gradW analytically. Independently perturb every W(i,j) by ±epsilon, recompute the full squared loss, and store those derivatives in numerical. Save maximumError=max(abs(gradW-numerical)) over all entries.',
      `${fullBackprop}\nnumerical=zeros(size(W,1),size(W,2));\nfor row=1:size(W,1)\n  for column=1:size(W,2)\n    plus=W;\n    minus=W;\n    plus(row,column)=W(row,column)+epsilon;\n    minus(row,column)=W(row,column)-epsilon;\n    lp=(dot(v,tanh(plus*x))+offset-y)^2/2;\n    lm=(dot(v,tanh(minus*x))+offset-y)^2/2;\n    numerical(row,column)=(lp-lm)/(2*epsilon);\n  end\nend\nmaximumError=max(max(abs(gradW-numerical)));`, ['gradW','numerical','maximumError'],
      three('Use a new copy of the original W for each perturbation.','Recompute tanh and the output loss for plus and minus weights.','Compare corresponding matrix entries, then take the largest absolute discrepancy.')),
    task('batch-backpropagation','Accumulate gradients across examples','Transfer',networkInputs,
      'Rows of X are input examples and targets has one target per row. Compute meanLoss and mean first-layer/output-weight gradients batchGradW and batchGradV for this batch, keeping W, v, and offset fixed during accumulation.',
      `batchGradW=zeros(size(W,1),size(W,2));\nbatchGradV=zeros(length(v),1);\nmeanLoss=0;\nfor sample=1:size(X,1)\n  xi=transpose(X(sample,:));\n  hi=tanh(W*xi);\n  ei=dot(v,hi)+offset-targets(sample);\n  di=(ei*v).*(1-hi.^2);\n  batchGradW=batchGradW+reshape(di,length(di),1)*reshape(xi,1,length(xi));\n  batchGradV=batchGradV+ei*hi;\n  meanLoss=meanLoss+ei^2/2;\nend\nbatchGradW=batchGradW/size(X,1);\nbatchGradV=batchGradV/size(X,1);\nmeanLoss=meanLoss/size(X,1);`, ['meanLoss','batchGradW','batchGradV'],
      three('A batch gradient is the average of per-example gradients at the same parameter values.','Accumulate matrices and vectors separately without updating W or v.','Divide accumulated loss and both gradients by size(X,1).')),
  ],
  'laml-markov-state-vectors': [
    task('probability-forward','Move a probability distribution forward','Warm-up',markovInputs,
      'P has current-state rows and next-state columns. Compute nextDistribution=transpose(P)*p0 and totalMass=sum(nextDistribution).',
      `nextDistribution=transpose(P)*p0;\ntotalMass=sum(nextDistribution);`, ['nextDistribution','totalMass'],
      three('A distribution is treated as a column of probability mass.','Transpose a row-stochastic matrix to propagate it forward.','The total mass should remain one within numerical precision.')),
    task('payoffs-backward','Pull future payoffs back to current states','Warm-up',markovInputs,
      'Compute expectedNext=P*payoffs for every current state. Save initialExpectation=dot(p0,expectedNext). Do not transpose P when averaging future payoffs.',
      `expectedNext=P*payoffs;\ninitialExpectation=dot(p0,expectedNext);`, ['expectedNext','initialExpectation'],
      three('Each row of P lists the possible next states from one current state.','Multiply that row by the payoff column.','Average those current-state expectations using p0.')),
    task('multi-step-distribution','Propagate several transitions','Apply',markovInputs,
      'Advance p0 for steps transitions and save finalDistribution. Save firstStateHistory including the initial probability followed by state 1 probability after each transition, and massError=abs(sum(finalDistribution)-1).',
      `finalDistribution=p0;\nfirstStateHistory=zeros(steps+1,1);\nfirstStateHistory(1)=p0(1);\nfor k=1:steps\n  finalDistribution=transpose(P)*finalDistribution;\n  firstStateHistory(k+1)=finalDistribution(1);\nend\nmassError=abs(sum(finalDistribution)-1);`, ['finalDistribution','firstStateHistory','massError'],
      three('There are steps+1 entries when the initial state is included.','Use the result of the previous transition each time.','Check mass independently of the plotted or stored state-1 history.')),
    task('orientation-repair','Expose an orientation error','Apply',markovInputs,
      'A programmer used wrong=P*p0 to propagate a distribution. Compute wrongMass=sum(wrong), corrected=transpose(P)*p0, and discrepancy=norm(wrong-corrected). A plausible-looking vector need not conserve mass.',
      `wrong=P*p0;\nwrongMass=sum(wrong);\ncorrected=transpose(P)*p0;\ndiscrepancy=norm(wrong-corrected);`, ['wrongMass','corrected','discrepancy'],
      three('Both products may be numerically defined; their interpretations differ.','A distribution uses transpose(P), whereas payoff expectation uses P.','Compare the vectors and the erroneous total mass.')),
    task('stationary-distribution','Solve for a conserved long-run distribution','Transfer',markovInputs,
      'A stationary column distribution satisfies transpose(P)*stationary=stationary and sum(stationary)=1. Form A=transpose(P)-I, replace its last row with ones, and replace the last entry of a zero right-hand side with 1. Solve for stationary and save stationarityResidual=norm(transpose(P)*stationary-stationary). All supplied transitions are strictly positive.',
      `n=size(P,1);\nA=transpose(P)-eye(n);\nb=zeros(n,1);\nfor j=1:n\n  A(n,j)=1;\nend\nb(n)=1;\nstationary=mldivide(A,b);\nstationarityResidual=norm(transpose(P)*stationary-stationary);`, ['stationary','stationarityResidual'],
      three('The transition equation alone has a free normalization.','Replace one dependent equation by the sum-to-one constraint.','Verify the result against the original transition matrix after solving.')),
    task('duality-audit','Check forward/backward agreement','Transfer',markovInputs,
      'Compute forwardValue=dot(transpose(P)*p0,payoffs) and backwardValue=dot(p0,P*payoffs). Repeat the calculation for two transitions, storing twoStepValue. Save mismatch=abs(forwardValue-backwardValue).',
      `p1=transpose(P)*p0;\nforwardValue=dot(p1,payoffs);\nbackwardValue=dot(p0,P*payoffs);\np2=transpose(P)*p1;\ntwoStepValue=dot(p2,payoffs);\nmismatch=abs(forwardValue-backwardValue);`, ['forwardValue','backwardValue','twoStepValue','mismatch'],
      three('Moving probabilities forward and values backward should describe the same expectation.','Use the original p0 for the backward expression.','For two transitions, propagate the distribution twice before applying the final payoff.')),
  ],
  'laml-policy-evaluation': [
    task('single-policy-backup','Perform one expectation backup','Warm-up',evaluationInputs,
      'Treat candidate as the current value estimate. Compute continuation=P*candidate and backup=r+gamma*continuation. Rewards are immediate, before the discounted next value.',
      `continuation=P*candidate;\nbackup=r+gamma*continuation;`, ['continuation','backup'],
      three('Use P without transposing it for future-value expectations.','Discount only continuation, not the immediate reward.','Every state uses the same old candidate vector.')),
    task('direct-policy-value','Solve the discounted policy equation','Warm-up',evaluationInputs,
      'Compute value from (I-gamma*P)*value=r using mldivide. Save linearResidual=norm((I-gamma*P)*value-r).',
      `A=eye(size(P,1))-gamma*P;\nvalue=mldivide(A,r);\nlinearResidual=norm(A*value-r);`, ['value','linearResidual'],
      three('Move the discounted continuation term to the left.','The identity size equals the state count.','Check the computed value in the original linear system.')),
    task('iterative-certificate','Attach a certificate to iterative evaluation','Apply',evaluationInputs,
      'Start at zero and perform iterations Bellman expectation updates. Return value, residual=max(abs(r+gamma*P*value-value)), and errorBound=residual/(1-gamma).',
      `value=zeros(size(P,1),1);\nfor k=1:iterations\n  value=r+gamma*(P*value);\nend\nresidual=max(abs(r+gamma*(P*value)-value));\nerrorBound=residual/(1-gamma);`, ['value','residual','errorBound'],
      three('The update includes both rewards and continuation every time.','Recompute one more backup after the last update.','Divide the maximum state-equation mismatch by 1-gamma.')),
    task('audit-candidate-values','Audit an untrusted value report','Apply',evaluationInputs,
      'For the supplied candidate, compute reportedResidual=max(abs(r+gamma*P*candidate-candidate)), certifiedBound=reportedResidual/(1-gamma), exactValue from a direct solve, and actualError=max(abs(candidate-exactValue)).',
      `reportedResidual=max(abs(r+gamma*(P*candidate)-candidate));\ncertifiedBound=reportedResidual/(1-gamma);\nexactValue=mldivide(eye(size(P,1))-gamma*P,r);\nactualError=max(abs(candidate-exactValue));`, ['reportedResidual','certifiedBound','exactValue','actualError'],
      three('An untrusted candidate still has a computable equation residual.','The bound concerns the maximum absolute state error.','Use the direct solution only as an independent audit, not to define the residual.')),
    task('constant-reward-shift','Predict the effect of a permanent reward shift','Transfer',evaluationInputs,
      'Evaluate originalValue for r and shiftedValue for r+shift in every state. Save measuredShift=shiftedValue-originalValue and predictedShift=shift/(1-gamma). A constant reward shift repeats at every time, unlike a one-time bonus.',
      `A=eye(size(P,1))-gamma*P;\noriginalValue=mldivide(A,r);\nshiftedValue=mldivide(A,r+shift);\nmeasuredShift=shiftedValue-originalValue;\npredictedShift=shift/(1-gamma);`, ['originalValue','shiftedValue','measuredShift','predictedShift'],
      three('Use the same transition matrix and discount in both solves.','Add shift to every immediate reward.','The infinite discounted constant stream sums to shift/(1-gamma).')),
    task('reward-linearity','Combine two reward streams','Transfer',evaluationInputs,
      'Evaluate valueA for r, valueB for otherRewards, and combinedValue for alpha*r+beta*otherRewards under the same policy. Save linearityError=norm(combinedValue-(alpha*valueA+beta*valueB)). This linearity holds for a fixed policy, without action maximization.',
      `A=eye(size(P,1))-gamma*P;\nvalueA=mldivide(A,r);\nvalueB=mldivide(A,otherRewards);\ncombinedValue=mldivide(A,alpha*r+beta*otherRewards);\nlinearityError=norm(combinedValue-(alpha*valueA+beta*valueB));`, ['valueA','valueB','combinedValue','linearityError'],
      three('The left-hand system matrix is identical for all three evaluations.','Combine rewards before the third solve.','Compare with the same weighted combination of separately evaluated values.')),
  ],
  'laml-backward-induction': [
    task('last-decision','Choose the last chronological decision','Warm-up',controlInputs,
      'With one decision remaining and discount gamma, compute q1=r1+gamma*P1*terminal and q2=r2+gamma*P2*terminal. Save lastValue=max(q1,q2) and lastPolicy, choosing action 1 for ties.',
      `q1=r1+gamma*(P1*terminal);\nq2=r2+gamma*(P2*terminal);\nlastValue=max(q1,q2);\n${greedy('q1','q2','lastPolicy')}`, ['lastValue','lastPolicy'],
      three('The terminal vector is the continuation after the final decision.','Compute both actions from that same terminal vector.','Choose action 2 only for a strict improvement.')),
    task('fixed-finite-horizon','Evaluate a fixed action for a finite horizon','Warm-up',controlInputs,
      'Use action 1 at every decision. Start with terminal and apply value=r1+gamma*P1*value exactly horizon times. Return value and terminalContribution=gamma^horizon*(P1^horizon)*terminal.',
      `value=terminal;\nfor k=1:horizon\n  value=r1+gamma*(P1*value);\nend\nterminalContribution=gamma^horizon*(P1^horizon)*terminal;`, ['value','terminalContribution'],
      three('At zero remaining decisions only terminal remains.','Repeat the fixed-action recursion exactly horizon times.','The terminal payoff is discounted and transitioned horizon times, then paid once.')),
    task('time-dependent-policy','Recover first and last actions','Apply',controlInputs,
      'Run horizon optimal backward updates from terminal with gamma. Return initialValue, firstPolicy, and lastPolicy. The first backward update describes the last chronological decision; break ties toward action 1.',
      `value=terminal;\nfor remaining=1:horizon\n  q1=r1+gamma*(P1*value);\n  q2=r2+gamma*(P2*value);\n  ${greedy('q1','q2','policy')}\n  if remaining==1\n    lastPolicy=policy;\n  end\n  value=max(q1,q2);\nend\ninitialValue=value;\nfirstPolicy=policy;`, ['initialValue','firstPolicy','lastPolicy'],
      three('Work backward by increasing the number of decisions remaining.','Record the policy before replacing value.','The final backward policy is the first chronological policy.')),
    task('terminal-double-count','Repair a repeatedly paid terminal bonus','Apply',controlInputs,
      'Compute correctValue by starting at terminal and doing horizon optimal backups. Also compute wrongValue from a faulty recursion that adds terminal again to both action rewards at every backup. Save inflation=wrongValue-correctValue.',
      `correctValue=terminal;\nwrongValue=terminal;\nfor k=1:horizon\n  correctValue=max(r1+gamma*(P1*correctValue),r2+gamma*(P2*correctValue));\n  wrongValue=max(r1+terminal+gamma*(P1*wrongValue),r2+terminal+gamma*(P2*wrongValue));\nend\ninflation=wrongValue-correctValue;`, ['correctValue','wrongValue','inflation'],
      three('The correct recursion initializes terminal only once.','For the diagnostic comparison, reproduce the specified faulty extra reward exactly.','Subtract the correct values to quantify the overcount, state by state.')),
    task('launch-only-reward','Handle a reward available only at the first decision','Transfer',controlInputs,
      'The first chronological decision gives action 1 an extra firstBonus; later action-1 rewards remain r1. Action 2 is unchanged. Use horizon and terminal to compute initialValue and firstPolicy with discount gamma. The first bonus is added only on the final backward update.',
      `value=terminal;\nfor remaining=1:horizon\n  currentReward=r1;\n  if remaining==horizon\n    currentReward=r1+firstBonus;\n  end\n  q1=currentReward+gamma*(P1*value);\n  q2=r2+gamma*(P2*value);\n  value=max(q1,q2);\nend\ninitialValue=value;\n${greedy('q1','q2','firstPolicy')}`, ['initialValue','firstPolicy'],
      three('Chronological time runs opposite to the backward loop.','Apply firstBonus only when remaining equals horizon.','Use that final pair of action vectors to recover the initial policy.')),
    task('horizon-comparison','Compare two finite planning horizons','Transfer',controlInputs,
      'With identical terminal payoff and discount, compute shortValue for horizon decisions and longerValue for horizon+1 decisions. Save difference=longerValue-shortValue. Do not assume longer planning always increases value when terminal rewards are discounted.',
      `shortValue=terminal;\nfor k=1:horizon\n  shortValue=max(r1+gamma*(P1*shortValue),r2+gamma*(P2*shortValue));\nend\nlongerValue=max(r1+gamma*(P1*shortValue),r2+gamma*(P2*shortValue));\ndifference=longerValue-shortValue;`, ['shortValue','longerValue','difference'],
      three('Both calculations begin from the same terminal convention.','The horizon+1 value is one additional backup of shortValue.','Report the signed difference instead of forcing it positive.')),
  ],
  'laml-value-iteration': [
    task('greedy-action-values','Compare immediate and continuation rewards','Warm-up',controlInputs,
      'Using candidate as continuation, compute actionOne=r1+gamma*P1*candidate and actionTwo=r2+gamma*P2*candidate. Save greedyPolicy with action 1 on ties.',
      `actionOne=r1+gamma*(P1*candidate);\nactionTwo=r2+gamma*(P2*candidate);\n${greedy('actionOne','actionTwo','greedyPolicy')}`, ['actionOne','actionTwo','greedyPolicy'],
      three('Each action has its own reward and transition matrix.','Discount expected continuation, then add immediate reward.','Compare actions within each state rather than comparing states.')),
    task('optimality-backup','Perform a synchronous optimality backup','Warm-up',controlInputs,
      'Compute nextValue=T(candidate), the entrywise maximum of both discounted action values. Save change=nextValue-candidate and residual=max(abs(change)). All states must use the original candidate.',
      `q1=r1+gamma*(P1*candidate);\nq2=r2+gamma*(P2*candidate);\nnextValue=max(q1,q2);\nchange=nextValue-candidate;\nresidual=max(abs(change));`, ['nextValue','change','residual'],
      three('Form both complete action-value vectors before updating.','Use the entrywise maximum across actions.','The largest absolute state change is this candidate’s Bellman residual.')),
    task('solve-and-extract','Return a value and its final greedy policy','Apply',controlInputs,
      'Start at zero, run iterations value-iteration updates, then recompute action values. Return value, policy, and residual=max(abs(T(value)-value)). Ties choose action 1.',
      `${valueIteration()}\n${greedy('q1','q2','policy')}\nresidual=max(abs(max(q1,q2)-value));`, ['value','policy','residual'],
      three('Use vector backups so every state reads the previous value.','Recompute both action vectors after the last update.','Extract policy and residual from those recomputed vectors.')),
    task('certified-stopping','Stop with a target value-error certificate','Apply',controlInputs,
      'After each backup from zero, recompute the Bellman residual. Stop as soon as residual/(1-gamma)<=targetError, or after iterations updates. Return value, updates, and errorBound using the final residual.',
      `value=zeros(size(P1,1),1);\nfor k=1:iterations\n  value=max(r1+gamma*(P1*value),r2+gamma*(P2*value));\n  q1=r1+gamma*(P1*value);\n  q2=r2+gamma*(P2*value);\n  errorBound=max(abs(max(q1,q2)-value))/(1-gamma);\n  updates=k;\n  if errorBound<=targetError\n    break\n  end\nend`, ['value','updates','errorBound'],
      three('The stopping target is a value-error bound, not an unscaled residual.','Compute another Bellman backup from the newly returned value.','Divide by 1-gamma and record the actual update count before stopping.')),
    task('optimal-reward-shift','Test a reward-shift invariance','Transfer',controlInputs,
      'Solve the original model and a shifted model that adds shift to BOTH action reward vectors in every state. Save originalValue, shiftedValue, valueShift=shiftedValue-originalValue, originalPolicy, and shiftedPolicy. Both models use iterations updates from zero.',
      `${valueIteration('r1','r2','originalValue')}\n${greedy('q1','q2','originalPolicy')}\nshiftedR1=r1+shift;\nshiftedR2=r2+shift;\n${valueIteration('shiftedR1','shiftedR2','shiftedValue')}\n${greedy('q1','q2','shiftedPolicy')}\nvalueShift=shiftedValue-originalValue;`, ['originalValue','shiftedValue','valueShift','originalPolicy','shiftedPolicy'],
      three('The shift must apply to every action and state.','Run the same algorithm on both reward models.','A common permanent reward shift changes values by shift/(1-gamma) while preserving action comparisons.')),
    task('evaluate-extracted-policy','Independently evaluate an extracted policy','Transfer',controlInputs,
      'Use value iteration to extract a greedy policy. Assemble its selected transition rows and rewards, solve its fixed-policy equation, and save evaluatedValue plus optimalityResidual of that evaluated value. This audits whether the extracted actions are optimal.',
      `${valueIteration()}\n${greedy('q1','q2','policy')}\n${policyRows('policy','Ppi','rpi')}\nevaluatedValue=mldivide(eye(size(P1,1))-gamma*Ppi,rpi);\nq1=r1+gamma*(P1*evaluatedValue);\nq2=r2+gamma*(P2*evaluatedValue);\noptimalityResidual=max(abs(max(q1,q2)-evaluatedValue));`, ['policy','evaluatedValue','optimalityResidual'],
      three('A greedy action vector defines a complete fixed policy.','Select one transition row and reward per state before solving.','Evaluate alternatives again at the independently evaluated policy value.')),
  ],
  'laml-recommendation-studio': [
    task('masked-fill','Fill only after defining the observation mask','Warm-up',ratingsInputs,
      'Compute fillMean using only cells where observed=1. Return filled=R.*observed+(1-observed)*fillMean and observedCount. Missing placeholders are not measurements.',
      `${fillRatings}\nobservedCount=sum(sum(observed));`, ['fillMean','filled','observedCount'],
      three('Use the explicit mask instead of testing whether a rating is zero.','Sum training values and observed cells across both matrix dimensions.','Preserve observed entries and put the training mean elsewhere.')),
    task('rank-one-profile','Compress a filled ratings table','Warm-up',ratingsInputs,
      'Fill from observed training cells, compute SVD, and reconstruct estimate using only the largest singular value. Save retainedEnergy=S(1,1)^2/sum(sum(S.^2)).',
      `${fillRatings}\n${rankOne('filled','estimate')}\nretainedEnergy=S(1,1)^2/sum(sum(S.^2));`, ['estimate','retainedEnergy'],
      three('Fit the fill mean before the decomposition.','Keep all factor dimensions while zeroing discarded singular values.','Squared singular values, not unsquared values, define retained energy.')),
    task('holdout-report','Separate training fit from a hidden rating','Apply',ratingsInputs,
      'Fit rank one using training ratings only. Save trainingRmse over observed cells, heldoutPrediction=estimate(2,2), and heldoutSquaredError against heldoutTruth. The held-out truth must not affect fill or SVD.',
      `${fillRatings}\n${rankOne('filled','estimate')}\ntrainingRmse=sqrt(sum(sum(((estimate-R).*observed).^2))/sum(sum(observed)));\nheldoutPrediction=estimate(2,2);\nheldoutSquaredError=(heldoutPrediction-heldoutTruth)^2;`, ['trainingRmse','heldoutPrediction','heldoutSquaredError'],
      three('The held-out cell is excluded by observed.','Compute training error only under the mask.','Consult heldoutTruth after the estimate is completely fitted.')),
    task('rank-validation','Choose rank using validation evidence','Apply',ratingsInputs,
      'Here heldoutTruth is a VALIDATION target at (2,2), not a final test. Compare rank-one and rank-two reconstructions of the same filled training table. Save rankOneError, rankTwoError, selectedRank, and selectedPrediction. Choose rank 1 on ties; this selection does not provide an independent test error.',
      `${fillRatings}\n[U,S,V]=svd(filled);\nS1=zeros(size(S,1),size(S,2));\nS1(1,1)=S(1,1);\nS2=S1;\nS2(2,2)=S(2,2);\nE1=U*S1*transpose(V);\nE2=U*S2*transpose(V);\nrankOneError=(E1(2,2)-heldoutTruth)^2;\nrankTwoError=(E2(2,2)-heldoutTruth)^2;\nselectedRank=1;\nselectedPrediction=E1(2,2);\nif rankTwoError<rankOneError\n  selectedRank=2;\n  selectedPrediction=E2(2,2);\nend`, ['rankOneError','rankTwoError','selectedRank','selectedPrediction'],
      three('Both candidate ranks must use identical training-only filling.','The validation target may select rank, but is then no longer a final test.','Use a strict error improvement to select rank two.')),
    task('masked-poison-test','Detect hidden-cell leakage','Transfer',ratingsInputs,
      'Fit a masked rank-one estimate and save originalPrediction at (2,2). Replace every unobserved R cell with the supplied poison, refit using the unchanged mask, and save poisonedPrediction and leakageDifference=abs(poisonedPrediction-originalPrediction). Correct training code ignores hidden placeholders.',
      `${fillRatings}\n${rankOne('filled','originalEstimate')}\noriginalPrediction=originalEstimate(2,2);\npoisonedR=R.*observed+(1-observed)*poison;\npoisonedMean=sum(sum(poisonedR.*observed))/sum(sum(observed));\npoisonedFilled=poisonedR.*observed+(1-observed)*poisonedMean;\n${rankOne('poisonedFilled','poisonedEstimate')}\npoisonedPrediction=poisonedEstimate(2,2);\nleakageDifference=abs(poisonedPrediction-originalPrediction);`, ['originalPrediction','poisonedPrediction','leakageDifference'],
      three('Poison changes only cells the model is forbidden to observe.','Mask the values before computing both the mean and the filled matrix.','Refit independently and compare the resulting prediction.')),
    task('cold-start-baseline','Audit a user with no training ratings','Transfer',ratingsInputs,
      'Remove ALL training observations from user 3 by zeroing row 3 of a mask copy. Compute trainingMean from the remaining observed cells, fill the table, and fit rank one. Save coldPrediction at (3,1), baselinePrediction=trainingMean, and errorDifference=(coldPrediction-coldTruth)^2-(baselinePrediction-coldTruth)^2. No personal information was supplied for this user.',
      `mask=observed;\nfor j=1:size(mask,2)\n  mask(3,j)=0;\nend\ntrainingMean=sum(sum(R.*mask))/sum(sum(mask));\nfilled=R.*mask+(1-mask)*trainingMean;\n${rankOne('filled','estimate')}\ncoldPrediction=estimate(3,1);\nbaselinePrediction=trainingMean;\nerrorDifference=(coldPrediction-coldTruth)^2-(baselinePrediction-coldTruth)^2;`, ['trainingMean','coldPrediction','baselinePrediction','errorDifference'],
      three('Discard the user’s training ratings before fitting the mean.','The rank-one model sees only an invented mean-filled row for this user.','Compare with the mean baseline honestly; a sophisticated reconstruction need not predict better.')),
  ],
  'laml-pca-ridge-capstone': [
    task('training-only-centers','Fit feature and target centers','Warm-up',pcaInputs,
      'Compute mu as a vector of training feature means, centeredTraining by subtracting its corresponding mean from each column, and targetMean=mean(ytrain). Do not inspect Xtest or ytest when fitting means.',
      `${meanColumns('Xtrain','centeredTraining','mu')}\ntargetMean=mean(ytrain);`, ['mu','centeredTraining','targetMean'],
      three('A matrix-wide mean would mix distinct features.','Loop through feature columns and center each one separately.','The target mean is a different statistic from feature means.')),
    task('pca-invariant-projector','Describe the principal component without a sign convention','Warm-up',pcaInputs,
      'Center training features and compute SVD. Return projector=V(:,1:1)*transpose(V(:,1:1)), scoreEnergy=sum((centeredTraining*V(:,1)).^2), and retainedFraction=S(1,1)^2/sum(sum(S.^2)).',
      `${meanColumns('Xtrain','centeredTraining','mu')}\n[U,S,V]=svd(centeredTraining);\nprojector=V(:,1:1)*transpose(V(:,1:1));\nscores=centeredTraining*V(:,1);\nscoreEnergy=sum(scores.^2);\nretainedFraction=S(1,1)^2/sum(sum(S.^2));`, ['projector','scoreEnergy','retainedFraction'],
      three('Only the centered training matrix determines the component.','Use a projector or squared scores so reversing a singular-vector sign changes nothing.','Divide squared retained strength by total squared strength.')),
    task('complete-prediction-pipeline','Fit and apply a one-component ridge model','Apply',pcaInputs,
      'Fit training means, the leading PCA direction, target mean, and scalar ridge coefficient with penalty lambda. Return test predictions, testMse, and normalResidual=abs((dot(scores,scores)+lambda)*coefficient-dot(scores,ytrain-mean(ytrain))). Transform test features with training means.',
      `${centeredPipeline}\ntestMse=mean((predictions-ytest).^2);\nnormalResidual=abs(denominator*coefficient-dot(scores,yc));`, ['predictions','testMse','normalResidual'],
      three('Center Xtrain columnwise and fit PCA there.','Fit the ridge coefficient to centered ytrain and training scores.','Reuse the fitted means, direction, coefficient, and target mean on test examples.')),
    task('test-centering-bug','Diagnose recentering each test batch','Apply',pcaInputs,
      'Fit the correct training-only pipeline. Save correctPredictions. Then reproduce a bug that centers each test column by its OWN mean while retaining the trained direction/coefficient/intercept. Save buggyPredictions and drift=norm(buggyPredictions-correctPredictions).',
      `${centeredPipeline}\ncorrectPredictions=predictions;\n${meanColumns('Xtest','buggyCentered','testMeans')}\nbuggyPredictions=ymean+(buggyCentered*direction)*coefficient;\ndrift=norm(buggyPredictions-correctPredictions);`, ['correctPredictions','buggyPredictions','drift'],
      three('Fit the reference transform using training data only.','For the diagnostic bug, recenter Xtest without refitting the PCA direction.','Compare predictions rather than only feature means to see the model consequence.')),
    task('component-count-validation','Choose component count on validation data','Transfer',pcaInputs,
      'For this task Xtest/ytest are a VALIDATION split. Center features/targets using training means. Compare rank-one PCA-projected ridge against full two-feature ridge, both with lambda and an unpenalized target mean. Return oneMse, fullMse, chosenComponents (1 on ties, otherwise the lower-error count), and selectedPredictions. No final test conclusion follows from this selection.',
      `${centeredPipeline}\nonePredictions=predictions;\noneMse=mean((onePredictions-ytest).^2);\nfullCoefficients=mldivide(transpose(Xc)*Xc+lambda*eye(size(Xc,2)),transpose(Xc)*yc);\nfullPredictions=ymean+Xt*fullCoefficients;\nfullMse=mean((fullPredictions-ytest).^2);\nchosenComponents=1;\nselectedPredictions=onePredictions;\nif fullMse<oneMse\n  chosenComponents=size(Xc,2);\n  selectedPredictions=fullPredictions;\nend`, ['oneMse','fullMse','chosenComponents','selectedPredictions'],
      three('The full two-component PCA model is equivalent to ridge in centered feature coordinates.','Use the same training-only centering and lambda for both candidates.','Selection uses validation error; keep an additional test split for a final assessment.')),
    task('pca-sign-audit','Audit an arbitrary component sign','Transfer',pcaInputs,
      'Fit the one-component pipeline, then replace direction by -direction and REFIT its scalar ridge coefficient using the reversed training scores. Save originalPredictions, reversedPredictions, and mismatch=norm(originalPredictions-reversedPredictions).',
      `${centeredPipeline}\noriginalPredictions=predictions;\nreversedDirection=-direction;\nreversedScores=Xc*reversedDirection;\nreversedCoefficient=dot(reversedScores,yc)/(dot(reversedScores,reversedScores)+lambda);\nreversedPredictions=ymean+(Xt*reversedDirection)*reversedCoefficient;\nmismatch=norm(originalPredictions-reversedPredictions);`, ['originalPredictions','reversedPredictions','mismatch'],
      three('A direction sign flip reverses training scores.','Refitting the scalar coefficient reverses its sign as well.','The product of reversed scores and reversed coefficient should preserve predictions.')),
  ],
  'laml-policy-iteration-capstone': [
    task('assemble-policy-model','Turn actions into a fixed-policy model','Warm-up',controlInputs,
      'policy0 contains action 1 or 2 per state. Assemble transition and rewards by selecting that action’s complete row and immediate reward in each state. Do not average the two action models.',
      `${policyRows('policy0','transition','rewards')}`, ['transition','rewards'],
      three('Rows correspond to current states.','Use policy0(s) to choose all entries in state s’s transition row.','Choose the matching immediate reward using the same action.')),
    task('evaluate-given-policy','Evaluate a supplied action vector','Warm-up',controlInputs,
      'Assemble the policy0 transition/reward model, solve its discounted value equation, and return policyValue plus policyResidual=max(abs(rpi+gamma*Ppi*policyValue-policyValue)).',
      `${policyRows('policy0','Ppi','rpi')}\npolicyValue=mldivide(eye(size(P1,1))-gamma*Ppi,rpi);\npolicyResidual=max(abs(rpi+gamma*(Ppi*policyValue)-policyValue));`, ['policyValue','policyResidual'],
      three('Evaluate the actions actually supplied, even if another action would be better.','Solve the fixed-policy coupled system.','A small policy residual alone does not establish optimality.')),
    task('one-policy-improvement','Evaluate once, then improve actions','Apply',controlInputs,
      'Evaluate policy0 exactly. Compute both action values and return improvedPolicy with action 1 on ties, gain=max(q1,q2)-oldValue, and oldValue. Do not reevaluate improvedPolicy for this task.',
      `${policyRows('policy0','Ppi','rpi')}\noldValue=mldivide(eye(size(P1,1))-gamma*Ppi,rpi);\nq1=r1+gamma*(P1*oldValue);\nq2=r2+gamma*(P2*oldValue);\n${greedy('q1','q2','improvedPolicy')}\ngain=max(q1,q2)-oldValue;`, ['oldValue','improvedPolicy','gain'],
      three('Freeze policy0 while evaluating it.','Compare alternatives using that same oldValue.','The gain is a one-step improvement at oldValue, not the full value difference between policies.')),
    task('complete-policy-iteration','Alternate exact solves and greedy improvement','Apply',controlInputs,
      'Start with action 1 everywhere. Alternate policy evaluation and greedy improvement for at most maxRounds, stopping when actions are unchanged. Return policy, value, and optimalityResidual=max(abs(max(q1,q2)-value)) for the stable evaluated policy.',
      `${policyIteration}\noptimalityResidual=max(abs(max(q1,q2)-value));`, ['policy','value','optimalityResidual'],
      three('Assemble the selected rows before each exact solve.','Allocate a new greedy policy so the old policy remains available for comparison.','Stop only after evaluation and improvement agree.')),
    task('evaluation-versus-optimality','Distinguish two kinds of residual','Transfer',controlInputs,
      'Evaluate policy0 exactly and save evaluatedValue. Return evaluationResidual for that policy equation, optimalityResidual against both available actions, and greedyAlternative. A perfect evaluation can describe a suboptimal policy.',
      `${policyRows('policy0','Ppi','rpi')}\nevaluatedValue=mldivide(eye(size(P1,1))-gamma*Ppi,rpi);\nevaluationResidual=max(abs(rpi+gamma*(Ppi*evaluatedValue)-evaluatedValue));\nq1=r1+gamma*(P1*evaluatedValue);\nq2=r2+gamma*(P2*evaluatedValue);\noptimalityResidual=max(abs(max(q1,q2)-evaluatedValue));\n${greedy('q1','q2','greedyAlternative')}`, ['evaluatedValue','evaluationResidual','optimalityResidual','greedyAlternative'],
      three('Use selected actions for the evaluation residual.','Use all actions for the optimality residual.','Recover the alternative greedy policy from the same evaluated values.')),
    task('two-solvers-agree','Audit control with independent solvers','Transfer',controlInputs,
      'Solve by policy iteration from action 1 and independently by iterations value-iteration updates from zero. Save policyIterationValue, valueIterationValue, and discrepancy=max(abs(their difference)). Also save the final policy-iteration policy.',
      `${policyIteration}\npolicyIterationValue=value;\n${valueIteration('r1','r2','valueIterationValue')}\ndiscrepancy=max(abs(policyIterationValue-valueIterationValue));`, ['policyIterationValue','valueIterationValue','discrepancy','policy'],
      three('Keep the exact-policy result before starting the second algorithm.','The second algorithm begins again from zero.','Compare values directly rather than iteration counts, since a policy-iteration round solves a system.')),
  ],
  'laml-independent-audit': [
    task('reward-fit-residual','Audit the regularized reward fit','Warm-up',auditInputs,
      'Fit coefficients from A=transpose(X)*X+lambda*penalty and b=transpose(X)*y. Save coefficients, linearResidual=norm(A*coefficients-b), and trainingMse. The intercept is unpenalized by the supplied penalty.',
      `${fitReward}\nlinearResidual=norm(A*coefficients-b);\ntrainingMse=mean((X*coefficients-y).^2);`, ['coefficients','linearResidual','trainingMse'],
      three('The penalty matrix distinguishes intercept from slope.','Use a linear solve, not an explicit inverse.','The equation residual and prediction MSE measure different things.')),
    task('reward-prediction-evidence','Evaluate learned rewards on two domains','Warm-up',auditInputs,
      'Fit the training reward model. Return stateRewards=Xstate*coefficients, testPredictions=Xtest*coefficients, and testMse against untouched ytest. Do not refit using either test or state rows.',
      `${fitReward}\nstateRewards=r1;\ntestPredictions=Xtest*coefficients;\ntestMse=mean((testPredictions-ytest).^2);`, ['stateRewards','testPredictions','testMse'],
      three('Only X and y determine coefficients.','Apply the same coefficients to state features and test features.','Use ytest only after predictions are fixed.')),
    task('learn-then-plan','Build the induced decision policy','Apply',auditInputs,
      'Fit coefficients, use r1=Xstate*coefficients as staying rewards, and solve the discounted control model by iterations value-iteration updates. Return value, policy with action 1 on ties, and bellmanResidual at the final value.',
      `${fitReward}\n${valueIteration()}\n${greedy('q1','q2','policy')}\nbellmanResidual=max(abs(max(q1,q2)-value));`, ['value','policy','bellmanResidual'],
      three('Training observations generate only r1; r2 is supplied independently.','Solve the resulting model without changing the fitted coefficients.','Recompute both action values before extracting policy and residual.')),
    task('training-observation-sensitivity','Refit after one noisy observation changes','Apply',auditInputs,
      'Fit and solve the original model. Increase y(changedRow) by perturbation, refit, and solve again. Return originalPolicy, changedPolicy, coefficientChange=newCoefficients-oldCoefficients, and valueChange=newValue-oldValue. All other inputs stay fixed.',
      `${fitReward}\noldCoefficients=coefficients;\n${valueIteration('r1','r2','oldValue')}\n${greedy('q1','q2','originalPolicy')}\nyChanged=y;\nyChanged(changedRow)=y(changedRow)+perturbation;\nnewCoefficients=mldivide(A,transpose(X)*yChanged);\nr1Changed=Xstate*newCoefficients;\n${valueIteration('r1Changed','r2','newValue')}\n${greedy('q1','q2','changedPolicy')}\ncoefficientChange=newCoefficients-oldCoefficients;\nvalueChange=newValue-oldValue;`, ['originalPolicy','changedPolicy','coefficientChange','valueChange'],
      three('The changed target requires refitting the reward model.','The feature/penalty system matrix A remains the same.','Re-solve control with the changed learned rewards and compare both numeric values and actions.')),
    task('reward-uncertainty-envelope','Explore a reward uncertainty envelope','Transfer',auditInputs,
      'Fit r1, then solve two models using lowerR1=r1-rewardRadius and upperR1=r1+rewardRadius, leaving r2 unchanged. Return lowerValue, upperValue, lowerPolicy, upperPolicy, and agreementFraction, the fraction of states with identical greedy actions in the two models. Agreement at endpoints is diagnostic evidence, not a proof for every possible perturbation.',
      `${fitReward}\nlowerR1=r1-rewardRadius;\nupperR1=r1+rewardRadius;\n${valueIteration('lowerR1','r2','lowerValue')}\n${greedy('q1','q2','lowerPolicy')}\n${valueIteration('upperR1','r2','upperValue')}\n${greedy('q1','q2','upperPolicy')}\nagreement=0;\nfor s=1:length(lowerPolicy)\n  if lowerPolicy(s)==upperPolicy(s)\n    agreement=agreement+1;\n  end\nend\nagreementFraction=agreement/length(lowerPolicy);`, ['lowerValue','upperValue','lowerPolicy','upperPolicy','agreementFraction'],
      three('Change reward estimates before solving each control problem.','Keep switching rewards and transitions fixed in this envelope.','Compare endpoint policies explicitly, while recognizing that this is not a universal robustness proof.')),
    task('combined-numerical-audit','Separate numerical resolution from model uncertainty','Transfer',auditInputs,
      'Fit and solve the learned control model. Return linearResidual, testMse, valueErrorBound=BellmanResidual/(1-gamma), and actionGap=min(abs(q1-q2)) using recomputed final action values. Set numericallyResolved=1 if actionGap>2*gamma*valueErrorBound, otherwise 0. Set modelResolved=1 if actionGap>2*gamma*valueErrorBound+2*rewardRadius/(1-gamma), otherwise 0. This conservative sufficient test combines numerical value error with an assumed bound rewardRadius on every immediate reward error; it excludes unmodeled transition errors and floating-point roundoff.',
      `${fitReward}\nlinearResidual=norm(A*coefficients-b);\ntestMse=mean((Xtest*coefficients-ytest).^2);\n${valueIteration()}\nvalueErrorBound=max(abs(max(q1,q2)-value))/(1-gamma);\nactionGap=min(abs(q1-q2));\nnumericallyResolved=0;\nif actionGap>2*gamma*valueErrorBound\n  numericallyResolved=1;\nend\nmodelResolved=0;\nif actionGap>2*gamma*valueErrorBound+2*rewardRadius/(1-gamma)\n  modelResolved=1;\nend`, ['linearResidual','testMse','valueErrorBound','actionGap','numericallyResolved','modelResolved'],
      three('Compute regression, prediction, and Bellman evidence independently.','The numerical action comparison uses the final value-error certificate.','The reward uncertainty condition has a different scale; a numerically settled action may still fail that model-uncertainty test.')),
  ],
}
