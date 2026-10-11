import { describe, expect, it, vi } from 'vitest';
import { saveWorkspaceBuffer } from './desktopWorkspaceFiles.js';

describe('desktop Markdown Hub saves', () => {
  it('writes an edited buffer when the opened disk revision still matches', async () => {
    const api = { read: vi.fn().mockResolvedValue({ ok: true, content: 'before' }), write: vi.fn().mockResolvedValue({ ok: true }) };
    expect(await saveWorkspaceBuffer(api, 'src/main.py', { base: 'before', content: 'after' })).toEqual({ ok: true });
    expect(api.write).toHaveBeenCalledWith('src/main.py', 'after');
  });
  it.each([
    { ok: true, content: 'external edit' },
    { ok: true, content: '', missing: true },
    { ok: false, reason: 'Permission denied' },
  ])('does not overwrite changed, deleted or unreadable files: %j', async disk => {
    const api = { read: vi.fn().mockResolvedValue(disk), write: vi.fn() };
    expect((await saveWorkspaceBuffer(api, 'main.py', { base: 'before', content: 'draft' })).ok).toBe(false);
    expect(api.write).not.toHaveBeenCalled();
  });
  it('reports write failures without claiming the draft was saved', async () => {
    const api = { read: vi.fn().mockResolvedValue({ ok: true, content: '' }), write: vi.fn().mockResolvedValue({ ok: false, reason: 'Disk full' }) };
    expect(await saveWorkspaceBuffer(api, 'main.py', { base: '', content: 'draft' })).toEqual({ ok: false, reason: 'Disk full' });
  });
});
