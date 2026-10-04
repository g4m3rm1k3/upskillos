// What a learner does at each step of "Neural Networks — A Tolerance Zone" (ml-neural), for the
// walkthrough test (mlProduction.desktop.test.js). The entry format is described in
// ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 12.1 ─────────────────────────────────────────────────────────────────
  '12-01-beyond-a-straight-line#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '12-01-beyond-a-straight-line#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '12-01-beyond-a-straight-line#The holes': {
    wrong: [{ name: 'used the diameter as the radius', edit: [['TOLERANCE = 0.1 ', 'TOLERANCE = 0.2 ']], fails: [0] }],
  },
  '12-01-beyond-a-straight-line#Building a shape out of lines': {
    wrong: [
      { name: 'no activation', edit: [['    return relu(X @ W + b)', '    return X @ W + b']], fails: [0] },
      { name: 'np.max instead of np.maximum', edit: [['return np.maximum(0, z)', 'return np.max(z)']], fails: [0] },
    ],
  },

  // ── 12.2 ─────────────────────────────────────────────────────────────────
  '12-02-backpropagation#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '12-02-backpropagation#The forward pass': {
    wrong: [{ name: 'forgot the sigmoid', edit: [['return sigmoid(z2[:, 0]), {"z1": z1, "hidden": hidden}', 'return z2[:, 0], {"z1": z1, "hidden": hidden}']], fails: [0] }],
  },
  '12-02-backpropagation#The backward pass': {
    wrong: [
      { name: 'left out the ReLU slope', edit: [['(error_out @ params["W2"].T) * (saved["z1"] > 0)', '(error_out @ params["W2"].T)']], fails: [0] },
      { name: 'forgot to divide by n', edit: [['error_out = (p - y)[:, None] / len(y)', 'error_out = (p - y)[:, None]']], fails: [0] },
    ],
  },
  '12-02-backpropagation#Training': {
    wrong: [{ name: 'stepped uphill', edit: [['params[name] = params[name] - rate * grads[name]', 'params[name] = params[name] + rate * grads[name]']], fails: [0] }],
  },

  // ── 12.3 ─────────────────────────────────────────────────────────────────
  '12-03-training-well#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '12-03-training-well#Faster: mini-batches': {
    wrong: [
      { name: 'the velocity never fades', edit: [['velocity[name] = momentum * velocity[name] - rate * grads[name]', 'velocity[name] = velocity[name] - rate * grads[name]']], fails: [0] },
      { name: 'always the first rows', edit: [['rng.choice(len(y), size=batch, replace=False) if batch', 'np.arange(batch) if batch']], fails: [0] },
    ],
  },
};
