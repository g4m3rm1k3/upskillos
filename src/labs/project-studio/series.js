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
      ['ml-studio', '15 · Production ML: The Defect Studio'],
      ['ml-capstone', '16 · Capstone: Your Own ML Product'],
      ['ml-timeseries', '17 · Advanced: Time Series, a Spindle Bearing Watch'],
      ['ml-boosting', '18 · Advanced: Boosting and SVMs'],
    ],
    planned: 'More optional advanced tracks are planned: sequence models and transformers, retrieval, and recommender systems. The full map is in docs/ml-project-studio-curriculum.md.',
  },
  {
    // Plan, chapter map and status: docs/pygame-engine-series-plan.md.
    key: 'forge',
    label: 'Forge — Learn Software Engineering by Building a Game Engine in Python',
    prefix: 'forge-',
    chapters: [
      ['forge-tools', '00 · Tools of the Trade'],
      ['forge-script', '01 · A Game in One File'],
      ['forge-functions', '02 · Functions You Can Test'],
      ['forge-classes', '03 · Objects and Data'],
      ['forge-package', '04 · A Real Project'],
      ['forge-data', '05 · Levels Are Data'],
      ['forge-saving', '06 · Data That Outlives the Program'],
      ['forge-records', '07 · Players, Sessions and Statistics'],
      ['forge-second-game', '08 · A Second Game'],
      ['forge-engine', '09 · The Boundary'],
      ['forge-nodes', '10 · Nodes and the Scene Tree'],
      ['forge-input-signals', '11 · Input and Signals'],
      ['forge-physics', '12 · Physics'],
      ['forge-sprites', '13 · Sprites, Animation and Sound'],
      ['forge-world', '14 · Camera, HUD and Tilemaps'],
      ['forge-scenes', '15 · Scenes Are Files'],
      ['forge-scripts', '16 · Scripts on Nodes'],
      ['forge-resources', '17 · Resources and Importing'],
      ['forge-editor-tiny', '18 · The Smallest Editor'],
      ['forge-editor-model', "19 · The Editor's Architecture"],
      ['forge-editor-viewport', '20 · The Viewport'],
      ['forge-editor-project', '21 · Save, Undo and Play'],
      ['forge-editor-files', '22 · The FileSystem Dock'],
      ['forge-editor-plugins', '23 · Editor Plugins'],
      ['forge-editor-help', '24 · Shortcuts and Help'],
      ['forge-editor-tutorials', '25 · Tutorials and Examples Inside Forge'],
      ['forge-3d-space', '26 · Space, Vectors and Matrices'],
      ['forge-3d-raster', '27 · A Renderer by Hand'],
      ['forge-3d-light', '28 · Light and Surfaces'],
      ['forge-3d-rotation', '29 · Rotation and Cameras'],
      ['forge-3d-gpu', '30 · The Graphics Card'],
      ['forge-3d-nodes', '31 · 3D Nodes'],
      ['forge-3d-game', '32 · A 3D Game'],
      ['forge-library-api', '33 · An API'],
      ['forge-library-db', '34 · Its Database'],
      ['forge-library-users', '35 · Users and Security'],
      ['forge-library-client', '36 · The Editor Meets the Server'],
      ['forge-library-deploy', '37 · Running It for Real'],
      ['forge-ml-env', '38 · The Game as an Environment'],
      ['forge-ml-qlearning', '39 · Learning to Act'],
      ['forge-ml-search', '40 · Learning Without Gradients'],
      ['forge-ml-data', '41 · Learning from Data'],
      ['forge-ml-neural', '42 · Neural Networks'],
      ['forge-ml-dqn', '43 · Deep Q-Learning'],
      ['forge-ml-policy', '44 · Learning the Policy Directly'],
      ['forge-ml-ppo', '45 · PPO'],
      ['forge-ml-selfplay', '46 · Search and Self-Play'],
      ['forge-ml-3d', '47 · Agents in 3D'],
      ['forge-ml-in-forge', '48 · Machine Learning as a Forge Feature'],
      ['forge-export', '49 · Export, Like Godot'],
      ['forge-docs', '50 · Documentation and the Forge Course'],
      ['forge-release', '51 · Releasing Forge'],
      ['forge-health', '52 · Keeping It Healthy'],
      ['forge-capstone', '53 · Capstone'],
    ],
    planned: 'Forge is being written chapter by chapter. The full map is in docs/pygame-engine-series-plan.md.',
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
