// Run with: npx vitest run desktop/app/runtimes/neovim.test.mjs
import { createRequire } from 'node:module'
import { describe, it, expect } from 'vitest'

const { EXPRS } = createRequire(import.meta.url)('./neovim.cjs')

describe('Neovim control expressions', () => {
  it('quotes a file name so Vim script reads it back unchanged', () => {
    expect(EXPRS.open("/proj/it's b.txt")).toBe("execute('drop ' . fnameescape('/proj/it''s b.txt'))")
    expect(EXPRS.open('C:\\proj\\main.cpp')).toBe("execute('drop ' . fnameescape('C:\\proj\\main.cpp'))")
  })

  it('writes and reloads without leaving a message to press Enter past', () => {
    expect(EXPRS.writeAll()).toBe("execute('silent! wall')")
    expect(EXPRS.checktime()).toBe("execute('silent! checktime')")
  })
})
