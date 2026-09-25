// src/hooks/webLLMSingleton.js
// Single source of truth for the in-browser WebLLM engine, shared by EVERY in-app AI feature
// (Lovelace, Hippocrates, Studio, Compass, RPG Coach and the tutor panel).
//
// Why one engine: each CreateMLCEngine() allocates GPU memory for a whole model. On a Mac the GPU
// shares RAM with everything else, so two engines at once can push the machine into swap and make
// generation fail. There is exactly one engine, holding exactly one model.
//
// Asking for a different model (the tutor can use another one) unloads the current engine from
// memory first. Cached files are deleted only when a model is abandoned (forgetModel), using WebLLM's
// own deleteModelAllInfoInCache: WebLLM keeps every model in shared caches named "webllm/model",
// "webllm/config" and "webllm/wasm", so deleting a cache named "webllm/<model id>" deletes nothing.
//
// Note: the browser stores caches per origin, and every localhost port is its own origin. A dev
// server that starts on a different port downloads the model again (see vite.config.js strictPort).

import { CreateMLCEngine, deleteModelAllInfoInCache } from '@mlc-ai/web-llm'

export const WEBLLM_MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC'

let _engine = null
let _engineModelId = null
let _loading = null          // { modelId, promise } while a model is loading

/**
 * The shared engine, loaded with `modelId` (the app's default 1B model unless a feature asks for
 * another). onProgress receives (text, fraction 0–1) while the model downloads and compiles.
 */
export async function getSharedEngine(onProgress, modelId = WEBLLM_MODEL_ID) {
  if (_engine && _engineModelId === modelId) return _engine
  if (_loading?.modelId === modelId) return _loading.promise
  if (_loading) await _loading.promise.catch(() => {})             // finish (or fail) the other load first

  const promise = (async () => {
    if (_engine) {
      await _engine.unload().catch(() => {})                       // release its GPU memory before loading another
      _engine = null
      _engineModelId = null
    }
    const engine = await CreateMLCEngine(modelId, {
      initProgressCallback: ({ text, progress }) => onProgress?.(text || 'Loading…', progress ?? 0),
    })
    _engine = engine
    _engineModelId = modelId
    return engine
  })()
  _loading = { modelId, promise }
  try {
    return await promise
  } finally {
    if (_loading?.promise === promise) _loading = null
  }
}

/**
 * Delete a model's cached files because nothing will use it any more (for example the tutor switched
 * to another model). The app's default model is kept: every other AI feature needs it.
 */
export async function forgetModel(modelId) {
  if (!modelId || modelId === WEBLLM_MODEL_ID) return
  if (modelId === _engineModelId) await unloadSharedEngine()
  await deleteModelAllInfoInCache(modelId).catch(() => {})
}

/** Unload the engine from memory (the cached files stay, so the next use loads quickly). */
export async function unloadSharedEngine() {
  const engine = _engine
  _engine = null
  _engineModelId = null
  await engine?.unload().catch(() => {})
}

/**
 * Deletes a cached model's files. Pass '*' to delete every WebLLM cache in this origin.
 * Unloads the engine first if it holds the model being deleted.
 * @param {string} modelId
 */
export async function deleteCachedModel(modelId) {
  if (modelId === '*' || modelId === _engineModelId) await unloadSharedEngine()
  if (modelId === '*') {
    if (!('caches' in window)) return
    const names = await caches.keys()
    await Promise.all(names.filter(n => n.startsWith('webllm/')).map(n => caches.delete(n)))
    return
  }
  await deleteModelAllInfoInCache(modelId).catch(() => {})
}
