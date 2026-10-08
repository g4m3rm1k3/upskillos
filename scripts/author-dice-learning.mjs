import { author } from './dice-path-authoring.mjs';
import { environmentLessons } from './dice-environment-lessons.mjs';
import { observationLessons } from './dice-observation-lessons.mjs';
import { deliveryLesson } from './dice-delivery-lesson.mjs';
const {lesson,step,guided,practice,predict,end,finish}=author({key:'dice-path-learning',title:'C++ Games — Learn from Decisions',order:4.4,fixture:'dice-learning',test:'diceLearning'});
lesson('20-six-possible-futures','A20 — Count the futures before learning from them',
  'You can now play against a fixed policy. Before teaching an opponent from experience, ask what one decision can lead to. This chapter will build toward action values and Q-learning; its first lesson enumerates six outcomes exactly, without simulation or training. We will distinguish gaining points on the next roll from winning the whole match. Keep the same project folder; these small experiments belong in explore and practice.');
step('Explore six alternatives, not six consecutive rolls',
  'Start at score zero and pot five. If the next face is one, the pot becomes zero; if it is two, the pot becomes seven. Complete the other four possibilities on paper, then use the explorer. Each row starts from the same position. We do not roll each row in succession.\n\n```figure\nname: dice/SixFutures\ncaption: Exact alternatives for one roll of an assumed fair die. This is enumeration, not a random sample or a trained model.\n```',null,null,
  'A **probability** describes how likely an outcome is under a model. For an assumed fair die each face has probability 1/6. Six probabilities of 1/6 add to one. This assumption lets us weight all six alternatives equally; no short observed sample can establish it by itself.');
let code='#include <iostream>\nint main() {\n    int pot = 5;\n    for (int face = 1; face <= 6; ++face) {\n        int after = pot + face;\n        if (face == 1) after = 0;\n        std::cout << "face=" << face << " pot=" << after << \'\\n\';\n    }\n    return 0;\n}';
guided('Type an exact outcome table',
  'Create explore/six_futures.cpp. The for loop visits the six possible inputs. after is a new local value each iteration, so a bust in one alternative does not affect the next alternative. We keep pot constant because each row asks the same starting question.', 'explore/six_futures.cpp',code,
  '| Face | Starting pot | Resulting pot | Change |\n|---|---|---|---|\n| 1 | 5 | 0 | -5 |\n| 2 | 5 | 7 | +2 |\n| 3 | 5 | 8 | +3 |\n| 4 | 5 | 9 | +4 |\n| 5 | 5 | 10 | +5 |\n| 6 | 5 | 11 | +6 |\n\nThis isolated arithmetic restates one rule for analysis; it does not replace Game.cpp in the application. No random engine is needed when all possible inputs fit in a short loop.', 'face=1 pot=0\nface=2 pot=7\nface=3 pot=8\nface=4 pot=9\nface=5 pot=10\nface=6 pot=11');
code=code.replace('    for (int face', '    int total = 0;\n    for (int face').replace('        std::cout', '        total += after;\n        std::cout').replace('    return 0;', '    double average = total / 6.0;\n    std::cout << "expected pot=" << average << \'\\n\';\n    return 0;');
guided('Average the alternatives with equal weights',
  'Add a total outside the loop, add each resulting pot, then divide after the loop. The six results sum to 45; 45 / 6.0 is 7.5. The decimal denominator selects floating-point division, revisiting A02.\n\n'+predict('Can the next roll actually leave a pot of 7.5?', 'No', 'Yes', 'Each outcome is an integer; an average of alternatives need not itself be a possible outcome.'), 'explore/six_futures.cpp',code,
  'This weighted average is an **expected value**, also called an expectation. With equal probabilities, summing the six outcomes then dividing by six gives the same result as multiplying each by 1/6 and adding. Here the expected pot is 7.5 and the expected immediate change is 7.5 minus 5, or 2.5. Expectation is neither a guaranteed next value nor a promise about one short match.', 'expected pot=7.5',undefined,['total / 6.0','total / 6']);
step('Try it — Change the quantity you are measuring',
  'Change pot from five to two. Predict every row, their total and the expected pot before running; then restore five. Next calculate change=after-pot inside the loop and total those changes instead. You should obtain an expected change of 2.5 for pot five. A quantity has meaning only with its definition: resulting pot, point change and chance of ultimately winning are different quantities. Positive expected immediate change alone does not establish the best match strategy.');
const solution='#include <iostream>\nint winningFaces(int score, int pot) {\n    int winners = 0;\n    for (int face = 2; face <= 6; ++face) {\n        if (score + pot + face >= 12) ++winners;\n    }\n    return winners;\n}\nint main() {\n    int score = 0;\n    int pot = 0;\n    if (!(std::cin >> score >> pot)) return 1;\n    if (score < 0 || pot < 0 || score >= 12 || pot >= 12) return 1;\n    if (score + pot >= 12) return 1;\n    int winners = winningFaces(score, pot);\n    std::cout << "winning=" << winners << \'\\n\';\n    std::cout << "chance=" << winners / 6.0 << \'\\n\';\n    return 0;\n}';
practice('Count immediate winning faces',
  'Write winningFaces(int score, int pot), returning how many faces win immediately from an unfinished position. Face one always busts; faces two through six win if score+pot+face reaches twelve. In main, read two integers; reject failed reads, negative values, either value at least twelve or score+pot already at least twelve with exit 1. Only then call your function. Print winning=N and chance=N/6.0 on separate lines. This is the probability of winning on the next Roll, not the entire match. At score four, pot five, the winning faces are 3, 4, 5 and 6.',
  'practice/winning_faces.cpp',solution,[
    {input:'4 5\n',out:'winning=4\nchance=0.666667'},
    {input:'0 0\n',out:'winning=0\nchance=0'},
    {input:'0 11\n',out:'winning=5\nchance=0.833333'},
    {input:'5 5\n',out:'winning=5\nchance=0.833333'},
    {input:'4 8\n',out:undefined,opts:'exit=1'},
    {input:'-1 5\n',out:undefined,opts:'exit=1'},
    {input:'word\n',out:undefined,opts:'exit=1'},
  ],['Count alternatives, not points earned.', 'The bust face must be excluded even if adding its numeric value would reach the target.', 'Use a local integer counter, loop from two through six, and compare each resulting total with the target.'],[
    {name:'counts a one as a winning face',code:solution.replace('face = 2','face = 1'),fails:[3]},
    {name:'misses an exact target',code:solution.replace('>= 12) ++winners','> 12) ++winners'),fails:[1]},
    {name:'integer probability division',code:solution.replace('winners / 6.0','winners / 6'),fails:[1]},
  ],'**Ready to move on:** explain why four winning faces means probability 4/6 only under the fair-die model, why that does not guarantee four wins in six trials, and why we have not yet computed a long-term action value. Change to another unfinished score/pot and check your answer by listing faces before running.');
end();
environmentLessons({lesson,step,predict,end});
observationLessons({lesson,step,predict,end});
deliveryLesson({lesson,step,predict,end});
finish();
