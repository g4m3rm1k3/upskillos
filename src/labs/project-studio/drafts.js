// drafts.js
// Draft lessons from a folder on the learner's own computer (desktop app only, see
// desktop/app/drafts.cjs). They join the lesson list as the "Drafts" series, so a lesson can be
// tried in Project Studio the moment it's saved, without registering it or rebuilding the app.
import { useCallback, useEffect, useState } from 'react';
import { parseLesson } from './parseTrack.js';

export const DRAFTS_SERIES_KEY = 'drafts';
const EMPTY = { tracks: {}, support: {}, series: null, folder: null };

// A draft that can't be parsed still shows up, as a lesson that says what's wrong with it, so one
// typo in one file never hides the rest.
export function unreadableLesson(id, name, error) {
  const prose = `This draft couldn't be read:\n\n> ${error.message}\n\nFix the file, save it, and switch back to UpSkillOS.`;
  return {
    id, title: `${name} (can't be read)`, runtime: 'none', run: null, meta: {}, intro: '',
    steps: [{ id: `${id}-step-1`, title: 'Fix this draft', optional: false, prose, explain: '', target: null, file: null, lang: null, checks: [], predictions: [], hints: [], figures: [] }],
  };
}

// The folder listing (drafts.cjs listFolder) as lessons, supplied files and a series.
export function buildDrafts(listing) {
  if (!listing?.chapters?.length) return { ...EMPTY, folder: listing?.folder ?? null };
  const tracks = {};
  const support = {};
  const chapters = [];
  for (const chapter of listing.chapters) {
    const lessons = [...chapter.lessons]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ name, content }) => {
        const id = `${chapter.key}/${name}`;
        try { return parseLesson(content, id); } catch (error) { return unreadableLesson(id, name, error); }
      });
    if (!lessons.length) continue;
    tracks[chapter.key] = lessons;
    support[chapter.key] = chapter.support ?? {};
    const label = lessons.find((lesson) => lesson.meta?.track)?.meta.track ?? chapter.name;
    chapters.push({ key: chapter.key, label, level: 'draft', maturity: 'in-development', audience: 'A draft from your folder.' });
  }
  if (!chapters.length) return { ...EMPTY, folder: listing.folder };
  const series = {
    key: DRAFTS_SERIES_KEY,
    label: 'Drafts (your folder)',
    level: 'draft',
    maturity: 'in-development',
    audience: `Lessons from ${listing.folder}. Save a file there and switch back to UpSkillOS to see the change.`,
    chapters,
  };
  return { tracks, support, series, folder: listing.folder };
}

// The files a draft lesson's `support:` names, as trackLoader's getSupportFiles returns them.
export function draftSupportFiles(drafts, track, names = '') {
  return names.split(',').map((name) => name.trim()).filter(Boolean).map((file) => {
    const content = drafts.support[track]?.[file];
    if (content == null) throw new Error(`Missing support file: ${file} (put it in the chapter's support folder in ${drafts.folder})`);
    return { file, content };
  });
}

function desktopDrafts() {
  return typeof window === 'undefined' ? null : window.openCalcDesktop?.drafts ?? null;
}

// The current drafts, read again whenever the window gets focus (so a lesson saved in another
// editor shows up on switching back) and when reload() is called.
export function useDrafts() {
  const [api] = useState(desktopDrafts);
  const [drafts, setDrafts] = useState(EMPTY);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    if (!api) return;
    try { setDrafts(buildDrafts(await api.list())); setError(null); } catch (e) { setError(e.message); }
  }, [api]);
  useEffect(() => {
    if (!api) return undefined;
    void reload();
    const onFocus = () => { void reload(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [api, reload]);
  const open = useCallback(async () => {
    if (!api) return;
    const result = await api.open();
    if (!result?.ok) setError(result?.reason ?? "The drafts folder couldn't be opened.");
    void reload();
  }, [api, reload]);
  return { ...drafts, available: !!api, error, reload, open };
}
