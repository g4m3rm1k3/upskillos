// The real Python programs, as text: what the lessons quote and what the Python tab runs.
import { makeSource } from '../python-steps/source.js'

export const {
  SOURCES, parse, functionsOf, fnAt, codeLines, unmatchedNotes, callSitesOf, filesFor, statementStart, midStatement,
} = makeSource(import.meta.glob('./python/*.py', { query: '?raw', import: 'default', eager: true }))
