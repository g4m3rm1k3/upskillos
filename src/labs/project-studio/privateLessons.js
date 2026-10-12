// privateLessons.js
// Private lessons: folders on this computer (desktop app only, see desktop/app/private-lessons.cjs),
// each shown as a course in the Series list, for apps that aren't open source. The lessons are read
// from their folders every time; nothing about them is part of the app or its repository.
import { useCallback, useEffect, useState } from 'react';
import { buildDrafts } from './drafts.js';

const EMPTY = { tracks: {}, support: {}, series: [], folders: {}, libraries: [] };

// Every listed folder as a course: lessons, supplied files and a series each.
export function buildPrivateLessons(listing) {
  const out = { tracks: {}, support: {}, series: [], folders: {}, libraries: listing?.libraries ?? [] };
  for (const lib of out.libraries) {
    if (lib.missing) continue;
    const built = buildDrafts(lib, {
      key: `private-${lib.id}`,
      label: `🔒 ${lib.name}`,
      level: 'private',
      audience: folder => `Private lessons from ${folder}, on this computer only. Save a file there and switch back to UpSkillOS to see the change.`,
      chapterAudience: 'A private lesson from your folder.',
    });
    if (!built.series) continue;
    Object.assign(out.tracks, built.tracks);
    Object.assign(out.support, built.support);
    out.series.push({ ...built.series, privateId: lib.id });
    for (const chapter of built.series.chapters) out.folders[chapter.key] = lib.folder;
  }
  return out;
}

// The files a private lesson's `support:` names.
export function privateSupportFiles(lessons, track, names = '') {
  return names.split(',').map(name => name.trim()).filter(Boolean).map(file => {
    const content = lessons.support[track]?.[file];
    if (content == null) throw new Error(`Missing support file: ${file} (put it in the chapter's support folder in ${lessons.folders[track]})`);
    return { file, content };
  });
}

function desktopApi() {
  return typeof window === 'undefined' ? null : window.openCalcDesktop?.privateLessons ?? null;
}

// The private courses, read again whenever the window gets focus (so a lesson saved in another
// editor shows up on switching back). add() asks for a folder and resolves the new course's key.
export function usePrivateLessons() {
  const [api] = useState(desktopApi);
  const [lessons, setLessons] = useState(EMPTY);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    if (!api) return EMPTY;
    try { const built = buildPrivateLessons(await api.list()); setLessons(built); setError(null); return built; } catch (e) { setError(e.message); return EMPTY; }
  }, [api]);
  useEffect(() => {
    if (!api) return undefined;
    void reload();
    const onFocus = () => { void reload(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [api, reload]);
  const add = useCallback(async () => {
    if (!api) return null;
    const result = await api.add();
    if (!result?.ok) { if (!result?.canceled) setError(result?.reason ?? "That folder couldn't be opened."); return null; }
    const built = await reload();
    const series = built.series.find(item => item.privateId === result.id);
    if (!series) { setError('That folder has no lessons yet: add a .md lesson to it (or to a subfolder) and switch back to UpSkillOS.'); return null; }
    return series;
  }, [api, reload]);
  const remove = useCallback(async id => { if (api) { await api.remove(id); await reload(); } }, [api, reload]);
  const open = useCallback(async id => { if (api) { const r = await api.open(id); if (!r?.ok) setError(r?.reason ?? null); } }, [api]);
  return { ...lessons, available: !!api, error, reload, add, remove, open };
}
