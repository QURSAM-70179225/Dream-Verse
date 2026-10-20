import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/token.js';

// Requires "Authorization: Bearer <jwt>" and attaches the user to req.user.
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError('Authentication required', 401);

  const payload = verifyToken(token);
  const user = await User.findById(payload.sub);
  if (!user) throw new AppError('This account no longer exists', 401);

  // A password reset signs out every login issued before it (tokens carry their issue time).
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw new AppError('Your password was changed. Please log in again.', 401);
  }

  req.user = user;
  next();
});
