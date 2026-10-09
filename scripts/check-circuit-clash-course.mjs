#!/usr/bin/env node
// Replays published learner fragments and executes their build/test milestones.
// This is an author check, not a source generator offered in the course.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkCircuitMutations } from '../src/labs/project-studio/circuitClash.mutations.js';
import { circuitLessons, typeCircuitStep } from '../src/labs/project-studio/circuitClash.walkthrough.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lessons = circuitLessons(path.join(repo, 'src/labs/project-studio/tracks/circuit-clash'));
const dotnetIndex = process.argv.indexOf('--dotnet');
const dotnet = dotnetIndex < 0 ? 'dotnet' : process.argv[dotnetIndex + 1];
if (!dotnet || dotnet.startsWith('--')) throw new Error('--dotnet requires an executable path');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'circuit-clash-walkthrough-'));
const keep = process.argv.includes('--keep');
let runs = 0;
function run(args, expected = '') {
  const result = spawnSync(dotnet, args, { cwd: root, encoding: 'utf8', timeout: 180000,
    env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1' } });
  const output = (result.stdout || '') + (result.stderr || '');
  if (result.error || result.status !== 0 || !output.includes(expected)) {
    throw new Error(`${dotnet} ${args.join(' ')}\n${result.error || ''}\n${output}`);
  }
  runs++;
  console.log(`PASS ${args.join(' ')}${expected ? ` → ${expected}` : ''}`);
  return output;
}
function runScratch(expected, failure = false) {
  const args = ['run', '--project', 'Scratch', '-p:UseSharedCompilation=false'];
  if (!failure) return run(args, expected);
  const result = spawnSync(dotnet, args, { cwd: root, encoding: 'utf8', timeout: 120000,
    env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: '1' } });
  const output = (result.stdout || '') + (result.stderr || '');
  const compilerError = /error CS\d/.test(output);
  if (result.error || result.status === 0 || !output.includes(expected) || (failure === 'compile' ? !compilerError : compilerError)) {
    throw new Error(`Expected the taught failure: ${expected}\n${result.error || ''}\n${output}`);
  }
  runs++;
  console.log(`PASS expected ${failure === 'compile' ? 'compiler diagnostic' : failure === 'runtime' ? 'runtime exception' : 'red assertion'} → ${expected}`);
}
const scratch = new Map([
  ['Execute one observable instruction', ['Circuit Clash workshop']],
  ['Distinguish bits, bytes, characters, and values', ['4\n1\n2']],
  ['Separate a name, its declared type, and its value', ['error CS0266', 'compile']],
  ['Repair the model instead of suppressing the diagnostic', ['one-second result: True']],
  ['Find the type of an expression before its destination', ['casts: 2, -2']],
  ['Choose representation by range, precision, and domain', ['OverflowException', 'runtime']],
  ['Derive equipment permission from a truth table', ['TRUTH TABLE PASSED']],
  ['Maintain an invariant across a transition', ['ENERGY CONTRACT PASSED']],
  ['Trace argument values through a call', ['CALL TRACE PASSED']],
  ['Use the stack trace to find the failing operation', ['DivideByZeroException', 'runtime']],
  ['Repair the contract with an explicit missing result', ['AVERAGE CONTRACT PASSED']],
  ['State the contract before implementing the operation', ['Valid spend rejected', true]],
  ['Make invalid changes impossible through the public operation', ['ENERGY STORE PASSED']],
  ['Copy values and identify shared mutable state', ['VALUE COPY PASSED']],
  ['Read text as text until validation succeeds', ['-1: negative credits rejected']],
  ['Find a minimum in one pass', ['LINEAR SEARCH PASSED']],
  ['Explain what sorting buys and costs', ['INSERTION SORT PASSED']],
  ['Use binary search only when its precondition holds', ['BINARY SEARCH PASSED']],
  ['Visit once and reconstruct the path', ['BREADTH FIRST SEARCH PASSED']],
  ['Materialize a query when you need a snapshot', ['QUERY TIMING PASSED']],
  ['Separate a point, a displacement, and a unit direction', ['VECTOR MOTION PASSED']],
  ['Convert angle units at the boundary', ['ANGLE UNITS PASSED']],
  ['Use a dot product as a signed projection', ['SIGNED PROJECTION PASSED']],
  ['Calculate why farther objects look smaller', ['PERSPECTIVE CHECK PASSED']],
  ['Measure a probability as an observed share', ['PROBABILITY BOUNDARY PASSED']],
  ['Compute an expected reward without predicting every outcome', ['RETURN CALCULATIONS PASSED']],
  ['Compare paired differences rather than one favorite race', ['PAIRED COMPARISON PASSED']],
  ['Wait for a result without sharing its construction', ['TASK OWNERSHIP PASSED']],
  ['Distinguish whole counts from fractional quantities', ['You: 1 rockets']],
  ['Integrate speed over a measured interval', ['speed=12, position=6']],
  ['Guard a purchase before changing state', ['credits=0, owned=True']],
  ['Follow a loop through its boundary', ['tick=2, speed=6']],
  ['Write an executable expectation first', ['negative index should wrap', true]],
  ['Implement the smallest general rule', ['wrap checks passed']],
  ['Create two objects with independent state', ['2 / 0']],
  ['Index an array and grow a list', ['0\n35\n0']],
  ['Grow a sequence and consume oldest-first', ['slots=3, racers=3']],
  ['Associate a key with a value', ['rocket\n10']],
  ['Turn experience into a numerical target', ['Q should move toward its target', true]],
  ['Apply the equation and distinguish terminal states', ['Q arithmetic passed']],
]);
const buildCore = new Set(['07-track-math', '08-karts-and-state', '09-triangles-and-light', '12-race-contracts', '13-driving-and-checkpoints', '14-combat-and-pickups', '15-tick-and-order', '20-save-the-garage', '22-the-policy-table', '24-training-and-evaluation']);
const buildGame = new Set(['10-first-window', '11-build-the-kart', '17-camera-and-world', '18-human-controls', '19-menu-primitives', '23-shared-drivers', '26-complete-menus', '27-run-the-complete-game']);
try {
  for (const lesson of lessons) {
    for (const step of lesson.steps) {
      typeCircuitStep(root, step);
      if (scratch.has(step.title)) runScratch(...scratch.get(step.title));
    }
    const name = lesson.id.split('/')[1];
    if (buildCore.has(name)) run(['build', 'Core', '--nologo', '-p:UseSharedCompilation=false'], 'Build succeeded.');
    if (buildGame.has(name)) run(['build', 'Game', '--nologo', '-p:UseSharedCompilation=false'], 'Build succeeded.');
    if (name === '16-test-the-race') run(['run', '--project', 'Checks', '-p:UseSharedCompilation=false'], 'FOUNDATION CHECKS PASSED');
    if (name === '28-regression-and-evidence') run(['run', '--project', 'Checks', '-p:UseSharedCompilation=false'], 'ALL CHECKS PASSED');
  }
  const mutations = checkCircuitMutations(root, dotnet);
  run(['build', 'Checks', '--no-incremental', '-p:UseSharedCompilation=false'], 'Build succeeded.');
  run(['run', '--project', 'Checks', '--no-build'], 'ALL CHECKS PASSED');
  console.log(`PASS ${mutations} deliberate mutations detected; restored source passes`);
  console.log(`PASS reconstructed course: ${lessons.length} lessons; ${runs} executed milestones`);
  if (keep) console.log(`Reconstructed project: ${root}`);
} finally {
  if (!keep) fs.rmSync(root, { recursive: true, force: true });
  else console.log(`Preserved verification workspace: ${root}`);
}
