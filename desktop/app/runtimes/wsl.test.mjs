// Run with: npx vitest run desktop/app/runtimes/wsl.test.mjs
import { createRequire } from 'node:module'
import { describe, it, expect } from 'vitest'

const { parseList, decode } = createRequire(import.meta.url)('./wsl.cjs')

const LIST = '  NAME      STATE           VERSION\r\n* Ubuntu    Stopped         2\r\n  Debian    Running         2\r\n  Legacy    Stopped         1\r\n'

describe('WSL distro list', () => {
  it('reads name, state, version and the default', () => {
    expect(parseList(LIST)).toEqual([
      { name: 'Ubuntu', state: 'Stopped', version: 2, isDefault: true },
      { name: 'Debian', state: 'Running', version: 2, isDefault: false },
      { name: 'Legacy', state: 'Stopped', version: 1, isDefault: false },
    ])
  })

  it('decodes the UTF-16 wsl.exe writes, and plain UTF-8', () => {
    expect(parseList(decode(Buffer.from(LIST, 'utf16le')))).toHaveLength(3)
    expect(parseList(decode(Buffer.from(LIST, 'utf8')))).toHaveLength(3)
  })

  it('finds no distros in a message instead of a list', () => {
    const msg = 'Windows Subsystem for Linux has no installed distributions.\r\nYou can resolve this by installing a distribution with the instructions below:\r\n'
    expect(parseList(decode(Buffer.from(msg, 'utf16le')))).toEqual([])
  })
})
