import { useRef, useState } from 'react'
import type { MathOSState } from '../hooks/useMathOSState'
import { captureProject, parseProject, REGRESSION_EXAMPLE } from '../project'
import { useOpenLab } from '../../../components/desktop/useOpenLab'

export default function ProjectControls({ s, onClose, onWorkspace }: { s: MathOSState; onClose: () => void; onWorkspace: () => void }) {
  const [message, setMessage] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLDetailsElement>(null)
  const openLab = useOpenLab()
  const showWorkspace = () => { onWorkspace(); if (panel.current) panel.current.open = false }
  const source = () => JSON.stringify(captureProject(s), null, 2)
  async function perform(action: () => void | Promise<void>) {
    try { await action() } catch (error) { setMessage(error instanceof Error ? error.message : String(error)) }
  }
  function restore(raw: string) {
    const project = parseProject(raw)
    if (!window.confirm('Replace current variables, formulas, programs, saved scripts, matrices, dataset, statistics data and graph settings with this project? Code will not run automatically.')) return
    s.importProject(project); onWorkspace(); setMessage('Project imported. Programs are ready to inspect and run.')
  }
  const button = 'text-xs px-3 py-2 rounded-lg border border-slate-400/30 hover:bg-slate-400/10'
  return <details ref={panel} className="border-b border-slate-400/20 px-3 py-2 shrink-0 max-h-[40vh] overflow-y-auto">
    <summary className="text-xs font-semibold cursor-pointer">Projects, programming & machine learning</summary>
    <div className="flex flex-wrap gap-2 mt-2">
      <button className={button} onClick={() => perform(() => {
        const url = URL.createObjectURL(new Blob([source()], { type: 'application/json' }))
        const link = document.createElement('a'); link.href = url; link.download = 'mathos-project.json'; link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Project exported.')
      })}>Export project</button>
      <button className={button} onClick={() => input.current?.click()}>Import project</button>
      <input ref={input} className="hidden" aria-label="Import MathOS project" type="file" accept=".json,application/json" onChange={event => {
        const file = event.target.files?.[0]; event.target.value = ''
        if (file) void perform(async () => { if (file.size > 5_000_000) throw new Error('Project is too large (maximum 5 MB).'); restore(await file.text()) })
      }} />
      <button className={button} onClick={() => perform(async () => { await navigator.clipboard.writeText(source()); setMessage('Project copied as JSON.') })}>Copy project</button>
      <button className={button} onClick={() => perform(async () => restore(await navigator.clipboard.readText()))}>Paste project</button>
      <button className={button} onClick={() => { s.setSection('script'); showWorkspace() }}>Write a program</button>
      <button className={button} onClick={() => {
        if (!window.confirm('Replace the current JavaScript draft with an editable linear regression example? Export your project first to keep the draft.')) return
        s.setScript(REGRESSION_EXAMPLE); s.setScriptLang('js'); s.setScriptOutput(''); s.setSection('script'); showWorkspace()
      }}>Load ML example</button>
      <button className={button} onClick={() => perform(async () => { await openLab('ml-lab'); onClose() })}>Machine Learning Lab</button>
      <button className={button} onClick={() => perform(async () => { await openLab('notebook-lab'); onClose() })}>Python notebooks</button>
    </div>
    <p className="text-xs text-slate-500 mt-2">Project JSON includes programs, variables, formulas, matrices, the shared dataset, statistics input and graph settings. History, output, fitted models, animation and inspector objects are not included. Clipboard access requires browser permission; files work as an alternative.</p>
    {message && <p role="status" className="text-xs mt-2">{message}</p>}
  </details>
}
