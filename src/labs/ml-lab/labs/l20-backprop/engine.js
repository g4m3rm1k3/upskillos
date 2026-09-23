// A scalar automatic-differentiation engine: every operation records its
// inputs and how to pass a gradient back to them (reverse-mode autodiff).
let counter = 0
export class Value {
  constructor(data, parents = [], op = '', label = '') {
    this.data = data; this.grad = 0; this.parents = parents; this.op = op; this.label = label; this.id = counter++
    this._backward = () => {}
  }
  add(o) { o = wrap(o); const out = new Value(this.data + o.data, [this, o], '+'); out._backward = () => { this.grad += out.grad; o.grad += out.grad }; return out }
  mul(o) { o = wrap(o); const out = new Value(this.data * o.data, [this, o], '×'); out._backward = () => { this.grad += o.data * out.grad; o.grad += this.data * out.grad }; return out }
  pow(k) { const out = new Value(this.data ** k, [this], `^${k}`); out._backward = () => { this.grad += k * this.data ** (k - 1) * out.grad }; return out }
  neg() { return this.mul(-1) }
  sub(o) { return this.add(wrap(o).neg()) }
  tanh() { const t = Math.tanh(this.data), out = new Value(t, [this], 'tanh'); out._backward = () => { this.grad += (1 - t * t) * out.grad }; return out }
  relu() { const out = new Value(Math.max(0, this.data), [this], 'relu'); out._backward = () => { this.grad += (this.data > 0 ? 1 : 0) * out.grad }; return out }
  exp() { const e = Math.exp(this.data), out = new Value(e, [this], 'exp'); out._backward = () => { this.grad += e * out.grad }; return out }
  // Reverse topological order: every node's gradient is complete before it is pushed to its inputs.
  topo() { const seen = new Set(), order = []; const visit = v => { if (seen.has(v)) return; seen.add(v); v.parents.forEach(visit); order.push(v) }; visit(this); return order }
  backward() { const order = this.topo(); order.forEach(v => { v.grad = 0 }); this.grad = 1; [...order].reverse().forEach(v => v._backward()); return order }
}
const wrap = x => x instanceof Value ? x : new Value(x, [], 'const', String(x))

// Preset expressions over named inputs. Each returns { out, leaves }.
export const PRESETS = {
  chain: { label: 'L = (a·b + c)²', inputs: { a: 2, b: -3, c: 10 }, build: v => { const ab = v.a.mul(v.b); ab.label = 'a·b'; const s = ab.add(v.c); s.label = 'e'; const L = s.pow(2); L.label = 'L'; return L } },
  neuron: { label: 'y = tanh(w₁x₁ + w₂x₂ + b)', inputs: { x1: 2, w1: -3, x2: 0, w2: 1, b: 6.88 }, build: v => { const p1 = v.x1.mul(v.w1); p1.label = 'x₁w₁'; const p2 = v.x2.mul(v.w2); p2.label = 'x₂w₂'; const s = p1.add(p2); s.label = 'sum'; const z = s.add(v.b); z.label = 'z'; const y = z.tanh(); y.label = 'y'; return y } },
  shared: { label: 'f = x·y + x  (x used twice)', inputs: { x: 3, y: 4 }, build: v => { const xy = v.x.mul(v.y); xy.label = 'x·y'; const f = xy.add(v.x); f.label = 'f'; return f } },
  loss: { label: 'squared error of a line: (w·x + b − t)²', inputs: { w: 0.5, x: 2, b: 0, t: 3 }, build: v => { const wx = v.w.mul(v.x); wx.label = 'w·x'; const yhat = wx.add(v.b); yhat.label = 'ŷ'; const e = yhat.sub(v.t); e.label = 'e'; const L = e.pow(2); L.label = 'L'; return L } },
}
export function evaluate(presetKey, inputs) {
  const leaves = Object.fromEntries(Object.entries(inputs).map(([k, x]) => [k, new Value(x, [], 'input', k)]))
  const out = PRESETS[presetKey].build(leaves)
  const order = out.backward()
  return { out, leaves, order }
}
// Central finite difference for one input, rebuilding the graph each time.
export function numericGrad(presetKey, inputs, name, eps = 1e-6) {
  const f = x => evaluate(presetKey, { ...inputs, [name]: x }).out.data
  return (f(inputs[name] + eps) - f(inputs[name] - eps)) / (2 * eps)
}
// Column layout: leaves at depth 0, each node one column right of its deepest input.
export function layout(order) {
  const depth = new Map()
  order.forEach(v => depth.set(v, v.parents.length ? 1 + Math.max(...v.parents.map(p => depth.get(p))) : 0))
  const cols = new Map()
  order.forEach(v => { const d = depth.get(v); cols.set(d, [...(cols.get(d) ?? []), v]) })
  return { depth, cols, maxDepth: Math.max(...depth.values()) }
}
