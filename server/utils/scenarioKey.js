import crypto from 'node:crypto';

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Stable id for a custom scenario, so repeating the same one cannot earn XP twice. */
export const customScenarioKey = (title, optionA, optionB) =>
  `c:${crypto
    .createHash('sha1')
    .update([title, optionA, optionB].map(norm).join('|'))
    .digest('hex')
    .slice(0, 24)}`;

export { norm as normalizeText };
