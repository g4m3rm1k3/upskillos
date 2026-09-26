// Put a prepared script into OpenMAT (the app's MATLAB-style tool) without touching the learner's own
// work. OpenMAT keeps its open scripts in localStorage as JSON under `openmat-documents` (a list of
// { id, name, code }) and the selected one under `openmat-active-document-id`, reading both when it
// loads (src/labs/openmat/OpenMatStudio.jsx). Returns { ok, message }.
const DOCS = 'openmat-documents', ACTIVE = 'openmat-active-document-id', LEGACY = 'openmat-code'

export function saveOpenMatDocument(name, code) {
  try {
    let docs = JSON.parse(localStorage.getItem(DOCS) ?? 'null')
    if (!Array.isArray(docs)) {
      // OpenMAT has never saved a document list: it would otherwise open its older single-script
      // storage. Keep that script as a document of its own so it is not lost.
      const legacy = JSON.parse(localStorage.getItem(LEGACY) ?? 'null')
      docs = typeof legacy === 'string' && legacy.trim() ? [{ id: `doc-${Date.now()}-legacy`, name: 'untitled.m', code: legacy }] : []
    }
    const same = docs.find(d => d?.name === name && d?.code === code)
    let doc = same, message
    if (same) message = `${name} is already in OpenMAT; opening it.`
    else {
      const taken = new Set(docs.map(d => d?.name))
      let final = name
      for (let k = 2; taken.has(final); k++) final = name.replace(/\.m$/, '') + ` (${k}).m`
      doc = { id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: final, code }
      docs = [...docs, doc]
      message = final === name ? `Added ${name} to OpenMAT.` : `You already have an edited ${name} in OpenMAT, so it is kept and this copy is ${final}.`
    }
    localStorage.setItem(DOCS, JSON.stringify(docs))
    localStorage.setItem(ACTIVE, JSON.stringify(doc.id))
    return { ok: true, message }
  } catch {
    return { ok: false, message: 'This browser would not let the lesson save a script for OpenMAT (storage is full or blocked). Copy the script from the lesson instead.' }
  }
}
