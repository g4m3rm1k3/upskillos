// Reference solutions explained line by line for the digit and automaton lessons (Advanced,
// digits-automata group). Format: explained.js.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

const kmpPy = `def kmp(pattern, alphabet):
    fail = [0] * (len(pattern) + 1)
    for i in range(1, len(pattern)):
        k = fail[i]
        while k and pattern[i] != pattern[k]:
            k = fail[k]
        fail[i + 1] = k + 1 if pattern[i] == pattern[k] else 0
    step = []
    for state in range(len(pattern) + 1):
        row = {}
        for c in alphabet:
            k = state
            while k and (k == len(pattern) or pattern[k] != c):
                k = fail[k]
            row[c] = k + 1 if k < len(pattern) and pattern[k] == c else 0
        step.append(row)
    return step

`
const kmpJs = `function kmp(pattern, alphabet) {
  const fail = new Array(pattern.length + 1).fill(0)
  for (let i = 1; i < pattern.length; i++) {
    let k = fail[i]
    while (k && pattern[i] !== pattern[k]) k = fail[k]
    fail[i + 1] = pattern[i] === pattern[k] ? k + 1 : 0
  }
  const step = []
  for (let state = 0; state <= pattern.length; state++) {
    const row = {}
    for (const c of alphabet) {
      let k = state
      while (k && (k === pattern.length || pattern[k] !== c)) k = fail[k]
      row[c] = k < pattern.length && pattern[k] === c ? k + 1 : 0
    }
    step.push(row)
  }
  return step
}

`
const kmpNotes = [
  ['fail = [0] * (len(pattern) + 1)', 'const fail = new Array(pattern.length + 1).fill(0)', 'fail[i]: the longest proper prefix of pattern[:i] that is also its suffix (the prefix function).'],
  ['row[c] = k + 1 if', 'row[c] = k < pattern.length', 'step[state][c]: after matching state letters, read c. Fall back along fail until c extends the match, or reach 0.'],
]

