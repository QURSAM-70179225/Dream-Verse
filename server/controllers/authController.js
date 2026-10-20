import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { dbStatus } from '../config/db.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { assertJwtConfigured, signToken } from '../utils/token.js';
import { deliveryHint } from '../services/mailer.js';
import { requestPasswordReset, resetPassword as applyPasswordReset } from '../services/passwordResetService.js';

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-1', 4);

export const register = asyncHandler(async (req, res) => {
  assertJwtConfigured();
  const { name, email, password } = req.body;

  if (await User.exists({ email })) {
    throw new AppError('An account with that email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
  const user = await User.create({ name, email, passwordHash });

  res.status(201).json({ token: signToken(user.id), user: user.toPublic() });
});

export const login = asyncHandler(async (req, res) => {
  assertJwtConfigured();
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw new AppError('Invalid email or password', 401);

  res.json({ token: signToken(user.id), user: user.toPublic() });
});

export const me = (req, res) => {
  res.json({ user: req.user.toPublic() });
};

export const updateMe = asyncHandler(async (req, res) => {
  req.user.name = req.body.name;
  await req.user.save();
  res.json({ user: req.user.toPublic() });
});

// The answer is the same whether or not the email has an account, so nobody can use this form
// to find out who is registered. The work happens after the answer is sent, so timing does not
// give it away either.
export const forgotPassword = (req, res) => {
  if (dbStatus() !== 'connected') {
    throw new AppError('The database is not connected. Start MongoDB (or check MONGODB_URI) and try again.', 503);
  }
  requestPasswordReset(req.body.email).catch((err) => {
    console.error(`[reset] Could not send a reset email: ${err.message}`);
  });
  res.json({
    message: "If an account with that email exists, we've sent a link to reset the password. It works for 60 minutes.",
    delivery: deliveryHint(),
  });
};

export const resetPassword = asyncHandler(async (req, res) => {
  await applyPasswordReset(req.body.token, req.body.password);
  res.json({ message: 'Your password was updated. You can log in with it now.' });
});
