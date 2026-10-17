import { afterEach, describe, expect, it, vi } from 'vitest'
import { startRun } from './runner.js'

afterEach(() => vi.useRealTimers())
function mockWorker() { return { postMessage: vi.fn(), terminate: vi.fn() } }
describe('isolated OpenMAT execution', () => {
  it('returns worker output and terminates it exactly once', async () => {
    const worker = mockWorker(), payload = { source: 'x = 1;' }
    const job = startRun(payload, { createWorker: () => worker })
    expect(worker.postMessage).toHaveBeenCalledWith(payload)
    worker.onmessage({ data: { result: { output: '1' }, checks: [] } })
    expect(await job.promise).toEqual({ result: { output: '1' }, checks: [] })
    job.cancel()
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })
  it('stops long runs and resolves cancellation and startup errors', async () => {
    vi.useFakeTimers()
    const worker = mockWorker()
    const timeout = startRun({}, { createWorker: () => worker })
    await vi.advanceTimersByTimeAsync(12000)
    expect((await timeout.promise).error).toContain('12 seconds')
    const cancelled = startRun({}, { createWorker: mockWorker })
    cancelled.cancel()
    expect((await cancelled.promise).error).toContain('Your code is saved')
    const brokenWorker = mockWorker()
    const broken = startRun({}, { createWorker: () => brokenWorker })
    brokenWorker.onerror({ message: 'Cannot load module' })
    expect((await broken.promise).error).toBe('Cannot load module')
    expect(brokenWorker.terminate).toHaveBeenCalledTimes(1)
  })
})
