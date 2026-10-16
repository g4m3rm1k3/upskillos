// Part 4: the whole game. The scorecard's rules, a game loop with dice rolled in advance, the
// one-turn Planner, statistics for judging noisy players, why the full game is too big for a table,
// a linear value of the card left, TD(0) on afterstates, feature design, and the gap to perfect play.
// Whole-game numbers come from engine/measured.json (tools/measure.mjs); predicts recompute them.
import { newCard, points, legalBoxes, trainValue, playGames, Chaser, value, mean } from '../engine/game.js'
import M from '../engine/measured.json'
import { f } from './util.js'

const P = M.players
const pct = x => `${(100 * x).toFixed(1)}%`
const firstTD = (() => { let first = null; trainValue({ games: 1, onTurn: t => { first ??= t } }); return first })()
const cardWith = (filled, upper = 0) => { const c = newCard(); for (const [b, p] of filled) c.boxes[b] = p; c.upper = upper; return c }
const jokerCard = cardWith([[11, 50], [4, 15]], 15)

export const PART4 = {
  id: 'part4', title: 'Part 4 · The whole game', lessons: [
    {
      id: 'scorecard-rules', number: '4.1', title: 'The scorecard and its rules',
      goal: 'Represent a scorecard in Python and apply the upper bonus, the extra-Yahtzee bonus and the Joker rule correctly.',
      builds: ['scoring-a-hand'],
      blocks: [
        { md: `A whole game is 13 turns, one box filled per turn. Three rules depend on the **whole card**, not just the hand:

1. **Upper bonus.** If Ones to Sixes add up to 63 or more, add 35. (63 is "three of each face": $3 \\times (1+2+3+4+5+6)$.)
2. **Extra Yahtzees.** If the Yahtzee box already holds **50** and you roll another Yahtzee, add a 100-point bonus. (If you scratched the Yahtzee box with a 0, no bonus.)
3. **The Joker rule.** An extra Yahtzee must still go in a box. If the upper box of its face is open, it must go there. If that box is filled, it may go in any open **lower** box, and Full house, Small and Large straight then score their full 25, 30 and 40. Only if the whole lower section is full may it go in an open upper box, scoring 0 there.

These are the official rules. The card is a dictionary: the 13 boxes (\`None\` when open), the running upper total, and the number of extra Yahtzees.` },
        {
          code: {
            file: 'game.py', fn: 'new_card', notes: [
              ['def new_card():', ['A fresh card.']],
              ['return {"boxes": [None] * 13, "upper": 0, "extra": 0}', ['`None` is Python\'s "nothing here yet". A box holding `0` is **filled** (scratched); a box holding `None` is open. The difference matters.']],
            ],
          },
        },
        {
          code: {
            file: 'game.py', fn: 'is_joker', notes: [
              ['def is_joker(card, hand):', ['An extra Yahtzee.']],
              ['return max(counts_of(hand)) == 5 and card["boxes"][11] is not None', ['Five of a kind, **and** the Yahtzee box is filled, with 50 or with 0. `is not None` asks whether it holds anything at all.'], { logic: 'five alike and the Yahtzee box is already used' }],
            ],
          },
        },
        {
          code: {
            file: 'game.py', fn: 'legal_boxes', notes: [
              ['def legal_boxes(card, hand):', ['Where this hand may be written.']],
              ['open_boxes = [box for box in range(13) if card["boxes"][box] is None]', ['Every open box.']],
              ['if not is_joker(card, hand):', ['Normally…']],
              ['return open_boxes', ['…any open box at all.']],
              ['upper = hand[0] - 1', ['An extra Yahtzee of 4s has `hand[0]` = 4: its upper box is number 3, Fours.'], { calc: q => [`${q.hand[0]} − 1`, q.hand[0] - 1] }],
              ['if card["boxes"][upper] is None:', ['Its upper box is open…'], { logic: 'the upper box for this face is still empty' }],
              ['return [upper]', ['…so that is the only choice.']],
              ['lower = [box for box in open_boxes if box >= 6]', ['Otherwise, the open lower boxes.']],
              ['if lower:', ['An empty list counts as false, a non-empty one as true.']],
              ['return lower', ['Any of those.']],
              ['return open_boxes', ['Lower section full: the remaining (upper) boxes, which will score 0.']],
            ],
          },
        },
        {
          code: {
            file: 'game.py', fn: 'points', notes: [
              ['def points(card, hand, box):', ['The **reward** for this turn: everything writing this hand here adds to the final total.']],
              ['gained = score(hand, box)', ['The ordinary score.']],
              ['if is_joker(card, hand) and box in (8, 9, 10):', ['Joker in Full house or a straight…']],
              ['gained = [25, 30, 40][box - 8]', ['…scores the full amount: box 8 → 25, 9 → 30, 10 → 40.']],
              ['if box < 6 and card["upper"] < 63 <= card["upper"] + gained:', ['Python allows **chained comparisons**: `a < 63 <= b` means `a < 63 and 63 <= b`. True exactly when this box carries the upper total past 63 for the first time.'], { logic: 'an upper box, and the upper total crosses 63 now' }],
              ['gained += 35', ['The bonus is paid the moment it is earned.']],
              ['if is_joker(card, hand) and card["boxes"][11] == 50:', ['An extra Yahtzee, with 50 in the Yahtzee box…']],
              ['gained += 100', ['…earns 100 more.']],
              ['return gained', ['Points now, bonuses included.']],
            ],
          },
        },
        {
          code: {
            file: 'game.py', fn: 'write', notes: [
              ['def write(card, hand, box):', ['Returns a **new** card. Leaving the old one unchanged matters later: the Planner tries writing a hand in every box before choosing.']],
              ['boxes = list(card["boxes"])', ['A copy of the box list. `boxes = card["boxes"]` would be the **same** list, and changing it would change the old card too.']],
              ['boxes[box] = score(hand, box)', ['Write the score.']],
              ['if is_joker(card, hand) and box in (8, 9, 10):', ['A Joker in a fixed-score box…']],
              ['boxes[box] = [25, 30, 40][box - 8]', ['…gets its full score.']],
              ['upper = card["upper"] + (boxes[box] if box < 6 else 0)', ['The new upper total.']],
              ['extra = card["extra"] + (1 if is_joker(card, hand) and card["boxes"][11] == 50 else 0)', ['One more extra Yahtzee, if this is one that earns a bonus.']],
              ['return {"boxes": boxes, "upper": upper, "extra": extra}', ['The new card.']],
            ],
          },
        },
        {
          code: {
            file: 'game.py', fn: 'total', notes: [
              ['def total(card):', ['The final score.']],
              ['boxes = sum(p for p in card["boxes"] if p is not None)', ['The sum of the filled boxes.']],
              ['bonus = 35 if card["upper"] >= 63 else 0', ['The upper bonus.']],
              ['return boxes + bonus + 100 * card["extra"]', ['Everything. Adding every turn\'s `points` gives the same number.']],
            ],
          },
        },
        { figure: 'ScorecardFig', caption: 'A card in progress. Pick a hand and see the legal boxes and what each would add, bonuses and Joker included.' },
        {
          predict: {
            prompt: 'The upper section holds 48 points so far, and Sixes is open. You write `(5, 5, 6, 6, 6)` in Sixes. What does `points` return?',
            answer: points(cardWith([], 48), [5, 5, 6, 6, 6], 5), compute: () => points(cardWith([], 48), [5, 5, 6, 6, 6], 5),
            explain: 'Three 6s score 18, and $48 + 18 = 66 \\ge 63$: the bonus is earned now. $18 + 35 = 53$.',
            misconceptions: [{ answer: 18, feedback: 'The upper total crosses 63 with this box, so the 35 bonus comes now.' }],
          },
        },
        {
          predict: {
            prompt: 'Yahtzee holds 50 and Fives holds 15. You roll `(5, 5, 5, 5, 5)` again and write it in Large straight. What does `points` return?',
            answer: points(jokerCard, [5, 5, 5, 5, 5], 10), compute: () => points(jokerCard, [5, 5, 5, 5, 5], 10),
            explain: `A Joker: Fives is full, so a lower box is allowed, and a straight scores its full 40. Plus 100 for the extra Yahtzee: 140. The legal boxes here are ${JSON.stringify(legalBoxes(jokerCard, [5, 5, 5, 5, 5]))}.`,
            misconceptions: [{ answer: 40, feedback: 'The 100-point extra-Yahtzee bonus comes too: the Yahtzee box holds 50.' }, { answer: 100, feedback: 'Under the Joker rule, Large straight scores its full 40 as well.' }],
          },
        },
        { note: 'The card carries everything the rules need: which boxes are open, the upper total, the Yahtzee box\'s value. `points` is the turn\'s **reward**; their sum over 13 turns is the final score.' },
      ],
    },

    {
      id: 'game-loop', number: '4.2', title: 'A game loop, and a first player',
      goal: 'Write a player as a class with three methods, play whole games with dice rolled in advance, and measure the Chaser.',
      builds: ['scorecard-rules', 'chance-by-experiment'],
      blocks: [
        { md: `A **player** needs to answer three questions: what to prepare at the start of a turn, which dice to keep, and which box to use. In Python, an object with three **methods** does that. A **class** describes such objects: \`class Chaser:\` with \`def keep(self, card, hand, rolls_left):\` inside. \`self\` is the object the method was called on; Python passes it automatically, so \`player.keep(card, hand, 2)\` runs \`keep\` with \`self = player\`.

The game loop doesn't care what kind of player it is given, only that it has those three methods. Any player can be dropped in.` },
        { md: `One more design decision, made now because Part 4's statistics depend on it: **each turn's dice are rolled in advance**. A turn draws 15 dice at once: the first five for the first roll, the next five for the first reroll, the last five for the second. A player who rerolls three dice takes the first three of the next five.

Why? Two players given the same seed then face **the same dice**: the same first roll, and the same fresh dice for the same number of rerolled dice. Their games differ only where their **decisions** differ. Lesson 4.4 shows how much fairer that makes a comparison.` },
        {
          code: {
            file: 'game.py', fn: 'play_turn', notes: [
              ['def play_turn(player, card, dice):', ['`dice` is this turn\'s 15 dice.']],
              ['player.start_turn(card)', ['Let the player prepare (the Planner solves the turn here).']],
              ['hand = tuple(sorted(dice[0:5]))', ['A **slice**: `dice[0:5]` is positions 0 to 4. The first roll.']],
              ['for rolls_left in (2, 1):', ['Two rerolls.']],
              ['kept = player.keep(card, hand, rolls_left)', ['The player\'s decision.']],
              ['start = 15 - 5 * rolls_left', ['Where this reroll\'s dice start: position 5 for the first reroll, 10 for the second.'], { calc: q => [`15 − 5 × ${q.rolls_left}`, 15 - 5 * q.rolls_left] }],
              ['fresh = dice[start:start + 5 - len(kept)]', ['As many fresh dice as were not kept.']],
              ['hand = tuple(sorted(list(kept) + fresh))', ['The new hand. Keeping all five takes no fresh dice: the hand is unchanged.']],
              ['return hand', ['The final hand.']],
            ],
          },
        },
        {
          code: {
            file: 'game.py', fn: 'play_game', notes: [
              ['def play_game(player, rng):', ['A whole game.']],
              ['card = new_card()', ['Empty card.']],
              ['for turn in range(13):', ['13 turns, one per box.']],
              ['hand = play_turn(player, card, roll(15, rng))', ['Roll this turn\'s 15 dice, then play it.']],
              ['box = player.box(card, hand)', ['Where to write it.']],
              ['card = write(card, hand, box)', ['The new card.']],
              ['return total(card)', ['The final score.']],
            ],
          },
        },
        {
          code: {
            file: 'game.py', fn: 'play_games', notes: [
              ['def play_games(player, games, seed=0):', ['Many games.']],
              ['scores = []', ['One score per game.']],
              ['for g in range(games):', ['Game `g`…']],
              ['scores.append(play_game(player, random.Random(seed + g)))', ['…with its own generator, seeded `seed + g`. Game 7 always has the same dice, whoever plays it.']],
              ['return scores', ['The list of scores.']],
            ],
          },
        },
        { md: 'The first player is lesson 1.6\'s rule, made into a class: keep the biggest group, then write the hand wherever it scores most right now.' },
        {
          code: {
            file: 'players.py', fn: 'Chaser.keep', notes: [
              ['def keep(self, card, hand, rolls_left):', ['It ignores the card and the rolls left.']],
              ['counts = counts_of(hand)', ['Count the faces.']],
              ['face = counts.index(max(counts))', ['The face of the biggest group (the lowest, on a tie).']],
              ['return (face,) * counts[face]', ['That many of that face.']],
            ],
          },
        },
        {
          code: {
            file: 'players.py', fn: 'Chaser.box', notes: [
              ['def box(self, card, hand):', ['Greedy: the most points now.']],
              ['best = None', ['No box chosen yet.']],
              ['for b in legal_boxes(card, hand):', ['Each box it may use.']],
              ['if best is None or points(card, hand, b) > points(card, hand, best):', ['The first box, or a better one. `or` stops early: when `best is None` it doesn\'t evaluate the right side (which would fail).'], { logic: 'nothing chosen yet, or this box earns more than the best so far' }],
              ['best = b', ['Remember it.']],
              ['return best', ['The box with the most points now (the first one on a tie).']],
            ],
          },
        },
        {
          code: {
            file: 'players.py', fn: 'Chaser.start_turn', notes: [
              ['def start_turn(self, card):', ['Every player must have this method, so the loop can call it.']],
            ],
          },
        },
        { figure: 'GameReplay', props: { player: 'chaser' }, caption: 'A whole game, turn by turn: the 15 dice, each keep, the box and the points. Change the seed or the player.' },
        {
          predict: {
            prompt: 'The Chaser\'s average over the lab\'s 2,000 evaluation games (seeds 1,000,000 onwards)? (1 decimal; it takes a moment)',
            answer: P.chaser.mean, tolerance: 0.05, compute: () => mean(playGames(new Chaser(), M.evalGames, M.evalSeed)),
            explain: `${f(P.chaser.mean)}. It reaches the upper bonus in only ${pct(P.chaser.bonusRate)} of games, and scores a Yahtzee in ${pct(P.chaser.yahtzeeRate)}.`,
          },
        },
        { note: 'A player is any object with `start_turn`, `keep` and `box`. Games are seeded one per game, and each turn\'s dice are rolled in advance, so **the same seed means the same dice** for every player.' },
      ],
    },

    {
      id: 'one-turn-planner', number: '4.3', title: 'Planning one turn at a time',
      goal: 'Reuse Part 2\'s exact solver to plan every turn of a game, and explain why maximising each turn\'s points isn\'t maximising the game.',
      builds: ['game-loop', 'planning-backwards'],
      blocks: [
        { md: `Part 2 solved a turn aimed at **one** box. In a game you choose the box at the end, so a final hand is worth its **best** legal box:

$$V_0(h) = \\max_{b \\in \\text{legal}(h)} \\text{points}(\\text{card}, h, b)$$

Give \`solve_from\` these values instead of one box's scores, and two backups give the perfect keeps for "as many points as possible **this turn**". That is the **Planner**. It is exact, and it is greedy across turns: it never asks what using up a box costs later.` },
        {
          code: {
            file: 'players.py', fn: 'Planner.__init__', notes: [
              ['def __init__(self, value=None):', ['`__init__` runs when the object is made: `Planner()` or `Planner(value)`. The `value` function comes in lesson 4.6.']],
              ['self.value = value', ['Store it on the object.']],
            ],
          },
        },
        {
          code: {
            file: 'players.py', fn: 'Planner.start_turn', notes: [
              ['def start_turn(self, card):', ['Solve this turn, for this card.']],
              ['self.after = {}', ['A cache for lesson 4.6; empty at the start of each turn.']],
              ['V0 = {}', ['What every final hand is worth…']],
              ['for hand in HANDS:', ['…for all 252…']],
              ['V0[hand] = max(self.worth(card, hand, b) for b in legal_boxes(card, hand))', ['…its best legal box. With no value function, `worth` is just `points`.'], { tex: 'V_0(h) = \\max_{b} \\text{worth}(h, b)' }],
              ['self.V, self.Q = solve_from(V0)', ['Part 2\'s backward induction, unchanged.']],
            ],
          },
        },
        {
          code: {
            file: 'players.py', fn: 'Planner.keep', notes: [
              ['def keep(self, card, hand, rolls_left):', ['Read the policy from this turn\'s solution.']],
              ['row = self.Q[rolls_left][hand]', ['The keep values.']],
              ['return max(row, key=row.get)', ['The argmax.']],
            ],
          },
        },
        {
          code: {
            file: 'players.py', fn: 'Planner.box', notes: [
              ['def box(self, card, hand):', ['The box where the final hand is worth most.']],
              ['boxes = legal_boxes(card, hand)', ['The choices.']],
              ['return max(boxes, key=lambda b: self.worth(card, hand, b))', ['The argmax over boxes.']],
            ],
          },
        },
        {
          code: {
            file: 'players.py', fn: 'match', notes: [
              ['def match(games=5, seed=0):', ['For the Python tab: both players on the same dice.']],
              ['chaser = play_games(Chaser(), games, seed)', ['`Chaser()` makes a new Chaser.']],
              ['planner = play_games(Planner(), games, seed)', ['A Planner with no value function.']],
              ['return list(zip(chaser, planner))', ['`zip` pairs them up game by game.']],
            ],
          },
        },
        { python: { program: 'match', label: 'Watch the Chaser and the Planner play the same dice' } },
        { figure: 'WherePoints', caption: `Average points per box over 2,000 games. The Planner (${f(P.planner.mean)}) beats the Chaser (${f(P.chaser.mean)}) almost everywhere, but look at the upper section and the bonus.` },
        { md: `The Planner averages **${f(P.planner.mean)}**, ${f(P.planner.mean - P.chaser.mean)} more than the Chaser. Yet it reaches the upper bonus in only **${pct(P.planner.bonusRate)}** of games. Why? Early in the game, a hand like $(2, 3, 3, 5, 6)$ scores 19 in Chance and only 6 in Threes, so the Planner writes Chance. A few turns later it has a poor hand and nowhere good to put it. Each turn it takes the most points available, and pays for it in later turns. Points now aren't the whole story: **the boxes left open have value**.` },
        {
          choice: {
            prompt: 'The Planner solves every turn **exactly**. Why isn\'t it an optimal player?',
            options: [
              { text: 'It maximises this turn\'s points, but the best game needs to weigh this turn against the boxes it uses up for the future', why: 'Yes. Optimal for one turn, greedy for the game. The fix is the theme of the rest of this part: give the future a value.' },
              { text: 'Because its solver is approximate', why: 'Its turn solver is Part 2\'s exact one. What it optimises is the problem.' },
              { text: 'Because it doesn\'t explore', why: 'Exploring helps a learner find out about the world. The Planner already knows the dice\'s chances exactly; it is missing a value for the future, not information.' },
            ],
            answer: 0,
          },
        },
        { note: `Exact per turn, greedy across turns: ${f(P.planner.mean)} points. Greedy decisions are often good and rarely optimal, because they ignore what an action does to the **future**: here, the boxes left open.` },
      ],
    },

    {
      id: 'how-sure', number: '4.4', title: 'How sure can you be? Statistics for noisy games',
      goal: 'Compute a mean, standard deviation and standard error for a player, and compare two players fairly with paired games.',
      builds: ['one-turn-planner', 'chance-by-experiment'],
      blocks: [
        { md: `A game of Yahtzee is very noisy. The Planner's scores have a **standard deviation** of about ${f(P.planner.sd)}: a single game typically lands that far from its average, and its games range from ${P.planner.min} to ${P.planner.max}. One game says almost nothing about a player.

As in lesson 1.6, the **average** of $n$ games wobbles much less than one game. Its typical error, the **standard error**, is

$$\\text{SE} = \\frac{s}{\\sqrt n}, \\qquad s = \\sqrt{\\frac{1}{n-1}\\sum_i (x_i - \\bar x)^2}$$

where $s$ is the sample standard deviation. (Dividing by $n - 1$ rather than $n$ corrects for measuring the spread around $\\bar x$, the sample's own average, which sits a little closer to the data than the true mean does.) The true average is within $\\bar x \\pm 2\\,\\text{SE}$ about 95% of the time.` },
        {
          code: {
            file: 'stats.py', fn: 'std', notes: [
              ['def std(xs):', ['The sample standard deviation.']],
              ['m = mean(xs)', ['The average, $\\bar x$.']],
              ['return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))', ['Square each distance from the average, add, divide by $n - 1$, take the square root.'], { tex: 's = \\sqrt{\\tfrac{1}{n-1}\\sum_i (x_i - \\bar x)^2}' }],
            ],
          },
        },
        {
          code: {
            file: 'stats.py', fn: 'mean', notes: [
              ['def mean(xs):', ['The average.']],
              ['return sum(xs) / len(xs)', ['Sum over count.'], { tex: '\\bar x = \\tfrac1n \\sum_i x_i' }],
            ],
          },
        },
        {
          code: {
            file: 'stats.py', fn: 'standard_error', notes: [
              ['def standard_error(xs):', ['How much the average wobbles.']],
              ['return std(xs) / math.sqrt(len(xs))', ['Spread of one game over $\\sqrt n$.'], { tex: '\\text{SE} = s / \\sqrt n' }],
            ],
          },
        },
        { figure: 'Histograms', caption: 'Score distributions over 2,000 games each. The players overlap a lot: the Planner loses to the Chaser in some games.' },
        { md: `Now compare two players. Play each on the **same seeds** and look at the difference game by game, $d_i = a_i - b_i$. The SE of the average difference is $s_d / \\sqrt n$. If the players' games were independent, the variances would add: $\\text{SE}^2_{a-b} = \\text{SE}^2_a + \\text{SE}^2_b$. But because each turn's dice are rolled in advance (lesson 4.2), the two games share their luck: a game where the first rolls are great is good for **both**. The shared luck cancels in the difference, so its spread is smaller. This is called **common random numbers**, or a **paired comparison**.

Measured on 2,000 games:

| Comparison | Difference | SE, paired | SE if independent |
|---|---|---|---|
| Planner − Chaser | ${f(M.paired['planner-chaser'].mean)} | ${f(M.paired['planner-chaser'].sePaired)} | ${f(M.paired['planner-chaser'].seIndependent)} |
| Learned (boxes) − Planner | ${f(M.paired['boxes-planner'].mean)} | ${f(M.paired['boxes-planner'].sePaired)} | ${f(M.paired['boxes-planner'].seIndependent)} |
| Learned (bonus) − Learned (boxes) | ${f(M.paired['bonus-boxes'].mean)} | ${f(M.paired['bonus-boxes'].sePaired)} | ${f(M.paired['bonus-boxes'].seIndependent)} |

Pairing helps most when the players are similar, because their games share more. For the last pair it is like playing **${f((M.paired['bonus-boxes'].seIndependent / M.paired['bonus-boxes'].sePaired) ** 2)} times as many** games.` },
        {
          code: {
            file: 'stats.py', fn: 'compare', notes: [
              ['def compare(player_a, player_b, games=200, seed=0):', ['Two players, same seeds.']],
              ['a = play_games(player_a, games, seed)', ['Player a\'s scores.']],
              ['b = play_games(player_b, games, seed)', ['Player b\'s, on the same dice.']],
              ['differences = [x - y for x, y in zip(a, b)]', ['Game by game.']],
              ['return mean(differences), standard_error(differences), standard_error(a)', ['The average difference, its SE, and for comparison the SE of a alone.']],
            ],
          },
        },
        {
          code: {
            file: 'stats.py', fn: 'planner_vs_chaser', notes: [
              ['def planner_vs_chaser(games=100, seed=0):', ['For the Python tab.']],
              ['difference, se, se_planner = compare(Planner(), Chaser(), games, seed)', ['Three results, unpacked into three names.']],
              ['print("Planner - Chaser:", round(difference, 2), "+/-", round(2 * se, 2), "(95% of the time within 2 standard errors)")', ['The difference with a 95% margin.']],
              ['return difference, se', ['Both.']],
            ],
          },
        },
        { python: { program: 'stats', label: 'Compare the Planner and the Chaser in real Python' } },
        {
          predict: {
            prompt: `A player's games have standard deviation ${f(P.boxes.sd)}. What is the standard error of its average over 2,000 games? (2 decimals)`,
            answer: P.boxes.sd / Math.sqrt(2000), tolerance: 0.006, compute: () => P.boxes.sd / Math.sqrt(2000),
            explain: `$${f(P.boxes.sd)} / \\sqrt{2000} = ${f(P.boxes.sd)} / 44.7 = ${(P.boxes.sd / Math.sqrt(2000)).toFixed(2)}$. Two thousand games pin the average to about ±2.5 points (2 SE).`,
            misconceptions: [{ answer: P.boxes.sd / 2000, tolerance: 0.001, feedback: 'Divide by $\\sqrt n$, not $n$.' }],
          },
        },
        {
          predict: {
            prompt: 'With SE = 1.25 per player, how many games would you need per player to bring the SE down to 0.25?',
            answer: 50000, tolerance: 0.5, compute: () => 2000 * (1.25 / 0.25) ** 2,
            explain: 'SE shrinks like $1/\\sqrt n$: five times smaller needs 25 times as many games, 50,000.',
            misconceptions: [{ answer: 10000, tolerance: 0.5, feedback: 'Five times smaller needs $5^2 = 25$ times as many games, not five.' }],
          },
        },
        { note: '**Mean ± 2 SE** before believing any average. **Pair** comparisons on the same dice; the shared luck cancels. A difference smaller than about 2 SE of the difference may be luck.' },
      ],
    },

    {
      id: 'too-many-states', number: '4.5', title: 'Too many states for a table',
      goal: 'Count the states of the whole game, and explain why the learner must generalise from features instead of filling a table.',
      builds: ['how-sure', 'afterstates'],
      blocks: [
        { md: `To play the whole game optimally, a decision must depend on the card, not just the hand: which boxes are open, how far the upper total is from 63, and whether the Yahtzee box holds 50 (so extra Yahtzees pay). How many different situations is that?

- which of the 13 boxes are filled: $2^{13} = 8192$
- the upper total, as far as the bonus cares: 0 to 63 (anything over 63 counts as 63): 64
- whether the Yahtzee box holds 50: 2

That is $8192 \\times 64 \\times 2 = 1{,}048{,}576$ cards, each with its own 13-box turn of 252 hands × 3 roll stages. Many are unreachable (the upper total can't be 60 with only Ones filled), but hundreds of thousands are not. A table learner would need to visit each of those many times. In 5,000 training games, about 65,000 turns, it would see almost all of them never.` },
        { md: `There's a way out, and Part 3 already showed it: **afterstates**. A decision ends a turn by writing a box. After that, everything the future depends on is **the card left behind**. So:

$$\\text{best box} = \\arg\\max_b \\Big[\\,\\text{points}(h, b) + V(\\text{card after writing } h \\text{ in } b)\\,\\Big]$$

where $V(\\text{card})$ is the expected points still to come from that card. We don't need a value per (card, hand, roll); a value per **card** is enough, and the Planner's exact per-turn solver takes care of the dice.

But a table of $V$ over a million cards is still too big. The answer is to **generalise**: describe a card by a few numbers (its **features**), and let $V$ be a simple function of them. Cards with similar features get similar values, including cards never seen in training.` },
        {
          predict: {
            prompt: 'How many different sets of filled boxes are there, from the empty card to the full one?',
            answer: 2 ** 13, compute: () => 2 ** 13,
            explain: 'Each of 13 boxes is filled or not: $2^{13} = 8192$. With the upper total and the Yahtzee flag, over a million situations.',
            misconceptions: [{ answer: 13, feedback: 'That counts boxes. Each subset of boxes is a different situation: $2^{13}$.' }, { answer: 169, feedback: '$13^2$ isn\'t it: each box is either filled or not, independently: $2 \\times 2 \\times \\dots = 2^{13}$.' }],
          },
        },
        {
          choice: {
            prompt: 'Why is a value of the **card left** enough to make every decision in a turn?',
            options: [
              { text: 'Because once the box is written, the future depends only on the card: the hand and the dice of this turn are gone', why: 'Yes. The card after writing is an afterstate, exactly like the kept dice in lesson 3.7. The Planner already handles the dice within the turn exactly.' },
              { text: 'Because the hand doesn\'t matter in Yahtzee', why: 'The hand matters a lot **this** turn: it decides the points. But points now are counted separately, and after the turn the hand is forgotten.' },
            ],
            answer: 0,
          },
        },
        { note: 'A million cards: too many for a table. The **afterstate** idea reduces the problem to one value per card; **generalising from features** makes that value small enough to learn.' },
      ],
    },

    {
      id: 'value-of-a-card', number: '4.6', title: 'A value for the card left',
      goal: 'Write a linear value function over features of the card, and plug it into the Planner so that every turn weighs points now against the future.',
      builds: ['too-many-states', 'one-turn-planner'],
      blocks: [
        { md: `The simplest useful features: for each box, 1.0 if it is still **open** and 0.0 if filled. Then a **linear** value is

$$\\hat V(\\text{card}) = \\sum_{i=1}^{13} w_i\\, x_i(\\text{card}) = \\mathbf w \\cdot \\mathbf x$$

and each weight $w_i$ has a plain meaning: **what keeping box $i$ open is worth**, in expected future points. A full card has every feature 0, so its value is exactly 0: correct, since nothing is left to score. Before any learning, every weight is 0 and the value is 0, which turns the player back into the one-turn Planner.

Lesson 4.8 adds features for the upper bonus. For now, just the 13.` },
        {
          symbols: [
            ['\\mathbf x(\\text{card})', 'x of card', 'the **features**: here 13 numbers, 1.0 for each open box', 'features(card)'],
            ['\\mathbf w', 'w', 'the **weights**, one per feature: learned in lesson 4.7', 'weights'],
            ['\\hat V', 'V hat', 'the **estimated** value: expected points still to come', 'value(weights, card)'],
            ['\\mathbf w \\cdot \\mathbf x', 'w dot x', 'the **dot product**: multiply matching entries, add up', 'for w, x in zip(…): total += w * x'],
          ],
        },
        {
          code: {
            file: 'afterstate.py', fn: 'features', notes: [
              ['def features(card, bonus=False):', ['The card, described by numbers.']],
              ['boxes = card["boxes"]', ['A shorter name.']],
              ['x = []', ['The feature list.']],
              ['for box in range(13):', ['One feature per box…']],
              ['x.append(1.0 if boxes[box] is None else 0.0)', ['…1.0 if it is open.'], { tex: 'x_i = [\\text{box } i \\text{ open}]' }],
              ['if bonus:', ['The extra features of lesson 4.8.']],
              ['open_upper = [box for box in range(6) if boxes[box] is None]', ['Open upper boxes.']],
              ['need = max(0, 63 - card["upper"])', ['Points still needed for the bonus (0 once reached).'], { calc: q => [`max(0, 63 − ${q.card.upper})`, Math.max(0, 63 - q.card.upper)] }],
              ['par = sum(3 * (box + 1) for box in open_upper)', ['"Par": three of each open upper face. If every open upper box gets three of its face, the upper section gains `par`.']],
              ['chasing = card["upper"] < 63 and len(open_upper) > 0', ['The bonus is still possible to earn but not earned yet.'], { logic: 'the bonus isn\'t reached, and an upper box is still open' }],
              ['for low, high in BANDS:', ['Six bands of how far ahead of par the card is: `BANDS` at the top of the file.']],
              ['x.append(1.0 if chasing and low <= par - need < high else 0.0)', ['1.0 in the one band that `par − need` falls in. A **one-hot** encoding: exactly one of the six is on (or none, when not chasing).'], { tex: 'x_{13+j} = [\\text{chasing} \\wedge \\text{par} - \\text{need} \\in \\text{band}_j]' }],
              ['return x', ['13 numbers, or 19.']],
            ],
          },
        },
        {
          code: {
            file: 'afterstate.py', fn: 'value', notes: [
              ['def value(weights, card, bonus=False):', ['The linear value.']],
              ['total = 0.0', ['A running sum.']],
              ['for w, x in zip(weights, features(card, bonus)):', ['Matching weights and features.']],
              ['total += w * x', ['Weight times feature.'], { tex: '\\hat V = \\sum_i w_i x_i' }],
              ['return total', ['The estimated points still to come.']],
            ],
          },
        },
        { md: 'The Planner already had a slot for this. With a value function, a final hand\'s worth in a box is its points **plus the value of the card left**. Writing the hand in each box and evaluating the result for all 252 hands would repeat a lot of work, so `worth` caches by `(box, gained)`: the card left depends only on which box is written and how many points it got.' },
        {
          code: {
            file: 'players.py', fn: 'Planner.worth', notes: [
              ['def worth(self, card, hand, box):', ['What ending the turn this way is worth.']],
              ['gained = points(card, hand, box)', ['Points now.']],
              ['if self.value is None:', ['No value function: the one-turn Planner.']],
              ['return gained', ['Points only.']],
              ['key = (box, gained)', ['Everything the card left depends on.']],
              ['if key not in self.after:', ['Not worked out yet this turn…']],
              ['self.after[key] = self.value(write(card, hand, box))', ['…value the card left.']],
              ['return gained + self.after[key]', ['Points now plus the future.'], { tex: '\\text{worth}(h, b) = \\text{points}(h, b) + \\hat V(\\text{card} \\oplus (h, b))' }],
            ],
          },
        },
        { figure: 'CardValueFig', caption: 'The learned weights from lesson 4.7 applied to a card: open or fill boxes and see the estimated points still to come.' },
        {
          predict: {
            prompt: `Using the learned weights (open boxes only), what is the estimated value of the **empty** card? (1 decimal) That is the player's own prediction of its average score.`,
            answer: value(P.boxes.weights, newCard()), tolerance: 0.05, compute: () => value(P.boxes.weights, newCard()),
            explain: `Every feature is 1, so the value is the sum of all 13 weights: ${f(value(P.boxes.weights, newCard()))}. The player actually averages ${f(P.boxes.mean)}. The weights were learned to predict exactly that, and they come close.`,
          },
        },
        { note: '**Features** describe a card with a few numbers; a **linear value** $\\mathbf w \\cdot \\mathbf x$ turns them into expected future points. Each weight here reads as "what this open box is worth". The Planner now maximises points **plus** the future.' },
      ],
    },

    {
      id: 'td-zero', number: '4.7', title: 'Learning the weights by TD(0)',
      goal: 'Derive the semi-gradient TD(0) update for a linear value, compute one update by hand, and read the learning curve and the learned weights.',
      builds: ['value-of-a-card', 'td-update'],
      blocks: [
        { added: true, kind: 'recall', note: 'The TD target of lesson 3.3 is a one-step sample of what a value should be: the reward just seen plus the value of where you landed. In Part 3 the update moved one table entry towards it. Here there is no table: $\\hat V(\\text{card}) = \\mathbf w \\cdot \\mathbf x$ is computed from the card\'s features $\\mathbf x$, 1.0 for each open box, and the weights $\\mathbf w$ are what learn (lesson 4.6).' },
        { md: `The weights should make $\\hat V(\\text{card})$ equal the expected points still to come. After one turn we have a sample of that: the turn's reward $r$ plus the value of the next card, $r + \\hat V(\\text{card}')$. As in Part 3, that is the TD target, and the TD error is

$$\\delta = r + \\hat V(\\text{card}') - \\hat V(\\text{card})$$

With a table we nudged one entry. Now there are no entries, only weights shared by every card. Which way should each weight move? Treat it as reducing the squared error $\\tfrac12 \\delta^2$ by **gradient descent**, holding the target fixed. Since $\\hat V = \\sum_i w_i x_i$, the derivative of $\\hat V$ with respect to $w_i$ is just $x_i$, and

$$w_i \\leftarrow w_i + \\alpha\\, \\delta\\, x_i$$

Each weight moves in proportion to its feature: weights of open boxes move, weights of filled boxes (feature 0) don't. This is **semi-gradient TD(0)**. ("Semi" because the target also contains $\\hat V$, and we pretend it doesn't depend on the weights.)

There is no ε here. The dice already make every game different, and the Planner always picks its best move: the randomness of the game does the exploring. That is the same choice made by TD-Gammon, the backgammon program that first made this method famous.` },
        {
          code: {
            file: 'afterstate.py', fn: 'train', notes: [
              ['def train(games=1000, alpha=0.01, bonus=False, seed=0):', ['Play and learn, game after game.']],
              ['weights = [0.0] * len(features(new_card(), bonus))', ['One weight per feature, all 0: the starting player is the one-turn Planner.']],
              ['planner = Planner(lambda card: value(weights, card, bonus))', ['A Planner whose value function reads the **current** weights. The `lambda` sees `weights` itself, so as the list changes, the Planner\'s judgement changes with it.']],
              ['rng = random.Random(seed)', ['The training dice.']],
              ['history = []', ['A copy of the weights after every game.']],
              ['for game in range(games):', ['Each training game.']],
              ['card = new_card()', ['Empty card.']],
              ['for turn in range(13):', ['Each turn.']],
              ['hand = play_turn(planner, card, roll(15, rng))', ['Play the turn with the current values.']],
              ['box = planner.box(card, hand)', ['Choose the box: points now + value of the card left.']],
              ['reward = points(card, hand, box)', ['The reward.']],
              ['next_card = write(card, hand, box)', ['The afterstate.']],
              ['error = reward + value(weights, next_card, bonus) - value(weights, card, bonus)', ['The TD error. At the last turn `next_card` is full, so its value is exactly 0.'], { tex: '\\delta = r + \\hat V(c\') - \\hat V(c)' }],
              ['x = features(card, bonus)', ['The features of the card being updated.']],
              ['for i in range(len(weights)):', ['Every weight…']],
              ['weights[i] += alpha * error * x[i]', ['…moves by α δ $x_i$.'], { tex: 'w_i \\leftarrow w_i + \\alpha\\, \\delta\\, x_i' }],
              ['card = next_card', ['On to the next turn.']],
              ['history.append(list(weights))', ['A copy: `list(weights)` makes a new list, so later changes don\'t alter it.']],
              ['return weights, history', ['The learned weights, and how they got there.']],
            ],
          },
        },
        {
          predict: {
            prompt: `The very first training turn: all weights 0, the card empty (all 13 features 1). The Planner scores ${firstTD.reward} points. With α = 0.01, what is each weight after this update?`,
            answer: 0.01 * firstTD.reward, tolerance: 1e-9, compute: () => { let first = null; trainValue({ games: 1, onTurn: t => { first ??= t } }); return 0.01 * first.error },
            explain: `Both values are 0 (all weights are 0), so $\\delta = ${firstTD.reward} + 0 - 0 = ${firstTD.reward}$. Every feature is 1, so every weight moves by $0.01 \\times ${firstTD.reward} \\times 1 = ${f(0.01 * firstTD.reward)}$.`,
            misconceptions: [{ answer: firstTD.reward, feedback: 'That is δ. Each weight moves by α × δ × its feature.' }],
          },
        },
        { figure: 'TDTrainer', caption: 'TD(0) running in your browser with the same dice as Python. Watch the weights grow from 0, then grade the result on fresh games.' },
        { python: { program: 'td', label: 'Step through TD(0) in real Python' } },
        { md: `Measured: train with seed 0 and grade on 500 fresh games at each point.

| Training games | 10 | 25 | 50 | 100 | 250 | 500 | 1,000 | 2,000 | 5,000 |
|---|---|---|---|---|---|---|---|---|---|
| Average score | ${M.curves.boxes.filter(([g]) => [10, 25, 50, 100, 250, 500, 1000, 2000, 5000].includes(g)).map(([, s]) => f(s)).join(' | ')} |

It starts **below** the Planner (${f(P.planner.mean)}): half-learned weights make poor trades. By a few hundred games it has passed it, and it levels off near **${f(P.boxes.mean)}** (2,000 games, SE ${f(P.boxes.se)}). The wiggles at the end are mostly grading noise: each point is 500 games, SE about 2.5.` },
        { figure: 'LearnedWeights', caption: 'The weights after 5,000 games: what each open box is worth, in expected points, at the start of a game.' },
        { md: `The weights make sense. Small straight (worth about ${f(P.boxes.weights[9])} open) and Chance (${f(P.boxes.weights[12])}) are valuable to keep. Yahtzee open is worth only about ${f(P.boxes.weights[11])}, because it usually ends as a 0. And the upper boxes are worth more than their par would suggest ($3 \\times$ face), because they also carry the bonus. Nobody wrote these numbers: they were learned from about 65,000 turns.` },
        {
          choice: {
            prompt: 'When a turn writes Sixes, which weights does that turn\'s update change?',
            options: [
              { text: 'The weights of every box that was open **before** the turn, Sixes included', why: 'Yes. The update uses the features of the card **before** the turn ($x_i = 1$ for each open box). All of them share the credit or blame for the TD error.' },
              { text: 'Only the weight of Sixes', why: 'The update is $\\alpha \\delta x_i$ for every $i$, and every open box has $x_i = 1$.' },
              { text: 'Only the weights of boxes still open after the turn', why: 'It uses the card being valued, the one before the turn.' },
            ],
            answer: 0,
          },
        },
        { note: 'Semi-gradient **TD(0)**: $w \\leftarrow w + \\alpha\\, \\delta\\, \\mathbf x$, with $\\delta = r + \\hat V(c\') - \\hat V(c)$. The randomness of the dice does the exploring. 13 weights, learned in about 1,000 games, lift the Planner from ' + f(P.planner.mean) + ' to about ' + f(P.boxes.mean) + '.' },
      ],
    },

    {
      id: 'features-matter', number: '4.8', title: 'Features decide what can be learned',
      goal: 'Add features for the upper bonus, measure the improvement with a paired comparison, and judge whether it is real.',
      builds: ['td-zero', 'how-sure'],
      blocks: [
        { md: `With open-box features only, the value can't see **how the upper bonus is going**. A card with 60 points in the upper section and Sixes still open, and a card with 20 and only Ones open, look the same if the same boxes are open. But the first is almost sure to collect 35 more points, and the second has no chance.

A linear value can only weigh what the features show. So add features that show it. "Par" is three of each open upper face: if every open upper box got three of its face, the upper section would rise by par. Compare par with the points still needed, \`need\`:

- far behind par (par − need < −10): the bonus is nearly hopeless;
- around par: it depends on the dice;
- well ahead (≥ 10): almost certain.

Six **bands**, encoded **one-hot**: exactly one feature is 1.0 while the bonus is still being chased. Each band gets its own weight, so the learner can give each situation its own value, rather than assuming value rises in a straight line with "par − need".` },
        {
          code: {
            file: 'afterstate.py', from: 1, to: 8, caption: 'the bands', notes: [
              ['BANDS = [(-99, -10), (-10, -4), (-4, 0), (0, 4), (4, 10), (10, 99)]', ['Each `(low, high)` covers `low ≤ par − need < high`. −99 and 99 are simply beyond any possible value.']],
            ],
          },
        },
        { figure: 'LearnedWeights', props: { which: 'bonus' }, caption: 'Weights learned with the bonus bands (5,000 games). The band weights read as "how much the bonus situation is worth".' },
        { md: `The band weights come out ordered as you would hope: far behind par is worth ${f(P.bonus.weights[13])}, well ahead ${f(P.bonus.weights[18])} (the bonus is 35). Measured on the same 2,000 evaluation games:

- open boxes only: **${f(P.boxes.mean)}**, bonus reached in ${pct(P.boxes.bonusRate)} of games
- with bonus bands: **${f(P.bonus.mean)}**, bonus reached in ${pct(P.bonus.bonusRate)}

Is a ${f(M.paired['bonus-boxes'].mean)}-point difference real? Each average has SE about 1.25. If the games were independent, the SE of the difference would be ${f(M.paired['bonus-boxes'].seIndependent)}, making the difference about ${(M.paired['bonus-boxes'].mean / M.paired['bonus-boxes'].seIndependent).toFixed(1)} SE. Paired on the same dice, the SE is ${f(M.paired['bonus-boxes'].sePaired)}, and the difference is **${(M.paired['bonus-boxes'].mean / M.paired['bonus-boxes'].sePaired).toFixed(1)} SE**: far too many to be luck.

One caution: both players were trained with one seed. A different training seed gives somewhat different weights and scores; a careful claim would train several of each.` },
        {
          predict: {
            prompt: `The paired difference is ${f(M.paired['bonus-boxes'].mean)} with SE ${f(M.paired['bonus-boxes'].sePaired)}. How many standard errors is that? (1 decimal)`,
            answer: M.paired['bonus-boxes'].mean / M.paired['bonus-boxes'].sePaired, tolerance: 0.06, compute: () => M.paired['bonus-boxes'].mean / M.paired['bonus-boxes'].sePaired,
            explain: 'Difference ÷ SE. Anything beyond about 2 is unlikely to be luck; this is far beyond.',
          },
        },
        {
          choice: {
            prompt: 'Lesson 1.3 merged rolls that score the same; lesson 3.7 merged keeps with the same future. What did this lesson do?',
            options: [
              { text: 'It **split** cards that the old features merged but that have different futures', why: 'Yes. Good features merge what really is the same and separate what isn\'t. Open-box features merged cards with very different bonus chances.' },
              { text: 'It made the value function non-linear', why: 'It is still linear in the features: $\\mathbf w \\cdot \\mathbf x$. The features themselves are a non-linear description of the card, which is how linear methods get their power.' },
            ],
            answer: 0,
          },
        },
        { note: 'A linear learner can only learn what its features can express. Adding 6 well-chosen features gained about ' + f(M.paired['bonus-boxes'].mean) + ' points, confirmed by a **paired** comparison. Feature design is where knowledge about a problem goes into a learner.' },
      ],
    },

    {
      id: 'gap-to-perfect', number: '4.9', title: 'How far from perfect?',
      goal: 'Place every player against the known optimum, say what the remaining gap is made of, and name the methods that close it.',
      builds: ['features-matter'],
      blocks: [
        { md: `Solitaire Yahtzee has been **solved exactly**. Tom Verhoeff (1999) and others ran backward induction over the whole game: every card (lesson 4.5's million), every turn, every hand. The optimal expected score is **254.59**. Nothing in this lab computes that number; it is quoted from those published solutions. So, on the lab's evaluation games:

| Player | Average | What it knows |
|---|---|---|
| Chaser | ${f(P.chaser.mean)} | a rule of thumb |
| Planner | ${f(P.planner.mean)} | each turn solved exactly, no future |
| Learned, open boxes | ${f(P.boxes.mean)} | + 13 learned weights |
| Learned, + bonus bands | ${f(P.bonus.mean)} | + 6 more |
| Optimal (published) | 254.59 | everything |

The learned player has closed about ${Math.round(100 * (P.bonus.mean - P.planner.mean) / (254.59 - P.planner.mean))}% of the gap between the Planner and perfect play, using 19 numbers learned in seconds.` },
        { md: `What is the remaining ~${Math.round(254.59 - P.bonus.mean)} points made of? Things the linear value can't express:

- **Interactions.** Having both straights open is worth less than the sum of each alone, because one good run can only fill one box. A linear value adds weights; it can't say "this box is worth less if that one is open".
- **Timing.** A box's worth depends on how many turns are left to fill it. One weight per box can't capture that.
- **The Yahtzee bonus.** With 50 in the Yahtzee box, keeping boxes open as Joker targets has extra value. No feature shows it.

Three ways to go further, each a field in its own right:

1. **More features**, designed by hand, as in lesson 4.8.
2. **A neural network** as the value function, which can learn interactions by itself. TD-Gammon (Tesauro, 1995) did exactly this for backgammon with the same TD update. The Neural Net Lab builds networks from scratch.
3. **Exact dynamic programming** of the whole game: Part 2's backward induction over all 13 turns and every card. It is not hard to write, only heavy to run: billions of operations. It gives 254.59.` },
        { figure: 'Ladder', caption: 'Every player on one scale, with ±2 SE error bars.' },
        {
          choice: {
            prompt: 'Which of these could a linear value with open-box features **never** learn, however long it trains?',
            options: [
              { text: 'That Small straight open is worth less when Large straight is also open', why: 'Right. That is an interaction: the value of one feature depends on another. A sum of separate weights can\'t express it; a product feature or a network could.' },
              { text: 'That Chance open is worth more than Ones open', why: 'That is just two different weights: easy for a linear value, and it learned it.' },
              { text: 'That a full card is worth 0', why: 'Automatic: all features are 0.' },
            ],
            answer: 0,
          },
        },
        { note: `The full ladder: ${f(P.chaser.mean)} → ${f(P.planner.mean)} → ${f(P.boxes.mean)} → ${f(P.bonus.mean)} → 254.59. Each step added knowledge: exact planning, a learned future, better features. The last ~10 points need interactions: richer features, a network, or exact solution of the whole game.` },
      ],
    },
  ],
}

