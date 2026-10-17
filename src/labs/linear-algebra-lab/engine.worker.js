import { evaluateRun } from './execution.js'

self.onmessage = ({ data }) => {
  try {
    self.postMessage(evaluateRun(data))
  } catch (error) {
    self.postMessage({ error: error?.message || String(error) })
  }
}
