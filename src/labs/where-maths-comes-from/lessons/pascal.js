import { defineLesson } from '../schema.js'

// Bounded enumeration keeps larger rows cheap while retaining the exact count.
export function selections(n, k, limit = 12) {
  const results = []
  function walk(start, picked) {
    if (results.length >= limit) return
    if (picked.length === k) { results.push(picked); return }
    for (let next = start; next <= n - (k - picked.length); next++) walk(next + 1, [...picked, next])
  }
  walk(0, [])
  return results
}

export default defineLesson({
  id: 'l6', title: 'One rule, many patterns', chapter: 'Choices', order: 60,
  prompt: "How many different collections could you pack, and what changes when one more object is available?",
  discovery: {"start": "Four objects are available. You can decide which to pack.", "notice": "A different selection means a different collection of objects, not a different order for the same objects.", "question": "How many different collections could you pack, and what changes when one more object is available?", "transfer": "A café lets you choose any toppings. Does adding a topping offer just one more possible order?", "views": [{"target": "pattern-view", "label": "Compare the triangle"}, {"target": "selections-view", "label": "Inspect other selections"}]},
  panels: {
    explore: `<p>A collection grows one object at a time. You can leave an object out or include it. Choose which objects to pack. You can inspect other possible bags or compare a triangle when those views are useful.</p>
`,
    scene: `<p id="choice-heading"></p><div class="row"><button id="choice-remove">Remove an object</button><button id="choice-add">Add an object</button></div>
<div id="choice-objects" class="wm-objects" role="group" aria-label="Objects to choose"></div>
<div class="row"><button id="choose-none">Choose none</button><button id="choose-all">Choose all</button></div>
<div id="selections-view"><p id="choice-count"></p><div id="choice-examples" class="wm-choice-examples"></div></div>`,
    connections: `<div id="pattern-view"><div class="row"><label>Rows <input type="range" id="prow" min="4" max="16" value="7"><b id="prv"></b></label></div>
<div class="row"><button data-p="d0">The edges</button><button data-p="d1">Second diagonal</button><button data-p="d2">Third diagonal</button><button data-p="odd">Odd numbers</button><button data-p="sum">Row totals</button></div><div class="stage"><svg id="pas" viewBox="0 0 560 320" width="560" role="group" aria-label="Pascal's triangle"></svg></div></div>`,
    explanation: `<p id="pc"></p><p>Each row describes one collection size, beginning with the empty collection in row zero. Position zero chooses no objects. The last position chooses every object. The entries in between count selections of the corresponding size.</p>`,
  },
  mount({ root, $, el, PC, say, on }) {
    let pattern = '', selected = [4, 0], picked = new Set()
    const name = index => String.fromCharCode(65 + index)
    const defaultPosition = n => pattern === 'd0' ? 0 : pattern === 'd1' ? 1 : pattern === 'd2' ? 2 : Math.floor(n / 2)
    function select(n, k, preserve = false) {
      selected = [n, k]
      if (!preserve) picked = new Set(Array.from({ length: k }, (_, i) => i))
      draw()
    }
    function draw() {
      const focused = document.activeElement
      const focusTarget = root.contains(focused) && focused.hasAttribute('data-r') ? `[data-r="${focused.dataset.r}"][data-c="${focused.dataset.c}"]` : root.contains(focused) && focused.hasAttribute('data-object') ? `[data-object="${focused.dataset.object}"]` : null
      const rows = +$('prow').value, [n, k] = selected, count = PC(n, k)
      $('prv').textContent = rows
      const svg = $('pas'); svg.replaceChildren()
      const width = Math.max(560, rows * 46 + 90)
      svg.setAttribute('viewBox', `0 0 ${width} ${40 + rows * 40}`)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c <= r; c++) {
          const x = width / 2 + (c - r / 2) * 46, y = 26 + r * 40, value = PC(r, c)
          const current = r === n && c === k
          const parent = r === n - 1 && (c === k - 1 || c === k)
          const highlighted = pattern === 'd0' ? c === 0 || c === r : pattern === 'd1' ? c === 1 : pattern === 'd2' ? c === 2 : pattern === 'odd' ? value % 2 === 1 : false
          el('circle', { cx: x, cy: y, r: 17, fill: current ? 'var(--ink)' : parent ? 'var(--b)' : highlighted ? 'var(--a)' : 'var(--card)', stroke: 'var(--line)', 'stroke-width': 1.5, 'data-r': r, 'data-c': c, tabindex: 0, role: 'button', 'aria-label': `Row ${r}, position ${c}: ${value}`, 'aria-pressed': current, style: 'cursor:pointer' }, svg)
          const text = el('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': value > 999 ? 10 : 13, fill: current || parent || highlighted ? 'var(--paper)' : 'var(--ink)', 'pointer-events': 'none' }, svg)
          text.textContent = value
        }
        if (pattern === 'sum') {
          const text = el('text', { x: width / 2 + r * 23 + 30, y: 26 + r * 40, 'dominant-baseline': 'central', 'font-size': 13, fill: 'var(--mute)' }, svg)
          text.textContent = `= ${2 ** r}`
        }
      }
      $('choice-heading').textContent = `Collection of ${n} objects · choose ${k}`
      $('choice-remove').disabled = n === 0
      $('choice-add').disabled = n === 15
      $('choice-objects').replaceChildren()
      for (let i = 0; i < n; i++) {
        const button = document.createElement('button')
        button.textContent = name(i); button.dataset.object = i
        button.setAttribute('aria-label', `Object ${name(i)}`)
        button.setAttribute('aria-pressed', picked.has(i))
        button.className = picked.has(i) ? 'sel' : ''
        $('choice-objects').append(button)
      }
      $('choice-count').textContent = `${count} different selection${count === 1 ? '' : 's'} of this size.${count > 12 ? ' Showing twelve examples; the count includes every selection.' : ''}`
      $('choice-examples').replaceChildren()
      for (const sample of selections(n, k)) {
        const chip = document.createElement('div')
        chip.className = 'chip'; chip.textContent = sample.length ? sample.map(name).join(' · ') : 'Empty selection — nothing chosen'
        $('choice-examples').append(chip)
      }
      const excluded = PC(n - 1, k), included = PC(n - 1, k - 1)
      const edge = k === 0 ? 'There is only one way to leave every object out: the empty selection. Adding more objects does not create a second way to choose nothing.' : k === n ? 'There is only one way to include every object: the whole collection. Adding an object changes what the selection contains, but there is still only one complete selection.' : `Separate the possibilities by object ${name(n - 1)}, the newest object. ${excluded} selections leave it out; ${included} include it and choose the remaining ${k - 1} from the older objects. These groups never overlap, and together they account for all ${count} selections.`
      const patternExplanation = pattern === 'd0' ? 'The two edges describe opposite choices: none and all. Both have one outcome. Try “Choose none” and “Choose all” and watch what that single outcome contains.' : pattern === 'd1' ? 'The second diagonal chooses just one object. Each newcomer offers exactly one new single-object selection, so that diagonal grows one at a time.' : pattern === 'd2' ? 'The third diagonal chooses pairs. A newcomer can pair with every older object: the same growth as handshakes in a room.' : pattern === 'sum' ? `Across row ${n}, all selection sizes together give ${2 ** n} possibilities. Every old selection can leave a new object out or include it. Those two versions explain why the next row total doubles.` : pattern === 'odd' ? 'Only entries with odd counts are highlighted. An odd count comes from one odd parent and one even parent; two odd parents or two even parents give an even count. Repeating that local rule creates the nested triangular pattern.' : 'The highlighted parents correspond to the two groups of choices: without the newest object, and with it.'
      say($('pattern-view').hidden ? `Your bag contains ${k} of the ${n} available objects. Different objects make a different bag.` : n === 0 ? 'Even an empty collection has one possible selection: choose nothing.' : `You selected row ${n}, position ${k}. It counts ${count} ${count === 1 ? 'way' : 'ways'} to choose ${k} objects from this collection.`, $('pattern-view').hidden&&$('selections-view').hidden ? 'Swapping one packed object for another changes what is in the bag without changing how many objects you packed. Different orders of the same objects are still the same collection.' : edge, $('pattern-view').hidden&&$('selections-view').hidden ? 'Could you make another bag with the same number of objects? Try a swap, inspect other selections, or choose a triangle comparison if it helps.' : patternExplanation)
      $('pc').textContent = n === 0 ? 'The starting entry is 1: one empty selection.' : `Choosing ${k} from ${n} is written C(${n}, ${k}) = ${count}. ${k > 0 && k < n ? `The two parent counts are ${excluded} + ${included} = ${count}.` : 'This edge entry is always 1.'}`
      root.querySelectorAll('[data-p]').forEach(button => { button.classList.toggle('sel', button.dataset.p === pattern); button.setAttribute('aria-pressed', button.dataset.p === pattern) })
      if (focusTarget) root.querySelector(focusTarget)?.focus()
    }
    on($('prow'), 'input', () => { const n = +$('prow').value - 1; select(n, Math.min(n, defaultPosition(n))) })
    function entry(event) {
      const target = event.target.closest('[data-r]')
      if (target) select(+target.dataset.r, +target.dataset.c)
    }
    on($('pas'), 'click', entry)
    on($('pas'), 'keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); entry(event) } })
    root.querySelectorAll('[data-p]').forEach(button => on(button, 'click', () => {
      pattern = pattern === button.dataset.p ? '' : button.dataset.p
      const n = selected[0]; select(n, Math.min(n, defaultPosition(n)))
    }))
    on($('choice-objects'), 'click', event => {
      const button = event.target.closest('[data-object]'); if (!button) return
      const index = +button.dataset.object
      if (picked.has(index)) picked.delete(index); else picked.add(index)
      select(selected[0], picked.size, true)
    })
    on($('choose-none'), 'click', () => select(selected[0], 0))
    on($('choose-all'), 'click', () => select(selected[0], selected[0]))
    on($('choice-add'), 'click', () => {
      const [n, k] = selected; if (n === 15) return
      $('prow').value = Math.max(+$('prow').value, n + 2)
      select(n + 1, pattern === 'd0' && k === n && n > 0 ? n + 1 : k)
    })
    on($('choice-remove'), 'click', () => { const [n, k] = selected; if (n) select(n - 1, Math.min(k, n - 1)) })
    draw()
  },
})
