// Attach a lab's lesson blocks (kept in its blocks.js) to its lessons.
export const withBlocks = (lessons, blocks = {}) => lessons.map(l => (blocks[l.id] ? { ...l, blocks: blocks[l.id] } : l))
