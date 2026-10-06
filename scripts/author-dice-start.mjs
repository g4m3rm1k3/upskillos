// Authoring source: visible incremental targets, never learner-supplied implementations.
// Run from the repository root: node scripts/author-dice-start.mjs
import fs from 'node:fs';
const root = 'src/labs/project-studio/tracks/dice-path-start';
fs.mkdirSync(root, { recursive: true });
const fixtures = {};
const ids = [];
let current;
const fence = (language, text) => `\`\`\`${language}\n${text.trim()}\n\`\`\`\n`;
const predict = (question, answer, other, explain) => fence('predict', `question: ${question}\nchoice: ${answer}\nchoice: ${other}\nanswer: ${answer}\nexplain: ${explain}`);
const compile = file => `run "g++ -std=c++20 -Wall -Wextra -pedantic ${file} -o lesson"`;
const run = (output, input, extra = '') => `run "./lesson"${input === undefined ? '' : ` stdin=${JSON.stringify(input)}`}${output === undefined ? '' : ` stdout=${JSON.stringify(output)}`}${extra ? ` ${extra}` : ''}`;
const program = body => `#include <iostream>\nint main() {\n${body}\n    return 0;\n}`;
function lesson(id, title, intro) {
  ids.push(id);
  current = { id, text: `---\ntitle: ${title}\ntrack: C++ Games — Start Here\ntrackOrder: 4\nruntime: cpp\nconsole: true\n---\n\n${intro}\n\n` };
}
function step(title, prose, file = null, target = null, explain = '', checks = '', action = {}) {
  current.text += `## ${title}\n\n${prose}\n\n`;
  if (file) current.text += `**Edit \`${file}\`.** Type the green additions and remove the red lines in the live comparison. Keep unchanged lines. Save before compiling.\n\n` + fence(`cpp file=${file}`, target) + '\n';
  current.text += explain + '\n\n';
  if (checks) current.text += fence('check', checks) + '\n';
  fixtures[`${current.id}#${title}`] = { wrong: [], ...action };
}
function guided(title, prose, file, target, explain, output, input, mutation) {
  step(title, prose, file, target,
    explain + '\n\n**Run it yourself:**\n\n' + fence('text', `g++ -std=c++20 -Wall -Wextra -pedantic ${file} -o lesson\n./lesson`) +
    (input === undefined ? '' : `\nType \`${input.trim()}\` and press Enter.\n`) +
    (output === undefined ? '\nThe program finishes without printing anything.\n' : '\nExpected output:\n\n' + fence('text', output)),
    compile(file) + '\n' + run(output, input), mutation ? { wrong: [{ name: 'plausible incorrect edit', files: { [file]: target.replace(...mutation) }, fails: [1] }] } : {});
}
function practice(title, brief, file, solution, cases, hints, bad, explain) {
  const checks = [compile(file), ...cases.map(c => run(c.out, c.input, c.opts ?? ''))];
  const needsInput = cases.some(c => c.input !== undefined);
  const examples = needsInput
    ? '| Input | Required output |\n|---|---|\n' + cases.map(c => `| ${c.input.trim() || '(end of input)'} | ${c.out?.trim().replaceAll('\n', ' / ') ?? c.opts} |`).join('\n')
    : '**Required output:**\n\n' + fence('text', cases[0].out);
  step(`Your turn — ${title}`, `**No solution is shown.** Create \`${file}\` yourself. ${brief}\n\n` +
    examples + '\n\nBuild and run using the commands below. ' + (needsInput ? 'For an interactive run, type one example input and press Enter.' : 'This program takes no input and should finish by itself.') + '\n\n' +
    fence('text', `g++ -std=c++20 -Wall -Wextra -pedantic ${file} -o lesson\n./lesson`) + '\n' + fence('hints', `nudge: ${hints[0]}\nconcept: ${hints[1]}\nshape: ${hints[2]}`),
    null, null, explain + '\n\nA green check confirms these cases. Also explain how your program works with the reference hidden; the runner cannot grade that explanation.', checks.join('\n'),
    { files: { [file]: solution }, wrong: bad.map(b => ({ name: b.name, files: { [file]: b.code }, fails: b.fails })) });
}
function end() { fs.writeFileSync(`${root}/${current.id}.md`, current.text); }

