// CodeLens for compiled languages, desktop app only (desktop/app/runtimes/codelens.cjs):
//   C and C++ are compiled with debug information and stepped through under the learner's
//     own GDB (codelens/gdb_tracer.py);
//   C# is rewritten to report each step and compiled with the learner's own .NET SDK
//     (codelens/csharp/).
// The trace comes back in the same shape as the JavaScript interpreter's and the Python
// tracer's, so every CodeLens view works.
import type { ExecutionResult } from '../types'
import { annotateOutcomes } from '../traceOutcomes'

export type NativeLang = 'c' | 'cpp' | 'cs'

// The desktop side's names for them.
const DESKTOP_LANG: Record<NativeLang, string> = { c: 'c', cpp: 'cpp', cs: 'csharp' }

export interface NativeLanguage { compiler: string; version: string }

export interface NativeToolchains {
  debugger: string | null                             // e.g. "GDB 17.2"; null without GDB (C# only)
  languages: Partial<Record<NativeLang, NativeLanguage>>
}

export interface NativeExecutionHandle {
  promise: Promise<ExecutionResult>
  stop: () => void
  host: Promise<string>
}

function desktopApi(): any {
  return typeof window !== 'undefined' ? (window as any).openCalcDesktop : undefined
}

/** Which compiled languages CodeLens can trace here; null on the hosted site or without GDB. */
export async function nativeToolchains(): Promise<NativeToolchains | null> {
  const api = desktopApi()
  if (!api?.getRuntimeStatus || !api?.runCode) return null
  try {
    const res = await api.getRuntimeStatus('codelens')
    const status = res?.ok ? res.status : null
    if (!status?.installed) return null
    const languages: NativeToolchains['languages'] = {}
    for (const lang of Object.keys(DESKTOP_LANG) as NativeLang[]) {
      const found = status.languages?.[DESKTOP_LANG[lang]]
      if (found) languages[lang] = found
    }
    return { debugger: status.version, languages }
  } catch {
    return null
  }
}

function shortVersion(compilerVersion: string, fallback: string): string {
  const tool = compilerVersion.split(/\s/)[0]?.replace(/\.exe$/i, '') || fallback
  const number = compilerVersion.match(/(\d+\.\d+(?:\.\d+)?)\s*$/)?.[1]
  return number ? `${tool} ${number}` : tool
}

// The desktop side has its own hard limit (it kills GDB at 25 s); this only guards against
// the desktop app itself not answering.
const CLIENT_TIMEOUT_MS = 60_000

/** stdin: the Input box's standard input as text (scriptedInput.ts stdinText). */
export function startNativeExecution(lang: NativeLang, source: string, stdin = ''): NativeExecutionHandle {
  const api = desktopApi()
  let settled = false
  let runId: string | null = null
  let unsubscribe: () => void = () => {}
  let resolvePromise: (result: ExecutionResult) => void = () => {}
  let resolveHost: (host: string) => void = () => {}
  const promise = new Promise<ExecutionResult>(resolve => { resolvePromise = resolve })
  const host = new Promise<string>(resolve => { resolveHost = resolve })

  const finish = (result: ExecutionResult) => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    unsubscribe()
    resolvePromise(result)
  }
  const failed = (message: string): ExecutionResult => ({ events: [], output: [], status: 'runtime-error', error: { type: 'DesktopError', message } })
  const timer = setTimeout(() => finish(failed('The desktop app did not answer.')), CLIENT_TIMEOUT_MS)

  if (!api?.runCode) {
    finish(failed(lang === 'cs' ? 'C# tracing runs in the UpSkillOS desktop app, with the .NET SDK.' : 'C and C++ tracing runs in the UpSkillOS desktop app, with GDB.'))
    return { promise, host, stop: () => {} }
  }

  ;(async () => {
    const toolchains = await nativeToolchains()
    const language = toolchains?.languages[lang]
    if (toolchains && language) {
      resolveHost(lang === 'cs'
        ? `${language.version}, on this computer`
        : `${shortVersion(language.version, lang === 'c' ? 'gcc' : 'g++')} + ${toolchains.debugger}, on this computer`)
    }

    // Output arrives as events keyed by runId, which is only known once runCode returns,
    // so collect everything and filter afterwards.
    const events: any[] = []
    const check = () => {
      if (!runId) return
      const mine = events.filter(e => e.runId === runId)
      if (!mine.some(e => e.stream === 'exit')) return
      const stdout = mine.filter(e => e.stream === 'stdout').map(e => e.text).join('')
      try {
        const result: ExecutionResult = JSON.parse(stdout)
        // What each line did, for the explanations. The C# tracer reports a foreach pass
        // with its variable already set.
        annotateOutcomes(result.events, { loopVariableBoundEarly: lang === 'cs' })
        finish(result)
      } catch {
        const stderr = mine.filter(e => e.stream === 'stderr').map(e => e.text).join('')
        finish(failed(stderr.trim() || 'The tracer returned no result.'))
      }
    }
    unsubscribe = api.onScriptOutput((event: any) => { events.push(event); check() })
    const res = await api.runCode('codelens', JSON.stringify({ lang: DESKTOP_LANG[lang], source, stdin }))
    if (!res?.ok) { finish(failed(res?.reason ?? 'Could not start the tracer.')); return }
    runId = res.runId
    check()
  })().catch(error => finish(failed(error instanceof Error ? error.message : String(error))))

  return {
    promise,
    host,
    // The desktop side reports what it traced before the stop, as status 'stopped'.
    stop: () => { if (runId) api.stopRun?.(runId) },
  }
}
