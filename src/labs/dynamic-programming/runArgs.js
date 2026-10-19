// Run's input box holds solve's arguments as JSON, without the outer brackets: `4, [1, 3]`.
export const argsText = args => args.map(a => JSON.stringify(a)).join(', ')
export function parseArgs(text) {
  try {
    return { value: JSON.parse(`[${text}]`) }
  } catch {
    return { error: 'Write the arguments the way they appear in the examples, separated by commas: numbers, "strings" in double quotes, [lists] in brackets.' }
  }
}
