// Test-only reference programs for the Specialist challenges: the technique each lesson teaches, in Python
// and JavaScript, which is the code each lesson explains (explained-*.js). lessons.test.js runs both against
// every case, and specialist-oracles.js checks the expected values without DP.
import { PROFILE_EXPLAINED } from './explained-profiles.js'

const codeOf = explained => Object.fromEntries(Object.entries(explained).map(([id, e]) => [id, e.code]))

export const SPECIALIST_SOLUTIONS = { ...codeOf(PROFILE_EXPLAINED) }
