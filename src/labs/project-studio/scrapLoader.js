// scrapLoader.js
// Scrap lessons: Markdown pasted into src/labs/project-studio/scrap/, for lessons written somewhere
// else (an agent in the browser, say) that you want to try without registering a series. They sit
// apart from tracks/, so nothing here touches the built-in lessons, their ids or their tests.
//
//   scrap/
//     loose-lesson.md                 Series "Scrap", chapter "Loose lessons"
//     Chess Engine/                   a series: the Series drop-down
//       intro.md                      chapter "Chess Engine"
//       01 The Board/                 a chapter: the Chapter drop-down
//         01-squares.md               lessons, in file-name order
//         support/tests/test_board.py files a lesson's `support:` names
//       02 Moves/Generation/          deeper folders join into one chapter, "02 Moves / Generation"
//
// README.md and anything whose name starts with _ (such as _AGENT-PROMPT.md) are not lessons.
// A file that can't be parsed shows up as a lesson saying what's wrong, never as a crash.
import { parseLesson } from './parseTrack.js';
import { unreadableLesson } from './drafts.js';

const FILES = import.meta.glob(['./scrap/**/*.md', '!./scrap/**/support/**'], { query: '?raw', import: 'default', eager: true });
const SUPPORT_FILES = import.meta.glob('./scrap/**/support/**/*', { query: '?raw', import: 'default', eager: true });

export const SCRAP_PREFIX = 'scrap--';
const LOOSE_SERIES = 'Scrap';
const LOOSE_CHAPTER = 'Loose lessons';

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
const ignored = (part) => part.startsWith('_') || part.startsWith('.') || part.toLowerCase() === 'readme.md';

// './scrap/Chess/01 Board/01-squares.md' → { seriesName, chapterName, folder, name }
function placeOf(path) {
  const parts = path.replace(/^\.\/scrap\//, '').split('/');
  if (parts.some(ignored)) return null;
  const name = parts.pop().replace(/\.md$/i, '');
  const folder = parts.join('/');
  if (!parts.length) return { seriesName: LOOSE_SERIES, chapterName: LOOSE_CHAPTER, folder, name };
  const [seriesName, ...rest] = parts;
  return { seriesName, chapterName: rest.length ? rest.join(' / ') : seriesName, folder, name };
}

// files: { path: markdown }, support: { path: content }, both keyed like the globs above.
export function buildScrap(files, support = {}) {
  const chapters = new Map();
  for (const [path, raw] of Object.entries(files)) {
    const place = placeOf(path);
    if (!place) continue;
    // The folder path is the chapter's key, its project key and the start of its lessons' ids.
    const key = `${SCRAP_PREFIX}${slug(place.folder || 'loose')}`;
    const chapter = chapters.get(key) ?? { key, ...place, entries: [] };
    chapter.entries.push({ name: place.name, raw });
    chapters.set(key, chapter);
  }

  const tracks = {};
  const supportByTrack = {};
  const seriesByName = new Map();
  const sorted = [...chapters.values()].sort((a, b) => a.folder.localeCompare(b.folder));
  for (const chapter of sorted) {
    const lessons = chapter.entries
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ name, raw }) => {
        const id = `${chapter.key}/${name}`;
        try { return parseLesson(raw, id); } catch (error) { return unreadableLesson(id, name, error); }
      });
    tracks[chapter.key] = lessons;
    const prefix = `./scrap/${chapter.folder ? `${chapter.folder}/` : ''}support/`;
    supportByTrack[chapter.key] = Object.fromEntries(Object.entries(support)
      .filter(([path]) => path.startsWith(prefix))
      .map(([path, content]) => [path.slice(prefix.length), content]));
    const label = lessons.find((lesson) => lesson.meta?.track)?.meta.track ?? chapter.chapterName;
    const series = seriesByName.get(chapter.seriesName) ?? {
      key: `${SCRAP_PREFIX}${slug(chapter.seriesName)}`,
      label: chapter.seriesName === LOOSE_SERIES ? LOOSE_SERIES : `Scrap · ${chapter.seriesName}`,
      level: 'scrap',
      maturity: 'in-development',
      audience: `Pasted lessons from src/labs/project-studio/scrap/${chapter.seriesName === LOOSE_SERIES ? '' : `${chapter.seriesName}/`}. Not reviewed.`,
      // Every chapter of a scrap series builds in one project folder.
      sharedProject: true,
      chapters: [],
    };
    series.chapters.push({ key: chapter.key, label, level: 'scrap', maturity: 'in-development', audience: series.audience });
    seriesByName.set(chapter.seriesName, series);
  }
  // Named series in folder order, the loose "Scrap" series last.
  const series = [...seriesByName.values()].sort((a, b) => (a.label === LOOSE_SERIES) - (b.label === LOOSE_SERIES) || a.label.localeCompare(b.label));
  return { tracks, support: supportByTrack, series };
}

export const SCRAP = buildScrap(FILES, SUPPORT_FILES);

// The files a scrap lesson's `support:` names, as trackLoader's getSupportFiles returns them.
export function scrapSupportFiles(track, names = '') {
  return names.split(',').map((name) => name.trim()).filter(Boolean).map((file) => {
    const content = SCRAP.support[track]?.[file];
    if (content == null) throw new Error(`Missing support file: ${file} (put it in the chapter's support/ folder under scrap/)`);
    return { file, content };
  });
}
