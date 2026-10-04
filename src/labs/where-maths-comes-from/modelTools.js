/** Small drawing helpers shared by independent, code-owned lesson models. */
export function drawing({ $, el }, id) {
  const svg = $(id)
  return {
    clear: () => svg.replaceChildren(),
    shape: (tag, attrs) => el(tag, attrs, svg),
    text(x, y, value, attrs = {}) {
      const node = el('text', { x, y, fill: 'var(--ink)', 'font-size': 13, ...attrs }, svg)
      node.textContent = value
      return node
    },
  }
}
