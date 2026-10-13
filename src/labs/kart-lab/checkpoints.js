import { pack, unpack } from './engine/tabular.js'
export const FORMAT = 'kartlab-driver-v3'
export function readCheckpoint(text) {
  if (text.length > 5 * 1024 * 1024) throw new Error('Checkpoint exceeds the 5 MB limit.')
  const data = JSON.parse(text)
  if (data.format !== FORMAT || typeof data.name !== 'string' || !data.name.trim()) throw new Error('Choose a KartLab driver file (version 3).')
  // Repack the validated model, dropping any extra fields from the imported file.
  const model = unpack(data.checkpoint)
  return { name: data.name.trim().slice(0, 40), checkpoint: pack(model, model.config, data.checkpoint.episodes) }
}
export const exportCheckpoint = driver => JSON.stringify({ format: FORMAT, name: driver.name, checkpoint: driver.checkpoint })
export function downloadDriver(driver) {
  const blob = new Blob([exportCheckpoint(driver)], { type: 'application/json' })
  const url = URL.createObjectURL(blob), a = document.createElement('a')
  a.href = url; a.download = `${driver.name.replace(/[^a-z0-9_-]/gi, '-').slice(0, 60) || 'driver'}.kartlab.json`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
