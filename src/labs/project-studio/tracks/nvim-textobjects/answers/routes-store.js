// Shelf's request handlers: one exported function for each route.
import { readBookmarks } from './store.js';

function sendJson(response, value) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(value));
}

export function listBookmarks(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  sendJson(response, readBookmarks());
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
  'GET /api/health': health,
  'GET /health': health,
  'GET /api/bookmarks/count': countBookmarks,
};