lesson('00-meet-dice-duel', 'A00 — Play the game you will build',
  'You can write a Python script. You do not need to know C++, classes, tests, graphics or machine learning. Start by playing the game: the reason for every compiler command and class later is to build something you can understand, change and run yourself.');
step('A decision worth building a game around',
  'You have 4 points. Your opponent has 7. There are 5 more points in your unbanked pot. Would you keep them, or risk another roll?\n\n' +
  fence('figure', 'name: dice-start/DiceDuelPreview\ncaption: A playable browser rule preview, with repeatable teaching dice and a fixed bank-at-4 opponent. No trained model is running here.') +
  '\n**Start with the game, not setup.** Try a match. Use New match to start from zero, or Reset decision to return to the difficult choice. The comparison buttons isolate your move before the opponent responds.');
step('Explain the rules with one position',
  'Two players race to **12**. Your permanent score is separate from this turn\'s **pot**, the points you have not banked.\n\n- Roll 2–6: add the face to the pot and choose again.\n- Roll 1: lose the pot and pass the turn; your permanent score survives.\n- Bank: add a positive pot to your score, empty it and pass. Banking zero is unavailable.\n- If score plus pot reaches 12 after a roll, you win immediately. You need not bank first.\n\n' +
  predict('At score 4 and pot 5, rolling 1 leaves which permanent score?', '4', '0', 'Only the unbanked pot is lost. The previously banked four points remain.') +
  '\nUse the comparison controls in the previous step after committing to your prediction. Explain the difference between losing the pot and losing the whole match.');
step('What you will build, and why finish',
  'Your first project is a **terminal game**: text and commands, like a Python script you can run yourself. You will write its rules, separate them into real files, protect state with classes, and write tests that catch mistakes.\n\nFirst the opponent follows a rule: bank once the pot reaches four. Later you will implement **Q-learning**, an algorithm that adjusts estimates of which actions lead to useful outcomes. You will train on many games, evaluate against a baseline, save the learned numbers, and play against the saved model. A model is not automatically good just because training finished.\n\nAfter that come SDL3 windows and input, graphics and shaders, then Vulkan. Those later chapters are still being authored. This first chapter teaches the C++ vocabulary that makes their code understandable.\n\n**Your finish line:** choose one feature you personally want—an alternative display, match history, or an opponent comparison. Write it in your own notes with a sentence explaining who it helps. Revisit that choice when the project supports it.');
step('Your turn — Trace without code',
  '**Hide the rules and reason first.** From score 4, opponent 7, pot 5, record the new score, pot and next player for banking, rolling 1 and rolling 3. Then use the comparison buttons to check.\n\n' +
  fence('hints', 'nudge: Treat permanent score and unbanked pot as two different places.\nconcept: Banking moves the pot; a bust discards it; an ordinary roll adds to it.\nshape: Check whether score plus the new pot reaches twelve before passing a turn.') +
  '\n**Explain:** why should drawing a score on a screen never decide whether banking is legal? The rules should work whether input comes from a human, an automated test or a learning agent. This is a reasoning task, not a machine-graded programming task.');
end();

lesson('01-source-to-program', 'A01 — Which program did you run?',
  'In the preview, the game could print a score. Here you make the first piece yourself: an executable that prints the game\'s name. By the end you can explain why editing source does not change a program you already compiled. No C++ knowledge is assumed.');
step('Choose a project folder and find the terminal',
  'In desktop Project Studio choose a new empty folder named `dice-lab`. A **folder** groups files; this is the root of your growing project. The editor changes text files. The **terminal** accepts commands that start programs. They are different tools.\n\nOpen the terminal in that folder. On Windows PowerShell, `Get-Location` prints its current folder; on macOS/Linux, use `pwd`. Confirm it is your chosen dice-lab folder. A **path** is a file\'s location; a relative path such as `hello.cpp` is interpreted from the current folder.\n\nType `g++ --version`. `g++` is the C++ compiler command; `--version` asks which build of the tool is installed. If it is unavailable, use Project Studio\'s Install C++ compiler control, then reopen the terminal. Browser readers need a local editor and compiler; the browser cannot run these desktop checks.',
  null, null, 'A **compiler** translates source text into a form your machine can execute and diagnoses language errors. The version report proves the compiler can start, not that your program is correct.', 'run "g++ --version"');
