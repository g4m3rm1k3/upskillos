// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../components/math/MarkdownProse.jsx', () => ({ default: ({ text }) => <p>{text}</p> }));
vi.mock('./DiffBlock.jsx', () => ({ default: () => <pre>reference source</pre> }));
import LessonPanel from './LessonPanel.jsx';
import { parseLesson } from './parseTrack.js';
import { parseHints } from './hints.js';

describe('parseHints', () => {
  it('reads rungs in order, with continuation lines', () => {
    const hints = parseHints('nudge: Look at the check.\nconcept: sys.argv is a list.\n\nIts first item is the script.\nanswer: ~~~python\nprint(1)\n~~~\n');
    expect(hints.map((h) => h.key)).toEqual(['nudge', 'concept', 'answer']);
    expect(hints[1].text).toBe('sys.argv is a list.\n\nIts first item is the script.');
    expect(hints[2].text).toContain('print(1)');
    expect(hints[0].label).toBe('A nudge');
  });

  it('rejects rungs out of order, empty rungs and stray text', () => {
    expect(() => parseHints('answer: a\nnudge: b')).toThrow(/out of order/);
    expect(() => parseHints('nudge:\nanswer: a')).toThrow(/empty/);
    expect(() => parseHints('hello\nnudge: a')).toThrow(/before any rung/);
    expect(() => parseHints('')).toThrow(/at least one/);
  });
});

describe('hint ladder in a lesson step', () => {
  let root, host;
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    host = document.createElement('div'); document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(async () => {
    await act(async () => root.unmount()); host.remove();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  const LESSON = parseLesson([
    '---', 'title: Greet', '---', '',
    '## Your turn',
    '',
    'Write greet.py.',
    '',
    '```hints',
    'nudge: What does the check run?',
    'shape: Check len(sys.argv) first.',
    'answer: The whole program.',
    '```',
    '',
    '```predict',
    'question: What exit code?',
    'answer: 2',
    'explain: sys.exit(2).',
    '```',
    '',
    'After both.',
  ].join('\n'), 'greet');

  async function render() {
    await act(async () => root.render(
      <LessonPanel C={{}} lesson={LESSON} lessons={[LESSON]} step={LESSON.steps[0]} stepIndex={0} />,
    ));
  }
  const button = () => [...host.querySelectorAll('[data-hints] button')][0];

  it('keeps every rung hidden at first, then reveals one per click, in order', async () => {
    await render();
    const text = () => host.textContent;
    expect(text()).toContain('Write greet.py.');
    expect(text()).toContain('After both.');
    expect(text()).not.toContain('What does the check run?');
    expect(button().textContent).toBe('Show hint 1 of 3: a nudge');

    await act(async () => button().click());
    expect(text()).toContain('What does the check run?');
    expect(text()).not.toContain('Check len(sys.argv) first.');
    expect(button().textContent).toBe('Show hint 2 of 3: the shape of the answer');

    await act(async () => button().click());
    await act(async () => button().click());
    expect(text()).toContain('The whole program.');
    expect(button().textContent).toBe('Hide hints');
    expect(host.querySelector('[data-prediction]')).not.toBeNull();
  });

  it('remembers how many rungs were opened', async () => {
    await render();
    await act(async () => button().click());
    await act(async () => root.unmount());
    root = createRoot(host);
    await render();
    expect(host.textContent).toContain('What does the check run?');
    expect(host.textContent).not.toContain('Check len(sys.argv) first.');
  });
});
