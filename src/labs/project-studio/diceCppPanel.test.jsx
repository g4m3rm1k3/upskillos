// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
vi.mock('../../components/math/MarkdownProse.jsx', () => ({ default: ({ text }) => <p>{text}</p> }));
import LessonPanel from './LessonPanel.jsx';
import { TRACKS } from './trackLoader.js';
import { EpsilonSplit, UpdateTrace, RateUncertainty, SixFutures } from './figures/dice.jsx';

async function inView(test) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  try { await test(root, host); }
  finally { await act(async () => root.unmount()); host.remove(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; }
}

it('enumerates independent futures and hides the answer again when the starting pot changes', async () => {
  await inView(async (root, host) => {
    await act(async () => root.render(<SixFutures />));
    expect(host.querySelector('output')).toBeNull();
    const pots = () => [...host.querySelectorAll('tbody tr')].map(row => row.children[1].textContent);
    expect(pots()).toEqual(['0', '7', '8', '9', '10', '11']);
    await act(async () => host.querySelector('button').click());
    expect(host.querySelector('output').textContent).toContain('Expected pot: 7.5. Expected change: 2.5.');
    const slider = host.querySelector('input');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '2');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.querySelector('output')).toBeNull();
    expect(pots()).toEqual(['0', '4', '5', '6', '7', '8']);
    await act(async () => host.querySelector('button').click());
    expect(host.querySelector('output').textContent).toContain('Expected pot: 5. Expected change: 3.');
  });
});

it('shows the actual file diff without opening an optional reference and updates as the learner types', async () => {
  await inView(async (root, host) => {
    const lesson = TRACKS['dice-cpp'][1];
    const index = lesson.steps.findIndex(step => step.title === 'Ask whether play has finished');
    const step = lesson.steps[index];
    const previous = lesson.steps[index - 1].target;
    const show = async currentContent => act(async () => root.render(<LessonPanel C={{}} lesson={lesson}
      lessons={[lesson]} step={step} stepIndex={index} currentContent={currentContent} />));
    await show(previous);
    expect(host.querySelector('[data-diff="add"]').textContent).toContain('finished');
    expect(host.textContent).not.toContain('Full reference file (optional)');
    expect(host.querySelector('[data-diff="add"]').closest('details')).toBeNull();
    await show(step.target.replace('g.winner != -1', 'g.winner == -1'));
    expect(host.querySelector('[data-diff="remove"]').textContent).toContain('g.winner == -1');
    await show(step.target);
    expect(host.textContent).toContain('your file already matches this');
    expect(host.querySelector('[data-diff="add"]')).toBeNull();
  });
});

it('lets learners explore epsilon, terminal masking and sampling uncertainty before coding them', async () => {
  await inView(async (root, host) => {
    await act(async () => root.render(<EpsilonSplit />));
    expect(host.querySelector('output').textContent).toContain('Bank: 0.9; Roll: 0.1');
    const epsilon = host.querySelector('input');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(epsilon, '1');
      epsilon.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.querySelector('output').textContent).toContain('Bank: 0.5; Roll: 0.5');

    await act(async () => root.render(<UpdateTrace />));
    expect(host.querySelector('output').textContent).toContain('0.46');
    await act(async () => host.querySelector('[type="checkbox"]').click());
    expect(host.querySelector('output').textContent).toContain('-0.4');
    expect(host.textContent).toContain('No successor lookup');

    await act(async () => root.render(<RateUncertainty />));
    expect(host.querySelector('output').textContent).toContain('0.011');
    const games = host.querySelector('input');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(games, '8000');
      games.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.querySelector('output').textContent).toContain('0.0055');
  });
});
