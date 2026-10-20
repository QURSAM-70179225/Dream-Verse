import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { AiProviderError, createAiClient } from './ai/aiClient.js';
import { AiFormatError, cleanReply, parseFutureProfile, parseOutcome, parseRoadmap } from './ai/aiParse.js';
import { templateOutcome } from './decisionTemplate.js';
import { decisionMessages, futureMessages, novaMessages, roadmapMessages } from './ai/aiPrompts.js';
import { CRISIS_REPLY, detectCrisis } from './ai/aiSafety.js';
import { demoReply } from './ai/novaDemo.js';

/**
 * AI mode is "live" only when a provider key, base URL and model are all set.
 * Otherwise the service runs in clearly labeled demo mode.
 * API keys never leave the server.
 */
export function aiMode() {
  const { apiKey, baseUrl, model } = env.ai;
  return apiKey && /^https?:\/\//i.test(baseUrl) && model ? 'live' : 'demo';
}

// The provider client is created lazily and can be swapped in tests.
let client = null;
let override = null;
export const setAiClientForTests = (fake) => {
  override = fake;
};
const getClient = () => override || (client ||= createAiClient(env.ai));

function toAppError(err) {
  if (err instanceof AiProviderError) {
    console.error(`[ai] provider error: kind=${err.kind} status=${err.status} ${err.body}`.trim());
    if (err.kind === 'badresponse') {
      console.error(
        '[ai] The provider answered with something that is not an API response. Check AI_BASE_URL: it must be the API address (for Gemini: https://generativelanguage.googleapis.com/v1beta/openai), not a web page.'
      );
    }
    if (err.kind === 'empty' && /"finish_reason":"length"/.test(err.body)) {
      console.error(
        '[ai] The model ran out of tokens before writing a visible answer (typical for "reasoning" models). Raise AI_MAX_TOKENS or choose a non-reasoning model.'
      );
    }
    if (err.kind === 'timeout') {
      return new AppError('The AI service took too long to answer. Please try again.', 504);
    }
    if (err.kind === 'http' && err.status === 429) {
      return new AppError('The AI service is busy right now. Please try again in a minute.', 503);
    }
    return new AppError('The AI service is unavailable right now. Please try again in a moment.', 502);
  }
  if (err instanceof AiFormatError) {
    console.error(`[ai] unusable model output: ${err.message}`);
    return new AppError('The AI answered in an unexpected format. Please try again.', 502);
  }
  return err;
}

/** Calls the model for JSON and parses it; retries once if the format is wrong. */
async function completeStructured(messages, parse) {
  const ai = getClient();
  try {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const msgs =
        attempt === 0
          ? messages
          : [
              ...messages,
              {
                role: 'user',
                content:
                  'Your previous reply could not be used. Reply again with ONLY the JSON object in the exact shape requested.',
              },
            ];
      const raw = await ai.complete({ messages: msgs, json: true, temperature: attempt === 0 ? 0.7 : 0.2 });
      try {
        return parse(raw);
      } catch (err) {
        if (!(err instanceof AiFormatError)) throw err;
        lastError = err;
      }
    }
    throw lastError;
  } catch (err) {
    throw toAppError(err);
  }
}

/** { mode: 'live', profile } or { mode: 'demo', profile: null } */
export async function generateFutureProfile(dream) {
  if (aiMode() !== 'live') return { mode: 'demo', profile: null };
  const profile = await completeStructured(futureMessages(dream), parseFutureProfile);
  return { mode: 'live', profile };
}

/** { mode: 'live', roadmap } or { mode: 'demo', roadmap: null } */
export async function generateRoadmapPlan(dream, profile) {
  if (aiMode() !== 'live') return { mode: 'demo', roadmap: null };
  const fallbackTitle = dream.career ? `Roadmap: ${dream.career}` : 'Roadmap: your dream future';
  const roadmap = await completeStructured(roadmapMessages(dream, profile), (raw) =>
    parseRoadmap(raw, fallbackTitle)
  );
  return { mode: 'live', roadmap };
}

/** Nova's answer: { mode: 'live' | 'demo' | 'safety', reply } */
export async function novaChat({ dream, profile, roadmap, history, message }) {
  if (detectCrisis(message)) return { mode: 'safety', reply: CRISIS_REPLY };

  if (aiMode() !== 'live') {
    return { mode: 'demo', reply: demoReply({ message, dream, roadmap }) };
  }

  try {
    const raw = await getClient().complete({
      messages: novaMessages({ dream, profile, roadmap, history, message }),
      // Uses AI_MAX_TOKENS. "Reasoning" models spend part of the budget thinking, so a small cap
      // can leave no room for the visible answer. The prompt already asks for short replies.
      temperature: 0.7,
    });
    const reply = cleanReply(raw, 2000);
    if (!reply) throw new AiProviderError('Empty reply', { kind: 'empty' });
    return { mode: 'live', reply };
  } catch (err) {
    throw toAppError(err);
  }
}

/**
 * Imagines how a decision might play out. Works in both modes:
 * live -> written by the AI model (source 'ai'); demo -> built-in text (source 'template').
 */
export async function simulateDecision({ dream, profile, scenario, choiceKey, nextTask }) {
  if (aiMode() !== 'live') {
    return { mode: 'demo', outcome: templateOutcome({ scenario, choiceKey, nextTask }) };
  }
  const outcome = await completeStructured(
    decisionMessages({ dream, profile, scenario, choiceKey }),
    parseOutcome
  );
  return { mode: 'live', outcome: { ...outcome, source: 'ai' } };
}
