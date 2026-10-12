// The real Python programs, as text: what the lessons quote and what the Python tab runs.
import { makeSource } from '../python-steps/source.js'
import carsCsv from './python/cars.csv?raw'
import tumoursCsv from './python/tumours.csv?raw'
import irisCsv from './python/iris.csv?raw'
import digitsCsv from './python/digits.csv?raw'

export const {
  SOURCES, parse, functionsOf, fnAt, codeLines, unmatchedNotes, callSitesOf, filesFor, statementStart, midStatement,
} = makeSource(import.meta.glob('./python/*.py', { query: '?raw', import: 'default', eager: true }))

// Data files the programs read, sent to the stepper beside the .py files.
const lf = text => text.replace(/\r\n/g, '\n')
export const DATA_FILES = { 'cars.csv': lf(carsCsv), 'tumours.csv': lf(tumoursCsv), 'iris.csv': lf(irisCsv), 'digits.csv': lf(digitsCsv) }
