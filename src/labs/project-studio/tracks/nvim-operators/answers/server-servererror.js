import http from 'node:http';
import { routes, notFound, serverError } from './routes.js';

const port = process.env.PORT || 3000; // 3000 unless PORT is set

const server = http.createServer((request, response) => {
  console.log(new Date().toISOString(), request.method, request.url);
  const handler = routes[`${request.method} ${request.url}`] || notFound;
  try {
    handler(request, response);
  } catch (error) {
    console.error(error);
    serverError(request, response);
  }
});

server.listen(port, () => {
  console.log(`Shelf is listening on http://localhost:${port}`);
});
