// A small, safe expression language for derivation steps. Learners type a
// formula ("2*(w*x + b - y)*x", "2(wx+b−y)x", "σ(z)(1−σ(z))"); we parse it
// without eval and check it against the reference by evaluating both at many
// random points. Equal functions agree everywhere; different ones almost never do.

const FUNCS = {
  exp: Math.exp, log: Math.log, ln: Math.log, log2: Math.log2, sqrt: Math.sqrt, abs: Math.abs,
  sigmoid: z => 1 / (1 + Math.exp(-z)), σ: z => 1 / (1 + Math.exp(-z)),
  tanh: Math.tanh, sin: Math.sin, cos: Math.cos, max: Math.max, min: Math.min,
}
const CONSTS = { pi: Math.PI, π: Math.PI }
const SUPERSCRIPTS = { '²': '^2', '³': '^3', '⁴': '^4' }
// Greek variables can be typed in plain letters: "phi" for φ, "theta" for θ.
export const GREEK = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', eta: 'η', theta: 'θ', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', rho: 'ρ', tau: 'τ', phi: 'φ', psi: 'ψ', omega: 'ω', pi: 'π', ell: 'ℓ' }

function normalize(src) {
  return src.replace(/[²³⁴]/g, c => SUPERSCRIPTS[c]).replace(/[−–]/g, '-').replace(/[·×⋅]/g, '*').replace(/÷/g, '/').replace(/\*\*/g, '^').replace(/√/g, 'sqrt').replace(/log₂/g, 'log2')
}

// Split an identifier like "wx" into known names ("w", "x") when it is not itself known.
function resolveName(name, known) {
  if (known.has(name) || FUNCS[name] || (name in CONSTS)) return [name]
  if (GREEK[name] && known.has(GREEK[name])) return [GREEK[name]]
  const out = []
  let i = 0
  while (i < name.length) {
    let match = ''
    for (let j = name.length; j > i; j--) { const part = name.slice(i, j); if (GREEK[part] && known.has(GREEK[part])) { match = part; break } if (known.has(part) || FUNCS[part] || (part in CONSTS) || (part === 'e' && !known.has('e'))) { match = part; break } }
    if (!match) throw new Error(`Unknown name “${name.slice(i)}”. Use the variables ${[...known].join(', ')}.`)
    out.push(GREEK[match] && known.has(GREEK[match]) ? GREEK[match] : match); i += match.length
  }
  return out
}

function tokenize(src, known) {
  const s = normalize(src), tokens = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/\s/.test(c)) { i++; continue }
    const num = /^(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/.exec(s.slice(i))
    if (num) { tokens.push({ t: 'num', v: Number(num[0]) }); i += num[0].length; continue }
    const id = /^[\p{L}_][\p{L}\p{N}_]*/u.exec(s.slice(i))
    if (id) { resolveName(id[0], known).forEach(name => tokens.push({ t: 'id', v: name })); i += id[0].length; continue }
    if ('+-*/^(),'.includes(c)) { tokens.push({ t: c }); i++; continue }
    throw new Error(`Unexpected character “${c}”.`)
  }
  return tokens
}

// Recursive-descent parser producing a tree of closures over an environment.
export function compile(src, variables = []) {
  const known = new Set(variables), tokens = tokenize(String(src), known)
  let p = 0
  const peek = () => tokens[p], take = t => { if (tokens[p]?.t !== t) throw new Error(t === ')' ? 'A closing bracket is missing.' : `Expected “${t}”.`); return tokens[p++] }
  const startsAtom = tok => tok && (tok.t === 'num' || tok.t === 'id' || tok.t === '(')
  function expr() {
    let node = term()
    while (peek() && (peek().t === '+' || peek().t === '-')) { const op = tokens[p++].t, a = node, b = term(); node = op === '+' ? env => a(env) + b(env) : env => a(env) - b(env) }
    return node
  }
  function term() {
    let node = unary()
    for (;;) {
      const tok = peek()
      if (tok && (tok.t === '*' || tok.t === '/')) { p++; const a = node, b = unary(); node = tok.t === '*' ? env => a(env) * b(env) : env => a(env) / b(env) }
      else if (startsAtom(tok)) { const a = node, b = power(); node = env => a(env) * b(env) } // implicit multiplication: 2x, 2(x+1), (a)(b)
      else return node
    }
  }
  function unary() {
    if (peek()?.t === '-') { p++; const a = unary(); return env => -a(env) }
    if (peek()?.t === '+') { p++; return unary() }
    return power()
  }
  function power() {
    const base = atom()
    if (peek()?.t === '^') { p++; const ex = unary(); return env => base(env) ** ex(env) }
    return base
  }
  function atom() {
    const tok = tokens[p++]
    if (!tok) throw new Error('The expression ends too early.')
    if (tok.t === 'num') return () => tok.v
    if (tok.t === '(') { const a = expr(); take(')'); return a }
    if (tok.t === 'id') {
      const f = FUNCS[tok.v]
      if (f) {
        take('('); const args = [expr()]
        while (peek()?.t === ',') { p++; args.push(expr()) }
        take(')')
        return env => f(...args.map(a => a(env)))
      }
      if (known.has(tok.v)) return env => env[tok.v]
      if (tok.v in CONSTS) return () => CONSTS[tok.v]
      if (tok.v === 'e') return () => Math.E
    }
    throw new Error(`Unexpected “${tok.v ?? tok.t}”.`)
  }
  const tree = expr()
  if (p < tokens.length) throw new Error(`Unexpected “${tokens[p].v ?? tokens[p].t}” — check for a missing operator or bracket.`)
  return tree
}

// Deterministic points so a check never flickers between attempts.
function sampler(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// Compare a learner's expression with the reference over `domains` ({name: [lo, hi]}).
export function equivalent(answer, reference, domains, { samples = 16, tolerance = 1e-6 } = {}) {
  const vars = Object.keys(domains)
  let mine
  try { mine = compile(answer, vars) } catch (e) { return { ok: false, error: e.message } }
  const ref = compile(reference, vars), rng = sampler(12345)
  let tested = 0
  for (let k = 0; k < samples * 4 && tested < samples; k++) {
    const env = Object.fromEntries(vars.map(v => { const [lo, hi] = domains[v]; return [v, lo + (hi - lo) * rng()] }))
    const r = ref(env)
    if (!Number.isFinite(r)) continue
    const m = mine(env)
    tested++
    if (!Number.isFinite(m) || Math.abs(m - r) > tolerance * Math.max(1, Math.abs(r))) return { ok: false, at: env, got: m, expected: r }
  }
  return { ok: tested > 0 }
}
