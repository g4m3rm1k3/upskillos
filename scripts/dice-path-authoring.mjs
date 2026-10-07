// Shared authoring helpers. Answers stay in author-side walkthrough fixtures.
import fs from 'node:fs';
import { learningIntro } from './dice-learning-contracts.mjs';
import { cppProse } from './dice-prose.mjs';
export function author({ key, title, order, fixture, test }) {
const trackTitle = title;
const root = 'src/labs/project-studio/tracks/' + key;
fs.mkdirSync(root, {recursive:true});
const fixtures = {};
const ids = [];
let current;
const fence = (language, text) => `\`\`\`${language}\n${text.trim()}\n\`\`\`\n`;
const predict = (question, answer, other, explain) => fence('predict', `question: ${question}\nchoice: ${answer}\nchoice: ${other}\nanswer: ${answer}\nexplain: ${explain}`);
const compile = file => `run "g++ -std=c++20 -Wall -Wextra -pedantic ${file} -o lesson"`;
const run = (output, input, extra = '') => `run "./lesson"${input === undefined ? '' : ` stdin=${JSON.stringify(input)}`}${output === undefined ? '' : ` stdout=${JSON.stringify(output)}`}${extra ? ` ${extra}` : ''}`;
const program = body => `#include <iostream>\nint main() {\n${body}\n    return 0;\n}`;
function lesson(id, title, intro) {
  intro = learningIntro(id, intro);
  ids.push(id);
  current = { id, text: `---\ntitle: ${title}\ntrack: ${trackTitle}\ntrackOrder: ${order}\nruntime: cpp\nconsole: true\n---\n\n${intro}\n\n` };
}
function step(title, prose, file = null, target = null, explain = '', checks = '', action = {}) {
  current.text += `## ${title}\n\n${cppProse(prose)}\n\n`;
  if (file) current.text += `**Edit \`${file}\`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.\n\n` + fence(`${file.endsWith('CMakeLists.txt') ? 'cmake' : 'cpp'} file=${file}`, target) + '\n';
  current.text += cppProse(explain) + '\n\n';
  if (checks) current.text += fence('check', checks) + '\n';
  fixtures[`${current.id}#${title.replace(/\s*\{#[a-z0-9-]+\}$/, '')}`] = { wrong: [], ...action };
}
function guided(title, prose, file, target, explain, output, input, mutation) {
  step(title, prose, file, target,
    explain + '\n\n**Run it yourself:**\n\n' + fence('text', `g++ -std=c++20 -Wall -Wextra -pedantic ${file} -o lesson\n./lesson`) +
    (input === undefined ? '' : `\nType \`${input.trim()}\` and press Enter.\n`) +
    (output === undefined ? '\nThe program finishes without printing anything.\n' : '\nExpected output:\n\n' + fence('text', output)),
    compile(file) + '\n' + run(output, input), mutation ? { wrong: [{ name: 'plausible incorrect edit', files: { [file]: target.replace(...mutation) }, fails: [1] }] } : {});
}
function practice(title, brief, file, solution, cases, hints, bad, explain, review = {}) {
  const checks = [compile(file), ...cases.map(c => {
    const other = cases.find(other => other.out && other.out !== c.out);
    const options = c.opts ?? '';
    return run(c.out, c.input, options + (other && !options.includes('without=') ? ` without=${JSON.stringify(other.out)}` : ''));
  })];
  const needsInput = cases.some(c => c.input !== undefined);
  checks.push(...(review.checks ?? []));
  const distinct = [...new Set(cases.map(c => c.out).filter(Boolean))];
  const wrong = bad.map(b => ({ name: b.name, files: { [file]: b.code }, fails: b.fails }));
  if (distinct.length > 1) wrong.push({
    name: 'prints every example without computing',
    files: { [file]: '#include <iostream>\nint main() { std::cout << ' + JSON.stringify(distinct.join('')) + '; return 0; }' },
    fails: [1],
  });
  wrong.push(...(review.wrong ?? []));
  const examples = needsInput
    ? '| Input | Required output | Exit status |\n|---|---|---|\n' + cases.map(c => `| ${c.input.trim() || '(end of input)'} | ${c.out?.trim().replaceAll('\n', ' / ') ?? '(no required output)'} | ${c.opts?.match(/\bexit=(\d+)/)?.[1] ?? '0'} |`).join('\n')
    : '**Required output:**\n\n' + fence('text', cases[0].out);
  step(`Your turn — ${title}`, `**No solution is shown.** Create \`${file}\` yourself. ${brief}\n\n` +
    examples + '\n\nBuild and run using the commands below. ' + (needsInput ? 'For an interactive run, type one example input and press Enter.' : 'This program takes no input and should finish by itself.') + '\n\n' +
    fence('text', `g++ -std=c++20 -Wall -Wextra -pedantic ${file} -o lesson\n./lesson`) + '\n' + fence('hints', `nudge: ${hints[0]}\nconcept: ${hints[1]}\nshape: ${hints[2]}`),
    null, null, explain + '\n\nA green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.', checks.join('\n'),
    { files: { [file]: solution }, wrong });
}
function end() { fs.writeFileSync(`${root}/${current.id}.md`, current.text); }


function finish() {
 fs.writeFileSync('src/labs/project-studio/tracks/' + fixture + '.walkthrough.js', '// Generated author-side answers; never supplied to learner files.\nexport const WALKTHROUGH = ' + JSON.stringify(fixtures, null, 2) + ';\n');
 fs.writeFileSync('src/labs/project-studio/' + test + '.desktop.test.js', `import { walkCppTrack } from './walkCppTrack.js';\nimport { WALKTHROUGH } from './tracks/${fixture}.walkthrough.js';\nawait walkCppTrack({ trackKey: '${key}', title: '${title}', walkthrough: WALKTHROUGH, lessonIds: ${JSON.stringify(ids)} });\n`);
}
return { fence, predict, compile, run, program, lesson, step, guided, practice, end, finish };
}
