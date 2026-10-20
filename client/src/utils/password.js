// Same rules the server enforces for a new password (see registerSchema on the server).
export const PASSWORD_HINT = 'At least 8 characters, with a letter and a number.';

export function passwordProblem(password) {
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Use at least 8 characters, with a letter and a number.';
  }
  if (password.length > 72) return 'Use 72 characters or fewer.';
  return '';
}
