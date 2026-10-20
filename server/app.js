import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env, isProd } from './config/env.js';
import { dbStatus } from './config/db.js';
import { aiMode } from './services/aiService.js';
import { mailMode } from './services/mailer.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { AppError } from './utils/AppError.js';
import { timezone } from './middleware/timezone.js';
import apiRoutes from './routes/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (env.trustProxy) app.set('trust proxy', env.trustProxy);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // allow same-origin / curl (no Origin header) and configured origins
        if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
        return cb(new AppError('This website is not allowed to use the API', 403));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '100kb' }));
  if (!isProd && env.nodeEnv !== 'test') app.use(morgan('dev'));

  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { message: 'Too many requests, please slow down.' },
    })
  );

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: 'DreamVerse AI',
      database: dbStatus(),
      aiMode: aiMode(),
      mailMode: mailMode(),
      time: new Date().toISOString(),
    });
  });

  app.use('/api', timezone, apiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
