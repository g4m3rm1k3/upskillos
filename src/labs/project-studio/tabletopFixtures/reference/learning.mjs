import { seeded } from './rng.mjs';
import { TARGET, newPig, actions, move, baseline, stateKey } from './pig.mjs';

export function values(table, state) {
  return table[stateKey(state)] ?? [0, 0];
}
export function choose(table, state, epsilon, random) {
  const legal = actions(state);
  if (random() < epsilon) return legal[Math.floor(random() * legal.length)];
  if (legal.length === 1) return legal[0];
  const row = values(table, state);
  if (row[0] === row[1]) return baseline(state);
  return row[0] > row[1] ? 'roll' : 'hold';
}
export function update(old, reward, nextBest, terminal, alpha = 0.15, gamma = 0.99) {
  const target = terminal ? reward : reward + gamma * nextBest;
  return old + alpha * (target - old);
}

// One transition ends at the learner's NEXT decision, after the opponent responds.
export function episode(table, random, epsilon, start) {
  const state = newPig(start);
  let moves = 0;
  while (state.winner === null && moves < 2000) {
    if (state.player === 1) {
      move(state, baseline(state), random);
      moves += 1;
      continue;
    }
    const key = stateKey(state);
    const action = choose(table, state, epsilon, random);
    const index = action === 'roll' ? 0 : 1;
    move(state, action, random);
    moves += 1;
    while (state.player === 1 && state.winner === null && moves < 2000) {
      move(state, baseline(state), random);
      moves += 1;
    }
    if (moves >= 2000 && state.winner === null) return null;
    const terminal = state.winner !== null;
    const reward = terminal ? (state.winner === 0 ? 1 : -1) : 0;
    const row = values(table, state);
    const nextBest = state.turn === 0 ? row[0] : Math.max(...row);
    if (!table[key]) table[key] = [0, 0];
    table[key][index] = update(table[key][index], reward, nextBest, terminal);
  }
  return state.winner;
}
export function train(episodes = 40000, seed = 7) {
  const table = Object.create(null);
  const random = seeded(seed);
  let truncated = 0;
  for (let i = 0; i < episodes; i += 1) {
    if (episode(table, random, 0.2, i % 2) === null) truncated += 1;
  }
  return { version: 1, game: 'pig', target: TARGET, episodes, seed, truncated, table };
}

export function evaluate(table, games = 1000, seed = 900001) {
  let wins = 0;
  let losses = 0;
  let truncated = 0;
  for (let i = 0; i < games; i += 1) {
    const state = newPig(i % 2);
    const random = seeded(seed + i);
    let moves = 0;
    while (state.winner === null && moves < 2000) {
      const action = state.player === 0 ? choose(table, state, 0, random) : baseline(state);
      move(state, action, random);
      moves += 1;
    }
    if (state.winner === 0) wins += 1;
    else if (state.winner === 1) losses += 1;
    else truncated += 1;
  }
  const n = wins + losses;
  const rate = n ? wins / n : 0;
  // Wilson interval: stable even when all outcomes agree.
  const z = 1.96;
  const denominator = 1 + z * z / Math.max(1, n);
  const center = (rate + z * z / (2 * Math.max(1, n))) / denominator;
  const half = z * Math.sqrt((rate * (1 - rate) + z * z / (4 * Math.max(1, n))) / Math.max(1, n)) / denominator;
  return { wins, losses, truncated, rate, low: Math.max(0, center - half), high: Math.min(1, center + half) };
}

export function validateModel(model) {
  if (!model || model.version !== 1 || model.game !== 'pig' || model.target !== TARGET ||
      !model.table || typeof model.table !== 'object' || Array.isArray(model.table) ||
      !Number.isInteger(model.episodes) || model.episodes < 0) throw new Error('Not a compatible Pig model');
  for (const [key, row] of Object.entries(model.table)) {
    const parts = key.split(',').map(Number);
    if (parts.length !== 3 || parts.some(x => !Number.isInteger(x) || x < 0) ||
        parts[0] >= TARGET || parts[1] >= TARGET || parts[2] > TARGET - parts[0] ||
        !Array.isArray(row) || row.length !== 2 || row.some(x => !Number.isFinite(x) || Math.abs(x) > 1.001)) {
      throw new Error('Invalid state or value in model');
    }
  }
  return model;
}
