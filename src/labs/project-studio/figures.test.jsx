// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../components/math/MarkdownProse.jsx', () => ({ default: ({ text }) => <p>{text}</p> }));
vi.mock('./DiffBlock.jsx', () => ({ default: () => <pre>reference source</pre> }));
import LessonPanel from './LessonPanel.jsx';
import { parseLesson } from './parseTrack.js';
import { parseFigure } from './figures.js';
import { resolveFigure } from './figures/index.js';
import { TRACKS } from './trackLoader.js';

describe('parseFigure', () => {
  it('reads a name, a caption over several lines, and JSON props', () => {
    const f = parseFigure('name: aml/LoopTrace\ncaption: One pass\nat a time.\nprops: {"values": [1, 2], "mode": "max"}\n');
    expect(f).toEqual({ name: 'aml/LoopTrace', caption: 'One pass\nat a time.', props: { values: [1, 2], mode: 'max' } });
  });

  it('defaults to no caption and no props', () => {
    expect(parseFigure('name: ml-lab/l01-foundations/WeightedSum')).toEqual({ name: 'ml-lab/l01-foundations/WeightedSum', caption: '', props: {} });
  });

  it('rejects a missing name, bad JSON, non-object props and stray text', () => {
    expect(() => parseFigure('caption: hi')).toThrow(/needs a name/);
    expect(() => parseFigure('name: aml/X\nprops: {values: [1]}')).toThrow(/aren't JSON/);
    expect(() => parseFigure('name: aml/X\nprops: [1, 2]')).toThrow(/JSON object/);
    expect(() => parseFigure('hello\nname: aml/X')).toThrow(/before any key/);
    expect(() => parseFigure('name: aml/X\nprops: {}\nmore')).toThrow(/one line/);
  });
});

describe('resolveFigure', () => {
  it('finds this series\' figures and ML Lab figures, and nothing else', async () => {
    const own = resolveFigure('aml/LoopTrace');
    expect(own.exportName).toBe('LoopTrace');
    expect(typeof (await own.load()).LoopTrace).toBe('function');
    const lab = resolveFigure('ml-lab/l01-foundations/WeightedSum');
    expect(typeof (await lab.load()).WeightedSum).toBe('function');
    expect(resolveFigure('ml-lab/l99-nothing/X')).toBeNull();
    expect(resolveFigure('nowhere/X')).toBeNull();
    expect(resolveFigure('aml')).toBeNull();
  });
});

describe('figures in lessons', () => {
  const placed = Object.values(TRACKS).flat().flatMap((lesson) => lesson.steps.flatMap((step) => (step.figures ?? []).map((figure) => ({ lesson, step, figure }))));

  it('the Applied ML series places figures', () => {
    expect(placed.some(({ figure }) => figure.name.startsWith('aml/'))).toBe(true);
  });

  it('every figure a lesson names exists', async () => {
    for (const { lesson, step, figure } of placed) {
      const found = resolveFigure(figure.name);
      expect(found, `${lesson.id} / ${step.title}: ${figure.name}`).not.toBeNull();
      expect(typeof (await found.load())[found.exportName], `${lesson.id} / ${step.title}: ${figure.name}`).toBe('function');
    }
  });

  it('leaves no unplaced markers or figure fences in the prose', () => {
    for (const lesson of Object.values(TRACKS).flat()) {
      for (const step of lesson.steps) {
        const text = `${step.prose}\n${step.explain}`;
        expect(text, `${lesson.id} / ${step.title}`).not.toMatch(/```figure/);
        const markers = [...text.matchAll(/^@@figure-(\d+)@@$/gm)].map((m) => Number(m[1]));
        expect(markers, `${lesson.id} / ${step.title}`).toEqual((step.figures ?? []).map((_, i) => i));
      }
    }
  });
});

describe('a figure in a lesson step', () => {
  let root, host;
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement('div'); document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(async () => {
    await act(async () => root.unmount()); host.remove();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  async function show(lesson, stepIndex = 0) {
    await act(async () => root.render(<LessonPanel C={{}} lesson={lesson} lessons={[lesson]} step={lesson.steps[stepIndex]} stepIndex={stepIndex} />));
    // The figure's module loads asynchronously.
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
  }

  it('is drawn where it was written, and responds to its controls', async () => {
    const lesson = parseLesson([
      '## Loop',
      'Before the figure.',
      '```figure',
      'name: aml/LoopTrace',
      'caption: The caption.',
      'props: {"values": [4.1, 3.8, 4.3], "mode": "max"}',
      '```',
      'After the figure.',
    ].join('\n'), 'aml-test/fig');
    await show(lesson);
    const text = host.textContent;
    expect(text.indexOf('Before the figure.')).toBeLessThan(text.indexOf('before the loop'));
    expect(text.indexOf('before the loop')).toBeLessThan(text.indexOf('After the figure.'));
    expect(text).toContain('The caption.');
    const next = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Next step');
    await act(async () => next.click());
    await act(async () => next.click());
    expect(host.textContent).toContain('3.8 > 4.1 is False: no change');
    expect(host.textContent).toContain('slowest = values[0] = 4.1');
  });

  it('says so instead of failing when a figure name points nowhere', async () => {
    const lesson = parseLesson('## Broken\n```figure\nname: aml/NoSuchFigure\n```\n', 'aml-test/broken');
    await show(lesson);
    expect(host.querySelector('[role=alert]').textContent).toContain('No figure called aml/NoSuchFigure');
  });

  it('renders every figure placed in the Applied ML series without an error', async () => {
    for (const lesson of Object.entries(TRACKS).filter(([key]) => key.startsWith('aml-')).flatMap(([, lessons]) => lessons)) {
      for (const [i, step] of lesson.steps.entries()) {
        if (!step.figures?.length) continue;
        await show(lesson, i);
        expect(host.querySelectorAll('figure.ps-figure').length, `${lesson.id} / ${step.title}`).toBe(step.figures.length);
        expect(host.querySelector('[role=alert]'), `${lesson.id} / ${step.title}`).toBeNull();
        expect(host.querySelectorAll('figure.ps-figure svg, figure.ps-figure table').length, `${lesson.id} / ${step.title}`).toBeGreaterThan(0);
      }
    }
  });
});
