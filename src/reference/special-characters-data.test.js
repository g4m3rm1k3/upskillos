// The Special Characters reference checked against what it claims: every character is one
// code point with a generated name (so the tables are current), every LaTeX command really
// draws that character, and the facts the "how to type" notes quote match the tables.
import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { SECTIONS, HOW_TO_TYPE } from './special-characters-data.js'
import { NAMES, WINDOWS_1252, CP437, MAC_KEYS } from './special-characters-tables.js'

const ALL = SECTIONS.flatMap(s => s.chars.map(c => ({ ...c, section: s.id })))

describe('special characters', () => {
  it('has unique sections, and no character twice in one section', () => {
    expect(new Set(SECTIONS.map(s => s.id)).size).toBe(SECTIONS.length)
    for (const s of SECTIONS) expect(s.chars.length, s.id).toBe(new Set(s.chars.map(c => c.char)).size)
  })

  it('has exactly one code point per entry, each with a generated Unicode name', () => {
    for (const c of ALL) {
      expect([...c.char].length, c.char).toBe(1)
      expect(NAMES[c.char], `${c.char}: run python3 scripts/build_special_characters.py`).toBeTruthy()
    }
  })

  it('gives a name to show for every entry, and a label for every invisible one', () => {
    for (const c of ALL) {
      expect(c.short ?? NAMES[c.char]).toBeTruthy()
      if (/\s|[\u200B-\u200D\u2060\u00AD\uFEFF]/u.test(c.char)) expect(c.shown, NAMES[c.char]).toBeTruthy()
    }
  })

  // The rendered page and its MathML both count: KaTeX draws a few symbols (≠, ∉, ≔, ©) from
  // overlaid pieces, and its MathML names the character they stand for.
  // \Vert is the standard command for norm bars ‖, but KaTeX encodes it as the look-alike ∥.
  const LOOK_ALIKE = { '\\Vert': '∥' }

  it('has LaTeX that draws exactly the character', () => {
    const wrong = []
    for (const c of ALL.filter(x => x.latex)) {
      const html = katex.renderToString(c.latex, { throwOnError: true })
      const styled = /^\\math(bb|cal)\{([A-Z])\}$/.exec(c.latex)
      // KaTeX draws \mathbb{E} as an E in a double-struck font: check the name says so.
      const ok = styled
        ? new RegExp(`${styled[1] === 'bb' ? 'DOUBLE-STRUCK' : 'SCRIPT'} CAPITAL ${styled[2]}$`).test(NAMES[c.char])
        : html.includes(LOOK_ALIKE[c.latex] ?? c.char)
      if (!ok) wrong.push(`${c.latex} should draw ${c.char} (${NAMES[c.char]})`)
    }
    expect(wrong).toEqual([])
  })

  it('quotes Alt codes, Mac keys and examples that match the tables', () => {
    expect(WINDOWS_1252[176]).toBe('°')
    expect(CP437[248]).toBe('°')
    expect(CP437[225]).toBe('ß')
    expect(WINDOWS_1252[225]).toBe('á')
    expect(MAC_KEYS['∑']).toBe('⌥W')
    expect(MAC_KEYS['µ']).toBe('⌥M')
    expect(MAC_KEYS['∆']).toBe('⌥J')
    expect(String.fromCodePoint(0x2211)).toBe('∑')
    const text = HOW_TO_TYPE.flatMap(h => h.steps).join(' ')
    expect(text).toContain('Alt+0176 °')
    expect(text).toContain('Alt+248 °')
  })
})
