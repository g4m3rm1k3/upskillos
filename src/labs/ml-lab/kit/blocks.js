// Attach a lab's lesson blocks (kept in its blocks.js) to its lessons. A block list whose lesson id does
// not exist would otherwise vanish without a trace, so it is an error.
export const withBlocks = (lessons, blocks = {}) => {
  const ids = new Set(lessons.map(l => l.id))
  const orphans = Object.keys(blocks).filter(id => !ids.has(id))
  if (orphans.length) throw new Error(`blocks.js has lesson blocks for ${orphans.join(', ')}, which is not a lesson id`)
  return lessons.map(l => (blocks[l.id] ? { ...l, blocks: blocks[l.id] } : l))
}
