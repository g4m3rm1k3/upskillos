// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../components/math/MarkdownProse.jsx', () => ({ default: ({ text }) => <p>{text}</p> }));
vi.mock('./DiffBlock.jsx', () => ({ default: () => <pre>reference source</pre> }));
import LessonPanel from './LessonPanel.jsx';
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
async function render(provided, optional = true, currentContent = '') {
  const step = { title: 'A small change', file: 'main.cpp', target: 'source', prose: 'Explanation', provided, checks: [] };
  const lesson = { id: 'lesson', title: 'Pong', meta: optional ? { reference: 'optional', starterLabel: 'Create Pong starter' } : {}, steps: [step] };
  const onCreate = vi.fn();
  await act(async () => root.render(<LessonPanel C={C} step={step} lesson={lesson} lessons={[lesson]} stepIndex={0}
    currentContent={currentContent} canCheck onCreateProvided={onCreate} />));
  return onCreate;
}
describe('lesson action clarity', () => {
  it('offers continuation at the end of a lesson', async () => {
    const step = { id: 'last', title: 'Last step', checks: [] };
    const lesson = { id: 'lesson', title: 'Tools', steps: [step] };
    const next = vi.fn();
    await act(async () => root.render(<LessonPanel C={C} lesson={lesson} lessons={[lesson]} step={step} stepIndex={0}
      continuationLabel="Continue to chapter: Language Foundations" onContinue={next} />));
    const button = [...host.querySelectorAll('button')].find(item => item.textContent.includes('Continue to chapter'));
    await act(async () => button.click());
    expect(next).toHaveBeenCalledOnce();
  });
  it('allows repairing support files even when the main file already matches', async () => {
    const onCreate = await render(true, true, 'source');
    const button = [...host.querySelectorAll('button')].find(b => b.textContent === 'Create Pong starter');
    expect(button.disabled).toBe(false);
    await act(async () => button.click());
    expect(onCreate).toHaveBeenCalledOnce();
  });
  it('identifies supplied code as read-only teaching and provides an explicit setup action', async () => {
    const onCreate = await render(true);
    expect(host.textContent).toContain('Create and read the supplied main.cpp; no code edits in this step.');
    const button = [...host.querySelectorAll('button')].find(b => b.textContent === 'Create Pong starter');
    await act(async () => button.click());
    expect(onCreate).toHaveBeenCalledOnce();
    expect(host.querySelector('details').open).toBe(false);
  });
  it('identifies an editing step and omits the starter action', async () => {
    await render(false);
    expect(host.textContent).toContain('Edit main.cpp; change only the lines described below.');
    expect(host.textContent).not.toContain('Create Pong starter');
  });
  it('keeps the existing full reference display for tracks that have not opted in', async () => {
    await render(false, false);
    expect(host.querySelector('details')).toBeNull();
    expect(host.querySelector('pre').textContent).toBe('reference source');
  });
});

describe('non-blocking challenges', () => {
  it('keeps continuation enabled after a failed check, and exposes deferral and revisit', async () => {
    const challenge = { id: 'challenge', title: 'Challenge — transfer', optional: true, prose: 'Try this independently.', checks: [{ label: 'Correct behavior' }] };
    const teaching = { id: 'teaching', title: 'Read the explanation', checks: [] };
    const lesson = { id: 'typed', title: 'Typed course', meta: { pedagogy: 'typed' }, steps: [challenge, teaching] };
    const onNext = vi.fn(), onDefer = vi.fn(), onSelectStep = vi.fn();
    await act(async () => root.render(<LessonPanel C={C} lesson={lesson} lessons={[lesson]} step={challenge}
      stepIndex={0} onNext={onNext} onDefer={onDefer} onSelectStep={onSelectStep}
      challengeStatus={() => 'needs practice'} isCovered={() => false}
      checkState={{ results: [{ pass: false, detail: 'Boundary case failed' }] }} canCheck />));
    const next = [...host.querySelectorAll('button')].find(b => b.textContent === 'Next step →');
    expect(next.disabled).toBe(false);
    await act(async () => next.click());
    expect(onNext).toHaveBeenCalledOnce();
    await act(async () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Defer and continue →').click());
    expect(onDefer).toHaveBeenCalledOnce();
    await act(async () => host.querySelector('details button').click());
    expect(onSelectStep).toHaveBeenCalledWith('typed', 0);
    expect(host.textContent).toContain('Material covered: 0/1');
    expect(host.textContent).toContain('needs practice');
  });
  it('shows typed fragments without a full solution or a create-code button', async () => {
    const step = { id: 'fragment', title: 'One expression', file: 'Main.java', target: null, edit: { mode: 'append', code: 'return value;' }, prose: 'Explain execution', checks: [] };
    const lesson = { id: 'typed', title: 'Java', meta: { pedagogy: 'typed' }, steps: [step] };
    await act(async () => root.render(<LessonPanel C={C} lesson={lesson} lessons={[lesson]} step={step} stepIndex={0} />));
    expect(host.textContent).toContain('Your editor is never filled for you');
    expect(host.textContent).not.toContain('reference source');
    expect(host.textContent).not.toContain('Create provided');
  });
});

it('describes passed checks as evidence and never treats a skipped check as passed', async () => {
  const step={id:'evidence-step',title:'Check evidence',checks:[{kind:'file',args:['main.py'],label:'main.py exists'}]};
  const lesson={id:'evidence',title:'Evidence',steps:[step]};
  const renderEvidence=async results=>act(async()=>root.render(<LessonPanel C={C} lesson={lesson} lessons={[lesson]} step={step} stepIndex={0} checkState={{results}} canCheck />));
  await renderEvidence([{pass:true}]);
  expect(host.textContent).toContain('Listed checks passed');
  expect(host.textContent).toContain('they do not inspect implementation quality');
  await renderEvidence([{pass:true,skipped:true}]);
  expect(host.textContent).not.toContain('Listed checks passed');
  expect(host.textContent).toContain('not checked on this computer');
});
