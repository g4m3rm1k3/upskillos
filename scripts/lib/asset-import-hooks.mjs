// Node module hooks for scripts that import lesson files outside Vite.
//
// Lessons import diagrams the Vite way (`import url from '../diagrams/x.svg?url'`). Plain Node
// cannot load those, so every such lesson used to fail to import. These hooks turn any image
// import into a module whose default export is the file's URL, which is all a script needs.
//
// Register before importing lessons:
//   import { register } from 'node:module'
//   register('./lib/asset-import-hooks.mjs', import.meta.url)
const ASSET = /\.(svg|png|jpe?g|gif|webp)(\?.*)?$/i

export async function resolve(specifier, context, next) {
  if (ASSET.test(specifier)) {
    const url = new URL(specifier.replace(/\?.*$/, ''), context.parentURL).href
    return { url: `${url}?asset-stub`, shortCircuit: true }
  }
  return next(specifier, context)
}

export async function load(url, context, next) {
  if (url.endsWith('?asset-stub')) {
    return { format: 'module', source: `export default ${JSON.stringify(url.replace(/\?asset-stub$/, ''))}`, shortCircuit: true }
  }
  return next(url, context)
}
