// The lab's modules, bundled strictly the way a browser will see them. Vitest's transform let a
// duplicated import through (the browser refused it and the lab showed "Lab not found"); esbuild
// rejects it, so this test catches that kind of mistake.
import { expect, it } from 'vitest'
import { build } from 'esbuild'
import path from 'node:path'

it('bundles without errors', async () => {
  const result = await build({
    entryPoints: [path.join(import.meta.dirname, 'index.jsx')], bundle: true, write: false, logLevel: 'silent',
    loader: { '.js': 'jsx' }, jsx: 'automatic',
    external: ['react', 'react-dom', 'react/*', 'react-markdown', 'remark-*', 'rehype-*', 'katex*', 'fflate', '*.css', '*?raw'],
  })
  expect(result.errors).toEqual([])
}, 60000)
