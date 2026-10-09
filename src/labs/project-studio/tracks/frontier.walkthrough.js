// What a learner does at each step of Frontier, for the walkthrough test (frontier.desktop.test.js).
// Keyed "<track>/<lesson file name>#<step title>".
//
// By default a step's file (its ```lang file=... block) is typed in for you. An entry adds:
//   run:   commands the lesson tells the learner to type in the terminal (PowerShell)
//   files: { path: content } written as they are: a Your turn answer, from the chapter's
//          answers/ folder (answer('frontier-setup', 'info.py')).
//   wrong: wrong answers, tried on a copy of the project before the step; each lists the indexes
//          of the step's checks that must fail ("fails").
//   edit:  [[from, to], ...] applied to the step's own target, written to the step's file.
//   editFiles: { path: [[from, to], ...] } applied to a file as it is in the project now.
// A wrong answer's copy shares the real .venv (a directory junction), and the test puts the
// copy's src first on PYTHONPATH so the copy's code is what gets imported. A wrong answer must
// never install anything into a shared .venv: one that installs sets copyVenv: true. A wrong
// answer about the install itself sets pythonPath: false, so only the .venv decides the import.
import fs from 'node:fs';

export function answer(track, name) {
  return fs.readFileSync(new URL(`./${track}/answers/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
}

// A Your turn answer with one change: how its wrong answers are made.
function answerWith(track, name, pairs) {
  let content = answer(track, name);
  for (const [from, to] of pairs) {
    if (!content.includes(from)) throw new Error(`Wrong answer edit not found in ${track}/answers/${name}: ${from}`);
    content = content.replace(from, to);
  }
  return content;
}

const S = 'frontier-setup';
const PIP = '.venv\\Scripts\\python -m pip install -q';

export const WALKTHROUGH = {
  // ── 0.1 ──────────────────────────────────────────────────────────────────
  [`${S}/00-01-a-project-with-its-own-python#Make a virtual environment`]: {
    run: ['python -m venv .venv'],
    wrong: [{ name: 'did nothing', fails: [0, 1] }],
  },
  [`${S}/00-01-a-project-with-its-own-python#Pin the packages`]: {
    wrong: [{ name: 'did not pin NumPy', edit: [['numpy==2.5.3', 'numpy']], fails: [0] }],
  },
  [`${S}/00-01-a-project-with-its-own-python#Install them`]: {
    run: [`${PIP} -r requirements.txt`],
    wrong: [{ name: 'did nothing', fails: [0, 1] }],
  },
  [`${S}/00-01-a-project-with-its-own-python#Your turn: keep the environment out of Git`]: {
    files: { '.gitignore': answer(S, 'gitignore.txt') },
    wrong: [
      { name: 'did nothing', fails: [0, 1, 2] },
      { name: 'only ignored the environment', files: { '.gitignore': '.venv/\n' }, fails: [1, 2] },
    ],
  },

  // ── 0.2 ──────────────────────────────────────────────────────────────────
  [`${S}/00-02-a-package-you-can-import#A package is a folder`]: {
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  [`${S}/00-02-a-package-you-can-import#pyproject.toml: what the project is`]: {
    run: [`${PIP} -e .`],
    editFiles: { '.gitignore': [['.pytest_cache/\n', '.pytest_cache/\n*.egg-info/\n']] },
    wrong: [
      { name: 'did nothing', pythonPath: false, fails: [0, 1, 2] },
      {
        name: 'installed a copy instead of an editable install',
        copyVenv: true,
        files: {
          'src/frontier/__init__.py': '"""Frontier: the code you write in this series."""\n\n__version__ = "0.1.0"\n',
          'pyproject.toml': answerWith(S, 'pyproject.toml', [['[project.scripts]\nfrontier-info = "frontier.info:main"\n\n', '']]),
        },
        run: [`${PIP} .`],
        fails: [1, 2],
      },
    ],
  },
  [`${S}/00-02-a-package-you-can-import#Read the tests first`]: {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  [`${S}/00-02-a-package-you-can-import#Your machine, as data`]: {
    wrong: [{ name: 'left out the NumPy version', edit: [['        "numpy": numpy.__version__,\n', '']], fails: [0] }],
  },
  [`${S}/00-02-a-package-you-can-import#Your turn: a \`frontier-info\` command`]: {
    files: { 'src/frontier/info.py': answer(S, 'info.py'), 'pyproject.toml': answer(S, 'pyproject.toml') },
    run: [`${PIP} -e .`],
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      { name: 'did not install again, so there is no command', files: { 'src/frontier/info.py': answer(S, 'info.py'), 'pyproject.toml': answer(S, 'pyproject.toml') }, fails: [1] },
      { name: 'joined the lines with commas', files: { 'src/frontier/info.py': answerWith(S, 'info.py', [['"\\n".join', '", ".join']]) }, fails: [0] },
    ],
  },

  // ── 0.3 ──────────────────────────────────────────────────────────────────
  [`${S}/00-03-pytorch-checked-against-numpy#Install PyTorch`]: {
    editFiles: { 'pyproject.toml': [['dependencies = ["numpy>=2"]', 'dependencies = ["numpy>=2", "torch>=2.6"]']] },
    run: [`${PIP} -r requirements.txt`],
    wrong: [{ name: 'did nothing', fails: [0, 1, 2] }],
  },
  [`${S}/00-03-pytorch-checked-against-numpy#Read the tests first`]: {
    wrong: [{ name: 'did not create the file', fails: [0] }],
  },
  [`${S}/00-03-pytorch-checked-against-numpy#Which device?`]: {
    wrong: [
      { name: 'always says cuda', edit: [['"cuda" if torch.cuda.is_available() else "cpu"', '"cuda"']], fails: [0] },
      { name: 'left out the PyTorch version', edit: [['        "torch": torch.__version__,\n', '']], fails: [1] },
    ],
  },
  [`${S}/00-03-pytorch-checked-against-numpy#Tensors, and the float32 surprise`]: {
    wrong: [{ name: 'did not write the experiment', fails: [0] }],
  },
  [`${S}/00-03-pytorch-checked-against-numpy#Your turn: does PyTorch agree with NumPy?`]: {
    files: { 'src/frontier/selfcheck.py': answer(S, 'selfcheck.py') },
    wrong: [
      { name: 'did nothing', fails: [0] },
      {
        name: 'multiplied in float32',
        files: { 'src/frontier/selfcheck.py': answerWith(S, 'selfcheck.py', [['torch.from_numpy(a).to(where) @ torch.from_numpy(b).to(where)', 'torch.from_numpy(a).float().to(where) @ torch.from_numpy(b).float().to(where)']]) },
        fails: [0],
      },
    ],
  },
};
