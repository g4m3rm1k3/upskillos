// What a learner does at each step of "Python Becomes Software" (ml-software), for the walkthrough
// test (mlProduction.desktop.test.js). Keyed "<lesson file name>#<step title>".
//
// By default a step's file (its ```lang file=... block) is typed in for you. An entry adds:
//   run:   commands the lesson tells the learner to type in the terminal (PowerShell)
//   posix: the same commands for macOS and Linux, when `run` uses PowerShell-only words
//   write: { path: content } files the learner writes with no target block (a challenge step)
//   wrong: wrong answers, tried on a copy of the project before the step; each lists the
//          indexes of the step's checks that must fail ("fails").
//   edit:  [[from, to], ...] applied to the step's own target, written to the step's file
//          (how a wrong answer is usually made: the right file with one mistake in it).

const MIN_LENGTH_STATS = `import re
from collections import Counter

WORD = re.compile(r"[^\\W_]+(?:'[^\\W_]+)*")


def count_characters(text: str) -> int:
    return len(text)


def count_lines(text: str) -> int:
    return len(text.splitlines())


def words(text: str) -> list[str]:
    return WORD.findall(text.lower())


def count_words(text: str) -> int:
    return len(words(text))


def most_common(text: str, n: int, ignore: frozenset[str] = frozenset(), min_length: int = 1) -> list[tuple[str, int]]:
    counts = Counter(word for word in words(text) if word not in ignore and len(word) >= min_length)
    ranked = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
    return ranked[:n]
`;

const CHALLENGE_FILES = {
  'textstats/stats.py': MIN_LENGTH_STATS,
  'challenge.toml': 'top = 3\nmin_length = 6\n',
};

// The challenge's other files are made by small edits to the files the lesson already gave.
const CHALLENGE_EDITS = {
  'textstats/config.py': [
    ['    ignore: frozenset[str] = frozenset()\n', '    ignore: frozenset[str] = frozenset()\n    min_length: int = 1\n'],
    ['KNOWN_KEYS = {"top", "ignore"}', 'KNOWN_KEYS = {"top", "ignore", "min_length"}'],
    ['    return Settings(top=top, ignore=frozenset(word.lower() for word in ignore))',
      '    min_length = data.get("min_length", Settings.min_length)\n    if isinstance(min_length, bool) or not isinstance(min_length, int) or min_length < 1:\n        raise ConfigError(f"{path}: min_length must be a whole number of at least 1")\n    return Settings(top=top, ignore=frozenset(word.lower() for word in ignore), min_length=min_length)'],
  ],
  'textstats/cli.py': [
    ['def build_report(text: str, top: int = 5, ignore: frozenset[str] = frozenset()) -> str:', 'def build_report(text: str, top: int = 5, ignore: frozenset[str] = frozenset(), min_length: int = 1) -> str:'],
    ['stats.most_common(text, top, ignore)', 'stats.most_common(text, top, ignore, min_length)'],
    ['print(build_report(text, top, settings.ignore))', 'print(build_report(text, top, settings.ignore, settings.min_length))'],
  ],
  'tests/test_stats.py': [
    ['    assert stats.most_common("The cat", 1, ignore=frozenset({"the"})) == [("cat", 1)], "ignored words match in any case"\n',
      '    assert stats.most_common("The cat", 1, ignore=frozenset({"the"})) == [("cat", 1)], "ignored words match in any case"\n\n\ndef test_most_common_min_length_leaves_out_short_words():\n    assert stats.most_common("a bb ccc bb", 5, min_length=2) == [("bb", 2), ("ccc", 1)]\n'],
  ],
};

