// CodeLens's Python environment on the desktop (desktop/app/runtimes/codelens-python.cjs),
// run for real: it makes a .venv from this machine's Python and installs from PyPI, so the
// first run needs the network and takes a minute. Skipped without Python (as on CI).
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { desktopScript, parseDesktopResult } from './pythonExecutionClient'
import { parseScriptedInput } from '../scriptedInput'

const require = createRequire(import.meta.url)
const python = ['python', 'python3'].find(cmd => spawnSync(cmd, ['--version']).status === 0)
const runtime = python ? require('../../../../../desktop/app/runtimes/codelens-python.cjs') : null
const app = { getPath: () => path.join(os.tmpdir(), 'opencalc-codelens-env-test') }

interface Collected { code: number | null; stdout: string; stderr: string; progress: string[]; notices: string[] }

function request(payload: object): Promise<Collected> {
  return new Promise((resolve, reject) => {
    const out: Collected = { code: null, stdout: '', stderr: '', progress: [], notices: [] }
    runtime.runCode(app, JSON.stringify(payload), (event: any) => {
      if (event.stream === 'stdout') out.stdout += event.text
      if (event.stream === 'stderr') out.stderr += event.text
      if (event.stream === 'progress') out.progress.push(event.text)
      if (event.stream === 'notice') out.notices.push(event.text)
      if (event.stream === 'exit') { out.code = event.code; resolve(out) }
    }).then((res: any) => { if (!res.ok) reject(new Error(res.reason)) })
  })
}

const GAME = 'import pygame\npygame.init()\nscreen = pygame.display.set_mode((40, 30))\nfor frame in range(3):\n    for event in pygame.event.get():\n        print(event.type == pygame.KEYDOWN)\n    pygame.display.flip()\n'

describe.skipIf(!runtime)('CodeLens Python environment (desktop)', () => {
  it('installs pygame-ce the first time a program imports pygame, then traces it', async () => {
    const run = await request({ action: 'trace', script: desktopScript(GAME, parseScriptedInput('@frame 1 keydown space\n')), source: GAME })
    const result = parseDesktopResult(run.stdout.replace(/\r\n/g, '\n'))
    expect(result?.error ?? null, run.stderr).toBeNull()
    // The KEYDOWN on frame 1, then the automatic QUIT one frame after the last scripted event.
    expect(result?.output).toEqual(['True', 'False'])
    expect(result?.frames?.length).toBeGreaterThan(0)
    const listed = JSON.parse((await request({ action: 'list' })).stdout) as { name: string }[]
    expect(listed.map(p => p.name)).toContain('pygame-ce')
  }, 600_000)

  it('leaves an import it does not know to Python, with a note', async () => {
    const source = 'import surely_not_a_real_module_xyz\n'
    const run = await request({ action: 'trace', script: desktopScript(source), source })
    const result = parseDesktopResult(run.stdout.replace(/\r\n/g, '\n'))
    expect(result?.error?.type).toBe('ModuleNotFoundError')
    expect(run.notices.join(' ')).toContain('surely_not_a_real_module_xyz')
    expect(run.progress.join(' ')).not.toContain('Installing')
  }, 120_000)

  it('installs a chosen version, and refuses anything that is not a package name', async () => {
    const pinned = await request({ action: 'install', requirement: 'tabulate==0.9.0' })
    expect(pinned.code, pinned.stderr).toBe(0)
    const listed = JSON.parse((await request({ action: 'list' })).stdout) as { name: string; version: string }[]
    expect(listed.find(p => p.name === 'tabulate')?.version).toBe('0.9.0')
    expect((await request({ action: 'uninstall', name: 'tabulate' })).code).toBe(0)

    for (const bad of ['--index-url http://evil.example pygame', 'https://example.com/x.whl', '../local', 'a; rm -rf /']) {
      const refused = await request({ action: 'install', requirement: bad })
      expect(refused.code, bad).toBe(1)
      expect(refused.stderr).toContain("isn't a package name")
    }
  }, 600_000)
})
