// Save only against the disk revision that the learner actually opened.
// A failed read must never be mistaken for an empty file.
export async function saveWorkspaceBuffer(api, path, buffer) {
  const disk = await api.read(path);
  if (!disk.ok) return disk;
  if (disk.missing || disk.content !== buffer.base) {
    return { ok: false, reason: `${path} changed on disk. Your draft is safe. Reload the disk version or copy your draft before reconciling it.` };
  }
  return api.write(path, buffer.content);
}

export function draftKey(root) {
  return `mdhub-desktop-drafts:${root}`;
}

export function readDrafts(root) {
  try {
    const saved = JSON.parse(localStorage.getItem(draftKey(root)) || '{}');
    return Object.fromEntries(Object.entries(saved).filter(([, value]) =>
      value && typeof value.content === 'string' && typeof value.base === 'string'));
  } catch { return {}; }
}
