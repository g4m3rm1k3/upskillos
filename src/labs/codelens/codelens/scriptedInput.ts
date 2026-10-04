// Scripted input: what a program reads while CodeLens traces it, written before the run.
// A trace is recorded in one go and then stepped through, so nobody can type into the
// program while it runs; instead its input is written out in advance, the same for every
// language and on the web and the desktop alike.
//
// The Input box holds one entry per line:
//
//   Ada                      a line of standard input: what input(), cin >>, getline,
//   42                       scanf, Console.ReadLine or prompt() reads next
//   @@starts with @          a standard-input line that itself starts with "@"
//   @frame 3 key right       a game event (Python's pygame): tap → on frame 3
//   @frame 3 keydown space   hold space down from frame 3...
//   @frame 9 keyup space     ...until frame 9
//   @frame 5 click 120 80    a left click at x=120, y=80 (right click: click 120 80 right)
//   @frame 5 move 200 40     the mouse moves to x=200, y=40
//   @frame 12 quit           the window's close button
//   @# a note                ignored: a comment for the reader
//
// A frame is one picture: frame 0 is everything the program does before it first calls
// pygame.display.flip() (or update()), frame 1 runs until the second, and so on. An event
// for frame N is waiting in the queue when the program calls pygame.event.get() during it.

export type ScriptedEventType = 'keydown' | 'keyup' | 'mousedown' | 'mouseup' | 'mousemotion' | 'quit'

export interface ScriptedEvent {
  frame: number
  type: ScriptedEventType
  /** pygame key name, e.g. "right", "space", "a" (keydown / keyup). */
  key?: string
  pos?: [number, number]
  /** 1 left, 2 middle, 3 right (mousedown / mouseup). */
  button?: number
  /** The Input box line this came from, for messages. */
  line: number
}

export interface ScriptedInput {
  stdin: string[]
  events: ScriptedEvent[]
  errors: { line: number; message: string }[]
}

const BUTTONS: Record<string, number> = { left: 1, middle: 2, right: 3 }

const EVENT_HELP = 'Expected for example "@frame 3 key right", "@frame 5 click 120 80" or "@frame 12 quit".'

export function parseScriptedInput(text: string): ScriptedInput {
  const result: ScriptedInput = { stdin: [], events: [], errors: [] }
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  // A final newline ends the last line; it isn't an extra empty line of input.
  if (lines.length && lines[lines.length - 1] === '') lines.pop()

  lines.forEach((raw, index) => {
    const line = index + 1
    if (!raw.startsWith('@')) { result.stdin.push(raw); return }
    if (raw.startsWith('@@')) { result.stdin.push(raw.slice(1)); return }
    if (raw.startsWith('@#')) return

    const words = raw.slice(1).trim().split(/\s+/)
    const fail = (message: string) => result.errors.push({ line, message })
    if (words[0] !== 'frame' || !/^\d+$/.test(words[1] ?? '')) { fail(EVENT_HELP); return }
    const frame = Number(words[1])
    const [action, ...args] = words.slice(2)
    const numbers = (count: number) => {
      const values = args.slice(0, count).map(Number)
      return values.length === count && values.every(Number.isFinite) ? values : null
    }

    switch (action) {
      case 'key':
      case 'keydown':
      case 'keyup': {
        const key = args[0]?.toLowerCase()
        if (!key) { fail(`Which key? For example "@frame ${frame} ${action} right".`); return }
        if (action !== 'keyup') result.events.push({ frame, type: 'keydown', key, line })
        // A tap is released on the next frame, so a program that checks
        // pygame.key.get_pressed() sees the key held for exactly one frame.
        if (action !== 'keydown') result.events.push({ frame: action === 'key' ? frame + 1 : frame, type: 'keyup', key, line })
        return
      }
      case 'click': {
        const pos = numbers(2)
        const button = BUTTONS[args[2]?.toLowerCase() ?? 'left']
        if (!pos || !button) { fail(`A click needs x and y, then optionally left, middle or right: "@frame ${frame} click 120 80".`); return }
        result.events.push({ frame, type: 'mousedown', pos: [pos[0], pos[1]], button, line })
        result.events.push({ frame, type: 'mouseup', pos: [pos[0], pos[1]], button, line })
        return
      }
      case 'move': {
        const pos = numbers(2)
        if (!pos) { fail(`A move needs x and y: "@frame ${frame} move 200 40".`); return }
        result.events.push({ frame, type: 'mousemotion', pos: [pos[0], pos[1]], line })
        return
      }
      case 'quit':
        result.events.push({ frame, type: 'quit', line })
        return
      default:
        fail(action ? `Unknown event "${action}". ${EVENT_HELP}` : EVENT_HELP)
    }
  })

  // Stable sort: events on the same frame keep the order they were written in.
  result.events.sort((a, b) => a.frame - b.frame)
  return result
}

/** The standard input as the bytes a program reads: each line ended by a newline. */
export function stdinText(input: ScriptedInput): string {
  return input.stdin.map(line => `${line}\n`).join('')
}
