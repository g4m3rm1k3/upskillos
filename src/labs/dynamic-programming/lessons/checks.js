// "Check yourself": several short checks per lesson, after the lesson is taught (Checks.jsx).
//
// Each check opens with know, a short "what you need to know", then asks one of two kinds:
//   choice  { know, ask, options: [{ text, why, right? }] }: exactly one option is right, and every
//           option says why. The right one is shown in a rotating position (displayOrder in designs.js).
//   number  { know, ask, args, answer, kind?: 'yesno', part?, oracle?, misconceptions, explain }: args are
//           the challenge's arguments, so checks.test.js compares answer with the brute-force oracle
//           (core-oracles.js; oracle names another lesson's; part picks one entry of a list answer).
//           Each misconception is a wrong answer a real mistake gives, with feedback naming the mistake.
// Numbers quoted in the text are listed in CLAIMS in checks.test.js and checked there too.
import { LINEAR_CHECKS } from './checks-linear.js'
import { GRID_CHECKS } from './checks-grids.js'

export const CHECKS = { ...LINEAR_CHECKS, ...GRID_CHECKS }