const empty = 'int main() {\n    return 0;\n}';
guided('A program can finish without printing',
  'Create `hello.cpp` in the project root. The `.cpp` suffix identifies C++ source. Type only this small program.\n\n`main` names the function where execution begins. A **function** is a named operation; we will write others later. Empty parentheses mean this version takes no named inputs. `int` says it returns a whole-number result. Braces enclose its body. `return 0;` ends it with a success status; the semicolon ends the statement. This status goes to the caller, not onto the screen.',
  'hello.cpp', empty,
  'The compile command selects C++20 with `-std=c++20`. `-Wall -Wextra -pedantic` request useful warnings and diagnostics. `-o lesson` names the output executable (`lesson.exe` on Windows). `./lesson` runs that executable from the current folder. Save, compile, then run only if compilation succeeded. A new prompt without printed text is the expected result, not a failure.', undefined);
const greeting = program('    std::cout << "Dice Duel\\n";');
guided('Give the program a voice',
  '`#include <iostream>` makes the standard stream declarations available before compilation. It belongs above main, outside its braces. `std::cout` names the standard output stream. `std::` qualifies a name in the standard-library namespace; think of it as specifying which collection of names you mean.\n\n`<<` sends the following value to that stream. Double quotes delimit text, and `\\n` inside the text requests a newline. These are C++ stream operators, not Python print syntax.\n\n' + predict('Does return 0 print a zero after the greeting?', 'No', 'Yes', 'Return supplies an exit status. Only the output-stream statement prints here.'),
  'hello.cpp', greeting,
  'Execution reaches the output statement, writes the text and newline, then returns success. Indentation helps the reader; braces define the C++ body. The include line is a preprocessing directive and does not end in a semicolon.', 'Dice Duel\n');
const renamed = greeting.replace('Dice Duel\\n', 'My Dice Duel\\n');
guided('An edit is not a new executable',
  'Change the greeting, then save. **Before compiling**, run `./lesson`. Predict which greeting you will see. Then compile and run again using the commands below.\n\nThis deliberate experiment separates the **source file**, the text you edit, from the **executable**, the output of compilation. The live diff compares source; it cannot rebuild the executable for you.',
  'hello.cpp', renamed,
  'Before rebuilding, the old executable still prints Dice Duel. After rebuilding, it prints My Dice Duel. If a compile fails, an older executable may remain. Do not run it and mistake that result for a successful test of your new source.', 'My Dice Duel\n');
step('Try it — Read your first diagnostic',
  'Remove the semicolon after the output statement, save and compile. Find the file name, line number and first diagnostic. The compiler may point at the following line because that is where it discovered the missing punctuation.\n\nRestore the semicolon, save and recompile before running. Next change only indentation; the result stays the same. Explain why braces matter more than indentation here.');
const helloPractice = program('    std::cout << "DICE LAB\\n";\n    std::cout << "Goal: reach 12\\n";');
practice('Introduce your project',
  'Write a program that prints the two lines below and returns success. Use your own statement layout; do not copy a completed program. This task practices assembling an entry point and output, not arithmetic.',
  'welcome.cpp', helloPractice, [{ out: 'DICE LAB\nGoal: reach 12\n' }],
  ['Start by identifying where execution begins.', 'Printing and returning an exit status are different operations.', 'Use the output stream for both lines and finish main successfully.'],
  [{ name: 'omits the second line', code: program('    std::cout << "DICE LAB\\n";'), fails: [1] }, { name: 'prints correct text but reports failure', code: helloPractice.replace('return 0;', 'return 1;'), fails: [1] }],
  'Before checking, name the source file and executable separately. Explain which must change when you edit the greeting. Keep this file: later practice files will also belong to you.');
end();

lesson('02-values-and-types', 'A02 — Make the score a calculation',
  'A real game cannot store every possible scoreboard as a separate message. It stores values and calculates what to print. You will make that change, then investigate a calculation that behaves differently from Python.');
