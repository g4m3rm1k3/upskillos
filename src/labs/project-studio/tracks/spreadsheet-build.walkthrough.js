// What a learner does at each step of "Build a Spreadsheet", for the walkthrough test
// (spreadsheetBuild.desktop.test.js, which hands it to walkSeries.js). Keyed "<track>/<lesson file name>#<step title>".
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

// The same stylesheet after lesson 2.3's Your turn: its colours as tokens.
const TOKEN_CSS = `:root {
  --grid-line: #d0d7de;
  --header-bg: #f3f4f6;
  --header-text: #57606a;
}

` + CSS.replace('#d0d7de', 'var(--grid-line)').replace('#f3f4f6', 'var(--header-bg)').replace('#57606a', 'var(--header-text)');

export const WALKTHROUGH = {
  // ── 0.1 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/00-01-folder-and-terminal#Make a folder from the terminal': {
    run: ['mkdir scratch'],
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'made a file called scratch instead of a folder', run: ['New-Item scratch'], fails: [0] },
      { name: 'made the folder with a different name', run: ['mkdir Scratch2'], fails: [0] },
    ],
  },
  'spreadsheet-build/00-01-folder-and-terminal#Delete the scratch folder': {
    run: ['Remove-Item scratch'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  'spreadsheet-build/00-01-folder-and-terminal#Your playground': {
    run: ['mkdir playground'],
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'named it differently', run: ['mkdir play'], fails: [0] },
    ],
  },
  'spreadsheet-build/00-01-folder-and-terminal#Your turn: find your way with relative paths': {
    run: ['mkdir playground\\terminal\\deep\\deeper'],
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'made the folders at the top of the project', run: ['mkdir terminal\\deep\\deeper'], fails: [0, 1] },
      { name: 'stopped one folder short', run: ['mkdir playground\\terminal\\deep'], fails: [0] },
    ],
  },

  // ── 0.2 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/00-02-programs-and-path#Environment variables': {
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
  'spreadsheet-build/00-02-programs-and-path#Your turn: a script configured from outside': {
    files: { 'playground/shout.py': 'import os\n\ntext = os.environ.get("SHOUT_TEXT", "nothing to shout")\nprint(text.upper())\n' },
    wrong: [
      { name: 'no file', fails: [0, 1, 4] },
      { name: 'no default (KeyError when the variable is missing)', files: { 'playground/shout.py': 'import os\n\nprint(os.environ["SHOUT_TEXT"].upper())\n' }, fails: [1] },
      { name: 'forgets the capitals', files: { 'playground/shout.py': 'import os\n\nprint(os.environ.get("SHOUT_TEXT", "NOTHING TO SHOUT"))\n' }, fails: [4] },
      { name: 'ignores the variable', files: { 'playground/shout.py': 'print("NOTHING TO SHOUT")\n' }, fails: [4] },
      { name: 'in the project folder, not the playground', files: { 'shout.py': 'import os\n\nprint(os.environ.get("SHOUT_TEXT", "nothing to shout").upper())\n' }, fails: [0, 1, 4] },
    ],
  },
  'spreadsheet-build/00-02-programs-and-path#Set a variable, then run the script': {
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
  'spreadsheet-build/00-03-install-node#Your turn: experiment in the REPL': {
    files: { 'playground/node-answers.txt': "1024\n10\n'1,23'\n" },
    wrong: [
      { name: 'no file', fails: [0, 1, 2, 3] },
      { name: "Python's answers", files: { 'playground/node-answers.txt': '1024\nTypeError\n[1, 2, 3]\n' }, fails: [2, 3] },
      { name: 'guessed string joining for "5" * "2"', files: { 'playground/node-answers.txt': "1024\n'52'\n'1,23'\n" }, fails: [2] },
      { name: 'wrote the expressions, not the answers', files: { 'playground/node-answers.txt': '2 ** 10\n"5" * "2"\n[1, 2] + [3]\n' }, fails: [1, 2, 3] },
    ],
  },
  'spreadsheet-build/00-04-running-programs#hello.py': {
    wrong: [
      { name: 'no file', fails: [0] },
      { name: 'different message', files: { 'hello.py': 'print("Hello from Python")\n' }, fails: [0] },
    ],
  },
  'spreadsheet-build/00-04-running-programs#hello.js': {
    wrong: [
      { name: 'no file', fails: [0] },
      { name: 'Python syntax in a .js file', files: { 'hello.js': 'name = "spreadsheet"\nprint("Hello from Node, building a", name)\n' }, fails: [0] },
      { name: 'joins without the space', files: { 'hello.js': 'const name = "spreadsheet";\nconsole.log("Hello from Node, building a" + name);\n' }, fails: [0] },
    ],
  },
  'spreadsheet-build/00-04-running-programs#When a program fails': {
    wrong: [
      { name: 'fixed the bug instead of typing it', files: { 'broken.py': 'print("starting")\nprint(1 / 1)\nprint("never printed")\n' }, fails: [1] },
    ],
  },
  'spreadsheet-build/00-04-running-programs#The same failure in JavaScript': {
    wrong: [
      { name: 'a different error', files: { 'broken.js': 'console.log("starting");\nconsole.log(1 / 0);\nnull.x;\n' }, fails: [1] },
    ],
  },
  'spreadsheet-build/00-04-running-programs#Your turn: choose your own exit code': {
    files: { 'exit-code.js': 'console.log("checking the spreadsheet...");\nprocess.exit(3);\n' },
    wrong: [
      { name: 'no file', fails: [0, 1] },
      { name: 'exits with 0', files: { 'exit-code.js': 'console.log("checking the spreadsheet...");\nprocess.exit(0);\n' }, fails: [1] },
      { name: 'ends by throwing (exit code 1)', files: { 'exit-code.js': 'console.log("checking the spreadsheet...");\nthrow new Error("3");\n' }, fails: [1] },
      { name: 'exits with 3 before printing', files: { 'exit-code.js': 'process.exit(3);\nconsole.log("checking the spreadsheet...");\n' }, fails: [1] },
      { name: 'Python-style exit', files: { 'exit-code.js': 'console.log("checking the spreadsheet...");\nsys.exit(3);\n' }, fails: [1] },
    ],
  },
  'spreadsheet-build/00-04-running-programs#Clean up': {
    run: ['Remove-Item broken.py, broken.js, ticker.js'],
    wrong: [
      { name: 'removed only one file', run: ['Remove-Item broken.py'], fails: [1, 2] },
      { name: 'removed everything, hello.js too', run: ['Remove-Item broken.py, broken.js, ticker.js, hello.js'], fails: [3] },
    ],
  },

  // ── 1.1 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/01-01-install-git#Tell Git who you are': {
    run: ['git config --global user.name "Ada Lovelace"', 'git config --global user.email "ada@example.com"'],
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      { name: 'set only the name', run: ['git config --global user.name "Ada Lovelace"'], fails: [1] },
      { name: 'set them for this folder only (no --global), before it is a repository', run: ['git config user.name "Ada Lovelace"', 'git config user.email "ada@example.com"'], fails: [0, 1] },
    ],
  },
  'spreadsheet-build/01-01-install-git#Name the first branch main': {
    run: ['git config --global init.defaultBranch main'],
    wrong: [
      { name: 'did nothing (Git for Windows would use master)', fails: [0] },
      { name: 'set it to master', run: ['git config --global init.defaultBranch master'], fails: [0] },
    ],
  },

  // ── 1.2 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/01-02-a-repository#git init': {
    run: ['git init'],
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'made a repository in a subfolder instead', run: ['git init inner'], fails: [0] },
    ],
  },

  // ── 1.3 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/01-03-first-commit#Commit': {
    run: ['git add hello.js', 'git commit -m "Add hello.js, a first JavaScript program"'],
    wrong: [
      { name: 'staged but never committed', run: ['git add hello.js'], fails: [0, 1] },
      { name: 'committed everything at once', run: ['git add .', 'git commit -m "Add everything"'], fails: [2] },
    ],
  },

  // ── 1.4 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/01-04-seeing-changes#Change hello.js': {
    wrong: [{ name: 'did not change the file', fails: [0] }],
  },
  'spreadsheet-build/01-04-seeing-changes#Stage it, and see the diff move': {
    run: ['git add hello.js', 'git commit -m "Say how many cells the sheet starts with"'],
    wrong: [
      { name: 'did not commit', fails: [0, 1] },
      { name: 'a message that says nothing', run: ['git add hello.js', 'git commit -m "update"'], fails: [1] },
    ],
  },
  'spreadsheet-build/01-04-seeing-changes#Commit the rest': {
    run: ['git add hello.py greet.py exit-code.js playground', 'git commit -m "Add the sprint 0 examples and the playground"'],
    wrong: [
      { name: 'staged them but did not commit', run: ['git add hello.py greet.py exit-code.js playground'], fails: [0, 1, 2, 3, 4] },
      { name: 'committed only hello.py', run: ['git add hello.py', 'git commit -m "Add hello.py"'], fails: [1, 2, 3, 4] },
      { name: 'committed the sprint 0 files but not the playground', run: ['git add hello.py greet.py exit-code.js', 'git commit -m "Add the sprint 0 examples"'], fails: [3, 4] },
    ],
  },

  // ── 1.5 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/01-05-ignore-and-line-endings#A file with a secret': {
    wrong: [{ name: 'no .env file', fails: [0] }],
  },
  'spreadsheet-build/01-05-ignore-and-line-endings#.gitignore': {
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
  'spreadsheet-build/01-05-ignore-and-line-endings#Line endings, settled': {
    run: ['git add .gitattributes', 'git commit -m "Store and check out text files with LF line endings"'],
    wrong: [
      { name: 'written but not committed', files: { '.gitattributes': '* text=auto eol=lf\n' }, fails: [0, 2] },
      { name: 'without eol=lf', files: { '.gitattributes': '* text=auto\n' }, run: ['git add .gitattributes', 'git commit -m "Line endings"'], fails: [1] },
    ],
  },

  // ── 1.6 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/01-06-undo-uncommitted#Make a mess': {
    wrong: [{ name: 'did not break the file', fails: [0] }],
  },
  'spreadsheet-build/01-06-undo-uncommitted#See the damage, then throw it away': {
    run: ['git restore hello.js'],
    wrong: [
      { name: 'left the mess', fails: [0, 1] },
      { name: 'committed the broken file instead of restoring it', run: ['git commit -am "Broken"'], fails: [0] },
    ],
  },
  'spreadsheet-build/01-06-undo-uncommitted#Unstaging': {
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
  'spreadsheet-build/01-07-branches#Make a branch': {
    run: ['git switch -c say-goodbye'],
    wrong: [{ name: 'created the branch but stayed on main', run: ['git branch say-goodbye'], fails: [0] }],
  },
  'spreadsheet-build/01-07-branches#Commit on the branch': {
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
  'spreadsheet-build/01-07-branches#Switch back and forth': {
    run: ['git switch main', 'git switch say-goodbye'],
  },
  'spreadsheet-build/01-07-branches#Merge the branch into main': {
    run: ['git switch main', 'git merge say-goodbye', 'git branch -d say-goodbye'],
    wrong: [
      { name: 'merged but kept the branch', run: ['git switch main', 'git merge say-goodbye'], fails: [3] },
      { name: 'switched to main without merging', run: ['git switch main'], fails: [1, 3] },
      { name: 'stayed on the branch', fails: [0, 3] },
    ],
  },

  // ── 1.8 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/01-08-github#Connect the remote': {
    run: ['git remote add origin {BARE}'],
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'named the remote github', run: ['git remote add github {BARE}'], fails: [0] },
    ],
  },
  'spreadsheet-build/01-08-github#Push': {
    run: ['git push -u origin main'],
    wrong: [{ name: 'did not push', fails: [0] }],
  },

  // ── 1.1–1.8: Your turn ────────────────────────────────────────────────
  'spreadsheet-build/01-01-install-git#Your turn: a shortcut of your own': {
    run: ['git config --global alias.lg "log --oneline --graph"'],
    wrong: [
      { name: 'no alias', fails: [0, 1, 2] },
      { name: 'only --oneline', run: ['git config --global alias.lg "log --oneline"'], fails: [2] },
      { name: 'a different shortcut name', run: ['git config --global alias.graph "log --oneline --graph"'], fails: [0, 1, 2] },
    ],
  },
  'spreadsheet-build/01-02-a-repository#Your turn: a README for your playground': {
    files: { 'playground/README.md': '# Playground\n\nExperiments: small files I change, run and break to see how things work, apart from the real project.\n' },
    wrong: [
      { name: 'no README', fails: [0, 1] },
      { name: 'no heading', files: { 'playground/README.md': 'My experiments.\n' }, fails: [1] },
      { name: 'a heading without the space', files: { 'playground/README.md': '#Playground\n' }, fails: [1] },
      { name: 'README at the top of the project instead', files: { 'README.md': '# Playground\n' }, fails: [0, 1] },
    ],
  },
  'spreadsheet-build/01-03-first-commit#Your turn: commit one file on its own': {
    run: ['git add playground/README.md', 'git commit -m "Add a README that explains the playground"'],
    wrong: [
      { name: 'staged it but did not commit', run: ['git add playground/README.md'], fails: [0] },
      { name: 'committed the whole playground', run: ['git add playground', 'git commit -m "Add the playground"'], fails: [1] },
      { name: 'committed everything', run: ['git add .', 'git commit -m "Add everything"'], fails: [1, 2] },
    ],
  },
  'spreadsheet-build/01-04-seeing-changes#Your turn: a change, read before it\'s committed': {
    files: { 'playground/shout.py': 'import os\n\ntext = os.environ.get("SHOUT_TEXT", "nothing to shout")\nprint(text.upper() + "!")\n' },
    run: ['git commit -am "End every shout with an exclamation mark"'],
    wrong: [
      { name: 'changed it but did not commit', files: { 'playground/shout.py': 'import os\n\ntext = os.environ.get("SHOUT_TEXT", "nothing to shout")\nprint(text.upper() + "!")\n' }, fails: [3] },
      { name: 'the mark inside the capitals call', files: { 'playground/shout.py': 'import os\n\ntext = os.environ.get("SHOUT_TEXT", "nothing to shout")\nprint(text + "!".upper())\n' }, run: ['git commit -am "Exclaim"'], fails: [0] },
      { name: 'committed without changing anything', run: ['git commit --allow-empty -m "Exclaim"'], fails: [0] },
    ],
  },
  'spreadsheet-build/01-05-ignore-and-line-endings#Your turn: ignore a whole kind of file': {
    files: { '.gitignore': '.env\n*.log\n', 'playground/debug.log': 'started\n' },
    run: ['git commit -am "Never commit log files"'],
    wrong: [
      { name: 'did nothing', files: { 'playground/debug.log': 'started\n' }, fails: [0, 1, 3] },
      { name: 'ignored only that one file', files: { '.gitignore': '.env\nplayground/debug.log\n', 'playground/debug.log': 'started\n' }, run: ['git commit -am "Ignore the log"'], fails: [1] },
      { name: 'replaced .env with *.log', files: { '.gitignore': '*.log\n', 'playground/debug.log': 'started\n' }, run: ['git commit -am "Ignore logs"'], fails: [2] },
      { name: 'did not commit .gitignore', files: { '.gitignore': '.env\n*.log\n', 'playground/debug.log': 'started\n' }, fails: [3] },
    ],
  },
  'spreadsheet-build/01-06-undo-uncommitted#Your turn: break it, then get it back': {
    files: { 'playground/shout.py': 'import os\n\nprint(txet.upper() + "!")\n' },
    run: ['git restore playground/shout.py'],
    wrong: [
      { name: 'left it broken', files: { 'playground/shout.py': 'import os\n\nprint(txet.upper() + "!")\n' }, fails: [0, 3] },
      { name: 'unstaged it, but kept the broken file', files: { 'playground/shout.py': 'import os\n\nprint(txet.upper() + "!")\n' }, run: ['git add playground/shout.py', 'git restore --staged playground/shout.py'], fails: [0, 3] },
    ],
  },
  'spreadsheet-build/01-07-branches#Your turn: a branch of your own': {
    before: ['git switch -c louder'],
    files: { 'playground/shout.py': 'import os\n\ntext = os.environ.get("SHOUT_TEXT", "nothing to shout")\nprint(text.upper() + "!!!")\n' },
    run: ['git commit -am "Shout louder"', 'git switch main', 'git merge louder', 'git branch -d louder'],
    wrong: [
      { name: 'did nothing', fails: [1] },
      { name: 'committed on the branch but never merged', before: ['git switch -c louder'], files: { 'playground/shout.py': 'import os\n\ntext = os.environ.get("SHOUT_TEXT", "nothing to shout")\nprint(text.upper() + "!!!")\n' }, run: ['git commit -am "Shout louder"', 'git switch main'], fails: [1, 4] },
      { name: 'merged but kept the branch', before: ['git switch -c louder'], files: { 'playground/shout.py': 'import os\n\ntext = os.environ.get("SHOUT_TEXT", "nothing to shout")\nprint(text.upper() + "!!!")\n' }, run: ['git commit -am "Shout louder"', 'git switch main', 'git merge louder'], fails: [4] },
      { name: 'stayed on the branch', before: ['git switch -c louder'], files: { 'playground/shout.py': 'import os\n\ntext = os.environ.get("SHOUT_TEXT", "nothing to shout")\nprint(text.upper() + "!!!")\n' }, run: ['git commit -am "Shout louder"'], fails: [0] },
    ],
  },
  'spreadsheet-build/01-08-github#Your turn: the everyday rhythm': {
    editFiles: { 'playground/README.md': [['apart from the real project.\n', 'apart from the real project.\n\nSo far: environment variables, the Node REPL, and Git.\n']] },
    run: ['git commit -am "Say what the playground has been used for"', 'git push'],
    wrong: [
      { name: 'committed but did not push', editFiles: { 'playground/README.md': [['apart from the real project.\n', 'apart from the real project.\n\nSo far: Git.\n']] }, run: ['git commit -am "Update the README"'], fails: [1] },
      { name: 'edited but did not commit', editFiles: { 'playground/README.md': [['apart from the real project.\n', 'apart from the real project.\n\nSo far: Git.\n']] }, fails: [0, 2] },
    ],
  },

  // ── 1.9 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/01-09-merge-conflicts#A line to disagree about': {
    run: ['git add playground/motto.txt', 'git commit -m "Add a motto to the playground"'],
    wrong: [
      { name: 'not committed', files: { 'playground/motto.txt': 'Build it, then break it.\n' }, fails: [1, 2] },
      { name: 'committed on another branch', before: ['git switch -c motto'], files: { 'playground/motto.txt': 'Build it, then break it.\n' }, run: ['git add playground/motto.txt', 'git commit -m "Motto"'], fails: [0] },
    ],
  },
  'spreadsheet-build/01-09-merge-conflicts#One branch changes it': {
    before: ['git switch -c careful'],
    run: ['git commit -am "Test before breaking"'],
    wrong: [
      { name: 'changed it on main', files: { 'playground/motto.txt': 'Build it, then test it.\n' }, run: ['git commit -am "Test"'], fails: [0] },
      { name: 'made the branch but did not commit', before: ['git switch -c careful'], files: { 'playground/motto.txt': 'Build it, then test it.\n' }, fails: [2] },
    ],
  },
  'spreadsheet-build/01-09-merge-conflicts#Main changes it too': {
    before: ['git switch main'],
    run: ['git commit -am "Ship it"'],
    wrong: [
      { name: 'stayed on careful', files: { 'playground/motto.txt': 'Build it, then ship it.\n' }, run: ['git commit -am "Ship it"'], fails: [0] },
      { name: 'switched but did not change the line', run: ['git switch main'], fails: [1] },
      { name: 'changed it on main without committing', before: ['git switch main'], files: { 'playground/motto.txt': 'Build it, then ship it.\n' }, fails: [2] },
    ],
  },
  'spreadsheet-build/01-09-merge-conflicts#The merge stops': {
    // The merge stops with a conflict, so git exits with 1; the lesson expects that.
    run: ['git merge careful; exit 0'],
    wrong: [{ name: 'did not merge', fails: [0] }],
  },
  'spreadsheet-build/01-09-merge-conflicts#Resolve it': {
    run: ['git add playground/motto.txt', 'git commit --no-edit', 'git branch -d careful'],
    wrong: [
      { name: 'committed with the markers still in', run: ['git add playground/motto.txt', 'git commit --no-edit', 'git branch -d careful'], fails: [0, 1] },
      { name: 'resolved the file but did not commit', typeFile: true, run: ['git add playground/motto.txt'], fails: [2, 3, 4] },
      { name: 'aborted the merge instead', run: ['git merge --abort'], fails: [1, 3, 4] },
    ],
  },
  'spreadsheet-build/01-09-merge-conflicts#Your turn: a conflict of your own': {
    run: [
      'git switch -c shorter',
      "Set-Content playground/motto.txt 'Build, test, ship.'",
      'git commit -am "Shorter motto"',
      'git switch main',
      "Set-Content playground/motto.txt 'Build it, test it, then ship it often.'",
      'git commit -am "Ship often"',
      'git merge shorter; exit 0',
      "Set-Content playground/motto.txt 'Build, test, ship often.'",
      'git add playground/motto.txt',
      'git commit --no-edit',
      'git branch -d shorter',
      'git push',
    ],
    wrong: [
      {
        name: 'stopped at the conflict',
        run: ['git switch -c shorter', "Set-Content playground/motto.txt 'Build, test, ship.'", 'git commit -am "Shorter"', 'git switch main', "Set-Content playground/motto.txt 'Ship often.'", 'git commit -am "Often"', 'git merge shorter; exit 0'],
        fails: [0, 1, 2],
      },
      {
        name: 'committed the markers',
        run: ['git switch -c shorter', "Set-Content playground/motto.txt 'Build, test, ship.'", 'git commit -am "Shorter"', 'git switch main', "Set-Content playground/motto.txt 'Ship often.'", 'git commit -am "Often"', 'git merge shorter; exit 0', 'git add playground/motto.txt', 'git commit --no-edit'],
        fails: [1, 3],
      },
      {
        name: 'resolved but did not push',
        run: ['git switch -c shorter', "Set-Content playground/motto.txt 'Build, test, ship.'", 'git commit -am "Shorter"', 'git switch main', "Set-Content playground/motto.txt 'Ship often.'", 'git commit -am "Often"', 'git merge shorter; exit 0', "Set-Content playground/motto.txt 'Ship, often.'", 'git add playground/motto.txt', 'git commit --no-edit'],
        fails: [3],
      },
      {
        name: 'no conflict: main never moved, so it fast-forwarded',
        run: ['git switch -c shorter', "Set-Content playground/motto.txt 'Build, test, ship.'", 'git commit -am "Shorter"', 'git switch main', 'git merge shorter'],
        fails: [0, 3],
      },
    ],
  },

  // ── 2.1 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/02-01-a-page#Start a branch for the sprint': {
    run: ['git switch -c grid-page'],
    wrong: [{ name: 'stayed on main', fails: [0] }],
  },
  'spreadsheet-build/02-01-a-page#The smallest real page': {
    wrong: [
      { name: 'no file', fails: [0, 1, 2] },
      { name: 'no <title>', files: { 'index.html': page({ title: '' }) }, fails: [1] },
      { name: 'title spelled differently', files: { 'index.html': page({ title: '<title>spreadsheet</title>' }) }, fails: [1] },
      { name: 'an h2 instead of an h1', files: { 'index.html': page({ body: '<h2>Spreadsheet</h2>' }) }, fails: [2] },
    ],
  },
  'spreadsheet-build/02-01-a-page#Commit': {
    run: ['git add index.html', 'git commit -m "Add a page for the spreadsheet"'],
    wrong: [{ name: 'did not commit', fails: [0] }],
  },

  // ── 2.2 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/02-01-a-page#Your turn: a page from memory': {
    files: { 'playground/hello.html': '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8">\n    <title>Hello</title>\n  </head>\n  <body>\n    <h1>Hello</h1>\n    <p>A page written from memory.</p>\n  </body>\n</html>\n' },
    run: ['git add playground/hello.html', 'git commit -m "Write a page from memory"'],
    wrong: [
      { name: 'no file', fails: [0, 1, 2, 3, 4] },
      { name: 'no doctype (quirks mode)', files: { 'playground/hello.html': '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8">\n    <title>Hello</title>\n  </head>\n  <body>\n    <h1>Hello</h1>\n    <p>A page written from memory.</p>\n  </body>\n</html>\n'.replace('<!DOCTYPE html>\n', '') }, fails: [3] },
      { name: 'no language', files: { 'playground/hello.html': '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8">\n    <title>Hello</title>\n  </head>\n  <body>\n    <h1>Hello</h1>\n    <p>A page written from memory.</p>\n  </body>\n</html>\n'.replace(' lang="en"', '') }, fails: [1] },
      { name: 'no character encoding', files: { 'playground/hello.html': '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8">\n    <title>Hello</title>\n  </head>\n  <body>\n    <h1>Hello</h1>\n    <p>A page written from memory.</p>\n  </body>\n</html>\n'.replace('    <meta charset="utf-8">\n', '') }, fails: [2] },
      { name: 'a heading but no paragraph', files: { 'playground/hello.html': '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8">\n    <title>Hello</title>\n  </head>\n  <body>\n    <h1>Hello</h1>\n    <p>A page written from memory.</p>\n  </body>\n</html>\n'.replace('    <p>A page written from memory.</p>\n', '') }, fails: [4] },
      { name: 'written but not committed', files: { 'playground/hello.html': '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8">\n    <title>Hello</title>\n  </head>\n  <body>\n    <h1>Hello</h1>\n    <p>A page written from memory.</p>\n  </body>\n</html>\n' }, fails: [5] },
    ],
  },

  // ── Styling 1 ────────────────────────────────────────────────────────────
  "spreadsheet-build/02-01a-pages-with-meaning#A new page": {
    wrong: [
      { name: 'no viewport line', typeFile: true, edit: [['    <meta name="viewport" content="width=device-width, initial-scale=1">\n', '']], fails: [0] },
    ],
  },
  "spreadsheet-build/02-01a-pages-with-meaning#Landmarks": {
    wrong: [
      { name: 'a div instead of header', typeFile: true, edit: [['<header>', '<div class="header">'], ['</header>', '</div>']], fails: [0] },
      { name: 'no main', typeFile: true, edit: [['    <main>\n    </main>\n', '']], fails: [0] },
    ],
  },
  "spreadsheet-build/02-01a-pages-with-meaning#A nav that's a list": {
    wrong: [
      { name: 'a link outside the list', typeFile: true, edit: [['<li><a href="#about">About</a></li>', '<a href="#about">About</a>']], fails: [0] },
      { name: 'no nav yet', fails: [0] },
    ],
  },
  "spreadsheet-build/02-01a-pages-with-meaning#The opening section": {
    wrong: [
      { name: 'the title as a paragraph', typeFile: true, edit: [['<h1>I build software people enjoy using.</h1>', '<p>I build software people enjoy using.</p>']], fails: [0, 1] },
      { name: 'the h1 outside the section', typeFile: true, edit: [['      <section id="intro">\n        <h1>I build software people enjoy using.</h1>\n', '      <h1>I build software people enjoy using.</h1>\n      <section id="intro">\n']], fails: [1] },
    ],
  },
  "spreadsheet-build/02-01a-pages-with-meaning#Projects as articles": {
    wrong: [
      { name: 'the project as a div', typeFile: true, edit: [['<article class="card">', '<div class="card">'], ['</article>', '</div>']], fails: [0] },
    ],
  },
  "spreadsheet-build/02-01a-pages-with-meaning#Two more projects": {
    wrong: [
      { name: 'only one project', fails: [0] },
      { name: 'a card without its heading', typeFile: true, edit: [['            <h3>This site</h3>\n', '']], fails: [1] },
    ],
  },
  "spreadsheet-build/02-01a-pages-with-meaning#About": {
    wrong: [
      { name: 'no about section', fails: [0, 1] },
      { name: 'About as an h1, chosen for its size', typeFile: true, edit: [['<h2>About</h2>', '<h1>About</h1>']], fails: [0] },
    ],
  },
  'spreadsheet-build/02-01a-pages-with-meaning#Commit': {
    run: ['git add playground/site', 'git commit -m "Add the portfolio page\'s HTML to the playground"'],
    wrong: [{ name: 'not committed', fails: [0, 1] }],
  },
  'spreadsheet-build/02-01a-pages-with-meaning#Your turn: a contact section': {
    editFiles: { 'playground/site/index.html': [['    </main>', '      <section id="contact">\n        <h2>Contact</h2>\n        <ul>\n          <li><a href="mailto:sam@example.com">sam@example.com</a></li>\n          <li><a href="https://github.com/sam-rivera">GitHub</a></li>\n        </ul>\n      </section>\n    </main>']] },
    run: ['git commit -am "Add a contact section"'],
    wrong: [
      { name: 'no id on the section', editFiles: { 'playground/site/index.html': [['    </main>', '      <section id="contact">\n        <h2>Contact</h2>\n        <ul>\n          <li><a href="mailto:sam@example.com">sam@example.com</a></li>\n          <li><a href="https://github.com/sam-rivera">GitHub</a></li>\n        </ul>\n      </section>\n    </main>'.replace(' id="contact"', '')]] }, run: ['git commit -am "Contact"'], fails: [0] },
      { name: 'an h3 heading', editFiles: { 'playground/site/index.html': [['    </main>', '      <section id="contact">\n        <h2>Contact</h2>\n        <ul>\n          <li><a href="mailto:sam@example.com">sam@example.com</a></li>\n          <li><a href="https://github.com/sam-rivera">GitHub</a></li>\n        </ul>\n      </section>\n    </main>'.replace('<h2>Contact</h2>', '<h3>Contact</h3>')]] }, run: ['git commit -am "Contact"'], fails: [0] },
      { name: 'links not in a list', editFiles: { 'playground/site/index.html': [['    </main>', '      <section id="contact">\n        <h2>Contact</h2>\n        <a href="mailto:sam@example.com">Email</a>\n        <a href="https://github.com/sam-rivera">GitHub</a>\n      </section>\n    </main>']] }, run: ['git commit -am "Contact"'], fails: [1] },
      { name: 'no email link', editFiles: { 'playground/site/index.html': [['    </main>', '      <section id="contact">\n        <h2>Contact</h2>\n        <ul>\n          <li><a href="mailto:sam@example.com">sam@example.com</a></li>\n          <li><a href="https://github.com/sam-rivera">GitHub</a></li>\n        </ul>\n      </section>\n    </main>'.replace('mailto:sam@example.com', 'https://example.com/sam')]] }, run: ['git commit -am "Contact"'], fails: [2] },
      { name: 'a second h1 for Contact', editFiles: { 'playground/site/index.html': [['    </main>', '      <section id="contact">\n        <h2>Contact</h2>\n        <ul>\n          <li><a href="mailto:sam@example.com">sam@example.com</a></li>\n          <li><a href="https://github.com/sam-rivera">GitHub</a></li>\n        </ul>\n      </section>\n    </main>'.replace('<h2>Contact</h2>', '<h1>Contact</h1>')]] }, run: ['git commit -am "Contact"'], fails: [0, 3] },
      { name: 'not committed', editFiles: { 'playground/site/index.html': [['    </main>', '      <section id="contact">\n        <h2>Contact</h2>\n        <ul>\n          <li><a href="mailto:sam@example.com">sam@example.com</a></li>\n          <li><a href="https://github.com/sam-rivera">GitHub</a></li>\n        </ul>\n      </section>\n    </main>']] }, fails: [4] },
    ],
  },
  // ── Styling 2 ────────────────────────────────────────────────────────────
  'spreadsheet-build/02-01b-which-rule-wins#A stylesheet for the portfolio': {
    editFiles: { 'playground/site/index.html': [['</title>\n', '</title>\n    <link rel="stylesheet" href="style.css">\n']] },
    wrong: [
      { name: 'wrote style.css but never linked it', files: { 'playground/site/style.css': 'body {\n  font-family: system-ui, sans-serif;\n  color: #1f2933;\n}\n' }, fails: [0, 1, 2] },
      {
        name: 'saved style.css in the playground folder, not next to the page',
        editFiles: { 'playground/site/index.html': [['</title>\n', '</title>\n    <link rel="stylesheet" href="style.css">\n']] },
        files: { 'playground/style.css': 'body {\n  font-family: system-ui, sans-serif;\n  color: #1f2933;\n}\n' },
        fails: [1, 2],
      },
    ],
  },
  'spreadsheet-build/02-01b-which-rule-wins#Inherited, or not': {
    wrong: [
      { name: 'no rule for links', fails: [1] },
      { name: 'coloured the paragraphs instead of the links', files: { 'playground/site/style.css': 'body {\n  font-family: system-ui, sans-serif;\n  color: #1f2933;\n}\n\np {\n  color: #2563eb;\n}\n' }, fails: [0, 1] },
    ],
  },
  'spreadsheet-build/02-01b-which-rule-wins#An experiment: four rules, three paragraphs': {
    wrong: [
      { name: 'no lab page', fails: [0] },
      { name: 'left out the last p rule', typeFile: true, edit: [['      p { color: red; }\n', '']], fails: [0] },
    ],
  },
  "spreadsheet-build/02-01b-which-rule-wins#The nav's links": {
    wrong: [
      { name: 'no color: inherit', files: { 'playground/site/style.css': 'body {\n  font-family: system-ui, sans-serif;\n  color: #1f2933;\n}\n\na {\n  color: #2563eb;\n}\n\nnav a {\n  text-decoration: none;\n  font-weight: 600;\n}\n' }, fails: [0] },
      { name: 'a comma, nav, a: every link loses its colour', files: { 'playground/site/style.css': 'body {\n  font-family: system-ui, sans-serif;\n  color: #1f2933;\n}\n\na {\n  color: #2563eb;\n}\n\nnav,\na {\n  color: inherit;\n  text-decoration: none;\n  font-weight: 600;\n}\n' }, fails: [2] },
      { name: 'the underline left on', files: { 'playground/site/style.css': 'body {\n  font-family: system-ui, sans-serif;\n  color: #1f2933;\n}\n\na {\n  color: #2563eb;\n}\n\nnav a {\n  color: inherit;\n  font-weight: 600;\n}\n' }, fails: [1] },
    ],
  },
  'spreadsheet-build/02-01b-which-rule-wins#Commit': {
    run: ['git add playground', 'git commit -m "Style the portfolio\'s text and links; a lab for the cascade"'],
    wrong: [{ name: 'not committed', fails: [0, 1, 2] }],
  },
  'spreadsheet-build/02-01b-which-rule-wins#Your turn: make Second blue': {
    editFiles: { 'playground/css/which-wins.html': [['    </style>', '      p.note { color: blue; }\n    </style>']] },
    run: ['git commit -am "Make Second blue"'],
    wrong: [
      { name: 'p { color: blue }: loses to .note, and turns Third blue', editFiles: { 'playground/css/which-wins.html': [['    </style>', '      p { color: blue; }\n    </style>']] }, run: ['git commit -am "Blue"'], fails: [0, 2] },
      { name: '!important, which turns First blue too', editFiles: { 'playground/css/which-wins.html': [['    </style>', '      .note { color: blue !important; }\n    </style>']] }, run: ['git commit -am "Blue"'], fails: [1, 3] },
      { name: 'a style attribute', editFiles: { 'playground/css/which-wins.html': [['<p class="note">Second</p>', '<p class="note" style="color: blue">Second</p>']] }, run: ['git commit -am "Blue"'], fails: [3] },
      { name: 'a new id', editFiles: { 'playground/css/which-wins.html': [['<p class="note">Second</p>', '<p id="second" class="note">Second</p>'], ['    </style>', '      #second { color: blue; }\n    </style>']] }, run: ['git commit -am "Blue"'], fails: [3] },
      { name: 'not committed', editFiles: { 'playground/css/which-wins.html': [['    </style>', '      p.note { color: blue; }\n    </style>']] }, fails: [4] },
    ],
  },
  // ── Styling 3 ────────────────────────────────────────────────────────────
  'spreadsheet-build/02-01c-boxes-and-space#Four boxes inside each other': {
    wrong: [
      { name: 'no card rule', fails: [0] },
      { name: 'less padding than shown', typeFile: true, edit: [['  padding: 20px;', '  padding: 10px;']], fails: [0] },
    ],
  },
  'spreadsheet-build/02-01c-boxes-and-space#box-sizing: border-box': {
    wrong: [
      { name: 'no border-box rule', fails: [0, 1] },
      { name: 'border-box on the cards only', typeFile: true, edit: [['*,\n*::before,\n*::after {', '.card {']], fails: [1] },
    ],
  },
  'spreadsheet-build/02-01c-boxes-and-space#A spacing scale': {
    wrong: [
      { name: 'kept the 20px padding', typeFile: true, edit: [['  padding: var(--space-4);', '  padding: 20px;']], fails: [0] },
      { name: 'kept the browser margin round the page', typeFile: true, edit: [['  margin: 0;\n  font-family', '  font-family']], fails: [2] },
      { name: 'tokens on body, not :root', typeFile: true, edit: [[':root {', 'body {']], fails: [3] },
    ],
  },
  'spreadsheet-build/02-01c-boxes-and-space#A readable column': {
    wrong: [
      { name: 'no max-width', typeFile: true, edit: [['  max-width: 60rem;\n', '']], fails: [0] },
      { name: 'margin 0, not auto: stuck to the left', typeFile: true, edit: [['  margin: 0 auto;', '  margin: 0;']], fails: [1] },
      { name: 'width instead of max-width', typeFile: true, edit: [['  max-width: 60rem;', '  width: 60rem;']], fails: [2] },
    ],
  },
  'spreadsheet-build/02-01c-boxes-and-space#Commit': {
    run: ['git commit -am "Give the portfolio a box model, a spacing scale and a column"'],
    wrong: [{ name: 'not committed', fails: [0] }],
  },
  'spreadsheet-build/02-01c-boxes-and-space#Your turn: room to breathe': {
    editFiles: { 'playground/site/style.css': [['  margin-bottom: var(--space-3);\n}\n', '  margin-bottom: var(--space-3);\n}\n\nheader {\n  padding: var(--space-3);\n}\n\nmain section {\n  padding: var(--space-5) 0;\n}\n']] },
    run: ['git commit -am "Give the sections room"'],
    wrong: [
      { name: 'margin instead of padding on the sections', editFiles: { 'playground/site/style.css': [['  margin-bottom: var(--space-3);\n}\n', '  margin-bottom: var(--space-3);\n}\n\nheader {\n  padding: var(--space-3);\n}\n\nmain section {\n  margin: var(--space-5) 0;\n}\n']] }, run: ['git commit -am "Room"'], fails: [0] },
      { name: 'space on all four sides of the sections', editFiles: { 'playground/site/style.css': [['  margin-bottom: var(--space-3);\n}\n', '  margin-bottom: var(--space-3);\n}\n\nheader {\n  padding: var(--space-3);\n}\n\nmain section {\n  padding: var(--space-5);\n}\n']] }, run: ['git commit -am "Room"'], fails: [1] },
      { name: 'header padded at the sides only', editFiles: { 'playground/site/style.css': [['  margin-bottom: var(--space-3);\n}\n', '  margin-bottom: var(--space-3);\n}\n\nheader {\n  padding: 0 var(--space-3);\n}\n\nmain section {\n  padding: var(--space-5) 0;\n}\n']] }, run: ['git commit -am "Room"'], fails: [2] },
      { name: 'a raw 48px instead of the scale', editFiles: { 'playground/site/style.css': [['  margin-bottom: var(--space-3);\n}\n', '  margin-bottom: var(--space-3);\n}\n\nheader {\n  padding: var(--space-3);\n}\n\nmain section {\n  padding: 48px 0;\n}\n']] }, run: ['git commit -am "Room"'], fails: [3] },
      { name: 'not committed', editFiles: { 'playground/site/style.css': [['  margin-bottom: var(--space-3);\n}\n', '  margin-bottom: var(--space-3);\n}\n\nheader {\n  padding: var(--space-3);\n}\n\nmain section {\n  padding: var(--space-5) 0;\n}\n']] }, fails: [4] },
    ],
  },
  // ── Styling 4 ────────────────────────────────────────────────────────────
  "spreadsheet-build/02-01d-type-and-colour#Text that's comfortable to read": {
    wrong: [
      { name: 'no line height', typeFile: true, edit: [['  font-size: 1rem;\n  line-height: 1.6;\n', '  font-size: 1rem;\n']], fails: [0] },
      { name: 'the browser\'s heading margins kept', typeFile: true, edit: [['  margin: 0 0 var(--space-3);\n  line-height: 1.2;', '  line-height: 1.2;']], fails: [1] },
    ],
  },
  "spreadsheet-build/02-01d-type-and-colour#A type scale": {
    wrong: [
      { name: 'the h1 the same size as an h2', typeFile: true, edit: [['h1 {\n  font-size: 2.5rem;', 'h1 {\n  font-size: 1.75rem;']], fails: [0] },
      { name: 'h2 off the scale', typeFile: true, edit: [['h2 {\n  font-size: 1.75rem;', 'h2 {\n  font-size: 2rem;']], fails: [1] },
      { name: 'the h1 in px', typeFile: true, edit: [['h1 {\n  font-size: 2.5rem;', 'h1 {\n  font-size: 40px;']], fails: [2] },
    ],
  },
  "spreadsheet-build/02-01d-type-and-colour#Line length": {
    wrong: [
      { name: 'no paragraph rule', fails: [0, 1] },
      { name: 'the browser\'s paragraph margin kept', typeFile: true, edit: [['p {\n  margin: 0 0 var(--space-3);\n', 'p {\n']], fails: [1] },
    ],
  },
  "spreadsheet-build/02-01d-type-and-colour#A palette, as tokens": {
    wrong: [
      { name: 'the accent token never defined', typeFile: true, edit: [['  --color-accent: #2563eb;\n', '']], fails: [0, 1] },
      { name: 'no background on the body', typeFile: true, edit: [['  background: var(--color-bg);\n', '  background: var(--color-surface);\n']], fails: [2] },
    ],
  },
  "spreadsheet-build/02-01d-type-and-colour#Surfaces and a footer": {
    wrong: [
      { name: 'cards without the surface colour', typeFile: true, edit: [['  margin-bottom: var(--space-3);\n  background: var(--color-surface);\n', '  margin-bottom: var(--space-3);\n']], fails: [0] },
      { name: 'the footer not muted', typeFile: true, edit: [['  color: var(--color-muted);\n  text-align: center;', '  text-align: center;']], fails: [1] },
      { name: 'the footer not centred', typeFile: true, edit: [['  color: var(--color-muted);\n  text-align: center;', '  color: var(--color-muted);']], fails: [2] },
    ],
  },
  "spreadsheet-build/02-01d-type-and-colour#Links that look like buttons": {
    wrong: [
      { name: 'white text forgotten', typeFile: true, edit: [['  background: var(--color-accent);\n  color: var(--color-on-accent);\n', '  background: var(--color-accent);\n']], fails: [1] },
      { name: 'no fill', typeFile: true, edit: [['  border-radius: 0.5rem;\n  background: var(--color-accent);\n', '  border-radius: 0.5rem;\n']], fails: [0] },
      { name: 'still inline, so the padding does not push', typeFile: true, edit: [['  display: inline-block;\n', '']], fails: [2] },
    ],
  },
  "spreadsheet-build/02-01d-type-and-colour#States and variants": {
    wrong: [
      { name: '.button .secondary, with a space', typeFile: true, edit: [['.button.secondary {', '.button .secondary {']], fails: [0, 1] },
      { name: 'the secondary text left white', typeFile: true, edit: [['  background: transparent;\n  color: var(--color-accent);\n', '  background: transparent;\n']], fails: [1] },
    ],
  },
  "spreadsheet-build/02-01d-type-and-colour#Keyboard focus": {
    wrong: [
      { name: 'no focus rule', fails: [0] },
      { name: 'the focus outline removed', typeFile: true, edit: [[':focus-visible {\n  outline: 3px solid var(--color-accent);', ':focus-visible {\n  outline: none;']], fails: [0] },
    ],
  },
  'spreadsheet-build/02-01d-type-and-colour#Commit': {
    run: ['git commit -am "Give the portfolio a type scale, a palette and buttons"'],
    wrong: [{ name: 'not committed', fails: [0] }],
  },
  'spreadsheet-build/02-01d-type-and-colour#Your turn: a dark theme': {
    editFiles: { 'playground/site/style.css': [[':focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n', ':focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n    --color-text: #e4e7eb;\n    --color-muted: #9aa5b1;\n    --color-bg: #111827;\n    --color-surface: #1f2937;\n    --color-border: #374151;\n    --color-accent: #60a5fa;\n    --color-accent-strong: #93c5fd;\n    --color-on-accent: #111827;\n  }\n}\n']] },
    run: ['git commit -am "Add a dark theme"'],
    wrong: [
      { name: 'the light theme\'s text colour kept', editFiles: { 'playground/site/style.css': [[':focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n', ':focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n    --color-text: #1f2933;\n    --color-muted: #9aa5b1;\n    --color-bg: #111827;\n    --color-surface: #1f2937;\n    --color-border: #374151;\n    --color-accent: #60a5fa;\n    --color-accent-strong: #93c5fd;\n    --color-on-accent: #111827;\n  }\n}\n']] }, run: ['git commit -am "Dark"'], fails: [2] },
      { name: 'muted text too dim', editFiles: { 'playground/site/style.css': [[':focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n', ':focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n    --color-text: #e4e7eb;\n    --color-muted: #52606d;\n    --color-bg: #111827;\n    --color-surface: #1f2937;\n    --color-border: #374151;\n    --color-accent: #60a5fa;\n    --color-accent-strong: #93c5fd;\n    --color-on-accent: #111827;\n  }\n}\n']] }, run: ['git commit -am "Dark"'], fails: [2] },
      { name: 'the light accent kept on black', editFiles: { 'playground/site/style.css': [[':focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n', ':focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n    --color-text: #e4e7eb;\n    --color-muted: #9aa5b1;\n    --color-bg: #000000;\n    --color-surface: #1f2937;\n    --color-border: #374151;\n    --color-accent: #2563eb;\n    --color-accent-strong: #93c5fd;\n    --color-on-accent: #ffffff;\n  }\n}\n']] }, run: ['git commit -am "Dark"'], fails: [3] },
      { name: 'white button text on a light accent', editFiles: { 'playground/site/style.css': [[':focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n', ':focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n    --color-text: #e4e7eb;\n    --color-muted: #9aa5b1;\n    --color-bg: #111827;\n    --color-surface: #1f2937;\n    --color-border: #374151;\n    --color-accent: #60a5fa;\n    --color-accent-strong: #93c5fd;\n    --color-on-accent: #ffffff;\n  }\n}\n']] }, run: ['git commit -am "Dark"'], fails: [3] },
      { name: 'tokens set on body, not :root', editFiles: { 'playground/site/style.css': [[':focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n', ':focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n\n@media (prefers-color-scheme: dark) {\n  body {\n    --color-text: #e4e7eb;\n    --color-muted: #9aa5b1;\n    --color-bg: #111827;\n    --color-surface: #1f2937;\n    --color-border: #374151;\n    --color-accent: #60a5fa;\n    --color-accent-strong: #93c5fd;\n    --color-on-accent: #111827;\n  }\n}\n']] }, run: ['git commit -am "Dark"'], fails: [0, 1, 2, 3] },
      { name: 'a light media query by mistake', editFiles: { 'playground/site/style.css': [[':focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n', ':focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n\n@media (prefers-color-scheme: light) {\n  :root {\n    --color-text: #e4e7eb;\n    --color-muted: #9aa5b1;\n    --color-bg: #111827;\n    --color-surface: #1f2937;\n    --color-border: #374151;\n    --color-accent: #60a5fa;\n    --color-accent-strong: #93c5fd;\n    --color-on-accent: #111827;\n  }\n}\n']] }, run: ['git commit -am "Dark"'], fails: [0] },
      { name: 'not committed', editFiles: { 'playground/site/style.css': [[':focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n', ':focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n    --color-text: #e4e7eb;\n    --color-muted: #9aa5b1;\n    --color-bg: #111827;\n    --color-surface: #1f2937;\n    --color-border: #374151;\n    --color-accent: #60a5fa;\n    --color-accent-strong: #93c5fd;\n    --color-on-accent: #111827;\n  }\n}\n']] }, fails: [4] },
    ],
  },
  // ── Styling 5 ────────────────────────────────────────────────────────────
  'spreadsheet-build/02-01e-layout-flexbox#The header in a row': {
    wrong: [
      { name: 'the header not a flex container', typeFile: true, edit: [['header {\n  display: flex;\n  justify-content: space-between;', 'header {\n  justify-content: space-between;']], fails: [0, 1] },
      { name: 'no justify-content: everything at the start', typeFile: true, edit: [['header {\n  display: flex;\n  justify-content: space-between;', 'header {\n  display: flex;']], fails: [1] },
    ],
  },
  "spreadsheet-build/02-01e-layout-flexbox#The nav's links in a row": {
    wrong: [
      { name: 'the nav list not a flex container', typeFile: true, edit: [['nav ul {\n  display: flex;\n', 'nav ul {\n']], fails: [0] },
      { name: 'the bullets left on', typeFile: true, edit: [['  padding: 0;\n  list-style: none;\n', '  padding: 0;\n']], fails: [1] },
    ],
  },
  'spreadsheet-build/02-01e-layout-flexbox#An experiment: the flex lab': {
    wrong: [{ name: 'no lab page', fails: [0] }],
  },
  'spreadsheet-build/02-01e-layout-flexbox#Buttons that wrap': {
    wrong: [
      { name: 'no rule for .actions', fails: [0, 1, 2] },
      { name: 'no wrapping', typeFile: true, edit: [['  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-3);', '  display: flex;\n  gap: var(--space-3);']], fails: [1] },
      { name: 'no gap', typeFile: true, edit: [['  flex-wrap: wrap;\n  gap: var(--space-3);', '  flex-wrap: wrap;']], fails: [2] },
    ],
  },
  'spreadsheet-build/02-01e-layout-flexbox#Commit': {
    run: ['git add playground', 'git commit -m "Lay out the header and buttons with flexbox; a flex lab"'],
    wrong: [{ name: 'not committed', fails: [0, 1] }],
  },
  'spreadsheet-build/02-01e-layout-flexbox#Your turn: contact links in a row': {
    editFiles: { 'playground/site/style.css': [[".actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-3);\n}\n", ".actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-3);\n}\n\n#contact ul {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-4);\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n"]] },
    run: ['git commit -am "Put the contact links in a row"'],
    wrong: [
      { name: 'flex on the list items, not the list', editFiles: { 'playground/site/style.css': [[".actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-3);\n}\n", ".actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-3);\n}\n\n#contact li {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-4);\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n"]] }, run: ['git commit -am "Row"'], fails: [0, 1] },
      { name: 'the bullets and indent left', editFiles: { 'playground/site/style.css': [[".actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-3);\n}\n", ".actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-3);\n}\n\n#contact ul {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-4);\n}\n"]] }, run: ['git commit -am "Row"'], fails: [2] },
      { name: 'no wrapping', editFiles: { 'playground/site/style.css': [[".actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-3);\n}\n", ".actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-3);\n}\n\n#contact ul {\n  display: flex;\n  gap: var(--space-4);\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n"]] }, run: ['git commit -am "Row"'], fails: [3] },
      { name: 'not committed', editFiles: { 'playground/site/style.css': [[".actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-3);\n}\n", ".actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-3);\n}\n\n#contact ul {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--space-4);\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n"]] }, fails: [5] },
    ],
  },
  // ── Styling 6 ────────────────────────────────────────────────────────────
  'spreadsheet-build/02-01f-layout-grid#Cards in a grid': {
    wrong: [
      { name: 'no grid', fails: [0, 1, 2] },
      { name: 'two columns', typeFile: true, edit: [['repeat(3, 1fr)', 'repeat(2, 1fr)']], fails: [1, 2] },
      { name: 'the card margin kept', typeFile: true, edit: [['  border-radius: 0.5rem;\n  background: var(--color-surface);', '  border-radius: 0.5rem;\n  margin-bottom: var(--space-3);\n  background: var(--color-surface);']], fails: [3] },
    ],
  },
  'spreadsheet-build/02-01f-layout-grid#Columns that fit the screen': {
    wrong: [
      { name: 'still three fixed columns', fails: [1, 2] },
      { name: 'minimum too small (10rem): too many columns on small screens', typeFile: true, edit: [['minmax(16rem, 1fr)', 'minmax(10rem, 1fr)']], fails: [1, 2] },
    ],
  },
  'spreadsheet-build/02-01f-layout-grid#An experiment: the grid lab': {
    wrong: [{ name: 'no lab page', fails: [0] }],
  },
  'spreadsheet-build/02-01f-layout-grid#Two columns: a split section': {
    editFiles: { 'playground/site/index.html': [['<section id="about">', '<section id="about" class="split">']] },
    wrong: [
      { name: 'the rule without the class in the HTML', typeFile: true, fails: [0, 1, 2] },
      { name: 'the class without the rule', editFiles: { 'playground/site/index.html': [['<section id="about">', '<section id="about" class="split">']] }, fails: [1, 2] },
      { name: 'a class replacing the id, which breaks the nav link', typeFile: true, editFiles: { 'playground/site/index.html': [['<section id="about">', '<section class="split">']] }, fails: [1, 2] },
    ],
  },
  'spreadsheet-build/02-01f-layout-grid#Commit': {
    run: ['git add playground', 'git commit -m "Lay out the cards and the about section with grid; a grid lab"'],
    wrong: [{ name: 'not committed', fails: [0, 1] }],
  },
  'spreadsheet-build/02-01f-layout-grid#Your turn: a grid of skills': {
    editFiles: { 'playground/site/index.html': [["easy to change.</p>\n", "easy to change.</p>\n        <ul class=\"skills\">\n          <li>HTML</li>\n          <li>CSS</li>\n          <li>JavaScript</li>\n          <li>Python</li>\n          <li>Git</li>\n          <li>Testing</li>\n        </ul>\n"]], 'playground/site/style.css': [[".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n", ".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n\n.skills {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));\n  gap: var(--space-2);\n  grid-column: 2;\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.skills li {\n  padding: var(--space-1) var(--space-3);\n  border: 1px solid var(--color-border);\n  border-radius: 999px;\n  text-align: center;\n}\n"]] },
    run: ['git commit -am "Add a grid of skills"'],
    wrong: [
      { name: 'only three skills', editFiles: { 'playground/site/index.html': [["easy to change.</p>\n", "easy to change.</p>\n        <ul class=\"skills\">\n          <li>HTML</li>\n          <li>CSS</li>\n          <li>Git</li>\n        </ul>\n"]], 'playground/site/style.css': [[".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n", ".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n\n.skills {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));\n  gap: var(--space-2);\n  grid-column: 2;\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.skills li {\n  padding: var(--space-1) var(--space-3);\n  border: 1px solid var(--color-border);\n  border-radius: 999px;\n  text-align: center;\n}\n"]] }, run: ['git commit -am "Skills"'], fails: [0] },
      { name: 'a flex row, not a grid', editFiles: { 'playground/site/index.html': [["easy to change.</p>\n", "easy to change.</p>\n        <ul class=\"skills\">\n          <li>HTML</li>\n          <li>CSS</li>\n          <li>JavaScript</li>\n          <li>Python</li>\n          <li>Git</li>\n          <li>Testing</li>\n        </ul>\n"]], 'playground/site/style.css': [[".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n", ".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n\n.skills {\n  display: flex;\n  gap: var(--space-2);\n  grid-column: 2;\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.skills li {\n  padding: var(--space-1) var(--space-3);\n  border: 1px solid var(--color-border);\n  border-radius: 999px;\n  text-align: center;\n}\n"]] }, run: ['git commit -am "Skills"'], fails: [1, 2] },
      { name: 'left in the first column, under the heading', editFiles: { 'playground/site/index.html': [["easy to change.</p>\n", "easy to change.</p>\n        <ul class=\"skills\">\n          <li>HTML</li>\n          <li>CSS</li>\n          <li>JavaScript</li>\n          <li>Python</li>\n          <li>Git</li>\n          <li>Testing</li>\n        </ul>\n"]], 'playground/site/style.css': [[".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n", ".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n\n.skills {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));\n  gap: var(--space-2);\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.skills li {\n  padding: var(--space-1) var(--space-3);\n  border: 1px solid var(--color-border);\n  border-radius: 999px;\n  text-align: center;\n}\n"]] }, run: ['git commit -am "Skills"'], fails: [3] },
      { name: 'bullets left', editFiles: { 'playground/site/index.html': [["easy to change.</p>\n", "easy to change.</p>\n        <ul class=\"skills\">\n          <li>HTML</li>\n          <li>CSS</li>\n          <li>JavaScript</li>\n          <li>Python</li>\n          <li>Git</li>\n          <li>Testing</li>\n        </ul>\n"]], 'playground/site/style.css': [[".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n", ".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n\n.skills {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));\n  gap: var(--space-2);\n  grid-column: 2;\n}\n\n.skills li {\n  padding: var(--space-1) var(--space-3);\n  border: 1px solid var(--color-border);\n  border-radius: 999px;\n  text-align: center;\n}\n"]] }, run: ['git commit -am "Skills"'], fails: [4] },
      { name: 'not committed', editFiles: { 'playground/site/index.html': [["easy to change.</p>\n", "easy to change.</p>\n        <ul class=\"skills\">\n          <li>HTML</li>\n          <li>CSS</li>\n          <li>JavaScript</li>\n          <li>Python</li>\n          <li>Git</li>\n          <li>Testing</li>\n        </ul>\n"]], 'playground/site/style.css': [[".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n", ".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n\n.skills {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));\n  gap: var(--space-2);\n  grid-column: 2;\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.skills li {\n  padding: var(--space-1) var(--space-3);\n  border: 1px solid var(--color-border);\n  border-radius: 999px;\n  text-align: center;\n}\n"]] }, fails: [5] },
    ],
  },
  // ── Styling 7 ────────────────────────────────────────────────────────────
  'spreadsheet-build/02-01g-every-screen-size#Mobile first, with a media query': {
    wrong: [
      { name: 'still a row on small screens', fails: [0] },
      { name: 'a column at every width (no media query)', typeFile: true, edit: [['\n@media (min-width: 48rem) {\n  header {\n    flex-direction: row;\n    justify-content: space-between;\n    align-items: center;\n  }\n}\n', '']], fails: [1] },
    ],
  },
  'spreadsheet-build/02-01g-every-screen-size#Type that scales with the screen': {
    wrong: [
      { name: 'a fixed 2.5rem', fails: [0, 1] },
      { name: 'a minimum as big as the old size', typeFile: true, edit: [['clamp(2rem, ', 'clamp(2.5rem, ']], fails: [1] },
    ],
  },
  'spreadsheet-build/02-01g-every-screen-size#Nothing scrolls sideways': {
    wrong: [
      { name: 'a fixed width on main', editFiles: { 'playground/site/style.css': [['  max-width: 60rem;\n  margin: 0 auto;', '  width: 60rem;\n  margin: 0 auto;']] }, fails: [0] },
    ],
  },
  'spreadsheet-build/02-01g-every-screen-size#Commit': {
    run: ['git commit -am "Make the portfolio responsive: a mobile-first header and fluid type"'],
    wrong: [{ name: 'not committed', fails: [0] }],
  },
  'spreadsheet-build/02-01g-every-screen-size#Your turn: stack the split on small screens': {
    editFiles: { 'playground/site/style.css': [[".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n", ".split {\n  display: grid;\n  gap: var(--space-4);\n  align-items: start;\n}\n\n@media (min-width: 48rem) {\n  .split {\n    grid-template-columns: 1fr 2fr;\n  }\n\n  .skills {\n    grid-column: 2;\n  }\n}\n"], ["  gap: var(--space-2);\n  grid-column: 2;\n", "  gap: var(--space-2);\n"]] },
    run: ['git commit -am "Stack the about section on small screens"'],
    wrong: [
      { name: 'one column, but grid-column: 2 left on the skills', editFiles: { 'playground/site/style.css': [[".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n", ".split {\n  display: grid;\n  gap: var(--space-4);\n  align-items: start;\n}\n\n@media (min-width: 48rem) {\n  .split {\n    grid-template-columns: 1fr 2fr;\n  }\n}\n"]] }, run: ['git commit -am "Stack"'], fails: [1] },
      { name: 'one column at every width', editFiles: { 'playground/site/style.css': [[".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n", ".split {\n  display: grid;\n  gap: var(--space-4);\n  align-items: start;\n}\n"], ["  gap: var(--space-2);\n  grid-column: 2;\n", "  gap: var(--space-2);\n"]] }, run: ['git commit -am "Stack"'], fails: [2] },
      { name: 'grid-column: 2 removed, and never put back in the media query', editFiles: { 'playground/site/style.css': [[".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n", ".split {\n  display: grid;\n  gap: var(--space-4);\n  align-items: start;\n}\n\n@media (min-width: 48rem) {\n  .split {\n    grid-template-columns: 1fr 2fr;\n  }\n}\n"], ["  gap: var(--space-2);\n  grid-column: 2;\n", "  gap: var(--space-2);\n"]] }, run: ['git commit -am "Stack"'], fails: [3] },
      { name: 'the columns left in the base rule too', editFiles: { 'playground/site/style.css': [[".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n", ".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n\n@media (min-width: 48rem) {\n  .split {\n    grid-template-columns: 1fr 2fr;\n  }\n\n  .skills {\n    grid-column: 2;\n  }\n}\n"], ["  gap: var(--space-2);\n  grid-column: 2;\n", "  gap: var(--space-2);\n"]] }, run: ['git commit -am "Stack"'], fails: [0, 1] },
      { name: 'not committed', editFiles: { 'playground/site/style.css': [[".split {\n  display: grid;\n  grid-template-columns: 1fr 2fr;\n  gap: var(--space-4);\n  align-items: start;\n}\n", ".split {\n  display: grid;\n  gap: var(--space-4);\n  align-items: start;\n}\n\n@media (min-width: 48rem) {\n  .split {\n    grid-template-columns: 1fr 2fr;\n  }\n\n  .skills {\n    grid-column: 2;\n  }\n}\n"], ["  gap: var(--space-2);\n  grid-column: 2;\n", "  gap: var(--space-2);\n"]] }, fails: [4] },
    ],
  },
  'spreadsheet-build/02-02-a-table#The table': {
    wrong: [
      { name: 'columns out of order', files: { 'index.html': table({ headers: ['', 'B', 'A', 'C', 'D'] }) }, fails: [0] },
      { name: 'row numbers as td instead of th', files: { 'index.html': table({ rowHeaderTag: 'td' }) }, fails: [1, 2] },
      { name: 'row 2 is missing its empty Total cell', files: { 'index.html': table({ dropLastCellOfRow2: true }) }, fails: [2, 3] },
      { name: 'only three rows', files: { 'index.html': table({ rows: 3 }) }, fails: [1, 2] },
    ],
  },
  'spreadsheet-build/02-02-a-table#Commit': {
    run: ['git commit -am "Draw a 4 by 4 grid as a table"'],
    wrong: [
      { name: 'did not commit', fails: [0] },
      { name: 'a message that says nothing', run: ['git commit -am "more html"'], fails: [1] },
    ],
  },

  'spreadsheet-build/02-02-a-table#Your turn: Tea, and a spare row': {
    editFiles: { 'index.html': [["        <tr>\n          <th>4</th>\n          <td></td>\n          <td></td>\n          <td></td>\n          <td></td>\n        </tr>\n", "        <tr>\n          <th>4</th>\n          <td>Tea</td>\n          <td>2.75</td>\n          <td>1</td>\n          <td></td>\n        </tr>\n        <tr>\n          <th>5</th>\n          <td></td>\n          <td></td>\n          <td></td>\n          <td></td>\n        </tr>\n"]] },
    run: ['git commit -am "Add tea, and a spare row"'],
    wrong: [
      { name: 'tea in row 5, row 4 left empty', editFiles: { 'index.html': [["        <tr>\n          <th>4</th>\n          <td></td>\n          <td></td>\n          <td></td>\n          <td></td>\n        </tr>\n", "        <tr>\n          <th>4</th>\n          <td></td>\n          <td></td>\n          <td></td>\n          <td></td>\n        </tr>\n        <tr>\n          <th>5</th>\n          <td>Tea</td>\n          <td>2.75</td>\n          <td>1</td>\n          <td></td>\n        </tr>\n"]] }, run: ['git commit -am "Tea"'], fails: [1, 2] },
      { name: 'no spare row', editFiles: { 'index.html': [["        <tr>\n          <th>4</th>\n          <td></td>\n          <td></td>\n          <td></td>\n          <td></td>\n        </tr>\n", "        <tr>\n          <th>4</th>\n          <td>Tea</td>\n          <td>2.75</td>\n          <td>1</td>\n          <td></td>\n        </tr>\n"]] }, run: ['git commit -am "Tea"'], fails: [0, 2, 3] },
      { name: 'the new row numbered 4 again', editFiles: { 'index.html': [["        <tr>\n          <th>4</th>\n          <td></td>\n          <td></td>\n          <td></td>\n          <td></td>\n        </tr>\n", "        <tr>\n          <th>4</th>\n          <td>Tea</td>\n          <td>2.75</td>\n          <td>1</td>\n          <td></td>\n        </tr>\n        <tr>\n          <th>4</th>\n          <td></td>\n          <td></td>\n          <td></td>\n          <td></td>\n        </tr>\n"]] }, run: ['git commit -am "Tea"'], fails: [0] },
      { name: 'not committed', editFiles: { 'index.html': [["        <tr>\n          <th>4</th>\n          <td></td>\n          <td></td>\n          <td></td>\n          <td></td>\n        </tr>\n", "        <tr>\n          <th>4</th>\n          <td>Tea</td>\n          <td>2.75</td>\n          <td>1</td>\n          <td></td>\n        </tr>\n        <tr>\n          <th>5</th>\n          <td></td>\n          <td></td>\n          <td></td>\n          <td></td>\n        </tr>\n"]] }, fails: [4] },
    ],
  },

  // ── 2.3 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/02-03-css#Link a stylesheet': {
    wrong: [
      { name: 'links styles.css (a different name)', files: { 'index.html': table({ link: '<link rel="stylesheet" href="styles.css">' }) }, fails: [0] },
    ],
  },
  'spreadsheet-build/02-03-css#The stylesheet': {
    wrong: [
      { name: 'saved as styles.css, which the page does not link', files: { 'styles.css': CSS }, fails: [0, 1, 2] },
      { name: 'forgot border-collapse', files: { 'style.css': CSS.replace('  border-collapse: collapse;\n', '') }, fails: [1] },
    ],
  },
  'spreadsheet-build/02-03-css#Shaded headers': {
    wrong: [
      { name: 'no header rule', fails: [0] },
      { name: 'shaded every cell', files: { 'style.css': CSS.replace('th {\n  background', 'th,\ntd {\n  background') }, fails: [1] },
    ],
  },
  'spreadsheet-build/02-03-css#Column letters that stay put': {
    wrong: [
      { name: 'no sticky rule', fails: [0] },
      { name: 'made every th sticky, row numbers too', files: { 'style.css': CSS.replace('thead th {', 'th {') }, fails: [1] },
    ],
  },
  'spreadsheet-build/02-03-css#Commit': {
    run: ['git add style.css', 'git commit -am "Style the grid like a spreadsheet"'],
    wrong: [{ name: 'commit -a without adding the new file', run: ['git commit -am "Style the grid"'], fails: [0, 1] }],
  },

  'spreadsheet-build/02-03-css#Your turn: the sheet\'s colours as tokens': {
    files: { 'style.css': TOKEN_CSS },
    run: ['git commit -am "Name the sheet\'s colours as tokens"'],
    wrong: [
      { name: 'tokens set on body, not :root', files: { 'style.css': TOKEN_CSS.replace(':root {', 'body {') }, run: ['git commit -am "Tokens"'], fails: [0] },
      { name: 'tokens defined but never used', files: { 'style.css': ':root {\n  --grid-line: #d0d7de;\n}\n\n' + CSS }, run: ['git commit -am "Tokens"'], fails: [1, 2] },
      { name: 'a typo in a var() name', files: { 'style.css': TOKEN_CSS.replace('solid var(--grid-line)', 'solid var(--grid-lines)') }, run: ['git commit -am "Tokens"'], fails: [3] },
      { name: 'the header colours swapped', files: { 'style.css': TOKEN_CSS.replace('background: var(--header-bg)', 'background: var(--header-text)').replace('color: var(--header-text)', 'color: var(--header-bg)') }, run: ['git commit -am "Tokens"'], fails: [4] },
      { name: 'not committed', files: { 'style.css': TOKEN_CSS }, fails: [5] },
    ],
  },

  // ── 2.4 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/02-04-devtools#Your turn: right-align the row numbers': {
    files: { 'style.css': TOKEN_CSS + '\ntbody th {\n  text-align: right;\n}\n' },
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'every th, column letters too', files: { 'style.css': TOKEN_CSS + '\nth {\n  text-align: right;\n}\n' }, fails: [1] },
      { name: 'every cell', files: { 'style.css': TOKEN_CSS + '\nth,\ntd {\n  text-align: right;\n}\n' }, fails: [1, 2] },
      // Measured: in Chromium the row numbers DO inherit this (th's default centring gives way
      // to an inherited text-align), but so do the data cells, which check 2 catches.
      { name: 'on tbody itself (row numbers inherit it, but so do the data cells)', files: { 'style.css': TOKEN_CSS + '\ntbody {\n  text-align: right;\n}\n' }, fails: [2] },
      { name: 'a class selector by mistake', files: { 'style.css': TOKEN_CSS + '\n.tbody th {\n  text-align: right;\n}\n' }, fails: [0] },
    ],
  },
  'spreadsheet-build/02-04-devtools#Merge the sprint and push': {
    run: ['git commit -am "Right-align row numbers"', 'git switch main', 'git merge grid-page', 'git push', 'git branch -d grid-page'],
    wrong: [
      { name: 'merged but did not push', run: ['git commit -am "Right-align row numbers"', 'git switch main', 'git merge grid-page', 'git branch -d grid-page'], fails: [3] },
      { name: 'switched to main without merging', run: ['git commit -am "Right-align row numbers"', 'git switch main'], fails: [1, 2] },
      { name: 'pushed the branch instead of merging', run: ['git commit -am "Right-align row numbers"', 'git push -u origin grid-page'], fails: [0, 2] },
    ],
  },

  // ── 2.5 and 2.6: the pricing page ───────────────────────────────────────
  'spreadsheet-build/02-05-challenge-a-page-from-a-design#Your turn: build it to the brief': {
    files: { "playground/pricing/index.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n    <title>Pricing \u2014 Gridwise</title>\n    <link rel=\"stylesheet\" href=\"style.css\">\n  </head>\n  <body>\n    <header class=\"site-header\">\n      <a class=\"brand\" href=\"#\">Gridwise</a>\n      <nav>\n        <ul>\n          <li><a href=\"#\">Features</a></li>\n          <li><a href=\"#\">Pricing</a></li>\n          <li><a href=\"#\">Sign in</a></li>\n        </ul>\n      </nav>\n    </header>\n    <main>\n      <section class=\"intro\">\n        <h1>Simple, honest pricing</h1>\n        <p>Start free. Upgrade when your team needs more. Cancel any time.</p>\n      </section>\n      <section class=\"plans\">\n        <article class=\"plan\">\n          <h2>Free</h2>\n          <p class=\"price\"><span class=\"amount\">$0</span> per month</p>\n          <ul>\n            <li>3 workbooks</li>\n            <li>Formulas and charts</li>\n            <li>Export to CSV</li>\n          </ul>\n          <a class=\"button secondary\" href=\"#\">Start free</a>\n        </article>\n        <article class=\"plan featured\">\n          <p class=\"badge\">Most popular</p>\n          <h2>Team</h2>\n          <p class=\"price\"><span class=\"amount\">$8</span> per person, per month</p>\n          <ul>\n            <li>Unlimited workbooks</li>\n            <li>Live collaboration</li>\n            <li>Version history</li>\n            <li>Shared templates</li>\n          </ul>\n          <a class=\"button\" href=\"#\">Try Team free</a>\n        </article>\n        <article class=\"plan\">\n          <h2>Business</h2>\n          <p class=\"price\"><span class=\"amount\">$20</span> per person, per month</p>\n          <ul>\n            <li>Everything in Team</li>\n            <li>Permissions by role</li>\n            <li>Audit log</li>\n            <li>Priority support</li>\n          </ul>\n          <a class=\"button secondary\" href=\"#\">Contact sales</a>\n        </article>\n      </section>\n    </main>\n    <footer>\n      <p>Prices exclude tax. Gridwise is a made-up product for this bootcamp.</p>\n    </footer>\n  </body>\n</html>\n", "playground/pricing/style.css": "*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n\n:root {\n  --space-2: 0.5rem;\n  --space-3: 1rem;\n  --space-4: 1.5rem;\n  --space-5: 3rem;\n\n  --color-text: #1f2933;\n  --color-muted: #52606d;\n  --color-bg: #ffffff;\n  --color-surface: #f5f7fa;\n  --color-border: #e4e7eb;\n  --color-accent: #2563eb;\n  --color-accent-strong: #1d4ed8;\n  --color-on-accent: #ffffff;\n\n  --radius: 0.75rem;\n}\n\nbody {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n  line-height: 1.6;\n  color: var(--color-text);\n  background: var(--color-bg);\n}\n\nh1,\nh2 {\n  margin: 0 0 var(--space-3);\n  line-height: 1.2;\n}\n\nh1 {\n  font-size: clamp(2rem, 1.5rem + 2.5vw, 3rem);\n}\n\nh2 {\n  font-size: 1.5rem;\n}\n\np {\n  margin: 0 0 var(--space-3);\n}\n\na {\n  color: var(--color-accent);\n}\n\n:focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n\n.site-header {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  align-items: center;\n  gap: var(--space-3);\n  padding: var(--space-3);\n  border-bottom: 1px solid var(--color-border);\n}\n\n.brand {\n  color: inherit;\n  font-size: 1.25rem;\n  font-weight: 700;\n  text-decoration: none;\n}\n\n.site-header ul {\n  display: flex;\n  gap: var(--space-4);\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.site-header nav a {\n  color: inherit;\n  font-weight: 600;\n  text-decoration: none;\n}\n\nmain {\n  max-width: 70rem;\n  margin: 0 auto;\n  padding: var(--space-5) var(--space-3);\n}\n\n.intro {\n  margin-bottom: var(--space-5);\n  text-align: center;\n}\n\n.intro p {\n  color: var(--color-muted);\n}\n\n.plans {\n  display: grid;\n  gap: var(--space-4);\n}\n\n@media (min-width: 60rem) {\n  .plans {\n    grid-template-columns: repeat(3, 1fr);\n  }\n}\n\n.plan {\n  display: flex;\n  flex-direction: column;\n  padding: var(--space-4);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius);\n  background: var(--color-surface);\n}\n\n.plan ul {\n  flex: 1;\n  margin: 0 0 var(--space-4);\n  padding-left: var(--space-4);\n}\n\n.featured {\n  border: 2px solid var(--color-accent);\n}\n\n.badge {\n  align-self: flex-start;\n  margin: 0 0 var(--space-2);\n  padding: 0 var(--space-3);\n  border-radius: 999px;\n  background: var(--color-accent);\n  color: var(--color-on-accent);\n  font-size: 0.875rem;\n  font-weight: 600;\n}\n\n.price {\n  color: var(--color-muted);\n}\n\n.amount {\n  color: var(--color-text);\n  font-size: 2rem;\n  font-weight: 700;\n}\n\n.button {\n  display: block;\n  padding: var(--space-2) var(--space-4);\n  border: 2px solid var(--color-accent);\n  border-radius: 0.5rem;\n  background: var(--color-accent);\n  color: var(--color-on-accent);\n  font-weight: 600;\n  text-align: center;\n  text-decoration: none;\n}\n\n.button:hover {\n  background: var(--color-accent-strong);\n  border-color: var(--color-accent-strong);\n}\n\n.button.secondary {\n  background: transparent;\n  color: var(--color-accent);\n}\n\nfooter {\n  padding: var(--space-4) var(--space-3);\n  border-top: 1px solid var(--color-border);\n  color: var(--color-muted);\n  text-align: center;\n}\n" },
    run: ["git switch -c pricing", "git add playground/pricing", "git commit -m \"Build the pricing page to the brief\"", "git switch main", "git merge pricing", "git branch -d pricing", "git push"],
    wrong: [
      { name: 'the HTML only, no CSS, and nothing committed', files: { "playground/pricing/index.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n    <title>Pricing \u2014 Gridwise</title>\n    <link rel=\"stylesheet\" href=\"style.css\">\n  </head>\n  <body>\n    <header class=\"site-header\">\n      <a class=\"brand\" href=\"#\">Gridwise</a>\n      <nav>\n        <ul>\n          <li><a href=\"#\">Features</a></li>\n          <li><a href=\"#\">Pricing</a></li>\n          <li><a href=\"#\">Sign in</a></li>\n        </ul>\n      </nav>\n    </header>\n    <main>\n      <section class=\"intro\">\n        <h1>Simple, honest pricing</h1>\n        <p>Start free. Upgrade when your team needs more. Cancel any time.</p>\n      </section>\n      <section class=\"plans\">\n        <article class=\"plan\">\n          <h2>Free</h2>\n          <p class=\"price\"><span class=\"amount\">$0</span> per month</p>\n          <ul>\n            <li>3 workbooks</li>\n            <li>Formulas and charts</li>\n            <li>Export to CSV</li>\n          </ul>\n          <a class=\"button secondary\" href=\"#\">Start free</a>\n        </article>\n        <article class=\"plan featured\">\n          <p class=\"badge\">Most popular</p>\n          <h2>Team</h2>\n          <p class=\"price\"><span class=\"amount\">$8</span> per person, per month</p>\n          <ul>\n            <li>Unlimited workbooks</li>\n            <li>Live collaboration</li>\n            <li>Version history</li>\n            <li>Shared templates</li>\n          </ul>\n          <a class=\"button\" href=\"#\">Try Team free</a>\n        </article>\n        <article class=\"plan\">\n          <h2>Business</h2>\n          <p class=\"price\"><span class=\"amount\">$20</span> per person, per month</p>\n          <ul>\n            <li>Everything in Team</li>\n            <li>Permissions by role</li>\n            <li>Audit log</li>\n            <li>Priority support</li>\n          </ul>\n          <a class=\"button secondary\" href=\"#\">Contact sales</a>\n        </article>\n      </section>\n    </main>\n    <footer>\n      <p>Prices exclude tax. Gridwise is a made-up product for this bootcamp.</p>\n    </footer>\n  </body>\n</html>\n", "playground/pricing/style.css": "" }, fails: [3, 6, 7, 10, 11, 14, 15, 17] },
      { name: "the first plan featured instead of the middle one", files: { "playground/pricing/index.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n    <title>Pricing \u2014 Gridwise</title>\n    <link rel=\"stylesheet\" href=\"style.css\">\n  </head>\n  <body>\n    <header class=\"site-header\">\n      <a class=\"brand\" href=\"#\">Gridwise</a>\n      <nav>\n        <ul>\n          <li><a href=\"#\">Features</a></li>\n          <li><a href=\"#\">Pricing</a></li>\n          <li><a href=\"#\">Sign in</a></li>\n        </ul>\n      </nav>\n    </header>\n    <main>\n      <section class=\"intro\">\n        <h1>Simple, honest pricing</h1>\n        <p>Start free. Upgrade when your team needs more. Cancel any time.</p>\n      </section>\n      <section class=\"plans\">\n        <article class=\"plan featured\">\n          <h2>Free</h2>\n          <p class=\"price\"><span class=\"amount\">$0</span> per month</p>\n          <ul>\n            <li>3 workbooks</li>\n            <li>Formulas and charts</li>\n            <li>Export to CSV</li>\n          </ul>\n          <a class=\"button secondary\" href=\"#\">Start free</a>\n        </article>\n        <article class=\"plan\">\n          <p class=\"badge\">Most popular</p>\n          <h2>Team</h2>\n          <p class=\"price\"><span class=\"amount\">$8</span> per person, per month</p>\n          <ul>\n            <li>Unlimited workbooks</li>\n            <li>Live collaboration</li>\n            <li>Version history</li>\n            <li>Shared templates</li>\n          </ul>\n          <a class=\"button\" href=\"#\">Try Team free</a>\n        </article>\n        <article class=\"plan\">\n          <h2>Business</h2>\n          <p class=\"price\"><span class=\"amount\">$20</span> per person, per month</p>\n          <ul>\n            <li>Everything in Team</li>\n            <li>Permissions by role</li>\n            <li>Audit log</li>\n            <li>Priority support</li>\n          </ul>\n          <a class=\"button secondary\" href=\"#\">Contact sales</a>\n        </article>\n      </section>\n    </main>\n    <footer>\n      <p>Prices exclude tax. Gridwise is a made-up product for this bootcamp.</p>\n    </footer>\n  </body>\n</html>\n", "playground/pricing/style.css": "*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n\n:root {\n  --space-2: 0.5rem;\n  --space-3: 1rem;\n  --space-4: 1.5rem;\n  --space-5: 3rem;\n\n  --color-text: #1f2933;\n  --color-muted: #52606d;\n  --color-bg: #ffffff;\n  --color-surface: #f5f7fa;\n  --color-border: #e4e7eb;\n  --color-accent: #2563eb;\n  --color-accent-strong: #1d4ed8;\n  --color-on-accent: #ffffff;\n\n  --radius: 0.75rem;\n}\n\nbody {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n  line-height: 1.6;\n  color: var(--color-text);\n  background: var(--color-bg);\n}\n\nh1,\nh2 {\n  margin: 0 0 var(--space-3);\n  line-height: 1.2;\n}\n\nh1 {\n  font-size: clamp(2rem, 1.5rem + 2.5vw, 3rem);\n}\n\nh2 {\n  font-size: 1.5rem;\n}\n\np {\n  margin: 0 0 var(--space-3);\n}\n\na {\n  color: var(--color-accent);\n}\n\n:focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n\n.site-header {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  align-items: center;\n  gap: var(--space-3);\n  padding: var(--space-3);\n  border-bottom: 1px solid var(--color-border);\n}\n\n.brand {\n  color: inherit;\n  font-size: 1.25rem;\n  font-weight: 700;\n  text-decoration: none;\n}\n\n.site-header ul {\n  display: flex;\n  gap: var(--space-4);\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.site-header nav a {\n  color: inherit;\n  font-weight: 600;\n  text-decoration: none;\n}\n\nmain {\n  max-width: 70rem;\n  margin: 0 auto;\n  padding: var(--space-5) var(--space-3);\n}\n\n.intro {\n  margin-bottom: var(--space-5);\n  text-align: center;\n}\n\n.intro p {\n  color: var(--color-muted);\n}\n\n.plans {\n  display: grid;\n  gap: var(--space-4);\n}\n\n@media (min-width: 60rem) {\n  .plans {\n    grid-template-columns: repeat(3, 1fr);\n  }\n}\n\n.plan {\n  display: flex;\n  flex-direction: column;\n  padding: var(--space-4);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius);\n  background: var(--color-surface);\n}\n\n.plan ul {\n  flex: 1;\n  margin: 0 0 var(--space-4);\n  padding-left: var(--space-4);\n}\n\n.featured {\n  border: 2px solid var(--color-accent);\n}\n\n.badge {\n  align-self: flex-start;\n  margin: 0 0 var(--space-2);\n  padding: 0 var(--space-3);\n  border-radius: 999px;\n  background: var(--color-accent);\n  color: var(--color-on-accent);\n  font-size: 0.875rem;\n  font-weight: 600;\n}\n\n.price {\n  color: var(--color-muted);\n}\n\n.amount {\n  color: var(--color-text);\n  font-size: 2rem;\n  font-weight: 700;\n}\n\n.button {\n  display: block;\n  padding: var(--space-2) var(--space-4);\n  border: 2px solid var(--color-accent);\n  border-radius: 0.5rem;\n  background: var(--color-accent);\n  color: var(--color-on-accent);\n  font-weight: 600;\n  text-align: center;\n  text-decoration: none;\n}\n\n.button:hover {\n  background: var(--color-accent-strong);\n  border-color: var(--color-accent-strong);\n}\n\n.button.secondary {\n  background: transparent;\n  color: var(--color-accent);\n}\n\nfooter {\n  padding: var(--space-4) var(--space-3);\n  border-top: 1px solid var(--color-border);\n  color: var(--color-muted);\n  text-align: center;\n}\n" }, run: ["git switch -c pricing", "git add playground/pricing", "git commit -m \"Build the pricing page to the brief\"", "git switch main", "git merge pricing", "git branch -d pricing"], fails: [2] },
      { name: "no media query: one column at every width", files: { "playground/pricing/index.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n    <title>Pricing \u2014 Gridwise</title>\n    <link rel=\"stylesheet\" href=\"style.css\">\n  </head>\n  <body>\n    <header class=\"site-header\">\n      <a class=\"brand\" href=\"#\">Gridwise</a>\n      <nav>\n        <ul>\n          <li><a href=\"#\">Features</a></li>\n          <li><a href=\"#\">Pricing</a></li>\n          <li><a href=\"#\">Sign in</a></li>\n        </ul>\n      </nav>\n    </header>\n    <main>\n      <section class=\"intro\">\n        <h1>Simple, honest pricing</h1>\n        <p>Start free. Upgrade when your team needs more. Cancel any time.</p>\n      </section>\n      <section class=\"plans\">\n        <article class=\"plan\">\n          <h2>Free</h2>\n          <p class=\"price\"><span class=\"amount\">$0</span> per month</p>\n          <ul>\n            <li>3 workbooks</li>\n            <li>Formulas and charts</li>\n            <li>Export to CSV</li>\n          </ul>\n          <a class=\"button secondary\" href=\"#\">Start free</a>\n        </article>\n        <article class=\"plan featured\">\n          <p class=\"badge\">Most popular</p>\n          <h2>Team</h2>\n          <p class=\"price\"><span class=\"amount\">$8</span> per person, per month</p>\n          <ul>\n            <li>Unlimited workbooks</li>\n            <li>Live collaboration</li>\n            <li>Version history</li>\n            <li>Shared templates</li>\n          </ul>\n          <a class=\"button\" href=\"#\">Try Team free</a>\n        </article>\n        <article class=\"plan\">\n          <h2>Business</h2>\n          <p class=\"price\"><span class=\"amount\">$20</span> per person, per month</p>\n          <ul>\n            <li>Everything in Team</li>\n            <li>Permissions by role</li>\n            <li>Audit log</li>\n            <li>Priority support</li>\n          </ul>\n          <a class=\"button secondary\" href=\"#\">Contact sales</a>\n        </article>\n      </section>\n    </main>\n    <footer>\n      <p>Prices exclude tax. Gridwise is a made-up product for this bootcamp.</p>\n    </footer>\n  </body>\n</html>\n", "playground/pricing/style.css": "*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n\n:root {\n  --space-2: 0.5rem;\n  --space-3: 1rem;\n  --space-4: 1.5rem;\n  --space-5: 3rem;\n\n  --color-text: #1f2933;\n  --color-muted: #52606d;\n  --color-bg: #ffffff;\n  --color-surface: #f5f7fa;\n  --color-border: #e4e7eb;\n  --color-accent: #2563eb;\n  --color-accent-strong: #1d4ed8;\n  --color-on-accent: #ffffff;\n\n  --radius: 0.75rem;\n}\n\nbody {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n  line-height: 1.6;\n  color: var(--color-text);\n  background: var(--color-bg);\n}\n\nh1,\nh2 {\n  margin: 0 0 var(--space-3);\n  line-height: 1.2;\n}\n\nh1 {\n  font-size: clamp(2rem, 1.5rem + 2.5vw, 3rem);\n}\n\nh2 {\n  font-size: 1.5rem;\n}\n\np {\n  margin: 0 0 var(--space-3);\n}\n\na {\n  color: var(--color-accent);\n}\n\n:focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n\n.site-header {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  align-items: center;\n  gap: var(--space-3);\n  padding: var(--space-3);\n  border-bottom: 1px solid var(--color-border);\n}\n\n.brand {\n  color: inherit;\n  font-size: 1.25rem;\n  font-weight: 700;\n  text-decoration: none;\n}\n\n.site-header ul {\n  display: flex;\n  gap: var(--space-4);\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.site-header nav a {\n  color: inherit;\n  font-weight: 600;\n  text-decoration: none;\n}\n\nmain {\n  max-width: 70rem;\n  margin: 0 auto;\n  padding: var(--space-5) var(--space-3);\n}\n\n.intro {\n  margin-bottom: var(--space-5);\n  text-align: center;\n}\n\n.intro p {\n  color: var(--color-muted);\n}\n\n.plans {\n  display: grid;\n  gap: var(--space-4);\n}\n\n.plan {\n  display: flex;\n  flex-direction: column;\n  padding: var(--space-4);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius);\n  background: var(--color-surface);\n}\n\n.plan ul {\n  flex: 1;\n  margin: 0 0 var(--space-4);\n  padding-left: var(--space-4);\n}\n\n.featured {\n  border: 2px solid var(--color-accent);\n}\n\n.badge {\n  align-self: flex-start;\n  margin: 0 0 var(--space-2);\n  padding: 0 var(--space-3);\n  border-radius: 999px;\n  background: var(--color-accent);\n  color: var(--color-on-accent);\n  font-size: 0.875rem;\n  font-weight: 600;\n}\n\n.price {\n  color: var(--color-muted);\n}\n\n.amount {\n  color: var(--color-text);\n  font-size: 2rem;\n  font-weight: 700;\n}\n\n.button {\n  display: block;\n  padding: var(--space-2) var(--space-4);\n  border: 2px solid var(--color-accent);\n  border-radius: 0.5rem;\n  background: var(--color-accent);\n  color: var(--color-on-accent);\n  font-weight: 600;\n  text-align: center;\n  text-decoration: none;\n}\n\n.button:hover {\n  background: var(--color-accent-strong);\n  border-color: var(--color-accent-strong);\n}\n\n.button.secondary {\n  background: transparent;\n  color: var(--color-accent);\n}\n\nfooter {\n  padding: var(--space-4) var(--space-3);\n  border-top: 1px solid var(--color-border);\n  color: var(--color-muted);\n  text-align: center;\n}\n" }, run: ["git switch -c pricing", "git add playground/pricing", "git commit -m \"Build the pricing page to the brief\"", "git switch main", "git merge pricing", "git branch -d pricing"], fails: [3] },
      { name: "a minimum width that overflows a phone", files: { "playground/pricing/index.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n    <title>Pricing \u2014 Gridwise</title>\n    <link rel=\"stylesheet\" href=\"style.css\">\n  </head>\n  <body>\n    <header class=\"site-header\">\n      <a class=\"brand\" href=\"#\">Gridwise</a>\n      <nav>\n        <ul>\n          <li><a href=\"#\">Features</a></li>\n          <li><a href=\"#\">Pricing</a></li>\n          <li><a href=\"#\">Sign in</a></li>\n        </ul>\n      </nav>\n    </header>\n    <main>\n      <section class=\"intro\">\n        <h1>Simple, honest pricing</h1>\n        <p>Start free. Upgrade when your team needs more. Cancel any time.</p>\n      </section>\n      <section class=\"plans\">\n        <article class=\"plan\">\n          <h2>Free</h2>\n          <p class=\"price\"><span class=\"amount\">$0</span> per month</p>\n          <ul>\n            <li>3 workbooks</li>\n            <li>Formulas and charts</li>\n            <li>Export to CSV</li>\n          </ul>\n          <a class=\"button secondary\" href=\"#\">Start free</a>\n        </article>\n        <article class=\"plan featured\">\n          <p class=\"badge\">Most popular</p>\n          <h2>Team</h2>\n          <p class=\"price\"><span class=\"amount\">$8</span> per person, per month</p>\n          <ul>\n            <li>Unlimited workbooks</li>\n            <li>Live collaboration</li>\n            <li>Version history</li>\n            <li>Shared templates</li>\n          </ul>\n          <a class=\"button\" href=\"#\">Try Team free</a>\n        </article>\n        <article class=\"plan\">\n          <h2>Business</h2>\n          <p class=\"price\"><span class=\"amount\">$20</span> per person, per month</p>\n          <ul>\n            <li>Everything in Team</li>\n            <li>Permissions by role</li>\n            <li>Audit log</li>\n            <li>Priority support</li>\n          </ul>\n          <a class=\"button secondary\" href=\"#\">Contact sales</a>\n        </article>\n      </section>\n    </main>\n    <footer>\n      <p>Prices exclude tax. Gridwise is a made-up product for this bootcamp.</p>\n    </footer>\n  </body>\n</html>\n", "playground/pricing/style.css": "*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n\n:root {\n  --space-2: 0.5rem;\n  --space-3: 1rem;\n  --space-4: 1.5rem;\n  --space-5: 3rem;\n\n  --color-text: #1f2933;\n  --color-muted: #52606d;\n  --color-bg: #ffffff;\n  --color-surface: #f5f7fa;\n  --color-border: #e4e7eb;\n  --color-accent: #2563eb;\n  --color-accent-strong: #1d4ed8;\n  --color-on-accent: #ffffff;\n\n  --radius: 0.75rem;\n}\n\nbody {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n  line-height: 1.6;\n  color: var(--color-text);\n  background: var(--color-bg);\n}\n\nh1,\nh2 {\n  margin: 0 0 var(--space-3);\n  line-height: 1.2;\n}\n\nh1 {\n  font-size: clamp(2rem, 1.5rem + 2.5vw, 3rem);\n}\n\nh2 {\n  font-size: 1.5rem;\n}\n\np {\n  margin: 0 0 var(--space-3);\n}\n\na {\n  color: var(--color-accent);\n}\n\n:focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n\n.site-header {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  align-items: center;\n  gap: var(--space-3);\n  padding: var(--space-3);\n  border-bottom: 1px solid var(--color-border);\n}\n\n.brand {\n  color: inherit;\n  font-size: 1.25rem;\n  font-weight: 700;\n  text-decoration: none;\n}\n\n.site-header ul {\n  display: flex;\n  gap: var(--space-4);\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.site-header nav a {\n  color: inherit;\n  font-weight: 600;\n  text-decoration: none;\n}\n\nmain {\n  max-width: 70rem;\n  margin: 0 auto;\n  padding: var(--space-5) var(--space-3);\n}\n\n.intro {\n  margin-bottom: var(--space-5);\n  text-align: center;\n}\n\n.intro p {\n  color: var(--color-muted);\n}\n\n.plans {\n  display: grid;\n  gap: var(--space-4);\n}\n\n@media (min-width: 60rem) {\n  .plans {\n    grid-template-columns: repeat(3, 1fr);\n  }\n}\n\n.plan {\n  display: flex;\n  flex-direction: column;\n  padding: var(--space-4);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius);\n  background: var(--color-surface);\n}\n\n.plan ul {\n  flex: 1;\n  margin: 0 0 var(--space-4);\n  padding-left: var(--space-4);\n}\n\n.featured {\n  border: 2px solid var(--color-accent);\n}\n\n.badge {\n  align-self: flex-start;\n  margin: 0 0 var(--space-2);\n  padding: 0 var(--space-3);\n  border-radius: 999px;\n  background: var(--color-accent);\n  color: var(--color-on-accent);\n  font-size: 0.875rem;\n  font-weight: 600;\n}\n\n.price {\n  color: var(--color-muted);\n}\n\n.amount {\n  color: var(--color-text);\n  font-size: 2rem;\n  font-weight: 700;\n}\n\n.button {\n  display: block;\n  padding: var(--space-2) var(--space-4);\n  border: 2px solid var(--color-accent);\n  border-radius: 0.5rem;\n  background: var(--color-accent);\n  color: var(--color-on-accent);\n  font-weight: 600;\n  text-align: center;\n  text-decoration: none;\n}\n\n.button:hover {\n  background: var(--color-accent-strong);\n  border-color: var(--color-accent-strong);\n}\n\n.button.secondary {\n  background: transparent;\n  color: var(--color-accent);\n}\n\nfooter {\n  padding: var(--space-4) var(--space-3);\n  border-top: 1px solid var(--color-border);\n  color: var(--color-muted);\n  text-align: center;\n}\n\n.plans {\n  min-width: 380px;\n}\n" }, run: ["git switch -c pricing", "git add playground/pricing", "git commit -m \"Build the pricing page to the brief\"", "git switch main", "git merge pricing", "git branch -d pricing"], fails: [5] },
      { name: "light grey text", files: { "playground/pricing/index.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n    <title>Pricing \u2014 Gridwise</title>\n    <link rel=\"stylesheet\" href=\"style.css\">\n  </head>\n  <body>\n    <header class=\"site-header\">\n      <a class=\"brand\" href=\"#\">Gridwise</a>\n      <nav>\n        <ul>\n          <li><a href=\"#\">Features</a></li>\n          <li><a href=\"#\">Pricing</a></li>\n          <li><a href=\"#\">Sign in</a></li>\n        </ul>\n      </nav>\n    </header>\n    <main>\n      <section class=\"intro\">\n        <h1>Simple, honest pricing</h1>\n        <p>Start free. Upgrade when your team needs more. Cancel any time.</p>\n      </section>\n      <section class=\"plans\">\n        <article class=\"plan\">\n          <h2>Free</h2>\n          <p class=\"price\"><span class=\"amount\">$0</span> per month</p>\n          <ul>\n            <li>3 workbooks</li>\n            <li>Formulas and charts</li>\n            <li>Export to CSV</li>\n          </ul>\n          <a class=\"button secondary\" href=\"#\">Start free</a>\n        </article>\n        <article class=\"plan featured\">\n          <p class=\"badge\">Most popular</p>\n          <h2>Team</h2>\n          <p class=\"price\"><span class=\"amount\">$8</span> per person, per month</p>\n          <ul>\n            <li>Unlimited workbooks</li>\n            <li>Live collaboration</li>\n            <li>Version history</li>\n            <li>Shared templates</li>\n          </ul>\n          <a class=\"button\" href=\"#\">Try Team free</a>\n        </article>\n        <article class=\"plan\">\n          <h2>Business</h2>\n          <p class=\"price\"><span class=\"amount\">$20</span> per person, per month</p>\n          <ul>\n            <li>Everything in Team</li>\n            <li>Permissions by role</li>\n            <li>Audit log</li>\n            <li>Priority support</li>\n          </ul>\n          <a class=\"button secondary\" href=\"#\">Contact sales</a>\n        </article>\n      </section>\n    </main>\n    <footer>\n      <p>Prices exclude tax. Gridwise is a made-up product for this bootcamp.</p>\n    </footer>\n  </body>\n</html>\n", "playground/pricing/style.css": "*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n\n:root {\n  --space-2: 0.5rem;\n  --space-3: 1rem;\n  --space-4: 1.5rem;\n  --space-5: 3rem;\n\n  --color-text: #1f2933;\n  --color-muted: #9aa5b1;\n  --color-bg: #ffffff;\n  --color-surface: #f5f7fa;\n  --color-border: #e4e7eb;\n  --color-accent: #2563eb;\n  --color-accent-strong: #1d4ed8;\n  --color-on-accent: #ffffff;\n\n  --radius: 0.75rem;\n}\n\nbody {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n  line-height: 1.6;\n  color: var(--color-text);\n  background: var(--color-bg);\n}\n\nh1,\nh2 {\n  margin: 0 0 var(--space-3);\n  line-height: 1.2;\n}\n\nh1 {\n  font-size: clamp(2rem, 1.5rem + 2.5vw, 3rem);\n}\n\nh2 {\n  font-size: 1.5rem;\n}\n\np {\n  margin: 0 0 var(--space-3);\n}\n\na {\n  color: var(--color-accent);\n}\n\n:focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n\n.site-header {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  align-items: center;\n  gap: var(--space-3);\n  padding: var(--space-3);\n  border-bottom: 1px solid var(--color-border);\n}\n\n.brand {\n  color: inherit;\n  font-size: 1.25rem;\n  font-weight: 700;\n  text-decoration: none;\n}\n\n.site-header ul {\n  display: flex;\n  gap: var(--space-4);\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.site-header nav a {\n  color: inherit;\n  font-weight: 600;\n  text-decoration: none;\n}\n\nmain {\n  max-width: 70rem;\n  margin: 0 auto;\n  padding: var(--space-5) var(--space-3);\n}\n\n.intro {\n  margin-bottom: var(--space-5);\n  text-align: center;\n}\n\n.intro p {\n  color: var(--color-muted);\n}\n\n.plans {\n  display: grid;\n  gap: var(--space-4);\n}\n\n@media (min-width: 60rem) {\n  .plans {\n    grid-template-columns: repeat(3, 1fr);\n  }\n}\n\n.plan {\n  display: flex;\n  flex-direction: column;\n  padding: var(--space-4);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius);\n  background: var(--color-surface);\n}\n\n.plan ul {\n  flex: 1;\n  margin: 0 0 var(--space-4);\n  padding-left: var(--space-4);\n}\n\n.featured {\n  border: 2px solid var(--color-accent);\n}\n\n.badge {\n  align-self: flex-start;\n  margin: 0 0 var(--space-2);\n  padding: 0 var(--space-3);\n  border-radius: 999px;\n  background: var(--color-accent);\n  color: var(--color-on-accent);\n  font-size: 0.875rem;\n  font-weight: 600;\n}\n\n.price {\n  color: var(--color-muted);\n}\n\n.amount {\n  color: var(--color-text);\n  font-size: 2rem;\n  font-weight: 700;\n}\n\n.button {\n  display: block;\n  padding: var(--space-2) var(--space-4);\n  border: 2px solid var(--color-accent);\n  border-radius: 0.5rem;\n  background: var(--color-accent);\n  color: var(--color-on-accent);\n  font-weight: 600;\n  text-align: center;\n  text-decoration: none;\n}\n\n.button:hover {\n  background: var(--color-accent-strong);\n  border-color: var(--color-accent-strong);\n}\n\n.button.secondary {\n  background: transparent;\n  color: var(--color-accent);\n}\n\nfooter {\n  padding: var(--space-4) var(--space-3);\n  border-top: 1px solid var(--color-border);\n  color: var(--color-muted);\n  text-align: center;\n}\n" }, run: ["git switch -c pricing", "git add playground/pricing", "git commit -m \"Build the pricing page to the brief\"", "git switch main", "git merge pricing", "git branch -d pricing"], fails: [8] },
      { name: "pale text on the buttons and badge", files: { "playground/pricing/index.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n    <title>Pricing \u2014 Gridwise</title>\n    <link rel=\"stylesheet\" href=\"style.css\">\n  </head>\n  <body>\n    <header class=\"site-header\">\n      <a class=\"brand\" href=\"#\">Gridwise</a>\n      <nav>\n        <ul>\n          <li><a href=\"#\">Features</a></li>\n          <li><a href=\"#\">Pricing</a></li>\n          <li><a href=\"#\">Sign in</a></li>\n        </ul>\n      </nav>\n    </header>\n    <main>\n      <section class=\"intro\">\n        <h1>Simple, honest pricing</h1>\n        <p>Start free. Upgrade when your team needs more. Cancel any time.</p>\n      </section>\n      <section class=\"plans\">\n        <article class=\"plan\">\n          <h2>Free</h2>\n          <p class=\"price\"><span class=\"amount\">$0</span> per month</p>\n          <ul>\n            <li>3 workbooks</li>\n            <li>Formulas and charts</li>\n            <li>Export to CSV</li>\n          </ul>\n          <a class=\"button secondary\" href=\"#\">Start free</a>\n        </article>\n        <article class=\"plan featured\">\n          <p class=\"badge\">Most popular</p>\n          <h2>Team</h2>\n          <p class=\"price\"><span class=\"amount\">$8</span> per person, per month</p>\n          <ul>\n            <li>Unlimited workbooks</li>\n            <li>Live collaboration</li>\n            <li>Version history</li>\n            <li>Shared templates</li>\n          </ul>\n          <a class=\"button\" href=\"#\">Try Team free</a>\n        </article>\n        <article class=\"plan\">\n          <h2>Business</h2>\n          <p class=\"price\"><span class=\"amount\">$20</span> per person, per month</p>\n          <ul>\n            <li>Everything in Team</li>\n            <li>Permissions by role</li>\n            <li>Audit log</li>\n            <li>Priority support</li>\n          </ul>\n          <a class=\"button secondary\" href=\"#\">Contact sales</a>\n        </article>\n      </section>\n    </main>\n    <footer>\n      <p>Prices exclude tax. Gridwise is a made-up product for this bootcamp.</p>\n    </footer>\n  </body>\n</html>\n", "playground/pricing/style.css": "*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n\n:root {\n  --space-2: 0.5rem;\n  --space-3: 1rem;\n  --space-4: 1.5rem;\n  --space-5: 3rem;\n\n  --color-text: #1f2933;\n  --color-muted: #52606d;\n  --color-bg: #ffffff;\n  --color-surface: #f5f7fa;\n  --color-border: #e4e7eb;\n  --color-accent: #2563eb;\n  --color-accent-strong: #1d4ed8;\n  --color-on-accent: #93c5fd;\n\n  --radius: 0.75rem;\n}\n\nbody {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n  line-height: 1.6;\n  color: var(--color-text);\n  background: var(--color-bg);\n}\n\nh1,\nh2 {\n  margin: 0 0 var(--space-3);\n  line-height: 1.2;\n}\n\nh1 {\n  font-size: clamp(2rem, 1.5rem + 2.5vw, 3rem);\n}\n\nh2 {\n  font-size: 1.5rem;\n}\n\np {\n  margin: 0 0 var(--space-3);\n}\n\na {\n  color: var(--color-accent);\n}\n\n:focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n\n.site-header {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  align-items: center;\n  gap: var(--space-3);\n  padding: var(--space-3);\n  border-bottom: 1px solid var(--color-border);\n}\n\n.brand {\n  color: inherit;\n  font-size: 1.25rem;\n  font-weight: 700;\n  text-decoration: none;\n}\n\n.site-header ul {\n  display: flex;\n  gap: var(--space-4);\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.site-header nav a {\n  color: inherit;\n  font-weight: 600;\n  text-decoration: none;\n}\n\nmain {\n  max-width: 70rem;\n  margin: 0 auto;\n  padding: var(--space-5) var(--space-3);\n}\n\n.intro {\n  margin-bottom: var(--space-5);\n  text-align: center;\n}\n\n.intro p {\n  color: var(--color-muted);\n}\n\n.plans {\n  display: grid;\n  gap: var(--space-4);\n}\n\n@media (min-width: 60rem) {\n  .plans {\n    grid-template-columns: repeat(3, 1fr);\n  }\n}\n\n.plan {\n  display: flex;\n  flex-direction: column;\n  padding: var(--space-4);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius);\n  background: var(--color-surface);\n}\n\n.plan ul {\n  flex: 1;\n  margin: 0 0 var(--space-4);\n  padding-left: var(--space-4);\n}\n\n.featured {\n  border: 2px solid var(--color-accent);\n}\n\n.badge {\n  align-self: flex-start;\n  margin: 0 0 var(--space-2);\n  padding: 0 var(--space-3);\n  border-radius: 999px;\n  background: var(--color-accent);\n  color: var(--color-on-accent);\n  font-size: 0.875rem;\n  font-weight: 600;\n}\n\n.price {\n  color: var(--color-muted);\n}\n\n.amount {\n  color: var(--color-text);\n  font-size: 2rem;\n  font-weight: 700;\n}\n\n.button {\n  display: block;\n  padding: var(--space-2) var(--space-4);\n  border: 2px solid var(--color-accent);\n  border-radius: 0.5rem;\n  background: var(--color-accent);\n  color: var(--color-on-accent);\n  font-weight: 600;\n  text-align: center;\n  text-decoration: none;\n}\n\n.button:hover {\n  background: var(--color-accent-strong);\n  border-color: var(--color-accent-strong);\n}\n\n.button.secondary {\n  background: transparent;\n  color: var(--color-accent);\n}\n\nfooter {\n  padding: var(--space-4) var(--space-3);\n  border-top: 1px solid var(--color-border);\n  color: var(--color-muted);\n  text-align: center;\n}\n" }, run: ["git switch -c pricing", "git add playground/pricing", "git commit -m \"Build the pricing page to the brief\"", "git switch main", "git merge pricing", "git branch -d pricing"], fails: [8, 9] },
      { name: "merged but not pushed", files: { "playground/pricing/index.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n    <title>Pricing \u2014 Gridwise</title>\n    <link rel=\"stylesheet\" href=\"style.css\">\n  </head>\n  <body>\n    <header class=\"site-header\">\n      <a class=\"brand\" href=\"#\">Gridwise</a>\n      <nav>\n        <ul>\n          <li><a href=\"#\">Features</a></li>\n          <li><a href=\"#\">Pricing</a></li>\n          <li><a href=\"#\">Sign in</a></li>\n        </ul>\n      </nav>\n    </header>\n    <main>\n      <section class=\"intro\">\n        <h1>Simple, honest pricing</h1>\n        <p>Start free. Upgrade when your team needs more. Cancel any time.</p>\n      </section>\n      <section class=\"plans\">\n        <article class=\"plan\">\n          <h2>Free</h2>\n          <p class=\"price\"><span class=\"amount\">$0</span> per month</p>\n          <ul>\n            <li>3 workbooks</li>\n            <li>Formulas and charts</li>\n            <li>Export to CSV</li>\n          </ul>\n          <a class=\"button secondary\" href=\"#\">Start free</a>\n        </article>\n        <article class=\"plan featured\">\n          <p class=\"badge\">Most popular</p>\n          <h2>Team</h2>\n          <p class=\"price\"><span class=\"amount\">$8</span> per person, per month</p>\n          <ul>\n            <li>Unlimited workbooks</li>\n            <li>Live collaboration</li>\n            <li>Version history</li>\n            <li>Shared templates</li>\n          </ul>\n          <a class=\"button\" href=\"#\">Try Team free</a>\n        </article>\n        <article class=\"plan\">\n          <h2>Business</h2>\n          <p class=\"price\"><span class=\"amount\">$20</span> per person, per month</p>\n          <ul>\n            <li>Everything in Team</li>\n            <li>Permissions by role</li>\n            <li>Audit log</li>\n            <li>Priority support</li>\n          </ul>\n          <a class=\"button secondary\" href=\"#\">Contact sales</a>\n        </article>\n      </section>\n    </main>\n    <footer>\n      <p>Prices exclude tax. Gridwise is a made-up product for this bootcamp.</p>\n    </footer>\n  </body>\n</html>\n", "playground/pricing/style.css": "*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n\n:root {\n  --space-2: 0.5rem;\n  --space-3: 1rem;\n  --space-4: 1.5rem;\n  --space-5: 3rem;\n\n  --color-text: #1f2933;\n  --color-muted: #52606d;\n  --color-bg: #ffffff;\n  --color-surface: #f5f7fa;\n  --color-border: #e4e7eb;\n  --color-accent: #2563eb;\n  --color-accent-strong: #1d4ed8;\n  --color-on-accent: #ffffff;\n\n  --radius: 0.75rem;\n}\n\nbody {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n  line-height: 1.6;\n  color: var(--color-text);\n  background: var(--color-bg);\n}\n\nh1,\nh2 {\n  margin: 0 0 var(--space-3);\n  line-height: 1.2;\n}\n\nh1 {\n  font-size: clamp(2rem, 1.5rem + 2.5vw, 3rem);\n}\n\nh2 {\n  font-size: 1.5rem;\n}\n\np {\n  margin: 0 0 var(--space-3);\n}\n\na {\n  color: var(--color-accent);\n}\n\n:focus-visible {\n  outline: 3px solid var(--color-accent);\n  outline-offset: 2px;\n}\n\n.site-header {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  align-items: center;\n  gap: var(--space-3);\n  padding: var(--space-3);\n  border-bottom: 1px solid var(--color-border);\n}\n\n.brand {\n  color: inherit;\n  font-size: 1.25rem;\n  font-weight: 700;\n  text-decoration: none;\n}\n\n.site-header ul {\n  display: flex;\n  gap: var(--space-4);\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.site-header nav a {\n  color: inherit;\n  font-weight: 600;\n  text-decoration: none;\n}\n\nmain {\n  max-width: 70rem;\n  margin: 0 auto;\n  padding: var(--space-5) var(--space-3);\n}\n\n.intro {\n  margin-bottom: var(--space-5);\n  text-align: center;\n}\n\n.intro p {\n  color: var(--color-muted);\n}\n\n.plans {\n  display: grid;\n  gap: var(--space-4);\n}\n\n@media (min-width: 60rem) {\n  .plans {\n    grid-template-columns: repeat(3, 1fr);\n  }\n}\n\n.plan {\n  display: flex;\n  flex-direction: column;\n  padding: var(--space-4);\n  border: 1px solid var(--color-border);\n  border-radius: var(--radius);\n  background: var(--color-surface);\n}\n\n.plan ul {\n  flex: 1;\n  margin: 0 0 var(--space-4);\n  padding-left: var(--space-4);\n}\n\n.featured {\n  border: 2px solid var(--color-accent);\n}\n\n.badge {\n  align-self: flex-start;\n  margin: 0 0 var(--space-2);\n  padding: 0 var(--space-3);\n  border-radius: 999px;\n  background: var(--color-accent);\n  color: var(--color-on-accent);\n  font-size: 0.875rem;\n  font-weight: 600;\n}\n\n.price {\n  color: var(--color-muted);\n}\n\n.amount {\n  color: var(--color-text);\n  font-size: 2rem;\n  font-weight: 700;\n}\n\n.button {\n  display: block;\n  padding: var(--space-2) var(--space-4);\n  border: 2px solid var(--color-accent);\n  border-radius: 0.5rem;\n  background: var(--color-accent);\n  color: var(--color-on-accent);\n  font-weight: 600;\n  text-align: center;\n  text-decoration: none;\n}\n\n.button:hover {\n  background: var(--color-accent-strong);\n  border-color: var(--color-accent-strong);\n}\n\n.button.secondary {\n  background: transparent;\n  color: var(--color-accent);\n}\n\nfooter {\n  padding: var(--space-4) var(--space-3);\n  border-top: 1px solid var(--color-border);\n  color: var(--color-muted);\n  text-align: center;\n}\n" }, run: ["git switch -c pricing", "git add playground/pricing", "git commit -m \"Build the pricing page to the brief\"", "git switch main", "git merge pricing", "git branch -d pricing"], fails: [16] },
    ],
  },
  "spreadsheet-build/02-06-solution-a-page-from-a-design#The header": {
    wrong: [
      { name: 'no nav yet', fails: [0] },
    ],
  },
  "spreadsheet-build/02-06-solution-a-page-from-a-design#Main, the intro and the footer": {
    wrong: [
      { name: 'no main yet', fails: [0] },
    ],
  },
  "spreadsheet-build/02-06-solution-a-page-from-a-design#One plan": {
    wrong: [
      { name: 'the plan as a div', typeFile: true, edit: [['<article class="plan">', '<div class="plan">'], ['</article>', '</div>']], fails: [0] },
    ],
  },
  "spreadsheet-build/02-06-solution-a-page-from-a-design#The third plan": {
    wrong: [
      { name: 'buttons as <button> elements', typeFile: true, edit: [['<a class="button secondary" href="#">Start free</a>', '<button class="button secondary">Start free</button>']], fails: [0] },
      { name: 'the badge left out', typeFile: true, edit: [['          <p class="badge">Most popular</p>\n', '']], fails: [1] },
    ],
  },
  "spreadsheet-build/02-06-solution-a-page-from-a-design#Colour tokens": {
    wrong: [
      { name: 'tokens on body, not :root', typeFile: true, edit: [[':root {', 'body {']], fails: [0] },
    ],
  },
  "spreadsheet-build/02-06-solution-a-page-from-a-design#Paragraphs, links and focus": {
    wrong: [
      { name: 'no focus rule', fails: [0] },
    ],
  },
  "spreadsheet-build/02-06-solution-a-page-from-a-design#The column": {
    wrong: [
      { name: 'not centred: margin 0 instead of auto', typeFile: true, edit: [['  max-width: 70rem;\n  margin: 0 auto;', '  max-width: 70rem;\n  margin: 0;']], fails: [0] },
    ],
  },
  "spreadsheet-build/02-06-solution-a-page-from-a-design#The plans: mobile first": {
    wrong: [
      { name: 'no plans rule yet', fails: [0] },
    ],
  },
  "spreadsheet-build/02-06-solution-a-page-from-a-design#Plans as cards": {
    wrong: [
      { name: 'no flex: 1 on the lists', typeFile: true, edit: [['.plan ul {\n  flex: 1;\n', '.plan ul {\n']], fails: [0] },
    ],
  },
  "spreadsheet-build/02-06-solution-a-page-from-a-design#The featured plan stands out": {
    wrong: [
      { name: 'no featured rule yet', fails: [0] },
    ],
  },
  "spreadsheet-build/02-06-solution-a-page-from-a-design#States, and the quieter buttons": {
    wrong: [
      { name: 'secondary buttons left with white text on no background', typeFile: true, edit: [['.button.secondary {\n  background: transparent;\n  color: var(--color-accent);\n', '.button.secondary {\n  background: transparent;\n']], fails: [0] },
    ],
  },
  "spreadsheet-build/02-06-solution-a-page-from-a-design#The footer": {
    wrong: [
      { name: 'a fixed width on main', typeFile: true, edit: [['  max-width: 70rem;', '  width: 70rem;']], fails: [0] },
    ],
  },
  'spreadsheet-build/02-06-solution-a-page-from-a-design#Compare': {
    run: ['git add playground/pricing-reference', 'git commit -m "Add the reference pricing page"', 'git push'],
    wrong: [{ name: 'committed but not pushed', run: ['git add playground/pricing-reference', 'git commit -m "Reference"'], fails: [2] }],
  },
  'spreadsheet-build/02-06-solution-a-page-from-a-design#Your turn: buttons that line up, on your page': {
    editFiles: { 'playground/pricing/index.html': [["<li>Priority support</li>\n", "<li>Priority support</li>\n            <li>Single sign-on</li>\n"]] },
    run: ['git commit -am "Line up the plan buttons"', 'git push'],
    wrong: [
      { name: 'no fifth feature', fails: [0] },
      { name: 'a fifth feature, but the lists do not grow', editFiles: { 'playground/pricing/index.html': [["<li>Priority support</li>\n", "<li>Priority support</li>\n            <li>Single sign-on</li>\n"]], 'playground/pricing/style.css': [['.plan ul {\n  flex: 1;\n', '.plan ul {\n']] }, run: ['git commit -am "Five features"'], fails: [1, 3] },
      { name: 'committed but not pushed', editFiles: { 'playground/pricing/index.html': [["<li>Priority support</li>\n", "<li>Priority support</li>\n            <li>Single sign-on</li>\n"]] }, run: ['git commit -am "Five features"'], fails: [3] },
    ],
  },

  // ── 3.1 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/03-01-javascript-from-python#A branch for the sprint': {
    run: ['git switch -c js-grid'],
    wrong: [{ name: 'stayed on main', fails: [0] }],
  },
  'spreadsheet-build/03-01-javascript-from-python#A script on the page': {
    wrong: [
      { name: 'misspelled the file name', edit: [['<script src="grid.js">', '<script src="gird.js">']], fails: [0] },
    ],
  },
  'spreadsheet-build/03-01-javascript-from-python#grid.js': {
    wrong: [
      { name: 'no grid.js', fails: [0, 1] },
      { name: 'Python print', files: { 'grid.js': 'print("The grid will have", 26 * 100, "cells.")\n' }, fails: [1] },
      { name: 'a different message', edit: [['"The grid will have", columns * rows, "cells."', '"Cells:", columns * rows']], fails: [1] },
      { name: 'joined with + and no spaces', edit: [['"The grid will have", columns * rows, "cells."', '"The grid will have" + columns * rows + "cells."']], fails: [1] },
    ],
  },
  'spreadsheet-build/03-01-javascript-from-python#When the script has an error': {
    wrong: [{ name: 'left the typo in', editFiles: { 'grid.js': [['console.log("The grid will have", columns', 'console.log("The grid will have", colums']] }, fails: [0] }],
  },
  'spreadsheet-build/03-01-javascript-from-python#Commit': {
    run: ['git add grid.js', 'git commit -am "Run a first script on the page"'],
    wrong: [{ name: 'commit -a without adding grid.js', run: ['git commit -am "Run a first script"'], fails: [0, 1] }],
  },

  // ── 3.2 ──────────────────────────────────────────────────────────────────
  "spreadsheet-build/03-01-javascript-from-python#Your turn: the last sheet": { files: {"playground/js/sheets.js": "const sheets = [\"Sheet1\", \"Sheet2\", \"Sheet3\"];\nconsole.log(sheets.length + \" sheets; the last is \" + sheets[sheets.length - 1]);\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], wrong: [{ name: "the message written in by hand", files: {"playground/js/sheets.js": "const sheets = [\"Sheet1\", \"Sheet2\", \"Sheet3\"];\nconsole.log(\"3 sheets; the last is Sheet3\");\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [2] }, { name: "the last item read at length, not length - 1", files: {"playground/js/sheets.js": "const sheets = [\"Sheet1\", \"Sheet2\", \"Sheet3\"];\nconsole.log(sheets.length + \" sheets; the last is \" + sheets[sheets.length]);\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [1, 2] }, { name: "not committed", files: {"playground/js/sheets.js": "const sheets = [\"Sheet1\", \"Sheet2\", \"Sheet3\"];\nconsole.log(sheets.length + \" sheets; the last is \" + sheets[sheets.length - 1]);\n"}, fails: [3] }] },
  'spreadsheet-build/03-02-functions-and-loops#A function': {
    wrong: [
      { name: 'started from 64 (one letter early)', edit: [['65 + index', '64 + index']], fails: [0, 1, 2] },
      { name: 'loop stops one short', edit: [['i < columns', 'i < columns - 1']], fails: [2] },
      { name: 'joined without spaces', edit: [['names.join(" ")', 'names.join("")']], fails: [2] },
      { name: 'Python chr()', edit: [['String.fromCharCode(65 + index)', 'chr(65 + index)']], fails: [0, 1, 2] },
    ],
  },
  'spreadsheet-build/03-02-functions-and-loops#Commit': {
    run: ['git commit -am "Name the columns A to Z"'],
    wrong: [{ name: 'did not commit', editFiles: { 'grid.js': [['const columns = 26;', 'const columns = 26; // uncommitted']] }, fails: [0] }],
  },

  // ── 3.3 ──────────────────────────────────────────────────────────────────
  "spreadsheet-build/03-02-functions-and-loops#Your turn: range": { files: {"playground/js/range.js": "function range(n) {\n  const numbers = [];\n  for (let i = 0; i < n; i++) {\n    numbers.push(i);\n  }\n  return numbers;\n}\n\nconsole.log(range(5).join(\" \"));\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], wrong: [{ name: "counts from 1", files: {"playground/js/range.js": "function range(n) {\n  const numbers = [];\n  for (let i = 1; i < n; i++) {\n    numbers.push(i);\n  }\n  return numbers;\n}\n\nconsole.log(range(5).join(\" \"));\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [2] }, { name: "goes one too far (<=)", files: {"playground/js/range.js": "function range(n) {\n  const numbers = [];\n  for (let i = 0; i <= n; i++) {\n    numbers.push(i);\n  }\n  return numbers;\n}\n\nconsole.log(range(5).join(\" \"));\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [2] }, { name: "logs the numbers instead of returning them", files: {"playground/js/range.js": "function range(n) {\n  for (let i = 0; i < n; i++) {\n    console.log(i);\n  }\n}\n\nrange(5);\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [2] }, { name: "not committed", files: {"playground/js/range.js": "function range(n) {\n  const numbers = [];\n  for (let i = 0; i < n; i++) {\n    numbers.push(i);\n  }\n  return numbers;\n}\n\nconsole.log(range(5).join(\" \"));\n"}, fails: [3] }] },
  'spreadsheet-build/03-03-the-dom#An empty table in the page': {
    wrong: [
      { name: 'kept the hand-typed table', fails: [0, 1] },
      { name: 'table without the id', edit: [['<table id="grid"></table>', '<table></table>']], fails: [0] },
    ],
  },
  'spreadsheet-build/03-03-the-dom#Build the table in grid.js': {
    wrong: [
      { name: 'forgot the corner cell', edit: [['headerRow.appendChild(document.createElement("th"));\n', '']], fails: [0, 1] },
      { name: 'looked up the table by a selector without #', edit: [['document.querySelector("#grid")', 'document.querySelector("grid")']], fails: [0, 1, 2] },
      { name: 'never added the header to the table', edit: [['table.appendChild(head);', '']], fails: [0, 1, 2] },
    ],
  },
  'spreadsheet-build/03-03-the-dom#The rows': {
    wrong: [
      { name: 'one row short', edit: [['r < rows', 'r < rows - 1']], fails: [0, 1, 2] },
      { name: 'rows numbered from 0', edit: [['rowHeader.textContent = r + 1;', 'rowHeader.textContent = r;']], fails: [1] },
      { name: 'never added the body to the table', edit: [['table.appendChild(body);', '']], fails: [0, 1, 2] },
    ],
  },
  'spreadsheet-build/03-03-the-dom#Commit': {
    run: ['git commit -am "Build the 26 by 100 grid with JavaScript"'],
    wrong: [{ name: 'did not commit', editFiles: { 'grid.js': [['const rows = 100;', 'const rows = 100; // uncommitted']] }, fails: [0] }],
  },

  // ── 3.4 ──────────────────────────────────────────────────────────────────
  "spreadsheet-build/03-03-the-dom#Your turn: a times table": { files: {"playground/js/times.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Times table</title>\n  </head>\n  <body>\n    <table id=\"times\"></table>\n    <script>\n      const table = document.querySelector(\"#times\");\n      for (let r = 1; r <= 10; r++) {\n        const tr = document.createElement(\"tr\");\n        for (let c = 1; c <= 10; c++) {\n          const td = document.createElement(\"td\");\n          td.textContent = r * c;\n          tr.appendChild(td);\n        }\n        table.appendChild(tr);\n      }\n    </script>\n  </body>\n</html>\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], wrong: [{ name: "counts from 0", files: {"playground/js/times.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Times table</title>\n  </head>\n  <body>\n    <table id=\"times\"></table>\n    <script>\n      const table = document.querySelector(\"#times\");\n      for (let r = 0; r <= 9; r++) {\n        const tr = document.createElement(\"tr\");\n        for (let c = 0; c <= 9; c++) {\n          const td = document.createElement(\"td\");\n          td.textContent = r * c;\n          tr.appendChild(td);\n        }\n        table.appendChild(tr);\n      }\n    </script>\n  </body>\n</html>\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [2] }, { name: "cells typed in the HTML", files: {"playground/js/times.html": "<!DOCTYPE html>\n<html lang=\"en\">\n<head><meta charset=\"utf-8\"><title>Times</title></head>\n<body>\n<table id=\"times\"><tr><td>1</td></tr></table>\n</body>\n</html>\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [0, 1, 3] }, { name: "not committed", files: {"playground/js/times.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Times table</title>\n  </head>\n  <body>\n    <table id=\"times\"></table>\n    <script>\n      const table = document.querySelector(\"#times\");\n      for (let r = 1; r <= 10; r++) {\n        const tr = document.createElement(\"tr\");\n        for (let c = 1; c <= 10; c++) {\n          const td = document.createElement(\"td\");\n          td.textContent = r * c;\n          tr.appendChild(td);\n        }\n        table.appendChild(tr);\n      }\n    </script>\n  </body>\n</html>\n"}, fails: [4] }] },
  'spreadsheet-build/03-04-selecting-a-cell#The name box': {
    wrong: [{ name: 'no name box', fails: [0] }],
  },
  'spreadsheet-build/03-04-selecting-a-cell#Styles for the box and the selection': {
    wrong: [{ name: 'no new rules', fails: [0, 1] }],
  },
  'spreadsheet-build/03-04-selecting-a-cell#A selected cell': {
    wrong: [
      { name: 'no starting selection', edit: [['\nselect(0, 0);\n', '\n']], fails: [0] },
      { name: 'no brackets around row + 1 ("A01")', edit: [['columnName(column) + (row + 1)', 'columnName(column) + row + 1']], fails: [0] },
    ],
  },
  'spreadsheet-build/03-04-selecting-a-cell#Listening for clicks': {
    wrong: [
      { name: 'arguments swapped: select(r, c)', edit: [['() => select(c, r)', '() => select(r, c)']], fails: [0, 1, 2] },
      { name: 'never removes the old outline', edit: [['    selected.classList.remove("selected");\n', '']], fails: [1] },
      { name: 'forgot the + 1 for the row-number column', edit: [['cells[column + 1]', 'cells[column]']], fails: [2] },
      { name: 'called select instead of passing a function', edit: [['td.addEventListener("click", () => select(c, r));', 'td.addEventListener("click", select(c, r));']], fails: [0, 1, 2] },
    ],
  },
  'spreadsheet-build/03-04-selecting-a-cell#Break it on purpose: arguments in the wrong order': {
    wrong: [{ name: 'left the arguments swapped', editFiles: { 'grid.js': [['() => select(c, r)', '() => select(r, c)']] }, fails: [0] }],
  },
  'spreadsheet-build/03-04-selecting-a-cell#Commit': {
    run: ['git commit -am "Select a cell by clicking it"'],
    wrong: [{ name: 'did not commit', editFiles: { 'grid.js': [['const rows = 100;', 'const rows = 100; // uncommitted']] }, fails: [0] }],
  },

  // ── 3.5 ──────────────────────────────────────────────────────────────────
  "spreadsheet-build/03-04-selecting-a-cell#Your turn: a counter": { files: {"playground/js/counter.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Counter</title>\n  </head>\n  <body>\n    <p id=\"count\">Clicked 0 times</p>\n    <button id=\"add\">Add one</button>\n    <button id=\"reset\">Reset</button>\n    <script>\n      const count = document.querySelector(\"#count\");\n      let clicks = 0;\n      function show(n) {\n        count.textContent = \"Clicked \" + n + \" times\";\n      }\n      document.querySelector(\"#add\").addEventListener(\"click\", () => {\n        clicks = clicks + 1;\n        show(clicks);\n      });\n      document.querySelector(\"#reset\").addEventListener(\"click\", () => {\n        clicks = 0;\n        show(0);\n      });\n    </script>\n  </body>\n</html>\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], wrong: [{ name: "the count declared inside the listener: always 1", files: {"playground/js/counter.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Counter</title>\n  </head>\n  <body>\n    <p id=\"count\">Clicked 0 times</p>\n    <button id=\"add\">Add one</button>\n    <button id=\"reset\">Reset</button>\n    <script>\n      const count = document.querySelector(\"#count\");\n      function show(n) {\n        count.textContent = \"Clicked \" + n + \" times\";\n      }\n      document.querySelector(\"#add\").addEventListener(\"click\", () => {\n        let clicks = 0;\n        clicks = clicks + 1;\n        show(clicks);\n      });\n    </script>\n  </body>\n</html>\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [1, 2] }, { name: "no reset", files: {"playground/js/counter.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Counter</title>\n  </head>\n  <body>\n    <p id=\"count\">Clicked 0 times</p>\n    <button id=\"add\">Add one</button>\n    <button id=\"reset\">Reset</button>\n    <script>\n      const count = document.querySelector(\"#count\");\n      let clicks = 0;\n      function show(n) {\n        count.textContent = \"Clicked \" + n + \" times\";\n      }\n      document.querySelector(\"#add\").addEventListener(\"click\", () => {\n        clicks = clicks + 1;\n        show(clicks);\n      });\n    </script>\n  </body>\n</html>\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [2] }, { name: "not committed", files: {"playground/js/counter.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Counter</title>\n  </head>\n  <body>\n    <p id=\"count\">Clicked 0 times</p>\n    <button id=\"add\">Add one</button>\n    <button id=\"reset\">Reset</button>\n    <script>\n      const count = document.querySelector(\"#count\");\n      let clicks = 0;\n      function show(n) {\n        count.textContent = \"Clicked \" + n + \" times\";\n      }\n      document.querySelector(\"#add\").addEventListener(\"click\", () => {\n        clicks = clicks + 1;\n        show(clicks);\n      });\n      document.querySelector(\"#reset\").addEventListener(\"click\", () => {\n        clicks = 0;\n        show(0);\n      });\n    </script>\n  </body>\n</html>\n"}, fails: [3] }] },
  'spreadsheet-build/03-05-typing-into-cells#The input': {
    wrong: [{ name: 'no input', fails: [0] }],
  },
  'spreadsheet-build/03-05-typing-into-cells#Style the toolbar': {
    wrong: [
      { name: 'no new styles', fails: [0, 1] },
      { name: 'forgot display: flex', edit: [['  display: flex;\n  gap: 8px;\n', '  gap: 8px;\n']], fails: [1] },
    ],
  },
  'spreadsheet-build/03-05-typing-into-cells#Keyboard events': {
    wrong: [
      { name: 'never focuses the formula bar', edit: [['  formulaBar.focus();\n', '']], fails: [0] },
      { name: 'Enter writes the cell but does not move down', edit: [['    if (selectedRow + 1 < rows) {\n      select(selectedColumn, selectedRow + 1);\n    }\n', '']], fails: [1] },
      { name: 'no check for the last row', edit: [['    if (selectedRow + 1 < rows) {\n      select(selectedColumn, selectedRow + 1);\n    }\n', '    select(selectedColumn, selectedRow + 1);\n']], fails: [4] },
      { name: 'every key writes the cell', edit: [['  if (event.key === "Enter") {', '  {']], fails: [2] },
      { name: 'select does not show the cell in the bar', edit: [['  formulaBar.value = selected.textContent;\n', '']], fails: [3] },
      { name: '== "enter" (wrong case)', edit: [['event.key === "Enter"', 'event.key === "enter"']], fails: [1, 4] },
    ],
  },
  "spreadsheet-build/03-05-typing-into-cells#An experiment: text that tries to be HTML": { editFiles: { "playground/js/xss.html": [["      // document.querySelector(\"#as-html\").innerHTML = typed;", "      document.querySelector(\"#as-html\").innerHTML = typed;"]] }, wrong: [{ name: "cells written with innerHTML", editFiles: { "grid.js": [["selected.textContent = formulaBar.value;", "selected.innerHTML = formulaBar.value;"]] }, fails: [0] }] },
  "spreadsheet-build/03-05-typing-into-cells#Commit": { editFiles: { "playground/js/xss.html": [["      document.querySelector(\"#as-html\").innerHTML = typed;", "      // document.querySelector(\"#as-html\").innerHTML = typed;"]] }, run: ["git add playground", "git commit -am \"Type into cells through the formula bar\""], wrong: [{ name: "committed without the new lab file", editFiles: { "playground/js/xss.html": [["      document.querySelector(\"#as-html\").innerHTML = typed;", "      // document.querySelector(\"#as-html\").innerHTML = typed;"]] }, run: ["git commit -am \"Type into cells\""], fails: [0] }] },

  "spreadsheet-build/03-05-typing-into-cells#Your turn: a live preview, safely": { files: {"playground/js/preview.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Preview</title>\n  </head>\n  <body>\n    <input id=\"source\" autocomplete=\"off\">\n    <p id=\"preview\"></p>\n    <script>\n      const source = document.querySelector(\"#source\");\n      const preview = document.querySelector(\"#preview\");\n      source.addEventListener(\"input\", () => {\n        preview.textContent = source.value;\n      });\n    </script>\n  </body>\n</html>\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], wrong: [{ name: "innerHTML: the XSS from the experiment", files: {"playground/js/preview.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Preview</title>\n  </head>\n  <body>\n    <input id=\"source\" autocomplete=\"off\">\n    <p id=\"preview\"></p>\n    <script>\n      const source = document.querySelector(\"#source\");\n      const preview = document.querySelector(\"#preview\");\n      source.addEventListener(\"input\", () => {\n        preview.innerHTML = source.value;\n      });\n    </script>\n  </body>\n</html>\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [1] }, { name: "listens for keydown, which the paste or the check never sends", files: {"playground/js/preview.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Preview</title>\n  </head>\n  <body>\n    <input id=\"source\" autocomplete=\"off\">\n    <p id=\"preview\"></p>\n    <script>\n      const source = document.querySelector(\"#source\");\n      const preview = document.querySelector(\"#preview\");\n      source.addEventListener(\"keydown\", () => {\n        preview.textContent = source.value;\n      });\n    </script>\n  </body>\n</html>\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [0, 1] }, { name: "not committed", files: {"playground/js/preview.html": "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Preview</title>\n  </head>\n  <body>\n    <input id=\"source\" autocomplete=\"off\">\n    <p id=\"preview\"></p>\n    <script>\n      const source = document.querySelector(\"#source\");\n      const preview = document.querySelector(\"#preview\");\n      source.addEventListener(\"input\", () => {\n        preview.textContent = source.value;\n      });\n    </script>\n  </body>\n</html>\n"}, fails: [2] }] },
  // ── 3.6 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/03-06-columns-past-z#Your turn: columns past Z': {
    editFiles: {
      'grid.js': [
        ['const columns = 26;', 'const columns = 30;'],
        ['function columnName(index) {\n  return String.fromCharCode(65 + index);\n}', 'function columnName(index) {\n  let name = "";\n  while (index >= 0) {\n    name = String.fromCharCode(65 + (index % 26)) + name;\n    index = Math.floor(index / 26) - 1;\n  }\n  return name;\n}'],
      ],
    },
    wrong: [
      { name: "hangs on -1: stops only at exactly -1", editFiles: { "grid.js": [["const columns = 26;", "const columns = 30;"], ["function columnName(index) {\n  return String.fromCharCode(65 + index);\n}", "function columnName(index) {\n  let name = \"\";\n  do {\n    name = String.fromCharCode(65 + (index % 26)) + name;\n    index = Math.floor(index / 26) - 1;\n  } while (index !== -1);\n  return name;\n}"]] }, fails: [9] },
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
  'spreadsheet-build/04-01-modules#A branch': {
    run: ['git switch -c modules-and-vite'],
    wrong: [{ name: 'stayed on main', fails: [0] }],
  },
  'spreadsheet-build/04-01-modules#columns.js': {
    wrong: [{ name: 'no export', edit: [['export function', 'function']], fails: [0] }],
  },
  'spreadsheet-build/04-01-modules#Import it in grid.js': {
    wrong: [
      { name: 'import without ./', edit: [['from "./columns.js"', 'from "columns.js"']], fails: [0] },
      { name: 'kept a copy of columnName in grid.js', edit: [['const columns = 26;', 'function columnName(index) {\n  return String.fromCharCode(65 + index);\n}\n\nconst columns = 26;']], fails: [1] },
    ],
  },
  "spreadsheet-build/04-01-modules#Tell the browser it's a module": {
    wrong: [{ name: 'no type="module"', edit: [['<script type="module" src="grid.js">', '<script src="grid.js">']], fails: [0] }],
  },
  'spreadsheet-build/04-01-modules#The wall': {
    wrong: [
      { name: 'imports a file that does not exist', editFiles: { 'grid.js': [['"./columns.js"', '"./column.js"']] }, fails: [0] },
      { name: 'columns.js forgets export', editFiles: { 'columns.js': [['export function', 'function']] }, fails: [0, 1] },
      { name: 'script tag without type="module"', editFiles: { 'index.html': [['<script type="module" src="grid.js">', '<script src="grid.js">']] }, fails: [0] },
    ],
  },
  "spreadsheet-build/04-01-modules#Commit, even though it's broken": {
    run: ['git add columns.js', 'git commit -am "Move columnName into its own module"'],
    wrong: [{ name: 'commit -a without adding columns.js', run: ['git commit -am "Move columnName"'], fails: [0, 1] }],
  },

  // ── 4.2 ──────────────────────────────────────────────────────────────────
  "spreadsheet-build/04-01-modules#Your turn: a module of your own": { files: {"playground/js/stats.mjs": "export function sum(numbers) {\n  let total = 0;\n  for (let i = 0; i < numbers.length; i++) {\n    total = total + numbers[i];\n  }\n  return total;\n}\n\nexport function average(numbers) {\n  return sum(numbers) / numbers.length;\n}\n", "playground/js/report.mjs": "import { average, sum } from \"./stats.mjs\";\n\nconst numbers = [1, 2, 3, 4];\nconsole.log(\"sum \" + sum(numbers) + \", average \" + average(numbers));\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], wrong: [{ name: "average not exported", files: {"playground/js/stats.mjs": "export function sum(numbers) {\n  let total = 0;\n  for (let i = 0; i < numbers.length; i++) {\n    total = total + numbers[i];\n  }\n  return total;\n}\n\nfunction average(numbers) {\n  return sum(numbers) / numbers.length;\n}\n", "playground/js/report.mjs": "import { average, sum } from \"./stats.mjs\";\n\nconst numbers = [1, 2, 3, 4];\nconsole.log(\"sum \" + sum(numbers) + \", average \" + average(numbers));\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [0, 1] }, { name: "report.mjs works it out itself, without the module", files: {"playground/js/stats.mjs": "export function sum(numbers) {\n  let total = 0;\n  for (let i = 0; i < numbers.length; i++) {\n    total = total + numbers[i];\n  }\n  return total;\n}\n\nexport function average(numbers) {\n  return sum(numbers) / numbers.length;\n}\n", "playground/js/report.mjs": "console.log(\"sum 10, average 2.5\");\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [2] }, { name: "not committed", files: {"playground/js/stats.mjs": "export function sum(numbers) {\n  let total = 0;\n  for (let i = 0; i < numbers.length; i++) {\n    total = total + numbers[i];\n  }\n  return total;\n}\n\nexport function average(numbers) {\n  return sum(numbers) / numbers.length;\n}\n", "playground/js/report.mjs": "import { average, sum } from \"./stats.mjs\";\n\nconst numbers = [1, 2, 3, 4];\nconsole.log(\"sum \" + sum(numbers) + \", average \" + average(numbers));\n"}, fails: [3] }] },
  'spreadsheet-build/04-02-npm#package.json': {
    run: ['npm init -y'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  'spreadsheet-build/04-02-npm#Install Vite': {
    run: ['npm install --save-dev vite'],
    wrong: [{ name: 'did nothing', fails: [0, 1, 2] }],
  },
  'spreadsheet-build/04-02-npm#Keep node_modules out of Git': {
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'replaced .gitignore, losing .env', files: { '.gitignore': '*.log\nnode_modules\n' }, fails: [1] },
    ],
  },
  'spreadsheet-build/04-02-npm#Fix package.json': {
    wrong: [
      { name: "kept npm's guesses", fails: [0, 1, 2] },
      { name: 'type module but no scripts', edit: [['  "scripts": {\n    "dev": "vite",\n    "build": "vite build",\n    "preview": "vite preview"\n  },\n', '']], fails: [1, 2] },
    ],
  },
  "spreadsheet-build/04-02-npm#An experiment: throw node_modules away": { run: ["Remove-Item -Recurse -Force node_modules", "npm install"], wrong: [{ name: "deleted it but never reinstalled", run: ["Remove-Item -Recurse -Force node_modules"], fails: [0, 1] }] },
  'spreadsheet-build/04-02-npm#Commit': {
    run: ['git add package.json package-lock.json .gitignore', 'git commit -m "Install Vite with npm"'],
    wrong: [{ name: 'commit -a only (new files left out)', run: ['git commit -am "Install Vite"'], fails: [0, 1, 3] }],
  },

  // ── 4.3 ──────────────────────────────────────────────────────────────────
  "spreadsheet-build/04-02-npm#Your turn: a package of your own choosing to install": { files: {"playground/npm-lab/index.mjs": "import pc from \"picocolors\";\n\nconsole.log(pc.green(\"npm lab works\"));\n"}, run: ["New-Item -ItemType Directory -Force playground/npm-lab | Out-Null; Set-Location playground/npm-lab; npm init -y | Out-Null; npm install picocolors@1.1.1", "git add playground", "git commit -m \"Practise in the playground\""], wrong: [{ name: "installed as a dev dependency", files: {"playground/npm-lab/index.mjs": "import pc from \"picocolors\";\n\nconsole.log(pc.green(\"npm lab works\"));\n"}, run: ["New-Item -ItemType Directory -Force playground/npm-lab | Out-Null; Set-Location playground/npm-lab; npm init -y | Out-Null; npm install --save-dev picocolors@1.1.1", "git add playground", "git commit -m \"Practise in the playground\""], fails: [1] }, { name: "not committed", files: {"playground/npm-lab/index.mjs": "import pc from \"picocolors\";\n\nconsole.log(pc.green(\"npm lab works\"));\n"}, run: ["New-Item -ItemType Directory -Force playground/npm-lab | Out-Null; Set-Location playground/npm-lab; npm init -y | Out-Null; npm install picocolors@1.1.1"], fails: [4, 5] }] },
  'spreadsheet-build/04-03-dev-server#Start Vite': {
    wrong: [{ name: 'node_modules deleted', run: ['Remove-Item node_modules -Recurse -Force'], fails: [0, 1] }],
  },

  // ── 4.4 ──────────────────────────────────────────────────────────────────
  "spreadsheet-build/04-03-dev-server#Your turn: your portfolio, served": { editFiles: { "playground/site/style.css": [["--space-5: 3rem;", "--space-5: 3.5rem;"]] }, run: ["git commit -am \"Give the portfolio more room\""], wrong: [{ name: "changed but not committed", editFiles: { "playground/site/style.css": [["--space-5: 3rem;", "--space-5: 3.5rem;"]] }, fails: [1, 2] }] },
  'spreadsheet-build/04-04-build#Build': {
    run: ['npm run build'],
    wrong: [{ name: 'a syntax error the build stops on', editFiles: { 'grid.js': [['const rows = 100;', 'const rows = ;']] }, fails: [0, 1] }],
  },
  'spreadsheet-build/04-04-build#Keep dist out of Git': {
    wrong: [
      { name: 'did nothing', fails: [0] },
      { name: 'replaced .gitignore with just dist', files: { '.gitignore': '.env\n*.log\ndist\n' }, fails: [1] },
    ],
  },
  "spreadsheet-build/04-04-build#Your turn: a build that works in a subfolder": { files: {"vite.config.js": "export default {\n  base: \"./\",\n};\n"}, run: ["npm run build", "git add vite.config.js", "git commit -am \"Build relative to the page\""], wrong: [{ name: "a config without base", files: {"vite.config.js": "export default {};\n"}, run: ["npm run build", "git add vite.config.js", "git commit -am \"Config\""], fails: [2] }, { name: "not committed", files: {"vite.config.js": "export default {\n  base: \"./\",\n};\n"}, run: ["npm run build"], fails: [3, 4] }] },
  'spreadsheet-build/04-04-build#Merge the sprint and push': {
    run: ['git switch main', 'git merge modules-and-vite', 'git push', 'git branch -d modules-and-vite'],
    wrong: [
      { name: 'merged but did not push', run: ['git switch main', 'git merge modules-and-vite', 'git branch -d modules-and-vite'], fails: [3] },
      { name: 'did not merge', fails: [0, 1] },
    ],
  },

  "spreadsheet-build/04-05-challenge-publish-it#Your turn: publish it": { run: ["npm run build", "npx --yes gh-pages@6.3.0 -d dist"], wrong: [{ name: "did nothing", fails: [0, 1] }, { name: "committed the build to main instead", run: ["npm run build", "git add -f dist", "git commit -m \"Publish\""], fails: [6] }, { name: "published the source files instead of the build", run: ["npm run build", "npx --yes gh-pages@6.3.0 -d . --src \"{index.html,grid.js,columns.js,style.css}\""], fails: [1, 2] }] },
  "spreadsheet-build/04-06-solution-publish-it#What gh-pages does": { run: ["git fetch origin gh-pages"] },
  "spreadsheet-build/04-06-solution-publish-it#Your turn: publish a change": { editFiles: { "style.css": [["--header-bg: #f3f4f6;", "--header-bg: #eef2f7;"]] }, run: ["git commit -am \"Use a cooler grey for the headers\"", "git push", "npm run build", "npx --yes gh-pages@6.3.0 -d dist"], wrong: [{ name: "republished without building again", editFiles: { "style.css": [["--header-bg: #f3f4f6;", "--header-bg: #eef2f7;"]] }, run: ["git commit -am \"Cooler grey\"", "npx --yes gh-pages@6.3.0 -d dist"], fails: [0, 2] }] },
  // ── 5.1 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/05-01-typescript#A branch': {
    run: ['git switch -c typescript'],
    wrong: [{ name: 'stayed on main', fails: [0] }],
  },
  'spreadsheet-build/05-01-typescript#Install TypeScript': {
    run: ['npm install --save-dev typescript'],
    wrong: [{ name: 'did nothing', fails: [0, 1] }],
  },
  'spreadsheet-build/05-01-typescript#tsconfig.json': {
    wrong: [
      { name: 'not strict', edit: [['    "strict": true,\n', '']], fails: [0] },
      { name: 'without noUncheckedIndexedAccess', edit: [['    "noUncheckedIndexedAccess": true,\n', '']], fails: [1] },
      { name: 'without noEmit', edit: [['    "noEmit": true,\n', '']], fails: [2] },
    ],
  },
  'spreadsheet-build/05-01-typescript#Rename the files to .ts': {
    before: ['git mv columns.js columns.ts', 'git mv grid.js grid.ts'],
    wrong: [
      { name: 'copied instead of renaming, import unchanged', run: ['Copy-Item grid.js grid.ts', 'Copy-Item columns.js columns.ts'], fails: [2, 3] },
    ],
  },
  'spreadsheet-build/05-01-typescript#Point the page at grid.ts': {
    // Measured: Vite answers a request for grid.js with grid.ts when there's no grid.js, so the
    // page still works; only the text check catches it. The lesson says so.
    wrong: [{ name: 'still loads grid.js', edit: [['src="grid.ts"', 'src="grid.js"']], fails: [0] }],
  },
  'spreadsheet-build/05-01-typescript#Commit the conversion': {
    run: ['git add tsconfig.json', 'git commit -am "Convert to TypeScript (24 type errors to fix)"'],
    wrong: [{ name: 'commit -a without adding tsconfig.json', run: ['git commit -am "Convert to TypeScript"'], fails: [0, 3] }],
  },

  // ── 5.2 ──────────────────────────────────────────────────────────────────
  "spreadsheet-build/05-01-typescript#Your turn: types in the playground": { files: {"playground/ts/area.ts": "function area(width: number, height: number): number {\n  return width * height;\n}\n\nconsole.log(area(3, 4));\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], wrong: [{ name: "no types", files: {"playground/ts/area.ts": "function area(width, height) {\n  return width * height;\n}\n\nconsole.log(area(3, 4));\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [1] }, { name: "the mistake left in", files: {"playground/ts/area.ts": "function area(width: number, height: number): number {\n  return width * height;\n}\n\nconsole.log(area(3, 4));\narea(\"3\", 4);\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [1] }, { name: "not committed", files: {"playground/ts/area.ts": "function area(width: number, height: number): number {\n  return width * height;\n}\n\nconsole.log(area(3, 4));\n"}, fails: [2] }] },
  'spreadsheet-build/05-02-fixing-type-errors#Say what columnName takes and gives': {
    wrong: [
      { name: 'no return type', edit: [['): string {', ') {']], fails: [1] },
      { name: 'index: any', edit: [['index: number', 'index: any']], fails: [0] },
    ],
  },
  'spreadsheet-build/05-02-fixing-type-errors#Zero errors': {
    wrong: [
      { name: 'left out the ?. on the row', editFiles: { 'grid.ts': [['body.rows[row]?.cells', 'body.rows[row].cells']] }, fails: [0] },
      { name: 'textContent given a number', editFiles: { 'grid.ts': [['String(r + 1)', 'r + 1']] }, fails: [0] },
      { name: 'type-checks, but forgot the + 1 for the row-number column', editFiles: { 'grid.ts': [['cells[column + 1]', 'cells[column]']] }, fails: [2] },
    ],
  },
  "spreadsheet-build/05-02-fixing-type-errors#Your turn: a parser that can say \"no\"": { files: {"playground/ts/parse.ts": "function parseNumber(text: string): number | null {\n  if (text.trim() === \"\") {\n    return null;\n  }\n  const value = Number(text);\n  if (Number.isNaN(value)) {\n    return null;\n  }\n  return value;\n}\n\nconsole.log(JSON.stringify([parseNumber(\"3.5\"), parseNumber(\"abc\"), parseNumber(\"\"), parseNumber(\" 7 \")]));\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], wrong: [{ name: "empty text read as 0", files: {"playground/ts/parse.ts": "function parseNumber(text: string): number | null {\n  const value = Number(text);\n  if (Number.isNaN(value)) {\n    return null;\n  }\n  return value;\n}\n\nconsole.log(JSON.stringify([parseNumber(\"3.5\"), parseNumber(\"abc\"), parseNumber(\"\"), parseNumber(\" 7 \")]));\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [0] }, { name: "no return type, NaN returned", files: {"playground/ts/parse.ts": "function parseNumber(text) {\n  return Number(text);\n}\n\nconsole.log(JSON.stringify([parseNumber(\"3.5\"), parseNumber(\"abc\"), parseNumber(\"\"), parseNumber(\" 7 \")]));\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [0, 1] }, { name: "not committed", files: {"playground/ts/parse.ts": "function parseNumber(text: string): number | null {\n  if (text.trim() === \"\") {\n    return null;\n  }\n  const value = Number(text);\n  if (Number.isNaN(value)) {\n    return null;\n  }\n  return value;\n}\n\nconsole.log(JSON.stringify([parseNumber(\"3.5\"), parseNumber(\"abc\"), parseNumber(\"\"), parseNumber(\" 7 \")]));\n"}, fails: [2] }] },
  'spreadsheet-build/05-02-fixing-type-errors#Commit': {
    run: ['git commit -am "Fix the type errors"'],
    wrong: [{ name: 'did not commit', editFiles: { 'grid.ts': [['const rows = 100;', 'const rows = 100; // uncommitted']] }, fails: [0] }],
  },

  // ── 5.3 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/05-03-types-in-the-workflow#A check script, and a build that checks first': {
    wrong: [
      { name: 'build without tsc', edit: [['"build": "tsc && vite build"', '"build": "vite build"']], fails: [1] },
      { name: 'no check script', edit: [['    "check": "tsc",\n', '']], fails: [0] },
    ],
  },
  'spreadsheet-build/05-03-types-in-the-workflow#What it catches': {
    wrong: [{ name: 'left the typo in', editFiles: { 'grid.ts': [['r < rows; r++', 'r < rws; r++']] }, fails: [0] }],
  },
  "spreadsheet-build/05-03-types-in-the-workflow#What it doesn't catch": {
    wrong: [{ name: 'left the arguments swapped (still type-checks)', editFiles: { 'grid.ts': [['() => select(c, r)', '() => select(r, c)']] }, fails: [0] }],
  },
  'spreadsheet-build/05-03-types-in-the-workflow#Merge the sprint and push': {
    run: ['git commit -am "Type-check before every build"', 'git switch main', 'git merge typescript', 'git push', 'git branch -d typescript'],
    wrong: [
      { name: 'merged but did not push', run: ['git commit -am "Type-check"', 'git switch main', 'git merge typescript', 'git branch -d typescript'], fails: [3] },
      { name: 'did not merge', run: ['git commit -am "Type-check"'], fails: [0, 1] },
    ],
  },

  "spreadsheet-build/05-03-types-in-the-workflow#Your turn: make the swap impossible to miss": { files: {"playground/ts/swap.ts": "function cellName(cell: { column: number; row: number }): string {\n  return String.fromCharCode(65 + cell.column) + (cell.row + 1);\n}\n\nconst row = 2;\nconst column = 1;\nconsole.log(cellName({ column, row }));\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], wrong: [{ name: "swapped the call back, still two numbers", files: {"playground/ts/swap.ts": "function cellName(column: number, row: number): string {\n  return String.fromCharCode(65 + column) + (row + 1);\n}\n\nconst row = 2;\nconst column = 1;\nconsole.log(cellName(column, row));\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [2] }, { name: "an object, but the parts read the wrong way round", files: {"playground/ts/swap.ts": "function cellName(cell: { column: number; row: number }): string {\n  return String.fromCharCode(65 + cell.row) + (cell.column + 1);\n}\n\nconst row = 2;\nconst column = 1;\nconsole.log(cellName({ column, row }));\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [0] }, { name: "not committed", files: {"playground/ts/swap.ts": "function cellName(cell: { column: number; row: number }): string {\n  return String.fromCharCode(65 + cell.column) + (cell.row + 1);\n}\n\nconst row = 2;\nconst column = 1;\nconsole.log(cellName({ column, row }));\n"}, fails: [3] }] },
  "spreadsheet-build/05-04-challenge-types-for-a-colleagues-code#Your turn: make it right": { files: {"playground/ts/invoice.ts": "type Line = { name: string; price: number; quantity: number };\n\nexport function parseQuantity(text: string): number | null {\n  if (text.trim() === \"\") {\n    return null;\n  }\n  const value = Number(text);\n  if (!Number.isInteger(value) || value < 1) {\n    return null;\n  }\n  return value;\n}\n\nexport function lineTotal(line: Line): number {\n  return line.price * line.quantity;\n}\n\nexport function invoiceTotal(lines: Line[]): number {\n  let total = 0;\n  for (let i = 0; i < lines.length; i++) {\n    total = total + lineTotal(lines[i]);\n  }\n  return total;\n}\n\nexport function describe(line: Line): string {\n  return line.quantity + \" x \" + line.name + \" at \" + line.price;\n}\n"}, run: ["git add playground", "git commit -m \"Type the invoice module and fix it\"", "git push"], wrong: [{ name: "typed, but the total still adds prices", files: {"playground/ts/invoice.ts": "type Line = { name: string; price: number; quantity: number };\n\nexport function parseQuantity(text: string): number | null {\n  if (text.trim() === \"\") {\n    return null;\n  }\n  const value = Number(text);\n  if (!Number.isInteger(value) || value < 1) {\n    return null;\n  }\n  return value;\n}\n\nexport function lineTotal(line: Line): number {\n  return line.price * line.quantity;\n}\n\nexport function invoiceTotal(lines: Line[]): number {\n  let total = 0;\n  for (let i = 0; i < lines.length; i++) {\n    total = total + lines[i].price;\n  }\n  return total;\n}\n\nexport function describe(line: Line): string {\n  return line.quantity + \" x \" + line.name + \" at \" + line.price;\n}\n"}, run: ["git add playground", "git commit -m \"Type the invoice module and fix it\""], fails: [2] }, { name: "negative quantities accepted", files: {"playground/ts/invoice.ts": "type Line = { name: string; price: number; quantity: number };\n\nexport function parseQuantity(text: string): number | null {\n  if (text.trim() === \"\") {\n    return null;\n  }\n  const value = Number(text);\n  if (!Number.isInteger(value)) {\n    return null;\n  }\n  return value;\n}\n\nexport function lineTotal(line: Line): number {\n  return line.price * line.quantity;\n}\n\nexport function invoiceTotal(lines: Line[]): number {\n  let total = 0;\n  for (let i = 0; i < lines.length; i++) {\n    total = total + lineTotal(lines[i]);\n  }\n  return total;\n}\n\nexport function describe(line: Line): string {\n  return line.quantity + \" x \" + line.name + \" at \" + line.price;\n}\n"}, run: ["git add playground", "git commit -m \"Type the invoice module and fix it\""], fails: [3] }, { name: "blank text and 0 accepted", files: {"playground/ts/invoice.ts": "type Line = { name: string; price: number; quantity: number };\n\nexport function parseQuantity(text: string): number | null {\n  const value = Number(text);\n  if (!Number.isInteger(value) || value < 0) {\n    return null;\n  }\n  return value;\n}\n\nexport function lineTotal(line: Line): number {\n  return line.price * line.quantity;\n}\n\nexport function invoiceTotal(lines: Line[]): number {\n  let total = 0;\n  for (let i = 0; i < lines.length; i++) {\n    total = total + lineTotal(lines[i]);\n  }\n  return total;\n}\n\nexport function describe(line: Line): string {\n  return line.quantity + \" x \" + line.name + \" at \" + line.price;\n}\n"}, run: ["git add playground", "git commit -m \"Type the invoice module and fix it\""], fails: [3] }, { name: "any to silence the checker", files: {"playground/ts/invoice.ts": "type Line = { name: string; price: number; quantity: number };\n\nexport function parseQuantity(text: string): number | null {\n  if (text.trim() === \"\") {\n    return null;\n  }\n  const value = Number(text);\n  if (!Number.isInteger(value) || value < 1) {\n    return null;\n  }\n  return value;\n}\n\nexport function lineTotal(line: Line): number {\n  return line.price * line.quantity;\n}\n\nexport function invoiceTotal(lines: Line[]): number {\n  let total = 0;\n  for (let i = 0; i < lines.length; i++) {\n    total = total + lineTotal(lines[i]);\n  }\n  return total;\n}\n\nexport function describe(line: any): string {\n  return line.qty + \" x \" + line.name + \" at \" + line.price;\n}\n"}, run: ["git add playground", "git commit -m \"Type the invoice module and fix it\""], fails: [1, 4] }, { name: "untyped, as supplied", run: ["git add playground", "git commit -m \"Type the invoice module and fix it\""], fails: [0, 2, 3] }, { name: "fixed but not pushed", files: {"playground/ts/invoice.ts": "type Line = { name: string; price: number; quantity: number };\n\nexport function parseQuantity(text: string): number | null {\n  if (text.trim() === \"\") {\n    return null;\n  }\n  const value = Number(text);\n  if (!Number.isInteger(value) || value < 1) {\n    return null;\n  }\n  return value;\n}\n\nexport function lineTotal(line: Line): number {\n  return line.price * line.quantity;\n}\n\nexport function invoiceTotal(lines: Line[]): number {\n  let total = 0;\n  for (let i = 0; i < lines.length; i++) {\n    total = total + lineTotal(lines[i]);\n  }\n  return total;\n}\n\nexport function describe(line: Line): string {\n  return line.quantity + \" x \" + line.name + \" at \" + line.price;\n}\n"}, run: ["git add playground", "git commit -m \"Type the invoice module and fix it\""], fails: [6] }] },
  "spreadsheet-build/05-05-solution-types-for-a-colleagues-code#Your turn: an optional discount": { files: {"playground/ts/invoice.ts": "type Line = { name: string; price: number; quantity: number; discount?: number };\n\nexport function parseQuantity(text: string): number | null {\n  if (text.trim() === \"\") {\n    return null;\n  }\n  const value = Number(text);\n  if (!Number.isInteger(value) || value < 1) {\n    return null;\n  }\n  return value;\n}\n\nexport function lineTotal(line: Line): number {\n  return (line.price * line.quantity * (100 - (line.discount ?? 0))) / 100;\n}\n\nexport function invoiceTotal(lines: Line[]): number {\n  let total = 0;\n  for (let i = 0; i < lines.length; i++) {\n    total = total + lineTotal(lines[i]);\n  }\n  return total;\n}\n\nexport function describe(line: Line): string {\n  return line.quantity + \" x \" + line.name + \" at \" + line.price;\n}\n"}, run: ["git add playground", "git commit -m \"An optional discount\"", "git push"], wrong: [{ name: "discount added to the type but never used", files: {"playground/ts/invoice.ts": "type Line = { name: string; price: number; quantity: number; discount?: number };\n\nexport function parseQuantity(text: string): number | null {\n  if (text.trim() === \"\") {\n    return null;\n  }\n  const value = Number(text);\n  if (!Number.isInteger(value) || value < 1) {\n    return null;\n  }\n  return value;\n}\n\nexport function lineTotal(line: Line): number {\n  return line.price * line.quantity;\n}\n\nexport function invoiceTotal(lines: Line[]): number {\n  let total = 0;\n  for (let i = 0; i < lines.length; i++) {\n    total = total + lineTotal(lines[i]);\n  }\n  return total;\n}\n\nexport function describe(line: Line): string {\n  return line.quantity + \" x \" + line.name + \" at \" + line.price;\n}\n"}, run: ["git add playground", "git commit -m \"Discount\""], fails: [0] }, { name: "used but not in the type", files: {"playground/ts/invoice.ts": "type Line = { name: string; price: number; quantity: number };\n\nexport function parseQuantity(text: string): number | null {\n  if (text.trim() === \"\") {\n    return null;\n  }\n  const value = Number(text);\n  if (!Number.isInteger(value) || value < 1) {\n    return null;\n  }\n  return value;\n}\n\nexport function lineTotal(line: Line): number {\n  return (line.price * line.quantity * (100 - (line.discount ?? 0))) / 100;\n}\n\nexport function invoiceTotal(lines: Line[]): number {\n  let total = 0;\n  for (let i = 0; i < lines.length; i++) {\n    total = total + lineTotal(lines[i]);\n  }\n  return total;\n}\n\nexport function describe(line: Line): string {\n  return line.quantity + \" x \" + line.name + \" at \" + line.price;\n}\n"}, run: ["git add playground", "git commit -m \"Discount\""], fails: [2] }] },
  // ── 6.1 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/06-01-first-test#A branch': {
    run: ['git switch -c tests-and-model'],
    wrong: [{ name: 'stayed on main', fails: [0] }],
  },
  'spreadsheet-build/06-01-first-test#Install Vitest': {
    run: ['npm install --save-dev vitest'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  'spreadsheet-build/06-01-first-test#Run it': {
    wrong: [
      // The file is typed in the step before ("A test file"); these change it afterwards.
      { name: 'no test file', run: ['Remove-Item columns.test.ts'], fails: [0, 1] },
      { name: 'a test that expects the wrong answer', files: { 'columns.test.ts': 'import { expect, it } from "vitest";\nimport { columnName } from "./columns.ts";\n\nit("names column 26", () => {\n  expect(columnName(26)).toBe("BA");\n});\n' }, fails: [1] },
      { name: 'test file named columns.tests.ts (Vitest never finds it)', run: ['Rename-Item columns.test.ts columns.tests.ts'], fails: [0, 1] },
    ],
  },
  'spreadsheet-build/06-01-first-test#A test should be able to fail': {
    wrong: [
      {
        name: 'left columnName broken',
        editFiles: { 'columns.ts': [['  while (index >= 0) {\n    name = String.fromCharCode(65 + (index % 26)) + name;\n    index = Math.floor(index / 26) - 1;\n  }', '  do {\n    name = String.fromCharCode(65 + (index % 26)) + name;\n    index = Math.floor(index / 26);\n  } while (index > 0);']] },
        fails: [0],
      },
    ],
  },
  'spreadsheet-build/06-01-first-test#npm test': {
    wrong: [{ name: 'no test script', edit: [['    "test": "vitest run",\n', '']], fails: [0, 1] }],
  },
  'spreadsheet-build/06-01-first-test#Commit': {
    run: ['git add columns.test.ts', 'git commit -am "Test columnName"'],
    wrong: [{ name: 'commit -a without adding the test file', run: ['git commit -am "Test columnName"'], fails: [0, 1] }],
  },

  // ── 6.2 ──────────────────────────────────────────────────────────────────
  "spreadsheet-build/06-01-first-test#Your turn: tests for your own module": { files: {"playground/js/stats.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { average, sum } from \"./stats.mjs\";\n\ntest(\"sums 1, 2 and 3\", () => {\n  assert.equal(sum([1, 2, 3]), 6);\n});\n\ntest(\"sums an empty array to 0\", () => {\n  assert.equal(sum([]), 0);\n});\n\ntest(\"averages 2 and 4\", () => {\n  assert.equal(average([2, 4]), 3);\n});\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], wrong: [{ name: "tests that only check the functions exist", files: {"playground/js/stats.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { average, sum } from \"./stats.mjs\";\n\ntest(\"has sum and average\", () => {\n  assert.equal(typeof sum, \"function\");\n  assert.equal(typeof average, \"function\");\n});\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [1, 2] }, { name: "no test for the empty array", files: {"playground/js/stats.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { average, sum } from \"./stats.mjs\";\n\ntest(\"sums 1, 2 and 3\", () => {\n  assert.equal(sum([1, 2, 3]), 6);\n});\n\ntest(\"averages 2 and 4\", () => {\n  assert.equal(average([2, 4]), 3);\n});\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [2] }, { name: "not committed", files: {"playground/js/stats.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { average, sum } from \"./stats.mjs\";\n\ntest(\"sums 1, 2 and 3\", () => {\n  assert.equal(sum([1, 2, 3]), 6);\n});\n\ntest(\"sums an empty array to 0\", () => {\n  assert.equal(sum([]), 0);\n});\n\ntest(\"averages 2 and 4\", () => {\n  assert.equal(average([2, 4]), 3);\n});\n"}, fails: [3] }] },
  'spreadsheet-build/06-02-test-first#Red: a test for code that doesn\'t exist': {
    wrong: [
      { name: 'wrote columnIndex before the test went red', editFiles: { 'columns.ts': [['  return name;\n}\n', '  return name;\n}\n\nexport function columnIndex(name: string): number {\n  return name.charCodeAt(0) - 65;\n}\n']] }, typeFile: true, fails: [0] },
    ],
  },
  'spreadsheet-build/06-02-test-first#Green: the simplest thing that passes': {
    wrong: [
      { name: 'off by one (A is 1)', edit: [['- 65;', '- 64;']], fails: [0] },
      { name: 'not exported', edit: [['export function columnIndex', 'function columnIndex']], fails: [0] },
    ],
  },
  'spreadsheet-build/06-02-test-first#Green: letters as digits': {
    wrong: [
      { name: 'forgot the final - 1', edit: [['  return index - 1;\n}', '  return index;\n}']], fails: [0] },
      // Reading right to left can't be caught here: A, Z and AA read the same both ways. The
      // next step's round-trip test catches it; that's the point of writing it.
    ],
  },
  'spreadsheet-build/06-02-test-first#Refactor the tests: check every column': {
    wrong: [
      { name: 'letters read right to left (passes the earlier tests)', editFiles: { 'columns.ts': [['for (const letter of name)', 'for (const letter of [...name].reverse())']] }, typeFile: true, fails: [0, 1] },
      { name: 'columnIndex wrong past two letters', editFiles: { 'columns.ts': [['  let index = 0;\n  for (const letter of name) {\n    index = index * 26 + (letter.charCodeAt(0) - 64);\n  }\n  return index - 1;', '  if (name.length === 1) {\n    return name.charCodeAt(0) - 65;\n  }\n  return (name.charCodeAt(0) - 64) * 26 + (name.charCodeAt(1) - 65);']] }, fails: [0, 1] },
    ],
  },
  'spreadsheet-build/06-02-test-first#Commit': {
    run: ['git commit -am "Add columnIndex, test first"'],
    wrong: [{ name: 'did not commit', fails: [0] }],
  },

  // ── 6.3 ──────────────────────────────────────────────────────────────────
  "spreadsheet-build/06-02-test-first#Your turn: test first, on your own": { files: {"playground/js/words.mjs": "export function wordCount(text) {\n  const trimmed = text.trim();\n  if (trimmed === \"\") {\n    return 0;\n  }\n  return trimmed.split(/ +/).length;\n}\n", "playground/js/words.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { wordCount } from \"./words.mjs\";\n\ntest(\"one word\", () => {\n  assert.equal(wordCount(\"one\"), 1);\n});\n\ntest(\"extra spaces\", () => {\n  assert.equal(wordCount(\"  spaced   out  \"), 2);\n});\n\ntest(\"empty text\", () => {\n  assert.equal(wordCount(\"\"), 0);\n});\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], wrong: [{ name: "splits on single spaces", files: {"playground/js/words.mjs": "export function wordCount(text) {\n  return text.split(\" \").length;\n}\n", "playground/js/words.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { wordCount } from \"./words.mjs\";\n\ntest(\"one word\", () => {\n  assert.equal(wordCount(\"one\"), 1);\n});\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [1, 2] }, { name: "empty text counted as one word", files: {"playground/js/words.mjs": "export function wordCount(text) {\n  return text.trim().split(/ +/).length;\n}\n", "playground/js/words.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { wordCount } from \"./words.mjs\";\n\ntest(\"one word\", () => {\n  assert.equal(wordCount(\"one\"), 1);\n});\n\ntest(\"extra spaces\", () => {\n  assert.equal(wordCount(\"  spaced   out  \"), 2);\n});\n\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [1] }, { name: "not committed", files: {"playground/js/words.mjs": "export function wordCount(text) {\n  const trimmed = text.trim();\n  if (trimmed === \"\") {\n    return 0;\n  }\n  return trimmed.split(/ +/).length;\n}\n", "playground/js/words.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { wordCount } from \"./words.mjs\";\n\ntest(\"one word\", () => {\n  assert.equal(wordCount(\"one\"), 1);\n});\n\ntest(\"extra spaces\", () => {\n  assert.equal(wordCount(\"  spaced   out  \"), 2);\n});\n\ntest(\"empty text\", () => {\n  assert.equal(wordCount(\"\"), 0);\n});\n"}, fails: [3] }] },
  'spreadsheet-build/06-03-addresses#The tests': {
    wrong: [{ name: 'no test file', fails: [0, 1] }],
  },
  "spreadsheet-build/06-03-addresses#address.ts": { wrong: [{ name: "rows not counted from 1", edit: [["(address.row + 1)", "address.row"]], fails: [0] }] },
  'spreadsheet-build/06-03-addresses#Reading an address': {
    wrong: [
      { name: 'accepts B0 (pattern allows a leading 0)', edit: [['([1-9][0-9]*)', '([0-9]+)']], fails: [0, 2] },
      { name: 'no ^ and $', edit: [['/^([A-Z]+)([1-9][0-9]*)$/', '/([A-Z]+)([1-9][0-9]*)/']], fails: [0] },
      { name: 'rows counted from 1 inside the program', edit: [['row: Number(digits) - 1', 'row: Number(digits)']], fails: [0, 2] },
      { name: 'no undefined check (tests pass, types fail)', edit: [['  if (letters === undefined || digits === undefined) {\n    return null;\n  }\n', '']], fails: [1] },
      { name: 'upper case only', edit: [['.exec(text.toUpperCase())', '.exec(text)']], fails: [0, 2] },
    ],
  },
  'spreadsheet-build/06-03-addresses#Commit': {
    run: ['git add address.ts address.test.ts', 'git commit -m "Add the Address type, with formatAddress and parseAddress"'],
    wrong: [{ name: 'commit -a only', run: ['git commit -am "Address"'], fails: [0, 1, 2] }],
  },

  // ── 6.4 ──────────────────────────────────────────────────────────────────
  "spreadsheet-build/06-03-addresses#Your turn: a pattern of your own": { files: {"playground/js/zip.mjs": "export function isZip(text) {\n  return /^[0-9]{5}(-[0-9]{4})?$/.test(text);\n}\n", "playground/js/zip.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { isZip } from \"./zip.mjs\";\n\ntest(\"five digits\", () => {\n  assert.equal(isZip(\"12345\"), true);\n});\n\ntest(\"five and four\", () => {\n  assert.equal(isZip(\"12345-6789\"), true);\n});\n\ntest(\"rejects six digits\", () => {\n  assert.equal(isZip(\"123456\"), false);\n});\n\ntest(\"rejects spaces around it\", () => {\n  assert.equal(isZip(\" 12345\"), false);\n});\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], wrong: [{ name: "not anchored", files: {"playground/js/zip.mjs": "export function isZip(text) {\n  return /[0-9]{5}(-[0-9]{4})?/.test(text);\n}\n", "playground/js/zip.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { isZip } from \"./zip.mjs\";\n\ntest(\"five digits\", () => {\n  assert.equal(isZip(\"12345\"), true);\n});\n\ntest(\"five and four\", () => {\n  assert.equal(isZip(\"12345-6789\"), true);\n});\n\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [1, 2] }, { name: "not committed", files: {"playground/js/zip.mjs": "export function isZip(text) {\n  return /^[0-9]{5}(-[0-9]{4})?$/.test(text);\n}\n", "playground/js/zip.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { isZip } from \"./zip.mjs\";\n\ntest(\"five digits\", () => {\n  assert.equal(isZip(\"12345\"), true);\n});\n\ntest(\"five and four\", () => {\n  assert.equal(isZip(\"12345-6789\"), true);\n});\n\ntest(\"rejects six digits\", () => {\n  assert.equal(isZip(\"123456\"), false);\n});\n\ntest(\"rejects spaces around it\", () => {\n  assert.equal(isZip(\" 12345\"), false);\n});\n"}, fails: [3] }] },
  'spreadsheet-build/06-04-the-sheet#Tests first': {
    wrong: [{ name: 'no test file', fails: [0, 1] }],
  },
  "spreadsheet-build/06-04-the-sheet#The class": { wrong: [{ name: "no count method", edit: [["  count(): number {\n    return this.cells.size;\n  }\n", ""]], fails: [0] }] },
  'spreadsheet-build/06-04-the-sheet#Forgetting emptied cells': {
    wrong: [
      { name: 'stores empty text instead of deleting', edit: [['    if (text === "") {\n      this.cells.delete(key);\n    } else {\n      this.cells.set(key, text);\n    }', '    this.cells.set(key, text);']], fails: [0, 2] },
      // Not a wrong answer: swapping column and row *inside* the key is invisible from outside,
      // because get and set agree. Only the key's spelling changes.
      { name: 'get and set use different keys', edit: [['    const key = formatAddress(address);', '    const key = formatAddress({ column: address.row, row: address.column });']], fails: [0, 2] },
      { name: 'get returns undefined for empty cells', edit: [['return this.cells.get(formatAddress(address)) ?? "";', 'return this.cells.get(formatAddress(address)) as string;']], fails: [0] },
    ],
  },
  'spreadsheet-build/06-04-the-sheet#Commit': {
    run: ['git add sheet.ts sheet.test.ts', 'git commit -m "Add the Sheet class"'],
    wrong: [{ name: 'commit -a only', run: ['git commit -am "Sheet"'], fails: [0, 1] }],
  },

  // ── 6.5 ──────────────────────────────────────────────────────────────────
  "spreadsheet-build/06-04-the-sheet#Your turn: a class of your own": { files: {"playground/js/stack.mjs": "export class Stack {\n  #items = [];\n\n  push(item) {\n    this.#items.push(item);\n  }\n\n  pop() {\n    return this.#items.pop();\n  }\n\n  peek() {\n    return this.#items[this.#items.length - 1];\n  }\n\n  size() {\n    return this.#items.length;\n  }\n}\n", "playground/js/stack.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { Stack } from \"./stack.mjs\";\n\ntest(\"pop gives the last item pushed\", () => {\n  const s = new Stack();\n  s.push(1);\n  s.push(2);\n  assert.equal(s.pop(), 2);\n  assert.equal(s.size(), 1);\n});\n\ntest(\"popping an empty stack gives undefined\", () => {\n  assert.equal(new Stack().pop(), undefined);\n});\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], wrong: [{ name: "takes from the bottom", files: {"playground/js/stack.mjs": "export class Stack {\n  #items = [];\n\n  push(item) {\n    this.#items.push(item);\n  }\n\n  pop() {\n    return this.#items.shift();\n  }\n\n  peek() {\n    return this.#items[0];\n  }\n\n  size() {\n    return this.#items.length;\n  }\n}\n", "playground/js/stack.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { Stack } from \"./stack.mjs\";\n\ntest(\"size\", () => {\n  const s = new Stack();\n  s.push(1);\n  assert.equal(s.size(), 1);\n});\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [1, 2] }, { name: "not committed", files: {"playground/js/stack.mjs": "export class Stack {\n  #items = [];\n\n  push(item) {\n    this.#items.push(item);\n  }\n\n  pop() {\n    return this.#items.pop();\n  }\n\n  peek() {\n    return this.#items[this.#items.length - 1];\n  }\n\n  size() {\n    return this.#items.length;\n  }\n}\n", "playground/js/stack.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { Stack } from \"./stack.mjs\";\n\ntest(\"pop gives the last item pushed\", () => {\n  const s = new Stack();\n  s.push(1);\n  s.push(2);\n  assert.equal(s.pop(), 2);\n  assert.equal(s.size(), 1);\n});\n\ntest(\"popping an empty stack gives undefined\", () => {\n  assert.equal(new Stack().pop(), undefined);\n});\n"}, fails: [3] }] },
  'spreadsheet-build/06-05-wire-the-sheet#Positions as addresses': {
    wrong: [
      { name: 'column and row swapped when clicking', edit: [['select({ column: c, row: r })', 'select({ column: r, row: c })']], fails: [2] },
      { name: 'old cell never un-outlined', edit: [['  cellAt(selected)?.classList.remove("selected");\n', '']], fails: [3] },
    ],
  },
  'spreadsheet-build/06-05-wire-the-sheet#The data lives in the sheet': {
    wrong: [
      { name: 'Enter never stores in the sheet', edit: [['    sheet.set(selected, formulaBar.value);\n', '']], fails: [1] },
      { name: 'formula bar shows nothing, not the sheet', edit: [['  formulaBar.value = sheet.get(address);', '  formulaBar.value = "";']], fails: [1] },
      { name: 'column and row swapped when clicking', edit: [['select({ column: c, row: r })', 'select({ column: r, row: c })']], fails: [2] },
    ],
  },
  'spreadsheet-build/06-05-wire-the-sheet#Watch it run: the debugger': {
    wrong: [{ name: 'left a debugger statement in', editFiles: { 'grid.ts': [['    sheet.set(selected, formulaBar.value);', '    debugger;\n    sheet.set(selected, formulaBar.value);']] }, fails: [0] }],
  },
  'spreadsheet-build/06-05-wire-the-sheet#Commit': {
    run: ['git commit -am "Keep the data in a Sheet; the grid only draws it"'],
    wrong: [{ name: 'did not commit', fails: [0] }],
  },

  // ── 6.6 ──────────────────────────────────────────────────────────────────
  "spreadsheet-build/06-05-wire-the-sheet#Your turn: find it with the debugger": { editFiles: { "playground/js/total.html": [["let i = 1;", "let i = 0;"]] }, run: ["git add playground", "git commit -m \"Practise in the playground\""], wrong: [{ name: "the answer written in", editFiles: { "playground/js/total.html": [["\"Total: \" + total", "\"Total: 12.75\""]] }, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [1] }, { name: "not fixed", run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [0] }] },
  'spreadsheet-build/06-06-tidy-into-src#Remove the practice files': {
    run: ['git rm hello.py hello.js greet.py exit-code.js'],
    wrong: [{ name: 'removed only hello.py', run: ['git rm hello.py'], fails: [1, 2, 3] }],
  },
  'spreadsheet-build/06-06-tidy-into-src#Move the source into src': {
    run: ['mkdir src', 'git mv address.ts address.test.ts columns.ts columns.test.ts grid.ts sheet.ts sheet.test.ts style.css src'],
    wrong: [
      { name: 'copied instead of moving', run: ['mkdir src', 'Copy-Item *.ts, style.css src'], fails: [2] },
      { name: 'left style.css behind', run: ['mkdir src', 'git mv address.ts address.test.ts columns.ts columns.test.ts grid.ts sheet.ts sheet.test.ts src'], fails: [1] },
    ],
  },
  'spreadsheet-build/06-06-tidy-into-src#Point the page and the compiler at src': {
    wrong: [
      { name: 'script still points at grid.ts at the top', edit: [['src="/src/grid.ts"', 'src="grid.ts"']], fails: [0] },
    ],
  },
  'spreadsheet-build/06-06-tidy-into-src#And the compiler': {
    wrong: [
      { name: 'tsconfig still includes *.ts', edit: [['"include": ["src"]', '"include": ["*.ts"]']], fails: [0, 1] },
      { name: 'page still points at style.css at the top', editFiles: { 'index.html': [['href="/src/style.css"', 'href="style.css"']] }, fails: [4] },
    ],
  },
  'spreadsheet-build/06-06-tidy-into-src#Merge the sprint and push': {
    run: ['git commit -am "Move the source into src; remove the sprint 0 practice files"', 'git switch main', 'git merge tests-and-model', 'git push', 'git branch -d tests-and-model'],
    wrong: [
      { name: 'merged but did not push', run: ['git commit -am "src"', 'git switch main', 'git merge tests-and-model', 'git branch -d tests-and-model'], fails: [3] },
      { name: 'did not merge', run: ['git commit -am "src"'], fails: [0, 1] },
    ],
  },

  "spreadsheet-build/06-06-tidy-into-src#Your turn: a README for the project": { files: {"README.md": "# Spreadsheet\n\nA spreadsheet in the browser, with formulas, built in TypeScript.\n\n## Getting started\n\n```\nnpm install\nnpm run dev\n```\n\n## Testing and building\n\n```\nnpm test\nnpm run check\nnpm run build\n```\n\n## The code\n\nEverything is in `src`: the sheet's data and logic, with their tests next to them, and `grid.ts`, which draws the page.\n"}, run: ["git add README.md", "git commit -m \"Add a README\"", "git push"], wrong: [{ name: "no testing or building", files: {"README.md": "# Spreadsheet\n\nRun npm install, then npm run dev.\n"}, run: ["git add README.md", "git commit -m \"README\""], fails: [3, 4, 6] }, { name: "no heading", files: {"README.md": "A spreadsheet in the browser, with formulas, built in TypeScript.\n\n## Getting started\n\n```\nnpm install\nnpm run dev\n```\n\n## Testing and building\n\n```\nnpm test\nnpm run check\nnpm run build\n```\n\n## The code\n\nEverything is in `src`: the sheet's data and logic, with their tests next to them, and `grid.ts`, which draws the page.\n"}, run: ["git add README.md", "git commit -m \"README\""], fails: [0, 6] }, { name: "not committed", files: {"README.md": "# Spreadsheet\n\nA spreadsheet in the browser, with formulas, built in TypeScript.\n\n## Getting started\n\n```\nnpm install\nnpm run dev\n```\n\n## Testing and building\n\n```\nnpm test\nnpm run check\nnpm run build\n```\n\n## The code\n\nEverything is in `src`: the sheet's data and logic, with their tests next to them, and `grid.ts`, which draws the page.\n"}, fails: [5, 6] }] },
  "spreadsheet-build/06-07-challenge-how-much-is-used#Your turn: build it to the tests": { editFiles: { "src/sheet.ts": [["import { formatAddress, type Address } from \"./address.ts\";", "import { formatAddress, parseAddress, type Address } from \"./address.ts\";"], ["  count(): number {\n    return this.cells.size;\n  }\n}", "  count(): number {\n    return this.cells.size;\n  }\n\n  used(): { from: Address; to: Address } | null {\n    let from: Address | null = null;\n    let to: Address | null = null;\n    for (const key of this.cells.keys()) {\n      const address = parseAddress(key);\n      if (address === null) {\n        continue;\n      }\n      if (from === null || to === null) {\n        from = address;\n        to = address;\n      } else {\n        from = { column: Math.min(from.column, address.column), row: Math.min(from.row, address.row) };\n        to = { column: Math.max(to.column, address.column), row: Math.max(to.row, address.row) };\n      }\n    }\n    if (from === null || to === null) {\n      return null;\n    }\n    return { from, to };\n  }\n}"]] }, run: ["git switch -c used-range", "git add src", "git commit -m \"Find the used range of a sheet\"", "git switch main", "git merge used-range", "git branch -d used-range", "git push"], wrong: [{ name: "scans the 26 by 100 grid", editFiles: { "src/sheet.ts": [["import { formatAddress, type Address } from \"./address.ts\";", "import { formatAddress, parseAddress, type Address } from \"./address.ts\";"], ["  count(): number {\n    return this.cells.size;\n  }\n}", "  count(): number {\n    return this.cells.size;\n  }\n\n  used(): { from: Address; to: Address } | null {\n    let from: Address | null = null;\n    let to: Address | null = null;\n    for (let row = 0; row < 100; row++) {\n      for (let column = 0; column < 26; column++) {\n        if (this.get({ column, row }) !== \"\") {\n          from = from ?? { column, row };\n          to = { column: Math.max(to?.column ?? column, column), row };\n        }\n      }\n    }\n    if (from === null || to === null) {\n      return null;\n    }\n    return { from, to };\n  }\n}"]] }, run: ["git switch -c used-range", "git add src", "git commit -m \"Find the used range of a sheet\"", "git switch main", "git merge used-range", "git branch -d used-range"], fails: [0, 1, 3, 6] }, { name: "built but not merged", editFiles: { "src/sheet.ts": [["import { formatAddress, type Address } from \"./address.ts\";", "import { formatAddress, parseAddress, type Address } from \"./address.ts\";"], ["  count(): number {\n    return this.cells.size;\n  }\n}", "  count(): number {\n    return this.cells.size;\n  }\n\n  used(): { from: Address; to: Address } | null {\n    let from: Address | null = null;\n    let to: Address | null = null;\n    for (const key of this.cells.keys()) {\n      const address = parseAddress(key);\n      if (address === null) {\n        continue;\n      }\n      if (from === null || to === null) {\n        from = address;\n        to = address;\n      } else {\n        from = { column: Math.min(from.column, address.column), row: Math.min(from.row, address.row) };\n        to = { column: Math.max(to.column, address.column), row: Math.max(to.row, address.row) };\n      }\n    }\n    if (from === null || to === null) {\n      return null;\n    }\n    return { from, to };\n  }\n}"]] }, run: ["git switch -c used-range", "git add src", "git commit -m \"Find the used range of a sheet\""], fails: [4, 5] }] },
  "spreadsheet-build/06-08-solution-how-much-is-used#Your turn: a bounding box for anything": { files: {"playground/js/box.mjs": "export function boundingBox(points) {\n  if (points.length === 0) {\n    return null;\n  }\n  let box = { minX: points[0].x, minY: points[0].y, maxX: points[0].x, maxY: points[0].y };\n  for (const p of points) {\n    box = {\n      minX: Math.min(box.minX, p.x),\n      minY: Math.min(box.minY, p.y),\n      maxX: Math.max(box.maxX, p.x),\n      maxY: Math.max(box.maxY, p.y),\n    };\n  }\n  return box;\n}\n", "playground/js/box.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { boundingBox } from \"./box.mjs\";\n\ntest(\"no points\", () => {\n  assert.equal(boundingBox([]), null);\n});\n\ntest(\"points away from 0\", () => {\n  assert.deepEqual(boundingBox([{ x: 3, y: 1 }, { x: 5, y: 2 }]), { minX: 3, minY: 1, maxX: 5, maxY: 2 });\n});\n"}, run: ["git add playground", "git commit -m \"A bounding box\""], wrong: [{ name: "a box that starts at 0", files: {"playground/js/box.mjs": "export function boundingBox(points) {\n  if (points.length === 0) {\n    return null;\n  }\n  let box = { minX: 0, minY: 0, maxX: 0, maxY: 0 };\n  for (const p of points) {\n    box = {\n      minX: Math.min(box.minX, p.x),\n      minY: Math.min(box.minY, p.y),\n      maxX: Math.max(box.maxX, p.x),\n      maxY: Math.max(box.maxY, p.y),\n    };\n  }\n  return box;\n}\n", "playground/js/box.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { boundingBox } from \"./box.mjs\";\n\ntest(\"no points\", () => {\n  assert.equal(boundingBox([]), null);\n});\n"}, run: ["git add playground", "git commit -m \"Box\""], fails: [1, 2] }, { name: "not committed", files: {"playground/js/box.mjs": "export function boundingBox(points) {\n  if (points.length === 0) {\n    return null;\n  }\n  let box = { minX: points[0].x, minY: points[0].y, maxX: points[0].x, maxY: points[0].y };\n  for (const p of points) {\n    box = {\n      minX: Math.min(box.minX, p.x),\n      minY: Math.min(box.minY, p.y),\n      maxX: Math.max(box.maxX, p.x),\n      maxY: Math.max(box.maxY, p.y),\n    };\n  }\n  return box;\n}\n", "playground/js/box.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { boundingBox } from \"./box.mjs\";\n\ntest(\"no points\", () => {\n  assert.equal(boundingBox([]), null);\n});\n\ntest(\"points away from 0\", () => {\n  assert.deepEqual(boundingBox([{ x: 3, y: 1 }, { x: 5, y: 2 }]), { minX: 3, minY: 1, maxX: 5, maxY: 2 });\n});\n"}, fails: [3] }] },
  // ── 7.1 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/07-01-tokens#A branch': {
    run: ['git switch -c formulas'],
    wrong: [{ name: 'stayed on main', fails: [0] }],
  },
  "spreadsheet-build/07-01-tokens#The tests first": { wrong: [{ name: 'no test file', fails: [0, 1] }] },
  "spreadsheet-build/07-01-tokens#The Token type": { wrong: [{ name: 'no end kind', edit: [["  | { kind: \"close\"; start: number }\n  | { kind: \"end\"; start: number };", "  | { kind: \"close\"; start: number };"]], fails: [1] }, { name: 'a misspelt type', edit: [["{ kind: \"open\"; start: number }", "{ kind: \"open\"; start: nubmer }"]], fails: [0] }] },
  "spreadsheet-build/07-01-tokens#FormulaError: an error of our own": { wrong: [{ name: 'position never stored', edit: [["    this.position = position;\n", '']], fails: [0] }] },
  "spreadsheet-build/07-01-tokens#The loop, and spaces": { wrong: [{ name: 'spaces rejected', edit: [["if (char === \" \") {", "if (char === \"\\t\") {"]], fails: [0, 1] }, { name: 'the end token at position 0', edit: [["start: text.length", "start: 0"]], fails: [0] }] },
  "spreadsheet-build/07-01-tokens#Numbers": { wrong: [{ name: 'records where a number ends, not where it starts', edit: [["tokens.push({ kind: \"number\", value, start });", "tokens.push({ kind: \"number\", value, start: i });"]], fails: [0] }, { name: 'no NaN check', edit: [["      if (Number.isNaN(value)) {\n        throw new FormulaError(`\"${digits}\" is not a number`, start);\n      }\n", '']], fails: [1] }] },
  "spreadsheet-build/07-01-tokens#Cells": { wrong: [{ name: 'words made of letters only (B12 is read as B)', edit: [["while (isLetter(text.charAt(i)) || isDigit(text.charAt(i))) {", "while (isLetter(text.charAt(i))) {"]], fails: [0, 1] }] },
  "spreadsheet-build/07-01-tokens#Operators and brackets": { wrong: [{ name: 'brackets swapped', edit: [["tokens.push({ kind: \"open\", start });", "tokens.push({ kind: \"close\", start });"]], fails: [0, 2] }] },
  'spreadsheet-build/07-01-tokens#Commit': {
    run: ['git add src/lexer.ts src/lexer.test.ts', 'git commit -m "Add the formula lexer"'],
    wrong: [{ name: 'commit -a only (new files left out)', run: ['git commit -am "Lexer"'], fails: [0, 1] }],
  },
  "spreadsheet-build/07-01-tokens#Your turn: a lexer for durations": { files: {"playground/js/duration.mjs": "export function tokenizeDuration(text) {\n  const tokens = [];\n  let i = 0;\n  while (i < text.length) {\n    const char = text.charAt(i);\n    const start = i;\n    if (char === \" \") {\n      i++;\n    } else if (char >= \"0\" && char <= \"9\") {\n      while (text.charAt(i) >= \"0\" && text.charAt(i) <= \"9\") {\n        i++;\n      }\n      tokens.push({ kind: \"number\", value: Number(text.slice(start, i)) });\n    } else if (\"hms\".includes(char)) {\n      tokens.push({ kind: \"unit\", unit: char });\n      i++;\n    } else {\n      throw new Error(`Unexpected \"${char}\" at position ${start}`);\n    }\n  }\n  return tokens;\n}\n", "playground/js/duration.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { tokenizeDuration } from \"./duration.mjs\";\n\ntest(\"hours and minutes\", () => {\n  assert.deepEqual(tokenizeDuration(\"1h 30m\"), [\n    { kind: \"number\", value: 1 },\n    { kind: \"unit\", unit: \"h\" },\n    { kind: \"number\", value: 30 },\n    { kind: \"unit\", unit: \"m\" },\n  ]);\n});\n\ntest(\"a character that isn't allowed\", () => {\n  assert.throws(() => tokenizeDuration(\"1x\"), /Unexpected \"x\" at position 1/);\n});\n"}, run: ["git add playground", "git commit -m \"A lexer for durations\""], wrong: [{ name: 'tests only the good case', files: {"playground/js/duration.mjs": "export function tokenizeDuration(text) {\n  const tokens = [];\n  let i = 0;\n  while (i < text.length) {\n    const char = text.charAt(i);\n    const start = i;\n    if (char === \" \") {\n      i++;\n    } else if (char >= \"0\" && char <= \"9\") {\n      while (text.charAt(i) >= \"0\" && text.charAt(i) <= \"9\") {\n        i++;\n      }\n      tokens.push({ kind: \"number\", value: Number(text.slice(start, i)) });\n    } else if (\"hms\".includes(char)) {\n      tokens.push({ kind: \"unit\", unit: char });\n      i++;\n    } else {\n      throw new Error(`Unexpected \"${char}\" at position ${start}`);\n    }\n  }\n  return tokens;\n}\n", "playground/js/duration.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { tokenizeDuration } from \"./duration.mjs\";\n\ntest(\"hours and minutes\", () => {\n  assert.deepEqual(tokenizeDuration(\"1h 30m\"), [\n    { kind: \"number\", value: 1 },\n    { kind: \"unit\", unit: \"h\" },\n    { kind: \"number\", value: 30 },\n    { kind: \"unit\", unit: \"m\" },\n  ]);\n});\n"}, run: ["git add playground", "git commit -m \"A lexer for durations\""], fails: [3] }, { name: 'positions counted from 1', files: {"playground/js/duration.mjs": "export function tokenizeDuration(text) {\n  const tokens = [];\n  let i = 0;\n  while (i < text.length) {\n    const char = text.charAt(i);\n    const start = i;\n    if (char === \" \") {\n      i++;\n    } else if (char >= \"0\" && char <= \"9\") {\n      while (text.charAt(i) >= \"0\" && text.charAt(i) <= \"9\") {\n        i++;\n      }\n      tokens.push({ kind: \"number\", value: Number(text.slice(start, i)) });\n    } else if (\"hms\".includes(char)) {\n      tokens.push({ kind: \"unit\", unit: char });\n      i++;\n    } else {\n      throw new Error(`Unexpected \"${char}\" at position ${start + 1}`);\n    }\n  }\n  return tokens;\n}\n", "playground/js/duration.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { tokenizeDuration } from \"./duration.mjs\";\n\ntest(\"hours and minutes\", () => {\n  assert.deepEqual(tokenizeDuration(\"1h 30m\"), [\n    { kind: \"number\", value: 1 },\n    { kind: \"unit\", unit: \"h\" },\n    { kind: \"number\", value: 30 },\n    { kind: \"unit\", unit: \"m\" },\n  ]);\n});\n\ntest(\"a character that isn't allowed\", () => {\n  assert.throws(() => tokenizeDuration(\"1x\"), /Unexpected \"x\" at position 1/);\n});\n"}, run: ["git add playground", "git commit -m \"A lexer for durations\""], fails: [0, 2] }, { name: 'not committed', files: {"playground/js/duration.mjs": "export function tokenizeDuration(text) {\n  const tokens = [];\n  let i = 0;\n  while (i < text.length) {\n    const char = text.charAt(i);\n    const start = i;\n    if (char === \" \") {\n      i++;\n    } else if (char >= \"0\" && char <= \"9\") {\n      while (text.charAt(i) >= \"0\" && text.charAt(i) <= \"9\") {\n        i++;\n      }\n      tokens.push({ kind: \"number\", value: Number(text.slice(start, i)) });\n    } else if (\"hms\".includes(char)) {\n      tokens.push({ kind: \"unit\", unit: char });\n      i++;\n    } else {\n      throw new Error(`Unexpected \"${char}\" at position ${start}`);\n    }\n  }\n  return tokens;\n}\n", "playground/js/duration.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { tokenizeDuration } from \"./duration.mjs\";\n\ntest(\"hours and minutes\", () => {\n  assert.deepEqual(tokenizeDuration(\"1h 30m\"), [\n    { kind: \"number\", value: 1 },\n    { kind: \"unit\", unit: \"h\" },\n    { kind: \"number\", value: 30 },\n    { kind: \"unit\", unit: \"m\" },\n  ]);\n});\n\ntest(\"a character that isn't allowed\", () => {\n  assert.throws(() => tokenizeDuration(\"1x\"), /Unexpected \"x\" at position 1/);\n});\n"}, fails: [4] }] },

  // ── 7.2 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/07-02-trees#Values: what a cell can hold': {
    wrong: [{ name: 'no file', fails: [0, 1] }],
  },
  "spreadsheet-build/07-02-trees#The tree's type": {
    wrong: [{ name: 'no file', fails: [0] }],
  },
  "spreadsheet-build/07-02-trees#Tests with hand-built trees": { wrong: [{ name: 'no test file', fails: [0, 1] }] },
  "spreadsheet-build/07-02-trees#Arithmetic": { wrong: [{ name: 'no division-by-zero check (gives Infinity)', edit: [["return right === 0 ? { error: \"#DIV/0!\" } : left / right;", "return left / right;"]], fails: [1] }, { name: 'a missing case', edit: [["    case \"-\":\n      return left - right;\n", '']], fails: [0] }] },
  "spreadsheet-build/07-02-trees#Leaves: the base cases": { wrong: [{ name: 'a cell counts as 0', edit: [["      return valueAt(expression.address);", "      return 0;"]], fails: [1] }] },
  "spreadsheet-build/07-02-trees#Branches, and recursion": { wrong: [{ name: 'left and right swapped in calculate', edit: [["return calculate(expression.op, left, right);", "return calculate(expression.op, right, left);"]], fails: [0, 1] }, { name: 'errors on the left not passed on', edit: [["      if (typeof left !== \"number\") {\n        return left;\n      }\n", '']], fails: [0] }] },
  "spreadsheet-build/07-02-trees#Text and empty cells: toNumber": { wrong: [{ name: 'text counts as 0 instead of #VALUE!', edit: [["return value === \"\" ? 0 : { error: \"#VALUE!\" };", "return 0;"]], fails: [0, 2] }, { name: 'only the left side converted', edit: [["const right = toNumber(evaluate(expression.right, valueAt));", "const right = evaluate(expression.right, valueAt);"]], fails: [0, 2] }] },
  'spreadsheet-build/07-02-trees#Commit': {
    run: ['git add src/values.ts src/expression.ts src/evaluate.ts src/evaluate.test.ts', 'git commit -m "Add expression trees and the evaluator"'],
    wrong: [{ name: 'commit -a only', run: ['git commit -am "Evaluator"'], fails: [0, 1] }],
  },
  "spreadsheet-build/07-02-trees#Your turn: rules for a feature flag": { files: {"playground/js/logic.mjs": "export function evaluateLogic(tree, valueOf) {\n  switch (tree.kind) {\n    case \"bool\":\n      return tree.value;\n    case \"var\":\n      return valueOf(tree.name);\n    case \"not\":\n      return !evaluateLogic(tree.operand, valueOf);\n    case \"and\":\n      return evaluateLogic(tree.left, valueOf) && evaluateLogic(tree.right, valueOf);\n    case \"or\":\n      return evaluateLogic(tree.left, valueOf) || evaluateLogic(tree.right, valueOf);\n  }\n}\n", "playground/js/logic.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { evaluateLogic } from \"./logic.mjs\";\n\nconst v = (name) => ({ kind: \"var\", name });\n\ntest(\"and needs both sides\", () => {\n  const tree = { kind: \"and\", left: v(\"a\"), right: { kind: \"not\", operand: v(\"b\") } };\n  assert.equal(evaluateLogic(tree, (name) => name === \"a\"), true);\n  assert.equal(evaluateLogic(tree, () => true), false);\n});\n\ntest(\"or needs one side\", () => {\n  const tree = { kind: \"or\", left: v(\"a\"), right: v(\"b\") };\n  assert.equal(evaluateLogic(tree, (name) => name === \"b\"), true);\n  assert.equal(evaluateLogic(tree, () => false), false);\n});\n"}, run: ["git add playground", "git commit -m \"Feature-flag rules as trees\""], wrong: [{ name: 'tests only and', files: {"playground/js/logic.mjs": "export function evaluateLogic(tree, valueOf) {\n  switch (tree.kind) {\n    case \"bool\":\n      return tree.value;\n    case \"var\":\n      return valueOf(tree.name);\n    case \"not\":\n      return !evaluateLogic(tree.operand, valueOf);\n    case \"and\":\n      return evaluateLogic(tree.left, valueOf) && evaluateLogic(tree.right, valueOf);\n    case \"or\":\n      return evaluateLogic(tree.left, valueOf) || evaluateLogic(tree.right, valueOf);\n  }\n}\n", "playground/js/logic.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { evaluateLogic } from \"./logic.mjs\";\n\nconst v = (name) => ({ kind: \"var\", name });\n\ntest(\"and needs both sides\", () => {\n  const tree = { kind: \"and\", left: v(\"a\"), right: { kind: \"not\", operand: v(\"b\") } };\n  assert.equal(evaluateLogic(tree, (name) => name === \"a\"), true);\n  assert.equal(evaluateLogic(tree, () => true), false);\n});\n"}, run: ["git add playground", "git commit -m \"Feature-flag rules as trees\""], fails: [2] }, { name: 'not forgets to flip', files: {"playground/js/logic.mjs": "export function evaluateLogic(tree, valueOf) {\n  switch (tree.kind) {\n    case \"bool\":\n      return tree.value;\n    case \"var\":\n      return valueOf(tree.name);\n    case \"not\":\n      return evaluateLogic(tree.operand, valueOf);\n    case \"and\":\n      return evaluateLogic(tree.left, valueOf) && evaluateLogic(tree.right, valueOf);\n    case \"or\":\n      return evaluateLogic(tree.left, valueOf) || evaluateLogic(tree.right, valueOf);\n  }\n}\n", "playground/js/logic.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { evaluateLogic } from \"./logic.mjs\";\n\nconst v = (name) => ({ kind: \"var\", name });\n\ntest(\"and needs both sides\", () => {\n  const tree = { kind: \"and\", left: v(\"a\"), right: { kind: \"not\", operand: v(\"b\") } };\n  assert.equal(evaluateLogic(tree, (name) => name === \"a\"), true);\n  assert.equal(evaluateLogic(tree, () => true), false);\n});\n\ntest(\"or needs one side\", () => {\n  const tree = { kind: \"or\", left: v(\"a\"), right: v(\"b\") };\n  assert.equal(evaluateLogic(tree, (name) => name === \"b\"), true);\n  assert.equal(evaluateLogic(tree, () => false), false);\n});\n"}, run: ["git add playground", "git commit -m \"Feature-flag rules as trees\""], fails: [0, 1] }, { name: 'not committed', files: {"playground/js/logic.mjs": "export function evaluateLogic(tree, valueOf) {\n  switch (tree.kind) {\n    case \"bool\":\n      return tree.value;\n    case \"var\":\n      return valueOf(tree.name);\n    case \"not\":\n      return !evaluateLogic(tree.operand, valueOf);\n    case \"and\":\n      return evaluateLogic(tree.left, valueOf) && evaluateLogic(tree.right, valueOf);\n    case \"or\":\n      return evaluateLogic(tree.left, valueOf) || evaluateLogic(tree.right, valueOf);\n  }\n}\n", "playground/js/logic.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { evaluateLogic } from \"./logic.mjs\";\n\nconst v = (name) => ({ kind: \"var\", name });\n\ntest(\"and needs both sides\", () => {\n  const tree = { kind: \"and\", left: v(\"a\"), right: { kind: \"not\", operand: v(\"b\") } };\n  assert.equal(evaluateLogic(tree, (name) => name === \"a\"), true);\n  assert.equal(evaluateLogic(tree, () => true), false);\n});\n\ntest(\"or needs one side\", () => {\n  const tree = { kind: \"or\", left: v(\"a\"), right: v(\"b\") };\n  assert.equal(evaluateLogic(tree, (name) => name === \"b\"), true);\n  assert.equal(evaluateLogic(tree, () => false), false);\n});\n"}, fails: [3] }] },

  // ── 7.3 ──────────────────────────────────────────────────────────────────
  "spreadsheet-build/07-03-parser#The tests": { wrong: [{ name: 'no test file', fails: [0, 1] }] },
  "spreadsheet-build/07-03-parser#Parsing one number": { wrong: [{ name: "the number's value lost", edit: [["return { kind: \"number\", value: token.value };", "return { kind: \"number\", value: 0 };"]], fails: [0] }] },
  "spreadsheet-build/07-03-parser#Cells, and the end of the formula": { wrong: [{ name: 'no check for text after the formula', edit: [["  if (extra.kind !== \"end\") {\n    throw new FormulaError(\"Unexpected text after the end of the formula\", extra.start);\n  }\n", '']], fails: [1] }] },
  "spreadsheet-build/07-03-parser#Terms: * and /": { wrong: [{ name: 'groups right to left (8/2/2 = 8)', edit: [["left = { kind: \"binary\", op: token.op, left, right: factor() };", "left = { kind: \"binary\", op: token.op, left, right: term() };"]], fails: [0] }] },
  "spreadsheet-build/07-03-parser#Expressions: + and -": { wrong: [{ name: 'precedence flipped: + and - in the deeper rule', edit: [ ['while (token.kind === "operator" && (token.op === "+" || token.op === "-")) {', 'while (token.kind === "operator" && (token.op === "*" || token.op === "/")) {'], ['while (token.kind === "operator" && (token.op === "*" || token.op === "/")) {\n      advance();\n      left = { kind: "binary", op: token.op, left, right: factor() };', 'while (token.kind === "operator" && (token.op === "+" || token.op === "-")) {\n      advance();\n      left = { kind: "binary", op: token.op, left, right: factor() };'], ], fails: [0, 1], }, { name: 'groups right to left (10-2-3 = 11)', edit: [['left = { kind: "binary", op: token.op, left, right: term() };', 'left = { kind: "binary", op: token.op, left, right: expression() };']], fails: [0, 1] }] },
  "spreadsheet-build/07-03-parser#Brackets": { wrong: [{ name: 'no check for text after the formula', edit: [['  if (extra.kind !== "end") {\n    throw new FormulaError("Unexpected text after the end of the formula", extra.start);\n  }\n', '']], fails: [0, 3] }] },
  'spreadsheet-build/07-03-parser#Commit': {
    run: ['git add src/parser.ts src/parser.test.ts', 'git commit -m "Add the formula parser"'],
    wrong: [{ name: 'commit -a only', run: ['git commit -am "Parser"'], fails: [0, 1] }],
  },
  "spreadsheet-build/07-03-parser#Your turn: a parser for nested lists": { files: {"playground/js/list.mjs": "export function parseList(text) {\n  let i = 0;\n\n  function skipSpaces() {\n    while (text.charAt(i) === \" \") {\n      i++;\n    }\n  }\n\n  function item() {\n    skipSpaces();\n    if (text.charAt(i) === \"[\") {\n      return list();\n    }\n    const start = i;\n    while (text.charAt(i) >= \"0\" && text.charAt(i) <= \"9\") {\n      i++;\n    }\n    if (i === start) {\n      throw new Error(`Expected a number or [ at position ${i}`);\n    }\n    return Number(text.slice(start, i));\n  }\n\n  function list() {\n    i++;\n    const items = [];\n    skipSpaces();\n    if (text.charAt(i) === \"]\") {\n      i++;\n      return items;\n    }\n    items.push(item());\n    skipSpaces();\n    while (text.charAt(i) === \",\") {\n      i++;\n      items.push(item());\n      skipSpaces();\n    }\n    if (text.charAt(i) !== \"]\") {\n      throw new Error(`Expected , or ] at position ${i}`);\n    }\n    i++;\n    return items;\n  }\n\n  skipSpaces();\n  if (text.charAt(i) !== \"[\") {\n    throw new Error(`Expected [ at position ${i}`);\n  }\n  const result = list();\n  skipSpaces();\n  if (i < text.length) {\n    throw new Error(`Unexpected text at position ${i}`);\n  }\n  return result;\n}\n", "playground/js/list.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { parseList } from \"./list.mjs\";\n\ntest(\"nested lists\", () => {\n  assert.deepEqual(parseList(\"[1, [2, 3], []]\"), [1, [2, 3], []]);\n});\n\ntest(\"a list that's never closed\", () => {\n  assert.throws(() => parseList(\"[1, 2\"));\n});\n"}, run: ["git add playground", "git commit -m \"A parser for nested lists\""], wrong: [{ name: 'tests only good lists', files: {"playground/js/list.mjs": "export function parseList(text) {\n  let i = 0;\n\n  function skipSpaces() {\n    while (text.charAt(i) === \" \") {\n      i++;\n    }\n  }\n\n  function item() {\n    skipSpaces();\n    if (text.charAt(i) === \"[\") {\n      return list();\n    }\n    const start = i;\n    while (text.charAt(i) >= \"0\" && text.charAt(i) <= \"9\") {\n      i++;\n    }\n    if (i === start) {\n      throw new Error(`Expected a number or [ at position ${i}`);\n    }\n    return Number(text.slice(start, i));\n  }\n\n  function list() {\n    i++;\n    const items = [];\n    skipSpaces();\n    if (text.charAt(i) === \"]\") {\n      i++;\n      return items;\n    }\n    items.push(item());\n    skipSpaces();\n    while (text.charAt(i) === \",\") {\n      i++;\n      items.push(item());\n      skipSpaces();\n    }\n    if (text.charAt(i) !== \"]\") {\n      throw new Error(`Expected , or ] at position ${i}`);\n    }\n    i++;\n    return items;\n  }\n\n  skipSpaces();\n  if (text.charAt(i) !== \"[\") {\n    throw new Error(`Expected [ at position ${i}`);\n  }\n  const result = list();\n  skipSpaces();\n  if (i < text.length) {\n    throw new Error(`Unexpected text at position ${i}`);\n  }\n  return result;\n}\n", "playground/js/list.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { parseList } from \"./list.mjs\";\n\ntest(\"nested lists\", () => {\n  assert.deepEqual(parseList(\"[1, [2, 3], []]\"), [1, [2, 3], []]);\n});\n"}, run: ["git add playground", "git commit -m \"A parser for nested lists\""], fails: [3] }, { name: 'leftover text allowed', files: {"playground/js/list.mjs": "export function parseList(text) {\n  let i = 0;\n\n  function skipSpaces() {\n    while (text.charAt(i) === \" \") {\n      i++;\n    }\n  }\n\n  function item() {\n    skipSpaces();\n    if (text.charAt(i) === \"[\") {\n      return list();\n    }\n    const start = i;\n    while (text.charAt(i) >= \"0\" && text.charAt(i) <= \"9\") {\n      i++;\n    }\n    if (i === start) {\n      throw new Error(`Expected a number or [ at position ${i}`);\n    }\n    return Number(text.slice(start, i));\n  }\n\n  function list() {\n    i++;\n    const items = [];\n    skipSpaces();\n    if (text.charAt(i) === \"]\") {\n      i++;\n      return items;\n    }\n    items.push(item());\n    skipSpaces();\n    while (text.charAt(i) === \",\") {\n      i++;\n      items.push(item());\n      skipSpaces();\n    }\n    if (text.charAt(i) !== \"]\") {\n      throw new Error(`Expected , or ] at position ${i}`);\n    }\n    i++;\n    return items;\n  }\n\n  skipSpaces();\n  if (text.charAt(i) !== \"[\") {\n    throw new Error(`Expected [ at position ${i}`);\n  }\n  const result = list();\n  skipSpaces();\n  return result;\n}\n", "playground/js/list.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { parseList } from \"./list.mjs\";\n\ntest(\"nested lists\", () => {\n  assert.deepEqual(parseList(\"[1, [2, 3], []]\"), [1, [2, 3], []]);\n});\n\ntest(\"a list that's never closed\", () => {\n  assert.throws(() => parseList(\"[1, 2\"));\n});\n"}, run: ["git add playground", "git commit -m \"A parser for nested lists\""], fails: [2] }, { name: 'not committed', files: {"playground/js/list.mjs": "export function parseList(text) {\n  let i = 0;\n\n  function skipSpaces() {\n    while (text.charAt(i) === \" \") {\n      i++;\n    }\n  }\n\n  function item() {\n    skipSpaces();\n    if (text.charAt(i) === \"[\") {\n      return list();\n    }\n    const start = i;\n    while (text.charAt(i) >= \"0\" && text.charAt(i) <= \"9\") {\n      i++;\n    }\n    if (i === start) {\n      throw new Error(`Expected a number or [ at position ${i}`);\n    }\n    return Number(text.slice(start, i));\n  }\n\n  function list() {\n    i++;\n    const items = [];\n    skipSpaces();\n    if (text.charAt(i) === \"]\") {\n      i++;\n      return items;\n    }\n    items.push(item());\n    skipSpaces();\n    while (text.charAt(i) === \",\") {\n      i++;\n      items.push(item());\n      skipSpaces();\n    }\n    if (text.charAt(i) !== \"]\") {\n      throw new Error(`Expected , or ] at position ${i}`);\n    }\n    i++;\n    return items;\n  }\n\n  skipSpaces();\n  if (text.charAt(i) !== \"[\") {\n    throw new Error(`Expected [ at position ${i}`);\n  }\n  const result = list();\n  skipSpaces();\n  if (i < text.length) {\n    throw new Error(`Unexpected text at position ${i}`);\n  }\n  return result;\n}\n", "playground/js/list.check.mjs": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { parseList } from \"./list.mjs\";\n\ntest(\"nested lists\", () => {\n  assert.deepEqual(parseList(\"[1, [2, 3], []]\"), [1, [2, 3], []]);\n});\n\ntest(\"a list that's never closed\", () => {\n  assert.throws(() => parseList(\"[1, 2\"));\n});\n"}, fails: [4] }] },

  // ── 7.4 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/07-04-cell-values#The tests': {
    wrong: [{ name: 'no test file', fails: [0, 1] }],
  },
  'spreadsheet-build/07-04-cell-values#compute.ts': {
    wrong: [
      { name: 'no blank check (empty cells become 0)', edit: [['if (text.trim() !== "" && !Number.isNaN(Number(text))) {', 'if (!Number.isNaN(Number(text))) {']], fails: [0, 2] },
      { name: 'valueAt gives the raw text, not the value', edit: [['return evaluate(expression, (other) => cellValue(sheet, other));', 'return evaluate(expression, (other) => sheet.get(other));']], fails: [0, 2] },
    ],
  },
  'spreadsheet-build/07-04-cell-values#Commit': {
    run: ['git add src/compute.ts src/compute.test.ts', 'git commit -m "Work out cell values, formulas included"'],
    wrong: [{ name: 'commit -a only', run: ['git commit -am "Compute"'], fails: [0, 1] }],
  },

  // ── 7.5 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/07-05-formulas-on-the-page#Try it': {
    wrong: [{ name: 'Enter stores the text but never redraws', editFiles: { 'src/grid.ts': [['    showAll();\n', '']] }, fails: [1, 2] }],
  },
  'spreadsheet-build/07-05-formulas-on-the-page#Commit': {
    run: ['git commit -am "Show formula values in the grid"'],
    wrong: [{ name: 'did not commit', fails: [0] }],
  },

  // ── 7.6 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/07-06-cycles#The tests': {
    wrong: [{ name: 'did not add the cycle tests', typeFile: false, fails: [0] }],
  },
  'spreadsheet-build/07-06-cycles#Mark the error': {
    wrong: [{ name: 'no #CYCLE! code', fails: [0] }],
  },
  'spreadsheet-build/07-06-cycles#Track the cells in progress': {
    wrong: [
      { name: 'never takes a cell off the list (no finally)', edit: [['    } finally {\n      visiting.delete(key);\n    }\n', '    }\n']], fails: [0, 2] },
      { name: 'a new list for each cell (the set is not passed on)', edit: [['cellValue(sheet, other, visiting)', 'cellValue(sheet, other)']], fails: [0, 2, 3] },
    ],
  },
  'spreadsheet-build/07-06-cycles#Commit': {
    run: ['git commit -am "Show #CYCLE! instead of crashing on circular references"'],
    wrong: [{ name: 'did not commit', fails: [0] }],
  },

  // ── 7.7 ──────────────────────────────────────────────────────────────────
  'spreadsheet-build/07-07-challenge-negatives#How to think about it': {
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
  'spreadsheet-build/07-07-challenge-negatives#Merge the sprint and push': {
    run: ['git add src', 'git commit -m "Support negative numbers: =-A1, =2*-3"', 'git switch main', 'git merge formulas', 'git push', 'git branch -d formulas'],
    wrong: [
      { name: 'merged but did not push', run: ['git add src', 'git commit -m "Negatives"', 'git switch main', 'git merge formulas', 'git branch -d formulas'], fails: [3] },
      { name: 'did not merge', run: ['git add src', 'git commit -m "Negatives"'], fails: [0, 1] },
    ],
  },
  "spreadsheet-build/03-07-solution-columns-past-z#Your turn: the first four-letter column": { files: {"playground/js/four.js": "function columnName(index) {\n  let name = \"\";\n  while (index >= 0) {\n    name = String.fromCharCode(65 + (index % 26)) + name;\n    index = Math.floor(index / 26) - 1;\n  }\n  return name;\n}\n\nlet index = 0;\nwhile (columnName(index).length < 4) {\n  index++;\n}\nconsole.log(index);\n"}, run: ["git add playground", "git commit -m \"Find the first four-letter column\"", "git push"], wrong: [{ name: "one too early: the last three-letter column", files: {"playground/js/four.js": "function columnName(index) {\n  let name = \"\";\n  while (index >= 0) {\n    name = String.fromCharCode(65 + (index % 26)) + name;\n    index = Math.floor(index / 26) - 1;\n  }\n  return name;\n}\n\nlet index = 0;\nwhile (columnName(index).length < 4) {\n  index++;\n}\nconsole.log(index - 1);\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [0] }, { name: "committed but not pushed", files: {"playground/js/four.js": "function columnName(index) {\n  let name = \"\";\n  while (index >= 0) {\n    name = String.fromCharCode(65 + (index % 26)) + name;\n    index = Math.floor(index / 26) - 1;\n  }\n  return name;\n}\n\nlet index = 0;\nwhile (columnName(index).length < 4) {\n  index++;\n}\nconsole.log(index);\n"}, run: ["git add playground", "git commit -m \"Practise in the playground\""], fails: [2] }] },

  'spreadsheet-build/03-06-columns-past-z#Merge the sprint and push': {
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
