// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import LessonCompanions from './LessonCompanions.jsx';

const C = {};
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

const checked = (id) => ({ id, checks: [{ kind: 'run' }] });
const lesson = { id: 'ml-math/02-01', meta: { concepts: 'vectors', revisits: 'tabular-data', notebook: 'ml-vectors', lab: '3' }, steps: [checked('a'), checked('b')] };

describe('lesson companions', () => {
  it('shows the concepts with progress from passed checks, and links to the notebook and the lab', async () => {
    await act(async () => root.render(<LessonCompanions C={C} lesson={lesson} seriesLessons={[lesson]} isStepDone={(s) => s.id === 'a'} />));
    expect(host.textContent).toContain('Vectors');
    expect(host.textContent).toContain('1/2');
    expect(host.textContent).toContain('Comes back: Rows, columns, features and labels');
    const hrefs = [...host.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['#/notebook-lab?lesson=ml-vectors', '#/lab/ml-lab?lab=3']);
  });

  it('renders nothing for a lesson without curriculum metadata', async () => {
    await act(async () => root.render(<LessonCompanions C={C} lesson={{ id: 'x', meta: {}, steps: [] }} />));
    expect(host.innerHTML).toBe('');
  });
});
