// Derive read-only full-file references from a track's ordered typed fragments.
// Reuse the normal target/diff UI; this never writes to a learner's project.
export function withTypedDiffTargets(lessons) {
  if (!lessons.some(lesson => lesson.meta?.typedDiff === 'true')) return lessons;
  const files = new Map();
  return lessons.map(lesson => ({ ...lesson, steps: lesson.steps.map(step => {
    if (step.optional) return step;
    if (!step.edit) {
      if (step.file && step.target != null) files.set(step.file, `${step.target}\n`);
      return step;
    }
    const before = files.get(step.file);
    if (step.edit.mode === 'append' && before == null) {
      throw new Error(`Typed diff append before creation: ${step.file} (${step.id})`);
    }
    const target = (step.edit.mode === 'append' ? before : '') + step.edit.code;
    files.set(step.file, target);
    const fence = /```[^\n]*\bedit=[^\n]*\n[\s\S]*?```/.exec(step.prose);
    if (!fence) throw new Error(`Missing typed diff fence: ${step.id}`);
    return { ...step, diffBefore: (before ?? '').replace(/\n$/, ''), target: target.replace(/\n$/, ''),
      prose: step.prose.slice(0, fence.index).trim(),
      explain: step.prose.slice(fence.index + fence[0].length).trim() };
  }) }));
}
