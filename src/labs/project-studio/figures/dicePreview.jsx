import React, { useState } from 'react';
import { actInPreview, decisionGame, legal, newGame, previewState, transition } from './dicePreviewModel.js';

export function DiceDuelPreview() {
  const [state, setState] = useState(() => previewState());
  const [branch, setBranch] = useState('');
  const game = state.game;
  const button = { padding: '8px 14px', border: '1px solid currentColor', borderRadius: 6, background: 'transparent', color: 'inherit', cursor: 'pointer' };
  function compare(action, face) {
    const result = transition(decisionGame(), action, face);
    setBranch(`You: ${result.score[0]}; opponent: ${result.score[1]}; pot: ${result.pot}. ${result.winner === 0 ? 'You win immediately.' : result.turn === 1 ? 'Opponent chooses next.' : 'You choose again.'}`);
  }
  return <section aria-label="Play Dice Duel — rule preview">
    <p><strong>Try the game before writing it.</strong> First to 12 wins. Roll 1 loses the pot; 2–6 adds to it. Bank keeps the pot and passes the turn.</p>
    <p>This browser preview uses repeatable teaching dice and an opponent that banks at 4. It is <strong>not a trained Q-learning opponent</strong>. Later you will build the real terminal game and train its opponent.</p>
    <div style={{ background: '#10221a', color: '#d8fbe8', padding: 16, borderRadius: 8, fontFamily: 'monospace' }}>
      <strong>DICE DUEL · FIRST TO 12</strong>
      <p>You: {game.score[0]} · Opponent: {game.score[1]} · Pot: {game.pot}</p>
      <p>{game.winner === -1 ? 'Your decision: risk the pot or keep it?' : game.winner === 0 ? 'You win!' : 'Opponent wins!'}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button style={button} disabled={!legal(game, 'roll')} onClick={() => setState(s => actInPreview(s, 'roll'))}>Roll</button>
        <button style={button} disabled={!legal(game, 'bank')} onClick={() => setState(s => actInPreview(s, 'bank'))}>Bank</button>
        <button style={button} onClick={() => setState(previewState(newGame()))}>New match</button>
        <button style={button} onClick={() => setState(previewState())}>Reset decision</button>
      </div>
      <ol aria-label="Match events" aria-live="polite">{state.log.map((line, i) => <li key={`${i}-${line}`}>{line}</li>)}</ol>
    </div>
    <p><strong>Compare the same decision:</strong> you have 4, the opponent 7, the pot 5. These buttons show only your move, before the opponent responds.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <button style={button} onClick={() => compare('bank', 1)}>What if I bank?</button>
      <button style={button} onClick={() => compare('roll', 1)}>What if I roll 1?</button>
      <button style={button} onClick={() => compare('roll', 3)}>What if I roll 3?</button>
    </div>
    <output aria-live="polite" style={{ display: 'block', marginTop: 8 }}>{branch || 'Choose a branch to see the new score, pot and turn.'}</output>
  </section>;
}
