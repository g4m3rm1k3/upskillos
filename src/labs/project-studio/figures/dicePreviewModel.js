// Browser rule preview only. Kept independent of rendering and checked against
// the learner's completed C++ rules in diceStart.desktop.test.js.
export const TARGET = 12;
export function newGame() {
  return { score: [0, 0], turn: 0, pot: 0, winner: -1 };
}
export function decisionGame() {
  return { score: [4, 7], turn: 0, pot: 5, winner: -1 };
}
export function legal(game, action) {
  return game.winner === -1 && (action === 'roll' || (action === 'bank' && game.pot > 0));
}
export function transition(game, action, face = 1) {
  if (!legal(game, action)) throw new Error('Unavailable action');
  if (action === 'roll' && (!Number.isInteger(face) || face < 1 || face > 6)) throw new Error('Invalid die');
  const next = { ...game, score: [...game.score] };
  if (action === 'bank') next.score[next.turn] += next.pot;
  else if (face !== 1) {
    next.pot += face;
    if (next.score[next.turn] + next.pot >= TARGET) next.winner = next.turn;
  }
  if (action === 'bank' || face === 1) {
    next.pot = 0;
    next.turn = 1 - next.turn;
  }
  return next;
}

// Repeating teaching dice, not randomness and not a trained policy.
const FACES = [3, 2, 1, 4, 6, 2, 5, 1, 3, 6, 4, 2];
export function previewState(game = decisionGame()) {
  return { game, cursor: 0, log: ['Choose Roll or Bank. The dice sequence is repeatable.'] };
}
export function actInPreview(state, action, forcedFace) {
  if (!legal(state.game, action) || state.game.turn !== 0) return state;
  let cursor = state.cursor;
  const lines = [];
  function move(game, choice, forced) {
    const face = choice === 'roll' ? (forced ?? FACES[cursor++ % FACES.length]) : 1;
    const who = game.turn === 0 ? 'You' : 'Opponent';
    lines.push(choice === 'roll' ? `${who} rolled ${face}${face === 1 ? ': pot lost.' : '.'}` : `${who} banked ${game.pot}.`);
    return transition(game, choice, face);
  }
  let game = move(state.game, action, forcedFace);
  while (game.winner === -1 && game.turn === 1) {
    game = move(game, game.pot >= 4 ? 'bank' : 'roll');
  }
  if (game.winner !== -1) lines.push(game.winner === 0 ? 'You win!' : 'Opponent wins!');
  return { game, cursor, log: [...state.log, ...lines].slice(-8) };
}
