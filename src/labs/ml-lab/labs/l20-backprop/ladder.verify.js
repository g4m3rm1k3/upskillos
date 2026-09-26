// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const neuron = body => `import numpy as np\n\ndef neuron_grads(w, x, b, t):\n${body}\n`
const good = '    y = np.tanh(w @ x + b)\n    g_z = 2 * (y - t) * (1 - y ** 2)\n    return np.append(g_z * x, g_z)'
export const verify = {
  backprop: {
    pass: {
      agree: s => s.starter.replace('grad_x = grad_f * 1', 'grad_x += grad_f * 1'),
      fill: [s => s.starter.replace('___', 'upstream * (1 - y ** 2)')],
      repair: [s => s.starter.replace('np.array([upstream * a, upstream * b])', 'np.array([upstream * b, upstream * a])')],
      implement: [
        () => neuron(good),
        () => neuron('    y = np.tanh(np.dot(w, x) + b)\n    g = [2 * (y - t) * (1 - y * y) * xi for xi in x]\n    return np.array(g + [2 * (y - t) * (1 - y * y)])'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /grad_x \+= grad_f \* 1/ }],
      fill: [
        { code: s => s.starter.replace('___', '1 - y ** 2'), hint: /upstream gradient/ },
        { code: s => s.starter.replace('___', 'upstream * (1 - y)'), hint: /1 − y², not 1 − y/ },
      ],
      repair: [{ code: s => s.starter, hint: /swapped/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => neuron('    y = np.tanh(w @ x + b)\n    g_z = 2 * (y - t)\n    return np.append(g_z * x, g_z)'), hint: /tanh node is missing/ },
        { code: () => neuron('    y = np.tanh(w @ x + b)\n    g_z = (y - t) * (1 - y ** 2)\n    return np.append(g_z * x, g_z)'), hint: /Half the right size/ },
        { code: () => neuron('    y = np.tanh(w @ x + b)\n    return 2 * (y - t) * (1 - y ** 2) * x'), hint: /one for b/ },
      ],
    },
  },
}
