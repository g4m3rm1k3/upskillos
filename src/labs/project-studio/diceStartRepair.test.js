import { expect, it } from 'vitest';
import { TRACKS } from './trackLoader.js';
import { WALKTHROUGH } from './tracks/dice-start.walkthrough.js';
const original = [
  "A function returns to its caller",
  "Returning is not printing",
  "A returned boolean answers a question",
  "Try it — Follow a local name",
  "Your turn — Answer a different rule question"
];
it('preserves A05 progress and checks both independent delivery stages', () => {
 const lesson = TRACKS['dice-path-start'].find(l => l.id.endsWith('/05-functions-and-results'));
 original.forEach((title, index) => expect(lesson.steps.find(s => s.id === lesson.id + '-step-' + (index + 1))?.title).toBe(title));
 for (const key of ['transfer-build', 'transfer-change']) {
  const step = lesson.steps.find(s => s.id === lesson.id + '-' + key);
  expect(step.target).toBeNull();
  expect(step.hints.flat()).toHaveLength(3);
  expect(step.checks.length).toBeGreaterThan(8);
  expect(WALKTHROUGH['05-functions-and-results#' + step.title].wrong).toHaveLength(3);
 }
});
