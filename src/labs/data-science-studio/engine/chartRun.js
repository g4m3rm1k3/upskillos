// The "Draw it with D3" block's runtime and checker, modelled on Data Science on the Web's
// (src/labs/web-data-science/runtime.js): the learner's JavaScript runs in the page with d3, and
// the answer key is the lab's own solution, run the same way, so nothing is written twice. What is
// compared is the chart itself: for each selector the block names, how many elements it drew and
// the chosen attributes of each (positions to within half a pixel, text exactly).
//
// The code runs with: d3, svg (a d3 selection of an empty <svg>), data, width, height.

export const WIDTH = 480, HEIGHT = 300

// Runs the code into an <svg> element. Returns { error } (null when it ran).
export function runChart(code, { d3, svgEl, data }) {
  try {
    const fn = new Function('d3', 'svg', 'data', 'width', 'height', '"use strict";\n{\n' + code + '\n}')
    fn(d3, d3.select(svgEl), data, WIDTH, HEIGHT)
    return { error: null }
  } catch (error) {
    return { error }
  }
}

// An element's attribute as the check sees it: '#text' is its text; a number is a number; anything
// holding numbers (a transform, a path) is its list of numbers; anything else is the text itself.
function read(el, attr) {
  if (attr === '#text') return el.textContent
  const raw = el.getAttribute(attr)
  if (raw === null) return null
  const t = raw.trim()
  if (t !== '' && Number.isFinite(Number(t))) return Number(t)
  const numbers = t.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)
  return numbers && /^(translate|M|m|rotate|scale)/.test(t) ? numbers.map(Number) : t
}

// checks: [{ select, attrs }] → { [select]: [ { attr: value } ] }
export function marksOf(svgEl, checks) {
  return Object.fromEntries(checks.map(({ select, attrs = [] }) => [select, [...svgEl.querySelectorAll(select)].map(el => Object.fromEntries(attrs.map(a => [a, read(el, a)])))]))
}

const nameOf = select => ({ rect: 'bar', circle: 'circle', path: 'path', line: 'line', text: 'text' }[select.split(/[\s.>]/).filter(Boolean).at(-1)] ?? `“${select}”`)
const close = (a, b, tol) => (Array.isArray(b) ? Array.isArray(a) && a.length === b.length && b.every((x, k) => Math.abs(a[k] - x) <= tol) : typeof b === 'number' ? typeof a === 'number' && Math.abs(a - b) <= tol : a === b)
const shown = v => (Array.isArray(v) ? `(${v.map(x => +x.toFixed(1)).join(', ')})` : typeof v === 'number' ? String(+v.toFixed(2)) : JSON.stringify(v))

// The learner's marks against the answer's: a list of what differs, in words (empty: it matches).
export function compareMarks(got, want, tolerance = 0.5) {
  const problems = []
  for (const [select, wanted] of Object.entries(want)) {
    const mine = got[select] ?? [], name = nameOf(select)
    if (mine.length !== wanted.length) { problems.push(`Your chart has ${mine.length} ${select} element${mine.length === 1 ? '' : 's'}; it should have ${wanted.length}.`); continue }
    for (let k = 0; k < wanted.length && problems.length < 6; k++) {
      for (const [attr, value] of Object.entries(wanted[k])) {
        if (!close(mine[k][attr], value, tolerance)) problems.push(`${name} ${k + 1}: ${attr === '#text' ? 'its text' : attr} is ${shown(mine[k][attr])}, where it should be ${shown(value)}.`)
      }
    }
  }
  return problems
}

// A block's whole check. spec: { solution, data, runs, checks, keep, tolerance }.
//   runs: several data sets, drawn one after the other into the same svg (the data join); the marks
//         are compared after the last. keep: a field naming each datum; marks whose datum is in two
//         runs in a row must be the same element (the join updates them, it doesn't redraw them).
// Returns { error, problems, marks }.
export function checkChart(code, spec, { d3, makeSvg }) {
  const runs = spec.runs ?? [spec.data]
  const draw = source => {
    const svgEl = makeSvg()
    const kept = []
    for (const [k, data] of runs.entries()) {
      const before = spec.keep ? new Map([...svgEl.querySelectorAll(spec.checks[0].select)].map(el => [el.__data__?.[spec.keep], el])) : null
      const r = runChart(source, { d3, svgEl, data })
      if (r.error) return { error: r.error }
      if (before && k > 0) {
        for (const el of svgEl.querySelectorAll(spec.checks[0].select)) {
          const key = el.__data__?.[spec.keep]
          if (before.has(key) && before.get(key) !== el) kept.push(`The ${nameOf(spec.checks[0].select)} for ${key} was removed and drawn again when the data changed: give the join a key, so it keeps each mark with its datum.`)
        }
      }
    }
    return { svgEl, kept: [...new Set(kept)].slice(0, 2) }
  }
  const answer = draw(spec.solution)
  if (answer.error) return { error: new Error(`the lab’s own solution failed: ${answer.error.message}`), problems: [] }
  const mine = draw(code)
  if (mine.error) return { error: mine.error, problems: [] }
  const want = marksOf(answer.svgEl, spec.checks), got = marksOf(mine.svgEl, spec.checks)
  return { error: null, problems: [...compareMarks(got, want, spec.tolerance), ...mine.kept], marks: got, svg: mine.svgEl }
}
