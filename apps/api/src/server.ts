import { createServer } from 'node:http';
import { createApp } from './app.js';

const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? '127.0.0.1';
const { app, database } = createApp();
const server = createServer(app);
let shuttingDown = false;

server.listen(port, host, () => {
  console.log(`Task Board API listening at http://${host}:${port}`);
});

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; closing HTTP server and database`);
  server.close((error) => {
    database.close();
    if (error) {
      console.error('Failed to close HTTP server cleanly', error);
      process.exitCode = 1;
    }
  });
  setTimeout(() => {
    console.error('Graceful shutdown timed out');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.on('error', (error) => {
  console.error('API server error', error);
  database.close();
  process.exitCode = 1;
});
