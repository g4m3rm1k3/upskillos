import { describe, it, expect } from 'vitest'
import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MATH_LINKS } from './mathLinks.js'
import { labs } from '../labs/index.js'

const here = dirname(fileURLToPath(import.meta.url)), src = join(here, '..', '..', '..')

describe('math links', () => {
  it('every course link points to an existing lesson file', () => {
    for (const [key, l] of Object.entries(MATH_LINKS).filter(([, l]) => l.kind === 'lesson')) {
      const courseDir = join(src, 'courses', l.course)
      const chapter = readdirSync(courseDir).find(d => d.startsWith(`${l.chapter}-`))
      expect(chapter, `${key}: chapter ${l.chapter} of ${l.course}`).toBeTruthy()
      const file = readdirSync(join(courseDir, chapter)).find(f => f.replace(/^\d+-/, '') === `${l.slug}.js`)
      expect(file, `${key}: ${l.course}/${chapter}/${l.slug}`).toBeTruthy()
      if (l.section) {
        const text = readFileSync(join(courseDir, chapter, file), 'utf8')
        expect(text.includes(`anchor: '${l.section}'`), `${key}: section ${l.section} in ${file}`).toBe(true)
      }
    }
  })
  it('every tool link matches its lab’s route', () => {
    for (const [key, l] of Object.entries(MATH_LINKS).filter(([, l]) => l.kind === 'tool')) {
      const meta = join(src, 'labs', l.lab, 'meta.js')
      expect(existsSync(meta), key).toBe(true)
      const text = readFileSync(meta, 'utf8'), path = /path:\s*["']([^"']+)/.exec(text)?.[1]
      expect([path, `/lab/${l.lab}`], key).toContain(l.href)
    }
  })
  it('every key used by a lab or lesson exists', () => {
    for (const lab of labs) {
      for (const k of lab.math ?? []) expect(MATH_LINKS[k], `lab ${lab.number}: ${k}`).toBeTruthy()
      for (const lesson of lab.lessons) for (const k of lesson.math ?? []) expect(MATH_LINKS[k], `${lesson.id}: ${k}`).toBeTruthy()
    }
  })
})
