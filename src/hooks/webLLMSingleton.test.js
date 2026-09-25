import { beforeEach, describe, expect, it, vi } from 'vitest'

// A fake WebLLM: records every engine created, unloaded and deleted.
const log = vi.hoisted(() => ({ created: [], unloaded: [], deleted: [] }))
vi.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: vi.fn(async (modelId, { initProgressCallback }) => {
    initProgressCallback?.({ text: `loading ${modelId}`, progress: 1 })
    const engine = { modelId, unload: vi.fn(async () => { log.unloaded.push(modelId) }) }
    log.created.push(modelId)
    return engine
  }),
  deleteModelAllInfoInCache: vi.fn(async modelId => { log.deleted.push(modelId) }),
}))

let mod
beforeEach(async () => {
  vi.resetModules()
  log.created.length = 0; log.unloaded.length = 0; log.deleted.length = 0
  mod = await import('./webLLMSingleton.js')
})

describe('the shared WebLLM engine', () => {
  it('creates one engine for any number of callers asking for the same model, even at once', async () => {
    const [a, b, c] = await Promise.all([mod.getSharedEngine(), mod.getSharedEngine(), mod.getSharedEngine()])
    expect(a).toBe(b); expect(b).toBe(c)
    expect(log.created).toEqual([mod.WEBLLM_MODEL_ID])
  })
  it('unloads the current model before loading another, so only one is ever in memory', async () => {
    await mod.getSharedEngine()
    await mod.getSharedEngine(undefined, 'Other-Model')
    expect(log.unloaded).toEqual([mod.WEBLLM_MODEL_ID])
    expect(log.created).toEqual([mod.WEBLLM_MODEL_ID, 'Other-Model'])
    expect(log.deleted).toEqual([])                       // switching alone never deletes files
  })
  it('forgetModel deletes an abandoned model with WebLLM’s own delete, but never the shared default', async () => {
    await mod.getSharedEngine(undefined, 'Tutor-3B')
    await mod.forgetModel('Tutor-3B')
    await mod.forgetModel(mod.WEBLLM_MODEL_ID)
    expect(log.unloaded).toEqual(['Tutor-3B'])
    expect(log.deleted).toEqual(['Tutor-3B'])
  })
  it('passes progress text and fraction to the caller', async () => {
    const seen = []
    await mod.getSharedEngine((text, fraction) => seen.push([text, fraction]))
    expect(seen).toEqual([[`loading ${mod.WEBLLM_MODEL_ID}`, 1]])
  })
})
