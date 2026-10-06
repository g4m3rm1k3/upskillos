// Curriculum navigation groups discovered tracks without changing lesson ids,
// discovery paths, or the project key used to remember each chapter's folder.
//
// A series claims every discovered track whose folder starts with its prefix. Its listed
// chapters come first, in the order given; a newly discovered track with the prefix joins it
// automatically (before `insertBefore`, when that chapter exists, else at the end).
import { learningProfile } from './learningProfile.js';

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
      ['cpp-graphics', 'Graphics from First Principles'],
      ['cpp-engines', 'Games and Engines'],
      ['cpp-game', 'Game Project: Pong'],
    ],
    planned: 'Further games, engine chapters and advanced mastery chapters are planned.',
  },
  {
    // Plan, chapter map and status: docs/cpp-games-learning-path.md.
    key: 'dice-learning',
    label: 'C++ Games — From Python Scripts to Vulkan',
    prefix: 'dice-path-',
    position: 3,
    chapters: [
      ['dice-path-start', 'Start here · Meet the game and write C++'],
    ],
    planned: 'Upcoming chapters are still being authored: SDL3 windows and input, graphics and shaders, then Vulkan.',
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
    // Plan, lesson standard, chapter map and status: docs/applied-ml-series-plan.md.
    key: 'applied-ml',
    label: 'Applied Machine Learning — From Zero to Real Tools',
    prefix: 'aml-',
    chapters: [
      ['aml-python', '00 · Python from Zero: A CI Report'],
      ['aml-project', '01 · A Project of Its Own'],
      ['aml-pandas', '02 · pandas, Rebuilt by Hand'],
      ['aml-seeing', '03 · Seeing Data: Your First Streamlit App'],
      ['aml-git', '04 · Your Own Data: Git History'],
      ['aml-vectors', '05 · Vectors and Similarity: Duplicate Bug Reports'],
      ['aml-change', '06 · Change and Slopes'],
      ['aml-first-model', '07 · Your First Model: When Will a Test Blow Its Budget?'],
      ['aml-evaluation', '08 · Is It Any Good?'],
      ['aml-flaky', '09 · Will This Run Fail? A Flaky-Test Detector'],
      ['aml-text', '10 · Triaging Bug Reports'],
      ['aml-trees', '11 · A Risky-Change Warning'],
      ['aml-anomaly', '12 · Latency Anomalies and Clustering'],
      ['aml-neural', '13 · Neural Networks from Scratch, then PyTorch'],
      ['aml-shipping', '14 · Shipping the Toolkit'],
      ['aml-service', '15 · A Model Service'],
      ['aml-workflow', "16 · ML in the Team's Workflow"],
      ['aml-capstone', '17 · Capstone: Your Own Tool on Your Own Data'],
    ],
    planned: 'Applied Machine Learning is being written chapter by chapter, from Python basics up. The full map is in docs/applied-ml-series-plan.md.',
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
      ['forge-ui', '15 · Menus, HUDs and Dialogue'],
      ['forge-scenes', '16 · Scenes Are Files'],
      ['forge-scripts', '17 · Scripts on Nodes'],
      ['forge-resources', '18 · Resources and Importing'],
      ['forge-game-ai', '19 · Game AI Before Learning'],
      ['forge-procgen', '20 · Generated Worlds'],
      ['forge-editor-tiny', '21 · The Smallest Editor'],
      ['forge-editor-model', "22 · The Editor's Architecture"],
      ['forge-editor-viewport', '23 · The Viewport'],
      ['forge-editor-project', '24 · Save, Undo and Play'],
      ['forge-editor-files', '25 · The FileSystem Dock'],
      ['forge-editor-plugins', '26 · Editor Plugins'],
      ['forge-editor-help', '27 · Shortcuts and Help'],
      ['forge-editor-tutorials', '28 · Tutorials and Examples Inside Forge'],
      ['forge-3d-space', '29 · Space, Vectors and Matrices'],
      ['forge-3d-raster', '30 · A Renderer by Hand'],
      ['forge-3d-light', '31 · Light and Surfaces'],
      ['forge-3d-rotation', '32 · Rotation and Cameras'],
      ['forge-3d-gpu', '33 · The Graphics Card'],
      ['forge-3d-nodes', '34 · 3D Nodes'],
      ['forge-3d-game', '35 · A 3D Game'],
      ['forge-library-api', '36 · An API'],
      ['forge-library-db', '37 · Its Database'],
      ['forge-library-users', '38 · Users and Security'],
      ['forge-library-client', '39 · The Editor Meets the Server'],
      ['forge-library-deploy', '40 · Running It for Real'],
      ['forge-net-sockets', '41 · Two Programs, One Game'],
      ['forge-net-play', '42 · Playing Together over a LAN'],
      ['forge-under-python', '43 · Under Python'],
      ['forge-ml-env', '44 · The Game as an Environment'],
      ['forge-ml-qlearning', '45 · Learning to Act'],
      ['forge-ml-search', '46 · Learning Without Gradients'],
      ['forge-ml-data', '47 · Learning from Data'],
      ['forge-ml-neural', '48 · Neural Networks'],
      ['forge-ml-dqn', '49 · Deep Q-Learning'],
      ['forge-ml-policy', '50 · Learning the Policy Directly'],
      ['forge-ml-ppo', '51 · PPO'],
      ['forge-ml-selfplay', '52 · Search and Self-Play'],
      ['forge-ml-3d', '53 · Agents in 3D'],
      ['forge-ml-in-forge', '54 · Machine Learning as a Forge Feature'],
      ['forge-export', '55 · Export, Like Godot'],
      ['forge-docs', '56 · Documentation and the Forge Course'],
      ['forge-release', '57 · Releasing Forge'],
      ['forge-health', '58 · Keeping It Healthy'],
      ['forge-capstone', '59 · Capstone'],
    ],
    planned: 'Forge is being written chapter by chapter. The full map is in docs/pygame-engine-series-plan.md.',
  },
];

function buildSeries(def, tracks, keys, title) {
  const chapters = def.chapters.filter(([key]) => tracks[key]?.length).map(([key, label]) => ({ key, label, ...learningProfile(key) }));
  const known = new Set(def.chapters.map(([key]) => key));
  const additional = keys.filter(key => key.startsWith(def.prefix) && !known.has(key)).map(key => ({ key, label: title(key), ...learningProfile(key) }));
  const at = def.insertBefore ? chapters.findIndex(chapter => chapter.key === def.insertBefore) : -1;
  chapters.splice(at < 0 ? chapters.length : at, 0, ...additional);
  return { key: def.key, label: def.label, chapters, planned: def.planned, ...learningProfile(def.key) };
}

export function studioSeries(tracks, keys, title) {
  const built = SERIES.map(def => ({ def, series: buildSeries(def, tracks, keys, title) })).filter(({ series }) => series.chapters.length);
  const grouped = new Set(built.flatMap(({ series }) => series.chapters.map(chapter => chapter.key)));
  const result = keys.filter(key => !grouped.has(key)).map(key => ({ key, label: title(key), chapters: [{ key, label: title(key), ...learningProfile(key) }], ...learningProfile(key) }));
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
