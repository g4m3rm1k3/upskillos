// Models the lessons and figures share, trained once per page and kept: training is exactly the
// Python run (parity.test.js), so the numbers shown are the numbers python/ prints.
import { pretrain } from './arith.js'

let base = null
// The base model of Part 1, pretrained with pretrain()'s defaults: [model, losses].
export const baseModel = () => (base ??= pretrain())