const score = program('    int score = 4;\n    std::cout << "score=" << score << \'\\n\';');
guided('A name holds a value',
  'Create an `explore` folder inside dice-lab for small experiments, then `explore/values.cpp`. These experiments remain separate from the eventual game.\n\n`int score = 4;` creates a named whole-number object and initializes it to four. **Initialization** gives a new object its first value. A **type** determines the kinds of values and operations available. Unlike Python\'s growing integers, C++ int has a bounded range; our small scores fit.\n\nThe single-quoted `\'\\n\'` is one newline character. Chaining `<<` writes the label, then the current value, then the newline.',
  'explore/values.cpp', score,
  'The word score inside quotes would be literal text. The unquoted name score reads the object\'s value. Change the initial value to six, predict, run and restore four.', 'score=4\n');
const addition = program('    int score = 4;\n    score = score + 3;\n    std::cout << "score=" << score << \'\\n\';');
guided('Assignment changes an existing value',
  '`score = score + 3` reads the old value on the right, computes a new value and assigns it to the object on the left. It is not a mathematical claim that four equals seven.\n\n' + predict('After starting at 4 and assigning score + 3, what is stored?', '7', '3', 'The right-hand calculation uses the old four, then replaces it with seven.'),
  'explore/values.cpp', addition,
  '| Operation | Stored score |\n|---|---|\n| Initialize | 4 |\n| Calculate 4 + 3 | still 4 while calculating |\n| Assign result | 7 |\n\n`score += 3;` is a shorter addition-assignment spelling for this simple variable. Try it and compare, then keep either correct form.', 'score=7\n', undefined, ['score = score + 3;', 'score = 3;']);
const remaining = program('    const int target = 12;\n    int score = 4;\n    int remaining = target - score;\n    std::cout << "remaining=" << remaining << \'\\n\';');
guided('Protect a value that should not change',
  '`const int target` creates a whole-number value that this code cannot subsequently assign to. The target stays twelve while the player\'s score changes. `remaining` receives the result of subtraction; it is not a formula that automatically recalculates later.',
  'explore/remaining.cpp', remaining,
  'The order is: initialize target, initialize score, evaluate 12 - 4, initialize remaining with 8, print 8. If you later change score, remaining still holds its earlier result until you explicitly recompute it.', 'remaining=8\n');
const ratio = program('    int whole = 3 / 4;\n    double fraction = 3.0 / 4.0;\n    std::cout << "whole=" << whole << \'\\n\';\n    std::cout << "fraction=" << fraction << \'\\n\';');
guided('The operands choose the division',
  'A `double` stores an approximation to a real number. Write the following experiment, but commit to the prediction before running it. `3` is an integer literal; `3.0` is a floating-point literal.\n\n' + predict('What is 3 / 4 when both operands are integers?', '0', '0.75', 'Integer division discards the fractional part. At least one floating-point operand is needed here.'),
  'explore/division.cpp', ratio,
  'Three divided by four has zero whole units left in its integer result. `3.0 / 4.0` uses floating-point division and yields 0.75. Declaring the destination double does not repair integer division that already happened: `double x = 3 / 4;` stores zero. We avoid dividing by zero.', 'whole=0\nfraction=0.75\n', undefined, ['3.0 / 4.0', '3 / 4']);
step('Try it — Predict a stale calculation',
  'In explore/remaining.cpp, assign score = 9 after calculating remaining but before printing. Predict the output, then run: remaining still stores eight. Move the calculation below the assignment and it becomes three. Restore the original experiment.\n\nTry assigning to target and read the compiler error; then remove that assignment. Explain when const prevented a mistake and when execution order caused one.');
const arithmetic = program('    const int target = 12;\n    int score = 9;\n    double banked = 3.0 / 4.0;\n    std::cout << "remaining=" << target - score << \'\\n\';\n    std::cout << "fraction=" << banked << \'\\n\';');
practice('Calculate a small report',
  'Create the practice folder. Declare a constant target of 12 and a score of 9; compute the remaining points. Also compute three divided by four as a fraction. Print the labelled results. You have not learned input yet, so this task uses fixed starting data.',
  'practice/report.cpp', arithmetic, [{ out: 'remaining=3\nfraction=0.75\n' }],
  ['Separate the two calculations from the labels you print.', 'The type of the operands matters before a result is assigned.', 'Subtract score from target and use a floating-point operand for the ratio.'],
  [{ name: 'integer division loses fraction', code: arithmetic.replace('3.0 / 4.0', '3 / 4'), fails: [1] }, { name: 'adds rather than subtracts', code: arithmetic.replace('target - score', 'target + score'), fails: [1] }],
  'After the check, independently change the score to four and explain why remaining becomes eight. Restore nine for the check. Output checks alone cannot distinguish a calculation from memorized text in this fixed-data exercise; your changed-data experiment is part of completion.');
