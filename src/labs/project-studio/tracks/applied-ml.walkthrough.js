// What a learner does at each step of the Applied Machine Learning series, for the walkthrough
// test (appliedMl.desktop.test.js). One project folder runs through every aml-* track, so keys
// are "<track>/<lesson file name>#<step title>".
//
// By default a step's file (its ```lang file=... block) is typed in for you. An entry adds:
//   run:   commands the lesson tells the learner to type in the terminal (PowerShell)
//   files: { path: content } the learner writes with no code shown (Your turn, challenges):
//          the reference answer, which must pass the step's checks
//   wrong: wrong answers, tried on a copy of the project before the step; each lists the
//          indexes of the step's checks that must fail ("fails").
//   edit:  [[from, to], ...] applied to the step's own target, written to the step's file.
//   editFiles: { path: [[from, to], ...] } applied to a file as it is in the project now.

const L01 = 'aml-python/00-01-the-terminal-and-your-first-program';
const L02 = 'aml-python/00-02-numbers-names-and-text';
const L03 = 'aml-python/00-03-lists-and-loops';
const L04 = 'aml-python/00-04-decisions';
const L05 = 'aml-python/00-05-functions';
const L06 = 'aml-python/00-06-files-and-dictionaries';
const L07 = 'aml-python/00-07-the-ci-report';

const UPLOAD = `upload = [4.0, 4.4, 4.7, 5.0, 5.6, 5.7, 6.2, 6.6, 6.7, 7.0, 7.4, 7.9, 8.3, 8.6, 9.0]
total = 0
for seconds in upload:
    total = total + seconds
mean = total / len(upload)
in_order = sorted(upload)
median = in_order[len(in_order) // 2]
print(f"runs: {len(upload)}")
print(f"mean: {mean:.2f}")
print(f"median: {median}")
print(f"fastest: {min(upload)}")
print(f"slowest: {max(upload)}")
print(f"first to last: {upload[-1] - upload[0]} s slower")
`;

const MEDIAN_ANY = `five = [4.0, 4.4, 4.7, 5.0, 5.6]
six = [4.0, 4.4, 4.7, 5.0, 5.6, 5.7]

in_order = sorted(five)
middle = len(in_order) // 2
if len(in_order) % 2 == 1:
    median = in_order[middle]
else:
    median = (in_order[middle - 1] + in_order[middle]) / 2
print(f"median of {len(five)}: {median}")

in_order = sorted(six)
middle = len(in_order) // 2
if len(in_order) % 2 == 1:
    median = in_order[middle]
else:
    median = (in_order[middle - 1] + in_order[middle]) / 2
print(f"median of {len(six)}: {median}")
`;

// Lesson 0.5's Your turn, applied to ci_report.py as the step before left it.
const SINCE = `def since_last_failure(results):
    count = 0
    for result in results:
        if result == "fail":
            count = 0
        else:
            count = count + 1
    return count


assert median([3, 1, 2]) == 2`;
const SINCE_WRONG = SINCE.replace('        if result == "fail":\n            count = 0\n        else:\n            count = count + 1\n', '        if result == "pass":\n            count = count + 1\n');
const SIGNUP_LINE = 'print(f"test_signup: {failure_rate(signup):.0%} failed, {verdict(signup)}")';
const SIGNUP_LINE_SINCE = 'print(f"test_signup: {failure_rate(signup):.0%} failed, {verdict(signup)}, {since_last_failure(signup)} nights since last failure")';
const SINCE_ASSERTS = `assert verdict(["pass", "pass", "fail"]) == "failing"
assert since_last_failure(["pass"] * 15) == 15
assert since_last_failure(["pass", "fail"]) == 0`;
const sinceEdits = (body, asserts = SINCE_ASSERTS) => [
  ['assert median([3, 1, 2]) == 2', body],
  ['assert verdict(["pass", "pass", "fail"]) == "failing"', asserts],
  [SIGNUP_LINE, SIGNUP_LINE_SINCE],
];

