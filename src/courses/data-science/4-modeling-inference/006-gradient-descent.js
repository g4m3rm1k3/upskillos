const cell = (id, cellTitle, prose, instructions, code) => ({ id, cellTitle, prose, instructions, code, output: '', status: 'idle' })

export default {
  id: 'd-05', slug: 'gradient-descent', track: 'D', order: 5,
  title: 'Gradient Descent and Optimization', subtitle: 'Calculate one update, then teach a line to fit data',
  tags: ['gradient-descent', 'optimization', 'learning-rate', 'loss-function', 'convergence'],
  prereqs: ['d-03', 'b-03', 'a-11'], unlocks: ['d-06'],
  hook: {
    question: 'If a prediction is wrong, which number should we change, and by how much?',
    realWorldContext: 'A file-processing model predicts a fixed setup time plus a cost per megabyte. We know the prediction rule, but not its best weight and bias. You will calculate one adjustment by hand, reproduce it in Python, and explain when repeated adjustments help or fail.',
  },
  intuition: {
    prose: [
      '**Start with one measurement.** A 2 MB file took 5 seconds. Our rule is `prediction = weight * size + bias`. With weight 2 seconds per MB and bias 0 seconds, the prediction is 4 seconds. The weight is a multiplier, the bias is a fixed contribution, and the measured 5 seconds is the target. These numbers have different jobs.',
      '**Measure the mistake.** Define error as prediction minus target: `4 - 5 = -1` second. Negative means we predicted too little. Squaring gives a loss of `(-1)**2 = 1` second squared. A **loss** measures how poorly the parameters fit the observations. For several rows, **mean squared error (MSE)** adds their squared errors and divides by the number of rows. A loss is neither a weight nor a prediction.',
      '**Try a small change before calculus.** Keep bias zero. Weight 2.1 predicts 4.2 seconds and gives loss 0.64; weight 1.9 predicts 3.8 and gives loss 1.44. Increasing the weight helps here. Predict what weight 4 would do. It predicts 8 seconds, giving loss 9. A useful direction does not make every step size useful.',
      '**Measure how loss changes.** For a function `f(t)`, `(f(t+h)-f(t))/h` is the average output change per input unit over a step h. The **derivative** is the limiting slope as h shrinks toward zero, when that limit exists. A positive slope means a small increase raises the function; a negative slope means it lowers it. Here we need the slope of loss with respect to a parameter, not the slope of the prediction line. Optional practice: [rate of change](#/chapter/calculus-2/rate-of-change) and [derivatives](#/chapter/calculus-3/derivatives-introduction).',
      '**Derive a slope on a tiny problem.** Take `loss(t) = (t-3)**2`, whose minimum is at 3. Expand the change: `(t+h-3)**2 - (t-3)**2 = 2*(t-3)*h + h**2`. Divide by h to get `2*(t-3) + h`. As h approaches zero, the slope approaches `2*(t-3)`. At t=0 it is -6. The first notebook cell compares this formula with small measured changes.',
      '**Make one update.** A positive **learning rate** controls how much slope we subtract: `new_t = t - learning_rate * slope`. At t=0, slope -6 and rate 0.1 give `0 - 0.1*(-6) = 0.6`. Loss falls from 9 to 5.76. Subtracting a negative slope increases t; subtracting a positive slope decreases it. This is **gradient descent** in one dimension: use the local slope to choose a downhill step.',
      '**Return to the file prediction.** Let x be size, y the target duration, w the weight, and b the bias. Error is `e = w*x + b - y`, and one-row loss is `e**2`. Changing w changes the error at rate x; changing b changes it at rate 1. The slope of a square is twice its input. The **chain rule** multiplies rates through parameter → error → squared error: `d(loss)/dw = 2*e*x`, and `d(loss)/db = 2*e`. This explains both formulas before we put them in a loop.',
      '**Two slopes form a gradient.** A **partial derivative** changes one parameter while holding the other fixed. The **gradient** collects one partial derivative per parameter. With x=2, y=5, w=2, b=0, error is -1, the weight slope is -4, and the bias slope is -2. At rate 0.1, the new weight is 2.4 and new bias is 0.2. The new prediction is exactly 5. This exact fit in one step happens because of these chosen numbers; it is not a general guarantee. One row cannot identify a unique weight and bias either.',
      '**Let several rows contribute.** Use sizes `[0,1,2]` and durations `[1,3,5]`. Starting at w=0, b=0 gives errors `[-1,-3,-5]` and MSE `35/3`. For MSE, average the row slopes: `grad_w = 2*mean(error*x) = -26/3` and `grad_b = 2*mean(error) = -6`. Compute BOTH at the old parameters, then update both. Rate 0.1 gives w=13/15, b=3/5 and new MSE `433/135`, about 3.207. The noiseless data follows `y=2*x+1`, giving us an independent reference.',
      '**Repeat and check.** An **iteration** predicts, computes errors and gradients, then updates the parameters. **Batch** gradient descent uses every training row for each update. Recompute loss after updating when reporting the new parameters. Stop at a stated tolerance or maximum iteration count; check for non-finite values too. A small change alone does not prove that we found the best fit.',
      '**Rates depend on the problem.** For `(t-3)**2`, each update multiplies the distance from 3 by `1-2*learning_rate`. Rates strictly between 0 and 1 converge on this curve. At 0.75, t alternates sides while loss decreases. At 1, loss stays constant; above 1, it grows. These boundaries do not transfer unchanged to other losses or feature scales. The notebook reports actual values rather than hiding divergence by clipping a plot.',
      '**Read the evidence carefully.** A loss curve plots iteration against loss; a prediction plot shows input against prediction. Full-batch descent on a smooth loss decreases loss with suitable step sizes. Noisy mini-batch updates can fluctuate. Slow progress can reflect poor feature scaling as well as a small rate. Lower training loss does not prove better predictions on new data; the next lesson covers evaluation.',
      '**Why learn this when a solver exists?** A direct least-squares solver is a good choice for this tiny problem. Gradient-based updates also work for models without a simple direct solution. Neural networks commonly use optimizers such as SGD or Adam, not always this exact update. For least squares, convergence requires suitable conditions and step sizes; uniqueness also depends on the data. Convexity alone is not a promise that every training run succeeds.',
    ],
    callouts: [
      { type: 'procedure', title: 'A batch update you can trace', body: '1. Predict each training target.\n2. Compute error = prediction − target.\n3. Calculate both mean gradients from the current parameters.\n4. Subtract learning_rate × gradient from each parameter.\n5. Recompute loss at the updated parameters.\n6. Repeat within a stated iteration limit.\nKeep the data fixed; change the parameters.' },
      { type: 'insight', title: 'Math ↔ code ↔ meaning', body: 'x → sizes → input MB\ny → durations → measured seconds\nw → weight → seconds per MB\nb → bias → fixed seconds\nŷ → weight*sizes + bias → predictions\ne → predictions - durations → signed errors\nL → mean(errors**2) → MSE, in seconds squared\n∂L/∂w → 2*mean(errors*sizes) → weight slope\n∂L/∂b → 2*mean(errors) → bias slope\nα → learning_rate → positive update multiplier; useful size depends on scaling' },
      { type: 'warning', title: 'Mean loss and summed loss use different scales', body: 'This page uses MSE throughout. A SUM of squared errors has a gradient n times larger for n rows. Its minimizers are the same, but the same learning rate produces different steps. Check the loss convention when comparing implementations.' },
    ],
    visualizations: [{ id: 'PythonNotebook', title: 'Predict → trace → run → implement', props: { initialCells: [
      cell(1, '1 · Measure the slope', 'At t=0 the derivative is -6. Smaller h gives a closer local estimate.', 'Predict the sign. Run, then set t=4 and explain the change.', `def loss(t):
    return (t - 3)**2

t = 0.0
for h in [1.0, 0.1, 0.01, 0.001]:
    print(h, round((loss(t+h) - loss(t)) / h, 6))
print("Exact slope:", 2 * (t-3))`),
      cell(2, '2 · One visible update', 'From t=0, slope -6 and rate 0.1 produce t=0.6 and loss 5.76.', 'Predict the old and new loss. Then change subtraction to addition: does loss improve?', `t, learning_rate = 0.0, 0.1
slope = 2 * (t-3)
new_t = t - learning_rate * slope
print("old t, slope, new t:", t, slope, new_t)
print("old loss, new loss:", (t-3)**2, (new_t-3)**2)`),
      cell(3, '3 · See the steps on the loss curve', 'Blue is loss versus parameter t. Amber dots mark successive parameters. The table gives a non-visual way to follow the path.', 'Run at rate 0.1, then 0.75. At 0.75, does changing sides mean loss increases?', `from opencalc import Figure

t, learning_rate = 0.0, 0.1
positions, losses = [t], [(t-3)**2]
for _ in range(6):
    t = t - learning_rate * 2 * (t-3)
    positions.append(t)
    losses.append((t-3)**2)
for step, (position, value) in enumerate(zip(positions, losses)):
    print(step, round(position, 6), round(value, 6))
fig = Figure(xmin=-1, xmax=6, ymin=0, ymax=17,
             title="Horizontal: parameter t; vertical: loss")
fig.grid().axes()
fig.plot(lambda t: (t-3)**2, color="blue")
fig.scatter(positions, losses, color="amber", radius=4)
fig.show()`),
      cell(4, '4 · Compare learning rates', 'These boundaries apply to this quadratic, not every model. Large values are printed without clipping.', 'Predict rates 0.75, 1.0 and 1.1. Explain the difference between alternating positions and increasing loss.', `for rate in [0.01, 0.1, 0.75, 1.0, 1.1]:
    t = 0.0
    losses = [(t-3)**2]
    for _ in range(6):
        t = t - rate * 2 * (t-3)
        losses.append((t-3)**2)
    print(rate, [round(value, 4) for value in losses])`),
      cell(5, '5 · One file, two gradients', 'Calculate both slopes before changing either parameter.', 'Predict new_weight=2.4 and new_bias=0.2. Run, then change the measured duration to 6.', `size, duration = 2.0, 5.0
weight, bias = 2.0, 0.0
error = weight*size + bias - duration
grad_weight, grad_bias = 2*error*size, 2*error
new_weight = weight - 0.1*grad_weight
new_bias = bias - 0.1*grad_bias
new_prediction = new_weight*size + new_bias
print("error, weight slope, bias slope:", error, grad_weight, grad_bias)
print("new weight, bias:", new_weight, new_bias)
print("prediction, loss:", new_prediction, (new_prediction-duration)**2)`),
      cell(6, '6 · Loop first, then NumPy', 'Sum each row contribution and divide by the row count. Vectorization must give the same slopes.', 'Predict -26/3 and -6. Then start weight at 1 and calculate one row by hand.', `import numpy as np
sizes = np.array([0., 1., 2.])
durations = np.array([1., 3., 5.])
weight, bias = 0., 0.
weight_total, bias_total = 0., 0.
for size, duration in zip(sizes, durations):
    error = weight*size + bias - duration
    weight_total += 2*error*size
    bias_total += 2*error
loop_gradients = (weight_total/len(sizes), bias_total/len(sizes))
errors = weight*sizes + bias - durations
array_gradients = (2*np.mean(errors*sizes), 2*np.mean(errors))
print("loop:", loop_gradients, "NumPy:", array_gradients)
assert np.allclose(loop_gradients, array_gradients)`),
      cell(7, '7 · Train and compare with an independent solver', 'The small noiseless dataset follows y=2*x+1. Real data rarely reaches zero loss.', 'Compare 1, 20 and 300 updates. Recompute final loss using the final parameters.', `import numpy as np
sizes = np.array([0., 1., 2.])
durations = np.array([1., 3., 5.])
weight, bias = 0., 0.
for _ in range(300):
    errors = weight*sizes + bias - durations
    grad_weight = 2*np.mean(errors*sizes)
    grad_bias = 2*np.mean(errors)
    weight = weight - 0.1*grad_weight
    bias = bias - 0.1*grad_bias
final_loss = np.mean((weight*sizes + bias - durations)**2)
design = np.column_stack([sizes, np.ones(len(sizes))])
reference, _, _, _ = np.linalg.lstsq(design, durations, rcond=None)
print("GD weight, bias, MSE:", weight, bias, final_loss)
print("Least-squares reference:", reference)`),
      {
        ...cell(11, '8 · Fill one gap', 'Implement the update, rather than hard-coding this example.', 'Replace None with the expression for one update.', `def update(parameter, slope, learning_rate):
    return None  # replace this expression

print(update(0., -6., 0.1))`),
        challengeType: 'write', challengeNumber: 1, challengeTitle: 'One update', difficulty: 'easy',
        prompt: 'Return the parameter after one gradient-descent step.',
        testCode: `assert abs(update(0., -6., 0.1) - 0.6) < 1e-12
assert abs(update(4., 2., 0.1) - 3.8) < 1e-12
assert update(2., 0., 0.2) == 2.
"SUCCESS: both directions and a zero slope work."`,
        hint: 'Subtract learning_rate times slope from parameter. A negative slope makes this subtraction increase the parameter.',
      },
      {
        ...cell(12, '9 · Implement a batch step on new data', 'Compute both gradients at the supplied parameters. Return the updated weight and bias.', 'Write one correct step before writing a training loop. Explain which quantities are data and which are parameters.', `import numpy as np

def batch_step(sizes, durations, weight, bias, learning_rate):
    # Compute errors and both mean gradients, then update.
    raise NotImplementedError("Implement one batch step")`),
        challengeType: 'write', challengeNumber: 2, challengeTitle: 'A batch update', difficulty: 'medium',
        prompt: 'Implement one MSE gradient-descent step; return (new_weight, new_bias).',
        testCode: `actual = batch_step(np.array([0.,1.,2.]), np.array([1.,3.,5.]), 0., 0., 0.1)
assert np.allclose(actual, [13/15, 3/5]), "Check mean gradients and simultaneous updates"
actual = batch_step(np.array([-1.,1.]), np.array([-1.,3.]), 1., 0.5, 0.1)
assert np.allclose(actual, [1.2, 0.6]), "Trace the rows at the supplied nonzero parameters"
actual = batch_step(np.array([0.,1.,2.]), np.array([1.,3.,5.]), 2., 1., 0.1)
assert np.allclose(actual, [2.,1.]), "An exact fit should not move"
"SUCCESS: original data, new data, and exact fit agree."`,
        hint: 'errors = weight*sizes + bias - durations. Weight slope = 2*mean(errors*sizes); bias slope = 2*mean(errors). Compute both before either update.',
      },
    ] } }],
  },
  mentalModel: [
    'Data stays fixed during an update; weight and bias change.',
    'Loss measures fit. A derivative measures how loss changes as a parameter moves.',
    'Compute all gradients at the old parameters; subtract the scaled gradients.',
    'Useful learning rates depend on the loss and feature scale.',
    'Training improvement is not proof of generalization; check held-out data appropriately.',
  ],
  quiz: [
    { id: 'q1', type: 'choice', text: 'At t=0, slope=-6 and rate=0.1. What is the next t?', options: ['-0.6', '0.6', '3'], correct: 1 },
    { id: 'q2', type: 'choice', text: 'For a simultaneous weight and bias update, which gradients do we use?', options: ['Both computed at the same old parameters', 'Update weight, then recompute the bias gradient', 'Use the previous iteration’s bias gradient'], correct: 0 },
    { id: 'q3', type: 'choice', text: 'On (t-3)², rate 0.75 makes t alternate sides of 3. What happens to loss?', options: ['It increases because t changes sides', 'It stays constant', 'It decreases: distance is halved each step'], correct: 2 },
    { id: 'q4', type: 'choice', text: 'Why can summed-loss code take larger steps than mean-loss code at the same rate?', options: ['The summed-loss gradient is n times larger for n rows', 'Summing reverses the gradient sign', 'The two losses have different minimizing weights'], correct: 0 },
    { id: 'q5', type: 'choice', text: 'Training MSE fell. What does that establish?', options: ['New examples will be predicted better', 'The parameters fit the training rows better by this metric', 'The unique optimum has been reached'], correct: 1 },
  ],
}
