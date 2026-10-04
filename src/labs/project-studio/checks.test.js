import { describe, expect, it } from 'vitest';
import { parseCheckLine, parseChecks } from './checks.js';
import { parseLesson } from './parseTrack.js';

describe('parseCheckLine', () => {
  it('reads a kind and its arguments', () => {
    expect(parseCheckLine('file hello.js')).toMatchObject({ kind: 'file', args: ['hello.js'], opts: {}, hint: null });
  });

  it('groups quoted words and unescapes \\" inside them', () => {
    const c = parseCheckLine('contains index.html "<td class=\\"cell\\">"');
    expect(c.args).toEqual(['index.html', '<td class="cell">']);
  });

  it('treats key=value and key="a value" as options', () => {
    const c = parseCheckLine('run "node hello.js" exit=0 stdout="Hello from Node"');
    expect(c.args).toEqual(['node hello.js']);
    expect(c.opts).toEqual({ exit: '0', stdout: 'Hello from Node' });
  });

  it('keeps a quoted argument that contains = as an argument', () => {
    const c = parseCheckLine('contains notes.txt "a=b"');
    expect(c.args).toEqual(['notes.txt', 'a=b']);
    expect(c.opts).toEqual({});
  });

  it('takes everything after a bare -- as the hint', () => {
    const c = parseCheckLine('file hello.js -- Save the file with Ctrl+S -- then check again.');
    expect(c.args).toEqual(['hello.js']);
    expect(c.hint).toBe('Save the file with Ctrl+S -- then check again.');
  });

  it('does not treat a quoted "--" as the hint marker', () => {
    const c = parseCheckLine('run "git log --oneline"');
    expect(c.args).toEqual(['git log --oneline']);
    expect(c.hint).toBeNull();
  });

  it('lets label= replace the generated description', () => {
    expect(parseCheckLine('file hello.js').label).toBe('hello.js exists');
    expect(parseCheckLine('file hello.js label="You saved hello.js"').label).toBe('You saved hello.js');
    expect(parseCheckLine('file hello.js label="x"').opts).toEqual({});
  });

  it('rejects unknown kinds and wrong argument counts, so lesson typos fail loudly', () => {
    expect(() => parseCheckLine('fiel hello.js')).toThrow(/Unknown check kind "fiel"/);
    expect(() => parseCheckLine('contains index.html')).toThrow(/takes 2 arguments, got 1/);
    expect(() => parseCheckLine('git-clean extra')).toThrow(/takes 0 arguments/);
    expect(() => parseCheckLine('contains a "unclosed')).toThrow(/Unclosed quote/);
  });
});

describe('run with stdin', () => {
  it('describes the input it types', () => {
    const c = parseCheckLine('run "./calc" stdin="3 4\\n" stdout="7"');
    expect(c.opts.stdin).toBe('3 4\n');
    expect(c.label).toBe('`./calc` given the input “3 4” succeeds and prints “7”');
  });
});

describe('run with without=', () => {
  it('describes the text that must not appear', () => {
    expect(parseCheckLine('run "./t" stdout="a" without="b"').label).toBe('`./t` succeeds and prints “a” and doesn\'t print “b”');
  });
});

describe('tests', () => {
  it('describes the test program and the tests it must include', () => {
    expect(parseCheckLine('tests "./build/calc_tests"').label).toBe('every test in `./build/calc_tests` passes');
    const c = parseCheckLine('tests "./build/calc_tests" require="adds, divides" -- Rebuild first.');
    expect(c.label).toBe('every test in `./build/calc_tests` passes, including adds, divides');
    expect(c.hint).toBe('Rebuild first.');
  });
});

describe('parseChecks', () => {
  it('skips blank lines and # comments, and accepts CRLF', () => {
    const checks = parseChecks('# the file\r\nfile a.txt\r\n\r\n  git-repo  \r\n');
    expect(checks.map((c) => c.kind)).toEqual(['file', 'git-repo']);
  });
});

describe('every bundled track', () => {
  it('parses, and every step changes at most one file', async () => {
    const { TRACKS } = await import('./trackLoader.js');
    const problems = [];
    for (const [track, lessons] of Object.entries(TRACKS)) {
      for (const lesson of lessons) {
        for (const step of lesson.steps) {
          if (step.extraTargets?.length) problems.push(`${track}/${lesson.id} "${step.title}": more than one file= block (${[step.file, ...step.extraTargets].join(', ')})`);
        }
      }
    }
    expect(problems).toEqual([]);
  }, 60000); // loads every track (hundreds of lesson files); slow under a full parallel run
});

describe('parseLesson with checks', () => {
  const md = [
    '---',
    'title: One',
    'track: Build a Spreadsheet',
    '---',
    '',
    'Intro text.',
    '',
    '## Make a file',
    '',
    'Type this.',
    '',
    '```check',
    'file hello.js',
    '```',
    '',
    '```js file=hello.js',
    'console.log("hi")',
    '```',
    '',
    'Why it works.',
    '',
    '## Run it',
    '',
    '```powershell',
    'node hello.js',
    '```',
    '',
    '```check',
    'run "node hello.js" stdout="hi"',
    '```',
  ].join('\r\n');

  const lesson = parseLesson(md, 'spreadsheet-build/00-01');

  it('reads frontmatter from a CRLF file', () => {
    expect(lesson.title).toBe('One');
    expect(lesson.meta.track).toBe('Build a Spreadsheet');
    expect(lesson.intro).toBe('Intro text.');
  });

  it('takes check fences out of the prose and attaches them to the step', () => {
    const [make, run] = lesson.steps;
    expect(make.checks.map((c) => c.kind)).toEqual(['file']);
    expect(make.prose).toBe('Type this.');
    expect(make.file).toBe('hello.js');
    expect(make.target).toBe('console.log("hi")');
    expect(make.explain).toBe('Why it works.');
    expect(run.checks[0]).toMatchObject({ kind: 'run', args: ['node hello.js'], opts: { stdout: 'hi' } });
    expect(run.prose).toContain('```powershell');
    expect(run.prose).not.toContain('```check');
    expect(run.file).toBeNull();
  });
});
