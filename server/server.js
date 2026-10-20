import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env, startupProblems } from './config/env.js';
import { seedAchievements } from './services/progressService.js';

const problems = startupProblems();
for (const w of problems.warnings) console.warn(`WARNING: ${w}`);
if (problems.fatal.length) {
  for (const f of problems.fatal) console.error(`FATAL: ${f}`);
  console.error('Refusing to start in production with an unsafe configuration.');
  process.exit(1);
}

const app = createApp();
const server = http.createServer(app);

// Listen immediately so /api/health can report status even while the database is down.
server.listen(env.port, () => {
  console.log(`DreamVerse API listening on http://localhost:${env.port}`);
});

// Keep trying to reach MongoDB, so starting it after the API works without a restart.
(async function connectWithRetry() {
  let attempt = 0;
  // eslint-disable-next-line no-await-in-loop
  while (!(await connectDB({ quiet: attempt > 0 }))) {
    attempt += 1;
    // eslint-disable-next-line no-await-in-loop
    await sleep(5000);
  }
  try {
    await seedAchievements();
  } catch (err) {
    console.error(`Could not seed achievements: ${err.message}`);
  }
})();

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
