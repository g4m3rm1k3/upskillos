import { useRef, useState } from 'react'
import { downloadDriver, readCheckpoint } from './checkpoints.js'
import { ALGORITHMS, VIEWS } from './Training.jsx'
export default function Library({ drivers, onSave, onRemove }) {
  const input = useRef(null), [message, setMessage] = useState(''), [undo, setUndo] = useState(null)
  const load = async event => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Checkpoint exceeds the 5 MB limit.')
      const driver = readCheckpoint(await file.text()), error = onSave(driver)
      if (error) throw new Error(error)
      setMessage(`Imported ${driver.name}. Select it in a race seat or evaluate it.`)
    } catch (e) { setMessage(`Could not import driver: ${e.message}`) }
  }
  return <section className="qm-fig kl-save"><h2>Your checkpoint library</h2><p className="qm-hint">Saved on this device. Export a driver to back it up or move it to another device. Imported files must use this circuit’s observation and action format.</p>
    <input ref={input} type="file" accept=".json,application/json" aria-label="Import driver file" hidden onChange={load} /><button onClick={() => input.current?.click()}>Import driver JSON</button>
    {message && <p role="status">{message}</p>}
    {drivers.length === 0 && <p>No custom checkpoints yet. Train and save a driver above.</p>}
    {drivers.map(d => <div className="kl-library-row" key={d.id}><div><b>{d.name}</b><p className="qm-hint">{ALGORITHMS[d.checkpoint.config.method]} · {VIEWS[d.checkpoint.config.view] ?? 'sensors'} · {d.checkpoint.episodes.toLocaleString()} laps · seed {d.checkpoint.config.seed}</p></div><div className="qm-buttons"><button onClick={() => downloadDriver(d)}>Export {d.name}</button><button onClick={() => { setUndo(d); onRemove(d.id); setMessage(`Removed ${d.name}. You can undo this removal below.`) }}>Remove {d.name}</button></div></div>)}
    {undo && <button onClick={() => { const error = onSave(undo); if (error) setMessage(error); else { setMessage(`Restored ${undo.name}.`); setUndo(null) } }}>Undo removal of {undo.name}</button>}
  </section>
}
