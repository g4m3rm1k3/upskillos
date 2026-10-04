// trackLoader.js
// Discovers lesson markdown the same way the rest of this app discovers
// content — a build-time glob, no registry file to keep in sync. Drop a
// new .md into tracks/<track>/ and it appears, in filename order.
import { parseLesson } from './parseTrack.js';

// Markdown under a track's support/ folder is a file supplied to the learner (a brief, a README), not a lesson.
const FILES = import.meta.glob(['./tracks/**/*.md', '!./tracks/*/support/**'], { query: '?raw', import: 'default', eager: true });
const SUPPORT_FILES = import.meta.glob('./tracks/*/support/**/*', { query: '?raw', import: 'default', eager: true });

// Opt-in supplied infrastructure stays out of the lesson's teaching code blocks. A name may
// include folders (`support: tests/test_grid.py`); the file lands at that path in the project.
export function getSupportFiles(track, names = '') {
  return names.split(',').map(name => name.trim()).filter(Boolean).map(file => {
    const content = SUPPORT_FILES[`./tracks/${track}/support/${file}`];
    if (content == null) throw new Error(`Missing support file: ${track}/${file}`);
    return { file, content };
  });
}

// './tracks/pyside6-engine/01-a-window.md' → { track, id }
function parsePath(p) {
  const parts = p.replace(/^\.\/tracks\//, '').split('/');
  return { track: parts[0], id: parts[parts.length - 1].replace(/\.md$/, '') };
}

const byTrack = {};
for (const [path, raw] of Object.entries(FILES)) {
  const { track, id } = parsePath(path);
  (byTrack[track] ||= []).push({ sortKey: id, lesson: parseLesson(raw, `${track}/${id}`) });
}

export const TRACKS = Object.fromEntries(
  Object.entries(byTrack).map(([track, entries]) => [
    track,
    entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey)).map((e) => e.lesson),
  ]),
);

// Ordered by the first lesson's `trackOrder:` frontmatter (tracks without one go last), then by
// folder name. The first track is the one a new learner sees.
const trackOrder = (key) => Number(TRACKS[key]?.find((l) => l.meta?.trackOrder)?.meta.trackOrder ?? Infinity);
export const TRACK_KEYS = Object.keys(TRACKS).sort((a, b) => trackOrder(a) - trackOrder(b) || a.localeCompare(b));

// A track's display name: the first lesson's `track:` frontmatter, or the folder name.
export function trackTitle(key) {
  return TRACKS[key]?.find((l) => l.meta?.track)?.meta.track ?? key;
}