const RATES = `import csv

with open("data/ci_runs.csv", newline="") as f:
    rows = list(csv.DictReader(f))

results_by_test = {}
for row in rows:
    test = row["test"]
    if test not in results_by_test:
        results_by_test[test] = []
    results_by_test[test].append(row["result"])

for test, results in results_by_test.items():
    print(f"{test}: {results.count('fail') / len(results):.0%} failed")
`;

// Lesson 0.7: the table loop as the step before left it, and the Your turn's version of it.
const TABLE_LOOP = `for test, seconds in seconds_by_test.items():
    results = results_by_test[test]
    print(f"{test:<15}{len(seconds):>5}{failure_rate(results):>8.0%}{median(seconds):>8.1f}"
          f"{mean(seconds):>8.2f}{max(seconds):>9.1f}  {verdict(results)}")
`;
const ATTENTION = `flaky = []
slow = []
outliers = []
${TABLE_LOOP}    if verdict(results) == "flaky":
        flaky.append(test)
    if median(seconds) > 5.0:
        slow.append(test)
    if mean(seconds) > 1.5 * median(seconds):
        outliers.append(test)

print()
print("Needs attention:")
print(f"  flaky: {', '.join(flaky)}")
print(f"  slow (median over 5.0 s): {', '.join(slow)}")
print(f"  outliers (mean over 1.5 x median): {', '.join(outliers)}")
`;
const OUTLIER_PRINT = "print(f\"  outliers (mean over 1.5 x median): {', '.join(outliers)}\")\n";
const failBuild = (exit) => [
  ['outliers = []\n', 'outliers = []\nfailing = []\n'],
  ['        outliers.append(test)\n', '        outliers.append(test)\n    if verdict(results) == "failing":\n        failing.append(test)\n'],
  [OUTLIER_PRINT, `${OUTLIER_PRINT}print(f"  failing now: {', '.join(failing)}")\n${exit}`],
];


const ABOUT = `print("ci-toolkit")
print("A report on nightly test runs.")
print("15 runs x 6 tests =", 15 * 6, "results")
`;

const BUDGET = `latest = 9.0
budget = 10.0
print(f"test_upload: {latest} s of {budget} s budget ({latest / budget:.0%})")
print(f"test_upload: {budget - latest} s to spare")
`;

// ---- Chapter 1: A Project of Its Own ----
const L11 = 'aml-project/01-01-a-python-of-its-own';
const L12 = 'aml-project/01-02-saving-your-work-with-git';
const L13 = 'aml-project/01-03-modules';
const L14 = 'aml-project/01-04-a-package';
const L15 = 'aml-project/01-05-tests-with-pytest';
const L16 = 'aml-project/01-06-failing-well';
const PIP_INSTALL = '.venv\\Scripts\\python -m pip install -r requirements.txt';

const ENV_CHECK = `import sys

if sys.prefix == sys.base_prefix:
    print(r"virtual environment: no (run it with .venv\\Scripts\\python)")
    sys.exit(1)

import pytest

print("virtual environment: yes")
print(f"pytest: {pytest.__version__}")
`;

const README = `# ci-toolkit

Reports on a CI system's test runs: which tests are flaky, slow,
failing now, or have outlier runs.

### Setup

    python -m venv .venv
    .venv\\Scripts\\python -m pip install -r requirements.txt

### Run the report

    python ci_report.py data/ci_runs.csv
`;

const HISTORY_FUNCTIONS = `def flips(results):
    count = 0
    for i in range(1, len(results)):
        if results[i] != results[i - 1]:
            count = count + 1
    return count


def verdict(results):
    if results.count("fail") == 0:
        return "stable"
    if flips(results) > 2:
        return "flaky"
    if results[-1] == "fail":
        return "failing"
    return "broke, then fixed"


def since_last_failure(results):
    count = 0
    for result in results:
        if result == "fail":
            count = 0
        else:
            count = count + 1
    return count
`;
const HISTORY_GUARD = `

if __name__ == "__main__":
    assert flips(["pass", "fail", "pass"]) == 2
    assert verdict(["pass", "pass", "fail"]) == "failing"
    assert since_last_failure(["pass"] * 15) == 15
    assert since_last_failure(["pass", "fail"]) == 0
    print("history.py: all checks passed")
`;
const HISTORY = HISTORY_FUNCTIONS + HISTORY_GUARD;

