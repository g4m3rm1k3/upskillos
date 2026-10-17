import { mat, vec } from './helpers.js'

const row = (rng, n, min = -5, max = 5) => Array.from({ length: n }, () => rng.int(min, max))
const positive = (rng, n) => row(rng, n, 1, 9)
const nonzeroVector = (rng, n = 2) => [rng.nonzero(-5, 5), ...row(rng, n - 1)]
const matrix = (rng, rows = 2, cols = 2) => Array.from({ length: rows }, () => row(rng, cols))
const multiply = (A, x) => A.map(r => r.reduce((sum, a, i) => sum + a * x[i], 0))
const triangular = rng => [[rng.int(1, 5), rng.nonzero(-3, 3)], [0, rng.int(1, 5)]]
const lines = (...source) => source.join('\n')

// Keep the learner program independent of its generated inputs. Incorrect but executable
// placeholders make even a legitimate zero-valued answer require an actual attempt.
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

export const foundationsPractice = {
  'laml-first-run': [
    problem('journey-fare', 'Price one journey', 'Warm-up', r => ({
      prompt: 'A journey costs base dollars plus rate dollars per kilometre. Store its total price in fare for the supplied distance. The star * multiplies.',
      setup: lines(`base = ${r.int(2, 12)};`, `rate = ${r.int(2, 6)};`, `distance = ${r.int(2, 15)};`),
      solution: 'fare = base + rate * distance;', outputs: [['fare', 'Pay the base charge once, then add rate times distance.']],
      hints: ['Separate the fixed charge from the part that changes with distance.', 'The variable charge is rate * distance.', 'Add base to that product and assign the result to fare.'],
    })),
    problem('sales-profit', 'Separate revenue from profit', 'Warm-up', r => ({
      prompt: 'A stall sells units items at price dollars each and pays total_cost dollars altogether. Store sales revenue in revenue and revenue minus total_cost in profit.',
      setup: lines(`units = ${r.int(5, 20)};`, `price = ${r.int(4, 10)};`, `total_cost = ${r.int(2, 15)};`),
      solution: lines('revenue = units * price;', 'profit = revenue - total_cost;'), outputs: [['revenue', 'Revenue counts every sold item at the stated price.'], ['profit', 'Subtract the total cost once, after calculating revenue.']],
      hints: ['Revenue is the money received before costs.', 'Multiply the number of items by the price per item.', 'Store that product in revenue, then subtract total_cost to obtain profit.'],
    })),
    problem('precedence-repair', 'Repair an incorrectly grouped formula', 'Apply', r => ({
      prompt: 'The proposed formula wrong = (base + rate)*distance charges the base once per kilometre. Compute correct for a base paid once, and overcharge = wrong - correct.',
      setup: lines(`base = ${r.int(2, 10)};`, `rate = ${r.int(1, 6)};`, `distance = ${r.int(2, 12)};`, 'wrong = (base + rate)*distance;'),
      solution: lines('correct = base + rate*distance;', 'overcharge = wrong - correct;'), outputs: [['correct', 'Only rate should be multiplied by distance.'], ['overcharge', 'Compare the proposed charge with your corrected total.']],
      hints: ['The parenthesized expression multiplies both charges by distance.', 'In the repaired expression, multiplication happens before addition.', 'Calculate base + rate*distance, then subtract that result from wrong.'],
    })),
    problem('recover-unit-rate', 'Infer the rate from two receipts', 'Apply', r => {
      const base = r.int(2, 9), rate = r.int(2, 7), d1 = r.int(1, 4), d2 = d1 + r.int(2, 6)
      return {
        prompt: 'Two receipts use the same base charge and rate. distance_a and distance_b are different. Recover rate_estimate from the price change divided by the distance change, and base_estimate from either receipt. The slash / divides.',
        setup: lines(`distance_a = ${d1};`, `distance_b = ${d2};`, `price_a = ${base + rate * d1};`, `price_b = ${base + rate * d2};`),
        solution: lines('rate_estimate = (price_b-price_a)/(distance_b-distance_a);', 'base_estimate = price_a-rate_estimate*distance_a;'), outputs: [['rate_estimate', 'Divide the change in price by the change in distance.'], ['base_estimate', 'Remove the distance-dependent part from a receipt.']],
        hints: ['The fixed charge cancels when you subtract the receipts.', 'Use matching differences: price_b-price_a and distance_b-distance_a.', 'After dividing those differences, subtract rate_estimate*distance_a from price_a.'],
      }
    }),
    problem('tariff-crossover', 'Find where two tariffs tie', 'Transfer', r => {
      const baseA = r.int(1, 6), baseB = baseA + r.int(2, 10), rateB = r.int(1, 3), rateA = rateB + r.int(1, 4)
      return {
        prompt: 'Service A has a smaller base but a larger rate than B. Store tie_distance, where base_a + rate_a*d equals base_b + rate_b*d. Also calculate tie_price at that distance. Divide the extra base charge by the difference in rates.',
        setup: lines(`base_a = ${baseA};`, `base_b = ${baseB};`, `rate_a = ${rateA};`, `rate_b = ${rateB};`),
        solution: lines('tie_distance = (base_b-base_a)/(rate_a-rate_b);', 'tie_price = base_a + rate_a*tie_distance;'), outputs: [['tie_distance', 'The base-charge difference must be offset by the rate difference.'], ['tie_price', 'Evaluate either original tariff at your tie distance.']],
        hints: ['At the crossing, the two total prices are equal.', 'Moving base terms to one side leaves (rate_a-rate_b)*d = base_b-base_a.', 'Divide to recover d, then substitute it into either price formula.'],
      }
    }),
    problem('sensor-calibration', 'Calibrate a sensor from two anchors', 'Transfer', r => {
      const gain = r.int(2, 5), offset = r.int(-5, 5), rawA = r.int(1, 4), rawB = rawA + r.int(2, 5)
      return {
        prompt: 'A sensor follows actual = gain*raw + offset. Two calibration pairs are supplied. Recover gain and offset, then predict the actual value for raw_new in prediction. This is the same fixed-plus-rate pattern in a new setting.',
        setup: lines(`raw_a = ${rawA};`, `raw_b = ${rawB};`, `actual_a = ${gain * rawA + offset};`, `actual_b = ${gain * rawB + offset};`, `raw_new = ${r.int(6, 12)};`),
        solution: lines('gain = (actual_b-actual_a)/(raw_b-raw_a);', 'offset = actual_a-gain*raw_a;', 'prediction = gain*raw_new+offset;'), outputs: [['gain', 'Recover the output change per unit input change.'], ['offset', 'Use one known pair to recover the fixed offset.'], ['prediction', 'Apply the recovered calibration to raw_new.']],
        hints: ['Subtracting the two equations removes the offset.', 'The ratio of actual change to raw change is the gain.', 'Recover offset from the first pair, then apply gain*raw_new+offset.'],
      }
    }),
  ],

  'laml-add-scale': [
    problem('summarise-orders', 'Summarise daily orders', 'Warm-up', r => ({
      prompt: 'orders contains one count per day. Store total = sum of all counts and average = their arithmetic mean.',
      setup: `orders = ${vec(positive(r, r.int(3, 6)))};`, solution: lines('total = sum(orders);', 'average = mean(orders);'), outputs: [['total', 'Include every daily observation.'], ['average', 'Divide the total by the number of observations, or use mean.']],
      hints: ['The total and average describe the same values in different ways.', 'OpenMAT provides sum(vector) and mean(vector).', 'Assign the two summaries to total and average rather than replacing the given data.'],
    })),
    problem('scale-readings', 'Convert a complete set of readings', 'Warm-up', r => ({
      prompt: 'Apply the calibration converted = scale*readings + offset to every reading, then store converted_mean. Scalar multiplication and addition act on every entry here.',
      setup: lines(`readings = ${vec(positive(r, 4))};`, `scale = ${r.int(2, 5)};`, `offset = ${r.int(-6, 6)};`), solution: lines('converted = scale*readings+offset;', 'converted_mean = mean(converted);'), outputs: [['converted', 'Apply the same scale and offset to every original reading.'], ['converted_mean', 'Average the converted values, including the offset.']],
      hints: ['A vector lets one formula transform many measurements.', 'Multiply readings by scale, then add offset.', 'Store the converted vector first and calculate its mean second.'],
    })),
    problem('paired-changes', 'Preserve pairs when comparing readings', 'Apply', r => ({
      prompt: 'before and after describe the same sensors in the same order. Store changes = after - before, and average_change. Positive changes mean a reading increased.',
      setup: lines(`before = ${vec(positive(r, 4))};`, `after = ${vec(positive(r, 4))};`), solution: lines('changes = after-before;', 'average_change = mean(changes);'), outputs: [['changes', 'Subtract corresponding readings in the requested direction.'], ['average_change', 'Average the paired changes; do not discard their signs.']],
      hints: ['Keep each sensor paired with itself.', 'An increase is after minus before.', 'Compute the vector difference, then mean(changes).'],
    })),
    problem('center-readings', 'Express observations as deviations', 'Apply', r => ({
      prompt: 'Store average = mean(readings), centered = readings-average, and centered_total = sum(centered). Centering expresses each value relative to the group average.',
      setup: `readings = ${vec(positive(r, r.int(4, 6)))};`, solution: lines('average = mean(readings);', 'centered = readings-average;', 'centered_total = sum(centered);'), outputs: [['average', 'Use all readings when finding the reference level.'], ['centered', 'Subtract the same average from each entry.'], ['centered_total', 'Correctly centered deviations sum to zero within tolerance.']],
      hints: ['Centering shifts the origin; it does not change the spacing between observations.', 'First calculate one scalar mean for the complete vector.', 'Subtract that scalar from readings, then sum the resulting deviations.'],
    })),
    problem('weighted-sensor-blend', 'Blend two matched sensor streams', 'Transfer', r => ({
      prompt: 'Two vectors measure the same times. Trust stream_a with weight trust and stream_b with weight 1-trust. Store blended and blended_mean. The supplied trust lies strictly between zero and one.',
      setup: lines(`stream_a = ${vec(positive(r, 4))};`, `stream_b = ${vec(positive(r, 4))};`, `trust = ${r.int(2, 8) / 10};`), solution: lines('blended = trust*stream_a+(1-trust)*stream_b;', 'blended_mean = mean(blended);'), outputs: [['blended', 'Combine corresponding entries using weights that add to one.'], ['blended_mean', 'Average the complete blended stream.']],
      hints: ['A larger trust gives stream_a more influence.', 'The second weight must be 1-trust, not trust again.', 'Scale each vector by its own weight, add the vectors, then calculate the mean.'],
    })),
    problem('missing-observation', 'Recover a reading from a target mean', 'Transfer', r => ({
      prompt: 'known contains all but one reading. Adding a final value must make the mean target_mean. Store that missing value in missing and the completed total in completed_total. length(known) counts the known entries.',
      setup: lines(`known = ${vec(positive(r, r.int(3, 5)))};`, `target_mean = ${r.int(4, 10)};`), solution: lines('missing = target_mean*(length(known)+1)-sum(known);', 'completed_total = sum(known)+missing;'), outputs: [['missing', 'The final number of readings is one larger than length(known).'], ['completed_total', 'The completed total must equal the target mean times the completed count.']],
      hints: ['Mean equals total divided by count.', 'The required final total is target_mean*(length(known)+1).', 'Subtract the known total to find missing, then rebuild the completed total.'],
    })),
  ],

  'laml-indexing': [
    problem('read-selected-cell', 'Read a selected observation and feature', 'Warm-up', r => ({
      prompt: 'Store selected = data(observation, feature). Row means observation and column means feature; indexing begins at 1.',
      setup: lines(`data = ${mat(matrix(r, 4, 3))};`, `observation = ${r.int(1, 4)};`, `feature = ${r.int(1, 3)};`), solution: 'selected = data(observation, feature);', outputs: [['selected', 'Use observation as the first index and feature as the second.']],
      hints: ['Square brackets construct data; parentheses select from it.', 'Keep row first and column second.', 'Use the supplied observation and feature variables as indices.'],
    })),
    problem('extract-feature', 'Extract a whole feature column', 'Warm-up', r => ({
      prompt: 'Store values as every row of the selected feature column. Also store observations and features, the two dimensions of the genuine rectangular data matrix. OpenMAT stores the extracted single column flat.',
      setup: lines(`data = ${mat(matrix(r, r.int(3, 5), 3))};`, `feature = ${r.int(1, 3)};`), solution: lines('values = data(:, feature);', 'observations = size(data, 1);', 'features = size(data, 2);'), outputs: [['values', 'A colon in the first index selects every observation.'], ['observations', 'Count the rows of the original matrix.'], ['features', 'Count the columns of the original matrix.']],
      hints: ['The feature stays fixed while the row index varies.', 'A colon means every position along an axis.', 'Select data(:, feature), and use size(data,1) and size(data,2) for the counts.'],
    })),
    problem('record-versus-feature', 'Separate one record from one feature', 'Apply', r => ({
      prompt: 'Store record as the whole row at observation, and feature_mean as the average of the whole column at feature. A record is a row; a feature across observations is a column.',
      setup: lines(`data = ${mat(matrix(r, 4, 3))};`, `observation = ${r.int(1, 4)};`, `feature = ${r.int(1, 3)};`), solution: lines('record = data(observation, :);', 'feature_mean = mean(data(:, feature));'), outputs: [['record', 'Keep the requested observation and select all feature columns.'], ['feature_mean', 'Average the selected feature across all observations, not across one record.']],
      hints: ['The colon goes in a different position for the two outputs.', 'A row selection is data(observation,:), whereas a column selection is data(:,feature).', 'Store the row unchanged, and apply mean only to the selected column.'],
    })),
    problem('split-dataset', 'Split observations without separating features', 'Apply', r => {
      const count = r.int(5, 7)
      return { prompt: 'Put rows 1 through split into training and all remaining rows into testing. Keep every column and preserve order. The expression a:b selects an inclusive range; size(data,1) gives the last row.',
        setup: lines(`data = ${mat(matrix(r, count, 3))};`, `split = ${r.int(2, count - 2)};`), solution: lines('last_row = size(data,1);', 'first_test = split+1;', 'training = data(1:split, :);', 'testing = data(first_test:last_row, :);'), outputs: [['training', 'Keep the first split complete rows.'], ['testing', 'Start at split+1, so no row is duplicated between the two sets.']],
        hints: ['Partition rows rather than individual columns.', 'The first range includes split; the second must therefore begin at split+1.', 'Use : in the column position for both slices.'],
      }
    }),
    problem('paired-feature-target', 'Keep a selected feature paired with its target', 'Transfer', r => ({
      prompt: 'Column feature_column contains an input and column target_column its paired target. Store inputs and targets as those complete columns, then paired_gap = targets(held_row)-inputs(held_row). Keep their original pairing.',
      setup: lines(`data = ${mat(matrix(r, 5, 3))};`, `feature_column = ${r.pick([1, 2])};`, 'target_column = 3;', `held_row = ${r.int(1, 5)};`), solution: lines('inputs = data(:, feature_column);', 'targets = data(:, target_column);', 'paired_gap = targets(held_row)-inputs(held_row);'), outputs: [['inputs', 'Extract the named input column without reordering it.'], ['targets', 'Extract the target column in the same row order.'], ['paired_gap', 'Compare values from the same held_row.']],
      hints: ['Input and target stay associated through their common row number.', 'Extract each column with data(:, column_variable).', 'Use held_row on both extracted vectors before subtracting input from target.'],
    })),
    problem('repair-one-cell', 'Correct one cell while retaining the table', 'Transfer', r => ({
      prompt: 'Copy data into corrected. Replace only corrected(observation, feature) with replacement, and store change as the corrected entry minus the original entry. An indexed assignment changes just that cell.',
      setup: lines(`data = ${mat(matrix(r, 4, 3))};`, `observation = ${r.int(1, 4)};`, `feature = ${r.int(1, 3)};`, `replacement = ${r.int(20, 30)};`), solution: lines('corrected = data;', 'corrected(observation, feature) = replacement;', 'change = corrected(observation, feature)-data(observation, feature);'), outputs: [['corrected', 'Start from a copy and change only the selected row/column entry.'], ['change', 'Measure the update relative to the original data, not relative to zero.']],
      hints: ['Assign corrected = data before editing an entry.', 'Use the same row and column variables on the left side of the assignment.', 'Calculate change by subtracting the original selected entry from its corrected counterpart.'],
    })),
  ],

  'laml-two-multiplications': [
    problem('batch-predictions', 'Predict one value for each record', 'Warm-up', r => ({
      prompt: 'Each row of X contains two features, and w contains their two weights. Store predictions = X*w, one weighted sum per row.',
      setup: lines(`X = ${mat(matrix(r, r.int(3, 5), 2))};`, `w = ${vec(nonzeroVector(r))};`), solution: 'predictions = X*w;', outputs: [['predictions', 'Use matrix multiplication to combine both features in each row.']],
      hints: ['The output has one number for every observation.', 'The feature count must match the number of weights.', 'Use ordinary * between X and w, rather than .*.'],
    })),
    problem('square-each-error', 'Measure squared prediction errors', 'Warm-up', r => ({
      prompt: 'Store errors = predictions-targets, squared = errors.^2, and mse = mean(squared). The dot in .^2 squares each separate error.',
      setup: lines(`predictions = ${vec(positive(r, 4))};`, `targets = ${vec(positive(r, 4))};`), solution: lines('errors = predictions-targets;', 'squared = errors.^2;', 'mse = mean(squared);'), outputs: [['errors', 'Subtract the paired targets before applying a power.'], ['squared', 'Square each error separately with .^2.'], ['mse', 'Average all squared errors.']],
      hints: ['Errors retain the sign of prediction minus target.', 'The square should act independently on every entry.', 'Calculate the difference, apply .^2, then apply mean.'],
    })),
    problem('matched-product-revenue', 'Use matched prices for matched quantities', 'Apply', r => ({
      prompt: 'quantities and prices describe matching products. Store item_revenue using entrywise multiplication, and total_revenue as the sum over products.',
      setup: lines(`quantities = ${vec(positive(r, 4))};`, `prices = ${vec(positive(r, 4))};`), solution: lines('item_revenue = quantities.*prices;', 'total_revenue = sum(item_revenue);'), outputs: [['item_revenue', 'Keep each product quantity paired with its own price.'], ['total_revenue', 'Sum the entrywise revenues after calculating them.']],
      hints: ['You need one intermediate revenue per product.', 'A dot before * makes it multiply matching entries.', 'Use quantities.*prices, then sum that vector.'],
    })),
    problem('two-stage-feature-rule', 'Combine a two-stage feature rule', 'Apply', r => ({
      prompt: 'B converts two intermediate weights into three raw-feature weights, and X has three features per observation. Store raw_weights = B*w and predictions = X*raw_weights. Check the inner dimensions before multiplying.',
      setup: lines(`X = ${mat(matrix(r, 4, 3))};`, `B = ${mat(matrix(r, 3, 2))};`, `w = ${vec(nonzeroVector(r))};`), solution: lines('raw_weights = B*w;', 'predictions = X*raw_weights;'), outputs: [['raw_weights', 'B has three rows, so B*w produces three weights.'], ['predictions', 'Use those three weights with the three feature columns of X.']],
      hints: ['Start with the product whose inputs have matching inner sizes.', 'B is 3 by 2 and w has 2 entries.', 'Compute B*w first, then multiply X by that result.'],
    })),
    problem('matrix-versus-entry-square', 'Diagnose two different squares', 'Transfer', r => ({
      prompt: 'For square X, store entry_square = X.^2 and map_square = X*X. Store difference = map_square-entry_square. These are distinct operations even though both outputs have the same shape.',
      setup: `X = ${mat([[r.int(1, 5), r.int(1, 4)], [r.int(1, 4), r.int(1, 5)]])};`, solution: lines('entry_square = X.^2;', 'map_square = X*X;', 'difference = map_square-entry_square;'), outputs: [['entry_square', 'Square each individual matrix entry.'], ['map_square', 'For the matrix square, each output entry sums a row-column product.'], ['difference', 'Subtract the entrywise result from the matrix-product result in that order.']],
      hints: ['The shapes match, so shape alone cannot tell which calculation is correct.', 'Dotted powers act entry by entry; an ordinary product combines rows with columns.', 'Compute both full matrices before subtracting them.'],
    })),
    problem('masked-feature-sums', 'Apply an observation-specific feature mask', 'Transfer', r => ({
      prompt: 'mask gives a separate multiplier for each entry of X. Store masked = X.*mask, then scores as the sum across each row of masked. sum(M,2) adds across columns, producing one score per row.',
      setup: lines(`X = ${mat(matrix(r, 3, 3))};`, `mask = ${mat(Array.from({ length: 3 }, () => row(r, 3, 0, 1)))};`), solution: lines('masked = X.*mask;', 'scores = sum(masked,2);'), outputs: [['masked', 'Multiply matching entries; a zero mask entry removes that feature only for that observation.'], ['scores', 'Sum across each row using dimension 2, not down each column.']],
      hints: ['This mask has the same shape as X because it acts entry by entry.', 'Use .* for masking rather than the ordinary matrix product.', 'After masking, sum(masked,2) keeps one total for each observation.'],
    })),
  ],

  'laml-weighted-combinations': [
    problem('two-direction-combination', 'Combine two reusable directions', 'Warm-up', r => ({
      prompt: 'Store combined = alpha*a + beta*b. The coefficients may be negative: a negative coefficient reverses that direction.',
      setup: lines(`a = ${vec(nonzeroVector(r))};`, `b = ${vec(nonzeroVector(r))};`, `alpha = ${r.nonzero(-3, 3)};`, `beta = ${r.nonzero(-3, 3)};`), solution: 'combined = alpha*a+beta*b;', outputs: [['combined', 'Scale both complete vectors before adding matching entries.']],
      hints: ['Each coefficient controls one vector, not one coordinate.', 'Multiply alpha by a and beta by b.', 'Add those two scaled vectors without dropping negative signs.'],
    })),
    problem('coefficient-change', 'Predict the effect of changing one weight', 'Warm-up', r => ({
      prompt: 'A combination changes from alpha*a + beta*b to (alpha+extra)*a + beta*b. Store before, after, and displacement = after-before.',
      setup: lines(`a = ${vec(nonzeroVector(r))};`, `b = ${vec(nonzeroVector(r))};`, `alpha = ${r.int(1, 4)};`, `beta = ${r.int(1, 4)};`, `extra = ${r.nonzero(-3, 3)};`), solution: lines('before = alpha*a+beta*b;', 'after = (alpha+extra)*a+beta*b;', 'displacement = after-before;'), outputs: [['before', 'Use the original two coefficients.'], ['after', 'Only the coefficient of a changes.'], ['displacement', 'The change must equal extra*a regardless of b.']],
      hints: ['Keep beta and b unchanged.', 'Add extra to alpha before multiplying by a.', 'Subtract before from after; the unchanged b contribution cancels.'],
    })),
    problem('column-patterns', 'Use a matrix as a pattern library', 'Apply', r => ({
      prompt: 'The three columns of patterns are reusable two-coordinate patterns. Store combined = patterns*weights, then first_piece = weights(1)*patterns(:,1).',
      setup: lines(`patterns = ${mat(matrix(r, 2, 3))};`, `weights = ${vec(row(r, 3, 1, 4))};`), solution: lines('combined = patterns*weights;', 'first_piece = weights(1)*patterns(:,1);'), outputs: [['combined', 'Combine all three columns with their matching weights.'], ['first_piece', 'Select the first full column before scaling it by its first weight.']],
      hints: ['One weight belongs to each column.', 'patterns*weights adds the weighted columns.', 'Use patterns(:,1) for the first pattern and weights(1) for its coefficient.'],
    })),
    problem('recover-axis-coefficients', 'Recover weights for independent axis moves', 'Apply', r => ({
      prompt: 'a moves only horizontally and b only vertically. Store coefficients so coefficients(1)*a + coefficients(2)*b equals target, then store reconstructed from that combination. Divide each target coordinate by the nonzero step along its own axis.',
      setup: lines(`a = ${vec([r.int(2, 5), 0])};`, `b = ${vec([0, r.int(2, 5)])};`, `target = ${vec(nonzeroVector(r))};`), solution: lines('coefficients = [target(1)/a(1); target(2)/b(2)];', 'reconstructed = coefficients(1)*a+coefficients(2)*b;'), outputs: [['coefficients', 'Recover the amount of each axis move separately.'], ['reconstructed', 'Check the recovered weights by rebuilding the original target.']],
      hints: ['The horizontal move cannot affect the vertical coordinate, and conversely.', 'Divide target(1) by a(1) and target(2) by b(2).', 'Put those two coefficients in a vector, then use them to rebuild target.'],
    })),
    problem('cancel-one-feature', 'Choose a weight that cancels a coordinate', 'Transfer', r => ({
      prompt: 'alpha is fixed. Choose beta so alpha*a + beta*b has second coordinate zero. Store beta and combined. The second entry of b is nonzero, so beta can be recovered by one scalar division.',
      setup: lines(`a = ${vec([r.int(1, 5), r.int(1, 5)])};`, `b = ${vec([r.nonzero(-4, 4), r.int(1, 5)])};`, `alpha = ${r.int(1, 4)};`), solution: lines('beta = -alpha*a(2)/b(2);', 'combined = alpha*a+beta*b;'), outputs: [['beta', 'Solve alpha*a(2)+beta*b(2)=0 for beta.'], ['combined', 'Apply the recovered beta to the whole vector b, not only its second coordinate.']],
      hints: ['Write an equation for just the second coordinate.', 'Move alpha*a(2) to the other side, changing its sign.', 'Divide by b(2), then form the complete weighted combination.'],
    })),
    problem('pooled-profile', 'Pool two average feature profiles', 'Transfer', r => ({
      prompt: 'profile_a and profile_b are average two-feature profiles from groups of count_a and count_b people. Store pooled, the average profile of everyone together, and total_count. Weight each profile by its group size before dividing.',
      setup: lines(`profile_a = ${vec(positive(r, 2))};`, `profile_b = ${vec(positive(r, 2))};`, `count_a = ${r.int(2, 8)};`, `count_b = ${r.int(9, 15)};`), solution: lines('total_count = count_a+count_b;', 'pooled = (count_a*profile_a+count_b*profile_b)/total_count;'), outputs: [['pooled', 'The larger group contributes proportionally more to the pooled mean.'], ['total_count', 'Count both groups before normalizing the weighted combination.']],
      hints: ['The average of two group means is wrong when group sizes differ.', 'Multiplying a group mean by its count reconstructs its feature totals.', 'Add the two feature-total vectors and divide by count_a+count_b.'],
    })),
  ],

  'laml-shopping-bill': [
    problem('weighted-score', 'Score a feature vector', 'Warm-up', r => ({
      prompt: 'Store score = dot(features, weights), one scalar weighted score. Positions in the two vectors refer to the same features.',
      setup: lines(`features = ${vec(nonzeroVector(r, 3))};`, `weights = ${vec(nonzeroVector(r, 3))};`), solution: 'score = dot(features,weights);', outputs: [['score', 'Add the products of matching feature and weight entries.']],
      hints: ['The dot product produces one number rather than a vector.', 'Every feature contributes its value times its own weight.', 'Use dot(features,weights), or sum of their entrywise products.'],
    })),
    problem('score-contributions', 'Explain the separate contributions', 'Warm-up', r => ({
      prompt: 'Store contributions = features.*weights and score = sum(contributions). Retain signs so negatively weighted features can reduce the score.',
      setup: lines(`features = ${vec(positive(r, 3))};`, `weights = ${vec([r.int(1, 5), -r.int(1, 5), r.int(1, 5)])};`), solution: lines('contributions = features.*weights;', 'score = sum(contributions);'), outputs: [['contributions', 'Use entrywise multiplication to expose each signed contribution.'], ['score', 'Add the contributions rather than adding their absolute values.']],
      hints: ['Keep a contribution for every coordinate.', 'The negative weight must create a negative contribution for its positive feature.', 'Multiply entrywise first, then sum the resulting vector.'],
    })),
    problem('counterfactual-score-change', 'Predict the effect of a feature change', 'Apply', r => ({
      prompt: 'A linear model gives dot(x,w)+bias. Store prediction, updated_prediction for x+change, and score_change as their difference. The bias is paid once in each prediction.',
      setup: lines(`x = ${vec(nonzeroVector(r, 3))};`, `change = ${vec(nonzeroVector(r, 3))};`, `w = ${vec(nonzeroVector(r, 3))};`, `bias = ${r.int(-5, 5)};`), solution: lines('prediction = dot(x,w)+bias;', 'updated_prediction = dot(x+change,w)+bias;', 'score_change = updated_prediction-prediction;'), outputs: [['prediction', 'Apply the original feature vector and add bias once.'], ['updated_prediction', 'Change the features before applying the same weights.'], ['score_change', 'The unchanged bias cancels; the change equals dot(change,w).']],
      hints: ['The model weights stay fixed while the input changes.', 'Evaluate the same model at x and x+change.', 'Subtract the original prediction from the updated one.'],
    })),
    problem('self-opposite-products', 'Compare self-alignment and opposition', 'Apply', r => ({
      prompt: 'For nonzero x, store self_score = dot(x,x), opposite_score = dot(x,-x), and perpendicular_score = dot(x,perpendicular). The supplied perpendicular vector is a right-angle turn of x.',
      setup: (() => { const x = nonzeroVector(r); return lines(`x = ${vec(x)};`, `perpendicular = ${vec([-x[1], x[0]])};`) })(), solution: lines('self_score = dot(x,x);', 'opposite_score = dot(x,-x);', 'perpendicular_score = dot(x,perpendicular);'), outputs: [['self_score', 'Self-alignment is the sum of squared entries and is positive for nonzero x.'], ['opposite_score', 'Changing one vector to its negative changes the sign of the dot product.'], ['perpendicular_score', 'The supplied right-angle direction should have zero dot product within tolerance.']],
      hints: ['The same vector appears on both sides of the first dot product.', 'Negating only one argument negates the result.', 'Calculate all three dot products with the supplied vectors, keeping a scalar for each.'],
    })),
    problem('tie-two-score-rules', 'Find a feature edit that ties two scoring rules', 'Transfer', r => {
      const a = nonzeroVector(r, 3), b = [a[0] + r.int(1, 4), ...row(r, 2)]
      return { prompt: 'Two rules score x with weights_a and weights_b. Only the first feature may change. Store original_gap = dot(x,weights_a-weights_b), adjustment that makes the gap zero, and new_gap after adding adjustment*direction to x. direction changes only the first feature.',
        setup: lines(`x = ${vec(nonzeroVector(r, 3))};`, `weights_a = ${vec(a)};`, `weights_b = ${vec(b)};`, 'direction = [1; 0; 0];'), solution: lines('original_gap = dot(x,weights_a-weights_b);', 'adjustment = -original_gap/(weights_a(1)-weights_b(1));', 'new_gap = dot(x+adjustment*direction,weights_a-weights_b);'), outputs: [['original_gap', 'Use the difference of the two full scoring rules.'], ['adjustment', 'A unit first-feature edit changes the score gap by weights_a(1)-weights_b(1).'], ['new_gap', 'Evaluate the two-rule gap after the permitted feature edit.']],
        hints: ['The score gap is itself a dot product with the difference of the weights.', 'A first-feature change t adds t*(weights_a(1)-weights_b(1)) to the gap.', 'Set that new gap to zero and solve for t before verifying it.'],
      }
    }),
  ],

  'laml-length-distance-cosine': [
    problem('length-and-displacement', 'Measure length and distance separately', 'Warm-up', r => ({
      prompt: 'Store length_a = norm(a) and distance = norm(b-a). Length measures from the origin; distance measures the displacement between endpoints.',
      setup: lines(`a = ${vec(nonzeroVector(r))};`, `b = ${vec(nonzeroVector(r))};`), solution: lines('length_a = norm(a);', 'distance = norm(b-a);'), outputs: [['length_a', 'Measure a relative to the origin.'], ['distance', 'Subtract the points first; subtracting their lengths is a different calculation.']],
      hints: ['A distance is the length of a difference vector.', 'Use norm for both quantities, but give it different inputs.', 'The inputs are a for length_a and b-a for distance.'],
    })),
    problem('normalize-nonzero', 'Keep direction and remove magnitude', 'Warm-up', r => ({
      prompt: 'The supplied v is nonzero. Store unit = v/norm(v) and unit_length = norm(unit).',
      setup: `v = ${vec(nonzeroVector(r, 3))};`, solution: lines('unit = v/norm(v);', 'unit_length = norm(unit);'), outputs: [['unit', 'Divide the complete vector by its original length.'], ['unit_length', 'A correctly normalized nonzero vector has length one.']],
      hints: ['The new vector should point along the same direction.', 'Scaling by the reciprocal of the original norm makes its length one.', 'Normalize v first, then calculate the length of that normalized result.'],
    })),
    problem('nearest-example-distances', 'Compare two candidate neighbors', 'Apply', r => ({
      prompt: 'Store distance_a from query to candidate_a, distance_b from query to candidate_b, and distance_gap = distance_a-distance_b. A positive gap means candidate_b is closer.',
      setup: lines(`query = ${vec(nonzeroVector(r, 3))};`, `candidate_a = ${vec(nonzeroVector(r, 3))};`, `candidate_b = ${vec(nonzeroVector(r, 3))};`), solution: lines('distance_a = norm(candidate_a-query);', 'distance_b = norm(candidate_b-query);', 'distance_gap = distance_a-distance_b;'), outputs: [['distance_a', 'Measure candidate_a relative to the same query.'], ['distance_b', 'Measure candidate_b relative to that query as well.'], ['distance_gap', 'Subtract the distances in the specified order before interpreting the sign.']],
      hints: ['Both candidate distances must share the same query point.', 'Use norm(candidate-query) for each candidate.', 'A positive first-minus-second difference identifies the second distance as smaller.'],
    })),
    problem('set-length-keep-direction', 'Construct a vector with a required length', 'Transfer', r => ({
      prompt: 'Create resized with the direction of nonzero v and length desired_length. Then store distance_to_reference = norm(resized-reference). This models comparing observations after a deliberate magnitude adjustment.',
      setup: lines(`v = ${vec(nonzeroVector(r, 3))};`, `desired_length = ${r.int(2, 8)};`, `reference = ${vec(nonzeroVector(r, 3))};`), solution: lines('resized = desired_length*v/norm(v);', 'distance_to_reference = norm(resized-reference);'), outputs: [['resized', 'Normalize v before scaling it to the requested positive length.'], ['distance_to_reference', 'Measure the distance after resizing, not before.']],
      hints: ['First remove the original magnitude.', 'A unit vector times desired_length has the required new length.', 'Use desired_length*v/norm(v), then compare the resulting vector with reference.'],
    })),
  ],

  'laml-dot-product': [
    problem('direction-only-similarity', 'Compare directions without their magnitudes', 'Apply', r => ({
      prompt: 'Both vectors are nonzero. Store raw_dot = dot(a,b) and cosine = dot(a,b)/(norm(a)*norm(b)). The normalized score compares direction rather than length.',
      setup: lines(`a = ${vec(nonzeroVector(r, 3))};`, `b = ${vec(nonzeroVector(r, 3))};`), solution: lines('raw_dot = dot(a,b);', 'cosine = raw_dot/(norm(a)*norm(b));'), outputs: [['raw_dot', 'Keep the unnormalized signed dot product.'], ['cosine', 'Divide by both lengths; do not square or discard the dot-product sign.']],
      hints: ['Start with the dot product shared by the two requested quantities.', 'Magnitude affects that raw score through both vector lengths.', 'Divide the raw dot product by the product of the two norms.'],
    })),
    problem('unit-distance-identity', 'Connect cosine similarity with unit-vector distance', 'Transfer', r => ({
      prompt: 'Normalize a and b into unit_a and unit_b. Store cosine = dot(unit_a,unit_b), squared_distance = norm(unit_a-unit_b)^2, and identity_gap = squared_distance-(2-2*cosine). This identity holds for unit vectors.',
      setup: lines(`a = ${vec(nonzeroVector(r, 3))};`, `b = ${vec(nonzeroVector(r, 3))};`), solution: lines('unit_a = a/norm(a);', 'unit_b = b/norm(b);', 'cosine = dot(unit_a,unit_b);', 'squared_distance = norm(unit_a-unit_b)^2;', 'identity_gap = squared_distance-(2-2*cosine);'), outputs: [['unit_a', 'Normalize the first vector using its own length.'], ['unit_b', 'Normalize the second vector using its own length.'], ['cosine', 'The dot product of two unit vectors equals their cosine similarity.'], ['squared_distance', 'Square the norm of the difference of the normalized vectors.'], ['identity_gap', 'Both sides of the unit-distance identity should agree within tolerance.']],
      hints: ['The identity assumes both vectors have length one.', 'Normalize each vector before computing either side.', 'Compare norm(unit_a-unit_b)^2 with 2-2*dot(unit_a,unit_b).'],
    })),
  ],
  'laml-projection': [
    problem('project-and-subtract', 'Project and retain the residual', 'Warm-up', r => ({
      prompt: 'Project x onto the line spanned by nonzero u. Store projection = u*dot(u,x)/dot(u,u), then residual = x-projection.',
      setup: lines(`x = ${vec(nonzeroVector(r))};`, `u = ${vec(nonzeroVector(r))};`), solution: lines('projection = u*(dot(u,x)/dot(u,u));', 'residual = x-projection;'), outputs: [['projection', 'The denominator accounts for the supplied direction’s length.'], ['residual', 'Subtract the projected point from the original measurement.']],
      hints: ['The closest point must be a scalar multiple of u.', 'The scalar is dot(u,x)/dot(u,u).', 'Multiply that scalar by u, then subtract the projection from x.'],
    })),
    problem('coefficient-and-error', 'Report the amount of a direction and the error', 'Warm-up', r => ({
      prompt: 'Store coefficient for the closest multiple coefficient*u to x, and error_length = norm(x-coefficient*u). The supplied u is not assumed to have unit length.',
      setup: lines(`x = ${vec(nonzeroVector(r, 3))};`, `u = ${vec(nonzeroVector(r, 3))};`), solution: lines('coefficient = dot(u,x)/dot(u,u);', 'error_length = norm(x-coefficient*u);'), outputs: [['coefficient', 'Divide by dot(u,u), even when u is not normalized.'], ['error_length', 'Measure only the unexplained residual after projecting.']],
      hints: ['A coefficient is a scalar, unlike the projected vector.', 'Account for the full squared length of the direction.', 'Compute the coefficient with the projection formula, then norm of the resulting residual.'],
    })),
    problem('rescaled-direction', 'Verify that a line is independent of its chosen scale', 'Apply', r => ({
      prompt: 'Project x using u into first_projection. Project it again using scaled_u = scale*u into second_projection. Store discrepancy = norm(first_projection-second_projection). The nonzero scale may be negative.',
      setup: lines(`x = ${vec(nonzeroVector(r))};`, `u = ${vec(nonzeroVector(r))};`, `scale = ${r.pick([-4, -2, 2, 3])};`), solution: lines('first_projection = u*(dot(u,x)/dot(u,u));', 'scaled_u = scale*u;', 'second_projection = scaled_u*(dot(scaled_u,x)/dot(scaled_u,scaled_u));', 'discrepancy = norm(first_projection-second_projection);'), outputs: [['first_projection', 'Project with the original nonzero direction.'], ['second_projection', 'Use the rescaled direction in both numerator and denominator.'], ['discrepancy', 'The same line must produce the same projected vector.']],
      hints: ['Scaling a direction does not change the line it spans.', 'Use the full projection formula independently for each direction.', 'Compare the two projected vectors with a norm rather than comparing their scalar coefficients.'],
    })),
    problem('projection-idempotence', 'Project an already projected point', 'Apply', r => ({
      prompt: 'Store first_projection of x onto u, repeated_projection by projecting first_projection onto u, and residual_alignment = dot(u,x-first_projection). A point already on the line should not move again.',
      setup: lines(`x = ${vec(nonzeroVector(r, 3))};`, `u = ${vec(nonzeroVector(r, 3))};`), solution: lines('first_projection = u*(dot(u,x)/dot(u,u));', 'repeated_projection = u*(dot(u,first_projection)/dot(u,u));', 'residual_alignment = dot(u,x-first_projection);'), outputs: [['first_projection', 'Use x as the input to the first projection.'], ['repeated_projection', 'Use the first projection as the second input.'], ['residual_alignment', 'The remaining residual must have zero component along u.']],
      hints: ['Distinguish the input of the first and second operation.', 'Replace x by first_projection in the second projection formula.', 'Check the original residual’s dot product with u to verify orthogonality.'],
    })),
    problem('projection-energy-audit', 'Audit the explained and unexplained squared lengths', 'Transfer', r => ({
      prompt: 'Store parallel, the projection of x onto u, and perpendicular = x-parallel. Store energy_gap = dot(x,x)-dot(parallel,parallel)-dot(perpendicular,perpendicular). Perpendicular parts obey the Pythagorean squared-length identity.',
      setup: lines(`x = ${vec(nonzeroVector(r, 3))};`, `u = ${vec(nonzeroVector(r, 3))};`), solution: lines('parallel = u*(dot(u,x)/dot(u,u));', 'perpendicular = x-parallel;', 'energy_gap = dot(x,x)-dot(parallel,parallel)-dot(perpendicular,perpendicular);'), outputs: [['parallel', 'Use the projection to extract the component along u.'], ['perpendicular', 'The second component is the original vector minus its parallel component.'], ['energy_gap', 'Compare squared lengths, not ordinary lengths.']],
      hints: ['A vector dotted with itself is its squared length.', 'The projection and residual are perpendicular, so their squared lengths add.', 'Compute both component vectors before comparing dot(x,x) with their two self-dot-products.'],
    })),
    problem('repair-unit-assumption', 'Repair a formula that assumes a unit direction', 'Transfer', r => ({
      prompt: 'naive = u*dot(u,x) wrongly assumes u has unit length. Store corrected using the general projection formula, and improvement = norm(x-naive)-norm(x-corrected). A nonnegative improvement means the repaired point is at least as close.',
      setup: lines(`x = ${vec(nonzeroVector(r))};`, `u = ${vec([r.int(2, 5), r.int(1, 4)])};`, 'naive = u*dot(u,x);'), solution: lines('corrected = u*(dot(u,x)/dot(u,u));', 'improvement = norm(x-naive)-norm(x-corrected);'), outputs: [['corrected', 'Correct the missing normalization in the projection coefficient.'], ['improvement', 'Subtract the corrected error length from the original error length.']],
      hints: ['The shortcut coefficient dot(u,x) is valid only for a unit u.', 'The general coefficient divides by dot(u,u).', 'After repairing the point, compare the two residual norms in the requested order.'],
    })),
  ],

  'laml-matrix-maps': [
    problem('apply-coordinate-map', 'Apply a map and inspect its first column', 'Warm-up', r => ({
      prompt: 'Store mapped = A*x and first_direction = A*[1;0]. The first coordinate direction selects the first matrix column.',
      setup: lines(`A = ${mat(matrix(r))};`, `x = ${vec(nonzeroVector(r))};`), solution: lines('mapped = A*x;', 'first_direction = A*[1;0];'), outputs: [['mapped', 'Combine columns of A using the coordinates in x.'], ['first_direction', 'The image of the first coordinate direction is the first full column.']],
      hints: ['The matrix acts on a vector from the left.', 'Use x for the first product and the first coordinate direction for the second.', 'Both products have two output coordinates, even though OpenMAT stores the vector flat.'],
    })),
    problem('rebuild-from-columns', 'Rebuild a mapped point from the columns', 'Warm-up', r => ({
      prompt: 'Store first_column = A(:,1), second_column = A(:,2), and rebuilt = x(1)*first_column + x(2)*second_column. This must equal A*x.',
      setup: lines(`A = ${mat(matrix(r))};`, `x = ${vec(nonzeroVector(r))};`), solution: lines('first_column = A(:,1);', 'second_column = A(:,2);', 'rebuilt = x(1)*first_column+x(2)*second_column;'), outputs: [['first_column', 'Select every row from column 1.'], ['second_column', 'Select every row from column 2.'], ['rebuilt', 'The input coordinates are the weights of the corresponding columns.']],
      hints: ['Columns show where the two basic directions land.', 'A colon in the row position keeps each column intact.', 'Weight column 1 by x(1) and column 2 by x(2), then add them.'],
    })),
    problem('row-data-coordinate-map', 'Apply a coordinate map to row-stored data', 'Apply', r => ({
      prompt: 'Each row of records is a two-coordinate point. A acts on individual column vectors as A*x. Store transformed = records*transpose(A), and selected = A*records(selected_row,:). OpenMAT stores an extracted single vector flat.',
      setup: lines(`A = ${mat(triangular(r))};`, `records = ${mat(matrix(r, 4, 2))};`, `selected_row = ${r.int(1, 4)};`), solution: lines('transformed = records*transpose(A);', 'selected = A*records(selected_row,:);'), outputs: [['transformed', 'Row-stored observations use the transpose of the column-vector map.'], ['selected', 'Apply A directly to the selected individual vector.']],
      hints: ['A row-data batch and an individual column-vector formula use different storage conventions.', 'Transpose the genuine two-by-two matrix for the row-data product.', 'Use records*transpose(A) for the batch, and A times the selected vector for the individual output.'],
    })),
    problem('construct-from-direction-images', 'Build a map from its direction images', 'Apply', r => ({
      prompt: 'The first coordinate direction must map to image_one and the second to image_two. Store A with those images as columns, then mapped = A*x. Construct A row by row because OpenMAT flattens single vectors.',
      setup: lines(`image_one = ${vec(nonzeroVector(r))};`, `image_two = ${vec(nonzeroVector(r))};`, `x = ${vec(nonzeroVector(r))};`), solution: lines('A = [image_one(1) image_two(1); image_one(2) image_two(2)];', 'mapped = A*x;'), outputs: [['A', 'Arrange the supplied images as columns, not as rows.'], ['mapped', 'Use your constructed map on the complete input vector.']],
      hints: ['Column one is the image of [1;0].', 'The first row contains the first coordinate from both images.', 'Write both rows explicitly, then multiply the resulting matrix by x.'],
    })),
    problem('linearity-audit', 'Verify that mapping a sum preserves addition', 'Transfer', r => ({
      prompt: 'Store mapped_sum = A*(u+v), sum_of_images = A*u+A*v, and discrepancy = norm(mapped_sum-sum_of_images). A linear map preserves sums for every input pair.',
      setup: lines(`A = ${mat(matrix(r))};`, `u = ${vec(nonzeroVector(r))};`, `v = ${vec(nonzeroVector(r))};`), solution: lines('mapped_sum = A*(u+v);', 'sum_of_images = A*u+A*v;', 'discrepancy = norm(mapped_sum-sum_of_images);'), outputs: [['mapped_sum', 'Add the input vectors before applying the first map.'], ['sum_of_images', 'Map each input separately, then add their images.'], ['discrepancy', 'The two constructions should agree within tolerance.']],
      hints: ['Compute both sides of the sum-preservation statement.', 'Keep parentheses around u+v in the first product.', 'Take the norm of the difference after calculating both output vectors.'],
    })),
    problem('affine-shift-audit', 'Detect why a fixed shift breaks linearity', 'Transfer', r => ({
      prompt: 'Define F(z)=A*z+offset. Store at_zero = A*[0;0]+offset and addition_gap = F(u+v)-F(u)-F(v), expanding F with the given formula. A nonzero offset moves zero and makes the sum-preservation gap nonzero.',
      setup: lines(`A = ${mat(matrix(r))};`, `offset = ${vec(nonzeroVector(r))};`, `u = ${vec(nonzeroVector(r))};`, `v = ${vec(nonzeroVector(r))};`), solution: lines('at_zero = A*[0;0]+offset;', 'addition_gap = (A*(u+v)+offset)-(A*u+offset)-(A*v+offset);'), outputs: [['at_zero', 'The matrix sends zero to zero, but the fixed offset remains.'], ['addition_gap', 'Include the offset once in each F evaluation before subtracting.']],
      hints: ['F includes both a matrix action and the same fixed offset.', 'In F(u)+F(v), the offset appears twice rather than once.', 'Expand all three evaluations; the matrix terms cancel and one negative offset remains.'],
    })),
    problem('batched-linear-scores', 'Move from one score to a batch', 'Transfer', r => ({
      prompt: 'Each row of records is a feature vector. Store scores = records*w, and selected_score = dot(records(selected_row,:),w). The selected scalar should match that row of the batch output.',
      setup: lines(`records = ${mat(matrix(r, 4, 3))};`, `w = ${vec(nonzeroVector(r, 3))};`, `selected_row = ${r.int(1, 4)};`), solution: lines('scores = records*w;', 'selected_score = dot(records(selected_row,:),w);'), outputs: [['scores', 'Calculate one dot product for every observation row.'], ['selected_score', 'Select an entire record, then compare it with the same weights.']],
      hints: ['The batch product is several row-weight dot products at once.', 'records(selected_row,:) selects all features of one observation.', 'Compute the matrix-vector product and the selected row’s dot product separately.'],
    })),
  ],

  'laml-composition': [
    problem('two-map-sequence', 'Apply the named first map first', 'Warm-up', r => ({
      prompt: 'The pipeline first applies A, then B. Store intermediate = A*x and final = B*intermediate. Read matrix actions from the input outward.',
      setup: lines(`A = ${mat(triangular(r))};`, `B = ${mat(matrix(r))};`, `x = ${vec(nonzeroVector(r))};`), solution: lines('intermediate = A*x;', 'final = B*intermediate;'), outputs: [['intermediate', 'Apply A before B.'], ['final', 'B acts on the output of A, not directly on the original x.']],
      hints: ['Name the result after the first operation.', 'The second operation receives that intermediate vector.', 'Calculate A*x and then B times that result.'],
    })),
    problem('reverse-map-order', 'Compare the reverse ordering', 'Warm-up', r => ({
      prompt: 'Store forward = B*(A*x), reverse = A*(B*x), and difference = forward-reverse. Reversing two maps generally changes their combined action.',
      setup: lines(`A = ${mat(triangular(r))};`, `B = ${mat([[0, -1], [1, 0]])};`, `x = ${vec(nonzeroVector(r))};`), solution: lines('forward = B*(A*x);', 'reverse = A*(B*x);', 'difference = forward-reverse;'), outputs: [['forward', 'The rightmost map A acts first.'], ['reverse', 'Swap the operation order, not the coordinates of x.'], ['difference', 'Subtract the reverse result from the forward result.']],
      hints: ['The same input must be used in both experiments.', 'Each expression nests one matrix-vector product inside another.', 'Write B*(A*x) and A*(B*x) separately before comparing.'],
    })),
    problem('precompute-pipeline', 'Precompute the combined map', 'Apply', r => ({
      prompt: 'For A followed by B, store combined = B*A, direct = combined*x, and sequential = B*(A*x). Associativity permits grouping the same ordered product in different ways.',
      setup: lines(`A = ${mat(triangular(r))};`, `B = ${mat(triangular(r))};`, `x = ${vec(nonzeroVector(r))};`), solution: lines('combined = B*A;', 'direct = combined*x;', 'sequential = B*(A*x);'), outputs: [['combined', 'The first operation belongs on the right in the combined matrix.'], ['direct', 'Apply the precomputed combined map to x.'], ['sequential', 'Apply A and then B without precomputing their product.']],
      hints: ['Associativity changes parentheses without changing order.', 'The ordered combined matrix is B*A.', 'Verify it by computing both (B*A)*x and B*(A*x).'],
    })),
    problem('three-map-pipeline', 'Compose three processing stages', 'Apply', r => ({
      prompt: 'Data flows through A, then B, then C. Store combined for that order, and final = combined*x. The last operation appears on the left.',
      setup: lines(`A = ${mat(triangular(r))};`, `B = ${mat(matrix(r))};`, `C = ${mat(triangular(r))};`, `x = ${vec(nonzeroVector(r))};`), solution: lines('combined = C*B*A;', 'final = combined*x;'), outputs: [['combined', 'Preserve all three operations in right-to-left action order.'], ['final', 'Apply the complete three-stage map to the input.']],
      hints: ['Start by writing C*(B*(A*x)).', 'Then remove parentheses using associativity.', 'The three matrices remain ordered C, B, A from left to right.'],
    })),
    problem('debug-stretch-rotate', 'Repair a swapped stretch and rotation', 'Transfer', r => {
      const horizontal = r.int(2, 5), vertical = horizontal + r.int(1, 3)
      return { prompt: 'The requested pipeline stretches by S and then quarter-turns by R, but wrong_order = S*(R*x). Store repaired = R*(S*x), and error_length = norm(repaired-wrong_order). The unequal axis scales expose the order error.',
        setup: lines(`S = ${mat([[horizontal, 0], [0, vertical]])};`, 'R = [0 -1; 1 0];', `x = ${vec(nonzeroVector(r))};`, 'wrong_order = S*(R*x);'), solution: lines('repaired = R*(S*x);', 'error_length = norm(repaired-wrong_order);'), outputs: [['repaired', 'The stretch must receive x first; the rotation receives the stretched vector.'], ['error_length', 'Measure the distance between the repaired and swapped-order outputs.']],
        hints: ['The words “then rotate” mean R acts last.', 'Place S nearest the input vector.', 'Compare R*(S*x) with the supplied wrong_order using a norm.'],
      }
    }),
    problem('reverse-undo-order', 'Undo a pipeline in reverse order', 'Transfer', r => {
      const scale = r.int(2, 5), shear = r.nonzero(-3, 3), x = nonzeroVector(r), A = [[scale, 0], [0, 1]], B = [[1, shear], [0, 1]]
      return { prompt: 'An unknown input passed through A and then B to produce observed. undo_a and undo_b are supplied maps that undo their respective stages. Store combined_undo and recovered. Undo the last stage first; do not infer the original input from the printed numbers.',
        setup: lines(`observed = ${vec(multiply(B, multiply(A, x)))};`, `undo_a = ${mat([[1 / scale, 0], [0, 1]])};`, `undo_b = ${mat([[1, -shear], [0, 1]])};`), solution: lines('combined_undo = undo_a*undo_b;', 'recovered = combined_undo*observed;'), outputs: [['combined_undo', 'The undo of B acts first, so it belongs on the right.'], ['recovered', 'Apply both supplied undo stages to the observed output.']],
        hints: ['A pipeline is undone like removing layers: last on, first off.', 'Start with undo_b*observed, then apply undo_a.', 'The combined undo matrix is undo_a*undo_b.'],
      }
    }),
  ],

  'laml-invertibility': [
    problem('diagonal-input-recovery', 'Recover a scaled input', 'Warm-up', r => {
      const A = [[r.int(2, 6), 0], [0, r.int(2, 6)]], x = nonzeroVector(r)
      return { prompt: 'Recover x from A*x=b with a linear solve. Store residual = norm(A*x-b) to verify the recovered input. Use backslash rather than forming an explicit inverse.', setup: lines(`A = ${mat(A)};`, `b = ${vec(multiply(A, x))};`), solution: lines('x = A \\ b;', 'residual = norm(A*x-b);'), outputs: [['x', 'Undo both nonzero diagonal scales to satisfy A*x=b.'], ['residual', 'Reapply A and compare the output with the supplied b.']], hints: ['The observed output and map are known; the input is unknown.', 'OpenMAT writes the solve as A backslash b.', 'Use x = A \\ b, then measure norm(A*x-b).'] }
    }),
    problem('coupled-input-recovery', 'Recover inputs when coordinates are mixed', 'Warm-up', r => {
      const A = triangular(r), x = nonzeroVector(r)
      return { prompt: 'Solve the coupled two-coordinate equation A*x=b. Store x and reconstructed = A*x. Both rows constrain the same unknown input.', setup: lines(`A = ${mat(A)};`, `b = ${vec(multiply(A, x))};`), solution: lines('x = A \\ b;', 'reconstructed = A*x;'), outputs: [['x', 'Use a system solve rather than dividing matching entries.'], ['reconstructed', 'The recovered input must reproduce the supplied output b.']], hints: ['A nonzero off-diagonal entry mixes one coordinate into another.', 'Entrywise division cannot undo that mixing.', 'Solve with backslash and multiply the answer by A to verify it.'] }
    }),
    problem('multiple-right-sides', 'Recover several inputs with one map', 'Apply', r => {
      const A = triangular(r), X = matrix(r, 2, 3), B = A.map(a => Array.from({ length: 3 }, (_, j) => a[0] * X[0][j] + a[1] * X[1][j]))
      return { prompt: 'The columns of B are three observed outputs of the same invertible map A. Store recovered = A \\ B, whose columns are the three original inputs, and reconstructed = A*recovered.', setup: lines(`A = ${mat(A)};`, `B = ${mat(B)};`), solution: lines('recovered = A \\ B;', 'reconstructed = A*recovered;'), outputs: [['recovered', 'Solve for every right-hand-side column while retaining the matrix shape.'], ['reconstructed', 'The same map should reproduce every observed output column.']], hints: ['Each column is its own equation with the same A.', 'Backslash accepts a matrix of right-hand sides.', 'Use A \\ B directly, then multiply by A to reconstruct all columns.'] }
    }),
    problem('residual-correction', 'Repair an approximate input using its residual', 'Apply', r => {
      const A = triangular(r), truth = nonzeroVector(r), candidate = truth.map((x, i) => x + (i === 0 ? r.int(1, 3) : -r.int(1, 3)))
      return { prompt: 'candidate is an incorrect proposed input. Store output_error = b-A*candidate, correction solving A*correction=output_error, and repaired = candidate+correction. This repairs the input rather than merely reporting the error.', setup: lines(`A = ${mat(A)};`, `b = ${vec(multiply(A, truth))};`, `candidate = ${vec(candidate)};`), solution: lines('output_error = b-A*candidate;', 'correction = A \\ output_error;', 'repaired = candidate+correction;'), outputs: [['output_error', 'Use observed minus reconstructed output so the correction has the right sign.'], ['correction', 'Solve for an input change that would remove the output error.'], ['repaired', 'Add the input correction to the candidate, rather than replacing it with the residual.']], hints: ['The output error and input correction live on opposite sides of the map.', 'A*correction must equal b-A*candidate.', 'Solve that equation, then add the correction to candidate.'] }
    }),
    problem('information-loss-witness', 'Exhibit two inputs a singular map cannot distinguish', 'Transfer', r => {
      const a = r.int(1, 4), b = r.int(1, 4), factor = r.nonzero(-3, 3)
      return { prompt: 'C is singular. Store second_input = first_input+hidden_direction, input_distance between the two inputs, and output_distance between their mapped outputs. hidden_direction is nonzero but C erases it.', setup: lines(`C = ${mat([[a, b], [factor * a, factor * b]])};`, `first_input = ${vec(nonzeroVector(r))};`, `hidden_direction = ${vec([b, -a])};`), solution: lines('second_input = first_input+hidden_direction;', 'input_distance = norm(second_input-first_input);', 'output_distance = norm(C*second_input-C*first_input);'), outputs: [['second_input', 'Move the original input by the supplied invisible direction.'], ['input_distance', 'Distinct inputs have a nonzero distance before mapping.'], ['output_distance', 'The singular map collapses the supplied difference to zero.']], hints: ['A unique inverse would require different inputs to have different outputs.', 'Add the hidden direction to create a distinct input.', 'Compare the input difference and the mapped difference with their norms.'] }
    }),
    problem('consistent-tall-recovery', 'Recover two unknowns from three consistent observations', 'Transfer', r => {
      const a = r.int(1, 4), b = r.int(1, 4), A = [[a, 0], [0, b], [r.int(1, 3), r.int(1, 3)]], x = nonzeroVector(r)
      return { prompt: 'A has three observation rows and two unknown input coordinates. The supplied b is exactly consistent with a unique input. Store x = A \\ b and residual = norm(A*x-b). A non-square system can still determine a unique input when its columns are independent and b is reachable.', setup: lines(`A = ${mat(A)};`, `b = ${vec(multiply(A, x))};`), solution: lines('x = A \\ b;', 'residual = norm(A*x-b);'), outputs: [['x', 'Use all three equations to recover the two input coordinates.'], ['residual', 'Verify every observation, not only the first two rows.']], hints: ['The extra row is another constraint, not another unknown.', 'The first two independent directions make the input identifiable in this consistent setup.', 'Use the same backslash solve and check the full reconstruction residual.'] }
    }),
  ],

  'laml-determinant-area': [
    problem('signed-and-unsigned-area', 'Separate signed determinant from area scale', 'Warm-up', r => ({
      prompt: 'Store signed_area = det(A) and area_factor = abs(signed_area). Area is nonnegative even when the map reverses orientation.',
      setup: `A = ${mat([[r.nonzero(-5, 5), r.int(-3, 3)], [0, r.nonzero(-5, 5)]])};`, solution: lines('signed_area = det(A);', 'area_factor = abs(signed_area);'), outputs: [['signed_area', 'Keep the determinant’s orientation sign.'], ['area_factor', 'Use the absolute determinant for the geometric area multiplier.']],
      hints: ['A determinant measures signed area change.', 'The absolute value removes orientation but retains area scaling.', 'Calculate det(A), then apply abs to that scalar.'],
    })),
    problem('scale-a-shape-area', 'Transform a shape whose initial area is known', 'Warm-up', r => ({
      prompt: 'A shape starts with area input_area. Store area_factor = abs(det(A)) and output_area = input_area*area_factor. A determinant scales every shape’s area, not just the unit square.',
      setup: lines(`A = ${mat(triangular(r))};`, `input_area = ${r.int(2, 12)};`), solution: lines('area_factor = abs(det(A));', 'output_area = input_area*area_factor;'), outputs: [['area_factor', 'The determinant magnitude is a multiplier, not the final shape area.'], ['output_area', 'Multiply the original area by the area scale.']],
      hints: ['The determinant describes a ratio of output area to input area.', 'This shape does not have unit area.', 'Multiply input_area by abs(det(A)).'],
    })),
    problem('orientation-sign', 'Report orientation as a numeric sign', 'Apply', r => ({
      prompt: 'Store determinant = det(A), orientation = sign(determinant), and area_factor = abs(determinant). sign returns +1 for preserved orientation and -1 for reversed orientation; the supplied matrix is nonsingular.',
      setup: `A = ${mat([[r.nonzero(-5, 5), r.int(-3, 3)], [0, r.nonzero(-5, 5)]])};`, solution: lines('determinant = det(A);', 'orientation = sign(determinant);', 'area_factor = abs(determinant);'), outputs: [['determinant', 'Calculate the signed determinant before interpreting it.'], ['orientation', 'Reduce the determinant to its sign, rather than reporting its magnitude.'], ['area_factor', 'Keep the positive area multiplier separate from the orientation sign.']],
      hints: ['Orientation and area answer different questions about the same determinant.', 'sign reports positive or negative direction as +1 or -1.', 'Use sign for orientation and abs for area_factor.'],
    })),
    problem('composition-area-law', 'Audit the area change of a pipeline', 'Apply', r => ({
      prompt: 'A acts first and B second. Store combined_area = det(B*A), multiplied_area = det(B)*det(A), and discrepancy = combined_area-multiplied_area. Signed area multipliers multiply under composition.',
      setup: lines(`A = ${mat(triangular(r))};`, `B = ${mat([[r.nonzero(-4, 4), r.int(-3, 3)], [0, r.nonzero(-4, 4)]])};`), solution: lines('combined_area = det(B*A);', 'multiplied_area = det(B)*det(A);', 'discrepancy = combined_area-multiplied_area;'), outputs: [['combined_area', 'Take the determinant of the correctly ordered combined map.'], ['multiplied_area', 'Multiply the two signed determinants; do not add them.'], ['discrepancy', 'The two calculations of signed area scaling should agree.']],
      hints: ['Successive geometric area scales multiply.', 'Retain each orientation sign in the product.', 'Compare det(B*A) with det(B)*det(A).'],
    })),
    problem('collapse-parallelogram', 'Connect dependent columns with collapsed area', 'Transfer', r => {
      const first = nonzeroVector(r), factor = r.nonzero(-3, 3)
      return { prompt: 'C has a second column that is a multiple of its first. Store collapsed_area = det(C), mapped = C*x, and hidden_output = C*hidden_direction. The nonzero hidden_direction is erased by C, demonstrating why zero area prevents an inverse.', setup: lines(`C = ${mat([[first[0], factor * first[0]], [first[1], factor * first[1]]])};`, `x = ${vec(nonzeroVector(r))};`, `hidden_direction = ${vec([-factor, 1])};`), solution: lines('collapsed_area = det(C);', 'mapped = C*x;', 'hidden_output = C*hidden_direction;'), outputs: [['collapsed_area', 'Dependent edges enclose zero parallelogram area.'], ['mapped', 'Calculate the actual mapped endpoint even though the area is zero.'], ['hidden_output', 'The map should erase the supplied nonzero direction.']], hints: ['A multiple of one edge cannot create a second independent area direction.', 'The determinant tests collapse, while multiplication shows its effect on vectors.', 'Compute det(C), C*x, and C*hidden_direction as three separate outputs.'] }
    }),
    problem('design-target-area', 'Design a map with requested area and orientation', 'Transfer', r => ({
      prompt: 'Build A = [horizontal_scale shear; 0 vertical_scale]. Choose vertical_scale so det(A) equals orientation*target_area, where orientation is +1 or -1. Store vertical_scale, A, and signed_area = det(A). Shear changes shape but not this triangular determinant.',
      setup: lines(`horizontal_scale = ${r.nonzero(-5, 5)};`, `shear = ${r.nonzero(-3, 3)};`, `target_area = ${r.int(2, 12)};`, `orientation = ${r.pick([-1, 1])};`), solution: lines('vertical_scale = orientation*target_area/horizontal_scale;', 'A = [horizontal_scale shear; 0 vertical_scale];', 'signed_area = det(A);'), outputs: [['vertical_scale', 'Solve horizontal_scale*vertical_scale = orientation*target_area.'], ['A', 'Put the chosen scales on the diagonal and the supplied shear in the top-right entry.'], ['signed_area', 'Verify the requested signed area rather than only its magnitude.']],
      hints: ['The determinant of this triangular map is the product of its diagonal entries.', 'Include the requested orientation sign before solving for the missing scale.', 'Divide orientation*target_area by horizontal_scale, build A, and check det(A).'],
    })),
  ],
}
