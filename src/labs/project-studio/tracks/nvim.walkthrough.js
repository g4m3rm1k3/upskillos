// What a learner does at each step of the Neovim series, for the walkthrough test
// (nvim.desktop.test.js). Keyed "<chapter>/<lesson file name>#<step title>". The guide is
// docs/contributing/project-studio-series.md; this series' plan is docs/neovim-series-plan.md.
//
// Neovim keystrokes can't be replayed, so a step's file is written as the learner's edits would
// leave it (the default), and `run` holds shell commands. Each check has at least one wrong answer
// that it alone catches.
import fs from 'node:fs';

export function answer(track, name) {
  return fs.readFileSync(new URL(`./${track}/answers/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
}

const E = 'nvim-start';
const M = 'nvim-motions';
const O = 'nvim-operators';
const T = 'nvim-textobjects';

// A Your turn answer with one change: how its wrong answers are made.
function answerWith(track, name, pairs) {
  let content = answer(track, name);
  for (const [from, to] of pairs) {
    if (!content.includes(from)) throw new Error(`Wrong answer edit not found in ${track}/answers/${name}: ${from}`);
    content = content.replace(from, to);
  }
  return content;
}

// A drill done for real: `keys` (Vim key notation, such as `ciwthere<Esc>:w<CR>`) is typed into
// headless Neovim on `file`, with the same keystroke recorder the app loads into every editor
// session (desktop/app/runtimes/neovim-practice.lua). Neovim then writes the file and the
// .practice/keystrokes.jsonl record a `keys` check reads, exactly as the learner's session would.
// nvim.desktop.test.js sets NVIM_BIN and PRACTICE_LUA. The keys go through a file so that no
// character in them means anything to the shell.
export function drill(file, keys) {
  const quoted = `'${keys.replace(/'/g, `'\\''`)}'`;
  return `printf '%s' ${quoted} > .drill-keys && "$NVIM_BIN" --clean --headless --cmd "lua dofile(os.getenv('PRACTICE_LUA'))" '${file}' -c "lua vim.api.nvim_feedkeys(vim.keycode(io.open('.drill-keys'):read('a') .. '<Esc>:qa!<CR>'), 't', false)" > /dev/null 2>&1; rm -f .drill-keys`;
}

// The maze line 1.2 asks the learner to take the * out of.
const MAZE_LINE = '### # * # ###';

// The two edits 4.4's first step makes to routes.js.
const PAGES_IMPORT = ["import { readBookmarks, writeBookmarks } from './store.js';", "import { readBookmarks, writeBookmarks } from './store.js';\nimport { homePage } from './pages.js';"];
const HOME_PAGE_ROUTE = ["  'GET /': home,", "  'GET /': homePage,"];

// The bookmark in 2.5's sample data with no comma after it, and the fix.
const MISSING_COMMA = '"url": "https://vim-adventures.com"\n  }\n';
const FIXED_COMMA = '"url": "https://vim-adventures.com"\n  },\n';

