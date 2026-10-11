import fs from 'node:fs';

const DATA = new URL('../data/bookmarks.json', import.meta.url);

export function listBookmarks(request, response) {
  const text = fs.readFileSync(DATA, 'utf8');
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Cache-Control', 'no-store');
  response.end(text);
}
