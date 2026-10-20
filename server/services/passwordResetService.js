import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { RESET_COOLDOWN_MS, createResetToken, hashResetToken, isCoolingDown } from '../utils/resetToken.js';
import { buildResetEmail, getMailer } from './mailer.js';

const resetLink = (token) =>
  `${env.appUrl || env.clientOrigins[0]}/reset-password?token=${token}`;

/**
 * Starts a reset for this email. Does nothing (and says nothing) when the account does not exist
 * or a link was sent less than a minute ago. Returns what happened so tests can check it; the
 * website never learns which case it was.
 */
export async function requestPasswordReset(email, now = new Date()) {
  const user = await User.findOne({ email }).select('+resetRequestedAt');
  if (!user) return { sent: false, reason: 'no-account' };
  if (isCoolingDown(user.resetRequestedAt, now)) return { sent: false, reason: 'cooldown' };

  const { token, tokenHash, expiresAt } = createResetToken(now);
  await User.updateOne(
    { _id: user._id },
    { $set: { resetTokenHash: tokenHash, resetTokenExpires: expiresAt, resetRequestedAt: now } }
  );

  const { subject, text } = buildResetEmail({ name: user.name, link: resetLink(token) });
  try {
    await getMailer().send({ to: user.email, subject, text });
  } catch (err) {
    // Without a delivered email the stored token is useless; remove it and allow a quick retry.
    await User.updateOne(
      { _id: user._id },
      { $unset: { resetTokenHash: 1, resetTokenExpires: 1, resetRequestedAt: 1 } }
    );
    throw err;
  }
  return { sent: true };
}

/** Sets a new password if the token is valid and unused. Each token works exactly once. */
export async function resetPassword(token, password, now = new Date()) {
  const invalid = () => new AppError('This reset link is invalid or has expired. Please request a new one.', 400);
  const tokenHash = hashResetToken(token);
  const match = { resetTokenHash: tokenHash, resetTokenExpires: { $gt: now } };

  if (!(await User.exists(match))) throw invalid();

  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
  // Atomic: if two requests arrive together, only one finds the token still there.
  const user = await User.findOneAndUpdate(match, {
    $set: { passwordHash, passwordChangedAt: now },
    $unset: { resetTokenHash: 1, resetTokenExpires: 1 },
  });
  if (!user) throw invalid();
  return { cooldownMs: RESET_COOLDOWN_MS };
}
