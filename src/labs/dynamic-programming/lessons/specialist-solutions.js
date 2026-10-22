// Test-only reference programs for the Specialist challenges: the technique each lesson teaches, in Python
// and JavaScript, which is the code each lesson explains (explained-*.js). lessons.test.js runs both against
// every case, and specialist-oracles.js checks the expected values without DP.
import { PROFILE_EXPLAINED } from './explained-profiles.js'
import { PROB_EXPLAINED } from './explained-prob.js'
import { GAME_EXPLAINED } from './explained-games.js'
import { PARSE_EXPLAINED } from './explained-parsing.js'
import { CONTROL_EXPLAINED } from './explained-control.js'
import { RESEARCH_EXPLAINED } from './explained-research.js'

const codeOf = explained => Object.fromEntries(Object.entries(explained).map(([id, e]) => [id, e.code]))

export const SPECIALIST_SOLUTIONS = { ...codeOf(PROFILE_EXPLAINED), ...codeOf(PROB_EXPLAINED), ...codeOf(GAME_EXPLAINED), ...codeOf(PARSE_EXPLAINED), ...codeOf(CONTROL_EXPLAINED), ...codeOf(RESEARCH_EXPLAINED) }
