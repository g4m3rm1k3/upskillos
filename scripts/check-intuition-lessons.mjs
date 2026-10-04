import { readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { defineLesson, validateSequence } from '../src/labs/where-maths-comes-from/schema.js'

const directory = new URL('../src/labs/where-maths-comes-from/lessons/', import.meta.url)
const files = (await readdir(fileURLToPath(directory))).filter(file => file.endsWith('.js')).sort()
const lessons = []
for (const file of files) {
  try {
    const module = await import(new URL(file, directory))
    lessons.push(defineLesson(module.default))
  } catch (error) {
    throw new Error(`${file}: ${error.message}`, { cause: error })
  }
}
validateSequence(lessons)
console.log(`✓ ${lessons.length} standalone intuition lessons conform to schema v1; ids are unique.`)
