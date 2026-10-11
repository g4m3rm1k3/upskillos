// Generic structural explanations: never infer domain meaning from a variable's name.
export function automaticConcept(node) {
  if (node?.adapter === 'torch.nn.Module' || node?.type === 'parameter') return 'model'
  return ({ Tensor: 'tensor', ndarray: 'array', list: 'list', tuple: 'genericTuple', dict: 'dict', function: 'function', class: 'function' })[node?.type] || 'automatic'
}
export function automaticMath(metadata, memory, changed = []) {
  const expression = metadata?.expression
  const outputs = changed.filter(name => memory[name]?.value !== undefined).slice(0, 4)
  const values = outputs.map(name => `${name} = ${JSON.stringify(memory[name].value).slice(0, 160)}`).join('; ')
  for (const call of metadata?.calls || []) {
    const parts = call.split('.'), name = parts[0], method = parts[1], node = memory[name]
    if (parts.length === 2 && node?.type === 'Tensor') {
      const explanations = {
        backward: ['g = ∂output/∂parameter', 'PyTorch traverses the recorded derivative graph and accumulates gradients. It does not perform an optimizer update.'],
        mean: ['mean(x) = Σ x / number of elements reduced', 'The reduction axes and keepdim argument determine the output shape. Inspect the expression and resulting tensor.'],
        sum: ['sum(x) = Σ x', 'Sum over the axes requested by this call; no division by the number of elements.'],
        square: ['yᵢ = xᵢ²', 'Square each element independently. The output retains the input shape.'],
        detach: ['same values; stop this derivative path', 'The detached tensor shares storage but no longer tracks derivatives through this branch.'],
      }
      if (explanations[method]) return [explanations[method][0], values || `${name}: Tensor [${node.shape?.join(', ') || 'scalar'}]`, `${explanations[method][1]} Recognized from the runtime Tensor type and method, not the variable name.`]
    }
    if (parts.length === 2 && node?.adapter === 'torch.optim.Optimizer' && method === 'step') return [`${node.type}.step(): update parameters using gradients`, values || 'Inspect the model parameter arrays before and after this statement.', 'The optimizer type and its settings determine the update rule. This view does not infer what the model is learning.']
    if (parts.length === 1 && node?.adapter === 'torch.nn.Module') return [node.type === 'Linear' ? 'Y = XWᵀ + b' : `${node.type}: run its forward computation`, values || 'Inspect the output shape and the model’s named parameter arrays.', 'Recognized as a PyTorch model at runtime. What its inputs and outputs represent must come from the program or an authored explanation.']
  }
  return [expression ? `Python expression: ${expression}` : 'Inspect the operation and its actual outputs', values || 'Expand the changed objects below to inspect their fields and shapes.', 'Automatic view: these are syntax and runtime facts. Custom functions and overloaded operators can have different mathematical meanings; PyCade does not guess them.']
}
export function exampleMath(mode, code, memory) {
  const v = key => memory[key]?.value
  const fmt = number => typeof number === 'number' ? Number(number.toFixed(5)) : '?'
  if (mode === 'regression') {
    if (code.includes('predictions =')) return ['ŷᵢ = w × xᵢ + b', `first example: ${fmt(v('w'))} × ${fmt(v('x')?.[0])} + ${fmt(v('b'))} = ${fmt(v('predictions')?.[0])}`, 'The same slope and intercept are shared across all four examples.']
    if (code.includes('loss =')) return ['MSE = (1/n) Σᵢ (ŷᵢ − yᵢ)²', `mean squared error = ${fmt(v('loss'))}`, 'Square each error, then average. Large errors count more heavily.']
    if (code.includes('dw =')) return ['∂L/∂w = (2/n) Σᵢ (ŷᵢ − yᵢ)xᵢ', `slope derivative = ${fmt(v('dw'))}`, 'A derivative tells how loss changes when this parameter changes.']
    if (code.includes('db =')) return ['∂L/∂b = (2/n) Σᵢ (ŷᵢ − yᵢ)', `intercept derivative = ${fmt(v('db'))}`, 'Each prediction changes one-for-one with the intercept.']
    if (code.includes('w = w -') || code.includes('b = b -')) return ['parameter ← parameter − learning_rate × derivative', `w = ${fmt(v('w'))}; b = ${fmt(v('b'))}`, 'Move against the derivative. These values are the parameters after this statement.']
  }
  if (mode === 'classifier') {
    if (code.includes('loss = criterion')) return ['L = −(1/n) Σᵢ ln pᵢ(correct class)', `cross entropy = ${fmt(v('loss'))}`, 'PyTorch calculates log-softmax from the logits. A correct class with low probability incurs a large penalty.']
    if (code.includes('probabilities =')) return ['pᵢ,c = exp(zᵢ,c) / Σⱼ exp(zᵢ,j)', `first example: ${JSON.stringify(v('probabilities')?.[0])}`, 'Each row is one example; columns are class 0 and class 1. This is classification, not action selection.']
    if (code.includes('logits =')) return ['scores = xWᵀ + b', `first example scores = ${JSON.stringify(v('logits')?.[0])}`, 'Expand model to see the learned weight matrix and bias. Scores need not sum to one.']
    if (code.includes('optimizer.step')) return ['parameter ← parameter − 0.1 × gradient', 'The model weight and bias tensors change on this statement.', 'This example uses SGD, not Adam. backward computed these gradients without changing the weights.']
    if (code.includes('loss.backward')) return ['g = ∂L/∂parameter', 'Expand model → weight / bias → gradient.', 'backward computes derivatives; optimizer.step applies them.']
  }
  if (mode === 'bandit' && code.includes('estimates[action] =')) return ['new mean = old mean + (reward − old mean) / count', `${fmt(v('before'))} + ${fmt(v('error'))} / ${fmt(v('counts')?.[v('action')])} = ${fmt(v('estimates')?.[v('action')])}`, 'Only the chosen machine’s estimate changes. No discount or next-state estimate is needed.']
  return null
}
export const SUPERVISED_PHASES = {
  setup: ['Prepare', 'Create data, parameters and the tools the program needs.'],
  observe: ['Read data', 'Inspect the inputs and known training answers.'],
  choose: ['Predict', 'Calculate outputs using the current parameters.'],
  act: ['Get feedback', 'Receive the outcome produced by the environment.'],
  store: ['Keep evidence', 'Save values needed by later statements.'],
  learn: ['Update', 'Use errors or outcomes to adjust estimates or weights.'],
  loop: ['Repeat', 'Run the next iteration with updated memory.'],
  compute: ['Execute', 'Follow statements, function calls, arguments and return values.'],
}