end();

lesson('03-input-and-failure', 'A03 — Let the player supply a value',
  'The scoreboard can calculate, but only for numbers written into its source. Now read a number while the program runs. The player can also type a word or close input, so a successful read must be checked before the number is used.');
const input = program('    int score = 0;\n    std::cin >> score;\n    std::cout << "remaining=" << 12 - score << \'\\n\';');
guided('Read a number during execution',
  '`std::cin` is the standard input stream. `>> score` asks it to extract an integer into score. For this first experiment, type a valid number. On a terminal the program may wait for you to type it and press Enter. Do not type C++ or shell commands at that point.\n\n' + predict('With input 9, must you recompile to calculate for 4 next?', 'No', 'Yes', 'The executable reads new input each time it runs; its source need not change.'),
  'explore/input.cpp', input,
  'Run once with nine and again with four: the results are three and eight. Initialization to zero happens before extraction, but it does not make a failed read valid. This intermediate program assumes valid numeric input; the next step removes that assumption.', 'remaining=3\n', '9\n');
const safe = program('    int score = 0;\n    if (!(std::cin >> score)) {\n        std::cerr << "Expected an integer\\n";\n        return 1;\n    }\n    std::cout << "remaining=" << 12 - score << \'\\n\';');
guided('Stop when extraction fails',
  '`if (condition)` runs its brace-enclosed body when the condition is true. A stream used as a condition reports whether extraction succeeded; `!` means not. Here the extra parentheses group the extraction before applying not.\n\n`std::cerr` writes diagnostics to the error stream, separately from normal output. Returning 1 reports failure and ends main immediately, so the calculation below is skipped. This is your first guarded branch; the next lesson explores decisions in more detail.',
  'explore/input.cpp', safe,
  '| Input | Extraction succeeds? | Path |\n|---|---|---|\n| 9 | yes | print remaining=3, return 0 |\n| cat | no | report error, return 1 |\n| input ends before a number | no | report error, return 1 |\n\nClosing input is called **end-of-file**, or EOF, even if no disk file is involved. In a terminal use Ctrl+Z then Enter on Windows, or Ctrl+D on an empty line on macOS/Linux. Check my work supplies input automatically.', 'remaining=3\n', '9\n');
step('Check both paths',
  'Run the safe program and type cat. It should report Expected an integer and stop without a remaining-points line. Run again with zero: zero is valid numeric input and prints twelve.\n\nThis reads an integer token, not a validated whole line: `12cats` can extract 12 and leave cats unread. Later command parsing will validate complete lines. Do not claim this program already rejects every malformed line.', null, null,
  'The checks distinguish error output from normal output and check the exit status. A program that prints an error but returns success fails the intended contract.',
  compile('explore/input.cpp') + '\n' + run(undefined, 'cat\n', 'stderr="Expected an integer" exit=1 without="remaining="') + '\n' + run('remaining=12\n', '0\n') + '\n' + run(undefined, '', 'stderr="Expected an integer" exit=1 without="remaining="'),
  { wrong: [{ name: 'reports an error but returns success', files: { 'explore/input.cpp': safe.replace('return 1;', 'return 0;') }, fails: [1, 3] }] });
step('Try it — Identify which program is waiting',
  'Start ./lesson without typing input. It is your program waiting for a value, not the compiler hanging. Type four, then run again and end input instead. Explain the different paths.\n\nTemporarily remove the guard and try a word. A computed output is not evidence of valid input. Restore the guard and rebuild before continuing.');