export const DIGIT_EXPLAINED = {
  'digit-tight': {
    code: pair(`from functools import lru_cache
def solve(n):
    digits = list(map(int, str(n)))
    @lru_cache(None)
    def count(pos, tight):
        if pos == len(digits):
            return 1
        top = digits[pos] if tight else 9
        return sum(count(pos + 1, tight and d == top) for d in range(top + 1) if d != 4)
    return count(0, True)
`, `function solve(n) {
  const digits = String(n).split('').map(Number)
  const memo = new Map()
  function count(pos, tight) {
    if (pos === digits.length) return 1
    const key = pos * 2 + (tight ? 1 : 0)
    if (memo.has(key)) return memo.get(key)
    const top = tight ? digits[pos] : 9
    let total = 0
    for (let d = 0; d <= top; d++) {
      if (d !== 4) total += count(pos + 1, tight && d === top)
    }
    memo.set(key, total)
    return total
  }
  return count(0, true)
}
`),
    notes: [
      ['digits = list(map(int, str(n)))', 'const digits = String(n)', 'n’s digits, most significant first. Numbers below n are built digit by digit against them.'],
      ['def count(pos, tight):', 'function count(pos, tight)', 'count(pos, tight): how many ways to fill positions pos onward. tight says the prefix so far equals n’s, so the next digit may not exceed n’s.'],
      ['return 1', 'return 1', 'Every position filled: one number. Shorter numbers appear as ones with leading zeros, and 0 is the all-zero number.'],
      ['top = digits[pos] if tight else 9', 'const top = tight ? digits[pos] : 9', 'A tight prefix may use only up to n’s digit here; once below n, any digit.'],
      ['if d != 4', 'if (d !== 4)', 'The condition being counted: no digit 4.'],
      ['tight and d == top', 'tight && d === top', 'The next prefix is still tight only if this one was and the digit equals n’s.'],
    ],
    math: [
      ['D(pos, tight)', 'count(pos, tight)', 'count(pos, tight)', 'completions of a prefix of length pos'],
      ['tight′ = tight ∧ (d = nₚₒₛ)', 'tight and d == top', 'tight && d === top', 'still on n’s path'],
    ],
  },

  'digit-leading': {
    code: pair(`from functools import lru_cache
def solve(n):
    digits = list(map(int, str(n)))
    @lru_cache(None)
    def count(pos, tight, started):
        if pos == len(digits):
            return 1 if started else 0
        top = digits[pos] if tight else 9
        total = 0
        for d in range(top + 1):
            if d == 0 and started:
                continue
            total += count(pos + 1, tight and d == top, started or d != 0)
        return total
    return count(0, True, False)
`, `function solve(n) {
  const digits = String(n).split('').map(Number)
  const memo = new Map()
  function count(pos, tight, started) {
    if (pos === digits.length) return started ? 1 : 0
    const key = \`\${pos},\${tight},\${started}\`
    if (memo.has(key)) return memo.get(key)
    const top = tight ? digits[pos] : 9
    let total = 0
    for (let d = 0; d <= top; d++) {
      if (d === 0 && started) continue
      total += count(pos + 1, tight && d === top, started || d !== 0)
    }
    memo.set(key, total)
    return total
  }
  return count(0, true, false)
}
`),
    notes: [
      ['def count(pos, tight, started):', 'function count(pos, tight, started)', 'started: has a non-zero digit been written yet? Zeros before it are padding, not digits of the number.'],
      ['return 1 if started else 0', 'return started ? 1 : 0', 'A number that never started is 0, which is outside 1 … n.'],
      ['if d == 0 and started:', 'if (d === 0 && started) continue', 'A real 0 digit is what is forbidden; a padding zero before the start is not.'],
      ['started or d != 0', 'started || d !== 0', 'The first non-zero digit starts the number.'],
    ],
    math: [
      ['D(pos, tight, started)', 'count(pos, tight, started)', 'count(pos, tight, started)', 'completions, knowing whether real digits have begun'],
      ['started′', 'started or d != 0', 'started || d !== 0', 'the number begins at its first non-zero digit'],
    ],
  },

  'digit-range': {
    code: pair(`from functools import lru_cache
def solve(lo, hi):
    def F(x):
        if x < 0:
            return 0
        digits = list(map(int, str(x)))
        @lru_cache(None)
        def count(pos, tight, seen):
            if pos == len(digits):
                return 1 if seen else 0
            top = digits[pos] if tight else 9
            return sum(count(pos + 1, tight and d == top, seen or d == 7) for d in range(top + 1))
        return count(0, True, False)
    return F(hi) - F(lo - 1)
`, `function solve(lo, hi) {
  function F(x) {
    if (x < 0) return 0
    const digits = String(x).split('').map(Number)
    const memo = new Map()
    function count(pos, tight, seen) {
      if (pos === digits.length) return seen ? 1 : 0
      const key = \`\${pos},\${tight},\${seen}\`
      if (memo.has(key)) return memo.get(key)
      const top = tight ? digits[pos] : 9
      let total = 0
      for (let d = 0; d <= top; d++) total += count(pos + 1, tight && d === top, seen || d === 7)
      memo.set(key, total)
      return total
    }
    return count(0, true, false)
  }
  return F(hi) - F(lo - 1)
}
`),
    notes: [
      ['def F(x):', 'function F(x)', 'F(x) counts the numbers from 0 to x that contain a 7. A digit DP handles one upper bound; two calls handle a range.'],
      ['if x < 0:', 'if (x < 0) return 0', 'F(−1) = 0, so that lo = 0 works: nothing lies below 0.'],
      ['seen or d == 7', 'seen || d === 7', 'Once a 7 appears, the number qualifies whatever follows.'],
      ['return F(hi) - F(lo - 1)', 'return F(hi) - F(lo - 1)', 'The numbers up to hi, minus those below lo.'],
    ],
    math: [
      ['F(x)', 'F(x)', 'F(x)', 'qualifying numbers in [0, x]'],
      ['F(hi) − F(lo − 1)', 'F(hi) - F(lo - 1)', 'F(hi) - F(lo - 1)', 'qualifying numbers in [lo, hi]'],
    ],
  },

  'digit-sum': {
    code: pair(`from functools import lru_cache
def solve(n, s, m):
    digits = list(map(int, str(n)))
    @lru_cache(None)
    def count(pos, tight, total, rem):
        if total > s:
            return 0
        if pos == len(digits):
            return 1 if total == s and rem == 0 else 0
        top = digits[pos] if tight else 9
        return sum(count(pos + 1, tight and d == top, total + d, (rem * 10 + d) % m) for d in range(top + 1))
    return count(0, True, 0, 0) - (1 if s == 0 else 0)
`, `function solve(n, s, m) {
  const digits = String(n).split('').map(Number)
  const memo = new Map()
  function count(pos, tight, total, rem) {
    if (total > s) return 0
    if (pos === digits.length) return total === s && rem === 0 ? 1 : 0
    const key = \`\${pos},\${tight},\${total},\${rem}\`
    if (memo.has(key)) return memo.get(key)
    const top = tight ? digits[pos] : 9
    let out = 0
    for (let d = 0; d <= top; d++) out += count(pos + 1, tight && d === top, total + d, (rem * 10 + d) % m)
    memo.set(key, out)
    return out
  }
  return count(0, true, 0, 0) - (s === 0 ? 1 : 0)
}
`),
    notes: [
      ['def count(pos, tight, total, rem):', 'function count(pos, tight, total, rem)', 'Two things to remember about the prefix: its digit sum and its remainder modulo m.'],
      ['if total > s:', 'if (total > s) return 0', 'Digits only add, so a sum already past s can never come back.'],
      ['total == s and rem == 0', 'total === s && rem === 0', 'At the end, both conditions must hold.'],
      ['(rem * 10 + d) % m', '(rem * 10 + d) % m', 'Appending digit d multiplies the value by 10 and adds d, so the remainder does the same, modulo m.'],
      ['(1 if s == 0 else 0)', '(s === 0 ? 1 : 0)', 'The number 0 has digit sum 0 and remainder 0, but the range starts at 1.'],
    ],
    math: [
      ['r′ = (10r + d) mod m', '(rem * 10 + d) % m', '(rem * 10 + d) % m', 'the remainder after appending d'],
      ['σ′ = σ + d', 'total + d', 'total + d', 'the digit sum after appending d'],
    ],
  },

  'digit-mask': {
    code: pair(`from functools import lru_cache
def solve(n):
    digits = list(map(int, str(n)))
    @lru_cache(None)
    def count(pos, tight, mask, started):
        if pos == len(digits):
            return 1 if started else 0
        top = digits[pos] if tight else 9
        total = 0
        for d in range(top + 1):
            if not started and d == 0:
                total += count(pos + 1, tight and d == top, 0, False)
            elif not mask & (1 << d):
                total += count(pos + 1, tight and d == top, mask | 1 << d, True)
        return total
    return count(0, True, 0, False)
`, `function solve(n) {
  const digits = String(n).split('').map(Number)
  const memo = new Map()
  function count(pos, tight, mask, started) {
    if (pos === digits.length) return started ? 1 : 0
    const key = \`\${pos},\${tight},\${mask},\${started}\`
    if (memo.has(key)) return memo.get(key)
    const top = tight ? digits[pos] : 9
    let total = 0
    for (let d = 0; d <= top; d++) {
      if (!started && d === 0) total += count(pos + 1, tight && d === top, 0, false)
      else if (!(mask & (1 << d))) total += count(pos + 1, tight && d === top, mask | (1 << d), true)
    }
    memo.set(key, total)
    return total
  }
  return count(0, true, 0, false)
}
`),
    notes: [
      ['def count(pos, tight, mask, started):', 'function count(pos, tight, mask, started)', 'mask: the digits used so far, one bit per digit 0–9 (1024 values).'],
      ['if not started and d == 0:', 'if (!started && d === 0)', 'A padding zero: it isn’t a digit of the number, so it must not use up bit 0.'],
      ['elif not mask & (1 << d):', 'else if (!(mask & (1 << d)))', 'A real digit may be used only if its bit is still clear.'],
      ['mask | 1 << d', 'mask | (1 << d)', 'Mark the digit as used.'],
    ],
    math: [
      ['D(pos, tight, S, started)', 'count(pos, tight, mask, started)', 'count(pos, tight, mask, started)', 'completions with the digit set S used'],
      ['S ∪ {d}', 'mask | 1 << d', 'mask | (1 << d)', 'use digit d'],
    ],
  },

  'digit-adjacency': {
    code: pair(`from functools import lru_cache
def solve(n):
    digits = list(map(int, str(n)))
    @lru_cache(None)
    def count(pos, tight, last):
        if pos == len(digits):
            return 1 if last >= 0 else 0
        top = digits[pos] if tight else 9
        total = 0
        for d in range(top + 1):
            if last < 0 and d == 0:
                total += count(pos + 1, tight and d == top, -1)
            elif last < 0 or abs(d - last) >= 2:
                total += count(pos + 1, tight and d == top, d)
        return total
    return count(0, True, -1)
`, `function solve(n) {
  const digits = String(n).split('').map(Number)
  const memo = new Map()
  function count(pos, tight, last) {
    if (pos === digits.length) return last >= 0 ? 1 : 0
    const key = \`\${pos},\${tight},\${last}\`
    if (memo.has(key)) return memo.get(key)
    const top = tight ? digits[pos] : 9
    let total = 0
    for (let d = 0; d <= top; d++) {
      if (last < 0 && d === 0) total += count(pos + 1, tight && d === top, -1)
      else if (last < 0 || Math.abs(d - last) >= 2) total += count(pos + 1, tight && d === top, d)
    }
    memo.set(key, total)
    return total
  }
  return count(0, true, -1)
}
`),
    notes: [
      ['def count(pos, tight, last):', 'function count(pos, tight, last)', 'last: the previous real digit, or −1 before the number has started (a sentinel any digit may follow).'],
      ['return 1 if last >= 0 else 0', 'return last >= 0 ? 1 : 0', 'Only numbers that started count: 0 is outside the range.'],
      ['if last < 0 and d == 0:', 'if (last < 0 && d === 0)', 'Padding zero: still not started, so the sentinel stays.'],
      ['abs(d - last) >= 2', 'Math.abs(d - last) >= 2', 'The rule between neighbours. The first real digit has no neighbour before it.'],
    ],
    math: [
      ['D(pos, tight, last)', 'count(pos, tight, last)', 'count(pos, tight, last)', 'completions after the digit last'],
      ['|d − last| ≥ 2', 'abs(d - last) >= 2', 'Math.abs(d - last) >= 2', 'neighbours differ enough'],
    ],
  },

  'digit-aggregate': {
    code: pair(`def solve(n):
    M = 1000000007
    digits = list(map(int, str(n)))
    states = {(True, False): (1, 0)}
    for top_digit in digits:
        nxt = {}
        for (tight, started), (c, t) in states.items():
            top = top_digit if tight else 9
            for d in range(top + 1):
                if d % 2 == 0 and (started or d != 0):
                    continue
                key = (tight and d == top, started or d != 0)
                nt = (10 * t + d * c) % M
                pc, pt = nxt.get(key, (0, 0))
                nxt[key] = ((pc + c) % M, (pt + nt) % M)
        states = nxt
    return sum(t for (tight, started), (c, t) in states.items() if started) % M
`, `function solve(n) {
  const M = 1000000007
  const digits = String(n).split('').map(Number)
  let states = new Map([['1,0', [1, 0]]])
  for (const topDigit of digits) {
    const next = new Map()
    for (const [key, [c, t]] of states) {
      const [tight, started] = key.split(',').map(Number)
      const top = tight ? topDigit : 9
      for (let d = 0; d <= top; d++) {
        if (d % 2 === 0 && (started || d !== 0)) continue
        const k = \`\${tight && d === top ? 1 : 0},\${started || d !== 0 ? 1 : 0}\`
        const [pc, pt] = next.get(k) ?? [0, 0]
        next.set(k, [(pc + c) % M, (pt + (10 * t + d * c)) % M])
      }
    }
    states = next
  }
  let answer = 0
  for (const [key, [, t]] of states) if (key.endsWith(',1')) answer = (answer + t) % M
  return answer
}
`),
    notes: [
      ['states = {(True, False): (1, 0)}', "let states = new Map([['1,0', [1, 0]]])", 'Each state (tight, started) carries two numbers: how many valid prefixes reach it, and the sum of their values. At first: one empty prefix, value 0.'],
      ['if d % 2 == 0 and (started or d != 0):', 'if (d % 2 === 0 && (started || d !== 0)) continue', 'Even digits are not allowed, except a padding zero before the number starts.'],
      ['nt = (10 * t + d * c) % M', '(pt + (10 * t + d * c)) % M', 'Appending d to every prefix multiplies each value by 10 and adds d: the sum becomes 10 · total + d · count. Every term stays below 20 · M, exact in a double.'],
      ['nxt[key] = ((pc + c) % M', 'next.set(k, [(pc + c) % M', 'Prefixes that reach the same state merge by adding both numbers.'],
      ['if started) % M', "key.endsWith(',1')", 'Only numbers that started count; 0 has the even digit 0.'],
    ],
    math: [
      ['(count, total)', '(c, t)', '[c, t]', 'how many prefixes, and the sum of their values'],
      ['total′ = 10 · total + d · count', '10 * t + d * c', '10 * t + d * c', 'append digit d to every prefix'],
    ],
  },

  'kmp-dp': {
    code: pair(`${kmpPy}def solve(alphabet, pattern, length):
    M = 1000000007
    step = kmp(pattern, alphabet)
    ways = [0] * (len(pattern) + 1)
    ways[0] = 1
    for _ in range(length):
        nxt = [0] * (len(pattern) + 1)
        for state, w in enumerate(ways):
            if w:
                for c in alphabet:
                    to = step[state][c]
                    if to < len(pattern):
                        nxt[to] = (nxt[to] + w) % M
        ways = nxt
    return sum(ways) % M
`, `${kmpJs}function solve(alphabet, pattern, length) {
  const M = 1000000007
  const step = kmp(pattern, alphabet)
  let ways = new Array(pattern.length + 1).fill(0)
  ways[0] = 1
  for (let i = 0; i < length; i++) {
    const next = new Array(pattern.length + 1).fill(0)
    ways.forEach((w, state) => {
      if (!w) return
      for (const c of alphabet) {
        const to = step[state][c]
        if (to < pattern.length) next[to] = (next[to] + w) % M
      }
    })
    ways = next
  }
  return ways.reduce((s, w) => (s + w) % M, 0)
}
`),
    notes: [
      ...kmpNotes,
      ['ways[0] = 1', 'ways[0] = 1', 'ways[state]: strings built so far that end with state letters of the pattern matched. The empty string matches nothing.'],
      ['to = step[state][c]', 'const to = step[state][c]', 'Appending c moves to exactly one next state.'],
      ['if to < len(pattern):', 'if (to < pattern.length)', 'Reaching len(pattern) means the pattern just appeared: such strings are dropped.'],
      ['return sum(ways) % M', 'return ways.reduce', 'Every surviving string, whatever it ends with.'],
    ],
    math: [
      ['W(ℓ + 1, δ(q, c)) += W(ℓ, q)', 'nxt[to] = (nxt[to] + w) % M', 'next[to] = (next[to] + w) % M', 'strings move to the next automaton state'],
      ['δ(q, c)', 'step[state][c]', 'step[state][c]', 'the automaton’s next state'],
    ],
  },

  'aho-dp': {
    code: pair(`from collections import deque
def solve(alphabet, patterns, length):
    M = 1000000007
    goto, fail, bad = [{}], [0], [False]
    for p in patterns:
        node = 0
        for c in p:
            if c not in goto[node]:
                goto.append({})
                fail.append(0)
                bad.append(False)
                goto[node][c] = len(goto) - 1
            node = goto[node][c]
        bad[node] = True
    queue = deque()
    for c in alphabet:
        if c in goto[0]:
            queue.append(goto[0][c])
        else:
            goto[0][c] = 0
    while queue:
        u = queue.popleft()
        bad[u] = bad[u] or bad[fail[u]]
        for c in alphabet:
            if c in goto[u]:
                v = goto[u][c]
                fail[v] = goto[fail[u]][c]
                queue.append(v)
            else:
                goto[u][c] = goto[fail[u]][c]
    ways = [0] * len(goto)
    ways[0] = 1
    for _ in range(length):
        nxt = [0] * len(goto)
        for u, w in enumerate(ways):
            if w:
                for c in alphabet:
                    v = goto[u][c]
                    if not bad[v]:
                        nxt[v] = (nxt[v] + w) % M
        ways = nxt
    return sum(ways) % M
`, `function solve(alphabet, patterns, length) {
  const M = 1000000007
  const go = [{}], fail = [0], bad = [false]
  for (const p of patterns) {
    let node = 0
    for (const c of p) {
      if (!(c in go[node])) {
        go.push({})
        fail.push(0)
        bad.push(false)
        go[node][c] = go.length - 1
      }
      node = go[node][c]
    }
    bad[node] = true
  }
  const queue = []
  for (const c of alphabet) {
    if (c in go[0]) queue.push(go[0][c])
    else go[0][c] = 0
  }
  for (let i = 0; i < queue.length; i++) {
    const u = queue[i]
    bad[u] = bad[u] || bad[fail[u]]
    for (const c of alphabet) {
      if (c in go[u]) {
        const v = go[u][c]
        fail[v] = go[fail[u]][c]
        queue.push(v)
      } else go[u][c] = go[fail[u]][c]
    }
  }
  let ways = new Array(go.length).fill(0)
  ways[0] = 1
  for (let i = 0; i < length; i++) {
    const next = new Array(go.length).fill(0)
    ways.forEach((w, u) => {
      if (!w) return
      for (const c of alphabet) {
        const v = go[u][c]
        if (!bad[v]) next[v] = (next[v] + w) % M
      }
    })
    ways = next
  }
  return ways.reduce((s, w) => (s + w) % M, 0)
}
`),
    notes: [
      ['bad[node] = True', 'bad[node] = true', 'The trie node where a pattern ends is forbidden.'],
      ['bad[u] = bad[u] or bad[fail[u]]', 'bad[u] = bad[u] || bad[fail[u]]', 'A node whose longest proper suffix in the trie is forbidden is forbidden too: that suffix is a pattern that just appeared. Breadth-first order has fail[u] ready.'],
      ['fail[v] = goto[fail[u]][c]', 'fail[v] = go[fail[u]][c]', 'v’s failure: follow c from u’s failure.'],
      ['goto[u][c] = goto[fail[u]][c]', 'else go[u][c] = go[fail[u]][c]', 'A missing edge borrows its failure’s edge, so every node has a move for every letter.'],
      ['if not bad[v]:', 'if (!bad[v])', 'Never step into a forbidden node.'],
    ],
    math: [
      ['W(ℓ + 1, v) += W(ℓ, u)', 'nxt[v] = (nxt[v] + w) % M', 'next[v] = (next[v] + w) % M', 'strings move along the trie edge u → v'],
      ['bad(u) ∨ bad(fail(u))', 'bad[u] or bad[fail[u]]', 'bad[u] || bad[fail[u]]', 'forbidden through a suffix'],
    ],
  },

  'automaton-product': {
    code: pair(`${kmpPy}def solve(pattern, m, length):
    M = 1000000007
    digits = '0123456789'
    step = kmp(pattern, digits)
    full = len(pattern)
    ways = [[0] * m for _ in range(full + 1)]
    ways[0][0] = 1
    for _ in range(length):
        nxt = [[0] * m for _ in range(full + 1)]
        for state in range(full + 1):
            for rem in range(m):
                w = ways[state][rem]
                if w:
                    for c in digits:
                        to = full if state == full else step[state][c]
                        r = (rem * 10 + int(c)) % m
                        nxt[to][r] = (nxt[to][r] + w) % M
        ways = nxt
    return ways[full][0]
`, `${kmpJs}function solve(pattern, m, length) {
  const M = 1000000007
  const digits = '0123456789'
  const step = kmp(pattern, digits)
  const full = pattern.length
  let ways = Array.from({ length: full + 1 }, () => new Array(m).fill(0))
  ways[0][0] = 1
  for (let i = 0; i < length; i++) {
    const next = Array.from({ length: full + 1 }, () => new Array(m).fill(0))
    for (let state = 0; state <= full; state++) {
      for (let rem = 0; rem < m; rem++) {
        const w = ways[state][rem]
        if (!w) continue
        for (const c of digits) {
          const to = state === full ? full : step[state][c]
          const r = (rem * 10 + Number(c)) % m
          next[to][r] = (next[to][r] + w) % M
        }
      }
    }
    ways = next
  }
  return ways[full][0]
}
`),
    notes: [
      ...kmpNotes,
      ['ways = [[0] * m', 'let ways = Array.from', 'ways[state][rem]: digit strings so far, by automaton state and value modulo m. The two parts move together: a product of the two automata.'],
      ['to = full if state == full else step[state][c]', 'const to = state === full ? full : step[state][c]', 'Once the pattern has appeared (state full) it stays found.'],
      ['r = (rem * 10 + int(c)) % m', 'const r = (rem * 10 + Number(c)) % m', 'The remainder part, as in the digit-sum lesson.'],
      ['return ways[full][0]', 'return ways[full][0]', 'Found the pattern, and divisible by m.'],
    ],
    math: [
      ['W(ℓ, q, r)', 'ways[state][rem]', 'ways[state][rem]', 'strings by pattern state q and remainder r'],
      ['(δ(q, c), (10r + c) mod m)', 'step[state][c]', 'step[state][c]', 'both parts advance on each digit'],
    ],
  },

  'ranking': {
    code: pair(`${kmpPy}def solve(alphabet, pattern, length, k):
    alphabet = ''.join(sorted(alphabet))
    step = kmp(pattern, alphabet)
    full = len(pattern)
    cnt = [[1 if s < full else 0 for s in range(full + 1)]]
    for rest in range(1, length + 1):
        cnt.append([0 if s == full else sum(cnt[rest - 1][step[s][c]] for c in alphabet) for s in range(full + 1)])
    if k > cnt[length][0]:
        return ''
    out, state = [], 0
    for rest in range(length, 0, -1):
        for c in alphabet:
            nxt = step[state][c]
            if k <= cnt[rest - 1][nxt]:
                out.append(c)
                state = nxt
                break
            k -= cnt[rest - 1][nxt]
    return ''.join(out)
`, `${kmpJs}function solve(alphabet, pattern, length, k) {
  const abc = [...alphabet].sort().join('')
  const step = kmp(pattern, abc)
  const full = pattern.length, CAP = 2 ** 53
  const cnt = [Array.from({ length: full + 1 }, (_, s) => (s < full ? 1 : 0))]
  for (let rest = 1; rest <= length; rest++) {
    cnt.push(Array.from({ length: full + 1 }, (_, s) => (s === full ? 0 : Math.min(CAP, [...abc].reduce((t, c) => t + cnt[rest - 1][step[s][c]], 0)))))
  }
  if (k > cnt[length][0]) return ''
  let out = '', state = 0
  for (let rest = length; rest > 0; rest--) {
    for (const c of abc) {
      const next = step[state][c]
      if (k <= cnt[rest - 1][next]) {
        out += c
        state = next
        break
      }
      k -= cnt[rest - 1][next]
    }
  }
  return out
}
`),
    notes: [
      ...kmpNotes,
      ["alphabet = ''.join(sorted(alphabet))", "const abc = [...alphabet].sort().join('')", 'Dictionary order means trying letters smallest first.'],
      ['cnt = [[1 if s < full', 'const cnt = [Array.from', 'cnt[rest][s]: how many valid ways to add rest more letters from state s. With nothing left to add, one way (unless the pattern has appeared).'],
      ['if k > cnt[length][0]:', "if (k > cnt[length][0]) return ''", 'Fewer than k valid strings: there is no k-th.'],
      ['if k <= cnt[rest - 1][nxt]:', 'if (k <= cnt[rest - 1][next])', 'If the k-th string starts with c here, take c and go on.'],
      ['k -= cnt[rest - 1][nxt]', 'k -= cnt[rest - 1][next]', 'Otherwise skip every string that has c here: they all come before.'],
    ],
    math: [
      ['N(r, q)', 'cnt[rest - 1][nxt]', 'cnt[rest - 1][next]', 'valid completions of r letters from state q'],
      ['k ← k − N(…)', 'k -= cnt[rest - 1][nxt]', 'k -= cnt[rest - 1][next]', 'skip the strings that start with a smaller letter'],
    ],
  },
}
