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
};
