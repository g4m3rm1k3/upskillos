import { rollFace } from './rng.mjs';

export const TARGET = 30;
export function newPig(start = 0) {
  return { scores: [0, 0], turn: 0, player: start, face: 1, winner: null };
}
export function actions(state) {
  if (state.winner !== null) return [];
  return state.turn === 0 ? ['roll'] : ['roll', 'hold'];
}
export function move(state, action, random = Math.random) {
  if (!actions(state).includes(action)) return false;
  const player = state.player;
  if (action === 'hold') {
    state.scores[player] += state.turn;
    state.turn = 0;
    if (state.scores[player] >= TARGET) state.winner = player;
    else state.player = 1 - player;
  } else {
    state.face = rollFace(random);
    if (state.face === 1) {
      state.turn = 0;
      state.player = 1 - player;
    } else state.turn += state.face;
  }
  return true;
}
export function baseline(state) {
  if (state.turn >= 10 || state.scores[state.player] + state.turn >= TARGET) return 'hold';
  return 'roll';
}
export function stateKey(state) {
  const own = state.scores[state.player];
  const other = state.scores[1 - state.player];
  return [own, other, Math.min(state.turn, TARGET - own)].join(',');
}
