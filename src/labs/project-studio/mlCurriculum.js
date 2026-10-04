// mlCurriculum.js
// The concept graph behind "Machine Learning — From Mathematics to Production" (the ml-* tracks),
// and the links from each lesson to the same idea taught two other ways in this app: a Notebook Lab
// lesson (#/notebook-lab?lesson=<id>, read by NotebookLab.jsx) and an ML Lab lab (#/lab/ml-lab?lab=<n>,
// handed to the lab window by useEntryLink).
//
// A lesson's frontmatter says what it teaches and where else to learn it:
//
//   concepts: vectors, dot-product      concepts its checks demonstrate (this lesson teaches them)
//   revisits: functions                 earlier concepts it uses again, in a new setting
//   notebook: ml-vectors                Notebook Lab series lessons (ids from series/manifest.js)
//   lab: 3                              Machine Learning Lab numbers (src/labs/ml-lab/roadmap.js)
//
// Mastery is measured from demonstrated work only: a concept's bar is the share of checked steps,
// in the lessons that teach it, whose checks have passed in the learner's own project. Reading a
// lesson moves nothing. mlCurriculum.test.js keeps every id here and in the lessons resolvable.
import { SERIES_MANIFEST } from '../../tools/notebook-lab/series/manifest.js';
import { roadmap } from '../ml-lab/roadmap.js';

export const AREAS = ['Python', 'Data', 'Mathematics', 'Machine learning', 'Software'];

// requires: the concepts you need first. The graph runs from Python to production; concepts
// whose lessons are not written yet are part of the plan in docs/ml-project-studio-curriculum.md.
export const ML_CONCEPTS = {
  // Python becomes software
  'functions': { label: 'Functions as units', area: 'Python', requires: [] },
  'modules': { label: 'Modules and imports', area: 'Python', requires: ['functions'] },
  'packages': { label: 'Packages', area: 'Python', requires: ['modules'] },
  'command-line': { label: 'Command-line arguments', area: 'Python', requires: ['packages'] },
  'exceptions': { label: 'Exceptions and exit codes', area: 'Python', requires: ['functions'] },
  'file-paths': { label: 'Files and paths', area: 'Python', requires: ['functions'] },
  'type-hints': { label: 'Type hints', area: 'Python', requires: ['functions'] },
  'testing': { label: 'Testing', area: 'Python', requires: ['functions'] },
  'virtual-environments': { label: 'Virtual environments and pinned packages', area: 'Python', requires: [] },
  'classes': { label: 'Classes', area: 'Python', requires: ['functions'] },
  'configuration': { label: 'Configuration and settings', area: 'Python', requires: ['file-paths', 'exceptions'] },

  // Data
  'tabular-data': { label: 'Rows, columns, features and labels', area: 'Data', requires: ['file-paths'] },
  'missing-values': { label: 'Missing values', area: 'Data', requires: ['tabular-data'] },
  'categorical-data': { label: 'Categorical and numerical values', area: 'Data', requires: ['tabular-data'] },
  'aggregation': { label: 'Filtering, grouping and aggregation', area: 'Data', requires: ['tabular-data'] },
  'pandas': { label: 'pandas DataFrames', area: 'Data', requires: ['aggregation', 'missing-values'] },

  // Mathematics through computation
  'mathematical-functions': { label: 'Functions: x → f(x)', area: 'Mathematics', requires: ['functions'] },
  'vectors': { label: 'Vectors', area: 'Mathematics', requires: ['tabular-data'] },
  'dot-product': { label: 'Dot product', area: 'Mathematics', requires: ['vectors'] },
  'distance': { label: 'Length and distance', area: 'Mathematics', requires: ['dot-product'] },
  'numpy': { label: 'NumPy arrays', area: 'Mathematics', requires: ['vectors'] },
  'matrices': { label: 'Matrices and matrix multiplication', area: 'Mathematics', requires: ['dot-product', 'numpy'] },
  'derivatives': { label: 'Derivatives', area: 'Mathematics', requires: ['mathematical-functions'] },
  'gradients': { label: 'Partial derivatives and gradients', area: 'Mathematics', requires: ['derivatives', 'vectors'] },
  'descriptive-statistics': { label: 'Mean, variance and standard deviation', area: 'Mathematics', requires: ['tabular-data'] },
  'correlation': { label: 'Covariance and correlation', area: 'Mathematics', requires: ['descriptive-statistics', 'dot-product'] },
  'probability': { label: 'Probability and distributions', area: 'Mathematics', requires: ['descriptive-statistics'] },

  // Machine learning
  'linear-model': { label: 'The linear model y = wx + b', area: 'Machine learning', requires: ['mathematical-functions', 'dot-product'] },
  'loss': { label: 'Loss functions', area: 'Machine learning', requires: ['linear-model', 'descriptive-statistics'] },
  'gradient-descent': { label: 'Gradient descent', area: 'Machine learning', requires: ['gradients', 'loss'] },
  'feature-scaling': { label: 'Feature scaling', area: 'Machine learning', requires: ['descriptive-statistics', 'gradient-descent'] },
  'linear-regression': { label: 'Linear regression', area: 'Machine learning', requires: ['gradient-descent', 'matrices'] },
  'generalization': { label: 'Train/test splits and generalization', area: 'Machine learning', requires: ['linear-regression'] },
  'scikit-learn': { label: 'scikit-learn estimators', area: 'Machine learning', requires: ['linear-regression', 'classes'] },
  'regression-metrics': { label: 'Regression metrics (MAE, RMSE, R²)', area: 'Machine learning', requires: ['loss', 'generalization'] },
  'regularization': { label: 'Overfitting and regularization', area: 'Machine learning', requires: ['generalization', 'gradients'] },
  'cross-validation': { label: 'Cross-validation, leakage and pipelines', area: 'Machine learning', requires: ['generalization', 'scikit-learn'] },
  'text-features': { label: 'Text as numbers: tokens and bag of words', area: 'Machine learning', requires: ['vectors', 'probability'] },
  'naive-bayes': { label: 'Naive Bayes', area: 'Machine learning', requires: ['probability', 'text-features'] },
  'logistic-regression': { label: 'Logistic regression', area: 'Machine learning', requires: ['linear-regression', 'probability'] },
  'classification-metrics': { label: 'Classification metrics', area: 'Machine learning', requires: ['logistic-regression'] },
  'nearest-neighbours': { label: 'k-nearest neighbours', area: 'Machine learning', requires: ['distance', 'feature-scaling'] },
  'decision-trees': { label: 'Decision trees', area: 'Machine learning', requires: ['probability', 'aggregation'] },
  'ensembles': { label: 'Random forests and ensembles', area: 'Machine learning', requires: ['decision-trees'] },
  'clustering': { label: 'Clustering (k-means)', area: 'Machine learning', requires: ['distance'] },
  'pca': { label: 'Dimensionality reduction (PCA)', area: 'Machine learning', requires: ['correlation', 'matrices'] },
  'neural-networks': { label: 'Neural networks', area: 'Machine learning', requires: ['logistic-regression', 'matrices'] },
  'backpropagation': { label: 'Backpropagation', area: 'Machine learning', requires: ['neural-networks', 'gradients'] },
  'pytorch': { label: 'PyTorch', area: 'Machine learning', requires: ['backpropagation'] },
  'embeddings': { label: 'Embeddings and similarity', area: 'Machine learning', requires: ['dot-product', 'neural-networks'] },
  'time-series': { label: 'Time series: lags, seasonality and walk-forward evaluation', area: 'Machine learning', requires: ['cross-validation', 'linear-regression'] },

  // Software around the model
  'http': { label: 'HTTP requests and responses', area: 'Software', requires: ['command-line'] },
  'web-api': { label: 'Web APIs with FastAPI', area: 'Software', requires: ['http', 'type-hints'] },
  'html-htmx': { label: 'HTML, templates and HTMX', area: 'Software', requires: ['web-api'] },
  'sql': { label: 'SQL and relational databases', area: 'Software', requires: ['tabular-data'] },
  'data-access-layers': { label: 'Repositories, ORMs and migrations', area: 'Software', requires: ['sql', 'classes'] },
  'authentication': { label: 'Authentication and sessions', area: 'Software', requires: ['web-api', 'sql'] },
  'web-security': { label: 'Web security', area: 'Software', requires: ['authentication', 'html-htmx'] },
  'ml-testing': { label: 'Data validation and testing ML systems', area: 'Software', requires: ['testing', 'scikit-learn', 'cross-validation'] },
  'model-persistence': { label: 'Model artifacts and experiment tracking', area: 'Software', requires: ['scikit-learn', 'sql'] },
  'background-jobs': { label: 'Background jobs', area: 'Software', requires: ['web-api', 'model-persistence'] },
  'deployment': { label: 'Deployment and observability', area: 'Software', requires: ['web-api', 'virtual-environments'] },
};

