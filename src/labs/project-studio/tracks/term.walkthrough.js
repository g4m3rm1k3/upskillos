// What a learner does at each step of the Terminal series, for the walkthrough test
// (term.desktop.test.js). Keyed "<chapter>/<lesson file name>#<step title>". The guide is
// docs/contributing/project-studio-series.md; this series' plan is docs/terminal-series-plan.md.
// Commands are zsh, as the learner types them. Each check has at least one wrong answer that it
// alone catches.

const S = 'term-basics';

// The README as 1.3 builds it.
const README = [
  'echo "# Shelf" > README.md',
  'echo "" >> README.md',
  'echo "A bookmark manager with a Node backend and a plain HTML, CSS and JavaScript frontend." >> README.md',
];
const BOOKMARK = `echo '[{"title":"Neovim","url":"https://neovim.io"}]' > data/bookmarks.json`;

export const WALKTHROUGH = {
  // ── 1.1 ──────────────────────────────────────────────────────────────────
  [`${S}/01-01-the-prompt-pwd-and-ls#Make Shelf's folders: mkdir`]: {
    run: ['mkdir server public data test'],
    wrong: [
      { name: 'did nothing', fails: [0, 1, 2, 3] },
      { name: 'forgot server', run: ['mkdir public data test'], fails: [0] },
      { name: 'forgot public', run: ['mkdir server data test'], fails: [1] },
      { name: 'forgot data', run: ['mkdir server public test'], fails: [2] },
      { name: 'files, not folders', run: ['mkdir server public data', 'touch test'], fails: [3] },
    ],
  },
  [`${S}/01-01-the-prompt-pwd-and-ls#Your turn: a folder for practice`]: {
    run: ['mkdir practice', 'ls -l'],
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      { name: 'capitalised', run: ['mkdir Practice'], fails: [1] },
    ],
  },

  // ── 1.2 ──────────────────────────────────────────────────────────────────
  [`${S}/01-02-moving-around#Folders inside folders: mkdir -p`]: {
    run: ['mkdir -p test/fixtures', 'ls test'],
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'made notes with -p while experimenting', run: ['mkdir -p notes/today test/fixtures'], fails: [1] },
    ],
  },
  [`${S}/01-02-moving-around#Empty files: touch`]: {
    run: ['touch server/server.js server/routes.js server/store.js', 'ls -l server'],
    wrong: [
      { name: 'only server.js', run: ['touch server/server.js'], fails: [1, 2] },
      { name: 'forgot the folder for server.js', run: ['touch server.js server/routes.js server/store.js'], fails: [0, 3] },
    ],
  },
  [`${S}/01-02-moving-around#Your turn: the frontend's three files`]: {
    run: ['cd public && touch index.html style.css app.js && cd ..', 'ls -l public'],
    wrong: [
      { name: 'did nothing', fails: [0, 1, 2] },
      { name: 'forgot style.css', run: ['cd public && touch index.html app.js'], fails: [1] },
      { name: 'forgot app.js', run: ['cd public && touch index.html style.css'], fails: [2] },
      { name: 'stayed in the project folder', run: ['touch index.html public/style.css public/app.js'], fails: [0, 3] },
    ],
  },

  // ── 1.3 ──────────────────────────────────────────────────────────────────
  [`${S}/01-03-writing-and-reading-files#Add to the end: >>`]: {
    run: [...README, 'cat README.md'],
    wrong: [
      { name: 'lost the heading', run: ['echo "" > README.md', README[2]], fails: [0] },
      { name: 'no blank line', run: [README[0], README[2]], fails: [1, 3] },
      { name: 'used > for the description', run: [README[0], README[1], README[2].replace('>>', '>')], fails: [0, 3] },
      { name: 'forgot the description', run: [README[0], README[1], 'echo "Bookmarks." >> README.md'], fails: [2] },
      { name: 'appended the description twice', run: [...README, README[2]], fails: [3] },
    ],
  },
  [`${S}/01-03-writing-and-reading-files#Your turn: Shelf's first bookmark`]: {
    run: [BOOKMARK, 'cat data/bookmarks.json'],
    wrong: [
      { name: 'did nothing', fails: [0, 1, 2, 3] },
      { name: 'double quotes ate the inner quotes', run: [`echo "[{"title":"Neovim","url":"https://neovim.io"}]" > data/bookmarks.json`], allowFailure: true, fails: [1] },
      { name: 'left out the brackets', run: [`echo '{"title":"Neovim","url":"https://neovim.io"}' > data/bookmarks.json`], fails: [2] },
      { name: 'appended twice', run: [BOOKMARK, BOOKMARK.replace('>', '>>')], fails: [3] },
    ],
  },

  // ── 1.4 ──────────────────────────────────────────────────────────────────
  [`${S}/01-04-copy-move-delete#Copy a file: cp`]: {
    run: ['cp data/bookmarks.json test/fixtures/bookmarks.json'],
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      { name: 'an empty file instead of a copy', run: ['touch test/fixtures/bookmarks.json'], fails: [1] },
    ],
  },
  [`${S}/01-04-copy-move-delete#Move and rename: mv`]: {
    run: ['echo "ideas for Shelf" > draft.txt', 'mv draft.txt practice/', 'mv practice/draft.txt practice/ideas.txt'],
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'copied instead of moving', run: ['echo "ideas for Shelf" > draft.txt', 'cp draft.txt practice/ideas.txt'], fails: [1] },
      { name: 'copied, then renamed the copy', run: ['echo "ideas for Shelf" > draft.txt', 'mv draft.txt practice/', 'cp practice/draft.txt practice/ideas.txt'], fails: [2] },
    ],
  },
  [`${S}/01-04-copy-move-delete#Delete: rm, and why there's no undo`]: {
    run: ['rm practice/ideas.txt'],
    wrong: [
      { name: 'deleted the whole practice folder', run: ['rm -r practice'], fails: [0] },
      { name: 'did nothing', fails: [1] },
    ],
  },
  [`${S}/01-04-copy-move-delete#Your turn: back up the backend, then remove the backup`]: {
    run: ['cp -r server practice/server-backup', 'ls practice/server-backup', 'rm -r practice/server-backup'],
    wrong: [
      { name: 'kept the backup', run: ['cp -r server practice/server-backup'], fails: [0] },
      { name: 'deleted server instead', run: ['cp -r server practice/server-backup', 'rm -r practice/server-backup', 'rm server/server.js'], fails: [1] },
      { name: 'deleted routes.js', run: ['rm server/routes.js'], fails: [2] },
      { name: 'deleted store.js', run: ['rm server/store.js'], fails: [3] },
    ],
  },

  // ── 1.5 ──────────────────────────────────────────────────────────────────
  [`${S}/01-05-programs-path-and-help#Ask Node whether the JSON is valid`]: {
    wrong: [
      { name: 'JSON with a missing quote', run: [`echo '[{"title":"Neovim,"url":"https://neovim.io"}]' > data/bookmarks.json`], fails: [0] },
    ],
  },
  [`${S}/01-05-programs-path-and-help#Your turn: record the Node version in the README`]: {
    run: ['echo "Built with Node $(node --version)" >> README.md', 'cat README.md'],
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'typed a made-up version', run: ['echo "Built with Node v1.0.0" >> README.md'], fails: [0] },
      { name: 'single quotes kept $(...) as text', run: [`echo 'Built with Node $(node --version)' >> README.md`], fails: [0] },
      { name: 'used > and wiped the README', run: ['echo "Built with Node $(node --version)" > README.md'], fails: [1] },
      { name: 'appended twice', run: ['echo "Built with Node $(node --version)" >> README.md', 'echo "Built with Node $(node --version)" >> README.md'], fails: [2] },
    ],
  },
};
