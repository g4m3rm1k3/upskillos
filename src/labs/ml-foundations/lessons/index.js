// Every built lesson's content, by id. A lesson has five stages:
//   Try   a component the learner works through before any explanation (calls onDone)
//   watch components that step through the code and let the learner change the input
//   understand  blocks (Blocks.jsx)
//   challenges  write-it / fix-it coding challenges (WriteIt.jsx)
//   keep  the piece card, what to remember, the ML names, what comes next
import { TryFinish, WATCH_FINISH, UNDERSTAND_FINISH, KEEP_FINISH } from './finish.jsx'
import { TryMaps, WATCH_MAPS, UNDERSTAND_MAPS, CHALLENGES_MAPS, KEEP_MAPS } from './maps.jsx'
import { TryMoves, WATCH_MOVES, UNDERSTAND_MOVES, CHALLENGES_MOVES, KEEP_MOVES } from './moves.jsx'
import { TryEpisodes, WATCH_EPISODES, UNDERSTAND_EPISODES, CHALLENGES_EPISODES, KEEP_EPISODES } from './episodes.jsx'
import { TRY_AVERAGES, WATCH_AVERAGES, UNDERSTAND_AVERAGES, CHALLENGES_AVERAGES, KEEP_AVERAGES } from './averages.jsx'
import { TRY_BACKFILL, WATCH_BACKFILL, UNDERSTAND_BACKFILL, CHALLENGES_BACKFILL, KEEP_BACKFILL } from './backfill.jsx'
import { TRY_DISCOUNT, WATCH_DISCOUNT, UNDERSTAND_DISCOUNT, CHALLENGES_DISCOUNT, KEEP_DISCOUNT } from './discount.jsx'
import { TRY_PLANS, WATCH_PLANS, UNDERSTAND_PLANS, CHALLENGES_PLANS, KEEP_PLANS } from './plans.jsx'
import { TRY_PLANNER, WATCH_PLANNER, UNDERSTAND_PLANNER, CHALLENGES_PLANNER, KEEP_PLANNER } from './planner.jsx'
import { TRY_SAMPLING, WATCH_SAMPLING, UNDERSTAND_SAMPLING, CHALLENGES_SAMPLING, KEEP_SAMPLING } from './sampling.jsx'
import { TRY_RUNNING, WATCH_RUNNING, UNDERSTAND_RUNNING, CHALLENGES_RUNNING, KEEP_RUNNING } from './running.jsx'
import { TRY_BOOTSTRAP, WATCH_BOOTSTRAP, UNDERSTAND_BOOTSTRAP, CHALLENGES_BOOTSTRAP, KEEP_BOOTSTRAP } from './bootstrap.jsx'
import { TRY_EXPLORE, WATCH_EXPLORE, UNDERSTAND_EXPLORE, CHALLENGES_EXPLORE, KEEP_EXPLORE } from './explore.jsx'
import { TRY_LEARNER, WATCH_LEARNER, UNDERSTAND_LEARNER, CHALLENGES_LEARNER, KEEP_LEARNER } from './learner.jsx'
import { TRY_FORMULAS, WATCH_FORMULAS, UNDERSTAND_FORMULAS, CHALLENGES_FORMULAS, KEEP_FORMULAS } from './formulas.jsx'
import { TRY_SLOPES, WATCH_SLOPES, UNDERSTAND_SLOPES, CHALLENGES_SLOPES, KEEP_SLOPES } from './slopes.jsx'
import { TRY_LAYERS, WATCH_LAYERS, UNDERSTAND_LAYERS, CHALLENGES_LAYERS, KEEP_LAYERS } from './layers.jsx'
import { TRY_BATCHES, WATCH_BATCHES, UNDERSTAND_BATCHES, CHALLENGES_BATCHES, KEEP_BATCHES } from './batches.jsx'
import { TRY_DEEPQ, WATCH_DEEPQ, UNDERSTAND_DEEPQ, CHALLENGES_DEEPQ, KEEP_DEEPQ } from './deepq.jsx'

