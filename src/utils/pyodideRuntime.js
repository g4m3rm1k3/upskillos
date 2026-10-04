const PYODIDE_VERSION = '0.29.3'
const CDN_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

let _promise = null

export function getLocalPyodideIndexURL() {
  const base = import.meta.env.BASE_URL || '/'
  if (typeof document !== 'undefined') {
    return new URL(`${base.replace(/^\//, '')}pyodide/`, document.baseURI).href
  }
  if (base.startsWith('/')) {
    return new URL(`${base}pyodide/`, globalThis.location.origin).href
  }
  // Relative-base desktop builds emit workers in assets/, beside pyodide/.
  return new URL('../pyodide/', globalThis.location.href).href
}

export async function createPyodide(options = {}) {
  const localIndexURL = getLocalPyodideIndexURL()
  // The build copies the runtime and the wheels the app uses (numpy, pandas,
  // pygame-ce, ...) into pyodide/, and writes a lockfile there that names them
  // by plain file name and every other package by its full CDN URL
  // (scripts/pyodide-bundle.mjs). Relative names resolve against
  // packageBaseUrl, so it must be the folder the runtime itself came from.
  const loadFrom = async indexURL => {
    const { loadPyodide } = await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`)
    return loadPyodide({ packageBaseUrl: indexURL, ...options, indexURL })
  }
  try {
    return await loadFrom(localIndexURL)
  } catch (localError) {
    try {
      return await loadFrom(CDN_INDEX_URL)
    } catch (cdnError) {
      throw new AggregateError(
        [localError, cdnError],
        'Python could not start from the bundled runtime or its CDN fallback. Reload and try again.',
      )
    }
  }
}

export async function getPyodide() {
  if (!_promise) {
    _promise = createPyodide({ fullStdLib: false })
      .catch(err => { _promise = null; throw err })
  }
  return _promise
}
