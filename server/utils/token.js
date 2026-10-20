import jwt from 'jsonwebtoken';
import { env, isJwtConfigured } from '../config/env.js';
import { AppError } from './AppError.js';

export function assertJwtConfigured() {
  if (!isJwtConfigured()) {
    throw new AppError(
      'Authentication is not configured on the server. Set a strong JWT_SECRET (16+ characters) in server/.env.',
      500
    );
  }
}

export function signToken(userId) {
  assertJwtConfigured();
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifyToken(token) {
  assertJwtConfigured();
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
}
