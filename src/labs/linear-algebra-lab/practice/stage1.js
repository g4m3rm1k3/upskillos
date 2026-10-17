// Stage 1 practice: gentle problem families for the vector and dot-product lessons.
// Prompts name every input and output, and each answer comes from running the reference solution.
import { vec } from './helpers.js'

const lines = (...source) => source.join('\n')
const nonzeroVector = (r, n, min = -6, max = 6) => Array.from({ length: n }, () => r.nonzero(min, max))
const row = (r, n, min = -6, max = 6) => Array.from({ length: n }, () => r.int(min, max))

function problem(id, title, difficulty, build) {
  return { id, title, difficulty, generate(rng) {
    const { prompt, setup, solution, outputs, hints } = build(rng)
    return {
      prompt, setup, solution, hints,
      outputs: outputs.map(([name, message]) => ({ name, message, tolerance: 1e-6 })),
      starter: lines('% Replace each placeholder using the supplied inputs.', ...outputs.map(([name]) => `${name} = -999999;`)),
    }
  } }
}

export const stage1Practice = {
  'laml-arrays': [
    problem('read-entry', 'Read one entry', 'Warm-up', r => ({
      prompt: 'readings holds four sensor values in order. Store second = the second entry and fourth = the fourth entry. Positions start at 1.',
      setup: `readings = ${vec(row(r, 4, 1, 40))};`, solution: lines('second = readings(2);', 'fourth = readings(4);'),
      outputs: [['second', 'Use round brackets with the position: readings(2).'], ['fourth', 'The last of four entries is position 4.']],
      hints: ['An entry is read by its position, not by its value.', 'readings(2) is the second entry.', 'second = readings(2); fourth = readings(4);'],
    })),
    problem('count-entries', 'Count the entries', 'Warm-up', r => ({
      prompt: 'scores is a vector of test scores. Store count = how many scores there are, using length(scores), and last = the final score, scores(count).',
      setup: `scores = ${vec(row(r, r.int(3, 7), 40, 100))};`, solution: lines('count = length(scores);', 'last = scores(count);'),
      outputs: [['count', 'length gives the number of entries.'], ['last', 'The final entry sits at position count.']],
      hints: ['length(v) counts the entries of v.', 'The last position equals the number of entries.', 'count = length(scores); last = scores(count);'],
    })),
    problem('build-move', 'Build a move from its parts', 'Warm-up', r => ({
      prompt: 'A drone moves east metres east and north metres north. Store the move as a column vector move = [east; north], with east first.',
      setup: lines(`east = ${r.int(-9, 9)};`, `north = ${r.nonzero(-9, 9)};`), solution: 'move = [east; north];',
      outputs: [['move', 'Put east first and north second, separated by a semicolon.']],
      hints: ['Square brackets make a vector.', 'A semicolon inside the brackets starts the next row.', 'move = [east; north];'],
    })),
    problem('swap-order', 'Order matters', 'Apply', r => {
      const a = r.int(-9, 9), b = a + r.nonzero(-5, 5)
      return {
        prompt: 'position = [x; y] was typed in the wrong order by a colleague, who wrote [y; x]. Store fixed with the two entries swapped back, and store changed = 1 if fixed differs from position, otherwise 0.',
        setup: `position = [${a}; ${b}];`, solution: lines('fixed = [position(2); position(1)];', 'changed = 0;', 'if fixed(1) ~= position(1)', '  changed = 1;', 'end'),
        outputs: [['fixed', 'The second entry becomes the first.'], ['changed', 'The two entries are different here, so swapping changes the vector.']],
        hints: ['Build a new vector from the entries in the other order.', 'fixed = [position(2); position(1)];', 'Then compare the first entries with ~= (not equal) and set changed.'],
      }
    }),
    problem('update-entry', 'Change one entry', 'Apply', r => ({
      prompt: 'stock lists how many of each of three items a shop holds. Three more of item 2 arrive. Store updated, a copy of stock with its second entry increased by 3, and total = sum(updated).',
      setup: `stock = ${vec(row(r, 3, 0, 20))};`, solution: lines('updated = stock;', 'updated(2) = stock(2) + 3;', 'total = sum(updated);'),
      outputs: [['updated', 'Only the second entry changes.'], ['total', 'sum adds every entry.']],
      hints: ['Copy first: updated = stock;', 'An indexed assignment changes one entry: updated(2) = ...', 'updated(2) = stock(2) + 3; total = sum(updated);'],
    })),
    problem('weather-record', 'Unpack a record', 'Transfer', r => ({
      prompt: 'A weather record is report = [temperature; wind; rain], in that order. Store temperature, rain, and warmAndDry = 1 if the temperature is above 20 and rain is 0, otherwise 0.',
      setup: `report = [${r.int(5, 32)}; ${r.int(0, 40)}; ${r.pick([0, 0, r.int(1, 12)])}];`,
      solution: lines('temperature = report(1);', 'rain = report(3);', 'warmAndDry = 0;', 'if temperature > 20 && rain == 0', '  warmAndDry = 1;', 'end'),
      outputs: [['temperature', 'Temperature is the first entry.'], ['rain', 'Rain is the third entry.'], ['warmAndDry', 'Both conditions must hold: && means "and".']],
      hints: ['Name each entry by its position first.', '&& combines two conditions; == tests equality.', 'temperature = report(1); rain = report(3); then an if block sets warmAndDry.'],
    })),
  ],
  'laml-length-distance-cosine': [
    problem('pythagoras-3d', 'Length in three dimensions', 'Warm-up', r => ({
      prompt: 'A drone climbs as well as moving across the ground: move = [east; north; up]. Store ground = the length of [east; north] only, and total = the length of the whole move.',
      setup: `move = ${vec(row(r, 3, -8, 8))};`, solution: lines('ground = norm([move(1); move(2)]);', 'total = norm(move);'),
      outputs: [['ground', 'Use only the first two entries.'], ['total', 'Include all three entries.']],
      hints: ['Length is Pythagoras on the entries.', 'norm([move(1); move(2)]) ignores the climb.', 'ground = norm([move(1); move(2)]); total = norm(move);'],
    })),
    problem('two-leg-trip', 'A detour is never shorter', 'Apply', r => ({
      prompt: 'A courier goes from start to stop, then from stop to finish. Store path = the length of the first leg plus the length of the second, direct = the straight distance from start to finish, and detour = path - direct.',
      setup: lines(`start = ${vec(row(r, 2, -6, 6))};`, `stop = ${vec(row(r, 2, -6, 6))};`, `finish = ${vec(row(r, 2, -6, 6))};`),
      solution: lines('path = norm(stop - start) + norm(finish - stop);', 'direct = norm(finish - start);', 'detour = path - direct;'),
      outputs: [['path', 'Add the lengths of the two legs.'], ['direct', 'Subtract start from finish, then take the length.'], ['detour', 'The extra distance caused by the stop.']],
      hints: ['Each leg is a subtraction followed by norm.', 'The direct route ignores the stop.', 'path = norm(stop - start) + norm(finish - stop); direct = norm(finish - start); detour = path - direct;'],
    })),
  ],
  'laml-shopping-bill': [
    problem('compare-shops', 'Which shop is cheaper?', 'Apply', r => ({
      prompt: 'basket lists how many of each item you need. shopA and shopB list each shop\'s prices in the same order. Store billA, billB and saving = billA - billB (positive means shop B is cheaper).',
      setup: lines(`basket = ${vec(row(r, 3, 1, 5))};`, `shopA = ${vec(row(r, 3, 1, 9))};`, `shopB = ${vec(row(r, 3, 1, 9))};`),
      solution: lines('billA = dot(basket, shopA);', 'billB = dot(basket, shopB);', 'saving = billA - billB;'),
      outputs: [['billA', 'Dot the basket with shop A\'s prices.'], ['billB', 'Dot the basket with shop B\'s prices.'], ['saving', 'Subtract bill B from bill A.']],
      hints: ['Each bill is a dot product of amounts with prices.', 'The same basket goes with both price lists.', 'billA = dot(basket, shopA); billB = dot(basket, shopB); saving = billA - billB;'],
    })),
  ],
  'laml-work-force': [
    problem('work-done', 'Work along a movement', 'Warm-up', r => ({
      prompt: 'A force (in newtons) moves an object by move (in metres). Store work = dot(force, move), in joules.',
      setup: lines(`force = ${vec(row(r, 2, -20, 20))};`, `move = ${vec(row(r, 2, -8, 8))};`), solution: 'work = dot(force, move);',
      outputs: [['work', 'Work is the dot product of force and movement.']],
      hints: ['Multiply matching entries and add.', 'dot(force, move) does it in one step.', 'work = dot(force, move);'],
    })),
    problem('right-angle-test', 'Test for a right angle', 'Warm-up', r => {
      // Half the draws are at right angles ([-a2; a1] scaled), half are not.
      const a = nonzeroVector(r, 2), s = r.nonzero(-2, 2)
      const b = r.pick([true, false]) ? [-a[1] * s, a[0] * s] : [a[0] + r.nonzero(-3, 3), a[1] + r.int(-3, 3)]
      return {
        prompt: 'Store d = dot(a, b), and isRight = 1 if a and b are at right angles (d is 0), otherwise 0.',
        setup: lines(`a = ${vec(a)};`, `b = ${vec(b)};`), solution: lines('d = dot(a, b);', 'isRight = 0;', 'if abs(d) < 1e-9', '  isRight = 1;', 'end'),
        outputs: [['d', 'Multiply matching entries and add.'], ['isRight', 'Right angles give a dot product of 0.']],
        hints: ['Right angles mean a zero dot product.', 'Compare with a small tolerance: abs(d) < 1e-9.', 'd = dot(a, b); then an if block sets isRight.'],
      }
    }),
    problem('build-perpendicular', 'Build a direction at right angles', 'Apply', r => ({
      prompt: 'For force = [a; b], the vector [-b; a] is at right angles to it. Store perp = [-force(2); force(1)] and check = dot(force, perp).',
      setup: `force = ${vec(nonzeroVector(r, 2, -9, 9))};`, solution: lines('perp = [-force(2); force(1)];', 'check = dot(force, perp);'),
      outputs: [['perp', 'Swap the entries and change the sign of the new first entry.'], ['check', 'The dot product should be 0.']],
      hints: ['Write the two entries in swapped order.', 'Negate the new first entry.', 'perp = [-force(2); force(1)]; check = dot(force, perp);'],
    })),
    problem('two-forces', 'Two forces, one movement', 'Apply', r => ({
      prompt: 'Two forces f1 and f2 act on a crate that moves by move. Store together = the work done by f1 + f2, and separately = the work of f1 plus the work of f2.',
      setup: lines(`f1 = ${vec(row(r, 2, -15, 15))};`, `f2 = ${vec(row(r, 2, -15, 15))};`, `move = ${vec(row(r, 2, -6, 6))};`),
      solution: lines('together = dot(f1 + f2, move);', 'separately = dot(f1, move) + dot(f2, move);'),
      outputs: [['together', 'Add the forces first, then take the dot product.'], ['separately', 'Take two dot products and add them.']],
      hints: ['Work is a dot product with the movement.', 'Try it both ways: add first, or dot first.', 'together = dot(f1 + f2, move); separately = dot(f1, move) + dot(f2, move);'],
    })),
    problem('ramp-work', 'Sliding down a ramp', 'Transfer', r => {
      const dx = r.int(2, 8), dy = r.int(1, 5)
      return {
        prompt: 'A block of mass m slides down a ramp by move = [dx; -dy]. Gravity pulls with weight = [0; -m*10]. The ramp pushes with normal, which is at right angles to the ramp. Store gravityWork = dot(weight, move) and normalWork = dot(normal, move).',
        setup: lines(`m = ${r.int(1, 9)};`, `move = [${dx}; ${-dy}];`, 'weight = [0; -m*10];', `normal = ${r.int(1, 4)}*[${dy}; ${dx}];`),
        solution: lines('gravityWork = dot(weight, move);', 'normalWork = dot(normal, move);'),
        outputs: [['gravityWork', 'Only the downward part of the movement counts against gravity.'], ['normalWork', 'A force at right angles to the movement does no work.']],
        hints: ['Both are dot products with the movement.', 'Gravity only sees the vertical drop.', 'gravityWork = dot(weight, move); normalWork = dot(normal, move);'],
      }
    }),
    problem('power', 'Power from force and speed', 'Transfer', r => ({
      prompt: 'A motor pushes with force while the load moves with velocity (metres per second). Power in watts is dot(force, velocity). Store power, and energy = power * seconds for the supplied time.',
      setup: lines(`force = ${vec(row(r, 2, 1, 30))};`, `velocity = ${vec(row(r, 2, -4, 6))};`, `seconds = ${r.int(2, 60)};`),
      solution: lines('power = dot(force, velocity);', 'energy = power * seconds;'),
      outputs: [['power', 'Power is force dotted with velocity.'], ['energy', 'Energy is power times time.']],
      hints: ['Power works like work, but with velocity instead of movement.', 'power = dot(force, velocity);', 'energy = power * seconds;'],
    })),
  ],
  'laml-dot-product': [
    problem('angle-between', 'The angle between two directions', 'Warm-up', r => ({
      prompt: 'Store similarity = dot(a, b) / (norm(a) * norm(b)) and angle = acos(similarity) * 180 / pi, in degrees.',
      setup: lines(`a = ${vec(nonzeroVector(r, 2))};`, `b = ${vec(nonzeroVector(r, 2))};`),
      solution: lines('similarity = dot(a, b) / (norm(a) * norm(b));', 'angle = acos(similarity) * 180 / pi;'),
      outputs: [['similarity', 'Divide the dot product by both lengths.'], ['angle', 'acos gives radians; multiply by 180/pi.']],
      hints: ['The cosine is the dot product divided by both lengths.', 'acos undoes cos.', 'similarity = dot(a, b) / (norm(a) * norm(b)); angle = acos(similarity) * 180 / pi;'],
    })),
    problem('scaled-copy', 'Louder but the same', 'Warm-up', r => ({
      prompt: 'song2 is song1 played louder: song2 = k * song1 with k > 0. Store similarity between song1 and song2, loudness = norm(song2), and ratio = norm(song2) / norm(song1).',
      setup: lines(`song1 = ${vec(row(r, 3, 1, 9))};`, `k = ${r.int(2, 6)};`, 'song2 = k * song1;'),
      solution: lines('similarity = dot(song1, song2) / (norm(song1) * norm(song2));', 'loudness = norm(song2);', 'ratio = norm(song2) / norm(song1);'),
      outputs: [['similarity', 'Scaling by a positive number does not change direction.'], ['loudness', 'The length of song2.'], ['ratio', 'The lengths differ by the factor k.']],
      hints: ['Cosine similarity ignores length.', 'The ratio of lengths is the scale factor.', 'similarity = dot(song1, song2) / (norm(song1) * norm(song2)); ratio = norm(song2) / norm(song1);'],
    })),
    problem('most-similar', 'Recommend the closer song', 'Apply', r => ({
      prompt: 'A listener likes query. Store simA and simB, the cosine similarities of query with songA and songB, and best = 1 if songA is more similar, otherwise 2.',
      setup: lines(`query = ${vec(row(r, 3, 1, 9))};`, `songA = ${vec(row(r, 3, 1, 9))};`, `songB = ${vec(row(r, 3, 1, 9))};`),
      solution: lines('simA = dot(query, songA) / (norm(query) * norm(songA));', 'simB = dot(query, songB) / (norm(query) * norm(songB));', 'best = 2;', 'if simA > simB', '  best = 1;', 'end'),
      outputs: [['simA', 'Cosine similarity of query and song A.'], ['simB', 'Cosine similarity of query and song B.'], ['best', 'Pick the larger similarity.']],
      hints: ['Compute both similarities the same way.', 'The larger cosine means the smaller angle.', 'Compare simA > simB in an if block to set best.'],
    })),
    problem('angle-from-numbers', 'Angle from a dot product and lengths', 'Transfer', r => {
      const la = r.int(2, 9), lb = r.int(2, 9), d = r.int(-la * lb + 1, la * lb - 1)
      return {
        prompt: 'You are told only that a · b = d, ‖a‖ = la and ‖b‖ = lb. Store cosine = d / (la * lb) and angle in degrees. No vectors are needed.',
        setup: lines(`d = ${d};`, `la = ${la};`, `lb = ${lb};`), solution: lines('cosine = d / (la * lb);', 'angle = acos(cosine) * 180 / pi;'),
        outputs: [['cosine', 'Divide the dot product by the product of the lengths.'], ['angle', 'Convert the cosine to an angle with acos, in degrees.']],
        hints: ['a · b = ‖a‖ ‖b‖ cos θ.', 'Rearrange for cos θ.', 'cosine = d / (la * lb); angle = acos(cosine) * 180 / pi;'],
      }
    }),
  ],
}
