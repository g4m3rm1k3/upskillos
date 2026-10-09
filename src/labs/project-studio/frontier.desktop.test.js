// Walks the Frontier series the way a learner would (walkSeries.js explains how). Needs Windows,
// Python 3.12 or newer on PATH, and network access for pip. The first run takes a few minutes
// (PyTorch is about 125 MB).
//
// Safety (docs/frontier-ai-series-plan.md, "Testing safely"): every command runs with the GPU
// hidden and maths libraries on two threads. Run the whole test through the guard:
//   node scripts/frontier-safe-run.mjs --timeout 1800 --mem 3072 -- npx vitest run src/labs/project-studio/frontier.desktop.test.js
//
// FRONTIER_UNTIL, FRONTIER_KEEP, FRONTIER_START and FRONTIER_FROM walk part of the series
// (docs/frontier-handoff.md).
import { walkSeries } from './walkSeries.js';
import { WALKTHROUGH } from './tracks/frontier.walkthrough.js';

walkSeries({ name: 'Frontier', prefix: 'frontier-', walkthrough: WALKTHROUGH, envPrefix: 'FRONTIER' });
