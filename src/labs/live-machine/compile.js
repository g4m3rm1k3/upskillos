// compile.js
// The learner's code, JavaScript or TypeScript, turned into plain JavaScript by the real
// TypeScript compiler. Only syntax errors stop it: types are checked by the editor, and
// erased here, exactly as they are in a real build.
let tsPromise = null
const loadTs = () => (tsPromise ??= import('typescript').then(m => m.default ?? m))

export async function compile(source, language = 'javascript') {
  const ts = await loadTs()
  const out = ts.transpileModule(source, {
    fileName: language === 'typescript' ? 'ship.ts' : 'ship.js',
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: false },
  })
  const errors = (out.diagnostics ?? [])
    .filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => {
      const pos = d.file && d.start != null ? d.file.getLineAndCharacterOfPosition(d.start) : null
      return {
        line: pos ? pos.line + 1 : 1,
        column: pos ? pos.character + 1 : 1,
        length: d.length ?? 1,
        message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
      }
    })
  const code = out.outputText.replace(/\n?\/\/# sourceMappingURL=.*$/m, '').replace(/^"use strict";\s*/, '')
  return { ok: errors.length === 0, code, errors }
}
