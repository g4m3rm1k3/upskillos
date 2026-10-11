// A file under practice/ is exercise material (the Neovim series' drills): its button writes a
// fresh copy every time, replacing the learner's attempt, and writes nothing else. That is how a
// learner retries a drill.
export const isPracticeFile = (file) => /^practice\//.test(String(file ?? ''));

// Read every destination before writing anything. Supplying infrastructure must
// never replace learner work, even if a later file in the bundle conflicts.
export async function createProvidedFiles(api, files) {
  const missing = [];
  for (const { file, content, preserveExisting = false } of files) {
    const existing = await api.read(file);
    if (!existing.ok) throw new Error(existing.reason || `Could not read ${file}.`);
    if (!existing.missing && !preserveExisting && existing.content !== content) {
      throw new Error(`${file} already contains work. It was not replaced. Use a new empty project folder for the starter.`);
    }
    if (existing.missing) missing.push({ file, content });
  }
  for (const { file, content } of missing) {
    const result = await api.write(file, content);
    if (!result.ok) throw new Error(result.reason || `Could not create ${file}.`);
  }
}
