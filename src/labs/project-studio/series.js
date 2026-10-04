// Curriculum navigation groups discovered tracks without changing lesson ids,
// discovery paths, or the project key used to remember each chapter's folder.
//
// A series claims every discovered track whose folder starts with its prefix. Its listed
// chapters come first, in the order given; a newly discovered track with the prefix joins it
// automatically (before `insertBefore`, when that chapter exists, else at the end).
const SERIES = [
  {
    key: 'cpp-mastery',
    label: 'C++ — From Zero to Mastery',
    prefix: 'cpp-',
    position: 2,
    insertBefore: 'cpp-game',
    chapters: [
      ['cpp-foundations', 'Tools of the Trade'],
      ['cpp-language-basics', 'Language Foundations'],
      ['cpp-memory', 'Memory, Lifetime and Ownership'],
      ['cpp-classes', 'Classes and Abstraction'],
      ['cpp-generic', 'Generic Programming'],
      ['cpp-dsa', 'Data Structures and Algorithms'],
      ['cpp-engineering', 'Software Engineering'],
      ['cpp-systems', 'Systems Programming'],
      ['cpp-networking', 'Networking'],
      ['cpp-game', 'Game Project: Pong'],
    ],
    planned: 'Graphics, further games and engines, and advanced mastery chapters are planned.',
  },
  {
    // Plan, chapter map and status: docs/ml-project-studio-curriculum.md.
    key: 'ml-production',
    label: 'Machine Learning — From Mathematics to Production',
    prefix: 'ml-',
    chapters: [
      ['ml-software', '00 · Python Becomes Software: Text Analysis CLI'],
      ['ml-data', '01 · Data: Dataset Explorer'],
      ['ml-math', '02 · Mathematics Through Computation'],
      ['ml-first-model', '03 · Your First Model: Predict a Number'],
      ['ml-web', '04 · Web + ML: The Prediction Web App'],
      ['ml-database', '05 · Databases: The Experiment Database'],
      ['ml-security', '06 · Authentication and Security: Multi-user Studio'],
      ['ml-evaluation', '07 · Evaluation: Is the Model Any Good?'],
      ['ml-classification', '08 · Classification: A Spam Detector'],
      ['ml-trees', '09 · Trees and Neighbours: Predicting Defects'],
      ['ml-clustering', '10 · Clustering: Customer Segments'],
      ['ml-pca', '11 · Dimensionality Reduction: Inspection Data'],
      ['ml-neural', '12 · Neural Networks: A Tolerance Zone'],
      ['ml-pytorch', '13 · PyTorch: Reading Handwritten Digits'],
      ['ml-nlp', '14 · NLP: Maintenance Work Orders'],
    ],
    planned: 'Next in this series: ML Studio and your own capstone. The full map is in docs/ml-project-studio-curriculum.md.',
  },
];

function buildSeries(def, tracks, keys, title) {
  const chapters = def.chapters.filter(([key]) => tracks[key]?.length).map(([key, label]) => ({ key, label }));
  const known = new Set(def.chapters.map(([key]) => key));
  const additional = keys.filter(key => key.startsWith(def.prefix) && !known.has(key)).map(key => ({ key, label: title(key) }));
  const at = def.insertBefore ? chapters.findIndex(chapter => chapter.key === def.insertBefore) : -1;
  chapters.splice(at < 0 ? chapters.length : at, 0, ...additional);
  return { key: def.key, label: def.label, chapters, planned: def.planned };
}

export function studioSeries(tracks, keys, title) {
  const built = SERIES.map(def => ({ def, series: buildSeries(def, tracks, keys, title) })).filter(({ series }) => series.chapters.length);
  const grouped = new Set(built.flatMap(({ series }) => series.chapters.map(chapter => chapter.key)));
  const result = keys.filter(key => !grouped.has(key)).map(key => ({ key, label: title(key), chapters: [{ key, label: title(key) }] }));
  // A series sits at its fixed `position`, or where its first chapter falls among the tracks.
  for (const { def, series } of built) {
    const first = keys.indexOf(series.chapters[0].key);
    const at = def.position ?? result.findIndex(item => keys.indexOf(item.chapters[0].key) > first);
    result.splice(at < 0 ? result.length : Math.min(at, result.length), 0, series);
  }
  return result;
}

export function nextSeriesLesson(series, tracks, trackKey, lessonId) {
  const chapter = series.chapters.findIndex(item => item.key === trackKey);
  const lessons = tracks[trackKey] || [];
  const index = lessons.findIndex(lesson => lesson.id === lessonId);
  if (index < 0 || chapter < 0) return null;
  if (index + 1 < lessons.length) return { trackKey, lesson: lessons[index + 1] };
  const next = series.chapters[chapter + 1];
  return next ? { trackKey: next.key, lesson: tracks[next.key][0] } : null;
}
