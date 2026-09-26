// Shared safety rules for the local file-editing API (/api/dev-fs), used by both the Vite dev
// server (vite.config.js) and the optional backend (backend/server.mjs).
//
// 1. Paths: only files inside the allowed folders, compared by path segments. A bare
//    `absPath.startsWith(root)` also accepted sibling folders whose names start with the
//    root's name ("open-calc-old"), and allowed writes anywhere in the repository.
// 2. Callers: only this machine's pages and the desktop app. While a dev server runs, any
//    website open in the browser can send requests to localhost; a "simple" POST reaches the
//    handler even when the browser would hide the response, so a cross-site page could
//    otherwise overwrite files (for example a package.json script).
import path from 'node:path'

export const DEV_FS_ROOTS = ['src', 'public']
const BLOCKED_SEGMENTS = new Set(['.git', 'node_modules'])

// The absolute path for `relPath` if it lies inside one of `roots` under `root`, else null.
export function resolveAllowedPath(root, relPath, roots = DEV_FS_ROOTS) {
  if (typeof relPath !== 'string' || relPath.includes('\0')) return null
  const abs = path.resolve(root, relPath || '.')
  const inside = roots.some(r => {
    const base = path.resolve(root, r)
    return abs === base || abs.startsWith(base + path.sep)
  })
  if (!inside) return null
  const segments = path.relative(root, abs).split(path.sep)
  if (segments.some(s => BLOCKED_SEGMENTS.has(s) || s.startsWith('.env'))) return null
  return abs
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

// True when the request comes from a page that must not use the API: another website, or a
// sandboxed/opaque page (Origin "null"). Same-origin GETs may omit Origin; browsers always send
// it on POST, and mark cross-site requests with Sec-Fetch-Site.
export function isUntrustedCaller(headers) {
  const origin = headers.origin
  if (origin) {
    if (origin === 'null') return true
    try {
      const url = new URL(origin)
      if (url.protocol === 'opencalc:') return false            // the packaged desktop app
      return !(['http:', 'https:'].includes(url.protocol) && LOCAL_HOSTS.has(url.hostname))
    } catch {
      return true
    }
  }
  return headers['sec-fetch-site'] === 'cross-site'
}
