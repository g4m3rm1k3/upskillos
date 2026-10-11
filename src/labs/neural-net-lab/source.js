// The real Python programs, as text: what the lessons quote and what the Python tab runs.
import { makeSource } from '../python-steps/source.js'
import carsCsv from './python/cars.csv?raw'

export const {
  SOURCES, parse, functionsOf, fnAt, codeLines, unmatchedNotes, callSitesOf, filesFor, statementStart, midStatement,
} = makeSource(import.meta.glob('./python/*.py', { query: '?raw', import: 'default', eager: true }))

// Data files the programs read, sent to the stepper beside the .py files.
export const DATA_FILES = { 'cars.csv': carsCsv.replace(/\r\n/g, '\n') }
