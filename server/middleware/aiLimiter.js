import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// AI calls cost money, so each signed-in user gets their own, tighter limit. Shared by every
// route that can trigger the model. Must be used after requireAuth.
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.ai.rateLimit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user._id),
  message: { message: 'You have sent a lot of AI requests. Please wait a few minutes and try again.' },
});
