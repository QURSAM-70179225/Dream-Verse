import { isProd } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const DB_DOWN_NAMES = new Set([
  'MongoServerSelectionError',
  'MongoNetworkError',
  'MongoNotConnectedError',
  'MongoTopologyClosedError',
]);

const isDbDown = (err) =>
  DB_DOWN_NAMES.has(err.name) ||
  (err.name === 'MongooseError' && /buffering timed out/i.test(err.message));

export function notFound(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.name === 'ZodError') {
    status = 400;
    message = 'Validation failed';
    details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier';
  } else if (err.code === 11000) {
    status = 409;
    message = 'That value is already in use';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  } else if (isDbDown(err)) {
    status = 503;
    message = 'The database is not connected. Start MongoDB (or check MONGODB_URI) and try again.';
  }

  if (status >= 500 && status !== 503) {
    console.error(err);
    if (isProd) message = 'Internal server error';
  }

  res.status(status).json({ message, ...(details ? { details } : {}) });
}
