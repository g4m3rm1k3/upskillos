// The WPF & .NET Mastery course, run for real on this machine's .NET SDK (skipped where
// there is none, as on CI): every example builds (console examples also run), every
// challenge's starting code fails its tests, and a reference solution
// (__fixtures__/wpf-mastery-solutions.json) passes them. Goes through the same runner the
// lesson page uses (projectRunner.ts), with the desktop bridge pointed at
// desktop/app/runtimes/dotnet.cjs. WPF challenge tests open real windows for a moment.
//
// Run one lesson: npx vitest run src/engine/lesson/wpfMastery.desktop.test.ts -t "level-28"
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseLesson } from './parser'
import { generatesXunitMain, inspectProject, launchProject, runProjectTests } from './projectRunner'
import solutions from './__fixtures__/wpf-mastery-solutions.json'

const require = createRequire(import.meta.url)
const hasDotnet = (spawnSync('dotnet', ['--list-sdks']).stdout?.toString().trim().length ?? 0) > 0
const runtime = hasDotnet ? require('../../../desktop/app/runtimes/dotnet.cjs') : null
const app = { getPath: () => path.join(os.tmpdir(), 'opencalc-lesson-test') }
const LESSON_DIR = path.join(__dirname, '../../labs/lesson-engine/content/wpf-mastery')

if (runtime) {
  const listeners = new Set<(event: unknown) => void>()
  ;(globalThis as any).window = {
    dispatchEvent: () => true,   // the executor announces where each run happened (RAN_ON_EVENT)
    openCalcDesktop: {
      getRuntimeStatus: async () => ({ ok: true, status: await runtime.getStatus(app) }),
      runCode: async () => ({ ok: false, reason: 'not used' }),
      runProject: (_runtime: string, spec: unknown) => runtime.runProject(app, spec, (event: unknown) => listeners.forEach(l => l(event))),
      onScriptOutput: (listener: (event: unknown) => void) => { listeners.add(listener); return () => listeners.delete(listener) },
      stopRun: (runId: string) => runtime.killRun(runId),
    },
  }
}

// Examples that are meant to fail, to show an error: the step title and an error code the
// build must report.
const EXPECTED_ERRORS: Record<string, Record<string, string>> = {
  'level-1.md': { 'References: How the Compiler Knows an Assembly Exists': 'CS0234' },
}

const lessons = fs.readdirSync(LESSON_DIR).filter(f => f.endsWith('.md'))
  .sort((a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10))

// Runs everywhere (no SDK needed). All the project fences in one step form one project, so
// two examples in one step would become one project with two MainWindow.xaml files, the
// second silently replacing the first: each example needs its own `##` step.
describe('WPF & .NET Mastery lesson structure', () => {
  for (const file of lessons) {
    it(`${file}: no step has two project files with the same path`, () => {
      const lesson = parseLesson(fs.readFileSync(path.join(LESSON_DIR, file), 'utf8'))
      const clashes = lesson.steps.flatMap(step => {
        const paths = step.project?.files.map(f => f.path) ?? []
        return paths.filter((p, i) => paths.indexOf(p) !== i).map(p => `"${step.title}": ${p}`)
      })
      expect(clashes).toEqual([])
    })
  }
})

// WPF builds only on Windows (the runtime refuses elsewhere), so these run on Windows only.
describe.skipIf(!runtime || process.platform !== 'win32')('WPF & .NET Mastery lessons on the real .NET SDK', () => {
  for (const file of lessons) {
    const lesson = parseLesson(fs.readFileSync(path.join(LESSON_DIR, file), 'utf8'))
    for (const step of lesson.steps) {
      const project = step.project
      if (!project) continue
      const id = file.replace('.md', '')

      if (step.challenge && step.tests) {
        const tests = step.tests
        it(`${id}: ${step.title}: the starting code fails its tests`, async () => {
          const { results } = await runProjectTests(project, {}, tests)
          expect(results.some(r => !r.passed), JSON.stringify(results)).toBe(true)
        }, 240_000)
        it(`${id}: ${step.title}: the reference solution passes`, async () => {
          const solution = (solutions as Record<string, Record<string, Record<string, string>>>)[file]?.[step.title]
          expect(solution, `no reference solution for ${file} "${step.title}"`).toBeTruthy()
          const { results, output } = await runProjectTests(project, solution, tests)
          const failed = results.filter(r => !r.passed)
          expect(failed, JSON.stringify({ failed, output: output.lines.slice(0, 20) })).toEqual([])
          expect(results.length).toBeGreaterThan(0)
        }, 240_000)
        continue
      }

      it(`${id}: ${step.title}: the example builds${project.kind === 'console' ? ' and runs' : ''}`, async () => {
        const runs = project.kind === 'console'
          && (project.files.some(f => f.path === 'Program.cs') || generatesXunitMain(project.files.map(f => ({ path: f.path, content: f.code }))))
        const result = runs ? await launchProject(project, {}) : await inspectProject(project, {})
        const errors = result.lines.filter(l => l.kind === 'error').map(l => l.text)
        const expected = EXPECTED_ERRORS[file]?.[step.title]
        if (expected) {
          expect(errors.join('\n')).toContain(expected)
        } else {
          expect(errors, result.lines.map(l => `${l.kind}: ${l.text}`).join('\n')).toEqual([])
        }
      }, 240_000)
    }
  }
})
