#!/usr/bin/env python3
"""Compile Yahtzee lesson snapshots and execute real C++ behavioral tests.

Run from any directory. Requires Python 3 and a C++17 compiler (CXX or g++).
All builds are temporary. No learner files or generated catalogues are modified.
Exercise completions are author-only fixtures, never automatically supplied to learners.
"""
from pathlib import Path
import json
import os
import re
import subprocess
import tempfile

REPO = Path(__file__).resolve().parents[1]
BASE = REPO / 'src/labs/project-studio/scrap/Yahtzee in C++'
COMPILER = os.environ.get('CXX', 'g++')
FLAGS = ['-std=c++17', '-Wall', '-Wextra', '-Wpedantic', '-Werror']

def run(args, cwd, input=None, expected=0):
    result = subprocess.run(args, cwd=cwd, input=input, text=True, capture_output=True, timeout=60)
    if result.returncode != expected:
        raise AssertionError(f'{args}: expected {expected}, got {result.returncode}\n{result.stdout}\n{result.stderr}')
    return result.stdout

def targets(text):
    return re.findall(r'```(?:cpp|text) file=(\S+)[^\n]*\n(.*?)```', text, re.S)

def save(folder, name, content):
    dest = folder / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(content)

with tempfile.TemporaryDirectory(prefix='yahtzee-course-') as folder:
    project = Path(folder)
    # Intermediate opening/completion steps run in yahtzeeTeaching.desktop.test.js.
    # Reconstruct the established multi-file path, preserving author answers to earlier tasks.
    for chapter in sorted(BASE.iterdir()):
        if not chapter.is_dir() or not ('01' <= chapter.name[:2] <= '06'):
            continue
        for lesson in sorted(chapter.glob('*.md')):
            for name, content in targets(lesson.read_text()): save(project, name, content)
        for support in (chapter / 'support').rglob('*'):
            if support.is_file(): save(project, str(support.relative_to(chapter / 'support')), support.read_text())
    completions = REPO / 'src/labs/project-studio/yahtzeeFixtures/exercise-completions.json'
    for name, content in json.loads(completions.read_text()).items(): save(project, name, content)
    for lesson in sorted((BASE / '07 Finish and Explain').glob('*.md')):
        for name, content in targets(lesson.read_text()): save(project, name, content)
    for support in (BASE / '07 Finish and Explain/support').rglob('*'):
        if support.is_file(): save(project, str(support.relative_to(BASE / '07 Finish and Explain/support')), support.read_text())
    run([COMPILER, *FLAGS, '@sources.txt', '-o', 'game'], project)
    sources = (project / 'sources.txt').read_text().split()
    sources.remove('main.cpp')
    for test in ['test_complete_rules', 'test_complete_game']:
        run([COMPILER, *FLAGS, f'tests/{test}.cpp', *sources, '-o', test], project)
        output = run([f'./{test}'], project)
        assert 'PASS' in output
        print(output.strip())
    # Whole executable: real main, two matches with replay, and early EOF.
    categories = [*range(1, 12), 13, 12]
    match = ''.join(f'{c}\n' for c in categories)
    output = run(['./game', '--fast', '--rolls', '1'], project,
                 input='1\nAda\n' + match + 'y\n' + match + 'n\n')
    assert output.count('Game over.') == 2
    assert output.count('Winner: Ada') == 2
    run(['./game', '--fast'], project, input='', expected=1)
    run(['./game', '--rolls', '4'], project, input='', expected=2)
    # Mutation evidence: tests reject early bonus award and bypassed Joker legality.
    correct = (project / 'Scorecard.cpp').read_text()
    mutants = {
        'bonus on rejected action': correct.replace(
            '    if (!canRecord(i, counts)) return false;',
            '    if (isJoker(counts)) extraYahtzeePoints += 100;\n    if (!canRecord(i, counts)) return false;'),
        'Joker placement bypass': correct.replace('    if (!isJoker(counts)) return true;', '    return true;'),
    }
    for label, mutant in mutants.items():
        assert mutant != correct
        save(project, 'Scorecard.cpp', mutant)
        run([COMPILER, *FLAGS, 'tests/test_complete_rules.cpp', *sources, '-o', 'mutant'], project)
        output = run(['./mutant'], project, expected=1)
        assert 'FAIL' in output
        print('Rejected mutation:', label)
    save(project, 'Scorecard.cpp', correct)
    print('PASS: rule and game acceptance; executable replay/EOF/CLI; two rejected mutations.')
