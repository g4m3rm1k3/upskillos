// Every in-app link goes to a page that exists. Links are found in the source (navigate('/x'), to="/x",
// backTo="/x", href="#/x") and checked against the routes in App.jsx and each lab's meta.js `routes`. A
// link to a missing route used to land on a blank page (#/labs, from every lab window's back step); this
// test fails instead. `${…}` in a template link counts as one path segment.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = fileURLToPath(new URL('.', import.meta.url))
const LAB_METAS = import.meta.glob('./labs/*/meta.js', { eager: true, import: 'default' })

function routePatterns() {
  const app = readFileSync(join(SRC, 'App.jsx'), 'utf8')
  const paths = [...app.matchAll(/<Route\b[^>]*?\bpath="([^"]+)"/gs)].map((m) => m[1])
  for (const meta of Object.values(LAB_METAS)) for (const r of meta?.routes ?? []) paths.push(r.replace(/^\//, ''))
  return ['', ...paths]   // '' is the index route
}

function matches(pattern, path) {
  const p = pattern.split('/').filter(Boolean), q = path.split('/').filter(Boolean)
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '*') return true
    if (i >= q.length) return false
    if (p[i].startsWith(':') || q[i] === ':param') continue
    if (p[i] !== q[i]) return false
  }
  return p.length === q.length
}

function sourceFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    if (['docs', 'courses', 'node_modules', 'dist', 'posts'].includes(name)) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path))
    // Walkthroughs contain learner files and intentionally broken HTML answers,
    // not navigation rendered by the app.
    else if (/\.(jsx?|tsx?)$/.test(name) && !/\.(test|walkthrough)\./.test(name)) out.push(path)
  }
  return out
}

const LINK = /(?:navigate\(\s*|\bto=\{?\s*|\bbackTo=\{?\s*|\bhref=\{?\s*)(["'`])(#?\/[^"'`]*)\1/g
function links() {
  const out = []
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(LINK)) {
      let path = m[2].replace(/^#/, '')
      if (path.startsWith('//')) continue                       // a protocol-relative URL, not a route
      path = path.replace(/\$\{[^}]*\}/g, ':param').split(/[?#]/)[0]
      if (/^\/(assets|images|fonts|api)\//.test(path)) continue   // files, not pages
      out.push({ file: relative(SRC, file), line: text.slice(0, m.index).split('\n').length, path })
    }
  }
  return out
}

describe('in-app links', () => {
  it('every link the source makes goes to a route that exists', () => {
    // Not the catch-all: it matches anything, by showing "There is no page".
    const patterns = routePatterns().filter((p) => p !== '*')
    expect(patterns).toContain('lab/:labKey')
    const found = links()
    // It must find links to pass: the games' back buttons go to /games, and the lab route backs to /labs.
    expect(found.length).toBeGreaterThan(50)
    expect(found.some((l) => l.path === '/games')).toBe(true)
    expect(found.some((l) => l.path === '/labs')).toBe(true)
    const dead = found.filter((l) => !patterns.some((p) => matches(p, l.path)))
    expect(dead.map((l) => `${l.file}:${l.line} → ${l.path}`)).toEqual([])
  })

  it('the old listing addresses still lead somewhere', () => {
    const patterns = routePatterns()
    expect(patterns).toContain('*')   // anything else shows NotFoundPage, not a blank screen
    for (const path of ['/labs', '/games']) expect(patterns.some((p) => matches(p, path) && p !== '*'), path).toBe(true)
  })
})
