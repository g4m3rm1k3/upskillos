// What a learner does at each step of "Build a Spreadsheet", for the walkthrough test
// (spreadsheetBuild.desktop.test.js). Keyed "<lesson file name>#<step title>".
//
// By default a step's file (its ```lang file=... block) is typed in for you. An entry adds:
//   run:   commands the lesson tells the learner to type in the terminal (PowerShell)
//   files: other files the learner writes (e.g. a challenge's answer)
//   wrong: wrong answers, tried on a copy of the project before the step; each lists the
//          indexes of the step's checks that must fail ("fails").
// A wrong answer's `files` replace the step's file (the step's own target is not written).

// The finished style.css from lesson 2.3 (defined first: the entries below use it).
const CSS = `body {
  font-family: system-ui, sans-serif;
  margin: 24px;
}

table {
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #d0d7de;
  padding: 4px 8px;
  min-width: 80px;
  height: 24px;
  font-size: 13px;
}

th {
  background: #f3f4f6;
  color: #57606a;
  font-weight: 600;
}

thead th {
  position: sticky;
  top: 0;
}
`;

export const WALKTHROUGH = {
  // ── 0.1 ──────────────────────────────────────────────────────────────────
  '00-01-folder-and-terminal#Make a folder from the terminal': {
    run: ['mkdir scratch'],
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'made a file called scratch instead of a folder', run: ['New-Item scratch'], fails: [0] },
      { name: 'made the folder with a different name', run: ['mkdir Scratch2'], fails: [0] },
    ],
  },
  '00-01-folder-and-terminal#Delete the scratch folder': {
    run: ['Remove-Item scratch'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },

  // ── 0.2 ──────────────────────────────────────────────────────────────────
  '00-02-programs-and-path#Environment variables': {
    wrong: [
      { name: 'no file', fails: [0, 1, 2] },
      {
        name: 'reads the variable without a default (KeyError when it is missing)',
        files: { 'greet.py': 'import os\n\nprint("Hello,", os.environ["GREETING_NAME"])\n' },
        fails: [1, 2],
      },
      {
        name: 'prints the greeting without reading the environment',
        files: { 'greet.py': 'print("Hello, stranger")\n' },
        fails: [1],
      },
    ],
  },
  '00-02-programs-and-path#Set a variable, then run the script': {
    wrong: [
      {
        name: 'greet.py rewritten to ignore the environment',
        files: { 'greet.py': 'import os\n\nname = os.environ.get("GREETING_NAME", "stranger")\nprint("Hello, stranger")\n' },
        fails: [0],
      },
      {
        name: 'reads a differently named variable',
        files: { 'greet.py': 'import os\n\nname = os.environ.get("GREETING", "stranger")\nprint("Hello,", name)\n' },
        fails: [0],
      },
    ],
  },

  // ── 0.4 ──────────────────────────────────────────────────────────────────
  '00-04-running-programs#hello.py': {
    wrong: [
      { name: 'no file', fails: [0] },
      { name: 'different message', files: { 'hello.py': 'print("Hello from Python")\n' }, fails: [0] },
    ],
  },
  '00-04-running-programs#hello.js': {
    wrong: [
      { name: 'no file', fails: [0] },
      { name: 'Python syntax in a .js file', files: { 'hello.js': 'name = "spreadsheet"\nprint("Hello from Node, building a", name)\n' }, fails: [0] },
      { name: 'joins without the space', files: { 'hello.js': 'const name = "spreadsheet";\nconsole.log("Hello from Node, building a" + name);\n' }, fails: [0] },
    ],
  },
  '00-04-running-programs#When a program fails': {
    wrong: [
      { name: 'fixed the bug instead of typing it', files: { 'broken.py': 'print("starting")\nprint(1 / 1)\nprint("never printed")\n' }, fails: [1] },
    ],
  },
  '00-04-running-programs#The same failure in JavaScript': {
    wrong: [
      { name: 'a different error', files: { 'broken.js': 'console.log("starting");\nconsole.log(1 / 0);\nnull.x;\n' }, fails: [1] },
    ],
  },
  '00-04-running-programs#Challenge: choose your own exit code': {
    files: { 'exit-code.js': 'console.log("checking the spreadsheet...");\nprocess.exit(3);\n' },
    wrong: [
      { name: 'no file', fails: [0, 1] },
      { name: 'exits with 0', files: { 'exit-code.js': 'console.log("checking the spreadsheet...");\nprocess.exit(0);\n' }, fails: [1] },
      { name: 'ends by throwing (exit code 1)', files: { 'exit-code.js': 'console.log("checking the spreadsheet...");\nthrow new Error("3");\n' }, fails: [1] },
      { name: 'exits with 3 before printing', files: { 'exit-code.js': 'process.exit(3);\nconsole.log("checking the spreadsheet...");\n' }, fails: [1] },
      { name: 'Python-style exit', files: { 'exit-code.js': 'console.log("checking the spreadsheet...");\nsys.exit(3);\n' }, fails: [1] },
    ],
  },
  '00-04-running-programs#Clean up': {
    run: ['Remove-Item broken.py, broken.js, ticker.js'],
    wrong: [
      { name: 'removed only one file', run: ['Remove-Item broken.py'], fails: [1, 2] },
      { name: 'removed everything, hello.js too', run: ['Remove-Item broken.py, broken.js, ticker.js, hello.js'], fails: [3] },
    ],
  },

  // ── 1.1 ──────────────────────────────────────────────────────────────────
  '01-01-install-git#Tell Git who you are': {
    run: ['git config --global user.name "Ada Lovelace"', 'git config --global user.email "ada@example.com"'],
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      { name: 'set only the name', run: ['git config --global user.name "Ada Lovelace"'], fails: [1] },
      { name: 'set them for this folder only (no --global), before it is a repository', run: ['git config user.name "Ada Lovelace"', 'git config user.email "ada@example.com"'], fails: [0, 1] },
    ],
  },
  '01-01-install-git#Name the first branch main': {
    run: ['git config --global init.defaultBranch main'],
    wrong: [
      { name: 'did nothing (Git for Windows would use master)', fails: [0] },
      { name: 'set it to master', run: ['git config --global init.defaultBranch master'], fails: [0] },
    ],
  },

  // ── 1.2 ──────────────────────────────────────────────────────────────────
  '01-02-a-repository#git init': {
    run: ['git init'],
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'made a repository in a subfolder instead', run: ['git init inner'], fails: [0] },
    ],
  },

  // ── 1.3 ──────────────────────────────────────────────────────────────────
  '01-03-first-commit#Commit': {
    run: ['git add hello.js', 'git commit -m "Add hello.js, a first JavaScript program"'],
    wrong: [
      { name: 'staged but never committed', run: ['git add hello.js'], fails: [0, 1] },
      { name: 'committed everything at once', run: ['git add .', 'git commit -m "Add everything"'], fails: [2] },
    ],
  },

  // ── 1.4 ──────────────────────────────────────────────────────────────────
  '01-04-seeing-changes#Change hello.js': {
    wrong: [{ name: 'did not change the file', fails: [0] }],
  },
  '01-04-seeing-changes#Stage it, and see the diff move': {
    run: ['git add hello.js', 'git commit -m "Say how many cells the sheet starts with"'],
    wrong: [
      { name: 'did not commit', fails: [0, 1] },
      { name: 'a message that says nothing', run: ['git add hello.js', 'git commit -m "update"'], fails: [1] },
    ],
  },
  '01-04-seeing-changes#Commit the rest': {
    run: ['git add hello.py greet.py exit-code.js', 'git commit -m "Add the Python and exit-code examples from sprint 0"'],
    wrong: [
      { name: 'staged them but did not commit', run: ['git add hello.py greet.py exit-code.js'], fails: [0, 1, 2, 3] },
      { name: 'committed only hello.py', run: ['git add hello.py', 'git commit -m "Add hello.py"'], fails: [1, 2, 3] },
    ],
  },

  // ── 1.5 ──────────────────────────────────────────────────────────────────
  '01-05-ignore-and-line-endings#A file with a secret': {
    wrong: [{ name: 'no .env file', fails: [0] }],
  },
  '01-05-ignore-and-line-endings#.gitignore': {
    run: ['git add .gitignore', 'git commit -m "Never commit .env, where secrets will live"'],
    wrong: [
      { name: 'no .gitignore', fails: [0, 2] },
      { name: '.gitignore written but not committed', files: { '.gitignore': '.env\n' }, fails: [2] },
      {
        name: 'committed .env before ignoring it',
        // In this order: once .gitignore lists .env, `git add .env` refuses.
        run: ['git add .env', 'git commit -m "Add settings"', 'Set-Content .gitignore ".env"', 'git add .gitignore', 'git commit -m "Ignore .env"'],
        fails: [1],
      },
      { name: 'ignored a different name', files: { '.gitignore': 'env\n' }, run: ['git add .gitignore', 'git commit -m "Ignore env"'], fails: [0] },
    ],
  },
  '01-05-ignore-and-line-endings#Line endings, settled': {
    run: ['git add .gitattributes', 'git commit -m "Store and check out text files with LF line endings"'],
    wrong: [
      { name: 'written but not committed', files: { '.gitattributes': '* text=auto eol=lf\n' }, fails: [0, 2] },
      { name: 'without eol=lf', files: { '.gitattributes': '* text=auto\n' }, run: ['git add .gitattributes', 'git commit -m "Line endings"'], fails: [1] },
    ],
  },

  // ── 1.6 ──────────────────────────────────────────────────────────────────
  '01-06-undo-uncommitted#Make a mess': {
    wrong: [{ name: 'did not break the file', fails: [0] }],
  },
  '01-06-undo-uncommitted#See the damage, then throw it away': {
    run: ['git restore hello.js'],
    wrong: [
      { name: 'left the mess', fails: [0, 1] },
      { name: 'committed the broken file instead of restoring it', run: ['git commit -am "Broken"'], fails: [0] },
    ],
  },
  '01-06-undo-uncommitted#Unstaging': {
    run: ['git add hello.js', 'git restore --staged hello.js', 'git restore hello.js'],
    wrong: [
      {
        name: 'unstaged but kept the line',
        files: { 'hello.js': 'const name = "spreadsheet";\nconst cells = 26 * 100;\nconsole.log("Hello from Node, building a", name);\nconsole.log("It will have", cells, "cells to start with.");\nconsole.log("This line is staged, then unstaged.");\n' },
        run: ['git add hello.js', 'git restore --staged hello.js'],
        fails: [0, 1],
      },
      {
        name: 'committed the line',
        files: { 'hello.js': 'const name = "spreadsheet";\nconst cells = 26 * 100;\nconsole.log("Hello from Node, building a", name);\nconsole.log("It will have", cells, "cells to start with.");\nconsole.log("This line is staged, then unstaged.");\n' },
        run: ['git commit -am "Extra line"'],
        fails: [0],
      },
    ],
  },

  // ── 1.7 ──────────────────────────────────────────────────────────────────
  '01-07-branches#Make a branch': {
    run: ['git switch -c say-goodbye'],
    wrong: [{ name: 'created the branch but stayed on main', run: ['git branch say-goodbye'], fails: [0] }],
  },
  '01-07-branches#Commit on the branch': {
    run: ['git commit -am "Say goodbye at the end"'],
    wrong: [
      { name: 'did not commit', files: { 'hello.js': 'const name = "spreadsheet";\nconst cells = 26 * 100;\nconsole.log("Hello from Node, building a", name);\nconsole.log("It will have", cells, "cells to start with.");\nconsole.log("Goodbye for now.");\n' }, fails: [1, 2] },
      {
        name: 'committed on main instead',
        files: { 'hello.js': 'const name = "spreadsheet";\nconst cells = 26 * 100;\nconsole.log("Hello from Node, building a", name);\nconsole.log("It will have", cells, "cells to start with.");\nconsole.log("Goodbye for now.");\n' },
        run: ['git switch main', 'git commit -am "Say goodbye at the end"'],
        fails: [0],
      },
    ],
  },
  '01-07-branches#Switch back and forth': {
    run: ['git switch main', 'git switch say-goodbye'],
  },
  '01-07-branches#Merge the branch into main': {
    run: ['git switch main', 'git merge say-goodbye', 'git branch -d say-goodbye'],
    wrong: [
      { name: 'merged but kept the branch', run: ['git switch main', 'git merge say-goodbye'], fails: [3] },
      { name: 'switched to main without merging', run: ['git switch main'], fails: [1, 3] },
      { name: 'stayed on the branch', fails: [0, 3] },
    ],
  },

  // ── 1.8 ──────────────────────────────────────────────────────────────────
  '01-08-github#Connect the remote': {
    run: ['git remote add origin {BARE}'],
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'named the remote github', run: ['git remote add github {BARE}'], fails: [0] },
    ],
  },
  '01-08-github#Push': {
    run: ['git push -u origin main'],
    wrong: [{ name: 'did not push', fails: [0] }],
  },

  // ── 2.1 ──────────────────────────────────────────────────────────────────
  '02-01-a-page#Start a branch for the sprint': {
    run: ['git switch -c grid-page'],
    wrong: [{ name: 'stayed on main', fails: [0] }],
  },
  '02-01-a-page#The smallest real page': {
    wrong: [
      { name: 'no file', fails: [0, 1, 2] },
      { name: 'no <title>', files: { 'index.html': page({ title: '' }) }, fails: [1] },
      { name: 'title spelled differently', files: { 'index.html': page({ title: '<title>spreadsheet</title>' }) }, fails: [1] },
      { name: 'an h2 instead of an h1', files: { 'index.html': page({ body: '<h2>Spreadsheet</h2>' }) }, fails: [2] },
    ],
  },
  '02-01-a-page#Commit': {
    run: ['git add index.html', 'git commit -m "Add a page for the spreadsheet"'],
    wrong: [{ name: 'did not commit', fails: [0] }],
  },

  // ── 2.2 ──────────────────────────────────────────────────────────────────
  '02-02-a-table#The table': {
    wrong: [
      { name: 'columns out of order', files: { 'index.html': table({ headers: ['', 'B', 'A', 'C', 'D'] }) }, fails: [0] },
      { name: 'row numbers as td instead of th', files: { 'index.html': table({ rowHeaderTag: 'td' }) }, fails: [1, 2] },
      { name: 'row 2 is missing its empty Total cell', files: { 'index.html': table({ dropLastCellOfRow2: true }) }, fails: [2, 3] },
      { name: 'only three rows', files: { 'index.html': table({ rows: 3 }) }, fails: [1, 2] },
    ],
  },
  '02-02-a-table#Commit': {
    run: ['git commit -am "Draw a 4 by 4 grid as a table"'],
    wrong: [
      { name: 'did not commit', fails: [0] },
      { name: 'a message that says nothing', run: ['git commit -am "more html"'], fails: [1] },
    ],
  },

  // ── 2.3 ──────────────────────────────────────────────────────────────────
  '02-03-css#Link a stylesheet': {
    wrong: [
      { name: 'links styles.css (a different name)', files: { 'index.html': table({ link: '<link rel="stylesheet" href="styles.css">' }) }, fails: [0] },
    ],
  },
  '02-03-css#The stylesheet': {
    wrong: [
      { name: 'no stylesheet', fails: [0, 1, 2, 3] },
      { name: 'saved as styles.css, which the page does not link', files: { 'styles.css': CSS }, fails: [0, 1, 2, 3] },
      { name: 'forgot border-collapse', files: { 'style.css': CSS.replace('  border-collapse: collapse;\n', '') }, fails: [1] },
      { name: 'made every th sticky, row numbers too', files: { 'style.css': CSS.replace('thead th {', 'th {') }, fails: [4] },
    ],
  },
  '02-03-css#Commit': {
    run: ['git add style.css', 'git commit -am "Style the grid like a spreadsheet"'],
    wrong: [{ name: 'commit -a without adding the new file', run: ['git commit -am "Style the grid"'], fails: [0, 1] }],
  },

  // ── 2.4 ──────────────────────────────────────────────────────────────────
  '02-04-devtools#Challenge: right-align the row numbers': {
    files: { 'style.css': CSS + '\ntbody th {\n  text-align: right;\n}\n' },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'every th, column letters too', files: { 'style.css': CSS + '\nth {\n  text-align: right;\n}\n' }, fails: [1] },
      { name: 'every cell', files: { 'style.css': CSS + '\nth,\ntd {\n  text-align: right;\n}\n' }, fails: [1, 2] },
      // Measured: in Chromium the row numbers DO inherit this (th's default centring gives way
      // to an inherited text-align), but so do the data cells, which check 2 catches.
      { name: 'on tbody itself (row numbers inherit it, but so do the data cells)', files: { 'style.css': CSS + '\ntbody {\n  text-align: right;\n}\n' }, fails: [2] },
      { name: 'a class selector by mistake', files: { 'style.css': CSS + '\n.tbody th {\n  text-align: right;\n}\n' }, fails: [0] },
    ],
  },
  '02-04-devtools#Merge the sprint and push': {
    run: ['git commit -am "Right-align row numbers"', 'git switch main', 'git merge grid-page', 'git push', 'git branch -d grid-page'],
    wrong: [
      { name: 'merged but did not push', run: ['git commit -am "Right-align row numbers"', 'git switch main', 'git merge grid-page', 'git branch -d grid-page'], fails: [3] },
      { name: 'switched to main without merging', run: ['git commit -am "Right-align row numbers"', 'git switch main'], fails: [1, 2] },
      { name: 'pushed the branch instead of merging', run: ['git commit -am "Right-align row numbers"', 'git push -u origin grid-page'], fails: [0, 2] },
    ],
  },

  // ── 3.1 ──────────────────────────────────────────────────────────────────
  '03-01-javascript-from-python#A branch for the sprint': {
    run: ['git switch -c js-grid'],
    wrong: [{ name: 'stayed on main', fails: [0] }],
  },
  '03-01-javascript-from-python#A script on the page': {
    wrong: [
      { name: 'misspelled the file name', edit: [['<script src="grid.js">', '<script src="gird.js">']], fails: [0] },
    ],
  },
  '03-01-javascript-from-python#grid.js': {
    wrong: [
      { name: 'no grid.js', fails: [0, 1] },
      { name: 'Python print', files: { 'grid.js': 'print("The grid will have", 26 * 100, "cells.")\n' }, fails: [1] },
      { name: 'a different message', edit: [['"The grid will have", columns * rows, "cells."', '"Cells:", columns * rows']], fails: [1] },
      { name: 'joined with + and no spaces', edit: [['"The grid will have", columns * rows, "cells."', '"The grid will have" + columns * rows + "cells."']], fails: [1] },
    ],
  },
  '03-01-javascript-from-python#When the script has an error': {
    wrong: [{ name: 'left the typo in', editFiles: { 'grid.js': [['console.log("The grid will have", columns', 'console.log("The grid will have", colums']] }, fails: [0] }],
  },
  '03-01-javascript-from-python#Commit': {
    run: ['git add grid.js', 'git commit -am "Run a first script on the page"'],
    wrong: [{ name: 'commit -a without adding grid.js', run: ['git commit -am "Run a first script"'], fails: [0, 1] }],
  },

  // ── 3.2 ──────────────────────────────────────────────────────────────────
  '03-02-functions-and-loops#A function': {
    wrong: [
      { name: 'started from 64 (one letter early)', edit: [['65 + index', '64 + index']], fails: [0, 1, 2] },
      { name: 'loop stops one short', edit: [['i < columns', 'i < columns - 1']], fails: [2] },
      { name: 'joined without spaces', edit: [['names.join(" ")', 'names.join("")']], fails: [2] },
      { name: 'Python chr()', edit: [['String.fromCharCode(65 + index)', 'chr(65 + index)']], fails: [0, 1, 2] },
    ],
  },
  '03-02-functions-and-loops#Commit': {
    run: ['git commit -am "Name the columns A to Z"'],
    wrong: [{ name: 'did not commit', editFiles: { 'grid.js': [['const columns = 26;', 'const columns = 26; // uncommitted']] }, fails: [0] }],
  },

  // ── 3.3 ──────────────────────────────────────────────────────────────────
  '03-03-the-dom#An empty table in the page': {
    wrong: [
      { name: 'kept the hand-typed table', fails: [0, 1] },
      { name: 'table without the id', edit: [['<table id="grid"></table>', '<table></table>']], fails: [0] },
    ],
  },
  '03-03-the-dom#Build the table in grid.js': {
    wrong: [
      { name: 'one row short', edit: [['r < rows', 'r < rows - 1']], fails: [3, 4, 5] },
      { name: 'forgot the corner cell', edit: [['headerRow.appendChild(document.createElement("th"));\n', '']], fails: [0, 1] },
      { name: 'rows numbered from 0', edit: [['rowHeader.textContent = r + 1;', 'rowHeader.textContent = r;']], fails: [4] },
      { name: 'never added the body to the table', edit: [['table.appendChild(body);', '']], fails: [3, 4, 5] },
      { name: 'looked up the table by a selector without #', edit: [['document.querySelector("#grid")', 'document.querySelector("grid")']], fails: [0, 1, 2, 3, 4, 5] },
    ],
  },
  '03-03-the-dom#Commit': {
    run: ['git commit -am "Build the 26 by 100 grid with JavaScript"'],
    wrong: [{ name: 'did not commit', editFiles: { 'grid.js': [['const rows = 100;', 'const rows = 100; // uncommitted']] }, fails: [0] }],
  },

  // ── 3.4 ──────────────────────────────────────────────────────────────────
  '03-04-selecting-a-cell#The name box': {
    wrong: [{ name: 'no name box', fails: [0] }],
  },
  '03-04-selecting-a-cell#Styles for the box and the selection': {
    wrong: [{ name: 'no new rules', fails: [0, 1] }],
  },
  '03-04-selecting-a-cell#Listening for clicks': {
    wrong: [
      { name: 'arguments swapped: select(r, c)', edit: [['() => select(c, r)', '() => select(r, c)']], fails: [1, 2, 3] },
      { name: 'no brackets around row + 1 ("A01")', edit: [['columnName(column) + (row + 1)', 'columnName(column) + row + 1']], fails: [0, 1, 2] },
      { name: 'never removes the old outline', edit: [['    selected.classList.remove("selected");\n', '']], fails: [2] },
      { name: 'no starting selection', edit: [['\nselect(0, 0);\n', '\n']], fails: [0] },
      { name: 'forgot the + 1 for the row-number column', edit: [['cells[column + 1]', 'cells[column]']], fails: [3] },
      { name: 'called select instead of passing a function', edit: [['td.addEventListener("click", () => select(c, r));', 'td.addEventListener("click", select(c, r));']], fails: [0, 1, 2, 3] },
    ],
  },
  '03-04-selecting-a-cell#Break it on purpose: arguments in the wrong order': {
    wrong: [{ name: 'left the arguments swapped', editFiles: { 'grid.js': [['() => select(c, r)', '() => select(r, c)']] }, fails: [0] }],
  },
  '03-04-selecting-a-cell#Commit': {
    run: ['git commit -am "Select a cell by clicking it"'],
    wrong: [{ name: 'did not commit', editFiles: { 'grid.js': [['const rows = 100;', 'const rows = 100; // uncommitted']] }, fails: [0] }],
  },

  // ── 3.5 ──────────────────────────────────────────────────────────────────
  '03-05-typing-into-cells#The input': {
    wrong: [{ name: 'no input', fails: [0] }],
  },
  '03-05-typing-into-cells#Style the toolbar': {
    wrong: [
      { name: 'no new styles', fails: [0, 1] },
      { name: 'forgot display: flex', edit: [['  display: flex;\n  gap: 8px;\n', '  gap: 8px;\n']], fails: [1] },
    ],
  },
  '03-05-typing-into-cells#Keyboard events': {
    wrong: [
      { name: 'never focuses the formula bar', edit: [['  formulaBar.focus();\n', '']], fails: [0] },
      { name: 'Enter writes the cell but does not move down', edit: [['    if (selectedRow + 1 < rows) {\n      select(selectedColumn, selectedRow + 1);\n    }\n', '']], fails: [1] },
      { name: 'no check for the last row', edit: [['    if (selectedRow + 1 < rows) {\n      select(selectedColumn, selectedRow + 1);\n    }\n', '    select(selectedColumn, selectedRow + 1);\n']], fails: [4] },
      { name: 'every key writes the cell', edit: [['  if (event.key === "Enter") {', '  {']], fails: [2] },
      { name: 'select does not show the cell in the bar', edit: [['  formulaBar.value = selected.textContent;\n', '']], fails: [3] },
      { name: '== "enter" (wrong case)', edit: [['event.key === "Enter"', 'event.key === "enter"']], fails: [1, 4] },
    ],
  },
  '03-05-typing-into-cells#Commit': {
    run: ['git commit -am "Type into cells through the formula bar"'],
    wrong: [{ name: 'did not commit', editFiles: { 'grid.js': [['const rows = 100;', 'const rows = 100; // uncommitted']] }, fails: [0] }],
  },

  // ── 3.6 ──────────────────────────────────────────────────────────────────
  '03-06-columns-past-z#The challenge': {
    editFiles: {
      'grid.js': [
        ['const columns = 26;', 'const columns = 30;'],
        ['function columnName(index) {\n  return String.fromCharCode(65 + index);\n}', 'function columnName(index) {\n  let name = "";\n  while (index >= 0) {\n    name = String.fromCharCode(65 + (index % 26)) + name;\n    index = Math.floor(index / 26) - 1;\n  }\n  return name;\n}'],
      ],
    },
    wrong: [
      { name: 'only changed the column count', editFiles: { 'grid.js': [['const columns = 26;', 'const columns = 30;']] }, fails: [2, 3, 4, 5, 6, 7, 8] },
      {
        name: 'plain base 26 (no "subtract one more")',
        editFiles: { 'grid.js': [['const columns = 26;', 'const columns = 30;'], ['function columnName(index) {\n  return String.fromCharCode(65 + index);\n}', 'function columnName(index) {\n  let name = "";\n  do {\n    name = String.fromCharCode(65 + (index % 26)) + name;\n    index = Math.floor(index / 26);\n  } while (index > 0);\n  return name;\n}']] },
        fails: [2, 3, 4, 5, 6, 7, 8],
      },
      {
        name: 'handles two letters but not three',
        editFiles: { 'grid.js': [['const columns = 26;', 'const columns = 30;'], ['function columnName(index) {\n  return String.fromCharCode(65 + index);\n}', 'function columnName(index) {\n  if (index < 26) {\n    return String.fromCharCode(65 + index);\n  }\n  return String.fromCharCode(64 + Math.floor(index / 26)) + String.fromCharCode(65 + (index % 26));\n}']] },
        fails: [7],
      },
      {
        name: 'letters in the wrong order',
        editFiles: { 'grid.js': [['const columns = 26;', 'const columns = 30;'], ['function columnName(index) {\n  return String.fromCharCode(65 + index);\n}', 'function columnName(index) {\n  let name = "";\n  while (index >= 0) {\n    name = name + String.fromCharCode(65 + (index % 26));\n    index = Math.floor(index / 26) - 1;\n  }\n  return name;\n}']] },
        fails: [3, 5],
      },
      {
        name: 'right function, but the grid still has 26 columns',
        editFiles: { 'grid.js': [['function columnName(index) {\n  return String.fromCharCode(65 + index);\n}', 'function columnName(index) {\n  let name = "";\n  while (index >= 0) {\n    name = String.fromCharCode(65 + (index % 26)) + name;\n    index = Math.floor(index / 26) - 1;\n  }\n  return name;\n}']] },
        fails: [8],
      },
    ],
  },
  // ── 4.1 ──────────────────────────────────────────────────────────────────
  '04-01-modules#A branch': {
    run: ['git switch -c modules-and-vite'],
    wrong: [{ name: 'stayed on main', fails: [0] }],
  },
  '04-01-modules#columns.js': {
    wrong: [{ name: 'no export', edit: [['export function', 'function']], fails: [0] }],
  },
  '04-01-modules#Import it in grid.js': {
    wrong: [
      { name: 'import without ./', edit: [['from "./columns.js"', 'from "columns.js"']], fails: [0] },
      { name: 'kept a copy of columnName in grid.js', edit: [['const columns = 26;', 'function columnName(index) {\n  return String.fromCharCode(65 + index);\n}\n\nconst columns = 26;']], fails: [1] },
    ],
  },
  "04-01-modules#Tell the browser it's a module": {
    wrong: [{ name: 'no type="module"', edit: [['<script type="module" src="grid.js">', '<script src="grid.js">']], fails: [0] }],
  },
  '04-01-modules#The wall': {
    wrong: [
      { name: 'imports a file that does not exist', editFiles: { 'grid.js': [['"./columns.js"', '"./column.js"']] }, fails: [0] },
      { name: 'columns.js forgets export', editFiles: { 'columns.js': [['export function', 'function']] }, fails: [0, 1] },
      { name: 'script tag without type="module"', editFiles: { 'index.html': [['<script type="module" src="grid.js">', '<script src="grid.js">']] }, fails: [0] },
    ],
  },
  "04-01-modules#Commit, even though it's broken": {
    run: ['git add columns.js', 'git commit -am "Move columnName into its own module"'],
    wrong: [{ name: 'commit -a without adding columns.js', run: ['git commit -am "Move columnName"'], fails: [0, 1] }],
  },

  // ── 4.2 ──────────────────────────────────────────────────────────────────
  '04-02-npm#package.json': {
    run: ['npm init -y'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '04-02-npm#Install Vite': {
    run: ['npm install --save-dev vite'],
    wrong: [{ name: 'did nothing', fails: [0, 1, 2] }],
  },
  '04-02-npm#Keep node_modules out of Git': {
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'replaced .gitignore, losing .env', files: { '.gitignore': 'node_modules\n' }, fails: [1] },
    ],
  },
  '04-02-npm#Fix package.json': {
    wrong: [
      { name: "kept npm's guesses", fails: [0, 1, 2] },
      { name: 'type module but no scripts', edit: [['  "scripts": {\n    "dev": "vite",\n    "build": "vite build",\n    "preview": "vite preview"\n  },\n', '']], fails: [1, 2] },
    ],
  },
  '04-02-npm#Commit': {
    run: ['git add package.json package-lock.json .gitignore', 'git commit -m "Install Vite with npm"'],
    wrong: [{ name: 'commit -a only (new files left out)', run: ['git commit -am "Install Vite"'], fails: [0, 1, 3] }],
  },

  // ── 4.3 ──────────────────────────────────────────────────────────────────
  '04-03-dev-server#Start Vite': {
    wrong: [{ name: 'node_modules deleted', run: ['Remove-Item node_modules -Recurse -Force'], fails: [0, 1] }],
  },

  // ── 4.4 ──────────────────────────────────────────────────────────────────
  '04-04-build#Build': {
    run: ['npm run build'],
    wrong: [{ name: 'a syntax error the build stops on', editFiles: { 'grid.js': [['const rows = 100;', 'const rows = ;']] }, fails: [0, 1] }],
  },
  '04-04-build#Keep dist out of Git': {
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'replaced .gitignore with just dist', files: { '.gitignore': '.env\ndist\n' }, fails: [1] },
    ],
  },
  '04-04-build#Merge the sprint and push': {
    run: ['git commit -am "Build with Vite; never commit dist"', 'git switch main', 'git merge modules-and-vite', 'git push', 'git branch -d modules-and-vite'],
    wrong: [
      { name: 'merged but did not push', run: ['git commit -am "Build with Vite"', 'git switch main', 'git merge modules-and-vite', 'git branch -d modules-and-vite'], fails: [3] },
      { name: 'did not merge', run: ['git commit -am "Build with Vite"'], fails: [0, 1] },
    ],
  },

  // ── 5.1 ──────────────────────────────────────────────────────────────────
  '05-01-typescript#A branch': {
    run: ['git switch -c typescript'],
    wrong: [{ name: 'stayed on main', fails: [0] }],
  },
  '05-01-typescript#Install TypeScript': {
    run: ['npm install --save-dev typescript'],
    wrong: [{ name: 'did nothing', fails: [0, 1] }],
  },
  '05-01-typescript#tsconfig.json': {
    wrong: [
      { name: 'not strict', edit: [['    "strict": true,\n', '']], fails: [0] },
      { name: 'without noUncheckedIndexedAccess', edit: [['    "noUncheckedIndexedAccess": true,\n', '']], fails: [1] },
      { name: 'without noEmit', edit: [['    "noEmit": true,\n', '']], fails: [2] },
    ],
  },
  '05-01-typescript#Rename the files to .ts': {
    before: ['git mv columns.js columns.ts', 'git mv grid.js grid.ts'],
    wrong: [
      { name: 'copied instead of renaming, import unchanged', run: ['Copy-Item grid.js grid.ts', 'Copy-Item columns.js columns.ts'], fails: [2, 3] },
    ],
  },
  '05-01-typescript#Point the page at grid.ts': {
    // Measured: Vite answers a request for grid.js with grid.ts when there's no grid.js, so the
    // page still works; only the text check catches it. The lesson says so.
    wrong: [{ name: 'still loads grid.js', edit: [['src="grid.ts"', 'src="grid.js"']], fails: [0] }],
  },
  '05-01-typescript#Commit the conversion': {
    run: ['git add tsconfig.json', 'git commit -am "Convert to TypeScript (24 type errors to fix)"'],
    wrong: [{ name: 'commit -a without adding tsconfig.json', run: ['git commit -am "Convert to TypeScript"'], fails: [0, 3] }],
  },

  // ── 5.2 ──────────────────────────────────────────────────────────────────
  '05-02-fixing-type-errors#Say what columnName takes and gives': {
    wrong: [
      { name: 'no return type', edit: [['): string {', ') {']], fails: [1] },
      { name: 'index: any', edit: [['index: number', 'index: any']], fails: [0] },
    ],
  },
  '05-02-fixing-type-errors#Zero errors': {
    wrong: [
      { name: 'left out the ?. on the row', editFiles: { 'grid.ts': [['body.rows[row]?.cells', 'body.rows[row].cells']] }, fails: [0] },
      { name: 'textContent given a number', editFiles: { 'grid.ts': [['String(r + 1)', 'r + 1']] }, fails: [0] },
      { name: 'type-checks, but forgot the + 1 for the row-number column', editFiles: { 'grid.ts': [['cells[column + 1]', 'cells[column]']] }, fails: [2] },
    ],
  },
  '05-02-fixing-type-errors#Commit': {
    run: ['git commit -am "Fix the type errors"'],
    wrong: [{ name: 'did not commit', editFiles: { 'grid.ts': [['const rows = 100;', 'const rows = 100; // uncommitted']] }, fails: [0] }],
  },

  // ── 5.3 ──────────────────────────────────────────────────────────────────
  '05-03-types-in-the-workflow#A check script, and a build that checks first': {
    wrong: [
      { name: 'build without tsc', edit: [['"build": "tsc && vite build"', '"build": "vite build"']], fails: [1] },
      { name: 'no check script', edit: [['    "check": "tsc",\n', '']], fails: [0] },
    ],
  },
  '05-03-types-in-the-workflow#What it catches': {
    wrong: [{ name: 'left the typo in', editFiles: { 'grid.ts': [['r < rows; r++', 'r < rws; r++']] }, fails: [0] }],
  },
  "05-03-types-in-the-workflow#What it doesn't catch": {
    wrong: [{ name: 'left the arguments swapped (still type-checks)', editFiles: { 'grid.ts': [['() => select(c, r)', '() => select(r, c)']] }, fails: [0] }],
  },
  '05-03-types-in-the-workflow#Merge the sprint and push': {
    run: ['git commit -am "Type-check before every build"', 'git switch main', 'git merge typescript', 'git push', 'git branch -d typescript'],
    wrong: [
      { name: 'merged but did not push', run: ['git commit -am "Type-check"', 'git switch main', 'git merge typescript', 'git branch -d typescript'], fails: [3] },
      { name: 'did not merge', run: ['git commit -am "Type-check"'], fails: [0, 1] },
    ],
  },

  // ── 6.1 ──────────────────────────────────────────────────────────────────
  '06-01-first-test#A branch': {
    run: ['git switch -c tests-and-model'],
    wrong: [{ name: 'stayed on main', fails: [0] }],
  },
  '06-01-first-test#Install Vitest': {
    run: ['npm install --save-dev vitest'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '06-01-first-test#Run it': {
    wrong: [
      // The file is typed in the step before ("A test file"); these change it afterwards.
      { name: 'no test file', run: ['Remove-Item columns.test.ts'], fails: [0, 1] },
      { name: 'a test that expects the wrong answer', files: { 'columns.test.ts': 'import { expect, it } from "vitest";\nimport { columnName } from "./columns.ts";\n\nit("names column 26", () => {\n  expect(columnName(26)).toBe("BA");\n});\n' }, fails: [1] },
      { name: 'test file named columns.tests.ts (Vitest never finds it)', run: ['Rename-Item columns.test.ts columns.tests.ts'], fails: [0, 1] },
    ],
  },
  '06-01-first-test#A test should be able to fail': {
    wrong: [
      {
        name: 'left columnName broken',
        editFiles: { 'columns.ts': [['  while (index >= 0) {\n    name = String.fromCharCode(65 + (index % 26)) + name;\n    index = Math.floor(index / 26) - 1;\n  }', '  do {\n    name = String.fromCharCode(65 + (index % 26)) + name;\n    index = Math.floor(index / 26);\n  } while (index > 0);']] },
        fails: [0],
      },
    ],
  },
  '06-01-first-test#npm test': {
    wrong: [{ name: 'no test script', edit: [['    "test": "vitest run",\n', '']], fails: [0, 1] }],
  },
  '06-01-first-test#Commit': {
    run: ['git add columns.test.ts', 'git commit -am "Test columnName"'],
    wrong: [{ name: 'commit -a without adding the test file', run: ['git commit -am "Test columnName"'], fails: [0, 1] }],
  },

  // ── 6.2 ──────────────────────────────────────────────────────────────────
  '06-02-test-first#Red: a test for code that doesn\'t exist': {
    wrong: [
      { name: 'wrote columnIndex before the test went red', editFiles: { 'columns.ts': [['  return name;\n}\n', '  return name;\n}\n\nexport function columnIndex(name: string): number {\n  return name.charCodeAt(0) - 65;\n}\n']] }, typeFile: true, fails: [0] },
    ],
  },
  '06-02-test-first#Green: the simplest thing that passes': {
    wrong: [
      { name: 'off by one (A is 1)', edit: [['- 65;', '- 64;']], fails: [0] },
      { name: 'not exported', edit: [['export function columnIndex', 'function columnIndex']], fails: [0] },
    ],
  },
  '06-02-test-first#Green: letters as digits': {
    wrong: [
      { name: 'forgot the final - 1', edit: [['  return index - 1;\n}', '  return index;\n}']], fails: [0] },
      // Reading right to left can't be caught here: A, Z and AA read the same both ways. The
      // next step's round-trip test catches it; that's the point of writing it.
    ],
  },
  '06-02-test-first#Refactor the tests: check every column': {
    wrong: [
      { name: 'letters read right to left (passes the earlier tests)', editFiles: { 'columns.ts': [['for (const letter of name)', 'for (const letter of [...name].reverse())']] }, typeFile: true, fails: [0, 1] },
      { name: 'columnIndex wrong past two letters', editFiles: { 'columns.ts': [['  let index = 0;\n  for (const letter of name) {\n    index = index * 26 + (letter.charCodeAt(0) - 64);\n  }\n  return index - 1;', '  if (name.length === 1) {\n    return name.charCodeAt(0) - 65;\n  }\n  return (name.charCodeAt(0) - 64) * 26 + (name.charCodeAt(1) - 65);']] }, fails: [0, 1] },
    ],
  },
  '06-02-test-first#Commit': {
    run: ['git commit -am "Add columnIndex, test first"'],
    wrong: [{ name: 'did not commit', fails: [0] }],
  },

  // ── 6.3 ──────────────────────────────────────────────────────────────────
  '06-03-addresses#The tests': {
    wrong: [{ name: 'no test file', fails: [0, 1] }],
  },
  '06-03-addresses#address.ts': {
    wrong: [
      { name: 'accepts B0 (pattern allows a leading 0)', edit: [['([1-9][0-9]*)', '([0-9]+)']], fails: [0, 2] },
      { name: 'no ^ and $', edit: [['/^([A-Z]+)([1-9][0-9]*)$/', '/([A-Z]+)([1-9][0-9]*)/']], fails: [0] },
      { name: 'rows counted from 1 inside the program', edit: [['row: Number(digits) - 1', 'row: Number(digits)']], fails: [0, 2] },
      { name: 'no undefined check (tests pass, types fail)', edit: [['  if (letters === undefined || digits === undefined) {\n    return null;\n  }\n', '']], fails: [1] },
      { name: 'upper case only', edit: [['.exec(text.toUpperCase())', '.exec(text)']], fails: [0, 2] },
    ],
  },
  '06-03-addresses#Commit': {
    run: ['git add address.ts address.test.ts', 'git commit -m "Add the Address type, with formatAddress and parseAddress"'],
    wrong: [{ name: 'commit -a only', run: ['git commit -am "Address"'], fails: [0, 1, 2] }],
  },

  // ── 6.4 ──────────────────────────────────────────────────────────────────
  '06-04-the-sheet#Tests first': {
    wrong: [{ name: 'no test file', fails: [0, 1] }],
  },
  '06-04-the-sheet#The class': {
    wrong: [
      { name: 'stores empty text instead of deleting', edit: [['    if (text === "") {\n      this.cells.delete(key);\n    } else {\n      this.cells.set(key, text);\n    }', '    this.cells.set(key, text);']], fails: [0, 2] },
      // Not a wrong answer: swapping column and row *inside* the key is invisible from outside,
      // because get and set agree. Only the key's spelling changes.
      { name: 'get and set use different keys', edit: [['    const key = formatAddress(address);', '    const key = formatAddress({ column: address.row, row: address.column });']], fails: [0, 2] },
      { name: 'get returns undefined for empty cells', edit: [['return this.cells.get(formatAddress(address)) ?? "";', 'return this.cells.get(formatAddress(address)) as string;']], fails: [0] },
    ],
  },
  '06-04-the-sheet#Commit': {
    run: ['git add sheet.ts sheet.test.ts', 'git commit -m "Add the Sheet class"'],
    wrong: [{ name: 'commit -a only', run: ['git commit -am "Sheet"'], fails: [0, 1] }],
  },

  // ── 6.5 ──────────────────────────────────────────────────────────────────
  '06-05-wire-the-sheet#The new grid.ts': {
    wrong: [
      { name: 'Enter never stores in the sheet', edit: [['    sheet.set(selected, formulaBar.value);\n', '']], fails: [3, 4] },
      { name: 'formula bar shows the cell text, not the sheet', edit: [['  formulaBar.value = sheet.get(address);', '  formulaBar.value = "";']], fails: [4] },
      // Swapped consistently, so going back to "C2" finds what was typed there (check 4 passes);
      // writing C2 and the last row expose it.
      { name: 'column and row swapped when clicking', edit: [['select({ column: c, row: r })', 'select({ column: r, row: c })']], fails: [3, 5] },
      { name: 'old cell never un-outlined', edit: [['  cellAt(selected)?.classList.remove("selected");\n', '']], fails: [6] },
    ],
  },
  '06-05-wire-the-sheet#Watch it run: the debugger': {
    wrong: [{ name: 'left a debugger statement in', editFiles: { 'grid.ts': [['    sheet.set(selected, formulaBar.value);', '    debugger;\n    sheet.set(selected, formulaBar.value);']] }, fails: [0] }],
  },
  '06-05-wire-the-sheet#Commit': {
    run: ['git commit -am "Keep the data in a Sheet; the grid only draws it"'],
    wrong: [{ name: 'did not commit', fails: [0] }],
  },

  // ── 6.6 ──────────────────────────────────────────────────────────────────
  '06-06-tidy-into-src#Remove the practice files': {
    run: ['git rm hello.py hello.js greet.py exit-code.js'],
    wrong: [{ name: 'removed only hello.py', run: ['git rm hello.py'], fails: [1, 2, 3] }],
  },
  '06-06-tidy-into-src#Move the source into src': {
    run: ['mkdir src', 'git mv address.ts address.test.ts columns.ts columns.test.ts grid.ts sheet.ts sheet.test.ts style.css src'],
    wrong: [
      { name: 'copied instead of moving', run: ['mkdir src', 'Copy-Item *.ts, style.css src'], fails: [2] },
      { name: 'left style.css behind', run: ['mkdir src', 'git mv address.ts address.test.ts columns.ts columns.test.ts grid.ts sheet.ts sheet.test.ts src'], fails: [1] },
    ],
  },
  '06-06-tidy-into-src#Point the page and the compiler at src': {
    wrong: [
      { name: 'script still points at grid.ts at the top', edit: [['src="/src/grid.ts"', 'src="grid.ts"']], fails: [0] },
    ],
  },
  '06-06-tidy-into-src#And the compiler': {
    wrong: [
      { name: 'tsconfig still includes *.ts', edit: [['"include": ["src"]', '"include": ["*.ts"]']], fails: [0, 1] },
      { name: 'page still points at style.css at the top', editFiles: { 'index.html': [['href="/src/style.css"', 'href="style.css"']] }, fails: [4] },
    ],
  },
  '06-06-tidy-into-src#Merge the sprint and push': {
    run: ['git commit -am "Move the source into src; remove the sprint 0 practice files"', 'git switch main', 'git merge tests-and-model', 'git push', 'git branch -d tests-and-model'],
    wrong: [
      { name: 'merged but did not push', run: ['git commit -am "src"', 'git switch main', 'git merge tests-and-model', 'git branch -d tests-and-model'], fails: [3] },
      { name: 'did not merge', run: ['git commit -am "src"'], fails: [0, 1] },
    ],
  },

  // ── 7.1 ──────────────────────────────────────────────────────────────────
  '07-01-tokens#A branch': {
    run: ['git switch -c formulas'],
    wrong: [{ name: 'stayed on main', fails: [0] }],
  },
  '07-01-tokens#The tests first': {
    wrong: [{ name: 'no test file', fails: [0, 1] }],
  },
  '07-01-tokens#The lexer': {
    wrong: [
      { name: 'no branch for spaces', edit: [['    if (char === " ") {\n      i++;\n    } else if', '    if']], fails: [0, 2] },
      { name: 'records where a number ends, not where it starts', edit: [['tokens.push({ kind: "number", value, start });', 'tokens.push({ kind: "number", value, start: i });']], fails: [0, 2] },
      { name: 'words made of letters only (B12 is read as B)', edit: [['while (isLetter(text.charAt(i)) || isDigit(text.charAt(i))) {', 'while (isLetter(text.charAt(i))) {']], fails: [0, 2] },
    ],
  },
  '07-01-tokens#Commit': {
    run: ['git add src/lexer.ts src/lexer.test.ts', 'git commit -m "Add the formula lexer"'],
    wrong: [{ name: 'commit -a only (new files left out)', run: ['git commit -am "Lexer"'], fails: [0, 1] }],
  },

  // ── 7.2 ──────────────────────────────────────────────────────────────────
  '07-02-trees#Values: what a cell can hold': {
    wrong: [{ name: 'no file', fails: [0, 1] }],
  },
  "07-02-trees#The tree's type": {
    wrong: [{ name: 'no file', fails: [0] }],
  },
  '07-02-trees#Tests with hand-built trees': {
    wrong: [{ name: 'no test file', fails: [0, 1] }],
  },
  '07-02-trees#The evaluator, and recursion': {
    wrong: [
      { name: 'text counts as 0 instead of #VALUE!', edit: [['return value === "" ? 0 : { error: "#VALUE!" };', 'return 0;']], fails: [0, 2] },
      { name: 'no division-by-zero check (gives Infinity)', edit: [['return right === 0 ? { error: "#DIV/0!" } : left / right;', 'return left / right;']], fails: [0, 2] },
      { name: 'left and right swapped in calculate', edit: [['return calculate(expression.op, left, right);', 'return calculate(expression.op, right, left);']], fails: [0, 2] },
    ],
  },
  '07-02-trees#Commit': {
    run: ['git add src/values.ts src/expression.ts src/evaluate.ts src/evaluate.test.ts', 'git commit -m "Add expression trees and the evaluator"'],
    wrong: [{ name: 'commit -a only', run: ['git commit -am "Evaluator"'], fails: [0, 1] }],
  },

  // ── 7.3 ──────────────────────────────────────────────────────────────────
  '07-03-parser#The tests': {
    wrong: [{ name: 'no test file', fails: [0, 1] }],
  },
  '07-03-parser#The parser': {
    wrong: [
      {
        name: 'precedence flipped: + and - in the deeper rule',
        edit: [
          ['while (token.kind === "operator" && (token.op === "+" || token.op === "-")) {', 'while (token.kind === "operator" && (token.op === "*" || token.op === "/")) {'],
          ['while (token.kind === "operator" && (token.op === "*" || token.op === "/")) {\n      advance();\n      left = { kind: "binary", op: token.op, left, right: factor() };', 'while (token.kind === "operator" && (token.op === "+" || token.op === "-")) {\n      advance();\n      left = { kind: "binary", op: token.op, left, right: factor() };'],
        ],
        fails: [0, 2],
      },
      { name: 'groups right to left (10-2-3 = 11)', edit: [['left = { kind: "binary", op: token.op, left, right: term() };', 'left = { kind: "binary", op: token.op, left, right: expression() };']], fails: [0, 2] },
      { name: 'no check for text after the formula', edit: [['  if (extra.kind !== "end") {\n    throw new FormulaError("Unexpected text after the end of the formula", extra.start);\n  }\n', '']], fails: [0, 3] },
    ],
  },
  '07-03-parser#Commit': {
    run: ['git add src/parser.ts src/parser.test.ts', 'git commit -m "Add the formula parser"'],
    wrong: [{ name: 'commit -a only', run: ['git commit -am "Parser"'], fails: [0, 1] }],
  },

  // ── 7.4 ──────────────────────────────────────────────────────────────────
  '07-04-cell-values#The tests': {
    wrong: [{ name: 'no test file', fails: [0, 1] }],
  },
  '07-04-cell-values#compute.ts': {
    wrong: [
      { name: 'no blank check (empty cells become 0)', edit: [['if (text.trim() !== "" && !Number.isNaN(Number(text))) {', 'if (!Number.isNaN(Number(text))) {']], fails: [0, 2] },
      { name: 'valueAt gives the raw text, not the value', edit: [['return evaluate(expression, (other) => cellValue(sheet, other));', 'return evaluate(expression, (other) => sheet.get(other));']], fails: [0, 2] },
    ],
  },
  '07-04-cell-values#Commit': {
    run: ['git add src/compute.ts src/compute.test.ts', 'git commit -m "Work out cell values, formulas included"'],
    wrong: [{ name: 'commit -a only', run: ['git commit -am "Compute"'], fails: [0, 1] }],
  },

  // ── 7.5 ──────────────────────────────────────────────────────────────────
  '07-05-formulas-on-the-page#Try it': {
    wrong: [{ name: 'Enter stores the text but never redraws', editFiles: { 'src/grid.ts': [['    showAll();\n', '']] }, fails: [1, 2] }],
  },
  '07-05-formulas-on-the-page#Commit': {
    run: ['git commit -am "Show formula values in the grid"'],
    wrong: [{ name: 'did not commit', fails: [0] }],
  },

  // ── 7.6 ──────────────────────────────────────────────────────────────────
  '07-06-cycles#The tests': {
    wrong: [{ name: 'did not add the cycle tests', typeFile: false, fails: [0] }],
  },
  '07-06-cycles#Mark the error': {
    wrong: [{ name: 'no #CYCLE! code', fails: [0] }],
  },
  '07-06-cycles#Track the cells in progress': {
    wrong: [
      { name: 'never takes a cell off the list (no finally)', edit: [['    } finally {\n      visiting.delete(key);\n    }\n', '    }\n']], fails: [0, 2] },
      { name: 'a new list for each cell (the set is not passed on)', edit: [['cellValue(sheet, other, visiting)', 'cellValue(sheet, other)']], fails: [0, 2, 3] },
    ],
  },
  '07-06-cycles#Commit': {
    run: ['git commit -am "Show #CYCLE! instead of crashing on circular references"'],
    wrong: [{ name: 'did not commit', fails: [0] }],
  },

  // ── 7.7 ──────────────────────────────────────────────────────────────────
  '07-07-challenge-negatives#How to think about it': {
    editFiles: {
      'src/expression.ts': [['  | { kind: "cell"; address: Address }\n', '  | { kind: "cell"; address: Address }\n  | { kind: "negate"; operand: Expression }\n']],
      'src/parser.ts': [['    if (token.kind === "open") {', '    if (token.kind === "operator" && token.op === "-") {\n      return { kind: "negate", operand: factor() };\n    }\n    if (token.kind === "open") {']],
      'src/evaluate.ts': [['    case "binary": {', '    case "negate": {\n      const operand = toNumber(evaluate(expression.operand, valueAt));\n      return typeof operand === "number" ? -operand : operand;\n    }\n    case "binary": {']],
    },
    wrong: [
      { name: 'did nothing', fails: [2, 3, 4] },
      { name: 'added the kind to the type only', editFiles: { 'src/expression.ts': [['  | { kind: "cell"; address: Address }\n', '  | { kind: "cell"; address: Address }\n  | { kind: "negate"; operand: Expression }\n']] }, fails: [0, 2, 3, 4] },
      {
        name: 'negation that forgets the minus',
        editFiles: {
          'src/expression.ts': [['  | { kind: "cell"; address: Address }\n', '  | { kind: "cell"; address: Address }\n  | { kind: "negate"; operand: Expression }\n']],
          'src/parser.ts': [['    if (token.kind === "open") {', '    if (token.kind === "operator" && token.op === "-") {\n      return { kind: "negate", operand: factor() };\n    }\n    if (token.kind === "open") {']],
          'src/evaluate.ts': [['    case "binary": {', '    case "negate": {\n      return toNumber(evaluate(expression.operand, valueAt));\n    }\n    case "binary": {']],
        },
        fails: [2, 3],
      },
    ],
  },
  '07-07-challenge-negatives#Merge the sprint and push': {
    run: ['git add src', 'git commit -m "Support negative numbers: =-A1, =2*-3"', 'git switch main', 'git merge formulas', 'git push', 'git branch -d formulas'],
    wrong: [
      { name: 'merged but did not push', run: ['git add src', 'git commit -m "Negatives"', 'git switch main', 'git merge formulas', 'git branch -d formulas'], fails: [3] },
      { name: 'did not merge', run: ['git add src', 'git commit -m "Negatives"'], fails: [0, 1] },
    ],
  },

  '03-06-columns-past-z#Merge the sprint and push': {
    run: ['git commit -am "Name columns past Z: AA, AB, ..."', 'git switch main', 'git merge js-grid', 'git push', 'git branch -d js-grid'],
    wrong: [
      { name: 'merged but did not push', run: ['git commit -am "Columns past Z"', 'git switch main', 'git merge js-grid', 'git branch -d js-grid'], fails: [2] },
      { name: 'did not merge', run: ['git commit -am "Columns past Z"'], fails: [0, 1] },
    ],
  },
};

// ── Files used by sprint 2's wrong answers ─────────────────────────────────
function page({ title = '<title>Spreadsheet</title>', body = '<h1>Spreadsheet</h1>\n    <p>A grid of cells will go here.</p>' } = {}) {
  return `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8">\n    ${title}\n  </head>\n  <body>\n    ${body}\n  </body>\n</html>\n`;
}

function table({ headers = ['', 'A', 'B', 'C', 'D'], rowHeaderTag = 'th', dropLastCellOfRow2 = false, rows = 4, link = '' } = {}) {
  const data = [['Item', 'Price', 'Qty', 'Total'], ['Coffee', '3.50', '2', ''], ['Bagel', '2.25', '3', ''], ['', '', '', '']];
  const head = `<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>`;
  const body = data.slice(0, rows).map((cells, r) => {
    const tds = (r === 1 && dropLastCellOfRow2 ? cells.slice(0, 3) : cells).map((c) => `<td>${c}</td>`).join('');
    return `<tr><${rowHeaderTag}>${r + 1}</${rowHeaderTag}>${tds}</tr>`;
  }).join('\n');
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Spreadsheet</title>\n${link}\n</head>\n<body>\n<h1>Spreadsheet</h1>\n<table>\n<thead>${head}</thead>\n<tbody>\n${body}\n</tbody>\n</table>\n</body>\n</html>\n`;
}
