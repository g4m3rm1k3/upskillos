/** Optional comparison views never unlock a lesson or award progress. */
export function startDiscovery(runtime, lesson) {
  const { root, $, on, say } = runtime
  for (const view of lesson.discovery.views || []) {
    const node = $(view.target)
    if (!node) throw new Error(`${lesson.id}: missing optional view ${view.target}`)
    const button = document.createElement('button')
    button.textContent = view.label
    button.dataset.reveal = view.target
    button.setAttribute('aria-expanded', 'false')
    const previouslyHidden = node.hidden
    node.before(button)
    runtime.cleanup(() => { button.remove(); node.hidden = previouslyHidden })
    node.hidden = true
    on(button, 'click', () => {
      node.hidden = !node.hidden
      button.setAttribute('aria-expanded', String(!node.hidden))
      button.textContent = node.hidden ? view.label : `Hide: ${view.label.toLowerCase()}`
    })
  }
  say(lesson.discovery.start, lesson.discovery.notice, lesson.discovery.question)
}
