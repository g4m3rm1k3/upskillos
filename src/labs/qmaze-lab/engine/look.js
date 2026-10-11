// How each map is drawn: who the agent is and what each cell letter looks like. Kept apart from
// maps.js, which must stay identical to python/maps.py.
export const AGENT = { corridor: '🐭', cheese_and_cat: '🐭', qmaze: '🐭', cats_and_cheese: '🐭', cliff: '🚶', frozen_lake: '🧝', frozen_lake_8x8: '🧝' }

export const CELL = {
  '.': { name: 'floor' },
  S: { name: 'start' },
  '#': { name: 'wall', icon: '' },
  C: { name: 'cheese', icon: '🧀' },
  c: { name: 'small cheese', icon: '🧀', small: true },
  X: { name: 'cat', icon: '🐱' },
  H: { name: 'hole', icon: '' },
  G: { name: 'goal', icon: '🏁' },
  K: { name: 'cliff', icon: '' },
}

export const isIce = env => env.intended < 1
