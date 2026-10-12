import { expect, it } from 'vitest'
import { build } from 'vite'
import path from 'node:path'

it('builds the production lab, including its worker and lazy 3D scene', async () => {
  const output = await build({
    configFile: false, publicDir: false, logLevel: 'silent',
    esbuild: { jsx: 'automatic' },
    build: {
      write: false, minify: false,
      lib: { entry: path.join(import.meta.dirname, 'index.jsx'), formats: ['es'], fileName: 'kart-lab' },
      rollupOptions: { external: ['react', 'react-dom', 'react/jsx-runtime'] },
    },
  })
  const chunks = (Array.isArray(output) ? output : [output]).flatMap(o => o.output)
  expect(chunks.some(c => c.type === 'chunk' && c.code.includes('Little karts. Learned instincts.'))).toBe(true)
  expect(chunks.some(c => c.type === 'asset' && c.fileName.includes('trainer.worker'))).toBe(true)
  expect(chunks.some(c => c.type === 'chunk' && c.name === 'Scene')).toBe(true)
}, 60000)
