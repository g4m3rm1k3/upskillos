import type { ExecutionResult } from './types'

/** Output is part of the current state, not a preview of the finished program. */
export function outputAtStep(execution: ExecutionResult | null, step: number): string[] {
  if (!execution || step < 0 || !execution.events.length) return execution?.events.length === 0 ? execution.output : []
  const index = Math.min(step, execution.events.length - 1)
  const count = execution.events[index]?.outputCount
  if (Number.isInteger(count) && count >= 0) return execution.output.slice(0, count)
  if (index === execution.events.length - 1) return execution.output
  // Python/native tracers attach new text (including partial lines) to events.
  let text = ''
  for (let i = 0; i <= index; i++) {
    const printed = execution.events[i].printed
    if (typeof printed === 'string') text += printed
  }
  if (text) {
    const lines = text.replace(/\r\n/g, '\n').split('\n')
    if (lines.at(-1) === '') lines.pop()
    return lines
  }
  // Older tracers without timed output can only safely reveal it at the end.
  return index === execution.events.length - 1 ? execution.output : []
}
