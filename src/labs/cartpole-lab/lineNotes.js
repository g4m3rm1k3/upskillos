// Every line note written in the lessons, indexed by file and line (see python-steps/lineNotes.js).
import { makeLineNotes } from '../python-steps/lineNotes.js'
import { LESSONS } from './lessons/index.js'
import { codeLines } from './source.js'

export const { lineNotes, notesFor, extrasFor } = makeLineNotes(() => LESSONS, codeLines)
