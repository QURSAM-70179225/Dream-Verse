// Turns raw model text into safe, validated data. Models can return fenced code, extra prose,
// missing fields, over-long text or made-up links, so nothing from the model is trusted as-is.
import { z } from 'zod';
import { CITY_THEME_IDS, ROOM_THEME_IDS } from '../futureTemplate.js';

export class AiFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AiFormatError';
  }
}

/** Removes control characters and collapses whitespace. */
export const cleanText = (value) =>
  String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Like cleanText but keeps line breaks (for chat replies). */
export const cleanReply = (value, max = 2000) =>
  String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);

export function extractJson(raw) {
  if (typeof raw !== 'string') throw new AiFormatError('Model returned no text');
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  const attempts = [text];
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) attempts.push(text.slice(first, last + 1));

  for (const candidate of attempts) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    } catch {
      // try the next candidate
    }
  }
  throw new AiFormatError('Model did not return a JSON object');
}

const clip = (max) =>
  z
    .any()
    .transform((v) => cleanText(v).slice(0, max));

const oneOf = (ids, fallback) =>
  z.any().transform((v) => {
    const id = cleanText(v).toLowerCase();
    return ids.includes(id) ? id : fallback;
  });

const profileSchema = z.object({
  career: clip(200).optional().default(''),
  lifestyle: clip(200).optional().default(''),
  cityTheme: oneOf(CITY_THEME_IDS, 'neon-city').optional().default('neon-city'),
  roomTheme: oneOf(ROOM_THEME_IDS, 'modern-apartment').optional().default('modern-apartment'),
  summary: clip(800),
  scenarios: z
    .array(z.object({ title: clip(200), optionA: clip(300), optionB: clip(300) }))
    .optional()
    .default([]),
});

export function parseFutureProfile(raw) {
  const result = profileSchema.safeParse(extractJson(raw));
  if (!result.success) throw new AiFormatError('Future profile has the wrong shape');
  const p = result.data;
  if (p.summary.length < 20) throw new AiFormatError('Future profile summary is too short');
  const scenarios = p.scenarios.filter((s) => s.title && s.optionA && s.optionB).slice(0, 4);
  return { ...p, scenarios, source: 'ai' };
}

/**
 * Only keeps links that are plain https website addresses (home pages). Models often invent deep
 * links that do not exist, so anything more specific is dropped and only the title is kept.
 */
export function safeResourceUrl(value) {
  try {
    const u = new URL(cleanText(value));
    if (u.protocol !== 'https:' || u.username || u.password) return '';
    if (!u.hostname.includes('.')) return '';
    if (u.pathname !== '/' || u.search || u.hash) return '';
    return u.origin + '/';
  } catch {
    return '';
  }
}

const resourceSchema = z.object({
  title: clip(200),
  url: z.any().optional().transform((v) => safeResourceUrl(v)),
});

const milestoneSchema = z.object({
  title: clip(200),
  description: clip(600).optional().default(''),
  timeline: clip(100).optional().default(''),
  resources: z.array(resourceSchema).optional().default([]),
  tasks: z.array(clip(200)).optional().default([]),
});

const roadmapSchema = z.object({
  title: clip(200).optional().default(''),
  milestones: z.array(milestoneSchema),
});

export function parseRoadmap(raw, fallbackTitle = 'Roadmap: your dream future') {
  const result = roadmapSchema.safeParse(extractJson(raw));
  if (!result.success) throw new AiFormatError('Roadmap has the wrong shape');

  const milestones = result.data.milestones
    .map((m) => ({
      title: m.title,
      description: m.description,
      timeline: m.timeline,
      resources: m.resources.filter((r) => r.title).slice(0, 3),
      tasks: m.tasks.filter(Boolean).slice(0, 6),
    }))
    .filter((m) => m.title && m.tasks.length >= 2)
    .slice(0, 8);

  if (milestones.length < 3) throw new AiFormatError('Roadmap needs at least 3 usable milestones');
  return { title: result.data.title || fallbackTitle, source: 'ai', milestones };
}

const outcomeSchema = z.object({
  headline: clip(200).optional().default(''),
  story: clip(900),
  upside: clip(400).optional().default(''),
  challenge: clip(400).optional().default(''),
  nextStep: clip(300).optional().default(''),
});

export function parseOutcome(raw) {
  const result = outcomeSchema.safeParse(extractJson(raw));
  if (!result.success) throw new AiFormatError('Outcome has the wrong shape');
  const o = result.data;
  if (o.story.length < 20) throw new AiFormatError('Outcome story is too short');
  return { ...o, headline: o.headline || 'One possible path' };
}
