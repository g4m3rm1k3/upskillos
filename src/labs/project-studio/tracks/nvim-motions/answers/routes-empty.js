// Shelf's request handlers: one exported function for each route.
import fs from 'node:fs';

const DATA = new URL('../data/bookmarks.json', import.meta.url);

export function listBookmarks(request, response) {
  const text = fs.readFileSync(DATA, 'utf8');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(text);
}

export function health(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify({ ok: true, name: 'shelf', uptime: process.uptime() }));
}

export function countBookmarks(request, response) {
  const bookmarks = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify({ count: bookmarks.length, empty: bookmarks.length === 0 }));
}
