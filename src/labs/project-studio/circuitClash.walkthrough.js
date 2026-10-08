// Author verification only. Nothing here is imported by the learner's editor.
// Reconstruct exactly the required edit fragments; optional experiments restore
// their starting state and supply no hidden prerequisites.
import fs from 'node:fs';
import path from 'node:path';
import { parseLesson } from './parseTrack.js';

export function circuitLessons(directory) {
  return fs.readdirSync(directory).filter(name => name.endsWith('.md')).sort().map(name =>
    parseLesson(fs.readFileSync(path.join(directory, name), 'utf8'), `circuit-clash/${name.slice(0, -3)}`));
}

export function typeCircuitStep(root, step) {
  if (step.optional || !step.edit) return;
  const destination = path.resolve(root, step.file);
  if (!destination.startsWith(path.resolve(root) + path.sep)) throw new Error(`Unsafe lesson path: ${step.file}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (step.edit.mode === 'replace') fs.writeFileSync(destination, step.edit.code);
  else {
    if (!fs.existsSync(destination)) throw new Error(`Append before creation: ${step.file}`);
    fs.appendFileSync(destination, step.edit.code);
  }
}
