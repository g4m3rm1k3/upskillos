// Text imported with ?raw gets \n line endings on every machine.
//
//   import source from './python/q_learning.py?raw'
//
// Vite gives the file's bytes as they are on disk, and a Windows checkout (git's
// core.autocrlf) has \r\n line endings. The code reading this text (lesson parsers,
// recordings compared with their source, line-by-line steppers) expects \n, so a
// build made on Windows differed from the Linux one: Data Science on the Web found
// no lessons, and PyCade showed its own example as edited. Here the text is read
// and its line endings made \n before Vite turns it into a module. The lazy raw
// globs (vite-plugin-raw-glob-assets.mjs) do the same for the files they emit.
import { readFileSync } from 'node:fs'

export const toLf = text => text.replace(/\r\n/g, '\n')

export default function rawLf() {
  return {
    name: 'raw-lf',
    enforce: 'pre',
    load(id) {
      const [file, query] = id.split('?')
      if (!query || !query.split('&').includes('raw') || file.startsWith('\0')) return null
      let text
      try { text = readFileSync(file, 'utf8') } catch { return null } // not a file on disk: leave it to Vite
      this.addWatchFile(file)
      return `export default ${JSON.stringify(toLf(text))}`
    },
  }
}
