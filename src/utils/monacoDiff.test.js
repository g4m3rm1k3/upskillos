import { describe, it, expect } from 'vitest'
import { parseDiffLang, classifyDiffLine } from './monacoDiff.js'

describe('parseDiffLang', () => {
  it('plain diff is plaintext', () => {
    expect(parseDiffLang('diff')).toEqual({ isDiff: true, baseLang: '', monacoLang: 'plaintext' })
  })
  it('diff-<lang> keeps the language, through aliases', () => {
    expect(parseDiffLang('diff-py', { py: 'python' })).toMatchObject({ isDiff: true, monacoLang: 'python' })
    expect(parseDiffLang('diff_csharp')).toMatchObject({ isDiff: true, monacoLang: 'csharp' })
  })
  it('other languages pass through', () => {
    expect(parseDiffLang('py', { py: 'python' })).toMatchObject({ isDiff: false, monacoLang: 'python' })
  })
})

describe('classifyDiffLine', () => {
  it('colours +, -, @@ and leaves file headers and context alone', () => {
    expect(classifyDiffLine('+ added')).toBe('add')
    expect(classifyDiffLine('- removed')).toBe('del')
    expect(classifyDiffLine('@@ -1,3 +1,4 @@')).toBe('hunk')
    expect(classifyDiffLine('+++ b/ui.py')).toBe(null)
    expect(classifyDiffLine('--- a/ui.py')).toBe(null)
    expect(classifyDiffLine('  context')).toBe(null)
  })
})
