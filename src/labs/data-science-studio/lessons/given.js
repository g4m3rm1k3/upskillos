// Code a "write it yourself" block puts before the learner's, for Parts 5 and 6: the shop's random-number
// generator (the class Rng and the noise of python/data.py), taken from the real file so it can't drift.
import { SOURCES, parse, functionSource } from '../source.js'

const DATA = SOURCES['data.py'].split('\n')
const end = name => parse('data.py').functions.find(f => f.name === name).end
const RNG_CLASS = DATA.slice(DATA.findIndex(l => l.startsWith('class Rng')), end('below')).join('\n')
const MONTHS = DATA.find(l => l.startsWith('MONTH_DAYS = '))

// For a function that draws with Rng(seed).
export const WITH_RNG = `import math\n\n${RNG_CLASS}`
// For one that also adds noise (simulate).
export const WITH_NOISE = `${WITH_RNG}\n\n\n${functionSource('data.py', 'noise')}`
// For day_of_year, which counts the days of the months before.
export const WITH_MONTHS = `import math\n\n${MONTHS}`
