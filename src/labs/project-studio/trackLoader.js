// trackLoader.js
// Discovers lesson markdown the same way the rest of this app discovers
// content — a build-time glob, no registry file to keep in sync. Drop a
// new .md into tracks/<track>/ and it appears, in filename order.
import { parseLesson } from './parseTrack.js';

const FILES = import.meta.glob('./tracks/**/*.md', { query: '?raw', import: 'default', eager: true });

// './tracks/pyside6-engine/01-a-window.md' → { track, id }
function parsePath(p) {
  const parts = p.replace(/^\.\/tracks\//, '').split('/');
  return { track: parts[0], id: parts[parts.length - 1].replace(/\.md$/, '') };
}

const byTrack = {};
for (const [path, raw] of Object.entries(FILES)) {
  const { track, id } = parsePath(path);
  (byTrack[track] ||= []).push({ sortKey: id, lesson: parseLesson(raw, id) });
}

export const TRACKS = Object.fromEntries(
  Object.entries(byTrack).map(([track, entries]) => [
    track,
    entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey)).map((e) => e.lesson),
  ]),
);

export const TRACK_KEYS = Object.keys(TRACKS).sort();