const sum = program('    int score = 0, pot = 0;\n    if (!(std::cin >> score >> pot)) {\n        std::cerr << "Expected two integers\\n";\n        return 1;\n    }\n    std::cout << "total=" << score + pot << \'\\n\';');
practice('Read a score and a pot',
  'Read two integers, a score and a pot, each between 0 and 12. For successfully extracted numbers print their sum with total=. If either extraction fails, print Expected two integers to the error stream, return 1 and print no total. Chaining `>>` reads the two fields in order. Complete-line validation is not required here.',
  'practice/input.cpp', sum,
  [{ input: '4 3\n', out: 'total=7\n', opts: 'without="total=8\\n"' }, { input: '2 6\n', out: 'total=8\n', opts: 'without="total=7\\n"' }, { input: 'cat\n', opts: 'stderr="Expected two integers" exit=1 without="total="' }, { input: '4\n', opts: 'stderr="Expected two integers" exit=1 without="total="' }],
  ['Both extractions must succeed before you calculate.', 'The stream reflects a failure in either extraction of the chain.', 'Guard the chained read, return on failure, then calculate and print the sum.'],
  [{ name: 'drops the previous score', code: sum.replace('score + pot', 'pot'), fails: [1] }, { name: 'claims success on bad input', code: sum.replace('return 1;', 'return 0;'), fails: [3] }],
  'Explain why a valid zero and a failed read are different. Identify one malformed whole line this token-based parser can still accept.');
end();

lesson('04-decisions-and-boundaries', 'A04 — Exactly twelve must count',
  'You can read a score. Now decide whether it has reached the target. A game that forgets equality can deny a legitimate win. You will test just below, exactly at and above a boundary, then combine conditions for a legal request.');
const decide = program('    int score = 0;\n    if (!(std::cin >> score)) return 1;\n    if (score >= 12) {\n        std::cout << "status=win\\n";\n    } else {\n        std::cout << "status=play\\n";\n    }');
guided('Choose one of two paths',
  '`>=` compares two values and produces a boolean result: true or false. It includes equality. `else` provides the alternative when the if condition is false; exactly one of these bodies runs. The short input guard uses the same behavior as last lesson, with a single statement as its body.\n\n' + predict('At score 12, should score >= 12 choose win?', 'Yes', 'No', 'At least twelve includes twelve itself. The boundary is part of the rule.'),
  'explore/decisions.cpp', decide,
  '| Score | score >= 12 | Output |\n|---|---|---|\n| 11 | false | status=play |\n| 12 | true | status=win |\n| 13 | true | status=win |\n\nThis is a threshold experiment, not the full game state: eventually a roll can win using score plus pot.', 'status=win\n', '12\n', ['score >= 12', 'score > 12']);
const both = program('    int pot = 0;\n    if (!(std::cin >> pot)) return 1;\n    bool positive = pot > 0;\n    bool within_limit = pot <= 11;\n    bool valid = positive && within_limit;\n    std::cout << "valid=" << valid << \'\\n\';');
guided('Both conditions must hold',
  '`bool` holds true or false. `&&` means both operands must be true. In this experiment a pot must lie from one through eleven inclusive; it is a range check, not the complete game\'s legal-action rule. By default the output stream prints booleans as 1 for true and 0 for false.\n\nC++ stops evaluating `&&` as soon as the left side is false, because the combined result is already known. This is called short-circuit evaluation.',
  'explore/range.cpp', both,
  'With pot=5, positive is true and within_limit is true, so valid is true. With pot=0, positive is false; with pot=12, within_limit is false. In both invalid cases valid is false. Read the expression as two separate questions before combining them.', 'valid=1\n', '5\n');
const either = program('    int pot = 0;\n    if (!(std::cin >> pot)) return 1;\n    bool outside = pot <= 0 || pot > 11;\n    std::cout << "outside=" << outside << \'\\n\';');
guided('Either failure can reject a request',
  '`||` means at least one condition is true. It stops evaluating once its left side is true. Compare an invalid low value OR an invalid high value. `!outside` would invert the result. Do not confuse logical OR with the single vertical bar used for a different operation later.\n\nEquality is written `==`; assignment is written `=`. Never use assignment when you intend a comparison.',
  'explore/outside.cpp', either,
  'For pot=12 the low test is false but the high test is true, making outside true. For pot=5 both are false. The two separate programs should report opposite booleans for the same input.', 'outside=1\n', '12\n', ['pot <= 0 || pot > 11', 'pot <= 0 && pot > 11']);
