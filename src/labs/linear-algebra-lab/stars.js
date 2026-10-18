// In this lab a single `*` in prose is multiplication (X*beta, D'*D), never emphasis: italics are
// written _like this_ and bold **like this**. Markdown would pair two such stars into italics, so
// escape every single star outside code spans and maths before rendering.
const PROTECTED = /(`[^`]*`|\$\$[\s\S]*?\$\$|\$[^$]*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/
export function starsAsTimes(text) {
  if (typeof text !== 'string' || !text.includes('*')) return text
  return text.split(PROTECTED).map((part, i) => i % 2 ? part : part.replace(/(?<![*\\])\*(?!\*)/g, '\\*')).join('')
}
