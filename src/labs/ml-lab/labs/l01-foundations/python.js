import { starter, solution, checks } from '../../python.js'

export default {
  filename: 'my-regression.py', packages: ['numpy'],
  title: 'You write the learning algorithm.',
  intro: 'Implement prediction, MSE, the gradient, and a training loop. Inputs are one-dimensional NumPy arrays. Start with the lesson examples, then run the independent checks.',
  steps: ['Prediction: apply the same line equation to every x.', 'Loss: return one scalar, the average squared error.', 'Gradient: return two scalars, `(dw, db)`.', 'Training: initialize at zero; apply simultaneous updates; return `(w, b)`.'],
  hints: [
    ['NumPy operations', 'Array multiplication and subtraction act elementwise. `np.mean` adds values and divides by the number of entries. Do not reshape these one-dimensional exercise inputs.'],
    ['Gradient and training', 'Compute error once. Weight sensitivity averages twice error times x. Bias sensitivity averages twice error. Save both derivatives before updating either parameter.'],
  ],
  starter, solution, checks,
  solutionNote: 'The two gradient variables are computed before either assignment, so the update is simultaneous. There is no fitting library inside the loop.',
  checkSummary: 'Prediction shape and values, MSE, gradients against finite differences, convergence on a known line, a single simultaneous update, and behavior with zero steps. Passing these checks is evidence about these behaviors, not proof of all possible inputs.',
}
