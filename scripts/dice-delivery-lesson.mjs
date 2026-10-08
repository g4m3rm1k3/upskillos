// The solution is author-only. The learner chooses the algorithm and data layout.
const answer = `#include <iostream>
#include <vector>
int main() {
    int count = 0;
    if (!(std::cin >> count) || count < 1 || count > 20) return 1;
    std::vector<int> occupied;
    for (int i = 0; i < count; ++i) {
        int value = 0;
        if (!(std::cin >> value) || (value != 0 && value != 1)) return 1;
        occupied.push_back(value);
    }
    int chosen = -1;
    for (int i = 0; i < count; ++i) {
        if (occupied.at(i) == 0) { chosen = i; break; }
    }
    std::cout << "locker=" << chosen << '\\n';
    return 0;
}`;
const revised = answer.replace('    int chosen = -1;', '    int preferred = 0;\n    if (!(std::cin >> preferred) || preferred < 0 || preferred >= count) return 1;\n    int chosen = -1;').replace('    std::cout << "locker=', '    if (occupied.at(preferred) == 0) chosen = preferred;\n    std::cout << "locker=');

export function deliveryLesson({lesson,step,predict,end}) {
  const cmd = (text,opts='') => `run ${JSON.stringify(text)}${opts?' '+opts:''}`;
  const flags = 'g++ -std=c++20 -Wall -Wextra -pedantic';
  const hints = (a,b,c) => `\n\n\`\`\`hints\nnudge: ${a}\nconcept: ${b}\nshape: ${c}\n\`\`\``;
  const compile = cmd(`${flags} practice/locker_choice.cpp -o locker_choice`);
  const cases = [ ['4 1 0 1 0\n','locker=1'], ['3 0 1 1\n','locker=0'], ['2 1 1\n','locker=-1'], ['4 1 1 1 0\n','locker=3'] ];
  const checks = [compile,...cases.map(([input,out])=>cmd('./locker_choice',`stdin=${JSON.stringify(input)} stdout=${JSON.stringify(out)} without=${JSON.stringify(cases.find(c=>c[1]!==out)[1])}`)),...['0\n','21\n','2 1 7\n','3 0 1\n'].map(input=>cmd('./locker_choice',`stdin=${JSON.stringify(input)} exit=1`))].join('\n');
  lesson('22c-deliver-a-small-change','A22c — Take a small request through design, tests and feedback',
    'A colleague asks for a locker suggestion tool. This is a different problem from Dice Duel: no game classes or finished solution are supplied. Use what you learned about loops, containers, validation and tests to decide how to build it. Keep the game working. This consolidation lesson practices a small development cycle before adding another learning algorithm.');
  step('Turn a request into observable acceptance criteria',
    'Request: “Suggest the lowest-numbered free locker.” Ask what free means, how lockers are numbered and what happens when none are free. For this exercise the agreed answers are: IDs start at zero; zero means free, one means occupied; return -1 if all are occupied. There are one through twenty lockers. Bad or incomplete input must fail before printing a suggestion.\n\nAn **acceptance criterion** is an observable condition a completed change must satisfy. “The code is good” is too vague. “With occupancies 1,0,1,0 the result is locker 1” can be checked.\n\n'+predict('May the program return the first free locker before validating later input?', 'No', 'Yes', 'A later invalid or missing occupancy must reject the entire request.'),null,null,
    'Write your own examples before coding: an ordinary choice, the first and last positions, a full set and invalid input after an earlier free slot. Name the mistake each example detects. This is test design: choosing evidence from requirements, rather than copying a supplied test body.');
  step('Plan one small delivery and choose a design',
    'A **backlog** is an ordered list of possible work. Write three items: validate the request, select a free locker, improve the display. Deliver the first two together because an unchecked suggestion is incomplete; defer display work. **Work in progress** is work started but unfinished. Keep one small change in progress until it passes its acceptance cases.\n\nChoose a representation: a vector of all occupancy values, or a streaming scan that remembers a candidate but waits until validation finishes. Draw the variables and write the selection procedure in plain English. Do you need a class? A function or one small program is enough unless you can name state or a rule the class should own.',null,null,
    'Before implementation, predict worst-case work as the locker count grows. Both candidates must read every input for validation. A vector retains all values; a streaming solution can retain only a candidate and validation state. Record your choice and one reason against it. The author reference is just one choice and is not the required design.');
  step('Your turn — Implement the agreed behavior',
    'Create practice/locker_choice.cpp without a supplied body. Input begins with the number of lockers, then exactly that many occupancy integers. Validate the agreed bounds and values. Print locker=N on success, using the lowest free ID or -1 when full; return zero. Return 1 without a suggestion on failed extraction, invalid count or invalid occupancy. Extra tokens after the required values are outside this first interface; do not claim strict whole-line validation.\n\n| Input | Required result |\n|---|---|\n| 4 1 0 1 0 | locker=1 |\n| 3 0 1 1 | locker=0 |\n| 2 1 1 | locker=-1 |\n| 4 1 1 1 0 | locker=3 |\n| 0; 21; 2 1 7; 3 0 1 (separate runs) | exit 1 |\n\nChoose your own variables, functions and storage. Run your independently written cases as well as these examples. Use the compile command and ./locker_choice below; type one complete input per run.'+hints('Separate reading a complete valid request from reporting success.', 'Remember the first candidate; later free lockers must not replace it.', 'An absent candidate needs a distinct value. Do not print until all required input has been validated.'),null,null,
    'Explain the worst-case number of values read and stored by your implementation. A reviewer should inspect the design note and your additional cases: passing the displayed cases does not grade those. Close the examples and explain your algorithm using a different occupancy sequence.',checks,
    {files:{'practice/locker_choice.cpp':answer},wrong:[
      {name:'returns the last free locker',files:{'practice/locker_choice.cpp':answer.replace('chosen = i; break;', 'chosen = i;')},fails:[1]},
      {name:'reports zero when all lockers are full',files:{'practice/locker_choice.cpp':answer.replace('int chosen = -1;', 'int chosen = 0;')},fails:[3]},
      {name:'ignores invalid occupancy',files:{'practice/locker_choice.cpp':answer.replace(' || (value != 0 && value != 1)', '')},fails:[7]},
    ]});
  const revisionChecks = [compile,cmd('./locker_choice','stdin="4 1 0 1 0 3\\n" stdout="locker=3" without="locker=1"'),cmd('./locker_choice','stdin="4 1 0 1 0 2\\n" stdout="locker=1" without="locker=3"'),cmd('./locker_choice','stdin="2 1 1 0\\n" stdout="locker=-1"'),cmd('./locker_choice','stdin="2 0 0 2\\n" exit=1')].join('\n');
  step('Try it — Respond to feedback without losing old behavior',
    'The colleague tries the tool and says: “I sometimes want a particular locker. Prefer it if free; otherwise keep the old lowest-free rule.” This is **feedback** that changes the next small delivery. Add one preferred ID after the occupancy values. Reject a failed read or an ID outside 0..count-1. Write cases before editing: preferred free, preferred occupied with another free, all occupied and out-of-range preference.\n\nChange your own implementation without a supplied diff. For 4 1 0 1 0 3 expect locker=3; with preference 2 expect locker=1; for 2 1 1 0 expect locker=-1. Explain whether your earlier storage choice helped or whether you need to revise it.'+hints('A preference changes priority, not whether an occupied locker is available.', 'Preserve the original fallback until you know whether the preferred locker is free.', 'Validate the preference before using it as an index; a valid preference may still be occupied.'),null,null,
    'Re-run the old cases with an appropriate preference appended. This is regression checking across a changed input interface. **Iteration** means making a small usable change, checking feedback and adjusting the next plan. That feedback loop is the agile practice here; simply dividing a fixed tutorial into steps would not establish it.',revisionChecks,
    {files:{'practice/locker_choice.cpp':revised},wrong:[
      {name:'ignores feedback and always returns lowest',files:{'practice/locker_choice.cpp':answer},fails:[1]},
      {name:'selects an occupied preference',files:{'practice/locker_choice.cpp':revised.replace('if (occupied.at(preferred) == 0) chosen = preferred;', 'chosen = preferred;')},fails:[2]},
    ]});
  const gitFile = '#include <iostream>\nint main() {\n    std::cout << "reviewed checkpoint\\n";\n    return 0;\n}';
  step('Set up a disposable Git recovery exercise',
    'Use a new review-sandbox subfolder inside your learner project for this exercise only. If that name already contains your work, choose another empty location and adjust the commands. Create review-sandbox/checkpoint.cpp. We will practice recovering a deliberately changed demonstration file, not discard your game or locker solution. git --version must succeed; if Git is unavailable, install it through the setup guidance before claiming this exercise complete.', 'review-sandbox/checkpoint.cpp',gitFile,
    'Compile and run, then git init review-sandbox. The nested .git belongs only to this disposable exercise. Do not stage this sandbox into a parent repository. No account, remote, commit or push is used here.',cmd('git --version')+'\n'+cmd(`${flags} review-sandbox/checkpoint.cpp -o review_checkpoint`)+'\n'+cmd('./review_checkpoint','stdout="reviewed checkpoint"')+'\n'+cmd('git init review-sandbox'));
  step('Inspect what is selected for the next snapshot',
    'Run git -C review-sandbox status --short. -C tells Git which repository folder to use. The new file is untracked, so ordinary git diff will not show it. Run git -C review-sandbox add checkpoint.cpp to stage this file, then git -C review-sandbox diff --cached -- checkpoint.cpp. The -- ends options and introduces the path.\n\nThe **index**, or staging area, holds the content selected for a future commit. It is separate from the working file. Staging is not committing, and it does not save a durable history entry.',null,null,
    'Expect the staged comparison to contain reviewed checkpoint. Inspect the entire small file before accepting that selection. In real work, avoid staging executables, secrets and unrelated changes.',cmd('git -C review-sandbox add checkpoint.cpp')+'\n'+cmd('git -C review-sandbox diff --cached -- checkpoint.cpp','stdout="reviewed checkpoint"'));
  step('Compare an unstaged edit with the staged checkpoint',
    'Change only the printed message in review-sandbox/checkpoint.cpp. Predict which comparison will contain the new message: git diff or git diff --cached. Then inspect both. This is a controlled mistake with a known earlier copy in the index.', 'review-sandbox/checkpoint.cpp',gitFile.replace('reviewed checkpoint','temporary mistake'),
    'Ordinary diff compares the working file with the index and shows the new message. The cached comparison still shows the staged checkpoint. These are two different comparisons, not contradictory reports.',cmd('git -C review-sandbox diff -- checkpoint.cpp','stdout="temporary mistake"')+'\n'+cmd('git -C review-sandbox diff --cached -- checkpoint.cpp','stdout="reviewed checkpoint" without="temporary mistake"'));
  step('Recover only the deliberate unstaged mistake',
    'After verifying this is the disposable file and that its staged contents are the version you want, run git -C review-sandbox restore --worktree -- checkpoint.cpp. This replaces that working file from the index and discards its unstaged edit. It cannot recover arbitrary untracked files or mistakes that were never saved elsewhere. Never use it on wanted changes.\n\nCompile the recovered file and run it. Then inspect git diff again: it must be empty for that path. The staged file still exists in the index; this exercise created no commit.',null,null,
    'Explain where Git obtained the replacement. If you say “the last commit,” revisit the index experiment: this repository has no commit. For lasting history use the reviewed commit workflow from A16 in your own project. Branching, merge conflicts and team review require the later dedicated Git workshop; this one exercise does not claim those skills.',cmd('git -C review-sandbox restore --worktree -- checkpoint.cpp')+'\n'+cmd(`${flags} review-sandbox/checkpoint.cpp -o review_checkpoint`)+'\n'+cmd('./review_checkpoint','stdout="reviewed checkpoint" without="temporary mistake"')+'\n'+cmd('git -C review-sandbox diff --exit-code -- checkpoint.cpp'));
  step('Review the delivery and choose the next improvement',
    'Write a short review note for your locker tool: request, acceptance examples, representation choice, one bug caught by a test, feedback received and the resulting change. A **retrospective** asks what helped the work and what you would change next time. Name one improvement to your process, not just another feature. Move only the completed acceptance criteria to done; leave display polish in the backlog.\n\nBefore continuing, hide the tutorial and explain your solution to someone else. Ask them to supply a different occupancy sequence or an ambiguous requirement. Record what you had to clarify. Return after a break and add one boundary test without being told which source line to edit.',null,null,
    'Section gate: working code, derived test examples, a defended design, a feedback revision and a demonstrated recovery are separate pieces of evidence. Compiler checks verify behavior; a reviewer evaluates your reasoning. A23 can follow this consolidation, but the wider DSA, architecture and collaborative Git strands remain tracked work.');
  end();
}
