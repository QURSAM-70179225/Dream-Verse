import { z } from 'zod';
import { WORLD_INTERIORS } from './xp.js';

const OBJECT_ID = /^[a-f\d]{24}$/i;
export const isObjectIdString = (v) => typeof v === 'string' && OBJECT_ID.test(v);

// "a, b\nc" or ["a", "b"] -> ["a", "b", "c"] (empty items dropped)
const toList = (v) => {
  const arr = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,\n]/) : [];
  return arr.map((x) => (typeof x === 'string' ? x.trim() : x)).filter((x) => x !== '');
};
const listField = z.preprocess(toList, z.array(z.string().max(60)).max(15));
const text = (max) => z.string().trim().max(max);

// The rules for choosing a password, shared by sign-up and password reset.
const newPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be 72 characters or fewer')
  .regex(/[A-Za-z]/, 'Password needs at least one letter')
  .regex(/\d/, 'Password needs at least one number');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  password: newPassword,
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
});

// The emailed token is 32 random bytes written as 64 hex characters.
export const resetPasswordSchema = z.object({
  token: z.string().trim().regex(/^[a-f0-9]{64}$/i, 'This reset link is not valid. Request a new one.'),
  password: newPassword,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password').max(72),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
});

const dreamShape = {
  career: text(200).default(''),
  city: text(200).default(''),
  home: text(200).default(''),
  lifestyle: text(200).default(''),
  skills: listField,
  goals: listField,
  story: text(600).default(''),
};

export const createDreamSchema = z.object(dreamShape).refine(
  (d) => d.career.length > 0 || d.story.length >= 15,
  { message: 'Provide a dream career, or describe your future in at least 15 characters.', path: ['career'] }
);

export const updateDreamSchema = z
  .object(dreamShape)
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update.' });

export const milestonePatchSchema = z.object({
  taskId: z.string().refine(isObjectIdString, 'taskId must be a valid id'),
  done: z.boolean(),
});

// ---- AI (Phase 5)
const optionalId = z
  .string()
  .refine(isObjectIdString, 'dreamId must be a valid id')
  .optional();

export const aiTargetSchema = z.object({ dreamId: optionalId });

export const chatSchema = z.object({
  message: z.string().trim().min(1, 'Write a message for Nova').max(1000, 'Keep messages under 1000 characters'),
  dreamId: optionalId,
});

export const conversationQuerySchema = z.object({ dreamId: optionalId });

// ---- Phase 6: simulator and world visits
export const decisionSchema = z
  .object({
    dreamId: optionalId,
    // Either pick one of the saved scenarios ...
    scenarioId: z.string().refine(isObjectIdString, 'scenarioId must be a valid id').optional(),
    // ... or write your own "what if".
    title: text(200).optional(),
    optionA: text(300).optional(),
    optionB: text(300).optional(),
    choice: z.enum(['A', 'B'], { errorMap: () => ({ message: 'Choose option A or B' }) }),
  })
  .refine((d) => d.scenarioId || (d.title && d.optionA && d.optionB), {
    message: 'Pick a saved scenario, or give a title and two options.',
    path: ['title'],
  });

export const historyQuerySchema = z.object({
  dreamId: optionalId,
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const visitSchema = z.object({
  location: z.enum(WORLD_INTERIORS, { errorMap: () => ({ message: 'Unknown location' }) }),
});
