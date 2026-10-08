import { expect, it } from 'vitest';
import { TRACKS } from './trackLoader.js';

// Captured before the teaching repair: inserting a prerequisite must not move saved progress.
const ORIGINAL_STEPS = [
  [
    "Choose what the agent observes",
    "dice-path-learning/22-observation-addresses-step-1"
  ],
  [
    "Name the three coordinates",
    "dice-path-learning/22-observation-addresses-step-2"
  ],
  [
    "Enforce the decision boundary before extracting values",
    "dice-path-learning/22-observation-addresses-step-3"
  ],
  [
    "Reach a real position through the game rules",
    "dice-path-learning/22-observation-addresses-step-4"
  ],
  [
    "Count slots before writing a formula",
    "dice-path-learning/22-observation-addresses-step-5"
  ],
  [
    "Declare checked addressing",
    "dice-path-learning/22-observation-addresses-step-6"
  ],
  [
    "Validate before computing an address",
    "dice-path-learning/22-observation-addresses-step-7"
  ],
  [
    "Observe the address of the real position",
    "dice-path-learning/22-observation-addresses-step-8"
  ],
  [
    "Observe failures without reading outside a container",
    "dice-path-learning/22-observation-addresses-step-9"
  ],
  [
    "Try it — Separate a boundary failure from a coordinate failure",
    "dice-path-learning/22-observation-addresses-step-10"
  ],
  [
    "Your turn — Recover coordinates and rule out collisions",
    "dice-path-learning/22-observation-addresses-step-11"
  ],
  [
    "Give the two numbers a meaning",
    "dice-path-learning/22b-action-value-storage-step-1"
  ],
  [
    "Name a concrete row type and copy it",
    "dice-path-learning/22b-action-value-storage-step-2"
  ],
  [
    "Use a reference when the stored row must change",
    "dice-path-learning/22b-action-value-storage-step-3"
  ],
  [
    "Give the table one owner",
    "dice-path-learning/22b-action-value-storage-step-4"
  ],
  [
    "Initialize all rows and read one checked cell",
    "dice-path-learning/22b-action-value-storage-step-5"
  ],
  [
    "Observe initial estimates",
    "dice-path-learning/22b-action-value-storage-step-6"
  ],
  [
    "Declare a deliberate storage operation",
    "dice-path-learning/22b-action-value-storage-step-7"
  ],
  [
    "Write the actual row instead of a temporary copy",
    "dice-path-learning/22b-action-value-storage-step-8"
  ],
  [
    "Observe separate actions and a preserved neighbor",
    "dice-path-learning/22b-action-value-storage-step-9"
  ],
  [
    "Ask for the best legal estimate",
    "dice-path-learning/22b-action-value-storage-step-10"
  ],
  [
    "Start from a legal candidate, even if it is negative",
    "dice-path-learning/22b-action-value-storage-step-11"
  ],
  [
    "Make an illegal cell tempting on purpose",
    "dice-path-learning/22b-action-value-storage-step-12"
  ],
  [
    "Try it — Find the copied-row and invented-zero bugs",
    "dice-path-learning/22b-action-value-storage-step-13"
  ],
  [
    "Your turn — Audit storage through its public interface",
    "dice-path-learning/22b-action-value-storage-step-14"
  ],
  [
    "Build the storage milestone with the existing project",
    "dice-path-learning/22b-action-value-storage-step-15"
  ]
];
it('preserves every original A22/A22b progress identity while adding keyed teaching steps', () => {
  const steps = TRACKS['dice-path-learning'].flatMap(l => l.steps);
  for (const [title, id] of ORIGINAL_STEPS) {
    expect(steps.find(s => s.id === id)?.title, id).toBe(title);
  }
  expect(new Set(steps.map(s => s.id)).size).toBe(steps.length);
});
