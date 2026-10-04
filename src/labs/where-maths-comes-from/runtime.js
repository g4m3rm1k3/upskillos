export const triangular = n => n * (n + 1) / 2
export function choose(n, k) {
  if (k < 0 || k > n) return 0
  let result = 1
  for (let i = 0; i < k; i++) result = result * (n - i) / (i + 1)
  return Math.round(result)
}
export function createLessonRuntime(root) {
  const frames = new Set(), intervals = new Set(), disposers = []
  const $ = id => root.querySelector(`[id="${id}"]`)
  const el = (tag, attrs, parent) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag)
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value))
    parent?.appendChild(node)
    return node
  }
  const say = (observation, why, tryNext) => {
    for (const [key, text] of Object.entries({ observation, why, tryNext })) {
      const node = root.querySelector(`[data-state="${key}"]`)
      if (node && node.textContent !== text) node.textContent = text || ''
    }
  }
  const on = (node, event, handler) => {
    node.addEventListener(event, handler)
    disposers.push(() => node.removeEventListener(event, handler))
  }
  const cancelAnimationFrame = id => { window.cancelAnimationFrame(id); frames.delete(id) }
  const clearInterval = id => { window.clearInterval(id); intervals.delete(id) }
  const pause = () => {
    frames.forEach(id => window.cancelAnimationFrame(id)); frames.clear()
    intervals.forEach(id => window.clearInterval(id)); intervals.clear()
  }
  return {
    root, $, el, say, on, cleanup(fn) { disposers.push(fn) }, PC: choose, Tn: triangular,
    requestAnimationFrame(fn) {
      const id = window.requestAnimationFrame(time => { frames.delete(id); fn(time) })
      frames.add(id); return id
    },
    cancelAnimationFrame,
    setInterval(fn, ms) { const id = window.setInterval(fn, ms); intervals.add(id); return id },
    clearInterval, pause,
    dispose() { pause(); disposers.forEach(fn => fn()) },
  }
}