const NOTEBOOK_LESSONS = new Map(
  SERIES_MANIFEST.flatMap((series) => series.lessons.map((lesson) => [lesson.id, { ...lesson, series: series.title }])),
);
const ML_LABS = new Map(roadmap.flatMap((phase) => phase.labs).map((lab) => [lab.number, lab]));

export const list = (value) => String(value ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export const notebookLesson = (id) => NOTEBOOK_LESSONS.get(id) ?? null;
export const mlLab = (number) => ML_LABS.get(Number(number)) ?? null;

// What the lesson panel shows beside a lesson: its concepts and the other two ways to learn them.
export function lessonCompanions(lesson) {
  const meta = lesson?.meta ?? {};
  const concept = (id) => ({ id, label: ML_CONCEPTS[id]?.label ?? id });
  return {
    concepts: list(meta.concepts).map(concept),
    revisits: list(meta.revisits).map(concept),
    notebooks: list(meta.notebook).map((id) => ({
      id, title: notebookLesson(id)?.title ?? id, href: `#/notebook-lab?lesson=${encodeURIComponent(id)}`,
    })),
    labs: list(meta.lab).map((n) => ({
      number: Number(n), title: mlLab(n)?.title ?? `Lab ${n}`, href: `#/lab/ml-lab?lab=${Number(n)}`,
    })),
  };
}

// { conceptId: { done, total } } over the given lessons. Only steps with checks count: they are
// the steps where the learner's own code was run and judged.
export function conceptMastery(lessons, isStepDone) {
  const mastery = {};
  for (const lesson of lessons) {
    const checked = lesson.steps.filter((step) => step.checks?.length);
    if (!checked.length) continue;
    const done = checked.filter((step) => isStepDone(step)).length;
    for (const id of list(lesson.meta?.concepts)) {
      const m = (mastery[id] ||= { done: 0, total: 0 });
      m.done += done;
      m.total += checked.length;
    }
  }
  return mastery;
}

// Every concept that must come before `id`, nearest first (for "you will need" lists and tests).
export function prerequisitesOf(id, seen = new Set()) {
  for (const req of ML_CONCEPTS[id]?.requires ?? []) {
    if (seen.has(req)) continue;
    seen.add(req);
    prerequisitesOf(req, seen);
  }
  return [...seen];
}
