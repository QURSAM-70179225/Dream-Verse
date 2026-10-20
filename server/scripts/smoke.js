// Quick health check of a running API (your computer or the deployed one). It only reads:
// it creates no accounts and changes no data.
//
//   npm run smoke --prefix server -- https://your-api.onrender.com https://your-site.netlify.app
//   npm run smoke --prefix server                      (defaults: local API and local site)
import http from 'node:http';
import https from 'node:https';
import { pathToFileURL } from 'node:url';

const trimSlash = (s) => String(s).trim().replace(/\/+$/, '');

/** One GET request. Uses node:http(s) because they allow setting the Origin header. */
export function httpGet(url, headers = {}, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(url, { headers, timeout: timeoutMs }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => {
        body += c;
      });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('timeout', () => req.destroy(new Error(`no answer within ${Math.round(timeoutMs / 1000)} seconds`)));
    req.on('error', reject);
  });
}

const json = (r) => {
  try {
    return JSON.parse(r.body);
  } catch {
    return null;
  }
};

/**
 * Runs the checks and returns [{ name, ok, detail }]. `get` and `requireDb` can be replaced in tests.
 */
export async function runSmoke({ api, site, get = httpGet, requireDb = true }) {
  const base = trimSlash(api);
  const origin = trimSlash(site);
  const results = [];
  const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });

  check('API address uses https (needed once deployed)', base.startsWith('https://') || /localhost|127\.0\.0\.1/.test(base),
    base.startsWith('http://') ? 'plain http is only fine on your own computer' : '');

  let health;
  try {
    health = await get(`${base}/api/health`, {});
  } catch (err) {
    check('API answers /api/health', false, err.message);
    return results;
  }
  const body = json(health);
  check('API answers /api/health', health.status === 200 && body?.status === 'ok', `HTTP ${health.status}`);
  if (requireDb) check('Database is connected', body?.database === 'connected', `database: ${body?.database}`);
  check('Security headers are on', health.headers['x-content-type-options'] === 'nosniff' && !health.headers['x-powered-by']);

  const allowed = await get(`${base}/api/health`, { Origin: origin });
  check(`Your site (${origin}) is allowed by CORS`,
    allowed.status === 200 && allowed.headers['access-control-allow-origin'] === origin,
    `HTTP ${allowed.status}, allow-origin: ${allowed.headers['access-control-allow-origin'] ?? 'none'}. CLIENT_ORIGIN must be exactly this address, without a trailing slash`);

  const blocked = await get(`${base}/api/health`, { Origin: 'https://evil.example' });
  check('Other websites are refused (403)', blocked.status === 403, `HTTP ${blocked.status}`);

  const priv = await get(`${base}/api/dreams`, {});
  check('Private routes need a login (401)', priv.status === 401, `HTTP ${priv.status}`);

  const missing = await get(`${base}/api/does-not-exist`, {});
  check('Unknown routes answer 404 as JSON', missing.status === 404 && json(missing)?.message, `HTTP ${missing.status}`);

  check('AI mode reported', ['demo', 'live'].includes(body?.aiMode), `aiMode: ${body?.aiMode}`);
  check('Email mode reported', ['console', 'brevo'].includes(body?.mailMode), `mailMode: ${body?.mailMode}`);
  return results;
}

async function main() {
  const [api = 'http://localhost:5000', site = 'http://localhost:5173'] = process.argv.slice(2);
  console.log(`Checking ${api} (site ${site}). A sleeping free server can take about a minute to answer...\n`);
  const results = await runSmoke({ api, site });
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok || !r.detail ? '' : `  -> ${r.detail}`}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
