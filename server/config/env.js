import dotenv from 'dotenv';

dotenv.config();

// "1" / "2" = number of proxy hops, "true" = trust all hops, anything else (or empty) = off.
export function parseTrustProxy(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (/^\d+$/.test(v)) return Number(v);
  return v === 'true';
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  // Behind a hosting proxy (Render, Railway, Fly...) set TRUST_PROXY=1 so rate limits see real client IPs.
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dreamverse',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
  ai: {
    baseUrl: (process.env.AI_BASE_URL || '').trim().replace(/\/+$/, ''),
    apiKey: (process.env.AI_API_KEY || '').trim(),
    model: (process.env.AI_MODEL || '').trim(),
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 30000,
    maxTokens: Number(process.env.AI_MAX_TOKENS) || 1800,
    // Ask the provider for strict JSON output. Turn off if your provider rejects response_format.
    jsonMode: process.env.AI_JSON_MODE !== 'false',
    // Max AI requests per signed-in user per 15 minutes.
    rateLimit: Number(process.env.AI_RATE_LIMIT) || 30,
  },
  // Where the website lives; used to build links in emails. Defaults to the first CLIENT_ORIGIN.
  appUrl: (process.env.APP_URL || '').trim().replace(/\/+$/, ''),
  // Outgoing email (password reset), sent over HTTPS through Brevo. Without both values the server
  // runs in console mode: nothing is sent and, in development only, the reset link is printed in
  // the server terminal instead.
  mail: {
    brevoApiKey: (process.env.BREVO_API_KEY || '').trim(),
    // "Name <address>" or just the address. Must be a sender you verified in Brevo.
    from: (process.env.MAIL_FROM || '').trim(),
  },
  // Game balance. streakStepXp = XP per streak day (day 1 = 1 step, capped at 5 steps).
  // Set STREAK_STEP_XP=0 to turn the streak bonus off; the streak is still counted.
  game: {
    streakStepXp: Number(process.env.STREAK_STEP_XP ?? 5),
  },
};

export const isMailConfigured = (mail) => Boolean(mail?.brevoApiKey && mail?.from);

export const isProd = env.nodeEnv === 'production';

// A secret counts as configured only if it is long enough and not the example placeholder.
export const isJwtConfigured = () =>
  env.jwtSecret.length >= 16 && !env.jwtSecret.startsWith('change-me');

/**
 * Problems found with the configuration. "fatal" ones stop a production server from starting;
 * "warnings" are printed. Pure function so it can be tested.
 */
export function startupProblems(cfg = env) {
  const fatal = [];
  const warnings = [];
  const prod = cfg.nodeEnv === 'production';
  const jwtOk = cfg.jwtSecret.length >= 16 && !cfg.jwtSecret.startsWith('change-me');
  if (!jwtOk) {
    (prod ? fatal : warnings).push(
      'JWT_SECRET is missing, too short (16+ characters) or still the example value. Register and login will not work until you set it.'
    );
  }
  if (prod) {
    if (cfg.clientOrigins.some((o) => /localhost|127\.0\.0\.1/.test(o))) {
      warnings.push('CLIENT_ORIGIN still points at localhost. Set it to your deployed site address.');
    }
    if (/127\.0\.0\.1|localhost/.test(cfg.mongoUri)) {
      warnings.push('MONGODB_URI points at a local database. Use your MongoDB Atlas connection string.');
    }
    if (!isMailConfigured(cfg.mail)) {
      warnings.push('BREVO_API_KEY and MAIL_FROM are not both set, so password reset emails cannot be sent.');
    }
    if (cfg.bcryptRounds < 10) warnings.push('BCRYPT_ROUNDS is below 10, which is weak for production.');
  }
  return { fatal, warnings };
}
