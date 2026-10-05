// Author tooling only. No training blocks the learner's UI or downloads a service.
// node src/games/circuit-clash/train-policy.mjs
import { writeFile } from 'node:fs/promises';
import { train, evaluate } from './training.js';
const trained = train(600, p => { if (p.episodes % 120 === 0) console.log(JSON.stringify(p)); });
const evaluation = evaluate(trained.policy);
await writeFile(new URL('./policy.json', import.meta.url), JSON.stringify({ ...trained, evaluation }, null, 2) + '\n');
console.log(JSON.stringify({ learned: evaluation.learned.meanSeconds, scripted: evaluation.scripted.meanSeconds }));
