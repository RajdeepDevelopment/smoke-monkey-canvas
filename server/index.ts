export * from './app.server.js';
import { startAppServer } from './app.server.js';

if (process.argv[1] && process.argv[1].endsWith('server/index.ts')) {
  startAppServer();
}
