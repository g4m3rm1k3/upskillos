import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// The app uses HashRouter, so an in-app link written as a plain href="/lesson-builder" makes
// the browser request a server path instead of changing route, which fails on the static site.
// Help, navigation and About content must use <Link to> or navigate() instead.
const src = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jsx = dir => readdirSync(join(src, dir)).filter(f => f.endsWith('.jsx')).map(f => `${dir}/${f}`)
const FILES = [...jsx('components/ui'), ...jsx('components/layout'), 'pages/AboutPage.jsx']
const PLAIN_INTERNAL_HREF = /href=\{?\s*["'`]\/(?!\/)[^"'`]*["'`]/g

describe('in-app links in help, navigation and About', () => {
  it('use router navigation, not plain href="/..."', () => {
    const found = FILES.flatMap(file => {
      const text = readFileSync(join(src, file), 'utf8')
      return [...text.matchAll(PLAIN_INTERNAL_HREF)].map(m => `${file}:${text.slice(0, m.index).split('\n').length}: ${m[0]}`)
    })
    expect(found, 'Use <Link to="/x"> or navigate("/x") for these links').toEqual([])
  })
})
