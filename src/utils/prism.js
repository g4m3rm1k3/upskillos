// Prism, ready for its language files. Import Prism from here, before any
// 'prismjs/components/prism-…' import, never from 'prismjs' directly.
//
// Prism's core is a CommonJS module and each language file expects a global
// `Prism`. Rolldown (Vite 8) runs a CommonJS module inside the code of the file
// that imports it, after that file's other imports have already run, so a
// language imported beside 'prismjs' ran before the core and failed with
// "Prism is not defined". Importing this ES module first runs the core (and
// sets the global) before any language file, under any bundler.
import Prism from 'prismjs'

globalThis.Prism = Prism

export default Prism
