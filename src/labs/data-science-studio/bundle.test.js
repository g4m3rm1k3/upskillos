// The lab's modules (not the app's window manager, which opens other labs), bundled strictly the way a browser will see them: esbuild rejects mistakes
// (a duplicated import, say) that Vitest's transform lets through.
import { expect, it } from 'vitest'
import { build } from 'esbuild'
import path from 'node:path'

it('bundles without errors', async () => {
  const result = await build({
    entryPoints: [path.join(import.meta.dirname, 'index.jsx')], bundle: true, write: false, logLevel: 'silent',
    loader: { '.js': 'jsx' }, jsx: 'automatic',
    external: ['react', 'react-dom', 'react/*', 'react-markdown', 'remark-*', 'rehype-*', 'katex*', 'fflate', '*.css', '*?raw', '*?url', 'sql.js', '@monaco-editor/*', 'monaco-editor*', '../../components/*', '../../../components/*'],
  })
  expect(result.errors).toEqual([])
}, 60000)
