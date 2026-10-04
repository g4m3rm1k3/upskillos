// The desktop app's CodeLens Python environment (desktop/app/runtimes/codelens-python.cjs):
// a .venv made from the learner's Python, where the packages a traced program imports are
// installed. Used to trace Python on the desktop (pythonExecutionClient.ts) and by the
// Packages menu (PackagesDialog.tsx). On the hosted site there is none: every call
// resolves to null.

export interface CodeLensPythonStatus {
  /** CodeLens can trace with it: it exists, or can be made from the learner's Python. */
  installed: boolean
  created: boolean
  base: { exe: string; version: string } | null
  path: string | null
}

export interface EnvRun {
  code: number | null
  stdout: string
  stderr: string
  /** Messages for the learner, such as imports that weren't installed automatically. */
  notices: string[]
}

export interface EnvRunHandle {
  promise: Promise<EnvRun | null>
  stop: () => void
}

const RUNTIME = 'codelens-python'

function desktopApi(): any {
  return typeof window !== 'undefined' ? (window as any).openCalcDesktop : undefined
}

export async function codelensPythonStatus(): Promise<CodeLensPythonStatus | null> {
  const api = desktopApi()
  if (!api?.getRuntimeStatus || !api?.runCode) return null
  try {
    const res = await api.getRuntimeStatus(RUNTIME)
    return res?.ok && res.status?.installed ? res.status : null
  } catch {
    return null
  }
}

export type EnvRequest =
  | { action: 'trace'; script: string; source: string }
  | { action: 'list' }
  | { action: 'install'; requirement: string }
  | { action: 'uninstall'; name: string }

/** Runs one request in the environment; `onProgress` gets lines such as "Installing pygame-ce…". */
export function runInCodeLensPython(request: EnvRequest, onProgress?: (line: string) => void): EnvRunHandle {
  const api = desktopApi()
  let runId: string | null = null
  let stopped = false
  const promise = (async (): Promise<EnvRun | null> => {
    if (!api?.runCode || !api?.onScriptOutput) return null
    // Output arrives as events keyed by runId, which is only known once runCode returns,
    // so collect everything and filter afterwards.
    const events: any[] = []
    let notify = () => {}
    const unsubscribe = api.onScriptOutput((event: any) => {
      events.push(event)
      if (event.runId === runId && event.stream === 'progress') onProgress?.(event.text)
      notify()
    })
    try {
      const res = await api.runCode(RUNTIME, JSON.stringify(request))
      if (!res?.ok) return { code: 1, stdout: '', stderr: res?.reason ?? 'Could not start Python', notices: [] }
      runId = res.runId
      if (stopped) api.stopRun?.(runId)
      events.filter(e => e.runId === runId && e.stream === 'progress').forEach(e => onProgress?.(e.text))
      const mine = () => events.filter(e => e.runId === runId)
      await new Promise<void>(resolve => {
        notify = () => { if (mine().some(e => e.stream === 'exit')) resolve() }
        notify()
      })
      const text = (stream: string) => mine().filter(e => e.stream === stream).map(e => e.text).join('').replace(/\r\n/g, '\n')
      return {
        code: mine().find(e => e.stream === 'exit')?.code ?? null,
        stdout: text('stdout'),
        stderr: text('stderr'),
        notices: mine().filter(e => e.stream === 'notice').map(e => e.text),
      }
    } finally {
      unsubscribe?.()
    }
  })()
  return {
    promise,
    stop: () => { stopped = true; if (runId) api?.stopRun?.(runId) },
  }
}
