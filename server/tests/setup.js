// Imported first by every test file so config reads these values (dotenv never overrides them).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.BCRYPT_ROUNDS = '4';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
// Tests must never call a real AI provider, even if the developer's .env has a key.
process.env.AI_BASE_URL = '';
process.env.AI_API_KEY = '';
process.env.AI_MODEL = '';
// Existing tests assert exact XP amounts, so the daily streak bonus is off by default in tests.
// The streak tests switch it on explicitly (env.game.streakStepXp).
process.env.STREAK_STEP_XP = '0';
