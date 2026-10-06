// Explain the actual mechanism without pretending a green check proves mastery.
export function checkEvidence(checks) {
  const kinds = new Set(checks.map(check => check.kind));
  const evidence = [];
  if (['file', 'dir', 'missing'].some(kind => kinds.has(kind))) evidence.push('File checks establish presence or absence at the named path; they do not inspect implementation quality.');
  if (['contains', 'lacks', 'matches'].some(kind => kinds.has(kind))) evidence.push('Source checks inspect text or patterns; matching text does not establish runtime behavior.');
  if (kinds.has('run')) evidence.push('Run checks inspect the listed command, expected exit code and any specified output for the supplied input; other inputs and behavior remain untested.');
  if (kinds.has('tests')) evidence.push('Test checks inspect the named test command and required results; coverage depends on the cases those tests actually contain.');
  if (kinds.has('page')) evidence.push('Page checks inspect the specified browser expression; appearance, accessibility and other interactions still need observation.');
  if ([...kinds].some(kind => typeof kind === 'string' && kind.startsWith('git-'))) evidence.push('Git checks inspect the specified repository state or history; they do not review the correctness of the changes.');
  evidence.push('Skipped checks supply no evidence. Passing checks does not establish that you can explain, debug or independently change the program.');
  return evidence;
}
