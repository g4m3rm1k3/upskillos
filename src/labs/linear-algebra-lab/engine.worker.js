import { cloneable, evaluateRun } from './execution.js'

self.onmessage = ({ data }) => {
  try {
    self.postMessage(cloneable(evaluateRun(data)))
  } catch (error) {
    self.postMessage({ error: error?.message || String(error) })
  }
}
