// "Open in CodeLens": hands the learner's solution to the CodeLens lab, which steps through it line by
// line with every variable and the call stack. CodeLens reads `codelens-handoff` once when it opens and
// offers a way back (codelens_return_path), the same handoff Project Studio and the blog use.
// The file gets one call at the bottom, solve(...) on the input in the Run box, so there is
// something to step through.

// A JSON value written as Python source: true/false/null become True/False/None.
export function pyLiteral(value) {
  if (value === null || value === undefined) return 'None'
  if (value === true) return 'True'
  if (value === false) return 'False'
  if (Array.isArray(value)) return `[${value.map(pyLiteral).join(', ')}]`
  if (typeof value === 'object') return `{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${pyLiteral(v)}`).join(', ')}}`
  return JSON.stringify(value)
}

export function traceProgram(code, language, args) {
  const body = code.replace(/\s+$/, '')
  if (!args) return `${body}\n`
  return language === 'Python'
    ? `${body}\n\n\nprint(solve(${args.map(pyLiteral).join(', ')}))\n`
    : `${body}\n\n\nconsole.log(solve(${args.map(a => JSON.stringify(a)).join(', ')}));\n`
}

export function handOffToCodeLens(code, language, args, { storage = globalThis.localStorage, session = globalThis.sessionStorage } = {}) {
  storage.setItem('codelens-handoff', JSON.stringify({ code: traceProgram(code, language, args), lang: language === 'Python' ? 'py' : 'js', ts: Date.now() }))
  session.setItem('codelens_return_path', '#/lab/dynamic-programming')
  session.setItem('codelens_return_label', 'Back to the DP lab')
}
