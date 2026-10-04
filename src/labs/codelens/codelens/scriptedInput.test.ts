import { describe, expect, it } from 'vitest'
import { parseScriptedInput, stdinText } from './scriptedInput'

describe('parseScriptedInput', () => {
  it('reads plain lines as standard input, keeping blank lines but not the final newline', () => {
    const input = parseScriptedInput('Ada\n\n42\n')
    expect(input.stdin).toEqual(['Ada', '', '42'])
    expect(stdinText(input)).toBe('Ada\n\n42\n')
    expect(input.errors).toEqual([])
  })

  it('treats @@ as a literal @ and skips @# comments', () => {
    expect(parseScriptedInput('@@home\r\n@# a note\nend').stdin).toEqual(['@home', 'end'])
  })

  it('turns a tap into a press and a release on the next frame', () => {
    const { events } = parseScriptedInput('@frame 3 key Right')
    expect(events.map(e => [e.frame, e.type, e.key])).toEqual([[3, 'keydown', 'right'], [4, 'keyup', 'right']])
  })

  it('orders events by frame, keeping the written order within a frame', () => {
    const { events } = parseScriptedInput('@frame 9 quit\n@frame 2 click 10 20 right\n@frame 2 move 5 6')
    expect(events.map(e => [e.frame, e.type, e.button ?? null])).toEqual([
      [2, 'mousedown', 3], [2, 'mouseup', 3], [2, 'mousemotion', null], [9, 'quit', null],
    ])
    expect(events[0].pos).toEqual([10, 20])
  })

  it('reports a line it cannot read, with its line number', () => {
    const { errors, events } = parseScriptedInput('ok\n@frame x quit\n@frame 1 jump\n@frame 2 click 5')
    expect(events).toEqual([])
    expect(errors.map(e => e.line)).toEqual([2, 3, 4])
    expect(errors[1].message).toContain('Unknown event "jump"')
  })
})
