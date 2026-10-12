// Shelf's web pages: HTML files from public/, sent as they are.
import fs from 'node:fs';

function sendPage(response, name) {
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(fs.readFileSync(new URL(`../public/${name}`, import.meta.url)));
}

export function homePage(request, response) {
  sendPage(response, 'index.html');
}

export function aboutPage(request, response) {
  sendPage(response, 'about.html');
}
