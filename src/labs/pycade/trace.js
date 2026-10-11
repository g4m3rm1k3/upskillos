import tracer from './python/tracer.py?raw'
export function valueAtPath(memory, path) {
  if (!path) return null
  const root = path.split(/[.\[]/)[0]
  let node = memory[root], rest = path.slice(root.length)
  while (node && rest) {
    const index = rest.match(/^\[(\d+)\]/)
    if (index) {
      node = node.items?.[Number(index[1])] ?? (Array.isArray(node.value) ? { type: node.type, value: node.value[Number(index[1])] } : null)
      rest = rest.slice(index[0].length)
    } else {
      const key = Object.keys(node.items || {}).sort((a, b) => b.length - a.length).find(key => rest === `.${key}` || rest.startsWith(`.${key}.`) || rest.startsWith(`.${key}[`))
      if (!key) return null
      node = node.items[key]; rest = rest.slice(key.length + 1)
    }
  }
  return node || null
}
export function framesOf(trace) {
  let memory = {}, origins = {}
  return trace.events.map((event, index) => {
    memory = { ...memory, ...event.changes }
    origins = { ...origins, ...Object.fromEntries(Object.keys(event.changes).map(key => [key, index])) }
    return { ...event, memory, origins }
  })
}
export function lineInfo(line = '') {
  const [code, annotation = ''] = line.split(' # ')
  const [phase, ...words] = annotation.split(' | ')
  return { code, phase: words.length ? phase : 'setup', explanation: words.join(' | ') || 'Read the Python statement and inspect its changes below. This edited line has no teaching annotation.' }
}
export function kernelCode(source) {
  // Put helper imports and execution in their own namespace, not notebook globals.
  return `_pycade_namespace = {"__name__": "pycade_helper"}\nexec(${JSON.stringify(tracer)}, _pycade_namespace)\nprint("PYCADE_TRACE:" + _pycade_namespace["json"].dumps(_pycade_namespace["trace_program"](${JSON.stringify(source)}), allow_nan=False))`
}
export function parseKernelResult(result) {
  if (!result.ok) throw new Error(result.reason || 'Python could not start.')
  const errors = result.messages.filter(m => m.type === 'error').map(m => m.text).join('\n')
  if (errors) throw new Error(errors)
  const output = result.messages.filter(m => m.type === 'stream').map(m => m.text).join('')
  const line = output.split('\n').find(s => s.startsWith('PYCADE_TRACE:'))
  if (!line) throw new Error('Python returned no PyCade trace. Check that the selected interpreter has numpy, gymnasium and torch installed.')
  const trace = JSON.parse(line.slice('PYCADE_TRACE:'.length))
  if (!Array.isArray(trace.events) || !trace.events.length) throw new Error(trace.error || 'No statements were recorded.')
  return trace
}