export const WALKTHROUGH = {
  // ── 1.1 ──────────────────────────────────────────────────────────────────
  [`${E}/01-01-modes-insert-save-quit#Get the starter project`]: {
    wrong: [
      { name: 'never created the files', fails: [0, 1] },
      { name: 'made server.js but no practice folder', run: ['mkdir -p server', 'touch server/server.js'], fails: [1] },
    ],
  },
  // ── 1.1 (continued) ──────────────────────────────────────────────────────────────────
  [`${E}/01-01-modes-insert-save-quit#Command-line mode: save with :w`]: {
    wrong: [
      { name: 'typed but never saved', files: { 'server/server.js': '' }, fails: [0, 1] },
      { name: 'double quotes', files: { 'server/server.js': 'console.log("Shelf is starting");\n' }, fails: [0] },
    ],
  },
  [`${E}/01-01-modes-insert-save-quit#Quit: :q, :wq and :q!`]: {
    wrong: [
      { name: 'saved stray typing into the heading', editFiles: { 'README.md': [['# Shelf', '# Shelfjjk']] }, fails: [0] },
      { name: 'saved server code into the README', run: [`echo "console.log('Shelf is starting');" >> README.md`], fails: [1] },
    ],
  },
  [`${E}/01-01-modes-insert-save-quit#Your turn: a file of your own, from the terminal`]: {
    files: { 'practice/hello.txt': 'Hello from Neovim\n' },
    wrong: [
      { name: 'quit with :q! instead of saving', fails: [0, 1] },
      { name: 'lowercase', files: { 'practice/hello.txt': 'hello from neovim\n' }, fails: [1] },
    ],
  },

  // ── 1.2 ──────────────────────────────────────────────────────────────────
  [`${E}/01-02-open-move-new-lines#Open or create a file by name: :e`]: {
    wrong: [
      { name: 'never saved', fails: [0, 1, 2, 3] },
      { name: 'tabs', files: { '.editorconfig': 'root = true\n\n[*]\nindent_style = tab\nindent_size = 2\n' }, fails: [1] },
      { name: 'four spaces', files: { '.editorconfig': 'root = true\n\n[*]\nindent_style = space\nindent_size = 4\n' }, fails: [2] },
      { name: 'no section', files: { '.editorconfig': 'root = true\nindent_style = space\nindent_size = 2\n' }, fails: [3] },
    ],
  },
  [`${E}/01-02-open-move-new-lines#Move with h j k l, and delete a character with x`]: {
    run: [drill('practice/maze.txt', 'jjjjjjllllllx:w<CR>')],
    wrong: [
      { name: 'arrow keys', typeFile: true, run: [drill('practice/maze.txt', '<Down><Down><Down><Down><Down><Down>llllllx:w<CR>')], fails: [3] },
      { name: 'a detour', typeFile: true, run: [drill('practice/maze.txt', 'jjjjjjjkllllllx:w<CR>')], fails: [3] },
      { name: 'never pressed x', typeFile: true, fails: [0] },
      { name: 'deleted a wall too', typeFile: true, editFiles: { 'practice/maze.txt': [[MAZE_LINE, '### # # ###']] }, fails: [1] },
      { name: 'deleted the whole line', typeFile: true, editFiles: { 'practice/maze.txt': [[`${MAZE_LINE}\n`, '']] }, fails: [2] },
    ],
  },
  [`${E}/01-02-open-move-new-lines#package.json: what npm reads`]: {
    run: ['npm start'],
    wrong: [
      { name: 'a missing comma', files: { 'package.json': '{\n  "name": "shelf"\n  "scripts": {\n    "start": "node server/server.js"\n  }\n}\n' }, fails: [0, 1, 2] },
      { name: 'a capital S in the name', files: { 'package.json': '{\n  "name": "Shelf",\n  "scripts": {\n    "start": "node server/server.js"\n  }\n}\n' }, fails: [1] },
      { name: 'the wrong script path', files: { 'package.json': '{\n  "name": "shelf",\n  "scripts": {\n    "start": "node server.js"\n  }\n}\n' }, fails: [2] },
    ],
  },
  [`${E}/01-02-open-move-new-lines#Open a new line: o and O`]: {
    wrong: [
      { name: 'no version', typeFile: true, edit: [['  "version": "0.1.0",\n', '']], fails: [0] },
      { name: 'no type', typeFile: true, edit: [['  "type": "module",\n', '']], fails: [1] },
      { name: 'the comma deleted and never restored', typeFile: true, edit: [['"type": "module",', '"type": "module"']], fails: [0, 1, 2] },
    ],
  },
  [`${E}/01-02-open-move-new-lines#Your turn: describe the project`]: {
    files: { 'package.json': answer(E, 'package.json') },
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      { name: 'opened the line below scripts', files: { 'package.json': answerWith(E, 'package.json', [['  "description": "A bookmark manager with a Node backend and a plain HTML frontend",\n', ''], ['  }\n}', '  },\n  "description": "A bookmark manager with a Node backend and a plain HTML frontend"\n}']]) }, fails: [1] },
      { name: 'no comma', files: { 'package.json': answerWith(E, 'package.json', [['plain HTML frontend",', 'plain HTML frontend"']]) }, fails: [0, 1, 2] },
    ],
  },

  // ── 1.3 ──────────────────────────────────────────────────────────────────
  [`${E}/01-03-insert-variants-and-a-server#Import Node's http module, with O`]: {
    wrong: [
      { name: 'a typo in import', typeFile: true, edit: [['import http', 'imprt http']], fails: [0, 1] },
      { name: 'never saved', fails: [1] },
    ],
  },
  [`${E}/01-03-insert-variants-and-a-server#Create the server`]: {
    wrong: [
      { name: 'no server', typeFile: true, edit: [['http.createServer((request, response) => {', 'http.createServer(() => {']], fails: [0] },
      { name: 'a single bar', typeFile: true, edit: [['process.env.PORT || 3000', 'process.env.PORT | 3000']], fails: [1] },
      { name: 'a missing bracket', typeFile: true, edit: [['});', '}']], fails: [2] },
    ],
  },
  [`${E}/01-03-insert-variants-and-a-server#Listen, and ask for a page`]: {
    wrong: [
      { name: 'never listens', fails: [0, 1] },
      { name: 'single quotes around the message', typeFile: true, edit: [['`Shelf is listening on http://localhost:${port}`', "'Shelf is listening on http://localhost:${port}'"]], fails: [1] },
    ],
  },
  [`${E}/01-03-insert-variants-and-a-server#Change the start or end of a line: I and A`]: {
    wrong: [
      { name: 'not commented out', typeFile: true, edit: [["// console.log('Shelf is starting');", "console.log('Shelf is starting');"]], fails: [0] },
      { name: 'no comment on the port line', typeFile: true, edit: [[' // 3000 unless PORT is set', '']], fails: [1] },
      { name: 'commented out the port line with I', typeFile: true, edit: [['const port = process.env.PORT || 3000; // 3000 unless PORT is set', '// const port = process.env.PORT || 3000; // 3000 unless PORT is set']], fails: [2] },
    ],
  },
  [`${E}/01-03-insert-variants-and-a-server#Your turn: say which port`]: {
    files: { 'server/server.js': answer(E, 'server-port.js') },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'single quotes', files: { 'server/server.js': answerWith(E, 'server-port.js', [['response.end(`Shelf is running on port ${port}\\n`)', "response.end('Shelf is running on port ${port}\\n')"]]) }, fails: [0, 1] },
      { name: 'changed the listen message too', files: { 'server/server.js': answerWith(E, 'server-port.js', [['Shelf is listening on', 'Shelf listens on']]) }, fails: [2] },
    ],
  },

  // ── 1.4 ──────────────────────────────────────────────────────────────────
  [`${E}/01-04-undo-fix-and-help#Undo and redo: u and Ctrl+R`]: {
    wrong: [
      { name: 'saved the practice line', run: ["echo 'this is not JavaScript' >> server/server.js"], fails: [0, 1] },
    ],
  },
  [`${E}/01-04-undo-fix-and-help#Replace one character: r`]: {
    run: [drill('practice/typos.txt', 'lllllllllrtjrejhhhhhhhx:w<CR>')],
    wrong: [
      { name: 'over par', typeFile: true, run: [drill('practice/typos.txt', 'lllllllllrtjrejhhhhhhhhlx:w<CR>')], fails: [3] },
      { name: 'arrow keys', typeFile: true, run: [drill('practice/typos.txt', '<Right><Right><Right><Right><Right><Right><Right><Right><Right>rtjrejhhhhhhhx:w<CR>')], fails: [3] },
      { name: 'line 1 left', typeFile: true, editFiles: { 'practice/typos.txt': [['requsst', 'request'], ['Prress', 'Press']] }, fails: [0] },
      { name: 'replaced the second s', typeFile: true, editFiles: { 'practice/typos.txt': [['lisnens', 'listens'], ['requsst', 'requset'], ['Prress', 'Press']] }, fails: [1] },
      { name: 'line 3 left', typeFile: true, editFiles: { 'practice/typos.txt': [['lisnens', 'listens'], ['requsst', 'request']] }, fails: [2] },
    ],
  },
  [`${E}/01-04-undo-fix-and-help#Jump to the line in an error message`]: {
    wrong: [
      { name: 'still misspelled', editFiles: { 'server/server.js': [['response.end(', 'respnse.end(']] }, fails: [0, 1] },
    ],
  },
  [`${E}/01-04-undo-fix-and-help#Your turn: log every request`]: {
    files: { 'server/server.js': answer(E, 'server-log.js') },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'logged only the method', files: { 'server/server.js': answerWith(E, 'server-log.js', [['console.log(request.method, request.url);', 'console.log(request.method);']]) }, fails: [0] },
      { name: 'replaced the answer with the log', files: { 'server/server.js': answerWith(E, 'server-log.js', [['  response.end(`Shelf is running on port ${port}\\n`);\n', '']]) }, fails: [1] },
      { name: 'printed it at startup instead', files: { 'server/server.js': answerWith(E, 'server-port.js', [["// console.log('Shelf is starting');", "console.log('GET', '/hello');"]]) }, fails: [2] },
    ],
  },

  // ── Drills and review rounds (typed for real into headless Neovim) ─────────
  [`${E}/01-01-modes-insert-save-quit#Drill: insert, Esc, save`]: {
    run: [drill('practice/drills/01-insert.txt', 'iShelf <Esc>:w<CR>')],
    wrong: [
      { name: 'arrow keys', typeFile: true, run: [drill('practice/drills/01-insert.txt', 'iShelf <Left><Right><Esc>:w<CR>')], fails: [2] },
      { name: 'over par', typeFile: true, run: [drill('practice/drills/01-insert.txt', 'iShelff<BS> <Esc>:w<CR>')], fails: [2] },
      { name: 'no space', typeFile: true, run: [drill('practice/drills/01-insert.txt', 'iShelf<Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${E}/01-02-open-move-new-lines#Drill: a line below`]: {
    run: [drill('practice/drills/02-below.txt', 'osecond<Esc>:w<CR>')],
    wrong: [
      { name: 'moved, then opened above', typeFile: true, run: [drill('practice/drills/02-below.txt', 'jOsecond<Esc>:w<CR>')], fails: [4] },
      { name: 'opened above the first line', typeFile: true, run: [drill('practice/drills/02-below.txt', 'Osecond<Esc>:w<CR>')], fails: [0, 1] },
    ],
  },
  [`${E}/01-02-open-move-new-lines#Drill: a line above`]: {
    run: [drill('practice/drills/03-above.txt', 'Oone<Esc>:w<CR>')],
    wrong: [
      { name: 'typed it with i and Enter', typeFile: true, run: [drill('practice/drills/03-above.txt', 'ione<CR><Esc>:w<CR>')], fails: [4] },
      { name: 'opened below', typeFile: true, run: [drill('practice/drills/03-above.txt', 'oone<Esc>:w<CR>')], fails: [0, 1] },
    ],
  },
  [`${E}/01-02-open-move-new-lines#Review: insert before the cursor`]: {
    run: [drill('practice/review/01-02.txt', 'ia <Esc>:w<CR>')],
    wrong: [
      { name: 'arrow keys', typeFile: true, run: [drill('practice/review/01-02.txt', 'ia <Left><Right><Esc>:w<CR>')], fails: [2] },
      { name: 'appended at the end', typeFile: true, run: [drill('practice/review/01-02.txt', 'Aa <Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${E}/01-03-insert-variants-and-a-server#Drill: add to the end of a line`]: {
    run: [drill('practice/drills/04-end.txt', 'A;<Esc>:w<CR>')],
    wrong: [
      { name: 'walked to the end with l', typeFile: true, run: [drill('practice/drills/04-end.txt', 'lllllllllllllllla;<Esc>:w<CR>')], fails: [2] },
      { name: 'inserted at the start', typeFile: true, run: [drill('practice/drills/04-end.txt', 'i;<Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${E}/01-03-insert-variants-and-a-server#Drill: comment out an indented line`]: {
    run: [drill('practice/drills/05-start.txt', 'jI// <Esc>:w<CR>')],
    wrong: [
      { name: 'i in the first column', typeFile: true, run: [drill('practice/drills/05-start.txt', 'ji// <Esc>:w<CR>')], fails: [1] },
      { name: 'walked past the spaces first', typeFile: true, run: [drill('practice/drills/05-start.txt', 'jlli// <Esc>:w<CR>')], fails: [3] },
    ],
  },
  [`${E}/01-03-insert-variants-and-a-server#Drill: insert after a character`]: {
    run: [drill('practice/drills/06-after.txt', 'lllla <Esc>:w<CR>')],
    wrong: [
      { name: 'i one further along', typeFile: true, run: [drill('practice/drills/06-after.txt', 'llllli <Esc>:w<CR>')], fails: [2] },
      { name: 'one too early', typeFile: true, run: [drill('practice/drills/06-after.txt', 'llla <Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${E}/01-03-insert-variants-and-a-server#Review: a new line, and a stray letter`]: {
    run: [drill('practice/review/01-03.txt', 'lllxomiddle line<Esc>:w<CR>')],
    wrong: [
      { name: 'arrow keys', typeFile: true, run: [drill('practice/review/01-03.txt', '<Right><Right><Right>xomiddle line<Esc>:w<CR>')], fails: [4] },
      { name: 'forgot the letter', typeFile: true, run: [drill('practice/review/01-03.txt', 'omiddle line<Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${E}/01-04-undo-fix-and-help#Drill: jump to a line`]: {
    run: [drill('practice/drills/07-jump.txt', ':23<CR>A<BS><Esc>:w<CR>')],
    wrong: [
      { name: 'walked down with j', typeFile: true, run: [drill('practice/drills/07-jump.txt', 'jjjjjjjjjjjjjjjjjjjjjjA<BS><Esc>:w<CR>')], fails: [2] },
      { name: 'the wrong line', typeFile: true, run: [drill('practice/drills/07-jump.txt', ':22<CR>A<BS><Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${E}/01-04-undo-fix-and-help#Review: comment out, add to the end`]: {
    run: [drill('practice/review/01-04.txt', 'jA;<Esc>I// <Esc>:w<CR>')],
    wrong: [
      { name: 'forgot the comment', typeFile: true, run: [drill('practice/review/01-04.txt', 'jA;<Esc>:w<CR>')], fails: [1] },
      { name: 'arrow keys', typeFile: true, run: [drill('practice/review/01-04.txt', '<Down>A;<Esc>I// <Esc>:w<CR>')], fails: [4] },
    ],
  },
  // ── 2.1 ──────────────────────────────────────────────────────────────────
  [`${M}/02-01-words-w-b-e#A routes file for Shelf`]: {
    wrong: [
      { name: 'a path from the current folder', typeFile: true, edit: [["'../data/bookmarks.json'", "'data/bookmarks.json'"]], fails: [0, 1] },
      { name: 'plain text', typeFile: true, edit: [["'application/json'", "'text/plain'"]], fails: [1] },
    ],
  },
  [`${M}/02-01-words-w-b-e#Route /api/bookmarks to it`]: {
    wrong: [
      { name: 'no import', typeFile: true, edit: [["import { listBookmarks } from './routes.js';\n", '']], fails: [0] },
      { name: 'a single = in the if', typeFile: true, edit: [["request.url === '/api/bookmarks'", "request.url = '/api/bookmarks'"]], fails: [1] },
    ],
  },
  [`${M}/02-01-words-w-b-e#What return is for`]: {
    wrong: [
      { name: 'still commented out', editFiles: { 'server/server.js': [['    return;', '    // return;']] }, fails: [0, 1] },
      { name: 'deleted return instead', editFiles: { 'server/server.js': [['    return;\n', '']] }, fails: [0] },
    ],
  },
  [`${M}/02-01-words-w-b-e#Apply: rewrite the README by words`]: {
    wrong: [
      { name: 'no comma after backend', typeFile: true, edit: [['backend, a JSON API', 'backend a JSON API']], fails: [0] },
      { name: 'typed into the heading', typeFile: true, edit: [['# Shelf', '# Shelfw']], fails: [1] },
    ],
  },
  [`${M}/02-01-words-w-b-e#Drill: forward by words`]: {
    run: [drill('practice/drills/08-words.txt', 'wwwiown <Esc>:w<CR>')],
    wrong: [
      { name: 'walked with l', typeFile: true, run: [drill('practice/drills/08-words.txt', 'lllllllllllllllllown <Esc>:w<CR>')], fails: [2] },
      { name: 'arrow keys', typeFile: true, run: [drill('practice/drills/08-words.txt', 'ww<Right>wiown <Esc>:w<CR>')], fails: [2] },
      { name: 'one word too far', typeFile: true, run: [drill('practice/drills/08-words.txt', 'wwwwiown <Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${M}/02-01-words-w-b-e#Drill: to the end of a word`]: {
    run: [drill('practice/drills/09-end.txt', 'eeeas<Esc>:w<CR>')],
    wrong: [
      { name: 'w and then back', typeFile: true, run: [drill('practice/drills/09-end.txt', 'wwwhis<Esc>:w<CR>')], fails: [2] },
      { name: 'the wrong word', typeFile: true, run: [drill('practice/drills/09-end.txt', 'eeas<Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${M}/02-01-words-w-b-e#Drill: back by words`]: {
    run: [drill('practice/drills/10-back.txt', "A';<Esc>bbi'<Esc>:w<CR>")],
    wrong: [
      { name: 'the front first', typeFile: true, run: [drill('practice/drills/10-back.txt', "wwwi'<Esc>A';<Esc>:w<CR>")], fails: [2] },
      { name: 'one b', typeFile: true, run: [drill('practice/drills/10-back.txt', "A';<Esc>bi'<Esc>:w<CR>")], fails: [0] },
    ],
  },
  [`${M}/02-01-words-w-b-e#Review: a line above, a wrong letter`]: {
    run: [drill('practice/review/02-01.txt', 'Oone<Esc>jjllre:w<CR>')],
    wrong: [
      { name: 'arrow keys', typeFile: true, run: [drill('practice/review/02-01.txt', 'Oone<Esc><Down><Down>llre:w<CR>')], fails: [4] },
      { name: 'opened below', typeFile: true, run: [drill('practice/review/02-01.txt', 'oone<Esc>jllre:w<CR>')], fails: [0, 1] },
    ],
  },
  [`${M}/02-01-words-w-b-e#Your turn: don't keep a stale copy`]: {
    files: { 'server/routes.js': answer(M, 'routes-cache.js') },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'lowercase header name', files: { 'server/routes.js': answerWith(M, 'routes-cache.js', [["'Cache-Control'", "'cache-control'"]]) }, fails: [0] },
      { name: 'replaced the Content-Type line', files: { 'server/routes.js': answerWith(M, 'routes-cache.js', [["  response.setHeader('Content-Type', 'application/json');\n", '']]) }, fails: [1] },
      { name: 'ended without the text', files: { 'server/routes.js': answerWith(M, 'routes-cache.js', [['response.end(text);', 'response.end();']]) }, fails: [2] },
    ],
  },

  // ── 2.2 ──────────────────────────────────────────────────────────────────
  [`${M}/02-02-words-and-line-ends#Apply: a charset, from the end of a line`]: {
    wrong: [
      { name: 'no charset', typeFile: true, edit: [["'application/json; charset=utf-8'", "'application/json'"]], fails: [0] },
    ],
  },
  [`${M}/02-02-words-and-line-ends#A health handler`]: {
    wrong: [
      { name: 'sent the object itself', typeFile: true, edit: [['response.end(JSON.stringify({ ok: true }));', 'response.end({ ok: true });']], fails: [0] },
    ],
  },
  [`${M}/02-02-words-and-line-ends#Apply: fix the import with W and E`]: {
    wrong: [
      { name: 'import still missing', typeFile: true, edit: [['{ listBookmarks, health }', '{ listBookmarks }']], fails: [0] },
      { name: 'replaced listBookmarks', typeFile: true, edit: [['{ listBookmarks, health }', '{ health }']], fails: [1] },
    ],
  },
  [`${M}/02-02-words-and-line-ends#Apply: name the service with W, E and a`]: {
    wrong: [
      { name: 'no name', typeFile: true, edit: [["{ ok: true, name: 'shelf' }", '{ ok: true }']], fails: [0] },
    ],
  },
  [`${M}/02-02-words-and-line-ends#Drill: across WORDs`]: {
    run: [drill('practice/drills/11-word.txt', 'WWi-i <Esc>:w<CR>')],
    wrong: [
      { name: 'small words', typeFile: true, run: [drill('practice/drills/11-word.txt', 'wwwi-i <Esc>:w<CR>')], fails: [2] },
      { name: 'after curl', typeFile: true, run: [drill('practice/drills/11-word.txt', 'Ea -i<Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${M}/02-02-words-and-line-ends#Drill: just before the end`]: {
    run: [drill('practice/drills/12-before-end.txt', '$hi, 3002<Esc>:w<CR>')],
    wrong: [
      { name: 'End key', typeFile: true, run: [drill('practice/drills/12-before-end.txt', '<End>hi, 3002<Esc>:w<CR>')], fails: [2] },
      { name: 'after the bracket', typeFile: true, run: [drill('practice/drills/12-before-end.txt', '$i, 3002<Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${M}/02-02-words-and-line-ends#Drill: the first character, from the end`]: {
    run: [drill('practice/drills/13-first.txt', 'A;<Esc>ja;<Esc>^rc:w<CR>')],
    wrong: [
      { name: 'line 2 first, then back up', typeFile: true, run: [drill('practice/drills/13-first.txt', 'jA;<Esc>^rckA;<Esc>:w<CR>')], fails: [3] },
      { name: '0 instead of ^', typeFile: true, run: [drill('practice/drills/13-first.txt', 'A;<Esc>ja;<Esc>0rc:w<CR>')], fails: [1] },
    ],
  },
  [`${M}/02-02-words-and-line-ends#Review: a word in the middle, and the end`]: {
    run: [drill('practice/review/02-02.txt', 'wwwihttp.<Esc>A;<Esc>:w<CR>')],
    wrong: [
      { name: 'walked with l', typeFile: true, run: [drill('practice/review/02-02.txt', 'lllllllllllllllihttp.<Esc>A;<Esc>:w<CR>')], fails: [2] },
      { name: 'no semicolon', typeFile: true, run: [drill('practice/review/02-02.txt', 'wwwihttp.<Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${M}/02-02-words-and-line-ends#Your turn: a second path for health`]: {
    files: { 'server/server.js': answer(M, 'server-health.js') },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'changed the path instead', files: { 'server/server.js': answerWith(M, 'server-health.js', [["request.url === '/api/health' || request.url === '/health'", "request.url === '/health'"]]) }, fails: [1] },
      { name: 'half a comparison', files: { 'server/server.js': answerWith(M, 'server-health.js', [["|| request.url === '/health'", "|| '/health'"]]) }, fails: [2] },
    ],
  },

  // ── 2.3 ──────────────────────────────────────────────────────────────────
  [`${M}/02-03-find-in-a-line#Apply: timestamps in the log, with f( and a`]: {
    wrong: [
      { name: 'no timestamp', typeFile: true, edit: [['new Date().toISOString(), ', '']], fails: [0] },
    ],
  },
  [`${M}/02-03-find-in-a-line#Apply: uptime, with t} and i`]: {
    wrong: [
      { name: 'no uptime', typeFile: true, edit: [[', uptime: process.uptime()', '']], fails: [0] },
      { name: 'uptime first, with f{ and a', typeFile: true, edit: [["{ ok: true, name: 'shelf', uptime: process.uptime() }", "{ uptime: process.uptime(), ok: true, name: 'shelf' }"]], fails: [1] },
    ],
  },
  [`${M}/02-03-find-in-a-line#A method that isn't called`]: {
    wrong: [
      { name: 'parentheses not restored', editFiles: { 'server/routes.js': [['process.uptime()', 'process.uptime']] }, fails: [0] },
    ],
  },
  [`${M}/02-03-find-in-a-line#Drill: find a character`]: {
    run: [drill('practice/drills/14-find.txt', 'f/i:<Esc>:w<CR>')],
    wrong: [
      { name: 'words instead', typeFile: true, run: [drill('practice/drills/14-find.txt', 'wwwwea:<Esc>:w<CR>')], fails: [2] },
      { name: 'after the slash', typeFile: true, run: [drill('practice/drills/14-find.txt', 'f/a:<Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${M}/02-03-find-in-a-line#Drill: find, and find again`]: {
    run: [drill('practice/drills/15-again.txt', 'f;r,;r,:w<CR>')],
    wrong: [
      { name: 'a second find instead of ;', typeFile: true, run: [drill('practice/drills/15-again.txt', 'f;r,f;r,:w<CR>')], fails: [2] },
      { name: 'only the first', typeFile: true, run: [drill('practice/drills/15-again.txt', 'f;r,:w<CR>')], fails: [0] },
    ],
  },
  [`${M}/02-03-find-in-a-line#Drill: just before a character`]: {
    run: [drill('practice/drills/16-till.txt', 't,x:w<CR>')],
    wrong: [
      { name: 'find and step back', typeFile: true, run: [drill('practice/drills/16-till.txt', 'f,hx:w<CR>')], fails: [2] },
      { name: 'deleted the comma', typeFile: true, run: [drill('practice/drills/16-till.txt', 'f,x:w<CR>')], fails: [0] },
    ],
  },
  [`${M}/02-03-find-in-a-line#Drill: find backwards`]: {
    run: [drill('practice/drills/17-back.txt', 'A;<Esc>ja;<Esc>F/x:w<CR>')],
    wrong: [
      { name: 'line 2 first, then back up', typeFile: true, run: [drill('practice/drills/17-back.txt', 'jA;<Esc>F/xkA;<Esc>:w<CR>')], fails: [3] },
      { name: 'the first slash', typeFile: true, run: [drill('practice/drills/17-back.txt', 'A;<Esc>ja;<Esc>0f/x:w<CR>')], fails: [1] },
    ],
  },
  [`${M}/02-03-find-in-a-line#Review: a line by number, both ends`]: {
    run: [drill('practice/review/02-03.txt', ':12<CR>^rp$r;:w<CR>')],
    wrong: [
      { name: 'walked down with j', typeFile: true, run: [drill('practice/review/02-03.txt', 'jjjjjjjjjjj^rp$r;:w<CR>')], fails: [3] },
      { name: 'r in the first column', typeFile: true, run: [drill('practice/review/02-03.txt', ':12<CR>rp$r;:w<CR>')], fails: [0] },
    ],
  },
  [`${M}/02-03-find-in-a-line#Your turn: say what was asked for`]: {
    files: { 'server/server.js': answer(M, 'server-asked.js') },
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      { name: 'typed /hello in', files: { 'server/server.js': answerWith(M, 'server-asked.js', [['You asked for ${request.url}', 'You asked for /hello']]) }, fails: [1] },
      {
        name: 'answered before the routes',
        files: { 'server/server.js': answerWith(M, 'server-asked.js', [
          ['  response.end(`Shelf is running on port ${port}. You asked for ${request.url}\\n`);\n', ''],
          ['request.method, request.url);\n', 'request.method, request.url);\n  response.end(`Shelf is running on port ${port}. You asked for ${request.url}\\n`);\n'],
        ]) },
        fails: [2],
      },
    ],
  },

  // ── 2.4 ──────────────────────────────────────────────────────────────────
  [`${M}/02-04-jump-through-a-file#A header comment, with gg`]: {
    wrong: [
      { name: 'no comment', typeFile: true, edit: [["// Shelf's request handlers: one exported function for each route.\n", '']], fails: [0] },
      { name: 'Enter in the middle of the comment', typeFile: true, edit: [['request handlers: one exported', 'request handlers:\none exported']], fails: [1] },
    ],
  },
  [`${M}/02-04-jump-through-a-file#Count the bookmarks, with G`]: {
    wrong: [
      { name: 'counted the characters', typeFile: true, edit: [["JSON.parse(fs.readFileSync(DATA, 'utf8'))", "fs.readFileSync(DATA, 'utf8')"]], fails: [0] },
    ],
  },
  [`${M}/02-04-jump-through-a-file#Route it, with % and t`]: {
    wrong: [
      { name: 'not imported', typeFile: true, edit: [[', countBookmarks }', ' }']], fails: [0] },
      { name: 'typed over listBookmarks in the import', typeFile: true, edit: [['{ listBookmarks, health, countBookmarks }', '{ health, countBookmarks }']], fails: [1] },
    ],
  },
  [`${M}/02-04-jump-through-a-file#A missing brace, found with %`]: {
    wrong: [
      { name: 'brace still missing', editFiles: { 'server/server.js': [["    return;\n  }\n  if (request.url === '/api/bookmarks/count')", "    return;\n  \n  if (request.url === '/api/bookmarks/count')"]] }, fails: [0] },
    ],
  },
  [`${M}/02-04-jump-through-a-file#Drill: counts`]: {
    run: [drill('practice/drills/18-count.txt', '5j2wae<Esc>:w<CR>')],
    wrong: [
      { name: 'no count', typeFile: true, run: [drill('practice/drills/18-count.txt', 'jjjjjwwae<Esc>:w<CR>')], fails: [2] },
      { name: 'the wrong line', typeFile: true, run: [drill('practice/drills/18-count.txt', '4j2wae<Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${M}/02-04-jump-through-a-file#Drill: to the matching brace`]: {
    run: [drill('practice/drills/19-match.txt', '$%a // start<Esc>:w<CR>')],
    wrong: [
      { name: 'a count instead', typeFile: true, run: [drill('practice/drills/19-match.txt', '11jA // start<Esc>:w<CR>')], fails: [2] },
      { name: 'labelled the opening brace', typeFile: true, run: [drill('practice/drills/19-match.txt', 'A // start<Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${M}/02-04-jump-through-a-file#Drill: by blocks`]: {
    run: [drill('practice/drills/20-blocks.txt', '}}OPUT /api/bookmarks<Esc>:w<CR>')],
    wrong: [
      { name: 'a line number', typeFile: true, run: [drill('practice/drills/20-blocks.txt', '10GoPUT /api/bookmarks<Esc>:w<CR>')], fails: [4] },
      { name: 'below the blank line', typeFile: true, run: [drill('practice/drills/20-blocks.txt', '}}oPUT /api/bookmarks<Esc>:w<CR>')], fails: [0, 2] },
    ],
  },
  [`${M}/02-04-jump-through-a-file#Review: two finds on one line`]: {
    run: [drill('practice/review/02-04.txt', "f i,<Esc>f'aShelf <Esc>:w<CR>")],
    wrong: [
      { name: 'words to port', typeFile: true, run: [drill('practice/review/02-04.txt', "eeeeea,<Esc>f'aShelf <Esc>:w<CR>")], fails: [2] },
      { name: 'after ready', typeFile: true, run: [drill('practice/review/02-04.txt', "f i,<Esc>f';a Shelf<Esc>:w<CR>")], fails: [0, 2] },
    ],
  },
  [`${M}/02-04-jump-through-a-file#Your turn: say when there's nothing`]: {
    files: { 'server/routes.js': answer(M, 'routes-empty.js') },
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      { name: 'wrote false in', files: { 'server/routes.js': answerWith(M, 'routes-empty.js', [['empty: bookmarks.length === 0', 'empty: false']]) }, fails: [1] },
      { name: 'the wrong comparison', files: { 'server/routes.js': answerWith(M, 'routes-empty.js', [['empty: bookmarks.length === 0', 'empty: bookmarks.length < 5']]) }, fails: [0] },
    ],
  },

  // ── 2.5 ──────────────────────────────────────────────────────────────────
  [`${M}/02-05-scroll-and-the-screen#Sample data, too long for one screen`]: {
    run: [drill('data/sample-bookmarks.json', '36G^fpas<Esc>68G^fpas<Esc>100G^fpas<Esc>:w<CR>')],
    wrong: [
      { name: 'Page Down', typeFile: true, run: [drill('data/sample-bookmarks.json', '<PageDown>36G^fpas<Esc>68G^fpas<Esc>100G^fpas<Esc>:w<CR>')], fails: [2] },
      { name: 'missed one', typeFile: true, run: [drill('data/sample-bookmarks.json', '36G^fpas<Esc>68G^fpas<Esc>:w<CR>')], fails: [0, 1] },
      { name: 'damaged an address', typeFile: true, editFiles: { 'data/sample-bookmarks.json': [['"url": "https://www.lua.org"', '"url": "www.lua.org"']] }, run: [drill('data/sample-bookmarks.json', '36G^fpas<Esc>68G^fpas<Esc>100G^fpas<Esc>:w<CR>')], fails: [1] },
    ],
  },
  [`${M}/02-05-scroll-and-the-screen#Give Shelf the sample data`]: {
    before: ['cp data/sample-bookmarks.json data/bookmarks.json'],
    editFiles: { 'data/bookmarks.json': [[MISSING_COMMA, FIXED_COMMA]] },
    wrong: [
      { name: 'comma not fixed', before: ['cp data/sample-bookmarks.json data/bookmarks.json'], fails: [0, 1] },
      { name: 'never copied', fails: [1] },
      {
        name: 'copied before fixing the addresses',
        before: ['cp data/sample-bookmarks.json data/bookmarks.json'],
        editFiles: { 'data/bookmarks.json': [[MISSING_COMMA, FIXED_COMMA], ['https://git-scm.com', 'http://git-scm.com'], ['https://tc39.es', 'http://tc39.es'], ['https://www.mozilla.org', 'http://www.mozilla.org']] },
        fails: [2],
      },
    ],
  },
  [`${M}/02-05-scroll-and-the-screen#Review: the end of the last line`]: {
    run: [drill('practice/review/02-05.txt', 'G$xodone<Esc>:w<CR>')],
    wrong: [
      { name: 'walked down with j', typeFile: true, run: [drill('practice/review/02-05.txt', 'jjjjjjjjjjj$xodone<Esc>:w<CR>')], fails: [4] },
      { name: 'the comma on the wrong line', typeFile: true, run: [drill('practice/review/02-05.txt', 'Gk$xjodone<Esc>:w<CR>')], fails: [0, 2, 4] },
    ],
  },
  [`${M}/02-05-scroll-and-the-screen#Your turn: a bookmark of your own`]: {
    files: { 'data/bookmarks.json': answer(M, 'bookmarks.json') },
    wrong: [
      { name: 'did nothing', fails: [1] },
      { name: 'no comma before the new one', files: { 'data/bookmarks.json': answerWith(M, 'bookmarks.json', [['learnxinyminutes.com"\n  },', 'learnxinyminutes.com"\n  }']]) }, fails: [0, 1, 2] },
      { name: 'an http address', files: { 'data/bookmarks.json': answerWith(M, 'bookmarks.json', [['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers', 'http://developer.mozilla.org/en-US/docs/Web/HTTP/Headers']]) }, fails: [2] },
    ],
  },

  // ── 3.1 ──────────────────────────────────────────────────────────────────
  [`${O}/03-01-delete-with-a-motion#Apply: an old comment, with dd`]: {
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      { name: 'left the blank line', typeFile: true, edit: [['import { listBookmarks, health, countBookmarks } from \'./routes.js\';\n', 'import { listBookmarks, health, countBookmarks } from \'./routes.js\';\n\n']], fails: [1] },
      { name: 'deleted the port line instead of the blank one', typeFile: true, edit: [["const port = process.env.PORT || 3000; // 3000 unless PORT is set\n", '\n']], fails: [2] },
    ],
  },
  [`${O}/03-01-delete-with-a-motion#A helper for JSON answers`]: {
    wrong: [
      { name: 'no closing brace', typeFile: true, edit: [['  response.end(JSON.stringify(value));\n}\n', '  response.end(JSON.stringify(value));\n']], fails: [0] },
      { name: 'misspelt the name', typeFile: true, edit: [['function sendJson(', 'function sendJSON(']], fails: [1] },
      { name: 'values for value', typeFile: true, edit: [['JSON.stringify(value)', 'JSON.stringify(values)']], fails: [2] },
    ],
  },
  [`${O}/03-01-delete-with-a-motion#Apply: health with sendJson, d and a count`]: {
    wrong: [
      { name: 'a count too few', typeFile: true, edit: [["sendJson(response, { ok: true, name: 'shelf', uptime: process.uptime() });", "sendJson(response, JSON.stringify({ ok: true, name: 'shelf', uptime: process.uptime() }));"]], fails: [0] },
      { name: 'sendJson lost its header', typeFile: true, edit: [["function sendJson(response, value) {\n  response.setHeader('Content-Type', 'application/json; charset=utf-8');\n", 'function sendJson(response, value) {\n']], fails: [1] },
      { name: 'did nothing', fails: [2] },
    ],
  },
  [`${O}/03-01-delete-with-a-motion#A count too few`]: {
    wrong: [
      { name: 'left JSON.stringify in', editFiles: { 'server/routes.js': [["sendJson(response, { ok: true, name: 'shelf', uptime: process.uptime() });", "sendJson(response, JSON.stringify({ ok: true, name: 'shelf', uptime: process.uptime() }));"]] }, fails: [0] },
    ],
  },
  [`${O}/03-01-delete-with-a-motion#Drill: delete words`]: {
    run: [drill('practice/drills/21-delete-words.txt', 'Wd2w:w<CR>')],
    wrong: [
      { name: 'one word at a time with x', typeFile: true, run: [drill('practice/drills/21-delete-words.txt', 'Wxxxxxx:w<CR>')], fails: [2] },
      { name: 'deleted all three', typeFile: true, run: [drill('practice/drills/21-delete-words.txt', 'Wd3w:w<CR>')], fails: [0] },
    ],
  },
  [`${O}/03-01-delete-with-a-motion#Drill: delete to the end of the line`]: {
    run: [drill('practice/drills/22-delete-to-end.txt', 't/D:w<CR>')],
    wrong: [
      { name: 'found the semicolon and stepped on', typeFile: true, run: [drill('practice/drills/22-delete-to-end.txt', 'f;lD:w<CR>')], fails: [2] },
      { name: 'kept the space', typeFile: true, run: [drill('practice/drills/22-delete-to-end.txt', 'f/D:w<CR>')], fails: [0] },
    ],
  },
  [`${O}/03-01-delete-with-a-motion#Drill: delete lines`]: {
    run: [drill('practice/drills/23-delete-lines.txt', 'j3dd:w<CR>')],
    wrong: [
      { name: 'one line at a time', typeFile: true, run: [drill('practice/drills/23-delete-lines.txt', 'jdddddd:w<CR>')], fails: [3] },
      { name: 'started on line 1', typeFile: true, run: [drill('practice/drills/23-delete-lines.txt', '3dd:w<CR>')], fails: [1] },
    ],
  },
  [`${O}/03-01-delete-with-a-motion#Drill: delete to the end of the file`]: {
    run: [drill('practice/drills/24-delete-to-the-end.txt', 'jjdG:w<CR>')],
    wrong: [
      { name: 'line by line', typeFile: true, run: [drill('practice/drills/24-delete-to-the-end.txt', 'jjdddddddddddddd:w<CR>')], fails: [2] },
      { name: 'one line too early', typeFile: true, run: [drill('practice/drills/24-delete-to-the-end.txt', 'jdG:w<CR>')], fails: [0, 1] },
    ],
  },
  [`${O}/03-01-delete-with-a-motion#Review: two lines, fixed by finding`]: {
    run: [drill('practice/review/03-01.txt', 'j$rhGF\\r/;r/:w<CR>')],
    wrong: [
      { name: 'walked with l', typeFile: true, run: [drill('practice/review/03-01.txt', 'j$rhG0llllr/llllr/:w<CR>')], fails: [3] },
      { name: 'only one slash', typeFile: true, run: [drill('practice/review/03-01.txt', 'j$rhGF\\r/:w<CR>')], fails: [1] },
    ],
  },
  [`${O}/03-01-delete-with-a-motion#Your turn: count with sendJson`]: {
    files: { 'server/routes.js': answer(O, 'routes-sendjson.js') },
    wrong: [
      { name: 'did nothing', fails: [1] },
      { name: 'stringified twice', files: { 'server/routes.js': answerWith(O, 'routes-sendjson.js', [['sendJson(response, { count: bookmarks.length, empty: bookmarks.length === 0 });', 'sendJson(response, JSON.stringify({ count: bookmarks.length, empty: bookmarks.length === 0 }));']]) }, fails: [0] },
      { name: 'deleted the header but kept response.end', files: { 'server/routes.js': answerWith(O, 'routes-sendjson.js', [['sendJson(response, { count: bookmarks.length, empty: bookmarks.length === 0 });', 'response.end(JSON.stringify({ count: bookmarks.length, empty: bookmarks.length === 0 }));']]) }, fails: [2] },
    ],
  },

  // ── 3.2 ──────────────────────────────────────────────────────────────────
  [`${O}/03-02-change-with-a-motion#Apply: not found, with c and a count`]: {
    wrong: [
      { name: 'no status code', typeFile: true, edit: [['  response.statusCode = 404;\n', '']], fails: [0] },
      { name: 'changed up to the first $', typeFile: true, edit: [['`Not found: ${request.url}\\n`', '`Not found: ${port}. You asked for ${request.url}\\n`']], fails: [1] },
      { name: 'status set before the routes', typeFile: true, edit: [['  response.statusCode = 404;\n', ''], ['request.method, request.url);\n', 'request.method, request.url);\n  response.statusCode = 404;\n']], fails: [2] },
    ],
  },
  [`${O}/03-02-change-with-a-motion#A change from the middle of a word`]: {
    wrong: [
      { name: 'left listlistBookmarks', editFiles: { 'server/server.js': [['{ listBookmarks,', '{ listlistBookmarks,']] }, fails: [0] },
    ],
  },
  [`${O}/03-02-change-with-a-motion#Drill: change a word`]: {
    run: [drill('practice/drills/25-change-word.txt', 'fpcw3000<Esc>:w<CR>')],
    wrong: [
      { name: 'deleted letter by letter, then inserted', typeFile: true, run: [drill('practice/drills/25-change-word.txt', 'fpxxxxi3000<Esc>:w<CR>')], fails: [2] },
      { name: 'dw then insert: the comma moved', typeFile: true, run: [drill('practice/drills/25-change-word.txt', 'fpdWi3000<Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${O}/03-02-change-with-a-motion#Drill: change to the end of the line`]: {
    run: [drill('practice/drills/26-change-to-end.txt', '3wC8080;<Esc>:w<CR>')],
    wrong: [
      { name: 'walked with w', typeFile: true, run: [drill('practice/drills/26-change-to-end.txt', 'wwwC8080;<Esc>:w<CR>')], fails: [2] },
      { name: 'found the p of port', typeFile: true, run: [drill('practice/drills/26-change-to-end.txt', 'fpC8080;<Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${O}/03-02-change-with-a-motion#Drill: change a whole line`]: {
    run: [drill('practice/drills/27-change-line.txt', 'jcclisten();<Esc>:w<CR>')],
    wrong: [
      { name: 'cleared it with x', typeFile: true, run: [drill('practice/drills/27-change-line.txt', 'j^xxxxxxxxxxxxxxxxxxxxxxxilisten();<Esc>:w<CR>')], fails: [2] },
      { name: 'lost the indentation', typeFile: true, run: [drill('practice/drills/27-change-line.txt', 'j0Clisten();<Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${O}/03-02-change-with-a-motion#Drill: change up to a character`]: {
    run: [drill('practice/drills/28-change-till.txt', "fSct'Not found<Esc>:w<CR>")],
    wrong: [
      { name: 'changed to the end and retyped', typeFile: true, run: [drill('practice/drills/28-change-till.txt', "fSCNot found');<Esc>:w<CR>")], fails: [2] },
      { name: 'took the quote too', typeFile: true, run: [drill('practice/drills/28-change-till.txt', "fScf'Not found<Esc>:w<CR>")], fails: [0] },
    ],
  },
  [`${O}/03-02-change-with-a-motion#Review: a duplicate call and a wrong number`]: {
    run: [drill('practice/review/03-02.txt', 'Gdd3Gf2r3:w<CR>')],
    wrong: [
      { name: 'from the top with j', typeFile: true, run: [drill('practice/review/03-02.txt', 'Gddggjjf2r3:w<CR>')], fails: [3] },
      { name: 'deleted the function call and the brace', typeFile: true, run: [drill('practice/review/03-02.txt', 'Gdkdd3Gf2r3:w<CR>')], fails: [1, 2] },
    ],
  },
  [`${O}/03-02-change-with-a-motion#Your turn: an answer for /`]: {
    files: { 'server/server.js': answer(O, 'server-home.js') },
    wrong: [
      { name: 'another text for /', files: { 'server/server.js': answerWith(O, 'server-home.js', [['response.end(`Shelf is running on port ${port}\\n`);', "response.end('ok\\n');"]]) }, fails: [1] },
      { name: 'the / block after the status line', files: { 'server/server.js': answerWith(O, 'server-home.js', [['  response.statusCode = 404;\n', ''], ["  if (request.url === '/') {\n", "  response.statusCode = 404;\n  if (request.url === '/') {\n"]]) }, fails: [0] },
      { name: 'took out the 404', files: { 'server/server.js': answerWith(O, 'server-home.js', [['  response.statusCode = 404;\n', '']]) }, fails: [2] },
    ],
  },

  // ── 3.3 ──────────────────────────────────────────────────────────────────
  [`${O}/03-03-yank-and-put#Two handlers, from copies of health`]: {
    wrong: [
      { name: 'no status code', typeFile: true, edit: [['  response.statusCode = 404;\n  sendJson', '  sendJson']], fails: [0] },
      { name: 'home still called health', typeFile: true, edit: [['export function home(', 'export function health(']], fails: [1, 2] },
      { name: 'home not exported', typeFile: true, edit: [['export function home(', 'function home(']], fails: [1] },
    ],
  },
  [`${O}/03-03-yank-and-put#What p puts after a change`]: {
    wrong: [
      { name: 'saved the stray put', editFiles: { 'server/routes.js': [['  response.statusCode = 404;\n', "  response.statusCode = 404;ok: true, name: 'shelf', uptime: process.uptime() \n"]] }, fails: [0] },
    ],
  },
  [`${O}/03-03-yank-and-put#The table`]: {
    wrong: [
      { name: 'no /health line', typeFile: true, edit: [["  '/health': health,\n", '']], fails: [0] },
      { name: 'called the handler in the table', typeFile: true, edit: [["  '/health': health,\n", "  '/health': health(),\n"]], fails: [0, 1] },
      { name: '/health pointed at home', typeFile: true, edit: [["  '/health': health,\n", "  '/health': home,\n"]], fails: [1] },
    ],
  },
  [`${O}/03-03-yank-and-put#Switch the server to the table`]: {
    wrong: [
      { name: 'did nothing', fails: [2, 3, 5] },
      { name: 'import not changed', typeFile: true, edit: [['import { routes, notFound }', 'import { listBookmarks, health, countBookmarks }']], fails: [0, 1, 2, 3, 4] },
      { name: 'no fallback', typeFile: true, edit: [['routes[request.url] || notFound;', 'routes[request.url];']], fails: [3, 4] },
    ],
  },
  [`${O}/03-03-yank-and-put#Drill: duplicate a line`]: {
    run: [drill('practice/drills/29-duplicate.txt', 'jyypf/dt/:w<CR>')],
    wrong: [
      { name: 'typed the line', typeFile: true, run: [drill('practice/drills/29-duplicate.txt', "jo'/health': health,<Esc>:w<CR>")], fails: [3] },
      { name: 'deleted through the second slash', typeFile: true, run: [drill('practice/drills/29-duplicate.txt', 'jyypf/df/:w<CR>')], fails: [0] },
    ],
  },
  [`${O}/03-03-yank-and-put#Drill: two swaps`]: {
    run: [drill('practice/drills/30-swap.txt', 'ddpklxp:w<CR>')],
    wrong: [
      { name: 'retyped the letters', typeFile: true, run: [drill('practice/drills/30-swap.txt', 'ddpklcwET<Esc>:w<CR>')], fails: [3] },
      { name: 'swapped only the lines', typeFile: true, run: [drill('practice/drills/30-swap.txt', 'ddp:w<CR>')], fails: [0] },
    ],
  },
  [`${O}/03-03-yank-and-put#Drill: copy the end of a line`]: {
    run: [drill('practice/drills/31-copy-end.txt', 'f Yjp:w<CR>')],
    wrong: [
      { name: 'typed it', typeFile: true, run: [drill('practice/drills/31-copy-end.txt', 'jA application/json; charset=utf-8<Esc>:w<CR>')], fails: [3] },
      { name: 'yanked from the a, without the space', typeFile: true, run: [drill('practice/drills/31-copy-end.txt', 'faYjp:w<CR>')], fails: [0] },
    ],
  },
  [`${O}/03-03-yank-and-put#Review: a number and an argument`]: {
    run: [drill('practice/review/03-03.txt', '3wcw8080<Esc>Gea, host<Esc>:w<CR>')],
    wrong: [
      { name: 'the last line first, then up', typeFile: true, run: [drill('practice/review/03-03.txt', 'Gf)i, host<Esc>gg3wcw8080<Esc>:w<CR>')], fails: [3] },
      { name: 'host before port', typeFile: true, run: [drill('practice/review/03-03.txt', '3wcw8080<Esc>Gbihost, <Esc>:w<CR>')], fails: [1] },
    ],
  },
  [`${O}/03-03-yank-and-put#Your turn: a second path for home`]: {
    files: { 'server/routes.js': answer(O, 'routes-api.js') },
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      { name: '/api to health', files: { 'server/routes.js': answerWith(O, 'routes-api.js', [["'/api': home,", "'/api': health,"]]) }, fails: [0] },
      {
        name: 'an if in the server instead',
        files: { 'server/server.js': `import http from 'node:http';\nimport { routes, notFound, home } from './routes.js';\n\nconst port = process.env.PORT || 3000;\n\nconst server = http.createServer((request, response) => {\n  if (request.url === '/api') {\n    home(request, response);\n    return;\n  }\n  const handler = routes[request.url] || notFound;\n  handler(request, response);\n});\n\nserver.listen(port);\n` },
        fails: [1],
      },
      { name: 'home for anything unknown', files: { 'server/routes.js': answer(O, 'routes-api.js') }, editFiles: { 'server/server.js': [['|| notFound;', '|| routes[\'/\'];']] }, fails: [2] },
    ],
  },

  // ── 3.4 ──────────────────────────────────────────────────────────────────
  [`${O}/03-04-repeat-with-dot#Apply: GET in every key, with dot`]: {
    wrong: [
      { name: 'missed a line', typeFile: true, edit: [["'GET /health': health,", "'/health': health,"]], fails: [0] },
      { name: 'no space after GET', typeFile: true, edit: [["'GET /api': home,", "'GET/api': home,"]], fails: [0] },
      { name: 'a handler changed too', typeFile: true, edit: [["'GET /health': health,", "'GET /health': home,"]], fails: [1] },
    ],
  },
  [`${O}/03-04-repeat-with-dot#Look up the method and the path`]: {
    wrong: [
      { name: 'did nothing', fails: [0, 2] },
      { name: 'GET written in', typeFile: true, edit: [['routes[`${request.method} ${request.url}`]', 'routes[`GET ${request.url}`]']], fails: [1] },
      { name: 'two spaces', typeFile: true, edit: [['routes[`${request.method} ${request.url}`]', 'routes[`${request.method}  ${request.url}`]']], fails: [0, 2] },
    ],
  },
  [`${O}/03-04-repeat-with-dot#Dot after undo`]: {
    wrong: [
      { name: 'left the bad dot', editFiles: { 'server/routes.js': [["'GET /api/bookmarks/count'", "'/GET api/bookmarks/count'"]] }, fails: [0] },
    ],
  },
  [`${O}/03-04-repeat-with-dot#Drill: the end of every line`]: {
    run: [drill('practice/drills/32-dot-lines.txt', 'A;<Esc>j.j.j.:w<CR>')],
    wrong: [
      { name: 'A on every line', typeFile: true, run: [drill('practice/drills/32-dot-lines.txt', 'A;<Esc>jA;<Esc>jA;<Esc>jA;<Esc>:w<CR>')], fails: [3] },
      { name: 'stopped one short', typeFile: true, run: [drill('practice/drills/32-dot-lines.txt', 'A;<Esc>j.j.:w<CR>')], fails: [1, 2] },
    ],
  },
  [`${O}/03-04-repeat-with-dot#Drill: find, then dot`]: {
    run: [drill('practice/drills/33-dot-find.txt', 'f,a <Esc>;.:w<CR>')],
    wrong: [
      { name: 'typed the second space', typeFile: true, run: [drill('practice/drills/33-dot-find.txt', 'f,a <Esc>;a <Esc>:w<CR>')], fails: [2] },
      { name: 'space before the comma', typeFile: true, run: [drill('practice/drills/33-dot-find.txt', 'f,i <Esc>l;.:w<CR>')], fails: [0] },
    ],
  },
  [`${O}/03-04-repeat-with-dot#Drill: every other line`]: {
    run: [drill('practice/drills/34-dot-delete.txt', 'jddj.j.:w<CR>')],
    wrong: [
      { name: 'dd every time', typeFile: true, run: [drill('practice/drills/34-dot-delete.txt', 'jddjddjdd:w<CR>')], fails: [3] },
      { name: 'deleted the line after', typeFile: true, run: [drill('practice/drills/34-dot-delete.txt', 'jddj.j.j.:w<CR>')], fails: [2] },
    ],
  },
  [`${O}/03-04-repeat-with-dot#Drill: change a word twice`]: {
    run: [drill('practice/drills/35-dot-change.txt', 'wcwtotal<Esc>ww.:w<CR>')],
    wrong: [
      { name: 'typed it twice', typeFile: true, run: [drill('practice/drills/35-dot-change.txt', 'wcwtotal<Esc>wwcwtotal<Esc>:w<CR>')], fails: [2] },
      { name: 'only the first', typeFile: true, run: [drill('practice/drills/35-dot-change.txt', 'wcwtotal<Esc>:w<CR>')], fails: [0] },
    ],
  },
  [`${O}/03-04-repeat-with-dot#Review: cut a comment, copy a line`]: {
    run: [drill('practice/review/03-04.txt', 'jEElDyyp:w<CR>')],
    wrong: [
      { name: 'd$ instead of D', typeFile: true, run: [drill('practice/review/03-04.txt', 'jEEld$yyp:w<CR>')], fails: [3] },
      { name: 'copied before cutting', typeFile: true, run: [drill('practice/review/03-04.txt', 'jyypEElD:w<CR>')], fails: [0] },
    ],
  },
  [`${O}/03-04-repeat-with-dot#Your turn: say which method wasn't found`]: {
    files: { 'server/routes.js': answer(O, 'routes-method.js') },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'method after the path', files: { 'server/routes.js': answerWith(O, 'routes-method.js', [["{ error: 'not found', method: request.method, path: request.url }", "{ error: 'not found', path: request.url, method: request.method }"]]) }, fails: [0] },
      { name: 'lost the status', files: { 'server/routes.js': answerWith(O, 'routes-method.js', [['  response.statusCode = 404;\n', '']]) }, fails: [1] },
      { name: 'count route lost', files: { 'server/routes.js': answerWith(O, 'routes-method.js', [["  'GET /api/bookmarks/count': countBookmarks,\n", '']]) }, fails: [2] },
    ],
  },

  // ── 3.5 ──────────────────────────────────────────────────────────────────
  [`${O}/03-05-join-indent-and-case#Catch the error`]: {
    wrong: [
      { name: 'did nothing', fails: [1, 2, 3] },
      { name: 'no status code', typeFile: true, edit: [['    response.statusCode = 500;\n', '']], fails: [1] },
      { name: 'another message', typeFile: true, edit: [["response.end('Something went wrong\\n');", "response.end('Oops\\n');"]], fails: [2] },
      { name: 'threw it again', typeFile: true, edit: [["    response.end('Something went wrong\\n');\n", "    response.end('Something went wrong\\n');\n    throw error;\n"]], fails: [3] },
      { name: 'called the handler without arguments', typeFile: true, edit: [['    handler(request, response);', '    handler();']], fails: [0] },
    ],
  },
  [`${O}/03-05-join-indent-and-case#Break the data on purpose`]: {
    wrong: [
      { name: 'comma still missing', editFiles: { 'data/bookmarks.json': [['"url": "https://neovim.io"\n  },', '"url": "https://neovim.io"\n  }']] }, fails: [0, 1] },
    ],
  },
  [`${O}/03-05-join-indent-and-case#Drill: join lines`]: {
    run: [drill('practice/drills/36-join.txt', 'Jj4J:w<CR>')],
    wrong: [
      { name: 'J four times', typeFile: true, run: [drill('practice/drills/36-join.txt', 'JjJJJ:w<CR>')], fails: [3] },
      { name: 'one J too few', typeFile: true, run: [drill('practice/drills/36-join.txt', 'Jj3J:w<CR>')], fails: [1, 2] },
    ],
  },
  [`${O}/03-05-join-indent-and-case#Drill: fix the indentation`]: {
    run: [drill('practice/drills/37-indent.txt', 'j>>j<<.:w<CR>')],
    wrong: [
      { name: 'deleted the spaces', typeFile: true, run: [drill('practice/drills/37-indent.txt', 'j>>jxxxx:w<CR>')], fails: [3] },
      { name: 'only one outdent', typeFile: true, run: [drill('practice/drills/37-indent.txt', 'j>>j<<:w<CR>')], fails: [1] },
    ],
  },
  [`${O}/03-05-join-indent-and-case#Drill: switch case`]: {
    run: [drill('practice/drills/38-case.txt', '3~jWgu$:w<CR>')],
    wrong: [
      { name: 'one ~ at a time', typeFile: true, run: [drill('practice/drills/38-case.txt', '~~~jWgu$:w<CR>')], fails: [3] },
      { name: 'lowercased POST too', typeFile: true, run: [drill('practice/drills/38-case.txt', '3~jguu:w<CR>')], fails: [1] },
    ],
  },
  [`${O}/03-05-join-indent-and-case#Drill: capital constants, with dot`]: {
    run: [drill('practice/drills/39-constants.txt', 'wgUej.:w<CR>')],
    wrong: [
      { name: 'gUe twice', typeFile: true, run: [drill('practice/drills/39-constants.txt', 'wgUejgUe:w<CR>')], fails: [3] },
      { name: 'the whole line', typeFile: true, run: [drill('practice/drills/39-constants.txt', 'gUUj.:w<CR>')], fails: [0, 1] },
    ],
  },
  [`${O}/03-05-join-indent-and-case#Review: three switches`]: {
    run: [drill('practice/review/03-05.txt', 'wwcwon<Esc>WW.WW.:w<CR>')],
    wrong: [
      { name: 'cw each time', typeFile: true, run: [drill('practice/review/03-05.txt', 'wwcwon<Esc>WWcwon<Esc>WWcwon<Esc>:w<CR>')], fails: [2] },
      { name: 'missed the last', typeFile: true, run: [drill('practice/review/03-05.txt', 'wwcwon<Esc>WW.:w<CR>')], fails: [0] },
    ],
  },
  [`${O}/03-05-join-indent-and-case#Your turn: a JSON 500`]: {
    files: { 'server/routes.js': answer(O, 'routes-servererror.js'), 'server/server.js': answer(O, 'server-servererror.js') },
    wrong: [
      { name: 'did nothing', fails: [0, 2] },
      { name: 'no status code', files: { 'server/routes.js': answerWith(O, 'routes-servererror.js', [['  response.statusCode = 500;\n', '']]), 'server/server.js': answer(O, 'server-servererror.js') }, fails: [1] },
      { name: 'JSON without the header', files: { 'server/server.js': answerWith(O, 'server-servererror.js', [['    serverError(request, response);\n', "    response.statusCode = 500;\n    response.end(JSON.stringify({ error: 'server error' }));\n"]]) }, fails: [2] },
      { name: 'stopped logging', files: { 'server/routes.js': answer(O, 'routes-servererror.js'), 'server/server.js': answerWith(O, 'server-servererror.js', [['    console.error(error);\n', '']]) }, fails: [3] },
    ],
  },

  // ── 4.1 ──────────────────────────────────────────────────────────────────
  [`${T}/04-01-words-and-paragraphs#Move the data code into store.js`]: {
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      { name: 'path from the project folder', typeFile: true, edit: [["new URL('../data/bookmarks.json'", "new URL('./data/bookmarks.json'"]], fails: [0] },
      { name: 'exported DATA too', typeFile: true, edit: [['const DATA = new URL', 'export const DATA = new URL']], fails: [1] },
    ],
  },
  [`${T}/04-01-words-and-paragraphs#Use the store in routes.js`]: {
    wrong: [
      { name: 'still parses the file itself', fails: [1] },
      { name: 'forgot the ()', typeFile: true, edit: [['const bookmarks = readBookmarks();', 'const bookmarks = readBookmarks;']], fails: [0] },
    ],
  },
  [`${T}/04-01-words-and-paragraphs#Rename DATA, from the middle of the word`]: {
    wrong: [
      { name: 'did nothing', fails: [1] },
      { name: 'cw from the T', typeFile: true, edit: [['fs.readFileSync(FILE,', 'fs.readFileSync(DAFILE,']], fails: [0] },
      { name: 'renamed only one', typeFile: true, edit: [['fs.readFileSync(FILE,', 'fs.readFileSync(DATA,']], fails: [0, 1] },
    ],
  },
  [`${T}/04-01-words-and-paragraphs#Drill: one rename, three lines`]: {
    run: [drill('practice/drills/40-ciw-dot.txt', 'ciwsum<Esc>j.j.:w<CR>')],
    wrong: [
      { name: 'cw, with b first', typeFile: true, run: [drill('practice/drills/40-ciw-dot.txt', 'cwsum<Esc>jb.jb.:w<CR>')], fails: [3] },
      { name: 'cw and dot from the middle', typeFile: true, run: [drill('practice/drills/40-ciw-dot.txt', 'cwsum<Esc>j.j.:w<CR>')], fails: [1] },
      { name: 'only two lines', typeFile: true, run: [drill('practice/drills/40-ciw-dot.txt', 'ciwsum<Esc>j.:w<CR>')], fails: [1, 2] },
      { name: 'renamed with an extra line', typeFile: true, run: [drill('practice/drills/40-ciw-dot.txt', 'ciwsum<Esc>j.j.o<Esc>:w<CR>')], fails: [2] },
    ],
  },
  [`${T}/04-01-words-and-paragraphs#Drill: delete words, keep the spaces right`]: {
    run: [drill('practice/drills/41-daw.txt', 'fgdawj$daw:w<CR>')],
    wrong: [
      { name: 'diw leaves two spaces', typeFile: true, run: [drill('practice/drills/41-daw.txt', 'fgdiwj$daw:w<CR>')], fails: [0] },
      { name: 'diw at the end leaves a space', typeFile: true, run: [drill('practice/drills/41-daw.txt', 'fgdawj$diw:w<CR>')], fails: [1] },
      { name: 'joined the lines', typeFile: true, run: [drill('practice/drills/41-daw.txt', 'fgdawj$dawkJ:w<CR>')], fails: [2] },
      { name: 'x a letter at a time', typeFile: true, run: [drill('practice/drills/41-daw.txt', 'fgdawj$xxxx:w<CR>')], fails: [3] },
    ],
  },
  [`${T}/04-01-words-and-paragraphs#Drill: swap two blocks`]: {
    run: [drill('practice/drills/42-paragraphs.txt', 'dap}p:w<CR>')],
    wrong: [
      { name: 'dip leaves the blank line behind', typeFile: true, run: [drill('practice/drills/42-paragraphs.txt', 'dip}p:w<CR>')], fails: [0] },
      { name: 'put above the block', typeFile: true, run: [drill('practice/drills/42-paragraphs.txt', 'dap}P:w<CR>')], fails: [1] },
      { name: 'jj instead of }', typeFile: true, run: [drill('practice/drills/42-paragraphs.txt', 'dapjjp:w<CR>')], fails: [3] },
    ],
  },
  [`${T}/04-01-words-and-paragraphs#Review: case, indent and a typo`]: {
    run: [drill('practice/review/04-01.txt', '3Gl3~>>fmxp:w<CR>')],
    wrong: [
      { name: 'indented first', typeFile: true, run: [drill('practice/review/04-01.txt', '3G>>l3~fmxp:w<CR>')], fails: [0] },
      { name: 'gUU the line', typeFile: true, run: [drill('practice/review/04-01.txt', '3GgUU>>:w<CR>')], fails: [0] },
      { name: 'a detour', typeFile: true, run: [drill('practice/review/04-01.txt', 'jjjkl3~>>fmxp:w<CR>')], fails: [2] },
    ],
  },
  [`${T}/04-01-words-and-paragraphs#Your turn: list the bookmarks from the store`]: {
    files: { 'server/routes.js': answer(T, 'routes-store.js') },
    wrong: [
      { name: 'did nothing', fails: [0, 3] },
      { name: 'response.end without the header', files: { 'server/routes.js': answerWith(T, 'routes-store.js', [['  sendJson(response, readBookmarks());', '  response.end(JSON.stringify(readBookmarks()));']]) }, fails: [1] },
      { name: 'lost Cache-Control', files: { 'server/routes.js': answerWith(T, 'routes-store.js', [["  response.setHeader('Cache-Control', 'no-store');\n  sendJson(response, readBookmarks());", '  sendJson(response, readBookmarks());']]) }, fails: [2] },
      { name: 'read the file in routes.js again', files: { 'server/routes.js': answerWith(T, 'routes-store.js', [["import { readBookmarks } from './store.js';", "import fs from 'node:fs';\nimport { readBookmarks } from './store.js';\n\nconst FILE = new URL('../data/bookmarks.json', import.meta.url);"], ['  sendJson(response, readBookmarks());', "  sendJson(response, JSON.parse(fs.readFileSync(FILE, 'utf8')));"]]) }, fails: [3] },
    ],
  },

  // ── 4.2 ──────────────────────────────────────────────────────────────────
  [`${T}/04-02-quotes#Save the data: writeBookmarks`]: {
    wrong: [
      { name: 'did nothing', fails: [0, 1, 2] },
      { name: 'wrote it twice', typeFile: true, edit: [['JSON.stringify(bookmarks, null, 2)', 'JSON.stringify([...bookmarks, ...bookmarks], null, 2)']], fails: [0] },
      { name: 'all on one line', typeFile: true, edit: [['JSON.stringify(bookmarks, null, 2)', 'JSON.stringify(bookmarks)']], fails: [1] },
      { name: 'no final newline', typeFile: true, edit: [[" + '\\n');", ');']], fails: [2] },
    ],
  },
  [`${T}/04-02-quotes#Add a bookmark: POST /api/bookmarks`]: {
    wrong: [
      { name: 'did nothing', fails: [0, 1, 2] },
      { name: 'never saved', typeFile: true, edit: [['  writeBookmarks(bookmarks);\n', '']], fails: [0] },
      { name: 'no status code', typeFile: true, edit: [['  response.statusCode = 201;\n', '']], fails: [1] },
      { name: 'echoed the body', typeFile: true, edit: [['  sendJson(response, bookmark);', '  sendJson(response, body);']], fails: [2] },
      { name: 'changed the GET line instead of copying it', typeFile: true, edit: [["  'GET /api/bookmarks': listBookmarks,\n", '']], fails: [3] },
    ],
  },
  [`${T}/04-02-quotes#A request file, changed with ci"`]: {
    wrong: [
      { name: 'still the MDN bookmark', files: { 'new-bookmark.json': '{ "title": "MDN: HTTP", "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP" }\n' }, fails: [0] },
      { name: 'ci" on the key', files: { 'new-bookmark.json': '{ "Node.js: http": "MDN: HTTP", "url": "https://nodejs.org/api/http.html" }\n' }, fails: [0] },
    ],
  },
  [`${T}/04-02-quotes#A body that isn't JSON`]: {
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      { name: 'async without await', typeFile: true, edit: [['    await handler(request, response);', '    handler(request, response);']], fails: [0, 1] },
      { name: 'threw it again', typeFile: true, edit: [['    serverError(request, response);\n', '    serverError(request, response);\n    throw error;\n']], fails: [1] },
      { name: 'answered 404', typeFile: true, edit: [['    serverError(request, response);', '    notFound(request, response);']], fails: [0] },
    ],
  },
  [`${T}/04-02-quotes#Drill: empty three strings`]: {
    run: [drill('practice/drills/43-di-quote.txt', "di'j.j.:w<CR>")],
    wrong: [
      { name: "dt' on each line", typeFile: true, run: [drill('practice/drills/43-di-quote.txt', "f'ldt'j0f'ldt'j0f'ldt':w<CR>")], fails: [3] },
      { name: "da' took the quotes", typeFile: true, run: [drill('practice/drills/43-di-quote.txt', "da'j.j.:w<CR>")], fails: [0, 1] },
      { name: 'stopped at two', typeFile: true, run: [drill('practice/drills/43-di-quote.txt', "di'j.:w<CR>")], fails: [1, 2] },
    ],
  },
  [`${T}/04-02-quotes#Drill: a value in the middle`]: {
    run: [drill('practice/drills/44-ci-double.txt', 'fpci"Neovim<Esc>:w<CR>')],
    wrong: [
      { name: 'ft then ct"', typeFile: true, run: [drill('practice/drills/44-ci-double.txt', 'ft;;ct"Neovim<Esc>:w<CR>')], fails: [2] },
      { name: 'ci" from the start changed the key', typeFile: true, run: [drill('practice/drills/44-ci-double.txt', 'ci"Neovim<Esc>:w<CR>')], fails: [0] },
      { name: 'an extra line', typeFile: true, run: [drill('practice/drills/44-ci-double.txt', 'fpci"Neovim<Esc>o<Esc>:w<CR>')], fails: [1] },
    ],
  },
  [`${T}/04-02-quotes#Drill: a template string`]: {
    run: [drill('practice/drills/45-ci-backtick.txt', 'ci`Shelf is ready<Esc>:w<CR>')],
    wrong: [
      { name: 'f` then ct`', typeFile: true, run: [drill('practice/drills/45-ci-backtick.txt', 'f`lct`Shelf is ready<Esc>:w<CR>')], fails: [2] },
      { name: 'da` took the backticks', typeFile: true, run: [drill('practice/drills/45-ci-backtick.txt', 'da`iShelf is ready<Esc>:w<CR>')], fails: [0] },
      { name: 'an extra line', typeFile: true, run: [drill('practice/drills/45-ci-backtick.txt', 'ci`Shelf is ready<Esc>o<Esc>:w<CR>')], fails: [1] },
    ],
  },
  [`${T}/04-02-quotes#Review: rename, then remove`]: {
    run: [drill('practice/review/04-02.txt', 'wciwtitle<Esc>jddj.:w<CR>')],
    wrong: [
      { name: 'ciw on const', typeFile: true, run: [drill('practice/review/04-02.txt', 'ciwtitle<Esc>jddj.:w<CR>')], fails: [0] },
      { name: 'deleted the port line', typeFile: true, run: [drill('practice/review/04-02.txt', 'wciwtitle<Esc>jdd.:w<CR>')], fails: [1] },
      { name: 'dd twice', typeFile: true, run: [drill('practice/review/04-02.txt', 'wciwtitle<Esc>jddjdd:w<CR>')], fails: [3] },
    ],
  },
  [`${T}/04-02-quotes#Your turn: refuse a bookmark without a title or URL`]: {
    files: { 'server/routes.js': answer(T, 'routes-badrequest.js') },
    wrong: [
      { name: 'did nothing', fails: [0, 1, 2] },
      { name: 'only undefined refused', files: { 'server/routes.js': answerWith(T, 'routes-badrequest.js', [['if (!body.title || !body.url) {', 'if (body.title === undefined || body.url === undefined) {']]) }, fails: [1] },
      { name: 'checked after writing', files: { 'server/routes.js': answerWith(T, 'routes-badrequest.js', [['  if (!body.title || !body.url) {\n    response.statusCode = 400;\n    sendJson(response, { error: \'title and url are required\' });\n    return;\n  }\n  const bookmark = { title: body.title, url: body.url };\n  const bookmarks = readBookmarks();\n  bookmarks.push(bookmark);\n  writeBookmarks(bookmarks);\n', '  const bookmark = { title: body.title, url: body.url };\n  const bookmarks = readBookmarks();\n  bookmarks.push(bookmark);\n  writeBookmarks(bookmarks);\n  if (!body.title || !body.url) {\n    response.statusCode = 400;\n    sendJson(response, { error: \'title and url are required\' });\n    return;\n  }\n']]) }, fails: [2] },
      { name: 'a semicolon after the if', files: { 'server/routes.js': answerWith(T, 'routes-badrequest.js', [['if (!body.title || !body.url) {', 'if (!body.title || !body.url); {']]) }, fails: [3] },
    ],
  },

  // ── 4.3 ──────────────────────────────────────────────────────────────────
  [`${T}/04-03-brackets#Copy a handler, change its body with ci{`]: {
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'renamed addBookmark instead of a copy', typeFile: true, edit: [['export async function addBookmark(request, response) {', 'export async function deleteBookmark2(request, response) {']], fails: [0] },
    ],
  },
  [`${T}/04-03-brackets#A DELETE that isn't routed`]: {
    wrong: [
      { name: 'no table entry', typeFile: true, edit: [["  'DELETE /api/bookmarks': deleteBookmark,\n", '']], fails: [0, 1] },
      { name: 'answered with the list', typeFile: true, edit: [['  sendJson(response, { deleted: bookmarks.length - kept.length });', '  sendJson(response, kept);']], fails: [0] },
      { name: 'never saved', typeFile: true, edit: [['  writeBookmarks(kept);\n', '']], fails: [1] },
      { name: 'changed the POST line instead of copying it', typeFile: true, edit: [["  'POST /api/bookmarks': addBookmark,\n", '']], fails: [2] },
      { name: 'kept the lesson 4.2 bookmarks', typeFile: true, run: [`node -e "const fs = require('fs'); const b = JSON.parse(fs.readFileSync('data/bookmarks.json', 'utf8')); b.push({ title: 'Node.js: http', url: 'https://nodejs.org/api/http.html' }); fs.writeFileSync('data/bookmarks.json', JSON.stringify(b, null, 2) + '\\n');"`], fails: [3] },
    ],
  },
  [`${T}/04-03-brackets#Drill: the innermost pair`]: {
    run: [drill('practice/drills/46-ci-paren.txt', 'f,ci(bookmarks<Esc>:w<CR>')],
    wrong: [
      { name: 'counted to the closing bracket', typeFile: true, run: [drill('practice/drills/46-ci-paren.txt', 'f(;lc2t)bookmarks<Esc>:w<CR>')], fails: [2] },
      { name: 'the outer pair', typeFile: true, run: [drill('practice/drills/46-ci-paren.txt', 'f,2ci(bookmarks<Esc>:w<CR>')], fails: [0] },
      { name: 'an extra line', typeFile: true, run: [drill('practice/drills/46-ci-paren.txt', 'f,ci(bookmarks<Esc>o<Esc>:w<CR>')], fails: [1] },
    ],
  },
  [`${T}/04-03-brackets#Drill: a new body`]: {
    run: [drill('practice/drills/47-ci-brace.txt', 'jci{sendJson(response, {});<Esc>:w<CR>')],
    wrong: [
      { name: 'walked down first', typeFile: true, run: [drill('practice/drills/47-ci-brace.txt', 'jjjjci{sendJson(response, {});<Esc>:w<CR>')], fails: [2] },
      { name: 'counted three lines', typeFile: true, run: [drill('practice/drills/47-ci-brace.txt', 'j3ccsendJson(response, {});<Esc>:w<CR>')], fails: [1] },
      { name: 'kept the old body', typeFile: true, run: [drill('practice/drills/47-ci-brace.txt', 'jOsendJson(response, {});<Esc>:w<CR>')], fails: [1] },
    ],
  },
  [`${T}/04-03-brackets#Drill: empty a list`]: {
    run: [drill('practice/drills/48-di-bracket.txt', 'f,di[:w<CR>')],
    wrong: [
      { name: "dt] from after the [", typeFile: true, run: [drill('practice/drills/48-di-bracket.txt', 'f[ldt]:w<CR>')], fails: [2] },
      { name: 'da[ took the brackets', typeFile: true, run: [drill('practice/drills/48-di-bracket.txt', 'f,da[:w<CR>')], fails: [0] },
      { name: 'an extra line', typeFile: true, run: [drill('practice/drills/48-di-bracket.txt', 'f,di[o<Esc>:w<CR>')], fails: [1] },
    ],
  },
  [`${T}/04-03-brackets#Review: a message, a comment and a split line`]: {
    run: [drill('practice/review/04-03.txt', 'ci"ready<Esc>f;lDjJ:w<CR>')],
    wrong: [
      { name: 'kept the comment', typeFile: true, run: [drill('practice/review/04-03.txt', 'ci"ready<Esc>jJ:w<CR>')], fails: [0] },
      { name: 'never joined', typeFile: true, run: [drill('practice/review/04-03.txt', 'ci"ready<Esc>f;lD:w<CR>')], fails: [1, 2] },
      { name: 'from the end of the line', typeFile: true, run: [drill('practice/review/04-03.txt', 'ci"ready<Esc>$F;lDjJ:w<CR>')], fails: [3] },
    ],
  },
  [`${T}/04-03-brackets#Your turn: a 404 for a bookmark that isn't there`]: {
    files: { 'server/routes.js': answer(T, 'routes-delete404.js') },
    wrong: [
      { name: 'did nothing', fails: [0, 1, 2] },
      { name: 'another message', files: { 'server/routes.js': answerWith(T, 'routes-delete404.js', [["{ error: 'no bookmark with that url' }", "{ error: 'not found' }"]]) }, fails: [0] },
      { name: 'status 400', files: { 'server/routes.js': answerWith(T, 'routes-delete404.js', [['    response.statusCode = 404;', '    response.statusCode = 400;']]) }, fails: [1] },
      { name: 'checked after writing', files: { 'server/routes.js': answerWith(T, 'routes-delete404.js', [['  if (kept.length === bookmarks.length) {\n    response.statusCode = 404;\n    sendJson(response, { error: \'no bookmark with that url\' });\n    return;\n  }\n  writeBookmarks(kept);\n', '  writeBookmarks(kept);\n  if (kept.length === bookmarks.length) {\n    response.statusCode = 404;\n    sendJson(response, { error: \'no bookmark with that url\' });\n    return;\n  }\n']]) }, fails: [2] },
      { name: 'the condition inverted', files: { 'server/routes.js': answerWith(T, 'routes-delete404.js', [['if (kept.length === bookmarks.length) {', 'if (kept.length !== bookmarks.length) {']]) }, fails: [3] },
    ],
  },

  // ── 4.4 ──────────────────────────────────────────────────────────────────
  [`${T}/04-04-tags#A page at /`]: {
    editFiles: { 'server/routes.js': [PAGES_IMPORT, HOME_PAGE_ROUTE] },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'sent as plain text', typeFile: true, edit: [["'text/html; charset=utf-8'", "'text/plain; charset=utf-8'"]], editFiles: { 'server/routes.js': [PAGES_IMPORT, HOME_PAGE_ROUTE] }, fails: [0] },
      { name: '/api changed too', typeFile: true, editFiles: { 'server/routes.js': [PAGES_IMPORT, HOME_PAGE_ROUTE, ["  'GET /api': home,", "  'GET /api': homePage,"]] }, fails: [1] },
    ],
  },
  [`${T}/04-04-tags#Write the page`]: {
    wrong: [
      { name: 'did nothing', fails: [0, 1, 2] },
      { name: 'another heading', typeFile: true, edit: [['<h1>Shelf</h1>', '<h1>Bookmarks</h1>']], fails: [0] },
      { name: 'the li not indented', typeFile: true, edit: [['      <li><a href', '<li><a href']], fails: [1] },
      { name: 'title in the body', typeFile: true, edit: [['    <title>Shelf</title>\n  </head>\n  <body>\n', '  </head>\n  <body>\n    <title>Shelf</title>\n']], fails: [2] },
    ],
  },
  [`${T}/04-04-tags#A second link, with ci" and cit`]: {
    wrong: [
      { name: 'cit from the li tag', typeFile: true, edit: [['      <li><a href="https://www.vim.org">Vim</a></li>', '      <li>Vim</li>']], fails: [0] },
      { name: 'changed the Neovim line instead of a copy', typeFile: true, edit: [['      <li><a href="https://neovim.io">Neovim</a></li>\n', '']], fails: [1] },
    ],
  },
  [`${T}/04-04-tags#Drill: change a title`]: {
    run: [drill('practice/drills/49-cit.html', 'citShelf<Esc>:w<CR>')],
    wrong: [
      { name: 'f> then ct<', typeFile: true, run: [drill('practice/drills/49-cit.html', 'f>lct<Shelf<Esc>:w<CR>')], fails: [2] },
      { name: 'cat took the tags', typeFile: true, run: [drill('practice/drills/49-cit.html', 'catShelf<Esc>:w<CR>')], fails: [0] },
      { name: 'an extra line', typeFile: true, run: [drill('practice/drills/49-cit.html', 'citShelf<Esc>o<Esc>:w<CR>')], fails: [1] },
    ],
  },
  [`${T}/04-04-tags#Drill: the link inside the item`]: {
    run: [drill('practice/drills/50-cit-nested.html', 'fVcitHelix<Esc>:w<CR>')],
    wrong: [
      { name: 'cit from the li tag', typeFile: true, run: [drill('practice/drills/50-cit-nested.html', 'citHelix<Esc>:w<CR>')], fails: [0] },
      { name: 'walked in with ; and l', typeFile: true, run: [drill('practice/drills/50-cit-nested.html', 'f>;lcitHelix<Esc>:w<CR>')], fails: [2] },
      { name: 'an extra line', typeFile: true, run: [drill('practice/drills/50-cit-nested.html', 'fVcitHelix<Esc>o<Esc>:w<CR>')], fails: [1] },
    ],
  },
  [`${T}/04-04-tags#Drill: empty a list`]: {
    run: [drill('practice/drills/51-dit.html', 'dit:w<CR>')],
    wrong: [
      { name: 'dit from an item', typeFile: true, run: [drill('practice/drills/51-dit.html', 'jdit:w<CR>')], fails: [0] },
      { name: 'line by line', typeFile: true, run: [drill('practice/drills/51-dit.html', 'j3dd:w<CR>')], fails: [0, 1] },
      { name: 'a detour', typeFile: true, run: [drill('practice/drills/51-dit.html', 'jkdit:w<CR>')], fails: [2] },
    ],
  },
  [`${T}/04-04-tags#Review: an argument, a word and a list`]: {
    run: [drill('practice/review/04-04.txt', 'wwdWjdawjf,di[:w<CR>')],
    wrong: [
      { name: 'one w stopped on the (', typeFile: true, run: [drill('practice/review/04-04.txt', 'wdWjdawjf,di[:w<CR>')], fails: [0] },
      { name: 'diw left two spaces', typeFile: true, run: [drill('practice/review/04-04.txt', 'wwdWjdiwjf,di[:w<CR>')], fails: [1] },
      { name: 'da[ took the brackets', typeFile: true, run: [drill('practice/review/04-04.txt', 'wwdWjdawjf,da[:w<CR>')], fails: [2] },
      { name: 'f( and l', typeFile: true, run: [drill('practice/review/04-04.txt', 'f(ldWjdawjf,di[:w<CR>')], fails: [3] },
    ],
  },
  [`${T}/04-04-tags#Your turn: an About page`]: {
    files: { 'server/pages.js': answer(T, 'pages-about.js'), 'server/routes.js': answer(T, 'routes-about.js'), 'public/about.html': answer(T, 'about.html') },
    wrong: [
      { name: 'did nothing', fails: [0, 1, 2] },
      { name: 'the title left as Shelf', files: { 'server/pages.js': answer(T, 'pages-about.js'), 'server/routes.js': answer(T, 'routes-about.js'), 'public/about.html': answerWith(T, 'about.html', [['<title>About Shelf</title>', '<title>Shelf</title>']]) }, fails: [0] },
      { name: 'the heading left as Shelf', files: { 'server/pages.js': answer(T, 'pages-about.js'), 'server/routes.js': answer(T, 'routes-about.js'), 'public/about.html': answerWith(T, 'about.html', [['<h1>About Shelf</h1>', '<h1>Shelf</h1>']]) }, fails: [1] },
      { name: 'sent without a Content-Type', files: { 'server/pages.js': answerWith(T, 'pages-about.js', [["export function aboutPage(request, response) {\n  sendPage(response, 'about.html');", "export function aboutPage(request, response) {\n  response.end(fs.readFileSync(new URL('../public/about.html', import.meta.url)));"]]), 'server/routes.js': answer(T, 'routes-about.js'), 'public/about.html': answer(T, 'about.html') }, fails: [2] },
      { name: '/ became the About page', files: { 'server/pages.js': answer(T, 'pages-about.js'), 'server/routes.js': answerWith(T, 'routes-about.js', [["  'GET /': homePage,", "  'GET /': aboutPage,"]]), 'public/about.html': answer(T, 'about.html') }, fails: [3] },
    ],
  },
};
