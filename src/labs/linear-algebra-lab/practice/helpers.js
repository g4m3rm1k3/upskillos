// All randomness is local and reproducible. Reopening an exercise restores its inputs.
export function seededRandom(seed) {
  let state = 2166136261
  for (const character of String(seed)) state = Math.imul(state ^ character.charCodeAt(0), 16777619)
  const next = () => {
    state += 0x6D2B79F5
    let value = Math.imul(state ^ state >>> 15, 1 | state)
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
  return {
    int(min, max) { return min + Math.floor(next() * (max - min + 1)) },
    pick(values) { return values[Math.floor(next() * values.length)] },
    nonzero(min = -5, max = 5) {
      const values = Array.from({ length: max - min + 1 }, (_, i) => min + i).filter(value => value !== 0)
      if (!values.length) throw new Error('A nonzero range must contain a nonzero number.')
      return values[Math.floor(next() * values.length)]
    },
  }
}

export const mat = rows => `[${rows.map(row => row.join(' ')).join('; ')}]`
export const vec = values => `[${values.join('; ')}]`

// A compact authoring helper. Every generated answer is checked by executing the
// authored OpenMAT solution, separately from the learner's fresh workspace.
export function problem(id, title, difficulty, data, solution, outputs, hints) {
  return {
    id, title, difficulty,
    generate(rng) {
      return { ...data(rng), solution, outputs,
        starter: outputs.map(output => `${output.name} = -999;`).join('\n'), hints }
    },
  }
}
