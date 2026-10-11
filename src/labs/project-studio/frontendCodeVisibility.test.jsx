// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
vi.mock('../../components/math/MarkdownProse.jsx', () => ({ default: ({ text }) => <p>{text}</p> }));
import LessonPanel from './LessonPanel.jsx';
import { TRACKS } from './trackLoader.js';

it('shows the beginner React implementation without requiring a reference disclosure', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    const lesson = TRACKS['frontend-react'][0];
    const index = lesson.steps.findIndex(step => step.file === 'react/App.jsx');
    await act(async () => root.render(<LessonPanel C={{}} lesson={lesson} lessons={[lesson]}
      step={lesson.steps[index]} stepIndex={index} currentContent="" />));
    const code = host.querySelector('[data-diff="add"]');
    expect(code).not.toBeNull();
    expect(code.closest('details')).toBeNull();
    expect(host.textContent).toContain('function BookCard');
    expect(host.textContent).not.toContain('Full reference file (optional)');
  } finally {
    await act(async () => root.unmount());
    host.remove();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