step('Try it — Find the smallest failing case',
  'Change >= to > in explore/decisions.cpp and run with 11, 12 and 13. Only twelve exposes the mistake. Restore >=.\n\nChange && to || in explore/range.cpp and try zero and twelve. Explain why at least one condition passes for either input even though neither belongs in the allowed range. Restore &&. These are boundary tests: examples at the point where a decision changes.');
const classification = program('    int score = 0, target = 0;\n    if (!(std::cin >> score >> target)) return 1;\n    if (score < target) {\n        std::cout << "result=below\\n";\n    } else if (score == target) {\n        std::cout << "result=exact\\n";\n    } else {\n        std::cout << "result=above\\n";\n    }');
practice('Distinguish below, exact and above',
  'Read a score and a target, both positive integers. Print exactly one labelled category. You can put another if inside an else, or write `else if`: it tests a second condition only when the first failed. Bad extraction returns 1. The target comes from input, not a hardcoded twelve.',
  'practice/classify.cpp', classification,
  [{ input: '11 12\n', out: 'result=below\n', opts: 'without="result=exact"' }, { input: '12 12\n', out: 'result=exact\n', opts: 'without="result=above"' }, { input: '13 12\n', out: 'result=above\n', opts: 'without="result=below"' }, { input: '7 7\n', out: 'result=exact\n' }],
  ['Exactly one output is needed, so connect the alternatives.', 'Equality is a separate case between less than and greater than.', 'Read both values, test less than, then equality, with the remaining branch handling greater than.'],
  [{ name: 'puts equality in below branch', code: classification.replace('score < target', 'score <= target'), fails: [2] }, { name: 'assumes target twelve', code: classification.replace('score == target', 'score == 12'), fails: [4] }],
  'Choose a different target and supply your own just-below, exact and just-above cases. Explain why many ordinary below-target tests would miss an equality bug.');
end();

lesson('05-functions-and-results', 'A05 — Write a calculation once',
  'A scoreboard needs remaining points for more than one player. Duplicating a calculation gives you several places to fix later. You will name the calculation, call it with different data, and distinguish returning an answer from printing a message.');
const functionCode = '#include <iostream>\nint points_needed(int score, int target) {\n    return target - score;\n}\nint main() {\n    std::cout << "first=" << points_needed(4, 12) << \'\\n\';\n    std::cout << "second=" << points_needed(9, 12) << \'\\n\';\n    return 0;\n}';
guided('A function returns to its caller',
  'Define points_needed above main so the compiler has seen it before a call. `int` before its name is the return type. Inside the parentheses, score and target are **parameters**, local names for the call\'s inputs. In points_needed(4, 12), four and twelve are the **arguments**, the values you supply. A comma separates them.\n\nA definition describes the work; its body runs when called. `return target - score` sends a value back to the caller.\n\n' + predict('Does defining points_needed above main immediately subtract anything?', 'No', 'Yes', 'Defining describes the operation. Each call supplies values and executes the body.'),
  'explore/functions.cpp', functionCode,
  '| Call | Local score | Local target | Returned value |\n|---|---|---|---|\n| points_needed(4, 12) | 4 | 12 | 8 |\n| points_needed(9, 12) | 9 | 12 | 3 |\n\nEach call has its own local parameters. Execution pauses in main, runs the function, then resumes where its result is needed. The **call stack** records active calls; a **frame** holds one call\'s local state. Trace this file in CodeLens if a supported C++ debugger is installed; otherwise follow the table.', 'first=8\nsecond=3\n', undefined, ['target - score', 'target + score']);
const reuse = functionCode.replace('    std::cout << "first=" << points_needed(4, 12) << \'\\n\';\n    std::cout << "second=" << points_needed(9, 12) << \'\\n\';', '    int missing = points_needed(4, 12);\n    std::cout << "double=" << missing * 2 << \'\\n\';');
guided('Returning is not printing',
  'Store a returned value, then multiply it before printing. `*` multiplies numbers. The function did not need to know how the caller planned to use its answer.\n\nA function can print as well, but output is a side effect: an observable action separate from its returned value. Our calculation intentionally only returns.',
  'explore/functions.cpp', reuse,
  'points_needed returns 8. That value initializes missing. The caller multiplies it by 2, then prints 16. If the function only printed 8, there would be no returned number to use in this expression. Keeping calculation separate from display makes later tests and graphical views possible.', 'double=16\n');
