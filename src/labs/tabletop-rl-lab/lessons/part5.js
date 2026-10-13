// Part 5: apply it. Designing and reporting an experiment with the Workshop, and taking the
// programs to your own machine with exercises that extend them.
import M from '../engine/measured.json'
import { solve, startValue } from '../engine/turn.js'
import { f } from './util.js'

const P = M.players

export const PART5 = {
  id: 'part5', title: 'Part 5 · Your own experiments', lessons: [
    {
      id: 'your-experiment', number: '5.1', title: 'Design, run and report an experiment',
      goal: 'Run a controlled experiment in the Workshop: one change, several seeds, a paired evaluation on games not used for tuning, and an honest report with error bars.',
      builds: ['features-matter', 'how-sure'],
      blocks: [
        { md: `You now have everything a working reinforcement-learning researcher uses on a small problem: an environment, learners, an exact reference for one turn, and statistics. The **🧪 Workshop** tab trains the TD(0) player of Part 4 in your browser and grades it, and the **🎲 Table** lets you play against any saved player while seeing its reasoning.

A good experiment has five parts:

1. **A question and a prediction**, written down first. "Training 4 times longer will add at least 2 points" is testable; "more training is better" is not.
2. **One change.** Keep everything else fixed: same features, same α, same evaluation games. If two things change, you can't say which mattered.
3. **Several training seeds.** One run is one sample of what a recipe produces. The Workshop's seed box sets the training dice; train each recipe with at least three seeds.
4. **A paired evaluation**, on games the training never used, with enough of them for the SE you need (lesson 4.4).
5. **An honest report**: mean ± SE for each recipe, the paired difference ± its SE, and whether that answers your question. A null result ("no difference larger than 2 points") is a result.` },
        { note: 'Watch out: if you tune settings by looking at the same evaluation games again and again, those games stop being an honest test. You have, in effect, trained on them. The Workshop lets you change the evaluation seed: keep one seed range for tuning and another, used once at the end, for the final claim.', kind: 'warn' },
        { md: `Some experiments worth running, with what is already known:

- **Step size.** α = 0.01 was used throughout. Try 0.003 and 0.03 with the open-box features. (The lab's own exploration found them within a couple of points of each other at 3,000 games; is that still true across seeds?)
- **Training length.** Lesson 4.7's curve flattens near 1,000 games. Is 5,000 really better than 1,000, once you pair the evaluation?
- **A Yahtzee-bonus feature.** Add one feature: 1.0 if the Yahtzee box holds 50 (so extra Yahtzees pay 100). Does the player learn to keep Joker targets open? (Edit \`features\` on your own machine; next lesson.)
- **The one-turn learners.** In Part 3, compare ε = 0.05, 0.1 and 0.3 for the afterstate learner on Full house, graded exactly. Exact grading needs no paired games: why not?

For reference, the lab's players on its 2,000 evaluation games: Planner ${f(P.planner.mean)} ± ${f(P.planner.se)}, open boxes ${f(P.boxes.mean)} ± ${f(P.boxes.se)}, with bonus bands ${f(P.bonus.mean)} ± ${f(P.bonus.se)}.` },
        { figure: 'Ladder', caption: 'The lab\'s reference players. Your Workshop players can be added to the Table and compared in the Workshop.' },
        {
          choice: {
            prompt: 'You train recipe A once (seed 0) and recipe B once (seed 0). B scores 2.1 points more, paired SE 1.0. What can you conclude?',
            options: [
              { text: 'That B\'s seed-0 player is probably better than A\'s seed-0 player, but not yet that recipe B is better: train more seeds', why: 'Yes. The SE covers the evaluation dice, not the luck of training. Different training seeds give different players; to compare recipes, compare several players from each.' },
              { text: 'B is a better recipe, since 2.1 > 2 SE', why: '2.1 SE says these two players differ. Whether the recipes differ needs several training runs of each: training luck is a second source of noise.' },
              { text: 'Nothing at all', why: 'It does say something about these two players. It just doesn\'t yet say it about the recipes.' },
            ],
            answer: 0,
          },
        },
        { note: 'Question first, one change, several seeds, paired evaluation on unused games, report ± SE. The same discipline applies to any learning system, from dice to driving.' },
      ],
    },

    {
      id: 'on-your-machine', number: '5.2', title: 'On your own machine, and further',
      goal: 'Run the lab\'s programs with your own Python, and extend them: a player of your own, a new feature, and a different dice game.',
      builds: ['your-experiment'],
      blocks: [
        { md: `Every program in this lab is plain Python 3 with no libraries beyond Python's own \`random\` and \`math\`. Copy the files from the **🐍 Real Python** tab into one folder and run, for example:

\`\`\`bash
python3 -c "from exact import best_for_every_box; best_for_every_box()"
python3 -c "from stats import planner_vs_chaser; planner_vs_chaser(200)"
python3 -c "from afterstate import train; w, h = train(games=500); print([round(x, 1) for x in w])"
\`\`\`

The last one takes about half a minute. On the desktop app the Real Python tab runs the same files one line at a time, with every line explained.` },
        { md: `**Exercises**, in rising difficulty:

1. **Your own player.** Write a class with \`start_turn\`, \`keep\` and \`box\`. Start from the Chaser, and make \`box\` avoid writing 0 in Yahtzee before turn 10. Measure it with \`compare\` against the Chaser over 500 paired games. Did the rule help, and by how much ± SE?
2. **Policy evaluation for a rule.** Write \`keep_sixes(hand, rolls_left)\`, which keeps every 6, and check with \`evaluate(keep_sixes, 5)\` that it reaches the exact optimum for Sixes, ${f(startValue(solve(5).V[2]))}. Then find a box where a simple rule of yours is optimal, and one where it isn't.
3. **A new feature.** Add the Yahtzee-bonus feature of lesson 5.1 to \`features\` (remember: \`value\` must still be 0 for a full card). Retrain with \`bonus=True\` and compare.
4. **Learning the whole game without a model.** Replace the Planner inside \`afterstate.train\` with an ε-greedy box choice and a keep policy learned by \`train_after\`-style afterstates. This is much harder than it sounds, and the reason is lesson 3.8.
5. **Another dice game.** Pig: roll one die repeatedly, adding to a turn total; stop to bank it, or lose the turn's points on a 1. First to 100 wins. Its states fit in a table (your score, the opponent's, the turn total); solve it by value iteration and learn it with Q-learning, and compare the two, as Parts 2 and 3 did for a Yahtzee turn.` },
        {
          choice: {
            prompt: 'In exercise 3, why must every feature be 0 for a full card?',
            options: [
              { text: 'So that a full card\'s value is exactly 0: there is nothing left to score, and the last turn\'s TD target must be just its reward', why: 'Yes. A feature that is 1 for a full card (say, a constant "bias" feature) would give the end of the game a nonzero value, and every target would be off by its weight.' },
              { text: 'So the weights stay small', why: 'It is about the meaning of the value, not its size: the expected points still to come from a finished game are 0.' },
            ],
            answer: 0,
          },
        },
        { note: 'Plain Python, no libraries: everything here runs anywhere. The ideas transfer unchanged: models and exact planning when you have them, sampled TD learning when you don\'t, afterstates and features to make learning small, statistics to know when you\'ve succeeded.' },
      ],
    },
  ],
}
