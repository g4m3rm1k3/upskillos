import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TRACKS } from './trackLoader.js';
import { typeJavaStep } from './javaEngineering.walkthrough.js';

// Opt in to real dependency resolution. No JDK or Maven is installed by this test.
// JAVA_COURSE_MAVEN=/absolute/path/to/mvn [JAVA_COURSE_REPOSITORY=/cache] npx vitest run ...
const maven = process.env.JAVA_COURSE_MAVEN;
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'java-engineering-walk-'));
const lessons = TRACKS['java-engineering'];
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));
function run(args) {
  const cache = process.env.JAVA_COURSE_REPOSITORY;
  const result = spawnSync(maven, ['-B', '-ntp', ...(cache ? [`-Dmaven.repo.local=${cache}`] : []), ...args],
    { cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
  return { code: result.status, output: `${result.stdout || ''}\n${result.stderr || ''}`, error: result.error };
}
function assertBuild(result, expected = 0) {
  expect(result.error, result.output).toBeUndefined();
  expect(result.code, result.output).toBe(expected);
}

describe.skipIf(!maven)('Common Ground real Java walkthrough', () => {
  it('replays the typed sequence, observes meaningful red, then passes each Java milestone', () => {
    for (const lesson of lessons) {
      for (const step of lesson.steps) {
        typeJavaStep(root, step);
        if (step.optional) continue;
        if (step.checks.some(c => c.kind === 'run' && /^mvn /.test(c.args[0]) && c.opts.exit === '1')) {
          const red = run(step.title === 'Turn examples into assertions' ? ['-Dtest=TitlesTest', 'test'] : ['test']);
          assertBuild(red, 1);
          expect(red.output).toMatch(/UnsupportedOperationException|Failures: [1-9]/);
          expect(red.output).not.toContain('COMPILATION ERROR');
        } else if (step.checks.some(c => c.kind === 'run' && /^mvn /.test(c.args[0]) && !c.opts.exit)) {
          // Reflection files and manual Git exercises are reviewed by humans;
          // this harness verifies executable Java milestones, not their understanding.
          if (step.title !== 'Prepare a real development folder') {
            assertBuild(run(step.title === 'Choose build plugins explicitly' ? ['compile'] : ['test']));
          }
        }
      }
    }
  }, 900000);

  it('rejects plausible regressions in title validation, transactions and authorization', () => {
    const mutations = [
      ['Titles.java', 'title.isEmpty() || title.length() > 80', 'title.length() > 800', 'TitlesTest'],
      ['JdbcTasks.java', 'return transaction.execute(tx -> {', 'java.util.function.Supplier<Task> operation = () -> {', 'JdbcTest'],
      ['SecurityConfig.java', '.requestMatchers("/api/**").hasRole("EDITOR")', '.requestMatchers("/api/**").authenticated()', 'ApiTest'],
    ];
    for (const [name, before, after, suite] of mutations) {
      const file = path.join(root, 'src/main/java/workspace', name);
      const original = fs.readFileSync(file, 'utf8');
      expect(original).toContain(before);
      let changed = original.replace(before, after);
      if (name === 'JdbcTasks.java') changed = changed.replace('        });\n    }\n}', '        };\n        return operation.get();\n    }\n}');
      fs.writeFileSync(file, changed);
      try {
        const result = run([`-Dtest=${suite}`, 'test']);
        assertBuild(result, 1);
        expect(result.output).not.toContain('COMPILATION ERROR');
        expect(result.output).toMatch(/Failures: [1-9]/);
      } finally { fs.writeFileSync(file, original); }
    }
    assertBuild(run(['test']));
  }, 300000);
});