const boolFn = '#include <iostream>\nbool can_bank(int pot, bool finished) {\n    return pot > 0 && !finished;\n}\nint main() {\n    std::cout << "live=" << can_bank(3, false) << \'\\n\';\n    std::cout << "over=" << can_bank(3, true) << \'\\n\';\n    return 0;\n}';
guided('A returned boolean answers a question',
  'Now use a bool return type. `false` and `true` are boolean literals. can_bank answers one question: is the pot positive and the game unfinished? Its parameters are inputs, not the actual game object. This function is a small rule experiment that we can test before building the full game.\n\n' + predict('With pot 3 but finished true, is banking available?', 'No', 'Yes', 'A positive pot is insufficient after the match has ended.'),
  'explore/bank.cpp', boolFn,
  'For the first call, pot > 0 is true and !finished is true. For the second, !finished is false. Output is 1 then 0. A caller could use the returned boolean as an if condition rather than printing it.', 'live=1\nover=0\n', undefined, ['pot > 0 && !finished', 'pot > 0']);
step('Try it — Follow a local name',
  'In explore/functions.cpp rename the score parameter to banked and change its use in the body. The calls do not change: callers provide values, not the spelling of the parameter name.\n\nTry referring to missing inside points_needed. It was declared inside main and is not visible there. The region in which a name can be used is its **scope**. Restore the working file. You will explore copying and references in the next foundations chapter.');
const gate = '#include <iostream>\nbool can_roll(int score, int pot, int target) {\n    return score + pot < target;\n}\nint main() {\n    int score = 0, pot = 0, target = 0;\n    if (!(std::cin >> score >> pot >> target)) return 1;\n    std::cout << "result=" << can_roll(score, pot, target) << \'\\n\';\n    return 0;\n}';
practice('Answer a different rule question',
  'Write a bool function named can_roll taking score, pot and target as integers. Inputs have score and pot from 0 through 20 and target from 1 through 30. Return true only while score plus pot is below target. In main read the three values and print the function\'s result with result=. This is a threshold exercise; the complete game will also track whose turn it is.',
  'practice/can_roll.cpp', gate,
  [{ input: '4 5 12\n', out: 'result=1\n', opts: 'without="result=0\\n"' }, { input: '4 8 12\n', out: 'result=0\n', opts: 'without="result=1\\n"' }, { input: '5 8 12\n', out: 'result=0\n' }, { input: '1 2 4\n', out: 'result=1\n' }],
  ['Ask the rule question in the function, not in the output statement.', 'Reaching the target exactly ends the opportunity to roll.', 'Return a comparison of the sum against target; call that function with extracted inputs.'],
  [{ name: 'permits one more roll at equality', code: gate.replace('score + pot < target', 'score + pot <= target'), fails: [2] }, { name: 'ignores the pot', code: gate.replace('score + pot < target', 'score < target'), fails: [2] }],
  'With your code hidden, trace one call and explain the parameter values, returned value and caller\'s use of it. The behavioral check does not prove you organized your answer as a function; point to the definition and call yourself.\n\n**Chapter gate:** create a new program without a completed example, read input, handle extraction failure, compute a result in a function and test a boundary. Record one bug you found and why your test exposed it. Later chapters—references, classes, a structured project, the complete game and graphics—are still being authored; this is the end of the new foundations chapter, not the whole path.');
end();

fs.writeFileSync('src/labs/project-studio/tracks/dice-start.walkthrough.js', '// Generated by scripts/author-dice-start.mjs; author-side answers, never supplied to learner files.\nexport const WALKTHROUGH = ' + JSON.stringify(fixtures, null, 2) + ';\n');
fs.writeFileSync('src/labs/project-studio/diceStart.desktop.test.js', `import { walkCppTrack } from './walkCppTrack.js';\nimport { WALKTHROUGH } from './tracks/dice-start.walkthrough.js';\nawait walkCppTrack({ trackKey: 'dice-path-start', title: 'Dice first foundations', walkthrough: WALKTHROUGH, lessonIds: ${JSON.stringify(ids)} });\n`);
console.log('Generated Dice first foundations lessons and walkthrough fixtures.');
