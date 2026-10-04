// What a learner does at each step of "PyTorch — Reading Handwritten Digits" (ml-pytorch), for
// the walkthrough test (mlProduction.desktop.test.js). The entry format is described in
// ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 13.1 ─────────────────────────────────────────────────────────────────
  '13-01-tensors-and-autograd#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '13-01-tensors-and-autograd#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  '13-01-tensors-and-autograd#Tensors': {
    wrong: [{ name: 'never called backward', edit: [['    y.backward()\n', '']], fails: [0] }],
  },
  '13-01-tensors-and-autograd#The network in PyTorch': {
    wrong: [{ name: 'tensors that do not record their history', edit: [['torch.tensor(value, requires_grad=True)', 'torch.tensor(value)']], fails: [0] }],
  },

  // ── 13.2 ─────────────────────────────────────────────────────────────────
  '13-02-modules-losses-optimisers#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '13-02-modules-losses-optimisers#Layers and a model': {
    wrong: [{ name: 'did not seed the starting weights', edit: [['    torch.manual_seed(seed)\n', '']], fails: [0] }],
  },
  '13-02-modules-losses-optimisers#Batches': {
    wrong: [{ name: 'batches of one', edit: [['batch_size=size', 'batch_size=1']], fails: [0] }],
  },
  '13-02-modules-losses-optimisers#The training loop, line by line': {
    wrong: [{ name: 'forgot zero_grad', edit: [['            optimiser.zero_grad()\n', '']], fails: [0] }],
  },

  // ── 13.3 ─────────────────────────────────────────────────────────────────
  '13-03-ten-classes#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '13-03-ten-classes#The digits': {
    wrong: [{ name: 'did not scale the grey levels', edit: [['return digits.images / 16.0, digits.target', 'return digits.images, digits.target']], fails: [0] }],
  },
  '13-03-ten-classes#Ten scores, ten probabilities': {
    wrong: [{ name: 'did not subtract the largest score', edit: [['torch.exp(scores - scores.max(dim=1, keepdim=True).values)', 'torch.exp(scores)']], fails: [0] }],
  },
  '13-03-ten-classes#A network for images': {
    wrong: [{ name: 'nine outputs for ten digits', edit: [['        torch.nn.Linear(64, 10),\n', '        torch.nn.Linear(64, 9),\n']], fails: [0] }],
  },

  // ── 13.4 ─────────────────────────────────────────────────────────────────
  '13-04-convolution#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '13-04-convolution#Convolution: one small filter, everywhere': {
    wrong: [{ name: 'no padding', edit: [['    padded = np.pad(image, pad)\n', '    padded = image\n']], fails: [0] }],
  },
  '13-04-convolution#A convolutional network': {
    wrong: [{ name: 'the shift wraps around', edit: [['    if columns > 0:\n        moved[:, :, :columns] = 0\n    elif columns < 0:\n        moved[:, :, columns:] = 0\n', '']], fails: [0] }],
  },
  '13-04-convolution#Keeping the trained model': {
    wrong: [{ name: 'saved the whole model object', edit: [['torch.save(model.state_dict(), path)', 'torch.save(model, path)']], fails: [0] }],
  },
};
