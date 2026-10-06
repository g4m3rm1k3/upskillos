// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { DiceDuelPreview } from './figures/dicePreview.jsx';

it('lets a beginner play and compare decisions with honest labels and keyboard-native controls', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<DiceDuelPreview />));
    const button = name => [...host.querySelectorAll('button')].find(b => b.textContent === name);
    expect(host.textContent).toContain('not a trained Q-learning opponent');
    for (const [name, text] of [['What if I bank?', 'You: 9'], ['What if I roll 1?', 'pot: 0'], ['What if I roll 3?', 'You win immediately']]) {
      await act(async () => button(name).click());
      expect(host.querySelector('output').textContent).toContain(text);
    }
    await act(async () => button('New match').click());
    expect(button('Bank').disabled).toBe(true);
    await act(async () => button('Roll').click());
    expect(button('Bank').disabled).toBe(false);
    await act(async () => button('Reset decision').click());
    await act(async () => button('Roll').click());
    expect(button('Roll').disabled).toBe(true);
    expect(host.querySelector('[aria-label="Match events"]').textContent).toContain('You win!');
  } finally {
    await act(async () => root.unmount()); host.remove(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
