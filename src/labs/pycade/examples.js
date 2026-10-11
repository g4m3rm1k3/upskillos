import qSource from './python/q_learning.py?raw'
import a2cSource from './python/a2c.py?raw'
import regressionSource from './python/regression.py?raw'
import classifierSource from './python/classifier.py?raw'
import banditSource from './python/bandit.py?raw'
import customSource from './python/custom.py?raw'
import qRecording from './q-trace.json'
import a2cRecording from './a2c-trace.json'
import regressionRecording from './regression-trace.json'
import classifierRecording from './classifier-trace.json'
import banditRecording from './bandit-trace.json'
import customRecording from './custom-trace.json'
export const EXAMPLES = {
  q: { title: 'Q-learning · one cell learns', source: qSource, recording: qRecording, cartpole: true, inspect: 'step_result = env.step', value: 'step_result', update: 'q[state, action] =', concept: 'q', experiment: 'If alpha becomes 1, will the chosen table cell equal the target? Compare before, target and after, then edit and run.' },
  a2c: { title: 'CartPole A2C · two worlds learn together', source: a2cSource, recording: a2cRecording, cartpole: true, inspect: 'results = [env.step', value: 'results', update: 'advantages =', concept: 'advantage', experiment: 'If gamma becomes 0, will each return equal its immediate reward? Compare running and targets, then edit and run.' },
  regression: { title: 'Gradient descent · fit a line', source: regressionSource, recording: regressionRecording, inspect: 'predictions =', value: 'predictions', update: 'w = w -', concept: 'regression', experiment: 'Set learning_rate to 0, then to 0.05. Does the loss fall? Compare predictions with y and follow the slope and intercept updates.' },
  classifier: { title: 'Neural classifier · scores to classes', source: classifierSource, recording: classifierRecording, inspect: 'probabilities =', value: 'probabilities', update: 'loss.backward()', concept: 'classification', experiment: 'Change one entry in labels. Follow its class probability, the cross-entropy loss, and the gradients in model before and after an update.' },
  bandit: { title: 'Bandits · exploration and running averages', source: banditSource, recording: banditRecording, inspect: 'reward =', value: 'reward', update: 'estimates[action] =', concept: 'bandit', experiment: 'Compare epsilon = 0 with epsilon = 1. Inspect counts and estimates: which machines did the learner actually try?' },
  custom: { title: 'Your Python · automatic inspection', source: customSource, recording: customRecording, inspect: 'return labels', value: 'return value', update: 'prediction, distances, index =', concept: 'automatic', experiment: 'Paste or load a small Python program. Follow its functions, inputs, outputs and shapes. PyCade reports structure; variable names alone do not establish their meaning.' },
}
