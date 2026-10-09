// Author-only verification: deliberately break a reconstructed temporary project.
// Never imported by the learner UI. Every mutation is restored even on failure.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function checkCircuitMutations(root, dotnet) {
  const cases = [
    ['Core/Race.cs', 'kart.Energy -= 35;', 'kart.Energy -= 0;', 'shield spends energy'],
    ['Core/Race.Tick.cs', 'Phase == Phase.Paused || Phase == Phase.Finished', 'Phase == Phase.Finished', 'pause freezes clocks'],
    ['Core/Policy.cs', '(float[])entry.Value.Clone()', 'entry.Value', 'snapshot owns independent rows'],
    ['Core/Policy.cs', 'legal.Max(a => Row(next)[(int)a])', 'Row(next).Max()', 'Q update uses legal future reward'],
    ['Core/Garage.cs', 'policy.Values.Count == 0 || ', '', 'invalid policy is rejected without rewriting'],
    ['Core/Race.Combat.cs', 'hazard.Life > 0 && kart.Id', 'kart.Id', 'one hazard has one impact and expires'],
  ];
  for (const [file, before, after, assertion] of cases) {
    const target = path.join(root, file);
    const original = fs.readFileSync(target, 'utf8');
    if (original.split(before).length !== 2) throw new Error(`Mutation anchor is not unique: ${file}: ${before}`);
    try {
      fs.writeFileSync(target, original.replace(before, after));
      const result = spawnSync(dotnet, ['run', '--project', 'Checks', '-p:UseSharedCompilation=false'], {
        cwd: root, encoding: 'utf8', timeout: 120000,
        env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: '1' },
      });
      const output = (result.stdout || '') + (result.stderr || '');
      // Printed PASS lines do not establish a killed mutation: require the exception.
      if (result.error || result.status === 0 || /error CS\d/.test(output) || !output.includes(`System.Exception: ${assertion}`)) {
        throw new Error(`Mutation did not fail at its intended assertion: ${file}\n${result.error || ''}\n${output}`);
      }
      console.log(`PASS mutation detected → ${assertion}`);
    } finally { fs.writeFileSync(target, original); }
  }
  return cases.length;
}
