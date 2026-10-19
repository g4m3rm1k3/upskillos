// Shared by the Home catalog and Start menu; both search discovered metadata.
// Treat a registry key ("linear-algebra-lab") like the words a learner types.
function normalizeSearchText(value) {
  return (value || '').toLowerCase().replace(/[-_\u2010-\u2015\s]+/g, ' ').trim()
}

// Category words ("games", "labs", "courses") are deliberately stripped as
// filler further down, so "show me some games about probability" searches
// on "probability" instead of literal-matching the word "games". But a BARE
// category query ("games") then has zero keywords left and matches nothing
// — checked here instead, against the item's actual kind, before that
// stripping happens. `kind`/`badgeKind` come from the caller (see
// TopicTable.jsx's resolveEntry) since cardItem alone doesn't carry them.
const CATEGORY_KEYWORDS = {
  course: ['course', 'courses'],
  lab: ['lab', 'labs'],
  lesson: ['lesson', 'lessons'],
  builder: ['builder', 'builders'],
  visualizer: ['visualizer', 'visualizers'],
  game: ['game', 'games'],
}

export function matchItem(item, query, kinds) {
  const q = normalizeSearchText(query);
  if (!q) return true;
  const words = q.split(/[\s,]+/).filter(Boolean)

  const searchableText = normalizeSearchText([
    item.label,
    item.desc,
    item.description,
    item.subject,
    item.domain,
    item.key,
    ...(item.tags || [])
  ].filter(Boolean).join(' '));

  // The whole query in the item's own text always matches, before category words narrow
  // anything: "game studio" is Game Studio (a builder), not a filter for games.
  if (searchableText.includes(q)) return true;

  const namedCategories = Object.entries(CATEGORY_KEYWORDS)
    .filter(([, kws]) => kws.some(w => words.includes(w)))
    .map(([cat]) => cat)
  if (namedCategories.length > 0 && kinds) {
    const itemCategories = [kinds.kind, kinds.badgeKind].filter(Boolean)
    if (!namedCategories.some(cat => itemCategories.includes(cat))) return false
  }

  // Extract keywords by removing conversational filler
  const stopWords = [
    'a', 'an', 'the', 'in', 'on', 'with', 'to', 'and', 'or', 'for', 'of', 'at', 'by', 'from',
    'learn', 'master', 'build', 'explore', 'simulate', 'design', 'visualise', 'visualize', 'create', 'make', 'do',
    'lesson', 'lessons', 'lab', 'labs', 'game', 'games', 'app', 'apps', 'course', 'courses',
    'topic', 'topics', 'how', 'what', 'why', 'who', 'where', 'when', 'is', 'are', 'am', 'be', 'been',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their',
    'want', 'need', 'like', 'would', 'could', 'should', 'can', 'will', 'show', 'me', 'find', 'search',
    'about', 'some', 'any', 'all', 'this', 'that', 'these', 'those', 'there', 'here', 'so', 'if', 'then',
    'teach', 'help', 'understand', 'work', 'scratch', 'from'
  ];

  // Also keep terms that might be short but very specific
  const terms = q.split(/[\s,]+/)
    .filter(t => !stopWords.includes(t))
    .filter(t => t.length > 2 || ['3d', 'js', 'ai', 'ui', 'ux', 'c', 'ml', 'vr', 'ar', 'g0', 'fk', 'ik', 'qr'].includes(t));

  if (terms.length > 0) {
    return terms.some(term => searchableText.includes(term));
  }

  // Nothing left after stripping filler/category words — a real match only
  // if the query was a recognized category and this item belongs to it.
  return Boolean(kinds) && namedCategories.length > 0;
}

