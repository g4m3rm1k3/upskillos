// Pure catalog helpers: new metadata must not make an entry disappear.
export const LAB_KINDS = ['lab', 'lesson', 'builder', 'visualizer']

export function normalizeLab(key, meta, palette) {
  const aliases = { brand: 'indigo', '#2dd4bf': 'teal' }
  const color = palette[meta.color] ? meta.color : aliases[meta.color] || 'indigo'
  return {
    ...meta, key,
    label: meta.label || key.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(' '),
    emoji: meta.emoji || '🧪',
    color,
    kind: LAB_KINDS.includes(meta.kind) ? meta.kind : 'lab',
    subject: meta.subject?.trim() || 'Other',
    desc: meta.desc || meta.description || 'Open this interactive workspace.',
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    cover: { grad: palette[color].header, mark: meta.emoji || '🧪', sub: meta.subject || 'Interactive workspace', ...meta.cover },
  }
}

export function labSubjects(labs) {
  const preferred = ['Math', 'Science', 'Engineering', 'CS Theory', 'Computer Science', 'Software Engineering', 'Data Science', 'Web Dev', 'Creative']
  const found = new Set(labs.map(l => l.subject || 'Other'))
  return [...preferred.filter(s => found.delete(s)), ...[...found].sort()]
}

export function completeTopics(curated, registries) {
  const topics = Object.fromEntries(Object.entries(curated).map(([id, topic]) => [id, {
    ...topic, subtopics: Object.fromEntries(Object.entries(topic.subtopics).map(([sid, sub]) => [sid, { ...sub, items: [...sub.items] }])),
  }]))
  const placed = new Set(Object.values(topics).flatMap(t => Object.values(t.subtopics).flatMap(s => s.items.map(i => `${i.kind}:${i.key}`))))
  const domains = { math: 'mathematics', science: 'science', cs: 'computer-science', engineering: 'engineering', data: 'data-ai', creative: 'creative' }
  const subjects = { Math: 'mathematics', Science: 'science', Engineering: 'engineering', 'CS Theory': 'computer-science', 'Computer Science': 'computer-science', 'Software Engineering': 'programming', 'Data Science': 'data-ai', 'Web Dev': 'programming', Creative: 'creative' }
  for (const [kind, items] of Object.entries(registries)) for (const item of items) {
    if (placed.has(`${kind}:${item.key}`)) continue
    const topicId = subjects[item.subject] || domains[item.domain] || 'general'
    const topic = topics[topicId] || topics.general
    const id = `more-${kind}s`
    topic.subtopics[id] ??= { label: kind === 'course' ? 'More courses' : kind === 'lab' ? 'More labs & tools' : 'More games', color: topic.color, items: [] }
    topic.subtopics[id].items.push({ kind, key: item.key })
    placed.add(`${kind}:${item.key}`)
  }
  return topics
}
