// checks.js
// Parses a lesson step's ```check fence into check objects, and describes each one in words
// for the lesson panel. The checks themselves run in the desktop app's main process
// (desktop/app/project-checks.cjs), against the learner's real project folder.
//
// One check per line:
//
//   file hello.js
//   contains index.html "<table"
//   run "node hello.js" stdout="Hello from Node" -- Save the file, then run it once yourself.
//   run "./calc" stdin="3 4\n" stdout="3 + 4 = 7"      (stdin= is typed into the program)
//   run "./tracer" without="destroy b"                (the output must not include the text)
//   tests "./build/calc_tests" require="adds negatives"  (a GoogleTest-style test program)
//   git-commits 2
//   page index.html "document.querySelectorAll('td').length" 26
//   keys practice/word.txt par=4     (saved in Neovim within 4 keystrokes, no arrows or mouse)
//
// Words are separated by spaces; "double quotes" group words, with \" \\ \n and \t inside.
// key=value words are options (key="a value" works too); label="..." replaces the generated
// description of the check. Everything after a bare -- is the
// hint shown when the check fails. Lines starting with # are comments.

export const CHECK_KINDS = new Set([
  'file', 'dir', 'missing', 'contains', 'lacks', 'matches', 'run', 'tests',
  'git-repo', 'git-commits', 'git-clean', 'git-tracked', 'git-untracked', 'git-ignored',
  'git-branch', 'git-has-branch', 'git-no-branch', 'git-merged', 'git-remote', 'git-pushed', 'git-config',
  'git-message', 'git-tag', 'page', 'keys',
]);

// How many positional arguments each kind needs, so a typo in a lesson fails loudly at
// parse time (and in the lesson tests) instead of silently checking the wrong thing.
const ARITY = {
  file: 1, dir: 1, missing: 1, contains: 2, lacks: 2, matches: 2, run: 1, tests: 1,
  'git-repo': 0, 'git-commits': 1, 'git-clean': 0, 'git-tracked': 1, 'git-untracked': 1, 'git-ignored': 1,
  'git-branch': 1, 'git-has-branch': 1, 'git-no-branch': 1, 'git-merged': [1, 2], 'git-remote': [0, 1], 'git-pushed': 0, 'git-config': 1,
  'git-message': 1, 'git-tag': 1, page: 3, keys: 1,
};

const ESCAPES = { '"': '"', '\\': '\\', n: '\n', t: '\t' };

function tokenize(line) {
  const tokens = [];
  let i = 0;
  let hint = null;
  while (i < line.length) {
    while (i < line.length && /\s/.test(line[i])) i++;
    if (i >= line.length) break;
    let text = '';
    let quoted = false;
    const startsQuoted = line[i] === '"';
    while (i < line.length && !/\s/.test(line[i])) {
      if (line[i] === '"') {
        quoted = true;
        i++;
        while (i < line.length && line[i] !== '"') {
          if (line[i] === '\\' && ESCAPES[line[i + 1]] !== undefined) { text += ESCAPES[line[i + 1]]; i += 2; continue; }
          text += line[i++];
        }
        if (line[i] !== '"') throw new Error(`Unclosed quote in check: ${line}`);
        i++;
      } else {
        text += line[i++];
      }
    }
    if (!quoted && text === '--') {
      hint = line.slice(i).trim() || null;
      break;
    }
    tokens.push({ text, startsQuoted });
  }
  return { tokens, hint };
}

export function parseCheckLine(line) {
  const { tokens, hint } = tokenize(line);
  if (tokens.length === 0) return null;
  const kind = tokens[0].text;
  if (!CHECK_KINDS.has(kind)) throw new Error(`Unknown check kind "${kind}" in: ${line}`);
  const args = [];
  const opts = {};
  for (const t of tokens.slice(1)) {
    // stdout="Hello" is an option; "a=b" (quoted from its first character) is an argument.
    const m = t.startsQuoted ? null : /^([a-z]+)=([\s\S]*)$/.exec(t.text);
    if (m) opts[m[1]] = m[2];
    else args.push(t.text);
  }
  const arity = ARITY[kind];
  const [lo, hi] = Array.isArray(arity) ? arity : [arity, arity];
  if (args.length < lo || args.length > hi) {
    throw new Error(`Check "${kind}" takes ${lo === hi ? lo : `${lo}–${hi}`} argument${hi === 1 ? '' : 's'}, got ${args.length}: ${line}`);
  }
  // label="..." replaces the generated description.
  const { label, ...rest } = opts;
  return { kind, args, opts: rest, hint, label: label ?? describeCheck(kind, args, rest) };
}

export function parseChecks(text) {
  return String(text)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map(parseCheckLine)
    .filter(Boolean);
}

export function describeCheck(kind, args, opts = {}) {
  const [a, b] = args;
  switch (kind) {
    case 'file': return `${a} exists`;
    case 'dir': return `the folder ${a} exists`;
    case 'missing': return `${a} doesn't exist`;
    case 'contains': return `${a} contains ${b}`;
    case 'lacks': return `${a} no longer contains ${b}`;
    case 'matches': return `${a} has the expected content`;
    case 'keys': return `${a} was saved in Neovim within ${opts.par} keystrokes, without arrow keys or the mouse`;
    case 'run': {
      const given = opts.stdin != null ? ` given the input “${opts.stdin.trim().replace(/\n/g, ' ⏎ ')}”` : '';
      const parts = [`\`${a}\`${given} ${opts.exit != null && opts.exit !== '0' ? `exits with code ${opts.exit}` : 'succeeds'}`];
      if (opts.stdout != null) parts.push(`prints “${opts.stdout}”`);
      if (opts.without != null) parts.push(`doesn't print “${opts.without}”`);
      if (opts.stderr != null) parts.push(`reports “${opts.stderr}”`);
      return parts.join(' and ');
    }
    case 'tests': {
      const required = String(opts.require ?? '').split(/[\s,]+/).filter(Boolean);
      return `every test in \`${a}\` passes${required.length ? `, including ${required.join(', ')}` : ''}`;
    }
    case 'git-repo': return 'the project folder is a Git repository';
    case 'git-commits': return Number(a) === 1 ? 'there is at least one commit' : `there are at least ${a} commits`;
    case 'git-clean': return 'every change is committed';
    case 'git-tracked': return `${a} is committed`;
    case 'git-untracked': return `${a} is not in the last commit`;
    case 'git-ignored': return `Git ignores ${a}`;
    case 'git-branch': return `you're on the branch ${a}`;
    case 'git-has-branch': return `a branch called ${a} exists`;
    case 'git-no-branch': return `the branch ${a} is deleted`;
    case 'git-merged': return `${a} is merged into ${b || 'the current branch'}`;
    case 'git-remote': return `a remote called ${a || 'origin'} is set up`;
    case 'git-pushed': return 'every commit is pushed';
    case 'git-config': return `Git knows your ${a === 'user.name' ? 'name' : a === 'user.email' ? 'email' : a}`;
    case 'git-message': return `a commit message mentions “${a}”`;
    case 'git-tag': return `the tag ${a} exists`;
    case 'page': return `on ${a}, \`${b}\` is ${args[2]}`;
    default: return kind;
  }
}
