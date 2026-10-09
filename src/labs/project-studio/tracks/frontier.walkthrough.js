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
const E = 'frontier-engineering';
// Git runs only in the walkthrough's temporary project, never in this repository.
const COMMIT = (message) => ['git add .', `git commit -q -m "${message}"`];

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

  // ── 1.1 ──────────────────────────────────────────────────────────────────
  [`${E}/01-01-pin-the-old-behaviour#The script you inherited`]: {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  [`${E}/01-01-pin-the-old-behaviour#A save point, with Git`]: {
    run: ['git init -b main', 'git add .', 'git commit -q -m "Add textstats.py as it was given to me"'],
    wrong: [
      { name: 'did nothing', fails: [2, 3, 4] },
      { name: 'made the repository but did not commit', run: ['git init -b main'], fails: [3, 4] },
    ],
  },
  [`${E}/01-01-pin-the-old-behaviour#Save what it prints today`]: {
    run: ['.venv\\Scripts\\python tools/save_golden.py'],
    wrong: [{ name: 'did nothing', fails: [0, 1] }],
  },
  [`${E}/01-01-pin-the-old-behaviour#Your turn: a test that pins the report`]: {
    files: { 'tests/test_legacy_output.py': answer(E, 'test_legacy_output.py') },
    run: COMMIT('Pin the report with a characterisation test'),
    wrong: [
      { name: 'did nothing', fails: [0, 1, 2, 3] },
      {
        name: 'only checks that the script ran',
        files: { 'tests/test_legacy_output.py': answerWith(E, 'test_legacy_output.py', [['assert result.stdout == expected', 'assert result.returncode == 0']]) },
        run: COMMIT('Test'),
        fails: [1],
      },
      { name: 'wrote the test but did not commit', files: { 'tests/test_legacy_output.py': answer(E, 'test_legacy_output.py') }, fails: [2, 3] },
    ],
  },
  [`${E}/01-01-pin-the-old-behaviour#Watch it catch a change`]: {
    wrong: [{ name: 'left the change in', editFiles: { 'textstats.py': [['round(s / total, 2)', 'round(s / total, 1)']] }, fails: [0, 1] }],
  },

  // ── 1.2 ──────────────────────────────────────────────────────────────────
  [`${E}/01-02-small-functions-with-names#A branch for the work`]: {
    run: ['git switch -c functions'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  [`${E}/01-02-small-functions-with-names#Read the tests first`]: {
    wrong: [{ name: 'did not create the file', fails: [0] }],
  },
  [`${E}/01-02-small-functions-with-names#Safe to import`]: {
    wrong: [{ name: 'left the last lines as they were', fails: [0] }],
  },
  [`${E}/01-02-small-functions-with-names#Words and lines`]: {
    wrong: [{ name: 'did not strip punctuation', edit: [['word = word.strip(PUNCTUATION).lower()', 'word = word.lower()']], fails: [1, 2] }],
  },
  [`${E}/01-02-small-functions-with-names#Count anything`]: {
    wrong: [
      { name: 'kept the globals and the two loops', fails: [0, 1, 2] },
      { name: 'did not lower-case the letters', edit: [['[c for c in text.lower() if c.isalpha()]', '[c for c in text if c.isalpha()]']], fails: [1, 3] },
    ],
  },
  [`${E}/01-02-small-functions-with-names#Names that say what`]: {
    wrong: [{ name: 'did not rename go', fails: [0] }],
  },
  [`${E}/01-02-small-functions-with-names#Your turn: one function for both tables`]: {
    files: { 'textstats.py': answer(E, 'textstats-1.2.py') },
    wrong: [
      { name: 'did nothing', fails: [0, 2, 3, 4] },
      { name: 'sorted smallest first', files: { 'textstats.py': answerWith(E, 'textstats-1.2.py', [[', reverse=True)[:n]', ')[:n]']]) }, fails: [0, 1] },
      {
        name: 'kept the magic number',
        files: { 'textstats.py': answerWith(E, 'textstats-1.2.py', [['TOP_WORDS = 10\n', ''], ['counts, TOP_WORDS)', 'counts, 10)']]) },
        fails: [2],
      },
    ],
  },
  [`${E}/01-02-small-functions-with-names#Bring it into \`main\``]: {
    run: [...COMMIT('Split go into small functions'), 'git switch main', 'git merge -q functions', 'git branch -d functions'],
    wrong: [
      { name: 'did nothing', fails: [0, 1, 3] },
      { name: 'merged but kept the branch', run: [...COMMIT('Split go into small functions'), 'git switch main', 'git merge -q functions'], fails: [1] },
    ],
  },

  // ── 1.3 ──────────────────────────────────────────────────────────────────
  [`${E}/01-03-a-module-with-types#A branch for the move`]: {
    run: ['git switch -c package'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  [`${E}/01-03-a-module-with-types#A module for the counting`]: {
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  [`${E}/01-03-a-module-with-types#The script imports them`]: {
    // Replace All: each pair replaces the next "from textstats import".
    editFiles: { 'tests/test_pieces.py': Array(8).fill(['from textstats import', 'from frontier.text import']) },
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      { name: 'did not update the tests', typeFile: true, fails: [1] },
      { name: 'deleted the functions but did not import them', edit: [['from frontier.text import count_lines, letters, split_words, tally, top\n', '']], fails: [3] },
    ],
  },
  [`${E}/01-03-a-module-with-types#Read the tests first`]: {
    wrong: [{ name: 'did not create the file', fails: [0] }],
  },
  [`${E}/01-03-a-module-with-types#Type hints`]: {
    editFiles: {
      'requirements.txt': [['numpy==2.5.3', 'mypy==2.4.0\nnumpy==2.5.3']],
      '.gitignore': [['*.egg-info/\n', '*.egg-info/\n.mypy_cache/\n']],
    },
    run: [`${PIP} -r requirements.txt`],
    wrong: [
      { name: 'did nothing', fails: [0, 1, 2, 3] },
      { name: 'said split_words returns a list of anything', edit: [['def split_words(text: str) -> list[str]:', 'def split_words(text: str) -> list:']], fails: [1] },
    ],
  },
  [`${E}/01-03-a-module-with-types#Your turn: no errors from mypy`]: {
    files: { 'src/frontier/text.py': answer(E, 'text-1.3.py') },
    wrong: [
      { name: 'did nothing', fails: [0, 1, 2, 3] },
      { name: 'left the counts variable without a hint', files: { 'src/frontier/text.py': answerWith(E, 'text-1.3.py', [['counts: dict[str, int] = {}', 'counts = {}']]) }, fails: [0] },
      {
        name: 'asked tally for a list',
        files: { 'src/frontier/text.py': answerWith(E, 'text-1.3.py', [['from collections.abc import Iterable\n', ''], ['items: Iterable[str]', 'items: list[str]']]) },
        fails: [2],
      },
    ],
  },
  [`${E}/01-03-a-module-with-types#Bring it into \`main\``]: {
    run: [...COMMIT('Move the counting functions into frontier.text'), 'git switch main', 'git merge -q package', 'git branch -d package'],
    wrong: [{ name: 'did nothing', fails: [0, 1, 3] }],
  },
};