export const LESSONS = {
  finish: { id: 'finish', Try: TryFinish, watch: WATCH_FINISH, understand: UNDERSTAND_FINISH, challenges: [], keep: KEEP_FINISH, story: 'A mouse, a maze, and a piece of cheese. The mouse can try moves and is paid a little for each; it must find out by itself how to reach the cheese quickly.' },
  maps: { id: 'maps', Try: TryMaps, watch: WATCH_MAPS, understand: UNDERSTAND_MAPS, challenges: CHALLENGES_MAPS, keep: KEEP_MAPS, story: 'The maze is written as text, one character per square. Before anything can move in it, a program has to read it.' },
  moves: { id: 'moves', Try: TryMoves, watch: WATCH_MOVES, understand: UNDERSTAND_MOVES, challenges: CHALLENGES_MOVES, keep: KEEP_MOVES, story: 'You can read the map and know which squares are next door (lesson 1). Now: what does pressing a move actually do, when the floor is icy and every move costs something?' },
  episodes: { id: 'episodes', Try: TryEpisodes, watch: WATCH_EPISODES, understand: UNDERSTAND_EPISODES, challenges: CHALLENGES_EPISODES, keep: KEEP_EPISODES, story: 'You have the map (lesson 1) and a table saying, for every square and move, what can happen and how likely it is (lesson 2). Now play: pick a move, let chance decide, get paid, repeat.' },
  averages: { id: 'averages', tryIt: TRY_AVERAGES, watch: WATCH_AVERAGES, understand: UNDERSTAND_AVERAGES, challenges: CHALLENGES_AVERAGES, keep: KEEP_AVERAGES, story: 'You have the world as a table and can play it (Part 1). To choose a move, the mouse needs to know what each move is worth. But a move has several possible outcomes, each with a chance.' },
  backfill: { id: 'backfill', tryIt: TRY_BACKFILL, watch: WATCH_BACKFILL, understand: UNDERSTAND_BACKFILL, challenges: CHALLENGES_BACKFILL, keep: KEEP_BACKFILL, story: 'A move is worth its average of payment + worth of where it lands (lesson 4). But that needs the worth of every square, and each one depends on its neighbours. Where do you start?' },
  discount: { id: 'discount', tryIt: TRY_DISCOUNT, watch: WATCH_DISCOUNT, understand: UNDERSTAND_DISCOUNT, challenges: CHALLENGES_DISCOUNT, keep: KEEP_DISCOUNT, story: 'Worth spreads back from the cheese by sweeping the Bellman equation until nothing changes (lesson 5). But on the 7 by 7 maze, with g = 1, it never stops changing.' },
  plans: { id: 'plans', tryIt: TRY_PLANS, watch: WATCH_PLANS, understand: UNDERSTAND_PLANS, challenges: CHALLENGES_PLANS, keep: KEEP_PLANS, story: 'You can work out the worth of every square, with g below 1 so it always settles (lessons 5 and 6). The arrows of best moves form a plan. Now: how good is any plan, and how do you make a bad one better?' },
  'value-iteration': { id: 'value-iteration', tryIt: TRY_PLANNER, watch: WATCH_PLANNER, understand: UNDERSTAND_PLANNER, challenges: CHALLENGES_PLANNER, keep: KEEP_PLANNER, story: 'Part 2 built every piece of a planner: worths as averages (4), backfilled from the cheese (5), discounted so they settle (6), and plans read off them and improved (7). Now wire them together.' },
  sampling: { id: 'sampling', tryIt: TRY_SAMPLING, watch: WATCH_SAMPLING, understand: UNDERSTAND_SAMPLING, challenges: CHALLENGES_SAMPLING, keep: KEEP_SAMPLING, story: 'Part 2 plans perfectly, but only with the table: the exact chances of every outcome. A real mouse has no table. It can only try moves and see what happens.' },
  running: { id: 'running', tryIt: TRY_RUNNING, watch: WATCH_RUNNING, understand: UNDERSTAND_RUNNING, challenges: CHALLENGES_RUNNING, keep: KEEP_RUNNING, story: 'Averages of tries settle on the truth, with a wobble of about σ/√n (lesson 8). But a learner gets one sample at a time, forever, and cannot store them all.' },
  bootstrap: { id: 'bootstrap', tryIt: TRY_BOOTSTRAP, watch: WATCH_BOOTSTRAP, understand: UNDERSTAND_BOOTSTRAP, challenges: CHALLENGES_BOOTSTRAP, keep: KEEP_BOOTSTRAP, story: 'A guess can be nudged toward each new sample (lesson 9). For the worth of a move, the sample would be everything the rest of the game pays, and the learner can\'t wait for the end of every game.' },
  explore: { id: 'explore', tryIt: TRY_EXPLORE, watch: WATCH_EXPLORE, understand: UNDERSTAND_EXPLORE, challenges: CHALLENGES_EXPLORE, keep: KEEP_EXPLORE, story: 'The learner improves its guesses with real payments plus its own guesses (lesson 10). But a guess only improves when that move is tried, and a square it never visits keeps its starting guess forever.' },
  'q-learning': { id: 'q-learning', tryIt: TRY_LEARNER, watch: WATCH_LEARNER, understand: UNDERSTAND_LEARNER, challenges: CHALLENGES_LEARNER, keep: KEEP_LEARNER, story: 'Part 3 built learning from tries: averages of samples (8), updated one at a time (9), with targets built from guesses (10), and a balance of trying and repeating (11). Lesson 0\'s program is all of those, in one loop.' },
  formulas: { id: 'formulas', tryIt: TRY_FORMULAS, watch: WATCH_FORMULAS, understand: UNDERSTAND_FORMULAS, challenges: CHALLENGES_FORMULAS, keep: KEEP_FORMULAS, story: 'Your Q-learner works (A2), but its table can\'t generalise: a square it has never visited keeps its starting guess, even next to squares it knows well. And a big world means a huge table.' },
  slopes: { id: 'slopes', tryIt: TRY_SLOPES, watch: WATCH_SLOPES, understand: UNDERSTAND_SLOPES, challenges: CHALLENGES_SLOPES, keep: KEEP_SLOPES, story: 'A formula with shared weights generalises (lesson 12), and the nudge corrects it: each weight by alpha × error × its feature. But why exactly that correction?' },
  layers: { id: 'layers', tryIt: TRY_LAYERS, watch: WATCH_LAYERS, understand: UNDERSTAND_LAYERS, challenges: CHALLENGES_LAYERS, keep: KEEP_LAYERS, story: 'Learning is walking downhill on the error, along each weight\'s slope (lesson 13). But a weighted sum of features is a straight line, and real worths are hills and valleys.' },
  batches: { id: 'batches', tryIt: TRY_BATCHES, watch: WATCH_BATCHES, understand: UNDERSTAND_BATCHES, challenges: CHALLENGES_BATCHES, keep: KEEP_BATCHES, story: 'A network bends where a line can\'t, and backpropagation gives every weight its slope (lesson 14). Your learner, though, updates after every move, in order, one move at a time.' },
  'deep-q': { id: 'deep-q', tryIt: TRY_DEEPQ, watch: WATCH_DEEPQ, understand: UNDERSTAND_DEEPQ, challenges: CHALLENGES_DEEPQ, keep: KEEP_DEEPQ, story: 'Part 4 built every piece needed to replace the table: formulas with shared weights (12), corrected by gradient steps (13), bent into networks (14), learning from a replay memory (15). Put them into your Q-learner.' },
}

// Which piece (Python function) each challenge adds to the learner's toolbox.
export const PIECE_OF = Object.fromEntries(Object.values(LESSONS).flatMap(l => l.challenges.filter(c => c.piece).map(c => [c.id, c.piece])))
