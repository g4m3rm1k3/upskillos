import { pack, unpack } from './engine/learning.js'
export function readCheckpoint(text) {
  if (text.length > 5 * 1024 * 1024) throw new Error('Checkpoint exceeds the 5 MB limit.')
  const data = JSON.parse(text)
  if (data.format !== 'kartlab-driver-v1' || typeof data.name !== 'string' || !data.name.trim()) throw new Error('Choose a KartLab driver JSON file.')
  // Repack validated tables, excluding arbitrary extra fields from imported files.
  const model = unpack(data.checkpoint)
  return { name: data.name.trim().slice(0, 40), checkpoint: pack(model) }
}
export function exportCheckpoint(driver) {
  return JSON.stringify({ format: 'kartlab-driver-v1', name: driver.name, checkpoint: driver.checkpoint })
}
export function downloadDriver(driver) {
  const blob = new Blob([exportCheckpoint(driver)], { type: 'application/json' })
  const url = URL.createObjectURL(blob), a = document.createElement('a')
  a.href = url; a.download = `${driver.name.replace(/[^a-z0-9_-]/gi, '-').slice(0, 60) || 'driver'}.kartlab.json`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
