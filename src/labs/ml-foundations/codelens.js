// "Open in CodeLens": the learner's program (toolbox + their code) with one print of the call
// in the Run box at the bottom, stepped line by line in the CodeLens lab, which reads
// `codelens-handoff` once and offers "Back to the ML Foundations lab" (codelens_return_path).
export function traceProgram(code, call) {
  const body = code.replace(/\s+$/, '')
  return call?.trim() ? `${body}\n\n\nprint(${call.trim()})\n` : `${body}\n`
}

export function handOffToCodeLens(code, call, { storage = globalThis.localStorage, session = globalThis.sessionStorage } = {}) {
  storage.setItem('codelens-handoff', JSON.stringify({ code: traceProgram(code, call), lang: 'py', ts: Date.now() }))
  session.setItem('codelens_return_path', '#/lab/ml-foundations')
  session.setItem('codelens_return_label', 'Back to the ML Foundations lab')
}