export const WALKTHROUGH = {
  // ── 0.1 ──────────────────────────────────────────────────────────────────
  '00-01-a-script-that-works-once#A Python of its own': {
    run: ['python -m venv .venv'],
    wrong: [{ name: 'did nothing', fails: [0, 1] }],
  },
  '00-01-a-script-that-works-once#Pin what the project needs': {
    wrong: [{ name: 'did not pin pytest', edit: [['pytest==9.1.1', 'pytest']], fails: [0] }],
  },
  '00-01-a-script-that-works-once#Install it': {
    run: ['.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '00-01-a-script-that-works-once#The script everyone writes first': {
    wrong: [{ name: 'counted characters as words', edit: [['words = len(text.split())', 'words = len(text)']], fails: [0] }],
  },

  // ── 0.2 ──────────────────────────────────────────────────────────────────
  '00-02-functions-you-can-test#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '00-02-functions-you-can-test#Count characters and lines': {
    wrong: [{ name: 'counted line breaks', edit: [['len(text.splitlines())', 'text.count("\\n")']], fails: [0] }],
  },
  '00-02-functions-you-can-test#What is a word?': {
    wrong: [
      { name: 'split on whitespace', edit: [['return WORD.findall(text.lower())', 'return text.lower().split()']], fails: [0] },
      { name: 'forgot to lowercase', edit: [['return WORD.findall(text.lower())', 'return WORD.findall(text)']], fails: [0] },
    ],
  },
  '00-02-functions-you-can-test#Count the words': {
    wrong: [{ name: 'counted whitespace-separated pieces', edit: [['return len(words(text))', 'return len(text.split())']], fails: [0] }],
  },
  '00-02-functions-you-can-test#The most common words': {
    wrong: [
      { name: 'no tie-break', edit: [['key=lambda pair: (-pair[1], pair[0])', 'key=lambda pair: -pair[1]']], fails: [0] },
      { name: 'reversed the whole sort', edit: [['key=lambda pair: (-pair[1], pair[0])', 'key=lambda pair: (pair[1], pair[0]), reverse=True']], fails: [0] },
    ],
  },
  '00-02-functions-you-can-test#Let the standard library count': {
    wrong: [{ name: "used Counter's own most_common", edit: [['    ranked = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))\n    return ranked[:n]', '    return counts.most_common(n)']], fails: [0] }],
  },
  '00-02-functions-you-can-test#Run only when run': {
    wrong: [{ name: 'called main() unconditionally', edit: [['if __name__ == "__main__":\n    main()', 'main()']], fails: [1] }],
  },

  // ── 0.3 ──────────────────────────────────────────────────────────────────
  '00-03-a-package-with-a-command-line#Why a package': {
    run: ['mkdir textstats', 'move stats.py textstats'],
    posix: ['mkdir textstats', 'mv stats.py textstats/'],
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      { name: 'copied instead of moving', run: ['mkdir textstats', 'copy stats.py textstats'], posix: ['mkdir textstats', 'cp stats.py textstats/'], fails: [1] },
    ],
  },
  '00-03-a-package-with-a-command-line#Point the tests at the package': {
    wrong: [{ name: 'kept the old import', edit: [['from textstats import stats', 'import stats']], fails: [0] }],
  },
  '00-03-a-package-with-a-command-line#Read the new tests': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '00-03-a-package-with-a-command-line#Build the report': {
    wrong: [{ name: 'always lists five words', edit: [['stats.most_common(text, top)', 'stats.most_common(text, 5)']], fails: [0] }],
  },
  '00-03-a-package-with-a-command-line#Arguments from the command line': {
    wrong: [
      { name: 'parses the real command line', edit: [['args = parser.parse_args(argv)', 'args = parser.parse_args()']], fails: [0] },
      { name: 'reads --top as text', edit: [['parser.add_argument("--top", type=int, default=5,', 'parser.add_argument("--top", default=5,']], fails: [0] },
    ],
  },
  '00-03-a-package-with-a-command-line#Run the package': {
    wrong: [{ name: 'imports main but never calls it', edit: [['raise SystemExit(main())', '']], fails: [0, 2] }],
  },
  '00-03-a-package-with-a-command-line#Retire count.py': {
    run: ['del count.py'],
    posix: ['rm count.py'],
    wrong: [{ name: 'kept count.py', fails: [0] }],
  },

  // ── 0.4 ──────────────────────────────────────────────────────────────────
  '00-04-when-things-go-wrong#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '00-04-when-things-go-wrong#Which encoding?': {
    wrong: [{ name: 'left the encoding to the system', edit: [['Path(path).read_text(encoding="utf-8")', 'Path(path).read_text()']], fails: [1] }],
  },
  '00-04-when-things-go-wrong#Read through one function': {
    wrong: [{ name: 'still opens the file itself', edit: [['    text = read_text(args.file)\n', '    with open(args.file) as f:\n        text = f.read()\n']], fails: [1] }],
  },
  '00-04-when-things-go-wrong#Words in any language': {
    wrong: [
      { name: 'kept the English-only pattern', edit: [["[^\\W_]+(?:'[^\\W_]+)*", "[a-z0-9]+(?:'[a-z0-9]+)*"]], fails: [0] },
      { name: 'used \\w, which keeps underscores', edit: [["[^\\W_]+(?:'[^\\W_]+)*", "\\w+(?:'\\w+)*"]], fails: [0] },
    ],
  },
  '00-04-when-things-go-wrong#Fail with a message, not a traceback': {
    wrong: [
      { name: 'printed errors to standard output', edit: [['it is not UTF-8 text", file=sys.stderr)', 'it is not UTF-8 text")'], ['{error.strerror}", file=sys.stderr)', '{error.strerror}")']], fails: [0] },
      { name: 'only caught a missing file', edit: [['    except OSError as error:', '    except FileNotFoundError as error:']], fails: [0] },
    ],
  },
  '00-04-when-things-go-wrong#Say what the types are': {
    wrong: [{ name: 'annotated words as returning a str', edit: [['def words(text: str) -> list[str]:', 'def words(text: str) -> str:']], fails: [0] }],
  },

  // ── 0.5 ──────────────────────────────────────────────────────────────────
  '00-05-settings-and-your-own-tests#Load the settings': {
    wrong: [
      { name: 'accepts misspelt keys', edit: [['    if unknown:\n        raise ConfigError(f"{path}: unknown setting {unknown[0]!r}")\n', '']], fails: [0] },
      { name: 'accepts top = true', edit: [['    if isinstance(top, bool) or not isinstance(top, int) or top < 1:', '    if not isinstance(top, int) or top < 1:']], fails: [0] },
      { name: 'kept the ignore list as written', edit: [['frozenset(word.lower() for word in ignore)', 'frozenset(ignore)']], fails: [0] },
    ],
  },
  '00-05-settings-and-your-own-tests#Ignore words when counting': {
    wrong: [{ name: 'accepts ignore but ignores it', edit: [['Counter(word for word in words(text) if word not in ignore)', 'Counter(words(text))']], fails: [0] }],
  },
  '00-05-settings-and-your-own-tests#Wire it into the command line': {
    wrong: [
      { name: 'defaulted --top to 5, so the settings file never applies', edit: [['parser.add_argument("--top", type=int, default=None,', 'parser.add_argument("--top", type=int, default=5,']], fails: [1] },
      { name: 'the settings file beats the command line', edit: [['top = args.top if args.top is not None else settings.top', 'top = settings.top']], fails: [2] },
    ],
  },
  '00-05-settings-and-your-own-tests#The test that broke': {
    wrong: [{ name: 'fixture not applied to every test', edit: [['@pytest.fixture(autouse=True)', '@pytest.fixture']], fails: [0] }],
  },
  '00-05-settings-and-your-own-tests#Challenge: a minimum word length': {
    write: CHALLENGE_FILES,
    patch: CHALLENGE_EDITS,
    wrong: [
      { name: 'did nothing', fails: [0, 1] },
      {
        name: 'left short words out of the word count too',
        write: { 'challenge.toml': 'top = 3\nmin_length = 6\n', 'textstats/stats.py': MIN_LENGTH_STATS.replace('return len(words(text))', 'return len([w for w in words(text) if len(w) >= 6])') },
        patch: CHALLENGE_EDITS,
        fails: [2],
      },
    ],
  },
};
