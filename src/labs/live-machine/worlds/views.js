// worlds/views.js
// The picture for each world in worlds/index.js, plus what the inspector says about the thing
// the learner clicked:
//   argNames             names of the arguments the learner's function receives
//   indexOf(w, sel)      which call (index into world.inputs(w)) belongs to the selection
//   answerOf(w, sel)     { answer, error } that call returned last tick
//   did(w, sel)          a sentence: what the ship did with the answer
import LightsView from './LightsView.jsx'
import DoorsView from './DoorsView.jsx'

const roomIndex = (w, sel) => w.rooms.findIndex(r => r.name === sel)

export const VIEWS = {
  lights: {
    View: LightsView,
    argNames: ['room'],
    defaultSelection: 'Cargo',
    selectTip: 'Click any room on the ship to inspect it.',
    indexOf: roomIndex,
    answerOf: (w, sel) => { const r = w.rooms[roomIndex(w, sel)]; return { answer: r?.answer, error: r?.error } },
    did: (w, sel) => `${sel}: light ${w.rooms[roomIndex(w, sel)]?.lit ? 'on' : 'off'}${w.blackout ? ' (the blackout overrides your code)' : ''}.`,
  },
  reactor: {
    View: LightsView,
    argNames: ['rooms', 'supply'],
    defaultSelection: 'Cargo',
    selectTip: 'The ship calls your function once per tick with every room. Click a room to see whether your plan lit it.',
    indexOf: () => 0,
    answerOf: w => ({ answer: w.plan, error: w.error }),
    did: (w, sel) => (w.tripped
      ? `Breaker tripped: every light is out for ${w.tripped} more tick${w.tripped === 1 ? '' : 's'}.`
      : `${sel}: light ${w.rooms[roomIndex(w, sel)]?.lit ? 'on' : 'off'}. Supply this tick: ${w.supply} lights.`),
  },
  doors: {
    View: DoorsView,
    argNames: ['door'],
    defaultSelection: 'Cargo',
    selectTip: 'Click any door (or its room) to inspect it.',
    indexOf: (w, sel) => w.doors.findIndex(d => d.room === sel),
    answerOf: (w, sel) => { const d = w.doors.find(x => x.room === sel); return { answer: d?.answer, error: d?.error } },
    did: (w, sel) => `The ${sel} door is ${w.doors.find(d => d.room === sel)?.state}.`,
  },
}
