import http from 'node:http';
import { listBookmarks, health, countBookmarks } from './routes.js';

const port = process.env.PORT || 3000; // 3000 unless PORT is set

const server = http.createServer((request, response) => {
  console.log(new Date().toISOString(), request.method, request.url);
  if (request.url === '/api/bookmarks') {
    listBookmarks(request, response);
    return;
  }
  if (request.url === '/api/health' || request.url === '/health') {
    health(request, response);
    return;
  }
  if (request.url === '/api/bookmarks/count') {
    countBookmarks(request, response);
    return;
  }
  if (request.url === '/') {
    response.end(`Shelf is running on port ${port}\n`);
    return;
  }
  response.statusCode = 404;
  response.end(`Not found: ${request.url}\n`);
});

server.listen(port, () => {
  console.log(`Shelf is listening on http://localhost:${port}`);
});
