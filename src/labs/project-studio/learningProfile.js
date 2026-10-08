// These are entry contracts, not claims that every lesson has passed review.
//
// The family profiles below (forge-, aml-, cpp-, ml-) were written for the chapters that existed
// then. A chapter added to a family later doesn't inherit one, because later chapters need more:
// it is labelled unreviewed until it gets its own line here.
const REVIEWED_CHAPTERS = new Set([
  'forge-tools', 'forge-script', 'forge-functions', 'forge-classes', 'forge-package', 'forge-data', 'forge-saving', 'forge-records',
  'aml-python', 'aml-project',
  'cpp-foundations', 'cpp-language-basics', 'cpp-memory', 'cpp-classes', 'cpp-generic', 'cpp-dsa', 'cpp-engineering',
  'cpp-systems', 'cpp-networking', 'cpp-graphics', 'cpp-engines', 'cpp-game',
  'ml-software', 'ml-data', 'ml-math', 'ml-first-model', 'ml-web', 'ml-database', 'ml-security', 'ml-evaluation',
  'ml-classification', 'ml-trees', 'ml-clustering', 'ml-pca', 'ml-neural', 'ml-pytorch', 'ml-nlp', 'ml-studio',
  'ml-capstone', 'ml-timeseries', 'ml-boosting',
]);
const SERIES_KEYS = new Set(['forge', 'applied-ml', 'cpp-mastery', 'ml-production']);

export function learningProfile(key) {
  if (/^(forge|aml|cpp|ml)-/.test(key) && !REVIEWED_CHAPTERS.has(key) && !SERIES_KEYS.has(key)) {
    return { level: 'unclassified', maturity: 'in-development', audience: "This chapter's prerequisites haven't been reviewed yet. It builds on the chapters before it in this series; start there." };
  }
  if (key === 'qarcade' || key.startsWith('qarcade-')) return { level: 'bridge', maturity: 'in-development', audience: 'For Python scripters with no machine-learning background. Q-learning starts in Chapter 1; NumPy, game loops, PyTorch and Keras are taught when a lesson first needs them. Follow the chapters in order: they build one project.' };
  if (key === 'forge' || key.startsWith('forge-')) return { level: 'beginner', maturity: 'in-development', recommended: true, audience: 'Recommended for self-taught Python scripters. Assumes variables, loops and functions; tools, testing and project structure are taught in order. Later engine chapters build on the earlier chapters.' };
  if (key === 'applied-ml' || key.startsWith('aml-')) return { level: 'beginner', maturity: 'in-development', audience: 'For Python beginners and scripters moving into data work. Start with Python from Zero, then A Project of Its Own; later chapters are still being authored.' };
  if (['dice-learning', 'dice-path-start', 'dice-path-state', 'dice-path-objects', 'dice-path-project', 'dice-path-learning'].includes(key)) return { level: 'bridge', maturity: 'in-development', audience: 'Learn C++ through a terminal game. Basic Python scripting is the entry prerequisite; follow the C++ chapters in order. SDL and Vulkan chapters are planned, not a completed path.' };
  if (key === 'dice-cpp') return { level: 'bridge', maturity: 'review-required', audience: 'For Python scripters building a C++ game. Review the Dice opening path first if compiling, types or native tools are unfamiliar.' };
  if (key === 'cpp-mastery' || key.startsWith('cpp-')) return { level: ['cpp-foundations', 'cpp-language-basics', 'cpp-mastery'].includes(key) ? 'bridge' : 'advanced', maturity: 'review-required', audience: key === 'cpp-mastery' ? 'Starts with compiler tools and typed values for Python scripters. Later chapters require the preceding C++ material; memory, systems, graphics and engines are advanced. Lesson quality review is pending.' : 'Follow the C++ series in order. Foundations introduces the compiler; language basics assumes that setup. Later chapters assume functions, types, compilation and tests, plus the preceding topic chapters.' };
  if (key === 'ml-production' || key.startsWith('ml-')) return { level: key === 'ml-software' || key === 'ml-production' ? 'bridge' : 'advanced', maturity: 'review-required', audience: 'For Python scripters: begin with Python Becomes Software. Later chapters assume the preceding data, mathematics and model work; production and advanced topics need those foundations.' };
  const profiles = {
    'studio-build': { level: 'bridge', maturity: 'in-development', audience: 'For learners who know some JavaScript: build a desktop game studio (Electron, React, TypeScript, Phaser) from an empty folder, every line explained. Sprint 0 is written; the rest is planned in docs/studio-from-scratch-plan.md.' },
    'spreadsheet-build': { level: 'bridge', maturity: 'review-required', audience: 'For Python scripters building a spreadsheet application. Begin with terminal and project setup; later chapters build on the earlier implementation.' },
    'java-engineering': { level: 'bridge', maturity: 'review-required', audience: 'For scripters moving into Java application development. Begin with a small Java execution experiment; build tools, databases and browser work follow. No Java framework experience is assumed.' },
    'rl-pygame': { level: 'bridge', maturity: 'review-required', audience: 'For Python scripters who can use functions, lists and dictionaries. Review the environment and testing chapters before Q-learning; game loops and learning terminology are introduced along the path.' },
    'circuit-clash': { level: 'bridge', maturity: 'in-development', audience: 'C# course in development. Start with the browser behavior reference and small console experiments. The native game needs a local .NET SDK and graphics display; cross-platform verification is incomplete.' },
    'pyside6-engine': { level: 'advanced', maturity: 'in-development', audience: 'For learners already comfortable with Python classes, modules and debugging. Review Forge functions, objects and packaging first if GUI event handling and engine structure are unfamiliar. Only the first lesson, a window prototype, is written so far.' },
  };
  return profiles[key] || { level: 'unclassified', maturity: 'review-required', audience: 'Prerequisites have not been reviewed. Inspect the first lesson before choosing this track.' };
}
