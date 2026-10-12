// Shelf's request handlers: one exported function for each route.
import { readBookmarks, writeBookmarks } from './store.js';

function sendJson(response, value) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(value));
}

// The request's body, parsed from JSON.
async function readJson(request) {
  let text = '';
  for await (const chunk of request) {
    text += chunk;
  }
  return JSON.parse(text);
}

export function listBookmarks(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  sendJson(response, readBookmarks());
}

export async function addBookmark(request, response) {
  const body = await readJson(request);
  if (!body.title || !body.url) {
    response.statusCode = 400;
    sendJson(response, { error: 'title and url are required' });
    return;
  }
  const bookmark = { title: body.title, url: body.url };
  const bookmarks = readBookmarks();
  bookmarks.push(bookmark);
  writeBookmarks(bookmarks);
  response.statusCode = 201;
  sendJson(response, bookmark);
}

export async function deleteBookmark(request, response) {
  const body = await readJson(request);
  const bookmarks = readBookmarks();
  const kept = bookmarks.filter((bookmark) => bookmark.url !== body.url);
  if (kept.length === bookmarks.length) {
    response.statusCode = 404;
    sendJson(response, { error: 'no bookmark with that url' });
    return;
  }
  writeBookmarks(kept);
  sendJson(response, { deleted: bookmarks.length - kept.length });
}

export function health(request, response) {
  sendJson(response, { ok: true, name: 'shelf', uptime: process.uptime() });
}

export function countBookmarks(request, response) {
  const bookmarks = readBookmarks();
  sendJson(response, { count: bookmarks.length, empty: bookmarks.length === 0 });
}

export function home(request, response) {
  sendJson(response, { name: 'shelf', routes: Object.keys(routes) });
}

export function notFound(request, response) {
  response.statusCode = 404;
  sendJson(response, { error: 'not found', method: request.method, path: request.url });
}

export function serverError(request, response) {
  response.statusCode = 500;
  sendJson(response, { error: 'server error' });
}

export const routes = {
  'GET /': home,
  'GET /api': home,
  'GET /api/bookmarks': listBookmarks,
  'POST /api/bookmarks': addBookmark,
  'DELETE /api/bookmarks': deleteBookmark,
  'GET /api/health': health,
  'GET /health': health,
  'GET /api/bookmarks/count': countBookmarks,
};
