import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'd-05', slug: 'gradient-descent', track: 'D', order: 6,
  title: 'Gradient Descent and Optimization', subtitle: 'Calculate one update, then teach a line to fit data',
  tags: ['gradient-descent', 'optimization', 'learning-rate', 'loss-function', 'convergence'],
  prereqs: ['d-03', 'b-03', 'a-11'], unlocks: ['d-06'],
  hook: {
    question: 'If a prediction is wrong, which number should we change, and by how much?',
    realWorldContext: 'A file-processing model predicts a fixed setup time plus a cost per megabyte. We know the prediction rule, but not its best weight and bias. You will calculate one adjustment by hand, reproduce it in Python, debug a classic mistake, and diagnose when repeated adjustments help or fail.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Compute one gradient-descent update by hand. Implement a batch update that uses both gradients from the same old parameters. Choose and judge a learning rate. Diagnose a training run from its loss history.',
        '**Start with one measurement.** A 2 MB file took 5 seconds. Our rule is `prediction = weight * size + bias`. With weight 2 seconds per MB and bias 0 seconds, the prediction is 4 seconds. The weight is a multiplier, the bias is a fixed contribution, and the measured 5 seconds is the target. These numbers have different jobs.',
        '**Measure the mistake.** Define error as prediction minus target: `4 - 5 = -1` second. Negative means we predicted too little. Squaring gives a loss of `(-1)**2 = 1` second squared. A **loss** measures how poorly the parameters fit the observations. For several rows, **mean squared error (MSE)** adds their squared errors and divides by the number of rows. A loss is neither a weight nor a prediction.',
        '**Try a small change before calculus.** Keep bias zero. Weight 2.1 predicts 4.2 seconds and gives loss 0.64; weight 1.9 predicts 3.8 and gives loss 1.44. Increasing the weight helps here. Weight 4 predicts 8 seconds, giving loss 9: a useful direction does not make every step size useful.',
      ),
      check(
        'With weight 2.5 (bias 0), what is the loss for the 2 MB, 5 s file?',
        ['0', '1', '0.25'],
        0,
        '2.5 × 2 = 5 seconds, exactly the target: error 0, loss 0.',
      ),
      prose(
        '**Measure how loss changes.** For a function `f(t)`, `(f(t+h)-f(t))/h` is the average output change per input unit over a step h. The **derivative** is the limiting slope as h shrinks toward zero, when that limit exists. A positive slope means a small increase raises the function; a negative slope means it lowers it. Here we need the slope of *loss* with respect to a *parameter*, not the slope of the prediction line. Optional practice: [rate of change](#/chapter/calculus-2/rate-of-change) and [derivatives](#/chapter/calculus-3/derivatives-introduction).',
        '**Derive a slope on a tiny problem.** Take `loss(t) = (t-3)**2`, whose minimum is at 3. Expand the change: `(t+h-3)**2 - (t-3)**2 = 2*(t-3)*h + h**2`. Divide by h to get `2*(t-3) + h`. As h approaches zero, the slope approaches `2*(t-3)`. At t = 0 it is −6.',
      ),
      notebook('One parameter', [
        demo(1, '1 · Measure the slope', 'At t=0 the derivative is -6. Smaller h gives a closer local estimate.', 'Predict the sign. Run, then set t=4 and explain the change.', 'def loss(t):\n    return (t - 3)**2\n\nt = 0.0\nfor h in [1.0, 0.1, 0.01, 0.001]:\n    print(h, round((loss(t+h) - loss(t)) / h, 6))\nprint("Exact slope:", 2 * (t-3))', { expectOutput: ['0.001 -5.999', 'Exact slope: -6.0'] }),
      ]),
      prose(
        '**Make one update.** A positive **learning rate** controls how much slope we subtract: `new_t = t - learning_rate * slope`. At t = 0, slope −6 and rate 0.1 give `0 - 0.1*(-6) = 0.6`. Loss falls from 9 to 5.76. Subtracting a negative slope increases t; subtracting a positive slope decreases it. This is **gradient descent** in one dimension: use the local slope to choose a downhill step.',
      ),
      notebook('One update, then several', [
        demo(2, '2 · One visible update', 'From t=0, slope -6 and rate 0.1 produce t=0.6 and loss 5.76.', 'Predict the old and new loss. Then change subtraction to addition: does loss improve?', 't, learning_rate = 0.0, 0.1\nslope = 2 * (t-3)\nnew_t = t - learning_rate * slope\nprint("old t, slope, new t:", t, slope, new_t)\nprint("old loss, new loss:", (t-3)**2, round((new_t-3)**2, 4))', { expectOutput: ['old t, slope, new t: 0.0 -6.0 0.6', 'old loss, new loss: 9.0 5.76'] }),
        demo(3, '3 · See the steps on the loss curve', 'Blue is loss versus parameter t. Amber dots mark successive parameters. The table gives a non-visual way to follow the path.', 'Run at rate 0.1, then 0.75. At 0.75, does changing sides mean loss increases?', 'from opencalc import Figure\n\nt, learning_rate = 0.0, 0.1\npositions, losses = [t], [(t-3)**2]\nfor _ in range(6):\n    t = t - learning_rate * 2 * (t-3)\n    positions.append(t)\n    losses.append((t-3)**2)\nfor step, (position, value) in enumerate(zip(positions, losses)):\n    print(step, round(position, 6), round(value, 6))\nfig = Figure(xmin=-1, xmax=6, ymin=0, ymax=17,\n             title="Horizontal: parameter t; vertical: loss")\nfig.grid().axes()\nfig.plot(lambda t: (t-3)**2, color="blue")\nfig.scatter(positions, losses, color="amber", radius=4)\nfig.show()', { expectOutput: ['1 0.6 5.76'] }),
      ]),
      prose(
        '**Rates depend on the problem.** For `(t-3)**2`, each update multiplies the distance from 3 by `1-2*learning_rate`. Rates strictly between 0 and 1 converge on this curve. At 0.75, t alternates sides while loss decreases. At 1, loss stays constant; above 1, it grows. These boundaries do not transfer unchanged to other losses or feature scales.',
      ),
      notebook('Learning rates', [
        demo(4, '4 · Compare learning rates', 'These boundaries apply to this quadratic, not every model. Large values are printed without clipping.', 'Predict rates 0.75, 1.0 and 1.1. Explain the difference between alternating positions and increasing loss.', 'for rate in [0.01, 0.1, 0.75, 1.0, 1.1]:\n    t = 0.0\n    losses = [(t-3)**2]\n    for _ in range(6):\n        t = t - rate * 2 * (t-3)\n        losses.append((t-3)**2)\n    print(rate, [round(value, 4) for value in losses])', { expectOutput: ['1.0 [9.0, 9.0, 9.0, 9.0, 9.0, 9.0, 9.0]', '1.1 [9.0, 12.96'] }),
      ]),
      prose({ anchor: 'gradient' },
        '**Return to the file prediction.** Let x be size, y the target duration, w the weight, and b the bias. Error is `e = w*x + b - y`, and one-row loss is `e**2`. Changing w changes the error at rate x; changing b changes it at rate 1. The slope of a square is twice its input. The **chain rule** multiplies rates through parameter → error → squared error: `d(loss)/dw = 2*e*x`, and `d(loss)/db = 2*e`.',
        '**Two slopes form a gradient.** A **partial derivative** changes one parameter while holding the other fixed. The **gradient** collects one partial derivative per parameter. With x = 2, y = 5, w = 2, b = 0, the error is −1, the weight slope is −4, and the bias slope is −2. At rate 0.1, the new weight is 2.4 and the new bias 0.2. The new prediction is exactly 5 — because of these chosen numbers, not as a general guarantee. One row cannot identify a unique weight and bias either.',
        '| Math | Code | Meaning |\n|---|---|---|\n| x | `sizes` | input, MB |\n| y | `durations` | measured seconds |\n| w, b | `weight`, `bias` | seconds per MB; fixed seconds |\n| ŷ | `weight*sizes + bias` | predictions |\n| e | `predictions - durations` | signed errors |\n| L | `mean(errors**2)` | MSE, seconds squared |\n| ∂L/∂w | `2*mean(errors*sizes)` | weight slope |\n| ∂L/∂b | `2*mean(errors)` | bias slope |\n| α | `learning_rate` | positive step multiplier; useful size depends on scaling |',
      ),
      notebook('Two parameters', [
        demo(5, '5 · One file, two gradients', 'Calculate both slopes before changing either parameter.', 'Predict new_weight=2.4 and new_bias=0.2. Run, then change the measured duration to 6.', 'size, duration = 2.0, 5.0\nweight, bias = 2.0, 0.0\nerror = weight*size + bias - duration\ngrad_weight, grad_bias = 2*error*size, 2*error\nnew_weight = weight - 0.1*grad_weight\nnew_bias = bias - 0.1*grad_bias\nnew_prediction = new_weight*size + new_bias\nprint("error, weight slope, bias slope:", error, grad_weight, grad_bias)\nprint("new weight, bias:", new_weight, new_bias)\nprint("prediction, loss:", new_prediction, (new_prediction-duration)**2)', { expectOutput: ['error, weight slope, bias slope: -1.0 -4.0 -2.0', 'new weight, bias: 2.4 0.2', 'prediction, loss: 5.0 0.0'] }),
      ]),
      prose(
        '**Let several rows contribute.** Use sizes `[0,1,2]` and durations `[1,3,5]`. Starting at w = 0, b = 0 gives errors `[-1,-3,-5]` and MSE `35/3`. For MSE, average the row slopes: `grad_w = 2*mean(error*x) = -26/3` and `grad_b = 2*mean(error) = -6`. Compute BOTH at the old parameters, then update both. Rate 0.1 gives w = 13/15, b = 3/5 and a new MSE of `433/135`, about 3.207. The noiseless data follow `y = 2*x + 1`, giving an independent reference.',
      ),
      callout('warning', 'Mean loss and summed loss use different scales', 'This page uses MSE throughout. A SUM of squared errors has a gradient n times larger for n rows. Its minimisers are the same, but the same learning rate produces different steps. Check the loss convention when comparing implementations.'),
      notebook('Batch updates', [
        demo(6, '6 · Loop first, then NumPy', 'Sum each row contribution and divide by the row count. Vectorization must give the same slopes.', 'Predict -26/3 and -6. Then start weight at 1 and calculate one row by hand.', 'import numpy as np\nsizes = np.array([0., 1., 2.])\ndurations = np.array([1., 3., 5.])\nweight, bias = 0., 0.\nweight_total, bias_total = 0., 0.\nfor size, duration in zip(sizes, durations):\n    error = weight*size + bias - duration\n    weight_total += 2*error*size\n    bias_total += 2*error\nloop_gradients = (weight_total/len(sizes), bias_total/len(sizes))\nerrors = weight*sizes + bias - durations\narray_gradients = (2*np.mean(errors*sizes), 2*np.mean(errors))\nprint("loop:", [round(g, 4) for g in loop_gradients], "NumPy:", [round(float(g), 4) for g in array_gradients])\nassert np.allclose(loop_gradients, array_gradients)', { expectOutput: ['loop: [-8.6667, -6.0] NumPy: [-8.6667, -6.0]'] }),
        demo(7, '7 · Debug: the sequential-update bug', 'This step updates the weight first and then recomputes the errors before computing the bias gradient — so the bias gradient uses the NEW weight. It runs without error but gives a different step from the correct simultaneous update.', 'Run and compare the two results. Which line causes the difference? Fix buggy_step so it matches correct_step.', 'import numpy as np\nsizes = np.array([0., 1., 2.])\ndurations = np.array([1., 3., 5.])\n\ndef correct_step(w, b, rate):\n    errors = w*sizes + b - durations\n    gw, gb = 2*np.mean(errors*sizes), 2*np.mean(errors)\n    return w - rate*gw, b - rate*gb\n\ndef buggy_step(w, b, rate):\n    errors = w*sizes + b - durations\n    w = w - rate * 2*np.mean(errors*sizes)\n    errors = w*sizes + b - durations       # recomputed with the NEW weight\n    b = b - rate * 2*np.mean(errors)\n    return w, b\n\nprint("correct:", [round(v, 4) for v in correct_step(0., 0., 0.1)])\nprint("buggy:  ", [round(v, 4) for v in buggy_step(0., 0., 0.1)])', { expectOutput: ['correct: [0.8667, 0.6]', 'buggy:   [0.8667, 0.4267]'] }),
      ]),
      prose(
        '**Repeat and check.** An **iteration** predicts, computes errors and gradients, then updates the parameters. **Batch** gradient descent uses every training row for each update. Recompute the loss after updating when you report the new parameters. Stop at a stated tolerance or maximum iteration count, and check for non-finite values. A small change alone does not prove that you found the best fit.',
        '**Read the evidence carefully.** Full-batch descent on a smooth loss decreases the loss with suitable step sizes; noisy mini-batch updates can fluctuate. Slow progress can reflect poor feature scaling as well as a small rate. Lower training loss does not prove better predictions on new data (Lesson D.07).',
        '**Why learn this when a solver exists?** A direct least-squares solver is the right tool for this tiny problem. Gradient-based updates also work for models with no direct solution, such as neural networks, which commonly use variants like SGD with momentum or Adam. For least squares, convergence needs a suitable step size; uniqueness depends on the data.',
      ),
      notebook('Training and checking', [
        demo(8, '8 · Train and compare with an independent solver', 'The small noiseless dataset follows `y = 2*x + 1`. Real data rarely reach zero loss.', 'Compare 1, 20 and 300 updates. Recompute the final loss using the final parameters.', 'import numpy as np\nsizes = np.array([0., 1., 2.])\ndurations = np.array([1., 3., 5.])\nweight, bias = 0., 0.\nfor _ in range(300):\n    errors = weight*sizes + bias - durations\n    grad_weight = 2*np.mean(errors*sizes)\n    grad_bias = 2*np.mean(errors)\n    weight = weight - 0.1*grad_weight\n    bias = bias - 0.1*grad_bias\nfinal_loss = np.mean((weight*sizes + bias - durations)**2)\ndesign = np.column_stack([sizes, np.ones(len(sizes))])\nreference, _, _, _ = np.linalg.lstsq(design, durations, rcond=None)\nprint("GD weight, bias:", round(weight, 6), round(bias, 6), " MSE below 1e-12:", final_loss < 1e-12)\nprint("Least-squares reference:", np.round(reference, 6))', { expectOutput: ['GD weight, bias: 2.0 1.0  MSE below 1e-12: True', 'Least-squares reference: [2. 1.]'] }),
      ]),
      prose('**Practice.** Challenge 1 implements one update. Challenge 2 implements a batch step and is checked on new data. Challenge 3 is a fresh retry: train on new data and diagnose three runs from their loss histories.'),
      notebook('Practice', [
        exercise(11, 1, '8 · Fill one gap', 'easy', {
          prompt: 'Return the parameter after one gradient-descent step.',
          prose: 'Implement the update, rather than hard-coding this example.',
          instructions: 'Replace None with the expression for one update.',
          code: 'def update(parameter, slope, learning_rate):\n    return None  # replace this expression\n\nprint(update(0., -6., 0.1))',
          testCode: `assert update(0., -6., 0.1) is not None, "Replace None with the update expression"
assert abs(update(0., -6., 0.1) + 0.6) > 1e-12, "You added the step: moving uphill. Subtract learning_rate * slope"
assert abs(update(0., -6., 0.1) - 0.6) < 1e-12
assert abs(update(4., 2., 0.1) - 3.8) < 1e-12
assert update(2., 0., 0.2) == 2.
"SUCCESS: both directions and a zero slope work."`,
          hint: 'Subtract learning_rate times slope from parameter. A negative slope makes this subtraction increase the parameter.',
          solution: 'def update(parameter, slope, learning_rate):\n    return parameter - learning_rate * slope',
          misconceptions: [{ code: 'def update(parameter, slope, learning_rate):\n    return parameter + learning_rate * slope', feedback: 'Subtract learning_rate * slope' }],
        }),
        exercise(12, 2, '9 · Implement a batch step on new data', 'medium', {
          prompt: 'Implement one MSE gradient-descent step; return (new_weight, new_bias).',
          prose: 'Compute both gradients at the supplied parameters. Return the updated weight and bias.',
          instructions: 'Write one correct step before writing a training loop. Explain which quantities are data and which are parameters.',
          code: 'import numpy as np\n\ndef batch_step(sizes, durations, weight, bias, learning_rate):\n    # Compute errors and both mean gradients, then update.\n    raise NotImplementedError("Implement one batch step")',
          testCode: `import numpy as np
actual = batch_step(np.array([0.,1.,2.]), np.array([1.,3.,5.]), 0., 0., 0.1)
assert not np.allclose(actual, [13/15, 0.4266667]), "The bias gradient used the already-updated weight (the Stage 7 bug). Compute both gradients before updating either parameter"
assert np.allclose(actual, [13/15, 3/5]), "Check mean gradients and simultaneous updates"
actual = batch_step(np.array([-1.,1.]), np.array([-1.,3.]), 1., 0.5, 0.1)
assert np.allclose(actual, [1.2, 0.6]), "Trace the rows at the supplied nonzero parameters"
actual = batch_step(np.array([0.,1.,2.]), np.array([1.,3.,5.]), 2., 1., 0.1)
assert np.allclose(actual, [2.,1.]), "An exact fit should not move"
"SUCCESS: original data, new data, and exact fit agree."`,
          hint: 'errors = weight*sizes + bias - durations. Weight slope = 2*mean(errors*sizes); bias slope = 2*mean(errors). Compute both before either update.',
          solution: 'import numpy as np\n\ndef batch_step(sizes, durations, weight, bias, learning_rate):\n    errors = weight*sizes + bias - durations\n    grad_w = 2*np.mean(errors*sizes)\n    grad_b = 2*np.mean(errors)\n    return weight - learning_rate*grad_w, bias - learning_rate*grad_b',
          misconceptions: [{ code: 'import numpy as np\ndef batch_step(sizes, durations, weight, bias, learning_rate):\n    errors = weight*sizes + bias - durations\n    weight = weight - learning_rate*2*np.mean(errors*sizes)\n    errors = weight*sizes + bias - durations\n    bias = bias - learning_rate*2*np.mean(errors)\n    return weight, bias', feedback: 'the Stage 7 bug' }],
        }),
        exercise(13, 3, '10 · Fresh retry: train and diagnose', 'hard', {
          prompt: 'Write train(sizes, durations, rate, steps) returning (weight, bias, losses), where losses holds the MSE after every step, stopping early if the loss stops being finite. Then write diagnose(losses, tol=1e-3) returning "diverging" (non-finite, or last loss larger than the first), "converged" (last loss below tol) or "not_converged".',
          prose: ['New data: sizes [1, 2, 3, 4], durations [3, 5, 7, 9] — they follow y = 2x + 1. The checker trains with three different rates and asks your diagnose function about each run.'],
          instructions: 'Reuse your batch step. `np.isfinite(loss)` detects inf and nan. Start from weight 0 and bias 0.',
          code: 'import numpy as np\n\ndef train(sizes, durations, rate, steps):\n    pass  # return weight, bias, losses\n\ndef diagnose(losses, tol=1e-3):\n    pass',
          testCode: `import numpy as np
s, d = np.array([1., 2., 3., 4.]), np.array([3., 5., 7., 9.])
w, b, losses = train(s, d, 0.05, 3000)
assert len(losses) == 3000, "losses should hold one MSE per step"
assert np.isclose(w, 2, atol=1e-3) and np.isclose(b, 1, atol=1e-3), f"With rate 0.05 and 3000 steps the fit should reach w ≈ 2, b ≈ 1; got {w:.4f}, {b:.4f}"
assert diagnose(losses) == "converged", "The rate-0.05 run ends with a tiny loss: 'converged'"
_, _, big = train(s, d, 0.5, 200)
assert diagnose(big) == "diverging", "Rate 0.5 is too large for these inputs: the loss grows (or overflows). diagnose should say 'diverging'"
_, _, small = train(s, d, 0.0005, 200)
assert diagnose(small) == "not_converged", "Rate 0.0005 lowers the loss but far too slowly to reach the tolerance in 200 steps: 'not_converged'"
assert diagnose([5.0, float("nan")]) == "diverging", "A non-finite loss means the run has diverged"
"SUCCESS: the same code converges, diverges or crawls depending only on the learning rate — and the loss history tells you which."`,
          hint: 'In the loop: errors = w*s + b - d; update both; loss = np.mean((w*s + b - d)**2); losses.append(loss); if not np.isfinite(loss): break.',
          solution: 'import numpy as np\n\ndef train(sizes, durations, rate, steps):\n    w, b, losses = 0.0, 0.0, []\n    for _ in range(steps):\n        errors = w*sizes + b - durations\n        gw, gb = 2*np.mean(errors*sizes), 2*np.mean(errors)\n        w, b = w - rate*gw, b - rate*gb\n        loss = float(np.mean((w*sizes + b - durations)**2))\n        losses.append(loss)\n        if not np.isfinite(loss):\n            break\n    return w, b, losses\n\ndef diagnose(losses, tol=1e-3):\n    if not all(np.isfinite(losses)) or losses[-1] > losses[0]:\n        return "diverging"\n    return "converged" if losses[-1] < tol else "not_converged"',
          misconceptions: [{ code: 'import numpy as np\ndef train(sizes, durations, rate, steps):\n    w, b, losses = 0.0, 0.0, []\n    for _ in range(steps):\n        errors = w*sizes + b - durations\n        gw, gb = 2*np.mean(errors*sizes), 2*np.mean(errors)\n        w, b = w - rate*gw, b - rate*gb\n        losses.append(float(np.mean((w*sizes + b - durations)**2)))\n    return w, b, losses\ndef diagnose(losses, tol=1e-3):\n    return "converged" if losses[-1] < tol else "not_converged"', feedback: "diagnose should say 'diverging'" }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Data stay fixed during an update; weight and bias change.',
    'Loss measures fit. A derivative measures how loss changes as a parameter moves.',
    'Compute all gradients at the old parameters, then subtract the scaled gradients.',
    'Useful learning rates depend on the loss and feature scale — read the loss history: falling, flat, or growing.',
    'Training improvement is not proof of generalization; check held-out data.',
  ],
  quiz: [
    { id: 'q1', type: 'choice', text: 'At t=0, slope=-6 and rate=0.1. What is the next t?', options: ['-0.6', '0.6', '3'], correct: 1 },
    { id: 'q2', type: 'choice', text: 'For a simultaneous weight and bias update, which gradients do we use?', options: ['Both computed at the same old parameters', 'Update weight, then recompute the bias gradient', 'Use the previous iteration’s bias gradient'], correct: 0 },
    { id: 'q3', type: 'choice', text: 'On (t-3)², rate 0.75 makes t alternate sides of 3. What happens to loss?', options: ['It increases because t changes sides', 'It stays constant', 'It decreases: distance is halved each step'], correct: 2 },
    { id: 'q4', type: 'choice', text: 'Why can summed-loss code take larger steps than mean-loss code at the same rate?', options: ['The summed-loss gradient is n times larger for n rows', 'Summing reverses the gradient sign', 'The two losses have different minimizing weights'], correct: 0 },
    { id: 'q5', type: 'choice', text: 'Training MSE fell. What does that establish?', options: ['New examples will be predicted better', 'The parameters fit the training rows better by this metric', 'The unique optimum has been reached'], correct: 1 },
  ],
}
