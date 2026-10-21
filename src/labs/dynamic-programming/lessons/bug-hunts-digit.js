// Bug hunts for the digit and automaton lessons (Advanced, digits-automata group). Format: bug-hunts.js.
// Each symptom was found by a search of small inputs against advanced-oracles.js.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const DIGIT_HUNTS = {
  'digit-tight': {
    know: 'tight means the digits so far equal n’s. Once a digit is smaller than n’s, the prefix is below n for good and every later digit is free. So the next prefix is tight only if this one was tight and the digit equals n’s: tight and d == top.',
    swap: pair(['        return sum(count(pos + 1, tight and d == top) for d in range(top + 1) if d != 4)', '        return sum(count(pos + 1, d == top) for d in range(top + 1) if d != 4)'], ['      if (d !== 4) total += count(pos + 1, tight && d === top)', '      if (d !== 4) total += count(pos + 1, d === top)']),
    symptom: { args: [100], expected: 82, buggy: 74 },
    bug: 'Tightness restored by a matching digit',
    why: 'The next state is tight whenever the digit equals top, even if the prefix was already below n. Below n, top is 9, so writing a 9 wrongly makes the prefix tight again and limits the next digit to n’s. For n = 100, numbers like 091 to 099 are cut off: {call} returned {got} instead of {want}.',
    fix: 'Keep the old tightness in the condition: tight and d == top. Once free, a prefix stays free.',
    clues: ['Is 95 counted? Trace it as 095.', 'After the first digit 0 (below 1), what should limit the second and third digits?', 'Can a prefix that is already below n ever become tight again?'],
    decoys: [[['top = digits[pos] if tight else 9', 'const top = tight ? digits[pos] : 9'], 'A tight prefix is limited by n’s digit, a free one by 9. Right.'], [['return 1', 'if (pos === digits.length) return 1'], 'Every position filled: one number. Right.'], [['digits = list(map(int, str(n)))', 'const digits = String(n)'], 'n’s digits, most significant first. Right.']],
  },

  'digit-leading': {
    know: 'Shorter numbers are written with leading zeros to the full length: 7 is 07 when n has two digits. Those padding zeros are not digits of the number, so a rule about digits (here, “no 0”) applies only once the number has started.',
    swap: pair(['            if d == 0 and started:', '            if d == 0:'], ['      if (d === 0 && started) continue', '      if (d === 0) continue']),
    symptom: { args: [10], expected: 9, buggy: 0 },
    bug: 'Padding zeros rejected as digits',
    why: 'Every 0 is rejected, padding included. The one-digit numbers 1 to 9 can only be written as 01 to 09, so they are all lost, and 10 itself contains a real 0: {call} returned {got} instead of {want}.',
    fix: 'Reject a 0 only after the number has started: if d == 0 and started.',
    clues: ['How is 7 written when n = 10 has two digits?', 'Is the leading 0 in 07 a digit of the number 7?', 'What does started record, and does the check use it?'],
    decoys: [[['return 1 if started else 0', 'return started ? 1 : 0'], 'A number that never started is 0, outside the range. Right.'], [['started or d != 0', 'started || d !== 0'], 'The first non-zero digit starts the number. Right.'], [['top = digits[pos] if tight else 9', 'const top = tight ? digits[pos] : 9'], 'The usual bound on the next digit. Right.']],
  },

  'digit-range': {
    know: 'F(x) counts the qualifying numbers from 0 to x. The numbers from lo to hi are those up to hi minus those up to lo − 1, so that lo itself stays in: F(hi) − F(lo − 1).',
    swap: pair(['    return F(hi) - F(lo - 1)', '    return F(hi) - F(lo)'], ['  return F(hi) - F(lo - 1)', '  return F(hi) - F(lo)']),
    symptom: { args: [7, 9], expected: 1, buggy: 0 },
    bug: 'The lower end excluded',
    why: 'F(lo) counts lo itself, so subtracting it removes lo from the range. Here lo = 7 is the only number with a 7: {call} returned {got} instead of {want}.',
    fix: 'Subtract F(lo − 1), the numbers strictly below lo.',
    clues: ['Which numbers from 7 to 9 contain a 7?', 'Does F(7) count the number 7?', 'What should be removed from F(hi): the numbers below lo, or up to lo?'],
    decoys: [[['if x < 0:', 'if (x < 0) return 0'], 'F(−1) = 0 handles lo = 0. Right.'], [['seen or d == 7', 'seen || d === 7'], 'Once a 7 appears the number qualifies. Right.'], [['return 1 if seen else 0', 'return seen ? 1 : 0'], 'At the end, count numbers that contain a 7. Right.']],
  },

  'digit-sum': {
    know: 'The remainder of a prefix modulo m changes when a digit is appended: the value becomes 10 · value + d, so the remainder becomes (10 · r + d) mod m. Adding the digit alone is the rule for the digit sum, not for the remainder.',
    swap: pair(['        return sum(count(pos + 1, tight and d == top, total + d, (rem * 10 + d) % m) for d in range(top + 1))', '        return sum(count(pos + 1, tight and d == top, total + d, (rem + d) % m) for d in range(top + 1))'], ['    for (let d = 0; d <= top; d++) out += count(pos + 1, tight && d === top, total + d, (rem * 10 + d) % m)', '    for (let d = 0; d <= top; d++) out += count(pos + 1, tight && d === top, total + d, (rem + d) % m)']),
    symptom: { args: [56, 5, 5], expected: 2, buggy: 6 },
    bug: 'The remainder updated like a digit sum',
    why: 'The remainder is updated as (r + d) mod m, which is the digit sum modulo m, not the number modulo m. With m = 5 that accepts every number whose digit sum is 5, such as 14 and 23, though only 5 and 50 are divisible by 5: {call} returned {got} instead of {want}.',
    fix: 'Shift before adding, as the value does: (rem * 10 + d) % m.',
    clues: ['Which numbers up to 56 have digit sum 5? Which of them are divisible by 5?', 'What is 14 mod 5, and what does the code’s remainder say?', 'Appending a digit multiplies the value by what?'],
    decoys: [[['if total > s:', 'if (total > s) return 0'], 'A sum past s can’t come back. Right.'], [['total == s and rem == 0', 'total === s && rem === 0'], 'Both conditions at the end. Right.'], [['(1 if s == 0 else 0)', '(s === 0 ? 1 : 0)'], '0 is outside the range. Right.']],
  },

  'digit-mask': {
    know: 'The mask records which digits the number uses. Padding zeros before the number starts are not digits of it, so they must leave the mask empty; otherwise a real 0 later would look like a repeat.',
    swap: pair(['                total += count(pos + 1, tight and d == top, 0, False)', '                total += count(pos + 1, tight and d == top, 1, False)'], ['      if (!started && d === 0) total += count(pos + 1, tight && d === top, 0, false)', '      if (!started && d === 0) total += count(pos + 1, tight && d === top, 1, false)']),
    symptom: { args: [100], expected: 90, buggy: 81 },
    bug: 'A padding zero uses up digit 0',
    why: 'A padding zero sets bit 0, so a number written with padding can no longer use a real 0. For n = 100, 10, 20, …, 90 are written 010, 020, …: their real 0 is rejected as a repeat: {call} returned {got} instead of {want}.',
    fix: 'Leave the mask empty for padding: count(…, 0, False).',
    clues: ['Is 10 counted? Write it with n’s three digits.', 'Which bits are set after the padding zero?', 'Is a padding zero a digit of the number?'],
    decoys: [[['elif not mask & (1 << d):', 'else if (!(mask & (1 << d)))'], 'A real digit only if unused. Right.'], [['mask | 1 << d', 'mask | (1 << d)'], 'Mark the digit as used. Right.'], [['return 1 if started else 0', 'return started ? 1 : 0'], 'Only numbers that started. Right.']],
  },

  'digit-adjacency': {
    know: 'last is the previous real digit, or −1 before the number starts, a sentinel that lets any first digit through. Padding zeros keep the sentinel: they are not digits, so a number starting after padding has no neighbour before its first digit.',
    swap: pair(['                total += count(pos + 1, tight and d == top, -1)', '                total += count(pos + 1, tight and d == top, 0)'], ['      if (last < 0 && d === 0) total += count(pos + 1, tight && d === top, -1)', '      if (last < 0 && d === 0) total += count(pos + 1, tight && d === top, 0)']),
    symptom: { args: [9], expected: 9, buggy: 10 },
    bug: 'Padding counted as a previous digit',
    why: 'A padding zero is stored as the digit 0, so the number looks as if it has started. The all-padding number 0 then counts as a real number, and longer numbers are checked against a 0 that isn’t there: {call} returned {got} instead of {want}.',
    fix: 'Keep the sentinel for padding: count(…, -1).',
    clues: ['Which numbers from 1 to 9 qualify? Is 0 among them?', 'After a padding zero, what should last be?', 'What does last >= 0 at the end mean?'],
    decoys: [[['abs(d - last) >= 2', 'Math.abs(d - last) >= 2'], 'The rule between real neighbours. Right.'], [['return 1 if last >= 0 else 0', 'return last >= 0 ? 1 : 0'], 'Only numbers that started count. Right, if last stays −1 during padding.'], [['top = digits[pos] if tight else 9', 'const top = tight ? digits[pos] : 9'], 'The bound on the next digit. Right.']],
  },

  'digit-aggregate': {
    know: 'Each state carries how many prefixes reach it (count) and the sum of their values (total). Appending digit d turns each value x into 10x + d, so the sum of count values becomes 10 · total + d · count: the d is added once per prefix.',
    swap: pair(['                nt = (10 * t + d * c) % M', '                nt = (10 * t + d) % M'], ['        next.set(k, [(pc + c) % M, (pt + (10 * t + d * c)) % M])', '        next.set(k, [(pc + c) % M, (pt + (10 * t + d)) % M])']),
    symptom: { args: [82], expected: 925, buggy: 850 },
    bug: 'The new digit added once, not once per prefix',
    why: 'The total adds d once, as if one prefix reached the state. When several prefixes share a state (like 1 and 3, both below 8), each of them gets the digit, so it must be added count times. Two-digit numbers come out too small: {call} returned {got} instead of {want}.',
    fix: 'Add d for every prefix: 10 · total + d · count.',
    clues: ['Add up 11, 13, 31, 33 by hand. How many times does the last digit appear?', 'How many prefixes does a state with count c stand for?', 'What happens to each prefix value x when d is appended?'],
    decoys: [[['if d % 2 == 0 and (started or d != 0):', 'if (d % 2 === 0 && (started || d !== 0)) continue'], 'Even digits are out, except padding. Right.'], [['states = {(True, False): (1, 0)}', "let states = new Map([['1,0', [1, 0]]])"], 'One empty prefix of value 0. Right.'], [['if started) % M', "key.endsWith(',1')"], 'Only numbers that started. Right.']],
  },

  'kmp-dp': {
    know: 'On a mismatch, the automaton falls back along the prefix function to the longest prefix of the pattern that still ends the text, which may be more than nothing. Restarting from 0 forgets a partial match that is still alive.',
    swap: pair(['            while k and (k == len(pattern) or pattern[k] != c):\n                k = fail[k]', '            if k and (k == len(pattern) or pattern[k] != c):\n                k = 0'], ['      while (k && (k === pattern.length || pattern[k] !== c)) k = fail[k]', '      if (k && (k === pattern.length || pattern[k] !== c)) k = 0']),
    symptom: { args: ['ab', 'bba', 4], expected: 12, buggy: 13 },
    bug: 'A mismatch restarts the match from scratch',
    why: 'After bb, another b doesn’t extend the match to bbb, so the code jumps back to 0 and forgets that the text still ends in bb. The string bbba then never registers the pattern bba: {call} returned {got} instead of {want}.',
    fix: 'Fall back along the prefix function: while k and pattern[k] != c: k = fail[k].',
    clues: ['Does bbba contain bba? Does the code drop it?', 'After reading bbb, how much of bba is matched?', 'What is fail for, and does the step use it?'],
    decoys: [[['fail[i + 1] = k + 1 if', 'fail[i + 1] = pattern[i] === pattern[k]'], 'The prefix function itself. Right.'], [['if to < len(pattern):', 'if (to < pattern.length)'], 'Drop strings that complete the pattern. Right.'], [['ways[0] = 1', 'ways[0] = 1'], 'The empty string matches nothing. Right.']],
  },

  'aho-dp': {
    know: 'Every node needs a move for every letter. A missing trie edge borrows its failure node’s move: after a mismatch, the automaton continues from the longest suffix still in the trie, not from the root.',
    swap: pair(['                goto[u][c] = goto[fail[u]][c]', '                goto[u][c] = 0'], ['      } else go[u][c] = go[fail[u]][c]', '      } else go[u][c] = 0']),
    symptom: { args: ['ab', ['ab'], 4], expected: 5, buggy: 8 },
    bug: 'A missing edge jumps to the root',
    why: 'From node a, reading another a has no trie edge, so the code jumps to the root and forgets that the text still ends in a. Then aab never reaches the forbidden node: {call} returned {got} instead of {want}.',
    fix: 'Borrow the failure node’s move: goto[u][c] = goto[fail[u]][c].',
    clues: ['Does aab contain ab? Does the code reject it?', 'After reading aa, which node should the automaton be in?', 'What do failure links do for missing edges?'],
    decoys: [[['bad[u] = bad[u] or bad[fail[u]]', 'bad[u] = bad[u] || bad[fail[u]]'], 'Forbidden through a suffix. Right.'], [['fail[v] = goto[fail[u]][c]', 'fail[v] = go[fail[u]][c]'], 'A child’s failure follows its parent’s. Right.'], [['if not bad[v]:', 'if (!bad[v])'], 'Never enter a forbidden node. Right.']],
  },

  'automaton-product': {
    know: 'Once the whole pattern has appeared, the string contains it no matter what follows. So the “found” state (matched length = len(pattern)) must keep every later digit in “found”, not fall back like an ordinary partial match.',
    swap: pair(['                        to = full if state == full else step[state][c]', '                        to = step[state][c]'], ['          const to = state === full ? full : step[state][c]', '          const to = step[state][c]']),
    symptom: { args: ['2', 1, 2], expected: 19, buggy: 10 },
    bug: 'A found pattern forgotten',
    why: 'After the pattern appears, the next digit moves the automaton on as if it were still looking. Strings like 23 found the 2 and then lost it, so only strings ending in the pattern count: {call} returned {got} instead of {want}.',
    fix: 'Stay found: to = full if state == full else step[state][c].',
    clues: ['Does 23 contain 2? Is it counted?', 'After reading 2, the state is full. What should 3 do to it?', 'Which strings does the buggy count keep?'],
    decoys: [[['r = (rem * 10 + int(c)) % m', 'const r = (rem * 10 + Number(c)) % m'], 'The remainder part. Right.'], [['return ways[full][0]', 'return ways[full][0]'], 'Found, with remainder 0. Right.'], [['ways[0][0] = 1', 'ways[0][0] = 1'], 'The empty string: nothing matched, remainder 0. Right.']],
  },

  'ranking': {
    know: 'Dictionary order compares the first letter where two strings differ, in alphabetical order. So the letters must be tried smallest first, whatever order the alphabet is given in.',
    swap: pair(["    alphabet = ''.join(sorted(alphabet))", "    alphabet = ''.join(alphabet)"], ["  const abc = [...alphabet].sort().join('')", "  const abc = [...alphabet].join('')"]),
    symptom: { args: ['ba', 'aa', 3, 2], expected: 'abb', buggy: 'bba' },
    bug: 'Letters tried in the given order',
    why: 'The alphabet is given as “ba”, and without sorting, b is tried before a. The strings are then ranked as if b came first in dictionary order: {call} returned {got} instead of {want}.',
    fix: 'Sort the alphabet before ranking: \'\'.join(sorted(alphabet)).',
    clues: ['List the valid strings of length 3 in dictionary order.', 'Which letter does the code try first?', 'Does the order the alphabet is given in mean anything?'],
    decoys: [[['if k > cnt[length][0]:', "if (k > cnt[length][0]) return ''"], 'Fewer than k strings: none. Right.'], [['k -= cnt[rest - 1][nxt]', 'k -= cnt[rest - 1][next]'], 'Skip the strings with a smaller letter here. Right.'], [['if k <= cnt[rest - 1][nxt]:', 'if (k <= cnt[rest - 1][next])'], 'The k-th string starts here. Right.']],
  },
}