// ci_report.py after lesson 1.3's Your turn: the step before's file, minus the history
// functions and asserts, plus the import.
const HISTORY_IN_REPORT = `${HISTORY_FUNCTIONS}

assert flips(["pass", "fail", "pass"]) == 2
assert verdict(["pass", "pass", "fail"]) == "failing"
assert since_last_failure(["pass"] * 15) == 15
assert since_last_failure(["pass", "fail"]) == 0

`;
const REPORT_IMPORTS = 'import sys\n\nfrom runs import group_by_test, load_runs\nfrom stats import failure_rate, mean, median\n\n\n';
const REPORT_IMPORTS_WITH_HISTORY = 'import sys\n\nfrom history import verdict\nfrom runs import group_by_test, load_runs\nfrom stats import failure_rate, mean, median\n\n';

const SLOW_TESTS = `from citools.runs import group_by_test, load_runs
from citools.stats import median

rows = load_runs("data/ci_runs.csv")
seconds_by_test, results_by_test = group_by_test(rows)
for test, seconds in seconds_by_test.items():
    if median(seconds) > 5.0:
        print(f"{test}: median {median(seconds)} s")
`;

const TEST_HISTORY = `from citools.history import flips, since_last_failure, verdict


def test_flips_counts_changes():
    assert flips(["pass", "fail", "pass"]) == 2


def test_flips_ignores_first_and_last():
    assert flips(["fail", "pass"]) == 1


def test_stable():
    assert verdict(["pass", "pass", "pass"]) == "stable"


def test_flaky():
    assert verdict(["pass", "fail", "pass", "fail", "pass"]) == "flaky"


def test_failing():
    assert verdict(["pass", "pass", "fail"]) == "failing"


def test_fixed():
    assert verdict(["fail", "fail", "pass"]) == "broke, then fixed"


def test_two_flips_is_not_flaky():
    assert verdict(["pass", "fail", "pass"]) == "broke, then fixed"


def test_since_last_failure():
    assert since_last_failure(["pass", "fail", "pass", "pass"]) == 2
    assert since_last_failure(["pass"] * 3) == 3
`;
const WEAK_TEST_HISTORY = `from citools.history import verdict


def test_failing():
    assert verdict(["pass", "pass", "fail"]) == "failing"
`;

const RESULT_CHECK_AFTER = `            raise DataError(f"line {line}: seconds should be a number, got {row['seconds']!r}") from None
`;
const RESULT_CHECK = `${RESULT_CHECK_AFTER}        if result not in ("pass", "fail"):
            raise DataError(f"line {line}: result should be pass or fail, got {result!r}")
`;
const RESULT_TEST = `        group_by_test([{"test": "test_a", "result": "pass"}])


def test_a_result_that_isnt_pass_or_fail():
    with pytest.raises(DataError, match="line 2: result should be pass or fail, got 'skipped'"):
        group_by_test([{"test": "test_a", "seconds": "1.0", "result": "skipped"}])
`;
const commit = (message) => ['git add .', `git commit -m "${message}"`];


