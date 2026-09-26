import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { resolveAllowedPath, isUntrustedCaller } from './devFsGuard.mjs'

const root = path.resolve('/work/open-calc')

describe('resolveAllowedPath', () => {
  it('allows files inside src/ and public/', () => {
    expect(resolveAllowedPath(root, 'src/courses/geometry/diagrams/a.svg')).toBe(path.join(root, 'src/courses/geometry/diagrams/a.svg'))
    expect(resolveAllowedPath(root, 'public/logo.svg')).toBe(path.join(root, 'public/logo.svg'))
    expect(resolveAllowedPath(root, 'src')).toBe(path.join(root, 'src'))
  })

  it('refuses a sibling folder whose name only starts with the root name', () => {
    expect(resolveAllowedPath(root, '../open-calc-old/src/x.js')).toBeNull()
    expect(resolveAllowedPath(root, 'src-backup/x.js')).toBeNull()
  })

  it('refuses paths that climb out of the allowed folders', () => {
    expect(resolveAllowedPath(root, 'src/../package.json')).toBeNull()
    expect(resolveAllowedPath(root, '../../etc/passwd')).toBeNull()
    expect(resolveAllowedPath(root, 'package.json')).toBeNull()
    expect(resolveAllowedPath(root, '')).toBeNull()
  })

  it('refuses .git, node_modules and .env files even inside src/', () => {
    expect(resolveAllowedPath(root, 'src/.git/config')).toBeNull()
    expect(resolveAllowedPath(root, 'src/node_modules/x/index.js')).toBeNull()
    expect(resolveAllowedPath(root, 'src/.env')).toBeNull()
    expect(resolveAllowedPath(root, 'public/.env.local')).toBeNull()
  })

  it('refuses non-string and NUL-containing paths', () => {
    expect(resolveAllowedPath(root, undefined)).toBeNull()
    expect(resolveAllowedPath(root, 'src/a\0.js')).toBeNull()
  })
})

describe('isUntrustedCaller', () => {
  it('trusts this machine and the desktop app', () => {
    expect(isUntrustedCaller({})).toBe(false)                                         // same-origin GET
    expect(isUntrustedCaller({ origin: 'http://localhost:5173' })).toBe(false)
    expect(isUntrustedCaller({ origin: 'http://127.0.0.1:8787' })).toBe(false)
    expect(isUntrustedCaller({ origin: 'http://[::1]:5173' })).toBe(false)
    expect(isUntrustedCaller({ origin: 'opencalc://app' })).toBe(false)
    expect(isUntrustedCaller({ 'sec-fetch-site': 'same-origin' })).toBe(false)
  })

  it('refuses other websites and sandboxed pages', () => {
    expect(isUntrustedCaller({ origin: 'https://evil.example' })).toBe(true)
    expect(isUntrustedCaller({ origin: 'http://localhost.evil.example' })).toBe(true)
    expect(isUntrustedCaller({ origin: 'null' })).toBe(true)                          // sandboxed iframe
    expect(isUntrustedCaller({ origin: 'not a url' })).toBe(true)
    expect(isUntrustedCaller({ 'sec-fetch-site': 'cross-site' })).toBe(true)
  })
})
