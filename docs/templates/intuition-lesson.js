// Copy to src/labs/where-maths-comes-from/lessons/<your-slug>.js.
import { defineLesson } from '../schema.js'

export default defineLesson({
  id: 'your-stable-lesson-id',
  title: 'One more guest',
  chapter: 'Everyday collections',
  order: 150,
  prompt: 'What changes when another person arrives, and what stays the same?',
  discovery: {
    start: 'A guest is waiting; the table has room to arrange places.',
    notice: 'You can decide how to seat arrivals without first choosing a counting method.',
    question: 'How would you check that every guest has a place?',
    transfer: 'Would lining up chairs change how many people can sit down?',
    views: [], // Optional: { target: 'local-dom-id', label: 'Compare another view' }.
  },
  panels: {
    explore: `<p>A guest arrives. Put out one place for each person.</p>
      <button id="arrive">Someone arrives</button>
      <button id="leave">Someone leaves</button>`,
    scene: `<div class="stage"><svg id="places" viewBox="0 0 420 90" role="img" aria-label="One place for each guest"></svg></div>`,
    connections: `<p>Imagine moving the places around the table. Would that change how many guests can sit down?</p>`,
    explanation: `<p>Matching one place to each person is one-to-one correspondence. The arrangement can change without changing the quantity.</p>`,
  },
  mount({ $, el, say, on }) {
    let guests = 1
    function draw() {
      $('places').replaceChildren()
      for (let i = 0; i < guests; i++) el('circle', { cx: 25 + i * 36, cy: 45, r: 13, fill: 'var(--a)' }, $('places'))
      $('leave').disabled = guests === 0
      $('arrive').disabled = guests === 10
      say(guests ? `${guests} guests have a place waiting.` : 'Nobody is here yet; no places are needed.',
        'Each arriving person needs exactly one new place. Moving existing places would not make room for an extra guest.',
        'Let someone leave. Watch one place disappear while all the other matches remain.')
    }
    on($('arrive'), 'click', () => { if (guests < 10) guests++; draw() })
    on($('leave'), 'click', () => { if (guests > 0) guests--; draw() })
    draw()
  },
})