export const WALKTHROUGH = {
  [`${L01}#Meet the terminal`]: { run: ['mkdir explore'] },
  [`${L01}#Several instructions, in order`]: {
    wrong: [
      { name: 'quotes on the sum too', edit: [['print(15 * 6)', 'print("15 * 6")']], fails: [0] },
    ],
  },
  [`${L01}#When it breaks: a NameError`]: {
    wrong: [
      { name: 'print spelled correctly', edit: [['pritn', 'print']], fails: [0] },
    ],
  },
  [`${L01}#Your turn: about.py`]: {
    files: { 'about.py': ABOUT },
    wrong: [
      { name: '90 typed in', files: { 'about.py': ABOUT.replace('15 * 6', '90') }, fails: [1] },
      { name: 'the sum inside the quotes', files: { 'about.py': ABOUT.replace('=", 15 * 6, "results', '= 15 * 6 results') }, fails: [0] },
      { name: 'no full stop', files: { 'about.py': ABOUT.replace('runs."', 'runs"') }, fails: [0] },
    ],
  },

  [`${L02}#Arithmetic`]: {
    wrong: [
      { name: 'brackets on the last line too', edit: [['print(4.1 + 4.1 + 3.8 / 3)', 'print((4.1 + 4.1 + 3.8) / 3)']], fails: [0] },
    ],
  },
  [`${L02}#Fix it`]: {
    wrong: [
      { name: 'adds a string instead', edit: [['print(float(seconds) + 1)', 'print(seconds + "1")']], fails: [0] },
    ],
  },
  [`${L02}#Your turn: budget.py`]: {
    files: { 'explore/budget.py': BUDGET },
    wrong: [
      { name: 'percentage typed in', files: { 'explore/budget.py': BUDGET.replace('{latest / budget:.0%}', '90%') }, fails: [1] },
      { name: 'no percentage format', files: { 'explore/budget.py': BUDGET.replace(':.0%', '') }, fails: [0] },
      { name: 'spare typed in', files: { 'explore/budget.py': BUDGET.replace('{budget - latest}', '1.0') }, fails: [2] },
    ],
  },
  [`${L03}#A loop`]: {
    wrong: [
      { name: 'done inside the loop', edit: [['print("done")', '    print("done")']], fails: [1] },
    ],
  },
  [`${L03}#Adding up any number of timings`]: {
    wrong: [
      { name: 'total reset inside the loop', edit: [['total = 0\nfor seconds in export:\n', 'for seconds in export:\n    total = 0\n']], fails: [0] },
    ],
  },
  [`${L03}#Your turn: upload.py`]: {
    files: { 'explore/upload.py': UPLOAD },
    wrong: [
      { name: 'uses sum', files: { 'explore/upload.py': UPLOAD.replace('total = 0\nfor seconds in upload:\n    total = total + seconds\n', 'total = sum(upload)\n') }, fails: [1, 2] },
      { name: 'mean not rounded', files: { 'explore/upload.py': UPLOAD.replace('{mean:.2f}', '{mean}') }, fails: [0] },
      { name: 'first minus last', files: { 'explore/upload.py': UPLOAD.replace('upload[-1] - upload[0]', 'upload[0] - upload[-1]') }, fails: [0] },
    ],
  },

  [`${L04}#A better verdict`]: {
    wrong: [
      { name: 'two flips count as flaky', edit: [['flips > 2', 'flips >= 2']], fails: [0] },
    ],
  },
  [`${L04}#Your turn: a median for any length`]: {
    files: { 'explore/median_any.py': MEDIAN_ANY },
    wrong: [
      { name: 'always the upper middle', files: { 'explore/median_any.py': MEDIAN_ANY.replaceAll('(in_order[middle - 1] + in_order[middle]) / 2', 'in_order[middle]') }, fails: [0] },
      { name: 'answers typed in', files: { 'explore/median_any.py': 'print("median of 5: 4.7")\nprint("median of 6: 4.85")\n' }, fails: [1] },
    ],
  },

  [`${L05}#return is not print`]: {
    wrong: [
      { name: 'show_mean returns', edit: [['    print(sum(values) / len(values))', '    return sum(values) / len(values)']], fails: [0] },
    ],
  },
  [`${L05}#Saying what went wrong`]: {
    wrong: [
      { name: 'returns 0 for an empty list', edit: [['        raise ValueError("mean() of an empty list")', '        return 0']], fails: [1] },
      { name: 'temporary call left in', edit: [[SIGNUP_LINE, `${SIGNUP_LINE}\nprint(mean([]))`]], fails: [0] },
    ],
  },
  [`${L05}#Your turn: nights since the last failure`]: {
    editFiles: { 'ci_report.py': sinceEdits(SINCE) },
    wrong: [
      { name: 'counts every pass', editFiles: { 'ci_report.py': sinceEdits(SINCE_WRONG, 'assert verdict(["pass", "pass", "fail"]) == "failing"\nassert since_last_failure(["pass"] * 15) == 15') }, fails: [0, 1] },
      { name: 'answer typed into the report', editFiles: { 'ci_report.py': [[SIGNUP_LINE, SIGNUP_LINE.replace('{verdict(signup)}")', '{verdict(signup)}, 5 nights since last failure")')]] }, fails: [1, 2] },
    ],
  },

  [`${L06}#Your turn: failure rates from the file`]: {
    files: { 'explore/rates.py': RATES },
    wrong: [
      { name: 'counts instead of rates', files: { 'explore/rates.py': RATES.replace("{results.count('fail') / len(results):.0%}", "{results.count('fail')}") }, fails: [0] },
      { name: 'output typed in', files: { 'explore/rates.py': ['test_login: 0%', 'test_signup: 13%', 'test_search: 20%', 'test_upload: 0%', 'test_checkout: 0%', 'test_export: 7%'].map((l) => `print("${l} failed")`).join('\n') + '\n' }, fails: [1] },
    ],
  },

  [`${L07}#Read the file`]: {
    wrong: [
      { name: 'old lists left in', edit: [['rows = load_runs(', 'export = [4.1]\nrows = load_runs(']], fails: [1] },
    ],
  },
  [`${L07}#A table`]: {
    wrong: [
      { name: 'header narrower than the rows', edit: [["{'test':<15}", "{'test':<14}"]], fails: [0] },
    ],
  },
  [`${L07}#The file as an argument`]: {
    wrong: [
      { name: 'no usage check', edit: [['if len(sys.argv) != 2:\n    print("usage: python ci_report.py RUNS_CSV")\n    sys.exit(2)\n', '']], fails: [1] },
      { name: 'exits with 1', edit: [['sys.exit(2)', 'sys.exit(1)']], fails: [1] },
    ],
  },
  [`${L07}#Your turn: what needs attention`]: {
    editFiles: { 'ci_report.py': [[TABLE_LOOP, ATTENTION]] },
    wrong: [
      { name: 'no blank line', editFiles: { 'ci_report.py': [[TABLE_LOOP, ATTENTION.replace('print()\n', '')]] }, fails: [1] },
      { name: 'names typed in', editFiles: { 'ci_report.py': [[TABLE_LOOP, ATTENTION.replace("{', '.join(flaky)}", 'test_search')]] }, fails: [2] },
      { name: 'separator after every name', editFiles: { 'ci_report.py': [[TABLE_LOOP, ATTENTION.replaceAll("{', '.join(", "{''.join(n + ', ' for n in ")]] }, fails: [0] },
    ],
  },
  [`${L07}#Challenge: fail the build`]: {
    editFiles: { 'ci_report.py': failBuild('if failing:\n    sys.exit(1)\n') },
    wrong: [
      { name: 'always exits with 1', editFiles: { 'ci_report.py': failBuild('sys.exit(1)\n') }, fails: [0] },
    ],
  },

  [`${L11}#Make a virtual environment`]: { run: ['python -m venv .venv'] },
  [`${L11}#Pin what the project needs`]: {
    wrong: [
      { name: 'one equals sign', files: { 'requirements.txt': 'pytest=9.1.1\n' }, fails: [0] },
      { name: 'not pinned', files: { 'requirements.txt': 'pytest\n' }, fails: [0] },
    ],
  },
  [`${L11}#Install it`]: { run: [PIP_INSTALL] },
  [`${L11}#Throw it away and rebuild`]: { run: ['Remove-Item -Recurse .venv', 'python -m venv .venv', PIP_INSTALL] },
  [`${L11}#Your turn: an environment check`]: {
    files: { 'explore/env_check.py': ENV_CHECK },
    wrong: [
      { name: 'the comparison the wrong way round', files: { 'explore/env_check.py': ENV_CHECK.replace('sys.prefix == sys.base_prefix', 'sys.prefix != sys.base_prefix') }, fails: [0, 1] },
      { name: 'imports pytest before the check', files: { 'explore/env_check.py': `import pytest\n${ENV_CHECK.replace('import pytest\n\n', '')}` }, fails: [2] },
      { name: 'the message, but exit code 0', files: { 'explore/env_check.py': ENV_CHECK.replace('sys.exit(1)', 'sys.exit(0)') }, fails: [1, 2] },
    ],
  },

  [`${L12}#Tell Git who you are`]: {
    run: ['git config --global user.name "Ada Lovelace"', 'git config --global user.email "ada@example.com"', 'git config --global init.defaultBranch main'],
  },
  [`${L12}#A repository`]: { run: ['git init'] },
  [`${L12}#Ignore what's generated`]: {
    wrong: [
      { name: 'venv/ without the dot', files: { '.gitignore': 'venv/\n__pycache__/\n' }, fails: [0] },
      { name: 'only .venv', files: { '.gitignore': '.venv/\n' }, fails: [1] },
    ],
  },
  [`${L12}#The first commit`]: {
    run: commit('The CI report from Chapter 0'),
    wrong: [
      { name: 'staged but not committed', run: ['git add .'], fails: [0, 2] },
    ],
  },
  [`${L12}#See a change, then undo it`]: {
    editFiles: { 'ci_report.py': [["{'test':<15}", "{'TEST':<15}"]] },
    run: ['git restore ci_report.py'],
    wrong: [
      { name: 'the change kept', editFiles: { 'ci_report.py': [["{'test':<15}", "{'TEST':<15}"]] }, fails: [0, 1] },
    ],
  },
  [`${L12}#Your turn: a README`]: {
    files: { 'README.md': README },
    run: ['git add README.md', 'git commit -m "Add a README with setup and run instructions"'],
    wrong: [
      { name: 'written but not committed', files: { 'README.md': README }, fails: [2, 3, 4] },
      { name: 'no run command', files: { 'README.md': README.replace('    python ci_report.py data/ci_runs.csv\n', '') }, run: ['git add README.md', 'git commit -m "Add a README"'], fails: [1] },
    ],
  },

  [`${L13}#Use it from the report`]: {
    wrong: [
      { name: 'the import forgotten', edit: [['from stats import failure_rate, mean, median\n', '']], fails: [0] },
    ],
  },
  [`${L13}#Checks that belong to the module`]: {
    wrong: [
      { name: 'no guard: the checks run on import', edit: [['if __name__ == "__main__":\n', 'if True:\n']], fails: [1] },
    ],
  },
  [`${L13}#The report, importing both`]: {
    wrong: [
      { name: 'import csv left behind', edit: [['import sys\n', 'import csv\nimport sys\n']], fails: [2] },
    ],
  },
  [`${L13}#Your turn: history.py`]: {
    files: { 'history.py': HISTORY },
    editFiles: { 'ci_report.py': [[HISTORY_IN_REPORT, ''], [REPORT_IMPORTS, REPORT_IMPORTS_WITH_HISTORY]] },
    run: commit('Split ci_report.py into modules'),
    wrong: [
      { name: 'no guard in history.py', files: { 'history.py': HISTORY.replace('if __name__ == "__main__":\n', 'if True:\n') }, editFiles: { 'ci_report.py': [[HISTORY_IN_REPORT, ''], [REPORT_IMPORTS, REPORT_IMPORTS_WITH_HISTORY]] }, fails: [1] },
      { name: 'functions copied, not moved', files: { 'history.py': HISTORY }, editFiles: { 'ci_report.py': [[REPORT_IMPORTS, REPORT_IMPORTS_WITH_HISTORY]] }, fails: [3, 4] },
      { name: 'moved but not committed', files: { 'history.py': HISTORY }, editFiles: { 'ci_report.py': [[HISTORY_IN_REPORT, ''], [REPORT_IMPORTS, REPORT_IMPORTS_WITH_HISTORY]] }, fails: [5, 6] },
    ],
  },

  [`${L14}#A folder for the package`]: {
    run: ['mkdir citools', 'git mv stats.py citools/stats.py', 'git mv history.py citools/history.py', 'git mv runs.py citools/runs.py'],
  },
  [`${L14}#The report as a function`]: {
    wrong: [
      { name: 'sys.exit inside main', edit: [['from citools.history import verdict\n', 'import sys\n\nfrom citools.history import verdict\n'], ['        return 2\n', '        sys.exit(2)\n']], fails: [0] },
    ],
  },
  [`${L14}#Run the package`]: {
    wrong: [
      { name: 'the whole argv passed to main', edit: [['main(sys.argv[1:])', 'main(sys.argv)']], fails: [0, 1] },
    ],
  },
  [`${L14}#Retire ci_report.py`]: { run: ['git rm ci_report.py'] },
  [`${L14}#Describe the project`]: {
    wrong: [
      { name: 'no packages listed', edit: [['\n[tool.setuptools]\npackages = ["citools"]\n', '']], fails: [0] },
    ],
  },
  [`${L14}#Install it, editable`]: {
    run: [PIP_INSTALL],
  },
  [`${L14}#Your turn: use the package from a script`]: {
    files: { 'explore/slow_tests.py': SLOW_TESTS },
    wrong: [
      { name: 'its own median', files: { 'explore/slow_tests.py': SLOW_TESTS.replace('from citools.stats import median\n', '\n\ndef median(values):\n    s = sorted(values)\n    return s[len(s) // 2]\n\n') }, fails: [2] },
      { name: 'over 5.0 written as under', files: { 'explore/slow_tests.py': SLOW_TESTS.replace('> 5.0', '< 5.0') }, fails: [0] },
    ],
  },
  [`${L14}#Commit the package`]: {
    editFiles: { 'README.md': [['python ci_report.py data/ci_runs.csv', '.venv\\Scripts\\python -m citools data/ci_runs.csv']] },
    run: commit('Turn the report into an installable package'),
    wrong: [
      { name: 'README not updated', run: commit('Turn the report into a package'), fails: [0, 1] },
      { name: 'not committed', editFiles: { 'README.md': [['python ci_report.py data/ci_runs.csv', '.venv\\Scripts\\python -m citools data/ci_runs.csv']] }, fails: [2, 3] },
    ],
  },

  [`${L15}#Retire the guard`]: {
    wrong: [
      { name: 'guard left in', fails: [0] },
    ],
  },
  [`${L15}#Your turn: test history.py`]: {
    files: { 'tests/test_history.py': TEST_HISTORY },
    editFiles: { 'citools/history.py': [[HISTORY_GUARD, '\n']] },
    run: commit('Move the checks into pytest tests'),
    wrong: [
      { name: 'one weak test', files: { 'tests/test_history.py': WEAK_TEST_HISTORY }, editFiles: { 'citools/history.py': [[HISTORY_GUARD, '\n']] }, run: commit('Add history tests'), fails: [1] },
      { name: 'no boundary test: two flips', files: { 'tests/test_history.py': TEST_HISTORY.replace('def test_two_flips_is_not_flaky():\n    assert verdict(["pass", "fail", "pass"]) == "broke, then fixed"\n\n\n', '') }, editFiles: { 'citools/history.py': [[HISTORY_GUARD, '\n']] }, run: commit('Add history tests'), fails: [1] },
      { name: 'guard left in history.py', files: { 'tests/test_history.py': TEST_HISTORY }, run: commit('Add history tests'), fails: [2] },
    ],
  },

  [`${L16}#Your turn: results must be pass or fail`]: {
    editFiles: {
      'citools/runs.py': [[RESULT_CHECK_AFTER, RESULT_CHECK]],
      'tests/test_runs.py': [['        group_by_test([{"test": "test_a", "result": "pass"}])\n', RESULT_TEST]],
    },
    run: commit('Report bad data and missing files as errors'),
    wrong: [
      { name: 'capitals accepted', editFiles: { 'citools/runs.py': [[RESULT_CHECK_AFTER, RESULT_CHECK.replace('if result not in', 'if result.lower() not in')]], 'tests/test_runs.py': [['        group_by_test([{"test": "test_a", "result": "pass"}])\n', RESULT_TEST]] }, run: commit('Report bad results as errors'), fails: [0] },
      { name: 'no test for it', editFiles: { 'citools/runs.py': [[RESULT_CHECK_AFTER, RESULT_CHECK]] }, run: commit('Report bad results as errors'), fails: [2] },
      { name: 'not committed', editFiles: { 'citools/runs.py': [[RESULT_CHECK_AFTER, RESULT_CHECK]], 'tests/test_runs.py': [['        group_by_test([{"test": "test_a", "result": "pass"}])\n', RESULT_TEST]] }, fails: [5, 6] },
    ],
  },
};
